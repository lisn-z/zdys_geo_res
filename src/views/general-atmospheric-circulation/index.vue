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
            <div v-for="(l, i) in labelScreenData" :key="l.id ?? i" v-show="l.visible" class="scene-label"
              :class="l.cls" :style="{ left: l.x + 'px', top: l.y + 'px', color: l.color, opacity: l.opacity }">{{
                l.text }}</div>
            <svg class="latitude-label-leaders" aria-hidden="true">
              <path v-for="l in latitudeScreenData" :key="l.id" v-show="l.visible"
                :d="`M ${l.x + 3} ${l.y} L ${l.anchorX} ${l.anchorY}`" :stroke="l.color" />
            </svg>
            <div v-for="l in latitudeScreenData" :key="l.id" v-show="l.visible" class="latitude-reference-label"
              :style="{ left: l.x + 'px', top: l.y + 'px', color: l.color }">{{ l.text }}</div>
            <SolarRayIndicator v-bind="solarScreenData" />
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
          <div v-if="currentStage === 2" class="month-control-group season-point-controls">
            <span class="month-control-label">二分二至</span>
            <div class="month-options" role="group" aria-label="选择二分二至">
              <button v-for="point in seasonPoints" :key="point.id" type="button" class="theme-btn month-btn"
                :class="{ active: seasonPoint === point.id }" :aria-pressed="seasonPoint === point.id"
                @click="setSeasonPoint(point.id)">{{ point.label }}</button>
            </div>
          </div>
          <div v-else class="month-control-group" :class="{ disabled: currentStage !== 3 }">
            <span class="month-control-label">代表月份</span>
            <div class="month-options" role="group" aria-label="选择季节代表月份">
              <button type="button" class="theme-btn month-btn" :class="{ active: !neutralSeason && month === 0 }"
                :disabled="currentStage !== 3" @click="setRepresentativeMonth(0)">1月</button>
              <button type="button" class="theme-btn month-btn" :class="{ active: !neutralSeason && month === 6 }"
                :disabled="currentStage !== 3" @click="setRepresentativeMonth(6)">7月</button>
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

    <section v-if="visibleLegendGroups.length" class="corner-legend"
      :class="{ 'has-pressure-key': currentStage === 3 && layers.regionalPressureCenters }" aria-label="当前图例">
      <div class="corner-legend-heading">
        <strong>当前图例</strong>
        <span>{{ currentStageData?.shortName ?? '' }}</span>
      </div>
      <p class="circulation-model-note" v-if="currentStage < 2">环流路径示意 · 大气厚度已夸大</p>
      <p class="circulation-model-note" v-if="layers.windForces">{{ windForceDescription }}</p>
      <div class="corner-legend-body">
        <div class="legend-groups">
          <div v-for="group in visibleLegendGroups" :key="group.title" class="legend-group">
            <div class="legend-group-title">{{ group.title }}</div>
            <div class="legend-list">
              <div v-for="item in group.items" :key="item.label" class="legend-item">
                <span class="legend-symbol" :class="`legend-${item.symbol}`" aria-hidden="true" :style="{
                  background: ['high', 'low', 'curved-arrow'].includes(item.symbol) ? undefined : item.background,
                  color: ['high', 'low', 'curved-arrow'].includes(item.symbol) ? item.background : undefined
                }">
                  <svg v-if="item.symbol === 'curved-arrow'" viewBox="0 0 32 18" focusable="false">
                    <path d="M1 17 C7 4 17 4 24 5 L24 1 L32 7 L24 13 L24 9 C14 5 8 8 1 17Z" fill="currentColor" />
                  </svg>
                  <template v-else>{{ item.symbol === 'high' ? 'H' : item.symbol === 'low' ? 'L' : '' }}</template>
                </span>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="currentStage === 3 && layers.regionalPressureCenters" class="pressure-key">
          <div class="pressure-key-title"><strong>{{ month === 0 ? '1月' : '7月' }}海平面气压</strong><span>hPa（百帕）</span>
          </div>
          <div class="pressure-key-colors" :style="{ height: monthlyPressureLegend.colors.length * 18 + 'px' }"
            role="list" aria-label="教材气压分界值，从高压到低压">
            <div class="pressure-key-ramp" aria-hidden="true">
              <span v-for="(color, index) in monthlyPressureLegend.colors" :key="index" class="pressure-key-swatch"
                :style="{ background: color }"></span>
            </div>
            <span v-for="(level, index) in monthlyPressureLegend.levels" :key="level" class="pressure-key-value"
              :style="{ top: (index + 1) * 18 + 'px' }" role="listitem" :aria-label="`${level} hPa`">{{ level }}</span>
          </div>
        </div>
      </div>
      <small v-if="currentStage === 3 && layers.regionalPressureCenters" class="pressure-key-source">NOAA/NCEP · {{
        ncepSlpMetadata.climatology }} · {{ month === 0 ? '1月' : '7月' }}气候平均</small>
    </section>

    <FloatingFeatureCard v-show="floatingPanelsVisible" v-model:collapsed="layerCardCollapsed"
      class="layer-feature-card" title="图层面板" subtitle="分层查看大气环流" variant="data" :initial-top="90" :initial-right="16"
      :bottom-inset="82" :min-width="320" :min-height="320">
      <div class="floating-layer-content">
        <section v-if="currentStage === 0 ? singleCellLayerDefs.length : visibleCellLayerDefs.length"
          class="panel-control-group">
          <h3>{{ currentStage === 0 ? '单圈环流' : '环流结构' }}</h3>
          <div v-for="l in (currentStage === 0 ? singleCellLayerDefs : visibleCellLayerDefs)" :key="l.key"
            class="panel-control-row" :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="panel-control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :aria-label="l.label" :disabled="!isLayerAvailable(l.key)"
              @change="handleLayerControlChange(l.key)" />
          </div>
        </section>

        <section v-if="visibleWindLayerDefs.length" class="panel-control-group">
          <h3>风与受力</h3>
          <div v-for="l in visibleWindLayerDefs" :key="l.key" class="panel-control-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="panel-control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :aria-label="l.label" :disabled="!isLayerAvailable(l.key)"
              @change="handleLayerControlChange(l.key)" />
          </div>
        </section>

        <section v-if="visiblePressureLayerDefs.length" class="panel-control-group">
          <h3>气压分布</h3>
          <div v-for="l in visiblePressureLayerDefs" :key="l.key" class="panel-control-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="panel-control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :aria-label="l.label" :disabled="!isLayerAvailable(l.key)"
              @change="handleLayerControlChange(l.key)" />
          </div>
        </section>

        <section v-if="visibleOtherLayerDefs.length" class="panel-control-group">
          <h3>参照线与标注</h3>
          <div v-for="l in visibleOtherLayerDefs" :key="l.key" class="panel-control-row"
            :class="{ 'is-stage-disabled': !isLayerAvailable(l.key) }">
            <div class="panel-control-copy"><strong>{{ l.label }}</strong><span>{{ l.desc }}</span></div>
            <el-switch v-model="layers[l.key]" :aria-label="l.label" :disabled="!isLayerAvailable(l.key)"
              @change="handleLayerControlChange(l.key)" />
          </div>
          <div class="panel-control-row">
            <div class="panel-control-copy"><strong>纬度标注</strong><span>0°、30°、60°、回归线与极圈</span></div>
            <el-switch v-model="latitudeLabelsEnabled" aria-label="纬度标注" @change="updateLabels" />
          </div>
        </section>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="floatingPanelsVisible" v-model:collapsed="teachingCardCollapsed" title="阶段面板"
      class="teaching-feature-card" subtitle="按步骤观察与推理" variant="data" :initial-top="160" :initial-right="16"
      :bottom-inset="82" :min-width="320" :min-height="320">
      <div class="floating-teaching-content">
        <nav class="lesson-stage-tabs" aria-label="选择教学阶段">
          <button v-for="(stage, i) in stages" :key="stage.id" type="button" class="lesson-stage-tab"
            :class="{ active: currentStage === i }" :aria-pressed="currentStage === i" @click="goToStage(i)">
            <span class="lesson-stage-number">{{ i + 1 }}</span>
            <span>{{ stage.shortName }}</span>
          </button>
        </nav>

        <section v-if="currentStageData && currentStepData" class="lesson-current-step" aria-live="polite">
          <div class="lesson-step-progress">
            <span>步骤 {{ currentStep + 1 }} / {{ currentStageData.steps.length }}</span>
            <span>{{ currentStageData.shortName }}</span>
          </div>
          <h3>{{ currentStepData.title }}</h3>
          <p>{{ currentStepData.description }}</p>
        </section>

        <ol v-if="currentStageData" class="lesson-step-list" aria-label="本阶段步骤">
          <li v-for="(step, idx) in currentStageData.steps" :key="idx" class="lesson-step-row">
            <button type="button" class="lesson-step-button"
              :class="{ active: currentStep === idx, passed: currentStep > idx }"
              :aria-current="currentStep === idx ? 'step' : undefined" @click="goToStep(idx)">
              <span class="lesson-step-number">{{ idx + 1 }}</span>
              <span class="lesson-step-copy">
                <template v-if="step.focusCell && step.title.includes('：')">
                  <strong>{{ step.title.split('：')[0] }}</strong>
                  <span>{{ step.title.split('：')[1] }}</span>
                </template>
                <template v-else>{{ step.title }}</template>
              </span>
            </button>
            <button v-if="step.focusCell" type="button" class="lesson-step-focus"
              :title="`近景观看并重播${step.focusCell === 'single' ? '单圈环流' : step.title.split('：')[0]}`"
              :aria-label="`近景观看并重播${step.focusCell === 'single' ? '单圈环流' : step.title.split('：')[0]}`"
              @click="focusAndReplayStep(idx)">
              <el-icon aria-hidden="true">
                <ZoomIn />
              </el-icon>
            </button>
          </li>
        </ol>

        <footer class="lesson-step-navigation">
          <button type="button" :disabled="isFirstTeachingStep" @click="previousStep">← 上一步</button>
          <button type="button" class="lesson-next-step" @click="nextStep">
            {{ isLastTeachingStep ? '从头演示' : '下一步 →' }}
          </button>
        </footer>
      </div>
    </FloatingFeatureCard>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { VideoPause, VideoPlay, ZoomIn } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import SolarRayIndicator from './components/SolarRayIndicator.vue'
import { ncepSlpMetadata } from './ncep-slp-climatology'
import { SurfaceClimate, type ClimateState } from './simulation/SurfaceClimate'
import { SeasonalWarp } from './simulation/seasonal-warp'
import { stages, getNextTeachingPosition, getPreviousTeachingPosition } from './simulation/teaching-flow'
import { createSingleCellTeachingVisuals, updateSingleCellTeachingVisuals } from './simulation/single-cell-teaching'
import { createWindForceVisuals, updateWindForceVisuals, windForceColors, windForceDescription } from './simulation/wind-forces'
import { createPolarEquatorReference, updatePolarEquatorReference } from './simulation/polar-reference'
import { createRotationGuide, updateRotationGuide } from './simulation/rotation-guide'
import { ensureAirflowCells, isCirculationEnvelopeVisible } from './simulation/circulation-layers'
import { createReferenceLatitudes, latitudeStyles } from './simulation/graticule'
import { projectLatitudeLabels, type LatitudeScreenLabel } from './simulation/latitude-labels'
import { deflectCirculationCurve, createClosedCellRibbon } from './simulation/circulation-spatial'
import { createCirculationVolumeGeometry } from './simulation/circulation-volume'
import { createCirculationEdgeGlow } from './simulation/circulation-glow'
import { createCirculationFormation } from './simulation/circulation-formation'
import { createEarthRim } from './simulation/earth-rim'
import { getCellFocusView } from './simulation/circulation-focus'
import { CellFocusReplay } from './simulation/cell-focus-replay'
import { resolveSeasonTargets, seasonPoints, type SeasonPoint } from './simulation/seasonal-controls'
import { AtmosphericCellCurve, circulationCloseView, circulationTransitionProgress, interpolateCirculationCamera, insetSectionCurve, sectionPlaneNormal } from './simulation/circulation-section'
import { palette, shiftLatitude as shiftClimateLatitude } from './simulation/model'
import { pressureColors, pressureScaleForMonth } from './simulation/pressure-data'

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
  id?: string
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
  { key: 'circulationEnvelope', label: '透明环流罩', desc: '独立显示环流的空间范围' },
]

const singleCellLayerDefs = [
  { key: 'singleCell', label: '单圈环流', desc: '显示完整环流与近地面箭头' },
  { key: 'airflowRibbons', label: '环流气流', desc: '显示环流内部的流动轨迹' },
  { key: 'circulationEnvelope', label: '透明环流罩', desc: '独立显示或隐藏透明包络' },
]

const windLayerDefs = [
  { key: 'windForces', label: '风向与受力', desc: '水平气压梯度力 · 地转偏向力' },
  { key: 'surfaceWinds', label: '地面风向箭头', desc: '气压梯度·半球偏转·盛行风' },
  { key: 'monsoonWinds', label: '季风动态箭头', desc: '东亚、南亚与澳北 · 跨赤道气流' },
  { key: 'oceanCurrents', label: '洋流', desc: '全球表层洋流 · 北印度洋季节换向' },
]

const pressureLayerDefs = [
  { key: 'pressureBands', label: '气压带', desc: '贴球面的七个纬向气压带' },
  { key: 'regionalPressureCenters', label: '气压场与气压中心', desc: 'NOAA/NCEP 1981—2010年气候平均' },
  { key: 'isobars', label: '等压线', desc: '4 hPa主线 · 7月补充1026 hPa' },
]

const otherLayerDefs = [
  { key: 'rotationGuide', label: '自转方向示意圈', desc: '从北极俯视为逆时针' },
  { key: 'latLines', label: '经纬网', desc: '经度每15°·回归线·极圈' },
  { key: 'subsolarLine', label: '太阳直射纬线', desc: '每月15日参考纬度 · 非整圈同时直射' },
  { key: 'textAnnotations', label: '文字标注', desc: '环流/风带/气压带' },
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
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 1.5, 2]
const isCloseView = ref(false)

// ==================== 业务状态 ====================
const threeContainerRef = ref<HTMLElement | null>(null)
const labelsOverlayRef = ref<HTMLElement | null>(null)
const simMode = ref<SimMode>('single')
const month = ref(6) // 0=1月，11=12月
const seasonPoint = ref<SeasonPoint>('spring-equinox')
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

const simModeLabel = computed(() => {
  return simMode.value === 'single' ? '理想单圈' : '三圈环流'
})

const seasonalShiftDescription = computed(() => {
  const { latitudeShift } = resolveSeasonTargets(currentStage.value, month.value === 0 ? 1 : 7, seasonPoint.value)
  if (Math.abs(latitudeShift) < 0.05) return '位于南北对称位置'
  return `随太阳直射点${latitudeShift > 0 ? '北移' : '南移'}（中低纬示意约 ${Math.abs(latitudeShift).toFixed(0)}°）`
})

const simModeHint = computed(() => {
  if (simMode.value === 'single') return '赤道上升、两极下沉；近地面由两极流向赤道'
  const period = currentStage.value === 2 ? seasonPoints.find(point => point.id === seasonPoint.value)?.label : monthNames[month.value]
  return `${period} · 三圈环流、气压带和风带${seasonalShiftDescription.value}`
})

const layers = reactive<Record<string, boolean>>({
  earth: true,
  singleCell: false,
  circulationEnvelope: false,
  windForces: false,
  rotationGuide: false,
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
const currentStep = ref(0)
const neutralSeason = ref(true)
const floatingPanelsVisible = ref(true)
const teachingCardCollapsed = ref(true)
const layerCardCollapsed = ref(true)

function toggleFloatingPanelsVisibility() {
  floatingPanelsVisible.value = !floatingPanelsVisible.value
}

const currentStageData = computed(() => stages[currentStage.value])
const currentStepData = computed(() => currentStageData.value?.steps[currentStep.value])
const isFirstTeachingStep = computed(() => currentStage.value === 0 && currentStep.value === 0)
const isLastTeachingStep = computed(() => !getNextTeachingPosition(currentStage.value, currentStep.value))
const visibleCellLayerDefs = computed(() => currentStage.value === 0 ? [] : cellLayerDefs)
const visibleWindLayerDefs = computed(() => currentStage.value === 0 ? [] : windLayerDefs.filter(layer => currentStage.value === 3 || ['surfaceWinds', 'windForces'].includes(layer.key)))
const visiblePressureLayerDefs = computed(() => currentStage.value === 0 ? [] : pressureLayerDefs.filter(layer => currentStage.value === 3 || !['regionalPressureCenters', 'isobars'].includes(layer.key)))
const visibleOtherLayerDefs = computed(() => otherLayerDefs.map(layer =>
  layer.key === 'subsolarLine' && currentStage.value === 2
    ? { ...layer, desc: '春秋分直射赤道 · 夏至、冬至直射回归线' }
    : layer))

type LegendSymbol = 'arrow' | 'curved-arrow' | 'line' | 'band' | 'high' | 'low'
type LegendGroup = {
  title: string
  items: Array<{
    label: string
    symbol: LegendSymbol
    background: string
  }>
}

const monthlyPressureScale = computed(() => pressureScaleForMonth(month.value === 0 ? 1 : 7))
const monthlyPressureLegend = computed(() => ({
  levels: [...monthlyPressureScale.value.levels].reverse(),
  colors: [...monthlyPressureScale.value.colors].reverse(),
}))

const visibleLegendGroups = computed<LegendGroup[]>(() => {
  const groups: LegendGroup[] = []
  const add = (title: string, entries: [string, string][], symbol: LegendSymbol = 'arrow') =>
    groups.push({ title, items: entries.map(([label, background]) => ({ label, background, symbol })) })
  if (currentStage.value === 0 && layers.singleCell)
    add('单圈剖面气流', [
      ['近地面支 · 向赤道', '#ff473b'],
      ['高空支 · 向两极', '#45a3ff'],
    ])
  else if (currentStage.value > 0 && (layers.hadleyCell || layers.ferrelCell || layers.polarCell))
    add('环流剖面箭头', [
      ['近地面支', '#ff473b'],
      ['高空支', '#45a3ff'],
    ])
  if (currentStage.value > 0 && layers.surfaceWinds)
    add('盛行风', [['信风', palette.hadley], ['西风', palette.ferrel], ['极地东风', palette.polar]], 'curved-arrow')
  if (layers.windForces && currentStage.value > 0)
    add('风向与受力', [['水平气压梯度力', windForceColors.pressure], ['风向', windForceColors.wind], ['地转偏向力', windForceColors.coriolis]])
  if (currentStage.value === 0 && !layers.singleCell) {
    const vertical = currentStepData.value?.singlePhase === 'vertical'
    add(vertical ? '垂直运动' : '受热差异', [[vertical ? '赤道上升' : '赤道受热', '#ff915f'], [vertical ? '两极下沉' : '两极冷却', '#72caff']], vertical ? 'arrow' : 'band')
  }
  if (currentStage.value > 0 && layers.pressureBands)
    add('理想气压带', [['高压带', palette.high], ['低压带', palette.low]], 'band')
  if (currentStage.value === 3 && layers.monsoonWinds)
    add('季风与跨赤道气流', month.value === 0 ? [
      ['东亚冬季风', palette.winterMonsoon], ['南亚冬季风', palette.southWinterMonsoon],
      ['东北信风 · 跨赤道前', palette.hadley], ['澳北西北季风 · 跨赤道后', palette.australiaSummerMonsoon],
    ] : [
      ['东亚夏季风', palette.summerMonsoon], ['南亚西南季风 · 跨赤道后', palette.southSummerMonsoon],
      ['东南信风 · 跨赤道前', palette.hadley],
    ], 'curved-arrow')
  if (currentStage.value === 3 && layers.oceanCurrents)
    add('表层洋流', [['暖流', palette.warm], ['寒流', palette.cold]], 'arrow')
  if (currentStage.value === 3 && (layers.regionalPressureCenters || layers.isobars)) {
    const items: LegendGroup['items'] = []
    if (layers.isobars) items.push({ label: '等压线 · 4 hPa主线 · 7月补充1026 hPa', background: pressureColors.line, symbol: 'line' })
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
  if (simMode.value === 'single') {
    if (layers.singleCell) return singleLabels
    return singleLabels.filter(label => !label.circulationId).map(label => ({
      ...label,
      text: currentStepData.value?.singlePhase === 'heating' ? label.text.replace('上升', '').replace('下沉', '') : label.text,
    }))
  }
  return cellLabels
})

const labelScreenData = ref<ScreenLabel[]>([])
// A viewing preference, kept independently of stage/step layer presets.
const latitudeLabelsEnabled = ref(true)
const latitudeScreenData = ref<LatitudeScreenLabel[]>([])
const solarScreenData = ref({ visible: false, x: 0, y: 0, reach: 100 })

// ==================== Three.js 变量 ====================
let surfaceClimate: SurfaceClimate | null = null
let seasonalWarp: SeasonalWarp | null = null
function climateState(): ClimateState {
  return {
    stage: currentStage.value, month: month.value === 0 ? 1 : 7, seasonPoint: seasonPoint.value,
    playing: isPlaying.value, speed: playbackSpeed.value, layers, neutralSeason: neutralSeason.value
  }
}
let singleTeaching: ReturnType<typeof createSingleCellTeachingVisuals> | null = null
let windForces: ReturnType<typeof createWindForceVisuals> | null = null
let windForceStartedAt = 0
let polarReference: ReturnType<typeof createPolarEquatorReference> | null = null
let rotationGuide: ReturnType<typeof createRotationGuide> | null = null
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
let teachingStepStartedAt = 0
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
const cellFocusReplay = new CellFocusReplay()
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
 * 标签使用与气压带、风带和环流几何相同的季节位移，避免相互错位。
 */
function shiftLatitude(lat: number, offset: number) {
  return shiftClimateLatitude(lat, offset)
}

function getCellCenterLon(_definition: CirculationDefinition) {
  // 所有环流圈共用同一经向剖面，避免不同圈层在视觉上前后错开。
  return CIRCULATION_CENTER_LON
}

function resetCirculationFormation() {
  // 默认先显示一小段气流，避免进入阶段一时画面短暂完全空白。
  // 后续仍会按动画进度逐渐喷出并闭合。
  circulationRevealProgress = 0
}

function getCirculationCloseView() {
  if (cellFocusReplay.kind) return getCellFocusView(camera?.aspect ?? 1,
    CIRCULATION_CENTER_LON, cellFocusReplay.kind)
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
  if (isCloseView.value) cellFocusReplay.arrive()
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
      uBrightness: { value: 0.30 },
      uSaturation: { value: 0.72 },
      uContrast: { value: 1.04 },
      uCoolTint: { value: new THREE.Color(0x8cc9e8) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vEarthNormal;
      varying vec3 vEarthView;

      void main() {
        vUv = uv;
        vEarthNormal = normalize(normalMatrix * normal);
        vEarthView = -(modelViewMatrix * vec4(position, 1.0)).xyz;
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
      varying vec3 vEarthNormal;
      varying vec3 vEarthView;

      void main() {
        vec3 textureColor = texture2D(uMap, vUv).rgb;
        float luminance = dot(textureColor, vec3(0.2126, 0.7152, 0.0722));
        vec3 color = mix(vec3(luminance), textureColor, uSaturation);
        color = (color - 0.5) * uContrast + 0.5;
        color = mix(color, color * uCoolTint, 0.24);
        color *= uBrightness;
        float grazing = 1.0 - max(0.0, dot(normalize(vEarthNormal), normalize(vEarthView)));
        color += vec3(.025, .20, .58) * pow(grazing, 5.0) * .72;
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

  for (let index = 0; index < samples; index++) {
    const t = index / samples
    baseCurve.getPointAt(t, center)

    const slowCurl = Math.sin(t * Math.PI * 2 + phase * 0.63)
    const fastCurl = Math.sin(t * Math.PI * 2 * 3 - phase * 1.31)

    const twist =
      phase +
      t * Math.PI * 2 * Math.round(twistCount) +
      slowCurl * 0.46 +
      fastCurl * 0.16

    const breathing =
      0.58 +
      0.30 * Math.sin(t * Math.PI * 2 * 2 + phase * 0.7) +
      0.12 * Math.sin(t * Math.PI * 2 * 5 - phase)

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

      attribute float aFormation;
      varying float vFormation;

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

        vFormation = aFormation;
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

      varying float vFormation;

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

        // Ascent and descent form together, then both horizontal branches join.
        if (uReveal <= 0.0) discard;
        float revealAlpha = uReveal >= 1.0 ? 1.0 : smoothstep(
          -0.055,
          0.025,
          uReveal - vFormation
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
  longitudeWidth = 8,
) {
  const sampleCount = mode === 'single' ? 150 : 110
  const boundaryPoints = Array.from({ length: sampleCount }, (_, index) =>
    curve.getPointAt(index / sampleCount),
  )
  const geometry = createCirculationVolumeGeometry(curve, longitudeWidth, sampleCount, 28)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCoolColor: { value: new THREE.Color(0x6cbaff) },
      uOpacity: { value: mode === 'single' ? 0.42 : 0.34 },
      uMinRadius: { value: Math.min(...boundaryPoints.map(p => p.length())) },
      uMaxRadius: { value: Math.max(...boundaryPoints.map(p => p.length())) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vHeight;
      uniform float uMinRadius;
      uniform float uMaxRadius;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vView = -(modelViewMatrix * vec4(position, 1.0)).xyz;
        vHeight = clamp((length(position)-uMinRadius)/(uMaxRadius-uMinRadius),0.0,1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uCoolColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vHeight;

      void main() {
        // Broad, luminous grazing highlights describe the curved shell itself.
        // Keep its interior clear; stacking front/back faces must not become a blue slab.
        float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        float rim = pow(grazing, 1.65);
        float outerGlow = smoothstep(.22, 1., vHeight);
        float sheen = max(rim, outerGlow * .72);
        vec3 color = mix(vec3(.025,.07,.23), uCoolColor, .36 + sheen*.64);
        color *= 1.28 + rim*.36;
        color = mix(color, vec3(.67, .91, 1.2), pow(grazing, 5.0)*.24);
        float alpha = uOpacity * (.065 + rim*.64 + outerGlow*.30);
        alpha *= gl_FrontFacing ? 1.0 : .42;
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
      opacity: longitudeWidth >= 20 ? 0.025 : 0.10,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )
  outline.renderOrder = 5.38

  const group = new THREE.Group()
  group.name = `${mode}-circulation-solid-envelope`
  group.userData.isCirculationEnvelope = true
  // Two end faces and connecting skin enclose a volume, not a flat mask or tube.
  outline.rotation.y = THREE.MathUtils.degToRad(longitudeWidth / 2)
  const oppositeOutline = outline.clone()
  oppositeOutline.rotation.y = -outline.rotation.y
  group.add(face, outline, oppositeOutline)
  group.add(createCirculationEdgeGlow(geometry))
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
  const formation = createCirculationFormation(baseCurve)
  const pathUV = geometry.getAttribute('uv')
  geometry.setAttribute('aFormation', new THREE.Float32BufferAttribute(
    Array.from({ length: pathUV.count }, (_, i) => formation(pathUV.getX(i))), 1))

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
  const smokeCurve = deflectCirculationCurve(insetSectionCurve(
    curve, mode === 'single' ? .105 : .085,
  ), definition.type)

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
        radius: config.hazeRadius * .42,
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
        radius: config.hazeRadius * .62,
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
  for (let index = 0; index < 6; index++) {
    const angle =
      (index / config.strandCount) * Math.PI * 2 +
      hemispherePhase +
      (index % 2) * 0.19

    const ringScale =
      0.48 +
      0.34 * (0.5 + 0.5 * Math.sin(index * 1.71))

    const distance =
      config.strandSpread * ringScale * .34

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
            config.strandRadius * .62 *
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
              ? 1.42
              : 1.18 + (index % 3) * 0.10,
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
      const envelope = createCirculationEnvelope(curve, 'single', section.fullEffect ? 50 : 8)
      envelope.userData.cellKind = 'single'
      root.add(envelope)
      if (section.fullEffect) {
        airflowGroup.add(createSmokeBundle(definition, curve, 'single'))
      }

      if (!section.fullEffect) {
        const ribbon = createClosedCellRibbon(insetSectionCurve(curve, .15))
        singleCellArrowMaterials.push(ribbon.material)
        directionGroup.add(ribbon)
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

      const spatialCurve = deflectCirculationCurve(curve, definition.type)
      const envelope = createCirculationEnvelope(
        section.fullEffect ? spatialCurve : curve, 'three', section.fullEffect ? 44 : 8,
      )
      envelope.userData.cellKind = definition.type
      root.add(envelope)
      if (section.fullEffect) {
        airflowGroups[definition.type].add(
          createSmokeBundle(definition, curve, 'three'),
        )
      }

      if (!section.fullEffect) {
        const ribbon = createClosedCellRibbon(insetSectionCurve(curve, .10), 2, .080)
        ribbon.name = `${definition.id}-continuous-flat-arrow-loop`
        ribbon.material.userData.cellType = definition.type
        singleCellArrowMaterials.push(ribbon.material)
        directionGroups[definition.type].add(ribbon)
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

    group.add(createSimpleGridLine(points, regularLatitudeColor, 0.22, true, 0.0030))
  }

  // 普通经线每15°一根，0°和180°单独高亮。
  for (let lon = -165; lon <= 165; lon += 15) {
    if (lon === 0) continue

    const points: THREE.Vector3[] = []
    for (let lat = -89; lat <= 89; lat += 2) {
      points.push(latLonToVec3(lat, lon, radius))
    }

    group.add(createSimpleGridLine(points, regularLongitudeColor, 0.34, false, 0.0035))
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
  earthMesh.add(createEarthRim(EARTH_RADIUS))

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
  singleTeaching = createSingleCellTeachingVisuals(EARTH_RADIUS)
  windForces = createWindForceVisuals(EARTH_RADIUS)
  polarReference = createPolarEquatorReference(EARTH_RADIUS)
  rotationGuide = createRotationGuide(EARTH_RADIUS)
  seasonalWarp = new SeasonalWarp(surfaceClimate.shift)
  seasonalWarp.attach(threeCellRoot)
  earthMesh.add(singleCellRoot, threeCellRoot, latLineGroup, surfaceClimate.group)
  earthMesh.add(singleTeaching.heating, singleTeaching.vertical, windForces.group, polarReference.group)
  earthMesh.add(rotationGuide.group)

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

    stream.mesh.material.uniforms.uTime!.value = cellFocusReplay.timeFor(stream.cellType, timeAccum)
    stream.mesh.material.uniforms.uReveal!.value = cellFocusReplay.revealFor(stream.cellType, circulationRevealProgress)
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
  const activeCirculationMode = simMode.value === 'single' ? 'single' : 'three'

  circulationDirectionArrows.forEach(item => {
    if (!isPlaying.value) return
    if (item.mode !== activeCirculationMode) return
    if (!item.mesh.parent?.visible) return
    updateMovingArrowItem(item, deltaTime)
  })

  singleCellArrowMaterials.forEach(material => {
    const kind = material.userData.cellType ?? 'single'
    material.uniforms.uTime!.value = cellFocusReplay.timeFor(kind, timeAccum)
    if (material.uniforms.uReveal) material.uniforms.uReveal.value = cellFocusReplay.revealFor(kind, circulationRevealProgress)
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
    if (isCloseView.value) cellFocusReplay.arrive()
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

    circulationRevealProgress = Math.min(1, circulationRevealProgress + deltaTime * 0.28 * playbackSpeed.value)
    cellFocusReplay.advance(deltaTime * playbackSpeed.value)
  }

  surfaceClimate?.update(deltaTime, climateState())
  if (singleTeaching) updateSingleCellTeachingVisuals(singleTeaching, timeAccum, Math.min(1, (timeAccum - teachingStepStartedAt) / 2.8))
  if (windForces?.group.visible) updateWindForceVisuals(windForces, timeAccum - windForceStartedAt)
  if (rotationGuide) updateRotationGuide(rotationGuide, timeAccum, currentStage.value > 0 && !!layers.rotationGuide)
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
  if (camera && polarReference) {
    earthMesh.updateWorldMatrix(true, false)
    const localEye = earthMesh.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))
    updatePolarEquatorReference(polarReference, localEye, !!layers.latLines)
  }

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
  updateSolarIndicator(width, height)
  latitudeScreenData.value = latitudeLabelsEnabled.value && layers.latLines
    ? projectLatitudeLabels(earthMesh, camera, width, height, EARTH_RADIUS) : []

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
      const thermalLabel = label.type === 'single' && !label.circulationId
      const facingEye = thermalLabel
        ? earthMesh!.worldToLocal(camera!.getWorldPosition(new THREE.Vector3())) : null
      const visibleLongitude = facingEye
        ? THREE.MathUtils.radToDeg(Math.atan2(-facingEye.z, facingEye.x)) : label.lon
      localPosition = latLonToVec3(
        lat,
        visibleLongitude,
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
  appendTeachingLabels(width, height)
}

function updateSolarIndicator(width: number, height: number) {
  if (!camera || !earthMesh || !surfaceClimate || !layers.subsolarLine) {
    solarScreenData.value.visible = false
    return
  }
  earthMesh.updateWorldMatrix(true, false)
  let edge: THREE.Vector3 | null = null
  // Find the visible ring's rightmost projection, independent of Earth's spin.
  for (let i = 0; i < 96; i++) {
    const point = latLonToVec3(surfaceClimate.sunlight.latitude, i * 360 / 96, EARTH_RADIUS + .035)
      .applyMatrix4(earthMesh.matrixWorld).project(camera)
    if (Math.abs(point.z) <= 1 && (!edge || point.x > edge.x)) edge = point
  }
  if (!edge) { solarScreenData.value.visible = false; return }
  const targetX = (edge.x + 1) * width / 2
  const y = (1 - edge.y) * height / 2
  const x = Math.min(width - 52, Math.max(width * .82, targetX + 115))
  solarScreenData.value = {
    visible: targetX < width - 90 && y > 42 && y < height - 100,
    x, y, reach: Math.max(60, x - targetX - 3)
  }
}

const teachingLabelOffsets = new Map<string, number>()
function appendTeachingLabels(width: number, height: number) {
  if (!camera || !earthMesh) return
  const eye = camera.getWorldPosition(new THREE.Vector3())
  const center = earthMesh.getWorldPosition(new THREE.Vector3())
  const project = (position: THREE.Vector3, text: string, color: string, reference = false, opacity = 1, offsetX = 0, id = text) => {
    const world = position.clone().applyMatrix4(earthMesh!.matrixWorld)
    const p = world.clone().project(camera!)
    if (Math.abs(p.x) > .96 || Math.abs(p.y) > .95 || Math.abs(p.z) > 1) return
    const ray = new THREE.Ray(eye, world.clone().sub(eye).normalize())
    const hit = ray.intersectSphere(new THREE.Sphere(center, EARTH_RADIUS + .015), new THREE.Vector3())
    if (!reference && hit && eye.distanceTo(hit) < eye.distanceTo(world) - .06) return
    const x = (p.x + 1) * width / 2 + offsetX, anchorY = (1 - p.y) * height / 2
    const textWidth = Math.max(...text.split('\n').map(line => line.length)) * 12 + 12
    const previous = teachingLabelOffsets.get(id) ?? 0
    const offsets = [...new Set([previous, 0, -24, 24, -48, 48, -72, 72])]
    const offsetY = offsets.find(offset => {
      const y = anchorY + offset
      return y > 12 && y < height - 24 && !labelScreenData.value.some(other => {
        if (!other.visible || (other.opacity ?? 1) < .03) return false
        const lines = other.text.split('\n')
        const otherWidth = Math.max(...lines.map(line => line.length)) * 12 + 16
        const otherHeight = lines.length * 18 + 10
        return Math.abs(x - other.x) < (textWidth + otherWidth) / 2 && Math.abs(y - other.y) < (22 + otherHeight) / 2
      })
    })
    if (offsetY === undefined) return
    teachingLabelOffsets.set(id, offsetY)
    labelScreenData.value.push({
      id, text, color, x,
      y: anchorY + offsetY, visible: true,
      opacity: reference ? polarReference!.line.material.opacity / .72 : opacity,
      cls: reference ? 'label-equator-reference' : 'label-wind-force'
    })
  }
  if (windForces?.group.visible) {
    const selected = new Set(windForces.clusters.filter(cluster => cluster.group.visible).map(cluster => cluster.id))
    for (const label of windForces.labels) {
      if (selected.has(label.cluster) && label.opacity > .01) project(label.position, label.text, label.color, false, label.opacity, label.kind === 'pressure' ? -48 : label.kind === 'wind' ? 17 : 42, `${label.cluster}-${label.kind}`)
    }
  }
  if (polarReference?.group.visible) {
    project(polarReference.labelPosition, '赤道位置参考（投影）', '#ff536b', true)
  }
  if (rotationGuide?.group.visible) project(rotationGuide.labelPosition, '自转方向', '#8dceff')
}

// ==================== 图层与模式 ====================
function setCloseViewState(enabled: boolean, instant = false) {
  if (!enabled) cellFocusReplay.clear()
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

function handleLayerControlChange(key: string) {
  stopAutoDemo()
  if (simMode.value === 'single' && layers[key] && key === 'airflowRibbons') {
    layers.singleCell = true
  }
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
    singleCellRoot.visible = singleMode && (!!layers.singleCell || !!layers.circulationEnvelope)
    for (const name of ['single-cell-circulation-direction-arrows', 'single-cell-surface-direction-arrows']) {
      const group = singleCellRoot.getObjectByName(name)
      if (group) group.visible = !!layers.singleCell
    }
  }
  if (singleTeaching) {
    singleTeaching.heating.visible = singleMode && !layers.singleCell && currentStepData.value?.singlePhase !== 'closed'
    singleTeaching.vertical.visible = singleTeaching.heating.visible && currentStepData.value?.singlePhase === 'vertical'
  }
  if (windForces) {
    const enabled = !singleMode && !!layers.windForces
    // Choose geographic examples only when enabled, never replace them each frame
    // with another front-facing longitude. They rotate with their Earth parent.
    if (enabled && !windForces.group.visible && camera) {
      windForceStartedAt = timeAccum
      earthMesh.updateWorldMatrix(true, false)
      const localEye = earthMesh.worldToLocal(camera.getWorldPosition(new THREE.Vector3())).normalize()
      const selected = new Set<string>()
      for (const hemisphere of ['north', 'south']) {
        const facing = windForces.clusters.filter(cluster => cluster.hemisphere === hemisphere)
          .sort((a, b) => b.origin.clone().normalize().dot(localEye) - a.origin.clone().normalize().dot(localEye))[0]
        if (facing) selected.add(facing.id)
      }
      windForces.clusters.forEach(cluster => { cluster.group.visible = selected.has(cluster.id) })
    }
    windForces.group.visible = enabled
  }
  for (const root of [singleCellRoot, threeCellRoot]) root?.traverse(object => {
    if (object.userData.isCirculationEnvelope) object.visible = isCirculationEnvelopeVisible(layers, object.userData.cellKind)
  })

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
      singleMode && !!layers.singleCell && !!layers.airflowRibbons
  }

  if (latLineGroup) latLineGroup.visible = !!layers.latLines
}

function isLayerAvailable(key: string) {
  if (['latLines', 'textAnnotations', 'subsolarLine', 'earth'].includes(key)) return true
  if (['regionalPressureCenters', 'isobars', 'monsoonWinds', 'oceanCurrents'].includes(key)) return currentStage.value === 3
  if (['airflowRibbons', 'circulationEnvelope'].includes(key)) return true
  if (key === 'singleCell') return currentStage.value === 0
  return currentStage.value > 0
}

function applyTeachingStep(index: number, keepFocus = false, preserveForceChoice = true) {
  const step = stages[currentStage.value]?.steps[index]
  if (!step) return
  if (!keepFocus && cellFocusReplay.kind) setCloseViewState(false)
  const retainedWindForces = currentStage.value === 1 && preserveForceChoice ? layers.windForces : undefined
  currentStep.value = index
  teachingStepStartedAt = isPlaying.value ? timeAccum : timeAccum - 2.8
  Object.keys(layers).forEach(key => { layers[key] = !!step.layers[key] })
  // Keep the teacher's force-illustration choice throughout this stage, including
  // focus replays. Only entering the stage applies its default enabled preset.
  if (retainedWindForces !== undefined) layers.windForces = retainedWindForces
  if (step.month !== undefined) month.value = step.month
  if (step.seasonPoint !== undefined) seasonPoint.value = step.seasonPoint
  neutralSeason.value = !!step.neutralSeason
  resetCirculationFormation()
  if (!isPlaying.value) circulationRevealProgress = 1
  applyLayerVisibility()
}

function applyStage(stageIndex: number, stepIndex = 0) {
  if (!stages[stageIndex]) return
  simMode.value = stageIndex === 0 ? 'single' : 'three'
  if (stageIndex === 0 && earthMesh) {
    rotationAngle = DEFAULT_EARTH_ROTATION
    earthMesh.rotation.y = rotationAngle
  }
  syncStageView()
  applyTeachingStep(stepIndex, false, false)
}

function setMode(mode: SimMode) {
  goToStage(mode === 'single' ? 0 : 1)
}

function clearReplayTimers() {
  replayTimers.forEach(timer => clearTimeout(timer))
  replayTimers = []
}

function stopAutoDemo() {
  clearReplayTimers()
  isAutoDemo.value = false
}

function goToStage(stageIndex: number, options: { fromAutoDemo?: boolean; step?: number } = {}) {
  if (!options.fromAutoDemo) stopAutoDemo()
  currentStage.value = clamp(stageIndex, 0, stages.length - 1)
  applyStage(currentStage.value, options.step ?? 0)
}

function goToStep(index: number) {
  stopAutoDemo()
  applyTeachingStep(index)
}

function focusAndReplayStep(index: number) {
  const kind = stages[currentStage.value]?.steps[index]?.focusCell
  if (!kind || !sceneReady || !camera || !orbitControls) return
  stopAutoDemo()
  // Selecting the icon also selects its lesson, without jumping back to overview.
  applyTeachingStep(index, true)
  cellFocusReplay.begin(kind)
  isPlaying.value = true
  isCloseView.value = true
  // Even repeated clicks replay; formation starts only when the flight arrives.
  startCloseViewTransition()
}

function scheduleNextAutoDemoStep() {
  clearReplayTimers()
  if (!isAutoDemo.value || componentDestroyed) return
  const scheduledStage = currentStage.value
  const scheduledStep = currentStep.value
  const timer = setTimeout(() => {
    replayTimers = []
    if (!isAutoDemo.value || componentDestroyed) return
    if (currentStage.value !== scheduledStage || currentStep.value !== scheduledStep) {
      scheduleNextAutoDemoStep()
      return
    }
    const next = getNextTeachingPosition(scheduledStage, scheduledStep)
    if (!next) {
      stopAutoDemo()
      return
    }
    if (next.stage === scheduledStage) applyTeachingStep(next.step)
    else goToStage(next.stage, { fromAutoDemo: true, step: next.step })
    scheduleNextAutoDemoStep()
  }, currentStepData.value?.durationMs ?? 9000)
  replayTimers = [timer]
}

function startAutoDemo(options: { restartFromBeginning?: boolean } = {}) {
  clearReplayTimers()
  isAutoDemo.value = true
  isPlaying.value = true
  if (options.restartFromBeginning) goToStage(0, { fromAutoDemo: true })
  else applyTeachingStep(currentStep.value)
  scheduleNextAutoDemoStep()
}

function toggleAutoDemo() {
  if (isAutoDemo.value) stopAutoDemo()
  else startAutoDemo()
}

function togglePlayback() {
  stopAutoDemo()
  isPlaying.value = !isPlaying.value
}

function setSeasonPoint(point: SeasonPoint) {
  if (currentStage.value !== 2) return
  stopAutoDemo()
  const stepIndex = stages[2]!.steps.findIndex(step => step.seasonPoint === point && step.layers.subsolarLine)
  if (stepIndex >= 0) applyTeachingStep(stepIndex)
}

function setRepresentativeMonth(nextMonth: 0 | 6) {
  if (currentStage.value !== 3) return
  stopAutoDemo()
  // Keep the active lesson description aligned with the displayed month.
  if (currentStep.value < 2) {
    applyTeachingStep(nextMonth === 0 ? 0 : 1)
  } else if (currentStep.value < 4) {
    applyTeachingStep(nextMonth === 6 ? 2 : 3)
  } else {
    month.value = nextMonth
    neutralSeason.value = false
  }
}

function nextStep() {
  stopAutoDemo()
  const next = getNextTeachingPosition(currentStage.value, currentStep.value)
  if (!next) startAutoDemo({ restartFromBeginning: true })
  else if (next.stage === currentStage.value) applyTeachingStep(next.step)
  else goToStage(next.stage, { step: next.step })
}

function previousStep() {
  stopAutoDemo()
  const previous = getPreviousTeachingPosition(currentStage.value, currentStep.value)
  if (!previous) return
  if (previous.stage === currentStage.value) applyTeachingStep(previous.step)
  else goToStage(previous.stage, { step: previous.step })
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
  singleTeaching = null
  windForces = null
  polarReference = null
  rotationGuide = null
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
.climate-label {
  border: 1px solid currentColor;
}

.scene-label.climate-monsoon-label {
  white-space: pre-line;
  text-align: center;
  line-height: 1.2;
}

.climate-contour-label {
  font-size: 11px !important;
  padding: 2px 4px !important;
  background: #06122199 !important;
  border: none !important;
}

.pressure-key {
  display: grid;
  gap: 6px;
  align-content: start;
  font-size: 11px;
  color: #bcd3e7;
}

.pressure-key-title {
  display: grid;
  gap: 2px;
  line-height: 1.4;
}

.pressure-key-title strong {
  color: #dceaf3;
  font-size: 11px;
  font-weight: 600;
}

.pressure-key-title span {
  color: #a5bdcf;
  font-size: 10px;
}

.pressure-key-colors {
  position: relative;
}

.pressure-key-ramp {
  display: grid;
  grid-auto-rows: 18px;
  width: 22px;
  height: 100%;
}

.pressure-key-swatch {
  display: block;
  height: 100%;
}

.pressure-key-value {
  position: absolute;
  left: 30px;
  transform: translateY(-50%);
  color: #e1edf5;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 12px;
}

.pressure-key-value::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  width: 5px;
  height: 1px;
  background: #b6c6d4;
}

.pressure-key-source {
  display: block;
  margin-top: 9px;
  color: #8eacbd;
  font-size: 9px;
  line-height: 1.4;
}

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
  transition: none;
}

.latitude-reference-label {
  position: absolute;
  transform: translate(-100%, -50%);
  white-space: nowrap;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(3, 12, 25, .72);
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  text-shadow: 0 1px 3px #000;
  transition: none;
}

.latitude-label-leaders {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  fill: none;
  stroke-width: .75;
  opacity: .55;
}

.scene-label.label-low {
  color: #f6aa3a;
  border-color: rgba(246, 170, 58, 0.66);
  box-shadow: 0 0 14px rgba(246, 170, 58, 0.16);
}

.scene-label.label-high {
  color: #927bd4;
  border-color: rgba(146, 123, 212, 0.66);
  box-shadow: 0 0 14px rgba(146, 123, 212, 0.16);
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
  color: #f6aa3a;
}

.wind-item.pressure-high .wind-icon {
  color: #927bd4;
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

/* ===================== 两侧悬浮卡与代表月份 ===================== */
.general-atmospheric-circulation-container .floating-feature-card {
  max-width: calc(100vw - 20px);
  max-height: min(620px, calc(100dvh - 172px));
}

.general-atmospheric-circulation-container .floating-feature-card:not(.collapsed) {
  width: min(340px, calc(100vw - 32px));
}

.general-atmospheric-circulation-container .floating-feature-card :deep(.feature-card-content) {
  padding-bottom: 25px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(94, 199, 225, .45) transparent;
}

.general-atmospheric-circulation-container .floating-teaching-content,
.general-atmospheric-circulation-container .floating-layer-content {
  display: grid;
  gap: 16px;
  box-sizing: border-box;
  padding: 14px 14px 8px;
}

.general-atmospheric-circulation-container .panel-control-group {
  min-width: 0;
  margin: 0;
}

.general-atmospheric-circulation-container .panel-control-group h3 {
  margin: 0 0 5px;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(114, 202, 226, .17);
  color: #80dcec;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 650;
  letter-spacing: .06em;
}

.general-atmospheric-circulation-container .panel-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  min-width: 0;
}

.general-atmospheric-circulation-container .panel-control-row.is-stage-disabled {
  opacity: .44;
}

.general-atmospheric-circulation-container .panel-control-row :deep(.el-switch) {
  flex-shrink: 0;
}

.general-atmospheric-circulation-container .panel-control-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.general-atmospheric-circulation-container .panel-control-copy strong {
  color: #e3f1f8;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 550;
}

.general-atmospheric-circulation-container .panel-control-copy span {
  color: #8faebd;
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.general-atmospheric-circulation-container .lesson-stage-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.general-atmospheric-circulation-container .lesson-stage-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 39px;
  min-width: 0;
  padding: 8px;
  border: 1px solid rgba(123, 187, 211, .18);
  border-radius: 8px;
  color: #a8c4d3;
  font-family: inherit;
  font-size: 12px;
  font-weight: 550;
  line-height: 1.4;
  text-align: left;
  background: rgba(6, 25, 40, .55);
  cursor: pointer;
}

.general-atmospheric-circulation-container .lesson-stage-tab.active {
  color: #e7fcff;
  border-color: rgba(88, 216, 235, .64);
  background: rgba(25, 102, 128, .35);
}

.general-atmospheric-circulation-container .lesson-stage-number {
  color: #6dd8e9;
  font-size: 11px;
  font-weight: 700;
}

.general-atmospheric-circulation-container .lesson-current-step {
  padding: 0 2px;
}

.general-atmospheric-circulation-container .lesson-step-progress {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #8eaebb;
  font-size: 11px;
  line-height: 1.5;
}

.general-atmospheric-circulation-container .lesson-step-progress span:first-child {
  color: #72dae9;
}

.general-atmospheric-circulation-container .lesson-current-step h3 {
  margin: 8px 0 6px;
  color: #f0f8fc;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.45;
}

.general-atmospheric-circulation-container .lesson-current-step p {
  margin: 0;
  color: #abc3cf;
  font-size: 12px;
  line-height: 1.7;
}

.general-atmospheric-circulation-container .lesson-step-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 12px 0 0;
  border-top: 1px solid rgba(114, 202, 226, .15);
  list-style: none;
}

.general-atmospheric-circulation-container .lesson-step-row {
  position: relative;
}

.general-atmospheric-circulation-container .lesson-step-row:has(.lesson-step-focus) .lesson-step-button {
  min-height: 58px;
  padding-right: 45px;
}

.general-atmospheric-circulation-container .lesson-step-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.general-atmospheric-circulation-container .lesson-step-copy strong {
  color: inherit;
  font-weight: 600;
}

.general-atmospheric-circulation-container .lesson-step-copy>span {
  font-size: 11px;
  opacity: .85;
}

.general-atmospheric-circulation-container .lesson-step-focus {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(114, 202, 226, .28);
  border-radius: 7px;
  color: #8ae2f0;
  background: rgba(24, 86, 108, .28);
  font-size: 17px;
  cursor: pointer;
}

.general-atmospheric-circulation-container .lesson-step-focus:hover {
  color: #e4fbff;
  border-color: #80dcec;
  background: rgba(42, 139, 166, .36);
}

.general-atmospheric-circulation-container .lesson-step-focus:focus-visible {
  outline: 2px solid #7edff1;
  outline-offset: 2px;
}

.general-atmospheric-circulation-container .lesson-step-button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 36px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #9db7c7;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.general-atmospheric-circulation-container .lesson-step-number {
  display: grid;
  place-items: center;
  flex: 0 0 21px;
  height: 21px;
  border: 1px solid rgba(114, 177, 203, .3);
  border-radius: 50%;
  font-size: 10px;
}

.general-atmospheric-circulation-container .lesson-step-button.active {
  color: #ebfbff;
  border-color: rgba(93, 201, 225, .24);
  background: rgba(29, 119, 146, .23);
}

.general-atmospheric-circulation-container .lesson-step-button.active .lesson-step-number {
  border-color: #6edbeb;
  color: #092d3b;
  background: #6edbeb;
  font-weight: 700;
}

.general-atmospheric-circulation-container .lesson-step-button.passed .lesson-step-number {
  color: #82c8d6;
  border-color: rgba(105, 208, 220, .5);
}

.general-atmospheric-circulation-container .lesson-step-navigation {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 4px;
}

.general-atmospheric-circulation-container .lesson-step-navigation button {
  min-height: 36px;
  padding: 8px 10px;
  border: 1px solid rgba(111, 182, 209, .28);
  border-radius: 8px;
  color: #c2d9e4;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  background: rgba(8, 33, 50, .85);
  cursor: pointer;
}

.general-atmospheric-circulation-container .lesson-step-navigation .lesson-next-step {
  border-color: rgba(96, 208, 230, .65);
  color: #f1fcff;
  background: #195e7a;
}

.general-atmospheric-circulation-container .lesson-step-navigation button:disabled {
  opacity: .36;
  cursor: not-allowed;
}

.general-atmospheric-circulation-container .lesson-stage-tab:hover,
.general-atmospheric-circulation-container .lesson-step-button:hover {
  border-color: rgba(113, 215, 234, .52);
}

.general-atmospheric-circulation-container .lesson-stage-tab:focus-visible,
.general-atmospheric-circulation-container .lesson-step-button:focus-visible,
.general-atmospheric-circulation-container .lesson-step-navigation button:focus-visible {
  outline: 2px solid #7edff1;
  outline-offset: 2px;
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
  width: min(224px, calc(100vw - 36px));
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

.general-atmospheric-circulation-container .corner-legend.has-pressure-key {
  width: min(224px, calc(100vw - 36px));
  max-height: none;
  overflow: visible;
}

.general-atmospheric-circulation-container .has-pressure-key .corner-legend-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  align-items: start;
  gap: 8px;
}

.general-atmospheric-circulation-container .has-pressure-key .legend-groups {
  max-height: clamp(180px, 30vh, 280px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(74, 216, 240, .5) transparent;
}

.general-atmospheric-circulation-container .circulation-model-note {
  color: #8aafc2;
  font-size: 10px;
  line-height: 1.4;
  margin: 4px 0 10px;
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

.general-atmospheric-circulation-container .legend-symbol.legend-curved-arrow {
  width: 26px;
  height: 16px;
}

.general-atmospheric-circulation-container .legend-curved-arrow svg {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 1180px) {
  .general-atmospheric-circulation-container .corner-legend {
    left: 12px;
    bottom: 132px;
    width: min(224px, calc(100vw - 24px));
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

.general-atmospheric-circulation-container .scene-label.label-wind-force {
  background: transparent;
  border: 0 !important;
  box-shadow: none;
  padding: 1px 3px !important;
  font-size: 11px !important;
  text-shadow: 0 1px 4px #000, 0 0 7px #001124;
}
</style>
