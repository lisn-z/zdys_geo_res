import * as THREE from 'three'

type UV = readonly [number, number]
type LavaPath = { points: readonly UV[]; width: number; strength: number }
type VolcanicScene = {
  vent: UV
  smokeTop: UV
  smokeColor: string
  strength: number
  paths: readonly LavaPath[]
}

// Source-image UVs, measured on hadean-sr.webp and archean-sr.webp.
// The Proterozoic panorama has no active volcano: do not invent an eruption.
const SCENES: Record<string, VolcanicScene> = {
  hadean: {
    vent: [0.175, 0.329], smokeTop: [0.150, 0.155], smokeColor: '#8b7a68', strength: 1,
    paths: [
      { points: [[0.170, 0.334], [0.168, 0.347], [0.171, 0.354], [0.168, 0.361]], width: 0.00062, strength: 0.68 },
      { points: [[0.085, 0.455], [0.123, 0.470], [0.170, 0.495], [0.204, 0.511], [0.258, 0.551]], width: 0.0016, strength: 0.60 },
    ],
  },
  archean: {
    vent: [0.199, 0.294], smokeTop: [0.159, 0.130], smokeColor: '#9b9997', strength: 0.73,
    paths: [
      { points: [[0.229, 0.319], [0.243, 0.335], [0.261, 0.348], [0.278, 0.366]], width: 0.00065, strength: 0.46 },
    ],
  },
}

const TAU = Math.PI * 2
const DISTANCE = 24
const SMOKE_COUNT = 20
const SPARK_COUNT = 16
const FLOW_SEGMENTS = 80

function panoramaPoint(u: number, v: number, distance: number): THREE.Vector3 {
  const longitude = (0.5 - u) * TAU
  const latitude = (0.5 - v) * Math.PI
  return new THREE.Vector3(
    Math.sin(longitude) * Math.cos(latitude),
    Math.sin(latitude),
    Math.cos(longitude) * Math.cos(latitude),
  ).multiplyScalar(distance)
}

function seed(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function makeTexture(kind: 'smoke' | 'glow' | 'lava'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = kind === 'lava' ? 64 : 128
  canvas.height = kind === 'lava' ? 16 : 128
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('A 2D canvas is required for panorama volcano effects.')
  if (kind === 'smoke') {
    // A soft irregular density field; no opaque circular discs or image assets.
    for (let i = 0; i < 22; i++) {
      const angle = seed(i + 8) * TAU
      const spread = 23 * Math.sqrt(seed(i + 73))
      const x = 64 + Math.cos(angle) * spread
      const y = 64 + Math.sin(angle) * spread
      const radius = 19 + seed(i + 119) * 18
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(255,255,255,0.18)')
      gradient.addColorStop(0.42, 'rgba(255,255,255,0.12)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
  } else if (kind === 'glow') {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,245,190,1)')
    gradient.addColorStop(0.13, 'rgba(255,202,93,0.88)')
    gradient.addColorStop(0.38, 'rgba(255,99,22,0.30)')
    gradient.addColorStop(1, 'rgba(205,35,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 64, 0)
    gradient.addColorStop(0, 'rgba(146,17,0,0)')
    gradient.addColorStop(0.28, 'rgba(244,63,9,0.30)')
    gradient.addColorStop(0.46, 'rgba(255,173,44,0.80)')
    gradient.addColorStop(0.50, 'rgba(255,225,125,0.94)')
    gradient.addColorStop(0.54, 'rgba(255,173,44,0.80)')
    gradient.addColorStop(0.72, 'rgba(244,63,9,0.30)')
    gradient.addColorStop(1, 'rgba(146,17,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 16)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

/** Effects follow existing photographed vents and lava; no new mountain geometry. */
export function createPanoramaVolcanism(): {
  group: THREE.Group
  setPeriod: (id: string) => void
  update: (dt: number, enabled: boolean) => void
  dispose: () => void
} {
  const group = new THREE.Group()
  group.name = 'panorama-volcanism'
  group.visible = false
  const smokeTexture = makeTexture('smoke')
  const glowTexture = makeTexture('glow')
  const lavaTexture = makeTexture('lava')
  const dynamicGroup = new THREE.Group()
  dynamicGroup.name = 'volcanic-smoke-and-sparks'
  group.add(dynamicGroup)
  const materials: THREE.Material[] = []
  const sprite = (map: THREE.Texture, color: string, additive: boolean): THREE.Sprite => {
    const material = new THREE.SpriteMaterial({
      map, color, transparent: true, opacity: 0,
      depthTest: true, depthWrite: false, fog: false, toneMapped: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
    materials.push(material)
    const object = new THREE.Sprite(material)
    object.renderOrder = additive ? 7 : 6
    object.frustumCulled = false
    return object
  }
  const smoke = Array.from({ length: SMOKE_COUNT }, () => {
    const object = sprite(smokeTexture, '#8b7a68', false)
    dynamicGroup.add(object)
    return object
  })
  const sparks = Array.from({ length: SPARK_COUNT }, () => {
    const object = sprite(glowTexture, '#ffb456', true)
    dynamicGroup.add(object)
    return object
  })
  const ventGlow = sprite(glowTexture, '#ffb778', true)
  group.add(ventGlow)

  const flowUniforms = { lavaMap: { value: lavaTexture }, elapsed: { value: 0 }, moving: { value: 0 }, intensity: { value: 1 } }
  const flowMaterial = new THREE.ShaderMaterial({
    uniforms: flowUniforms, transparent: true, depthWrite: false, depthTest: true,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
    vertexShader: `
      varying vec2 flowUv;
      attribute float strength;
      varying float flowStrength;
      void main() {
        flowUv = uv;
        flowStrength = strength;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D lavaMap;
      uniform float elapsed;
      uniform float moving;
      uniform float intensity;
      varying vec2 flowUv;
      varying float flowStrength;
      void main() {
        vec4 heat = texture2D(lavaMap, vec2(flowUv.x, 0.5));
        float flow = 0.54 + 0.28 * sin(flowUv.y * 27.0 - elapsed * 2.1)
                         + 0.18 * sin(flowUv.y * 63.0 - elapsed * 3.7);
        float pulse = mix(0.35, flow, moving);
        float ends = smoothstep(0.0, 0.04, flowUv.y) * (1.0 - smoothstep(0.94, 1.0, flowUv.y));
        gl_FragColor = vec4(heat.rgb, heat.a * pulse * ends * flowStrength * intensity);
        #include <colorspace_fragment>
      }
    `,
  })
  materials.push(flowMaterial)
  const flows = Array.from({ length: 2 }, () => {
    const geometry = new THREE.BufferGeometry()
    const count = (FLOW_SEGMENTS + 1) * 2
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2))
    geometry.setAttribute('strength', new THREE.BufferAttribute(new Float32Array(count), 1))
    const indices: number[] = []
    for (let i = 0; i < FLOW_SEGMENTS; i++) {
      const j = i * 2
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2)
    }
    geometry.setIndex(indices)
    const mesh = new THREE.Mesh(geometry, flowMaterial)
    mesh.frustumCulled = false
    mesh.renderOrder = 5
    mesh.visible = false
    group.add(mesh)
    return mesh
  })

  let scene: VolcanicScene | undefined
  let elapsed = 0
  let disposed = false

  function configureFlow(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>, path: LavaPath): void {
    const points = path.points.map(([u, v]) => new THREE.Vector3(u, v, 0))
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute
    const strength = mesh.geometry.getAttribute('strength') as THREE.BufferAttribute
    for (let i = 0; i <= FLOW_SEGMENTS; i++) {
      const t = i / FLOW_SEGMENTS
      const p = curve.getPoint(t)
      const tangent = curve.getTangent(t)
      // Equirectangular UV has a 2:1 aspect; use angular-length perpendiculars.
      const cosine = Math.max(0.25, Math.cos((0.5 - p.y) * Math.PI))
      const nx = -tangent.y / (2 * cosine)
      const ny = tangent.x * 2 * cosine
      const length = Math.hypot(nx * 2 * cosine, ny)
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1
        const width = path.width * (0.84 + 0.16 * Math.sin(t * 29.0 + 0.3))
        const offset = sign * width / Math.max(length, 0.00001)
        const vertex = panoramaPoint(p.x + nx * offset, p.y + ny * offset, DISTANCE + 0.3)
        const index = i * 2 + side
        position.setXYZ(index, vertex.x, vertex.y, vertex.z)
        uv.setXY(index, side, t)
        strength.setX(index, path.strength)
      }
    }
    position.needsUpdate = true
    uv.needsUpdate = true
    strength.needsUpdate = true
    mesh.geometry.computeBoundingSphere()
    mesh.visible = true
  }

  function renderState(enabled: boolean): void {
    if (!scene) return
    dynamicGroup.visible = enabled
    flowUniforms.elapsed.value = elapsed
    flowUniforms.moving.value = enabled ? 1 : 0
    flowUniforms.intensity.value = scene.strength
    const glowPulse = enabled ? 0.52 + 0.18 * Math.sin(elapsed * 3.2) + 0.10 * Math.sin(elapsed * 7.1) : 0.20
    ventGlow.material.opacity = glowPulse * scene.strength
    if (!enabled) return
    smoke.forEach((puff, i) => {
      const phase = (elapsed / 12.5 + i / SMOKE_COUNT) % 1
      const rise = Math.pow(phase, 0.83)
      const centerU = THREE.MathUtils.lerp(scene!.vent[0], scene!.smokeTop[0], rise)
      const centerV = THREE.MathUtils.lerp(scene!.vent[1] - 0.0025, scene!.smokeTop[1], rise)
      const spread = 0.001 + phase * 0.006
      const u = centerU + Math.sin(i * 2.4 + elapsed * 0.20) * spread
      puff.position.copy(panoramaPoint(u, centerV, DISTANCE - 0.1))
      const fullWidth = 0.005 + phase * 0.035
      const size = fullWidth * TAU * DISTANCE * Math.cos((0.5 - centerV) * Math.PI)
      puff.scale.set(size, size * (1.04 + seed(i + 600) * 0.18), 1)
      puff.material.opacity = Math.pow(Math.sin(phase * Math.PI), 0.75) * 0.29 * scene!.strength
      puff.material.rotation = seed(i + 222) * TAU + elapsed * (0.012 + seed(i + 420) * 0.012)
    })
    sparks.forEach((spark, i) => {
      const phase = (elapsed / (1.7 + seed(i + 90) * 0.6) + i / SPARK_COUNT) % 1
      const spread = (seed(i + 281) - 0.5) * 0.008 * phase
      const rise = Math.sin(phase * Math.PI) * (0.008 + seed(i + 122) * 0.011)
      spark.position.copy(panoramaPoint(scene!.vent[0] + spread, scene!.vent[1] - 0.001 - rise, DISTANCE - 0.2))
      spark.material.opacity = Math.sin(phase * Math.PI) * 0.76 * scene!.strength
      const size = 0.025 + seed(i + 33) * 0.040
      spark.scale.set(size, size * 1.2, 1)
    })
  }

  return {
    group,
    setPeriod(id) {
      if (disposed) return
      scene = SCENES[id]
      elapsed = 0
      group.visible = Boolean(scene)
      dynamicGroup.visible = false
      for (const mesh of flows) mesh.visible = false
      for (const object of [...smoke, ...sparks]) object.material.opacity = 0
      if (!scene) return
      smoke.forEach(object => object.material.color.set(scene!.smokeColor))
      ventGlow.position.copy(panoramaPoint(scene.vent[0], scene.vent[1], DISTANCE))
      ventGlow.scale.set(0.40, 0.24, 1)
      scene.paths.forEach((path, i) => {
        const mesh = flows[i]
        if (mesh) configureFlow(mesh, path)
      })
      renderState(false)
    },
    update(dt, enabled) {
      if (disposed || !scene) return
      if (enabled && Number.isFinite(dt)) elapsed += THREE.MathUtils.clamp(dt, 0, 0.1)
      renderState(enabled)
    },
    dispose() {
      if (disposed) return
      disposed = true
      scene = undefined
      group.visible = false
      group.removeFromParent()
      group.clear()
      dynamicGroup.clear()
      for (const mesh of flows) mesh.geometry.dispose()
      for (const material of materials) material.dispose()
      smokeTexture.dispose()
      glowTexture.dispose()
      lavaTexture.dispose()
    },
  }
}
