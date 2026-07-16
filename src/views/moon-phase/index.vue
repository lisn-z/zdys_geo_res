<template>
  <div ref="rootRef" class="moon-phase-container">
    <canvas ref="starCanvasRef" class="starfield" aria-hidden="true"></canvas>

    <div class="page-shell">
      <header class="page-header">
        <div>
          <h1>月相原理动态模拟</h1>
          <p>观察宇宙全局与地球视角的对应关系，探索月相演变规律。</p>
        </div>

        <div class="sun-source-tip">
          <span class="sun-source-icon">☀</span>
          <span>太阳光源位于右侧</span>
        </div>
      </header>

      <main class="main-grid">
        <section class="panel global-panel">
          <div class="panel-header">
            <h2>
              <span class="panel-icon">◎</span>
              {{ is3DMode ? '上帝视角（三维空间）' : '上帝视角（二维平面）' }}
            </h2>

            <div class="header-actions">
              <button class="pill-button" type="button" @click="toggle3DMode">
                <span>{{ is3DMode ? '▣' : '◇' }}</span>
                <span>{{ is3DMode ? '返回 2D' : '切换为 3D' }}</span>
              </button>

              <div v-show="!is3DMode" class="angle-switch">
                <span>显示夹角</span>
                <button class="switch-button" :class="{ active: isAngleVisible }" type="button" role="switch"
                  :aria-checked="isAngleVisible" @click="isAngleVisible = !isAngleVisible">
                  <span class="switch-knob"></span>
                </button>
              </div>
            </div>
          </div>

          <div ref="viewportRef" class="viewport-container">
            <div v-show="!is3DMode" class="view-2d">
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

            <div v-show="is3DMode" ref="view3DRef" class="view-3d" aria-label="三维日地月模型"></div>
          </div>
        </section>

        <section class="side-column">
          <div class="panel observation-panel">
            <h2>
              <span class="panel-icon">◉</span>
              地球观测视角
            </h2>

            <div class="moon-preview">
              <canvas ref="moonPhaseCanvasRef" class="moon-phase-canvas" width="320" height="320"></canvas>
            </div>

            <div class="phase-name">{{ phaseName }}</div>
            <div class="hemisphere-note">当前采用北半球正立观察示意</div>
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
        </section>

        <section class="panel control-panel">
          <div class="playback-controls">
            <button class="play-button" :class="{ playing: isPlaying }" type="button"
              :aria-label="isPlaying ? '暂停动画' : '播放动画'" @click="togglePlay">
              <span v-if="!isPlaying" class="play-icon">▶</span>
              <span v-else class="pause-icon">Ⅱ</span>
            </button>

            <div class="speed-group">
              <button v-for="speed in speedOptions" :key="speed" type="button"
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

            <input v-model.number="phaseProgress" type="range" min="0" max="360" step="0.5" aria-label="月相周期进度"
              @pointerdown="pauseForDrag" />
          </div>
        </section>

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
      </main>
    </div>
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
const moonPhaseCanvasRef = ref<HTMLCanvasElement | null>(null)

const phaseProgress = ref(0)
const isPlaying = ref(false)
const isAngleVisible = ref(true)
const is3DMode = ref(false)
const speedMultiplier = ref(1)
const speedOptions = [1, 2, 4]

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

function drawMainMoonPhase() {
  const canvas = moonPhaseCanvasRef.value
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) return

  renderPhaseOnContext(
    context,
    canvas.width / 2,
    canvas.height / 2,
    150,
    normalizedAngle.value,
    '#0f172a',
    '#2ec4b6'
  )
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
      '#0f172a',
      '#2ec4b6'
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
  update3DModel()
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
  scene3D.add(new THREE.AmbientLight(0x18243a, 0.28))

  // 增强太阳直射光，地球和月球的受光面会更明亮。
  const sunlight = new THREE.DirectionalLight(0xfff9e8, 4.6)
  sunlight.position.set(62, 0, 0)
  scene3D.add(sunlight)

  // 单独给月球增加主题色光照。
  // 该灯光只作用于第 1 图层，不会把地球和其他模型染绿。
  const moonTintLight = new THREE.DirectionalLight(0x36ffd8, 2.15)
  moonTintLight.position.set(62, 0, 0)
  moonTintLight.layers.set(1)
  scene3D.add(moonTintLight)

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
    // 比原主题色更明亮、饱和，用于抵消月球纹理本身的灰度压暗。
    color: 0x55ffdc,
    map: moonTexture,
    bumpMap: moonTexture,
    bumpScale: 0.08,
    roughness: 0.72,
    metalness: 0
  })
  moonMesh3D = new THREE.Mesh(moonGeometry, moonMaterial)

  // 月球同时处于默认图层和专用灯光图层：
  // 默认白色太阳光负责明暗，专用青绿色光增强受光面的绿色。
  moonMesh3D.layers.enable(1)

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
  }

  animationFrameId = requestAnimationFrame(animationLoop)
}

function handleVisibilityChange() {
  pageVisible = !document.hidden
  lastFrameTime = performance.now()
}

watch(normalizedAngle, () => {
  drawMainMoonPhase()
  update3DModel()
})

onMounted(async () => {
  await nextTick()

  drawMainMoonPhase()
  drawMarkerMoons()
  resizeStarfield()

  rootResizeObserver = new ResizeObserver(resizeStarfield)

  if (rootRef.value) {
    rootResizeObserver.observe(rootRef.value)
  }

  viewportResizeObserver = new ResizeObserver(() => {
    if (is3DMode.value) resize3D()
  })

  if (viewportRef.value) {
    viewportResizeObserver.observe(viewportRef.value)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  animationFrameId = requestAnimationFrame(animationLoop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  rootResizeObserver?.disconnect()
  viewportResizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
  border: 1px solid rgba(100, 116, 139, 0.65);
  border-radius: 50%;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.38);
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
  background: linear-gradient(to right, #1e293b 50%, #2ec4b6 50%);
  border-radius: 50%;
  box-shadow:
    inset -2px 0 5px rgba(46, 196, 182, 0.5),
    inset 2px 0 5px rgba(0, 0, 0, 0.8),
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
  border: 4px solid rgba(71, 85, 105, 0.65);
  border-radius: 50%;
  box-shadow: inset 0 0 34px rgba(0, 0, 0, 0.62);
}

.moon-phase-canvas {
  display: block;
  width: 100%;
  height: 100%;
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
</style>
