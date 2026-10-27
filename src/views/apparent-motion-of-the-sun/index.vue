<template>
  <div ref="pageRef" class="apparent-motion-of-the-sun-container geo-template-page geo-page theme-light"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" :src="logoUrl" alt="logo" />
      </div>

      <h1 class="page-title">太阳视运动</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :aria-pressed="panelsVisible"
          @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside class="sun-panel-stack" aria-label="观测控制与数据">
        <FloatingFeatureCard v-show="panelsVisible" class="control-floating-card" title="控制面板" subtitle="调整观测纬度、日期与场景图层" variant="control"
          :initial-top="floatingPanelTop" :initial-right="18" :bottom-inset="floatingPanelBottomInset" :min-height="120"
          draggable resizable light v-model:collapsed="controlCardCollapsed">
          <div class="panel-scroll">
            <section class="geo-card control-section">
              <div class="section-title-row">
                <h3 class="section-title">观测位置</h3>
                <strong class="control-value">
                  {{ latDisplay }}
                </strong>
              </div>

              <div class="option-grid city-grid">
                <button v-for="city in cities" :key="city.name" type="button" class="theme-btn option-btn"
                  :class="{ active: activeCity === city.name }" @click="setLocation(city.lat, city.name)">
                  {{ city.name }}
                </button>
              </div>

              <div class="section-title-row compact-title-row">
                <span class="mini-control-label">纬度微调</span>
                <strong class="control-value">
                  -90° ～ 90°
                </strong>
              </div>

              <el-slider :model-value="currentLatitude" :min="-90" :max="90" :step="0.5" :show-tooltip="false"
                aria-label="观测纬度" @input="handleLatitudeSlider" />

              <div class="scale-labels latitude-scale" role="group" aria-label="关键纬度快捷选择">
                <button v-for="mark in latitudeMarks" :key="mark.value" type="button" class="latitude-mark"
                  :style="{ left: `${(mark.value + 90) / 180 * 100}%` }" :aria-label="`选择${mark.name}（${mark.label}）`"
                  :title="`选择${mark.name}（${mark.label}）`" :aria-pressed="currentLatitude === mark.value"
                  @click="selectLatitudeMark(mark.value)">
                  {{ mark.label }}
                </button>
              </div>
            </section>

            <section class="geo-card control-section">
              <div class="section-title-row">
                <h3 class="section-title">日期与参考节气</h3>
                <strong class="control-value">
                  {{ currentSeasonName }}
                </strong>
              </div>

              <div class="option-grid season-grid">
                <button v-for="season in seasons" :key="season.id" type="button" class="theme-btn option-btn"
                  :class="{ active: activeSeason === season.id }" @click="setSeason(season.id)">
                  {{ season.name }}
                </button>
              </div>

              <div class="section-title-row compact-title-row">
                <span class="mini-control-label">
                  第 {{ currentDayOfYear }} 天
                </span>
                <strong class="control-value">
                  {{ monthDayDisplay }}
                </strong>
              </div>

              <el-slider :model-value="currentDayOfYear" :min="1" :max="365" :step="1" :show-tooltip="false"
                aria-label="2026年日期" @input="handleDaySlider" />

              <div class="parameter-banner">
                <span>直射纬度 δ（近似）</span>
                <strong>
                  {{ declinationDisplay }}
                </strong>
              </div>
            </section>

            <section class="geo-card control-section">
              <div class="section-title-row">
                <h3 class="section-title">观察视角</h3>
                <strong class="control-value">
                  {{ currentViewName }}
                </strong>
              </div>

              <div class="option-grid view-grid">
                <button v-for="viewItem in views" :key="viewItem.id" type="button" class="theme-btn option-btn"
                  :class="{ active: !groundView && activeView === viewItem.id }" @click="setView(viewItem.id)">
                  {{ viewItem.name }}
                </button>
              </div>
              <div class="observer-actions">
                <button type="button" class="theme-btn" :aria-pressed="correspondenceActive" @click="toggleCorrespondence">
                  {{ correspondenceActive ? '结束视角演示' : '同一地点，换个视角' }}
                </button>
                <button type="button" class="theme-btn" :aria-pressed="groundView" @click="toggleGroundView">
                  {{ groundView ? '返回天穹总览' : '站到这里看' }}
                </button>
                <button type="button" class="theme-btn" title="准备40°N春分06:00，从东方观察日出，再点击播放" @click="startDayLesson">春分的一天</button>
                <button type="button" class="theme-btn" @click="setView('free')">重置视角</button>
              </div>
              <div v-if="groundView" class="ground-view-controls">
                <span>{{ atPole ? '参考转角' : '视线' }} {{ Math.round(lookHeading) }}° · 仰角 {{ Math.round(lookPitch) }}°</span>
                <button v-for="direction in groundDirections" :key="direction.heading" type="button"
                  @click="lookToward(direction.heading)">{{ direction.name }}</button>
                <button type="button" @click="locateSun">定位太阳</button>
              </div>
            </section>

            <section class="geo-card control-section">
              <h3 class="section-title">场景图层</h3>

              <div class="switch-row first-control-row">
                <div class="control-copy">
                  <strong>天穹半球</strong>
                  <span>显示天空半球网格</span>
                </div>

                <el-switch v-model="showDome" aria-label="显示天穹网格" />
              </div>

              <div class="switch-row">
                <div class="control-copy">
                  <strong>城市建筑群</strong>
                  <span>显示作为观测参照的城市建筑</span>
                </div>

                <el-switch v-model="showBuildings" aria-label="显示城市建筑" />
              </div>

              <div class="switch-row">
                <div class="control-copy">
                  <strong>太阳投影</strong>
                  <span>显示随太阳位置变化的地面阴影</span>
                </div>

                <el-switch v-model="showShadows" aria-label="显示太阳投影" />
              </div>

              <div class="switch-row">
                <div class="control-copy">
                  <strong>方位辅助线</strong>
                  <span>{{ atPole ? '显示地面的参考十字线' : '显示地面的南北、东西辅助线' }}</span>
                </div>

                <el-switch v-model="showGrid" aria-label="显示方位辅助线" />
              </div>

              <div class="switch-row">
                <div class="control-copy">
                  <strong>太阳日周轨迹</strong>
                  <span>实线为地平线上方，虚线为下方</span>
                </div>

                <el-switch v-model="showPath" aria-label="显示太阳日周轨迹" />
              </div>
            </section>
          </div>

        </FloatingFeatureCard>

        <FloatingFeatureCard v-show="panelsVisible" class="data-floating-card" title="数据面板" subtitle="查看太阳高度、昼长与日出日落方位" variant="data"
          :initial-top="floatingPanelTop + 72" :initial-right="18" :bottom-inset="floatingPanelBottomInset"
          :min-height="120" draggable resizable light v-model:collapsed="dataCardCollapsed">
          <div class="data-grid sun-data-grid">
            <article v-for="item in sunDataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>
          <div class="trajectory-note">
            <strong>轨迹平面倾角 {{ formatDegrees(trackInclination) }}</strong>
            <p>与地平面的夹角为 90° − |纬度|。{{ trackTiltDescription }}</p>
            <p>节气改变轨迹的位置，不改变这一夹角；屏幕上的投影角度会随视角变化。</p>
          </div>
          <details class="model-note">
            <summary>模型说明</summary>
            <p>采用2026年代表节气日期与近似直射纬度，城市纬度作教学取整。一天内保持直射纬度不变，以太阳中心经过地平线为日出、日落，未计入大气折射和太阳视半径。</p>
            <p v-if="atPole">极点沿所选参考经线计时，用于两窗同步对照；在一天内赤纬不变的模型中，太阳高度全天不变，不存在唯一的正午最高点。二分日太阳中心全天位于地平线上。</p>
            <p v-else>地方时12:00表示太阳经过当地子午线、升到最高，不等于北京时间12:00。</p>
            <p>参考节气为距离所选日期最近的八个预设节气之一。</p>
            <p>左侧太空视角为参考经线上的纬度示意，不表示所选城市的真实经度。小人和地平面均放大展示；右侧当地天空中的轨迹是视运动，不是太阳绕地球的实体轨道。</p>
            <p>地球绕地轴自转，太阳日周轨迹所在平面与赤道面平行。紫色轨迹参考面平移到小人脚下，用于和青色地平面对比；两面的夹角 β 为轨迹倾角，β = 90° − |纬度|。橙色 h 为当前太阳高度，随地方时变化。</p>
            <p v-if="atPole">{{ poleDirectionNote }}。两窗保留的十字线和转角只用于比较视角，不表示唯一的地理东、西方向。</p>
          </details>
        </FloatingFeatureCard>
      </aside>

      <div ref="linkedScenesRef" class="linked-scenes" :class="{ 'is-splitting': splitDragging }"
        :style="{ gridTemplateColumns: `${splitPercent}% minmax(0, 1fr)` }">
      <section id="sun-space-pane" class="space-stage" aria-label="太空视角">
        <header class="space-stage-heading">
          <strong>太空视角 · 地球上的观测者</strong>
          <span>{{ latDisplay }} · {{ monthDayDisplay }} · 地方时 {{ solarTimeStr }}</span>
        </header>
        <SpaceObserverWindow ref="spaceObserverRef" :latitude="currentLatitude" :declination="currentDeclination" :hour-angle="currentHourAngle"
          :correspondence-highlight="correspondenceHighlight" @request-correspondence="toggleCorrespondence"
          @correspondence-ready="handleCorrespondenceReady" @correspondence-end="stopCorrespondence()" />
        <div v-if="correspondenceActive" class="correspondence-note" :class="{ 'is-altitude': correspondencePhase === 'altitude' }" role="status" aria-live="polite">
          <strong>{{ correspondenceCopy.title }}</strong>
          <span>{{ correspondenceCopy.description }}</span>
          <button v-if="correspondencePhase === 'ground'" type="button" @click="showCorrespondenceAltitude">下一步：看太阳高度</button>
          <button v-else-if="correspondencePhase === 'altitude'" type="button" @click="showCorrespondenceGround">再看地平面</button>
        </div>
      </section>
      <div class="scene-divider" role="separator" tabindex="0" aria-label="调整左右视图宽度"
        aria-orientation="vertical" aria-controls="sun-space-pane sun-local-pane" :aria-valuemin="30" :aria-valuemax="70"
        :aria-valuenow="Math.round(splitPercent)" :aria-valuetext="`太空视角 ${Math.round(splitPercent)}%，当地天空 ${Math.round(100 - splitPercent)}%`"
        :style="{ left: `${splitPercent}%` }" @pointerdown="startSplit" @pointermove="moveSplit"
        @pointerup="stopSplit" @pointercancel="stopSplit" @lostpointercapture="stopSplit"
        @keydown="resizeSplitWithKeyboard" @dblclick="splitPercent = 50"><span>⋮</span></div>
      <section id="sun-local-pane" class="center-stage" aria-label="当地天空">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host" :class="{ 'ground-view': groundView }"
            role="region" tabindex="0" :aria-label="groundView ? '第一人称天空，拖动或使用方向键环顾' : '当地天空示意，拖动旋转'"
            @keydown.esc="leaveGroundView" @pointerdown.capture="startCorrespondencePointer"
            @pointermove.capture="moveCorrespondencePointer" @pointerup.capture="clearCorrespondencePointer"
            @pointercancel.capture="clearCorrespondencePointer" @wheel.capture="stopCorrespondence(false)" />
          <div class="observer-toolbar">
            <div class="observer-heading">
              <strong>{{ groundView ? '观测者眼中的天空' : '当地天空 · 观测者在这里' }}</strong>
              <span>{{ latDisplay }} · {{ monthDayDisplay }} · 地方时 {{ solarTimeStr }}</span>
            </div>
          </div>
          <div class="observer-caption">
            <p v-if="correspondenceActive" class="correspondence-caption" :class="{ 'is-altitude': correspondencePhase === 'altitude' }">
              {{ correspondencePhase === 'altitude' ? `同一太阳高度 h = ${formatDegrees(currentSunHeight)}` : '青色地平面，与左侧对应' }}
            </p>
            <p v-else-if="!groundView"><i class="observer-key"></i>地平面 <i class="observer-key reference-plane-key"></i>轨迹参考面</p>
            <p v-if="atPole" class="pole-direction-note">{{ poleDirectionNote }}</p>
            <p v-if="atPole" class="observer-explanation">参考经线计时 · 日内太阳高度不变</p>
            <p v-if="groundView" class="observer-explanation">{{ currentSunHeight < 0 ? '太阳在地平线下' : '拖动或方向键环顾' }}</p>
          </div>
        </div>
      </section>
      </div>
        <div class="timeline-dock sun-timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isAnimating }"
            :aria-label="isAnimating ? '暂停' : '播放'" :title="isAnimating ? '暂停' : '播放'" @click="toggleAnimation">
            <el-icon>
              <VideoPause v-if="isAnimating" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="solar-time-readout">
            <span>地方时</span>
            <strong>{{ solarTimeStr }}</strong>
          </div>

          <div class="timeline-main">
            <div class="time-markers" role="group" aria-label="地方时快捷选择">
              <button v-for="marker in hourMarkers" :key="marker.label" type="button" class="time-marker-btn"
                :aria-label="`跳到地方时${marker.label}`" :title="`跳到地方时${marker.label}`"
                @click="updateHourAngle(marker.hourAngle)">
                {{ marker.label }}
              </button>
            </div>

            <el-slider :model-value="currentHourAngle" :min="-180" :max="180" :step="1" :show-tooltip="false"
              aria-label="地方时" @input="handleHourSlider" />
          </div>

          <div class="speed-options">
            <button v-for="speed in speedOptions" :key="speed" type="button" class="theme-btn speed-btn"
              :class="{ active: animSpeed === speed }" @click="updateSpeed(speed)">
              {{ speed }}×
            </button>
          </div>
        </div>

    </main>
  </div>
</template>


<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

import {
  ElIcon,
  ElSlider,
  ElSwitch,
} from 'element-plus'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { calculateSunPosition, closestSeason, dateFromDay, dayFromDate, declinationForDay, getDaylight, getTrackInclination, seasons } from './solar-model'
import { advanceHourAngle } from './playback'
import { getSkyAppearance } from './sky-appearance'
import SpaceObserverWindow from './SpaceObserverWindow.vue'
import { createObserverFigure, faceObserverTowardSun } from './observer-figure'
import { createObserverLookControls } from './observer-look-controls'
import { formatAngleDMS as formatDegrees, formatLatitudeDMS as formatLatitude } from './latitude-format'
import { HORIZONTAL_DIRECTIONS, getDirectionLabel, getPoleDirectionNote, isGeographicPole, type CardinalDirection } from './observer-directions'


// ===== 按太阳高度更新天空、环境光与地面 =====
function rgbStr(color: number[]): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`
}

function setColor(material: THREE.Color, color: number[]) {
  material.setRGB(color[0]! / 255, color[1]! / 255, color[2]! / 255)
}

function applySky(
  sunH: number,
  bgCanvas: HTMLCanvasElement,
  bgTexture: THREE.CanvasTexture,
  ambientLight: THREE.AmbientLight,
  hemiLight: THREE.HemisphereLight,
  groundMaterial: THREE.MeshLambertMaterial,
) {
  const appearance = getSkyAppearance(sunH)
  const bgCtx = bgCanvas.getContext('2d')!
  const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512)
  bgGrad.addColorStop(0, rgbStr(appearance.skyTop))
  bgGrad.addColorStop(0.35, rgbStr(appearance.skyMid))
  bgGrad.addColorStop(0.55, rgbStr(appearance.skyHorizon))
  bgGrad.addColorStop(0.75, rgbStr(appearance.groundMid))
  bgGrad.addColorStop(1, rgbStr(appearance.groundDark))
  bgCtx.fillStyle = bgGrad
  bgCtx.fillRect(0, 0, 2, 512)
  bgTexture.needsUpdate = true

  setColor(ambientLight.color, appearance.ambientColor)
  ambientLight.intensity = appearance.ambientIntensity * 0.5
  setColor(hemiLight.color, appearance.hemisphereSkyColor)
  setColor(hemiLight.groundColor, appearance.hemisphereGroundColor)
  hemiLight.intensity = appearance.hemisphereIntensity * 0.5
  setColor(groundMaterial.color, appearance.groundColor.map(channel => Math.max(channel * 0.55, 22)))
}
// --- 城市与节气预设数据 ---
const cities = [
  { lat: 90, name: '北极' },
  { lat: 66.56, name: '北极圈' },
  { lat: 45, name: '哈尔滨' },
  { lat: 40, name: '北京' },
  { lat: 31, name: '上海' },
  { lat: 23, name: '广州' },
  { lat: 0, name: '赤道' },
  { lat: -6, name: '雅加达' },
  { lat: -23, name: '圣保罗' },
  { lat: -34, name: '悉尼' },
  { lat: -43, name: '霍巴特' },
  { lat: -66.56, name: '南极圈' },
  { lat: -90, name: '南极' },
]


const viewPresets = [
  { id: 'south', name: '从南看', heading: 180 },
  { id: 'north', name: '从北看', heading: 0 },
  { id: 'east', name: '从东看', heading: 90 },
  { id: 'west', name: '从西看', heading: 270 },
  { id: 'top', name: '俯瞰' },
  { id: 'free', name: '自由' },
]

const latitudeMarks = [
  { value: -90, name: '南极' },
  { value: -23.44, name: '南回归线' },
  { value: 0, name: '赤道' },
  { value: 23.44, name: '北回归线' },
  { value: 90, name: '北极' },
].map(mark => ({
  ...mark,
  label: formatLatitude(mark.value),
}))

// --- 核心状态 ---
const currentLatitude = ref(40)
const atPole = computed(() => isGeographicPole(currentLatitude.value))
const poleDirectionNote = computed(() => getPoleDirectionNote(currentLatitude.value))
const views = computed(() => viewPresets.map(view => ({
  ...view,
  name: atPole.value && view.heading !== undefined ? `参考${view.heading}°` : view.name,
})))
const currentDeclination = ref(declinationForDay(dayFromDate('2026-03-20')))
// 从春分上午开始，先建立地球自转与当地天空的对应，再比较纬度和季节。
const currentHourAngle = ref(-45)
const currentSeasonName = ref('春分')
const currentDate = ref('2026-03-20')
const activeCity = ref('北京')
const activeSeason = ref('chunfen')
const activeView = ref('free')
const isAnimating = ref(false)
const animSpeed = ref(1)
const spaceObserverRef = ref<InstanceType<typeof SpaceObserverWindow> | null>(null)
type CorrespondencePhase = 'idle' | 'aligning' | 'ground' | 'altitude'
const correspondencePhase = ref<CorrespondencePhase>('idle')
const correspondenceActive = computed(() => correspondencePhase.value !== 'idle')
const correspondenceHighlight = computed(() => correspondencePhase.value === 'idle' ? null : correspondencePhase.value === 'altitude' ? 'altitude' : 'ground')
let correspondencePointer: { id: number; x: number; y: number } | null = null
let correspondenceSaved: {
  position: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3; damping: boolean;
  wasGround: boolean; heading: number; pitch: number; controlCollapsed: boolean; dataCollapsed: boolean;
} | null = null

const threeContainerRef =
  ref<HTMLElement | null>(null)

/*
 * Logo 预留位置。
 * 后续可直接改为：
 * const logoUrl = ref('/images/logo.png')
 */
const logoUrl = ref(
  'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'
)

const speedOptions =
  [1, 2, 5, 10, 20]

const hourMarkers = [
  { label: '00:00', hourAngle: -180 },
  { label: '06:00', hourAngle: -90 },
  { label: '12:00', hourAngle: 0 },
  { label: '18:00', hourAngle: 90 },
  { label: '24:00', hourAngle: 180 },
]

const controlCardCollapsed = ref(true)
const dataCardCollapsed = ref(true)
const panelsVisible = ref(true)
const compactPanelViewport = ref(window.innerWidth <= 720)
const linkedScenesRef = ref<HTMLElement | null>(null)
const splitPercent = ref(50)
const splitDragging = ref(false)
let splitPointer: number | null = null
let splitHandle: HTMLElement | null = null
const groundView = ref(false)
const lookHeading = ref(135)
const lookPitch = ref(20)
const groundDirections = computed(() => HORIZONTAL_DIRECTIONS.map(direction => ({
  heading: direction.heading,
  name: atPole.value ? `参考${direction.heading}°` : `向${direction.name}看`,
})))
const floatingPanelTop = computed(() => compactPanelViewport.value ? 188 : 96)
const floatingPanelBottomInset = computed(() => compactPanelViewport.value ? 176 : 112)

function updatePanelViewport() {
  stopCorrespondence()
  compactPanelViewport.value = window.innerWidth <= 720
}

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

/*
 * 左右面板的宽度、断点、拖拽、展开折叠和事件清理
 * 全部由公共 Hook 管理。
 *
 * 当前业务组件只负责：
 * 1. 绑定 Hook 返回的 attrs；
 * 2. 布局稳定后校准 Three.js 画布尺寸。
 */
const {
  rootRef: pageRef,
  layoutMode,

  viewportResizing,

  workspaceAttrs,
} = useGeoPanelLayout({
  left: {
    enabled: false,
  },

  right: {
    enabled: false,
  },

  onLayoutChange(state) {
    /*
     * 拖拽面板或浏览器连续缩放期间，
     * 不反复调用 renderer.setSize()。
     */
    if (state.resizing) {
      return
    }

    scheduleSceneResizeFromContainer(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResizeFromContainer(0)
    }
  },
})

// 场景元素开关
const showDome = ref(true)
const showBuildings = ref(false)
const showShadows = ref(true)
const showGrid = ref(true)
const showPath = ref(true)

// --- 计算属性 ---
const decHemisphere = computed(() => {
  if (currentDeclination.value > 0) return '北半球'
  if (currentDeclination.value < 0) return '南半球'
  return '赤道'
})

const noonHeight = computed(() => 90 - Math.abs(currentLatitude.value - currentDeclination.value))

const latDisplay = computed(() => formatLatitude(currentLatitude.value))

const latRad = computed(() => currentLatitude.value * Math.PI / 180)
const decRad = computed(() => currentDeclination.value * Math.PI / 180)
const haRad = computed(() => currentHourAngle.value * Math.PI / 180)

const calcTerm1 = computed(() => Math.sin(latRad.value) * Math.sin(decRad.value))
const calcTerm2 = computed(() => Math.cos(latRad.value) * Math.cos(decRad.value) * Math.cos(haRad.value))
const calcSinH = computed(() => calcTerm1.value + calcTerm2.value)
const currentSunHeight = computed(() => {
  const altitude = Math.asin(Math.max(-1, Math.min(1, calcSinH.value))) * 180 / Math.PI
  return Math.abs(altitude) < 1e-8 ? 0 : altitude
})
const correspondenceCopy = computed(() => {
  if (correspondencePhase.value === 'aligning') return {
    title: '正在对齐视角 · 时间已暂停',
    description: '观察左侧小人脚下的地平面，如何转成右侧的朝向。',
  }
  if (correspondencePhase.value === 'ground') return {
    title: '① 同一个地平面',
    description: '两侧青色圆面都表示小人脚下的地平面。',
  }
  return {
    title: `② 同一个太阳高度 · h = ${formatDegrees(currentSunHeight.value)}`,
    description: currentSunHeight.value <= 0
      ? (currentSunHeight.value < 0 ? '两侧太阳都在地平线下，从地面看不到太阳。' : '两侧太阳中心都在地平线上，h 为 0°。')
      : '视角改变了，太阳与地平面的夹角不变。',
  }
})

const solarTimeStr = computed(() => {
  const totalMinutes = Math.round((12 + currentHourAngle.value / 15) * 60)
  return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`
})

const noonOffsetDescription = computed(() => {
  if (atPole.value) return '参考经线计时，日内太阳高度不变'
  const totalMinutes = Math.round(Math.abs(currentHourAngle.value) * 4)
  if (totalMinutes === 0) return '正午，太阳升到最高'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const span = `${hours ? `${hours}小时` : ''}${minutes ? `${minutes}分` : ''}`
  return `${currentHourAngle.value < 0 ? '上午' : '下午'}，距正午${span}`
})

const monthDayDisplay = computed(() => {
  const parts = currentDate.value.split('-')
  return `${parseInt(parts[1]!)}月${parseInt(parts[2]!)}日`
})

const currentDayOfYear = computed(() => dayFromDate(currentDate.value))
const declinationDisplay = computed(() => formatLatitude(currentDeclination.value))
const daylight = computed(() => getDaylight(currentLatitude.value, currentDeclination.value))
const polarStatus = computed(() => ({
  normal: '正常昼夜交替',
  'polar-day': '极昼',
  'polar-night': '极夜',
  horizon: '太阳中心位于地平线',
})[daylight.value.status])
const riseSetValue = computed(() => {
  if (daylight.value.status === 'horizon') return '位于地平线'
  if (daylight.value.status !== 'normal') return '无日出日落'
  if (currentDeclination.value > 0) return '东北 / 西北'
  if (currentDeclination.value < 0) return '东南 / 西南'
  return '正东 / 正西'
})
const riseSetDescription = computed(() => ({
  normal: '依次为日出、日落的方位',
  'polar-day': '太阳全天不落到地平线下',
  'polar-night': '太阳全天不升到地平线上',
  horizon: '极点二分日的理想几何状态',
})[daylight.value.status])
const dayLen = computed(() => {
  const hours = daylight.value.hours
  if (hours === null) return '地平线临界'
  const minutes = Math.round(hours * 60)
  return `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分` : ''}`
})
const trackInclination = computed(() => getTrackInclination(currentLatitude.value))
const trackTiltDescription = computed(() => {
  const lat = currentLatitude.value
  if (Math.abs(lat) === 90) return '极点的轨迹平面与地平面平行。'
  if (lat === 0) return '赤道上的轨迹平面与地平面垂直。'
  return `轨迹平面的上缘向${lat > 0 ? '南' : '北'}倾斜。`
})
const currentViewName = computed(() =>
  groundView.value ? '第一人称' : views.value.find(item => item.id === activeView.value)?.name || '自由'
)

const sunDataCards = computed(() => [
  {
    label: '观测纬度 φ',
    value: latDisplay.value,
    description: '当前观测点纬度',
    className: 'cyan-card',
  },
  {
    label: '直射纬度 δ',
    value: declinationDisplay.value,
    description: `${decHemisphere.value} · 教学近似`,
    className: 'blue-card',
  },
  {
    label: '参考节气',
    value: currentSeasonName.value,
    description: `所选日期：${monthDayDisplay.value}`,
    className: 'purple-card',
  },
  {
    label: '地方时',
    value: solarTimeStr.value,
    description: noonOffsetDescription.value,
    className: 'orange-card',
  },
  {
    label: atPole.value ? '全天太阳高度' : '正午太阳高度',
    value: formatDegrees(noonHeight.value),
    description: atPole.value ? '固定赤纬模型中，日内高度不变' : noonHeight.value < 0 ? '正午太阳仍在地平线下' : 'H = 90° − |φ − δ|',
    className: 'cyan-card',
  },
  {
    label: '当前太阳高度',
    value: formatDegrees(currentSunHeight.value),
    description: currentSunHeight.value < 0 ? '太阳在地平线下' : '太阳与地平面的夹角',
    className: 'blue-card',
  },
  {
    label: '日出 / 日落方位',
    value: riseSetValue.value,
    description: riseSetDescription.value,
    className: 'purple-card',
  },
  {
    label: '昼长',
    value: dayLen.value,
    description: polarStatus.value,
    className: 'orange-card',
  },
])


// --- Three.js 相关 ---
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let skyGroup: THREE.Group
let localObserver: THREE.Group
let observerGround: THREE.Group
let correspondenceGround: THREE.Group | null = null
let localTrackReferencePlane: THREE.Mesh | null = null
let localTrackInclinationGroup: THREE.Group | null = null
let localTrackBaseline: THREE.Group | null = null
let localTrackDirectionArrow: THREE.Group | null = null
let localTrackInclinationArc: THREE.Group | null = null
let localTrackInclinationLabel: THREE.Sprite | null = null
let localTrackInclinationLabelText = ''
let groundPlane: THREE.Mesh
let lookControls: ReturnType<typeof createObserverLookControls> | null = null
let savedOverview: { position: THREE.Vector3; target: THREE.Vector3; view: string } | null = null
const OBSERVER_EYE_HEIGHT = 0.9
const observerHorizonClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -OBSERVER_EYE_HEIGHT)
let dirLight: THREE.DirectionalLight
let dome: THREE.Mesh
let jinMaoGroup: THREE.Group
let swfcGroup: THREE.Group
let shTowerGroup: THREE.Group
let buildingGroup: THREE.Group
let gridLines: THREE.Line[] = []
const directionLabels: THREE.Sprite[] = []
let pathLine: THREE.Object3D | null = null
let currentSunMarker: THREE.Mesh | null = null
let curSunGlowSprite: THREE.Sprite | null = null
let sunAngleGroup: THREE.Group | null = null
let sunriseLabel: THREE.Sprite | null = null
let sunsetLabel: THREE.Sprite | null = null
let undergroundPath: THREE.Group | null = null
let animFrameId = 0
let lastFrameTime: number | null = null
let cameraTransition: {
  startPosition: THREE.Vector3
  endPosition: THREE.Vector3
  startTarget: THREE.Vector3
  endTarget: THREE.Vector3
  startTime: number
} | null = null
let sceneResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | number
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let pendingSceneWidth = 0
let pendingSceneHeight = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let ambientLightRef: THREE.AmbientLight
let hemiLightRef: THREE.HemisphereLight
let horizonMeshRef: THREE.Mesh
let bgCanvasRef: HTMLCanvasElement
let bgTextureRef: THREE.CanvasTexture
let windowMatRef: THREE.MeshBasicMaterial


// 轨迹直接由连续时角求点，避免跨过午夜后把不相邻的点连接成假弦。
class DailySunCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private latitude: number,
    private declination: number,
    private startAngle: number,
    private endAngle: number,
  ) { super() }

  override getPoint(t: number, target = new THREE.Vector3()) {
    const position = calculateSunPosition(
      this.latitude, this.declination,
      this.startAngle + (this.endAngle - this.startAngle) * t,
    )
    return target.set(position.x, position.y, position.z)
  }
}

function disposeSceneObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  object.traverse(child => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite) {
      if (!(child instanceof THREE.Sprite)) geometries.add(child.geometry)
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material)
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value)
        }
      }
    }
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
  textures.forEach(texture => texture.dispose())
}

function makeSunLabel(text: string, position: THREE.Vector3) {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 72
  const context = canvas.getContext('2d')!
  context.font = 'bold 36px "Microsoft YaHei", sans-serif'
  context.fillStyle = '#fff2a6'
  context.strokeStyle = '#493408'
  context.lineWidth = 5
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.strokeText(text, 96, 36)
  context.fillText(text, 96, 36)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false,
  }))
  sprite.scale.set(1.8, 0.675, 1)
  sprite.position.copy(position)
  sprite.position.y += 0.4
  return sprite
}

function createLocalTrackInclinationGuide() {
  localTrackInclinationGroup = new THREE.Group()
  localTrackInclinationGroup.position.y = 0.02
  localTrackBaseline = new THREE.Group()
  localTrackDirectionArrow = new THREE.Group()
  localTrackInclinationArc = new THREE.Group()
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  localTrackInclinationLabel = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false, depthWrite: false,
  }))
  localTrackInclinationLabel.scale.set(4.2, 1.05, 1)
  localTrackInclinationLabel.renderOrder = 14
  localTrackInclinationGroup.add(localTrackBaseline, localTrackDirectionArrow, localTrackInclinationArc, localTrackInclinationLabel)
  observerGround.add(localTrackInclinationGroup)
}

function setLocalTrackStroke(group: THREE.Group, points: THREE.Vector3[], arrow = false) {
  disposeSceneObject(group)
  group.clear()
  if (points.length < 2 || points[0]!.distanceToSquared(points[points.length - 1]!) < 1e-12) return
  const end = points[points.length - 1]!
  const direction = end.clone().sub(points[0]!).normalize()
  const shaftPoints = arrow ? [points[0]!, end.clone().addScaledVector(direction, -0.14)] : points
  const path = shaftPoints.length === 2
    ? new THREE.LineCurve3(shaftPoints[0]!, shaftPoints[1]!)
    : new THREE.CatmullRomCurve3(shaftPoints, false, 'catmullrom', 0.5)
  const segments = shaftPoints.length === 2 ? 1 : 64
  for (const layer of [
    { name: 'outline', color: 0xeff8ff, radius: 0.029, order: 12, headRadius: 0.09, headLength: 0.21 },
    { name: 'core', color: 0x3269de, radius: 0.019, order: 13, headRadius: 0.06, headLength: 0.17 },
  ]) {
    // 透明队列中的实色线晚于紫面/网格绘制；仍保留深度测试，地面遮挡不被穿透。
    const material = new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: 1, depthTest: true, depthWrite: false, toneMapped: false })
    const stroke = new THREE.Mesh(new THREE.TubeGeometry(path, segments, layer.radius, 10, false), material)
    stroke.name = layer.name
    stroke.renderOrder = layer.order
    group.add(stroke)
    if (arrow) {
      const head = new THREE.Mesh(new THREE.ConeGeometry(layer.headRadius, layer.headLength, 16), material)
      head.name = `${layer.name}-head`
      head.position.copy(end).addScaledVector(direction, -layer.headLength / 2)
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
      head.renderOrder = layer.order
      group.add(head)
    }
  }
}

function updateLocalTrackReferencePlane() {
  if (!localTrackReferencePlane) return
  const latitude = THREE.MathUtils.degToRad(currentLatitude.value)
  // 全球地轴在当地东/天顶/南坐标中的方向，也是赤道平行参考面的法线。
  const axis = new THREE.Vector3(0, Math.sin(latitude), -Math.cos(latitude))
  localTrackReferencePlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)
  // 极点处参考面与地平面重合，沿用左侧的隐藏规则避免共面闪烁。
  localTrackReferencePlane.visible = 90 - Math.abs(currentLatitude.value) > 0.005
  if (!localTrackBaseline || !localTrackDirectionArrow || !localTrackInclinationArc || !localTrackInclinationLabel) return
  const equatorward = currentLatitude.value < 0 ? -1 : 1
  const inclination = getTrackInclination(currentLatitude.value)
  const radians = THREE.MathUtils.degToRad(inclination)
  setLocalTrackStroke(localTrackBaseline, [new THREE.Vector3(), new THREE.Vector3(0, 0, equatorward * 3.6)])
  setLocalTrackStroke(localTrackDirectionArrow, [new THREE.Vector3(), new THREE.Vector3(0, Math.cos(latitude), Math.sin(latitude)).multiplyScalar(3.6)], true)
  const arcPoints: THREE.Vector3[] = []
  for (let index = 0; index <= 64; index++) {
    const angle = radians * index / 64
    arcPoints.push(new THREE.Vector3(0, Math.sin(angle) * 2.6, equatorward * Math.cos(angle) * 2.6))
  }
  setLocalTrackStroke(localTrackInclinationArc, arcPoints)
  localTrackInclinationArc.visible = inclination > 0.005
  localTrackBaseline.visible = inclination > 0.005
  localTrackInclinationLabel.position.set(-0.65, Math.sin(radians / 2) * 3.05, equatorward * Math.cos(radians / 2) * 3.05)
  const text = `β = ${formatDegrees(inclination)}`
  if (text !== localTrackInclinationLabelText) {
    const texture = localTrackInclinationLabel.material.map as THREE.CanvasTexture
    const canvas = texture.image as HTMLCanvasElement
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, 256, 64)
    context.font = '700 36px "Microsoft YaHei", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineWidth = 6
    context.strokeStyle = '#f1f9ff'
    context.fillStyle = '#315d9d'
    context.strokeText(text, 128, 32)
    context.fillText(text, 128, 32)
    texture.needsUpdate = true
    localTrackInclinationLabelText = text
  }
}

function updateLocalTrackLabelScale() {
  if (!localTrackInclinationLabel || !camera || groundView.value || lastSceneHeight <= 0) return
  camera.updateMatrixWorld()
  const viewPosition = localTrackInclinationLabel.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse)
  const worldPerPixel = 2 * Math.max(0.01, -viewPosition.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / (lastSceneHeight * camera.zoom)
  const width = Math.min(4.2, 144 * worldPerPixel)
  localTrackInclinationLabel.scale.set(width, width / 4, 1)
}

function drawSunPath() {
  updateLocalTrackReferencePlane()
  for (const object of [pathLine, undergroundPath, sunriseLabel, sunsetLabel]) {
    if (object) {
      skyGroup.remove(object)
      disposeSceneObject(object)
    }
  }
  pathLine = null
  undergroundPath = null
  sunriseLabel = null
  sunsetLabel = null

  if (showPath.value) {
    const { status, sunriseHourAngle, sunsetHourAngle } = daylight.value
    const addArc = (start: number, end: number, below: boolean, closed = false) => {
      const curve = new DailySunCurve(currentLatitude.value, currentDeclination.value, start, end)
      if (below) {
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(360))
        const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({
          color: 0x796343, transparent: true, opacity: 0.65, dashSize: 0.22, gapSize: 0.16,
        }))
        line.computeLineDistances()
        undergroundPath = new THREE.Group()
        undergroundPath.add(line)
        skyGroup.add(undergroundPath)
      } else {
        pathLine = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 240, 0.025, 8, closed),
          new THREE.MeshBasicMaterial({ color: 0xf2bd38 }),
        )
        skyGroup.add(pathLine)
      }
      return curve
    }
    if (status === 'normal' && sunriseHourAngle !== null && sunsetHourAngle !== null) {
      const daytime = addArc(sunriseHourAngle, sunsetHourAngle, false)
      // 日落 → 次日日出，跨午夜但时角连续。
      addArc(sunsetHourAngle, sunriseHourAngle + 360, true)
      sunriseLabel = makeSunLabel('日出', daytime.getPoint(0))
      sunsetLabel = makeSunLabel('日落', daytime.getPoint(1))
      skyGroup.add(sunriseLabel, sunsetLabel)
    } else {
      addArc(-180, 180, status === 'polar-night', true)
    }
  }

  if (!currentSunMarker) {
    currentSunMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffc42b }),
    )
    skyGroup.add(currentSunMarker)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')!
    const glow = context.createRadialGradient(64, 64, 0, 64, 64, 64)
    glow.addColorStop(0, 'rgba(255,220,100,0.65)')
    glow.addColorStop(0.3, 'rgba(255,200,70,0.25)')
    glow.addColorStop(1, 'rgba(255,180,40,0)')
    context.fillStyle = glow
    context.fillRect(0, 0, 128, 128)
    curSunGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), blending: THREE.AdditiveBlending,
      transparent: true, depthWrite: false,
    }))
    curSunGlowSprite.scale.set(2.2, 2.2, 1)
    skyGroup.add(curSunGlowSprite)
  }
  updateSunAtTime()
  syncSkyClipping()
}

function syncSkyClipping() {
  skyGroup.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        const clipped = !!material.clippingPlanes?.length
        if (clipped !== groundView.value) {
          material.clippingPlanes = groundView.value ? [observerHorizonClip] : null
          material.needsUpdate = true
        }
      }
    }
  })
}

function updateSunAtTime() {
  const position = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  if (localObserver) faceObserverTowardSun(localObserver, position)
  const isAboveHorizon = position.alt > 1e-8
  currentSunMarker?.position.set(position.x, position.y, position.z)
  curSunGlowSprite?.position.set(position.x, position.y, position.z)
  // 太阳位于地平线下时只保留暗色示意球，不发光、不投射太阳阴影。
  if (currentSunMarker) {
    currentSunMarker.visible = !groundView.value || position.alt >= -1e-8
    ; (currentSunMarker.material as THREE.MeshBasicMaterial).color.setHex(position.alt >= -1e-8 ? 0xffc42b : 0x8b775b)
  }
  if (curSunGlowSprite) curSunGlowSprite.visible = isAboveHorizon
  if (undergroundPath) undergroundPath.visible = !groundView.value
  if (sunriseLabel) sunriseLabel.visible = !groundView.value
  if (sunsetLabel) sunsetLabel.visible = !groundView.value
  // 第一人称把方位字移到地平线下，避免日出时文字挡住太阳圆盘。
  directionLabels.forEach(label => {
    label.position.y = groundView.value ? 0.25 : 0.8
    label.scale.set(groundView.value ? 1.25 : 2, groundView.value ? 0.625 : 1, 1)
  })
  dirLight.position.set(position.x * 2, position.y * 2, position.z * 2)
  dirLight.intensity = isAboveHorizon ? 0.8 + position.y / 8 * 0.8 : 0
  dirLight.castShadow = showShadows.value && isAboveHorizon
  renderer.shadowMap.enabled = dirLight.castShadow
  updateSunAngleIndicator(position)
  updateSkyBackground()
}

function updateSunAngleIndicator(curPos: { x: number; y: number; z: number; alt: number }) {
  if (!sunAngleGroup || groundView.value) return
  // 清除上次的线条/弧线/标注
  for (let i = sunAngleGroup.children.length - 1; i >= 0; i--) {
    const child = sunAngleGroup.children[i]!
    if ((child as any)._isDynamic) {
      sunAngleGroup.remove(child)
      disposeSceneObject(child)
    }
  }

  const sunPos = new THREE.Vector3(curPos.x, curPos.y, curPos.z)
  const horizDir = new THREE.Vector3(curPos.x, 0, curPos.z)
  if (horizDir.length() < 0.000001) horizDir.set(1, 0, 0)
  horizDir.normalize()
  // 太阳在地平线以下时不显示
  if (curPos.alt <= 1e-8) return

  const altRad = curPos.alt * Math.PI / 180
  const center = new THREE.Vector3(0, 0.01, 0)

  const addStroke = (name: string, curve: THREE.Curve<THREE.Vector3>, segments: number, coreRadius = 0.026, outlineRadius = 0.04) => {
    const group = new THREE.Group()
    group.name = name
    ; (group as any)._isDynamic = true
    for (const layer of [
      { role: 'outline', radius: outlineRadius, color: 0xfff1d6, order: 10 },
      { role: 'core', radius: coreRadius, color: correspondencePhase.value === 'altitude' ? 0xef7208 : 0xd87516, order: 11 },
    ]) {
      const material = new THREE.MeshBasicMaterial({
        color: layer.color, transparent: true, opacity: 1, depthTest: true, depthWrite: false, toneMapped: false,
      })
      material.name = `sun-altitude-${layer.role}`
      const stroke = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, layer.radius, 10, false), material)
      stroke.name = layer.role
      // 晚于透明参考面绘制，保留人物和地面的真实遮挡，文字仍在最前面。
      stroke.renderOrder = layer.order
      group.add(stroke)
    }
    sunAngleGroup!.add(group)
  }

  // 从观测点指向太阳，与脚下水平边共同表示太阳高度角。
  addStroke('sun-altitude-ray', new THREE.LineCurve3(center, sunPos), 1)

  // 地面水平线：从中心向太阳水平方向（夹角的另一条边）
  const groundLineLen = 1.8
  const groundEnd = center.clone().add(horizDir.clone().multiplyScalar(groundLineLen))
  addStroke('sun-altitude-baseline', new THREE.LineCurve3(center, groundEnd), 1)

  // 角度弧线：在正中心，从地面方向到太阳光线方向（管道体）
  const up = new THREE.Vector3(0, 1, 0)
  const arcSegments = 24
  const arcRadius = 1.35
  const arcPoints: THREE.Vector3[] = []
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments
    const angle = t * altRad
    const p = center.clone()
      .add(horizDir.clone().multiplyScalar(Math.cos(angle) * arcRadius))
      .add(up.clone().multiplyScalar(Math.sin(angle) * arcRadius))
    arcPoints.push(p)
  }
  const arcCurve = new THREE.CatmullRomCurve3(arcPoints, false, 'catmullrom', 0.3)
  addStroke('sun-altitude-arc', arcCurve, 32, 0.03, 0.045)

  // 标注太阳高度角文字
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 256
  labelCanvas.height = 64
  const lctx = labelCanvas.getContext('2d')!
  lctx.fillStyle = 'rgba(0,0,0,0)'
  lctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
  lctx.font = '700 36px "Microsoft YaHei", sans-serif'
  lctx.textAlign = 'center'
  lctx.textBaseline = 'middle'
  lctx.fillStyle = '#9c4a06'
  lctx.strokeStyle = '#fff5df'
  lctx.lineWidth = 6
  const text = `h = ${formatDegrees(curPos.alt)}`
  lctx.strokeText(text, 128, 32)
  lctx.fillText(text, 128, 32)
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })
  const labelSprite = new THREE.Sprite(labelMat)
  labelSprite.name = 'sun-altitude-label'
  labelSprite.renderOrder = 16
  labelSprite.scale.set(3.6, 0.9, 1)
  labelSprite.center.set(-0.12, 0.5)
  // 文字从角弧外侧向屏幕右侧展开，避开脚下人物和 β 标注。
  const midAngle = altRad * 0.5
  const labelRadius = 2
  const labelPos = center.clone()
    .add(horizDir.clone().multiplyScalar(Math.cos(midAngle) * labelRadius))
    .add(up.clone().multiplyScalar(Math.sin(midAngle) * labelRadius))
  labelSprite.position.copy(labelPos)
    ; (labelSprite as any)._isDynamic = true
  sunAngleGroup.add(labelSprite)
}

function updateSunAngleLabelScale() {
  const label = sunAngleGroup?.getObjectByName('sun-altitude-label') as THREE.Sprite | undefined
  if (!label || !camera || groundView.value || lastSceneHeight <= 0) return
  camera.updateMatrixWorld()
  const viewPosition = label.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse)
  const worldPerPixel = 2 * Math.max(0.01, -viewPosition.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / (lastSceneHeight * camera.zoom)
  const width = Math.min(3.6, 128 * worldPerPixel)
  label.scale.set(width, width / 4, 1)
}

// --- 动态天空背景与城市夜景 ---
function updateSkyBackground() {
  applySky(
    currentSunHeight.value,
    bgCanvasRef,
    bgTextureRef,
    ambientLightRef,
    hemiLightRef,
    horizonMeshRef.material as THREE.MeshLambertMaterial,
  )
  if (groundPlane) (groundPlane.material as THREE.MeshLambertMaterial).color.copy((horizonMeshRef.material as THREE.MeshLambertMaterial).color)
  // 建筑窗户夜间亮灯 + 路灯亮灯
  const sunH = currentSunHeight.value
  const nightT = sunH > 0 ? 0 : Math.min(-sunH / 6, 1)
  const mats = (buildingGroup as any)?._buildingMats as THREE.MeshStandardMaterial[] | undefined
  mats?.forEach((m) => { m.emissiveIntensity = nightT * 1.4 })
  const lampMats = (buildingGroup as any)?._lampHeadMats as THREE.MeshStandardMaterial[] | undefined
  lampMats?.forEach((m) => { m.emissiveIntensity = nightT * 2.0 })
  const lamps = (buildingGroup as any)?._streetLights as THREE.PointLight[] | undefined
  lamps?.forEach((l) => { l.intensity = nightT * 2.0 })
}

// --- 交互控制函数 ---
function setLocation(lat: number, name: string) {
  currentLatitude.value = lat
  activeCity.value = name
  drawSunPath()
}

function selectLatitudeMark(latitude: number) {
  setLocation(latitude, cities.find(city => city.lat === latitude)?.name ?? '')
}

function updateLatitude(val: string) {
  currentLatitude.value = parseFloat(val)
  activeCity.value = ''
  drawSunPath()
}

function updateHourAngle(val: number) {
  currentHourAngle.value = val
  updateSunAtTime()
}

function setSeason(seasonId: string) {
  const season = seasons.find(item => item.id === seasonId)
  if (season) updateDayOfYear(season.day)
}

function updateDayOfYear(day: number) {
  currentDate.value = dateFromDay(day)
  currentDeclination.value = declinationForDay(day)
  currentSeasonName.value = closestSeason(day).name
  activeSeason.value = seasons.find(item => item.day === day)?.id || ''
  drawSunPath()
}

// --- 动画控制 ---
function applyCorrespondenceHighlight() {
  if (correspondenceGround) correspondenceGround.visible = correspondenceActive.value && !groundView.value
  if (localTrackReferencePlane) (localTrackReferencePlane.material as THREE.MeshBasicMaterial).opacity = correspondenceActive.value ? 0.06 : 0.22
  if (localTrackInclinationGroup) localTrackInclinationGroup.visible = !correspondenceActive.value
  sunAngleGroup?.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshBasicMaterial) || material.name !== 'sun-altitude-core') continue
      material.color.setHex(correspondencePhase.value === 'altitude' ? 0xef7208 : 0xd87516)
    }
  })
}

function startCorrespondence() {
  if (!camera || !controls || !spaceObserverRef.value) return
  const wasGround = groundView.value
  const heading = lookHeading.value
  const pitch = lookPitch.value
  leaveGroundView()
  cameraTransition = null
  const damping = controls.enableDamping
  correspondenceSaved = {
    position: camera.position.clone(), target: controls.target.clone(), up: camera.up.clone(), damping,
    wasGround, heading, pitch, controlCollapsed: controlCardCollapsed.value, dataCollapsed: dataCardCollapsed.value,
  }
  // 清掉拖拽余势，但取景仍从刚才实际看到的位置开始。
  controls.enableDamping = false
  controls.update()
  // 相机取景以地平基底为准，绝不跟随人物追太阳的朝向。
  const offset = correspondenceSaved.position.clone().sub(correspondenceSaved.target)
  if (offset.y < offset.length() * 0.08 || offset.lengthSq() < 1e-6) offset.set(15, 12, 20)
  controls.target.set(0, 0, 0)
  camera.position.copy(offset)
  camera.up.set(0, 1, 0)
  controls.update()
  isAnimating.value = false
  resetAnimationClock()
  correspondencePhase.value = 'aligning'
  if (!spaceObserverRef.value.beginCorrespondence(offset, camera.up)) {
    stopCorrespondence(true)
    return
  }
  controlCardCollapsed.value = true
  dataCardCollapsed.value = true
  applyCorrespondenceHighlight()
}

function handleCorrespondenceReady() {
  if (correspondencePhase.value !== 'aligning') return
  correspondencePhase.value = 'ground'
  applyCorrespondenceHighlight()
}

function showCorrespondenceAltitude() {
  if (correspondencePhase.value !== 'ground') return
  correspondencePhase.value = 'altitude'
  applyCorrespondenceHighlight()
}

function showCorrespondenceGround() {
  if (correspondencePhase.value !== 'altitude') return
  correspondencePhase.value = 'ground'
  applyCorrespondenceHighlight()
}

function stopCorrespondence(restoreLocalCamera = false) {
  correspondencePointer = null
  if (!correspondenceActive.value && !correspondenceSaved) return
  correspondencePhase.value = 'idle'
  const saved = correspondenceSaved
  correspondenceSaved = null
  spaceObserverRef.value?.endCorrespondence(restoreLocalCamera)
  if (saved && camera && controls) {
    controls.enableDamping = saved.damping
    if (restoreLocalCamera) {
      camera.position.copy(saved.position)
      camera.up.copy(saved.up)
      controls.target.copy(saved.target)
      controls.update()
    }
    if (restoreLocalCamera) {
      controlCardCollapsed.value = saved.controlCollapsed
      dataCardCollapsed.value = saved.dataCollapsed
    }
    if (restoreLocalCamera && saved.wasGround) {
      enterGroundView()
      lookControls?.setDirection(saved.heading, saved.pitch)
    }
  }
  applyCorrespondenceHighlight()
}

function toggleCorrespondence() {
  if (correspondenceActive.value) stopCorrespondence()
  else startCorrespondence()
}

function startCorrespondencePointer(event: PointerEvent) {
  if (correspondenceActive.value) correspondencePointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
}

function moveCorrespondencePointer(event: PointerEvent) {
  const start = correspondencePointer
  if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) return
  stopCorrespondence(false)
  handleOrbitStart()
}

function clearCorrespondencePointer() { correspondencePointer = null }

function cancelHiddenCorrespondence() {
  if (document.hidden) stopCorrespondence()
}

watch([currentLatitude, currentDeclination, currentDate, currentHourAngle, splitPercent], () => stopCorrespondence(), { flush: 'sync' })

function toggleAnimation() {
  stopCorrespondence()
  isAnimating.value = !isAnimating.value
  resetAnimationClock()
}

function resetAnimationClock() {
  // 切回页面或恢复播放时从新一帧计时，不补播后台停留的时间。
  lastFrameTime = null
}

function updateSpeed(val: number) {
  animSpeed.value = val
}

function handleLatitudeSlider(value: number | number[]) {
  if (typeof value === 'number') {
    updateLatitude(String(value))
  }
}

function handleDaySlider(value: number | number[]) {
  if (typeof value === 'number') {
    updateDayOfYear(value)
  }
}

function handleHourSlider(value: number | number[]) {
  if (typeof value === 'number') {
    updateHourAngle(value)
  }
}

// 卡片拖动、缩放和置顶由 FloatingFeatureCard 统一管理。

// --- 视角切换 ---
function startSplit(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary) return
  event.preventDefault()
  splitPointer = event.pointerId
  splitDragging.value = true
  splitHandle = event.currentTarget as HTMLElement
  splitHandle.setPointerCapture(event.pointerId)
  splitHandle.focus({ preventScroll: true })
}

function moveSplit(event: PointerEvent) {
  if (!splitDragging.value || splitPointer !== event.pointerId || !linkedScenesRef.value) return
  const rect = linkedScenesRef.value.getBoundingClientRect()
  if (rect.width > 0) splitPercent.value = Math.max(30, Math.min(70, (event.clientX - rect.left) / rect.width * 100))
}

function stopSplit() {
  splitDragging.value = false
  const pointer = splitPointer
  splitPointer = null
  if (pointer !== null && splitHandle?.hasPointerCapture(pointer)) splitHandle.releasePointerCapture(pointer)
  splitHandle = null
}

function resizeSplitWithKeyboard(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 2
  const values: Record<string, number> = { ArrowLeft: splitPercent.value - step, ArrowRight: splitPercent.value + step, Home: 30, End: 70, Enter: 50 }
  const value = values[event.key]
  if (value === undefined) return
  event.preventDefault()
  splitPercent.value = Math.max(30, Math.min(70, value))
}

function enterGroundView() {
  stopCorrespondence(false)
  if (groundView.value || !camera) return
  savedOverview = { position: camera.position.clone(), target: controls.target.clone(), view: activeView.value }
  cameraTransition = null
  groundView.value = true
  controls.enabled = false
  camera.position.set(0, OBSERVER_EYE_HEIGHT, 0)
  camera.fov = 70
  // 天空是方向示意，随观测眼点平移，避免有限天穹半径造成高度角视差。
  skyGroup.position.y = OBSERVER_EYE_HEIGHT
  localObserver.visible = false
  observerGround.visible = false
  sunAngleGroup!.visible = false
  groundPlane.visible = true
  syncSkyClipping()
  updateSunAtTime()
  syncSceneFraming(lastSceneWidth, lastSceneHeight)
  lookControls?.setEnabled(true)
  locateSun()
  threeContainerRef.value?.focus({ preventScroll: true })
}

function leaveGroundView() {
  if (!groundView.value || !camera) return
  lookControls?.setEnabled(false)
  groundView.value = false
  controls.enabled = true
  camera.fov = 45
  skyGroup.position.y = 0
  localObserver.visible = true
  observerGround.visible = true
  sunAngleGroup!.visible = true
  groundPlane.visible = false
  syncSkyClipping()
  updateSunAtTime()
  if (savedOverview) {
    camera.position.copy(savedOverview.position)
    controls.target.copy(savedOverview.target)
    activeView.value = savedOverview.view
  }
  syncSceneFraming(lastSceneWidth, lastSceneHeight)
  controls.update()
}

function toggleGroundView() {
  if (groundView.value) leaveGroundView()
  else enterGroundView()
}

function lookToward(heading: number) {
  lookControls?.setDirection(heading, 12)
}

function locateSun() {
  const sun = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  const heading = sun.azDeg ?? (Math.atan2(sun.x, -sun.z) * 180 / Math.PI + 360) % 360
  lookControls?.setDirection(heading, Math.max(8, Math.min(85, sun.alt)))
}

function startDayLesson() {
  isAnimating.value = false
  resetAnimationClock()
  setLocation(40, '北京')
  setSeason('chunfen')
  updateHourAngle(-90)
  animSpeed.value = 1
  showBuildings.value = false
  enterGroundView()
  // 先暂停在日出，学生再播放并主动转头观察，而不是自动追踪太阳。
  lookControls?.setDirection(90, 8)
}

function setView(viewId: string) {
  stopCorrespondence(false)
  leaveGroundView()
  activeView.value = viewId
  const target = new THREE.Vector3(0, 0, 0)
  let pos: { x: number; y: number; z: number }
  switch (viewId) {
    case 'south': pos = { x: 0, y: 8, z: 25 }; break
    case 'north': pos = { x: 0, y: 8, z: -25 }; break
    case 'east': pos = { x: 25, y: 8, z: 0 }; break
    case 'west': pos = { x: -25, y: 8, z: 0 }; break
    case 'top': pos = { x: 0, y: 30, z: 0.1 }; break
    case 'free': pos = { x: 15, y: 12, z: 20 }; break
    default: pos = { x: 15, y: 12, z: 20 }; break
  }
  animateCamera(pos, target)
}

function animateCamera(targetPos: { x: number; y: number; z: number }, lookTarget: THREE.Vector3) {
  // 只保留最近一次切换，避免连续点击或拖动时多个补间争夺相机。
  cameraTransition = {
    startPosition: camera.position.clone(),
    endPosition: new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
    startTarget: controls.target.clone(),
    endTarget: lookTarget.clone(),
    startTime: performance.now(),
  }
}

function updateCameraTransition(now: number) {
  if (!cameraTransition) return
  const t = Math.max(0, Math.min((now - cameraTransition.startTime) / 800, 1))
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  camera.position.lerpVectors(cameraTransition.startPosition, cameraTransition.endPosition, ease)
  controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, ease)
  if (t === 1) cameraTransition = null
}

function handleOrbitStart() {
  if (groundView.value || correspondenceActive.value) return
  cameraTransition = null
  activeView.value = 'free'
}

// --- 监听场景元素开关变化 ---
watch(currentLatitude, updateDirectionLabels)

watch([showDome, showBuildings, showShadows, showGrid, showPath], () => {
  stopCorrespondence()
  if (dome) dome.visible = showDome.value
  if (buildingGroup!) buildingGroup.visible = showBuildings.value
  gridLines.forEach(l => l.visible = showGrid.value)
  drawSunPath()
})

function updateDirectionLabels() {
  for (const sprite of directionLabels) {
    const text = getDirectionLabel(currentLatitude.value, sprite.userData.cardinalDirection as CardinalDirection, true)
    if (sprite.userData.directionText === text) continue
    const texture = sprite.material.map as THREE.CanvasTexture
    const canvas = texture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 52px Arial'
    ctx.fillStyle = '#ffd000'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText(text, 96, 48)
    ctx.fillText(text, 96, 48)
    texture.needsUpdate = true
    sprite.userData.directionText = text
  }
}

// --- 初始化 Three.js ---
function initThree() {
  const container = threeContainerRef.value

  if (!container) return

  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  scene = new THREE.Scene()
  skyGroup = new THREE.Group()
  scene.add(skyGroup)
  camera = new THREE.PerspectiveCamera(
    45,
    width / height,
    0.1,
    1000
  )
  syncSceneFraming(width, height)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  })

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  )
  renderer.setSize(width, height)
  lastSceneWidth = width
  lastSceneHeight = height
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.BasicShadowMap
  renderer.localClippingEnabled = true
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.addEventListener('start', handleOrbitStart)
  camera.position.set(15, 12, 20)
  controls.update()
  lookControls = createObserverLookControls(camera, container, (heading, pitch) => {
    lookHeading.value = heading
    lookPitch.value = pitch
  })

  // 环境光
  // 场景背景：动态天空→地面渐变（根据时间变化）
  bgCanvasRef = document.createElement('canvas')
  bgCanvasRef.width = 2
  bgCanvasRef.height = 512
  bgTextureRef = new THREE.CanvasTexture(bgCanvasRef)
  bgTextureRef.needsUpdate = true
  scene.background = bgTextureRef

  // 环境光：天空蓝色，强提亮
  ambientLightRef = new THREE.AmbientLight(0xc0e8ff, 1.8)
  scene.add(ambientLightRef)

  // 半球光：天空色+地面色，进一步提亮并增加层次
  hemiLightRef = new THREE.HemisphereLight(0xc0e8ff, 0x7aaa6a, 1.5)
  scene.add(hemiLightRef)

  // 定向光源
  dirLight = new THREE.DirectionalLight(0xfff8e7, 1.0)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.left = -12
  dirLight.shadow.camera.right = 12
  dirLight.shadow.camera.top = 12
  dirLight.shadow.camera.bottom = -12
  dirLight.shadow.bias = -0.0005
  dirLight.shadow.radius = 1
  dirLight.position.set(5, 8, 5)
  dirLight.target.position.set(0, 0, 0)
  scene.add(dirLight)
  scene.add(dirLight.target)

  // 地平圈 - 深色草地。顶面略低于地平面，避免与地平相切的太阳轨迹管被埋进底座。
  const horizonGeo = new THREE.CylinderGeometry(8, 8, 0.07, 64)
  const horizonMat = new THREE.MeshLambertMaterial({ color: 0x103808, transparent: true, opacity: 0.92 })
  horizonMeshRef = new THREE.Mesh(horizonGeo, horizonMat)
  horizonMeshRef.position.y = -0.065
  horizonMeshRef.receiveShadow = true
  scene.add(horizonMeshRef)

  // 第一人称的地面延伸到远处；地平线上下的判断仍由同一太阳模型决定。
  groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshLambertMaterial({ color: 0x103808 }))
  groundPlane.rotation.x = -Math.PI / 2
  groundPlane.position.y = -0.04
  groundPlane.visible = false
  scene.add(groundPlane)

  localObserver = createObserverFigure(1)
  localObserver.position.y = 0.02
  scene.add(localObserver)
  observerGround = new THREE.Group()
  const observerDisc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({
    color: 0x24c9b5, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
  }))
  observerDisc.rotation.x = -Math.PI / 2
  observerDisc.position.y = 0.025
  observerGround.add(observerDisc)
  const observerRing = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: 0x087c80 }))
  observerRing.rotation.x = Math.PI / 2
  observerRing.position.y = 0.03
  observerGround.add(observerRing)
  correspondenceGround = new THREE.Group()
  correspondenceGround.visible = false
  const comparisonDisc = new THREE.Mesh(new THREE.CircleGeometry(7.97, 96), new THREE.MeshBasicMaterial({
    color: 0x78fff0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  }))
  comparisonDisc.rotation.x = -Math.PI / 2
  comparisonDisc.position.y = 0.045
  const comparisonRim = new THREE.Mesh(new THREE.TorusGeometry(7.98, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: 0x78fff0 }))
  comparisonRim.rotation.x = Math.PI / 2
  comparisonRim.position.y = 0.05
  correspondenceGround.add(comparisonDisc, comparisonRim)
  observerGround.add(correspondenceGround)
  const observerLabel = makeSunLabel('同一观测者', new THREE.Vector3(0, 1.15, 0))
  observerGround.add(observerLabel)
  // 与左侧相同的紫色参考面：通过观测者脚下、平行赤道面，只比较方向。
  // 不随太阳赤纬平移；它随 observerGround 在第一人称隐藏，返回总览恢复。
  localTrackReferencePlane = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 96),
    new THREE.MeshBasicMaterial({ color: '#bd94f4', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  )
  localTrackReferencePlane.position.y = 0.02
  observerGround.add(localTrackReferencePlane)
  createLocalTrackInclinationGuide()
  updateLocalTrackReferencePlane()
  scene.add(observerGround)

  // 地表圆边框
  const borderGeo = new THREE.TorusGeometry(8, 0.05, 8, 64)
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8 })
  const border = new THREE.Mesh(borderGeo, borderMat)
  border.rotation.x = Math.PI / 2
  border.position.y = -0.08
  scene.add(border)

  // 方位线
  const createLine = (x1: number, z1: number, x2: number, z2: number, color: number) => {
    const mat = new THREE.LineBasicMaterial({ color })
    const points = [new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z2)]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    gridLines.push(line)
  }
  // 中轴线（黄色实线圆柱）
  const axisMat = new THREE.MeshBasicMaterial({ color: 0xffd000 })
  const axisNS = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 16, 6), axisMat)
  axisNS.rotation.x = Math.PI / 2
  axisNS.position.y = 0.02
  scene.add(axisNS)
  gridLines.push(axisNS as any)
  const axisEW = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 16, 6), axisMat)
  axisEW.rotation.z = Math.PI / 2
  axisEW.position.y = 0.02
  scene.add(axisEW)
  gridLines.push(axisEW as any)

  // 地理方位标签；极点仅更新文字，不改变参考坐标基底。
  const makeDirLabel = (direction: CardinalDirection, x: number, z: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 96
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.userData.cardinalDirection = direction
    sprite.scale.set(2.0, 1.0, 1)
    sprite.position.set(x, 0.8, z)
    directionLabels.push(sprite)
    scene.add(sprite)
  }
  makeDirLabel('east', 9.5, 0)
  makeDirLabel('south', 0, 9.5)
  makeDirLabel('west', -9.5, 0)
  makeDirLabel('north', 0, -9.5)
  updateDirectionLabels()

  // 天穹半球 - 主题色
  const domeGeo = new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x2ec4b6, wireframe: true, transparent: true, opacity: 0.15 })
  dome = new THREE.Mesh(domeGeo, domeMat)
  skyGroup.add(dome)

  // --- 城市场景：九宫格街区 ---
  buildingGroup = new THREE.Group()

  const CITY_SIZE = 12
  const ROAD_WIDTH = 0.9
  const ROAD_X = [-2, 2]
  const ROAD_Z = [-2, 2]
  const SIDEWALK_WIDTH = 0.25
  const BLOCK_MARGIN = 0.3

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.95 })
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.6, emissive: 0x000000 })
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.85 })
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4b, roughness: 0.7 })
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.5 })

  const winCanvas = document.createElement('canvas')
  winCanvas.width = 64
  winCanvas.height = 64
  const winCtx = winCanvas.getContext('2d')!
  winCtx.fillStyle = '#0a0a0a'
  winCtx.fillRect(0, 0, 64, 64)
  winCtx.fillStyle = '#5a5a5a'
  for (let y = 2; y < 64; y += 8) {
    for (let x = 2; x < 64; x += 8) {
      winCtx.fillRect(x, y, 5, 5)
    }
  }
  const windowTex = new THREE.CanvasTexture(winCanvas)
  windowTex.wrapS = THREE.RepeatWrapping
  windowTex.wrapT = THREE.RepeatWrapping

  const buildingMats: THREE.MeshStandardMaterial[] = []
  function makeBuildingMat(color: number): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color, map: windowTex, emissiveMap: windowTex,
      emissive: new THREE.Color(0xffdca4), emissiveIntensity: 0,
      roughness: 0.7, metalness: 0.1,
    })
    buildingMats.push(m)
    return m
  }
  const concreteMat = makeBuildingMat(0xc8c4b8)
  const glassMat = makeBuildingMat(0x6a9fc0)
  const darkGlassMat = makeBuildingMat(0x3a5570)
  const warmMat = makeBuildingMat(0xc8a87c)
  const steelMat = makeBuildingMat(0x8899aa)
  const lightConcreteMat = makeBuildingMat(0xe0ddd0)
  const brickMat = makeBuildingMat(0xb05848)
  const blueMat = makeBuildingMat(0x4a6a9a)
  const greenMat = makeBuildingMat(0x5a8a6a)
  const beigeMat = makeBuildingMat(0xd4c0a0)
  const tealMat = makeBuildingMat(0x4a8a8a)
  const rustMat = makeBuildingMat(0xa06840)

  const lampHeadMats: THREE.MeshStandardMaterial[] = []
  function makeLampHeadMat(): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color: 0xfff5d0, emissive: 0xffdca4, emissiveIntensity: 0,
      roughness: 0.4,
    })
    lampHeadMats.push(m)
    return m
  }
  const streetLights: THREE.PointLight[] = []

  function addRoad(x: number, z: number, w: number, d: number) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat)
    road.rotation.x = -Math.PI / 2
    road.position.set(x, 0.006, z)
    road.receiveShadow = true
    buildingGroup.add(road)
  }
  function addSidewalk(x: number, z: number, w: number, d: number) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sidewalkMat)
    sw.rotation.x = -Math.PI / 2
    sw.position.set(x, 0.013, z)
    sw.receiveShadow = true
    buildingGroup.add(sw)
  }

  ROAD_X.forEach((rx) => addRoad(rx, 0, ROAD_WIDTH, CITY_SIZE))
  ROAD_Z.forEach((rz) => addRoad(0, rz, CITY_SIZE, ROAD_WIDTH))

  // 道路黄色虚线分割线
  const dashLen = 0.18
  const dashGap = 0.14
  const lineWidth = 0.04
  function addRoadLine(x: number, z: number, w: number, d: number) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat)
    line.rotation.x = -Math.PI / 2
    line.position.set(x, 0.009, z)
    buildingGroup.add(line)
  }
  ROAD_X.forEach((rx) => {
    for (let p = -CITY_SIZE / 2 + dashLen / 2; p <= CITY_SIZE / 2 - dashLen / 2; p += dashLen + dashGap) {
      addRoadLine(rx, p, lineWidth, dashLen)
    }
  })
  ROAD_Z.forEach((rz) => {
    for (let p = -CITY_SIZE / 2 + dashLen / 2; p <= CITY_SIZE / 2 - dashLen / 2; p += dashLen + dashGap) {
      addRoadLine(p, rz, dashLen, lineWidth)
    }
  })
  ROAD_X.forEach((rx) => {
    addSidewalk(rx - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, 0, SIDEWALK_WIDTH, CITY_SIZE)
    addSidewalk(rx + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, 0, SIDEWALK_WIDTH, CITY_SIZE)
  })
  ROAD_Z.forEach((rz) => {
    addSidewalk(0, rz - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, CITY_SIZE, SIDEWALK_WIDTH)
    addSidewalk(0, rz + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, CITY_SIZE, SIDEWALK_WIDTH)
  })

  // 人行横道（斑马线）
  const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee })
  const cwOffset = ROAD_WIDTH / 2 + 0.22
  function addCrosswalkStrips(x: number, z: number, horizontal: boolean) {
    const stripeW = 0.06
    const stripeGap = 0.05
    const stripeLen = ROAD_WIDTH * 0.85
    for (let i = -1; i <= 1; i++) {
      const p = i * (stripeW + stripeGap)
      const stripe = new THREE.Mesh(
        horizontal ? new THREE.PlaneGeometry(stripeLen, stripeW) : new THREE.PlaneGeometry(stripeW, stripeLen),
        crosswalkMat
      )
      stripe.rotation.x = -Math.PI / 2
      if (horizontal) {
        stripe.position.set(x, 0.008, z + p)
      } else {
        stripe.position.set(x + p, 0.008, z)
      }
      buildingGroup.add(stripe)
    }
  }
  // 在每个路口四侧画斑马线
  ROAD_X.forEach((rx) => {
    ROAD_Z.forEach((rz) => {
      addCrosswalkStrips(rx, rz - cwOffset, true)
      addCrosswalkStrips(rx, rz + cwOffset, true)
      addCrosswalkStrips(rx - cwOffset, rz, false)
      addCrosswalkStrips(rx + cwOffset, rz, false)
    })
  })

  // 红绿灯
  const tlPoleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.4 })
  const tlRedMat = new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0xff0000, emissiveIntensity: 0.8 })
  const tlYellowMat = new THREE.MeshStandardMaterial({ color: 0x444400, emissive: 0xffff00, emissiveIntensity: 0.6 })
  const tlGreenMat = new THREE.MeshStandardMaterial({ color: 0x004400, emissive: 0x00ff00, emissiveIntensity: 0.5 })
  function addTrafficLight(x: number, z: number) {
    const g = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 8), tlPoleMat)
    pole.position.y = 0.6
    pole.castShadow = true
    g.add(pole)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), tlPoleMat)
    arm.position.set(0.1, 1.15, 0)
    g.add(arm)
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), tlPoleMat)
    box.position.set(0.2, 1.0, 0)
    g.add(box)
    const lightR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), tlRedMat)
    lightR.position.set(0.2, 1.1, 0.04)
    g.add(lightR)
    const lightY = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), tlYellowMat)
    lightY.position.set(0.2, 1.0, 0.04)
    g.add(lightY)
    const lightG = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), tlGreenMat)
    lightG.position.set(0.2, 0.9, 0.04)
    g.add(lightG)
    g.position.set(x, 0, z)
    return g
  }
  const tlOffset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2 + 0.1
  ROAD_X.forEach((rx) => {
    ROAD_Z.forEach((rz) => {
      buildingGroup.add(addTrafficLight(rx + tlOffset, rz + tlOffset))
      buildingGroup.add(addTrafficLight(rx - tlOffset, rz - tlOffset))
    })
  })

  const blockBounds: Array<[number, number]> = [
    [-CITY_SIZE / 2, ROAD_X[0]! - ROAD_WIDTH / 2],
    [ROAD_X[0]! + ROAD_WIDTH / 2, ROAD_X[1]! - ROAD_WIDTH / 2],
    [ROAD_X[1]! + ROAD_WIDTH / 2, CITY_SIZE / 2],
  ]
  const rand = (a: number, b: number) => a + Math.random() * (b - a)
  const blockConfigs = [
    { count: 3, type: 'high' as const }, { count: 4, type: 'mixed' as const }, { count: 3, type: 'normal' as const },
    { count: 4, type: 'mixed' as const }, { count: 2, type: 'high' as const }, { count: 3, type: 'normal' as const },
    { count: 3, type: 'normal' as const }, { count: 4, type: 'mixed' as const }, { count: 3, type: 'high' as const },
  ]
  function pickMat(type: string) {
    if (type === 'high') return [glassMat, darkGlassMat, steelMat, blueMat, tealMat][Math.floor(Math.random() * 5)]
    if (type === 'mixed') return [concreteMat, glassMat, steelMat, warmMat, brickMat, beigeMat, rustMat][Math.floor(Math.random() * 7)]
    return [concreteMat, lightConcreteMat, warmMat, brickMat, greenMat, beigeMat, rustMat][Math.floor(Math.random() * 7)]
  }

  // 建筑样式：方盒、阶梯塔、圆柱塔、L型、斜顶、双塔
  function makeBox(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    body.position.set(x, h / 2, z)
    body.castShadow = true
    body.receiveShadow = true
    buildingGroup.add(body)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), steelMat)
    roof.position.set(x, h + 0.03, z)
    buildingGroup.add(roof)
  }
  function makeStepped(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number) {
    const steps = 3
    let y = 0
    for (let i = 0; i < steps; i++) {
      const sw = w * (1 - i * 0.2)
      const sd = d * (1 - i * 0.2)
      const sh = h / steps
      const seg = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), mat)
      seg.position.set(x, y + sh / 2, z)
      seg.castShadow = true
      seg.receiveShadow = true
      buildingGroup.add(seg)
      y += sh
    }
  }
  function makeCylinder(r: number, h: number, mat: THREE.Material, x: number, z: number) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, h, 16), mat)
    body.position.set(x, h / 2, z)
    body.castShadow = true
    body.receiveShadow = true
    buildingGroup.add(body)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.05, 16), steelMat)
    cap.position.set(x, h + 0.025, z)
    buildingGroup.add(cap)
  }
  function makeLShape(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    main.position.set(x + w * 0.15, h / 2, z)
    main.castShadow = true
    main.receiveShadow = true
    buildingGroup.add(main)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.65, d * 0.6), mat)
    wing.position.set(x - w * 0.2, h * 0.325, z + d * 0.2)
    wing.castShadow = true
    buildingGroup.add(wing)
  }
  function makeSlantRoof(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    body.position.set(x, h / 2, z)
    body.castShadow = true
    body.receiveShadow = true
    buildingGroup.add(body)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), steelMat)
    roof.position.set(x, h + 0.03, z)
    buildingGroup.add(roof)
  }
  function makeTwin(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number) {
    const tw = w * 0.42
    const left = new THREE.Mesh(new THREE.BoxGeometry(tw, h, d), mat)
    left.position.set(x - w * 0.28, h / 2, z)
    left.castShadow = true
    left.receiveShadow = true
    buildingGroup.add(left)
    const right = new THREE.Mesh(new THREE.BoxGeometry(tw, h * 0.85, d), mat)
    right.position.set(x + w * 0.28, h * 0.425, z)
    right.castShadow = true
    buildingGroup.add(right)
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.05, d * 0.3), steelMat)
    bridge.position.set(x, h * 0.65, z)
    buildingGroup.add(bridge)
  }
  const makeRoundBuilding: typeof makeBox = (w, h, d, mat, x, z) => makeCylinder(Math.min(w, d) * 0.5, h, mat, x, z)
  const buildingStyles = [makeBox, makeStepped, makeRoundBuilding, makeLShape, makeSlantRoof, makeTwin]

  let bi = 0
  const placed: Array<{ x: number; z: number; hw: number; hd: number }> = []
  for (let zi = 0; zi < 3; zi++) {
    for (let xi = 0; xi < 3; xi++) {
      const [xMin, xMax] = blockBounds[xi]!
      const [zMin, zMax] = blockBounds[zi]!
      const cfg = blockConfigs[bi]!
      const blockPlaced: Array<{ x: number; z: number; hw: number; hd: number }> = []
      for (let i = 0; i < cfg.count; i++) {
        const maxW = Math.min(0.7, xMax - xMin - BLOCK_MARGIN * 2)
        const maxD = Math.min(0.7, zMax - zMin - BLOCK_MARGIN * 2)
        const w = rand(0.25, maxW)
        const d = rand(0.25, maxD)
        const h = cfg.type === 'high' ? rand(1.0, 2.2) : rand(0.4, 1.0)
        // 尝试 20 次找不重叠的位置
        let x = 0, z = 0, ok = false
        const gap = 0.15
        const centerRadius = 0.7
        for (let attempt = 0; attempt < 20; attempt++) {
          x = rand(xMin + BLOCK_MARGIN + w / 2, xMax - BLOCK_MARGIN - w / 2)
          z = rand(zMin + BLOCK_MARGIN + d / 2, zMax - BLOCK_MARGIN - d / 2)
          const distCenter = Math.sqrt(x * x + z * z)
          ok = distCenter > centerRadius + Math.max(w, d) / 2 && blockPlaced.every((p) => {
            return Math.abs(x - p.x) > p.hw + w / 2 + gap || Math.abs(z - p.z) > p.hd + d / 2 + gap
          })
          if (ok) break
        }
        if (!ok) continue
        blockPlaced.push({ x, z, hw: w / 2, hd: d / 2 })
        const mat = pickMat(cfg.type)!
        const styleFn = buildingStyles[Math.floor(Math.random() * buildingStyles.length)]!
        styleFn(w, h, d, mat, x, z)
      }
      bi++
    }
  }

  function addTree(x: number, z: number, s = 1) {
    const g = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.28 * s, 8), treeTrunkMat)
    trunk.position.y = 0.14 * s
    trunk.castShadow = true
    g.add(trunk)
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 10, 8), treeLeafMat)
    crown.position.y = 0.32 * s
    crown.castShadow = true
    g.add(crown)
    g.position.set(x, 0, z)
    return g
  }
  for (let x = -CITY_SIZE / 2 + 0.6; x <= CITY_SIZE / 2 - 0.6; x += 0.9) {
    ROAD_Z.forEach((rz) => {
      buildingGroup.add(addTree(x, rz - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, 0.85))
      buildingGroup.add(addTree(x, rz + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, 0.85))
    })
  }
  for (let z = -CITY_SIZE / 2 + 0.6; z <= CITY_SIZE / 2 - 0.6; z += 0.9) {
    ROAD_X.forEach((rx) => {
      buildingGroup.add(addTree(rx - ROAD_WIDTH / 2 - SIDEWALK_WIDTH / 2, z, 0.85))
      buildingGroup.add(addTree(rx + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, z, 0.85))
    })
  }

  function addLamp(x: number, z: number, rot: number) {
    const g = new THREE.Group()
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 8), lampPostMat)
    post.position.y = 0.45
    post.castShadow = true
    g.add(post)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.03), lampPostMat)
    arm.position.set(0.16, 0.87, 0)
    g.add(arm)
    const headMat = makeLampHeadMat()
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.07), headMat)
    head.position.set(0.3, 0.86, 0)
    g.add(head)
    const pl = new THREE.PointLight(0xffdca4, 0, 10)
    pl.position.set(0.3, 0.8, 0)
    g.add(pl)
    streetLights.push(pl)
    g.position.set(x, 0, z)
    g.rotation.y = rot
    return g
  }
  const lampGap = 2.6
  for (let x = -CITY_SIZE / 2 + 0.6; x <= CITY_SIZE / 2 - 0.6; x += lampGap) {
    ROAD_Z.forEach((rz) => buildingGroup.add(addLamp(x, rz + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, 0)))
  }
  for (let z = -CITY_SIZE / 2 + 0.6; z <= CITY_SIZE / 2 - 0.6; z += lampGap) {
    ROAD_X.forEach((rx) => buildingGroup.add(addLamp(rx + ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2, z, Math.PI / 2)))
  }

  ; (buildingGroup as any)._buildingMats = buildingMats
    ; (buildingGroup as any)._lampHeadMats = lampHeadMats
    ; (buildingGroup as any)._streetLights = streetLights

  scene.add(buildingGroup)
  buildingGroup.visible = showBuildings.value

  // 太阳高度角指示物容器
  sunAngleGroup = new THREE.Group()
  scene.add(sunAngleGroup)

  // 初始绘制太阳路径
  drawSunPath()
}

// --- 渲染循环 ---
function animate(now = performance.now()) {
  animFrameId = requestAnimationFrame(animate)
  const deltaSeconds = lastFrameTime === null || document.hidden ? 0 : Math.max(0, (now - lastFrameTime) / 1000)
  lastFrameTime = now

  if (isAnimating.value && deltaSeconds > 0) {
    currentHourAngle.value = advanceHourAngle(currentHourAngle.value, animSpeed.value, deltaSeconds)
    updateSunAtTime()
  }

  updateCameraTransition(now)
  if (!groundView.value) controls.update()
  updateLocalTrackLabelScale()
  updateSunAngleLabelScale()
  renderer.render(scene, camera)
}

// --- Three.js 容器 resize ---
function isPanelLayoutResizing() {
  return viewportResizing.value
}

function applySceneResize(
  width: number,
  height: number
) {
  if (
    !camera ||
    !renderer ||
    !scene
  ) {
    return
  }

  const safeWidth = Math.max(
    1,
    Math.round(width)
  )

  const safeHeight = Math.max(
    1,
    Math.round(height)
  )

  /*
   * 尺寸没有变化时绝不调用 renderer.setSize()。
   * setSize 会重新分配 WebGL drawing buffer，
   * 高频调用会造成拖拽时短暂清屏。
   */
  if (
    safeWidth === lastSceneWidth &&
    safeHeight === lastSceneHeight
  ) {
    return
  }

  lastSceneWidth = safeWidth
  lastSceneHeight = safeHeight

  camera.aspect =
    safeWidth / safeHeight

  syncSceneFraming(safeWidth, safeHeight)
  camera.updateProjectionMatrix()

  renderer.setSize(
    safeWidth,
    safeHeight,
    false
  )

  if (!groundView.value) controls?.update()
  updateLocalTrackLabelScale()
  updateSunAngleLabelScale()

  /*
   * setSize 后立即补绘一帧，
   * 不等待下一轮 animate。
   */
  renderer.render(
    scene,
    camera
  )
}

function scheduleSceneResize(
  width: number,
  height: number,
  delay = 110
) {
  pendingSceneWidth = Math.max(
    1,
    Math.round(width)
  )

  pendingSceneHeight = Math.max(
    1,
    Math.round(height)
  )

  /*
   * 连续拖拽阶段只更新相机比例，
   * canvas 先依靠 CSS 跟随容器变化。
   */
  if (camera) {
    camera.aspect =
      pendingSceneWidth /
      pendingSceneHeight

    camera.updateProjectionMatrix()
  }

  if (sceneResizeTimer !== null) {
    window.clearTimeout(
      sceneResizeTimer
    )
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  sceneResizeTimer =
    window.setTimeout(() => {
      sceneResizeTimer = null

      /*
       * 拖拽尚未结束时不重建 WebGL buffer。
       * Hook 在稳定后会再次触发最终校准。
       */
      if (isPanelLayoutResizing()) {
        return
      }

      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              applySceneResize(
                pendingSceneWidth,
                pendingSceneHeight
              )
            })
        })
    }, delay)
}

function scheduleSceneResizeFromContainer(
  delay = 110
) {
  const container =
    threeContainerRef.value

  if (!container) {
    return
  }

  scheduleSceneResize(
    container.clientWidth,
    container.clientHeight,
    delay
  )
}

function onResize() {
  scheduleSceneResizeFromContainer()
}

// 仅根据容器尺寸适配竖屏取景，悬浮面板的显示和展开状态不影响相机。
function syncSceneFraming(width: number, height: number) {
  if (!camera || width <= 0 || height <= 0) return
  camera.zoom = groundView.value ? 1 : Math.min(1, width / height / 0.9)
  camera.updateProjectionMatrix()
}

onMounted(() => {
  document.addEventListener('visibilitychange', cancelHiddenCorrespondence)
  window.addEventListener('resize', updatePanelViewport)
  document.addEventListener('visibilitychange', resetAnimationClock)
  initThree()
  animate()

  const container =
    threeContainerRef.value

  if (container) {
    sceneResizeObserver =
      new ResizeObserver(
        (entries) => {
          const entry =
            entries[0]

          if (!entry) {
            return
          }

          scheduleSceneResize(
            entry.contentRect.width,
            entry.contentRect.height
          )
        }
      )

    sceneResizeObserver.observe(
      container
    )
  }

  scheduleSceneResizeFromContainer(0)
})

onUnmounted(() => {
  stopCorrespondence(false)
  document.removeEventListener('visibilitychange', cancelHiddenCorrespondence)
  stopSplit()
  window.removeEventListener('resize', updatePanelViewport)
  document.removeEventListener('visibilitychange', resetAnimationClock)
  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null

  if (sceneResizeTimer !== null) {
    window.clearTimeout(
      sceneResizeTimer
    )

    sceneResizeTimer = null
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  cancelAnimationFrame(animFrameId)

  cameraTransition = null
  lookControls?.dispose()
  lookControls = null
  controls?.removeEventListener('start', handleOrbitStart)
  controls?.dispose()

  if (renderer) {
    if (scene) disposeSceneObject(scene)
    renderer.dispose()
    renderer.forceContextLoss()

    const container = threeContainerRef.value

    if (
      container &&
      renderer.domElement.parentElement === container
    ) {
      container.removeChild(renderer.domElement)
    }
  }
})
</script>


<style scoped>
.apparent-motion-of-the-sun-container {
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    sans-serif;
}

.three-host {
  background:
    transparent;
}

.city-grid {
  grid-template-columns:
    repeat(3,
      minmax(0, 1fr));
}

.season-grid,
.view-grid {
  grid-template-columns:
    repeat(4,
      minmax(0, 1fr));
}

.scale-labels,
.time-markers {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  color:
    var(--text-muted);
  font-size:
    var(--font-size-xxs,
      clamp(8px, 0.64vw, 10px));
  line-height: 1.4;
}

.scale-labels {
  margin-top: -2px;
}

.time-marker-btn {
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
}

.time-marker-btn:hover,
.time-marker-btn:focus-visible {
  text-decoration: underline;
}

.parameter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap:
    clamp(8px, 0.8vw, 12px);
  margin-top:
    clamp(8px, 0.8vh, 12px);
  padding:
    clamp(8px, 0.8vw, 12px);
  color:
    var(--text-secondary);
  background:
    rgba(var(--theme-primary-rgb), 0.08);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.16);
  border-radius:
    clamp(8px, 0.75vw, 12px);
}

.parameter-banner strong {
  color:
    var(--theme-primary);
  font-size:
    var(--font-size-base,
      clamp(11px, 0.9vw, 14px));
}

.parameter-banner small {
  margin-left: 4px;
  color:
    var(--text-muted);
}

.sun-timeline-dock {
  width:
    min(880px,
      calc(100% - 32px));
  grid-template-columns:
    auto auto minmax(160px, 1fr) auto;
}

.solar-time-readout {
  display: flex;
  min-width:
    clamp(72px, 7vw, 96px);
  flex-direction: column;
  gap: 2px;
}

.solar-time-readout span {
  color:
    var(--text-muted);
  font-size:
    var(--font-size-xxs,
      clamp(8px, 0.64vw, 10px));
}

.solar-time-readout strong {
  color:
    var(--theme-primary);
  font-size:
    var(--font-size-base,
      clamp(12px, 0.92vw, 14px));
}

.formula-panel {
  display: flex;
  flex-direction: column;
  gap:
    clamp(6px, 0.6vw, 10px);
}

.formula-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding:
    clamp(8px, 0.8vw, 12px);
  background:
    rgba(var(--theme-primary-rgb), 0.08);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.15);
  border-radius:
    clamp(8px, 0.75vw, 12px);
}

.formula-block.secondary {
  background:
    rgba(var(--theme-secondary-rgb), 0.08);
  border-color:
    rgba(var(--theme-secondary-rgb), 0.15);
}

.formula-block span,
.calc-step {
  color:
    var(--text-secondary);
  font-size:
    var(--font-size-xs,
      clamp(9px, 0.72vw, 11px));
}

.formula-block strong {
  color:
    var(--text-primary);
  font-size:
    var(--font-size-sm,
      clamp(10px, 0.82vw, 13px));
}

.calc-result {
  padding:
    clamp(7px, 0.7vw, 10px);
  color:
    var(--theme-primary);
  font-size:
    var(--font-size-sm,
      clamp(10px, 0.82vw, 13px));
  font-weight: 900;
  background:
    rgba(var(--theme-primary-rgb), 0.08);
  border-radius:
    clamp(7px, 0.65vw, 10px);
}

.formula-divider {
  height: 1px;
  background:
    var(--panel-border);
}

.lecture-content {
  color:
    var(--text-secondary);
  line-height: 1.8;
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap:
    clamp(7px, 0.7vw, 10px);
}

.mistake-item {
  display: grid;
  grid-template-columns:
    auto minmax(0, 1fr);
  gap:
    clamp(7px, 0.7vw, 10px);
  padding:
    clamp(8px, 0.8vw, 12px);
  background:
    rgba(var(--theme-primary-rgb), 0.06);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.12);
  border-radius:
    clamp(8px, 0.75vw, 12px);
}

.mistake-index {
  display: grid;
  width:
    clamp(22px, 1.8vw, 28px);
  height:
    clamp(22px, 1.8vw, 28px);
  place-items: center;
  color:
    var(--theme-on-primary);
  font-weight: 900;
  background:
    linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
  border-radius: 50%;
}

.mistake-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-weight: 800;
}

.mistake-line .wrong {
  color:
    #ff8a8a;
}

.mistake-line .correct {
  color:
    var(--theme-primary);
}

.mistake-line .arrow {
  color:
    var(--text-muted);
}

.mistake-item p {
  margin:
    4px 0 0;
  color:
    var(--text-muted);
  font-size:
    var(--font-size-xs,
      clamp(9px, 0.72vw, 11px));
  line-height: 1.65;
}

@media (max-width: 720px) {

  .city-grid,
  .season-grid,
  .view-grid {
    grid-template-columns:
      repeat(2,
        minmax(0, 1fr));
  }
}

/* ===================== v30: 普通 1920 不触发超大屏增强 =====================
   - 业务大屏判断提升到 2200px
   - resize-handle 改为 pointerdown.stop.prevent
   - 面板拖拽改为 document 级监听，拖出面板也不断
   - 普通 1920×1080 电脑按普通 large 布局处理
*/


/* ===================== v31: 普通 1920 最大拖拽宽度收敛 =====================
   - 1440 ~ 2199：左侧最多 560px，右侧最多 620px
   - 2200 以上：左侧最多 820px，右侧最多 900px
   - 普通 1920 默认宽度和最大拖拽宽度都不再按超大屏处理
*/

/* ===================== v32: 面板宽度连续化 =====================
   对应 script 中 getAdaptivePanelWidth / getPanelResizeBounds。
   - 修复 1440 断点面板突然变宽；
   - 修复 820 断点面板突然变宽；
   - layoutMode 只负责布局形态，不再决定面板宽度。
*/

/* ===================== 公共面板 Hook 接入 ===================== */
/*
 * 面板拖拽和浏览器连续缩放期间关闭 Grid / 面板过渡，
 * 避免真实列宽持续追赶鼠标并重复触发 ResizeObserver。
 */
.apparent-motion-of-the-sun-container .workspace.panel-resizing,
.apparent-motion-of-the-sun-container .workspace.layout-resizing,
.apparent-motion-of-the-sun-container .workspace.panel-resizing .side-panel,
.apparent-motion-of-the-sun-container .workspace.layout-resizing .side-panel,
.apparent-motion-of-the-sun-container .workspace.panel-resizing .center-stage,
.apparent-motion-of-the-sun-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

.apparent-motion-of-the-sun-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* 默认右侧上下排列；位置和尺寸交回悬浮卡片组件，允许自由拖动、缩放。 */
.apparent-motion-of-the-sun-container {
  --font-size-xxs: 12px;
  --font-size-xs: 13px;
  --font-size-sm: 14px;
  --font-size-base: 14px;
  --text-muted: #506a7c;
  --theme-primary: #087c80;
}

.sun-panel-stack {
  --sun-panel-top: 96px;
  --sun-panel-bottom: 112px;
  position: fixed;
  z-index: 44;
  inset: 0;
  pointer-events: none;
}

.sun-panel-stack .floating-feature-card {
  width: min(380px, calc(100vw - 32px));
  height: min(520px, calc(100vh - var(--sun-panel-top) - var(--sun-panel-bottom)));
  max-width: calc(100vw - 20px);
  max-height: calc(100vh - 62px - var(--sun-panel-bottom));
  min-height: 0;
  touch-action: auto;
}

.sun-panel-stack .control-floating-card {
  height: min(740px, calc(100vh - var(--sun-panel-top) - var(--sun-panel-bottom)));
}

.sun-panel-stack .floating-feature-card.collapsed {
  width: 180px;
  height: auto;
}

.sun-panel-stack :deep(.feature-card-head) {
  min-height: 52px;
  padding: 12px 14px;
  gap: 8px;
  touch-action: none;
}

.sun-panel-stack :deep(.feature-resize-handle) {
  touch-action: none;
}

.sun-panel-stack :deep(.feature-card-title-label) {
  font-size: 15px;
}

.sun-panel-stack :deep(.feature-card-title strong) {
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  color: #456174;
}

.sun-panel-stack :deep(.collapse-btn) {
  width: 32px;
  height: 32px;
}

.sun-panel-stack :deep(.feature-card-content) {
  padding: 0 0 40px;
  overscroll-behavior: contain;
}

.sun-panel-stack .panel-scroll {
  height: auto;
  max-height: none;
  overflow: visible;
  padding: 14px;
}

.sun-panel-stack .section-title {
  font-size: 14px;
}

.sun-panel-stack .option-btn {
  font-size: 13px !important;
  min-height: 36px;
  padding: 7px 4px;
}

.sun-panel-stack .control-copy strong {
  font-size: 14px !important;
}

.sun-panel-stack .control-copy span {
  font-size: 12px !important;
  line-height: 1.5;
}

.sun-panel-stack .view-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sun-panel-stack .parameter-banner {
  flex-wrap: wrap;
  font-size: 13px;
}

.sun-panel-stack .latitude-scale {
  position: relative;
  display: block;
  height: 32px;
  margin-top: 4px;
  font-size: 12px;
}

.latitude-mark {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
  min-height: 28px;
  padding: 3px 2px;
  border: 0;
  border-radius: 4px;
  color: var(--text-muted);
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: #87b9c8;
  text-underline-offset: 3px;
}

.latitude-mark:hover,
.latitude-mark[aria-pressed="true"] {
  color: #087c80;
  background: #dceff4;
}

.latitude-mark:first-child {
  transform: none;
}

.latitude-mark:last-child {
  transform: translateX(-100%);
}

.sun-panel-stack .sun-data-grid {
  padding: 14px;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sun-panel-stack .data-card {
  padding: 12px;
}

.sun-panel-stack .data-card>span {
  font-size: 13px !important;
  color: #38566a;
}

.sun-panel-stack .data-card>strong {
  font-size: 20px !important;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.sun-panel-stack .data-card>small {
  font-size: 12px !important;
  color: #506a7c;
  line-height: 1.5;
}

.sun-panel-stack .cyan-card>strong {
  color: #087c80;
}

.sun-panel-stack .blue-card>strong {
  color: #086ca5;
}

.sun-panel-stack .purple-card>strong {
  color: #6353b2;
}

.sun-panel-stack .orange-card>strong {
  color: #906100;
}

.trajectory-note,
.model-note {
  margin: 0 14px 14px;
  padding: 12px;
  border-radius: 10px;
  background: #e8f4f7;
  color: #38566a;
  font-size: 12px;
  line-height: 1.65;
}

.trajectory-note strong {
  font-size: 14px;
  color: #087c80;
}

.trajectory-note p,
.model-note p {
  margin: 6px 0 0;
}

.model-note summary {
  cursor: pointer;
  font-weight: 700;
}

.apparent-motion-of-the-sun-container .toolbar-btn {
  font-size: 13px !important;
  min-height: 36px;
}

.apparent-motion-of-the-sun-container .sun-timeline-dock {
  background: rgba(244, 251, 255, 0.96) !important;
  border-color: rgba(50, 113, 139, 0.3) !important;
  bottom: 14px !important;
  padding: 12px 16px;
  min-height: 76px;
}

.sun-timeline-dock .time-markers,
.sun-timeline-dock .solar-time-readout span {
  color: #38566a;
  font-size: 12px !important;
}

.sun-timeline-dock .solar-time-readout strong {
  color: #087c80;
  font-size: 17px !important;
}

.sun-timeline-dock .speed-btn {
  font-size: 12px !important;
  min-width: 36px;
  min-height: 32px;
}

.sun-panel-stack :deep(button:focus-visible),
.sun-timeline-dock button:focus-visible {
  outline: 2px solid #087aa5;
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .sun-panel-stack {
    --sun-panel-top: 188px;
    --sun-panel-bottom: 176px;
  }

  .sun-panel-stack .floating-feature-card.collapsed { width: 144px; }

  .apparent-motion-of-the-sun-container .sun-timeline-dock {
    width: calc(100% - 24px);
    grid-template-columns: auto auto minmax(0, 1fr);
    gap: 8px 12px;
    padding: 10px 12px;
  }

  .sun-timeline-dock .timeline-main {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .sun-timeline-dock .speed-options {
    grid-column: 3;
    grid-row: 1;
    justify-content: flex-end;
    gap: 4px;
  }

  .sun-timeline-dock .speed-btn {
    min-width: 28px;
    padding: 4px;
    font-size: 11px !important;
  }

  .apparent-motion-of-the-sun-container .top-toolbar {
    --header-side-reserve: 120px;
  }

  .apparent-motion-of-the-sun-container .toolbar-actions {
    flex-wrap: wrap;
    gap: 3px;
  }

  .apparent-motion-of-the-sun-container .toolbar-btn {
    font-size: 11px !important;
    min-height: 25px;
  }

  .apparent-motion-of-the-sun-container .page-title {
    font-size: 17px;
  }

  .sun-panel-stack .city-grid,
  .sun-panel-stack .season-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  :global(.app-container:has(.apparent-motion-of-the-sun-container) > .back-home-btn) {
    top: 128px;
    bottom: auto;
    right: auto;
    left: 12px;
    width: 40px;
    height: 40px;
  }
}
/* 左右等大的主视图，共用底部时间轴；悬浮控制卡不参与列宽计算。 */
.linked-scenes { position: absolute; inset: 0; display: grid; min-width: 0; min-height: 0; }
.space-stage { position: relative; min-width: 0; min-height: 0; background: #081c2b; color: #dceaf6; overflow: hidden; }
.space-stage-heading { position: absolute; top: 16px; left: 18px; right: 18px; z-index: 3; display: grid; gap: 6px; pointer-events: none; text-shadow: 0 1px 4px #081c2b; }
.space-stage-heading strong { font-size: 17px; font-weight: 700; }
.space-stage-heading span { font-size: 12px; color: #aac3d7; }
.space-stage :deep(.space-observer-window) { position: absolute; inset: 0; color: #adc9da; }
.space-stage :deep(.space-observer-canvas) { border-radius: 0; }
.correspondence-note { position: absolute; top: 136px; left: 18px; z-index: 4; display: grid; gap: 5px; width: max-content; max-width: min(260px, calc(100% - 36px)); padding: 10px 12px; border: 1px solid #78fff05e; border-radius: 10px; background: #061825eb; color: #d5e5ef; font-size: 12px; line-height: 1.6; pointer-events: none; }
.correspondence-note strong { color: #78fff0; font-size: 13px; }
.correspondence-note button { justify-self: start; min-height: 32px; padding: 5px 10px; border: 1px solid #78fff078; border-radius: 6px; color: #c8fff7; background: #17423f; font: inherit; cursor: pointer; pointer-events: auto; }
.correspondence-note button:hover { background: #235651; }
.correspondence-note button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.correspondence-note.is-altitude { border-color: #ffd08f73; }
.correspondence-note.is-altitude strong { color: #ffd08f; }
.observer-caption .correspondence-caption { color: #086b64; font-weight: 700; }
.observer-caption .correspondence-caption.is-altitude { color: #8b460a; }
.scene-divider { position: absolute; top: 0; bottom: 0; width: 18px; transform: translateX(-50%); z-index: 6; cursor: col-resize; touch-action: none; }
.scene-divider::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: #608b9f; }
.scene-divider>span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 22px; height: 48px; border-radius: 8px; border: 1px solid #507a91; color: #d7eff8; background: #14374b; font-size: 22px; }
.scene-divider:focus-visible>span { outline: 2px solid #2fc8c0; outline-offset: 2px; }
.is-splitting, .is-splitting * { cursor: col-resize !important; user-select: none; }

.observer-toolbar {
  position: absolute;
  top: 16px;
  left: 18px;
  right: 198px;
  z-index: 3;
  display: grid;
  justify-items: start;
  gap: 9px;
  text-align: left;
  pointer-events: none;
}

.observer-heading {
  display: grid;
  gap: 4px;
  color: #143e51;
  padding: 7px 10px;
  border-radius: 9px;
  background: rgba(245, 252, 255, .92);
  border: 1px solid rgba(77, 129, 149, .16);
}

.observer-heading strong { font-size: 17px; }
.observer-heading span { font-size: 12px; }
.observer-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.observer-actions .theme-btn { font-size: 12px; min-height: 34px; padding: 6px 10px; background: rgba(247, 253, 255, .96); }
.observer-actions .theme-btn[aria-pressed="true"] { border-color: #087c80; color: #066d70; background: #dff5f1; }

.observer-caption {
  position: absolute;
  bottom: 108px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  width: max-content;
  max-width: calc(100% - 36px);
  padding: 7px 12px;
  border: 1px solid rgba(49, 123, 143, .25);
  border-radius: 10px;
  background: rgba(245, 252, 255, .94);
  color: #254e60;
  font-size: 12px;
  text-align: center;
  pointer-events: none;
}

.observer-caption p { margin: 0; line-height: 1.6; }
.observer-caption .pole-direction-note { font-weight: 700; }
.observer-caption .observer-explanation { color: #4c6978; font-size: 11px; }
.observer-key { display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: #087c80; }
.observer-key.reference-plane-key { margin-left: 10px; background: #bd94f4; }
.ground-view-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.ground-view-controls span { flex-basis: 100%; color: #506a7c; font-size: 12px; }
.ground-view-controls button { border: 1px solid #8db9c4; border-radius: 6px; background: #fff; color: #185769; padding: 5px 8px; font: inherit; cursor: pointer; }
.ground-view-controls button:hover { background: #def2f1; }
.observer-actions button:focus-visible,
.ground-view-controls button:focus-visible,
.three-host:focus-visible { outline: 2px solid #087aa5; outline-offset: -2px; }
.three-host.ground-view { touch-action: none; cursor: grab; }
.three-host.ground-view:active { cursor: grabbing; }

@media (max-width: 1100px) {
  .observer-toolbar { left: 14px; right: 194px; }
  .observer-heading strong { font-size: 14px; }
  .space-stage-heading strong { font-size: 14px; }
}

@media (max-width: 720px) {
  .correspondence-note { top: 156px; left: 8px; max-width: calc(100% - 16px); padding: 8px; font-size: 10px; }
  .correspondence-note strong { font-size: 11px; }
  .space-stage-heading { top: 12px; left: 8px; right: 8px; gap: 4px; }
  .space-stage-heading strong { font-size: 12px; }
  .space-stage-heading span { font-size: 10px; }
  .observer-toolbar { top: 12px; left: 8px; right: 8px; gap: 5px; }
  .observer-heading strong { font-size: 12px; }
  .observer-heading span { font-size: 10px; }
  .observer-actions { gap: 4px; }
  .observer-actions .theme-btn { min-height: 30px; padding: 5px 7px; font-size: 11px; }
  .observer-caption { bottom: 148px; max-width: calc(100% - 16px); padding: 6px 8px; font-size: 10px; }
  .ground-view-controls { gap: 4px; }
  .ground-view-controls span { flex-basis: 100%; }
  .ground-view-controls button { padding: 4px 6px; }
}
</style>
