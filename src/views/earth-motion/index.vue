<template>
  <section ref="rootRef" class="orbit-page" :class="{ 'is-collapsed': panelCollapsed }">
    <header class="app-header scene-header glass-panel">
      <div class="scene-title">
        <strong>地球公转 · 自转 · 昼夜四季</strong>
        <span>Earth Simulator</span>
      </div>
      <div class="scene-actions">
        <button class="header-icon-btn" type="button" title="全屏" @click="toggleFullscreen">⛶</button>
        <label class="header-toggle" title="显示/隐藏实时数据面板">
          <span>实时数据</span>
          <el-switch v-model="observationPanelVisible" size="small"></el-switch>
        </label>
        <label class="header-toggle" title="显示/隐藏底部时间轴">
          <span>时间轴</span>
          <el-switch v-model="timelineDockVisible" size="small"></el-switch>
        </label>
        <label class="header-toggle" title="显示/隐藏副机位">
          <span>副机位</span>
          <el-switch v-model="subSceneVisible" size="small"></el-switch>
        </label>
        <label class="header-toggle">
          <span>自动演示</span>
          <el-switch v-model="isPlaying" size="small"></el-switch>
        </label>
      </div>
    </header>
    <div class="app-main">
    <aside class="control-panel" :class="{ collapsed: panelCollapsed }">
      <div v-if="!panelCollapsed" class="panel-scroll">
        <section class="control-card">
          <div class="card-title">视角中心</div>
          <div class="button-grid two">
            <el-button :type="focusMode === 'sun' ? 'primary' : 'default'" size="small" @click="switchFocus('sun')">
              太阳中心
            </el-button>
            <el-button :type="focusMode === 'earth' ? 'primary' : 'default'" size="small" @click="switchFocus('earth')">
              地球中心
            </el-button>
            <el-button size="small" plain @click="resetCamera">重置视角</el-button>
            <el-button size="small" plain @click="setCameraPreset('top')">俯视</el-button>
          </div>
        </section>

        <section class="control-card">
          <div class="card-title">速度设置</div>
          <label class="control-line slider-line">
            <span>自转速度</span>
            <el-slider v-model="daySpeed" :min="0.05" :max="8" :step="0.05" size="small" :show-tooltip="false"></el-slider>
            <b>{{ daySpeed.toFixed(2) }}×</b>
          </label>
        </section>

        <section class="control-card">
          <div class="card-title">光照控制</div>
          <label class="control-line slider-line light-line">
            <span>定向光强度</span>
            <el-slider v-model="sunLightPower" :min="0.8" :max="3.5" :step="0.05" size="small" :show-tooltip="false"></el-slider>
            <b>{{ sunLightPower.toFixed(2) }}×</b>
          </label>
          <label class="control-line slider-line light-line">
            <span>夜间灯光亮度</span>
            <el-slider v-model="nightLightPower" :min="0.5" :max="4" :step="0.05" size="small" :show-tooltip="false"></el-slider>
            <b>{{ nightLightPower.toFixed(2) }}×</b>
          </label>
          <label class="control-line slider-line light-line">
            <span>暗面地表亮度</span>
            <el-slider v-model="darkSideSurfacePower" :min="0.05" :max="1.2" :step="0.05" size="small" :show-tooltip="false"></el-slider>
            <b>{{ darkSideSurfacePower.toFixed(2) }}×</b>
          </label>
        </section>

        <section class="control-card">
          <div class="card-title">地球图层</div>
          <div class="toggle-list">
            <label v-for="item in displayOptions" :key="item.key" class="option-switch">
              <span>{{ item.label }}</span>
              <el-switch v-model="toggles[item.key]" size="small"></el-switch>
            </label>
          </div>
        </section>

        <section class="control-card">
          <div class="card-title">观测点</div>
          <p class="card-tip">默认上海；仅保留一个观测点。开启后可点击地球替换观测点。</p>
          <label class="control-line switch-line">
            <span>允许点击替换</span>
            <el-switch v-model="clickAddEnabled" size="small"></el-switch>
          </label>
          <div class="preset-cloud">
            <el-button v-for="p in presetPlaces" :key="p.name" size="small" plain @click="addPreset(p)">
              {{ p.name }}
            </el-button>
          </div>
          <el-button class="clear-btn" size="small" plain @click="clearObservationPoints">恢复上海</el-button>
        </section>
      </div>
    </aside>

    <main class="viewport-wrap">
      <div ref="viewportRef" class="viewport">
        <canvas ref="canvasRef" class="three-canvas"></canvas>
        <button class="panel-edge-toggle glass-panel" type="button" :title="panelCollapsed ? '展开控制面板' : '收起控制面板'" @click="panelCollapsed = !panelCollapsed">
          <svg v-if="panelCollapsed" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5l7 7-7 7"></path>
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 5l-7 7 7 7"></path>
          </svg>
        </button>

        <section v-if="observationPanelVisible" class="observation-panel glass-panel" :class="{ empty: !selectedObservation }">
          <header class="obs-head obs-head-v21">
            <span class="obs-title-main">观测点</span>
            <div class="obs-place-row">
              <strong>{{ selectedObservation ? selectedObservation.name : '未选择观测点' }}</strong>
            </div>
          </header>
          <div v-if="selectedObservation" class="obs-body">
            <dl>
              <div>
                <dt>纬度</dt>
                <dd>{{ formatLat(selectedObservation.lat) }}</dd>
              </div>
              <div>
                <dt>经度</dt>
                <dd>{{ formatLon(selectedObservation.lon) }}</dd>
              </div>
              <div>
                <dt>太阳时</dt>
                <dd class="accent-value">{{ selectedObservation.solarTime }}</dd>
              </div>
              <div>
                <dt>太阳高度角</dt>
                <dd class="accent-value">{{ formatSignedDeg(selectedObservation.solarAltitude) }}</dd>
              </div>
              <div v-if="selectedObservation.polarStatus" class="wide">
                <dt>昼夜状态</dt>
                <dd class="accent-value">{{ selectedObservation.polarStatus }}</dd>
              </div>
              <div v-if="!selectedObservation.polarStatus">
                <dt>昼长</dt>
                <dd>{{ selectedObservation.dayLength }}</dd>
              </div>
              <div v-if="!selectedObservation.polarStatus">
                <dt>夜长</dt>
                <dd>{{ selectedObservation.nightLength }}</dd>
              </div>
              <div>
                <dt>日出</dt>
                <dd class="accent-value">{{ selectedObservation.sunriseTime }}</dd>
              </div>
              <div>
                <dt>日落</dt>
                <dd class="accent-value">{{ selectedObservation.sunsetTime }}</dd>
              </div>
            </dl>
            <section class="obs-track-card">
              <svg class="obs-track-svg" :viewBox="`0 0 ${svgWidth} ${svgHeight}`" preserveAspectRatio="xMidYMid meet" role="img">
                <defs>
                  <linearGradient id="trackGradientObs" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#2ec4b6"></stop>
                    <stop offset="55%" stop-color="#47a3ff"></stop>
                    <stop offset="100%" stop-color="#ffd166"></stop>
                  </linearGradient>
                </defs>
                <line :x1="svgPad" :x2="svgWidth - svgRightPad" :y1="svgHeight - svgBottomPad" :y2="svgHeight - svgBottomPad" class="axis-line"></line>
                <line :x1="svgPad" :x2="svgPad" :y1="svgTopPad" :y2="svgHeight - svgBottomPad" class="axis-line"></line>
                <g v-for="tick in yTicks" :key="tick.label">
                  <line :x1="svgPad - 4" :x2="svgWidth - svgRightPad" :y1="latToY(tick.lat)" :y2="latToY(tick.lat)" :class="tick.lat === 0 ? 'equator-line' : 'tropic-line'"></line>
                  <text :x="svgPad - 2" :y="latToY(tick.lat) + 4" text-anchor="end">{{ tick.label }}</text>
                </g>
                <path :d="sunTrackPath" class="obs-track-path"></path>
                <circle :cx="progressToX(yearProgress)" :cy="latToY(currentDeclinationDeg)" r="4.5" class="track-dot"></circle>
                <g v-for="term in solarTerms" :key="term.name">
                  <line :x1="progressToX(term.progress)" :x2="progressToX(term.progress)" :y1="svgTopPad" :y2="svgHeight - svgBottomPad" class="term-guide"></line>
                  <text :x="progressToX(term.progress)" :y="svgHeight - 8" text-anchor="middle">{{ term.name }}</text>
                </g>
              </svg>
            </section>
          </div>
          <p v-else class="empty-tip">选择城市后显示太阳高度角、昼夜长等信息。</p>
        </section>

        <section
          v-show="subSceneVisible"
          ref="subSceneRef"
          class="sub-scene-window glass-panel"
          :style="{ width: `${subSceneSize.width}px`, height: `${subSceneSize.height}px` }"
        >
          <header class="sub-scene-head">
            <div class="sub-title">
              <span>副机位观察</span>
            </div>
            <el-select v-model="subViewMode" size="small" class="sub-view-select" :teleported="false">
              <el-option v-for="view in subViewModes" :key="view.key" :label="view.label" :value="view.key"></el-option>
            </el-select>
          </header>
          <canvas ref="subCanvasRef" class="sub-canvas"></canvas>
          <button class="sub-resize-handle" type="button" title="拖动调整副机位大小" @pointerdown="onSubResizeStart"></button>
        </section>

        <section v-show="timelineDockVisible" class="timeline-dock glass-panel">
          <div class="timeline-info-cards">
            <div class="timeline-info-card">
              <span>直射纬度</span>
              <strong class="accent-value">{{ formatLat(currentDeclinationDeg) }}</strong>
            </div>
            <div class="timeline-info-card date-card">
              <span>日期 / 日序</span>
              <strong><em class="date-text">{{ currentMonthDay }}</em> · 第 {{ currentDayOfYear }} 天</strong>
            </div>
          </div>
          <div class="timeline-main">
            <div class="timeline-row">
              <div class="timeline-label between">
                <span>公转时间轴</span>
                <strong class="accent-value">{{ currentSolarTerm.name }}</strong>
              </div>
              <el-slider v-model="yearProgress" :min="0" :max="1" :step="0.001" size="small" :show-tooltip="false"></el-slider>
            </div>
            <div class="timeline-scale term-scale-row">
              <div class="scale-track term-scale">
                <button v-for="term in solarTerms" :key="term.name" type="button" :style="{ left: sliderTrackLeft(term.progress) }" @click="setSolarTerm(term.progress)">
                  <i></i>
                  <span>{{ term.name }}</span>
                </button>
              </div>
            </div>

            <div class="timeline-row">
              <div class="timeline-label between">
                <span>自转时间轴</span>
                <strong class="accent-value">{{ observerSolarTime }}</strong>
              </div>
              <el-slider v-model="observerLocalHour" :min="0" :max="24" :step="0.05" size="small" :show-tooltip="false"></el-slider>
            </div>
            <div class="hour-scale">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>24h</span>
            </div>
          </div>
        </section>

      </div>
    </main>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElButton, ElSlider, ElSwitch, ElSelect, ElOption } from 'element-plus'
import 'element-plus/dist/index.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const DEG = Math.PI / 180
const RAD = 180 / Math.PI
const EARTH_TILT_DEG = 23.44
const EARTH_TILT = EARTH_TILT_DEG * DEG
const EARTH_RADIUS = 1.35
const SUN_RADIUS = 2.45
const ORBIT_RADIUS = 12.6
const YEAR_DAYS = 365
const SPRING_EQUINOX_DAY = 80
const SPIN_VISUAL_OFFSET = 0

const TEXTURE_BASE = '/geo-resources-folder/images'
const RAW_TEXTURES = {
  sun: `${TEXTURE_BASE}/sun.png`,
  earth: `${TEXTURE_BASE}/Material.002_diffuse.jpg`,
  night: `${TEXTURE_BASE}/emissive.jpg`
}

const rootRef = ref(null)
const viewportRef = ref(null)
const canvasRef = ref(null)
const subCanvasRef = ref(null)
const subSceneRef = ref(null)
const panelCollapsed = ref(false)
const isPlaying = ref(true)
const daySpeed = ref(1.4)
const sunLightPower = ref(1.45)
const nightMapPower = ref(1.75)
const nightLightPower = ref(2.15)
const darkSideSurfacePower = ref(0.52)
const ambientLightPower = ref(1.15)
const focusMode = ref('sun')
const clickAddEnabled = ref(false)
const sunTrackVisible = ref(true)
const observationPanelVisible = ref(true)
const timelineDockVisible = ref(true)
const subSceneVisible = ref(true)
const yearProgress = ref(0)
const subViewMode = ref('dawn')
const subSceneSize = reactive({ width: 360, height: 268 })
const referenceSolarHour = ref(3.9)

const toggles = reactive({
  terminator: true,
  grid: true,
  tropics: true,
  tiltLabels: true,
  tiltAngle: true,
  rotationArrow: true,
  axis: true,
  dayNightArc: true,
  sunRays: true,
  coordLabels: true
})

const displayOptions = [
  { key: 'terminator', label: '晨昏线' },
  { key: 'grid', label: '经纬网' },
  { key: 'tropics', label: '南北回归线' },
  { key: 'tiltLabels', label: '黄道面/赤道面' },
  { key: 'tiltAngle', label: '黄赤交角标注' },
  { key: 'rotationArrow', label: '自转方向箭头' },
  { key: 'axis', label: '地球自转轴' },
  { key: 'dayNightArc', label: '昼弧/夜弧' },
  { key: 'sunRays', label: '太阳直射光来向' },
  { key: 'coordLabels', label: '经纬度标签' }
]

const solarTerms = [
  { name: '春分', progress: dayOfYearToCalendarProgress(80), day: 80, date: '3月21日' },
  { name: '夏至', progress: dayOfYearToCalendarProgress(172), day: 172, date: '6月21日' },
  { name: '秋分', progress: dayOfYearToCalendarProgress(266), day: 266, date: '9月23日' },
  { name: '冬至', progress: dayOfYearToCalendarProgress(356), day: 356, date: '12月22日' }
]

const calendarTicks = [
  { label: '1月1日', progress: dayOfYearToCalendarProgress(1) },
  { label: '3月', progress: dayOfYearToCalendarProgress(60) },
  { label: '6月', progress: dayOfYearToCalendarProgress(152) },
  { label: '9月', progress: dayOfYearToCalendarProgress(244) },
  { label: '12月31日', progress: dayOfYearToCalendarProgress(365) }
]

const subViewModes = [
  { key: 'dawn', label: '晨线' },
  { key: 'dusk', label: '昏线' },
  { key: 'southPole', label: '南极' },
  { key: 'northPole', label: '北极' },
  { key: 'night', label: '夜半球' },
  { key: 'day', label: '昼半球' }
]
const subViewLabel = computed(() => subViewModes.find((item) => item.key === subViewMode.value)?.label || '副视角')

const presetPlaces = [
  { name: '北京，中国', lat: 39.9042, lon: 116.4074 },
  { name: '上海，中国', lat: 31.2304, lon: 121.4737 },
  { name: '伦敦，英国', lat: 51.5072, lon: -0.1276 },
  { name: '莫斯科，俄罗斯', lat: 55.7558, lon: 37.6173 },
  { name: '奥斯陆，挪威', lat: 59.9139, lon: 10.7522 },
  { name: '赫尔辛基，芬兰', lat: 60.1699, lon: 24.9384 },
  { name: '蓬塔阿雷纳斯，智利', lat: -53.1638, lon: -70.9171 },
  { name: '新加坡', lat: 1.3521, lon: 103.8198 },
  { name: '开罗，埃及', lat: 30.0444, lon: 31.2357 },
  { name: '纽约，美国', lat: 40.7128, lon: -74.006 },
  { name: '悉尼，澳大利亚', lat: -33.8688, lon: 151.2093 }
]

const DEFAULT_OBSERVATION = { id: 1, name: '上海，中国', lat: 31.2304, lon: 121.4737 }
const observationPoints = ref([{ ...DEFAULT_OBSERVATION }])
const selectedObservationId = ref(DEFAULT_OBSERVATION.id)
let pointCounter = 1

const currentDeclinationDeg = computed(() => getDeclination(yearProgress.value) * RAD)
const currentDayOfYear = computed(() => progressToDayOfYear(yearProgress.value))
const currentMonthDay = computed(() => dayOfYearToMonthDay(currentDayOfYear.value))
const currentSolarTerm = computed(() => {
  const p = normalize01(yearProgress.value)
  const ordered = [...solarTerms].sort((a, b) => a.progress - b.progress)
  let active = ordered[ordered.length - 1]
  for (const term of ordered) {
    if (p >= term.progress) active = term
  }
  return active
})
const selectedObservation = computed(() => {
  const point = observationPoints.value.find((p) => p.id === selectedObservationId.value)
  return point ? computeObservation(point) : null
})

const currentObserverPoint = computed(() => observationPoints.value.find((p) => p.id === selectedObservationId.value) || DEFAULT_OBSERVATION)
const observerLocalHour = computed({
  get() {
    const observer = currentObserverPoint.value
    return normalizeHour(referenceSolarHour.value + observer.lon / 15)
  },
  set(value) {
    const observer = currentObserverPoint.value
    referenceSolarHour.value = normalizeHour(Number(value) - observer.lon / 15)
  }
})
const observerSolarTime = computed(() => selectedObservation.value?.solarTime || formatHour(observerLocalHour.value))

const svgWidth = 252
const svgHeight = 108
const svgPad = 32
const svgRightPad = 8
const svgTopPad = 16
const svgBottomPad = 20
const yTicks = [
  { lat: 23.44, label: '23.44°N' },
  { lat: 0, label: '0°' },
  { lat: -23.44, label: '23.44°S' }
]

const sunTrackPath = computed(() => {
  const parts = []
  const samples = 180
  for (let i = 0; i <= samples; i += 1) {
    const p = i / samples
    parts.push(`${i === 0 ? 'M' : 'L'} ${progressToX(p).toFixed(2)} ${latToY(getDeclination(p) * RAD).toFixed(2)}`)
  }
  return parts.join(' ')
})

let scene
let camera
let renderer
let subRenderer
let subCamera
let controls
let resizeObserver
let animationId = 0
let lastFrameTime = 0
let raycaster
let mouse
let sunMesh
let earthOrbitGroup
let earthRoot
let earthTiltGroup
let earthSpinGroup
let earthMesh
let orbitLine
let starField
let nebulaGroup
let terminatorLine
let dayArcLine
let nightArcLine
let gridGroup
let tropicsGroup
let coordLabelGroup
let axisGroup
let planesGroup
let equatorPlaneGroup
let tiltAngleGroup
let rotationArrowGroup
let sunRaysGroup
let subsolarMarker
let labelGroup
let markerGroup
let directionalLight
let ambientLight
let targetFocus = new THREE.Vector3(0, 0, 0)

const earthUniforms = {
  dayMap: { value: createPlaceholderTexture('#1e88e5', '#45d0ff') },
  nightMap: { value: createPlaceholderTexture('#07111f', '#ffda75') },
  sunDirection: { value: new THREE.Vector3(0, 0, 1) },
  axisDirection: { value: new THREE.Vector3(0, 1, 0) },
  showTerminator: { value: 1 },
  showDayNightArc: { value: 1 },
  sunLightPower: { value: 1.45 },
  nightMapPower: { value: 1.75 },
  nightLightPower: { value: 2.15 },
  darkSideSurfacePower: { value: 0.52 }
}

onMounted(() => {
  nextTick(() => {
    try {
      initScene()
      animate(0)
    } catch (error) {
      console.error('EarthOrbitSimulator 初始化失败：', error)
    }
  })
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(yearProgressTweenId)
  resizeObserver?.disconnect()
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('pointermove', onSubResizeMove)
  viewportRef.value?.removeEventListener('pointerdown', onPointerDown)
  renderer?.dispose()
  subRenderer?.dispose()
  scene?.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
      else obj.material.dispose()
    }
  })
})

watch(toggles, updateVisibility, { deep: true })
watch([yearProgress, referenceSolarHour, selectedObservationId], () => {
  updateCelestialState()
  updateObservationMarkers()
})
watch(focusMode, () => updateFocusTarget())
watch([sunLightPower, nightMapPower, nightLightPower, darkSideSurfacePower], updateLightUniforms)
watch(subViewMode, () => updateSubCamera())

function initScene() {
  if (!canvasRef.value || !viewportRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020713)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)
  camera.position.set(0, 9.2, 22)

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  if (subCanvasRef.value) {
    subRenderer = new THREE.WebGLRenderer({ canvas: subCanvasRef.value, antialias: true, alpha: false })
    subRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    subRenderer.outputColorSpace = THREE.SRGBColorSpace
    subRenderer.toneMapping = THREE.ACESFilmicToneMapping
    subRenderer.toneMappingExposure = 1.05
    subCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
  }

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 5
  controls.maxDistance = 42
  controls.target.set(0, 0, 0)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  ambientLight = new THREE.AmbientLight(0x7fa6c9, 0.75 * ambientLightPower.value)
  scene.add(ambientLight)
  directionalLight = new THREE.DirectionalLight(0xffffff, 3.2 * sunLightPower.value)
  directionalLight.position.set(0, 0, 0)
  scene.add(directionalLight)

  markerGroup = new THREE.Group()
  labelGroup = new THREE.Group()
  earthOrbitGroup = new THREE.Group()
  scene.add(earthOrbitGroup)
  scene.add(markerGroup)
  scene.add(labelGroup)

  createNebulaBackdrop()
  createStars()
  createSun()
  createOrbit()
  createEarth()
  createTermLabels()
  createHelpers()
  loadTexturesAsync()
  setupResize()
  updateVisibility()
  updateCelestialState()
  updateObservationMarkers()

  viewportRef.value.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('click', onWindowClick)
}

function createSun() {
  const geo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64)
  const mat = new THREE.MeshBasicMaterial({ map: createPlaceholderTexture('#ff8a00', '#ffe082') })
  sunMesh = new THREE.Mesh(geo, mat)
  scene.add(sunMesh)

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS * 1.28, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  scene.add(halo)
}

function createEarth() {
  earthRoot = new THREE.Group()
  earthTiltGroup = new THREE.Group()
  earthSpinGroup = new THREE.Group()
  earthTiltGroup.rotation.z = -EARTH_TILT
  earthRoot.add(earthTiltGroup)
  earthTiltGroup.add(earthSpinGroup)
  earthOrbitGroup.add(earthRoot)

  const geo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96)
  const mat = new THREE.ShaderMaterial({
    uniforms: earthUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vLocalNormal = normalize(normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform vec3 axisDirection;
      uniform float showTerminator;
      uniform float showDayNightArc;
      uniform float sunLightPower;
      uniform float nightMapPower;
      uniform float nightLightPower;
      uniform float darkSideSurfacePower;
      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;

      float latitudeLineMask(float lat) {
        float stepValue = 3.14159265359 / 12.0;
        float shifted = mod(lat + 1.57079632679 + stepValue * 0.5, stepValue) - stepValue * 0.5;
        return 1.0 - smoothstep(0.004, 0.014, abs(shifted));
      }

      void main() {
        vec3 nWorld = normalize(vWorldNormal);
        vec3 sWorld = normalize(sunDirection);
        vec3 dayColor = texture2D(dayMap, vUv).rgb;
        vec3 nightColor = texture2D(nightMap, vUv).rgb * nightMapPower;
        float lightAmount = dot(nWorld, sWorld);
        float dayMask = smoothstep(-0.08, 0.16, lightAmount);
        vec3 litDay = dayColor * (0.40 + sunLightPower * 1.28 * max(lightAmount, 0.0));
        vec3 nightLit = nightColor * ((0.26 + nightLightPower) * (1.0 - dayMask));
        float nightSide = 1.0 - dayMask;
        float rimFill = 0.55 + 0.45 * pow(1.0 - abs(lightAmount), 0.65);
        vec3 darkSurface = dayColor * darkSideSurfacePower * rimFill * nightSide;
        vec3 color = mix(darkSurface + nightLit, litDay, dayMask);

        float lat = asin(clamp(normalize(vLocalNormal).y, -1.0, 1.0));
        float latMask = latitudeLineMask(lat) * showDayNightArc;
        color = mix(color, vec3(1.0, 0.78, 0.28), latMask * dayMask * 0.72);
        color = mix(color, vec3(0.20, 0.50, 1.0), latMask * (1.0 - dayMask) * 0.68);

        float terminatorMask = (1.0 - smoothstep(0.0, 0.035, abs(lightAmount))) * showTerminator;
        float dawnSignal = dot(cross(normalize(axisDirection), nWorld), sWorld);
        vec3 dawnColor = vec3(0.16, 1.0, 0.86);
        vec3 duskColor = vec3(1.0, 0.44, 0.18);
        color = mix(color, dawnSignal >= 0.0 ? dawnColor : duskColor, terminatorMask * 0.94);

        color += vec3(0.08, 0.22, 0.28) * pow(1.0 - abs(lightAmount), 2.0) * 0.25;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
  earthMesh = new THREE.Mesh(geo, mat)
  earthSpinGroup.add(earthMesh)

  gridGroup = createLatLonGrid()
  tropicsGroup = createTropics()
  coordLabelGroup = createCoordinateLabels()
  earthSpinGroup.add(gridGroup)
  earthSpinGroup.add(tropicsGroup)
  earthSpinGroup.add(coordLabelGroup)
}

function createOrbit() {
  const pts = []
  for (let i = 0; i <= 240; i += 1) {
    const t = (i / 240) * Math.PI * 2
    pts.push(new THREE.Vector3(-Math.sin(t) * ORBIT_RADIUS, 0, -Math.cos(t) * ORBIT_RADIUS))
  }
  orbitLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.7 })
  )
  scene.add(orbitLine)
}

function createTermLabels() {
  solarTerms.forEach((term) => {
    const pos = getOrbitPosition(term.progress)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x2ec4b6 })
    )
    marker.position.copy(pos)
    scene.add(marker)

    const sprite = createTextSprite(term.name, '#dffffb')
    sprite.position.copy(pos).add(new THREE.Vector3(0, 0.65, 0))
    sprite.scale.set(1.25, 0.42, 1)
    labelGroup.add(sprite)
  })
}

function createHelpers() {
  axisGroup = new THREE.Group()
  const axisMat = new THREE.LineBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.94 })
  const axisPts = [new THREE.Vector3(0, -EARTH_RADIUS * 1.72, 0), new THREE.Vector3(0, EARTH_RADIUS * 1.72, 0)]
  axisGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPts), axisMat))
  const axisCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.34, 28),
    new THREE.MeshBasicMaterial({ color: 0x35f2df, transparent: true, opacity: 0.98 })
  )
  axisCone.position.set(0, EARTH_RADIUS * 1.86, 0)
  axisGroup.add(axisCone)
  const nLabel = createTextSprite('N', '#eaffff')
  nLabel.position.set(0, EARTH_RADIUS * 2.08, 0)
  nLabel.scale.set(0.42, 0.24, 1)
  axisGroup.add(nLabel)
  earthTiltGroup.add(axisGroup)

  rotationArrowGroup = new THREE.Group()
  rotationArrowGroup.position.set(0, EARTH_RADIUS * 1.88, 0)
  const rotationRadius = EARTH_RADIUS * 0.58
  const arrowCurve = createCircleArc(rotationRadius, 1.62 * Math.PI, 0.12 * Math.PI, 84, 'xz')
  rotationArrowGroup.add(new THREE.Line(arrowCurve, new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1 })))
  const arrowTipAngle = 0.12 * Math.PI
  const arrowOrigin = new THREE.Vector3(Math.cos(arrowTipAngle) * rotationRadius, 0, Math.sin(arrowTipAngle) * rotationRadius)
  const arrowDir = new THREE.Vector3(Math.sin(arrowTipAngle), 0, -Math.cos(arrowTipAngle)).normalize()
  const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.46, 0xffd166, 0.2, 0.12)
  rotationArrowGroup.add(arrow)
  const rotationLabel = createTextSprite('自西向东', '#ffd166')
  rotationLabel.position.set(0, 0.24, -rotationRadius * 0.95)
  rotationLabel.scale.set(0.88, 0.24, 1)
  rotationArrowGroup.add(rotationLabel)
  earthTiltGroup.add(rotationArrowGroup)

  planesGroup = new THREE.Group()
  const eclipticPlane = createDiscPlane(ORBIT_RADIUS * 1.02, 0x2ec4b6, 0.075)
  eclipticPlane.rotation.x = -Math.PI / 2
  planesGroup.add(eclipticPlane)
  const eclipticRing = createRingLine(ORBIT_RADIUS, 0x2ec4b6, 0.58)
  planesGroup.add(eclipticRing)
  const eclipticLabel = createTextSprite('黄道面', '#bffdf7')
  eclipticLabel.position.set(ORBIT_RADIUS * 0.58, 0.08, ORBIT_RADIUS * 0.3)
  eclipticLabel.scale.set(0.9, 0.26, 1)
  planesGroup.add(eclipticLabel)
  scene.add(planesGroup)

  equatorPlaneGroup = new THREE.Group()
  const equatorPlane = createDiscPlane(EARTH_RADIUS * 1.78, 0x48a7ff, 0.12)
  equatorPlane.rotation.x = -Math.PI / 2
  equatorPlaneGroup.add(equatorPlane)
  const equatorRing = createRingLine(EARTH_RADIUS * 1.78, 0x48a7ff, 0.78)
  equatorPlaneGroup.add(equatorRing)
  const equatorLabel = createTextSprite('赤道面', '#dffcff')
  equatorLabel.position.set(EARTH_RADIUS * 1.9, 0.08, 0)
  equatorLabel.scale.set(0.8, 0.24, 1)
  equatorPlaneGroup.add(equatorLabel)
  earthTiltGroup.add(equatorPlaneGroup)

  tiltAngleGroup = createTiltAngleHelper()
  earthRoot.add(tiltAngleGroup)

  sunRaysGroup = new THREE.Group()
  scene.add(sunRaysGroup)
  for (let i = -2; i <= 2; i += 1) {
    const isCenter = i === 0
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.1, isCenter ? 0xffd166 : 0x69e7ff, isCenter ? 0.36 : 0.24, isCenter ? 0.16 : 0.1)
    arrow.userData.offsetIndex = i
    sunRaysGroup.add(arrow)
  }
  subsolarMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 })
  )
  sunRaysGroup.add(subsolarMarker)
}


function createTiltAngleHelper() {
  const group = new THREE.Group()
  const r = EARTH_RADIUS * 1.95
  const eclipticMat = new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.98 })
  const equatorMat = new THREE.LineBasicMaterial({ color: 0x48a7ff, transparent: true, opacity: 0.98 })
  const arcMat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1 })

  const eclipticLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0)]),
    eclipticMat
  )
  group.add(eclipticLine)

  const equatorLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(EARTH_TILT) * r, Math.sin(EARTH_TILT) * r, 0)]),
    equatorMat
  )
  group.add(equatorLine)

  const arc = new THREE.Line(createCircleArc(r * 0.58, 0, EARTH_TILT, 64, 'xy'), arcMat)
  group.add(arc)
  const arc2 = new THREE.Line(createCircleArc(r * 0.70, 0, EARTH_TILT, 64, 'xy'), new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.46 }))
  group.add(arc2)

  const arcTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.16, 18),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1 })
  )
  arcTip.position.set(Math.cos(EARTH_TILT) * r * 0.58, Math.sin(EARTH_TILT) * r * 0.58, 0)
  arcTip.rotation.z = EARTH_TILT - Math.PI / 2
  group.add(arcTip)

  const label = createTextSprite('黄赤交角 23.44°', '#fff4cb')
  label.position.set(Math.cos(EARTH_TILT * 0.52) * r * 0.92, Math.sin(EARTH_TILT * 0.52) * r * 0.92 - 0.18, 0.18)
  label.scale.set(1.06, 0.26, 1)
  group.add(label)

  return group
}

function createNebulaBackdrop() {
  nebulaGroup = new THREE.Group()
  scene.add(nebulaGroup)

  const configs = [
    { x: -22, y: 12, z: -38, s: 28, a: 0.42, c1: 'rgba(46,196,182,0.42)', c2: 'rgba(36,124,255,0.18)' },
    { x: 18, y: -5, z: -42, s: 34, a: 0.34, c1: 'rgba(64,132,255,0.34)', c2: 'rgba(46,196,182,0.15)' },
    { x: 4, y: 18, z: -48, s: 40, a: 0.26, c1: 'rgba(255,209,102,0.22)', c2: 'rgba(46,196,182,0.12)' },
    { x: -32, y: -15, z: -52, s: 36, a: 0.26, c1: 'rgba(84,180,255,0.28)', c2: 'rgba(46,196,182,0.12)' }
  ]

  configs.forEach((cfg) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createNebulaSpriteTexture(cfg.c1, cfg.c2),
        transparent: true,
        opacity: cfg.a,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      })
    )
    sprite.position.set(cfg.x, cfg.y, cfg.z)
    sprite.scale.set(cfg.s, cfg.s * 0.56, 1)
    nebulaGroup.add(sprite)
  })
}

function createNebulaSpriteTexture(coreColor, edgeColor) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, coreColor)
  gradient.addColorStop(0.38, edgeColor)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createStars() {
  const count = 1800
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const r = 42 + Math.random() * 34
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.13, transparent: true, opacity: 0.84, depthWrite: false, sizeAttenuation: true })
  starField = new THREE.Points(geo, mat)
  scene.add(starField)
}

function loadTexturesAsync() {
  const loader = new THREE.TextureLoader()
  loadTexture(loader, RAW_TEXTURES.sun, (texture) => {
    if (sunMesh?.material) {
      texture.colorSpace = THREE.SRGBColorSpace
      sunMesh.material.map = texture
      sunMesh.material.needsUpdate = true
    }
  })
  loadTexture(loader, RAW_TEXTURES.earth, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    earthUniforms.dayMap.value = texture
  })
  loadTexture(loader, RAW_TEXTURES.night, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    earthUniforms.nightMap.value = texture
  })
}

function loadTexture(loader, url, onLoad) {
  loader.load(
    url,
    (texture) => onLoad(texture),
    undefined,
    (error) => console.warn(`纹理加载失败，已使用占位纹理：${url}`, error)
  )
}

function resizeSubRenderer() {
  if (subRenderer && subCanvasRef.value && subCamera) {
    const subRect = subCanvasRef.value.getBoundingClientRect()
    const subWidth = Math.max(1, subRect.width)
    const subHeight = Math.max(1, subRect.height)
    subCamera.aspect = subWidth / subHeight
    subCamera.updateProjectionMatrix()
    subRenderer.setSize(subWidth, subHeight, false)
  }
}

function setupResize() {
  const resize = () => {
    if (!viewportRef.value || !renderer || !camera) return
    const rect = viewportRef.value.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    resizeSubRenderer()
  }
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(viewportRef.value)
  if (subSceneRef.value) resizeObserver.observe(subSceneRef.value)
  resize()
}

function animate(time) {
  animationId = requestAnimationFrame(animate)
  const dt = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.08) : 0
  lastFrameTime = time

  if (isPlaying.value) {
    yearProgress.value = normalize01(yearProgress.value + (dt / 36) * 0.45)
    referenceSolarHour.value = normalizeHour(referenceSolarHour.value + dt * daySpeed.value * 0.9)
  }

  if (starField?.material) {
    starField.material.opacity = 0.66 + Math.sin(time * 0.0018) * 0.18
  }
  if (nebulaGroup) {
    nebulaGroup.rotation.z = Math.sin(time * 0.00008) * 0.025
    nebulaGroup.children.forEach((sprite, index) => {
      sprite.material.opacity = 0.24 + Math.sin(time * 0.0009 + index * 1.7) * 0.08
    })
  }
  if (sunMesh) {
    sunMesh.rotation.y += dt * 0.12
  }

  smoothCameraTarget(dt)
  controls?.update()
  renderer?.render(scene, camera)
  if (subRenderer && subCamera) {
    updateSubCamera()
    subRenderer.render(scene, subCamera)
  }
}


function updateSubCamera() {
  if (!subCamera || !earthRoot || !earthTiltGroup) return
  const earthPos = earthRoot.position.clone()
  const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthPos).normalize()
  const axisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(earthTiltGroup.getWorldQuaternion(new THREE.Quaternion())).normalize()
  const terminatorDir = new THREE.Vector3().crossVectors(axisWorld, sunDir).normalize()
  let viewDir
  switch (subViewMode.value) {
    case 'dusk':
      viewDir = terminatorDir.clone()
      break
    case 'southPole':
      viewDir = axisWorld.clone().multiplyScalar(-1)
      break
    case 'northPole':
      viewDir = axisWorld.clone()
      break
    case 'night':
      viewDir = sunDir.clone().multiplyScalar(-1)
      break
    case 'day':
      viewDir = sunDir.clone()
      break
    case 'dawn':
    default:
      viewDir = terminatorDir.clone().multiplyScalar(-1)
      break
  }
  if (!Number.isFinite(viewDir.lengthSq()) || viewDir.lengthSq() < 0.001) viewDir = new THREE.Vector3(0, 1, 0)
  const distance = EARTH_RADIUS * 3.35
  const up = Math.abs(viewDir.dot(axisWorld)) > 0.94 ? new THREE.Vector3(0, 0, 1) : axisWorld
  subCamera.position.copy(earthPos.clone().add(viewDir.normalize().multiplyScalar(distance)))
  subCamera.up.copy(up)
  subCamera.lookAt(earthPos)
}

function updateLightUniforms() {
  earthUniforms.sunLightPower.value = sunLightPower.value
  earthUniforms.nightMapPower.value = nightMapPower.value
  earthUniforms.nightLightPower.value = nightLightPower.value
  earthUniforms.darkSideSurfacePower.value = darkSideSurfacePower.value
  if (directionalLight) directionalLight.intensity = 3.2 * sunLightPower.value
  if (ambientLight) ambientLight.intensity = 0.75 * ambientLightPower.value
}

function computeSpinAngleForObserver(observer, localSolarHour, sunDir) {
  if (!earthTiltGroup) return 0
  const desiredSubsolarLon = normalizeLon(observer.lon - (normalizeHour(localSolarHour) - 12) * 15)
  const inverseTilt = earthTiltGroup.getWorldQuaternion(new THREE.Quaternion()).invert()
  const sunInTiltLocal = sunDir.clone().applyQuaternion(inverseTilt).normalize()
  const currentSunLon = vectorToLonDeg(sunInTiltLocal)
  return (currentSunLon - desiredSubsolarLon) * DEG
}

function vectorToLonDeg(v) {
  return normalizeLon(Math.atan2(-v.z, v.x) * RAD)
}

function updateCelestialState() {
  if (!earthRoot) return
  const pos = getOrbitPosition(yearProgress.value)
  earthRoot.position.copy(pos)

  const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), pos).normalize()

  // 自转时间轴表示当前观测点的地方太阳时。这里反解地球自转角，
  // 使“观测点太阳时”和“该点处于昼/夜半球的视觉位置”严格一致。
  const observer = observationPoints.value.find((p) => p.id === selectedObservationId.value) || DEFAULT_OBSERVATION
  earthSpinGroup.rotation.y = SPIN_VISUAL_OFFSET + computeSpinAngleForObserver(observer, observerLocalHour.value, sunDir)

  updateLightUniforms()
  earthUniforms.sunDirection.value.copy(sunDir)
  const axisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(earthTiltGroup.getWorldQuaternion(new THREE.Quaternion())).normalize()
  earthUniforms.axisDirection.value.copy(axisWorld)

  if (directionalLight) {
    directionalLight.position.set(0, 0, 0)
    directionalLight.target = earthRoot
  }

  updateTerminator(sunDir)
  updateSunRays(sunDir)
  updateFocusTarget()
  updateSubCamera()
}

function updateTerminator(sunDir) {
  if (!earthRoot || !terminatorLine) return
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), sunDir.clone().normalize())
  const offset = earthRoot.position
  ;[terminatorLine, dayArcLine, nightArcLine].forEach((line) => {
    if (!line) return
    line.position.copy(offset)
    line.quaternion.copy(q)
  })
}

function updateSunRays(sunDir) {
  if (!earthRoot || !sunRaysGroup) return
  const earthPos = earthRoot.position.clone()
  const lightTravelDir = earthPos.clone().normalize()
  const subsolarPoint = earthPos.clone().add(sunDir.clone().multiplyScalar(EARTH_RADIUS * 1.035))
  const vertical = new THREE.Vector3(0, 1, 0)
  const sunSurface = lightTravelDir.clone().multiplyScalar(SUN_RADIUS * 1.08)

  sunRaysGroup.children.forEach((arrow) => {
    if (arrow.type !== 'ArrowHelper') return
    const idx = arrow.userData.offsetIndex || 0
    const offset = vertical.clone().multiplyScalar(idx * 0.52)
    const start = sunSurface.clone().add(offset)
    const end = subsolarPoint.clone().add(offset)
    const direction = new THREE.Vector3().subVectors(end, start)
    arrow.position.copy(start)
    arrow.setDirection(direction.clone().normalize())
    arrow.setLength(direction.length(), idx === 0 ? 0.36 : 0.25, idx === 0 ? 0.16 : 0.1)
  })

  if (subsolarMarker) {
    subsolarMarker.position.copy(subsolarPoint)
    subsolarMarker.visible = toggles.sunRays
  }
}

function updateVisibility() {
  earthUniforms.showTerminator.value = toggles.terminator ? 1 : 0
  earthUniforms.showDayNightArc.value = toggles.dayNightArc ? 1 : 0
  if (terminatorLine) terminatorLine.visible = false
  if (gridGroup) gridGroup.visible = toggles.grid
  if (tropicsGroup) tropicsGroup.visible = toggles.tropics
  if (coordLabelGroup) coordLabelGroup.visible = toggles.coordLabels
  if (planesGroup) planesGroup.visible = toggles.tiltLabels
  if (equatorPlaneGroup) equatorPlaneGroup.visible = toggles.tiltLabels
  if (tiltAngleGroup) tiltAngleGroup.visible = toggles.tiltAngle
  if (axisGroup) axisGroup.visible = toggles.axis
  if (rotationArrowGroup) rotationArrowGroup.visible = toggles.rotationArrow
  if (dayArcLine) dayArcLine.visible = false
  if (nightArcLine) nightArcLine.visible = false
  if (sunRaysGroup) sunRaysGroup.visible = toggles.sunRays
}

function smoothCameraTarget(dt) {
  if (!controls) return
  controls.target.lerp(targetFocus, Math.min(1, dt * 2.2))
}

function updateFocusTarget() {
  if (!earthRoot) return
  targetFocus = focusMode.value === 'earth' ? earthRoot.position.clone() : new THREE.Vector3(0, 0, 0)
}

function switchFocus(mode) {
  focusMode.value = mode
  updateFocusTarget()
  if (mode === 'earth' && camera && controls && earthRoot) {
    const direction = camera.position.clone().sub(controls.target).normalize()
    const distance = Math.max(5.4, Math.min(7.2, camera.position.distanceTo(controls.target) * 0.45))
    camera.position.copy(earthRoot.position.clone().add(direction.multiplyScalar(distance)))
  }
}

function resetCamera() {
  if (!camera || !controls) return
  if (focusMode.value === 'earth' && earthRoot) {
    camera.position.copy(earthRoot.position.clone().add(new THREE.Vector3(0, 3.8, 6.4)))
  } else {
    camera.position.set(0, 9.2, 22)
  }
  updateFocusTarget()
}

function setCameraPreset(type) {
  if (!camera || !controls) return
  if (type === 'top') {
    focusMode.value = 'sun'
    const center = new THREE.Vector3(0, 0, 0)
    // 避免相机正好落在 OrbitControls 极点：保持上帝视角，同时仍可自由拖回普通视角。
    camera.up.set(0, 1, 0)
    camera.position.copy(center.clone().add(new THREE.Vector3(0, 25.5, 9.2)))
    controls.target.copy(center)
    controls.enableRotate = true
    controls.update()
    return
  }
  updateFocusTarget()
  const center = focusMode.value === 'earth' && earthRoot ? earthRoot.position.clone() : new THREE.Vector3(0, 0, 0)
  const distance = focusMode.value === 'earth' ? 7.2 : 23
  if (type === 'bottom') {
    camera.position.copy(center.clone().add(new THREE.Vector3(0, -distance * 0.72, 0.01)))
    camera.up.set(0, 0, -1)
  } else {
    camera.position.copy(center.clone().add(new THREE.Vector3(0, distance * 0.72, 0.01)))
    camera.up.set(0, 0, 1)
  }
  controls.target.copy(center)
  controls.enableRotate = true
  controls.update()
}

let subResizeState = null
function onSubResizeStart(event) {
  event.preventDefault()
  event.stopPropagation()
  subResizeState = {
    startX: event.clientX,
    startY: event.clientY,
    width: subSceneSize.width,
    height: subSceneSize.height
  }
  window.addEventListener('pointermove', onSubResizeMove)
  window.addEventListener('pointerup', onSubResizeEnd, { once: true })
}

function onSubResizeMove(event) {
  if (!subResizeState) return
  const viewportWidth = viewportRef.value?.clientWidth || window.innerWidth
  const viewportHeight = viewportRef.value?.clientHeight || window.innerHeight
  const maxWidth = Math.max(260, Math.min(620, viewportWidth - 36))
  const maxHeight = Math.max(210, Math.min(520, viewportHeight - 160))
  const aspect = subResizeState.width / Math.max(1, subResizeState.height)
  // 左下角拖拽：向左或向下为放大，向右或向上为缩小；保持等比例。
  const deltaFromLeft = subResizeState.startX - event.clientX
  const deltaFromBottom = event.clientY - subResizeState.startY
  const delta = Math.abs(deltaFromLeft) > Math.abs(deltaFromBottom) ? deltaFromLeft : deltaFromBottom
  let nextWidth = clamp(subResizeState.width + delta, 260, maxWidth)
  let nextHeight = nextWidth / aspect
  if (nextHeight > maxHeight) {
    nextHeight = maxHeight
    nextWidth = nextHeight * aspect
  }
  subSceneSize.width = nextWidth
  subSceneSize.height = nextHeight
  nextTick(resizeSubRenderer)
}

function onSubResizeEnd() {
  subResizeState = null
  window.removeEventListener('pointermove', onSubResizeMove)
  nextTick(resizeSubRenderer)
}

function toggleFullscreen() {
  const el = rootRef.value
  if (!el) return
  if (!document.fullscreenElement) el.requestFullscreen?.()
  else document.exitFullscreen?.()
}

let yearProgressTweenId = 0
function setSolarTerm(progress) {
  isPlaying.value = false
  animateYearProgress(progress)
}

function animateYearProgress(targetProgress) {
  cancelAnimationFrame(yearProgressTweenId)
  const start = yearProgress.value
  const target = normalize01(targetProgress)
  const duration = 850
  const startedAt = performance.now()
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  const step = (now) => {
    const t = Math.min(1, (now - startedAt) / duration)
    yearProgress.value = start + (target - start) * ease(t)
    if (t < 1) yearProgressTweenId = requestAnimationFrame(step)
    else yearProgress.value = target
  }
  yearProgressTweenId = requestAnimationFrame(step)
}


function addPreset(preset) {
  setSingleObservation({ name: preset.name, lat: preset.lat, lon: preset.lon })
}

function setSingleObservation(point) {
  const nextPoint = { id: pointCounter += 1, name: point.name, lat: point.lat, lon: normalizeLon(point.lon) }
  observationPoints.value = [nextPoint]
  selectedObservationId.value = nextPoint.id
  updateObservationMarkers()
  updateCelestialState()
}

function clearObservationPoints() {
  observationPoints.value = [{ ...DEFAULT_OBSERVATION }]
  selectedObservationId.value = DEFAULT_OBSERVATION.id
  updateObservationMarkers()
  updateCelestialState()
}

function removeSelectedObservation() {
  clearObservationPoints()
}

function onPointerDown(event) {
  if (!clickAddEnabled.value || !viewportRef.value || !camera || !raycaster || !earthMesh) return
  if (event.target !== canvasRef.value) return
  const rect = viewportRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(earthMesh, true)
  if (!hits.length) return
  const local = earthMesh.worldToLocal(hits[0].point.clone()).normalize()
  const lat = Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)) * RAD
  const lon = Math.atan2(-local.z, local.x) * RAD
  setSingleObservation({
    name: '手动观测点',
    lat,
    lon: normalizeLon(lon)
  })
}

function onWindowClick(event) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const button = target.closest?.('[data-marker-id]')
  if (!button) return
  selectedObservationId.value = Number(button.getAttribute('data-marker-id'))
}

function updateObservationMarkers() {
  if (!markerGroup || !earthSpinGroup) return
  markerGroup.clear()
  observationPoints.value.forEach((point) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshBasicMaterial({ color: point.id === selectedObservationId.value ? 0xffd166 : 0x2ec4b6 })
    )
    const local = latLonToVector(point.lat, point.lon, EARTH_RADIUS * 1.035)
    earthSpinGroup.localToWorld(local)
    marker.position.copy(local)
    markerGroup.add(marker)
  })
}

function computeObservation(point) {
  const lat = point.lat * DEG
  const declination = getDeclination(yearProgress.value)
  const solarTimeValue = normalizeHour(referenceSolarHour.value + point.lon / 15)
  const hourAngle = (solarTimeValue - 12) * 15 * DEG
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  ) * RAD

  const cosH0 = -Math.tan(lat) * Math.tan(declination)
  let polarStatus = ''
  let dayLength = ''
  let nightLength = ''
  let daylightHours = 0
  if (cosH0 <= -1) {
    polarStatus = '当前为极昼'
  } else if (cosH0 >= 1) {
    polarStatus = '当前为极夜'
  } else {
    const h0 = Math.acos(cosH0)
    const dayHours = 2 * h0 * RAD / 15
    daylightHours = dayHours
    dayLength = formatDuration(dayHours)
    nightLength = formatDuration(24 - dayHours)
  }

  const sunriseTime = polarStatus ? polarStatus : formatHour(12 - daylightHours / 2)
  const sunsetTime = polarStatus ? polarStatus : formatHour(12 + daylightHours / 2)

  return {
    ...point,
    solarTime: formatHour(solarTimeValue),
    solarAltitude: altitude,
    polarStatus,
    dayLength,
    nightLength,
    sunriseTime,
    sunsetTime
  }
}

function getOrbitPosition(progress) {
  const theta = calendarProgressToSeasonProgress(progress) * Math.PI * 2
  return new THREE.Vector3(-Math.sin(theta) * ORBIT_RADIUS, 0, -Math.cos(theta) * ORBIT_RADIUS)
}

function getDeclination(progress) {
  return Math.asin(Math.sin(EARTH_TILT) * Math.sin(calendarProgressToSeasonProgress(progress) * Math.PI * 2))
}

function createLatLonGrid() {
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xa8fff6, transparent: true, opacity: 0.23 })
  for (let lon = 0; lon < 360; lon += 15) {
    const pts = []
    for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.006))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = []
    for (let lon = -180; lon <= 180; lon += 3) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.007))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  return group
}

function createTropics() {
  const group = new THREE.Group()
  const tropicMat = new THREE.LineDashedMaterial({ color: 0xffd166, transparent: true, opacity: 0.95, dashSize: 0.08, gapSize: 0.06 })
  const equatorMat = new THREE.LineBasicMaterial({ color: 0x49a5ff, transparent: true, opacity: 0.75 })
  ;[-EARTH_TILT_DEG, 0, EARTH_TILT_DEG].forEach((lat) => {
    const pts = []
    for (let lon = -180; lon <= 180; lon += 2) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.012))
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? equatorMat : tropicMat)
    if (lat !== 0) line.computeLineDistances()
    group.add(line)
  })
  return group
}

function createCoordinateLabels() {
  const group = new THREE.Group()
  for (let lat = -60; lat <= 60; lat += 30) {
    if (lat === 0) continue
    const label = createTextSprite(formatGridLat(lat), '#bffdf7')
    label.position.copy(latLonToVector(lat, -165, EARTH_RADIUS * 1.1))
    label.scale.set(0.5, 0.18, 1)
    group.add(label)
  }
  for (let lon = -180; lon < 180; lon += 60) {
    const label = createTextSprite(formatGridLon(lon), '#d9f7ff')
    label.position.copy(latLonToVector(0, lon, EARTH_RADIUS * 1.12))
    label.scale.set(0.5, 0.18, 1)
    group.add(label)
  }
  return group
}

function createDiscPlane(radius, color, opacity) {
  const geo = new THREE.CircleGeometry(radius, 128)
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
  return new THREE.Mesh(geo, mat)
}

function createRingLine(radius, color, opacity) {
  return new THREE.Line(
    createCircleArc(radius, 0, Math.PI * 2, 180, 'xz'),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  )
}

function createCircleArc(radius, start, end, segments, plane = 'xy') {
  const pts = []
  for (let i = 0; i <= segments; i += 1) {
    const t = start + (end - start) * (i / segments)
    if (plane === 'xz') pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
    else pts.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

function latLonToVector(latDeg, lonDeg, radius) {
  const lat = latDeg * DEG
  const lon = lonDeg * DEG
  const cosLat = Math.cos(lat)
  return new THREE.Vector3(
    Math.cos(lon) * cosLat * radius,
    Math.sin(lat) * radius,
    -Math.sin(lon) * cosLat * radius
  )
}

function createTextSprite(text, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '600 30px Microsoft YaHei, Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(4, 16, 26, 0.62)'
  roundRect(ctx, 24, 18, 208, 58, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(46, 196, 182, 0.65)'
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(text, 128, 48)
  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  return new THREE.Sprite(mat)
}

function createPlaceholderTexture(a, b) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  grad.addColorStop(0, a)
  grad.addColorStop(1, b)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.22})`
    ctx.beginPath()
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createNebulaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  bg.addColorStop(0, '#030712')
  bg.addColorStop(0.45, '#071829')
  bg.addColorStop(1, '#050814')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 6; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const r = 180 + Math.random() * 240
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(46,196,182,0.23)')
    g.addColorStop(0.42, 'rgba(49,126,255,0.12)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  return new THREE.CanvasTexture(canvas)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function progressToDayOfYear(progress) {
  const term = solarTerms.find((item) => Math.abs(normalize01(progress) - item.progress) < 0.0008)
  if (term) return term.day
  return Math.max(1, Math.min(YEAR_DAYS, Math.round(normalize01(progress) * (YEAR_DAYS - 1)) + 1))
}

function dayOfYearToCalendarProgress(day) {
  return (Math.max(1, Math.min(YEAR_DAYS, day)) - 1) / (YEAR_DAYS - 1)
}

function calendarProgressToSeasonProgress(progress) {
  const dayFloat = normalize01(progress) * (YEAR_DAYS - 1) + 1
  return normalize01((dayFloat - SPRING_EQUINOX_DAY) / YEAR_DAYS)
}

function dayOfYearToMonthDay(dayOfYear) {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let rest = Math.max(1, Math.min(YEAR_DAYS, dayOfYear))
  for (let i = 0; i < monthDays.length; i += 1) {
    if (rest <= monthDays[i]) return `${i + 1}月${rest}日`
    rest -= monthDays[i]
  }
  return '12月31日'
}


function sliderTrackLeft(progress) {
  const p = Math.max(0, Math.min(1, progress))
  return `${p * 100}%`
}

function progressToX(progress) {
  return svgPad + normalize01(progress) * (svgWidth - svgPad - svgRightPad)
}

function latToY(lat) {
  const max = 27
  return svgTopPad + ((max - lat) / (max * 2)) * (svgHeight - svgTopPad - svgBottomPad)
}

function formatGridLat(lat) {
  const rounded = Math.round(Math.abs(lat))
  if (Math.abs(lat) < 0.5) return '0°'
  return `${rounded}°${lat > 0 ? 'N' : 'S'}`
}

function formatGridLon(lon) {
  const rounded = Math.round(Math.abs(lon))
  if (Math.abs(lon) < 0.5 || Math.abs(Math.abs(lon) - 180) < 0.5) return `${rounded}°`
  return `${rounded}°${lon > 0 ? 'E' : 'W'}`
}

function formatLat(lat) {
  const abs = Math.abs(lat).toFixed(2)
  if (Math.abs(lat) < 0.005) return '0.00°'
  return `${abs}°${lat > 0 ? 'N' : 'S'}`
}

function formatLon(lon) {
  const abs = Math.abs(lon).toFixed(2)
  if (Math.abs(lon) < 0.005) return '0.00°'
  return `${abs}°${lon > 0 ? 'E' : 'W'}`
}

function formatSignedDeg(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}°`
}

function formatHour(value) {
  const h = normalizeHour(value)
  const hour = Math.floor(h)
  const minute = Math.round((h - hour) * 60)
  return `${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

function formatDuration(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}小时${m}分`
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalize01(value) {
  return ((value % 1) + 1) % 1
}

function normalizeHour(value) {
  return ((value % 24) + 24) % 24
}

function normalizeLon(value) {
  let lon = ((value + 180) % 360 + 360) % 360 - 180
  if (lon === -180) lon = 180
  return lon
}
</script>

<style scoped>

.orbit-page {
  --theme: #2ec4b6;
  --blue: #247cff;
  --panel: rgba(8, 20, 34, 0.66);
  --panel-strong: rgba(7, 18, 31, 0.82);
  --line: rgba(116, 234, 229, 0.18);
  --text: #e9fbff;
  --muted: rgba(233, 251, 255, 0.66);
  display: grid;
  grid-template-columns: 258px minmax(0, 1fr);
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: radial-gradient(circle at 20% 10%, rgba(46, 196, 182, 0.18), transparent 30%),
    linear-gradient(135deg, #020712, #061729 48%, #030914);
  color: var(--text);
  font-family: Inter, "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px;
}


.orbit-page.is-collapsed {
  grid-template-columns: 40px minmax(0, 1fr);
}

.control-panel {
  position: relative;
  z-index: 10;
  min-width: 0;
  height: 100%;
  border-right: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(9, 27, 43, 0.83), rgba(4, 12, 22, 0.88));
  backdrop-filter: blur(22px);
  box-shadow: 14px 0 40px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.control-panel.collapsed {
  width: 40px;
}

.collapse-btn {
  position: sticky;
  top: 10px;
  left: 8px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - 16px);
  height: 28px;
  margin: 8px;
  border: 1px solid rgba(46, 196, 182, 0.36);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.18), rgba(36, 124, 255, 0.16));
  color: var(--text);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 16px rgba(46, 196, 182, 0.18);
  cursor: pointer;
  font-size: 11px;
}

.control-panel.collapsed .collapse-btn {
  width: 32px;
  height: 72px;
  margin: 10px 7px;
  padding: 0;
  writing-mode: vertical-rl;
  letter-spacing: 0.08em;
}

.panel-scroll {
  height: calc(100dvh - 40px);
  padding: 4px 8px 14px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(46, 196, 182, 0.36) transparent;
}

.panel-scroll::-webkit-scrollbar {
  width: 5px;
}

.panel-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.panel-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(46, 196, 182, 0.2), rgba(36, 124, 255, 0.36));
}

.panel-header {
  display: none;
}

.eyebrow {
  color: var(--theme);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-header h1 {
  margin: 5px 0 4px;
  font-size: 15px;
  line-height: 1.2;
}

.panel-header p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}

.control-card,
.glass-panel {
  border: 1px solid var(--line);
  background: var(--panel);
  backdrop-filter: blur(18px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.control-card {
  margin-top: 8px;
  padding: 8px;
  border-radius: 13px;
}

.card-title {
  margin-bottom: 8px;
  color: #dffcff;
  font-size: 11px;
  font-weight: 700;
}

.button-grid.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.control-line {
  display: grid;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: var(--muted);
}

.switch-line {
  grid-template-columns: 1fr auto;
}

.slider-line {
  grid-template-columns: 60px minmax(0, 1fr) 34px;
}

.light-line {
  grid-template-columns: 76px minmax(0, 1fr) 34px;
}

.slider-line b {
  color: #fff;
  font-size: 11px;
  text-align: right;
}

.toggle-list {
  display: grid;
  gap: 7px;
}

.option-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
}

.preset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
  margin-top: 7px;
}

.compact-select {
  width: 100%;
}

.preset-cloud {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
  overflow: visible;
}

.clear-btn {
  width: 100%;
  margin-top: 8px;
}

.viewport-wrap {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at 18% 18%, rgba(46, 196, 182, 0.18), transparent 28%),
    radial-gradient(circle at 78% 28%, rgba(36, 124, 255, 0.16), transparent 34%),
    #020713;
}

.three-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.top-stack {
  position: absolute;
  top: 74px;
  left: 14px;
  z-index: 5;
  display: grid;
  gap: 9px;
  width: 300px;
  pointer-events: none;
}

.top-stack > * {
  pointer-events: auto;
}

.info-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border-radius: 16px;
}

.metric {
  min-width: 0;
}

.metric span,
.observation-panel span,
.sun-track-window span,
.timeline-label span {
  display: block;
  margin-bottom: 3px;
  color: var(--muted);
  font-size: 10px;
}

.metric strong,
.observation-panel strong,
.sun-track-window strong,
.timeline-label strong {
  color: #fff;
  font-size: 13px;
}

.observation-panel {
  max-height: 250px;
  padding: 10px;
  border-radius: 16px;
  overflow-y: auto;
}

.obs-head,
.sun-track-window header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.obs-body dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 10px 0 0;
}

.obs-body div {
  padding: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.obs-body .wide {
  grid-column: 1 / -1;
}

.obs-body dt {
  margin-bottom: 3px;
  color: var(--muted);
  font-size: 10px;
}

.obs-body dd {
  margin: 0;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.empty-tip {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
}

.sun-track-window {
  position: absolute;
  right: 14px;
  top: 74px;
  z-index: 5;
  width: min(390px, calc(100% - 360px));
  min-width: 300px;
  padding: 10px;
  border-radius: 16px;
}

.sun-track-window svg {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 8px;
  overflow: visible;
}

.sun-track-window text {
  fill: rgba(233, 251, 255, 0.68);
  font-size: 10px;
}

.tropic-line {
  stroke: rgba(255, 209, 102, 0.48);
  stroke-dasharray: 4 4;
}

.equator-line {
  stroke: rgba(74, 165, 255, 0.52);
}

.term-guide {
  stroke: rgba(255, 255, 255, 0.13);
}

.track-path {
  fill: none;
  stroke: url(#trackGradient);
  stroke-width: 2.4;
}

.track-dot {
  fill: #ffd166;
  filter: drop-shadow(0 0 8px rgba(255, 209, 102, 0.85));
}

.timeline-dock {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 6;
  width: min(660px, 62vw);
  transform: translateX(-50%);
  padding: 9px 13px 8px;
  border-radius: 18px;
}

.timeline-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.timeline-label strong {
  font-size: 11px;
}

.term-scale {
  position: relative;
  height: 24px;
  margin: -3px 12px 5px 106px;
}

.term-scale button {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  appearance: none;
  min-width: 42px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 10px;
}


.term-scale i {
  display: block;
  width: 1px;
  height: 6px;
  margin: 0 auto 2px;
  background: rgba(255, 255, 255, 0.36);
}


.calendar-scale {
  display: flex;
  justify-content: space-between;
  padding: 0 4px 6px 112px;
  font-size: 10px;
  color: rgba(221, 250, 255, 0.48);
}

.hour-scale {
  display: flex;
  justify-content: space-between;
  margin-left: 106px;
  color: rgba(233, 251, 255, 0.52);
  font-size: 10px;
}

.track-reopen,
.panel-icon-btn {
  appearance: none;
  border: 1px solid rgba(46, 196, 182, 0.34);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.18), rgba(36, 124, 255, 0.14));
  color: #fff;
  box-shadow: 0 0 18px rgba(46, 196, 182, 0.16);
  cursor: pointer;
}

.track-reopen {
  position: absolute;
  right: 14px;
  top: 74px;
  z-index: 5;
  padding: 8px 12px;
  border-radius: 999px;
}

.panel-icon-btn {
  min-width: 44px;
  height: 24px;
  border-radius: 999px;
  font-size: 10px;
}

:deep(.el-button) {
  --el-button-bg-color: rgba(255, 255, 255, 0.05);
  --el-button-border-color: rgba(255, 255, 255, 0.13);
  --el-button-text-color: #e9fbff;
  --el-button-hover-bg-color: rgba(46, 196, 182, 0.18);
  --el-button-hover-border-color: rgba(46, 196, 182, 0.48);
  --el-button-hover-text-color: #fff;
  font-size: 11px;
}

:deep(.el-button--primary) {
  --el-button-bg-color: #2ec4b6;
  --el-button-border-color: #2ec4b6;
  --el-button-hover-bg-color: #37d9ca;
  --el-button-hover-border-color: #37d9ca;
}

:deep(.el-slider__runway) {
  background: rgba(255, 255, 255, 0.13);
}

:deep(.el-slider__bar) {
  background: linear-gradient(90deg, var(--theme), var(--blue));
}

:deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border-color: var(--theme);
}

:deep(.el-switch.is-checked .el-switch__core) {
  background: linear-gradient(90deg, var(--theme), var(--blue));
  border-color: transparent;
}

:deep(.el-select__wrapper) {
  min-height: 26px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  font-size: 11px;
}

@media (max-width: 980px) {
  .orbit-page {
    grid-template-columns: 238px minmax(0, 1fr);
  }

  .sun-track-window {
    display: none;
  }

  .timeline-dock {
    width: min(640px, calc(100% - 36px));
  }
}


.card-tip {
  margin: -2px 0 7px;
  color: rgba(233, 251, 255, 0.58);
  font-size: 10px;
  line-height: 1.45;
}

.scene-header {
  position: absolute;
  top: 12px;
  left: 14px;
  right: 14px;
  z-index: 7;
  display: grid;
  grid-template-columns: minmax(168px, 0.9fr) minmax(360px, 1.5fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 8px 12px;
  border-radius: 16px;
  pointer-events: auto;
}

.scene-title span {
  display: block;
  color: var(--theme);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.scene-title strong {
  display: block;
  margin-top: 2px;
  color: #fff;
  font-size: 14px;
  line-height: 1.2;
}

.scene-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.metric.mini {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
}

.metric.mini span {
  margin-bottom: 1px;
  font-size: 9px;
}

.metric.mini strong {
  font-size: 12px;
}

.accent-value {
  color: #35f2df !important;
  text-shadow: 0 0 10px rgba(46, 196, 182, 0.55);
}

.date-text {
  color: #ffd166;
  font-style: normal;
}

.scene-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: var(--muted);
  white-space: nowrap;
}

.top-stack {
  top: 76px;
  width: 300px;
}

.observation-panel {
  position: absolute;
  top: 76px;
  left: 14px;
  z-index: 6;
  width: 292px;
  max-height: 252px;
  padding: 9px;
  border-radius: 15px;
  overflow-y: auto;
  pointer-events: auto;
}

.obs-body dl {
  gap: 6px;
  margin-top: 8px;
}

.obs-body div {
  padding: 6px;
  border-radius: 9px;
}

.sun-track-window {
  top: 76px;
  width: min(390px, calc(100% - 350px));
  min-width: 300px;
}

.axis-line {
  stroke: rgba(233, 251, 255, 0.3);
  stroke-width: 1;
}

.axis-title {
  fill: rgba(233, 251, 255, 0.58);
  font-size: 9px;
}

.button-grid.two .el-button,
.preset-row .el-button,
.clear-btn {
  min-width: 0;
  width: 100%;
}

.button-grid.two :deep(.el-button + .el-button),
.preset-cloud :deep(.el-button + .el-button),
.preset-row :deep(.el-button + .el-button) {
  margin-left: 0;
}

.preset-cloud :deep(.el-button) {
  width: 100%;
  max-width: 100%;
  height: 23px;
  margin-left: 0;
  padding: 4px 7px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--theme), var(--blue));
  border-color: transparent;
  box-shadow: 0 0 16px rgba(46, 196, 182, 0.2);
}

:deep(.el-button:hover) {
  background-image: linear-gradient(135deg, rgba(46, 196, 182, 0.24), rgba(36, 124, 255, 0.2));
}

:deep(.el-slider__bar) {
  background: linear-gradient(90deg, #2ec4b6, #39a7ff, #6f7cff);
  box-shadow: 0 0 10px rgba(46, 196, 182, 0.42);
}

:deep(.el-slider__button) {
  width: 11px;
  height: 11px;
  border: 2px solid #eaffff;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  box-shadow: 0 0 14px rgba(46, 196, 182, 0.8);
}

:deep(.el-switch__core) {
  min-width: 34px;
  height: 18px;
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.16);
}

:deep(.el-switch__action) {
  width: 14px;
  height: 14px;
}

@media (max-width: 1120px) {
  .scene-header {
    grid-template-columns: 1fr auto;
  }
  .scene-metrics {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .observation-panel,
  .sun-track-window {
    top: 112px;
  }
}


/* v5 scrollbar polish */
.observation-panel::-webkit-scrollbar { width: 5px; }
.observation-panel::-webkit-scrollbar-track { background: transparent; }
.observation-panel::-webkit-scrollbar-thumb { border-radius: 999px; background: rgba(46, 196, 182, 0.32); }


/* v6 interaction polish */
:deep(.el-button) {
  border-radius: 999px !important;
}

.term-scale button {
  border-radius: 999px;
}

.preset-cloud :deep(.el-button) {
  border-radius: 999px !important;
}


/* v10 实时数据面板不再出现滚动条 */
.observation-panel {
  max-height: none !important;
  overflow: visible !important;
}


/* v11: icon buttons, darker-side fill, mobile layout */
.collapse-btn.icon-toggle {
  width: 30px;
  height: 30px;
  margin: 8px auto 6px;
  padding: 0;
  border-radius: 12px;
}

.collapse-btn.icon-toggle svg,
.small-icon-btn svg,
.obs-reopen svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.control-panel:not(.collapsed) .collapse-btn.icon-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  left: auto;
  margin: 0;
}

.control-panel.collapsed .collapse-btn.icon-toggle {
  width: 32px;
  height: 32px;
  margin: 8px 7px;
  writing-mode: initial;
  letter-spacing: 0;
}

.control-panel:not(.collapsed) .panel-scroll {
  padding-top: 40px;
}

.obs-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.small-icon-btn,
.panel-icon-btn.icon-only,
.obs-reopen {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(46, 196, 182, 0.36);
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.2), rgba(36, 124, 255, 0.18));
  color: #eaffff;
  box-shadow: 0 0 16px rgba(46, 196, 182, 0.18);
  cursor: pointer;
}

.small-icon-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 9px;
  font-size: 15px;
  line-height: 1;
}

.panel-icon-btn.icon-only {
  min-width: 26px;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 10px;
  font-size: 16px;
  line-height: 1;
}

.obs-reopen {
  position: absolute;
  top: 76px;
  left: 14px;
  z-index: 6;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  padding: 0;
}

.obs-reopen svg path,
.obs-reopen svg circle {
  fill: none;
  stroke: currentColor;
}

.track-reopen {
  min-width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 14px;
  font-size: 18px;
}

@media (max-width: 768px) {
  .orbit-page {
    display: block;
    height: 100dvh;
  }

  .viewport-wrap,
  .viewport {
    width: 100%;
    height: 100dvh;
  }

  .control-panel {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 30;
    width: min(320px, calc(100vw - 16px));
    height: auto;
    max-height: 58dvh;
    border: 1px solid rgba(46, 196, 182, 0.22);
    border-radius: 18px;
    overflow: hidden;
  }

  .control-panel.collapsed {
    width: 48px;
    height: 48px;
    border-radius: 16px;
  }

  .panel-scroll {
    height: auto;
    max-height: calc(58dvh - 42px);
    padding-bottom: 10px;
  }

  .scene-header {
    top: 8px;
    left: 64px;
    right: 8px;
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 8px;
    border-radius: 14px;
  }

  .scene-title strong {
    font-size: 12px;
  }

  .scene-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
  }

  .scene-actions {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .observation-panel {
    top: 142px;
    left: 8px;
    width: min(292px, calc(100vw - 16px));
    max-width: calc(100vw - 16px);
    padding: 8px;
  }

  .obs-reopen {
    top: 142px;
    left: 8px;
  }

  .sun-track-window {
    display: none;
  }

  .track-reopen {
    display: none;
  }

  .timeline-dock {
    left: 8px;
    right: 8px;
    bottom: 10px;
    width: auto;
    transform: none;
    padding: 8px;
    border-radius: 15px;
  }

  .timeline-row {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 7px;
  }

  .term-scale {
    margin-left: 78px;
    margin-right: 8px;
  }

  .calendar-scale {
    padding-left: 78px;
    font-size: 9px;
  }

  .hour-scale {
    margin-left: 78px;
    font-size: 9px;
  }

  .term-scale button {
    min-width: 32px;
    font-size: 9px;
  }
}

@media (max-width: 520px) {
  .control-panel:not(.collapsed) {
    width: calc(100vw - 16px);
    max-height: 50dvh;
  }

  .panel-scroll {
    max-height: calc(50dvh - 42px);
  }

  .scene-header {
    left: 60px;
  }

  .scene-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .metric.mini {
    padding: 5px 6px;
  }

  .metric.mini strong {
    font-size: 11px;
  }

  .observation-panel {
    top: 156px;
  }

  .timeline-dock {
    font-size: 10px;
  }
}


/* v13: header compacting, sub-camera panel, SVG and timeline fixes */
.scene-header {
  grid-template-columns: minmax(150px, 0.72fr) minmax(420px, 1.55fr) auto !important;
}
.scene-metrics {
  grid-template-columns: minmax(86px, .7fr) minmax(96px, .75fr) minmax(160px, 1.35fr) minmax(88px, .7fr) !important;
}
.metric.mini {
  min-height: 36px;
  padding: 5px 8px !important;
}
.metric.mini:not(.date-card) {
  max-width: 130px;
}
.metric.mini.date-card {
  min-width: 150px;
}
.metric.mini span {
  font-size: 8.5px !important;
}
.metric.mini strong {
  font-size: 11px !important;
}
.metric.mini.date-card strong {
  font-size: 12px !important;
}
.scene-actions {
  gap: 6px !important;
}
.header-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(46, 196, 182, .34);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(46,196,182,.20), rgba(36,124,255,.18));
  color: #eaffff;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 0 14px rgba(46,196,182,.15);
  cursor: pointer;
}
.header-icon-btn:hover {
  border-color: rgba(46,196,182,.72);
  box-shadow: 0 0 18px rgba(46,196,182,.32);
}
.header-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(233,251,255,.68);
  font-size: 10px;
  white-space: nowrap;
}
.obs-track-card {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  background: rgba(255,255,255,.035);
}
.obs-track-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.obs-track-svg {
  display: block;
  width: 100%;
  height: 112px;
  margin-top: 6px;
  overflow: visible;
}
.obs-track-svg text {
  fill: rgba(233,251,255,.66);
  font-size: 8px;
}
.obs-track-svg .axis-line {
  stroke: rgba(233,251,255,.28);
  stroke-width: 1;
}
.obs-track-path {
  fill: none;
  stroke-width: 2.2;
}
.sub-scene-window {
  position: absolute;
  top: 76px;
  right: 14px;
  z-index: 6;
  width: min(360px, calc(100% - 640px));
  min-width: 280px;
  padding: 9px;
  border-radius: 16px;
  pointer-events: auto;
}
.sub-scene-window header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}
.sub-scene-window span {
  display: block;
  color: rgba(233,251,255,.55);
  font-size: 9px;
}
.sub-scene-window strong {
  display: block;
  margin-top: 1px;
  color: #eaffff;
  font-size: 12px;
}
.sub-canvas {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px solid rgba(46,196,182,.22);
  border-radius: 12px;
  background: #020713;
}
.sub-view-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 7px;
}
.sub-view-tabs button {
  min-width: 0;
  height: 24px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 999px;
  background: rgba(255,255,255,.045);
  color: rgba(233,251,255,.76);
  font-size: 10px;
  cursor: pointer;
}
.sub-view-tabs button.active {
  border-color: rgba(46,196,182,.55);
  background: linear-gradient(135deg, rgba(46,196,182,.28), rgba(36,124,255,.22));
  color: #fff;
}
.calendar-scale {
  position: relative !important;
  display: block !important;
  height: 18px;
  margin: -1px 12px 5px 106px;
  padding: 0 !important;
  color: rgba(221,250,255,.52);
}
.calendar-scale span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 10px;
}
.calendar-scale span:first-child { transform: translateX(0); }
.calendar-scale span:last-child { transform: translateX(-100%); }
@media (max-width: 1320px) {
  .sub-scene-window {
    width: 300px;
    min-width: 260px;
  }
  .scene-header {
    grid-template-columns: minmax(130px, .6fr) 1fr auto !important;
  }
}
@media (max-width: 1120px) {
  .scene-header {
    grid-template-columns: 1fr auto !important;
  }
  .scene-metrics {
    grid-template-columns: repeat(4, minmax(72px, 1fr)) !important;
  }
  .sub-scene-window {
    top: 124px;
    right: 10px;
    width: 270px;
  }
}
@media (max-width: 768px) {
  .scene-actions {
    position: static !important;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .header-toggle span {
    font-size: 9px;
  }
  .sub-scene-window {
    top: auto;
    right: 8px;
    bottom: 116px;
    width: min(260px, calc(100vw - 16px));
    min-width: 0;
    padding: 7px;
  }
  .sub-view-tabs {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  .sub-view-tabs button {
    height: 22px;
    font-size: 9px;
  }
  .calendar-scale {
    margin-left: 78px !important;
    margin-right: 8px !important;
  }
}
@media (max-width: 520px) {
  .scene-metrics {
    grid-template-columns: 1fr 1fr !important;
  }
  .metric.mini:not(.date-card), .metric.mini.date-card {
    max-width: none;
    min-width: 0;
  }
  .sub-scene-window {
    display: block;
    bottom: 112px;
    width: min(220px, calc(100vw - 16px));
  }
  .sub-canvas {
    aspect-ratio: 4 / 3;
  }
  .sub-scene-window header span,
  .sub-scene-window header strong {
    font-size: 9px;
  }
}


/* v14: 副机位、SVG、时间轴与 Header 微调 */
.scene-title {
  display: grid;
  gap: 2px;
}
.scene-title span {
  letter-spacing: 0.16em;
}
.scene-actions .header-icon-btn[title="俯视视角"],
.scene-actions .header-icon-btn[title="仰视视角"] {
  display: none !important;
}
.calendar-scale-row,
.calendar-scale {
  display: none !important;
}
.obs-track-card {
  margin-top: 8px;
  padding: 4px 4px 2px;
  border: 0;
  background: transparent;
}
.obs-track-head {
  display: none !important;
}
.obs-track-svg {
  height: 120px;
  margin-top: 0;
}
.obs-track-path {
  fill: none;
  stroke: url(#trackGradientObs) !important;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.98;
  filter: drop-shadow(0 0 5px rgba(46,196,182,.45));
}
.obs-track-svg text {
  font-size: 8.5px;
}
.sub-scene-window {
  width: 360px;
  height: 268px;
  min-width: 260px;
  min-height: 210px;
  max-width: calc(100vw - 40px);
  max-height: calc(100dvh - 150px);
}
.sub-scene-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}
.sub-title {
  min-width: 0;
}
.sub-title span {
  display: block;
  font-size: 9px;
  color: rgba(233,251,255,.56);
  letter-spacing: .08em;
}
.sub-title strong {
  display: block;
  margin-top: 2px;
  color: #eaffff;
  font-size: 13px;
}
.sub-view-select {
  width: 118px;
  flex: 0 0 auto;
}
.sub-canvas {
  height: calc(100% - 43px);
  aspect-ratio: auto;
}
.sub-view-tabs {
  display: none !important;
}
.sub-resize-handle {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 18px;
  height: 18px;
  border: 0;
  border-right: 2px solid rgba(46,196,182,.8);
  border-bottom: 2px solid rgba(46,196,182,.8);
  background: linear-gradient(135deg, transparent 0 46%, rgba(46,196,182,.25) 46% 54%, transparent 54%);
  border-radius: 3px;
  cursor: nwse-resize;
  opacity: .85;
}
.sub-resize-handle:hover {
  opacity: 1;
  filter: drop-shadow(0 0 8px rgba(46,196,182,.65));
}
@media (max-width: 768px) {
  .sub-scene-window {
    width: min(300px, calc(100vw - 16px)) !important;
    height: 230px !important;
    bottom: 116px;
  }
  .sub-view-select {
    width: 104px;
  }
}
@media (max-width: 520px) {
  .sub-scene-window {
    width: min(240px, calc(100vw - 16px)) !important;
    height: 200px !important;
  }
  .sub-title strong {
    font-size: 10px;
  }
}


/* v15: 修正副机位、时间轴、标题层级和按钮密度 */
.scene-header {
  grid-template-columns: minmax(220px, .92fr) minmax(360px, 1.18fr) auto !important;
  align-items: center !important;
}
.scene-title {
  gap: 2px !important;
}
.scene-title strong {
  display: block;
  color: #f2feff !important;
  font-size: 15px !important;
  line-height: 1.25;
  letter-spacing: .02em;
}
.scene-title span {
  display: block;
  color: #2ec4b6 !important;
  font-size: 9px !important;
  line-height: 1.1;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.scene-metrics {
  display: grid !important;
  grid-template-columns: minmax(92px, .7fr) minmax(108px, .78fr) minmax(172px, 1.3fr) !important;
  align-items: stretch !important;
  gap: 8px !important;
}
.metric.mini {
  width: 100%;
  max-width: none !important;
  min-height: 38px;
}

.timeline-dock {
  width: min(740px, calc(100% - 72px)) !important;
}
.timeline-row {
  display: block !important;
  margin-bottom: 3px;
}
.timeline-label {
  display: flex !important;
  align-items: baseline;
  justify-content: flex-start;
  gap: 9px;
  width: 100%;
  margin: 0 0 4px 0;
  text-align: left;
}
.timeline-label span {
  min-width: auto !important;
  color: rgba(233,251,255,.64);
  font-size: 10px;
}
.timeline-label strong {
  color: #f6feff;
  font-size: 12px;
}
.term-scale-row,
.hour-scale {
  margin-left: 0 !important;
  padding-left: 0 !important;
}
.term-scale-row > div:first-child {
  display: none !important;
}
.term-scale {
  margin: 0 12px 12px 12px !important;
}
.hour-scale {
  margin: 0 12px !important;
}

.sub-scene-head {
  align-items: center !important;
  gap: 10px;
}
.sub-title strong {
  font-size: 13px !important;
  color: #f2feff !important;
}
.sub-title span {
  font-size: 9px !important;
  color: rgba(46,196,182,.88) !important;
  letter-spacing: .12em;
}
.sub-view-select {
  width: 124px !important;
  flex: 0 0 auto;
}
.sub-resize-handle {
  left: -1px !important;
  right: auto !important;
  bottom: -1px !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 0 12px 0 14px !important;
  cursor: nesw-resize !important;
  background: linear-gradient(135deg, rgba(46,196,182,.32), rgba(36,124,255,.20)) !important;
}
.sub-resize-handle::before,
.sub-resize-handle::after {
  left: 5px !important;
  right: auto !important;
}

.preset-cloud :deep(.el-button) {
  height: 22px !important;
  padding: 0 8px !important;
  font-size: 10px !important;
  line-height: 20px !important;
  min-width: 0 !important;
}
.clear-btn {
  font-size: 10px !important;
  height: 24px !important;
}
.control-panel:not(.collapsed) .collapse-btn.icon-toggle {
  right: 22px !important;
}
.control-panel.collapsed .collapse-btn.icon-toggle {
  margin-left: 5px !important;
  margin-right: 0 !important;
}
.obs-actions {
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .scene-header {
    grid-template-columns: 1fr !important;
  }
  .scene-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .timeline-dock {
    width: auto !important;
  }
  .term-scale {
    margin-left: 8px !important;
    margin-right: 8px !important;
  }
}
@media (max-width: 520px) {
  .scene-metrics {
    grid-template-columns: 1fr 1fr !important;
  }
  .metric.date-card {
    grid-column: 1 / -1;
  }
}


/* v16: 面板宽度、SVG 轨迹、Header 上下布局与相机交互优化 */
.scene-header {
  grid-template-columns: minmax(0, 1fr) auto !important;
  grid-template-rows: auto auto !important;
  align-items: start !important;
  gap: 7px 12px !important;
  padding: 9px 12px 10px !important;
}
.scene-title {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
}
.scene-actions {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
}
.scene-metrics {
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid !important;
  grid-template-columns: minmax(96px, 120px) minmax(112px, 136px) minmax(182px, 240px) !important;
  justify-content: start;
  align-items: stretch !important;
  gap: 8px !important;
}
.scene-title strong {
  color: #f4ffff !important;
  font-size: 14px !important;
  font-weight: 850;
  letter-spacing: .01em;
}
.scene-title span {
  margin-top: 2px;
  color: rgba(46,196,182,.86) !important;
  font-size: 8.5px !important;
  letter-spacing: .20em;
}
.metric.mini {
  min-height: 34px !important;
  padding: 5px 8px !important;
}
.metric.mini span {
  color: rgba(206,235,240,.54) !important;
  font-size: 8.5px !important;
}
.metric.mini strong {
  font-size: 11px !important;
}

.observation-panel {
  width: 258px !important;
  max-width: 258px !important;
  padding: 8px !important;
}
.obs-head span {
  color: rgba(46,196,182,.82) !important;
  font-size: 9px !important;
  letter-spacing: .06em;
}
.obs-head strong {
  color: #f4ffff !important;
  font-size: 13px !important;
  font-weight: 850;
}
.obs-body dl {
  gap: 5px !important;
}
.obs-body div {
  padding: 5px 6px !important;
  border-radius: 8px !important;
}
.obs-body dt {
  color: rgba(206,235,240,.52) !important;
  font-size: 9px !important;
}
.obs-body dd {
  font-size: 10.5px !important;
}
.obs-track-card {
  width: 100% !important;
  margin: 7px 0 0 !important;
  padding: 0 !important;
}
.obs-track-svg {
  width: 100% !important;
  height: 104px !important;
  display: block !important;
  overflow: visible;
}
.obs-track-svg text {
  font-size: 7.8px !important;
}
.obs-track-path {
  fill: none !important;
  stroke: url(#trackGradientObs) !important;
  stroke-width: 2.8 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
  opacity: 1 !important;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 5px rgba(46,196,182,.58));
}

.control-card .card-title {
  color: rgba(234,255,255,.88) !important;
  font-size: 11px !important;
  font-weight: 850;
  letter-spacing: .02em;
}
.card-tip {
  margin: 0 0 7px !important;
  color: rgba(206,235,240,.48) !important;
  font-size: 9px !important;
  line-height: 1.42 !important;
}
.preset-cloud {
  gap: 5px !important;
}
.preset-cloud :deep(.el-button) {
  height: 20px !important;
  min-height: 20px !important;
  padding: 0 6px !important;
  font-size: 9px !important;
  line-height: 18px !important;
}
.preset-cloud :deep(.el-button > span),
.preset-cloud :deep(.el-button span) {
  font-size: 9px !important;
  line-height: 18px !important;
  transform: scale(.92);
  transform-origin: center;
}
.clear-btn {
  height: 22px !important;
  font-size: 9px !important;
}

@media (max-width: 768px) {
  .scene-header {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto auto !important;
  }
  .scene-actions {
    grid-column: 1 !important;
    grid-row: 2 !important;
    justify-content: flex-start !important;
  }
  .scene-metrics {
    grid-column: 1 !important;
    grid-row: 3 !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .observation-panel {
    width: min(258px, calc(100vw - 16px)) !important;
    max-width: calc(100vw - 16px) !important;
  }
}
@media (max-width: 520px) {
  .scene-metrics {
    grid-template-columns: 1fr 1fr !important;
  }
  .metric.date-card,
  .metric.mini.date-card {
    grid-column: 1 / -1;
  }
}


/* v17: Header 独占一行，主体容器独立分区 */
.orbit-page {
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: 66px minmax(0, 1fr) !important;
  height: 100dvh !important;
}

.app-header.scene-header {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  z-index: 20 !important;
  grid-row: 1 !important;
  margin: 6px 8px 0 !important;
  min-height: 54px !important;
  display: grid !important;
  grid-template-columns: minmax(260px, .85fr) minmax(420px, 1.35fr) auto !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 8px 12px !important;
  border-radius: 15px !important;
}

.app-main {
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 258px minmax(0, 1fr);
  overflow: hidden;
}

.orbit-page.is-collapsed .app-main {
  grid-template-columns: 40px minmax(0, 1fr);
}

.app-main .control-panel {
  height: 100%;
}

.app-main .panel-scroll {
  height: calc(100dvh - 66px - 40px) !important;
}

.viewport-wrap,
.viewport {
  min-height: 0 !important;
  height: 100% !important;
}

.viewport {
  border-top: 1px solid rgba(46, 196, 182, .12);
}

.observation-panel {
  top: 12px !important;
  left: 12px !important;
}

.obs-reopen {
  top: 12px !important;
  left: 12px !important;
}

.sub-scene-window {
  top: 12px !important;
  right: 12px !important;
}

.timeline-dock {
  bottom: 14px !important;
  width: min(740px, calc(100% - 84px)) !important;
}

.timeline-row {
  display: block !important;
  margin-bottom: 4px !important;
}

.timeline-label {
  display: flex !important;
  align-items: baseline !important;
  justify-content: space-between !important;
  gap: 14px !important;
  width: 100% !important;
  margin: 0 0 5px !important;
  padding: 0 2px !important;
}

.timeline-label span {
  margin: 0 !important;
  color: rgba(233, 251, 255, .66) !important;
  font-size: 10px !important;
  font-weight: 650 !important;
}

.timeline-label strong {
  margin: 0 !important;
  color: #2ff7e6 !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  text-shadow: 0 0 12px rgba(46, 196, 182, .38);
}

.term-scale-row,
.hour-scale {
  margin-left: 0 !important;
  padding-left: 0 !important;
}

.term-scale-row > div:first-child {
  display: none !important;
}

.term-scale {
  margin: 0 12px 12px 12px !important;
}

.hour-scale {
  margin: 0 12px !important;
}

.scene-title strong {
  color: #f2feff !important;
  font-size: 15px !important;
}

.scene-title span {
  color: rgba(46, 196, 182, .92) !important;
}

.scene-metrics {
  align-items: stretch !important;
}

.metric.mini strong,
.metric.mini .accent-value,
.date-text {
  color: #2ff7e6 !important;
}

.metric.mini.date-card strong,
.metric.mini.date-card .date-text {
  color: #ffd166 !important;
}

@media (max-width: 1120px) {
  .orbit-page {
    grid-template-rows: 96px minmax(0, 1fr) !important;
  }
  .app-header.scene-header {
    grid-template-columns: 1fr auto !important;
    align-content: center !important;
  }
  .app-header .scene-metrics {
    grid-column: 1 / -1 !important;
    grid-row: 2 !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .app-main .panel-scroll {
    height: calc(100dvh - 96px - 40px) !important;
  }
}

@media (max-width: 768px) {
  .orbit-page {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) !important;
  }
  .app-header.scene-header {
    margin: 6px 6px 0 !important;
    grid-template-columns: 1fr !important;
    gap: 6px !important;
    padding: 8px !important;
  }
  .app-header .scene-actions {
    position: static !important;
    justify-content: flex-start !important;
  }
  .app-main {
    position: relative;
    display: block;
  }
  .app-main .control-panel {
    position: absolute;
    top: 8px;
    left: 8px;
  }
  .app-main .panel-scroll {
    height: auto !important;
  }
  .observation-panel {
    top: 70px !important;
  }
  .sub-scene-window {
    top: auto !important;
    right: 8px !important;
    bottom: 116px !important;
  }
  .timeline-dock {
    width: auto !important;
    left: 8px !important;
    right: 8px !important;
    transform: none !important;
  }
}


/* v18: header as a true independent row, compact timeline, SVG label offset, no left bottom void */
.orbit-page {
  grid-template-rows: 86px minmax(0, 1fr) !important;
}

.app-header.scene-header {
  position: relative !important;
  box-sizing: border-box !important;
  height: 74px !important;
  min-height: 74px !important;
  max-height: 74px !important;
  margin: 6px 8px 6px !important;
  padding: 10px 12px !important;
  overflow: hidden !important;
  display: grid !important;
  grid-template-columns: minmax(230px, 320px) minmax(430px, 1fr) auto !important;
  grid-template-rows: 1fr !important;
  align-items: center !important;
  column-gap: 12px !important;
  row-gap: 0 !important;
}

.app-header .scene-title {
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 2px !important;
}

.app-header .scene-title strong {
  font-size: 14px !important;
  line-height: 1.15 !important;
  color: #f2feff !important;
}

.app-header .scene-title span {
  font-size: 9px !important;
  letter-spacing: .16em !important;
  color: rgba(46,196,182,.92) !important;
}

.app-header .scene-metrics {
  grid-column: auto !important;
  grid-row: auto !important;
  min-width: 0 !important;
  width: 100% !important;
  display: grid !important;
  grid-template-columns: minmax(96px, .72fr) minmax(118px, .82fr) minmax(190px, 1.22fr) !important;
  gap: 8px !important;
  align-items: center !important;
  align-self: center !important;
  overflow: hidden !important;
}

.app-header .metric.mini {
  box-sizing: border-box !important;
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  max-width: none !important;
  min-width: 0 !important;
  padding: 5px 9px !important;
  overflow: hidden !important;
}

.app-header .metric.mini span {
  display: block !important;
  margin: 0 0 2px !important;
  font-size: 8px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}

.app-header .metric.mini strong {
  display: block !important;
  font-size: 11px !important;
  line-height: 1.1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.app-header .scene-actions {
  position: static !important;
  grid-column: auto !important;
  grid-row: auto !important;
  align-self: center !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  min-width: max-content !important;
}

.app-main .panel-scroll {
  height: calc(100dvh - 86px) !important;
  padding: 4px 8px 4px !important;
  box-sizing: border-box !important;
}

.app-main .control-panel {
  min-height: 0 !important;
}

.control-card:last-child {
  margin-bottom: 4px !important;
}

.preset-cloud {
  margin-bottom: 0 !important;
}

.clear-btn {
  margin-bottom: 0 !important;
}

/* 太阳直射点 SVG：纬度标签往右收，避免贴住/越出左边界 */
.obs-track-svg text {
  font-size: 7.6px !important;
}

/* 底部时间轴更矮，减少遮挡 */
.timeline-dock {
  width: min(720px, calc(100% - 96px)) !important;
  padding: 7px 12px 6px !important;
  border-radius: 15px !important;
}

.timeline-row {
  margin-bottom: 1px !important;
}

.timeline-label {
  margin: 0 0 2px !important;
  padding: 0 1px !important;
}

.timeline-label span {
  font-size: 9px !important;
}

.timeline-label strong {
  font-size: 11px !important;
}

.timeline-dock :deep(.el-slider) {
  --el-slider-height: 4px;
  height: 20px !important;
}

.timeline-dock :deep(.el-slider__runway) {
  margin: 8px 0 !important;
}

.term-scale {
  height: 18px !important;
  margin: 0 10px 5px 10px !important;
}

.term-scale i {
  height: 5px !important;
  margin-bottom: 1px !important;
}

.term-scale button {
  font-size: 9px !important;
}

.hour-scale {
  margin: 0 10px !important;
  font-size: 9px !important;
}

@media (max-width: 1120px) {
  .orbit-page {
    grid-template-rows: 116px minmax(0, 1fr) !important;
  }

  .app-header.scene-header {
    height: 104px !important;
    min-height: 104px !important;
    max-height: 104px !important;
    grid-template-columns: 1fr auto !important;
    grid-template-rows: auto auto !important;
    align-content: center !important;
  }

  .app-header .scene-metrics {
    grid-column: 1 / -1 !important;
    grid-row: 2 !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .app-header .scene-actions {
    grid-column: 2 !important;
    grid-row: 1 !important;
  }

  .app-main .panel-scroll {
    height: calc(100dvh - 116px) !important;
  }
}

@media (max-width: 768px) {
  .orbit-page {
    grid-template-rows: auto minmax(0, 1fr) !important;
  }

  .app-header.scene-header {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 6px !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto auto !important;
  }

  .app-header .scene-actions {
    grid-column: 1 !important;
    grid-row: 2 !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
  }

  .app-header .scene-metrics {
    grid-column: 1 !important;
    grid-row: 3 !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .app-main .panel-scroll {
    height: auto !important;
    max-height: calc(58dvh - 42px) !important;
  }

  .timeline-dock {
    width: auto !important;
    padding: 6px 8px 5px !important;
  }
}

@media (max-width: 520px) {
  .app-header .scene-metrics {
    grid-template-columns: 1fr 1fr !important;
  }
}


/* v19: current solar term is the last passed term; brighten sub-camera select */
.sub-scene-head {
  align-items: center !important;
  gap: 10px !important;
}

.sub-title span {
  color: #eaffff !important;
  font-size: 13px !important;
  line-height: 1.15 !important;
  font-weight: 900 !important;
  letter-spacing: .03em !important;
}

.sub-title strong {
  display: none !important;
}

.sub-view-select {
  width: 126px !important;
  flex: 0 0 126px !important;
}

.sub-view-select :deep(.el-select__wrapper) {
  min-height: 30px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(46, 196, 182, 0.7) !important;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.26), rgba(36, 124, 255, 0.24)) !important;
  box-shadow: 0 0 16px rgba(46, 196, 182, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
}

.sub-view-select :deep(.el-select__selected-item),
.sub-view-select :deep(.el-select__placeholder) {
  color: #eaffff !important;
  font-size: 11px !important;
  font-weight: 800 !important;
}

.sub-view-select :deep(.el-select__caret) {
  color: #35f2df !important;
}

.timeline-label strong {
  color: #35f2df !important;
}


/* v20: Header 单行化、底部信息迁移、场景侧边收起按钮 */
.orbit-page {
  display: grid !important;
  grid-template-columns: 100% !important;
  grid-template-rows: 72px minmax(0, 1fr) !important;
  height: 100dvh !important;
}
.app-main {
  grid-row: 2;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
}
.orbit-page.is-collapsed .app-main {
  grid-template-columns: 0 minmax(0, 1fr);
}
.app-header.scene-header {
  position: relative !important;
  grid-row: 1;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  z-index: 20;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 14px !important;
  width: auto !important;
  height: 58px !important;
  min-height: 58px !important;
  margin: 7px 8px 6px !important;
  padding: 8px 12px !important;
  border-radius: 16px !important;
}
.scene-title {
  min-width: 0;
}
.scene-title strong {
  font-size: 14px !important;
  line-height: 1.15 !important;
  white-space: nowrap;
}
.scene-title span {
  margin-top: 3px;
  font-size: 8.5px !important;
  letter-spacing: .16em !important;
}
.scene-metrics {
  display: none !important;
}
.scene-actions {
  flex: 0 0 auto;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  position: static !important;
}
.control-panel {
  grid-column: 1;
  height: 100% !important;
  transition: width .24s ease, opacity .24s ease, transform .24s ease;
}
.orbit-page.is-collapsed .control-panel {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
  pointer-events: none;
  border-right: 0;
  transform: translateX(-8px);
}
.viewport-wrap {
  grid-column: 2;
  min-height: 0;
}
.panel-scroll {
  height: 100% !important;
  padding: 8px 8px 8px !important;
}
.collapse-btn.icon-toggle {
  display: none !important;
}
.panel-edge-toggle {
  position: absolute;
  left: 10px;
  top: 50%;
  z-index: 18;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 46px;
  transform: translateY(-50%);
  border: 1px solid rgba(46, 196, 182, .46);
  border-radius: 0 16px 16px 0;
  background: linear-gradient(135deg, rgba(6, 22, 36, .82), rgba(46, 196, 182, .18));
  color: #eaffff;
  box-shadow: 0 0 24px rgba(46, 196, 182, .26);
  cursor: pointer;
  pointer-events: auto;
}
.panel-edge-toggle svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.timeline-dock {
  display: grid !important;
  grid-template-columns: 176px minmax(0, 1fr) !important;
  gap: 12px !important;
  align-items: stretch !important;
  width: min(790px, calc(100% - 90px)) !important;
  padding: 8px 12px !important;
  bottom: 12px !important;
}
.timeline-info-cards {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 7px;
  min-width: 0;
}
.timeline-info-card {
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  background: rgba(255,255,255,.04);
}
.timeline-info-card span {
  display: block;
  color: rgba(233,251,255,.58);
  font-size: 9px;
  line-height: 1;
  margin-bottom: 4px;
}
.timeline-info-card strong {
  display: block;
  color: #f6feff;
  font-size: 12px;
  line-height: 1.1;
  white-space: nowrap;
}
.timeline-main {
  min-width: 0;
}
.timeline-row {
  display: block !important;
  margin: 0 0 1px 0 !important;
}
.timeline-label.between {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  width: 100% !important;
  margin: 0 0 2px 0 !important;
}
.timeline-label.between span {
  margin: 0 !important;
  color: rgba(233,251,255,.64) !important;
  font-size: 10px !important;
}
.timeline-label.between strong {
  margin: 0 !important;
  color: #35f2df !important;
  font-size: 12px !important;
  text-shadow: 0 0 10px rgba(46,196,182,.52);
}
.term-scale-row,
.hour-scale {
  margin-left: 0 !important;
  padding-left: 0 !important;
}
.term-scale-row > div:first-child {
  display: none !important;
}
.term-scale {
  height: 20px !important;
  margin: -2px 10px 4px 10px !important;
}
.hour-scale {
  margin: -2px 10px 0 !important;
  font-size: 9px !important;
}
.timeline-dock :deep(.el-slider) {
  --el-slider-height: 5px;
}
.timeline-dock :deep(.el-slider__runway) {
  margin: 9px 0 !important;
}

@media (max-width: 980px) {
  .orbit-page {
    grid-template-rows: auto minmax(0, 1fr) !important;
  }
  .app-header.scene-header {
    height: auto !important;
    min-height: 54px !important;
    align-items: flex-start !important;
    flex-wrap: wrap;
    gap: 8px 10px !important;
  }
  .scene-title {
    flex: 1 1 260px;
  }
  .scene-title strong {
    white-space: normal;
  }
  .scene-actions {
    flex: 1 1 auto;
    justify-content: flex-end !important;
    flex-wrap: wrap;
  }
  .app-main {
    grid-template-columns: min(238px, 46vw) minmax(0, 1fr);
  }
  .timeline-dock {
    grid-template-columns: 150px minmax(0, 1fr) !important;
    width: min(720px, calc(100% - 32px)) !important;
  }
}
@media (max-width: 768px) {
  .app-main {
    display: block;
    position: relative;
  }
  .control-panel {
    position: absolute !important;
    left: 8px;
    top: 8px;
    z-index: 30;
    width: min(300px, calc(100vw - 16px)) !important;
    max-height: calc(100dvh - 98px);
    border-radius: 18px;
    border: 1px solid rgba(46,196,182,.24);
  }
  .orbit-page.is-collapsed .control-panel {
    width: 0 !important;
    opacity: 0;
  }
  .viewport-wrap,
  .viewport {
    width: 100%;
    height: 100%;
  }
  .panel-edge-toggle {
    left: 8px;
    width: 34px;
    height: 42px;
  }
  .timeline-dock {
    grid-template-columns: 1fr !important;
    gap: 7px !important;
    left: 8px !important;
    right: 8px !important;
    width: auto !important;
    transform: none !important;
    padding: 8px !important;
  }
  .timeline-info-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: auto;
  }
  .timeline-info-card {
    padding: 6px 8px;
  }
  .timeline-info-card strong {
    font-size: 11px;
  }
}
@media (max-width: 520px) {
  .app-header.scene-header {
    margin: 6px;
    padding: 8px;
    border-radius: 14px !important;
  }
  .scene-title strong {
    font-size: 12px !important;
  }
  .scene-title span {
    font-size: 8px !important;
  }
  .scene-actions {
    gap: 6px !important;
    justify-content: flex-start !important;
  }
  .header-toggle span {
    font-size: 9px !important;
  }
  .timeline-info-cards {
    grid-template-columns: 1fr;
  }
  .timeline-dock {
    bottom: 8px !important;
  }
}


/* v21: compact side toggle, restore solstice/equinox ticks, stronger title hierarchy */
.panel-edge-toggle {
  width: 24px !important;
  height: 34px !important;
  left: 6px !important;
  border-radius: 0 12px 12px 0 !important;
  padding: 0 !important;
  box-shadow: 0 0 14px rgba(46, 196, 182, .22) !important;
}
.panel-edge-toggle svg {
  width: 13px !important;
  height: 13px !important;
  stroke-width: 2.2 !important;
}
.orbit-page.is-collapsed .panel-edge-toggle {
  left: 4px !important;
}
.control-card .card-title,
.card-title,
.sub-title span {
  color: #2ec4b6 !important;
  text-shadow: 0 0 12px rgba(46, 196, 182, .42) !important;
  letter-spacing: .04em;
  font-weight: 900 !important;
}
.control-card .card-title::before {
  background: linear-gradient(180deg, #2ec4b6, #47a3ff) !important;
  box-shadow: 0 0 12px rgba(46,196,182,.55) !important;
}
.sub-title span {
  font-size: 13px !important;
  line-height: 1.2 !important;
}
.sub-scene-head {
  align-items: center !important;
}
.obs-head-v21 {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 10px !important;
  margin-bottom: 8px !important;
}
.obs-title-main {
  color: #2ec4b6 !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  letter-spacing: .08em !important;
  text-shadow: 0 0 10px rgba(46,196,182,.45) !important;
}
.obs-place-row {
  min-width: 0;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 7px !important;
}
.obs-place-row strong {
  display: inline-block !important;
  min-width: 0;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f4feff !important;
  font-size: 13px !important;
}
.obs-head-v21 .small-icon-btn {
  flex: 0 0 auto;
  width: 22px !important;
  height: 22px !important;
  border-radius: 8px !important;
}
.term-scale-row {
  display: block !important;
  height: 23px !important;
  margin: -2px 10px 2px !important;
  padding: 0 !important;
}
.term-scale-row > div:first-child,
.term-scale-row .scale-track,
.term-scale-row .term-scale {
  display: block !important;
}
.term-scale {
  position: relative !important;
  height: 23px !important;
  margin: 0 !important;
}
.term-scale button {
  display: inline-flex !important;
  position: absolute !important;
  top: 0 !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  transform: translateX(-50%) !important;
  min-width: 34px !important;
  height: 23px !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: rgba(233, 251, 255, .76) !important;
  font-size: 9px !important;
  line-height: 1 !important;
  cursor: pointer;
}
.term-scale button i {
  display: block !important;
  width: 1px !important;
  height: 6px !important;
  margin-bottom: 4px !important;
  border-radius: 0 !important;
  background: rgba(233,251,255,.36) !important;
  box-shadow: none !important;
}
.term-scale button span {
  display: block !important;
  white-space: nowrap;
}
.term-scale button:hover span {
  color: #2ec4b6 !important;
  text-shadow: 0 0 10px rgba(46,196,182,.45);
}
@media (max-width: 768px) {
  .panel-edge-toggle {
    width: 24px !important;
    height: 32px !important;
    left: 5px !important;
  }
  .obs-head-v21 {
    gap: 8px !important;
  }
  .obs-place-row strong {
    max-width: 145px;
  }
  .term-scale button {
    min-width: 30px !important;
    font-size: 8.5px !important;
  }
}


/* v22: Header switches control realtime panel and timeline dock */
.app-header .scene-actions {
  display: flex !important;
  align-items: center;
  justify-content: flex-end;
  gap: 10px !important;
  flex-wrap: wrap;
}

.app-header .header-toggle {
  min-height: 26px;
  padding: 3px 7px;
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
}

.app-header .header-toggle span {
  color: rgba(225, 250, 255, 0.78);
  font-size: 10px;
  font-weight: 650;
}

.app-header .header-icon-btn {
  flex: 0 0 auto;
}

@media (max-width: 920px) {
  .app-header.scene-header {
    align-items: flex-start !important;
    gap: 8px !important;
  }

  .app-header .scene-actions {
    width: 100%;
    justify-content: flex-start !important;
    gap: 6px !important;
  }

  .app-header .header-toggle {
    padding: 2px 6px;
  }

  .app-header .header-toggle span {
    font-size: 9px;
  }
}

@media (max-width: 560px) {
  .app-header .scene-actions {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .app-header .header-icon-btn,
  .app-header .header-toggle {
    width: 100%;
  }

  .app-header .header-toggle {
    justify-content: space-between;
  }
}

/* v23: observation panel header cleanup */
.obs-head-v21 {
  grid-template-columns: auto minmax(0, 1fr) !important;
}
.obs-title-main {
  color: #2ec4b6 !important;
  font-size: 12px !important;
  font-weight: 900 !important;
  letter-spacing: .04em !important;
  line-height: 1.2 !important;
  text-shadow: 0 0 12px rgba(46,196,182,.45) !important;
}
.obs-place-row {
  justify-content: flex-end !important;
  gap: 0 !important;
}
.obs-place-row strong {
  max-width: 180px !important;
  font-size: 13px !important;
}


/* v24: observation panel title emphasis */
.observation-panel .obs-head-v21 {
  grid-template-columns: auto minmax(0, 1fr) !important;
  align-items: center !important;
  column-gap: 12px !important;
  padding-bottom: 7px !important;
  border-bottom: 1px solid rgba(46, 196, 182, 0.16) !important;
}

.observation-panel .obs-head-v21 .obs-title-main {
  display: inline-flex !important;
  align-items: center !important;
  color: #2ec4b6 !important;
  font-size: 16px !important;
  font-weight: 950 !important;
  line-height: 1 !important;
  letter-spacing: 0.03em !important;
  text-shadow: 0 0 14px rgba(46,196,182,.56), 0 0 28px rgba(71,163,255,.20) !important;
}

.observation-panel .obs-head-v21 .obs-title-main::before {
  content: '';
  width: 3px;
  height: 15px;
  margin-right: 7px;
  border-radius: 999px;
  background: linear-gradient(180deg, #2ec4b6, #47a3ff);
  box-shadow: 0 0 10px rgba(46,196,182,.65);
}

.observation-panel .obs-head-v21 .obs-place-row {
  justify-content: flex-end !important;
  min-width: 0 !important;
}

.observation-panel .obs-head-v21 .obs-place-row strong {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  max-width: 168px !important;
  min-height: 24px !important;
  padding: 4px 9px !important;
  border: 1px solid rgba(46,196,182,.38) !important;
  border-radius: 999px !important;
  background: linear-gradient(135deg, rgba(46,196,182,.18), rgba(71,163,255,.16)) !important;
  color: #dffdfa !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  letter-spacing: 0.01em !important;
  text-shadow: 0 0 10px rgba(46,196,182,.28) !important;
  box-shadow: inset 0 0 14px rgba(46,196,182,.08), 0 0 14px rgba(46,196,182,.10) !important;
}

@media (max-width: 520px) {
  .observation-panel .obs-head-v21 .obs-title-main {
    font-size: 15px !important;
  }
  .observation-panel .obs-head-v21 .obs-place-row strong {
    max-width: 148px !important;
    font-size: 10px !important;
    padding-inline: 8px !important;
  }
}

</style>