<template>
  <div ref="rootRef" class="moon-phase-container geo-template-page geo-page theme-dark moon-phase-template2"
    :class="`layout-${layoutMode}`">
    <canvas ref="starCanvasRef" class="starfield" aria-hidden="true"></canvas>

    <header class="top-toolbar moon-template-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="智地有申" />
      </div>

      <h1 class="page-title">月相原理动态模拟</h1>

      <div class="toolbar-actions moon-toolbar-actions">
        <div class="sun-source-tip">
          <span class="sun-source-icon">☀</span>
          <span>太阳光源位于右侧</span>
        </div>
      </div>
    </header>

    <main class="workspace moon-template-workspace">
      <section class="center-stage moon-center-stage">
        <div class="stage-content moon-stage-content">
          <main class="main-grid">
            <!-- 左侧：主视图 + 时间轴 -->
            <section class="left-column">
              <section class="panel global-panel" :class="{ 'is-3d-mode': is3DMode }">
                <div class="panel-header global-view-header">
                  <h2 class="global-view-title">
                    <span class="panel-icon">◎</span>
                    {{ is3DMode ? '三维空间' : '二维平面' }}
                  </h2>

                  <div class="header-actions global-view-actions">
                    <button class="pill-button" type="button" @click="toggle3DMode">
                      <span>{{ is3DMode ? '▣' : '◇' }}</span>
                      <span>{{ is3DMode ? '返回 2D' : '切换为 3D' }}</span>
                    </button>

                    <div v-show="!is3DMode" class="angle-switch">
                      <span>显示夹角</span>
                      <el-switch v-model="isAngleVisible" size="small" class="theme-switch angle-el-switch"
                        aria-label="显示日月地夹角" />
                    </div>
                  </div>
                </div>

                <!-- 2D 视图容器 -->
                <div v-show="!is3DMode" ref="viewportRef" class="viewport-container is-2d-mode">
                  <div class="view-2d">
                    <div class="sun-glow"></div>
                    <div class="sun-light-label">太阳直射光</div>

                    <svg class="sight-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <line x1="50" y1="50" x2="100" y2="50" stroke="rgba(250, 204, 21, 0.45)" stroke-width="0.3"
                        stroke-dasharray="1.5 1.5" />

                      <path v-show="showAngleGraphic" :d="angleArcPath" fill="rgba(46, 196, 182, 0.2)" stroke="#2ec4b6"
                        stroke-width="0.35" />

                      <text v-show="showAngleGraphic" :x="angleTextPosition.x" :y="angleTextPosition.y" fill="#2ec4b6"
                        font-size="3.5" font-weight="700" text-anchor="middle" dominant-baseline="middle">
                        {{ Math.round(elongationAngle) }}°
                      </text>

                      <line x1="50" y1="50" :x2="moonPosition.x" :y2="moonPosition.y" stroke="rgba(255, 255, 255, 0.65)"
                        stroke-width="0.5" stroke-dasharray="1.5 1.5" />
                    </svg>

                    <div class="orbit-circle"></div>

                    <div class="orbit-markers" aria-hidden="true">
                      <div v-for="(marker, index) in orbitMarkers" :key="marker.angle" class="orbit-marker"
                        :style="markerPositionStyle(marker.angle)">
                        <canvas :ref="(element) => setMarkerCanvas(element, index)" class="marker-moon" width="40"
                          height="40"></canvas>
                      </div>

                      <div v-for="marker in orbitMarkers" :key="`label-${marker.angle}`" class="orbit-label"
                        :class="markerLabelClass(marker.angle)" :style="markerLabelStyle(marker.angle)">
                        <strong>{{ marker.name }}</strong>
                        <span>{{ marker.date }}</span>
                      </div>
                    </div>

                    <div class="earth-2d">
                      <span>地球</span>
                    </div>

                    <div class="moon-global" :style="{
                      left: `${moonPosition.x}%`,
                      top: `${moonPosition.y}%`
                    }">
                      <span>月球</span>
                    </div>
                  </div>
                </div>

                <!-- 3D 视图：占满整个面板 -->
                <div v-show="is3DMode" ref="view3DRef" class="view-3d-full" aria-label="三维日地月模型"></div>
              </section>

              <section class="panel control-panel">
                <div class="playback-controls">
                  <button class="theme-btn timeline-icon-btn moon-play-btn" :class="{ active: isPlaying }" type="button"
                    :aria-label="isPlaying ? '暂停动画' : '播放动画'" @click="togglePlay">
                    <span v-if="!isPlaying" class="play-icon">▶</span>
                    <span v-else class="pause-icon">Ⅱ</span>
                  </button>

                  <div class="speed-group">
                    <button v-for="speed in speedOptions" :key="speed" type="button" class="theme-btn speed-btn"
                      :class="{ active: speedMultiplier === speed }" @click="speedMultiplier = speed">
                      {{ speed }}x
                    </button>
                  </div>
                </div>

                <div class="timeline">
                  <div class="timeline-labels">
                    <span>新月（朔）</span>
                    <span>上弦月</span>
                    <span>满月（望）</span>
                    <span>下弦月</span>
                    <span>新月</span>
                  </div>

                  <el-slider v-model="phaseProgress" :min="0" :max="360" :step="0.5" :show-tooltip="false"
                    class="theme-slider moon-phase-slider" aria-label="月相周期进度" @pointerdown="pauseForDrag" />
                </div>
              </section>
            </section>

            <!-- 右侧：观测面板 + 数据面板 + 知识卡片 -->
            <section class="right-column">
              <div class="panel observation-panel">
                <h2>
                  <span class="panel-icon">◉</span>
                  地球观测视角
                </h2>

                <div class="observation-body">
                  <div class="moon-preview">
                    <div ref="moonPhase3DRef" class="moon-phase-3d"></div>
                  </div>

                  <div class="observation-copy">
                    <div class="phase-name">{{ phaseName }}</div>
                    <div class="hemisphere-note">当前采用北半球正立观察示意</div>
                    <div class="observation-tip">此处显示从地球看月球的实际月相</div>
                  </div>
                </div>
              </div>

              <div class="panel data-panel">
                <h3>实时天文数据</h3>

                <div class="data-list">
                  <div class="data-row">
                    <span>月龄（朔望月）</span>
                    <strong>{{ phaseAge.toFixed(1) }} <small>天</small></strong>
                  </div>

                  <div class="data-row">
                    <span>被照亮比例</span>
                    <strong>{{ illumination.toFixed(1) }} <small>%</small></strong>
                  </div>

                  <div class="data-row">
                    <span>日月地夹角</span>
                    <strong>{{ Math.round(elongationAngle) }} <small>°</small></strong>
                  </div>
                </div>
              </div>

              <section class="knowledge-grid">
                <article class="knowledge-card">
                  <h3>◷ 朔望月与恒星月</h3>
                  <p>
                    模拟器展示的月相周期约为 29.53 天，称为朔望月。月球相对于恒星绕地球运行一周约为
                    27.32 天，称为恒星月。
                  </p>
                </article>

                <article class="knowledge-card">
                  <h3>⇄ 潮汐锁定</h3>
                  <p>
                    月球自转周期与绕地球公转周期基本相同，因此从地球上观察，月球大体始终以同一面朝向地球。
                  </p>
                </article>

                <article class="knowledge-card">
                  <h3>∠ 黄道与白道交角</h3>
                  <p>
                    本模型为了突出月相原理，将日、地、月近似放在同一平面。真实月球轨道面与黄道面约有
                    5.14° 的倾角。
                  </p>
                </article>

                <article class="knowledge-card">
                  <h3>◐ 晨昏圈</h3>
                  <p>
                    除特殊遮挡情况外，太阳始终照亮月球表面的一半。月相变化来自地球观察者所见亮面比例的改变。
                  </p>
                </article>
              </section>
            </section>
          </main>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance
} from 'vue'
import '@/styles/geo-page-template.css'
import { ElSlider, ElSwitch } from 'element-plus'
import 'element-plus/es/components/slider/style/css'
import 'element-plus/es/components/switch/style/css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const SYNODIC_MONTH = 29.530588
const ORBIT_RADIUS_2D = 36
const MARKER_LABEL_RADIUS = 45
const ORBIT_RADIUS_3D = 30
const BASE_DEGREES_PER_SECOND = 15

const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'
const EARTH_TEXTURE_URL = '/geo-resources-folder/images/earth.jpg'
const EARTH_EMISSIVE_URL = '/geo-resources-folder/images/emissive.jpg'
const MOON_TEXTURE_URL = '/geo-resources-folder/images/moon.jpg'

const rootRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const view3DRef = ref<HTMLElement | null>(null)
const starCanvasRef = ref<HTMLCanvasElement | null>(null)
const moonPhase3DRef = ref<HTMLElement | null>(null)

const phaseProgress = ref(0)
const isPlaying = ref(false)
const isAngleVisible = ref(true)
const is3DMode = ref(false)
const speedMultiplier = ref(1)
const speedOptions = [1, 2, 4]

type LayoutMode = 'large' | 'medium' | 'small'
const layoutMode = ref<LayoutMode>('large')

const orbitMarkers = [
  { angle: 0, name: '新月（朔）', date: '初一' },
  { angle: 45, name: '蛾眉月', date: '初三/四' },
  { angle: 90, name: '上弦月', date: '初七/八' },
  { angle: 135, name: '盈凸月', date: '十一/十二' },
  { angle: 180, name: '满月（望）', date: '十五/十六' },
  { angle: 225, name: '亏凸月', date: '十八/十九' },
  { angle: 270, name: '下弦月', date: '廿二/廿三' },
  { angle: 315, name: '残月', date: '廿七/廿八' }
]

const markerCanvases: Array<HTMLCanvasElement | null> = []

const normalizedAngle = computed(() => {
  if (phaseProgress.value >= 360) return 0
  const value = phaseProgress.value % 360
  return value < 0 ? value + 360 : value
})

const angleRadians = computed(() => (normalizedAngle.value * Math.PI) / 180)

const signedElongationAngle = computed(() =>
  normalizedAngle.value <= 180
    ? normalizedAngle.value
    : normalizedAngle.value - 360
)

const elongationAngle = computed(() => Math.abs(signedElongationAngle.value))

const phaseAge = computed(
  () => (Math.min(phaseProgress.value, 360) / 360) * SYNODIC_MONTH
)

const illumination = computed(
  () => 50 * (1 - Math.cos(angleRadians.value))
)

const phaseName = computed(() => {
  const angle = normalizedAngle.value

  if (angle < 5 || angle >= 355) return '新月（朔）'
  if (angle < 85) return '蛾眉月'
  if (angle < 95) return '上弦月'
  if (angle < 175) return '盈凸月'
  if (angle < 185) return '满月（望）'
  if (angle < 265) return '亏凸月'
  if (angle < 275) return '下弦月'
  return '残月'
})

const moonPosition = computed(() => ({
  x: 50 + ORBIT_RADIUS_2D * Math.cos(angleRadians.value),
  y: 50 - ORBIT_RADIUS_2D * Math.sin(angleRadians.value)
}))

const showAngleGraphic = computed(
  () =>
    isAngleVisible.value &&
    elongationAngle.value > 0.5 &&
    elongationAngle.value < 179.5
)

const angleArcPath = computed(() => {
  const radius = 18
  const rad = (signedElongationAngle.value * Math.PI) / 180
  const endX = 50 + radius * Math.cos(rad)
  const endY = 50 - radius * Math.sin(rad)
  const sweepFlag = signedElongationAngle.value >= 0 ? 0 : 1

  return `M 50 50 L ${50 + radius} 50 A ${radius} ${radius} 0 0 ${sweepFlag} ${endX} ${endY} Z`
})

const angleTextPosition = computed(() => {
  const halfRad = (signedElongationAngle.value * Math.PI) / 360
  const radius = 22

  return {
    x: 50 + radius * Math.cos(halfRad),
    y: 50 - radius * Math.sin(halfRad)
  }
})

function markerPositionStyle(angle: number) {
  const rad = (angle * Math.PI) / 180

  return {
    left: `${50 + ORBIT_RADIUS_2D * Math.cos(rad)}%`,
    top: `${50 - ORBIT_RADIUS_2D * Math.sin(rad)}%`
  }
}

function markerLabelStyle(angle: number) {
  const rad = (angle * Math.PI) / 180

  return {
    left: `${50 + MARKER_LABEL_RADIUS * Math.cos(rad)}%`,
    top: `${50 - MARKER_LABEL_RADIUS * Math.sin(rad)}%`
  }
}

function markerLabelClass(angle: number) {
  if (angle === 0) return 'label-right'
  if (angle === 180) return 'label-left'
  return ''
}

function setMarkerCanvas(
  element: Element | ComponentPublicInstance | null,
  index: number
) {
  markerCanvases[index] =
    element instanceof HTMLCanvasElement ? element : null
}

/* -----------------------------
 * Three.js 月相预览（地球观测视角）
 * --------------------------- */

let moonPhaseScene: THREE.Scene | null = null
let moonPhaseCamera: THREE.PerspectiveCamera | null = null
let moonPhaseRenderer: THREE.WebGLRenderer | null = null
let moonPhaseMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null = null
let moonPhaseLight: THREE.DirectionalLight | null = null
let isMoonPhase3DReady = false
let moonPhaseResizeTimer: number | null = null

function initMoonPhase3D() {
  const container = moonPhase3DRef.value
  if (!container || isMoonPhase3DReady) return

  const size = Math.min(container.clientWidth, container.clientHeight) || 320

  moonPhaseScene = new THREE.Scene()

  moonPhaseCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  moonPhaseCamera.position.set(0, 0, 14.2)

  moonPhaseRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  moonPhaseRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  moonPhaseRenderer.setSize(size, size, false)
  moonPhaseRenderer.outputColorSpace = THREE.SRGBColorSpace
  moonPhaseRenderer.domElement.className = 'moon-phase-canvas-3d'
  container.appendChild(moonPhaseRenderer.domElement)

  // 环境光提供最低限度的暗面可见性
  moonPhaseScene.add(new THREE.AmbientLight(0x2b2c30, 0.42))

  // 主方向光模拟太阳光，位置会根据月相角度动态更新
  moonPhaseLight = new THREE.DirectionalLight(0xfff3d6, 3.6)
  moonPhaseScene.add(moonPhaseLight)

  const textureLoader = new THREE.TextureLoader()
  const moonTexture = textureLoader.load(
    MOON_TEXTURE_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
    },
    undefined,
    (error) => console.error('月相预览纹理加载失败：', error)
  )

  const geometry = new THREE.SphereGeometry(2.85, 64, 64)
  const material = new THREE.MeshStandardMaterial({
    map: moonTexture,
    bumpMap: moonTexture,
    bumpScale: 0.055,
    roughness: 0.94,
    metalness: 0,
    color: 0xf2efe3,
    emissive: new THREE.Color(0x050505),
    emissiveIntensity: 0.04
  })
  moonPhaseMesh = new THREE.Mesh(geometry, material)
  moonPhaseScene.add(moonPhaseMesh)

  isMoonPhase3DReady = true
  updateMoonPhase3D()
}

function updateMoonPhase3D() {
  if (!isMoonPhase3DReady || !moonPhaseLight || !moonPhaseMesh) return

  const rad = angleRadians.value

  // 地球观测视角：相机代表地球观察者在月球前方(z轴正方向)
  // 太阳光围绕月球旋转，模拟月球绕地球公转时太阳光照射方向的变化
  //
  // 关键对应关系（从地球看向月球）：
  //   rad=0°（新月）：太阳在月球正后方 → 我们看到暗面
  //                 光照从z轴负方向来（从月球背后照向观察者）
  //   rad=90°（上弦月）：太阳在月球右侧 → 我们看到右半亮
  //                 光照从x轴正方向来
  //   rad=180°（满月）：太阳在月球正前方 → 我们看到亮面
  //                 光照从z轴正方向来（从观察者方向照向月球）
  //   rad=270°（下弦月）：太阳在月球左侧 → 我们看到左半亮
  //                 光照从x轴负方向来
  //
  // 光源绕Y轴旋转：角度 = rad（从z轴负方向开始，逆时针）
  // rad=0时：light在(0, 0, -15)，从背后照月球 → 正面全暗 ✓
  // rad=π/2时：light在(15, 0, 0)，从右侧照 → 右半亮 ✓
  // rad=π时：light在(0, 0, 15)，从前方照 → 全亮 ✓
  // rad=3π/2时：light在(-15, 0, 0)，从左侧照 → 左半亮 ✓
  const lightX = 15 * Math.sin(rad)
  const lightZ = -15 * Math.cos(rad)
  moonPhaseLight.position.set(lightX, 0, lightZ)

  // 月球潮汐锁定：始终以同一面朝向地球（z轴正方向即观察者）
  // 不需要额外旋转，默认即面向z轴正方向
}

function renderMoonPhase3D() {
  if (!isMoonPhase3DReady || !moonPhaseRenderer || !moonPhaseScene || !moonPhaseCamera) return
  moonPhaseRenderer.render(moonPhaseScene, moonPhaseCamera)
}

function resizeMoonPhase3D() {
  if (
    !isMoonPhase3DReady ||
    !moonPhaseRenderer ||
    !moonPhaseCamera ||
    !moonPhase3DRef.value
  ) {
    return
  }

  const container =
    moonPhase3DRef.value

  const containerRect =
    container.getBoundingClientRect()

  const size =
    Math.max(
      1,
      Math.floor(
        Math.min(
          containerRect.width || container.clientWidth || 1,
          containerRect.height || container.clientHeight || containerRect.width || 1
        )
      )
    )

  moonPhaseCamera.aspect =
    1

  moonPhaseCamera.updateProjectionMatrix()

  moonPhaseRenderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      2
    )
  )

  moonPhaseRenderer.setSize(
    size,
    size,
    false
  )
}

function scheduleMoonPhaseResize() {
  resizeMoonPhase3D()

  if (moonPhaseResizeTimer !== null) {
    window.clearTimeout(
      moonPhaseResizeTimer
    )
  }

  moonPhaseResizeTimer =
    window.setTimeout(() => {
      scheduleMoonPhaseResize()
      moonPhaseResizeTimer = null
    }, 120)
}

function disposeMoonPhase3D() {
  if (moonPhaseRenderer) {
    moonPhaseRenderer.dispose()
    moonPhaseRenderer.forceContextLoss()
    moonPhaseRenderer.domElement.remove()
  }
  if (moonPhaseMesh) {
    moonPhaseMesh.geometry.dispose()
    const mat = moonPhaseMesh.material as THREE.MeshStandardMaterial
    mat.map?.dispose()
    mat.dispose()
  }
  moonPhaseScene?.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry && mesh !== moonPhaseMesh) mesh.geometry.dispose()
  })
  moonPhaseScene = null
  moonPhaseCamera = null
  moonPhaseRenderer = null
  moonPhaseMesh = null
  moonPhaseLight = null
  isMoonPhase3DReady = false
}

function renderPhaseOnContext(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
  darkColor: string,
  lightColor: string
) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)

  const rad = (angle * Math.PI) / 180

  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.fillStyle = darkColor
  context.fill()

  if (angle < 180) {
    context.beginPath()
    context.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI / 2, false)
    context.fillStyle = lightColor
    context.fill()

    const width = radius * Math.cos(rad)

    context.beginPath()
    context.ellipse(
      centerX,
      centerY,
      Math.abs(width),
      radius,
      0,
      0,
      Math.PI * 2
    )
    context.fillStyle = angle < 90 ? darkColor : lightColor
    context.fill()
  } else {
    const waningRad = ((angle - 180) * Math.PI) / 180

    context.beginPath()
    context.arc(centerX, centerY, radius, Math.PI / 2, -Math.PI / 2, false)
    context.fillStyle = lightColor
    context.fill()

    const width = radius * Math.cos(waningRad)

    context.beginPath()
    context.ellipse(
      centerX,
      centerY,
      Math.abs(width),
      radius,
      0,
      0,
      Math.PI * 2
    )
    context.fillStyle = angle < 270 ? lightColor : darkColor
    context.fill()
  }
}

function drawMarkerMoons() {
  orbitMarkers.forEach((marker, index) => {
    const canvas = markerCanvases[index]
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    renderPhaseOnContext(
      context,
      canvas.width / 2,
      canvas.height / 2,
      17,
      marker.angle,
      '#111827',
      '#d8d6c8'
    )
  })
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
}

function pauseForDrag() {
  isPlaying.value = false
}

async function toggle3DMode() {
  is3DMode.value = !is3DMode.value

  if (!is3DMode.value) return

  await nextTick()
  init3D()
  resize3D()
  scheduleMoonPhaseResize()
  update3DModel()
}


function syncLayoutMode() {
  const width =
    rootRef.value?.clientWidth ||
    window.innerWidth

  layoutMode.value =
    width >= 1440
      ? 'large'
      : width >= 820
        ? 'medium'
        : 'small'
}

/* -----------------------------
 * 星空背景
 * --------------------------- */

interface StarPoint {
  x: number
  y: number
  radius: number
  alpha: number
  deltaAlpha: number
}

let stars: StarPoint[] = []
let starWidth = 0
let starHeight = 0
let rootResizeObserver: ResizeObserver | null = null

function resizeStarfield() {
  const canvas = starCanvasRef.value
  const root = rootRef.value
  if (!canvas || !root) return

  const rect = root.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  starWidth = Math.max(rect.width, 1)
  starHeight = Math.max(rect.height, 1)

  canvas.width = Math.round(starWidth * dpr)
  canvas.height = Math.round(starHeight * dpr)
  canvas.style.width = `${starWidth}px`
  canvas.style.height = `${starHeight}px`

  const context = canvas.getContext('2d')
  context?.setTransform(dpr, 0, 0, dpr, 0, 0)

  const count = Math.max(220, Math.round((starWidth * starHeight) / 6500))

  stars = Array.from({ length: count }, () => ({
    x: Math.random() * starWidth,
    y: Math.random() * starHeight,
    radius: Math.random() * 1.2 + 0.3,
    alpha: Math.random() * 0.9 + 0.1,
    deltaAlpha:
      (Math.random() * 0.4 + 0.12) * (Math.random() < 0.5 ? 1 : -1)
  }))
}

function drawStars(deltaSeconds: number) {
  const canvas = starCanvasRef.value
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) return

  context.clearRect(0, 0, starWidth, starHeight)
  context.fillStyle = '#ffffff'

  stars.forEach((star) => {
    star.alpha += star.deltaAlpha * deltaSeconds

    if (star.alpha <= 0.1) {
      star.alpha = 0.1
      star.deltaAlpha = Math.abs(star.deltaAlpha)
    } else if (star.alpha >= 1) {
      star.alpha = 1
      star.deltaAlpha = -Math.abs(star.deltaAlpha)
    }

    context.globalAlpha = star.alpha
    context.beginPath()
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    context.fill()
  })

  context.globalAlpha = 1
}

/* -----------------------------
 * Three.js 三维模型
 * --------------------------- */

let scene3D: THREE.Scene | null = null
let camera3D: THREE.PerspectiveCamera | null = null
let renderer3D: THREE.WebGLRenderer | null = null
let controls3D: OrbitControls | null = null
let earthMesh3D: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null =
  null
let moonMesh3D: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null =
  null
let sunMesh3D: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null =
  null
let viewportResizeObserver: ResizeObserver | null = null
let is3DInitialized = false
let earthRotation = 0

function configureColorTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer3D?.capabilities.getMaxAnisotropy() ?? 1
  texture.needsUpdate = true
}

function init3D() {
  if (is3DInitialized || !view3DRef.value) return

  const container = view3DRef.value
  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)

  scene3D = new THREE.Scene()

  camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 600)
  camera3D.position.set(6, 52, 92)

  renderer3D = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  })
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer3D.setSize(width, height, false)
  renderer3D.outputColorSpace = THREE.SRGBColorSpace

  // 提高受光面的整体亮度，但保留明暗分界。
  renderer3D.toneMapping = THREE.ACESFilmicToneMapping
  renderer3D.toneMappingExposure = 1.35

  renderer3D.domElement.className = 'three-canvas'
  container.appendChild(renderer3D.domElement)

  controls3D = new OrbitControls(camera3D, renderer3D.domElement)
  controls3D.enableDamping = true
  controls3D.dampingFactor = 0.06
  controls3D.enablePan = false
  controls3D.minDistance = 30
  controls3D.maxDistance = 180
  controls3D.target.set(12, 0, 0)
  controls3D.update()

  // 环境光只负责给背光面保留极少量细节，不负责提亮正面。
  scene3D.add(new THREE.AmbientLight(0x20232a, 0.24))

  // 增强太阳直射光，地球和月球的受光面会更明亮。
  const sunlight = new THREE.DirectionalLight(0xfff1d0, 4.4)
  sunlight.position.set(62, 0, 0)
  scene3D.add(sunlight)

  const textureLoader = new THREE.TextureLoader()

  const sunTexture = textureLoader.load(
    SUN_TEXTURE_URL,
    configureColorTexture,
    undefined,
    (error) => console.error('太阳纹理加载失败：', error)
  )

  const earthTexture = textureLoader.load(
    EARTH_TEXTURE_URL,
    configureColorTexture,
    undefined,
    (error) => console.error('地球纹理加载失败：', error)
  )

  const earthEmissiveTexture = textureLoader.load(
    EARTH_EMISSIVE_URL,
    configureColorTexture,
    undefined,
    (error) => console.error('地球灯光贴图加载失败：', error)
  )

  const moonTexture = textureLoader.load(
    MOON_TEXTURE_URL,
    configureColorTexture,
    undefined,
    (error) => console.error('月球纹理加载失败：', error)
  )

  const sunGeometry = new THREE.SphereGeometry(6, 48, 48)
  const sunMaterial = new THREE.MeshBasicMaterial({
    map: sunTexture,
    color: 0xffffff
  })
  sunMesh3D = new THREE.Mesh(sunGeometry, sunMaterial)
  sunMesh3D.position.set(62, 0, 0)
  scene3D.add(sunMesh3D)

  const glowGeometry = new THREE.SphereGeometry(8.5, 40, 40)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide
  })
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  sunMesh3D.add(glow)

  const earthGeometry = new THREE.SphereGeometry(5.6, 64, 64)
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthTexture,
    emissiveMap: earthEmissiveTexture,
    emissive: new THREE.Color(0xffffff),
    // 夜间灯光贴图只适度发光，避免抢走白天受光面的层次。
    emissiveIntensity: 0.48,
    roughness: 0.58,
    metalness: 0
  })
  earthMesh3D = new THREE.Mesh(earthGeometry, earthMaterial)
  earthMesh3D.rotation.z = THREE.MathUtils.degToRad(23.44)
  scene3D.add(earthMesh3D)

  const moonGeometry = new THREE.SphereGeometry(2.4, 64, 64)
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2efe3,
    map: moonTexture,
    bumpMap: moonTexture,
    bumpScale: 0.06,
    roughness: 0.92,
    metalness: 0,
    emissive: new THREE.Color(0x030303),
    emissiveIntensity: 0.03
  })
  moonMesh3D = new THREE.Mesh(moonGeometry, moonMaterial)

  scene3D.add(moonMesh3D)

  const orbitPoints: THREE.Vector3[] = []

  for (let index = 0; index <= 128; index += 1) {
    const angle = (index / 128) * Math.PI * 2
    orbitPoints.push(
      new THREE.Vector3(
        ORBIT_RADIUS_3D * Math.cos(angle),
        0,
        ORBIT_RADIUS_3D * Math.sin(angle)
      )
    )
  }

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints)
  const orbitMaterial = new THREE.LineDashedMaterial({
    color: 0x64748b,
    dashSize: 1.2,
    gapSize: 0.8,
    transparent: true,
    opacity: 0.58
  })
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial)
  orbitLine.computeLineDistances()
  scene3D.add(orbitLine)

  const arrowDirection = new THREE.Vector3(-1, 0, 0)
  const arrowOffsets = [
    [0, 0],
    [18, 0],
    [-18, 0],
    [0, 18],
    [0, -18]
  ]

  arrowOffsets.forEach(([y, z]) => {
    const arrow = new THREE.ArrowHelper(
      arrowDirection,
      new THREE.Vector3(47, y, z),
      13,
      0xfacc15,
      3,
      2
    )

    // @ts-ignore
    arrow.line.material.transparent = true
    // @ts-ignore
    arrow.line.material.opacity = 0.35
    // @ts-ignore
    arrow.cone.material.transparent = true
    // @ts-ignore
    arrow.cone.material.opacity = 0.7

    scene3D?.add(arrow)
  })

  is3DInitialized = true
  update3DModel()
}

function update3DModel() {
  if (!moonMesh3D) return

  const rad = angleRadians.value

  moonMesh3D.position.set(
    ORBIT_RADIUS_3D * Math.cos(rad),
    0,
    -ORBIT_RADIUS_3D * Math.sin(rad)
  )

  // 保持月球同一面大体朝向地球，表现潮汐锁定。
  moonMesh3D.rotation.y = rad - Math.PI / 2
}

function resize3D() {
  if (!renderer3D || !camera3D || !view3DRef.value) return

  const width = Math.max(view3DRef.value.clientWidth, 1)
  const height = Math.max(view3DRef.value.clientHeight, 1)

  camera3D.aspect = width / height
  camera3D.updateProjectionMatrix()
  renderer3D.setSize(width, height, false)
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
}

function disposeMaterial(material: THREE.Material) {
  const materialWithTextures = material as THREE.Material & {
    map?: THREE.Texture
    emissiveMap?: THREE.Texture
    bumpMap?: THREE.Texture
  }

  materialWithTextures.map?.dispose()
  materialWithTextures.emissiveMap?.dispose()

  if (
    materialWithTextures.bumpMap &&
    materialWithTextures.bumpMap !== materialWithTextures.map
  ) {
    materialWithTextures.bumpMap.dispose()
  }

  material.dispose()
}

function dispose3D() {
  controls3D?.dispose()

  scene3D?.traverse((object) => {
    const mesh = object as THREE.Mesh

    if (mesh.geometry) {
      mesh.geometry.dispose()
    }

    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(disposeMaterial)
      } else {
        disposeMaterial(mesh.material)
      }
    }
  })

  renderer3D?.dispose()
  renderer3D?.forceContextLoss()
  renderer3D?.domElement.remove()

  scene3D = null
  camera3D = null
  renderer3D = null
  controls3D = null
  earthMesh3D = null
  moonMesh3D = null
  sunMesh3D = null
  is3DInitialized = false
}

/* -----------------------------
 * 全局动画循环
 * --------------------------- */

let animationFrameId = 0
let lastFrameTime = 0
let pageVisible = true

function animationLoop(timestamp: number) {
  const deltaSeconds = lastFrameTime
    ? Math.min((timestamp - lastFrameTime) / 1000, 0.05)
    : 0

  lastFrameTime = timestamp

  if (pageVisible) {
    drawStars(deltaSeconds)

    if (isPlaying.value) {
      phaseProgress.value +=
        BASE_DEGREES_PER_SECOND * speedMultiplier.value * deltaSeconds

      if (phaseProgress.value >= 360) {
        phaseProgress.value -= 360
      }

      // 地球自转仅作观察示意，并与播放、暂停状态保持一致。
      earthRotation += 0.42 * speedMultiplier.value * deltaSeconds
    }

    if (earthMesh3D) {
      earthMesh3D.rotation.y = earthRotation
    }

    if (is3DMode.value && renderer3D && scene3D && camera3D) {
      controls3D?.update()
      renderer3D.render(scene3D, camera3D)
    }

    // 渲染右侧月相预览 3D
    if (isMoonPhase3DReady) {
      renderMoonPhase3D()
    }
  }

  animationFrameId = requestAnimationFrame(animationLoop)
}

function handleVisibilityChange() {
  pageVisible = !document.hidden
  lastFrameTime = performance.now()
}

watch(normalizedAngle, () => {
  updateMoonPhase3D()
  update3DModel()
})

onMounted(async () => {
  await nextTick()

  initMoonPhase3D()
  scheduleMoonPhaseResize()
  drawMarkerMoons()
  resizeStarfield()
  syncLayoutMode()

  rootResizeObserver = new ResizeObserver(() => {
    resizeStarfield()
    syncLayoutMode()
    resizeMoonPhase3D()

    if (is3DMode.value) {
      resize3D()
    }
  })

  if (rootRef.value) {
    rootResizeObserver.observe(rootRef.value)
  }

  viewportResizeObserver = new ResizeObserver(() => {
    if (is3DMode.value) resize3D()
  })

  // 观察 3D 视图容器以支持响应式调整
  if (view3DRef.value) {
    viewportResizeObserver.observe(view3DRef.value)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  animationFrameId = requestAnimationFrame(animationLoop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  rootResizeObserver?.disconnect()
  viewportResizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (moonPhaseResizeTimer !== null) {
    window.clearTimeout(
      moonPhaseResizeTimer
    )
    moonPhaseResizeTimer = null
  }

  disposeMoonPhase3D()
  dispose3D()
})
</script>

<style scoped>
.moon-phase-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: #2ec4b6;
  background:
    radial-gradient(circle at 50% 0%, rgba(36, 124, 255, 0.12), transparent 38%),
    radial-gradient(ellipse at 80% 20%, rgba(46, 196, 182, 0.1), transparent 35%),
    #020617;
  font-family:
    Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.page-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1920px;
  height: 100%;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.page-header h1 {
  margin: 0 0 8px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: clamp(24px, 2.5vw, 36px);
  line-height: 1.1;
  letter-spacing: 0.04em;
}

.page-header p {
  margin: 0;
  color: #2ec4b6;
  opacity: 0.7;
  font-size: clamp(13px, 1vw, 16px);
}

.sun-source-tip {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
  padding: 9px 15px;
  color: #2ec4b6;
  font-size: clamp(12px, 0.9vw, 14px);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.1), rgba(36, 124, 255, 0.08));
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 999px;
}

.sun-source-icon {
  font-size: 20px;
  line-height: 1;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(290px, 1fr);
  grid-template-rows: 1fr auto auto;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.panel {
  background: rgba(30, 41, 59, 0.48);
  border: 1px solid rgba(100, 116, 139, 0.34);
  border-radius: 24px;
  box-shadow: 0 22px 55px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
}

.global-panel {
  min-width: 0;
  padding: 22px;
}

.panel-header {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-header h2,
.observation-panel h2 {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: #2ec4b6;
  font-size: clamp(15px, 1.2vw, 20px);
}

.panel-icon {
  color: #2ec4b6;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.pill-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 13px;
  color: #2ec4b6;
  font-size: clamp(12px, 0.9vw, 14px);
  cursor: pointer;
  background: rgba(46, 196, 182, 0.1);
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: 999px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.pill-button:hover {
  background: rgba(46, 196, 182, 0.2);
  transform: translateY(-1px);
}

.angle-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 11px;
  color: #2ec4b6;
  font-size: clamp(12px, 0.9vw, 14px);
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 999px;
}

.switch-button {
  position: relative;
  width: 38px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  background: #475569;
  border: 0;
  border-radius: 999px;
  transition: background 0.2s ease;
}

.switch-button.active {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
}

.switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}

.switch-button.active .switch-knob {
  transform: translateX(16px);
}

.viewport-container {
  position: relative;
  width: min(100%, 620px);
  aspect-ratio: 1;
  margin: 0 auto;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(30, 41, 59, 0.56), rgba(2, 6, 23, 0.88));
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 50%;
}

.view-2d,
.view-3d {
  position: absolute;
  inset: 0;
}

.view-3d {
  cursor: grab;
}

.view-3d:active {
  cursor: grabbing;
}

.view-3d :deep(.three-canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.sun-glow {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  bottom: 0;
  width: 150px;
  pointer-events: none;
  background: radial-gradient(100% 50% at 100% 50%,
      rgba(250, 204, 21, 0.28),
      transparent 72%);
  animation: sun-pulse 3s ease-in-out infinite alternate;
}

@keyframes sun-pulse {
  from {
    width: 110px;
    opacity: 0.62;
  }

  to {
    width: 170px;
    opacity: 1;
  }
}

.sun-light-label {
  position: absolute;
  z-index: 5;
  top: 50%;
  right: 12px;
  color: #2ec4b6;
  font-size: clamp(12px, 1vw, 15px);
  font-weight: 700;
  letter-spacing: 0.28em;
  text-shadow: 0 0 10px rgba(46, 196, 182, 0.6);
  pointer-events: none;
  writing-mode: vertical-rl;
  transform: translateY(-50%);
}

.sight-line-svg {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.orbit-circle {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  width: 72%;
  height: 72%;
  border: 2px dashed rgba(148, 163, 184, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.orbit-markers {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
}

.orbit-marker {
  position: absolute;
  width: 40px;
  height: 40px;
  opacity: 0.58;
  transform: translate(-50%, -50%);
}

.marker-moon {
  display: block;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(214, 211, 196, 0.52);
  border-radius: 50%;
  box-shadow:
    0 5px 16px rgba(0, 0, 0, 0.38),
    inset 0 0 8px rgba(255, 244, 210, 0.08);
}

.orbit-label {
  position: absolute;
  display: flex;
  min-width: 78px;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transform: translate(-50%, -50%);
}

.orbit-label strong {
  color: #2ec4b6;
  font-size: clamp(10px, 0.8vw, 13px);
  line-height: 1.2;
}

.orbit-label span {
  margin-top: 2px;
  color: #2ec4b6;
  opacity: 0.6;
  font-size: clamp(8px, 0.65vw, 10px);
}

.orbit-label.label-right {
  align-items: flex-end;
  text-align: right;
  transform: translate(-100%, -50%);
}

.orbit-label.label-left {
  align-items: flex-start;
  text-align: left;
  transform: translate(0, -50%);
}

.earth-2d {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  display: grid;
  width: clamp(60px, 5vw, 80px);
  height: clamp(60px, 5vw, 80px);
  place-items: center;
  color: #e2e8f0;
  font-size: clamp(10px, 0.85vw, 13px);
  font-weight: 700;
  background:
    linear-gradient(to right, #0f172a 50%, #247cff 50%);
  border-radius: 50%;
  box-shadow:
    0 0 28px rgba(36, 124, 255, 0.35),
    inset 0 0 13px rgba(0, 0, 0, 0.8);
  transform: translate(-50%, -50%);
}

.moon-global {
  position: absolute;
  z-index: 4;
  width: 44px;
  height: 44px;
  background: linear-gradient(to right, #111827 50%, #d8d6c8 50%);
  border-radius: 50%;
  box-shadow:
    inset -2px 0 5px rgba(255, 244, 210, 0.36),
    inset 2px 0 5px rgba(0, 0, 0, 0.82),
    0 4px 14px rgba(0, 0, 0, 0.34);
  transform: translate(-50%, -50%);
}

.moon-global span {
  position: absolute;
  top: -21px;
  left: 50%;
  color: #2ec4b6;
  opacity: 0.7;
  font-size: clamp(8px, 0.7vw, 10px);
  white-space: nowrap;
  transform: translateX(-50%);
}

.side-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 22px;
}

.right-column {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr);
  gap: clamp(12px, 1vw, 18px);
}

.observation-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px;
}

.observation-panel h2 {
  align-self: stretch;
  margin-bottom: 22px;
}

.moon-preview {
  display: grid;
  width: min(210px, 78%);
  aspect-ratio: 1;
  place-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.42);
  border: 4px solid rgba(214, 211, 196, 0.28);
  border-radius: 50%;
  box-shadow:
    inset 0 0 34px rgba(0, 0, 0, 0.62),
    0 0 26px rgba(214, 211, 196, 0.08);
}

.moon-phase-3d {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.moon-phase-3d :deep(.moon-phase-canvas-3d) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.phase-name {
  margin-top: 18px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: clamp(24px, 2.5vw, 33px);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-align: center;
  filter: drop-shadow(0 0 12px rgba(46, 196, 182, 0.4));
}

.hemisphere-note {
  margin-top: 8px;
  color: #2ec4b6;
  opacity: 0.5;
  font-size: clamp(10px, 0.8vw, 12px);
}

.data-panel {
  flex: 1;
  padding: 22px;
}

.data-panel h3 {
  margin: 0 0 14px;
  color: #2ec4b6;
  opacity: 0.8;
  font-size: clamp(12px, 1vw, 14px);
  letter-spacing: 0.12em;
}

.data-list {
  display: flex;
  flex-direction: column;
}

.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 0;
  color: #2ec4b6;
  opacity: 0.85;
  border-bottom: 1px solid rgba(46, 196, 182, 0.15);
}

.data-row:last-child {
  border-bottom: 0;
}

.data-row strong {
  color: #2ec4b6;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: clamp(16px, 1.3vw, 22px);
  white-space: nowrap;
}

.data-row small {
  color: #2ec4b6;
  opacity: 0.6;
  font-size: clamp(11px, 0.85vw, 13px);
  font-weight: 400;
}

.control-panel {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
}

.playback-controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
}

.play-button {
  display: grid;
  width: 56px;
  height: 56px;
  padding: 0;
  place-items: center;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  border: 0;
  border-radius: 50%;
  box-shadow: 0 10px 24px rgba(46, 196, 182, 0.25);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.play-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(46, 196, 182, 0.35);
}

.play-button.playing {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.25);
}

.play-icon {
  margin-left: 3px;
  font-size: 20px;
}

.pause-icon {
  font-size: 19px;
  font-weight: 800;
}

.speed-group {
  display: flex;
  padding: 4px;
  background: rgba(51, 65, 85, 0.74);
  border: 1px solid rgba(71, 85, 105, 0.7);
  border-radius: 999px;
}

.speed-group button {
  padding: 7px 11px;
  color: #2ec4b6;
  opacity: 0.6;
  font-size: clamp(11px, 0.85vw, 13px);
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 999px;
}

.speed-group button.active {
  color: #fff;
  opacity: 1;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
}

.timeline {
  min-width: 0;
  flex: 1;
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #2ec4b6;
  opacity: 0.7;
  font-size: clamp(10px, 0.8vw, 12px);
}

.timeline input[type="range"] {
  width: 100%;
  height: 22px;
  margin: 0;
  appearance: none;
  cursor: pointer;
  background: transparent;
}

.timeline input[type="range"]::-webkit-slider-runnable-track {
  height: 4px;
  background: #475569;
  border-radius: 999px;
}

.timeline input[type="range"]::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  margin-top: -8px;
  appearance: none;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  border: 0;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(46, 196, 182, 0.5);
}

.timeline input[type="range"]::-moz-range-track {
  height: 4px;
  background: #475569;
  border-radius: 999px;
}

.timeline input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  border: 0;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(46, 196, 182, 0.5);
}

.knowledge-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.knowledge-card {
  padding: 18px;
  background: rgba(30, 41, 59, 0.48);
  border: 1px solid rgba(100, 116, 139, 0.34);
  border-radius: 18px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.2);
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.knowledge-card:hover {
  background: rgba(30, 41, 59, 0.68);
  transform: translateY(-2px);
}

.knowledge-card h3 {
  margin: 0 0 8px;
  color: #2ec4b6;
  font-size: clamp(13px, 1vw, 16px);
}

.knowledge-card p {
  margin: 0;
  color: #2ec4b6;
  opacity: 0.7;
  font-size: clamp(11px, 0.85vw, 13px);
  line-height: 1.72;
  text-align: justify;
}

@media (max-width: 980px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .control-panel,
  .knowledge-grid {
    grid-column: 1;
  }

  .knowledge-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 希沃大屏适配 (1920×1080+) */
@media (min-width: 1500px) {
  .page-shell {
    padding: 28px 40px;
  }

  .main-grid {
    gap: 24px;
  }

  .global-panel {
    padding: 28px;
  }

  .observation-panel,
  .data-panel {
    padding: 28px;
  }

  .control-panel {
    padding: 24px 32px;
  }

  .knowledge-grid {
    gap: 20px;
  }

  .knowledge-card {
    padding: 24px;
  }

  .viewport-container {
    width: min(100%, 720px);
  }

  .moon-preview {
    width: min(260px, 80%);
  }

  .play-button {
    width: 64px;
    height: 64px;
  }

  .play-icon {
    font-size: 24px;
  }

  .pause-icon {
    font-size: 22px;
  }
}

@media (min-width: 2200px) {
  .page-shell {
    max-width: 2560px;
    padding: 36px 56px;
  }

  .page-header h1 {
    font-size: 42px;
  }

  .page-header p {
    font-size: 18px;
  }

  .panel-header h2,
  .observation-panel h2 {
    font-size: 24px;
  }

  .global-panel {
    padding: 36px;
  }

  .observation-panel,
  .data-panel {
    padding: 36px;
  }

  .viewport-container {
    width: min(100%, 860px);
  }

  .moon-preview {
    width: min(320px, 82%);
  }

  .knowledge-card {
    padding: 32px;
  }

  .knowledge-card h3 {
    font-size: 18px;
  }

  .knowledge-card p {
    font-size: 15px;
  }

  .play-button {
    width: 72px;
    height: 72px;
  }
}

@media (max-width: 720px) {
  .page-shell {
    width: min(100% - 20px, 1180px);
    padding-top: 18px;
  }

  .page-header,
  .panel-header,
  .control-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header {
    gap: 14px;
  }

  .sun-source-tip {
    align-self: flex-start;
  }

  .panel-header h2 {
    min-height: 32px;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .global-panel,
  .observation-panel,
  .data-panel {
    padding: 16px;
  }

  .side-column {
    grid-template-columns: 1fr;
  }

  .control-panel {
    gap: 18px;
    padding: 18px;
  }

  .playback-controls {
    justify-content: space-between;
  }

  .timeline-labels {
    font-size: 9px;
  }

  .knowledge-grid {
    grid-template-columns: 1fr;
  }

  .orbit-label {
    min-width: 60px;
  }

  .orbit-label strong {
    font-size: 9px;
  }

  .orbit-label span {
    font-size: 8px;
  }

  .orbit-marker,
  .marker-moon {
    width: 32px;
    height: 32px;
  }

  .earth-2d {
    width: 58px;
    height: 58px;
  }

  .moon-global {
    width: 36px;
    height: 36px;
  }
}

/* ===================== v1: 切换为 2号模板：上 Header / 下主区 =====================
   - 使用公共模板 geo-template-page / geo-page / top-toolbar / workspace / center-stage；
   - 不再使用原 page-shell / page-header 作为页面骨架；
   - 主内容放入 center-stage 内部；
   - 控制条、知识卡、观测面板仍保留在主区内部。
*/
.moon-phase-template2 {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: #2ec4b6;
  background:
    radial-gradient(circle at 50% 0%, rgba(30, 64, 175, 0.16), transparent 42%),
    #020617;
}

.moon-phase-template2 .starfield {
  z-index: 0;
}

.moon-phase-template2 .moon-template-toolbar {
  position: relative;
  z-index: 110;
}

.moon-phase-template2 .moon-toolbar-actions {
  max-width: var(--header-side-reserve);
}

.moon-phase-template2 .sun-source-tip {
  min-width: max-content;
  padding: clamp(7px, 0.72vw, 10px) clamp(10px, 1vw, 15px);
  font-size: clamp(10px, 0.75vw, 14px);
}

.moon-phase-template2 .sun-source-icon {
  font-size: clamp(15px, 1.05vw, 20px);
}

.moon-phase-template2 .moon-template-workspace {
  position: relative;
  z-index: 1;
}

.moon-phase-template2 .moon-center-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.moon-phase-template2 .moon-stage-content {
  display: block;
  place-items: initial;
  box-sizing: border-box;
  padding: clamp(14px, 1.4vw, 26px);
  overflow: auto;
  background: transparent;
}

.moon-phase-template2 .moon-stage-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.moon-phase-template2 .moon-stage-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #2ec4b6, #247cff);
  border-radius: 999px;
}

.moon-phase-template2 .main-grid {
  width: min(100%, 1920px);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 0.78fr);
  grid-template-rows: minmax(0, 1fr) auto auto;
  gap: clamp(14px, 1.1vw, 22px);
}

.moon-phase-template2 .global-panel {
  min-height: 0;
}

.moon-phase-template2 .viewport-container {
  width: min(100%, clamp(520px, 43vw, 760px));
}

.moon-phase-template2 .side-column {
  min-height: 0;
}

.moon-phase-template2 .observation-panel,
.moon-phase-template2 .data-panel,
.moon-phase-template2 .control-panel,
.moon-phase-template2 .knowledge-card,
.moon-phase-template2 .global-panel {
  background: rgba(8, 20, 34, 0.58);
  border: 1px solid rgba(116, 234, 229, 0.18);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.moon-phase-template2 .control-panel {
  align-self: end;
}

.moon-phase-template2 .knowledge-grid {
  align-self: end;
}

@media (min-width: 2200px) {
  .moon-phase-template2 .moon-stage-content {
    padding: clamp(24px, 1.45vw, 40px);
  }

  .moon-phase-template2 .main-grid {
    width: min(100%, 2320px);
    grid-template-columns: minmax(0, 2.05fr) minmax(360px, 0.82fr);
    gap: clamp(20px, 1.2vw, 30px);
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 860px);
  }
}

@media (max-width: 980px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 14px;
  }

  .moon-phase-template2 .main-grid {
    height: auto;
    min-height: 100%;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .moon-phase-template2 .side-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .moon-phase-template2 .sun-source-tip {
    display: none;
  }

  .moon-phase-template2 .moon-stage-content {
    padding: 10px;
  }

  .moon-phase-template2 .main-grid {
    gap: 12px;
  }

  .moon-phase-template2 .control-panel {
    align-items: stretch;
    flex-direction: column;
  }
}


/* ===================== v2: 封装控件与中小屏适配修正 =====================
   - 原生 range 改为 el-slider；
   - 自写 switch 改为 el-switch；
   - 播放暂停按钮改为公共模板 timeline-icon-btn；
   - logo 改为线上地址；
   - 中小屏下 2D / 3D 视窗不再卡出容器；
   - 右侧观测卡片不再掉到奇怪位置，改为可控的响应式网格。
*/
.moon-phase-template2 .brand-logo {
  width: clamp(170px, 15vw, 250px);
  object-fit: contain;
}

.moon-phase-template2 .moon-toolbar-actions {
  max-width: var(--header-side-reserve);
}

.moon-phase-template2 .sun-source-tip {
  min-width: max-content;
  padding: clamp(7px, 0.72vw, 10px) clamp(10px, 1vw, 15px);
  font-size: clamp(10px, 0.75vw, 14px);
}

.moon-phase-template2 .sun-source-icon {
  font-size: clamp(15px, 1.05vw, 20px);
}

.moon-phase-template2 .angle-switch {
  padding: 7px 11px;
  background: rgba(8, 20, 34, 0.54);
  border: 1px solid rgba(116, 234, 229, 0.18);
  border-radius: 999px;
}

.moon-phase-template2 .angle-el-switch {
  flex: 0 0 auto;
}

.moon-phase-template2 .moon-play-btn {
  flex: 0 0 auto;
  width: clamp(38px, 3.4vw, 48px);
  height: clamp(38px, 3.4vw, 48px);
  min-width: clamp(38px, 3.4vw, 48px);
  border-radius: 999px;
}

.moon-phase-template2 .moon-play-btn .play-icon {
  margin-left: 2px;
  font-size: clamp(15px, 1.25vw, 19px);
}

.moon-phase-template2 .moon-play-btn .pause-icon {
  font-size: clamp(14px, 1.15vw, 18px);
  font-weight: 900;
}

.moon-phase-template2 .speed-group {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: rgba(8, 20, 34, 0.52);
  border: 1px solid rgba(116, 234, 229, 0.16);
  border-radius: 999px;
}

.moon-phase-template2 .speed-group .speed-btn {
  min-width: clamp(36px, 3vw, 46px);
  height: clamp(28px, 2.7vh, 32px);
  padding: 0 10px;
  color: var(--text-secondary);
  font-size: clamp(10px, 0.7vw, 12px);
  line-height: 1;
}

.moon-phase-template2 .moon-phase-slider {
  width: 100%;
}

.moon-phase-template2 .timeline input[type="range"] {
  display: none;
}

.moon-phase-template2 .moon-stage-content {
  overflow: auto;
  overscroll-behavior: contain;
}

.moon-phase-template2 .main-grid {
  box-sizing: border-box;
  align-items: stretch;
  min-width: 0;
  overflow: visible;
}

.moon-phase-template2 .global-panel,
.moon-phase-template2 .side-column,
.moon-phase-template2 .control-panel,
.moon-phase-template2 .knowledge-grid {
  min-width: 0;
}

.moon-phase-template2 .viewport-container {
  width: min(100%, clamp(420px, 38vw, 760px));
  max-width: 100%;
  max-height: min(68vh, 760px);
  box-sizing: border-box;
  contain: layout paint;
}

.moon-phase-template2 .view-2d,
.moon-phase-template2 .view-3d {
  overflow: hidden;
  border-radius: 50%;
}

.moon-phase-template2 .view-3d :deep(.three-canvas) {
  width: 100% !important;
  height: 100% !important;
}

.moon-phase-template2 .side-column {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(12px, 1vw, 18px);
}

.moon-phase-template2 .right-column {
  grid-template-rows: minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr);
  gap: clamp(12px, 1vw, 18px);
}

.moon-phase-template2 .observation-panel,
.moon-phase-template2 .data-panel {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.moon-phase-template2 .moon-preview {
  width: min(210px, 72%);
}

.moon-phase-template2 .data-panel {
  min-height: 0;
}

.moon-phase-template2 .control-panel {
  min-width: 0;
  box-sizing: border-box;
}

.moon-phase-template2 .timeline {
  min-width: 0;
}

.moon-phase-template2 .timeline-labels {
  gap: 8px;
}

.moon-phase-template2 .timeline-labels span {
  min-width: 0;
  white-space: nowrap;
}

@media (min-width: 2200px) {
  .moon-phase-template2 .viewport-container {
    width: min(100%, 820px);
    max-height: min(70vh, 820px);
  }

  .moon-phase-template2 .right-column {
    grid-template-rows: minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr);
  }

  .moon-phase-template2 .moon-preview {
    width: min(300px, 78%);
  }
}

@media (max-width: 1180px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 14px;
  }

  .moon-phase-template2 .main-grid {
    height: auto;
    min-height: 100%;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto auto auto;
    gap: 14px;
  }

  .moon-phase-template2 .global-panel {
    padding: 16px;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 620px);
    max-height: none;
  }

  .moon-phase-template2 .side-column {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    grid-template-rows: auto;
    gap: 14px;
  }

  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel {
    height: auto;
    min-height: 0;
    padding: 16px;
  }

  .moon-phase-template2 .moon-preview {
    width: min(180px, 64%);
  }

  .moon-phase-template2 .phase-name {
    margin-top: 12px;
    font-size: clamp(20px, 3vw, 28px);
  }

  .moon-phase-template2 .control-panel {
    grid-column: auto;
    align-items: center;
    padding: 16px;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-column: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .moon-phase-template2 .side-column {
    grid-template-columns: minmax(0, 1fr);
  }

  .moon-phase-template2 .moon-preview {
    width: min(190px, 58vw);
  }

  .moon-phase-template2 .control-panel {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 14px;
  }

  .moon-phase-template2 .timeline-labels {
    font-size: 10px;
  }
}

@media (max-width: 720px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 10px;
  }

  .moon-phase-template2 .main-grid {
    gap: 12px;
  }

  .moon-phase-template2 .global-panel,
  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel,
  .moon-phase-template2 .control-panel {
    padding: 12px;
    border-radius: 18px;
  }

  .moon-phase-template2 .panel-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .moon-phase-template2 .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, calc(100vw - 48px));
  }

  .moon-phase-template2 .sun-light-label {
    right: 6px;
    font-size: 10px;
    letter-spacing: 0.18em;
  }

  .moon-phase-template2 .orbit-label {
    min-width: 52px;
  }

  .moon-phase-template2 .orbit-label strong {
    font-size: 8px;
  }

  .moon-phase-template2 .orbit-label span {
    font-size: 7px;
  }

  .moon-phase-template2 .orbit-marker,
  .moon-phase-template2 .marker-moon {
    width: 28px;
    height: 28px;
  }

  .moon-phase-template2 .moon-global {
    width: 32px;
    height: 32px;
  }

  .moon-phase-template2 .earth-2d {
    width: 52px;
    height: 52px;
  }

  .moon-phase-template2 .control-panel {
    grid-template-columns: 1fr;
  }

  .moon-phase-template2 .playback-controls {
    justify-content: center;
  }

  .moon-phase-template2 .timeline-labels {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    font-size: 8px;
    text-align: center;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 460px) {
  .moon-phase-template2 .viewport-container {
    width: min(100%, calc(100vw - 36px));
  }

  .moon-phase-template2 .orbit-label span {
    display: none;
  }

  .moon-phase-template2 .orbit-label {
    min-width: 40px;
  }

  .moon-phase-template2 .sun-source-tip {
    display: none;
  }
}


/* ===================== v3: 中小屏保持左右对照观察 =====================
   v2 问题：
   - 1180px 以下直接把主区改成单列；
   - "地球观测视角"被挤到下方，失去左侧上帝视角 / 右侧观测视角的对照关系。

   v3 处理：
   - 1180px ~ 821px：继续保持左右两列；
   - 左侧为 2D/3D 上帝视角，右侧为地球观测 + 数据卡；
   - 压缩圆形视窗、右侧月相预览和知识卡，保证不出容器；
   - 820px 以下才改为上下堆叠。
*/

/* 先压过 v2 的 1180 单列规则：中屏仍然两列对比 */
@media (min-width: 821px) and (max-width: 1180px) {
  .moon-phase-template2 .moon-stage-content {
    padding:
      clamp(12px, 1.2vw, 16px) !important;
    overflow:
      hidden auto;
  }

  .moon-phase-template2 .main-grid {
    width:
      100% !important;
    height:
      100% !important;
    min-height:
      0 !important;
    grid-template-columns:
      minmax(0, 1.42fr) minmax(230px, 0.72fr) !important;
    grid-template-rows:
      minmax(0, 1fr) !important;
    gap:
      12px !important;
    align-items:
      stretch !important;
  }

  .moon-phase-template2 .left-column {
    grid-template-rows:
      minmax(0, 1fr) clamp(70px, 12vh, 100px) !important;
    gap:
      10px !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
    gap:
      10px !important;
  }

  .moon-phase-template2 .global-panel {
    min-height:
      0 !important;
    padding:
      14px !important;
    overflow:
      hidden;
  }

  .moon-phase-template2 .control-panel {
    min-width:
      0;
    padding:
      12px 14px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;
    gap:
      10px !important;
    min-width:
      0;
  }

  .moon-phase-template2 .knowledge-card {
    padding:
      12px !important;
    border-radius:
      14px !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    font-size:
      12px !important;
    margin-bottom:
      6px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size:
      10px !important;
    line-height:
      1.5 !important;
  }

  .moon-phase-template2 .panel-header {
    gap:
      10px;
    margin-bottom:
      10px;
  }

  .moon-phase-template2 .panel-header h2,
  .moon-phase-template2 .observation-panel h2 {
    font-size:
      clamp(13px, 1.5vw, 17px) !important;
  }

  .moon-phase-template2 .header-actions {
    gap:
      8px;
  }

  .moon-phase-template2 .pill-button,
  .moon-phase-template2 .angle-switch {
    padding:
      6px 10px;
    font-size:
      11px;
  }

  /* 关键：圆形视窗按剩余高度/宽度收缩，不撑出左侧卡片 */
  .moon-phase-template2 .viewport-container {
    width:
      min(100%, 58vh, 560px) !important;
    max-width:
      100% !important;
    max-height:
      calc(100vh - 250px) !important;
    margin:
      0 auto !important;
  }

  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel {
    padding:
      14px !important;
    min-width:
      0;
    overflow:
      hidden;
  }

  .moon-phase-template2 .observation-panel h2 {
    margin-bottom:
      12px !important;
  }

  .moon-phase-template2 .moon-preview {
    width:
      min(150px, 56%) !important;
    padding:
      8px;
    border-width:
      3px;
  }

  .moon-phase-template2 .phase-name {
    margin-top:
      10px !important;
    font-size:
      clamp(18px, 2.35vw, 24px) !important;
    letter-spacing:
      0.08em;
  }

  .moon-phase-template2 .hemisphere-note {
    margin-top:
      5px;
    font-size:
      10px;
  }

  .moon-phase-template2 .data-panel h3 {
    margin-bottom:
      8px !important;
    font-size:
      12px !important;
  }

  .moon-phase-template2 .data-row {
    padding:
      9px 0 !important;
    gap:
      8px;
  }

  .moon-phase-template2 .data-row span {
    font-size:
      11px;
  }

  .moon-phase-template2 .data-row strong {
    font-size:
      clamp(14px, 1.55vw, 18px) !important;
  }

  .moon-phase-template2 .timeline-labels {
    font-size:
      9px !important;
  }

  .moon-phase-template2 .playback-controls {
    gap:
      10px;
  }
}

/* 较窄中屏：仍保留左右对照，但右侧更窄，知识卡压缩 */
@media (min-width: 821px) and (max-width: 980px) {
  .moon-phase-template2 .main-grid {
    grid-template-columns:
      minmax(0, 1.36fr) minmax(210px, 0.64fr) !important;
    gap:
      10px !important;
  }

  .moon-phase-template2 .global-panel,
  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel,
  .moon-phase-template2 .control-panel {
    padding:
      12px !important;
  }

  .moon-phase-template2 .viewport-container {
    width:
      min(100%, 54vh, 500px) !important;
  }

  .moon-phase-template2 .moon-preview {
    width:
      min(128px, 54%) !important;
  }

  .moon-phase-template2 .phase-name {
    font-size:
      clamp(16px, 2vw, 21px) !important;
  }

  .moon-phase-template2 .data-row {
    padding:
      7px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size:
      10px;
  }

  .moon-phase-template2 .data-row strong {
    font-size:
      14px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr)) !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding:
      10px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size:
      9px !important;
    line-height:
      1.42 !important;
  }
}

/* 820px 以下才改为上下堆叠 */
@media (max-width: 820px) {
  .moon-phase-template2 .moon-stage-content {
    overflow:
      auto;
  }

  .moon-phase-template2 .main-grid {
    height:
      auto !important;
    min-height:
      100% !important;
    grid-template-columns:
      minmax(0, 1fr) !important;
    grid-template-rows:
      auto !important;
    gap:
      10px !important;
  }

  .moon-phase-template2 .left-column {
    grid-template-rows:
      minmax(350px, auto) clamp(70px, 12vh, 100px) !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
  }

  .moon-phase-template2 .viewport-container {
    width:
      min(100%, 620px) !important;
    max-height:
      none !important;
  }
}

/* 720 以下保持上一版小屏收敛，但这里明确使用上下结构 */
@media (max-width: 720px) {
  .moon-phase-template2 .viewport-container {
    width:
      min(100%, calc(100vw - 48px)) !important;
  }
}


/* ===================== v4: 一屏展示无滚动条布局 =====================
   目标：
   - 不再依赖滚动条；
   - 左侧为主视图和时间轴；
   - 右侧为地球观测视角 + 实时数据 + 知识卡片；
   - 中小屏通过缩小圆形视窗、月相预览、卡片内边距和文字行数保证一屏展示。
*/

/* 页面和主工作区全部禁止滚动，避免出现双滚动条 */
.moon-phase-template2,
.moon-phase-template2 .moon-template-workspace,
.moon-phase-template2 .moon-center-stage,
.moon-phase-template2 .moon-stage-content {
  overflow:
    hidden !important;
}

.moon-phase-template2 .moon-stage-content {
  height:
    100% !important;
  max-height:
    100% !important;
  min-height:
    0 !important;
  box-sizing:
    border-box;
  padding:
    clamp(10px, 1vw, 18px) !important;
}

/* 主网格：左右两列 */
.moon-phase-template2 .main-grid {
  width:
    100% !important;
  height:
    100% !important;
  min-height:
    0 !important;
  margin:
    0 auto !important;
  display:
    grid !important;
  grid-template-columns:
    minmax(0, 1.55fr) minmax(320px, 0.72fr) !important;
  grid-template-rows:
    minmax(0, 1fr) !important;
  gap:
    clamp(8px, 0.78vw, 14px) !important;
  overflow:
    hidden !important;
  align-items:
    stretch !important;
}

/* 左侧列：主视图 + 时间轴 */
.moon-phase-template2 .left-column {
  min-height: 0 !important;
  display: grid !important;
  grid-template-rows: minmax(0, 1fr) clamp(76px, 10vh, 108px) !important;
  gap: clamp(8px, 0.75vw, 12px) !important;
  overflow: hidden !important;
}

/* 右侧列：观测面板 + 数据面板 + 知识卡片 */
.moon-phase-template2 .right-column {
  min-height: 0 !important;
  display: grid !important;
  grid-template-rows: minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
  gap: clamp(8px, 0.75vw, 12px) !important;
  overflow: hidden !important;
}

.moon-phase-template2 .global-panel {
  min-height:
    0 !important;
  display:
    flex;
  flex-direction:
    column;
  overflow:
    hidden !important;
  padding:
    clamp(12px, 1vw, 20px) !important;
}

.moon-phase-template2 .control-panel {
  min-height:
    0 !important;
  height:
    100% !important;
  display:
    grid !important;
  grid-template-columns:
    auto minmax(0, 1fr) !important;
  align-items:
    center !important;
  gap:
    clamp(12px, 1vw, 18px) !important;
  padding:
    clamp(10px, 0.85vw, 16px) clamp(14px, 1.1vw, 22px) !important;
  overflow:
    hidden !important;
}

.moon-phase-template2 .knowledge-grid {
  min-height:
    0 !important;
  height:
    100% !important;
  display:
    grid !important;
  grid-template-columns:
    repeat(2, minmax(0, 1fr)) !important;
  gap:
    clamp(8px, 0.7vw, 12px) !important;
  overflow:
    hidden !important;
}

/* 圆形主视窗：按可用高度收缩，不把上半区撑爆 */
.moon-phase-template2 .panel-header {
  flex:
    0 0 auto;
  margin-bottom:
    clamp(8px, 0.78vw, 12px) !important;
}

.moon-phase-template2 .viewport-container {
  flex:
    1 1 auto;
  width:
    min(100%, 58vh, 700px) !important;
  max-width:
    100% !important;
  max-height:
    100% !important;
  margin:
    auto !important;
  aspect-ratio:
    1 / 1;
}

/* 右侧观察卡和数据卡压缩，不产生内部滚动 */
.moon-phase-template2 .observation-panel,
.moon-phase-template2 .data-panel {
  min-height:
    0 !important;
  max-height:
    100% !important;
  overflow:
    hidden !important;
  padding:
    clamp(12px, 0.9vw, 18px) !important;
}

.moon-phase-template2 .observation-panel h2 {
  margin-bottom:
    clamp(8px, 0.8vw, 14px) !important;
}

.moon-phase-template2 .moon-preview {
  width:
    min(190px, 62%, 20vh) !important;
  padding:
    clamp(6px, 0.55vw, 10px) !important;
}

.moon-phase-template2 .phase-name {
  margin-top:
    clamp(8px, 0.8vw, 12px) !important;
  font-size:
    clamp(18px, 1.8vw, 28px) !important;
  line-height:
    1.1;
}

.moon-phase-template2 .hemisphere-note {
  margin-top:
    5px !important;
  font-size:
    clamp(9px, 0.65vw, 11px) !important;
}

.moon-phase-template2 .data-panel h3 {
  margin-bottom:
    8px !important;
}

.moon-phase-template2 .data-row {
  padding:
    clamp(7px, 0.75vh, 11px) 0 !important;
}

.moon-phase-template2 .data-row strong {
  font-size:
    clamp(14px, 1.15vw, 19px) !important;
}

/* 底部控制条压缩 */
.moon-phase-template2 .playback-controls {
  min-width:
    0;
  gap:
    clamp(8px, 0.8vw, 12px) !important;
}

.moon-phase-template2 .moon-play-btn {
  width:
    clamp(36px, 2.8vw, 46px) !important;
  height:
    clamp(36px, 2.8vw, 46px) !important;
  min-width:
    clamp(36px, 2.8vw, 46px) !important;
}

.moon-phase-template2 .speed-group {
  gap:
    4px !important;
  padding:
    3px !important;
}

.moon-phase-template2 .speed-group .speed-btn {
  min-width:
    clamp(32px, 2.45vw, 42px) !important;
  height:
    clamp(26px, 2.4vh, 30px) !important;
  padding:
    0 8px !important;
}

.moon-phase-template2 .timeline {
  min-width:
    0;
}

.moon-phase-template2 .timeline-labels {
  margin-bottom:
    5px !important;
  font-size:
    clamp(8px, 0.62vw, 10px) !important;
}

/* 知识卡片一屏化：默认展示 2~3 行，避免撑高 */
.moon-phase-template2 .knowledge-card {
  min-width:
    0;
  height:
    100%;
  box-sizing:
    border-box;
  padding:
    clamp(10px, 0.85vw, 15px) !important;
  border-radius:
    clamp(12px, 0.9vw, 16px) !important;
  overflow:
    hidden !important;
}

.moon-phase-template2 .knowledge-card h3 {
  margin:
    0 0 5px !important;
  font-size:
    clamp(11px, 0.82vw, 14px) !important;
  line-height:
    1.25;
  white-space:
    nowrap;
  overflow:
    hidden;
  text-overflow:
    ellipsis;
}

.moon-phase-template2 .knowledge-card p {
  display:
    -webkit-box;
  margin:
    0 !important;
  overflow:
    hidden;
  font-size:
    clamp(9px, 0.68vw, 12px) !important;
  line-height:
    1.45 !important;
  text-align:
    left !important;
  -webkit-box-orient:
    vertical;
  -webkit-line-clamp:
    3;
}

/* 2200+ 大屏仍然一屏，不把内容做得太高 */
@media (min-width: 2200px) {
  .moon-phase-template2 .moon-stage-content {
    padding:
      clamp(16px, 1vw, 26px) !important;
  }

  .moon-phase-template2 .main-grid {
    width:
      min(100%, 2320px) !important;
    grid-template-columns:
      minmax(0, 1.72fr) minmax(320px, 0.7fr) !important;
    grid-template-rows:
      minmax(0, 1fr) clamp(96px, 10vh, 130px) clamp(120px, 13vh, 168px) !important;
  }

  .moon-phase-template2 .viewport-container {
    width:
      min(100%, 60vh, 820px) !important;
  }

  .moon-phase-template2 .moon-preview {
    width:
      min(260px, 66%, 22vh) !important;
  }

  .moon-phase-template2 .knowledge-card p {
    -webkit-line-clamp:
      4;
  }
}

/* 中屏：继续左右对照，一屏展示 */
@media (min-width: 821px) and (max-width: 1180px) {
  .moon-phase-template2 .moon-stage-content {
    padding:
      10px !important;
    overflow:
      hidden !important;
  }

  .moon-phase-template2 .main-grid {
    width:
      100% !important;
    height:
      100% !important;
    min-height:
      0 !important;
    grid-template-columns:
      minmax(0, 1.34fr) minmax(210px, 0.62fr) !important;
    grid-template-rows:
      minmax(0, 1fr) !important;
    gap:
      8px !important;
    overflow:
      hidden !important;
  }

  .moon-phase-template2 .left-column {
    grid-template-rows:
      minmax(0, 1fr) clamp(82px, 13vh, 112px) !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
  }

  .moon-phase-template2 .global-panel,
  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel,
  .moon-phase-template2 .control-panel {
    padding:
      10px !important;
  }

  .moon-phase-template2 .panel-header {
    margin-bottom:
      7px !important;
  }

  .moon-phase-template2 .panel-header h2,
  .moon-phase-template2 .observation-panel h2 {
    font-size:
      13px !important;
  }

  .moon-phase-template2 .pill-button,
  .moon-phase-template2 .angle-switch {
    padding:
      5px 8px !important;
    font-size:
      10px !important;
  }

  .moon-phase-template2 .viewport-container {
    width:
      min(100%, 50vh, 500px) !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
    gap:
      8px !important;
  }

  .moon-phase-template2 .moon-preview {
    width:
      min(118px, 52%, 16vh) !important;
    border-width:
      2px !important;
  }

  .moon-phase-template2 .phase-name {
    margin-top:
      7px !important;
    font-size:
      clamp(15px, 2vw, 20px) !important;
  }

  .moon-phase-template2 .hemisphere-note {
    font-size:
      9px !important;
  }

  .moon-phase-template2 .data-panel h3 {
    margin-bottom:
      4px !important;
    font-size:
      10px !important;
  }

  .moon-phase-template2 .data-row {
    padding:
      5px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size:
      9px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size:
      12px !important;
  }

  .moon-phase-template2 .control-panel {
    grid-template-columns:
      auto minmax(0, 1fr) !important;
    gap:
      10px !important;
  }

  .moon-phase-template2 .moon-play-btn {
    width:
      34px !important;
    height:
      34px !important;
    min-width:
      34px !important;
  }

  .moon-phase-template2 .timeline-labels {
    font-size:
      8px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;
    gap:
      8px !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding:
      8px !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    font-size:
      10px !important;
    margin-bottom:
      3px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size:
      8px !important;
    line-height:
      1.32 !important;
    -webkit-line-clamp:
      2;
  }
}

/* 窄屏：仍尽量左右对照，不再立刻上下长滚动 */
@media (max-width: 820px) {
  .moon-phase-template2 .moon-stage-content {
    padding:
      8px !important;
    overflow:
      hidden !important;
  }

  .moon-phase-template2 .main-grid {
    height:
      100% !important;
    min-height:
      0 !important;
    grid-template-columns:
      minmax(0, 1.2fr) minmax(150px, 0.58fr) !important;
    grid-template-rows:
      minmax(0, 1fr) !important;
    gap:
      7px !important;
  }

  .moon-phase-template2 .left-column {
    grid-template-rows:
      minmax(0, 1fr) 76px !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
  }

  .moon-phase-template2 .global-panel,
  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel,
  .moon-phase-template2 .control-panel {
    padding:
      8px !important;
    border-radius:
      14px !important;
  }

  .moon-phase-template2 .panel-header {
    margin-bottom:
      5px !important;
  }

  .moon-phase-template2 .panel-header h2,
  .moon-phase-template2 .observation-panel h2 {
    font-size:
      11px !important;
  }

  .moon-phase-template2 .header-actions {
    gap:
      5px !important;
  }

  .moon-phase-template2 .pill-button {
    padding:
      4px 6px !important;
    font-size:
      9px !important;
  }

  .moon-phase-template2 .angle-switch {
    display:
      none !important;
  }

  .moon-phase-template2 .viewport-container {
    width:
      min(100%, 42vh, 360px) !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
    gap:
      6px !important;
  }

  .moon-phase-template2 .observation-panel h2 {
    margin-bottom:
      6px !important;
  }

  .moon-phase-template2 .moon-preview {
    width:
      min(88px, 56%, 14vh) !important;
    padding:
      4px !important;
    border-width:
      2px !important;
  }

  .moon-phase-template2 .phase-name {
    margin-top:
      5px !important;
    font-size:
      13px !important;
    letter-spacing:
      0.06em;
  }

  .moon-phase-template2 .hemisphere-note {
    display:
      none !important;
  }

  .moon-phase-template2 .data-panel h3 {
    display:
      none !important;
  }

  .moon-phase-template2 .data-row {
    padding:
      3px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size:
      8px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size:
      10px !important;
  }

  .moon-phase-template2 .control-panel {
    grid-template-columns:
      auto minmax(0, 1fr) !important;
    gap:
      8px !important;
  }

  .moon-phase-template2 .playback-controls {
    gap:
      6px !important;
  }

  .moon-phase-template2 .moon-play-btn {
    width:
      30px !important;
    height:
      30px !important;
    min-width:
      30px !important;
  }

  .moon-phase-template2 .speed-group .speed-btn {
    min-width:
      28px !important;
    height:
      24px !important;
    padding:
      0 5px !important;
    font-size:
      9px !important;
  }

  .moon-phase-template2 .timeline-labels {
    display:
      none !important;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns:
      repeat(4, minmax(0, 1fr)) !important;
    gap:
      5px !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding:
      6px !important;
    border-radius:
      10px !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    margin:
      0 !important;
    font-size:
      8px !important;
    text-align:
      center;
  }

  .moon-phase-template2 .knowledge-card p {
    display:
      none !important;
  }
}


/* ===================== v5: 修复 2D / 3D 圆形视窗被压成椭圆 =====================
   v4 问题：
   - 为了一屏展示，把 .viewport-container 放进 flex 压缩逻辑里；
   - flex: 1 会让它按剩余高度拉伸；
   - width 和 height 不再相等，border-radius: 50% 后就变成椭圆。

   v5 处理：
   - 视窗使用同一个 --moon-viewport-size 同时控制 width / height；
   - 禁止 viewport 作为 flex 子项被拉伸；
   - 2D 与 3D 内层严格 inset:0，跟随正方形父容器；
   - 继续保持一屏布局，但通过调小正方形尺寸保证不溢出。
*/

.moon-phase-template2 {
  --moon-viewport-size:
    min(100%, 56vh, 680px);
}

.moon-phase-template2 .global-panel {
  align-items:
    center;
  justify-content:
    flex-start;
}

.moon-phase-template2 .viewport-container {
  flex:
    0 0 var(--moon-viewport-size) !important;
  width:
    var(--moon-viewport-size) !important;
  height:
    var(--moon-viewport-size) !important;
  min-width:
    0 !important;
  min-height:
    0 !important;
  max-width:
    var(--moon-viewport-size) !important;
  max-height:
    var(--moon-viewport-size) !important;
  aspect-ratio:
    1 / 1 !important;
  margin:
    auto !important;
  border-radius:
    50% !important;
  box-sizing:
    border-box !important;
  overflow:
    hidden !important;
  contain:
    layout paint size;
}

.moon-phase-template2 .view-2d,
.moon-phase-template2 .view-3d {
  position:
    absolute !important;
  inset:
    0 !important;
  width:
    100% !important;
  height:
    100% !important;
  aspect-ratio:
    1 / 1 !important;
  overflow:
    hidden !important;
  border-radius:
    50% !important;
}

.moon-phase-template2 .view-3d :deep(.three-canvas),
.moon-phase-template2 .viewport-container canvas {
  width:
    100% !important;
  height:
    100% !important;
  display:
    block !important;
}

/* 大屏：仍然一屏，但圆形尺寸用变量锁死 */
@media (min-width: 2200px) {
  .moon-phase-template2 {
    --moon-viewport-size:
      min(100%, 58vh, 800px);
  }
}

/* 中屏：保持左右对照，同时圆不变形 */
@media (min-width: 821px) and (max-width: 1180px) {
  .moon-phase-template2 {
    --moon-viewport-size:
      min(100%, 47vh, 480px);
  }

  .moon-phase-template2 .global-panel {
    justify-content:
      center;
  }

  .moon-phase-template2 .viewport-container {
    margin:
      0 auto !important;
  }
}

/* 较窄中屏：进一步缩小正方形圆视窗，宁愿小一点也不能变椭圆 */
@media (min-width: 821px) and (max-width: 980px) {
  .moon-phase-template2 {
    --moon-viewport-size:
      min(100%, 43vh, 420px);
  }
}

/* 820 以下：继续一屏对照，圆形尺寸按屏幕宽度和高度共同限制 */
@media (max-width: 820px) {
  .moon-phase-template2 {
    --moon-viewport-size:
      min(100%, 38vh, calc(100vw - 190px), 330px);
  }

  .moon-phase-template2 .global-panel {
    justify-content:
      center;
  }

  .moon-phase-template2 .panel-header {
    flex:
      0 0 auto;
  }
}

/* 640 以下：空间太窄时，右侧卡片最小宽度已经占用较多，圆再缩小一点 */
@media (max-width: 640px) {
  .moon-phase-template2 {
    --moon-viewport-size:
      min(100%, 35vh, calc(100vw - 168px), 280px);
  }
}

/* 超窄屏：不再强撑左右对照，否则圆和观测卡都无法正常阅读 */
@media (max-width: 520px) {
  .moon-phase-template2 .main-grid {
    grid-template-columns:
      minmax(0, 1fr) !important;
    grid-template-rows:
      auto !important;
  }

  .moon-phase-template2 .left-column {
    grid-template-rows:
      minmax(0, 1fr) clamp(76px, 14vh, 100px) !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(0, 0.32fr) minmax(0, 0.22fr) minmax(0, 0.46fr) !important;
  }

  .moon-phase-template2 {
    --moon-viewport-size:
      min(100%, 32vh, calc(100vw - 42px), 300px);
  }

  .moon-phase-template2 .moon-preview {
    width:
      min(70px, 42%) !important;
  }

  .moon-phase-template2 .phase-name {
    font-size:
      12px !important;
  }
}


/* ===================== v6: 顶部两段对齐 + 2D 小月相缩小 + 3D 矩形舞台 + 降低满屏绿色 =====================
   处理：
   1. 上帝视角标题保持左侧，切换 3D / 显示夹角保持右侧，恢复两段对齐；
   2. 2D 轨道上的 8 个小月相缩小，避免挤占轨道和标签；
   3. 3D 模式不再被圆形容器限制，改成更大的圆角矩形舞台；
   4. 文字层次改成：标题渐变、正文浅色、辅助灰蓝、太阳金色、关键数据分色，减少满屏绿色。
*/

.moon-phase-template2 {
  --moon-accent:
    #2ec4b6;
  --moon-blue:
    #39a7ff;
  --moon-gold:
    #fbbf24;
  --moon-purple:
    #a78bfa;
  --moon-text-main:
    #eaf8ff;
  --moon-text-soft:
    #cbd5e1;
  --moon-text-muted:
    #8ea6b8;
}

/* 1. 顶部标题和控制恢复两段对齐 */
.moon-phase-template2 .global-panel .panel-header {
  display:
    grid !important;
  grid-template-columns:
    minmax(0, 1fr) auto !important;
  align-items:
    center !important;
  gap:
    clamp(10px, 1vw, 16px) !important;
}

.moon-phase-template2 .global-panel .panel-header h2 {
  justify-self:
    start;
  min-width:
    0;
  color:
    var(--moon-text-main) !important;
  background:
    linear-gradient(90deg, var(--moon-text-main), var(--moon-blue), var(--moon-accent));
  background-clip:
    text;
  -webkit-background-clip:
    text;
  -webkit-text-fill-color:
    transparent;
  white-space:
    nowrap;
  overflow:
    hidden;
  text-overflow:
    ellipsis;
}

.moon-phase-template2 .global-panel .header-actions {
  justify-self:
    end;
  display:
    flex !important;
  flex-wrap:
    nowrap !important;
  align-items:
    center !important;
  justify-content:
    flex-end !important;
  gap:
    clamp(8px, 0.8vw, 12px) !important;
  min-width:
    max-content;
}

.moon-phase-template2 .global-panel .pill-button {
  min-width:
    max-content;
  color:
    var(--moon-text-main);
  background:
    rgba(36, 124, 255, 0.14);
  border-color:
    rgba(57, 167, 255, 0.34);
}

.moon-phase-template2 .global-panel .pill-button span:first-child {
  color:
    var(--moon-blue);
}

.moon-phase-template2 .global-panel .angle-switch {
  min-width:
    max-content;
  color:
    var(--moon-text-soft);
  background:
    rgba(8, 20, 34, 0.54);
}

/* 2. 2D 轨道小月相缩小 */
.moon-phase-template2 .orbit-marker,
.moon-phase-template2 .marker-moon {
  width:
    clamp(24px, 2.15vw, 32px) !important;
  height:
    clamp(24px, 2.15vw, 32px) !important;
}

.moon-phase-template2 .marker-moon {
  border-color:
    rgba(226, 232, 240, 0.52);
  background:
    rgba(15, 23, 42, 0.34);
}

.moon-phase-template2 .orbit-label {
  min-width:
    clamp(54px, 5vw, 72px) !important;
}

.moon-phase-template2 .orbit-label strong {
  color:
    var(--moon-text-main) !important;
  font-size:
    clamp(8px, 0.68vw, 11px) !important;
}

.moon-phase-template2 .orbit-label span {
  color:
    var(--moon-text-muted) !important;
  font-size:
    clamp(7px, 0.56vw, 9px) !important;
}

/* 月球和地球颜色降低绿色感 */
.moon-phase-template2 .moon-global {
  background:
    linear-gradient(to right, #111827 50%, #e5edf6 50%) !important;
  box-shadow:
    inset -2px 0 5px rgba(226, 232, 240, 0.44),
    inset 2px 0 5px rgba(0, 0, 0, 0.82),
    0 4px 14px rgba(0, 0, 0, 0.34) !important;
}

.moon-phase-template2 .earth-2d {
  color:
    var(--moon-text-main) !important;
  background:
    linear-gradient(to right, #0f172a 50%, rgba(57, 167, 255, 0.96) 50%) !important;
}

/* 3. 2D 保持正圆；3D 改为更大的矩形舞台 */
.moon-phase-template2 .viewport-container.is-2d-mode {
  border-radius:
    50% !important;
}

.moon-phase-template2 .viewport-container.is-2d-mode .view-2d {
  border-radius:
    50% !important;
}

/* 3D 模式下 global-panel 让 3D 视图占满 */
.moon-phase-template2 .global-panel.is-3d-mode {
  position: relative;
}

/* 3D 全屏视图：占满整个 global-panel */
.moon-phase-template2 .view-3d-full {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  border-radius: clamp(14px, 1vw, 20px);
  overflow: hidden;
  cursor: grab;
  background:
    radial-gradient(circle at 50% 50%, rgba(36, 124, 255, 0.14), rgba(2, 6, 23, 0.88));
}

.moon-phase-template2 .view-3d-full:active {
  cursor: grabbing;
}

.moon-phase-template2 .view-3d-full :deep(.three-canvas) {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
}

/* 4. 文字颜色层次：减少满屏绿色 */
.moon-phase-template2 .panel-header h2,
.moon-phase-template2 .observation-panel h2,
.moon-phase-template2 .knowledge-card h3,
.moon-phase-template2 .data-panel h3 {
  color:
    var(--moon-text-main) !important;
}

.moon-phase-template2 .observation-panel h2 .panel-icon,
.moon-phase-template2 .panel-header h2 .panel-icon {
  color:
    var(--moon-gold) !important;
}

.moon-phase-template2 .sun-light-label {
  color:
    var(--moon-gold) !important;
  text-shadow:
    0 0 12px rgba(251, 191, 36, 0.72) !important;
}

.moon-phase-template2 .phase-name {
  color:
    transparent !important;
  background:
    linear-gradient(90deg, #e5edf6, var(--moon-blue), var(--moon-accent));
  background-clip:
    text;
  -webkit-background-clip:
    text;
  -webkit-text-fill-color:
    transparent;
  text-shadow:
    none !important;
}

.moon-phase-template2 .hemisphere-note,
.moon-phase-template2 .knowledge-card p,
.moon-phase-template2 .data-row span,
.moon-phase-template2 .timeline-labels,
.moon-phase-template2 .angle-switch {
  color:
    var(--moon-text-muted) !important;
  opacity:
    1 !important;
}

.moon-phase-template2 .data-row:nth-child(1) strong {
  color:
    var(--moon-gold) !important;
}

.moon-phase-template2 .data-row:nth-child(2) strong {
  color:
    var(--moon-blue) !important;
}

.moon-phase-template2 .data-row:nth-child(3) strong {
  color:
    var(--moon-purple) !important;
}

.moon-phase-template2 .data-row small {
  color:
    var(--moon-text-muted) !important;
  opacity:
    1 !important;
}

.moon-phase-template2 .knowledge-card h3 {
  background:
    linear-gradient(90deg, var(--moon-text-main), var(--moon-blue));
  background-clip:
    text;
  -webkit-background-clip:
    text;
  -webkit-text-fill-color:
    transparent;
}

/* 中屏：继续两段对齐，小月相更小，3D 舞台保持矩形 */
@media (min-width: 821px) and (max-width: 1180px) {
  .moon-phase-template2 .global-panel .panel-header {
    grid-template-columns:
      minmax(0, 1fr) auto !important;
  }

  .moon-phase-template2 .global-panel .header-actions {
    gap:
      7px !important;
  }

  .moon-phase-template2 .orbit-marker,
  .moon-phase-template2 .marker-moon {
    width:
      24px !important;
    height:
      24px !important;
  }

  .moon-phase-template2 .orbit-label {
    min-width:
      48px !important;
  }

  .moon-phase-template2 .orbit-label strong {
    font-size:
      8px !important;
  }

  .moon-phase-template2 .orbit-label span {
    font-size:
      7px !important;
  }

}

/* 窄屏：标题和按钮仍保持左右两段，不堆在中间 */
@media (max-width: 820px) {
  .moon-phase-template2 .global-panel .panel-header {
    grid-template-columns:
      minmax(0, 1fr) auto !important;
    align-items:
      center !important;
  }

  .moon-phase-template2 .global-panel .panel-header h2 {
    font-size:
      11px !important;
  }

  .moon-phase-template2 .global-panel .header-actions {
    gap:
      5px !important;
  }

  .moon-phase-template2 .global-panel .pill-button {
    padding:
      4px 7px !important;
    font-size:
      9px !important;
  }

  .moon-phase-template2 .orbit-marker,
  .moon-phase-template2 .marker-moon {
    width:
      20px !important;
    height:
      20px !important;
  }

  .moon-phase-template2 .orbit-label {
    min-width:
      40px !important;
  }

}

/* 超窄屏：只保留 3D 切换按钮，夹角开关在 v4 已隐藏 */
@media (max-width: 520px) {

  .moon-phase-template2 .orbit-marker,
  .moon-phase-template2 .marker-moon {
    width:
      18px !important;
    height:
      18px !important;
  }
}


/* ===================== v7: 标题操作绝对两端对齐 + 月球颜色回退 + 倍速渐变按钮 =====================
   1. panel-header 直接用绝对定位兜底：
      - 标题固定左侧；
      - 切换 3D / 显示夹角固定右侧；
      - 不再受前面版本 flex-column / width:100% 影响。
   2. 月球颜色回退为原来的主题绿色，不再改成灰白 / 蓝白。
   3. 倍速按钮改成主题渐变背景，激活态更明显。
*/

/* 标题与操作区强制两端对齐 */
.moon-phase-template2 .global-panel .panel-header {
  position:
    relative !important;
  display:
    block !important;
  min-height:
    clamp(34px, 4.2vh, 46px) !important;
  margin-bottom:
    clamp(8px, 0.8vw, 12px) !important;
}

.moon-phase-template2 .global-panel .panel-header h2 {
  position:
    absolute !important;
  left:
    0 !important;
  top:
    50% !important;
  right:
    clamp(210px, 27vw, 360px) !important;
  display:
    flex !important;
  align-items:
    center !important;
  min-width:
    0 !important;
  margin:
    0 !important;
  transform:
    translateY(-50%) !important;
  text-align:
    left !important;
  justify-content:
    flex-start !important;
  white-space:
    nowrap !important;
  overflow:
    hidden !important;
  text-overflow:
    ellipsis !important;
}

.moon-phase-template2 .global-panel .header-actions {
  position:
    absolute !important;
  right:
    0 !important;
  top:
    50% !important;
  display:
    flex !important;
  width:
    auto !important;
  min-width:
    max-content !important;
  max-width:
    none !important;
  align-items:
    center !important;
  justify-content:
    flex-end !important;
  flex-direction:
    row !important;
  flex-wrap:
    nowrap !important;
  gap:
    clamp(8px, 0.8vw, 12px) !important;
  transform:
    translateY(-50%) !important;
}

.moon-phase-template2 .global-panel .pill-button,
.moon-phase-template2 .global-panel .angle-switch {
  flex:
    0 0 auto !important;
  width:
    auto !important;
  white-space:
    nowrap !important;
}

/* 月球颜色回退：2D 轨道月球、主月相、3D 月球继续使用原主题绿色 */
.moon-phase-template2 .moon-global {
  background:
    linear-gradient(to right, #1e293b 50%, #2ec4b6 50%) !important;
  box-shadow:
    inset -2px 0 5px rgba(46, 196, 182, 0.5),
    inset 2px 0 5px rgba(0, 0, 0, 0.8),
    0 4px 14px rgba(0, 0, 0, 0.34) !important;
}

.moon-phase-template2 .moon-global span {
  color:
    #2ec4b6 !important;
}

.moon-phase-template2 .marker-moon {
  border-color:
    rgba(46, 196, 182, 0.46) !important;
}

.moon-phase-template2 .moon-preview {
  border-color:
    rgba(46, 196, 182, 0.38) !important;
}

/* 倍速按钮渐变背景 */
.moon-phase-template2 .speed-group {
  background:
    rgba(8, 20, 34, 0.48) !important;
  border-color:
    rgba(116, 234, 229, 0.18) !important;
}

.moon-phase-template2 .speed-group .speed-btn {
  color:
    rgba(226, 232, 240, 0.86) !important;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.14),
      rgba(36, 124, 255, 0.12)) !important;
  border:
    1px solid rgba(116, 234, 229, 0.16) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
}

.moon-phase-template2 .speed-group .speed-btn:hover {
  color:
    #ffffff !important;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.32),
      rgba(36, 124, 255, 0.28)) !important;
  border-color:
    rgba(46, 196, 182, 0.48) !important;
}

.moon-phase-template2 .speed-group .speed-btn.active {
  color:
    #ffffff !important;
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #39a7ff,
      #247cff) !important;
  border-color:
    transparent !important;
  box-shadow:
    0 0 16px rgba(46, 196, 182, 0.22),
    0 6px 18px rgba(36, 124, 255, 0.22) !important;
}

/* 中屏：仍然绝对两端对齐，右侧操作不掉到中间 */
@media (min-width: 821px) and (max-width: 1180px) {
  .moon-phase-template2 .global-panel .panel-header {
    min-height:
      34px !important;
  }

  .moon-phase-template2 .global-panel .panel-header h2 {
    right:
      178px !important;
    font-size:
      13px !important;
  }

  .moon-phase-template2 .global-panel .header-actions {
    gap:
      6px !important;
  }

  .moon-phase-template2 .global-panel .pill-button,
  .moon-phase-template2 .global-panel .angle-switch {
    padding:
      5px 7px !important;
    font-size:
      10px !important;
  }
}

/* 窄屏：为了不挤中间，标题和按钮仍左右贴边；夹角开关保持 v4 的隐藏逻辑 */
@media (max-width: 820px) {
  .moon-phase-template2 .global-panel .panel-header {
    min-height:
      30px !important;
  }

  .moon-phase-template2 .global-panel .panel-header h2 {
    left:
      0 !important;
    right:
      92px !important;
    font-size:
      11px !important;
  }

  .moon-phase-template2 .global-panel .header-actions {
    right:
      0 !important;
    gap:
      5px !important;
  }

  .moon-phase-template2 .global-panel .pill-button {
    padding:
      4px 7px !important;
    font-size:
      9px !important;
  }
}


/* ===================== v8: 修复上帝视角标题操作区真正两端对齐 =====================
   根因：
   - v5 / v6 里 .global-panel 被设置了 align-items: center；
   - .panel-header 没有强制 width:100%，会被内容撑成一个小盒子；
   - v7 的 absolute 只是在这个小盒子内部左右贴边，所以视觉上仍然挤在中间。

   处理：
   - 给上帝视角标题栏单独加 global-view-header / global-view-title / global-view-actions；
   - header 强制 align-self: stretch + width:100%；
   - 用 grid-template-columns: minmax(0,1fr) max-content；
   - 把 v7 的 absolute 定位全部压回 static；
   - 标题左对齐，操作区右对齐。
*/

.moon-phase-template2 .global-panel {
  align-items:
    stretch !important;
}

.moon-phase-template2 .global-panel .global-view-header {
  position:
    relative !important;
  display:
    grid !important;
  width:
    100% !important;
  max-width:
    100% !important;
  min-width:
    0 !important;
  align-self:
    stretch !important;
  grid-template-columns:
    minmax(0, 1fr) max-content !important;
  grid-template-areas:
    "title actions" !important;
  align-items:
    center !important;
  justify-content:
    stretch !important;
  gap:
    clamp(10px, 1vw, 16px) !important;
  min-height:
    clamp(34px, 4.2vh, 46px) !important;
  margin:
    0 0 clamp(8px, 0.8vw, 12px) !important;
  box-sizing:
    border-box !important;
}

.moon-phase-template2 .global-panel .global-view-title {
  grid-area:
    title !important;
  position:
    static !important;
  inset:
    auto !important;
  left:
    auto !important;
  right:
    auto !important;
  top:
    auto !important;
  bottom:
    auto !important;
  display:
    flex !important;
  min-width:
    0 !important;
  width:
    auto !important;
  max-width:
    100% !important;
  align-items:
    center !important;
  justify-content:
    flex-start !important;
  margin:
    0 !important;
  text-align:
    left !important;
  white-space:
    nowrap !important;
  overflow:
    hidden !important;
  text-overflow:
    ellipsis !important;
  transform:
    none !important;
}

.moon-phase-template2 .global-panel .global-view-actions {
  grid-area:
    actions !important;
  position:
    static !important;
  inset:
    auto !important;
  left:
    auto !important;
  right:
    auto !important;
  top:
    auto !important;
  bottom:
    auto !important;
  display:
    flex !important;
  width:
    auto !important;
  min-width:
    max-content !important;
  max-width:
    none !important;
  align-items:
    center !important;
  justify-content:
    flex-end !important;
  justify-self:
    end !important;
  flex-direction:
    row !important;
  flex-wrap:
    nowrap !important;
  gap:
    clamp(8px, 0.8vw, 12px) !important;
  margin:
    0 !important;
  transform:
    none !important;
}

.moon-phase-template2 .global-panel .global-view-actions .pill-button,
.moon-phase-template2 .global-panel .global-view-actions .angle-switch {
  flex:
    0 0 auto !important;
  width:
    auto !important;
  min-width:
    max-content !important;
  white-space:
    nowrap !important;
}

/* 视窗在标题栏下面居中，不再影响标题栏宽度 */
.moon-phase-template2 .global-panel .viewport-container {
  align-self:
    center !important;
}

/* 倍速按钮：所有按钮都有渐变底，激活态更明显 */
.moon-phase-template2 .speed-group .speed-btn {
  color:
    #ffffff !important;
  background:
    linear-gradient(135deg,
      rgba(46, 196, 182, 0.36),
      rgba(57, 167, 255, 0.28),
      rgba(36, 124, 255, 0.24)) !important;
  border:
    1px solid rgba(116, 234, 229, 0.28) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 4px 12px rgba(36, 124, 255, 0.10) !important;
}

.moon-phase-template2 .speed-group .speed-btn.active {
  background:
    linear-gradient(135deg,
      #2ec4b6,
      #39a7ff,
      #247cff) !important;
  border-color:
    transparent !important;
  box-shadow:
    0 0 18px rgba(46, 196, 182, 0.30),
    0 8px 20px rgba(36, 124, 255, 0.28) !important;
}

/* 中屏仍然两端对齐 */
@media (min-width: 821px) and (max-width: 1180px) {
  .moon-phase-template2 .global-panel .global-view-header {
    grid-template-columns:
      minmax(0, 1fr) max-content !important;
    min-height:
      34px !important;
    gap:
      8px !important;
  }

  .moon-phase-template2 .global-panel .global-view-title {
    font-size:
      13px !important;
  }

  .moon-phase-template2 .global-panel .global-view-actions {
    gap:
      6px !important;
  }

  .moon-phase-template2 .global-panel .global-view-actions .pill-button,
  .moon-phase-template2 .global-panel .global-view-actions .angle-switch {
    padding:
      5px 7px !important;
    font-size:
      10px !important;
  }
}

/* 820 以下空间很窄：仍保持左右，不再堆到中间 */
@media (max-width: 820px) {
  .moon-phase-template2 .global-panel .global-view-header {
    grid-template-columns:
      minmax(0, 1fr) max-content !important;
    min-height:
      30px !important;
    gap:
      6px !important;
  }

  .moon-phase-template2 .global-panel .global-view-title {
    font-size:
      11px !important;
  }

  .moon-phase-template2 .global-panel .global-view-actions {
    gap:
      5px !important;
  }

  .moon-phase-template2 .global-panel .global-view-actions .pill-button {
    padding:
      4px 7px !important;
    font-size:
      9px !important;
  }
}

/* ===================== v9: 月球正常颜色与大屏满屏修正 =====================
   - 2D 轨道月球亮面由主题青绿色改为月面灰白；
   - 3D 主场景月球和右侧观测月球改为暖灰白受光；
   - 右侧观测月球强化 moon.jpg 贴图和 bump；
   - 主内容在大屏下占满一屏，减少底部空白。
*/
.moon-phase-template2 .moon-template-workspace {
  height: calc(100vh - var(--header-height, 64px));
  min-height: 0;
}

.moon-phase-template2 .moon-center-stage,
.moon-phase-template2 .stage-content,
.moon-phase-template2 .moon-stage-content {
  height: 100%;
  min-height: 0;
}

.moon-phase-template2 .moon-stage-content {
  overflow: hidden;
}

.moon-phase-template2 .main-grid {
  height: 100%;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}

.moon-phase-template2 .left-column {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(12px, 1vw, 18px);
  min-height: 0;
}

.moon-phase-template2 .right-column {
  height: 100%;
  min-height: 0;
  grid-template-rows:
    minmax(210px, 0.34fr) minmax(120px, 0.22fr) minmax(0, 0.44fr);
}

.moon-phase-template2 .global-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.moon-phase-template2 .viewport-container {
  flex: 1;
  width: min(100%, 760px);
  max-height: 100%;
}

.moon-phase-template2 .view-3d-full {
  flex: 1;
  min-height: 0;
}

.moon-phase-template2 .knowledge-grid {
  min-height: 0;
}

.moon-phase-template2 .knowledge-card {
  min-height: 0;
  overflow: hidden;
}

.moon-phase-template2 .moon-global {
  background: linear-gradient(to right, #111827 50%, #d8d6c8 50%) !important;
}

@media (min-width: 1500px) {
  .moon-phase-template2 .moon-stage-content {
    padding: clamp(12px, 1vw, 18px) clamp(24px, 2vw, 42px);
  }

  .moon-phase-template2 .main-grid {
    width: min(100%, 1860px);
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 700px);
  }

  .moon-phase-template2 .global-panel,
  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel {
    padding: clamp(18px, 1.3vw, 26px);
  }

  .moon-phase-template2 .knowledge-card {
    padding: clamp(16px, 1.2vw, 22px);
  }
}

@media (min-width: 2200px) {
  .moon-phase-template2 .main-grid {
    width: min(100%, 2320px);
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 860px);
  }
}

@media (max-width: 980px) {
  .moon-phase-template2 .moon-template-workspace {
    height: auto;
  }

  .moon-phase-template2 .moon-stage-content {
    overflow: auto;
  }

  .moon-phase-template2 .main-grid {
    height: auto;
    grid-template-rows: auto;
  }

  .moon-phase-template2 .left-column {
    display: flex;
    flex-direction: column;
  }
}


/* ===================== v10: 真满屏布局与观测月球防裁切 =====================
   - 根容器改为 Header + 主区 两行网格；
   - workspace / center-stage / stage-content / main-grid 全部强制撑满剩余高度；
   - 右侧观测月球缩小并固定在卡片内，不再被裁切；
   - 右侧知识卡区域跟随剩余高度拉伸，减少底部空白。
*/
.moon-phase-template2 {
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  width: 100vw !important;
  height: 100vh !important;
  min-height: 100vh !important;
  overflow: hidden !important;
}

.moon-phase-template2 .moon-template-toolbar {
  grid-row: 1;
  flex: 0 0 auto;
}

.moon-phase-template2 .moon-template-workspace {
  grid-row: 2;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.moon-phase-template2 .moon-center-stage {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.moon-phase-template2 .moon-stage-content {
  position: absolute !important;
  inset: 0 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  box-sizing: border-box !important;
  padding: clamp(10px, 1vw, 18px) clamp(22px, 2vw, 42px) !important;
  overflow: hidden !important;
}

.moon-phase-template2 .main-grid {
  width: min(100%, 1860px) !important;
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 auto !important;
  display: grid !important;
  grid-template-columns: minmax(0, 2.18fr) minmax(340px, 0.82fr) !important;
  grid-template-rows: minmax(0, 1fr) !important;
  align-items: stretch !important;
}

.moon-phase-template2 .left-column {
  display: grid !important;
  grid-template-rows: minmax(0, 1fr) auto !important;
  gap: clamp(10px, 0.9vw, 16px) !important;
  height: 100% !important;
  min-height: 0 !important;
}

.moon-phase-template2 .right-column {
  display: grid !important;
  grid-template-rows:
    minmax(250px, 0.36fr) minmax(126px, 0.18fr) minmax(0, 0.46fr) !important;
  gap: clamp(10px, 0.85vw, 15px) !important;
  height: 100% !important;
  min-height: 0 !important;
}

.moon-phase-template2 .global-panel {
  min-height: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
}

.moon-phase-template2 .control-panel {
  flex: 0 0 auto !important;
  min-height: 72px !important;
  padding-top: clamp(14px, 1vw, 18px) !important;
  padding-bottom: clamp(14px, 1vw, 18px) !important;
}

.moon-phase-template2 .observation-panel {
  min-height: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
  justify-content: flex-start !important;
  padding: clamp(14px, 1vw, 20px) !important;
}

.moon-phase-template2 .observation-panel h2 {
  flex: 0 0 auto !important;
  margin-bottom: clamp(8px, 0.75vw, 13px) !important;
}

.moon-phase-template2 .moon-preview {
  flex: 0 0 auto !important;
  width: min(176px, 58%) !important;
  max-width: 176px !important;
  max-height: 176px !important;
  padding: 7px !important;
  margin-top: 0 !important;
  overflow: hidden !important;
}

.moon-phase-template2 .moon-phase-3d {
  width: 100% !important;
  height: 100% !important;
  display: grid !important;
  place-items: center !important;
}

.moon-phase-template2 .moon-phase-3d :deep(.moon-phase-canvas-3d) {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

.moon-phase-template2 .phase-name {
  flex: 0 0 auto !important;
  margin-top: clamp(8px, 0.7vw, 12px) !important;
  font-size: clamp(18px, 1.65vw, 26px) !important;
  line-height: 1.15 !important;
}

.moon-phase-template2 .hemisphere-note {
  flex: 0 0 auto !important;
  margin-top: 5px !important;
}

.moon-phase-template2 .data-panel {
  min-height: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
  padding: clamp(14px, 1vw, 20px) !important;
}

.moon-phase-template2 .data-row {
  padding: clamp(9px, 0.72vw, 13px) 0 !important;
}

.moon-phase-template2 .knowledge-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
  gap: clamp(10px, 0.8vw, 14px) !important;
  height: 100% !important;
  min-height: 0 !important;
  align-self: stretch !important;
}

.moon-phase-template2 .knowledge-card {
  min-height: 0 !important;
  height: 100% !important;
  overflow: hidden !important;
  padding: clamp(14px, 1vw, 20px) !important;
}

.moon-phase-template2 .knowledge-card p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

@media (min-width: 1500px) {
  .moon-phase-template2 .moon-stage-content {
    padding: clamp(10px, 0.9vw, 16px) clamp(28px, 2.2vw, 48px) !important;
  }

  .moon-phase-template2 .main-grid {
    width: min(100%, 1880px) !important;
    grid-template-columns: minmax(0, 2.22fr) minmax(360px, 0.78fr) !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(245px, 0.34fr) minmax(122px, 0.18fr) minmax(0, 0.48fr) !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(172px, 55%) !important;
    max-width: 172px !important;
    max-height: 172px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 720px) !important;
  }
}

@media (min-width: 2200px) {
  .moon-phase-template2 .main-grid {
    width: min(100%, 2320px) !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(230px, 62%) !important;
    max-width: 230px !important;
    max-height: 230px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 860px) !important;
  }
}

@media (max-width: 980px) {
  .moon-phase-template2 {
    display: block !important;
    height: auto !important;
    min-height: 100vh !important;
    overflow: auto !important;
  }

  .moon-phase-template2 .moon-template-workspace,
  .moon-phase-template2 .moon-center-stage,
  .moon-phase-template2 .moon-stage-content {
    position: relative !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .main-grid {
    height: auto !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
  }

  .moon-phase-template2 .left-column {
    display: flex !important;
    flex-direction: column !important;
    height: auto !important;
  }

  .moon-phase-template2 .right-column {
    height: auto !important;
    grid-template-rows: auto !important;
  }
}


/* ===================== v11: 小屏适配与宽扁屏观测面板修正 =====================
   - 小屏强制单列纵向滚动，禁止内部横向挤压；
   - 低高度大屏 / 2400x800 宽扁屏压缩右侧观测面板；
   - 右侧观测月球不再顶出卡片，月相名称和说明始终可见；
   - 修正控制条在小屏跑到右侧窄栏的问题。
*/
.moon-phase-template2,
.moon-phase-template2 * {
  box-sizing: border-box;
}

.moon-phase-template2 .main-grid,
.moon-phase-template2 .left-column,
.moon-phase-template2 .right-column,
.moon-phase-template2 .global-panel,
.moon-phase-template2 .control-panel,
.moon-phase-template2 .observation-panel,
.moon-phase-template2 .data-panel,
.moon-phase-template2 .knowledge-grid {
  min-width: 0;
}

/* 宽扁屏：例如 2400 × 800，优先保证右侧观测月球和文字不被裁掉 */
@media (min-width: 1440px) and (max-height: 900px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 8px clamp(26px, 2vw, 46px) !important;
  }

  .moon-phase-template2 .main-grid {
    gap: clamp(10px, 0.75vw, 14px) !important;
    grid-template-columns: minmax(0, 2.28fr) minmax(330px, 0.72fr) !important;
  }

  .moon-phase-template2 .left-column {
    gap: 10px !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(190px, 0.31fr) minmax(104px, 0.17fr) minmax(0, 0.52fr) !important;
    gap: 9px !important;
  }

  .moon-phase-template2 .global-panel {
    padding: clamp(12px, 0.8vw, 18px) !important;
  }

  .moon-phase-template2 .global-view-header {
    margin-bottom: 8px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 650px) !important;
  }

  .moon-phase-template2 .control-panel {
    min-height: 62px !important;
    padding: 10px 18px !important;
  }

  .moon-phase-template2 .observation-panel {
    padding: 12px 14px !important;
  }

  .moon-phase-template2 .observation-panel h2 {
    margin-bottom: 6px !important;
    font-size: 16px !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(138px, 46%) !important;
    max-width: 138px !important;
    max-height: 138px !important;
    padding: 6px !important;
  }

  .moon-phase-template2 .phase-name {
    margin-top: 6px !important;
    font-size: clamp(17px, 1.15vw, 22px) !important;
    line-height: 1.1 !important;
  }

  .moon-phase-template2 .hemisphere-note {
    display: block !important;
    margin-top: 3px !important;
    font-size: 10px !important;
    line-height: 1.2 !important;
  }

  .moon-phase-template2 .data-panel {
    padding: 12px 16px !important;
  }

  .moon-phase-template2 .data-panel h3 {
    margin-bottom: 4px !important;
  }

  .moon-phase-template2 .data-row {
    padding: 7px 0 !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding: 12px 14px !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    margin-bottom: 5px !important;
    font-size: 13px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size: 11px !important;
    line-height: 1.45 !important;
    -webkit-line-clamp: 4 !important;
  }
}

/* 小屏 / 窄屏：彻底切成单列，不再让控制条挤到右侧 */
@media (max-width: 1100px),
(max-height: 640px) and (max-width: 1300px) {
  .moon-phase-template2 {
    display: block !important;
    width: 100vw !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 100vh !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }

  .moon-phase-template2 .moon-template-toolbar {
    position: sticky !important;
    top: 0 !important;
    z-index: 200 !important;
  }

  .moon-phase-template2 .moon-template-workspace,
  .moon-phase-template2 .moon-center-stage,
  .moon-phase-template2 .stage-content,
  .moon-phase-template2 .moon-stage-content {
    position: relative !important;
    inset: auto !important;
    display: block !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .moon-stage-content {
    padding: 10px !important;
  }

  .moon-phase-template2 .main-grid {
    display: flex !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .left-column {
    display: flex !important;
    width: 100% !important;
    height: auto !important;
    flex-direction: column !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .right-column {
    display: flex !important;
    width: 100% !important;
    height: auto !important;
    flex-direction: column !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .global-panel {
    width: 100% !important;
    height: auto !important;
    min-height: 360px !important;
    padding: 12px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .global-view-header {
    align-items: flex-start !important;
    flex-direction: column !important;
    gap: 8px !important;
    margin-bottom: 10px !important;
  }

  .moon-phase-template2 .global-view-actions {
    width: 100% !important;
    justify-content: flex-start !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 560px) !important;
    max-width: 100% !important;
    margin: 0 auto !important;
  }

  .moon-phase-template2 .view-3d-full {
    width: 100% !important;
    height: min(58vh, 420px) !important;
    min-height: 320px !important;
  }

  .moon-phase-template2 .control-panel {
    width: 100% !important;
    min-height: auto !important;
    align-items: stretch !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 12px !important;
  }

  .moon-phase-template2 .playback-controls {
    width: 100% !important;
    justify-content: flex-start !important;
  }

  .moon-phase-template2 .timeline {
    width: 100% !important;
  }

  .moon-phase-template2 .observation-panel {
    width: 100% !important;
    height: auto !important;
    min-height: 260px !important;
    padding: 14px !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(180px, 46vw) !important;
    max-width: 180px !important;
    max-height: 180px !important;
    padding: 7px !important;
  }

  .moon-phase-template2 .phase-name {
    margin-top: 8px !important;
    font-size: clamp(18px, 6vw, 26px) !important;
  }

  .moon-phase-template2 .hemisphere-note {
    display: block !important;
    margin-bottom: 2px !important;
  }

  .moon-phase-template2 .data-panel {
    width: 100% !important;
    height: auto !important;
    padding: 14px !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .knowledge-grid {
    display: grid !important;
    width: 100% !important;
    height: auto !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: auto !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .knowledge-card {
    height: auto !important;
    min-height: auto !important;
    padding: 14px !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    overflow: visible !important;
    -webkit-line-clamp: unset !important;
  }
}

/* 极窄屏：进一步压缩 2D 圆图和文字，避免横向滚动条 */
@media (max-width: 760px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 8px !important;
  }

  .moon-phase-template2 .global-panel {
    min-height: 320px !important;
    border-radius: 16px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 430px) !important;
  }

  .moon-phase-template2 .view-3d-full {
    height: min(54vh, 360px) !important;
    min-height: 280px !important;
  }

  .moon-phase-template2 .timeline-labels {
    font-size: 8px !important;
  }

  .moon-phase-template2 .orbit-label {
    min-width: 54px !important;
  }

  .moon-phase-template2 .orbit-label strong {
    font-size: 8px !important;
  }

  .moon-phase-template2 .orbit-label span {
    font-size: 7px !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(160px, 50vw) !important;
    max-width: 160px !important;
    max-height: 160px !important;
  }
}


/* ===================== v12: 观测月球放大与右侧文字增强 =====================
   - 观测卡片改为月球 + 文案自适应布局，不再要求名称必须在月球正下方；
   - 右侧观测月球放大；
   - 右侧数据卡、知识卡文字整体加大；
   - 宽扁屏下采用横向布局，避免月球和文字互相挤压。
*/
.moon-phase-template2 .observation-panel {
  align-items: stretch !important;
}

.moon-phase-template2 .observation-body {
  flex: 1 1 auto !important;
  display: grid !important;
  grid-template-columns: minmax(150px, 0.58fr) minmax(120px, 0.42fr) !important;
  align-items: center !important;
  gap: clamp(12px, 1vw, 20px) !important;
  width: 100% !important;
  min-height: 0 !important;
}

.moon-phase-template2 .observation-copy {
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: flex-start !important;
  gap: clamp(6px, 0.6vw, 10px) !important;
}

.moon-phase-template2 .moon-preview {
  justify-self: center !important;
  width: min(236px, 82%) !important;
  max-width: 236px !important;
  max-height: 236px !important;
  padding: 8px !important;
}

.moon-phase-template2 .phase-name {
  margin-top: 0 !important;
  font-size: clamp(24px, 1.8vw, 34px) !important;
  line-height: 1.08 !important;
  text-align: left !important;
  letter-spacing: 0.08em !important;
}

.moon-phase-template2 .hemisphere-note {
  margin-top: 0 !important;
  color: rgba(226, 248, 255, 0.72) !important;
  font-size: clamp(12px, 0.92vw, 15px) !important;
  line-height: 1.45 !important;
}

.moon-phase-template2 .observation-tip {
  color: rgba(46, 196, 182, 0.78);
  font-size: clamp(12px, 0.88vw, 14px);
  line-height: 1.45;
}

.moon-phase-template2 .data-panel h3 {
  font-size: clamp(14px, 1vw, 17px) !important;
}

.moon-phase-template2 .data-row span {
  font-size: clamp(13px, 0.95vw, 16px) !important;
}

.moon-phase-template2 .data-row strong {
  font-size: clamp(18px, 1.35vw, 24px) !important;
}

.moon-phase-template2 .data-row small {
  font-size: clamp(12px, 0.88vw, 14px) !important;
}

.moon-phase-template2 .knowledge-card h3 {
  font-size: clamp(15px, 1.05vw, 18px) !important;
}

.moon-phase-template2 .knowledge-card p {
  font-size: clamp(13px, 0.92vw, 15px) !important;
  line-height: 1.62 !important;
}

/* 宽扁屏：让观测卡片横向排布，月球变大但不吃掉文字空间 */
@media (min-width: 1440px) and (max-height: 900px) {
  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(210px, 0.34fr) minmax(108px, 0.17fr) minmax(0, 0.49fr) !important;
  }

  .moon-phase-template2 .observation-body {
    grid-template-columns: minmax(150px, 0.56fr) minmax(130px, 0.44fr) !important;
    gap: clamp(10px, 0.75vw, 16px) !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(190px, 82%) !important;
    max-width: 190px !important;
    max-height: 190px !important;
  }

  .moon-phase-template2 .phase-name {
    font-size: clamp(22px, 1.45vw, 29px) !important;
  }

  .moon-phase-template2 .hemisphere-note {
    font-size: clamp(12px, 0.78vw, 14px) !important;
  }

  .moon-phase-template2 .observation-tip {
    font-size: clamp(11px, 0.72vw, 13px) !important;
  }

  .moon-phase-template2 .data-row span {
    font-size: clamp(13px, 0.82vw, 15px) !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: clamp(18px, 1.05vw, 22px) !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    font-size: clamp(14px, 0.9vw, 16px) !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size: clamp(12px, 0.78vw, 14px) !important;
    line-height: 1.5 !important;
    -webkit-line-clamp: 4 !important;
  }
}

/* 正常高屏或小屏：观测卡片可回到上下排，但月球仍保持更大 */
@media (max-width: 1100px),
(max-height: 640px) and (max-width: 1300px) {
  .moon-phase-template2 .observation-body {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .observation-copy {
    align-items: center !important;
    text-align: center !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(210px, 58vw) !important;
    max-width: 210px !important;
    max-height: 210px !important;
  }

  .moon-phase-template2 .phase-name {
    text-align: center !important;
    font-size: clamp(22px, 6vw, 32px) !important;
  }

  .moon-phase-template2 .hemisphere-note,
  .moon-phase-template2 .observation-tip {
    text-align: center !important;
    font-size: clamp(12px, 3.2vw, 15px) !important;
  }

  .moon-phase-template2 .data-row span {
    font-size: 14px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: 20px !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    font-size: 16px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size: 14px !important;
    line-height: 1.65 !important;
  }
}

@media (max-width: 760px) {
  .moon-phase-template2 .moon-preview {
    width: min(184px, 56vw) !important;
    max-width: 184px !important;
    max-height: 184px !important;
  }
}


/* ===================== v13: 中等宽度低高度屏幕右侧数据卡修正 =====================
   - 修复 1300~1439px 宽、700~820px 高时，右侧数据卡被挤出可视区；
   - 这类屏幕还不能进入小屏单列，也没命中 1440+ 宽扁屏规则；
   - 单独压缩观测区高度，让实时天文数据完整显示；
   - 知识卡区域允许内部滚动，优先保证观测区和数据区可见。
*/
@media (min-width: 1200px) and (max-width: 1439px) and (max-height: 840px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 8px 22px !important;
  }

  .moon-phase-template2 .main-grid {
    width: 100% !important;
    grid-template-columns: minmax(0, 2.05fr) minmax(330px, 0.88fr) !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .left-column {
    gap: 9px !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(188px, 0.31fr) minmax(154px, 0.25fr) minmax(0, 0.44fr) !important;
    gap: 8px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .global-panel {
    padding: 12px !important;
  }

  .moon-phase-template2 .global-view-header {
    margin-bottom: 6px !important;
  }

  .moon-phase-template2 .panel-header h2,
  .moon-phase-template2 .observation-panel h2 {
    font-size: 15px !important;
  }

  .moon-phase-template2 .header-actions {
    gap: 6px !important;
  }

  .moon-phase-template2 .pill-button,
  .moon-phase-template2 .angle-switch {
    padding: 5px 9px !important;
    font-size: 11px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 560px) !important;
  }

  .moon-phase-template2 .control-panel {
    min-height: 58px !important;
    padding: 9px 16px !important;
    gap: 14px !important;
  }

  .moon-phase-template2 .moon-play-btn {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
  }

  .moon-phase-template2 .speed-btn {
    height: 30px !important;
    min-height: 30px !important;
    padding: 0 10px !important;
    font-size: 12px !important;
  }

  .moon-phase-template2 .timeline-labels {
    margin-bottom: 4px !important;
    font-size: 9px !important;
  }

  .moon-phase-template2 .observation-panel {
    padding: 10px 12px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .observation-panel h2 {
    margin-bottom: 4px !important;
  }

  .moon-phase-template2 .observation-body {
    grid-template-columns: minmax(122px, 0.48fr) minmax(138px, 0.52fr) !important;
    gap: 9px !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(150px, 80%) !important;
    max-width: 150px !important;
    max-height: 150px !important;
    padding: 6px !important;
  }

  .moon-phase-template2 .phase-name {
    font-size: clamp(20px, 1.55vw, 25px) !important;
    line-height: 1.05 !important;
    letter-spacing: 0.05em !important;
  }

  .moon-phase-template2 .hemisphere-note {
    font-size: 11px !important;
    line-height: 1.25 !important;
  }

  .moon-phase-template2 .observation-tip {
    font-size: 11px !important;
    line-height: 1.25 !important;
  }

  .moon-phase-template2 .data-panel {
    padding: 11px 14px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .data-panel h3 {
    margin-bottom: 5px !important;
    font-size: 14px !important;
  }

  .moon-phase-template2 .data-row {
    padding: 8px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size: 13px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: 18px !important;
  }

  .moon-phase-template2 .data-row small {
    font-size: 11px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    min-height: 0 !important;
    overflow: hidden !important;
    gap: 8px !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding: 10px 12px !important;
    overflow: auto !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    margin-bottom: 4px !important;
    font-size: 13px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    overflow: visible !important;
    font-size: 11px !important;
    line-height: 1.42 !important;
    -webkit-line-clamp: unset !important;
  }
}

/* 更矮一点的 1200~1439 屏：继续压缩右侧，保证数据卡完整露出 */
@media (min-width: 1200px) and (max-width: 1439px) and (max-height: 760px) {
  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(170px, 0.29fr) minmax(150px, 0.26fr) minmax(0, 0.45fr) !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(132px, 76%) !important;
    max-width: 132px !important;
    max-height: 132px !important;
  }

  .moon-phase-template2 .phase-name {
    font-size: clamp(18px, 1.35vw, 22px) !important;
  }

  .moon-phase-template2 .hemisphere-note,
  .moon-phase-template2 .observation-tip {
    font-size: 10px !important;
  }

  .moon-phase-template2 .data-row {
    padding: 7px 0 !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: 17px !important;
  }
}


/* ===================== v14: 小于 1100px 横向滚动条修正 =====================
   - 强制页面和组件容器不产生 x 方向滚动；
   - Header 在小屏下允许压缩，隐藏右侧提示胶囊；
   - 控制条、速度按钮、时间轴允许换行/收缩；
   - 2D 圆图、3D 容器、右侧卡片全部限制 max-width:100%。
*/
@media (max-width: 1100px) {

  :global(html),
  :global(body) {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  .moon-phase-template2 {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
  }

  .moon-phase-template2 .moon-template-toolbar {
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .brand-area {
    min-width: 0 !important;
    flex: 0 1 auto !important;
  }

  .moon-phase-template2 .brand-logo {
    width: clamp(104px, 24vw, 150px) !important;
    max-width: 100% !important;
  }

  .moon-phase-template2 .page-title {
    min-width: 0 !important;
    max-width: 46vw !important;
    overflow: hidden !important;
    font-size: clamp(16px, 3.4vw, 24px) !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .moon-phase-template2 .moon-toolbar-actions,
  .moon-phase-template2 .sun-source-tip {
    display: none !important;
  }

  .moon-phase-template2 .moon-template-workspace,
  .moon-phase-template2 .moon-center-stage,
  .moon-phase-template2 .stage-content,
  .moon-phase-template2 .moon-stage-content,
  .moon-phase-template2 .main-grid,
  .moon-phase-template2 .left-column,
  .moon-phase-template2 .right-column,
  .moon-phase-template2 .global-panel,
  .moon-phase-template2 .control-panel,
  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel,
  .moon-phase-template2 .knowledge-grid,
  .moon-phase-template2 .knowledge-card {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .moon-phase-template2 .moon-stage-content {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .moon-phase-template2 .global-panel {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .moon-phase-template2 .global-view-header,
  .moon-phase-template2 .header-actions {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .moon-phase-template2 .header-actions {
    flex-wrap: wrap !important;
  }

  .moon-phase-template2 .pill-button,
  .moon-phase-template2 .angle-switch {
    max-width: 100% !important;
    white-space: nowrap !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 520px) !important;
    max-width: 100% !important;
  }

  .moon-phase-template2 .view-2d,
  .moon-phase-template2 .view-3d-full,
  .moon-phase-template2 .view-3d-full canvas,
  .moon-phase-template2 .three-canvas {
    max-width: 100% !important;
  }

  .moon-phase-template2 .control-panel {
    display: flex !important;
    align-items: stretch !important;
    flex-direction: column !important;
  }

  .moon-phase-template2 .playback-controls {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    flex-wrap: wrap !important;
  }

  .moon-phase-template2 .speed-group {
    min-width: 0 !important;
    max-width: calc(100vw - 92px) !important;
    flex-wrap: wrap !important;
  }

  .moon-phase-template2 .speed-btn {
    flex: 0 0 auto !important;
  }

  .moon-phase-template2 .timeline {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .moon-phase-template2 .timeline-labels {
    width: 100% !important;
    min-width: 0 !important;
    gap: 4px !important;
  }

  .moon-phase-template2 .timeline-labels span {
    min-width: 0 !important;
    overflow: hidden !important;
    text-align: center !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .moon-phase-template2 :deep(.el-slider) {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .moon-phase-template2 .observation-body {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .moon-phase-template2 .moon-preview {
    max-width: min(210px, 72vw) !important;
  }

  .moon-phase-template2 .observation-copy,
  .moon-phase-template2 .phase-name,
  .moon-phase-template2 .hemisphere-note,
  .moon-phase-template2 .observation-tip,
  .moon-phase-template2 .data-row,
  .moon-phase-template2 .knowledge-card,
  .moon-phase-template2 .knowledge-card h3,
  .moon-phase-template2 .knowledge-card p {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow-wrap: anywhere !important;
  }

  .moon-phase-template2 .data-row {
    flex-wrap: wrap !important;
  }
}

@media (max-width: 520px) {
  .moon-phase-template2 .page-title {
    max-width: 54vw !important;
    font-size: clamp(15px, 4.2vw, 20px) !important;
  }

  .moon-phase-template2 .brand-logo {
    width: clamp(88px, 25vw, 122px) !important;
  }

  .moon-phase-template2 .global-panel {
    min-height: 300px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 360px) !important;
  }

  .moon-phase-template2 .timeline-labels span {
    font-size: 7px !important;
  }
}


/* ===================== v15: 1100~1199px 过渡宽度改为单列 =====================
   - 修复 1180px 左右宽度时，右侧观测/数据/知识卡仍被硬塞在右栏的问题；
   - 1199px 以下统一切单列，避免右侧卡片挤压；
   - 1200px 以上继续使用 v13 的中宽低高压缩规则。
*/
@media (max-width: 1199px) {
  .moon-phase-template2 {
    display: block !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 100vh !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }

  .moon-phase-template2 .moon-template-workspace,
  .moon-phase-template2 .moon-center-stage,
  .moon-phase-template2 .stage-content,
  .moon-phase-template2 .moon-stage-content {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .moon-stage-content {
    padding: 10px !important;
  }

  .moon-phase-template2 .main-grid {
    display: flex !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .left-column,
  .moon-phase-template2 .right-column {
    display: flex !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    flex-direction: column !important;
    gap: 10px !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .global-panel {
    width: 100% !important;
    height: auto !important;
    min-height: min(560px, calc(100vh - 160px)) !important;
    padding: 12px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .global-view-header {
    align-items: flex-start !important;
    flex-direction: column !important;
    gap: 8px !important;
    margin-bottom: 10px !important;
  }

  .moon-phase-template2 .global-view-actions {
    width: 100% !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 560px) !important;
    max-width: 100% !important;
    margin: 0 auto !important;
  }

  .moon-phase-template2 .view-3d-full {
    width: 100% !important;
    height: min(58vh, 440px) !important;
    min-height: 320px !important;
  }

  .moon-phase-template2 .control-panel {
    width: 100% !important;
    min-height: auto !important;
    align-items: stretch !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 12px !important;
  }

  .moon-phase-template2 .playback-controls {
    width: 100% !important;
    justify-content: flex-start !important;
    flex-wrap: wrap !important;
  }

  .moon-phase-template2 .timeline {
    width: 100% !important;
  }

  .moon-phase-template2 .right-column {
    padding-bottom: 12px !important;
  }

  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel {
    width: 100% !important;
    height: auto !important;
    min-height: auto !important;
    padding: 14px !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .observation-body {
    display: grid !important;
    grid-template-columns: minmax(160px, 0.42fr) minmax(0, 0.58fr) !important;
    align-items: center !important;
    gap: 14px !important;
    width: 100% !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(210px, 42vw) !important;
    max-width: 210px !important;
    max-height: 210px !important;
    padding: 7px !important;
  }

  .moon-phase-template2 .phase-name {
    font-size: clamp(24px, 4vw, 34px) !important;
    line-height: 1.08 !important;
  }

  .moon-phase-template2 .hemisphere-note,
  .moon-phase-template2 .observation-tip {
    font-size: clamp(12px, 2vw, 15px) !important;
    line-height: 1.45 !important;
  }

  .moon-phase-template2 .data-row {
    flex-wrap: nowrap !important;
    padding: 11px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size: 14px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: 20px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    display: grid !important;
    width: 100% !important;
    height: auto !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: auto !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .knowledge-card {
    height: auto !important;
    min-height: auto !important;
    padding: 14px !important;
    overflow: visible !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    font-size: 16px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    overflow: visible !important;
    font-size: 14px !important;
    line-height: 1.65 !important;
    -webkit-line-clamp: unset !important;
  }
}

@media (max-width: 760px) {
  .moon-phase-template2 .observation-body {
    display: flex !important;
    flex-direction: column !important;
    text-align: center !important;
  }

  .moon-phase-template2 .observation-copy {
    align-items: center !important;
    text-align: center !important;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns: 1fr !important;
  }
}


/* ===================== v16: 平板横屏恢复一屏双栏 =====================
   - v15 把 1199px 以下切成单列，平板横屏会掉下去；
   - 900~1199px 改回一屏双栏，方便对比主图、观测月球和数据；
   - 右侧知识卡在平板端压缩为小卡片，优先保证核心信息同屏；
   - 900px 以下才保持单列滚动。
*/
@media (min-width: 900px) and (max-width: 1199px) {
  .moon-phase-template2 {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    min-height: 100vh !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .moon-template-toolbar {
    position: relative !important;
    grid-row: 1 !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .brand-logo {
    width: clamp(110px, 13vw, 160px) !important;
  }

  .moon-phase-template2 .page-title {
    max-width: 56vw !important;
    font-size: clamp(18px, 2.3vw, 25px) !important;
    white-space: nowrap !important;
  }

  .moon-phase-template2 .moon-toolbar-actions,
  .moon-phase-template2 .sun-source-tip {
    display: none !important;
  }

  .moon-phase-template2 .moon-template-workspace {
    grid-row: 2 !important;
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .moon-center-stage,
  .moon-phase-template2 .stage-content,
  .moon-phase-template2 .moon-stage-content {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .moon-stage-content {
    padding: 8px 12px !important;
  }

  .moon-phase-template2 .main-grid {
    display: grid !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    grid-template-columns: minmax(0, 2.05fr) minmax(300px, 0.95fr) !important;
    grid-template-rows: minmax(0, 1fr) !important;
    gap: 10px !important;
    align-items: stretch !important;
  }

  .moon-phase-template2 .left-column {
    display: grid !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    grid-template-rows: minmax(0, 1fr) auto !important;
    gap: 9px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .right-column {
    display: grid !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    grid-template-rows:
      minmax(178px, 0.35fr) minmax(122px, 0.24fr) minmax(0, 0.41fr) !important;
    gap: 8px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .global-panel {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: 10px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .global-view-header {
    align-items: center !important;
    flex-direction: row !important;
    gap: 8px !important;
    margin-bottom: 6px !important;
  }

  .moon-phase-template2 .global-view-title {
    font-size: 15px !important;
  }

  .moon-phase-template2 .global-view-actions {
    width: auto !important;
    justify-content: flex-end !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
  }

  .moon-phase-template2 .pill-button,
  .moon-phase-template2 .angle-switch {
    padding: 5px 9px !important;
    font-size: 11px !important;
  }

  .moon-phase-template2 .viewport-container {
    width: min(100%, 500px) !important;
    max-width: 100% !important;
    margin: 0 auto !important;
  }

  .moon-phase-template2 .view-3d-full {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
  }

  .moon-phase-template2 .control-panel {
    display: flex !important;
    width: 100% !important;
    min-height: 54px !important;
    align-items: center !important;
    flex-direction: row !important;
    gap: 12px !important;
    padding: 8px 12px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .playback-controls {
    width: auto !important;
    flex: 0 0 auto !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;
  }

  .moon-phase-template2 .moon-play-btn {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
  }

  .moon-phase-template2 .speed-group {
    max-width: none !important;
    flex-wrap: nowrap !important;
    gap: 4px !important;
    padding: 3px !important;
  }

  .moon-phase-template2 .speed-btn {
    height: 28px !important;
    min-height: 28px !important;
    padding: 0 9px !important;
    font-size: 11px !important;
  }

  .moon-phase-template2 .timeline {
    flex: 1 1 auto !important;
    width: auto !important;
    min-width: 0 !important;
  }

  .moon-phase-template2 .timeline-labels {
    margin-bottom: 3px !important;
    font-size: 8px !important;
  }

  .moon-phase-template2 .observation-panel,
  .moon-phase-template2 .data-panel {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    padding: 10px 12px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .observation-panel h2 {
    margin-bottom: 4px !important;
    font-size: 15px !important;
  }

  .moon-phase-template2 .observation-body {
    display: grid !important;
    width: 100% !important;
    height: calc(100% - 26px) !important;
    min-height: 0 !important;
    grid-template-columns: minmax(126px, 0.46fr) minmax(0, 0.54fr) !important;
    align-items: center !important;
    gap: 8px !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(150px, 42vw) !important;
    max-width: 150px !important;
    max-height: 150px !important;
    padding: 6px !important;
  }

  .moon-phase-template2 .observation-copy {
    align-items: flex-start !important;
    text-align: left !important;
    gap: 4px !important;
  }

  .moon-phase-template2 .phase-name {
    margin-top: 0 !important;
    font-size: clamp(19px, 2.15vw, 25px) !important;
    line-height: 1.08 !important;
    text-align: left !important;
  }

  .moon-phase-template2 .hemisphere-note,
  .moon-phase-template2 .observation-tip {
    font-size: 10px !important;
    line-height: 1.32 !important;
  }

  .moon-phase-template2 .data-panel h3 {
    margin-bottom: 4px !important;
    font-size: 13px !important;
  }

  .moon-phase-template2 .data-row {
    flex-wrap: nowrap !important;
    padding: 7px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size: 12px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: 17px !important;
  }

  .moon-phase-template2 .data-row small {
    font-size: 10px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    display: grid !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .knowledge-card {
    height: 100% !important;
    min-height: 0 !important;
    padding: 9px 10px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    margin-bottom: 0 !important;
    font-size: 12px !important;
    line-height: 1.2 !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: none !important;
  }
}

/* 平板高度更矮时：继续压缩知识区，仍然保持一屏对比 */
@media (min-width: 900px) and (max-width: 1199px) and (max-height: 700px) {
  .moon-phase-template2 .moon-stage-content {
    padding: 6px 10px !important;
  }

  .moon-phase-template2 .main-grid {
    grid-template-columns: minmax(0, 2.12fr) minmax(286px, 0.88fr) !important;
    gap: 8px !important;
  }

  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(162px, 0.34fr) minmax(112px, 0.25fr) minmax(0, 0.41fr) !important;
    gap: 6px !important;
  }

  .moon-phase-template2 .global-panel {
    padding: 8px !important;
  }

  .moon-phase-template2 .control-panel {
    min-height: 48px !important;
    padding: 6px 10px !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(132px, 40vw) !important;
    max-width: 132px !important;
    max-height: 132px !important;
  }

  .moon-phase-template2 .phase-name {
    font-size: clamp(17px, 2vw, 22px) !important;
  }

  .moon-phase-template2 .data-row {
    padding: 6px 0 !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding: 8px 9px !important;
  }
}

/* 真正手机宽度才单列滚动 */
@media (max-width: 899px) {
  .moon-phase-template2 {
    display: block !important;
    height: auto !important;
    min-height: 100vh !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }
}


/* ===================== v17: 平板一屏展示，知识卡正文省略 =====================
   - 900~1199px 平板横屏继续保持一屏双栏；
   - 给地球观测视角和实时天文数据更多纵向空间；
   - 下方四个知识卡不再隐藏正文，改为 1~2 行省略；
   - 高度更矮时优先压缩知识卡正文行数，仍尽量一屏展示。
*/
@media (min-width: 900px) and (max-width: 1199px) {
  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(190px, 0.39fr) minmax(132px, 0.28fr) minmax(0, 0.33fr) !important;
  }

  .moon-phase-template2 .observation-panel {
    padding: 10px 12px !important;
  }

  .moon-phase-template2 .observation-body {
    height: calc(100% - 24px) !important;
    grid-template-columns: minmax(132px, 0.48fr) minmax(0, 0.52fr) !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(158px, 42vw) !important;
    max-width: 158px !important;
    max-height: 158px !important;
  }

  .moon-phase-template2 .phase-name {
    font-size: clamp(20px, 2.2vw, 26px) !important;
  }

  .moon-phase-template2 .data-panel {
    padding: 10px 14px !important;
  }

  .moon-phase-template2 .data-panel h3 {
    font-size: 14px !important;
  }

  .moon-phase-template2 .data-row {
    padding: 8px 0 !important;
  }

  .moon-phase-template2 .data-row span {
    font-size: 13px !important;
  }

  .moon-phase-template2 .data-row strong {
    font-size: 18px !important;
  }

  .moon-phase-template2 .knowledge-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
    gap: 7px !important;
  }

  .moon-phase-template2 .knowledge-card {
    display: flex !important;
    min-height: 0 !important;
    padding: 8px 10px !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    flex: 0 0 auto !important;
    margin-bottom: 3px !important;
    font-size: 12px !important;
    line-height: 1.18 !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: -webkit-box !important;
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
    color: rgba(226, 248, 255, 0.72) !important;
    font-size: 10.5px !important;
    line-height: 1.36 !important;
    text-align: left !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
  }
}

/* 平板高度更矮时：正文仍显示，但只保留 1 行省略 */
@media (min-width: 900px) and (max-width: 1199px) and (max-height: 700px) {
  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(172px, 0.38fr) minmax(120px, 0.28fr) minmax(0, 0.34fr) !important;
  }

  .moon-phase-template2 .moon-preview {
    width: min(138px, 40vw) !important;
    max-width: 138px !important;
    max-height: 138px !important;
  }

  .moon-phase-template2 .data-row {
    padding: 6px 0 !important;
  }

  .moon-phase-template2 .knowledge-card {
    padding: 7px 8px !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    margin-bottom: 2px !important;
    font-size: 11.5px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    font-size: 10px !important;
    line-height: 1.28 !important;
    -webkit-line-clamp: 1 !important;
  }
}

/* 900px 以下仍走手机单列逻辑，正文正常展示 */
@media (max-width: 899px) {
  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    overflow: visible !important;
    -webkit-line-clamp: unset !important;
  }
}


/* ===================== v25: 平板 2D 标题栏压缩 + 知识卡取消省略 =====================
   仅修两个问题：
   1. 900~1199px 平板下，2D 顶部标题/切换行减少高度，把空间还给 2D；
   2. 右下四个知识卡正文不再 line-clamp 省略，超出时卡片内部滚动。
*/
@media (min-width: 900px) and (max-width: 1199px) {

  /* 只压缩 2D 状态的顶部标题行，不改 3D 布局 */
  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-header {
    min-height: 28px !important;
    margin-bottom: 2px !important;
    gap: 6px !important;
  }

  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-title {
    font-size: 13px !important;
    line-height: 1.1 !important;
  }

  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-actions {
    gap: 5px !important;
  }

  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-actions .pill-button,
  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-actions .angle-switch {
    padding: 3px 7px !important;
    font-size: 10px !important;
  }

  /* 2D 继续占满标题行下面的剩余空间 */
  .moon-phase-template2 .global-panel:not(.is-3d-mode) .viewport-container.is-2d-mode {
    flex: 1 1 0 !important;
    min-height: 0 !important;
    max-height: 100% !important;
    margin: auto !important;
  }

  /* 知识卡正文不再省略 */
  .moon-phase-template2 .knowledge-card {
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    flex: 0 0 auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    -webkit-box-orient: initial !important;
    -webkit-line-clamp: unset !important;
    line-clamp: unset !important;
  }
}

/* 平板高度较矮时也不恢复省略号 */
@media (min-width: 900px) and (max-width: 1199px) and (max-height: 700px) {
  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-header {
    min-height: 26px !important;
    margin-bottom: 2px !important;
  }

  .moon-phase-template2 .global-panel:not(.is-3d-mode) .global-view-title {
    font-size: 12px !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    overflow: visible !important;
    -webkit-line-clamp: unset !important;
    line-clamp: unset !important;
  }
}


/* ===================== v26: 1920×1080 右栏数据优先 =====================
   - 仅针对 1500~2199px、901~1200px 高的桌面屏；
   - 给“实时天文数据”更多纵向空间；
   - 压缩下方四个知识卡区域；
   - 知识卡正文不省略，超出时卡片内部滚动；
   - 不修改 2D、3D、平板端布局。
*/
@media (min-width: 1500px) and (max-width: 2199px) and (min-height: 901px) and (max-height: 1200px) {
  .moon-phase-template2 .right-column {
    grid-template-rows:
      minmax(280px, 0.39fr) minmax(210px, 0.30fr) minmax(0, 0.31fr) !important;
    gap: 10px !important;
  }

  .moon-phase-template2 .data-panel {
    min-height: 210px !important;
    padding: 14px 18px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .data-panel h3 {
    margin-bottom: 5px !important;
  }

  .moon-phase-template2 .data-row {
    padding: 9px 0 !important;
  }

  .moon-phase-template2 .knowledge-grid {
    min-height: 0 !important;
    gap: 8px !important;
    overflow: hidden !important;
  }

  .moon-phase-template2 .knowledge-card {
    min-height: 0 !important;
    padding: 10px 12px !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }

  .moon-phase-template2 .knowledge-card h3 {
    margin-bottom: 4px !important;
    font-size: 14px !important;
    line-height: 1.2 !important;
  }

  .moon-phase-template2 .knowledge-card p {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: normal !important;
    font-size: 12px !important;
    line-height: 1.42 !important;
    -webkit-box-orient: initial !important;
    -webkit-line-clamp: unset !important;
    line-clamp: unset !important;
  }
}
</style>
