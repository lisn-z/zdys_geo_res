<template>
  <div class="coastal-scene">
    <div ref="hostRef" class="coastal-canvas" aria-label="观察点 A 的三维海洋与小岛，海面随潮位升降，岸滩和石阶保持固定"></div>
    <div class="coastal-tools">
      <span>观察点 A · 岸边放大</span>
      <button type="button" :class="{ active: shoreView }" @click="setView(!shoreView)">{{ shoreView ? '小岛全景' : '靠近岸边'
        }}</button>
    </div>
    <div class="coastal-labels" aria-hidden="true">
      <span ref="stepsLabelRef">固定石阶</span>
      <span ref="gaugeLabelRef">固定水尺</span>
    </div>
    <p v-if="sceneError" class="coastal-error">{{ sceneError }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { coastalWaterLevel, COAST_HIGH_WATER, COAST_LOW_WATER, islandHeight, shorelinePoint } from './coast-model'

const props = defineProps<{ height: number; playing: boolean; speed: number; active: boolean }>()
const hostRef = ref<HTMLElement | null>(null)
const stepsLabelRef = ref<HTMLElement | null>(null)
const gaugeLabelRef = ref<HTMLElement | null>(null)
const shoreView = ref(false)
const sceneError = ref('')
const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'
const SUN = new THREE.Vector3(-12, 18, 7)
const GAUGE = new THREE.Vector3(5.4, 0, 2.6)
const STEPS_ANGLE = 1.28
const geometries: THREE.BufferGeometry[] = []
const materials: THREE.Material[] = []
const textures: THREE.Texture[] = []
const seaLevelUniform = { value: coastalWaterLevel(props.height) }
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let water: Water | null = null
let oceanVolume: THREE.Mesh | null = null
let shoreline: THREE.Line | null = null
let waterPointer: THREE.Mesh | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let previousTime = 0
let waveTime = 0
let disposed = false
let lastLevel = Number.NaN
let pendingWidth = 0
let pendingHeight = 0
let renderedWidth = 0
let renderedHeight = 0

function geometry<T extends THREE.BufferGeometry>(value: T): T { geometries.push(value); return value }
function material<T extends THREE.Material>(value: T): T { materials.push(value); return value }

function createTerrain() {
  if (!scene) return
  const ground = geometry(new THREE.PlaneGeometry(21.8, 17.8, 160, 128))
  ground.rotateX(-Math.PI / 2)
  const positions = ground.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(positions.count * 3)
  const sand = new THREE.Color('#ddc28b')
  const grass = new THREE.Color('#54764a')
  const seabed = new THREE.Color('#5c8b85')
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index)
    const z = positions.getZ(index)
    const height = islandHeight(x, z)
    positions.setY(index, height)
    const variation = Math.sin(x * 7.3 + z * 4.1) * Math.sin(z * 9.7) * 0.035
    const color = height < -0.45 ? seabed.clone() : sand.clone().lerp(grass, THREE.MathUtils.smoothstep(height, 1.25, 1.9))
    color.offsetHSL(0, 0, variation).toArray(colors, index * 3)
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  ground.computeVertexNormals()
  const terrainMaterial = material(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }))
  terrainMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uSeaLevel = seaLevelUniform
    shader.vertexShader = `varying float vTerrainHeight;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTerrainHeight = position.y;')
    shader.fragmentShader = `uniform float uSeaLevel;\nvarying float vTerrainHeight;\n${shader.fragmentShader}`
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat wet = 1.0 - smoothstep(uSeaLevel + 0.04, uSeaLevel + 0.5, vTerrainHeight);\ndiffuseColor.rgb *= mix(1.0, 0.68, wet);')
  }
  const island = new THREE.Mesh(ground, terrainMaterial)
  island.receiveShadow = true
  scene.add(island)
}

function addMesh(shape: THREE.BufferGeometry, surface: THREE.Material, position: THREE.Vector3) {
  const mesh = new THREE.Mesh(geometry(shape), surface)
  mesh.position.copy(position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene!.add(mesh)
  return mesh
}

function createLandmarks() {
  const stone = material(new THREE.MeshStandardMaterial({ color: '#a9a59a', roughness: 0.95 }))
  for (let index = 0; index < 8; index++) {
    const top = -0.2 + index * 0.25
    const point = shorelinePoint(STEPS_ANGLE, top - 0.08)
    const step = addMesh(new THREE.BoxGeometry(0.95, 0.38, 0.62), stone, new THREE.Vector3(point.x, top - 0.19, point.z))
    step.rotation.y = Math.PI / 2 - STEPS_ANGLE
  }
  const rockMaterial = material(new THREE.MeshStandardMaterial({ color: '#788780', roughness: 0.96, flatShading: true }))
  for (let index = 0; index < 7; index++) {
    const point = shorelinePoint(0.15 + index * 0.31, 0.05 + index % 3 * 0.3)
    const rock = addMesh(new THREE.DodecahedronGeometry(0.25 + index % 2 * 0.12, 1), rockMaterial,
      new THREE.Vector3(point.x, point.y + 0.1, point.z))
    rock.scale.set(1.3, 0.7, 0.9)
    rock.rotation.set(index * 0.4, index * 0.7, 0)
  }
  const trunk = material(new THREE.MeshStandardMaterial({ color: '#72543a', roughness: 1 }))
  const leaves = material(new THREE.MeshStandardMaterial({ color: '#2c6548', roughness: 0.94, flatShading: true }))
  for (const [x, z, scale] of [[-2.8, -1.8, 1], [-0.4, -2.4, 0.85], [-3.4, 0.2, 0.75], [-0.2, -0.5, 0.8]]) {
    const base = islandHeight(x!, z!)
    addMesh(new THREE.CylinderGeometry(0.065, 0.11, 1.3 * scale!, 8), trunk, new THREE.Vector3(x!, base + 0.65 * scale!, z!))
    for (let index = 0; index < 3; index++) {
      const crown = addMesh(new THREE.DodecahedronGeometry(0.55 * scale!, 1), leaves,
        new THREE.Vector3(x! + Math.cos(index * 2.1) * 0.25, base + (1.4 + index * 0.08) * scale!, z! + Math.sin(index * 2.1) * 0.25))
      crown.scale.y = 0.7
    }
  }
  const white = material(new THREE.MeshStandardMaterial({ color: '#f3e9d3', roughness: 0.72 }))
  const red = material(new THREE.MeshStandardMaterial({ color: '#b45244', roughness: 0.8 }))
  const lighthouse = new THREE.Vector3(-2.2, islandHeight(-2.2, 1), 1)
  addMesh(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 16), white, lighthouse.clone().add(new THREE.Vector3(0, 0.8, 0)))
  addMesh(new THREE.CylinderGeometry(0.225, 0.26, 0.24, 16), red, lighthouse.clone().add(new THREE.Vector3(0, 1.15, 0)))
  addMesh(new THREE.ConeGeometry(0.38, 0.35, 16), red, lighthouse.clone().add(new THREE.Vector3(0, 1.92, 0)))
  addMesh(new THREE.CylinderGeometry(0.27, 0.27, 0.24, 16), white, lighthouse.clone().add(new THREE.Vector3(0, 1.66, 0)))

  addMesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 12), white, GAUGE.clone().setY(0.5))
  for (let index = 0; index <= 7; index++) {
    addMesh(new THREE.BoxGeometry(0.32, 0.06, 0.12), index % 2 ? white : red,
      GAUGE.clone().setY(COAST_LOW_WATER + index * 0.25))
  }
  const marker = material(new THREE.MeshBasicMaterial({ color: '#ffe178' }))
  waterPointer = addMesh(new THREE.BoxGeometry(0.85, 0.06, 0.32), marker, GAUGE.clone())
}

function makeContour(level: number, color: number, dashed = false) {
  const points = Array.from({ length: 257 }, (_, index) => {
    const point = shorelinePoint(index / 256 * Math.PI * 2, level)
    return new THREE.Vector3(point.x, point.y + 0.035, point.z)
  })
  const surface = dashed
    ? material(new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.85, depthTest: true, depthWrite: false, toneMapped: false }))
    : material(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: true, depthWrite: false, toneMapped: false }))
  const line = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(points)), surface)
  line.renderOrder = dashed ? 6 : 5
  if (dashed) line.computeLineDistances()
  scene!.add(line)
  return line
}

function createOcean() {
  // Same reflective Water object and normal map as sea-and-land-breezes/createWater.
  const fallback = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1)
  fallback.needsUpdate = true
  textures.push(fallback)
  const normals = new THREE.TextureLoader().load(WATER_NORMALS_URL, (texture) => {
    if (disposed) { texture.dispose(); return }
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = Math.min(renderer!.capabilities.getMaxAnisotropy(), 8)
    if (water) water.material.uniforms.normalSampler!.value = texture
  })
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping
  textures.push(normals)
  oceanVolume = addMesh(new THREE.BoxGeometry(22, 1, 18),
    material(new THREE.MeshStandardMaterial({ color: '#164957', roughness: 0.85 })), new THREE.Vector3(0, -1, 0))
  water = new Water(geometry(new THREE.PlaneGeometry(22, 18)), {
    textureWidth: 512, textureHeight: 512, waterNormals: fallback,
    sunDirection: SUN.clone().normalize(), sunColor: 0xffffff,
    waterColor: 0x167a89, distortionScale: 3.45, fog: true,
  })
  water.rotation.x = -Math.PI / 2
  water.material.uniforms.size!.value = 5
  materials.push(water.material)
  scene!.add(water)
  makeContour(COAST_HIGH_WATER, 0xffac7f, true)
  makeContour(COAST_LOW_WATER, 0x69dfff, true)
  shoreline = makeContour(seaLevelUniform.value, 0xf1fff4)
}

function updateWaterLevel() {
  const level = coastalWaterLevel(props.height)
  if (level === lastLevel) return
  lastLevel = level
  seaLevelUniform.value = level
  if (water) water.position.y = level
  if (oceanVolume) {
    // Keep the volume just under the reflecting surface; the terrain is never moved.
    const bottom = -1.6
    const top = level - 0.035
    oceanVolume.scale.y = top - bottom
    oceanVolume.position.y = (top + bottom) / 2
  }
  if (waterPointer) waterPointer.position.y = level + 0.04
  if (shoreline) {
    const positions = shoreline.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index++) {
      const point = shorelinePoint(index / 256 * Math.PI * 2, level)
      positions.setXYZ(index, point.x, point.y + 0.035, point.z)
    }
    positions.needsUpdate = true
    shoreline.geometry.computeBoundingSphere()
  }
}

function setView(close: boolean) {
  shoreView.value = close
  if (!camera || !controls) return
  camera.position.set(...(close ? [8.5, 4.8, 9.5] : [9, 8.5, 11]) as [number, number, number])
  controls.target.set(close ? 0.7 : 0, 0.4, close ? 2 : 0)
  controls.update()
}

function queueSceneResize() {
  if (!hostRef.value) return
  const { clientWidth: width, clientHeight: height } = hostRef.value
  if (width < 2 || height < 2) return
  // ResizeObserver runs after animation callbacks. Queue dimensions instead of
  // clearing the drawing buffer after its frame has already been rendered.
  pendingWidth = Math.round(width)
  pendingHeight = Math.round(height)
}

function applyPendingResize() {
  if (!renderer || !camera || !pendingWidth || !pendingHeight) return
  if (pendingWidth === renderedWidth && pendingHeight === renderedHeight) return
  renderedWidth = pendingWidth
  renderedHeight = pendingHeight
  renderer.setSize(renderedWidth, renderedHeight, false)
  camera.aspect = renderedWidth / renderedHeight
  camera.updateProjectionMatrix()
}

function createBackdrop() {
  // A restrained blue backdrop also supplies the water's reflection, without
  // the atmospheric Sky shader's nearly white lower hemisphere.
  const backdrop = new THREE.Mesh(
    geometry(new THREE.SphereGeometry(500, 32, 16)),
    material(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uLower: { value: new THREE.Color('#142c3d') },
        uHorizon: { value: new THREE.Color('#305368') },
        uUpper: { value: new THREE.Color('#101f33') },
      },
      vertexShader: `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uLower;
        uniform vec3 uHorizon;
        uniform vec3 uUpper;
        varying vec3 vDirection;
        void main() {
          float altitude = normalize(vDirection).y;
          vec3 color = mix(uLower, uHorizon, smoothstep(-0.65, 0.08, altitude));
          color = mix(color, uUpper, smoothstep(0.08, 0.9, altitude));
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })),
  )
  scene!.add(backdrop)
}

function updateLabels() {
  if (!hostRef.value || !camera) return
  const project = (element: HTMLElement | null, point: THREE.Vector3) => {
    if (!element) return
    const screen = point.project(camera!)
    element.style.display = Math.abs(screen.x) < 0.9 && Math.abs(screen.y) < 0.7 ? 'block' : 'none'
    element.style.left = `${(screen.x + 1) / 2 * hostRef.value!.clientWidth}px`
    element.style.top = `${(1 - screen.y) / 2 * hostRef.value!.clientHeight}px`
  }
  const step = shorelinePoint(STEPS_ANGLE, 0.4)
  project(stepsLabelRef.value, new THREE.Vector3(step.x, 1.9, step.z))
  project(gaugeLabelRef.value, GAUGE.clone().setY(2.65))
}

function animate(time: number) {
  if (disposed) return
  animationFrame = requestAnimationFrame(animate)
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
  previousTime = time
  if (!props.active || !renderer || !scene || !camera) return
  // Commit the new backing size immediately before drawing the same frame.
  applyPendingResize()
  if (!renderedWidth || !renderedHeight) return
  if (props.playing) waveTime += delta * props.speed
  if (water) water.material.uniforms.time!.value = waveTime * 0.65
  updateWaterLevel()
  controls?.update()
  renderer.render(scene, camera)
  updateLabels()
}

onMounted(() => {
  if (!hostRef.value) return
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color('#142c3d')
    scene.fog = new THREE.Fog('#234153', 38, 110)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    hostRef.value.appendChild(renderer.domElement)
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 10
    controls.maxDistance = 42
    controls.minPolarAngle = 0.2
    controls.maxPolarAngle = Math.PI * 0.46
    scene.add(new THREE.HemisphereLight(0xc7e4f4, 0x596047, 1.6))
    const sunlight = new THREE.DirectionalLight(0xfff0d2, 2)
    sunlight.position.copy(SUN)
    scene.add(sunlight)
    createBackdrop()
    createTerrain()
    createLandmarks()
    createOcean()
    setView(false)
    updateWaterLevel()
    queueSceneResize()
    resizeObserver = new ResizeObserver(queueSceneResize)
    resizeObserver.observe(hostRef.value)
    animationFrame = requestAnimationFrame(animate)
  } catch (error) {
    sceneError.value = '三维岸边场景暂时无法显示，请刷新页面重试。'
    console.error('潮汐岸边场景初始化失败', error)
  }
})

watch(() => props.active, () => { queueSceneResize(); previousTime = 0 }, { flush: 'post' })

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  controls?.dispose()
  water?.material.uniforms.mirrorSampler?.value?.dispose()
  geometries.forEach((item) => item.dispose())
  materials.forEach((item) => item.dispose())
  textures.forEach((item) => item.dispose())
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
})
</script>

<style scoped>
.coastal-scene {
  position: relative;
  min-height: 210px;
  overflow: hidden;
  background: #142c3d;
}

.coastal-canvas {
  position: absolute;
  inset: 0;
  touch-action: none;
  contain: layout paint;
}

.coastal-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.coastal-tools {
  position: absolute;
  inset: 10px 10px auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  font-size: 11px;
}

.coastal-tools span,
.coastal-tools button {
  border: 1px solid #ffffff55;
  border-radius: 6px;
  padding: 5px 8px;
  background: #14343dd9;
  color: #efffff;
}

.coastal-tools button {
  pointer-events: auto;
  cursor: pointer;
}

.coastal-tools button.active {
  background: #236b70;
}

.coastal-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.coastal-labels span {
  position: absolute;
  display: none;
  transform: translate(-50%, -100%);
  padding: 3px 6px;
  border-radius: 4px;
  color: #fff4ca;
  background: #23363cce;
  font-size: 10px;
  white-space: nowrap;
}

.coastal-hint {
  position: absolute;
  left: 10px;
  bottom: 8px;
  color: #f4ffff;
  background: #14343dbd;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 10px;
  pointer-events: none;
}

.coastal-error {
  position: absolute;
  inset: 40% 20px auto;
  padding: 12px;
  background: #092030;
  color: #ffffff;
  font-size: 12px;
}
</style>
