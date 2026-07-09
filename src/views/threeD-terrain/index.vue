<template>
  <div ref="container" class="terrain-container">
    <!-- 顶部标题 -->
    <div class="title-bar">
      <div class="title-text">等高线地形图 · 三维投影</div>
      <div class="title-sub">Contour Map Projection</div>
    </div>

    <!-- 操作提示 -->
    <div class="controls-info">
      <span>🖱 拖拽旋转</span>
      <span>🔄 滚轮缩放</span>
      <span>✋ 右键平移</span>
    </div>

    <!-- 图例说明 -->
    <div class="legend-panel">
      <div class="panel-title">地形判读</div>
      <div class="legend-item"><span class="badge" style="background:#ff6b6b"></span>山顶</div>
      <div class="legend-item"><span class="badge" style="background:#4ecdc4"></span>次峰</div>
      <div class="legend-item"><span class="badge" style="background:#f9ca24"></span>鞍部</div>
      <div class="legend-item"><span class="badge" style="background:#2bcbba"></span>山脊</div>
      <div class="legend-item"><span class="badge" style="background:#45aaf2"></span>山谷</div>
      <div class="legend-item"><span class="badge" style="background:#fd9644"></span>陡坡</div>
      <div class="legend-item"><span class="badge" style="background:#778ca3"></span>缓坡</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

// ============================================================
// 配置参数
// ============================================================
const GRID_SIZE = 160
const BASE_ELEVATION = 100          // 地形基准面海拔（米）
const MAX_RELIEF = 32               // 地形起伏幅度（米）
const HEIGHT_SCALE = 1 / 20         // 真实米数 → 3D 显示单位
const CONTOUR_START = 100           // 等高线起始海拔
const CONTOUR_END = 130             // 等高线结束海拔
const CONTOUR_INTERVAL = 10         // 等高距（米）
const BASE_PLANE_Y = -0.75          // 2D 投影面高度（与地形间距稍大）
const TERRAIN_SIZE = 3.0            // 地形平面尺寸（更大的地形范围）

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls
let animationId: number
let heightsData: number[][] = []
let maxHeightValue = 0

// ============================================================
// 地形生成
// ============================================================
function gauss2d(x: number, z: number, cx: number, cz: number, sx: number, sz: number): number {
  return Math.exp(-((x - cx) ** 2) / (2 * sx ** 2) - ((z - cz) ** 2) / (2 * sz ** 2))
}

function getNormalizedHeight(x: number, z: number): number {
  // ---- 主要山峰（主峰 + 次峰） ----
  const peak1 = 0.95 * gauss2d(x, z, 0.32, 0.60, 0.14, 0.16)   // 主峰
  const peak2 = 0.80 * gauss2d(x, z, 0.70, 0.55, 0.12, 0.14)   // 次峰

  // ---- 众多小山丘 ----
  const hill1 = 0.45 * gauss2d(x, z, 0.22, 0.32, 0.10, 0.10)
  const hill2 = 0.42 * gauss2d(x, z, 0.55, 0.25, 0.09, 0.09)
  const hill3 = 0.40 * gauss2d(x, z, 0.78, 0.78, 0.10, 0.10)
  const hill4 = 0.38 * gauss2d(x, z, 0.85, 0.38, 0.09, 0.11)
  const hill5 = 0.35 * gauss2d(x, z, 0.15, 0.70, 0.10, 0.10)
  const hill6 = 0.33 * gauss2d(x, z, 0.48, 0.82, 0.09, 0.09)
  const hill7 = 0.30 * gauss2d(x, z, 0.88, 0.68, 0.08, 0.08)
  const hill8 = 0.28 * gauss2d(x, z, 0.28, 0.18, 0.08, 0.08)
  const hill9 = 0.25 * gauss2d(x, z, 0.62, 0.72, 0.08, 0.08)
  const hill10 = 0.22 * gauss2d(x, z, 0.72, 0.28, 0.07, 0.07)

  // ---- 山脊系统 ----
  const ridge1 = 0.32 * gauss2d(x, z, 0.48, 0.58, 0.35, 0.07)
  const ridge2 = 0.25 * gauss2d(x, z, 0.58, 0.45, 0.08, 0.30)
  const ridge3 = 0.20 * gauss2d(x, z, 0.72, 0.68, 0.08, 0.28)
  const ridge4 = 0.18 * gauss2d(x, z, 0.38, 0.42, 0.25, 0.07)

  // ---- 鞍部 ----
  const saddle1 = -0.26 * gauss2d(x, z, 0.50, 0.52, 0.10, 0.12)
  const saddle2 = -0.20 * gauss2d(x, z, 0.72, 0.65, 0.08, 0.10)

  // ---- 山谷 ----
  const valley1 = -0.18 * gauss2d(x, z, 0.58, 0.38, 0.12, 0.10)
  const valley2 = -0.16 * gauss2d(x, z, 0.42, 0.72, 0.10, 0.12)
  const valley3 = -0.14 * gauss2d(x, z, 0.85, 0.42, 0.10, 0.14)

  // ---- 细碎起伏 ----
  const detail =
    0.10 * gauss2d(x, z, 0.18, 0.48, 0.15, 0.15) +
    0.09 * gauss2d(x, z, 0.48, 0.18, 0.14, 0.14) +
    0.08 * gauss2d(x, z, 0.88, 0.60, 0.13, 0.13) +
    0.07 * gauss2d(x, z, 0.35, 0.75, 0.12, 0.12) +
    0.06 * gauss2d(x, z, 0.65, 0.15, 0.11, 0.11)

  // ---- 陡坡：主峰前侧急剧下切 ----
  const cliffFactor = Math.exp(-((x - 0.32) ** 2) / (2 * 0.08 ** 2))
  let cliffDrop = 0
  if (z < 0.36 && cliffFactor > 0.06) {
    const t = Math.max(0, Math.min(1, (0.36 - z) / 0.14))
    cliffDrop = -0.42 * cliffFactor * t * t
  }

  return Math.max(0, peak1 + peak2 +
    hill1 + hill2 + hill3 + hill4 + hill5 + hill6 + hill7 + hill8 + hill9 + hill10 +
    ridge1 + ridge2 + ridge3 + ridge4 +
    saddle1 + saddle2 + valley1 + valley2 + valley3 +
    detail + cliffDrop + 0.04)
}

function getRealHeight(x: number, z: number): number {
  return BASE_ELEVATION + getNormalizedHeight(x, z) * MAX_RELIEF
}

function getDisplayHeight(realHeight: number): number {
  return (realHeight - BASE_ELEVATION) * HEIGHT_SCALE
}

// ============================================================
// 地形数据
// ============================================================
function generateTerrainData(): {
  positions: Float32Array
  colors: Float32Array
  indices: number[]
  maxHeight: number
} {
  heightsData = []
  const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
  const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
  maxHeightValue = 0

  for (let j = 0; j < GRID_SIZE; j++) {
    heightsData[j] = []
    for (let i = 0; i < GRID_SIZE; i++) {
      const x = i / (GRID_SIZE - 1)
      const z = 1 - j / (GRID_SIZE - 1)
      const realH = getRealHeight(x, z)
      heightsData[j][i] = realH
      if (realH > maxHeightValue) maxHeightValue = realH
    }
  }

  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE; i++) {
      const idx = (j * GRID_SIZE + i) * 3
      const x = (i / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
      const z = (j / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
      const realH = heightsData[j][i]
      const displayH = getDisplayHeight(realH)
      positions[idx] = x
      positions[idx + 1] = displayH
      positions[idx + 2] = z
      const norm = (realH - BASE_ELEVATION) / (maxHeightValue - BASE_ELEVATION)
      const col = getTerrainColor(Math.max(0, Math.min(1, norm)))
      colors[idx] = col.r
      colors[idx + 1] = col.g
      colors[idx + 2] = col.b
    }
  }

  const indices: number[] = []
  for (let j = 0; j < GRID_SIZE - 1; j++) {
    for (let i = 0; i < GRID_SIZE - 1; i++) {
      const a = j * GRID_SIZE + i
      const b = j * GRID_SIZE + i + 1
      const c = (j + 1) * GRID_SIZE + i
      const d = (j + 1) * GRID_SIZE + i + 1
      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }
  return { positions, colors, indices, maxHeight: maxHeightValue }
}

/** 贴近参考图的绿色调：深绿 → 草绿 → 黄绿 */
function getTerrainColor(t: number): { r: number; g: number; b: number } {
  const stops = [
    { pos: 0.0, r: 0.08, g: 0.28, b: 0.12 },
    { pos: 0.25, r: 0.14, g: 0.42, b: 0.18 },
    { pos: 0.50, r: 0.24, g: 0.56, b: 0.22 },
    { pos: 0.75, r: 0.42, g: 0.68, b: 0.26 },
    { pos: 1.0, r: 0.62, g: 0.78, b: 0.32 },
  ]
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const f = (t - lo.pos) / (hi.pos - lo.pos)
  return { r: lo.r + f * (hi.r - lo.r), g: lo.g + f * (hi.g - lo.g), b: lo.b + f * (hi.b - lo.b) }
}

// ============================================================
// 等高线
// ============================================================
interface ContourSegment { ax: number; az: number; bx: number; bz: number; level: number }

function generateContourSegments(): ContourSegment[] {
  const segments: ContourSegment[] = []
  for (let level = CONTOUR_START; level <= CONTOUR_END; level += CONTOUR_INTERVAL) {
    for (let j = 0; j < GRID_SIZE - 1; j++) {
      for (let i = 0; i < GRID_SIZE - 1; i++) {
        const hTL = heightsData[j][i]
        const hTR = heightsData[j][i + 1]
        const hBL = heightsData[j + 1][i]
        const hBR = heightsData[j + 1][i + 1]
        const code = ((hTL >= level ? 1 : 0) << 3) | ((hTR >= level ? 1 : 0) << 2) |
                     ((hBL >= level ? 1 : 0) << 1) | (hBR >= level ? 1 : 0)
        if (code === 0 || code === 15) continue
        const nx = (idx: number) => (idx / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
        const nz = (idx: number) => (idx / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
        const ip = (h1: number, h2: number, p1: number, p2: number) => {
          const t = (level - h1) / (h2 - h1); return p1 + t * (p2 - p1)
        }
        const top = ip(hTL, hTR, nx(i), nx(i + 1))
        const bot = ip(hBL, hBR, nx(i), nx(i + 1))
        const lef = ip(hTL, hBL, nz(j), nz(j + 1))
        const rig = ip(hTR, hBR, nz(j), nz(j + 1))
        const addSeg = (ax: number, az: number, bx: number, bz: number) => segments.push({ ax, az, bx, bz, level })
        const ct = top, cb = bot, cl = lef, cr = rig
        const czT = nz(j), czB = nz(j + 1), cxL = nx(i), cxR = nx(i + 1)
        switch (code) {
          case 1: addSeg(cxR, cr, cxR, czB); break
          case 2: addSeg(cxR, czB, cxL, czB); break
          case 3: addSeg(cxL, czB, cxR, czB); break
          case 4: addSeg(ct, czT, cxR, cr); break
          case 5: addSeg(ct, czT, cxR, czB); break
          case 6: addSeg(ct, czT, cxL, czB); addSeg(cxR, cr, cxR, czB); break
          case 7: addSeg(ct, czT, cxL, czB); break
          case 8: addSeg(cxL, cl, ct, czT); break
          case 9: addSeg(cxL, cl, cxR, czB); addSeg(ct, czT, cxR, cr); break
          case 10: addSeg(ct, czT, cxR, czB); break
          case 11: addSeg(ct, czT, cxR, cr); break
          case 12: addSeg(cxL, cl, cxR, cr); break
          case 13: addSeg(cxL, cl, cxR, czB); break
          case 14: addSeg(cxR, czB, cxR, cr); break
        }
      }
    }
  }
  return segments
}

function connectContourPolylines(segments: ContourSegment[], level: number, y: number): Float32Array[] {
  const segs = segments.filter(s => s.level === level)
  if (segs.length === 0) return []
  const used = new Array(segs.length).fill(false)
  const polylines: Float32Array[] = []
  const TOL = 0.003
  const dist = (x1: number, z1: number, x2: number, z2: number) => Math.hypot(x1 - x2, z1 - z2)
  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue
    used[start] = true
    const pts: number[] = [segs[start].ax, y, segs[start].az, segs[start].bx, y, segs[start].bz]
    let hx = segs[start].ax, hz = segs[start].az
    let tx = segs[start].bx, tz = segs[start].bz
    let found = true
    while (found) { found = false
      for (let j = 0; j < segs.length; j++) { if (used[j]) continue; const s = segs[j]
        if (dist(tx, tz, s.ax, s.az) < TOL) { pts.push(s.bx, y, s.bz); tx = s.bx; tz = s.bz; used[j] = true; found = true; break }
        if (dist(tx, tz, s.bx, s.bz) < TOL) { pts.push(s.ax, y, s.az); tx = s.ax; tz = s.az; used[j] = true; found = true; break }
    }}
    found = true
    while (found) { found = false
      for (let j = 0; j < segs.length; j++) { if (used[j]) continue; const s = segs[j]
        if (dist(hx, hz, s.ax, s.az) < TOL) { pts.unshift(s.bx, y, s.bz); hx = s.bx; hz = s.bz; used[j] = true; found = true; break }
        if (dist(hx, hz, s.bx, s.bz) < TOL) { pts.unshift(s.ax, y, s.az); hx = s.ax; hz = s.az; used[j] = true; found = true; break }
    }}
    if (pts.length >= 6) polylines.push(new Float32Array(pts))
  }
  return polylines
}

// ============================================================
// 场景初始化
// ============================================================
function initScene() {
  if (!container.value) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x101520)
  scene.fog = new THREE.Fog(0x101520, 6, 14)

  const aspect = container.value.clientWidth / container.value.clientHeight
  camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100)
  camera.position.set(4.2, 2.4, 5.0)
  camera.lookAt(0, 0.45, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.value.clientWidth, container.value.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  container.value.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.45, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.5
  controls.maxDistance = 10
  controls.maxPolarAngle = Math.PI / 2.05
  controls.update()
}

// ============================================================
// 构建 3D 地形
// ============================================================
function buildTerrain() {
  const { positions, colors, indices, maxHeight } = generateTerrainData()
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.08,
    side: THREE.DoubleSide,
    emissive: 0x002200,
    emissiveIntensity: 0.15,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
}

// ============================================================
// 3D 地形表面等高线 + 2D 投影
// ============================================================
function buildSlicesAndProjection() {
  const segments = generateContourSegments()
  const levels: number[] = []
  for (let l = CONTOUR_START; l <= CONTOUR_END; l += CONTOUR_INTERVAL) levels.push(l)

  // 1. 3D 地形表面等高线
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xccffaa, transparent: true, opacity: 0.5 })
  for (const level of levels) {
    const y = getDisplayHeight(level)
    const polylines = connectContourPolylines(segments, level, y)
    for (const pts of polylines) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const line = new THREE.Line(geo, lineMaterial)
      scene.add(line)
    }
  }

  // 2. 地形底部基准面（暗色）
  const basePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TERRAIN_SIZE * 1.4, TERRAIN_SIZE * 1.4),
    new THREE.MeshBasicMaterial({ color: 0x152030, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  )
  basePlane.rotation.x = -Math.PI / 2
  basePlane.position.y = -0.01
  scene.add(basePlane)

  // 3. 2D 投影面（深蓝底+方格网）
  const projPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TERRAIN_SIZE * 1.5, TERRAIN_SIZE * 1.5),
    new THREE.MeshBasicMaterial({ color: 0x162030, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  )
  projPlane.rotation.x = -Math.PI / 2
  projPlane.position.y = BASE_PLANE_Y
  scene.add(projPlane)

  const gridHelper = new THREE.GridHelper(TERRAIN_SIZE * 1.4, 14, 0x3a5a7a, 0x223344)
  gridHelper.position.y = BASE_PLANE_Y + 0.003
  scene.add(gridHelper)

  // 4. 2D 投影面上的等高线
  const projLineMat = new THREE.LineBasicMaterial({ color: 0x88ccaa, transparent: true, opacity: 0.75 })
  for (const level of levels) {
    const polylines = connectContourPolylines(segments, level, BASE_PLANE_Y + 0.005)
    for (const pts of polylines) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const line = new THREE.Line(geo, projLineMat)
      scene.add(line)
    }
  }

  // 5. 垂直投影虚线
  buildProjectionLines(segments)

  // 6. 标注
  addFeatureLabels()
  addElevationLabels(segments)
}

// ============================================================
// 投影虚线
// ============================================================
function buildProjectionLines(segments: ContourSegment[]) {
  const projected: number[] = []
  const levelMap = new Map<number, ContourSegment[]>()
  for (const s of segments) {
    if (!levelMap.has(s.level)) levelMap.set(s.level, [])
    levelMap.get(s.level)!.push(s)
  }
  const step = 24
  for (const [level, segs] of levelMap) {
    const y3D = getDisplayHeight(level)
    for (let i = 0; i < segs.length; i += step) {
      const s = segs[i]
      projected.push(s.ax, y3D, s.az, s.ax, BASE_PLANE_Y, s.az)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(projected), 3))
  const mat = new THREE.LineDashedMaterial({ color: 0x88aabb, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.45 })
  const lines = new THREE.LineSegments(geo, mat)
  lines.computeLineDistances()
  scene.add(lines)
}

// ============================================================
// 标签
// ============================================================
function addElevationLabels(segments: ContourSegment[]) {
  const leftX = -TERRAIN_SIZE / 2 - 0.4
  const levels: number[] = []
  for (let l = CONTOUR_START; l <= CONTOUR_END; l += CONTOUR_INTERVAL) levels.push(l)

  for (const level of levels) {
    const y = getDisplayHeight(level)
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(leftX + 0.08, y, 0),
      new THREE.Vector3(leftX + 0.22, y, 0),
    ])
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x88aabb }))
    scene.add(line)
    addLabel(`${level}m`, leftX + 0.12, y, 0, '#ccdee8', 'left')
  }
  addLabel('海拔（米）', leftX + 0.12, getDisplayHeight(CONTOUR_END) + 0.25, 0, '#ffffff', 'left', '14px')

  const markers: { level: number; x: number; z: number }[] = []
  for (const level of levels) {
    const polylines = connectContourPolylines(segments, level, 0)
    const all: { x: number; z: number }[] = []
    for (const pts of polylines) {
      for (let k = 0; k < pts.length; k += 3) all.push({ x: pts[k], z: pts[k + 2] })
    }
    all.sort((a, b) => a.x - b.x)
    if (all.length > 0) {
      markers.push({ level, x: all[Math.floor(all.length * 0.2)].x, z: all[Math.floor(all.length * 0.2)].z })
      if (all.length > 10) {
        markers.push({ level, x: all[Math.floor(all.length * 0.6)].x, z: all[Math.floor(all.length * 0.6)].z })
      }
    }
  }
  for (const m of markers) {
    addLabel(`${m.level}m`, m.x, BASE_PLANE_Y + 0.05, m.z, '#88ccaa', 'center', '11px', true)
  }
}

function addFeatureLabels() {
  addFeatureLabel('山顶', 0.32, 0.60, '#ff6b6b')
  addFeatureLabel('次峰', 0.70, 0.55, '#4ecdc4')
  addFeatureLabel('鞍部', 0.50, 0.52, '#f9ca24')
  addFeatureLabel('山脊', 0.48, 0.58, '#2bcbba')
  addFeatureLabel('山谷', 0.58, 0.38, '#45aaf2')
  addFeatureLabel('陡坡', 0.32, 0.26, '#fd9644')
  addFeatureLabel('缓坡', 0.82, 0.42, '#778ca3')
}

function addFeatureLabel(text: string, x: number, z: number, color: string) {
  const realH = getRealHeight(x, z)
  const displayH = getDisplayHeight(realH)
  const div = document.createElement('div')
  div.textContent = text
  div.style.color = '#fff'
  div.style.fontSize = '12px'
  div.style.fontWeight = 'bold'
  div.style.fontFamily = '"Microsoft YaHei", sans-serif'
  div.style.background = color
  div.style.padding = '2px 8px'
  div.style.borderRadius = '10px'
  div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)'
  div.style.whiteSpace = 'nowrap'
  div.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)'
  const label = new CSS2DObject(div)
  label.position.set((x - 0.5) * TERRAIN_SIZE, displayH + 0.12, (z - 0.5) * TERRAIN_SIZE)
  scene.add(label)
}

function addLabel(text: string, x: number, y: number, z: number, color: string, align: 'left' | 'center' | 'right' = 'center', fontSize = '12px', onPlane = false) {
  const div = document.createElement('div')
  div.textContent = text
  div.style.color = color
  div.style.fontSize = fontSize
  div.style.fontWeight = 'bold'
  div.style.fontFamily = '"Microsoft YaHei", sans-serif'
  div.style.background = onPlane ? 'rgba(10,20,30,0.75)' : 'transparent'
  div.style.padding = onPlane ? '1px 4px' : '0'
  div.style.borderRadius = onPlane ? '4px' : '0'
  div.style.whiteSpace = 'nowrap'
  div.style.textAlign = align
  div.style.textShadow = '0 0 3px rgba(0,0,0,0.8)'
  const label = new CSS2DObject(div)
  label.position.set(x, y, z)
  scene.add(label)
}

// ============================================================
// 灯光
// ============================================================
function setupLights() {
  scene.add(new THREE.AmbientLight(0x88aabb, 0.35))
  scene.add(new THREE.HemisphereLight(0x445566, 0x1a2a3a, 0.5))

  const sun = new THREE.DirectionalLight(0xddffee, 1.2)
  sun.position.set(3, 6, 2)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0x4466aa, 0.25)
  fill.position.set(-3, 2, -4)
  scene.add(fill)
}

// ============================================================
// 生命周期
// ============================================================
function animate() {
  controls.update()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

function handleResize() {
  if (!container.value) return
  const w = container.value.clientWidth, h = container.value.clientHeight
  camera.aspect = w / h; camera.updateProjectionMatrix()
  renderer.setSize(w, h); labelRenderer.setSize(w, h)
}

onMounted(() => { initScene(); setupLights(); buildTerrain(); buildSlicesAndProjection(); animate(); window.addEventListener('resize', handleResize) })
onUnmounted(() => {
  cancelAnimationFrame(animationId); window.removeEventListener('resize', handleResize)
  controls?.dispose(); renderer?.dispose()
  if (container.value) container.value.innerHTML = ''
})
</script>

<style scoped>
.terrain-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b0f17;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

.title-bar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  text-align: center;
  pointer-events: none;
}
.title-text {
  font-size: 18px;
  font-weight: 700;
  color: #e0f0ff;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.6);
}
.title-sub {
  font-size: 11px;
  color: #88aabb;
  letter-spacing: 1.5px;
  margin-top: 2px;
  font-weight: 400;
}

.controls-info {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(20, 30, 45, 0.88);
  border: 1px solid rgba(100, 150, 200, 0.15);
  border-radius: 20px;
  padding: 6px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  font-size: 12px;
  color: #aaccee;
  pointer-events: none;
}

.legend-panel {
  position: absolute;
  top: 64px;
  right: 16px;
  z-index: 10;
  background: rgba(20, 30, 45, 0.92);
  border: 1px solid rgba(100, 150, 200, 0.15);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.4);
  min-width: 100px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}
.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #cce0f0;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(100, 150, 200, 0.2);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #bbd0e0;
  padding: 3px 0;
}
.badge {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
