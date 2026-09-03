<template>
  <div ref="pageRef" class="thermal-circulation-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">热力环流</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetView">
          重置视角
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <div class="thermal-corner-atmosphere warm" :style="atmosphereStyle" aria-hidden="true">
            <i v-for="corner in 4" :key="`warm-${corner}`"></i>
          </div>
          <div class="thermal-corner-atmosphere cold" :style="atmosphereStyle" aria-hidden="true">
            <i v-for="corner in 4" :key="`cold-${corner}`"></i>
          </div>

        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying || continuousLoopMode }"
            :aria-label="isPlaying || continuousLoopMode ? '暂停' : '播放'"
            :title="isPlaying || continuousLoopMode ? '暂停' : '播放'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying || continuousLoopMode" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>演示进度</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="handleTimelineScrub" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
        ‹
      </button>
    </main>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="stageCardCollapsed" class="thermal-stage-feature-card" title="阶段控制"
      :subtitle="currentStage.title" variant="track" :initial-top="118" :initial-right="16" :bottom-inset="86"
      :min-width="460" :min-height="300">
      <template #header-meta>
        <span class="feature-progress-badge">{{ Math.round(progress) }}%</span>
      </template>

      <div class="thermal-stage-controller">
        <div class="thermal-stage-tabs" role="tablist" aria-label="热力环流演示阶段">
          <button v-for="(stage, index) in stageDefinitions" :key="stage.id" type="button" role="tab"
            class="thermal-stage-tab" :class="{ active: currentStageIndex === index, done: currentStageIndex > index }"
            :aria-selected="currentStageIndex === index" @click="goToStage(index)">
            <span>{{ index + 1 }}</span>
            <strong>{{ stage.shortName }}</strong>
          </button>
        </div>

        <section class="thermal-stage-detail">
          <div class="thermal-stage-detail-head">
            <span>阶段 {{ currentStageIndex + 1 }}</span>
            <strong>{{ currentStage.title }}</strong>
          </div>
          <p>{{ currentStage.description }}</p>
          <div class="thermal-stage-observation">
            <i></i>
            <span>观察重点</span>
            <strong>{{ currentStage.focus }}</strong>
          </div>
        </section>

        <div class="thermal-stage-actions">
          <button type="button" class="theme-btn option-btn" :disabled="currentStageIndex === 0"
            @click="goToStage(currentStageIndex - 1)">← 上一阶段</button>
          <button type="button" class="theme-btn option-btn primary" @click="playCurrentStage">
            {{ isPlaying && playbackMode === 'stage' ? '暂停本阶段' : '播放本阶段' }}
          </button>
          <button type="button" class="theme-btn option-btn" @click="goToNextStage">
            {{ currentStageIndex < stageDefinitions.length - 1 ? '下一阶段 →' : '回到开始' }} </button>
              <button type="button" class="theme-btn option-btn" @click="playAllStages">连续演示</button>
              <button type="button" class="theme-btn option-btn thermal-stage-loop-btn"
                :class="{ active: isPlaying && playbackMode === 'loop' }" @click="toggleStageLoop">
                {{ isPlaying && playbackMode === 'loop' ? '停止阶段循环' : '循环演示 1→6' }}
              </button>
              <button type="button" class="theme-btn option-btn thermal-loop-btn"
                :class="{ active: continuousLoopMode }" @click="toggleContinuousLoop">
                {{ continuousLoopMode ? '停止 100% 持续循环' : '100% 持续循环' }}
              </button>
        </div>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="insightCardCollapsed" class="thermal-insight-feature-card" title="热力环流解读"
      :subtitle="currentStage.insightTitle" variant="data" :initial-bottom="96" :initial-right="16" :bottom-inset="86"
      :min-width="330" :min-height="280">
      <div class="thermal-insight-content">
        <p class="thermal-insight-lead">{{ currentStage.insight }}</p>
        <div class="thermal-cause-chain" aria-label="热力环流形成链条">
          <span :class="{ active: currentStageIndex >= 0 }">地表冷热不均</span>
          <i>→</i>
          <span :class="{ active: currentStageIndex >= 1 }">空气垂直运动</span>
          <i>→</i>
          <span :class="{ active: currentStageIndex >= 3 }">气压差形成</span>
          <i>→</i>
          <span :class="{ active: currentStageIndex >= 4 }">水平气流闭合</span>
        </div>
        <dl class="thermal-compare-grid">
          <div class="warm">
            <dt>热地面</dt>
            <dd>升温 → 空气膨胀上升 → 近地面低压</dd>
          </div>
          <div class="cold">
            <dt>冷地面</dt>
            <dd>降温 → 空气收缩下沉 → 近地面高压</dd>
          </div>
        </dl>
        <section class="thermal-insight-legend" aria-label="场景图例">
          <strong class="legend-title">场景图例</strong>
          <div class="legend-item"><i class="legend-arrow warm">↑</i><span>上升气流</span></div>
          <div class="legend-item"><i class="legend-arrow cold">↓</i><span>下沉气流</span></div>
          <div class="legend-item"><i class="legend-arrow upper">→</i><span>高空气流</span></div>
          <div class="legend-item"><i class="legend-arrow surface">←</i><span>近地面气流</span></div>
          <div class="legend-item"><i class="legend-block warm-block"></i><span>受热区</span></div>
          <div class="legend-item"><i class="legend-block cold-block"></i><span>冷却区</span></div>
        </section>
        <p class="thermal-cloud-note">云只表示暖湿空气上升冷却后可能发生的凝结，不是热力环流形成的动力。</p>
      </div>
    </FloatingFeatureCard>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

const thermalAtmosphereBackgroundUrl = '/geo-resources-folder/images/thermal-atmosphere-bg.png'

const hasLeftPanel = false
const hasRightPanel = false

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
  leftEntryAttrs,
  rightEntryAttrs,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (state.resizing) return
    scheduleSceneResize(90)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

const threeContainerRef = ref<HTMLElement | null>(null)
const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const playbackStopAt = ref(100)
const playbackMode = ref<'all' | 'stage' | 'loop' | null>(null)
const continuousLoopMode = ref(false)
const stageCardCollapsed = ref(false)
const insightCardCollapsed = ref(true)
const panelsVisible = ref(true)
const speedOptions = [0.5, 1, 2, 5]

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

const IMAGE_BASE_URL = '/geo-resources-folder/images/'
const SUN_TEXTURE_URL = `${IMAGE_BASE_URL}sun.png`

const stageDefinitions = [
  {
    id: 'heating',
    shortName: '受热',
    start: 0,
    end: 16,
    title: '① 太阳辐射 · 近地面升温',
    description: '太阳光辉逐渐照向地面，近地面吸收热量并由暗转暖。',
    focus: '先观察热地面颜色、橙红色波纹和植物状态的同步变化。',
    insightTitle: '冷热不均是环流的起点',
    insight: '地表吸收太阳辐射的能力不同，首先造成温度差；温度差进一步转化为空气密度差。',
  },
  {
    id: 'rising',
    shortName: '上升',
    start: 16,
    end: 32,
    title: '② 暖空气膨胀上升',
    description: '受热空气密度减小并持续上升，先形成热端的垂直运动。',
    focus: '观察橙红箭头沿暖色烟流向上，此时水平气流尚未出现。',
    insightTitle: '受热使空气密度减小',
    insight: '空气受热膨胀后，单位体积内的质量减小，因此相对周围空气更轻并产生上升运动。',
  },
  {
    id: 'sinking',
    shortName: '下沉',
    start: 32,
    end: 48,
    title: '③ 冷空气收缩下沉',
    description: '冷端空气密度增大并下沉，与暖端上升共同构成垂直运动。',
    focus: '观察冰蓝箭头向下、冷地面渐变和冰蓝波纹，仍不提前展示水平气流。',
    insightTitle: '冷却使空气密度增大',
    insight: '空气冷却收缩后变重并下沉，在冷地面附近堆积，形成相对较高的近地面气压。',
  },
  {
    id: 'pressure',
    shortName: '气压差',
    start: 48,
    end: 62,
    title: '④ 垂直运动 · 建立气压差',
    description: '上升和下沉重新分配空气质量，近地面与高空分别形成相反的高、低压配置。',
    focus: '热端近地面为低压、上空为高压；冷端近地面为高压、上空为低压。',
    insightTitle: '垂直运动先造成气压差',
    insight: '空气上升使热端近地面失去空气、上空空气增多；冷端则相反。这个气压差才是随后水平运动的直接动力。',
  },
  {
    id: 'horizontal-flow',
    shortName: '水平流',
    start: 62,
    end: 84,
    title: '⑤ 高空与近地面水平运动',
    description: '气压梯度形成后，高空和近地面空气分别由高压流向低压。',
    focus: '高空由热端流向冷端，近地面由冷端回到热端，两支气流方向相反。',
    insightTitle: '气压梯度驱动水平运动',
    insight: '高空空气从热端上空高压流向冷端上空低压；近地面空气从冷端高压流向热端低压。',
  },
  {
    id: 'return-flow',
    shortName: '闭合',
    start: 84,
    end: 100,
    title: '⑥ 四支气流 · 环流闭合',
    description: '暖端上升、冷端下沉以及两层水平气流首尾相接，完整热力环流形成。',
    focus: '沿箭头依次检查上升、高空流动、下沉和近地面回流是否首尾闭合。',
    insightTitle: '垂直运动在先，水平运动在后',
    insight: '地表冷热不均先触发垂直运动，垂直运动建立气压差，再驱动水平运动，最终形成闭合环流。',
  },
] as const

const currentStageIndex = computed(() => {
  const index = stageDefinitions.findIndex((stage) => progress.value < stage.end)
  return index < 0 ? stageDefinitions.length - 1 : index
})

const currentStage = computed(() => stageDefinitions[currentStageIndex.value]!)

function smoothRange(value: number, start: number, end: number) {
  const t = THREE.MathUtils.clamp((value - start) / Math.max(0.0001, end - start), 0, 1)
  return t * t * (3 - 2 * t)
}

const atmosphereStyle = computed(() => {
  const phase = progress.value / 100
  const warmIn = smoothRange(phase, 0.055, 0.13)
  const warmOut = 1 - smoothRange(phase, 0.27, 0.36)
  const coldIn = smoothRange(phase, 0.32, 0.39)
  const coldOut = 1 - smoothRange(phase, 0.53, 0.62)
  return {
    '--warm-intensity': (warmIn * warmOut).toFixed(3),
    '--cold-intensity': (coldIn * coldOut * 0.98).toFixed(3),
  }
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrameId = 0
let timelineAnimationFrameId = 0
let timelineLastTime = 0
let sceneLastTime = 0
let continuousElapsed = 0
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let sceneDisposed = false
let cameraFollowEnabled = true
let lastCameraPhase = -1

const rootGroup = new THREE.Group()
const disposableGeometries: THREE.BufferGeometry[] = []
const disposableMaterials: THREE.Material[] = []
const disposableTextures: THREE.Texture[] = []

interface FlowMover {
  curve: THREE.Curve<THREE.Vector3>
  mesh: THREE.Object3D
  offset: number
  speed: number
  revealStart: number
  revealEnd: number
  bob?: number
}

interface PulseObject {
  object: THREE.Object3D
  baseScale: number
  strength: number
  offset: number
}

interface CloudVolumeRuntime {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.RawShaderMaterial>
  basePosition: THREE.Vector3
  baseRotationY: number
  driftPhase: number
}

interface RevealUniformRuntime {
  material: THREE.ShaderMaterial | THREE.RawShaderMaterial
  uniform: string
  baseValue: number
  start: number
  end: number
}

interface RevealOpacityRuntime {
  material: THREE.Material & { opacity: number }
  baseOpacity: number
  start: number
  end: number
}

interface VegetationPartRuntime {
  mesh: THREE.Mesh
  baseY: number
  baseRotationZ: number
  baseScaleY: number
  bend: number
}

interface VegetationRuntime {
  group: THREE.Group
  foliageMaterial: THREE.MeshStandardMaterial
  parts: VegetationPartRuntime[]
  mode: 'warm' | 'cold'
  healthyColor: THREE.Color
  stressedColor: THREE.Color
  lean: number
}

const flowMovers: FlowMover[] = []
const pulseObjects: PulseObject[] = []
const timelineShaderMaterials: THREE.ShaderMaterial[] = []
const cloudVolumes: CloudVolumeRuntime[] = []
const cloudMaterials: THREE.RawShaderMaterial[] = []
const revealUniforms: RevealUniformRuntime[] = []
const revealOpacities: RevealOpacityRuntime[] = []
const vegetationRuntimes: VegetationRuntime[] = []
let officialCloudTexture: THREE.Data3DTexture | null = null
let terrainMaterial: THREE.ShaderMaterial | null = null
let sunBeamMaterial: THREE.ShaderMaterial | null = null
let sunHaloMaterial: THREE.SpriteMaterial | null = null
let sunInnerGlowMaterial: THREE.SpriteMaterial | null = null
let sunCoronaMaterial: THREE.SpriteMaterial | null = null
let sunSpotLight: THREE.SpotLight | null = null
let warmBounceLight: THREE.PointLight | null = null
let coldFillLight: THREE.PointLight | null = null

const FLOW_COLORS = {
  warm: 0xff5634,
  warmLight: 0xffa05d,
  upperWarm: 0xff7654,
  upperCold: 0xa9ddff,
  cold: 0x79c9ff,
  surface: 0x47e8b6,
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 999.17) * 43758.5453
  return x - Math.floor(x)
}

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
  disposableGeometries.push(geometry)
  return geometry
}

function registerMaterial<T extends THREE.Material>(material: T): T {
  disposableMaterials.push(material)
  return material
}

function registerUniformReveal(
  material: THREE.ShaderMaterial | THREE.RawShaderMaterial,
  uniform: string,
  baseValue: number,
  start: number,
  end: number,
) {
  revealUniforms.push({ material, uniform, baseValue, start, end })
}

function registerOpacityReveal(
  material: THREE.Material & { opacity: number },
  baseOpacity: number,
  start: number,
  end: number,
) {
  revealOpacities.push({ material, baseOpacity, start, end })
}

function createRadialTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128)
  g.addColorStop(0, inner)
  g.addColorStop(0.36, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  disposableTextures.push(texture)
  return texture
}

function applyGeneratedSceneBackground() {
  if (!scene) return
  const texture = new THREE.TextureLoader().load(
    thermalAtmosphereBackgroundUrl,
    (loadedTexture) => {
      if (sceneDisposed) {
        loadedTexture.dispose()
        return
      }
      loadedTexture.colorSpace = THREE.SRGBColorSpace
      loadedTexture.needsUpdate = true
    },
    undefined,
    () => console.warn('大气背景图加载失败，继续使用深色背景'),
  )
  texture.colorSpace = THREE.SRGBColorSpace
  disposableTextures.push(texture)
  scene.background = texture
  scene.backgroundIntensity = 0.72
  scene.backgroundBlurriness = 0.015
}

function createLabelTexture(text: string, accent: string) {
  const canvas = document.createElement('canvas')
  const fontSize = 164
  const horizontalPadding = 118
  const verticalPadding = 72
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')!
  measureContext.font = `900 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  const measuredWidth = Math.ceil(measureContext.measureText(text).width)
  canvas.width = Math.max(560, measuredWidth + horizontalPadding * 2)
  canvas.height = fontSize + verticalPadding * 2
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const boxX = 16
  const boxY = 20
  const boxW = canvas.width - 32
  const boxH = canvas.height - 40
  const radius = 38

  ctx.beginPath()
  ctx.moveTo(boxX + radius, boxY)
  ctx.lineTo(boxX + boxW - radius, boxY)
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius)
  ctx.lineTo(boxX + boxW, boxY + boxH - radius)
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH)
  ctx.lineTo(boxX + radius, boxY + boxH)
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius)
  ctx.lineTo(boxX, boxY + radius)
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY)
  ctx.closePath()
  ctx.fillStyle = 'rgba(3, 15, 27, 0.94)'
  ctx.fill()
  ctx.lineWidth = 7
  ctx.strokeStyle = accent
  ctx.stroke()

  ctx.font = `900 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 4
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.515)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 8, 12)
  texture.needsUpdate = true
  disposableTextures.push(texture)
  return { texture, aspect: canvas.width / canvas.height }
}

function createLabelSprite(
  text: string,
  accent: string,
  position: THREE.Vector3,
  width = 3.2,
  revealStart = 0,
  revealEnd = 0,
) {
  const { texture, aspect } = createLabelTexture(text, accent)
  const material = registerMaterial(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  )
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width * aspect, width, 1)
  sprite.position.copy(position)
  sprite.renderOrder = 20
  rootGroup.add(sprite)
  registerOpacityReveal(material, 1, revealStart, revealEnd)
  return sprite
}

function createGlowSprite(
  color: string,
  position: THREE.Vector3,
  scale: number,
  opacity = 0.75,
  revealStart = 0,
  revealEnd = 0,
) {
  const texture = createRadialTexture(color, 'rgba(0,0,0,0)')
  const material = registerMaterial(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  const sprite = new THREE.Sprite(material)
  sprite.scale.setScalar(scale)
  sprite.position.copy(position)
  rootGroup.add(sprite)
  registerOpacityReveal(material, opacity, revealStart, revealEnd)
  return sprite
}

function createSunCoronaTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const data = image.data
  const center = size * 0.5

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - center) / center
      const dy = (y - center) / center
      const r = Math.sqrt(dx * dx + dy * dy)
      const a = Math.atan2(dy, dx)
      const irregular =
        Math.sin(a * 7.0 + 0.8) * 0.45 +
        Math.sin(a * 13.0 - 1.4) * 0.28 +
        Math.sin(a * 23.0 + 2.1) * 0.14
      const coronaEdge = 0.54 + irregular * 0.025
      const core = Math.max(0, 1 - r / 0.34)
      const innerGlow = Math.max(0, 1 - r / 0.62)
      const outerGlow = Math.max(0, 1 - r / (0.98 + irregular * 0.018))
      const corona = Math.exp(-Math.pow((r - coronaEdge) * 7.2, 2))
      const alpha = Math.min(1, core * 0.78 + innerGlow * 0.48 + outerGlow * 0.18 + corona * 0.20)
      const index = (y * size + x) * 4
      data[index] = 255
      data[index + 1] = Math.round(170 + 72 * Math.max(0, 1 - r))
      data[index + 2] = Math.round(54 + 120 * Math.max(0, 1 - r * 1.25))
      data[index + 3] = Math.round(alpha * 255)
    }
  }

  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  disposableTextures.push(texture)
  return texture
}

function createSunlightToHotGround(sunPosition: THREE.Vector3) {
  const hotTarget = new THREE.Vector3(HOT_CENTER_X, terrainWorldY(HOT_CENTER_X, 0) + 0.10, 0)
  const lightTarget = new THREE.Object3D()
  lightTarget.position.copy(hotTarget)
  rootGroup.add(lightTarget)

  // 保留真实的定向受热关系，但不再绘制硬质“光束线”。
  // 视觉上由太阳自身的多层光辉表现，SpotLight 只负责照亮热地面。
  const sunSpot = new THREE.SpotLight(0xffb65a, 11.5, 26, Math.PI * 0.19, 0.72, 1.05)
  sunSpot.position.copy(sunPosition)
  sunSpot.target = lightTarget
  sunSpot.castShadow = false
  rootGroup.add(sunSpot)
  sunSpotLight = sunSpot

  const warmBounce = new THREE.PointLight(0xff8a42, 2.4, 8.5, 1.8)
  warmBounce.position.set(hotTarget.x, hotTarget.y + 1.15, hotTarget.z)
  rootGroup.add(warmBounce)
  warmBounceLight = warmBounce

  const direction = hotTarget.clone().sub(sunPosition)
  const beamLength = direction.length()
  sunBeamMaterial = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uOpacity: { value: 0.34 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uReveal;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float longitudinal = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(uReveal - 0.08, uReveal, vUv.y));
          float softPulse = 0.82 + 0.18 * sin(uTime * 0.85 + vUv.y * 11.0);
          float edge = pow(sin(vUv.x * 3.14159265), 0.72);
          float alpha = longitudinal * edge * softPulse * uOpacity;
          if (alpha < 0.004) discard;
          vec3 color = mix(vec3(1.0, 0.55, 0.16), vec3(1.0, 0.92, 0.58), vUv.y);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  sunBeamMaterial.toneMapped = false
  timelineShaderMaterials.push(sunBeamMaterial)

  const beam = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(0.72, 0.10, beamLength, 32, 1, true)),
    sunBeamMaterial,
  )
  beam.position.copy(sunPosition).add(hotTarget).multiplyScalar(0.5)
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  beam.renderOrder = 3
  rootGroup.add(beam)
}

function createSun() {
  const group = new THREE.Group()
  const sunPosition = new THREE.Vector3(-9.0, 7.25, -1.9)
  group.position.copy(sunPosition)

  const fallbackMaterial = registerMaterial(
    new THREE.MeshStandardMaterial({
      color: 0xffb53a,
      emissive: 0xff7d18,
      emissiveIntensity: 2.8,
      roughness: 0.72,
      metalness: 0,
    }),
  )

  const sun = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.72, 64, 64)),
    fallbackMaterial,
  )
  sun.renderOrder = 5
  group.add(sun)

  new THREE.TextureLoader().load(
    SUN_TEXTURE_URL,
    (texture) => {
      if (sceneDisposed) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy?.() ?? 4, 8)
      disposableTextures.push(texture)
      fallbackMaterial.map = texture
      fallbackMaterial.emissiveMap = texture
      fallbackMaterial.needsUpdate = true
    },
    undefined,
    () => {
      console.warn('太阳贴图加载失败，继续使用程序化太阳材质')
    },
  )

  const haloTexture = createRadialTexture('rgba(255,221,132,0.96)', 'rgba(255,93,0,0)')
  const haloMaterial = registerMaterial(
    new THREE.SpriteMaterial({
      map: haloTexture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  sunHaloMaterial = haloMaterial
  const halo = new THREE.Sprite(haloMaterial)
  halo.scale.set(3.15, 3.15, 1)
  group.add(halo)

  const innerGlowTexture = createRadialTexture('rgba(255,246,199,0.92)', 'rgba(255,165,55,0)')
  const innerGlowMaterial = registerMaterial(new THREE.SpriteMaterial({
    map: innerGlowTexture,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
  sunInnerGlowMaterial = innerGlowMaterial
  const innerGlow = new THREE.Sprite(innerGlowMaterial)
  innerGlow.scale.set(1.72, 1.72, 1)
  group.add(innerGlow)

  const coronaMaterial = registerMaterial(new THREE.SpriteMaterial({
    map: createSunCoronaTexture(),
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  }))
  sunCoronaMaterial = coronaMaterial
  const corona = new THREE.Sprite(coronaMaterial)
  corona.scale.set(3.7, 3.7, 1)
  corona.renderOrder = 4
  group.add(corona)

  const sunLight = new THREE.PointLight(0xffb45c, 5.0, 26, 1.45)
  sunLight.position.set(0, 0, 0)
  group.add(sunLight)

  rootGroup.add(group)
  pulseObjects.push({ object: halo, baseScale: 3.15, strength: 0.035, offset: 0 })
  pulseObjects.push({ object: innerGlow, baseScale: 1.72, strength: 0.025, offset: 0.7 })
  pulseObjects.push({ object: corona, baseScale: 3.7, strength: 0.018, offset: 1.2 })
  createSunlightToHotGround(sunPosition)
}

const TERRAIN_WIDTH = 14.8
const TERRAIN_DEPTH = 9.0
const TERRAIN_BASE_HEIGHT = 1.12
const TERRAIN_TOP_Y = TERRAIN_BASE_HEIGHT * 0.5
const HOT_END_X = -TERRAIN_WIDTH * 0.1
const COLD_START_X = TERRAIN_WIDTH * 0.1
const HOT_CENTER_X = -TERRAIN_WIDTH * 0.34
const COLD_CENTER_X = TERRAIN_WIDTH * 0.34
const TERRAIN_TRANSITION = 0.46

function fract(value: number) {
  return value - Math.floor(value)
}

function smooth01(value: number) {
  return value * value * (3 - 2 * value)
}

function hashNoise2D(x: number, y: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123)
}

function valueNoise2D(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = fract(x)
  const fy = fract(y)
  const ux = smooth01(fx)
  const uy = smooth01(fy)

  const a = hashNoise2D(ix, iy)
  const b = hashNoise2D(ix + 1, iy)
  const c = hashNoise2D(ix, iy + 1)
  const d = hashNoise2D(ix + 1, iy + 1)
  const ab = THREE.MathUtils.lerp(a, b, ux)
  const cd = THREE.MathUtils.lerp(c, d, ux)
  return THREE.MathUtils.lerp(ab, cd, uy)
}

function fbmNoise2D(x: number, y: number) {
  let value = 0
  let amplitude = 0.5
  let px = x
  let py = y
  for (let i = 0; i < 5; i++) {
    value += valueNoise2D(px, py) * amplitude
    const nx = 1.72 * px - 1.31 * py + 11.7
    const ny = 1.31 * px + 1.72 * py + 7.3
    px = nx
    py = ny
    amplitude *= 0.5
  }
  return value
}

function smoothstepJS(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function terrainHeight(x: number, z: number) {
  const pX = x * 0.52
  const pZ = z * 0.52
  const broad = fbmNoise2D(pX, pZ)
  const detail = fbmNoise2D(pX * 1.9 + 17.3, pZ * 1.9 - 8.1)
  const ridgeBase = fbmNoise2D(pX * 0.92 - 6.2, pZ * 0.92 + 13.8)
  const ridge = Math.pow(1 - Math.abs(ridgeBase * 2 - 1), 2.25)

  const hotMask = 1 - smoothstepJS(HOT_END_X - TERRAIN_TRANSITION, HOT_END_X + TERRAIN_TRANSITION, x)
  const coldMask = smoothstepJS(COLD_START_X - TERRAIN_TRANSITION, COLD_START_X + TERRAIN_TRANSITION, x)
  const middleMask = Math.max(0, 1 - hotMask - coldMask)

  const coldProgress = THREE.MathUtils.clamp((x - COLD_START_X) / (TERRAIN_WIDTH * 0.4), 0, 1)
  const hotHeight = 0.075 + broad * 0.28 + detail * 0.12 + ridge * 0.045
  const middleHeight = 0.045 + broad * 0.145 + detail * 0.045
  const coldHeight = 0.14 + broad * 0.34 + ridge * (0.30 + coldProgress * 0.54) + detail * 0.09

  return hotHeight * hotMask + middleHeight * middleMask + coldHeight * coldMask
}

function terrainWorldY(x: number, z: number) {
  return TERRAIN_TOP_Y + terrainHeight(x, z)
}

function createTerrainMaterial() {
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uLightDirection: { value: new THREE.Vector3(-0.45, 0.82, 0.55).normalize() },
        uWarmLight: { value: new THREE.Color('#ff8a46') },
        uColdLight: { value: new THREE.Color('#63b8ff') },
        uHotEndX: { value: HOT_END_X },
        uColdStartX: { value: COLD_START_X },
        uTerrainWidth: { value: TERRAIN_WIDTH },
        uTransition: { value: TERRAIN_TRANSITION },
        uHotHeat: { value: 0 },
        uColdChill: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPosition;
        varying float vTerrainHeight;
        varying float vTopFactor;
        uniform float uHotEndX;
        uniform float uColdStartX;
        uniform float uTerrainWidth;
        uniform float uTransition;

        float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise2d(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          // GLSL 的 mat2 构造参数按列排列，此写法与 CPU 端旋转公式完全一致。
          mat2 rotateScale = mat2(1.72, 1.31, -1.31, 1.72);
          for (int i = 0; i < 5; i++) {
            value += noise2d(p) * amplitude;
            p = rotateScale * p + vec2(11.7, 7.3);
            amplitude *= 0.5;
          }
          return value;
        }

        float terrainHeightAt(vec2 xz) {
          vec2 p = xz * 0.52;
          float broad = fbm(p);
          float detail = fbm(p * 1.9 + vec2(17.3, -8.1));
          float ridgeBase = fbm(p * 0.92 + vec2(-6.2, 13.8));
          float ridge = pow(1.0 - abs(ridgeBase * 2.0 - 1.0), 2.25);

          float hotMask = 1.0 - smoothstep(uHotEndX - uTransition, uHotEndX + uTransition, xz.x);
          float coldMask = smoothstep(uColdStartX - uTransition, uColdStartX + uTransition, xz.x);
          float middleMask = max(0.0, 1.0 - hotMask - coldMask);
          float coldProgress = clamp((xz.x - uColdStartX) / (uTerrainWidth * 0.4), 0.0, 1.0);

          float hotHeight = 0.075 + broad * 0.28 + detail * 0.12 + ridge * 0.045;
          float middleHeight = 0.045 + broad * 0.145 + detail * 0.045;
          float coldHeight = 0.14 + broad * 0.34 + ridge * (0.30 + coldProgress * 0.54) + detail * 0.09;
          return hotHeight * hotMask + middleHeight * middleMask + coldHeight * coldMask;
        }

        void main() {
          vec3 transformed = position;
          float h = terrainHeightAt(position.xz);
          float topFactor = smoothstep(0.62, 0.88, normal.y);
          float sideUpperFactor = (1.0 - topFactor) * smoothstep(0.12, 0.45, position.y);
          transformed.y += h * max(topFactor, sideUpperFactor);

          float eps = 0.045;
          float hx = terrainHeightAt(position.xz + vec2(eps, 0.0));
          float hz = terrainHeightAt(position.xz + vec2(0.0, eps));
          vec3 terrainNormal = normalize(vec3(-(hx - h) / eps, 1.0, -(hz - h) / eps));
          vec3 localNormal = normalize(mix(normal, terrainNormal, topFactor));

          vec4 world = modelMatrix * vec4(transformed, 1.0);
          vWorldPosition = world.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
          vLocalPosition = transformed;
          vTerrainHeight = h;
          vTopFactor = topFactor;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uLightDirection;
        uniform vec3 uWarmLight;
        uniform vec3 uColdLight;
        uniform float uHotEndX;
        uniform float uColdStartX;
        uniform float uTransition;
        uniform float uHotHeat;
        uniform float uColdChill;

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPosition;
        varying float vTerrainHeight;
        varying float vTopFactor;

        float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise2d(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          mat2 rotateScale = mat2(1.68, -1.27, 1.27, 1.68);
          for (int i = 0; i < 5; i++) {
            value += noise2d(p) * amplitude;
            p = rotateScale * p + vec2(9.1, 13.7);
            amplitude *= 0.5;
          }
          return value;
        }

        vec3 topSurfaceColor() {
          float x = vLocalPosition.x;
          vec2 p = vLocalPosition.xz;
          float macroNoise = fbm(p * 0.43);
          float fineNoise = fbm(p * 2.25 + vec2(7.0, -5.0));
          float grain = noise2d(p * 10.5);
          float mineral = fbm(p * 4.6 + vec2(-13.0, 19.0));
          float vein = abs(noise2d(p * 3.15) - noise2d(p * 3.15 + vec2(0.075, -0.045)));
          float dryCrack = 1.0 - smoothstep(0.025, 0.095, vein);

          vec3 hotDry = vec3(0.31, 0.125, 0.050);
          vec3 hotSoil = vec3(0.51, 0.265, 0.095);
          vec3 hotGreen = vec3(0.215, 0.30, 0.105);
          vec3 hotColor = mix(hotDry, hotSoil, macroNoise);
          hotColor = mix(hotColor, hotGreen, smoothstep(0.57, 0.78, fineNoise) * 0.42);
          hotColor *= 1.0 - dryCrack * (0.08 + uHotHeat * 0.22);
          vec3 heatedColor = mix(vec3(0.53, 0.16, 0.035), vec3(0.78, 0.29, 0.055), macroNoise * 0.46);
          hotColor = mix(hotColor * 0.74, heatedColor, uHotHeat * 0.62);

          vec3 middleSoil = vec3(0.20, 0.275, 0.135);
          vec3 middleGreen = vec3(0.27, 0.42, 0.19);
          vec3 middleColor = mix(middleSoil, middleGreen, smoothstep(0.34, 0.72, macroNoise));

          vec3 coldSoil = vec3(0.105, 0.205, 0.235);
          vec3 coldRock = vec3(0.265, 0.335, 0.37);
          vec3 coldMoss = vec3(0.145, 0.30, 0.255);
          vec3 coldColor = mix(coldSoil, coldRock, smoothstep(0.28, 0.76, fineNoise));
          coldColor = mix(coldColor, coldMoss, smoothstep(0.58, 0.80, macroNoise) * 0.36);
          vec3 chilledColor = mix(vec3(0.075, 0.235, 0.37), vec3(0.25, 0.55, 0.67), fineNoise * 0.52);
          coldColor = mix(coldColor * 0.76, chilledColor, uColdChill * 0.64);

          float snow = smoothstep(0.82, 1.18, vTerrainHeight + fineNoise * 0.18);
          snow *= smoothstep(1.15, 2.2, x);
          coldColor = mix(coldColor, vec3(0.72, 0.80, 0.82), snow * 0.74);

          float hotMask = 1.0 - smoothstep(uHotEndX - uTransition, uHotEndX + uTransition, x);
          float coldMask = smoothstep(uColdStartX - uTransition, uColdStartX + uTransition, x);
          float middleMask = max(0.0, 1.0 - hotMask - coldMask);
          vec3 color = hotColor * hotMask + middleColor * middleMask + coldColor * coldMask;

          // 高频颗粒和裸岩斑点，模拟无需贴图资源的地表纹理。
          color *= 0.82 + fineNoise * 0.24 + mineral * 0.08;
          color += (grain - 0.5) * 0.052;

          return color;
        }

        vec3 sideColor() {
          float layerNoise = fbm(vWorldPosition.xz * 0.72 + vWorldPosition.y * 0.8);
          float strata = 0.5 + 0.5 * sin(vWorldPosition.y * 21.0 + layerNoise * 7.0);
          float fractures = smoothstep(0.60, 0.86, fbm(vWorldPosition.xy * vec2(2.4, 4.8)));
          vec3 darkSoil = vec3(0.070, 0.042, 0.032);
          vec3 lightSoil = vec3(0.225, 0.125, 0.066);
          vec3 layerColor = mix(darkSoil, lightSoil, strata * 0.46 + layerNoise * 0.18);
          return layerColor * (1.0 - fractures * 0.18);
        }

        void main() {
          vec3 baseColor = mix(sideColor(), topSurfaceColor(), vTopFactor);
          vec3 normal = normalize(vWorldNormal);
          float diffuse = max(dot(normal, normalize(uLightDirection)), 0.0);
          float hemi = normal.y * 0.5 + 0.5;
          float light = 0.46 + diffuse * 0.66 + hemi * 0.12;

          float hotTint = (1.0 - smoothstep(uHotEndX - uTransition, uHotEndX + uTransition, vLocalPosition.x)) * vTopFactor;
          float coldTint = smoothstep(uColdStartX - uTransition, uColdStartX + uTransition, vLocalPosition.x) * vTopFactor;
          vec3 color = baseColor * light;
          color += uWarmLight * hotTint * 0.035;
          color += uColdLight * coldTint * 0.025;

          float rim = pow(1.0 - max(dot(normal, normalize(cameraPosition - vWorldPosition)), 0.0), 3.0);
          color += mix(vec3(0.10, 0.17, 0.20), vec3(0.17, 0.28, 0.33), coldTint) * rim * 0.26;

          float distanceFade = 1.0 - smoothstep(7.0, 25.0, length(cameraPosition - vWorldPosition));
          color *= 0.92 + distanceFade * 0.08;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }),
  )
  terrainMaterial = material
  return material
}

function createTerrain() {
  // 一体式高细分底座：顶面由 vertex shader 隆起，侧壁顶缘同步跟随，彻底消除“地表悬空”。
  const geometry = registerGeometry(
    new THREE.BoxGeometry(
      TERRAIN_WIDTH,
      TERRAIN_BASE_HEIGHT,
      TERRAIN_DEPTH,
      180,
      10,
      114,
    ),
  )
  const terrain = new THREE.Mesh(geometry, createTerrainMaterial())
  terrain.position.y = 0
  terrain.castShadow = false
  terrain.receiveShadow = false
  rootGroup.add(terrain)

  const warmX = HOT_CENTER_X
  const coldX = COLD_CENTER_X
  const warmY = terrainWorldY(warmX, 0)
  const coldY = terrainWorldY(coldX, 0)
  const middleY = terrainWorldY(0, 0)

  createGroundRippleField(warmX, warmY + 0.075, 0xff4e2d, 0xffb15d, 2.10, 0.82, 0.92, 0.07, 0.16)
  createGroundRippleField(0, middleY + 0.070, 0x32dcb0, 0xa1ffe1, 2.72, 0.48, 0.72, 0.84, 0.94)
  createGroundRippleField(coldX, coldY + 0.075, 0x3d98ff, 0xbfeaff, 2.14, 0.62, 0.82, 0.34, 0.45)

  const labelZ = TERRAIN_DEPTH * 0.48
  const labelSampleZ = TERRAIN_DEPTH * 0.40
  createLabelSprite('热地面', '#ff6538', new THREE.Vector3(warmX, terrainWorldY(warmX, labelSampleZ) + 0.34, labelZ), 0.52)
  createLabelSprite('近地面', '#5de0aa', new THREE.Vector3(0, terrainWorldY(0, labelSampleZ) + 0.34, labelZ), 0.48)
  createLabelSprite('冷地面', '#3298ff', new THREE.Vector3(coldX, terrainWorldY(coldX, labelSampleZ) + 0.38, labelZ), 0.52)
  createLabelSprite(
    '近地面低压 L',
    '#ff4b2b',
    new THREE.Vector3(warmX, warmY + 0.30, 1.62),
    0.42,
    0.48,
    0.58,
  )
  createLabelSprite(
    '近地面高压 H',
    '#258eff',
    new THREE.Vector3(coldX, coldY + 0.32, 1.62),
    0.42,
    0.48,
    0.58,
  )
  createLabelSprite(
    '高空高压 H',
    '#56c8ff',
    new THREE.Vector3(warmX, 5.72, 0.72),
    0.44,
    0.48,
    0.58,
  )
  createLabelSprite(
    '高空低压 L',
    '#ff8068',
    new THREE.Vector3(coldX, 5.72, 0.72),
    0.44,
    0.48,
    0.58,
  )

  // 三段区域中心增加很轻的地面光，避免盖住 shader 纹理。
  createRegionGlow(warmX, warmY + 0.05, 0xff5f2e, 0.15, 0.055, 0.15)
  createRegionGlow(0, middleY + 0.045, 0x53e7b0, 0.07, 0.84, 0.94)
  createRegionGlow(coldX, coldY + 0.05, 0x2b8cff, 0.13, 0.32, 0.44)

  createVegetationReference('warm', warmX - 1.25, -1.86, 1.05, 21)
  createVegetationReference('warm', warmX + 1.24, 1.78, 0.82, 32)
  createVegetationReference('warm', warmX - 0.72, 2.62, 0.68, 43)
  createVegetationReference('cold', coldX + 0.92, -1.92, 1.12, 61)
  createVegetationReference('cold', coldX - 1.18, 1.82, 0.90, 72)
  createVegetationReference('cold', coldX + 1.34, 2.36, 0.76, 83)
  createGroundFlora()
  createTerrainSurfaceDetails()

}

function createVegetationReference(
  mode: 'warm' | 'cold',
  x: number,
  z: number,
  scale: number,
  seed: number,
) {
  const isWarm = mode === 'warm'
  const group = new THREE.Group()
  group.position.set(x, terrainWorldY(x, z) + 0.04, z)
  group.scale.setScalar(scale)
  group.rotation.y = (seededRandom(seed) - 0.5) * 0.7

  const trunkMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: isWarm ? 0x59402a : 0x52656c,
    roughness: 0.96,
    metalness: 0,
  }))
  const healthyColor = new THREE.Color(isWarm ? 0x3f7c2b : 0x285d45)
  const stressedColor = new THREE.Color(isWarm ? 0x8b5124 : 0x5f99aa)
  const foliageMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: healthyColor,
    roughness: 0.88,
    metalness: 0,
  }))
  const parts: VegetationPartRuntime[] = []

  const trunkHeight = isWarm ? 0.86 : 1.08
  const trunk = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(isWarm ? 0.045 : 0.06, isWarm ? 0.085 : 0.105, trunkHeight, 8)),
    trunkMaterial,
  )
  trunk.position.y = trunkHeight * 0.5
  trunk.rotation.z = (seededRandom(seed + 2) - 0.5) * 0.08
  group.add(trunk)

  if (isWarm) {
    const crownPositions = [
      [-0.30, 0.79, 0.02],
      [0.28, 0.83, 0.05],
      [-0.17, 1.00, -0.04],
      [0.17, 1.08, 0.03],
      [0.01, 0.89, 0.20],
      [0.04, 0.87, -0.20],
      [-0.05, 1.16, 0.02],
      [0.31, 0.98, -0.10],
    ]
    crownPositions.forEach(([px, py, pz], index) => {
      const leaf = new THREE.Mesh(
        registerGeometry(new THREE.DodecahedronGeometry(0.18 + seededRandom(seed + index) * 0.055, 0)),
        foliageMaterial,
      )
      leaf.position.set(px!, py!, pz!)
      leaf.scale.set(1.08, 0.68, 0.82)
      leaf.rotation.z = (seededRandom(seed + index + 10) - 0.5) * 0.45
      group.add(leaf)
      parts.push({
        mesh: leaf,
        baseY: leaf.position.y,
        baseRotationZ: leaf.rotation.z,
        baseScaleY: leaf.scale.y,
        bend: px! < 0 ? -1 : 1,
      })
    })
  } else {
    // 冷区采用迎风偏冠的晶霜树，而不是常规的圆锥形“圣诞树”。
    for (let level = 0; level < 6; level += 1) {
      const side = level % 2 === 0 ? -1 : 1
      const branchLength = 0.36 - level * 0.025
      const branch = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.018, 0.032, branchLength, 7)),
        trunkMaterial,
      )
      branch.position.set(side * branchLength * 0.34, 0.48 + level * 0.135, (seededRandom(seed + level + 20) - 0.5) * 0.12)
      branch.rotation.z = side * (0.92 + level * 0.035)
      branch.rotation.y = (seededRandom(seed + level + 40) - 0.5) * 0.5
      group.add(branch)

      const frostCluster = new THREE.Mesh(
        registerGeometry(new THREE.OctahedronGeometry(0.17 - level * 0.008, 0)),
        foliageMaterial,
      )
      frostCluster.position.set(
        side * (0.28 + seededRandom(seed + level + 60) * 0.08),
        0.55 + level * 0.135,
        (seededRandom(seed + level + 80) - 0.5) * 0.18,
      )
      frostCluster.scale.set(1.05, 0.72, 0.78)
      frostCluster.rotation.set(
        seededRandom(seed + level + 100) * 0.4,
        seededRandom(seed + level + 120) * Math.PI,
        side * 0.18,
      )
      group.add(frostCluster)
      parts.push({
        mesh: frostCluster,
        baseY: frostCluster.position.y,
        baseRotationZ: frostCluster.rotation.z,
        baseScaleY: frostCluster.scale.y,
        bend: side * 0.16,
      })
    }

    const crownTip = new THREE.Mesh(
      registerGeometry(new THREE.OctahedronGeometry(0.18, 0)),
      foliageMaterial,
    )
    crownTip.position.set(-0.08, 1.28, 0)
    crownTip.scale.set(0.82, 1.18, 0.78)
    crownTip.rotation.z = -0.18
    group.add(crownTip)
    parts.push({
      mesh: crownTip,
      baseY: crownTip.position.y,
      baseRotationZ: crownTip.rotation.z,
      baseScaleY: crownTip.scale.y,
      bend: -0.18,
    })
  }

  const grassCount = isWarm ? 13 : 10
  for (let index = 0; index < grassCount; index += 1) {
    const angle = (index / grassCount) * Math.PI * 2 + seededRandom(seed + 100 + index) * 0.42
    const radius = 0.34 + seededRandom(seed + 130 + index) * 0.34
    const grass = new THREE.Mesh(
      registerGeometry(new THREE.ConeGeometry(0.026, 0.26 + seededRandom(seed + 150 + index) * 0.18, 5)),
      foliageMaterial,
    )
    grass.position.set(Math.cos(angle) * radius, grass.geometry.parameters.height * 0.5, Math.sin(angle) * radius)
    grass.rotation.z = (seededRandom(seed + 180 + index) - 0.5) * 0.22
    group.add(grass)
    parts.push({
      mesh: grass,
      baseY: grass.position.y,
      baseRotationZ: grass.rotation.z,
      baseScaleY: 1,
      bend: Math.cos(angle) >= 0 ? 1 : -1,
    })
  }

  rootGroup.add(group)
  vegetationRuntimes.push({
    group,
    foliageMaterial,
    parts,
    mode,
    healthyColor,
    stressedColor,
    lean: seededRandom(seed + 240) > 0.5 ? 1 : -1,
  })
}

// 近地面花草：只在中间“近地面”区域散布，热地面/冷地面不加
function createGroundFlora() {
  const grassMat = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x4f9a3a, roughness: 0.9, metalness: 0,
  }))
  const flowerColors = [0xffc94a, 0xff6a8a, 0xffffff, 0xffa24a]

  // 仅中间区域（近地面），向内收拢、减少外侧
  const bandW = 1.9
  const halfD = (TERRAIN_DEPTH / 2 - 0.6) * 0.7

  // 草叶
  for (let i = 0; i < 30; i += 1) {
    const x = (seededRandom(i * 3 + 1) - 0.5) * 2 * bandW
    const z = (seededRandom(i * 3 + 2) - 0.5) * 2 * halfD
    const h = 0.16 + seededRandom(i * 3 + 3) * 0.2
    const grass = new THREE.Mesh(
      registerGeometry(new THREE.ConeGeometry(0.02, h, 5)),
      grassMat,
    )
    grass.position.set(x, terrainWorldY(x, z) + h * 0.45, z)
    grass.rotation.z = (seededRandom(i * 7 + 4) - 0.5) * 0.3
    grass.rotation.x = (seededRandom(i * 7 + 5) - 0.5) * 0.3
    rootGroup.add(grass)
  }

  // 小花
  for (let i = 0; i < 10; i += 1) {
    const x = (seededRandom(i * 5 + 11) - 0.5) * 2 * bandW
    const z = (seededRandom(i * 5 + 12) - 0.5) * 2 * halfD
    const baseY = terrainWorldY(x, z)
    const stemH = 0.2 + seededRandom(i * 5 + 13) * 0.12
    const stem = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.008, 0.012, stemH, 5)),
      grassMat,
    )
    stem.position.set(x, baseY + stemH * 0.5, z)
    rootGroup.add(stem)

    const color = flowerColors[Math.floor(seededRandom(i * 5 + 14) * flowerColors.length)]!
    const head = new THREE.Mesh(
      registerGeometry(new THREE.SphereGeometry(0.045 + seededRandom(i * 5 + 15) * 0.02, 8, 8)),
      registerMaterial(new THREE.MeshStandardMaterial({
        color, roughness: 0.6, metalness: 0,
        emissive: color, emissiveIntensity: 0.12,
      })),
    )
    head.position.set(x, baseY + stemH + 0.03, z)
    rootGroup.add(head)
  }
}

function createTerrainSurfaceDetails() {
  const rockMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x34434a,
    roughness: 1,
    metalness: 0.02,
    flatShading: true,
  }))
  const warmRockMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x59402f,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  }))

  for (let index = 0; index < 42; index += 1) {
    const coldSide = index >= 14
    const x = coldSide
      ? THREE.MathUtils.lerp(1.3, TERRAIN_WIDTH * 0.47, seededRandom(300 + index))
      : THREE.MathUtils.lerp(-TERRAIN_WIDTH * 0.47, -1.3, seededRandom(300 + index))
    const z = THREE.MathUtils.lerp(-TERRAIN_DEPTH * 0.43, TERRAIN_DEPTH * 0.43, seededRandom(360 + index))
    const radius = (coldSide ? 0.065 : 0.045) + seededRandom(420 + index) * (coldSide ? 0.13 : 0.085)
    const rock = new THREE.Mesh(
      registerGeometry(new THREE.DodecahedronGeometry(radius, 0)),
      coldSide ? rockMaterial : warmRockMaterial,
    )
    rock.position.set(x, terrainWorldY(x, z) + radius * 0.42, z)
    rock.scale.set(1.25 + seededRandom(480 + index) * 0.9, 0.62 + seededRandom(520 + index) * 0.5, 0.82 + seededRandom(560 + index) * 0.72)
    rock.rotation.set(seededRandom(610 + index), seededRandom(650 + index) * Math.PI, seededRandom(690 + index))
    rootGroup.add(rock)
  }

  const strataMaterial = registerMaterial(new THREE.LineBasicMaterial({
    color: 0xb47448,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  }))
  for (let layer = 0; layer < 5; layer += 1) {
    const points: THREE.Vector3[] = []
    for (let step = 0; step <= 48; step += 1) {
      const x = THREE.MathUtils.lerp(-TERRAIN_WIDTH * 0.49, TERRAIN_WIDTH * 0.49, step / 48)
      const y = -0.45 + layer * 0.18 + Math.sin(step * 0.64 + layer * 1.3) * 0.026
      points.push(new THREE.Vector3(x, y, TERRAIN_DEPTH * 0.501))
    }
    const line = new THREE.Line(
      registerGeometry(new THREE.BufferGeometry().setFromPoints(points)),
      strataMaterial,
    )
    rootGroup.add(line)
  }
}

function createRegionGlow(
  x: number,
  y: number,
  color: number,
  opacity: number,
  revealStart = 0,
  revealEnd = 0,
) {
  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  const circle = new THREE.Mesh(
    registerGeometry(new THREE.CircleGeometry(1.8, 64)),
    material,
  )
  circle.rotation.x = -Math.PI / 2
  circle.position.set(x, y + 0.018, 0)
  rootGroup.add(circle)
  registerOpacityReveal(material, opacity, revealStart, revealEnd)
}

function createGroundRippleField(
  x: number,
  y: number,
  colorA: number,
  colorB: number,
  radius: number,
  opacity: number,
  speed: number,
  revealStart = 0,
  revealEnd = 0,
) {
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) },
        uOpacity: { value: opacity },
        uSpeed: { value: speed },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uOpacity;
        uniform float uSpeed;
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float angle = atan(p.y, p.x);
          float radialNoise = (hash21(vec2(floor(angle * 7.0), floor(uTime * 0.25))) - 0.5) * 0.018;
          float radiusValue = length(p) + radialNoise + sin(angle * 5.0 + uTime * 0.35) * 0.010;
          if (radiusValue > 1.0) discard;

          float waveCoord = radiusValue * 5.6 - uTime * uSpeed;
          float waveA = pow(0.5 + 0.5 * sin(waveCoord * 6.2831853), 15.0);
          float waveB = pow(0.5 + 0.5 * sin((waveCoord + 0.34) * 6.2831853), 22.0) * 0.62;
          float softBody = 0.10 * (1.0 - smoothstep(0.15, 0.98, radiusValue));
          float edgeFade = 1.0 - smoothstep(0.70, 1.0, radiusValue);
          float centerFade = smoothstep(0.06, 0.18, radiusValue);
          float alpha = (waveA + waveB + softBody) * edgeFade * centerFade * uOpacity;
          vec3 color = mix(uColorA, uColorB, clamp(radiusValue * 0.72 + waveB * 0.28, 0.0, 1.0));
          color *= 0.72 + (waveA + waveB) * 0.72;
          if (alpha < 0.008) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  material.toneMapped = false
  timelineShaderMaterials.push(material)
  registerUniformReveal(material, 'uOpacity', opacity, revealStart, revealEnd)

  const ripple = new THREE.Mesh(
    registerGeometry(new THREE.CircleGeometry(radius, 128)),
    material,
  )
  ripple.rotation.x = -Math.PI / 2
  ripple.position.set(x, y, 0)
  ripple.renderOrder = 4
  rootGroup.add(ripple)
}

function createOfficialCloudTexture() {
  if (officialCloudTexture) return officialCloudTexture

  // 采用 Three.js 官方 webgl_volume_cloud 示例同类架构：ImprovedNoise + Data3DTexture。
  const size = 80
  const data = new Uint8Array(size * size * size)
  const noise = new ImprovedNoise()
  const center = new THREE.Vector3()
  let pointer = 0

  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = x / size - 0.5
        const ny = y / size - 0.5
        const nz = z / size - 0.5
        const radial = Math.max(0, 1 - center.set(nx * 0.82, ny * 1.22, nz * 0.92).length() * 1.9)
        const n1 = noise.noise(x * 0.043, y * 0.052, z * 0.043)
        const n2 = noise.noise(x * 0.091 + 17.2, y * 0.105 - 9.4, z * 0.091 + 4.8)
        const billow = THREE.MathUtils.clamp(0.56 + n1 * 0.34 + n2 * 0.18, 0, 1)
        const density = Math.pow(radial, 1.45) * Math.pow(billow, 1.12)
        data[pointer] = Math.round(THREE.MathUtils.clamp(density, 0, 1) * 255)
        pointer += 1
      }
    }
  }

  officialCloudTexture = new THREE.Data3DTexture(data, size, size, size)
  officialCloudTexture.format = THREE.RedFormat
  officialCloudTexture.minFilter = THREE.LinearFilter
  officialCloudTexture.magFilter = THREE.LinearFilter
  officialCloudTexture.unpackAlignment = 1
  officialCloudTexture.needsUpdate = true
  disposableTextures.push(officialCloudTexture)
  return officialCloudTexture
}

function createOfficialCloudMaterial(
  tint: number,
  threshold: number,
  opacity: number,
  revealStart: number,
  revealEnd: number,
) {
  const texture = createOfficialCloudTexture()
  const material = registerMaterial(
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uMap: { value: texture },
        uCloudColor: { value: new THREE.Color(tint) },
        uCameraWorld: { value: new THREE.Vector3() },
        uThreshold: { value: threshold },
        uRange: { value: 0.12 },
        uOpacity: { value: opacity },
        uFrame: { value: 0 },
      },
      vertexShader: /* glsl */ `
        precision highp float;
        in vec3 position;
        uniform mat4 modelMatrix;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform vec3 uCameraWorld;
        out vec3 vRayOrigin;
        out vec3 vRayDirection;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vRayOrigin = vec3(inverse(modelMatrix) * vec4(uCameraWorld, 1.0));
          vRayDirection = position - vRayOrigin;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        precision highp sampler3D;
        uniform sampler3D uMap;
        uniform vec3 uCloudColor;
        uniform float uThreshold;
        uniform float uRange;
        uniform float uOpacity;
        uniform float uFrame;
        in vec3 vRayOrigin;
        in vec3 vRayDirection;
        out vec4 outColor;

        vec2 hitBox(vec3 origin, vec3 direction) {
          vec3 boxMin = vec3(-0.5);
          vec3 boxMax = vec3(0.5);
          vec3 inverseDirection = 1.0 / direction;
          vec3 nearValue = (boxMin - origin) * inverseDirection;
          vec3 farValue = (boxMax - origin) * inverseDirection;
          vec3 tMin = min(nearValue, farValue);
          vec3 tMax = max(nearValue, farValue);
          return vec2(max(tMin.x, max(tMin.y, tMin.z)), min(tMax.x, min(tMax.y, tMax.z)));
        }

        float densityAt(vec3 p) {
          return texture(uMap, p).r;
        }

        float rand(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233)) + uFrame * 0.031) * 43758.5453);
        }

        void main() {
          vec3 rayDirection = normalize(vRayDirection);
          vec2 bounds = hitBox(vRayOrigin, rayDirection);
          if (bounds.x > bounds.y) discard;
          bounds.x = max(bounds.x, 0.0);

          const int maxSteps = 72;
          float stepSize = (bounds.y - bounds.x) / float(maxSteps);
          vec3 p = vRayOrigin + rayDirection * bounds.x;
          p += rayDirection * (rand(gl_FragCoord.xy) - 0.5) * stepSize;

          vec4 accumulated = vec4(0.0);
          vec3 lightDirection = normalize(vec3(-0.62, 0.78, 0.32));

          for (int i = 0; i < maxSteps; i += 1) {
            vec3 texCoord = p + 0.5;
            float rawDensity = densityAt(texCoord);
            float density = smoothstep(uThreshold - uRange, uThreshold + uRange, rawDensity) * uOpacity;

            if (density > 0.002) {
              float towardLight = densityAt(clamp(texCoord + lightDirection * 0.035, 0.0, 1.0));
              float shade = clamp(0.82 + (rawDensity - towardLight) * 2.8 + texCoord.y * 0.24, 0.46, 1.32);
              vec3 cloudColor = mix(uCloudColor * 0.72, vec3(1.0), 0.34 + shade * 0.28);
              cloudColor *= shade;
              accumulated.rgb += (1.0 - accumulated.a) * density * cloudColor;
              accumulated.a += (1.0 - accumulated.a) * density;
              if (accumulated.a > 0.94) break;
            }

            p += rayDirection * stepSize;
          }

          if (accumulated.a < 0.008) discard;
          outColor = accumulated;
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    }),
  ) as THREE.RawShaderMaterial
  cloudMaterials.push(material)
  registerUniformReveal(material, 'uOpacity', opacity, revealStart, revealEnd)
  return material
}

function createOfficialVolumeCloud(
  base: THREE.Vector3,
  scale: THREE.Vector3,
  tint: number,
  seed: number,
  revealStart: number,
  revealEnd: number,
) {
  const material = createOfficialCloudMaterial(
    tint,
    0.29 + seededRandom(seed) * 0.035,
    0.12,
    revealStart,
    revealEnd,
  )
  const mesh = new THREE.Mesh(
    registerGeometry(new THREE.BoxGeometry(1, 1, 1)),
    material,
  ) as THREE.Mesh<THREE.BoxGeometry, THREE.RawShaderMaterial>
  mesh.position.copy(base)
  mesh.scale.copy(scale)
  mesh.rotation.y = (seededRandom(seed + 9) - 0.5) * 0.22
  mesh.renderOrder = 7
  rootGroup.add(mesh)
  cloudVolumes.push({
    mesh,
    basePosition: base.clone(),
    baseRotationY: mesh.rotation.y,
    driftPhase: seededRandom(seed + 17) * Math.PI * 2,
  })
  return mesh
}

function makeCurve(points: THREE.Vector3[]) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45)
  curve.arcLengthDivisions = 220
  return curve
}

type SmokePalette = {
  start: number
  end: number
}

function createSmokeStreamMaterial(
  palette: SmokePalette,
  options: {
    opacity: number
    flowSpeed: number
    phase: number
    haze: boolean
    waveAmplitude: number
  },
) {
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uColorStart: { value: new THREE.Color(palette.start) },
        uColorEnd: { value: new THREE.Color(palette.end) },
        uTime: { value: 0 },
        uOpacity: { value: options.opacity },
        uFlowSpeed: { value: options.flowSpeed },
        uPhase: { value: options.phase },
        uHaze: { value: options.haze ? 1 : 0 },
        uWaveAmplitude: { value: options.waveAmplitude },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uFlowSpeed;
        uniform float uPhase;
        uniform float uWaveAmplitude;
        varying vec2 vUv;
        varying vec3 vViewNormal;
        varying vec3 vViewDirection;
        varying float vTurbulence;

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

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += valueNoise(p) * amplitude;
            p = p * 2.03 + vec2(13.7, 8.9);
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          vUv = uv;
          float flow = uv.x * 5.2 - uTime * uFlowSpeed * 0.13 + uPhase;
          float turbulence = fbm(vec2(flow * 1.5, uv.y * 2.6 + uTime * 0.055));
          float rolling = sin(flow * 6.2831853 + turbulence * 4.2 + sin(uv.y * 6.2831853) * 0.72);
          vec3 transformed = position + normal * uWaveAmplitude * (rolling * 0.52 + (turbulence - 0.5) * 1.25);
          vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
          vViewNormal = normalize(normalMatrix * normal);
          vViewDirection = normalize(-viewPosition.xyz);
          vTurbulence = turbulence;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uFlowSpeed;
        uniform float uPhase;
        uniform float uHaze;
        varying vec2 vUv;
        varying vec3 vViewNormal;
        varying vec3 vViewDirection;
        varying float vTurbulence;

        float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 31.31);
          return fract(p.x * p.y);
        }

        float noise2d(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += noise2d(p) * amplitude;
            p = p * 2.01 + vec2(9.7, 14.2);
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          float moving = vUv.x * 7.2 - uTime * uFlowSpeed * 0.19 + uPhase;
          float broad = fbm(vec2(moving * 0.72, vUv.y * 2.1 + uTime * 0.025));
          float fine = fbm(vec2(moving * 1.9 + 3.4, vUv.y * 5.2 - uTime * 0.042));
          float pulseA = pow(0.5 + 0.5 * sin((moving + broad * 0.48) * 6.2831853), 3.4);
          float pulseB = pow(0.5 + 0.5 * sin((moving * 2.15 + fine * 0.34) * 6.2831853), 7.0);
          float fresnel = pow(1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDirection))), 1.15);
          float filament = (0.12 + pulseA * 0.52 + pulseB * 0.34) * (0.30 + broad * 0.86) * (0.28 + fresnel * 0.82);
          float haze = (0.22 + broad * 0.56) * (0.32 + fresnel * 0.68);
          float density = mix(filament, haze, uHaze);
          float breakup = smoothstep(0.18, 0.84, broad * 0.58 + fine * 0.42 + vTurbulence * 0.18);
          float endFade = smoothstep(0.0, 0.055, vUv.x) * (1.0 - smoothstep(0.945, 1.0, vUv.x));
          float alpha = uOpacity * clamp(density * 1.92, 0.0, 1.0) * (0.42 + breakup * 0.72) * endFade;
          if (alpha < 0.004) discard;
          float gradient = smoothstep(0.08, 0.92, vUv.x);
          vec3 segmentColor = mix(uColorStart, uColorEnd, gradient);
          float whitening = clamp(0.08 + fresnel * 0.19 + pulseB * 0.12 + uHaze * 0.06, 0.0, 0.38);
          vec3 smokeColor = mix(segmentColor, vec3(1.0), whitening) * (0.72 + density * 0.66);
          gl_FragColor = vec4(smokeColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  material.toneMapped = false
  timelineShaderMaterials.push(material)
  return material
}

function createFlowSmokeMesh(
  curve: THREE.Curve<THREE.Vector3>,
  palette: SmokePalette,
  radius: number,
  opacity: number,
  phase: number,
  flowSpeed: number,
  haze = false,
  revealStart = 0,
  revealEnd = 0,
) {
  const geometry = registerGeometry(
    new THREE.TubeGeometry(curve, haze ? 112 : 128, radius, haze ? 10 : 8, false),
  )
  const material = createSmokeStreamMaterial(palette, {
    opacity,
    flowSpeed,
    phase,
    haze,
    waveAmplitude: haze ? radius * 0.72 : radius * 0.46,
  })
  registerUniformReveal(material, 'uOpacity', opacity, revealStart, revealEnd)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = haze ? 5.1 : 5.6
  rootGroup.add(mesh)
  return mesh
}

function createBundledSmokeCurve(
  baseCurve: THREE.Curve<THREE.Vector3>,
  radialOffset: number,
  phase: number,
) {
  const samples = 96
  const frames = baseCurve.computeFrenetFrames(samples, false)
  const points: THREE.Vector3[] = []

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const point = baseCurve.getPointAt(t)
    const endpointFade = Math.sin(t * Math.PI)
    const curl = phase + t * Math.PI * 2 * 2.25 + Math.sin(t * Math.PI * 5 + phase) * 0.22
    const breathing = 0.76 + Math.sin(t * Math.PI * 4.2 + phase * 0.7) * 0.18
    const amount = radialOffset * breathing * endpointFade
    point
      .addScaledVector(frames.normals[index]!, Math.cos(curl) * amount)
      .addScaledVector(frames.binormals[index]!, Math.sin(curl) * amount)
    points.push(point)
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  curve.arcLengthDivisions = 240
  return curve
}

function createSmokeFlowFamily(
  builder: (z: number, yOffset: number) => THREE.Curve<THREE.Vector3>,
  palette: SmokePalette,
  count: number,
  zSpread: number,
  radius: number,
  opacity: number,
  speed: number,
  phaseBase: number,
  revealStart: number,
  revealEnd: number,
) {
  const curves: THREE.Curve<THREE.Vector3>[] = []
  const baseCurve = builder(0, 0)
  const centerIndex = Math.floor(count / 2)
  for (let i = 0; i < count; i += 1) {
    const factor = count === 1 ? 0 : i / (count - 1) - 0.5
    const ringDistance = zSpread * (0.14 + Math.abs(factor) * 0.075)
    const curve = i === centerIndex
      ? baseCurve
      : createBundledSmokeCurve(baseCurve, ringDistance, phaseBase + i * 0.79)
    curves.push(curve)
    createFlowSmokeMesh(
      curve,
      palette,
      radius * (0.86 + (1 - Math.abs(factor) * 2) * 0.18),
      opacity * (0.82 + (1 - Math.abs(factor) * 2) * 0.18),
      phaseBase + i * 0.73,
      speed * (0.94 + i * 0.025),
      false,
      revealStart,
      revealEnd,
    )
  }

  const centerCurve = curves[centerIndex]
  if (centerCurve) {
    createFlowSmokeMesh(
      centerCurve,
      palette,
      radius * 5.2,
      opacity * 0.095,
      phaseBase + 1.37,
      speed * 0.72,
      true,
      revealStart,
      revealEnd,
    )
  }
  return curves
}

function createFlowArrowMesh(
  color: number,
  scale = 1,
  revealStart = 0,
  revealEnd = 0,
) {
  const length = 0.82 * scale
  const shaftWidth = 0.10 * scale
  const headWidth = 0.34 * scale
  const headLength = 0.28 * scale
  const shaftHalf = shaftWidth * 0.5
  const headHalf = headWidth * 0.5
  const shoulderY = length - headLength

  const shape = new THREE.Shape()
  shape.moveTo(-shaftHalf, 0)
  shape.lineTo(shaftHalf, 0)
  shape.lineTo(shaftHalf, shoulderY)
  shape.lineTo(headHalf, shoulderY)
  shape.lineTo(0, length)
  shape.lineTo(-headHalf, shoulderY)
  shape.lineTo(-shaftHalf, shoulderY)
  shape.closePath()

  const baseColor = new THREE.Color(color)
  const endColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.16)
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        uColorStart: { value: baseColor },
        uColorEnd: { value: endColor },
        uTime: { value: 0 },
        uPhase: { value: seededRandom(color + Math.round(scale * 100)) },
        uOpacity: { value: 0.94 },
        uLength: { value: length },
      },
      vertexShader: /* glsl */ `
        uniform float uLength;
        varying float vAlong;
        void main() {
          vAlong = clamp(position.y / max(uLength, 0.001), 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        uniform float uTime;
        uniform float uPhase;
        uniform float uOpacity;
        varying float vAlong;
        void main() {
          vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.02, 0.96, vAlong));
          float sweep = fract(uTime * 0.34 + uPhase);
          float highlight = exp(-pow((vAlong - sweep) * 12.0, 2.0));
          float tailFeather = smoothstep(0.0, 0.16, vAlong);
          color = mix(color, vec3(1.0), highlight * 0.36);
          gl_FragColor = vec4(color, uOpacity * tailFeather * (0.92 + highlight * 0.08));
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    }),
  )
  material.toneMapped = false
  timelineShaderMaterials.push(material)
  registerUniformReveal(material, 'uOpacity', 0.94, revealStart, revealEnd)

  const arrow = new THREE.Mesh(registerGeometry(new THREE.ShapeGeometry(shape, 12)), material)
  arrow.renderOrder = 8
  arrow.frustumCulled = false
  arrow.userData.planarFlowArrow = true
  return arrow
}

function orientPlanarFlowArrow(
  arrow: THREE.Object3D,
  position: THREE.Vector3,
  tangent: THREE.Vector3,
) {
  const yAxis = tangent.clone().normalize()
  const toCamera = camera
    ? camera.position.clone().sub(position).normalize()
    : new THREE.Vector3(0, 0, 1)

  // 先把朝向相机的向量投影到切线法平面，再构造右手坐标基。
  // 原实现的叉乘顺序形成了左手基，转换为四元数后会让箭头朝向失真。
  let zAxis = toCamera.sub(yAxis.clone().multiplyScalar(toCamera.dot(yAxis)))
  if (zAxis.lengthSq() < 0.0001) {
    zAxis = Math.abs(yAxis.y) < 0.92
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1)
    zAxis.sub(yAxis.clone().multiplyScalar(zAxis.dot(yAxis)))
  }
  zAxis.normalize()

  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize()
  zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  arrow.quaternion.setFromRotationMatrix(basis)
}

function createMovingArrows(
  curve: THREE.Curve<THREE.Vector3>,
  color: number,
  count: number,
  speed: number,
  scale: number,
  startOffset = 0,
  revealStart = 0,
  revealEnd = 0,
) {
  for (let i = 0; i < count; i += 1) {
    const arrow = createFlowArrowMesh(color, scale, revealStart, revealEnd)
    rootGroup.add(arrow)
    flowMovers.push({
      curve,
      mesh: arrow,
      offset: (startOffset + i / count) % 1,
      speed,
      revealStart,
      revealEnd,
      bob: i * 0.9,
    })
  }
}

function createAirCirculation() {
  const warmX = HOT_CENTER_X
  const coldX = COLD_CENTER_X
  const warmTopX = warmX + 0.56
  const coldTopX = coldX - 0.56
  const warmGroundY = terrainWorldY(warmX, 0) + 0.24
  const coldGroundY = terrainWorldY(coldX, 0) + 0.28

  const warmUpCurves = createSmokeFlowFamily(
    (z, yOffset) => {
      const surfaceY = terrainWorldY(warmX, z) + 0.24
      return makeCurve([
        new THREE.Vector3(warmX, surfaceY, z),
        new THREE.Vector3(warmX - 0.18, Math.max(surfaceY + 0.92, 2.0), z * 1.04),
        new THREE.Vector3(warmX - 0.08, 3.70 + yOffset, z * 0.94),
        new THREE.Vector3(warmTopX, 5.28 + yOffset * 0.4, z * 0.72),
      ])
    },
    { start: 0xff482d, end: 0xffa058 },
    9,
    0.96,
    0.012,
    0.60,
    1.08,
    0.15,
    0.16,
    0.28,
  )

  const upperCurves = createSmokeFlowFamily(
    (z, yOffset) =>
      makeCurve([
        new THREE.Vector3(warmTopX, 5.28 + yOffset, z),
        new THREE.Vector3(-2.10, 5.76 + yOffset, z * 1.08),
        new THREE.Vector3(0.15, 5.52 + yOffset * 0.9, z * 1.10),
        new THREE.Vector3(2.20, 5.48 + yOffset * 0.72, z),
        new THREE.Vector3(coldTopX, 5.18 + yOffset * 0.48, z * 0.82),
      ]),
    { start: FLOW_COLORS.upperWarm, end: FLOW_COLORS.upperCold },
    10,
    1.04,
    0.0115,
    0.56,
    0.96,
    1.62,
    0.62,
    0.73,
  )

  const coldDownCurves = createSmokeFlowFamily(
    (z, yOffset) => {
      const surfaceY = terrainWorldY(coldX, z) + 0.28
      return makeCurve([
        new THREE.Vector3(coldTopX, 5.18 + yOffset, z * 0.82),
        new THREE.Vector3(coldX + 0.18, 4.28, z),
        new THREE.Vector3(coldX + 0.16, Math.max(surfaceY + 0.88, 2.32), z * 1.02),
        new THREE.Vector3(coldX, surfaceY, z * 0.82),
      ])
    },
    { start: 0xc6f2ff, end: 0x5aabff },
    9,
    0.96,
    0.012,
    0.60,
    1.04,
    3.05,
    0.32,
    0.44,
  )

  const surfaceCurves = createSmokeFlowFamily(
    (z, yOffset) => {
      const z0 = z
      const yCold = terrainWorldY(coldX - 0.08, z0) + 0.30 + yOffset
      const yColdMid = terrainWorldY(coldX * 0.48, z0 * 1.05) + 0.32 + yOffset
      const yMiddle = terrainWorldY(0.1, z0 * 1.08) + 0.31 + yOffset
      const yWarmMid = terrainWorldY(warmX * 0.42, z0 * 1.08) + 0.29 + yOffset
      const yWarm = terrainWorldY(warmX + 0.08, z0 * 0.82) + 0.27 + yOffset
      return makeCurve([
        new THREE.Vector3(coldX - 0.08, yCold, z0),
        new THREE.Vector3(coldX * 0.48, yColdMid, z0 * 1.05),
        new THREE.Vector3(0.1, yMiddle, z0 * 1.08),
        new THREE.Vector3(warmX * 0.42, yWarmMid, z0 * 1.08),
        new THREE.Vector3(warmX + 0.08, yWarm, z0 * 0.82),
      ])
    },
    { start: 0x7affd7, end: 0x2dd9b0 },
    10,
    1.06,
    0.011,
    0.54,
    1.00,
    4.28,
    0.68,
    0.79,
  )

  const warmMain = warmUpCurves[Math.floor(warmUpCurves.length / 2)]!
  const upperMain = upperCurves[Math.floor(upperCurves.length / 2)]!
  const coldMain = coldDownCurves[Math.floor(coldDownCurves.length / 2)]!
  const surfaceMain = surfaceCurves[Math.floor(surfaceCurves.length / 2)]!

  createMovingArrows(warmMain, FLOW_COLORS.warmLight, 5, 1.0, 0.78, 0.08, 0.16, 0.28)
  createMovingArrows(coldMain, FLOW_COLORS.cold, 5, 1.0, 0.78, 0.10, 0.32, 0.44)
  createMovingArrows(upperMain, 0xc9dff0, 6, 1.0, 0.74, 0.02, 0.62, 0.73)
  createMovingArrows(surfaceMain, FLOW_COLORS.surface, 6, 1.0, 0.72, 0.04, 0.68, 0.79)

  createLabelSprite('空气受热上升', '#ff6337', new THREE.Vector3(warmX - 1.72, 3.18, 0.8), 0.46, 0.18, 0.29)
  createLabelSprite('空气冷却下沉', '#8bd7ff', new THREE.Vector3(coldX + 1.72, 3.20, 0.8), 0.46, 0.34, 0.45)
  createLabelSprite('高空气流：高压 → 低压', '#e5b6b0', new THREE.Vector3(0, 6.12, 0.3), 0.46, 0.63, 0.74)
  createLabelSprite('近地面气流：高压 → 低压', '#53e7b0', new THREE.Vector3(0, terrainWorldY(0, 3.05) + 0.64, 3.05), 0.46, 0.69, 0.80)

  createOfficialVolumeCloud(
    new THREE.Vector3(warmTopX, 6.08, -0.12),
    new THREE.Vector3(2.68, 0.94, 1.28),
    0xffeadc,
    1200,
    0.26,
    0.36,
  )

  createGlowSprite('#ff6a38', new THREE.Vector3(warmX, warmGroundY + 0.18, 0), 2.5, 0.18, 0.06, 0.16)
  createGlowSprite('#66c7ff', new THREE.Vector3(coldX, coldGroundY + 0.18, 0), 2.5, 0.16, 0.32, 0.44)
}

function addAtmosphereWisps() {
  const warmGlowTexture = createRadialTexture('rgba(255,118,62,0.65)', 'rgba(255,70,20,0)')
  const coldGlowTexture = createRadialTexture('rgba(72,174,255,0.62)', 'rgba(32,110,255,0)')

  for (let i = 0; i < 18; i++) {
    const warmOpacity = 0.18 + seededRandom(i + 1800) * 0.16
    const warmMat = registerMaterial(
      new THREE.SpriteMaterial({
        map: warmGlowTexture,
        transparent: true,
        opacity: warmOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    const warm = new THREE.Sprite(warmMat)
    warm.position.set(
      HOT_CENTER_X + (seededRandom(i + 1810) - 0.5) * 1.4,
      1.25 + seededRandom(i + 1820) * 3.65,
      (seededRandom(i + 1830) - 0.5) * 1.8,
    )
    const s = 0.75 + seededRandom(i + 1840) * 1.4
    warm.scale.set(s, s * 1.75, 1)
    rootGroup.add(warm)
    registerOpacityReveal(warmMat, warmOpacity, 0.16, 0.27)
    pulseObjects.push({ object: warm, baseScale: s, strength: 0.09, offset: i * 0.4 })

    const coldOpacity = 0.16 + seededRandom(i + 1900) * 0.15
    const coldMat = registerMaterial(
      new THREE.SpriteMaterial({
        map: coldGlowTexture,
        transparent: true,
        opacity: coldOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    const cold = new THREE.Sprite(coldMat)
    cold.position.set(
      COLD_CENTER_X + (seededRandom(i + 1910) - 0.5) * 1.4,
      1.25 + seededRandom(i + 1920) * 3.65,
      (seededRandom(i + 1930) - 0.5) * 1.8,
    )
    const cs = 0.75 + seededRandom(i + 1940) * 1.4
    cold.scale.set(cs, cs * 1.75, 1)
    rootGroup.add(cold)
    registerOpacityReveal(coldMat, coldOpacity, 0.32, 0.44)
    pulseObjects.push({ object: cold, baseScale: cs, strength: 0.09, offset: i * 0.45 })
  }
}

function createBackgroundParticles() {
  const positions: number[] = []
  for (let i = 0; i < 220; i++) {
    positions.push(
      (seededRandom(i * 3 + 2100) - 0.5) * 32,
      1.2 + seededRandom(i * 5 + 2200) * 14,
      -8 - seededRandom(i * 7 + 2300) * 8,
    )
  }
  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = registerMaterial(
    new THREE.PointsMaterial({
      color: 0x7ab6df,
      size: 0.035,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  )
  rootGroup.add(new THREE.Points(geometry, material))
}

const cameraShots = [
  {
    phase: 0,
    position: new THREE.Vector3(11.4, 7.2, 15.8),
    target: new THREE.Vector3(0, 2.65, 0),
  },
  {
    phase: 0.13,
    position: new THREE.Vector3(-2.2, 5.4, 13.0),
    target: new THREE.Vector3(HOT_CENTER_X, 1.05, 0),
  },
  {
    phase: 0.27,
    position: new THREE.Vector3(-9.2, 5.3, 10.8),
    target: new THREE.Vector3(HOT_CENTER_X, 3.15, 0),
  },
  {
    phase: 0.43,
    position: new THREE.Vector3(9.1, 5.5, 10.8),
    target: new THREE.Vector3(COLD_CENTER_X, 3.0, 0),
  },
  {
    phase: 0.58,
    position: new THREE.Vector3(0.4, 7.5, 13.2),
    target: new THREE.Vector3(0, 3.15, 0),
  },
  {
    phase: 0.76,
    position: new THREE.Vector3(0.2, 8.0, 13.8),
    target: new THREE.Vector3(0, 4.15, 0),
  },
  {
    phase: 0.90,
    position: new THREE.Vector3(0.4, 7.7, 13.4),
    target: new THREE.Vector3(0, 2.65, 0),
  },
  {
    phase: 1,
    position: new THREE.Vector3(11.4, 7.2, 15.8),
    target: new THREE.Vector3(0, 2.65, 0),
  },
]

function updateImmersiveCamera(phase: number) {
  if (!camera || !orbitControls || !cameraFollowEnabled) return
  if (!isPlaying.value && Math.abs(phase - lastCameraPhase) < 0.00001) return

  let nextIndex = cameraShots.findIndex((shot) => shot.phase >= phase)
  if (nextIndex < 0) nextIndex = cameraShots.length - 1
  const endShot = cameraShots[nextIndex]!
  const startShot = cameraShots[Math.max(0, nextIndex - 1)]!
  const blend = smoothRange(phase, startShot.phase, endShot.phase)

  camera.position.lerpVectors(startShot.position, endShot.position, blend)
  orbitControls.target.lerpVectors(startShot.target, endShot.target, blend)
  orbitControls.update()
  lastCameraPhase = phase
}

function updateSceneFromProgress(ambientElapsed = 0) {
  const phase = progress.value / 100
  const cycle = phase * Math.PI * 2 + ambientElapsed * 2.2
  const motionOffset = ambientElapsed * 0.09

  flowMovers.forEach((item) => {
    const localPhase = THREE.MathUtils.clamp(
      (phase - item.revealStart) / Math.max(0.0001, 1 - item.revealStart),
      0,
      1,
    )
    const t = (item.offset + (localPhase + motionOffset) * item.speed) % 1
    const position = item.curve.getPointAt(t)
    const tangent = item.curve.getTangentAt(t).normalize()
    item.mesh.position.copy(position)

    if (item.mesh.userData.planarFlowArrow) {
      orientPlanarFlowArrow(item.mesh, position, tangent)
    } else if (item.mesh instanceof THREE.Group) {
      item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    } else {
      const bob = Math.sin(cycle * 2 + (item.bob ?? 0)) * 0.025
      item.mesh.position.y += bob
    }
  })

  pulseObjects.forEach((item) => {
    const s = item.baseScale * (1 + Math.sin(cycle * 2 + item.offset) * item.strength)
    if (item.object instanceof THREE.Sprite) {
      const currentRatio = item.object.scale.y / Math.max(0.001, item.object.scale.x)
      item.object.scale.set(s, s * currentRatio, 1)
    } else {
      item.object.scale.setScalar(s)
    }
  })

  const shaderTime = phase * 18.0 + ambientElapsed * 2.4
  timelineShaderMaterials.forEach((material) => {
    if (material.uniforms.uTime) material.uniforms.uTime.value = shaderTime
  })

  revealUniforms.forEach((runtime) => {
    const uniform = runtime.material.uniforms[runtime.uniform]
    if (uniform) uniform.value = runtime.baseValue * smoothRange(phase, runtime.start, runtime.end)
  })

  revealOpacities.forEach((runtime) => {
    runtime.material.opacity = runtime.baseOpacity * smoothRange(phase, runtime.start, runtime.end)
  })

  const hotHeat = smoothRange(phase, 0.045, 0.16)
  const coldChill = smoothRange(phase, 0.32, 0.45)
  const beamReveal = smoothRange(phase, 0.015, 0.12)
  const beamFade = 1 - smoothRange(phase, 0.18, 0.29)
  if (terrainMaterial?.uniforms.uHotHeat) terrainMaterial.uniforms.uHotHeat.value = hotHeat
  if (terrainMaterial?.uniforms.uColdChill) terrainMaterial.uniforms.uColdChill.value = coldChill
  if (sunSpotLight) sunSpotLight.intensity = 11.5 * beamReveal
  if (warmBounceLight) warmBounceLight.intensity = 2.4 * hotHeat
  if (coldFillLight) coldFillLight.intensity = 2.2 * coldChill

  vegetationRuntimes.forEach((runtime) => {
    const intensity = runtime.mode === 'warm' ? hotHeat : coldChill
    const isWarm = runtime.mode === 'warm'
    runtime.foliageMaterial.color.lerpColors(runtime.healthyColor, runtime.stressedColor, intensity)
    runtime.foliageMaterial.roughness = THREE.MathUtils.lerp(0.82, 1, intensity)
    runtime.group.rotation.z = runtime.lean * intensity * (isWarm ? 0.12 : 0.025)

    runtime.parts.forEach((part) => {
      const elevatedPart = part.baseY > 0.45
      part.mesh.position.y = part.baseY - intensity * (isWarm ? (elevatedPart ? 0.19 : 0.035) : 0.025)
      part.mesh.rotation.z = part.baseRotationZ + part.bend * intensity * (isWarm ? 0.62 : 0.07)
      part.mesh.scale.y = part.baseScaleY * (1 - intensity * (isWarm ? (elevatedPart ? 0.50 : 0.28) : 0.08))
    })
  })

  if (sunBeamMaterial?.uniforms.uReveal) sunBeamMaterial.uniforms.uReveal.value = beamReveal
  if (sunBeamMaterial?.uniforms.uOpacity) {
    sunBeamMaterial.uniforms.uOpacity.value = 0.26 * beamFade
  }
  if (sunHaloMaterial) sunHaloMaterial.opacity = 0.17 + beamReveal * beamFade * 0.11
  if (sunInnerGlowMaterial) sunInnerGlowMaterial.opacity = 0.18 + beamReveal * beamFade * 0.08
  if (sunCoronaMaterial) sunCoronaMaterial.opacity = 0.07 + beamReveal * beamFade * 0.05

  const cameraPosition = camera?.position ?? new THREE.Vector3()
  cloudMaterials.forEach((material, index) => {
    material.uniforms.uCameraWorld?.value.copy(cameraPosition)
    if (material.uniforms.uFrame) {
      material.uniforms.uFrame.value = Math.floor(phase * 720 + ambientElapsed * 60 + index * 17)
    }
  })

  cloudVolumes.forEach((runtime, index) => {
    const drift = cycle * 0.18 + ambientElapsed * 0.24 + runtime.driftPhase
    runtime.mesh.position.set(
      runtime.basePosition.x + Math.sin(drift) * 0.055,
      runtime.basePosition.y + Math.sin(drift * 1.37 + index) * 0.035,
      runtime.basePosition.z + Math.cos(drift * 0.83) * 0.045,
    )
    runtime.mesh.rotation.y = runtime.baseRotationY + Math.sin(drift * 0.72) * 0.035
  })

  updateImmersiveCamera(phase)
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer || !scene) return

  const rect = container.getBoundingClientRect()
  const parentRect = container.parentElement?.getBoundingClientRect()

  // 某些模板布局在 onMounted 的第一帧仍可能返回 0 高度。
  // 优先使用容器实际尺寸，必要时退回父容器尺寸，避免 WebGL 画布被创建成 1×1。
  const width = Math.max(320, Math.round(rect.width || parentRect?.width || window.innerWidth))
  const height = Math.max(320, Math.round(rect.height || parentRect?.height || window.innerHeight * 0.72))

  if (width === lastSceneWidth && height === lastSceneHeight) {
    renderer.render(scene, camera)
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.render(scene, camera)
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => resizeThreeSceneNow())
    })
  }, delay)
}

function animateScene(time = 0) {
  animationFrameId = requestAnimationFrame(animateScene)
  if (!sceneLastTime) sceneLastTime = time
  const delta = Math.min((time - sceneLastTime) / 1000, 0.1)
  sceneLastTime = time
  if (continuousLoopMode.value) continuousElapsed += delta
  updateSceneFromProgress(continuousLoopMode.value ? continuousElapsed : 0)
  orbitControls?.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function animateTimeline(time: number) {
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)
  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta = Math.min((time - timelineLastTime) / 1000, 0.1)
  timelineLastTime = time

  if (isPlaying.value) {
    progress.value = Math.min(playbackStopAt.value, progress.value + delta * playbackSpeed.value * 8)
    if (progress.value >= playbackStopAt.value) {
      if (playbackMode.value === 'loop') {
        progress.value = 0
        cameraFollowEnabled = true
        lastCameraPhase = -1
      } else {
        isPlaying.value = false
        playbackMode.value = null
        cameraFollowEnabled = false
      }
    }
  }
}

function pausePlayback() {
  isPlaying.value = false
  playbackMode.value = null
  cameraFollowEnabled = false
}

function beginPlayback(stopAt: number, mode: 'all' | 'stage' | 'loop') {
  continuousLoopMode.value = false
  continuousElapsed = 0
  sceneLastTime = 0
  playbackStopAt.value = stopAt
  playbackMode.value = mode
  cameraFollowEnabled = true
  lastCameraPhase = -1
  timelineLastTime = 0
  isPlaying.value = true
}

function playAllStages() {
  if (isPlaying.value) {
    pausePlayback()
    return
  }

  if (progress.value >= 100) progress.value = 0
  beginPlayback(100, 'all')
}

function toggleStageLoop() {
  if (isPlaying.value && playbackMode.value === 'loop') {
    pausePlayback()
    return
  }

  stopContinuousLoop()
  pausePlayback()
  progress.value = 0
  beginPlayback(100, 'loop')
}

function togglePlayback() {
  if (continuousLoopMode.value) {
    stopContinuousLoop()
    return
  }
  playAllStages()
}

function stopContinuousLoop() {
  continuousLoopMode.value = false
  continuousElapsed = 0
  sceneLastTime = 0
}

function toggleContinuousLoop() {
  if (continuousLoopMode.value) {
    stopContinuousLoop()
    return
  }

  pausePlayback()
  progress.value = 100
  continuousElapsed = 0
  sceneLastTime = 0
  continuousLoopMode.value = true
  cameraFollowEnabled = false
  if (camera && orbitControls) {
    camera.position.set(11.4, 7.2, 15.8)
    orbitControls.target.set(0, 2.65, 0)
    orbitControls.update()
  }
}

function goToStage(index: number) {
  const safeIndex = THREE.MathUtils.clamp(index, 0, stageDefinitions.length - 1)
  stopContinuousLoop()
  pausePlayback()
  progress.value = stageDefinitions[safeIndex]!.start
  cameraFollowEnabled = true
  lastCameraPhase = -1
}

function goToNextStage() {
  const nextIndex = currentStageIndex.value < stageDefinitions.length - 1
    ? currentStageIndex.value + 1
    : 0
  goToStage(nextIndex)
}

function playCurrentStage() {
  if (isPlaying.value && playbackMode.value === 'stage') {
    pausePlayback()
    return
  }

  const stage = currentStage.value
  if (progress.value < stage.start || progress.value >= stage.end) {
    progress.value = stage.start
  }
  beginPlayback(stage.end, 'stage')
}

function handleTimelineScrub() {
  stopContinuousLoop()
  isPlaying.value = false
  playbackMode.value = null
  cameraFollowEnabled = true
  lastCameraPhase = -1
}

function resetView() {
  if (!camera || !orbitControls) return
  cameraFollowEnabled = false
  camera.position.set(11.4, 7.2, 15.8)
  orbitControls.target.set(0, 2.65, 0)
  orbitControls.update()
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return
  sceneDisposed = false
  cameraFollowEnabled = true
  lastCameraPhase = -1

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x04111d)
  applyGeneratedSceneBackground()

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
  camera.position.set(11.4, 7.2, 15.8)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  // 当前地形与半透明气流不参与阴影投射，关闭空耗的阴影管线。
  renderer.shadowMap.enabled = false
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.18
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.enablePan = false
  orbitControls.minDistance = 10
  orbitControls.maxDistance = 28
  orbitControls.minPolarAngle = 0.52
  orbitControls.maxPolarAngle = 1.34
  orbitControls.target.set(0, 2.65, 0)
  orbitControls.addEventListener('start', () => {
    if (!isPlaying.value) cameraFollowEnabled = false
  })

  const hemisphereLight = new THREE.HemisphereLight(0xbce6ff, 0x2a201d, 1.8)
  scene.add(hemisphereLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0)
  keyLight.position.set(3, 10, 9)
  keyLight.castShadow = false
  scene.add(keyLight)

  const coldFill = new THREE.PointLight(0x5ab7ff, 2.2, 18, 1.7)
  coldFill.position.set(COLD_CENTER_X, 4.4, 4.0)
  scene.add(coldFill)
  coldFillLight = coldFill

  scene.add(rootGroup)
  createBackgroundParticles()
  createTerrain()
  createSun()
  createAirCirculation()
  addAtmosphereWisps()
  updateSceneFromProgress()

  resizeThreeSceneNow()
  resizeObserver = new ResizeObserver(() => scheduleSceneResize(110))
  resizeObserver.observe(container)

  // 首次挂载后主动做多次尺寸校准，避免模板布局尚未稳定时 WebGL 被创建成 1×1。
  resizeThreeSceneNow()
  requestAnimationFrame(() => resizeThreeSceneNow())
  window.setTimeout(() => scheduleSceneResize(0), 120)
  window.setTimeout(() => scheduleSceneResize(0), 360)
  animateScene()
}

function disposeScene() {
  sceneDisposed = true
  continuousLoopMode.value = false
  continuousElapsed = 0
  sceneLastTime = 0
  cancelAnimationFrame(animationFrameId)
  cancelAnimationFrame(timelineAnimationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  resizeObserver?.disconnect()
  resizeObserver = null
  orbitControls?.dispose()
  orbitControls = null

  disposableGeometries.forEach((geometry) => geometry.dispose())
  disposableMaterials.forEach((material) => material.dispose())
  disposableTextures.forEach((texture) => texture.dispose())
  disposableGeometries.length = 0
  disposableMaterials.length = 0
  disposableTextures.length = 0
  flowMovers.length = 0
  pulseObjects.length = 0
  timelineShaderMaterials.length = 0
  cloudVolumes.length = 0
  cloudMaterials.length = 0
  revealUniforms.length = 0
  revealOpacities.length = 0
  vegetationRuntimes.length = 0
  officialCloudTexture = null
  terrainMaterial = null
  sunBeamMaterial = null
  sunHaloMaterial = null
  sunInnerGlowMaterial = null
  sunCoronaMaterial = null
  sunSpotLight = null
  warmBounceLight = null
  coldFillLight = null

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  rootGroup.clear()
  scene = null
  camera = null
  renderer = null
}

onMounted(async () => {
  await nextTick()
  initScene()
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.thermal-circulation-container .workspace.panel-resizing,
.thermal-circulation-container .workspace.layout-resizing,
.thermal-circulation-container .workspace.panel-resizing .side-panel,
.thermal-circulation-container .workspace.layout-resizing .side-panel,
.thermal-circulation-container .workspace.panel-resizing .center-stage,
.thermal-circulation-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.thermal-circulation-container .center-stage {
  min-width: 0;
  min-height: 0;
}

.thermal-circulation-container .stage-content {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 420px;
  overflow: hidden;
}

.thermal-circulation-container .three-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.thermal-circulation-container .three-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.thermal-corner-atmosphere {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}

.thermal-corner-atmosphere i {
  position: absolute;
  width: clamp(360px, 44vw, 820px);
  height: clamp(360px, 44vw, 820px);
  border-radius: 50%;
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(20px) saturate(135%);
  transform: translate(-50%, -50%) scale(0.76);
  animation: thermal-corner-breathe 0.68s ease-in-out infinite alternate;
}

.thermal-corner-atmosphere.warm i {
  opacity: var(--warm-intensity, 0);
  background: radial-gradient(circle, rgba(255, 64, 18, 0.68) 0%, rgba(255, 93, 24, 0.32) 34%, rgba(255, 118, 40, 0.12) 56%, transparent 78%);
}

.thermal-corner-atmosphere.cold i {
  opacity: var(--cold-intensity, 0);
  background: radial-gradient(circle, rgba(60, 185, 255, 0.68) 0%, rgba(38, 112, 255, 0.34) 34%, rgba(63, 150, 255, 0.13) 56%, transparent 78%);
  animation-delay: -0.29s;
}

.thermal-corner-atmosphere i:nth-child(1) {
  top: 0;
  left: 0;
}

.thermal-corner-atmosphere i:nth-child(2) {
  top: 0;
  left: 100%;
  animation-delay: -0.17s;
}

.thermal-corner-atmosphere i:nth-child(3) {
  top: 100%;
  left: 0;
  animation-delay: -0.34s;
}

.thermal-corner-atmosphere i:nth-child(4) {
  top: 100%;
  left: 100%;
  animation-delay: -0.51s;
}

@keyframes thermal-corner-breathe {
  from {
    transform: translate(-50%, -50%) scale(0.72);
    filter: blur(24px) saturate(118%);
  }

  to {
    transform: translate(-50%, -50%) scale(1.14);
    filter: blur(14px) saturate(165%);
  }
}

.thermal-insight-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 8px;
  padding: 10px;
  background: rgba(4, 18, 30, 0.56);
  border: 1px solid rgba(114, 184, 229, 0.34);
  border-radius: 10px;
}

.legend-title {
  grid-column: 1 / -1;
  margin-bottom: 4px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.legend-item {
  display: flex;
  min-height: 23px;
  align-items: center;
  gap: 9px;
  color: #d6e7f2;
  font-size: 10px;
}

.legend-arrow {
  display: inline-flex;
  width: 20px;
  justify-content: center;
  font-size: 20px;
  font-style: normal;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 10px currentColor;
}

.legend-arrow.warm {
  color: #ff693b;
}

.legend-arrow.cold {
  color: #48a7ff;
}

.legend-arrow.upper {
  color: transparent;
  background: linear-gradient(90deg, #ff7758 0%, #f7b098 46%, #a8ddff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 8px rgba(176, 217, 255, 0.42));
}

.legend-arrow.surface {
  color: #58e8b4;
}

.legend-divider {
  height: 1px;
  margin: 8px 0;
  background: rgba(142, 191, 222, 0.2);
}

.legend-block {
  display: inline-block;
  width: 22px;
  height: 11px;
  border-radius: 3px;
  box-shadow: 0 0 10px currentColor;
}

.warm-block {
  color: #ff6c34;
  background: linear-gradient(90deg, #ff4d2d, #ffb138);
}

.cold-block {
  color: #359cff;
  background: linear-gradient(90deg, #247cff, #54d5ff);
}

.feature-progress-badge {
  color: #89e7ff;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.thermal-stage-controller,
.thermal-insight-content {
  display: grid;
  gap: 13px;
  padding: 14px;
}

.thermal-stage-tabs {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.thermal-stage-tab {
  display: grid;
  min-width: 0;
  min-height: 58px;
  padding: 7px 4px;
  place-items: center;
  gap: 4px;
  color: rgba(189, 222, 237, 0.66);
  cursor: pointer;
  border: 1px solid rgba(86, 187, 226, 0.18);
  border-radius: 10px;
  background: rgba(13, 53, 72, 0.26);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.thermal-stage-tab:hover {
  transform: translateY(-1px);
  border-color: rgba(90, 211, 255, 0.48);
}

.thermal-stage-tab span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: #8bdcff;
  border: 1px solid rgba(104, 216, 255, 0.34);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 900;
}

.thermal-stage-tab strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thermal-stage-tab.active {
  color: #ffffff;
  border-color: rgba(83, 221, 255, 0.72);
  background: linear-gradient(145deg, rgba(14, 116, 153, 0.54), rgba(18, 62, 94, 0.42));
  box-shadow: 0 0 18px rgba(43, 189, 239, 0.18);
}

.thermal-stage-tab.done span {
  color: #5ff0be;
  border-color: rgba(78, 234, 181, 0.48);
}

.thermal-stage-detail {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(74, 177, 219, 0.18);
  border-radius: 12px;
  background: rgba(2, 18, 30, 0.48);
}

.thermal-stage-detail-head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.thermal-stage-detail-head span {
  flex: 0 0 auto;
  padding: 3px 7px;
  color: #63dcff;
  font-size: 10px;
  border: 1px solid rgba(83, 211, 255, 0.28);
  border-radius: 999px;
}

.thermal-stage-detail-head strong {
  color: #f3fbff;
  font-size: 14px;
}

.thermal-stage-detail p,
.thermal-insight-lead {
  margin: 0;
  color: rgba(205, 229, 240, 0.78);
  font-size: 12px;
  line-height: 1.65;
}

.thermal-stage-observation {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: start;
  gap: 7px;
  padding-top: 7px;
  border-top: 1px dashed rgba(103, 190, 224, 0.18);
}

.thermal-stage-observation i {
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  background: #5bdcff;
  box-shadow: 0 0 10px #40cfff;
}

.thermal-stage-observation span {
  color: #6ddcff;
  font-size: 11px;
}

.thermal-stage-observation strong {
  color: rgba(236, 248, 255, 0.88);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}

.thermal-stage-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.thermal-stage-actions .theme-btn {
  min-width: 0;
}

.thermal-stage-actions .thermal-loop-btn {
  border-color: rgba(88, 231, 180, 0.28);
}

.thermal-stage-actions .thermal-stage-loop-btn {
  border-color: rgba(91, 211, 255, 0.30);
}

.thermal-stage-actions .thermal-stage-loop-btn.active {
  color: #e4faff;
  border-color: rgba(91, 211, 255, 0.72);
  background: linear-gradient(145deg, rgba(15, 113, 148, 0.56), rgba(13, 62, 91, 0.44));
  box-shadow: 0 0 18px rgba(58, 202, 250, 0.17);
}

.thermal-stage-actions .thermal-loop-btn.active {
  color: #ddfff3;
  border-color: rgba(88, 231, 180, 0.68);
  background: linear-gradient(145deg, rgba(18, 125, 91, 0.5), rgba(12, 72, 75, 0.42));
  box-shadow: 0 0 18px rgba(56, 226, 174, 0.16);
}

.thermal-stage-actions .theme-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.thermal-cause-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.thermal-cause-chain span {
  padding: 5px 7px;
  color: rgba(175, 210, 225, 0.56);
  font-size: 10px;
  border: 1px solid rgba(91, 173, 207, 0.14);
  border-radius: 7px;
  background: rgba(12, 45, 62, 0.32);
}

.thermal-cause-chain span.active {
  color: #dff8ff;
  border-color: rgba(81, 210, 255, 0.42);
  background: rgba(26, 111, 143, 0.35);
}

.thermal-cause-chain i {
  color: rgba(102, 210, 242, 0.54);
  font-style: normal;
}

.thermal-cloud-note {
  margin: 0;
  padding: 9px 10px;
  color: rgba(204, 231, 241, 0.7);
  font-size: 10px;
  line-height: 1.55;
  border-left: 2px solid rgba(145, 211, 235, 0.42);
  border-radius: 0 8px 8px 0;
  background: rgba(25, 59, 75, 0.3);
}

.thermal-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0;
}

.thermal-compare-grid div {
  display: grid;
  gap: 5px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 10px;
}

.thermal-compare-grid .warm {
  border-color: rgba(255, 108, 54, 0.28);
  background: linear-gradient(145deg, rgba(135, 43, 19, 0.28), rgba(71, 34, 25, 0.18));
}

.thermal-compare-grid .cold {
  border-color: rgba(67, 169, 255, 0.28);
  background: linear-gradient(145deg, rgba(29, 84, 140, 0.28), rgba(22, 48, 78, 0.18));
}

.thermal-compare-grid dt {
  color: #f1fbff;
  font-size: 12px;
  font-weight: 800;
}

.thermal-compare-grid dd {
  margin: 0;
  color: rgba(206, 229, 240, 0.72);
  font-size: 10px;
  line-height: 1.55;
}

@media (max-width: 680px) {
  .thermal-stage-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .thermal-compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
