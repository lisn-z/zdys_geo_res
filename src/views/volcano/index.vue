<template>
  <div
    ref="pageRef"
    class="volcano-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">火山</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>火山控制</h2>
              <p>控制喷发过程、岩浆性质与模型图层</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">喷发阶段</h3>
            <div class="option-grid eruption-stage-grid">
              <button
                v-for="item in eruptionStageOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentStage === item.value }"
                @click="jumpToStage(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">SiO₂ 含量</h3>
              <strong class="control-value">{{ silicaContent }}%</strong>
            </div>
            <el-slider
              v-model="silicaContent"
              :min="45"
              :max="75"
              :step="1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">挥发分含量</span>
              <strong class="control-value">{{ volatileContent.toFixed(1) }}%</strong>
            </div>
            <el-slider
              v-model="volatileContent"
              :min="1"
              :max="6"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">岩浆温度</span>
              <strong class="control-value">{{ magmaTemperature }} ℃</strong>
            </div>
            <el-slider
              v-model="magmaTemperature"
              :min="750"
              :max="1200"
              :step="10"
              :show-tooltip="false"
            />
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
                <span>显示火山灰柱、火山弹与喷发粒子</span>
              </div>
              <el-switch v-model="showEjecta" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>
            <div class="option-grid view-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="setCameraView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn volcano-reset-btn"
              @click="resetControls"
            >
              恢复默认参数
            </button>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>
        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          v-bind="leftCollapseAttrs"
        >
          ‹
        </button>
      </aside>

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
              <div
                v-for="item in structureLegend"
                :key="item.label"
                class="stage-legend-item"
              >
                <span
                  class="legend-swatch"
                  :style="{ background: item.color }"
                ></span>
                <strong>{{ item.label }}</strong>
              </div>
            </div>
          </div>


          <div
            v-if="showLabels"
            class="volcano-label-layer"
          >
            <div
              v-for="item in sceneLabels"
              :key="item.id"
              :ref="(el) => setLabelRef(item.id, el)"
              class="volcano-label"
              :class="{ active: selectedStructureId === item.structureId }"
            >
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="isPlaying = !isPlaying"
          >
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
            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :show-tooltip="false"
              @input="isPlaying = false"
            />
          </div>

          <div class="speed-options">
            <button
              v-for="item in speedOptions"
              :key="item"
              type="button"
              class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }"
              @click="playbackSpeed = item"
            >
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>喷发数据</h2>
              <p>查看教学模拟量、结构说明与喷发原理</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid volcano-data-grid">
            <article
              v-for="item in dataCards"
              :key="item.label"
              class="geo-card data-card"
              :class="item.className"
            >
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
              <button
                v-for="item in structureOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn structure-select-btn"
                :class="{ active: selectedStructureId === item.value }"
                @click="selectedStructureId = item.value"
              >
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

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>
        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
// Volcano_v4：精简主场景提示与结构信息、联动结构标注高亮、默认视角略缩小，并让播放完成后回到静息期 0% 暂停。
import {
  computed,
  nextTick,
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

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

const hasLeftPanel = true
const hasRightPanel = true

const threeContainerRef = ref<HTMLElement | null>(null)

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,
  leftResizeAttrs,
  rightResizeAttrs,
  leftCollapseAttrs,
  rightCollapseAttrs,
  leftEntryAttrs,
  rightEntryAttrs,
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
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

const BASE_WIDTH = 16
const BASE_DEPTH = 11
const BASE_BOTTOM = -3.45
const MAIN_VOLCANO = new THREE.Vector2(2.25, 2.25)
const SNOW_VOLCANO = new THREE.Vector2(-3.65, 0.25)
const SMALL_CONE = new THREE.Vector2(-0.2, -2.45)
const LAKE_CENTER = new THREE.Vector2(-3.25, -3.15)
const LAKE_LEVEL = 0.58

function isLakeSurfaceOpening(x: number, z: number) {
  const dx = (x - LAKE_CENTER.x) / 1.28
  const dz = (z - LAKE_CENTER.y) / 0.88
  return dx * dx + dz * dz < 1
}

function isTeachingCutawayOpening(x: number, z: number) {
  const frontZ = BASE_DEPTH / 2
  const startZ = 2.58
  if (z < startZ || z > frontZ) return false

  const t = THREE.MathUtils.clamp((z - startZ) / (frontZ - startZ), 0, 1)
  const halfWidth = 0.28 + t * 0.72
  const centerX = MAIN_VOLCANO.x + t * 0.05

  return Math.abs(x - centerX) < halfWidth
}

function seededNoise(x: number, z: number) {
  return (
    Math.sin(x * 1.71 + z * 0.53) * 0.45 +
    Math.sin(x * 3.27 - z * 1.86) * 0.24 +
    Math.sin(x * 6.3 + z * 4.1) * 0.12
  )
}

function volcanoBump(x: number, z: number, center: THREE.Vector2, radius: number, height: number) {
  const dx = x - center.x
  const dz = z - center.y
  const r = Math.sqrt(dx * dx + dz * dz)
  const normalized = r / radius
  if (normalized >= 1.65) return 0
  return height * Math.exp(-Math.pow(normalized, 2.1))
}

function terrainHeight(x: number, z: number) {
  let y = 0.32 + seededNoise(x, z) * 0.11

  const mainDx = x - MAIN_VOLCANO.x
  const mainDz = z - MAIN_VOLCANO.y
  const mainR = Math.sqrt(mainDx * mainDx + mainDz * mainDz)
  y += volcanoBump(x, z, MAIN_VOLCANO, 3.15, 4.55)
  y -= 1.16 * Math.exp(-Math.pow(mainR / 0.72, 4))

  const snowDx = x - SNOW_VOLCANO.x
  const snowDz = z - SNOW_VOLCANO.y
  const snowR = Math.sqrt(snowDx * snowDx + snowDz * snowDz)
  y += volcanoBump(x, z, SNOW_VOLCANO, 2.45, 3.65)
  y -= 0.58 * Math.exp(-Math.pow(snowR / 0.52, 4))

  const smallDx = x - SMALL_CONE.x
  const smallDz = z - SMALL_CONE.y
  const smallR = Math.sqrt(smallDx * smallDx + smallDz * smallDz)
  y += volcanoBump(x, z, SMALL_CONE, 1.25, 1.55)
  y -= 0.42 * Math.exp(-Math.pow(smallR / 0.32, 4))

  const lakeDx = x - LAKE_CENTER.x
  const lakeDz = z - LAKE_CENTER.y
  const lakeR = Math.sqrt(lakeDx * lakeDx + lakeDz * lakeDz)
  y += 0.62 * Math.exp(-Math.pow(lakeR / 1.8, 2.2))
  y -= 0.92 * Math.exp(-Math.pow(lakeR / 0.92, 4))

  return y
}

function terrainColor(x: number, y: number, z: number) {
  const c = new THREE.Color()
  const n = seededNoise(x * 0.8, z * 0.8)
  const mainDist = Math.hypot(x - MAIN_VOLCANO.x, z - MAIN_VOLCANO.y)
  const snowDist = Math.hypot(x - SNOW_VOLCANO.x, z - SNOW_VOLCANO.y)

  if (snowDist < 1.45 && y > 2.75 + n * 0.12) {
    c.set('#d9dde0')
    c.offsetHSL(0, 0, n * 0.035)
    return c
  }

  if (mainDist < 1.35 && y > 3.25) {
    c.set('#4c4237')
    c.offsetHSL(0, 0, n * 0.035)
    return c
  }

  if (y > 2.1) {
    c.set('#62604f')
    c.offsetHSL(0, 0.06, n * 0.04)
    return c
  }

  if (y > 0.95) {
    c.set('#4b5d3c')
    c.offsetHSL(n * 0.015, 0.04, n * 0.04)
    return c
  }

  c.set('#344c2e')
  c.offsetHSL(n * 0.02, 0.05, n * 0.045)
  return c
}

function createTerrainGeometry() {
  const segX = 104
  const segZ = 76
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
      const xCenter = -BASE_WIDTH / 2 + ((ix + 0.5) / segX) * BASE_WIDTH
      const zCenter = -BASE_DEPTH / 2 + ((iz + 0.5) / segZ) * BASE_DEPTH
      const lakeOpening =
        isLakeSurfaceOpening(xCenter, zCenter) &&
        terrainHeight(xCenter, zCenter) <= LAKE_LEVEL + 0.24
      const teachingCutaway = isTeachingCutawayOpening(xCenter, zCenter)

      if (lakeOpening || teachingCutaway) continue

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

function createStrataTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const palette = ['#6e5a46', '#8b7358', '#574b3f', '#9a8161', '#74624e', '#4d443b']

  ctx.fillStyle = '#74614d'
  ctx.fillRect(0, 0, 512, 512)

  for (let y = 0; y < 512; y += 10) {
    const wobble = Math.sin(y * 0.073) * 4 + Math.sin(y * 0.021) * 8
    ctx.beginPath()
    ctx.moveTo(0, y + wobble)
    for (let x = 0; x <= 512; x += 16) {
      const yy = y + wobble + Math.sin(x * 0.055 + y * 0.015) * 4
      ctx.lineTo(x, yy)
    }
    ctx.strokeStyle = palette[Math.floor(y / 10) % palette.length]
    ctx.lineWidth = 6
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, y + wobble + 3)
    for (let x = 0; x <= 512; x += 16) {
      const yy = y + wobble + 3 + Math.sin(x * 0.055 + y * 0.015) * 4
      ctx.lineTo(x, yy)
    }
    ctx.strokeStyle = 'rgba(25,22,19,.52)'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  for (let i = 0; i < 36; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const len = 18 + Math.random() * 74
    ctx.strokeStyle = 'rgba(30,26,23,.28)'
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (Math.random() - 0.5) * 18, y + len)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3.2, 2.1)
  texture.anisotropy = 4
  return texture
}

function createEdgeWallGeometry(side: 'front' | 'back' | 'left' | 'right', withWindow = false) {
  const horizontalSegments = side === 'front' || side === 'back' ? 96 : 70
  const verticalSegments = withWindow ? 34 : 1
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

      if (withWindow && side === 'front') {
        const xCenter = -BASE_WIDTH / 2 + ((i + 0.5) / horizontalSegments) * BASE_WIDTH
        const top = terrainHeight(xCenter, BASE_DEPTH / 2)
        const vCenter = (iy + 0.5) / verticalSegments
        const yCenter = BASE_BOTTOM + (top - BASE_BOTTOM) * vCenter

        // 只剖开岩浆房与主火山通道附近，保留其余完整岩层，
        // 避免整个底部像被掏空一样悬浮。
        const chamberHole =
          Math.pow((xCenter - MAIN_VOLCANO.x) / 1.55, 2) +
          Math.pow((yCenter + 1.78) / 1.04, 2) < 1

        const conduitHalfWidth =
          0.26 + THREE.MathUtils.clamp((yCenter + 1.45) / 2.7, 0, 1) * 0.16
        const conduitHole =
          Math.abs(xCenter - MAIN_VOLCANO.x) < conduitHalfWidth &&
          yCenter > -1.48 &&
          yCenter < Math.min(top - 0.04, 0.62)

        const connectorHole =
          Math.abs(xCenter - MAIN_VOLCANO.x) < 0.72 &&
          yCenter > -1.58 &&
          yCenter < -0.72

        if (chamberHole || conduitHole || connectorHole) continue
      }

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
  const geometry = new THREE.IcosahedronGeometry(radius, 4)
  const pos = geometry.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const scale = 1 + Math.sin(v.x * 5.1 + v.y * 3.4) * 0.07 + Math.sin(v.z * 7.3) * 0.05
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
  uniform vec2 uvScale;
  varying vec2 vUv;
  void main() {
    vUv = uv * uvScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lavaFragmentShader = `
  uniform float time;
  uniform float opacityValue;
  uniform sampler2D noiseMap;
  uniform sampler2D lavaMap;
  varying vec2 vUv;

  void main() {
    vec4 n = texture2D(noiseMap, vUv * 0.62);
    vec2 uvA = vUv + vec2(0.72, -0.58) * time * 0.055;
    vec2 uvB = vUv + vec2(-0.26, 0.91) * time * 0.031;
    uvA += (n.rg - 0.5) * 0.95;
    uvB += (n.gb - 0.5) * 0.28;

    float mask = texture2D(noiseMap, uvA * 1.55).r;
    vec3 base = texture2D(lavaMap, uvB * 1.35).rgb;
    float hot = smoothstep(0.36, 0.86, mask + base.r * 0.36);
    vec3 darkRock = vec3(0.10, 0.025, 0.012);
    vec3 orange = vec3(1.0, 0.17, 0.012);
    vec3 yellow = vec3(1.0, 0.76, 0.12);
    vec3 color = mix(darkRock, orange, hot);
    color = mix(color, yellow, pow(hot, 4.0) * 0.72);
    gl_FragColor = vec4(color, opacityValue);
  }
`

let noiseTexture: THREE.Texture | null = null
let lavaTileTexture: THREE.Texture | null = null
const lavaMaterials: THREE.ShaderMaterial[] = []

function createLavaMaterial(uvScale = new THREE.Vector2(2, 2), opacity = 1) {
  if (!noiseTexture) noiseTexture = createNoiseTexture()
  if (!lavaTileTexture) lavaTileTexture = createLavaTileTexture()

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      uvScale: { value: uvScale.clone() },
      noiseMap: { value: noiseTexture },
      lavaMap: { value: lavaTileTexture },
      opacityValue: { value: opacity },
    },
    vertexShader: lavaVertexShader,
    fragmentShader: lavaFragmentShader,
    transparent: opacity < 1,
    depthWrite: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  lavaMaterials.push(material)
  return material
}

function createRibbonGeometry(points: THREE.Vector3[], width = 0.45) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    const tangent = next.clone().sub(prev).setY(0).normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x)
    const taper = 0.72 + 0.28 * (i / Math.max(1, points.length - 1))
    const p = points[i]
    const left = p.clone().addScaledVector(side, width * 0.5 * taper)
    const right = p.clone().addScaledVector(side, -width * 0.5 * taper)
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
    const v = i / Math.max(1, points.length - 1)
    uvs.push(0, v, 1, v)
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

function createFlowPath(raw: Array<[number, number]>, yOffset = 0.06) {
  return raw.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + yOffset, z))
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

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let modelGroup: THREE.Group | null = null
let terrainMesh: THREE.Mesh | null = null
let magmaChamber: THREE.Mesh | null = null
let conduitMesh: THREE.Mesh | null = null
let lateralDikeMesh: THREE.Mesh | null = null
let lavaFlowMesh: THREE.Mesh | null = null
let fissureMesh: THREE.Mesh | null = null
let craterGlowMesh: THREE.Mesh | null = null
let lakeProxyMesh: THREE.Mesh | null = null
let fallbackWater: Water | null = null
let ashPoints: THREE.Points | null = null
let bombPoints: THREE.Points | null = null
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
  { id: 'label-conduit', label: '火山通道', structureId: 'conduit', position: new THREE.Vector3(2.45, 0.15, 4.73), offset: [44, -2] },
  { id: 'label-chamber', label: '岩浆房', structureId: 'magmaChamber', position: new THREE.Vector3(2.25, -1.82, 5.08), offset: [54, 18] },
  { id: 'label-fissure', label: '火山裂隙', structureId: 'fissure', position: new THREE.Vector3(-5.55, 0.9, 4.45), offset: [-70, -14] },
  { id: 'label-lake', label: '火山口湖', structureId: 'craterLake', position: new THREE.Vector3(-3.2, 0.86, -3.12), offset: [-10, -34] },
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

function createInternalStructure(group: THREE.Group) {
  const chamberMaterial = createLavaMaterial(new THREE.Vector2(1.7, 1.7), 1)
  magmaChamber = new THREE.Mesh(createIrregularSphere(1.05), chamberMaterial)
  magmaChamber.scale.set(1.45, 0.96, 0.78)
  magmaChamber.position.set(2.25, -1.78, 5.0)
  magmaChamber.rotation.z = -0.13
  addInteractive(magmaChamber, 'magmaChamber')
  group.add(magmaChamber)
  disposables.push(magmaChamber.geometry)

  const chamberGlow = new THREE.PointLight(0xff5b16, 2.8, 7, 2)
  chamberGlow.position.copy(magmaChamber.position).add(new THREE.Vector3(0, 0.2, -0.1))
  chamberGlow.userData.baseIntensity = 2.8
  group.add(chamberGlow)

  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.25, -1.0, 4.95),
    new THREE.Vector3(2.34, -0.05, 4.78),
    new THREE.Vector3(2.27, 1.0, 4.42),
    new THREE.Vector3(2.25, 2.28, 3.58),
    new THREE.Vector3(2.25, 3.66, 2.46),
  ])
  conduitMesh = new THREE.Mesh(
    new THREE.TubeGeometry(conduitCurve, 72, 0.18, 14, false),
    createLavaMaterial(new THREE.Vector2(2.3, 4.8), 1)
  )
  addInteractive(conduitMesh, 'conduit')
  group.add(conduitMesh)
  disposables.push(conduitMesh.geometry)

  const dikeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.2, -1.12, 4.86),
    new THREE.Vector3(1.45, -0.54, 4.96),
    new THREE.Vector3(0.4, 0.0, 5.05),
    new THREE.Vector3(-0.62, 0.36, 4.92),
  ])
  lateralDikeMesh = new THREE.Mesh(
    new THREE.TubeGeometry(dikeCurve, 48, 0.085, 10, false),
    createLavaMaterial(new THREE.Vector2(1.4, 5.4), 1)
  )
  addInteractive(lateralDikeMesh, 'fissure')
  group.add(lateralDikeMesh)
  disposables.push(lateralDikeMesh.geometry)
}

function createSurfaceLava(group: THREE.Group) {
  const flowPoints = createFlowPath([
    [2.23, 2.2], [2.5, 2.75], [2.9, 3.18], [3.45, 3.55],
    [4.05, 3.9], [4.62, 4.28], [5.25, 4.65], [5.92, 5.03],
  ], 0.085)
  lavaFlowMesh = new THREE.Mesh(
    createRibbonGeometry(flowPoints, 0.58),
    createLavaMaterial(new THREE.Vector2(2.2, 7.5), 0.96)
  )
  lavaFlowMesh.renderOrder = 2
  addInteractive(lavaFlowMesh, 'lavaFlow')
  group.add(lavaFlowMesh)
  disposables.push(lavaFlowMesh.geometry)

  const fissurePoints = createFlowPath([
    [-6.18, 4.86], [-5.78, 4.62], [-5.3, 4.54], [-4.84, 4.42],
    [-4.42, 4.25], [-4.05, 4.02], [-3.72, 3.75],
  ], 0.07)
  fissureMesh = new THREE.Mesh(
    createRibbonGeometry(fissurePoints, 0.2),
    createLavaMaterial(new THREE.Vector2(1.6, 7.2), 0.96)
  )
  fissureMesh.renderOrder = 2
  addInteractive(fissureMesh, 'fissure')
  group.add(fissureMesh)
  disposables.push(fissureMesh.geometry)

  const craterY = terrainHeight(MAIN_VOLCANO.x, MAIN_VOLCANO.y) + 0.06
  craterGlowMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.08, 12, 48),
    createLavaMaterial(new THREE.Vector2(4.2, 1.1), 0.94)
  )
  craterGlowMesh.rotation.x = Math.PI / 2
  craterGlowMesh.position.set(MAIN_VOLCANO.x, craterY, MAIN_VOLCANO.y)
  addInteractive(craterGlowMesh, 'crater')
  group.add(craterGlowMesh)
  disposables.push(craterGlowMesh.geometry)
}

function createVolcanoParticles(group: THREE.Group) {
  const ashCount = 420
  const ashPositions = new Float32Array(ashCount * 3)
  const ashSeeds = new Float32Array(ashCount * 4)
  for (let i = 0; i < ashCount; i++) {
    ashSeeds[i * 4] = Math.random()
    ashSeeds[i * 4 + 1] = Math.random() * Math.PI * 2
    ashSeeds[i * 4 + 2] = Math.random()
    ashSeeds[i * 4 + 3] = 0.55 + Math.random() * 0.85
  }
  const ashGeometry = new THREE.BufferGeometry()
  ashGeometry.setAttribute('position', new THREE.BufferAttribute(ashPositions, 3))
  ashGeometry.userData.seeds = ashSeeds
  const ashMaterial = new THREE.PointsMaterial({
    color: 0x8c9294,
    size: 0.13,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    sizeAttenuation: true,
  })
  ashPoints = new THREE.Points(ashGeometry, ashMaterial)
  ashPoints.frustumCulled = false
  ashPoints.renderOrder = 4
  addInteractive(ashPoints, 'ashColumn')
  group.add(ashPoints)
  disposables.push(ashGeometry, ashMaterial)

  const bombCount = 120
  const bombPositions = new Float32Array(bombCount * 3)
  const bombSeeds = new Float32Array(bombCount * 5)
  for (let i = 0; i < bombCount; i++) {
    bombSeeds[i * 5] = Math.random()
    bombSeeds[i * 5 + 1] = Math.random() * Math.PI * 2
    bombSeeds[i * 5 + 2] = 0.55 + Math.random() * 1.1
    bombSeeds[i * 5 + 3] = 1.4 + Math.random() * 1.7
    bombSeeds[i * 5 + 4] = 0.7 + Math.random() * 0.9
  }
  const bombGeometry = new THREE.BufferGeometry()
  bombGeometry.setAttribute('position', new THREE.BufferAttribute(bombPositions, 3))
  bombGeometry.userData.seeds = bombSeeds
  const bombMaterial = new THREE.PointsMaterial({
    color: 0xff5a14,
    size: 0.095,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  bombPoints = new THREE.Points(bombGeometry, bombMaterial)
  bombPoints.frustumCulled = false
  bombPoints.renderOrder = 5
  group.add(bombPoints)
  disposables.push(bombGeometry, bombMaterial)
}

function updateParticles(elapsed: number) {
  if (!ashPoints || !bombPoints) return
  const factor = showEjecta.value ? eruptionFactor.value : 0
  const explosive = explosiveIndex.value
  ashPoints.visible = factor > 0.08
  bombPoints.visible = factor > 0.13

  const craterX = MAIN_VOLCANO.x
  const craterZ = MAIN_VOLCANO.y
  const craterY = terrainHeight(craterX, craterZ) + 0.23

  const ashPosition = ashPoints.geometry.attributes.position as THREE.BufferAttribute
  const ashSeeds = ashPoints.geometry.userData.seeds as Float32Array
  for (let i = 0; i < ashPosition.count; i++) {
    const phase = (elapsed * (0.13 + factor * 0.19) + ashSeeds[i * 4]) % 1
    const angle = ashSeeds[i * 4 + 1]
    const radialSeed = ashSeeds[i * 4 + 2]
    const speed = ashSeeds[i * 4 + 3]
    const y = craterY + phase * (2.1 + explosive * 5.8) * speed
    const spread = (0.12 + phase * phase * (1.1 + explosive * 2.0)) * radialSeed
    const drift = phase * phase * 1.2
    ashPosition.setXYZ(
      i,
      craterX + Math.cos(angle) * spread + drift * 0.34,
      y,
      craterZ + Math.sin(angle) * spread - drift * 0.12
    )
  }
  ashPosition.needsUpdate = true
  ;(ashPoints.material as THREE.PointsMaterial).opacity = 0.18 + factor * (0.34 + explosive * 0.28)
  ;(ashPoints.material as THREE.PointsMaterial).size = 0.08 + factor * 0.1

  const bombPosition = bombPoints.geometry.attributes.position as THREE.BufferAttribute
  const bombSeeds = bombPoints.geometry.userData.seeds as Float32Array
  for (let i = 0; i < bombPosition.count; i++) {
    const phase = (elapsed * (0.17 + factor * 0.2) + bombSeeds[i * 5]) % 1
    const angle = bombSeeds[i * 5 + 1]
    const horizontalSpeed = bombSeeds[i * 5 + 2] * (0.45 + explosive * 0.75)
    const verticalSpeed = bombSeeds[i * 5 + 3] * (0.55 + explosive * 0.68)
    const scale = bombSeeds[i * 5 + 4]
    const t = phase * 2.1
    const x = craterX + Math.cos(angle) * horizontalSpeed * t * scale
    const z = craterZ + Math.sin(angle) * horizontalSpeed * t * scale
    const y = craterY + verticalSpeed * t - 1.72 * t * t
    bombPosition.setXYZ(i, x, Math.max(terrainHeight(x, z) + 0.03, y), z)
  }
  bombPosition.needsUpdate = true
  ;(bombPoints.material as THREE.PointsMaterial).opacity = Math.min(1, factor * 1.4)
}

function createLakeProxy(group: THREE.Group) {
  const geometry = new THREE.CircleGeometry(1.45, 48)
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  lakeProxyMesh = new THREE.Mesh(geometry, material)
  lakeProxyMesh.rotation.x = -Math.PI / 2
  lakeProxyMesh.scale.set(1.0, 0.72, 1)
  lakeProxyMesh.position.set(LAKE_CENTER.x, LAKE_LEVEL + 0.03, LAKE_CENTER.y)
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
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  })
  terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial)
  terrainMesh.receiveShadow = true
  terrainMesh.castShadow = true
  addInteractive(terrainMesh, 'volcanicCone')
  modelGroup.add(terrainMesh)
  disposables.push(terrainGeometry, terrainMaterial)

  const strataTexture = createStrataTexture()
  const strataMaterial = new THREE.MeshStandardMaterial({
    map: strataTexture,
    roughness: 0.95,
    metalness: 0,
  })
  disposables.push(strataTexture, strataMaterial)

  const frontWall = new THREE.Mesh(createEdgeWallGeometry('front', true), strataMaterial)
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
  const geometry = createEllipseGridGeometry(2.75, 2.0, 36)
  fallbackWater = new Water(geometry, {
    textureWidth: 256,
    textureHeight: 256,
    waterNormals: normals,
    sunDirection: new THREE.Vector3(0.6, 1, 0.3).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x245e8e,
    distortionScale: 1.8,
    fog: false,
    alpha: 0.9,
  })
  fallbackWater.rotation.x = -Math.PI / 2
  fallbackWater.position.set(LAKE_CENTER.x, LAKE_LEVEL, LAKE_CENTER.y)
  fallbackWater.visible = showCraterLake.value
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

    const waterGeometry = createEllipseGridGeometry(2.75, 2.0, WATER_RESOLUTION)
    const waterMaterial = new THREE_GPU.MeshStandardNodeMaterial({
      color: 0x2c79a8,
      metalness: 0.72,
      roughness: 0.08,
      transparent: true,
      opacity: 0.86,
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
    waterMesh.position.set(LAKE_CENTER.x, LAKE_LEVEL, LAKE_CENTER.y)
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
  const visible = showCraterLake.value
  if (fallbackWater) {
    fallbackWater.visible = visible
    const uniforms = (fallbackWater.material as THREE.ShaderMaterial).uniforms
    if (uniforms?.time) uniforms.time.value = elapsed * 0.62
  }

  if (
    waterRuntimeFailed ||
    !waterRenderer ||
    !waterScene ||
    !camera ||
    !waterMesh ||
    !waterComputeAtoB ||
    !waterComputeBtoA
  ) return

  try {
    waterMesh.visible = visible
    if (!visible) {
      waterRenderer.render(waterScene, camera)
      return
    }

    waterFrameCounter++
    const pulse = Math.pow(Math.max(0, Math.sin(elapsed * 2.2)), 14)
    if (waterImpactPos && waterImpactPower) {
      waterImpactPos.value.set(Math.sin(elapsed * 0.72) * 0.45, Math.cos(elapsed * 0.53) * 0.24)
      waterImpactPower.value = 0.28 + pulse * 0.75
    }

    if (waterFrameCounter % 2 === 0) {
      if (waterPingPong === 0) {
        waterRenderer.compute(waterComputeAtoB, [4, 4, 1])
        waterReadFromA.value = 0
      } else {
        waterRenderer.compute(waterComputeBtoA, [4, 4, 1])
        waterReadFromA.value = 1
      }
      waterPingPong = 1 - waterPingPong
    }
    waterRenderer.render(waterScene, camera)
  } catch (error) {
    // Compute Water 属于增强层。运行时失败时只关闭该层，不能影响主火山模型。
    console.warn('WebGPU Compute Water 运行失败，已切换到 Three.js Water：', error)
    destroyComputeWater()
    waterRuntimeFailed = true
    createFallbackWater()
    resizeThreeSceneNow(true)
  }
}

function updateModelState(elapsed: number) {
  const factor = eruptionFactor.value
  const pulse = 0.5 + Math.sin(elapsed * (2.2 + factor * 2.8)) * 0.5
  const showInternal = showInternalStructure.value

  if (magmaChamber) {
    magmaChamber.visible = showInternal
    const scalePulse = 1 + factor * 0.035 + pulse * factor * 0.018
    magmaChamber.scale.set(1.45 * scalePulse, 0.96 * scalePulse, 0.78 * scalePulse)
  }
  if (conduitMesh) conduitMesh.visible = showInternal
  if (lateralDikeMesh) lateralDikeMesh.visible = showInternal

  if (lavaFlowMesh) {
    lavaFlowMesh.visible = progress.value >= 44
    const mat = lavaFlowMesh.material as THREE.ShaderMaterial
    mat.uniforms.opacityValue.value = THREE.MathUtils.clamp((progress.value - 42) / 20, 0.12, 0.98)
  }
  if (fissureMesh) {
    fissureMesh.visible = progress.value >= 28
    const mat = fissureMesh.material as THREE.ShaderMaterial
    mat.uniforms.opacityValue.value = THREE.MathUtils.clamp((progress.value - 26) / 18, 0.1, 0.96)
  }
  if (craterGlowMesh) {
    craterGlowMesh.visible = factor > 0.05
    craterGlowMesh.scale.setScalar(0.92 + factor * 0.16 + pulse * factor * 0.05)
  }

  lavaMaterials.forEach((material) => {
    material.uniforms.time.value = elapsed * (0.75 + factor * 1.35)
  })

  if (modelGroup) {
    modelGroup.traverse((object) => {
      if (object instanceof THREE.PointLight && object.userData.baseIntensity) {
        object.intensity = showInternal ? object.userData.baseIntensity * (0.72 + factor * 0.9 + pulse * 0.25) : 0
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
  const distance = Math.max(distanceForHeight, distanceForWidth) * 1.14

  const direction = new THREE.Vector3(1, 0.56, 1).normalize()
  const target = center.clone().add(new THREE.Vector3(0, 0.28, 0.28))
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
    position: new THREE.Vector3(11.4, 7.1, 12.2),
    target: new THREE.Vector3(0, 0.4, 0.35),
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
    progress.value = 0
    isPlaying.value = false
  }
}

async function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = null

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

  await initComputeWater()
  await nextTick()
  await waitForSceneHostSize(8)
  resizeThreeSceneNow(true)

  lastFrameTime = performance.now()
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
}

watch(showCraterLake, (value) => {
  if (lakeProxyMesh) lakeProxyMesh.visible = value
  if (fallbackWater) fallbackWater.visible = value
  if (waterMesh) waterMesh.visible = value
})

function resetControls() {
  setAllCollapsed(false)
  resetWidths()
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
  magmaChamber = null
  conduitMesh = null
  lateralDikeMesh = null
  lavaFlowMesh = null
  fissureMesh = null
  craterGlowMesh = null
  lakeProxyMesh = null
  ashPoints = null
  bombPoints = null
  mainLight = null
  fillLight = null
}

onMounted(async () => {
  await nextTick()
  await initScene()
  timelineAnimationFrameId = requestAnimationFrame(animateTimeline)
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.volcano-container .workspace.panel-resizing,
.volcano-container .workspace.layout-resizing,
.volcano-container .workspace.panel-resizing .side-panel,
.volcano-container .workspace.layout-resizing .side-panel,
.volcano-container .workspace.panel-resizing .center-stage,
.volcano-container .workspace.layout-resizing .center-stage {
  transition: none !important;
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
  top: clamp(14px, 1.1vw, 18px);
  right: clamp(14px, 1.1vw, 18px);
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
  min-height: 24px;
  padding: 4px 8px;
  color: #f7fbff;
  font-size: clamp(12px, 0.95vw, 16px);
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.86),
    1px -1px 0 rgba(0, 0, 0, 0.86),
    -1px 1px 0 rgba(0, 0, 0, 0.86),
    1px 1px 0 rgba(0, 0, 0, 0.86),
    0 2px 5px rgba(0, 0, 0, 0.78);
}

.volcano-label span::before {
  width: 7px;
  height: 7px;
  margin-right: 6px;
  content: '';
  background: rgba(234, 245, 250, 0.92);
  border: 2px solid rgba(22, 35, 42, 0.85);
  border-radius: 50%;
}

.volcano-label.active span {
  color: #ff6a1a;
}

.volcano-label.active span::before {
  background: #ff6a1a;
}

.volcano-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.selected-structure-card {
  margin-top: clamp(10px, 0.9vw, 14px);
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

.principle-flow p + p,
.collapse-content p + p {
  margin-top: 8px;
}

.simulation-note {
  color: rgba(242, 203, 128, 0.88) !important;
}



@media (max-width: 900px) {
  .stage-structure-legend {
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
