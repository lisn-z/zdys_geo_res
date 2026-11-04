import * as THREE from 'three'
import { riverHeights } from './river-model'
import { depositionSurfaceHeight } from './deposition-bed'

const fract = (n: number) => n - Math.floor(n)
const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453)

/** Fine suspended silt is represented by translucent turbidity, never luminous gravel. */
export function createSedimentParticles() {
  const root = new THREE.Group()
  root.name = '褐色悬沙输移与沉降'
  const pixels = new Uint8Array(128 * 128 * 4)
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const u = (x - 63.5) / 63.5, v = (y - 63.5) / 63.5
    const envelope = Math.pow(Math.max(0, 1 - u * u - v * v), 2.5)
    const grain = .45 + .35 * hash(x * 13.7 + y * 9.3)
    const whorl = .72 + .28 * Math.sin(u * 12 + Math.sin(v * 9) * 2)
    const i = (y * 128 + x) * 4
    pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255
    pixels[i + 3] = Math.round(envelope * grain * whorl * 255)
  }
  const texture = new THREE.DataTexture(pixels, 128, 128, THREE.RGBAFormat)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true

  function createLayer(count: number, surface: boolean) {
    const geometry = new THREE.PlaneGeometry(1, 1)
    if (surface) geometry.rotateX(-Math.PI / 2)
    const opacity = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
    opacity.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('instanceSiltOpacity', opacity)
    const material = new THREE.MeshBasicMaterial({
      color: surface ? '#856c48' : '#80603c', map: texture,
      transparent: true, opacity: surface ? .24 : .68, depthWrite: false,
      side: THREE.FrontSide, toneMapped: false,
    })
    material.onBeforeCompile = shader => {
      shader.vertexShader = `attribute float instanceSiltOpacity; varying float vSiltOpacity;\n${shader.vertexShader}`
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSiltOpacity = instanceSiltOpacity;')
      shader.fragmentShader = `varying float vSiltOpacity;\n${shader.fragmentShader}`
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vSiltOpacity;')
    }
    material.customProgramCacheKey = () => 'fine-silt-opacity-v1'
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.renderOrder = 4
    root.add(mesh)
    return { mesh, geometry, material, opacity, count }
  }
  const surface = createLayer(72, true)
  const section = createLayer(128, false)
  surface.mesh.name = '随水流延展的薄层浑浊流纹'
  section.mesh.name = '前侧剖面的细密悬沙沉降'
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3()
  const rotation = new THREE.Quaternion(), axis = new THREE.Vector3(0, 1, 0)
  let previous: number | null = null, time = 0, disposed = false
  let lastTime = NaN, lastProgress = NaN, lastWater = true

  function update(elapsed: number, progress: number, playing: boolean, waterVisible: boolean) {
    if (disposed) return
    const now = Number.isFinite(elapsed) ? elapsed : 0
    if (previous !== null && playing) time += Math.max(0, Math.min(.1, now - previous))
    previous = now
    const p = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1)
    if (lastTime === time && lastProgress === p && lastWater === waterVisible) return
    lastTime = time; lastProgress = p; lastWater = waterVisible
    const h = riverHeights(p)
    surface.mesh.visible = waterVisible
    for (let i = 0; i < surface.count; i++) {
      const phase = fract(hash(i + 17) + time / (13 + hash(i + 12) * 5))
      const fade = Math.min(1, phase * 12, (1 - phase) * 12)
      position.set((hash(i + 73) - .5) * 8.9 + Math.sin(phase * 7 + i) * .06, h.water + .006, -15.7 + phase * 31.4)
      scale.set(.35 + hash(i + 79) * .45, 1, 1.1 + hash(i + 92) * 1.4)
      rotation.setFromAxisAngle(axis, Math.sin(i * 3.2) * .1)
      matrix.compose(position, rotation, scale)
      surface.mesh.setMatrixAt(i, matrix)
      surface.opacity.setX(i, fade)
    }
    rotation.identity()
    for (let i = 0; i < section.count; i++) {
      const phase = fract(hash(i + 211) + time / (6.5 + hash(i + 193) * 3))
      const falling = Math.min(phase / .86, 1)
      const fade = Math.min(1, phase * 16, (1 - phase) / .14)
      const x = (hash(i + 321) - .5) * 9.1 + Math.sin(phase * Math.PI + i) * .06
      // Silt becomes denser near the bed, then merges into the deposited layer.
      const settledHeight = depositionSurfaceHeight(x, 16, p) + .012
      const y = waterVisible ? THREE.MathUtils.lerp(h.water - .035, settledHeight, Math.pow(falling, .82)) : settledHeight
      position.set(x, y, 16.045 + (i % 5) * .002)
      scale.set(.16 + hash(i + 42) * .24, .055 + hash(i + 51) * .10, 1)
      matrix.compose(position, rotation, scale)
      section.mesh.setMatrixAt(i, matrix)
      section.opacity.setX(i, fade * (.38 + falling * .62))
    }
    for (const layer of [surface, section]) { layer.mesh.instanceMatrix.needsUpdate = true; layer.opacity.needsUpdate = true }
  }
  update(0, 0, false, true)
  return {
    root, update,
    setVisible(enabled: boolean) { root.visible = enabled },
    dispose() {
      if (disposed) return
      disposed = true
      for (const layer of [surface, section]) { layer.mesh.dispose(); layer.geometry.dispose(); layer.material.dispose() }
      texture.dispose(); root.clear()
    },
  }
}
