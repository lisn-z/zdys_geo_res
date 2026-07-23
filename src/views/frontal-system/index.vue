<template>
  <div ref="pageRef" class="frontal-sky-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">锋面系统与气旋 · 三维教学模型</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetCurrentModel">
          重置当前模型
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>模型控制</h2>
              <p>锋面置于透明长方体中，清晰观察气团相遇、抬升、成云和降水</p>
            </div>
            <span class="panel-badge">MODEL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">教学模型</h3>

            <div class="model-option-grid">
              <button v-for="item in modelOptions" :key="item.value" type="button"
                class="theme-btn option-btn model-option-btn" :class="{ active: currentModel === item.value }"
                @click="selectModel(item.value)">
                <span class="model-option-symbol">{{ item.symbol }}</span>
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">演示阶段</h3>

            <div class="stage-option-list">
              <button v-for="(item, index) in currentDefinition.stages" :key="item.label" type="button"
                class="theme-btn option-btn stage-option-btn" :class="{ active: currentStageIndex === index }"
                @click="selectStage(index)">
                <span class="stage-number">{{ index + 1 }}</span>
                <span class="stage-option-copy">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.short }}</small>
                </span>
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="view-option-grid">
              <button v-for="item in viewOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: viewMode === item.value }" @click="viewMode = item.value">
                {{ item.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">推进速度</h3>
              <strong class="control-value">{{ flowSpeed.toFixed(1) }}×</strong>
            </div>
            <el-slider v-model="flowSpeed" :min="0.4" :max="1.8" :step="0.1" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">空气湿度</span>
              <strong class="control-value">{{ Math.round(humidity * 100) }}%</strong>
            </div>
            <el-slider v-model="humidity" :min="0.3" :max="1" :step="0.05" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">冷暖温差</span>
              <strong class="control-value">
                {{ Math.round(temperatureContrast * 12) }}℃
              </strong>
            </div>
            <el-slider v-model="temperatureContrast" :min="0.5" :max="1.6" :step="0.1" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">天空阴沉度</span>
              <strong class="control-value">{{ Math.round(cloudiness * 100) }}%</strong>
            </div>
            <el-slider v-model="cloudiness" :min="0" :max="1" :step="0.05" :show-tooltip="false" />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">图层显示</h3>

            <div class="layer-control-list">
              <div v-for="item in layerOptions" :key="item.key" class="switch-row">
                <div class="control-copy">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.description }}</span>
                </div>
                <el-switch v-model="layers[item.key]" />
              </div>
            </div>
          </section>

          <button type="button" class="theme-btn reset-scene-btn" @click="resetAtmosphereParameters">
            恢复默认大气参数
          </button>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div ref="threeContainerRef" class="scene-host three-host"></div>

        <div class="scene-ui-layer">
          <div v-if="sceneStatus !== 'ready'" class="scene-status-overlay">
            <div class="scene-status-content">
              <span v-if="sceneStatus === 'loading'" class="scene-loading-ring"></span>
              <strong>
                {{
                  sceneStatus === 'loading'
                    ? '正在构建真实天空与大气'
                    : '场景初始化失败'
                }}
              </strong>
              <p>
                {{
                  sceneStatus === 'loading'
                    ? '正在创建教学长方体、冷暖气团、抬升云层和动态降水…'
                    : sceneErrorMessage
                }}
              </p>
            </div>
          </div>

          <div class="model-status-panel">
            <span>{{ currentDefinition.category }}</span>
            <strong>{{ currentDefinition.title }}</strong>
            <p>{{ currentStage.summary }}</p>
            <div class="status-progress">
              <i :style="{ width: progress + '%' }"></i>
            </div>
          </div>

          <div class="scene-legend">
            <div>
              <span class="legend-swatch cold-swatch"></span>
              冷气团
            </div>
            <div>
              <span class="legend-swatch warm-swatch"></span>
              暖气团
            </div>
            <div>
              <span class="legend-front"></span>
              锋面曲面
            </div>
            <div>
              <span class="legend-cloud"></span>
              实体云体
            </div>
            <div v-if="currentModel === 'cyclone'">
              <span class="legend-ribbon"></span>
              气旋烟带
            </div>
          </div>

          <div class="labels-overlay">
            <div v-for="item in screenLabels" :key="item.key" v-show="item.visible && layers.labels" class="scene-label"
              :class="item.className" :style="{ left: item.x + 'px', top: item.y + 'px' }">
              {{ item.text }}
            </div>
          </div>
        </div>

        <div class="timeline-dock frontal-timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停演示' : '播放演示'" :title="isPlaying ? '暂停演示' : '播放演示'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>{{ currentStage.label }}</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider v-model="progress" :min="0" :max="100" :step="0.05" :show-tooltip="false" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>过程解读</h2>
              <p>说明当前气团关系、天气现象和考试重点</p>
            </div>
            <span class="panel-badge">LESSON</span>
          </div>

          <div class="data-grid">
            <article v-for="item in dataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>

          <section class="geo-card stage-explanation-card">
            <span class="stage-explanation-kicker">当前过程</span>
            <h3>{{ currentStage.label }}</h3>
            <p>{{ currentStage.description }}</p>
          </section>

          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="三维结构" name="structure">
              <div class="collapse-content">
                <p v-for="item in currentDefinition.structure" :key="item">
                  {{ item }}
                </p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="云与降水" name="weather">
              <div class="collapse-content">
                <p>{{ currentDefinition.cloud }}</p>
                <p>{{ currentDefinition.rain }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="天气变化" name="passing">
              <div class="collapse-content">
                <p>{{ currentDefinition.passing }}</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="易错点" name="mistake">
              <div class="collapse-content">
                <p>{{ currentDefinition.mistake }}</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
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
  reactive,
  ref,
  watch,
} from 'vue'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'

import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

import {
  Sky,
} from 'three/examples/jsm/objects/Sky.js'

type ModelType =
  | 'coldFront'
  | 'warmFront'
  | 'stationaryFront'
  | 'cyclone'

type ViewMode =
  | 'perspective'
  | 'section'
  | 'top'

type LayerKey =
  | 'airMasses'
  | 'frontSurface'
  | 'clouds'
  | 'rain'
  | 'flowRibbons'
  | 'labels'
  | 'groundGrid'

interface StageDefinition {
  label: string
  short: string
  summary: string
  description: string
}

interface ModelDefinition {
  title: string
  category: string
  relation: string
  motion: string
  weather: string
  structure: string[]
  cloud: string
  rain: string
  passing: string
  mistake: string
  stages: StageDefinition[]
}

interface ScreenLabel {
  key: string
  text: string
  className: string
  x: number
  y: number
  visible: boolean
}

interface LabelAnchor {
  key: string
  text: string
  className: string
  object: THREE.Object3D
}

interface VolumeHandle {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>
  material: THREE.ShaderMaterial
}

interface CloudHandle {
  mesh: THREE.InstancedMesh<
    THREE.SphereGeometry,
    THREE.MeshLambertMaterial
  >
  count: number
  basePosition: Float32Array
  baseScale: Float32Array
  phase: Float32Array
}

interface RainHandle {
  lines: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >
  positions: Float32Array
  baseX: Float32Array
  baseZ: Float32Array
  top: Float32Array
  speed: Float32Array
}

interface FlowTubeHandle {
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>
  material: THREE.ShaderMaterial
}

interface FrontSurfaceHandle {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  material: THREE.ShaderMaterial
}

interface CameraPreset {
  position: THREE.Vector3
  target: THREE.Vector3
}

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
  left: {
    enabled: hasLeftPanel,
    resizable: true,
  },
  right: {
    enabled: hasRightPanel,
    resizable: true,
  },
  onLayoutChange(state) {
    if (!state.resizing) {
      scheduleSceneResize(90)
    }
  },
  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResize(0)
    }
  },
})

const modelOptions = [
  { label: '冷锋', value: 'coldFront' as const, symbol: '❄' },
  { label: '暖锋', value: 'warmFront' as const, symbol: '☀' },
  { label: '准静止锋', value: 'stationaryFront' as const, symbol: '⇆' },
  { label: '气旋', value: 'cyclone' as const, symbol: '↺' },
]

const definitions: Record<ModelType, ModelDefinition> = {
  coldFront: {
    title: '冷锋形成与过境',
    category: '锋面系统 · 冷锋',
    relation: '冷气团主动推进',
    motion: '冷空气楔入暖空气下方',
    weather: '窄带强降水',
    structure: [
      '冷空气密度大，沿地面快速推进，前缘形成楔形。',
      '暖空气被迫沿陡峭锋面快速上升。',
      '锋面曲面与地面的交线随冷气团向前移动。',
    ],
    cloud: '快速抬升使水汽强烈凝结，形成垂直发展旺盛的积云或积雨云。',
    rain: '降水带较窄，多位于锋线附近或锋后，可能伴随大风和雷暴。',
    passing: '过境时气温骤降、风向改变、气压转升；过境后冷空气控制，天气逐渐转晴。',
    mistake: '冷锋不是两个彩色块相撞。冷空气始终位于下部，并以楔形插入暖空气。',
    stages: [
      {
        label: '冷暖气团分布',
        short: '气团分处两侧',
        summary: '冷空气位于左侧低层，暖空气位于右侧。',
        description: '两个气团尚未相遇，冷空气贴近地面，暖空气体积更松散、垂直范围更大。',
      },
      {
        label: '冷气团快速推进',
        short: '开始接近',
        summary: '冷空气沿地面向暖空气方向推进。',
        description: '冷空气前缘逐渐接近暖空气，交界附近水平温度差和风向差异增强。',
      },
      {
        label: '楔入并迫使暖空气上升',
        short: '锋面形成',
        summary: '冷空气插入暖空气底部，暖空气沿陡坡快速抬升。',
        description: '锋面曲面逐渐清晰，暖空气沿锋面快速上升，垂直云体开始发展。',
      },
      {
        label: '冷锋过境与强降水',
        short: '锋面过境',
        summary: '对流云墙和窄带降水随冷锋向前移动。',
        description: '冷锋过境后，冷空气占据近地面，气温下降、气压升高。',
      },
    ],
  },
  warmFront: {
    title: '暖锋形成与过境',
    category: '锋面系统 · 暖锋',
    relation: '暖气团主动推进',
    motion: '暖空气沿缓坡爬升',
    weather: '锋前连续性降水',
    structure: [
      '冷空气密度大，仍然占据近地面。',
      '暖空气不能直接推开冷空气，只能沿冷空气上表面缓慢爬升。',
      '锋面坡度较缓，抬升范围较宽。',
    ],
    cloud: '暖空气缓慢抬升，依次形成高云、中云和低层雨云，整体呈层状结构。',
    rain: '降水主要位于锋前，范围较广、持续时间较长，强度相对均匀。',
    passing: '过境前云层逐渐增厚并出现连续降水；过境后暖空气控制，气温缓慢升高。',
    mistake: '暖锋不是暖空气位于冷空气下方。冷空气仍在下部，暖空气沿其上方爬升。',
    stages: [
      {
        label: '冷暖气团分布',
        short: '气团分处两侧',
        summary: '暖空气位于左侧，冷空气位于右侧低层。',
        description: '冷空气占据近地面，暖空气从后方向冷空气一侧缓慢移动。',
      },
      {
        label: '暖气团主动推进',
        short: '开始接近',
        summary: '暖空气接近冷空气，但无法在近地面直接取代冷空气。',
        description: '暖空气开始沿冷空气上表面运动，形成平缓的倾斜交界。',
      },
      {
        label: '沿缓坡大范围爬升',
        short: '锋面形成',
        summary: '暖空气在宽广范围内逐渐抬升。',
        description: '高空先出现薄云，随后云层逐渐降低并增厚。',
      },
      {
        label: '暖锋过境与连续降水',
        short: '锋面过境',
        summary: '宽广层状云和连续雨幕向前移动。',
        description: '暖锋通过后，暖空气控制地面，气温缓慢升高，降水逐渐停止。',
      },
    ],
  },
  stationaryFront: {
    title: '准静止锋与持续阴雨',
    category: '锋面系统 · 准静止锋',
    relation: '冷暖气团势力相当',
    motion: '锋面小幅摆动',
    weather: '长时间阴雨',
    structure: [
      '冷暖气团从两侧相互接近，推进力量接近。',
      '任何一方都不能迅速取代另一方，锋面移动缓慢。',
      '暖湿空气持续沿冷空气一侧抬升。',
    ],
    cloud: '锋面附近长期维持宽广层状云，云层不断补充。',
    rain: '降水带位置相对固定，累计降水大，容易形成长时间阴雨。',
    passing: '同一地区可能连续多日阴雨、湿度大、日照少，锋面离开后天气才改善。',
    mistake: '准静止锋不是绝对静止，而是在较小范围内来回摆动。',
    stages: [
      {
        label: '冷暖气团相向移动',
        short: '相向接近',
        summary: '冷暖气团从两侧向交界区域移动。',
        description: '冷暖气团性质差异明显，但双方推进力量逐渐接近。',
      },
      {
        label: '双方势力趋于平衡',
        short: '相互挤压',
        summary: '两个气团在交界处相互挤压，锋面移动减慢。',
        description: '暖空气持续抬升，冷空气仍控制近地面，云层逐渐增厚。',
      },
      {
        label: '锋面来回小幅摆动',
        short: '准静止状态',
        summary: '锋面围绕平均位置缓慢摆动。',
        description: '任何一方都无法快速推进，云雨带位置相对稳定。',
      },
      {
        label: '持续阴雨',
        short: '长期降水',
        summary: '暖湿空气不断补充，形成长时间连续降水。',
        description: '降水强度不一定很大，但持续时间长，累计降水明显。',
      },
    ],
  },
  cyclone: {
    title: '低压气旋气流运动',
    category: '天气系统 · 气旋',
    relation: '近地面向低压中心辐合',
    motion: '螺旋流入、中心上升',
    weather: '中心附近多云雨',
    structure: [
      '气旋是近地面空气围绕低压中心旋转辐合的天气系统。',
      '空气并非绕固定圆环旋转，而是沿螺旋路径不断靠近中心。',
      '到达中心附近后，气流转为上升，高空向外扩散。',
    ],
    cloud: '中心上升运动使水汽凝结，形成旋转云团和螺旋云带。',
    rain: '中心及辐合强烈区域容易形成降水，强度随气旋发展变化。',
    passing: '气旋接近时气压下降、风力增强、云量增多；远离后气压回升、风力减弱。',
    mistake: '气旋描述气流运动，低压描述气压分布，二者是同一天气系统的不同角度。',
    stages: [
      {
        label: '弱低压形成',
        short: '低压出现',
        summary: '中心气压略低，外围空气开始向内弯曲。',
        description: '近地面出现弱辐合，但旋转烟带和中心上升运动还不明显。',
      },
      {
        label: '螺旋辐合发展',
        short: '烟带收缩',
        summary: '外围烟带沿弯曲路径不断向低压中心收缩。',
        description: '多条实体烟带从外围进入中心，路径半径逐渐减小。',
      },
      {
        label: '中心强烈上升',
        short: '成熟阶段',
        summary: '近地面辐合最强，中心形成明显上升烟柱和旋转云团。',
        description: '中心气压较低，风速较大，上升运动使云体和降水明显增强。',
      },
      {
        label: '气旋逐渐衰减',
        short: '系统减弱',
        summary: '烟带流速、中心上升和云雨范围逐渐减弱。',
        description: '气压梯度减小后，低压填塞，气旋最终消散。',
      },
    ],
  },
}

const viewOptions = [
  { label: '立体观察', value: 'perspective' as const },
  { label: '剖面正视', value: 'section' as const },
  { label: '顶部俯视', value: 'top' as const },
]

const layerOptions: Array<{
  key: LayerKey
  label: string
  description: string
}> = [
    { key: 'airMasses', label: '冷暖气团', description: '长方体内的半透明气团实体' },
    { key: 'frontSurface', label: '锋面交界', description: '冷暖气团之间的倾斜界面' },
    { key: 'clouds', label: '云层', description: '抬升凝结形成的实体云团' },
    { key: 'rain', label: '动态雨幕', description: '线段雨滴，不使用点粒子' },
    { key: 'flowRibbons', label: '流动烟带', description: '实体气流管线' },
    { key: 'labels', label: '教学标签', description: '显示气团和系统名称' },
    { key: 'groundGrid', label: '地面网格', description: '辅助观察移动方向' },
  ]

const currentModel = ref<ModelType>('coldFront')
const viewMode = ref<ViewMode>('perspective')
const flowSpeed = ref(1)
const humidity = ref(0.75)
const temperatureContrast = ref(1)
const cloudiness = ref(0.42)
const progress = ref(0)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 2, 4]
const activePanels = ref(['structure', 'weather'])

const layers = reactive<Record<LayerKey, boolean>>({
  airMasses: true,
  frontSurface: true,
  clouds: true,
  rain: true,
  flowRibbons: true,
  labels: true,
  groundGrid: true,
})

const sceneStatus = ref<'loading' | 'ready' | 'error'>('loading')
const sceneErrorMessage = ref('请检查 WebGL 支持或控制台错误。')

const currentDefinition = computed(() => definitions[currentModel.value])
const currentStageIndex = computed(() => {
  return Math.min(3, Math.floor(Math.min(99.999, progress.value) / 25))
})
const currentStage = computed(() => {
  return currentDefinition.value.stages[currentStageIndex.value]!
})

const dataCards = computed(() => [
  {
    label: '当前模型',
    value: modelOptions.find((item) => item.value === currentModel.value)?.label || '',
    description: currentDefinition.value.category,
    className: 'cyan-card',
  },
  {
    label: '气团关系',
    value: currentDefinition.value.relation,
    description: '主动气团与受力关系',
    className: 'blue-card',
  },
  {
    label: '主要运动',
    value: currentDefinition.value.motion,
    description: '水平与垂直气流',
    className: 'purple-card',
  },
  {
    label: '主要天气',
    value: currentDefinition.value.weather,
    description: '云与降水特征',
    className: 'orange-card',
  },
])

const screenLabels = ref<ScreenLabel[]>([])

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let sky: Sky | null = null
let sunLight: THREE.DirectionalLight | null = null
let ambientLight: THREE.HemisphereLight | null = null
let groundGrid: THREE.GridHelper | null = null
let modelRoot: THREE.Group | null = null
let airMassGroup: THREE.Group | null = null
let frontGroup: THREE.Group | null = null
let cloudGroup: THREE.Group | null = null
let rainGroup: THREE.Group | null = null
let flowGroup: THREE.Group | null = null
let markerGroup: THREE.Group | null = null

let sceneResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneAnimationFrameId = 0
let timelineAnimationFrameId = 0
let timelineLastTime = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let lastSceneDpr = 0
let cameraAnimationToken = 0

const sceneClock = new THREE.Clock()
const volumeHandles: VolumeHandle[] = []
const cloudHandles: CloudHandle[] = []
const rainHandles: RainHandle[] = []
const flowTubeHandles: FlowTubeHandle[] = []
const labelAnchors: LabelAnchor[] = []
const generatedTextures: THREE.Texture[] = []

let activeModelUpdater:
  | ((elapsed: number, delta: number, progressValue: number) => void)
  | null = null

const dummyObject = new THREE.Object3D()
const tempWorldPosition = new THREE.Vector3()
const tempLocalCamera = new THREE.Vector3()

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function hashRandom(value: number, offset = 0) {
  const result =
    Math.sin((value + offset * 19.37) * 12.9898) * 43758.5453
  return result - Math.floor(result)
}


function createGroundTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建地表纹理')
  }

  const image = context.createImageData(canvas.width, canvas.height)

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const broad = Math.sin(x * 0.035) * Math.cos(y * 0.028)
      const fine = hashRandom(x + y * canvas.width, 6)
      const value = broad * 7 + fine * 14

      image.data[index] = 70 + value
      image.data[index + 1] = 92 + value
      image.data[index + 2] = 66 + value * 0.55
      image.data[index + 3] = 255
    }
  }

  context.putImageData(image, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(7, 5)
  texture.colorSpace = THREE.SRGBColorSpace
  generatedTextures.push(texture)

  return texture
}

function createVolumeMaterial(
  color: THREE.ColorRepresentation,
  shapeType: number,
  opacity: number
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uCameraLocal: { value: new THREE.Vector3() },
      uOpacity: { value: opacity },
      uShapeType: { value: shapeType },
      uContrast: { value: temperatureContrast.value },
    },
    vertexShader: `
      varying vec3 vLocalPosition;

      void main() {
        vLocalPosition = position;

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uCameraLocal;
      uniform float uOpacity;
      uniform float uShapeType;
      uniform float uContrast;

      varying vec3 vLocalPosition;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float valueNoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);

        f = f * f * (3.0 - 2.0 * f);

        float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

        float nx00 = mix(n000, n100, f.x);
        float nx10 = mix(n010, n110, f.x);
        float nx01 = mix(n001, n101, f.x);
        float nx11 = mix(n011, n111, f.x);
        float nxy0 = mix(nx00, nx10, f.y);
        float nxy1 = mix(nx01, nx11, f.y);

        return mix(nxy0, nxy1, f.z);
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.55;

        for (int octave = 0; octave < 4; octave += 1) {
          value += valueNoise(p) * amplitude;
          p = p * 2.03 + vec3(4.2, 1.7, 2.9);
          amplitude *= 0.5;
        }

        return value;
      }

      vec2 intersectBox(vec3 rayOrigin, vec3 rayDirection) {
        vec3 inverseDirection = 1.0 / rayDirection;
        vec3 t0 = (vec3(-0.5) - rayOrigin) * inverseDirection;
        vec3 t1 = (vec3(0.5) - rayOrigin) * inverseDirection;
        vec3 tMin = min(t0, t1);
        vec3 tMax = max(t0, t1);

        float nearDistance = max(max(tMin.x, tMin.y), tMin.z);
        float farDistance = min(min(tMax.x, tMax.y), tMax.z);

        return vec2(nearDistance, farDistance);
      }

      float edgeFade(vec3 p) {
        vec3 distanceToEdge = vec3(0.5) - abs(p);
        float edge =
          min(
            min(distanceToEdge.x, distanceToEdge.y),
            distanceToEdge.z
          );

        return smoothstep(0.0, 0.10, edge);
      }

      float shapeMask(vec3 p) {
        float height = p.y + 0.5;
        float mask = 1.0;

        if (uShapeType < 0.5) {
          float front = 0.43 - height * 0.64;
          mask =
            1.0 -
            smoothstep(
              front - 0.08,
              front + 0.08,
              p.x
            );

          mask *=
            1.0 -
            smoothstep(
              0.40,
              1.0,
              height
            );
        } else if (uShapeType < 1.5) {
          float back = -0.48 + height * 0.13;

          mask =
            smoothstep(
              back - 0.06,
              back + 0.08,
              p.x
            );

          mask *=
            1.0 -
            smoothstep(
              0.70,
              1.05,
              height
            );
        } else if (uShapeType < 2.5) {
          mask =
            1.0 -
            smoothstep(
              0.24,
              0.40,
              p.x
            );

          mask *=
            1.0 -
            smoothstep(
              0.46,
              0.95,
              height
            );
        } else {
          mask =
            smoothstep(
              -0.40,
              -0.24,
              p.x
            );

          mask *=
            1.0 -
            smoothstep(
              0.72,
              1.02,
              height
            );
        }

        return mask;
      }

      float densityAt(vec3 p) {
        float movingNoise =
          fbm(
            p * 4.2 +
            vec3(
              uTime * 0.055,
              uTime * 0.018,
              -uTime * 0.036
            )
          );

        float detail =
          fbm(
            p * 9.0 -
            vec3(
              uTime * 0.10,
              0.0,
              uTime * 0.07
            )
          );

        float density =
          mix(
            movingNoise,
            detail,
            0.28
          );

        density =
          smoothstep(
            0.28,
            0.88,
            density
          );

        density *= shapeMask(p);
        density *= edgeFade(p);
        density *= 0.72 + uContrast * 0.28;

        return density;
      }

      void main() {
        vec3 rayOrigin = uCameraLocal;
        vec3 rayDirection =
          normalize(
            vLocalPosition -
            rayOrigin
          );

        vec2 intersection =
          intersectBox(
            rayOrigin,
            rayDirection
          );

        if (intersection.x > intersection.y) {
          discard;
        }

        float rayStart = max(intersection.x, 0.0);
        float rayLength =
          max(
            0.0,
            intersection.y -
            rayStart
          );

        const int STEPS = 24;
        float stepLength =
          rayLength /
          float(STEPS);

        vec3 samplePosition =
          rayOrigin +
          rayDirection *
          (
            rayStart +
            stepLength * 0.5
          );

        float accumulatedAlpha = 0.0;
        vec3 accumulatedColor = vec3(0.0);

        for (int stepIndex = 0; stepIndex < STEPS; stepIndex += 1) {
          float density = densityAt(samplePosition);

          float localAlpha =
            density *
            uOpacity *
            stepLength *
            3.2;

          localAlpha =
            clamp(
              localAlpha,
              0.0,
              0.22
            );

          vec3 sampleColor =
            uColor *
            (
              0.72 +
              density * 0.48
            );

          accumulatedColor +=
            (
              1.0 -
              accumulatedAlpha
            ) *
            sampleColor *
            localAlpha;

          accumulatedAlpha +=
            (
              1.0 -
              accumulatedAlpha
            ) *
            localAlpha;

          if (accumulatedAlpha > 0.94) {
            break;
          }

          samplePosition +=
            rayDirection *
            stepLength;
        }

        if (accumulatedAlpha < 0.01) {
          discard;
        }

        gl_FragColor =
          vec4(
            accumulatedColor,
            accumulatedAlpha
          );
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  })
}

function createAirVolume(
  color: THREE.ColorRepresentation,
  shapeType: number,
  opacity: number,
  position: THREE.Vector3,
  scale: THREE.Vector3
) {
  if (!airMassGroup) {
    throw new Error('气团容器尚未创建')
  }

  const material = createVolumeMaterial(color, shapeType, opacity)
  const mesh =
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      material
    )

  mesh.position.copy(position)
  mesh.scale.copy(scale)
  mesh.renderOrder = 3
  mesh.frustumCulled = false

  airMassGroup.add(mesh)

  const handle: VolumeHandle = {
    mesh,
    material,
  }

  volumeHandles.push(handle)
  return handle
}

function createFrontSurfaceMaterial(
  color: THREE.ColorRepresentation
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.44 },
      uWave: { value: 0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uWave;

      varying vec2 vUv;

      void main() {
        vUv = uv;

        vec3 p = position;

        p.x +=
          sin(
            p.z * 0.62 +
            uTime * 0.45
          ) *
          uWave *
          (
            0.30 +
            uv.y * 0.70
          );

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;

      varying vec2 vUv;

      float hash21(vec2 p) {
        return fract(
          sin(
            dot(
              p,
              vec2(127.1, 311.7)
            )
          ) *
          43758.5453
        );
      }

      void main() {
        float stripe =
          sin(
            vUv.y * 34.0 -
            uTime * 1.35
          ) *
          0.5 +
          0.5;

        float grain =
          hash21(
            floor(
              vUv * vec2(72.0, 42.0)
            )
          );

        float edge =
          smoothstep(
            0.0,
            0.07,
            vUv.y
          ) *
          smoothstep(
            1.0,
            0.90,
            vUv.y
          );

        float alpha =
          (
            0.26 +
            stripe * 0.22 +
            grain * 0.12
          ) *
          edge *
          uOpacity;

        vec3 color =
          uColor *
          (
            0.82 +
            stripe * 0.28
          );

        gl_FragColor =
          vec4(
            color,
            alpha
          );
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

function createFrontSurfaceGeometry(
  slope: number,
  width: number,
  height: number,
  segmentsX = 40,
  segmentsY = 24
) {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let yIndex = 0; yIndex <= segmentsY; yIndex += 1) {
    const v = yIndex / segmentsY
    const y = v * height

    for (let xIndex = 0; xIndex <= segmentsX; xIndex += 1) {
      const u = xIndex / segmentsX
      const z = (u - 0.5) * width
      const x = y * slope

      positions.push(x, y, z)
      normals.push(-1, slope, 0)
      uvs.push(u, v)
    }
  }

  for (let yIndex = 0; yIndex < segmentsY; yIndex += 1) {
    for (let xIndex = 0; xIndex < segmentsX; xIndex += 1) {
      const a = yIndex * (segmentsX + 1) + xIndex
      const b = a + 1
      const c = a + segmentsX + 1
      const d = c + 1

      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  )

  geometry.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      normals,
      3
    )
  )

  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      uvs,
      2
    )
  )

  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  return geometry
}

function createFrontSurface(
  color: THREE.ColorRepresentation,
  slope: number,
  width: number,
  height: number
): FrontSurfaceHandle {
  if (!frontGroup) {
    throw new Error('锋面容器尚未创建')
  }

  const material = createFrontSurfaceMaterial(color)
  const mesh =
    new THREE.Mesh(
      createFrontSurfaceGeometry(
        slope,
        width,
        height
      ),
      material
    )

  mesh.renderOrder = 6
  mesh.frustumCulled = false
  frontGroup.add(mesh)

  return {
    mesh,
    material,
  }
}

function createFlowTubeMaterial(
  color: THREE.ColorRepresentation,
  opacity: number,
  speed: number
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uSpeed: { value: speed },
      uVisibility: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uSpeed;
      uniform float uVisibility;

      varying vec2 vUv;

      void main() {
        float travelling =
          fract(
            vUv.x * 3.6 -
            uTime * uSpeed
          );

        float pulse =
          smoothstep(
            0.04,
            0.22,
            travelling
          ) *
          (
            1.0 -
            smoothstep(
              0.52,
              0.92,
              travelling
            )
          );

        float edge =
          smoothstep(
            0.0,
            0.10,
            vUv.y
          ) *
          smoothstep(
            1.0,
            0.90,
            vUv.y
          );

        float alpha =
          (
            0.12 +
            pulse * 0.88
          ) *
          edge *
          uOpacity *
          uVisibility;

        vec3 color =
          uColor *
          (
            0.72 +
            pulse * 0.65
          );

        gl_FragColor =
          vec4(
            color,
            alpha
          );
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

function createFlowTube(
  curve: THREE.Curve<THREE.Vector3>,
  color: THREE.ColorRepresentation,
  radius: number,
  opacity: number,
  speed: number,
  tubularSegments = 120
) {
  if (!flowGroup) {
    throw new Error('气流容器尚未创建')
  }

  const material =
    createFlowTubeMaterial(
      color,
      opacity,
      speed
    )

  const mesh =
    new THREE.Mesh(
      new THREE.TubeGeometry(
        curve,
        tubularSegments,
        radius,
        8,
        false
      ),
      material
    )

  mesh.renderOrder = 8
  mesh.frustumCulled = false
  flowGroup.add(mesh)

  const handle: FlowTubeHandle = {
    mesh,
    material,
  }

  flowTubeHandles.push(handle)
  return handle
}

function createCloudField(
  count: number,
  color: THREE.ColorRepresentation,
  opacity: number
) {
  if (!cloudGroup) {
    throw new Error('云体容器尚未创建')
  }

  const geometry =
    new THREE.SphereGeometry(
      1,
      14,
      10
    )

  const material =
    new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    })

  const mesh =
    new THREE.InstancedMesh(
      geometry,
      material,
      count
    )

  mesh.instanceMatrix.setUsage(
    THREE.DynamicDrawUsage
  )

  mesh.castShadow = true
  mesh.frustumCulled = false
  cloudGroup.add(mesh)

  const handle: CloudHandle = {
    mesh,
    count,
    basePosition: new Float32Array(count * 3),
    baseScale: new Float32Array(count * 3),
    phase: new Float32Array(count),
  }

  cloudHandles.push(handle)
  return handle
}

function setCloudInstance(
  handle: CloudHandle,
  index: number,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  rotationY = 0
) {
  dummyObject.position.copy(position)
  dummyObject.scale.copy(scale)
  dummyObject.rotation.set(0, rotationY, 0)
  dummyObject.updateMatrix()

  handle.mesh.setMatrixAt(
    index,
    dummyObject.matrix
  )
}

function configureCloudBase(
  handle: CloudHandle,
  index: number,
  position: THREE.Vector3,
  scale: THREE.Vector3,
  phase: number
) {
  const index3 = index * 3

  handle.basePosition[index3] = position.x
  handle.basePosition[index3 + 1] = position.y
  handle.basePosition[index3 + 2] = position.z

  handle.baseScale[index3] = scale.x
  handle.baseScale[index3 + 1] = scale.y
  handle.baseScale[index3 + 2] = scale.z

  handle.phase[index] = phase
}

function createRainCurtain(
  count: number,
  color: THREE.ColorRepresentation,
  opacity: number
) {
  if (!rainGroup) {
    throw new Error('降水容器尚未创建')
  }

  const positions = new Float32Array(count * 6)
  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      positions,
      3
    )
  )

  const material =
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

  const lines =
    new THREE.LineSegments(
      geometry,
      material
    )

  lines.frustumCulled = false
  lines.renderOrder = 9
  rainGroup.add(lines)

  const handle: RainHandle = {
    lines,
    positions,
    baseX: new Float32Array(count),
    baseZ: new Float32Array(count),
    top: new Float32Array(count),
    speed: new Float32Array(count),
  }

  rainHandles.push(handle)
  return handle
}

function updateRainLine(
  handle: RainHandle,
  index: number,
  x: number,
  y: number,
  z: number,
  length: number
) {
  const index6 = index * 6

  handle.positions[index6] = x
  handle.positions[index6 + 1] = y
  handle.positions[index6 + 2] = z

  handle.positions[index6 + 3] = x - 0.08
  handle.positions[index6 + 4] = Math.max(0.12, y - length)
  handle.positions[index6 + 5] = z + 0.02
}

function markRainUpdated(handle: RainHandle) {
  const attribute =
    handle.lines.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute

  attribute.needsUpdate = true
}

function createLabelAnchor(
  key: string,
  text: string,
  className: string,
  position: THREE.Vector3,
  parent: THREE.Object3D
) {
  const object = new THREE.Object3D()
  object.position.copy(position)
  parent.add(object)

  labelAnchors.push({
    key,
    text,
    className,
    object,
  })

  return object
}

function updateScreenLabels() {
  const container = threeContainerRef.value

  if (!container || !camera) {
    return
  }

  const width = container.clientWidth
  const height = container.clientHeight

  if (width <= 0 || height <= 0) {
    return
  }

  screenLabels.value =
    labelAnchors.map((item) => {
      item.object.getWorldPosition(
        tempWorldPosition
      )

      tempWorldPosition.project(camera!)

      return {
        key: item.key,
        text: item.text,
        className: item.className,
        x: (tempWorldPosition.x * 0.5 + 0.5) * width,
        y: (-tempWorldPosition.y * 0.5 + 0.5) * height,
        visible:
          tempWorldPosition.z > -1 &&
          tempWorldPosition.z < 1,
      }
    })
}

function createModelGroups() {
  if (!scene) {
    return
  }

  modelRoot = new THREE.Group()
  airMassGroup = new THREE.Group()
  frontGroup = new THREE.Group()
  cloudGroup = new THREE.Group()
  rainGroup = new THREE.Group()
  flowGroup = new THREE.Group()
  markerGroup = new THREE.Group()

  modelRoot.add(
    airMassGroup,
    frontGroup,
    cloudGroup,
    rainGroup,
    flowGroup,
    markerGroup
  )

  scene.add(modelRoot)
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const candidate =
      child as THREE.Object3D & {
        geometry?: THREE.BufferGeometry
        material?: THREE.Material | THREE.Material[]
      }

    candidate.geometry?.dispose()

    if (Array.isArray(candidate.material)) {
      candidate.material.forEach((material) => {
        material.dispose()
      })
    } else {
      candidate.material?.dispose()
    }
  })
}

function clearModel() {
  if (scene && modelRoot) {
    scene.remove(modelRoot)
    disposeObject(modelRoot)
  }

  volumeHandles.length = 0
  cloudHandles.length = 0
  rainHandles.length = 0
  flowTubeHandles.length = 0
  labelAnchors.length = 0
  screenLabels.value = []

  modelRoot = null
  airMassGroup = null
  frontGroup = null
  cloudGroup = null
  rainGroup = null
  flowGroup = null
  markerGroup = null
  activeModelUpdater = null
}



interface TeachingChamberHandle {
  group: THREE.Group
  width: number
  height: number
  depth: number
}

interface AirPrismHandle {
  mesh: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshStandardMaterial
  >
  geometry: THREE.BufferGeometry
  side: 'left' | 'right'
}

function createTeachingChamber(): TeachingChamberHandle {
  if (!markerGroup) {
    throw new Error('教学箱容器尚未创建')
  }

  const width = 24
  const height = 11
  const depth = 13

  const group = new THREE.Group()

  const floor =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        width,
        depth
      ),
      new THREE.MeshStandardMaterial({
        color: '#dbe4e7',
        roughness: 0.94,
        metalness: 0,
      })
    )

  floor.rotation.x =
    -Math.PI / 2

  floor.position.y = 0.015
  floor.receiveShadow = true
  group.add(floor)

  const panelMaterial =
    new THREE.MeshStandardMaterial({
      color: '#dce8ec',
      transparent: true,
      opacity: 0.22,
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

  const back =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        width,
        height
      ),
      panelMaterial.clone()
    )

  back.position.set(
    0,
    height / 2,
    -depth / 2
  )

  group.add(back)

  const leftSide =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        depth,
        height
      ),
      panelMaterial.clone()
    )

  leftSide.rotation.y =
    Math.PI / 2

  leftSide.position.set(
    -width / 2,
    height / 2,
    0
  )

  group.add(leftSide)

  const rightSide =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        depth,
        height
      ),
      panelMaterial.clone()
    )

  rightSide.rotation.y =
    -Math.PI / 2

  rightSide.position.set(
    width / 2,
    height / 2,
    0
  )

  group.add(rightSide)

  const topPanel =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        width,
        depth
      ),
      new THREE.MeshStandardMaterial({
        color: '#f3f8fa',
        transparent: true,
        opacity: 0.055,
        roughness: 0.9,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )

  topPanel.rotation.x =
    Math.PI / 2

  topPanel.position.y =
    height

  group.add(topPanel)

  const edges =
    new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(
          width,
          height,
          depth
        )
      ),
      new THREE.LineBasicMaterial({
        color: '#5a7685',
        transparent: true,
        opacity: 0.82,
      })
    )

  edges.position.y =
    height / 2

  group.add(edges)

  const centerLineGeometry =
    new THREE.BufferGeometry()
      .setFromPoints([
        new THREE.Vector3(
          -width / 2,
          0.045,
          0
        ),
        new THREE.Vector3(
          width / 2,
          0.045,
          0
        ),
      ])

  const centerLine =
    new THREE.Line(
      centerLineGeometry,
      new THREE.LineDashedMaterial({
        color: '#6f8b98',
        transparent: true,
        opacity: 0.38,
        dashSize: 0.35,
        gapSize: 0.24,
      })
    )

  centerLine.computeLineDistances()
  group.add(centerLine)

  for (
    let index = -5;
    index <= 5;
    index += 1
  ) {
    const tick =
      new THREE.Line(
        new THREE.BufferGeometry()
          .setFromPoints([
            new THREE.Vector3(
              index * 2,
              0.055,
              -depth / 2
            ),
            new THREE.Vector3(
              index * 2,
              0.055,
              -depth / 2 + 0.42
            ),
          ]),
        new THREE.LineBasicMaterial({
          color: '#7893a0',
          transparent: true,
          opacity: 0.45,
        })
      )

    group.add(tick)
  }

  markerGroup.add(group)

  return {
    group,
    width,
    height,
    depth,
  }
}

function createAirPrism(
  side: 'left' | 'right',
  color: THREE.ColorRepresentation,
  opacity: number
): AirPrismHandle {
  if (!airMassGroup) {
    throw new Error('气团容器尚未创建')
  }

  const positions =
    new Float32Array(
      8 * 3
    )

  const geometry =
    new THREE.BufferGeometry()

  const positionAttribute =
    new THREE.BufferAttribute(
      positions,
      3
    )

  positionAttribute.setUsage(
    THREE.DynamicDrawUsage
  )

  geometry.setAttribute(
    'position',
    positionAttribute
  )

  geometry.setIndex([
    0, 1, 2,
    0, 2, 3,

    4, 6, 5,
    4, 7, 6,

    0, 3, 7,
    0, 7, 4,

    1, 5, 6,
    1, 6, 2,

    0, 4, 5,
    0, 5, 1,

    3, 2, 6,
    3, 6, 7,
  ])

  const material =
    new THREE.MeshStandardMaterial({
      color,
      emissive:
        new THREE.Color(color)
          .multiplyScalar(0.10),
      transparent: true,
      opacity,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    )

  mesh.renderOrder = 2
  mesh.frustumCulled = false

  airMassGroup.add(mesh)

  return {
    mesh,
    geometry,
    side,
  }
}

function updateAirPrism(
  handle: AirPrismHandle,
  options: {
    xMin: number
    xMax: number
    yMax: number
    zHalf: number
    boundaryBottomX: number
    boundaryTopX: number
  }
) {
  const {
    xMin,
    xMax,
    yMax,
    zHalf,
    boundaryBottomX,
    boundaryTopX,
  } = options

  const positions =
    handle.geometry
      .getAttribute(
        'position'
      ) as THREE.BufferAttribute

  const leftPolygon =
    handle.side === 'left'

  const x0 =
    leftPolygon
      ? xMin
      : boundaryBottomX

  const x1 =
    leftPolygon
      ? boundaryBottomX
      : xMax

  const x2 =
    leftPolygon
      ? boundaryTopX
      : xMax

  const x3 =
    leftPolygon
      ? xMin
      : boundaryTopX

  const vertices = [
    [x0, 0, -zHalf],
    [x1, 0, -zHalf],
    [x2, yMax, -zHalf],
    [x3, yMax, -zHalf],

    [x0, 0, zHalf],
    [x1, 0, zHalf],
    [x2, yMax, zHalf],
    [x3, yMax, zHalf],
  ]

  vertices.forEach(
    (vertex, index) => {
      positions.setXYZ(
        index,
        vertex[0]!,
        vertex[1]!,
        vertex[2]!
      )
    }
  )

  positions.needsUpdate = true

  handle.geometry.computeVertexNormals()
  handle.geometry.computeBoundingBox()
  handle.geometry.computeBoundingSphere()
}

function createChamberTitle(
  text: string,
  position: THREE.Vector3
) {
  if (!modelRoot) {
    return
  }

  createLabelAnchor(
    'chamber-title',
    text,
    'chamber-label',
    position,
    modelRoot
  )
}

type FrontKind =
  | 'coldFront'
  | 'warmFront'
  | 'stationaryFront'

function buildFrontModel(kind: FrontKind) {
  if (!modelRoot) {
    return
  }

  const isCold =
    kind === 'coldFront'

  const isWarm =
    kind === 'warmFront'

  const isStationary =
    kind === 'stationaryFront'

  const chamber =
    createTeachingChamber()

  const xMin =
    -chamber.width / 2 +
    0.15

  const xMax =
    chamber.width / 2 -
    0.15

  const zHalf =
    chamber.depth / 2 -
    0.22

  const coldIsLeft =
    isCold ||
    isStationary

  const leftMass =
    createAirPrism(
      'left',
      coldIsLeft
        ? '#4d9bd3'
        : '#ef9c58',
      coldIsLeft
        ? 0.36
        : 0.30
    )

  const rightMass =
    createAirPrism(
      'right',
      coldIsLeft
        ? '#ef9c58'
        : '#4d9bd3',
      coldIsLeft
        ? 0.30
        : 0.36
    )

  const front =
    createFrontSurface(
      isCold
        ? '#5fc3ff'
        : isWarm
          ? '#ff8278'
          : '#b88cff',
      isCold
        ? -0.78
        : isWarm
          ? 1.08
          : 0.12,
      chamber.depth - 0.45,
      isCold
        ? 6.4
        : 6.9
    )

  if (isStationary) {
    front.material.uniforms
      .uWave.value = 0.52
  }

  const lowerFlowTubes:
    FlowTubeHandle[] = []

  const upliftTubes:
    FlowTubeHandle[] = []

  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    const z =
      -4.8 +
      index * 2.4

    if (isCold) {
      lowerFlowTubes.push(
        createFlowTube(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(
              -10.5,
              0.72,
              z
            ),
            new THREE.Vector3(
              -7.2,
              0.76,
              z
            ),
            new THREE.Vector3(
              -4.7,
              0.88,
              z
            ),
          ]),
          '#92d9ff',
          0.082,
          0.78,
          0.72
        )
      )

      upliftTubes.push(
        createFlowTube(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(
              -4.2,
              0.95,
              z
            ),
            new THREE.Vector3(
              -3.6,
              2.3,
              z
            ),
            new THREE.Vector3(
              -4.3,
              4.5,
              z
            ),
            new THREE.Vector3(
              -5.8,
              7.8,
              z
            ),
          ]),
          '#ffc18d',
          0.10,
          0.82,
          0.62
        )
      )
    } else if (isWarm) {
      lowerFlowTubes.push(
        createFlowTube(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(
              -10.5,
              1.02,
              z
            ),
            new THREE.Vector3(
              -7.0,
              1.04,
              z
            ),
            new THREE.Vector3(
              -4.8,
              1.10,
              z
            ),
          ]),
          '#ffc08c',
          0.082,
          0.74,
          0.56
        )
      )

      upliftTubes.push(
        createFlowTube(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(
              -4.6,
              1.08,
              z
            ),
            new THREE.Vector3(
              -1.8,
              2.2,
              z
            ),
            new THREE.Vector3(
              2.4,
              4.1,
              z
            ),
            new THREE.Vector3(
              7.8,
              6.7,
              z
            ),
          ]),
          '#ffd2a3',
          0.092,
          0.76,
          0.48
        )
      )
    } else {
      lowerFlowTubes.push(
        createFlowTube(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(
              -10.4,
              0.78,
              z
            ),
            new THREE.Vector3(
              -6.0,
              0.82,
              z
            ),
            new THREE.Vector3(
              -0.7,
              0.94,
              z
            ),
          ]),
          '#93d5ff',
          0.078,
          0.72,
          0.48
        )
      )

      upliftTubes.push(
        createFlowTube(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(
              10.4,
              1.12,
              z
            ),
            new THREE.Vector3(
              6.0,
              1.18,
              z
            ),
            new THREE.Vector3(
              0.8,
              1.32,
              z
            ),
            new THREE.Vector3(
              -0.4,
              4.4,
              z
            ),
          ]),
          '#ffc38c',
          0.082,
          0.72,
          -0.48
        )
      )
    }
  }

  const clouds =
    createCloudField(
      isCold
        ? 86
        : isWarm
          ? 104
          : 112,
      isCold
        ? '#e8ecee'
        : '#edf0f1',
      0.68
    )

  for (
    let index = 0;
    index < clouds.count;
    index += 1
  ) {
    const randomA =
      hashRandom(index, 101)

    const randomB =
      hashRandom(index, 102)

    const randomC =
      hashRandom(index, 103)

    if (isCold) {
      const tower =
        Math.pow(
          randomB,
          0.45
        )

      configureCloudBase(
        clouds,
        index,
        new THREE.Vector3(
          (
            randomA -
            0.5
          ) *
          1.9 -
          tower * 0.45,
          2.0 +
          tower * 7.2,
          (
            randomC -
            0.5
          ) *
          11.4
        ),
        new THREE.Vector3(
          0.75 +
          randomA * 0.85,
          0.62 +
          tower * 1.55,
          0.78 +
          randomC * 0.92
        ),
        hashRandom(
          index,
          104
        ) *
        Math.PI *
        2
      )
    } else if (isWarm) {
      const distance =
        randomA * 9.8

      const cloudLayer =
        randomB

      configureCloudBase(
        clouds,
        index,
        new THREE.Vector3(
          0.5 +
          distance,
          2.0 +
          cloudLayer * 3.2 +
          distance * 0.20,
          (
            randomC -
            0.5
          ) *
          11.5
        ),
        new THREE.Vector3(
          1.3 +
          randomA * 1.9,
          0.38 +
          cloudLayer * 0.42,
          1.0 +
          randomC * 1.55
        ),
        hashRandom(
          index,
          104
        ) *
        Math.PI *
        2
      )
    } else {
      configureCloudBase(
        clouds,
        index,
        new THREE.Vector3(
          (
            randomA -
            0.5
          ) *
          4.7,
          2.0 +
          randomB * 4.7,
          (
            randomC -
            0.5
          ) *
          11.6
        ),
        new THREE.Vector3(
          1.25 +
          randomA * 1.45,
          0.44 +
          randomB * 0.60,
          1.0 +
          randomC * 1.45
        ),
        hashRandom(
          index,
          104
        ) *
        Math.PI *
        2
      )
    }
  }

  const rain =
    createRainCurtain(
      isCold
        ? 660
        : isWarm
          ? 820
          : 900,
      isCold
        ? '#6cc8ff'
        : '#8fc9ea',
      isCold
        ? 0.66
        : 0.58
    )

  for (
    let index = 0;
    index < rain.baseX.length;
    index += 1
  ) {
    if (isCold) {
      rain.baseX[index] =
        (
          hashRandom(
            index,
            111
          ) -
          0.5
        ) *
        2.2

      rain.top[index] =
        3.3 +
        hashRandom(
          index,
          112
        ) *
        5.8

      rain.speed[index] =
        2.8 +
        hashRandom(
          index,
          113
        ) *
        4.0
    } else if (isWarm) {
      rain.baseX[index] =
        0.8 +
        hashRandom(
          index,
          111
        ) *
        8.5

      rain.top[index] =
        2.8 +
        hashRandom(
          index,
          112
        ) *
        4.3

      rain.speed[index] =
        1.5 +
        hashRandom(
          index,
          113
        ) *
        2.5
    } else {
      rain.baseX[index] =
        (
          hashRandom(
            index,
            111
          ) -
          0.5
        ) *
        4.8

      rain.top[index] =
        2.7 +
        hashRandom(
          index,
          112
        ) *
        4.8

      rain.speed[index] =
        1.4 +
        hashRandom(
          index,
          113
        ) *
        2.4
    }

    rain.baseZ[index] =
      (
        hashRandom(
          index,
          114
        ) -
        0.5
      ) *
      11.7
  }

  if (isCold) {
    createLabelAnchor(
      'cold-air',
      '冷气团',
      'cold-label',
      new THREE.Vector3(
        -8.4,
        3.0,
        0
      ),
      modelRoot
    )

    createLabelAnchor(
      'warm-air',
      '暖气团',
      'warm-label',
      new THREE.Vector3(
        6.6,
        6.0,
        0
      ),
      modelRoot
    )

    createChamberTitle(
      '冷空气楔入 · 暖空气快速抬升',
      new THREE.Vector3(
        0,
        10.35,
        0
      )
    )
  } else if (isWarm) {
    createLabelAnchor(
      'warm-air',
      '暖气团',
      'warm-label',
      new THREE.Vector3(
        -7.8,
        6.2,
        0
      ),
      modelRoot
    )

    createLabelAnchor(
      'cold-air',
      '冷气团',
      'cold-label',
      new THREE.Vector3(
        7.8,
        3.0,
        0
      ),
      modelRoot
    )

    createChamberTitle(
      '暖空气沿冷空气缓慢爬升',
      new THREE.Vector3(
        0,
        10.35,
        0
      )
    )
  } else {
    createLabelAnchor(
      'cold-air',
      '冷气团',
      'cold-label',
      new THREE.Vector3(
        -7.8,
        3.0,
        0
      ),
      modelRoot
    )

    createLabelAnchor(
      'warm-air',
      '暖气团',
      'warm-label',
      new THREE.Vector3(
        7.8,
        5.8,
        0
      ),
      modelRoot
    )

    createChamberTitle(
      '冷暖气团势力相当 · 锋面小幅摆动',
      new THREE.Vector3(
        0,
        10.35,
        0
      )
    )
  }

  const frontAnchor =
    createLabelAnchor(
      'front',
      isCold
        ? '冷锋面'
        : isWarm
          ? '暖锋面'
          : '准静止锋面',
      isCold
        ? 'front-label cold-front-label'
        : isWarm
          ? 'front-label warm-front-label'
          : 'front-label stationary-front-label',
      new THREE.Vector3(
        -4.5,
        5.4,
        0
      ),
      modelRoot
    )

  activeModelUpdater = (
    elapsed,
    delta,
    progressValue
  ) => {
    const stage =
      progressValue /
      100

    const contact =
      smoothStep(
        isStationary
          ? 0.12
          : 0.16,
        isStationary
          ? 0.50
          : 0.58,
        stage
      )

    const weather =
      smoothStep(
        isCold
          ? 0.50
          : isWarm
            ? 0.42
            : 0.56,
        isCold
          ? 0.78
          : isWarm
            ? 0.72
            : 0.82,
        stage
      )

    let boundaryBottomX = 0
    let boundaryTopX = 0

    if (isCold) {
      boundaryBottomX =
        -7 +
        stage *
        11.0

      boundaryTopX =
        boundaryBottomX -
        4.4

      updateAirPrism(
        leftMass,
        {
          xMin,
          xMax,
          yMax:
            4.9 +
            temperatureContrast.value *
            0.30,
          zHalf,
          boundaryBottomX,
          boundaryTopX,
        }
      )

      updateAirPrism(
        rightMass,
        {
          xMin,
          xMax,
          yMax:
            10.15,
          zHalf,
          boundaryBottomX:
            boundaryBottomX +
            0.08,
          boundaryTopX:
            boundaryTopX +
            0.08,
        }
      )

      front.mesh.position.x =
        boundaryBottomX

      frontAnchor.position.x =
        boundaryBottomX -
        1.15

      lowerFlowTubes.forEach(
        (tube) => {
          tube.mesh.position.x =
            boundaryBottomX +
            7.0

          tube.material.uniforms
            .uVisibility.value =
            layers.flowRibbons
              ? 0.22 +
              stage * 0.78
              : 0

          tube.material.uniforms
            .uSpeed.value =
            0.50 +
            flowSpeed.value *
            0.42
        }
      )

      upliftTubes.forEach(
        (tube) => {
          tube.mesh.position.x =
            boundaryBottomX +
            4.6

          tube.material.uniforms
            .uVisibility.value =
            layers.flowRibbons
              ? contact
              : 0

          tube.material.uniforms
            .uSpeed.value =
            0.42 +
            flowSpeed.value *
            0.38
        }
      )
    } else if (isWarm) {
      boundaryBottomX =
        -6.6 +
        stage *
        9.6

      boundaryTopX =
        boundaryBottomX +
        7.15

      updateAirPrism(
        leftMass,
        {
          xMin,
          xMax,
          yMax:
            10.15,
          zHalf,
          boundaryBottomX,
          boundaryTopX,
        }
      )

      updateAirPrism(
        rightMass,
        {
          xMin,
          xMax,
          yMax:
            4.8,
          zHalf,
          boundaryBottomX:
            boundaryBottomX +
            0.08,
          boundaryTopX:
            boundaryBottomX +
            3.15,
        }
      )

      front.mesh.position.x =
        boundaryBottomX

      frontAnchor.position.x =
        boundaryBottomX +
        2.55

      lowerFlowTubes.forEach(
        (tube) => {
          tube.mesh.position.x =
            boundaryBottomX +
            6.4

          tube.material.uniforms
            .uVisibility.value =
            layers.flowRibbons
              ? 0.20 +
              stage * 0.80
              : 0
        }
      )

      upliftTubes.forEach(
        (tube) => {
          tube.mesh.position.x =
            boundaryBottomX +
            4.6

          tube.material.uniforms
            .uVisibility.value =
            layers.flowRibbons
              ? contact
              : 0

          tube.material.uniforms
            .uSpeed.value =
            0.30 +
            flowSpeed.value *
            0.30
        }
      )
    } else {
      const stable =
        smoothStep(
          0.36,
          0.70,
          stage
        )

      const oscillation =
        Math.sin(
          elapsed *
          (
            0.26 +
            flowSpeed.value *
            0.24
          )
        ) *
        (
          0.10 +
          stable * 0.72
        )

      boundaryBottomX =
        oscillation

      boundaryTopX =
        boundaryBottomX +
        1.0

      const approach =
        contact * 2.2

      updateAirPrism(
        leftMass,
        {
          xMin,
          xMax,
          yMax:
            5.1,
          zHalf,
          boundaryBottomX:
            boundaryBottomX -
            approach * 0.12,
          boundaryTopX:
            boundaryBottomX -
            0.9,
        }
      )

      updateAirPrism(
        rightMass,
        {
          xMin,
          xMax,
          yMax:
            9.7,
          zHalf,
          boundaryBottomX:
            boundaryBottomX +
            0.08,
          boundaryTopX:
            boundaryTopX +
            0.45,
        }
      )

      front.mesh.position.x =
        boundaryBottomX

      frontAnchor.position.x =
        boundaryBottomX

      lowerFlowTubes.forEach(
        (tube) => {
          tube.mesh.position.x =
            boundaryBottomX +
            0.5

          tube.material.uniforms
            .uVisibility.value =
            layers.flowRibbons
              ? 0.25 +
              contact * 0.75
              : 0
        }
      )

      upliftTubes.forEach(
        (tube) => {
          tube.mesh.position.x =
            boundaryBottomX -
            0.4

          tube.material.uniforms
            .uVisibility.value =
            layers.flowRibbons
              ? 0.18 +
              contact * 0.82
              : 0
        }
      )
    }

    front.mesh.visible =
      layers.frontSurface &&
      stage > 0.08

    front.material.uniforms
      .uOpacity.value =
      0.12 +
      contact * 0.60

    leftMass.mesh.visible =
      layers.airMasses

    rightMass.mesh.visible =
      layers.airMasses

    leftMass.mesh.material.opacity =
      (
        coldIsLeft
          ? 0.24
          : 0.20
      ) +
      temperatureContrast.value *
      0.10

    rightMass.mesh.material.opacity =
      (
        coldIsLeft
          ? 0.20
          : 0.24
      ) +
      temperatureContrast.value *
      0.10

    clouds.mesh.visible =
      layers.clouds &&
      contact > 0.04

    clouds.mesh.material.opacity =
      humidity.value *
      (
        0.18 +
        contact * 0.58
      )

    for (
      let index = 0;
      index < clouds.count;
      index += 1
    ) {
      const index3 =
        index * 3

      const baseX =
        clouds.basePosition[
        index3
        ]

      const baseY =
        clouds.basePosition[
        index3 + 1
        ]

      const baseZ =
        clouds.basePosition[
        index3 + 2
        ]

      const phase =
        clouds.phase[index]

      const position =
        new THREE.Vector3(
          boundaryBottomX +
          baseX,
          baseY +
          Math.sin(
            elapsed *
            0.16 +
            phase
          ) *
          0.07,
          baseZ
        )

      if (isCold) {
        position.y =
          1.5 +
          (
            position.y -
            1.5
          ) *
          clamp(
            0.12 +
            contact *
            1.15,
            0.12,
            1
          )
      } else if (isWarm) {
        position.y =
          1.5 +
          (
            position.y -
            1.5
          ) *
          clamp(
            0.28 +
            contact,
            0.28,
            1
          )
      }

      const scale =
        new THREE.Vector3(
          clouds.baseScale[
          index3
          ],
          clouds.baseScale[
          index3 + 1
          ] *
          (
            isCold
              ? 0.45 +
              contact * 0.78
              : 0.70 +
              contact * 0.32
          ),
          clouds.baseScale[
          index3 + 2
          ]
        )

      setCloudInstance(
        clouds,
        index,
        position,
        scale,
        phase
      )
    }

    clouds.mesh
      .instanceMatrix
      .needsUpdate = true

    rain.lines.visible =
      layers.rain &&
      weather > 0.03

    rain.lines.material.opacity =
      humidity.value *
      weather *
      (
        isCold
          ? 0.72
          : isWarm
            ? 0.60
            : 0.64
      )

    for (
      let index = 0;
      index < rain.baseX.length;
      index += 1
    ) {
      const top =
        rain.top[index]

      const y =
        top -
        (
          elapsed *
          rain.speed[index] *
          flowSpeed.value +
          index *
          0.021
        ) %
        top

      updateRainLine(
        rain,
        index,
        boundaryBottomX +
        rain.baseX[index],
        Math.max(
          0.18,
          y
        ),
        rain.baseZ[index],
        isCold
          ? 0.82
          : 0.66
      )
    }

    markRainUpdated(rain)
  }
}

function createCycloneSpiralCurve(
  armIndex: number,
  armCount: number
) {
  const points: THREE.Vector3[] = []
  const samples = 34

  for (let index = 0; index < samples; index += 1) {
    const t = index / (samples - 1)
    const radius = THREE.MathUtils.lerp(12.5, 0.65, t)
    const angle =
      armIndex /
      armCount *
      Math.PI *
      2 +
      t *
      Math.PI *
      3.6

    const lift =
      Math.pow(
        t,
        3.0
      ) *
      7.5

    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        0.45 + lift,
        Math.sin(angle) * radius
      )
    )
  }

  return new THREE.CatmullRomCurve3(
    points,
    false,
    'catmullrom',
    0.55
  )
}

function buildCycloneModel() {
  if (!modelRoot) {
    return
  }

  const spiralTubes: FlowTubeHandle[] = []
  const armCount = 12

  for (let index = 0; index < armCount; index += 1) {
    spiralTubes.push(
      createFlowTube(
        createCycloneSpiralCurve(
          index,
          armCount
        ),
        index % 3 === 0
          ? '#f4fbff'
          : '#c8dce2',
        0.10 +
        (
          index % 3
        ) *
        0.018,
        0.34 +
        (
          index % 4
        ) *
        0.055,
        0.30 +
        (
          index % 5
        ) *
        0.035,
        150
      )
    )
  }

  const centralUpdraft =
    createFlowTube(
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(0, 0.4, 0),
          new THREE.Vector3(0.4, 3.0, -0.2),
          new THREE.Vector3(-0.3, 6.2, 0.2),
          new THREE.Vector3(0, 10.0, 0),
        ]
      ),
      '#f8fdff',
      0.24,
      0.58,
      0.52,
      120
    )

  const cycloneClouds =
    createCloudField(
      96,
      '#e9eef0',
      0.58
    )

  for (let index = 0; index < cycloneClouds.count; index += 1) {
    const arm = index % 8

    const t =
      (
        Math.floor(index / 8) +
        hashRandom(index, 71) * 0.7
      ) /
      12

    const radius = THREE.MathUtils.lerp(10.5, 0.8, t)

    const angle =
      arm /
      8 *
      Math.PI *
      2 +
      t *
      Math.PI *
      3.4

    configureCloudBase(
      cycloneClouds,
      index,
      new THREE.Vector3(
        Math.cos(angle) * radius,
        2.0 +
        Math.pow(t, 2.2) *
        5.2 +
        hashRandom(index, 72) *
        1.2,
        Math.sin(angle) * radius
      ),
      new THREE.Vector3(
        0.9 +
        hashRandom(index, 73) *
        1.2,
        0.55 +
        hashRandom(index, 74) *
        0.75,
        0.9 +
        hashRandom(index, 75) *
        1.2
      ),
      angle
    )
  }

  const rain =
    createRainCurtain(
      500,
      '#80c9f6',
      0.54
    )

  for (let index = 0; index < rain.baseX.length; index += 1) {
    const radius =
      0.8 +
      hashRandom(index, 81) *
      6.5

    const angle =
      hashRandom(index, 82) *
      Math.PI *
      2

    rain.baseX[index] =
      Math.cos(angle) *
      radius

    rain.baseZ[index] =
      Math.sin(angle) *
      radius

    rain.top[index] =
      3.2 +
      hashRandom(index, 83) *
      4.5

    rain.speed[index] =
      2.0 +
      hashRandom(index, 84) *
      3.2
  }

  const isobarRadii = [
    2.2,
    3.7,
    5.4,
    7.3,
    9.4,
    11.7,
  ]

  isobarRadii.forEach(
    (radius, index) => {
      const curve =
        new THREE.EllipseCurve(
          0,
          0,
          radius * 1.10,
          radius * 0.86,
          0,
          Math.PI * 2,
          false,
          0
        )

      const points =
        curve
          .getPoints(140)
          .map(
            (point) => {
              return new THREE.Vector3(
                point.x,
                0.07 +
                index * 0.004,
                point.y
              )
            }
          )

      const geometry =
        new THREE.BufferGeometry()
          .setFromPoints(points)

      const material =
        new THREE.LineBasicMaterial({
          color: '#d0e2e8',
          transparent: true,
          opacity:
            0.16 +
            index * 0.018,
        })

      const line =
        new THREE.Line(
          geometry,
          material
        )

      markerGroup?.add(line)
    }
  )

  createLabelAnchor(
    'low',
    '低压中心 L',
    'cyclone-label',
    new THREE.Vector3(0, 6.4, 0),
    modelRoot
  )

  createLabelAnchor(
    'spiral',
    '近地面螺旋辐合',
    'flow-label',
    new THREE.Vector3(-7, 2.5, -3),
    modelRoot
  )

  createLabelAnchor(
    'updraft',
    '中心上升',
    'flow-label',
    new THREE.Vector3(1.0, 9.2, 0),
    modelRoot
  )

  activeModelUpdater = (
    elapsed,
    delta,
    progressValue
  ) => {
    const stage = progressValue / 100

    const development =
      stage < 0.70
        ? smoothStep(
          0.02,
          0.64,
          stage
        )
        : 1 -
        smoothStep(
          0.72,
          1,
          stage
        ) *
        0.72

    spiralTubes.forEach(
      (tube, index) => {
        tube.mesh.rotation.y =
          elapsed *
          (
            0.035 +
            flowSpeed.value * 0.040
          )

        tube.material.uniforms.uVisibility.value =
          layers.flowRibbons
            ? 0.10 +
            development * 0.90
            : 0

        tube.material.uniforms.uSpeed.value =
          0.24 +
          flowSpeed.value *
          (
            0.18 +
            index * 0.003
          )

        tube.mesh.scale.setScalar(
          0.88 +
          development * 0.12
        )
      }
    )

    centralUpdraft.material.uniforms.uVisibility.value =
      layers.flowRibbons
        ? smoothStep(
          0.22,
          0.56,
          development
        )
        : 0

    centralUpdraft.material.uniforms.uSpeed.value =
      0.36 +
      flowSpeed.value * 0.30

    cycloneClouds.mesh.visible =
      layers.clouds &&
      development > 0.08

    cycloneClouds.mesh.material.opacity =
      humidity.value *
      (
        0.14 +
        development * 0.56
      )

    for (let index = 0; index < cycloneClouds.count; index += 1) {
      const index3 = index * 3
      const baseX = cycloneClouds.basePosition[index3]
      const baseY = cycloneClouds.basePosition[index3 + 1]
      const baseZ = cycloneClouds.basePosition[index3 + 2]

      const angle =
        elapsed *
        (
          0.035 +
          flowSpeed.value * 0.045
        )

      const cosAngle = Math.cos(angle)
      const sinAngle = Math.sin(angle)

      const position =
        new THREE.Vector3(
          baseX * cosAngle -
          baseZ * sinAngle,
          1.3 +
          (
            baseY -
            1.3
          ) *
          clamp(
            0.25 +
            development,
            0.25,
            1
          ) +
          Math.sin(
            elapsed * 0.14 +
            cycloneClouds.phase[index]
          ) *
          0.08,
          baseX * sinAngle +
          baseZ * cosAngle
        )

      const scale =
        new THREE.Vector3(
          cycloneClouds.baseScale[index3],
          cycloneClouds.baseScale[index3 + 1] *
          (
            0.55 +
            development * 0.55
          ),
          cycloneClouds.baseScale[index3 + 2]
        )

      setCloudInstance(
        cycloneClouds,
        index,
        position,
        scale,
        cycloneClouds.phase[index] +
        angle
      )
    }

    cycloneClouds.mesh.instanceMatrix.needsUpdate =
      true

    rain.lines.visible =
      layers.rain &&
      development > 0.28

    rain.lines.material.opacity =
      humidity.value *
      development *
      0.58

    for (let index = 0; index < rain.baseX.length; index += 1) {
      const top = rain.top[index]

      const y =
        top -
        (
          elapsed *
          rain.speed[index] *
          flowSpeed.value +
          index * 0.024
        ) %
        top

      const rotation =
        elapsed * 0.08

      const x =
        rain.baseX[index] *
        Math.cos(rotation) -
        rain.baseZ[index] *
        Math.sin(rotation)

      const z =
        rain.baseX[index] *
        Math.sin(rotation) +
        rain.baseZ[index] *
        Math.cos(rotation)

      updateRainLine(
        rain,
        index,
        x,
        Math.max(0.18, y),
        z,
        0.70
      )
    }

    markRainUpdated(rain)

    if (frontGroup) {
      frontGroup.visible = false
    }

    if (airMassGroup) {
      airMassGroup.visible = false
    }
  }
}


function applyLayerVisibility() {
  if (airMassGroup) {
    airMassGroup.visible =
      layers.airMasses &&
      currentModel.value !== 'cyclone'
  }

  if (frontGroup) {
    frontGroup.visible =
      layers.frontSurface &&
      currentModel.value !== 'cyclone'
  }

  if (cloudGroup) {
    cloudGroup.visible = layers.clouds
  }

  if (rainGroup) {
    rainGroup.visible = layers.rain
  }

  if (flowGroup) {
    flowGroup.visible = layers.flowRibbons
  }

  if (groundGrid) {
    groundGrid.visible = layers.groundGrid
  }
}

function updateSky() {
  if (!sky || !sunLight) {
    return
  }

  const uniforms = sky.material.uniforms

  const settings: Record<
    ModelType,
    {
      turbidity: number
      rayleigh: number
      mie: number
      elevation: number
      azimuth: number
    }
  > = {
    coldFront: {
      turbidity: 10,
      rayleigh: 1.7,
      mie: 0.007,
      elevation: 16,
      azimuth: 190,
    },
    warmFront: {
      turbidity: 13,
      rayleigh: 2.1,
      mie: 0.009,
      elevation: 20,
      azimuth: 175,
    },
    stationaryFront: {
      turbidity: 18,
      rayleigh: 1.25,
      mie: 0.014,
      elevation: 12,
      azimuth: 188,
    },
    cyclone: {
      turbidity: 14,
      rayleigh: 1.45,
      mie: 0.011,
      elevation: 17,
      azimuth: 185,
    },
  }

  const current =
    settings[currentModel.value]

  const stageDarkening =
    smoothStep(
      0.30,
      0.78,
      progress.value / 100
    )

  uniforms.turbidity.value =
    current.turbidity +
    cloudiness.value * 10 +
    stageDarkening * 4

  uniforms.rayleigh.value =
    current.rayleigh *
    (
      1 -
      cloudiness.value * 0.28
    )

  uniforms.mieCoefficient.value =
    current.mie +
    cloudiness.value * 0.012

  uniforms.mieDirectionalG.value = 0.78

  const elevation =
    current.elevation -
    cloudiness.value * 4

  const phi =
    THREE.MathUtils.degToRad(
      90 -
      elevation
    )

  const theta =
    THREE.MathUtils.degToRad(
      current.azimuth
    )

  const sun =
    new THREE.Vector3()
      .setFromSphericalCoords(
        1,
        phi,
        theta
      )

  uniforms.sunPosition.value.copy(sun)

  sunLight.position.copy(
    sun.multiplyScalar(80)
  )

  sunLight.intensity =
    2.4 -
    cloudiness.value * 1.05 -
    stageDarkening * 0.42

  if (ambientLight) {
    ambientLight.intensity =
      1.45 -
      cloudiness.value * 0.45
  }

  if (
    scene?.fog instanceof
    THREE.FogExp2
  ) {
    const fogColor =
      new THREE.Color(
        currentModel.value ===
          'stationaryFront'
          ? '#9aa5a8'
          : '#b9c7c9'
      )

    fogColor.lerp(
      new THREE.Color('#5e7078'),
      cloudiness.value *
      0.58 +
      stageDarkening *
      0.24
    )

    scene.fog.color.copy(fogColor)
    scene.fog.density =
      0.006 +
      cloudiness.value * 0.008
  }
}

function buildActiveModel() {
  if (!scene) {
    return
  }

  clearModel()
  createModelGroups()

  if (
    currentModel.value ===
    'coldFront'
  ) {
    buildFrontModel('coldFront')
  } else if (
    currentModel.value ===
    'warmFront'
  ) {
    buildFrontModel('warmFront')
  } else if (
    currentModel.value ===
    'stationaryFront'
  ) {
    buildFrontModel('stationaryFront')
  } else {
    buildCycloneModel()
  }

  applyLayerVisibility()

  if (sky) {
    sky.visible =
      currentModel.value ===
      'cyclone'
  }

  if (scene) {
    scene.background =
      currentModel.value ===
        'cyclone'
        ? null
        : new THREE.Color(
          '#cbd9de'
        )
  }

  updateSky()

  activeModelUpdater?.(
    sceneClock.elapsedTime,
    0,
    progress.value
  )

  setCameraImmediate(
    viewMode.value
  )

  updateScreenLabels()
}

function createEnvironment() {
  if (!scene) {
    return
  }

  sky = new Sky()
  sky.scale.setScalar(10000)
  scene.add(sky)

  ambientLight =
    new THREE.HemisphereLight(
      0xddefff,
      0x48523e,
      1.35
    )

  scene.add(ambientLight)

  sunLight =
    new THREE.DirectionalLight(
      0xfff4d8,
      2.2
    )

  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(
    2048,
    2048
  )

  sunLight.shadow.camera.left = -25
  sunLight.shadow.camera.right = 25
  sunLight.shadow.camera.top = 25
  sunLight.shadow.camera.bottom = -25
  sunLight.shadow.camera.near = 1
  sunLight.shadow.camera.far = 180

  scene.add(sunLight)

  const material =
    new THREE.MeshStandardMaterial({
      map: createGroundTexture(),
      color: '#779069',
      roughness: 0.92,
      metalness: 0.01,
    })

  const ground =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        70,
        44
      ),
      material
    )

  ground.rotation.x =
    -Math.PI / 2

  ground.receiveShadow = true
  scene.add(ground)

  groundGrid =
    new THREE.GridHelper(
      52,
      52,
      0x9bbab2,
      0x769087
    )

  groundGrid.position.y = 0.025

  const gridMaterials =
    Array.isArray(
      groundGrid.material
    )
      ? groundGrid.material
      : [groundGrid.material]

  gridMaterials.forEach((item) => {
    item.transparent = true
    item.opacity = 0.14
  })

  scene.add(groundGrid)

  const horizon =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        35,
        42,
        4,
        96,
        1,
        true
      ),
      new THREE.MeshStandardMaterial({
        color: '#60785b',
        roughness: 1,
        metalness: 0,
      })
    )

  horizon.position.y = -1.8
  scene.add(horizon)
}

function updateMaterialTimes(
  elapsed: number
) {
  volumeHandles.forEach((handle) => {
    handle.material.uniforms.uTime.value =
      elapsed

    handle.material.uniforms.uContrast.value =
      temperatureContrast.value

    if (camera) {
      tempLocalCamera.copy(
        camera.position
      )

      handle.mesh.worldToLocal(
        tempLocalCamera
      )

      handle.material.uniforms.uCameraLocal.value.copy(
        tempLocalCamera
      )
    }
  })

  frontGroup?.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof
      THREE.ShaderMaterial &&
      object.material.uniforms.uTime
    ) {
      object.material.uniforms.uTime.value =
        elapsed
    }
  })

  flowTubeHandles.forEach((handle) => {
    handle.material.uniforms.uTime.value =
      elapsed
  })
}

function getCameraPreset(
  mode: ViewMode
): CameraPreset {
  const cyclone =
    currentModel.value === 'cyclone'

  if (mode === 'top') {
    return {
      position:
        new THREE.Vector3(
          0.01,
          cyclone
            ? 26
            : 23,
          0.01
        ),
      target:
        new THREE.Vector3(0, 0, 0),
    }
  }

  if (mode === 'section') {
    return {
      position:
        new THREE.Vector3(
          0,
          cyclone
            ? 6
            : 5.7,
          cyclone
            ? 21
            : 22.5
        ),
      target:
        new THREE.Vector3(
          0,
          cyclone
            ? 3.2
            : 4.3,
          0
        ),
    }
  }

  return {
    position:
      new THREE.Vector3(
        cyclone
          ? 17
          : 18.5,
        cyclone
          ? 12
          : 10.2,
        cyclone
          ? 18
          : 21.5
      ),
    target:
      new THREE.Vector3(
        0,
        cyclone
          ? 3.2
          : 4.4,
        0
      ),
  }
}

function setCameraImmediate(
  mode: ViewMode
) {
  if (!camera || !orbitControls) {
    return
  }

  const preset =
    getCameraPreset(mode)

  camera.position.copy(
    preset.position
  )

  orbitControls.target.copy(
    preset.target
  )

  orbitControls.update()
}

function animateCameraTo(
  mode: ViewMode
) {
  if (!camera || !orbitControls) {
    return
  }

  cameraAnimationToken += 1
  const token = cameraAnimationToken
  const preset = getCameraPreset(mode)
  const startPosition = camera.position.clone()
  const startTarget = orbitControls.target.clone()
  const startTime = performance.now()
  const duration = 680

  function step() {
    if (
      token !==
      cameraAnimationToken ||
      !camera ||
      !orbitControls
    ) {
      return
    }

    const t =
      clamp(
        (
          performance.now() -
          startTime
        ) /
        duration,
        0,
        1
      )

    const eased =
      1 -
      Math.pow(
        1 - t,
        3
      )

    camera.position.lerpVectors(
      startPosition,
      preset.position,
      eased
    )

    orbitControls.target
      .lerpVectors(
        startTarget,
        preset.target,
        eased
      )

    orbitControls.update()

    if (t < 1) {
      requestAnimationFrame(step)
    }
  }

  step()
}

function isLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeSceneNow() {
  const container =
    threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer ||
    !scene
  ) {
    return
  }

  const rect =
    container.getBoundingClientRect()

  const width =
    Math.max(
      1,
      Math.round(rect.width)
    )

  const height =
    Math.max(
      1,
      Math.round(rect.height)
    )

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    )

  const changed =
    width !== lastSceneWidth ||
    height !== lastSceneHeight ||
    dpr !== lastSceneDpr

  if (!changed) {
    updateScreenLabels()
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr

  camera.aspect =
    width / height

  camera.updateProjectionMatrix()

  renderer.setPixelRatio(dpr)

  renderer.setSize(
    width,
    height,
    false
  )

  orbitControls?.update()

  renderer.render(
    scene,
    camera
  )

  updateScreenLabels()
}

function scheduleSceneResize(
  delay = 110
) {
  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  if (isLayoutResizing()) {
    return
  }

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeFrame = 0

          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              sceneResizeSettleFrame = 0
              resizeSceneNow()
            })
        })
    }, delay)
}

function waitForSceneSize(
  timeout = 5000
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      const start =
        performance.now()

      const check = () => {
        const container =
          threeContainerRef.value

        if (!container) {
          reject(
            new Error(
              '没有找到 Three.js 场景容器。'
            )
          )
          return
        }

        const rect =
          container.getBoundingClientRect()

        if (
          rect.width >= 32 &&
          rect.height >= 32
        ) {
          resolve()
          return
        }

        if (
          performance.now() -
          start >= timeout
        ) {
          reject(
            new Error(
              `主场景没有获得有效尺寸：${Math.round(rect.width)} × ${Math.round(rect.height)}`
            )
          )
          return
        }

        requestAnimationFrame(check)
      }

      check()
    }
  )
}

function animateScene() {
  sceneAnimationFrameId =
    requestAnimationFrame(
      animateScene
    )

  if (
    !renderer ||
    !scene ||
    !camera
  ) {
    return
  }

  const delta =
    Math.min(
      sceneClock.getDelta(),
      0.05
    )

  const elapsed =
    sceneClock.elapsedTime

  updateMaterialTimes(elapsed)

  activeModelUpdater?.(
    elapsed,
    delta,
    progress.value
  )

  applyLayerVisibility()

  if (sky) {
    sky.visible =
      currentModel.value ===
      'cyclone'
  }

  updateSky()
  orbitControls?.update()

  renderer.render(
    scene,
    camera
  )

  updateScreenLabels()
}

function animateTimeline(
  time: number
) {
  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )

  if (!timelineLastTime) {
    timelineLastTime = time
    return
  }

  const delta =
    Math.min(
      (
        time -
        timelineLastTime
      ) /
      1000,
      0.10
    )

  timelineLastTime = time

  if (!isPlaying.value) {
    return
  }

  const next =
    progress.value +
    delta *
    playbackSpeed.value *
    8

  if (next >= 100) {
    progress.value = 100
    isPlaying.value = false
  } else {
    progress.value = next
  }
}

function togglePlayback() {
  if (
    progress.value >= 99.95
  ) {
    progress.value = 0
  }

  isPlaying.value =
    !isPlaying.value
}

function selectModel(
  model: ModelType
) {
  if (
    currentModel.value === model
  ) {
    return
  }

  isPlaying.value = false
  progress.value = 0
  currentModel.value = model
}

function selectStage(
  index: number
) {
  isPlaying.value = false

  progress.value =
    clamp(
      index * 25 + 2,
      0,
      100
    )
}

function resetAtmosphereParameters() {
  flowSpeed.value = 1
  humidity.value = 0.75
  temperatureContrast.value = 1
  cloudiness.value = 0.42

  Object.keys(layers).forEach((key) => {
    layers[
      key as LayerKey
    ] = true
  })
}

function resetCurrentModel() {
  setAllCollapsed(false)
  resetWidths()

  isPlaying.value = false
  playbackSpeed.value = 1
  progress.value = 0
  viewMode.value = 'perspective'

  resetAtmosphereParameters()
  buildActiveModel()
  setCameraImmediate('perspective')
  scheduleSceneResize(90)
}

function initScene() {
  const container =
    threeContainerRef.value

  if (!container) {
    throw new Error(
      '没有找到 Three.js 场景容器。'
    )
  }

  const rect =
    container.getBoundingClientRect()

  const width =
    Math.round(rect.width)

  const height =
    Math.round(rect.height)

  if (
    width < 32 ||
    height < 32
  ) {
    throw new Error(
      `主场景尺寸异常：${width} × ${height}`
    )
  }

  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2
    )

  scene = new THREE.Scene()

  scene.fog =
    new THREE.FogExp2(
      '#b8c5c7',
      0.008
    )

  camera =
    new THREE.PerspectiveCamera(
      44,
      width / height,
      0.1,
      20000
    )

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      powerPreference:
        'high-performance',
    })

  renderer.setPixelRatio(dpr)

  renderer.setSize(
    width,
    height,
    false
  )

  renderer.outputColorSpace =
    THREE.SRGBColorSpace

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping

  renderer.toneMappingExposure = 1.05

  renderer.shadowMap.enabled = true

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap

  renderer.domElement.className =
    'three-canvas'

  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr

  container.innerHTML = ''
  container.appendChild(
    renderer.domElement
  )

  orbitControls =
    new OrbitControls(
      camera,
      renderer.domElement
    )

  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.075
  orbitControls.minDistance = 8
  orbitControls.maxDistance = 46
  orbitControls.maxPolarAngle =
    Math.PI * 0.49

  createEnvironment()
  createModelGroups()
  buildActiveModel()
  setCameraImmediate(viewMode.value)
  updateSky()

  renderer.render(
    scene,
    camera
  )

  sceneResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize(110)
    })

  sceneResizeObserver.observe(
    container
  )

  sceneStatus.value = 'ready'
  sceneClock.start()
  animateScene()
}

function disposeScene() {
  cancelAnimationFrame(
    sceneAnimationFrameId
  )

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )
    sceneResizeTimer = null
  }

  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null

  clearModel()
  orbitControls?.dispose()
  orbitControls = null

  if (scene) {
    disposeObject(scene)
  }

  generatedTextures.forEach((texture) => {
    texture.dispose()
  })
  generatedTextures.length = 0

  renderer?.dispose()

  if (
    renderer?.domElement.parentElement
  ) {
    renderer.domElement.parentElement.removeChild(
      renderer.domElement
    )
  }

  scene = null
  camera = null
  renderer = null
  sky = null
  sunLight = null
  ambientLight = null
  groundGrid = null
}

watch(
  currentModel,
  () => {
    buildActiveModel()
    animateCameraTo(
      viewMode.value
    )
  }
)

watch(
  viewMode,
  (value) => {
    animateCameraTo(value)
  }
)

watch(
  [
    cloudiness,
    temperatureContrast,
  ],
  () => {
    updateSky()
  }
)

watch(
  () => [
    layers.airMasses,
    layers.frontSurface,
    layers.clouds,
    layers.rain,
    layers.flowRibbons,
    layers.labels,
    layers.groundGrid,
  ],
  () => {
    applyLayerVisibility()
  }
)

onMounted(async () => {
  await nextTick()

  try {
    await waitForSceneSize()
    initScene()
  } catch (error) {
    sceneStatus.value = 'error'

    sceneErrorMessage.value =
      error instanceof Error
        ? error.message
        : '未知错误'

    console.error(
      'Sky 锋面系统场景初始化失败：',
      error
    )
  }

  timelineAnimationFrameId =
    requestAnimationFrame(
      animateTimeline
    )
})

onBeforeUnmount(() => {
  cancelAnimationFrame(
    timelineAnimationFrameId
  )

  disposeScene()
})
</script>

<style scoped>
/* v6：锋面系统改为透明长方体教学实验箱
   - 冷暖气团使用动态棱柱实体；
   - 冷锋陡峭抬升，暖锋缓坡爬升；
   - 准静止锋小幅摆动；
   - 云层与降水限制在实验箱内部；
   - 气旋继续保留独立非粒子烟带模型。
*/

.frontal-sky-container {
  background: #d7e3e5;
}

.frontal-sky-container .top-toolbar,
.frontal-sky-container .side-panel,
.frontal-sky-container .timeline-dock {
  background: #102332 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}

.frontal-sky-container .top-toolbar {
  border-bottom-color: #315064 !important;
}

.frontal-sky-container .side-panel,
.frontal-sky-container .timeline-dock {
  border-color: #315064 !important;
}

.frontal-sky-container .center-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #b8cad0;
}

.frontal-sky-container .scene-host {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.frontal-sky-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.scene-ui-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.scene-status-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #eaf4f7;
  background: #102332;
}

.scene-status-content {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  max-width: 390px;
  text-align: center;
}

.scene-status-content strong {
  font-size: 18px;
}

.scene-status-content p {
  margin: 0;
  color: #abc1cb;
  font-size: 12px;
  line-height: 1.6;
}

.scene-loading-ring {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(46, 196, 182, 0.18);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: skySceneLoading 0.82s linear infinite;
}

@keyframes skySceneLoading {
  to {
    transform: rotate(360deg);
  }
}

.model-status-panel {
  position: absolute;
  top: 18px;
  left: 18px;
  width: min(345px, calc(100% - 36px));
  padding: 12px 14px;
  color: #edf7f9;
  background: rgba(16, 35, 50, 0.92);
  border: 1px solid #45677b;
  border-radius: 10px;
}

.model-status-panel>span {
  display: block;
  margin-bottom: 3px;
  color: var(--theme-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.model-status-panel strong {
  display: block;
  font-size: clamp(18px, 1.5vw, 24px);
}

.model-status-panel p {
  margin: 6px 0 9px;
  color: #b9ccd3;
  font-size: 12px;
  line-height: 1.55;
}

.status-progress {
  height: 4px;
  overflow: hidden;
  background: #294354;
  border-radius: 999px;
}

.status-progress i {
  display: block;
  height: 100%;
  background: var(--theme-primary);
  transition: width 0.12s linear;
}

.scene-legend {
  position: absolute;
  right: 18px;
  bottom: 92px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 13px;
  max-width: 405px;
  padding: 8px 11px;
  color: #c0d1d7;
  font-size: 11px;
  background: rgba(16, 35, 50, 0.92);
  border: 1px solid #45677b;
  border-radius: 9px;
}

.scene-legend>div {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.cold-swatch {
  background:
    radial-gradient(circle at 35% 35%,
      #b5d9ef,
      #5b9ed4 64%,
      rgba(91, 158, 212, 0.25));
}

.warm-swatch {
  background:
    radial-gradient(circle at 35% 35%,
      #ffe1bf,
      #eeb078 64%,
      rgba(238, 176, 120, 0.25));
}

.legend-front {
  width: 24px;
  height: 3px;
  background: #b990ff;
  border-radius: 999px;
}

.legend-cloud {
  width: 24px;
  height: 12px;
  background: #e8edef;
  border-radius: 999px;
}

.legend-ribbon {
  width: 26px;
  height: 7px;
  background:
    linear-gradient(90deg,
      rgba(225, 238, 242, 0.10),
      #dbe9ed,
      rgba(225, 238, 242, 0.10));
  border-radius: 999px;
}

.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-label {
  position: absolute;
  padding: 5px 9px;
  color: #eef8fa;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(16, 35, 50, 0.92);
  border: 1px solid #45677b;
  border-radius: 6px;
  transform: translate(-50%, -50%);
}

.scene-label.cold-label {
  color: #a9dcff;
  border-color: #4e8cb4;
}

.scene-label.warm-label {
  color: #ffd0a1;
  border-color: #a57249;
}

.scene-label.cold-front-label {
  color: #87d1ff;
  border-color: #378ec3;
}

.scene-label.warm-front-label {
  color: #ffaaa1;
  border-color: #bd625c;
}

.scene-label.stationary-front-label {
  color: #dabaff;
  border-color: #8058a8;
}

.scene-label.cyclone-label,
.scene-label.flow-label {
  color: #e7f1f4;
  border-color: #718e9c;
}

.model-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.model-option-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
}

.model-option-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  flex: 0 0 auto;
  font-size: 16px;
}

.stage-option-list {
  display: grid;
  gap: 7px;
}

.stage-option-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  width: 100%;
  text-align: left;
}

.stage-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  flex: 0 0 auto;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 11px;
}

.stage-option-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.stage-option-copy strong {
  overflow: hidden;
  max-width: 100%;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-option-copy small {
  margin-top: 2px;
  opacity: 0.72;
}

.view-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.layer-control-list {
  display: grid;
  gap: 2px;
}

.stage-explanation-card {
  margin-top: 12px;
}

.stage-explanation-kicker {
  color: var(--theme-primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.stage-explanation-card h3 {
  margin: 5px 0 7px;
  color: var(--text-primary);
  font-size: 16px;
}

.stage-explanation-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.65;
}

.frontal-sky-container .workspace.panel-resizing,
.frontal-sky-container .workspace.layout-resizing,
.frontal-sky-container .workspace.panel-resizing .side-panel,
.frontal-sky-container .workspace.layout-resizing .side-panel,
.frontal-sky-container .workspace.panel-resizing .center-stage,
.frontal-sky-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

@media (max-width: 1050px) {
  .model-status-panel {
    width: 290px;
  }

  .scene-legend {
    right: 12px;
    bottom: 86px;
    max-width: 310px;
  }
}

@media (max-width: 760px) {
  .model-status-panel {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
  }

  .scene-legend {
    display: none;
  }

  .view-option-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}


.scene-label.chamber-label {
  padding: 6px 12px;
  color: #213846;
  font-size: 12px;
  background: rgba(238, 246, 248, 0.94);
  border-color: #6d8998;
}

.frontal-sky-container .center-stage {
  background:
    linear-gradient(180deg,
      #c7d7dc 0%,
      #dce6e8 58%,
      #c9d6d8 100%);
}
</style>
