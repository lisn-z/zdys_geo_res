<template>
  <div ref="container" class="terrain-container" @click="onTerrainClick" @touchend="onTerrainTouchEnd">
    <!-- ===== 左侧控制面板 ===== -->
    <div class="control-panel">
      <div class="cp-header">
        <svg class="cp-icon" viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>
        <span>控制面板</span>
      </div>

      <!-- 等高距 -->
      <div class="cp-item">
        <span class="cp-label">等高距</span>
        <div class="cp-slider-row">
          <input type="range" class="cp-slider" :min="5" :max="50" :step="5" v-model.number="contourInterval" @input="onContourIntervalChange" />
          <span class="cp-value">{{ contourInterval }}m</span>
        </div>
      </div>

      <div class="cp-divider"></div>

      <!-- 地形标签 (山顶/山脊等特征) -->
      <div class="cp-item">
        <span class="cp-label">地形标签</span>
        <label class="cp-switch">
          <input type="checkbox" v-model="showFeatureLabels" checked @change="onToggleFeatureLabels" />
          <span class="cp-slider-toggle"></span>
        </label>
      </div>

      <!-- 地形显示 -->
      <div class="cp-item">
        <span class="cp-label">地形显示</span>
        <label class="cp-switch">
          <input type="checkbox" v-model="showTerrain" checked @change="onToggleTerrain" />
          <span class="cp-slider-toggle"></span>
        </label>
      </div>

      <!-- 地形透明 -->
      <div class="cp-item">
        <span class="cp-label">地形透明</span>
        <label class="cp-switch">
          <input type="checkbox" v-model="terrainTransparent" @change="onToggleTransparent" />
          <span class="cp-slider-toggle"></span>
        </label>
      </div>

      <div class="cp-divider"></div>

      <!-- 投影显示 -->
      <div class="cp-item">
        <span class="cp-label">投影显示</span>
        <label class="cp-switch">
          <input type="checkbox" v-model="showProjection" checked @change="onToggleProjection" />
          <span class="cp-slider-toggle"></span>
        </label>
      </div>

      <!-- 投影线 -->
      <div class="cp-item">
        <span class="cp-label">投影线</span>
        <label class="cp-switch">
          <input type="checkbox" v-model="showProjectionLines" checked @change="onToggleProjectionLines" />
          <span class="cp-slider-toggle"></span>
        </label>
      </div>

      <!-- 投影分层设色 -->
      <div class="cp-item">
        <span class="cp-label">分层设色投影</span>
        <label class="cp-switch">
          <input type="checkbox" v-model="showProjectionColoring" @change="onToggleProjectionColoring" />
          <span class="cp-slider-toggle"></span>
        </label>
      </div>

      <div class="cp-divider"></div>

      <!-- 剖面切割 -->
      <button class="cp-btn" :class="{ active: profileMode }" @click="toggleProfileMode">
        <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right:4px;vertical-align:middle"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" fill="currentColor"/></svg>
        剖面切割
      </button>
    </div>

    <!-- ===== 顶部标题 ===== -->
    <div class="title-bar">
      <div class="title-text">等高线地形图 · 三维投影</div>
      <div class="title-sub">Contour Map Projection</div>
    </div>

    <!-- ===== 操作提示 ===== -->
    <div class="controls-info">
      <span>🖱 拖拽旋转</span>
      <span>🔄 滚轮缩放</span>
      <span>✋ 右键平移</span>
    </div>

    <!-- ===== 剖面提示 ===== -->
    <div class="profile-hint" v-if="profileMode && profileClicks < 2">
      点击地形上<strong>两个点</strong>定义切割线
    </div>

    <!-- ===== 剖面图 ===== -->
    <div class="profile-chart" v-if="profileData.length > 1">
      <div class="profile-chart-header">
        <span>📊 地形剖面图</span>
        <button class="cp-close-btn" @click="clearProfile">✕</button>
      </div>
      <canvas ref="profileCanvas" width="420" height="200"></canvas>
    </div>

    <!-- ===== 图例 (左下角) ===== -->
    <div class="legend-panel">
      <div class="legend-title">地形判读</div>
      <div class="legend-grid">
        <div class="legend-item">
          <div class="legend-bar" style="background:linear-gradient(to right, #1a5c1a, #2e8b2e, #6ab04c, #d4d47a, #e8c84a, #d4a030, #c08040, #a06030, #704020, #d2c8b9, #f0eee4, #fffcf0);width:80px;height:10px;border-radius:4px"></div>
          <div class="legend-labels">
            <span>低</span>
            <span>高</span>
          </div>
        </div>
        <div class="legend-item"><span class="badge" style="background:#ff6b6b"></span>山顶</div>
        <div class="legend-item"><span class="badge" style="background:#4ecdc4"></span>次峰</div>
        <div class="legend-item"><span class="badge" style="background:#f9ca24"></span>鞍部</div>
        <div class="legend-item"><span class="badge" style="background:#2bcbba"></span>山脊</div>
        <div class="legend-item"><span class="badge" style="background:#45aaf2"></span>山谷</div>
        <div class="legend-item"><span class="badge" style="background:#fd9644"></span>陡坡</div>
        <div class="legend-item"><span class="badge" style="background:#778ca3"></span>缓坡</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'

// ============================================================
// 配置参数
// ============================================================
const GRID_SIZE = 160
const BASE_ELEVATION = 40          // 基准面海拔（米），与图中最外圈 50m 等高线匹配
const MAX_RELIEF = 110             // 最大起伏，最高峰值约 150m
const HEIGHT_SCALE = 1 / 70        // 真实米数 → 3D 显示单位
const CONTOUR_START = 50
const CONTOUR_END = 200
const BASE_PLANE_Y = -1.0
const TERRAIN_SIZE = 3.0

// ============================================================
// 响应式状态
// ============================================================
const container = ref<HTMLDivElement>()
const profileCanvas = ref<HTMLCanvasElement>()
const contourInterval = ref(10)
const showFeatureLabels = ref(true)
const showTerrain = ref(true)
const showProjection = ref(true)
const showProjectionLines = ref(true)
const terrainTransparent = ref(false)
const profileMode = ref(false)
const showProjectionColoring = ref(false)
const profileClicks = ref(0)
const profileData = ref<{ dist: number; elev: number }[]>([])

// ============================================================
// Three.js 场景变量
// ============================================================
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls
let animationId: number
let heightsData: number[][] = []
let maxHeightValue = 0

// 场景分组
let terrainGroup: THREE.Group
let contourGroup3D: THREE.Group
let projectionGroup: THREE.Group
let projectionLineGroup: THREE.Group
let projectionColoringGroup: THREE.Group
let terrainLabelGroup: THREE.Group
let featureLabelGroup: THREE.Group
let ridgeGroup: THREE.Group
let profileGroup: THREE.Group

// 地形材质引用
let terrainMaterial: THREE.MeshStandardMaterial
let terrainMesh: THREE.Mesh

// 剖切相关
let profileStart: THREE.Vector3 | null = null
let profileEnd: THREE.Vector3 | null = null
let profileLineMesh: THREE.Line | null = null
let profileEndpoints: THREE.Mesh[] = []
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const contourRes = new THREE.Vector2(window.innerWidth, window.innerHeight)
let contourDebounceTimer: number | null = null

// ============================================================
// 地形生成函数
// ============================================================
function gauss2d(x: number, z: number, cx: number, cz: number, sx: number, sz: number): number {
  return Math.exp(-((x - cx) ** 2) / (2 * sx ** 2) - ((z - cz) ** 2) / (2 * sz ** 2))
}

// ============================================================
// 分形噪声 — 增加地形表面粗糙度
// ============================================================
function hash21(px: number, pz: number): number {
  let n = Math.sin(px * 127.1 + pz * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  const a = hash21(ix, iz)
  const b = hash21(ix + 1, iz)
  const c = hash21(ix, iz + 1)
  const d = hash21(ix + 1, iz + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}

function fbm(x: number, z: number, octaves: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, z * frequency)
    amplitude *= 0.5
    frequency *= 2
  }
  return value
}

function getNormalizedHeight(x: number, z: number): number {
  const peak1 = 0.95 * gauss2d(x, z, 0.32, 0.60, 0.14, 0.16)
  const peak2 = 0.80 * gauss2d(x, z, 0.70, 0.55, 0.12, 0.14)
  const peak3 = 0.70 * gauss2d(x, z, 0.78, 0.78, 0.14, 0.14)
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
  const ridge1 = 0.32 * gauss2d(x, z, 0.48, 0.58, 0.35, 0.07)
  const ridge2 = 0.25 * gauss2d(x, z, 0.58, 0.45, 0.08, 0.30)
  const ridge3 = 0.20 * gauss2d(x, z, 0.72, 0.68, 0.08, 0.28)
  const ridge4 = 0.18 * gauss2d(x, z, 0.38, 0.42, 0.25, 0.07)
  const saddle1 = -0.26 * gauss2d(x, z, 0.50, 0.52, 0.10, 0.12)
  const saddle2 = -0.20 * gauss2d(x, z, 0.72, 0.65, 0.08, 0.10)
  const valley1 = -0.18 * gauss2d(x, z, 0.58, 0.38, 0.12, 0.10)
  const valley2 = -0.16 * gauss2d(x, z, 0.42, 0.72, 0.10, 0.12)
  const valley3 = -0.14 * gauss2d(x, z, 0.85, 0.42, 0.10, 0.14)
  const detail =
    0.10 * gauss2d(x, z, 0.18, 0.48, 0.15, 0.15) +
    0.09 * gauss2d(x, z, 0.48, 0.18, 0.14, 0.14) +
    0.08 * gauss2d(x, z, 0.88, 0.60, 0.13, 0.13) +
    0.07 * gauss2d(x, z, 0.35, 0.75, 0.12, 0.12) +
    0.06 * gauss2d(x, z, 0.65, 0.15, 0.11, 0.11)

  // 分形噪声 — 微地表细节（增强复杂度使地形更自然）
  const noiseScale = 5.5
  const noiseVal = fbm(x * noiseScale, z * noiseScale, 6) * 0.25 +
                   fbm(x * noiseScale * 2.3, z * noiseScale * 2.3, 4) * 0.08 +
                   fbm(x * noiseScale * 4.7, z * noiseScale * 4.7, 3) * 0.04

  const cliffFactor = Math.exp(-((x - 0.32) ** 2) / (2 * 0.08 ** 2))
  let cliffDrop = 0
  if (z < 0.36 && cliffFactor > 0.06) {
    const t = Math.max(0, Math.min(1, (0.36 - z) / 0.14))
    cliffDrop = -0.42 * cliffFactor * t * t
  }
  return Math.max(0, peak1 + peak2 + peak3 +
    hill1 + hill2 + hill3 + hill4 + hill5 + hill6 + hill7 + hill8 + hill9 + hill10 +
    ridge1 + ridge2 + ridge3 + ridge4 +
    saddle1 + saddle2 + valley1 + valley2 + valley3 +
    detail + noiseVal + cliffDrop + 0.04)
}

function getRealHeight(x: number, z: number): number {
  return BASE_ELEVATION + getNormalizedHeight(x, z) * MAX_RELIEF
}

function getDisplayHeight(realHeight: number): number {
  return (realHeight - BASE_ELEVATION) * HEIGHT_SCALE
}

// ============================================================
// 绿褐色系分层设色
// 深绿 → 绿 → 浅绿 → 浅黄 → 黄 → 深黄 → 浅褐 → 褐 → 深褐
// ============================================================
function getTerrainColor(t: number): { r: number; g: number; b: number } {
  const stops = [
    { pos: 0.000, r: 26 / 255,  g: 92 / 255,  b: 26 / 255  },  // 深绿
    { pos: 0.125, r: 46 / 255,  g: 139 / 255, b: 46 / 255  },  // 绿
    { pos: 0.250, r: 106 / 255, g: 176 / 255, b: 76 / 255  },  // 浅绿
    { pos: 0.375, r: 212 / 255, g: 212 / 255, b: 122 / 255 },  // 浅黄
    { pos: 0.500, r: 232 / 255, g: 200 / 255, b: 74 / 255  },  // 黄
    { pos: 0.625, r: 212 / 255, g: 160 / 255, b: 48 / 255  },  // 深黄
    { pos: 0.800, r: 210 / 255, g: 200 / 255, b: 185 / 255 },  // 灰白过渡（上移约20米，减少白色覆盖范围）
    { pos: 0.930, r: 240 / 255, g: 238 / 255, b: 228 / 255 },  // 近白
    { pos: 1.000, r: 255 / 255, g: 252 / 255, b: 240 / 255 },  // 白色（山顶）
  ]
  let lo = stops[0]
  let hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  if (!lo || !hi) { lo = stops[0]; hi = stops[stops.length - 1] }
  const f = lo.pos === hi.pos ? 0 : (t - lo.pos) / (hi.pos - lo.pos)
  return { r: lo.r + f * (hi.r - lo.r), g: lo.g + f * (hi.g - lo.g), b: lo.b + f * (hi.b - lo.b) }
}

// ============================================================
// 地形数据生成
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

// ============================================================
// 等高线
// ============================================================
interface ContourSegment { ax: number; az: number; bx: number; bz: number; level: number }

function generateContourSegments(interval: number): ContourSegment[] {
  const segments: ContourSegment[] = []
  for (let level = CONTOUR_START; level <= CONTOUR_END; level += interval) {
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
// Chaikin 曲线平滑 — 使等高线连续光滑
// ============================================================
function chaikinSmooth(points: Float32Array, iterations: number): Float32Array {
  let pts: number[] = []
  for (let i = 0; i < points.length; i += 3) {
    pts.push(points[i], points[i + 1], points[i + 2])
  }
  if (pts.length < 6) return points

  for (let iter = 0; iter < iterations; iter++) {
    const newPts: number[] = []
    for (let i = 0; i < pts.length - 3; i += 3) {
      const x0 = pts[i], y0 = pts[i + 1], z0 = pts[i + 2]
      const x1 = pts[i + 3], y1 = pts[i + 4], z1 = pts[i + 5]
      newPts.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25, z0 * 0.75 + z1 * 0.25)
      newPts.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75, z0 * 0.25 + z1 * 0.75)
    }
    pts = newPts
  }
  const result = new Float32Array(pts.length)
  result.set(pts)
  return result
}

// ============================================================
// 加粗等高线辅助 — 使用 Line2 支持 linewidth
// ============================================================
function createThickContourLine(
  pts: Float32Array,
  color: number,
  width: number,
  opacity: number,
): Line2 {
  const geo = new LineGeometry()
  geo.setPositions(Array.from(pts))
  const mat = new LineMaterial({
    color,
    linewidth: width,
    resolution: contourRes,
    transparent: true,
    opacity,
    depthTest: true,
    worldUnits: false,
    // 等高线略微前置，避免被地形遮挡
    polygonOffset: true,
    polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 1.0,
  })
  return new Line2(geo, mat)
}

function findNearestContourLevel(height: number, interval: number): number {
  const rounded = Math.round((height - CONTOUR_START) / interval) * interval + CONTOUR_START
  return Math.max(CONTOUR_START, Math.min(CONTOUR_END, rounded))
}

function extractContourSegmentNearFeature(
  segments: ContourSegment[],
  level: number,
  centerX3D: number,
  centerZ3D: number,
  pointWindow: number,
): Float32Array | null {
  const y = getDisplayHeight(level)
  const polylines = connectContourPolylines(segments, level, y)
  if (polylines.length === 0) return null

  let bestPolyline: Float32Array | null = null
  let bestIndex = -1
  let bestDist = Infinity

  for (const pts of polylines) {
    for (let i = 0; i < pts.length; i += 3) {
      const dx = pts[i] - centerX3D
      const dz = pts[i + 2] - centerZ3D
      const d = Math.hypot(dx, dz)
      if (d < bestDist) {
        bestDist = d
        bestPolyline = pts
        bestIndex = i
      }
    }
  }

  if (!bestPolyline || bestPolyline.length < 9) return null

  // 取以最近点为中心的一小段窗口
  const half = pointWindow * 3
  const start = Math.max(0, bestIndex - half)
  const end = Math.min(bestPolyline.length, bestIndex + half + 3)
  const segment = new Float32Array(end - start)
  segment.set(bestPolyline.subarray(start, end))
  return segment
}

function traceRidgeLine(segments: ContourSegment[]): Float32Array | null {
  // 山脊：取经过 ridge1 中心 (0.48, 0.58) 附近的那一段等高线，凸向低处
  const cx = 0.48, cz = 0.58
  const level = findNearestContourLevel(getRealHeight(cx, cz), contourInterval.value)
  return extractContourSegmentNearFeature(
    segments, level,
    (cx - 0.5) * TERRAIN_SIZE, (cz - 0.5) * TERRAIN_SIZE,
    12, // 窗口点数
  )
}

function traceValleyLine(segments: ContourSegment[]): Float32Array | null {
  // 山谷：取经过 valley1 中心 (0.58, 0.38) 附近的那一段等高线，凸向高处
  const cx = 0.58, cz = 0.38
  const level = findNearestContourLevel(getRealHeight(cx, cz), contourInterval.value)
  return extractContourSegmentNearFeature(
    segments, level,
    (cx - 0.5) * TERRAIN_SIZE, (cz - 0.5) * TERRAIN_SIZE,
    10,
  )
}

// ============================================================
// 场景初始化 — 更亮的灯光
// ============================================================
function initScene() {
  if (!container.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x101520)
  scene.fog = new THREE.Fog(0x101520, 8, 18)

  const aspect = container.value.clientWidth / container.value.clientHeight
  camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100)
  camera.position.set(5.0, 3.0, 6.0)
  camera.lookAt(0, 0.8, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.4
  container.value.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(container.value.clientWidth, container.value.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  container.value.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.8, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.5
  controls.maxDistance = 14
  controls.maxPolarAngle = Math.PI / 2.05
  controls.update()

  // 创建分组
  terrainGroup = new THREE.Group()
  terrainGroup.name = 'terrainGroup'
  contourGroup3D = new THREE.Group()
  contourGroup3D.name = 'contourGroup3D'
  projectionGroup = new THREE.Group()
  projectionGroup.name = 'projectionGroup'
  projectionLineGroup = new THREE.Group()
  projectionLineGroup.name = 'projectionLineGroup'
  projectionColoringGroup = new THREE.Group()
  projectionColoringGroup.name = 'projectionColoringGroup'
  terrainLabelGroup = new THREE.Group()
  terrainLabelGroup.name = 'terrainLabelGroup'
  featureLabelGroup = new THREE.Group()
  featureLabelGroup.name = 'featureLabelGroup'
  ridgeGroup = new THREE.Group()
  ridgeGroup.name = 'ridgeGroup'
  profileGroup = new THREE.Group()
  profileGroup.name = 'profileGroup'

  scene.add(terrainGroup)
  scene.add(contourGroup3D)
  scene.add(projectionGroup)
  scene.add(projectionLineGroup)
  scene.add(projectionColoringGroup)
  scene.add(terrainLabelGroup)
  scene.add(featureLabelGroup)
  scene.add(ridgeGroup)
  scene.add(profileGroup)
}

// ============================================================
// 灯光 — 整体更亮
// ============================================================
function setupLights() {
  scene.add(new THREE.AmbientLight(0x88aadd, 0.55))

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5a3a, 0.7)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xffeecc, 1.8)
  sun.position.set(4, 8, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0x4488cc, 0.5)
  fill.position.set(-3, 3, -4)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0x88ccff, 0.35)
  rim.position.set(-1, -2, -5)
  scene.add(rim)
}

// ============================================================
// 构建地形 — 粗糙度 0.92
// ============================================================
function buildTerrain() {
  // 清空分组
  while (terrainGroup.children.length) {
    const c = terrainGroup.children[0]
    c.parent?.remove(c)
    if (c instanceof THREE.Mesh) { c.geometry.dispose(); if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose() }
    if (c instanceof THREE.Line) { c.geometry.dispose(); c.material.dispose() }
  }

  const { positions, colors, indices, maxHeight } = generateTerrainData()
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0.02,
    side: THREE.DoubleSide,
    flatShading: false,
    // polygonOffset 让等高线始终在 terrain 前方渲染，背后等高线也可见
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -1.0,
  })
  terrainMesh = new THREE.Mesh(geo, terrainMaterial)
  terrainMesh.castShadow = true
  terrainMesh.receiveShadow = true
  terrainMesh.name = 'terrainMesh'
  terrainGroup.add(terrainMesh)

}

// ============================================================
// 等高线 & 投影
// ============================================================
function buildContoursAndProjection() {
  // 清空分组
  ;[contourGroup3D, projectionGroup, projectionLineGroup, projectionColoringGroup, ridgeGroup].forEach(g => {
    while (g.children.length) {
      const c = g.children[0]
      c.parent?.remove(c)
      if (c instanceof THREE.Mesh) { c.geometry.dispose(); if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose() }
      if (c instanceof THREE.Line || c instanceof THREE.LineSegments) { c.geometry.dispose(); c.material.dispose() }
    }
  })

  const interval = contourInterval.value
  const segments = generateContourSegments(interval)
  const levels: number[] = []
  for (let l = CONTOUR_START; l <= CONTOUR_END; l += interval) levels.push(l)

  const SMOOTH_ITER = 2

  // 1. 3D 地形表面等高线 — 深紫色，加粗连续
  for (const level of levels) {
    const y = getDisplayHeight(level)
    const rawPolylines = connectContourPolylines(segments, level, y)
    for (const pts of rawPolylines) {
      const smoothPts = chaikinSmooth(pts, SMOOTH_ITER)
      const thickLine = createThickContourLine(smoothPts, 0x5a0d9a, 3.0, 0.85)
      contourGroup3D.add(thickLine)
    }
  }

  // 2. 山脊线
  buildRidges(segments)

  // 2. 地形底部基准面（已移除）

  // 3. 2D 投影面
  const projPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TERRAIN_SIZE * 1.5, TERRAIN_SIZE * 1.5),
    new THREE.MeshBasicMaterial({ color: 0x162030, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
  )
  projPlane.rotation.x = -Math.PI / 2
  projPlane.position.y = BASE_PLANE_Y
  projectionGroup.add(projPlane)

  const gridHelper = new THREE.GridHelper(TERRAIN_SIZE * 1.4, 14, 0x3a5a7a, 0x223344)
  gridHelper.position.y = BASE_PLANE_Y + 0.003
  projectionGroup.add(gridHelper)

  // 4. 2D 投影等高线 — 紫红色，加粗连续
  for (const level of levels) {
    const rawPolylines = connectContourPolylines(segments, level, BASE_PLANE_Y + 0.005)
    for (const pts of rawPolylines) {
      const smoothPts = chaikinSmooth(pts, SMOOTH_ITER)
      const thickLine = createThickContourLine(smoothPts, 0x8833aa, 2.5, 0.9)
      projectionGroup.add(thickLine)
    }
  }

  // 5. 垂直投影虚线
  buildProjectionLines(segments)

  // 6. 投影分层设色
  buildProjectionColoring(segments)
}

// ============================================================
// 山脊线 & 山谷线绘制 — 紧贴地形表面
// ============================================================
function buildRidges(segments: ContourSegment[]) {
  // ---- 山脊线（红色）：取一段贴合地形的等高线，凸向低处 ----
  const ridgePts = traceRidgeLine(segments)
  if (ridgePts) {
    const ridgeLine = createThickContourLine(ridgePts, 0xff2222, 4.0, 0.95)
    ridgeGroup.add(ridgeLine)

    const projRidgePts = new Float32Array(ridgePts.length)
    for (let k = 0; k < ridgePts.length; k += 3) {
      projRidgePts[k] = ridgePts[k]
      projRidgePts[k + 1] = BASE_PLANE_Y + 0.006
      projRidgePts[k + 2] = ridgePts[k + 2]
    }
    const projRidgeLine = createThickContourLine(projRidgePts, 0xff4444, 3.0, 0.8)
    projectionGroup.add(projRidgeLine)
  }

  // ---- 山谷线（蓝色）：取一段贴合地形的等高线，凸向高处 ----
  const valleyPts = traceValleyLine(segments)
  if (valleyPts) {
    const valleyLine = createThickContourLine(valleyPts, 0x2266ff, 4.0, 0.95)
    ridgeGroup.add(valleyLine)

    const projValleyPts = new Float32Array(valleyPts.length)
    for (let k = 0; k < valleyPts.length; k += 3) {
      projValleyPts[k] = valleyPts[k]
      projValleyPts[k + 1] = BASE_PLANE_Y + 0.006
      projValleyPts[k + 2] = valleyPts[k + 2]
    }
    const projValleyLine = createThickContourLine(projValleyPts, 0x4488ff, 3.0, 0.8)
    projectionGroup.add(projValleyLine)
  }
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
  if (projected.length > 0) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(projected), 3))
    const mat = new THREE.LineDashedMaterial({ color: 0x88aabb, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.45 })
    const lines = new THREE.LineSegments(geo, mat)
    lines.computeLineDistances()
    projectionLineGroup.add(lines)
  }
}

// ============================================================
// 投影分层设色
// ============================================================
function buildProjectionColoring(segments: ContourSegment[]) {
  while (projectionColoringGroup.children.length) {
    const c = projectionColoringGroup.children[0]
    c.parent?.remove(c)
    if (c instanceof THREE.Mesh) { c.geometry.dispose(); if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose() }
  }

  const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE; i++) {
      const idx = (j * GRID_SIZE + i) * 3
      const realH = heightsData[j][i]
      const norm = (realH - BASE_ELEVATION) / (maxHeightValue - BASE_ELEVATION)
      const col = getTerrainColor(Math.max(0, Math.min(1, norm)))
      colors[idx] = col.r
      colors[idx + 1] = col.g
      colors[idx + 2] = col.b
    }
  }

  const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE; i++) {
      const idx = (j * GRID_SIZE + i) * 3
      positions[idx] = (i / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE * 1.1
      positions[idx + 1] = BASE_PLANE_Y + 0.002
      positions[idx + 2] = (j / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE * 1.1
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

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(indices)

  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  })
  const mesh = new THREE.Mesh(geo, mat)
  projectionColoringGroup.add(mesh)
}

// ============================================================
// 标签
// ============================================================
function buildLabels() {
  while (terrainLabelGroup.children.length) {
    const c = terrainLabelGroup.children[0]
    c.parent?.remove(c)
  }
  while (featureLabelGroup.children.length) {
    const c = featureLabelGroup.children[0]
    c.parent?.remove(c)
  }

  // 等高线海拔标注（侧边栏，跟随"地形显示"开关）
  addElevationLabels()
  // 地形特征标注（受"地形标签"开关控制，同时跟随"地形显示"）
  addFeatureLabels()
}

function addElevationLabels() {
  const startX = -TERRAIN_SIZE / 2 - 0.4
  const interval = contourInterval.value
  const levels: number[] = []
  for (let l = CONTOUR_START; l <= CONTOUR_END; l += interval) {
    if (l <= maxHeightValue) levels.push(l)
  }

  for (const level of levels) {
    const y = getDisplayHeight(level)
    // 文字在左侧，横线在文字右侧，避免遮挡数值
    const div = document.createElement('div')
    div.textContent = `${level}m`
    div.style.color = '#ffffff'
    div.style.fontSize = '12px'
    div.style.fontWeight = 'bold'
    div.style.fontFamily = '"Microsoft YaHei", sans-serif'
    div.style.textShadow = '0 0 3px rgba(0,0,0,0.8)'
    div.style.textAlign = 'left'
    const label = new CSS2DObject(div)
    label.position.set(startX + 0.04, y, 0)
    terrainLabelGroup.add(label)

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX + 0.14, y, 0),
      new THREE.Vector3(startX + 0.22, y, 0),
    ])
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x88aabb }))
    terrainLabelGroup.add(line)
  }

  const div = document.createElement('div')
  div.textContent = '海拔（米）'
  div.style.color = '#ffffff'
  div.style.fontSize = '14px'
  div.style.fontWeight = 'bold'
  div.style.fontFamily = '"Microsoft YaHei", sans-serif'
  div.style.textShadow = '0 0 3px rgba(0,0,0,0.8)'
  div.style.textAlign = 'left'
  const label = new CSS2DObject(div)
  label.position.set(startX + 0.04, getDisplayHeight(Math.max(...levels)) + 0.25, 0)
  terrainLabelGroup.add(label)

  // 投影面等高线海拔标注
  const segments = generateContourSegments(contourInterval.value)
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
    const div = document.createElement('div')
    div.textContent = `${m.level}m`
    div.style.color = '#ffffff'
    div.style.fontSize = '11px'
    div.style.fontWeight = 'bold'
    div.style.fontFamily = '"Microsoft YaHei", sans-serif'
    div.style.whiteSpace = 'nowrap'
    div.style.textShadow = '0 0 3px rgba(0,0,0,0.9)'
    const label = new CSS2DObject(div)
    label.position.set(m.x, BASE_PLANE_Y + 0.05, m.z)
    // 放入 projectionGroup，关闭投影时一同隐藏
    projectionGroup.add(label)
  }
}

function addFeatureLabels() {
  // 每种地形类型仅保留 1 个最典型标签，位置紧贴地形表面
  const features = [
    { text: '山顶', x: 0.78, z: 0.81, color: '#ff6b6b' },
    { text: '鞍部', x: 0.50, z: 0.52, color: '#f9ca24' },
    { text: '山脊', x: 0.48, z: 0.58, color: '#2bcbba' },
    { text: '山谷', x: 0.58, z: 0.38, color: '#45aaf2' },
    { text: '陡崖', x: 0.32, z: 0.26, color: '#fd7944' },
    { text: '陡坡', x: 0.28, z: 0.40, color: '#e67e22' },
    { text: '缓坡', x: 0.12, z: 0.50, color: '#778ca3' },
  ]
  for (const f of features) {
    const realH = getRealHeight(f.x, f.z)
    const displayH = getDisplayHeight(realH)
    const div = document.createElement('div')
    div.textContent = f.text
    div.style.color = '#fff'
    div.style.fontSize = '12px'
    div.style.fontWeight = 'bold'
    div.style.fontFamily = '"Microsoft YaHei", sans-serif'
    div.style.background = f.color
    div.style.padding = '2px 8px'
    div.style.borderRadius = '10px'
    div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)'
    div.style.whiteSpace = 'nowrap'
    div.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)'
    const label = new CSS2DObject(div)
    label.position.set((f.x - 0.5) * TERRAIN_SIZE, displayH + 0.03, (f.z - 0.5) * TERRAIN_SIZE)
    featureLabelGroup.add(label)
  }
}

function onContourIntervalChange() {
  if (contourDebounceTimer !== null) clearTimeout(contourDebounceTimer)
  contourDebounceTimer = window.setTimeout(() => {
    buildContoursAndProjection()
    buildLabels()
    contourDebounceTimer = null
  }, 150)
}

function onToggleFeatureLabels() {
  featureLabelGroup.visible = showFeatureLabels.value && showTerrain.value
}

function onToggleTerrain() {
  const visible = showTerrain.value
  terrainGroup.visible = visible
  contourGroup3D.visible = visible
  ridgeGroup.visible = visible
  terrainLabelGroup.visible = visible
  // 特征标签也跟随地形显示：地形关闭时隐藏，地形开启时由开关决定
  featureLabelGroup.visible = visible && showFeatureLabels.value
}

function onToggleTransparent() {
  if (terrainTransparent.value) {
    terrainMaterial.transparent = true
    terrainMaterial.opacity = 0.12
    terrainMaterial.color.setHex(0x88ccaa)
    terrainMaterial.vertexColors = false
  } else {
    terrainMaterial.transparent = false
    terrainMaterial.opacity = 1
    terrainMaterial.vertexColors = true
  }
  terrainMaterial.needsUpdate = true
}

function onToggleProjection() {
  projectionGroup.visible = showProjection.value
  projectionLineGroup.visible = showProjection.value && showProjectionLines.value
  projectionColoringGroup.visible = showProjection.value && showProjectionColoring.value
}

function onToggleProjectionLines() {
  projectionLineGroup.visible = showProjectionLines.value && showProjection.value
}

function onToggleProjectionColoring() {
  projectionColoringGroup.visible = showProjectionColoring.value && showProjection.value
}

function toggleProfileMode() {
  profileMode.value = !profileMode.value
  if (!profileMode.value) {
    clearProfile()
  }
  controls.enabled = !profileMode.value
}

function clearProfile() {
  profileClicks.value = 0
  profileData.value = []
  profileStart = null
  profileEnd = null

  // 移除3D剖切线
  while (profileGroup.children.length) {
    const c = profileGroup.children[0]
    c.parent?.remove(c)
    if (c instanceof THREE.Mesh || c instanceof THREE.Line) {
      c.geometry?.dispose()
      if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
      else c.material?.dispose()
    }
  }
  profileLineMesh = null
  profileEndpoints = []
}

// ============================================================
// 剖面切割 — 地形点击（支持移动端 Touch）
// ============================================================
function onTerrainTouchEnd(event: TouchEvent) {
  // 模拟 click 用于移动端触控
  if (!profileMode.value || !terrainMesh || !container.value) return
  const touch = event.changedTouches[0]
  if (!touch) return
  const mouseEvent = new MouseEvent('click', {
    clientX: touch.clientX,
    clientY: touch.clientY,
  })
  onTerrainClick(mouseEvent)
}

function onTerrainClick(event: MouseEvent) {
  if (!profileMode.value || !terrainMesh || !container.value) return
  if (profileClicks.value >= 2) {
    clearProfile()
  }

  const rect = container.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(terrainMesh, false)
  if (intersects.length === 0) return

  const point = intersects[0].point.clone()

  if (profileClicks.value === 0) {
    profileStart = point
    profileClicks.value = 1
    // Add endpoint marker
    addProfileEndpoint(point, 0x2ec4b6)

    // Add elevation label at start point
    addProfilePointLabel(`${getRealHeightAtPoint(point).toFixed(0)}m`, point, '#2ec4b6')
  } else if (profileClicks.value === 1) {
    profileEnd = point
    profileClicks.value = 2
    addProfileEndpoint(point, 0x247cff)
    addProfilePointLabel(`${getRealHeightAtPoint(point).toFixed(0)}m`, point, '#247cff')

    // Draw profile line
    drawProfileLine()
    // Compute and display profile data
    computeProfile()
  }
}

function addProfileEndpoint(point: THREE.Vector3, color: number) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 12, 12),
    new THREE.MeshBasicMaterial({ color })
  )
  sphere.position.copy(point)
  profileGroup.add(sphere)
  profileEndpoints.push(sphere)
}

function addProfilePointLabel(text: string, point: THREE.Vector3, color: string) {
  const div = document.createElement('div')
  div.textContent = text
  div.style.color = '#fff'
  div.style.fontSize = '11px'
  div.style.fontWeight = 'bold'
  div.style.fontFamily = '"Microsoft YaHei", sans-serif'
  div.style.background = color
  div.style.padding = '1px 6px'
  div.style.borderRadius = '8px'
  div.style.boxShadow = '0 1px 6px rgba(0,0,0,0.5)'
  div.style.whiteSpace = 'nowrap'
  const label = new CSS2DObject(div)
  label.position.set(point.x, point.y + 0.15, point.z)
  profileGroup.add(label)
}

function drawProfileLine() {
  if (!profileStart || !profileEnd) return
  const points = [profileStart.clone(), profileEnd.clone()]
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: 0x2ec4b6, linewidth: 2 })
  profileLineMesh = new THREE.Line(geo, mat)
  profileGroup.add(profileLineMesh)

  // Add dashed vertical lines from line to base
  const dashPoints: number[] = []
  const numSamples = 20
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const px = profileStart.x + (profileEnd.x - profileStart.x) * t
    const pz = profileStart.z + (profileEnd.z - profileStart.z) * t
    const py = profileStart.y + (profileEnd.y - profileStart.y) * t
    dashPoints.push(px, py, pz)
    dashPoints.push(px, BASE_PLANE_Y, pz)
  }
  const dashGeo = new THREE.BufferGeometry()
  dashGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dashPoints), 3))
  const dashMat = new THREE.LineDashedMaterial({
    color: 0x2ec4b6,
    dashSize: 0.03,
    gapSize: 0.03,
    transparent: true,
    opacity: 0.3,
  })
  const dashes = new THREE.LineSegments(dashGeo, dashMat)
  dashes.computeLineDistances()
  profileGroup.add(dashes)
}

function getRealHeightAtPoint(point: THREE.Vector3): number {
  // Convert 3D position back to normalized coordinates
  const nx = point.x / TERRAIN_SIZE + 0.5
  const nz = point.z / TERRAIN_SIZE + 0.5
  // Bilinear interpolation
  const gi = nx * (GRID_SIZE - 1)
  const gj = nz * (GRID_SIZE - 1)
  const i0 = Math.max(0, Math.min(GRID_SIZE - 2, Math.floor(gi)))
  const j0 = Math.max(0, Math.min(GRID_SIZE - 2, Math.floor(gj)))
  const fi = gi - i0
  const fj = gj - j0

  if (i0 >= heightsData[0]?.length || j0 >= heightsData.length) {
    return BASE_ELEVATION
  }
  const h00 = heightsData[j0][i0]
  const h10 = heightsData[j0][Math.min(i0 + 1, GRID_SIZE - 1)]
  const h01 = heightsData[Math.min(j0 + 1, GRID_SIZE - 1)][i0]
  const h11 = heightsData[Math.min(j0 + 1, GRID_SIZE - 1)][Math.min(i0 + 1, GRID_SIZE - 1)]

  return h00 * (1 - fi) * (1 - fj) + h10 * fi * (1 - fj) + h01 * (1 - fi) * fj + h11 * fi * fj
}

function computeProfile() {
  if (!profileStart || !profileEnd) return

  const numSamples = 100
  const data: { dist: number; elev: number }[] = []

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const px = profileStart.x + (profileEnd.x - profileStart.x) * t
    const pz = profileStart.z + (profileEnd.z - profileStart.z) * t
    const py = profileStart.y + (profileEnd.y - profileStart.y) * t

    const dist = profileStart.distanceTo(new THREE.Vector3(px, py, pz))
    const elev = getRealHeightAtPoint(new THREE.Vector3(px, py, pz))

    data.push({ dist, elev })
  }

  profileData.value = data

  nextTick(() => drawProfileChart())
}

// ============================================================
// 绘制剖面图
// ============================================================
function drawProfileChart() {
  const canvas = profileCanvas.value
  if (!canvas || profileData.value.length < 2) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  const pad = { top: 20, bottom: 25, left: 50, right: 20 }

  const data = profileData.value
  const minElev = Math.floor(Math.min(...data.map(d => d.elev)) - 1)
  const maxElev = Math.ceil(Math.max(...data.map(d => d.elev)) + 1)
  const maxDist = data[data.length - 1].dist

  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom

  const xScale = (d: number) => pad.left + (d / maxDist) * chartW
  const yScale = (e: number) => pad.top + chartH - ((e - minElev) / (maxElev - minElev)) * chartH

  // Clear
  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = 'rgba(10, 18, 30, 0.92)'
  ctx.roundRect ? ctx.roundRect(0, 0, W, H, 6) : ctx.rect(0, 0, W, H)
  ctx.fill()

  // Grid lines — 根据高程范围自动选择合适的刻度间隔
  const elevRange = maxElev - minElev
  const yStep = elevRange > 60 ? 10 : elevRange > 30 ? 5 : elevRange > 15 ? 3 : 2
  ctx.strokeStyle = 'rgba(46, 196, 182, 0.15)'
  ctx.lineWidth = 0.5
  for (let e = minElev; e <= maxElev; e += yStep) {
    const y = yScale(e)
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(W - pad.right, y)
    ctx.stroke()
  }
  for (let d = 0; d <= maxDist; d += 0.2) {
    const x = xScale(d)
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, H - pad.bottom)
    ctx.stroke()
  }

  // Y-axis labels
  ctx.fillStyle = '#8ab4c8'
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'right'
  for (let e = minElev; e <= maxElev; e += yStep) {
    const y = yScale(e)
    ctx.fillText(`${e}m`, pad.left - 5, y + 3)
  }

  // X-axis labels
  ctx.textAlign = 'center'
  for (let d = 0; d <= maxDist; d += 0.2) {
    const x = xScale(d)
    ctx.fillText(`${d.toFixed(1)}`, x, H - 5)
  }

  // Axis labels
  ctx.fillStyle = '#8ab4c8'
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('距离', W / 2, H - 2)
  ctx.save()
  ctx.translate(12, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('海拔', 0, 0)
  ctx.restore()

  // Fill area
  ctx.beginPath()
  ctx.moveTo(xScale(data[0].dist), H - pad.bottom)
  for (const pt of data) {
    ctx.lineTo(xScale(pt.dist), yScale(pt.elev))
  }
  ctx.lineTo(xScale(data[data.length - 1].dist), H - pad.bottom)
  ctx.closePath()

  const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom)
  gradient.addColorStop(0, 'rgba(46, 196, 182, 0.4)')
  gradient.addColorStop(0.5, 'rgba(36, 124, 255, 0.25)')
  gradient.addColorStop(1, 'rgba(46, 196, 182, 0.05)')
  ctx.fillStyle = gradient
  ctx.fill()

  // Profile line
  ctx.beginPath()
  ctx.moveTo(xScale(data[0].dist), yScale(data[0].elev))
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(xScale(data[i].dist), yScale(data[i].elev))
  }
  ctx.strokeStyle = '#2ec4b6'
  ctx.lineWidth = 2
  ctx.stroke()

  // Start/end markers
  ctx.beginPath()
  ctx.arc(xScale(data[0].dist), yScale(data[0].elev), 3, 0, Math.PI * 2)
  ctx.fillStyle = '#2ec4b6'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(xScale(data[data.length - 1].dist), yScale(data[data.length - 1].elev), 3, 0, Math.PI * 2)
  ctx.fillStyle = '#247cff'
  ctx.fill()

  // Elevation labels
  ctx.fillStyle = '#fff'
  ctx.font = '10px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`${data[0].elev.toFixed(1)}m`, xScale(data[0].dist) + 4, yScale(data[0].elev) - 2)
  ctx.textAlign = 'right'
  ctx.fillText(`${data[data.length - 1].elev.toFixed(1)}m`, xScale(data[data.length - 1].dist) - 4, yScale(data[data.length - 1].elev) - 2)
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
  contourRes.set(w, h)
}

onMounted(() => {
  initScene()
  setupLights()
  buildTerrain()
  buildContoursAndProjection()
  buildLabels()
  if (container.value) {
    contourRes.set(container.value.clientWidth, container.value.clientHeight)
  }
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  controls?.dispose()
  renderer?.dispose()
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
  touch-action: none;
}

/* ================================================================
   左侧控制面板
   ================================================================ */
.control-panel {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 30;
  background: rgba(8, 16, 30, 0.92);
  border: 1px solid rgba(46, 196, 182, 0.25);
  border-radius: 12px;
  padding: 14px 16px;
  min-width: 190px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5),
    inset 0 0 60px rgba(46, 196, 182, 0.03);
  backdrop-filter: blur(8px);
  user-select: none;
}

.cp-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #2ec4b6;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(46, 196, 182, 0.2);
}

.cp-icon {
  color: #2ec4b6;
  flex-shrink: 0;
}

.cp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.cp-label {
  font-size: 12px;
  color: #b0c8e0;
  flex-shrink: 0;
}

.cp-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 72px;
  height: 4px;
  background: linear-gradient(to right, #2ec4b6, #247cff);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.cp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #2ec4b6, #1a9a8e);
  cursor: pointer;
  box-shadow: 0 0 6px rgba(46, 196, 182, 0.5);
}

.cp-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #2ec4b6, #1a9a8e);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 6px rgba(46, 196, 182, 0.5);
}

.cp-value {
  font-size: 11px;
  font-weight: 600;
  color: #2ec4b6;
  min-width: 30px;
  text-align: right;
}

.cp-divider {
  height: 1px;
  background: linear-gradient(to right, rgba(46, 196, 182, 0.15), rgba(36, 124, 255, 0.15));
  margin: 4px 0;
}

/* Toggle switch */
.cp-switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
}

.cp-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.cp-slider-toggle {
  position: absolute;
  inset: 0;
  background: rgba(60, 80, 110, 0.5);
  border-radius: 20px;
  transition: all 0.25s ease;
  border: 1px solid rgba(100, 140, 180, 0.2);
}

.cp-slider-toggle::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 2px;
  bottom: 2px;
  background: #8899b0;
  border-radius: 50%;
  transition: all 0.25s ease;
}

.cp-switch input:checked + .cp-slider-toggle {
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  border-color: rgba(46, 196, 182, 0.4);
}

.cp-switch input:checked + .cp-slider-toggle::before {
  transform: translateX(16px);
  background: #fff;
  box-shadow: 0 0 6px rgba(46, 196, 182, 0.4);
}

/* 剖面按钮 */
.cp-btn {
  width: 100%;
  margin-top: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #b0c8e0;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cp-btn:hover {
  background: rgba(46, 196, 182, 0.18);
  border-color: rgba(46, 196, 182, 0.4);
  color: #d0e8f8;
}

.cp-btn.active {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.25), rgba(36, 124, 255, 0.25));
  border-color: #2ec4b6;
  color: #2ec4b6;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.2);
}

/* ================================================================
   顶部标题
   ================================================================ */
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
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.title-sub {
  font-size: 11px;
  color: #88aabb;
  letter-spacing: 1.5px;
  margin-top: 2px;
  font-weight: 400;
}

/* ================================================================
   操作提示
   ================================================================ */
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

/* ================================================================
   图例 (左下角)
   ================================================================ */
.legend-panel {
  position: absolute;
  bottom: 60px;
  left: 16px;
  z-index: 10;
  background: rgba(8, 16, 30, 0.92);
  border: 1px solid rgba(46, 196, 182, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.4);
  min-width: 120px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.legend-title {
  font-size: 13px;
  font-weight: 700;
  color: #2ec4b6;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(46, 196, 182, 0.2);
}

.legend-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #bbd0e0;
  padding: 2px 0;
}

.legend-bar {
  display: inline-block;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  width: 50px;
  font-size: 9px;
  color: #8aa0b8;
  margin-top: 1px;
}

.badge {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ================================================================
   剖面提示
   ================================================================ */
.profile-hint {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  background: rgba(8, 16, 30, 0.92);
  border: 1px solid #2ec4b6;
  border-radius: 10px;
  padding: 8px 18px;
  color: #2ec4b6;
  font-size: 13px;
  box-shadow: 0 0 20px rgba(46, 196, 182, 0.2);
  pointer-events: none;
}

.profile-hint strong {
  color: #fff;
}

/* ================================================================
   剖面图
   ================================================================ */
.profile-chart {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(46, 196, 182, 0.25);
}

.profile-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(8, 16, 30, 0.95);
  font-size: 12px;
  font-weight: 600;
  color: #2ec4b6;
  border-bottom: 1px solid rgba(46, 196, 182, 0.15);
}

.cp-close-btn {
  background: none;
  border: none;
  color: #6a8aa8;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  transition: color 0.2s;
}

.cp-close-btn:hover {
  color: #ff6b6b;
}

.profile-chart canvas {
  display: block;
  max-width: 100%;
}

/* ================================================================
   移动端 / 平板端适配
   ================================================================ */

/* 平板端 (< 1024px) */
@media (max-width: 1024px) {
  .control-panel {
    top: 10px;
    left: 10px;
    padding: 10px 12px;
    min-width: 160px;
  }

  .cp-header {
    font-size: 13px;
    margin-bottom: 10px;
    padding-bottom: 6px;
  }

  .cp-label {
    font-size: 11px;
  }

  .cp-slider {
    width: 56px;
  }

  .title-text {
    font-size: 15px;
  }

  .title-sub {
    font-size: 10px;
  }

  .legend-panel {
    padding: 10px 12px;
    min-width: 100px;
  }

  .legend-title {
    font-size: 12px;
  }

  .legend-item {
    font-size: 10px;
  }

  .controls-info {
    font-size: 10px;
    padding: 5px 14px;
    gap: 10px;
  }

  .profile-chart canvas {
    width: 320px;
    height: 160px;
  }
}

/* 手机端 (< 768px) */
@media (max-width: 768px) {
  .control-panel {
    top: 8px;
    left: 8px;
    padding: 8px 10px;
    min-width: 140px;
    border-radius: 8px;
  }

  .cp-header {
    font-size: 12px;
    margin-bottom: 8px;
    padding-bottom: 5px;
  }

  .cp-header svg {
    width: 14px;
    height: 14px;
  }

  .cp-item {
    padding: 4px 0;
  }

  .cp-label {
    font-size: 10px;
  }

  .cp-slider {
    width: 44px;
    height: 3px;
  }

  .cp-slider::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
  }

  .cp-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
  }

  .cp-value {
    font-size: 10px;
    min-width: 24px;
  }

  .cp-switch {
    width: 30px;
    height: 17px;
  }

  .cp-slider-toggle::before {
    width: 11px;
    height: 11px;
    left: 2px;
    bottom: 2px;
  }

  .cp-switch input:checked + .cp-slider-toggle::before {
    transform: translateX(13px);
  }

  .cp-btn {
    font-size: 10px;
    padding: 5px 8px;
  }

  .cp-btn svg {
    width: 12px;
    height: 12px;
  }

  .title-bar {
    top: 8px;
  }

  .title-text {
    font-size: 13px;
    letter-spacing: 1px;
  }

  .title-sub {
    font-size: 9px;
    letter-spacing: 1px;
  }

  .legend-panel {
    bottom: 52px;
    left: 8px;
    padding: 8px 10px;
    min-width: 88px;
  }

  .legend-title {
    font-size: 11px;
    margin-bottom: 5px;
  }

  .legend-item {
    font-size: 9px;
    padding: 1px 0;
  }

  .legend-bar {
    width: 36px !important;
    height: 6px !important;
  }

  .legend-labels {
    width: 36px;
    font-size: 8px;
  }

  .badge {
    width: 8px;
    height: 8px;
  }

  .controls-info {
    font-size: 9px;
    padding: 4px 10px;
    gap: 6px;
    bottom: 14px;
    border-radius: 14px;
  }

  .profile-chart {
    bottom: 48px;
  }

  .profile-chart canvas {
    width: 260px;
    height: 130px;
  }

  .profile-chart-header {
    font-size: 10px;
    padding: 4px 10px;
  }

  .profile-hint {
    font-size: 11px;
    padding: 6px 14px;
    top: 68px;
  }
}

/* 小屏手机 (< 480px) */
@media (max-width: 480px) {
  .control-panel {
    min-width: 120px;
    padding: 6px 8px;
  }

  .cp-header {
    font-size: 10px;
  }

  .cp-label {
    font-size: 9px;
  }

  .cp-slider {
    width: 36px;
  }

  .title-text {
    font-size: 11px;
  }

  .title-sub {
    font-size: 8px;
  }

  .profile-chart canvas {
    width: 220px;
    height: 110px;
  }

  .controls-info span:nth-child(3) {
    display: none;
  }
}
</style>
