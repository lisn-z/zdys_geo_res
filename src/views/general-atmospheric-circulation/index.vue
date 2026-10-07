<template>
  <div ref="pageRef" class="general-atmospheric-circulation-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">大气环流</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn header-action-btn replay-btn"
          :class="{ 'auto-demo-active': isAutoDemo }" :aria-pressed="isAutoDemo"
          :aria-label="isAutoDemo ? '关闭自动演示' : '开启自动演示'" @click="toggleAutoDemo">
          <span class="replay-icon">{{ isAutoDemo ? '■' : '▶' }}</span>
          <span class="replay-text">{{ isAutoDemo ? '关闭自动演示' : '自动演示' }}</span>
        </button>

        <button v-if="currentStage < 3" type="button"
          class="theme-btn toolbar-btn header-action-btn circulation-view-header-btn" @click="handleViewModeToggle">
          <span class="circulation-view-icon">◎</span>
          <span>{{ isCloseView ? '恢复视角' : '展开环流' }}</span>
        </button>

        <button type="button" class="theme-btn toolbar-btn header-action-btn panel-toolbar-btn"
          :aria-pressed="floatingPanelsVisible" @click="toggleFloatingPanelsVisibility">{{
            floatingPanelsVisible ? '隐藏面板' : '显示面板' }}</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <!-- ===== 中心舞台 ===== -->
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
          <div class="labels-overlay" ref="labelsOverlayRef">
            <div v-for="(l, i) in labelScreenData" :key="i" v-show="l.visible" class="scene-label" :class="l.cls"
              :style="{ left: l.x + 'px', top: l.y + 'px', color: l.color, opacity: l.opacity }">{{ l.text }}</div>
          </div>

        </div>

        <div class="timeline-dock">
          <div class="timeline-title">动画控制</div>
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-spacer" aria-hidden="true"></div>
          <div class="month-control-group" :class="{ disabled: currentStage < 2 }">
            <span class="month-control-label">季节月份</span>
            <div class="month-options" role="group" aria-label="选择季节代表月份">
              <button type="button" class="theme-btn month-btn" :class="{ active: month === 0 }"
                :disabled="currentStage < 2" @click="setRepresentativeMonth(0)">1月</button>
              <button type="button" class="theme-btn month-btn" :class="{ active: month === 6 }"
                :disabled="currentStage < 2" @click="setRepresentativeMonth(6)">7月</button>
            </div>
          </div>
          <div class="speed-control-group">
            <span class="speed-control-label">动画倍数</span>
            <div class="speed-options">
              <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
                :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <section v-if="visibleLegendGroups.length" class="corner-legend" aria-label="当前图例">
      <div class="corner-legend-heading">
        <strong>当前图例</strong>
        <span>{{ currentStageData?.shortName ?? '' }}</span>
      </div>
      <div class="legend-groups">
        <div v-for="group in visibleLegendGroups" :key="group.title" class="legend-group">
          <div class="legend-group-title">{{ group.title }}</div>
          <div class="legend-list">
            <div v-for="item in group.items" :key="item.label" class="legend-item">
              <span class="legend-symbol" :class="`legend-${item.symbol}`"
                aria-hidden="true"
                :style="{ background: item.symbol === 'high' || item.symbol === 'low' ? undefined : item.background,
                  color: item.symbol === 'high' || item.symbol === 'low' ? item.background : undefined }"
              >{{ item.symbol === 'high' ? 'H' : item.symbol === 'low' ? 'L' : '' }}</span>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="currentStage === 3 && layers.regionalPressureCenters" class="pressure-key">
        <span>海平面气压 / hPa（百帕）</span>
        <div class="pressure-key-colors"><span v-for="(color, i) in pressurePalette" :key="i" :style="{ background: color }">{{ pressureLevels[i] }}</span></div>
        <small>NOAA/NCEP · {{ ncepSlpMetadata.climatology }} · {{ month === 0 ? '1月' : '7月' }}气候平均</small>
      </div>
    </section>

    <FloatingFeatureCard v-show="floatingPanelsVisible" v-model:collapsed="layerCardCollapsed"
      class="layer-feature-card" title="控制面板" subtitle="分层查看大气环流" variant="data"
      :initial-top="196" :initial-right="16" :bottom-inset="82"
      :min-width="320" :min-height="420">
      <div class="floating-layer-content">
        <section v-if="visibleCellLayerDefs.length" class="geo-card control-section">
          <h3 class="section-title">🌀 三圈环流</h3>
          <div v-for="l in visibleCellLayerDefs" :key="l.key" class="switch-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)"
              @change="handleCellLayerChange(l.key)" />
          </div>
        </section>

        <section v-if="visibleWindLayerDefs.length" class="geo-card control-section">
          <h3 class="section-title">💨 风向</h3>
          <div v-for="l in visibleWindLayerDefs" :key="l.key" class="switch-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
          </div>
        </section>

        <section v-if="visiblePressureLayerDefs.length" class="geo-card control-section">
          <h3 class="section-title">📊 气压带</h3>
          <div v-for="l in visiblePressureLayerDefs" :key="l.key" class="switch-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
          </div>
        </section>

        <section v-if="visibleOtherLayerDefs.length" class="geo-card control-section">
          <h3 class="section-title">🎨 其他</h3>
          <div v-for="l in visibleOtherLayerDefs" :key="l.key" class="switch-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
          </div>
        </section>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="floatingPanelsVisible" v-model:collapsed="teachingCardCollapsed" title="阶段面板"
      :subtitle="currentStageData?.title ?? ''" variant="data" :initial-top="112" :initial-right="16" :bottom-inset="82"
      :min-width="360" :min-height="360">
      <div class="floating-teaching-content">
        <div class="stage-nav floating-stage-nav">
          <button v-for="(stage, i) in stages" :key="stage.id" type="button" class="stage-nav-item" :class="{
            active: currentStage === i,
            done: currentStage > i
          }" @click="goToStage(i)">
            <span class="stage-num">{{ i + 1 }}</span>
            <span class="stage-name">{{ stage.shortName }}</span>
          </button>
        </div>

        <section v-if="currentStageData" class="floating-stage-card">
          <div class="stage-header">
            <span class="stage-badge">阶段 {{ currentStage + 1 }}</span>
            <h3 class="section-title">{{ currentStageData.title }}</h3>
          </div>
          <p class="stage-desc">{{ currentStageData.desc }}</p>
          <div class="stage-points">
            <button v-for="(p, idx) in currentStageData.points" :key="idx" type="button" class="step-point"
              :class="{ done: stepDone[idx] }" @click="toggleStep(idx)">
              <span class="step-num">{{ idx + 1 }}</span>
              <span class="step-text">{{ p }}</span>
            </button>
          </div>
          <div class="stage-nav-buttons">
            <button class="theme-btn option-btn" :disabled="currentStage === 0" @click="prevStage">← 上一步</button>
            <button class="theme-btn primary" @click="nextStage">
              {{ currentStage < stages.length - 1 ? '下一步 →' : '从头演示' }} </button>
          </div>
        </section>
      </div>
    </FloatingFeatureCard>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { ncepSlpMetadata } from './ncep-slp-climatology'
import { SurfaceClimate, type ClimateState } from './simulation/SurfaceClimate'
import { SeasonalWarp } from './simulation/seasonal-warp'
import { ensureAirflowCells } from './simulation/circulation-layers'
import { createReferenceLatitudes, latitudeStyles } from './simulation/graticule'
import { AtmosphericCellCurve, circulationCloseView, circulationTransitionProgress, interpolateCirculationCamera, insetSectionCurve, sectionPlaneNormal } from './simulation/circulation-section'
import { palette } from './simulation/model'
import { pressureColors, pressurePalette, pressureLevels } from './simulation/pressure-data'

const atmosphericSpaceBackgroundUrl = '/geo-resources-folder/images/atmospheric-space-bg.png'

// ==================== 常量 ====================
const EARTH_RADIUS = 2.5
const TILT = 0
const CIRCULATION_CENTER_LON = -58
const CIRCULATION_SECTIONS = [
  { longitude: CIRCULATION_CENTER_LON, fullEffect: true },
  { longitude: normalizeLon(CIRCULATION_CENTER_LON + 180), fullEffect: true },
  { longitude: normalizeLon(CIRCULATION_CENTER_LON + 90), fullEffect: false },
  { longitude: normalizeLon(CIRCULATION_CENTER_LON - 90), fullEffect: false },
]
const SINGLE_CELL_SURFACE_ARROW_LONGITUDES = Array.from(
  { length: 4 },
  (_, intervalIndex) => normalizeLon(
    CIRCULATION_CENTER_LON + 45 + intervalIndex * 90,
  ),
)
const earthTextureUrl = '/geo-resources-folder/images/Material.003_diffuse.jpg'

type SimMode = 'single' | 'three' | 'seasonal'
type Hemisphere = 'north' | 'south'
type ThreeCellType = 'hadley' | 'ferrel' | 'polar'
type CellType = 'single' | ThreeCellType
type PressureType = 'high' | 'low'
type WindType = 'trade' | 'westerly' | 'polar'
type SeasonType = 'summer' | 'winter'

interface Stage {
  id: string
  shortName: string
  title: string
  desc: string
  points: string[]
  knowledge: string
  layers: Record<string, boolean>
}

interface CirculationDefinition {
  id: string
  name: string
  type: CellType
  hemisphere: Hemisphere
  surfaceFromLat: number
  surfaceToLat: number
  riseLat: number
  upperFromLat: number
  upperToLat: number
  sinkLat: number
  color: number
}

interface ThreeCellDefinition extends CirculationDefinition {
  type: ThreeCellType
}

interface SmokeStream {
  cellId: string
  cellType: CellType
  mode: 'single' | 'three'
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>
}

interface MovingArrow {
  mesh: THREE.Object3D
  curve: THREE.Curve<THREE.Vector3>
  progress: number
  speed: number
  loopStart: number
  loopEnd: number
  mode: 'single' | 'three'
}

interface SceneLabel {
  text: string
  lat: number
  lon: number
  cls: string
  type: 'pressure' | 'wind' | 'cell' | 'single'
  circulationId?: string
  curveProgress?: number
}

interface ScreenLabel {
  color?: string
  opacity?: number
  text: string
  x: number
  y: number
  visible: boolean
  cls: string
}

// ==================== 地理定义 ====================
const singleCellDefinitions: CirculationDefinition[] = [
  {
    id: 'single-north',
    name: '北半球理想单圈环流',
    type: 'single',
    hemisphere: 'north',
    surfaceFromLat: 88,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: 88,
    sinkLat: 88,
    color: 0xa78bfa,
  },
  {
    id: 'single-south',
    name: '南半球理想单圈环流',
    type: 'single',
    hemisphere: 'south',
    surfaceFromLat: -88,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: -88,
    sinkLat: -88,
    color: 0xa78bfa,
  },
]

const threeCellDefinitions: ThreeCellDefinition[] = [
  {
    id: 'hadley-north',
    name: '低纬环流·哈德莱',
    type: 'hadley',
    hemisphere: 'north',
    surfaceFromLat: 30,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: 30,
    sinkLat: 30,
    color: 0xef4444,
  },
  {
    id: 'ferrel-north',
    name: '中纬环流·费雷尔',
    type: 'ferrel',
    hemisphere: 'north',
    surfaceFromLat: 30,
    surfaceToLat: 60,
    riseLat: 60,
    upperFromLat: 60,
    upperToLat: 30,
    sinkLat: 30,
    color: 0x2ec4b6,
  },
  {
    id: 'polar-north',
    name: '高纬环流·极地',
    type: 'polar',
    hemisphere: 'north',
    surfaceFromLat: 88,
    surfaceToLat: 60,
    riseLat: 60,
    upperFromLat: 60,
    upperToLat: 88,
    sinkLat: 88,
    color: 0x247cff,
  },
  {
    id: 'hadley-south',
    name: '低纬环流·哈德莱',
    type: 'hadley',
    hemisphere: 'south',
    surfaceFromLat: -30,
    surfaceToLat: 0,
    riseLat: 0,
    upperFromLat: 0,
    upperToLat: -30,
    sinkLat: -30,
    color: 0xef4444,
  },
  {
    id: 'ferrel-south',
    name: '中纬环流·费雷尔',
    type: 'ferrel',
    hemisphere: 'south',
    surfaceFromLat: -30,
    surfaceToLat: -60,
    riseLat: -60,
    upperFromLat: -60,
    upperToLat: -30,
    sinkLat: -30,
    color: 0x2ec4b6,
  },
  {
    id: 'polar-south',
    name: '高纬环流·极地',
    type: 'polar',
    hemisphere: 'south',
    surfaceFromLat: -88,
    surfaceToLat: -60,
    riseLat: -60,
    upperFromLat: -60,
    upperToLat: -88,
    sinkLat: -88,
    color: 0x247cff,
  },
]

const cellLayerDefs = [
  { key: 'hadleyCell', label: '低纬·哈德莱环流', desc: '0°~30°' },
  { key: 'ferrelCell', label: '中纬·费雷尔环流', desc: '30°~60°' },
  { key: 'polarCell', label: '高纬·极地环流', desc: '60°~90°' },
  { key: 'airflowRibbons', label: '环流气流', desc: '展示空气的流动路径与方向' },
]

const windLayerDefs = [
  { key: 'surfaceWinds', label: '地面风向箭头', desc: '气压梯度·半球偏转·盛行风' },
  { key: 'monsoonWinds', label: '季风动态箭头', desc: '东亚与南亚夏冬季风' },
  { key: 'oceanCurrents', label: '洋流', desc: '全球表层洋流 · 北印度洋季节换向' },
]

const pressureLayerDefs = [
  { key: 'pressureBands', label: '气压带', desc: '贴球面的七个纬向气压带' },
  { key: 'regionalPressureCenters', label: '气压场与气压中心', desc: 'NOAA/NCEP 1981—2010年气候平均' },
  { key: 'isobars', label: '等压线', desc: '真实海平面气压 · 每8 hPa一条' },
]

const otherLayerDefs = [
  { key: 'latLines', label: '经纬网', desc: '经度每15°·回归线·极圈' },
  { key: 'subsolarLine', label: '太阳直射纬线', desc: '每月15日参考纬度 · 非整圈同时直射' },
  { key: 'textAnnotations', label: '文字标注', desc: '环流/风带/气压带' },
]

// ==================== 阶段化教学 ====================
const stages: Stage[] = [
  {
    id: 'ideal',
    shortName: '理想单圈',
    title: '阶段一：理想单圈环流',
    desc: '假设地表均匀、地球不自转并忽略地转偏向力，赤道与两极之间形成理想单圈环流。',
    points: [
      '假设地表均匀，无海陆热力差异',
      '地球不自转，忽略地转偏向力',
      '赤道受热上升，两极冷却下沉',
      '高空：赤道→两极；近地面：两极→赤道',
    ],
    knowledge: '理想情况下，赤道受热形成上升气流，高空分别向南北两极流动；极地冷却下沉，近地面再流回赤道，南北半球各形成一个<strong>闭合单圈环流</strong>。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: false,
      ferrelCell: false,
      polarCell: false,
      surfaceWinds: false,
      pressureBands: false,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: false,
      textAnnotations: true,
    },
  },
  {
    id: 'three',
    shortName: '三圈环流',
    title: '阶段二：三圈环流（地转偏向力）',
    desc: '考虑地球自转和地转偏向力后，每个半球形成低纬、中纬和高纬三个环流圈。',
    points: [
      '0°附近受热上升，形成赤道低压',
      '±30°附近空气下沉，形成副热带高压',
      '30°→0°的近地面气流偏转为信风',
      '30°→60°的近地面气流偏转为盛行西风',
      '极地→60°的近地面气流偏转为极地东风',
      '±60°附近气流辐合上升，形成副极地低压',
      '两极附近冷却下沉，形成极地高压',
    ],
    knowledge: '<strong>地转偏向力</strong>使北半球运动气流向右偏、南半球向左偏。每个半球形成<strong>低纬环流（哈德莱）</strong>、<strong>中纬环流（费雷尔）</strong>和<strong>高纬环流（极地）</strong>。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: false,
      pressureBands: false,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'pressure',
    shortName: '气压带风带',
    title: '阶段三：气压带和风带的季节移动',
    desc: '随太阳直射点南北移动，气压带和风带也发生小幅度的南北移动。',
    points: [
      '七个气压带：3个低压带、4个高压带',
      '六个风带：2个信风带、2个西风带、2个极地东风带',
      '北半球夏季：气压带和风带整体北移',
      '北半球冬季：气压带和风带整体南移',
      '教学模型中的移动幅度约5°~10°',
    ],
    knowledge: '随<strong>太阳直射点</strong>南北移动，气压带和风带也会季节性移动。北半球夏季整体偏北，北半球冬季整体偏南，春秋分附近接近南北对称。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: true,
      pressureBands: true,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'lat-lon',
    shortName: '海陆与季风',
    title: '阶段四：海陆气压、季风与洋流',
    desc: '实际海陆热力差异会使纬向气压带发生断裂，形成块状气压中心和季风环流。',
    points: [
      '7月：亚洲低压、北太平洋副热带高压',
      '1月：亚洲高压、阿留申低压',
      '东亚季风：夏季东南季风、冬季西北季风',
      '南亚夏季盛行西南季风，冬季盛行东北季风',
      '北印度洋季风洋流随季节换向；洋流路径为教学示意',
    ],
    knowledge: '海陆热力性质差异使部分纬向气压带被分裂为<strong>块状气压中心</strong>。夏季陆地升温快，易形成低压；冬季陆地降温快，易形成高压，并进一步形成季风环流。',
    layers: {
      earth: true,
      airflowRibbons: false,
      hadleyCell: false,
      ferrelCell: false,
      polarCell: false,
      surfaceWinds: true,
      // 与实际海平面气压场叠加比较，仍可在控制面板单独关闭。
      pressureBands: true,
      regionalPressureCenters: true,
      monsoonWinds: true,
      oceanCurrents: false,
      isobars: true,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },

]

// ==================== 布局状态 ====================
const {
  rootRef: pageRef,
  layoutMode,
  workspaceAttrs,
} = useGeoPanelLayout({
  left: {
    enabled: false,
    resizable: false,
  },

  right: {
    enabled: false,
    resizable: false,
  },

  /*
   * 面板展开、折叠、拖拽和断点变化全部由 Hook 管理。
   * 业务组件只在最终布局发生变化时刷新 Three.js。
   */
  onLayoutChange(state) {
    /*
     * 连续拖拽或浏览器缩放期间，不调用 renderer.setSize()。
     * canvas 先依靠 CSS 跟随容器拉伸，稳定后再重建绘图缓冲区。
     */
    if (state.resizing) {
      return
    }

    scheduleSceneResize(90)
  },

})

const isPlaying = ref(true)
const isAutoDemo = ref(false)
const playbackSpeed = ref(1.5)
const speedOptions = [0.5, 1, 1.5, 2, 5]
const isCloseView = ref(false)

// ==================== 业务状态 ====================
const threeContainerRef = ref<HTMLElement | null>(null)
const labelsOverlayRef = ref<HTMLElement | null>(null)
const simMode = ref<SimMode>('single')
const month = ref(6) // 0=1月，11=12月
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const simModeLabel = computed(() => {
  return simMode.value === 'single' ? '理想单圈' : '三圈环流'
})

const seasonalShiftDescription = computed(() => {
  const offset = getSeasonalLatitudeOffset()
  if (currentStage.value === 0 || Math.abs(offset) < 0.05) return '接近南北对称位置'
  return `整体${offset > 0 ? '北移' : '南移'}约 ${Math.abs(offset).toFixed(1)}°`
})

const simModeHint = computed(() => {
  if (simMode.value === 'single') return '赤道上升、两极下沉；近地面由两极流向赤道'
  return `${monthNames[month.value]} · 三圈环流、气压带和风带${seasonalShiftDescription.value}`
})

const layers = reactive<Record<string, boolean>>({
  earth: true,
  airflowRibbons: true,
  hadleyCell: true,
  ferrelCell: true,
  polarCell: true,
  surfaceWinds: true,
  pressureBands: true,
  regionalPressureCenters: true,
  monsoonWinds: true,
  oceanCurrents: false,
  isobars: false,
  latLines: true,
  subsolarLine: false,
  textAnnotations: true,
})

const currentStage = ref(0)
const stepDone = ref<Record<number, boolean>>({})
const floatingPanelsVisible = ref(true)
const teachingCardCollapsed = ref(true)
const layerCardCollapsed = ref(true)

function toggleFloatingPanelsVisibility() {
  floatingPanelsVisible.value = !floatingPanelsVisible.value
}

const currentStageData = computed(() => stages[currentStage.value])
const visibleCellLayerDefs = computed(() => cellLayerDefs)
const visibleWindLayerDefs = computed(() => windLayerDefs.filter(layer => currentStage.value === 3 || layer.key === 'surfaceWinds'))
const visiblePressureLayerDefs = computed(() => pressureLayerDefs.filter(layer => currentStage.value === 3 || !['regionalPressureCenters', 'isobars'].includes(layer.key)))
const visibleOtherLayerDefs = computed(() => otherLayerDefs)

type LegendSymbol = 'arrow' | 'line' | 'band' | 'high' | 'low'
type LegendGroup = {
  title: string
  items: Array<{
    label: string
    symbol: LegendSymbol
    background: string
  }>
}

const visibleLegendGroups = computed<LegendGroup[]>(() => {
  const groups: LegendGroup[] = []
  const add = (title: string, entries: [string, string][], symbol: LegendSymbol = 'arrow') =>
    groups.push({ title, items: entries.map(([label, background]) => ({ label, background, symbol })) })
  if (currentStage.value === 0 || layers.airflowRibbons)
    add(currentStage.value === 0 ? '理想单圈气流' : '环流气流', [
      ['高空 / 上升暖气流', 'linear-gradient(90deg, #ff5a47, #ff98c8)'],
      ['近地面 / 下沉冷气流', 'linear-gradient(90deg, #72b8ff, #9474ff)'],
    ])
  if (currentStage.value > 0 && layers.surfaceWinds)
    add('盛行风', [['信风', palette.hadley], ['西风', palette.ferrel], ['极地东风', palette.polar]])
  if (currentStage.value > 0 && layers.pressureBands)
    add('理想气压带', [['高压带', palette.high], ['低压带', palette.low]], 'band')
  if (currentStage.value === 3 && layers.monsoonWinds)
    add('季风', [
      ['东亚夏季风', palette.summerMonsoon], ['南亚夏季风', palette.southSummerMonsoon],
      ['东亚冬季风', palette.winterMonsoon], ['南亚冬季风', palette.southWinterMonsoon],
    ])
  if (currentStage.value === 3 && layers.oceanCurrents)
    add('表层洋流', [['暖流', palette.warm], ['寒流', palette.cold]], 'arrow')
  if (currentStage.value === 3 && (layers.regionalPressureCenters || layers.isobars)) {
    const items: LegendGroup['items'] = []
    if (layers.isobars) items.push({ label: '等压线 · 间隔8 hPa', background: pressureColors.line, symbol: 'line' })
    if (layers.regionalPressureCenters) items.push(
      { label: '高压中心', background: pressureColors.highText, symbol: 'high' },
      { label: '低压中心', background: pressureColors.lowText, symbol: 'low' },
    )
    groups.push({ title: '海平面气压', items })
  }
  const latitudeLegend: [string, string][] = layers.latLines
    ? latitudeStyles.map(style => [style.label, style.dashSize
      ? `repeating-linear-gradient(90deg, ${style.color} 0 5px, transparent 5px 8px)`
      : style.color])
    : []
  if (layers.subsolarLine) latitudeLegend.push(['太阳直射纬线', palette.solar])
  if (latitudeLegend.length) add('纬度参考', latitudeLegend, 'line')
  return groups
})

// ==================== 标签 ====================
const singleLabels: SceneLabel[] = [
  {
    text: '北半球理想单圈',
    lat: 42,
    lon: -94,
    cls: 'label-single',
    type: 'single',
    circulationId: 'single-north',
    curveProgress: 0.63,
  },
  {
    text: '南半球理想单圈',
    lat: -42,
    lon: -86,
    cls: 'label-single',
    type: 'single',
    circulationId: 'single-south',
    curveProgress: 0.63,
  },
  { text: '赤道受热上升', lat: 0, lon: -112, cls: 'label-vertical-up', type: 'single' },
  { text: '北极冷却下沉', lat: 82, lon: -105, cls: 'label-vertical-down', type: 'single' },
  { text: '南极冷却下沉', lat: -82, lon: -75, cls: 'label-vertical-down', type: 'single' },
]

const cellLabels: SceneLabel[] = [
  { text: '高纬环流', lat: 75, lon: -84, cls: 'label-cell-polar', type: 'cell', circulationId: 'polar-north', curveProgress: 0.63 },
  { text: '中纬环流', lat: 45, lon: -91, cls: 'label-cell-ferrel', type: 'cell', circulationId: 'ferrel-north', curveProgress: 0.63 },
  { text: '低纬环流', lat: 15, lon: -99, cls: 'label-cell-hadley', type: 'cell', circulationId: 'hadley-north', curveProgress: 0.63 },
  { text: '低纬环流', lat: -15, lon: -96, cls: 'label-cell-hadley', type: 'cell', circulationId: 'hadley-south', curveProgress: 0.63 },
  { text: '中纬环流', lat: -45, lon: -88, cls: 'label-cell-ferrel', type: 'cell', circulationId: 'ferrel-south', curveProgress: 0.63 },
  { text: '高纬环流', lat: -75, lon: -81, cls: 'label-cell-polar', type: 'cell', circulationId: 'polar-south', curveProgress: 0.63 },
]

const allLabels = computed<SceneLabel[]>(() => {
  if (simMode.value === 'single') return singleLabels
  return cellLabels
})

const labelScreenData = ref<ScreenLabel[]>([])

// ==================== Three.js 变量 ====================
let surfaceClimate: SurfaceClimate | null = null
let seasonalWarp: SeasonalWarp | null = null
function climateState(): ClimateState {
  return { stage: currentStage.value, month: month.value === 0 ? 1 : 7, playing: isPlaying.value, speed: playbackSpeed.value, layers }
}
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let earthGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let earthWireframe: THREE.LineSegments | null = null

let singleCellRoot: THREE.Group | null = null
let threeCellRoot: THREE.Group | null = null
let circulationLineGroups: Record<ThreeCellType, THREE.Group> | null = null
let circulationAirflowGroups: Record<ThreeCellType, THREE.Group> | null = null
let singleCellAirflowGroup: THREE.Group | null = null
let smokeStreams: SmokeStream[] = []
let circulationDirectionArrows: MovingArrow[] = []
let singleCellArrowMaterials: THREE.ShaderMaterial[] = []

let latLineGroup: THREE.Group | null = null

let sceneReady = false
let componentDestroyed = false
const DEFAULT_EARTH_ROTATION = THREE.MathUtils.degToRad(-105)
let rotationAngle = DEFAULT_EARTH_ROTATION
let animationId = 0
const clock = new THREE.Clock()
let timeAccum = 0
let labelUpdateElapsed = 0

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let threeSceneRevealFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let replayTimers: ReturnType<typeof setTimeout>[] = []
let circulationRevealProgress = 0
const defaultCameraPosition = new THREE.Vector3(0, 3.05, 10.25)
const defaultOrbitTarget = new THREE.Vector3(0, 0, 0)
const cameraBeforeCloseView = defaultCameraPosition.clone()
const targetBeforeCloseView = defaultOrbitTarget.clone()
let fovBeforeCloseView = 50
let hasOverviewSnapshot = false
let rotationBeforeCloseView = 0
let viewTransitionActive = false
let viewTransitionElapsed = 0
const viewTransitionDuration = 2.25
const viewStartCameraPosition = new THREE.Vector3()
const viewTargetCameraPosition = new THREE.Vector3()
const viewStartOrbitTarget = new THREE.Vector3()
const viewTargetOrbitTarget = new THREE.Vector3()
let viewStartEarthGroupZ = 0
let viewTargetEarthGroupZ = 0
let viewStartEarthMeshY = 0
let viewTargetEarthMeshY = 0
let viewStartFov = 50
let viewTargetFov = 50

// ==================== 数学与坐标辅助 ====================
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function smoothstep01(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function lerpValue(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function normalizeLon(lon: number) {
  let value = lon
  while (value < -180) value += 360
  while (value > 180) value -= 360
  return value
}

function lerpLongitude(from: number, to: number, t: number) {
  let difference = normalizeLon(to) - normalizeLon(from)
  if (difference > 180) difference -= 360
  if (difference < -180) difference += 360
  return normalizeLon(from + difference * t)
}

function getSeasonalLatitudeOffset() {
  return surfaceClimate?.shift.value ?? 0
}

/**
 * 气压带和风带随季节移动，但越接近极点移动幅度越小，
 * 防止极地高压和极地环流被整体推离极点。
 */
function shiftLatitude(lat: number, offset: number) {
  const taper = Math.cos(THREE.MathUtils.degToRad(Math.abs(lat)))
  return clamp(lat + offset * taper, -88, 88)
}

function getCellCenterLon(_definition: CirculationDefinition) {
  // 所有环流圈共用同一经向剖面，避免不同圈层在视觉上前后错开。
  return CIRCULATION_CENTER_LON
}

function resetCirculationFormation() {
  // 默认先显示一小段气流，避免进入阶段一时画面短暂完全空白。
  // 后续仍会按动画进度逐渐喷出并闭合。
  circulationRevealProgress = currentStage.value === 0 ? 0.12 : 0.06
}

function getCirculationCloseView() {
  return circulationCloseView(camera?.aspect ?? 1,
    CIRCULATION_CENTER_LON, simMode.value === 'single')
}

function applyCloseViewImmediately() {
  if (!camera || !orbitControls || !earthGroup || !earthMesh) return
  viewTransitionActive = false
  orbitControls.enabled = true
  orbitControls.enableDamping = true

  if (isCloseView.value) {
    const view = getCirculationCloseView()
    orbitControls.minDistance = .45
    camera.position.copy(view.position)
    camera.fov = view.fov
    orbitControls.target.copy(view.target)
    earthGroup.rotation.z = view.earthRotationZ
    earthMesh.rotation.y = view.earthRotationY
  } else {
    orbitControls.minDistance = 4.5
    camera.position.copy(defaultCameraPosition)
    camera.fov = 50
    orbitControls.target.copy(defaultOrbitTarget)
    earthGroup.rotation.z = 0
    earthMesh.rotation.y = rotationAngle
    hasOverviewSnapshot = false
  }

  camera.updateProjectionMatrix()
  orbitControls.update()
}

function startCloseViewTransition() {
  if (!camera || !orbitControls || !earthGroup || !earthMesh) return

  viewTransitionActive = true
  viewTransitionElapsed = 0
  orbitControls.enabled = false
  // Flush residual orbit damping before taking the start pose. During the
  // scripted approach, controls must not clamp the eye back to 4.5 units away.
  orbitControls.enableDamping = false
  orbitControls.update()
  orbitControls.minDistance = .45

  viewStartCameraPosition.copy(camera.position)
  viewStartOrbitTarget.copy(orbitControls.target)
  viewStartEarthGroupZ = earthGroup.rotation.z
  viewStartEarthMeshY = earthMesh.rotation.y
  viewStartFov = camera.fov

  if (isCloseView.value) {
    if (!hasOverviewSnapshot) {
      cameraBeforeCloseView.copy(camera.position)
      targetBeforeCloseView.copy(orbitControls.target)
      fovBeforeCloseView = camera.fov
      rotationBeforeCloseView = earthMesh.rotation.y
      hasOverviewSnapshot = true
    }
    const view = getCirculationCloseView()
    viewTargetCameraPosition.copy(view.position)
    viewTargetOrbitTarget.copy(view.target)
    viewTargetFov = view.fov

    // 先向右翻转，随后贴近地表仰看环流，而不是围绕球心看整颗地球。
    const targetY = view.earthRotationY
    viewTargetEarthMeshY = viewStartEarthMeshY + Math.atan2(
      Math.sin(targetY - viewStartEarthMeshY), Math.cos(targetY - viewStartEarthMeshY),
    )
    viewTargetEarthGroupZ = view.earthRotationZ
  } else {
    viewTargetCameraPosition.copy(cameraBeforeCloseView)
    viewTargetOrbitTarget.copy(targetBeforeCloseView)
    viewTargetFov = fovBeforeCloseView
    viewTargetEarthMeshY = viewStartEarthMeshY + Math.atan2(
      Math.sin(rotationBeforeCloseView - viewStartEarthMeshY), Math.cos(rotationBeforeCloseView - viewStartEarthMeshY),
    )
    viewTargetEarthGroupZ = 0
  }
}

function toggleCloseView() {
  setCloseViewState(!isCloseView.value)
}

function handleViewModeToggle() {
  toggleCloseView()
}

// ==================== 地球纹理 ====================
function createEarthTexture(): THREE.CanvasTexture {
  const width = 2048
  const height = 1024
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建地球纹理画布')
  }

  const oceanGradient = context.createLinearGradient(0, 0, 0, height)
  oceanGradient.addColorStop(0, '#0d2840')
  oceanGradient.addColorStop(0.5, '#1a4a7a')
  oceanGradient.addColorStop(1, '#0d2840')
  context.fillStyle = oceanGradient
  context.fillRect(0, 0, width, height)

  const continents: [number, number][][] = [
    [[-168, 65], [-128, 70], [-75, 78], [-55, 55], [-70, 42], [-82, 25], [-100, 20], [-115, 30], [-125, 38], [-135, 55], [-150, 58], [-168, 65]],
    [[-80, 10], [-60, 8], [-42, -8], [-38, -15], [-50, -35], [-68, -50], [-72, -55], [-78, -20], [-80, 10]],
    [[-17, 35], [10, 35], [33, 31], [35, 15], [44, 12], [42, 0], [35, -12], [28, -20], [20, -32], [12, -18], [0, 3], [-15, 12], [-17, 35]],
    [[-10, 36], [10, 45], [30, 42], [48, 40], [62, 30], [75, 20], [80, 10], [95, 22], [108, 12], [122, 0], [130, 0], [140, 35], [145, 44], [160, 60], [170, 65], [180, 68], [130, 75], [60, 72], [20, 66], [2, 52], [-5, 48], [-10, 36]],
    [[114, -22], [130, -12], [142, -10], [146, -18], [150, -25], [148, -35], [140, -38], [130, -32], [114, -28], [114, -22]],
    [[-55, 60], [-30, 65], [-22, 80], [-35, 82], [-50, 80], [-58, 72], [-55, 60]],
    [[-180, -72], [-60, -72], [0, -70], [60, -68], [120, -70], [180, -72], [180, -90], [-180, -90], [-180, -72]],
  ]

  continents.forEach(path => {
    context.beginPath()

    path.forEach(([lon, lat], index) => {
      const x = ((lon + 180) / 360) * width
      const y = ((90 - lat) / 180) * height

      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })

    context.closePath()
    context.fillStyle = '#2a5a3a'
    context.fill()
    context.strokeStyle = '#1a3a2a'
    context.lineWidth = 2
    context.stroke()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createEarthShaderMaterial(texture: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uBrightness: { value: 0.42 },
      uSaturation: { value: 0.72 },
      uContrast: { value: 1.04 },
      uCoolTint: { value: new THREE.Color(0x8cc9e8) },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uBrightness;
      uniform float uSaturation;
      uniform float uContrast;
      uniform vec3 uCoolTint;

      varying vec2 vUv;

      void main() {
        vec3 textureColor = texture2D(uMap, vUv).rgb;
        float luminance = dot(textureColor, vec3(0.2126, 0.7152, 0.0722));
        vec3 color = mix(vec3(luminance), textureColor, uSaturation);
        color = (color - 0.5) * uContrast + 0.5;
        color = mix(color, color * uCoolTint, 0.24);
        color *= uBrightness;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
  })
}


// ==================== 环流闭合曲线 ====================

function getCirculationArrowPalette(definition: CirculationDefinition) {
  if (definition.type === 'single') {
    return {
      start: new THREE.Color(0xe9f8ff),
      end: new THREE.Color(0xff936e),
    }
  }

  if (definition.type === 'hadley') {
    return {
      start: new THREE.Color(0xffc4a8),
      end: new THREE.Color(0xff8e91),
    }
  }

  if (definition.type === 'ferrel') {
    return {
      start: new THREE.Color(0xb8ffe5),
      end: new THREE.Color(0x62d9ca),
    }
  }

  return {
    start: new THREE.Color(0xc5ddff),
    end: new THREE.Color(0x6ca8ff),
  }
}

function createCurveDirectionArrow(
  curve: THREE.Curve<THREE.Vector3>,
  progress: number,
  definition: CirculationDefinition,
  scale = 1,
  mode: 'single' | 'three' = 'three',
) {
  const position = curve.getPointAt(progress)
  const tangent = curve.getTangentAt(progress).normalize()
  const palette = getCirculationArrowPalette(definition)
  const arrow = new THREE.Group()

  const singleBoost = mode === 'single' ? 1.82 : 1
  const shaftLength = 0.072 * scale * singleBoost
  const shaftRadius = 0.0065 * scale * singleBoost
  const segmentCount = 3

  for (let index = 0; index < segmentCount; index++) {
    const segmentLength = shaftLength / segmentCount
    const color = palette.start.clone().lerp(
      palette.end,
      (index + 0.5) / segmentCount,
    )

    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(
        shaftRadius * (0.92 + index * 0.05),
        shaftRadius * (0.92 + index * 0.05),
        segmentLength,
        10,
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: mode === 'single' ? 0.94 : 0.84,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      }),
    )

    segment.position.y = -shaftLength / 2 + segmentLength * (index + 0.5)
    arrow.add(segment)
  }

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(
      0.019 * scale * singleBoost,
      0.046 * scale * singleBoost,
      12,
    ),
    new THREE.MeshBasicMaterial({
      color: palette.end,
      transparent: true,
      opacity: mode === 'single' ? 0.98 : 0.94,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )

  head.position.y = shaftLength / 2 + 0.018 * scale * singleBoost
  arrow.add(head)

  const tailGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.010 * scale * singleBoost, 10, 8),
    new THREE.MeshBasicMaterial({
      color: palette.start,
      transparent: true,
      opacity: mode === 'single' ? 0.50 : 0.38,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )
  tailGlow.position.y = -shaftLength / 2
  arrow.add(tailGlow)

  arrow.position.copy(position)
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
  arrow.renderOrder = mode === 'single' ? 20 : 7

  circulationDirectionArrows.push({
    mesh: arrow,
    curve,
    progress,
    speed: mode === 'single' ? 0.027 : 0.019,
    loopStart: 0,
    loopEnd: 1,
    mode,
  })

  return arrow
}

function getInsetCirculationArrowSize(definition: CirculationDefinition) {
  if (definition.type === 'single') {
    return {
      span: 0.22,
      shaftHalfWidth: 0.050,
      headHalfWidth: 0.135,
      insetScale: 0.66,
      speed: 0.060,
    }
  }

  if (definition.type === 'hadley') {
    return {
      span: 0.28,
      shaftHalfWidth: 0.032,
      headHalfWidth: 0.088,
      insetScale: 0.56,
      speed: 0.072,
    }
  }

  if (definition.type === 'ferrel') {
    return {
      span: 0.29,
      shaftHalfWidth: 0.030,
      headHalfWidth: 0.082,
      insetScale: 0.54,
      speed: 0.075,
    }
  }

  return {
    span: 0.30,
    shaftHalfWidth: 0.028,
    headHalfWidth: 0.076,
    insetScale: 0.52,
    speed: 0.078,
  }
}

/**
 * 左右侧剖面专用的大型平面箭头。
 * 三圈环流沿包络内缘运动，箭头宽面固定在剖面中，不再朝向摄像机。
 */
function createMovingInsetCirculationArrow(
  baseCurve: THREE.Curve<THREE.Vector3>,
  definition: CirculationDefinition,
  progress: number,
  phase: number,
  mode: 'single' | 'three',
) {
  const sizing = getInsetCirculationArrowSize(definition)
  const curve = mode === 'single'
    ? createInsetCirculationCurve(baseCurve, sizing.insetScale)
    : insetSectionCurve(baseCurve, sizing.headHalfWidth + 0.018)
  const isSurfaceBranch = progress < 0.4
  const arrow = createMovingCurvePlaneArrow(curve, progress, {
    colorStart: new THREE.Color(isSurfaceBranch ? 0xffa06f : 0xc3b2ff),
    colorEnd: new THREE.Color(isSurfaceBranch ? 0xff4f43 : 0x69adff),
    phase,
    opacity: mode === 'single' ? 0.98 : 0.96,
    span: sizing.span,
    shaftHalfWidth: sizing.shaftHalfWidth,
    headHalfWidth: sizing.headHalfWidth,
    speed: sizing.speed,
    mode,
    renderOrder: 9,
    registry: singleCellArrowMaterials,
  })

  arrow.arrow.name = `${definition.id}-inset-moving-plane-arrow`
  arrow.arrow.traverse(child => {
    child.frustumCulled = false
  })
  circulationDirectionArrows.push(arrow.item)
  return arrow.arrow
}

class SingleCellSurfaceArrowCurve extends THREE.Curve<THREE.Vector3> {
  private readonly hemisphere: Hemisphere
  private readonly longitude: number

  constructor(hemisphere: Hemisphere, longitude: number) {
    super()
    this.hemisphere = hemisphere
    this.longitude = longitude
    this.arcLengthDivisions = 180
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const progress = smoothstep01(t)
    const sign = this.hemisphere === 'north' ? 1 : -1
    const latitude = sign * lerpValue(80, 5, progress)
    const longitude = this.longitude + Math.sin(progress * Math.PI) * sign * 1.8
    const radius = EARTH_RADIUS + 0.115 + Math.sin(progress * Math.PI) * 0.035
    return target.copy(latLonToVec3(latitude, longitude, radius))
  }
}

function createMovingSingleCellSurfaceArrow(
  curve: THREE.Curve<THREE.Vector3>,
  progress: number,
  phase: number,
) {
  const result = createMovingSphericalSurfaceArrow(curve, progress, {
    colorStart: new THREE.Color(0x6fbcff),
    colorEnd: new THREE.Color(0xe9f8ff),
    phase,
    opacity: 0.96,
    span: 0.36,
    shaftHalfWidth: 0.058,
    headHalfWidth: 0.155,
    speed: 0.098,
    loopStart: 0.015,
    loopEnd: 0.965,
    mode: 'single',
    renderOrder: 20,
    registry: singleCellArrowMaterials,
  })
  circulationDirectionArrows.push(result.item)
  return result.arrow
}

function createMovingSphericalSurfaceArrow(
  curve: THREE.Curve<THREE.Vector3>,
  progress: number,
  options: {
    colorStart: THREE.Color
    colorEnd: THREE.Color
    phase: number
    opacity: number
    span: number
    shaftHalfWidth: number
    headHalfWidth: number
    speed: number
    loopStart: number
    loopEnd: number
    mode: MovingArrow['mode']
    renderOrder: number
    registry: THREE.ShaderMaterial[]
  },
) {
  const shaftSamples = 13
  const vertexCount = shaftSamples * 2 + 3
  const positions = new Float32Array(vertexCount * 3)
  const along = new Float32Array(vertexCount)
  const indices: number[] = []
  for (let index = 0; index < shaftSamples - 1; index += 1) {
    const left = index * 2
    const right = left + 1
    const nextLeft = left + 2
    const nextRight = left + 3
    indices.push(left, right, nextLeft, right, nextRight, nextLeft)
    along[left] = along[right] = (index / (shaftSamples - 1)) * 0.74
  }
  along[(shaftSamples - 1) * 2] = 0.74
  along[(shaftSamples - 1) * 2 + 1] = 0.74
  const headStart = shaftSamples * 2
  along[headStart] = 0.72
  along[headStart + 1] = 0.72
  along[headStart + 2] = 1
  indices.push(headStart, headStart + 1, headStart + 2)

  const geometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(positions, 3)
  positionAttribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  geometry.setIndex(indices)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: options.colorStart },
      uColorEnd: { value: options.colorEnd },
      uTime: { value: 0 },
      uPhase: { value: options.phase },
      uOpacity: { value: options.opacity },
    },
    vertexShader: `
      attribute float aAlong;
      varying float vAlong;
      void main() {
        vAlong = aAlong;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;
      varying float vAlong;
      void main() {
        vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.0, 1.0, vAlong));
        float sweep = fract(uTime * 0.32 + uPhase);
        float highlight = exp(-pow((vAlong - sweep) * 11.0, 2.0));
        color = mix(color, vec3(1.0), highlight * 0.36);
        gl_FragColor = vec4(color, uOpacity * (0.92 + highlight * 0.08));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })
  options.registry.push(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = options.renderOrder
  mesh.frustumCulled = false

  const arrow = new THREE.Group()
  arrow.add(mesh)
  arrow.renderOrder = options.renderOrder
  arrow.userData.sphericalSurfaceArrow = true
  arrow.userData.surfaceArrowMesh = mesh
  arrow.userData.surfaceArrowSpan = options.span
  arrow.userData.surfaceArrowSamples = shaftSamples
  arrow.userData.surfaceArrowShaftHalfWidth = options.shaftHalfWidth
  arrow.userData.surfaceArrowHeadHalfWidth = options.headHalfWidth
  arrow.userData.surfaceArrowOpacity = options.opacity

  const item: MovingArrow = {
    mesh: arrow,
    curve,
    progress,
    speed: options.speed,
    loopStart: options.loopStart,
    loopEnd: options.loopEnd,
    mode: options.mode,
  }
  updateSphericalSurfaceArrow(item)

  return { arrow, item }
}

function updateSphericalSurfaceArrow(item: MovingArrow) {
  const mesh = item.mesh.userData.surfaceArrowMesh as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  > | undefined
  if (!mesh) return

  const span = item.mesh.userData.surfaceArrowSpan as number
  const shaftSamples = item.mesh.userData.surfaceArrowSamples as number
  const shaftHalfWidth = item.mesh.userData.surfaceArrowShaftHalfWidth as number
  const headHalfWidth = item.mesh.userData.surfaceArrowHeadHalfWidth as number
  const opacity = item.mesh.userData.surfaceArrowOpacity as number
  const headProgress = item.progress
  const tailProgress = Math.max(item.loopStart, headProgress - span)
  const activeSpan = Math.max(0.0001, headProgress - tailProgress)
  const shoulderProgress = headProgress - activeSpan * 0.27
  const positionAttribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute

  const setSurfacePoint = (
    vertexIndex: number,
    progress: number,
    halfWidth: number,
    sideSign: number,
  ) => {
    const source = item.curve.getPointAt(progress)
    const surfaceNormal = source.clone().normalize()
    const tangent = item.curve.getTangentAt(progress)
    tangent.addScaledVector(surfaceNormal, -tangent.dot(surfaceNormal)).normalize()
    const side = surfaceNormal.clone().cross(tangent).normalize()
    const surface = surfaceNormal.multiplyScalar(Math.max(source.length(), EARTH_RADIUS + 0.092))
    surface.addScaledVector(side, halfWidth * sideSign)
    surface.addScaledVector(surface.clone().normalize(), 0.006)
    positionAttribute.setXYZ(vertexIndex, surface.x, surface.y, surface.z)
  }

  for (let index = 0; index < shaftSamples; index += 1) {
    const sampleProgress = lerpValue(
      tailProgress,
      shoulderProgress,
      index / (shaftSamples - 1),
    )
    setSurfacePoint(index * 2, sampleProgress, shaftHalfWidth, 1)
    setSurfacePoint(index * 2 + 1, sampleProgress, shaftHalfWidth, -1)
  }

  const headStart = shaftSamples * 2
  setSurfacePoint(headStart, shoulderProgress, headHalfWidth, 1)
  setSurfacePoint(headStart + 1, shoulderProgress, headHalfWidth, -1)
  setSurfacePoint(headStart + 2, headProgress, 0, 0)
  positionAttribute.needsUpdate = true
  mesh.geometry.computeBoundingSphere()

  const grown = smoothstep01((activeSpan / span) / 0.24)
  const endFade = smoothstep01((item.loopEnd - headProgress) / 0.06)
  mesh.material.uniforms.uOpacity!.value = opacity * Math.min(grown, endFade)
  mesh.visible = mesh.material.uniforms.uOpacity!.value > 0.015
}

function createMovingCurvePlaneArrow(
  curve: THREE.Curve<THREE.Vector3>,
  progress: number,
  options: {
    colorStart: THREE.Color
    colorEnd: THREE.Color
    phase: number
    opacity: number
    span: number
    shaftHalfWidth: number
    headHalfWidth: number
    speed: number
    mode: 'single' | 'three'
    renderOrder: number
    registry: THREE.ShaderMaterial[]
  },
) {
  const shaftSamples = 17
  const headSamples = 9
  const vertexCount = (shaftSamples + headSamples) * 2
  const positions = new Float32Array(vertexCount * 3)
  const along = new Float32Array(vertexCount)
  const indices: number[] = []

  for (let index = 0; index < shaftSamples - 1; index += 1) {
    const left = index * 2
    const right = left + 1
    const nextLeft = left + 2
    const nextRight = left + 3
    indices.push(left, right, nextLeft, right, nextRight, nextLeft)
    along[left] = along[right] = (index / (shaftSamples - 1)) * 0.74
  }

  const headStart = shaftSamples * 2
  along[(shaftSamples - 1) * 2] = 0.74
  along[(shaftSamples - 1) * 2 + 1] = 0.74
  // 箭头头部也沿曲线细分，转弯时不再用一块直三角形横跨包络边缘。
  for (let index = 0; index < headSamples; index++) {
    const left = headStart + index * 2
    along[left] = along[left + 1] = .74 + .26 * index / (headSamples - 1)
    if (index < headSamples - 1)
      indices.push(left, left + 1, left + 2, left + 1, left + 3, left + 2)
  }

  const geometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(positions, 3)
  positionAttribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1))
  geometry.setIndex(indices)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: options.colorStart },
      uColorEnd: { value: options.colorEnd },
      uTime: { value: 0 },
      uPhase: { value: options.phase },
      uOpacity: { value: options.opacity },
    },
    vertexShader: `
      attribute float aAlong;
      varying float vAlong;
      void main() {
        vAlong = aAlong;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;
      varying float vAlong;
      void main() {
        vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.0, 1.0, vAlong));
        float sweep = fract(uTime * 0.36 + uPhase);
        float highlight = exp(-pow((vAlong - sweep) * 10.0, 2.0));
        color = mix(color, vec3(1.0), highlight * 0.34);
        float tailFeather = smoothstep(0.0, 0.10, vAlong);
        gl_FragColor = vec4(color, uOpacity * tailFeather * (0.94 + highlight * 0.06));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })
  options.registry.push(material)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = options.renderOrder
  mesh.frustumCulled = false

  const arrow = new THREE.Group()
  arrow.add(mesh)
  arrow.renderOrder = options.renderOrder
  arrow.userData.curvePlaneArrow = true
  arrow.userData.curvePlaneArrowMesh = mesh
  arrow.userData.curvePlaneArrowSpan = options.span
  arrow.userData.curvePlaneArrowSamples = shaftSamples
  arrow.userData.curvePlaneArrowHeadSamples = headSamples
  arrow.userData.curvePlaneArrowShaftHalfWidth = options.shaftHalfWidth
  arrow.userData.curvePlaneArrowHeadHalfWidth = options.headHalfWidth
  arrow.userData.curvePlaneArrowNormal = sectionPlaneNormal(curve.getPointAt(0.25))

  const item: MovingArrow = {
    mesh: arrow,
    curve,
    progress,
    speed: options.speed,
    loopStart: 0,
    loopEnd: 1,
    mode: options.mode,
  }
  updateCurvePlaneArrow(item)
  return { arrow, item }
}

function updateCurvePlaneArrow(item: MovingArrow) {
  const mesh = item.mesh.userData.curvePlaneArrowMesh as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  > | undefined
  if (!mesh) return

  const span = item.mesh.userData.curvePlaneArrowSpan as number
  const shaftSamples = item.mesh.userData.curvePlaneArrowSamples as number
  const headSamples = item.mesh.userData.curvePlaneArrowHeadSamples as number
  const shaftHalfWidth = item.mesh.userData.curvePlaneArrowShaftHalfWidth as number
  const headHalfWidth = item.mesh.userData.curvePlaneArrowHeadHalfWidth as number
  const headProgress = item.progress
  const tailProgress = headProgress - span
  const shoulderProgress = headProgress - span * 0.27
  const positionAttribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
  const planeNormal = item.mesh.userData.curvePlaneArrowNormal as THREE.Vector3

  const wrapProgress = (value: number) => THREE.MathUtils.euclideanModulo(value, 1)
  const setPlanePoint = (
    vertexIndex: number,
    progress: number,
    halfWidth: number,
    sideSign: number,
  ) => {
    const wrappedProgress = wrapProgress(progress)
    const source = item.curve.getPointAt(wrappedProgress)
    const tangent = item.curve.getTangentAt(wrappedProgress).normalize()
    const side = new THREE.Vector3().crossVectors(planeNormal, tangent).normalize()
    source.addScaledVector(side, halfWidth * sideSign)
    positionAttribute.setXYZ(vertexIndex, source.x, source.y, source.z)
  }

  for (let index = 0; index < shaftSamples; index += 1) {
    const sampleProgress = lerpValue(
      tailProgress,
      shoulderProgress,
      index / (shaftSamples - 1),
    )
    setPlanePoint(index * 2, sampleProgress, shaftHalfWidth, 1)
    setPlanePoint(index * 2 + 1, sampleProgress, shaftHalfWidth, -1)
  }

  const headStart = shaftSamples * 2
  for (let index = 0; index < headSamples; index++) {
    const t = index / (headSamples - 1)
    const progress = lerpValue(shoulderProgress, headProgress, t)
    setPlanePoint(headStart + index * 2, progress, headHalfWidth * (1 - t), 1)
    setPlanePoint(headStart + index * 2 + 1, progress, headHalfWidth * (1 - t), -1)
  }
  positionAttribute.needsUpdate = true
  mesh.geometry.computeBoundingSphere()
}

function createCirculationTube(
  definition: CirculationDefinition,
  curve: AtmosphericCellCurve,
) {
  const isSingle = definition.type === 'single'

  const geometry = new THREE.TubeGeometry(
    curve,
    isSingle ? 280 : 220,
    isSingle ? 0.026 : 0.022,
    8,
    true,
  )

  const material = new THREE.MeshBasicMaterial({
    color: definition.color,
    transparent: true,
    opacity: isSingle ? 0.8 : 0.74,
    depthWrite: false,
    depthTest: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.cellId = definition.id
  mesh.userData.cellType = definition.type
  mesh.renderOrder = 5
  return mesh
}


interface SmokeStreamConfig {
  segments: number
  strandCount: number
  strandSpread: number
  strandRadius: number
  hazeRadius: number
  strandOpacity: number
  hazeOpacity: number
  flowSpeed: number
  waveAmplitude: number
  waveFrequency: number
  twistCount: number
}

function getSmokeStreamConfig(
  definition: CirculationDefinition,
): SmokeStreamConfig {
  const configByType: Record<CellType, SmokeStreamConfig> = {
    single: {
      segments: 320,
      strandCount: 11,
      strandSpread: 0.145,
      strandRadius: 0.0105,
      hazeRadius: 0.105,
      strandOpacity: 0.76,
      hazeOpacity: 0.075,
      flowSpeed: 0.70,
      waveAmplitude: 0.022,
      waveFrequency: 3.6,
      twistCount: 3.4,
    },
    hadley: {
      segments: 270,
      strandCount: 10,
      strandSpread: 0.118,
      strandRadius: 0.0095,
      hazeRadius: 0.088,
      strandOpacity: 0.72,
      hazeOpacity: 0.072,
      flowSpeed: 0.86,
      waveAmplitude: 0.019,
      waveFrequency: 4.2,
      twistCount: 3.8,
    },
    ferrel: {
      segments: 260,
      strandCount: 10,
      strandSpread: 0.114,
      strandRadius: 0.0092,
      hazeRadius: 0.084,
      strandOpacity: 0.70,
      hazeOpacity: 0.068,
      flowSpeed: 0.98,
      waveAmplitude: 0.021,
      waveFrequency: 4.6,
      twistCount: 4.2,
    },
    polar: {
      segments: 240,
      strandCount: 11,
      strandSpread: 0.118,
      strandRadius: 0.0094,
      hazeRadius: 0.092,
      strandOpacity: 0.74,
      hazeOpacity: 0.078,
      flowSpeed: 0.90,
      waveAmplitude: 0.017,
      waveFrequency: 4.1,
      twistCount: 3.5,
    },
  }

  return configByType[definition.type]
}

/**
 * 从正确的环流中心路径派生出一条略微缠绕的烟流曲线。
 * 只改变路径周围的小尺度形态，不改变曲线的正向顺序，
 * 因此烟流方向始终与近地面支→上升→高空支→下沉一致。
 */
function createOffsetSmokeCurve(
  baseCurve: THREE.Curve<THREE.Vector3>,
  samples: number,
  normalOffset: number,
  binormalOffset: number,
  phase: number,
  waviness: number,
  twistCount: number,
) {
  const frames = baseCurve.computeFrenetFrames(samples, true)
  const points: THREE.Vector3[] = []
  const center = new THREE.Vector3()

  for (let index = 0; index <= samples; index++) {
    const t = index / samples
    baseCurve.getPointAt(t, center)

    const slowCurl = Math.sin(t * Math.PI * 2 * 1.15 + phase * 0.63)
    const fastCurl = Math.sin(t * Math.PI * 2 * 3.4 - phase * 1.31)

    const twist =
      phase +
      t * Math.PI * 2 * twistCount +
      slowCurl * 0.46 +
      fastCurl * 0.16

    const breathing =
      0.58 +
      0.30 * Math.sin(t * Math.PI * 2 * 1.9 + phase * 0.7) +
      0.12 * Math.sin(t * Math.PI * 2 * 5.1 - phase)

    const meander = waviness * 0.34 * slowCurl

    const normalAmount =
      normalOffset +
      Math.cos(twist) * waviness * breathing +
      meander

    const binormalAmount =
      binormalOffset +
      Math.sin(twist) * waviness * breathing +
      waviness * 0.22 * fastCurl

    points.push(
      center
        .clone()
        .addScaledVector(frames.normals[index]!, normalAmount)
        .addScaledVector(frames.binormals[index]!, binormalAmount),
    )
  }

  const curve = new THREE.CatmullRomCurve3(
    points,
    true,
    'centripetal',
    0.5,
  )

  curve.arcLengthDivisions = Math.max(360, samples * 2)
  return curve
}

function createSmokeStreamMaterial(
  _color: number,
  options: {
    opacity: number
    flowSpeed: number
    phase: number
    waveAmplitude: number
    waveFrequency: number
    haze: boolean
    brightness: number
  },
) {
  const paletteIndex = Math.abs(Math.floor(options.phase * 7.0)) % 4
  const surfacePalette = [0x42e9ff, 0x69b8ff, 0x9188ff, 0xb3d4ff]
  const warmPalette = [0xff4f59, 0xff6273, 0xff7694, 0xff5366]
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(surfacePalette[paletteIndex]) },
      uTime: { value: 0 },
      uOpacity: { value: options.opacity },
      uFlowSpeed: { value: options.flowSpeed },
      uPhase: { value: options.phase },
      uWaveAmplitude: { value: options.waveAmplitude },
      uWaveFrequency: { value: options.waveFrequency },
      uHaze: { value: options.haze ? 1 : 0 },
      uBrightness: { value: options.brightness },
      uRiseColor: { value: new THREE.Color(warmPalette[paletteIndex]) },
      uSinkColor: { value: new THREE.Color(paletteIndex % 2 === 0 ? 0x799fff : 0xa18cff) },
      uReveal: { value: 0 },
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

      float fbm(vec2 p) {
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

        float flow =
          uv.x * uWaveFrequency -
          uTime * uFlowSpeed * 0.16 +
          uPhase;

        vec2 periodicCoord = vec2(
          cos(flow * TAU),
          sin(flow * TAU)
        ) * 1.8;

        float turbulence = fbm(
          periodicCoord +
          vec2(uv.y * 2.7, uTime * 0.045)
        );

        float rollingWave = sin(
          flow * TAU +
          turbulence * 4.2 +
          sin(uv.y * TAU) * 0.85
        );

        vec3 transformed = position;
        transformed += normal *
          uWaveAmplitude *
          (
            rollingWave * 0.58 +
            (turbulence - 0.5) * 1.35
          );

        vec4 viewPosition =
          modelViewMatrix * vec4(transformed, 1.0);

        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        vVertexTurbulence = turbulence;

        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uFlowSpeed;
      uniform float uPhase;
      uniform float uHaze;
      uniform float uBrightness;
      uniform vec3 uRiseColor;
      uniform vec3 uSinkColor;
      uniform float uReveal;

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

      float fbm(vec2 p) {
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
        float movingX = fract(
          vUv.x -
          uTime * uFlowSpeed * 0.042 +
          uPhase
        );

        vec2 loopCoord = vec2(
          cos(movingX * TAU),
          sin(movingX * TAU)
        );

        vec2 aroundCoord = vec2(
          cos(vUv.y * TAU),
          sin(vUv.y * TAU)
        );

        float broadNoise = fbm(
          loopCoord * 2.35 +
          aroundCoord * 0.82 +
          vec2(uTime * 0.026, -uTime * 0.018)
        );

        float fineNoise = fbm(
          loopCoord * 5.15 -
          aroundCoord * 1.27 +
          vec2(-uTime * 0.055, uTime * 0.031) +
          uPhase * 2.0
        );

        float broadPulse = 0.5 + 0.5 * sin(
          (
            vUv.x * 4.2 -
            uTime * uFlowSpeed * 0.21 +
            uPhase +
            broadNoise * 0.52
          ) * TAU
        );

        float mediumPulse = 0.5 + 0.5 * sin(
          (
            vUv.x * 9.5 -
            uTime * uFlowSpeed * 0.34 +
            uPhase * 1.43 +
            fineNoise * 0.31
          ) * TAU
        );

        float finePulse = 0.5 + 0.5 * sin(
          (
            vUv.x * 18.0 -
            uTime * uFlowSpeed * 0.53 +
            uPhase * 2.17 +
            fineNoise * 0.18
          ) * TAU
        );

        float streaks =
          pow(broadPulse, 2.4) * 0.46 +
          pow(mediumPulse, 6.0) * 0.38 +
          pow(finePulse, 14.0) * 0.34;

        float turbulentDensity = smoothstep(
          0.22,
          0.88,
          broadNoise * 0.62 +
          fineNoise * 0.38 +
          vVertexTurbulence * 0.24
        );

        float fresnel = pow(
          1.0 - abs(dot(
            normalize(vViewNormal),
            normalize(vViewDirection)
          )),
          1.18
        );

        float filamentDensity =
          (0.08 + streaks) *
          (0.30 + turbulentDensity * 0.84) *
          (0.22 + fresnel * 0.94);

        float hazeDensity =
          (0.16 + broadPulse * 0.27) *
          (0.26 + turbulentDensity * 0.88) *
          (0.18 + fresnel * 0.88);

        float density = mix(
          filamentDensity,
          hazeDensity,
          uHaze
        );

        // UV 纵向区间对应：近地面→上升→高空→下沉。
        float riseMask =
          smoothstep(0.18, 0.27, vUv.x) *
          (1.0 - smoothstep(0.64, 0.72, vUv.x));

        float sinkMask =
          smoothstep(0.66, 0.73, vUv.x) *
          (1.0 - smoothstep(0.98, 1.0, vUv.x));

        vec3 segmentColor = uColor;
        segmentColor = mix(segmentColor, uRiseColor, riseMask * 0.97);
        segmentColor = mix(segmentColor, uSinkColor, sinkMask * 0.94);

        // 从路径起点逐步喷出，形成完整环流，而不是瞬间全部显示。
        float revealAlpha = smoothstep(
          -0.055,
          0.025,
          uReveal - vUv.x
        );

        // 柔化外缘，并让局部烟丝自然断续、聚散。
        float softBreakup = smoothstep(
          0.10,
          0.82,
          broadNoise * 0.58 + fineNoise * 0.42
        );

        float alpha =
          uOpacity *
          clamp(density * 2.35, 0.0, 1.0) *
          revealAlpha *
          (0.46 + softBreakup * 0.70);

        if (alpha < 0.0035) discard;

        float whitening = clamp(
          0.08 +
          fresnel * 0.22 +
          pow(finePulse, 10.0) * 0.18 +
          uHaze * 0.04,
          0.0,
          0.44
        );

        vec3 smokeColor = mix(
          segmentColor,
          vec3(1.0),
          whitening
        );

        smokeColor *=
          uBrightness *
          (0.64 + density * 0.72);

        gl_FragColor = vec4(
          smokeColor,
          alpha
        );
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

function createCirculationEnvelope(
  curve: THREE.Curve<THREE.Vector3>,
  mode: 'single' | 'three',
) {
  const sampleCount = mode === 'single' ? 150 : 110
  const boundaryPoints = Array.from({ length: sampleCount }, (_, index) =>
    curve.getPointAt(index / sampleCount),
  )
  const horizontalAxis = boundaryPoints
    .reduce((axis, point) => axis.add(new THREE.Vector3(point.x, 0, point.z)), new THREE.Vector3())
    .normalize()
  const verticalAxis = new THREE.Vector3(0, 1, 0)
  const normalAxis = horizontalAxis.clone().cross(verticalAxis).normalize()

  const shape = new THREE.Shape()
  boundaryPoints.forEach((point, index) => {
    const x = point.dot(horizontalAxis)
    const y = point.y
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape, 16)
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(
    horizontalAxis,
    verticalAxis,
    normalAxis,
  ))
  geometry.computeVertexNormals()
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCoolColor: { value: new THREE.Color(0x55ddff) },
      uVioletColor: { value: new THREE.Color(0x9b91ff) },
      uWarmColor: { value: new THREE.Color(0xff6682) },
      uOpacity: { value: mode === 'single' ? 0.62 : 0.52 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCoolColor;
      uniform vec3 uVioletColor;
      uniform vec3 uWarmColor;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        float verticalGradient = smoothstep(0.02, 0.96, vUv.y);
        float warmBand = smoothstep(0.32, 0.64, vUv.y) * (1.0 - smoothstep(0.76, 0.98, vUv.y));
        vec3 color = mix(uCoolColor, uVioletColor, verticalGradient * 0.62);
        color = mix(color, uWarmColor, warmBand * 0.10);
        float centerGlow = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float alpha = uOpacity * (0.34 + verticalGradient * 0.18 + centerGlow * 0.14);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })
  material.toneMapped = false
  const face = new THREE.Mesh(geometry, material)
  face.name = `${mode}-circulation-gradient-face`
  face.renderOrder = 5.36
  face.frustumCulled = false

  const outlineGeometry = new THREE.BufferGeometry().setFromPoints([
    ...boundaryPoints,
    boundaryPoints[0]!,
  ])
  const outline = new THREE.Line(
    outlineGeometry,
    new THREE.LineBasicMaterial({
      color: mode === 'single' ? 0x7de8ff : 0x83d8ff,
      transparent: true,
      opacity: mode === 'single' ? 0.82 : 0.66,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )
  outline.renderOrder = 5.38

  const group = new THREE.Group()
  group.name = `${mode}-circulation-solid-envelope`
  group.add(face, outline)
  return group
}

function createInsetCirculationCurve(
  curve: THREE.Curve<THREE.Vector3>,
  scale: number,
) {
  const sampleCount = 220
  const points = Array.from({ length: sampleCount }, (_, index) =>
    curve.getPointAt(index / sampleCount),
  )
  const latitudes = points.map(point =>
    THREE.MathUtils.radToDeg(Math.asin(point.y / Math.max(0.0001, point.length()))),
  )
  const centerLatitude = latitudes.reduce((sum, latitude) => sum + latitude, 0) / latitudes.length
  const latitudeScale = Math.min(0.92, scale + 0.12)
  const insetPoints = points.map((point, index) => {
    const radius = point.length()
    const theta = Math.atan2(point.z, -point.x)
    const longitude = normalizeLon(THREE.MathUtils.radToDeg(theta) - 180)
    const latitude = centerLatitude + (latitudes[index]! - centerLatitude) * latitudeScale
    const insetRadius =
      EARTH_RADIUS + 0.14 +
      Math.max(0, radius - (EARTH_RADIUS + 0.09)) * scale
    return latLonToVec3(latitude, longitude, insetRadius)
  })
  const insetCurve = new THREE.CatmullRomCurve3(
    insetPoints,
    true,
    'centripetal',
    0.5,
  )
  insetCurve.arcLengthDivisions = 520
  return insetCurve
}

function createSmokeStream(
  definition: CirculationDefinition,
  baseCurve: THREE.Curve<THREE.Vector3>,
  mode: 'single' | 'three',
  options: {
    streamIndex: number
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
) {
  const config = getSmokeStreamConfig(definition)

  const smokeCurve = createOffsetSmokeCurve(
    baseCurve,
    Math.max(150, Math.round(config.segments * 0.64)),
    options.normalOffset,
    options.binormalOffset,
    options.phase,
    options.haze
      ? config.strandSpread * 0.12
      : config.strandSpread * 0.28,
    options.twistCount,
  )

  const geometry = new THREE.TubeGeometry(
    smokeCurve,
    config.segments,
    options.radius,
    options.haze ? 8 : 6,
    true,
  )

  const material = createSmokeStreamMaterial(
    definition.color,
    {
      opacity: options.opacity,
      flowSpeed: options.flowSpeed,
      phase: options.phase,
      waveAmplitude: options.waveAmplitude,
      waveFrequency: options.waveFrequency,
      haze: options.haze,
      brightness: options.brightness,
    },
  )

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `${definition.id}-smoke-stream-${options.streamIndex}`
  mesh.userData.cellId = definition.id
  mesh.userData.cellType = definition.type
  mesh.userData.smokeHaze = options.haze
  mesh.renderOrder = options.haze
    ? 5.7
    : 6.1 + options.streamIndex * 0.008
  mesh.frustumCulled = false

  smokeStreams.push({
    cellId: definition.id,
    cellType: definition.type,
    mode,
    mesh,
  })

  return mesh
}

function createSmokeBundle(
  definition: CirculationDefinition,
  curve: AtmosphericCellCurve,
  mode: 'single' | 'three',
) {
  const group = new THREE.Group()
  const config = getSmokeStreamConfig(definition)
  const hemispherePhase =
    definition.hemisphere === 'south'
      ? 0.43
      : 0
  const smokeCurve = createInsetCirculationCurve(
    curve,
    mode === 'single' ? 0.82 : 0.72,
  )

  // 一层宽而淡的体积烟雾，负责形成截图中柔和的空气团感。
  group.add(
    createSmokeStream(
      definition,
      smokeCurve,
      mode,
      {
        streamIndex: -1,
        normalOffset: 0,
        binormalOffset: 0,
        phase: hemispherePhase + 0.17,
        radius: config.hazeRadius,
        opacity: config.hazeOpacity,
        flowSpeed: config.flowSpeed * 0.72,
        waveAmplitude: config.waveAmplitude * 1.55,
        waveFrequency: config.waveFrequency * 0.64,
        twistCount: config.twistCount * 0.52,
        haze: true,
        brightness: 0.82,
      },
    ),
  )

  // 第二层更宽、更淡的外部烟雾包络，让烟流边缘更柔、更散。
  group.add(
    createSmokeStream(
      definition,
      smokeCurve,
      mode,
      {
        streamIndex: -2,
        normalOffset: config.strandSpread * 0.12,
        binormalOffset: -config.strandSpread * 0.08,
        phase: hemispherePhase + 1.37,
        radius: config.hazeRadius * 1.46,
        opacity: config.hazeOpacity * 0.48,
        flowSpeed: config.flowSpeed * 0.48,
        waveAmplitude: config.waveAmplitude * 2.15,
        waveFrequency: config.waveFrequency * 0.42,
        twistCount: config.twistCount * 0.36,
        haze: true,
        brightness: 0.66,
      },
    ),
  )

  // 多股细烟丝围绕主路径缓慢缠绕，形成类似参考图的束状烟流。
  for (let index = 0; index < config.strandCount; index++) {
    const angle =
      (index / config.strandCount) * Math.PI * 2 +
      hemispherePhase +
      (index % 2) * 0.19

    const ringScale =
      0.48 +
      0.34 * (0.5 + 0.5 * Math.sin(index * 1.71))

    const distance =
      config.strandSpread * ringScale

    const normalOffset =
      Math.cos(angle) * distance

    const binormalOffset =
      Math.sin(angle) * distance

    const centerBias =
      index === 0
        ? 1.18
        : 1.0 - (index / config.strandCount) * 0.12

    group.add(
      createSmokeStream(
        definition,
        smokeCurve,
        mode,
        {
          streamIndex: index,
          normalOffset,
          binormalOffset,
          phase: angle + index * 0.37,
          radius:
            config.strandRadius *
            centerBias *
            (0.88 + 0.18 * Math.sin(index * 2.13)),
          opacity:
            config.strandOpacity *
            (0.82 + 0.18 * Math.cos(index * 1.47)),
          flowSpeed:
            config.flowSpeed *
            (0.90 + index * 0.026),
          waveAmplitude:
            config.waveAmplitude *
            (0.82 + index * 0.045),
          waveFrequency:
            config.waveFrequency *
            (0.88 + index * 0.035),
          twistCount:
            config.twistCount *
            (0.92 + index * 0.028),
          haze: false,
          brightness:
            index === 0
              ? 2.18
              : 1.82 + (index % 3) * 0.10,
        },
      ),
    )
  }

  group.name = `${definition.id}-shader-smoke-bundle`
  return group
}

function createSingleCellSystem() {
  const root = new THREE.Group()
  root.name = 'single-cell-root'

  const airflowGroup = new THREE.Group()
  const directionGroup = new THREE.Group()
  const surfaceDirectionGroup = new THREE.Group()

  airflowGroup.name = 'single-cell-shader-smoke-streams'
  directionGroup.name = 'single-cell-circulation-direction-arrows'
  surfaceDirectionGroup.name = 'single-cell-surface-direction-arrows'

  root.add(airflowGroup, directionGroup, surfaceDirectionGroup)

  singleCellDefinitions.forEach(definition => {
    CIRCULATION_SECTIONS.forEach((section, sectionIndex) => {
      const curve = new AtmosphericCellCurve(definition, section.longitude, 0)
      // 实体剖面属于环流结构，不随“环流气流”开关消失。
      directionGroup.add(createCirculationEnvelope(curve, 'single'))
      if (section.fullEffect) {
        airflowGroup.add(createSmokeBundle(definition, curve, 'single'))
      }

      if (section.fullEffect) {
        ;[0.10, 0.34, 0.58, 0.82].forEach((progress, arrowIndex) => {
          directionGroup.add(
            createCurveDirectionArrow(
              curve,
              progress + sectionIndex * 0.025 + arrowIndex * 0.006,
              definition,
              1.06,
              'single',
            ),
          )
        })
      } else {
        ;[0.12, 0.58].forEach((progress, arrowIndex) => {
          directionGroup.add(
            createMovingInsetCirculationArrow(
              curve,
              definition,
              progress + sectionIndex * 0.035,
              sectionIndex * 0.23 + arrowIndex * 0.46,
              'single',
            ),
          )
        })
      }
    })

    // 四个剖面之间各放置一组南、北半球贴地箭头：
    // 4 个间隔 × 2 个半球，共 8 组，并全部位于相邻剖面的正中间。
    SINGLE_CELL_SURFACE_ARROW_LONGITUDES.forEach((longitude, index) => {
      const surfaceCurve = new SingleCellSurfaceArrowCurve(
        definition.hemisphere,
        longitude,
      )
      surfaceDirectionGroup.add(
        createMovingSingleCellSurfaceArrow(
          surfaceCurve,
          0.38 + index * 0.08,
          index * 0.23 + (definition.hemisphere === 'south' ? 0.46 : 0),
        ),
      )
    })
  })

  singleCellAirflowGroup = airflowGroup
  return root
}

function createThreeCellSystem(latitudeOffset = 0) {
  const root = new THREE.Group()
  root.name = 'three-cell-root'

  const directionGroups: Record<ThreeCellType, THREE.Group> = {
    hadley: new THREE.Group(),
    ferrel: new THREE.Group(),
    polar: new THREE.Group(),
  }

  const airflowGroups: Record<ThreeCellType, THREE.Group> = {
    hadley: new THREE.Group(),
    ferrel: new THREE.Group(),
    polar: new THREE.Group(),
  }

  directionGroups.hadley.name = 'hadley-direction-arrows'
  directionGroups.ferrel.name = 'ferrel-direction-arrows'
  directionGroups.polar.name = 'polar-direction-arrows'

  airflowGroups.hadley.name = 'hadley-shader-smoke-streams'
  airflowGroups.ferrel.name = 'ferrel-shader-smoke-streams'
  airflowGroups.polar.name = 'polar-shader-smoke-streams'

  root.add(
    airflowGroups.hadley,
    airflowGroups.ferrel,
    airflowGroups.polar,
    directionGroups.hadley,
    directionGroups.ferrel,
    directionGroups.polar,
  )

  threeCellDefinitions.forEach(definition => {
    CIRCULATION_SECTIONS.forEach((section, sectionIndex) => {
      const curve = new AtmosphericCellCurve(
        definition,
        section.longitude,
        latitudeOffset,
      )

      directionGroups[definition.type].add(createCirculationEnvelope(curve, 'three'))
      if (section.fullEffect) {
        airflowGroups[definition.type].add(
          createSmokeBundle(definition, curve, 'three'),
        )
      }

      if (section.fullEffect) {
        ;[0.12, 0.37, 0.62, 0.87].forEach((progress, arrowIndex) => {
          directionGroups[definition.type].add(
            createCurveDirectionArrow(
              curve,
              progress + sectionIndex * 0.018 + arrowIndex * 0.004,
              definition,
              1.0,
              'three',
            ),
          )
        })
      } else {
        ;[0.14, 0.60].forEach((progress, arrowIndex) => {
          directionGroups[definition.type].add(
            createMovingInsetCirculationArrow(
              curve,
              definition,
              progress + sectionIndex * 0.028,
              sectionIndex * 0.19 + arrowIndex * 0.43,
              'three',
            ),
          )
        })
      }
    })
  })

  circulationLineGroups = directionGroups
  circulationAirflowGroups = airflowGroups
  return root
}

// ==================== 纬线 ====================
function createSimpleGridLine(
  points: THREE.Vector3[],
  color: number,
  opacity: number,
  closed: boolean,
  thickness = 0.0042,
) {
  const curve = new THREE.CatmullRomCurve3(
    points,
    closed,
    'centripetal',
    0.5,
  )

  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, closed ? 180 : 120, thickness, 6, closed),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
    }),
  )

  mesh.renderOrder = 3
  return mesh
}

function createHighlightedGridCurve(
  points: THREE.Vector3[],
  color: number,
  opacity: number,
  closed: boolean,
) {
  const curve = new THREE.CatmullRomCurve3(
    points,
    closed,
    'centripetal',
    0.5,
  )

  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, closed ? 200 : 140, 0.0062, 6, closed),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )

  mesh.renderOrder = 5
  return mesh
}

function createLatLines() {
  const group = new THREE.Group()
  group.name = 'latitude-longitude-graticule'

  const radius = EARTH_RADIUS + 0.012
  const regularLatitudeColor = 0x78b9d8
  const regularLongitudeColor = 0xa7e4ff

  // 普通纬线每15°一根。
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue

    const points: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 2) {
      points.push(latLonToVec3(lat, lon, radius))
    }

    group.add(createSimpleGridLine(points, regularLatitudeColor, 0.48, true, 0.0034))
  }

  // 普通经线每15°一根，0°和180°单独高亮。
  for (let lon = -165; lon <= 165; lon += 15) {
    if (lon === 0) continue

    const points: THREE.Vector3[] = []
    for (let lat = -89; lat <= 89; lat += 2) {
      points.push(latLonToVec3(lat, lon, radius))
    }

    group.add(createSimpleGridLine(points, regularLongitudeColor, 0.72, false, 0.0048))
  }

  group.add(createReferenceLatitudes(EARTH_RADIUS))

  const specialMeridians = [
    { lon: 0, color: 0x2ec4b6, opacity: 0.96 },
    { lon: 180, color: 0xff5f9e, opacity: 0.96 },
  ]

  specialMeridians.forEach(item => {
    const points: THREE.Vector3[] = []
    for (let lat = -89; lat <= 89; lat += 2) {
      points.push(latLonToVec3(lat, item.lon, radius + 0.0025))
    }

    group.add(
      createHighlightedGridCurve(points, item.color, item.opacity, false),
    )
  })

  return group
}


// ==================== 资源释放 ====================
function disposeObject3D(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  root.traverse(object => {
    const renderable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry
      material?: THREE.Material | THREE.Material[]
    }

    if (renderable.geometry) geometries.add(renderable.geometry)

    const materialList = Array.isArray(renderable.material)
      ? renderable.material
      : renderable.material
        ? [renderable.material]
        : []

    materialList.forEach(material => {
      materials.add(material)

      const materialWithTextures = material as THREE.Material & {
        map?: THREE.Texture
        alphaMap?: THREE.Texture
        emissiveMap?: THREE.Texture
        normalMap?: THREE.Texture
        roughnessMap?: THREE.Texture
        metalnessMap?: THREE.Texture
      }

      materialWithTextures.map && textures.add(materialWithTextures.map)
      materialWithTextures.alphaMap && textures.add(materialWithTextures.alphaMap)
      materialWithTextures.emissiveMap && textures.add(materialWithTextures.emissiveMap)
      materialWithTextures.normalMap && textures.add(materialWithTextures.normalMap)
      materialWithTextures.roughnessMap && textures.add(materialWithTextures.roughnessMap)
      materialWithTextures.metalnessMap && textures.add(materialWithTextures.metalnessMap)

      if (material instanceof THREE.ShaderMaterial) {
        Object.values(material.uniforms).forEach(uniform => {
          if (uniform?.value instanceof THREE.Texture) textures.add(uniform.value)
        })
      }
    })
  })

  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
  geometries.forEach(geometry => geometry.dispose())
  root.clear()
}

// Seasonal surface layers and circulation meshes persist across month changes.
// Shared uniforms update their latitude every frame without resetting flow phases.
// ==================== 初始化 ====================
function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000a1a)

  new THREE.TextureLoader().load(
    atmosphericSpaceBackgroundUrl,
    texture => {
      if (componentDestroyed || !scene) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      scene.background = texture
      scene.backgroundIntensity = 0.76
    },
  )

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.copy(defaultCameraPosition)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 4.5
  orbitControls.maxDistance = 25
  orbitControls.target.set(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xbfd7ff, 2.25))

  earthGroup = new THREE.Group()
  earthGroup.rotation.z = 0
  scene.add(earthGroup)

  const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const fallbackTexture = createEarthTexture()

  const earthMaterial = createEarthShaderMaterial(fallbackTexture)

  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
  earthGroup.add(earthMesh)

  new THREE.TextureLoader().load(
    '/geo-resources-folder/images/Material.003_diffuse.jpg',
    texture => {
      if (componentDestroyed) {
        texture.dispose()
        return
      }

      texture.colorSpace = THREE.SRGBColorSpace
      const previousTexture = earthMaterial.uniforms.uMap!.value as THREE.Texture
      earthMaterial.uniforms.uMap!.value = texture

      if (previousTexture && previousTexture !== texture) {
        previousTexture.dispose()
      }
    },
    undefined,
    () => {
      console.warn('地球贴图加载失败，继续使用程序化纹理')
    },
  )

  const wireframeGeometry = new THREE.WireframeGeometry(
    new THREE.SphereGeometry(EARTH_RADIUS, 64, 16),
  )

  earthWireframe = new THREE.LineSegments(
    wireframeGeometry,
    new THREE.LineBasicMaterial({
      color: 0x304050,
      transparent: true,
      opacity: 0.08,
    }),
  )

  earthMesh.add(earthWireframe)

  singleCellRoot = createSingleCellSystem()
  threeCellRoot = createThreeCellSystem(0)
  latLineGroup = createLatLines()
  surfaceClimate = new SurfaceClimate()
  seasonalWarp = new SeasonalWarp(surfaceClimate.shift)
  seasonalWarp.attach(threeCellRoot)
  earthMesh.add(singleCellRoot, threeCellRoot, latLineGroup, surfaceClimate.group)

  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => {
    /*
     * 连续变化时只重置定时器，不直接执行 setSize。
     */
    scheduleSceneResize(110)
  })

  threeResizeObserver.observe(container)

  sceneReady = true
  isCloseView.value = false
  applyCloseViewImmediately()
  resetCirculationFormation()
  applyLayerVisibility()
  animate()
}

// ==================== 动画 ====================
function updateSmokeStreams() {
  const activeMode = simMode.value === 'single' ? 'single' : 'three'

  smokeStreams.forEach(stream => {
    if (stream.mode !== activeMode) return
    if (!stream.mesh.parent?.visible) return

    stream.mesh.material.uniforms.uTime!.value = timeAccum
    stream.mesh.material.uniforms.uReveal!.value = circulationRevealProgress
  })

}

function updateMovingArrowItem(
  item: MovingArrow,
  deltaTime: number,
) {
  const range = item.loopEnd - item.loopStart
  item.progress += deltaTime * item.speed * playbackSpeed.value

  if (item.progress >= item.loopEnd) {
    item.progress = item.loopStart + THREE.MathUtils.euclideanModulo(
      item.progress - item.loopStart,
      range,
    )
  }

  if (item.mesh.userData.curvePlaneArrow) {
    updateCurvePlaneArrow(item)
    return
  }

  if (item.mesh.userData.sphericalSurfaceArrow) {
    updateSphericalSurfaceArrow(item)
    return
  }

  const position = item.curve.getPointAt(item.progress)
  const tangent = item.curve.getTangentAt(item.progress).normalize()

  item.mesh.position.copy(position)
  item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
}

function updateAnimatedArrows(deltaTime: number) {
  if (!isPlaying.value) return

  const activeCirculationMode = simMode.value === 'single' ? 'single' : 'three'

  circulationDirectionArrows.forEach(item => {
    if (item.mode !== activeCirculationMode) return
    if (!item.mesh.parent?.visible) return
    updateMovingArrowItem(item, deltaTime)
  })

  singleCellArrowMaterials.forEach(material => {
    material.uniforms.uTime!.value = timeAccum
  })

}

function updateViewTransition(deltaTime: number) {
  if (
    !viewTransitionActive ||
    !camera ||
    !orbitControls ||
    !earthGroup ||
    !earthMesh
  ) {
    return
  }

  viewTransitionElapsed += deltaTime
  const rawProgress = Math.min(1, viewTransitionElapsed / viewTransitionDuration)
  const progress = circulationTransitionProgress(rawProgress, isCloseView.value)

  interpolateCirculationCamera(
    viewStartCameraPosition,
    viewTargetCameraPosition,
    progress.camera,
    camera.position,
  )

  orbitControls.target.lerpVectors(
    viewStartOrbitTarget,
    viewTargetOrbitTarget,
    progress.camera,
  )

  earthGroup.rotation.z = THREE.MathUtils.lerp(
    viewStartEarthGroupZ,
    viewTargetEarthGroupZ,
    progress.rotation,
  )

  earthMesh.rotation.y = THREE.MathUtils.lerp(
    viewStartEarthMeshY,
    viewTargetEarthMeshY,
    progress.rotation,
  )

  camera.fov = THREE.MathUtils.lerp(viewStartFov, viewTargetFov, progress.camera)
  camera.updateProjectionMatrix()
  camera.lookAt(orbitControls.target)

  if (rawProgress >= 1) {
    viewTransitionActive = false
    orbitControls.enabled = true
    orbitControls.enableDamping = true
    orbitControls.minDistance = isCloseView.value ? .45 : 4.5
    if (!isCloseView.value) {
      rotationAngle = earthMesh.rotation.y
      hasOverviewSnapshot = false
    }
  }
}

function animate() {
  animationId = requestAnimationFrame(animate)

  if (!sceneReady || !earthMesh) return

  const deltaTime = Math.min(clock.getDelta(), 0.05)

  if (isPlaying.value) {
    timeAccum += deltaTime * playbackSpeed.value

    if (currentStage.value !== 0 && !isCloseView.value && !viewTransitionActive) {
      const rotationSpeed = 0.075
      rotationAngle += deltaTime * rotationSpeed * playbackSpeed.value
      earthMesh.rotation.y = rotationAngle
    }

    circulationRevealProgress = Math.min(1, circulationRevealProgress + deltaTime * 0.28 * Math.max(1, playbackSpeed.value * 0.8))
  }

  surfaceClimate?.update(deltaTime, climateState())
  updateSmokeStreams()
  updateAnimatedArrows(deltaTime)
  updateViewTransition(deltaTime)
  if (!viewTransitionActive) {
    orbitControls?.update()
    if (isCloseView.value && camera && camera.position.length() < EARTH_RADIUS + .08) {
      camera.position.setLength(EARTH_RADIUS + .08)
      camera.lookAt(orbitControls!.target)
    }
  }
  if (camera) seasonalWarp?.update(camera, earthMesh)

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }

  labelUpdateElapsed += deltaTime
  if (labelUpdateElapsed >= .065) {
    labelUpdateElapsed = 0
    updateLabels()
  }
}

// ==================== 标签更新 ====================
function isLabelLayerVisible(label: SceneLabel) {
  if (!layers.textAnnotations) return false

  if (simMode.value === 'single') {
    return label.type === 'single'
  }

  if (label.type === 'pressure') return !!layers.pressureBands
  if (label.type === 'wind') return !!layers.surfaceWinds

  if (label.type === 'cell') {
    if (label.cls === 'label-cell-hadley') return !!layers.hadleyCell
    if (label.cls === 'label-cell-ferrel') return !!layers.ferrelCell
    if (label.cls === 'label-cell-polar') return !!layers.polarCell
  }

  return true
}

function getLabelRadius(label: SceneLabel) {
  if (label.type === 'pressure') return EARTH_RADIUS + 0.08
  if (label.type === 'wind') return EARTH_RADIUS + 0.12
  if (label.type === 'single') return EARTH_RADIUS + 0.82
  return EARTH_RADIUS + 0.86
}

const circulationLabelPositions = new Map<string, THREE.Vector3>()

function getCirculationLabelPosition(
  label: SceneLabel,
  seasonalOffset: number,
) {
  if (!label.circulationId) return null

  const definition = label.type === 'single'
    ? singleCellDefinitions.find(item => item.id === label.circulationId)
    : threeCellDefinitions.find(item => item.id === label.circulationId)

  if (!definition) return null

  const key = `${definition.id}:${label.curveProgress ?? 0.63}`
  let anchor = circulationLabelPositions.get(key)
  if (!anchor) {
    const curve = new AtmosphericCellCurve(definition, getCellCenterLon(definition), 0)
    anchor = curve.getPointAt(label.curveProgress ?? 0.63)
    circulationLabelPositions.set(key, anchor)
  }
  const position = anchor.clone()
  if (label.type !== 'single') {
    const radius = position.length()
    const latitude = THREE.MathUtils.radToDeg(Math.asin(position.y / radius))
    const longitude = THREE.MathUtils.radToDeg(Math.atan2(-position.z, position.x))
    position.copy(latLonToVec3(shiftLatitude(latitude, seasonalOffset), longitude, radius))
  }

  // 稍微抬离烟流中心线，避免文字压住烟流，同时保持与对应环流同步转动。
  return position.addScaledVector(position.clone().normalize(), 0.10)
}

function updateLabels() {
  const container = threeContainerRef.value

  if (!container || !camera || !earthMesh) return

  const width = container.clientWidth
  const height = container.clientHeight

  if (!layers.textAnnotations) {
    labelScreenData.value = allLabels.value.map(label => ({
      text: label.text,
      x: 0,
      y: 0,
      visible: false,
      cls: label.cls,
    }))
    return
  }

  earthMesh.updateWorldMatrix(true, false)

  const earthCenter = earthMesh.getWorldPosition(new THREE.Vector3())
  const seasonalOffset = getSeasonalLatitudeOffset()

  labelScreenData.value = allLabels.value.map(label => {
    const shouldShift = label.type !== 'single'
    const lat = shouldShift
      ? shiftLatitude(label.lat, seasonalOffset)
      : label.lat

    const circulationLabel =
      label.type === 'single' || label.type === 'cell'

    let localPosition: THREE.Vector3

    if (circulationLabel && label.circulationId) {
      // 环流名称继续绑定对应烟流曲线，但不再强制显示在地球前方。
      localPosition = getCirculationLabelPosition(label, seasonalOffset)
        ?? latLonToVec3(lat, label.lon, getLabelRadius(label))
    } else {
      localPosition = latLonToVec3(
        lat,
        label.lon,
        getLabelRadius(label),
      )
    }

    const worldPosition = localPosition.applyMatrix4(earthMesh!.matrixWorld)
    const projected = worldPosition.clone().project(camera!)
    const insideClip = projected.z >= -1 && projected.z <= 1
    const insideViewport =
      projected.x >= -1 && projected.x <= 1 &&
      projected.y >= -1 && projected.y <= 1

    // HTML 标签本身没有 WebGL 深度缓冲，因此用相机到标签的射线与地球球体相交判断遮挡。
    // 标签或环流名称转到地球背面后，会像三维箭头一样被地球挡住。
    const toLabel = worldPosition.clone().sub(camera!.position)
    const labelDistance = toLabel.length()
    const ray = new THREE.Ray(camera!.position.clone(), toLabel.normalize())
    const hitPoint = ray.intersectSphere(
      new THREE.Sphere(earthCenter, EARTH_RADIUS + 0.018),
      new THREE.Vector3(),
    )
    const occludedByEarth = !!hitPoint &&
      camera!.position.distanceTo(hitPoint) < labelDistance - 0.12

    return {
      text: label.text,
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
      visible:
        isLabelLayerVisible(label) &&
        insideClip &&
        insideViewport &&
        !occludedByEarth,
      cls: label.cls,
    }
  })
  labelScreenData.value.push(...(surfaceClimate?.projectLabels(camera, width, height, climateState()) ?? []))
}

// ==================== 图层与模式 ====================
function setCloseViewState(enabled: boolean, instant = false) {
  if (isCloseView.value === enabled && !viewTransitionActive) {
    if (instant) applyCloseViewImmediately()
    return
  }

  isCloseView.value = enabled

  if (instant) {
    applyCloseViewImmediately()
  } else {
    startCloseViewTransition()
  }
}

function syncStageView() {
  setCloseViewState(false, true)
  scheduleSceneResize(0)
}

function handleCellLayerChange(key: string) {
  if (key === 'airflowRibbons') {
    ensureAirflowCells(layers, simMode.value === 'single')
    // A manually enabled layer must also be visible while playback is paused.
    // Stage entry keeps its progressive formation animation.
    if (layers.airflowRibbons) circulationRevealProgress = 1
  }
  applyLayerVisibility()
}

function applyLayerVisibility() {
  if (!sceneReady || !earthMesh) return

  earthMesh.visible = !!layers.earth

  const singleMode = simMode.value === 'single'

  if (singleCellRoot) {
    singleCellRoot.visible = singleMode
  }

  if (threeCellRoot) {
    threeCellRoot.visible = !singleMode
  }

  if (circulationLineGroups && circulationAirflowGroups) {
    circulationLineGroups.hadley.visible =
      !singleMode && !!layers.hadleyCell

    circulationAirflowGroups.hadley.visible =
      !singleMode &&
      !!layers.hadleyCell &&
      !!layers.airflowRibbons

    circulationLineGroups.ferrel.visible =
      !singleMode && !!layers.ferrelCell

    circulationAirflowGroups.ferrel.visible =
      !singleMode &&
      !!layers.ferrelCell &&
      !!layers.airflowRibbons

    circulationLineGroups.polar.visible =
      !singleMode && !!layers.polarCell

    circulationAirflowGroups.polar.visible =
      !singleMode &&
      !!layers.polarCell &&
      !!layers.airflowRibbons
  }

  if (singleCellAirflowGroup) {
    singleCellAirflowGroup.visible =
      singleMode && !!layers.airflowRibbons
  }

  if (latLineGroup) latLineGroup.visible = !!layers.latLines
}

function isLayerAvailable(key: string) {
  if (['latLines', 'textAnnotations', 'subsolarLine', 'earth'].includes(key)) return true
  if (['regionalPressureCenters', 'isobars', 'monsoonWinds', 'oceanCurrents'].includes(key)) return currentStage.value === 3
  if (key === 'airflowRibbons') return true
  return currentStage.value > 0
}

function applyStage(stageIndex: number) {
  const stage = stages[stageIndex]
  if (!stage) return
  simMode.value = stageIndex === 0 ? 'single' : 'three'
  if (stageIndex === 0 && earthMesh) {
    rotationAngle = DEFAULT_EARTH_ROTATION
    earthMesh.rotation.y = rotationAngle
  }
  Object.keys(layers).forEach(key => { layers[key] = !!stage.layers[key] })
  stepDone.value = {}
  syncStageView()
  resetCirculationFormation()
  applyLayerVisibility()
}

function setMode(mode: SimMode) {
  const targetStage = mode === 'single' ? 0 : 1
  simMode.value = targetStage === 0 ? 'single' : 'three'
  currentStage.value = targetStage
  applyStage(targetStage)
}

function clearReplayTimers() {
  replayTimers.forEach(timer => clearTimeout(timer))
  replayTimers = []
}

function stopAutoDemo() {
  clearReplayTimers()
  isAutoDemo.value = false
}

function goToStage(
  stageIndex: number,
  options: { fromAutoDemo?: boolean } = {},
) {
  if (!options.fromAutoDemo && isAutoDemo.value) {
    stopAutoDemo()
  }

  const nextIndex = clamp(stageIndex, 0, stages.length - 1)
  currentStage.value = nextIndex

  simMode.value = nextIndex === 0 ? 'single' : 'three'

  applyStage(nextIndex)
}

const autoDemoStageDurations = [
  9000,  // 阶段一：确保单圈烟流完成喷出并闭合
  10000, // 阶段二
  9000,  // 阶段三
  10000, // 阶段四完整展示后自动结束
]

function scheduleNextAutoDemoStage() {
  clearReplayTimers()

  if (!isAutoDemo.value || componentDestroyed) return

  const scheduledStage = currentStage.value
  const duration = autoDemoStageDurations[scheduledStage] ?? 9000

  const timer = setTimeout(() => {
    replayTimers = []

    if (!isAutoDemo.value || componentDestroyed) return

    // 只处理创建该定时器时对应的阶段。
    // 即使浏览器进入后台，恢复后也只会前进一步，不会连续跳过多个阶段。
    if (currentStage.value !== scheduledStage) {
      scheduleNextAutoDemoStage()
      return
    }

    if (scheduledStage >= stages.length - 1) {
      stopAutoDemo()
      return
    }

    goToStage(scheduledStage + 1, { fromAutoDemo: true })
    scheduleNextAutoDemoStage()
  }, duration)

  replayTimers = [timer]
}

function startAutoDemo(
  options: { restartFromBeginning?: boolean } = {},
) {
  clearReplayTimers()
  isAutoDemo.value = true
  isPlaying.value = true

  const startStage = options.restartFromBeginning
    ? 0
    : currentStage.value

  // 自动演示默认从当前激活阶段开始，并重新应用该阶段，
  // 让该阶段的形成动画从头完整播放。
  goToStage(startStage, { fromAutoDemo: true })
  scheduleNextAutoDemoStage()
}

function toggleAutoDemo() {
  if (isAutoDemo.value) {
    stopAutoDemo()
    return
  }

  startAutoDemo()
}

function togglePlayback() {
  // 手动播放或暂停意味着退出自动教学流程，后续不再自动跳转阶段。
  stopAutoDemo()
  isPlaying.value = !isPlaying.value
}

function setRepresentativeMonth(nextMonth: 0 | 6) {
  if (currentStage.value < 2) return
  month.value = nextMonth
}

function nextStage() {
  if (currentStage.value < stages.length - 1) {
    goToStage(currentStage.value + 1)
  } else {
    // 最后阶段的“从头演示”是明确的重新开始，因此仍从阶段一启动。
    startAutoDemo({ restartFromBeginning: true })
  }
}

function prevStage() {
  if (currentStage.value > 0) {
    goToStage(currentStage.value - 1)
  }
}

function toggleStep(index: number) {
  stepDone.value[index] = !stepDone.value[index]
}

// ==================== Resize ====================
function resizeThreeSceneNow() {
  const container = threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer
  ) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      container.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      container.clientHeight
    )
  )

  /*
   * renderer.setSize() 会重新分配 WebGL 绘图缓冲区。
   * 尺寸没有变化时绝不调用，避免无意义清屏。
   */
  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect =
    width / height

  camera.updateProjectionMatrix()

  // 近地表视角随画幅调整视野，不退回以球心为目标的全景。
  if (isCloseView.value) applyCloseViewImmediately()

  renderer.setSize(
    width,
    height,
    false
  )

  /*
   * setSize 后立即补绘一帧，避免等待下一次动画循环时短暂空白。
   */
  if (scene) {
    if (earthMesh) seasonalWarp?.update(camera, earthMesh)
    renderer.render(
      scene,
      camera
    )
  }

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

  cancelAnimationFrame(threeSceneRevealFrame)

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      /*
       * 双 RAF 等待 CSS Grid、面板宽度和 canvas CSS 尺寸稳定。
       */
      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              resizeThreeSceneNow()
            })
        })
    }, delay)
}

// ==================== 监听 ====================
watch(layers, () => {
  applyLayerVisibility()
}, { deep: true })

watch(simMode, () => {
  if (!sceneReady) return
  resetCirculationFormation()
  applyLayerVisibility()
})

// Month transitions are handled by SurfaceClimate.update, including while paused.

// ==================== 生命周期 ====================
onMounted(async () => {
  componentDestroyed = false

  await nextTick()
  initScene()
  applyStage(currentStage.value)
})

onBeforeUnmount(() => {
  componentDestroyed = true
  sceneReady = false

  clearReplayTimers()
  cancelAnimationFrame(animationId)

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  orbitControls?.dispose()
  orbitControls = null

  surfaceClimate?.dispose()
  surfaceClimate = null
  seasonalWarp = null

  if (scene) {
    if (scene.background instanceof THREE.Texture) {
      scene.background.dispose()
      scene.background = null
    }
    disposeObject3D(scene)
  }

  smokeStreams.length = 0
  circulationDirectionArrows.length = 0
  singleCellArrowMaterials.length = 0

  renderer?.renderLists.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  earthGroup = null
  earthMesh = null
  earthWireframe = null
  singleCellRoot = null
  threeCellRoot = null
  circulationLineGroups = null
  circulationAirflowGroups = null
  singleCellAirflowGroup = null
  latLineGroup = null
})
</script>
<style scoped>
.climate-label { border: 1px solid currentColor; }
.climate-contour-label { font-size: 9px !important; padding: 1px 3px !important; background: #06122199 !important; border: none !important; }
.pressure-key { display: grid; gap: 6px; margin-top: 10px; font-size: 11px; color: #bcd3e7; }
.pressure-key-colors { display: flex; overflow: hidden; border-radius: 3px; }
.pressure-key-colors span { flex: 1; padding: 5px 2px; font-size: 10px; color: white; text-shadow: 0 1px 3px #000; text-align: center; }
.pressure-key small { font-size: 10px; }

/* 季节切换标签 */
.page-subtitle {
  font-size: 14px;
  color: #64748b;
  font-weight: 400;
  margin-left: 10px;
  letter-spacing: 1px;
}

.replay-btn {
  background: linear-gradient(135deg, #2ec4b6, #247cff) !important;
  color: #fff !important;
  font-weight: 600;
}

/* 模式按钮 */
.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mode-option-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.5);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
}

.mode-option-btn:hover {
  border-color: #2ec4b6;
  color: #cbd5e1;
}

.mode-option-btn.active {
  border-color: #2ec4b6;
  background: rgba(46, 196, 182, 0.12);
  color: #2ec4b6;
}

.mode-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

/* 阶段导航 */
.stage-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 10px 14px;
  background: rgba(8, 12, 28, 0.6);
  border-bottom: 1px solid rgba(46, 196, 182, 0.12);
}

.stage-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(8, 12, 28, 0.5);
  transition: all 0.2s;
}

.stage-nav-item:hover {
  background: rgba(46, 196, 182, 0.12);
}

.stage-nav-item.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  box-shadow: 0 2px 8px rgba(46, 196, 182, 0.3);
}

.stage-nav-item.done {
  border: 1px solid rgba(46, 196, 182, 0.3);
}

.stage-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(46, 196, 182, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.stage-nav-item.active .stage-num {
  background: rgba(255, 255, 255, 0.25);
}

.stage-name {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
}

.stage-nav-item.active .stage-name {
  color: #fff;
}

/* 阶段卡片 */
.stage-card {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.08), rgba(36, 124, 255, 0.08)) !important;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.stage-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
}

.stage-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.7;
  margin: 0 0 12px;
}

.stage-points {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.step-point {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(8, 12, 28, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.step-point:hover {
  background: rgba(46, 196, 182, 0.1);
}

.step-point.done {
  background: rgba(46, 196, 182, 0.18);
  border-color: rgba(46, 196, 182, 0.4);
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(46, 196, 182, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #2ec4b6;
  flex-shrink: 0;
}

.step-point.done .step-num {
  background: #2ec4b6;
  color: #fff;
}

.step-text {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
}

.stage-nav-buttons {
  display: flex;
  gap: 8px;
}

.stage-nav-buttons .theme-btn {
  flex: 1;
}

.stage-nav-buttons .theme-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.season-tab {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  background: rgba(8, 12, 28, 0.6);
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.season-tab:hover {
  border-color: #2ec4b6;
  color: #cbd5e1;
}

.season-tab.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  color: #fff;
  border-color: transparent;
}

/* HTML 标签覆盖层 */
.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  background: rgba(8, 12, 28, 0.9);
  padding: 3px 8px;
  border-radius: 6px;
  border: 2px solid;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
}

.scene-label.label-low {
  color: #d4caff;
  border-color: rgba(198, 184, 255, 0.66);
  box-shadow: 0 0 14px rgba(198, 184, 255, 0.16);
}

.scene-label.label-high {
  color: #b7f4e4;
  border-color: rgba(166, 234, 216, 0.66);
  box-shadow: 0 0 14px rgba(166, 234, 216, 0.16);
}

.scene-label.label-trade {
  color: #2ed9c3;
  border-color: rgba(46, 217, 195, 0.70);
  box-shadow: 0 0 14px rgba(46, 217, 195, 0.20);
}

.scene-label.label-westerly {
  color: #ffb84d;
  border-color: rgba(255, 184, 77, 0.70);
  box-shadow: 0 0 14px rgba(255, 184, 77, 0.20);
}

.scene-label.label-polar {
  color: #75a7ff;
  border-color: rgba(117, 167, 255, 0.72);
  box-shadow: 0 0 14px rgba(117, 167, 255, 0.22);
}

.scene-label.label-cell-hadley {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.7);
  font-size: 14px;
}

.scene-label.label-cell-ferrel {
  color: #2ec4b6;
  border-color: rgba(46, 196, 182, 0.7);
  font-size: 14px;
}

.scene-label.label-cell-polar {
  color: #247cff;
  border-color: rgba(36, 124, 255, 0.7);
  font-size: 14px;
}

/* 知识点卡片 */
.knowledge-card {
  margin-bottom: 14px;
}

.kp-content {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.8;
}

.kp-content :deep(strong) {
  color: #fbbf24;
}

/* 风带列表 */
.wind-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wind-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: rgba(8, 12, 28, 0.4);
}

.wind-icon {
  font-size: 16px;
}

.wind-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.wind-name {
  font-size: 13px;
  color: #cbd5e1;
}

.wind-range {
  font-size: 11px;
  color: #64748b;
}

.wind-dir {
  font-size: 11px;
  color: #2ec4b6;
  font-weight: 600;
}

.wind-item.pressure-low .wind-icon {
  color: #c6b8ff;
}

.wind-item.pressure-high .wind-icon {
  color: #a6ead8;
}

/* 图例 */
.legend-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-ribbon {
  width: 20px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 999px;
  background:
    linear-gradient(90deg,
      rgba(46, 196, 182, 0.12),
      rgba(126, 249, 238, 0.95),
      rgba(36, 124, 255, 0.18));
  box-shadow:
    0 0 8px rgba(46, 196, 182, 0.65);
  transform:
    skewX(-18deg);
}

/* 时间轴文案 */
.timeline-copy strong {
  color: #2ec4b6;
}

/* ===================== v2: 面板拖拽上限 + 右侧卡片边距 + 顶部按钮修正 =====================
   - 普通 1920 不再拥有 2200+ 的最大拖拽宽度；
   - 右侧教学流程卡片增加外边距，避免贴着面板边；
   - 顶部“从头演示”按钮增加 min-width 和 padding，文字不再挤满按钮。
*/
.general-atmospheric-circulation-container .resize-handle {
  touch-action:
    none;
}

body.geo-panel-resizing {
  cursor:
    col-resize !important;
  user-select:
    none !important;
}

/* 顶部按钮区域 */
.general-atmospheric-circulation-container .toolbar-actions {
  gap:
    clamp(8px, 0.8vw, 14px) !important;
  align-items:
    center;
}

.general-atmospheric-circulation-container .replay-btn {
  display:
    inline-flex !important;
  align-items:
    center;
  justify-content:
    center;
  gap:
    7px;
  width:
    auto !important;
  min-width:
    126px !important;
  max-width:
    none !important;
  padding:
    0 18px !important;
  white-space:
    nowrap !important;
  flex:
    0 0 auto !important;
  line-height:
    1 !important;
}

.general-atmospheric-circulation-container .replay-icon {
  flex:
    0 0 auto;
  font-size:
    13px;
}

.general-atmospheric-circulation-container .replay-text {
  flex:
    0 0 auto;
  letter-spacing:
    0.02em;
}

.general-atmospheric-circulation-container .panel-toolbar-btn {
  min-width:
    96px !important;
  padding-inline:
    14px !important;
  white-space:
    nowrap !important;
}

/* 右侧教学流程：卡片不要贴边 */
.general-atmospheric-circulation-container .right-panel .panel-scroll {
  padding-bottom:
    clamp(18px, 2vh, 28px);
}

.general-atmospheric-circulation-container .right-panel .stage-nav {
  margin:
    10px clamp(12px, 1vw, 18px) 12px !important;
  border-radius:
    14px;
  border:
    1px solid rgba(46, 196, 182, 0.12);
  overflow:
    hidden;
}

.general-atmospheric-circulation-container .right-panel .stage-card,
.general-atmospheric-circulation-container .right-panel .knowledge-card {
  margin:
    0 clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) !important;
}

.general-atmospheric-circulation-container .right-panel .stage-card {
  padding:
    clamp(14px, 1vw, 18px) !important;
}

.general-atmospheric-circulation-container .right-panel .knowledge-card {
  padding:
    clamp(14px, 1vw, 18px) !important;
}

.general-atmospheric-circulation-container .stage-nav-buttons {
  gap:
    10px !important;
  margin-top:
    14px;
}

.general-atmospheric-circulation-container .stage-nav-buttons .theme-btn {
  min-width:
    0;
  min-height:
    36px;
  padding-inline:
    12px !important;
  white-space:
    nowrap;
}

/* 中小屏按钮继续收敛，但不挤字 */
@media (max-width: 1280px) {
  .general-atmospheric-circulation-container .replay-btn {
    min-width:
      118px !important;
    padding:
      0 16px !important;
  }

  .general-atmospheric-circulation-container .right-panel .stage-nav,
  .general-atmospheric-circulation-container .right-panel .stage-card,
  .general-atmospheric-circulation-container .right-panel .knowledge-card {
    margin-left:
      12px !important;
    margin-right:
      12px !important;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .toolbar-actions {
    gap:
      6px !important;
  }

  .general-atmospheric-circulation-container .replay-btn {
    min-width:
      108px !important;
    padding:
      0 12px !important;
  }

  .general-atmospheric-circulation-container .replay-text {
    font-size:
      12px;
  }

  .general-atmospheric-circulation-container .panel-toolbar-btn {
    min-width:
      86px !important;
  }
}


/* ===================== v3: 右上角从头演示按钮不被压缩 =====================
   v2 只设置了 min-width，但 1920 下仍然会被公共 toolbar / flex 规则压缩。
   这版把“从头演示”固定为独立胶囊按钮：
   - flex: 0 0 148px，不参与压缩；
   - width / min-width / max-width 同步；
   - height / min-height 固定；
   - 文本 nowrap，不让内容挤满按钮。
*/
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions {
  display:
    flex !important;
  align-items:
    center !important;
  justify-content:
    flex-end !important;
  gap:
    14px !important;
  min-width:
    max-content !important;
  flex:
    0 0 auto !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.theme-btn.primary {
  display:
    inline-flex !important;
  align-items:
    center !important;
  justify-content:
    center !important;
  gap:
    8px !important;
  flex:
    0 0 148px !important;
  width:
    148px !important;
  min-width:
    148px !important;
  max-width:
    148px !important;
  height:
    34px !important;
  min-height:
    34px !important;
  max-height:
    34px !important;
  padding:
    0 18px !important;
  box-sizing:
    border-box !important;
  border-radius:
    999px !important;
  white-space:
    nowrap !important;
  overflow:
    visible !important;
  line-height:
    1 !important;
  font-size:
    14px !important;
  font-weight:
    700 !important;
  letter-spacing:
    0.02em !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn .replay-icon {
  display:
    inline-flex;
  align-items:
    center;
  justify-content:
    center;
  flex:
    0 0 auto;
  width:
    14px;
  font-size:
    13px;
  line-height:
    1;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn .replay-text {
  display:
    inline-block;
  flex:
    0 0 auto;
  min-width:
    max-content;
  white-space:
    nowrap;
  line-height:
    1;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .panel-toolbar-btn {
  flex:
    0 0 104px !important;
  width:
    104px !important;
  min-width:
    104px !important;
  max-width:
    104px !important;
  height:
    34px !important;
  min-height:
    34px !important;
  padding:
    0 14px !important;
  box-sizing:
    border-box !important;
  white-space:
    nowrap !important;
}

/* 1920 普通屏保持正常胶囊尺寸，不走更小按钮 */
@media (min-width: 1440px) {
  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.theme-btn.primary {
    flex-basis:
      148px !important;
    width:
      148px !important;
    min-width:
      148px !important;
    max-width:
      148px !important;
    height:
      34px !important;
  }
}

/* 只有真正窄屏才略微收窄，但仍然不压文字 */
@media (max-width: 760px) {
  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions {
    gap:
      8px !important;
  }

  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.theme-btn.primary {
    flex-basis:
      128px !important;
    width:
      128px !important;
    min-width:
      128px !important;
    max-width:
      128px !important;
    height:
      32px !important;
    min-height:
      32px !important;
    padding:
      0 12px !important;
    font-size:
      13px !important;
  }

  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .panel-toolbar-btn {
    flex-basis:
      92px !important;
    width:
      92px !important;
    min-width:
      92px !important;
    max-width:
      92px !important;
    height:
      32px !important;
    min-height:
      32px !important;
  }
}


/* 季节月份控制 */
.season-control {
  margin-top: 10px;
  padding: 10px 12px 8px;
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 10px;
  background: rgba(8, 12, 28, 0.48);
}

.season-control-head,
.season-month-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.season-control-head {
  margin-bottom: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.season-control-head strong {
  color: #2ec4b6;
  font-size: 13px;
}

.season-month-row {
  margin-top: -2px;
  font-size: 10px;
  color: #64748b;
}

.season-month-row span:nth-child(2) {
  color: #94a3b8;
}

/* 完整图例符号 */
.legend-band {
  width: 16px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.8;
}

/* 上升、下沉和单圈标签 */
.scene-label.label-vertical-up {
  color: #ffb347;
  border-color: rgba(255, 136, 0, 0.72);
}

.scene-label.label-vertical-down {
  color: #73cfff;
  border-color: rgba(91, 192, 255, 0.78);
  box-shadow: 0 0 14px rgba(91, 192, 255, 0.18);
}

.scene-label.label-vertical-up {
  box-shadow: 0 0 14px rgba(255, 178, 74, 0.18);
}

.scene-label.label-single {
  color: #c4b5fd;
  border-color: rgba(167, 139, 250, 0.78);
  font-size: 13px;
}

/* 风带列表颜色 */
.wind-item.trade {
  border-color: rgba(239, 68, 68, 0.18);
}

.wind-item.westerly {
  border-color: rgba(185, 28, 28, 0.2);
}

.wind-item.polar {
  border-color: rgba(251, 191, 36, 0.18);
}


.timeline-subhint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-style: normal;
  color: #8fd7ff;
  opacity: 0.9;
}

.speed-options {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.view-btn {
  min-width: 96px;
}

.legend-ribbon {
  width: 20px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 177, 90, 0.95), rgba(143, 215, 255, 0.9));
  box-shadow: 0 0 10px rgba(143, 215, 255, 0.45);
  flex-shrink: 0;
}


/* ===================== v11：底部排版与平板适配 ===================== */
.general-atmospheric-circulation-container .timeline-dock {
  display: grid !important;
  grid-template-columns: auto minmax(260px, 1fr) auto !important;
  align-items: center !important;
  gap: 14px !important;
  width: min(94%, 1180px) !important;
  min-height: 76px !important;
  padding: 10px 16px !important;
  box-sizing: border-box !important;
}

.general-atmospheric-circulation-container .timeline-main {
  min-width: 0 !important;
}

.general-atmospheric-circulation-container .timeline-copy {
  display: grid !important;
  grid-template-columns: max-content minmax(0, 1fr) !important;
  column-gap: 12px !important;
  row-gap: 4px !important;
  align-items: center !important;
  min-width: 0 !important;
}

.general-atmospheric-circulation-container .timeline-copy>span {
  white-space: nowrap !important;
}

.general-atmospheric-circulation-container .timeline-copy>strong {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.general-atmospheric-circulation-container .timeline-subhint {
  grid-column: 1 / -1 !important;
  margin-top: 0 !important;
  line-height: 1.35 !important;
  white-space: normal !important;
}

.general-atmospheric-circulation-container .speed-options {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 7px !important;
  justify-content: flex-end !important;
  min-width: max-content !important;
}

.general-atmospheric-circulation-container .view-btn {
  min-width: 92px !important;
  white-space: nowrap !important;
}

.general-atmospheric-circulation-container .three-host,
.general-atmospheric-circulation-container .three-canvas {
  touch-action: none !important;
}

@media (max-width: 1180px) {
  .general-atmospheric-circulation-container .timeline-dock {
    grid-template-columns: auto minmax(0, 1fr) !important;
    grid-template-areas:
      "play copy"
      "speed speed" !important;
    gap: 8px 12px !important;
    width: calc(100% - 24px) !important;
    min-height: 108px !important;
    padding: 10px 14px !important;
  }

  .general-atmospheric-circulation-container .timeline-icon-btn {
    grid-area: play !important;
  }

  .general-atmospheric-circulation-container .timeline-main {
    grid-area: copy !important;
  }

  .general-atmospheric-circulation-container .speed-options {
    grid-area: speed !important;
    justify-content: center !important;
    min-width: 0 !important;
    width: 100% !important;
  }

  .general-atmospheric-circulation-container .timeline-copy {
    grid-template-columns: 1fr !important;
    row-gap: 2px !important;
  }

  .general-atmospheric-circulation-container .timeline-copy>strong {
    white-space: normal !important;
    line-height: 1.35 !important;
    overflow: visible !important;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .timeline-dock {
    width: calc(100% - 16px) !important;
    min-height: 118px !important;
    padding: 9px 10px !important;
    border-radius: 14px !important;
  }

  .general-atmospheric-circulation-container .speed-options {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 5px !important;
  }

  .general-atmospheric-circulation-container .speed-btn,
  .general-atmospheric-circulation-container .view-btn {
    width: 100% !important;
    min-width: 0 !important;
    padding-inline: 6px !important;
    font-size: 11px !important;
  }

  .general-atmospheric-circulation-container .timeline-subhint {
    font-size: 10px !important;
  }
}


.season-stage-card {
  margin: 0 clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) !important;
  padding: clamp(14px, 1vw, 18px) !important;
  background: linear-gradient(135deg, rgba(255, 184, 77, 0.08), rgba(36, 124, 255, 0.08)) !important;
}

.season-stage-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.season-stage-head .section-title {
  margin-bottom: 5px;
}

.season-stage-head p {
  margin: 0;
  color: #8ea2b8;
  font-size: 12px;
  line-height: 1.55;
}

.season-stage-head>strong {
  flex: 0 0 auto;
  min-width: 52px;
  padding: 5px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 184, 77, 0.22), rgba(36, 124, 255, 0.20));
  border: 1px solid rgba(255, 205, 116, 0.30);
  color: #ffd27d;
  text-align: center;
  font-size: 13px;
}

.season-stage-month-row {
  margin-top: 4px;
}

@media (max-width: 900px) {
  .season-stage-card {
    margin-left: 10px !important;
    margin-right: 10px !important;
  }

  .season-stage-head {
    align-items: center;
  }

  .season-stage-head p {
    font-size: 11px;
  }
}


.switch-row.is-stage-disabled {
  opacity: 0.42;
  filter: saturate(0.45);
}

.switch-row.is-stage-disabled .control-copy strong::after {
  content: '（当前阶段不可用）';
  margin-left: 5px;
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
}

.monsoon-legend-ribbon {
  background: linear-gradient(90deg, #ff3158, #a84fff, #8be76d) !important;
  box-shadow: 0 0 9px rgba(168, 79, 255, 0.42) !important;
}


/* ===================== v21：右侧视角按钮与中小屏教学排版 ===================== */
.general-atmospheric-circulation-container .stage-view-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px clamp(12px, 1vw, 18px) 2px;
}

.general-atmospheric-circulation-container .stage-view-btn {
  min-width: 128px;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(46, 196, 182, 0.32);
  background: rgba(8, 20, 34, 0.72);
  color: #b8d9e8;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .stage-view-btn:hover,
.general-atmospheric-circulation-container .stage-view-btn.active {
  border-color: rgba(46, 196, 182, 0.9);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.92), rgba(36, 124, 255, 0.92));
  color: #fff;
  box-shadow: 0 5px 16px rgba(36, 124, 255, 0.22);
}

.general-atmospheric-circulation-container.layout-medium .stage-nav {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 10px 12px;
}

.general-atmospheric-circulation-container.layout-medium .stage-nav-item {
  min-height: 38px;
  flex-direction: row;
  justify-content: flex-start;
  gap: 7px;
  padding: 7px 9px;
}

.general-atmospheric-circulation-container.layout-medium .stage-name {
  font-size: 11px;
  line-height: 1.25;
  text-align: left;
}

.general-atmospheric-circulation-container.layout-medium .stage-header,
.general-atmospheric-circulation-container.layout-small .stage-header {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: start;
  gap: 7px 9px;
}

.general-atmospheric-circulation-container.layout-medium .stage-header .section-title,
.general-atmospheric-circulation-container.layout-small .stage-header .section-title {
  min-width: 0;
  margin: 0;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.general-atmospheric-circulation-container.layout-medium .stage-card .stage-desc,
.general-atmospheric-circulation-container.layout-small .stage-card .stage-desc {
  line-height: 1.55;
  margin-bottom: 10px;
}

.general-atmospheric-circulation-container.layout-small .stage-view-toolbar {
  padding: 7px 10px 2px;
}

.general-atmospheric-circulation-container.layout-small .stage-view-btn {
  min-width: 116px;
  min-height: 32px;
  padding-inline: 10px;
  font-size: 12px;
}

.general-atmospheric-circulation-container.layout-small .stage-nav {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 9px 10px;
}

.general-atmospheric-circulation-container.layout-small .stage-nav-item {
  min-height: 38px;
  flex-direction: row;
  justify-content: flex-start;
  gap: 7px;
  padding: 7px 9px;
}

.general-atmospheric-circulation-container.layout-small .stage-num {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  font-size: 12px;
}

.general-atmospheric-circulation-container.layout-small .stage-name {
  font-size: 10.5px;
  line-height: 1.2;
  text-align: left;
}

.general-atmospheric-circulation-container.layout-small .stage-card {
  padding: 12px !important;
}

.general-atmospheric-circulation-container.layout-small .stage-badge {
  padding: 2px 8px;
  font-size: 10px;
}

.general-atmospheric-circulation-container.layout-small .stage-header .section-title {
  font-size: 14px;
}


/* ===================== v23：演示时长、Header视角按钮与环流标签绑定 ===================== */
.general-atmospheric-circulation-container .circulation-view-header-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  min-width: 104px !important;
  padding-inline: 14px !important;
  white-space: nowrap !important;
  flex: 0 0 auto !important;
}

.general-atmospheric-circulation-container .circulation-view-header-btn.active {
  border-color: rgba(46, 196, 182, 0.72) !important;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.28), rgba(36, 124, 255, 0.28)) !important;
}

.general-atmospheric-circulation-container .circulation-view-header-btn.gradient-active {
  color: #ffffff !important;
  border-color: transparent !important;
  background: linear-gradient(135deg, #2ec4b6 0%, #247cff 100%) !important;
  box-shadow: 0 8px 24px rgba(36, 124, 255, 0.24) !important;
}

.general-atmospheric-circulation-container .circulation-view-icon {
  font-size: 14px;
  line-height: 1;
}

.general-atmospheric-circulation-container .timeline-dock {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  width: min(92%, 760px) !important;
  min-height: 62px !important;
  padding: 9px 14px !important;
}

.general-atmospheric-circulation-container .timeline-title {
  flex: 0 0 auto;
  color: #e8ffff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .timeline-spacer {
  flex: 1 1 auto;
  min-width: 12px;
}

.general-atmospheric-circulation-container .speed-control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.general-atmospheric-circulation-container .speed-control-label {
  flex: 0 0 auto;
  color: #9fd8e8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .speed-options {
  display: flex !important;
  flex-wrap: nowrap !important;
  justify-content: flex-end !important;
  min-width: 0 !important;
}

@media (max-width: 1180px) {
  .general-atmospheric-circulation-container .circulation-view-header-btn {
    min-width: 94px !important;
    padding-inline: 10px !important;
  }

  .general-atmospheric-circulation-container .timeline-dock {
    display: flex !important;
    width: calc(100% - 24px) !important;
    min-height: 60px !important;
    padding: 8px 12px !important;
  }

  .general-atmospheric-circulation-container .timeline-title {
    font-size: 13px;
  }

  .general-atmospheric-circulation-container .speed-control-group {
    gap: 7px;
  }

  .general-atmospheric-circulation-container .speed-options {
    width: auto !important;
    justify-content: flex-end !important;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .circulation-view-header-btn {
    min-width: 82px !important;
    padding-inline: 7px !important;
    gap: 4px !important;
    font-size: 11px !important;
  }

  .general-atmospheric-circulation-container .circulation-view-icon {
    font-size: 12px;
  }

  .general-atmospheric-circulation-container .timeline-dock {
    display: flex !important;
    width: calc(100% - 16px) !important;
    min-height: 58px !important;
    padding: 8px 9px !important;
    gap: 7px !important;
  }

  .general-atmospheric-circulation-container .timeline-title {
    font-size: 11px;
    letter-spacing: 0;
  }

  .general-atmospheric-circulation-container .speed-control-group {
    gap: 5px;
  }

  .general-atmospheric-circulation-container .speed-control-label {
    font-size: 10px;
  }

  .general-atmospheric-circulation-container .speed-options {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(42px, 1fr)) !important;
    width: min(230px, calc(100% - 52px)) !important;
    gap: 5px !important;
  }
}



/* ===================== v30：Header 三个操作按钮统一 ===================== */
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  flex: 0 0 118px !important;
  width: 118px !important;
  min-width: 118px !important;
  max-width: 118px !important;
  height: 34px !important;
  min-height: 34px !important;
  max-height: 34px !important;
  padding: 0 14px !important;
  box-sizing: border-box !important;
  border: 1px solid rgba(116, 234, 229, 0.24) !important;
  border-radius: 8px !important;
  background: rgba(8, 20, 34, 0.64) !important;
  color: rgba(234, 255, 255, 0.92) !important;
  box-shadow: none !important;
  white-space: nowrap !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  letter-spacing: 0.01em !important;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn:hover {
  border-color: rgba(46, 196, 182, 0.62) !important;
  background: rgba(22, 54, 69, 0.76) !important;
  color: #ffffff !important;
  box-shadow: none !important;
  transform: none !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn:active {
  border-color: rgba(46, 196, 182, 0.78) !important;
  background: rgba(24, 66, 78, 0.82) !important;
  box-shadow: none !important;
  transform: none !important;
}

/* 自动演示开启时使用主题渐变，关闭后恢复统一按钮样式。 */
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.auto-demo-active {
  border-color: transparent !important;
  background: linear-gradient(135deg, #2ec4b6 0%, #247cff 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 22px rgba(36, 124, 255, 0.24) !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-btn.auto-demo-active:hover {
  border-color: transparent !important;
  background: linear-gradient(135deg, #35d5c6 0%, #378cff 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 8px 22px rgba(36, 124, 255, 0.30) !important;
}

/* 展开/恢复只切换文案，不保留激活渐变状态。 */
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-header-btn,
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-header-btn.active,
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-header-btn.gradient-active {
  border-color: rgba(116, 234, 229, 0.24) !important;
  background: rgba(8, 20, 34, 0.64) !important;
  color: rgba(234, 255, 255, 0.92) !important;
  box-shadow: none !important;
}

.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .replay-icon,
.general-atmospheric-circulation-container .top-toolbar .toolbar-actions .circulation-view-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 14px !important;
  flex: 0 0 14px !important;
  font-size: 13px !important;
  line-height: 1 !important;
}

@media (max-width: 900px) {
  .general-atmospheric-circulation-container .top-toolbar .toolbar-actions .header-action-btn {
    flex-basis: 104px !important;
    width: 104px !important;
    min-width: 104px !important;
    max-width: 104px !important;
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
    padding: 0 10px !important;
    font-size: 12px !important;
  }
}



/* 中小屏：进一步缩小地球场景中的 HTML 文字标签，减少遮挡 */
.general-atmospheric-circulation-container.layout-medium .scene-label {
  font-size: 10px !important;
  padding: 3px 8px !important;
  border-width: 1.25px !important;
  border-radius: 4px !important;
}

.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-hadley,
.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-ferrel,
.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-polar {
  font-size: 11px !important;
}

.general-atmospheric-circulation-container.layout-small .scene-label {
  font-size: 9px !important;
  padding: 2px 6px !important;
  border-width: 1px !important;
  border-radius: 3px !important;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.58) !important;
}

.general-atmospheric-circulation-container.layout-small .scene-label.label-cell-hadley,
.general-atmospheric-circulation-container.layout-small .scene-label.label-cell-ferrel,
.general-atmospheric-circulation-container.layout-small .scene-label.label-cell-polar {
  font-size: 10px !important;
}

/* ===================== v8：面板与窗口缩放防闪烁 ===================== */
/*
 * 拖拽或浏览器缩放期间关闭布局 transition。
 * 否则 grid 列宽会持续追赶指针，ResizeObserver 也会重复触发。
 */
.general-atmospheric-circulation-container .workspace.panel-resizing,
.general-atmospheric-circulation-container .workspace.layout-resizing,
.general-atmospheric-circulation-container .workspace.panel-resizing .side-panel,
.general-atmospheric-circulation-container .workspace.layout-resizing .side-panel,
.general-atmospheric-circulation-container .workspace.panel-resizing .center-stage,
.general-atmospheric-circulation-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.general-atmospheric-circulation-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* ===================== 右侧悬浮卡与代表月份 ===================== */
.general-atmospheric-circulation-container .floating-feature-card {
  max-width: calc(100vw - 20px);
  max-height: calc(100dvh - 154px);
}

.general-atmospheric-circulation-container .layer-feature-card {
  max-height: min(72dvh, 760px);
}

.general-atmospheric-circulation-container .floating-teaching-content,
.general-atmospheric-circulation-container .floating-layer-content {
  display: grid;
  gap: 12px;
  box-sizing: border-box;
  padding: 12px 14px 8px;
}

.general-atmospheric-circulation-container .floating-layer-content .control-section {
  width: 100%;
  margin: 0;
  box-sizing: border-box;
}

.general-atmospheric-circulation-container .floating-layer-content .section-title {
  color: #e9f8ff;
}

.general-atmospheric-circulation-container .floating-layer-content .switch-row {
  min-height: 40px;
}

.general-atmospheric-circulation-container .floating-layer-content .control-copy strong {
  color: #cce8f5;
}

.general-atmospheric-circulation-container .floating-stage-nav {
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 10px;
  overflow: visible;
  background: transparent;
}

.general-atmospheric-circulation-container .floating-stage-nav .stage-nav-item,
.general-atmospheric-circulation-container .floating-stage-card .step-point {
  border: 1px solid transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

.general-atmospheric-circulation-container .floating-stage-nav .stage-nav-item {
  min-width: 0;
}

.general-atmospheric-circulation-container .floating-stage-card {
  min-width: 0;
  padding: 2px 0 8px;
}

.general-atmospheric-circulation-container .floating-stage-card .stage-header {
  align-items: flex-start;
}

.general-atmospheric-circulation-container .floating-stage-card .section-title {
  min-width: 0;
  margin: 0;
  line-height: 1.35;
}

.general-atmospheric-circulation-container .floating-stage-card .step-point {
  width: 100%;
}

.general-atmospheric-circulation-container .timeline-dock {
  width: min(96%, 1040px) !important;
}

.general-atmospheric-circulation-container .month-control-group,
.general-atmospheric-circulation-container .month-options {
  display: flex;
  align-items: center;
}

.general-atmospheric-circulation-container .month-control-group {
  flex: 0 0 auto;
  gap: 9px;
  padding-right: 12px;
  border-right: 1px solid rgba(112, 205, 236, 0.18);
}

.general-atmospheric-circulation-container .month-control-label {
  color: #9fd8e8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .month-options {
  gap: 6px;
}

.general-atmospheric-circulation-container .month-btn {
  min-width: 52px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(96, 205, 239, 0.26);
  border-radius: 9px;
  color: #b8d9e8;
  background: rgba(6, 27, 45, 0.72);
}

.general-atmospheric-circulation-container .month-btn.active:not(:disabled) {
  border-color: rgba(116, 230, 255, 0.86);
  color: #fff;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  box-shadow: 0 5px 16px rgba(36, 124, 255, 0.24);
}

.general-atmospheric-circulation-container .month-control-group.disabled {
  opacity: 0.38;
}

.general-atmospheric-circulation-container .month-btn:disabled {
  cursor: not-allowed;
}

/* 左下角常驻图例不参与悬浮面板系统，只解释当前画面中实际存在的视觉编码。 */
.general-atmospheric-circulation-container .corner-legend {
  position: fixed;
  left: clamp(18px, 2vw, 34px);
  bottom: clamp(118px, 13vh, 170px);
  z-index: 38;
  width: min(270px, calc(100vw - 36px));
  max-height: min(44vh, 470px);
  padding: 10px 14px 12px;
  box-sizing: border-box;
  overflow: auto;
  color: #d7eef8;
  border: 0;
  border-left: 2px solid rgba(91, 220, 248, 0.72);
  border-radius: 0 10px 10px 0;
  background: linear-gradient(90deg, rgba(2, 17, 32, 0.84), rgba(3, 20, 36, 0.52) 72%, rgba(3, 20, 36, 0.12));
  box-shadow: 10px 12px 30px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px) saturate(125%);
  scrollbar-width: thin;
  scrollbar-color: rgba(74, 216, 240, 0.64) transparent;
}

.general-atmospheric-circulation-container .corner-legend-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.general-atmospheric-circulation-container .corner-legend-heading strong {
  color: #71e4f4;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.general-atmospheric-circulation-container .corner-legend-heading span {
  overflow: hidden;
  color: rgba(190, 220, 233, 0.68);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .legend-groups {
  display: grid;
  gap: 10px;
}

.general-atmospheric-circulation-container .corner-legend .legend-groups {
  gap: 5px;
}

.general-atmospheric-circulation-container .corner-legend .legend-group {
  padding: 5px 0 7px;
  border: 0;
  border-bottom: 1px solid rgba(109, 207, 236, 0.12);
  border-radius: 0;
  background: transparent;
}

.general-atmospheric-circulation-container .corner-legend .legend-group:last-child {
  border-bottom: 0;
}

.general-atmospheric-circulation-container .corner-legend .legend-group-title {
  margin-bottom: 4px;
}

.general-atmospheric-circulation-container .corner-legend .legend-group .legend-list {
  gap: 2px;
}

.general-atmospheric-circulation-container .corner-legend .legend-group .legend-item {
  min-height: 21px;
  padding: 2px 4px;
  background: transparent;
}

.general-atmospheric-circulation-container .legend-group {
  padding: 9px;
  border: 1px solid rgba(109, 207, 236, 0.13);
  border-radius: 9px;
  background: linear-gradient(145deg, rgba(12, 36, 57, 0.72), rgba(5, 20, 37, 0.46));
}

.general-atmospheric-circulation-container .legend-group-title {
  margin-bottom: 7px;
  color: #74ddec;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.general-atmospheric-circulation-container .legend-group .legend-list {
  display: grid;
  gap: 5px;
}

.general-atmospheric-circulation-container .legend-group .legend-item {
  min-height: 25px;
  padding: 3px 6px;
  border-radius: 6px;
  color: #c0d4df;
  font-size: 11px;
  background: rgba(5, 18, 32, 0.34);
}

.general-atmospheric-circulation-container .legend-symbol {
  display: inline-block;
  flex: 0 0 auto;
}

.general-atmospheric-circulation-container .legend-symbol.legend-high,
.general-atmospheric-circulation-container .legend-symbol.legend-low {
  width: 26px;
  text-align: center;
  font: 600 15px/16px Arial, sans-serif;
}

.general-atmospheric-circulation-container .legend-symbol.legend-line {
  width: 24px;
  height: 2px;
  border-radius: 999px;
}

.general-atmospheric-circulation-container .legend-symbol.legend-band {
  width: 24px;
  height: 9px;
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 3px;
  opacity: 1;
}

.general-atmospheric-circulation-container .legend-symbol.legend-arrow {
  width: 26px;
  height: 12px;
  border: 0;
  clip-path: polygon(0 34%, 64% 34%, 64% 0, 100% 50%, 64% 100%, 64% 66%, 0 66%);
}

@media (max-width: 1180px) {
  .general-atmospheric-circulation-container .corner-legend {
    left: 12px;
    bottom: 132px;
    width: min(238px, calc(100vw - 24px));
    max-height: 34vh;
  }

  .general-atmospheric-circulation-container .timeline-dock {
    flex-wrap: wrap;
    justify-content: center;
    width: calc(100% - 24px) !important;
    min-height: 104px !important;
  }

  .general-atmospheric-circulation-container .timeline-spacer {
    display: none;
  }
}

@media (max-width: 760px) {
  .general-atmospheric-circulation-container .timeline-dock {
    min-height: 148px !important;
  }

  .general-atmospheric-circulation-container .month-control-group {
    padding-right: 0;
    border-right: 0;
  }

  .general-atmospheric-circulation-container .month-control-label,
  .general-atmospheric-circulation-container .speed-control-label {
    display: none;
  }
}
</style>
