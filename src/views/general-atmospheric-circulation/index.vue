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
          <div v-show="!isWorldMapView" ref="threeContainerRef" class="scene-host three-host"></div>
          <div v-show="!isWorldMapView" class="labels-overlay" ref="labelsOverlayRef">
            <div v-for="(l, i) in labelScreenData" :key="i" v-show="l.visible" class="scene-label" :class="l.cls"
              :style="{ left: l.x + 'px', top: l.y + 'px' }">{{ l.text }}</div>
          </div>

          <div v-show="isWorldMapView" ref="worldMapHostRef" class="world-map-stage"
            :class="{ 'map-expanded': isMapExpanded }">
            <div class="world-map-frame">
              <div class="world-map-viewport" :class="{ dragging: isMapDragging }">
                <canvas ref="worldMapCanvasRef" class="world-map-canvas" aria-label="Three.js 全球气压、等压线与风场动态地图"></canvas>
              </div>
              <div class="world-map-state-badge">
                <span>{{ currentStage === 3 ? '海陆气压中心' : '全球风场 · 气压驱动' }}</span>
                <strong>{{ monthNames[month] }}</strong>
              </div>
              <div class="world-map-interaction-hint">拖拽平移 · 滚轮缩放</div>
            </div>

            <div class="world-map-legend" aria-label="海平面气压图例">
              <span class="legend-title">海平面气压 / 百帕</span>
              <span class="pressure-scale"></span>
              <span class="legend-values">980　988　996　1004　1012　1020　1028　1036　1044</span>
              <span class="legend-source">NOAA/NCEP · {{ ncepSlpMetadata.climatology }}</span>
            </div>
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
                :style="{ background: item.background, boxShadow: item.glow ? `0 0 9px ${item.glow}` : undefined }"></span>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </div>
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
            <el-switch v-model="layers[l.key]" :disabled="!isLayerAvailable(l.key)" />
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
import { ncepSlpMetadata, sampleNcepSlp, type NcepSlpMonth } from './ncep-slp-climatology'

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
type VerticalDirection = 'up' | 'down'

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

interface PressureBandDefinition {
  id: string
  name: string
  lat: number
  type: PressureType
  halfWidth: number
  color: number
}

interface WindBandDefinition {
  id: string
  name: string
  type: WindType
  hemisphere: Hemisphere
  startLat: number
  endLat: number
  startLonOffset: number
  endLonOffset: number
  color: number
}

interface VerticalFlowDefinition {
  id: string
  lat: number
  direction: VerticalDirection
  color: number
}

interface PressureCenterDefinition {
  id: string
  name: string
  season: SeasonType
  type: PressureType
  lat: number
  lon: number
  radiusDeg: number
  color: number
}

interface MonsoonDefinition {
  id: string
  name: string
  season: SeasonType
  startLat: number
  startLon: number
  endLat: number
  endLon: number
  colorStart: number
  colorEnd: number
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
  mode: 'single' | 'three' | 'wind' | 'monsoon' | 'vertical'
}

interface SceneLabel {
  text: string
  lat: number
  lon: number
  cls: string
  type: 'pressure' | 'wind' | 'cell' | 'vertical' | 'single'
  circulationId?: string
  curveProgress?: number
}

interface ScreenLabel {
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

const pressureBandDefinitions: PressureBandDefinition[] = [
  { id: 'polar-high-north', name: '极地高气压带', lat: 88, type: 'high', halfWidth: 7, color: 0xa6ead8 },
  { id: 'subpolar-low-north', name: '副极地低气压带', lat: 60, type: 'low', halfWidth: 5.5, color: 0xc6b8ff },
  { id: 'subtropical-high-north', name: '副热带高气压带', lat: 30, type: 'high', halfWidth: 5.5, color: 0xa6ead8 },
  { id: 'equatorial-low', name: '赤道低气压带', lat: 0, type: 'low', halfWidth: 7, color: 0xc6b8ff },
  { id: 'subtropical-high-south', name: '副热带高气压带', lat: -30, type: 'high', halfWidth: 5.5, color: 0xa6ead8 },
  { id: 'subpolar-low-south', name: '副极地低气压带', lat: -60, type: 'low', halfWidth: 5.5, color: 0xc6b8ff },
  { id: 'polar-high-south', name: '极地高气压带', lat: -88, type: 'high', halfWidth: 7, color: 0xa6ead8 },
]

const windBandDefinitions: WindBandDefinition[] = [
  {
    id: 'trade-north',
    name: '东北信风带',
    type: 'trade',
    hemisphere: 'north',
    startLat: 28,
    endLat: 5,
    startLonOffset: 14,
    endLonOffset: -14,
    color: 0x2ed9c3,
  },
  {
    id: 'trade-south',
    name: '东南信风带',
    type: 'trade',
    hemisphere: 'south',
    startLat: -28,
    endLat: -5,
    startLonOffset: 14,
    endLonOffset: -14,
    color: 0x2ed9c3,
  },
  {
    id: 'westerly-north',
    name: '北半球盛行西风带',
    type: 'westerly',
    hemisphere: 'north',
    startLat: 32,
    endLat: 58,
    startLonOffset: -14,
    endLonOffset: 14,
    color: 0xffb84d,
  },
  {
    id: 'westerly-south',
    name: '南半球盛行西风带',
    type: 'westerly',
    hemisphere: 'south',
    startLat: -32,
    endLat: -58,
    startLonOffset: -14,
    endLonOffset: 14,
    color: 0xffb84d,
  },
  {
    id: 'polar-east-north',
    name: '北半球极地东风带',
    type: 'polar',
    hemisphere: 'north',
    startLat: 86,
    endLat: 62,
    startLonOffset: 13,
    endLonOffset: -13,
    color: 0x75a7ff,
  },
  {
    id: 'polar-east-south',
    name: '南半球极地东风带',
    type: 'polar',
    hemisphere: 'south',
    startLat: -86,
    endLat: -62,
    startLonOffset: 13,
    endLonOffset: -13,
    color: 0x75a7ff,
  },
]

const verticalFlowDefinitions: VerticalFlowDefinition[] = [
  { id: 'equator-up', lat: 0, direction: 'up', color: 0xff8a3d },
  { id: 'subtropical-north-down', lat: 30, direction: 'down', color: 0x55b9ff },
  { id: 'subtropical-south-down', lat: -30, direction: 'down', color: 0x55b9ff },
  { id: 'subpolar-north-up', lat: 60, direction: 'up', color: 0xffb347 },
  { id: 'subpolar-south-up', lat: -60, direction: 'up', color: 0xffb347 },
  { id: 'polar-north-down', lat: 88, direction: 'down', color: 0x7c8cff },
  { id: 'polar-south-down', lat: -88, direction: 'down', color: 0x7c8cff },
]


const pressureCenterDefinitions: PressureCenterDefinition[] = [
  {
    id: 'july-asian-low',
    name: '7月 亚洲低压',
    season: 'summer',
    type: 'low',
    lat: 25,
    lon: 80,
    radiusDeg: 17,
    color: 0xff667f,
  },
  {
    id: 'july-pacific-high',
    name: '7月 北太平洋副高',
    season: 'summer',
    type: 'high',
    lat: 32,
    lon: -160,
    radiusDeg: 19,
    color: 0xf3c74f,
  },
  {
    id: 'january-asian-high',
    name: '1月 亚洲高压',
    season: 'winter',
    type: 'high',
    lat: 50,
    lon: 100,
    radiusDeg: 20,
    color: 0xe9bf3f,
  },
  {
    id: 'january-aleutian-low',
    name: '1月 阿留申低压',
    season: 'winter',
    type: 'low',
    lat: 52,
    lon: -175,
    radiusDeg: 18,
    color: 0xb56cff,
  },
]

const monsoonDefinitions: MonsoonDefinition[] = [
  {
    id: 'east-asia-summer',
    name: '东亚夏季东南季风',
    season: 'summer',
    startLat: 18,
    startLon: 142,
    endLat: 35,
    endLon: 116,
    colorStart: 0xff4f9a,
    colorEnd: 0xff3158,
  },
  {
    id: 'south-asia-summer',
    name: '南亚夏季西南季风',
    season: 'summer',
    startLat: 7,
    startLon: 62,
    endLat: 25,
    endLon: 84,
    colorStart: 0xc166ff,
    colorEnd: 0x7446ff,
  },
  {
    id: 'east-asia-winter',
    name: '东亚冬季西北季风',
    season: 'winter',
    startLat: 52,
    startLon: 96,
    endLat: 25,
    endLon: 126,
    colorStart: 0xd6ff61,
    colorEnd: 0x66e37a,
  },
]

// 右侧“六个风带”只列风带，不再混入气压带。
const windBelts = [
  { name: '东北信风带', range: '0°~30°N', direction: '东北→西南', icon: '🌬', type: 'trade' },
  { name: '东南信风带', range: '0°~30°S', direction: '东南→西北', icon: '🌬', type: 'trade' },
  { name: '盛行西风带', range: '30°~60°N', direction: '西南→东北', icon: '💨', type: 'westerly' },
  { name: '盛行西风带', range: '30°~60°S', direction: '西北→东南', icon: '💨', type: 'westerly' },
  { name: '极地东风带', range: '60°~90°N', direction: '东北→西南', icon: '❄️', type: 'polar' },
  { name: '极地东风带', range: '60°~90°S', direction: '东南→西北', icon: '❄️', type: 'polar' },
]

const cellLayerDefs = [
  { key: 'hadleyCell', label: '低纬·哈德莱环流', desc: '0°~30°' },
  { key: 'ferrelCell', label: '中纬·费雷尔环流', desc: '30°~60°' },
  { key: 'polarCell', label: '高纬·极地环流', desc: '60°~90°' },
  { key: 'airflowRibbons', label: '烟流气流', desc: '着色器烟雾流线与动态涡动' },
]

const windLayerDefs = [
  { key: 'surfaceWinds', label: '地面风向箭头', desc: '气压梯度·半球偏转·盛行风' },
  { key: 'monsoonWinds', label: '季风动态箭头', desc: '季节性海陆季风路径' },
]

const pressureLayerDefs = [
  { key: 'pressureBands', label: '气压带 / 等压线', desc: '球面气压带·平面连续等值线' },
  { key: 'pressureArrows', label: '垂直烟流气流', desc: '上升暖色·下沉冷色' },
  { key: 'regionalPressureCenters', label: '海陆气压中心', desc: '海陆热力差异形成的高低压' },
]

const otherLayerDefs = [
  { key: 'latLines', label: '经纬网', desc: '经度每15°·回归线·极圈' },
  { key: 'subsolarLine', label: '直射点纬线', desc: '随月份在南北回归线间移动' },
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
      pressureArrows: false,
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
      pressureArrows: false,
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
      pressureArrows: false,
      regionalPressureCenters: false,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'lat-lon',
    shortName: '海陆分布',
    title: '阶段四：海陆分布与气压中心',
    desc: '实际海陆热力差异会使纬向气压带发生断裂，形成块状气压中心和季风环流。',
    points: [
      '7月：亚洲低压、北太平洋副热带高压',
      '1月：亚洲高压、阿留申低压',
      '东亚季风：夏季东南季风、冬季西北季风',
      '南亚夏季盛行西南季风',
    ],
    knowledge: '海陆热力性质差异使部分纬向气压带被分裂为<strong>块状气压中心</strong>。夏季陆地升温快，易形成低压；冬季陆地降温快，易形成高压，并进一步形成季风环流。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: false,
      pressureBands: true,
      pressureArrows: false,
      regionalPressureCenters: true,
      monsoonWinds: false,
      latLines: true,
      subsolarLine: true,
      textAnnotations: true,
    },
  },
  {
    id: 'climate',
    shortName: '季风与气候',
    title: '阶段五：季风环流与气候',
    desc: '在平面世界地图上叠加全球风带与季风环流，观察它们对降水和气候类型的共同影响。',
    points: [
      '低压控制区以上升气流为主，通常较湿润',
      '高压控制区以下沉气流为主，通常较干燥',
      '中纬西风从海洋吹向陆地时可带来水汽',
      '季风区风向随季节改变，降水季节差异显著',
    ],
    knowledge: '<strong>气压带和风带</strong>是全球气候形成的重要因素。赤道低压控制区多对流降水，副热带高压控制区常较干燥，中纬西风可将海洋水汽输送到大陆西岸。',
    layers: {
      earth: true,
      airflowRibbons: true,
      hadleyCell: true,
      ferrelCell: true,
      polarCell: true,
      surfaceWinds: true,
      pressureBands: true,
      pressureArrows: true,
      regionalPressureCenters: true,
      monsoonWinds: true,
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
const worldMapHostRef = ref<HTMLElement | null>(null)
const worldMapCanvasRef = ref<HTMLCanvasElement | null>(null)
let worldMapRenderer: THREE.WebGLRenderer | null = null
let worldMapScene: THREE.Scene | null = null
let worldMapCamera: THREE.OrthographicCamera | null = null
let worldMapControls: OrbitControls | null = null
let worldMapBaseMesh: THREE.Mesh | null = null
let worldMapStaticMesh: THREE.Mesh | null = null
let worldMapDynamicMesh: THREE.Mesh | null = null
let worldMapStaticCanvas: HTMLCanvasElement | null = null
let worldMapDynamicCanvas: HTMLCanvasElement | null = null
let worldMapStaticTexture: THREE.CanvasTexture | null = null
let worldMapDynamicTexture: THREE.CanvasTexture | null = null
const mapZoom = ref(1)
const isMapDragging = ref(false)
const isMapExpanded = ref(false)
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
  pressureArrows: true,
  regionalPressureCenters: true,
  monsoonWinds: true,
  latLines: true,
  subsolarLine: false,
  textAnnotations: true,
})

const currentStage = ref(0)
const isWorldMapView = ref(false)
const stepDone = ref<Record<number, boolean>>({})
const floatingPanelsVisible = ref(true)
const teachingCardCollapsed = ref(true)
const layerCardCollapsed = ref(true)

function toggleFloatingPanelsVisibility() {
  floatingPanelsVisible.value = !floatingPanelsVisible.value
}

watch(teachingCardCollapsed, collapsed => {
  if (!collapsed) {
    layerCardCollapsed.value = true
  }
})

watch(layerCardCollapsed, collapsed => {
  if (!collapsed) {
    teachingCardCollapsed.value = true
  }
})

const currentStageData = computed(() => stages[currentStage.value])
const visibleCellLayerDefs = computed(() => (
  isWorldMapView.value ? [] : cellLayerDefs
))
const visibleWindLayerDefs = computed(() => {
  if (!isWorldMapView.value) return windLayerDefs
  return currentStage.value === 4 ? windLayerDefs : []
})
const visiblePressureLayerDefs = computed(() => (
  isWorldMapView.value
    ? pressureLayerDefs.filter(layer => layer.key !== 'pressureArrows')
    : pressureLayerDefs
))
const visibleOtherLayerDefs = computed(() => otherLayerDefs)

type LegendSymbol = 'dot' | 'line' | 'band' | 'ribbon'
type LegendGroup = {
  title: string
  items: Array<{
    label: string
    symbol: LegendSymbol
    background: string
    glow?: string
  }>
}

const visibleLegendGroups = computed<LegendGroup[]>(() => {
  if (currentStage.value === 0) {
    return [
      {
        title: '理想单圈气流',
        items: [
          { label: '高空：赤道向两极', symbol: 'ribbon', background: 'linear-gradient(90deg, #ff5a47, #ff98c8)', glow: 'rgba(255, 83, 91, 0.62)' },
          { label: '近地面：两极向赤道', symbol: 'ribbon', background: 'linear-gradient(90deg, #72b8ff, #9474ff)', glow: 'rgba(104, 175, 255, 0.62)' },
          { label: '环流透明包络面', symbol: 'band', background: 'linear-gradient(90deg, rgba(122,206,255,.30), rgba(202,178,255,.68))' },
        ],
      },
    ]
  }

  if (currentStage.value < 3) {
    const groups: LegendGroup[] = [
      {
        title: '三圈环流',
        items: [
          { label: '低纬·哈德莱环流', symbol: 'line', background: '#ef4444', glow: 'rgba(239,68,68,.55)' },
          { label: '中纬·费雷尔环流', symbol: 'line', background: '#2ec4b6', glow: 'rgba(46,196,182,.55)' },
          { label: '高纬·极地环流', symbol: 'line', background: '#247cff', glow: 'rgba(36,124,255,.55)' },
          { label: '动态烟流', symbol: 'ribbon', background: 'linear-gradient(90deg, #ff6a58, #bd8cff, #76c7ff)', glow: 'rgba(126,199,255,.48)' },
        ],
      },
    ]
    if (currentStage.value === 2) {
      groups.push({
        title: '风带与气压带',
        items: [
          { label: '信风带', symbol: 'dot', background: '#2ed9c3', glow: 'rgba(46,217,195,.58)' },
          { label: '盛行西风带', symbol: 'dot', background: '#ffb84d', glow: 'rgba(255,184,77,.58)' },
          { label: '极地东风带', symbol: 'dot', background: '#75a7ff', glow: 'rgba(117,167,255,.58)' },
          { label: '低压带', symbol: 'band', background: 'linear-gradient(90deg, #7fa8ff, #4f6fff)' },
          { label: '高压带', symbol: 'band', background: 'linear-gradient(90deg, #ffc067, #ff704d)' },
        ],
      })
    }
    return groups
  }

  const pressureGroups: LegendGroup[] = [
    {
      title: '海平面气压',
      items: [
        { label: '低压等压面', symbol: 'band', background: 'linear-gradient(90deg, #455ce7, #a8ddff)', glow: 'rgba(100,143,255,.42)' },
        { label: '高压等压面', symbol: 'band', background: 'linear-gradient(90deg, #ffc578, #ff5d35)', glow: 'rgba(255,112,58,.42)' },
        { label: '等压线', symbol: 'line', background: '#edf7ff', glow: 'rgba(220,241,255,.42)' },
        { label: '高压中心 H', symbol: 'dot', background: '#ff884f', glow: 'rgba(255,112,58,.72)' },
        { label: '低压中心 L', symbol: 'dot', background: '#5f8fff', glow: 'rgba(82,151,255,.72)' },
      ],
    },
    {
      title: '地图参考线',
      items: [
        { label: '经纬网', symbol: 'line', background: 'linear-gradient(90deg, #2ec4b6, #d3edff)' },
        { label: '太阳直射纬线', symbol: 'line', background: '#ffd654', glow: 'rgba(255,190,38,.60)' },
      ],
    },
  ]

  if (currentStage.value === 3) return pressureGroups

  const summer = month.value >= 4 && month.value <= 8
  return [
    {
      title: '全球盛行风',
      items: [
        { label: '信风', symbol: 'ribbon', background: 'linear-gradient(90deg, #5af0d2, #16b8d4)', glow: 'rgba(46,217,195,.58)' },
        { label: '盛行西风', symbol: 'ribbon', background: 'linear-gradient(90deg, #ffe066, #ff8c42)', glow: 'rgba(255,184,77,.58)' },
        { label: '极地东风', symbol: 'ribbon', background: 'linear-gradient(90deg, #d0f7ff, #4c6fff)', glow: 'rgba(117,167,255,.58)' },
      ],
    },
    {
      title: summer ? '7月季风' : '1月季风',
      items: summer
        ? [
          { label: '东亚东南季风', symbol: 'ribbon', background: 'linear-gradient(90deg, #ff9fcb, #ff315f)', glow: 'rgba(255,79,135,.60)' },
          { label: '南亚西南季风', symbol: 'ribbon', background: 'linear-gradient(90deg, #d8b9ff, #7446ff)', glow: 'rgba(168,117,255,.60)' },
        ]
        : [
          { label: '东亚西北季风', symbol: 'ribbon', background: 'linear-gradient(90deg, #dfff8b, #66e37a)', glow: 'rgba(145,236,109,.60)' },
          { label: '南亚东北季风', symbol: 'ribbon', background: 'linear-gradient(90deg, #b7ffd9, #35c79a)', glow: 'rgba(88,229,178,.60)' },
        ],
    },
    ...pressureGroups,
  ]
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

const pressureLabels: SceneLabel[] = [
  { text: '极地高气压带', lat: 84, lon: -138, cls: 'label-high', type: 'pressure' },
  { text: '副极地低气压带', lat: 60, lon: -138, cls: 'label-low', type: 'pressure' },
  { text: '副热带高气压带', lat: 30, lon: -138, cls: 'label-high', type: 'pressure' },
  { text: '赤道低气压带', lat: 0, lon: -138, cls: 'label-low', type: 'pressure' },
  { text: '副热带高气压带', lat: -30, lon: -42, cls: 'label-high', type: 'pressure' },
  { text: '副极地低气压带', lat: -60, lon: -42, cls: 'label-low', type: 'pressure' },
  { text: '极地高气压带', lat: -84, lon: -42, cls: 'label-high', type: 'pressure' },
]

const windLabels: SceneLabel[] = [
  { text: '东北信风带  ↙', lat: 16, lon: -48, cls: 'label-trade', type: 'wind' },
  { text: '北半球盛行西风带  ↗', lat: 45, lon: -48, cls: 'label-westerly', type: 'wind' },
  { text: '北半球极地东风带', lat: 74, lon: -48, cls: 'label-polar', type: 'wind' },
  { text: '东南信风带  ↖', lat: -16, lon: -132, cls: 'label-trade', type: 'wind' },
  { text: '南半球盛行西风带  ↘', lat: -45, lon: -132, cls: 'label-westerly', type: 'wind' },
  { text: '南半球极地东风带', lat: -74, lon: -132, cls: 'label-polar', type: 'wind' },
]

const verticalLabels: SceneLabel[] = [
  { text: '↑ 上升气流', lat: 0, lon: -112, cls: 'label-vertical-up', type: 'vertical' },
  { text: '↓ 下沉气流', lat: 30, lon: -112, cls: 'label-vertical-down', type: 'vertical' },
  { text: '↑ 上升气流', lat: 60, lon: -112, cls: 'label-vertical-up', type: 'vertical' },
  { text: '↓ 下沉气流', lat: 84, lon: -112, cls: 'label-vertical-down', type: 'vertical' },
  { text: '↓ 下沉气流', lat: -30, lon: -68, cls: 'label-vertical-down', type: 'vertical' },
  { text: '↑ 上升气流', lat: -60, lon: -68, cls: 'label-vertical-up', type: 'vertical' },
  { text: '↓ 下沉气流', lat: -84, lon: -68, cls: 'label-vertical-down', type: 'vertical' },
]

const allLabels = computed<SceneLabel[]>(() => {
  if (simMode.value === 'single') return singleLabels
  return [...pressureLabels, ...windLabels, ...cellLabels, ...verticalLabels]
})

const labelScreenData = ref<ScreenLabel[]>([])

// ==================== Three.js 变量 ====================
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let earthGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let atmosphereMesh: THREE.Group | null = null
let earthWireframe: THREE.LineSegments | null = null

let singleCellRoot: THREE.Group | null = null
let threeCellRoot: THREE.Group | null = null
let circulationLineGroups: Record<ThreeCellType, THREE.Group> | null = null
let circulationAirflowGroups: Record<ThreeCellType, THREE.Group> | null = null
let singleCellAirflowGroup: THREE.Group | null = null
let smokeStreams: SmokeStream[] = []
let circulationDirectionArrows: MovingArrow[] = []
let windDirectionArrows: MovingArrow[] = []
let windFlowMaterials: THREE.ShaderMaterial[] = []
let singleCellArrowMaterials: THREE.ShaderMaterial[] = []
let monsoonFlowMaterials: THREE.ShaderMaterial[] = []
let regionalPressureMaterials: THREE.ShaderMaterial[] = []
let verticalSmokeMaterials: THREE.ShaderMaterial[] = []
let monsoonDirectionArrows: MovingArrow[] = []
let verticalFlowDirectionArrows: MovingArrow[] = []
let fadingGroups: THREE.Group[] = []

let windArrowGroup: THREE.Group | null = null
let pressureBeltGroup: THREE.Group | null = null
let pressureArrowGroup: THREE.Group | null = null
let latLineGroup: THREE.Group | null = null
let subsolarLineGroup: THREE.Group | null = null
let regionalPressureRoot: THREE.Group | null = null
let regionalPressureSummerGroup: THREE.Group | null = null
let regionalPressureWinterGroup: THREE.Group | null = null
let monsoonRoot: THREE.Group | null = null
let monsoonSummerGroup: THREE.Group | null = null
let monsoonWinterGroup: THREE.Group | null = null

let sceneReady = false
let componentDestroyed = false
const DEFAULT_EARTH_ROTATION = THREE.MathUtils.degToRad(-105)
let rotationAngle = DEFAULT_EARTH_ROTATION
let animationId = 0
const clock = new THREE.Clock()
let timeAccum = 0
let lastAppliedSeasonalOffset = Number.NaN
let mapAnimTime = 0 // 2D 地图风向/季风箭头计时器，统一受播放状态与动画倍速控制

// 阶段四、五二维地图统一使用固定的 2:1 地理纹理坐标系。
// 离屏等压面/风场纹理不再跟随网页缩放、侧栏宽度或 DPR 反复改变尺寸，
// 从根源上避免 CanvasTexture 重分配后出现图层漂移或动态箭头暂时丢失。
const WORLD_MAP_TEXTURE_WIDTH = 1600
const WORLD_MAP_TEXTURE_HEIGHT = 800

let threeResizeObserver: ResizeObserver | null = null
let worldMapResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let threeSceneRevealFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
// WebGL 最终显示画布仍需跟踪 CSS 尺寸和 DPR；
// 但地理图层自身已经固定在 WORLD_MAP_TEXTURE_WIDTH × WORLD_MAP_TEXTURE_HEIGHT，
// 显示尺寸变化不会再改变亚洲低压、等压线、季风箭头等的纹理坐标。
let lastWorldMapWidth = 0
let lastWorldMapHeight = 0
let lastWorldMapDpr = 0
let replayTimers: ReturnType<typeof setTimeout>[] = []
let circulationRevealProgress = 0
const defaultCameraPosition = new THREE.Vector3(0, 3.05, 10.25)
// “展开环流”使用与参考图一致的正视镜头：摄像机与目标同高，
// 避免俯视透视，并留足底部空间完整显示南半球包络与控制条。
const closeCameraPosition = new THREE.Vector3(0, 0.12, 9.05)
const mediumCloseCameraPosition = new THREE.Vector3(0, 0.12, 9.8)
const smallCloseCameraPosition = new THREE.Vector3(0, 0.12, 10.7)
const defaultOrbitTarget = new THREE.Vector3(0, 0, 0)
const closeOrbitTarget = new THREE.Vector3(0, 0.12, 0)
let rotationBeforeCloseView = 0
let viewTransitionActive = false
let viewTransitionElapsed = 0
const viewTransitionDuration = 1.45
const viewStartCameraPosition = new THREE.Vector3()
const viewTargetCameraPosition = new THREE.Vector3()
const viewStartOrbitTarget = new THREE.Vector3()
const viewTargetOrbitTarget = new THREE.Vector3()
let viewStartEarthGroupZ = 0
let viewTargetEarthGroupZ = 0
let viewStartEarthMeshY = 0
let viewTargetEarthMeshY = 0

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
  // 阶段一是“无自转”的理想单圈，不做季节位移。
  // 从阶段二开始，三圈环流、气压带、风带统一随月份移动。
  if (currentStage.value === 0) return 0
  const annualAngle = (month.value / 12) * Math.PI * 2
  return -7.5 * Math.cos(annualAngle)
}

/**
 * 太阳直射点纬度：1 月接近南回归线，7 月接近北回归线。
 * 月份索引为 0~11，对应 1~12 月。
 */
function getSubsolarLatitude() {
  const annualAngle = (month.value / 12) * Math.PI * 2
  return -23.5 * Math.cos(annualAngle)
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

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function getResponsiveCloseCameraPosition() {
  if (layoutMode.value === 'small') return smallCloseCameraPosition
  if (layoutMode.value === 'medium') return mediumCloseCameraPosition
  return closeCameraPosition
}

function applyCloseViewImmediately() {
  if (!camera || !orbitControls || !earthGroup || !earthMesh) return

  if (isCloseView.value) {
    camera.position.copy(getResponsiveCloseCameraPosition())
    orbitControls.target.copy(closeOrbitTarget)
    earthGroup.rotation.z = Math.PI / 2
    earthMesh.rotation.y = Math.PI / 2
  } else {
    camera.position.copy(defaultCameraPosition)
    orbitControls.target.copy(defaultOrbitTarget)
    earthGroup.rotation.z = 0
    earthMesh.rotation.y = rotationAngle
  }

  orbitControls.update()
}

function startCloseViewTransition() {
  if (!camera || !orbitControls || !earthGroup || !earthMesh) return

  viewTransitionActive = true
  viewTransitionElapsed = 0
  orbitControls.enabled = false

  viewStartCameraPosition.copy(camera.position)
  viewStartOrbitTarget.copy(orbitControls.target)
  viewStartEarthGroupZ = earthGroup.rotation.z
  viewStartEarthMeshY = earthMesh.rotation.y

  if (isCloseView.value) {
    rotationBeforeCloseView = earthMesh.rotation.y
    viewTargetCameraPosition.copy(getResponsiveCloseCameraPosition())
    viewTargetOrbitTarget.copy(closeOrbitTarget)

    // 先把经线剖面从侧面转到正对摄像机，再沿屏幕 Z 轴旋转 90°。
    // 极轴因此水平展开：北极在左、南极在右、赤道上升支位于正上方。
    viewTargetEarthMeshY = Math.PI / 2
    viewTargetEarthGroupZ = Math.PI / 2
  } else {
    viewTargetCameraPosition.copy(defaultCameraPosition)
    viewTargetOrbitTarget.copy(defaultOrbitTarget)
    viewTargetEarthMeshY = rotationBeforeCloseView
    viewTargetEarthGroupZ = 0
  }
}

function toggleCloseView() {
  setCloseViewState(!isCloseView.value)
}

function handleViewModeToggle() {
  if (currentStage.value >= 3) {
    // 阶段四、五始终使用二维 PlaneGeometry，不提供三维回切入口。
    isWorldMapView.value = true
    scheduleFlatMapDraw()
    return
  }

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

  const continents: number[][][] = [
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

/**
 * 两层贴地大气：柔和表面薄雾与明亮青蓝内缘。
 * 不再使用包住整颗地球的深蓝透明外球。
 */
function createAtmosphereMesh() {
  const group = new THREE.Group()
  group.name = 'earth-atmosphere-layers'

  const createShell = (options: {
    radiusScale: number
    innerColor: number
    outerColor: number
    opacity: number
    power: number
    rimStart: number
    baseHaze: number
    capHaze: number
    upperBias: number
    side: THREE.Side
    blending: THREE.Blending
  }) => {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS * options.radiusScale, 128, 96)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uInnerColor: { value: new THREE.Color(options.innerColor) },
        uOuterColor: { value: new THREE.Color(options.outerColor) },
        uOpacity: { value: options.opacity },
        uPower: { value: options.power },
        uRimStart: { value: options.rimStart },
        uBaseHaze: { value: options.baseHaze },
        uCapHaze: { value: options.capHaze },
        uUpperBias: { value: options.upperBias },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uInnerColor;
        uniform vec3 uOuterColor;
        uniform float uOpacity;
        uniform float uPower;
        uniform float uRimStart;
        uniform float uBaseHaze;
        uniform float uCapHaze;
        uniform float uUpperBias;

        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float rim = clamp(1.0 - abs(dot(normalize(vWorldNormal), viewDirection)), 0.0, 1.0);
          float glow = pow(smoothstep(uRimStart, 1.0, rim), uPower);
          float haze = smoothstep(0.02, 0.72, rim) * uBaseHaze;
          float capHaze = smoothstep(-0.18, 0.88, normalize(vWorldNormal).y) * uCapHaze;
          float upperLight = mix(
            1.0,
            0.72 + 0.28 * smoothstep(-0.35, 0.90, normalize(vWorldNormal).y),
            uUpperBias
          );
          vec3 color = mix(uInnerColor, uOuterColor, smoothstep(0.35, 0.96, rim));
          float alpha = (glow + haze + capHaze) * uOpacity * upperLight;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: options.blending,
      side: options.side,
    })

    return new THREE.Mesh(geometry, material)
  }

  const surfaceHaze = createShell({
    radiusScale: 1.016,
    innerColor: 0x143c76,
    outerColor: 0x55b9ff,
    opacity: 0.42,
    power: 0.88,
    rimStart: 0.0,
    baseHaze: 0.34,
    capHaze: 0.24,
    upperBias: 0.72,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
  })
  surfaceHaze.name = 'earth-atmosphere-surface-haze'
  surfaceHaze.renderOrder = 1

  const innerRim = createShell({
    radiusScale: 1.028,
    innerColor: 0xe9fbff,
    outerColor: 0x46c8ff,
    opacity: 0.94,
    power: 1.72,
    rimStart: 0.06,
    baseHaze: 0.06,
    capHaze: 0.0,
    upperBias: 0.45,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  })
  innerRim.name = 'earth-atmosphere-inner-rim'
  innerRim.renderOrder = 1

  group.add(surfaceHaze, innerRim)
  return group
}

// ==================== 环流闭合曲线 ====================
class AtmosphericCellCurve extends THREE.Curve<THREE.Vector3> {
  private readonly smoothCurve: THREE.CatmullRomCurve3

  constructor(
    definition: CirculationDefinition,
    centerLon: number,
    latitudeOffset = 0,
  ) {
    super()

    const surfaceFromLat = shiftLatitude(definition.surfaceFromLat, latitudeOffset)
    const surfaceToLat = shiftLatitude(definition.surfaceToLat, latitudeOffset)
    const riseLat = shiftLatitude(definition.riseLat, latitudeOffset)
    const upperFromLat = shiftLatitude(definition.upperFromLat, latitudeOffset)
    const upperToLat = shiftLatitude(definition.upperToLat, latitudeOffset)
    const sinkLat = shiftLatitude(definition.sinkLat, latitudeOffset)

    const surfaceRadius = EARTH_RADIUS + 0.09

    const upperHeightByType: Record<CellType, number> = {
      single: 0.95,
      hadley: 0.78,
      ferrel: 0.68,
      polar: 0.76,
    }

    const upperRadius = EARTH_RADIUS + upperHeightByType[definition.type]
    const middleRadius = THREE.MathUtils.lerp(surfaceRadius, upperRadius, 0.5)

    const point = (lat: number, radius: number) =>
      latLonToVec3(lat, centerLon, radius)

    /*
     * 按真实气流方向组织控制点：
     * 近地面支 → 上升圆角 → 高空支 → 下沉圆角 → 起点。
     * 在升降转折处同时改变纬度和半径，再交给闭合 CatmullRomCurve3
     * 做连续切线插值，避免“直角”和分段折线感。
     */
    const controls = [
      point(surfaceFromLat, surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.28), surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.68), surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.93), surfaceRadius + 0.025),

      point(riseLat, surfaceRadius + (upperRadius - surfaceRadius) * 0.16),
      point(riseLat, middleRadius),
      point(riseLat, upperRadius - (upperRadius - surfaceRadius) * 0.16),

      point(lerpValue(upperFromLat, upperToLat, 0.07), upperRadius - 0.025),
      point(lerpValue(upperFromLat, upperToLat, 0.34), upperRadius),
      point(lerpValue(upperFromLat, upperToLat, 0.72), upperRadius),
      point(lerpValue(upperFromLat, upperToLat, 0.94), upperRadius - 0.025),

      point(sinkLat, upperRadius - (upperRadius - surfaceRadius) * 0.16),
      point(sinkLat, middleRadius),
      point(sinkLat, surfaceRadius + (upperRadius - surfaceRadius) * 0.16),

      point(lerpValue(sinkLat, surfaceFromLat, 0.82), surfaceRadius + 0.025),
    ]

    this.smoothCurve = new THREE.CatmullRomCurve3(
      controls,
      true,
      'centripetal',
      0.5,
    )

    this.smoothCurve.arcLengthDivisions = definition.type === 'single' ? 720 : 540
    this.arcLengthDivisions = definition.type === 'single' ? 720 : 540
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.smoothCurve.getPointAt(((t % 1) + 1) % 1))
  }
}

class SurfaceWindCurve extends THREE.Curve<THREE.Vector3> {
  private readonly windType: WindType
  private readonly startLat: number
  private readonly endLat: number
  private readonly startLon: number
  private readonly endLon: number
  private readonly radius: number

  constructor(
    definition: WindBandDefinition,
    baseLon: number,
    latitudeOffset = 0,
  ) {
    super()
    this.windType = definition.type

    // 保留风带代表路径的大部分长度，让箭头在地球上形成清晰的弧形流线。
    const startRatio = 0.08
    const endRatio = 0.92

    this.startLat = shiftLatitude(
      lerpValue(definition.startLat, definition.endLat, startRatio),
      latitudeOffset,
    )
    this.endLat = shiftLatitude(
      lerpValue(definition.startLat, definition.endLat, endRatio),
      latitudeOffset,
    )

    this.startLon = normalizeLon(
      definition.type === 'polar'
        ? baseLon + 24
        : baseLon + lerpValue(definition.startLonOffset, definition.endLonOffset, startRatio),
    )
    this.endLon = normalizeLon(
      definition.type === 'polar'
        ? baseLon - 24
        : baseLon + lerpValue(definition.startLonOffset, definition.endLonOffset, endRatio),
    )

    this.radius = EARTH_RADIUS + 0.070
    this.arcLengthDivisions = 100
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const progress = smoothstep01(t)
    const deltaLat = this.endLat - this.startLat
    const deltaLon = THREE.MathUtils.euclideanModulo(
      this.endLon - this.startLon + 180,
      360,
    ) - 180
    const directionLength = Math.hypot(deltaLat, deltaLon) || 1
    const curveOffset = Math.sin(progress * Math.PI) * (this.windType === 'polar' ? 2.2 : 4.6)
    const lat = lerpValue(this.startLat, this.endLat, progress)
      + (-deltaLon / directionLength) * curveOffset
    const lon = normalizeLon(
      this.startLon
      + deltaLon * progress
      + (deltaLat / directionLength) * curveOffset,
    )
    const radialExpansion = this.windType === 'polar'
      ? Math.sin(progress * Math.PI) * 0.075
      : 0
    return target.copy(latLonToVec3(lat, lon, this.radius + radialExpansion))
  }
}

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
 * 箭头沿内缩后的闭合曲线运动，并始终平躺在经向剖面内，避免贴在包络边缘。
 */
function createMovingInsetCirculationArrow(
  baseCurve: THREE.Curve<THREE.Vector3>,
  definition: CirculationDefinition,
  progress: number,
  phase: number,
  mode: 'single' | 'three',
) {
  const sizing = getInsetCirculationArrowSize(definition)
  const curve = createInsetCirculationCurve(baseCurve, sizing.insetScale)
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
  mesh.material.uniforms.uOpacity.value = opacity * Math.min(grown, endFade)
  mesh.visible = mesh.material.uniforms.uOpacity.value > 0.015
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

  const headStart = shaftSamples * 2
  along[(shaftSamples - 1) * 2] = 0.74
  along[(shaftSamples - 1) * 2 + 1] = 0.74
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
  arrow.userData.curvePlaneArrowShaftHalfWidth = options.shaftHalfWidth
  arrow.userData.curvePlaneArrowHeadHalfWidth = options.headHalfWidth

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
  const shaftHalfWidth = item.mesh.userData.curvePlaneArrowShaftHalfWidth as number
  const headHalfWidth = item.mesh.userData.curvePlaneArrowHeadHalfWidth as number
  const headProgress = item.progress
  const tailProgress = headProgress - span
  const shoulderProgress = headProgress - span * 0.27
  const positionAttribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
  let localCameraPosition = camera
    ? camera.position.clone()
    : new THREE.Vector3(0, 0, 4)

  if (camera && earthMesh) {
    earthMesh.updateWorldMatrix(true, false)
    localCameraPosition = earthMesh.worldToLocal(localCameraPosition)
  }

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
    const toCamera = localCameraPosition.clone().sub(source).normalize()
    let side = new THREE.Vector3().crossVectors(toCamera, tangent)

    // 宽面朝向观察者，避免箭头像垂直地表的薄片。
    // 升降支与视线近乎平行时，退回经向剖面内的稳定宽度方向。
    if (side.lengthSq() < 0.0001) {
      const horizontalRadial = new THREE.Vector3(source.x, 0, source.z)
      if (horizontalRadial.lengthSq() < 0.0001) horizontalRadial.set(0, 0, 1)
      horizontalRadial.normalize()
      const planeNormal = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), horizontalRadial)
        .normalize()
      side = new THREE.Vector3().crossVectors(planeNormal, tangent)
    }
    side.normalize()
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
  setPlanePoint(headStart, shoulderProgress, headHalfWidth, 1)
  setPlanePoint(headStart + 1, shoulderProgress, headHalfWidth, -1)
  setPlanePoint(headStart + 2, headProgress, 0, 0)
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
    boundaryPoints[0],
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
    const latitude = centerLatitude + (latitudes[index] - centerLatitude) * latitudeScale
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

  // 半透明实体面填满整个闭合剖面；烟流使用内缩曲线，始终位于包络内部。
  group.add(createCirculationEnvelope(curve, mode))

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
      if (section.fullEffect) {
        airflowGroup.add(createSmokeBundle(definition, curve, 'single'))
      } else {
        airflowGroup.add(createCirculationEnvelope(curve, 'single'))
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

      if (section.fullEffect) {
        airflowGroups[definition.type].add(
          createSmokeBundle(definition, curve, 'three'),
        )
      } else {
        airflowGroups[definition.type].add(
          createCirculationEnvelope(curve, 'three'),
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

// ==================== 透明 Canvas 贴图标签 ====================
function createCanvasTextSprite(
  title: string,
  accent: number,
  options: {
    badge?: string
    fontSize?: number
    paddingX?: number
    paddingY?: number
    scaleY?: number
  } = {},
) {
  const fontSize = options.fontSize ?? 28
  const paddingX = options.paddingX ?? 20
  const paddingY = options.paddingY ?? 12
  const badgeGap = options.badge ? 34 : 0

  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) return new THREE.Sprite()

  measureContext.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
  const textWidth = Math.ceil(measureContext.measureText(title).width)
  const width = Math.max(96, textWidth + paddingX * 2 + badgeGap)
  const height = fontSize + paddingY * 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Sprite()

  const color = new THREE.Color(accent)
  const rgb = `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`

  context.clearRect(0, 0, width, height)
  context.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  let textX = paddingX
  if (options.badge) {
    context.font = `800 ${Math.round(fontSize * 0.84)}px sans-serif`
    context.fillStyle = `rgba(${rgb}, 0.98)`
    context.textAlign = 'center'
    context.fillText(options.badge, paddingX + 12, height / 2)
    textX += badgeGap
  }

  context.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
  context.textAlign = 'left'
  context.lineWidth = Math.max(3, fontSize * 0.13)
  context.strokeStyle = 'rgba(0, 7, 20, 0.92)'
  context.fillStyle = `rgba(${rgb}, 0.98)`
  context.shadowColor = `rgba(${rgb}, 0.68)`
  context.shadowBlur = 7
  context.strokeText(title, textX, height / 2)
  context.fillText(title, textX, height / 2)
  context.shadowBlur = 0

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  })

  const sprite = new THREE.Sprite(material)
  const scaleY = options.scaleY ?? 0.21
  const aspect = width / height
  sprite.scale.set(scaleY * aspect, scaleY, 1)
  sprite.renderOrder = 12
  sprite.userData.annotationSprite = true
  return sprite
}

// ==================== 七个气压带 ====================
function createLatitudeBandMesh(
  definition: PressureBandDefinition,
  latitudeOffset = 0,
) {
  const centerLat = shiftLatitude(definition.lat, latitudeOffset)
  const latMin = clamp(centerLat - definition.halfWidth, -90, 90)
  const latMax = clamp(centerLat + definition.halfWidth, -90, 90)

  const phiStart = THREE.MathUtils.degToRad(90 - latMax)
  const phiLength = THREE.MathUtils.degToRad(latMax - latMin)

  const group = new THREE.Group()
  group.userData.pressureBandId = definition.id
  group.userData.pressureType = definition.type

  const createBandMaterial = (opacity: number, additive = false) => new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(definition.color) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        float edgeDistance = min(vUv.y, 1.0 - vUv.y);
        float feather = smoothstep(0.0, 0.17, edgeDistance);
        float edgeGlow = 1.0 - smoothstep(0.0, 0.10, edgeDistance);
        vec3 color = mix(uColor, vec3(0.92, 0.98, 1.0), edgeGlow * 0.42);
        float alpha = uOpacity * (0.42 + feather * 0.58 + edgeGlow * 0.32);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  })

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(
      EARTH_RADIUS + 0.028,
      144,
      12,
      0,
      Math.PI * 2,
      phiStart,
      phiLength,
    ),
    createBandMaterial(definition.id === 'equatorial-low' ? 0.34 : 0.27),
  )
  core.renderOrder = 2
  group.add(core)

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(
      EARTH_RADIUS + 0.052,
      144,
      8,
      0,
      Math.PI * 2,
      phiStart,
      phiLength,
    ),
    createBandMaterial(0.10, true),
  )
  halo.renderOrder = 3
  group.add(halo)

  const edgeColor = new THREE.Color(definition.color).lerp(new THREE.Color(0xe9fbff), 0.42)
    ;[latMin, latMax].forEach(latitude => {
      const points = Array.from({ length: 145 }, (_, index) => {
        const longitude = -180 + index * 2.5
        return latLonToVec3(latitude, longitude, EARTH_RADIUS + 0.058)
      })
      const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5)
      const edge = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 192, 0.0065, 6, true),
        new THREE.MeshBasicMaterial({
          color: edgeColor,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
        }),
      )
      edge.renderOrder = 4
      group.add(edge)
    })

  return group
}

function createSurfaceTextDecal(
  text: string,
  lat: number,
  lon: number,
  colorValue: number,
  options: {
    fontSize?: number
    worldHeight?: number
    radiusOffset?: number
  } = {},
) {
  const fontSize = options.fontSize ?? 26
  const paddingX = 18
  const paddingY = 10
  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) return new THREE.Group()

  measureContext.font = `800 ${fontSize}px "Microsoft YaHei", sans-serif`
  const width = Math.ceil(measureContext.measureText(text).width + paddingX * 2)
  const height = fontSize + paddingY * 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Group()

  const color = new THREE.Color(colorValue)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  context.clearRect(0, 0, width, height)
  context.font = `800 ${fontSize}px "Microsoft YaHei", sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(3, fontSize * 0.14)
  context.strokeStyle = 'rgba(0, 7, 20, 0.94)'
  context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`
  context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.72)`
  context.shadowBlur = 8
  context.strokeText(text, width / 2, height / 2)
  context.fillText(text, width / 2, height / 2)
  context.shadowBlur = 0

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const worldHeight = options.worldHeight ?? 0.20
  const worldWidth = worldHeight * (width / height)
  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  const radius = EARTH_RADIUS + (options.radiusOffset ?? 0.050)
  const position = latLonToVec3(lat, lon, radius)
  const normal = position.clone().normalize()

  let east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal)
  if (east.lengthSq() < 0.0001) {
    east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), normal)
  }
  east.normalize()
  const north = new THREE.Vector3().crossVectors(normal, east).normalize()
  const basis = new THREE.Matrix4().makeBasis(east, north, normal)

  mesh.position.copy(position)
  mesh.quaternion.setFromRotationMatrix(basis)
  mesh.renderOrder = 7
  mesh.userData.surfaceTextDecal = true
  return mesh
}

function createPressureBandTextTexture(latitudeOffset = 0) {
  const width = 4096
  const height = 2048
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    return new THREE.CanvasTexture(canvas)
  }

  context.clearRect(0, 0, width, height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  pressureBandDefinitions
    .filter(definition => Math.abs(shiftLatitude(definition.lat, latitudeOffset)) <= 75)
    .forEach(definition => {
      const shiftedLat = shiftLatitude(definition.lat, latitudeOffset)
      const y = (90 - shiftedLat) / 180 * height
      const textColor = new THREE.Color(definition.color)
      const r = Math.round(textColor.r * 255)
      const g = Math.round(textColor.g * 255)
      const b = Math.round(textColor.b * 255)
      const badge = definition.type === 'high' ? 'H' : 'L'
      const title = `${badge}  ${definition.name}`
      const repeatLongitudes = [-150, -60, 30, 120]

      context.font = '700 42px "Microsoft YaHei", sans-serif'
      context.lineWidth = 8
      context.strokeStyle = 'rgba(0, 8, 22, 0.88)'
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.96)`
      context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.78)`
      context.shadowBlur = 14

      repeatLongitudes.forEach(lon => {
        const x = (lon + 180) / 360 * width
        context.strokeText(title, x, y)
        context.fillText(title, x, y)
      })
    })

  context.shadowBlur = 0

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function createPressureBandTextOverlay(latitudeOffset = 0) {
  const texture = createPressureBandTextTexture(latitudeOffset)
  const geometry = new THREE.SphereGeometry(
    EARTH_RADIUS + 0.042,
    128,
    64,
  )

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.015,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'pressure-band-text-canvas-texture'
  mesh.renderOrder = 4
  mesh.userData.pressureBandTextOverlay = true
  return mesh
}

function createPressureBands(latitudeOffset = 0) {
  const group = new THREE.Group()
  group.name = 'pressure-bands'

  pressureBandDefinitions.forEach(definition => {
    group.add(createLatitudeBandMesh(definition, latitudeOffset))
  })

  return group
}

// ==================== 六个风带 ====================
function getWindGradient(definition: WindBandDefinition) {
  if (definition.type === 'trade') {
    return {
      start: new THREE.Color(0x5af0d2),
      end: new THREE.Color(0x16b8d4),
    }
  }

  if (definition.type === 'westerly') {
    return {
      start: new THREE.Color(0xffe066),
      end: new THREE.Color(0xff8c42),
    }
  }

  return {
    start: new THREE.Color(0xd0f7ff),
    end: new THREE.Color(0x4c6fff),
  }
}

function createFlowRibbonMaterial(
  colorStart: THREE.Color,
  colorEnd: THREE.Color,
  phase: number,
  opacity: number,
  registry: THREE.ShaderMaterial[],
) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: colorStart },
      uColorEnd: { value: colorEnd },
      uTime: { value: 0 },
      uPhase: { value: phase },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;

      varying vec2 vUv;

      void main() {
        vec3 gradientColor = mix(
          uColorStart,
          uColorEnd,
          smoothstep(0.02, 0.98, vUv.x)
        );

        float centerHighlight = pow(
          max(0.0, cos((vUv.y - 0.5) * 3.14159265359)),
          3.0
        );
        float sweepPosition = fract(uTime * 0.16 + uPhase);
        float sweepDistance = abs(vUv.x - sweepPosition);
        sweepDistance = min(sweepDistance, 1.0 - sweepDistance);
        float movingHighlight = exp(-pow(sweepDistance * 11.0, 2.0));
        float roundedEnds = smoothstep(0.0, 0.045, vUv.x)
          * (1.0 - smoothstep(0.93, 1.0, vUv.x));

        vec3 color = mix(gradientColor, vec3(1.0), centerHighlight * 0.16);
        color += vec3(1.0) * movingHighlight * 0.18;
        float alpha = uOpacity
          * roundedEnds
          * (0.80 + centerHighlight * 0.20 + movingHighlight * 0.18);

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  })

  registry.push(material)
  return material
}

function createSphericalFlowArrow(
  curve: THREE.Curve<THREE.Vector3>,
  colorStart: THREE.Color,
  colorEnd: THREE.Color,
  options: {
    shaftRadius: number
    headRadius: number
    headLength: number
    opacity: number
    phase: number
    renderOrder: number
    registry: THREE.ShaderMaterial[]
  },
) {
  const group = new THREE.Group()
  const glowColor = colorStart.clone().lerp(colorEnd, 0.58)

  const glow = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 84, options.shaftRadius * 1.85, 14, false),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )
  glow.renderOrder = options.renderOrder - 1
  group.add(glow)

  const shaft = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 96, options.shaftRadius, 16, false),
    createFlowRibbonMaterial(
      colorStart,
      colorEnd,
      options.phase,
      options.opacity,
      options.registry,
    ),
  )
  shaft.renderOrder = options.renderOrder
  group.add(shaft)

  const endPosition = curve.getPointAt(1)
  const endTangent = curve.getTangentAt(1).normalize()

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(
      options.headRadius,
      options.headLength,
      20,
      1,
      false,
    ),
    new THREE.MeshBasicMaterial({
      color: colorEnd,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    }),
  )
  head.position.copy(endPosition).addScaledVector(endTangent, options.headLength * 0.30)
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endTangent)
  head.renderOrder = options.renderOrder + 1
  group.add(head)

  const glowHead = new THREE.Mesh(
    new THREE.ConeGeometry(
      options.headRadius * 1.34,
      options.headLength * 1.18,
      20,
      1,
      false,
    ),
    new THREE.MeshBasicMaterial({
      color: colorEnd,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    }),
  )
  glowHead.position.copy(head.position)
  glowHead.quaternion.copy(head.quaternion)
  glowHead.renderOrder = options.renderOrder
  group.add(glowHead)

  const tail = new THREE.Mesh(
    new THREE.SphereGeometry(options.shaftRadius * 1.05, 14, 10),
    new THREE.MeshBasicMaterial({
      color: colorStart,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  )
  tail.position.copy(curve.getPointAt(0))
  tail.renderOrder = options.renderOrder
  group.add(tail)

  group.renderOrder = options.renderOrder
  return group
}

function createPlanarFlowArrow(
  colorStart: THREE.Color,
  colorEnd: THREE.Color,
  options: {
    length: number
    shaftWidth: number
    headWidth: number
    headLength: number
    opacity: number
    phase: number
    renderOrder: number
    registry: THREE.ShaderMaterial[]
  },
) {
  const shape = new THREE.Shape()
  const shaftHalf = options.shaftWidth * 0.5
  const headHalf = options.headWidth * 0.5
  const shoulderY = options.length - options.headLength

  shape.moveTo(-shaftHalf, 0)
  shape.lineTo(shaftHalf, 0)
  shape.lineTo(shaftHalf, shoulderY)
  shape.lineTo(headHalf, shoulderY)
  shape.lineTo(0, options.length)
  shape.lineTo(-headHalf, shoulderY)
  shape.lineTo(-shaftHalf, shoulderY)
  shape.closePath()

  const geometry = new THREE.ShapeGeometry(shape, 12)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: colorStart },
      uColorEnd: { value: colorEnd },
      uTime: { value: 0 },
      uPhase: { value: options.phase },
      uOpacity: { value: options.opacity },
      uLength: { value: options.length },
    },
    vertexShader: `
      uniform float uLength;
      varying float vAlong;

      void main() {
        vAlong = clamp(position.y / uLength, 0.0, 1.0);
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
        vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.02, 0.96, vAlong));
        float sweep = fract(uTime * 0.34 + uPhase);
        float highlight = exp(-pow((vAlong - sweep) * 12.0, 2.0));
        float tailFeather = smoothstep(0.0, 0.16, vAlong);
        color = mix(color, vec3(1.0), highlight * 0.42);
        gl_FragColor = vec4(color, uOpacity * tailFeather * (0.90 + highlight * 0.10));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  })
  options.registry.push(material)

  const group = new THREE.Group()
  const glow = new THREE.Mesh(
    geometry.clone(),
    new THREE.MeshBasicMaterial({
      color: colorStart.clone().lerp(colorEnd, 0.62),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  glow.scale.set(1.35, 1.10, 1)
  glow.position.z = -0.003
  glow.renderOrder = options.renderOrder - 1

  const arrow = new THREE.Mesh(geometry, material)
  arrow.renderOrder = options.renderOrder
  group.add(glow, arrow)
  group.renderOrder = options.renderOrder
  group.userData.planarFlowArrow = true
  return group
}

function createWindSurfaceArrow(
  definition: WindBandDefinition,
  baseLon: number,
  latitudeOffset = 0,
) {
  const group = new THREE.Group()
  const curve = new SurfaceWindCurve(definition, baseLon, latitudeOffset)
  const gradient = getWindGradient(definition)

  const progress = 0.12 + THREE.MathUtils.euclideanModulo(baseLon + 176, 192) / 192 * 0.60
  const result = createMovingSphericalSurfaceArrow(curve, progress, {
    colorStart: gradient.start,
    colorEnd: gradient.end,
    phase: (baseLon + 180) / 360,
    opacity: 0.93,
    span: definition.type === 'polar' ? 0.34 : 0.31,
    shaftHalfWidth: definition.type === 'polar' ? 0.040 : 0.037,
    headHalfWidth: definition.type === 'trade' ? 0.112 : definition.type === 'polar' ? 0.116 : 0.105,
    speed: definition.type === 'westerly' ? 0.092 : 0.105,
    loopStart: 0.10,
    loopEnd: 0.90,
    mode: 'wind',
    renderOrder: 8,
    registry: windFlowMaterials,
  })
  group.add(result.arrow)
  windDirectionArrows.push(result.item)

  group.userData.windBandId = definition.id
  return group
}

function createWindArrows(latitudeOffset = 0) {
  const group = new THREE.Group()
  group.name = 'surface-wind-arrows'

  windBandDefinitions.forEach(definition => {
    for (let baseLon = -176; baseLon <= 176; baseLon += 32) {
      group.add(createWindSurfaceArrow(definition, baseLon, latitudeOffset))
    }
  })

  registerFadingGroup(group, 0)
  return group
}

// ==================== 阶段四：海陆气压中心与季风 ====================
class MonsoonCurve extends THREE.Curve<THREE.Vector3> {
  private readonly definition: MonsoonDefinition

  constructor(definition: MonsoonDefinition) {
    super()
    this.definition = definition
    this.arcLengthDivisions = 160
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const progress = smoothstep01(t)
    const deltaLat = this.definition.endLat - this.definition.startLat
    const deltaLon = THREE.MathUtils.euclideanModulo(
      this.definition.endLon - this.definition.startLon + 180,
      360,
    ) - 180
    const directionLength = Math.hypot(deltaLat, deltaLon) || 1
    const curveOffset = Math.sin(progress * Math.PI) * 5.2
    const lat = lerpValue(
      this.definition.startLat,
      this.definition.endLat,
      progress,
    ) + (-deltaLon / directionLength) * curveOffset

    const lon = normalizeLon(
      this.definition.startLon
      + deltaLon * progress
      + (deltaLat / directionLength) * curveOffset,
    )

    return target.copy(
      latLonToVec3(lat, lon, EARTH_RADIUS + 0.090),
    )
  }
}

function createSphericalPatchGeometry(
  lat: number,
  lon: number,
  angularRadiusDeg: number,
) {
  const source = new THREE.CircleGeometry(1, 72)
  const position = source.getAttribute('position') as THREE.BufferAttribute
  const centerNormal = latLonToVec3(lat, lon, 1).normalize()
  const reference = Math.abs(centerNormal.y) > 0.92
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0)
  const tangent = new THREE.Vector3().crossVectors(reference, centerNormal).normalize()
  const bitangent = new THREE.Vector3().crossVectors(centerNormal, tangent).normalize()
  const radius = THREE.MathUtils.degToRad(angularRadiusDeg)

  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index)
    const y = position.getY(index)
    const mapped = centerNormal
      .clone()
      .addScaledVector(tangent, Math.tan(x * radius))
      .addScaledVector(bitangent, Math.tan(y * radius * 0.78))
      .normalize()
      .multiplyScalar(EARTH_RADIUS + 0.038)

    position.setXYZ(index, mapped.x, mapped.y, mapped.z)
  }

  position.needsUpdate = true
  source.computeVertexNormals()
  return source
}

function createRegionalPressureMaterial(definition: PressureCenterDefinition) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(definition.color) },
      uTime: { value: 0 },
      uHigh: { value: definition.type === 'high' ? 1 : 0 },
      uOpacity: { value: 0.78 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uHigh;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float distanceToCenter = length(p);
        float radialFade = 1.0 - smoothstep(0.18, 1.0, distanceToCenter);
        float ring = exp(-pow((distanceToCenter - 0.48) * 5.2, 2.0));
        float pulse = 0.72 + 0.28 * sin(uTime * 1.7 + distanceToCenter * 10.0);
        float density = mix(radialFade, ring * 0.85 + radialFade * 0.42, uHigh);
        float alpha = uOpacity * density * pulse;
        if (alpha < 0.015) discard;
        vec3 color = mix(uColor * 0.72, vec3(1.0), ring * 0.30 + pulse * 0.10);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })

  regionalPressureMaterials.push(material)
  return material
}

function createRegionalPressureTextTexture(season: SeasonType) {
  const width = 4096
  const height = 2048
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  context.clearRect(0, 0, width, height)
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  pressureCenterDefinitions
    .filter(definition => definition.season === season)
    .forEach(definition => {
      const x = (normalizeLon(definition.lon) + 180) / 360 * width
      const y = (90 - definition.lat) / 180 * height
      const textColor = new THREE.Color(definition.color)
      const r = Math.round(textColor.r * 255)
      const g = Math.round(textColor.g * 255)
      const b = Math.round(textColor.b * 255)
      const badge = definition.type === 'high' ? 'H' : 'L'
      const title = `${badge}  ${definition.name.replace(/^\d+月\s*/, '')}`

      context.font = '700 40px "Microsoft YaHei", sans-serif'
      const textWidth = context.measureText(title).width
      const drawX = x - textWidth / 2

        ;[-width, 0, width].forEach(wrap => {
          context.lineWidth = 8
          context.strokeStyle = 'rgba(0, 7, 18, 0.92)'
          context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`
          context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.86)`
          context.shadowBlur = 14
          context.strokeText(title, drawX + wrap, y)
          context.fillText(title, drawX + wrap, y)
        })
    })

  context.shadowBlur = 0
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function createRegionalPressureTextOverlay(season: SeasonType) {
  const texture = createRegionalPressureTextTexture(season)
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS + 0.067, 128, 64)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.015,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `${season}-regional-pressure-text-texture`
  mesh.renderOrder = 8
  mesh.userData.regionalPressureTextOverlay = true
  return mesh
}

function createPressureCenterObject(definition: PressureCenterDefinition) {
  const group = new THREE.Group()
  const patch = new THREE.Mesh(
    createSphericalPatchGeometry(
      definition.lat,
      definition.lon,
      definition.radiusDeg,
    ),
    createRegionalPressureMaterial(definition),
  )
  patch.renderOrder = 5
  group.add(patch)

  group.userData.season = definition.season
  group.userData.pressureCenterId = definition.id
  return group
}

function createMonsoonObject(definition: MonsoonDefinition) {
  const group = new THREE.Group()
  const curve = new MonsoonCurve(definition)

  const progressPoints = definition.season === 'summer'
    ? [0.18, 0.44, 0.70]
    : [0.22, 0.48, 0.72]

  progressPoints.forEach((progress, index) => {
    const result = createMovingSphericalSurfaceArrow(curve, progress, {
      colorStart: new THREE.Color(definition.colorStart),
      colorEnd: new THREE.Color(definition.colorEnd),
      phase: (definition.season === 'summer' ? 0.18 : 0.62) + index * 0.29,
      opacity: 0.96,
      span: 0.33,
      shaftHalfWidth: 0.040,
      headHalfWidth: 0.122,
      speed: 0.088 + index * 0.008,
      loopStart: 0.12,
      loopEnd: 0.88,
      mode: 'monsoon',
      renderOrder: 10,
      registry: monsoonFlowMaterials,
    })
    group.add(result.arrow)
    monsoonDirectionArrows.push(result.item)
  })

  group.userData.season = definition.season
  group.userData.monsoonId = definition.id
  return group
}


function getMonsoonTextColor(definition: MonsoonDefinition) {
  return new THREE.Color(definition.colorStart).lerp(new THREE.Color(definition.colorEnd), 0.58)
}

function createMonsoonTextTexture(season: SeasonType) {
  const width = 4096
  const height = 2048
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  context.clearRect(0, 0, width, height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'

  monsoonDefinitions
    .filter(definition => definition.season === season)
    .forEach(definition => {
      const lat = (definition.startLat + definition.endLat) / 2
      const lon = lerpLongitude(definition.startLon, definition.endLon, 0.5)
      const x = (normalizeLon(lon) + 180) / 360 * width
      const y = (90 - lat) / 180 * height
      const color = getMonsoonTextColor(definition)
      const r = Math.round(color.r * 255)
      const g = Math.round(color.g * 255)
      const b = Math.round(color.b * 255)

      let directionGlyph = '➜'
      if (definition.id === 'east-asia-summer') directionGlyph = '↖'
      if (definition.id === 'south-asia-summer') directionGlyph = '↗'
      if (definition.id === 'east-asia-winter') directionGlyph = '↘'
      const title = `${definition.name}  ${directionGlyph}`

      context.font = '700 30px "Microsoft YaHei", sans-serif'
      context.lineWidth = 6
      context.strokeStyle = 'rgba(3, 12, 24, 0.92)'
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.98)`
      context.shadowColor = `rgba(${r}, ${g}, ${b}, 0.74)`
      context.shadowBlur = 10

        ;[-width, 0, width].forEach(wrap => {
          context.strokeText(title, x + wrap, y)
          context.fillText(title, x + wrap, y)
        })
    })

  context.shadowBlur = 0
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

function createMonsoonTextOverlay(season: SeasonType) {
  const material = new THREE.MeshBasicMaterial({
    map: createMonsoonTextTexture(season),
    transparent: true,
    opacity: 0.98,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.012,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  })

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS + 0.074, 128, 64),
    material,
  )
  mesh.name = `${season}-monsoon-text-canvas-texture`
  mesh.renderOrder = 9
  mesh.userData.monsoonTextOverlay = true
  return mesh
}

function createRegionalPressureSystem() {
  const root = new THREE.Group()
  const summer = new THREE.Group()
  const winter = new THREE.Group()
  root.name = 'regional-pressure-centers'
  summer.name = 'summer-regional-pressure-centers'
  winter.name = 'winter-regional-pressure-centers'

  pressureCenterDefinitions.forEach(definition => {
    const object = createPressureCenterObject(definition)
    if (definition.season === 'summer') summer.add(object)
    else winter.add(object)
  })

  summer.add(createRegionalPressureTextOverlay('summer'))
  winter.add(createRegionalPressureTextOverlay('winter'))

  root.add(summer, winter)
  regionalPressureSummerGroup = summer
  regionalPressureWinterGroup = winter
  return root
}

function createMonsoonSystem() {
  const root = new THREE.Group()
  const summer = new THREE.Group()
  const winter = new THREE.Group()
  root.name = 'monsoon-dynamic-arrows'
  summer.name = 'summer-monsoon-arrows'
  winter.name = 'winter-monsoon-arrows'

  monsoonDefinitions.forEach(definition => {
    const object = createMonsoonObject(definition)
    if (definition.season === 'summer') summer.add(object)
    else winter.add(object)
  })

  summer.add(createMonsoonTextOverlay('summer'))
  winter.add(createMonsoonTextOverlay('winter'))

  root.add(summer, winter)
  registerFadingGroup(summer, 0)
  registerFadingGroup(winter, 0)
  monsoonSummerGroup = summer
  monsoonWinterGroup = winter
  return root
}

function isSummerMonsoonMonth() {
  return month.value >= 4 && month.value <= 8
}

function updateStageFourSeasonVisibility() {
  const stageFourActive = currentStage.value === 3
  const summerActive = isSummerMonsoonMonth()

  if (regionalPressureSummerGroup) {
    regionalPressureSummerGroup.visible =
      stageFourActive &&
      !!layers.regionalPressureCenters &&
      summerActive
  }

  if (regionalPressureWinterGroup) {
    regionalPressureWinterGroup.visible =
      stageFourActive &&
      !!layers.regionalPressureCenters &&
      !summerActive
  }

  setFadingGroupVisibility(
    monsoonSummerGroup,
    stageFourActive && !!layers.monsoonWinds && summerActive,
  )

  setFadingGroupVisibility(
    monsoonWinterGroup,
    stageFourActive && !!layers.monsoonWinds && !summerActive,
  )
}

// ==================== 垂直烟流气流 ====================
class RadialFlowCurve extends THREE.Curve<THREE.Vector3> {
  private readonly start: THREE.Vector3
  private readonly end: THREE.Vector3

  constructor(
    definition: VerticalFlowDefinition,
    lon: number,
    latitudeOffset = 0,
  ) {
    super()
    const lat = shiftLatitude(definition.lat, latitudeOffset)
    const innerRadius = EARTH_RADIUS + 0.085
    const outerRadius = EARTH_RADIUS + 0.56
    const startRadius = definition.direction === 'up' ? innerRadius : outerRadius
    const endRadius = definition.direction === 'up' ? outerRadius : innerRadius
    this.start = latLonToVec3(lat, lon, startRadius)
    this.end = latLonToVec3(lat, lon, endRadius)
    this.arcLengthDivisions = 100
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const eased = smoothstep01(t)
    return target.lerpVectors(this.start, this.end, eased)
  }
}

function createVerticalOffsetCurve(
  baseCurve: THREE.Curve<THREE.Vector3>,
  phase: number,
  spread: number,
) {
  const segments = 90
  const frames = baseCurve.computeFrenetFrames(segments, false)
  const points: THREE.Vector3[] = []

  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const center = baseCurve.getPointAt(t)
    const curl = phase + t * Math.PI * 4.2
    const breathing = 0.55 + 0.45 * Math.sin(t * Math.PI * 3.0 + phase)
    const normalOffset = Math.cos(curl) * spread * breathing
    const binormalOffset = Math.sin(curl) * spread * breathing

    points.push(
      center
        .clone()
        .addScaledVector(frames.normals[index]!, normalOffset)
        .addScaledVector(frames.binormals[index]!, binormalOffset),
    )
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  curve.arcLengthDivisions = 180
  return curve
}

function createVerticalSmokeMaterial(
  definition: VerticalFlowDefinition,
  phase: number,
  haze: boolean,
) {
  const baseColor = definition.direction === 'up'
    ? new THREE.Color(0xff9a4d)
    : new THREE.Color(0x68bfff)
  const tipColor = definition.direction === 'up'
    ? new THREE.Color(0xffe08a)
    : new THREE.Color(0xb6e3ff)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorStart: { value: baseColor },
      uColorEnd: { value: tipColor },
      uTime: { value: 0 },
      uPhase: { value: phase },
      uOpacity: { value: haze ? 0.10 : 0.48 },
      uHaze: { value: haze ? 1 : 0 },
      uFlowSpeed: { value: definition.direction === 'up' ? 1.9 : 1.7 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPhase;
      uniform float uFlowSpeed;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      void main() {
        vUv = uv;
        vec3 transformed = position;
        float pulse = sin((uv.x * 8.0 - uTime * uFlowSpeed + uPhase) * 6.28318530718);
        transformed += normal * pulse * 0.006;
        vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorStart;
      uniform vec3 uColorEnd;
      uniform float uTime;
      uniform float uPhase;
      uniform float uOpacity;
      uniform float uHaze;
      uniform float uFlowSpeed;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.45);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        float moving = fract(vUv.x - uTime * uFlowSpeed * 0.12 + uPhase);
        float broad = 0.5 + 0.5 * sin((moving * 3.4 + noise2(vec2(vUv.x * 5.0, vUv.y * 4.0 + uTime * 0.12)) * 0.42) * 6.28318530718);
        float fine = 0.5 + 0.5 * sin((moving * 9.0 + vUv.y * 1.7 + uPhase) * 6.28318530718);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDirection))), 1.25);
        float density = mix(
          0.18 + pow(broad, 2.0) * 0.52 + pow(fine, 7.0) * 0.34,
          0.24 + broad * 0.36,
          uHaze
        );
        density *= 0.38 + fresnel * 0.88;
        float endFade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.90, 1.0, vUv.x));
        float alpha = uOpacity * density * endFade;
        if (alpha < 0.007) discard;
        vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.0, 1.0, vUv.x));
        color = mix(color, vec3(1.0), fresnel * 0.28 + pow(fine, 9.0) * 0.18);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })

  verticalSmokeMaterials.push(material)
  return material
}

function createVerticalFlowMarker(definition: VerticalFlowDefinition) {
  const group = new THREE.Group()
  const isUp = definition.direction === 'up'
  const color = isUp ? 0xffb24a : 0x5bc0ff
  const glowColor = isUp ? 0xffe29a : 0xb7e8ff

  const shape = new THREE.Shape()
  shape.moveTo(-0.028, -0.085)
  shape.lineTo(0.028, -0.085)
  shape.lineTo(0.028, 0.008)
  shape.lineTo(0.070, 0.008)
  shape.lineTo(0, 0.100)
  shape.lineTo(-0.070, 0.008)
  shape.lineTo(-0.028, 0.008)
  shape.closePath()

  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  group.add(arrow)

  const glow = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 20),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.30,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  )
  glow.scale.setScalar(1.28)
  glow.position.z = -0.002
  group.add(glow)

  group.renderOrder = 14
  group.userData.verticalMarker = true
  return group
}

function orientPlanarArrowOnCurve(
  object: THREE.Object3D,
  position: THREE.Vector3,
  tangent: THREE.Vector3,
) {
  const yAxis = tangent.clone().normalize()
  let cameraPosition = camera
    ? camera.position.clone()
    : new THREE.Vector3(0, 0, 1)

  if (camera && earthMesh) {
    earthMesh.updateWorldMatrix(true, false)
    cameraPosition = earthMesh.worldToLocal(cameraPosition)
  }

  const toCamera = cameraPosition.sub(position).normalize()

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
  object.quaternion.setFromRotationMatrix(basis)
}

function createRadialSmokeFlow(
  definition: VerticalFlowDefinition,
  lon: number,
  latitudeOffset = 0,
) {
  const group = new THREE.Group()
  const baseCurve = new RadialFlowCurve(definition, lon, latitudeOffset)

  const haze = new THREE.Mesh(
    new THREE.TubeGeometry(baseCurve, 90, 0.046, 10, false),
    createVerticalSmokeMaterial(definition, lon * 0.013, true),
  )
  haze.renderOrder = 8
  group.add(haze)

  for (let index = 0; index < 5; index++) {
    const phase = index * 1.37 + lon * 0.021
    const curve = createVerticalOffsetCurve(baseCurve, phase, 0.026 + index * 0.002)
    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 96, 0.0075 + (index % 2) * 0.0012, 7, false),
      createVerticalSmokeMaterial(definition, phase, false),
    )
    strand.renderOrder = 9
    group.add(strand)
  }

  const markerProgress = 0.18 + ((Math.abs(lon) % 80) / 80) * 0.24
  const directionMarker = createVerticalFlowMarker(definition)
  const markerPosition = baseCurve.getPointAt(markerProgress)
  const markerTangent = baseCurve.getTangentAt(markerProgress).normalize()
  directionMarker.position.copy(markerPosition)
  orientPlanarArrowOnCurve(directionMarker, markerPosition, markerTangent)
  group.add(directionMarker)

  verticalFlowDirectionArrows.push({
    mesh: directionMarker,
    curve: baseCurve,
    progress: markerProgress,
    speed: definition.direction === 'up' ? 0.42 : 0.38,
    loopStart: 0.08,
    loopEnd: 0.92,
    mode: 'vertical',
  })

  group.userData.verticalFlowId = definition.id
  return group
}

function createPressureArrows(latitudeOffset = 0) {
  const group = new THREE.Group()
  group.name = 'vertical-smoke-airflows'

  verticalFlowDefinitions.forEach(definition => {
    const longitudes = Math.abs(definition.lat) > 80
      ? [-90, 90]
      : [-120, -40, 40, 120]

    longitudes.forEach(lon => {
      group.add(createRadialSmokeFlow(definition, lon, latitudeOffset))
    })
  })

  registerFadingGroup(group, 0)
  return group
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

  const specialLatitudes = [
    { lat: 0, color: 0xf8d25c, opacity: 0.90 },
    { lat: 23.5, color: 0xff9778, opacity: 0.82 },
    { lat: -23.5, color: 0xff9778, opacity: 0.82 },
    { lat: 66.5, color: 0x78d9ff, opacity: 0.82 },
    { lat: -66.5, color: 0x78d9ff, opacity: 0.82 },
  ]

  specialLatitudes.forEach(item => {
    const points: THREE.Vector3[] = []
    for (let lon = -180; lon < 180; lon += 3) {
      points.push(latLonToVec3(item.lat, lon, radius + 0.002))
    }

    group.add(
      createHighlightedGridCurve(points, item.color, item.opacity, true),
    )
  })

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


function createSubsolarLatitudeLine() {
  const group = new THREE.Group()
  group.name = 'subsolar-latitude-line'

  const latitude = getSubsolarLatitude()
  const baseRadius = EARTH_RADIUS + 0.016
  const glowRadius = EARTH_RADIUS + 0.019

  const corePoints: THREE.Vector3[] = []
  const glowPoints: THREE.Vector3[] = []

  for (let lon = -180; lon < 180; lon += 2) {
    corePoints.push(latLonToVec3(latitude, lon, baseRadius))
    glowPoints.push(latLonToVec3(latitude, lon, glowRadius))
  }

  const outerGlow = createHighlightedGridCurve(glowPoints, 0xff8f3a, 0.24, true)
  outerGlow.scale.setScalar(1.006)
  group.add(outerGlow)

  const innerGlow = createHighlightedGridCurve(glowPoints, 0xffd95a, 0.46, true)
  innerGlow.scale.setScalar(1.002)
  group.add(innerGlow)

  const coreCurve = createHighlightedGridCurve(corePoints, 0xf7ffde, 0.96, true)
  group.add(coreCurve)

  const markerLons = [-150, -90, -30, 30, 90, 150]
  markerLons.forEach((lon, index) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(index % 2 === 0 ? 0.022 : 0.016, 10, 10),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? 0xfff2a8 : 0xffb347,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
      }),
    )
    marker.position.copy(latLonToVec3(latitude, lon, EARTH_RADIUS + 0.028))
    group.add(marker)
  })

  group.renderOrder = 6
  return group
}

// ==================== 动态图层淡入淡出 ====================
function getRenderableMaterials(object: THREE.Object3D) {
  const renderable = object as THREE.Object3D & {
    material?: THREE.Material | THREE.Material[]
  }
  if (!renderable.material) return []
  return Array.isArray(renderable.material)
    ? renderable.material
    : [renderable.material]
}

function applyFadingGroupOpacity(group: THREE.Group, value: number) {
  group.traverse(object => {
    getRenderableMaterials(object).forEach(material => {
      const shader = material as THREE.ShaderMaterial
      if (shader.uniforms?.uOpacity) {
        if (material.userData.fadeBaseUniformOpacity === undefined) {
          material.userData.fadeBaseUniformOpacity = shader.uniforms.uOpacity.value
        }
        shader.uniforms.uOpacity.value =
          material.userData.fadeBaseUniformOpacity * value
      } else {
        if (material.userData.fadeBaseOpacity === undefined) {
          material.userData.fadeBaseOpacity = material.opacity ?? 1
        }
        material.transparent = true
        material.opacity = material.userData.fadeBaseOpacity * value
      }
    })
  })
}

function registerFadingGroup(group: THREE.Group, initialValue = 0) {
  group.userData.fadeCurrent = initialValue
  group.userData.fadeTarget = initialValue
  group.visible = initialValue > 0.001
  applyFadingGroupOpacity(group, initialValue)
  if (!fadingGroups.includes(group)) fadingGroups.push(group)
}

function setFadingGroupVisibility(group: THREE.Group | null, visible: boolean) {
  if (!group) return
  if (group.userData.fadeCurrent === undefined) registerFadingGroup(group, visible ? 1 : 0)
  group.userData.fadeTarget = visible ? 1 : 0
  if (visible) group.visible = true
}

function updateFadingGroups(deltaTime: number) {
  const speed = 3.6
  fadingGroups.forEach(group => {
    const current = Number(group.userData.fadeCurrent ?? 0)
    const target = Number(group.userData.fadeTarget ?? 0)
    const next = THREE.MathUtils.damp(current, target, speed, deltaTime)
    group.userData.fadeCurrent = next
    applyFadingGroupOpacity(group, next)
    group.visible = next > 0.004 || target > 0
  })
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

function removeAndDispose(parent: THREE.Object3D, object: THREE.Object3D | null) {
  if (!object) return
  fadingGroups = fadingGroups.filter(group => group !== object && !object.getObjectById(group.id))
  parent.remove(object)
  disposeObject3D(object)
}

// ==================== 阶段四、五：平面世界地图 ====================
type MapPressureCenter = {
  name: string
  symbol: 'H' | 'L'
  lat: number
  lon: number
  strength: number
  radius: number
}

type PressureGrid = {
  cols: number
  rows: number
  values: Float32Array
}

type MapWindSeed = {
  longitude: number
  latitude: number
  seedIndex: number
  phase: number
}

type MapWindTrack = {
  phase: number
  route: Array<{ longitude: number; latitude: number }>
}

const pressureContourLevels = [980, 988, 996, 1004, 1012, 1020, 1028, 1036, 1044]
let cachedPressureGridKey = ''
let cachedPressureGrid: PressureGrid | null = null
let pressureFieldCanvas: HTMLCanvasElement | null = null
let pressureStaticCanvas: HTMLCanvasElement | null = null
let pressureStaticCacheKey = ''
let mapWindSeeds: MapWindSeed[] = []
const mapWindTrackCache = new Map<NcepSlpMonth, MapWindTrack[]>()

const januaryPressureCenters: MapPressureCenter[] = [
  { name: '亚洲高压', symbol: 'H', lat: 48, lon: 92, strength: 1, radius: 0.16 },
  { name: '北美高压', symbol: 'H', lat: 45, lon: -105, strength: 0.78, radius: 0.13 },
  { name: '阿留申低压', symbol: 'L', lat: 52, lon: -172, strength: 1, radius: 0.15 },
  { name: '冰岛低压', symbol: 'L', lat: 60, lon: -25, strength: 0.9, radius: 0.12 },
  { name: '澳大利亚低压', symbol: 'L', lat: -25, lon: 135, strength: 0.8, radius: 0.11 },
  { name: '南印度洋高压', symbol: 'H', lat: -32, lon: 78, strength: 0.68, radius: 0.12 },
  { name: '南太平洋高压', symbol: 'H', lat: -31, lon: -108, strength: 0.72, radius: 0.13 },
]

const julyPressureCenters: MapPressureCenter[] = [
  { name: '亚洲低压', symbol: 'L', lat: 30, lon: 76, strength: 1, radius: 0.16 },
  { name: '北太平洋高压', symbol: 'H', lat: 31, lon: -148, strength: 0.95, radius: 0.16 },
  { name: '北大西洋高压', symbol: 'H', lat: 30, lon: -38, strength: 0.9, radius: 0.14 },
  { name: '南印度洋高压', symbol: 'H', lat: -30, lon: 73, strength: 0.78, radius: 0.13 },
  { name: '澳大利亚高压', symbol: 'H', lat: -28, lon: 134, strength: 0.76, radius: 0.12 },
  { name: '南太平洋高压', symbol: 'H', lat: -31, lon: -110, strength: 0.78, radius: 0.14 },
]

function mapX(longitude: number, width: number) {
  return (((longitude % 360) + 360) % 360) / 360 * width
}

function mapY(latitude: number, height: number) {
  return ((90 - latitude) / 180) * height
}

function getPressureMonth(centers: MapPressureCenter[]): NcepSlpMonth {
  return centers === januaryPressureCenters ? 'january' : 'july'
}

function evaluatePressure(longitude: number, latitude: number, centers: MapPressureCenter[]) {
  return sampleNcepSlp(getPressureMonth(centers), longitude, latitude)
}

function getPressureGrid(centers: MapPressureCenter[]) {
  const key = centers === januaryPressureCenters ? 'january' : 'july'
  if (cachedPressureGrid && cachedPressureGridKey === key) return cachedPressureGrid

  const cols = 288
  const rows = 144
  const values = new Float32Array((cols + 1) * (rows + 1))

  for (let row = 0; row <= rows; row += 1) {
    const latitude = 90 - row / rows * 180
    for (let col = 0; col <= cols; col += 1) {
      const longitude = col / cols * 360
      values[row * (cols + 1) + col] = evaluatePressure(longitude, latitude, centers)
    }
  }

  cachedPressureGridKey = key
  cachedPressureGrid = { cols, rows, values }
  return cachedPressureGrid
}

function pressureColor(value: number) {
  const bands = [
    { upper: 992, color: [55, 74, 218] },
    { upper: 1000, color: [91, 126, 232] },
    { upper: 1008, color: [145, 202, 246] },
    { upper: 1016, color: [217, 225, 220] },
    { upper: 1024, color: [246, 194, 125] },
    { upper: 1032, color: [244, 125, 66] },
    { upper: Number.POSITIVE_INFINITY, color: [233, 72, 43] },
  ]
  return (bands.find(band => value < band.upper) ?? bands[bands.length - 1]).color
}

function drawPressureField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: PressureGrid,
) {
  if (!pressureFieldCanvas) pressureFieldCanvas = document.createElement('canvas')
  pressureFieldCanvas.width = grid.cols
  pressureFieldCanvas.height = grid.rows
  const fieldCtx = pressureFieldCanvas.getContext('2d')
  if (!fieldCtx) return

  const image = fieldCtx.createImageData(grid.cols, grid.rows)
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const value = grid.values[row * (grid.cols + 1) + col]
      const [red, green, blue] = pressureColor(value)
      const pixel = (row * grid.cols + col) * 4
      image.data[pixel] = red
      image.data[pixel + 1] = green
      image.data[pixel + 2] = blue
      image.data[pixel + 3] = 205
    }
  }
  fieldCtx.putImageData(image, 0, 0)

  ctx.save()
  ctx.globalAlpha = 0.58
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(pressureFieldCanvas, 0, 0, width, height)
  ctx.restore()
}

function drawMapGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save()
  ctx.font = `600 ${Math.max(10, width * 0.012)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  if (layers.latLines) {
    for (let longitude = 0; longitude < 360; longitude += 15) {
      const x = mapX(longitude, width)
      ctx.beginPath()
      ctx.setLineDash([5, 8])
      ctx.lineWidth = longitude === 0 || longitude === 180 ? 1.15 : 0.7
      ctx.strokeStyle = longitude === 0
        ? 'rgba(46, 196, 182, 0.56)'
        : longitude === 180
          ? 'rgba(255, 95, 158, 0.52)'
          : 'rgba(195, 235, 255, 0.20)'
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    ;[60, 30, 0, -30, -60].forEach(latitude => {
      const y = mapY(latitude, height)
      ctx.beginPath()
      ctx.setLineDash(latitude === 0 ? [] : [7, 7])
      ctx.lineWidth = latitude === 0 ? 1.6 : 1
      ctx.strokeStyle = latitude === 0
        ? 'rgba(255, 222, 129, 0.72)'
        : 'rgba(195, 235, 255, 0.42)'
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
      if (layers.textAnnotations) {
        ctx.fillStyle = 'rgba(231, 246, 255, 0.86)'
        ctx.fillText(`${Math.abs(latitude)}°${latitude > 0 ? 'N' : latitude < 0 ? 'S' : ''}`, 9, y - 9)
      }
    })
  }

  if (layers.subsolarLine) {
    const subsolarLatitude = getSubsolarLatitude()
    const y = mapY(subsolarLatitude, height)
    ctx.beginPath()
    ctx.setLineDash([])
    ctx.lineWidth = Math.max(1.4, width * 0.0018)
    ctx.strokeStyle = 'rgba(255, 214, 84, 0.94)'
    ctx.shadowBlur = 7
    ctx.shadowColor = 'rgba(255, 187, 38, 0.72)'
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
    if (layers.textAnnotations) {
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffe58d'
      ctx.fillText(`太阳直射纬线 ${Math.abs(subsolarLatitude).toFixed(1)}°${subsolarLatitude >= 0 ? 'N' : 'S'}`, width - 12, y - 10)
    }
  }

  ctx.restore()
}

function drawPressureBands(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bands = [
    { lat: 60, color: '74, 112, 255', opacity: 0.25 },
    { lat: 30, color: '255, 115, 62', opacity: 0.20 },
    { lat: 0, color: '73, 159, 235', opacity: 0.16 },
    { lat: -30, color: '255, 115, 62', opacity: 0.20 },
    { lat: -60, color: '74, 112, 255', opacity: 0.28 },
  ]

  bands.forEach(({ lat, color, opacity }) => {
    const centerY = mapY(lat, height)
    const bandHeight = height * (Math.abs(lat) === 60 ? 0.13 : 0.11)
    const gradient = ctx.createLinearGradient(0, centerY - bandHeight, 0, centerY + bandHeight)
    gradient.addColorStop(0, `rgba(${color}, 0)`)
    gradient.addColorStop(0.5, `rgba(${color}, ${opacity})`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, centerY - bandHeight, width, bandHeight * 2)
  })
}

function drawPolarPressureContours(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(178, 211, 255, 0.60)'
  ctx.lineWidth = Math.max(0.8, width * 0.0012)

  for (let contour = 0; contour < 5; contour += 1) {
    ctx.beginPath()
    for (let step = 0; step <= 120; step += 1) {
      const longitude = step / 120 * 360
      const latitude = -61 - contour * 4.2 + Math.sin(step * 0.26 + contour * 0.9) * (1.7 + contour * 0.24)
      const x = longitude / 360 * width
      const y = mapY(latitude, height)
      if (step === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  ctx.fillStyle = '#d9e9ff'
  ctx.font = `700 ${Math.max(10, width * 0.013)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.shadowBlur = 8
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
  ctx.fillText('南极低压带', width * 0.50, mapY(-73, height))
  ctx.restore()
}

type ContourPoint = { x: number; y: number }

function contourIntersection(
  level: number,
  valueA: number,
  valueB: number,
  pointA: ContourPoint,
  pointB: ContourPoint,
) {
  const difference = valueB - valueA
  const safeDifference = Math.abs(difference) < 0.0001
    ? (difference < 0 ? -0.0001 : 0.0001)
    : difference
  const progress = (level - valueA) / safeDifference
  return {
    x: pointA.x + (pointB.x - pointA.x) * progress,
    y: pointA.y + (pointB.y - pointA.y) * progress,
  }
}

function drawIsobars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: PressureGrid,
  showLabels: boolean,
) {
  const vertex = (row: number, col: number) => grid.values[row * (grid.cols + 1) + col]

  pressureContourLevels.forEach((level, levelIndex) => {
    const labels: ContourPoint[] = []
    let segmentCount = 0
    ctx.save()
    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = level === 1012 ? Math.max(1.0, width * 0.00115) : Math.max(0.72, width * 0.00082)
    ctx.strokeStyle = level === 1012
      ? 'rgba(255, 242, 190, 0.88)'
      : 'rgba(236, 247, 255, 0.76)'
    ctx.shadowBlur = level === 1012 ? 2 : 0
    ctx.shadowColor = 'rgba(48, 126, 210, 0.28)'

    for (let row = 0; row < grid.rows; row += 1) {
      for (let col = 0; col < grid.cols; col += 1) {
        const points = [
          { x: col, y: row },
          { x: col + 1, y: row },
          { x: col + 1, y: row + 1 },
          { x: col, y: row + 1 },
        ]
        const values = [
          vertex(row, col),
          vertex(row, col + 1),
          vertex(row + 1, col + 1),
          vertex(row + 1, col),
        ]
        const intersections: ContourPoint[] = []
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0]]

        edges.forEach(([start, end]) => {
          const valueA = values[start]
          const valueB = values[end]
          if (
            (valueA < level && valueB >= level) ||
            (valueB < level && valueA >= level)
          ) {
            intersections.push(contourIntersection(level, valueA, valueB, points[start], points[end]))
          }
        })

        if (intersections.length < 2) continue
        const pairs = intersections.length === 4
          ? [[intersections[0], intersections[1]], [intersections[2], intersections[3]]]
          : [[intersections[0], intersections[1]]]

        pairs.forEach(([start, end]) => {
          const startX = start.x / grid.cols * width
          const startY = start.y / grid.rows * height
          const endX = end.x / grid.cols * width
          const endY = end.y / grid.rows * height
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          segmentCount += 1
          if (
            showLabels &&
            segmentCount % 184 === 48 + levelIndex * 5 &&
            labels.length < 4 &&
            startX > 30 && startX < width - 30 &&
            startY > 18 && startY < height - 18
          ) {
            labels.push({ x: (startX + endX) * 0.5, y: (startY + endY) * 0.5 })
          }
        })
      }
    }
    ctx.stroke()
    ctx.restore()

    if (showLabels) labels.forEach(label => {
      ctx.save()
      const fontSize = Math.max(8, width * 0.0105)
      ctx.font = `700 ${fontSize}px "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const text = `${level}`
      const textWidth = ctx.measureText(text).width
      ctx.fillStyle = 'rgba(3, 14, 29, 0.74)'
      ctx.fillRect(label.x - textWidth * 0.6, label.y - fontSize * 0.62, textWidth * 1.2, fontSize * 1.24)
      ctx.fillStyle = level === 1012 ? '#fff0b7' : '#e6f5ff'
      ctx.fillText(text, label.x, label.y)
      ctx.restore()
    })
  })
}

function drawPressureStaticLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: PressureGrid,
) {
  const cacheKey = `${cachedPressureGridKey}:${width}x${height}:labels-${Number(layers.textAnnotations)}`
  if (!pressureStaticCanvas) pressureStaticCanvas = document.createElement('canvas')

  if (pressureStaticCacheKey !== cacheKey) {
    pressureStaticCanvas.width = width
    pressureStaticCanvas.height = height
    const staticCtx = pressureStaticCanvas.getContext('2d')
    if (!staticCtx) return
    staticCtx.clearRect(0, 0, width, height)
    drawPressureField(staticCtx, width, height, grid)
    drawIsobars(staticCtx, width, height, grid, !!layers.textAnnotations)
    pressureStaticCacheKey = cacheKey
  }

  ctx.drawImage(pressureStaticCanvas, 0, 0, width, height)
}

function drawPressureCenter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  center: MapPressureCenter,
) {
  const x = mapX(center.lon, width)
  const y = mapY(center.lat, height)
  const high = center.symbol === 'H'
  const rgb = high ? '255, 112, 58' : '69, 112, 255'
  const fieldCenters = month.value <= 2 || month.value >= 10
    ? januaryPressureCenters
    : julyPressureCenters
  const centerPressure = Math.round(evaluatePressure(center.lon, center.lat, fieldCenters))
  const glowRadius = Math.max(24, width * 0.048)

  ctx.save()
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
  glow.addColorStop(0, `rgba(${rgb}, ${0.42 * center.strength})`)
  glow.addColorStop(0.52, `rgba(${rgb}, ${0.17 * center.strength})`)
  glow.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowBlur = 10
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.fillStyle = high ? '#ffe1b6' : '#d9ecff'
  ctx.font = `800 ${Math.max(20, width * 0.032)}px "Microsoft YaHei", sans-serif`
  ctx.fillText(center.symbol, x, y - 4)
  if (layers.textAnnotations) {
    ctx.font = `700 ${Math.max(10, width * 0.014)}px "Microsoft YaHei", sans-serif`
    ctx.fillText(center.name, x, y + Math.max(17, height * 0.044))
    ctx.font = `600 ${Math.max(8, width * 0.0105)}px "Microsoft YaHei", sans-serif`
    ctx.fillStyle = 'rgba(236, 248, 255, 0.88)'
    ctx.fillText(`${centerPressure} hPa`, x, y + Math.max(31, height * 0.077))
  }
  ctx.restore()
}

function drawVerticalThermalArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  longitude: number,
  latitude: number,
  rising: boolean,
) {
  const x = mapX(longitude, width)
  const y = mapY(latitude, height)
  const length = height * 0.095
  const direction = rising ? -1 : 1
  const startY = y + direction * length * 0.48
  const endY = y - direction * length * 0.48
  const color = rising ? '#8de7ff' : '#ffe1a1'

  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.shadowBlur = 12
  ctx.shadowColor = color
  ctx.lineWidth = Math.max(3, width * 0.004)
  ctx.beginPath()
  ctx.moveTo(x, startY)
  ctx.lineTo(x, endY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, endY - direction * 9)
  ctx.lineTo(x - 7, endY + direction * 3)
  ctx.lineTo(x + 7, endY + direction * 3)
  ctx.closePath()
  ctx.fill()
  ctx.font = `800 ${Math.max(11, width * 0.014)}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(rising ? '上升' : '下沉', x, y + height * 0.07)
  ctx.restore()
}

function drawMapArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  width: number,
) {
  const endX = x + dx
  const endY = y + dy
  const angle = Math.atan2(dy, dx)
  const head = Math.max(5, width * 0.008)

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 7
  ctx.shadowColor = color
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.globalAlpha = 0.94
  ctx.lineWidth = Math.max(1.6, width * 0.0024)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + dx * 0.48, y + dy * 0.48 - Math.sign(dx || 1) * 4, endX, endY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(endX - Math.cos(angle - 0.56) * head, endY - Math.sin(angle - 0.56) * head)
  ctx.lineTo(endX - Math.cos(angle + 0.56) * head, endY - Math.sin(angle + 0.56) * head)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function pressureDrivenWindVector(
  longitude: number,
  latitude: number,
  centers: MapPressureCenter[],
) {
  const step = 2.5
  const rawLongitudeGradient = (
    evaluatePressure(longitude + step, latitude, centers) -
    evaluatePressure(longitude - step, latitude, centers)
  ) / (step * 2)
  const gradientLat = (
    evaluatePressure(longitude, latitude + step, centers) -
    evaluatePressure(longitude, latitude - step, centers)
  ) / (step * 2)

  // 同样的经度差在高纬对应更短的实际距离，梯度需按 cos(latitude) 修正。
  const longitudeScale = Math.max(0.22, Math.cos(THREE.MathUtils.degToRad(latitude)))
  const gradientLon = rawLongitudeGradient / longitudeScale

  const hemisphere = latitude >= 0 ? 1 : -1
  // 地转分量沿等压线；摩擦分量以约 14° 夹角斜穿等压线指向低压。
  let east = -hemisphere * gradientLat - gradientLon * 0.25
  let north = hemisphere * gradientLon - gradientLat * 0.25
  const pressureGradient = Math.hypot(gradientLon, gradientLat)

  const absoluteLatitude = Math.abs(latitude)
  let prevailingEast = -1
  let prevailingNorth = latitude >= 0 ? -0.28 : 0.28
  if (absoluteLatitude >= 30 && absoluteLatitude < 60) {
    prevailingEast = 1
    prevailingNorth = latitude >= 0 ? 0.18 : -0.18
  }

  const vectorLength = Math.max(0.001, Math.hypot(east, north))
  east /= vectorLength
  north /= vectorLength
  // 赤道附近科氏参数趋近于零，以气候平均信风约束方向；中高纬主要服从气压梯度。
  const coriolisWeight = smoothstep01((absoluteLatitude - 4) / 18)
  const pressureWeight = Math.max(0.24, Math.min(0.9, pressureGradient / 0.95)) * coriolisWeight
  east = east * pressureWeight + prevailingEast * (1 - pressureWeight)
  north = north * pressureWeight + prevailingNorth * (1 - pressureWeight)
  const combinedLength = Math.max(0.001, Math.hypot(east, north))

  return {
    east: east / combinedLength,
    north: north / combinedLength,
    pressureGradient,
  }
}

function windColorForLatitude(latitude: number) {
  const absoluteLatitude = Math.abs(latitude)
  if (absoluteLatitude >= 60) return '#75a7ff'
  if (absoluteLatitude >= 30) return '#ffb84d'
  return '#2ed9c3'
}

function resetMapWindSeed(seed: MapWindSeed, seedIndex = seed.seedIndex) {
  const seedLatitudes = [74, 62, 50, 38, 26, 14, 4, -4, -14, -26, -38, -50, -62, -74]
  const lane = seedIndex % seedLatitudes.length
  const column = Math.floor(seedIndex / seedLatitudes.length)
  seed.seedIndex = seedIndex
  seed.longitude = (column * 43 + lane * 11 + 9) % 360
  seed.latitude = seedLatitudes[lane] ?? 0
  seed.phase = (seedIndex * 0.61803398875) % 1
}

function ensureMapWindSeeds() {
  if (mapWindSeeds.length === 112) return
  mapWindSeeds = Array.from({ length: 112 }, (_, seedIndex) => {
    const seed: MapWindSeed = {
      longitude: 0,
      latitude: 0,
      seedIndex,
      phase: 0,
    }
    resetMapWindSeed(seed, seedIndex)
    return seed
  })
}

function traceWindStreamline(
  seed: MapWindSeed,
  centers: MapPressureCenter[],
) {
  const backward: Array<{ longitude: number; latitude: number }> = []
  const forward: Array<{ longitude: number; latitude: number }> = []
  let longitude = seed.longitude
  let latitude = seed.latitude

  for (let index = 0; index < 5; index += 1) {
    const vector = pressureDrivenWindVector(longitude, latitude, centers)
    longitude -= vector.east * 3
    latitude = clamp(latitude - vector.north * 3, -82, 82)
    backward.unshift({ longitude, latitude })
  }

  longitude = seed.longitude
  latitude = seed.latitude
  forward.push({ longitude, latitude })
  for (let index = 0; index < 20; index += 1) {
    const vector = pressureDrivenWindVector(longitude, latitude, centers)
    longitude += vector.east * 3
    latitude = clamp(latitude + vector.north * 3, -82, 82)
    forward.push({ longitude, latitude })
  }

  return [...backward, ...forward]
}

function getMapWindTracks(centers: MapPressureCenter[]) {
  const key = getPressureMonth(centers)
  const cachedTracks = mapWindTrackCache.get(key)
  if (cachedTracks) return cachedTracks

  ensureMapWindSeeds()
  const tracks = mapWindSeeds.map(seed => ({
    phase: seed.phase,
    // 每条轨迹只根据当月真实气压场计算一次；动画帧只沿固定轨迹取样。
    route: traceWindStreamline(seed, centers),
  }))
  mapWindTrackCache.set(key, tracks)
  return tracks
}

function drawStableWindPacket(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: Array<{ longitude: number; latitude: number }>,
  color: string,
  opacity: number,
) {
  drawCurvedStreamlineArrow(ctx, width, height, points, color, opacity)
}

function getMapArrowGradient(color: string) {
  const palettes: Record<string, { start: string; end: string }> = {
    '#2ed9c3': { start: '#5af0d2', end: '#16b8d4' },
    '#ffb84d': { start: '#ffe066', end: '#ff8c42' },
    '#75a7ff': { start: '#d0f7ff', end: '#4c6fff' },
    '#ff4f87': { start: '#ff9fcb', end: '#ff315f' },
    '#a875ff': { start: '#d8b9ff', end: '#7446ff' },
    '#df78ff': { start: '#f0bbff', end: '#9854ff' },
    '#9bed6e': { start: '#dfff8b', end: '#66e37a' },
    '#58e5b2': { start: '#b7ffd9', end: '#35c79a' },
  }
  return palettes[color.toLowerCase()] ?? { start: '#eefbff', end: color }
}

function drawCurvedStreamlineArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: Array<{ longitude: number; latitude: number }>,
  color: string,
  opacity = 1,
) {
  if (points.length < 3) return
  const screenPoints: ContourPoint[] = []
  points.forEach((point, index) => {
    let x = mapX(point.longitude, width)
    const y = mapY(point.latitude, height)
    if (index > 0) {
      const previousX = screenPoints[index - 1].x
      while (x - previousX > width * 0.5) x -= width
      while (x - previousX < -width * 0.5) x += width
    }
    screenPoints.push({ x, y })
  })

    ;[-width, 0, width].forEach(offset => {
      const tail = screenPoints[0]
      const head = screenPoints[screenPoints.length - 1]
      if (head.x + offset < -80 || tail.x + offset > width + 80) return
      const palette = getMapArrowGradient(color)
      const gradient = ctx.createLinearGradient(
        tail.x + offset,
        tail.y,
        head.x + offset,
        head.y,
      )
      gradient.addColorStop(0, palette.start)
      gradient.addColorStop(0.72, palette.end)
      gradient.addColorStop(1, palette.end)

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = color
      ctx.globalAlpha = opacity * 0.18
      ctx.lineWidth = Math.max(5.2, width * 0.0065)
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.moveTo(tail.x + offset, tail.y)
      for (let index = 1; index < screenPoints.length - 1; index += 1) {
        const current = screenPoints[index]
        const next = screenPoints[index + 1]
        ctx.quadraticCurveTo(
          current.x + offset,
          current.y,
          (current.x + next.x) * 0.5 + offset,
          (current.y + next.y) * 0.5,
        )
      }
      ctx.lineTo(head.x + offset, head.y)
      ctx.stroke()

      ctx.globalAlpha = opacity
      ctx.strokeStyle = gradient
      ctx.lineWidth = Math.max(2.4, width * 0.0032)
      ctx.shadowBlur = 3
      ctx.beginPath()
      ctx.moveTo(tail.x + offset, tail.y)
      for (let index = 1; index < screenPoints.length - 1; index += 1) {
        const current = screenPoints[index]
        const next = screenPoints[index + 1]
        ctx.quadraticCurveTo(
          current.x + offset,
          current.y,
          (current.x + next.x) * 0.5 + offset,
          (current.y + next.y) * 0.5,
        )
      }
      ctx.lineTo(head.x + offset, head.y)
      ctx.stroke()

      const previous = screenPoints[screenPoints.length - 2]
      const angle = Math.atan2(head.y - previous.y, head.x - previous.x)
      // 保持明确的箭头轮廓，地图适配到较窄视口时也不会只剩发光短线。
      const arrowHead = Math.max(8.5, width * 0.012)
      ctx.fillStyle = gradient
      ctx.shadowBlur = 7
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.moveTo(head.x + offset, head.y)
      ctx.lineTo(
        head.x + offset - Math.cos(angle - 0.56) * arrowHead,
        head.y - Math.sin(angle - 0.56) * arrowHead,
      )
      ctx.lineTo(
        head.x + offset - Math.cos(angle + 0.56) * arrowHead,
        head.y - Math.sin(angle + 0.56) * arrowHead,
      )
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    })
}

function drawWindField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centers: MapPressureCenter[],
) {
  const tracks = getMapWindTracks(centers)
  tracks.forEach(track => {
    // 固定槽位、固定长度、固定不透明度，箭头重叠时也不会重置、隐藏或重新寻路。
    const packetCenter = 0.08 + ((mapAnimTime * 0.092 + track.phase) % 1) * 0.84
    const packetPoints = [-0.070, -0.052, -0.035, -0.017, 0, 0.017, 0.035, 0.052, 0.070]
      .map(offset => sampleGeographicRoute(track.route, packetCenter + offset))
    drawStableWindPacket(
      ctx,
      width,
      height,
      packetPoints,
      windColorForLatitude(packetPoints[packetPoints.length - 1].latitude),
      0.98,
    )
  })

  const labels = [
    { text: '北半球极地东风', lon: 118, lat: 72, color: '#75a7ff' },
    { text: '北半球西风', lon: 22, lat: 47, color: '#ffb84d' },
    { text: '东北信风', lon: 214, lat: 18, color: '#2ed9c3' },
    { text: '东南信风', lon: 42, lat: -18, color: '#2ed9c3' },
    { text: '南半球西风', lon: 214, lat: -47, color: '#ffb84d' },
    { text: '南半球极地东风', lon: 72, lat: -69, color: '#75a7ff' },
  ]
  if (layers.textAnnotations) labels.forEach(label => {
    ctx.save()
    ctx.font = `800 ${Math.max(10, width * 0.013)}px "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = label.color
    ctx.shadowBlur = 8
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.fillText(label.text, mapX(label.lon, width), mapY(label.lat, height) - 11)
    ctx.restore()
  })
}

function sampleGeographicRoute(
  points: Array<{ longitude: number; latitude: number }>,
  progress: number,
): { longitude: number; latitude: number } {
  const fallback = points[0] ?? { longitude: 0, latitude: 0 }
  const segmentLengths: number[] = []
  let totalLength = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index] ?? fallback
    const end = points[index + 1] ?? start
    const segmentLength = Math.hypot(
      end.longitude - start.longitude,
      (end.latitude - start.latitude) * 1.45,
    )
    segmentLengths.push(segmentLength)
    totalLength += segmentLength
  }

  let distance = Math.max(0, Math.min(1, progress)) * totalLength
  for (let index = 0; index < segmentLengths.length; index += 1) {
    if (distance <= segmentLengths[index] || index === segmentLengths.length - 1) {
      const start = points[index] ?? fallback
      const end = points[index + 1] ?? start
      const localProgress = distance / Math.max(0.001, segmentLengths[index] ?? 0)
      return {
        longitude: lerpValue(start.longitude, end.longitude, localProgress),
        latitude: lerpValue(start.latitude, end.latitude, localProgress),
      }
    }
    distance -= segmentLengths[index] ?? 0
  }

  return points[points.length - 1] ?? fallback
}

function drawMonsoonRouteGuide(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: Array<{ longitude: number; latitude: number }>,
  color: string,
) {
  const screenPoints = points.map(point => ({
    x: mapX(point.longitude, width),
    y: mapY(point.latitude, height),
  }))
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.34
  ctx.lineWidth = Math.max(1.2, width * 0.0018)
  ctx.beginPath()
  ctx.moveTo(screenPoints[0].x, screenPoints[0].y)
  for (let index = 1; index < screenPoints.length - 1; index += 1) {
    const current = screenPoints[index]
    const next = screenPoints[index + 1]
    ctx.quadraticCurveTo(
      current.x,
      current.y,
      (current.x + next.x) * 0.5,
      (current.y + next.y) * 0.5,
    )
  }
  const end = screenPoints[screenPoints.length - 1]
  ctx.lineTo(end.x, end.y)
  ctx.stroke()
  ctx.restore()
}

function drawMonsoonField(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const summer = month.value >= 4 && month.value <= 8
  const routes = summer
    ? [
      {
        color: '#ff4f87',
        label: '东南季风',
        points: [
          { longitude: 150, latitude: 16 },
          { longitude: 143, latitude: 20 },
          { longitude: 135, latitude: 24 },
          { longitude: 126, latitude: 29 },
          { longitude: 116, latitude: 34 },
        ],
      },
      {
        color: '#a875ff',
        label: '西南季风 · 阿拉伯海支流',
        points: [
          { longitude: 48, latitude: -9 },
          { longitude: 56, latitude: -2 },
          { longitude: 64, latitude: 7 },
          { longitude: 72, latitude: 16 },
          { longitude: 80, latitude: 25 },
        ],
      },
      {
        color: '#df78ff',
        label: '西南季风 · 孟加拉湾支流',
        points: [
          { longitude: 82, latitude: -5 },
          { longitude: 87, latitude: 4 },
          { longitude: 92, latitude: 13 },
          { longitude: 100, latitude: 22 },
          { longitude: 109, latitude: 29 },
        ],
      },
    ]
    : [
      {
        color: '#9bed6e',
        label: '西北季风',
        points: [
          { longitude: 98, latitude: 50 },
          { longitude: 104, latitude: 42 },
          { longitude: 111, latitude: 34 },
          { longitude: 120, latitude: 26 },
          { longitude: 130, latitude: 19 },
        ],
      },
      {
        color: '#58e5b2',
        label: '东北季风',
        points: [
          { longitude: 91, latitude: 30 },
          { longitude: 86, latitude: 23 },
          { longitude: 80, latitude: 16 },
          { longitude: 73, latitude: 9 },
          { longitude: 66, latitude: 3 },
        ],
      },
    ]

  routes.forEach((route, routeIndex) => {
    drawMonsoonRouteGuide(ctx, width, height, route.points, route.color)

      ;[0, 0.34, 0.68].forEach((offset, particleIndex) => {
        const progress = (mapAnimTime * 0.085 + offset + routeIndex * 0.07) % 1
        const segmentPoints = [-0.045, -0.022, 0, 0.022, 0.045].map(delta =>
          sampleGeographicRoute(route.points, Math.max(0, Math.min(1, progress + delta))),
        )
        const edgeFade = Math.min(1, progress / 0.08, (1 - progress) / 0.08)
        drawCurvedStreamlineArrow(
          ctx,
          width,
          height,
          segmentPoints,
          route.color,
          edgeFade * (0.9 - particleIndex * 0.08),
        )
      })

    if (layers.textAnnotations) {
      const labelPoint = route.points[Math.max(1, route.points.length - 2)]
      ctx.save()
      ctx.font = `800 ${Math.max(10, width * 0.012)}px "Microsoft YaHei", sans-serif`
      ctx.fillStyle = route.color
      ctx.textAlign = 'center'
      ctx.shadowBlur = 8
      ctx.shadowColor = 'rgba(0, 0, 0, 0.92)'
      ctx.fillText(
        route.label,
        mapX(labelPoint.longitude, width),
        mapY(labelPoint.latitude, height) - height * 0.026,
      )
      ctx.restore()
    }
  })
}

function initWorldMapThreeScene() {
  const canvas = worldMapCanvasRef.value
  if (!canvas) return false
  if (worldMapRenderer && worldMapScene && worldMapCamera) return true

  worldMapScene = new THREE.Scene()
  worldMapCamera = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, 0.1, 10)
  worldMapCamera.position.set(0, 0, 2)
  worldMapCamera.lookAt(0, 0, 0)

  worldMapRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  worldMapRenderer.setClearColor(0x071425, 1)
  worldMapRenderer.outputColorSpace = THREE.SRGBColorSpace

  worldMapControls = new OrbitControls(worldMapCamera, canvas)
  worldMapControls.enableDamping = true
  worldMapControls.dampingFactor = 0.085
  worldMapControls.enableRotate = false
  worldMapControls.enablePan = true
  worldMapControls.enableZoom = true
  worldMapControls.zoomToCursor = true
  worldMapControls.screenSpacePanning = true
  worldMapControls.minZoom = 0.7
  worldMapControls.maxZoom = 6
  worldMapControls.target.set(0, 0, 0)
  worldMapControls.mouseButtons.LEFT = THREE.MOUSE.PAN
  worldMapControls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
  worldMapControls.mouseButtons.RIGHT = THREE.MOUSE.PAN
  worldMapControls.addEventListener('start', () => {
    isMapDragging.value = true
  })
  worldMapControls.addEventListener('end', () => {
    isMapDragging.value = false
  })
  worldMapControls.addEventListener('change', () => {
    if (worldMapCamera) mapZoom.value = worldMapCamera.zoom
  })

  const planeGeometry = new THREE.PlaneGeometry(2, 1, 1, 1)
  worldMapBaseMesh = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshBasicMaterial({ color: 0x092038, side: THREE.DoubleSide }),
  )
  worldMapBaseMesh.position.z = 0
  worldMapBaseMesh.renderOrder = 0

  worldMapStaticCanvas = document.createElement('canvas')
  worldMapStaticCanvas.width = WORLD_MAP_TEXTURE_WIDTH
  worldMapStaticCanvas.height = WORLD_MAP_TEXTURE_HEIGHT
  worldMapStaticTexture = new THREE.CanvasTexture(worldMapStaticCanvas)
  worldMapStaticTexture.colorSpace = THREE.SRGBColorSpace
  worldMapStaticTexture.minFilter = THREE.LinearFilter
  worldMapStaticTexture.magFilter = THREE.LinearFilter
  worldMapStaticTexture.generateMipmaps = false
  worldMapStaticMesh = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshBasicMaterial({
      map: worldMapStaticTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    }),
  )
  worldMapStaticMesh.position.z = 0.015
  worldMapStaticMesh.renderOrder = 1

  worldMapDynamicCanvas = document.createElement('canvas')
  worldMapDynamicCanvas.width = WORLD_MAP_TEXTURE_WIDTH
  worldMapDynamicCanvas.height = WORLD_MAP_TEXTURE_HEIGHT
  worldMapDynamicTexture = new THREE.CanvasTexture(worldMapDynamicCanvas)
  worldMapDynamicTexture.colorSpace = THREE.SRGBColorSpace
  worldMapDynamicTexture.minFilter = THREE.LinearFilter
  worldMapDynamicTexture.magFilter = THREE.LinearFilter
  worldMapDynamicTexture.generateMipmaps = false
  worldMapDynamicMesh = new THREE.Mesh(
    planeGeometry,
    new THREE.MeshBasicMaterial({
      map: worldMapDynamicTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    }),
  )
  worldMapDynamicMesh.position.z = 0.03
  worldMapDynamicMesh.renderOrder = 2

  worldMapScene.add(worldMapBaseMesh, worldMapStaticMesh, worldMapDynamicMesh)

  new THREE.TextureLoader().load(
    earthTextureUrl,
    texture => {
      if (componentDestroyed || !worldMapBaseMesh) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.offset.x = 0.5
      const material = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: texture } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uMap;
          varying vec2 vUv;
          void main() {
            // 数据层以 0° 经线为左边界；底图同步平移 180°，确保经纬定位一致。
            vec2 mapUv = vec2(fract(vUv.x + 0.5), vUv.y);
            vec3 color = texture2D(uMap, mapUv).rgb;
            float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
            color = mix(vec3(luma), color, 0.82);
            color = (color - 0.5) * 1.12 + 0.5;
            color *= vec3(0.62, 0.67, 0.73);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      })
      const previousMaterial = worldMapBaseMesh.material
      worldMapBaseMesh.material = material
      if (previousMaterial instanceof THREE.Material) previousMaterial.dispose()
      drawFlatWorldMap()
    },
  )

  return true
}


type WorldMapViewportMetrics = {
  width: number
  height: number
  dpr: number
}

/**
 * 只同步最终 WebGL 显示画布。
 *
 * 这里故意使用 clientWidth / clientHeight，而不是 getBoundingClientRect()：
 * 后者会包含祖先元素 CSS transform（例如地图入场动画）的缩放结果，
 * 会把“视觉变换尺寸”误当成“布局尺寸”。
 *
 * 地理数据层不再使用这个 width / height 绘制，它们始终画在固定的
 * WORLD_MAP_TEXTURE_WIDTH × WORLD_MAP_TEXTURE_HEIGHT 经纬纹理上。
 */
function syncWorldMapViewport(): WorldMapViewportMetrics | null {
  const canvas = worldMapCanvasRef.value
  if (!canvas || !worldMapRenderer || !worldMapCamera) return null

  const width = Math.max(1, canvas.clientWidth)
  const height = Math.max(1, canvas.clientHeight)
  if (width < 2 || height < 2) return null

  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 0.5), 2)
  const expectedPixelWidth = Math.max(1, Math.round(width * dpr))
  const expectedPixelHeight = Math.max(1, Math.round(height * dpr))

  const cssSizeChanged =
    Math.abs(lastWorldMapWidth - width) > 0.01 ||
    Math.abs(lastWorldMapHeight - height) > 0.01
  const dprChanged = Math.abs(lastWorldMapDpr - dpr) > 0.001
  const bufferChanged =
    canvas.width !== expectedPixelWidth ||
    canvas.height !== expectedPixelHeight

  if (cssSizeChanged || dprChanged || bufferChanged) {
    lastWorldMapWidth = width
    lastWorldMapHeight = height
    lastWorldMapDpr = dpr

    worldMapRenderer.setPixelRatio(dpr)
    worldMapRenderer.setSize(width, height, false)
  }

  // 三个平面始终使用完全相同的几何变换。
  // frame 本身固定为 2:1；这里仍兼容极小的实际宽高比误差。
  const aspect = width / height
  const scaleX = aspect / 2
  worldMapBaseMesh?.scale.set(scaleX, 1, 1)
  worldMapStaticMesh?.scale.set(scaleX, 1, 1)
  worldMapDynamicMesh?.scale.set(scaleX, 1, 1)

  worldMapCamera.left = -aspect * 0.5
  worldMapCamera.right = aspect * 0.5
  worldMapCamera.top = 0.5
  worldMapCamera.bottom = -0.5
  worldMapCamera.updateProjectionMatrix()
  worldMapControls?.update()

  return { width, height, dpr }
}

function drawFlatWorldMap() {
  if (!isWorldMapView.value || !initWorldMapThreeScene()) return
  if (
    !worldMapRenderer ||
    !worldMapScene ||
    !worldMapCamera ||
    !worldMapStaticCanvas ||
    !worldMapDynamicCanvas ||
    !worldMapStaticTexture ||
    !worldMapDynamicTexture
  ) return

  // 只校准最终显示画布；地理纹理自身尺寸永远固定。
  const viewport = syncWorldMapViewport()
  if (!viewport) return

  const mapWidth = WORLD_MAP_TEXTURE_WIDTH
  const mapHeight = WORLD_MAP_TEXTURE_HEIGHT

  // 防御式校准：任何地方都不允许把两个离屏纹理改成跟 DOM 尺寸相关的大小。
  if (
    worldMapStaticCanvas.width !== mapWidth ||
    worldMapStaticCanvas.height !== mapHeight
  ) {
    worldMapStaticCanvas.width = mapWidth
    worldMapStaticCanvas.height = mapHeight
    pressureStaticCacheKey = ''
  }
  if (
    worldMapDynamicCanvas.width !== mapWidth ||
    worldMapDynamicCanvas.height !== mapHeight
  ) {
    worldMapDynamicCanvas.width = mapWidth
    worldMapDynamicCanvas.height = mapHeight
  }

  const staticContext = worldMapStaticCanvas.getContext('2d')
  const dynamicContext = worldMapDynamicCanvas.getContext('2d')
  if (!staticContext || !dynamicContext) return

  // 离屏地图画布使用固定逻辑像素，不再叠加 DPR transform。
  staticContext.setTransform(1, 0, 0, 1, 0, 0)
  staticContext.clearRect(0, 0, mapWidth, mapHeight)
  dynamicContext.setTransform(1, 0, 0, 1, 0, 0)
  dynamicContext.clearRect(0, 0, mapWidth, mapHeight)

  const winter = month.value <= 2 || month.value >= 10
  const centers = winter ? januaryPressureCenters : julyPressureCenters
  const pressureGrid = getPressureGrid(centers)

  if (layers.pressureBands) {
    drawPressureStaticLayer(staticContext, mapWidth, mapHeight, pressureGrid)
  }
  drawMapGrid(staticContext, mapWidth, mapHeight)

  if (layers.regionalPressureCenters) {
    centers.forEach(center => drawPressureCenter(staticContext, mapWidth, mapHeight, center))
  }

  // 阶段五的全球风场与季风永远画在固定地理纹理上。
  // 左侧面板展开/收起、浏览器缩放只会改变纹理最终显示大小，不会改变箭头所在 UV。
  if (currentStage.value === 4) {
    if (layers.surfaceWinds) {
      drawWindField(dynamicContext, mapWidth, mapHeight, centers)
    }
    if (layers.monsoonWinds) {
      drawMonsoonField(dynamicContext, mapWidth, mapHeight)
    }
  }

  worldMapStaticTexture.needsUpdate = true
  worldMapDynamicTexture.needsUpdate = true
  worldMapControls?.update()
  worldMapRenderer.render(worldMapScene, worldMapCamera)
}

/**
 * 阶段切换、侧栏布局变化时连续补几帧二维地图。
 * 这样即使 v-show / Grid / 浮层布局分两三个 RAF 才最终稳定，
 * 阶段五的动态箭头也不会等到“收起左侧”后才首次正确上传。
 */
function forceWorldMapRedraw(frameCount = 4) {
  nextTick(() => {
    let remaining = Math.max(1, frameCount)
    const redraw = () => {
      if (componentDestroyed || !isWorldMapView.value) return
      drawFlatWorldMap()
      remaining -= 1
      if (remaining > 0) requestAnimationFrame(redraw)
    }
    requestAnimationFrame(redraw)
  })
}

function scheduleFlatMapDraw() {
  forceWorldMapRedraw(2)
}

function setWorldMapZoom(nextZoom: number) {
  if (!worldMapCamera) initWorldMapThreeScene()
  if (!worldMapCamera) return
  const clampedZoom = Math.max(0.7, Math.min(6, Math.round(nextZoom * 100) / 100))
  worldMapCamera.zoom = clampedZoom
  worldMapCamera.updateProjectionMatrix()
  mapZoom.value = clampedZoom
  worldMapControls?.update()
  drawFlatWorldMap()
}

function zoomWorldMap(delta: number) {
  if (delta > 0 && !isMapExpanded.value) {
    isMapExpanded.value = true
    nextTick(() => requestAnimationFrame(() => setWorldMapZoom(mapZoom.value + delta)))
    return
  }
  setWorldMapZoom(mapZoom.value + delta)
}

function resetWorldMapView() {
  mapZoom.value = 1
  isMapExpanded.value = false
  if (worldMapCamera) {
    worldMapCamera.position.set(0, 0, 2)
    worldMapCamera.up.set(0, 1, 0)
    worldMapCamera.zoom = 1
    worldMapCamera.lookAt(0, 0, 0)
    worldMapCamera.updateProjectionMatrix()
  }
  worldMapControls?.target.set(0, 0, 0)
  worldMapControls?.update()
  scheduleFlatMapDraw()
}

// ==================== 动态大气图层重建 ====================
function rebuildDynamicAtmosphere(force = false) {
  if (!sceneReady || !earthMesh) return

  const latitudeOffset = getSeasonalLatitudeOffset()

  if (
    !force &&
    Number.isFinite(lastAppliedSeasonalOffset) &&
    Math.abs(lastAppliedSeasonalOffset - latitudeOffset) < 0.0001 &&
    threeCellRoot &&
    pressureBeltGroup &&
    windArrowGroup &&
    pressureArrowGroup &&
    subsolarLineGroup
  ) {
    applyLayerVisibility()
    return
  }

  smokeStreams = smokeStreams.filter(item => item.mode === 'single')
  circulationDirectionArrows = circulationDirectionArrows.filter(item => item.mode === 'single')
  windDirectionArrows.length = 0
  verticalFlowDirectionArrows.length = 0
  verticalSmokeMaterials.length = 0
  windFlowMaterials.length = 0

  removeAndDispose(earthMesh, threeCellRoot)
  removeAndDispose(earthMesh, pressureBeltGroup)
  removeAndDispose(earthMesh, windArrowGroup)
  removeAndDispose(earthMesh, pressureArrowGroup)
  removeAndDispose(earthMesh, subsolarLineGroup)

  circulationLineGroups = null
  circulationAirflowGroups = null

  threeCellRoot = createThreeCellSystem(latitudeOffset)
  pressureBeltGroup = createPressureBands(latitudeOffset)
  windArrowGroup = createWindArrows(latitudeOffset)
  pressureArrowGroup = createPressureArrows(latitudeOffset)
  subsolarLineGroup = createSubsolarLatitudeLine()

  earthMesh.add(
    threeCellRoot,
    pressureBeltGroup,
    windArrowGroup,
    pressureArrowGroup,
    subsolarLineGroup,
  )

  lastAppliedSeasonalOffset = latitudeOffset
  resetCirculationFormation()
  applyLayerVisibility()
}

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
  atmosphereMesh = createAtmosphereMesh()
  earthGroup.add(earthMesh, atmosphereMesh)

  new THREE.TextureLoader().load(
    '/geo-resources-folder/images/Material.003_diffuse.jpg',
    texture => {
      if (componentDestroyed) {
        texture.dispose()
        return
      }

      texture.colorSpace = THREE.SRGBColorSpace
      const previousTexture = earthMaterial.uniforms.uMap.value as THREE.Texture
      earthMaterial.uniforms.uMap.value = texture

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
  pressureBeltGroup = createPressureBands(0)
  windArrowGroup = createWindArrows(0)
  pressureArrowGroup = createPressureArrows(0)
  latLineGroup = createLatLines()
  subsolarLineGroup = createSubsolarLatitudeLine()
  regionalPressureRoot = createRegionalPressureSystem()
  monsoonRoot = createMonsoonSystem()

  earthMesh.add(
    singleCellRoot,
    threeCellRoot,
    pressureBeltGroup,
    windArrowGroup,
    pressureArrowGroup,
    latLineGroup,
    subsolarLineGroup,
    regionalPressureRoot,
    monsoonRoot,
  )

  lastAppliedSeasonalOffset = 0

  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => {
    /*
     * 连续变化时只重置定时器，不直接执行 setSize。
     */
    scheduleSceneResize(110)
  })

  threeResizeObserver.observe(container)

  // 二维地图直接监听实际 2:1 frame。侧栏展开/收起、浏览器缩放、
  // vh 变化最终都会反映到这个元素的布局尺寸。
  const worldMapFrame = worldMapCanvasRef.value?.closest('.world-map-frame')
  if (worldMapFrame instanceof HTMLElement) {
    worldMapResizeObserver = new ResizeObserver(() => {
      if (!isWorldMapView.value || componentDestroyed) return
      forceWorldMapRedraw(3)
    })
    worldMapResizeObserver.observe(worldMapFrame)
  }

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

    stream.mesh.material.uniforms.uTime.value = timeAccum
    stream.mesh.material.uniforms.uReveal.value = circulationRevealProgress
  })

  verticalSmokeMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
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
  if (
    item.mesh.userData.planarFlowArrow ||
    item.mode === 'vertical' ||
    item.mode === 'wind' ||
    item.mode === 'monsoon'
  ) {
    orientPlanarArrowOnCurve(item.mesh, position, tangent)
  } else {
    item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
  }

}

function updateAnimatedArrows(deltaTime: number) {
  if (!isPlaying.value) return

  const activeCirculationMode = simMode.value === 'single' ? 'single' : 'three'

  circulationDirectionArrows.forEach(item => {
    if (item.mode !== activeCirculationMode) return
    if (!item.mesh.parent?.visible) return
    updateMovingArrowItem(item, deltaTime)
  })

  if (simMode.value !== 'single' && layers.surfaceWinds) {
    windDirectionArrows.forEach(item => {
      if (!item.mesh.parent?.visible) return
      updateMovingArrowItem(item, deltaTime)
    })
  }

  if (currentStage.value === 3 && layers.monsoonWinds) {
    monsoonDirectionArrows.forEach(item => {
      if (!item.mesh.parent?.visible) return
      updateMovingArrowItem(item, deltaTime)
    })
  }

  if (layers.pressureArrows) {
    verticalFlowDirectionArrows.forEach(item => {
      if (!item.mesh.parent?.visible) return
      updateMovingArrowItem(item, deltaTime)
    })
  }

  windFlowMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
  })

  singleCellArrowMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
  })

  monsoonFlowMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
  })

  regionalPressureMaterials.forEach(material => {
    material.uniforms.uTime.value = timeAccum
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
  const progress = easeInOutCubic(rawProgress)

  camera.position.lerpVectors(
    viewStartCameraPosition,
    viewTargetCameraPosition,
    progress,
  )

  orbitControls.target.lerpVectors(
    viewStartOrbitTarget,
    viewTargetOrbitTarget,
    progress,
  )

  earthGroup.rotation.z = THREE.MathUtils.lerp(
    viewStartEarthGroupZ,
    viewTargetEarthGroupZ,
    progress,
  )

  earthMesh.rotation.y = THREE.MathUtils.lerp(
    viewStartEarthMeshY,
    viewTargetEarthMeshY,
    progress,
  )

  if (rawProgress >= 1) {
    viewTransitionActive = false
    orbitControls.enabled = true
    rotationAngle = earthMesh.rotation.y
  }
}

function animate() {
  animationId = requestAnimationFrame(animate)

  if (!sceneReady || !earthMesh) return

  const deltaTime = Math.min(clock.getDelta(), 0.05)

  if (isPlaying.value) {
    // 阶段五二维地图与三维场景共用同一套播放状态和动画倍速。
    // 暂停时 mapAnimTime 不再推进；切换 0.5×~5× 时风场/季风箭头同步变速。
    mapAnimTime += deltaTime * playbackSpeed.value
    timeAccum += deltaTime * playbackSpeed.value

    if (currentStage.value !== 0 && !isCloseView.value && !viewTransitionActive) {
      const rotationSpeed = 0.075
      rotationAngle += deltaTime * rotationSpeed * playbackSpeed.value
      earthMesh.rotation.y = rotationAngle
    }

    circulationRevealProgress = Math.min(1, circulationRevealProgress + deltaTime * 0.28 * Math.max(1, playbackSpeed.value * 0.8))
  }

  updateSmokeStreams()
  updateAnimatedArrows(deltaTime)
  updateFadingGroups(deltaTime)
  updateViewTransition(deltaTime)
  orbitControls?.update()

  if (isWorldMapView.value) {
    drawFlatWorldMap()
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }

  updateLabels()
}

// ==================== 标签更新 ====================
function isLabelLayerVisible(label: SceneLabel) {
  if (!layers.textAnnotations) return false

  if (simMode.value === 'single') {
    return label.type === 'single'
  }

  if (label.type === 'pressure') return !!layers.pressureBands
  if (label.type === 'wind') return !!layers.surfaceWinds
  if (label.type === 'vertical') return !!layers.pressureArrows

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
  if (label.type === 'vertical') return EARTH_RADIUS + 0.58
  if (label.type === 'single') return EARTH_RADIUS + 0.82
  return EARTH_RADIUS + 0.86
}

function getCirculationLabelPosition(
  label: SceneLabel,
  seasonalOffset: number,
) {
  if (!label.circulationId) return null

  const definition = label.type === 'single'
    ? singleCellDefinitions.find(item => item.id === label.circulationId)
    : threeCellDefinitions.find(item => item.id === label.circulationId)

  if (!definition) return null

  const curve = new AtmosphericCellCurve(
    definition,
    getCellCenterLon(definition),
    label.type === 'single' ? 0 : seasonalOffset,
  )

  const position = curve.getPointAt(label.curveProgress ?? 0.63)

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
    const shouldShift = simMode.value === 'seasonal' && label.type !== 'single'
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

function syncStageView(stageIndex: number, deferThreeSceneReveal = false) {
  // 阶段四、五切换为平面世界地图；前三阶段继续使用三维地球。
  cancelAnimationFrame(threeSceneRevealFrame)

  if (stageIndex >= 3) {
    isWorldMapView.value = true
  } else if (!deferThreeSceneReveal) {
    isWorldMapView.value = false
    resetWorldMapView()
  }

  setCloseViewState(false, true)
  if (stageIndex >= 3) {
    forceWorldMapRedraw(4)
  } else {
    scheduleFlatMapDraw()
  }
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

  setFadingGroupVisibility(
    windArrowGroup,
    !singleMode && !!layers.surfaceWinds,
  )

  if (pressureBeltGroup) {
    pressureBeltGroup.visible = !singleMode && !!layers.pressureBands
  }

  setFadingGroupVisibility(
    pressureArrowGroup,
    !singleMode && !!layers.pressureArrows,
  )

  if (latLineGroup) {
    latLineGroup.visible = !!layers.latLines
  }

  if (regionalPressureRoot) {
    regionalPressureRoot.visible = currentStage.value === 3
    regionalPressureRoot.traverse(object => {
      if (object.userData.regionalPressureTextOverlay) {
        object.visible = !!layers.textAnnotations
      }
    })
  }

  if (monsoonRoot) {
    monsoonRoot.visible = true
    monsoonRoot.traverse(object => {
      if (object.userData.annotationSprite || object.userData.monsoonTextOverlay) {
        object.visible = !!layers.textAnnotations
      }
    })
  }

  updateStageFourSeasonVisibility()
}

function isLayerAvailable(key: string) {
  const stage = stages[currentStage.value]
  return !!stage?.layers?.[key]
}

function applyStage(stageIndex: number) {
  const stage = stages[stageIndex]
  if (!stage) return
  const leavingWorldMap = isWorldMapView.value && stageIndex < 3

  // 阶段一必须使用理想单圈模式，其余阶段统一使用三圈模式。
  simMode.value = stageIndex === 0 ? 'single' : 'three'

  if (stageIndex === 0 && earthMesh) {
    rotationAngle = DEFAULT_EARTH_ROTATION
    earthMesh.rotation.y = rotationAngle
  }

  Object.keys(layers).forEach(key => {
    layers[key] = false
  })

  Object.entries(stage.layers).forEach(([key, value]) => {
    layers[key] = value
  })

  stepDone.value = {}
  // 从二维地图返回地球时先保留地图遮罩，等三维场景完成重建与首帧渲染后再揭开。
  syncStageView(stageIndex, leavingWorldMap)

  if (sceneReady) {
    rebuildDynamicAtmosphere()
  }

  applyLayerVisibility()

  if (stageIndex < 3 && renderer && scene && camera) {
    orbitControls?.update()
    renderer.render(scene, camera)
  }

  if (leavingWorldMap) {
    nextTick(() => {
      threeSceneRevealFrame = requestAnimationFrame(() => {
        if (componentDestroyed || currentStage.value !== stageIndex || stageIndex >= 3) return

        // 再确认一帧已经写入 WebGL 缓冲区，然后才让 v-show 切回三维画布。
        orbitControls?.update()
        renderer?.render(scene!, camera!)
        isWorldMapView.value = false
        resetWorldMapView()

        nextTick(() => {
          resizeThreeSceneNow()
          renderer?.render(scene!, camera!)
        })
      })
    })
  }

  // 等 Vue 的 v-show、左侧布局以及 stage layers 全部提交后连续补绘。
  // 阶段五必须在这里再次强制上传动态纹理，不能依赖用户之后收起侧栏来触发 resize。
  if (stageIndex >= 3) forceWorldMapRedraw(stageIndex === 4 ? 6 : 4)
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
  10000, // 阶段四
  10000, // 阶段五完整展示后自动结束
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
    // 第五阶段的“从头演示”是明确的重新开始，因此仍从阶段一启动。
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

  // 阶段四、五：三维容器被 v-show 隐藏，clientWidth/Height 为 0。
  // 此时只需重绘平面世界地图（等压线、风向箭头），跳过三维 resize。
  if (isWorldMapView.value) {
    scheduleFlatMapDraw()
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

  renderer.setSize(
    width,
    height,
    false
  )

  /*
   * setSize 后立即补绘一帧，避免等待下一次动画循环时短暂空白。
   */
  if (scene) {
    renderer.render(
      scene,
      camera
    )
  }

  /*
   * 阶段四、五的平面世界地图（等压线、风向箭头）需要随容器尺寸变化重绘，
   * 否则纹理保持旧分辨率，视觉上发生偏移。
   */
  if (isWorldMapView.value) {
    scheduleFlatMapDraw()
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
  if (isWorldMapView.value) scheduleFlatMapDraw()
}, { deep: true })

watch(simMode, () => {
  if (!sceneReady) return
  resetCirculationFormation()
  rebuildDynamicAtmosphere()
  applyLayerVisibility()
})

watch(month, () => {
  if (!sceneReady) return
  rebuildDynamicAtmosphere()
  updateStageFourSeasonVisibility()
  if (isWorldMapView.value) scheduleFlatMapDraw()
})

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

  worldMapResizeObserver?.disconnect()
  worldMapResizeObserver = null
  lastWorldMapWidth = 0
  lastWorldMapHeight = 0
  lastWorldMapDpr = 0

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

  worldMapControls?.dispose()
  worldMapControls = null

  if (worldMapScene) disposeObject3D(worldMapScene)
  worldMapRenderer?.renderLists.dispose()
  worldMapRenderer?.dispose()
  worldMapRenderer?.forceContextLoss()
  worldMapRenderer = null
  worldMapScene = null
  worldMapCamera = null
  worldMapBaseMesh = null
  worldMapStaticMesh = null
  worldMapDynamicMesh = null
  worldMapStaticCanvas = null
  worldMapDynamicCanvas = null
  worldMapStaticTexture = null
  worldMapDynamicTexture = null

  if (scene) {
    if (scene.background instanceof THREE.Texture) {
      scene.background.dispose()
      scene.background = null
    }
    disposeObject3D(scene)
  }

  smokeStreams.length = 0
  circulationDirectionArrows.length = 0
  windDirectionArrows.length = 0
  monsoonDirectionArrows.length = 0
  verticalFlowDirectionArrows.length = 0
  verticalSmokeMaterials.length = 0
  fadingGroups.length = 0
  windFlowMaterials.length = 0
  singleCellArrowMaterials.length = 0
  monsoonFlowMaterials.length = 0
  regionalPressureMaterials.length = 0

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
  atmosphereMesh = null
  earthWireframe = null
  singleCellRoot = null
  threeCellRoot = null
  circulationLineGroups = null
  circulationAirflowGroups = null
  singleCellAirflowGroup = null
  windArrowGroup = null
  pressureBeltGroup = null
  pressureArrowGroup = null
  latLineGroup = null
  subsolarLineGroup = null
  regionalPressureRoot = null
  regionalPressureSummerGroup = null
  regionalPressureWinterGroup = null
  monsoonRoot = null
  monsoonSummerGroup = null
  monsoonWinterGroup = null
})
</script>
<style scoped>
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
  grid-template-columns: repeat(5, 1fr);
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
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(8, 12, 28, 0.9);
  padding: 5px 14px;
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
  font-size: 18px;
}

.scene-label.label-cell-ferrel {
  color: #2ec4b6;
  border-color: rgba(46, 196, 182, 0.7);
  font-size: 18px;
}

.scene-label.label-cell-polar {
  color: #247cff;
  border-color: rgba(36, 124, 255, 0.7);
  font-size: 18px;
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
  font-size: 17px;
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
  font-size: 11px !important;
  padding: 3px 8px !important;
  border-width: 1.25px !important;
  border-radius: 4px !important;
}

.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-hadley,
.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-ferrel,
.general-atmospheric-circulation-container.layout-medium .scene-label.label-cell-polar {
  font-size: 13px !important;
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
  font-size: 11px !important;
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

/* ===================== 阶段四、五：平面世界地图 ===================== */
.general-atmospheric-circulation-container .world-map-stage {
  position: absolute;
  inset: 0;
  z-index: 18;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: clamp(18px, 3vh, 34px) clamp(12px, 2.4vw, 34px) 92px;
  box-sizing: border-box;
  overflow: hidden;
  background: rgba(0, 7, 20, 0.16);
  animation: world-map-reveal 0.72s cubic-bezier(0.2, 0.72, 0.2, 1) both;
}

.general-atmospheric-circulation-container .world-map-stage.map-expanded {
  position: fixed;
  inset: 0;
  z-index: 1200;
  gap: 12px;
  padding: 20px;
  background: rgba(0, 7, 18, 0.94);
  backdrop-filter: blur(14px);
  animation: none;
}

.general-atmospheric-circulation-container .world-map-stage.map-expanded .world-map-frame {
  width: min(94vw, calc((100vh - 116px) * 2));
  max-height: none;
  border: 0;
  box-shadow: none;
}

.general-atmospheric-circulation-container .world-map-stage.map-expanded .world-map-legend {
  background: rgba(3, 16, 33, 0.94);
}

.general-atmospheric-circulation-container .world-map-frame {
  position: relative;
  /* 只保留一套地图尺寸来源：既受中心区域宽度约束，也受视口高度约束。
     浏览器缩放时不会再被文件末尾第二套 width 规则二次覆盖。 */
  width: min(94vw, calc((100vh - 210px) * 2), 1800px);
  aspect-ratio: 2 / 1;
  max-height: calc(100% - 74px);
  flex: 0 0 auto;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  background: #071425;
  box-shadow: none;
}

.general-atmospheric-circulation-container .world-map-viewport {
  position: absolute;
  inset: 0;
  touch-action: none;
  cursor: grab;
}

.general-atmospheric-circulation-container .world-map-viewport.dragging {
  cursor: grabbing;
}

.general-atmospheric-circulation-container .world-map-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.general-atmospheric-circulation-container .world-map-canvas {
  display: block;
  z-index: 2;
  pointer-events: auto;
  touch-action: none;
}

.general-atmospheric-circulation-container .world-map-state-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1px solid rgba(108, 226, 255, 0.34);
  border-radius: 7px;
  background: rgba(2, 14, 29, 0.78);
  color: #cbefff;
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(8px);
}

.general-atmospheric-circulation-container .world-map-state-badge strong {
  color: #73ebff;
}

.general-atmospheric-circulation-container .world-map-interaction-hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 3;
  padding: 6px 9px;
  border: 1px solid rgba(122, 205, 255, 0.24);
  border-radius: 6px;
  background: rgba(3, 15, 30, 0.72);
  color: rgba(210, 238, 255, 0.82);
  font-size: 11px;
  letter-spacing: 0.02em;
  pointer-events: none;
  backdrop-filter: blur(6px);
}

.general-atmospheric-circulation-container .world-map-legend {
  display: grid;
  grid-template-columns: auto minmax(250px, 390px);
  align-items: center;
  column-gap: 12px;
  row-gap: 5px;
  padding: 9px 14px;
  border: 1px solid rgba(143, 218, 255, 0.34);
  border-radius: 8px;
  background: rgba(3, 16, 33, 0.82);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28);
  color: #e7f7ff;
}

.general-atmospheric-circulation-container .world-map-legend .legend-title {
  grid-row: 1 / 4;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .pressure-scale {
  height: 13px;
  border: 1px solid rgba(255, 255, 255, 0.46);
  background: linear-gradient(90deg, #455ce7 0%, #7292ef 20%, #a8ddff 38%, #f5f1df 53%, #ffc578 72%, #ff5d35 100%);
}

.general-atmospheric-circulation-container .legend-values {
  color: #d8e9f5;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.general-atmospheric-circulation-container .legend-source {
  color: rgba(174, 212, 232, 0.78);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
}

@keyframes world-map-reveal {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (max-width: 900px) {
  .general-atmospheric-circulation-container .world-map-stage {
    gap: 10px;
    padding: 14px 10px 84px;
  }

  .general-atmospheric-circulation-container .world-map-frame {
    max-height: calc(100% - 58px);
  }

  .general-atmospheric-circulation-container .world-map-legend {
    grid-template-columns: auto minmax(150px, 250px);
    padding: 7px 10px;
  }
}

/* ===================== 右侧悬浮卡、代表月份与全宽二维地图 ===================== */
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

.general-atmospheric-circulation-container .world-map-stage {
  padding-inline: clamp(8px, 1vw, 18px);
}

.general-atmospheric-circulation-container .world-map-legend {
  align-self: center;
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

.general-atmospheric-circulation-container .legend-symbol.legend-dot {
  width: 9px;
  height: 9px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 50%;
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

.general-atmospheric-circulation-container .legend-symbol.legend-ribbon {
  width: 26px;
  height: 6px;
  border: 0;
  border-radius: 999px;
  transform: skewX(-16deg);
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
