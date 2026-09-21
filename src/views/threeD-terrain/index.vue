<!-- TerrainProjection_v7：修正独立山谷纵坡；三角网格逐段校验河道；统一 Shader 下坡流向 -->
<template>
  <div ref="pageRef" class="terrain-projection-template geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">等高线地形图 · 三维投影</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="startLearning">
          地形判读
        </button>

        <button type="button" class="theme-btn toolbar-btn" @click="setView('front')">
          前视图
        </button>

        <button type="button" class="theme-btn toolbar-btn" @click="togglePanelsVisibility">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section v-show="panelsVisible && !learningMode" class="timeline-dock terrain-control-dock">
        <div class="dock-row dock-row-top">
          <div class="dock-group dock-slider-group">
            <span class="dock-item-label">等高距</span>
            <el-slider v-model="contourInterval" :min="5" :max="50" :step="5" :show-tooltip="false"
              @input="onContourIntervalChange" />
            <strong class="dock-item-value">{{ contourInterval }}m</strong>
          </div>

          <div class="dock-group dock-generate-group">
            <span class="dock-item-label">地形生成</span>
            <el-select v-model="terrainGenType" class="theme-select terrain-type-select terrain-type-select-wide"
              popper-class="geo-select-popper geo-select-popper-dark" placeholder="地形类型"
              @change="generateRandomTerrain">
              <el-option label="全部" value="all" />
              <el-option label="山顶" value="peak" />
              <el-option label="鞍部" value="saddle" />
              <el-option label="山脊" value="ridge" />
              <el-option label="山谷" value="valley" />
              <el-option label="陡崖" value="cliff" />
              <el-option label="陡坡" value="steep" />
              <el-option label="缓坡" value="gentle" />
              <el-option label="盆地" value="basin" />
            </el-select>
          </div>
        </div>

        <div class="dock-row dock-row-bottom">
          <div class="dock-switches-group">
            <div class="dock-switch-item">
              <span>地形标签</span>
              <el-switch v-model="showFeatureLabels" @change="onToggleFeatureLabels" />
            </div>
            <div class="dock-switch-item">
              <span>山脊线</span>
              <el-switch v-model="showRidgeLines" @change="onToggleRidgeLines" />
            </div>
            <div class="dock-switch-item">
              <span>河流带</span>
              <el-switch v-model="showValleyRiver" @change="onToggleValleyRiver" />
            </div>
            <div class="dock-switch-item">
              <span>地形显示</span>
              <el-switch v-model="showTerrain" @change="onToggleTerrain" />
            </div>
            <div class="dock-switch-item">
              <span>地形透明</span>
              <el-switch v-model="terrainTransparent" @change="onToggleTransparent" />
            </div>
            <div class="dock-switch-item">
              <span>投影显示</span>
              <el-switch v-model="showProjection" @change="onToggleProjection" />
            </div>
            <div class="dock-switch-item">
              <span>投影线</span>
              <el-switch v-model="showProjectionLines" @change="onToggleProjectionLines" />
            </div>
            <div class="dock-switch-item">
              <span>分层设色</span>
              <el-switch v-model="showProjectionColoring" @change="onToggleProjectionColoring" />
            </div>
            <div class="dock-switch-item" :class="{ 'dock-switch-active': profileMode }">
              <span>剖面切割</span>
              <el-switch v-model="profileMode" @change="toggleProfileMode" />
            </div>
          </div>
        </div>
      </section>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host terrain-scene-host" @click="onTerrainClick"
            @touchend="onTerrainTouchEnd"></div>

          <div class="terrain-scene-overlay">
            <div v-if="showRidgeLines && !learningMode && ['all', 'ridge', 'saddle'].includes(terrainGenType)"
              class="ridge-line-legend">
              <i></i><span>山脊线</span>
            </div>
            <!--             <div ref="viewCube" class="view-cube">
              <div class="vc-face vc-face-front" data-view="front" title="前视图">
                前
              </div>
              <div class="vc-face vc-face-back" data-view="back" title="后视图">
                后
              </div>
              <div class="vc-face vc-face-right" data-view="right" title="右视图">
                右
              </div>
              <div class="vc-face vc-face-left" data-view="left" title="左视图">
                左
              </div>
              <div class="vc-face vc-face-top" data-view="top" title="顶视图">
                顶
              </div>
              <div class="vc-face vc-face-bottom" data-view="bottom" title="底视图">
                底
              </div>
            </div> -->


            <div v-if="profileMode && profileClicks < 2" class="profile-hint">
              点击地形上
              <strong>两个点</strong>
              定义切割线
            </div>

            <div v-if="profileData.length > 1" class="profile-chart">
              <div class="profile-chart-header">
                <span>地形剖面图</span>

                <button type="button" class="profile-close-btn" @click="clearProfile">
                  ✕
                </button>
              </div>

              <canvas ref="profileCanvas" width="640" height="300"></canvas>
            </div>
          </div>
        </div>
      </section>

      <FloatingFeatureCard v-show="panelsVisible && !learningMode"
        class="terrain-stack-floating-card terrain-ref-floating-card" title="判读参考" subtitle="状态与知识要点" variant="data"
        :initial-top="152" :initial-right="18" :bottom-inset="12" v-model:collapsed="refCardCollapsed" :resizable="true"
        :min-width="330" :min-height="220">
        <div class="terrain-ref-content">
          <div class="terrain-status-grid">
            <div class="terrain-status-metric cyan-card">
              <span>等高距</span>
              <strong>{{ contourInterval }}m</strong>
            </div>
            <div class="terrain-status-metric blue-card">
              <span>地形类型</span>
              <strong>{{ terrainGenType }}</strong>
            </div>
            <div class="terrain-status-metric purple-card">
              <span>投影线</span>
              <strong>{{ showProjectionLines ? '显示' : '隐藏' }}</strong>
            </div>
            <div class="terrain-status-metric orange-card">
              <span>剖面状态</span>
              <strong>{{ profileMode ? '切割中' : '未开启' }}</strong>
            </div>
          </div>

          <section class="terrain-ref-section">
            <h4 class="terrain-ref-heading">基本地形部位</h4>
            <div class="terrain-floating-copy terrain-knowledge">
              <p><strong>山顶：</strong>闭合等高线，内高外低，常标海拔。</p>
              <p><strong>鞍部：</strong>两峰之间低凹部位，比两侧山顶低。</p>
              <p><strong>山脊：</strong>分水岭，等高线向低处凸出。</p>
              <p><strong>山谷：</strong>集水线，等高线向高处凸出，常发育河流。</p>
              <p><strong>盆地：</strong>四周较高、中间较低。本示例为闭合盆地，内部等高线由外向内降低，短示坡线指向低处。</p>
            </div>
          </section>

          <section class="terrain-ref-section">
            <h4 class="terrain-ref-heading">坡度与设色</h4>
            <div class="terrain-floating-copy terrain-knowledge">
              <p><strong>陡崖：</strong>崖壁近于直立；俯视时等高线高度密集，理想直立崖壁处可重合。仅凭线密不能与陡坡混同。</p>
              <p><strong>陡坡：</strong>等高线密集，坡度较大。</p>
              <p><strong>缓坡：</strong>等高线稀疏，坡度较小。</p>
              <p><strong>分层设色：</strong>颜色由绿色逐渐过渡到黄褐色和高处浅色。</p>
            </div>
          </section>

          <section class="terrain-ref-section">
            <h4 class="terrain-ref-heading">剖面图使用</h4>
            <div class="terrain-floating-copy terrain-knowledge">
              <p>开启剖面切割后，在地形上点击两个点，即可生成两点之间的海拔变化曲线。</p>
              <p>剖面图可以帮助学生理解地形起伏、坡度变化和等高线疏密之间的关系。</p>
            </div>
          </section>
        </div>
      </FloatingFeatureCard>


    </main>

    <!-- 地形判读学习模块 (独立于 workspace，避免交互冲突) -->
    <div v-if="learningMode" class="quiz-overlay">
      <div class="quiz-panel">
        <div class="quiz-header">
          <div class="quiz-title">📚 地形判读学习</div>
          <div class="quiz-subtitle">请根据下方的 3D 地形和投影等高线判读属于哪种地形</div>
        </div>
        <div class="quiz-content">
          <div class="quiz-options">
            <button v-for="opt in quizOptions" :key="opt" type="button" class="quiz-option" :class="getOptionClass(opt)"
              :disabled="quizResult !== null" @click="onQuizAnswer(opt)">
              {{ opt }}
            </button>
          </div>
          <div v-if="quizResult" class="quiz-feedback">
            <span v-if="quizResult === 'correct'" class="feedback-correct">✓ 回答正确！</span>
            <span v-else class="feedback-wrong">✗ 回答错误，正确答案是：<b>{{ currentQuizType }}</b></span>
          </div>
        </div>
        <div class="quiz-actions">
          <button type="button" class="quiz-btn quiz-btn-next" @click="nextQuiz" :disabled="!quizResult">
            {{ quizResult ? '下一题 →' : '请先回答' }}
          </button>
          <button type="button" class="quiz-btn quiz-btn-end" @click="endLearning">
            结束学习
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'

/*
 * 公共模板样式已内置悬浮面板、平板宽度与触控拖拽规则。
 */
import '@/styles/geo-page-template.css'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'

// ============================================================
// 配置参数
// ============================================================
// 128×128 高度场，三角面求交等高线与贴地山脊线使用同一套采样数据。
const GRID_SIZE = 128
const MAX_RENDER_DPR = 1.5
const PROJECTION_LINE_SAMPLE_STEP = 96
const VERTICAL_RENDER_COSINE = Math.cos(THREE.MathUtils.degToRad(18))
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
const threeContainerRef = ref<HTMLDivElement | null>(null)
const profileCanvas = ref<HTMLCanvasElement | null>(null)
const viewCube = ref<HTMLDivElement | null>(null)
const contourInterval = ref(5)
const showFeatureLabels = ref(true)
const showRidgeLines = ref(true)
const uiScale = ref(1)  // 整体 UI 缩放系数（根据分辨率自动调节）
const showTerrain = ref(true)
const showProjection = ref(true)
const showProjectionLines = ref(true)
const terrainTransparent = ref(false)
const profileMode = ref(false)
const showProjectionColoring = ref(true)
const showValleyRiver = ref(true)
const profileClicks = ref(0)
const profileData = ref<{ dist: number; elev: number }[]>([])
const terrainGenType = ref('all')
const generatingTerrain = ref(false)
const panelsVisible = ref(true)
const refCardCollapsed = ref(true)

function togglePanelsVisibility() {
  panelsVisible.value = !panelsVisible.value
}

// ============================================================
// 地形判读学习模块
// ============================================================
const learningMode = ref(false)
const currentQuizType = ref<string>('')
const quizResult = ref<'correct' | 'wrong' | null>(null)
const lastAnswer = ref<string | null>(null)
const quizOptions = ['山峰', '盆地', '山谷', '山脊', '陡崖', '鞍部']
const QUIZ_TYPES = ['peak', 'basin', 'valley', 'ridge', 'cliff', 'saddle']
let savedTerrainGenType = ''  // 进入学习前保存原类型
let savedHeightValue = 0
let savedHeightsData: number[][] = []
type TerrainFeaturePosition = { x: number; z: number }
const DEFAULT_FEATURE_POSITIONS: Record<string, TerrainFeaturePosition> = {
  peak: { x: 0.78, z: 0.78 },
  saddle: { x: 0.50, z: 0.52 },
  ridge: { x: 0.48, z: 0.58 },
  valley: { x: 0.58, z: 0.38 },
  cliff: { x: 0.32, z: 0.26 },
  steep: { x: 0.28, z: 0.40 },
  gentle: { x: 0.12, z: 0.50 },
  basin: { x: 0.18, z: 0.18 },
}
let currentFeaturePositions: Record<string, TerrainFeaturePosition> =
  Object.fromEntries(
    Object.entries(DEFAULT_FEATURE_POSITIONS).map(([type, position]) => [type, { ...position }])
  )
let savedFeaturePositions: Record<string, TerrainFeaturePosition> = {}
let currentTerrainParams = { cx: 0.5, cz: 0.5 }
let savedTerrainParams = { ...currentTerrainParams }

type BasinParameters = {
  cx: number; cz: number; rx: number; rz: number; floor: number; rim: number
}
const DEFAULT_BASIN: BasinParameters = {
  cx: 0.18, cz: 0.18, rx: 0.145, rz: 0.13, floor: 0.11, rim: 0.33,
}
function getActiveBasin(): BasinParameters | null {
  if (terrainGenType.value === 'all') return DEFAULT_BASIN
  if (terrainGenType.value === 'basin') return {
    ...currentTerrainParams, rx: 0.22, rz: 0.20, floor: 0.12, rim: 0.54,
  }
  return null
}

const hasLeftPanel = false
const hasRightPanel = false

let sceneResizeObserver:
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

/*
 * 公共 Hook 继续负责页面断点与浏览器连续缩放状态；
 * 具体控制区已经改为 FloatingFeatureCard，不再启用 aside 面板。
 */
const {
  rootRef: pageRef,
  layoutMode,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
    resizable: true,
  },

  right: {
    enabled: hasRightPanel,
    resizable: true,
  },

  onLayoutChange(state) {
    /*
     * 面板拖拽和浏览器连续缩放期间，
     * 不重建 WebGL / CSS2D drawing buffer。
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


// ============================================================
// Three.js 场景变量
// ============================================================
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let labelRenderer: CSS2DRenderer
let controls: OrbitControls
let animationId: number
let cameraInteractionActive = false
let sceneRenderDirty = true
let lastSceneRenderTime = 0
const viewCubeCameraOffset = new THREE.Vector3()
let lastViewCubeTransform = ''
let heightsData: number[][] = []
let maxHeightValue = 0

function invalidateTerrainShadow() {
  if (renderer?.shadowMap) renderer.shadowMap.needsUpdate = true
  invalidateSceneRender()
}

function invalidateSceneRender() {
  sceneRenderDirty = true
}

// 场景分组
let terrainGroup: THREE.Group
let contourGroup3D: THREE.Group
let projectionGroup: THREE.Group
let projectionLineGroup: THREE.Group
let projectionColoringGroup: THREE.Group
let terrainLabelGroup: THREE.Group
let featureLabelGroup: THREE.Group
let profileGroup: THREE.Group
let ridgeGroup3D: THREE.Group
let ridgeProjectionGroup: THREE.Group
let valleyRiverGroup: THREE.Group
let valleyGuideGroup3D: THREE.Group
let valleyGuideProjectionGroup: THREE.Group
let valleyRiverPath: TerrainFeaturePosition[] = []
let valleyRiverMaterial: THREE.ShaderMaterial | null = null
type RidgePath = { points: TerrainFeaturePosition[]; branch: boolean }
let cachedRidgeHeightfield: number[][] | null = null
let cachedRidgePaths: RidgePath[] = []
let basinContourAnnotations: { x: number; z: number; level: number }[] = []

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

function g1d(t: number, c: number, s: number): number {
  return Math.exp(-((t - c) ** 2) / (2 * s * s))
}
// 锐利角状衰减：d>=W 归零，坡面有棱有角而非圆润高斯
function sharpFall(d: number, W: number, p: number): number {
  if (d >= W) return 0
  return Math.pow(1 - d / W, p)
}

function smoothStep01(t: number): number {
  const u = THREE.MathUtils.clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}

function defaultCliffEdge(x: number): number {
  return defaultZc(x) - 0.09 + 0.006 * Math.sin((x - 0.32) * 18)
}

function defaultCliffMask(x: number): number {
  // 中段为连续崖壁，两端收束；不再用窄高斯掏出一个沟槽。
  return smoothStep01((x - 0.17) / 0.075) * smoothStep01((0.46 - x) / 0.075)
}

function blendBasinHeight(base: number, x: number, z: number, p: BasinParameters): number {
  const dx = (x - p.cx) / p.rx
  const dz = (z - p.cz) / p.rz
  const r = Math.hypot(dx, dz)
  if (r >= 1.85) return base
  const theta = Math.atan2(dz, dx)
  // 先在局部重建盆底—盆壁—盆缘，再在盆缘之外与原山麓融合。
  // 不能把一个凹坑直接加到倾斜山坡上：低侧盆缘会被山坡削开。
  const wall = smoothStep01((r - 0.34) / 0.66)
  const rimVariation = (0.008 * Math.cos(2 * theta) + 0.006 * Math.sin(3 * theta)) * wall
  const basinHeight = p.floor + 0.012 * Math.min(1, r * r)
    + (p.rim - p.floor - 0.012) * wall + rimVariation
  // 宽过渡延伸到山麓，避免盆缘外侧变成一圈陡直的“火山口外壁”。
  const weight = 1 - smoothStep01((r - 1) / 0.85)
  return base * (1 - weight) + basinHeight * weight
}

function getNormalizedHeight(x: number, z: number): number {
  // 主脊中心线（近直线，便于判读）
  const zcOf = (xx: number) => 0.50 - 0.15 * (xx - 0.5)
  // 两座较尖锐的山峰；中间叠加又深又宽的下凹形成饱满鞍部
  const crestH = 0.30 + 0.60 * g1d(x, 0.32, 0.11) + 0.66 * g1d(x, 0.68, 0.11) - 0.50 * g1d(x, 0.50, 0.22)
  const d = z - zcOf(x)
  const ad = Math.abs(d)
  // 鞍部影响用平滑余弦权重过渡，避免 W/p 突变产生折痕
  const sBlend = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, Math.abs(x - 0.50) / 0.30)))
  const W = d < 0 ? (0.32 + 0.28 * sBlend) : (0.45 + 0.30 * sBlend)
  const p = 1.3 + 0.5 * sBlend
  let h = 0.08 + crestH * sharpFall(ad, W, p)
  // 宽山麓裙边：山体厚实不瘦削
  h += 0.10 * sharpFall(ad, 0.62, 1.3)

  // 支脊从主脊平滑长出：根部和末端的高度、斜率都连续。
  // 原来沿单侧直接从 0 跳到 amp，会在峰顶切出约 13～15m 的台阶和假副峰。
  const smooth01 = (t: number) => {
    const v = Math.max(0, Math.min(1, t))
    return v * v * (3 - 2 * v)
  }
  const spur = (sx: number, dir: number, len: number, amp: number, w: number) => {
    // 沿当前位置的主脊起算，避免支脊根部横切倾斜的峰顶。
    const along = (z - zcOf(x)) * dir
    if (along <= 0 || along >= len) return 0
    const u = along / len
    const rootBlend = smooth01(along / 0.10)
    const tipBlend = (1 - u) * (1 - u)
    const t = Math.min(1, Math.abs(x - sx) / w)
    return amp * rootBlend * tipBlend * 0.5 * (1 + Math.cos(Math.PI * t))
  }
  h += spur(0.68, -1, 0.30, 0.14, 0.20)
  h += spur(0.62, 1, 0.28, 0.12, 0.20)
  h += spur(0.32, 1, 0.26, 0.12, 0.20)
  // 山谷不挖槽：由 0.32 与 0.62 两条 +z 支脊之间的自然 V 形低地构成

  // 陡崖：把原来宽约 6 个网格的弯曲陡坡，收窄为约 1 个网格的近直立崖壁。
  // 这是高度场的近直立近似，不是假造数学上完全重合的等高线。
  const cliffHalfWidth = 0.0025
  const cliffStep = smoothStep01((defaultCliffEdge(x) + cliffHalfWidth - z) / (2 * cliffHalfWidth))
  h -= 0.27 * defaultCliffMask(x) * cliffStep

  // 带限细节噪声只作用于原地形；盆底使用下面独立的平缓曲面。
  h += fbm(x * 4.5, z * 4.5, 4) * 0.06 + fbm(x * 9.0, z * 9.0, 3) * 0.02

  // 完整盆缘高于 70m、盆底约 52m；避免闭合低地全部落在 50m 起绘线以下。
  h = blendBasinHeight(h, x, z, DEFAULT_BASIN)

  return Math.max(0, Math.min(1, h))
}

function getRealHeight(x: number, z: number): number {
  return BASE_ELEVATION + getNormalizedHeight(x, z) * MAX_RELIEF
}

function getDisplayHeight(realHeight: number): number {
  return (realHeight - BASE_ELEVATION) * HEIGHT_SCALE
}

/*
 * 等高线表面抬升：
 * Marching Squares 算出的等高线点在平滑后，X/Z 会发生微小移动。
 * 如果仍然使用固定的 level 高度，局部就会卡进山体。
 * 这里重新按 X/Z 采样地形表面高度，再向上抬一点点。
 */
const CONTOUR_SURFACE_OFFSET = 0.008

function sampleTerrainHeightAtSceneXZ(
  sceneX: number,
  sceneZ: number
): number {
  const normalizedX =
    Math.min(
      1,
      Math.max(
        0,
        sceneX / TERRAIN_SIZE + 0.5
      )
    )

  const normalizedRow =
    Math.min(
      1,
      Math.max(
        0,
        sceneZ / TERRAIN_SIZE + 0.5
      )
    )

  const gx =
    normalizedX * (GRID_SIZE - 1)

  const gz =
    normalizedRow * (GRID_SIZE - 1)

  const x0 =
    Math.max(
      0,
      Math.min(
        GRID_SIZE - 1,
        Math.floor(gx)
      )
    )

  const z0 =
    Math.max(
      0,
      Math.min(
        GRID_SIZE - 1,
        Math.floor(gz)
      )
    )

  const x1 =
    Math.min(
      GRID_SIZE - 1,
      x0 + 1
    )

  const z1 =
    Math.min(
      GRID_SIZE - 1,
      z0 + 1
    )

  const tx =
    gx - x0

  const tz =
    gz - z0

  const h00 =
    heightsData[z0]?.[x0] ?? BASE_ELEVATION

  const h10 =
    heightsData[z0]?.[x1] ?? h00

  const h01 =
    heightsData[z1]?.[x0] ?? h00

  const h11 =
    heightsData[z1]?.[x1] ?? h10

  /*
   * 与 generateTerrainData() 中的三角形剖分保持一致：
   *   左上、右上、左下 / 右上、右下、左下。
   * 不能使用双线性插值，否则得到的高度会与实际渲染的三角面略有偏差，
   * 贴在表面的等高线便会局部钻入山体。
   */
  const realHeight =
    tx + tz <= 1
      ? h00 + tx * (h10 - h00) + tz * (h01 - h00)
      : h11 + (1 - tz) * (h10 - h11) + (1 - tx) * (h01 - h11)

  return getDisplayHeight(realHeight)
}

function liftContourToTerrainSurface(
  points: Float32Array,
  offset = CONTOUR_SURFACE_OFFSET
): Float32Array {
  const lifted =
    new Float32Array(points.length)

  for (let i = 0; i < points.length; i += 3) {
    const x =
      points[i] ?? 0

    const z =
      points[i + 2] ?? 0

    lifted[i] =
      x

    lifted[i + 1] =
      sampleTerrainHeightAtSceneXZ(
        x,
        z
      ) + offset

    lifted[i + 2] =
      z
  }

  return lifted
}

function createMergedContourSegments(
  polylines: Float32Array[],
  color: number,
  opacity = 0.9,
  renderOrder = 10,
): THREE.LineSegments | null {
  let segmentCount = 0
  for (const points of polylines) {
    segmentCount += Math.max(0, points.length / 3 - 1)
  }
  if (segmentCount === 0) return null

  const mergedPositions = new Float32Array(segmentCount * 6)
  let targetOffset = 0
  for (const points of polylines) {
    for (let pointOffset = 0; pointOffset + 5 < points.length; pointOffset += 3) {
      mergedPositions.set(points.subarray(pointOffset, pointOffset + 6), targetOffset)
      targetOffset += 6
    }
  }

  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(mergedPositions, 3)
  )

  const lineMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
  })
  const line = new THREE.LineSegments(lineGeo, lineMat)

  line.renderOrder = renderOrder
  line.frustumCulled = false

  return line
}

// ============================================================
// 绿褐色系分层设色
// 深绿 → 绿 → 浅绿 → 浅黄 → 黄 → 深黄 → 浅褐 → 褐 → 深褐
// ============================================================
function getTerrainColor(t: number): { r: number; g: number; b: number } {
  const stops = [
    { pos: 0.000, r: 26 / 255, g: 92 / 255, b: 26 / 255 },  // 深绿
    { pos: 0.125, r: 46 / 255, g: 139 / 255, b: 46 / 255 },  // 绿
    { pos: 0.250, r: 106 / 255, g: 176 / 255, b: 76 / 255 },  // 浅绿
    { pos: 0.375, r: 212 / 255, g: 212 / 255, b: 122 / 255 },  // 浅黄
    { pos: 0.500, r: 232 / 255, g: 200 / 255, b: 74 / 255 },  // 黄
    { pos: 0.625, r: 212 / 255, g: 160 / 255, b: 48 / 255 },  // 深黄
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

interface ContourVertex {
  x: number
  z: number
  height: number
}

const CONTOUR_POINT_EPSILON = 1e-7
const CONTOUR_CONNECT_EPSILON = TERRAIN_SIZE / (GRID_SIZE - 1) * 1e-4

function interpolateContourEdge(
  a: ContourVertex,
  b: ContourVertex,
  level: number,
): { x: number; z: number } | null {
  const da = a.height - level
  const db = b.height - level

  // 整条边都处于等高面时交由相邻两条边确定端点，避免重复线段。
  if (Math.abs(da) <= CONTOUR_POINT_EPSILON && Math.abs(db) <= CONTOUR_POINT_EPSILON) {
    return null
  }

  if ((da < 0 && db < 0) || (da > 0 && db > 0)) return null

  const heightDelta = b.height - a.height
  if (Math.abs(heightDelta) <= CONTOUR_POINT_EPSILON) return null

  const t = Math.max(0, Math.min(1, (level - a.height) / heightDelta))
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

function addTriangleContourSegment(
  segments: ContourSegment[],
  a: ContourVertex,
  b: ContourVertex,
  c: ContourVertex,
  level: number,
) {
  const intersections = [
    interpolateContourEdge(a, b, level),
    interpolateContourEdge(b, c, level),
    interpolateContourEdge(c, a, level),
  ].filter((point): point is { x: number; z: number } => point !== null)

  const unique: { x: number; z: number }[] = []
  for (const point of intersections) {
    if (!unique.some(existing =>
      Math.hypot(existing.x - point.x, existing.z - point.z) <= CONTOUR_POINT_EPSILON
    )) {
      unique.push(point)
    }
  }

  if (unique.length !== 2) return
  const first = unique[0]
  const second = unique[1]
  if (!first || !second) return
  if (Math.hypot(first.x - second.x, first.z - second.z) <= CONTOUR_POINT_EPSILON) return

  segments.push({
    ax: first.x,
    az: first.z,
    bx: second.x,
    bz: second.z,
    level,
  })
}

function generateContourSegments(interval: number): ContourSegment[] {
  const segments: ContourSegment[] = []
  const sceneX = (index: number) => (index / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
  const sceneZ = (index: number) => (index / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE

  for (let level = CONTOUR_START; level <= CONTOUR_END; level += interval) {
    for (let j = 0; j < GRID_SIZE - 1; j++) {
      for (let i = 0; i < GRID_SIZE - 1; i++) {
        const topRow = heightsData[j]
        const bottomRow = heightsData[j + 1]
        if (!topRow || !bottomRow) continue

        const topLeftHeight = topRow[i]
        const topRightHeight = topRow[i + 1]
        const bottomLeftHeight = bottomRow[i]
        const bottomRightHeight = bottomRow[i + 1]
        if (
          topLeftHeight === undefined ||
          topRightHeight === undefined ||
          bottomLeftHeight === undefined ||
          bottomRightHeight === undefined
        ) continue

        const x0 = sceneX(i)
        const x1 = sceneX(i + 1)
        const z0 = sceneZ(j)
        const z1 = sceneZ(j + 1)
        const topLeft = { x: x0, z: z0, height: topLeftHeight }
        const topRight = { x: x1, z: z0, height: topRightHeight }
        const bottomLeft = { x: x0, z: z1, height: bottomLeftHeight }
        const bottomRight = { x: x1, z: z1, height: bottomRightHeight }

        // 必须与地形网格的 (a,b,c) / (b,d,c) 两个三角面完全一致。
        addTriangleContourSegment(segments, topLeft, topRight, bottomLeft, level)
        addTriangleContourSegment(segments, topRight, bottomRight, bottomLeft, level)
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

  type EndpointRef = { segmentIndex: number; endpoint: 'a' | 'b' }
  const pointKey = (x: number, z: number) =>
    `${Math.round(x / CONTOUR_CONNECT_EPSILON)},${Math.round(z / CONTOUR_CONNECT_EPSILON)}`
  const adjacency = new Map<string, EndpointRef[]>()

  const addEndpoint = (key: string, ref: EndpointRef) => {
    const refs = adjacency.get(key)
    if (refs) refs.push(ref)
    else adjacency.set(key, [ref])
  }

  for (let i = 0; i < segs.length; i++) {
    const segment = segs[i]
    if (!segment) continue
    addEndpoint(pointKey(segment.ax, segment.az), { segmentIndex: i, endpoint: 'a' })
    addEndpoint(pointKey(segment.bx, segment.bz), { segmentIndex: i, endpoint: 'b' })
  }

  const tracePolyline = (startIndex: number, startEndpoint: 'a' | 'b') => {
    const startSegment = segs[startIndex]
    if (!startSegment) return
    const startAtA = startEndpoint === 'a'
    const startX = startAtA ? startSegment.ax : startSegment.bx
    const startZ = startAtA ? startSegment.az : startSegment.bz
    let currentX = startAtA ? startSegment.bx : startSegment.ax
    let currentZ = startAtA ? startSegment.bz : startSegment.az
    const startKey = pointKey(startX, startZ)
    const points = [startX, y, startZ, currentX, y, currentZ]
    used[startIndex] = true

    while (true) {
      const currentKey = pointKey(currentX, currentZ)
      if (currentKey === startKey) break

      const nextRef = adjacency.get(currentKey)?.find(ref => !used[ref.segmentIndex])
      if (!nextRef) break

      const nextSegment = segs[nextRef.segmentIndex]
      if (!nextSegment) break
      const exitsAtB = nextRef.endpoint === 'a'
      currentX = exitsAtB ? nextSegment.bx : nextSegment.ax
      currentZ = exitsAtB ? nextSegment.bz : nextSegment.az
      points.push(currentX, y, currentZ)
      used[nextRef.segmentIndex] = true
    }

    polylines.push(new Float32Array(points))
  }

  // 优先从度为 1 的端点追踪开放曲线，再处理剩余闭环。
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue
    const segment = segs[i]
    if (!segment) continue
    const aDegree = adjacency.get(pointKey(segment.ax, segment.az))?.length ?? 0
    const bDegree = adjacency.get(pointKey(segment.bx, segment.bz))?.length ?? 0
    if (aDegree === 1) tracePolyline(i, 'a')
    else if (bDegree === 1) tracePolyline(i, 'b')
  }

  for (let i = 0; i < segs.length; i++) {
    if (!used[i]) tracePolyline(i, 'a')
  }

  return polylines
}

// ============================================================
// Chaikin 曲线平滑 — 使等高线连续光滑
// ============================================================
function chaikinSmooth(points: Float32Array, iterations: number): Float32Array {
  type Point3 = { x: number; y: number; z: number }
  let pts: Point3[] = []
  for (let i = 0; i < points.length; i += 3) {
    pts.push({
      x: points[i] ?? 0,
      y: points[i + 1] ?? 0,
      z: points[i + 2] ?? 0,
    })
  }
  if (pts.length < 2) return points

  const firstPoint = pts[0]
  const lastPoint = pts[pts.length - 1]
  if (!firstPoint || !lastPoint) return points
  const closed = pts.length >= 3 && Math.hypot(
    firstPoint.x - lastPoint.x,
    firstPoint.z - lastPoint.z,
  ) <= CONTOUR_CONNECT_EPSILON

  // 闭环内部只保留一个首点，完成平滑后再显式闭合。
  if (closed) pts.pop()

  for (let iter = 0; iter < iterations; iter++) {
    const newPts: Point3[] = []
    const pointCount = pts.length
    const currentFirst = pts[0]
    const currentLast = pts[pointCount - 1]
    if (!currentFirst || !currentLast) break

    if (!closed) newPts.push(currentFirst)

    const pairCount = closed ? pointCount : pointCount - 1
    for (let pointIndex = 0; pointIndex < pairCount; pointIndex++) {
      const nextPointIndex = (pointIndex + 1) % pointCount
      const current = pts[pointIndex]
      const next = pts[nextPointIndex]
      if (!current || !next) continue
      newPts.push({
        x: current.x * 0.75 + next.x * 0.25,
        y: current.y * 0.75 + next.y * 0.25,
        z: current.z * 0.75 + next.z * 0.25,
      })
      newPts.push({
        x: current.x * 0.25 + next.x * 0.75,
        y: current.y * 0.25 + next.y * 0.75,
        z: current.z * 0.25 + next.z * 0.75,
      })
    }

    if (!closed) newPts.push(currentLast)

    pts = newPts
  }

  if (closed && pts[0]) pts.push({ ...pts[0] })

  const result = new Float32Array(pts.length * 3)
  for (let i = 0; i < pts.length; i++) {
    const point = pts[i]
    if (!point) continue
    const offset = i * 3
    result[offset] = point.x
    result[offset + 1] = point.y
    result[offset + 2] = point.z
  }
  return result
}

// ============================================================
// 山脊线与闭合盆地：所有坐标均从当前 heightsData 采样，不另画一套悬空曲线。
// ============================================================
function sampleRealHeightNormalized(x: number, z: number): number {
  return BASE_ELEVATION + sampleTerrainHeightAtSceneXZ(
    (x - 0.5) * TERRAIN_SIZE,
    (0.5 - z) * TERRAIN_SIZE,
  ) / HEIGHT_SCALE
}

function findBasinFloorAnchor(p: BasinParameters): TerrainFeaturePosition {
  let best = { x: p.cx, z: p.cz }
  let lowest = Infinity
  for (let j = 1; j < GRID_SIZE - 1; j++) {
    const z = 1 - j / (GRID_SIZE - 1)
    if (Math.abs(z - p.cz) > p.rz * 0.55) continue
    for (let i = 1; i < GRID_SIZE - 1; i++) {
      const x = i / (GRID_SIZE - 1)
      if (Math.hypot((x - p.cx) / p.rx, (z - p.cz) / p.rz) > 0.55) continue
      const height = heightsData[j]?.[i] ?? Infinity
      if (height < lowest) { lowest = height; best = { x, z } }
    }
  }
  return best
}

function findCliffFaceAnchor(x: number, edge: number): TerrainFeaturePosition {
  // 标签落在当前三角网格中实际高差最大的崖壁中段，而不是写死在崖脚。
  const centerRow = Math.floor((1 - edge) * (GRID_SIZE - 1))
  let bestZ = edge
  let largestDrop = -Infinity
  for (let j = Math.max(0, centerRow - 2); j <= Math.min(GRID_SIZE - 2, centerRow + 2); j++) {
    const upperZ = 1 - j / (GRID_SIZE - 1)
    const lowerZ = 1 - (j + 1) / (GRID_SIZE - 1)
    const drop = sampleRealHeightNormalized(x, upperZ) - sampleRealHeightNormalized(x, lowerZ)
    if (drop > largestDrop) {
      largestDrop = drop
      bestZ = (upperZ + lowerZ) / 2
    }
  }
  return { x, z: bestZ }
}

function findTransverseCrest(
  along: 'x' | 'z',
  fixed: number,
  center: number,
  halfWidth: number,
): TerrainFeaturePosition | null {
  const lo = Math.max(0.005, center - halfWidth)
  const hi = Math.min(0.995, center + halfWidth)
  const count = Math.max(32, Math.ceil((hi - lo) / 0.0012))
  const heightAt = (cross: number) => along === 'x'
    ? sampleRealHeightNormalized(fixed, cross)
    : sampleRealHeightNormalized(cross, fixed)
  let bestIndex = -1
  let bestHeight = -Infinity
  for (let i = 0; i <= count; i++) {
    const h = heightAt(lo + (hi - lo) * i / count)
    if (h > bestHeight) { bestHeight = h; bestIndex = i }
  }
  // 搜索窗边缘的最高点只是倾斜坡面，不把它误画成山脊。
  if (bestIndex <= 0 || bestIndex >= count || bestHeight < BASE_ELEVATION + 2) return null
  const cross = lo + (hi - lo) * bestIndex / count
  const sideStep = 0.012
  if (cross - sideStep <= 0 || cross + sideStep >= 1) return null
  if (bestHeight - heightAt(cross - sideStep) < 0.006
    || bestHeight - heightAt(cross + sideStep) < 0.006) return null
  return along === 'x' ? { x: fixed, z: cross } : { x: cross, z: fixed }
}

function findMainRidgeAnchor(x: number): TerrainFeaturePosition {
  return findTransverseCrest('x', x, defaultZc(x), 0.055) ?? { x, z: defaultZc(x) }
}

function findDefaultSaddleAnchor(): TerrainFeaturePosition {
  let result = findMainRidgeAnchor(0.5)
  let lowest = Infinity
  for (let i = 0; i <= 140; i++) {
    const point = findMainRidgeAnchor(0.40 + i / 140 * 0.20)
    const height = sampleRealHeightNormalized(point.x, point.z)
    if (height < lowest) { lowest = height; result = point }
  }
  return result
}

function findGeneratedSaddleAnchor(cx: number, cz: number): TerrainFeaturePosition {
  let best = { x: cx, z: cz }
  let bestScore = -Infinity
  for (let j = 2; j < GRID_SIZE - 2; j++) {
    const z = 1 - j / (GRID_SIZE - 1)
    if (Math.abs(z - cz) > 0.12) continue
    for (let i = 2; i < GRID_SIZE - 2; i++) {
      const x = i / (GRID_SIZE - 1)
      if (Math.abs(x - cx) > 0.18) continue
      const h = heightsData[j]?.[i] ?? 0
      const dx = ((heightsData[j]?.[i + 1] ?? h) - (heightsData[j]?.[i - 1] ?? h)) / 2
      const dz = ((heightsData[j + 1]?.[i] ?? h) - (heightsData[j - 1]?.[i] ?? h)) / 2
      const g = Math.hypot(dx, dz)
      const hxx = (heightsData[j]?.[i - 1] ?? h) - 2 * h + (heightsData[j]?.[i + 1] ?? h)
      const hzz = (heightsData[j - 1]?.[i] ?? h) - 2 * h + (heightsData[j + 1]?.[i] ?? h)
      const hxz = ((heightsData[j + 1]?.[i + 1] ?? h) - (heightsData[j + 1]?.[i - 1] ?? h) - (heightsData[j - 1]?.[i + 1] ?? h) + (heightsData[j - 1]?.[i - 1] ?? h)) / 4
      const det = hxx * hzz - hxz * hxz
      if (det >= 0) continue
      const centerPenalty = Math.hypot((x - cx) / 0.18, (z - cz) / 0.12)
      const score = -g * 18 - centerPenalty * 6 - Math.abs(h - (BASE_ELEVATION + MAX_RELIEF * 0.38)) * 0.015
      if (score > bestScore) {
        bestScore = score
        best = { x, z }
      }
    }
  }
  return best
}

function findTransverseTrough(
  along: 'x' | 'z',
  fixed: number,
  center: number,
  halfWidth: number,
): TerrainFeaturePosition | null {
  const lo = Math.max(0.005, center - halfWidth)
  const hi = Math.min(0.995, center + halfWidth)
  const count = Math.max(32, Math.ceil((hi - lo) / 0.0012))
  const heightAt = (cross: number) => along === 'x'
    ? sampleRealHeightNormalized(fixed, cross)
    : sampleRealHeightNormalized(cross, fixed)
  let bestIndex = -1
  let bestHeight = Infinity
  for (let i = 0; i <= count; i++) {
    const h = heightAt(lo + (hi - lo) * i / count)
    if (h < bestHeight) { bestHeight = h; bestIndex = i }
  }
  if (bestIndex <= 0 || bestIndex >= count) return null
  const cross = lo + (hi - lo) * bestIndex / count
  const sideStep = 0.012
  if (cross - sideStep <= 0 || cross + sideStep >= 1) return null
  if (heightAt(cross - sideStep) - bestHeight < 0.004
    || heightAt(cross + sideStep) - bestHeight < 0.004) return null
  return along === 'x' ? { x: fixed, z: cross } : { x: cross, z: fixed }
}

function trimRidgePathAroundLabel(path: RidgePath, anchor: TerrainFeaturePosition): RidgePath {
  if (path.points.length <= 10) return path
  let nearestIndex = 0
  let nearestDistance = Infinity
  for (let i = 0; i < path.points.length; i++) {
    const p = path.points[i]!
    const d = Math.hypot(p.x - anchor.x, p.z - anchor.z)
    if (d < nearestDistance) {
      nearestDistance = d
      nearestIndex = i
    }
  }
  let start = nearestIndex
  let end = nearestIndex
  let acc = 0
  const maxSpan = terrainGenType.value === 'all' ? 0.20 : 0.24
  while (start > 0 && acc < maxSpan * 0.5) {
    const a = path.points[start]!
    const b = path.points[start - 1]!
    acc += Math.hypot(a.x - b.x, a.z - b.z)
    start -= 1
  }
  acc = 0
  while (end < path.points.length - 1 && acc < maxSpan * 0.5) {
    const a = path.points[end]!
    const b = path.points[end + 1]!
    acc += Math.hypot(a.x - b.x, a.z - b.z)
    end += 1
  }
  return { points: path.points.slice(start, end + 1), branch: path.branch }
}

function getFocusedRidgePaths(paths: RidgePath[]): RidgePath[] {
  if (!paths.length) return []
  const anchor = currentFeaturePositions.ridge ?? DEFAULT_FEATURE_POSITIONS.ridge
  let chosen = paths[0]!
  let nearestDistance = Infinity
  for (const path of paths) {
    for (const point of path.points) {
      const d = Math.hypot(point.x - anchor.x, point.z - anchor.z)
      if (d < nearestDistance) {
        nearestDistance = d
        chosen = path
      }
    }
  }
  return [trimRidgePathAroundLabel(chosen, anchor)]
}

// 独立山谷与河流共用同一条平面中心线；随机参数只改变位置/平面弯曲，不制造纵向拦水坎。
function generatedValleyAxisX(z: number, cx: number, cz: number): number {
  return cx + 0.018 * Math.sin((z - cz) * 5.0)
}

function generatedValleyHeight(x: number, z: number, cx: number, cz: number): number {
  const axisX = generatedValleyAxisX(z, cx, cz)
  // 沿 +z 下游方向：d(bed)/dz = -0.38 - 0.05 * (1-z) < 0。
  // 不再把 sin() 加到谷底高程上；起伏留给两侧地貌/地表材质。
  const bed = 0.62 - 0.38 * z + 0.025 * (1 - z) ** 2
  const valleyWidth = 0.075 + 0.035 * z
  const lateral = (x - axisX) / valleyWidth
  const bankHeight = 0.31 + 0.035 * (1 - z)
  return bed + bankHeight * (1 - Math.exp(-0.5 * lateral * lateral))
}

// 把路径分段点落在高度场每一条相交的网格边/三角形对角线上。
// 只看首尾高差不够：两点之间也可能跨过小土坎；三角面内的高度才是线性的。
function sampleRiverSegment(a: TerrainFeaturePosition, b: TerrainFeaturePosition): TerrainFeaturePosition[] {
  const cuts = [0, 1]
  const n = GRID_SIZE - 1
  const ax = a.x * n, az = (1 - a.z) * n
  const bx = b.x * n, bz = (1 - b.z) * n
  const addCrossings = (start: number, end: number) => {
    const delta = end - start
    if (Math.abs(delta) < 1e-12) return
    for (let edge = Math.ceil(Math.min(start, end)); edge <= Math.floor(Math.max(start, end)); edge++) {
      const t = (edge - start) / delta
      if (t > 1e-9 && t < 1 - 1e-9) cuts.push(t)
    }
  }
  addCrossings(ax, bx)
  addCrossings(az, bz)
  addCrossings(ax + az, bx + bz)
  // 同时细分绘图采样，防止河流带的长三角面跨过弯曲坡面。
  const subdivisions = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.0025))
  for (let i = 1; i < subdivisions; i++) cuts.push(i / subdivisions)
  cuts.sort((a, b) => a - b)
  return cuts.filter((t, i) => i === 0 || t - cuts[i - 1]! > 1e-9).map(t => ({
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  }))
}

function validateDownhillRiverPath(candidate: TerrainFeaturePosition[]): TerrainFeaturePosition[] {
  if (candidate.length < 2) return []
  const path = candidate.map(point => ({ ...point }))
  const elevation = (point: TerrainFeaturePosition) => sampleRealHeightNormalized(point.x, point.z)
  const first = path[0]!, last = path[path.length - 1]!
  // 顺序统一成上游 -> 下游；随后仍须逐段校验，不能只反转整条线就算修复。
  if (elevation(first) < elevation(last)) path.reverse()
  const checked: TerrainFeaturePosition[] = [path[0]!]
  let previousHeight = elevation(path[0]!)
  for (let i = 1; i < path.length; i++) {
    const samples = sampleRiverSegment(path[i - 1]!, path[i]!)
    for (let k = 1; k < samples.length; k++) {
      const point = samples[k]!
      const h = elevation(point)
      if (!Number.isFinite(h) || h > previousHeight + 1e-6) {
        // 未来调整地形产生洼地时停在洼地前；不跳过高点拼接成一条穿坡的河。
        return checked.length >= 3 ? checked : []
      }
      checked.push(point)
      previousHeight = h
    }
  }
  return checked
}

function traceValleyRiverPath(): TerrainFeaturePosition[] {
  const type = terrainGenType.value
  if (!['all', 'valley'].includes(type) || !heightsData.length) return []

  if (type === 'valley') {
    const { cx, cz } = currentTerrainParams
    const candidate: TerrainFeaturePosition[] = []
    // 贯穿独立山谷，保留上版的长河道；不再随着随机 cz 把河流截成半段。
    const startZ = 0.025, endZ = 0.975
    const steps = Math.ceil((endZ - startZ) / 0.003)
    for (let i = 0; i <= steps; i++) {
      const z = startZ + (endZ - startZ) * i / steps
      candidate.push({ x: generatedValleyAxisX(z, cx, cz), z })
    }
    return validateDownhillRiverPath(candidate)
  }

  // 综合地形：从鞍部的同一侧谷头出发，保留接近鞍部的长河道，但不能翻越分水岭。
  const saddle = findDefaultSaddleAnchor()
  const center = currentFeaturePositions.valley ?? DEFAULT_FEATURE_POSITIONS.valley
  const startZ = saddle.z + 0.015
  const endZ = 0.975
  const candidate: TerrainFeaturePosition[] = []
  const steps = Math.ceil((endZ - startZ) / 0.004)
  let previousX = saddle.x
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const z = startZ + (endZ - startZ) * t
    const expectedX = THREE.MathUtils.lerp(saddle.x, center.x, Math.min(1, t * 1.25))
    const point = findTransverseTrough('z', z, expectedX, 0.14)
    // 不跳过缺失横断面，避免跨过分隔的地形直接拉一条直线。
    if (!point) break
    if (candidate.length && Math.abs(point.x - previousX) > 0.03) break
    candidate.push(point)
    previousX = point.x
  }
  return validateDownhillRiverPath(candidate)
}

function createRiverRibbonGeometry(points: TerrainFeaturePosition[], halfWidth = 0.05) {
  const worldPoints = points.map(point => new THREE.Vector3(
    (point.x - 0.5) * TERRAIN_SIZE,
    sampleTerrainHeightAtSceneXZ((point.x - 0.5) * TERRAIN_SIZE, (0.5 - point.z) * TERRAIN_SIZE),
    (0.5 - point.z) * TERRAIN_SIZE,
  ))
  if (worldPoints.length < 2) return null
  const cumulative = [0]
  for (let i = 1; i < worldPoints.length; i++) {
    cumulative.push(cumulative[i - 1]! + worldPoints[i]!.distanceTo(worldPoints[i - 1]!))
  }
  const total = cumulative[cumulative.length - 1]!
  if (total <= 1e-6) return null

  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  const acrossSegments = 6
  const columns = acrossSegments + 1
  for (let i = 0; i < worldPoints.length; i++) {
    const point = worldPoints[i]!
    const prev = worldPoints[Math.max(0, i - 1)]!
    const next = worldPoints[Math.min(worldPoints.length - 1, i + 1)]!
    const tangent = next.clone().sub(prev)
    tangent.y = 0
    if (tangent.lengthSq() < 1e-10) tangent.set(0, 0, 1)
    tangent.normalize()
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x)
    const progress = cumulative[i]! / total
    const width = halfWidth * (0.5 + 0.5 * smoothStep01(progress / 0.10))
    // 谷底之上很薄的示意水层；横断面水面保持水平，纵向跟随已校验的下降剖面。
    // 不能把每个水面顶点都抬到岸坡高度，否则带子的边缘仍可能形成局部逆坡。
    const waterY = point.y + 0.012
    const bankExtent = (side: number): number => {
      const bankHeight = (distance: number) => sampleTerrainHeightAtSceneXZ(
        point.x + normal.x * side * distance,
        point.z + normal.z * side * distance,
      )
      // 沿左右两侧分别寻找与岸坡的第一次接触；避免水带覆盖、爬上高岸。
      let inside = 0
      for (let step = 1; step <= 12; step++) {
        const outside = width * step / 12
        if (bankHeight(outside) > waterY - 0.001) {
          let lo = inside, hi = outside
          for (let k = 0; k < 12; k++) {
            const mid = (lo + hi) * 0.5
            if (bankHeight(mid) <= waterY - 0.001) lo = mid
            else hi = mid
          }
          return lo
        }
        inside = outside
      }
      return width
    }
    const leftWidth = bankExtent(1), rightWidth = bankExtent(-1)
    for (let column = 0; column <= acrossSegments; column++) {
      const u = column / acrossSegments
      const lateral = (1 - 2 * u) * (u <= 0.5 ? leftWidth : rightWidth)
      const x = point.x + normal.x * lateral
      const z = point.z + normal.z * lateral
      positions.push(x, waterY, z)
      // v 为从上游累计到下游的实际弧长，箭头/水纹只沿 +v 移动。
      uvs.push(u, cumulative[i]!)
      if (i < worldPoints.length - 1 && column < acrossSegments) {
        const a = i * columns + column, b = a + 1, c = a + columns, d = c + 1
        indices.push(a, b, c, b, d, c)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  geometry.userData.riverLength = total
  return geometry
}

function buildValleyRiverBand() {
  if (!valleyRiverGroup) return
  disposeFeatureLineGroup(valleyRiverGroup)
  // 材质由所属分组统一 dispose，避免共享清理列表把另一个分组仍在使用的材质释放。
  valleyRiverMaterial = null
  valleyRiverPath = traceValleyRiverPath()
  buildValleyGuideLines(valleyRiverPath)
  if (valleyRiverPath.length < 3) {
    onToggleValleyRiver()
    return
  }
  const geometry = createRiverRibbonGeometry(valleyRiverPath, terrainGenType.value === 'valley' ? 0.05 : 0.04)
  if (!geometry) {
    onToggleValleyRiver()
    return
  }
  valleyRiverMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uFlowSpeed: { value: 0.11 },
      uArrowSpacing: { value: 0.20 },
      uLength: { value: geometry.userData.riverLength },
    },
    vertexShader: `varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform float uTime;
      uniform float uFlowSpeed;
      uniform float uArrowSpacing;
      uniform float uLength;
      varying vec2 vUv;
      void main(){
        // 路径已逐三角面验证为下坡；phase 恒定的位置随时间沿 +v 移向下游。
        float downstream = vUv.y - uTime * uFlowSpeed;
        float phase = fract(downstream / uArrowSpacing);
        float center = abs(vUv.x - 0.5);
        // 箭尖位于更大的 v；不得只让图案移动，而箭头本身指向相反方向。
        float arrow = (1.0 - smoothstep(0.035, 0.065, abs(phase - 0.64 + center * 0.82)))
          * (1.0 - smoothstep(0.27, 0.43, center));
        float edge = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
        float mid = 1.0 - smoothstep(0.0, 0.5, center);
        float shimmer = 0.045 * sin(downstream * 100.0 + vUv.x * 4.0);
        vec3 color = mix(vec3(0.03, 0.28, 0.48), vec3(0.13, 0.65, 0.84), mid * 0.82);
        color += arrow * vec3(0.55, 0.70, 0.73) + shimmer * edge;
        float cap = smoothstep(0.0, 0.025, vUv.y) * (1.0 - smoothstep(uLength - 0.02, uLength, vUv.y));
        float alpha = edge * cap * (0.70 + 0.22 * arrow);
        gl_FragColor = vec4(color, alpha);
      }`,
  })
  const mesh = new THREE.Mesh(geometry, valleyRiverMaterial)
  mesh.name = 'valleyRiverBand'
  mesh.renderOrder = 12
  mesh.userData.flowDirection = 'upstream-to-downstream'
  mesh.userData.upstreamElevation = sampleRealHeightNormalized(valleyRiverPath[0]!.x, valleyRiverPath[0]!.z)
  const end = valleyRiverPath[valleyRiverPath.length - 1]!
  mesh.userData.downstreamElevation = sampleRealHeightNormalized(end.x, end.z)
  valleyRiverGroup.add(mesh)
  onToggleValleyRiver()
}

function updateRiverElevationLabelVisibility() {
  if (!featureLabelGroup) return
  for (const label of featureLabelGroup.children) {
    if (label.name === 'riverElevationLabel') {
      label.visible = showValleyRiver.value && !learningMode.value
    }
  }
}

function addRiverElevationLabels() {
  if (learningMode.value || terrainGenType.value !== 'valley' || valleyRiverPath.length < 3) return
  const markers = [
    { text: '上游', point: valleyRiverPath[0]! },
    { text: '下游', point: valleyRiverPath[valleyRiverPath.length - 1]! },
  ]
  for (const { text, point } of markers) {
    const div = document.createElement('div')
    div.textContent = `${text} ${sampleRealHeightNormalized(point.x, point.z).toFixed(1)}m`
    div.style.cssText = 'color:#eafaff;background:rgba(5,34,56,0.88);padding:3px 8px;'
      + 'border:1px solid rgba(80,198,244,0.65);border-radius:6px;white-space:nowrap;'
      + 'font-weight:700;pointer-events:none;text-shadow:0 1px 2px #000;'
    div.style.fontSize = `${Math.max(12, 13 * uiScale.value)}px`
    const label = new CSS2DObject(div)
    label.name = 'riverElevationLabel'
    const x = (point.x - 0.5) * TERRAIN_SIZE, z = (0.5 - point.z) * TERRAIN_SIZE
    label.position.set(x, sampleTerrainHeightAtSceneXZ(x, z) + 0.07, z)
    featureLabelGroup.add(label)
  }
  updateRiverElevationLabelVisibility()
}

function onToggleValleyRiver() {
  if (!valleyRiverGroup) return
  valleyRiverGroup.visible = showValleyRiver.value
    && showTerrain.value
    && !learningMode.value
    && ['all', 'valley'].includes(terrainGenType.value)
  onToggleValleyGuides()
  updateRiverElevationLabelVisibility()
  invalidateSceneRender()
}

function smoothRidgeXZ(points: TerrainFeaturePosition[]): TerrainFeaturePosition[] {
  if (points.length < 7) return points
  // 网格上的横向最高点会在相邻格点之间跳动。多点低通只用于去掉格点台阶，
  // 保留首尾点（支脊连接点）和整体走向；绘制时逐点重新贴合三角面。
  let result = points.map(point => ({ ...point }))
  for (let pass = 0; pass < 3; pass++) {
    const previous = result
    result = previous.map((point, index) => {
      if (index === 0 || index === previous.length - 1) return { ...point }
      const radius = Math.min(4, index, previous.length - 1 - index)
      let sx = 0, sz = 0, sum = 0
      for (let d = -radius; d <= radius; d++) {
        const neighbor = previous[index + d]!
        const weight = radius + 1 - Math.abs(d)
        sx += neighbor.x * weight
        sz += neighbor.z * weight
        sum += weight
      }
      return { x: sx / sum, z: sz / sum }
    })
  }
  return result
}

function traceRidgePaths(): RidgePath[] {
  const type = terrainGenType.value
  if (!['all', 'ridge', 'saddle'].includes(type)) return []
  const paths: RidgePath[] = []
  const isDefault = type === 'all'
  const { cx, cz } = currentTerrainParams
  const left = isDefault ? 0.075 : Math.max(0.025, cx - 0.40)
  const right = isDefault ? 0.935 : Math.min(0.975, cx + 0.40)
  let main: TerrainFeaturePosition[] = []
  const mainParts: TerrainFeaturePosition[][] = []
  const steps = Math.ceil((right - left) / 0.004)
  for (let i = 0; i <= steps; i++) {
    const x = left + (right - left) * i / steps
    const expectedZ = isDefault ? defaultZc(x) : cz
    const point = findTransverseCrest('x', x, expectedZ, isDefault ? 0.055 : 0.08)
    if (point) main.push(point)
    else if (main.length) { mainParts.push(main); main = [] }
  }
  if (main.length) mainParts.push(main)
  for (const part of mainParts) {
    if (part.length > 5) paths.push({ points: smoothRidgeXZ(part), branch: false })
  }
  if (!isDefault) return paths

  const allMainPoints = paths.filter(path => !path.branch).flatMap(path => path.points)
  if (!allMainPoints.length) return paths
  // 三条可辨识的支脊：连接实际峰顶，沿横断面最高处向坡脚追踪。
  // 不照抄 spur 的 sx；叠加山体之后，真正的支脊中线会偏离 sx。
  const branches = [
    { xmin: 0.23, xmax: 0.41, dir: 1, length: 0.26 },
    { xmin: 0.59, xmax: 0.79, dir: 1, length: 0.28 },
    { xmin: 0.59, xmax: 0.79, dir: -1, length: 0.30 },
  ]
  for (const branch of branches) {
    const roots = allMainPoints.filter(point => point.x >= branch.xmin && point.x <= branch.xmax)
    if (!roots.length) continue
    const root = roots.reduce((best, point) =>
      sampleRealHeightNormalized(point.x, point.z) > sampleRealHeightNormalized(best.x, best.z)
        ? point : best)
    const branchPoints: TerrainFeaturePosition[] = [{ ...root }]
    let center = root.x
    const n = Math.ceil(branch.length / 0.004)
    for (let i = 1; i <= n; i++) {
      const z = root.z + branch.dir * branch.length * i / n
      if (z <= 0.02 || z >= 0.98) break
      const point = findTransverseCrest('z', z, center, 0.075)
      if (!point || point.x < branch.xmin || point.x > branch.xmax) break
      const previous = branchPoints[branchPoints.length - 1]!
      // 停止于脊线消失处；不跨过山谷或跳到相邻山坡上。
      if (Math.abs(point.x - previous.x) > 0.018) break
      if (sampleRealHeightNormalized(point.x, point.z) > sampleRealHeightNormalized(previous.x, previous.z) + 0.25) break
      branchPoints.push(point)
      center = point.x
    }
    if (branchPoints.length > 8) paths.push({ points: smoothRidgeXZ(branchPoints), branch: true })
  }
  return paths
}

function disposeFeatureLineGroup(group: THREE.Group | undefined) {
  if (!group) return
  for (const child of [...group.children]) {
    child.removeFromParent()
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) material.dispose()
    }
  }
}

function addDashedGuideLine(
  group: THREE.Group,
  positions: number[],
  options: { color: number; outlineColor: number; dashSize: number; gapSize: number; opacity?: number }
) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = new THREE.LineDashedMaterial({
    color: options.color,
    dashSize: options.dashSize,
    gapSize: options.gapSize,
    transparent: true,
    opacity: options.opacity ?? 1,
    linewidth: 1,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const line = new THREE.Line(geometry, material)
  line.computeLineDistances()
  line.renderOrder = 15
  group.add(line)
}

function addRidgeStroke(group: THREE.Group, positions: number[], branch: boolean) {
  addDashedGuideLine(group, positions, {
    color: 0xff4d5f,
    outlineColor: 0x5b1b23,
    dashSize: branch ? 0.055 : 0.075,
    gapSize: branch ? 0.04 : 0.045,
    opacity: 0.98,
  })
}

function buildRidgeLines() {
  disposeFeatureLineGroup(ridgeGroup3D)
  disposeFeatureLineGroup(ridgeProjectionGroup)
  if (cachedRidgeHeightfield !== heightsData) {
    cachedRidgeHeightfield = heightsData
    cachedRidgePaths = traceRidgePaths()
  }
  const ridgePaths = getFocusedRidgePaths(cachedRidgePaths)
  for (const path of ridgePaths) {
    const surface: number[] = []
    const projection: number[] = []
    for (let i = 0; i < path.points.length - 1; i++) {
      const a = path.points[i]!
      const b = path.points[i + 1]!
      const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.0018))
      for (let k = 0; k < count; k++) {
        const t = k / count
        const x = (a.x + (b.x - a.x) * t - 0.5) * TERRAIN_SIZE
        const z = (0.5 - (a.z + (b.z - a.z) * t)) * TERRAIN_SIZE
        surface.push(x, sampleTerrainHeightAtSceneXZ(x, z) + 0.014, z)
        projection.push(x, BASE_PLANE_Y + 0.018, z)
      }
    }
    const end = path.points[path.points.length - 1]
    if (!end) continue
    const x = (end.x - 0.5) * TERRAIN_SIZE
    const z = (0.5 - end.z) * TERRAIN_SIZE
    surface.push(x, sampleTerrainHeightAtSceneXZ(x, z) + 0.014, z)
    projection.push(x, BASE_PLANE_Y + 0.018, z)
    addRidgeStroke(ridgeGroup3D, surface, path.branch)
    addRidgeStroke(ridgeProjectionGroup, projection, path.branch)
  }
  onToggleRidgeLines()
}

function buildValleyGuideLines(path: TerrainFeaturePosition[]) {
  disposeFeatureLineGroup(valleyGuideGroup3D)
  disposeFeatureLineGroup(valleyGuideProjectionGroup)
  if (path.length < 2) return
  const surface: number[] = []
  const projection: number[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!
    const b = path[i + 1]!
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.0018))
    for (let k = 0; k < count; k++) {
      const t = k / count
      const nx = a.x + (b.x - a.x) * t
      const nz = a.z + (b.z - a.z) * t
      const x = (nx - 0.5) * TERRAIN_SIZE
      const z = (0.5 - nz) * TERRAIN_SIZE
      surface.push(x, sampleTerrainHeightAtSceneXZ(x, z) + 0.028, z)
      projection.push(x, BASE_PLANE_Y + 0.022, z)
    }
  }
  const end = path[path.length - 1]!
  const ex = (end.x - 0.5) * TERRAIN_SIZE
  const ez = (0.5 - end.z) * TERRAIN_SIZE
  surface.push(ex, sampleTerrainHeightAtSceneXZ(ex, ez) + 0.028, ez)
  projection.push(ex, BASE_PLANE_Y + 0.022, ez)
  addDashedGuideLine(valleyGuideGroup3D, surface, {
    color: 0x46b5ff,
    outlineColor: 0x103458,
    dashSize: 0.055,
    gapSize: 0.04,
    opacity: 0.92,
  })
  addDashedGuideLine(valleyGuideProjectionGroup, projection, {
    color: 0x46b5ff,
    outlineColor: 0x103458,
    dashSize: 0.055,
    gapSize: 0.04,
    opacity: 0.92,
  })
}

function onToggleRidgeLines() {
  // 学习模式不显示提示线，避免直接透露山脊题的答案。
  const enabled = showRidgeLines.value && !learningMode.value
  if (ridgeGroup3D) ridgeGroup3D.visible = enabled && showTerrain.value
  if (ridgeProjectionGroup) ridgeProjectionGroup.visible = enabled && showProjection.value
  invalidateSceneRender()
}

function onToggleValleyGuides() {
  const enabled = showValleyRiver.value && !learningMode.value && ['all', 'valley'].includes(terrainGenType.value)
  if (valleyGuideGroup3D) valleyGuideGroup3D.visible = enabled && showTerrain.value
  if (valleyGuideProjectionGroup) valleyGuideProjectionGroup.visible = enabled && showProjection.value
  invalidateSceneRender()
}

function contourContainsXZ(points: Float32Array, x: number, z: number): boolean {
  let inside = false
  const count = points.length / 3
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const xi = points[i * 3]!, zi = points[i * 3 + 2]!
    const xj = points[j * 3]!, zj = points[j * 3 + 2]!
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

function buildBasinContourHints(segments: ContourSegment[], levels: number[]) {
  basinContourAnnotations = []
  const basin = getActiveBasin()
  if (!basin) return
  const centerX = (basin.cx - 0.5) * TERRAIN_SIZE
  const centerZ = (0.5 - basin.cz) * TERRAIN_SIZE
  const floor = findBasinFloorAnchor(basin)
  const floorHeight = sampleRealHeightNormalized(floor.x, floor.z)
  const closed: { level: number; points: Float32Array }[] = []
  for (const level of levels) {
    if (level <= floorHeight + 0.1) continue
    for (const points of connectContourPolylines(segments, level, getDisplayHeight(level))) {
      if (points.length < 12) continue
      const last = points.length - 3
      if (Math.hypot(points[0]! - points[last]!, points[2]! - points[last + 2]!) > CONTOUR_CONNECT_EPSILON) continue
      if (!contourContainsXZ(points, centerX, centerZ)) continue
      let withinBasin = true
      for (let i = 0; i < points.length; i += 3) {
        const r = Math.hypot(
          (points[i]! - centerX) / (basin.rx * TERRAIN_SIZE),
          (points[i + 2]! - centerZ) / (basin.rz * TERRAIN_SIZE),
        )
        if (r > 1.08) { withinBasin = false; break }
      }
      if (withinBasin) { closed.push({ level, points }); break }
    }
  }
  if (!closed.length) return
  // 只在最外侧那条“内低外高”的闭合等高线上画向盆内的短示坡线。
  const outer = closed[closed.length - 1]!
  const line = outer.points
  const surfaceTicks: Float32Array[] = []
  const projectionTicks: Float32Array[] = []
  let accumulated = 0
  let lastTickDistance = -Infinity
  for (let i = 3; i < line.length; i += 3) {
    const x = line[i]!, z = line[i + 2]!
    accumulated += Math.hypot(x - line[i - 3]!, z - line[i - 1]!)
    if (accumulated - lastTickDistance < 0.105) continue
    const distance = Math.hypot(centerX - x, centerZ - z)
    if (distance < 0.04) continue
    const length = Math.min(0.026, distance * 0.10)
    const ex = x + (centerX - x) / distance * length
    const ez = z + (centerZ - z) / distance * length
    const sy = sampleTerrainHeightAtSceneXZ(x, z) + 0.01
    const ey = sampleTerrainHeightAtSceneXZ(ex, ez) + 0.01
    if (ey >= sy - 0.0002) continue
    surfaceTicks.push(new Float32Array([x, sy, z, ex, ey, ez]))
    projectionTicks.push(new Float32Array([x, BASE_PLANE_Y + 0.010, z, ex, BASE_PLANE_Y + 0.010, ez]))
    lastTickDistance = accumulated
  }
  const surface = createMergedContourSegments(surfaceTicks, 0x5a0d9a, 0.95, 11)
  const projection = createMergedContourSegments(projectionTicks, 0x8833aa, 0.95, 11)
  if (surface) contourGroup3D.add(surface)
  if (projection) projectionGroup.add(projection)

  const selectedIndices = [...new Set([0, Math.floor((closed.length - 1) / 2), closed.length - 1])]
  const angles = [0.45, 2.60, 4.35]
  selectedIndices.forEach((index, labelIndex) => {
    const contour = closed[index]!
    const angle = angles[labelIndex] ?? 0
    let chosen = { x: contour.points[0]!, z: contour.points[2]!, level: contour.level }
    let bestScore = -Infinity
    for (let i = 0; i < contour.points.length; i += 3) {
      const x = contour.points[i]!, z = contour.points[i + 2]!
      const dx = x - centerX, dz = z - centerZ
      const score = (dx * Math.cos(angle) + dz * Math.sin(angle)) / Math.max(1e-8, Math.hypot(dx, dz))
      if (score > bestScore) { bestScore = score; chosen = { x, z, level: contour.level } }
    }
    basinContourAnnotations.push(chosen)
  })
}

function addBasinElevationLabels() {
  if (learningMode.value) return
  for (const marker of basinContourAnnotations) {
    const makeLabel = () => {
      const div = document.createElement('div')
      div.textContent = `${marker.level}m`
      div.style.cssText = 'color:#fff;font-weight:700;font-family:"Microsoft YaHei",sans-serif;'
        + 'padding:1px 4px;border-radius:4px;white-space:nowrap;pointer-events:none;'
        + 'background:rgba(37,17,48,0.72);text-shadow:0 1px 2px #000;'
      div.style.fontSize = `${Math.max(11, 13 * uiScale.value)}px`
      return new CSS2DObject(div)
    }
    const surface = makeLabel()
    surface.position.set(marker.x, sampleTerrainHeightAtSceneXZ(marker.x, marker.z) + 0.035, marker.z)
    surface.name = 'basinContourLabel'
    featureLabelGroup.add(surface)
    const projection = makeLabel()
    projection.name = 'projectionElevationLabel'
    projection.position.set(marker.x, BASE_PLANE_Y + 0.035, marker.z)
    projectionGroup.add(projection)
  }
}


// ============================================================
// 场景初始化 — 更亮的灯光
// ============================================================
function initScene() {
  const container =
    threeContainerRef.value

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
    MAX_RENDER_DPR
  )

  scene = new THREE.Scene()
  scene.background =
    new THREE.Color(0x101520)

  // 天空穹顶 + 距离雾：给场景纵深，避免空旷
  const skyGeo = new THREE.SphereGeometry(60, 32, 16)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4a90d9) },
      bottomColor: { value: new THREE.Color(0xcfd8e3) },
      exponent: { value: 0.75 },
    },
    vertexShader:
      'varying vec3 vWorld; void main(){ vWorld = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 topColor; uniform vec3 bottomColor; uniform float exponent; varying vec3 vWorld; void main(){ float h = max(normalize(vWorld).y, 0.0); gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, exponent)), 1.0); }',
  })
  const sky = new THREE.Mesh(skyGeo, skyMat)
  sky.name = 'skyDome'
  scene.add(sky)
  scene.fog = new THREE.Fog(0xcfd8e3, 18, 55)

  camera =
    new THREE.PerspectiveCamera(
      40,
      width / height,
      0.1,
      100
    )

  // 默认前视图（正面对齐地形）
  camera.position.set(
    0,
    2.5,
    7.0
  )

  camera.lookAt(
    0,
    0.8,
    0
  )

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference:
        'high-performance',
    })

  /*
   * 必须先设置 DPR，再同步真实尺寸。
   * 避免默认 300×150 drawing buffer 被 CSS 拉伸。
   */
  renderer.setPixelRatio(dpr)

  renderer.setSize(
    width,
    height,
    false
  )

  renderer.domElement.className =
    'three-canvas terrain-renderer-canvas'

  lastSceneWidth = width
  lastSceneHeight = height
  lastSceneDpr = dpr

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // 灯光和场景平时均为静态，阴影只在地形几何变化后重绘。
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.4
  container.appendChild(
    renderer.domElement
  )

  labelRenderer =
    new CSS2DRenderer()

  labelRenderer.setSize(
    width,
    height
  )
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  container.appendChild(
    labelRenderer.domElement
  )

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.8, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.5
  controls.maxDistance = 14
  // 限制相机进入完全俯视/仰视区域，既避开极点奇异，也降低整张地形与
  // 投影同时铺满视口时的渲染压力。
  const polarSafetyMargin = THREE.MathUtils.degToRad(8)
  controls.minPolarAngle = polarSafetyMargin
  controls.maxPolarAngle = Math.PI - polarSafetyMargin
  controls.addEventListener('start', () => {
    cameraInteractionActive = true
    invalidateSceneRender()
  })
  controls.addEventListener('end', () => {
    cameraInteractionActive = false
    invalidateSceneRender()
  })
  controls.addEventListener('change', invalidateSceneRender)
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
  profileGroup = new THREE.Group()
  profileGroup.name = 'profileGroup'
  ridgeGroup3D = new THREE.Group()
  ridgeGroup3D.name = 'ridgeGroup3D'
  ridgeProjectionGroup = new THREE.Group()
  ridgeProjectionGroup.name = 'ridgeProjectionGroup'
  valleyRiverGroup = new THREE.Group()
  valleyRiverGroup.name = 'valleyRiverGroup'
  valleyGuideGroup3D = new THREE.Group()
  valleyGuideGroup3D.name = 'valleyGuideGroup3D'
  valleyGuideProjectionGroup = new THREE.Group()
  valleyGuideProjectionGroup.name = 'valleyGuideProjectionGroup'

  scene.add(terrainGroup)
  scene.add(contourGroup3D)
  scene.add(projectionGroup)
  scene.add(projectionLineGroup)
  scene.add(projectionColoringGroup)
  scene.add(terrainLabelGroup)
  scene.add(featureLabelGroup)
  scene.add(profileGroup)
  scene.add(ridgeGroup3D)
  scene.add(ridgeProjectionGroup)
  scene.add(valleyRiverGroup)
  scene.add(valleyGuideGroup3D)
  scene.add(valleyGuideProjectionGroup)
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
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.025
  scene.add(sun)

  const fill = new THREE.DirectionalLight(0x4488cc, 0.5)
  fill.position.set(-3, 3, -4)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0x88ccff, 0.35)
  rim.position.set(-1, -2, -5)
  scene.add(rim)
}

// ============================================================
// 程序化地面纹理 — 可平铺 fbm 值噪声（albedo + bump）
// ============================================================
function texHash2(xi: number, yi: number, period: number): number {
  const x = ((xi % period) + period) % period
  const y = ((yi % period) + period) % period
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function texSmooth(t: number): number { return t * t * (3 - 2 * t) }
function texValueNoise(x: number, y: number, period: number): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const a = texHash2(xi, yi, period), b = texHash2(xi + 1, yi, period)
  const c = texHash2(xi, yi + 1, period), d = texHash2(xi + 1, yi + 1, period)
  const u = texSmooth(xf), v = texSmooth(yf)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function texFbm(x: number, y: number, period: number, octaves = 5): number {
  let f = 0, amp = 0.5, freq = 1
  for (let o = 0; o < octaves; o++) {
    f += amp * texValueNoise(x * freq, y * freq, period * freq)
    amp *= 0.5; freq *= 2
  }
  return f
}

let groundAlbedo: THREE.CanvasTexture | null = null
let groundBump: THREE.CanvasTexture | null = null

function getGroundTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (groundAlbedo && groundBump) return { map: groundAlbedo, bump: groundBump }
  const S = 256
  const period = 8
  const albedoCanvas = document.createElement('canvas')
  albedoCanvas.width = S; albedoCanvas.height = S
  const bumpCanvas = document.createElement('canvas')
  bumpCanvas.width = S; bumpCanvas.height = S
  const actx = albedoCanvas.getContext('2d')!
  const bctx = bumpCanvas.getContext('2d')!
  const aImg = actx.createImageData(S, S)
  const bImg = bctx.createImageData(S, S)

  const baseA = [172, 168, 162]
  const baseB = [142, 138, 132]
  const soilA = [152, 136, 118]
  const soilB = [122, 114, 106]
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = x / S * period, ny = y / S * period
      const base = texFbm(nx, ny, period, 5)
      const rockMask = Math.max(0, Math.min(1, (texFbm(nx + 3.7, ny + 1.3, period, 4) - 0.45) * 2.4))
      const grain = texFbm(nx * 4, ny * 4, period * 4, 3)
      let r = baseB[0] + (baseA[0] - baseB[0]) * base
      let g = baseB[1] + (baseA[1] - baseB[1]) * base
      let b = baseB[2] + (baseA[2] - baseB[2]) * base
      const sr = soilB[0] + (soilA[0] - soilB[0]) * grain
      const sg = soilB[1] + (soilA[1] - soilB[1]) * grain
      const sb = soilB[2] + (soilA[2] - soilB[2]) * grain
      r = r + (sr - r) * rockMask
      g = g + (sg - g) * rockMask
      b = b + (sb - b) * rockMask
      const shade = 0.85 + grain * 0.3
      const idx = (y * S + x) * 4
      aImg.data[idx] = Math.max(0, Math.min(255, r * shade))
      aImg.data[idx + 1] = Math.max(0, Math.min(255, g * shade))
      aImg.data[idx + 2] = Math.max(0, Math.min(255, b * shade))
      aImg.data[idx + 3] = 255
      const bv = Math.max(0, Math.min(255, (base * 0.6 + grain * 0.4) * 255))
      bImg.data[idx] = bv; bImg.data[idx + 1] = bv; bImg.data[idx + 2] = bv; bImg.data[idx + 3] = 255
    }
  }
  actx.putImageData(aImg, 0, 0)
  bctx.putImageData(bImg, 0, 0)

  groundAlbedo = new THREE.CanvasTexture(albedoCanvas)
  groundBump = new THREE.CanvasTexture(bumpCanvas)
  for (const t of [groundAlbedo, groundBump]) {
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(6, 6)
    t.anisotropy = 4
  }
  groundAlbedo.colorSpace = THREE.SRGBColorSpace
  return { map: groundAlbedo, bump: groundBump }
}

function attachGridUV(geo: THREE.BufferGeometry) {
  const uv = new Float32Array(GRID_SIZE * GRID_SIZE * 2)
  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE; i++) {
      const idx = (j * GRID_SIZE + i) * 2
      uv[idx] = i / (GRID_SIZE - 1)
      uv[idx + 1] = 1 - j / (GRID_SIZE - 1)
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
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
  attachGridUV(geo)
  geo.computeVertexNormals()

  const { map, bump } = getGroundTextures()
  terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map,
    bumpMap: bump,
    bumpScale: 0.02,
    roughness: 0.96,
    metalness: 0.02,
    side: THREE.DoubleSide,
    flatShading: false,
  })
  terrainMesh = new THREE.Mesh(geo, terrainMaterial)
  terrainMesh.castShadow = true
  terrainMesh.receiveShadow = true
  terrainMesh.name = 'terrainMesh'
  terrainGroup.add(terrainMesh)
  invalidateTerrainShadow()
}

// ============================================================
// 等高线 & 投影
// ============================================================
function buildContoursAndProjection() {
  // 清空分组
  ;[contourGroup3D, projectionGroup, projectionLineGroup, projectionColoringGroup].forEach(g => {
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

  // 陡崖处不能再平滑移动等高线的 X/Z，否则同一条线会偏离原来的海拔。
  // 128×128 网格的三角面求交点已足够细，保留原始求交结果。
  const SMOOTH_ITER = 0

  // 1. 3D 地形表面等高线 — 先平滑，再重新采样山体表面并抬升，避免卡进山体
  const surfaceContourPolylines: Float32Array[] = []
  for (const level of levels) {
    const y = getDisplayHeight(level)
    const rawPolylines = connectContourPolylines(segments, level, y)
    for (const pts of rawPolylines) {
      const smoothPts =
        chaikinSmooth(
          pts,
          SMOOTH_ITER
        )

      const liftedPts =
        liftContourToTerrainSurface(
          smoothPts
        )
      surfaceContourPolylines.push(liftedPts)
    }
  }
  const surfaceContours = createMergedContourSegments(
    surfaceContourPolylines,
    0x5a0d9a,
    0.92,
    10,
  )
  if (surfaceContours) contourGroup3D.add(surfaceContours)

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

  // 4. 2D 投影等高线 — 紫红色
  const projectionContourPolylines: Float32Array[] = []
  for (const level of levels) {
    const rawPolylines = connectContourPolylines(segments, level, BASE_PLANE_Y + 0.005)
    for (const pts of rawPolylines) {
      projectionContourPolylines.push(chaikinSmooth(pts, SMOOTH_ITER))
    }
  }
  const projectionContours = createMergedContourSegments(
    projectionContourPolylines,
    0x8833aa,
    0.9,
    10,
  )
  if (projectionContours) projectionGroup.add(projectionContours)

  // 5. 垂直投影虚线
  buildProjectionLines(segments)

  // 6. 投影分层设色
  buildProjectionColoring(segments)
  buildBasinContourHints(segments, levels)
  onToggleTerrain()
  onToggleProjection()
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
  for (const [level, segs] of levelMap) {
    const y3D = getDisplayHeight(level)
    for (let i = 0; i < segs.length; i += PROJECTION_LINE_SAMPLE_STEP) {
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
      positions[idx] = (i / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
      positions[idx + 1] = BASE_PLANE_Y + 0.002
      positions[idx + 2] = (j / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
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
// 默认双峰地形的脊线中心线（与 getNormalizedHeight 一致）
function defaultZc(x: number): number {
  return 0.50 - 0.15 * (x - 0.5)
}

function computeFeatureAnchorsFromHeightfield() {
  if (terrainGenType.value === 'valley') {
    const { cx, cz } = currentTerrainParams
    const z = 0.60
    currentFeaturePositions = Object.fromEntries(
      Object.entries(DEFAULT_FEATURE_POSITIONS).map(([type, point]) => [type, { ...point }])
    )
    currentFeaturePositions.valley = { x: generatedValleyAxisX(z, cx, cz), z }
    return
  }
  // 默认设计地形：锚点直接取设计位置，保证鞍部在垭口、山脊在峰侧脊线、山谷在鞍部下游
  if (terrainGenType.value === 'all') {
    // 支脊融合后峰顶位置略有变化，标签跟随实际网格的最高点。
    let peak = { x: 0.68, z: defaultZc(0.68) }
    let peakHeight = -Infinity
    for (let j = 0; j < heightsData.length; j++) {
      const row = heightsData[j]
      for (let i = 0; i < row.length; i++) {
        const height = row[i]
        if (height > peakHeight) {
          peakHeight = height
          peak = { x: i / (GRID_SIZE - 1), z: 1 - j / (GRID_SIZE - 1) }
        }
      }
    }
    currentFeaturePositions = {
      peak,
      saddle: findDefaultSaddleAnchor(),
      ridge: findMainRidgeAnchor(0.85),
      valley: { x: 0.47, z: defaultZc(0.47) + 0.30 },
      cliff: findCliffFaceAnchor(0.32, defaultCliffEdge(0.32)),
      steep: { x: 0.36, z: defaultZc(0.36) - 0.08 },
      gentle: { x: 0.68, z: defaultZc(0.68) + 0.28 },
      basin: findBasinFloorAnchor(DEFAULT_BASIN),
    }
    return
  }
  const N = GRID_SIZE
  if (!heightsData.length || !heightsData[0]?.length) return
  const M = 3
  const at = (j: number, i: number) => heightsData[j]?.[i] ?? 0
  const norm = (j: number, i: number): TerrainFeaturePosition => ({ x: i / (N - 1), z: 1 - j / (N - 1) })
  const grad = (j: number, i: number) => {
    const dx = (at(j, i + 1) - at(j, i - 1)) / 2
    const dz = (at(j + 1, i) - at(j - 1, i)) / 2
    return Math.hypot(dx, dz)
  }
  // 横向曲率：小于 0 = 槽底（谷），大于 0 = 脊顶
  const cross = (j: number, i: number) => {
    const hx = at(j, i) - (at(j, i - 1) + at(j, i + 1)) / 2
    const hz = at(j, i) - (at(j - 1, i) + at(j + 1, i)) / 2
    return Math.min(hx, hz)
  }
  const taken: TerrainFeaturePosition[] = []
  const dist = (a: TerrainFeaturePosition, b: TerrainFeaturePosition) => Math.hypot(a.x - b.x, a.z - b.z)
  const pick = (score: (j: number, i: number) => number, minDist: number) => {
    let best: TerrainFeaturePosition | null = null
    let bestS = -Infinity
    for (let j = M; j < N - M; j++) {
      for (let i = M; i < N - M; i++) {
        const p = norm(j, i)
        if (taken.some(t => dist(t, p) < minDist)) continue
        const s = score(j, i)
        if (s > bestS) { bestS = s; best = p }
      }
    }
    if (best) taken.push(best)
    return best
  }

  const peak = pick((j, i) => at(j, i), 0)
  let hmin = Infinity, hmax = -Infinity
  for (let j = M; j < N - M; j++) for (let i = M; i < N - M; i++) {
    const h = at(j, i); if (h < hmin) hmin = h; if (h > hmax) hmax = h
  }
  const hrange = Math.max(1e-6, hmax - hmin)
  const mid = (hmin + hmax) / 2
  // 鞍部 = 临界点（梯度小）且 Hessian 行列式为负；取其中海拔最低者 = 真正的垭口
  const saddleScore = (j: number, i: number) => {
    const hh = at(j, i)
    if (hh < mid) return -Infinity
    const g = grad(j, i) / hrange * N
    if (g > 0.5) return -Infinity
    const hxx = (at(j, i - 1) - 2 * hh + at(j, i + 1)) / hrange * N * N
    const hzz = (at(j - 1, i) - 2 * hh + at(j + 1, i)) / hrange * N * N
    const hxz = (at(j + 1, i + 1) - at(j + 1, i - 1) - at(j - 1, i + 1) + at(j - 1, i - 1)) / 4 / hrange * N * N
    const det = hxx * hzz - hxz * hxz
    if (det >= 0) return -Infinity
    return -hh
  }
  const saddle = pick(saddleScore, 0.15)
  const basin: TerrainFeaturePosition = getActiveBasin()
    ? findBasinFloorAnchor(getActiveBasin()!)
    : { ...DEFAULT_FEATURE_POSITIONS.basin }
  taken.push(basin)
  const cliff = pick((j, i) => grad(j, i), 0.12)
  const steep = pick((j, i) => grad(j, i), 0.15)
  const gentle = pick((j, i) => -grad(j, i) - Math.abs(at(j, i) - mid) * 2, 0.15)
  // 山谷 = 中低海拔的槽底（谷头不到山顶），且避开盆地周边
  const valleyScore = (j: number, i: number) => {
    const p = norm(j, i)
    if (dist(p, basin) < 0.28) return -Infinity
    if (at(j, i) >= mid) return -Infinity
    return -cross(j, i)
  }
  const valley = pick(valleyScore, 0.12)
  // 山脊 = 中等海拔带（山侧面）的脊线 crest，不取主脊顶
  const ridgeScore = (j: number, i: number) => {
    const hh = at(j, i)
    if (hh < mid || hh > mid + 0.30 * hrange) return -Infinity
    const hxx = at(j, i - 1) - 2 * hh + at(j, i + 1)
    const hzz = at(j - 1, i) - 2 * hh + at(j + 1, i)
    const hxz = (at(j + 1, i + 1) - at(j + 1, i - 1) - at(j - 1, i + 1) + at(j - 1, i - 1)) / 4
    const tr = hxx + hzz
    const det = hxx * hzz - hxz * hxz
    const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det))
    const eMin = tr / 2 - disc
    const eMax = tr / 2 + disc
    return -eMin - Math.abs(eMax)
  }
  const ridge = pick(ridgeScore, 0.12)
  const resolvedSaddle = terrainGenType.value === 'saddle'
    ? findGeneratedSaddleAnchor(currentTerrainParams.cx, currentTerrainParams.cz)
    : (saddle ?? DEFAULT_FEATURE_POSITIONS.saddle)

  currentFeaturePositions = {
    peak: peak ?? DEFAULT_FEATURE_POSITIONS.peak,
    saddle: resolvedSaddle,
    ridge: ridge ?? DEFAULT_FEATURE_POSITIONS.ridge,
    valley: valley ?? DEFAULT_FEATURE_POSITIONS.valley,
    cliff: terrainGenType.value === 'cliff'
      ? findCliffFaceAnchor(currentTerrainParams.cx, currentTerrainParams.cz)
      : (cliff ?? DEFAULT_FEATURE_POSITIONS.cliff),
    steep: steep ?? DEFAULT_FEATURE_POSITIONS.steep,
    gentle: gentle ?? DEFAULT_FEATURE_POSITIONS.gentle,
    basin,
  }
}

const labelRaycaster = new THREE.Raycaster()
const labelRayDir = new THREE.Vector3()
const labelWorldPos = new THREE.Vector3()
let renderFrameCounter = 0

// 文字标签允许被地形遮挡：被山体挡住的标签隐藏
function updateFeatureLabelOcclusion() {
  if (!terrainMesh || !featureLabelGroup.visible) return
  for (const child of featureLabelGroup.children) {
    const obj = child as CSS2DObject
    const el = obj.element as HTMLElement | undefined
    if (!el) continue
    obj.getWorldPosition(labelWorldPos)
    labelRayDir.copy(labelWorldPos).sub(camera.position)
    const distance = labelRayDir.length()
    if (distance < Number.EPSILON) { el.style.visibility = 'visible'; continue }
    labelRayDir.divideScalar(distance)
    labelRaycaster.set(camera.position, labelRayDir)
    labelRaycaster.far = distance - 0.05
    const hit = labelRaycaster.intersectObject(terrainMesh, false).length > 0
    labelRaycaster.far = Infinity
    el.style.visibility = hit ? 'hidden' : 'visible'
  }
}

function buildLabels(recalculateAnchors = true) {
  if (recalculateAnchors) computeFeatureAnchorsFromHeightfield()
  buildRidgeLines()
  buildValleyRiverBand()
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
  addRiverElevationLabels()
  addBasinElevationLabels()
  onToggleFeatureLabels()
  invalidateSceneRender()
}

function addElevationLabels() {
  // 标签重建前先移除旧的投影海拔数字，避免叠加。
  for (const child of [...projectionGroup.children]) {
    if (child.name === 'projectionElevationLabel') child.removeFromParent()
  }
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
    div.style.fontSize = `${14 * uiScale.value}px`
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
      const marker = all[Math.floor(all.length * 0.35)]
      if (marker) markers.push({ level, x: marker.x, z: marker.z })
    }
  }
  for (const m of markers) {
    const div = document.createElement('div')
    div.textContent = `${m.level}m`
    div.style.color = '#ffffff'
    div.style.fontSize = `${13 * uiScale.value}px`
    div.style.fontWeight = 'bold'
    div.style.fontFamily = '"Microsoft YaHei", sans-serif'
    div.style.whiteSpace = 'nowrap'
    div.style.textShadow = '0 0 3px rgba(0,0,0,0.9)'
    const label = new CSS2DObject(div)
    label.position.set(m.x, BASE_PLANE_Y + 0.05, m.z)
    // 放入 projectionGroup，关闭投影时一同隐藏
    label.name = 'projectionElevationLabel'
    projectionGroup.add(label)
  }
}

function addFeatureLabels() {
  // 学习模式下不显示地形标签（避免透漏答案）
  if (learningMode.value) return
  // 根据当前地形生成类型，只显示对应标签
  const allFeatures = [
    { type: 'peak', text: '山顶', color: '#ff6b6b' },
    { type: 'saddle', text: '鞍部', color: '#f9ca24' },
    { type: 'ridge', text: '山脊', color: '#2bcbba' },
    { type: 'valley', text: '山谷', color: '#45aaf2' },
    { type: 'cliff', text: '陡崖', color: '#fd7944' },
    { type: 'steep', text: '陡坡', color: '#e67e22' },
    { type: 'gentle', text: '缓坡', color: '#778ca3' },
    { type: 'basin', text: '盆地', color: '#a78bfa' },
  ]
  const currentType = terrainGenType.value
  // "全部"显示所有标签，否则只显示对应的那一个
  const showTypes = currentType === 'all'
    ? allFeatures.map(f => f.type)
    : [currentType]

  const baseFont = 16 * uiScale.value
  for (const f of allFeatures) {
    if (!showTypes.includes(f.type)) continue
    const position = currentFeaturePositions[f.type] ?? DEFAULT_FEATURE_POSITIONS[f.type]
    if (!position) continue
    const labelX = (position.x - 0.5) * TERRAIN_SIZE
    // 高度数据的行坐标使用 z = 1 - row；转换到场景时必须反转 Z 轴。
    const labelZ = (0.5 - position.z) * TERRAIN_SIZE
    const labelY = sampleTerrainHeightAtSceneXZ(labelX, labelZ) + 0.08

    const div = document.createElement('div')
    div.textContent = f.text
    div.className = 'feature-label'
    div.style.color = '#fff'
    div.style.fontSize = `${baseFont}px`
    div.style.fontWeight = 'bold'
    div.style.fontFamily = '"Microsoft YaHei", sans-serif'
    div.style.background = f.color
    div.style.padding = `${4 * uiScale.value}px ${12 * uiScale.value}px`
    div.style.borderRadius = `${12 * uiScale.value}px`
    div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)'
    div.style.whiteSpace = 'nowrap'
    div.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)'
    const label = new CSS2DObject(div)
    label.position.set(labelX, labelY, labelZ)
    featureLabelGroup.add(label)
  }
}

function onContourIntervalChange() {
  if (contourDebounceTimer !== null) clearTimeout(contourDebounceTimer)
  contourDebounceTimer = window.setTimeout(() => {
    buildContoursAndProjection()
    buildLabels(false)
    contourDebounceTimer = null
  }, 150)
}

function onToggleFeatureLabels() {
  featureLabelGroup.visible = showFeatureLabels.value && showTerrain.value
  invalidateSceneRender()
}

function onToggleTerrain() {
  const visible = showTerrain.value
  terrainGroup.visible = visible
  contourGroup3D.visible = visible
  terrainLabelGroup.visible = visible
  // 特征标签也跟随地形显示：地形关闭时隐藏，地形开启时由开关决定
  featureLabelGroup.visible = visible && showFeatureLabels.value
  onToggleRidgeLines()
  onToggleValleyRiver()
  invalidateSceneRender()
}

// ============================================================
// 视角切换 — 前/后/左/右/顶/底
// ============================================================
const VIEW_PRESETS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  front: { pos: [0, 2.5, 7.0], target: [0, 0.8, 0] },
  back: { pos: [0, 2.5, -7.0], target: [0, 0.8, 0] },
  left: { pos: [-7.0, 2.5, 0], target: [0, 0.8, 0] },
  right: { pos: [7.0, 2.5, 0], target: [0, 0.8, 0] },
  // 顶/底预设与 OrbitControls 的 8° 安全角保持一致。
  top: { pos: [0, 8.5, 1.2], target: [0, 0, 0] },
  bottom: { pos: [0, -7.0, 1.0], target: [0, 0, 0] },
}

function setView(view: keyof typeof VIEW_PRESETS) {
  if (!camera || !controls) return
  const preset = VIEW_PRESETS[view]
  if (!preset) return
  camera.position.set(preset.pos[0], preset.pos[1], preset.pos[2])
  controls.target.set(preset.target[0], preset.target[1], preset.target[2])
  camera.lookAt(preset.target[0], preset.target[1], preset.target[2])
  controls.update()
  invalidateSceneRender()
}


function updateViewCubeDockPosition() {
  const el =
    viewCube.value

  if (!el) {
    return
  }

  const gap =
    layoutMode.value === 'small'
      ? 8
      : layoutMode.value === 'medium'
        ? 10
        : 14

  el.style.setProperty(
    'left',
    'auto',
    'important'
  )

  el.style.setProperty(
    'right',
    `${gap}px`,
    'important'
  )
}

function updateViewCube() {
  // 跟随相机实时旋转立方体（与参考图项目一致）
  const el = viewCube.value
  if (!el || !camera) return
  const target = controls?.target ?? new THREE.Vector3(0, 0, 0)
  viewCubeCameraOffset.copy(camera.position).sub(target)
  const distance = Math.max(viewCubeCameraOffset.length(), Number.EPSILON)
  const p = Math.asin(Math.max(-1, Math.min(1, viewCubeCameraOffset.y / distance)))
  const y = Math.atan2(viewCubeCameraOffset.x, viewCubeCameraOffset.z)
  // 立方体边长 60px（基础），响应式缩放
  const halfSize = 30 * uiScale.value
  const transform = `translateZ(${-halfSize}px) rotateX(${-p}rad) rotateY(${-y}rad)`
  if (transform !== lastViewCubeTransform) {
    el.style.transform = transform
    lastViewCubeTransform = transform
  }
}

function bindViewCube() {
  const el = viewCube.value
  if (!el) return
  // 6 个面点击切换视角
  const faces = el.querySelectorAll<HTMLDivElement>('.vc-face')
  faces.forEach(face => {
    face.addEventListener('click', () => {
      const view = face.dataset.view as keyof typeof VIEW_PRESETS | undefined
      if (view) setView(view)
    })
  })
}

// ============================================================
// 响应式缩放 — 根据视口分辨率自动调节 UI 尺寸
// ============================================================
function applyResponsiveScale() {
  if (!threeContainerRef.value) return
  const w = threeContainerRef.value.clientWidth
  const h = threeContainerRef.value.clientHeight

  // 基准尺寸：1920×1080 → scale=1
  // 平板端 (1024~1366) → scale ~0.9
  // 小屏 (< 1024) → scale ~0.75
  const diag = Math.hypot(w, h)
  let scale = 1
  if (diag >= 2200) scale = 1.2           // 大屏 2K+
  else if (diag >= 1700) scale = 1.0      // 常规桌面
  else if (diag >= 1400) scale = 0.9      // 13 寸笔记本
  else if (diag >= 1100) scale = 0.8      // 平板横屏
  else scale = 0.7                        // 平板竖/小屏

  uiScale.value = scale
  const root =
    pageRef.value ||
    threeContainerRef.value

  if (root) {
    root.style.setProperty(
      '--ui-scale',
      String(scale)
    )
  }
}

function onToggleTransparent() {
  // 只切换材质，不重建高度场；否则退出透明时会把随机盆地/陡崖换回默认双峰。
  const transparent = terrainTransparent.value
  terrainMaterial.transparent = transparent
  terrainMaterial.opacity = transparent ? 0.12 : 1
  terrainMaterial.depthWrite = !transparent
  terrainMaterial.color.setHex(transparent ? 0x88ccaa : 0xffffff)
  terrainMaterial.vertexColors = !transparent
  terrainMaterial.needsUpdate = true
  invalidateTerrainShadow()
}

function onToggleProjection() {
  projectionGroup.visible = showProjection.value
  projectionLineGroup.visible = showProjection.value && showProjectionLines.value
  projectionColoringGroup.visible = showProjection.value && showProjectionColoring.value
  onToggleRidgeLines()
  onToggleValleyGuides()
  invalidateSceneRender()
}

function onToggleProjectionLines() {
  projectionLineGroup.visible = showProjectionLines.value && showProjection.value
  invalidateSceneRender()
}

function onToggleProjectionColoring() {
  projectionColoringGroup.visible = showProjectionColoring.value && showProjection.value
  invalidateSceneRender()
}



// ============================================================
// 随机地形生成
// ============================================================
const TERRAIN_SEEDS: Record<string, (x: number, z: number, params?: { cx: number; cz: number }) => number> = {
  peak: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return 0.95 * gauss2d(x, z, cx, cz, 0.14, 0.16) + 0.50 * gauss2d(x, z, cx - 0.05, cz - 0.05, 0.10, 0.10) + 0.04
  },
  saddle: (x, z, p) => {
    // 两座山 + 中间鞍部：沿连线方向为极小、垂直方向为极大（垭口）
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    const peak1 = 0.80 * gauss2d(x, z, cx - 0.15, cz, 0.10, 0.12)
    const peak2 = 0.80 * gauss2d(x, z, cx + 0.15, cz, 0.10, 0.12)
    const dip = -0.45 * gauss2d(x, z, cx, cz, 0.08, 0.30)
    return Math.max(0, peak1 + peak2 + dip + 0.04)
  },
  ridge: (x, z, p) => {
    // 从高处向低处延伸的细长山脊（等高线向低处凸出）
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return 0.55 * gauss2d(x, z, cx, cz, 0.35, 0.06) + 0.04
  },
  valley: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    // 横向两侧高、谷底低；纵向上游高、下游低，允许平面轻微弯曲。
    return generatedValleyHeight(x, z, cx, cz)
  },
  cliff: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    const mask = smoothStep01((x - (cx - 0.29)) / 0.10)
      * smoothStep01(((cx + 0.29) - x) / 0.10)
    const edge = cz + 0.008 * Math.sin((x - cx) * 14)
    const upperSide = smoothStep01((z - edge + 0.0025) / 0.005)
    // 崖上缓平台 → 连续近直立崖壁 → 崖下缓平台，不再向外无限增大落差。
    return 0.20 + 0.045 * (z - cz) + 0.46 * mask * upperSide
  },
  steep: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return 0.35 * gauss2d(x, z, cx, cz, 0.12, 0.12) + 0.04
  },
  gentle: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return 0.15 * gauss2d(x, z, cx, cz, 0.20, 0.20) + 0.04
  },
  basin: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return blendBasinHeight(0.18 + 0.012 * (x - cx), x, z, {
      cx, cz, rx: 0.22, rz: 0.20, floor: 0.12, rim: 0.54,
    })
  },
  all: (x, z) => getNormalizedHeight(x, z),
}

function generateRandomTerrain() {
  if (generatingTerrain.value) return
  generatingTerrain.value = true

  const type = terrainGenType.value
  const genFn = TERRAIN_SEEDS[type]
  if (!genFn) { generatingTerrain.value = false; return }

  // 异步生成防止 UI 卡死
  setTimeout(() => {
    const newHeights: number[][] = []
    let newMax = 0

    if (type === 'all') {
      currentTerrainParams = { cx: 0.5, cz: 0.5 }
      // "全部"：固定使用设计好的双峰标准地形，保证地貌与标签锚点一致
      for (let j = 0; j < GRID_SIZE; j++) {
        newHeights[j] = []
        for (let i = 0; i < GRID_SIZE; i++) {
          const x = i / (GRID_SIZE - 1)
          const z = 1 - j / (GRID_SIZE - 1)
          const h = getNormalizedHeight(x, z)
          const realH = BASE_ELEVATION + h * MAX_RELIEF
          newHeights[j][i] = realH
          if (realH > newMax) newMax = realH
        }
      }
    } else {
      // 单类型：随机位置 + TERRAIN_SEEDS 函数，每次不同
      // 盆地的完整盆缘必须留在画面内；陡崖两端也要有足够的过渡空间。
      const margin = type === 'basin' ? 0.31 : type === 'cliff' ? 0.30 : type === 'valley' ? 0.28 : 0.15
      const cx = margin + Math.random() * (1 - 2 * margin)
      const cz = margin + Math.random() * (1 - 2 * margin)
      currentTerrainParams = { cx, cz }
      for (let j = 0; j < GRID_SIZE; j++) {
        newHeights[j] = []
        for (let i = 0; i < GRID_SIZE; i++) {
          const x = i / (GRID_SIZE - 1)
          const z = 1 - j / (GRID_SIZE - 1)
          const h = genFn(x, z, { cx, cz })
          const realH = BASE_ELEVATION + h * MAX_RELIEF
          newHeights[j][i] = realH
          if (realH > newMax) newMax = realH
        }
      }
    }

    // 新地形不沿用旧地形的剖面切割线。
    clearProfile()
    // 更新全局数据
    heightsData = newHeights
    maxHeightValue = newMax

    // 构建地形网格
    const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
    const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let i = 0; i < GRID_SIZE; i++) {
        const idx = (j * GRID_SIZE + i) * 3
        const x = (i / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
        const z = (j / (GRID_SIZE - 1) - 0.5) * TERRAIN_SIZE
        const realH = newHeights[j][i]
        const displayH = getDisplayHeight(realH)
        positions[idx] = x
        positions[idx + 1] = displayH
        positions[idx + 2] = z
        const norm = (realH - BASE_ELEVATION) / (newMax - BASE_ELEVATION)
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

    // 重建地形网格
    terrainMesh.geometry.dispose()
    const newGeo = new THREE.BufferGeometry()
    newGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    newGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    newGeo.setIndex(indices)
    attachGridUV(newGeo)
    newGeo.computeVertexNormals()
    terrainMesh.geometry = newGeo
    invalidateTerrainShadow()

    // 重建等高线、河流带和标签
    buildContoursAndProjection()
    buildLabels()
    generatingTerrain.value = false
  }, 50)
}

// ============================================================
// 地形判读学习
// ============================================================
function startLearning() {
  if (learningMode.value) return
  // 保存当前状态
  savedTerrainGenType = terrainGenType.value
  savedTerrainParams = { ...currentTerrainParams }
  savedHeightValue = maxHeightValue
  savedHeightsData = heightsData.map(row => [...row])
  savedFeaturePositions = Object.fromEntries(
    Object.entries(currentFeaturePositions).map(([type, position]) => [type, { ...position }])
  )
  // 所有浮动卡片由 v-show 暂时隐藏。
  // 立即隐藏现有地形标签（避免泄露答案）
  while (featureLabelGroup.children.length) {
    const c = featureLabelGroup.children[0]
    c.parent?.remove(c)
  }
  learningMode.value = true
  onToggleRidgeLines()
  onToggleValleyRiver()
  quizResult.value = null
  generateNextQuiz()
}

function endLearning() {
  learningMode.value = false
  quizResult.value = null
  lastAnswer.value = null
  // 恢复原状态并切回前视图
  terrainGenType.value = savedTerrainGenType
  currentTerrainParams = { ...savedTerrainParams }
  heightsData = savedHeightsData
  maxHeightValue = savedHeightValue
  currentFeaturePositions = Object.fromEntries(
    Object.entries(savedFeaturePositions).map(([type, position]) => [type, { ...position }])
  )
  if (savedHeightValue > 0) {
    // 重新构建原地形
    const positions = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
    const colors = new Float32Array(GRID_SIZE * GRID_SIZE * 3)
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
    terrainMesh.geometry.dispose()
    const newGeo = new THREE.BufferGeometry()
    newGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    newGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    newGeo.setIndex(indices)
    attachGridUV(newGeo)
    newGeo.computeVertexNormals()
    terrainMesh.geometry = newGeo
    invalidateTerrainShadow()
    buildContoursAndProjection()
    buildLabels()
  }
  onToggleValleyRiver()
  setView('front')
}

function generateNextQuiz() {
  // 随机选择 6 种地形之一
  const typeIdx = Math.floor(Math.random() * QUIZ_TYPES.length)
  const type = QUIZ_TYPES[typeIdx]
  currentQuizType.value = quizOptions[typeIdx]
  quizResult.value = null
  lastAnswer.value = null
  // 设置 terrainGenType 触发对应地形生成
  terrainGenType.value = type
  generateRandomTerrain()
}

function nextQuiz() {
  generateNextQuiz()
}

function onQuizAnswer(answer: string) {
  if (quizResult.value !== null) return
  lastAnswer.value = answer
  if (answer === currentQuizType.value) {
    quizResult.value = 'correct'
  } else {
    quizResult.value = 'wrong'
  }
}

function getOptionClass(opt: string) {
  if (!quizResult.value) return ''
  if (opt === currentQuizType.value) return 'option-correct'
  if (opt === lastAnswer.value && opt !== currentQuizType.value) return 'option-wrong'
  return ''
}

function toggleProfileMode() {
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
  invalidateSceneRender()
}

// ============================================================
// 剖面切割 — 地形点击（支持移动端 Touch）
// ============================================================
function onTerrainTouchEnd(event: TouchEvent) {
  // 模拟 click 用于移动端触控
  if (!profileMode.value || !terrainMesh || !threeContainerRef.value) return
  const touch = event.changedTouches[0]
  if (!touch) return
  const mouseEvent = new MouseEvent('click', {
    clientX: touch.clientX,
    clientY: touch.clientY,
  })
  onTerrainClick(mouseEvent)
}

function onTerrainClick(event: MouseEvent) {
  if (!profileMode.value || !terrainMesh || !threeContainerRef.value) return
  if (profileClicks.value >= 2) {
    clearProfile()
  }

  const rect = threeContainerRef.value.getBoundingClientRect()
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
  invalidateSceneRender()
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
  // 剖面、标签、等高线共用三角面采样，陡崖处不能改用双线性插值。
  return BASE_ELEVATION + sampleTerrainHeightAtSceneXZ(point.x, point.z) / HEIGHT_SCALE
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
  const pad = { top: 20, bottom: 50, left: 50, right: 20 }

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
  ctx.fillStyle = '#0a1220'
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

  // X-axis labels — 靠近横轴（类比纵坐标 pad.left-5 的间距）
  ctx.textAlign = 'center'
  for (let d = 0; d <= maxDist; d += 0.2) {
    const x = xScale(d)
    ctx.fillText(`${d.toFixed(1)}`, x, H - 14)
  }

  // Axis labels — 放置底部，与数值分隔清晰
  ctx.fillStyle = '#8ab4c8'
  ctx.font = '11px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('距离', W / 2, H - 3)
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

  // 两点高度差 — ▵ 符号单独绘制，统一 baseline
  const elevDiff = Math.abs(data[0].elev - data[data.length - 1].elev)
  const textY = pad.top - 3
  const mainText = `两点高度差`
  const triSymbol = `▵`
  const eqNum = `= ${elevDiff.toFixed(1)}m`

  ctx.fillStyle = '#2ec4b6'
  ctx.textAlign = 'right'
  // 统一使用 top baseline，避免不同字号 baseline 差异
  ctx.textBaseline = 'top'

  // 先量出三段宽度
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'
  const mainW = ctx.measureText(mainText).width
  ctx.font = 'bold 22px "Microsoft YaHei", sans-serif'
  const triW = ctx.measureText(triSymbol).width
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'
  const eqW = ctx.measureText(eqNum).width

  const totalW = mainW + 6 + triW + 6 + eqW
  let xCursor = W / 2 - totalW / 2

  // 绘制"两点高度差"（14px 顶部对齐）
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'
  ctx.fillText(mainText, xCursor + mainW, textY)
  xCursor += mainW + 6

  // 绘制 ▵（22px 大号，top 对齐，整体高于 14px 文字）
  ctx.font = 'bold 22px "Microsoft YaHei", sans-serif'
  ctx.fillText(triSymbol, xCursor + triW, textY - 5)
  xCursor += triW + 6

  // 绘制"=数字"（14px 顶部对齐）
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'
  ctx.fillText(eqNum, xCursor + eqW, textY)
}

// ============================================================
// 生命周期
// ============================================================
function animate(timestamp = performance.now()) {
  const cameraChanged = controls.update()
  if (cameraChanged) invalidateSceneRender()
  if (valleyRiverMaterial && valleyRiverGroup?.visible) {
    valleyRiverMaterial.uniforms.uTime.value = timestamp / 1000
    invalidateSceneRender()
  }

  if (sceneRenderDirty) {
    const dx = camera.position.x - controls.target.x
    const dy = camera.position.y - controls.target.y
    const dz = camera.position.z - controls.target.z
    const distance = Math.max(Math.hypot(dx, dy, dz), Number.EPSILON)
    const nearVertical = Math.abs(dy) / distance >= VERTICAL_RENDER_COSINE
    const frameInterval = nearVertical && (cameraInteractionActive || cameraChanged)
      ? 1000 / 30
      : 0

    if (timestamp - lastSceneRenderTime >= frameInterval) {
      updateViewCube()
      renderer.render(scene, camera)
      // 标签与 WebGL 使用同一帧更新；遮挡检测节流以降低射线开销。
      if (renderFrameCounter++ % 3 === 0) updateFeatureLabelOcclusion()
      labelRenderer.render(scene, camera)
      lastSceneRenderTime = timestamp
      sceneRenderDirty = false
    }
  }

  animationId = requestAnimationFrame(animate)
}

function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeSceneNow() {
  const container =
    threeContainerRef.value

  if (
    !container ||
    !camera ||
    !renderer ||
    !labelRenderer ||
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
    MAX_RENDER_DPR
  )

  const sizeChanged =
    width !== lastSceneWidth ||
    height !== lastSceneHeight ||
    dpr !== lastSceneDpr

  /*
   * setSize / setPixelRatio 会重新分配绘图缓冲区。
   * 只有真实尺寸或 DPR 变化时才执行。
   */
  if (sizeChanged) {
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

    labelRenderer.setSize(
      width,
      height
    )

  }

  // 响应式缩放后同步校准视角立方体位置。
  applyResponsiveScale()
  updateViewCubeDockPosition()

  controls?.update()

  /*
   * 缓冲区重建后立即补绘，避免短暂空白。
   */
  if (sizeChanged) {
    renderer.render(
      scene,
      camera
    )

    labelRenderer.render(
      scene,
      camera
    )
  }
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
   * 拖拽阶段让 canvas 先通过 CSS 跟随，
   * 松手后 Hook 会再次触发最终校准。
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

onMounted(async () => {
  /*
   * 等 Hook 先写入平板默认面板宽度，
   * 再按主场景真实尺寸初始化 Renderer。
   */
  await nextTick()

  initScene()
  setupLights()
  buildTerrain()
  buildContoursAndProjection()
  buildLabels()

  bindViewCube()
  applyResponsiveScale()
  updateViewCubeDockPosition()

  /*
   * 动画开始前先绘制一帧清晰画面。
   */
  controls.update()

  renderer.render(
    scene,
    camera
  )

  labelRenderer.render(
    scene,
    camera
  )

  animate()

  const container =
    threeContainerRef.value

  if (container) {
    sceneResizeObserver =
      new ResizeObserver(() => {
        scheduleSceneResize(110)
      })

    sceneResizeObserver.observe(
      container
    )
  }

  /*
   * Grid、字体和悬浮面板完成首轮布局后再最终校准。
   */
  scheduleSceneResize(0)
})

onUnmounted(() => {
  cancelAnimationFrame(
    animationId
  )

  cancelAnimationFrame(
    sceneResizeFrame
  )

  cancelAnimationFrame(
    sceneResizeSettleFrame
  )

  if (sceneResizeTimer) {
    clearTimeout(
      sceneResizeTimer
    )

    sceneResizeTimer = null
  }

  sceneResizeObserver?.disconnect()
  sceneResizeObserver = null

  if (contourDebounceTimer) {
    clearTimeout(
      contourDebounceTimer
    )

    contourDebounceTimer = null
  }

  disposeFeatureLineGroup(ridgeGroup3D)
  disposeFeatureLineGroup(ridgeProjectionGroup)
  disposeFeatureLineGroup(valleyRiverGroup)
  disposeFeatureLineGroup(valleyGuideGroup3D)
  disposeFeatureLineGroup(valleyGuideProjectionGroup)
  valleyRiverMaterial = null
  valleyRiverPath = []
  cachedRidgeHeightfield = null
  cachedRidgePaths = []
  controls?.dispose()
  renderer?.dispose()

  if (threeContainerRef.value) {
    threeContainerRef.value.innerHTML = ''
  }
})
</script>

<style scoped>
.ridge-line-legend {
  position: absolute;
  top: 18px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: #fff;
  background: rgba(7, 18, 30, 0.78);
  font: 600 13px "Microsoft YaHei", sans-serif;
}

.ridge-line-legend i {
  display: block;
  width: 27px;
  height: 3px;
  border-radius: 2px;
  background: #ff4055;
}

.terrain-projection-template {
  --ui-scale: 1;
}

.terrain-scene-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  touch-action: none;
  background:
    radial-gradient(circle at 50% 28%,
      rgba(46, 196, 182, 0.16),
      transparent 34%),
    linear-gradient(145deg,
      #06131f,
      #0a2034 48%,
      #071522);
}

.terrain-scene-host :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.terrain-scene-overlay {
  position: absolute;
  inset: 0;
  z-index: 8;
  pointer-events: none;

  /*
   * cube / 图例必须主动避让当前展开的面板宽度。
   * 这些变量来自 workspace 行内 style：
   * --left-panel-width / --right-panel-width
   */
  --scene-left-safe:
    var(--left-panel-width, 0px);
  --scene-right-safe:
    var(--right-panel-width, 0px);
  --scene-overlay-gap:
    clamp(12px,
      1.4vw,
      24px);
}

.profile-hint {
  position: absolute;
  z-index: 28;
  top:
    clamp(84px,
      10vh,
      112px);
  left: 50%;
  transform:
    translateX(-50%);
  padding:
    calc(9px * var(--ui-scale)) calc(20px * var(--ui-scale));
  color:
    var(--theme-primary);
  font-size:
    calc(14px * var(--ui-scale));
  font-weight: 800;
  pointer-events: none;
  background:
    rgba(255, 255, 255, 0.70);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.28);
  border-radius: 999px;
  box-shadow:
    0 12px 28px rgba(44, 86, 112, 0.10);
  backdrop-filter:
    blur(10px);
  -webkit-backdrop-filter:
    blur(10px);
}

.profile-hint strong {
  color:
    var(--theme-secondary);
}

.profile-chart {
  position: absolute;
  z-index: 80;
  left: 50%;
  bottom:
    clamp(20px,
      3vh,
      34px);
  overflow: hidden;
  pointer-events: auto;
  background:
    rgba(255, 255, 255, 0.92);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.24);
  border-radius:
    calc(13px * var(--ui-scale));
  box-shadow:
    0 18px 42px rgba(44, 86, 112, 0.18);
  transform:
    translateX(-50%);
}

.profile-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding:
    calc(8px * var(--ui-scale)) calc(14px * var(--ui-scale));
  color:
    var(--theme-primary);
  font-size:
    calc(13px * var(--ui-scale));
  font-weight: 900;
  background:
    rgba(255, 255, 255, 0.76);
  border-bottom:
    1px solid rgba(var(--theme-primary-rgb), 0.16);
}

.profile-close-btn {
  width:
    calc(24px * var(--ui-scale));
  height:
    calc(24px * var(--ui-scale));
  padding: 0;
  color:
    var(--text-muted);
  cursor: pointer;
  background:
    transparent;
  border: 0;
  border-radius: 50%;
}

.profile-close-btn:hover {
  color:
    #ff6b6b;
  background:
    rgba(255, 107, 107, 0.12);
}

.profile-chart canvas {
  display: block;
  width:
    calc(640px * var(--ui-scale));
  height:
    calc(300px * var(--ui-scale));
  max-width:
    min(80vw,
      640px);
}

.terrain-type-row {
  align-items: flex-start;
  gap: 10px;
}

.terrain-type-select {
  width:
    clamp(108px,
      9vw,
      138px);
}

.terrain-control-dock {
  width:
    min(1380px,
      calc(100% - 28px));
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: calc(8px * var(--ui-scale));
  padding-bottom: calc(8px * var(--ui-scale));
}

.dock-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(14px, 2vw, 28px);
  min-width: 0;
}

.dock-row+.dock-row {
  border-top: 1px solid rgba(255, 255, 255, 0.10);
  padding-top: 10px;
}

.dock-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dock-slider-group {
  gap: 8px;
  width: min(360px, 42vw);
  flex: 0 1 360px;
}

.dock-slider-group .el-slider {
  flex: 1;
  min-width: 0;
}

.dock-generate-group {
  justify-content: flex-end;
  flex: 0 0 auto;
}

.dock-item-label {
  font-size: calc(11px * var(--ui-scale));
  color: var(--text-secondary);
  white-space: nowrap;
}

.dock-item-value {
  margin-left: 4px;
  font-size: calc(11px * var(--ui-scale));
  color: var(--text-primary);
  white-space: nowrap;
}

.dock-switches-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px clamp(12px, 1.4vw, 22px);
  width: 100%;
}

.dock-switch-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: calc(11px * var(--ui-scale));
  color: var(--text-secondary);
}

.dock-switch-item.dock-switch-active {
  color: var(--theme-primary-light);
}

.terrain-type-select {
  width: 96px;
}

.terrain-type-select-wide {
  width: 116px;
}

.terrain-type-select :deep(.el-select__wrapper) {
  min-height: 30px;
  height: 30px;
  padding: 0 8px;
  box-shadow: none;
}

@media (max-width: 1280px) {
  .terrain-control-dock {
    width: min(760px, calc(100% - 28px));
    gap: 8px;
  }

  .dock-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .dock-slider-group,
  .dock-generate-group {
    width: 100%;
    flex: 1 1 auto;
  }

  .dock-generate-group {
    justify-content: space-between;
  }

  .dock-switches-group {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .terrain-control-dock {
    width: calc(100% - 20px);
  }

  .dock-switches-group {
    gap: 6px 12px;
  }
}


.terrain-stack-floating-card {
  width:
    min(310px,
      calc(100vw - 20px));
  max-height:
    calc(100vh - 74px);
}

.terrain-stack-floating-card.variant-data.collapsed {
  width:
    min(310px,
      calc(100vw - 20px));
}

.terrain-ref-floating-card {
  width:
    min(350px,
      calc(100vw - 20px));
}

.terrain-ref-floating-card:not(.collapsed) {
  height: 420px;
}

.terrain-ref-floating-card.variant-data.collapsed {
  width:
    min(350px,
      calc(100vw - 20px));
}

.terrain-ref-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px 18px;
}

.terrain-ref-section {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}

.terrain-ref-heading {
  margin: 0 0 6px;
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  color: var(--text-secondary);
}

.terrain-stack-floating-card :deep(.feature-card-content) {
  padding-bottom: 0;
}

.terrain-status-grid {
  display: grid;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
  background:
    linear-gradient(145deg,
      rgba(20, 74, 102, 0.24),
      rgba(3, 17, 29, 0.54));
}

.terrain-status-metric {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgba(92, 204, 245, 0.12);
  border-radius: 8px;
  background: rgba(3, 17, 29, 0.48);
}

.terrain-status-metric span {
  color:
    var(--feature-muted);
  font-size: 10px;
}

.terrain-status-metric strong {
  color:
    var(--feature-title);
  font-size:
    clamp(15px,
      0.78vw,
      21px);
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terrain-status-metric.cyan-card strong {
  color: #2ec4b6;
}

.terrain-status-metric.blue-card strong {
  color: #45aaf2;
}

.terrain-status-metric.purple-card strong {
  color: #a78bfa;
}

.terrain-status-metric.orange-card strong {
  color: #fd9644;
}

.terrain-floating-copy {
  padding: 12px 16px 14px 13px;
  color:
    var(--feature-text);
  font-size:
    clamp(12px,
      0.58vw,
      15px);
  line-height: 1.55;
}

.terrain-floating-copy strong {
  color:
    var(--feature-title);
}

.terrain-knowledge {
  display: grid;
  gap: 6px;
}

.terrain-knowledge p {
  margin: 0;
}

@media (max-width: 1280px) {
  .terrain-stack-floating-card {
    width:
      min(300px,
        calc(100vw - 20px));
  }

  .terrain-stack-floating-card.variant-data.collapsed {
    width:
      min(300px,
        calc(100vw - 20px));
  }

  .terrain-ref-floating-card {
    width:
      min(330px,
        calc(100vw - 20px));
  }

  .terrain-ref-floating-card.variant-data.collapsed {
    width:
      min(330px,
        calc(100vw - 20px));
  }

  .profile-chart canvas {
    width:
      calc(520px * var(--ui-scale));
    height:
      calc(240px * var(--ui-scale));
  }
}

@media (max-width: 960px) {
  .terrain-scene-overlay {
    --scene-overlay-gap:
      10px;
  }

  .view-cube {
    top:
      clamp(66px,
        8vh,
        82px);
    right:
      calc(var(--scene-right-safe) + var(--scene-overlay-gap));
    width:
      calc(52px * var(--ui-scale));
    height:
      calc(52px * var(--ui-scale));
  }

  .vc-face {
    font-size:
      calc(12px * var(--ui-scale));
  }

  .vc-face-front {
    transform:
      rotateY(0deg) translateZ(calc(26px * var(--ui-scale)));
  }

  .vc-face-back {
    transform:
      rotateY(180deg) translateZ(calc(26px * var(--ui-scale)));
  }

  .vc-face-right {
    transform:
      rotateY(90deg) translateZ(calc(26px * var(--ui-scale)));
  }

  .vc-face-left {
    transform:
      rotateY(-90deg) translateZ(calc(26px * var(--ui-scale)));
  }

  .vc-face-top {
    transform:
      rotateX(90deg) translateZ(calc(26px * var(--ui-scale)));
  }

  .vc-face-bottom {
    transform:
      rotateX(-90deg) translateZ(calc(26px * var(--ui-scale)));
  }

  .profile-chart canvas {
    width:
      calc(420px * var(--ui-scale));
    height:
      calc(200px * var(--ui-scale));
  }
}

@media (max-width: 640px) {
  .terrain-scene-overlay {
    --scene-overlay-gap:
      8px;
  }

  .view-cube {
    top: 64px;
    right:
      calc(var(--scene-right-safe) + var(--scene-overlay-gap));
    width: 46px;
    height: 46px;
  }

  .vc-face {
    font-size: 11px;
  }

  .vc-face-front {
    transform:
      rotateY(0deg) translateZ(23px);
  }

  .vc-face-back {
    transform:
      rotateY(180deg) translateZ(23px);
  }

  .vc-face-right {
    transform:
      rotateY(90deg) translateZ(23px);
  }

  .vc-face-left {
    transform:
      rotateY(-90deg) translateZ(23px);
  }

  .vc-face-top {
    transform:
      rotateX(90deg) translateZ(23px);
  }

  .vc-face-bottom {
    transform:
      rotateX(-90deg) translateZ(23px);
  }

  .profile-hint {
    top: 76px;
    width:
      calc(100% - 110px);
    box-sizing: border-box;
    text-align: center;
    font-size: 12px;
  }

  .profile-chart {
    width:
      calc(100% - 20px);
  }

  .profile-chart canvas {
    width: 100%;
    height: 170px;
  }
}

@media (max-width: 520px) {
  .view-cube {
    top: 58px;
    width: 42px;
    height: 42px;
  }

  .vc-face {
    font-size: 10px;
  }

  .vc-face-front {
    transform:
      rotateY(0deg) translateZ(21px);
  }

  .vc-face-back {
    transform:
      rotateY(180deg) translateZ(21px);
  }

  .vc-face-right {
    transform:
      rotateY(90deg) translateZ(21px);
  }

  .vc-face-left {
    transform:
      rotateY(-90deg) translateZ(21px);
  }

  .vc-face-top {
    transform:
      rotateX(90deg) translateZ(21px);
  }

  .vc-face-bottom {
    transform:
      rotateX(-90deg) translateZ(21px);
  }
}


/* =========================================================
   暗色主题：主场景 Cube / 图例 / 剖面浮层适配
   ========================================================= */

.terrain-projection-template.theme-dark .vc-face {
  color:
    rgba(226, 246, 250, 0.86);
  background:
    linear-gradient(145deg,
      rgba(8, 20, 34, 0.74),
      rgba(8, 20, 34, 0.46));
  border-color:
    rgba(var(--theme-primary-light-rgb), 0.28);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter:
    blur(8px) saturate(145%);
  -webkit-backdrop-filter:
    blur(8px) saturate(145%);
}

.terrain-projection-template.theme-dark .vc-face:hover {
  color:
    var(--theme-on-primary);
  background:
    linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
  border-color:
    transparent;
  box-shadow:
    0 0 18px rgba(var(--theme-primary-rgb), 0.32),
    0 10px 22px rgba(0, 0, 0, 0.22);
}

.terrain-projection-template.theme-dark .profile-hint {
  color:
    var(--theme-primary-light);
  background:
    linear-gradient(145deg,
      rgba(8, 20, 34, 0.72),
      rgba(8, 20, 34, 0.44));
  border-color:
    rgba(var(--theme-primary-light-rgb), 0.24);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.26);
}

.terrain-projection-template.theme-dark .profile-hint strong {
  color:
    #ffffff;
}

.terrain-projection-template.theme-dark .profile-chart {
  background:
    linear-gradient(145deg,
      rgba(8, 20, 34, 0.88),
      rgba(8, 20, 34, 0.72));
  border-color:
    rgba(var(--theme-primary-light-rgb), 0.24);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.34);
  backdrop-filter:
    blur(14px) saturate(145%);
  -webkit-backdrop-filter:
    blur(14px) saturate(145%);
}

.terrain-projection-template.theme-dark .profile-chart-header {
  color:
    var(--theme-primary-light);
  background:
    rgba(8, 20, 34, 0.72);
  border-bottom-color:
    rgba(var(--theme-primary-light-rgb), 0.18);
}

.terrain-projection-template.theme-dark .profile-close-btn {
  color:
    rgba(226, 246, 250, 0.70);
}

.terrain-projection-template.theme-dark .profile-close-btn:hover {
  color:
    #ffffff;
  background:
    rgba(255, 107, 107, 0.24);
}






/* Cube：CSS 不再计算 right，不再写 transform，只保留基础定位 */
.terrain-projection-template .terrain-scene-overlay .view-cube {
  top:
    clamp(76px, 8vh, 96px) !important;
  left:
    auto !important;
  bottom:
    auto !important;
  z-index:
    24;
  transform-origin:
    center center;
}

/* 小屏只调 top，right 仍由 JS 按右侧面板实际位置设置 */
@media (max-width: 1280px) {
  .terrain-projection-template .terrain-scene-overlay .view-cube {
    top:
      clamp(64px, 8vh, 84px) !important;
    left:
      auto !important;
    bottom:
      auto !important;
  }
}

@media (max-width: 760px) {
  .terrain-projection-template .terrain-scene-overlay .view-cube {
    top:
      58px !important;
    left:
      auto !important;
    bottom:
      auto !important;
  }
}

@media (max-width: 520px) {
  .terrain-projection-template .terrain-scene-overlay .view-cube {
    top:
      54px !important;
    left:
      auto !important;
    bottom:
      auto !important;
  }
}

/* ===================== v19：公共面板 Hook =====================
   - 左右悬浮面板宽度、断点和触控拖拽统一交给 Hook；
   - 平板宽度直接使用公共 medium 配置；
   - 拖拽期间不重建 WebGL / CSS2D buffer；
   - Cube 继续读取右侧面板真实 DOM 位置进行停靠。
*/

/* ===================== v18: 等高线贴合山体表面 =====================
   - 3D 等高线平滑后重新采样 terrain 高度；
   - 等高线整体向上轻微抬升，避免卡进山体；
   - 山脊线 / 山谷线同步抬升；
   - 不使用 depthTest:false，避免背面等高线穿透显示。
*/

/* 地形判读学习模块覆盖层 — 顶部居中 */
.quiz-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-start;
  /* 顶部对齐，不挡地形 */
  justify-content: center;
  pointer-events: none;
  padding-top: calc(70px * var(--ui-scale, 1));
  /* 避开工具栏 */
}

.quiz-panel {
  pointer-events: auto;
  z-index: 201;
  width: min(720px, 90vw);
  background: rgba(8, 16, 30, 0.96);
  border: 1px solid rgba(46, 196, 182, 0.4);
  border-radius: calc(14px * var(--ui-scale, 1));
  padding: calc(18px * var(--ui-scale, 1)) calc(22px * var(--ui-scale, 1));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  color: #e0f0ff;
  font-family: 'Microsoft YaHei', sans-serif;
}

.quiz-header {
  text-align: center;
  margin-bottom: calc(14px * var(--ui-scale, 1));
  padding-bottom: calc(10px * var(--ui-scale, 1));
  border-bottom: 1px solid rgba(46, 196, 182, 0.25);
}

.quiz-title {
  font-size: calc(18px * var(--ui-scale, 1));
  font-weight: 700;
  color: #2ec4b6;
  margin-bottom: calc(4px * var(--ui-scale, 1));
}

.quiz-subtitle {
  font-size: calc(13px * var(--ui-scale, 1));
  color: #88aabb;
}

.quiz-options {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: calc(10px * var(--ui-scale, 1));
  margin-bottom: calc(12px * var(--ui-scale, 1));
}

.quiz-option {
  padding: calc(10px * var(--ui-scale, 1)) calc(8px * var(--ui-scale, 1));
  font-size: calc(15px * var(--ui-scale, 1));
  font-weight: 600;
  font-family: 'Microsoft YaHei', sans-serif;
  color: #b0c8e0;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.3);
  border-radius: calc(8px * var(--ui-scale, 1));
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.quiz-option:hover:not(:disabled) {
  background: rgba(46, 196, 182, 0.25);
  border-color: #2ec4b6;
  color: #fff;
  transform: translateY(-2px);
}

.quiz-option:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.quiz-option.option-correct {
  background: rgba(40, 200, 100, 0.35) !important;
  border-color: #2ecc71 !important;
  color: #fff !important;
  box-shadow: 0 0 12px rgba(46, 204, 113, 0.4);
}

.quiz-option.option-wrong {
  background: rgba(220, 60, 60, 0.35) !important;
  border-color: #e74c3c !important;
  color: #fff !important;
  box-shadow: 0 0 12px rgba(231, 76, 60, 0.4);
}

.quiz-feedback {
  text-align: center;
  font-size: calc(15px * var(--ui-scale, 1));
  font-weight: 600;
  margin-bottom: calc(12px * var(--ui-scale, 1));
  min-height: calc(22px * var(--ui-scale, 1));
}

.feedback-correct {
  color: #2ecc71;
}

.feedback-wrong {
  color: #e74c3c;
}

.quiz-actions {
  display: flex;
  gap: calc(12px * var(--ui-scale, 1));
  justify-content: center;
}

.quiz-btn {
  padding: calc(8px * var(--ui-scale, 1)) calc(20px * var(--ui-scale, 1));
  font-size: calc(14px * var(--ui-scale, 1));
  font-weight: 600;
  font-family: 'Microsoft YaHei', sans-serif;
  border-radius: calc(8px * var(--ui-scale, 1));
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s ease;
}

.quiz-btn-next {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.25), rgba(36, 124, 255, 0.25));
  border-color: #2ec4b6;
  color: #2ec4b6;
}

.quiz-btn-next:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quiz-btn-next:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.45), rgba(36, 124, 255, 0.45));
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.4);
}

.quiz-btn-end {
  background: rgba(231, 76, 60, 0.1);
  border-color: rgba(231, 76, 60, 0.4);
  color: #e74c3c;
}

.quiz-btn-end:hover {
  background: rgba(231, 76, 60, 0.25);
}

@media (max-width: 768px) {
  .quiz-options {
    grid-template-columns: repeat(3, 1fr);
  }

  .quiz-panel {
    width: 95vw;
    padding: 14px 16px;
  }

  .quiz-title {
    font-size: 16px;
  }

  .quiz-subtitle {
    font-size: 12px;
  }

  .quiz-option {
    font-size: 13px;
    padding: 8px 4px;
  }
}
</style>
