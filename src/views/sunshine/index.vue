<template>
  <div ref="pageRef" class="sunshine-container geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">不同纬度的太阳辐射差异</h1>

      <div class="toolbar-actions">
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
              <h2>场景控制</h2>
              <p>切换实验演示与宇宙演示</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">演示模块</h3>
            <div class="option-grid module-grid">
              <button type="button" class="theme-btn option-btn" :class="{ active: currentModule === 'experiment' }"
                @click="currentModule = 'experiment'">
                实验模块
              </button>
              <button type="button" class="theme-btn option-btn" :class="{ active: currentModule === 'universe' }"
                @click="currentModule = 'universe'">
                宇宙模块
              </button>
            </div>
          </section>

          <!-- 手电筒照射控制（实验模块） -->
          <section v-if="currentModule === 'experiment'" class="geo-card control-section">
            <h3 class="section-title">照射高度角</h3>
            <div class="section-title-row">
              <span class="mini-control-label">光线与桌面夹角</span>
              <strong class="control-value">{{ beamAngle }}°</strong>
            </div>
            <el-slider v-model="beamAngle" :min="15" :max="90" :step="1" :show-tooltip="false" />

            <div class="option-grid">
              <button v-for="item in beamPresets" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: beamAngle === item.value }" @click="beamAngle = item.value">
                {{ item.label }}
              </button>
            </div>

          </section>

          <!-- 纬度选择（宇宙模块） -->
          <section v-if="currentModule === 'universe'" class="geo-card control-section">
            <h3 class="section-title">目标纬度</h3>
            <div class="section-title-row">
              <span class="mini-control-label">当前纬度</span>
              <strong class="control-value">
                {{ Math.abs(selectedLatitude).toFixed(1) }}°{{ selectedLatitude >= 0 ? 'N' : 'S' }}
              </strong>
            </div>
            <el-slider v-model="selectedLatitude" :min="-90" :max="90" :step="1" :show-tooltip="false" />

            <div class="option-grid latitude-grid">
              <button v-for="item in latitudePresets" :key="item.value" type="button"
                class="theme-btn option-btn latitude-btn" :class="{ active: selectedLatitude === item.value }"
                @click="selectedLatitude = item.value">
                {{ item.label }}
              </button>
            </div>
          </section>

          <!-- 季节 / 黄赤交角（宇宙模块） -->
          <section v-if="currentModule === 'universe'" class="geo-card control-section">
            <h3 class="section-title">太阳直射点</h3>
            <div class="section-title-row">
              <span class="mini-control-label">直射纬度</span>
              <strong class="control-value">
                {{ Math.abs(solarDeclination).toFixed(1) }}°{{ solarDeclination >= 0 ? 'N' : 'S' }}
              </strong>
            </div>
            <el-slider v-model="solarDeclination" :min="-23.5" :max="23.5" :step="0.5" :show-tooltip="false" />

            <div class="option-grid">
              <button v-for="item in seasonPresets" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: activeSeason === item.value }" @click="applySeason(item.value)">
                {{ item.label }}
              </button>
            </div>
          </section>

          <!-- 显示控制（宇宙模块） -->
          <section v-if="currentModule === 'universe'" class="geo-card control-section">
            <h3 class="section-title">显示控制</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地轴与轨道面夹角</strong>
                <span>显示地轴与公转轨道平面的夹角</span>
              </div>
              <el-switch v-model="showOrbitalPlane" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>太阳光线示意</strong>
                <span>显示平行太阳光线箭头</span>
              </div>
              <el-switch v-model="showSunRays" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>自动旋转</strong>
                <span>地球缓慢自转</span>
              </div>
              <el-switch v-model="autoRotate" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>五带显示</strong>
                <span>显示地球表面五带着色</span>
              </div>
              <el-switch v-model="showClimateZones" />
            </div>

            <div v-if="showClimateZones" class="zone-legend">
              <div class="zone-item"><span class="zone-dot cold"></span>北寒带 / 南寒带</div>
              <div class="zone-item"><span class="zone-dot temp"></span>北温带 / 南温带</div>
              <div class="zone-item"><span class="zone-dot trop"></span>热带</div>
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>经纬网</strong>
                <span>显示经纬线辅助网格</span>
              </div>
              <el-switch v-model="showGraticule" />
            </div>
          </section>

          <!-- 数据面板 -->
          <section v-if="currentModule === 'experiment'" class="geo-card control-section">
            <h3 class="section-title">光斑观测数据</h3>
            <div class="data-list">
              <div class="data-row">
                <span>照射高度角</span>
                <strong>{{ beamAngle }}°</strong>
              </div>
              <div class="data-row">
                <span>光斑形状</span>
                <strong>{{ spotShapeLabel }}</strong>
              </div>
              <div class="data-row">
                <span>光斑面积</span>
                <strong>{{ spotAreaFactor.toFixed(2) }} 倍</strong>
                <span class="data-hint">（相对直射）</span>
              </div>
              <div class="data-row">
                <span>相对亮度</span>
                <strong>{{ Math.round(spotBrightness * 100) }}%</strong>
                <div class="mini-bar-wrap">
                  <div class="mini-bar" :style="{ width: (spotBrightness * 100) + '%' }"></div>
                </div>
              </div>
              <div class="data-row">
                <span>模拟照度</span>
                <strong>{{ Math.round(spotBrightness * 1000) }} lx</strong>
              </div>
              <div class="data-row">
                <span>地表热度</span>
                <strong>{{ spotHeatLabel }}</strong>
                <div class="mini-bar-wrap heat">
                  <div class="mini-bar heat" :style="{ width: (spotBrightness * 100) + '%' }"></div>
                </div>
              </div>
              <div class="data-row">
                <span>模拟温度</span>
                <strong>{{ spotTemp }}°C</strong>
              </div>
            </div>
          </section>

          <section v-else class="geo-card control-section">
            <h3 class="section-title">宇宙模块数据</h3>
            <div class="data-list">
              <div class="data-row">
                <span>太阳高度角（正午）</span>
                <strong>{{ solarAltitude.toFixed(1) }}°</strong>
              </div>
              <div class="data-row">
                <span>相对辐射强度</span>
                <strong>{{ relativeRadiation.toFixed(0) }}%</strong>
              </div>
              <div class="data-row">
                <span>直射点距离</span>
                <strong>{{ Math.abs(selectedLatitude - solarDeclination).toFixed(1) }}°</strong>
              </div>
              <div class="data-row">
                <span>地轴倾角</span>
                <strong>{{ AXIAL_TILT_DEG.toFixed(1) }}°</strong>
              </div>
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

          <!-- 场景说明浮层 -->
          <div class="scene-overlay">
            <div class="overlay-title">{{ currentModule === 'experiment' ? '实验模块：手电筒照射桌面' : '宇宙模块：太阳辐射与五带' }}</div>
            <div class="overlay-tip">{{ currentModule === 'experiment' ? '保持手电筒与桌面距离不变，调节照射高度角：直射（90°）时光斑呈圆形、小而亮；斜射时光斑拉成椭圆、面积变大、亮度变暗' :
              '从宇宙视角观察太阳平行光、地轴倾斜与外置五带壳层的关系' }}</div>
          </div>
        </div>
      </section>

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
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ── 布局 Hook ──
const hasLeftPanel = true
const hasRightPanel = false

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
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) {
    if (state.resizing) return
    scheduleSceneResize(90)
  },
  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

// ── 业务状态 ──
const selectedLatitude = ref(40)
const solarDeclination = ref(23.5)
const activeSeason = ref('summer')

const currentModule = ref<'experiment' | 'universe'>('experiment')
const AXIAL_TILT_DEG = 23.5
const AXIAL_TILT_RAD = THREE.MathUtils.degToRad(AXIAL_TILT_DEG)
const RAY_LATITUDES = [66.5, 0, -23.5]

// 实验模块：手电筒与桌面的固定几何参数
const EXP_LIGHT_DIST = 5.2
const EXP_TAN_BETA = 0.165

const showOrbitalPlane = ref(true)
const showSunRays = ref(true)
const autoRotate = ref(true)
const showGraticule = ref(true)
const showClimateZones = ref(true)

// ── 实验模块：手电筒照射桌面 ──
const beamAngle = ref(90)
const beamPresets = [
  { label: '直射 90°', value: 90 },
  { label: '斜射 60°', value: 60 },
  { label: '斜射 45°', value: 45 },
  { label: '斜射 30°', value: 30 },
]

const latitudePresets = [
  { label: '赤道 0°', value: 0 },
  { label: '北回归线 23.5°N', value: 23.5 },
  { label: '40°N（北京）', value: 40 },
  { label: '北极圈 66.5°N', value: 66.5 },
  { label: '90°N（北极）', value: 90 },
]

const seasonPresets = [
  { label: '夏至 23.5°N', value: 'summer' },
  { label: '春/秋分 0°', value: 'equinox' },
  { label: '冬至 23.5°S', value: 'winter' },
]

function applySeason(season: string) {
  activeSeason.value = season
  if (season === 'summer') solarDeclination.value = 23.5
  else if (season === 'equinox') solarDeclination.value = 0
  else if (season === 'winter') solarDeclination.value = -23.5
}

// ── 计算属性 ──
const solarAltitude = computed(() => {
  const lat = selectedLatitude.value
  const dec = solarDeclination.value
  const alt = 90 - Math.abs(lat - dec)
  return Math.max(0, Math.min(90, alt))
})

const relativeRadiation = computed(() => {
  const alt = solarAltitude.value
  if (alt <= 0) return 0
  return Math.sin((alt * Math.PI) / 180) * 100
})

// 光斑观测：亮度 ∝ sin(高度角)，面积 ∝ 1/sin(高度角)
const spotBrightness = computed(() =>
  Math.sin(THREE.MathUtils.degToRad(beamAngle.value)),
)
const spotAreaFactor = computed(() =>
  1 / Math.max(0.05, spotBrightness.value),
)
const spotShapeLabel = computed(() =>
  beamAngle.value >= 90 ? '圆形（直射）' : '椭圆（斜射）',
)
// 热度与亮度正相关：直射→高热，斜射→低温
const spotHeatLabel = computed(() => {
  const b = spotBrightness.value
  if (b > 0.85) return '强热'
  if (b > 0.60) return '较热'
  if (b > 0.35) return '温和'
  if (b > 0.15) return '偏凉'
  return '寒冷'
})
const spotTemp = computed(() => {
  // 模拟温度：直射90°≈36°C，斜射15°≈-2°C
  return Math.round(-2 + 38 * spotBrightness.value)
})

// ── Three.js 场景 ──
const threeContainerRef = ref<HTMLElement | null>(null)
const EARTH_TEXTURE_URL = '/geo-resources-folder/images/earth.jpg'
const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let sunMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let sunGlowMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let sunTexture: THREE.Texture | null = null
let earthTexture: THREE.Texture | null = null
let sunLight: THREE.DirectionalLight | null = null
let ambientLight: THREE.AmbientLight | null = null
let hemisphereLight: THREE.HemisphereLight | null = null
let earthFillLight: THREE.DirectionalLight | null = null
let raysGroup: THREE.Group | null = null
let graticuleGroup: THREE.Group | null = null
let earthAxisGroup: THREE.Group | null = null
let starsPoints: THREE.Points | null = null

// ── 实验模块：手电筒照射桌面 ──
let experimentGroup: THREE.Group | null = null
let expDynamicGroup: THREE.Group | null = null
let expFlashlight: THREE.Group | null = null
let expSpotLight: THREE.SpotLight | null = null
let expFlashGlow: THREE.PointLight | null = null
let orbitalPlaneGroup: THREE.Group | null = null

let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastAnimateTime = 0

function makeTextSprite(text: string, position: THREE.Vector3, fontSize = 28, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = 256
  canvas.height = 80
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 40)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.position.copy(position)
  sprite.scale.set(2.2, 0.7, 1)
  return sprite
}

function updateOrbitalPlaneDiagram() {
  orbitalPlaneGroup?.removeFromParent?.()
  orbitalPlaneGroup = new THREE.Group()

  if (!showOrbitalPlane.value || !scene) {
    scene?.add(orbitalPlaneGroup)
    return
  }

  // ── 公转轨道面：半透明水平圆盘（y=0 平面）──
  const discGeo = new THREE.RingGeometry(0.5, 6.5, 96)
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x1e5a8a,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.renderOrder = 1
  orbitalPlaneGroup.add(disc)

  // 轨道面边线
  const rimPts: THREE.Vector3[] = []
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    rimPts.push(new THREE.Vector3(6.5 * Math.cos(t), 0, 6.5 * Math.sin(t)))
  }
  const rimLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(rimPts),
    new THREE.LineBasicMaterial({ color: 0x2a7ab5, transparent: true, opacity: 0.5 })
  )
  rimLine.renderOrder = 2
  orbitalPlaneGroup.add(rimLine)

  // "公转轨道面"标签
  orbitalPlaneGroup.add(makeTextSprite('公转轨道面', new THREE.Vector3(4.5, 0.15, 3.0), 24, '#6ab8e8'))

  // ── 轨道面法线（竖直虚线）──
  orbitalPlaneGroup.add(makeDashedLine(
    new THREE.Vector3(0, -3.8, 0),
    new THREE.Vector3(0, 3.8, 0),
    0x5599bb,
  ))

  // ── 地轴方向线（延伸到地球外部）──
  // 轴向：rotation.z = -AXIAL_TILT_RAD → 局部+Y 在世界空间指向 (sin23.5°, cos23.5°, 0)
  const axisDir = new THREE.Vector3(Math.sin(AXIAL_TILT_RAD), Math.cos(AXIAL_TILT_RAD), 0).normalize()
  orbitalPlaneGroup.add(makeDashedLine(
    axisDir.clone().multiplyScalar(-4.2),
    axisDir.clone().multiplyScalar(4.2),
    0x8dd9ff,
  ))

  // ── 角度弧线：23.5°（黄赤交角：地轴与轨道面法线的夹角）──
  const arcR23 = 2.4
  const arc23Start = Math.PI / 2 - AXIAL_TILT_RAD  // 轴方向角度
  const arc23End = Math.PI / 2                       // 竖直方向角度
  const curve23 = new THREE.EllipseCurve(0, 0, arcR23, arcR23, arc23Start, arc23End, false, 0)
  const arc23Pts = curve23.getPoints(24).map(p => new THREE.Vector3(p.x, p.y, 0))
  const arc23Line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(arc23Pts),
    new THREE.LineBasicMaterial({ color: 0xffd966, transparent: true, opacity: 0.9 })
  )
  arc23Line.renderOrder = 5
  orbitalPlaneGroup.add(arc23Line)

  // "23.5°" 标签（弧线中点外侧）
  const mid23 = (arc23Start + arc23End) / 2
  orbitalPlaneGroup.add(makeTextSprite(
    '23.5°',
    new THREE.Vector3((arcR23 + 0.6) * Math.cos(mid23), (arcR23 + 0.6) * Math.sin(mid23), 0),
    32,
    '#ffd966',
  ))

  // ── 角度弧线：66.5°（地轴与轨道面的夹角）──
  const arcR66 = 3.0
  const arc66Start = 0                    // 轨道面方向（+X）
  const arc66End = Math.PI / 2 - AXIAL_TILT_RAD  // 轴方向角度
  const curve66 = new THREE.EllipseCurve(0, 0, arcR66, arcR66, arc66Start, arc66End, false, 0)
  const arc66Pts = curve66.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, 0))
  const arc66Line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(arc66Pts),
    new THREE.LineBasicMaterial({ color: 0x7adcff, transparent: true, opacity: 0.9 })
  )
  arc66Line.renderOrder = 5
  orbitalPlaneGroup.add(arc66Line)

  // "66.5°" 标签
  const mid66 = (arc66Start + arc66End) / 2
  orbitalPlaneGroup.add(makeTextSprite(
    '66.5°',
    new THREE.Vector3((arcR66 + 0.6) * Math.cos(mid66), (arcR66 + 0.6) * Math.sin(mid66), 0),
    32,
    '#7adcff',
  ))

  scene.add(orbitalPlaneGroup)
}

function updateSunRays() {
  raysGroup?.removeFromParent?.()
  while (raysGroup && raysGroup.children.length > 0) {
    const child = raysGroup.children[0]
    raysGroup.remove(child)
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
      else child.material.dispose()
    }
  }
  if (!scene) return
  raysGroup = new THREE.Group()

  if (!showSunRays.value) {
    scene.add(raysGroup)
    return
  }

  const R = 3
  const rayStartX = 22
  const rayRadius = 0.4
  const raySegments = 64
  const tiltMatrix = new THREE.Matrix4().makeRotationZ(-AXIAL_TILT_RAD)

  RAY_LATITUDES.forEach((lat) => {
    const latRad = THREE.MathUtils.degToRad(lat)
    const localHitPoint = new THREE.Vector3(R * Math.cos(latRad), R * Math.sin(latRad), 0)
    const hitPoint = localHitPoint.clone().applyMatrix4(tiltMatrix)
    const surfaceNormal = hitPoint.clone().normalize()
    const safeNormalX = Math.abs(surfaceNormal.x) < 0.08 ? (surfaceNormal.x >= 0 ? 0.08 : -0.08) : surfaceNormal.x
    const endRingPoints: THREE.Vector3[] = []

    for (let i = 0; i < raySegments; i++) {
      const angle = (i / raySegments) * Math.PI * 2
      const pointY = hitPoint.y + rayRadius * Math.cos(angle)
      const pointZ = hitPoint.z + rayRadius * Math.sin(angle)
      const pointX = hitPoint.x - (
        surfaceNormal.y * (pointY - hitPoint.y) +
        surfaceNormal.z * (pointZ - hitPoint.z)
      ) / safeNormalX
      endRingPoints.push(new THREE.Vector3(pointX, pointY, pointZ))
    }

    const rayPositions: number[] = []
    const rayIndices: number[] = []
    endRingPoints.forEach((endPoint) => {
      rayPositions.push(
        rayStartX, endPoint.y, endPoint.z,
        endPoint.x, endPoint.y, endPoint.z,
      )
    })

    for (let i = 0; i < raySegments; i++) {
      const next = (i + 1) % raySegments
      const startA = i * 2
      const endA = startA + 1
      const startB = next * 2
      const endB = startB + 1
      rayIndices.push(startA, startB, endA, startB, endB, endA)
    }

    const rayGeo = new THREE.BufferGeometry()
    rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3))
    rayGeo.setIndex(rayIndices)
    rayGeo.computeVertexNormals()

    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xffd966,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    })
    const ray = new THREE.Mesh(rayGeo, rayMat)
    ray.renderOrder = 1
    raysGroup!.add(ray)

    const fillPositions: number[] = [hitPoint.x, hitPoint.y, hitPoint.z]
    const fillIndices: number[] = []
    endRingPoints.forEach((point) => fillPositions.push(point.x, point.y, point.z))
    for (let i = 0; i < raySegments; i++) {
      const next = (i + 1) % raySegments
      fillIndices.push(0, i + 1, next + 1)
    }

    const fillGeo = new THREE.BufferGeometry()
    fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(fillPositions, 3))
    fillGeo.setIndex(fillIndices)
    fillGeo.computeVertexNormals()

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xd4a017,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    const fillMesh = new THREE.Mesh(fillGeo, fillMat)
    fillMesh.renderOrder = 2
    raysGroup!.add(fillMesh)

    const ringGeo = new THREE.BufferGeometry().setFromPoints(endRingPoints)
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xd4a017,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: false,
    })
    const ring = new THREE.LineLoop(ringGeo, ringMat)
    ring.renderOrder = 3
    raysGroup!.add(ring)
  })

  scene.add(raysGroup)
}

function buildFlashlightModel() {
  const g = new THREE.Group()

  // 机身——浅银灰色，明显可见
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.56, 4.6, 28),
    new THREE.MeshStandardMaterial({ color: 0x9eaab8, roughness: 0.42, metalness: 0.55 })
  )
  body.rotation.z = Math.PI / 2
  g.add(body)

  // 灯头——深银色
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.72, 1.15, 28),
    new THREE.MeshStandardMaterial({ color: 0xb0bcc8, roughness: 0.35, metalness: 0.6 })
  )
  head.rotation.z = Math.PI / 2
  head.position.x = -2.5
  g.add(head)

  // 尾部
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.6, 20),
    new THREE.MeshStandardMaterial({ color: 0x7a8899, roughness: 0.5, metalness: 0.4 })
  )
  tail.rotation.z = Math.PI / 2
  tail.position.x = 2.55
  g.add(tail)

  // 镜片——高亮发光
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 32),
    new THREE.MeshStandardMaterial({
      color: 0xfff8e0,
      emissive: 0xffe880,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.0,
    })
  )
  lens.rotation.y = Math.PI / 2
  lens.position.x = -3.05
  g.add(lens)

  // 手柄
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 1.7, 18),
    new THREE.MeshStandardMaterial({ color: 0x6a7888, roughness: 0.6, metalness: 0.3 })
  )
  handle.position.set(0.8, -1.0, 0)
  g.add(handle)

  // 灯头前缘亮环（视觉标记）
  const rimGeo = new THREE.TorusGeometry(0.95, 0.055, 8, 28)
  const rim = new THREE.Mesh(
    rimGeo,
    new THREE.MeshStandardMaterial({ color: 0xdde4ea, roughness: 0.3, metalness: 0.7 })
  )
  rim.rotation.y = Math.PI / 2
  rim.position.x = -3.06
  g.add(rim)

  g.scale.setScalar(0.65)
  return g
}

function createTableScene() {
  experimentGroup?.removeFromParent?.()
  if (!scene) return
  experimentGroup = new THREE.Group()

  // 桌面（顶面在 y = 0）
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.32, 5.6),
    new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.82, metalness: 0.05 })
  )
  tableTop.position.y = -0.16
  experimentGroup.add(tableTop)

  // 白纸——放在桌面中央，光斑打在白纸上，亮度差异一目了然
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.02, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.92, metalness: 0 })
  )
  paper.position.y = 0.005
  experimentGroup.add(paper)

  // 桌腿
  const legGeo = new THREE.BoxGeometry(0.32, 3.1, 0.32)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5d3b21, roughness: 0.85, metalness: 0.04 })
  const legX = 4.1
  const legZ = 2.4
  const legSpots: Array<[number, number]> = [
    [legX, legZ], [legX, -legZ], [-legX, legZ], [-legX, -legZ],
  ]
  legSpots.forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(x, -1.87, z)
    experimentGroup!.add(leg)
  })

  // 地板（BasicMaterial 不受光照影响，避免光斑透到地面）
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    new THREE.MeshBasicMaterial({ color: 0x0b1524 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.44
  experimentGroup.add(floor)

  // 手电筒（朝向与位置由 updateBeam 控制）
  expFlashlight = buildFlashlightModel()
  experimentGroup.add(expFlashlight)

  // 聚光灯：真实照亮桌面，亮度随高度角变化
  expSpotLight = new THREE.SpotLight(0xfff2c4, 3, 0, THREE.MathUtils.degToRad(11), 0.3, 0)
  expSpotLight.target.position.set(0, 0, 0)
  experimentGroup.add(expSpotLight)
  experimentGroup.add(expSpotLight.target)

  // 镜头位置补光——让手电筒镜头处有可见光晕
  expFlashGlow = new THREE.PointLight(0xfff4d0, 1.0, 8, 1.5)
  experimentGroup.add(expFlashGlow)

  // 动态元素容器（光斑 / 光锥 / 角度指示）
  expDynamicGroup = new THREE.Group()
  experimentGroup.add(expDynamicGroup)

  scene.add(experimentGroup)
  updateBeam()
}

function makeDashedLine(a: THREE.Vector3, b: THREE.Vector3, color: number) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b])
  const mat = new THREE.LineDashedMaterial({
    color,
    transparent: true,
    opacity: 0.75,
    dashSize: 0.12,
    gapSize: 0.08,
  })
  const line = new THREE.Line(geo, mat)
  line.computeLineDistances()
  return line
}

function updateBeam() {
  if (!experimentGroup || !expDynamicGroup || !expFlashlight) return

  // 清理旧的动态元素
  while (expDynamicGroup.children.length > 0) {
    const child = expDynamicGroup.children[0]
    expDynamicGroup.remove(child)
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
      else child.material.dispose()
    }
  }

  const hRad = THREE.MathUtils.degToRad(beamAngle.value)
  const alphaRad = THREE.MathUtils.degToRad(90 - beamAngle.value)
  const sinH = Math.max(0.05, Math.sin(hRad))
  const cosA = Math.max(0.25, Math.cos(alphaRad))

  // 光线方向（从手电筒指向桌面中心）
  const dir = new THREE.Vector3(Math.sin(alphaRad), -Math.cos(alphaRad), 0)
  // 镜头位置（与桌面中心保持固定距离）
  const lensPos = dir.clone().multiplyScalar(-EXP_LIGHT_DIST)
  // 模型缩放 0.5 后镜头位于局部 -x 方向约 1.53 处
  expFlashlight.position.copy(lensPos).addScaledVector(dir, -1.53)
  expFlashlight.quaternion.setFromUnitVectors(new THREE.Vector3(-1, 0, 0), dir)

  // 光斑：直射为半径 r0 的圆，斜射沿 x 方向拉长为椭圆（面积 1/cosα 增大）
  const r0 = EXP_LIGHT_DIST * EXP_TAN_BETA
  const semiA = r0
  const semiB = r0 / cosA

  // 光斑椭圆面片（亮度随 sin h 大幅变化，直射→浓亮，斜射→暗淡）
  const spotGeo = new THREE.CircleGeometry(1, 64)
  spotGeo.rotateX(-Math.PI / 2)
  spotGeo.scale(semiB, 1, semiA)
  const spotMesh = new THREE.Mesh(
    spotGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfff0a8,
      transparent: true,
      opacity: 0.06 + 0.88 * sinH,
      depthWrite: false,
    })
  )
  spotMesh.position.y = 0.025
  spotMesh.renderOrder = 4
  expDynamicGroup.add(spotMesh)

  // 光斑描边
  const ringPts: THREE.Vector3[] = []
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    ringPts.push(new THREE.Vector3(semiB * Math.cos(t), 0.02, semiA * Math.sin(t)))
  }
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0xffd966, transparent: true, opacity: 0.95 })
  )
  ring.renderOrder = 5
  expDynamicGroup.add(ring)

  // 直射对照：始终显示 90° 时的圆形光斑，面积对比一目了然
  // 填充半透明圆
  const refFillGeo = new THREE.CircleGeometry(r0, 64)
  refFillGeo.rotateX(-Math.PI / 2)
  const refFill = new THREE.Mesh(
    refFillGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.10,
      depthWrite: false,
    })
  )
  refFill.position.y = 0.018
  refFill.renderOrder = 4
  expDynamicGroup.add(refFill)

  // 轮廓线
  const refPts: THREE.Vector3[] = []
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    refPts.push(new THREE.Vector3(r0 * Math.cos(t), 0.02, r0 * Math.sin(t)))
  }
  const refRing = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(refPts),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  )
  refRing.renderOrder = 5
  expDynamicGroup.add(refRing)

  // 光锥（镜头 → 光斑边缘），亮度随 sin h 变化
  const RING = 48
  const beamPositions: number[] = [lensPos.x, lensPos.y, lensPos.z]
  const beamIndices: number[] = []
  for (let i = 0; i <= RING; i++) {
    const t = (i / RING) * Math.PI * 2
    beamPositions.push(semiB * Math.cos(t), 0.025, semiA * Math.sin(t))
  }
  for (let i = 1; i <= RING; i++) {
    beamIndices.push(0, i, i + 1)
  }
  const beamGeo = new THREE.BufferGeometry()
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(beamPositions, 3))
  beamGeo.setIndex(beamIndices)
  const beamMesh = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffe9a0,
      transparent: true,
      opacity: 0.04 + 0.18 * sinH,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  )
  beamMesh.renderOrder = 3
  expDynamicGroup.add(beamMesh)

  // 角度指示：竖直虚线 / 光轴 / 倾角圆弧
  expDynamicGroup.add(makeDashedLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.0, 0), 0x8dd9ff))
  expDynamicGroup.add(makeDashedLine(new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(-2.0), 0xffd966))
  if (alphaRad > 0.02) {
    const arc = new THREE.EllipseCurve(0, 0, 1.15, 1.15, Math.PI / 2, Math.PI / 2 + alphaRad, false, 0)
    const arcPts = arc.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, 0))
    const arcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPts),
      new THREE.LineBasicMaterial({ color: 0x7adcff, transparent: true, opacity: 0.9 })
    )
    arcLine.renderOrder = 6
    expDynamicGroup.add(arcLine)
  }

  // 聚光灯 + 镜头补光：位置跟随镜头，亮度随 sin h 大幅变化
  if (expSpotLight) {
    expSpotLight.position.copy(lensPos)
    expSpotLight.intensity = 0.3 + 9.0 * sinH
  }
  if (expFlashGlow) {
    expFlashGlow.position.copy(lensPos)
    expFlashGlow.intensity = 0.4 + 2.0 * sinH
  }
}

function createEarthAxis() {
  earthAxisGroup?.removeFromParent?.()
  if (!scene) return
  earthAxisGroup = new THREE.Group()
  const pts = [new THREE.Vector3(0, -4.8, 0), new THREE.Vector3(0, 4.8, 0)]
  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8dd9ff, transparent: true, opacity: 0.8 })
  )
  earthAxisGroup.add(axis)
  earthAxisGroup.rotation.z = -AXIAL_TILT_RAD
  scene.add(earthAxisGroup)
}

function applyModuleScene() {
  const isExp = currentModule.value === 'experiment'

  if (sunMesh) sunMesh.visible = !isExp
  if (sunGlowMesh) sunGlowMesh.visible = !isExp
  if (earthMesh) earthMesh.visible = !isExp
  if (raysGroup) raysGroup.visible = !isExp
  if (graticuleGroup) graticuleGroup.visible = !isExp
  if (earthAxisGroup) earthAxisGroup.visible = !isExp
  if (starsPoints) starsPoints.visible = !isExp
  if (orbitalPlaneGroup) orbitalPlaneGroup.visible = !isExp

  if (experimentGroup) experimentGroup.visible = isExp
  if (sunLight) sunLight.intensity = isExp ? 0 : 3.0
  if (earthFillLight) earthFillLight.intensity = isExp ? 0.06 : 0.16

  if (camera && orbitControls) {
    if (isExp) {
      camera.position.set(5.8, 3.8, 7.8)
      orbitControls.target.set(0, 0.2, 0)
    } else {
      camera.position.set(0, 2, 18)
      orbitControls.target.set(0, 0, 0)
    }
    orbitControls.update()
  }
}

function createGraticule() {
  graticuleGroup?.removeFromParent?.()
  if (!scene) return
  graticuleGroup = new THREE.Group()

  if (!showGraticule.value) {
    scene.add(graticuleGroup)
    return
  }

  const lineMat = new THREE.LineBasicMaterial({ color: 0x4a6a8a, transparent: true, opacity: 0.22, depthTest: false })

  // 经线（仅显示前半球，避免穿过地球内部）
  for (let lng = 0; lng < 360; lng += 15) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const lat = -Math.PI / 2 + (i / 64) * Math.PI
      const aRad = THREE.MathUtils.degToRad(lng)
      pts.push(new THREE.Vector3(3.06 * Math.cos(lat) * Math.cos(aRad), 3.06 * Math.sin(lat), 3.06 * Math.cos(lat) * Math.sin(aRad)))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    graticuleGroup.add(new THREE.Line(geo, lng === 0 ? new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.5, depthTest: false }) : lineMat))
  }

  graticuleGroup.rotation.z = -AXIAL_TILT_RAD
  scene.add(graticuleGroup)
}

function updateEarthAxialTilt() {
  if (!earthMesh) return
  earthMesh.rotation.x = 0
  earthMesh.rotation.z = -AXIAL_TILT_RAD
}

function createEarthShaderMaterial(earthTex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uEarthTexture: { value: earthTex },
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
      uShowClimateZones: { value: showClimateZones.value ? 1.0 : 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uEarthTexture;
      uniform vec3 uSunDirection;
      uniform float uShowClimateZones;

      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sunDir = normalize(uSunDirection);

        // ── Lambert 漫反射：受光面明亮，背光面黑暗 ──
        float NdotL = dot(normal, sunDir);
        float diffuse = max(NdotL, 0.0);

        // ── 晨昏线柔和过渡 ──
        float dayMask = smoothstep(-0.12, 0.22, NdotL);

        // ── 采样 earth.jpg 纹理：大陆、海洋、山地、极地冰盖细节 ──
        vec3 earthColor = texture2D(uEarthTexture, vUv).rgb;

        // ── 海洋检测（用原始纹理亮度，避免五带着色干扰）──
        float luminance = dot(earthColor, vec3(0.2126, 0.7152, 0.0722));
        float oceanMask = 1.0 - smoothstep(0.06, 0.22, luminance);

        // ── 五带着色（北寒带 / 北温带 / 热带 / 南温带 / 南寒带）──
        if (uShowClimateZones > 0.5) {
          float lat = 90.0 - vUv.y * 180.0;  // 纬度（°）
          float absLat = abs(lat);

          vec3 coldZone = vec3(0.55, 0.75, 0.95);  // 蓝——寒带
          vec3 tempZone = vec3(0.50, 0.82, 0.55);  // 绿——温带
          vec3 tropZone = vec3(0.95, 0.82, 0.45);  // 黄橙——热带

          vec3 zoneColor;
          if (absLat > 66.5) {
            zoneColor = coldZone;
          } else if (absLat > 23.5) {
            zoneColor = tempZone;
          } else {
            zoneColor = tropZone;
          }

          earthColor = mix(earthColor, zoneColor, 0.30);

          // ── 分界线：回归线 ±23.5° / 极圈 ±66.5° ──
          float d1 = abs(absLat - 23.5);
          float d2 = abs(absLat - 66.5);
          float dMin = min(d1, d2);
          float lineAlpha = 1.0 - smoothstep(0.0, 0.6, dMin);
          earthColor = mix(earthColor, vec3(1.0), lineAlpha * 0.80);
        }

        // ── 日面：环境底光 + 太阳漫反射 ──
        vec3 daySide = earthColor * (0.10 + diffuse * 1.05);

        // ── 夜面：极暗冷蓝底光，大陆轮廓隐约可辨 ──
        vec3 nightSide = earthColor * vec3(0.012, 0.018, 0.032);

        vec3 color = mix(nightSide, daySide, dayMask);

        // ── 大气边缘散射：日面边缘泛蓝光晕 ──
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        rim = pow(rim, 3.5);
        vec3 atmosphere = vec3(0.28, 0.55, 1.0) * rim * dayMask * 0.45;
        color += atmosphere;

        // ── 海洋高光：深色低亮度区域（海洋）受太阳镜面反射 ──
        vec3 halfDir = normalize(sunDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 80.0);
        color += vec3(1.0, 0.97, 0.92) * spec * oceanMask * diffuse * 0.55;

        gl_FragColor = vec4(color, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

function updateSunDirection() {
  // 太阳在右侧，光线从右向左照射地球（受光面在地球右侧，朝向太阳）
  const sunX = 25

  if (sunLight) {
    sunLight.position.set(sunX, 0, 0)
    sunLight.target.position.set(0, 0, 0)
  }

  if (sunMesh) sunMesh.position.set(sunX, 0, 0)
  if (sunGlowMesh) sunGlowMesh.position.set(sunX, 0, 0)

  if (earthMesh?.material instanceof THREE.ShaderMaterial) {
    earthMesh.material.uniforms.uSunDirection.value.set(sunX, 0, 0).normalize()
  }
}

function createSunShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunTexture: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      uniform sampler2D uSunTexture;
      uniform float uTime;

      // 简单伪随机噪声
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // 2D 值噪声
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        // 采样太阳纹理
        vec4 texColor = texture2D(uSunTexture, vUv);

        // 边缘辉光：法线与视线夹角越大越亮
        float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
        float edgeGlow = pow(fresnel, 2.8) * 0.55;

        // 径向光晕：从中心向外衰减的额外亮度
        float dist = length(vUv - 0.5) * 2.0;
        float radialGlow = exp(-dist * 1.8) * 0.35;

        // 流动噪声效果：多层叠加
        float n1 = noise(vUv * 8.0 + uTime * 0.12);
        float n2 = noise(vUv * 14.0 - uTime * 0.08 + 0.5);
        float n3 = noise(vUv * 22.0 + uTime * 0.05 + 1.2);
        float flowNoise = n1 * 0.18 + n2 * 0.12 + n3 * 0.07;

        // 合并颜色：纹理 + 自发光增强 + 边缘辉光 + 径向光晕 + 流动噪声
        vec3 baseColor = texColor.rgb;
        // 自发光：整体提亮，暖色调
        vec3 emissive = baseColor * 1.3 + vec3(0.25, 0.15, 0.02);

        // 边缘辉光叠加（橙黄色调）
        vec3 edgeColor = mix(emissive, vec3(1.0, 0.55, 0.08), edgeGlow);

        // 径向光晕叠加（中心更亮）
        vec3 radialColor = edgeColor + vec3(0.3, 0.2, 0.05) * radialGlow;

        // 流动噪声扰动
        vec3 finalColor = radialColor + flowNoise * 0.12;

        // 整体亮度微调，让太阳有灼热感
        finalColor = clamp(finalColor, 0.0, 1.0);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    depthTest: true,
    depthWrite: true,
  })
}

function createSunGlowShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPosition = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uTime;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = 1.0 - abs(dot(vNormal, viewDir));
        float glow = pow(fresnel, 2.0) * 0.5 + pow(fresnel, 5.0) * 0.25;
        float pulse = 1.0 + sin(uTime * 1.8) * 0.08 + sin(uTime * 3.3 + 1.2) * 0.05;
        float alpha = glow * pulse;
        vec3 color = mix(vec3(1.0, 0.45, 0.08), vec3(1.0, 0.75, 0.25), fresnel);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) {
    console.error('[Sunshine] threeContainerRef is null')
    return
  }
  console.log('[Sunshine] initScene, container size:', container.clientWidth, 'x', container.clientHeight)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020a14)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300)
  camera.position.set(0, 2, 18)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.top = '0'
  renderer.domElement.style.left = '0'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.zIndex = '10'
  renderer.domElement.style.pointerEvents = 'auto'
  container.appendChild(renderer.domElement)

  // 确保容器可见且可交互
  container.style.pointerEvents = 'auto'

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableRotate = true
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 5
  orbitControls.maxDistance = 30
  orbitControls.target.set(0, 0, 0)
  orbitControls.enablePan = true
  orbitControls.update()

  // 星空背景
  const starsGeo = new THREE.BufferGeometry()
  const starsCount = 1200
  const starsPositions = new Float32Array(starsCount * 3)
  for (let i = 0; i < starsCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 50 + Math.random() * 30
    starsPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    starsPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    starsPositions[i * 3 + 2] = r * Math.cos(phi)
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3))
  starsPoints = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.7 }))
  scene.add(starsPoints)

  // 保留少量基础补光，让背光面仍能辨认，但明显暗于受光面。
  ambientLight = new THREE.AmbientLight(0x8fb7e6, 0.26)
  hemisphereLight = new THREE.HemisphereLight(0xbad9ff, 0x020711, 0.30)

  sunLight = new THREE.DirectionalLight(0xfff9e8, 3.0)
  sunLight.position.set(10, 3.99, 0)
  sunLight.target.position.set(0, 0, 0)

  earthFillLight = new THREE.DirectionalLight(0xb9d7ff, 0.16)
  earthFillLight.position.copy(camera.position)
  earthFillLight.target.position.set(0, 0, 0)

  scene.add(
    ambientLight,
    hemisphereLight,
    sunLight,
    sunLight.target,
    earthFillLight,
    earthFillLight.target,
  )

  // ── 太阳球体（ShaderMaterial）──
  const textureLoader = new THREE.TextureLoader()

  sunTexture = textureLoader.load(SUN_TEXTURE_URL, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
  })

  const sunMaterial = createSunShaderMaterial()
  sunMaterial.uniforms.uSunTexture.value = sunTexture

  const sunGeo = new THREE.SphereGeometry(8, 64, 64)
  sunMesh = new THREE.Mesh(sunGeo, sunMaterial)
  sunMesh.renderOrder = 1

  // 太阳辉光外壳（比太阳本体稍大）
  const sunGlowGeo = new THREE.SphereGeometry(11, 48, 48)
  const sunGlowMat = createSunGlowShaderMaterial()
  sunGlowMesh = new THREE.Mesh(sunGlowGeo, sunGlowMat)
  sunGlowMesh.renderOrder = 0

  updateSunDirection()

  scene.add(sunMesh)
  scene.add(sunGlowMesh)

  // ── 地球：使用 ShaderMaterial + earth.jpg sampler2D uniform ──
  const earthGeo = new THREE.SphereGeometry(3, 64, 64)

  textureLoader.loadAsync(EARTH_TEXTURE_URL)
    .then((loadedEarthTexture) => {
      if (!scene) {
        loadedEarthTexture.dispose()
        earthGeo.dispose()
        return
      }

      earthTexture = loadedEarthTexture
      const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1

      earthTexture.colorSpace = THREE.SRGBColorSpace
      earthTexture.anisotropy = maxAnisotropy
      earthTexture.minFilter = THREE.LinearMipmapLinearFilter
      earthTexture.magFilter = THREE.LinearFilter
      earthTexture.needsUpdate = true

      const earthMat = createEarthShaderMaterial(earthTexture)

      earthMesh = new THREE.Mesh(earthGeo, earthMat)
      updateEarthAxialTilt()
      updateSunDirection()
      scene.add(earthMesh)
      applyModuleScene()
    })
    .catch((error) => {
      earthGeo.dispose()
      console.error('[Sunshine] 地球贴图加载失败', error)
    })

  createTableScene()
  createEarthAxis()

  updateSunDirection()
  createGraticule()
  updateSunRays()
  updateOrbitalPlaneDiagram()
  applyModuleScene()

  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => scheduleSceneResize(110))
  threeResizeObserver.observe(container)

  lastAnimateTime = performance.now()
  animateThreeScene()
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return
  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))
  if (width === lastSceneWidth && height === lastSceneHeight) return
  lastSceneWidth = width
  lastSceneHeight = height
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  if (scene) renderer.render(scene, camera)
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => resizeThreeSceneNow())
    })
  }, delay)
}

function animateThreeScene(timestamp: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateThreeScene)
  const delta = Math.min((timestamp - lastAnimateTime) / 1000, 0.1)
  lastAnimateTime = timestamp

  if (earthMesh && autoRotate.value) {
    earthMesh.rotation.y -= delta * 0.15
  }

  // 更新太阳 Shader 时间 uniform
  const elapsed = timestamp / 1000
  if (sunMesh?.material instanceof THREE.ShaderMaterial) {
    sunMesh.material.uniforms.uTime.value = elapsed
  }
  if (sunGlowMesh?.material instanceof THREE.ShaderMaterial) {
    sunGlowMesh.material.uniforms.uTime.value = elapsed
  }

  orbitControls?.update()


  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  } else {
    // 只在第一次报错
    if (!renderer) console.warn('[Sunshine] renderer is null')
    if (!scene) console.warn('[Sunshine] scene is null')
    if (!camera) console.warn('[Sunshine] camera is null')
  }
}

// ── Watchers ──
watch(beamAngle, updateBeam)
watch(showGraticule, createGraticule)
watch(showSunRays, updateSunRays)
watch(showOrbitalPlane, updateOrbitalPlaneDiagram)
watch(showClimateZones, (val) => {
  if (earthMesh?.material instanceof THREE.ShaderMaterial) {
    earthMesh.material.uniforms.uShowClimateZones.value = val ? 1.0 : 0.0
  }
})
watch(currentModule, () => {
  applyModuleScene()
  updateSunRays()
})
watch(solarDeclination, () => {
  updateSunDirection()
  updateSunRays()
  updateOrbitalPlaneDiagram()
})
// ── 重置 ──
function resetControls() {
  currentModule.value = 'experiment'
  beamAngle.value = 90
  selectedLatitude.value = 40
  solarDeclination.value = 23.5
  activeSeason.value = 'summer'
  showOrbitalPlane.value = true
  showSunRays.value = true
  showClimateZones.value = true
  autoRotate.value = true
  showGraticule.value = true
  setAllCollapsed(false)
  resetWidths()
  scheduleSceneResize(90)
}

// ── 生命周期 ──
onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(sceneAnimationFrameId)
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null
  orbitControls?.dispose()
  earthMesh?.geometry.dispose()
  earthMesh?.material.dispose()
  sunMesh?.geometry.dispose()
  sunMesh?.material.dispose()
  sunGlowMesh?.geometry.dispose()
  sunGlowMesh?.material.dispose()
  sunTexture?.dispose()
  earthTexture?.dispose()
  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }
  scene?.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
      else obj.material.dispose()
    }
  })
  scene = null; camera = null; renderer = null; orbitControls = null
  earthMesh = null; sunMesh = null; sunGlowMesh = null; sunTexture = null
  earthTexture = null
  sunLight = null; ambientLight = null; hemisphereLight = null; earthFillLight = null
  raysGroup = null; graticuleGroup = null; earthAxisGroup = null
  experimentGroup = null; expDynamicGroup = null; expFlashlight = null; expSpotLight = null; expFlashGlow = null; starsPoints = null
  orbitalPlaneGroup = null
})
</script>

<style scoped>
/* ── 纬度预设按钮 ── */
.latitude-grid {
  grid-template-columns: 1fr;
}

.module-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.latitude-btn {
  text-align: left;
  justify-content: flex-start;
}

/* ── 场景说明浮层 ── */
.scene-overlay {
  position: absolute;
  top: 24px;
  left: 24px;
  left: auto;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 360px;
  padding: 12px 18px;
  background: rgba(8, 20, 34, 0.62);
  border: 1px solid rgba(116, 234, 229, 0.22);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.overlay-title {
  color: #fbbf24;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.overlay-tip {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
  opacity: 0.85;
}

/* ── 数据列表（面板内） ── */
.data-list {
  display: flex;
  flex-direction: column;
}

.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--inactive-border);
}

.data-row:last-child {
  border-bottom: 0;
}

.compact-row strong {
  font-size: 16px;
}

.data-row span {
  font-size: 12px;
  color: var(--text-secondary);
}

.data-row strong {
  font-size: 18px;
  color: var(--accent-color, #2ec4b6);
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.data-hint {
  font-size: 10px;
  color: var(--text-secondary);
  opacity: 0.6;
  margin-left: 4px;
}

.mini-bar-wrap {
  width: 52px;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  margin-left: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.mini-bar-wrap.heat {
  background: rgba(255, 140, 60, 0.12);
}
.mini-bar {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #2ec4b6, #5dd9c8);
  transition: width 0.3s ease;
}
.mini-bar.heat {
  background: linear-gradient(90deg, #3b9dff, #ff6b35, #ff3b3b);
  transition: width 0.3s ease;
}

.zone-legend {
  margin-top: 8px;
  padding: 6px 0 2px;
  border-top: 1px solid var(--inactive-border, rgba(255, 255, 255, 0.08));
}
.zone-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
  padding: 3px 0;
}
.zone-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.zone-dot.cold { background: #8cc0f2; }
.zone-dot.temp { background: #80d18c; }
.zone-dot.trop { background: #f2d17a; }

/* ── Canvas ── */
.sunshine-container .scene-host {
  z-index: 1;
}

.sunshine-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  position: relative;
  z-index: 1;
}

/* ── Resize 过渡禁用 ── */
.sunshine-container .workspace.panel-resizing,
.sunshine-container .workspace.layout-resizing,
.sunshine-container .workspace.panel-resizing .side-panel,
.sunshine-container .workspace.layout-resizing .side-panel,
.sunshine-container .workspace.panel-resizing .center-stage,
.sunshine-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}
</style>
