<template>
  <div
    ref="pageRef"
    class="fold-fault-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">褶皱断层</h1>

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
              <h2>模型控制</h2>
              <p>切换地质构造并控制形成过程</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">构造类型</h3>
            <div class="option-grid mode-option-grid">
              <button
                v-for="item in modeOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: activeMode === item.value }"
                @click="switchMode(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <section v-if="activeMode === 'fold'" class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">挤压强度</h3>
              <strong class="control-value">{{ Math.round(compressionStrength * 100) }}%</strong>
            </div>
            <el-slider
              v-model="compressionPercent"
              :min="0"
              :max="100"
              :step="1"
              :show-tooltip="false"
              @input="onManualFoldControl"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">侵蚀强度</span>
              <strong class="control-value">{{ Math.round(erosionStrength * 100) }}%</strong>
            </div>
            <el-slider
              v-model="erosionPercent"
              :min="0"
              :max="100"
              :step="1"
              :show-tooltip="false"
              @input="onManualFoldControl"
            />

            <h3 class="section-title fold-preset-title">过程预设</h3>
            <div class="option-grid fold-preset-grid">
              <button
                v-for="item in foldPresets"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: foldPreset === item.value }"
                @click="applyFoldPreset(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <section v-else class="geo-card control-section">
            <h3 class="section-title">断层类型</h3>
            <div class="option-grid fault-type-grid">
              <button
                v-for="item in faultTypeOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn fault-type-btn"
                :class="{ active: faultType === item.value }"
                @click="setFaultType(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="section-title-row fault-slider-title">
              <span class="mini-control-label">断层错动量</span>
              <strong class="control-value">{{ Math.round(faultDisplacement * 100) }}%</strong>
            </div>
            <el-slider
              v-model="faultDisplacementPercent"
              :min="0"
              :max="100"
              :step="1"
              :show-tooltip="false"
              @input="onManualFaultControl"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">断层面倾角</span>
              <strong class="control-value">{{ Math.round(faultDip) }}°</strong>
            </div>
            <el-slider
              v-model="faultDip"
              :min="45"
              :max="80"
              :step="1"
              :show-tooltip="false"
            />

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
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn view-option-btn"
                :class="{ active: currentView === item.value }"
                @click="setView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn reset-full-btn"
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
        <div class="stage-content fold-stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <section class="stage-stratum-legend" aria-label="岩层图例">
            <h3>岩层图例</h3>
            <div class="stage-stratum-legend-list">
              <div
                v-for="item in rockLegend"
                :key="item.label"
                class="stage-stratum-legend-item"
              >
                <span
                  class="stage-stratum-swatch"
                  :style="{ backgroundColor: item.color }"
                ></span>
                <div>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.note }}</small>
                </div>
              </div>
            </div>
          </section>

          <div class="stage-mode-chip">
            <strong>{{ activeMode === 'fold' ? '褶皱形成演示' : '断层错动演示' }}</strong>
            <span>拖动旋转 · 滚轮缩放 · 点击岩层查看数据</span>
          </div>

        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="togglePlayback"
          >
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
            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :step="1"
              :show-tooltip="false"
              @input="onTimelineInput"
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
              <h2>实时数据</h2>
              <p>{{ activeMode === 'fold' ? '褶皱形态与侵蚀结果' : '断层位移与构造判读' }}</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid">
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

          <section class="geo-card selected-feature-card">
            <div class="selected-feature-heading">
              <span>当前选中</span>
              <strong>{{ selectedFeature.title }}</strong>
            </div>
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

const hasLeftPanel = true
const hasRightPanel = true

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
  { label: '表层（风化层）', color: '#7fc943', note: '最上部年轻覆盖层' },
  { label: '浅色岩层', color: '#d9d3c8', note: '用于观察连续弯曲与错断' },
  { label: '砂泥质层', color: '#ae8f79', note: '中部标志层' },
  { label: '深色岩层', color: '#725246', note: '较老岩层' },
  { label: '基底岩层', color: '#47332f', note: '模型底部基底' },
]

const layerThicknesses = [0.55, 0.68, 0.82, 0.94, 1.08]
const layerColors = rockLegend.map((item) => item.color)
const totalRockThickness = layerThicknesses.reduce((sum, value) => sum + value, 0)

const activeMode = ref<StructureMode>('fold')
const foldPreset = ref<FoldPreset>('flat')
const faultType = ref<FaultType>('normal')
const currentView = ref<ViewType>('perspective')

const compressionStrength = ref(0)
const erosionStrength = ref(0)
const faultDisplacement = ref(0)
const faultDip = ref(62)

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
  return '差异侵蚀与岩层出露'
})

const faultTypeLabel = computed(() => {
  return faultTypeOptions.find((item) => item.value === faultType.value)?.label || '正断层'
})

const dataCards = computed(() => {
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
      },
      {
        label: '断层倾角',
        value: `${Math.round(faultDip.value)}°`,
        description: '断层面与水平面的夹角',
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
    },
    {
      label: '侵蚀强度',
      value: `${Math.round(erosionStrength.value * 100)}%`,
      description: '顶部差异侵蚀程度',
      className: 'purple-card',
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
    return '岩层沿近直立断裂面发生以水平方向为主的错动，形成平移断层。判断重点是同一标志物或岩层在断层两侧发生水平错开。'
  }

  return '水平岩层受到持续的水平挤压力后发生塑性弯曲，向上拱起形成背斜，向下弯曲形成向斜。继续经历差异侵蚀后，不同部位的岩层会被削低并出露，从而形成更复杂的地表形态。'
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
let faultLeftGroup: THREE.Group | null = null
let faultRightGroup: THREE.Group | null = null

const foldLayerMeshes: THREE.Mesh[] = []
const faultLayerMeshes: THREE.Mesh[] = []
const clickableMeshes: THREE.Object3D[] = []
const sceneMaterials: THREE.Material[] = []
const sceneTextures: THREE.Texture[] = []
const sceneGeometries: THREE.BufferGeometry[] = []

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let pointerDownX = 0
let pointerDownY = 0
let lastFoldGeometryUpdate = 0

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
    foldPreset.value = 'flat'
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
  foldPreset.value = preset
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
  updateFoldModel(true)
}

function onManualFoldControl() {
  isPlaying.value = false
  foldPreset.value = 'flat'
  if (erosionStrength.value > 0.01) {
    progress.value = 65 + erosionStrength.value * 35
  } else {
    progress.value = compressionStrength.value * 65
  }
  updateFoldModel(true)
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
    foldPreset.value = progress.value < 1
      ? 'flat'
      : progress.value < 60
        ? 'gentle'
        : progress.value < 70
          ? 'tight'
          : 'eroded'
    updateFoldModel()
  } else {
    faultDisplacement.value = progress.value / 100
    updateFaultModel()
  }
}

function createMaterial(color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.02,
    side: THREE.DoubleSide,
    ...options,
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
  roundedRectPath(ctx, 18, 22, 604, 156, 34)
  ctx.fillStyle = 'rgba(6, 20, 34, 0.9)'
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = accent
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 62px "Microsoft YaHei", "PingFang SC", sans-serif'
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
  sprite.scale.set(3.1, 0.96, 1)
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
  const ridgeFactor = amplitude > 0.001
    ? Math.max(0, wave / amplitude)
    : 0
  const shoulderFactor = amplitude > 0.001
    ? Math.max(0, 1 - Math.abs(wave / amplitude))
    : 0

  const erosionDepth = erosionStrength.value * (
    0.18 +
    Math.pow(ridgeFactor, 1.45) * 3.95 +
    shoulderFactor * 0.28
  )

  return original - erosionDepth
}

function getLayerBounds(layerIndex: number, rawX: number) {
  const surface = foldOriginalSurfaceAt(rawX)
  const erosionSurface = foldErosionSurfaceAt(rawX)
  let topOffset = 0
  for (let i = 0; i < layerIndex; i += 1) topOffset += layerThicknesses[i]
  const bottomOffset = topOffset + layerThicknesses[layerIndex]

  const originalTop = surface - topOffset
  const originalBottom = surface - bottomOffset
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
      title: rockLegend[index].label,
      description: `这是${rockLegend[index].label}。在褶皱形成过程中，同一岩层应保持连续弯曲；若发生断层，则同一标志层会在断裂面两侧错开。`,
    } satisfies FeatureInfo
    foldLayerMeshes.push(mesh)
    clickableMeshes.push(mesh)
    foldGroup?.add(mesh)
  })

  foldLabelGroup = new THREE.Group()
  const anticlineLeft = createTextSprite('背斜', '#8bc34a')
  const syncline = createTextSprite('向斜', '#3ea6ff')
  const anticlineRight = createTextSprite('背斜', '#8bc34a')
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

  updateFoldModel(true)
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

function updateFoldModel(force = false) {
  if (!foldGroup) return
  const now = performance.now()
  if (!force && now - lastFoldGeometryUpdate < 34) return
  lastFoldGeometryUpdate = now

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

function createFaultBlock(side: 'left' | 'right') {
  const group = new THREE.Group()
  const blockWidth = 7.15
  const depth = 5.2
  let currentY = -totalRockThickness / 2

  layerThicknesses
    .slice()
    .reverse()
    .forEach((thickness, reverseIndex) => {
      const layerIndex = layerThicknesses.length - 1 - reverseIndex
      const geometry = new THREE.BoxGeometry(blockWidth, thickness, depth, 1, 1, 1)
      const material = createMaterial(layerColors[layerIndex])
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = currentY + thickness / 2
      mesh.userData.feature = {
        title: `${side === 'left' ? '左侧' : '右侧'} · ${rockLegend[layerIndex].label}`,
        description: `断层发生后，观察这条${rockLegend[layerIndex].label}在断层两侧是否还能连续对应，即可判断岩层的相对错动。`,
      } satisfies FeatureInfo
      currentY += thickness
      faultLayerMeshes.push(mesh)
      clickableMeshes.push(mesh)
      group.add(mesh)
    })

  const topGeometry = new THREE.PlaneGeometry(blockWidth, depth)
  topGeometry.rotateX(-Math.PI / 2)
  const topMaterial = createMaterial('#8bce4a', { roughness: 0.9 })
  const topMesh = new THREE.Mesh(topGeometry, topMaterial)
  topMesh.position.y = totalRockThickness / 2 + 0.006
  topMesh.userData.feature = {
    title: `${side === 'left' ? '左侧' : '右侧'}地表`,
    description: '地表高差本身不能单独确定断层类型，需要结合断层面和同一岩层在两侧的相对位置综合判断。',
  } satisfies FeatureInfo
  clickableMeshes.push(topMesh)
  group.add(topMesh)

  return group
}

function buildFaultPlaneGeometry() {
  const depth = 6.1
  const height = 6.4
  const dipRad = THREE.MathUtils.degToRad(faultDip.value)
  const horizontalShift = height / Math.tan(dipRad)
  const positions = [
    -horizontalShift / 2, -height / 2, -depth / 2,
    horizontalShift / 2, height / 2, -depth / 2,
    horizontalShift / 2, height / 2, depth / 2,
    -horizontalShift / 2, -height / 2, depth / 2,
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
}

function createFaultModel() {
  if (!scene) return
  faultGroup = new THREE.Group()
  faultGroup.name = 'fault-model'
  faultGroup.position.y = 0.5
  scene.add(faultGroup)

  faultLeftGroup = createFaultBlock('left')
  faultRightGroup = createFaultBlock('right')
  faultLeftGroup.position.x = -3.66
  faultRightGroup.position.x = 3.66
  faultGroup.add(faultLeftGroup, faultRightGroup)

  const planeGeometry = buildFaultPlaneGeometry()
  const hiddenPlaneMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    colorWrite: false,
  })
  sceneMaterials.push(hiddenPlaneMaterial)
  faultPlaneMesh = new THREE.Mesh(planeGeometry, hiddenPlaneMaterial)
  faultPlaneMesh.visible = false
  faultGroup.add(faultPlaneMesh)

  faultLabelGroup = new THREE.Group()
  const footwallLabel = createTextSprite('下盘', '#2ec4b6')
  const hangingWallLabel = createTextSprite('上盘', '#ff9f43')
  const leftRockLabel = createTextSprite('左侧岩块', '#2ec4b6')
  const rightRockLabel = createTextSprite('右侧岩块', '#ff9f43')
  footwallLabel.scale.set(2.7, 0.84, 1)
  hangingWallLabel.scale.set(2.7, 0.84, 1)
  leftRockLabel.scale.set(3.15, 0.84, 1)
  rightRockLabel.scale.set(3.15, 0.84, 1)
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
    const child = faultArrowGroup.children.pop()
    if (child) child.parent = null
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

  faultLeftGroup.position.set(-3.66, 0, 0)
  faultRightGroup.position.set(3.66, 0, 0)

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
  if (faultPlaneMesh) faultPlaneMesh.visible = false
  faultGroup.visible = activeMode.value === 'fault'
}

function createBackgroundParticles() {
  if (!scene) return
  const positions: number[] = []
  for (let i = 0; i < 170; i += 1) {
    const x = (Math.random() - 0.5) * 28
    const y = Math.random() * 10 - 0.4
    const z = -4.5 - Math.random() * 7
    positions.push(x, y, z)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  sceneGeometries.push(geometry)
  const material = new THREE.PointsMaterial({
    color: 0xb8d9e8,
    size: 0.075,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  })
  sceneMaterials.push(material)
  const points = new THREE.Points(geometry, material)
  scene.add(points)
}

function updateSceneModeVisibility() {
  if (foldGroup) foldGroup.visible = activeMode.value === 'fold'
  if (faultGroup) faultGroup.visible = activeMode.value === 'fault'
  if (activeMode.value === 'fold') updateFoldModel(true)
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
    camera.position.set(0, 0.45, 20.5)
    orbitControls.target.set(0, 0.1, 0)
  } else if (currentView.value === 'top') {
    camera.position.set(0.01, 18.5, 0.01)
    camera.up.set(0, 0, -1)
    orbitControls.target.set(0, 0.1, 0)
  } else {
    camera.position.set(11.8, 7.1, 15.5)
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
  scene.background = new THREE.Color('#061526')

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
  camera.position.set(11.8, 7.1, 15.5)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = false
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.enablePan = false
  orbitControls.minDistance = 9
  orbitControls.maxDistance = 30
  orbitControls.minPolarAngle = 0.08
  orbitControls.maxPolarAngle = Math.PI * 0.88
  orbitControls.target.set(0, 0.1, 0)
  orbitControls.update()

  const hemisphereLight = new THREE.HemisphereLight(0xc9edff, 0x293229, 1.25)
  scene.add(hemisphereLight)

  mainLight = new THREE.DirectionalLight(0xffffff, 2.15)
  mainLight.position.set(8, 13, 10)
  scene.add(mainLight)

  const rimLight = new THREE.DirectionalLight(0x4ca9ff, 0.65)
  rimLight.position.set(-10, 6, -8)
  scene.add(rimLight)

  createBackgroundParticles()
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
  setAllCollapsed(false)
  resetWidths()

  activeMode.value = 'fold'
  foldPreset.value = 'flat'
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
  refreshFaultPlaneGeometry()
  updateSceneModeVisibility()
  applyCurrentView()
  scheduleSceneResize(90)
}

watch(showLabels, () => {
  updateFoldLabels()
  updateFaultModel()
})

watch(showForceArrows, () => {
  updateFoldModel(true)
  updateFaultModel()
})

watch(faultDip, () => {
  refreshFaultPlaneGeometry()
  renderOnce()
})

watch(faultType, () => {
  rebuildFaultArrows()
  updateFaultModel()
})

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Points) {
      const geometry = child.geometry as THREE.BufferGeometry | undefined
      geometry?.dispose()
      const material = child.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else material?.dispose()
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

  if (scene) disposeObject(scene)
  sceneMaterials.length = 0
  sceneGeometries.length = 0
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
.fold-fault-container .workspace.panel-resizing,
.fold-fault-container .workspace.layout-resizing,
.fold-fault-container .workspace.panel-resizing .side-panel,
.fold-fault-container .workspace.layout-resizing .side-panel,
.fold-fault-container .workspace.panel-resizing .center-stage,
.fold-fault-container .workspace.layout-resizing .center-stage {
  transition: none !important;
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
}

.fold-stage-content > .three-host {
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
  top: 18px;
  right: 18px;
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
  margin-top: 12px;
}

.selected-feature-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.selected-feature-heading span {
  color: var(--text-secondary);
  font-size: 12px;
}

.selected-feature-heading strong {
  color: var(--text-primary);
  font-size: 15px;
  text-align: right;
}

.selected-feature-card p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.7;
}

.recognition-list p + p {
  margin-top: 7px;
}

@media (max-width: 860px) {
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
