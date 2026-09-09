import * as THREE from 'three'
import { clamp, fieldHeight, hash, lerp, smooth, type Field } from './fluvial-model'

export interface MountainWeather {
  group: THREE.Group
  /** Animation time in seconds, geological progress in [0, 1]. */
  update(time: number, progress: number): void
  dispose(): void
}

const RAIN_COUNT = 300
const CLEARANCE = .018

interface RainSeed {
  x: number
  z: number
  windX: number
  windZ: number
  height: number
  length: number
  width: number
  opacity: number
  phase: number
  duration: number
  splashDuration: number
  cycle: number
  splashRadius: number
  startX: number
  startY: number
  startZ: number
  endX: number
  endY: number
  endZ: number
  normalX: number
  normalY: number
  normalZ: number
}

function createQuadGeometry() {
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0,
  ], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.instanceCount = RAIN_COUNT
  return geometry
}

function dynamicAttribute(geometry: THREE.InstancedBufferGeometry, name: string, size: number) {
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(RAIN_COUNT * size), size)
  attribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute(name, attribute)
  return attribute
}

/** A narrow camera-facing ribbon: its brighter tip is always the lower endpoint. */
function createRainMaterial(opacity: THREE.IUniform<number>) {
  return new THREE.ShaderMaterial({
    name: 'Mountain rain streaks',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uOpacity: opacity,
      uDark: { value: new THREE.Color('#536a73') },
      uLight: { value: new THREE.Color('#d1e2e7') },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aHead;
      attribute vec3 aTail;
      attribute vec2 aAppearance;
      varying vec2 vUv;
      varying float vOpacity;
      #include <fog_pars_vertex>
      void main() {
        vec4 head = modelViewMatrix * vec4(aHead, 1.0);
        vec4 tail = modelViewMatrix * vec4(aTail, 1.0);
        vec2 direction = head.xy - tail.xy;
        float projectedLength = length(direction);
        vec2 perpendicular = projectedLength > .00001
          ? vec2(-direction.y, direction.x) / projectedLength : vec2(1.0, 0.0);
        vec4 mvPosition = mix(tail, head, uv.y);
        // Preserve a fine hairline at the overview distance without making near
        // rain into oversized rods. Width remains a small view-space length.
        float width = aAppearance.x * clamp(1.0 + (-mvPosition.z) * .005, 1.0, 1.7);
        mvPosition.xy += perpendicular * (uv.x - .5) * width;
        vUv = uv;
        vOpacity = aAppearance.y;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uDark;
      uniform vec3 uLight;
      varying vec2 vUv;
      varying float vOpacity;
      #include <fog_pars_fragment>
      void main() {
        float across = 1.0 - smoothstep(.06, .5, abs(vUv.x - .5));
        float ends = smoothstep(0.0, .15, vUv.y) * (1.0 - smoothstep(.92, 1.0, vUv.y));
        float gradient = .18 + .82 * pow(vUv.y, .9);
        float alpha = across * ends * gradient * vOpacity * uOpacity;
        if (alpha < .004) discard;
        vec3 color = mix(uDark, uLight, smoothstep(.12, .9, vUv.y));
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: true,
  })
}

function createImpactMaterial(opacity: THREE.IUniform<number>) {
  return new THREE.ShaderMaterial({
    name: 'Rain surface impacts',
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uOpacity: opacity,
      uColor: { value: new THREE.Color('#cadde0') },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aCenter;
      attribute vec3 aNormal;
      attribute vec2 aImpact;
      varying vec2 vUv;
      varying float vOpacity;
      #include <fog_pars_vertex>
      void main() {
        vec3 normal = normalize(aNormal);
        vec3 tangent = normalize(vec3(normal.y, -normal.x, 0.0));
        vec3 bitangent = normalize(cross(normal, tangent));
        vec2 local = (uv - .5) * 2.0 * aImpact.x;
        vec3 world = aCenter + tangent * local.x + bitangent * local.y;
        vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
        vUv = uv;
        vOpacity = aImpact.y;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vOpacity;
      #include <fog_pars_fragment>
      void main() {
        float radius = length((vUv - .5) * 2.0);
        float ring = 1.0 - smoothstep(.035, .13, abs(radius - .73));
        float alpha = ring * vOpacity * uOpacity;
        if (alpha < .006) discard;
        gl_FragColor = vec4(uColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: true,
  })
}

/** Find the first terrain collision along a slightly wind-slanted falling ray. */
function refreshTrajectory(seed: RainSeed, field: Field) {
  const sx = seed.x - seed.windX, sz = seed.z - seed.windZ
  const ground = fieldHeight(field, seed.x, seed.z)
  const sy = Math.max(ground, fieldHeight(field, sx, sz)) + seed.height
  const ey = ground - CLEARANCE
  let lower = 0, upper = 1
  for (let step = 1; step <= 16; step++) {
    const t = step / 16, x = lerp(sx, seed.x, t), z = lerp(sz, seed.z, t)
    if (lerp(sy, ey, t) <= fieldHeight(field, x, z) + CLEARANCE) {
      upper = t
      lower = (step - 1) / 16
      break
    }
  }
  for (let step = 0; step < 10; step++) {
    const t = (lower + upper) * .5, x = lerp(sx, seed.x, t), z = lerp(sz, seed.z, t)
    if (lerp(sy, ey, t) > fieldHeight(field, x, z) + CLEARANCE) lower = t
    else upper = t
  }
  seed.startX = sx; seed.startY = sy; seed.startZ = sz
  seed.endX = lerp(sx, seed.x, upper); seed.endZ = lerp(sz, seed.z, upper)
  seed.endY = fieldHeight(field, seed.endX, seed.endZ) + CLEARANCE
  const epsilon = .075
  const dx = (fieldHeight(field, seed.endX + epsilon, seed.endZ)
    - fieldHeight(field, seed.endX - epsilon, seed.endZ)) / (epsilon * 2)
  const dz = (fieldHeight(field, seed.endX, seed.endZ + epsilon)
    - fieldHeight(field, seed.endX, seed.endZ - epsilon)) / (epsilon * 2)
  const inverseLength = 1 / Math.hypot(dx, 1, dz)
  seed.normalX = -dx * inverseLength; seed.normalY = inverseLength; seed.normalZ = -dz * inverseLength
}

/** Three hundred fine rain streaks and their brief, terrain-aligned impacts. */
export function createMountainWeather(field: Field): MountainWeather {
  const group = new THREE.Group()
  group.name = 'Headwater mountain rain'
  group.visible = false
  const opacity = { value: 0 }
  const rainGeometry = createQuadGeometry(), impactGeometry = createQuadGeometry()
  const head = dynamicAttribute(rainGeometry, 'aHead', 3)
  const tail = dynamicAttribute(rainGeometry, 'aTail', 3)
  const appearance = dynamicAttribute(rainGeometry, 'aAppearance', 2)
  const centers = dynamicAttribute(impactGeometry, 'aCenter', 3)
  const normals = dynamicAttribute(impactGeometry, 'aNormal', 3)
  const impacts = dynamicAttribute(impactGeometry, 'aImpact', 2)
  const rainMaterial = createRainMaterial(opacity), impactMaterial = createImpactMaterial(opacity)
  rainMaterial.forceSinglePass = impactMaterial.forceSinglePass = true
  const rain = new THREE.Mesh(rainGeometry, rainMaterial)
  const splashes = new THREE.Mesh(impactGeometry, impactMaterial)
  rain.name = 'Fine descending rain ribbons'; splashes.name = 'Short-lived rain impact rings'
  rain.frustumCulled = splashes.frustumCulled = false
  rain.renderOrder = 8; splashes.renderOrder = 7
  group.add(rain, splashes)

  const seeds: RainSeed[] = Array.from({ length: RAIN_COUNT }, (_, i) => {
    const height = 5.3 + hash(i, 184) * 3.1
    const duration = height / (5.5 + hash(i, 316) * 5)
    const splashDuration = .11 + hash(i, 912) * .065
    return {
      x: lerp(-12.25, 2.8, hash(i, 721)), z: lerp(-31.7, -23.05, hash(i, 437)),
      windX: .25 + hash(i, 655) * .4, windZ: .055 + hash(i, 162) * .16,
      height, duration, splashDuration, cycle: duration + splashDuration + .055,
      length: .24 + hash(i, 763) * .42,
      width: .013 + hash(i, 267) * .012,
      opacity: .19 + hash(i, 674) * .2,
      phase: hash(i, 953), splashRadius: .045 + hash(i, 57) * .06,
      startX: 0, startY: 0, startZ: 0, endX: 0, endY: 0, endZ: 0,
      normalX: 0, normalY: 1, normalZ: 0,
    }
  })
  let disposed = false, terrainBucket = -1

  function update(time: number, progress: number) {
    if (disposed) return
    const p = clamp(progress)
    opacity.value = smooth(0, .014, p) * (1 - smooth(.16, .18, p))
    group.visible = p < .18 && opacity.value > .001
    if (!group.visible) return

    // The field may be updated in place by the scene/worker. Resample the short
    // paths while geological time advances; animation itself remains continuous.
    const bucket = Math.floor(p * 500)
    if (bucket !== terrainBucket) {
      for (const seed of seeds) refreshTrajectory(seed, field)
      terrainBucket = bucket
    }
    const seconds = Math.max(0, time)
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i]!
      const age = (seconds + seed.phase * seed.cycle) % seed.cycle
      const t = clamp(age / seed.duration)
      const x = lerp(seed.startX, seed.endX, t), z = lerp(seed.startZ, seed.endZ, t)
      const y = Math.max(lerp(seed.startY, seed.endY, t), fieldHeight(field, x, z) + CLEARANCE)
      const tailT = clamp(t - seed.length / Math.max(.1, seed.startY - seed.endY))
      head.setXYZ(i, x, y, z)
      tail.setXYZ(i, lerp(seed.startX, seed.endX, tailT), Math.max(y, lerp(seed.startY, seed.endY, tailT)), lerp(seed.startZ, seed.endZ, tailT))
      appearance.setXY(i, seed.width, age < seed.duration ? seed.opacity : 0)

      const impactAge = age - seed.duration
      const impactT = clamp(impactAge / seed.splashDuration)
      const radius = lerp(.017, seed.splashRadius, Math.sqrt(impactT))
      const activeImpact = impactAge >= 0 && impactAge <= seed.splashDuration
      const impactAlpha = activeImpact ? (1 - impactT) ** 1.6 * (.19 + hash(i, 217) * .12) : 0
      const surfaceY = fieldHeight(field, seed.endX, seed.endZ)
      centers.setXYZ(i, seed.endX, surfaceY + .024, seed.endZ)
      normals.setXYZ(i, seed.normalX, seed.normalY, seed.normalZ)
      impacts.setXY(i, radius, impactAlpha)
    }
    for (const attribute of [head, tail, appearance, centers, normals, impacts]) attribute.needsUpdate = true
  }

  function dispose() {
    if (disposed) return
    disposed = true
    group.removeFromParent()
    group.clear()
    rainGeometry.dispose(); impactGeometry.dispose()
    rainMaterial.dispose(); impactMaterial.dispose()
  }
  return { group, update, dispose }
}
