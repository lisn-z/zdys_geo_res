<template>
  <div ref="rootRef" class="soil-profile-page geo-template-page geo-page theme-light" :class="'layout-' + layoutMode">
    <header class="top-toolbar soil-template-header">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="智地有申" />
      </div>

      <h1 class="page-title">土壤剖析</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAnalysisPanel">
          {{ analysisPanelCollapsed ? '展开分析面板' : '收起分析面板' }}
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleLeftPanel">
          {{ leftCollapsed ? '展开左侧面板' : '收起左侧面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" :class="{ 'has-left': true }" :style="{
      '--left-panel-width': leftCollapsed
        ? '0px'
        : leftPanelWidth + 'px'
    }">
      <aside class="side-panel left-panel" :class="{ collapsed: leftCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>场景控制</h2>
              <p>调整土壤剖面发生条件与演化参数</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <div v-if="!compareMode" class="controls-scroll">
            <section class="control-section">
              <div class="section-title">
                <LucideIcon name="Boxes" :size="16" />
                <span>母质（Parent Material）</span>
              </div>

              <div class="option-grid two">
                <label v-for="item in parentOptions" :key="item.value" class="radio-option"
                  :class="{ active: state.parentMaterial === item.value }">
                  <input v-model="state.parentMaterial" type="radio" :value="item.value" />
                  <span class="radio-dot"></span>
                  <span>{{ item.label }}</span>
                </label>
              </div>
            </section>

            <section class="control-section">
              <div class="section-title">
                <LucideIcon name="Hand" :size="16" />
                <span>人类干预（Human Interventions）</span>
              </div>

              <div class="option-list">
                <label v-for="item in humanOptions" :key="item.value" class="radio-option"
                  :class="{ active: state.human === item.value }">
                  <input v-model="state.human" type="radio" :value="item.value" />
                  <span class="radio-dot"></span>
                  <span>{{ item.label }}</span>
                </label>
              </div>
            </section>

            <section class="control-section">
              <div class="section-title">
                <LucideIcon name="Sprout" :size="16" />
                <span>自然生物（Biology）</span>
              </div>

              <div class="option-grid two">
                <label v-for="item in biologyOptions" :key="item.value" class="radio-option" :class="{
                  active: state.biology === item.value,
                  disabled: biologyDisabled(item.value)
                }">
                  <input v-model="state.biology" type="radio" :value="item.value"
                    :disabled="biologyDisabled(item.value)" />
                  <span class="radio-dot"></span>
                  <span>{{ item.label }}</span>
                </label>
              </div>

              <div v-if="biologyWarning" class="warning">
                <LucideIcon name="TriangleAlert" :size="14" />
                <span>{{ biologyWarning }}</span>
              </div>
            </section>

            <section class="control-section">
              <div class="section-title">
                <LucideIcon name="CloudSun" :size="16" />
                <span>气候（Climate）</span>
              </div>

              <div class="preset-row">
                <button v-for="preset in climatePresets" :key="preset.label" type="button" class="preset-btn"
                  @click="applyPreset(preset)">
                  {{ preset.label }}
                </button>
              </div>

              <div class="range-block">
                <div class="range-header">
                  <span>
                    <LucideIcon name="Droplets" :size="14" />
                    降水（决定水分与淋溶）
                  </span>
                  <strong>{{ state.precipitation }} mm</strong>
                </div>
                <el-slider v-model="state.precipitation" :min="0" :max="2500" :step="10" :show-tooltip="false"
                  aria-label="降水控制" />
              </div>

              <div class="range-block">
                <div class="range-header">
                  <span>
                    <LucideIcon name="Thermometer" :size="14" />
                    温度（决定热量与分解）
                  </span>
                  <strong>{{ state.temperature }} ℃</strong>
                </div>
                <el-slider v-model="state.temperature" :min="-20" :max="35" :step="1" :show-tooltip="false"
                  aria-label="温度控制" />
              </div>
            </section>

            <section class="control-section">
              <div class="section-title">
                <LucideIcon name="Mountain" :size="16" />
                <span>地形部位（Topography）</span>
              </div>

              <div class="option-grid three">
                <label v-for="item in topographyOptions" :key="item.value" class="radio-option compact"
                  :class="{ active: state.topography === item.value }">
                  <input v-model="state.topography" type="radio" :value="item.value" />
                  <span class="radio-dot"></span>
                  <span>{{ item.label }}</span>
                </label>
              </div>
            </section>
          </div>

          <div v-else class="compare-info">
            <div class="section-title">
              <LucideIcon name="Columns2" :size="16" />
              <span>预设对比（Preset Comparison）</span>
            </div>

            <div class="compare-intro">
              四个剖面共享同一条时间轴，用于比较不同环境条件下土壤层序和发育速度的差异。
            </div>

            <article v-for="scenario in compareScenarios" :key="scenario.title" class="scenario-card">
              <h3>{{ scenario.title }}</h3>
              <p>{{ scenario.description }}</p>
            </article>

            <button type="button" class="back-btn" @click="toggleCompareMode">
              <LucideIcon name="ChevronLeft" :size="16" />
              返回单剖面探究
            </button>
          </div>
        </div>

        <div class="resize-handle resize-right" @pointerdown.stop.prevent="startResize('left', $event)"></div>

        <button type="button" class="panel-collapse-btn collapse-left" aria-label="收起左侧面板"
          @click="leftCollapsed = true; scheduleTemplateResize()">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <main class="main-area soil-main-area">
            <div class="engine-tip">
              <LucideIcon name="MousePointer2" :size="14" />
              <span>空间定位推演引擎｜鼠标拖拽 360° 观察剖面</span>
            </div>

            <div ref="sceneContainerRef" class="scene-stage">
              <div v-show="!compareMode && !analysisPanelCollapsed" class="data-panel analysis-panel">
                <div class="data-title">
                  <LucideIcon name="PieChart" :size="17" />
                  <span>宏观剖面理化分析</span>
                </div>

                <div class="data-row">
                  <span>发育阶段</span>
                  <strong class="teal">{{ profile.stage }}</strong>
                </div>
                <div class="data-row">
                  <span>推断类型</span>
                  <strong>{{ profile.soilType }}</strong>
                </div>
                <div class="data-row">
                  <span>酸碱度（pH）</span>
                  <strong>{{ profile.ph }}</strong>
                </div>

                <div class="fertility-card">
                  <div class="fertility-title">
                    <span>综合土壤肥力评估</span>
                    <strong>{{ profile.fertility.overall }}</strong>
                  </div>
                  <p>土壤的本质属性：供应和协调植物生长所需的能力</p>

                  <div class="fertility-grid">
                    <div>
                      <span>养分(肥)</span>
                      <strong>{{ profile.fertility.nutrient }}</strong>
                    </div>
                    <div>
                      <span>水分(水)</span>
                      <strong>{{ profile.fertility.water }}</strong>
                    </div>
                    <div>
                      <span>空气(气)</span>
                      <strong>{{ profile.fertility.air }}</strong>
                    </div>
                    <div>
                      <span>热量(热)</span>
                      <strong>{{ profile.fertility.heat }}</strong>
                    </div>
                  </div>
                </div>

                <div class="map-card">
                  <div class="map-title">
                    <span>
                      <LucideIcon name="MapPinned" :size="14" />
                      土壤可能分布
                    </span>
                    <em>ECharts</em>
                  </div>

                  <div class="map-stage">
                    <div ref="mapContainerRef" class="map-chart"></div>
                    <div v-if="mapLoading" class="map-loading">
                      {{ mapMessage }}
                    </div>
                  </div>

                  <p>{{ currentMapProfile.desc }}</p>
                  <strong>{{ currentMapProfile.regions }}</strong>
                </div>
              </div>

              <button type="button" class="floating-btn compare-btn" :class="{ active: compareMode }"
                @click="toggleCompareMode">
                <LucideIcon v-if="compareMode" name="ChevronLeft" :size="16" />
                <LucideIcon v-else name="Columns2" :size="16" />
                {{ compareMode ? '单剖面探究' : '预设对比' }}
              </button>

              <button v-if="profile.hasBiota && !compareMode" type="button" class="floating-btn micro-btn"
                @click="openMicroModal">
                <LucideIcon name="Microscope" :size="16" />
                微观生态观察
              </button>

              <div v-show="!compareMode" class="labels-layer">
                <div v-for="layer in layerDefinitions" :key="layer.id" class="soil-label"
                  :style="labelStyles[layer.id]">
                  <div class="label-line"></div>
                  <div class="label-box">{{ layer.name }}</div>
                </div>
              </div>
            </div>

            <div class="timeline-dock">
              <button type="button" class="timeline-icon-btn" :class="{ active: playing }" @click="togglePlay">
                <LucideIcon v-if="playing" name="Pause" :size="20" />
                <LucideIcon v-else name="Play" :size="20" />
              </button>

              <div class="timeline-main">
                <el-slider v-model="state.time" :min="0" :max="25000" :step="25" :show-tooltip="false"
                  aria-label="土壤发育时间进度" @input="playing = false" @mousedown="playing = false"
                  @touchstart="playing = false" />

                <div class="timeline-labels">
                  <span>0 年（裸露基岩）</span>
                  <strong>{{ Math.round(state.time) }} 相对年</strong>
                  <span>2.5 万年（成熟极限）</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>

      <button v-if="leftCollapsed" type="button" class="panel-entry-btn entry-left" aria-label="展开左侧面板"
        @click="leftCollapsed = false; scheduleTemplateResize()">
        ›
      </button>
    </main>

    <!-- 微观生态弹窗 -->
    <Transition name="modal">
      <div v-if="microOpen" class="modal-mask" @mousedown.self="closeMicroModal">
        <div class="micro-modal">
          <header>
            <div>
              <LucideIcon name="Microscope" :size="21" />
              <span>土壤微观立体生态系统</span>
            </div>
            <button type="button" @click="closeMicroModal">
              <LucideIcon name="X" :size="22" />
            </button>
          </header>

          <div class="micro-content">
            <div ref="microContainerRef" class="micro-scene">
              <div class="micro-hint">
                <LucideIcon name="MousePointer2" :size="13" />
                按住鼠标左键旋转观察
              </div>
              <div v-if="microLoading" class="micro-loading">
                正在加载土壤微观模型…
              </div>
            </div>

            <div class="micro-text">
              <article>
                <LucideIcon name="Bug" :size="30" />
                <div>
                  <h3>分解者：微生物（真菌/细菌）</h3>
                  <p>
                    如图中放大显微镜所示。它们将植物落叶和动物残体分解转化为腐殖质，是
                    <strong>土壤养分(肥)</strong>
                    的直接源泉。
                  </p>
                </div>
              </article>

              <article>
                <LucideIcon name="Worm" :size="30" />
                <div>
                  <h3>工程师：土壤动物（鼹鼠/蚯蚓）</h3>
                  <p>
                    观察左侧洞穴。土壤动物通过挖掘，疏松了土壤，帮助
                    <strong>水分(水)和空气(气)</strong>
                    渗透，形成优良团粒结构。
                  </p>
                </div>
              </article>

              <article>
                <LucideIcon name="Sprout" :size="30" />
                <div>
                  <h3>穿插者：植物根系</h3>
                  <p>
                    密布土层的根系不仅固定土壤、吸收营养，其衰亡后更是深层土壤有机质的主要来源。
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue'
import '@/styles/geo-page-template.css'
import { ElSlider } from 'element-plus'
import 'element-plus/es/components/slider/style/css'
import * as THREE from 'three'
import * as echarts from 'echarts'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { icons } from 'lucide'

type ParentMaterial = 'granite' | 'basalt' | 'alluvium' | 'loess'
type HumanType = 'none' | 'paddy' | 'salinization'
type BiologyType = 'bare' | 'grass' | 'coniferous' | 'broadleaf'
type TopographyType = 'steep' | 'gentle' | 'valley'
type LayerId = 'R' | 'C' | 'B' | 'E' | 'A' | 'O'
type SoilMapKey =
  | 'young'
  | 'skeletal'
  | 'tundra'
  | 'desert'
  | 'grassland'
  | 'podzol'
  | 'red'
  | 'brown'
  | 'paddy'
  | 'saline'

interface State {
  parentMaterial: ParentMaterial
  human: HumanType
  biology: BiologyType
  precipitation: number
  temperature: number
  topography: TopographyType
  time: number
}

interface Heights {
  R: number
  C: number
  B: number
  E: number
  A: number
  O: number
}

interface Profile {
  heights: Heights
  maturity: number
  stage: string
  soilType: string
  ph: string
  mapKey: SoilMapKey
  effectiveBiology: BiologyType
  hasBiota: boolean
  surfaceColor: number
  bColor: number
  cColor: number
  blurColors: boolean
  fertility: {
    nutrient: string
    water: string
    air: string
    heat: string
    overall: string
  }
}

interface MapProfile {
  core: string[]
  related: string[]
  desc: string
  regions: string
  points: Array<{
    name: string
    value: [number, number, number]
  }>
}

interface CompareScenario extends Omit<State, 'time'> {
  title: string
  description: string
}

interface LayerRuntime {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>
  centerY: number
  visible: boolean
}

interface CompareColumn {
  group: THREE.Group
  layers: Record<LayerId, THREE.Mesh>
  plants: THREE.Sprite[]
  titleSprite: THREE.Sprite
  typeSprite: THREE.Sprite
  variablesSprite: THREE.Sprite
  titleTexture: THREE.CanvasTexture
  typeTexture: THREE.CanvasTexture
  variablesTexture: THREE.CanvasTexture
}

const MICRO_MODEL_URL =
  'https://document.szjx.ai-study.net/geography/glb_model/soil%20cross-section%203d%20model.glb'

const CHINA_GEOJSON_URL =
  '/geo-resources-folder/geojson/中国矢量数据/中国省级行政区.geojson'

const MAX_TOTAL_HEIGHT = 16
const BOX_WIDTH = 7
const BOX_DEPTH = 7
const MIN_LAYER_HEIGHT = 0.15
const YEARS_PER_SECOND = 3000

const rootRef = ref<HTMLElement | null>(null)
const sceneContainerRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
const microContainerRef = ref<HTMLElement | null>(null)

const state = reactive<State>({
  parentMaterial: 'granite',
  human: 'none',
  biology: 'broadleaf',
  precipitation: 1200,
  temperature: 20,
  topography: 'gentle',
  time: 15000
})

const compareMode = ref(false)
const playing = ref(false)
const microOpen = ref(false)
const microLoading = ref(false)
const mapLoading = ref(true)
const mapMessage = ref('正在加载本地中国省级行政区数据…')
const pageVisible = ref(true)

type LayoutMode = 'large' | 'medium' | 'small'
const layoutMode = ref<LayoutMode>('large')

const leftPanelWidth = ref(420)
const leftCollapsed = ref(false)
const analysisPanelCollapsed = ref(false)

let leftPanelManuallyResized = false
let isPanelResizing = false

type LucideIconNode = Array<
  [string, Record<string, string | number>]
>

const LucideIcon = defineComponent({
  name: 'LucideIcon',
  inheritAttrs: false,
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: [Number, String],
      default: 16
    },
    strokeWidth: {
      type: [Number, String],
      default: 2
    }
  },
  setup(props, { attrs }) {
    return () => {
      const iconNode = (
        icons as unknown as Record<
          string,
          LucideIconNode
        >
      )[props.name]

      if (!iconNode) {
        console.warn(`Lucide 图标不存在：${props.name}`)
        return null
      }

      const {
        class: inheritedClass,
        ...restAttributes
      } = attrs

      return h(
        'svg',
        {
          ...restAttributes,
          xmlns: 'http://www.w3.org/2000/svg',
          width: props.size,
          height: props.size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': props.strokeWidth,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          class: ['lucide-icon', inheritedClass]
        },
        iconNode.map(([tagName, attributes]) =>
          h(tagName, attributes)
        )
      )
    }
  }
})

const parentOptions = [
  { value: 'granite' as const, label: '花岗岩（致密）' },
  { value: 'basalt' as const, label: '玄武岩（富铁）' },
  { value: 'alluvium' as const, label: '冲积物（松散）' },
  { value: 'loess' as const, label: '黄土（易风化）' }
]

const humanOptions = [
  { value: 'none' as const, label: '自然演化（无干预）' },
  { value: 'paddy' as const, label: '水田耕作（水耕熟化）' },
  { value: 'salinization' as const, label: '大水漫灌（次生盐渍化）' }
]

const biologyOptions = [
  { value: 'bare' as const, label: '裸地无植被' },
  { value: 'grass' as const, label: '温带草原' },
  { value: 'coniferous' as const, label: '亚寒带针叶林' },
  { value: 'broadleaf' as const, label: '湿润阔叶林' }
]

const topographyOptions = [
  { value: 'steep' as const, label: '陡坡（侵蚀）' },
  { value: 'gentle' as const, label: '缓坡（过渡）' },
  { value: 'valley' as const, label: '谷地（沉积）' }
]

const climatePresets = [
  {
    label: '极地寒带',
    precipitation: 100,
    temperature: -8,
    biology: 'bare' as BiologyType
  },
  {
    label: '干旱沙漠',
    precipitation: 100,
    temperature: 25,
    biology: 'bare' as BiologyType
  },
  {
    label: '温带草原',
    precipitation: 400,
    temperature: 10,
    biology: 'grass' as BiologyType
  },
  {
    label: '热带雨林',
    precipitation: 2200,
    temperature: 28,
    biology: 'broadleaf' as BiologyType
  }
]

const layerDefinitions = [
  { id: 'R' as const, name: 'R 基岩层', color: 0x3b3836 },
  { id: 'C' as const, name: 'C 母质层', color: 0xb0aba6 },
  { id: 'B' as const, name: 'B 淀积层', color: 0x8c4a32 },
  { id: 'E' as const, name: 'E 淋溶层', color: 0xd3cfc8 },
  { id: 'A' as const, name: 'A 腐殖质层', color: 0x221a14 },
  { id: 'O' as const, name: 'O 枯枝落叶层', color: 0x3e2723 }
]

const compareScenarios: CompareScenario[] = [
  {
    title: '干旱荒漠',
    description: '低降水、高蒸发，表层有机质弱，土层浅薄。',
    precipitation: 80,
    temperature: 25,
    biology: 'bare',
    human: 'none',
    topography: 'gentle',
    parentMaterial: 'granite'
  },
  {
    title: '温带草原',
    description: '草本根系提供较多有机质，A 层较发育。',
    precipitation: 450,
    temperature: 10,
    biology: 'grass',
    human: 'none',
    topography: 'gentle',
    parentMaterial: 'loess'
  },
  {
    title: '湿润阔叶林',
    description: '温暖多雨促进风化、淋溶和淀积，层序完整。',
    precipitation: 1600,
    temperature: 22,
    biology: 'broadleaf',
    human: 'none',
    topography: 'gentle',
    parentMaterial: 'granite'
  },
  {
    title: '水田耕作',
    description: '长期水耕熟化改变水分、通气和氧化还原环境。',
    precipitation: 1200,
    temperature: 22,
    biology: 'grass',
    human: 'paddy',
    topography: 'valley',
    parentMaterial: 'alluvium'
  }
]

const mapProfiles: Record<SoilMapKey, MapProfile> = {
  young: {
    core: ['西藏自治区', '青海省', '云南省', '四川省'],
    related: ['甘肃省', '陕西省', '山西省'],
    desc: '发育时间短或侵蚀较强时，多见于山地坡面、河谷新沉积区与裸露母质区。',
    regions: '核心分布：青藏高原边缘、横断山区；相关区域：黄土高原沟谷、河流阶地。',
    points: [
      { name: '青藏高原边缘', value: [91, 31, 96] },
      { name: '横断山区', value: [99, 27, 82] }
    ]
  },
  skeletal: {
    core: ['西藏自治区', '青海省', '四川省', '云南省'],
    related: ['甘肃省', '陕西省', '贵州省'],
    desc: '坡度大、侵蚀强，土层浅薄，常形成粗骨土或石质土；分布受地形控制强于气候带。',
    regions: '核心分布：西南山地、青藏高原边缘；相关区域：黄土丘陵沟壑区、石灰岩山地。',
    points: [
      { name: '西南山地', value: [102, 28, 95] },
      { name: '青藏高原边缘', value: [92, 32, 82] }
    ]
  },
  tundra: {
    core: ['西藏自治区', '青海省'],
    related: ['新疆维吾尔自治区', '四川省', '甘肃省'],
    desc: '低温限制风化和有机质分解，对应高山寒冻土、高山草甸土或寒漠化土壤环境。',
    regions: '核心分布：青藏高原；相关区域：天山、阿尔泰山和横断山高海拔带。',
    points: [
      { name: '青藏高寒区', value: [91, 32, 96] },
      { name: '天山山区', value: [86, 43, 74] }
    ]
  },
  desert: {
    core: ['新疆维吾尔自治区', '甘肃省', '内蒙古自治区'],
    related: ['宁夏回族自治区', '青海省'],
    desc: '降水稀少、蒸发强，土体盐分和碳酸盐容易积累，植被稀疏，常见漠土系列。',
    regions: '核心分布：新疆、甘肃河西、内蒙古西部；相关区域：宁夏、柴达木盆地。',
    points: [
      { name: '塔里木盆地', value: [82, 40, 98] },
      { name: '河西走廊', value: [99, 39, 82] }
    ]
  },
  grassland: {
    core: ['黑龙江省', '吉林省', '辽宁省', '内蒙古自治区'],
    related: ['河北省', '山西省'],
    desc: '草原或草甸植被提供丰富根系有机质，东北平原以黑土为代表，向干旱草原过渡为黑钙土、栗钙土。',
    regions: '核心分布：东北黑土区、内蒙古草原带；相关区域：辽西、冀北和晋北草原过渡带。',
    points: [
      { name: '东北黑土区', value: [126, 46, 100] },
      { name: '内蒙古草原', value: [116, 43, 78] }
    ]
  },
  podzol: {
    core: ['黑龙江省', '吉林省'],
    related: ['内蒙古自治区', '辽宁省'],
    desc: '寒冷湿润、针叶林凋落物偏酸，易发生灰化淋溶；在我国主要与东北寒温带针叶林和高山垂直带有关。',
    regions: '核心分布：大兴安岭、小兴安岭、长白山北部；相关区域：东北山地高海拔林区。',
    points: [
      { name: '大兴安岭', value: [124, 51, 94] },
      { name: '长白山北部', value: [128, 43, 76] }
    ]
  },
  red: {
    core: ['江西省', '湖南省', '福建省', '广东省', '广西壮族自治区', '海南省'],
    related: ['浙江省', '湖北省', '贵州省', '云南省'],
    desc: '高温多雨促进强烈风化和淋溶，铁铝氧化物富集，红壤、赤红壤和砖红壤在南方丘陵广泛出现。',
    regions: '核心分布：江南丘陵、华南丘陵、海南；相关区域：云贵高原湿润区、四川盆地边缘。',
    points: [
      { name: '江南丘陵', value: [114, 27, 96] },
      { name: '华南丘陵', value: [113, 23, 90] }
    ]
  },
  brown: {
    core: ['山东省', '辽宁省', '河北省', '河南省', '江苏省', '安徽省'],
    related: ['湖北省', '陕西省', '山西省', '北京市', '天津市'],
    desc: '温暖湿润到半湿润地区，淋溶和腐殖质积累较均衡，常见棕壤、褐土或淋溶土过渡组合。',
    regions: '核心分布：华北东部、山东丘陵、辽东丘陵；相关区域：秦岭-淮河附近过渡带。',
    points: [
      { name: '华北东部', value: [117, 36, 88] },
      { name: '秦淮过渡带', value: [112, 33, 76] }
    ]
  },
  paddy: {
    core: ['江苏省', '浙江省', '安徽省', '江西省', '湖北省', '湖南省', '广东省', '四川省'],
    related: ['福建省', '重庆市', '广西壮族自治区', '云南省'],
    desc: '水稻土是长期水耕熟化形成的人为土，分布受灌溉、平坦地形和稻作制度控制。',
    regions: '核心分布：长江中下游、四川盆地、华南稻作区；相关区域：云贵坝区和东南沿海平原。',
    points: [
      { name: '长江中下游', value: [116, 30, 100] },
      { name: '四川盆地', value: [104, 30, 82] }
    ]
  },
  saline: {
    core: ['新疆维吾尔自治区', '内蒙古自治区', '宁夏回族自治区', '甘肃省'],
    related: ['河北省', '山东省', '天津市', '青海省'],
    desc: '蒸发强、地下水矿化度高、排水不畅或灌溉不合理时，盐分向表层聚集形成盐渍化土。',
    regions: '核心分布：新疆绿洲边缘、河套平原、河西走廊；相关区域：华北低洼区和滨海盐碱地。',
    points: [
      { name: '新疆绿洲边缘', value: [86, 42, 96] },
      { name: '河套平原', value: [108, 40, 84] }
    ]
  }
}

const biologyWarning = computed(() => {
  if (state.human !== 'none') return ''

  if (
    state.temperature < -2 &&
    (state.biology === 'broadleaf' || state.biology === 'coniferous')
  ) {
    return '当前温度过低，森林植被无法稳定发育。'
  }

  if (
    state.precipitation < 300 &&
    (state.biology === 'broadleaf' || state.biology === 'coniferous')
  ) {
    return '当前水分不足以支撑森林植被发育。'
  }

  if (state.precipitation < 150 && state.biology === 'grass') {
    return '极端干旱，草本植被仅作稀疏覆盖处理。'
  }

  return ''
})

function biologyDisabled(value: BiologyType) {
  if (state.human !== 'none') return true

  return (
    (value === 'broadleaf' || value === 'coniferous') &&
    (state.precipitation < 300 || state.temperature < -2)
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function computeProfile(input: State): Profile {
  let biology = input.biology

  if (input.human === 'salinization') {
    biology = 'bare'
  } else if (
    input.human === 'paddy' &&
    biology !== 'bare'
  ) {
    // 老版本只有当前不是裸地时才转成水田草本。
    biology = 'grass'
  }

  const parentRates: Record<ParentMaterial, number> = {
    granite: 0.6,
    basalt: 0.8,
    alluvium: 1.5,
    loess: 2
  }

  let climateFactor =
    (input.precipitation / 2500) * 0.5 +
    Math.max(0, (input.temperature + 10) / 45) * 0.5

  if (input.temperature < 0) climateFactor *= 0.1

  // 与原 HTML 保持一致的土壤发育公式。
  const rate =
    climateFactor *
    parentRates[input.parentMaterial] *
    0.0004

  const maturity = Math.max(
    0,
    1 /
    (1 +
      Math.exp(
        -rate * (Math.max(input.time, 0) - 8000)
      )) -
    0.02
  )

  let weatheringDepth =
    (input.precipitation / 2500) * 1.5 +
    (Math.max(0, input.temperature) / 35) * 0.6

  if (input.precipitation < 300 && input.temperature > 15) {
    weatheringDepth *= 0.4
  }
  if (input.temperature < 0) weatheringDepth = 0.1

  const terrainFactor: Record<TopographyType, number> = {
    steep: 0.15,
    gentle: 0.8,
    valley: 1.6
  }

  const f = terrainFactor[input.topography]
  const w = { O: 0, A: 0, E: 0, B: 0, C: 0 }

  if (maturity > 0.02) w.C = 35 * maturity * weatheringDepth

  if (maturity > 0.1 && biology !== 'bare') {
    w.A =
      biology === 'grass'
        ? 70 * (maturity - 0.1) * Math.max(0.5, weatheringDepth)
        : 25 * (maturity - 0.1) * weatheringDepth

    const retention = Math.max(0.1, 1 - (input.temperature + 10) / 45)
    w.O =
      biology === 'coniferous'
        ? 35 * (maturity - 0.1) * retention
        : biology === 'broadleaf'
          ? 15 * (maturity - 0.1) * retention
          : 0
  }

  if (maturity > 0.3 && climateFactor > 0.1) {
    w.B = 80 * (maturity - 0.3) * weatheringDepth
  }

  if (maturity > 0.5 && input.precipitation > 600) {
    if (biology === 'coniferous') {
      w.E = 25 * (maturity - 0.5)
      w.A *= 0.4
    } else if (biology === 'broadleaf' && input.precipitation > 1400) {
      w.E = 15 * (maturity - 0.5)
    }
  }

  w.O *= Math.pow(f, 1.5)
  w.A *= Math.pow(f, 1.2)
  w.E *= f
  w.B *= Math.pow(f, 0.8)
  if (input.topography === 'valley') w.C *= 1.2

  const heights: Heights = {
    O: w.O * 0.05,
    A: w.A * 0.05,
    E: w.E * 0.05,
    B: w.B * 0.05,
    C: w.C * 0.05,
    R: 1
  }

  // 老版本第一次限高发生在干旱、坡度和可见阈值修正之前。
  let initialSoilHeight =
    heights.O +
    heights.A +
    heights.E +
    heights.B +
    heights.C

  if (initialSoilHeight > MAX_TOTAL_HEIGHT - 2) {
    const initialScale =
      (MAX_TOTAL_HEIGHT - 2) /
      initialSoilHeight

    heights.O *= initialScale
    heights.A *= initialScale
    heights.E *= initialScale
    heights.B *= initialScale
    heights.C *= initialScale
  }

  const severeArid =
    input.human === 'none' && input.precipitation < 250

  const vegetationFactor =
    input.human === 'paddy'
      ? 1
      : biology === 'bare'
        ? 0
        : clamp((input.precipitation - 180) / 520, 0, 1)

  if (severeArid) {
    heights.O = 0
    heights.A *= 0.18
    heights.E = 0
    heights.B *= 0.35
    heights.C = Math.max(heights.C, maturity > 0.05 ? 0.24 : 0)
  } else {
    heights.O *= vegetationFactor
    heights.A *= Math.max(0.35, vegetationFactor)
  }

  if (input.topography === 'steep') {
    heights.O *= 0.2
    heights.A *= 0.35
    heights.E = 0
    heights.B *= 0.25
    heights.C = Math.max(heights.C, 0.25 * maturity)
  }

  if (maturity < 0.3) {
    heights.E = 0
    heights.B *= 0.35
  }

  if (input.precipitation < 450 && input.human !== 'paddy') {
    heights.E = 0
  }

  ; (['O', 'A', 'E', 'B', 'C'] as LayerId[]).forEach((id) => {
    if (heights[id] < MIN_LAYER_HEIGHT) heights[id] = 0
  })

  let total =
    heights.O +
    heights.A +
    heights.E +
    heights.B +
    heights.C

  // 老版本在应用干旱、坡度、发育阶段和可见阈值后再次限高。
  if (total > MAX_TOTAL_HEIGHT - 2) {
    const scale =
      (MAX_TOTAL_HEIGHT - 2) / total

    heights.O *= scale
    heights.A *= scale
    heights.E *= scale
    heights.B *= scale
    heights.C *= scale

    total =
      heights.O +
      heights.A +
      heights.E +
      heights.B +
      heights.C
  }

  heights.R = Math.max(
    1,
    MAX_TOTAL_HEIGHT -
    (
      heights.O +
      heights.A +
      heights.E +
      heights.B +
      heights.C
    )
  )

  let cColor = 0xb0aba6
  if (input.parentMaterial === 'basalt') cColor = 0x595350
  if (input.parentMaterial === 'alluvium') cColor = 0xa89f84
  if (input.parentMaterial === 'loess') {
    cColor = 0xd4c391
    const loessC = Math.max(heights.C, 3 * maturity)
    const delta = loessC - heights.C
    heights.C = loessC
    heights.R = Math.max(1, heights.R - delta)
  }

  let bTarget = 0x8c5a38
  if (input.human === 'paddy') bTarget = 0x5a6868
  else if (input.precipitation > 1200 && input.temperature > 15) bTarget = 0xa33b20
  else if (input.precipitation < 400 || input.human === 'salinization') bTarget = 0xd1c4b0

  let aTarget = 0x382a20
  if (input.human === 'salinization') aTarget = 0xe2e8e8
  else if (input.human === 'paddy') aTarget = 0x38423b
  else if (severeArid) aTarget = 0x6f604f
  else if (biology === 'grass') aTarget = 0x181412

  const bColor = new THREE.Color(cColor)
    .lerp(new THREE.Color(bTarget), maturity)
    .getHex()

  const surfaceColor = new THREE.Color(cColor)
    .lerp(new THREE.Color(aTarget), maturity)
    .getHex()

  let stage = '成熟时期 (分层明确)'
  let blurColors = false

  if (maturity < 0.15) {
    stage = '形成初期 (基岩破裂)'
    blurColors = true
  } else if (maturity < 0.6) {
    stage = '幼年时期 (无明显层状)'
    blurColors = true
  }

  let soilType = '未成熟土'
  let ph = '7.0'
  let mapKey: SoilMapKey = 'young'
  let overall = '极低 (贫瘠)'

  if (input.topography === 'steep') {
    soilType = '粗骨土／石质土'
    mapKey = 'skeletal'
    overall = '极低 (流失严重)'
  } else if (input.temperature < -10 && input.human === 'none') {
    soilType = '冰沼土'
    ph = '6.5'
    mapKey = 'tundra'
    overall = '极低 (冰沼冻土)'
  } else if (maturity > 0.2) {
    if (input.human === 'paddy') {
      soilType = '水稻土'
      ph = '6.5—7.0'
      mapKey = 'paddy'
      overall = '极高 (水耕熟化)'
    } else if (input.human === 'salinization') {
      soilType = '次生盐渍土'
      ph = '8.8+（强碱性）'
      mapKey = 'saline'
      overall = '极低 (次生盐渍化)'
    } else if (input.precipitation < 250) {
      soilType = '荒漠土'
      ph = '8.2（弱碱性）'
      mapKey = 'desert'
      overall = '极低 (荒漠缺水)'
    } else if (biology === 'grass') {
      soilType = '黑土／栗钙土'
      ph = '6.8（近中性）'
      mapKey = 'grassland'
      overall = '极高 (黑土沃野)'
    } else if (biology === 'coniferous') {
      soilType = '灰化土'
      ph = '4.5（强酸性）'
      mapKey = 'podzol'
      overall = '偏低 (酸性过强)'
    } else if (input.precipitation > 1200 && input.temperature > 15) {
      soilType = '红壤／砖红壤'
      ph = '5.0（酸性）'
      mapKey = 'red'
      overall = '中等偏低 (酸性贫瘠)'
    } else {
      soilType = '淋溶土／棕壤'
      ph = '6.2（微酸）'
      mapKey = 'brown'
      overall = '较高 (宜农宜林)'
    }
  } else {
    if (input.temperature < -10) mapKey = 'tundra'
    else if (input.precipitation < 250) mapKey = 'desert'

    overall = '极低 (发育初期)'
  }

  // 与原 HTML 保持一致的“水、肥、气、热”评价文案。
  let nutrient = '差'
  let water = '差'
  let air = '差'
  let heat = '差'

  if (input.temperature >= 20) {
    heat = '充足(优)'
  } else if (input.temperature >= 10) {
    heat = '适宜(良)'
  } else if (input.temperature >= 0) {
    heat = '匮乏(差)'
  } else {
    heat = '极寒(差)'
  }

  if (input.human === 'paddy') {
    water = '人工调优'
  } else if (input.precipitation < 300) {
    water = '干旱缺水'
  } else if (
    input.precipitation > 2000 &&
    input.topography === 'valley'
  ) {
    water = '易涝过湿'
  } else if (input.topography === 'steep') {
    water = '流失(差)'
  } else {
    water = '适宜(良)'
  }

  if (input.human === 'salinization') {
    air = '盐结板结'
  } else if (input.topography === 'steep') {
    air = '岩石为主'
  } else if (
    biology === 'grass' ||
    biology === 'broadleaf'
  ) {
    air = '通透(优)'
  } else if (input.human === 'paddy') {
    air = '适宜(糊状)'
  } else {
    air = '一般'
  }

  if (
    input.human === 'salinization' ||
    severeArid ||
    input.topography === 'steep'
  ) {
    nutrient = '贫乏(差)'
  } else if (
    input.human === 'paddy' ||
    biology === 'grass'
  ) {
    nutrient = '富集(优)'
  } else if (
    biology === 'broadleaf' ||
    biology === 'coniferous'
  ) {
    nutrient = '中等(良)'
  } else {
    nutrient = '贫乏(差)'
  }

  const hasBiota =
    biology !== 'bare' &&
    maturity > 0.1 &&
    input.topography !== 'steep' &&
    (input.human === 'paddy' || input.precipitation >= 250)

  return {
    heights,
    maturity,
    stage,
    soilType,
    ph,
    mapKey,
    effectiveBiology: biology,
    hasBiota,
    surfaceColor,
    bColor,
    cColor,
    blurColors,
    fertility: {
      nutrient,
      water,
      air,
      heat,
      overall
    }
  }
}

const profile = computed(() => computeProfile({ ...state }))
const currentMapProfile = computed(() => mapProfiles[profile.value.mapKey])

function applyPreset(preset: (typeof climatePresets)[number]) {
  state.human = 'none'
  state.precipitation = preset.precipitation
  state.temperature = preset.temperature
  state.biology = preset.biology
}

watch(
  () => state.human,
  (value) => {
    if (value === 'paddy') state.biology = 'grass'
    if (value === 'salinization') state.biology = 'bare'
  }
)

watch(
  () => [state.precipitation, state.temperature],
  () => {
    if (state.human !== 'none') return
    if (biologyDisabled(state.biology)) {
      state.biology = state.precipitation < 150 ? 'bare' : 'grass'
    }
  }
)


function syncLayoutMode() {
  const width =
    rootRef.value?.clientWidth ||
    window.innerWidth

  const nextMode: LayoutMode =
    width >= 1280
      ? 'large'
      : width >= 860
        ? 'medium'
        : 'small'

  const modeChanged =
    layoutMode.value !== nextMode

  layoutMode.value = nextMode

  if (
    modeChanged ||
    !leftPanelManuallyResized
  ) {
    leftPanelWidth.value =
      getAdaptiveLeftPanelWidth(
        width,
        nextMode
      )
  }
}


function getEffectiveTemplateWidth(
  fallbackWidth?: number
) {
  const candidates: number[] = []

  if (
    typeof fallbackWidth === 'number' &&
    Number.isFinite(fallbackWidth) &&
    fallbackWidth > 0
  ) {
    candidates.push(fallbackWidth)
  }

  const pageWidth =
    rootRef.value?.clientWidth

  if (
    typeof pageWidth === 'number' &&
    Number.isFinite(pageWidth) &&
    pageWidth > 0
  ) {
    candidates.push(pageWidth)
  }

  ;[
    window.innerWidth,
    window.visualViewport?.width,
    window.screen?.width,
    window.screen?.availWidth
  ].forEach((value) => {
    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
    ) {
      candidates.push(value)
    }
  })

  return candidates.length
    ? Math.min(...candidates)
    : 0
}

function getAdaptiveLeftPanelWidth(
  pageWidth: number,
  mode: LayoutMode
) {
  void mode

  const effectiveWidth =
    getEffectiveTemplateWidth(pageWidth)

  /*
   * 宽度不再跟 small / medium / large 分段绑定。
   * layoutMode 只负责布局形态，面板宽度用连续公式计算。
   *
   * 之前的问题：
   * - 1280px 以上 large：pageWidth * 0.19，约 340px
   * - 1280px 以下 medium：pageWidth * 0.26，约 333px，已经较平滑
   * - 860px 以下 small：pageWidth * 0.76，约 653px，突然变大
   *
   * 现在：
   * - 859 / 860 / 1279 / 1280 都走同一套连续公式
   * - 只有超大屏单独放宽
   */
  if (effectiveWidth >= 2200) {
    return clamp(
      effectiveWidth * 0.22,
      420,
      640
    )
  }

  return clamp(
    pageWidth * 0.24,
    300,
    360
  )
}

function getPanelResizeBounds() {
  const pageWidth =
    rootRef.value?.clientWidth ||
    window.innerWidth

  const effectiveWidth =
    getEffectiveTemplateWidth(pageWidth)

  const isUltraLarge =
    effectiveWidth >= 2200

  /*
   * 拖拽边界也不要按 860 / 1280 分段跳变。
   * 普通屏：最多 420px 或页面宽度的 42%
   * 超大屏：最多 820px 或页面宽度的 54%
   */
  return {
    min: 280,
    max: Math.max(
      280,
      Math.min(
        isUltraLarge ? 820 : 420,
        effectiveWidth * (
          isUltraLarge ? 0.54 : 0.42
        )
      )
    )
  }
}

function scheduleTemplateResize() {
  nextTick(() => {
    requestAnimationFrame(() => {
      resizeScene()
      mapChart?.resize()
    })
  })
}

function toggleLeftPanel() {
  leftCollapsed.value = !leftCollapsed.value
  scheduleTemplateResize()
}

function toggleAnalysisPanel() {
  analysisPanelCollapsed.value = !analysisPanelCollapsed.value
  scheduleTemplateResize()
}

function startResize(
  side: 'left',
  event: PointerEvent
) {
  if (
    side === 'left' &&
    leftCollapsed.value
  ) {
    return
  }

  event.stopPropagation()
  leftPanelManuallyResized = true
  isPanelResizing = true

  const handle =
    event.currentTarget as HTMLElement | null

  if (
    handle &&
    typeof handle.setPointerCapture === 'function'
  ) {
    try {
      handle.setPointerCapture(event.pointerId)
    } catch {
      // 某些触控环境不支持 pointer capture，继续使用 document 监听。
    }
  }

  const startX = event.clientX
  const startWidth = leftPanelWidth.value
  const bounds = getPanelResizeBounds()

  const onMove = (
    moveEvent: PointerEvent
  ) => {
    const deltaX =
      moveEvent.clientX - startX

    leftPanelWidth.value = clamp(
      startWidth + deltaX,
      bounds.min,
      bounds.max
    )

    scheduleTemplateResize()
  }

  const finishResize = () => {
    document.removeEventListener(
      'pointermove',
      onMove
    )

    document.removeEventListener(
      'pointerup',
      finishResize
    )

    document.removeEventListener(
      'pointercancel',
      finishResize
    )

    document.body.classList.remove(
      'geo-panel-resizing'
    )

    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    isPanelResizing = false
    scheduleTemplateResize()
  }

  document.addEventListener(
    'pointermove',
    onMove
  )

  document.addEventListener(
    'pointerup',
    finishResize
  )

  document.addEventListener(
    'pointercancel',
    finishResize
  )

  document.body.classList.add(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    'col-resize'

  document.body.style.userSelect =
    'none'
}

/* ============================== 主 Three.js ============================== */

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let sceneResizeObserver: ResizeObserver | null = null
let sceneResizeFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let animationId = 0
let lastFrame = 0

let soilGroup: THREE.Group | null = null
let vegetationGroup: THREE.Group | null = null
let rootGroup: THREE.Group | null = null
let layerDetailRoot: THREE.Group | null = null
let compareGroup: THREE.Group | null = null
let waterPlane: THREE.Mesh | null = null
let waterBaseY = 0

const layerRuntime = {} as Record<LayerId, LayerRuntime>
const vegetationPools: Record<BiologyType | 'rice' | 'dead', THREE.Sprite[]> = {
  bare: [],
  grass: [],
  coniferous: [],
  broadleaf: [],
  rice: [],
  dead: []
}
const rootMeshes: Partial<Record<BiologyType | 'rice', THREE.LineSegments>> = {}
const layerDetailGroups = {} as Record<LayerId, THREE.Group>
const compareColumns: CompareColumn[] = []

let soilTexture: THREE.CanvasTexture | null = null
let rockTexture: THREE.CanvasTexture | null = null
let sharedLayerGeometry: THREE.BoxGeometry | null = null

const labelStyles = reactive<Record<LayerId, Record<string, string>>>({
  R: hiddenLabel(),
  C: hiddenLabel(),
  B: hiddenLabel(),
  E: hiddenLabel(),
  A: hiddenLabel(),
  O: hiddenLabel()
})

function hiddenLabel() {
  return {
    left: '0px',
    top: '-999px',
    display: 'none',
    opacity: '0',
    '--line-width': '40px',
    '--line-angle': '0rad'
  }
}

function createNoiseTexture(rock = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const context = canvas.getContext('2d')

  if (context) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 256, 256)

    if (rock) {
      // 与老 HTML 的 createRockTexture 完全一致：
      // 使用较大的六边形碎石，不进行 3×3 重复。
      for (let index = 0; index < 150; index += 1) {
        context.fillStyle = `rgba(0,0,0,${Math.random() * 0.4 + 0.1
          })`

        context.beginPath()

        const centerX = Math.random() * 256
        const centerY = Math.random() * 256
        const radius = Math.random() * 8 + 4

        context.moveTo(centerX + radius, centerY)

        for (let side = 1; side < 6; side += 1) {
          const angle = (side * Math.PI * 2) / 6

          context.lineTo(
            centerX +
            Math.cos(angle) *
            (radius + Math.random() * 5),
            centerY +
            Math.sin(angle) *
            (radius + Math.random() * 5)
          )
        }

        context.fill()
      }
    } else {
      // 与老 HTML 的 createSoilNoiseTexture 完全一致。
      for (let index = 0; index < 6000; index += 1) {
        context.fillStyle =
          Math.random() > 0.5
            ? 'rgba(0,0,0,0.15)'
            : 'rgba(255,255,255,0.1)'

        context.fillRect(
          Math.random() * 256,
          Math.random() * 256,
          2,
          2
        )
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  // 老版本没有设置 repeat.set(3, 3)，
  // 因此颗粒尺寸更大，剖面表面也更有块状质感。
  return texture
}

function createPlantTexture(
  type: BiologyType | 'rice' | 'dead',
  variant: number
) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const context = canvas.getContext('2d')

  if (!context) {
    return new THREE.CanvasTexture(canvas)
  }

  // 老版本从画布底边 256 开始绘制。
  context.translate(128, 256)

  if (type === 'grass') {
    context.fillStyle = '#4ade80'
    const blades = 7 + variant * 5

    for (let index = 0; index < blades; index += 1) {
      const height = 80 + Math.random() * 80
      const angle =
        (Math.random() - 0.5) * 1.2

      context.beginPath()
      context.moveTo(-4, 0)
      context.quadraticCurveTo(
        (Math.sin(angle) * height) / 2,
        -height / 2,
        Math.sin(angle) * height,
        -height
      )
      context.lineTo(4, 0)
      context.fill()
    }
  } else if (type === 'rice') {
    context.fillStyle = '#84cc16'
    const blades = 8 + variant * 3

    for (let index = 0; index < blades; index += 1) {
      const height = 100 + Math.random() * 40
      const angle =
        (Math.random() - 0.5) * 0.8

      context.beginPath()
      context.moveTo(-3, 0)
      context.quadraticCurveTo(
        (Math.sin(angle) * height) / 2,
        -height / 2,
        Math.sin(angle) * height,
        -height
      )
      context.lineTo(3, 0)
      context.fill()

      // 老版水稻包含黄色稻穗点。
      if (Math.random() > 0.5) {
        context.fillStyle = '#fbbf24'
        context.beginPath()
        context.arc(
          Math.sin(angle) * height,
          -height + 10,
          4,
          0,
          Math.PI * 2
        )
        context.fill()
        context.fillStyle = '#84cc16'
      }
    }
  } else if (type === 'broadleaf') {
    const height = 100 + variant * 25

    context.fillStyle = '#334155'
    context.beginPath()
    context.moveTo(-8, 0)
    context.lineTo(8, 0)
    context.lineTo(3, -height)
    context.lineTo(-3, -height)
    context.fill()

    const drawLeaf = (
      color: string,
      x: number,
      y: number,
      radius: number
    ) => {
      context.fillStyle = color
      context.beginPath()
      context.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      )
      context.fill()
    }

    drawLeaf('#0f766e', 0, -height, 55)
    drawLeaf(
      '#14b8a6',
      -35,
      -height + 20,
      50
    )
    drawLeaf(
      '#0d9488',
      35,
      -height + 10,
      45
    )
    drawLeaf(
      '#2dd4bf',
      -15,
      -height - 30,
      40
    )
  } else if (type === 'coniferous') {
    const height = 130 + variant * 25

    context.fillStyle = '#475569'
    context.beginPath()
    context.moveTo(-7, 0)
    context.lineTo(7, 0)
    context.lineTo(0, -height)
    context.fill()

    context.fillStyle = '#0f766e'

    for (let index = 0; index < 4; index += 1) {
      const y = -35 - index * 35
      const width = 45 - index * 9

      context.beginPath()
      context.moveTo(0, y - 45)
      context.lineTo(-width, y)
      context.lineTo(width, y)
      context.fill()
    }
  } else if (type === 'dead') {
    const height = 70 + variant * 20

    context.strokeStyle = '#a8a29e'
    context.lineWidth = 4

    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(0, -height)
    context.stroke()

    context.beginPath()
    context.moveTo(0, -height * 0.5)
    context.lineTo(
      -20,
      -height * 0.8
    )
    context.stroke()

    context.beginPath()
    context.moveTo(0, -height * 0.6)
    context.lineTo(
      25,
      -height * 0.9
    )
    context.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}

function fillPlantPool(
  key: BiologyType | 'rice' | 'dead',
  count: number,
  size: number
) {
  if (!vegetationGroup) return

  const textures = [0, 1, 2].map((v) => createPlantTexture(key, v))

  for (let i = 0; i < count; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: textures[i % textures.length],
      transparent: true,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(material)
    sprite.center.set(0.5, 0)
    sprite.position.set(
      (Math.random() - 0.5) * 6,
      0,
      (Math.random() - 0.5) * 6
    )
    sprite.userData.baseScale = size * (0.82 + Math.random() * 0.36)
    sprite.visible = false
    vegetationGroup.add(sprite)
    vegetationPools[key].push(sprite)
  }
}

function createRoots(type: BiologyType | 'rice') {
  const points: number[] = []
  const colors: number[] = []

  const rootColorTop = new THREE.Color(
    type === 'grass' || type === 'rice'
      ? 0xd0e8b0
      : type === 'broadleaf'
        ? 0x5e4128
        : 0x75593c
  )

  const rootColorBottom = new THREE.Color(0x221a14)

  function addBranch(
    x: number,
    y: number,
    z: number,
    angleX: number,
    angleZ: number,
    depth: number,
    maximumDepth: number,
    length: number
  ) {
    if (depth > maximumDepth) return

    let nextAngleX = angleX
    let nextAngleZ = angleZ

    if (type === 'rice' && depth > 0) {
      nextAngleX *= 1.5
      nextAngleZ *= 1.5
    }

    const endX =
      x + Math.sin(nextAngleX) * length

    const endZ =
      z + Math.sin(nextAngleZ) * length

    const endY =
      y -
      Math.cos(nextAngleX) *
      Math.cos(nextAngleZ) *
      length

    points.push(
      x,
      y,
      z,
      endX,
      endY,
      endZ
    )

    const firstColor = rootColorTop
      .clone()
      .lerp(
        rootColorBottom,
        Math.min(1, Math.abs(y))
      )

    const secondColor = rootColorTop
      .clone()
      .lerp(
        rootColorBottom,
        Math.min(1, Math.abs(endY))
      )

    colors.push(
      firstColor.r,
      firstColor.g,
      firstColor.b,
      secondColor.r,
      secondColor.g,
      secondColor.b
    )

    const branchCount =
      type === 'grass' || type === 'rice'
        ? Math.random() > 0.2
          ? 2
          : 1
        : 2

    for (
      let branchIndex = 0;
      branchIndex < branchCount;
      branchIndex += 1
    ) {
      if (
        Math.random() > 0.85 &&
        depth > 0
      ) {
        continue
      }

      addBranch(
        endX,
        endY,
        endZ,
        nextAngleX +
        (Math.random() - 0.5) * 1.5,
        nextAngleZ +
        (Math.random() - 0.5) * 1.5,
        depth + 1,
        maximumDepth,
        length *
        (0.5 + Math.random() * 0.4)
      )
    }
  }

  const rootCount =
    type === 'grass' || type === 'rice'
      ? 35
      : 12

  const initialLength =
    type === 'grass' || type === 'rice'
      ? 0.35
      : 0.45

  const maximumDepth =
    type === 'grass' || type === 'rice'
      ? 3
      : 4

  for (
    let rootIndex = 0;
    rootIndex < rootCount;
    rootIndex += 1
  ) {
    // 与老版本一致：根系贴近剖面的前面和右侧展开，
    // 而不是从整个顶面生成过深的直线。
    addBranch(
      (Math.random() - 0.5) * 5.6,
      0,
      3,
      (Math.random() - 0.5) * 0.8,
      0,
      0,
      maximumDepth,
      initialLength
    )

    addBranch(
      3,
      0,
      (Math.random() - 0.5) * 5.6,
      0,
      (Math.random() - 0.5) * 0.8,
      0,
      maximumDepth,
      initialLength
    )
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      points,
      3
    )
  )

  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(
      colors,
      3
    )
  )

  geometry.computeBoundingBox()

  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    })
  )
}

function randomRange(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum)
}

function addDetailPlane(
  layerId: LayerId,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleZ: number,
  material: THREE.Material,
  rotation = 0
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    material
  )

  mesh.position.set(x, y, z)
  mesh.rotation.set(-Math.PI / 2, 0, rotation)
  mesh.scale.set(scaleX, scaleZ, 1)
  layerDetailGroups[layerId].add(mesh)
  return mesh
}

function addDetailFacePatch(
  layerId: LayerId,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  material: THREE.Material,
  rotation = 0
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    material
  )

  mesh.position.set(x, y, z)
  mesh.rotation.set(0, 0, rotation)
  mesh.scale.set(scaleX, scaleY, 1)
  layerDetailGroups[layerId].add(mesh)
  return mesh
}

function addDetailTwig(
  layerId: LayerId,
  x: number,
  y: number,
  z: number,
  length: number,
  radius: number,
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius,
      radius * randomRange(0.55, 1),
      length,
      7
    ),
    material
  )

  mesh.position.set(x, y, z)
  mesh.rotation.set(
    randomRange(0.25, 0.85),
    randomRange(0, Math.PI),
    randomRange(-1.2, 1.2)
  )

  layerDetailGroups[layerId].add(mesh)
  return mesh
}

function addDetailPebble(
  layerId: LayerId,
  x: number,
  y: number,
  z: number,
  radius: number,
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(radius, 0),
    material
  )

  mesh.position.set(x, y, z)
  mesh.rotation.set(
    randomRange(0, Math.PI),
    randomRange(0, Math.PI),
    randomRange(0, Math.PI)
  )

  mesh.scale.set(
    randomRange(0.75, 1.45),
    randomRange(0.55, 1.1),
    randomRange(0.7, 1.35)
  )

  layerDetailGroups[layerId].add(mesh)
  return mesh
}

function addRootVeil(
  layerId: LayerId,
  count: number,
  material: THREE.LineBasicMaterial,
  options: {
    startY?: number
    endY?: number
    segments?: number
    spread?: number
    drop?: number
  } = {}
) {
  const points: number[] = []
  const frontZ = BOX_DEPTH / 2 + 0.08

  for (let index = 0; index < count; index += 1) {
    let x = randomRange(
      -BOX_WIDTH / 2 + 0.35,
      BOX_WIDTH / 2 - 0.35
    )

    let y = randomRange(
      options.startY ?? 0.72,
      options.endY ?? 0.98
    )

    const segments = options.segments ?? 4

    for (let segment = 0; segment < segments; segment += 1) {
      const nextX =
        x +
        randomRange(-0.34, 0.34) *
        (options.spread ?? 1)

      const nextY = Math.max(
        0.04,
        y -
        randomRange(0.08, 0.22) *
        (options.drop ?? 1)
      )

      const nextZ =
        frontZ + randomRange(-0.02, 0.08)

      points.push(
        x,
        y,
        frontZ,
        nextX,
        nextY,
        nextZ
      )

      if (Math.random() > 0.55) {
        points.push(
          nextX,
          nextY,
          nextZ,
          nextX + randomRange(-0.22, 0.22),
          Math.max(
            0.02,
            nextY - randomRange(0.04, 0.12)
          ),
          nextZ + randomRange(-0.02, 0.04)
        )
      }

      x = nextX
      y = nextY
    }
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points, 3)
  )

  const lines = new THREE.LineSegments(
    geometry,
    material
  )

  layerDetailGroups[layerId].add(lines)
  return lines
}

function createLayerDetails() {
  if (!layerDetailRoot) return

    ; (['O', 'A', 'E', 'B', 'C', 'R'] as LayerId[]).forEach(
      (layerId) => {
        const group = new THREE.Group()
        group.visible = false
        layerDetailGroups[layerId] = group
        layerDetailRoot?.add(group)
      }
    )

  const leafMaterial = new THREE.MeshLambertMaterial({
    color: 0x7a3f20,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.94
  })

  const twigMaterial = new THREE.MeshLambertMaterial({
    color: 0x4b2d1c
  })

  const fineRootMaterial = new THREE.LineBasicMaterial({
    color: 0xc7a06a,
    transparent: true,
    opacity: 0.82
  })

  const deepRootMaterial = new THREE.LineBasicMaterial({
    color: 0x6b4b35,
    transparent: true,
    opacity: 0.8
  })

  const humusMaterial = new THREE.MeshLambertMaterial({
    color: 0x17100c
  })

  const clayMaterial = new THREE.MeshLambertMaterial({
    color: 0x9f4f2e
  })

  const leachedMaterial = new THREE.MeshLambertMaterial({
    color: 0xe9e4d8,
    transparent: true,
    opacity: 0.66,
    side: THREE.DoubleSide
  })

  const pebbleMaterial = new THREE.MeshLambertMaterial({
    color: 0x6f6a63
  })

  // O 层：枯叶与枝条，恢复老版本表面的填充物。
  for (let index = 0; index < 38; index += 1) {
    const colors = [
      0x8f4d22,
      0xa35f2d,
      0x5f351f,
      0xc0893f
    ]

    const material = leafMaterial.clone()
    material.color.setHex(
      colors[index % colors.length]!
    )

    addDetailPlane(
      'O',
      randomRange(-3.1, 3.1),
      randomRange(0.74, 1.04),
      randomRange(-3, 3),
      randomRange(0.16, 0.44),
      randomRange(0.05, 0.14),
      material,
      randomRange(0, Math.PI)
    )
  }

  for (let index = 0; index < 24; index += 1) {
    addDetailTwig(
      'O',
      randomRange(-3, 3),
      randomRange(0.74, 1.06),
      randomRange(-3, 3),
      randomRange(0.32, 0.92),
      randomRange(0.018, 0.045),
      twigMaterial
    )
  }

  // A 层：细根和腐殖质颗粒。
  addRootVeil('A', 44, fineRootMaterial, {
    startY: 0.82,
    endY: 0.98,
    segments: 5,
    spread: 1.2,
    drop: 0.85
  })

  for (let index = 0; index < 52; index += 1) {
    addDetailPebble(
      'A',
      randomRange(-3.25, 3.25),
      randomRange(0.1, 0.92),
      BOX_DEPTH / 2 + 0.09,
      randomRange(0.025, 0.07),
      humusMaterial
    )
  }

  // E 层：浅色淋溶斑块。
  for (let index = 0; index < 26; index += 1) {
    addDetailFacePatch(
      'E',
      randomRange(-3.15, 3.15),
      randomRange(0.14, 0.88),
      BOX_DEPTH / 2 + 0.1,
      randomRange(0.18, 0.46),
      randomRange(0.03, 0.08),
      leachedMaterial,
      randomRange(-0.4, 0.4)
    )
  }

  // B 层：深根、黏土结核和淀积斑块。
  addRootVeil('B', 28, deepRootMaterial, {
    startY: 0.9,
    endY: 1,
    segments: 6,
    spread: 0.8,
    drop: 1.4
  })

  for (let index = 0; index < 36; index += 1) {
    addDetailPebble(
      'B',
      randomRange(-3.1, 3.1),
      randomRange(0.12, 0.9),
      BOX_DEPTH / 2 + 0.1,
      randomRange(0.035, 0.1),
      clayMaterial
    )
  }

  for (let index = 0; index < 16; index += 1) {
    addDetailFacePatch(
      'B',
      randomRange(-3.1, 3.1),
      randomRange(0.12, 0.88),
      BOX_DEPTH / 2 + 0.11,
      randomRange(0.12, 0.28),
      randomRange(0.04, 0.12),
      clayMaterial,
      randomRange(-0.45, 0.45)
    )
  }

  // C 层：母质碎屑和砾石。
  for (let index = 0; index < 32; index += 1) {
    addDetailPebble(
      'C',
      randomRange(-3, 3),
      randomRange(0.08, 0.92),
      BOX_DEPTH / 2 + 0.1,
      randomRange(0.07, 0.2),
      pebbleMaterial
    )
  }
}

function updateLayerDetailGroup(
  layerId: LayerId,
  bottomY: number,
  height: number,
  visible: boolean
) {
  const group = layerDetailGroups[layerId]

  if (!group) return

  group.visible =
    visible && height >= MIN_LAYER_HEIGHT

  group.position.y = bottomY
  group.scale.set(1, Math.max(0.05, height), 1)
}

function injectSoilShader(shader: THREE.ShaderMaterial) {
  const funcs = `
    float sHash(vec3 p) {
      p = fract(p * 0.3183099 + .1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float sNoise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(
          mix(sHash(i), sHash(i + vec3(1,0,0)), f.x),
          mix(sHash(i + vec3(0,1,0)), sHash(i + vec3(1,1,0)), f.x),
          f.y
        ),
        mix(
          mix(sHash(i + vec3(0,0,1)), sHash(i + vec3(1,0,1)), f.x),
          mix(sHash(i + vec3(0,1,1)), sHash(i + vec3(1,1,1)), f.x),
          f.y
        ),
        f.z
      );
    }
  `

  shader.vertexShader = funcs + shader.vertexShader
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
      #include <begin_vertex>
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float n = (sNoise(wp.xyz * 1.5) - .5) * .28
              + (sNoise(wp.xyz * 4.0) - .5) * .12;
      vec2 d = normalize(vec2(position.x, position.z));
      if (length(vec2(position.x, position.z)) > .1) {
        transformed.x += n * d.x;
        transformed.z += n * d.y;
      }
    `
  )
}

function createTextSprite(text: string, color = '#334155', size = 42) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = `700 ${size}px "Microsoft YaHei", sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true })
  )
  sprite.scale.set(4.8, 0.9, 1)

  return { sprite, texture }
}

function updateTextSprite(sprite: THREE.Sprite, texture: THREE.CanvasTexture, text: string, color: string, size = 38) {
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = `700 ${size}px "Microsoft YaHei", sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  texture.needsUpdate = true
  sprite.material.needsUpdate = true
}

function initCompareColumns() {
  if (!compareGroup) return

  const xPositions = [-4.8, -1.6, 1.6, 4.8]
  const colors: Record<LayerId, number> = {
    R: 0x3b3836,
    C: 0xb0aba6,
    B: 0x9f5a37,
    E: 0xd8d2c8,
    A: 0x2b2119,
    O: 0x5f3a24
  }

  compareScenarios.forEach((scenario, index) => {
    const group = new THREE.Group()
    group.position!.x = xPositions[index]!
    compareGroup!.add(group)

    const layers = {} as Record<LayerId, THREE.Mesh>
      ; (['R', 'C', 'B', 'E', 'A', 'O'] as LayerId[]).forEach((id) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.15, 1, 2.15, 12, 2, 12),
          new THREE.MeshLambertMaterial({
            color: colors[id],
            map:
              id === 'R' || id === 'C'
                ? rockTexture
                : soilTexture
          })
        )
        mesh.castShadow = true
        mesh.receiveShadow = true
        group.add(mesh)
        layers[id] = mesh
      })

    const plants: THREE.Sprite[] = []
    const plantSource =
      scenario.human === 'paddy'
        ? vegetationPools.rice
        : scenario.biology === 'broadleaf'
          ? vegetationPools.broadleaf
          : vegetationPools.grass

    for (let plantIndex = 0; plantIndex < 6; plantIndex += 1) {
      const sourceSprite =
        plantSource[plantIndex % plantSource.length]

      const sourceMaterial =
        sourceSprite!.material as THREE.SpriteMaterial

      const plant = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sourceMaterial.map,
          transparent: true
        })
      )

      plant.center.set(0.5, 0)
      plant.userData.localX = randomRange(-0.95, 0.95)
      plant.userData.localZ = randomRange(-0.85, 0.85)
      plant.visible = false
      group.add(plant)
      plants.push(plant)
    }

    const title = createTextSprite(scenario.title, '#0f766e', 44)
    title.sprite.position.set(
      0,
      MAX_TOTAL_HEIGHT * 0.82 / 2 + 1.2,
      0
    )
    group.add(title.sprite)

    const type = createTextSprite('未成熟土', '#334155', 34)
    type.sprite.position.set(
      0,
      -MAX_TOTAL_HEIGHT * 0.82 / 2 - 0.65,
      0
    )
    type.sprite.scale.set(4.2, 0.72, 1)
    group.add(type.sprite)

    const variables = createTextSprite(
      `${scenario.precipitation}mm / ${scenario.temperature}℃`,
      '#64748b',
      28
    )
    variables.sprite.position.set(
      0,
      -MAX_TOTAL_HEIGHT * 0.82 / 2 - 1.25,
      0
    )
    variables.sprite.scale.set(4.2, 0.66, 1)
    group.add(variables.sprite)

    compareColumns.push({
      group,
      layers,
      plants,
      titleSprite: title.sprite,
      typeSprite: type.sprite,
      variablesSprite: variables.sprite,
      titleTexture: title.texture,
      typeTexture: type.texture,
      variablesTexture: variables.texture
    })
  })
}

function initScene() {
  if (!sceneContainerRef.value || scene) return

  const container = sceneContainerRef.value
  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
  camera.position.set(18, 14, 25)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(width, height, false)
  lastSceneWidth = width
  lastSceneHeight = height
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.className = 'main-three-canvas'
  container.prepend(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(-2, 0, 0)
  controls.minDistance = 12
  controls.maxDistance = 35

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))

  const light = new THREE.DirectionalLight(0xffffff, 0.6)
  light.position.set(15, 25, 10)
  light.castShadow = true
  scene.add(light)

  soilGroup = new THREE.Group()
  vegetationGroup = new THREE.Group()
  rootGroup = new THREE.Group()
  layerDetailRoot = new THREE.Group()
  compareGroup = new THREE.Group()
  compareGroup.visible = false

  scene.add(
    soilGroup,
    layerDetailRoot,
    vegetationGroup,
    rootGroup,
    compareGroup
  )

  soilTexture = createNoiseTexture(false)
  rockTexture = createNoiseTexture(true)
  sharedLayerGeometry = new THREE.BoxGeometry(
    BOX_WIDTH,
    1,
    BOX_DEPTH,
    32,
    4,
    32
  )

  layerDefinitions.forEach((def) => {
    const material = new THREE.MeshLambertMaterial({
      color: def.color,
      map: def.id === 'R' || def.id === 'C' ? rockTexture : soilTexture
    })
    material.onBeforeCompile = injectSoilShader
    material.customProgramCacheKey = () => 'soil-profile-vue3'

    const mesh = new THREE.Mesh(sharedLayerGeometry!, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    soilGroup!.add(mesh)

    layerRuntime[def.id] = {
      mesh,
      centerY: 0,
      visible: false
    }
  })

  waterPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(BOX_WIDTH, BOX_DEPTH),
    new THREE.MeshLambertMaterial({
      color: 0x8ac4d0,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  )
  waterPlane.rotation.x = -Math.PI / 2
  waterPlane.visible = false
  scene.add(waterPlane)

  fillPlantPool('grass', 45, 1.8)
  fillPlantPool('broadleaf', 15, 6)
  fillPlantPool('coniferous', 18, 5.5)
  fillPlantPool('rice', 50, 1.6)
  fillPlantPool('dead', 20, 2.5)

    ; (['grass', 'broadleaf', 'coniferous', 'rice'] as const).forEach((type) => {
      const roots = createRoots(type)
      roots.visible = false
      rootGroup!.add(roots)
      rootMeshes[type] = roots
    })

  createLayerDetails()
  initCompareColumns()
  updateScene()

  sceneResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]

    if (!entry) return

    scheduleSceneResize(
      Math.round(entry.contentRect.width),
      Math.round(entry.contentRect.height)
    )
  })

  sceneResizeObserver.observe(container)
}

function scheduleSceneResize(width: number, height: number) {
  if (sceneResizeFrame) {
    cancelAnimationFrame(sceneResizeFrame)
  }

  sceneResizeFrame = requestAnimationFrame(() => {
    sceneResizeFrame = 0
    resizeScene(width, height)
    mapChart?.resize()
  })
}

function resizeScene(
  observedWidth?: number,
  observedHeight?: number
) {
  if (!renderer || !camera || !sceneContainerRef.value) return

  const width = Math.max(
    observedWidth ??
    Math.round(sceneContainerRef.value.clientWidth),
    1
  )

  const height = Math.max(
    observedHeight ??
    Math.round(sceneContainerRef.value.clientHeight),
    1
  )

  // 拖动窗口时 ResizeObserver 会高频触发。
  // 尺寸没有实际变化就不重建 WebGL drawing buffer，避免闪烁。
  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  // 尺寸更新后立即补绘一帧，避免等待下一次动画循环时出现空白。
  controls?.update()
  renderer.render(scene!, camera)
}

function hideVegetation() {
  Object.values(vegetationPools).forEach((pool) => {
    pool.forEach((sprite) => {
      sprite.visible = false
    })
  })
}

function updateSingleProfile() {
  if (!soilGroup || !vegetationGroup || !rootGroup || !waterPlane) return

  const p = profile.value
  const materials = {
    C: p.cColor,
    B: p.bColor,
    A: p.surfaceColor
  }

    ; (['C', 'B', 'A'] as const).forEach((id) => {
      const material = layerRuntime[id].mesh.material
      material.color.setHex(materials[id])
    })
  layerRuntime.E.mesh.material.color.setHex(0xd3cfc8)

  if (p.blurColors) {
    layerRuntime.B.mesh.material.color.lerp(
      layerRuntime.C.mesh.material.color,
      0.6
    )

    layerRuntime.A.mesh.material.color.lerp(
      layerRuntime.B.mesh.material.color,
      0.4
    )

    layerRuntime.E.mesh.material.color.copy(
      layerRuntime.A.mesh.material.color
    )
  }

  let currentY = -MAX_TOTAL_HEIGHT / 2

  layerDefinitions.forEach((def) => {
    const height = p.heights[def.id]
    const runtime = layerRuntime[def.id]
    const visible = height >= MIN_LAYER_HEIGHT

    runtime.visible = visible
    runtime.mesh.visible = visible

    if (visible) {
      runtime.mesh.scale.y = height
      runtime.mesh.position.y = currentY + height / 2
      runtime.centerY = runtime.mesh.position.y
    }

    updateLayerDetailGroup(
      def.id,
      currentY,
      height,
      visible
    )

    currentY += height
  })

  const surfaceY = currentY
  waterBaseY = surfaceY + 0.1
  waterPlane.visible =
    state.human === 'paddy' &&
    p.maturity > 0.1 &&
    state.topography !== 'steep'
  waterPlane.position.y = waterBaseY

  hideVegetation()

  let pool: THREE.Sprite[] | null = null
  if (state.human === 'salinization') pool = vegetationPools.dead
  else if (state.human === 'paddy') pool = vegetationPools.rice
  else pool = vegetationPools[p.effectiveBiology]

  if (pool && p.hasBiota) {
    pool.forEach((sprite, index) => {
      const threshold = (index / pool!.length) * 0.8
      const growth = clamp((p.maturity - threshold) * 2.5, 0, 1)

      if (growth > 0) {
        sprite.visible = true
        const base = Number(sprite.userData.baseScale)
        sprite.scale.set(base * growth, base * growth, 1)
        sprite.position.y = surfaceY
      }
    })
  }

  Object.values(rootMeshes).forEach((roots) => {
    if (roots) roots.visible = false
  })

  let activeRoot: THREE.LineSegments | undefined
  if (state.human === 'paddy') activeRoot = rootMeshes.rice
  else activeRoot = rootMeshes[p.effectiveBiology]

  if (
    activeRoot &&
    p.hasBiota &&
    state.human !== 'salinization'
  ) {
    activeRoot.visible = true

    const rootStartY =
      p.heights.O < 0.05
        ? surfaceY
        : surfaceY - p.heights.O

    activeRoot.position.y = rootStartY

    let availableDepth =
      p.heights.A + p.heights.E

    if (state.human === 'paddy') {
      availableDepth += 0
    } else if (p.effectiveBiology === 'grass') {
      availableDepth += p.heights.B * 0.2
    } else {
      availableDepth += p.heights.B * 0.85
    }

    let idealDepth =
      state.human === 'paddy'
        ? 0.8
        : p.effectiveBiology === 'grass'
          ? 2
          : 6

    idealDepth *= Math.max(
      0.01,
      (p.maturity - 0.1) / 0.9
    )

    const finalDepth = Math.max(
      0.2,
      Math.min(
        idealDepth,
        availableDepth
      )
    )

    /*
     * 老版根几何本身很短，finalDepth 是放大系数。
     * 再根据根几何包围盒和土壤总深度做一次安全限制，
     * 防止任何随机分支越过 R 基岩层底部。
     */
    const geometry = activeRoot.geometry
    geometry.computeBoundingBox()

    const boundingBox = geometry.boundingBox
    const baseRootDepth = boundingBox
      ? Math.max(
        0.001,
        Math.abs(boundingBox.min.y)
      )
      : 1

    const soilBottomY =
      -MAX_TOTAL_HEIGHT / 2

    const maximumWorldDepth = Math.max(
      0.2,
      rootStartY - soilBottomY - 0.08
    )

    const safeScale = Math.min(
      finalDepth,
      maximumWorldDepth / baseRootDepth
    )

    activeRoot.scale.set(
      1,
      safeScale,
      1
    )
  }
}

function updateCompare() {
  compareColumns.forEach((column, index) => {
    const scenario = compareScenarios[index]
    // @ts-ignore
    const p = computeProfile({
      ...scenario,
      // @ts-ignore
      time: state.time
    })

    let y = -MAX_TOTAL_HEIGHT * 0.82 / 2

      ; (['R', 'C', 'B', 'E', 'A', 'O'] as LayerId[]).forEach((id) => {
        const layerHeight =
          p.heights[id] * 0.82

        const mesh = column.layers[id]

        if (layerHeight < 0.08) {
          mesh.visible = false
          return
        }

        mesh.visible = true
        mesh.scale.y = layerHeight
        mesh.position.y =
          y + layerHeight / 2

        // 老版只有实际渲染的层才累计高度。
        y += layerHeight
      })

    column.plants.forEach((plant) => {
      plant.visible = p.hasBiota

      if (!plant.visible) return

      plant.scale.set(
        1.1,
        // @ts-ignore
        scenario.biology === 'broadleaf'
          ? 2.6
          : 1.05,
        1
      )

      plant.position.set(
        Number(plant.userData.localX),
        y,
        Number(plant.userData.localZ)
      )
    })

    updateTextSprite(
      column.typeSprite,
      column.typeTexture,
      p.soilType,
      '#64748b',
      30
    )
  })
}

function updateScene() {
  if (
    !soilGroup ||
    !vegetationGroup ||
    !rootGroup ||
    !layerDetailRoot ||
    !compareGroup
  ) {
    return
  }

  if (compareMode.value) {
    soilGroup.visible = false
    vegetationGroup.visible = false
    rootGroup.visible = false
    layerDetailRoot.visible = false
    if (waterPlane) waterPlane.visible = false
    compareGroup.visible = true
    updateCompare()
  } else {
    soilGroup.visible = true
    vegetationGroup.visible = true
    rootGroup.visible = true
    layerDetailRoot.visible = true
    compareGroup.visible = false
    updateSingleProfile()
  }

  updateMap(profile.value.mapKey)
}

function updateLabels() {
  if (!camera || !sceneContainerRef.value || compareMode.value) return

  const width = sceneContainerRef.value.clientWidth
  const height = sceneContainerRef.value.clientHeight

  const items: Array<{
    id: LayerId
    x: number
    y: number
  }> = []

  layerDefinitions.forEach((def) => {
    const runtime = layerRuntime[def.id]

    if (!runtime?.visible) {
      labelStyles[def.id] = hiddenLabel()
      return
    }

    const point = new THREE.Vector3(
      BOX_WIDTH / 2 + 0.05,
      runtime.centerY,
      BOX_DEPTH / 2 + 0.05
    )
    point.project(camera!)

    items.push({
      id: def.id,
      x: (point.x * 0.5 + 0.5) * width,
      y: (-point.y * 0.5 + 0.5) * height
    })
  })

  items.sort((a, b) => a.y - b.y)

  for (let i = 1; i < items.length; i += 1) {
    if (items[i]!.y - items[i - 1]!.y < 30) {
      items[i]!.y = items[i - 1]!.y + 30
    }
  }

  items.forEach((item) => {
    const labelX = Math.min(width - 155, item.x + 55)
    const dx = labelX - item.x
    const dy = item.y - item.y
    const length = Math.max(42, Math.sqrt(dx * dx + dy * dy))

    labelStyles[item.id] = {
      left: `${item.x}px`,
      top: `${item.y}px`,
      display: 'flex',
      opacity: '1',
      '--line-width': `${length}px`,
      '--line-angle': '0rad'
    }
  })
}

function toggleCompareMode() {
  compareMode.value = !compareMode.value

  if (camera && controls) {
    if (compareMode.value) {
      camera.position.set(0, 10, 28)
      controls.target.set(0, 0, 0)
    } else {
      camera.position.set(18, 14, 25)
      controls.target.set(-2, 0, 0)
    }
    controls.update()
  }

  updateScene()
}

function togglePlay() {
  playing.value = !playing.value
  lastFrame = performance.now()
}

function animate(timestamp: number) {
  const delta = lastFrame
    ? Math.min((timestamp - lastFrame) / 1000, 0.05)
    : 0
  lastFrame = timestamp

  if (pageVisible.value) {
    if (playing.value) {
      state.time += YEARS_PER_SECOND * delta
      if (state.time >= 25000) {
        state.time = 25000
        playing.value = false
      }
    }

    if (waterPlane?.visible) {
      waterPlane.position.y =
        waterBaseY + Math.sin(timestamp * 0.0025) * 0.018
    }

    controls?.update()
    updateLabels()

    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }

  animationId = requestAnimationFrame(animate)
}

/* ============================== ECharts 地图 ============================== */

let mapChart: echarts.ECharts | null = null
let chinaMapReady = false

function normalizeProvinceName(name: string) {
  return name
    .replace(/特别行政区/g, '')
    .replace(/壮族自治区/g, '')
    .replace(/回族自治区/g, '')
    .replace(/维吾尔自治区/g, '')
    .replace(/自治区/g, '')
    .replace(/省|市/g, '')
}

async function initMap() {
  if (!mapContainerRef.value) return

  mapChart = echarts.init(mapContainerRef.value)

  try {
    const response = await fetch(CHINA_GEOJSON_URL)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const geojson = await response.json()
    echarts.registerMap('china-provinces-local', geojson)
    chinaMapReady = true
    mapLoading.value = false
    updateMap(profile.value.mapKey)
  } catch (error) {
    console.error('中国省级行政区 GeoJSON 加载失败：', error)
    mapLoading.value = true
    mapMessage.value = '本地中国省级行政区 GeoJSON 加载失败'
  }
}

function updateMap(key: SoilMapKey) {
  if (!mapChart || !chinaMapReady) return

  const p = mapProfiles[key]
  const core = new Set(p.core.map(normalizeProvinceName))
  const related = new Set(p.related.map(normalizeProvinceName))

  mapChart.setOption({
    animationDurationUpdate: 450,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      formatter(params: any) {
        if (params.seriesType === 'effectScatter') {
          return `${params.name}<br/>代表性分布点`
        }

        const provinceName = normalizeProvinceName(
          String(params.name || '')
        )

        if (core.has(provinceName)) {
          return `${params.name}<br/>核心分布区`
        }

        if (related.has(provinceName)) {
          return `${params.name}<br/>相关分布区`
        }

        return `${params.name}<br/>非本类型主要分布区`
      }
    },
    geo: {
      map: 'china-provinces-local',
      roam: false,
      center: [104.5, 35.5],
      zoom: 1.48,
      label: { show: false },
      itemStyle: {
        areaColor: '#eef6f5',
        borderColor: '#9fb8b5',
        borderWidth: 0.8
      },
      emphasis: {
        itemStyle: { areaColor: '#bcece6' },
        label: { show: false }
      },
      regions: [
        ...p.core.map((name) => ({
          name,
          itemStyle: { areaColor: '#2ec4b6' }
        })),
        ...p.related.map((name) => ({
          name,
          itemStyle: { areaColor: '#98ded6' }
        }))
      ]
    },
    series: [
      {
        type: 'map',
        map: 'china-provinces-local',
        geoIndex: 0,
        data: [],
        silent: true
      },
      {
        id: 'soil-location-scatter',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        z: 20,
        color: '#e11d48',
        data: p.points,
        symbol: 'circle',
        symbolSize(value: number[]) {
          return 4 + value[2]! / 26
        },
        rippleEffect: {
          period: 3.2,
          scale: 2.2,
          brushType: 'stroke',
          number: 2
        },
        itemStyle: {
          color: '#e11d48',
          borderColor: '#ffffff',
          borderWidth: 1.5,
          shadowBlur: 8,
          shadowColor: 'rgba(225, 29, 72, 0.45)'
        },
        emphasis: {
          scale: 1.2,
          itemStyle: {
            color: '#be123c'
          }
        },
        label: {
          show: true,
          formatter: '{b}',
          position: 'right',
          distance: 4,
          color: '#334155',
          fontSize: 9,
          fontWeight: 700
        },
        labelLayout: {
          hideOverlap: true,
          moveOverlap: 'shiftY'
        }
      }
    ]
  }, {
    notMerge: true
  })

  void core
  void related
}

/* ============================== 微观场景 ============================== */

let microScene: THREE.Scene | null = null
let microCamera: THREE.PerspectiveCamera | null = null
let microRenderer: THREE.WebGLRenderer | null = null
let microControls: OrbitControls | null = null
let microAnimationId = 0
let microResizeObserver: ResizeObserver | null = null
let microResizeFrame = 0
let microLastWidth = 0
let microLastHeight = 0
let microRoot: THREE.Group | null = null
let microLoaded = false

function buildMicroFallback() {
  if (!microScene) return

  const group = new THREE.Group()

  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(8, 3.4, 6, 18, 8, 18),
    new THREE.MeshStandardMaterial({
      color: 0x6b4427,
      roughness: 0.95
    })
  )
  soil.position.y = -1.3
  group.add(soil)

  const rootMaterial = new THREE.LineBasicMaterial({
    color: 0xd6b47d,
    transparent: true,
    opacity: 0.9
  })

  for (let i = 0; i < 30; i += 1) {
    const points: THREE.Vector3[] = []
    let x = (Math.random() - 0.5) * 6
    let y = 0.3
    let z = (Math.random() - 0.5) * 4

    points.push(new THREE.Vector3(x, y, z))

    for (let j = 0; j < 5; j += 1) {
      x += (Math.random() - 0.5) * 0.7
      y -= 0.45 + Math.random() * 0.3
      z += (Math.random() - 0.5) * 0.6
      points.push(new THREE.Vector3(x, y, z))
    }

    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        rootMaterial
      )
    )
  }

  for (let i = 0; i < 10; i += 1) {
    const worm = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.07, 8, 24, Math.PI * 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xd9776a,
        roughness: 0.65
      })
    )
    worm.position.set(
      (Math.random() - 0.5) * 6,
      -0.4 - Math.random() * 2,
      3.05
    )
    worm.rotation.z = Math.random() * Math.PI
    group.add(worm)
  }

  for (let i = 0; i < 16; i += 1) {
    const microbe = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + Math.random() * 0.12, 12, 12),
      new THREE.MeshStandardMaterial({
        color: i % 2 ? 0x2ec4b6 : 0xf59e0b,
        emissive: i % 2 ? 0x073f3a : 0x4a2c00,
        emissiveIntensity: 0.35
      })
    )
    microbe.position.set(
      (Math.random() - 0.5) * 6.5,
      -0.3 - Math.random() * 2.5,
      3.15
    )
    group.add(microbe)
  }

  microRoot = group
  microScene.add(group)
}

function initMicroScene() {
  if (!microContainerRef.value || microScene) return

  const rect =
    microContainerRef.value.getBoundingClientRect()

  const width =
    Math.max(
      1,
      Math.round(
        rect.width ||
        microContainerRef.value.clientWidth ||
        microContainerRef.value.offsetWidth ||
        1
      )
    )

  const height =
    Math.max(
      1,
      Math.round(
        rect.height ||
        microContainerRef.value.clientHeight ||
        microContainerRef.value.offsetHeight ||
        1
      )
    )

  microScene = new THREE.Scene()
  microScene.background = new THREE.Color(0xfffdf7)

  microCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
  microCamera.position.set(12, 6, 16)

  microRenderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  })
  microRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  microRenderer.setSize(width, height, false)
  microRenderer.outputColorSpace = THREE.SRGBColorSpace
  microRenderer.toneMapping = THREE.ACESFilmicToneMapping
  microRenderer.toneMappingExposure = 1.65
  microRenderer.domElement.className = 'micro-scene-canvas'
  microRenderer.domElement.style.display = 'block'
  microRenderer.domElement.style.width = '100%'
  microRenderer.domElement.style.height = '100%'
  microContainerRef.value.appendChild(microRenderer.domElement)

  microControls = new OrbitControls(microCamera, microRenderer.domElement)
  microControls.enableDamping = true
  microControls.dampingFactor = 0.05
  microControls.target.set(0, -1, 0)
  microControls.minDistance = 8
  microControls.maxDistance = 25

  microScene.add(
    new THREE.AmbientLight(0xfff7e8, 1.65)
  )

  microScene.add(
    new THREE.HemisphereLight(0xffffff, 0xb48a5f, 2)
  )

  const keyLight = new THREE.DirectionalLight(
    0xfff2d8,
    1.35
  )
  keyLight.position.set(8, 18, 12)
  microScene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(
    0xeaf6ff,
    1.05
  )
  fillLight.position.set(-12, 8, -10)
  microScene.add(fillLight)

  const frontLight = new THREE.DirectionalLight(
    0xffffff,
    0.9
  )
  frontLight.position.set(0, 6, 18)
  microScene.add(frontLight)

  buildMicroFallback()

  microResizeObserver?.disconnect()
  microResizeObserver = new ResizeObserver(() => {
    scheduleMicroSceneResize(true)
  })
  microResizeObserver.observe(microContainerRef.value)

  resizeMicroScene(true)
  startMicroAnimation()
}

function resizeMicroScene(force = false) {
  if (!microContainerRef.value || !microRenderer || !microCamera) return

  const rect =
    microContainerRef.value.getBoundingClientRect()

  const width =
    Math.max(
      1,
      Math.round(
        rect.width ||
        microContainerRef.value.clientWidth ||
        microContainerRef.value.offsetWidth ||
        1
      )
    )

  const height =
    Math.max(
      1,
      Math.round(
        rect.height ||
        microContainerRef.value.clientHeight ||
        microContainerRef.value.offsetHeight ||
        1
      )
    )

  if (
    !force &&
    width === microLastWidth &&
    height === microLastHeight
  ) {
    return
  }

  microLastWidth = width
  microLastHeight = height

  microCamera.aspect = width / height
  microCamera.updateProjectionMatrix()

  microRenderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  )

  microRenderer.setSize(width, height, false)

  microRenderer.domElement.style.display = 'block'
  microRenderer.domElement.style.width = '100%'
  microRenderer.domElement.style.height = '100%'
}

function scheduleMicroSceneResize(force = false) {
  if (microResizeFrame) {
    cancelAnimationFrame(microResizeFrame)
  }

  microResizeFrame =
    requestAnimationFrame(() => {
      microResizeFrame = 0
      resizeMicroScene(force)
    })
}

function resizeMicroSceneAfterModalOpen() {
  scheduleMicroSceneResize(true)

  window.setTimeout(() => {
    scheduleMicroSceneResize(true)
  }, 80)

  window.setTimeout(() => {
    scheduleMicroSceneResize(true)
  }, 220)
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose?.()

    const material = mesh.material
    if (material) {
      const materials = Array.isArray(material) ? material : [material]
      materials.forEach((mat: any) => {
        mat.map?.dispose?.()
        mat.emissiveMap?.dispose?.()
        mat.normalMap?.dispose?.()
        mat.dispose?.()
      })
    }
  })
}

function loadMicroModel(retryCount = 0) {
  if (!microScene || microLoaded) return

  microLoading.value = true

  const loader = new GLTFLoader()
  loader.setCrossOrigin('anonymous')

  loader.load(
    MICRO_MODEL_URL,
    (gltf) => {
      if (!microScene || !microCamera || !microControls) {
        return
      }

      if (microRoot) {
        microScene.remove(microRoot)
        disposeObject(microRoot)
      }

      const model = gltf.scene

      model.traverse((object) => {
        const mesh = object as THREE.Mesh

        if (!mesh.isMesh || !mesh.material) return

        mesh.castShadow = false
        mesh.receiveShadow = false

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]

        materials.forEach((material: any) => {
          if (!material) return

          material.side = THREE.DoubleSide

          // 保留 GLB 自带的原始颜色和贴图，不再进行教材色染色。
          // GLTFLoader 已按 glTF 规范处理贴图，这里只确保颜色贴图使用 sRGB。
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace
            material.map.needsUpdate = true
          }

          if (material.emissiveMap) {
            material.emissiveMap.colorSpace = THREE.SRGBColorSpace
            material.emissiveMap.needsUpdate = true
          }

          // 清除上一版额外叠加的发光，避免植被和土块偏绿、偏暗。
          if (material.emissive) {
            material.emissive.set(0x000000)
          }

          if ('emissiveIntensity' in material) {
            material.emissiveIntensity = 0
          }

          // 不再把主颜色、粗糙度和法线强度改成统一值。
          // 仅避免非土壤模型出现不自然的金属反射。
          if ('metalness' in material) {
            material.metalness = Math.min(
              Number(material.metalness ?? 0),
              0.05
            )
          }

          material.needsUpdate = true
        })
      })

      // 与老版一致：按模型真实包围盒自动居中和缩放，
      // 不再固定放大 3.4 倍，避免模型已经加载却跑出相机视野。
      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDimension = Math.max(size.x, size.y, size.z)

      if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
        throw new Error('GLB 模型包围盒无效')
      }

      const targetSize = 6
      const modelScale = targetSize / maxDimension

      model.scale.setScalar(modelScale)
      model.position.set(
        -center.x * modelScale,
        -center.y * modelScale,
        -center.z * modelScale
      )

      microRoot = model
      microScene.add(model)

      const fieldOfView =
        microCamera.fov * (Math.PI / 180)

      const cameraZ = Math.abs(
        (targetSize * 1.15) /
        (2 * Math.tan(fieldOfView / 2))
      )

      microCamera.position.set(
        cameraZ * 0.75,
        cameraZ * 0.45,
        cameraZ
      )

      microCamera.near = Math.max(0.01, cameraZ / 100)
      microCamera.far = cameraZ * 20
      microCamera.updateProjectionMatrix()

      microControls.target.set(0, 0, 0)
      microControls.update()

      microLoaded = true
      microLoading.value = false
    },
    undefined,
    (error) => {
      console.warn(
        `GLB 模型加载失败，第 ${retryCount + 1} 次尝试：`,
        error
      )

      if (retryCount < 1) {
        window.setTimeout(() => {
          loadMicroModel(retryCount + 1)
        }, 800)
        return
      }

      microLoading.value = false

      // 两次失败后继续保留程序化回退场景，避免弹窗空白。
      if (!microRoot && microScene) {
        buildMicroFallback()
      }
    }
  )
}

function startMicroAnimation() {
  if (microAnimationId) return

  const loop = () => {
    if (microRoot && microOpen.value) {
      // 恢复老版本的缓慢自动旋转，观察不同侧面的根系和洞穴结构。
      microRoot.rotation.y += 0.003
    }

    microControls?.update()

    if (microRenderer && microScene && microCamera && microOpen.value) {
      microRenderer.render(microScene, microCamera)
    }

    microAnimationId = requestAnimationFrame(loop)
  }

  microAnimationId = requestAnimationFrame(loop)
}

async function openMicroModal() {
  microOpen.value = true
  await nextTick()
  initMicroScene()
  resizeMicroScene(true)
  resizeMicroSceneAfterModalOpen()
  loadMicroModel()
}

function closeMicroModal() {
  microOpen.value = false

  if (microResizeFrame) {
    cancelAnimationFrame(microResizeFrame)
    microResizeFrame = 0
  }

  microLastWidth = 0
  microLastHeight = 0
}

/* ============================== 生命周期 ============================== */

watch(
  () => [
    state.parentMaterial,
    state.human,
    state.biology,
    state.precipitation,
    state.temperature,
    state.topography,
    state.time
  ],
  () => updateScene()
)

watch(
  () => profile.value.mapKey,
  (key) => updateMap(key)
)

function handleVisibility() {
  pageVisible.value = !document.hidden
  lastFrame = performance.now()
}

function disposeMainScene() {
  controls?.dispose()
  sceneResizeObserver?.disconnect()

  if (sceneResizeFrame) {
    cancelAnimationFrame(sceneResizeFrame)
    sceneResizeFrame = 0
  }

  if (scene) {
    disposeObject(scene)
  }

  soilTexture?.dispose()
  rockTexture?.dispose()
  sharedLayerGeometry?.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()

  scene = null
  camera = null
  renderer = null
  controls = null
  soilGroup = null
  vegetationGroup = null
  rootGroup = null
  layerDetailRoot = null
  compareGroup = null
  lastSceneWidth = 0
  lastSceneHeight = 0
}

function disposeMicroScene() {
  microResizeObserver?.disconnect()
  microResizeObserver = null

  if (microResizeFrame) {
    cancelAnimationFrame(microResizeFrame)
    microResizeFrame = 0
  }

  microLastWidth = 0
  microLastHeight = 0

  microControls?.dispose()
  microResizeObserver?.disconnect()

  if (microRoot) disposeObject(microRoot)
  microRenderer?.dispose()
  microRenderer?.forceContextLoss()
  microRenderer?.domElement.remove()

  microScene = null
  microCamera = null
  microRenderer = null
  microControls = null
  microRoot = null
}

onMounted(async () => {
  syncLayoutMode()
  window.addEventListener('resize', syncLayoutMode)
  await nextTick()

  initScene()
  await initMap()

  document.addEventListener('visibilitychange', handleVisibility)
  animationId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncLayoutMode)
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(microAnimationId)
  document.removeEventListener('visibilitychange', handleVisibility)

  mapChart?.dispose()
  mapChart = null

  disposeMainScene()
  disposeMicroScene()
})
</script>

<style scoped>
.lucide-icon {
  display: inline-block;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: currentColor;
  stroke: currentColor;
  vertical-align: middle;
}

.soil-profile-container {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 16px;
  overflow: auto;
  color: #1e293b;
  background: #eaf4f4;
  font-family:
    Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.soil-app {
  display: flex;
  width: min(100%,
      1400px,
      calc((100vh - 32px) * 14 / 9));
  max-width: 1400px;
  max-height: 900px;
  aspect-ratio: 14 / 9;
  flex: 0 0 auto;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.15),
    0 8px 24px rgba(15, 23, 42, 0.08);
}

.sidebar {
  z-index: 20;
  display: flex;
  width: 360px;
  min-width: 360px;
  height: 100%;
  flex-direction: column;
  background: #fafbfc;
  border-right: 1px solid #e2e8f0;
}

.brand {
  display: flex;
  min-height: 66px;
  align-items: center;
  padding: 0 22px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.brand-icon {
  display: grid;
  width: 34px;
  height: 34px;
  margin-right: 12px;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #2ec4b6, #1c92d2);
  border-radius: 9px;
}

.brand h1 {
  margin: 0;
  color: #0f766e;
  font-size: 14px;
  letter-spacing: 0.04em;
}

.brand p {
  margin: 3px 0 0;
  color: #94a3b8;
  font-size: 11px;
}

.controls-scroll,
.compare-info {
  flex: 1;
  overflow-y: auto;
}

.control-section {
  padding: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid #edf2f7;
}

.control-section:last-child {
  margin-bottom: 0;
  border-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 11px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.section-title svg {
  color: #2ec4b6;
}

.option-grid {
  display: grid;
  gap: 9px;
}

.option-grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.option-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
  cursor: pointer;
}

.radio-option.compact {
  gap: 5px;
  font-size: 11px;
}

.radio-option.active {
  color: #0f766e;
  font-weight: 600;
}

.radio-option.disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.radio-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-dot {
  position: relative;
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  background: #fff;
  border: 1.5px solid #cbd5e1;
  border-radius: 50%;
}

.radio-option.active .radio-dot {
  background: linear-gradient(135deg, #2ec4b6, #1c92d2);
  border-color: #2ec4b6;
  box-shadow: inset 0 0 0 3px #fff;
}

.warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  color: #d97706;
  font-size: 11px;
  font-weight: 600;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
}

.preset-btn {
  padding: 5px 8px;
  color: #475569;
  font-size: 11px;
  cursor: pointer;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
}

.preset-btn:hover {
  color: #0f766e;
  background: #e6fffb;
  border-color: #2ec4b6;
}

.range-block+.range-block {
  margin-top: 15px;
}

.range-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}

.range-header span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #64748b;
  font-size: 11px;
}

.range-header strong {
  color: #1c92d2;
  font-size: 12px;
}

input[type="range"] {
  width: 100%;
  height: 18px;
  appearance: none;
  cursor: pointer;
  background: transparent;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 5px;
  background: #e2e8f0;
  border-radius: 99px;
}

input[type="range"]::-webkit-slider-thumb {
  width: 17px;
  height: 17px;
  margin-top: -6px;
  appearance: none;
  background: linear-gradient(135deg, #2ec4b6, #1c92d2);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 7px rgba(28, 146, 210, 0.35);
}

.compare-intro,
.scenario-card {
  padding: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.compare-intro {
  margin-bottom: 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.65;
}

.scenario-card {
  margin-bottom: 10px;
}

.scenario-card h3 {
  margin: 0 0 5px;
  color: #0f766e;
  font-size: 12px;
}

.scenario-card p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.55;
}

.back-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  padding: 9px;
  color: #0f766e;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
  border: 1px solid #2ec4b6;
  border-radius: 8px;
}

.main-area {
  position: relative;
  display: flex;
  min-width: 0;
  height: 100%;
  flex: 1;
  flex-direction: column;
}

.engine-tip {
  position: absolute;
  z-index: 30;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  color: #64748b;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #edf2f7;
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  width: 300px;
}

.scene-stage {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background-color: #fcfdfd;
  background-image:
    linear-gradient(#f0fdfa 1px, transparent 1px),
    linear-gradient(90deg, #f0fdfa 1px, transparent 1px);
  background-size: 40px 40px;
}

.scene-stage :deep(.main-three-canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.data-panel {
  position: absolute;
  z-index: 20;
  top: 16px;
  left: 16px;
  width: 280px;
  padding: 15px 18px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
  overflow: auto;
}

.data-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 9px;
  margin-bottom: 9px;
  color: #1e293b;
  font-size: 13px;
  font-weight: 800;
  border-bottom: 2px solid #f1f5f9;
}

.data-title svg {
  color: #2ec4b6;
}

.data-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  color: #64748b;
  font-size: 11px;
  border-bottom: 1px dashed #e2e8f0;
}

.data-row strong {
  color: #1c92d2;
  text-align: right;
}

.data-row strong.teal {
  color: #2ec4b6;
}

.fertility-card {
  padding: 11px;
  margin-top: 13px;
  background: linear-gradient(135deg, #f0fdfa, #eff6ff);
  border: 1px solid #ccfbf1;
  border-radius: 8px;
}

.fertility-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #115e59;
  font-size: 11px;
  font-weight: 800;
}

.fertility-title strong {
  color: #1c92d2;
}

.fertility-card>p {
  margin: 6px 0 9px;
  color: #0f766e;
  font-size: 9px;
  line-height: 1.4;
}

.fertility-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.fertility-grid div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  background: #fff;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.04);
}

.fertility-grid span {
  color: #94a3b8;
  font-size: 9px;
}

.fertility-grid strong {
  margin-top: 3px;
  color: #0f766e;
  font-size: 10px;
  text-align: center;
}

.map-card {
  padding: 10px;
  margin-top: 13px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.map-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #0f766e;
  font-size: 11px;
  font-weight: 800;
}

.map-title span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-title em {
  padding: 2px 5px;
  color: #64748b;
  font-size: 9px;
  font-style: normal;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.map-stage {
  position: relative;
  height: 165px;
  overflow: hidden;
  background: #f8fbff;
  border: 1px solid #e5edf3;
  border-radius: 6px;
}

.map-chart {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.82);
}

.map-card p {
  margin: 7px 0 4px;
  color: #64748b;
  font-size: 9px;
  line-height: 1.45;
}

.map-card>strong {
  display: block;
  color: #0f766e;
  font-size: 9px;
  line-height: 1.4;
}

.floating-btn {
  position: absolute;
  z-index: 25;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
  border: 1px solid #94a3b8;
  border-radius: 999px;
  box-shadow: 0 5px 12px rgba(15, 23, 42, 0.08);
}

.floating-btn:hover,
.floating-btn.active {
  color: #0f766e;
  background: #f0fdfa;
  border-color: #2ec4b6;
}

.compare-btn {
  bottom: 72px;
}

.micro-btn {
  bottom: 20px;
  color: #0f766e;
  border-color: #2ec4b6;
}

.labels-layer {
  position: absolute;
  z-index: 15;
  inset: 0;
  pointer-events: none;
}

.soil-label {
  position: absolute;
  display: flex;
  align-items: center;
  transform: translateY(-50%);
}

.label-line {
  position: relative;
  width: var(--line-width);
  height: 1px;
  margin-right: 6px;
  background: #94a3b8;
  transform: rotate(var(--line-angle));
  transform-origin: left center;
}

.label-line::before {
  position: absolute;
  top: -3px;
  left: -3px;
  width: 7px;
  height: 7px;
  content: "";
  background: #fff;
  border: 2px solid #2ec4b6;
  border-radius: 50%;
}

.label-box {
  padding: 4px 10px;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.05);
}

.timeline {
  z-index: 20;
  display: flex;
  min-height: 86px;
  align-items: center;
  padding: 0 28px;
  background: #fff;
  border-top: 1px solid #edf2f7;
  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.04);
}

.play-btn {
  display: grid;
  width: 38px;
  height: 38px;
  margin-right: 24px;
  place-items: center;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #2ec4b6, #1c92d2);
  border: 0;
  border-radius: 9px;
  box-shadow: 0 5px 13px rgba(46, 196, 182, 0.3);
}

.timeline-main {
  min-width: 0;
  flex: 1;
}

.timeline-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
  color: #94a3b8;
  font-size: 10px;
}

.timeline-labels strong {
  color: #1c92d2;
  font-size: 13px;
}

.modal-mask {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(4px);
}

.micro-modal {
  width: min(950px, 95vw);
  overflow: hidden;
  background: #fff;
  border-radius: 13px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.3);
}

.micro-modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  color: #fff;
  background: linear-gradient(90deg, #2ec4b6, #1c92d2);
}

.micro-modal header>div {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.micro-modal header button {
  display: grid;
  padding: 4px;
  color: #fff;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.micro-content {
  display: grid;
  height: 500px;
  grid-template-columns: 55% 45%;
}

.micro-scene {
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle, #fffdf7, #eee4d3);
  border-right: 1px solid #e2e8f0;
}

.micro-scene canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.micro-hint,
.micro-loading {
  position: absolute;
  z-index: 3;
  color: #64748b;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.78);
  border-radius: 5px;
}

.micro-hint {
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
}

.micro-loading {
  top: 12px;
  left: 50%;
  padding: 6px 10px;
  transform: translateX(-50%);
}

.micro-text {
  overflow-y: auto;
  padding: 22px;
}

.micro-text article {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 14px;
  margin-bottom: 13px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  border-radius: 9px;
}

.micro-text article>svg {
  flex: 0 0 auto;
  color: #2ec4b6;
}

.micro-text h3 {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 12px;
}

.micro-text p {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.65;
}

.micro-text p strong {
  color: #0f766e;
  font-weight: 800;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.24s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 980px) {
  .soil-profile-container {
    padding: 10px;
  }

  .soil-app {
    width: min(100%,
        calc((100vh - 20px) * 14 / 9));
  }

  .sidebar {
    width: 310px;
    min-width: 310px;
  }

  .data-panel {
    width: 255px;
  }
}

@media (max-width: 760px) {
  .soil-profile-container {
    display: block;
    height: auto;
    min-height: 100%;
    padding: 0;
    overflow: visible;
  }

  .soil-app {
    width: 100%;
    max-height: none;
    min-height: 1070px;
    aspect-ratio: auto;
    flex-direction: column;
    border-radius: 0;
  }

  .sidebar {
    width: 100%;
    min-width: 0;
    height: 420px;
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .main-area {
    min-height: 650px;
  }

  .data-panel {
    top: 54px;
    left: 10px;
    width: 245px;
  }

  .engine-tip {
    right: 10px;
  }

  .micro-content {
    height: 72vh;
    grid-template-columns: 1fr;
    grid-template-rows: 52% 48%;
  }

  .micro-scene {
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
  }
}


/* ===================== v9: 回归 3号模板公共样式 =====================
   本版不再覆盖 top-toolbar、toolbar-actions、panel-collapse-btn、
   panel-entry-btn、resize-handle 的样式。
   这些全部交给 geo-page-template.css。
   这里只保留土壤业务主场景本身的尺寸。
*/

.soil-main-area {
  position:
    relative;
  display:
    flex;
  width:
    100%;
  height:
    100%;
  min-width:
    0;
  min-height:
    0;
  flex-direction:
    column;
  overflow:
    hidden;
}

.soil-main-area .scene-stage {
  flex:
    1 1 auto;
  min-height:
    0;
}

.soil-main-area .timeline-dock {
  flex:
    0 0 auto;
}


/* ===================== v11: 微观弹窗可见性修复 + 时间轴收短圆角 + 平板分析面板避让 =====================
   - 修复 v10 重复 microResizeObserver / 函数名不一致导致微观模型不可见；
   - 平板弹窗打开后按真实容器宽高 resize 微观 Three.js；
   - 底部进度条中小屏短一点，并补圆角；
   - 平板上主场景分析面板挪到右侧，避开覆盖式左面板。
*/

/* 微观弹窗 Three 容器：只处理弹窗内部，不碰模板按钮/面板 */
.micro-scene {
  position:
    relative;
  width:
    100%;
  min-width:
    0;
  min-height:
    320px;
  overflow:
    hidden;
}

.micro-scene :deep(canvas),
.micro-scene-canvas {
  display:
    block;
  width:
    100% !important;
  height:
    100% !important;
}

@media (max-width: 1024px) {
  .micro-content {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .micro-scene {
    width:
      100%;
    height:
      min(46vh, 420px);
    min-height:
      280px;
  }
}

@media (max-width: 720px) {
  .micro-modal {
    width:
      min(94vw, 680px);
    max-height:
      92vh;
  }

  .micro-scene {
    height:
      min(42vh, 340px);
    min-height:
      240px;
  }
}

/* 底部进度条：中小屏短一点 + 圆角 */
.soil-main-area .timeline-dock {
  width:
    min(640px, calc(100% - 64px));
  border-radius:
    22px;
}

.soil-main-area .timeline-dock :deep(.el-slider__runway),
.soil-main-area .timeline-dock :deep(.el-slider__bar),
.soil-main-area .timeline-dock :deep(.el-slider__button) {
  border-radius:
    999px;
}

.layout-medium .soil-main-area .timeline-dock {
  width:
    min(500px, calc(100% - 84px));
  border-radius:
    20px;
}

.layout-small .soil-main-area .timeline-dock {
  width:
    min(420px, calc(100% - 72px));
  border-radius:
    18px;
}

@media (max-width: 720px) {
  .soil-main-area .timeline-dock {
    width:
      min(360px, calc(100% - 44px));
    border-radius:
      18px;
  }
}

/* 平板：分析面板移到右侧，避开覆盖式左面板 */
.layout-medium .soil-main-area .analysis-panel {
  left:
    auto;
  right:
    clamp(12px, 2vw, 22px);
  top:
    clamp(54px, 6vh, 72px);
  width:
    min(300px, calc(100% - 36px));
  max-height:
    calc(100% - 152px);
  z-index:
    42;
}

@media (max-width: 1180px) {
  .soil-main-area .analysis-panel {
    left:
      auto;
    right:
      clamp(12px, 2vw, 22px);
    top:
      clamp(54px, 6vh, 72px);
    width:
      min(300px, calc(100% - 36px));
    max-height:
      calc(100% - 152px);
    z-index:
      42;
  }
}

@media (max-width: 760px) {
  .soil-main-area .analysis-panel {
    left:
      auto;
    right:
      10px;
    width:
      min(260px, calc(100% - 20px));
  }
}

/* ===================== v12: 左侧面板宽度连续化 =====================
   对应 script 中 getAdaptiveLeftPanelWidth / getPanelResizeBounds。
   目的：
   - 1280 断点不突然跳宽；
   - 860 断点不突然跳宽；
   - layoutMode 只负责布局形态，不再决定面板宽度。
*/
</style>
