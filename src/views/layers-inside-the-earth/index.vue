<template>
  <div
    ref="pageRef"
    class="layers-inside-the-earth-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">地球内部圈层与地震波</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetScene">
          恢复默认
        </button>

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
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>切换教学模型并控制动态演示</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">教学功能</h3>
            <div class="function-grid">
              <button
                v-for="item in stageOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn function-btn"
                :class="{ active: stageMode === item.value }"
                @click="setStageMode(item.value)"
              >
                <span class="function-index">{{ item.index }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>

          <section v-if="stageMode === 'earth'" class="geo-card control-section">
            <h3 class="section-title">圈层模型设置</h3>


            <div class="switch-row">
              <div class="control-copy">
                <strong>文字标注</strong>
                <span>显示圈层名称、深度数字与状态</span>
              </div>
              <el-switch v-model="showLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>不连续面</strong>
                <span>显示莫霍面、古登堡面和圈层边线</span>
              </div>
              <el-switch v-model="showBoundaries" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地表地形</strong>
                <span>显示高原、高山、平原、土壤与海洋</span>
              </div>
              <el-switch v-model="showTerrain" />
            </div>
          </section>

          <section v-if="stageMode === 'wave'" class="geo-card control-section">
            <h3 class="section-title">波动模型</h3>
            <div class="option-grid wave-mode-grid">
              <button
                v-for="item in waveModeOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn wave-mode-btn"
                :class="{ active: waveMode === item.value }"
                @click="setWaveMode(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">振幅</span>
              <strong class="control-value">{{ waveAmplitude.toFixed(1) }}×</strong>
            </div>
            <el-slider
              v-model="waveAmplitude"
              :min="0.4"
              :max="2"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">频率</span>
              <strong class="control-value">{{ waveFrequency.toFixed(1) }}×</strong>
            </div>
            <el-slider
              v-model="waveFrequency"
              :min="0.4"
              :max="2.4"
              :step="0.1"
              :show-tooltip="false"
            />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">动画与视角</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>自动旋转</strong>
                <span>适用于立体楔形模型和体波模型</span>
              </div>
              <el-switch v-model="autoRotate" />
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">动画速度</span>
              <strong class="control-value">{{ animationSpeed.toFixed(1) }}×</strong>
            </div>
            <el-slider
              v-model="animationSpeed"
              :min="0.2"
              :max="2.5"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="option-grid view-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="applyView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="switch-row first-control-row">
              <div class="control-copy">
                <strong>缓慢播放</strong>
                <span>便于课堂逐步观察传播过程</span>
              </div>
              <el-switch v-model="slowTeachingMode" />
            </div>

            <button type="button" class="theme-btn reset-scene-btn" @click="resetScene">
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
        <div class="stage-content earth-stage-content">
          <div
            v-show="stageMode === 'earth'"
            ref="wedgeContainerRef"
            class="scene-host three-host wedge-three-host"
          ></div>

          <div
            v-show="stageMode === 'wave' && waveMode === 'body'"
            ref="waveContainerRef"
            class="scene-host three-host wave-three-host"
          ></div>

          <canvas
            v-show="stageMode === 'wave' && waveMode === 'surface'"
            ref="surfaceWaveCanvasRef"
            class="surface-wave-canvas"
          ></canvas>

          <div v-show="stageMode === 'seismic'" class="seismic-stage">
            <div class="seismic-reference-frame">
              <img
                class="seismic-reference-image"
                :src="SEISMIC_REFERENCE_IMAGE"
                alt="地震波传播速度与地球内部圈层示意图"
              />

              <section class="seismic-chart-card seismogram-card seismic-overlay-card">
                <div class="static-card-title">某次地震波谱示意图</div>
                <canvas ref="seismogramCanvasRef" class="seismic-chart-canvas"></canvas>
              </section>
            </div>
          </div>

          <div v-if="stageMode === 'lithosphere'" class="static-stage lithosphere-stage">
            <img
              class="lithosphere-diagram-image"
              :src="LITHOSPHERE_DIAGRAM_IMAGE"
              alt="岩石圈结构与地壳主要化学元素示意图"
            />
          </div>

          <div class="stage-title-card">
            <span>{{ currentStageMeta.eyebrow }}</span>
            <strong>{{ currentStageMeta.title }}</strong>
            <small>{{ currentStageMeta.subtitle }}</small>
          </div>

          <div
            v-if="stageMode === 'wave' && waveMode === 'body'"
            class="stage-legend body-wave-legend"
          >
            <span><i class="legend-dot longitudinal-dot"></i>纵波</span>
            <span><i class="legend-dot transverse-dot"></i>横波</span>
          </div>

          <div
            v-if="stageMode === 'wave' && waveMode === 'body'"
            class="body-wave-label body-wave-label-top"
          >
            纵波（P 波）：压缩——伸张
          </div>

          <div
            v-if="stageMode === 'wave' && waveMode === 'body'"
            class="body-wave-label body-wave-label-bottom"
          >
            横波（S 波）：垂直传播方向
          </div>

          <div v-if="stageMode !== 'seismic'" class="interaction-tip">
            <span class="mouse-icon">◎</span>
            {{ interactionTipText }}
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
              <span>{{ timelineTitle }}</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider
              v-model="progress"
              :min="0"
              :max="100"
              :show-tooltip="false"
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

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>知识点与数据</h2>
              <p>圈层结构、地震波与课堂结论</p>
            </div>
            <span class="panel-badge">KNOWLEDGE</span>
          </div>

          <section class="geo-card knowledge-selector-card">
            <h3 class="section-title">地球内部三大圈层</h3>
            <div class="knowledge-tab-grid">
              <button
                v-for="item in knowledgeTabs"
                :key="item.value"
                type="button"
                class="theme-btn option-btn knowledge-tab-btn"
                :class="{ active: selectedKnowledge === item.value }"
                @click="selectedKnowledge = item.value"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <div class="data-grid layer-data-grid">
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

          <section class="geo-card current-knowledge-card">
            <div class="knowledge-heading-row">
              <div>
                <span class="knowledge-kicker">CURRENT LAYER</span>
                <h3>{{ currentKnowledge.title }}</h3>
              </div>
              <span class="depth-badge">{{ currentKnowledge.depth }}</span>
            </div>
            <p>{{ currentKnowledge.summary }}</p>
            <ul>
              <li v-for="item in currentKnowledge.points" :key="item">
                {{ item }}
              </li>
            </ul>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="地震波与圈层划分" name="seismic">
              <div class="collapse-content">
                <p>
                  地震波传播速度会随介质性质改变，并在莫霍面、古登堡面等界面发生突变。
                  科学家据此推断地球内部的物质状态和圈层结构。
                </p>
                <div class="wave-compare-table">
                  <div class="wave-compare-row wave-compare-head">
                    <span>类型</span><span>振动方向</span><span>传播介质</span><span>速度</span>
                  </div>
                  <div class="wave-compare-row">
                    <strong>P 纵波</strong><span>与传播方向一致</span><span>固、液、气</span><span>较快</span>
                  </div>
                  <div class="wave-compare-row">
                    <strong>S 横波</strong><span>与传播方向垂直</span><span>仅固体</span><span>较慢</span>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item title="重要不连续面" name="boundaries">
              <div class="collapse-content boundary-list">
                <p><strong>莫霍面：</strong>地壳与地幔分界，地震波速度明显增大。</p>
                <p><strong>古登堡面：</strong>地幔与地核分界，S 波消失，P 波速度骤降。</p>
                <p><strong>莱曼面：</strong>外核与内核分界，反映内核为固态。</p>
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
import { Water } from 'three/examples/jsm/objects/Water.js'

type StageMode = 'earth' | 'seismic' | 'wave' | 'lithosphere'
type WaveMode = 'body' | 'surface'
type KnowledgeKey = 'crust' | 'mantle' | 'core'
type ViewKey = 'default' | 'front' | 'top'

type KnowledgeItem = {
  title: string
  depth: string
  summary: string
  points: string[]
  averageThickness: string
  state: string
  material: string
}

type BodyWavePoint = {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  origin: THREE.Vector3
  row: 'P' | 'S'
  columnIndex: number
}


type SceneBundle = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  root: THREE.Group
  resizeObserver: ResizeObserver | null
  lastWidth: number
  lastHeight: number
}

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

const SEISMIC_REFERENCE_IMAGE =
  IMAGE_BASE_URL + 'layers-inside-earth-seismic-reference-v6.png'

const LITHOSPHERE_DIAGRAM_IMAGE =
  IMAGE_BASE_URL + 'layers-inside-earth-lithosphere-v5.png'

const hasLeftPanel = true
const hasRightPanel = true

const wedgeContainerRef = ref<HTMLElement | null>(null)
const seismogramCanvasRef = ref<HTMLCanvasElement | null>(null)
const waveContainerRef = ref<HTMLElement | null>(null)
const surfaceWaveCanvasRef = ref<HTMLCanvasElement | null>(null)

const stageMode = ref<StageMode>('earth')
const waveMode = ref<WaveMode>('body')
const selectedKnowledge = ref<KnowledgeKey>('crust')
const showLabels = ref(true)
const showBoundaries = ref(true)
const showTerrain = ref(true)
const autoRotate = ref(true)
const slowTeachingMode = ref(false)
const animationSpeed = ref(1)
const waveAmplitude = ref(1)
const waveFrequency = ref(1)
const isPlaying = ref(true)
const progress = ref(0)
const playbackSpeed = ref(1)
const activePanels = ref(['seismic', 'boundaries'])
const currentView = ref<ViewKey>('default')

const stageOptions: Array<{ label: string; value: StageMode; index: string }> = [
  { label: '内部圈层', value: 'earth', index: '01' },
  { label: '地震波示意', value: 'seismic', index: '02' },
  { label: '纵波和横波', value: 'wave', index: '03' },
  { label: '岩石圈结构', value: 'lithosphere', index: '04' },
]

const waveModeOptions: Array<{ label: string; value: WaveMode }> = [
  { label: '体波：纵波/横波', value: 'body' },
  { label: '面波：纵波/横波', value: 'surface' },
]

const viewOptions: Array<{ label: string; value: ViewKey }> = [
  { label: '默认视角', value: 'default' },
  { label: '正视剖面', value: 'front' },
  { label: '俯视观察', value: 'top' },
]

const knowledgeTabs: Array<{ label: string; value: KnowledgeKey }> = [
  { label: '地壳', value: 'crust' },
  { label: '地幔', value: 'mantle' },
  { label: '地核', value: 'core' },
]

const speedOptions = [0.5, 1, 2]

const knowledgeMap: Record<KnowledgeKey, KnowledgeItem> = {
  crust: {
    title: '地壳',
    depth: '平均约 17 km',
    summary:
      '地壳是地球内部圈层的最外层，由岩石组成，厚度不均，是人类生产生活最直接的空间。',
    points: [
      '大陆地壳较厚，平均约 39～41 km；高山、高原地区可达 60～70 km。',
      '大洋地壳较薄，平均约 5～10 km，部分海沟处更薄。',
      '上层以富含硅、铝的硅铝层为主；下层以富含硅、镁的硅镁层为主。',
      '地壳厚度不均和硅铝层分布不连续，是地壳结构的重要特征。',
    ],
    averageThickness: '17 km',
    state: '固态',
    material: '岩石',
  },
  mantle: {
    title: '地幔',
    depth: '约 17～2 900 km',
    summary:
      '地幔位于莫霍面与古登堡面之间，物质基本呈固态，是地球内部体积最大的圈层。',
    points: [
      '地幔可分为上地幔和下地幔，分界大致位于地下约 1 000 km。',
      '上地幔上部约 50～250（或 400）km 深处存在软流层。',
      '软流层物质接近熔融状态，通常被认为是岩浆的重要发源地。',
      '地壳与软流层以上的上地幔顶部共同组成岩石圈。',
    ],
    averageThickness: '约 2 883 km',
    state: '固态为主',
    material: '富铁镁硅酸盐',
  },
  core: {
    title: '地核',
    depth: '2 900～6 371 km',
    summary:
      '地核是地球的中心部分，分为外核和内核，主要由铁、镍等金属元素组成。',
    points: [
      '外核物质接近液态，S 波不能通过，P 波传播速度显著降低。',
      '内核在极高压力下呈固态，具有很强的刚性。',
      '外核与内核的分界约位于地下 5 100 km。',
      '地核只占地球体积约 16.2%，但其质量约占地球总质量的 31%。',
    ],
    averageThickness: '约 3 471 km',
    state: '外液内固',
    material: '铁、镍',
  },
}

const currentKnowledge = computed(() => knowledgeMap[selectedKnowledge.value])

const currentStageMeta = computed(() => {
  if (stageMode.value === 'seismic') {
    return {
      eyebrow: 'SEISMIC WAVE',
      title: '地震波传播速度与地球内部圈层',
      subtitle: '圈层剖面图结合左下动态地震波谱，展示 P 波、S 波与圈层划分',
    }
  }

  if (stageMode.value === 'wave') {
    return waveMode.value === 'body'
      ? {
          eyebrow: 'BODY WAVE',
          title: '体波：纵波与横波三维动态模型',
          subtitle: '上方展示纵波压缩—伸张，下方展示横波垂直传播方向振动',
        }
      : {
          eyebrow: 'SURFACE WAVE',
          title: '面波：纵波与横波二维动态模型',
          subtitle: '对比振幅、频率、波长和质点振动方向',
        }
  }

  if (stageMode.value === 'lithosphere') {
    return {
      eyebrow: 'LITHOSPHERE',
      title: '岩石圈结构与地壳主要化学元素',
      subtitle: '展示大陆地壳、大洋地壳、岩石圈、软流层和地幔对流',
    }
  }

  return {
    eyebrow: 'EARTH WEDGE',
    title: '地球内部圈层立体楔形模型',
    subtitle: '从地表向地心依次观察地壳、上地幔、下地幔、外核和内核',
  }
})

const timelineTitle = computed(() => {
  if (stageMode.value === 'seismic') return '地震波示意观察'
  if (stageMode.value === 'wave') return waveMode.value === 'body' ? '体波传播演示' : '面波传播演示'
  if (stageMode.value === 'lithosphere') return '岩石圈结构观察'
  return '立体楔形模型观察'
})

const interactionTipText = computed(() => {
  if (stageMode.value === 'earth') return '拖拽旋转 · 滚轮缩放 · 观察圈层厚度与地表差异'
  if (stageMode.value === 'wave' && waveMode.value === 'body') return '拖拽旋转 · 观察纵波与横波的质点振动方式'
  if (stageMode.value === 'wave') return '播放动画 · 调节振幅与频率 · 对比纵波和横波'
  return '当前场景按照教材示意图布局展示，适合课堂对照讲解'
})

const dataCards = computed(() => {
  if (stageMode.value === 'seismic') {
    return [
      { label: '当前主题', value: '地震波', description: '速度—深度关系', className: 'cyan-card' },
      { label: 'P 波', value: '纵波', description: '速度较快，可过固液气', className: 'blue-card' },
      { label: 'S 波', value: '横波', description: '速度较慢，仅过固体', className: 'purple-card' },
      { label: '关键界面', value: '莫霍面', description: '波速明显增大', className: 'orange-card' },
    ]
  }

  if (stageMode.value === 'wave') {
    return [
      { label: '当前模型', value: waveMode.value === 'body' ? '体波' : '面波', description: waveMode.value === 'body' ? '三维动态' : '二维动态', className: 'cyan-card' },
      { label: '振幅', value: `${waveAmplitude.value.toFixed(1)}×`, description: '控制质点位移幅度', className: 'blue-card' },
      { label: '频率', value: `${waveFrequency.value.toFixed(1)}×`, description: '控制波动疏密', className: 'purple-card' },
      { label: '状态', value: isPlaying.value ? '播放中' : '已暂停', description: '底部时间轴控制', className: 'orange-card' },
    ]
  }

  if (stageMode.value === 'lithosphere') {
    return [
      { label: '当前主题', value: '岩石圈', description: '地壳与上地幔顶部', className: 'cyan-card' },
      { label: '硅铝层', value: '约 2.7', description: '密度 / g·cm⁻³', className: 'blue-card' },
      { label: '硅镁层', value: '约 2.9', description: '密度 / g·cm⁻³', className: 'purple-card' },
      { label: '氧元素', value: '49.13%', description: '地壳中含量最高', className: 'orange-card' },
    ]
  }

  return [
    { label: '当前圈层', value: currentKnowledge.value.title, description: currentKnowledge.value.depth, className: 'cyan-card' },
    { label: '平均厚度', value: currentKnowledge.value.averageThickness, description: '教材尺度概念', className: 'blue-card' },
    { label: '物质状态', value: currentKnowledge.value.state, description: currentKnowledge.value.material, className: 'purple-card' },
    { label: '地球半径', value: '6 371 km', description: '模型按比例适度夸张', className: 'orange-card' },
  ]
})

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
    scheduleSceneResize(80)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

let wedgeBundle: SceneBundle | null = null
let waveBundle: SceneBundle | null = null
let wedgeWater: Water | null = null
let wedgeLabelGroup: THREE.Group | null = null
let wedgeBoundaryGroup: THREE.Group | null = null
let wedgeTerrainGroup: THREE.Group | null = null
let wedgeRootBaseRotation = new THREE.Euler(-0.08, -0.3, 0)
let waveRootBaseRotation = new THREE.Euler(-0.06, -0.12, 0)
let wavePoints: BodyWavePoint[] = []
let surfaceResizeObserver: ResizeObserver | null = null
let seismicCanvasResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let animationFrameId = 0
let timelineLastTime = 0
let elapsed = 0
const sceneClock = new THREE.Clock()

function createBackgroundTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(540, 420, 20, 540, 420, 720)
  gradient.addColorStop(0, '#12364f')
  gradient.addColorStop(0.5, '#071a2c')
  gradient.addColorStop(1, '#020b14')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < 260; i += 1) {
    const alpha = 0.15 + Math.random() * 0.65
    const radius = 0.4 + Math.random() * 1.6
    ctx.fillStyle = `rgba(215,240,255,${alpha})`
    ctx.beginPath()
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createWaterNormalTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.fillStyle = '#7f7fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const nx = Math.sin(x * 0.12) * 18 + Math.sin((x + y) * 0.055) * 12
      const ny = Math.cos(y * 0.11) * 18 + Math.cos((x - y) * 0.05) * 12
      data[index] = Math.max(0, Math.min(255, 128 + nx))
      data[index + 1] = Math.max(0, Math.min(255, 128 + ny))
      data[index + 2] = 245
      data[index + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(5, 5)
  texture.needsUpdate = true
  return texture
}

function createTextSprite(
  text: string,
  options: {
    color?: string
    fontSize?: number
    scale?: number
    background?: string
    stroke?: string
    fontWeight?: number
  } = {},
) {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建文字纹理')

  const fontSize = options.fontSize ?? 96
  const fontWeight = options.fontWeight ?? 700
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (options.background) {
    ctx.fillStyle = options.background
    ctx.beginPath()
    ctx.roundRect(18, 42, canvas.width - 36, canvas.height - 84, 28)
    ctx.fill()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${fontWeight} ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  ctx.lineJoin = 'round'
  ctx.lineWidth = 8
  ctx.strokeStyle = options.stroke ?? 'rgba(255,255,255,.78)'
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 5)
  ctx.fillStyle = options.color ?? '#111111'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 5)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  const scale = options.scale ?? 1
  sprite.scale.set(5.0 * scale, 1.25 * scale, 1)
  sprite.renderOrder = 30
  return sprite
}

function createLayerBand(
  topY: number,
  bottomY: number,
  topHalfWidth: number,
  bottomHalfWidth: number,
  color: string,
  depth = 3.7,
) {
  const shape = new THREE.Shape()
  shape.moveTo(-topHalfWidth, topY)
  shape.lineTo(topHalfWidth, topY)
  shape.lineTo(bottomHalfWidth, bottomY)
  shape.lineTo(-bottomHalfWidth, bottomY)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  })
  geometry.translate(0, 0, -depth / 2)

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    new THREE.LineBasicMaterial({ color: '#2a1b13', transparent: true, opacity: 0.92 }),
  )
  edges.renderOrder = 8

  return { mesh, edges }
}

function createTerrainSurface() {
  const group = new THREE.Group()
  const xSegments = 72
  const zSegments = 14
  const xMin = -6.18
  const xMax = 2.18
  const zMin = -1.9
  const zMax = 1.9
  const soilBottomY = 4.03
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const topHeights: number[] = []
  const color = new THREE.Color()
  const vertexCountPerSurface = (xSegments + 1) * (zSegments + 1)

  const getTerrainHeight = (x: number, z: number) => {
    const highland = Math.exp(-Math.pow((x + 4.85) / 1.35, 2)) * 0.72
    const mountain = Math.exp(-Math.pow((x + 2.75) / 0.78, 2)) * 1.18
    const plain = Math.exp(-Math.pow((x + 0.55) / 1.9, 4)) * 0.25
    const textureNoise = Math.sin(x * 2.15 + z * 1.55) * 0.065 + Math.sin(x * 5.0 - z * 1.65) * 0.03
    return 4.08 + highland + mountain + plain + textureNoise
  }

  for (let zi = 0; zi <= zSegments; zi += 1) {
    const zRatio = zi / zSegments
    const z = zMin + (zMax - zMin) * zRatio
    for (let xi = 0; xi <= xSegments; xi += 1) {
      const xRatio = xi / xSegments
      const x = xMin + (xMax - xMin) * xRatio
      const y = getTerrainHeight(x, z)
      topHeights.push(y)
      positions.push(x, y, z)

      if (x < -3.75) color.set('#4d9149')
      else if (x < -1.85) color.set('#3b7342')
      else if (x < 0.95) color.set('#73ad55')
      else color.set('#98bd63')
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let zi = 0; zi <= zSegments; zi += 1) {
    const zRatio = zi / zSegments
    const z = zMin + (zMax - zMin) * zRatio
    for (let xi = 0; xi <= xSegments; xi += 1) {
      const xRatio = xi / xSegments
      const x = xMin + (xMax - xMin) * xRatio
      positions.push(x, soilBottomY, z)
      color.set('#7b532f')
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let zi = 0; zi < zSegments; zi += 1) {
    for (let xi = 0; xi < xSegments; xi += 1) {
      const a = zi * (xSegments + 1) + xi
      const b = a + 1
      const c = a + xSegments + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)

      const ba = a + vertexCountPerSurface
      const bb = b + vertexCountPerSurface
      const bc = c + vertexCountPerSurface
      const bd = d + vertexCountPerSurface
      indices.push(ba, bb, bc, bb, bd, bc)
    }
  }

  const addSideQuad = (topA: number, topB: number) => {
    const bottomA = topA + vertexCountPerSurface
    const bottomB = topB + vertexCountPerSurface
    indices.push(topA, bottomA, topB, topB, bottomA, bottomB)
  }

  for (let xi = 0; xi < xSegments; xi += 1) {
    addSideQuad(xi, xi + 1)
    const backA = zSegments * (xSegments + 1) + xi
    addSideQuad(backA + 1, backA)
  }
  for (let zi = 0; zi < zSegments; zi += 1) {
    const leftA = zi * (xSegments + 1)
    const leftB = (zi + 1) * (xSegments + 1)
    addSideQuad(leftB, leftA)

    const rightA = zi * (xSegments + 1) + xSegments
    const rightB = (zi + 1) * (xSegments + 1) + xSegments
    addSideQuad(rightA, rightB)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const terrainVolume = new THREE.Mesh(geometry, material)
  terrainVolume.castShadow = true
  terrainVolume.receiveShadow = true
  group.add(terrainVolume)

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: '#345c3d', roughness: 0.96 })
  const mountainData = [
    [-4.72, -0.95, 0.34, 0.78],
    [-4.25, -0.45, 0.42, 1.05],
    [-3.82, 0.1, 0.36, 0.88],
    [-3.48, -1.05, 0.31, 0.68],
    [-3.15, 0.75, 0.38, 0.92],
    [-2.82, -0.15, 0.49, 1.26],
    [-2.44, 0.45, 0.4, 1.02],
    [-2.1, -0.82, 0.31, 0.7],
  ]
  mountainData.forEach(([x, z, radius, height], index) => {
    const baseY = getTerrainHeight(x, z)
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 8, 1, false),
      mountainMaterial.clone(),
    )
    mountain.position.set(x, baseY + height * 0.5 - 0.02, z)
    mountain.rotation.y = (index * Math.PI) / 7
    mountain.castShadow = true
    mountain.receiveShadow = true
    group.add(mountain)
  })

  return group
}

function createDoubleArrow(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color = 0x23160f,
  headLength = 0.25,
  headWidth = 0.13,
) {
  const group = new THREE.Group()
  const direction = end.clone().sub(start).normalize()
  const reverse = direction.clone().multiplyScalar(-1)
  const length = start.distanceTo(end)

  const arrowA = new THREE.ArrowHelper(direction, start, length, color, headLength, headWidth)
  const arrowB = new THREE.ArrowHelper(reverse, end, length, color, headLength, headWidth)
  group.add(arrowA, arrowB)
  return group
}

function addWedgeLabels(root: THREE.Group) {
  wedgeLabelGroup = new THREE.Group()

  const labelItems: Array<{
    text: string
    position: [number, number, number]
    scale?: number
    color?: string
    fontSize?: number
    stroke?: string
  }> = [
    { text: '高原', position: [-4.95, 5.5, 2.18], scale: 0.5 },
    { text: '高山', position: [-2.75, 5.88, 2.18], scale: 0.5 },
    { text: '平原', position: [-0.55, 5.1, 2.18], scale: 0.5 },
    { text: '浅海', position: [2.0, 4.73, 2.18], scale: 0.5 },
    { text: '海平面', position: [4.45, 4.82, 2.18], scale: 0.53, color: '#0072cc' },
    { text: '莫霍面', position: [-4.58, 3.63, 2.18], scale: 0.47, color: '#0049d8' },
    { text: '平均约17千米', position: [-4.38, 3.92, 2.18], scale: 0.44 },
    { text: '50千米', position: [-4.08, 3.42, 2.18], scale: 0.44 },
    { text: '400千米', position: [-3.82, 2.67, 2.18], scale: 0.44 },
    { text: '1 000千米', position: [-3.34, 1.2, 2.18], scale: 0.47 },
    { text: '古登堡面', position: [-2.7, -1.43, 2.18], scale: 0.47, color: '#0049d8' },
    { text: '2 900千米', position: [-2.15, -1.06, 2.18], scale: 0.48 },
    { text: '5 100千米', position: [-0.82, -4.25, 2.18], scale: 0.48 },
    { text: '地壳（固态）', position: [1.55, 3.88, 2.2], scale: 0.58 },
    { text: '岩石圈', position: [-0.25, 3.47, 2.2], scale: 0.54 },
    { text: '（地壳与上地幔顶部）', position: [-0.25, 3.12, 2.2], scale: 0.43, fontSize: 60 },
    { text: '上地幔', position: [1.95, 2.65, 2.2], scale: 0.55 },
    { text: '软流层', position: [4.18, 2.95, 2.2], scale: 0.55 },
    { text: '地幔（固态）', position: [0.15, 1.52, 2.2], scale: 0.58 },
    { text: '下地幔', position: [3.15, 0.38, 2.2], scale: 0.55 },
    { text: '外核（接近液态）', position: [1.25, -2.73, 2.2], scale: 0.58 },
    { text: '地核', position: [2.2, -3.62, 2.2], scale: 0.56 },
    { text: '内核（固态）', position: [0.75, -4.85, 2.2], scale: 0.56 },
  ]

  labelItems.forEach((item) => {
    const label = createTextSprite(item.text, {
      color: item.color ?? '#17110c',
      fontSize: item.fontSize ?? 72,
      scale: (item.scale ?? 0.55) * 1.28,
      stroke: item.stroke ?? 'rgba(255,255,255,.75)',
    })
    label.position.set(...item.position)
    wedgeLabelGroup?.add(label)
  })

  root.add(wedgeLabelGroup)
}

function addWedgeArrows(root: THREE.Group) {
  const frontZ = 2.08
  const arrowMaterialColor = 0x2b170d

  root.add(createDoubleArrow(new THREE.Vector3(0.15, 3.55, frontZ), new THREE.Vector3(0.15, -0.72, frontZ), arrowMaterialColor, 0.26, 0.14))
  root.add(createDoubleArrow(new THREE.Vector3(2.45, 3.46, frontZ), new THREE.Vector3(2.45, 2.48, frontZ), arrowMaterialColor, 0.2, 0.11))
  root.add(createDoubleArrow(new THREE.Vector3(3.4, 2.44, frontZ), new THREE.Vector3(3.4, -0.72, frontZ), arrowMaterialColor, 0.24, 0.13))
  root.add(createDoubleArrow(new THREE.Vector3(1.12, -0.82, frontZ), new THREE.Vector3(1.12, -4.0, frontZ), arrowMaterialColor, 0.24, 0.13))
  root.add(createDoubleArrow(new THREE.Vector3(0.58, -4.05, frontZ), new THREE.Vector3(0.58, -5.45, frontZ), arrowMaterialColor, 0.2, 0.11))
}

function initWedgeScene() {
  const container = wedgeContainerRef.value
  if (!container || wedgeBundle) return

  const scene = new THREE.Scene()
  scene.background = createBackgroundTexture()

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 160)
  camera.position.set(11.8, 7.2, 16.2)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.minDistance = 8
  controls.maxDistance = 30
  controls.target.set(0, -0.1, 0)
  controls.maxPolarAngle = Math.PI * 0.92

  scene.add(new THREE.HemisphereLight(0xdaf7ff, 0x5a311c, 1.55))

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
  keyLight.position.set(8, 13, 10)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  scene.add(keyLight)

  const fillLight = new THREE.PointLight(0x50a6ff, 1.45, 30, 2)
  fillLight.position.set(-9, 5, 8)
  scene.add(fillLight)

  const root = new THREE.Group()
  root.rotation.copy(wedgeRootBaseRotation)
  root.position.y = 0.2
  scene.add(root)

  wedgeBoundaryGroup = new THREE.Group()
  const wedgeTopY = 4.08
  const wedgeBottomY = -5.52
  const wedgeTopHalfWidth = 6.18
  const wedgeBottomHalfWidth = 0.02
  const getWedgeHalfWidth = (y: number) => {
    const ratio = (wedgeTopY - y) / (wedgeTopY - wedgeBottomY)
    return THREE.MathUtils.lerp(wedgeTopHalfWidth, wedgeBottomHalfWidth, ratio)
  }
  const bands = [
    { top: 4.08, bottom: 3.54, color: '#a97848' },
    { top: 3.54, bottom: 2.52, color: '#e87548' },
    { top: 2.52, bottom: -0.78, color: '#e26d35' },
    { top: -0.78, bottom: -4.0, color: '#efa83c' },
    { top: -4.0, bottom: -5.52, color: '#f3d36a' },
  ]

  bands.forEach((band) => {
    const { mesh, edges } = createLayerBand(
      band.top,
      band.bottom,
      getWedgeHalfWidth(band.top),
      getWedgeHalfWidth(band.bottom),
      band.color,
      3.8,
    )
    root.add(mesh)
    wedgeBoundaryGroup?.add(edges)
  })
  root.add(wedgeBoundaryGroup)

  wedgeTerrainGroup = createTerrainSurface()

  const oceanStartX = 2.15
  const oceanEndX = 6.08
  const oceanBottomY = 4.03
  const oceanSurfaceY = 4.08
  const oceanVolume = new THREE.Mesh(
    new THREE.BoxGeometry(oceanEndX - oceanStartX, oceanSurfaceY - oceanBottomY, 3.82),
    new THREE.MeshPhysicalMaterial({
      color: '#168fbd',
      transparent: true,
      opacity: 0.76,
      roughness: 0.22,
      metalness: 0.03,
      transmission: 0.08,
      side: THREE.DoubleSide,
    }),
  )
  oceanVolume.position.set((oceanStartX + oceanEndX) / 2, (oceanSurfaceY + oceanBottomY) / 2, 0)
  oceanVolume.receiveShadow = true
  wedgeTerrainGroup.add(oceanVolume)
  root.add(wedgeTerrainGroup)

  const waterNormals = createWaterNormalTexture()
  wedgeWater = new Water(new THREE.PlaneGeometry(oceanEndX - oceanStartX, 3.82, 1, 1), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals,
    sunDirection: new THREE.Vector3(0.6, 0.75, 0.4).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x189cc4,
    distortionScale: 2.8,
    fog: false,
    alpha: 0.92,
  })
  wedgeWater.rotation.x = -Math.PI / 2
  wedgeWater.position.set((oceanStartX + oceanEndX) / 2, oceanSurfaceY + 0.005, 0)
  wedgeWater.receiveShadow = true
  root.add(wedgeWater)

  addWedgeLabels(root)
  addWedgeArrows(root)

  wedgeBundle = {
    scene,
    camera,
    renderer,
    controls,
    root,
    resizeObserver: null,
    lastWidth: -1,
    lastHeight: -1,
  }

  const observer = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  observer.observe(container)
  wedgeBundle.resizeObserver = observer
}

function resizeCanvasElement(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || canvas.clientWidth))
  const height = Math.max(1, Math.round(rect.height || canvas.clientHeight))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, width, height }
}

function drawSeismogramCanvas() {
  const canvas = seismogramCanvasRef.value
  if (!canvas || stageMode.value !== 'seismic') return
  const { ctx, width, height } = resizeCanvasElement(canvas)
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)

  const pad = { left: 48, right: 18, top: 10, bottom: 40 }
  const chartWidth = Math.max(1, width - pad.left - pad.right)
  const chartHeight = Math.max(1, height - pad.top - pad.bottom)
  const xMin = 0
  const xMax = 35
  const yMin = -10
  const yMax = 7
  const yToCanvas = (value: number) =>
    pad.top + ((yMax - value) / (yMax - yMin)) * chartHeight
  const xToCanvas = (value: number) =>
    pad.left + ((value - xMin) / (xMax - xMin)) * chartWidth
  const baseY = yToCanvas(0)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#4f5962'
  ctx.lineWidth = 1.15
  ctx.beginPath()
  ctx.moveTo(pad.left, yToCanvas(yMin))
  ctx.lineTo(pad.left, yToCanvas(yMax) + 2)
  ctx.moveTo(pad.left, yToCanvas(yMax) + 2)
  ctx.lineTo(pad.left - 4, yToCanvas(yMax) + 10)
  ctx.moveTo(pad.left, yToCanvas(yMax) + 2)
  ctx.lineTo(pad.left + 4, yToCanvas(yMax) + 10)
  ctx.moveTo(pad.left, yToCanvas(yMin))
  ctx.lineTo(pad.left + chartWidth, yToCanvas(yMin))
  ctx.moveTo(pad.left + chartWidth, yToCanvas(yMin))
  ctx.lineTo(pad.left + chartWidth - 8, yToCanvas(yMin) - 4)
  ctx.moveTo(pad.left + chartWidth, yToCanvas(yMin))
  ctx.lineTo(pad.left + chartWidth - 8, yToCanvas(yMin) + 4)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(79,89,98,.18)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, baseY)
  ctx.lineTo(pad.left + chartWidth, baseY)
  ctx.stroke()

  ctx.strokeStyle = '#4f5962'
  ctx.fillStyle = '#2d3942'
  ctx.font = '11px Microsoft YaHei'
  ctx.textAlign = 'right'
  ;[-10, -5, 0, 5].forEach((v) => {
    const y = yToCanvas(v)
    ctx.beginPath()
    ctx.moveTo(pad.left - 8, y)
    ctx.lineTo(pad.left, y)
    ctx.stroke()
    if (v !== 0) ctx.fillText(String(v), pad.left - 12, y + 4)
    else ctx.fillText('0', pad.left - 12, y + 4)
  })

  for (let v = yMin; v <= yMax; v += 1) {
    if (v === -10 || v === -5 || v === 0 || v === 5) continue
    const y = yToCanvas(v)
    ctx.beginPath()
    ctx.moveTo(pad.left - 4, y)
    ctx.lineTo(pad.left, y)
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  for (let second = 0; second <= 35; second += 1) {
    const x = xToCanvas(second)
    const tickSize = second % 5 === 0 ? 8 : 4
    ctx.beginPath()
    ctx.moveTo(x, yToCanvas(yMin))
    ctx.lineTo(x, yToCanvas(yMin) - tickSize)
    ctx.stroke()
    if (second < 35 && second % 5 === 0 && second !== 0) {
      ctx.fillText(String(second), x, height - 12)
    }
  }
  ctx.fillText('35', xToCanvas(35), height - 12)
  ctx.fillText('地震发生时间/s', pad.left + chartWidth * 0.56, height - 1)
  ctx.save()
  ctx.translate(15, pad.top + chartHeight * 0.52)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('振幅/mm', 0, 0)
  ctx.restore()

  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const effectiveSpeed = animationSpeed.value * playbackSpeed.value * teachingFactor
  const cycle = isPlaying.value ? (elapsed * 0.13 * effectiveSpeed) % 1 : progress.value / 100
  const maxX = Math.max(4, chartWidth * cycle)

  const sampleAmplitude = (time: number) => {
    let envelope = 0
    if (time < 6.8) envelope = 0.02
    else if (time < 9.5) envelope = 0.18 * ((time - 6.8) / 2.7)
    else if (time < 12.8) envelope = 0.42 * ((time - 9.5) / 3.3)
    else if (time < 15.8) envelope = 1.25 * ((time - 12.8) / 3)
    else if (time < 18.8) envelope = 1.2 - 0.2 * ((time - 15.8) / 3)
    else if (time < 22.5) envelope = 0.9 * Math.exp(-(time - 18.8) / 2.2)
    else if (time < 32) envelope = 0.18 * Math.exp(-(time - 22.5) / 10)
    else envelope = 0.06 * Math.exp(-(time - 32) / 2)

    const wave =
      Math.sin(time * 10.4) * 0.72 +
      Math.sin(time * 21.6 + 0.8) * 0.22 +
      Math.sin(time * 31.4 + 0.2) * 0.06

    let bias = 0
    if (time > 14 && time < 20) bias = -0.35 * Math.sin(((time - 14) / 6) * Math.PI)
    return wave * envelope * 6.2 + bias
  }

  ctx.beginPath()
  for (let x = 0; x <= maxX; x += 1) {
    const time = (x / chartWidth) * xMax
    const amplitude = sampleAmplitude(time)
    const y = yToCanvas(amplitude)
    if (x === 0) ctx.moveTo(pad.left + x, y)
    else ctx.lineTo(pad.left + x, y)
  }
  ctx.strokeStyle = '#ef6a54'
  ctx.lineWidth = 1.7
  ctx.stroke()

  const pX = xToCanvas(8.8)
  const sX = xToCanvas(12.8)
  ctx.strokeStyle = '#17212b'
  ctx.fillStyle = '#17212b'
  ctx.lineWidth = 1.15

  const drawArrival = (
    x: number,
    label: string,
    startY: number,
    labelX: number,
    labelY: number,
  ) => {
    const arrowTipY = baseY - 2
    ctx.beginPath()
    ctx.moveTo(x, startY)
    ctx.lineTo(x, arrowTipY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, arrowTipY)
    ctx.lineTo(x - 4, arrowTipY + 8)
    ctx.lineTo(x + 4, arrowTipY + 8)
    ctx.closePath()
    ctx.fill()
    ctx.font = '12px Microsoft YaHei'
    ctx.textAlign = 'left'
    ctx.fillText(label, labelX, labelY)
  }

  drawArrival(pX, 'P波到达', baseY + 22, pX - 4, baseY + 30)
  drawArrival(sX, 'S波到达', baseY + 44, sX - 14, baseY + 54)
}

function drawSeismicCanvases() {
  drawSeismogramCanvas()
}

function createWaveTunnel(
  root: THREE.Group,
  row: 'P' | 'S',
  baseY: number,
  particleColor: string,
  tunnelColor: string,
) {
  const tunnel = new THREE.Mesh(
    new THREE.BoxGeometry(30, 5.7, 5),
    new THREE.MeshBasicMaterial({ color: tunnelColor, transparent: true, opacity: 0.62 }),
  )
  tunnel.position.set(0, baseY, 0)
  root.add(tunnel)

  const endWall = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 5.9, 5.3),
    new THREE.MeshStandardMaterial({ color: '#80674d', roughness: 0.82, metalness: 0.05 }),
  )
  endWall.position.set(15.4, baseY, 0)
  root.add(endWall)

  const material = new THREE.MeshStandardMaterial({
    color: particleColor,
    emissive: new THREE.Color(particleColor),
    emissiveIntensity: 0.2,
    roughness: 0.44,
    metalness: 0.1,
  })

  const rows = 4
  const columns = 30
  const startX = -13.3
  const startY = baseY - 1.55
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.72, 0.75), material.clone())
      mesh.position.set(startX + x * 0.92, startY + y * 1.03, 0)
      mesh.castShadow = true
      root.add(mesh)
      wavePoints.push({ mesh, origin: mesh.position.clone(), row, columnIndex: x })
    }
  }

  const arrowColor = row === 'P' ? 0xf2a044 : 0x6ca8fa
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-13.3, baseY + 3.25, 0.1),
    26.6,
    arrowColor,
    0.9,
    0.48,
  )
  root.add(arrow)
}

function initWaveScene() {
  const container = waveContainerRef.value
  if (!container || waveBundle) return

  const scene = new THREE.Scene()
  scene.background = createBackgroundTexture()

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220)
  camera.position.set(21, 10, 27)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 13
  controls.maxDistance = 48
  controls.target.set(0, 0, 0)

  scene.add(new THREE.HemisphereLight(0xc8efff, 0x12314a, 1.35))

  const light = new THREE.DirectionalLight(0xffffff, 1.4)
  light.position.set(12, 16, 10)
  light.castShadow = true
  scene.add(light)
  scene.add(new THREE.AmbientLight(0x5b9fff, 0.42))

  const root = new THREE.Group()
  root.rotation.copy(waveRootBaseRotation)
  scene.add(root)

  createWaveTunnel(root, 'P', 6.6, '#f0a254', '#17314b')
  createWaveTunnel(root, 'S', -7.9, '#6fa9f5', '#17304a')

  waveBundle = {
    scene,
    camera,
    renderer,
    controls,
    root,
    resizeObserver: null,
    lastWidth: -1,
    lastHeight: -1,
  }

  const observer = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  observer.observe(container)
  waveBundle.resizeObserver = observer
}

function updateWavePoints(time: number) {
  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const playFactor = isPlaying.value ? 1 : 0
  const speed = animationSpeed.value * playbackSpeed.value * teachingFactor * playFactor
  const amplitude = waveAmplitude.value
  const frequency = waveFrequency.value

  wavePoints.forEach((point) => {
    point.mesh.position.copy(point.origin)
    point.mesh.scale.set(1, 1, 1)

    const movingCenter = (time * speed * 4.1) % 34
    const envelope = Math.exp(-Math.pow((point.columnIndex - movingCenter) / 5.5, 2))
    const phase = point.columnIndex * 0.58 * frequency - time * speed * 3.3

    if (point.row === 'P') {
      const displacement = Math.sin(phase) * 0.52 * amplitude * envelope
      point.mesh.position.x = point.origin.x + displacement
      point.mesh.scale.x = 1 + Math.cos(phase) * 0.32 * amplitude * envelope
    } else {
      const displacement = Math.sin(phase) * 1.12 * amplitude * envelope
      point.mesh.position.y = point.origin.y + displacement
      point.mesh.scale.y = 1 + Math.abs(displacement) * 0.15
    }
  })
}

function resizeBundle(bundle: SceneBundle | null, container: HTMLElement | null, active: boolean) {
  if (!bundle || !container || !active) return

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || container.clientWidth))
  const height = Math.max(1, Math.round(rect.height || container.clientHeight))
  if (width === bundle.lastWidth && height === bundle.lastHeight) {
    bundle.renderer.render(bundle.scene, bundle.camera)
    return
  }

  bundle.lastWidth = width
  bundle.lastHeight = height
  bundle.camera.aspect = width / height
  bundle.camera.updateProjectionMatrix()
  bundle.renderer.setSize(width, height, false)
  bundle.renderer.render(bundle.scene, bundle.camera)
}

function resizeSurfaceCanvas() {
  const canvas = surfaceWaveCanvasRef.value
  if (!canvas || stageMode.value !== 'wave' || waveMode.value !== 'surface') return
  const parent = canvas.parentElement
  if (!parent) return

  const width = Math.max(1, Math.round(parent.clientWidth))
  const height = Math.max(1, Math.round(parent.clientHeight))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetWidth = Math.round(width * dpr)
  const targetHeight = Math.round(height * dpr)

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
  drawSurfaceWaveCanvas()
}

function scheduleSceneResize(delay = 80) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return

    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeBundle(wedgeBundle, wedgeContainerRef.value, stageMode.value === 'earth')
        resizeBundle(waveBundle, waveContainerRef.value, stageMode.value === 'wave' && waveMode.value === 'body')
        resizeSurfaceCanvas()
        drawSeismicCanvases()
      })
    })
  }, delay)
}

function applyView(view: ViewKey) {
  currentView.value = view

  if (stageMode.value === 'earth' && wedgeBundle) {
    if (view === 'front') {
      wedgeBundle.camera.position.set(0, 0.4, 19.2)
    } else if (view === 'top') {
      wedgeBundle.camera.position.set(0, 18, 0.1)
    } else {
      wedgeBundle.camera.position.set(11.8, 7.2, 16.2)
    }
    wedgeBundle.controls.target.set(0, -0.1, 0)
    wedgeBundle.controls.update()
    wedgeBundle.renderer.render(wedgeBundle.scene, wedgeBundle.camera)
  }

  if (stageMode.value === 'wave' && waveMode.value === 'body' && waveBundle) {
    if (view === 'front') {
      waveBundle.camera.position.set(0, 0, 33)
    } else if (view === 'top') {
      waveBundle.camera.position.set(0, 27, 0.1)
    } else {
      waveBundle.camera.position.set(21, 10, 27)
    }
    waveBundle.controls.target.set(0, 0, 0)
    waveBundle.controls.update()
    waveBundle.renderer.render(waveBundle.scene, waveBundle.camera)
  }
}

function drawArrow2D(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - 11 * Math.cos(angle - Math.PI / 6), y2 - 11 * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - 11 * Math.cos(angle + Math.PI / 6), y2 - 11 * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

function drawSurfaceWaveCanvas() {
  const canvas = surfaceWaveCanvasRef.value
  if (!canvas || stageMode.value !== 'wave' || waveMode.value !== 'surface') return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const movement = isPlaying.value ? elapsed * animationSpeed.value * playbackSpeed.value * teachingFactor : progress.value * 0.04
  const amplitude = 48 * waveAmplitude.value
  const frequency = waveFrequency.value
  const left = Math.max(58, width * 0.07)
  const right = width - left
  const chartWidth = right - left
  const topBase = height * 0.28
  const bottomBase = height * 0.64

  const bg = ctx.createRadialGradient(width * 0.52, height * 0.44, 10, width * 0.52, height * 0.44, width * 0.78)
  bg.addColorStop(0, '#102d45')
  bg.addColorStop(0.55, '#07182a')
  bg.addColorStop(1, '#020b14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#f29a42'
  ctx.font = `700 ${Math.max(18, width * 0.024)}px Microsoft YaHei`
  ctx.textAlign = 'right'
  ctx.fillText('纵波', right, 52)
  ctx.fillStyle = '#4c80ff'
  ctx.fillText('横波', right, bottomBase + amplitude + 75)

  ctx.fillStyle = 'rgba(235,246,255,.9)'
  ctx.font = `600 ${Math.max(13, width * 0.013)}px Microsoft YaHei`
  ctx.textAlign = 'left'
  ctx.fillText('第1个平衡位置', left, 42)
  ctx.fillText('平衡位置', 10, bottomBase - 12)

  const segments = 105
  for (let index = 0; index < segments; index += 1) {
    const baseX = left + (index / (segments - 1)) * chartWidth
    const compression = Math.sin(index * 0.55 * frequency - movement * 4.2)
    const x = baseX + compression * 8 * waveAmplitude.value
    const density = (compression + 1) / 2
    ctx.strokeStyle = `rgba(238,126,38,${0.28 + density * 0.72})`
    ctx.lineWidth = 1.2 + density * 2.1
    ctx.beginPath()
    ctx.moveTo(x, topBase - 55)
    ctx.lineTo(x, topBase + 55)
    ctx.stroke()
  }

  ctx.setLineDash([7, 6])
  ctx.strokeStyle = 'rgba(230,244,255,.55)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(left, bottomBase)
  ctx.lineTo(right, bottomBase)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.beginPath()
  for (let x = 0; x <= chartWidth; x += 3) {
    const y = bottomBase + Math.sin((x / chartWidth) * Math.PI * 4 * frequency - movement * 3.3) * amplitude
    if (x === 0) ctx.moveTo(left + x, y)
    else ctx.lineTo(left + x, y)
  }
  ctx.strokeStyle = '#2453c0'
  ctx.lineWidth = 4
  ctx.stroke()

  drawArrow2D(ctx, left + chartWidth * 0.12, topBase + 84, left + chartWidth * 0.3, topBase + 84, '#f29a42', 2.4)
  ctx.fillStyle = '#f4b06f'
  ctx.font = `500 ${Math.max(12, width * 0.012)}px Microsoft YaHei`
  ctx.textAlign = 'center'
  ctx.fillText('质点振动方向与传播方向一致', left + chartWidth * 0.21, topBase + 111)

  drawArrow2D(ctx, left + chartWidth * 0.31, bottomBase, left + chartWidth * 0.31, bottomBase - amplitude, '#62d179', 2.4)
  ctx.fillStyle = '#7ee892'
  ctx.fillText('振幅', left + chartWidth * 0.31 + 28, bottomBase - amplitude * 0.48)

  const waveStart = left + chartWidth * 0.42
  const waveEnd = left + chartWidth * (0.42 + 0.5 / frequency)
  drawArrow2D(ctx, waveStart, bottomBase + amplitude + 35, waveEnd, bottomBase + amplitude + 35, '#ffffff', 2)
  drawArrow2D(ctx, waveEnd, bottomBase + amplitude + 35, waveStart, bottomBase + amplitude + 35, '#ffffff', 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('波长', (waveStart + waveEnd) / 2, bottomBase + amplitude + 60)
}

function updateVisibility() {
  if (wedgeLabelGroup) wedgeLabelGroup.visible = showLabels.value
  if (wedgeBoundaryGroup) wedgeBoundaryGroup.visible = showBoundaries.value
  if (wedgeTerrainGroup) wedgeTerrainGroup.visible = showTerrain.value
  if (wedgeWater) wedgeWater.visible = showTerrain.value
}

function setStageMode(mode: StageMode) {
  stageMode.value = mode
  progress.value = 0
  isPlaying.value = mode !== 'lithosphere'
  if (mode === 'earth') selectedKnowledge.value = 'crust'
  if (mode === 'seismic') selectedKnowledge.value = 'mantle'
  if (mode === 'wave') selectedKnowledge.value = 'core'
  if (mode === 'lithosphere') selectedKnowledge.value = 'crust'

  nextTick(() => {
    applyView('default')
    scheduleSceneResize(20)
  })
}

function setWaveMode(mode: WaveMode) {
  waveMode.value = mode
  progress.value = 0
  nextTick(() => {
    applyView('default')
    scheduleSceneResize(20)
  })
}

function resetScene() {
  setAllCollapsed(false)
  resetWidths()
  stageMode.value = 'earth'
  waveMode.value = 'body'
  selectedKnowledge.value = 'crust'
  showLabels.value = true
  showBoundaries.value = true
  showTerrain.value = true
  autoRotate.value = true
  slowTeachingMode.value = false
  animationSpeed.value = 1
  waveAmplitude.value = 1
  waveFrequency.value = 1
  isPlaying.value = true
  progress.value = 0
  playbackSpeed.value = 1
  currentView.value = 'default'

  if (wedgeBundle) wedgeBundle.root.rotation.copy(wedgeRootBaseRotation)
  if (waveBundle) waveBundle.root.rotation.copy(waveRootBaseRotation)
  updateVisibility()

  nextTick(() => {
    applyView('default')
    scheduleSceneResize(40)
  })
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  const delta = Math.min(sceneClock.getDelta(), 0.05)
  const teachingFactor = slowTeachingMode.value ? 0.45 : 1
  const effectiveSpeed = animationSpeed.value * playbackSpeed.value * teachingFactor
  elapsed += delta * effectiveSpeed

  if (isPlaying.value) {
    progress.value = (progress.value + delta * effectiveSpeed * 7) % 100
  }

  if (wedgeWater) {
    const material = wedgeWater.material as THREE.ShaderMaterial
    if (material.uniforms.time) {
      material.uniforms.time.value += delta * 0.45 * effectiveSpeed
    }
  }

  if (stageMode.value === 'earth' && wedgeBundle) {
    if (autoRotate.value && isPlaying.value) {
      wedgeBundle.root.rotation.y += delta * 0.055 * effectiveSpeed
    }
    wedgeBundle.controls.update()
    wedgeBundle.renderer.render(wedgeBundle.scene, wedgeBundle.camera)
  }

  if (stageMode.value === 'seismic') {
    drawSeismicCanvases()
  }

  if (stageMode.value === 'wave' && waveMode.value === 'body' && waveBundle) {
    updateWavePoints(elapsed)
    if (autoRotate.value && isPlaying.value) {
      waveBundle.root.rotation.y = waveRootBaseRotation.y + Math.sin(elapsed * 0.18) * 0.08
    }
    waveBundle.controls.update()
    waveBundle.renderer.render(waveBundle.scene, waveBundle.camera)
  }

  if (stageMode.value === 'wave' && waveMode.value === 'surface') {
    drawSurfaceWaveCanvas()
  }
}

function disposeBundle(bundle: SceneBundle | null) {
  if (!bundle) return
  bundle.resizeObserver?.disconnect()
  bundle.controls.dispose()
  bundle.scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
      if ('geometry' in object && object.geometry) object.geometry.dispose()
      if ('material' in object && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          const map = (material as THREE.MeshStandardMaterial).map
          if (map) map.dispose()
          material.dispose()
        })
      }
    }
  })
  bundle.renderer.dispose()
  if (bundle.renderer.domElement.parentElement) {
    bundle.renderer.domElement.parentElement.removeChild(bundle.renderer.domElement)
  }
}

watch(showLabels, updateVisibility)
watch(showBoundaries, updateVisibility)
watch(showTerrain, updateVisibility)
watch([waveAmplitude, waveFrequency], () => {
  if (stageMode.value === 'wave' && waveMode.value === 'surface') drawSurfaceWaveCanvas()
})

onMounted(async () => {
  await nextTick()
  initWedgeScene()
  initWaveScene()
  updateVisibility()

  surfaceResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  if (surfaceWaveCanvasRef.value?.parentElement) {
    surfaceResizeObserver.observe(surfaceWaveCanvasRef.value.parentElement)
  }

  seismicCanvasResizeObserver = new ResizeObserver(() => {
    if (draggingSide.value || viewportResizing.value) return
    scheduleSceneResize(100)
  })
  if (seismogramCanvasRef.value?.parentElement) {
    seismicCanvasResizeObserver.observe(seismogramCanvasRef.value.parentElement)
  }

  scheduleSceneResize(0)
  sceneClock.start()
  animationFrameId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  surfaceResizeObserver?.disconnect()
  surfaceResizeObserver = null
  seismicCanvasResizeObserver?.disconnect()
  seismicCanvasResizeObserver = null
  disposeBundle(wedgeBundle)
  disposeBundle(waveBundle)
  wedgeBundle = null
  waveBundle = null
  wedgeWater = null
  wedgeLabelGroup = null
  wedgeBoundaryGroup = null
  wedgeTerrainGroup = null
  wavePoints = []
})
</script>

<style scoped>
.layers-inside-the-earth-container .workspace.panel-resizing,
.layers-inside-the-earth-container .workspace.layout-resizing,
.layers-inside-the-earth-container .workspace.panel-resizing .side-panel,
.layers-inside-the-earth-container .workspace.layout-resizing .side-panel,
.layers-inside-the-earth-container .workspace.panel-resizing .center-stage,
.layers-inside-the-earth-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.layers-inside-the-earth-container .center-stage,
.layers-inside-the-earth-container .stage-content,
.layers-inside-the-earth-container .earth-stage-content {
  min-width: 0;
  min-height: 0;
}

.earth-stage-content {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.wedge-three-host,
.wave-three-host,
.surface-wave-canvas,
.seismic-stage,
.static-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wedge-three-host,
.wave-three-host,
.seismic-three-host {
  display: block;
  min-width: 0;
  min-height: 0;
}

.three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.surface-wave-canvas {
  display: block;
}

.function-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(7px, 0.65vw, 10px);
}

.function-btn {
  display: grid;
  width: 100%;
  min-height: clamp(42px, 3.8vw, 54px);
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  justify-items: start;
  gap: clamp(8px, 0.7vw, 11px);
  padding-inline: clamp(10px, 1vw, 14px);
  text-align: left;
}

.function-index {
  display: inline-flex;
  min-width: 28px;
  align-items: center;
  justify-content: center;
  font-family: "DIN Alternate", "Arial Narrow", sans-serif;
  font-size: 0.84em;
  opacity: 0.74;
}

.wave-mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wave-mode-btn {
  min-height: clamp(46px, 4vw, 58px);
  line-height: 1.45;
  white-space: normal;
}

.view-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: clamp(9px, 0.8vw, 12px);
}

.stage-title-card {
  position: absolute;
  z-index: 8;
  top: clamp(14px, 1.4vw, 22px);
  left: clamp(14px, 1.4vw, 22px);
  display: flex;
  max-width: min(48%, 480px);
  flex-direction: column;
  gap: 4px;
  padding: clamp(10px, 0.9vw, 14px) clamp(12px, 1.1vw, 17px);
  pointer-events: none;
  color: var(--text-primary);
  background: rgba(4, 17, 29, 0.74);
  border: 1px solid rgba(120, 223, 255, 0.18);
  border-radius: clamp(9px, 0.8vw, 12px);
  backdrop-filter: blur(12px);
}

.stage-title-card > span {
  color: #68d9cc;
  font-size: clamp(9px, 0.65vw, 11px);
  font-weight: 800;
  letter-spacing: 0.16em;
}

.stage-title-card > strong {
  font-size: clamp(15px, 1.15vw, 22px);
  line-height: 1.35;
}

.stage-title-card > small {
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
  line-height: 1.55;
}

.stage-legend {
  position: absolute;
  z-index: 8;
  top: clamp(14px, 1.4vw, 22px);
  right: clamp(14px, 1.4vw, 22px);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 13px;
  color: #edfaff;
  font-size: clamp(10px, 0.72vw, 12px);
  background: rgba(4, 17, 29, 0.74);
  border: 1px solid rgba(120, 223, 255, 0.18);
  border-radius: 10px;
  backdrop-filter: blur(12px);
}

.stage-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.longitudinal-dot {
  background: #f2a044;
  box-shadow: 0 0 10px rgba(242, 160, 68, 0.72);
}

.transverse-dot {
  background: #6ca8fa;
  box-shadow: 0 0 10px rgba(108, 168, 250, 0.72);
}

.body-wave-label {
  position: absolute;
  z-index: 8;
  left: 50%;
  display: flex;
  width: min(48%, 520px);
  min-width: 320px;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  transform: translateX(-50%);
  color: #f7fbff;
  font-size: clamp(16px, 1.22vw, 24px);
  line-height: 1.4;
  font-weight: 800;
  text-align: center;
  white-space: nowrap;
  background: rgba(3, 17, 30, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  box-sizing: border-box;
  pointer-events: none;
}

.body-wave-label-top {
  top: 17%;
  color: #ffd09a;
  border-color: rgba(242, 160, 68, 0.45);
}

.body-wave-label-bottom {
  bottom: 9%;
  color: #cfe2ff;
  border-color: rgba(108, 168, 250, 0.45);
}

.interaction-tip {
  position: absolute;
  z-index: 8;
  right: clamp(12px, 1.2vw, 18px);
  bottom: clamp(12px, 1.2vw, 18px);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 13px;
  pointer-events: none;
  color: rgba(221, 242, 255, 0.76);
  font-size: clamp(9px, 0.67vw, 11px);
  white-space: nowrap;
  background: rgba(4, 17, 29, 0.66);
  border: 1px solid rgba(120, 223, 255, 0.15);
  border-radius: 999px;
}

.mouse-icon {
  color: #56d5c4;
  font-size: 15px;
}

.static-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 82px 20px 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at 52% 42%, rgba(17, 51, 77, 0.34), transparent 55%),
    #041321;
}


.seismic-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(76px, 7vh, 92px) clamp(12px, 1.2vw, 20px) clamp(18px, 1.6vw, 26px);
  box-sizing: border-box;
  overflow: hidden;
  background:
    radial-gradient(circle at 58% 42%, rgba(19, 57, 84, 0.26), transparent 58%),
    #041321;
}

.seismic-reference-frame {
  position: relative;
  width: min(100%, 1480px);
  max-height: 100%;
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(96, 215, 207, 0.2);
  border-radius: 12px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.3);
}

.seismic-reference-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.seismic-chart-card {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 7px;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.98);
  border: 2px solid #62c987;
  border-radius: 9px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
}

.seismic-overlay-card {
  position: absolute;
  z-index: 3;
  left: 1.1%;
  bottom: 2.6%;
  width: 30.8%;
  height: 31.5%;
}

.static-card-title {
  flex: 0 0 auto;
  margin-bottom: 3px;
  color: #152631;
  font-size: clamp(10px, 0.74vw, 14px);
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
}

.seismic-chart-canvas {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1 1 0;
}

.lithosphere-stage {
  padding: 84px 22px 24px;
}

.lithosphere-diagram-image {
  display: block;
  width: min(100%, 1220px);
  max-height: 100%;
  object-fit: contain;
  aspect-ratio: auto;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
}

.knowledge-selector-card {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.75vw, 11px);
}

.knowledge-tab-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(7px, 0.65vw, 10px);
}

.knowledge-tab-btn {
  min-width: 0;
}

.layer-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.current-knowledge-card {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 0.8vw, 12px);
}

.knowledge-heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.knowledge-heading-row h3 {
  margin: 3px 0 0;
  color: var(--text-primary);
  font-size: clamp(17px, 1.15vw, 23px);
}

.knowledge-kicker {
  color: #61d7c7;
  font-size: clamp(8px, 0.58vw, 10px);
  font-weight: 800;
  letter-spacing: 0.14em;
}

.depth-badge {
  flex: 0 0 auto;
  padding: 4px 7px;
  color: #ffd47c;
  font-size: clamp(9px, 0.65vw, 11px);
  background: rgba(255, 180, 55, 0.1);
  border: 1px solid rgba(255, 180, 55, 0.24);
  border-radius: 6px;
}

.current-knowledge-card > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.73vw, 12px);
  line-height: 1.75;
}

.current-knowledge-card ul {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.72vw, 12px);
  line-height: 1.65;
}

.current-knowledge-card li::marker {
  color: #54d2c1;
}

.wave-compare-table {
  display: grid;
  gap: 1px;
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid rgba(117, 220, 229, 0.14);
  border-radius: 7px;
}

.wave-compare-row {
  display: grid;
  grid-template-columns: 0.8fr 1.35fr 1fr 0.65fr;
  gap: 6px;
  padding: 7px 6px;
  color: var(--text-secondary);
  font-size: clamp(9px, 0.63vw, 11px);
  background: rgba(255, 255, 255, 0.025);
}

.wave-compare-head {
  color: var(--text-primary);
  font-weight: 700;
  background: rgba(46, 196, 182, 0.08);
}

.boundary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.boundary-list p {
  margin: 0;
}

@media (max-width: 1180px) {
  .stage-title-card {
    max-width: 58%;
  }

  .body-wave-label {
    width: min(62%, 520px);
  }

  .interaction-tip {
    display: none;
  }

}

@media (max-width: 760px) {
  .view-grid,
  .wave-mode-grid,
  .knowledge-tab-grid {
    grid-template-columns: 1fr;
  }

  .stage-title-card {
    max-width: calc(100% - 28px);
  }

  .body-wave-label {
    width: calc(100% - 32px);
    min-width: 0;
    font-size: 15px;
    white-space: normal;
  }

  .seismic-stage {
    padding-inline: 8px;
  }

  .seismic-reference-frame {
    width: 100%;
  }

  .seismic-overlay-card {
    left: 1%;
    bottom: 2.2%;
    width: 32%;
    height: 33%;
  }
}
</style>
