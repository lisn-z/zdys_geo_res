<template>
  <div ref="pageRef" class="sunshine-container geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
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

          <!-- 纬度选择 -->
          <section class="geo-card control-section">
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

          <!-- 季节 / 黄赤交角 -->
          <section class="geo-card control-section">
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

          <!-- 显示控制 -->
          <section class="geo-card control-section">
            <h3 class="section-title">显示控制</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>辐射强度热力图</strong>
                <span>在地球表面显示纬度辐射分布</span>
              </div>
              <el-switch v-model="showRadiation" />
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
            <h3 class="section-title">实验照度对比</h3>
            <div class="data-list">
              <div v-for="item in illuminanceSpots" :key="item.label" class="data-row compact-row">
                <span>{{ item.label }}</span>
                <strong>{{ item.lux }} lx</strong>
              </div>
              <div class="data-row">
                <span>地轴倾角</span>
                <strong>{{ AXIAL_TILT_DEG.toFixed(1) }}°</strong>
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
            <div class="overlay-title">{{ currentModule === 'experiment' ? '实验模块：手电筒平行光实验' : '宇宙模块：太阳辐射与五带' }}</div>
            <div class="overlay-tip">{{ currentModule === 'experiment' ? '用手电筒近似平行光照射倾斜地球仪，比较不同黄色光斑区域的照度差异' : '从宇宙视角观察太阳平行光、地轴倾斜与外置五带壳层的关系' }}</div>
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
const RAY_LATITUDES = [75, 23.5, 0, -23.5, -75]

const showRadiation = ref(true)
const showSunRays = ref(true)
const autoRotate = ref(true)
const showGraticule = ref(true)
const showClimateZones = ref(true)

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

const illuminanceSpots = computed(() => {
  return RAY_LATITUDES.map((lat) => {
    const incidence = Math.max(0, Math.cos(THREE.MathUtils.degToRad(Math.abs(lat - solarDeclination.value))))
    return {
      label: `${lat > 0 ? lat + '°N' : lat < 0 ? Math.abs(lat) + '°S' : '赤道 0°'}` ,
      lux: Math.round(incidence * 1000),
    }
  })
})

// ── Three.js 场景 ──
const threeContainerRef = ref<HTMLElement | null>(null)
const EARTH_TEXTURE_URL = '/geo-resources-folder/images/earth.jpg'
const EARTH_EMISSIVE_TEXTURE_URL = '/geo-resources-folder/images/emissive.jpg'
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
let earthEmissiveTexture: THREE.Texture | null = null
let sunLight: THREE.DirectionalLight | null = null
let ambientLight: THREE.AmbientLight | null = null
let hemisphereLight: THREE.HemisphereLight | null = null
let earthFillLight: THREE.DirectionalLight | null = null
let raysGroup: THREE.Group | null = null
let graticuleGroup: THREE.Group | null = null
let climateZonesGroup: THREE.Group | null = null
let flashlightGroup: THREE.Group | null = null
let earthAxisGroup: THREE.Group | null = null
let radiationRings: THREE.Mesh[] = []
let radiationMaterials: THREE.MeshBasicMaterial[] = []

let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastAnimateTime = 0

function createEquatorLine() {
  const ringGeo = new THREE.TorusGeometry(3.04, 0.03, 12, 96)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    depthTest: false,
  })
  radiationMaterials.push(ringMat)
  const equator = new THREE.Mesh(ringGeo, ringMat)
  equator.rotation.x = Math.PI / 2
  equator.renderOrder = 3
  return equator
}

function updateRadiationRings() {
  radiationRings.forEach(ring => ring.removeFromParent?.() || scene?.remove(ring))
  radiationMaterials.forEach(m => m.dispose())
  radiationRings = []
  radiationMaterials = []

  if (!showRadiation.value || !scene) return

  // 赤道标注线
  const equator = createEquatorLine()
  radiationRings.push(equator)
  scene!.add(equator)
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

function createFlashlight() {
  flashlightGroup?.removeFromParent?.()
  if (!scene) return
  flashlightGroup = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.56, 4.6, 28),
    new THREE.MeshStandardMaterial({ color: 0x26394f, roughness: 0.68, metalness: 0.22 })
  )
  body.rotation.z = Math.PI / 2
  flashlightGroup.add(body)

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.72, 1.15, 28),
    new THREE.MeshStandardMaterial({ color: 0x4f6479, roughness: 0.45, metalness: 0.25 })
  )
  head.rotation.z = Math.PI / 2
  head.position.x = -2.5
  flashlightGroup.add(head)

  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.6, 20),
    new THREE.MeshStandardMaterial({ color: 0x162230, roughness: 0.7, metalness: 0.2 })
  )
  tail.rotation.z = Math.PI / 2
  tail.position.x = 2.55
  flashlightGroup.add(tail)

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff1b3, transparent: true, opacity: 0.92 })
  )
  lens.rotation.y = Math.PI / 2
  lens.position.x = -3.05
  flashlightGroup.add(lens)

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 1.7, 18),
    new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.78, metalness: 0.1 })
  )
  handle.position.set(0.8, -1.0, 0)
  flashlightGroup.add(handle)

  flashlightGroup.position.set(25.5, 0.4, 0)
  flashlightGroup.renderOrder = 2
  scene.add(flashlightGroup)
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
  if (sunMesh) sunMesh.visible = currentModule.value === 'universe'
  if (sunGlowMesh) sunGlowMesh.visible = currentModule.value === 'universe'
  if (flashlightGroup) flashlightGroup.visible = currentModule.value === 'experiment'
  if (earthAxisGroup) earthAxisGroup.visible = currentModule.value === 'experiment'
}

function createExperimentSensors() {
  // 已移除传感器实体，改在左侧面板中直接显示照度对比数值。
}

function createClimateZones() {
  climateZonesGroup?.removeFromParent?.()
  if (!scene) return
  climateZonesGroup = new THREE.Group()

  if (!showClimateZones.value) {
    scene.add(climateZonesGroup)
    return
  }

  const zones = [
    { min: 66.5, max: 90, color: 0x88bbee, label: '北寒带' },
    { min: 23.5, max: 66.5, color: 0x88cc88, label: '北温带' },
    { min: -23.5, max: 23.5, color: 0xeecc88, label: '热带' },
    { min: -66.5, max: -23.5, color: 0x88cc88, label: '南温带' },
    { min: -90, max: -66.5, color: 0x88bbee, label: '南寒带' },
  ]
  const R = 3.14

  zones.forEach((zone) => {
    const minRad = THREE.MathUtils.degToRad(zone.min)
    const maxRad = THREE.MathUtils.degToRad(zone.max)
    const segments = 96
    const samples = 28
    const points: THREE.Vector2[] = []

    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const phi = maxRad - t * (maxRad - minRad)
      const r = R * Math.cos(phi)
      const y = R * Math.sin(phi)
      points.push(new THREE.Vector2(r, y))
    }

    const latheGeo = new THREE.LatheGeometry(points, segments)
    const latheMat = new THREE.MeshBasicMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    })
    const zoneMesh = new THREE.Mesh(latheGeo, latheMat)
    zoneMesh.renderOrder = 0
    climateZonesGroup!.add(zoneMesh)

    const boundaries = [zone.min, zone.max]
    for (const boundary of boundaries) {
      if (Math.abs(boundary) === 90) continue
      const bRad = THREE.MathUtils.degToRad(boundary)
      const bR = R * Math.cos(bRad)
      const bY = R * Math.sin(bRad)
      const bGeo = new THREE.TorusGeometry(bR, 0.018, 10, 120)
      const bMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthTest: false,
        depthWrite: false,
      })
      const bMesh = new THREE.Mesh(bGeo, bMat)
      bMesh.position.y = bY
      bMesh.rotation.x = Math.PI / 2
      bMesh.renderOrder = 1
      climateZonesGroup!.add(bMesh)
    }
  })

  climateZonesGroup.rotation.z = -AXIAL_TILT_RAD
  scene.add(climateZonesGroup)
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

function createEarthDayNightMaterial(
  dayTexture: THREE.Texture,
  nightTexture: THREE.Texture,
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDayTexture: { value: dayTexture },
      uNightTexture: { value: nightTexture },
      // 指向太阳的世界坐标方向。从地球指向太阳 = 太阳位置 - 地球位置。
      uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
      uNightLightIntensity: { value: 1.12 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDayTexture;
      uniform sampler2D uNightTexture;
      uniform vec3 uSunDirection;
      uniform float uNightLightIntensity;

      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sunDirection = normalize(uSunDirection);
        float sunFacing = dot(normal, sunDirection);

        // 晨昏线保持柔和，但夜面不会再被环境光整体抬亮。
        float dayMask = smoothstep(-0.06, 0.14, sunFacing);
        float nightMask = 1.0 - smoothstep(-0.14, 0.04, sunFacing);
        float directLight = max(sunFacing, 0.0);

        vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
        vec3 nightColor = texture2D(uNightTexture, vUv).rgb;

        // 日面由太阳方向决定亮度；夜面底色压到接近黑色。
        vec3 litDay = dayColor * (0.045 + directLight * 1.10);

        // 夜面保留少量冷色环境底光，使大陆轮廓可辨，但仍明显暗于日面。
        vec3 darkNight = dayColor * vec3(0.038, 0.046, 0.062);

        // emissive.jpg 只在背光面显现，避免整个球体被自发光贴图照亮。
        float nightLuminance = dot(nightColor, vec3(0.2126, 0.7152, 0.0722));
        vec3 cityLights = nightColor
          * (0.55 + nightLuminance * 0.9)
          * uNightLightIntensity
          * nightMask;

        vec3 finalColor = mix(darkNight + cityLights, litDay, dayMask);
        gl_FragColor = vec4(finalColor, 1.0);

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
  if (flashlightGroup) flashlightGroup.position.set(sunX + 0.5, 0.4, 0)

  if (earthMesh?.material instanceof THREE.ShaderMaterial) {
    earthMesh.material.uniforms.uSunDirection.value
      .set(sunX, 0, 0)
      .normalize()
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
  scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.7 })))

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

  // ── 地球：基础贴图与独立自发光贴图都加载完成后再创建球体 ──
  const earthGeo = new THREE.SphereGeometry(3, 64, 64)

  // 地球基础贴图必须成功；夜景自发光贴图加载失败时，仅回退为基础贴图副本，
  // 避免 Promise.all 因任意一张贴图失败而导致整个 earthMesh 都不创建。
  textureLoader.loadAsync(EARTH_TEXTURE_URL)
    .then(async (loadedEarthTexture) => {
      let loadedEmissiveTexture: THREE.Texture

      try {
        loadedEmissiveTexture = await textureLoader.loadAsync(EARTH_EMISSIVE_TEXTURE_URL)
      } catch (error) {
        console.warn('[Sunshine] 地球自发光贴图加载失败，使用基础贴图回退', error)
        loadedEmissiveTexture = loadedEarthTexture.clone()
        loadedEmissiveTexture.needsUpdate = true
      }

      if (!scene) {
        loadedEarthTexture.dispose()
        loadedEmissiveTexture.dispose()
        earthGeo.dispose()
        return
      }

      earthTexture = loadedEarthTexture
      earthEmissiveTexture = loadedEmissiveTexture

      const maxAnisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1

      earthTexture.colorSpace = THREE.SRGBColorSpace
      earthTexture.anisotropy = maxAnisotropy
      earthTexture.minFilter = THREE.LinearMipmapLinearFilter
      earthTexture.magFilter = THREE.LinearFilter
      earthTexture.needsUpdate = true

      earthEmissiveTexture.colorSpace = THREE.SRGBColorSpace
      earthEmissiveTexture.anisotropy = maxAnisotropy
      earthEmissiveTexture.minFilter = THREE.LinearMipmapLinearFilter
      earthEmissiveTexture.magFilter = THREE.LinearFilter
      earthEmissiveTexture.needsUpdate = true

      const earthMat = createEarthDayNightMaterial(
        earthTexture,
        earthEmissiveTexture,
      )

      earthMesh = new THREE.Mesh(earthGeo, earthMat)
      updateEarthAxialTilt()
      updateSunDirection()
      scene.add(earthMesh)
      applyModuleScene()
    })
    .catch((error) => {
      earthGeo.dispose()
      console.error('[Sunshine] 地球基础贴图加载失败', error)
    })

  createFlashlight()
  createEarthAxis()

  updateSunDirection()
  createGraticule()
  updateSunRays()
  updateRadiationRings()
  createClimateZones()
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
    earthMesh.rotation.y += delta * 0.15
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
watch(showGraticule, createGraticule)
watch(showSunRays, updateSunRays)
watch(showRadiation, updateRadiationRings)
watch(showClimateZones, createClimateZones)
watch(currentModule, () => {
  applyModuleScene()
  updateSunRays()
})
watch(solarDeclination, () => {
  updateSunDirection()
  updateSunRays()
  updateRadiationRings()
})
watch(selectedLatitude, updateRadiationRings)

// ── 重置 ──
function resetControls() {
  currentModule.value = 'experiment'
  selectedLatitude.value = 40
  solarDeclination.value = 23.5
  activeSeason.value = 'summer'
  showRadiation.value = true
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
  radiationMaterials.forEach(m => m.dispose())
  radiationRings.forEach(r => r.geometry.dispose())
  earthMesh?.geometry.dispose()
  earthMesh?.material.dispose()
  sunMesh?.geometry.dispose()
  sunMesh?.material.dispose()
  sunGlowMesh?.geometry.dispose()
  sunGlowMesh?.material.dispose()
  sunTexture?.dispose()
  earthTexture?.dispose()
  earthEmissiveTexture?.dispose()
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
  earthTexture = null; earthEmissiveTexture = null
  sunLight = null; ambientLight = null; hemisphereLight = null; earthFillLight = null
  raysGroup = null; graticuleGroup = null; climateZonesGroup = null; flashlightGroup = null; earthAxisGroup = null
  radiationRings = []; radiationMaterials = []
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
