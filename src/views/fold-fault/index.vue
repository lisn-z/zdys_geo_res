<template>
  <div ref="pageRef" class="fold-fault-container geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">褶皱断层</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="panelsVisible = !panelsVisible">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlCardCollapsed"
        class="fold-fault-floating-card fold-fault-control-card" title="模型控制" subtitle="切换地质构造并控制形成过程" variant="control"
        :initial-top="92" :initial-right="18" :initial-collapsed="true" :min-width="320" :min-height="320">
        <div class="floating-card-body">

          <section class="geo-card control-section">
            <h3 class="section-title">构造类型</h3>
            <div class="option-grid mode-option-grid">
              <button v-for="item in modeOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: activeMode === item.value }" @click="switchMode(item.value)">
                {{ item.label }}
              </button>
            </div>
          </section>

          <section v-if="activeMode === 'fold'" class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">挤压强度</h3>
              <strong class="control-value">{{ Math.round(compressionStrength * 100) }}%</strong>
            </div>
            <el-slider v-model="compressionPercent" :min="0" :max="100" :step="1" :show-tooltip="false"
              @input="onManualFoldControl('compression')" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">侵蚀强度</span>
              <strong class="control-value">{{ Math.round(erosionStrength * 100) }}%</strong>
            </div>
            <el-slider v-model="erosionPercent" :min="0" :max="100" :step="1" :show-tooltip="false"
              @input="onManualFoldControl('erosion')" />

            <h3 class="section-title fold-preset-title">过程预设</h3>
            <div class="option-grid fold-preset-grid">
              <button v-for="item in foldPresets" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: foldPreset === item.value }" @click="applyFoldPreset(item.value)">
                {{ item.label }}
              </button>
            </div>
          </section>

          <section v-else class="geo-card control-section">
            <h3 class="section-title">断层类型</h3>
            <div class="option-grid fault-type-grid">
              <button v-for="item in faultTypeOptions" :key="item.value" type="button"
                class="theme-btn option-btn fault-type-btn" :class="{ active: faultType === item.value }"
                @click="setFaultType(item.value)">
                {{ item.label }}
              </button>
            </div>

            <div class="section-title-row fault-slider-title">
              <span class="mini-control-label">断层错动量</span>
              <strong class="control-value">{{ Math.round(faultDisplacement * 100) }}%</strong>
            </div>
            <el-slider v-model="faultDisplacementPercent" :min="0" :max="100" :step="1" :show-tooltip="false"
              @input="onManualFaultControl" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">断层面倾角（正视）</span>
              <strong class="control-value">{{ Math.round(faultDip) }}°</strong>
            </div>
            <el-slider v-model="faultDip" :min="45" :max="80" :step="1" :show-tooltip="false" />

          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">辅助显示</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>构造标注</strong>
                <span>显示背斜、向斜或断层盘标注</span>
              </div>
              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>受力箭头</strong>
                <span>显示挤压力或断层相对运动方向</span>
              </div>
              <el-switch v-model="showForceArrows" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>自动旋转</strong>
                <span>轻微旋转模型观察立体结构</span>
              </div>
              <el-switch v-model="autoRotate" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>
            <div class="option-grid view-option-grid">
              <button v-for="item in viewOptions" :key="item.value" type="button"
                class="theme-btn option-btn view-option-btn" :class="{ active: currentView === item.value }"
                @click="setView(item.value)">
                {{ item.label }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn reset-full-btn" @click="resetControls">
              恢复默认参数
            </button>
          </section>
        </div>

      </FloatingFeatureCard>

      <section class="center-stage">
        <div class="stage-content fold-stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <section class="stage-stratum-legend" aria-label="岩层图例">
            <h3>岩层图例</h3>
            <div class="stage-stratum-legend-list">
              <div v-for="item in rockLegend" :key="item.label" class="stage-stratum-legend-item">
                <span class="stage-stratum-swatch" :style="{ backgroundColor: item.color }"></span>
                <div>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.note }}</small>
                </div>
              </div>
            </div>
          </section>

          <div class="stage-mode-chip">
            <strong>{{ activeMode === 'fold' ? '褶皱形成演示' : '断层错动演示' }}</strong>
            <span>{{ activeMode === 'fault' ? '正视查看倾角 · 拖动旋转 · 点击岩层查看数据' : '拖动旋转 · 滚轮缩放 · 点击岩层查看数据' }}</span>
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
              <span>{{ activeMode === 'fold' ? '褶皱—侵蚀演示进度' : '断层错动演示进度' }}</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider v-model="progress" :min="0" :max="100" :step="1" :show-tooltip="false"
              @input="onTimelineInput" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="dataCardCollapsed"
        class="fold-fault-floating-card fold-fault-data-card" title="实时数据"
        :subtitle="activeMode === 'fold' ? '褶皱形态与侵蚀结果' : '断层位移与构造判读'" variant="data" :initial-top="164"
        :initial-right="18" :initial-collapsed="true" :min-width="300" :min-height="260">
        <div class="floating-card-body">

          <div class="data-panel-intro">
            <span class="data-live-dot" aria-hidden="true"></span>
            <span>模型参数实时同步</span>
            <span class="data-panel-mode">{{ activeMode === 'fold' ? '褶皱分析' : '断层分析' }}</span>
          </div>

          <div class="data-grid">
            <article v-for="(item, index) in dataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <div class="data-card-heading">
                <span class="data-card-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
              <div v-if="item.meter !== undefined" class="data-card-meter" aria-hidden="true">
                <i :style="{ width: `${item.meter}%` }"></i>
              </div>
            </article>
          </div>

          <section class="geo-card selected-feature-card">
            <div class="selected-feature-heading">
              <span>当前选中</span>
              <small>点击模型查看岩层</small>
            </div>
            <strong class="selected-feature-title">{{ selectedFeature.title }}</strong>
            <p>{{ selectedFeature.description }}</p>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="形成机制" name="mechanism">
              <div class="collapse-content">
                <p>{{ mechanismText }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="判读要点" name="recognition">
              <div class="collapse-content recognition-list">
                <p v-for="item in recognitionPoints" :key="item">• {{ item }}</p>
              </div>
            </el-collapse-item>

          </el-collapse>
        </div>

      </FloatingFeatureCard>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type StructureMode = 'fold' | 'fault'
type FoldPreset = 'flat' | 'gentle' | 'tight' | 'eroded'
type FaultType = 'normal' | 'reverse' | 'strike'
type ViewType = 'perspective' | 'front' | 'top'

type FeatureInfo = {
  title: string
  description: string
}

type DataCardInfo = {
  label: string
  value: string
  description: string
  className: string
  meter?: number
}

const panelsVisible = ref(true)
const controlCardCollapsed = ref(true)
const dataCardCollapsed = ref(true)

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

const modeOptions: Array<{ label: string; value: StructureMode }> = [
  { label: '褶皱', value: 'fold' },
  { label: '断层', value: 'fault' },
]

const foldPresets: Array<{ label: string; value: FoldPreset }> = [
  { label: '水平岩层', value: 'flat' },
  { label: '平缓褶皱', value: 'gentle' },
  { label: '紧闭褶皱', value: 'tight' },
  { label: '侵蚀后', value: 'eroded' },
]

const faultTypeOptions: Array<{ label: string; value: FaultType }> = [
  { label: '正断层', value: 'normal' },
  { label: '逆断层', value: 'reverse' },
  { label: '平移断层', value: 'strike' },
]

const viewOptions: Array<{ label: string; value: ViewType }> = [
  { label: '斜视', value: 'perspective' },
  { label: '正视', value: 'front' },
  { label: '俯视', value: 'top' },
]

const speedOptions = [0.5, 1, 2]

const rockLegend = [
  { label: '表层（风化层）', color: '#82936a', note: '最上部年轻覆盖层' },
  { label: '浅色岩层', color: '#c0b8a8', note: '用于观察连续弯曲与错断' },
  { label: '砂泥质层', color: '#a68e79', note: '中部标志层' },
  { label: '深色岩层', color: '#786458', note: '较老岩层' },
  { label: '基底岩层', color: '#554940', note: '模型底部基底' },
]

const layerThicknesses = [0.55, 0.68, 0.82, 0.94, 2.28]
const layerColors = rockLegend.map((item) => item.color)
const totalRockThickness = layerThicknesses.reduce((sum, value) => sum + value, 0)
const foldBaseLevel = -4.3

const activeMode = ref<StructureMode>('fold')
const faultType = ref<FaultType>('normal')
const currentView = ref<ViewType>('perspective')

const compressionStrength = ref(0)
const erosionStrength = ref(0)
const faultDisplacement = ref(0)
const faultDip = ref(62)

const foldPreset = computed<FoldPreset | null>(() => {
  const compression = compressionStrength.value
  const erosion = erosionStrength.value
  if (compression < 0.005 && erosion < 0.005) return 'flat'
  if (Math.abs(compression - 0.45) < 0.005 && erosion < 0.005) return 'gentle'
  if (compression > 0.995 && erosion < 0.005) return 'tight'
  if (compression > 0.995 && erosion > 0.995) return 'eroded'
  return null
})

const showLabels = ref(true)
const showForceArrows = ref(true)
const autoRotate = ref(false)

const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(false)

const activePanels = ref(['mechanism', 'recognition'])

const selectedFeature = ref<FeatureInfo>({
  title: '整体模型',
  description: '点击中间模型中的岩层或断块，可在这里查看对应的构造信息。',
})

const compressionPercent = computed({
  get: () => Math.round(compressionStrength.value * 100),
  set: (value: number) => {
    compressionStrength.value = value / 100
  },
})

const erosionPercent = computed({
  get: () => Math.round(erosionStrength.value * 100),
  set: (value: number) => {
    erosionStrength.value = value / 100
  },
})

const faultDisplacementPercent = computed({
  get: () => Math.round(faultDisplacement.value * 100),
  set: (value: number) => {
    faultDisplacement.value = value / 100
  },
})

const currentStageTitle = computed(() => {
  if (activeMode.value === 'fault') {
    if (faultDisplacement.value < 0.05) return '岩层尚未发生明显错动'
    if (faultDisplacement.value < 0.55) return '断裂面形成并开始相对位移'
    return '断层位移清晰，地层出现错断'
  }

  if (compressionStrength.value < 0.05) return '水平岩层'
  if (compressionStrength.value < 0.55) return '岩层受挤压发生弯曲'
  if (erosionStrength.value < 0.05) return '背斜与向斜形成'
  if (erosionStrength.value < 0.6) return '褶皱顶部开始受侵蚀'
  return '背斜成谷、向斜成山'
})

const faultTypeLabel = computed(() => {
  return faultTypeOptions.find((item) => item.value === faultType.value)?.label || '正断层'
})

const dataCards = computed<DataCardInfo[]>(() => {
  if (activeMode.value === 'fault') {
    return [
      {
        label: '当前构造',
        value: faultTypeLabel.value,
        description: '断层运动类型',
        className: 'cyan-card',
      },
      {
        label: '错动量',
        value: `${Math.round(faultDisplacement.value * 100)}%`,
        description: '模型相对位移程度',
        className: 'blue-card',
        meter: faultDisplacement.value * 100,
      },
      {
        label: '断层倾角',
        value: `${Math.round(faultDip.value)}°`,
        description: '正视时断层面与水平面的夹角',
        className: 'purple-card',
      },
      {
        label: '演示阶段',
        value: faultDisplacement.value < 0.05 ? '未错动' : '已错断',
        description: currentStageTitle.value,
        className: 'orange-card',
      },
    ]
  }

  const foldName = compressionStrength.value < 0.08
    ? '水平岩层'
    : compressionStrength.value < 0.6
      ? '平缓褶皱'
      : '明显褶皱'

  return [
    {
      label: '当前形态',
      value: foldName,
      description: '岩层弯曲程度',
      className: 'cyan-card',
    },
    {
      label: '挤压强度',
      value: `${Math.round(compressionStrength.value * 100)}%`,
      description: '水平挤压作用程度',
      className: 'blue-card',
      meter: compressionStrength.value * 100,
    },
    {
      label: '侵蚀强度',
      value: `${Math.round(erosionStrength.value * 100)}%`,
      description: '顶部差异侵蚀程度',
      className: 'purple-card',
      meter: erosionStrength.value * 100,
    },
    {
      label: '主要构造',
      value: compressionStrength.value < 0.08 ? '未形成' : '背斜 / 向斜',
      description: currentStageTitle.value,
      className: 'orange-card',
    },
  ]
})

const mechanismText = computed(() => {
  if (activeMode.value === 'fault') {
    if (faultType.value === 'normal') {
      return '岩层受张力作用发生断裂后，上盘相对下降、下盘相对上升，形成正断层。模型通过两侧岩层的垂直错动突出标志层在断层两侧的不连续。'
    }
    if (faultType.value === 'reverse') {
      return '岩层受挤压力作用发生断裂后，上盘沿断层面相对上升，形成逆断层。逆断层常与强烈水平挤压、地壳缩短有关。'
    }
    return '岩层沿断裂面发生以水平方向为主的错动，形成平移断层。判断重点是同一标志物或岩层在断层两侧发生水平错开。'
  }

  return '水平岩层受到持续的水平挤压力后发生塑性弯曲，向上拱起形成背斜，向下弯曲形成向斜。差异侵蚀使背斜及两翼被削低，向斜中心保留为相对高地，形成“背斜成谷、向斜成山”的地形倒置。'
})

const recognitionPoints = computed(() => {
  if (activeMode.value === 'fault') {
    if (faultType.value === 'strike') {
      return [
        '先找断裂面，再观察同一岩层或标志线是否发生水平错开。',
        '平移断层的主要位移方向近似平行于断层走向。',
        '判读时不能只看地表高差，还应比较断层两侧对应地层的位置。',
      ]
    }
    return [
      '同一岩层在断裂面两侧发生明显错断，是识别断层的核心依据。',
      '沿倾斜断层面，上方岩块称上盘，下方岩块称下盘。',
      faultType.value === 'normal'
        ? '正断层：上盘相对下降，常与张裂作用有关。'
        : '逆断层：上盘相对上升，常与水平挤压作用有关。',
    ]
  }

  return [
    '背斜岩层向上拱起，中心岩层较老；向斜岩层向下弯曲，中心岩层较新。',
    '判断背斜、向斜应优先看岩层弯曲与新老关系，不能只凭地表是山还是谷。',
    '侵蚀后可能出现“背斜成谷、向斜成山”的地形倒置现象。',
  ]
})

const threeContainerRef = ref<HTMLElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let mainLight: THREE.DirectionalLight | null = null
let sceneAnimationFrameId = 0
let timelineAnimationFrameId = 0
let timelineLastTime = 0
let lastSceneTime = 0

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

let foldGroup: THREE.Group | null = null
let faultGroup: THREE.Group | null = null
let foldLabelGroup: THREE.Group | null = null
let faultLabelGroup: THREE.Group | null = null
let foldArrowGroup: THREE.Group | null = null
let faultArrowGroup: THREE.Group | null = null
let faultPlaneMesh: THREE.Mesh | null = null
let faultTraceMesh: THREE.Mesh | null = null
let faultLeftGroup: THREE.Group | null = null
let faultRightGroup: THREE.Group | null = null

const foldLayerMeshes: THREE.Mesh[] = []
const faultLayerMeshes: THREE.Mesh[] = []
const clickableMeshes: THREE.Object3D[] = []
const sceneMaterials: THREE.Material[] = []
const sceneTextures: THREE.Texture[] = []
let rockTexture: THREE.CanvasTexture | null = null

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let pointerDownX = 0
let pointerDownY = 0

function switchMode(mode: StructureMode) {
  if (activeMode.value === mode) return
  activeMode.value = mode
  progress.value = 0
  isPlaying.value = false
  selectedFeature.value = {
    title: mode === 'fold' ? '整体褶皱模型' : '整体断层模型',
    description: mode === 'fold'
      ? '点击不同岩层可查看岩层连续弯曲与侵蚀出露。'
      : '点击断层两侧岩块可查看断层盘及岩层错断。',
  }
  if (mode === 'fold') {
    compressionStrength.value = 0
    erosionStrength.value = 0
  } else {
    faultDisplacement.value = 0
  }
  updateSceneModeVisibility()
  applyCurrentView()
}

function setFaultType(type: FaultType) {
  faultType.value = type
  isPlaying.value = false
  progress.value = Math.round(faultDisplacement.value * 100)
  selectedFeature.value = {
    title: faultTypeOptions.find((item) => item.value === type)?.label || '断层',
    description: type === 'normal'
      ? '正断层中，上盘相对下降、下盘相对上升。'
      : type === 'reverse'
        ? '逆断层中，上盘相对上升、下盘相对下降。'
        : '平移断层以水平方向错动为主。',
  }
  updateFaultModel()
}

function applyFoldPreset(preset: FoldPreset) {
  isPlaying.value = false
  if (preset === 'flat') {
    compressionStrength.value = 0
    erosionStrength.value = 0
    progress.value = 0
  } else if (preset === 'gentle') {
    compressionStrength.value = 0.45
    erosionStrength.value = 0
    progress.value = 30
  } else if (preset === 'tight') {
    compressionStrength.value = 1
    erosionStrength.value = 0
    progress.value = 65
  } else {
    compressionStrength.value = 1
    erosionStrength.value = 1
    progress.value = 100
  }
  updateFoldModel()
}

function onManualFoldControl(control: 'compression' | 'erosion') {
  isPlaying.value = false
  if (control === 'erosion' && erosionStrength.value > 0) {
    compressionStrength.value = 1
  } else if (control === 'compression' && compressionStrength.value < 1) {
    erosionStrength.value = 0
  }
  if (erosionStrength.value > 0.01) {
    progress.value = 65 + erosionStrength.value * 35
  } else {
    progress.value = compressionStrength.value * 65
  }
  updateFoldModel()
}

function onManualFaultControl() {
  isPlaying.value = false
  progress.value = faultDisplacement.value * 100
  updateFaultModel()
}

function onTimelineInput() {
  isPlaying.value = false
  applyProgressToModel()
}

function togglePlayback() {
  if (!isPlaying.value && progress.value >= 99.9) {
    progress.value = 0
    applyProgressToModel()
  }
  isPlaying.value = !isPlaying.value
}

function applyProgressToModel() {
  if (activeMode.value === 'fold') {
    if (progress.value <= 65) {
      compressionStrength.value = progress.value / 65
      erosionStrength.value = 0
    } else {
      compressionStrength.value = 1
      erosionStrength.value = (progress.value - 65) / 35
    }
    updateFoldModel()
  } else {
    faultDisplacement.value = progress.value / 100
    updateFaultModel()
  }
}

function createRockTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建岩层纹理')
  const image = context.createImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const broad = Math.sin(x * 0.065 + Math.sin(y * 0.027) * 2.1) * Math.cos(y * 0.051)
      const bedding = Math.sin(y * 0.34 + Math.sin(x * 0.035) * 2.2)
      const seed = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      const grain = seed - Math.floor(seed)
      const value = THREE.MathUtils.clamp(Math.round(237 + broad * 8 + bedding * 4 + (grain - 0.5) * 12), 208, 255)
      image.data[index] = value
      image.data[index + 1] = value
      image.data[index + 2] = value
      image.data[index + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  sceneTextures.push(texture)
  return texture
}

function addRockUvs(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = new Float32Array(positions.count * 2)
  for (let index = 0; index < positions.count; index += 3) {
    const x = [positions.getX(index), positions.getX(index + 1), positions.getX(index + 2)]
    const y = [positions.getY(index), positions.getY(index + 1), positions.getY(index + 2)]
    const z = [positions.getZ(index), positions.getZ(index + 1), positions.getZ(index + 2)]
    const xSpan = Math.max(...x) - Math.min(...x)
    const ySpan = Math.max(...y) - Math.min(...y)
    const zSpan = Math.max(...z) - Math.min(...z)
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = index + corner
      const u = zSpan < 0.001 ? x[corner] : xSpan < 0.001 ? z[corner] : x[corner]
      const v = zSpan < 0.001 || xSpan < 0.001 ? y[corner] : z[corner]
      uv[vertex * 2] = u! / 2.8
      uv[vertex * 2 + 1] = v! / 1.8
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

function createMaterial(color: string) {
  // 图例和岩层使用同一套低饱和度色值，细纹理只增加岩石质感。
  const material = new THREE.MeshStandardMaterial({
    color,
    map: rockTexture,
    emissive: color,
    emissiveIntensity: 0.1,
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  sceneMaterials.push(material)
  return material
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function createTextSprite(text: string, accent = '#2ec4b6') {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建文字纹理')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  roundedRectPath(ctx, 18, 22, 604, 156, 18)
  ctx.fillStyle = 'rgba(16, 27, 32, 0.86)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = accent
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 58px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.fillText(text, 320, 103)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  sceneTextures.push(texture)

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  sceneMaterials.push(material)

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(2.25, 0.7, 1)
  sprite.renderOrder = 10
  return sprite
}

function foldWaveAt(rawX: number) {
  const amplitude = 1.85 * Math.pow(compressionStrength.value, 0.88)
  return amplitude * Math.cos(((rawX + 4) * Math.PI) / 4)
}

function foldOriginalSurfaceAt(rawX: number) {
  return 1.35 + foldWaveAt(rawX)
}

function foldErosionSurfaceAt(rawX: number) {
  const original = foldOriginalSurfaceAt(rawX)
  if (erosionStrength.value <= 0) return original

  const amplitude = 1.85 * Math.pow(compressionStrength.value, 0.88)
  const wave = foldWaveAt(rawX)
  // 背斜核部和两翼侵蚀更强，向斜核部保留为地形高点。
  const positionAcrossFold = amplitude > 0.001
    ? THREE.MathUtils.clamp((wave / amplitude + 1) / 2, 0, 1)
    : 0
  const erosionDepth = erosionStrength.value * (
    0.18 + 2.6 * amplitude * Math.pow(positionAcrossFold, 0.9)
  )

  return original - erosionDepth
}

function getLayerBounds(layerIndex: number, rawX: number) {
  const surface = foldOriginalSurfaceAt(rawX)
  const erosionSurface = foldErosionSurfaceAt(rawX)
  let topOffset = 0
  for (let i = 0; i < layerIndex; i += 1) topOffset += layerThicknesses[i] ?? 0
  const bottomOffset = topOffset + (layerThicknesses[layerIndex] ?? 0)

  const originalTop = surface - topOffset
  // 基底底面保持平直，让褶皱岩层嵌在完整的地质剖块中。
  const originalBottom = layerIndex === layerThicknesses.length - 1
    ? foldBaseLevel
    : surface - bottomOffset
  const visibleTop = Math.min(originalTop, erosionSurface)
  const visibleBottom = Math.min(originalBottom, erosionSurface)

  return {
    top: visibleTop,
    bottom: visibleBottom,
  }
}

function addQuad(
  positions: number[],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
) {
  positions.push(
    ...a, ...b, ...c,
    ...a, ...c, ...d,
  )
}

function buildFoldLayerGeometry(layerIndex: number) {
  const samples = 92
  const rawHalfWidth = 7.6
  const depth = 5.2
  const zFront = depth / 2
  const zBack = -depth / 2
  const compressionScale = 1 - compressionStrength.value * 0.12
  const positions: number[] = []

  for (let i = 0; i < samples; i += 1) {
    const rawX0 = -rawHalfWidth + (i / samples) * rawHalfWidth * 2
    const rawX1 = -rawHalfWidth + ((i + 1) / samples) * rawHalfWidth * 2
    const x0 = rawX0 * compressionScale
    const x1 = rawX1 * compressionScale
    const b0 = getLayerBounds(layerIndex, rawX0)
    const b1 = getLayerBounds(layerIndex, rawX1)
    if (b0.top - b0.bottom < 0.001 && b1.top - b1.bottom < 0.001) continue

    addQuad(
      positions,
      [x0, b0.top, zFront],
      [x1, b1.top, zFront],
      [x1, b1.top, zBack],
      [x0, b0.top, zBack],
    )
    addQuad(
      positions,
      [x0, b0.bottom, zBack],
      [x1, b1.bottom, zBack],
      [x1, b1.bottom, zFront],
      [x0, b0.bottom, zFront],
    )
    addQuad(
      positions,
      [x0, b0.top, zFront],
      [x0, b0.bottom, zFront],
      [x1, b1.bottom, zFront],
      [x1, b1.top, zFront],
    )
    addQuad(
      positions,
      [x1, b1.top, zBack],
      [x1, b1.bottom, zBack],
      [x0, b0.bottom, zBack],
      [x0, b0.top, zBack],
    )
  }

  const leftRawX = -rawHalfWidth
  const rightRawX = rawHalfWidth
  const leftX = leftRawX * compressionScale
  const rightX = rightRawX * compressionScale
  const leftBounds = getLayerBounds(layerIndex, leftRawX)
  const rightBounds = getLayerBounds(layerIndex, rightRawX)

  addQuad(
    positions,
    [leftX, leftBounds.top, zBack],
    [leftX, leftBounds.bottom, zBack],
    [leftX, leftBounds.bottom, zFront],
    [leftX, leftBounds.top, zFront],
  )
  addQuad(
    positions,
    [rightX, rightBounds.top, zFront],
    [rightX, rightBounds.bottom, zFront],
    [rightX, rightBounds.bottom, zBack],
    [rightX, rightBounds.top, zBack],
  )

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  addRockUvs(geometry)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createFoldModel() {
  if (!scene) return
  foldGroup = new THREE.Group()
  foldGroup.name = 'fold-model'
  foldGroup.position.y = 0.78
  scene.add(foldGroup)

  layerColors.forEach((color, index) => {
    const geometry = buildFoldLayerGeometry(index)
    const material = createMaterial(color)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData.feature = {
      title: rockLegend[index]!.label,
      description: `这是${rockLegend[index]!.label}。在褶皱形成过程中，同一岩层应保持连续弯曲；若发生断层，则同一标志层会在断裂面两侧错开。`,
    } satisfies FeatureInfo
    foldLayerMeshes.push(mesh)
    clickableMeshes.push(mesh)
    foldGroup?.add(mesh)
  })

  foldLabelGroup = new THREE.Group()
  const anticlineLeft = createTextSprite('背斜', '#a8bd8a')
  const syncline = createTextSprite('向斜', '#a8c7d1')
  const anticlineRight = createTextSprite('背斜', '#a8bd8a')
  anticlineLeft.userData.rawX = -4
  syncline.userData.rawX = 0
  anticlineRight.userData.rawX = 4
  foldLabelGroup.add(anticlineLeft, syncline, anticlineRight)
  foldGroup.add(foldLabelGroup)

  foldArrowGroup = new THREE.Group()
  const leftArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-10.2, 0.7, 0),
    2.3,
    0xff9f43,
    0.65,
    0.34,
  )
  const rightArrow = new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(10.2, 0.7, 0),
    2.3,
    0xff9f43,
    0.65,
    0.34,
  )
  foldArrowGroup.add(leftArrow, rightArrow)
  foldGroup.add(foldArrowGroup)

  updateFoldModel()
}

function updateFoldLabels() {
  if (!foldLabelGroup) return
  foldLabelGroup.visible = showLabels.value
  foldLabelGroup.children.forEach((child) => {
    const rawX = Number(child.userData.rawX || 0)
    const x = rawX * (1 - compressionStrength.value * 0.12)
    const surface = foldErosionSurfaceAt(rawX)
    child.position.set(x, surface + 0.72, 2.9)
  })
}

function updateFoldModel() {
  if (!foldGroup) return

  foldLayerMeshes.forEach((mesh, index) => {
    const oldGeometry = mesh.geometry as THREE.BufferGeometry
    const newGeometry = buildFoldLayerGeometry(index)
    mesh.geometry = newGeometry
    oldGeometry.dispose()
  })

  foldGroup.visible = activeMode.value === 'fold'
  if (foldArrowGroup) {
    foldArrowGroup.visible = showForceArrows.value && compressionStrength.value < 0.98
  }
  updateFoldLabels()
}

function faultPlaneX(y: number) {
  // 断层倾角定义为断层面与水平面的夹角，向右倾的上盘位于右侧。
  return -y / Math.tan(THREE.MathUtils.degToRad(faultDip.value))
}

function buildFaultLayerGeometry(layerIndex: number, side: 'left' | 'right', verticalOffset: number) {
  const halfWidth = 7.24
  const halfDepth = 2.6
  const faultGap = 0.1
  const bottom = -totalRockThickness / 2 + layerThicknesses
    .slice(layerIndex + 1)
    .reduce((sum, thickness) => sum + thickness, 0)
  const top = bottom + layerThicknesses[layerIndex]!
  const cutAtTop = faultPlaneX(top + verticalOffset) + (side === 'left' ? -faultGap / 2 : faultGap / 2)
  const cutAtBottom = faultPlaneX(bottom + verticalOffset) + (side === 'left' ? -faultGap / 2 : faultGap / 2)
  const leftTop = side === 'left' ? -halfWidth : cutAtTop
  const rightTop = side === 'left' ? cutAtTop : halfWidth
  const leftBottom = side === 'left' ? -halfWidth : cutAtBottom
  const rightBottom = side === 'left' ? cutAtBottom : halfWidth
  const positions: number[] = []

  addQuad(positions,
    [leftTop, top, halfDepth], [rightTop, top, halfDepth],
    [rightTop, top, -halfDepth], [leftTop, top, -halfDepth])
  addQuad(positions,
    [leftBottom, bottom, -halfDepth], [rightBottom, bottom, -halfDepth],
    [rightBottom, bottom, halfDepth], [leftBottom, bottom, halfDepth])
  addQuad(positions,
    [leftBottom, bottom, halfDepth], [rightBottom, bottom, halfDepth],
    [rightTop, top, halfDepth], [leftTop, top, halfDepth])
  addQuad(positions,
    [rightBottom, bottom, -halfDepth], [leftBottom, bottom, -halfDepth],
    [leftTop, top, -halfDepth], [rightTop, top, -halfDepth])
  addQuad(positions,
    [leftBottom, bottom, -halfDepth], [leftBottom, bottom, halfDepth],
    [leftTop, top, halfDepth], [leftTop, top, -halfDepth])
  addQuad(positions,
    [rightBottom, bottom, halfDepth], [rightBottom, bottom, -halfDepth],
    [rightTop, top, -halfDepth], [rightTop, top, halfDepth])

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  addRockUvs(geometry)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createFaultBlock(side: 'left' | 'right') {
  const group = new THREE.Group()
  layerThicknesses.forEach((_, layerIndex) => {
    const geometry = buildFaultLayerGeometry(layerIndex, side, 0)
    const material = createMaterial(layerColors[layerIndex]!)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.userData.layerIndex = layerIndex
    mesh.userData.side = side
    mesh.userData.feature = {
      title: `${side === 'left' ? '左侧' : '右侧'} · ${rockLegend[layerIndex]!.label}`,
      description: `断层发生后，观察这条${rockLegend[layerIndex]!.label}在断层两侧是否还能连续对应，即可判断岩层的相对错动。`,
    } satisfies FeatureInfo
    faultLayerMeshes.push(mesh)
    clickableMeshes.push(mesh)
    group.add(mesh)
  })

  return group
}

function faultVerticalRange() {
  const halfThickness = totalRockThickness / 2
  const leftOffset = faultLeftGroup?.position.y ?? 0
  const rightOffset = faultRightGroup?.position.y ?? 0
  return {
    bottom: Math.min(leftOffset, rightOffset) - halfThickness - 0.08,
    top: Math.max(leftOffset, rightOffset) + halfThickness + 0.08,
  }
}

function buildFaultPlaneGeometry() {
  const depth = 5.2
  const { bottom, top } = faultVerticalRange()
  const positions = [
    faultPlaneX(bottom), bottom, -depth / 2,
    faultPlaneX(top), top, -depth / 2,
    faultPlaneX(top), top, depth / 2,
    faultPlaneX(bottom), bottom, depth / 2,
  ]
  const indices = [0, 1, 2, 0, 2, 3]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function refreshFaultPlaneGeometry() {
  if (!faultPlaneMesh) return
  const oldPlaneGeometry = faultPlaneMesh.geometry as THREE.BufferGeometry
  const newGeometry = buildFaultPlaneGeometry()
  faultPlaneMesh.geometry = newGeometry
  oldPlaneGeometry.dispose()
  if (faultTraceMesh) {
    const oldTraceGeometry = faultTraceMesh.geometry as THREE.BufferGeometry
    faultTraceMesh.geometry = buildFaultTraceGeometry()
    oldTraceGeometry.dispose()
  }
}

function buildFaultTraceGeometry() {
  const { bottom, top } = faultVerticalRange()
  const front = 2.66
  const curve = new THREE.LineCurve3(
    new THREE.Vector3(faultPlaneX(bottom), bottom, front),
    new THREE.Vector3(faultPlaneX(top), top, front),
  )
  return new THREE.TubeGeometry(curve, 1, 0.045, 6, false)
}

function createFaultModel() {
  if (!scene) return
  faultGroup = new THREE.Group()
  faultGroup.name = 'fault-model'
  faultGroup.position.y = 0.5
  scene.add(faultGroup)

  faultLeftGroup = createFaultBlock('left')
  faultRightGroup = createFaultBlock('right')
  faultGroup.add(faultLeftGroup, faultRightGroup)

  const planeGeometry = buildFaultPlaneGeometry()
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x71d9ef,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  sceneMaterials.push(planeMaterial)
  faultPlaneMesh = new THREE.Mesh(planeGeometry, planeMaterial)
  faultGroup.add(faultPlaneMesh)

  const traceMaterial = new THREE.MeshBasicMaterial({ color: 0x71d9ef, toneMapped: false })
  sceneMaterials.push(traceMaterial)
  faultTraceMesh = new THREE.Mesh(buildFaultTraceGeometry(), traceMaterial)
  faultGroup.add(faultTraceMesh)

  faultLabelGroup = new THREE.Group()
  const footwallLabel = createTextSprite('下盘', '#2ec4b6')
  const hangingWallLabel = createTextSprite('上盘', '#ff9f43')
  const leftRockLabel = createTextSprite('左侧岩块', '#2ec4b6')
  const rightRockLabel = createTextSprite('右侧岩块', '#ff9f43')
  footwallLabel.scale.set(2.05, 0.65, 1)
  hangingWallLabel.scale.set(2.05, 0.65, 1)
  leftRockLabel.scale.set(2.5, 0.65, 1)
  rightRockLabel.scale.set(2.5, 0.65, 1)
  footwallLabel.position.set(-3.7, 3.15, 2.95)
  hangingWallLabel.position.set(3.7, 3.15, 2.95)
  leftRockLabel.visible = false
  rightRockLabel.visible = false
  faultLabelGroup.add(footwallLabel, hangingWallLabel, leftRockLabel, rightRockLabel)
  faultGroup.add(faultLabelGroup)

  faultArrowGroup = new THREE.Group()
  faultGroup.add(faultArrowGroup)
  rebuildFaultArrows()
  updateFaultModel()
}

function rebuildFaultArrows() {
  if (!faultArrowGroup) return
  while (faultArrowGroup.children.length) {
    const child = faultArrowGroup.children[0]
    if (!child) break
    faultArrowGroup.remove(child)
    disposeObject(child)
  }

  const displacement = 1.75
  if (faultType.value === 'strike') {
    const leftArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-3.5, 2.6, -3.5),
      displacement,
      0x2ec4b6,
      0.55,
      0.28,
    )
    const rightArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(3.5, 2.6, 3.5),
      displacement,
      0xff9f43,
      0.55,
      0.28,
    )
    faultArrowGroup.add(leftArrow, rightArrow)
  } else {
    const rightDirection = faultType.value === 'normal' ? -1 : 1
    const leftArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -rightDirection, 0),
      new THREE.Vector3(-3.8, 2.3 - rightDirection * 0.2, 3.15),
      displacement,
      0x2ec4b6,
      0.55,
      0.28,
    )
    const rightArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, rightDirection, 0),
      new THREE.Vector3(3.8, 2.3 + rightDirection * 0.2, 3.15),
      displacement,
      0xff9f43,
      0.55,
      0.28,
    )
    faultArrowGroup.add(leftArrow, rightArrow)
  }
}

function updateFaultModel() {
  if (!faultGroup || !faultLeftGroup || !faultRightGroup) return
  const amount = faultDisplacement.value * 2.15

  faultLeftGroup.position.set(0, 0, 0)
  faultRightGroup.position.set(0, 0, 0)

  if (faultType.value === 'normal') {
    faultLeftGroup.position.y = amount * 0.42
    faultRightGroup.position.y = -amount * 0.58
  } else if (faultType.value === 'reverse') {
    faultLeftGroup.position.y = -amount * 0.42
    faultRightGroup.position.y = amount * 0.58
  } else {
    faultLeftGroup.position.z = amount * 0.62
    faultRightGroup.position.z = -amount * 0.62
  }

  // 每层内侧切面按当前世界高度取断层面位置，位移后仍与标注倾角重合。
  faultLayerMeshes.forEach((mesh) => {
    const side = mesh.userData.side as 'left' | 'right'
    const verticalOffset = side === 'left' ? faultLeftGroup!.position.y : faultRightGroup!.position.y
    const oldGeometry = mesh.geometry as THREE.BufferGeometry
    mesh.geometry = buildFaultLayerGeometry(mesh.userData.layerIndex as number, side, verticalOffset)
    oldGeometry.dispose()
  })
  refreshFaultPlaneGeometry()

  if (faultLabelGroup) {
    faultLabelGroup.visible = showLabels.value
    const footwallLabel = faultLabelGroup.children[0]
    const hangingWallLabel = faultLabelGroup.children[1]
    const leftRockLabel = faultLabelGroup.children[2]
    const rightRockLabel = faultLabelGroup.children[3]

    if (footwallLabel && hangingWallLabel && leftRockLabel && rightRockLabel) {
      const isStrikeSlip = faultType.value === 'strike'
      footwallLabel.visible = !isStrikeSlip
      hangingWallLabel.visible = !isStrikeSlip
      leftRockLabel.visible = isStrikeSlip
      rightRockLabel.visible = isStrikeSlip

      if (isStrikeSlip) {
        leftRockLabel.position.set(-3.7, 3.15, 3.1 + faultLeftGroup.position.z)
        rightRockLabel.position.set(3.7, 3.15, 3.1 + faultRightGroup.position.z)
      } else {
        footwallLabel.position.set(-3.7, 3.15 + faultLeftGroup.position.y, 2.95)
        hangingWallLabel.position.set(3.7, 3.15 + faultRightGroup.position.y, 2.95)
      }
    }
  }

  if (faultArrowGroup) {
    faultArrowGroup.visible = showForceArrows.value
  }
  if (faultPlaneMesh) faultPlaneMesh.visible = true
  faultGroup.visible = activeMode.value === 'fault'
}

function updateSceneModeVisibility() {
  if (foldGroup) foldGroup.visible = activeMode.value === 'fold'
  if (faultGroup) faultGroup.visible = activeMode.value === 'fault'
  if (activeMode.value === 'fold') updateFoldModel()
  else updateFaultModel()
}

function setView(view: ViewType) {
  currentView.value = view
  applyCurrentView()
}

function applyCurrentView() {
  if (!camera || !orbitControls) return
  camera.up.set(0, 1, 0)

  if (currentView.value === 'front') {
    camera.position.set(0, 0.5, 28)
    orbitControls.target.set(0, 0.5, 0)
  } else if (currentView.value === 'top') {
    camera.position.set(0.01, 28, 0.01)
    camera.up.set(0, 0, -1)
    orbitControls.target.set(0, 0.1, 0)
  } else {
    camera.position.set(15.4, 10.5, 22.5)
    orbitControls.target.set(0, 0.1, 0)
  }

  camera.lookAt(orbitControls.target)
  orbitControls.update()
  renderOnce()
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return false

  const rect = container.getBoundingClientRect()
  const width = Math.round(rect.width || container.clientWidth)
  const height = Math.round(rect.height || container.clientHeight)

  /*
   * 首次挂载时 CSS Grid / 面板布局可能还没有完成。
   * 不能把 0×0 强行改成 1×1 并缓存，否则看起来就像模型没有创建。
   */
  if (width < 8 || height < 8) {
    return false
  }

  if (width === lastSceneWidth && height === lastSceneHeight) {
    return true
  }

  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderOnce()
  return true
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return

    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeThreeSceneNow()
      })
    })
  }, delay)
}

function renderOnce() {
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function onPointerDown(event: PointerEvent) {
  pointerDownX = event.clientX
  pointerDownY = event.clientY
}

function onPointerUp(event: PointerEvent) {
  if (!renderer || !camera) return
  if (Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > 6) return

  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const targets = activeMode.value === 'fold'
    ? foldLayerMeshes
    : faultLayerMeshes
  const intersections = raycaster.intersectObjects(targets, false)
  const hit = intersections[0]?.object
  if (hit?.userData.feature) {
    selectedFeature.value = hit.userData.feature as FeatureInfo
  }
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)
  camera.position.set(15.4, 10.5, 22.5)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x061526, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = false
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.enablePan = false
  orbitControls.minDistance = 10
  orbitControls.maxDistance = 42
  orbitControls.minPolarAngle = 0.08
  orbitControls.maxPolarAngle = Math.PI * 0.88
  orbitControls.target.set(0, 0.1, 0)
  orbitControls.update()

  const hemisphereLight = new THREE.HemisphereLight(0xf2eee7, 0x353a39, 1.35)
  scene.add(hemisphereLight)

  mainLight = new THREE.DirectionalLight(0xfff3e2, 1.5)
  mainLight.position.set(8, 13, 10)
  scene.add(mainLight)

  const rimLight = new THREE.DirectionalLight(0xd5e3e7, 0.4)
  rimLight.position.set(-10, 6, -8)
  scene.add(rimLight)

  rockTexture = createRockTexture()
  createFoldModel()
  createFaultModel()
  updateSceneModeVisibility()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)

  lastSceneWidth = 0
  lastSceneHeight = 0
  resizeThreeSceneNow()
  scheduleSceneResize(0)

  /*
   * 公共面板 Hook 与 CSS Grid 都可能在 mounted 后继续完成一轮布局。
   * 再补两次稳定校准，确保进入页面时 WebGL 一定拿到真实尺寸。
   */
  window.setTimeout(() => scheduleSceneResize(0), 120)
  window.setTimeout(() => scheduleSceneResize(0), 360)

  threeResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  lastSceneTime = performance.now()
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
}

function animateScene(time: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
  const delta = Math.min((time - lastSceneTime) / 1000, 0.05)
  lastSceneTime = time

  const activeGroup = activeMode.value === 'fold' ? foldGroup : faultGroup
  if (activeGroup && autoRotate.value) {
    activeGroup.rotation.y += delta * 0.18
  } else if (activeGroup) {
    activeGroup.rotation.y *= 0.92
  }

  orbitControls?.update()
  renderOnce()
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

  progress.value = Math.min(100, progress.value + delta * playbackSpeed.value * 11)
  applyProgressToModel()
  if (progress.value >= 100) isPlaying.value = false
}

function resetControls() {
  activeMode.value = 'fold'
  faultType.value = 'normal'
  currentView.value = 'perspective'
  compressionStrength.value = 0
  erosionStrength.value = 0
  faultDisplacement.value = 0
  faultDip.value = 62
  showLabels.value = true
  showForceArrows.value = true
  autoRotate.value = false
  progress.value = 0
  playbackSpeed.value = 1
  isPlaying.value = false
  selectedFeature.value = {
    title: '整体模型',
    description: '点击中间模型中的岩层或断块，可在这里查看对应的构造信息。',
  }

  rebuildFaultArrows()
  updateSceneModeVisibility()
  applyCurrentView()
  scheduleSceneResize(90)
}

watch(showLabels, () => {
  updateFoldLabels()
  updateFaultModel()
})

watch(showForceArrows, () => {
  updateFoldModel()
  updateFaultModel()
})

watch(faultDip, () => {
  updateFaultModel()
  renderOnce()
})

watch(faultType, () => {
  rebuildFaultArrows()
  updateFaultModel()
})

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      const geometry = child.geometry as THREE.BufferGeometry | undefined
      geometry?.dispose()
      const material = child.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else material?.dispose()
    } else if (child instanceof THREE.Sprite) {
      child.material.dispose()
    }
  })
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
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
  }

  orbitControls?.dispose()
  orbitControls = null

  sceneTextures.forEach((texture) => texture.dispose())
  sceneTextures.length = 0
  rockTexture = null

  if (scene) disposeObject(scene)
  sceneMaterials.length = 0
  foldLayerMeshes.length = 0
  faultLayerMeshes.length = 0
  clickableMeshes.length = 0

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  mainLight = null
  foldGroup = null
  faultGroup = null
  foldLabelGroup = null
  faultLabelGroup = null
  foldArrowGroup = null
  faultArrowGroup = null
  faultPlaneMesh = null
  faultTraceMesh = null
  faultLeftGroup = null
  faultRightGroup = null
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
.floating-card-body {
  display: grid;
  gap: 12px;
  align-content: start;
  box-sizing: border-box;
  min-height: 0;
  padding: 12px;
}

.floating-card-body>* {
  margin-top: 0;
  margin-bottom: 0;
}

.fold-fault-floating-card:deep(.feature-card-content) {
  overscroll-behavior: contain;
}

.fold-fault-data-card {
  width: clamp(348px, 28vw, 448px);
}

.fold-fault-data-card .floating-card-body {
  gap: 13px;
  padding: 15px;
}

.data-panel-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a8bfba;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.data-live-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: #a9c8aa;
  box-shadow: 0 0 0 3px rgba(169, 200, 170, 0.12);
}

.data-panel-mode {
  margin-left: auto;
  color: #d1ded8;
  font-weight: 700;
}

.fold-fault-data-card .data-grid {
  gap: 9px;
  margin: 0;
}

.fold-fault-data-card .data-card {
  --data-accent: #a8c7bd;
  position: relative;
  display: flex;
  min-height: 106px;
  box-sizing: border-box;
  flex-direction: column;
  gap: 5px;
  padding: 13px 14px 15px;
  overflow: hidden;
  border: 1px solid rgba(168, 191, 184, 0.17);
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(31, 49, 53, 0.95), rgba(13, 31, 38, 0.95));
  box-shadow: inset 0 1px 0 rgba(230, 240, 232, 0.06);
  backdrop-filter: none;
}

.fold-fault-data-card .data-card::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--data-accent);
  content: '';
  opacity: 0.8;
}

.fold-fault-data-card .data-card:first-child,
.fold-fault-data-card .data-card:last-child {
  grid-column: 1 / -1;
  min-height: 96px;
}

.fold-fault-data-card .blue-card {
  --data-accent: #a5bccd;
}

.fold-fault-data-card .purple-card {
  --data-accent: #bbaac3;
}

.fold-fault-data-card .orange-card {
  --data-accent: #cdb492;
}

.data-card-heading {
  display: flex;
  align-items: center;
  gap: 7px;
}

.fold-fault-data-card .data-card-heading span {
  color: #a9bcb9;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.fold-fault-data-card .data-card-heading .data-card-index {
  color: var(--data-accent);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.fold-fault-data-card .data-card strong {
  overflow: visible;
  color: #f0f3ee;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.18;
  text-overflow: clip;
  white-space: normal;
}

.fold-fault-data-card .data-card:first-child strong {
  font-size: 25px;
}

.fold-fault-data-card .data-card small {
  color: #aabbb7;
  font-size: 11px;
  line-height: 1.4;
}

.data-card-meter {
  height: 3px;
  margin-top: auto;
  overflow: hidden;
  border-radius: 3px;
  background: rgba(218, 230, 225, 0.13);
}

.data-card-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--data-accent);
  transition: width 160ms ease;
}

/*
 * 业务主场景必须显式占满 center-stage。
 * stage-content 内的 Three.js、图例和提示均为绝对定位，
 * 因此这里不能使用 height:auto，否则父级会塌成 0 高度。
 */
.fold-stage-content {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 100%;
  overflow: hidden;
  isolation: isolate;
  background:
    linear-gradient(180deg, rgba(2, 10, 19, 0.08), rgba(2, 9, 17, 0.34)),
    radial-gradient(circle at 50% 48%, rgba(16, 50, 68, 0.04), rgba(1, 7, 14, 0.3) 74%),
    url('/geo-resources-folder/images/fold-fault-geology-background.png') center / cover no-repeat;
}

.fold-stage-content>.three-host {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 100%;
}

.fold-fault-container .three-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  cursor: grab;
}

.fold-fault-container .three-canvas:active {
  cursor: grabbing;
}

.mode-option-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fold-preset-title {
  margin-top: 14px;
}

.fold-preset-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fault-type-grid,
.view-option-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.fault-type-btn,
.view-option-btn {
  min-width: 0;
  padding-inline: 6px;
}

.fault-slider-title {
  margin-top: 14px;
}

.reset-full-btn {
  width: 100%;
  margin-top: 14px;
}

.stage-mode-chip {
  position: absolute;
  z-index: 4;
  display: flex;
  pointer-events: none;
}

.stage-mode-chip {
  top: 18px;
  left: 18px;
  max-width: min(360px, calc(100% - 36px));
  flex-direction: column;
  gap: 4px;
  padding: 10px 13px;
  color: #eaf9ff;
  background: rgba(5, 20, 34, 0.72);
  border: 1px solid rgba(46, 196, 182, 0.32);
  border-radius: 10px;
  backdrop-filter: blur(8px);
}

.stage-stratum-legend {
  position: absolute;
  bottom: clamp(96px, 12vh, 128px);
  left: 18px;
  z-index: 5;
  width: min(230px, calc(100% - 36px));
  box-sizing: border-box;
  padding: 11px 12px;
  pointer-events: none;
  color: #eaf9ff;
  background: rgba(5, 20, 34, 0.78);
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: 10px;
  backdrop-filter: blur(8px);
}

.stage-stratum-legend h3 {
  margin: 0 0 9px;
  font-size: clamp(12px, 0.76vw, 14px);
}

.stage-stratum-legend-list {
  display: grid;
  gap: 7px;
}

.stage-stratum-legend-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.stage-stratum-swatch {
  width: 24px;
  height: 11px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.stage-stratum-legend-item div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.stage-stratum-legend-item strong {
  overflow: hidden;
  font-size: clamp(10px, 0.66vw, 12px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-stratum-legend-item small {
  overflow: hidden;
  color: rgba(221, 241, 250, 0.62);
  font-size: clamp(8px, 0.56vw, 10px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-mode-chip strong {
  font-size: clamp(13px, 0.82vw, 16px);
}

.stage-mode-chip span {
  color: rgba(221, 241, 250, 0.68);
  font-size: clamp(10px, 0.64vw, 12px);
}


.selected-feature-card {
  margin: 0;
  padding: 14px 15px 15px;
  border: 1px solid rgba(155, 183, 174, 0.22);
  border-left: 3px solid #9cb9a9;
  border-radius: 9px;
  background: rgba(23, 43, 46, 0.84);
  box-shadow: none;
  backdrop-filter: none;
}

.selected-feature-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.selected-feature-heading span {
  color: #adc7bc;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.selected-feature-heading small {
  color: #8da6a3;
  font-size: 10px;
}

.selected-feature-title {
  display: block;
  margin-top: 8px;
  color: #f0f3ee;
  font-size: 18px;
  line-height: 1.35;
}

.selected-feature-card p {
  margin: 6px 0 0;
  color: #b6c8c1;
  font-size: 11px;
  line-height: 1.6;
}

.fold-fault-data-card :deep(.analysis-collapse) {
  overflow: hidden;
  border: 1px solid rgba(155, 183, 174, 0.17);
  border-radius: 9px;
  background: rgba(12, 29, 36, 0.6);
}

.fold-fault-data-card :deep(.analysis-collapse .el-collapse-item) {
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.fold-fault-data-card :deep(.analysis-collapse .el-collapse-item + .el-collapse-item) {
  border-top: 1px solid rgba(155, 183, 174, 0.15);
}

.fold-fault-data-card :deep(.analysis-collapse .el-collapse-item__header) {
  height: 42px;
  padding: 0 13px;
  color: #e0eae4;
  font-size: 12px;
  font-weight: 700;
  background: transparent;
  border: 0;
}

.fold-fault-data-card :deep(.analysis-collapse .el-collapse-item__wrap) {
  background: transparent;
  border: 0;
}

.fold-fault-data-card :deep(.analysis-collapse .el-collapse-item__content) {
  padding: 0 13px 13px;
  color: #b5c5bf;
  font-size: 11px;
  line-height: 1.65;
}

.recognition-list p+p {
  margin-top: 7px;
}

@media (max-width: 860px) {

  .fold-fault-data-card {
    width: min(390px, calc(100vw - 36px));
  }

  .fault-type-grid,
  .view-option-grid {
    grid-template-columns: 1fr;
  }

  .stage-mode-chip span {
    display: none;
  }

  .stage-stratum-legend {
    width: min(200px, calc(100% - 36px));
  }

  .stage-stratum-legend-item small {
    display: none;
  }

}
</style>
