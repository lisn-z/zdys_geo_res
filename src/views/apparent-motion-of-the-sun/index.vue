<template>
  <div ref="pageRef" class="apparent-motion-of-the-sun-container geo-template-page geo-page theme-light layout-floating"
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
              <h2>观测与场景设置</h2>
              <p>设定纬度、节气、时间和图层，观察太阳视运动规律</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

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
              @input="handleLatitudeSlider" />

            <div class="scale-labels latitude-scale">
              <span>90°S</span>
              <span>66.5°S</span>
              <span>23.5°S</span>
              <span>0°</span>
              <span>23.5°N</span>
              <span>66.5°N</span>
              <span>90°N</span>
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">节气与日期</h3>
              <strong class="control-value">
                {{ currentSeasonName }}
              </strong>
            </div>

            <div class="option-grid season-grid">
              <button v-for="season in seasons" :key="season.id" type="button" class="theme-btn option-btn"
                :class="{ active: activeSeason === season.id }" @click="setSeason(season.dec, season.id)">
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
              @input="handleDaySlider" />

            <div class="parameter-banner">
              <span>太阳直射纬度 δ</span>
              <strong>
                {{ currentDeclination.toFixed(2) }}°
                <small>{{ decHemisphere }}</small>
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
                <span>显示天空半球与地平圈</span>
              </div>

              <el-switch v-model="showDome" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>城市建筑群</strong>
                <span>显示地表参照物和建筑阴影</span>
              </div>

              <el-switch v-model="showBuildings" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>科学阴影</strong>
                <span>根据太阳高度改变投影方向</span>
              </div>

              <el-switch v-model="showShadows" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>方位辅助线</strong>
                <span>显示东南西北与地平圈辅助线</span>
              </div>

              <el-switch v-model="showGrid" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>太阳运行轨迹</strong>
                <span>显示全天太阳视运动路径</span>
              </div>

              <el-switch v-model="showPath" />
            </div>
          </section>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
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
              @input="handleHourSlider" />
          </div>

          <div class="speed-options">
            <button v-for="speed in speedOptions" :key="speed" type="button" class="theme-btn speed-btn"
              :class="{ active: animSpeed === speed }" @click="updateSpeed(speed)">
              {{ speed }}×
            </button>
          </div>
        </div>
      </section>

      <FloatingFeatureCard title="数据与规律验证" subtitle="读取实时结果，展开查看计算过程与易错提醒" variant="data" :initial-top="76"
        :initial-right="18" light v-model:collapsed="dataCardCollapsed">
        <div class="data-grid sun-data-grid" style="padding: 16px;">
          <article v-for="item in sunDataCards" :key="item.label" class="geo-card data-card" :class="item.className">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.description }}</small>
          </article>
        </div>
      </FloatingFeatureCard>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>
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
  ElCollapse,
  ElCollapseItem,
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

// ===== 天空颜色模块（原 skyColors.ts） =====
function lerpColor(c1: number[], c2: number[], t: number): number[] {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return [clamp(c1[0]! + (c2[0]! - c1[0]!) * t), clamp(c1[1]! + (c2[1]! - c1[1]!) * t), clamp(c1[2]! + (c2[2]! - c1[2]!) * t)]
}

function rgbStr(c: number[]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

const S = {
  nightTop: [8, 12, 30], nightMid: [15, 25, 55], nightHorizon: [25, 35, 70],
  dawnTop: [30, 40, 80], dawnMid: [80, 70, 100], dawnHorizon: [220, 120, 60],
  sunriseTop: [70, 100, 160], sunriseMid: [140, 160, 200], sunriseHorizon: [255, 170, 80],
  dayTop: [70, 130, 210], dayMid: [120, 170, 230], dayHorizon: [180, 210, 235],
  noonTop: [80, 150, 220], noonMid: [150, 190, 240], noonHorizon: [200, 220, 240],
  nightGround: [15, 25, 10], dawnGround: [30, 45, 20], dayGround: [60, 120, 50], noonGround: [70, 140, 55],
  polarDayHorizon: [160, 180, 200], polarDayTop: [50, 80, 150],
  polarNightHorizon: [20, 30, 55], polarNightTop: [5, 8, 20],
}

function setColor(material: THREE.Color, c: number[]) {
  material.setRGB(c[0]! / 255, c[1]! / 255, c[2]! / 255)
}

function applySky(
  sunH: number,
  isPolarDay: boolean,
  isPolarNight: boolean,
  bgCanvas: HTMLCanvasElement,
  bgTexture: THREE.CanvasTexture,
  ambientLight: THREE.AmbientLight,
  hemiLight: THREE.HemisphereLight,
  groundMaterial: THREE.MeshLambertMaterial,
) {
  let skyTop: number[], skyMid: number[], skyHorizon: number[]
  let groundMid: number[], groundDark: number[]
  let ambColor: number[], ambInt: number
  let hSky: number[], hGround: number[], hInt: number
  let groundColor: number[]

  if (isPolarNight) {
    skyTop = S.polarNightTop; skyMid = lerpColor(S.polarNightTop, S.polarNightHorizon, 0.5); skyHorizon = S.polarNightHorizon
    groundMid = [12, 18, 8]; groundDark = [8, 12, 5]
    ambColor = [20, 30, 55]; ambInt = 0.3
    hSky = [20, 35, 65]; hGround = [15, 20, 10]; hInt = 0.25
    groundColor = [15, 25, 12]
  } else if (isPolarDay) {
    const polarT = Math.min(Math.max(sunH, 0) / 40, 1)
    skyTop = lerpColor(S.polarDayTop, S.noonTop, polarT)
    skyMid = lerpColor(lerpColor(S.polarDayTop, S.polarDayHorizon, 0.5), S.noonMid, polarT)
    skyHorizon = lerpColor(S.polarDayHorizon, S.noonHorizon, polarT)
    groundMid = lerpColor(S.dawnGround, S.noonGround, polarT); groundDark = lerpColor(S.nightGround, S.dawnGround, polarT)
    ambColor = lerpColor([40, 70, 130], [180, 220, 240], polarT); ambInt = 0.6 + polarT * 1.2
    hSky = lerpColor([50, 80, 150], [180, 220, 240], polarT); hGround = lerpColor([25, 40, 18], S.noonGround, polarT); hInt = 0.4 + polarT * 1.1
    groundColor = lerpColor([30, 50, 25], S.noonGround, polarT)
  } else if (sunH < -12) {
    skyTop = S.nightTop; skyMid = S.nightMid; skyHorizon = S.nightHorizon
    groundMid = S.nightGround; groundDark = [10, 15, 6]
    ambColor = [15, 25, 55]; ambInt = 0.3
    hSky = [20, 35, 65]; hGround = S.nightGround; hInt = 0.25
    groundColor = [18, 28, 14]
  } else if (sunH < -6) {
    const t = (sunH + 12) / 6
    skyTop = lerpColor(S.nightTop, S.dawnTop, t * 0.4); skyMid = lerpColor(S.nightMid, S.dawnMid, t * 0.4); skyHorizon = lerpColor(S.nightHorizon, S.dawnHorizon, t * 0.5)
    groundMid = lerpColor(S.nightGround, S.dawnGround, t * 0.3); groundDark = lerpColor([10, 15, 6], S.nightGround, t * 0.3)
    ambColor = lerpColor([15, 25, 55], [25, 35, 70], t * 0.5); ambInt = 0.3 + t * 0.08
    hSky = lerpColor([20, 35, 65], [30, 45, 85], t * 0.4); hGround = lerpColor(S.nightGround, S.dawnGround, t * 0.3); hInt = 0.25 + t * 0.08
    groundColor = lerpColor([18, 28, 14], [22, 34, 16], t * 0.3)
  } else if (sunH < 0) {
    const t = (sunH + 6) / 6
    skyTop = lerpColor(S.dawnTop, S.sunriseTop, t); skyMid = lerpColor(S.dawnMid, S.sunriseMid, t); skyHorizon = lerpColor(S.dawnHorizon, S.sunriseHorizon, t)
    groundMid = lerpColor(S.dawnGround, S.dayGround, t * 0.4); groundDark = lerpColor(S.nightGround, S.dawnGround, t * 0.5)
    ambColor = lerpColor([25, 35, 70], [100, 140, 200], t); ambInt = 0.38 + t * 0.6
    hSky = lerpColor([30, 45, 85], [130, 160, 210], t); hGround = lerpColor(S.dawnGround, S.dayGround, t * 0.5); hInt = 0.33 + t * 0.6
    groundColor = lerpColor([22, 34, 16], [50, 100, 40], t)
  } else if (sunH < 15) {
    const t = sunH / 15
    skyTop = lerpColor(S.sunriseTop, S.dayTop, t); skyMid = lerpColor(S.sunriseMid, S.dayMid, t); skyHorizon = lerpColor(S.sunriseHorizon, S.dayHorizon, t)
    groundMid = lerpColor(lerpColor(S.dawnGround, S.dayGround, 0.4), S.dayGround, t); groundDark = lerpColor(S.dawnGround, S.dayGround, t * 0.6)
    ambColor = lerpColor([100, 140, 200], [160, 210, 240], t); ambInt = 1.1 + t * 0.5
    hSky = lerpColor([130, 160, 210], [170, 210, 240], t); hGround = lerpColor([50, 100, 40], S.dayGround, t); hInt = 1.05 + t * 0.3
    groundColor = lerpColor([50, 100, 40], [60, 120, 50], t)
  } else if (sunH < 45) {
    const t = (sunH - 15) / 30
    skyTop = lerpColor(S.dayTop, S.noonTop, t); skyMid = lerpColor(S.dayMid, S.noonMid, t); skyHorizon = lerpColor(S.dayHorizon, S.noonHorizon, t)
    groundMid = lerpColor(S.dayGround, S.noonGround, t); groundDark = lerpColor(S.dawnGround, S.dayGround, 0.6 + t * 0.4)
    ambColor = lerpColor([160, 210, 240], [190, 230, 250], t); ambInt = 1.6 + t * 0.3
    hSky = lerpColor([170, 210, 240], [190, 230, 250], t); hGround = lerpColor(S.dayGround, S.noonGround, t); hInt = 1.35 + t * 0.2
    groundColor = lerpColor([60, 120, 50], S.noonGround, t)
  } else {
    skyTop = S.noonTop; skyMid = S.noonMid; skyHorizon = S.noonHorizon
    groundMid = S.noonGround; groundDark = S.dayGround
    ambColor = [190, 230, 250]; ambInt = 1.9
    hSky = [190, 230, 250]; hGround = S.noonGround; hInt = 1.55
    groundColor = S.noonGround
  }

  const bgCtx = bgCanvas.getContext('2d')!
  const bgGrad = bgCtx.createLinearGradient(0, 0, 0, 512)
  bgGrad.addColorStop(0, rgbStr(skyTop))
  bgGrad.addColorStop(0.35, rgbStr(skyMid))
  bgGrad.addColorStop(0.55, rgbStr(skyHorizon))
  bgGrad.addColorStop(0.75, rgbStr(groundMid))
  bgGrad.addColorStop(1, rgbStr(groundDark))
  bgCtx.fillStyle = bgGrad
  bgCtx.fillRect(0, 0, 2, 512)
  bgTexture.needsUpdate = true

  setColor(ambientLight.color, ambColor)
  ambientLight.intensity = ambInt * 0.5

  setColor(hemiLight.color, hSky)
  setColor(hemiLight.groundColor, hGround)
  hemiLight.intensity = hInt * 0.5

  setColor(groundMaterial.color, groundColor.map(c => Math.max(Math.round(c * 0.55), 22)))
}
// --- 城市与节气预设数据 ---
const cities = [
  { lat: 90, name: '北极' },
  { lat: 66.5, name: '北极圈' },
  { lat: 45, name: '哈尔滨' },
  { lat: 40, name: '北京' },
  { lat: 31, name: '上海' },
  { lat: 23, name: '广州' },
  { lat: 0, name: '赤道' },
  { lat: -6, name: '雅加达' },
  { lat: -23, name: '圣保罗' },
  { lat: -34, name: '悉尼' },
  { lat: -43, name: '霍巴特' },
  { lat: -66.5, name: '南极圈' },
  { lat: -90, name: '南极' },
]

const seasons = [
  { dec: 23.44, id: 'summer', name: '夏至' },
  { dec: 11.72, id: 'liqiu', name: '立秋' },
  { dec: 0, id: 'equinox', name: '秋分' },
  { dec: -11.72, id: 'lidong', name: '立冬' },
  { dec: -23.44, id: 'winter', name: '冬至' },
  { dec: 11.72, id: 'lichun', name: '立春' },
  { dec: 0, id: 'chunfen', name: '春分' },
  { dec: 11.72, id: 'lixia', name: '立夏' },
]

const seasonDates: Record<string, string> = {
  summer: '2026-06-21', liqiu: '2026-08-07', equinox: '2026-09-23',
  lidong: '2026-11-07', winter: '2026-12-22', lichun: '2026-02-04',
  chunfen: '2026-03-20', lixia: '2026-05-06',
}

const seasonNames: Record<string, string> = {
  summer: '夏至', liqiu: '立秋', equinox: '秋分', lidong: '立冬',
  winter: '冬至', lichun: '立春', chunfen: '春分', lixia: '立夏',
}

const views = [
  { id: 'south', name: '正南' },
  { id: 'north', name: '正北' },
  { id: 'east', name: '正东' },
  { id: 'west', name: '正西' },
  { id: 'top', name: '俯瞰' },
  { id: 'free', name: '自由' },
]

// --- 核心状态 ---
const currentLatitude = ref(40)
const currentDeclination = ref(23.44)
const currentHourAngle = ref(0)
const currentSeasonName = ref('夏至')
const currentDate = ref('2026-06-21')
const activeCity = ref('北京')
const activeSeason = ref('summer')
const activeView = ref('free')
const isAnimating = ref(false)
const animSpeed = ref(5)

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

const hasLeftPanel = true
const dataCardCollapsed = ref(false)

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

  leftCollapsed,
  allPanelsCollapsed,

  draggingSide,
  viewportResizing,

  workspaceAttrs,
  leftPanelAttrs,

  leftResizeAttrs,

  leftCollapseAttrs,

  leftEntryAttrs,

  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
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
const currentSunHeight = computed(() => Math.asin(Math.max(-1, Math.min(1, calcSinH.value))) * 180 / Math.PI)

const timeDisplay = computed(() => {
  const time = 12 + currentHourAngle.value / 15
  const t = time < 0 ? time + 24 : time
  const hours = Math.floor(t)
  const mins = Math.round((t - hours) * 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} (时角${currentHourAngle.value.toFixed(2)}°)`
})

const solarTimeStr = computed(() => {
  const time = 12 + currentHourAngle.value / 15
  const t = time < 0 ? time + 24 : time
  const hours = Math.floor(t)
  const mins = Math.round((t - hours) * 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
})

const monthDayDisplay = computed(() => {
  const parts = currentDate.value.split('-')
  return `${parseInt(parts[1]!)}月${parseInt(parts[2]!)}日`
})

const currentDayOfYear = computed(() => {
  const date = new Date(currentDate.value)
  return getDayOfYear(date)
})

const riseDir = computed(() => {
  if (currentDeclination.value > 0) return '东北'
  if (currentDeclination.value < 0) return '东南'
  return '正东'
})

const setDir = computed(() => {
  if (currentDeclination.value > 0) return '西北'
  if (currentDeclination.value < 0) return '西南'
  return '正西'
})

const polarStatus = computed(() => {
  const tanProd = -Math.tan(latRad.value) * Math.tan(decRad.value)
  if (tanProd < -1) return '极昼'
  if (tanProd > 1) return '极夜'
  return '无'
})

const currentViewName = computed(() => {
  return views.find((item) => item.id === activeView.value)?.name || '自由'
})


const dayLen = computed(() => {
  const tanProd = -Math.tan(latRad.value) * Math.tan(decRad.value)
  if (Math.abs(tanProd) <= 1) {
    const halfDayAngle = Math.acos(tanProd) * 180 / Math.PI
    const dayHours = 2 * halfDayAngle / 15
    const h = Math.floor(dayHours)
    const m = Math.round((dayHours - h) * 60)
    return `${h}h ${m}m`
  } else if (tanProd < -1) {
    return '24h (极昼)'
  } else {
    return '0h (极夜)'
  }
})

const sunDataCards = computed(() => [
  {
    label: '观测纬度 φ',
    value: latDisplay.value,
    description: '当前观测点纬度',
    className: 'cyan-card',
  },
  {
    label: '直射纬度 δ',
    value:
      Math.abs(currentDeclination.value).toFixed(2) +
      decHemisphereUnit.value,
    description: decHemisphere.value,
    className: 'blue-card',
  },
  {
    label: '当前节气',
    value: currentSeasonName.value,
    description: monthDayDisplay.value,
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
    description: 'H正午 = 90° - |φ - δ|',
    className: 'cyan-card',
  },
  {
    label: '当前太阳高度',
    value:
      currentSunHeight.value.toFixed(2) +
      '°',
    description: '随地方太阳时变化',
    className: 'blue-card',
  },
  {
    label: '日出 / 日落',
    value:
      riseDir.value +
      ' / ' +
      setDir.value,
    description: '二分日为正东正西',
    className: 'purple-card',
  },
  {
    label: '昼长',
    value: dayLen.value,
    description: polarStatus.value,
    className: 'orange-card',
  },
])

const lectureText = computed(() => {
  const lat = currentLatitude.value
  const dec = currentDeclination.value
  const nH = noonHeight.value
  if (lat === 90) {
    return `📌 <b>北极点特例：</b>太阳在地平圈上平行转动！出现<b>极昼</b>。正午太阳高度 ${nH.toFixed(1)}°`
  } else if (lat === -90) {
    return `📌 <b>南极点特例：</b>太阳在地平圈上平行转动！${dec > 0 ? '出现<b>极夜</b>' : '出现<b>极昼</b>'}。正午太阳高度 ${nH.toFixed(1)}°`
  } else if (lat === 0 && dec === 0) {
    return `📌 <b>赤道二分日：</b>太阳<b>正东</b>升<b>正西</b>落，正午高度<b>90°</b>（天顶直射）`
  } else {
    let riseSet = ''
    if (dec > 0) riseSet = '<b>东北</b>升起，<b>西北</b>落下'
    else if (dec < 0) riseSet = '<b>东南</b>升起，<b>西南</b>落下'
    else riseSet = '<b>正东</b>升起，<b>正西</b>落下'
    let sunDir = ''
    if (lat > dec) sunDir = '正午太阳在<b>正南</b>天空'
    else if (lat < dec) sunDir = '正午太阳在<b>正北</b>天空'
    else sunDir = '正午太阳在<b>天顶</b>附近'
    return `📍 纬度：${latDisplay.value}<br>🌅 ${riseSet}<br>☀️ 正午高度：${nH.toFixed(1)}°<br>🧭 ${sunDir}`
  }
})

const mistakes = computed(() => {
  const lat = currentLatitude.value
  const dec = currentDeclination.value
  const result: Array<{ wrong: string; correct: string; explain: string }> = []
  result.push({ wrong: 'H = 90° - φ + δ', correct: 'H = 90° - |φ - δ|', explain: '正午太阳高度 = 90°减纬度差绝对值，不是简单加减！' })
  if (dec > 0) result.push({ wrong: '夏至太阳直射南半球', correct: '夏至直射23.5°N（北半球）', explain: '太阳直射点始终在23.5°S~23.5°N间移动！' })
  else if (dec < 0) result.push({ wrong: '冬至直射北半球', correct: '冬至直射23.5°S（南半球）', explain: '冬至时直射点移至南半球最南端！' })
  if (lat > dec) result.push({ wrong: '正午太阳在正北天空', correct: '观测纬度>直射纬度时，正午太阳在正南', explain: '观测点比直射点更远离赤道时，正午太阳偏向赤道方向！' })
  else if (lat < dec) result.push({ wrong: '正午太阳在正南天空', correct: '观测纬度<直射纬度时，正午太阳在正北', explain: '观测点比直射点更靠近赤道时，正午太阳偏向极方！' })
  if (dec !== 0) result.push({ wrong: '太阳永远正东升正西落', correct: dec > 0 ? '东北升、西北落' : '东南升、西南落', explain: '只有二分日才正东升正西落！' })
  if (lat >= 66.5) {
    if (dec > 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°N 夏至极昼', explain: '极昼极夜临界纬度 = 90° - |δ|！' })
    else if (dec < 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°N 冬至极夜', explain: '冬至时66.5°N以北极夜！' })
  }
  if (lat <= -66.5) {
    if (dec < 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°S 冬至极昼', explain: '南半球极昼极夜与北半球相反！' })
    else if (dec > 0) result.push({ wrong: '高纬度昼夜不变', correct: '≥66.5°S 夏至极夜', explain: '北半球夏至时南极高纬极夜！' })
  }
  if (lat === 0) result.push({ wrong: '赤道永远正东升正西落', correct: '赤道仅二分日正东升正西落', explain: '日出方位仍受直射纬度影响！' })
  return result
})

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
let sunMesh: THREE.Mesh | null = null
let currentSunMarker: THREE.Mesh | null = null
let sunGlowSprite: THREE.Sprite | null = null
let curSunGlowSprite: THREE.Sprite | null = null
let sunPointLight: THREE.PointLight | null = null
let flagpoleGroup: THREE.Group | null = null
let sunriseLabel: THREE.Sprite | null = null
let sunsetLabel: THREE.Sprite | null = null
let undergroundPath: THREE.Group | null = null
let flagShaderMat: THREE.ShaderMaterial | null = null
let animFrameId = 0
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

function calculateSunPosition(latDeg: number, decDeg: number, hourAngleDeg: number) {
  const lat = latDeg * Math.PI / 180
  const dec = decDeg * Math.PI / 180
  const h = hourAngleDeg * Math.PI / 180
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const cosAlt = Math.cos(alt)
  const R = 8
  let az = 0

  // 极地特判：cos(lat)≈0 时方位角公式除零失效，直接用时角作为方位角
  // 北极：太阳在恒定高度绕天顶旋转，方位角即时角
  if (Math.abs(Math.cos(lat)) < 0.01) {
    if (h <= 0) {
      az = -h // 上午：0→π
    } else {
      az = Math.PI * 2 - h // 下午：2π→π
    }
  } else if (cosAlt > 0.001) {
    const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt)
    az = Math.acos(Math.max(-1, Math.min(1, cosAz)))
    if (Math.sin(h) > 0) az = Math.PI * 2 - az
  }

  return {
    x: R * cosAlt * Math.sin(az),
    y: R * sinAlt,
    z: R * cosAlt * Math.cos(az),
    alt: alt * 180 / Math.PI,
    azDeg: az * 180 / Math.PI,
  }
}

function drawSunPath() {
  if (pathLine) { scene.remove(pathLine); pathLine = null }
  if (sunMesh) { scene.remove(sunMesh); sunMesh = null }
  if (currentSunMarker) { scene.remove(currentSunMarker); currentSunMarker = null }
  if (sunGlowSprite) { scene.remove(sunGlowSprite); sunGlowSprite = null }
  if (curSunGlowSprite) { scene.remove(curSunGlowSprite); curSunGlowSprite = null }
  if (sunPointLight) { scene.remove(sunPointLight); sunPointLight = null }
  if (sunriseLabel) { scene.remove(sunriseLabel); sunriseLabel = null }
  if (sunsetLabel) { scene.remove(sunsetLabel); sunsetLabel = null }
  if (undergroundPath) { scene.remove(undergroundPath); undergroundPath = null }

  // 生成太阳外发光纹理
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 256
  glowCanvas.height = 256
  const glowCtx = glowCanvas.getContext('2d')!
  const gradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,210,0,0.9)')
  gradient.addColorStop(0.15, 'rgba(255,190,0,0.7)')
  gradient.addColorStop(0.3, 'rgba(255,165,0,0.5)')
  gradient.addColorStop(0.5, 'rgba(255,130,0,0.3)')
  gradient.addColorStop(0.7, 'rgba(255,90,0,0.15)')
  gradient.addColorStop(1, 'rgba(255,40,0,0.0)')
  glowCtx.fillStyle = gradient
  glowCtx.fillRect(0, 0, 256, 256)
  const glowTexture = new THREE.CanvasTexture(glowCanvas)

  const makeGlowSprite = (scale: number) => {
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(scale, scale, 1)
    return sprite
  }

  // 收集所有轨迹点（含地表以下）
  const allPoints: THREE.Vector3[] = []
  const abovePoints: THREE.Vector3[] = []
  for (let h = -180; h <= 180; h += 1) {
    const pos = calculateSunPosition(currentLatitude.value, currentDeclination.value, h)
    const p = new THREE.Vector3(pos.x, pos.y, pos.z)
    allPoints.push(p)
    if (pos.y >= -0.1) abovePoints.push(p.clone())
  }

  // 地下轨迹（半透明管道，区分于地上实线）
  if (showPath.value && allPoints.length > 2) {
    const belowPoints: THREE.Vector3[] = []
    for (const p of allPoints) {
      if (p.y < -0.1) belowPoints.push(p)
    }
    if (belowPoints.length > 2) {
      const belowCurve = new THREE.CatmullRomCurve3(belowPoints, false, 'centripetal', 0)
      const belowTube = new THREE.TubeGeometry(belowCurve, 80, 0.02, 6, false)
      const belowMat = new THREE.MeshBasicMaterial({ color: 0x8a7a4a, transparent: true, opacity: 0.35 })
      undergroundPath = new THREE.Group()
      undergroundPath.add(new THREE.Mesh(belowTube, belowMat))
      scene.add(undergroundPath)
    }
  }

  if (showPath.value && abovePoints.length > 2) {
    // 检测是否为闭合环（极昼路径：首尾点接近）
    const first = abovePoints[0]!
    const last = abovePoints[abovePoints.length - 1]!
    const isClosedLoop = Math.abs(first.x - last.x) < 0.1 && Math.abs(first.z - last.z) < 0.1 && Math.abs(first.y - last.y) < 0.1
    // 闭合环时去掉重复的尾点，使用 closed=true
    const curvePoints = isClosedLoop ? abovePoints.slice(0, -1) : abovePoints
    const curve = new THREE.CatmullRomCurve3(curvePoints, isClosedLoop, 'catmullrom', isClosedLoop ? 0 : 0.3)
    const tubeGeo = new THREE.TubeGeometry(curve, isClosedLoop ? 200 : 150, 0.025, 8, isClosedLoop)
    const mat = new THREE.MeshBasicMaterial({ color: 0xe4d28b })
    pathLine = new THREE.Mesh(tubeGeo, mat)
    scene.add(pathLine)

    // 日出日落标记（非闭合环时）
    if (!isClosedLoop) {
      const makeSunLabel = (text: string, pos: THREE.Vector3) => {
        const c = document.createElement('canvas')
        c.width = 160
        c.height = 64
        const cx = c.getContext('2d')!
        cx.font = 'bold 32px Arial'
        cx.fillStyle = '#ffd000'
        cx.strokeStyle = '#000'
        cx.lineWidth = 4
        cx.textAlign = 'center'
        cx.textBaseline = 'middle'
        cx.strokeText(text, 80, 32)
        cx.fillText(text, 80, 32)
        const tex = new THREE.CanvasTexture(c)
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
        sp.scale.set(1.5, 0.6, 1)
        sp.position.copy(pos)
        sp.position.y += 0.5
        return sp
      }
      sunriseLabel = makeSunLabel('日出', first)
      scene.add(sunriseLabel)
      sunsetLabel = makeSunLabel('日落', last)
      scene.add(sunsetLabel)
    }
  }

  // 当前时刻太阳标记：真实发光体 + 外发光 + 点光源
  const curPos = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  {
    const markerGeo = new THREE.SphereGeometry(0.35, 32, 32)
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffb800 })
    currentSunMarker = new THREE.Mesh(markerGeo, markerMat)
    currentSunMarker.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(currentSunMarker)

    curSunGlowSprite = makeGlowSprite(3.5)
    curSunGlowSprite.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(curSunGlowSprite)

    // 太阳点光源
    sunPointLight = new THREE.PointLight(0xfff0d0, 1.5, 20, 1.5)
    sunPointLight.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(sunPointLight)
  }

  // 光源跟随太阳
  const sunLightPos = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  if (showShadows.value && sunLightPos.y > 0) {
    const lightScale = 1.8
    dirLight.position.set(sunLightPos.x * lightScale, sunLightPos.y * lightScale, sunLightPos.z * lightScale)
    dirLight.intensity = 0.8 + (sunLightPos.y / 8) * 0.8
    renderer.shadowMap.enabled = true
  } else {
    dirLight.position.set(0, 0.5, 5)
    dirLight.intensity = 0.3
    renderer.shadowMap.enabled = showShadows.value
  }

  // 旗杆太阳高度角演示：太阳光线、地面阴影、角度弧线、标注
  updateFlagpoleAngle(curPos)

  updateSkyBackground()
}

function updateFlagpoleAngle(curPos: { x: number; y: number; z: number; alt: number; azDeg: number }) {
  if (!flagpoleGroup) return
  // 清除上次的线条/弧线/标注
  for (let i = flagpoleGroup.children.length - 1; i >= 0; i--) {
    const child = flagpoleGroup.children[i]!
    if ((child as any)._isDynamic) flagpoleGroup.remove(child)
  }

  const sunPos = new THREE.Vector3(curPos.x, curPos.y, curPos.z)
  const horizDir = new THREE.Vector3(curPos.x, 0, curPos.z)
  if (horizDir.length() < 0.01) return
  horizDir.normalize()
  // 太阳在地平线以下时不显示
  if (curPos.y < -0.05) return

  const rayMat = new THREE.MeshBasicMaterial({ color: 0xe4d28b })
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xe4d28b })

  const altRad = Math.max(curPos.alt * Math.PI / 180, 0.5 * Math.PI / 180)
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
  labelCanvas.width = 256
  labelCanvas.height = 64
  const lctx = labelCanvas.getContext('2d')!
  lctx.fillStyle = 'rgba(0,0,0,0)'
  lctx.fillRect(0, 0, 256, 64)
  lctx.font = 'bold 28px sans-serif'
  lctx.fillStyle = '#e4d28b'
  lctx.strokeStyle = '#000000'
  lctx.lineWidth = 4
  const text = `太阳高度角 ${curPos.alt.toFixed(1)}°`
  lctx.strokeText(text, 8, 42)
  lctx.fillText(text, 8, 42)
  const labelTex = new THREE.CanvasTexture(labelCanvas)
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false })
  const labelSprite = new THREE.Sprite(labelMat)
  labelSprite.scale.set(1.6, 0.4, 1)
  // 放在弧线中点上方
  const midAngle = altRad * 0.5
  const labelPos = center.clone()
    .add(horizDir.clone().multiplyScalar(Math.cos(midAngle) * (arcRadius + 0.3)))
    .add(up.clone().multiplyScalar(Math.sin(midAngle) * (arcRadius + 0.3)))
  labelSprite.position.copy(labelPos)
    ; (labelSprite as any)._isDynamic = true
  flagpoleGroup.add(labelSprite)
}

// --- 动态天空背景（委托给外部模块，避免Vue SFC编译器干扰） ---
function updateSkyBackground() {
  applySky(
    currentSunHeight.value,
    polarStatus.value === '极昼',
    polarStatus.value === '极夜',
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

function updateLatitude(val: string) {
  currentLatitude.value = parseFloat(val)
  activeCity.value = ''
  drawSunPath()
}

function updateHourAngle(val: number) {
  currentHourAngle.value = val
  drawSunPath()
}

function setSeason(dec: number, seasonId: string) {
  currentDeclination.value = dec
  currentSeasonName.value = seasonNames[seasonId] || '自定义'
  activeSeason.value = seasonId
  currentDate.value = seasonDates[seasonId] || currentDate.value
  drawSunPath()
}

function setDate(dateStr: string) {
  const date = new Date(dateStr)
  const dayOfYear = getDayOfYear(date)
  const dec = 23.44 * Math.sin((360 / 365) * (dayOfYear + 284) * Math.PI / 180)
  currentDeclination.value = Math.round(dec * 100) / 100
  currentSeasonName.value = getClosestSeason(dayOfYear)
  activeSeason.value = ''
  drawSunPath()
}

function updateDayOfYear(day: number) {
  const year = 2026
  const date = new Date(year, 0, day)
  const dateStr = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  currentDate.value = dateStr
  const dec = 23.44 * Math.sin((360 / 365) * (day + 284) * Math.PI / 180)
  currentDeclination.value = Math.round(dec * 100) / 100
  currentSeasonName.value = getClosestSeason(day)
  activeSeason.value = ''
  drawSunPath()
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getClosestSeason(dayOfYear: number): string {
  const seasonDays = [
    { day: 172, name: '夏至' }, { day: 220, name: '立秋' }, { day: 266, name: '秋分' },
    { day: 311, name: '立冬' }, { day: 356, name: '冬至' }, { day: 35, name: '立春' },
    { day: 80, name: '春分' }, { day: 126, name: '立夏' },
  ]
  let closest = seasonDays[0]!
  let minDiff = 999
  for (const s of seasonDays) {
    const diff = Math.abs(dayOfYear - s.day)
    if (diff < minDiff) { minDiff = diff; closest = s }
  }
  return closest.name
}

// --- 动画控制 ---
function toggleAnimation() {
  isAnimating.value = !isAnimating.value
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

// 面板交互由 useGeoPanelLayout 统一管理。

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
  const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
  const duration = 800
  const startTime = Date.now()
  function step() {
    const elapsed = Date.now() - startTime
    const t = Math.min(elapsed / duration, 1)
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    camera.position.set(
      startPos.x + (targetPos.x - startPos.x) * ease,
      startPos.y + (targetPos.y - startPos.y) * ease,
      startPos.z + (targetPos.z - startPos.z) * ease,
    )
    controls.target.copy(lookTarget)
    controls.update()
    if (t < 1) requestAnimationFrame(step)
  }
  step()
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
  const buildingStyles = [makeBox, makeStepped, makeCylinder, makeLShape, makeSlantRoof, makeTwin]

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
        const mat = pickMat(cfg.type)
        const styleFn = buildingStyles[Math.floor(Math.random() * buildingStyles.length)]!
        if (styleFn === makeCylinder) {
          styleFn(Math.min(w, d) * 0.5, h, mat, x, z)
        } else {
          styleFn(w, h, d, mat, x, z)
        }
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
function animate() {
  animFrameId = requestAnimationFrame(animate)

  if (isAnimating.value) {
    currentHourAngle.value += animSpeed.value * 0.15
    if (currentHourAngle.value > 180) currentHourAngle.value = -180
    drawSunPath()
  }

  if (flagShaderMat) {
    flagShaderMat.uniforms.uTime.value += 0.04
  }

  controls.update()
  renderer.render(scene, camera)
}

// --- Three.js 容器 resize ---
function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
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

onMounted(() => {
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

  controls?.dispose()

  if (renderer) {
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
</style>
