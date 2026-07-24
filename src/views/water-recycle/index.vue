<template>
  <div ref="pageRef" class="water-recycle-container geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>
      <h1 class="page-title">水循环</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="resetView">重置视角</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleFullscreen">{{ isFullscreen
          ? '退出全屏' : '全屏显示' }}</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">{{
          allPanelsCollapsed ? '展开面板' : '收起面板' }}</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <!-- 左面板 -->
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>水循环控制</h2>
              <p>知识点搜索与图层管理</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <!-- 城镇化对比 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🏙 城镇化对比</h3>
            <div class="urban-toggle">
              <button class="theme-btn option-btn" :class="{ active: urbanMode === 'before' }"
                @click="setUrbanMode('before')">城镇化前</button>
              <button class="theme-btn option-btn" :class="{ active: urbanMode === 'after' }"
                @click="setUrbanMode('after')">城镇化后</button>
            </div>
            <p class="urban-hint">{{ urbanMode === 'before' ? '🌿 植被茂盛，下渗充足，径流缓慢' : '🏢 建筑密布，下渗减少，地表径流增大' }}</p>
          </section>

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
            <div class="switch-row">
              <div class="control-copy"><strong>粒子动画</strong><span>水滴沿路径流动</span></div><el-switch v-model="autoPlay" />
            </div>
            <div class="section-title-row compact-title-row"><span class="mini-control-label">速度</span><strong
                class="control-value">{{ speed.toFixed(1) }}×</strong></div>
            <el-slider v-model="speed" :min="0.2" :max="3" :step="0.1" :show-tooltip="false" />
            <div class="switch-row">
              <div class="control-copy"><strong>标签显示</strong><span>环节名称</span></div><el-switch v-model="showLabels" />
            </div>
            <div class="switch-row">
              <div class="control-copy"><strong>环境雾</strong><span>大气透视效果</span></div><el-switch v-model="enableFog" />
            </div>
            <div class="switch-row">
              <div class="control-copy"><strong>标签显示</strong><span>环节名称</span></div><el-switch v-model="showLabels" />
            </div>
          </section>

          <!-- 知识解读 -->
          <section class="geo-card knowledge-card">
            <h3 class="section-title">📚 知识解读</h3>
            <div class="knowledge-content" v-if="urbanMode === 'before'">
              <h4>城镇化前 — 自然水循环</h4>
              <p>植被茂盛，土壤透水性好。<strong>下渗充足</strong>，地下水补给丰富。</p>
              <p>地表径流<strong>缓慢而稳定</strong>，河流流量均匀，不易发生洪涝。</p>
              <p>蒸发和蒸腾作用活跃，<strong>水循环通畅</strong>，生态平衡良好。</p>
            </div>
            <div class="knowledge-content" v-else>
              <h4>城镇化后 — 水循环受阻</h4>
              <p>建筑和道路<strong>覆盖地表</strong>，不透水面积增大，下渗大幅减少。</p>
              <p>地表径流<strong>急剧增大</strong>，汇流速度加快，易引发城市内涝。</p>
              <p>地下水补给不足，水位下降。蒸发蒸腾减少，<strong>城市热岛效应</strong>加剧。</p>
              <p>💡 <strong>海绵城市</strong>：通过透水铺装、雨水花园、绿色屋顶等措施恢复自然水循环。</p>
            </div>
          </section>
        </div>
        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">
          ‹
        </button>
      </aside>

      <!-- 中心舞台 -->
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeHostRef" class="scene-host three-host"></div>
          <div class="labels-overlay">
            <div v-for="(l, i) in screenLabels" :key="i" v-show="l.visible && showLabels" class="scene-label"
              :class="l.cls" :style="{ left: l.x + 'px', top: l.y + 'px' }">{{ l.text }}</div>
          </div>
        </div>
        <div class="footer-tip">拖拽旋转 · 滚轮缩放 · 右键平移</div>
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
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

/*
 * 公共模板样式已内置悬浮面板、平板宽度和触控拖拽。
 */
import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ==================== 类型与数据 ====================
const layerDefs = [
  { key: 'evaporation', label: '蒸发', desc: '海洋蒸发上升', color: '#67e8f9' },
  { key: 'precipitation', label: '降水', desc: '云层降水', color: '#3b82f6' },
  { key: 'runoff', label: '地表径流', desc: '地表水汇入海', color: '#2ec4b6' },
  { key: 'groundwater', label: '地下径流', desc: '地下水流向海', color: '#c4b5fd' },
  { key: 'transport', label: '水汽输送', desc: '海上→陆上空', color: '#7dd3fc' },
  { key: 'transpiration', label: '植物蒸腾', desc: '植被水汽上升', color: '#4ade80' },
  { key: 'infiltration', label: '下渗', desc: '地表水下渗', color: '#8b5cf6' },
] as const

const cycleTypeMap: Record<string, string[]> = {
  seaLand: ['evaporation', 'transport', 'precipitation', 'runoff', 'infiltration', 'groundwater', 'transpiration'],
  sea: ['evaporation', 'oceanPrecip'],
  land: ['transpiration', 'precipitation', 'runoff'],
}

// ==================== 状态 ====================
const hasLeftPanel = true

const threeHostRef =
  ref<HTMLElement | null>(null)

const autoPlay = ref(true)
const speed = ref(1)
const showLabels = ref(true)
const cycleType = ref('seaLand')
const isFullscreen = ref(false)
const urbanMode = ref<'before' | 'after'>('before')
const enableFog = ref(true)
const layers = reactive<Record<string, boolean>>({})
layers['oceanPrecip'] = true

layerDefs.forEach((layer) => {
  layers[layer.key] = true
})

/*
 * 本页面只有一个左侧模板面板。
 *
 * 平板宽度直接使用公共 Hook 配置：
 * - medium 默认 280px，最小 220px；
 * - small 默认 250px，最小 200px。
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

  toggleAll:
  toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
    resizable: true,
  },

  right: {
    enabled: false,
  },

  onLayoutChange(state) {
    /*
     * 面板拖拽和浏览器连续缩放期间，
     * 不重建 WebGL drawing buffer。
     */
    if (state.resizing) {
      return
    }

    scheduleSceneResize(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResize(0)
    }
  },
})

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
  { text: '海洋降水', cls: 'lbl-prec', pos: new THREE.Vector3(11, 4, 2), key: 'oceanPrecip' },
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
let threeResizeObserver:
  | ResizeObserver
  | null = null

let sceneResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let lastSceneWidth = 0
let lastSceneHeight = 0
let lastSceneDpr = 0
let cameraPosTarget = new THREE.Vector3(0, 8, 22)
let cameraTargetTarget = new THREE.Vector3(0, 4, 0)
const cloudMeshes: THREE.Group[] = []
let treeGroupRef: THREE.Group | null = null
let buildingGroupRef: THREE.Group | null = null
let concreteRef: THREE.Mesh | null = null

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
  const container =
    threeHostRef.value

  if (!container) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      container.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      container.clientHeight
    )
  )

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    2
  )

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a3050)
  scene.fog = new THREE.FogExp2(0x1a3050, 0.025)
  scene.background =
    new THREE.Color(0x0a1628)

  scene.fog =
    new THREE.Fog(
      0x0a1628,
      28,
      80
    )

  camera =
    new THREE.PerspectiveCamera(
      38,
      width / height,
      0.5,
      150
    )

  camera.position.copy(
    cameraPosTarget
  )

  camera.lookAt(
    cameraTargetTarget
  )

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      powerPreference:
        'high-performance',
    })

  /*
   * 必须先设置 DPR，再设置真实容器尺寸。
   * 避免默认 300×150 画布被 CSS 拉伸。
   */
  renderer.setPixelRatio(dpr)

  renderer.setSize(
    width,
    height,
    false
  )

  renderer.shadowMap.enabled = true

  renderer.domElement.className =
    'scene-canvas three-canvas'

  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr

  container.appendChild(
    renderer.domElement
  )

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.08
  controls.target.copy(cameraTargetTarget)
  controls.minDistance = 12; controls.maxDistance = 50
  controls.maxPolarAngle = Math.PI * 0.5
  controls.update()

  // 光照
  scene.add(new THREE.AmbientLight(0xa0b8d0, 2.8))
  const hemi = new THREE.HemisphereLight(0x88bbff, 0x554433, 1.2); scene.add(hemi)
  const sunL = new THREE.DirectionalLight(0xfff8e7, 4.5)
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

  // === 地下层（封闭3D箱体：土壤层 + 含水层 + 基岩层）===
  const ugGroup = new THREE.Group()
  // 土壤层（最上层，棕色）
  const soilGeo = new THREE.BoxGeometry(22, 1.0, 14)
  const soil = new THREE.Mesh(soilGeo, new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95, transparent: true, opacity: 0.75 }))
  soil.position.set(-1, -1.0, 0); ugGroup.add(soil)
  // 含水层（中间层，深棕紫色，地下水所在）
  const aquiferGeo = new THREE.BoxGeometry(22, 1.5, 14)
  const aquifer = new THREE.Mesh(aquiferGeo, new THREE.MeshStandardMaterial({ color: 0x4a2a6a, roughness: 0.8, transparent: true, opacity: 0.6 }))
  aquifer.position.set(-1, -2.25, 0); ugGroup.add(aquifer)
  // 基岩层（最底层，灰色）
  const rockGeo = new THREE.BoxGeometry(22, 0.8, 14)
  const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 }))
  rock.position.set(-1, -3.4, 0); ugGroup.add(rock)
  // 前侧面剖面（半透明，可以看到内部水流）
  const sideGeo = new THREE.PlaneGeometry(22, 3.3)
  const sideMat = new THREE.MeshBasicMaterial({ color: 0x2a1a3a, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
  const sideFront = new THREE.Mesh(sideGeo, sideMat)
  sideFront.position.set(-1, -2.0, 7.01); ugGroup.add(sideFront)
  const sideBack = new THREE.Mesh(sideGeo, sideMat.clone())
  sideBack.position.set(-1, -2.0, -7.01); ugGroup.add(sideBack)
  scene.add(ugGroup)

  // 地下层顶部沙土面
  const sandGeo = new THREE.PlaneGeometry(22, 4, 1, 1)
  const sand = new THREE.Mesh(sandGeo, new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 }))
  sand.rotation.x = -Math.PI / 2; sand.position.set(-1, 0.02, 7); scene.add(sand)
  const sand2 = new THREE.Mesh(sandGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 }))
  sand2.rotation.x = -Math.PI / 2; sand2.position.set(-1, 0.02, -7); scene.add(sand2)

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
  treeGroupRef = treeGroup

  // === 建筑（城镇化后显示）===
  const buildingGroup = new THREE.Group()
  buildingGroup.visible = false // 默认隐藏
  const buildingPositions: [number, number, number, number][] = [
    // [x, z, width, height]
    [-5, -1.5, 1.0, 1.8], [-3.5, 0.5, 1.2, 2.5], [-2, -2, 0.8, 1.5],
    [-5.5, 2, 1.0, 2.0], [-3, -3, 0.9, 1.6], [-1.5, 1, 1.1, 2.2],
    [-6, 0, 0.8, 1.4], [-4, -3.5, 1.0, 1.9], [-2.5, 2.5, 0.9, 1.7],
  ]
  buildingPositions.forEach(([bx, bz, bw, bh]) => {
    const by = terrainH(bx)
    const bGroup = new THREE.Group()
    // 主体
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(bw, bh, bw),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6, metalness: 0.2 }),
    )
    body.position.y = bh / 2; bGroup.add(body)
    // 屋顶
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 1.1, 0.1, bw * 1.1),
      new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5 }),
    )
    roof.position.y = bh + 0.05; bGroup.add(roof)
    // 窗户（发光面）
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6 })
    for (let wy = 0.3; wy < bh - 0.3; wy += 0.5) {
      for (let wx = -bw * 0.3; wx <= bw * 0.3; wx += bw * 0.4) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.2), winMat)
        win.position.set(wx, wy, bw / 2 + 0.01); bGroup.add(win)
      }
    }
    bGroup.position.set(bx, by, bz)
    buildingGroup.add(bGroup)
  })
  scene.add(buildingGroup)
  buildingGroupRef = buildingGroup

  // 混凝土路面（城镇化后）
  const concreteGeo = new THREE.PlaneGeometry(12, 10, 1, 1)
  const concrete = new THREE.Mesh(concreteGeo, new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9, transparent: true, opacity: 0.7 }))
  concrete.rotation.x = -Math.PI / 2; concrete.position.set(-4, 0.03, 0)
  concrete.visible = false
  scene.add(concrete)
  concreteRef = concrete

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
  cloudMeshes.length = 0
  const cPos: [number, number, number][] = [
    // 陆地上空云
    [-3, 9, -1], [-1, 9.5, 1.5], [2, 8.5, -2],
    // 海洋上空云
    [6, 9, 1], [8, 8.5, 3], [10, 9, -3], [9, 10, 4], [12, 8.5, 0], [10, 8.5, 2.5],
  ]
  cPos.forEach(([cx, cy, cz]) => {
    const cloud = createCloud(cx, cy, cz)
      ; (cloud as any).__baseX = cx; (cloud as any).__baseY = cy; (cloud as any).__baseZ = cz
    scene!.add(cloud); cloudMeshes.push(cloud)
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

  /*
   * 动画开始前先绘制清晰首帧。
   */
  controls.update()

  renderer.render(
    scene,
    camera
  )

  updateLabels()

  threeResizeObserver =
    new ResizeObserver(() => {
      scheduleSceneResize(110)
    })

  threeResizeObserver.observe(
    container
  )

  sceneReady = true
  animate()

  /*
   * Grid、字体和面板完成首轮布局后再校准一次。
   */
  scheduleSceneResize(0)
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
  // ② 降水：陆地上空云层 → 地表
  createVerticalArrow('precipitation', new THREE.Vector3(-3, 8, 0), 0, -(8 - terrainH(-3) - 0.3), 0x3b82f6, true)
  // ②b 海洋降水：海洋上空云层 → 海面（海上内循环）
  createVerticalArrow('oceanPrecip', new THREE.Vector3(11, 8, 2), 0, -7.5, 0x3b82f6, true)
  // ③ 植物蒸腾：植被 → 上升
  createVerticalArrow('transpiration', new THREE.Vector3(-7, terrainH(-7), 0), 0, 5, 0x4ade80)
  // ④ 下渗：地表 → 地下含水层
  createVerticalArrow('infiltration', new THREE.Vector3(-2, terrainH(-2), 0), 0, -3.5, 0x8b5cf6, true)

  // ⑤ 水汽输送：海洋上空 → 陆地上空（从右向左）
  createHorizontalArrow('transport', new THREE.Vector3(10, 10, 0), -14, 0, 0x7dd3fc)
  // ⑥ 地表径流：陆地 → 海洋（从左向右）
  createHorizontalArrow('runoff', new THREE.Vector3(-4, terrainH(-4) - 0.2, 0), 14, -3.5, 0x2ec4b6)
  // ⑦ 地下径流：含水层 → 海洋（从左向右）
  createHorizontalArrow('groundwater', new THREE.Vector3(-4, -2.2, 0), 14, 0, 0xc4b5fd)
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
  // 箭头锥 — 朝向运动方向
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 12), new THREE.MeshBasicMaterial({ color }))
  cone.position.set(endX + (dx > 0 ? 0.3 : -0.3), y, pos.z)
  // 默认锥体朝 +Y；水平箭头需旋转到 ±X 方向
  cone.rotation.z = dx > 0 ? -Math.PI / 2 : Math.PI / 2
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
    groundwater: { color: 0xc4b5fd, count: 120, size: 0.6, lanes: 6, zSpread: 3.0 },
    oceanPrecip: { color: 0x60a5fa, count: 40, size: 0.35, lanes: 3, zSpread: 1.5 },
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
      ; (pts as any).__cfg = cfg
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
    case 'groundwater': return new THREE.Vector3(-4 + t * 14, -2.2 + Math.sin(t * 6 + lane) * 0.5, laneOffset + Math.cos(t * 8 + lane) * 0.6)
    case 'oceanPrecip': return new THREE.Vector3(11 + Math.sin(t * 10) * 0.3, 8 - t * 8.5, 2 + laneOffset + Math.cos(t * 8) * 0.2)
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
    const show = !!layers[key] && (activeKeys.includes(key) || key === 'oceanPrecip')
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

  // 云朵飘动
  cloudMeshes.forEach((cloud, i) => {
    const base = (cloud as any).__baseX as number
    const baseY = (cloud as any).__baseY as number
    const baseZ = (cloud as any).__baseZ as number
    // 缓慢横向飘动 + 上下浮动
    cloud.position.x = base + Math.sin(timeAccum * 0.15 + i * 0.7) * 1.5
    cloud.position.y = baseY + Math.sin(timeAccum * 0.2 + i * 0.5) * 0.3
    cloud.position.z = baseZ + Math.cos(timeAccum * 0.12 + i * 0.6) * 0.4
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
  setTimeout(
    () => {
      scheduleSceneResize(0)
    },
    100
  )
}

// ==================== Resize ====================
function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeSceneNow() {
  const container =
    threeHostRef.value

  if (
    !container ||
    !camera ||
    !renderer ||
    !scene
  ) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      container.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      container.clientHeight
    )
  )

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    2
  )

  const sizeChanged =
    width !== lastSceneWidth ||
    height !== lastSceneHeight ||
    dpr !== lastSceneDpr

  /*
   * setSize 和 setPixelRatio 都会重建绘图缓冲区。
   * 尺寸与 DPR 未变化时不重复执行。
   */
  if (!sizeChanged) {
    updateLabels()
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr

  camera.aspect =
    width / height

  camera.updateProjectionMatrix()

  renderer.setPixelRatio(dpr)

  renderer.setSize(
    width,
    height,
    false
  )

  controls?.update()

  /*
   * 缓冲区重建后立即补绘，避免短暂空白。
   */
  renderer.render(
    scene,
    camera
  )

  updateLabels()
}

function scheduleSceneResize(
  delay = 110
) {
  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )
  }

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  /*
   * 拖拽阶段先由 CSS 拉伸已有 canvas。
   * 松手后 Hook 会再次触发真实像素校准。
   */
  if (isPanelLayoutResizing()) {
    return
  }

  sceneResizeTimer =
    setTimeout(() => {
      sceneResizeTimer = null

      sceneResizeFrame =
        requestAnimationFrame(() => {
          sceneResizeFrame = 0

          sceneResizeSettleFrame =
            requestAnimationFrame(() => {
              sceneResizeSettleFrame = 0
              resizeSceneNow()
            })
        })
    }, delay)
}


// 城镇化模式切换
function setUrbanMode(mode: 'before' | 'after') {
  urbanMode.value = mode
  if (!sceneReady) return
  if (treeGroupRef) treeGroupRef.visible = mode === 'before'
  if (buildingGroupRef) buildingGroupRef.visible = mode === 'after'
  if (concreteRef) concreteRef.visible = mode === 'after'
  // 城镇化后：下渗减少、地表径流增强
  if (mode === 'after') {
    layers.infiltration = false
    layers.runoff = true
  } else {
    layers.infiltration = true
    layers.runoff = true
  }
}

// ==================== 生命周期 ====================
watch(enableFog, v => { if (scene) scene.fog = v ? new THREE.FogExp2(0x1a3050, 0.025) : null })
onMounted(async () => {
  /*
   * 等 Hook 先写入当前断点的面板宽度，
   * 再初始化 Three.js。
   */
  await nextTick()
  buildScene()
})

onBeforeUnmount(() => {
  sceneReady = false; cancelAnimationFrame(animationId)
  pageRO?.disconnect(); pageRO = null; threeResizeObserver?.disconnect(); threeResizeObserver = null
  if (sceneResizeTimer) { clearTimeout(sceneResizeTimer); sceneResizeTimer = null }
  controls?.dispose(); controls = null
  scene?.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry?.dispose(); const m = o.material; if (Array.isArray(m)) m.forEach(x => x.dispose()); else m?.dispose() } })
  renderer?.dispose(); if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  scene = null; camera = null; renderer = null
  treeGroupRef = null; buildingGroupRef = null; concreteRef = null
  sceneReady = false

  cancelAnimationFrame(
    animationId
  )

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )

    sceneResizeTimer = null
  }

  controls?.dispose()
  controls = null

  scene?.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Points
    ) {
      object.geometry?.dispose()

      const material =
        object.material

      if (Array.isArray(material)) {
        material.forEach(
          (item) => item.dispose()
        )
      } else {
        material?.dispose()
      }
    }
  })

  renderer?.dispose()

  if (
    renderer?.domElement.parentElement
  ) {
    renderer.domElement.parentElement
      .removeChild(
        renderer.domElement
      )
  }

  scene = null
  camera = null
  renderer = null
})
</script>

<style scoped>
.page-subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
  margin-left: 10px;
  letter-spacing: 1px;
}

.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}

.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 700;
  white-space: nowrap;
  padding: 3px 10px;
  border-radius: 5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  font-size: 14px;
  background: rgba(8, 12, 28, 0.55);
  border: 1px solid rgba(46, 196, 182, 0.25);
  color: #2ec4b6;
}

.scene-label.lbl-evap {
  color: #67e8f9;
  border-color: rgba(103, 232, 249, 0.5);
}

.scene-label.lbl-trans {
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.5);
}

.scene-label.lbl-prec {
  color: #93c5fd;
  border-color: rgba(147, 197, 253, 0.5);
}

.scene-label.lbl-tran {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.5);
}

.scene-label.lbl-runoff {
  color: #2ec4b6;
  border-color: rgba(46, 196, 182, 0.6);
}

.scene-label.lbl-inf {
  color: #c4b5fd;
  border-color: rgba(196, 181, 253, 0.5);
}

.scene-label.lbl-gw {
  color: #c4b5fd;
  border-color: rgba(196, 181, 253, 0.6);
  font-size: 15px;
  font-weight: 800;
}

.footer-tip {
  position: absolute;
  right: 16px;
  bottom: 16px;
  font-size: 11px;
  color: #64748b;
  padding: 4px 10px;
  background: rgba(8, 12, 28, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 999px;
  pointer-events: none;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-row {
  padding: 6px 0;
  border-bottom: 1px solid rgba(100, 116, 139, 0.1);
}

.layer-row:last-child {
  border-bottom: none;
}

.urban-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.urban-hint {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 0;
  line-height: 1.5;
  padding: 6px 8px;
  background: rgba(46, 196, 182, 0.06);
  border-radius: 6px;
  border-left: 2px solid #2ec4b6;
}

.knowledge-card {
  margin-bottom: 14px;
}

.knowledge-content {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.7;
}

.knowledge-content h4 {
  margin: 0 0 6px;
  color: #2ec4b6;
  font-size: 14px;
}

.knowledge-content p {
  margin: 0 0 6px;
}

.knowledge-content :deep(strong) {
  color: #fbbf24;
}

.page-subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
  margin-left: 10px;
  letter-spacing: 1px;
}

.labels-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}

.scene-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 700;
  white-space: nowrap;
  padding: 3px 10px;
  border-radius: 5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  font-size: 14px;
  background: rgba(8, 12, 28, 0.55);
  border: 1px solid rgba(46, 196, 182, 0.25);
  color: #2ec4b6;
}

.scene-label.lbl-evap {
  color: #67e8f9;
  border-color: rgba(103, 232, 249, 0.5);
}

.scene-label.lbl-trans {
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.5);
}

.scene-label.lbl-prec {
  color: #93c5fd;
  border-color: rgba(147, 197, 253, 0.5);
}

.scene-label.lbl-tran {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.5);
}

.scene-label.lbl-runoff {
  color: #2ec4b6;
  border-color: rgba(46, 196, 182, 0.6);
}

.scene-label.lbl-inf {
  color: #c4b5fd;
  border-color: rgba(196, 181, 253, 0.5);
}

.scene-label.lbl-gw {
  color: #a78bfa;
  border-color: rgba(167, 139, 250, 0.5);
}

.footer-tip {
  position: absolute;
  right: 16px;
  bottom: 16px;
  font-size: 11px;
  color: #64748b;
  padding: 4px 10px;
  background: rgba(8, 12, 28, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 999px;
  pointer-events: none;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-row {
  padding: 6px 0;
  border-bottom: 1px solid rgba(100, 116, 139, 0.1);
}

.layer-row:last-child {
  border-bottom: none;
}

.knowledge-card {
  margin-bottom: 14px;
}

.knowledge-content {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.7;
}

.knowledge-content h4 {
  margin: 0 0 6px;
  color: #2ec4b6;
  font-size: 14px;
}

.knowledge-content p {
  margin: 0 0 6px;
}

.knowledge-content :deep(strong) {
  color: #fbbf24;
}

/* ===================== v2：公共面板 Hook =====================
   左侧悬浮面板宽度、断点、触控拖拽与展开折叠，
   统一由 useGeoPanelLayout 和 geo-page-template.css 管理。
*/

.water-recycle-container .three-host {
  overflow: hidden;
}

.water-recycle-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>