<template>
  <div ref="pageRef" class="volcano-container geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">火山</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlCardCollapsed"
        class="volcano-control-floating-card" title="火山控制" subtitle="控制喷发过程、岩浆性质与模型图层" variant="control"
        :initial-top="84" :initial-right="18" :bottom-inset="14" :resizable="true" :min-width="320" :min-height="420">
        <div class="panel-scroll volcano-floating-card-content">

          <section class="geo-card control-section">
            <h3 class="section-title">喷发阶段</h3>
            <div class="option-grid eruption-stage-grid">
              <button v-for="item in eruptionStageOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: currentStage === item.value }" @click="jumpToStage(item.value)">
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">SiO₂ 含量</h3>
              <strong class="control-value">{{ silicaContent }}%</strong>
            </div>
            <el-slider v-model="silicaContent" :min="45" :max="75" :step="1" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">挥发分含量</span>
              <strong class="control-value">{{ volatileContent.toFixed(1) }}%</strong>
            </div>
            <el-slider v-model="volatileContent" :min="1" :max="6" :step="0.1" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">岩浆温度</span>
              <strong class="control-value">{{ magmaTemperature }} ℃</strong>
            </div>
            <el-slider v-model="magmaTemperature" :min="750" :max="1200" :step="10" :show-tooltip="false" />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">模型图层</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>结构标注</strong>
                <span>显示火山口、火山锥、岩浆房等名称</span>
              </div>
              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>内部结构</strong>
                <span>显示岩浆房、火山通道与侧向岩脉</span>
              </div>
              <el-switch v-model="showInternalStructure" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>火山口湖</strong>
                <span>显示后方塌陷火山口中的动态水体</span>
              </div>
              <el-switch v-model="showCraterLake" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>喷发物</strong>
                <span>显示火山灰云团、火山弹与熔岩光晕</span>
              </div>
              <el-switch v-model="showEjecta" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>
            <div class="option-grid view-grid">
              <button v-for="item in viewOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: currentView === item.value }" @click="setCameraView(item.value)">
                {{ item.label }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn volcano-reset-btn" @click="resetControls">
              恢复默认参数
            </button>
          </section>
        </div>

      </FloatingFeatureCard>

      <section class="center-stage">
        <div class="stage-content volcano-stage-content">
          <div ref="threeContainerRef" class="scene-host three-host volcano-three-host"></div>

          <div class="stage-status-pill">
            <span class="status-dot" :class="{ active: eruptionFactor > 0.08 }"></span>
            <strong>{{ currentStageLabel }}</strong>
            <small>{{ eruptionTypeLabel }}</small>
          </div>

          <div class="geo-card stage-structure-legend">
            <div class="stage-legend-title">模型结构图例</div>
            <div class="stage-legend-list">
              <div v-for="item in structureLegend" :key="item.label" class="stage-legend-item">
                <span class="legend-swatch" :style="{ background: item.color }"></span>
                <strong>{{ item.label }}</strong>
              </div>
            </div>
          </div>


          <div v-if="showLabels" class="volcano-label-layer">
            <div v-for="item in sceneLabels" :key="item.id" :ref="(el) => setLabelRef(item.id, el)"
              class="volcano-label" :class="{ active: selectedStructureId === item.structureId }">
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>{{ currentStageLabel }}</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="isPlaying = false" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>

          <div class="timeline-rotate-control" title="自动环绕观察火山模型">
            <span>自动旋转</span>
            <el-switch v-model="autoRotate" aria-label="自动旋转" />
          </div>
        </div>
      </section>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="dataCardCollapsed"
        class="volcano-data-floating-card" title="喷发数据" subtitle="查看教学模拟量、结构说明与喷发原理" variant="data" :initial-top="146"
        :initial-right="18" :bottom-inset="14" :resizable="true" :min-width="320" :min-height="300">
        <div class="panel-scroll volcano-floating-card-content">

          <div class="data-grid volcano-data-grid">
            <article v-for="item in dataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>

          <section class="geo-card selected-structure-card">
            <div class="selected-structure-head">
              <span>当前结构</span>
            </div>

            <div class="structure-button-grid">
              <button v-for="item in structureOptions" :key="item.value" type="button"
                class="theme-btn option-btn structure-select-btn"
                :class="{ active: selectedStructureId === item.value }" @click="selectedStructureId = item.value">
                {{ item.label }}
              </button>
            </div>

            <p>{{ selectedStructure.description }}</p>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="火山喷发原理" name="principle">
              <div class="collapse-content principle-flow">
                <p><strong>① 岩浆形成并聚集：</strong>深部岩浆进入岩浆房，密度差与持续补给使其具有上升趋势。</p>
                <p><strong>② 挥发分出溶：</strong>岩浆上升时压力降低，原先溶解在岩浆中的水汽、CO₂ 等挥发分逐渐析出并形成气泡。</p>
                <p><strong>③ 压力积累：</strong>当岩浆较黏稠、气体不易逸出时，气泡膨胀会显著提高内部压力。</p>
                <p><strong>④ 喷发释放：</strong>当内部压力超过上覆岩层与火山口的约束时，岩浆、火山灰、气体和火山弹沿通道或裂隙喷出。</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="喷发方式与岩浆性质" name="eruptionType">
              <div class="collapse-content">
                <p>
                  本页用 SiO₂ 含量、挥发分含量和岩浆温度构建一个简化的“爆炸性指数”。
                  SiO₂ 较高通常意味着黏度较大，挥发分越多越容易形成较强气体压力；温度较高则有利于降低黏度。
                </p>
                <p class="simulation-note">右侧压力、喷发柱高度等均为课堂演示用的相对模拟量，不应作为真实火山监测值使用。</p>
              </div>
            </el-collapse-item>

          </el-collapse>
        </div>

      </FloatingFeatureCard>
    </main>
  </div>
</template>

<script setup lang="ts">
// Volcano_v4：写实火山地貌、渐进熔岩流、自然湖岸、气雾灰云与剖面结构教学交互。
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
const terrainAlbedoUrl = '/geo-resources-folder/images/volcanic-terrain-albedo.png'
const strataAlbedoUrl = '/geo-resources-folder/images/volcanic-strata-albedo.png'
const volcanoBackgroundUrl = '/geo-resources-folder/images/volcano-background-v2.png'
const volcanicAshCloudUrl = '/geo-resources-folder/images/volcanic-ash-cloud-v1.png'
const volcanicBombUrl = '/geo-resources-folder/images/volcanic-bomb-v1.png'



import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

const threeContainerRef = ref<HTMLElement | null>(null)
const panelsVisible = ref(true)
const controlCardCollapsed = ref(true)
const dataCardCollapsed = ref(true)

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

const {
  rootRef: pageRef,
  layoutMode,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
} = useGeoPanelLayout({
  left: { enabled: false },
  right: { enabled: false },
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

const silicaContent = ref(58)
const volatileContent = ref(3.2)
const magmaTemperature = ref(1030)
const showLabels = ref(true)
const showInternalStructure = ref(true)
const showCraterLake = ref(true)
const showEjecta = ref(true)
const progress = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const autoRotate = ref(false)
const currentView = ref('overview')
const selectedStructureId = ref('volcanicCone')
const activePanels = ref(['principle', 'eruptionType'])

const speedOptions = [0.5, 1, 2]

const eruptionStageOptions = [
  { label: '静息期', value: 'dormant', progress: 0 },
  { label: '蓄压期', value: 'pressurizing', progress: 34 },
  { label: '喷发期', value: 'erupting', progress: 66 },
  { label: '喷发后', value: 'post', progress: 92 },
]

const viewOptions = [
  { label: '总览', value: 'overview' },
  { label: '剖面', value: 'section' },
  { label: '火山口', value: 'crater' },
  { label: '侧视', value: 'side' },
]

const structureKnowledge: Record<string, {
  title: string
  description: string
}> = {
  volcanicCone: {
    title: '火山锥',
    description: '喷出的熔岩、火山碎屑等物质在火山口周围不断堆积，形成锥状或盾状火山体。',
  },
  crater: {
    title: '火山口',
    description: '火山喷发物到达地表的主要出口。剧烈喷发或顶部塌陷后，火山口可扩大成火山口洼地。',
  },
  conduit: {
    title: '火山通道',
    description: '连接岩浆房与火山口的主要上升通道，岩浆和挥发分会沿通道向上迁移。',
  },
  magmaChamber: {
    title: '岩浆房',
    description: '地壳内岩浆暂时聚集和演化的储集区。新的岩浆补给和挥发分积累会改变内部压力。',
  },
  lavaFlow: {
    title: '熔岩流',
    description: '岩浆溢出地表后在重力作用下沿地势向低处流动。黏度较低的玄武质岩浆往往流动性更强。',
  },
  craterLake: {
    title: '火山口湖',
    description: '喷发后形成的火山口或塌陷洼地若能够蓄水，可形成火山口湖。模型水面采用动态波动演示。',
  },
  collapsedChamber: {
    title: '崩塌后的岩浆房',
    description: '岩浆撤离或顶部失稳后，岩浆房顶板会破裂并向下垮塌，裂隙中仍可能保留高温熔融物。',
  },
  fissure: {
    title: '火山裂隙',
    description: '岩浆除中央火山通道外，也可能沿地壳裂隙上升并形成裂隙式喷发或岩脉。',
  },
  ashColumn: {
    title: '火山灰柱',
    description: '爆炸性喷发中，气体快速膨胀并使岩浆破碎，火山灰和碎屑可被喷入高空形成喷发柱。',
  },
}

const structureOptions = Object.entries(structureKnowledge).map(([value, item]) => ({
  value,
  label: item.title,
}))

const selectedStructure = computed(() =>
  structureKnowledge[selectedStructureId.value] || structureKnowledge.volcanicCone
)

const normalizedViscosity = computed(() => {
  const silica = (silicaContent.value - 45) / 30
  const temperatureEffect = (1200 - magmaTemperature.value) / 450
  return THREE.MathUtils.clamp(silica * 0.72 + temperatureEffect * 0.28, 0, 1)
})

const explosiveIndex = computed(() => {
  const gas = (volatileContent.value - 1) / 5
  return THREE.MathUtils.clamp(normalizedViscosity.value * 0.58 + gas * 0.42, 0, 1)
})

const eruptionFactor = computed(() => {
  const p = progress.value
  if (p < 20) return 0
  if (p < 45) return (p - 20) / 25 * 0.35
  if (p < 72) return 0.35 + (p - 45) / 27 * 0.65
  if (p < 88) return 1 - (p - 72) / 16 * 0.42
  return Math.max(0.08, 0.58 - (p - 88) / 12 * 0.5)
})

const currentStage = computed(() => {
  const p = progress.value
  if (p < 20) return 'dormant'
  if (p < 48) return 'pressurizing'
  if (p < 84) return 'erupting'
  return 'post'
})

const currentStageLabel = computed(() =>
  eruptionStageOptions.find((item) => item.value === currentStage.value)?.label || '静息期'
)

const eruptionTypeLabel = computed(() => {
  if (explosiveIndex.value > 0.68) return '偏爆炸式'
  if (explosiveIndex.value < 0.38) return '偏溢流式'
  return '混合型'
})

const gasPressure = computed(() => {
  const stageBoost = 0.35 + eruptionFactor.value * 0.65
  return (4 + volatileContent.value * 3.1 + explosiveIndex.value * 8.5) * stageBoost
})

const ashColumnHeight = computed(() => {
  if (currentStage.value !== 'erupting') return 0
  return eruptionFactor.value * (1.8 + explosiveIndex.value * 8.5)
})

const lavaFlowSpeed = computed(() => {
  if (progress.value < 48) return 0
  const fluidity = 1 - normalizedViscosity.value
  return (0.15 + fluidity * 1.55) * Math.max(0.25, eruptionFactor.value)
})

const dataCards = computed(() => [
  {
    label: '岩浆温度',
    value: `${magmaTemperature.value} ℃`,
    description: '左侧可调教学参数',
    className: 'orange-card',
  },
  {
    label: '气体压力',
    value: `${gasPressure.value.toFixed(1)} MPa`,
    description: '课堂演示用相对模拟量',
    className: 'purple-card',
  },
  {
    label: '喷发柱高度',
    value: ashColumnHeight.value > 0.05 ? `${ashColumnHeight.value.toFixed(1)} km` : '—',
    description: '随喷发阶段与爆炸性变化',
    className: 'blue-card',
  },
  {
    label: '熔岩流速度',
    value: lavaFlowSpeed.value > 0.02 ? `${lavaFlowSpeed.value.toFixed(2)} m/s` : '—',
    description: '黏度越低，流动性越强',
    className: 'cyan-card',
  },
])

const structureLegend = [
  { label: '熔融岩浆', color: '#ff5a13', description: '岩浆房、通道、岩脉与熔岩流' },
  { label: '地表火山体', color: '#526a3f', description: '火山锥、熔岩覆盖与植被地表' },
  { label: '岩层剖面', color: '#8e7354', description: '展示地壳层理与切割面' },
  { label: '火山口湖', color: '#2b77b8', description: '动态水面与喷发后洼地' },
  { label: '火山灰与碎屑', color: '#9aa1a6', description: '喷发柱、火山弹与碎屑物' },
]

function jumpToStage(stage: string) {
  const target = eruptionStageOptions.find((item) => item.value === stage)
  if (!target) return
  progress.value = target.progress
  isPlaying.value = false
}

function togglePlayback() {
  if (isPlaying.value) {
    isPlaying.value = false
    return
  }
  // 播放结束后再次点击应重新演示，而不是在 100% 立即被时间轴停住。
  if (progress.value >= 99.999) progress.value = 0
  timelineLastTime = performance.now()
  isPlaying.value = true
}

const BASE_WIDTH = 16
const BASE_DEPTH = 11
const BASE_BOTTOM = -3.45
const SECTION_FACE_Z = BASE_DEPTH / 2 + 0.002
const MAIN_VOLCANO = new THREE.Vector2(2.25, 2.25)
const SNOW_VOLCANO = new THREE.Vector2(-3.65, 0.25)
const SMALL_CONE = new THREE.Vector2(-0.2, -2.45)
// 火山口湖放在主岩浆系统另一侧、靠近右侧边缘的位置。
const LAKE_CENTER = new THREE.Vector2(6.3, 2.65)
const LAKE_BASIN_FLOOR = 0.88

const SURFACE_FISSURES: Array<{
  points: Array<[number, number]>
  trenchWidth: number
  trenchDepth: number
  outerWidth: number
  innerWidth: number
}> = [
    {
      points: [[-6.25, 5.42], [-6.18, 4.86], [-5.78, 4.62], [-5.3, 4.54], [-4.84, 4.42], [-4.42, 4.25], [-4.05, 4.02], [-3.72, 3.75]],
      trenchWidth: 0.14,
      trenchDepth: 0.12,
      outerWidth: 0.22,
      innerWidth: 0.038,
    },
    {
      points: [[-5.34, 4.55], [-5.22, 4.28], [-5.02, 4.04], [-4.78, 3.9]],
      trenchWidth: 0.09,
      trenchDepth: 0.075,
      outerWidth: 0.13,
      innerWidth: 0.022,
    },
    {
      points: [[-4.72, 4.37], [-4.55, 4.62], [-4.31, 4.78], [-4.03, 4.84]],
      trenchWidth: 0.082,
      trenchDepth: 0.065,
      outerWidth: 0.115,
      innerWidth: 0.02,
    },
    {
      points: [[-5.76, 4.63], [-5.88, 4.35], [-6.05, 4.17]],
      trenchWidth: 0.072,
      trenchDepth: 0.058,
      outerWidth: 0.1,
      innerWidth: 0.018,
    },
  ]

function isLakeSurfaceOpening(x: number, z: number) {
  const dx = (x - LAKE_CENTER.x) / 1.28
  const dz = (z - LAKE_CENTER.y) / 0.88
  return dx * dx + dz * dz < 1
}

function seededNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.72 + z * 0.38) * 0.42 +
    Math.sin(x * 1.63 - z * 1.12) * 0.25 +
    Math.sin(x * 3.18 + z * 2.37) * 0.13 +
    Math.sin(x * 5.45 - z * 4.08) * 0.055
  )
}

function volcanoBump(x: number, z: number, center: THREE.Vector2, radius: number, height: number) {
  const dx = x - center.x
  const dz = z - center.y
  const r = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dz, dx)
  const rimVariation = 1 + Math.sin(angle * 3.0 + center.x) * 0.035 + Math.sin(angle * 7.0 - center.y) * 0.018
  const normalized = r / (radius * rimVariation)
  if (normalized >= 1.65) return 0
  return height * Math.exp(-Math.pow(normalized, 2.0))
}

function radialErosion(x: number, z: number, center: THREE.Vector2, radius: number, phase: number) {
  const dx = x - center.x
  const dz = z - center.y
  const r = Math.hypot(dx, dz)
  const normalized = r / radius
  if (normalized < 0.28 || normalized > 1.5) return 0

  const angle = Math.atan2(dz, dx)
  const channelA = Math.pow(Math.max(0, Math.cos(angle * 9 + phase + normalized * 2.2)), 8)
  const channelB = Math.pow(Math.max(0, Math.cos(angle * 14 - phase * 0.7 - normalized * 3.1)), 12)
  const rise = THREE.MathUtils.smoothstep(normalized, 0.28, 0.62)
  const fall = 1 - THREE.MathUtils.smoothstep(normalized, 1.02, 1.5)
  return -(channelA * 0.12 + channelB * 0.055) * rise * fall
}

function distanceToFissureSegment(
  x: number,
  z: number,
  start: [number, number],
  end: [number, number],
) {
  const vx = end[0] - start[0]
  const vz = end[1] - start[1]
  const wx = x - start[0]
  const wz = z - start[1]
  const segmentLengthSquared = vx * vx + vz * vz
  const t = segmentLengthSquared > 0
    ? THREE.MathUtils.clamp((wx * vx + wz * vz) / segmentLengthSquared, 0, 1)
    : 0
  return Math.hypot(x - (start[0] + vx * t), z - (start[1] + vz * t))
}

function fissureDepthAt(x: number, z: number) {
  let depth = 0
  SURFACE_FISSURES.forEach((fissure) => {
    for (let i = 0; i < fissure.points.length - 1; i++) {
      const distance = distanceToFissureSegment(x, z, fissure.points[i], fissure.points[i + 1])
      const localDepth = fissure.trenchDepth * Math.exp(-Math.pow(distance / fissure.trenchWidth, 2.35))
      depth = Math.max(depth, localDepth)
    }
  })
  return depth
}

function terrainHeight(x: number, z: number) {
  let y = 0.3 + seededNoise(x, z) * 0.09

  const mainDx = x - MAIN_VOLCANO.x
  const mainDz = z - MAIN_VOLCANO.y
  const mainR = Math.sqrt(mainDx * mainDx + mainDz * mainDz)
  y += volcanoBump(x, z, MAIN_VOLCANO, 3.15, 4.55)
  y += radialErosion(x, z, MAIN_VOLCANO, 3.15, 0.7)
  y -= 1.12 * Math.exp(-Math.pow(mainR / 0.7, 4.2))

  const snowDx = x - SNOW_VOLCANO.x
  const snowDz = z - SNOW_VOLCANO.y
  const snowR = Math.sqrt(snowDx * snowDx + snowDz * snowDz)
  y += volcanoBump(x, z, SNOW_VOLCANO, 2.45, 3.65)
  y += radialErosion(x, z, SNOW_VOLCANO, 2.45, 2.1)
  y -= 0.58 * Math.exp(-Math.pow(snowR / 0.52, 4.2))

  const smallDx = x - SMALL_CONE.x
  const smallDz = z - SMALL_CONE.y
  const smallR = Math.sqrt(smallDx * smallDx + smallDz * smallDz)
  y += volcanoBump(x, z, SMALL_CONE, 1.25, 1.55)
  y += radialErosion(x, z, SMALL_CONE, 1.25, -1.4) * 0.68
  y -= 0.4 * Math.exp(-Math.pow(smallR / 0.32, 4.2))

  const lakeDx = x - LAKE_CENTER.x
  const lakeDz = z - LAKE_CENTER.y
  const lakeR = Math.hypot(lakeDx / 1.35, lakeDz / 0.98)
  // 把原始山坡平滑融合成浅洼台地，而不是直接向下挖出陡壁深坑。
  const basinBlend = 1 - THREE.MathUtils.smoothstep(lakeR, 0.62, 1.85)
  const shallowBasin = LAKE_BASIN_FLOOR + THREE.MathUtils.smootherstep(lakeR, 0, 1.35) * 0.16
  y = THREE.MathUtils.lerp(y, shallowBasin, basinBlend * 0.94)
  y -= fissureDepthAt(x, z)

  return y
}

function lakeSurfaceLevel() {
  // 水面压入宽缓盆底，外围网格会延伸到岸坡内部并被地形遮挡。
  return terrainHeight(LAKE_CENTER.x, LAKE_CENTER.y) + 0.018
}

function terrainColor(x: number, y: number, z: number) {
  const c = new THREE.Color('#9aa98c')
  const lowland = new THREE.Color('#9aab8a')
  const highland = new THREE.Color('#a19f88')
  const exposedRock = new THREE.Color('#aaa393')
  const craterRock = new THREE.Color('#8e8173')
  const snow = new THREE.Color('#f0f2f1')
  const fissureRock = new THREE.Color('#17110f')
  const n = seededNoise(x * 0.72, z * 0.72)
  const mainDist = Math.hypot(x - MAIN_VOLCANO.x, z - MAIN_VOLCANO.y)
  const snowDist = Math.hypot(x - SNOW_VOLCANO.x, z - SNOW_VOLCANO.y)

  const highlandMix = THREE.MathUtils.smoothstep(y, 0.72, 2.35)
  const rockMix = THREE.MathUtils.smoothstep(y, 1.72, 3.3) * (0.52 + Math.max(0, n) * 0.28)
  const craterMix = (1 - THREE.MathUtils.smoothstep(mainDist, 0.72, 1.72)) * THREE.MathUtils.smoothstep(y, 2.45, 3.42)
  const snowAltitude = THREE.MathUtils.smoothstep(y + n * 0.13, 2.62, 3.32)
  const snowRadius = 1 - THREE.MathUtils.smoothstep(snowDist, 0.78, 1.65)
  const mainSnowAltitude = THREE.MathUtils.smoothstep(y + n * 0.1, 3.05, 3.72)
  const mainSnowRadius = 1 - THREE.MathUtils.smoothstep(mainDist, 0.68, 1.78)
  const mainCraterMask = THREE.MathUtils.smoothstep(mainDist, 0.48, 0.78)
  const snowMix = THREE.MathUtils.clamp(
    Math.max(snowAltitude * snowRadius, mainSnowAltitude * mainSnowRadius * mainCraterMask),
    0,
    1,
  )

  c.copy(lowland).lerp(highland, highlandMix)
  c.lerp(exposedRock, rockMix)
  c.lerp(craterRock, craterMix)
  c.lerp(snow, snowMix)
  c.lerp(fissureRock, THREE.MathUtils.clamp(fissureDepthAt(x, z) / 0.12 * 0.82, 0, 0.82))
  c.offsetHSL(n * 0.008, n * 0.012, n * 0.025)
  c.multiplyScalar(1.18)
  return c
}

function createTerrainGeometry() {
  const segX = 196
  const segZ = 136
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let iz = 0; iz <= segZ; iz++) {
    const z = -BASE_DEPTH / 2 + (iz / segZ) * BASE_DEPTH
    for (let ix = 0; ix <= segX; ix++) {
      const x = -BASE_WIDTH / 2 + (ix / segX) * BASE_WIDTH
      const y = terrainHeight(x, z)
      const color = terrainColor(x, y, z)
      positions.push(x, y, z)
      colors.push(color.r, color.g, color.b)
      uvs.push(ix / segX, iz / segZ)
    }
  }

  const row = segX + 1
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * row + ix
      const b = a + 1
      const c = a + row
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function snowCoverage(x: number, y: number, z: number) {
  const detail = seededNoise(x * 1.15, z * 1.15) * 0.2

  const mainDistance = Math.hypot(x - MAIN_VOLCANO.x, z - MAIN_VOLCANO.y)
  const mainAngle = Math.atan2(z - MAIN_VOLCANO.y, x - MAIN_VOLCANO.x)
  const mainAltitude = THREE.MathUtils.smoothstep(
    y + detail + Math.sin(mainAngle * 6.0) * 0.12,
    2.72,
    3.5,
  )
  const mainRadius = 1 - THREE.MathUtils.smoothstep(mainDistance, 0.72, 1.92)
  const craterOpening = THREE.MathUtils.smoothstep(mainDistance, 0.48, 0.74)

  const snowDistance = Math.hypot(x - SNOW_VOLCANO.x, z - SNOW_VOLCANO.y)
  const snowAngle = Math.atan2(z - SNOW_VOLCANO.y, x - SNOW_VOLCANO.x)
  const snowAltitude = THREE.MathUtils.smoothstep(
    y + detail + Math.sin(snowAngle * 7.0 + 0.8) * 0.15,
    2.35,
    3.05,
  )
  const snowRadius = 1 - THREE.MathUtils.smoothstep(snowDistance, 0.58, 1.72)
  const secondaryCraterOpening = THREE.MathUtils.smoothstep(snowDistance, 0.34, 0.58)

  return THREE.MathUtils.clamp(
    Math.max(
      mainAltitude * mainRadius * craterOpening,
      snowAltitude * snowRadius * secondaryCraterOpening,
    ),
    0,
    1,
  )
}

function createSnowCapGeometry() {
  const segX = 196
  const segZ = 136
  const positions: number[] = []
  const colors: number[] = []
  const coverage: number[] = []
  const indices: number[] = []
  const shadowSnow = new THREE.Color('#b9c5ca')
  const freshSnow = new THREE.Color('#ffffff')

  for (let iz = 0; iz <= segZ; iz++) {
    const z = -BASE_DEPTH / 2 + (iz / segZ) * BASE_DEPTH
    for (let ix = 0; ix <= segX; ix++) {
      const x = -BASE_WIDTH / 2 + (ix / segX) * BASE_WIDTH
      const y = terrainHeight(x, z)
      const amount = snowCoverage(x, y, z)
      const color = shadowSnow.clone().lerp(freshSnow, 0.38 + amount * 0.62)
      positions.push(x, y + 0.028 + amount * 0.012, z)
      const alpha = THREE.MathUtils.smoothstep(amount, 0.08, 0.78)
      colors.push(color.r, color.g, color.b, alpha)
      coverage.push(amount)
    }
  }

  const row = segX + 1
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * row + ix
      const b = a + 1
      const c = a + row
      const d = c + 1
      const maximum = Math.max(coverage[a]!, coverage[b]!, coverage[c]!, coverage[d]!)
      if (maximum < 0.025) continue
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createStrataTexture() {
  const texture = new THREE.TextureLoader().load(strataAlbedoUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.25, 1.55)
  texture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy() ?? 4, 12)
  return texture
}

function createEdgeWallGeometry(side: 'front' | 'back' | 'left' | 'right') {
  const horizontalSegments = side === 'front' || side === 'back' ? 96 : 70
  const verticalSegments = side === 'front' ? 34 : 1
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let iy = 0; iy <= verticalSegments; iy++) {
    const v = iy / verticalSegments
    for (let i = 0; i <= horizontalSegments; i++) {
      const t = i / horizontalSegments
      let x = 0
      let z = 0
      if (side === 'front' || side === 'back') {
        x = -BASE_WIDTH / 2 + t * BASE_WIDTH
        z = side === 'front' ? BASE_DEPTH / 2 : -BASE_DEPTH / 2
      } else {
        x = side === 'right' ? BASE_WIDTH / 2 : -BASE_WIDTH / 2
        z = -BASE_DEPTH / 2 + t * BASE_DEPTH
      }
      const top = terrainHeight(x, z)
      const y = BASE_BOTTOM + (top - BASE_BOTTOM) * v
      positions.push(x, y, z)
      uvs.push(t, v)
    }
  }

  const row = horizontalSegments + 1
  for (let iy = 0; iy < verticalSegments; iy++) {
    for (let i = 0; i < horizontalSegments; i++) {
      const a = iy * row + i
      const b = a + 1
      const c = a + row
      const d = c + 1

      // 四个侧壁三角形必须朝模型外侧，否则 MeshStandardMaterial 默认背面剔除，
      // 会造成岩层侧壁完全看不见，看起来像整个模型底部被掏空。
      if (side === 'front' || side === 'left') {
        indices.push(a, b, c, b, d, c)
      } else {
        indices.push(a, c, b, b, c, d)
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createBottomGeometry() {
  const g = new THREE.PlaneGeometry(BASE_WIDTH, BASE_DEPTH)
  g.rotateX(Math.PI / 2)
  g.translate(0, BASE_BOTTOM, 0)
  return g
}

function createIrregularSphere(radius = 1) {
  const geometry = new THREE.SphereGeometry(radius, 64, 40)
  const pos = geometry.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const scale = 1 + Math.sin(v.x * 4.2 + v.y * 2.8) * 0.045 + Math.sin(v.z * 5.6 - v.y * 1.7) * 0.03
    v.multiplyScalar(scale)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function createNoiseTexture(size = 128) {
  const data = new Uint8Array(size * size * 4)
  let seed = 918273
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967295
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const wave = 0.5 + 0.24 * Math.sin(x * 0.17 + y * 0.08) + 0.18 * Math.sin(x * 0.047 - y * 0.13)
      const value = THREE.MathUtils.clamp((wave * 0.72 + random() * 0.28) * 255, 0, 255)
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = value
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

function createLavaTileTexture(size = 128) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const s =
        Math.sin(x * 0.18) +
        Math.sin(y * 0.21) +
        Math.sin((x + y) * 0.085) +
        Math.sin(Math.hypot(x - 64, y - 64) * 0.24)
      const t = THREE.MathUtils.clamp((s + 4) / 8, 0, 1)
      const hot = Math.pow(t, 1.6)
      data[i] = 150 + Math.round(105 * hot)
      data[i + 1] = Math.round(25 + 190 * Math.pow(hot, 2.2))
      data[i + 2] = Math.round(4 + 28 * hot)
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

const lavaVertexShader = `
  uniform float time;
  uniform float surfaceFlow;
  uniform vec2 uvScale;
  uniform float displacementStrength;
  varying vec2 vUv;
  varying float vAcross;
  varying float vAlong;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv * uvScale;
    vAcross = uv.x;
    vAlong = uv.y;
    float waveTime = time * (1.0 - surfaceFlow);
    float wave = sin(vUv.y * 7.0 - waveTime * 2.1 + sin(vUv.x * 5.0)) * 0.014;
    wave += sin(vUv.x * 10.0 + vUv.y * 3.0 + waveTime * 1.35) * 0.006;
    vec3 displacedPosition = position + normal * wave * displacementStrength;
    vec4 viewPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const lavaFragmentShader = `
  uniform float time;
  uniform float surfaceFlow;
  uniform float opacityValue;
  uniform float flowHead;
  uniform float highlightStrength;
  uniform float pressureLevel;
  uniform float pressurePulse;
  uniform float pressureChannel;
  varying vec2 vUv;
  varying float vAcross;
  varying float vAlong;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
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
    float amplitude = 0.56;
    for (int i = 0; i < 4; i++) {
      value += valueNoise(p) * amplitude;
      p = mat2(1.62, 1.18, -1.18, 1.62) * p + 1.7;
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    float roundedTipInset = pow(abs(vAcross - 0.5) * 2.0, 1.7) * 0.035;
    float reveal = 1.0;
    if (flowHead < 0.999) {
      reveal = 1.0 - smoothstep(
        flowHead - 0.028 - roundedTipInset,
        flowHead + 0.014 - roundedTipInset,
        vAlong
      );
      if (reveal < 0.012) discard;
    }
    // 地表熔岩的底纹保持稳定，只让下方明确的高光带沿 vAlong 0 -> 1 移动。
    float textureTime = time * (1.0 - surfaceFlow);
    vec2 flowUv = vec2(vUv.x * 0.72, vUv.y - textureTime * 0.2);
    float broadFlow = fbm(flowUv * 1.25 + vec2(sin(flowUv.y * 0.7) * 0.35, 0.0));
    float slowFlow = fbm(flowUv * 2.35 + vec2(0.0, textureTime * 0.07));
    float brightVeins = smoothstep(0.42, 0.76, broadFlow * 0.7 + slowFlow * 0.38);
    float coolingCrust = smoothstep(0.66, 0.88, fbm(flowUv * 3.1 - textureTime * 0.035));
    float edge = smoothstep(0.0, 0.16, vAcross) * smoothstep(0.0, 0.16, 1.0 - vAcross);

    vec3 deepRed = vec3(0.34, 0.018, 0.005);
    vec3 moltenOrange = vec3(1.0, 0.18, 0.006);
    vec3 moltenYellow = vec3(1.0, 0.72, 0.08);
    vec3 cooledRock = vec3(0.075, 0.018, 0.012);
    vec3 color = mix(deepRed, moltenOrange, brightVeins);
    color = mix(color, moltenYellow, pow(brightVeins, 3.2) * 0.82);
    color = mix(color, cooledRock, coolingCrust * 0.52);
    color *= 0.8 + edge * 0.28;
    float chamberJunction = pressureChannel * (1.0 - smoothstep(0.0, 0.2, vAlong));
    color = mix(color, deepRed * 0.92, chamberJunction * 0.76);
    vec3 surfaceNormal = normalize(vViewNormal);
    vec3 viewDirection = normalize(-vViewPosition);
    float facing = max(dot(surfaceNormal, viewDirection), 0.0);
    float fresnel = pow(1.0 - facing, 2.2);
    float liquidSheen = pow(max(dot(surfaceNormal, normalize(vec3(-0.35, 0.78, 0.52))), 0.0), 18.0);
    vec3 halfDirection = normalize(viewDirection + normalize(vec3(-0.24, 0.68, 0.7)));
    float glossyHighlight = pow(max(dot(surfaceNormal, halfDirection), 0.0), 26.0);
    float broadHighlight = pow(facing, 4.0);
    float moltenCenter = pow(edge, 2.6) * (0.3 + brightVeins * 0.7);
    // 高光与几何显现共用同一个流动前沿，确保两者始终沿 vAlong 0 -> 1 同向下坡。
    float downhillFront = clamp(flowHead, 0.0, 1.0);
    float downhillLead = exp(-pow((vAlong - downhillFront) * 13.0, 2.0));
    float downhillWake = exp(-pow((vAlong - max(0.0, downhillFront - 0.13)) * 10.0, 2.0)) * 0.42;
    float downhillBreakup = 0.42 + valueNoise(vec2(vAcross * 5.2, vAlong * 17.0)) * 0.58;
    float surfacePulse = 0.88 + sin(time * 1.35) * 0.12;
    float downhillHighlight = (downhillLead + downhillWake) * downhillBreakup * edge * surfaceFlow * surfacePulse;
    float storedPressure = pressureLevel * (0.38 + pressurePulse * 0.62);
    float risingPressure = exp(-pow((fract(vAlong - time * 0.34) - 0.5) * 6.5, 2.0));
    color += vec3(1.0, 0.34, 0.06) * liquidSheen * 0.62;
    color += vec3(0.72, 0.08, 0.015) * fresnel * 0.24;
    color += vec3(1.0, 0.36, 0.055) * broadHighlight * highlightStrength * 0.2;
    color += vec3(1.0, 0.74, 0.22) * glossyHighlight * highlightStrength * 0.78;
    color += vec3(1.0, 0.22, 0.018) * moltenCenter * highlightStrength * 0.24;
    color += vec3(1.0, 0.52, 0.08) * downhillHighlight * highlightStrength * 0.78;
    color += vec3(0.82, 0.07, 0.008) * storedPressure * (0.16 + edge * 0.18);
    color += vec3(1.0, 0.76, 0.18) * risingPressure * pressureChannel * pressureLevel * 0.72;
    gl_FragColor = vec4(color, opacityValue * reveal);
  }
`

let noiseTexture: THREE.Texture | null = null
let lavaTileTexture: THREE.Texture | null = null
const lavaMaterials: THREE.ShaderMaterial[] = []

function createLavaMaterial(
  uvScale = new THREE.Vector2(2, 2),
  opacity = 1,
  timeScale = 0.45,
  highlightStrength = 0.42,
) {
  if (!noiseTexture) noiseTexture = createNoiseTexture()
  if (!lavaTileTexture) lavaTileTexture = createLavaTileTexture()

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      surfaceFlow: { value: 0 },
      uvScale: { value: uvScale.clone() },
      displacementStrength: { value: 1 },
      noiseMap: { value: noiseTexture },
      lavaMap: { value: lavaTileTexture },
      opacityValue: { value: opacity },
      flowHead: { value: 1 },
      highlightStrength: { value: highlightStrength },
      pressureLevel: { value: 0 },
      pressurePulse: { value: 0 },
      pressureChannel: { value: 0 },
    },
    vertexShader: lavaVertexShader,
    fragmentShader: lavaFragmentShader,
    transparent: opacity < 1,
    depthWrite: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  material.userData.timeScale = timeScale
  lavaMaterials.push(material)
  return material
}

function createRibbonGeometry(
  points: THREE.Vector3[],
  width = 0.45,
  surfaceOffset = 0.012,
  crownHeight = 0.022,
  lateralSegments = 8,
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const tangent = next.clone().sub(prev).setY(0).normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x)
    const progressAlongFlow = i / Math.max(1, points.length - 1)
    const edgeVariation = 1 + Math.sin(i * 1.73) * 0.075 + Math.sin(i * 0.61 + 1.2) * 0.045
    const taper = (0.5 + 0.5 * THREE.MathUtils.smootherstep(progressAlongFlow, 0, 0.72)) * edgeVariation
    const p = points[i]
    for (let lane = 0; lane <= lateralSegments; lane++) {
      const u = lane / lateralSegments
      const across = u * 2 - 1
      const vertex = p.clone().addScaledVector(side, width * 0.5 * taper * across)
      const attachedY = terrainHeight(vertex.x, vertex.z)
      const crown = (1 - across * across) * crownHeight
      positions.push(vertex.x, attachedY + surfaceOffset + crown, vertex.z)
      uvs.push(u, progressAlongFlow)
    }
    if (i < points.length - 1) {
      const row = lateralSegments + 1
      for (let lane = 0; lane < lateralSegments; lane++) {
        const a = i * row + lane
        const b = a + 1
        const c = a + row
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createSectionChannelGeometry(
  points: THREE.Vector3[],
  startWidth: number,
  endWidth: number,
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  // 通道与剖面共面，通过材质深度偏移保证可见，侧视时不会悬在模型外。
  const sectionZ = SECTION_FACE_Z

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const tangent = next.clone().sub(prev)
    tangent.z = 0
    tangent.normalize()
    const side = new THREE.Vector3(-tangent.y, tangent.x, 0)
    const along = i / Math.max(1, points.length - 1)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, THREE.MathUtils.smootherstep(along, 0, 1))
    const left = points[i].clone().addScaledVector(side, width * 0.5)
    const right = points[i].clone().addScaledVector(side, -width * 0.5)
    positions.push(left.x, left.y, sectionZ, right.x, right.y, sectionZ)
    uvs.push(0, along, 1, along)

    if (i < points.length - 1) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
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

function createRightWallChannelGeometry(
  points: THREE.Vector2[],
  startWidth: number,
  endWidth: number,
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const wallX = BASE_WIDTH / 2 + 0.002

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const tangent = next.clone().sub(prev).normalize()
    const side = new THREE.Vector2(-tangent.y, tangent.x)
    const along = i / Math.max(1, points.length - 1)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, THREE.MathUtils.smootherstep(along, 0, 1))
    const left = points[i].clone().addScaledVector(side, width * 0.5)
    const right = points[i].clone().addScaledVector(side, -width * 0.5)
    positions.push(wallX, left.y, left.x, wallX, right.y, right.x)
    uvs.push(0, along, 1, along)

    if (i < points.length - 1) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWallPatchGeometry(
  points: Array<[number, number]>,
  face: 'front' | 'left',
) {
  const shape = new THREE.Shape()
  points.forEach(([horizontal, y], index) => {
    if (index === 0) shape.moveTo(horizontal, y)
    else shape.lineTo(horizontal, y)
  })
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape, 12)
  if (face === 'front') {
    geometry.translate(0, 0, SECTION_FACE_Z)
  } else {
    geometry.rotateY(-Math.PI / 2)
    geometry.translate(-BASE_WIDTH / 2 - 0.002, 0, 0)
  }
  geometry.computeVertexNormals()
  return geometry
}

function createFlowPath(raw: Array<[number, number]>, yOffset = 0.06) {
  const controls = raw.map(([x, z]) => new THREE.Vector3(x, 0, z))
  const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal')
  return curve.getPoints(Math.max(32, raw.length * 8)).map((point) =>
    new THREE.Vector3(point.x, terrainHeight(point.x, point.z) + yOffset, point.z)
  )
}

function createEllipseGridGeometry(widthX: number, widthZ: number, resolution = 64) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let z = 0; z < resolution; z++) {
    const vz = z / (resolution - 1)
    for (let x = 0; x < resolution; x++) {
      const vx = x / (resolution - 1)
      positions.push((vx - 0.5) * widthX, (vz - 0.5) * widthZ, 0)
      uvs.push(vx, vz)
    }
  }
  for (let z = 0; z < resolution - 1; z++) {
    for (let x = 0; x < resolution - 1; x++) {
      const cx = ((x + 0.5) / (resolution - 1) - 0.5) * 2
      const cz = ((z + 0.5) / (resolution - 1) - 0.5) * 2
      if (cx * cx + cz * cz > 0.93) continue
      const a = z * resolution + x
      const b = a + 1
      const c = a + resolution
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

let scene: THREE.Scene | null = null
let sceneBackgroundTexture: THREE.Texture | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let modelGroup: THREE.Group | null = null
let terrainMesh: THREE.Mesh | null = null
let terrainWaterUniforms: {
  time: { value: number }
  visible: { value: number }
  center: { value: THREE.Vector2 }
  level: { value: number }
} | null = null
let snowCapMesh: THREE.Mesh | null = null
let magmaChamber: THREE.Mesh | null = null
let magmaPressureGlowMesh: THREE.Mesh | null = null
let magmaNeckMesh: THREE.Mesh | null = null
let conduitMesh: THREE.Mesh | null = null
let collapsedChamberGroup: THREE.Group | null = null
let lavaFlowMesh: THREE.Mesh | null = null
const lavaFlowMeshes: THREE.Mesh[] = []
let fissureMesh: THREE.Mesh | null = null
let fissureCrackGroup: THREE.Group | null = null
const fissureGlowMeshes: THREE.Mesh[] = []
let craterGlowMesh: THREE.Mesh | null = null
let craterPoolMesh: THREE.Mesh | null = null
let secondaryCraterCrustMesh: THREE.Mesh | null = null
let secondaryCraterPoolMesh: THREE.Mesh | null = null
let secondaryCraterLight: THREE.PointLight | null = null
let lakeProxyMesh: THREE.Mesh | null = null
let fallbackWater: Water | null = null
let ashCloudGroup: THREE.Group | null = null
let ashCloudTexture: THREE.Texture | null = null
let ejectaGroup: THREE.Group | null = null
let ejectaTexture: THREE.Texture | null = null
let mainLight: THREE.DirectionalLight | null = null
let fillLight: THREE.DirectionalLight | null = null
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let lastFrameTime = performance.now()
let timelineLastTime = 0
let timelineAnimationFrameId = 0
let pointerDownPosition: { x: number; y: number } | null = null

const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = []
const interactiveMeshes: THREE.Object3D[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

let waterRenderer: any = null
let waterScene: THREE.Scene | null = null
let waterMesh: THREE.Mesh | null = null
let waterComputeAtoB: any = null
let waterComputeBtoA: any = null
let waterReadFromA: any = null
let waterPingPong = 0
let waterFrameCounter = 0
let waterImpactPos: any = null
let waterImpactPower: any = null

const sceneLabels = [
  { id: 'label-crater', label: '火山口', structureId: 'crater', position: new THREE.Vector3(2.18, 4.13, 2.22), offset: [-14, -30] },
  { id: 'label-cone', label: '火山锥', structureId: 'volcanicCone', position: new THREE.Vector3(0.98, 2.68, 2.12), offset: [-52, 4] },
  { id: 'label-flow', label: '熔岩流', structureId: 'lavaFlow', position: new THREE.Vector3(4.62, 1.68, 4.05), offset: [16, -16] },
  { id: 'label-conduit', label: '火山通道', structureId: 'conduit', position: new THREE.Vector3(2.45, 0.3, 5.62), offset: [38, -2] },
  { id: 'label-chamber', label: '岩浆房', structureId: 'magmaChamber', position: new THREE.Vector3(2.25, -1.82, 5.62), offset: [54, 18] },
  { id: 'label-fissure', label: '火山裂隙', structureId: 'fissure', position: new THREE.Vector3(-5.55, 0.9, 4.45), offset: [-70, -14] },
  { id: 'label-lake', label: '火山口湖', structureId: 'craterLake', position: new THREE.Vector3(LAKE_CENTER.x, lakeSurfaceLevel() + 0.16, LAKE_CENTER.y), offset: [-18, -34] },
  { id: 'label-collapsed', label: '崩塌后的岩浆房', structureId: 'collapsedChamber', position: new THREE.Vector3(BASE_WIDTH / 2 + 0.04, -1.82, LAKE_CENTER.y), offset: [-150, 18] },
]

const labelElements = new Map<string, HTMLElement>()
function setLabelRef(id: string, el: any) {
  if (el instanceof HTMLElement) labelElements.set(id, el)
}

function updateSceneLabels() {
  if (!camera || !threeContainerRef.value || !showLabels.value) return
  const width = threeContainerRef.value.clientWidth
  const height = threeContainerRef.value.clientHeight
  for (const item of sceneLabels) {
    const el = labelElements.get(item.id)
    if (!el) continue
    const p = item.position.clone().project(camera)
    const visible = p.z > -1 && p.z < 1
    if (!visible) {
      el.style.opacity = '0'
      continue
    }
    const x = (p.x * 0.5 + 0.5) * width + item.offset[0]
    const y = (-p.y * 0.5 + 0.5) * height + item.offset[1]
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    el.style.opacity = '1'
  }
}

function addInteractive(object: THREE.Object3D, structureId: string) {
  object.userData.structureId = structureId
  interactiveMeshes.push(object)
}

function createCollapsedChamber(group: THREE.Group) {
  collapsedChamberGroup = new THREE.Group()
  collapsedChamberGroup.name = 'collapsedMagmaFissureNetwork'

  const crackMaterial = new THREE.MeshBasicMaterial({
    color: 0x120a08,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  const fissureMaterial = createLavaMaterial(new THREE.Vector2(0.78, 5.4), 0.98, 0.22, 0.92)
  fissureMaterial.uniforms.displacementStrength.value = 0
  fissureMaterial.polygonOffset = true
  fissureMaterial.polygonOffsetFactor = -3
  fissureMaterial.polygonOffsetUnits = -3

  const collapseFissures: Array<{
    points: Array<[number, number]>
    outerWidth: number
    innerWidth: number
  }> = [
      // 下沉后的顶板破裂带；不再形成一团岩浆，而是作为深部裂缝网络的起点。
      { points: [[1.08, -1.46], [1.5, -1.58], [1.94, -1.52], [2.36, -1.68], [2.82, -1.57], [3.3, -1.72], [4.08, -1.62]], outerWidth: 0.2, innerWidth: 0.07 },
      { points: [[1.5, -1.57], [1.34, -1.28], [1.48, -0.98], [1.35, -0.7]], outerWidth: 0.14, innerWidth: 0.047 },
      { points: [[2.02, -1.55], [1.94, -1.22], [2.12, -0.92], [2.06, -0.58]], outerWidth: 0.15, innerWidth: 0.052 },
      { points: [[2.83, -1.58], [2.98, -1.26], [3.24, -1.02], [3.2, -0.72]], outerWidth: 0.14, innerWidth: 0.048 },

      // 主裂缝向剖面深部继续扩散，底端略向湖心一侧偏移。
      { points: [[2.36, -1.67], [2.24, -2.02], [2.4, -2.36], [2.28, -2.72], [2.46, -3.16]], outerWidth: 0.19, innerWidth: 0.067 },
      { points: [[1.72, -1.55], [1.5, -1.86], [1.62, -2.18], [1.38, -2.52], [1.48, -2.94]], outerWidth: 0.17, innerWidth: 0.058 },
      { points: [[2.82, -1.6], [2.96, -1.94], [2.82, -2.26], [3.08, -2.58], [2.98, -3.0]], outerWidth: 0.17, innerWidth: 0.058 },
      { points: [[3.3, -1.7], [3.5, -1.98], [3.4, -2.3], [3.68, -2.58], [3.56, -2.9]], outerWidth: 0.14, innerWidth: 0.045 },

      // 底部次生分裂：从深部主裂缝继续分叉，形成不规则的树枝状熔岩脉。
      { points: [[2.34, -2.44], [2.04, -2.58], [1.82, -2.82], [1.5, -2.94]], outerWidth: 0.13, innerWidth: 0.041 },
      { points: [[2.34, -2.46], [2.66, -2.62], [2.98, -2.58]], outerWidth: 0.13, innerWidth: 0.041 },
      { points: [[2.45, -3.13], [2.18, -3.27], [1.92, -3.18]], outerWidth: 0.11, innerWidth: 0.034 },
      { points: [[2.46, -3.14], [2.74, -3.27], [3.02, -3.12]], outerWidth: 0.11, innerWidth: 0.034 },
      { points: [[1.48, -2.92], [1.22, -3.1], [0.96, -3.04]], outerWidth: 0.1, innerWidth: 0.031 },
      { points: [[3.56, -2.88], [3.82, -3.08], [4.08, -3.0]], outerWidth: 0.1, innerWidth: 0.031 },

      // 密集末梢裂缝：填充主脉之间的空隙，并在底边前逐级收细、分叉。
      { points: [[1.58, -2.16], [1.28, -2.28], [1.06, -2.5], [0.74, -2.58]], outerWidth: 0.105, innerWidth: 0.032 },
      { points: [[1.4, -2.5], [1.12, -2.68], [0.82, -2.72], [0.58, -2.92]], outerWidth: 0.09, innerWidth: 0.027 },
      { points: [[1.42, -2.56], [1.7, -2.68], [1.86, -2.9]], outerWidth: 0.085, innerWidth: 0.026 },
      { points: [[1.48, -2.92], [1.62, -3.14], [1.48, -3.35]], outerWidth: 0.08, innerWidth: 0.024 },
      { points: [[1.2, -3.08], [1.02, -3.25], [0.76, -3.34]], outerWidth: 0.072, innerWidth: 0.021 },

      { points: [[2.24, -2.04], [1.98, -2.2], [1.8, -2.38]], outerWidth: 0.1, innerWidth: 0.03 },
      { points: [[2.4, -2.34], [2.58, -2.48], [2.64, -2.72], [2.84, -2.84]], outerWidth: 0.095, innerWidth: 0.029 },
      { points: [[2.28, -2.72], [2.06, -2.9], [2.12, -3.1]], outerWidth: 0.085, innerWidth: 0.025 },
      { points: [[2.18, -3.26], [2.02, -3.38], [1.78, -3.34]], outerWidth: 0.065, innerWidth: 0.019 },
      { points: [[2.74, -3.26], [2.9, -3.38], [3.12, -3.3]], outerWidth: 0.065, innerWidth: 0.019 },

      { points: [[2.86, -2.25], [3.12, -2.38], [3.34, -2.34]], outerWidth: 0.1, innerWidth: 0.03 },
      { points: [[3.08, -2.58], [3.3, -2.7], [3.5, -2.9]], outerWidth: 0.09, innerWidth: 0.027 },
      { points: [[3.0, -2.98], [3.18, -3.16], [3.4, -3.24]], outerWidth: 0.08, innerWidth: 0.023 },
      { points: [[3.56, -2.88], [3.42, -3.1], [3.52, -3.34]], outerWidth: 0.075, innerWidth: 0.022 },
      { points: [[3.82, -3.06], [4.04, -3.22], [4.3, -3.16]], outerWidth: 0.07, innerWidth: 0.02 },

      // 少量横向桥接裂缝让底部呈连续的碎裂岩层，而不是彼此孤立的线条。
      { points: [[0.82, -2.72], [1.08, -2.8], [1.34, -2.76]], outerWidth: 0.07, innerWidth: 0.02 },
      { points: [[1.82, -2.82], [2.08, -2.76], [2.3, -2.86]], outerWidth: 0.075, innerWidth: 0.022 },
      { points: [[2.82, -2.84], [3.02, -2.74], [3.28, -2.8]], outerWidth: 0.075, innerWidth: 0.022 },
      { points: [[3.4, -2.32], [3.72, -2.42], [3.98, -2.36]], outerWidth: 0.08, innerWidth: 0.023 },
    ]

  collapseFissures.forEach((fissure) => {
    const curve = new THREE.CatmullRomCurve3(
      fissure.points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
      false,
      'centripetal',
    )
    const points = curve
      .getPoints(Math.max(28, fissure.points.length * 10))
      .map((point) => new THREE.Vector2(point.x, point.y))
    const crackGeometry = createRightWallChannelGeometry(points, fissure.outerWidth, fissure.outerWidth * 0.72)
    const glowGeometry = createRightWallChannelGeometry(points, fissure.innerWidth, fissure.innerWidth * 0.68)
    const crack = new THREE.Mesh(crackGeometry, crackMaterial)
    const glow = new THREE.Mesh(glowGeometry, fissureMaterial)
    crack.renderOrder = 2
    glow.renderOrder = 3
    collapsedChamberGroup!.add(crack, glow)
    disposables.push(crackGeometry, glowGeometry)
  })

  addInteractive(collapsedChamberGroup, 'collapsedChamber')
  group.add(collapsedChamberGroup)
  disposables.push(crackMaterial)
}

function createInternalStructure(group: THREE.Group) {
  const chamberMaterial = createLavaMaterial(new THREE.Vector2(1.7, 1.7), 1, 0.11, 1.25)
  chamberMaterial.userData.isPressureSystem = true
  chamberMaterial.uniforms.displacementStrength.value = 0.06
  chamberMaterial.polygonOffset = true
  chamberMaterial.polygonOffsetFactor = -4
  chamberMaterial.polygonOffsetUnits = -4
  magmaChamber = new THREE.Mesh(createIrregularSphere(1.05), chamberMaterial)
  magmaChamber.scale.set(1.45, 0.96, 0.006)
  magmaChamber.position.set(2.25, -1.78, SECTION_FACE_Z)
  magmaChamber.rotation.z = -0.13
  magmaChamber.renderOrder = 4
  addInteractive(magmaChamber, 'magmaChamber')
  group.add(magmaChamber)
  disposables.push(magmaChamber.geometry)

  const pressureGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4d12,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    toneMapped: false,
  })
  magmaPressureGlowMesh = new THREE.Mesh(magmaChamber.geometry, pressureGlowMaterial)
  magmaPressureGlowMesh.scale.set(1.54, 1.04, 0.005)
  magmaPressureGlowMesh.position.copy(magmaChamber.position).add(new THREE.Vector3(0, 0, -0.0005))
  magmaPressureGlowMesh.rotation.copy(magmaChamber.rotation)
  magmaPressureGlowMesh.renderOrder = 2
  group.add(magmaPressureGlowMesh)
  disposables.push(pressureGlowMaterial)

  const chamberGlow = new THREE.PointLight(0xff5b16, 2.8, 7, 2)
  chamberGlow.position.copy(magmaChamber.position).add(new THREE.Vector3(0, 0.2, -0.1))
  chamberGlow.userData.baseIntensity = 2.8
  group.add(chamberGlow)

  // 剖面中的通道终点直接取前侧地形顶边，避免山体或参数调整后再次留下断口。
  const conduitExitY = terrainHeight(MAIN_VOLCANO.x, BASE_DEPTH / 2) + 0.07
  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.25, -1.82, 0),
    new THREE.Vector3(2.27, -1.32, 0),
    new THREE.Vector3(2.3, -0.92, 0),
    new THREE.Vector3(2.31, -0.48, 0),
    new THREE.Vector3(2.24, 0.18, 0),
    new THREE.Vector3(2.34, 0.88, 0),
    new THREE.Vector3(2.29, 1.72, 0),
    new THREE.Vector3(MAIN_VOLCANO.x, conduitExitY, 0),
  ], false, 'centripetal')
  const conduitMaterial = createLavaMaterial(new THREE.Vector2(1.25, 7.2), 1, 0.56, 1.15)
  conduitMaterial.userData.isPressureSystem = true
  conduitMaterial.uniforms.pressureChannel.value = 1
  conduitMaterial.uniforms.displacementStrength.value = 0
  conduitMaterial.polygonOffset = true
  conduitMaterial.polygonOffsetFactor = -2
  conduitMaterial.polygonOffsetUnits = -2
  conduitMesh = new THREE.Mesh(
    createSectionChannelGeometry(conduitCurve.getPoints(160), 0.86, 0.17),
    conduitMaterial
  )
  conduitMesh.renderOrder = 3
  addInteractive(conduitMesh, 'conduit')
  group.add(conduitMesh)
  disposables.push(conduitMesh.geometry)

  createCollapsedChamber(group)
}

function createSurfaceLava(group: THREE.Group) {
  // 可见熔岩从火山口的溢流缺口开始，而不是从较低的凹口中心起步。
  // 下列各点对应的地形高度从 4.41 连续降至 0.77，避免出现先爬坡再下流。
  const flowPoints = createFlowPath([
    [2.8, 2.95], [2.9, 3.18], [3.45, 3.55],
    [4.05, 3.9], [4.62, 4.28], [5.25, 4.65], [5.92, 5.03],
  ], 0.02)
  const surfaceFlowMaterial = createLavaMaterial(new THREE.Vector2(2.2, 7.5), 0.96, 0.48)
  surfaceFlowMaterial.uniforms.surfaceFlow.value = 1
  lavaFlowMesh = new THREE.Mesh(
    createRibbonGeometry(flowPoints, 0.5, 0.012, 0.024, 10),
    surfaceFlowMaterial,
  )
  lavaFlowMesh.userData.flowStart = 48
  lavaFlowMesh.userData.flowEnd = 88
  lavaFlowMesh.renderOrder = 2
  addInteractive(lavaFlowMesh, 'lavaFlow')
  group.add(lavaFlowMesh)
  lavaFlowMeshes.push(lavaFlowMesh)
  disposables.push(lavaFlowMesh.geometry)

  const flowBranches: Array<{ points: Array<[number, number]>; width: number }> = [
    {
      points: [[4.02, 3.88], [4.36, 4.16], [4.72, 4.56], [5.04, 4.98], [5.26, 5.3]],
      width: 0.2,
    },
    {
      points: [[4.58, 4.27], [4.92, 4.2], [5.28, 4.28], [5.62, 4.5]],
      width: 0.16,
    },
  ]
  flowBranches.forEach((branch, index) => {
    const branchMaterial = createLavaMaterial(new THREE.Vector2(1.1, 5.6 + index), 0.9, 0.44)
    branchMaterial.uniforms.surfaceFlow.value = 1
    const mesh = new THREE.Mesh(
      createRibbonGeometry(createFlowPath(branch.points, 0.018), branch.width, 0.01, 0.012, 6),
      branchMaterial,
    )
    mesh.userData.flowStart = index === 0 ? 64 : 72
    mesh.userData.flowEnd = index === 0 ? 94 : 99
    mesh.renderOrder = 2
    group.add(mesh)
    lavaFlowMeshes.push(mesh)
    disposables.push(mesh.geometry)
  })

  fissureCrackGroup = new THREE.Group()
  fissureCrackGroup.name = 'volcanicFissureSystem'
  group.add(fissureCrackGroup)

  const crackShadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x35241c,
    roughness: 1,
    metalness: 0,
  })
  const crackVoidMaterial = new THREE.MeshStandardMaterial({
    color: 0x050303,
    roughness: 0.86,
    metalness: 0,
  })
  disposables.push(crackShadowMaterial, crackVoidMaterial)

  function addFissureBranch(raw: Array<[number, number]>, outerWidth: number, innerWidth: number) {
    const shadowPoints = createFlowPath(raw, 0.002)
    const voidPoints = createFlowPath(raw, 0.005)
    const innerPoints = createFlowPath(raw, 0.009)
    const shadow = new THREE.Mesh(
      createRibbonGeometry(shadowPoints, outerWidth * 1.45, 0.002, 0, 6),
      crackShadowMaterial,
    )
    const voidMesh = new THREE.Mesh(
      createRibbonGeometry(voidPoints, outerWidth * 0.48, 0.004, 0, 5),
      crackVoidMaterial,
    )
    const glow = new THREE.Mesh(
      createRibbonGeometry(innerPoints, innerWidth, 0.008, 0.003, 4),
      createLavaMaterial(new THREE.Vector2(0.9, 6.4), 0.94, 0.2),
    )
    shadow.renderOrder = 1
    voidMesh.renderOrder = 2
    glow.renderOrder = 3
    fissureCrackGroup!.add(shadow, voidMesh, glow)
    fissureGlowMeshes.push(glow)
    disposables.push(shadow.geometry, voidMesh.geometry, glow.geometry)
    return glow
  }

  SURFACE_FISSURES.forEach((fissure, index) => {
    const glow = addFissureBranch(fissure.points, fissure.outerWidth, fissure.innerWidth)
    if (index === 0) fissureMesh = glow
  })

  // 主裂隙延伸至左前角，并在转角两侧形成连续的岩浆暴露区。
  const cornerLavaMaterial = createLavaMaterial(new THREE.Vector2(2.8, 2.2), 0.98, 0.26, 1.05)
  cornerLavaMaterial.uniforms.displacementStrength.value = 0
  cornerLavaMaterial.polygonOffset = true
  cornerLavaMaterial.polygonOffsetFactor = -3
  cornerLavaMaterial.polygonOffsetUnits = -3

  const connectorCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.25, terrainHeight(-6.25, BASE_DEPTH / 2) - 0.02, 0),
    new THREE.Vector3(-6.28, -0.12, 0),
    new THREE.Vector3(-6.48, -0.82, 0),
    new THREE.Vector3(-6.78, -1.5, 0),
    new THREE.Vector3(-7.05, -2.08, 0),
  ], false, 'centripetal')
  const connectorPoints = connectorCurve.getPoints(72)
  const connectorVoidGeometry = createSectionChannelGeometry(connectorPoints, 0.16, 0.48)
  const connectorGlowGeometry = createSectionChannelGeometry(connectorPoints, 0.052, 0.31)
  const connectorVoid = new THREE.Mesh(connectorVoidGeometry, crackVoidMaterial)
  const connectorGlow = new THREE.Mesh(connectorGlowGeometry, cornerLavaMaterial)
  connectorVoid.renderOrder = 2
  connectorGlow.renderOrder = 3

  const frontVoidGeometry = createWallPatchGeometry([
    [-8.0, -3.36], [-8.0, -1.48], [-7.66, -1.54], [-7.28, -1.72],
    [-6.92, -1.64], [-6.48, -1.94], [-6.18, -2.48], [-6.34, -3.36],
  ], 'front')
  const frontLavaGeometry = createWallPatchGeometry([
    [-7.96, -3.28], [-7.96, -1.68], [-7.62, -1.7], [-7.3, -1.88],
    [-6.96, -1.8], [-6.58, -2.06], [-6.34, -2.52], [-6.48, -3.28],
  ], 'front')
  const leftVoidGeometry = createWallPatchGeometry([
    [3.62, -3.36], [3.7, -2.08], [4.04, -1.72], [4.56, -1.54],
    [5.5, -1.48], [5.5, -3.36],
  ], 'left')
  const leftLavaGeometry = createWallPatchGeometry([
    [3.78, -3.28], [3.84, -2.18], [4.16, -1.9], [4.62, -1.7],
    [5.46, -1.68], [5.46, -3.28],
  ], 'left')
  const frontVoid = new THREE.Mesh(frontVoidGeometry, crackVoidMaterial)
  const frontLava = new THREE.Mesh(frontLavaGeometry, cornerLavaMaterial)
  const leftVoid = new THREE.Mesh(leftVoidGeometry, crackVoidMaterial)
  const leftLava = new THREE.Mesh(leftLavaGeometry, cornerLavaMaterial)
  connectorGlow.userData.alwaysVisible = true
  frontLava.userData.alwaysVisible = true
  leftLava.userData.alwaysVisible = true
  frontVoid.renderOrder = leftVoid.renderOrder = 2
  frontLava.renderOrder = leftLava.renderOrder = 3
  fissureCrackGroup.add(connectorVoid, connectorGlow, frontVoid, frontLava, leftVoid, leftLava)
  fissureGlowMeshes.push(connectorGlow, frontLava, leftLava)
  disposables.push(
    connectorVoidGeometry,
    connectorGlowGeometry,
    frontVoidGeometry,
    frontLavaGeometry,
    leftVoidGeometry,
    leftLavaGeometry,
  )
  addInteractive(fissureCrackGroup, 'fissure')

  const craterY = terrainHeight(MAIN_VOLCANO.x, MAIN_VOLCANO.y) + 0.06
  craterPoolMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.47, 72),
    createLavaMaterial(new THREE.Vector2(3.2, 3.2), 0.98, 0.34),
  )
  craterPoolMesh.rotation.x = -Math.PI / 2
  craterPoolMesh.position.set(MAIN_VOLCANO.x, craterY + 0.035, MAIN_VOLCANO.y)
  craterPoolMesh.renderOrder = 3
  addInteractive(craterPoolMesh, 'crater')
  group.add(craterPoolMesh)
  disposables.push(craterPoolMesh.geometry)

  craterGlowMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.035, 12, 64),
    createLavaMaterial(new THREE.Vector2(4.2, 1.1), 0.74, 0.28)
  )
  craterGlowMesh.rotation.x = Math.PI / 2
  craterGlowMesh.position.set(MAIN_VOLCANO.x, craterY, MAIN_VOLCANO.y)
  addInteractive(craterGlowMesh, 'crater')
  group.add(craterGlowMesh)
  disposables.push(craterGlowMesh.geometry)

  // 左侧雪山火山口保留一小片静息岩浆。用不规则双层轮廓嵌入凹口，
  // 外层模拟冷却结壳，内层保持缓慢流动，避免像规则圆片浮在山顶。
  const createCraterPatch = (radius: number, phase: number) => {
    const shape = new THREE.Shape()
    const segments = 72
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2
      const edgeNoise = 1
        + Math.sin(angle * 5 + phase) * 0.045
        + Math.sin(angle * 9 - phase * 0.7) * 0.022
        + Math.sin(angle * 13 + phase * 1.4) * 0.012
      const x = Math.cos(angle) * radius * edgeNoise
      const y = Math.sin(angle) * radius * edgeNoise
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return new THREE.ShapeGeometry(shape, 18)
  }

  const secondaryCraterY = terrainHeight(SNOW_VOLCANO.x, SNOW_VOLCANO.y) + 0.045
  const secondaryCrustGeometry = createCraterPatch(0.37, 0.8)
  const secondaryCrustMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b0905,
    emissive: 0x310b03,
    emissiveIntensity: 0.42,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  })
  secondaryCraterCrustMesh = new THREE.Mesh(secondaryCrustGeometry, secondaryCrustMaterial)
  secondaryCraterCrustMesh.rotation.x = -Math.PI / 2
  secondaryCraterCrustMesh.scale.y = 0.78
  secondaryCraterCrustMesh.position.set(SNOW_VOLCANO.x, secondaryCraterY, SNOW_VOLCANO.y)
  secondaryCraterCrustMesh.renderOrder = 2
  secondaryCraterCrustMesh.visible = false

  const secondaryLavaGeometry = createCraterPatch(0.315, 2.1)
  const secondaryLavaMaterial = createLavaMaterial(new THREE.Vector2(3.8, 3.2), 0.98, 0.18, 0.86)
  secondaryLavaMaterial.uniforms.displacementStrength.value = 0.38
  secondaryLavaMaterial.polygonOffset = true
  secondaryLavaMaterial.polygonOffsetFactor = -2
  secondaryLavaMaterial.polygonOffsetUnits = -2
  secondaryCraterPoolMesh = new THREE.Mesh(secondaryLavaGeometry, secondaryLavaMaterial)
  secondaryCraterPoolMesh.rotation.x = -Math.PI / 2
  secondaryCraterPoolMesh.scale.y = 0.76
  secondaryCraterPoolMesh.position.set(SNOW_VOLCANO.x + 0.012, secondaryCraterY + 0.012, SNOW_VOLCANO.y - 0.006)
  secondaryCraterPoolMesh.renderOrder = 3
  secondaryCraterPoolMesh.visible = false

  secondaryCraterLight = new THREE.PointLight(0xff4f0b, 0, 2.4, 2)
  secondaryCraterLight.position.set(SNOW_VOLCANO.x, secondaryCraterY + 0.22, SNOW_VOLCANO.y)
  addInteractive(secondaryCraterPoolMesh, 'crater')
  group.add(secondaryCraterCrustMesh, secondaryCraterPoolMesh, secondaryCraterLight)
  disposables.push(secondaryCrustGeometry, secondaryCrustMaterial, secondaryLavaGeometry)
}

function createVolcanoParticles(group: THREE.Group) {
  ashCloudTexture = new THREE.TextureLoader().load(volcanicAshCloudUrl)
  ashCloudTexture.colorSpace = THREE.SRGBColorSpace
  ashCloudGroup = new THREE.Group()
  ashCloudGroup.name = 'volcanicAshCloud'
  const ashCloudCount = 15

  for (let i = 0; i < ashCloudCount; i++) {
    const material = new THREE.SpriteMaterial({
      map: ashCloudTexture,
      color: new THREE.Color().setHSL(0.57, 0.045, 0.62 + Math.random() * 0.12),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaTest: 0.018,
    })
    material.rotation = Math.random() * Math.PI * 2
    const cloud = new THREE.Sprite(material)
    cloud.userData.phaseOffset = Math.random()
    cloud.userData.releaseProgress = 34 + (i / ashCloudCount) * 38 + Math.random() * 2.5
    cloud.userData.lifeProgress = 74 + Math.random() * 18
    cloud.userData.angle = Math.random() * Math.PI * 2
    cloud.userData.radial = 0.28 + Math.random() * 0.72
    cloud.userData.rise = 0.72 + Math.random() * 0.62
    cloud.userData.baseSize = 0.72 + Math.random() * 0.62
    cloud.userData.rotationSpeed = (Math.random() - 0.5) * 0.065
    ashCloudGroup.add(cloud)
    disposables.push(material)
  }

  const secondaryAshCloudCount = 10
  for (let i = 0; i < secondaryAshCloudCount; i++) {
    const material = new THREE.SpriteMaterial({
      map: ashCloudTexture,
      color: new THREE.Color().setHSL(0.565, 0.04, 0.64 + Math.random() * 0.1),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaTest: 0.018,
    })
    material.rotation = Math.random() * Math.PI * 2
    const cloud = new THREE.Sprite(material)
    cloud.userData.isSecondaryCrater = true
    cloud.userData.phaseOffset = Math.random()
    cloud.userData.releaseProgress = 38 + (i / secondaryAshCloudCount) * 34 + Math.random() * 2.5
    cloud.userData.lifeProgress = 66 + Math.random() * 16
    cloud.userData.angle = Math.random() * Math.PI * 2
    cloud.userData.radial = 0.22 + Math.random() * 0.56
    cloud.userData.rise = 0.58 + Math.random() * 0.5
    cloud.userData.baseSize = 0.5 + Math.random() * 0.42
    cloud.userData.rotationSpeed = (Math.random() - 0.5) * 0.07
    ashCloudGroup.add(cloud)
    disposables.push(material)
  }

  ashCloudGroup.renderOrder = 4
  addInteractive(ashCloudGroup, 'ashColumn')
  group.add(ashCloudGroup)
  disposables.push(ashCloudTexture)

  ejectaTexture = new THREE.TextureLoader().load(volcanicBombUrl)
  ejectaTexture.colorSpace = THREE.SRGBColorSpace
  ejectaGroup = new THREE.Group()
  ejectaGroup.name = 'volcanicBombEjecta'
  const ejectaCount = 34

  for (let i = 0; i < ejectaCount; i++) {
    const material = new THREE.SpriteMaterial({
      map: ejectaTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaTest: 0.022,
    })
    const fragment = new THREE.Sprite(material)
    fragment.visible = false
    fragment.userData.releaseProgress = 47 + (i / ejectaCount) * 30 + Math.random() * 2.2
    fragment.userData.flightProgress = 13 + Math.random() * 10
    fragment.userData.angle = Math.random() * Math.PI * 2
    fragment.userData.distance = 1.0 + Math.random() * 3.8
    fragment.userData.arcHeight = 1.0 + Math.random() * 2.9
    fragment.userData.baseSize = 0.12 + Math.random() * 0.16
    fragment.userData.startRotation = Math.random() * Math.PI * 2
    fragment.userData.rotationSpeed = (Math.random() - 0.5) * 1.15
    fragment.userData.keepSettled = Math.random() > 0.22
    ejectaGroup.add(fragment)
    disposables.push(material)
  }

  const secondaryEjectaCount = 20
  for (let i = 0; i < secondaryEjectaCount; i++) {
    const material = new THREE.SpriteMaterial({
      map: ejectaTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaTest: 0.022,
    })
    const fragment = new THREE.Sprite(material)
    fragment.visible = false
    fragment.userData.isSecondaryCrater = true
    fragment.userData.releaseProgress = 49 + (i / secondaryEjectaCount) * 28 + Math.random() * 2.4
    fragment.userData.flightProgress = 11 + Math.random() * 8
    fragment.userData.angle = Math.random() * Math.PI * 2
    fragment.userData.distance = 0.72 + Math.random() * 2.35
    fragment.userData.arcHeight = 0.72 + Math.random() * 1.9
    fragment.userData.baseSize = 0.09 + Math.random() * 0.12
    fragment.userData.startRotation = Math.random() * Math.PI * 2
    fragment.userData.rotationSpeed = (Math.random() - 0.5) * 1.1
    fragment.userData.keepSettled = Math.random() > 0.28
    ejectaGroup.add(fragment)
    disposables.push(material)
  }

  ejectaGroup.renderOrder = 5
  addInteractive(ejectaGroup, 'ashColumn')
  group.add(ejectaGroup)
  disposables.push(ejectaTexture)
}

function updateParticles(elapsed: number) {
  if (!ashCloudGroup || !ejectaGroup) return
  const factor = showEjecta.value ? eruptionFactor.value : 0
  const explosive = explosiveIndex.value
  const stageProgress = progress.value
  ashCloudGroup.visible = showEjecta.value && stageProgress >= 32
  ejectaGroup.visible = showEjecta.value && stageProgress >= 45

  ashCloudGroup.children.forEach((object) => {
    const cloud = object as THREE.Sprite
    const isSecondaryCrater = cloud.userData.isSecondaryCrater === true
    const craterX = isSecondaryCrater ? SNOW_VOLCANO.x : MAIN_VOLCANO.x
    const craterZ = isSecondaryCrater ? SNOW_VOLCANO.y : MAIN_VOLCANO.y
    const craterY = terrainHeight(craterX, craterZ) + (isSecondaryCrater ? 0.16 : 0.23)
    const eruptionScale = isSecondaryCrater ? 0.7 : 1
    const releaseProgress = cloud.userData.releaseProgress as number
    const lifeProgress = cloud.userData.lifeProgress as number
    const rawPhase = (stageProgress - releaseProgress) / lifeProgress
    if (rawPhase < 0) {
      cloud.visible = false
      return
    }
    cloud.visible = true
    const rise = cloud.userData.rise as number
    const phase = THREE.MathUtils.clamp(rawPhase, 0, 0.96)
    const angle = cloud.userData.angle as number
    const radialSeed = cloud.userData.radial as number
    const verticalTravel = (1.7 + explosive * 4.6) * eruptionScale
    const spread = (0.12 + Math.pow(phase, 1.45) * (0.75 + explosive * 1.75)) * radialSeed * eruptionScale
    const drift = phase * phase * (0.7 + explosive * 0.65) * eruptionScale
    cloud.position.set(
      craterX + Math.cos(angle) * spread + drift * 0.32,
      craterY + 0.08 + phase * verticalTravel * rise,
      craterZ + Math.sin(angle) * spread - drift * 0.1,
    )

    const baseSize = cloud.userData.baseSize as number
    const size = baseSize * (0.5 + phase * 1.55) * (0.82 + factor * 0.2)
    cloud.scale.set(size, size * (0.78 + phase * 0.16), 1)
    const fadeIn = THREE.MathUtils.smoothstep(phase, 0, 0.14)
    const fadeOut = 1 - THREE.MathUtils.smoothstep(phase, 0.82, 1)
    const postPresence = stageProgress < 84
      ? 0.34 + factor * (0.28 + explosive * 0.14)
      : THREE.MathUtils.lerp(0.58, 0.42, (stageProgress - 84) / 16)
    const material = cloud.material as THREE.SpriteMaterial
    material.opacity = postPresence * fadeIn * fadeOut
    material.rotation = cloud.userData.phaseOffset * Math.PI * 2 + elapsed * cloud.userData.rotationSpeed
  })

  ejectaGroup.children.forEach((object) => {
    const fragment = object as THREE.Sprite
    const isSecondaryCrater = fragment.userData.isSecondaryCrater === true
    const craterX = isSecondaryCrater ? SNOW_VOLCANO.x : MAIN_VOLCANO.x
    const craterZ = isSecondaryCrater ? SNOW_VOLCANO.y : MAIN_VOLCANO.y
    const craterY = terrainHeight(craterX, craterZ) + (isSecondaryCrater ? 0.16 : 0.23)
    const releaseProgress = fragment.userData.releaseProgress as number
    const flightProgress = fragment.userData.flightProgress as number
    const rawFlight = (stageProgress - releaseProgress) / flightProgress
    const material = fragment.material as THREE.SpriteMaterial

    if (rawFlight < 0) {
      fragment.visible = false
      return
    }

    const phase = THREE.MathUtils.clamp(rawFlight, 0, 1)
    const angle = fragment.userData.angle as number
    const distance = (fragment.userData.distance as number) * (0.76 + explosive * 0.42)
    const landingX = craterX + Math.cos(angle) * distance
    const landingZ = craterZ + Math.sin(angle) * distance
    const x = THREE.MathUtils.lerp(craterX, landingX, phase)
    const z = THREE.MathUtils.lerp(craterZ, landingZ, phase)
    const landingY = terrainHeight(landingX, landingZ) + 0.055
    const travelY = THREE.MathUtils.lerp(craterY, landingY, phase)
    const arcHeight = (fragment.userData.arcHeight as number) * (0.72 + explosive * 0.52)
    const y = travelY + Math.sin(phase * Math.PI) * arcHeight
    const baseSize = fragment.userData.baseSize as number

    if (rawFlight <= 1) {
      fragment.visible = true
      fragment.position.set(x, y, z)
      const perspectiveScale = baseSize * (0.84 + Math.sin(phase * Math.PI) * 0.34)
      fragment.scale.set(perspectiveScale, perspectiveScale, 1)
      material.opacity = 0.92
      material.color.setHex(0xffffff)
      material.rotation = fragment.userData.startRotation + elapsed * fragment.userData.rotationSpeed
      return
    }

    if (!fragment.userData.keepSettled) {
      fragment.visible = false
      return
    }

    fragment.visible = true
    fragment.position.set(landingX, landingY, landingZ)
    fragment.scale.setScalar(baseSize * 0.62)
    const settledAge = THREE.MathUtils.clamp((stageProgress - releaseProgress - flightProgress) / 24, 0, 1)
    material.opacity = THREE.MathUtils.lerp(0.38, 0.13, settledAge)
    material.color.setRGB(
      THREE.MathUtils.lerp(0.72, 0.3, settledAge),
      THREE.MathUtils.lerp(0.4, 0.22, settledAge),
      THREE.MathUtils.lerp(0.28, 0.19, settledAge),
    )
    material.rotation = fragment.userData.startRotation + fragment.userData.rotationSpeed * 0.55
  })
}

function createLakeProxy(group: THREE.Group) {
  const geometry = new THREE.CircleGeometry(1.45, 48)
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  lakeProxyMesh = new THREE.Mesh(geometry, material)
  lakeProxyMesh.rotation.x = -Math.PI / 2
  lakeProxyMesh.scale.set(1.0, 0.72, 1)
  lakeProxyMesh.position.set(LAKE_CENTER.x, lakeSurfaceLevel() + 0.025, LAKE_CENTER.y)
  addInteractive(lakeProxyMesh, 'craterLake')
  group.add(lakeProxyMesh)
  disposables.push(geometry, material)
}

function createSceneModel() {
  if (!scene) return
  modelGroup = new THREE.Group()
  modelGroup.name = 'volcanoTeachingModel'
  scene.add(modelGroup)

  const terrainGeometry = createTerrainGeometry()
  const terrainTexture = new THREE.TextureLoader().load(terrainAlbedoUrl)
  terrainTexture.colorSpace = THREE.SRGBColorSpace
  terrainTexture.wrapS = terrainTexture.wrapT = THREE.RepeatWrapping
  terrainTexture.repeat.set(1.35, 1.1)
  terrainTexture.anisotropy = Math.min(renderer?.capabilities.getMaxAnisotropy() ?? 4, 12)
  const terrainMaterial = new THREE.MeshStandardMaterial({
    map: terrainTexture,
    bumpMap: terrainTexture,
    bumpScale: 0.085,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
  })
  terrainMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.lakeTime = { value: 0 }
    shader.uniforms.lakeVisible = { value: showCraterLake.value ? 1 : 0 }
    shader.uniforms.lakeCenter = { value: LAKE_CENTER.clone() }
    shader.uniforms.lakeLevel = { value: lakeSurfaceLevel() }
    terrainWaterUniforms = {
      time: shader.uniforms.lakeTime,
      visible: shader.uniforms.lakeVisible,
      center: shader.uniforms.lakeCenter,
      level: shader.uniforms.lakeLevel,
    }

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrainLocalPosition;
        varying vec3 vTerrainLocalNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTerrainLocalPosition = position;
        vTerrainLocalNormal = normal;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float lakeTime;
        uniform float lakeVisible;
        uniform vec2 lakeCenter;
        uniform float lakeLevel;
        varying vec3 vTerrainLocalPosition;
        varying vec3 vTerrainLocalNormal;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 lakeDelta = (vTerrainLocalPosition.xz - lakeCenter) / vec2(1.3, 0.9);
        float lakeRadius = length(lakeDelta);
        float lakeRadialMask = 1.0 - smoothstep(0.76, 1.02, lakeRadius);
        float lakeDepthMask = 1.0 - smoothstep(
          lakeLevel + 0.035,
          lakeLevel + 0.22,
          vTerrainLocalPosition.y
        );
        float lakeSlopeMask = smoothstep(0.72, 0.94, normalize(vTerrainLocalNormal).y);
        float lakeMask = lakeRadialMask * lakeDepthMask * lakeSlopeMask * lakeVisible;
        float lakeRippleA = sin(
          vTerrainLocalPosition.x * 8.6 +
          vTerrainLocalPosition.z * 6.4 -
          lakeTime * 1.15
        );
        float lakeRippleB = sin(
          vTerrainLocalPosition.x * -5.2 +
          vTerrainLocalPosition.z * 9.8 +
          lakeTime * 0.82
        );
        float lakeRipple = lakeRippleA * 0.5 + lakeRippleB * 0.5;
        vec3 lakeDeepColor = vec3(0.018, 0.075, 0.12);
        vec3 lakeShallowColor = vec3(0.035, 0.16, 0.22);
        float lakeDepthTone = smoothstep(lakeLevel - 0.08, lakeLevel + 0.12, vTerrainLocalPosition.y);
        vec3 lakeColor = mix(lakeDeepColor, lakeShallowColor, lakeDepthTone);
        lakeColor += vec3(0.018, 0.04, 0.052) * lakeRipple;
        diffuseColor.rgb = mix(diffuseColor.rgb, lakeColor, lakeMask * 0.96);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.26, lakeMask);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.18, lakeMask);`,
      )
  }
  terrainMaterial.customProgramCacheKey = () => 'volcano-terrain-lake-v1'
  terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial)
  terrainMesh.receiveShadow = true
  terrainMesh.castShadow = true
  addInteractive(terrainMesh, 'volcanicCone')
  modelGroup.add(terrainMesh)
  disposables.push(terrainGeometry, terrainTexture, terrainMaterial)

  const snowGeometry = createSnowCapGeometry()
  const snowBumpTexture = createNoiseTexture(256)
  snowBumpTexture.wrapS = snowBumpTexture.wrapT = THREE.RepeatWrapping
  snowBumpTexture.repeat.set(6.5, 5.2)
  const snowMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f5f5,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.055,
    depthWrite: true,
    bumpMap: snowBumpTexture,
    bumpScale: 0.022,
    roughness: 0.94,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  snowCapMesh = new THREE.Mesh(snowGeometry, snowMaterial)
  snowCapMesh.castShadow = true
  snowCapMesh.receiveShadow = true
  snowCapMesh.renderOrder = 1
  modelGroup.add(snowCapMesh)
  disposables.push(snowGeometry, snowBumpTexture, snowMaterial)

  const strataTexture = createStrataTexture()
  const strataMaterial = new THREE.MeshStandardMaterial({
    map: strataTexture,
    bumpMap: strataTexture,
    bumpScale: 0.055,
    roughness: 0.98,
    metalness: 0,
  })
  disposables.push(strataTexture, strataMaterial)

  const frontWall = new THREE.Mesh(createEdgeWallGeometry('front'), strataMaterial)
  const backWall = new THREE.Mesh(createEdgeWallGeometry('back'), strataMaterial)
  const leftWall = new THREE.Mesh(createEdgeWallGeometry('left'), strataMaterial)
  const rightWall = new THREE.Mesh(createEdgeWallGeometry('right'), strataMaterial)
  const bottomMaterial = new THREE.MeshStandardMaterial({ color: '#3c332b', roughness: 1 })
  const bottom = new THREE.Mesh(createBottomGeometry(), bottomMaterial)
    ;[frontWall, backWall, leftWall, rightWall, bottom].forEach((mesh) => {
      mesh.receiveShadow = true
      mesh.castShadow = true
      modelGroup!.add(mesh)
      disposables.push(mesh.geometry)
    })
  disposables.push(bottomMaterial)

  createInternalStructure(modelGroup)
  createSurfaceLava(modelGroup)
  createVolcanoParticles(modelGroup)
  createLakeProxy(modelGroup)
}

function createNormalTexture(size = 128) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const nx = Math.sin((x + y) * 0.18) * 0.5 + Math.sin(x * 0.43) * 0.25
      const ny = Math.cos((x - y) * 0.14) * 0.5 + Math.cos(y * 0.37) * 0.25
      data[i] = 128 + Math.round(nx * 90)
      data[i + 1] = 128 + Math.round(ny * 90)
      data[i + 2] = 255
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

function createFallbackWater() {
  if (!scene || fallbackWater) return
  const normals = createNormalTexture()
  // 水面故意延伸到岸坡内部，真实边界由地形深度遮挡，不直接露出椭圆网格边。
  const geometry = createEllipseGridGeometry(3.3, 2.3, 72)
  fallbackWater = new Water(geometry, {
    textureWidth: 256,
    textureHeight: 256,
    waterNormals: normals,
    sunDirection: new THREE.Vector3(0.6, 1, 0.3).normalize(),
    sunColor: 0xaebfca,
    waterColor: 0x071f33,
    distortionScale: 1.25,
    fog: false,
    alpha: 0.95,
  })
  fallbackWater.rotation.x = -Math.PI / 2
  fallbackWater.position.set(LAKE_CENTER.x, lakeSurfaceLevel() + 0.008, LAKE_CENTER.y)
  fallbackWater.visible = showCraterLake.value
  fallbackWater.renderOrder = 2
  const waterMaterial = fallbackWater.material as THREE.Material
  waterMaterial.depthTest = true
  waterMaterial.depthWrite = false
  waterMaterial.side = THREE.DoubleSide
  scene.add(fallbackWater)
  disposables.push(geometry, normals)
}

async function initComputeWater() {
  waterRuntimeFailed = false
  if (!(navigator as any).gpu || !threeContainerRef.value || !camera) {
    createFallbackWater()
    return
  }

  try {
    const THREE_GPU: any = await import('three/webgpu')
    const TSL: any = await import('three/tsl')

    const {
      Fn,
      clamp,
      cos,
      float,
      globalId,
      instancedArray,
      int,
      instanceIndex,
      length,
      max,
      min,
      positionLocal,
      select,
      transformNormalToView,
      uint,
      uniform,
      vec2,
      vec3,
      vertexIndex,
    } = TSL

    const WATER_RESOLUTION = 64
    const WATER_SIZE = 2.75
    const heightA = instancedArray(new Float32Array(WATER_RESOLUTION * WATER_RESOLUTION)).setName('VolcanoLakeHeightA')
    const heightB = instancedArray(new Float32Array(WATER_RESOLUTION * WATER_RESOLUTION)).setName('VolcanoLakeHeightB')
    const previous = instancedArray(new Float32Array(WATER_RESOLUTION * WATER_RESOLUTION)).setName('VolcanoLakePrevious')
    waterReadFromA = uniform(1)
    waterImpactPos = uniform(new THREE.Vector2(0, 0))
    waterImpactPower = uniform(0)
    const damping = uniform(0.952)

    const neighborIndices = (index: any) => {
      const w = uint(WATER_RESOLUTION)
      const x = int(index.mod(WATER_RESOLUTION))
      const y = int(index.div(WATER_RESOLUTION))
      const left = max(0, x.sub(1))
      const right = min(x.add(1), w.sub(1))
      const bottom = max(0, y.sub(1))
      const top = min(y.add(1), w.sub(1))
      return {
        west: y.mul(w).add(left),
        east: y.mul(w).add(right),
        south: bottom.mul(w).add(x),
        north: top.mul(w).add(x),
      }
    }

    const createComputeStep = (readBuffer: any, writeBuffer: any) => Fn(() => {
      const current = readBuffer.element(instanceIndex).toVar()
      const previousHeight = previous.element(instanceIndex).toVar()
      const n = neighborIndices(instanceIndex)
      const sum = readBuffer.element(n.west)
        .add(readBuffer.element(n.east))
        .add(readBuffer.element(n.south))
        .add(readBuffer.element(n.north))
      const nextHeight = sum.mul(0.5).sub(previousHeight).mul(damping).toVar()

      const uv = vec2(
        float(globalId.x).mul(1 / WATER_RESOLUTION),
        float(globalId.y).mul(1 / WATER_RESOLUTION),
      )
      const lakePos = uv.sub(vec2(0.5)).mul(WATER_SIZE)
      const phase = clamp(length(lakePos.sub(waterImpactPos)).mul(Math.PI).div(0.34), 0, Math.PI)
      nextHeight.addAssign(cos(phase).add(1).mul(waterImpactPower).mul(0.012))
      previous.element(instanceIndex).assign(current)
      writeBuffer.element(instanceIndex).assign(nextHeight)
    })().compute(WATER_RESOLUTION * WATER_RESOLUTION, [16, 16])

    waterComputeAtoB = createComputeStep(heightA, heightB).setName('VolcanoLake A to B')
    waterComputeBtoA = createComputeStep(heightB, heightA).setName('VolcanoLake B to A')

    const getHeight = (index: any) => select(waterReadFromA, heightA.element(index), heightB.element(index))
    const getNormal = (index: any) => {
      const n = neighborIndices(index)
      const west = getHeight(n.west)
      const east = getHeight(n.east)
      const south = getHeight(n.south)
      const north = getHeight(n.north)
      return {
        x: west.sub(east).mul(WATER_RESOLUTION / WATER_SIZE),
        y: south.sub(north).mul(WATER_RESOLUTION / WATER_SIZE),
      }
    }

    const waterGeometry = createEllipseGridGeometry(3.05, 2.08, WATER_RESOLUTION)
    const waterMaterial = new THREE_GPU.MeshStandardNodeMaterial({
      color: 0x0b304a,
      metalness: 0.58,
      roughness: 0.13,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    })
    waterMaterial.positionNode = Fn(() =>
      vec3(positionLocal.x, positionLocal.y, getHeight(vertexIndex))
    )()
    waterMaterial.normalNode = Fn(() => {
      const n = getNormal(vertexIndex)
      return transformNormalToView(vec3(n.x, n.y.negate(), 1)).toVertexStage()
    })()

    waterScene = new THREE.Scene()
    waterMesh = new THREE.Mesh(waterGeometry, waterMaterial)
    waterMesh.rotation.x = -Math.PI / 2
    waterMesh.position.set(LAKE_CENTER.x, lakeSurfaceLevel(), LAKE_CENTER.y)
    waterMesh.visible = showCraterLake.value
    waterScene.add(waterMesh)

    const waterLight = new THREE.DirectionalLight(0xffffff, 3.0)
    waterLight.position.set(-5, 8, 6)
    waterScene.add(waterLight)
    waterScene.add(new THREE.HemisphereLight(0xbfe5ff, 0x263849, 1.15))

    waterRenderer = new THREE_GPU.WebGPURenderer({
      antialias: true,
      alpha: true,
      requiredLimits: { maxStorageBuffersInVertexStage: 2 },
    })
    waterRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    waterRenderer.setClearColor(0x000000, 0)
    waterRenderer.toneMapping = THREE.ACESFilmicToneMapping
    waterRenderer.toneMappingExposure = 0.72
    waterRenderer.domElement.className = 'scene-canvas compute-water-canvas'

    // WebGPURenderer 在手动 render / compute 前必须先完成后端初始化。
    // v1 中这里直接 resize/render，会触发：render() called before the backend is initialized。
    await waterRenderer.init()

    threeContainerRef.value.appendChild(waterRenderer.domElement)

    disposables.push(waterGeometry)
    resizeThreeSceneNow(true)
  } catch (error) {
    console.warn('WebGPU Compute Water 初始化失败，已回退到 Three.js Water：', error)
    destroyComputeWater()
    createFallbackWater()
  }
}

function destroyComputeWater() {
  waterRuntimeFailed = false
  if (waterRenderer?.domElement?.parentElement) {
    waterRenderer.domElement.parentElement.removeChild(waterRenderer.domElement)
  }
  waterRenderer?.dispose?.()
  waterRenderer = null
  waterScene = null
  waterMesh = null
  waterComputeAtoB = null
  waterComputeBtoA = null
  waterReadFromA = null
  waterImpactPos = null
  waterImpactPower = null
  waterPingPong = 0
  waterFrameCounter = 0
}

let waterRuntimeFailed = false

function updateWater(elapsed: number) {
  if (terrainWaterUniforms) {
    terrainWaterUniforms.time.value = elapsed
    terrainWaterUniforms.visible.value = showCraterLake.value ? 1 : 0
  }
}

function updateModelState(elapsed: number) {
  const factor = eruptionFactor.value
  const pulse = 0.5 + Math.sin(elapsed * 0.42) * 0.5
  const showInternal = showInternalStructure.value
  const pressureBuild = THREE.MathUtils.smootherstep(progress.value, 6, 48)
  const pressureRelease = THREE.MathUtils.smootherstep(progress.value, 48, 68)
  const pressureCharge = pressureBuild * (1 - pressureRelease * 0.88)
  const pressureUrgency = THREE.MathUtils.smootherstep(progress.value, 30, 48) * (1 - pressureRelease)
  const pressurePhase = elapsed * (0.82 + pressureCharge * 1.45 + pressureUrgency * 1.1)
  const pressurePulse = 0.5 + Math.sin(pressurePhase) * 0.5
  const pressureLevel = 0.14 + pressureCharge * 0.86

  if (magmaChamber) {
    magmaChamber.visible = showInternal
    const storedExpansion = pressureCharge * 0.046
    const breathing = pressurePulse * (0.004 + pressureCharge * 0.022)
    magmaChamber.scale.set(
      1.45 * (1 + storedExpansion + breathing),
      0.96 * (1 + storedExpansion * 0.72 + breathing * 0.82),
      0.006 * (1 + storedExpansion),
    )
  }
  if (magmaPressureGlowMesh) {
    magmaPressureGlowMesh.visible = showInternal
    const glowExpansion = pressureCharge * 0.07 + pressurePulse * (0.008 + pressureCharge * 0.028)
    magmaPressureGlowMesh.scale.set(
      1.54 * (1 + glowExpansion),
      1.04 * (1 + glowExpansion * 0.82),
      0.005,
    )
    const glowMaterial = magmaPressureGlowMesh.material as THREE.MeshBasicMaterial
    glowMaterial.opacity = 0.08 + pressureCharge * 0.12 + pressurePulse * (0.025 + pressureCharge * 0.11)
  }
  if (magmaNeckMesh) magmaNeckMesh.visible = showInternal
  if (conduitMesh) conduitMesh.visible = showInternal
  if (collapsedChamberGroup) collapsedChamberGroup.visible = showInternal

  lavaFlowMeshes.forEach((mesh) => {
    const mat = mesh.material as THREE.ShaderMaterial
    const start = mesh.userData.flowStart ?? 48
    const end = mesh.userData.flowEnd ?? 88
    const head = THREE.MathUtils.smootherstep(progress.value, start, end)
    mesh.visible = head > 0.002
    mat.uniforms.flowHead.value = head
    mat.uniforms.opacityValue.value = THREE.MathUtils.lerp(0.82, 0.98, head)
  })
  fissureGlowMeshes.forEach((mesh) => {
    const alwaysVisible = mesh.userData.alwaysVisible === true
    mesh.visible = alwaysVisible || progress.value >= 28
    const mat = mesh.material as THREE.ShaderMaterial
    mat.uniforms.opacityValue.value = alwaysVisible
      ? THREE.MathUtils.lerp(0.82, 0.98, THREE.MathUtils.smootherstep(progress.value, 24, 52))
      : THREE.MathUtils.clamp((progress.value - 26) / 18, 0.1, 0.96)
  })
  if (craterGlowMesh) {
    const poolFill = THREE.MathUtils.smootherstep(progress.value, 38, 50)
    craterGlowMesh.visible = poolFill > 0.01
    craterGlowMesh.scale.setScalar(0.58 + poolFill * 0.42 + pulse * poolFill * 0.012)
  }
  if (craterPoolMesh) {
    const poolFill = THREE.MathUtils.smootherstep(progress.value, 36, 50)
    craterPoolMesh.visible = poolFill > 0.01
    const poolScale = 0.3 + poolFill * 0.7 + pulse * poolFill * 0.008
    craterPoolMesh.scale.set(poolScale, poolScale, 1)
  }
  const secondaryPoolFill = THREE.MathUtils.smootherstep(progress.value, 36, 50)
  if (secondaryCraterCrustMesh) {
    secondaryCraterCrustMesh.visible = secondaryPoolFill > 0.01
    const crustScale = 0.58 + secondaryPoolFill * 0.42 + pulse * secondaryPoolFill * 0.01
    secondaryCraterCrustMesh.scale.set(crustScale, crustScale * 0.78, 1)
  }
  if (secondaryCraterPoolMesh) {
    secondaryCraterPoolMesh.visible = secondaryPoolFill > 0.01
    const poolScale = 0.3 + secondaryPoolFill * 0.7 + pulse * secondaryPoolFill * 0.008
    secondaryCraterPoolMesh.scale.set(poolScale, poolScale * 0.76, 1)
  }
  if (secondaryCraterLight) {
    secondaryCraterLight.visible = secondaryPoolFill > 0.01
    secondaryCraterLight.intensity = 0.72 * secondaryPoolFill * (0.78 + pulse * 0.22)
  }

  lavaMaterials.forEach((material) => {
    const timeScale = material.userData.timeScale ?? 0.45
    material.uniforms.time.value = elapsed * timeScale * (0.82 + factor * 0.24)
    if (material.userData.isPressureSystem) {
      material.uniforms.pressureLevel.value = pressureLevel
      material.uniforms.pressurePulse.value = pressurePulse
    }
  })

  if (modelGroup) {
    modelGroup.traverse((object) => {
      if (object instanceof THREE.PointLight && object.userData.baseIntensity) {
        object.intensity = showInternal
          ? object.userData.baseIntensity * (0.62 + pressureLevel * 0.42 + pressurePulse * pressureCharge * 0.24)
          : 0
      }
    })
  }

  updateParticles(elapsed)
}

type CameraPreset = {
  position: THREE.Vector3
  target: THREE.Vector3
}

function getOverviewPreset(): CameraPreset | null {
  if (!camera || !modelGroup) return null

  const box = new THREE.Box3().setFromObject(modelGroup)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const tanHalfFov = Math.tan(verticalFov / 2)
  const aspect = Math.max(0.65, camera.aspect || 1)

  // 同时按模型宽度和高度计算距离。宽屏主场景不再按“最大边”过度拉远，
  // 让火山模型稳定占据中间区域的大部分画面。
  const distanceForHeight = size.y / (2 * tanHalfFov)
  const distanceForWidth = size.x / (2 * tanHalfFov * aspect)
  const distance = Math.max(distanceForHeight, distanceForWidth) * 1.82

  // 默认正对前侧剖面，只保留轻微俯视，构图与参考图一致。
  const direction = new THREE.Vector3(0.025, 0.38, 1).normalize()
  const target = center.clone().add(new THREE.Vector3(0, -0.12, 0.28))
  const position = target.clone().addScaledVector(direction, distance)

  return { position, target }
}

function fitCameraToModel() {
  if (!camera || !controls) return
  const preset = getOverviewPreset()
  if (!preset) return

  camera.position.copy(preset.position)
  camera.near = 0.08
  camera.far = 260
  camera.updateProjectionMatrix()
  controls.target.copy(preset.target)
  controls.update()
}

const cameraPresets: Record<string, CameraPreset> = {
  overview: {
    position: new THREE.Vector3(0.58, 9.6, 27.2),
    target: new THREE.Vector3(0, -0.1, 0.35),
  },
  section: {
    position: new THREE.Vector3(8.9, 3.7, 14.9),
    target: new THREE.Vector3(1.85, -0.15, 3.15),
  },
  crater: {
    position: new THREE.Vector3(5.3, 7.5, 6.2),
    target: new THREE.Vector3(2.18, 3.12, 2.2),
  },
  side: {
    position: new THREE.Vector3(-12.3, 5.1, 8.3),
    target: new THREE.Vector3(0, 0.35, 0.15),
  },
}

let cameraTween: {
  start: number
  fromPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toPosition: THREE.Vector3
  toTarget: THREE.Vector3
} | null = null

function setCameraView(view: string) {
  if (!camera || !controls || !cameraPresets[view]) return
  currentView.value = view
  const preset = view === 'overview'
    ? (getOverviewPreset() || cameraPresets.overview)
    : cameraPresets[view]

  cameraTween = {
    start: performance.now(),
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPosition: preset.position.clone(),
    toTarget: preset.target.clone(),
  }
}

function updateCameraTween(now: number) {
  if (!cameraTween || !camera || !controls) return
  const t = THREE.MathUtils.clamp((now - cameraTween.start) / 720, 0, 1)
  const eased = t * t * (3 - 2 * t)
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased)
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased)
  if (t >= 1) cameraTween = null
}

function setPointerFromEvent(event: PointerEvent) {
  if (!renderer) return
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function getStructureHit(event: PointerEvent) {
  if (!camera) return null
  setPointerFromEvent(event)
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(interactiveMeshes, true)
  return hits.find((hit) => hit.object.userData.structureId || hit.object.parent?.userData.structureId) || null
}

function onScenePointerMove(event: PointerEvent) {
  if (!renderer) return
  const hit = getStructureHit(event)
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
}

function onScenePointerDown(event: PointerEvent) {
  pointerDownPosition = { x: event.clientX, y: event.clientY }
}

function onScenePointerUp(event: PointerEvent) {
  if (!pointerDownPosition) return
  const moved = Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y)
  pointerDownPosition = null
  if (moved > 5) return
  const hit = getStructureHit(event)
  if (!hit) return
  const id = hit.object.userData.structureId || hit.object.parent?.userData.structureId
  if (id && structureKnowledge[id]) selectedStructureId.value = id
}

function getSceneHostSize() {
  const container = threeContainerRef.value
  if (!container) return { width: 0, height: 0 }

  const rect = container.getBoundingClientRect()
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

async function waitForSceneHostSize(maxFrames = 20) {
  for (let i = 0; i < maxFrames; i++) {
    const { width, height } = getSceneHostSize()
    if (width >= 40 && height >= 40) return true
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  return false
}

function resizeThreeSceneNow(force = false) {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return

  const { width, height } = getSceneHostSize()

  // center-stage 在首次布局尚未稳定时可能短暂为 0 高度。
  // 此时绝不能把 WebGL 画布锁成 1×1，否则视觉上就是“模型完全不显示”。
  if (width < 4 || height < 4) return

  if (!force && width === lastSceneWidth && height === lastSceneHeight) return

  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  waterRenderer?.setSize?.(width, height, false)

  if (currentView.value === 'overview' && !cameraTween) {
    fitCameraToModel()
  }

  if (scene) renderer.render(scene, camera)
  if (waterRenderer && waterScene) waterRenderer.render(waterScene, camera)
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

function animateScene(now: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
  lastFrameTime = now
  const elapsed = now / 1000

  updateCameraTween(now)
  controls?.update()
  updateModelState(elapsed)
  updateWater(elapsed)
  updateSceneLabels()

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
  if (!isPlaying.value) return

  progress.value += delta * playbackSpeed.value * 7.2
  if (progress.value >= 100) {
    progress.value = 100
    isPlaying.value = false
  }
}

async function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  sceneBackgroundTexture = new THREE.TextureLoader().load(volcanoBackgroundUrl)
  sceneBackgroundTexture.colorSpace = THREE.SRGBColorSpace
  sceneBackgroundTexture.minFilter = THREE.LinearMipmapLinearFilter
  scene.background = sceneBackgroundTexture
  scene.backgroundBlurriness = 0.035
  scene.backgroundIntensity = 0.76

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 240)
  camera.position.set(13.8, 9.3, 15.2)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.className = 'scene-canvas main-three-canvas'
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotate = autoRotate.value
  controls.autoRotateSpeed = 0.52
  controls.enablePan = false
  controls.minDistance = 7
  controls.maxDistance = 38
  controls.minPolarAngle = 0.18
  controls.maxPolarAngle = Math.PI * 0.47
  controls.target.set(0, 0.3, 0.4)

  scene.add(new THREE.HemisphereLight(0xdbeeff, 0x2c241d, 1.55))
  mainLight = new THREE.DirectionalLight(0xfff4df, 3.1)
  mainLight.position.set(-7, 13, 10)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.set(2048, 2048)
  mainLight.shadow.camera.left = -13
  mainLight.shadow.camera.right = 13
  mainLight.shadow.camera.top = 13
  mainLight.shadow.camera.bottom = -13
  mainLight.shadow.bias = -0.0007
  scene.add(mainLight)

  fillLight = new THREE.DirectionalLight(0x9dd7ff, 1.0)
  fillLight.position.set(10, 5, -12)
  scene.add(fillLight)

  createSceneModel()

  // 删除模板占位卡片后，stage-content 只剩绝对定位子元素，
  // v1 会在某些布局下塌缩为 0 高度。先等待布局稳定，再做首次相机和画布校准。
  await waitForSceneHostSize()
  resizeThreeSceneNow(true)
  fitCameraToModel()
  currentView.value = 'overview'

  renderer.domElement.addEventListener('pointermove', onScenePointerMove)
  renderer.domElement.addEventListener('pointerdown', onScenePointerDown)
  renderer.domElement.addEventListener('pointerup', onScenePointerUp)

  threeResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  await nextTick()
  await waitForSceneHostSize(8)
  resizeThreeSceneNow(true)

  lastFrameTime = performance.now()
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
}

watch(showCraterLake, (value) => {
  if (lakeProxyMesh) lakeProxyMesh.visible = value
  if (terrainWaterUniforms) terrainWaterUniforms.visible.value = value ? 1 : 0
})

watch(autoRotate, (value) => {
  if (!controls) return
  controls.autoRotate = value
  controls.autoRotateSpeed = 0.52
})

function resetControls() {
  silicaContent.value = 58
  volatileContent.value = 3.2
  magmaTemperature.value = 1030
  showLabels.value = true
  showInternalStructure.value = true
  showCraterLake.value = true
  showEjecta.value = true
  progress.value = 0
  playbackSpeed.value = 1
  isPlaying.value = false
  autoRotate.value = false
  selectedStructureId.value = 'volcanicCone'
  currentView.value = 'overview'
  cameraTween = null
  fitCameraToModel()
  scheduleSceneResize(90)
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)
  cancelAnimationFrame(timelineAnimationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener('pointermove', onScenePointerMove)
    renderer.domElement.removeEventListener('pointerdown', onScenePointerDown)
    renderer.domElement.removeEventListener('pointerup', onScenePointerUp)
  }

  controls?.dispose()
  controls = null
  destroyComputeWater()

  lavaMaterials.forEach((material) => material.dispose())
  lavaMaterials.length = 0
  noiseTexture?.dispose()
  lavaTileTexture?.dispose()
  noiseTexture = null
  lavaTileTexture = null
  sceneBackgroundTexture?.dispose()
  sceneBackgroundTexture = null

  if (fallbackWater) {
    const material = fallbackWater.material as THREE.Material
    material.dispose()
    fallbackWater = null
  }

  const unique = new Set(disposables)
  unique.forEach((item) => item.dispose())
  disposables.length = 0

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  interactiveMeshes.length = 0
  labelElements.clear()
  scene = null
  camera = null
  renderer = null
  modelGroup = null
  terrainMesh = null
  terrainWaterUniforms = null
  snowCapMesh = null
  magmaChamber = null
  magmaPressureGlowMesh = null
  magmaNeckMesh = null
  conduitMesh = null
  collapsedChamberGroup = null
  lavaFlowMesh = null
  lavaFlowMeshes.length = 0
  fissureMesh = null
  fissureCrackGroup = null
  fissureGlowMeshes.length = 0
  craterGlowMesh = null
  craterPoolMesh = null
  secondaryCraterCrustMesh = null
  secondaryCraterPoolMesh = null
  secondaryCraterLight = null
  lakeProxyMesh = null
  ashCloudGroup = null
  ashCloudTexture = null
  ejectaGroup = null
  ejectaTexture = null
  mainLight = null
  fillLight = null
}

onMounted(async () => {
  await nextTick()
  await initScene()
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)
})

// 路由使用 KeepAlive 时重新进入页面也要恢复真正的默认总览，
// 避免沿用上一次旋转、缩放后的 OrbitControls 状态。
onActivated(async () => {
  await nextTick()
  if (!camera || !controls) return
  currentView.value = 'overview'
  cameraTween = null
  resizeThreeSceneNow(true)
  fitCameraToModel()
  scheduleSceneResize(120)
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.volcano-container .workspace.panel-resizing,
.volcano-container .workspace.layout-resizing,
.volcano-container .workspace.panel-resizing .center-stage,
.volcano-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.volcano-control-floating-card {
  z-index: 46;
}

.volcano-data-floating-card {
  z-index: 45;
}

.volcano-data-floating-card:not(.collapsed) {
  height: min(620px, calc(100vh - 98px));
}

.volcano-floating-card-content {
  height: auto;
  padding: clamp(10px, 1vw, 15px);
  overflow: visible;
}

.volcano-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  overflow: hidden;
}

.volcano-three-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #405564;
}

.volcano-three-host :deep(.scene-canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  min-width: 100%;
  min-height: 100%;
}

.volcano-three-host :deep(.main-three-canvas) {
  z-index: 2;
}

.volcano-three-host :deep(.compute-water-canvas) {
  z-index: 1;
  pointer-events: none;
}

.eruption-stage-grid,
.view-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.volcano-reset-btn {
  width: 100%;
  margin-top: clamp(10px, 0.8vw, 14px);
}

.stage-status-pill {
  position: absolute;
  z-index: 6;
  top: clamp(12px, 1.2vw, 18px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  color: rgba(255, 255, 255, 0.94);
  font-size: clamp(11px, 0.85vw, 14px);
  line-height: 1;
  pointer-events: none;
  transform: translateX(-50%);
  background: rgba(8, 20, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}

.stage-status-pill small {
  color: rgba(220, 236, 245, 0.72);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #73858f;
}

.status-dot.active {
  background: #ff6a1a;
  box-shadow: 0 0 12px rgba(255, 91, 20, 0.9);
}

.stage-structure-legend {
  position: absolute;
  z-index: 7;
  right: auto;
  bottom: clamp(108px, 13vh, 136px);
  left: clamp(14px, 1.1vw, 18px);
  width: clamp(142px, 12.5vw, 184px);
  padding: clamp(9px, 0.8vw, 12px);
  pointer-events: none;
}

.stage-legend-title {
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: clamp(11px, 0.8vw, 13px);
  font-weight: 800;
}

.stage-legend-list {
  display: grid;
  gap: 6px;
}

.stage-legend-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 7px;
  align-items: center;
}

.stage-legend-item .legend-swatch {
  width: 10px;
  height: 10px;
  margin-top: 0;
  border-radius: 3px;
}

.stage-legend-item strong {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: clamp(9px, 0.7vw, 11px);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.volcano-label-layer {
  position: absolute;
  z-index: 5;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.volcano-label {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  will-change: transform;
}

.volcano-label span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 5px 9px 5px 7px;
  color: rgba(244, 249, 250, 0.96);
  font-size: clamp(11px, 0.82vw, 14px);
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.72);
  background: rgba(10, 22, 26, 0.68);
  border: 1px solid rgba(221, 239, 244, 0.2);
  border-radius: 6px;
  box-shadow: 0 3px 10px rgba(2, 8, 10, 0.22);
  backdrop-filter: blur(5px);
}

.volcano-container .timeline-dock {
  grid-template-columns: auto minmax(150px, 1fr) auto auto;
}

.timeline-rotate-control {
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 8px;
  padding-left: clamp(8px, 0.8vw, 12px);
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
  font-weight: 650;
  white-space: nowrap;
  border-left: 1px solid rgba(190, 220, 232, 0.16);
}

.timeline-rotate-control :deep(.el-switch) {
  --el-switch-on-color: var(--theme-primary);
  --el-switch-off-color: rgba(117, 140, 151, 0.48);
}

.volcano-label span::before {
  width: 5px;
  height: 5px;
  margin-right: 7px;
  content: '';
  background: #b8d8e2;
  border: 1px solid rgba(235, 249, 252, 0.7);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(141, 211, 230, 0.5);
}

.volcano-label.active span {
  color: #ffd7bd;
  background: rgba(72, 28, 12, 0.78);
  border-color: rgba(255, 129, 61, 0.5);
}

.volcano-label.active span::before {
  background: #ff6a1a;
  border-color: #ffd0b5;
  box-shadow: 0 0 8px rgba(255, 92, 22, 0.82);
}

.volcano-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.selected-structure-card {
  margin-top: clamp(10px, 0.9vw, 14px);
  padding: 16px;
  margin-bottom: clamp(10px, 0.9vw, 14px);
}

.selected-structure-head {
  display: flex;
  align-items: center;
}

.selected-structure-head span,
.structure-meta-row span {
  color: var(--text-secondary);
  font-size: clamp(10px, 0.76vw, 12px);
}

.selected-structure-head strong {
  color: #fff;
  font-size: clamp(14px, 1vw, 17px);
}

.structure-button-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;
}

.structure-select-btn {
  min-width: 0;
  padding-inline: 6px;
}

.selected-structure-card p {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: clamp(13px, 0.94vw, 15px);
  line-height: 1.8;
}

.structure-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--inactive-border);
}

.structure-meta-row strong {
  color: var(--text-primary);
  font-size: clamp(11px, 0.8vw, 13px);
  text-align: right;
}

.principle-flow p+p,
.collapse-content p+p {
  margin-top: 8px;
}

.simulation-note {
  color: rgba(242, 203, 128, 0.88) !important;
}



@media (max-width: 900px) {
  .volcano-container .timeline-dock {
    grid-template-columns: auto minmax(110px, 1fr) auto auto;
    gap: 6px;
  }

  .timeline-rotate-control {
    padding-left: 6px;
  }

  .timeline-rotate-control>span {
    display: none;
  }

  .stage-structure-legend {
    bottom: 82px;
    width: 132px;
  }

  .volcano-label span {
    font-size: 11px;
  }

  .volcano-data-grid {
    grid-template-columns: 1fr;
  }
}
</style>
