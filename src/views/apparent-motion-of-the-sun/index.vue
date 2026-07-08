<template>
  <!-- Three.js 3D 场景容器 -->
  <div id="three-container"></div>
  <!-- 左侧：控制面板 -->
  <div id="left-panel" class="side-panel" :class="{ collapsed: leftCollapsed }" :style="{ width: leftCollapsed ? '32px' : leftPanelWidth + 'px' }">
    <div class="resize-handle resize-right" v-show="!leftCollapsed" @mousedown.prevent="startResize('left')"></div>
    <button class="collapse-btn collapse-btn-right" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开' : '收起'">
      <el-icon><ArrowRight v-if="leftCollapsed" /><ArrowLeft v-else /></el-icon>
    </button>
    <div v-show="!leftCollapsed" class="panel-content">
    <h2 class="panel-title">☀️ 太阳视运动交互模型</h2>

    <!-- 1. 位置预设 -->
    <div class="control-group">
      <label>📍 观测位置</label>
      <div class="btn-group">
        <button
          v-for="city in cities"
          :key="city.name"
          class="btn btn-city"
          :class="{ active: activeCity === city.name }"
          @click="setLocation(city.lat, city.name)"
        >
          {{ city.name }}
        </button>
      </div>
      <label>纬度微调: <span style="color:#2ec4b6;">{{ latDisplay }}</span></label>
      <input type="range" id="latRange" min="-90" max="90" step="0.5" :value="currentLatitude" @input="updateLatitude(($event.target as HTMLInputElement).value)">
      <div style="display:flex; justify-content: space-between; font-size:11px; color:#64748b; margin-top:2px;">
        <span>90°S</span><span>66.5°S</span><span>23.5°S</span><span>0°</span><span>23.5°N</span><span>66.5°N</span><span>90°N</span>
      </div>
    </div>

    <!-- 2. 节气 + 日期联动 -->
    <div class="control-group">
      <label>🌱 节气 / 日期 (直射纬度 δ)</label>
      <div class="btn-group">
        <button
          v-for="s in seasons"
          :key="s.id"
          class="btn btn-season"
          :class="{ active: activeSeason === s.id }"
          @click="setSeason(s.dec, s.id)"
        >
          {{ s.name }}
        </button>
      </div>
      <label>自定义日期：第 {{ currentDayOfYear }} 天 ({{ monthDayDisplay }})</label>
      <input type="range" min="1" max="365" step="1" :value="currentDayOfYear" @input="updateDayOfYear(parseInt(($event.target as HTMLInputElement).value))">
      <div style="font-size:12px; color:#f59e0b; margin-top:4px;">
        直射纬度 δ = {{ currentDeclination.toFixed(2) }}°
        <span style="color:#94a3b8;">({{ decHemisphere }})</span>
      </div>
    </div>

    <!-- 3. 地方太阳时 + 动画 -->
    <div class="control-group">
      <label>🕐 地方太阳时: <span style="color:#f59e0b;">{{ timeDisplay }}</span></label>
      <input type="range" id="hourRange" min="-180" max="180" step="1" :value="currentHourAngle" @input="updateHourAngle(parseInt(($event.target as HTMLInputElement).value))">
      <div style="display:flex; justify-content: space-between; font-size:11px; color:#64748b; margin-top:2px;">
        <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
      <div class="anim-controls">
        <button class="anim-btn" :class="{ playing: isAnimating }" @click="toggleAnimation">
          {{ isAnimating ? '⏸ 暂停' : '▶ 播放' }}
        </button>
        <label style="margin:0; font-size:12px;">速度:</label>
        <input type="range" min="1" max="20" :value="animSpeed" style="width:80px;" @input="updateSpeed(parseInt(($event.target as HTMLInputElement).value))">
        <span style="color:#f59e0b; font-size:12px;">{{ animSpeed }}x</span>
      </div>
    </div>

    <!-- 4. 视角预设 -->
    <div class="control-group">
      <label>🎥 视角切换</label>
      <div class="btn-group">
        <button
          v-for="v in views"
          :key="v.id"
          class="btn btn-view"
          :class="{ active: activeView === v.id }"
          @click="setView(v.id)"
        >
          {{ v.name }}
        </button>
      </div>
    </div>

    <!-- 5. 场景元素开关 -->
    <div class="control-group">
      <label>🎨 场景元素</label>
      <div class="toggle-row"><el-switch v-model="showDome" size="small" /> 天穹半球</div>
      <div class="toggle-row"><el-switch v-model="showBuildings" size="small" /> 城市建筑群</div>
      <div class="toggle-row"><el-switch v-model="showShadows" size="small" /> 科学阴影</div>
      <div class="toggle-row"><el-switch v-model="showGrid" size="small" /> 方位线</div>
      <div class="toggle-row"><el-switch v-model="showPath" size="small" /> 轨迹线</div>
    </div>

    <hr class="section-divider">

    <!-- 视运动规律观察 -->
    <div id="info-panel">
      <strong>📊 视运动规律：</strong>
      <div v-html="lectureText"></div>
      <div style="margin-top:6px; font-size:11px; color:#64748b;">🏙️ <b style="color:#c8a87c;">金茂</b>·<b style="color:#8899aa;">环球</b>·<b style="color:#4a90d9;">上海中心</b>·<b style="color:#e860a0;">东方明珠</b> + 周边建筑，☀️发光球=当前太阳位置</div>
    </div>
    </div>
  </div>

  <!-- 右侧：数据面板 + 知识点 -->
  <div id="right-panel" class="side-panel" :class="{ collapsed: rightCollapsed }" :style="{ width: rightCollapsed ? '32px' : rightPanelWidth + 'px' }">
    <div class="resize-handle resize-left" v-show="!rightCollapsed" @mousedown.prevent="startResize('right')"></div>
    <button class="collapse-btn collapse-btn-left" @click="rightCollapsed = !rightCollapsed" :title="rightCollapsed ? '展开' : '收起'">
      <el-icon><ArrowLeft v-if="rightCollapsed" /><ArrowRight v-else /></el-icon>
    </button>
    <div v-show="!rightCollapsed" class="panel-content">
    <!-- 数据卡片网格 -->
    <div id="params-panel">
      <strong>📋 实时数据</strong>
      <div class="card-grid">
        <div class="data-card">
          <div class="data-card-label">观测纬度 φ</div>
          <div class="data-card-value">{{ latDisplay }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">直射纬度 δ</div>
          <div class="data-card-value">{{ Math.abs(currentDeclination).toFixed(2) }}{{ decHemisphereUnit }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">当前节气</div>
          <div class="data-card-value">{{ currentSeasonName }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">当前日期</div>
          <div class="data-card-value">{{ monthDayDisplay }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">地方太阳时</div>
          <div class="data-card-value">{{ solarTimeStr }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">时角 ω</div>
          <div class="data-card-value">{{ currentHourAngle }}°</div>
        </div>
        <div class="data-card highlight">
          <div class="data-card-label">正午太阳高度</div>
          <div class="data-card-value">{{ noonHeight.toFixed(2) }}°</div>
        </div>
        <div class="data-card highlight">
          <div class="data-card-label">当前太阳高度</div>
          <div class="data-card-value">{{ currentSunHeight.toFixed(2) }}°</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">日出方位</div>
          <div class="data-card-value">{{ riseDir }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">日落方位</div>
          <div class="data-card-value">{{ setDir }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">昼长</div>
          <div class="data-card-value">{{ dayLen }}</div>
        </div>
        <div class="data-card">
          <div class="data-card-label">极昼/极夜</div>
          <div class="data-card-value">{{ polarStatus }}</div>
        </div>
      </div>
    </div>

    <!-- 实时计算面板 -->
    <div id="calc-panel">
      <strong>📐 实时太阳高度角计算：</strong>
      <div class="formula">H<sub>正午</sub> = 90° - |φ - δ|</div>
      <div class="step">φ（观测纬度）= {{ latDisplay }}</div>
      <div class="step">δ（直射纬度）= {{ currentDeclination.toFixed(2) }}°</div>
      <div class="step">|φ - δ| = |{{ (currentLatitude - currentDeclination).toFixed(2) }}| = {{ Math.abs(currentLatitude - currentDeclination).toFixed(2) }}°</div>
      <div class="result">正午太阳高度 H = 90° - {{ Math.abs(currentLatitude - currentDeclination).toFixed(2) }}° = {{ noonHeight.toFixed(2) }}°</div>
      <hr style="border-color:#475569; margin:8px 0;">
      <div class="step" style="color:#94a3b8;">任意时刻太阳高度（时角法）：</div>
      <div class="formula">sinH = sinφ·sinδ + cosφ·cosδ·cosω</div>
      <div class="step">ω（时角）= {{ currentHourAngle }}°</div>
      <div class="step">sinφ·sinδ = {{ calcTerm1.toFixed(3) }}</div>
      <div class="step">cosφ·cosδ·cosω = {{ calcTerm2.toFixed(3) }}</div>
      <div class="step">sinH = {{ calcTerm1.toFixed(3) }} + {{ calcTerm2.toFixed(3) }} = {{ calcSinH.toFixed(3) }}</div>
      <div class="result">当前太阳高度 H = {{ currentSunHeight.toFixed(2) }}°</div>
    </div>

    <!-- 易错点 -->
    <div id="mistakes-panel">
      <h3>⚠️ 易错点提醒</h3>
      <div v-for="(m, i) in mistakes" :key="i" class="mistake-item">
        <span class="wrong">❌ {{ m.wrong }}</span> → <span class="correct">✅ {{ m.correct }}</span><br>
        <span style="color:#94a3b8;">💡 {{ m.explain }}</span>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ElSwitch, ElIcon } from 'element-plus'

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
    skyTop = lerpColor(S.nightTop, S.dawnTop, t); skyMid = lerpColor(S.nightMid, S.dawnMid, t); skyHorizon = lerpColor(S.nightHorizon, S.dawnHorizon, t)
    groundMid = lerpColor(S.nightGround, S.dawnGround, t); groundDark = lerpColor([10, 15, 6], S.nightGround, t)
    ambColor = lerpColor([15, 25, 55], [40, 50, 90], t); ambInt = 0.3 + t * 0.3
    hSky = lerpColor([20, 35, 65], [50, 60, 100], t); hGround = lerpColor(S.nightGround, S.dawnGround, t); hInt = 0.25 + t * 0.3
    groundColor = lerpColor([18, 28, 14], [30, 45, 20], t)
  } else if (sunH < 0) {
    const t = (sunH + 6) / 6
    skyTop = lerpColor(S.dawnTop, S.sunriseTop, t); skyMid = lerpColor(S.dawnMid, S.sunriseMid, t); skyHorizon = lerpColor(S.dawnHorizon, S.sunriseHorizon, t)
    groundMid = lerpColor(S.dawnGround, S.dayGround, t * 0.4); groundDark = lerpColor(S.nightGround, S.dawnGround, t * 0.5)
    ambColor = lerpColor([40, 50, 90], [100, 140, 200], t); ambInt = 0.6 + t * 0.5
    hSky = lerpColor([50, 60, 100], [130, 160, 210], t); hGround = lerpColor(S.dawnGround, S.dayGround, t * 0.5); hInt = 0.55 + t * 0.5
    groundColor = lerpColor([30, 45, 20], [50, 100, 40], t)
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
  ambientLight.intensity = ambInt

  setColor(hemiLight.color, hSky)
  setColor(hemiLight.groundColor, hGround)
  hemiLight.intensity = hInt

  setColor(groundMaterial.color, groundColor)
}
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/icon/style/css'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

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

// 面板宽度（可拖拽调整）
const leftPanelWidth = ref(260)
const rightPanelWidth = ref(260)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

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
let pathLine: THREE.Line | null = null
let sunMesh: THREE.Mesh | null = null
let currentSunMarker: THREE.Mesh | null = null
let sunGlowSprite: THREE.Sprite | null = null
let curSunGlowSprite: THREE.Sprite | null = null
let sunPointLight: THREE.PointLight | null = null
let animFrameId = 0
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

  // 生成太阳外发光纹理
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 256
  glowCanvas.height = 256
  const glowCtx = glowCanvas.getContext('2d')!
  const gradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,240,180,1.0)')
  gradient.addColorStop(0.15, 'rgba(255,220,100,0.9)')
  gradient.addColorStop(0.3, 'rgba(255,180,50,0.5)')
  gradient.addColorStop(0.5, 'rgba(255,140,20,0.25)')
  gradient.addColorStop(0.7, 'rgba(255,100,0,0.08)')
  gradient.addColorStop(1, 'rgba(255,60,0,0.0)')
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

  const points: THREE.Vector3[] = []
  for (let h = -180; h <= 180; h += 1) {
    const pos = calculateSunPosition(currentLatitude.value, currentDeclination.value, h)
    if (pos.y >= -0.1) points.push(new THREE.Vector3(pos.x, pos.y, pos.z))
  }

  if (showPath.value && points.length > 2) {
    // 检测是否为闭合环（极昼路径：首尾点接近）
    const first = points[0]!
    const last = points[points.length - 1]!
    const isClosedLoop = Math.abs(first.x - last.x) < 0.1 && Math.abs(first.z - last.z) < 0.1 && Math.abs(first.y - last.y) < 0.1
    // 闭合环时去掉重复的尾点，使用 closed=true
    const curvePoints = isClosedLoop ? points.slice(0, -1) : points
    const curve = new THREE.CatmullRomCurve3(curvePoints, isClosedLoop, 'catmullrom', isClosedLoop ? 0 : 0.3)
    const smoothPoints = curve.getPoints(isClosedLoop ? 500 : 300)
    const geo = new THREE.BufferGeometry().setFromPoints(smoothPoints)
    const color = currentDeclination.value > 0 ? 0xf59e0b : (currentDeclination.value < 0 ? 0x3b82f6 : 0x10b981)
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 3 })
    pathLine = new THREE.Line(geo, mat)
    scene.add(pathLine)
  }

  // 当前时刻太阳标记：真实发光体 + 外发光 + 点光源
  const curPos = calculateSunPosition(currentLatitude.value, currentDeclination.value, currentHourAngle.value)
  if (curPos.y >= -0.1) {
    const markerGeo = new THREE.SphereGeometry(0.35, 32, 32)
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc40 })
    currentSunMarker = new THREE.Mesh(markerGeo, markerMat)
    currentSunMarker.position.set(curPos.x, curPos.y, curPos.z)
    scene.add(currentSunMarker)

    curSunGlowSprite = makeGlowSprite(5.0)
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
  updateSkyBackground()
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
  // 建筑窗户夜间亮灯：太阳低于0°时逐渐亮起，低于-6°完全亮
  if (windowMatRef) {
    const sunH = currentSunHeight.value
    if (sunH > 0) {
      windowMatRef.color.setRGB(0.1, 0.19, 0.25) // 白天：深蓝灰
    } else {
      const t = Math.min(-sunH / 6, 1) // 0~1，太阳越低越亮
      const r = 0.1 + (1.0 - 0.1) * t   // → 暖黄
      const g = 0.19 + (0.85 - 0.19) * t
      const b = 0.25 + (0.4 - 0.25) * t
      windowMatRef.color.setRGB(r, g, b)
    }
  }
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

// --- 面板拖拽调整宽度 ---
function startResize(side: 'left' | 'right') {
  const onMove = (e: MouseEvent) => {
    if (side === 'left') {
      leftPanelWidth.value = Math.max(200, Math.min(500, e.clientX - 10))
    } else {
      rightPanelWidth.value = Math.max(200, Math.min(500, window.innerWidth - e.clientX - 10))
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}


// --- 视角切换 ---
function setView(viewId: string) {
  activeView.value = viewId
  const target = new THREE.Vector3(0, 0, 0)
  let pos: { x: number; y: number; z: number }
  switch (viewId) {
    case 'south': pos = { x: 0, y: 8, z: 25 }; break
    case 'north': pos = { x: 0, y: 8, z: -25 }; break
    case 'east':  pos = { x: 25, y: 8, z: 0 }; break
    case 'west':  pos = { x: -25, y: 8, z: 0 }; break
    case 'top':   pos = { x: 0, y: 30, z: 0.1 }; break
    case 'free':  pos = { x: 15, y: 12, z: 20 }; break
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
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const container = document.getElementById('three-container')!
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
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.left = -12
  dirLight.shadow.camera.right = 12
  dirLight.shadow.camera.top = 12
  dirLight.shadow.camera.bottom = -12
  dirLight.shadow.bias = -0.001
  dirLight.position.set(5, 8, 5)
  dirLight.target.position.set(0, 0, 0)
  scene.add(dirLight)
  scene.add(dirLight.target)

  // 地平圈 - 亮绿色草地
  const horizonGeo = new THREE.CylinderGeometry(8, 8, 0.1, 64)
  const horizonMat = new THREE.MeshLambertMaterial({ color: 0x4a8a3a, transparent: true, opacity: 0.9 })
  horizonMeshRef = new THREE.Mesh(horizonGeo, horizonMat)
  horizonMeshRef.position.y = -0.05
  horizonMeshRef.receiveShadow = true
  scene.add(horizonMeshRef)

  // 方位线
  const createLine = (x1: number, z1: number, x2: number, z2: number, color: number) => {
    const mat = new THREE.LineBasicMaterial({ color })
    const points = [new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z2)]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geo, mat)
    scene.add(line)
    gridLines.push(line)
  }
  createLine(0, -8, 0, 8, 0xffffff)
  createLine(-8, 0, 8, 0, 0xffffff)
  createLine(0, 0, 0, -8.5, 0x8888ff)
  createLine(0, 0, 0, 8.5, 0x8888ff)
  createLine(0, 0, -8.5, 0, 0x8888ff)
  createLine(0, 0, 8.5, 0, 0x8888ff)

  // 东南西北方向标签
  const makeDirLabel = (text: string, color: string, x: number, z: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 128, 64)
    ctx.font = 'bold 36px Arial'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 32)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(1.2, 0.6, 1)
    sprite.position.set(x, 0.8, z)
    scene.add(sprite)
  }
  makeDirLabel('东 E', '#2ec4b6', 9.5, 0)
  makeDirLabel('南 S', '#2ec4b6', 0, 9.5)
  makeDirLabel('西 W', '#2ec4b6', -9.5, 0)
  makeDirLabel('北 N', '#2ec4b6', 0, -9.5)

  // 天穹半球 - 主题色
  const domeGeo = new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x2ec4b6, wireframe: true, transparent: true, opacity: 0.15 })
  dome = new THREE.Mesh(domeGeo, domeMat)
  scene.add(dome)

  // --- 城市建筑群 ---（陆家嘴三件套 + 紧凑真实建筑）
  const buildingGroup = new THREE.Group()

  // 建筑通用材质
  const concreteMat = new THREE.MeshPhongMaterial({ color: 0xd4d0c8, specular: 0x222222, shininess: 30 })
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x6a9fc0, specular: 0x888888, shininess: 120, transparent: true, opacity: 0.85 })
  const darkGlassMat = new THREE.MeshPhongMaterial({ color: 0x3a5570, specular: 0xaaaaaa, shininess: 100, transparent: true, opacity: 0.9 })
  const warmMat = new THREE.MeshPhongMaterial({ color: 0xc8a87c, specular: 0x333333, shininess: 60 })
  const steelMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, specular: 0x444444, shininess: 80 })
  const blueMat = new THREE.MeshPhongMaterial({ color: 0x4a90d9, specular: 0x666666, shininess: 90, transparent: true, opacity: 0.85 })
  const pinkMat = new THREE.MeshPhongMaterial({ color: 0xe860a0, specular: 0x888888, shininess: 80, transparent: true, opacity: 0.8 })
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x1a3040 })
  windowMatRef = windowMat
  const roofMat = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 20 })
  const lightConcreteMat = new THREE.MeshPhongMaterial({ color: 0xe8e4d8, specular: 0x222222, shininess: 25 })

  // 辅助函数：创建带窗户的紧凑建筑（四面窗）
  const makeBuilding = (w: number, h: number, d: number, mat: THREE.Material, x: number, z: number, addWindows = true) => {
    const group = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)
    // 屋顶边缘
    const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, d + 0.02), roofMat)
    roofEdge.position.y = h + 0.02
    group.add(roofEdge)
    if (addWindows) {
      const rows = Math.floor(h / 0.2)
      const colsW = Math.floor(w / 0.1)
      const colsD = Math.floor(d / 0.1)
      for (let r = 0; r < rows; r++) {
        const wy = 0.08 + r * 0.2
        if (wy > h - 0.08) break
        // 正面+背面窗户
        for (let c = 0; c < colsW; c++) {
          const wx = -w / 2 + 0.04 + c * 0.1
          if (wx > w / 2 - 0.04) break
          const wf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.005), windowMat)
          wf.position.set(wx, wy, d / 2 + 0.002)
          group.add(wf)
          const wb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.005), windowMat)
          wb.position.set(wx, wy, -d / 2 - 0.002)
          group.add(wb)
        }
        // 侧面窗户
        for (let c = 0; c < colsD; c++) {
          const wz = -d / 2 + 0.04 + c * 0.1
          if (wz > d / 2 - 0.04) break
          const wr = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.06), windowMat)
          wr.position.set(w / 2 + 0.002, wy, wz)
          group.add(wr)
          const wl = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.12, 0.06), windowMat)
          wl.position.set(-w / 2 - 0.002, wy, wz)
          group.add(wl)
        }
      }
    }
    group.position.set(x, 0, z)
    return group
  }

  // 辅助函数：创建阶梯式塔楼
  const makeSteppedTower = (baseW: number, totalH: number, steps: number, mat: THREE.Material, x: number, z: number) => {
    const group = new THREE.Group()
    let y = 0
    for (let i = 0; i < steps; i++) {
      const frac = i / steps
      const w = baseW * (1 - frac * 0.55)
      const d = w * 0.85
      const h = totalH / steps
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      y += h / 2; mesh.position.y = y; group.add(mesh); y += h / 2
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.1, 0.2, 8), mat)
    tip.position.y = y + 0.1; group.add(tip)
    group.position.set(x, 0, z)
    return group
  }

  // 辅助函数：创建L型建筑
  const makeLBuilding = (w: number, h: number, d: number, wingW: number, wingD: number, mat: THREE.Material, x: number, z: number) => {
    const group = new THREE.Group()
    const main = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    main.position.set(w / 2, h / 2, 0)
    main.castShadow = true
    main.receiveShadow = true
    group.add(main)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, h * 0.7, wingD), mat)
    wing.position.set(0, h * 0.35, wingD / 2)
    wing.castShadow = true
    group.add(wing)
    group.position.set(x, 0, z)
    return group
  }

  // 1. 金茂大厦（阶梯式）- 紧凑位置
  jinMaoGroup = makeSteppedTower(0.35, 2.5, 7, warmMat, 0.3, 0.2)
  buildingGroup.add(jinMaoGroup)

  // 2. 环球金融中心（扁平+开孔顶部）- 紧凑位置
  swfcGroup = new THREE.Group()
  const swfcBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.5, 0.35), steelMat)
  swfcBody.position.y = 1.25; swfcBody.castShadow = true; swfcBody.receiveShadow = true; swfcGroup.add(swfcBody)
  for (let r = 0; r < 16; r++) {
    const wy = 0.1 + r * 0.15
    for (let c = 0; c < 3; c++) {
      const wx = -0.12 + c * 0.08
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.005), windowMat)
      wMesh.position.set(wx, wy, 0.175 + 0.002)
      swfcGroup.add(wMesh)
    }
  }
  const swfcTop = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.45, 0.25), steelMat)
  swfcTop.position.y = 2.73; swfcTop.castShadow = true; swfcGroup.add(swfcTop)
  const swfcGapMat2 = new THREE.MeshBasicMaterial({ color: 0x0e1520 })
  const swfcGap1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.25), swfcGapMat2)
  swfcGap1.position.set(-0.05, 2.73, 0); swfcGroup.add(swfcGap1)
  const swfcGap2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.25), swfcGapMat2)
  swfcGap2.position.set(0.05, 2.73, 0); swfcGroup.add(swfcGap2)
  const swfcAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.3, 6), steelMat)
  swfcAnt.position.y = 2.95 + 0.15; swfcGroup.add(swfcAnt)
  swfcGroup.position.set(-0.2, 0, 0.15)
  buildingGroup.add(swfcGroup)

  // 3. 上海中心大厦（扭转式）- 紧凑位置
  shTowerGroup = new THREE.Group()
  let shY = 0
  const shBaseW = 0.35, shTotalH = 3.8, shSectionCount = 12
  const shSectionH = shTotalH / shSectionCount
  for (let i = 0; i < shSectionCount; i++) {
    const frac = i / shSectionCount
    const w = shBaseW * (1 - frac * 0.5)
    const d = w * 0.85
    const twistAngle = frac * 0.45
    const geo = new THREE.BoxGeometry(w, shSectionH, d)
    const mesh = new THREE.Mesh(geo, blueMat)
    shY += shSectionH / 2; mesh.position.y = shY; mesh.rotation.y = twistAngle; shTowerGroup.add(mesh); shY += shSectionH / 2
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (i < 8) {
      for (let c = 0; c < 2; c++) {
        const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.005), windowMat)
        wMesh.position.set(-w / 2 + 0.04 + c * 0.08, shY - shSectionH / 2, d / 2 * Math.cos(twistAngle) + 0.002)
        wMesh.rotation.y = twistAngle
        shTowerGroup.add(wMesh)
      }
    }
  }
  const shTipMesh = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 8), new THREE.MeshPhongMaterial({ color: 0x4a90d9, shininess: 100 }))
  shTipMesh.position.y = shY + 0.175; shTowerGroup.add(shTipMesh)
  shTowerGroup.position.set(0.05, 0, -0.1)
  buildingGroup.add(shTowerGroup)

  // 4. 东方明珠塔（球形+柱体）- 紧凑位置
  const pearlGroup = new THREE.Group()
  const pearlMat = new THREE.MeshPhongMaterial({ color: 0xe8d4a0, specular: 0x666666, shininess: 80 })
  for (let a = 0; a < 3; a++) {
    const angle = a * Math.PI * 2 / 3
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.8, 8), pearlMat)
    leg.position.set(Math.cos(angle) * 0.15, 0.4, Math.sin(angle) * 0.15)
    leg.castShadow = true
    pearlGroup.add(leg)
  }
  const lowerSphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), pinkMat)
  lowerSphere.position.y = 0.9; lowerSphere.castShadow = true; pearlGroup.add(lowerSphere)
  const midPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), pearlMat)
  midPillar.position.y = 1.5; pearlGroup.add(midPillar)
  const upperSphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), pinkMat)
  upperSphere.position.y = 1.8; upperSphere.castShadow = true; pearlGroup.add(upperSphere)
  const antPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6), pearlMat)
  antPillar.position.y = 2.3; pearlGroup.add(antPillar)
  const antTip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.15, 6), pearlMat)
  antTip.position.y = 2.55; pearlGroup.add(antTip)
  pearlGroup.position.set(-0.6, 0, 0.5)
  buildingGroup.add(pearlGroup)

  // 5-8. 紧凑周边建筑群（紧贴核心区）
  buildingGroup.add(makeBuilding(0.22, 1.6, 0.22, glassMat, 0.9, -0.7))
  buildingGroup.add(makeBuilding(0.18, 1.3, 0.18, darkGlassMat, -0.9, -0.4))
  buildingGroup.add(makeBuilding(0.20, 1.5, 0.20, concreteMat, 0.7, 0.9))
  buildingGroup.add(makeBuilding(0.16, 1.1, 0.16, warmMat, -0.5, -0.8))

  // 9-14. 近景中型建筑（紧凑排列）
  buildingGroup.add(makeBuilding(0.25, 1.8, 0.20, lightConcreteMat, 1.5, 0.0))
  buildingGroup.add(makeBuilding(0.15, 1.0, 0.15, glassMat, -1.3, 0.2))
  buildingGroup.add(makeBuilding(0.20, 1.4, 0.18, steelMat, 1.2, -1.2))
  buildingGroup.add(makeSteppedTower(0.20, 1.6, 5, glassMat, -1.5, -0.7))
  buildingGroup.add(makeLBuilding(0.25, 1.2, 0.15, 0.12, 0.20, concreteMat, 1.8, 0.8))
  buildingGroup.add(makeBuilding(0.18, 1.3, 0.18, darkGlassMat, -1.0, 1.0))

  // 15-20. 远景填充建筑（形成城市天际线）
  buildingGroup.add(makeBuilding(0.14, 0.9, 0.14, concreteMat, 3.0, 1.5, false))
  buildingGroup.add(makeBuilding(0.12, 0.7, 0.12, lightConcreteMat, -3.0, 1.0, false))
  buildingGroup.add(makeBuilding(0.16, 1.0, 0.14, warmMat, 4.0, 0.0, false))
  buildingGroup.add(makeBuilding(0.10, 0.6, 0.10, steelMat, -4.0, 0.5, false))
  buildingGroup.add(makeBuilding(0.13, 0.8, 0.13, glassMat, 3.5, -1.5, false))
  buildingGroup.add(makeBuilding(0.11, 0.5, 0.11, concreteMat, -3.5, -1.0, false))

  scene.add(buildingGroup)

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

  controls.update()
  renderer.render(scene, camera)
}

// --- 窗口resize ---
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  initThree()
  animate()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animFrameId)
  if (renderer) {
    renderer.dispose()
    const container = document.getElementById('three-container')
    if (container && renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement)
    }
  }
})
</script>

<style>
body { margin: 0; overflow: hidden; background-color: #4a7ab5; font-family: 'Helvetica Neue', Arial, sans-serif; color: white; }

#three-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

#three-container canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>

<style scoped>
.side-panel { position: absolute; top: 10px; background: rgba(15, 23, 42, 0.88); border-radius: 12px; border: 1px solid #2ec4b6; width: 260px; max-height: calc(100vh - 20px); overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.5); backdrop-filter: blur(5px); transition: width 0.3s ease, background 0.2s, border-color 0.2s, box-shadow 0.2s; }
.side-panel.collapsed { width: 0; height: calc(100vh - 20px); background: transparent; border: none; box-shadow: none; backdrop-filter: none; }
#left-panel { left: 10px; }
#right-panel { right: 10px; }
.panel-content { padding: 18px; max-height: calc(100vh - 20px); overflow-y: auto; }
.resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 10; }
.resize-handle:hover { background: rgba(46, 196, 182, 0.3); }
.resize-right { right: -3px; border-radius: 0 12px 12px 0; }
.resize-left { left: -3px; border-radius: 12px 0 0 12px; }
.collapse-btn { position: absolute; top: 50%; transform: translateY(-50%); background: #2ec4b6; border: none; color: #0f172a; width: 20px; height: 50px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; z-index: 12; transition: background 0.2s; }
.collapse-btn:hover { background: #25a99c; }
.side-panel:not(.collapsed) .collapse-btn-right { right: -20px; border-radius: 0 6px 6px 0; }
.side-panel:not(.collapsed) .collapse-btn-left { left: -20px; border-radius: 6px 0 0 6px; }
.side-panel.collapsed .collapse-btn { top: 50%; transform: translateY(-50%); }
.side-panel.collapsed .collapse-btn-right { right: auto; left: 10px; border-radius: 6px; }
.side-panel.collapsed .collapse-btn-left { left: auto; right: 10px; border-radius: 6px; }
.panel-content { margin-top: 4px; }
.panel-title { margin-top: 0; color: #2ec4b6; font-size: 15px; border-bottom: 2px solid #2ec4b6; padding-bottom: 6px; }
.control-group { margin-bottom: 16px; }
label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 11px; color: #94a3b8; }
.btn-group { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; }
.btn { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s; white-space: nowrap; }
.btn:hover { background: #334155; border-color: #2ec4b6; }
.btn.active { background: #1a7a6f; border-color: #2ec4b6; color: white; }
.btn-city { flex: 1; min-width: 55px; }
.btn-season { flex: 1; min-width: 60px; }
.btn-view { flex: 1; min-width: 40px; }
input[type="range"] { width: 100%; height: 6px; background: #475569; border-radius: 3px; outline: none; -webkit-appearance: none; appearance: none; }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #2ec4b6; cursor: pointer; border: 2px solid #0f172a; }
input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #2ec4b6; cursor: pointer; border: 2px solid #0f172a; }
input[type="date"] { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 5px 8px; border-radius: 6px; font-size: 11px; width: 100%; }
.toggle-row { display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 11px; }
.toggle-row :deep(.el-switch.is-checked .el-switch__core) { background-color: #2ec4b6; border-color: #2ec4b6; }
.toggle-row :deep(.el-switch__core) { border-radius: 10px; }
#info-panel { background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; border-left: 4px solid #2ec4b6; }
#calc-panel { background: rgba(30, 41, 59, 0.5); padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #f59e0b; margin-top: 12px; }
#calc-panel .formula { background: rgba(245, 158, 11, 0.15); padding: 6px 10px; border-radius: 4px; margin: 5px 0; font-family: 'Courier New', monospace; font-size: 12px; color: #fbbf24; }
#calc-panel .step { color: #e2e8f0; margin: 3px 0; }
#calc-panel .result { color: #2ec4b6; font-weight: bold; font-size: 14px; }
#mistakes-panel { background: rgba(239, 68, 68, 0.1); padding: 12px; border-radius: 6px; font-size: 11px; line-height: 1.7; border-left: 4px solid #ef4444; margin-top: 12px; }
#mistakes-panel h3 { color: #ef4444; font-size: 13px; margin: 0 0 6px 0; }
.mistake-item { background: rgba(239, 68, 68, 0.08); padding: 8px 12px; border-radius: 4px; margin: 6px 0; }
.mistake-item .wrong { color: #ef4444; font-weight: bold; }
.mistake-item .correct { color: #10b981; font-weight: bold; }
#params-panel { background: rgba(30, 41, 59, 0.5); padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; border-left: 4px solid #10b981; }
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.data-card { background: rgba(46, 196, 182, 0.08); border: 1px solid rgba(46, 196, 182, 0.2); border-radius: 8px; padding: 6px 8px; transition: all 0.2s; }
.data-card:hover { background: rgba(46, 196, 182, 0.15); border-color: rgba(46, 196, 182, 0.4); }
.data-card.highlight { background: rgba(46, 196, 182, 0.15); border-color: #2ec4b6; }
.data-card-label { font-size: 9px; color: #94a3b8; margin-bottom: 3px; }
.data-card-value { font-size: 14px; color: #2ec4b6; font-weight: bold; }
.anim-controls { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.anim-btn { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.2s; }
.anim-btn:hover { background: #334155; border-color: #2ec4b6; }
.anim-btn.playing { background: #1a7a6f; border-color: #2ec4b6; }
.section-divider { border: 0; border-top: 1px solid #475569; margin: 14px 0; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
</style>
