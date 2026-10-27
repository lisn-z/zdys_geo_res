import * as THREE from 'three'
import type { WeatherState } from './types'

interface StationEnvironment {
  group: THREE.Group
  update: (state: WeatherState, delta: number, elapsed: number) => void
  dispose: () => void
}

/** Deterministic surface variation keeps the field identical on every visit. */
function randomGenerator(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

function textureFromCanvas(canvas: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.anisotropy = 8
  return texture
}

function surfaceTextures(kind: 'grass' | 'soil' | 'stone'): { color: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = bumpCanvas.height = size
  const bumpCtx = bumpCanvas.getContext('2d')!
  const random = randomGenerator(kind === 'grass' ? 413 : kind === 'soil' ? 733 : 903)
  ctx.fillStyle = kind === 'grass' ? '#788365' : kind === 'soil' ? '#75634e' : '#b6b5aa'
  ctx.fillRect(0, 0, size, size)
  bumpCtx.fillStyle = '#808080'
  bumpCtx.fillRect(0, 0, size, size)
  // Fine grains rather than a large repeating cloud pattern make the close views credible.
  const count = kind === 'grass' ? 46000 : 28000
  for (let i = 0; i < count; i++) {
    const x = random() * size, y = random() * size, v = random()
    if (kind === 'grass') {
      const r = 68 + v * 69, g = 79 + v * 73, b = 43 + v * 57
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${0.25 + random() * 0.42})`
      ctx.lineWidth = 0.45 + random() * 0.8
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (random() - 0.5) * 5, y + 2 + random() * 8)
      ctx.stroke()
      bumpCtx.strokeStyle = `rgba(${(95 + v * 76) | 0},${(95 + v * 76) | 0},${(95 + v * 76) | 0},0.6)`
      bumpCtx.beginPath()
      bumpCtx.moveTo(x, y)
      bumpCtx.lineTo(x + 1, y + 5)
      bumpCtx.stroke()
    } else {
      const value = (kind === 'soil' ? 48 : 104) + v * 94
      ctx.fillStyle = kind === 'soil'
        ? `rgba(${(value + 24) | 0},${(value + 11) | 0},${value | 0},0.3)`
        : `rgba(${(value + 7) | 0},${(value + 6) | 0},${value | 0},0.25)`
      const radius = 0.45 + random() * 1.25
      ctx.fillRect(x, y, radius, radius)
      const bump = (88 + random() * 81) | 0
      bumpCtx.fillStyle = `rgb(${bump},${bump},${bump})`
      bumpCtx.fillRect(x, y, radius, radius)
    }
  }
  const repeat = kind === 'grass' ? 5 : kind === 'soil' ? 3 : 1
  const color = textureFromCanvas(canvas, repeat)
  const bump = textureFromCanvas(bumpCanvas, repeat)
  bump.colorSpace = THREE.NoColorSpace
  return { color, bump }
}

export function createStationEnvironment(): StationEnvironment {
  const group = new THREE.Group()
  group.name = 'meteorological-observation-field'
  const grassMap = surfaceTextures('grass')
  const soilMap = surfaceTextures('soil')
  const stoneMap = surfaceTextures('stone')
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: '#d6ddc5', map: grassMap.color, bumpMap: grassMap.bump,
    bumpScale: 0.027, roughness: 1, metalness: 0,
  })
  const soilMaterial = new THREE.MeshStandardMaterial({
    color: '#c4b5a1', map: soilMap.color, bumpMap: soilMap.bump,
    bumpScale: 0.04, roughness: 1,
  })
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: '#e7e4da', map: stoneMap.color, bumpMap: stoneMap.bump,
    bumpScale: 0.012, roughness: 0.93,
  })
  const edgingMaterial = new THREE.MeshStandardMaterial({ color: '#8d9181', roughness: 0.96 })
  const fenceMaterial = new THREE.MeshStandardMaterial({ color: '#e6e8df', metalness: 0.38, roughness: 0.5 })
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#5c6965', metalness: 0.58, roughness: 0.46 })
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: '#bdc99e', roughness: 1, side: THREE.DoubleSide,
  })

  function box(width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = group): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function cylinder(radius: number, height: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = group): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D = group): THREE.Mesh {
    const direction = b.clone().sub(a)
    const mesh = cylinder(radius, direction.length(), 0, 0, 0, material, parent)
    mesh.position.copy(a).add(b).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return mesh
  }

  // One fully closed volume: no daylight seam between the turf and the sides.
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.42, 12),
    [soilMaterial, soilMaterial, grassMaterial, soilMaterial, soilMaterial, soilMaterial],
  )
  ground.position.set(0, -0.21, 1)
  ground.receiveShadow = true
  ground.name = 'closed-soil-and-turf-base'
  group.add(ground)
  box(14.06, 0.07, 12.06, 0, -0.405, 1, edgingMaterial)

  // Paths stop short of the sensors so no paved patch sits directly below a thermometer.
  const paverPositions: Array<[number, number]> = []
  function pavingLine(x1: number, z1: number, x2: number, z2: number): void {
    const dx = x2 - x1, dz = z2 - z1
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.61))
    for (let i = 0; i <= count; i++) {
      const t = i / count
      const x = x1 + dx * t, z = z1 + dz * t
      if (paverPositions.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.45)) continue
      paverPositions.push([x, z])
    }
  }
  pavingLine(0, 6.65, 0, 3.7)
  pavingLine(0, 3.7, -3, 3.7)
  pavingLine(-3, 3.7, -3, 1.45)
  pavingLine(0, 3.7, 1.2, 2.5)
  pavingLine(1.2, 2.5, 1.2, -2)
  pavingLine(1.2, 2.5, 2.2, 2.5)
  const pathRandom = randomGenerator(332)
  for (const [x, z] of paverPositions) {
    const paver = box(0.52, 0.06, 0.52, x, 0.019, z, stoneMaterial)
    paver.rotation.y = (pathRandom() - 0.5) * 0.035
    // A shallow edge on a real slab gives its small contact shadow.
    paver.name = 'concrete-stepping-stone'
  }

  // Short grass blades supply parallax in close views without hiding the instrument feet.
  const grassRandom = randomGenerator(557)
  const bladeGeometry = new THREE.BufferGeometry()
  bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.008, 0, 0, 0.008, 0, 0, 0.004, 0.07, 0.006,
    -0.008, 0, 0, 0.004, 0.07, 0.006, -0.003, 0.052, 0.004,
  ], 3))
  bladeGeometry.computeVertexNormals()
  const blades = new THREE.InstancedMesh(bladeGeometry, leafMaterial, 15000)
  const dummy = new THREE.Object3D(), bladeColor = new THREE.Color()
  let bladesUsed = 0
  for (let i = 0; i < 18000 && bladesUsed < 15000; i++) {
    const x = -6.94 + grassRandom() * 13.88, z = -4.94 + grassRandom() * 11.88
    if (paverPositions.some(([px, pz]) => Math.abs(x - px) < 0.28 && Math.abs(z - pz) < 0.28)) continue
    if (Math.abs(x + 4) < 0.48 && Math.abs(z - 4) < 0.48) continue
    if (Math.abs(x + 3) < 0.73 && Math.abs(z) < 0.65) continue
    if (Math.abs(x) < 0.45 && Math.abs(z + 2) < 0.45) continue
    if (Math.abs(x - 3) < 0.5 && Math.abs(z - 2) < 0.5) continue
    dummy.position.set(x, 0.001, z)
    dummy.rotation.set(0, grassRandom() * Math.PI, 0)
    const scale = 0.4 + grassRandom() * 0.85
    dummy.scale.set(scale, scale, scale)
    dummy.updateMatrix()
    blades.setMatrixAt(bladesUsed, dummy.matrix)
    bladeColor.setHSL(0.19 + grassRandom() * 0.07, 0.18 + grassRandom() * 0.14, 0.31 + grassRandom() * 0.15)
    blades.setColorAt(bladesUsed, bladeColor)
    bladesUsed++
  }
  blades.count = bladesUsed
  blades.receiveShadow = true
  blades.castShadow = false
  blades.name = 'short-observation-field-grass'
  group.add(blades)

  // Lightweight mesh fence. All rails meet their posts; the entrance remains open.
  const fenceSegments: Array<[number, number, number, number]> = [
    [-6.84, -4.84, 6.84, -4.84], [-6.84, -4.84, -6.84, 6.84],
    [6.84, -4.84, 6.84, 6.84], [-6.84, 6.84, -0.8, 6.84], [0.8, 6.84, 6.84, 6.84],
  ]
  const wires: number[] = []
  const addWire = (a: THREE.Vector3, b: THREE.Vector3): void => { wires.push(a.x, a.y, a.z, b.x, b.y, b.z) }
  for (const [x1, z1, x2, z2] of fenceSegments) {
    const distance = Math.hypot(x2 - x1, z2 - z1)
    const panels = Math.ceil(distance / 1.75)
    for (let i = 0; i <= panels; i++) {
      const t = i / panels, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t
      cylinder(0.024, 0.83, x, 0.405, z, fenceMaterial)
      cylinder(0.029, 0.015, x, 0.827, z, fenceMaterial)
      cylinder(0.075, 0.035, x, 0.009, z, stoneMaterial)
    }
    rod(new THREE.Vector3(x1, 0.76, z1), new THREE.Vector3(x2, 0.76, z2), 0.013, fenceMaterial)
    rod(new THREE.Vector3(x1, 0.15, z1), new THREE.Vector3(x2, 0.15, z2), 0.01, fenceMaterial)
    for (let y = 0.23; y < 0.74; y += 0.1) addWire(new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z2))
    const verticals = Math.ceil(distance / 0.11)
    for (let i = 0; i <= verticals; i++) {
      const t = i / verticals, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t
      addWire(new THREE.Vector3(x, 0.16, z), new THREE.Vector3(x, 0.76, z))
    }
  }
  const wireGeometry = new THREE.BufferGeometry()
  wireGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3))
  const wireMaterial = new THREE.LineBasicMaterial({ color: '#bbc4bd', transparent: true, opacity: 0.48 })
  const meshWire = new THREE.LineSegments(wireGeometry, wireMaterial)
  meshWire.name = 'fine-galvanized-perimeter-mesh'
  group.add(meshWire)

  const gate = new THREE.Group()
  gate.position.set(-0.8, 0, 6.84)
  gate.rotation.y = 1.45
  group.add(gate)
  for (const y of [0.16, 0.76]) rod(new THREE.Vector3(0, y, 0), new THREE.Vector3(1.52, y, 0), 0.015, fenceMaterial, gate)
  for (const x of [0, 1.52]) rod(new THREE.Vector3(x, 0.16, 0), new THREE.Vector3(x, 0.76, 0), 0.015, fenceMaterial, gate)
  for (let x = 0.15; x < 1.5; x += 0.15) rod(new THREE.Vector3(x, 0.17, 0), new THREE.Vector3(x, 0.75, 0), 0.004, fenceMaterial, gate)
  box(0.07, 0.11, 0.035, 1.46, 0.56, 0.015, darkMetal, gate)
  for (const y of [0.27, 0.65]) cylinder(0.033, 0.07, -0.8, y, 6.84, darkMetal)

  // Small enamel sign, the same type of physical label used at an observation-site gate.
  const signCanvas = document.createElement('canvas')
  signCanvas.width = 768; signCanvas.height = 256
  const signCtx = signCanvas.getContext('2d')!
  signCtx.fillStyle = '#f4f5ec'; signCtx.fillRect(0, 0, 768, 256)
  signCtx.strokeStyle = '#55756e'; signCtx.lineWidth = 6; signCtx.strokeRect(15, 15, 738, 226)
  signCtx.fillStyle = '#365852'; signCtx.font = '600 74px "Microsoft YaHei", sans-serif'
  signCtx.textAlign = 'center'; signCtx.textBaseline = 'middle'; signCtx.fillText('气象观测场', 384, 112)
  signCtx.fillStyle = '#7c8b81'; signCtx.font = '25px Arial, sans-serif'; signCtx.fillText('WEATHER OBSERVATION', 384, 191)
  const signTexture = textureFromCanvas(signCanvas)
  const signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.58, metalness: 0.12 })
  const signX = 1.65, signZ = 6.865
  box(1.23, 0.41, 0.03, signX, 0.59, signZ, fenceMaterial)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), signMaterial)
  sign.position.set(signX, 0.59, signZ + 0.017)
  group.add(sign)
  const boltGeo = new THREE.SphereGeometry(0.008, 8, 6)
  for (const x of [-0.56, 0.56]) for (const y of [-0.15, 0.15]) {
    const bolt = new THREE.Mesh(boltGeo, darkMetal)
    bolt.position.set(signX + x, 0.59 + y, signZ + 0.019)
    bolt.scale.z = 0.4
    group.add(bolt)
  }

  const compassCanvas = document.createElement('canvas')
  compassCanvas.width = compassCanvas.height = 512
  const compassCtx = compassCanvas.getContext('2d')!
  compassCtx.fillStyle = '#dadbd0'; compassCtx.fillRect(0, 0, 512, 512)
  compassCtx.translate(256, 256)
  compassCtx.strokeStyle = '#89968a'; compassCtx.lineWidth = 3
  compassCtx.beginPath(); compassCtx.arc(0, 0, 164, 0, Math.PI * 2); compassCtx.stroke()
  compassCtx.strokeStyle = '#4d685f'; compassCtx.lineWidth = 5
  compassCtx.beginPath(); compassCtx.moveTo(0, -142); compassCtx.lineTo(0, 142); compassCtx.moveTo(-142, 0); compassCtx.lineTo(142, 0); compassCtx.stroke()
  compassCtx.fillStyle = '#a06048'; compassCtx.beginPath(); compassCtx.moveTo(0, 151); compassCtx.lineTo(-18, 102); compassCtx.lineTo(18, 102); compassCtx.closePath(); compassCtx.fill()
  compassCtx.fillStyle = '#4d685f'; compassCtx.textAlign = 'center'; compassCtx.textBaseline = 'middle'
  compassCtx.font = '600 40px "Microsoft YaHei", sans-serif'
  compassCtx.fillText('南', 0, -203); compassCtx.fillText('北', 0, 203); compassCtx.fillText('东', -203, 0); compassCtx.fillText('西', 203, 0)
  const compassTexture = textureFromCanvas(compassCanvas)
  const compassMaterial = new THREE.MeshStandardMaterial({ map: compassTexture, roughness: 0.94 })
  box(0.84, 0.04, 0.84, -4, 0.012, 4, stoneMaterial)
  const compass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), compassMaterial)
  // North is +Z and east is -X; the horizontal guide must not mirror east/west.
  compass.rotation.x = -Math.PI / 2
  compass.position.set(-4, 0.033, 4)
  group.add(compass)

  const rainCount = 1600, rainPositions = new Float32Array(rainCount * 6)
  const rainSeeds = new Float32Array(rainCount * 3), rainRandom = randomGenerator(1288)
  for (let i = 0; i < rainCount; i++) {
    rainSeeds[i * 3] = rainRandom()
    rainSeeds[i * 3 + 1] = rainRandom()
    rainSeeds[i * 3 + 2] = rainRandom()
  }
  const rainGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3).setUsage(THREE.DynamicDrawUsage))
  const rainMaterial = new THREE.LineBasicMaterial({ color: '#6e909b', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial)
  rain.name = 'illustrative-rainfall'
  rain.visible = false
  rain.frustumCulled = false
  group.add(rain)

  // Shared impact pool: each slot is born at an actual falling line's ground hit.
  // Two instanced draws produce the expanding ring and a few small splash droplets.
  const impactCount = 192
  const impactOrigins = new Float32Array(impactCount * 3)
  const impactBirths = new Float32Array(impactCount).fill(-100)
  const impactLives = new Float32Array(impactCount)
  const impactRadii = new Float32Array(impactCount)
  const impactStrengths = new Float32Array(impactCount)
  const impactSeeds = new Float32Array(impactCount)
  const impactBounds = new Float32Array(impactCount * 4)
  const impactOriginAttribute = new THREE.InstancedBufferAttribute(impactOrigins, 3).setUsage(THREE.DynamicDrawUsage)
  const impactBirthAttribute = new THREE.InstancedBufferAttribute(impactBirths, 1).setUsage(THREE.DynamicDrawUsage)
  const impactLifeAttribute = new THREE.InstancedBufferAttribute(impactLives, 1).setUsage(THREE.DynamicDrawUsage)
  const impactRadiusAttribute = new THREE.InstancedBufferAttribute(impactRadii, 1).setUsage(THREE.DynamicDrawUsage)
  const impactStrengthAttribute = new THREE.InstancedBufferAttribute(impactStrengths, 1).setUsage(THREE.DynamicDrawUsage)
  const impactSeedAttribute = new THREE.InstancedBufferAttribute(impactSeeds, 1).setUsage(THREE.DynamicDrawUsage)
  const impactBoundsAttribute = new THREE.InstancedBufferAttribute(impactBounds, 4).setUsage(THREE.DynamicDrawUsage)
  const impactTime = { value: 0 }
  function addImpactAttributes(geometry: THREE.InstancedBufferGeometry): void {
    geometry.setAttribute('impactOrigin', impactOriginAttribute)
    geometry.setAttribute('impactBirth', impactBirthAttribute)
    geometry.setAttribute('impactLife', impactLifeAttribute)
    geometry.setAttribute('impactRadius', impactRadiusAttribute)
    geometry.setAttribute('impactStrength', impactStrengthAttribute)
    geometry.setAttribute('impactSeed', impactSeedAttribute)
    geometry.setAttribute('impactBounds', impactBoundsAttribute)
    geometry.instanceCount = impactCount
  }
  const ripplePlane = new THREE.PlaneGeometry(1, 1)
  const rippleGeometry = new THREE.InstancedBufferGeometry()
  rippleGeometry.setIndex(ripplePlane.index)
  rippleGeometry.setAttribute('position', ripplePlane.getAttribute('position'))
  rippleGeometry.setAttribute('uv', ripplePlane.getAttribute('uv'))
  addImpactAttributes(rippleGeometry)
  const rippleMaterial = new THREE.ShaderMaterial({
    uniforms: { uRainTime: impactTime }, transparent: true,
    depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    vertexShader: `
      attribute vec3 impactOrigin;
      attribute vec4 impactBounds;
      attribute float impactBirth, impactLife, impactRadius, impactStrength;
      uniform float uRainTime;
      varying vec2 vUv;
      varying vec2 vGroundPosition;
      varying vec4 vBounds;
      varying float vAge, vStrength;
      void main() {
        vUv = uv;
        vBounds = impactBounds;
        vAge = (uRainTime - impactBirth) / max(impactLife, 0.001);
        vStrength = impactStrength;
        float age = clamp(vAge, 0.0, 1.0);
        float radius = mix(0.033, impactRadius, 1.0 - pow(1.0 - age, 1.5));
        vec3 worldPoint = impactOrigin + vec3(position.x * radius * 2.0, 0.0, position.y * radius * 2.0);
        vGroundPosition = worldPoint.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPoint, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec2 vGroundPosition;
      varying vec4 vBounds;
      varying float vAge, vStrength;
      void main() {
        if (vAge < 0.0 || vAge > 1.0) discard;
        if (vGroundPosition.x < vBounds.x || vGroundPosition.x > vBounds.y || vGroundPosition.y < vBounds.z || vGroundPosition.y > vBounds.w) discard;
        float distanceToCenter = length(vUv - 0.5) * 2.0;
        float width = max(fwidth(distanceToCenter) * 0.85, 0.016);
        float highlight = 1.0 - smoothstep(width, width * 2.0, abs(distanceToCenter - 0.88));
        float shadow = 1.0 - smoothstep(width, width * 2.0, abs(distanceToCenter - 0.97));
        float fade = pow(sin(vAge * 3.14159265), 0.35) * pow(1.0 - vAge, 0.7);
        float wet = (1.0 - smoothstep(0.12, 0.65, distanceToCenter)) * 0.04 * (1.0 - vAge);
        float alpha = (max(highlight, shadow * 0.85) * fade * 0.96 + wet) * vStrength;
        if (alpha < 0.003) discard;
        vec3 color = mix(vec3(0.045, 0.10, 0.10), vec3(0.64, 0.82, 0.86), highlight / max(0.001, highlight + shadow));
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  })
  const ripples = new THREE.Mesh(rippleGeometry, rippleMaterial)
  ripples.name = 'rain-ground-contact-ripples'
  ripples.visible = false; ripples.frustumCulled = false; ripples.renderOrder = 2
  group.add(ripples)
  const splashGeometry = new THREE.InstancedBufferGeometry()
  splashGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0.052, 0.075, 0, -0.032, 0.059, 0.038, -0.024, 0.090, -0.044,
  ], 3))
  addImpactAttributes(splashGeometry)
  const splashMaterial = new THREE.ShaderMaterial({
    uniforms: { uRainTime: impactTime }, transparent: true,
    depthWrite: false, depthTest: true, toneMapped: false,
    vertexShader: `
      attribute vec3 impactOrigin;
      attribute float impactBirth, impactStrength, impactSeed;
      uniform float uRainTime;
      varying float vOpacity;
      void main() {
        float age = (uRainTime - impactBirth) / 0.30;
        float t = clamp(age, 0.0, 1.0);
        float angle = impactSeed * 6.2831853;
        vec2 side = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * position.xz;
        vec3 offset = vec3(side.x * t, position.y * sin(t * 3.14159265), side.y * t);
        vec4 mvPosition = modelViewMatrix * vec4(impactOrigin + offset, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(22.0 / max(0.2, -mvPosition.z), 1.2, 3.0);
        vOpacity = age >= 0.0 && age <= 1.0 ? (1.0 - t) * impactStrength * 0.54 : 0.0;
      }
    `,
    fragmentShader: `
      varying float vOpacity;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = (1.0 - smoothstep(0.35, 1.0, radius)) * vOpacity;
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(0.53, 0.71, 0.74, alpha);
        #include <colorspace_fragment>
      }
    `,
  })
  const splashes = new THREE.Points(splashGeometry, splashMaterial)
  splashes.name = 'rain-ground-contact-splashes'
  splashes.visible = false; splashes.frustumCulled = false; splashes.renderOrder = 3
  group.add(splashes)
  // The temporary plane only supplied CPU-side attributes; its replacement owns them.
  ripplePlane.dispose()

  function groundImpactSurface(x: number, z: number): { y: number; strength: number; paved: boolean; bounds: [number, number, number, number] } | null {
    // A ground ring must not float over a sensor foundation or appear beneath a roof.
    if (Math.abs(x + 3) < 0.66 && Math.abs(z) < 0.62) return null
    if (Math.abs(x) < 0.24 && Math.abs(z + 2) < 0.24) return null
    if (Math.abs(x - 0.29) < 0.15 && Math.abs(z + 1.9) < 0.15) return null
    if (Math.abs(x - 3) < 0.35 && Math.abs(z - 2) < 0.35) return null
    for (const [px, pz] of paverPositions) {
      if (Math.abs(x - px) < 0.245 && Math.abs(z - pz) < 0.245) return { y: 0.051, strength: 0.9, paved: true, bounds: [px - 0.254, px + 0.254, pz - 0.254, pz + 0.254] }
    }
    if (Math.abs(x + 4) < 0.39 && Math.abs(z - 4) < 0.39) return { y: 0.035, strength: 0.72, paved: true, bounds: [-4.4, -3.6, 3.6, 4.4] }
    return { y: 0.004, strength: 0.65, paved: false, bounds: [-7, 7, -5, 7] }
  }

  let rainTime = 0, driftOffsetX = 0, driftOffsetZ = 0, nextImpact = 0, wasRaining = false
  return {
    group,
    update(state: WeatherState, delta: number, _elapsed: number): void {
      rain.visible = state.raining
      ripples.visible = splashes.visible = state.raining
      if (!state.raining) {
        if (wasRaining) {
          impactBirths.fill(-100); impactBirthAttribute.needsUpdate = true
          nextImpact = 0; wasRaining = false
        }
        return
      }
      wasRaining = true
      const previousTime = rainTime, step = Math.min(Math.max(delta, 0), 0.05)
      rainTime += step
      impactTime.value = rainTime
      // Meteorological bearing is clockwise from north (+Z), toward east (-X).
      const azimuth = -THREE.MathUtils.degToRad(state.windDirection)
      const driftX = -Math.sin(azimuth) * state.windSpeed * 0.16
      const driftZ = -Math.cos(azimuth) * state.windSpeed * 0.16
      const previousDriftX = driftOffsetX, previousDriftZ = driftOffsetZ
      driftOffsetX += driftX * step; driftOffsetZ += driftZ * step
      let impactChanged = false
      for (let i = 0; i < rainCount; i++) {
        const k = i * 3, v = i * 6
        const phaseOffset = rainSeeds[k + 1]!
        const totalPhase = phaseOffset + rainTime * 0.42
        const cycle = Math.floor(totalPhase)
        const phase = totalPhase - cycle
        const y = 10.4 - phase * 10.3
        const x = ((rainSeeds[k]! * 13.6 + driftOffsetX + 1360) % 13.6) - 6.8
        const z = ((rainSeeds[k + 2]! * 11.6 + driftOffsetZ + 1160) % 11.6) - 4.8
        const length = 0.14 + rainSeeds[k]! * 0.10
        rainPositions[v] = x; rainPositions[v + 1] = y; rainPositions[v + 2] = z
        rainPositions[v + 3] = x + driftX * length * 0.11
        rainPositions[v + 4] = Math.max(0.006, y - length)
        rainPositions[v + 5] = z + driftZ * length * 0.11
        if (cycle > Math.floor(phaseOffset + previousTime * 0.42)) {
          const birth = (cycle - phaseOffset) / 0.42
          const hitDriftX = previousDriftX + driftX * (birth - previousTime)
          const hitDriftZ = previousDriftZ + driftZ * (birth - previousTime)
          const hitX = ((rainSeeds[k]! * 13.6 + hitDriftX + 1360) % 13.6) - 6.8 + driftX * length * 0.11
          const hitZ = ((rainSeeds[k + 2]! * 11.6 + hitDriftZ + 1160) % 11.6) - 4.8 + driftZ * length * 0.11
          const surface = groundImpactSurface(hitX, hitZ)
          // The denser rainfall still uses a sparse contact effect, not a sheet of water.
          if (surface && (i % 5 === 0 || surface.paved)) {
            let slot = -1
            for (let candidate = 0; candidate < impactCount; candidate++) {
              const index = nextImpact++ % impactCount
              if (birth - impactBirths[index]! >= impactLives[index]!) { slot = index; break }
            }
            if (slot < 0) continue
            impactOrigins[slot * 3] = hitX; impactOrigins[slot * 3 + 1] = surface.y; impactOrigins[slot * 3 + 2] = hitZ
            impactBirths[slot] = birth
            impactLives[slot] = 1.0 + rainSeeds[k + 2]! * 0.25
            impactRadii[slot] = 0.135 + rainSeeds[k]! * 0.065
            impactStrengths[slot] = surface.strength
            impactSeeds[slot] = rainSeeds[k + 2]!
            impactBounds.set(surface.bounds, slot * 4)
            impactChanged = true
          }
        }
      }
      rainGeometry.attributes.position!.needsUpdate = true
      if (impactChanged) {
        impactOriginAttribute.needsUpdate = impactBirthAttribute.needsUpdate = impactLifeAttribute.needsUpdate = true
        impactRadiusAttribute.needsUpdate = impactStrengthAttribute.needsUpdate = impactSeedAttribute.needsUpdate = true
        impactBoundsAttribute.needsUpdate = true
      }
    },
    dispose(): void {
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      const textures = new Set<THREE.Texture>()
      group.traverse((object) => {
        const renderable = object as THREE.Mesh
        if (renderable.geometry) geometries.add(renderable.geometry)
        if (renderable.material) {
          const used = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
          for (const material of used) materials.add(material)
        }
      })
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
        material.dispose()
      }
      for (const geometry of geometries) geometry.dispose()
      for (const texture of textures) texture.dispose()
      group.clear()
    },
  }
}
