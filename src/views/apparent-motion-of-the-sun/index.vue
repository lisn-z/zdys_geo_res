<template>
  <div ref="pageRef" class="apparent-motion-of-the-sun-container geo-template-page geo-page theme-light"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" :src="logoUrl" alt="logo" />
      </div>

      <h1 class="page-title">太阳视运动</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="setView('free')">
          重置视角
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :aria-pressed="panelsVisible"
          @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <aside v-show="panelsVisible" class="sun-panel-stack" aria-label="观测控制与数据">
        <FloatingFeatureCard class="control-floating-card" title="控制面板" subtitle="调整观测纬度、日期与场景图层" variant="control"
          :initial-top="floatingPanelTop"
          :initial-right="18" :bottom-inset="floatingPanelBottomInset" :min-height="120" draggable resizable light
          v-model:collapsed="controlCardCollapsed">
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
                  :style="{ left: `${(mark.value + 90) / 180 * 100}%` }"
                  :aria-label="`选择${mark.name}（${mark.label}）`" :title="`选择${mark.name}（${mark.label}）`"
                  :aria-pressed="currentLatitude === mark.value" @click="selectLatitudeMark(mark.value)">
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
                  :class="{ active: activeView === viewItem.id }" @click="setView(viewItem.id)">
                  {{ viewItem.name }}
                </button>
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
                  <span>显示地面的南北、东西辅助线</span>
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

        <FloatingFeatureCard class="data-floating-card" title="数据面板" subtitle="查看太阳高度、昼长与日出日落方位" variant="data"
          :initial-top="floatingPanelTop + 72"
          :initial-right="18" :bottom-inset="floatingPanelBottomInset" :min-height="120" draggable resizable light
          v-model:collapsed="dataCardCollapsed">
          <div class="data-grid sun-data-grid">
            <article v-for="item in sunDataCards" :key="item.label" class="geo-card data-card" :class="item.className">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>
          <div class="trajectory-note">
            <strong>轨迹平面倾角 {{ trackInclination.toFixed(1) }}°</strong>
            <p>与地平面的夹角为 90° − |纬度|。{{ trackTiltDescription }}</p>
            <p>节气改变轨迹的位置，不改变这一夹角；屏幕上的投影角度会随视角变化。</p>
          </div>
          <details class="model-note">
            <summary>模型说明</summary>
            <p>采用2026年代表节气日期与近似直射纬度，城市纬度作教学取整。一天内保持直射纬度不变，以太阳中心经过地平线为日出、日落，未计入大气折射和太阳视半径。</p>
            <p>地方太阳时12:00表示太阳经过当地子午线，不等于北京时间12:00。参考节气为距离所选日期最近的八个预设节气之一。</p>
            <p v-if="Math.abs(currentLatitude) === 90">极点的东、南、西、北没有唯一的常规含义，场景以参考经线展示方向；二分日按太阳中心位于地平线上处理。</p>
          </details>
        </FloatingFeatureCard>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
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
            <span>地方太阳时</span>
            <strong>{{ solarTimeStr }}</strong>
          </div>

          <div class="timeline-main">
            <div class="time-markers">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>

            <el-slider :model-value="currentHourAngle" :min="-180" :max="180" :step="1" :show-tooltip="false"
              aria-label="地方太阳时" @input="handleHourSlider" />
          </div>

          <div class="speed-options">
            <button v-for="speed in speedOptions" :key="speed" type="button" class="theme-btn speed-btn"
              :class="{ active: animSpeed === speed }" @click="updateSpeed(speed)">
              {{ speed }}×
            </button>
          </div>
        </div>
      </section>

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


const views = [
  { id: 'south', name: '从南看' },
  { id: 'north', name: '从北看' },
  { id: 'east', name: '从东看' },
  { id: 'west', name: '从西看' },
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
  label: mark.value === 0 ? '0°' : `${Math.abs(mark.value)}°${mark.value < 0 ? 'S' : 'N'}`,
}))

// --- 核心状态 ---
const currentLatitude = ref(40)
const currentDeclination = ref(declinationForDay(dayFromDate('2026-06-21')))
const currentHourAngle = ref(0)
const currentSeasonName = ref('夏至')
const currentDate = ref('2026-06-21')
const activeCity = ref('北京')
const activeSeason = ref('summer')
const activeView = ref('free')
const isAnimating = ref(false)
const animSpeed = ref(1)

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

const controlCardCollapsed = ref(true)
const dataCardCollapsed = ref(true)
const panelsVisible = ref(true)
const compactPanelViewport = ref(window.innerWidth <= 720)
const floatingPanelTop = computed(() => compactPanelViewport.value ? 124 : 96)
const floatingPanelBottomInset = computed(() => compactPanelViewport.value ? 176 : 112)

function updatePanelViewport() {
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
const showBuildings = ref(true)
const showShadows = ref(true)
const showGrid = ref(true)
const showPath = ref(true)

// --- 计算属性 ---
const decHemisphere = computed(() => {
  if (currentDeclination.value > 0) return '北半球'
  if (currentDeclination.value < 0) return '南半球'
  return '赤道'
})

const decHemisphereUnit = computed(() => {
  if (currentDeclination.value > 0) return '°N'
  if (currentDeclination.value < 0) return '°S'
  return '°'
})

const noonHeight = computed(() => 90 - Math.abs(currentLatitude.value - currentDeclination.value))

const latDisplay = computed(() => {
  const lat = currentLatitude.value
  if (lat > 0) return `${lat}°N`
  if (lat < 0) return `${Math.abs(lat)}°S`
  return '0°'
})

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

const solarTimeStr = computed(() => {
  const totalMinutes = Math.round((12 + currentHourAngle.value / 15) * 60)
  return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`
})

const monthDayDisplay = computed(() => {
  const parts = currentDate.value.split('-')
  return `${parseInt(parts[1]!)}月${parseInt(parts[2]!)}日`
})

const currentDayOfYear = computed(() => dayFromDate(currentDate.value))
const declinationDisplay = computed(() =>
  Math.abs(currentDeclination.value).toFixed(2) + decHemisphereUnit.value
)
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
  views.find(item => item.id === activeView.value)?.name || '自由'
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
    label: '地方太阳时',
    value: solarTimeStr.value,
    description:
      '时角 ' +
      currentHourAngle.value.toFixed(0) +
      '°',
    className: 'orange-card',
  },
  {
    label: '正午太阳高度',
    value:
      noonHeight.value.toFixed(2) +
      '°',
    description: noonHeight.value < 0 ? '正午太阳仍在地平线下' : 'H = 90° − |φ − δ|',
    className: 'cyan-card',
  },
  {
    label: '当前太阳高度',
    value:
      currentSunHeight.value.toFixed(2) +
      '°',
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
let dirLight: THREE.DirectionalLight
let dome: THREE.Mesh
let jinMaoGroup: THREE.Group
let swfcGroup: THREE.Group
let shTowerGroup: THREE.Group
let buildingGroup: THREE.Group
let gridLines: THREE.Line[] = []
let pathLine: THREE.Object3D | null = null
let currentSunMarker: THREE.Mesh | null = null
let curSunGlowSprite: THREE.Sprite | null = null
let flagpoleGroup: THREE.Group | null = null
let sunriseLabel: THREE.Sprite | null = null
let sunsetLabel: THREE.Sprite | null = null
let undergroundPath: THREE.Group | null = null
let flagShaderMat: THREE.ShaderMaterial | null = null
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

function drawSunPath() {
  for (const object of [pathLine, undergroundPath, sunriseLabel, sunsetLabel]) {
    if (object) {
      scene.remove(object)
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
        scene.add(undergroundPath)
      } else {
        pathLine = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 240, 0.025, 8, closed),
          new THREE.MeshBasicMaterial({ color: 0xf2bd38 }),
        )
        scene.add(pathLine)
      }
      return curve
    }
    if (status === 'normal' && sunriseHourAngle !== null && sunsetHourAngle !== null) {
      const daytime = addArc(sunriseHourAngle, sunsetHourAngle, false)
      // 日落 → 次日日出，跨午夜但时角连续。
      addArc(sunsetHourAngle, sunriseHourAngle + 360, true)
      sunriseLabel = makeSunLabel('日出', daytime.getPoint(0))
      sunsetLabel = makeSunLabel('日落', daytime.getPoint(1))
      scene.add(sunriseLabel, sunsetLabel)
    } else {
      addArc(-180, 180, status === 'polar-night', true)
    }
  }

  if (!currentSunMarker) {
    currentSunMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffc42b }),
    )
    scene.add(currentSunMarker)
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
    scene.add(curSunGlowSprite)
  }
  updateSunAtTime()
}

function updateSunAtTime() {
  const position = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  const isAboveHorizon = position.alt > 1e-8
  currentSunMarker?.position.set(position.x, position.y, position.z)
  curSunGlowSprite?.position.set(position.x, position.y, position.z)
  // 太阳位于地平线下时只保留暗色示意球，不发光、不投射太阳阴影。
  if (currentSunMarker) {
    ; (currentSunMarker.material as THREE.MeshBasicMaterial).color.setHex(isAboveHorizon ? 0xffc42b : 0x8b775b)
  }
  if (curSunGlowSprite) curSunGlowSprite.visible = isAboveHorizon
  dirLight.position.set(position.x * 2, position.y * 2, position.z * 2)
  dirLight.intensity = isAboveHorizon ? 0.8 + position.y / 8 * 0.8 : 0
  dirLight.castShadow = showShadows.value && isAboveHorizon
  renderer.shadowMap.enabled = dirLight.castShadow
  updateFlagpoleAngle(position)
  updateSkyBackground()
}

function updateFlagpoleAngle(curPos: { x: number; y: number; z: number; alt: number }) {
  if (!flagpoleGroup) return
  // 清除上次的线条/弧线/标注
  for (let i = flagpoleGroup.children.length - 1; i >= 0; i--) {
    const child = flagpoleGroup.children[i]!
    if ((child as any)._isDynamic) {
      flagpoleGroup.remove(child)
      disposeSceneObject(child)
    }
  }

  const sunPos = new THREE.Vector3(curPos.x, curPos.y, curPos.z)
  const horizDir = new THREE.Vector3(curPos.x, 0, curPos.z)
  if (horizDir.length() < 0.000001) horizDir.set(1, 0, 0)
  horizDir.normalize()
  // 太阳在地平线以下时不显示
  if (curPos.alt <= 1e-8) return

  const rayMat = new THREE.MeshBasicMaterial({ color: 0xe4d28b })
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xe4d28b })

  const altRad = curPos.alt * Math.PI / 180
  const center = new THREE.Vector3(0, 0.01, 0)

  // 太阳光线：从太阳直连正中心（圆柱体）
  const rayDir = center.clone().sub(sunPos)
  const rayLen = rayDir.length()
  const rayMid = sunPos.clone().add(center).multiplyScalar(0.5)
  const rayCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, rayLen, 8), rayMat)
  rayCyl.position.copy(rayMid)
  rayCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rayDir.normalize())
    ; (rayCyl as any)._isDynamic = true
  flagpoleGroup.add(rayCyl)

  // 地面水平线：从中心向太阳水平方向（夹角的另一条边）
  const groundLineLen = 1.2
  const groundEnd = center.clone().add(horizDir.clone().multiplyScalar(groundLineLen))
  const groundMid = center.clone().add(groundEnd).multiplyScalar(0.5)
  const groundDirVec = groundEnd.clone().sub(center)
  const groundCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, groundLineLen, 8), rayMat)
  groundCyl.position.copy(groundMid)
  groundCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), groundDirVec.normalize())
    ; (groundCyl as any)._isDynamic = true
  flagpoleGroup.add(groundCyl)

  // 角度弧线：在正中心，从地面方向到太阳光线方向（管道体）
  const up = new THREE.Vector3(0, 1, 0)
  const arcSegments = 24
  const arcRadius = 0.8
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
  const arcTube = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 32, 0.018, 8, false), arcMat)
    ; (arcTube as any)._isDynamic = true
  flagpoleGroup.add(arcTube)

  // 标注太阳高度角文字
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 384
  labelCanvas.height = 64
  const lctx = labelCanvas.getContext('2d')!
  lctx.fillStyle = 'rgba(0,0,0,0)'
  lctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height)
  lctx.font = 'bold 28px sans-serif'
  lctx.fillStyle = '#e4d28b'
  lctx.strokeStyle = '#000000'
  lctx.lineWidth = 4
  const text = curPos.alt > 89.999 ? '太阳高度角 90°（天顶）' : `太阳高度角 ${curPos.alt.toFixed(1)}°`
  lctx.strokeText(text, 8, 42)
  lctx.fillText(text, 8, 42)
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
  const labelSprite = new THREE.Sprite(labelMat)
  labelSprite.scale.set(2.8, 0.7, 1)
  // 放在弧线中点上方
  const midAngle = altRad * 0.5
  const labelPos = center.clone()
    .add(horizDir.clone().multiplyScalar(Math.cos(midAngle) * (arcRadius + 0.3)))
    .add(up.clone().multiplyScalar(Math.sin(midAngle) * (arcRadius + 0.3)))
  labelSprite.position.copy(labelPos)
    ; (labelSprite as any)._isDynamic = true
  flagpoleGroup.add(labelSprite)
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
function toggleAnimation() {
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
function setView(viewId: string) {
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
  cameraTransition = null
  activeView.value = 'free'
}

// --- 监听场景元素开关变化 ---
watch([showDome, showBuildings, showShadows, showGrid, showPath], () => {
  if (dome) dome.visible = showDome.value
  if (buildingGroup!) buildingGroup.visible = showBuildings.value
  gridLines.forEach(l => l.visible = showGrid.value)
  drawSunPath()
})

// --- 初始化 Three.js ---
function initThree() {
  const container = threeContainerRef.value

  if (!container) return

  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  scene = new THREE.Scene()
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
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.addEventListener('start', handleOrbitStart)
  camera.position.set(15, 12, 20)
  controls.update()

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

  // 地平圈 - 深色草地
  const horizonGeo = new THREE.CylinderGeometry(8, 8, 0.1, 64)
  const horizonMat = new THREE.MeshLambertMaterial({ color: 0x103808, transparent: true, opacity: 0.92 })
  horizonMeshRef = new THREE.Mesh(horizonGeo, horizonMat)
  horizonMeshRef.position.y = -0.05
  horizonMeshRef.receiveShadow = true
  scene.add(horizonMeshRef)

  // 地表圆边框
  const borderGeo = new THREE.TorusGeometry(8, 0.08, 8, 64)
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8 })
  const border = new THREE.Mesh(borderGeo, borderMat)
  border.rotation.x = Math.PI / 2
  border.position.y = 0.02
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

  // 东南西北方向标签
  const makeDirLabel = (text: string, color: string, x: number, z: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 96
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 192, 96)
    ctx.font = 'bold 52px Arial'
    ctx.fillStyle = color
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText(text, 96, 48)
    ctx.fillText(text, 96, 48)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(2.0, 1.0, 1)
    sprite.position.set(x, 0.8, z)
    scene.add(sprite)
  }
  makeDirLabel('东 E', '#ffd000', 9.5, 0)
  makeDirLabel('南 S', '#ffd000', 0, 9.5)
  makeDirLabel('西 W', '#ffd000', -9.5, 0)
  makeDirLabel('北 N', '#ffd000', 0, -9.5)

  // 天穹半球 - 主题色
  const domeGeo = new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x2ec4b6, wireframe: true, transparent: true, opacity: 0.15 })
  dome = new THREE.Mesh(domeGeo, domeMat)
  scene.add(dome)

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

  // 旗杆（太阳高度角演示）
  flagpoleGroup = new THREE.Group()
  const poleHeight = 1.8
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.6 })
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, poleHeight, 8), poleMat)
  pole.position.y = poleHeight / 2
  pole.castShadow = true
  flagpoleGroup.add(pole)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), poleMat)
  ball.position.y = poleHeight + 0.04
  flagpoleGroup.add(ball)

  // 旗面（canvas 贴图：正面"智地有申" 背面"太阳视运动"，风吹 shader 动画）
  const flagCanvas = document.createElement('canvas')
  flagCanvas.width = 256
  flagCanvas.height = 160
  const fctx = flagCanvas.getContext('2d')!
  const flagGrad = fctx.createLinearGradient(0, 0, 256, 160)
  flagGrad.addColorStop(0, '#c8102e')
  flagGrad.addColorStop(1, '#a00d22')
  fctx.fillStyle = flagGrad
  fctx.fillRect(0, 0, 256, 160)
  fctx.font = 'bold 56px sans-serif'
  fctx.fillStyle = '#ffd700'
  fctx.strokeStyle = '#8a6a00'
  fctx.lineWidth = 3
  fctx.textAlign = 'center'
  fctx.textBaseline = 'middle'
  fctx.strokeText('智地有申', 128, 80)
  fctx.fillText('智地有申', 128, 80)
  const flagTex = new THREE.CanvasTexture(flagCanvas)

  // 背面贴图：太阳视运动
  const flagCanvasBack = document.createElement('canvas')
  flagCanvasBack.width = 256
  flagCanvasBack.height = 160
  const fbctx = flagCanvasBack.getContext('2d')!
  const flagGradB = fbctx.createLinearGradient(0, 0, 256, 160)
  flagGradB.addColorStop(0, '#a00d22')
  flagGradB.addColorStop(1, '#c8102e')
  fbctx.fillStyle = flagGradB
  fbctx.fillRect(0, 0, 256, 160)
  fbctx.font = 'bold 48px sans-serif'
  fbctx.fillStyle = '#ffd700'
  fbctx.strokeStyle = '#8a6a00'
  fbctx.lineWidth = 3
  fbctx.textAlign = 'center'
  fbctx.textBaseline = 'middle'
  fbctx.strokeText('太阳视运动', 128, 80)
  fbctx.fillText('太阳视运动', 128, 80)
  const flagTexBack = new THREE.CanvasTexture(flagCanvasBack)

  flagShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: flagTex },
      uMapBack: { value: flagTexBack },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float amp = (pos.x + 0.35) / 0.7;
        pos.z += sin(uTime * 5.0 + pos.x * 6.0) * 0.07 * amp;
        pos.y += cos(uTime * 4.0 + pos.x * 5.0) * 0.04 * amp;
        vShade = 0.75 + 0.25 * (1.0 - amp * abs(sin(uTime * 5.0 + pos.x * 6.0)));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uMapBack;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vec4 tex;
        if (gl_FrontFacing) {
          tex = texture2D(uMap, vUv);
        } else {
          tex = texture2D(uMapBack, vec2(1.0 - vUv.x, vUv.y));
        }
        gl_FragColor = vec4(tex.rgb * vShade, tex.a);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
  })
  const flagGeo = new THREE.PlaneGeometry(0.7, 0.44, 16, 8)
  const flag = new THREE.Mesh(flagGeo, flagShaderMat)
  flag.position.set(0.38, poleHeight - 0.15, 0)
  flagpoleGroup.add(flag)
  scene.add(flagpoleGroup)

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

  if (flagShaderMat) {
    flagShaderMat.uniforms.uTime!.value += deltaSeconds * 2.4
  }

  updateCameraTransition(now)
  controls.update()
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

  controls?.update()

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
  camera.zoom = Math.min(1, width / height / 1.2)
  camera.updateProjectionMatrix()
}

onMounted(() => {
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

.apparent-motion-of-the-sun-container.theme-light.layout-floating .top-toolbar {
  background: rgba(240, 249, 253, 0.94) !important;
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
    --sun-panel-top: 124px;
    --sun-panel-bottom: 176px;
  }

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
    top: 68px;
    bottom: auto;
    right: auto;
    left: 12px;
    width: 40px;
    height: 40px;
  }
}
</style>
