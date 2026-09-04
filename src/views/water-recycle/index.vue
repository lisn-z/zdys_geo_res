<template>
  <div class="water-recycle-container geo-template-page geo-page theme-dark">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>
      <h1 class="page-title">水循环</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="resetView">重置视角</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :aria-pressed="panelsVisible"
          @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeHostRef" class="scene-host three-host"></div>
          <div class="labels-overlay">
            <div v-for="item in screenLabels" :key="item.id" v-show="showLabels && item.visible" class="scene-label"
              :class="item.cls" :style="{ left: item.x + 'px', top: item.y + 'px' }">
              {{ item.text }}
            </div>
          </div>
        </div>
      </section>
    </main>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlPanelCollapsed"
      class="water-floating-card water-control-panel" title="控制面板" subtitle="场景、图层与教学提示" variant="control"
      :initial-top="108" :initial-right="18" :bottom-inset="14" :draggable="true" :resizable="true" :min-width="340"
      :min-height="420">
      <section class="geo-card control-section floating-card-section">
        <h3 class="panel-section-title">场景切换</h3>
        <div class="urban-toggle">
          <button class="theme-btn option-btn" :class="{ active: mainSceneMode === 'seaLand' }"
            @click="setMainSceneMode('seaLand')">
            海陆间循环
          </button>
          <button class="theme-btn option-btn" :class="{ active: mainSceneMode === 'land' }"
            @click="setMainSceneMode('land')">
            陆地内循环
          </button>
        </div>
        <p class="urban-hint">
          {{
            mainSceneMode === 'seaLand'
              ? '展示海洋蒸发、海上内循环、水汽输送、山地降水、地表径流与地下径流。'
              : '展示城镇化前与城镇化后并列对比，同场景观察下渗、蒸腾与地表径流差异。'
          }}
        </p>
      </section>
      <section class="geo-card control-section floating-card-section">
        <h3 class="panel-section-title">可视图层</h3>
        <div class="layer-list">
          <div v-for="item in layerDefs" :key="item.key" class="switch-row layer-row">
            <div class="control-copy">
              <strong>{{ item.label }}</strong>
              <span :style="{ color: item.color }">{{ item.desc }}</span>
            </div>
            <el-switch v-model="layers[item.key]" />
          </div>
          <div class="switch-row layer-row label-layer-row">
            <div class="control-copy">
              <strong>标签显示</strong>
              <span>显示各水循环环节名称</span>
            </div>
            <el-switch v-model="showLabels" />
          </div>
        </div>
      </section>
      <section class="geo-card knowledge-card floating-card-section">
        <h3 class="panel-section-title">教学提示</h3>
        <div v-if="mainSceneMode === 'seaLand'" class="knowledge-content">
          <h4>海陆间循环</h4>
          <p>海洋蒸发和海上降水共同表现海上内循环；水汽烟流从海洋上空输送到陆地。</p>
          <p>山体由左向右逐步过渡为平原；陆地内循环通过场景切换面板选择，不再绑定建筑点击事件。</p>
          <p>地表径流采用多条弯曲河道，地下水在山体侧面表现下渗和向海洋的侧向流动。</p>
        </div>
        <div v-else class="knowledge-content">
          <h4>陆地内循环</h4>
          <p>城镇化前与城镇化后放在同一场景左右并列展示，便于对比下渗、地表径流和蒸腾作用。</p>
          <p>左侧为乡村绿地、乡间小路与农房，右侧为 3×3 城市街区，道路、建筑与树木更密集。</p>
          <p>两侧顶面都加入可见的地表径流、不规则小水面与树上蒸腾烟流，侧面四周都能观察下渗箭头。</p>
        </div>
      </section>
    </FloatingFeatureCard>
  </div>
</template>

<script setup lang="ts">
// WaterCycle3D_v35：环城径流增加排水出口；城镇化前后增加差异化积水/下渗动画；清理遗留状态与文案。
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import '@/styles/geo-page-template.css'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'

type MainSceneMode = 'seaLand' | 'land'
type LandUrbanMode = 'before' | 'after'
type SceneKey = 'seaLand' | 'landBefore' | 'landAfter'

interface LayerDef {
  key: string
  label: string
  desc: string
  color: string
}

interface ScreenLabel {
  id: string
  text: string
  cls: string
  x: number
  y: number
  visible: boolean
}

interface LabelAnchor {
  id: string
  key: string
  text: string
  cls: string
  object: THREE.Object3D
  scenes: SceneKey[]
}

interface TerrainOccluder {
  object: THREE.Object3D
  scenes: SceneKey[]
}

interface ShaderSmokeFlow {
  keys: string[]
  scene: SceneKey
  group: THREE.Group
  materials: THREE.ShaderMaterial[]
}

interface RainDropParticle {
  mesh: THREE.Mesh<THREE.LatheGeometry, THREE.MeshPhysicalMaterial>
  x: number
  z: number
  offset: number
  scale: number
  drift: number
}

interface RainSystem {
  key: string
  scene: SceneKey
  group: THREE.Group
  drops: RainDropParticle[]
  topY: number
  bottomY: number
}

interface InfiltrationPulse {
  key: string
  scene: SceneKey
  mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>
  phaseOffset: number
  speed: number
  maxScale: number
  baseOpacity: number
  fadeOutStart: number
}

interface InfiltrationPulseOptions {
  count?: number
  speedMultiplier?: number
  scaleMultiplier?: number
  opacityMultiplier?: number
  fadeOutStart?: number
  toggleKey?: 'infiltration' | 'runoff'
}

interface ArrowPlaneData {
  mesh: THREE.Mesh
  baseT: number
  jitter: number
}

interface ArrowEmitter {
  key: string
  scene: SceneKey
  group: THREE.Group
  arrows: ArrowPlaneData[]
  start: THREE.Vector3
  end: THREE.Vector3
  speed: number
  billboard: boolean
  scale: number
  fixedRotation?: [number, number, number]
}

interface DynamicCurveArrow {
  key: string
  scene: SceneKey
  curve: THREE.Curve<THREE.Vector3>
  group: THREE.Group
  material: THREE.ShaderMaterial
  head: THREE.Mesh
  rate: number
  phaseOffset: number
}

interface TextureScroller {
  key: string
  scene: SceneKey
  texture: THREE.Texture
  speed: number
  axis: 'x' | 'y'
}

interface TerrainData {
  mesh: THREE.Mesh
  heights: number[]
  segX: number
  segZ: number
  width: number
  depth: number
  xMin: number
  xMax: number
  zMin: number
  zMax: number
}


const layerDefs: LayerDef[] = [
  { key: 'evaporation', label: '蒸发', desc: '海洋 / 地表蒸发', color: '#ff8a72' },
  { key: 'transport', label: '水汽输送', desc: '水汽在海洋与陆地上空输送', color: '#d7efff' },
  { key: 'precipitation', label: '降水', desc: '三维水滴降水', color: '#9fd1ff' },
  { key: 'transpiration', label: '蒸腾', desc: '植被蒸腾上升', color: '#ff9f7a' },
  { key: 'runoff', label: '地表径流', desc: '地表汇流、环城排水与入海河流', color: '#54d7d0' },
  { key: 'infiltration', label: '下渗', desc: '山体或地表向下渗透', color: '#b6a7ff' },
  { key: 'groundwater', label: '地下径流', desc: '地下水流向海洋', color: '#8c7bff' },
]

const threeHostRef = ref<HTMLElement | null>(null)
const mainSceneMode = ref<MainSceneMode>('seaLand')
const autoPlay = ref(true)
const speed = ref(1)
const showLabels = ref(true)
const isFullscreen = ref(false)
const panelsVisible = ref(true)
const controlPanelCollapsed = ref(true)
const screenLabels = ref<ScreenLabel[]>([])

const layers = reactive<Record<string, boolean>>({})
layerDefs.forEach((item) => {
  layers[item.key] = true
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animationId = 0
let clock = new THREE.Clock()
let sceneReady = false
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let lastSceneDpr = 0
let seaWater: Water | null = null
let skyEnvironment: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let cloudVolumeTexture: THREE.Data3DTexture | null = null

const smokeFlows: ShaderSmokeFlow[] = []
const riverShaderMaterials: THREE.ShaderMaterial[] = []
const landSideShaderMaterials: THREE.ShaderMaterial[] = []
const rainSystems: RainSystem[] = []
const infiltrationPulses: InfiltrationPulse[] = []
const arrowEmitters: ArrowEmitter[] = []
const dynamicCurveArrows: DynamicCurveArrow[] = []
const textureScrollers: TextureScroller[] = []
const cloudVolumeMaterials: THREE.RawShaderMaterial[] = []
const labelAnchors: LabelAnchor[] = []
const terrainOccluders: TerrainOccluder[] = []
const labelOcclusionRaycaster = new THREE.Raycaster()
const labelCameraPosition = new THREE.Vector3()
const labelRayDirection = new THREE.Vector3()
const toggleGroups = new Map<string, THREE.Object3D[]>()
const sceneGroups: Record<SceneKey, THREE.Group | null> = {
  seaLand: null,
  landBefore: null,
  landAfter: null,
}

const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'
const SUN_SCENE_POSITION = new THREE.Vector3(18, 13, -14)

const cameraPresets: Record<SceneKey, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  seaLand: { pos: new THREE.Vector3(10.2, 16.0, 52), target: new THREE.Vector3(6.2, 4.3, 0) },
  landBefore: { pos: new THREE.Vector3(0, 17.5, 59), target: new THREE.Vector3(0.0, 2.3, 0) },
  landAfter: { pos: new THREE.Vector3(0, 17.5, 59), target: new THREE.Vector3(0.0, 2.3, 0) },
}

function currentSceneKey(): SceneKey {
  if (mainSceneMode.value === 'seaLand') return 'seaLand'
  return 'landBefore'
}
function isSceneActive(sceneKey: SceneKey) {
  if (mainSceneMode.value === 'seaLand') return sceneKey === 'seaLand'
  return sceneKey === 'landBefore' || sceneKey === 'landAfter'
}

function ensureToggleGroup(key: string) {
  if (!toggleGroups.has(key)) toggleGroups.set(key, [])
  return toggleGroups.get(key)!
}
function registerToggle(key: string, object: THREE.Object3D) {
  ensureToggleGroup(key).push(object)
}
function registerLabel(id: string, key: string, text: string, cls: string, object: THREE.Object3D, scenes: SceneKey[]) {
  labelAnchors.push({ id, key, text, cls, object, scenes })
}

function registerTerrainOccluder(object: THREE.Object3D, scenes: SceneKey[]) {
  terrainOccluders.push({ object, scenes })
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / Math.max(edge1 - edge0, 1e-5), 0, 1)
  return t * t * (3 - 2 * t)
}
function fract(x: number) {
  return x - Math.floor(x)
}
function hash2(x: number, y: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123)
}
function valueNoise(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1
}
function fbm(x: number, y: number, octaves = 4) {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * freq, y * freq) * amp
    amp *= 0.5
    freq *= 2
  }
  return value
}

function createSmokeTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.92)')
  grad.addColorStop(0.32, 'rgba(230,244,255,0.52)')
  grad.addColorStop(0.72, 'rgba(190,220,240,0.12)')
  grad.addColorStop(1, 'rgba(190,220,240,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createWaterNormalsTexture() {
  const texture = new THREE.TextureLoader().load(
    '/geo-resources-folder/images/waternormals.jpg',
    (loadedTexture) => {
      loadedTexture.wrapS = THREE.RepeatWrapping
      loadedTexture.wrapT = THREE.RepeatWrapping
      loadedTexture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 1)
      loadedTexture.needsUpdate = true
    },
  )
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function createGrassTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#93bf86'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 6800; i++) {
    const x = hash2(i * 1.17, 9.3) * size
    const y = hash2(i * 2.31, 4.7) * size
    const shade = hash2(i * 3.11, 2.9)
    const green = shade > 0.56 ? 'rgba(55,112,54,0.22)' : 'rgba(190,220,158,0.18)'
    ctx.fillStyle = green
    ctx.fillRect(x, y, 1 + shade * 1.8, 1 + shade * 1.8)
  }

  for (let i = 0; i < 850; i++) {
    const x = hash2(i * 4.07, 1.3) * size
    const y = hash2(i * 5.19, 7.1) * size
    const len = 2 + hash2(i * 0.81, 8.4) * 4
    ctx.strokeStyle = 'rgba(45,105,48,0.20)'
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (hash2(i, 2.2) - 0.5) * 2.2, y - len)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy?.() ?? 4)
  return texture
}

function createMountainSurfaceTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broad = fbm(x * 0.014 + 8.2, y * 0.016 - 3.7, 4)
      const grain = fbm(x * 0.055 - 11.0, y * 0.061 + 6.4, 3)
      const stone = Math.abs(fbm(x * 0.12 + 3.4, y * 0.115 - 8.1, 2))
      const value = THREE.MathUtils.clamp(broad * 0.56 + grain * 0.27 + stone * 0.17, -1, 1)
      const fleck = hash2(x * 0.73, y * 1.17) - 0.5
      const index = (y * size + x) * 4
      image.data[index] = THREE.MathUtils.clamp(174 + value * 30 + fleck * 16, 112, 220)
      image.data[index + 1] = THREE.MathUtils.clamp(168 + value * 27 + fleck * 13, 108, 214)
      image.data[index + 2] = THREE.MathUtils.clamp(151 + value * 24 + fleck * 12, 96, 198)
      image.data[index + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3.8, 2.8)
  texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy?.() ?? 4)
  return texture
}

function createFlowTexture(color = '#79eaff') {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // 先铺满连续水色，避免透明纹理让河道看起来一段一段消失。
  ctx.fillStyle = '#269fc0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const broad = ctx.createLinearGradient(0, 0, canvas.width, 0)
  broad.addColorStop(0, 'rgba(255,255,255,0.08)')
  broad.addColorStop(0.24, color)
  broad.addColorStop(0.50, 'rgba(230,252,255,0.92)')
  broad.addColorStop(0.76, color)
  broad.addColorStop(1, 'rgba(255,255,255,0.08)')
  ctx.fillStyle = broad
  ctx.fillRect(0, 8, canvas.width, 48)

  // 少量连续细水纹，只增强流动，不切断河面。
  for (let i = 0; i < 11; i++) {
    const x = i * 48 + 8
    const streak = ctx.createLinearGradient(x, 0, x + 34, 0)
    streak.addColorStop(0, 'rgba(255,255,255,0)')
    streak.addColorStop(0.5, 'rgba(255,255,255,0.42)')
    streak.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = streak
    ctx.fillRect(x, 15 + (i % 3) * 7, 38, 9)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(2.2, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function createArrowTexture(
  colorStops: [string, string, string, string] = [
    'rgba(255,70,50,0.05)',
    'rgba(255,90,58,0.55)',
    'rgba(255,120,72,0.95)',
    'rgba(255,190,120,1)',
  ],
) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 120, 0, 0)
  grad.addColorStop(0, colorStops[0])
  grad.addColorStop(0.35, colorStops[1])
  grad.addColorStop(0.72, colorStops[2])
  grad.addColorStop(1, colorStops[3])
  ctx.fillStyle = grad
  ctx.fillRect(26, 28, 12, 60)
  ctx.beginPath()
  ctx.moveTo(32, 4)
  ctx.lineTo(50, 34)
  ctx.lineTo(38, 34)
  ctx.lineTo(38, 100)
  ctx.lineTo(26, 100)
  ctx.lineTo(26, 34)
  ctx.lineTo(14, 34)
  ctx.closePath()
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}


function getArrowTextureStops(key: string): [string, string, string, string] {
  switch (key) {
    case 'evaporation':
      return ['rgba(255,92,56,0.05)', 'rgba(255,110,72,0.55)', 'rgba(255,143,84,0.95)', 'rgba(255,201,130,1)']
    case 'transpiration':
      return ['rgba(83,214,168,0.05)', 'rgba(94,224,181,0.50)', 'rgba(120,240,193,0.92)', 'rgba(192,255,220,1)']
    case 'infiltration':
      return ['rgba(112,160,255,0.05)', 'rgba(118,174,255,0.50)', 'rgba(145,208,255,0.95)', 'rgba(214,247,255,1)']
    case 'groundwater':
      return ['rgba(82,212,255,0.05)', 'rgba(76,220,255,0.52)', 'rgba(109,245,235,0.92)', 'rgba(190,255,245,1)']
    default:
      return ['rgba(255,70,50,0.05)', 'rgba(255,90,58,0.55)', 'rgba(255,120,72,0.95)', 'rgba(255,190,120,1)']
  }
}

function riverCenterZ(x: number): number {
  return Math.sin((x + 10) * 0.34) * 1.5 + Math.sin((x + 2) * 0.12) * 0.75
}

function getSeaLandTerrainHeight(x: number, z: number) {
  // 多峰脊线叠加域扭曲噪声，形成更接近真实山系的连续山脊、支脉和沟谷。
  const t = THREE.MathUtils.clamp((x + 18) / 26, 0, 1)
  const mountainMask = 1 - smoothstep(0.57, 0.9, t)
  const warpX = x + fbm(x * 0.075 + 5.8, z * 0.082 - 1.7, 3) * 2.1
  const warpZ = z + fbm(x * 0.068 - 4.3, z * 0.09 + 7.1, 3) * 1.8
  const peak = (px: number, pz: number, sx: number, sz: number, amplitude: number) => {
    const dx = (warpX - px) / sx
    const dz = (warpZ - pz) / sz
    return Math.exp(-(dx * dx + dz * dz)) * amplitude
  }

  const massif =
    peak(-13.8, -2.6, 4.4, 4.8, 4.9)
    + peak(-11.8, 3.8, 4.8, 4.1, 5.2)
    + peak(-8.0, -0.4, 5.0, 5.8, 3.9)
    + peak(-4.2, 3.2, 5.4, 5.0, 2.2)
  const ridgeNoise = 1 - Math.abs(fbm(warpX * 0.17 + 4.2, warpZ * 0.19 - 6.8, 5))
  const ridgeDetail = Math.pow(THREE.MathUtils.clamp(ridgeNoise, 0, 1), 2.4) * 1.2
  const erosion = fbm(warpX * 0.34 - 7.0, warpZ * 0.37 + 2.3, 4) * 0.42
  const rockDetail = fbm(warpX * 0.92 + 9.1, warpZ * 0.88 - 5.6, 3) * 0.14

  let height = 0.16 + massif * (0.72 + ridgeDetail * 0.38)
  height += (ridgeDetail + erosion + rockDetail) * mountainMask

  const riverDistance = Math.abs(z - riverCenterZ(x))
  const valleyWidth = lerp(0.7, 1.35, smoothstep(-14, 6, x))
  const valley = Math.exp(-(riverDistance * riverDistance) / (valleyWidth * valleyWidth))
  height -= valley * lerp(0.74, 0.2, t) * mountainMask

  const plainBlend = smoothstep(0.64, 0.94, t)
  const plainHeight = 0.16 + fbm(x * 0.15, z * 0.18, 3) * 0.055
  height = lerp(height, plainHeight, plainBlend)

  return Math.max(0.08, height)
}

function terrainYAt(data: TerrainData, worldX: number, worldZ: number) {
  const relX = THREE.MathUtils.clamp((worldX - data.xMin) / data.width, 0, 1)
  const relZ = THREE.MathUtils.clamp((worldZ - data.zMin) / data.depth, 0, 1)
  const fx = relX * data.segX
  const fz = relZ * data.segZ
  const x0 = Math.floor(fx)
  const z0 = Math.floor(fz)
  const x1 = Math.min(data.segX, x0 + 1)
  const z1 = Math.min(data.segZ, z0 + 1)
  const tx = fx - x0
  const tz = fz - z0
  const idx = (x: number, z: number) => z * (data.segX + 1) + x
  const h00 = data.heights[idx(x0, z0)]
  const h10 = data.heights[idx(x1, z0)]
  const h01 = data.heights[idx(x0, z1)]
  const h11 = data.heights[idx(x1, z1)]
  return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz)
}

const RIVER_SURFACE_SEGMENTS = 180

function carveDownhillRiverChannel(
  data: TerrainData,
  curve: THREE.Curve<THREE.Vector3>,
  widthStart: number,
  widthEnd: number,
) {
  const points: THREE.Vector3[] = []
  const surfaceHeights = new Array<number>(RIVER_SURFACE_SEGMENTS + 1)

  for (let i = 0; i <= RIVER_SURFACE_SEGMENTS; i++) {
    const point = curve.getPointAt(i / RIVER_SURFACE_SEGMENTS)
    points.push(point)
    const terrainHeight = terrainYAt(data, point.x, point.z)
    const localSurface = terrainHeight + 0.028
    surfaceHeights[i] = i === 0
      ? localSurface
      : Math.min(localSurface, surfaceHeights[i - 1]! - 0.0008)
  }

  for (let zi = 0; zi <= data.segZ; zi++) {
    const z = data.zMin + (zi / data.segZ) * data.depth
    for (let xi = 0; xi <= data.segX; xi++) {
      const x = data.xMin + (xi / data.segX) * data.width
      let nearestIndex = 0
      let nearestDistanceSq = Number.POSITIVE_INFINITY

      for (let sampleIndex = 0; sampleIndex <= RIVER_SURFACE_SEGMENTS; sampleIndex++) {
        const point = points[sampleIndex]!
        const dx = x - point.x
        const dz = z - point.z
        const distanceSq = dx * dx + dz * dz
        if (distanceSq < nearestDistanceSq) {
          nearestDistanceSq = distanceSq
          nearestIndex = sampleIndex
        }
      }

      const t = nearestIndex / RIVER_SURFACE_SEGMENTS
      const riverHalfWidth = lerp(widthStart, widthEnd, t) * 0.5
      const channelCore = riverHalfWidth + 0.08
      const channelOuter = channelCore + 0.52
      const distance = Math.sqrt(nearestDistanceSq)
      if (distance >= channelOuter) continue

      const index = zi * (data.segX + 1) + xi
      const currentHeight = data.heights[index]!
      const bedHeight = surfaceHeights[nearestIndex]! - 0.06
      const carveStrength = 1 - smoothstep(channelCore, channelOuter, distance)
      data.heights[index] = Math.min(currentHeight, lerp(currentHeight, bedHeight, carveStrength))
    }
  }

  return surfaceHeights
}

function syncTerrainSurfaceGeometry(data: TerrainData) {
  const geometry = data.mesh.geometry as THREE.BufferGeometry
  const positions = geometry.attributes.position as THREE.BufferAttribute
  const index = geometry.index
  const topGroup = geometry.groups.find((group) => group.materialIndex === 2)
  if (!index || !topGroup) return

  const topVertexIndices = new Set<number>()
  for (let offset = topGroup.start; offset < topGroup.start + topGroup.count; offset++) {
    topVertexIndices.add(index.getX(offset))
  }
  topVertexIndices.forEach((vertexIndex) => {
    const worldX = positions.getX(vertexIndex) + data.mesh.position.x
    const worldZ = positions.getZ(vertexIndex) + data.mesh.position.z
    const worldY = terrainYAt(data, worldX, worldZ)
    positions.setY(vertexIndex, worldY - data.mesh.position.y)
  })
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function buildDeformedLandBox(width: number, depth: number, segX: number, segZ: number) {
  const height = 6
  const centerX = -5
  const centerY = -3
  const bottomY = centerY - height * 0.5
  const xMin = centerX - width * 0.5
  const xMax = centerX + width * 0.5
  const zMin = -depth * 0.5
  const zMax = depth * 0.5

  // 直接对完整 BoxGeometry 的顶面顶点做噪声隆起，四个侧面、背面和底面天然闭合。
  const geometry = new THREE.BoxGeometry(width, height, depth, segX, 10, segZ)
  const positions = geometry.attributes.position as THREE.BufferAttribute
  const normals = geometry.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(positions.count * 3)
  const topLocalY = height * 0.5
  const color = new THREE.Color()

  for (let index = 0; index < positions.count; index++) {
    const localX = positions.getX(index)
    const localY = positions.getY(index)
    const localZ = positions.getZ(index)
    const worldX = localX + centerX
    const isTopVertex = localY > topLocalY - 0.001
    const topHeight = getSeaLandTerrainHeight(worldX, localZ)

    if (isTopVertex) positions.setY(index, topLocalY + topHeight)

    if (normals.getY(index) > 0.5) {
      const variation = fbm(worldX * 0.22 + 4, localZ * 0.24 - 2, 2) * 0.035
      if (topHeight < 0.38) color.setRGB(0.54 + variation, 0.62 + variation, 0.40)
      else if (topHeight < 1.5) color.setRGB(0.39 + variation, 0.52 + variation, 0.30)
      else if (topHeight < 3.0) color.setRGB(0.33 + variation, 0.43 + variation, 0.27)
      else if (topHeight < 4.8) color.setRGB(0.45 + variation, 0.43 + variation, 0.37)
      else if (topHeight < 5.8) color.setRGB(0.62 + variation, 0.61 + variation, 0.57)
      else color.setRGB(0.91 + variation, 0.93 + variation, 0.94 + variation)
    } else {
      // 海陆间循环底座的侧面、背面与底面统一使用单一土壤色，
      // 不再根据深度绘制分层地层，避免侧面出现彩色分层条带。
      color.set(0x6b4b32)
    }

    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const mountainTexture = createMountainSurfaceTexture()
  const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x684f3e, roughness: 1, metalness: 0 })
  const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3c46, roughness: 1, metalness: 0 })
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: mountainTexture,
    bumpMap: mountainTexture,
    bumpScale: 0.2,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  })
  const terrain = new THREE.Mesh(geometry, [sideMaterial, sideMaterial, topMaterial, bottomMaterial, sideMaterial, sideMaterial])
  terrain.position.set(centerX, centerY, 0)
  terrain.castShadow = true
  terrain.receiveShadow = true
  registerTerrainOccluder(terrain, ['seaLand'])

  const heights: number[] = []
  for (let zi = 0; zi <= segZ; zi++) {
    const z = zMin + (zi / segZ) * depth
    for (let xi = 0; xi <= segX; xi++) {
      const x = xMin + (xi / segX) * width
      heights.push(getSeaLandTerrainHeight(x, z))
    }
  }

  const group = new THREE.Group()
  group.add(terrain)
  return {
    group,
    data: {
      mesh: terrain,
      heights,
      segX,
      segZ,
      width,
      depth,
      xMin,
      xMax,
      zMin,
      zMax,
    } as TerrainData,
    bottomY,
  }
}

function getCloudVolumeTexture() {
  if (cloudVolumeTexture) return cloudVolumeTexture
  const size = 56
  const data = new Uint8Array(size * size * size)
  const perlin = new ImprovedNoise()
  const vector = new THREE.Vector3()
  const lobeDensity = (point: THREE.Vector3, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => {
    const dx = (point.x - cx) / sx
    const dy = (point.y - cy) / sy
    const dz = (point.z - cz) / sz
    return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz))
  }
  let index = 0

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const centered = vector.set(x, y, z).divideScalar(size).subScalar(0.5).multiplyScalar(2)
        const cloudEnvelope = Math.max(
          lobeDensity(centered, 0, -0.12, 0, 0.92, 0.46, 0.72),
          lobeDensity(centered, -0.46, -0.15, 0.06, 0.57, 0.36, 0.56),
          lobeDensity(centered, 0.42, -0.1, -0.04, 0.62, 0.42, 0.58),
          lobeDensity(centered, -0.08, 0.24, 0, 0.54, 0.58, 0.52),
        )
        const baseNoise = perlin.noise(x * 0.038, y * 0.052, z * 0.038)
        const detailNoise = perlin.noise(x * 0.095 + 11.7, y * 0.11 - 4.2, z * 0.095 + 7.4)
        data[index++] = THREE.MathUtils.clamp(
          (150 + baseNoise * 82 + detailNoise * 32) * Math.pow(cloudEnvelope, 1.35),
          0,
          255,
        )
      }
    }
  }

  cloudVolumeTexture = new THREE.Data3DTexture(data, size, size, size)
  cloudVolumeTexture.format = THREE.RedFormat
  cloudVolumeTexture.minFilter = THREE.LinearFilter
  cloudVolumeTexture.magFilter = THREE.LinearFilter
  cloudVolumeTexture.unpackAlignment = 1
  cloudVolumeTexture.needsUpdate = true
  return cloudVolumeTexture
}

function createCloud(position: THREE.Vector3, scale = 1) {
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      base: { value: new THREE.Color(0xe5edf4) },
      map: { value: getCloudVolumeTexture() },
      cameraPos: { value: new THREE.Vector3() },
      threshold: { value: 0.2 },
      opacity: { value: 0.16 },
      range: { value: 0.13 },
      steps: { value: 42 },
      frame: { value: Math.floor(hash2(position.x, position.z) * 1000) },
    },
    vertexShader: `
      precision highp float;
      in vec3 position;
      uniform mat4 modelMatrix;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform vec3 cameraPos;
      out vec3 vOrigin;
      out vec3 vDirection;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPos, 1.0));
        vDirection = position - vOrigin;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      precision highp sampler3D;
      uniform sampler3D map;
      uniform vec3 base;
      uniform float threshold;
      uniform float range;
      uniform float opacity;
      uniform float steps;
      uniform float frame;
      in vec3 vOrigin;
      in vec3 vDirection;
      out vec4 color;

      uint wang_hash(uint seed) {
        seed = (seed ^ 61u) ^ (seed >> 16u);
        seed *= 9u;
        seed = seed ^ (seed >> 4u);
        seed *= 0x27d4eb2du;
        seed = seed ^ (seed >> 15u);
        return seed;
      }

      float randomFloat(inout uint seed) {
        return float(wang_hash(seed)) / 4294967296.0;
      }

      vec2 hitBox(vec3 origin, vec3 direction) {
        const vec3 boxMin = vec3(-0.5);
        const vec3 boxMax = vec3(0.5);
        vec3 inverseDirection = 1.0 / direction;
        vec3 tMinTemp = (boxMin - origin) * inverseDirection;
        vec3 tMaxTemp = (boxMax - origin) * inverseDirection;
        vec3 tMin = min(tMinTemp, tMaxTemp);
        vec3 tMax = max(tMinTemp, tMaxTemp);
        return vec2(max(tMin.x, max(tMin.y, tMin.z)), min(tMax.x, min(tMax.y, tMax.z)));
      }

      float sampleDensity(vec3 point) {
        return texture(map, point).r;
      }

      float shading(vec3 point) {
        const float offset = 0.012;
        vec3 lightDirection = normalize(vec3(-0.8, 1.0, 0.35));
        return sampleDensity(point + lightDirection * offset) - sampleDensity(point - lightDirection * offset);
      }

      void main() {
        vec3 rayDirection = normalize(vDirection);
        vec2 bounds = hitBox(vOrigin, rayDirection);
        if (bounds.x > bounds.y) discard;
        bounds.x = max(bounds.x, 0.0);
        float stepSize = (bounds.y - bounds.x) / steps;
        uint seed = uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uint(frame) * 26699u;
        vec3 volumeSize = vec3(textureSize(map, 0));
        float jitter = randomFloat(seed) * 2.0 - 1.0;
        vec3 point = vOrigin + bounds.x * rayDirection;
        point += rayDirection * jitter * (1.0 / volumeSize);
        vec4 accumulated = vec4(0.0);

        for (float stepIndex = 0.0; stepIndex < steps; stepIndex += 1.0) {
          float density = sampleDensity(point + 0.5);
          density = smoothstep(threshold - range, threshold + range, density) * opacity;
          float light = clamp(0.78 + shading(point + 0.5) * 2.8 + point.y * 0.16, 0.58, 1.0);
          vec3 cloudColor = mix(base * 0.88, vec3(1.0, 0.985, 0.95), light);
          accumulated.rgb += (1.0 - accumulated.a) * density * cloudColor;
          accumulated.a += (1.0 - accumulated.a) * density;
          if (accumulated.a >= 0.96) break;
          point += rayDirection * stepSize;
        }

        if (accumulated.a <= 0.01) discard;
        color = accumulated;
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  })
  cloudVolumeMaterials.push(material)

  const cloud = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  cloud.position.copy(position)
  cloud.scale.set(5.2 * scale, 3.5 * scale, 3.3 * scale)
  cloud.renderOrder = 3
  const cameraWorldPosition = new THREE.Vector3()
  cloud.onBeforeRender = (_renderer, _scene, activeCamera) => {
    activeCamera.getWorldPosition(cameraWorldPosition)
    material.uniforms.cameraPos!.value.copy(cameraWorldPosition)
    material.uniforms.frame!.value += 1
  }
  return cloud
}

function createOffsetSmokeCurve(
  baseCurve: THREE.Curve<THREE.Vector3>,
  samples: number,
  normalOffset: number,
  binormalOffset: number,
  phase: number,
  waviness: number,
  twistCount: number,
) {
  const isClosed = baseCurve instanceof THREE.CatmullRomCurve3 && baseCurve.closed
  const frames = baseCurve.computeFrenetFrames(samples, isClosed)
  const points: THREE.Vector3[] = []
  const center = new THREE.Vector3()

  for (let index = 0; index <= samples; index++) {
    const t = index / samples
    baseCurve.getPointAt(t, center)
    const slowCurl = Math.sin(t * Math.PI * 2 * 1.15 + phase * 0.63)
    const fastCurl = Math.sin(t * Math.PI * 2 * 3.4 - phase * 1.31)
    const twist = phase + t * Math.PI * 2 * twistCount + slowCurl * 0.46 + fastCurl * 0.16
    const breathing = 0.58 + 0.30 * Math.sin(t * Math.PI * 2 * 1.9 + phase * 0.7) + 0.12 * Math.sin(t * Math.PI * 2 * 5.1 - phase)
    const meander = waviness * 0.34 * slowCurl
    const normalAmount = normalOffset + Math.cos(twist) * waviness * breathing + meander
    const binormalAmount = binormalOffset + Math.sin(twist) * waviness * breathing + waviness * 0.22 * fastCurl
    points.push(
      center.clone()
        .addScaledVector(frames.normals[index]!, normalAmount)
        .addScaledVector(frames.binormals[index]!, binormalAmount),
    )
  }

  const curve = new THREE.CatmullRomCurve3(points, isClosed, 'centripetal', 0.5)
  curve.arcLengthDivisions = Math.max(260, samples * 2)
  return curve
}

function createShaderSmokeMaterial(
  color: number,
  options: {
    opacity: number
    flowSpeed: number
    phase: number
    waveAmplitude: number
    waveFrequency: number
    haze: boolean
    brightness: number
  },
  colorEnd = color,
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uColorEnd: { value: new THREE.Color(colorEnd) },
      uGradient: { value: colorEnd === color ? 0 : 1 },
      uTime: { value: 0 },
      uOpacity: { value: options.opacity },
      uFlowSpeed: { value: options.flowSpeed },
      uPhase: { value: options.phase },
      uWaveAmplitude: { value: options.waveAmplitude },
      uWaveFrequency: { value: options.waveFrequency },
      uHaze: { value: options.haze ? 1 : 0 },
      uBrightness: { value: options.brightness },
      uClosed: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uFlowSpeed;
      uniform float uPhase;
      uniform float uWaveAmplitude;
      uniform float uWaveFrequency;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying float vVertexTurbulence;
      const float TAU = 6.283185307179586;
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbmNoise(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int index = 0; index < 4; index++) {
          value += valueNoise(p) * amplitude;
          p = p * 2.03 + vec2(17.13, 9.27);
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        vUv = uv;
        float flow = uv.x * uWaveFrequency - uTime * uFlowSpeed * 0.16 + uPhase;
        vec2 periodicCoord = vec2(cos(flow * TAU), sin(flow * TAU)) * 1.8;
        float turbulence = fbmNoise(periodicCoord + vec2(uv.y * 2.7, uTime * 0.045));
        float rollingWave = sin(flow * TAU + turbulence * 4.2 + sin(uv.y * TAU) * 0.85);
        vec3 transformed = position;
        transformed += normal * uWaveAmplitude * (rollingWave * 0.58 + (turbulence - 0.5) * 1.35);
        vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        vVertexTurbulence = turbulence;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uColorEnd;
      uniform float uGradient;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uFlowSpeed;
      uniform float uPhase;
      uniform float uHaze;
      uniform float uBrightness;
      uniform float uClosed;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying float vVertexTurbulence;
      const float TAU = 6.283185307179586;
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbmNoise(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int index = 0; index < 5; index++) {
          value += valueNoise(p) * amplitude;
          p = p * 2.01 + vec2(11.71, 7.43);
          amplitude *= 0.5;
        }
        return value;
      }
      void main() {
        float movingX = fract(vUv.x - uTime * uFlowSpeed * 0.042 + uPhase);
        vec2 loopCoord = vec2(cos(movingX * TAU), sin(movingX * TAU));
        vec2 aroundCoord = vec2(cos(vUv.y * TAU), sin(vUv.y * TAU));
        float broadNoise = fbmNoise(loopCoord * 2.35 + aroundCoord * 0.82 + vec2(uTime * 0.026, -uTime * 0.018));
        float fineNoise = fbmNoise(loopCoord * 5.15 - aroundCoord * 1.27 + vec2(-uTime * 0.055, uTime * 0.031) + uPhase * 2.0);
        float broadPulse = 0.5 + 0.5 * sin((vUv.x * 4.2 - uTime * uFlowSpeed * 0.21 + uPhase + broadNoise * 0.52) * TAU);
        float mediumPulse = 0.5 + 0.5 * sin((vUv.x * 9.5 - uTime * uFlowSpeed * 0.34 + uPhase * 1.43 + fineNoise * 0.31) * TAU);
        float finePulse = 0.5 + 0.5 * sin((vUv.x * 18.0 - uTime * uFlowSpeed * 0.53 + uPhase * 2.17 + fineNoise * 0.18) * TAU);
        float streaks = pow(broadPulse, 2.4) * 0.46 + pow(mediumPulse, 6.0) * 0.38 + pow(finePulse, 14.0) * 0.34;
        float turbulentDensity = smoothstep(0.22, 0.88, broadNoise * 0.62 + fineNoise * 0.38 + vVertexTurbulence * 0.24);
        float fresnel = pow(1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDirection))), 1.18);
        float filamentDensity = (0.08 + streaks) * (0.30 + turbulentDensity * 0.84) * (0.22 + fresnel * 0.94);
        float hazeDensity = (0.16 + broadPulse * 0.27) * (0.26 + turbulentDensity * 0.88) * (0.18 + fresnel * 0.88);
        float density = mix(filamentDensity, hazeDensity, uHaze);
        float openEdgeFade = smoothstep(0.0, 0.055, vUv.x) * (1.0 - smoothstep(0.945, 1.0, vUv.x));
        float edgeFade = mix(openEdgeFade, 1.0, uClosed);
        float softBreakup = smoothstep(0.10, 0.82, broadNoise * 0.58 + fineNoise * 0.42);
        float alpha = uOpacity * density * edgeFade * (0.46 + softBreakup * 0.70);
        if (alpha < 0.0035) discard;
        float whitening = clamp(0.14 + fresnel * 0.42 + pow(finePulse, 10.0) * 0.27 + uHaze * 0.06, 0.0, 0.78);
        float gradientT = smoothstep(0.02, 0.82, vUv.x);
        vec3 baseColor = mix(uColor, uColorEnd, gradientT * uGradient);
        vec3 smokeColor = mix(baseColor, vec3(1.0), whitening);
        smokeColor *= uBrightness * (0.64 + density * 0.72);
        gl_FragColor = vec4(smokeColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  material.toneMapped = false
  return material
}

function createSmokeStreamMesh(
  baseCurve: THREE.Curve<THREE.Vector3>,
  color: number,
  options: {
    normalOffset: number
    binormalOffset: number
    phase: number
    radius: number
    opacity: number
    flowSpeed: number
    waveAmplitude: number
    waveFrequency: number
    twistCount: number
    haze: boolean
    brightness: number
  },
  colorEnd = color,
) {
  const samples = 150
  const smokeCurve = createOffsetSmokeCurve(
    baseCurve,
    samples,
    options.normalOffset,
    options.binormalOffset,
    options.phase,
    options.haze ? options.radius * 0.22 : options.radius * 0.7,
    options.twistCount,
  )
  const isClosed = baseCurve instanceof THREE.CatmullRomCurve3 && baseCurve.closed
  const geometry = new THREE.TubeGeometry(smokeCurve, 260, options.radius, options.haze ? 8 : 6, isClosed)
  const material = createShaderSmokeMaterial(color, options, colorEnd)
  material.uniforms.uClosed.value = isClosed ? 1 : 0
  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = options.haze ? 5.7 : 6.1
  mesh.frustumCulled = false
  return { mesh, material }
}

function createSmokeFlow(
  key: string | string[],
  sceneKey: SceneKey,
  curve: THREE.CatmullRomCurve3,
  color: number,
  count: number,
  size: number,
  flowSpeed: number,
  colorEnd = color,
) {
  const keys = Array.isArray(key) ? key : [key]
  const group = new THREE.Group()
  const materials: THREE.ShaderMaterial[] = []
  const shaderSpeed = Math.max(1.15, flowSpeed * 15.5)
  const strandCount = THREE.MathUtils.clamp(Math.round(count / 3), 5, 9)
  const spread = size * 0.16

  const hazeA = createSmokeStreamMesh(curve, color, {
    normalOffset: 0,
    binormalOffset: 0,
    phase: 0.17,
    radius: size * 0.22,
    opacity: 0.065,
    flowSpeed: shaderSpeed * 0.72,
    waveAmplitude: size * 0.025,
    waveFrequency: 3.2,
    twistCount: 1.8,
    haze: true,
    brightness: 0.82,
  }, colorEnd)
  group.add(hazeA.mesh)
  materials.push(hazeA.material)

  const hazeB = createSmokeStreamMesh(curve, color, {
    normalOffset: spread * 0.12,
    binormalOffset: -spread * 0.08,
    phase: 1.37,
    radius: size * 0.32,
    opacity: 0.032,
    flowSpeed: shaderSpeed * 0.48,
    waveAmplitude: size * 0.038,
    waveFrequency: 2.1,
    twistCount: 1.2,
    haze: true,
    brightness: 0.68,
  }, colorEnd)
  group.add(hazeB.mesh)
  materials.push(hazeB.material)

  for (let index = 0; index < strandCount; index++) {
    const angle = (index / strandCount) * Math.PI * 2 + (index % 2) * 0.19
    const distance = spread * (0.48 + 0.34 * (0.5 + 0.5 * Math.sin(index * 1.71)))
    const strand = createSmokeStreamMesh(curve, color, {
      normalOffset: Math.cos(angle) * distance,
      binormalOffset: Math.sin(angle) * distance,
      phase: angle + index * 0.37,
      radius: size * 0.052 * (0.9 + 0.16 * Math.sin(index * 2.13)),
      opacity: 0.27 * (0.82 + 0.18 * Math.cos(index * 1.47)),
      flowSpeed: shaderSpeed * (0.90 + index * 0.026),
      waveAmplitude: size * 0.016 * (0.82 + index * 0.045),
      waveFrequency: 4.0 * (0.88 + index * 0.035),
      twistCount: 3.2 * (0.92 + index * 0.028),
      haze: false,
      brightness: index === 0 ? 1.30 : 1.08 + (index % 3) * 0.06,
    }, colorEnd)
    group.add(strand.mesh)
    materials.push(strand.material)
  }

  group.name = `${sceneKey}-${keys.join('-')}-shader-smoke-bundle`
  smokeFlows.push({ keys, scene: sceneKey, group, materials })
  keys.forEach((itemKey) => registerToggle(itemKey, group))
  return group
}

function createIrregularInfiltrationPulse(
  sceneKey: SceneKey,
  position: THREE.Vector3,
  radius: number,
  phaseOffset: number,
  seed: number,
  options: InfiltrationPulseOptions = {},
) {
  const toggleKey = options.toggleKey ?? 'infiltration'
  const shape = new THREE.Shape()
  const pointCount = 20
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2
    const jitter = 0.72 + hash2(seed + i * 1.37, 8.9) * 0.38
    const localRadius = radius * jitter
    const x = Math.cos(angle) * localRadius
    const y = Math.sin(angle) * localRadius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()

  const material = new THREE.MeshBasicMaterial({
    color: 0x68dff5,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.copy(position)
  mesh.scale.setScalar(0.08)
  mesh.renderOrder = 5
  infiltrationPulses.push({
    key: toggleKey,
    scene: sceneKey,
    mesh,
    phaseOffset,
    speed: (0.23 + hash2(seed * 0.73, 4.6) * 0.05) * (options.speedMultiplier ?? 1),
    maxScale: (1.0 + hash2(seed * 1.19, 7.2) * 0.28) * (options.scaleMultiplier ?? 1),
    baseOpacity: (0.42 + hash2(seed * 1.73, 3.4) * 0.14) * (options.opacityMultiplier ?? 1),
    fadeOutStart: options.fadeOutStart ?? 0.48,
  })
  registerToggle(toggleKey, mesh)
  return mesh
}

function createInfiltrationPulseCluster(
  root: THREE.Group,
  sceneKey: SceneKey,
  position: THREE.Vector3,
  radius: number,
  seed: number,
  options: InfiltrationPulseOptions = {},
) {
  const count = options.count ?? 3
  for (let i = 0; i < count; i++) {
    const offsetX = (hash2(seed + i * 2.4, 1.7) - 0.5) * radius * 0.75
    const offsetZ = (hash2(seed + i * 3.1, 6.3) - 0.5) * radius * 0.75
    const pulsePosition = position.clone().add(new THREE.Vector3(offsetX, i * 0.004, offsetZ))
    root.add(
      createIrregularInfiltrationPulse(
        sceneKey,
        pulsePosition,
        radius * (0.74 + i * 0.1),
        i / count,
        seed + i * 10.3,
        options,
      ),
    )
  }
}

function createRainSystem(key: string, sceneKey: SceneKey, xCenter: number, zCenter: number, topY: number, bottomY: number, width: number, depth: number, count: number) {
  const group = new THREE.Group()
  const drops: RainDropParticle[] = []
  const dropProfile = [
    new THREE.Vector2(0.0, 0.24),
    new THREE.Vector2(0.026, 0.13),
    new THREE.Vector2(0.052, 0.015),
    new THREE.Vector2(0.058, -0.07),
    new THREE.Vector2(0.038, -0.15),
    new THREE.Vector2(0.0, -0.18),
  ]
  const dropGeometry = new THREE.LatheGeometry(dropProfile, 10)
  dropGeometry.computeVertexNormals()
  const dropMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8fdcff,
    emissive: 0x1c78a4,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.78,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.16,
    thickness: 0.12,
    depthWrite: false,
  })
  for (let i = 0; i < count; i++) {
    const x = xCenter + (hash2(i, 7.3) - 0.5) * width
    const z = zCenter + (hash2(i + 3.1, 5.9) - 0.5) * depth
    const scale = 0.72 + hash2(i + 0.4, 2.9) * 0.58
    const drift = (hash2(i + 1.7, 8.4) - 0.5) * 0.16
    const mesh = new THREE.Mesh(dropGeometry, dropMaterial)
    mesh.position.set(x, topY, z)
    mesh.scale.set(scale, scale * (1.25 + hash2(i + 2.8, 4.1) * 0.55), scale)
    mesh.renderOrder = 5
    group.add(mesh)
    drops.push({ mesh, x, z, offset: hash2(i * 1.2, 9.1), scale, drift })
  }
  rainSystems.push({ key, scene: sceneKey, group, drops, topY, bottomY })
  registerToggle(key, group)
  return group
}

function createArrowEmitter(key: string, sceneKey: SceneKey, start: THREE.Vector3, end: THREE.Vector3, count: number, scale: number, moveSpeed: number, billboard = true, fixedRotation?: [number, number, number]) {
  const group = new THREE.Group()
  const tex = createArrowTexture(getArrowTextureStops(key))
  const arrows: ArrowPlaneData[] = []
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale * 0.55, scale * 1.15), material)
    group.add(mesh)
    arrows.push({ mesh, baseT: i / count, jitter: hash2(i * 2.2, 7.7) })
  }
  arrowEmitters.push({ key, scene: sceneKey, group, arrows, start, end, speed: moveSpeed, billboard, scale, fixedRotation })
  registerToggle(key, group)
  return group
}


function createGradientArrowMaterial(colorA: number, colorB: number) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      void main() {
        float along = clamp(vUv.x, 0.0, 1.0);
        float cycle = fract(along - uTime);
        float pulse = exp(-pow((cycle - 0.16) / 0.13, 2.0));
        vec3 base = mix(uColorA, uColorB, along);
        vec3 color = base + pulse * vec3(0.24, 0.34, 0.38);
        float alpha = 0.06 + pulse * 0.48;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
  material.toneMapped = false
  return material
}

function createDynamicCurveArrow(
  key: string,
  sceneKey: SceneKey,
  curve: THREE.Curve<THREE.Vector3>,
  options: {
    colorA: number
    colorB: number
    radius?: number
    rate?: number
    phaseOffset?: number
    headScale?: number
  },
) {
  const group = new THREE.Group()
  const radius = options.radius ?? 0.065
  const material = createGradientArrowMaterial(options.colorA, options.colorB)
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, radius, 10, false), material)
  tube.frustumCulled = false
  group.add(tube)

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 3.1, radius * 7.6, 14),
    new THREE.MeshBasicMaterial({
      color: options.colorB,
      transparent: true,
      opacity: 0.76,
      blending: THREE.NormalBlending,
      depthWrite: false,
    }),
  )
  head.scale.setScalar(options.headScale ?? 1)
  group.add(head)

  dynamicCurveArrows.push({
    key,
    scene: sceneKey,
    curve,
    group,
    material,
    head,
    rate: options.rate ?? 0.2,
    phaseOffset: options.phaseOffset ?? 0,
  })
  registerToggle(key, group)
  return group
}

function createSurfaceRiverRibbon(
  curve: THREE.Curve<THREE.Vector3>,
  widthStart: number,
  widthEnd: number,
  heightSampler: (x: number, z: number) => number,
  prescribedSurfaceHeights?: number[],
  showArtificialBed = true,
) {
  const segments = RIVER_SURFACE_SEGMENTS
  const crossSegments = 8
  const surfaceOffset = 0.075
  const minimumDropPerSegment = 0.0015
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const previous = new THREE.Vector3()
  const next = new THREE.Vector3()
  const side = new THREE.Vector3()
  const sections: Array<{ point: THREE.Vector3; vertices: THREE.Vector3[]; terrainTop: number }> = []
  const surfaceHeights = new Array<number>(segments + 1)

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const point = curve.getPointAt(t)
    curve.getPointAt(Math.max(0, t - 0.005), previous)
    curve.getPointAt(Math.min(1, t + 0.005), next)
    side.set(-(next.z - previous.z), 0, next.x - previous.x).normalize()
    const halfWidth = lerp(widthStart, widthEnd, t) * 0.5
    const vertices: THREE.Vector3[] = []
    let terrainTop = Number.NEGATIVE_INFINITY
    for (let crossIndex = 0; crossIndex <= crossSegments; crossIndex++) {
      const crossT = crossIndex / crossSegments
      const lateralOffset = lerp(halfWidth, -halfWidth, crossT)
      const vertex = point.clone().addScaledVector(side, lateralOffset)
      terrainTop = Math.max(terrainTop, heightSampler(vertex.x, vertex.z))
      vertices.push(vertex)
    }
    sections.push({ point, vertices, terrainTop })
  }

  if (prescribedSurfaceHeights?.length === segments + 1) {
    for (let i = 0; i <= segments; i++) surfaceHeights[i] = prescribedSurfaceHeights[i]!
  } else {
    // 平坦场景没有可下切山体时，仍保证水面沿流向缓慢降低且不穿模。
    surfaceHeights[segments] = sections[segments]!.terrainTop + surfaceOffset
    for (let i = segments - 1; i >= 0; i--) {
      surfaceHeights[i] = Math.max(
        sections[i]!.terrainTop + surfaceOffset,
        surfaceHeights[i + 1]! + minimumDropPerSegment,
      )
    }
  }

  const flowPoints: THREE.Vector3[] = []
  sections.forEach((section, sectionIndex) => {
    const t = sectionIndex / segments
    const surfaceY = surfaceHeights[sectionIndex]!
    section.vertices.forEach((vertex, crossIndex) => {
      positions.push(vertex.x, surfaceY, vertex.z)
      uvs.push(t, crossIndex / crossSegments)
    })
    flowPoints.push(new THREE.Vector3(section.point.x, surfaceY + 0.035, section.point.z))
  })

  for (let i = 0; i < segments; i++) {
    const row = crossSegments + 1
    for (let crossIndex = 0; crossIndex < crossSegments; crossIndex++) {
      const a = i * row + crossIndex
      const b = a + 1
      const c = a + row
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x176f8a) },
      uMid: { value: new THREE.Color(0x36aeb8) },
      uShallow: { value: new THREE.Color(0x8bd7c9) },
      uFoam: { value: new THREE.Color(0xdaf6e9) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        float edgeDistance = min(vUv.y, 1.0 - vUv.y);
        float edgeFade = smoothstep(0.012, 0.075, edgeDistance);
        float depth = smoothstep(0.02, 0.46, edgeDistance);
        float broadFlow = sin(vUv.x * 42.0 - uTime * 3.0 + vUv.y * 5.0) * 0.5 + 0.5;
        float fineFlow = sin(vUv.x * 116.0 - uTime * 5.6 - vUv.y * 13.0) * 0.5 + 0.5;
        float currentLine = smoothstep(0.78, 0.98, broadFlow * 0.68 + fineFlow * 0.32) * depth;
        float bankRipple = sin(vUv.x * 61.0 - uTime * 2.1 + vUv.y * 18.0) * 0.5 + 0.5;
        float foam = (1.0 - smoothstep(0.025, 0.16, edgeDistance))
          * smoothstep(0.54, 0.92, bankRipple) * 0.48;
        vec3 color = mix(uShallow, uMid, depth);
        color = mix(color, uDeep, depth * depth * 0.5);
        color += vec3(0.14, 0.28, 0.27) * currentLine;
        color = mix(color, uFoam, foam);
        float alpha = (0.68 + depth * 0.18 + foam * 0.12) * edgeFade;
        if (alpha < 0.025) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
  riverShaderMaterials.push(material)

  const water = new THREE.Mesh(geometry, material)
  water.renderOrder = 3
  const group = new THREE.Group()
  if (showArtificialBed) {
    const bedGeometry = geometry.clone()
    const bedPos = bedGeometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < bedPos.count; i++) bedPos.setY(i, bedPos.getY(i) - 0.045)
    bedPos.needsUpdate = true
    bedGeometry.computeVertexNormals()
    group.add(new THREE.Mesh(
      bedGeometry,
      new THREE.MeshStandardMaterial({ color: 0x486656, roughness: 0.94, metalness: 0 }),
    ))
  }
  group.add(water)
  const flowCurve = new THREE.CatmullRomCurve3(flowPoints, false, 'centripetal', 0.5)
  return { mesh: group, material, flowCurve }
}

function createSideRiverRibbon(
  curve: THREE.Curve<THREE.Vector3>,
  widthStart: number,
  widthEnd: number,
  zOffset = 0.012,
) {
  const segments = 150
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const previous = new THREE.Vector3()
  const next = new THREE.Vector3()
  const side = new THREE.Vector3()

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const point = curve.getPointAt(t)
    curve.getPointAt(Math.max(0, t - 0.006), previous)
    curve.getPointAt(Math.min(1, t + 0.006), next)

    // 地下径流贴在山体前侧面，宽度在 XY 平面内展开。
    side.set(-(next.y - previous.y), next.x - previous.x, 0).normalize()
    const halfWidth = lerp(widthStart, widthEnd, t) * 0.5
    const left = point.clone().addScaledVector(side, halfWidth)
    const right = point.clone().addScaledVector(side, -halfWidth)
    left.z += zOffset
    right.z += zOffset
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
    uvs.push(t, 0, t, 1)
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const bedGeometry = geometry.clone()
  const bedPosition = bedGeometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < bedPosition.count; i++) bedPosition.setZ(i, bedPosition.getZ(i) - 0.018)
  bedPosition.needsUpdate = true

  const bed = new THREE.Mesh(
    bedGeometry,
    new THREE.MeshStandardMaterial({ color: 0x53634d, roughness: 0.96, metalness: 0 }),
  )

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      // 与山体地表河流共用同一套水体配色，避免地下河带突兀发白。
      uDeep: { value: new THREE.Color(0x176f8a) },
      uMid: { value: new THREE.Color(0x36aeb8) },
      uShallow: { value: new THREE.Color(0x8bd7c9) },
      uFoam: { value: new THREE.Color(0xdaf6e9) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying vec2 vUv;
      void main() {
        float edgeDistance = min(vUv.y, 1.0 - vUv.y);
        float edgeFade = smoothstep(0.012, 0.075, edgeDistance);
        float depth = smoothstep(0.02, 0.46, edgeDistance);
        float broadFlow = sin(vUv.x * 42.0 - uTime * 3.0 + vUv.y * 5.0) * 0.5 + 0.5;
        float fineFlow = sin(vUv.x * 116.0 - uTime * 5.6 - vUv.y * 13.0) * 0.5 + 0.5;
        float currentLine = smoothstep(0.78, 0.98, broadFlow * 0.68 + fineFlow * 0.32) * depth;
        float bankRipple = sin(vUv.x * 61.0 - uTime * 2.1 + vUv.y * 18.0) * 0.5 + 0.5;
        float foam = (1.0 - smoothstep(0.025, 0.16, edgeDistance))
          * smoothstep(0.54, 0.92, bankRipple) * 0.48;
        vec3 color = mix(uShallow, uMid, depth);
        color = mix(color, uDeep, depth * depth * 0.5);
        color += vec3(0.14, 0.28, 0.27) * currentLine;
        color = mix(color, uFoam, foam);
        float alpha = (0.68 + depth * 0.18 + foam * 0.12) * edgeFade;
        if (alpha < 0.025) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
  riverShaderMaterials.push(material)

  const water = new THREE.Mesh(geometry, material)
  water.renderOrder = 4
  const group = new THREE.Group()
  group.add(bed, water)
  return { mesh: group, material }
}

function createSun() {
  const group = new THREE.Group()
  group.position.copy(SUN_SCENE_POSITION)
  const sunMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb84a,
    emissive: 0xff7b18,
    emissiveIntensity: 2.4,
    roughness: 0.68,
    metalness: 0,
  })
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 40, 28),
    sunMaterial,
  )
  const sunTexture = new THREE.TextureLoader().load(SUN_TEXTURE_URL, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8)
    sunMaterial.map = texture
    sunMaterial.emissiveMap = texture
    sunMaterial.needsUpdate = true
  })
  sunTexture.colorSpace = THREE.SRGBColorSpace
  group.add(core)
  return group
}

function createPitchedHouse(x: number, y: number, z: number, scale = 1) {
  const group = new THREE.Group()
  const width = 1.8 * scale
  const height = 1.2 * scale
  const depth = 1.42 * scale

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0xf2eee3, roughness: 0.9 }),
  )
  body.position.y = height * 0.5
  body.castShadow = true
  group.add(body)

  // 使用真正的双坡屋顶棱柱，而不是四棱锥，屋檐与矩形房体完整贴合。
  const halfW = width * 0.58
  const halfD = depth * 0.58
  const eaveY = height + 0.015 * scale
  const ridgeY = height + 0.62 * scale
  const vertices = new Float32Array([
    -halfW, eaveY, halfD,
    halfW, eaveY, halfD,
    0, ridgeY, halfD,
    -halfW, eaveY, -halfD,
    halfW, eaveY, -halfD,
    0, ridgeY, -halfD,
  ])
  const indices = [
    0, 1, 2,
    5, 4, 3,
    0, 2, 5, 0, 5, 3,
    1, 4, 5, 1, 5, 2,
  ]
  const roofGeo = new THREE.BufferGeometry()
  roofGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  roofGeo.setIndex(indices)
  roofGeo.computeVertexNormals()
  const roof = new THREE.Mesh(
    roofGeo,
    new THREE.MeshStandardMaterial({ color: 0x955238, roughness: 0.86, side: THREE.DoubleSide }),
  )
  roof.castShadow = true
  group.add(roof)

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xbfe8ff,
    emissive: 0x5c9fc0,
    emissiveIntensity: 0.18,
    roughness: 0.32,
  })
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f4e9, roughness: 0.85 })
    ;[-width * 0.27, width * 0.27].forEach((wx) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.36 * scale, 0.42 * scale, 0.035 * scale), frameMaterial)
      frame.position.set(wx, height * 0.62, depth * 0.505)
      group.add(frame)
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.27 * scale, 0.32 * scale), windowMaterial)
      glass.position.set(wx, height * 0.62, depth * 0.525)
      group.add(glass)

      const backFrame = frame.clone()
      backFrame.position.z = -depth * 0.505
      group.add(backFrame)
      const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.27 * scale, 0.32 * scale), windowMaterial)
      backGlass.position.set(wx, height * 0.62, -depth * 0.525)
      backGlass.rotation.y = Math.PI
      group.add(backGlass)
    })

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.36 * scale, 0.66 * scale, 0.04 * scale),
    new THREE.MeshStandardMaterial({ color: 0x79513a, roughness: 0.88 }),
  )
  door.position.set(0, 0.33 * scale, depth * 0.515)
  group.add(door)

  group.position.set(x, y, z)
  return group
}

function createTownBuilding(x: number, y: number, z: number, width: number, height: number, depth: number, color: number) {
  const group = new THREE.Group()
  const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.03 })
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    wallMat,
  )
  body.position.y = height * 0.5
  body.castShadow = true
  group.add(body)

  const roofBase = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.12, 0.14, depth * 1.12),
    new THREE.MeshStandardMaterial({ color: 0x6b7682, roughness: 0.86 }),
  )
  roofBase.position.y = height + 0.07
  group.add(roofBase)
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.68, 0.1, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 }),
  )
  canopy.position.set(0, height * 0.42, depth * 0.60)
  group.add(canopy)


  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xd5f2ff,
    emissive: 0x6ab7d9,
    emissiveIntensity: 0.18,
    roughness: 0.24,
  })
  const rows = Math.max(2, Math.floor(height / 0.55))
  const cols = Math.max(2, Math.floor(width / 0.46))
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = -width * 0.34 + (col / Math.max(1, cols - 1)) * width * 0.68
      const wy = 0.50 + row * ((height - 0.82) / Math.max(1, rows - 1))
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), windowMat)
      win.position.set(wx, wy, depth * 0.505 + 0.006)
      group.add(win)
    }
  }
  ;[-depth * 0.28, depth * 0.28].forEach((sideZ) => {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), windowMat)
    sideWin.position.set(width * 0.505 + 0.006, height * 0.58, sideZ)
    sideWin.rotation.y = -Math.PI / 2
    group.add(sideWin)
    const sideWin2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), windowMat)
    sideWin2.position.set(-width * 0.505 - 0.006, height * 0.58, sideZ)
    sideWin2.rotation.y = Math.PI / 2
    group.add(sideWin2)
  })

  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x556273, roughness: 0.8 }),
  )
  door.position.set(0, 0.30, depth * 0.507 + 0.008)
  group.add(door)

  group.position.set(x, y, z)
  return group
}


function createUrbanBuildingVariant(
  variant: number,
  width: number,
  height: number,
  depth: number,
  color: number,
) {
  const group = new THREE.Group()
  const wallMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: 0.06,
  })
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.68),
    roughness: 0.82,
    metalness: 0.03,
  })
  const windowMaterial = new THREE.MeshBasicMaterial({
    color: variant % 2 === 0 ? 0xffe8a8 : 0xa9ddff,
    transparent: true,
    opacity: 0.82,
  })

  const addFrontWindows = (targetWidth: number, targetHeight: number, frontZ: number, centerX = 0, baseY = 0) => {
    const rows = Math.max(2, Math.floor(targetHeight / 0.58))
    const cols = Math.max(2, Math.floor(targetWidth / 0.42))
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = centerX - targetWidth * 0.34 + (col / Math.max(1, cols - 1)) * targetWidth * 0.68
        const y = baseY + 0.46 + row * Math.max(0.42, (targetHeight - 0.78) / Math.max(1, rows - 1))
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.21), windowMaterial)
        win.position.set(x, y, frontZ + 0.008)
        group.add(win)
      }
    }
  }

  const type = variant % 4
  if (type === 0) {
    // 现代矩形塔楼。
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial)
    body.position.y = height * 0.5
    body.castShadow = true
    group.add(body)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(width * 1.08, 0.16, depth * 1.08), roofMaterial)
    cap.position.y = height + 0.08
    group.add(cap)
    addFrontWindows(width, height, depth * 0.5)
  } else if (type === 1) {
    // 上窄下宽的阶梯式住宅。
    const lowerH = height * 0.58
    const lower = new THREE.Mesh(new THREE.BoxGeometry(width * 1.14, lowerH, depth * 1.08), wallMaterial)
    lower.position.y = lowerH * 0.5
    lower.castShadow = true
    group.add(lower)
    const upperH = height - lowerH
    const upper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, upperH, depth * 0.78), wallMaterial)
    upper.position.set(-width * 0.12, lowerH + upperH * 0.5, -depth * 0.04)
    upper.castShadow = true
    group.add(upper)
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(width * 1.2, 0.10, depth * 1.14), roofMaterial)
    terrace.position.y = lowerH + 0.05
    group.add(terrace)
    addFrontWindows(width * 1.14, lowerH, depth * 0.54)
    addFrontWindows(width * 0.72, upperH, depth * 0.35, -width * 0.12, lowerH)
  } else if (type === 2) {
    // 圆柱形办公塔楼。
    const radius = Math.max(width, depth) * 0.48
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, height, 24), wallMaterial)
    body.position.y = height * 0.5
    body.castShadow = true
    group.add(body)
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.92, 0.28, 24), roofMaterial)
    crown.position.y = height + 0.14
    group.add(crown)
    for (let row = 0; row < Math.max(3, Math.floor(height / 0.58)); row++) {
      for (let col = 0; col < 7; col++) {
        const angle = -Math.PI * 0.78 + (col / 6) * Math.PI * 1.56
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.20), windowMaterial)
        win.position.set(
          Math.sin(angle) * (radius + 0.012),
          0.5 + row * 0.56,
          Math.cos(angle) * (radius + 0.012),
        )
        win.rotation.y = angle
        group.add(win)
      }
    }
  } else {
    // 带彩色斜屋顶的中层住宅。
    const bodyH = height * 0.78
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyH, depth), wallMaterial)
    body.position.y = bodyH * 0.5
    body.castShadow = true
    group.add(body)
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.72, height * 0.28, 4),
      roofMaterial,
    )
    roof.rotation.y = Math.PI * 0.25
    roof.scale.z = depth / width
    roof.position.y = bodyH + height * 0.14
    roof.castShadow = true
    group.add(roof)
    addFrontWindows(width, bodyH, depth * 0.5)
  }

  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.50),
    new THREE.MeshStandardMaterial({ color: 0x49525d, roughness: 0.86 }),
  )
  door.position.set(0, 0.25, depth * 0.51 + 0.01)
  group.add(door)
  return group
}

function createTree(x: number, y: number, z: number, scale = 1, color = 0x1e8d5d) {
  const group = new THREE.Group()
  const trunkHeight = 0.34 * scale
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07 * scale, 0.09 * scale, trunkHeight, 8),
    new THREE.MeshStandardMaterial({ color: 0x5d3b24, roughness: 0.86 }),
  )
  trunk.position.y = trunkHeight * 0.5
  trunk.castShadow = true
  group.add(trunk)

  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry((0.34 - i * 0.055) * scale, 0.43 * scale, 12),
      new THREE.MeshStandardMaterial({ color: i === 0 ? color : color + i * 0x050505, roughness: 0.8 }),
    )
    crown.position.y = (0.48 + i * 0.17) * scale
    crown.castShadow = true
    group.add(crown)
  }
  group.position.set(x, y, z)
  return group
}

function createLandSideShaderMaterial(infiltrationLevel: number) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLevel: { value: infiltrationLevel },
      uTime: { value: 0 },
      uSoil: { value: new THREE.Color(0x765238) },
      uSoilLight: { value: new THREE.Color(0xa17650) },
      uWater: { value: new THREE.Color(0x249ee5) },
      uWaterBright: { value: new THREE.Color(0x78d8ff) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uLevel;
      uniform float uTime;
      uniform vec3 uSoil;
      uniform vec3 uSoilLight;
      uniform vec3 uWater;
      uniform vec3 uWaterBright;
      varying vec2 vUv;

      void main() {
        float depth = 1.0 - vUv.y;
        float sideVariation = 0.035 * sin(vUv.x * 8.0 + uTime * 0.18)
                            + 0.018 * sin(vUv.x * 17.0 - uTime * 0.11);
        float penetrationDepth = mix(0.30, 0.72, uLevel) + sideVariation;

        // 蓝色下渗区域横向覆盖整个侧面，只让边界有轻微自然起伏。
        float wetMask = 1.0 - smoothstep(
          penetrationDepth - 0.055,
          penetrationDepth + 0.055,
          depth
        );

        // 底部含水层同样横向贯穿整个侧面。
        float aquiferMask = smoothstep(0.79, 0.93, depth);
        float slowPulse = 0.93 + 0.07 * sin(uTime * 0.85 - depth * 5.0);

        vec3 soilColor = mix(uSoil, uSoilLight, 0.12 + vUv.y * 0.18);
        vec3 wetColor = mix(uWater, uWaterBright, 0.24 + 0.12 * sin(vUv.x * 5.0 + uTime * 0.35));
        vec3 color = mix(soilColor, wetColor, wetMask * 0.70 * slowPulse);
        color = mix(color, uWaterBright, aquiferMask * (0.20 + uLevel * 0.28));

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  })
  material.toneMapped = false
  landSideShaderMaterials.push(material)
  return material
}

function coastXAt(z: number) {
  return 8.0 + Math.sin(z * 0.52) * 0.58 + Math.sin(z * 1.27 + 0.6) * 0.24
}

function createCurvedOceanGeometry(rightX: number, depth: number, segX: number, segZ: number) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let zi = 0; zi <= segZ; zi++) {
    const z = -depth * 0.5 + (zi / segZ) * depth
    const coast = coastXAt(z) + 0.12
    for (let xi = 0; xi <= segX; xi++) {
      const u = xi / segX
      const x = lerp(coast, rightX, u)
      positions.push(x, -z, 0)
      uvs.push(u, zi / segZ)
    }
  }
  for (let zi = 0; zi < segZ; zi++) {
    for (let xi = 0; xi < segX; xi++) {
      const a = zi * (segX + 1) + xi
      const b = a + 1
      const c = a + (segX + 1)
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createCurvedCoastline(depth: number) {
  const group = new THREE.Group()
  const segments = 90
  const positions: number[] = []
  const colors: number[] = []
  const colorInner = new THREE.Color(0xd0b184)
  const colorOuter = new THREE.Color(0x9ac8c9)
  const foamPoints: THREE.Vector3[] = []

  for (let i = 0; i <= segments; i++) {
    const z = -depth * 0.5 + (i / segments) * depth
    const centerX = coastXAt(z)
    positions.push(centerX - 0.72, 0.205, z, centerX + 0.38, 0.205, z)
    colors.push(colorInner.r, colorInner.g, colorInner.b, colorOuter.r, colorOuter.g, colorOuter.b)
    foamPoints.push(new THREE.Vector3(centerX + 0.28, 0.245, z))
  }
  const indices: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const sand = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0.01, side: THREE.DoubleSide }),
  )
  group.add(sand)

  const foamCurve = new THREE.CatmullRomCurve3(foamPoints, false, 'centripetal', 0.5)
  const foam = new THREE.Mesh(
    new THREE.TubeGeometry(foamCurve, 180, 0.055, 8, false),
    new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.82, depthWrite: false }),
  )
  foam.scale.y = 0.35
  group.add(foam)
  return group
}

function buildSeaLandScene(root: THREE.Group) {
  const sceneDepth = 20
  const { group: landGroup, data: landData } = buildDeformedLandBox(26, sceneDepth, 132, 72)
  root.add(landGroup)

  const oceanBase = new THREE.Mesh(
    new THREE.BoxGeometry(18, 6.0, sceneDepth),
    new THREE.MeshStandardMaterial({ color: 0x213549, roughness: 1, metalness: 0.02 }),
  )
  oceanBase.position.set(17, -3.0, 0)
  root.add(oceanBase)
  const oceanCap = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.14, sceneDepth),
    new THREE.MeshStandardMaterial({ color: 0x415e73, roughness: 0.95 }),
  )
  oceanCap.position.set(17, 0.02, 0)
  root.add(oceanCap)

  seaWater = new Water(createCurvedOceanGeometry(26, sceneDepth, 72, 60), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: createWaterNormalsTexture(),
    sunDirection: SUN_SCENE_POSITION.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: 0x2f7fb2,
    distortionScale: 2.6,
    fog: false,
  })
  seaWater.rotation.x = -Math.PI / 2
  seaWater.position.set(0, 0.16, 0)
  root.add(seaWater)
  root.add(createCurvedCoastline(sceneDepth))
  root.add(createSun())

  const clouds = [
    createCloud(new THREE.Vector3(-10.6, 11.05, -1.1), 1.05),
    createCloud(new THREE.Vector3(6.2, 10.75, 0.5), 0.9),
    createCloud(new THREE.Vector3(17.4, 10.15, 0.65), 1.08),
  ]
  clouds.forEach((cloud) => root.add(cloud))

  const forestPositions: [number, number][] = [
    [0.2, 4.4], [0.8, 5.8], [1.2, 7.1], [1.8, 3.9], [2.2, 5.2], [2.8, 6.7],
    [3.2, 4.6], [3.8, 5.9], [4.2, 7.4], [0.6, 7.9], [2.4, 8.1], [4.6, 8.0],
  ]
  forestPositions.forEach(([x, z], idx) => {
    const y = terrainYAt(landData, x, z)
    if (y < 0.3 || x > 5.0) return
    root.add(createTree(x, y, z, 0.76 + (idx % 3) * 0.06, idx % 2 === 0 ? 0x0d8155 : 0x178f62))
  })
  const extraLandTrees: [number, number, number, number][] = [
    [-8.9, -2.4, 0.82, 0x167f57], [-8.1, 0.2, 0.86, 0x11855b], [-7.2, 2.6, 0.92, 0x1a8f63],
    [-6.2, -2.8, 0.78, 0x0f7a53], [-5.6, 0.9, 0.84, 0x16865b], [-4.8, 2.8, 0.88, 0x1b9362],
    [-3.4, 3.0, 0.8, 0x157f57], [-1.8, 2.7, 0.78, 0x178a5e], [4.8, 2.4, 0.74, 0x178a5e],
    [5.2, 4.0, 0.78, 0x1b9362], [5.1, -0.4, 0.72, 0x15875b], [4.6, -2.2, 0.74, 0x1d8f63],
  ]
  extraLandTrees.forEach(([x, z, s, c]) => {
    const y = terrainYAt(landData, x, z)
    if (y < 0.28) return
    root.add(createTree(x, y, z, s, c))
  })

  // 平原建筑移到河流另一侧，并补充窗户、门和屋顶细节。
  const town = new THREE.Group()
  const townDefs: [number, number, number, number, number, number][] = [
    [2.6, 6.9, 1.26, 2.00, 1.10, 0xf4dfcc],
    [5.0, 6.2, 1.30, 2.20, 1.12, 0xd8e9f6],
    [7.2, 7.0, 1.18, 1.92, 1.04, 0xf6e7d6],
    [3.5, 3.5, 1.22, 1.90, 1.04, 0xdfe8d1],
    [6.2, 3.9, 1.24, 2.05, 1.08, 0xebdfef],
  ]
  townDefs.forEach(([x, z, w, h, d, color]) => {
    const y = terrainYAt(landData, x, z) + 0.03
    const building = createTownBuilding(x, y, z, w, h, d, color)
    // 窗户默认位于建筑局部 +Z 面；旋转 90° 后统一朝向东侧海洋。
    building.rotation.y = Math.PI / 2
    town.add(building)
  })
  root.add(town)

  // 河道只用 x/z 描述走向；纵向高程由下游约束的河床剖面统一生成。
  const riverMouthZ = -2.55
  const riverMouthX = coastXAt(riverMouthZ) - 0.30
  const mainRiverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-11.9, 0, -0.55),
    new THREE.Vector3(-10.9, 0, -1.1),
    new THREE.Vector3(-9.8, 0, -1.8),
    new THREE.Vector3(-8.6, 0, -2.45),
    new THREE.Vector3(-7.5, 0, -2.95),
    new THREE.Vector3(-6.9, 0, -3.0),
    new THREE.Vector3(-4.5, 0, -3.6),
    new THREE.Vector3(-1.7, 0, -3.1),
    new THREE.Vector3(1.4, 0, -3.7),
    new THREE.Vector3(2.8, 0, -4.2),
    new THREE.Vector3(4.6, 0, -4.0),
    new THREE.Vector3(5.8, 0, -3.55),
    new THREE.Vector3(riverMouthX, 0, riverMouthZ),
  ], false, 'centripetal', 0.5)
  const branchRiverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-11.3, 0, 0.5),
    new THREE.Vector3(-10.5, 0, 1.3),
    new THREE.Vector3(-9.5, 0, 2.35),
    new THREE.Vector3(-8.1, 0, 3.65),
    new THREE.Vector3(-6.1, 0, 4.9),
    new THREE.Vector3(-3.5, 0, 6.1),
    new THREE.Vector3(-0.8, 0, 7.2),
    new THREE.Vector3(1.2, 0, 8.0),
    new THREE.Vector3(2.3, 0, 8.75),
    new THREE.Vector3(2.6, 0, 8.96),
  ], false, 'centripetal', 0.5)

  const mainRiverSurface = carveDownhillRiverChannel(landData, mainRiverCurve, 0.32, 0.70)
  const branchRiverSurface = carveDownhillRiverChannel(landData, branchRiverCurve, 0.22, 0.56)
  syncTerrainSurfaceGeometry(landData)

  const { mesh: river, flowCurve: mainRiverFlowCurve } = createSurfaceRiverRibbon(
    mainRiverCurve,
    0.32,
    0.70,
    (x, z) => terrainYAt(landData, x, z),
    mainRiverSurface,
    false,
  )
  root.add(river)
  const { mesh: branchRiver, flowCurve: branchRiverFlowCurve } = createSurfaceRiverRibbon(
    branchRiverCurve,
    0.22,
    0.56,
    (x, z) => terrainYAt(landData, x, z),
    branchRiverSurface,
    false,
  )
  root.add(branchRiver)
  const riverFlowArrow = createDynamicCurveArrow('runoff', 'seaLand', mainRiverFlowCurve, {
    colorA: 0x43b7c2,
    colorB: 0xc5f0e8,
    radius: 0.016,
    rate: 0.24,
    headScale: 0.48,
  })
  const branchRiverFlowArrow = createDynamicCurveArrow('runoff', 'seaLand', branchRiverFlowCurve, {
    colorA: 0x43b7c2,
    colorB: 0xc5f0e8,
    radius: 0.013,
    rate: 0.22,
    headScale: 0.44,
  })
  root.add(riverFlowArrow, branchRiverFlowArrow)
  registerToggle('runoff', river)
  registerToggle('runoff', branchRiver)
  const runoffLabel = new THREE.Object3D()
  runoffLabel.position.set(1.1, terrainYAt(landData, 1.1, -3.5) + 0.65, -3.5)
  root.add(runoffLabel)
  registerLabel('runoff-sea', 'runoff', '地表径流', 'lbl-runoff', runoffLabel, ['seaLand'])

  // 海陆间场景拆分为三个循环：海洋内循环、海陆间循环、陆地内循环。
  const oceanInnerJunction = new THREE.Vector3(20.2, 9.3, 0.95)
  const seaLandJunction = new THREE.Vector3(14.7, 9.4, -1.05)
  const seaCloudCenter = new THREE.Vector3(17.4, 10.0, 0.65)
  const snowJunction = new THREE.Vector3(-10.6, 10.95, -0.95)
  const landVaporHub = new THREE.Vector3(2.2, 8.05, 5.75)
  const inlandCloudCenter = new THREE.Vector3(-3.6, 9.7, 5.95)
  root.add(createCloud(new THREE.Vector3(-3.6, 10.0, 5.95), 0.92))

  // 海洋内循环：海洋蒸发 -> 海上水汽输送 -> 海上降水
  const oceanInnerEvapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(20.3, 0.55, 0.95),
    new THREE.Vector3(20.3, 3.55, 0.95),
    new THREE.Vector3(20.3, 6.65, 0.98),
    oceanInnerJunction.clone(),
  ], false, 'centripetal', 0.5)
  const oceanInternalTransportCurve = new THREE.CatmullRomCurve3([
    oceanInnerJunction.clone(),
    new THREE.Vector3(19.4, 9.75, 0.86),
    new THREE.Vector3(18.2, 9.98, 0.74),
    seaCloudCenter.clone(),
  ], false, 'centripetal', 0.5)

  // 海陆间循环：独立的海洋蒸发 -> 水汽输送到雪山 -> 雪山降水
  const seaLandEvapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(14.7, 0.55, -1.05),
    new THREE.Vector3(14.75, 3.7, -1.05),
    new THREE.Vector3(14.9, 6.9, -1.02),
    seaLandJunction.clone(),
  ], false, 'centripetal', 0.5)
  const seaLandTransportCurve = new THREE.CatmullRomCurve3([
    seaLandJunction.clone(),
    new THREE.Vector3(12.6, 10.65, -0.82),
    new THREE.Vector3(8.8, 11.15, -0.36),
    new THREE.Vector3(4.8, 10.8, 0.06),
    new THREE.Vector3(1.2, 10.15, 0.35),
    new THREE.Vector3(-3.0, 9.95, 0.45),
    new THREE.Vector3(-6.0, 10.05, 0.15),
    new THREE.Vector3(-8.4, 10.45, -0.22),
    new THREE.Vector3(-9.7, 10.72, -0.58),
    snowJunction.clone(),
  ], false, 'centripetal', 0.5)

  // 陆地内循环：植物蒸腾 -> 朝内陆输送 -> 内陆降水（不朝海洋）
  const landEvapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.8, terrainYAt(landData, 5.8, 5.4) + 0.35, 5.4),
    new THREE.Vector3(5.6, terrainYAt(landData, 5.6, 5.4) + 2.6, 5.45),
    new THREE.Vector3(4.8, 6.1, 5.55),
    new THREE.Vector3(3.2, 7.25, 5.65),
    landVaporHub.clone(),
  ], false, 'centripetal', 0.5)
  const transpCurveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.0, terrainYAt(landData, 1.0, 4.8) + 0.85, 4.8),
    new THREE.Vector3(1.15, terrainYAt(landData, 1.15, 4.8) + 2.8, 4.95),
    new THREE.Vector3(1.55, 6.2, 5.2),
    landVaporHub.clone(),
  ], false, 'centripetal', 0.5)
  const transpCurveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.2, terrainYAt(landData, 2.2, 6.8) + 0.85, 6.8),
    new THREE.Vector3(2.3, terrainYAt(landData, 2.3, 6.8) + 2.9, 6.7),
    new THREE.Vector3(2.35, 6.5, 6.35),
    landVaporHub.clone(),
  ], false, 'centripetal', 0.5)
  const transpCurveC = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.7, terrainYAt(landData, 3.7, 7.9) + 0.85, 7.9),
    new THREE.Vector3(3.6, terrainYAt(landData, 3.6, 7.9) + 2.7, 7.55),
    new THREE.Vector3(3.2, 6.2, 6.8),
    landVaporHub.clone(),
  ], false, 'centripetal', 0.5)
  const landInternalTransportCurve = new THREE.CatmullRomCurve3([
    landVaporHub.clone(),
    new THREE.Vector3(0.8, 8.55, 5.95),
    new THREE.Vector3(-1.0, 9.0, 6.05),
    new THREE.Vector3(-2.4, 9.35, 6.0),
    inlandCloudCenter.clone(),
  ], false, 'centripetal', 0.5)

  root.add(createSmokeFlow('evaporation', 'seaLand', oceanInnerEvapCurve, 0xff715b, 16, 1.02, 0.18, 0xeaf6ff))
  root.add(createSmokeFlow('transport', 'seaLand', oceanInternalTransportCurve, 0xeaf6ff, 22, 0.96, 0.20))
  root.add(createSmokeFlow('evaporation', 'seaLand', seaLandEvapCurve, 0xff715b, 17, 1.06, 0.19, 0xeaf6ff))
  root.add(createSmokeFlow('transport', 'seaLand', seaLandTransportCurve, 0xeaf6ff, 40, 1.18, 0.22))
  root.add(createSmokeFlow('evaporation', 'seaLand', landEvapCurve, 0xff8a72, 14, 0.88, 0.18, 0xeaf6ff))
  root.add(createSmokeFlow('transpiration', 'seaLand', transpCurveA, 0xeaf6ff, 16, 0.92, 0.20))
  root.add(createSmokeFlow('transpiration', 'seaLand', transpCurveB, 0xeaf6ff, 14, 0.84, 0.20))
  root.add(createSmokeFlow('transpiration', 'seaLand', transpCurveC, 0xeaf6ff, 14, 0.84, 0.20))
  root.add(createSmokeFlow('transport', 'seaLand', landInternalTransportCurve, 0xeaf6ff, 24, 0.96, 0.20))

  const evapArrowsSeaInner = createArrowEmitter('evaporation', 'seaLand', new THREE.Vector3(20.08, 0.65, 1.05), new THREE.Vector3(20.22, 8.6, 1.05), 5, 0.76, 0.29, true)
  const evapArrowsSeaLand = createArrowEmitter('evaporation', 'seaLand', new THREE.Vector3(14.52, 0.65, -0.82), new THREE.Vector3(14.65, 8.75, -0.82), 5, 0.76, 0.30, true)
  root.add(evapArrowsSeaInner, evapArrowsSeaLand)
  const evapLabelSeaInner = new THREE.Object3D()
  evapLabelSeaInner.position.set(21.1, 4.2, 1.15)
  root.add(evapLabelSeaInner)
  registerLabel('evap-sea-inner', 'evaporation', '海洋蒸发', 'lbl-evap', evapLabelSeaInner, ['seaLand'])
  const evapLabelSeaLand = new THREE.Object3D()
  evapLabelSeaLand.position.set(15.6, 4.35, -1.45)
  root.add(evapLabelSeaLand)
  registerLabel('evap-sea-land', 'evaporation', '海洋蒸发', 'lbl-evap', evapLabelSeaLand, ['seaLand'])

  const landEvapArrows = createArrowEmitter('evaporation', 'seaLand', new THREE.Vector3(5.45, terrainYAt(landData, 5.45, 5.35) + 0.35, 5.35), new THREE.Vector3(3.3, 7.55, 5.6), 4, 0.62, 0.25, true)
  const transpArrowsA = createArrowEmitter('transpiration', 'seaLand', new THREE.Vector3(1.05, terrainYAt(landData, 1.05, 4.8) + 0.8, 4.85), new THREE.Vector3(1.95, 7.1, 5.45), 4, 0.62, 0.28, true)
  const transpArrowsB = createArrowEmitter('transpiration', 'seaLand', new THREE.Vector3(2.25, terrainYAt(landData, 2.25, 6.8) + 0.8, 6.75), new THREE.Vector3(2.3, 7.2, 6.0), 4, 0.60, 0.28, true)
  const transpArrowsC = createArrowEmitter('transpiration', 'seaLand', new THREE.Vector3(3.75, terrainYAt(landData, 3.75, 7.9) + 0.8, 7.85), new THREE.Vector3(2.9, 7.1, 6.45), 4, 0.60, 0.28, true)
  root.add(landEvapArrows, transpArrowsA, transpArrowsB, transpArrowsC)
  const landEvapLabel = new THREE.Object3D()
  landEvapLabel.position.set(5.2, 4.9, 5.3)
  root.add(landEvapLabel)
  registerLabel('evap-land', 'evaporation', '蒸发', 'lbl-evap', landEvapLabel, ['seaLand'])
  const transpLabelA = new THREE.Object3D()
  transpLabelA.position.set(1.0, 4.8, 4.85)
  root.add(transpLabelA)
  registerLabel('transp-sea-a', 'transpiration', '植物蒸腾', 'lbl-tran', transpLabelA, ['seaLand'])
  const transpLabelB = new THREE.Object3D()
  transpLabelB.position.set(2.25, 5.0, 6.75)
  root.add(transpLabelB)
  registerLabel('transp-sea-b', 'transpiration', '植物蒸腾', 'lbl-tran', transpLabelB, ['seaLand'])
  const transpLabelC = new THREE.Object3D()
  transpLabelC.position.set(3.7, 4.9, 7.85)
  root.add(transpLabelC)
  registerLabel('transp-sea-c', 'transpiration', '植物蒸腾', 'lbl-tran', transpLabelC, ['seaLand'])

  const seaTransportLabel = new THREE.Object3D()
  seaTransportLabel.position.set(18.5, 9.85, 0.9)
  root.add(seaTransportLabel)
  registerLabel('transport-sea-inner', 'transport', '水汽输送', 'lbl-trans', seaTransportLabel, ['seaLand'])
  const seaLandTransportLabel = new THREE.Object3D()
  seaLandTransportLabel.position.set(-8.0, 10.55, -0.05)
  root.add(seaLandTransportLabel)
  registerLabel('transport-sea-land', 'transport', '水汽输送', 'lbl-trans', seaLandTransportLabel, ['seaLand'])
  const landTransportLabel = new THREE.Object3D()
  landTransportLabel.position.set(-1.5, 9.15, 6.1)
  root.add(landTransportLabel)
  registerLabel('transport-land-inner', 'transport', '水汽输送', 'lbl-trans', landTransportLabel, ['seaLand'])

  const rainSnow = createRainSystem('precipitation', 'seaLand', -10.6, -1.0, 10.8, 1.2, 1.8, 2.4, 18)
  const rainLand = createRainSystem('precipitation', 'seaLand', -3.6, 5.95, 9.85, 2.0, 2.6, 2.4, 20)
  const rainSea = createRainSystem('precipitation', 'seaLand', 17.4, 0.65, 9.95, 1.0, 1.8, 2.0, 16)
  root.add(rainSnow, rainLand, rainSea)

  const snowPulseY = terrainYAt(landData, -10.2, -0.75) + 0.08
  const inlandPulseY = terrainYAt(landData, -3.6, 5.95) + 0.08
  createInfiltrationPulseCluster(root, 'seaLand', new THREE.Vector3(-10.2, snowPulseY, -0.75), 0.92, 31)
  createInfiltrationPulseCluster(root, 'seaLand', new THREE.Vector3(-3.6, inlandPulseY, 5.95), 1.15, 67)
  const rainLabelSnow = new THREE.Object3D()
  rainLabelSnow.position.set(-10.8, 8.2, -0.9)
  root.add(rainLabelSnow)
  registerLabel('rain-snow', 'precipitation', '雪山降水', 'lbl-prec', rainLabelSnow, ['seaLand'])
  const rainLabel1 = new THREE.Object3D()
  rainLabel1.position.set(-3.6, 7.4, 5.95)
  root.add(rainLabel1)
  registerLabel('rain-land', 'precipitation', '内陆降水', 'lbl-prec', rainLabel1, ['seaLand'])
  const rainLabel2 = new THREE.Object3D()
  rainLabel2.position.set(17.4, 5.0, 0.65)
  root.add(rainLabel2)
  registerLabel('rain-sea', 'precipitation', '海上降水', 'lbl-prec', rainLabel2, ['seaLand'])

  const sideFrontZ = landData.zMax + 0.10
    ;[-8.4, -3.2, 2.0].forEach((x) => {
      const startY = Math.max(0.95, terrainYAt(landData, x, landData.zMax) - 0.12)
      const start = new THREE.Vector3(x, startY, sideFrontZ + 0.05)
      const end = new THREE.Vector3(x, -3.2, sideFrontZ + 0.05)
      root.add(createArrowEmitter('infiltration', 'seaLand', start, end, 4, 0.92, 0.18, false, [0, 0, Math.PI]))
    })
  const infLabel = new THREE.Object3D()
  infLabel.position.set(-3.2, 0.65, sideFrontZ + 0.18)
  root.add(infLabel)
  registerLabel('inf-sea', 'infiltration', '山体下渗', 'lbl-inf', infLabel, ['seaLand'])

    ;[-10.8, -5.6, -0.8, 4.8].forEach((x) => {
      const start = new THREE.Vector3(x, -2.95, sideFrontZ + 0.08)
      const end = new THREE.Vector3(x, -0.35, sideFrontZ + 0.08)
      root.add(createArrowEmitter('groundwater', 'seaLand', start, end, 4, 0.86, 0.16, false, [0, Math.PI, 0]))
    })
  const rechargeLabel = new THREE.Object3D()
  rechargeLabel.position.set(-1.1, 0.15, sideFrontZ + 0.22)
  root.add(rechargeLabel)
  registerLabel('recharge-sea', 'groundwater', '补给', 'lbl-gw', rechargeLabel, ['seaLand'])

  // 地下径流沿含水层由高水头向海侧低水头缓慢流动：连续水带表达含水层，箭头表达方向。
  const groundwaterPath = [
    new THREE.Vector3(-12.8, -1.78, sideFrontZ + 0.06),
    new THREE.Vector3(-6.5, -1.91, sideFrontZ + 0.06),
    new THREE.Vector3(-0.4, -2.08, sideFrontZ + 0.06),
    new THREE.Vector3(5.2, -2.30, sideFrontZ + 0.06),
    new THREE.Vector3(8.8, -2.48, sideFrontZ + 0.06),
  ]
  const groundwaterCurve = new THREE.CatmullRomCurve3(groundwaterPath, false, 'centripetal', 0.5)
  const { mesh: groundwaterBand } = createSideRiverRibbon(groundwaterCurve, 0.22, 0.30, 0.018)
  root.add(groundwaterBand)
  registerToggle('groundwater', groundwaterBand)
  for (let i = 0; i < groundwaterPath.length - 1; i++) {
    const start = groundwaterPath[i]!
    const end = groundwaterPath[i + 1]!
    const angle = Math.atan2(end.y - start.y, end.x - start.x) - Math.PI * 0.5
    root.add(createArrowEmitter(
      'groundwater',
      'seaLand',
      start,
      end,
      2,
      0.48,
      0.12,
      false,
      [0, 0, angle],
    ))
  }
  const gwLabel = new THREE.Object3D()
  gwLabel.position.set(2.2, -2.06, sideFrontZ + 0.24)
  root.add(gwLabel)
  registerLabel('gw-sea', 'groundwater', '地下河带', 'lbl-gw', gwLabel, ['seaLand'])

  const oceanLabel = new THREE.Object3D()
  oceanLabel.position.set(15.9, 0.75, -2.5)
  root.add(oceanLabel)
  registerLabel('ocean-sea', '', '海洋', 'lbl-ocean', oceanLabel, ['seaLand'])
}

function createLandBase(width: number, depth: number, infiltrationLevel: number, sceneKey: SceneKey) {
  const root = new THREE.Group()
  const sideMaterial = createLandSideShaderMaterial(infiltrationLevel)
  const topMaterial = new THREE.MeshStandardMaterial({ color: 0x806044, roughness: 0.98 })
  const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x26374b, roughness: 1 })
  const materials: THREE.Material[] = [
    sideMaterial,
    sideMaterial,
    topMaterial,
    bottomMaterial,
    sideMaterial,
    sideMaterial,
  ]
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 4.6, depth, 1, 28, 1), materials)
  base.position.y = -2.2
  base.receiveShadow = true
  root.add(base)
  registerTerrainOccluder(base, [sceneKey])

  // Box 顶面位于 y=0.1；草地只抬高几毫米并带有极轻微起伏，不再悬空。
  const topGeo = new THREE.PlaneGeometry(width - 0.02, depth - 0.02, 64, 44)
  topGeo.rotateX(-Math.PI / 2)
  const pos = topGeo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const h = 0.004 + fbm(x * 0.22, z * 0.25, 3) * 0.006
    pos.setY(i, h)
  }
  topGeo.computeVertexNormals()
  const grassTexture = createGrassTexture()
  grassTexture.repeat.set(Math.max(4, width / 3.5), Math.max(3, depth / 3.5))
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grassTexture,
    bumpMap: grassTexture,
    bumpScale: 0.018,
    roughness: 0.98,
    metalness: 0,
  })
  const top = new THREE.Mesh(topGeo, grassMaterial)
  top.receiveShadow = true
  top.position.y = 0.104
  root.add(top)
  registerTerrainOccluder(top, [sceneKey])
  return root
}

function addInfiltrationPatches(root: THREE.Group, width: number, depth: number, count: number, seed = 0) {
  for (let i = 0; i < count; i++) {
    const rx = (hash2(seed + i * 1.37, 4.9) - 0.5) * (width - 3)
    const rz = (hash2(seed + i * 1.91, 9.2) - 0.5) * (depth - 3)
    const sx = 0.55 + hash2(seed + i * 1.7, 6.4) * 0.9
    const sz = 0.35 + hash2(seed + i * 2.3, 7.7) * 0.75
    const plane = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 7),
      new THREE.MeshStandardMaterial({ color: 0x7fdfff, transparent: true, opacity: 0.35, roughness: 0.35, metalness: 0.02 }),
    )
    plane.rotation.x = -Math.PI / 2
    plane.rotation.z = hash2(seed + i * 0.77, 3.2) * Math.PI
    plane.scale.set(sx, sz, 1)
    plane.position.set(rx, 0.121 + i * 0.0004, rz)
    root.add(plane)
  }
}

function createRuralPath(points: THREE.Vector3[]) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, 0.34, 10, false),
    new THREE.MeshStandardMaterial({ color: 0xd7bf9d, roughness: 0.98, metalness: 0 }),
  )
  mesh.scale.y = 0.12
  mesh.position.y = 0.06
  return mesh
}


function addPlanarInfiltrationEmitter(
  root: THREE.Group,
  sceneKey: SceneKey,
  start: THREE.Vector3,
  end: THREE.Vector3,
  count: number,
  scale: number,
  moveSpeed: number,
) {
  const isFrontBack = Math.abs(start.z) >= Math.abs(start.x)
  const fixedRotation: [number, number, number] = isFrontBack
    ? [0, start.z >= 0 ? 0 : Math.PI, Math.PI]
    : [0, start.x >= 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI]
  const emitter = createArrowEmitter('infiltration', sceneKey, start, end, count, scale, moveSpeed, false, fixedRotation)
  root.add(emitter)
}

function addLandBaseInfiltrationArrows(
  root: THREE.Group,
  sceneKey: SceneKey,
  width: number,
  depth: number,
  mode: LandUrbanMode,
) {
  const arrowCount = mode === 'before' ? 5 : 4
  const moveSpeed = mode === 'before' ? 0.18 : 0.16
  const scale = mode === 'before' ? 0.92 : 0.84
  const startY = 0.45
  const endY = mode === 'before' ? -2.7 : -2.2

  for (let i = 0; i < arrowCount; i++) {
    const ratio = (i + 1) / (arrowCount + 1)
    const x = -width * 0.5 + ratio * width
    addPlanarInfiltrationEmitter(root, sceneKey, new THREE.Vector3(x, startY, depth * 0.5 + 0.12), new THREE.Vector3(x, endY, depth * 0.5 + 0.12), 3, scale, moveSpeed)
    addPlanarInfiltrationEmitter(root, sceneKey, new THREE.Vector3(x, startY, -depth * 0.5 - 0.12), new THREE.Vector3(x, endY, -depth * 0.5 - 0.12), 3, scale, moveSpeed)
  }

  for (let i = 0; i < arrowCount; i++) {
    const ratio = (i + 1) / (arrowCount + 1)
    const z = -depth * 0.5 + ratio * depth
    addPlanarInfiltrationEmitter(root, sceneKey, new THREE.Vector3(-width * 0.5 - 0.12, startY, z), new THREE.Vector3(-width * 0.5 - 0.12, endY, z), 3, scale, moveSpeed)
    addPlanarInfiltrationEmitter(root, sceneKey, new THREE.Vector3(width * 0.5 + 0.12, startY, z), new THREE.Vector3(width * 0.5 + 0.12, endY, z), 3, scale, moveSpeed)
  }
}

function createBillboardTexture(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  bg.addColorStop(0, 'rgba(6,24,44,0.96)')
  bg.addColorStop(1, 'rgba(10,36,72,0.96)')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 10
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24)

  const grad = ctx.createLinearGradient(60, 0, 452, 0)
  grad.addColorStop(0, '#2ec4b6')
  grad.addColorStop(1, '#247cff')
  ctx.fillStyle = grad
  ctx.font = 'bold 70px Microsoft YaHei, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createSceneBillboard(mode: LandUrbanMode) {
  const group = new THREE.Group()
  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 6.2, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x7e8da1, roughness: 0.84 }),
  )
  pole.position.y = 3.1
  group.add(pole)
  const frontTex = createBillboardTexture(mode === 'before' ? '城镇化前' : '城镇化后')
  const backTex = createBillboardTexture('智地有申')
  const front = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: frontTex, transparent: true }))
  front.position.set(0, 7.1, 0.12)
  group.add(front)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: backTex, transparent: true }))
  back.position.set(0, 7.1, -0.12)
  back.rotation.y = Math.PI
  group.add(back)
  return group
}

function buildLandCycleScene(root: THREE.Group, mode: LandUrbanMode) {
  const width = mode === 'before' ? 24 : 30
  const depth = mode === 'before' ? 17 : 22
  const landSceneKey: SceneKey = mode === 'before' ? 'landBefore' : 'landAfter'
  const base = createLandBase(width, depth, mode === 'before' ? 0.68 : 0.22, landSceneKey)
  root.add(base)

  const billboard = createSceneBillboard(mode)
  billboard.position.set(-width * 0.36, 0.1, -depth * 0.34)
  if (mode === 'after') billboard.position.set(width * 0.34, 0.1, -depth * 0.34)
  root.add(billboard)

  const runoffCurves = mode === 'before'
    ? [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.9, 0.25, 5.4), new THREE.Vector3(-5.9, 0.24, 5.9), new THREE.Vector3(-4.8, 0.23, 5.2), new THREE.Vector3(-3.7, 0.22, 5.7), new THREE.Vector3(-2.5, 0.21, 4.95), new THREE.Vector3(-1.3, 0.20, 5.35), new THREE.Vector3(0.0, 0.19, 4.75), new THREE.Vector3(1.2, 0.18, 5.0), new THREE.Vector3(2.3, 0.17, 4.6),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.4, 0.25, -5.3), new THREE.Vector3(-5.3, 0.24, -5.8), new THREE.Vector3(-4.2, 0.23, -5.15), new THREE.Vector3(-3.0, 0.22, -5.6), new THREE.Vector3(-1.8, 0.21, -4.95), new THREE.Vector3(-0.6, 0.20, -5.3), new THREE.Vector3(0.8, 0.19, -4.7), new THREE.Vector3(1.9, 0.18, -4.95), new THREE.Vector3(2.9, 0.17, -4.55),
      ]),
    ]
    : [
      new THREE.CatmullRomCurve3([
        // 从右侧排水口上方出发，沿外围草地带绕城一周，在排水口下方结束。
        new THREE.Vector3(14.48, 0.205, 0.72),
        new THREE.Vector3(14.50, 0.205, 4.8),
        new THREE.Vector3(14.46, 0.205, 9.55),
        new THREE.Vector3(12.9, 0.205, 10.58),
        new THREE.Vector3(7.0, 0.205, 10.64),
        new THREE.Vector3(0.0, 0.205, 10.70),
        new THREE.Vector3(-7.0, 0.205, 10.74),
        new THREE.Vector3(-12.9, 0.205, 10.68),
        new THREE.Vector3(-14.40, 0.205, 9.5),
        new THREE.Vector3(-14.48, 0.205, 4.8),
        new THREE.Vector3(-14.52, 0.205, 0.0),
        new THREE.Vector3(-14.50, 0.205, -4.7),
        new THREE.Vector3(-14.44, 0.205, -9.45),
        new THREE.Vector3(-12.8, 0.205, -10.56),
        new THREE.Vector3(-6.8, 0.205, -10.62),
        new THREE.Vector3(0.0, 0.205, -10.68),
        new THREE.Vector3(6.8, 0.205, -10.72),
        new THREE.Vector3(12.8, 0.205, -10.66),
        new THREE.Vector3(14.42, 0.205, -9.55),
        new THREE.Vector3(14.48, 0.205, -4.8),
        new THREE.Vector3(14.50, 0.205, -0.72),
      ], false, 'centripetal', 0.45),
      // 城市降水落区通过浅排水支渠接入外围排水系统。
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5.0, 0.245, 3.65),
        new THREE.Vector3(-5.0, 0.235, 5.9),
        new THREE.Vector3(-5.0, 0.222, 8.3),
        new THREE.Vector3(-5.0, 0.205, 10.55),
      ], false, 'centripetal', 0.5),
      // 环城排水渠在右侧草地带留出出口，汇流至底座边缘，不再形成完全闭环。
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(14.49, 0.205, -0.72),
        new THREE.Vector3(14.62, 0.19, -0.95),
        new THREE.Vector3(14.76, 0.175, -1.28),
        new THREE.Vector3(14.88, 0.16, -1.68),
      ], false, 'centripetal', 0.5),
    ]
  runoffCurves.forEach((curve, index) => {
    const isUrbanCollector = mode === 'after' && index === 1
    const isUrbanOutlet = mode === 'after' && index === 2
    const widthStart = mode === 'before' ? 0.10 : isUrbanOutlet ? 0.12 : isUrbanCollector ? 0.10 : 0.16
    const widthEnd = mode === 'before' ? 0.18 : isUrbanOutlet ? 0.18 : isUrbanCollector ? 0.16 : 0.26
    const prescribedSurfaceHeights = Array.from(
      { length: RIVER_SURFACE_SEGMENTS + 1 },
      (_, segmentIndex) => curve.getPointAt(segmentIndex / RIVER_SURFACE_SEGMENTS).y,
    )
    const { mesh } = createSurfaceRiverRibbon(
      curve,
      widthStart + index * 0.006,
      widthEnd + index * 0.006,
      () => 0.155,
      prescribedSurfaceHeights,
    )
    root.add(mesh)
    registerToggle('runoff', mesh)
  })
  const runoffLabel = new THREE.Object3D()
  if (mode === 'before') runoffLabel.position.set(-0.8, 1.1, 5.2)
  else runoffLabel.position.set(0.0, 1.05, 10.7)
  root.add(runoffLabel)
  registerLabel(`runoff-${mode}`, 'runoff', '地表径流', 'lbl-runoff', runoffLabel, [mode === 'before' ? 'landBefore' : 'landAfter'])
  if (mode === 'after') {
    const outletLabel = new THREE.Object3D()
    outletLabel.position.set(14.35, 0.95, -1.45)
    root.add(outletLabel)
    registerLabel('runoff-outlet-after', 'runoff', '排水出口', 'lbl-runoff', outletLabel, ['landAfter'])
  }

  addLandBaseInfiltrationArrows(root, landSceneKey, width, depth, mode)
  const infLabel = new THREE.Object3D()
  infLabel.position.set(0, -0.65, depth * 0.5 + 0.22)
  root.add(infLabel)
  registerLabel(`inf-${mode}`, 'infiltration', '下渗', 'lbl-inf', infLabel, [landSceneKey])

  const evaporationOrigin = mode === 'before'
    ? new THREE.Vector3(8.0, 0.16, 4.7)
    : new THREE.Vector3(0.0, 0.16, 0.0)
  const evaporationPatch = new THREE.Mesh(
    new THREE.CircleGeometry(mode === 'before' ? 1.15 : 1.8, 36),
    new THREE.MeshStandardMaterial({ color: 0x4fa7b4, roughness: 0.32, metalness: 0.02, transparent: true, opacity: 0.82 }),
  )
  evaporationPatch.rotation.x = -Math.PI / 2
  evaporationPatch.position.copy(evaporationOrigin)
  evaporationPatch.position.y = 0.125
  root.add(evaporationPatch)

  const evapSmoke = createSmokeFlow(
    'evaporation',
    landSceneKey,
    new THREE.CatmullRomCurve3([
      evaporationOrigin.clone().setY(0.28),
      evaporationOrigin.clone().add(new THREE.Vector3(0.1, 2.0, 0)),
      evaporationOrigin.clone().add(new THREE.Vector3(0.35, 4.6, 0.05)),
      evaporationOrigin.clone().add(new THREE.Vector3(0.65, 6.8, 0.1)),
    ]),
    0xff8068,
    14,
    0.92,
    0.18,
    0xeaf6ff,
  )
  root.add(evapSmoke)
  const evapArrows = createArrowEmitter(
    'evaporation',
    landSceneKey,
    evaporationOrigin.clone().add(new THREE.Vector3(-0.18, 0.35, 0.15)),
    evaporationOrigin.clone().add(new THREE.Vector3(0.12, 6.25, 0.15)),
    5,
    0.7,
    0.26,
    true,
  )
  root.add(evapArrows)
  const evapLabel = new THREE.Object3D()
  evapLabel.position.copy(evaporationOrigin).add(new THREE.Vector3(0.65, 3.6, 0))
  root.add(evapLabel)
  registerLabel(`evap-${mode}`, 'evaporation', '蒸发', 'lbl-evap', evapLabel, [landSceneKey])

  const transpBaseX = mode === 'before' ? -7.2 : 8.6
  const transpBaseZ = mode === 'before' ? 4.9 : -6.0
  const transpSmoke = createSmokeFlow(
    'transpiration',
    mode === 'before' ? 'landBefore' : 'landAfter',
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(transpBaseX, 0.8, transpBaseZ), new THREE.Vector3(transpBaseX + 0.1, 2.8, transpBaseZ), new THREE.Vector3(transpBaseX + 0.4, 5.2, transpBaseZ), new THREE.Vector3(transpBaseX + 0.8, 7.3, transpBaseZ),
    ]),
    0xd9f5ff,
    12,
    0.86,
    0.16,
  )
  root.add(transpSmoke)
  const transpArrows = createArrowEmitter('transpiration', mode === 'before' ? 'landBefore' : 'landAfter', new THREE.Vector3(transpBaseX + 0.05, 0.85, transpBaseZ), new THREE.Vector3(transpBaseX + 0.55, 6.3, transpBaseZ), 4, 0.66, 0.22, true)
  root.add(transpArrows)
  const transpLabel = new THREE.Object3D()
  if (mode === 'before') transpLabel.position.set(-6.9, 3.9, 4.9)
  else transpLabel.position.set(9.1, 3.9, -5.8)
  root.add(transpLabel)
  registerLabel(`transp-${mode}`, 'transpiration', '蒸腾', 'lbl-tran', transpLabel, [mode === 'before' ? 'landBefore' : 'landAfter'])

  // 城镇化前后都补充完整的陆地内循环：蒸发/蒸腾上升后形成水汽输送，并在另一侧形成云和降水。
  const landCycleCloudCenter = mode === 'before'
    ? new THREE.Vector3(-4.3, 9.55, -0.35)
    : new THREE.Vector3(-5.0, 9.85, 3.65)
  const landCycleTransportStart = mode === 'before'
    ? new THREE.Vector3(8.65, 6.95, 4.78)
    : new THREE.Vector3(0.65, 6.95, 0.10)
  const landCycleTransportCurve = new THREE.CatmullRomCurve3([
    landCycleTransportStart.clone(),
    mode === 'before' ? new THREE.Vector3(6.0, 8.15, 4.0) : new THREE.Vector3(-1.1, 7.9, 1.25),
    mode === 'before' ? new THREE.Vector3(2.3, 9.0, 2.3) : new THREE.Vector3(-3.2, 8.75, 2.9),
    mode === 'before' ? new THREE.Vector3(-1.0, 9.35, 0.75) : new THREE.Vector3(-4.4, 9.45, 3.35),
    landCycleCloudCenter.clone(),
  ], false, 'centripetal', 0.5)
  root.add(createSmokeFlow('transport', landSceneKey, landCycleTransportCurve, 0xeaf6ff, mode === 'before' ? 28 : 30, 0.92, 0.19))
  root.add(createCloud(landCycleCloudCenter.clone().add(new THREE.Vector3(0, 0.25, 0)), mode === 'before' ? 1.0 : 1.08))

  const landCycleRainTop = landCycleCloudCenter.y - 0.1
  const landCycleRainBottom = mode === 'before' ? 0.65 : 0.72
  const landCycleRain = createRainSystem(
    'precipitation',
    landSceneKey,
    landCycleCloudCenter.x,
    landCycleCloudCenter.z,
    landCycleRainTop,
    landCycleRainBottom,
    mode === 'before' ? 2.8 : 3.2,
    mode === 'before' ? 2.4 : 2.7,
    mode === 'before' ? 20 : 24,
  )
  root.add(landCycleRain)

  const rainSurfacePosition = new THREE.Vector3(landCycleCloudCenter.x, 0.168, landCycleCloudCenter.z)
  if (mode === 'before') {
    // 乡村下垫面渗透性强：积水范围较小，扩散后较快消失并转化为下渗。
    createInfiltrationPulseCluster(root, landSceneKey, rainSurfacePosition, 0.82, 143, {
      count: 2,
      speedMultiplier: 1.45,
      scaleMultiplier: 0.78,
      opacityMultiplier: 0.86,
      fadeOutStart: 0.34,
    })
    const fastInfiltrationLabel = new THREE.Object3D()
    fastInfiltrationLabel.position.set(landCycleCloudCenter.x, 0.92, landCycleCloudCenter.z + 0.35)
    root.add(fastInfiltrationLabel)
    registerLabel('rain-infiltration-before', 'infiltration', '快速下渗', 'lbl-inf', fastInfiltrationLabel, ['landBefore'])
  } else {
    // 城市不透水面较多：积水面积更大、停留更久，并最终汇入环城排水渠。
    createInfiltrationPulseCluster(root, landSceneKey, rainSurfacePosition, 1.28, 271, {
      count: 4,
      speedMultiplier: 0.68,
      scaleMultiplier: 1.42,
      opacityMultiplier: 1.05,
      fadeOutStart: 0.72,
      toggleKey: 'runoff',
    })
    const urbanPuddleLabel = new THREE.Object3D()
    urbanPuddleLabel.position.set(landCycleCloudCenter.x, 0.96, landCycleCloudCenter.z + 0.45)
    root.add(urbanPuddleLabel)
    registerLabel('rain-puddle-after', 'runoff', '地表积水', 'lbl-runoff', urbanPuddleLabel, ['landAfter'])
  }

  const landTransportLabel = new THREE.Object3D()
  landTransportLabel.position.copy(
    mode === 'before'
      ? new THREE.Vector3(1.0, 8.85, 2.0)
      : new THREE.Vector3(-3.2, 8.75, 3.1),
  )
  root.add(landTransportLabel)
  registerLabel(`transport-${mode}`, 'transport', '水汽输送', 'lbl-trans', landTransportLabel, [landSceneKey])

  const landRainLabel = new THREE.Object3D()
  landRainLabel.position.copy(
    mode === 'before'
      ? new THREE.Vector3(-4.3, 6.65, -0.35)
      : new THREE.Vector3(-5.0, 6.9, 3.65),
  )
  root.add(landRainLabel)
  registerLabel(`rain-${mode}`, 'precipitation', '降水', 'lbl-prec', landRainLabel, [landSceneKey])

  if (mode === 'before') {
    ;[
      [-9.4, -5.2], [-7.8, -4.8], [-5.8, -5.5], [-3.0, -4.6], [0.5, -4.8], [3.6, -5.0], [7.4, -4.7],
      [-8.8, 4.8], [-6.4, 5.4], [-3.6, 4.6], [-0.4, 5.0], [3.0, 4.8], [6.6, 5.2], [8.8, 4.7],
    ].forEach(([x, z], i) => {
      const plane = new THREE.Mesh(
        new THREE.CircleGeometry(0.44, 7),
        new THREE.MeshStandardMaterial({ color: 0x7fdfff, transparent: true, opacity: 0.32, roughness: 0.35, metalness: 0.02 }),
      )
      plane.rotation.x = -Math.PI / 2
      plane.rotation.z = (i % 6) * 0.41
      plane.scale.set(0.9 - (i % 3) * 0.12, 0.6 - (i % 2) * 0.08, 1)
      plane.position.set(x, 0.122 + i * 0.0003, z)
      root.add(plane)
    })

    const ruralPath = createRuralPath([
      new THREE.Vector3(-10.5, 0.12, 0),
      new THREE.Vector3(-6.0, 0.12, 0),
      new THREE.Vector3(-1.5, 0.12, 0),
      new THREE.Vector3(3.0, 0.12, 0),
      new THREE.Vector3(8.8, 0.12, 0.1),
    ])
    root.add(ruralPath)

      ;[
        [-9.0, 3.9, 0.98], [-7.2, 4.9, 0.94], [-5.4, 4.1, 0.92], [-3.2, 5.2, 0.98], [-1.4, 4.4, 0.92], [1.4, 5.0, 0.96], [4.2, 4.2, 0.90], [7.0, 4.8, 0.98],
        [-8.4, -4.3, 0.96], [-6.0, -5.1, 0.92], [-3.8, -4.0, 0.90], [-1.0, -5.2, 0.98], [1.8, -4.3, 0.94], [4.8, -5.0, 0.98], [7.6, -4.2, 0.92],
      ].forEach(([x, z, s], idx) => root.add(createTree(x as number, 0.125, z as number, s as number, idx % 2 === 0 ? 0x1a915f : 0x117f56)))

    const h1 = createPitchedHouse(-7.8, 0.125, -1.9, 1.28)
    const h2 = createPitchedHouse(-3.3, 0.125, -1.9, 1.18)
    const h3 = createPitchedHouse(1.3, 0.125, -1.9, 1.20)
    const h4 = createPitchedHouse(5.8, 0.125, -1.9, 1.14)
    const h5 = createPitchedHouse(-5.7, 0.125, 1.9, 1.22)
    h5.rotation.y = Math.PI
    const h6 = createPitchedHouse(-0.8, 0.125, 1.9, 1.18)
    h6.rotation.y = Math.PI
    const h7 = createPitchedHouse(4.0, 0.125, 1.9, 1.16)
    h7.rotation.y = Math.PI
    const h8 = createPitchedHouse(8.2, 0.125, 1.9, 1.08)
    h8.rotation.y = Math.PI
    root.add(h1, h2, h3, h4, h5, h6, h7, h8)

    const extraTransp1 = createSmokeFlow('transpiration', 'landBefore', new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.2, 0.85, 4.9), new THREE.Vector3(-7.1, 3.0, 4.9), new THREE.Vector3(-6.8, 5.5, 4.9), new THREE.Vector3(-6.4, 7.4, 4.8),
    ]), 0xd9f5ff, 10, 0.74, 0.17)
    const extraTransp2 = createSmokeFlow('transpiration', 'landBefore', new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.8, 0.85, -5.0), new THREE.Vector3(4.9, 3.0, -5.0), new THREE.Vector3(5.2, 5.4, -5.0), new THREE.Vector3(5.6, 7.2, -4.9),
    ]), 0xd9f5ff, 10, 0.72, 0.16)
    root.add(extraTransp1, extraTransp2)
    const ruralTranspLabel2 = new THREE.Object3D()
    ruralTranspLabel2.position.set(5.0, 4.0, -5.0)
    root.add(ruralTranspLabel2)
    registerLabel('transp-before-extra', 'transpiration', '蒸腾', 'lbl-tran', ruralTranspLabel2, ['landBefore'])

  } else {
    addInfiltrationPatches(root, width, depth, 10, 20)
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x4d5866, roughness: 0.96, metalness: 0.02 })
    const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xaeb6bf, roughness: 0.92 })
    const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xe9d889 })

    const addHorizontalRoad = (z: number, roadDepth = 0.88) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(width - 0.7, 0.075, roadDepth), roadMaterial)
      road.position.set(0, 0.185, z)
      root.add(road)
      const curbA = new THREE.Mesh(new THREE.BoxGeometry(width - 0.7, 0.09, 0.11), curbMaterial)
      curbA.position.set(0, 0.205, z - roadDepth * 0.5 - 0.07)
      const curbB = curbA.clone()
      curbB.position.z = z + roadDepth * 0.5 + 0.07
      const lane = new THREE.Mesh(new THREE.BoxGeometry(width - 1.0, 0.012, 0.045), laneMaterial)
      lane.position.set(0, 0.222, z)
      root.add(curbA, curbB, lane)
    }

    const addVerticalRoad = (x: number, roadWidth = 0.88) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.075, depth - 0.7), roadMaterial)
      road.position.set(x, 0.185, 0)
      root.add(road)
      const curbA = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, depth - 0.7), curbMaterial)
      curbA.position.set(x - roadWidth * 0.5 - 0.07, 0.205, 0)
      const curbB = curbA.clone()
      curbB.position.x = x + roadWidth * 0.5 + 0.07
      const lane = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, depth - 1.0), laneMaterial)
      lane.position.set(x, 0.222, 0)
      root.add(curbA, curbB, lane)
    }

    // 两条内部横路、两条内部纵路，加外围道路边界，形成清晰的 3×3 九宫格。
    const xBoundaries = [-width * 0.46, -width / 6, width / 6, width * 0.46]
    const zBoundaries = [-depth * 0.46, -depth / 6, depth / 6, depth * 0.46]
    xBoundaries.forEach((x) => addVerticalRoad(x, x === xBoundaries[0] || x === xBoundaries[3] ? 0.66 : 0.92))
    zBoundaries.forEach((z) => addHorizontalRoad(z, z === zBoundaries[0] || z === zBoundaries[3] ? 0.66 : 0.92))

    const cellXs = [-(width / 3), 0, width / 3]
    const cellZs = [-(depth / 3), 0, depth / 3]
    let cellIndex = 0
    cellZs.forEach((cz) => {
      cellXs.forEach((cx) => {
        const palette = [
          0xe9876b,
          0x6fa8dc,
          0xf2c66d,
          0x77c5a3,
          0xb38ad7,
          0xe49ca9,
          0x69b7c7,
          0xd89b62,
          0x8da7d6,
        ]
        const block = new THREE.Group()
        const isPark = cellIndex === 4
        if (isPark) {
          const lawn = new THREE.Mesh(
            new THREE.BoxGeometry(5.7, 0.03, 4.1),
            new THREE.MeshStandardMaterial({ color: 0x78b86f, roughness: 0.98 }),
          )
          lawn.position.y = 0.123
          block.add(lawn)
          const lake = new THREE.Mesh(
            new THREE.CircleGeometry(1.7, 28),
            new THREE.MeshStandardMaterial({ color: 0x65d7f7, transparent: true, opacity: 0.88, roughness: 0.28 }),
          )
          lake.rotation.x = -Math.PI / 2
          lake.position.set(0, 0.146, 0)
          block.add(lake)
          block.add(createTree(-1.8, 0.145, -1.2, 0.84, 0x15875b))
          block.add(createTree(1.9, 0.145, -1.3, 0.82, 0x1b9362))
          block.add(createTree(-2.0, 0.145, 1.25, 0.88, 0x15875b))
          block.add(createTree(1.8, 0.145, 1.3, 0.86, 0x1b9362))
        } else {
          const buildingHeight = 3.6 + (cellIndex % 5) * 0.82
          const buildingWidth = 1.55 + (cellIndex % 3) * 0.18
          const buildingDepth = 1.42 + ((cellIndex + 1) % 3) * 0.15
          const mainBuilding = createUrbanBuildingVariant(
            cellIndex,
            buildingWidth,
            buildingHeight,
            buildingDepth,
            palette[cellIndex % palette.length],
          )
          mainBuilding.position.set(-0.82, 0.145, -0.28)
          block.add(mainBuilding)

          const secondaryBuilding = createUrbanBuildingVariant(
            cellIndex + 5,
            1.25 + (cellIndex % 2) * 0.18,
            1.7 + (cellIndex % 3) * 0.42,
            1.15 + ((cellIndex + 1) % 2) * 0.16,
            palette[(cellIndex + 3) % palette.length],
          )
          secondaryBuilding.scale.setScalar(0.88)
          secondaryBuilding.position.set(1.28, 0.145, 0.72)
          secondaryBuilding.rotation.y = (cellIndex % 2 === 0 ? 1 : -1) * 0.16
          block.add(secondaryBuilding)

          block.add(createTree(1.7, 0.145, -1.15, 0.78, 0x15875b))
          block.add(createTree(-1.7, 0.145, 1.25, 0.74, 0x1b9362))
        }

        block.position.set(cx, 0, cz)
        root.add(block)
        cellIndex += 1
      })
    })

    root.add(createSmokeFlow('transpiration', 'landAfter', new THREE.CatmullRomCurve3([
      new THREE.Vector3(8.6, 0.8, -6.0), new THREE.Vector3(8.7, 3.0, -6.0), new THREE.Vector3(9.0, 5.5, -5.9), new THREE.Vector3(9.4, 7.4, -5.8),
    ]), 0xd9f5ff, 10, 0.72, 0.16))
    root.add(createSmokeFlow('transpiration', 'landAfter', new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.9, 0.8, 1.3), new THREE.Vector3(2.0, 3.1, 1.3), new THREE.Vector3(2.3, 5.4, 1.25), new THREE.Vector3(2.6, 7.4, 1.2),
    ]), 0xd9f5ff, 10, 0.72, 0.16))
    root.add(createSmokeFlow('transpiration', 'landAfter', new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.0, 0.8, -1.2), new THREE.Vector3(-1.9, 3.1, -1.2), new THREE.Vector3(-1.6, 5.4, -1.15), new THREE.Vector3(-1.2, 7.4, -1.05),
    ]), 0xd9f5ff, 10, 0.72, 0.16))
    const parkTranspLabelA = new THREE.Object3D()
    parkTranspLabelA.position.set(2.0, 4.0, 1.3)
    root.add(parkTranspLabelA)
    registerLabel('transp-after-park-a', 'transpiration', '蒸腾', 'lbl-tran', parkTranspLabelA, ['landAfter'])
    const parkTranspLabelB = new THREE.Object3D()
    parkTranspLabelB.position.set(-1.9, 4.0, -1.2)
    root.add(parkTranspLabelB)
    registerLabel('transp-after-park-b', 'transpiration', '蒸腾', 'lbl-tran', parkTranspLabelB, ['landAfter'])
  }

}

function createSkyEnvironment() {
  if (!scene) return
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        float height = clamp(direction.y, 0.0, 1.0);
        float horizon = pow(1.0 - height, 4.0);
        vec3 horizonColor = vec3(0.40, 0.67, 0.79);
        vec3 middleColor = vec3(0.11, 0.43, 0.66);
        vec3 zenithColor = vec3(0.025, 0.15, 0.36);
        vec3 skyColor = mix(horizonColor, middleColor, smoothstep(0.0, 0.38, height));
        skyColor = mix(skyColor, zenithColor, smoothstep(0.38, 1.0, height));
        skyColor += vec3(0.20, 0.10, 0.035) * horizon * 0.18;
        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
  })
  skyEnvironment = new THREE.Mesh(new THREE.SphereGeometry(160, 64, 36), material)
  skyEnvironment.renderOrder = -100
  scene.add(skyEnvironment)
}

function buildScene() {
  const container = threeHostRef.value
  if (!container) return
  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x79b4d0)

  camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 500)
  const preset = cameraPresets[currentSceneKey()]
  camera.position.copy(preset.pos)
  camera.lookAt(preset.target)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.94
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 10
  controls.maxDistance = 128
  controls.maxPolarAngle = Math.PI * 0.49
  controls.target.copy(preset.target)
  controls.update()

  createSkyEnvironment()
  scene.add(new THREE.AmbientLight(0xd9edff, 0.58))
  scene.add(new THREE.HemisphereLight(0xc9ebff, 0x62523e, 1.4))
  const dirLight = new THREE.DirectionalLight(0xffe2ad, 3.1)
  dirLight.position.copy(SUN_SCENE_POSITION)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.left = -28
  dirLight.shadow.camera.right = 28
  dirLight.shadow.camera.top = 22
  dirLight.shadow.camera.bottom = -20
  dirLight.shadow.camera.near = 1
  dirLight.shadow.camera.far = 90
  dirLight.target.position.set(4, 0, 0)
  scene.add(dirLight)
  scene.add(dirLight.target)
  const fill = new THREE.DirectionalLight(0x88c7ff, 0.8)
  fill.position.set(-10, 10, 12)
  scene.add(fill)

  const seaLandRoot = new THREE.Group()
  buildSeaLandScene(seaLandRoot)
  scene.add(seaLandRoot)
  sceneGroups.seaLand = seaLandRoot

  const landBeforeRoot = new THREE.Group()
  buildLandCycleScene(landBeforeRoot, 'before')
  landBeforeRoot.position.set(-18, 0, 0)
  landBeforeRoot.visible = false
  scene.add(landBeforeRoot)
  sceneGroups.landBefore = landBeforeRoot

  const landAfterRoot = new THREE.Group()
  buildLandCycleScene(landAfterRoot, 'after')
  landAfterRoot.position.set(18, 0, 0)
  landAfterRoot.visible = false
  scene.add(landAfterRoot)
  sceneGroups.landAfter = landAfterRoot

  applySceneVisibility()
  applyLayerVisibility()
  sceneReady = true
  renderer.render(scene, camera)
  updateLabels()
  threeResizeObserver = new ResizeObserver(() => scheduleSceneResize(90))
  threeResizeObserver.observe(container)
  animate()
  scheduleSceneResize(0)
}

function applySceneVisibility() {
  const active = currentSceneKey()
    ; (Object.keys(sceneGroups) as SceneKey[]).forEach((key) => {
      if (!sceneGroups[key]) return
      sceneGroups[key]!.visible = isSceneActive(key)
    })
  const preset = cameraPresets[active]
  animateCameraTo(preset.pos, preset.target, 650)
  if (seaWater) seaWater.visible = mainSceneMode.value === 'seaLand'
}

function applyLayerVisibility() {
  toggleGroups.forEach((objects, key) => {
    objects.forEach((obj) => {
      obj.visible = !!layers[key]
    })
  })
  smokeFlows.forEach((item) => { item.group.visible = isSceneActive(item.scene) && item.keys.every((key) => !!layers[key]) })
  rainSystems.forEach((item) => { item.group.visible = isSceneActive(item.scene) && !!layers[item.key] })
  arrowEmitters.forEach((item) => { item.group.visible = isSceneActive(item.scene) && !!layers[item.key] })
  dynamicCurveArrows.forEach((item) => { item.group.visible = isSceneActive(item.scene) && !!layers[item.key] })
}

function updateLabels() {
  if (!camera || !threeHostRef.value) return
  const w = threeHostRef.value.clientWidth
  const h = threeHostRef.value.clientHeight
  camera.getWorldPosition(labelCameraPosition)
  const activeOccluders = terrainOccluders
    .filter((entry) => entry.scenes.some((sceneKey) => isSceneActive(sceneKey)))
    .map((entry) => entry.object)

  screenLabels.value = labelAnchors.map((item) => {
    const worldPosition = item.object.getWorldPosition(new THREE.Vector3())
    const projected = worldPosition.clone().project(camera)
    const inView =
      item.scenes.some((sceneKey) => isSceneActive(sceneKey))
      && (item.key === '' || !!layers[item.key])
      && projected.z >= -1 && projected.z <= 1
      && projected.x >= -1.25 && projected.x <= 1.25
      && projected.y >= -1.25 && projected.y <= 1.25

    let occludedByTerrain = false
    if (inView && activeOccluders.length) {
      const labelDistance = labelCameraPosition.distanceTo(worldPosition)
      labelRayDirection.copy(worldPosition).sub(labelCameraPosition).normalize()
      labelOcclusionRaycaster.set(labelCameraPosition, labelRayDirection)
      // 留出标签锚点附近的容差，避免贴在地表上的标签遮挡自身。
      labelOcclusionRaycaster.far = Math.max(0, labelDistance - 0.16)
      occludedByTerrain = labelOcclusionRaycaster.intersectObjects(activeOccluders, false).length > 0
    }

    return {
      id: item.id,
      text: item.text,
      cls: item.cls,
      x: (projected.x * 0.5 + 0.5) * w,
      y: (-projected.y * 0.5 + 0.5) * h,
      visible: inView && !occludedByTerrain,
    }
  })
}

function updateSmokeFlows(elapsed: number) {
  const active = currentSceneKey()
  smokeFlows.forEach((flow) => {
    if (!isSceneActive(flow.scene) || !flow.group.visible) return
    flow.materials.forEach((material) => {
      material.uniforms.uTime.value = elapsed * speed.value * 2.15
    })
  })
}

function updateRainSystems(elapsed: number) {
  rainSystems.forEach((system) => {
    if (!isSceneActive(system.scene) || !system.group.visible) return
    const total = system.topY - system.bottomY
    system.drops.forEach((drop, i) => {
      const phase = (drop.offset + elapsed * (0.42 + drop.scale * 0.1) * speed.value + i * 0.012) % 1
      const fallEase = phase * phase * (3 - 2 * phase)
      const y = system.topY - fallEase * total
      drop.mesh.position.set(
        drop.x + Math.sin(elapsed * 0.7 + i * 1.7) * drop.drift,
        y,
        drop.z + Math.cos(elapsed * 0.55 + i * 1.1) * drop.drift * 0.45,
      )
      const fadeIn = smoothstep(0.0, 0.08, phase)
      const fadeOut = 1 - smoothstep(0.86, 1.0, phase)
      drop.mesh.visible = fadeIn * fadeOut > 0.08
      const pulseScale = 0.88 + Math.sin(phase * Math.PI) * 0.18
      drop.mesh.scale.set(
        drop.scale * pulseScale,
        drop.scale * (1.28 + fallEase * 0.72),
        drop.scale * pulseScale,
      )
    })
  })
}

function updateInfiltrationPulses(elapsed: number) {
  infiltrationPulses.forEach((pulse) => {
    const visible = isSceneActive(pulse.scene) && !!layers[pulse.key]
    pulse.mesh.visible = visible
    if (!visible) return

    const phase = (elapsed * pulse.speed * speed.value + pulse.phaseOffset) % 1
    const easedGrowth = 1 - Math.pow(1 - phase, 2.4)
    const scale = 0.08 + easedGrowth * pulse.maxScale
    const fadeIn = smoothstep(0.0, 0.12, phase)
    const fadeOut = 1 - smoothstep(pulse.fadeOutStart, 1.0, phase)
    pulse.mesh.scale.set(scale, scale, 1)
    pulse.mesh.material.opacity = pulse.baseOpacity * fadeIn * fadeOut
  })
}

function updateArrowEmitters(elapsed: number) {
  const dir = new THREE.Vector3()
  arrowEmitters.forEach((emitter) => {
    if (!isSceneActive(emitter.scene) || !emitter.group.visible) return
    emitter.arrows.forEach((item) => {
      const t = (item.baseT + elapsed * emitter.speed * speed.value) % 1
      item.mesh.position.lerpVectors(emitter.start, emitter.end, t)
      if (emitter.billboard && camera) {
        item.mesh.quaternion.copy(camera.quaternion)
      } else if (emitter.fixedRotation) {
        item.mesh.rotation.set(emitter.fixedRotation[0], emitter.fixedRotation[1], emitter.fixedRotation[2])
      } else {
        dir.subVectors(emitter.end, emitter.start).normalize()
        item.mesh.lookAt(item.mesh.position.clone().add(dir))
      }
      const fade = smoothstep(0, 0.12, t) * (1 - smoothstep(0.78, 1, t))
        ; (item.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade
    })
  })
}


function updateDynamicCurveArrows(elapsed: number) {
  const sourceAxis = new THREE.Vector3(0, 1, 0)
  dynamicCurveArrows.forEach((system) => {
    const visible = isSceneActive(system.scene) && !!layers[system.key]
    system.group.visible = visible
    if (!visible) return
    const phase = (elapsed * system.rate * speed.value + system.phaseOffset) % 1
    system.material.uniforms.uTime.value = phase
    const point = system.curve.getPointAt(phase)
    const tangent = system.curve.getTangentAt(phase).normalize()
    system.head.position.copy(point)
    system.head.quaternion.setFromUnitVectors(sourceAxis, tangent)
    const pulse = 0.88 + Math.sin(elapsed * 4.2 + system.phaseOffset * 8.0) * 0.12
    system.head.scale.setScalar(pulse)
  })
}

function updateTextures(dt: number) {
  textureScrollers.forEach((item) => {
    if (!isSceneActive(item.scene) || !layers[item.key]) return
    if (item.axis === 'x') item.texture.offset.x -= dt * item.speed * speed.value
    else item.texture.offset.y -= dt * item.speed * speed.value
  })
}

function updateShaderPlanes(dt: number) {
  riverShaderMaterials.forEach((material) => {
    material.uniforms.uTime.value += dt * speed.value
  })

  landSideShaderMaterials.forEach((material) => {
    material.uniforms.uTime.value += dt * speed.value
  })
}

function animate() {
  animationId = requestAnimationFrame(animate)
  if (!sceneReady || !scene || !camera || !renderer) return
  const dt = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.elapsedTime

  if (autoPlay.value) {
    updateSmokeFlows(elapsed)
    updateRainSystems(elapsed)
    updateInfiltrationPulses(elapsed)
    updateArrowEmitters(elapsed)
    updateDynamicCurveArrows(elapsed)
    updateTextures(dt)
    updateShaderPlanes(dt)
    if (seaWater) seaWater.material.uniforms.time.value += dt * 0.55 * speed.value
  }

  controls?.update()
  renderer.render(scene, camera)
  updateLabels()
}

function animateCameraTo(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 800) {
  if (!camera || !controls) return
  const startPos = camera.position.clone()
  const startTarget = controls.target.clone()
  const startTime = performance.now()
  function step() {
    if (!camera || !controls) return
    const t = Math.min((performance.now() - startTime) / duration, 1)
    const e = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(startPos, targetPos, e)
    controls.target.lerpVectors(startTarget, targetLookAt, e)
    controls.update()
    if (t < 1) requestAnimationFrame(step)
  }
  step()
}

function resetView() {
  applySceneVisibility()
}

function setMainSceneMode(mode: MainSceneMode) {
  mainSceneMode.value = mode
}


function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  const el = document.querySelector('.water-recycle-container') as HTMLElement | null
  if (isFullscreen.value) el?.requestFullscreen?.()
  else document.exitFullscreen?.()
  setTimeout(() => scheduleSceneResize(0), 120)
}

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

function resizeSceneNow() {
  const container = threeHostRef.value
  if (!container || !camera || !renderer || !scene) return
  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (width === lastSceneWidth && height === lastSceneHeight && dpr === lastSceneDpr) {
    updateLabels()
    return
  }
  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)
  controls?.update()
  renderer.render(scene, camera)
  updateLabels()
}

function scheduleSceneResize(delay = 100) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeFrame = 0
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        sceneResizeSettleFrame = 0
        resizeSceneNow()
      })
    })
  }, delay)
}

watch(mainSceneMode, () => {
  if (!sceneReady) return
  applySceneVisibility()
  applyLayerVisibility()
})
watch(
  () => ({ ...layers }),
  () => {
    if (!sceneReady) return
    applyLayerVisibility()
  },
  { deep: true },
)

onMounted(async () => {
  await nextTick()
  buildScene()
})

onBeforeUnmount(() => {
  sceneReady = false
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null
  controls?.dispose()
  controls = null
  scene?.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite || obj instanceof THREE.Points) {
      obj.geometry?.dispose?.()
      const material: any = (obj as any).material
      if (Array.isArray(material)) material.forEach((m) => m?.dispose?.())
      else material?.dispose?.()
    }
  })
  renderer?.dispose()
  if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  smokeFlows.length = 0
  riverShaderMaterials.length = 0
  landSideShaderMaterials.length = 0
  rainSystems.length = 0
  infiltrationPulses.length = 0
  arrowEmitters.length = 0
  dynamicCurveArrows.length = 0
  textureScrollers.length = 0
  cloudVolumeMaterials.length = 0
  labelAnchors.length = 0
  terrainOccluders.length = 0
  toggleGroups.clear()
  sceneGroups.seaLand = null
  sceneGroups.landBefore = null
  sceneGroups.landAfter = null
  seaWater = null
  skyEnvironment = null
  cloudVolumeTexture?.dispose()
  cloudVolumeTexture = null
  scene = null
  camera = null
  renderer = null
})
</script>

<style scoped>
.water-floating-card {
  width: min(340px, calc(100vw - 20px));
  max-height: calc(100vh - 90px);
}

.water-control-panel {
  width: min(400px, calc(100vw - 20px));
  height: min(680px, calc(100vh - 132px));
}

.water-control-panel.collapsed {
  width: min(208px, calc(100vw - 20px));
  height: auto;
}

.water-floating-card :deep(.feature-card-content) {
  padding-bottom: 0;
}

.floating-card-section {
  margin: 0;
  border-radius: 0;
  padding: 14px 16px !important;
}

.floating-card-section+.floating-card-section {
  border-top: 1px solid rgba(82, 206, 255, 0.16);
}

.panel-section-title {
  margin: 0 0 10px;
  color: #62d6ff;
  font-size: 13px;
  letter-spacing: 0.06em;
}

.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}

.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 700;
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  font-size: 14px;
  background: rgba(8, 12, 28, 0.58);
  border: 1px solid rgba(46, 196, 182, 0.25);
  color: #2ec4b6;
  box-shadow: 0 0 12px rgba(30, 110, 150, 0.12);
}

.scene-label.lbl-evap,
.scene-label.lbl-tran {
  color: #ffb08d;
  border-color: rgba(255, 165, 120, 0.55);
}

.scene-label.lbl-trans {
  color: #dff3ff;
  border-color: rgba(223, 243, 255, 0.55);
}

.scene-label.lbl-prec {
  color: #b6dcff;
  border-color: rgba(182, 220, 255, 0.55);
}

.scene-label.lbl-runoff {
  color: #60e3d7;
  border-color: rgba(96, 227, 215, 0.55);
}

.scene-label.lbl-inf {
  color: #d8c3ff;
  border-color: rgba(216, 195, 255, 0.55);
}

.scene-label.lbl-gw {
  color: #b6a0ff;
  border-color: rgba(182, 160, 255, 0.58);
}

.scene-label.lbl-ocean {
  color: #8bddff;
  border-color: rgba(139, 221, 255, 0.5);
}

.scene-label.lbl-entry {
  color: #f4f7ff;
  border-color: rgba(244, 247, 255, 0.45);
  background: rgba(25, 80, 140, 0.35);
}

.footer-tip {
  position: absolute;
  right: 16px;
  bottom: 16px;
  font-size: 11px;
  color: #64748b;
  padding: 4px 10px;
  background: rgba(8, 12, 28, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 999px;
  pointer-events: none;
}

.layer-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.layer-row {
  min-width: 0;
  min-height: 60px;
  padding: 8px 9px;
  border: 1px solid rgba(82, 206, 255, 0.12);
  border-radius: 8px;
  background: rgba(14, 47, 68, 0.28);
}

.layer-row .control-copy {
  min-width: 0;
  padding-right: 5px;
}

.layer-row .control-copy span {
  line-height: 1.35;
}

.urban-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.urban-hint {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 0;
  line-height: 1.5;
  padding: 6px 8px;
  background: rgba(46, 196, 182, 0.06);
  border-radius: 6px;
  border-left: 2px solid #2ec4b6;
}

.knowledge-card {
  padding: 14px 16px 18px !important;
}

.knowledge-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.55;
}

.knowledge-content h4 {
  grid-column: 1 / -1;
  margin: 0;
  color: #2ec4b6;
  font-size: 14px;
}

.knowledge-content p {
  margin: 0;
  padding: 8px 9px;
  border: 1px solid rgba(46, 196, 182, 0.12);
  border-radius: 8px;
  background: rgba(46, 196, 182, 0.055);
}

.knowledge-content p:last-child:nth-child(even) {
  grid-column: 1 / -1;
}

@media (max-width: 760px) {

  .layer-list,
  .knowledge-content {
    grid-template-columns: 1fr;
  }

  .knowledge-content p:last-child:nth-child(even) {
    grid-column: auto;
  }
}

.water-recycle-container .three-host {
  overflow: hidden;
}

.water-recycle-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
