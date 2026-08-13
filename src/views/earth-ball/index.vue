<template>
  <div
    ref="pageRef"
    class="earth-ball-container geo-template-page geo-page theme-light layout-floating"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>
      <h1 class="page-title">观察：地球是球形的</h1>
      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="controlPanelCollapsed = !controlPanelCollapsed"
        >
          {{ controlPanelCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <!-- 场景内浮层控制面板 -->
          <div
            class="scene-control-panel"
            :class="{ collapsed: controlPanelCollapsed, 'scp-dragging': isControlPanelDragging }"
            :style="controlPanelStyle"
            @pointerdown="onControlPanelPointerDown"
          >
            <div class="scp-header" @click="controlPanelCollapsed = !controlPanelCollapsed">
              <span>控制</span>
              <span class="scp-toggle">{{ controlPanelCollapsed ? '▾' : '▴' }}</span>
            </div>
            <div class="scp-body" v-show="!controlPanelCollapsed">
              <div class="scp-row">
                <button
                  v-for="item in viewModeOptions"
                  :key="item.value"
                  type="button"
                  class="scp-mode-btn"
                  :class="{ active: viewMode === item.value }"
                  @click="viewMode = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
              <div class="scp-field">
                <div class="scp-label"><span>高度</span><strong>{{ observerHeight }}m</strong></div>
                <el-slider v-model="observerHeight" :min="1" :max="30" :step="1" :show-tooltip="false" size="small" />
              </div>
              <div class="scp-field">
                <div class="scp-label"><span>桅杆</span><strong>{{ shipMastHeight }}m</strong></div>
                <el-slider v-model="shipMastHeight" :min="5" :max="50" :step="1" :show-tooltip="false" size="small" />
              </div>
              <div class="scp-row scp-switch-row">
                <span>视线</span>
                <el-switch v-model="showSightLine" size="small" />
              </div>
              <button type="button" class="scp-reset-btn" @click="resetControls">重置</button>
            </div>
          </div>

          <!-- 望远镜视图浮层 -->
          <div
            class="telescope-overlay"
            :class="{
              'telescope-mode-compare': viewMode === 'compare',
              'telescope-dragging': isTelescopeDragging,
            }"
            :style="telescopeOverlayStyle"
            @pointerdown="onTelescopePointerDown"
            @wheel.prevent="onTelescopeWheel"
          >
            <div
              class="telescope-view"
              v-show="viewMode === 'curved' || viewMode === 'compare'"
            >
              <canvas ref="telescopeCurvedRef" class="telescope-canvas"></canvas>
              <span class="telescope-label">曲面海面</span>
            </div>
            <div
              class="telescope-view"
              v-show="viewMode === 'flat' || viewMode === 'compare'"
            >
              <canvas ref="telescopeFlatRef" class="telescope-canvas"></canvas>
              <span class="telescope-label">平面海面</span>
            </div>
            <div class="telescope-zoom-controls">
              <button
                v-for="z in [1, 2, 3]"
                :key="z"
                type="button"
                class="theme-btn zoom-btn"
                :class="{ active: telescopeZoomLevel === z }"
                @click.stop="telescopeZoomLevel = z"
              >
                ×{{ z }}
              </button>
            </div>
            <div class="telescope-size-controls">
              <button
                type="button"
                class="theme-btn size-btn"
                @click.stop="telescopeScale = Math.max(0.6, Math.round((telescopeScale - 0.2) * 10) / 10)"
              >
                −
              </button>
              <span class="size-label">{{ Math.round(telescopeScale * 100) }}%</span>
              <button
                type="button"
                class="theme-btn size-btn"
                @click.stop="telescopeScale = Math.min(2.0, Math.round((telescopeScale + 0.2) * 10) / 10)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="isPlaying = !isPlaying"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-main">
            <div class="timeline-copy">
              <span class="timeline-near">近岸</span>
              <strong>{{ shipDistance.toFixed(1) }}km</strong>
              <span class="timeline-far">远岸</span>
            </div>
            <el-slider
              v-model="shipDistance"
              :min="1"
              :max="50"
              :step="0.5"
              :show-tooltip="false"
            />
          </div>
          <div class="speed-options">
            <button
              v-for="item in speedOptions"
              :key="item"
              type="button"
              class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }"
              @click="playbackSpeed = item"
            >
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/* ==================== 面板布局 ==================== */
const hasLeftPanel = false
const hasRightPanel = false

const {
  rootRef: pageRef,
  layoutMode,
  allPanelsCollapsed,
  workspaceAttrs,
  setAllCollapsed,
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

/* ==================== 业务状态 ==================== */
const viewMode = ref<'curved' | 'flat' | 'compare'>('curved')
const viewModeOptions = [
  { label: '曲面', value: 'curved' },
  { label: '平面', value: 'flat' },
  { label: '对比', value: 'compare' },
]
const observerHeight = ref(1.8)
const shipMastHeight = ref(20)
const showSightLine = ref(true)
const shipDistance = ref(50)
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 2, 5]
const controlPanelCollapsed = ref(false)
const controlPanelRight = ref(12)
const controlPanelY = ref(140)
const isControlPanelDragging = ref(false)
let cpDragStartX = 0
let cpDragStartY = 0
let cpDragOriginRight = 0
let cpDragOriginY = 0

function onControlPanelPointerDown(e: PointerEvent) {
  // 只在标题栏区域触发拖动
  if ((e.target as HTMLElement).closest('.scp-header')) {
    isControlPanelDragging.value = true
    cpDragStartX = e.clientX
    cpDragStartY = e.clientY
    cpDragOriginRight = controlPanelRight.value
    cpDragOriginY = controlPanelY.value

    const onMove = (ev: PointerEvent) => {
      if (!isControlPanelDragging.value) return
      const dx = ev.clientX - cpDragStartX
      const dy = ev.clientY - cpDragStartY
      controlPanelRight.value = cpDragOriginRight - dx
      controlPanelY.value = cpDragOriginY + dy
    }
    const onUp = () => {
      isControlPanelDragging.value = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
}

const controlPanelStyle = computed(() => ({
  right: `${controlPanelRight.value}px`,
  top: `${controlPanelY.value}px`,
}))

/* ==================== 望远镜拖动/缩放 ==================== */
const telescopeX = ref(16)
const telescopeY = ref(200)
const telescopeZoomLevel = ref(1)
const telescopeZoom = computed(() => telescopeZoomLevel.value)
const telescopeScale = ref(1.2)
const isTelescopeDragging = ref(false)
let telescopeDragStartX = 0
let telescopeDragStartY = 0
let telescopeDragOriginX = 0
let telescopeDragOriginY = 0

const TELESCOPE_BASE_SIZE = 220
const TELESCOPE_COMPARE_SIZE = 170
const telescopeDisplaySize = computed(() => {
  const base = viewMode.value === 'compare' ? TELESCOPE_COMPARE_SIZE : TELESCOPE_BASE_SIZE
  return Math.round(base * telescopeScale.value)
})

const telescopeOverlayStyle = computed(() => ({
  left: `${telescopeX.value}px`,
  top: `${telescopeY.value}px`,
}))

function repositionTelescope() {
  // 保留空函数以兼容调用点
}

function onTelescopePointerDown(e: PointerEvent) {
  isTelescopeDragging.value = true
  telescopeDragStartX = e.clientX
  telescopeDragStartY = e.clientY
  telescopeDragOriginX = telescopeX.value
  telescopeDragOriginY = telescopeY.value

  const onMove = (ev: PointerEvent) => {
    if (!isTelescopeDragging.value) return
    const dx = ev.clientX - telescopeDragStartX
    const dy = ev.clientY - telescopeDragStartY
    telescopeX.value = telescopeDragOriginX + dx
    telescopeY.value = telescopeDragOriginY + dy
  }
  const onUp = () => {
    isTelescopeDragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function onTelescopeWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.15 : 0.15
  telescopeScale.value = Math.round(Math.max(0.6, Math.min(2.0, telescopeScale.value + delta)) * 100) / 100
}

/* ==================== 望远镜 Canvas ref ==================== */
const telescopeCurvedRef = ref<HTMLCanvasElement | null>(null)
const telescopeFlatRef = ref<HTMLCanvasElement | null>(null)

/* ==================== Three.js 变量 ==================== */
const threeContainerRef = ref<HTMLElement | null>(null)

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

/* 场景组 */
let earthArcGroup: THREE.Group | null = null
let flatSeaGroup: THREE.Group | null = null
let seaFillGroup: THREE.Group | null = null
let flatSeaFillGroup: THREE.Group | null = null
let observerGroup: THREE.Group | null = null
let shipGroup: THREE.Group | null = null
let flatShipGroup: THREE.Group | null = null
let sightLineGroup: THREE.Group | null = null
let labelGroup: THREE.Group | null = null

/* 材质/几何体引用，用于 dispose */
const disposables: { mats: THREE.Material[]; geos: THREE.BufferGeometry[]; texs: THREE.Texture[] } = {
  mats: [],
  geos: [],
  texs: [],
}

/* ==================== 物理参数 ==================== */
const EARTH_RADIUS_KM = 6371

/* ==================== 视觉参数 ==================== */
const VR = 100
const ARC = 0.3
const OBS_H = 0.35
const SHIP_HULL = 0.25
const SHIP_MAST = 1.0

/* ==================== 计算隐藏高度 ==================== */
function calcHiddenHeight(distKm: number, obsH: number, R: number): number {
  const dH = Math.sqrt(2 * R * obsH + obsH * obsH)
  if (distKm <= dH) return 0
  const beyond = distKm - dH
  return (beyond * beyond) / (2 * R)
}

/* ==================== 创建文字精灵 ==================== */
function createLabel(text: string, fontSize: number, color: string, scale: number): THREE.Sprite {
  const cvs = document.createElement('canvas')
  cvs.width = 256
  cvs.height = 128
  const ctx = cvs.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${fontSize}px "Microsoft YaHei","PingFang SC",sans-serif`
  ctx.fillStyle = color
  ctx.fillText(text, 128, 64)
  const tex = new THREE.CanvasTexture(cvs)
  tex.colorSpace = THREE.SRGBColorSpace
  disposables.texs.push(tex)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  disposables.mats.push(mat)
  const sp = new THREE.Sprite(mat)
  sp.scale.set(scale, scale * 0.5, 1)
  return sp
}

/* ==================== 创建地球弧线 ==================== */
function createEarthArc() {
  const g = new THREE.Group()
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 300; i++) {
    const a = (i / 300) * ARC
    pts.push(new THREE.Vector3(VR * Math.sin(a), VR * Math.cos(a), 0))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  disposables.geos.push(geo)
  const mat = new THREE.LineBasicMaterial({ color: 0x2e86c1 })
  disposables.mats.push(mat)
  g.add(new THREE.Line(geo, mat))
  return g
}

/* ==================== 创建平面海线 ==================== */
function createFlatSeaLine() {
  const g = new THREE.Group()
  const maxX = VR * Math.sin(ARC) + 2
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2, VR, 0),
    new THREE.Vector3(maxX, VR, 0),
  ])
  disposables.geos.push(geo)
  const mat = new THREE.LineBasicMaterial({ color: 0x8ab4d6 })
  disposables.mats.push(mat)
  g.add(new THREE.Line(geo, mat))
  const label = createLabel('平面海面', 16, '#8ab4d6', 3)
  label.position.set(maxX + 3, VR, 0)
  g.add(label)
  return g
}

/* ==================== 创建海面填充 ==================== */
function createSeaFill() {
  const g = new THREE.Group()
  const shape = new THREE.Shape()
  const segs = 300
  const pts: [number, number][] = []
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * ARC
    pts.push([VR * Math.sin(a), VR * Math.cos(a)])
  }
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  const last = pts[pts.length - 1]
  const bottom = VR * Math.cos(ARC) - 10
  shape.lineTo(last[0], bottom)
  shape.lineTo(pts[0][0], bottom)
  shape.closePath()
  const geo = new THREE.ShapeGeometry(shape)
  disposables.geos.push(geo)
  const mat = new THREE.MeshBasicMaterial({ color: 0x2e86c1, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
  disposables.mats.push(mat)
  g.add(new THREE.Mesh(geo, mat))
  return g
}

/* ==================== 创建平面海面填充 ==================== */
function createFlatSeaFill() {
  const g = new THREE.Group()
  const maxX = VR * Math.sin(ARC) + 2
  const bottom = VR * Math.cos(ARC) - 10
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2, VR, 0),
    new THREE.Vector3(maxX, VR, 0),
    new THREE.Vector3(maxX, bottom, 0),
    new THREE.Vector3(-2, bottom, 0),
  ])
  const indices = [0, 1, 2, 0, 2, 3]
  geo.setIndex(indices)
  geo.computeVertexNormals()
  disposables.geos.push(geo)
  const mat = new THREE.MeshBasicMaterial({ color: 0x8ab4d6, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
  disposables.mats.push(mat)
  g.add(new THREE.Mesh(geo, mat))
  return g
}

/* ==================== 创建观察者 ==================== */
function createObserver() {
  const g = new THREE.Group()
  const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, OBS_H, 8)
  disposables.geos.push(bodyGeo)
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0xd4542a })
  disposables.mats.push(bodyMat)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = OBS_H / 2
  g.add(body)
  const headGeo = new THREE.SphereGeometry(0.18, 12, 8)
  disposables.geos.push(headGeo)
  const headMat = new THREE.MeshBasicMaterial({ color: 0xf0c090 })
  disposables.mats.push(headMat)
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = OBS_H + 0.18
  g.add(head)
  const teleGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8)
  disposables.geos.push(teleGeo)
  const teleMat = new THREE.MeshBasicMaterial({ color: 0x555555 })
  disposables.mats.push(teleMat)
  const tele = new THREE.Mesh(teleGeo, teleMat)
  tele.rotation.z = -Math.PI / 6
  tele.position.set(0.25, OBS_H + 0.05, 0)
  g.add(tele)
  return g
}

/* ==================== 创建帆船 ==================== */
function createShip() {
  const g = new THREE.Group()
  /* 船体 */
  const hullGeo = new THREE.BufferGeometry()
  const v = new Float32Array([
    -0.5, 0, 0, 0.5, 0, 0, 0.3, SHIP_HULL, 0, -0.3, SHIP_HULL, 0,
  ])
  hullGeo.setAttribute('position', new THREE.BufferAttribute(v, 3))
  hullGeo.computeVertexNormals()
  disposables.geos.push(hullGeo)
  const hullMat = new THREE.MeshBasicMaterial({ color: 0x8B4513, side: THREE.DoubleSide })
  disposables.mats.push(hullMat)
  g.add(new THREE.Mesh(hullGeo, hullMat))
  /* 桅杆 */
  const mastGeo = new THREE.CylinderGeometry(0.03, 0.03, SHIP_MAST, 6)
  disposables.geos.push(mastGeo)
  const mastMat = new THREE.MeshBasicMaterial({ color: 0x654321 })
  disposables.mats.push(mastMat)
  const mast = new THREE.Mesh(mastGeo, mastMat)
  mast.position.y = SHIP_HULL + SHIP_MAST / 2
  g.add(mast)
  /* 帆 */
  const sailGeo = new THREE.BufferGeometry()
  const sv = new Float32Array([
    0, SHIP_HULL, 0, 0, SHIP_HULL + SHIP_MAST, 0, 0.4, SHIP_HULL + SHIP_MAST * 0.6, 0,
  ])
  sailGeo.setAttribute('position', new THREE.BufferAttribute(sv, 3))
  sailGeo.computeVertexNormals()
  disposables.geos.push(sailGeo)
  const sailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  disposables.mats.push(sailMat)
  g.add(new THREE.Mesh(sailGeo, sailMat))
  /* 旗帜 */
  const flagGeo = new THREE.PlaneGeometry(0.2, 0.1)
  disposables.geos.push(flagGeo)
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c, side: THREE.DoubleSide })
  disposables.mats.push(flagMat)
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(0.1, SHIP_HULL + SHIP_MAST, 0)
  g.add(flag)
  return g
}

/* ==================== 清除动态组子元素 ==================== */
function clearGroup(g: THREE.Group) {
  while (g.children.length > 0) {
    const c = g.children[0]
    if (c instanceof THREE.Line || c instanceof THREE.Mesh) c.geometry?.dispose()
    if (c instanceof THREE.Sprite) c.material?.dispose()
    g.remove(c)
  }
}

/* ==================== 更新主场景 ==================== */
function updateScene() {
  if (!scene || !earthArcGroup || !observerGroup || !shipGroup) return

  const isCurved = viewMode.value === 'curved' || viewMode.value === 'compare'
  const isFlat = viewMode.value === 'flat' || viewMode.value === 'compare'

  earthArcGroup.visible = isCurved
  seaFillGroup!.visible = isCurved
  flatSeaGroup!.visible = isFlat
  flatSeaFillGroup!.visible = isFlat

  /* --- 观察者位置 --- */
  const obsScale = observerHeight.value / 50
  const obsX = 0
  const obsY = VR
  observerGroup.position.set(obsX, obsY, 0)
  observerGroup.scale.set(1, 1 + obsScale * 0.5, 1)

  /* --- 帆船位置（曲面沿弧线，平面沿直线） --- */
  const mastScale = shipMastHeight.value / 20
  const maxShipX = VR * Math.sin(ARC)

  if (isCurved) {
    /* 曲面模式：沿弧线移动 */
    const shipAngle = (shipDistance.value / 50) * ARC
    const shipX = VR * Math.sin(shipAngle)
    const shipY = VR * Math.cos(shipAngle)
    shipGroup.position.set(shipX, shipY, 0)
    shipGroup.rotation.z = -shipAngle
  } else {
    /* 平面模式：沿水平直线移动 */
    const shipX = (shipDistance.value / 50) * maxShipX
    shipGroup.position.set(shipX, VR, 0)
    shipGroup.rotation.z = 0
  }
  shipGroup.scale.set(1, mastScale, 1)

  /* --- 平直海面上的帆船（对比模式） --- */
  if (isFlat) {
    const flatShipX = (shipDistance.value / 50) * maxShipX
    flatShipGroup!.position.set(flatShipX, VR, 0)
    flatShipGroup!.rotation.z = 0
    flatShipGroup!.scale.set(1, mastScale, 1)
    flatShipGroup!.visible = isFlat
  } else {
    flatShipGroup!.visible = false
  }

  /* --- 观察者眼位 --- */
  const eyeY = obsY + OBS_H * (1 + obsScale * 0.5) + 0.18

  /* --- 视线 --- */
  clearGroup(sightLineGroup!)
  if (showSightLine.value) {
    /* 曲面视线（红色） */
    if (isCurved) {
      const sp = shipGroup.position
      const shipTopY = sp.y + (SHIP_HULL + SHIP_MAST) * mastScale

      const topGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(obsX, eyeY, 0),
        new THREE.Vector3(sp.x, shipTopY, 0),
      ])
      const topMat = new THREE.LineDashedMaterial({ color: 0xe74c3c, dashSize: 0.3, gapSize: 0.15 })
      const topLine = new THREE.Line(topGeo, topMat)
      topLine.computeLineDistances()
      sightLineGroup!.add(topLine)

      const hiddenH = calcHiddenHeight(shipDistance.value, observerHeight.value, EARTH_RADIUS_KM)
      if (hiddenH > 0) {
        const botGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(obsX, eyeY, 0),
          new THREE.Vector3(sp.x, sp.y, 0),
        ])
        const botMat = new THREE.LineDashedMaterial({ color: 0x999999, dashSize: 0.2, gapSize: 0.15 })
        const botLine = new THREE.Line(botGeo, botMat)
        botLine.computeLineDistances()
        sightLineGroup!.add(botLine)
      }
    }

    /* 平面视线（蓝色） */
    if (isFlat) {
      const fsp = flatShipGroup!.position
      const flatShipTopY = fsp.y + (SHIP_HULL + SHIP_MAST) * mastScale

      const flatTopGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(obsX, eyeY, 0),
        new THREE.Vector3(fsp.x, flatShipTopY, 0),
      ])
      const flatTopMat = new THREE.LineDashedMaterial({ color: 0x2e86c1, dashSize: 0.3, gapSize: 0.15 })
      const flatTopLine = new THREE.Line(flatTopGeo, flatTopMat)
      flatTopLine.computeLineDistances()
      sightLineGroup!.add(flatTopLine)
    }
  }

  /* --- 标签 --- */
  clearGroup(labelGroup!)
  const obsLabel = createLabel('观察者', 18, '#d4542a', 2.5)
  obsLabel.position.set(obsX - 1, eyeY + 1.5, 0)
  labelGroup!.add(obsLabel)
  const sp = shipGroup.position
  const shipLabel = createLabel('帆船', 18, '#2e86c1', 2.5)
  shipLabel.position.set(sp.x, sp.y + (SHIP_HULL + SHIP_MAST) * mastScale + 1.5, 0)
  labelGroup!.add(shipLabel)

  /* --- 望远镜 --- */
  drawTelescopeViews()
}

/* ==================== 望远镜视图 ==================== */
function drawTelescopeView(canvas: HTMLCanvasElement | null, isCurved: boolean) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio, 2)
  const displaySize = telescopeDisplaySize.value
  canvas.style.width = displaySize + 'px'
  canvas.style.height = displaySize + 'px'
  canvas.width = displaySize * dpr
  canvas.height = displaySize * dpr

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const S = displaySize
  const cx = S / 2
  const cy = S / 2
  const r = S / 2 - 4

  ctx.clearRect(0, 0, S, S)

  /* 圆形裁剪 */
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  /* 海面基准线 */
  const seaY = S * 0.55

  /* 帆船视觉高度：受桅杆高度和距离共同影响
   * 桅杆越高 → 船越高大
   * 距离越远 → 船越小（近大远小）
   */
  const dScale = Math.max(0.15, 1 - shipDistance.value / 60)
  const mastFactor = shipMastHeight.value / 20
  const sH = 55 * dScale * mastFactor
  const sW = 16 * dScale * mastFactor
  const sX = cx

  /* 曲面模式下可见比例（教学夸张版）
   * 距离越远 → 船被遮挡越多 → visRatio 越低
   * 观察者越高 → 船越可见 → visRatio 越高
   * 桅杆越高 → 露出越多 → visRatio 越高
   */
  const visRatio = isCurved
    ? Math.max(0.05, 1 - (shipDistance.value / 50) * Math.max(0.1, 1 - observerHeight.value / 60) * (20 / shipMastHeight.value) * 0.9)
    : 1

  /* 凸面海面高度：受距离和观察者高度共同影响
   * 距离越远 → 曲率越明显
   * 观察者越高 → 能看到更多曲率 → 凸面越显著
   */
  const distFactor = shipDistance.value / 50
  const heightFactor = Math.min(1, observerHeight.value / 30)
  const maxBulge = S * 0.10
  const bulge = isCurved ? maxBulge * (0.3 + heightFactor * 0.7) * distFactor : 0
  const convexPeak = seaY - bulge
  const convexCtrl = isCurved ? 2 * convexPeak - seaY : seaY

  /* 帆船位置：根据 visRatio 和凸面海面计算
   * visRatio = 1 → 船完全可见，船底在海面线上
   * visRatio < 1 → 船被遮挡，船底被推到凸面海面以下
   */
  const sBaseY = isCurved
    ? convexPeak + sH * (1 - visRatio)
    : seaY

  /* 高倍镜放大：以船为中心放大画面内容，窗口大小不变 */
  const zoom = telescopeZoomLevel.value
  if (zoom > 1) {
    const shipCenterY = sBaseY - sH * 0.35
    ctx.translate(cx, shipCenterY)
    ctx.scale(zoom, zoom)
    ctx.translate(-cx, -shipCenterY)
  }

  /* 天空 */
  const skyG = ctx.createLinearGradient(0, 0, 0, S)
  skyG.addColorStop(0, '#87CEEB')
  skyG.addColorStop(0.6, '#B0E0E6')
  skyG.addColorStop(1, '#4682B4')
  ctx.fillStyle = skyG
  ctx.fillRect(0, 0, S, S)

  /* 绘制帆船正面视图（先画帆船，海面后画覆盖遮挡部分） */
  if (visRatio > 0.01) {
    const shipTopY = sBaseY - sH

    /* 旗帜（最顶部） */
    ctx.fillStyle = '#e74c3c'
    const flagW = 10 * dScale
    const flagH = 5 * dScale
    ctx.fillRect(sX - flagW / 2, shipTopY, flagW, flagH)

    /* 桅杆 */
    const mastTopY = shipTopY + sH * 0.05
    const mastBotY = sBaseY - sH * 0.2
    ctx.strokeStyle = '#654321'
    ctx.lineWidth = Math.max(1.5, 2 * dScale)
    ctx.beginPath()
    ctx.moveTo(sX, mastTopY)
    ctx.lineTo(sX, mastBotY)
    ctx.stroke()

    /* 帆（正面：两侧展开的三角形） */
    ctx.fillStyle = '#FFFFFF'
    const sailTopY = mastTopY + sH * 0.05
    const sailMidY = sBaseY - sH * 0.35
    const sailW = sW * 1.2
    ctx.beginPath()
    ctx.moveTo(sX, sailTopY)
    ctx.lineTo(sX - sailW, sailMidY)
    ctx.lineTo(sX, sailMidY)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(sX, sailTopY)
    ctx.lineTo(sX + sailW, sailMidY)
    ctx.lineTo(sX, sailMidY)
    ctx.closePath()
    ctx.fill()

    /* 船体（正面：梯形） */
    const hullTopY = sBaseY - sH * 0.2
    const hullW = sW * 1.3
    const hullBotW = sW * 0.8
    ctx.fillStyle = '#8B4513'
    ctx.beginPath()
    ctx.moveTo(sX - hullW, hullTopY)
    ctx.lineTo(sX + hullW, hullTopY)
    ctx.lineTo(sX + hullBotW, sBaseY)
    ctx.lineTo(sX - hullBotW, sBaseY)
    ctx.closePath()
    ctx.fill()
  }

  /* 海面（在帆船之后绘制，自然覆盖被地球曲率遮挡的船体部分）
   * 凸面海面参数已在上方计算（convexPeak, convexCtrl）
   */

  ctx.fillStyle = '#2E86C1'
  ctx.beginPath()
  if (isCurved) {
    ctx.moveTo(0, seaY)
    ctx.quadraticCurveTo(cx, convexCtrl, S, seaY)
    ctx.lineTo(S, S)
    ctx.lineTo(0, S)
    ctx.closePath()
  } else {
    ctx.rect(0, seaY, S, S - seaY)
  }
  ctx.fill()

  /* 海面渐变 */
  const seaG = ctx.createLinearGradient(0, seaY, 0, S)
  seaG.addColorStop(0, 'rgba(30,100,180,0.3)')
  seaG.addColorStop(1, 'rgba(10,50,120,0.5)')
  ctx.fillStyle = seaG
  ctx.beginPath()
  if (isCurved) {
    ctx.moveTo(0, seaY)
    ctx.quadraticCurveTo(cx, convexCtrl, S, seaY)
    ctx.lineTo(S, S)
    ctx.lineTo(0, S)
    ctx.closePath()
  } else {
    ctx.rect(0, seaY, S, S - seaY)
  }
  ctx.fill()

  /* 遮挡线指示（虚线） — 曲面模式下用凸面峰值位置 */
  if (isCurved && visRatio < 1 && visRatio > 0.01) {
    ctx.strokeStyle = 'rgba(243,156,18,0.8)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(sX - sW * 2.5, convexPeak)
    ctx.lineTo(sX + sW * 2.5, convexPeak)
    ctx.stroke()
    ctx.setLineDash([])
  }

  /* 圆形边框 */
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawTelescopeViews() {
  const isCurved = viewMode.value === 'curved' || viewMode.value === 'compare'
  const isFlat = viewMode.value === 'flat' || viewMode.value === 'compare'
  if (isCurved) drawTelescopeView(telescopeCurvedRef.value, true)
  if (isFlat) drawTelescopeView(telescopeFlatRef.value, false)
}

/* ==================== Three.js 场景初始化 ==================== */
function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return

  const w = Math.max(1, Math.round(container.clientWidth))
  const h = Math.max(1, Math.round(container.clientHeight))
  if (w === lastSceneWidth && h === lastSceneHeight) return
  lastSceneWidth = w
  lastSceneHeight = h

  const aspect = w / h
  const vs = 18
  camera.left = -vs * aspect
  camera.right = vs * aspect
  camera.top = vs
  camera.bottom = -vs
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
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
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeThreeSceneNow()
      })
    })
  }, delay)
}

function animateThreeScene() {
  sceneAnimationFrameId = requestAnimationFrame(animateThreeScene)
  orbitControls?.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#e8f4f8')

  const aspect = container.clientWidth / container.clientHeight || 1
  const vs = 18
  camera = new THREE.OrthographicCamera(-vs * aspect, vs * aspect, vs, -vs, 0.1, 500)
  camera.position.set(0, VR + 5, 100)
  camera.lookAt(VR * Math.sin(ARC) / 2, VR * (1 + Math.cos(ARC)) / 2, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.enableRotate = false
  orbitControls.enableZoom = true
  orbitControls.minZoom = 0.5
  orbitControls.maxZoom = 3
  orbitControls.target.set(VR * Math.sin(ARC) / 2, VR * (1 + Math.cos(ARC)) / 2, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
  dirLight.position.set(10, 20, 15)
  scene.add(dirLight)

  earthArcGroup = createEarthArc()
  scene.add(earthArcGroup)
  flatSeaGroup = createFlatSeaLine()
  scene.add(flatSeaGroup)
  seaFillGroup = createSeaFill()
  scene.add(seaFillGroup)
  flatSeaFillGroup = createFlatSeaFill()
  scene.add(flatSeaFillGroup)
  observerGroup = createObserver()
  scene.add(observerGroup)
  shipGroup = createShip()
  scene.add(shipGroup)
  flatShipGroup = createShip()
  scene.add(flatShipGroup)
  sightLineGroup = new THREE.Group()
  scene.add(sightLineGroup)
  labelGroup = new THREE.Group()
  scene.add(labelGroup)

  updateScene()
  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => scheduleSceneResize(110))
  threeResizeObserver.observe(container)
  animateThreeScene()
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)
  if (sceneResizeTimer) { clearTimeout(sceneResizeTimer); sceneResizeTimer = null }
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)
  threeResizeObserver?.disconnect()
  threeResizeObserver = null
  orbitControls?.dispose()
  orbitControls = null
  disposables.mats.forEach(m => m.dispose())
  disposables.geos.forEach(g => g.dispose())
  disposables.texs.forEach(t => t.dispose())
  disposables.mats.length = 0
  disposables.geos.length = 0
  disposables.texs.length = 0
  renderer?.dispose()
  if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  scene = null; camera = null; renderer = null
  earthArcGroup = null; flatSeaGroup = null; seaFillGroup = null; flatSeaFillGroup = null
  observerGroup = null; shipGroup = null; flatShipGroup = null; sightLineGroup = null
  labelGroup = null
}

/* ==================== 时间轴动画 ==================== */
let tlAnimId = 0
let tlLastTime = 0

function animateTimeline(time: number) {
  tlAnimId = requestAnimationFrame(animateTimeline)
  if (!tlLastTime) { tlLastTime = time; return }
  const dt = Math.min((time - tlLastTime) / 1000, 0.1)
  tlLastTime = time
  if (isPlaying.value) {
    shipDistance.value -= dt * playbackSpeed.value * 4
    if (shipDistance.value < 1) shipDistance.value = 50
  }
}

/* ==================== watch ==================== */
watch(
  [shipDistance, observerHeight, shipMastHeight, viewMode, showSightLine, telescopeZoomLevel, telescopeScale],
  () => updateScene(),
)

/* ==================== 重置 ==================== */
function resetControls() {
  viewMode.value = 'curved'
  observerHeight.value = 1.8
  shipMastHeight.value = 20
  shipDistance.value = 50
  isPlaying.value = false
  playbackSpeed.value = 1
  showSightLine.value = true
  telescopeZoomLevel.value = 1
  telescopeScale.value = 1.2
  telescopeX.value = 16
  telescopeY.value = 200
  controlPanelRight.value = 12
  controlPanelY.value = 140
  scheduleSceneResize(90)
}

/* ==================== 生命周期 ==================== */
onMounted(async () => {
  await nextTick()
  initScene()
  tlAnimId = requestAnimationFrame(animateTimeline)
  repositionTelescope()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(tlAnimId)
  disposeScene()
})
</script>

<style scoped>
/* ==================== 望远镜浮层 ==================== */
.telescope-overlay {
  position: absolute;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.telescope-overlay.telescope-dragging {
  cursor: grabbing;
}

.telescope-view {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.telescope-canvas {
  display: block;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px rgba(255,255,255,0.5),
    0 4px 16px rgba(0,0,0,0.2);
}

.telescope-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1a3a5c;
  text-shadow: 0 1px 2px rgba(255,255,255,0.5);
  white-space: nowrap;
  text-align: center;
}

.telescope-zoom-hint {
  text-align: center;
  font-size: 10px;
  color: rgba(255,255,255,0.45);
  margin-top: 2px;
}

.telescope-zoom-controls {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-top: 4px;
}

.telescope-zoom-controls .zoom-btn {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.15s;
  min-width: 36px;
  text-align: center;
}

.telescope-zoom-controls .zoom-btn:hover {
  background: rgba(255,255,255,0.25);
  color: #fff;
}

.telescope-zoom-controls .zoom-btn.active {
  background: rgba(46,134,193,0.7);
  color: #fff;
  border-color: rgba(46,134,193,0.9);
}

.telescope-size-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  margin-top: 4px;
}

.telescope-size-controls .size-btn {
  width: 26px;
  height: 26px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.telescope-size-controls .size-btn:hover {
  background: rgba(255,255,255,0.25);
  color: #fff;
}

.telescope-size-controls .size-label {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  min-width: 36px;
  text-align: center;
}

/* ==================== 时间轴标签 ==================== */
.timeline-near {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
}

.timeline-far {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
}

/* ==================== 场景内浮层控制面板 ==================== */
.scene-control-panel {
  position: absolute;
  z-index: 20;
  width: 180px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
  overflow: hidden;
  user-select: none;
  font-size: 13px;
  color: #1a3a5c;
}

.scp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  transition: background 0.15s;
}

.scp-header:hover {
  background: rgba(46,134,193,0.08);
}

.scp-header {
  cursor: grab;
}

.scp-dragging .scp-header {
  cursor: grabbing;
}

.scp-dragging {
  opacity: 0.92;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08);
}

.scene-control-panel.collapsed .scp-header {
  border-bottom: none;
}

.scp-toggle {
  font-size: 11px;
  opacity: 0.5;
}

.scp-body {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scp-row {
  display: flex;
  gap: 4px;
}

.scp-mode-btn {
  flex: 1;
  padding: 4px 0;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 5px;
  background: rgba(255,255,255,0.6);
  font-size: 12px;
  font-weight: 600;
  color: #5a7a9a;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.scp-mode-btn:hover {
  background: rgba(46,134,193,0.1);
  border-color: rgba(46,134,193,0.3);
}

.scp-mode-btn.active {
  background: rgba(46,134,193,0.85);
  color: #fff;
  border-color: rgba(46,134,193,0.9);
}

.scp-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scp-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #5a7a9a;
}

.scp-label strong {
  color: #1a3a5c;
  font-size: 12px;
}

.scp-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #5a7a9a;
}

.scp-reset-btn {
  width: 100%;
  padding: 4px 0;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 5px;
  background: rgba(255,255,255,0.6);
  font-size: 12px;
  color: #5a7a9a;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.scp-reset-btn:hover {
  background: rgba(231,76,60,0.1);
  color: #c0392b;
  border-color: rgba(231,76,60,0.25);
}

.earth-ball-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
