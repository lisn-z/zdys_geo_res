<template>
  <div ref="pageRef" class="water-recycle-container geo-template-page geo-page theme-dark layout-floating" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="logo" />
      </div>
      <h1 class="page-title">水循环 <span class="page-subtitle">Water Cycle 3D Lab</span></h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="resetView">重置视角</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏显示' }}</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">{{ allPanelsCollapsed ? '展开面板' : '收起面板' }}</button>
      </div>
    </header>

    <main class="workspace" :class="{ 'has-left': hasLeftPanel }" :style="{ '--left-panel-width': leftCollapsed ? '0px' : leftPanelWidth + 'px' }">
      <!-- 左面板 -->
      <aside id="left-panel" class="side-panel left-panel" :class="{ collapsed: leftCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div><h2>水循环控制</h2><p>知识点搜索与图层管理</p></div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <!-- 可视化图层 -->
          <section class="geo-card control-section">
            <h3 class="section-title">👁 可视化图层</h3>
            <div class="layer-list">
              <div v-for="l in layerDefs" :key="l.key" class="switch-row layer-row">
                <div class="control-copy">
                  <strong>{{ l.label }}</strong>
                  <span :style="{ color: l.color }">{{ l.desc }}</span>
                </div>
                <el-switch v-model="layers[l.key]" />
              </div>
            </div>
          </section>

          <!-- 动画 -->
          <section class="geo-card control-section">
            <h3 class="section-title">⚡ 演示</h3>
            <div class="switch-row"><div class="control-copy"><strong>粒子动画</strong><span>水滴沿路径流动</span></div><el-switch v-model="autoPlay" /></div>
            <div class="section-title-row compact-title-row"><span class="mini-control-label">速度</span><strong class="control-value">{{ speed.toFixed(1) }}×</strong></div>
            <el-slider v-model="speed" :min="0.2" :max="3" :step="0.1" :show-tooltip="false" />
            <div class="switch-row"><div class="control-copy"><strong>标签显示</strong><span>环节名称</span></div><el-switch v-model="showLabels" /></div>
          </section>

          <!-- 知识解读 -->
          <section class="geo-card knowledge-card">
            <h3 class="section-title">📚 知识解读</h3>
            <div class="knowledge-content">
              <h4>水圈</h4>
              <p>水圈是地球上由各种水体构成的一个<strong>连续但不规则的圈层</strong>，是水循环发生的物质载体。</p>
              <p>包括：<strong>大气中的水汽、地表水、地下水、生物水</strong>等。</p>
              <p>水圈与大气圈、岩石圈、生物圈<strong>相互联系、相互渗透</strong>。</p>
              <p>通过蒸发、降水、径流、下渗等过程维持全球水的<strong>动态平衡</strong>。</p>
            </div>
          </section>
        </div>
        <div class="resize-handle resize-right" @pointerdown.stop.prevent="startResize('left', $event)"></div>
        <button type="button" class="panel-collapse-btn collapse-left" @click="leftCollapsed = true">‹</button>
      </aside>

      <!-- 中心舞台 -->
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeHostRef" class="scene-host three-host"></div>
          <div class="labels-overlay">
            <div v-for="(l, i) in screenLabels" :key="i" v-show="l.visible && showLabels" class="scene-label" :class="l.cls"
              :style="{ left: l.x + 'px', top: l.y + 'px' }">{{ l.text }}</div>
          </div>
        </div>
        <div class="footer-tip">拖拽旋转 · 滚轮缩放 · 右键平移</div>
      </section>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left" @click="leftCollapsed = false">›</button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import '@/styles/geo-page-template.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ==================== 类型与数据 ====================
type LayoutMode = 'large' | 'medium' | 'small'

const layerDefs = [
  { key: 'evaporation', label: '蒸发', desc: '海洋蒸发上升', color: '#67e8f9' },
  { key: 'precipitation', label: '降水', desc: '云层降水', color: '#3b82f6' },
  { key: 'runoff', label: '地表径流', desc: '地表水汇入海', color: '#2ec4b6' },
  { key: 'groundwater', label: '地下径流', desc: '地下水流向海', color: '#a78bfa' },
  { key: 'transport', label: '水汽输送', desc: '海上→陆上空', color: '#7dd3fc' },
  { key: 'transpiration', label: '植物蒸腾', desc: '植被水汽上升', color: '#4ade80' },
  { key: 'infiltration', label: '下渗', desc: '地表水下渗', color: '#8b5cf6' },
] as const

const cycleTypeMap: Record<string, string[]> = {
  seaLand: ['evaporation', 'transport', 'precipitation', 'runoff', 'infiltration', 'groundwater', 'transpiration'],
  sea: ['evaporation', 'precipitation'],
  land: ['transpiration', 'precipitation', 'runoff'],
}

// ==================== 状态 ====================
const pageRef = ref<HTMLElement | null>(null)
const hasLeftPanel = true
const layoutMode = ref<LayoutMode>('large')
const leftPanelWidth = ref(380)
const leftCollapsed = ref(false)
const threeHostRef = ref<HTMLElement | null>(null)
const autoPlay = ref(true)
const speed = ref(1)
const showLabels = ref(true)
const cycleType = ref('seaLand')
const isFullscreen = ref(false)
const layers = reactive<Record<string, boolean>>({})
layerDefs.forEach(l => { layers[l.key] = true })
const allPanelsCollapsed = computed(() => leftCollapsed.value)

// ==================== 标签 ====================
interface LabelInfo { text: string; cls: string; pos: THREE.Vector3; key: string }
const labelInfos: LabelInfo[] = [
  { text: '蒸发', cls: 'lbl-evap', pos: new THREE.Vector3(9, 4, 0), key: 'evaporation' },
  { text: '降水', cls: 'lbl-prec', pos: new THREE.Vector3(-3, 5, 0), key: 'precipitation' },
  { text: '植物蒸腾', cls: 'lbl-tran', pos: new THREE.Vector3(-7, terrainH(-7) + 3, 0), key: 'transpiration' },
  { text: '下渗', cls: 'lbl-inf', pos: new THREE.Vector3(-2, terrainH(-2) - 1.5, 0), key: 'infiltration' },
  { text: '水汽输送', cls: 'lbl-trans', pos: new THREE.Vector3(3, 11, 0), key: 'transport' },
  { text: '地表径流', cls: 'lbl-runoff', pos: new THREE.Vector3(4, terrainH(4) - 0.5, 0), key: 'runoff' },
  { text: '地下径流', cls: 'lbl-gw', pos: new THREE.Vector3(4, -2, 0), key: 'groundwater' },
  { text: '🌊 海洋', cls: 'lbl-ocean', pos: new THREE.Vector3(12, -0.3, -5), key: '' },
  { text: '☀ 太阳', cls: 'lbl-sun', pos: new THREE.Vector3(11, 15, 8), key: '' },
]
const screenLabels = ref<{ text: string; x: number; y: number; visible: boolean; cls: string }[]>([])
const sceneLabelMeshes: THREE.Mesh[] = []
const particleGroups: Record<string, THREE.Points> = {}
const arrowGroups: Record<string, THREE.Group> = {}

// ==================== Three.js ====================
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let sceneReady = false
let animationId = 0
let timeAccum = 0
const clock = new THREE.Clock()
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let lastSW = 0; let lastSH = 0
let leftManual = false; let isResizing = false
let pageRO: ResizeObserver | null = null
let prevMode: LayoutMode | null = null
let cameraPosTarget = new THREE.Vector3(0, 8, 22)
let cameraTargetTarget = new THREE.Vector3(0, 4, 0)

// ==================== 场景搭建 ====================

// 真实云朵：底部扁平 + 上部多个蓬松球体
function createCloud(cx: number, cy: number, cz: number): THREE.Group {
  const cloud = new THREE.Group()
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 1, transparent: true, opacity: 0.82, depthWrite: false })
  // 底部扁平椭圆（云底）
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 6), cloudMat)
  base.scale.set(1.6, 0.4, 1.0); base.position.y = 0; cloud.add(base)
  // 上部蓬松球体（3-5个不同大小的球）
  const puffCount = 4 + Math.floor(Math.random() * 2)
  for (let i = 0; i < puffCount; i++) {
    const r = 0.35 + Math.random() * 0.35
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat)
    puff.position.set(
      (Math.random() - 0.5) * 1.4,
      0.15 + Math.random() * 0.45,
      (Math.random() - 0.5) * 0.8,
    )
    cloud.add(puff)
  }
  cloud.position.set(cx, cy, cz)
  return cloud
}

function buildScene() {
  const c = threeHostRef.value; if (!c) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a1628)
  scene.fog = new THREE.Fog(0x0a1628, 28, 80)

  camera = new THREE.PerspectiveCamera(38, 2, 0.5, 150)
  camera.position.copy(cameraPosTarget)
  camera.lookAt(cameraTargetTarget)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.domElement.className = 'scene-canvas three-canvas'
  c.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.08
  controls.target.copy(cameraTargetTarget)
  controls.minDistance = 12; controls.maxDistance = 50
  controls.maxPolarAngle = Math.PI * 0.5
  controls.update()

  // 光照
  scene.add(new THREE.AmbientLight(0x6080a0, 1.2))
  const sunL = new THREE.DirectionalLight(0xfff8e7, 2.8)
  sunL.position.set(10, 20, 12); scene.add(sunL)

  // === 海洋（右侧低洼平面）===
  const oGeo = new THREE.PlaneGeometry(28, 22, 30, 22)
  const oa = oGeo.attributes.position!.array as Float32Array
  for (let i = 0; i < oa.length; i += 3) { oa[i + 2] = -0.6 + Math.sin(oa[i]! * 0.5 + oa[i + 1]! * 0.4) * 0.04 }
  oGeo.computeVertexNormals()
  const ocean = new THREE.Mesh(oGeo, new THREE.MeshPhongMaterial({ color: 0x1a8fb8, specular: 0x88e0ff, shininess: 60, transparent: true, opacity: 0.85 }))
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(8, 0, 0); (ocean as any).__water = true; scene.add(ocean)

  // 海洋渐变深度（下方暗色带）
  const dGeo = new THREE.PlaneGeometry(28, 18, 1, 1)
  const dM = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: 0x0a3a5a, transparent: true, opacity: 0.6 }))
  dM.rotation.x = -Math.PI / 2; dM.position.set(8, -1.2, 0); scene.add(dM)

  // === 陆地（左侧山地）— 高度写入 Z 分量，旋转后变为 Y（向上）===
  const lGeo = new THREE.PlaneGeometry(28, 24, 40, 32)
  const la = lGeo.attributes.position!.array as Float32Array
  for (let i = 0; i < la.length; i += 3) {
    const x = la[i]!, y = la[i + 1]!
    let h = 0
    if (x < -8) h = 5 + Math.sin(x * 0.3 + y * 0.2) * 1.2
    else if (x < -3) h = 4 + (x + 8) * 0.05
    else if (x < 4) h = 2.5 + Math.cos(x * 0.3) * 1.0
    else h = 0.2 - (x - 4) * 0.15
    if (x > -9 && x < -4 && y > -3 && y < 4) h += Math.max(0, (x + 9) * 0.4) * 1.8 + Math.max(0, -(x + 4) * 0.4) * 0.5
    la[i + 2] = h
  }
  lGeo.computeVertexNormals()
  const cols = new Float32Array(la.length)
  for (let i = 0; i < la.length; i += 3) {
    const h = la[i + 2]!
    if (h < 0.5) { cols[i] = 0.20; cols[i + 1] = 0.45; cols[i + 2] = 0.18 }
    else if (h < 2.5) { cols[i] = 0.25; cols[i + 1] = 0.50; cols[i + 2] = 0.20 }
    else if (h < 4.5) { cols[i] = 0.32; cols[i + 1] = 0.42; cols[i + 2] = 0.20 }
    else { cols[i] = 0.40; cols[i + 1] = 0.40; cols[i + 2] = 0.32 }
  }
  lGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  const land = new THREE.Mesh(lGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }))
  land.rotation.x = -Math.PI / 2; land.position.set(-6, 0, 0); land.receiveShadow = true; scene.add(land)

  // 地形高度查询由模块级 terrainH 函数提供

  // 海岸线
  const shore = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1, 16),
    new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.9 })
  )
  shore.position.set(2, -0.4, 0); shore.rotation.z = 0.3; scene.add(shore)

  // === 地下层 ===
  const ugGeo = new THREE.PlaneGeometry(40, 16, 1, 1)
  const ug = new THREE.Mesh(ugGeo, new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1, transparent: true, opacity: 0.85 }))
  ug.rotation.x = -Math.PI / 2; ug.position.set(0, -2.5, 0); scene.add(ug)

  // 地下层顶部沙土面
  const sandGeo = new THREE.PlaneGeometry(40, 4, 1, 1)
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 }))
  sand.rotation.x = -Math.PI / 2; sand.position.set(-12, 0.05, 7); sand.rotation.z = -0.4; scene.add(sand)
  const sand2 = new THREE.Mesh(sandGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 }))
  sand2.rotation.x = -Math.PI / 2; sand2.position.set(-12, 0.05, -7); sand2.rotation.z = -0.4; scene.add(sand2)

  // === 河流 ===
  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6, terrainH(-6) + 0.1, -1.5), new THREE.Vector3(-3, terrainH(-3) + 0.05, 0),
    new THREE.Vector3(0, terrainH(0) - 0.1, 1.5), new THREE.Vector3(3, -0.4, 1),
    new THREE.Vector3(5, -0.5, 0.5), new THREE.Vector3(7, -0.5, 0),
  ])
  const river = new THREE.Mesh(new THREE.TubeGeometry(riverCurve, 40, 0.18, 8, false), new THREE.MeshPhongMaterial({ color: 0x4dd0e1, emissive: 0x2ec4b6, emissiveIntensity: 0.4, specular: 0xaaeeff, shininess: 90, transparent: true, opacity: 0.9 }))
  scene.add(river)

  // === 树木（贴在地形表面）===
  const treeGroup = new THREE.Group()
  const treePositions: [number, number][] = [
    [-9, -3], [-8, 1], [-7, 3], [-10, 2],
    [-8.5, -2], [-9.5, 4], [-7, -3.5], [-6, 2.5],
    [-10, -1.5], [-8, 4], [-9, -4], [-6.5, -1],
    [-11, 0], [-7.5, -2.5],
  ]
  treePositions.forEach(([tx, tz]) => {
    const ty = terrainH(tx)
    const tree = new THREE.Group()
    // 树干
    const trunkH = 0.5 + Math.random() * 0.2
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, trunkH, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a20 }))
    trunk.position.y = trunkH / 2; tree.add(trunk)
    // 树冠（3层圆锥，渐变绿色）
    for (let i = 0; i < 3; i++) {
      const r = 0.55 - i * 0.12
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.55, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.6, 0.22 + i * 0.05), roughness: 0.8 }))
      cone.position.y = trunkH + 0.15 + i * 0.38; tree.add(cone)
    }
    tree.position.set(tx, ty, tz)
    tree.scale.setScalar(0.8 + Math.random() * 0.4)
    treeGroup.add(tree)
  })
  scene.add(treeGroup)

  // === 太阳 ===
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }))
  sunM.position.set(11, 14, 8); scene.add(sunM)
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.18, depthWrite: false }))
  glow.position.copy(sunM.position); scene.add(glow)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshBasicMaterial({ color: 0xfde68a }))
    line.position.set(sunM.position.x + Math.cos(ang) * 1.8, sunM.position.y + Math.sin(ang) * 1.8, sunM.position.z)
    line.rotation.z = ang; scene.add(line)
  }

  // === 云层（真实云朵形状：底部扁平、上部蓬松）===
  const cPos: [number, number, number][] = [
    [-3, 9, -1], [-1, 9.5, 1.5], [4, 8.5, -2], [6, 9.5, 1], [8, 8, 3],
    [10, 9, -3], [9, 10, 4], [12, 8.5, 0], [10, 8.5, 2.5],
  ]
  cPos.forEach(([cx, cy, cz]) => {
    scene!.add(createCloud(cx, cy, cz))
  })

  // === 循环方向箭头 ===
  buildArrows()

  // === 粒子系统 ===
  buildParticles()

  // === 标签球 ===
  if (scene) {
    labelInfos.forEach(info => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0 }))
      m.position.copy(info.pos); (m as any).__lbl = info; scene!.add(m); sceneLabelMeshes.push(m)
    })
  }

  resizeNow()
  threeResizeObserver = new ResizeObserver(() => scheduleResize()); threeResizeObserver.observe(c)
  sceneReady = true; animate()
}

// ==================== 方向箭头 ====================
// 地形高度查询（世界坐标 X → 高度 Y）
function terrainH(worldX: number): number {
  const lx = worldX + 6
  let h = 0
  if (lx < -8) h = 5 + Math.sin(lx * 0.3) * 1.2
  else if (lx < -3) h = 4 + (lx + 8) * 0.05
  else if (lx < 4) h = 2.5 + Math.cos(lx * 0.3) * 1.0
  else h = 0.2 - (lx - 4) * 0.15
  if (lx > -9 && lx < -4) h += Math.max(0, (lx + 9) * 0.4) * 1.8 + Math.max(0, -(lx + 4) * 0.4) * 0.5
  return h
}

function buildArrows() {
  if (!scene) return

  // ① 蒸发：海洋表面 → 上升
  createVerticalArrow('evaporation', new THREE.Vector3(9, -0.4, 0), 0, 8, 0x67e8f9)
  // ② 降水：云层 → 地表
  createVerticalArrow('precipitation', new THREE.Vector3(-3, 8, 0), 0, -(8 - terrainH(-3) - 0.3), 0x3b82f6, true)
  // ③ 植物蒸腾：植被 → 上升
  createVerticalArrow('transpiration', new THREE.Vector3(-7, terrainH(-7), 0), 0, 5, 0x4ade80)
  // ④ 下渗：地表 → 地下
  createVerticalArrow('infiltration', new THREE.Vector3(-2, terrainH(-2), 0), 0, -3.5, 0x8b5cf6, true)

  // ⑤ 水汽输送：海洋上空 → 陆地上空
  createHorizontalArrow('transport', new THREE.Vector3(10, 10, 0), -14, 0, 0x7dd3fc)
  // ⑥ 地表径流：陆地 → 海洋
  createHorizontalArrow('runoff', new THREE.Vector3(-4, terrainH(-4) - 0.2, 0), 14, -3.5, 0x2ec4b6)
  // ⑦ 地下径流：地下 → 海洋
  createHorizontalArrow('groundwater', new THREE.Vector3(-4, -2.2, 0), 14, 0, 0xa78bfa)
}

function createVerticalArrow(key: string, pos: THREE.Vector3, dx: number, dy: number, color: number, down = false) {
  if (!scene) return
  const startY = pos.y
  const endY = startY + dy
  const height = Math.abs(dy)
  // 管身
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, height, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }))
  tube.position.set(pos.x, (startY + endY) / 2, pos.z)
  scene.add(tube)
  // 箭头
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 12), new THREE.MeshBasicMaterial({ color }))
  cone.position.set(pos.x, endY + (down ? 0.3 : -0.3), pos.z)
  if (down) cone.rotation.x = Math.PI
  scene.add(cone)
  // 粒子流（沿线段的小球）
  const grp = new THREE.Group()
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }))
    b.position.set(pos.x, startY + (i + 0.5) * height / 8, pos.z); grp.add(b)
  }
  grp.userData = { type: 'vertical', startY, endY, down }
  scene.add(grp)
  arrowGroups[key] = grp
}

function createHorizontalArrow(key: string, pos: THREE.Vector3, dx: number, dy: number, color: number) {
  if (!scene) return
  const startX = pos.x
  const endX = startX + dx
  const length = Math.abs(dx)
  const y = pos.y + dy
  // 管身
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, length, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }))
  tube.position.set((startX + endX) / 2, y, pos.z)
  tube.rotation.z = Math.PI / 2
  scene.add(tube)
  // 箭头
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 12), new THREE.MeshBasicMaterial({ color }))
  cone.position.set(endX + (dx > 0 ? 0.3 : -0.3), y, pos.z)
  if (dx < 0) cone.rotation.z = Math.PI
  scene.add(cone)
  // 粒子流
  const grp = new THREE.Group()
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }))
    b.position.set(startX + (i + 0.5) * length / 8 * Math.sign(dx), y, pos.z); grp.add(b)
  }
  grp.userData = { type: 'horizontal', startX, endX, y }
  scene.add(grp)
  arrowGroups[key] = grp
}

// ==================== 粒子系统 ====================
function buildParticles() {
  const config: Record<string, { color: number; count: number; size: number; lanes: number; zSpread: number }> = {
    evaporation: { color: 0x67e8f9, count: 50, size: 0.35, lanes: 3, zSpread: 1.5 },
    transport: { color: 0x7dd3fc, count: 50, size: 0.35, lanes: 3, zSpread: 2.0 },
    precipitation: { color: 0x60a5fa, count: 50, size: 0.35, lanes: 3, zSpread: 1.5 },
    transpiration: { color: 0x4ade80, count: 40, size: 0.35, lanes: 2, zSpread: 1.2 },
    runoff: { color: 0x2ec4b6, count: 60, size: 0.4, lanes: 4, zSpread: 1.0 },
    infiltration: { color: 0x8b5cf6, count: 40, size: 0.35, lanes: 2, zSpread: 1.0 },
    groundwater: { color: 0xa78bfa, count: 80, size: 0.45, lanes: 5, zSpread: 2.5 },
  }
  Object.entries(config).forEach(([key, cfg]) => {
    const count = cfg.count
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const lanes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      phases[i] = Math.random()
      lanes[i] = Math.floor(i / Math.ceil(count / cfg.lanes))
      positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('lane', new THREE.BufferAttribute(lanes, 1))
    const mat = new THREE.PointsMaterial({ color: cfg.color, size: cfg.size, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })
    const pts = new THREE.Points(geo, mat); scene!.add(pts); particleGroups[key] = pts
    ;(pts as any).__cfg = cfg
  })
}

function updateParticles(dt: number) {
  const activeKeys = cycleTypeMap[cycleType.value] || []
  Object.entries(particleGroups).forEach(([key, pts]) => {
    const visible = !!layers[key] && activeKeys.includes(key)
    pts.visible = visible
    if (!visible) return
    const cfg = (pts as any).__cfg
    const arr = pts.geometry.attributes.position!.array as Float32Array
    const phArr = pts.geometry.attributes.phase!.array as Float32Array
    const laneArr = pts.geometry.attributes.lane!.array as Float32Array
    for (let i = 0; i < phArr.length; i++) {
      phArr[i] = (phArr[i]! + dt * speed.value * 0.35) % 1
      const pos = particlePos(key, phArr[i]!, laneArr[i]!, cfg.lanes, cfg.zSpread)
      arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z
    }
    pts.geometry.attributes.position!.needsUpdate = true
  })
}

function particlePos(key: string, phase: number, lane: number, laneCount: number, zSpread: number): THREE.Vector3 {
  const t = phase
  const laneOffset = (lane - (laneCount - 1) / 2) * (zSpread / Math.max(laneCount, 1))
  switch (key) {
    case 'evaporation': return new THREE.Vector3(9 + Math.sin(t * 12) * 0.2, -0.4 + t * 8, laneOffset + Math.cos(t * 8) * 0.3)
    case 'transport': return new THREE.Vector3(10 - t * 18 + Math.sin(t * 10) * 0.3, 10 + Math.sin(t * 8) * 0.2, laneOffset + Math.cos(t * 6) * 0.3)
    case 'precipitation': return new THREE.Vector3(-3 + Math.sin(t * 12) * 0.2, 8 - t * 8, laneOffset + Math.cos(t * 8) * 0.2)
    case 'transpiration': return new THREE.Vector3(-7 + Math.sin(t * 10) * 0.2, terrainH(-7) + t * 5, laneOffset + Math.cos(t * 8) * 0.2)
    case 'runoff': return new THREE.Vector3(-4 + t * 14, terrainH(-4 + t * 14) - 0.3 + Math.sin(t * 10) * 0.1, laneOffset + Math.cos(t * 6) * 0.2)
    case 'infiltration': return new THREE.Vector3(-2 + Math.sin(t * 8) * 0.15, terrainH(-2) - t * 3, laneOffset + Math.cos(t * 6) * 0.2)
    case 'groundwater': return new THREE.Vector3(-4 + t * 14, -2.2 + Math.sin(t * 6 + lane) * 0.3, laneOffset + Math.cos(t * 8 + lane) * 0.4)
    default: return new THREE.Vector3()
  }
}

// ==================== 动画 ====================
function animate() {
  animationId = requestAnimationFrame(animate)
  if (!sceneReady || !renderer || !scene || !camera) return
  const dt = Math.min(clock.getDelta(), 0.05)
  if (autoPlay.value) timeAccum += dt

  updateParticles(dt)

  // 箭头粒子流动
  const activeKeys = cycleTypeMap[cycleType.value] || []
  Object.entries(arrowGroups).forEach(([key, grp]) => {
    const show = !!layers[key] && activeKeys.includes(key)
    grp.visible = show
    if (!show || !autoPlay.value) return
    grp.children.forEach((b, i) => {
      if (grp.userData.type === 'vertical') {
        const phase = (timeAccum * 1.2 + i / grp.children.length) % 1
        b.position.y = grp.userData.startY + (grp.userData.endY - grp.userData.startY) * phase
      } else {
        const phase = (timeAccum * 1.2 + i / grp.children.length) % 1
        const dir = Math.sign(grp.userData.endX - grp.userData.startX)
        b.position.x = grp.userData.startX + Math.abs(grp.userData.endX - grp.userData.startX) * phase * dir
      }
    })
  })

  // 海洋波动
  scene?.children.forEach(c => {
    if ((c as any).__water) {
      const om = c as THREE.Mesh; const a = (om.geometry as THREE.PlaneGeometry).attributes.position!.array as Float32Array
      for (let i = 0; i < a.length; i += 3) a[i + 2] = -0.6 + Math.sin(a[i]! * 0.5 + timeAccum * 0.7) * 0.05
      om.geometry.attributes.position!.needsUpdate = true; om.geometry.computeVertexNormals()
    }
  })

  controls?.update(); renderer.render(scene, camera); updateLabels()
}

// ==================== 标签投影 ====================
function updateLabels() {
  if (!camera || !threeHostRef.value) return
  const w = threeHostRef.value.clientWidth; const h = threeHostRef.value.clientHeight
  if (w <= 0 || h <= 0) return
  const activeKeys = cycleTypeMap[cycleType.value] || []
  screenLabels.value = sceneLabelMeshes.map(m => {
    const info = (m as any).__lbl as LabelInfo
    const wp = info.pos.clone().project(camera!)
    const visible = wp.z < 1 && wp.z > 0 && !!layers[info.key]
    return { text: info.text, x: (wp.x * 0.5 + 0.5) * w, y: (-wp.y * 0.5 + 0.5) * h, visible, cls: info.cls }
  })
}

// ==================== 视图控制 ====================
function resetView() {
  if (!camera || !controls) return
  cameraPosTarget.set(0, 8, 22); cameraTargetTarget.set(0, 4, 0)
  animateCameraTo(cameraPosTarget, cameraTargetTarget)
}

function animateCameraTo(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3) {
  if (!camera || !controls) return
  const startPos = camera.position.clone(); const startTarget = controls.target.clone()
  const startTime = performance.now(); const duration = 800
  function step() {
    const t = Math.min((performance.now() - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    camera!.position.lerpVectors(startPos, targetPos, ease)
    controls!.target.lerpVectors(startTarget, targetLookAt, ease)
    controls!.update()
    if (t < 1) requestAnimationFrame(step)
  }
  step()
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  const el = document.querySelector('.water-recycle-container') as HTMLElement
  if (isFullscreen.value) { el?.requestFullscreen?.() } else { document.exitFullscreen?.() }
  setTimeout(scheduleResize, 100)
}

// ==================== Resize ====================
function resizeNow() {
  const c = threeHostRef.value; if (!c || !camera || !renderer) return
  const w = Math.max(1, Math.round(c.clientWidth)); const h = Math.max(1, Math.round(c.clientHeight))
  if (w === lastSW && h === lastSH) return; lastSW = w; lastSH = h
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false)
}
function scheduleResize(d = 140) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  sceneResizeTimer = setTimeout(() => { sceneResizeTimer = null; if (isResizing) { scheduleResize(90); return }; resizeNow() }, d)
}

// ==================== 布局 ====================
function clampV(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
function effW(fb?: number): number {
  const c: number[] = []; if (typeof fb === 'number' && fb > 0) c.push(fb)
  const pw = pageRef.value?.clientWidth; if (typeof pw === 'number' && pw > 0) c.push(pw)
  if (window) { [window.innerWidth, window.visualViewport?.width, window.screen?.width].forEach(v => { if (typeof v === 'number' && v > 0) c.push(v) }) }
  return c.length ? Math.min(...c) : 0
}
function isUL(fb?: number) { return effW(fb) >= 2200 }
function panelW(side: 'left' | 'right', mode: LayoutMode, pw: number) {
  if (mode === 'small') return clampV(pw * 0.76, 260, 360)
  if (mode === 'medium') return clampV(pw * 0.36, 320, 480)
  return isUL(effW(pw)) ? clampV(effW(pw) * 0.22, 420, 640) : clampV(pw * 0.19, 340, 520)
}
function updateLayout() {
  const pw = pageRef.value?.clientWidth || window.innerWidth
  const n: LayoutMode = pw >= 1280 ? 'large' : pw >= 860 ? 'medium' : 'small'
  const ch = prevMode !== n; layoutMode.value = n
  if (ch || !leftManual) leftPanelWidth.value = panelW('left', n, pw)
  prevMode = n
}
function boundsM() {
  const pw = pageRef.value?.clientWidth || window.innerWidth; const ew = effW(pw); const ul = isUL(ew)
  return { min: 280, max: Math.max(280, Math.min(ul ? 820 : 560, pw * (ul ? 0.54 : 0.38))) }
}
function startResize(side: 'left' | 'right', ev: PointerEvent) {
  if (leftCollapsed.value) return; ev.stopPropagation(); leftManual = true; isResizing = true
  const sx = ev.clientX; const sw = leftPanelWidth.value; const b = boundsM()
  const mv = (e: PointerEvent) => { leftPanelWidth.value = clampV(side === 'left' ? sw + e.clientX - sx : sw - e.clientX + sx, b.min, b.max) }
  const fn = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', fn); document.body.style.cursor = ''; isResizing = false; scheduleResize(0) }
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', fn); document.body.style.cursor = 'col-resize'
}
function toggleAllPanels() { leftCollapsed.value = !leftCollapsed.value; scheduleResize() }

// ==================== 生命周期 ====================
onMounted(async () => {
  updateLayout()
  pageRO = new ResizeObserver(() => { updateLayout(); scheduleResize() })
  if (pageRef.value) pageRO.observe(pageRef.value)
  await nextTick(); buildScene()
})

onBeforeUnmount(() => {
  sceneReady = false; cancelAnimationFrame(animationId)
  pageRO?.disconnect(); pageRO = null; threeResizeObserver?.disconnect(); threeResizeObserver = null
  if (sceneResizeTimer) { clearTimeout(sceneResizeTimer); sceneResizeTimer = null }
  controls?.dispose(); controls = null
  scene?.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry?.dispose(); const m = o.material; if (Array.isArray(m)) m.forEach(x => x.dispose()); else m?.dispose() } })
  renderer?.dispose(); if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  scene = null; camera = null; renderer = null
})
</script>

<style scoped>
.page-subtitle { font-size: 13px; color: #64748b; font-weight: 400; margin-left: 10px; letter-spacing: 1px; }
.labels-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 15; }
.scene-label { position: absolute; transform: translate(-50%, -50%); font-weight: 700; white-space: nowrap; padding: 3px 10px; border-radius: 5px; text-shadow: 0 1px 3px rgba(0,0,0,0.9); font-size: 14px; background: rgba(8,12,28,0.55); border: 1px solid rgba(46,196,182,0.25); color: #2ec4b6; }
.scene-label.lbl-evap { color: #67e8f9; border-color: rgba(103,232,249,0.5); }
.scene-label.lbl-trans { color: #7dd3fc; border-color: rgba(125,211,252,0.5); }
.scene-label.lbl-prec { color: #93c5fd; border-color: rgba(147,197,253,0.5); }
.scene-label.lbl-tran { color: #4ade80; border-color: rgba(74,222,128,0.5); }
.scene-label.lbl-runoff { color: #2ec4b6; border-color: rgba(46,196,182,0.6); }
.scene-label.lbl-inf { color: #c4b5fd; border-color: rgba(196,181,253,0.5); }
.scene-label.lbl-gw { color: #a78bfa; border-color: rgba(167,139,250,0.5); }
.footer-tip { position: absolute; right: 16px; bottom: 16px; font-size: 11px; color: #64748b; padding: 4px 10px; background: rgba(8,12,28,0.6); border: 1px solid rgba(100,116,139,0.3); border-radius: 999px; pointer-events: none; }
.layer-list { display: flex; flex-direction: column; gap: 2px; }
.layer-row { padding: 6px 0; border-bottom: 1px solid rgba(100,116,139,0.1); }
.layer-row:last-child { border-bottom: none; }
.knowledge-card { margin-bottom: 14px; }
.knowledge-content { font-size: 12px; color: #94a3b8; line-height: 1.7; }
.knowledge-content h4 { margin: 0 0 6px; color: #2ec4b6; font-size: 14px; }
.knowledge-content p { margin: 0 0 6px; }
.knowledge-content :deep(strong) { color: #fbbf24; }
</style>
