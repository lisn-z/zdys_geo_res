<template>
  <div ref="pageRef" class="thermal-circulation-laboratory-container geo-template-page geo-page theme-light"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="地理实验室" />
      </div>
      <div class="title-stack">
        <h1 class="page-title">热力环流实验室</h1>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" :class="{ active: recordsOpen && panelsVisible }"
          @click="toggleRecordsPanel">实验记录</button>
        <button type="button" class="theme-btn toolbar-btn" @click="panelsVisible = !panelsVisible">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetExperiment">
          重置实验
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <img class="laboratory-backdrop" :src="labBackground" alt="虚拟大气科学实验室背景" />
          <div ref="threeContainerRef" class="scene-host three-host"></div>
          <div class="scene-vignette"></div>

          <div class="experiment-heading">
            <span>THERMAL CIRCULATION</span>
            <strong>{{ currentStage.title }}</strong>
            <small>{{ currentStage.short }}</small>
          </div>

          <div ref="hotSourceLabelRef" class="source-label hot-source-label"><span>HEAT SOURCE</span><strong>马克杯热水 ·
              暖空气上升</strong></div>
          <div ref="coldSourceLabelRef" class="source-label cold-source-label"><span>COLD SOURCE</span><strong>冰块 ·
              冷空气下沉</strong></div>

          <div ref="pressureCRef" class="pressure-point pressure-low pressure-c"><b>C</b><span><em>相对低压</em><strong>{{
            signedPressure(upperColdAnomalyPa) }} Pa</strong></span></div>
          <div ref="pressureDRef" class="pressure-point pressure-high pressure-d"><b>D</b><span><em>相对高压</em><strong>{{
            signedPressure(upperHotAnomalyPa) }} Pa</strong></span></div>
          <div ref="pressureBRef" class="pressure-point pressure-high pressure-b"><b>B</b><span><em>相对高压</em><strong>{{
            signedPressure(lowerColdAnomalyPa) }} Pa</strong></span></div>
          <div ref="pressureARef" class="pressure-point pressure-low pressure-a"><b>A</b><span><em>相对低压</em><strong>{{
            signedPressure(lowerHotAnomalyPa) }} Pa</strong></span></div>

          <div ref="upperIsobarRef" class="isobar-tag upper-isobar-tag"><span>上层参考等压面</span><strong>600 hPa</strong></div>
          <div ref="lowerIsobarRef" class="isobar-tag lower-isobar-tag"><span>近地面参考等压面</span><strong>1000 hPa</strong>
          </div>

          <div class="airflow-legend">
            <span><i class="hot-dot"></i>暖空气上升</span>
            <span><i class="neutral-line"></i>烟流轨迹</span>
            <span><i class="cold-dot"></i>冷空气下沉</span>
          </div>
          <div v-if="sceneError" class="scene-error">场景渲染异常：{{ sceneError }}</div>
        </div>

        <div ref="timelineDockRef" class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停实验' : '开始实验'" @click="togglePlayback">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-main">
            <div class="timeline-copy">
              <span>{{ isRunning ? `实验计时 ${Math.floor(experimentSeconds)} 秒` : '实验尚未开始 · 正在观察冷热气流' }}</span>
              <strong>{{ Math.round(progress) }}%</strong>
            </div>
            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" @input="handleScrub" />
            <div class="timeline-markers" aria-hidden="true">
              <span v-for="stage in stages" :key="stage.anchor" :style="{ left: `${stage.anchor}%` }"></span>
            </div>
          </div>
          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button>
          </div>
          <div class="timeline-isobar-control">
            <div class="switch-row timeline-isobar-switch">
              <div class="control-copy"><strong>显示等压面形变</strong></div>
              <el-switch v-model="showIsobarDeformation" size="small" aria-label="显示等压面形变" />
            </div>
            <small v-if="showIsobarDeformation && isRunning" class="isobar-demo-note">倾角放大 · 示意</small>
          </div>
        </div>
      </section>
    </main>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="sensorCardCollapsed" class="lab-sensor-card"
      title="实时实验数据" :subtitle="`${temperatureDifference.toFixed(1)}°C 温差`" variant="data" :initial-top="88"
      :initial-right="14" :bottom-inset="88" :min-width="280" :min-height="220" :light="true">
      <div class="sensor-console" aria-label="实验监测数据">
        <div class="console-kicker"><i></i> LIVE SENSOR</div>
        <div class="sensor-section">
          <div class="section-title-row">
            <span>温度监测</span><b>{{ temperatureDifference.toFixed(1) }}°C 温差</b>
          </div>
          <div class="metric-pair">
            <article class="metric hot-metric">
              <span>热水侧</span><strong>{{ tempHot.toFixed(1) }}<small>°C</small></strong>
              <i :style="{ height: `${hotMeter}%` }"></i>
            </article>
            <article class="metric cold-metric">
              <span>冰块侧</span><strong>{{ tempCold.toFixed(1) }}<small>°C</small></strong>
              <i :style="{ height: `${coldMeter}%` }"></i>
            </article>
          </div>
        </div>
        <div class="pressure-list">
          <div><span>热水侧压强异常</span><strong>{{ signedPressure(lowerHotAnomalyPa) }} <small>Pa</small></strong></div>
          <div><span>冰块侧压强异常</span><strong>{{ signedPressure(lowerColdAnomalyPa) }} <small>Pa</small></strong></div>
        </div>
        <p class="sensor-note">点位压强为相对异常示意值，并非绝对气压；待机时冷热源上方仍会出现局地垂直气流。</p>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="stageCardCollapsed" class="lab-stage-card"
      title="分阶段实验" :subtitle="currentStage.title" variant="data" :initial-top="164" :initial-right="14"
      :bottom-inset="96" :min-width="300" :min-height="330" :light="true">
      <template #header-meta><span class="stage-progress">{{ Math.round(progress) }}%</span></template>
      <div class="lesson-console" aria-label="分阶段实验流程">
        <div class="console-kicker"><i></i> GUIDED OBSERVATION</div>
        <div class="stage-list">
          <button v-for="(stage, index) in stages" :key="stage.title" type="button"
            :class="{ active: index === currentStageIndex, complete: index < currentStageIndex }"
            @click="goToStage(index)">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <div><strong>{{ stage.title }}</strong><small>{{ stage.tag }}</small></div>
          </button>
        </div>
        <div class="stage-explanation">
          <span>观察重点</span>
          <p>{{ currentStage.description }}</p><small>{{ currentStage.rule }}</small>
        </div>
        <button type="button" class="theme-btn option-btn advance-btn" @click="advanceStage">{{ advanceButtonText
        }}</button>
      </div>
    </FloatingFeatureCard>

    <Transition name="record-panel">
      <FloatingFeatureCard v-if="recordsOpen" v-show="panelsVisible" v-model:collapsed="recordsCardCollapsed"
        class="lab-records-card" title="实验数据记录" subtitle="每 5 秒自动记录" variant="track"
        :initial-top="240" :initial-right="14" :bottom-inset="88" :min-width="460" :min-height="260" :light="true">
        <div class="records-panel" aria-label="实验数据记录表">
          <div class="records-table">
            <div class="record-row record-header">
              <span>时间</span><span>热水</span><span>冰块</span><span>压差</span><span>状态</span>
            </div>
            <div v-if="records.length === 0" class="record-empty">开始实验后每 5 秒自动记录一次</div>
            <div v-for="row in records" :key="row.id" class="record-row">
              <span>{{ row.time }}s</span><span class="hot-value">{{ row.hot }}°</span>
              <span class="cold-value">{{ row.cold }}°</span><span>{{ row.delta }} Pa</span><span>{{ row.state
              }}</span>
            </div>
          </div>
        </div>
      </FloatingFeatureCard>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'


const labBackground = '/geo-resources-folder/images/thermal-lab-background.png'

interface ExperimentStage {
  title: string
  short: string
  tag: string
  description: string
  rule: string
  anchor: number
}
interface DataRecord { id: number; time: number; hot: string; cold: string; delta: string; state: string }
interface SmokeRuntime {
  curve: THREE.CatmullRomCurve3
  materials: THREE.ShaderMaterial[]
  arrows: THREE.Group[]
  arrowMaterials: THREE.MeshBasicMaterial[]
}

const stages: ExperimentStage[] = [
  { title: '建立温差', short: '热水与冰块正在建立稳定温差', tag: '实验准备', description: '观察两侧温度、相对压强与等压面倾斜，确认冷热源开始作用。', rule: '暖空气柱膨胀、冷空气柱收缩，使上下等压面向相反方向倾斜。', anchor: 0 },
  { title: '垂直运动', short: '右侧上升与左侧下沉同时发生', tag: '上升 / 下沉', description: '热源上方空气受热膨胀上升；冷源上方空气冷却收缩下沉。', rule: '同一时刻观察两侧烟流的相反垂直运动。', anchor: 18 },
  { title: '高空流动', short: '上升气流在高处流向冷源', tag: '热源 → 冷源', description: '热源一侧上升的空气到达实验箱顶部后，沿高空向冷源一侧运动。', rule: '高空中，空气从相对高压区流向相对低压区。', anchor: 42 },
  { title: '近地面流动', short: '冷空气贴近底部返回热源', tag: '冷源 → 热源', description: '冷源一侧下沉的空气在近地面向热源一侧补充，闭合气流路径。', rule: '近地面风向与高空气流方向相反。', anchor: 66 },
  { title: '完整热力环流', short: '烟流连续循环，环流系统形成', tag: '循环系统', description: '上升、高空水平运动、下沉和近地面水平运动首尾相接，形成完整环流。', rule: '地面冷热不均 → 空气垂直运动 → 水平气压差 → 水平运动。', anchor: 84 },
]

const progress = ref(0)
const isPlaying = ref(false)
const isRunning = ref(false)
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 2]
const experimentSeconds = ref(0)
const records = ref<DataRecord[]>([])
const recordsOpen = ref(true)
const panelsVisible = ref(true)
const sensorCardCollapsed = ref(true)
const stageCardCollapsed = ref(true)
const recordsCardCollapsed = ref(true)
const showIsobarDeformation = ref(true)
const sceneError = ref('')
const currentStageIndex = computed(() => {
  for (let index = stages.length - 1; index >= 0; index -= 1) if (progress.value >= stages[index]!.anchor) return index
  return 0
})
const currentStage = computed(() => stages[currentStageIndex.value]!)
const tempHot = computed(() => 42 + progress.value * 0.18)
const tempCold = computed(() => 4 - progress.value * 0.04)
const temperatureDifference = computed(() => tempHot.value - tempCold.value)
const pressureAnomalyPa = computed(() => temperatureDifference.value * 0.02)
const lowerHotAnomalyPa = computed(() => -pressureAnomalyPa.value)
const lowerColdAnomalyPa = computed(() => pressureAnomalyPa.value)
const upperHotAnomalyPa = computed(() => pressureAnomalyPa.value * 0.62)
const upperColdAnomalyPa = computed(() => -pressureAnomalyPa.value * 0.62)
const hotMeter = computed(() => THREE.MathUtils.clamp((tempHot.value - 20) / 40 * 100, 12, 100))
const coldMeter = computed(() => THREE.MathUtils.clamp((25 - tempCold.value) / 30 * 100, 8, 100))
function signedPressure(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(2)}` }
const advanceButtonText = computed(() => {
  if (!isRunning.value) return '开始实验'
  if (currentStageIndex.value >= stages.length - 1) return '重新观察完整环流'
  return `下一阶段：${stages[currentStageIndex.value + 1]!.title}`
})

let triggerSmokeBurst = () => { }
let verticalReveal = 0
function startExperiment() {
  if (progress.value >= 100) progress.value = 0
  isRunning.value = true
  isPlaying.value = true
  if (progress.value < stages[1]!.anchor) {
    progress.value = stages[1]!.anchor
    verticalReveal = 0
  }
  triggerSmokeBurst()
}
function togglePlayback() {
  if (!isRunning.value) return startExperiment()
  if (progress.value >= 100) progress.value = stages[1]!.anchor
  isPlaying.value = !isPlaying.value
}
function handleScrub() {
  isRunning.value = progress.value > 0
  isPlaying.value = false
  verticalReveal = currentStageIndex.value > 0 ? 1 : 0
}
function goToStage(index: number) {
  const nextIndex = THREE.MathUtils.clamp(index, 0, stages.length - 1)
  progress.value = stages[nextIndex]!.anchor
  isRunning.value = nextIndex > 0
  isPlaying.value = false
  verticalReveal = nextIndex === 1 ? 0 : nextIndex > 1 ? 1 : 0
  triggerSmokeBurst()
}
function advanceStage() {
  if (!isRunning.value) return startExperiment()
  const nextIndex = currentStageIndex.value >= stages.length - 1 ? stages.length - 1 : currentStageIndex.value + 1
  progress.value = stages[nextIndex]!.anchor
  isPlaying.value = false
  verticalReveal = nextIndex === 1 ? 0 : 1
  triggerSmokeBurst()
}
function toggleRecordsPanel() {
  if (!panelsVisible.value) {
    panelsVisible.value = true
    recordsOpen.value = true
    return
  }
  recordsOpen.value = !recordsOpen.value
}
function resetExperiment() {
  progress.value = 0; isPlaying.value = false; isRunning.value = false
  verticalReveal = 0
  isobarTiltAmount = 0; updateIsobarSurfaces(0)
  experimentSeconds.value = 0; records.value = []; recordsOpen.value = true
  triggerSmokeBurst(); resetCamera()
}

const { rootRef: pageRef, layoutMode, draggingSide, viewportResizing, workspaceAttrs } = useGeoPanelLayout({
  left: { enabled: false },
  right: { enabled: false },
  onLayoutChange(state) { if (!state.resizing) scheduleSceneResize(90) },
  onResize(payload) { if (payload.phase === 'end' || payload.phase === 'reset') scheduleSceneResize(0) },
})

const threeContainerRef = ref<HTMLElement | null>(null)
const timelineDockRef = ref<HTMLElement | null>(null)
const hotSourceLabelRef = ref<HTMLElement | null>(null)
const coldSourceLabelRef = ref<HTMLElement | null>(null)
const pressureARef = ref<HTMLElement | null>(null)
const pressureBRef = ref<HTMLElement | null>(null)
const pressureCRef = ref<HTMLElement | null>(null)
const pressureDRef = ref<HTMLElement | null>(null)
const upperIsobarRef = ref<HTMLElement | null>(null)
const lowerIsobarRef = ref<HTMLElement | null>(null)
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeFrame = 0
let animationFrame = 0
let lastFrameTime = 0
let lastWidth = 0
let lastHeight = 0
let recordClock = 0
let smokeBurst = 0
let disposed = false
const rootGroup = new THREE.Group()
const smokeRuntimes: SmokeRuntime[] = []
const idlePlumeMaterials: THREE.ShaderMaterial[] = []
const materials: THREE.Material[] = []
const geometries: THREE.BufferGeometry[] = []
const iceMeshes: THREE.Mesh[] = []
const isobarLineMeshes: THREE.Mesh[] = []
const flowUpAxis = new THREE.Vector3(0, 1, 0)
let isobarTiltAmount = 0
const overlayProjection = new THREE.Vector3()
const overlayAnchors = {
  hotSource: new THREE.Vector3(5.15, -0.05, 0.3),
  coldSource: new THREE.Vector3(-5.15, -0.05, 0.3),
  pressureA: new THREE.Vector3(5.15, 1.18, 2.72),
  pressureB: new THREE.Vector3(-5.15, 1.18, 2.72),
  pressureC: new THREE.Vector3(-5.15, 6.62, 2.72),
  pressureD: new THREE.Vector3(5.15, 6.62, 2.72),
  upperIsobar: new THREE.Vector3(2.4, 6.62, 2.72),
  lowerIsobar: new THREE.Vector3(2.4, 1.18, 2.72),
}

function projectOverlayLabel(
  element: HTMLElement | null,
  worldPosition: THREE.Vector3,
  offsetX = 0,
  offsetY = 0,
  keepAboveTimeline = false,
) {
  const host = threeContainerRef.value
  if (!element || !host || !camera) return
  const hostRect = host.getBoundingClientRect()
  overlayProjection.copy(worldPosition).project(camera)
  const visible = overlayProjection.z > -1 && overlayProjection.z < 1
  const width = element.offsetWidth || 100
  const height = element.offsetHeight || 40
  const margin = 14
  let x = (overlayProjection.x * 0.5 + 0.5) * hostRect.width + offsetX
  let y = (-overlayProjection.y * 0.5 + 0.5) * hostRect.height + offsetY
  x = THREE.MathUtils.clamp(x, width * 0.5 + margin, hostRect.width - width * 0.5 - margin)
  if (keepAboveTimeline) {
    const timelineTop = timelineDockRef.value
      ? timelineDockRef.value.getBoundingClientRect().top - hostRect.top
      : hostRect.height - 92
    y = THREE.MathUtils.clamp(y, 90, timelineTop - height - 20)
  } else {
    y = THREE.MathUtils.clamp(y, 84, hostRect.height - height - 96)
  }
  element.style.left = `${x}px`
  element.style.top = `${y}px`
  element.style.opacity = visible ? '1' : '0'
}

function updateSceneLabels() {
  projectOverlayLabel(hotSourceLabelRef.value, overlayAnchors.hotSource, 18, 22, true)
  projectOverlayLabel(coldSourceLabelRef.value, overlayAnchors.coldSource, -18, 22, true)
  projectOverlayLabel(pressureARef.value, overlayAnchors.pressureA, 42, -4)
  projectOverlayLabel(pressureBRef.value, overlayAnchors.pressureB, -42, -4)
  projectOverlayLabel(pressureCRef.value, overlayAnchors.pressureC, -34, 0)
  projectOverlayLabel(pressureDRef.value, overlayAnchors.pressureD, 34, 0)
  projectOverlayLabel(upperIsobarRef.value, overlayAnchors.upperIsobar, 0, -20)
  projectOverlayLabel(lowerIsobarRef.value, overlayAnchors.lowerIsobar, 0, 18)
}

function placeCylinderBetween(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) {
  const direction = end.clone().sub(start)
  mesh.position.copy(start).add(end).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(flowUpAxis, direction.clone().normalize())
  mesh.scale.set(1, direction.length(), 1)
}

function updateIsobarSurfaces(amount: number) {
  const tilt = 0.62 * THREE.MathUtils.clamp(amount, 0, 1)
  const upperStart = new THREE.Vector3(-7.15, 6.62 - tilt, 2.72)
  const upperEnd = new THREE.Vector3(7.15, 6.62 + tilt, 2.72)
  const lowerStart = new THREE.Vector3(-7.15, 1.18 + tilt, 2.72)
  const lowerEnd = new THREE.Vector3(7.15, 1.18 - tilt, 2.72)
  if (isobarLineMeshes[0]) placeCylinderBetween(isobarLineMeshes[0], upperStart, upperEnd)
  if (isobarLineMeshes[1]) placeCylinderBetween(isobarLineMeshes[1], lowerStart, lowerEnd)
  const labelRatio = 2.4 / 7.15
  overlayAnchors.upperIsobar.y = 6.62 + tilt * labelRatio
  overlayAnchors.lowerIsobar.y = 1.18 - tilt * labelRatio
}

function registerMaterial<T extends THREE.Material>(material: T) { materials.push(material); return material }
function registerGeometry<T extends THREE.BufferGeometry>(geometry: T) { geometries.push(geometry); return geometry }
function seededRandom(seed: number) { const value = Math.sin(seed * 91.731 + 17.113) * 43758.5453; return value - Math.floor(value) }
function createBox(size: [number, number, number], color: number, position: [number, number, number]) {
  const mesh = new THREE.Mesh(
    registerGeometry(new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(...size) * 0.08)),
    registerMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.3 })),
  )
  mesh.position.set(...position); rootGroup.add(mesh); return mesh
}

function createLaboratory() {
  const platform = createBox([17.5, 0.55, 7.2], 0xdcecf1, [0, 0.12, 0])
  platform.material = registerMaterial(new THREE.MeshStandardMaterial({ color: 0xdcecf1, metalness: 0.2, roughness: 0.32 }))
  const inset = new THREE.Mesh(
    registerGeometry(new RoundedBoxGeometry(16.5, 0.08, 6.25, 5, 0.14)),
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0xbcd5de, metalness: 0.18, roughness: 0.3 })),
  )
  inset.position.y = 0.43; rootGroup.add(inset)

  const frameMaterial = registerMaterial(new THREE.MeshStandardMaterial({ color: 0x6f9eae, metalness: 0.62, roughness: 0.2, emissive: 0x12313c }))
  const frameGeometry = registerGeometry(new THREE.BoxGeometry(0.11, 8.2, 0.11))
    ;[-8, 8].forEach((x) => [-2.95, 2.95].forEach((z) => {
      const post = new THREE.Mesh(frameGeometry, frameMaterial); post.position.set(x, 4.45, z); rootGroup.add(post)
    }))
  const railX = registerGeometry(new THREE.BoxGeometry(16.1, 0.11, 0.11))
  const railZ = registerGeometry(new THREE.BoxGeometry(0.11, 0.11, 5.9))
    ;[0.55, 8.35].forEach((y) => {
      ;[-2.95, 2.95].forEach((z) => { const rail = new THREE.Mesh(railX, frameMaterial); rail.position.set(0, y, z); rootGroup.add(rail) })
        ;[-8, 8].forEach((x) => { const rail = new THREE.Mesh(railZ, frameMaterial); rail.position.set(x, y, 0); rootGroup.add(rail) })
    })
  const glassMaterial = registerMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xbdeeff, transparent: true, opacity: 0.1, transmission: 0.68,
    roughness: 0.08, side: THREE.DoubleSide, depthWrite: false,
  }))
  const backGlass = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(16, 7.8)), glassMaterial)
  backGlass.position.set(0, 4.45, -2.94); rootGroup.add(backGlass)
  const topGlass = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(16, 5.9)), glassMaterial)
  topGlass.rotation.x = Math.PI / 2; topGlass.position.set(0, 8.34, 0); rootGroup.add(topGlass)
  createIsobarLines(); createHeatSource(); createColdSource()
}

function createIsobarLines() {
  const material = registerMaterial(new THREE.MeshBasicMaterial({
    color: 0x7897a2, transparent: true, opacity: 0.74, depthTest: false, depthWrite: false,
  }))
  for (let index = 0; index < 2; index += 1) {
    const line = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.022, 0.022, 1, 8)),
      material,
    )
    line.renderOrder = 7
    rootGroup.add(line)
    isobarLineMeshes.push(line)
  }
  updateIsobarSurfaces(isobarTiltAmount)
}

function createHeatSource() {
  const cupGroup = new THREE.Group()
  cupGroup.position.set(5.15, 0.58, 0)
  const ceramicMaterial = registerMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xfff7ef, roughness: 0.2, metalness: 0.04, clearcoat: 0.72, clearcoatRoughness: 0.16,
  }))
  const cupBody = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(1.28, 1.08, 2.05, 64, 1, true)), ceramicMaterial)
  cupBody.position.y = 1.18
  cupGroup.add(cupBody)
  const cupBottom = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(1.09, 1.09, 0.18, 64)), ceramicMaterial)
  cupBottom.position.y = 0.18
  cupGroup.add(cupBottom)
  const rim = new THREE.Mesh(
    registerGeometry(new THREE.TorusGeometry(1.285, 0.075, 14, 72)),
    registerMaterial(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.14, clearcoat: 0.9 })),
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = 2.22
  cupGroup.add(rim)
  const handle = new THREE.Mesh(registerGeometry(new THREE.TorusGeometry(0.72, 0.16, 18, 56)), ceramicMaterial)
  handle.position.set(-1.48, 1.18, 0)
  handle.scale.set(1.12, 0.92, 1)
  cupGroup.add(handle)
  const water = new THREE.Mesh(
    registerGeometry(new THREE.CylinderGeometry(1.17, 1.17, 0.1, 64)),
    registerMaterial(new THREE.MeshPhysicalMaterial({
      color: 0xf69a6a, emissive: 0xd95f2d, emissiveIntensity: 0.55,
      transparent: true, opacity: 0.82, roughness: 0.08, transmission: 0.25,
    })),
  )
  water.position.y = 2.17
  cupGroup.add(water)
  rootGroup.add(cupGroup)
  const light = new THREE.PointLight(0xff7848, 18, 9, 2); light.position.set(5.2, 3.0, 1.2); rootGroup.add(light)
}

function createColdSource() {
  const tray = new THREE.Mesh(
    registerGeometry(new RoundedBoxGeometry(4.1, 0.55, 3.5, 5, 0.22)),
    registerMaterial(new THREE.MeshStandardMaterial({ color: 0x89d3ed, metalness: 0.22, roughness: 0.28 })),
  )
  tray.position.set(-5.15, 0.84, 0); rootGroup.add(tray)
  const iceMaterial = registerMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x9eeaff, emissive: 0x0e80ad, emissiveIntensity: 0.38, roughness: 0.06,
    transmission: 0.82, thickness: 1.15, ior: 1.31, transparent: true, opacity: 0.92,
  }))
  const positions: Array<[number, number, number, number]> = [
    [4.35, 1.48, -0.75, -0.08], [5.35, 1.44, -0.82, 0.1], [6.2, 1.46, -0.58, -0.16],
    [4.72, 1.48, 0.48, 0.12], [5.75, 1.45, 0.54, -0.08], [4.78, 2.37, -0.42, -0.18],
    [5.75, 2.35, -0.34, 0.14], [5.28, 2.3, 0.62, 0.06],
  ]
  positions.forEach(([x, y, z, rotation], index) => {
    const size = 0.78 + seededRandom(index + 80) * 0.2
    const ice = new THREE.Mesh(registerGeometry(new RoundedBoxGeometry(size, size, size, 6, 0.15)), iceMaterial)
    ice.position.set(-x, y, z); ice.rotation.set(rotation * 0.5, -rotation, rotation * 0.3)
    rootGroup.add(ice); iceMeshes.push(ice)
  })
  const light = new THREE.PointLight(0x2bbcff, 34, 12, 2); light.position.set(-5.2, 2.4, 1.2); rootGroup.add(light)
}

function createOffsetSmokeCurve(baseCurve: THREE.CatmullRomCurve3, phase: number, spread: number) {
  const samples = 220
  const frames = baseCurve.computeFrenetFrames(samples, true)
  const points: THREE.Vector3[] = []
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const point = baseCurve.getPointAt(t)
    const slowCurl = Math.sin(t * Math.PI * 2 * 1.2 + phase)
    const fastCurl = Math.sin(t * Math.PI * 2 * 4.1 - phase * 1.4)
    const twist = phase + t * Math.PI * 2 * 2.5 + slowCurl * 0.48
    const breathing = 0.62 + slowCurl * 0.22 + fastCurl * 0.12
    point.addScaledVector(frames.normals[index]!, Math.cos(twist) * spread * breathing)
      .addScaledVector(frames.binormals[index]!, Math.sin(twist) * spread * breathing)
    points.push(point)
  }
  return new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5)
}

function createSmokeMaterial(phase: number, haze: boolean, opacity: number) {
  return registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uStage: { value: 0 }, uStrength: { value: 0 },
      uVerticalReveal: { value: 0 },
      uBurst: { value: 0 }, uPhase: { value: phase }, uOpacity: { value: opacity },
      uHaze: { value: haze ? 1 : 0 }, uNeutral: { value: new THREE.Color(0xc1d5db) },
      uWarm: { value: new THREE.Color(0xff6b3e) }, uCold: { value: new THREE.Color(0x49c9ff) },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vFacing; varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vFacing = 1.0 - abs(dot(worldNormal, normalize(cameraPosition - worldPosition.xyz)));
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uStage; uniform float uStrength; uniform float uBurst;
      uniform float uVerticalReveal;
      uniform float uPhase; uniform float uOpacity; uniform float uHaze;
      uniform vec3 uNeutral; uniform vec3 uWarm; uniform vec3 uCold;
      varying vec2 vUv; varying float vFacing; varying vec3 vWorldPosition;
      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(float x) {
        float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }
      float band(float value, float startAt, float endAt) {
        return smoothstep(startAt - 0.025, startAt + 0.02, value)
          * (1.0 - smoothstep(endAt - 0.02, endAt + 0.025, value));
      }
      void main() {
        float t = vUv.x;
        float verticalTopFade = 1.0 - smoothstep(7.04, 7.22, vWorldPosition.y);
        float hotColumn = band(t, 0.0, 0.18)
          * smoothstep(2.76, 2.94, vWorldPosition.y) * verticalTopFade;
        float coldColumn = band(t, 0.49, 0.69)
          * smoothstep(2.88, 3.06, vWorldPosition.y) * verticalTopFade
          * (1.0 - smoothstep(-5.42, -5.18, vWorldPosition.x));
        float hotRevealTop = 2.78 + uVerticalReveal * 4.38;
        float coldRevealBottom = 7.12 - uVerticalReveal * 4.38;
        float hotVertical = hotColumn
          * (1.0 - smoothstep(hotRevealTop - 0.1, hotRevealTop + 0.1, vWorldPosition.y));
        float coldVertical = coldColumn
          * smoothstep(coldRevealBottom - 0.1, coldRevealBottom + 0.1, vWorldPosition.y);
        float vertical = step(0.01, uVerticalReveal) * max(hotVertical, coldVertical);
        float upper = smoothstep(6.72, 7.02, vWorldPosition.y);
        float lower = smoothstep(2.66, 2.82, vWorldPosition.y)
          * (1.0 - smoothstep(3.28, 3.44, vWorldPosition.y));
        float stageMask = step(0.5, uStage) * vertical;
        stageMask = max(stageMask, step(1.5, uStage) * upper);
        stageMask = max(stageMask, step(2.5, uStage) * lower);
        stageMask = max(stageMask, step(3.5, uStage));
        float flow = fract(t * 9.0 - uTime * 0.22 + uPhase);
        float pulse = 0.32 + 0.68 * smoothstep(0.03, 0.72, sin(flow * 6.28318) * 0.5 + 0.5);
        float drift = 0.58 + 0.42 * noise(t * 31.0 - uTime * 1.2 + uPhase * 23.0);
        float burst = mix(1.0, 1.75, uBurst) * (0.72 + 0.28 * sin((flow + uBurst) * 6.28318));
        float edge = mix(0.42 + vFacing * 0.58, 0.2 + vFacing * 0.8, uHaze);
        float alpha = stageMask * uStrength * uOpacity * pulse * drift * edge * burst;
        vec3 color = uNeutral;
        float warmArea = smoothstep(4.0, 4.55, vWorldPosition.x)
          * smoothstep(2.35, 2.75, vWorldPosition.y);
        float coldArea = (1.0 - smoothstep(-4.55, -4.0, vWorldPosition.x))
          * smoothstep(2.35, 2.75, vWorldPosition.y);
        color = mix(color, uWarm, warmArea * 0.94);
        color = mix(color, uCold, coldArea * 0.96);
        color *= mix(1.2, 0.7, uHaze);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(color, alpha);
      }`,
  }))
}

function createArrow(color: number) {
  const group = new THREE.Group()
  const material = registerMaterial(new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  const stem = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8)), material)
  const head = new THREE.Mesh(registerGeometry(new THREE.ConeGeometry(0.11, 0.28, 10)), material)
  stem.position.y = -0.14; head.position.y = 0.14; group.add(stem, head)
  return { group, material }
}

function createIdlePlumeMaterial(color: number, phase: number, opacity: number) {
  const material = registerMaterial(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPhase: { value: phase },
      uBaseOpacity: { value: opacity },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPhase;
      varying vec2 vUv;
      float hash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 point) {
        vec2 cell = floor(point);
        vec2 local = fract(point);
        local = local * local * (3.0 - 2.0 * local);
        return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
          mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x), local.y);
      }
      void main() {
        vUv = uv;
        vec3 transformed = position;
        float height = uv.y;
        float clock = uTime * 1.32 + uPhase * 11.0;
        float twist = (noise(vec2(height * 2.4 - clock * 0.12, uPhase * 7.0)) - 0.5) * 2.6 * height;
        float cosine = cos(twist);
        float sine = sin(twist);
        transformed.xz = mat2(cosine, -sine, sine, cosine) * transformed.xz;
        float windX = sin(height * 5.4 + clock) * 0.085
          + (noise(vec2(height * 2.1 - clock * 0.2, uPhase * 3.0)) - 0.5) * 0.46;
        float windZ = cos(height * 4.3 + clock * 0.83) * 0.06
          + (noise(vec2(uPhase * 5.0, height * 2.7 - clock * 0.18)) - 0.5) * 0.34;
        transformed.x += windX * height * height;
        transformed.z += windZ * height * height;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uPhase;
      uniform float uBaseOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      float hash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 point) {
        vec2 cell = floor(point);
        vec2 local = fract(point);
        local = local * local * (3.0 - 2.0 * local);
        return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
          mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x), local.y);
      }
      float fbm(vec2 point) {
        float value = noise(point) * 0.58;
        value += noise(point * 2.03 + 7.1) * 0.28;
        value += noise(point * 4.07 + 13.7) * 0.14;
        return value;
      }
      void main() {
        vec2 smokeUv = vec2(vUv.x * 1.75 + uPhase * 2.7, vUv.y * 3.2 - uTime * 0.46);
        float bodyNoise = fbm(smokeUv);
        float detailNoise = fbm(smokeUv * vec2(2.1, 1.35) + vec2(4.3, -uTime * 0.18));
        float edgeFade = smoothstep(0.0, 0.22, vUv.x) * smoothstep(0.0, 0.22, 1.0 - vUv.x);
        float endFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(0.0, 0.28, 1.0 - vUv.y);
        float brokenRibbon = (0.18 + smoothstep(0.34, 0.68, bodyNoise) * 0.82) * (0.58 + detailNoise * 0.42);
        float alpha = uOpacity * uBaseOpacity * edgeFade * endFade * brokenRibbon;
        vec3 smokeColor = mix(uColor, vec3(0.98), smoothstep(0.5, 0.88, detailNoise) * 0.45);
        if (alpha < 0.006) discard;
        gl_FragColor = vec4(smokeColor, alpha);
      }
    `,
  }))
  idlePlumeMaterials.push(material)
  return material
}

function createIdlePlume(cold: boolean) {
  const startY = cold ? 2.82 : 2.72
  const xCenter = cold ? -5.2 : 5.2
  const color = cold ? 0xd2e3e7 : 0xdccbc4
  for (let index = 0; index < 2; index += 1) {
    const height = 1.14 + seededRandom(index + (cold ? 930 : 830)) * 0.24
    const width = 0.36 + seededRandom(index + (cold ? 940 : 840)) * 0.16
    const geometry = registerGeometry(new THREE.PlaneGeometry(width, height, 12, 56))
    geometry.translate(0, height * 0.5, 0)
    const material = createIdlePlumeMaterial(color, index * 0.173 + (cold ? 0.31 : 0), 0.4 + index * 0.045)
    const plume = new THREE.Mesh(geometry, material)
    plume.position.set(
      xCenter + (seededRandom(index + (cold ? 950 : 850)) - 0.5) * 0.34,
      startY,
      (seededRandom(index + (cold ? 970 : 870)) - 0.5) * 0.38,
    )
    plume.rotation.y = index * Math.PI / 3 + (cold ? 0.35 : -0.2)
    plume.frustumCulled = false
    plume.renderOrder = 10
    rootGroup.add(plume)
  }
}

function createIdlePlumes() {
  createIdlePlume(false)
  createIdlePlume(true)
}

function createAirflow() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.2, 2.9, 0), new THREE.Vector3(5.22, 5.0, 0),
    new THREE.Vector3(5.16, 7.15, 0), new THREE.Vector3(0, 7.55, 0),
    new THREE.Vector3(-5.3, 7.12, 0.08), new THREE.Vector3(-5.32, 4.5, 0.35),
    new THREE.Vector3(-5.34, 3.38, 0.62), new THREE.Vector3(-5.3, 3.14, 0.72),
    new THREE.Vector3(-5.02, 3.05, 0.74), new THREE.Vector3(-4.25, 3.0, 0.55),
    new THREE.Vector3(0, 2.98, 0.15), new THREE.Vector3(4.12, 2.98, -0.05),
  ], true, 'centripetal', 0.42)
  const runtime: SmokeRuntime = { curve, materials: [], arrows: [], arrowMaterials: [] }
  for (let layer = 0; layer < 2; layer += 1) {
    const material = createSmokeMaterial(layer * 0.29, true, 0.07 - layer * 0.012)
    const mesh = new THREE.Mesh(
      registerGeometry(new THREE.TubeGeometry(createOffsetSmokeCurve(curve, layer * 2.8, 0.17 + layer * 0.07), 240, 0.21 + layer * 0.07, 7, true)),
      material,
    )
    mesh.renderOrder = 8; rootGroup.add(mesh); runtime.materials.push(material)
  }
  for (let index = 0; index < 14; index += 1) {
    const material = createSmokeMaterial(index * 0.071, false, 0.18 + seededRandom(index + 500) * 0.12)
    const mesh = new THREE.Mesh(
      registerGeometry(new THREE.TubeGeometry(
        createOffsetSmokeCurve(curve, index * 0.82, 0.08 + seededRandom(index + 400) * 0.18),
        240, 0.011 + seededRandom(index + 600) * 0.014, 5, true,
      )),
      material,
    )
    mesh.renderOrder = 9; rootGroup.add(mesh); runtime.materials.push(material)
  }
  for (let index = 0; index < 9; index += 1) {
    const arrow = createArrow(index < 3 ? 0xff8b68 : index < 6 ? 0xd9f4ff : 0x66d6ff)
    rootGroup.add(arrow.group); runtime.arrows.push(arrow.group); runtime.arrowMaterials.push(arrow.material)
  }
  smokeRuntimes.push(runtime)
}

function createLights() {
  scene?.add(new THREE.HemisphereLight(0xf2fbff, 0x8fb7c3, 2.0))
  const key = new THREE.DirectionalLight(0xffffff, 3.1); key.position.set(4, 14, 10); scene?.add(key)
  const rim = new THREE.DirectionalLight(0x8cdcf2, 1.45); rim.position.set(-10, 7, -8); scene?.add(rim)
}
function resetCamera() {
  if (!camera || !controls) return
  camera.position.set(0.8, 9.6, 25.5); controls.target.set(0, 3.8, 0); controls.update()
}
function initScene() {
  try {
    const host = threeContainerRef.value
    if (!host) return
    disposed = false; sceneError.value = ''
    scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0xd9eef3, 0.006)
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = 'scene-canvas three-canvas'
    host.appendChild(renderer.domElement)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.075; controls.enablePan = false
    controls.minDistance = 14; controls.maxDistance = 34
    controls.minPolarAngle = 0.45; controls.maxPolarAngle = 1.36
    controls.minAzimuthAngle = -0.72; controls.maxAzimuthAngle = 0.72
    resetCamera()
    scene.add(rootGroup); createLights(); createLaboratory(); createAirflow(); createIdlePlumes(); resizeSceneNow()
    resizeObserver = new ResizeObserver(() => scheduleSceneResize(90)); resizeObserver.observe(host)
    requestAnimationFrame(resizeSceneNow); window.setTimeout(() => scheduleSceneResize(0), 180)
    animationFrame = requestAnimationFrame(animateScene)
  } catch (error) {
    sceneError.value = error instanceof Error ? error.message : String(error)
    console.error('热力环流实验室场景初始化失败：', error)
  }
}
function resizeSceneNow() {
  const host = threeContainerRef.value
  if (!host || !renderer || !camera || !scene) return
  const rect = host.getBoundingClientRect()
  const width = Math.max(320, Math.round(rect.width || window.innerWidth))
  const height = Math.max(320, Math.round(rect.height || window.innerHeight * 0.72))
  if (width === lastWidth && height === lastHeight) return
  lastWidth = width; lastHeight = height
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); renderer.render(scene, camera)
  updateSceneLabels()
}
function scheduleSceneResize(delay = 90) {
  if (resizeTimer) clearTimeout(resizeTimer)
  cancelAnimationFrame(resizeFrame)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    resizeFrame = requestAnimationFrame(resizeSceneNow)
  }, delay)
}
function addRecord() {
  records.value.unshift({
    id: Date.now() + records.value.length, time: Math.floor(experimentSeconds.value),
    hot: tempHot.value.toFixed(1), cold: tempCold.value.toFixed(1),
    delta: (lowerColdAnomalyPa.value - lowerHotAnomalyPa.value).toFixed(2), state: currentStage.value.title,
  })
  records.value = records.value.slice(0, 7)
}
function animateScene(time: number) {
  if (disposed) return
  animationFrame = requestAnimationFrame(animateScene)
  const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.08) : 0
  lastFrameTime = time
  if (isPlaying.value && isRunning.value) {
    progress.value = Math.min(100, progress.value + delta * playbackSpeed.value * 2.2)
    experimentSeconds.value += delta * playbackSpeed.value
    recordClock += delta * playbackSpeed.value
    if (recordClock >= 5) { recordClock %= 5; addRecord() }
    if (progress.value >= 100) isPlaying.value = false
  }
  if (isRunning.value && currentStageIndex.value === 1) {
    verticalReveal = Math.min(1, verticalReveal + delta / 3.2 * playbackSpeed.value)
  } else if (currentStageIndex.value > 1) {
    verticalReveal = 1
  }
  const targetIsobarTilt = showIsobarDeformation.value && isRunning.value
    ? THREE.MathUtils.clamp(progress.value / stages[4]!.anchor, 0, 1)
    : 0
  const isobarFollow = 1 - Math.exp(-delta * 2.15)
  isobarTiltAmount = THREE.MathUtils.lerp(isobarTiltAmount, targetIsobarTilt, isobarFollow)
  updateIsobarSurfaces(isobarTiltAmount)
  smokeBurst = Math.max(0, smokeBurst - delta * 0.7)
  const stage = currentStageIndex.value
  const strength = isRunning.value ? THREE.MathUtils.smoothstep(progress.value, 8, 22) : 0
  smokeRuntimes.forEach((runtime) => {
    runtime.materials.forEach((material) => {
      material.uniforms.uTime!.value = time / 1000 * (isRunning.value ? playbackSpeed.value : 0.55)
      material.uniforms.uStage!.value = stage
      material.uniforms.uStrength!.value = strength
      material.uniforms.uVerticalReveal!.value = verticalReveal
      material.uniforms.uBurst!.value = smokeBurst
    })
    runtime.arrows.forEach((arrow, index) => {
      const t = (time / 9000 * playbackSpeed.value + index / runtime.arrows.length) % 1
      const position = runtime.curve.getPointAt(t)
      const inHotVertical = t < 0.18 && position.y > 2.82
        && position.y < 7.2 && (position.y - 2.72) / 4.48 <= verticalReveal
      const inColdVertical = t > 0.49 && t < 0.69 && position.x < -5.2 && position.y > 2.92
        && position.y < 7.2 && (7.2 - position.y) / 4.48 <= verticalReveal
      const inUpperFlow = position.y > 6.72
      const inLowerFlow = position.y > 2.42 && position.y < 3.18
      const visible = stage >= 4
        || (stage >= 1 && (inHotVertical || inColdVertical))
        || (stage >= 2 && inUpperFlow)
        || (stage >= 3 && inLowerFlow)
      arrow.visible = isRunning.value && visible
      const tangent = runtime.curve.getTangentAt(t).normalize()
      arrow.position.copy(position); arrow.quaternion.setFromUnitVectors(flowUpAxis, tangent)
      arrow.scale.setScalar(0.9 + Math.sin(time / 320 + index) * 0.12)
      runtime.arrowMaterials[index]!.opacity = visible ? 0.52 + smokeBurst * 0.35 : 0
    })
  })
  idlePlumeMaterials.forEach((material) => {
    material.uniforms.uTime!.value = time / 1000
    material.uniforms.uOpacity!.value = isRunning.value ? 0 : 1
  })
  iceMeshes.forEach((mesh, index) => { mesh.position.y += Math.sin(time / 760 + index * 1.7) * 0.00022 })
  controls?.update()
  updateSceneLabels()
  if (renderer && scene && camera) renderer.render(scene, camera)
}
triggerSmokeBurst = () => { smokeBurst = 1 }
function disposeScene() {
  disposed = true
  cancelAnimationFrame(animationFrame); cancelAnimationFrame(resizeFrame)
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeObserver?.disconnect(); controls?.dispose()
  geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose())
  geometries.length = 0; materials.length = 0; smokeRuntimes.length = 0; idlePlumeMaterials.length = 0
  iceMeshes.length = 0; isobarLineMeshes.length = 0
  rootGroup.clear(); renderer?.dispose()
  if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  renderer = null; scene = null; camera = null; controls = null
}
onMounted(async () => { await nextTick(); initScene() })
onBeforeUnmount(disposeScene)
</script>

<style scoped>
.thermal-circulation-laboratory-container .center-stage,
.thermal-circulation-laboratory-container .stage-content {
  min-width: 0;
  min-height: 0;
}

.thermal-circulation-laboratory-container .stage-content {
  position: relative;
  overflow: hidden;
  background: #edf8fb;
}

.title-stack {
  display: grid;
  justify-items: center;
  gap: 1px;
}

.title-stack>span {
  color: rgba(105, 219, 246, .7);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .28em;
}

.title-stack .page-title {
  margin: 0;
}

.laboratory-backdrop,
.three-host,
.scene-vignette {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.laboratory-backdrop {
  object-fit: cover;
  filter: saturate(.94) brightness(1.01);
  transform: scale(1.015);
}

.three-host {
  z-index: 2;
}

.three-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.scene-vignette {
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(226, 244, 249, .18), transparent 24%, transparent 76%, rgba(120, 173, 191, .16)),
    radial-gradient(circle at center, transparent 54%, rgba(112, 166, 184, .1) 100%);
}

.experiment-heading {
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 8;
  display: grid;
  min-width: 360px;
  padding: 10px 24px 12px;
  justify-items: center;
  pointer-events: none;
  transform: translateX(-50%);
  border: 1px solid rgba(42, 137, 171, .24);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .9), rgba(232, 247, 251, .72));
  box-shadow: 0 14px 36px rgba(43, 94, 115, .14);
  backdrop-filter: blur(12px);
}

.experiment-heading>span,
.console-kicker,
.source-label>span,
.records-head span {
  color: #64dff7;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .2em;
}

.experiment-heading>strong {
  margin-top: 2px;
  color: #173f55;
  font-size: 19px;
  line-height: 1.35;
}

.experiment-heading>small {
  color: rgba(38, 85, 106, .7);
  font-size: 11px;
}

.sensor-console,
.lesson-console,
.records-panel {
  position: absolute;
  z-index: 9;
  border: 1px solid rgba(86, 183, 217, .26);
  border-radius: 15px;
  background: linear-gradient(150deg, rgba(5, 24, 36, .9), rgba(6, 18, 29, .78));
  box-shadow: 0 18px 48px rgba(0, 8, 14, .34);
  backdrop-filter: blur(14px);
}

.sensor-console {
  top: 18px;
  left: 18px;
  width: 246px;
  padding: 14px;
}

.lesson-console {
  top: 18px;
  right: 18px;
  display: grid;
  width: 264px;
  gap: 12px;
  padding: 14px;
}

.console-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
}

.console-kicker i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5fe2fb;
  box-shadow: 0 0 12px #4bdff9;
}

.sensor-section {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title-row span {
  color: #effaff;
  font-size: 12px;
  font-weight: 700;
}

.section-title-row b {
  color: #78def4;
  font-size: 10px;
}

.metric-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.metric {
  position: relative;
  display: grid;
  min-height: 80px;
  padding: 10px;
  overflow: hidden;
  border: 1px solid rgba(115, 192, 219, .15);
  border-radius: 10px;
  background: rgba(5, 28, 40, .58);
}

.metric::after {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 4px;
  height: 48px;
  content: '';
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
}

.metric>i {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  width: 4px;
  max-height: 48px;
  border-radius: 999px;
  transition: height 400ms ease;
}

.hot-metric>i {
  background: #ff6c47;
  box-shadow: 0 0 9px #ff4b25;
}

.cold-metric>i {
  background: #42c9ff;
  box-shadow: 0 0 9px #25b9ff;
}

.metric>span {
  color: rgba(203, 228, 238, .62);
  font-size: 10px;
}

.metric>strong {
  align-self: end;
  color: #fff;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.hot-metric>strong {
  color: #ff9274;
}

.cold-metric>strong {
  color: #7adfff;
}

.metric strong small {
  font-size: 10px;
}

.pressure-list {
  display: grid;
  gap: 1px;
  margin-top: 9px;
  overflow: hidden;
  border: 1px solid rgba(104, 185, 213, .14);
  border-radius: 9px;
}

.pressure-list>div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 9px;
  background: rgba(7, 35, 48, .56);
}

.pressure-list span {
  color: rgba(197, 222, 231, .62);
  font-size: 10px;
}

.pressure-list strong {
  color: #eafaff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.pressure-list small {
  color: rgba(190, 221, 233, .55);
  font-size: 8px;
}

.sensor-note {
  margin: 9px 0 0;
  color: rgba(166, 209, 223, .58);
  font-size: 9px;
  line-height: 1.55;
}

.stage-list {
  display: grid;
  gap: 5px;
}

.stage-list button {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 7px 8px;
  color: rgba(194, 221, 231, .52);
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 9px;
  background: rgba(8, 35, 48, .3);
  transition: 180ms ease;
}

.stage-list button>span {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  font-size: 9px;
  border: 1px solid rgba(93, 184, 214, .22);
  border-radius: 50%;
}

.stage-list button div {
  display: grid;
  min-width: 0;
}

.stage-list button strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-list button small {
  margin-top: 1px;
  font-size: 8px;
}

.stage-list button.complete {
  color: rgba(120, 221, 242, .7);
}

.stage-list button.active {
  color: #fff;
  border-color: rgba(78, 210, 243, .45);
  background: linear-gradient(90deg, rgba(27, 112, 139, .48), rgba(11, 54, 72, .36));
  box-shadow: inset 3px 0 #55def8;
}

.stage-list button.active>span {
  color: #84ebff;
  border-color: #56dff7;
  box-shadow: 0 0 12px rgba(70, 214, 245, .22);
}

.stage-explanation {
  display: grid;
  gap: 5px;
  padding: 10px;
  border-left: 2px solid #4cdaf5;
  border-radius: 0 8px 8px 0;
  background: rgba(7, 38, 51, .48);
}

.stage-explanation>span {
  color: #58dcf5;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .14em;
}

.stage-explanation p {
  margin: 0;
  color: rgba(231, 247, 251, .86);
  font-size: 11px;
  line-height: 1.55;
}

.stage-explanation small {
  color: rgba(111, 209, 231, .7);
  font-size: 9px;
  line-height: 1.45;
}

.advance-btn {
  width: 100%;
  min-width: 0;
}

.source-label {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 7;
  display: grid;
  min-width: 238px;
  padding: 10px 15px;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-50%);
  transition: opacity 160ms ease;
  border-radius: 9px;
  background: rgba(5, 18, 27, .66);
  backdrop-filter: blur(8px);
}

.source-label>span {
  font-size: 10px;
}

.source-label strong {
  margin-top: 3px;
  color: #fff;
  font-size: 13px;
  line-height: 1.35;
}

.hot-source-label {
  border-right: 2px solid #ff6542;
}

.hot-source-label>span {
  color: #ff8568;
}

.cold-source-label {
  border-left: 2px solid #45c9ff;
  text-align: center;
}

.cold-source-label>span {
  color: #65d4ff;
}

.pressure-point {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 6px 6px;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%);
  border: 1px solid color-mix(in srgb, var(--pressure-color) 45%, transparent);
  border-radius: 999px;
  background: rgba(255, 255, 255, .84);
  box-shadow: 0 7px 20px rgba(43, 85, 103, .13);
  backdrop-filter: blur(8px);
}

.pressure-point>b {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #fff;
  font-size: 14px;
  border-radius: 50%;
  background: var(--pressure-color);
  box-shadow: 0 0 11px color-mix(in srgb, var(--pressure-color) 42%, transparent);
}

.pressure-point>span {
  display: grid;
  line-height: 1.05;
}

.pressure-point em {
  color: var(--pressure-color);
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
}

.pressure-point strong {
  margin-top: 2px;
  color: #284d5e;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pressure-high {
  --pressure-color: #e97838;
}

.pressure-low {
  --pressure-color: #168db9;
}

.isobar-tag {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 10;
  padding: 5px 9px;
  color: #385866;
  font-size: 11px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(77, 116, 130, .34);
  border-radius: 7px;
  background: rgba(244, 249, 250, .92);
  box-shadow: 0 5px 14px rgba(42, 76, 90, .14);
}

.isobar-tag span {
  margin-right: 7px;
}

.isobar-tag strong {
  color: #087fa7;
  font-size: 11px;
  font-weight: 900;
}

.airflow-legend {
  position: absolute;
  top: 112px;
  bottom: auto;
  left: 50%;
  z-index: 8;
  display: flex;
  gap: 12px;
  padding: 8px 14px;
  color: rgba(219, 239, 246, .74);
  font-size: 10px;
  pointer-events: none;
  transform: translateX(-50%);
  border: 1px solid rgba(100, 190, 218, .2);
  border-radius: 999px;
  background: rgba(4, 17, 26, .68);
}

.thermal-circulation-laboratory-container .timeline-dock {
  width: min(940px, calc(100% - 28px));
  grid-template-columns: auto minmax(190px, 1fr) auto auto;
}

.timeline-isobar-control {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding-left: 10px;
  border-left: 1px solid rgba(53, 123, 148, .18);
}

.airflow-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.airflow-legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.hot-dot {
  background: #ff6d48;
  box-shadow: 0 0 8px #ff5c34;
}

.cold-dot {
  background: #45c9ff;
  box-shadow: 0 0 8px #30bdf8;
}

.airflow-legend .neutral-line {
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: #d7edf2;
  box-shadow: 0 0 8px #badde5;
}

.timeline-isobar-switch {
  gap: 8px;
  padding: 0;
  border-bottom: 0;
}

.timeline-isobar-switch .control-copy strong {
  color: #315d70;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.timeline-isobar-control .isobar-demo-note {
  color: #b06443;
  font-size: 8px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.records-panel {
  right: 300px;
  bottom: 18px;
  width: min(620px, calc(100% - 600px));
  padding: 13px;
}

.records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.records-head>div {
  display: grid;
}

.records-head strong {
  color: #fff;
  font-size: 14px;
}

.records-head button {
  display: grid;
  width: 25px;
  height: 25px;
  padding: 0;
  place-items: center;
  color: rgba(220, 240, 247, .7);
  font-size: 18px;
  cursor: pointer;
  border: 1px solid rgba(99, 194, 224, .22);
  border-radius: 50%;
  background: rgba(7, 34, 47, .62);
}

.records-table {
  display: grid;
  max-height: 210px;
  overflow: hidden;
}

.record-row {
  display: grid;
  grid-template-columns: .7fr .8fr .8fr .9fr 1.4fr;
  gap: 10px;
  padding: 9px 10px;
  color: rgba(218, 237, 244, .78);
  font-size: 12.5px;
  line-height: 1.4;
  border-top: 1px solid rgba(97, 177, 203, .11);
}

.record-header {
  color: #68dff5;
  font-weight: 800;
  background: rgba(20, 79, 98, .28);
  border: 0;
}

.record-empty {
  padding: 26px 22px;
  color: rgba(183, 215, 225, .5);
  font-size: 13.5px;
  text-align: center;
}

.hot-value {
  color: #ff896c;
}

.cold-value {
  color: #6dd8ff;
}

.record-panel-enter-active,
.record-panel-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.record-panel-enter-from,
.record-panel-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.timeline-main {
  position: relative;
}

.timeline-markers {
  position: absolute;
  right: 8px;
  bottom: 4px;
  left: 8px;
  height: 5px;
  pointer-events: none;
}

.timeline-markers span {
  position: absolute;
  width: 2px;
  height: 5px;
  transform: translateX(-1px);
  border-radius: 2px;
  background: rgba(171, 224, 238, .38);
}

.scene-error {
  position: absolute;
  bottom: 84px;
  left: 50%;
  z-index: 30;
  max-width: 70%;
  padding: 9px 13px;
  color: #ffe9e9;
  font-size: 11px;
  transform: translateX(-50%);
  border: 1px solid rgba(255, 104, 104, .55);
  border-radius: 8px;
  background: rgba(82, 15, 19, .88);
}

/* FloatingFeatureCard 统一承接数据与教学内容，默认贴边并可拖动、缩放、收起。 */
.lab-sensor-card {
  width: 284px;
  max-height: calc(100vh - 184px);
}

.lab-stage-card {
  width: 348px;
  max-height: calc(100vh - 184px);
}

.lab-records-card {
  width: min(580px, calc(100vw - 40px));
  max-height: 330px;
}

.sensor-console,
.lesson-console,
.records-panel {
  position: static;
  width: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.sensor-console {
  padding: 12px 13px 18px;
}

.lesson-console {
  display: grid;
  gap: 10px;
  padding: 12px 13px 18px;
}

.lab-stage-card .lesson-console {
  gap: 8px;
  padding: 11px 13px 15px;
}

.lab-stage-card .stage-list {
  gap: 4px;
}

.lab-stage-card .stage-list button {
  grid-template-columns: 31px 1fr;
  gap: 9px;
  padding: 7px 9px;
}

.lab-stage-card .stage-explanation {
  padding: 9px 10px;
}

.lab-stage-card .stage-list button>span {
  width: 30px;
  height: 30px;
  font-size: 11px;
}

.lab-stage-card .stage-list button strong {
  font-size: 14px;
}

.lab-stage-card .stage-list button small {
  font-size: 11px;
}

.lab-stage-card .stage-explanation>span {
  font-size: 11px;
}

.lab-stage-card .stage-explanation p {
  font-size: 13.5px;
  line-height: 1.6;
}

.lab-stage-card .stage-explanation small {
  font-size: 11px;
  line-height: 1.5;
}

.lab-stage-card :deep(.feature-card-title span),
.lab-records-card :deep(.feature-card-title span) {
  font-size: 16px;
}

.lab-stage-card :deep(.feature-card-title strong),
.lab-records-card :deep(.feature-card-title strong) {
  font-size: 14px;
}

.records-panel {
  padding: 12px 15px 26px;
}

.console-kicker {
  color: #167c9f;
}

.section-title-row span {
  color: #244d62;
}

.section-title-row b {
  color: #1683aa;
}

.metric {
  border-color: rgba(41, 139, 174, .18);
  background: rgba(222, 242, 248, .72);
}

.metric::after {
  background: rgba(29, 97, 123, .1);
}

.metric>span {
  color: rgba(34, 75, 96, .68);
}

.metric>strong {
  color: #193f54;
}

.hot-metric>strong {
  color: #e8673e;
}

.cold-metric>strong {
  color: #1586b5;
}

.pressure-list {
  border-color: rgba(39, 132, 166, .16);
}

.pressure-list>div {
  background: rgba(226, 244, 249, .72);
}

.pressure-list span {
  color: rgba(36, 76, 96, .68);
}

.pressure-list strong {
  color: #234e63;
}

.pressure-list small {
  color: rgba(38, 82, 102, .55);
}

.sensor-note {
  color: rgba(39, 86, 106, .7);
}

.stage-list button {
  color: rgba(35, 77, 97, .68);
  background: rgba(226, 244, 249, .58);
}

.stage-list button>span {
  border-color: rgba(34, 126, 160, .24);
}

.stage-list button.complete {
  color: rgba(21, 126, 159, .76);
}

.stage-list button.active {
  color: #16465d;
  border-color: rgba(32, 151, 187, .42);
  background: linear-gradient(90deg, rgba(170, 228, 242, .72), rgba(226, 246, 250, .74));
  box-shadow: inset 3px 0 #23a8cf;
}

.stage-list button.active>span {
  color: #087fa7;
  border-color: #29a5c9;
  box-shadow: 0 0 12px rgba(32, 158, 195, .18);
}

.stage-explanation {
  border-left-color: #25a7cb;
  background: rgba(220, 241, 247, .66);
}

.stage-explanation>span {
  color: #1382a8;
}

.stage-explanation p {
  color: rgba(28, 67, 86, .9);
}

.stage-explanation small {
  color: rgba(22, 111, 137, .78);
}

.stage-progress {
  color: #087da4;
  font-size: 11px;
  font-weight: 800;
}

.source-label {
  background: rgba(255, 255, 255, .78);
  box-shadow: 0 8px 24px rgba(52, 99, 117, .12);
}

.source-label strong {
  color: #244a5d;
}

.airflow-legend {
  color: rgba(31, 72, 90, .8);
  border-color: rgba(37, 126, 158, .2);
  background: rgba(255, 255, 255, .76);
  box-shadow: 0 8px 24px rgba(48, 97, 115, .1);
}

.record-row {
  color: rgba(30, 68, 86, .82);
  border-top-color: rgba(45, 130, 159, .13);
}

.record-header {
  color: #087da4;
  background: rgba(196, 232, 241, .58);
}

.record-empty {
  color: rgba(43, 87, 105, .58);
}

.hot-value {
  color: #e7653c;
}

.cold-value {
  color: #1487b4;
}

@media (max-width: 1180px) {
  .lab-sensor-card {
    width: 268px;
  }

  .lab-stage-card {
    width: 294px;
  }

  .experiment-heading {
    min-width: 300px;
  }

  .source-label {
    min-width: 214px;
    padding: 8px 12px;
  }

  .source-label strong {
    font-size: 12px;
  }
}

@media (max-width: 900px) {
  .experiment-heading {
    top: 12px;
    min-width: 240px;
    transform: translateX(-50%) scale(.86);
  }

  .airflow-legend {
    display: none;
  }

  .thermal-circulation-laboratory-container .timeline-dock {
    grid-template-columns: auto minmax(120px, 1fr) auto auto;
    gap: 6px;
  }

  .timeline-isobar-control {
    padding-left: 6px;
  }

  .timeline-isobar-control .isobar-demo-note,
  .timeline-isobar-switch .control-copy {
    display: none;
  }
}

@media (max-width: 700px) {

  .experiment-heading,
  .stage-explanation,
  .title-stack>span {
    display: none;
  }
}
</style>
