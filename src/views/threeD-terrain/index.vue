<template>
  <div ref="pageRef" class="terrain-projection-template geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">等高线地形图 · 三维投影</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="setView('front')">
          前视图
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main class="workspace" :class="{
      'has-left': hasLeftPanel,
      'has-right': hasRightPanel,
    }" :style="{
      '--left-panel-width':
        leftCollapsed
          ? '0px'
          : leftPanelWidth + 'px',
      '--right-panel-width':
        rightCollapsed
          ? '0px'
          : rightPanelWidth + 'px',
    }">
      <aside id="left-panel" class="side-panel left-panel" :class="{ collapsed: leftCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>地形控制</h2>
              <p>调整等高线、投影、标签和随机地形</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">等高距</h3>
              <strong class="control-value">
                {{ contourInterval }}m
              </strong>
            </div>

            <el-slider v-model="contourInterval" :min="5" :max="50" :step="5" :show-tooltip="false"
              @input="onContourIntervalChange" />

            <div class="switch-row">
              <div class="control-copy">
                <strong>地形标签</strong>
                <span>显示山顶、山脊、山谷等判读标签</span>
              </div>

              <el-switch v-model="showFeatureLabels" @change="onToggleFeatureLabels" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地形显示</strong>
                <span>控制三维地形和表面等高线</span>
              </div>

              <el-switch v-model="showTerrain" @change="onToggleTerrain" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地形透明</strong>
                <span>降低地形不透明度，便于观察投影</span>
              </div>

              <el-switch v-model="terrainTransparent" @change="onToggleTransparent" />
            </div>
          </section>


          <section class="geo-card control-section panel-terrain-legend-card">
            <h3 class="section-title">地形判读图例</h3>

            <div class="panel-legend-grid">
              <div class="panel-legend-item panel-legend-color-scale-item">
                <div>
                  <div class="legend-bar"></div>
                  <div class="legend-labels">
                    <span>低</span>
                    <span>高</span>
                  </div>
                </div>
              </div>

              <div class="panel-legend-item">
                <span class="badge" style="background:#ff6b6b"></span>
                山顶
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#f9ca24"></span>
                鞍部
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#2bcbba"></span>
                山脊
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#45aaf2"></span>
                山谷
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#fd7944"></span>
                陡崖
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#fd9644"></span>
                陡坡
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#778ca3"></span>
                缓坡
              </div>
              <div class="panel-legend-item">
                <span class="badge" style="background:#a78bfa"></span>
                盆地
              </div>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">投影设置</h3>

            <div class="switch-row first-control-row">
              <div class="control-copy">
                <strong>投影显示</strong>
                <span>显示底部二维投影面</span>
              </div>

              <el-switch v-model="showProjection" @change="onToggleProjection" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>投影线</strong>
                <span>连接三维等高线与投影面</span>
              </div>

              <el-switch v-model="showProjectionLines" @change="onToggleProjectionLines" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>分层设色投影</strong>
                <span>在投影面显示海拔分层色</span>
              </div>

              <el-switch v-model="showProjectionColoring" @change="onToggleProjectionColoring" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">剖面与地形生成</h3>

            <button type="button" class="theme-btn reset-scene-btn profile-mode-btn" :class="{ active: profileMode }"
              @click="toggleProfileMode">
              {{ profileMode ? '退出剖面切割' : '剖面切割' }}
            </button>

            <div class="number-control-row terrain-type-row">
              <div class="control-copy">
                <strong>地形生成</strong>
                <span>按指定地形部位生成随机样例</span>
              </div>

              <el-select v-model="terrainGenType" class="theme-select terrain-type-select"
                popper-class="geo-select-popper geo-select-popper-dark" placeholder="地形类型">
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

            <button type="button" class="theme-btn reset-scene-btn" :disabled="generatingTerrain"
              @click="generateRandomTerrain">
              {{ generatingTerrain ? '生成中...' : '随机生成' }}
            </button>
          </section>
        </div>

        <div class="resize-handle resize-right" @pointerdown.stop.prevent="
          startResize('left', $event)
          "></div>

        <button type="button" class="panel-collapse-btn collapse-left" aria-label="收起左侧面板"
          @click="leftCollapsed = true">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host terrain-scene-host" @click="onTerrainClick"
            @touchend="onTerrainTouchEnd"></div>

          <div class="terrain-scene-overlay">
            <div ref="viewCube" class="view-cube">
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
            </div>


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

      <aside id="right-panel" class="side-panel right-panel" :class="{ collapsed: rightCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>知识解读</h2>
              <p>结合图例读取地形部位与判读方法</p>
            </div>

            <span class="panel-badge">KNOWLEDGE</span>
          </div>

          <div class="data-grid">
            <article class="geo-card data-card cyan-card">
              <span>等高距</span>
              <strong>{{ contourInterval }}m</strong>
              <small>相邻等高线海拔差</small>
            </article>

            <article class="geo-card data-card blue-card">
              <span>地形类型</span>
              <strong>{{ terrainGenType }}</strong>
              <small>当前随机生成目标</small>
            </article>

            <article class="geo-card data-card purple-card">
              <span>投影线</span>
              <strong>{{ showProjectionLines ? '显示' : '隐藏' }}</strong>
              <small>三维与二维对应关系</small>
            </article>

            <article class="geo-card data-card orange-card">
              <span>剖面</span>
              <strong>{{ profileMode ? '切割中' : '未开启' }}</strong>
              <small>点击两点生成剖面图</small>
            </article>
          </div>

          <el-collapse class="analysis-collapse" :model-value="[
            'terrain',
            'rule',
            'profile',
          ]">
            <el-collapse-item title="基本地形部位" name="terrain">
              <div class="collapse-content terrain-knowledge">
                <p><strong>山顶：</strong>闭合等高线，内高外低，常标海拔。</p>
                <p><strong>鞍部：</strong>两峰之间低凹部位，比两侧山顶低。</p>
                <p><strong>山脊：</strong>分水岭，等高线向低处凸出。</p>
                <p><strong>山谷：</strong>集水线，等高线向高处凸出，常发育河流。</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="坡度与设色" name="rule">
              <div class="collapse-content terrain-knowledge">
                <p><strong>陡崖：</strong>等高线重合或极密，高差变化显著。</p>
                <p><strong>陡坡：</strong>等高线密集，坡度较大。</p>
                <p><strong>缓坡：</strong>等高线稀疏，坡度较小。</p>
                <p><strong>分层设色：</strong>颜色由绿色逐渐过渡到黄褐色和高处浅色。</p>
              </div>
            </el-collapse-item>

            <el-collapse-item title="剖面图使用" name="profile">
              <div class="collapse-content terrain-knowledge">
                <p>开启剖面切割后，在地形上点击两个点，即可生成两点之间的海拔变化曲线。</p>
                <p>剖面图可以帮助学生理解地形起伏、坡度变化和等高线疏密之间的关系。</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="resize-handle resize-left" @pointerdown.stop.prevent="
          startResize('right', $event)
          "></div>

        <button type="button" class="panel-collapse-btn collapse-right" aria-label="收起右侧面板"
          @click="rightCollapsed = true">
          ›
        </button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left" aria-label="展开左侧面板"
        @click="leftCollapsed = false">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        aria-label="展开右侧面板" @click="rightCollapsed = false">
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import '@/styles/geo-page-template.css'
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
const pageRef = ref<HTMLElement | null>(null)
const threeContainerRef = ref<HTMLDivElement | null>(null)
const profileCanvas = ref<HTMLCanvasElement | null>(null)
const viewCube = ref<HTMLDivElement | null>(null)
const contourInterval = ref(10)
const showFeatureLabels = ref(true)
const uiScale = ref(1)  // 整体 UI 缩放系数（根据分辨率自动调节）
const showTerrain = ref(true)
const showProjection = ref(true)
const showProjectionLines = ref(true)
const terrainTransparent = ref(false)
const profileMode = ref(false)
const showProjectionColoring = ref(true)
const profileClicks = ref(0)
const profileData = ref<{ dist: number; elev: number }[]>([])
const terrainGenType = ref('all')
const generatingTerrain = ref(false)

type LayoutMode =
  | 'large'
  | 'medium'
  | 'small'

const hasLeftPanel = true
const hasRightPanel = true

const layoutMode =
  ref<LayoutMode>('large')


/*
 * 面板宽度说明：
 * 公共模板 CSS 管视觉样式和大屏兜底；
 * 但本组件会在 workspace 上通过 inline style 写入
 * --left-panel-width / --right-panel-width。
 * 因此默认宽度、拖拽最大宽度、拖拽后是否被 ResizeObserver 重置，
 * 都必须在本组件 JS 中同步放开。
 */

const leftPanelWidth = ref(420)
const rightPanelWidth = ref(500)

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const allPanelsCollapsed =
  computed(() =>
    leftCollapsed.value &&
    rightCollapsed.value
  )


let previousLayoutMode:
  | LayoutMode
  | null = null

let leftPanelManuallyResized = false
let rightPanelManuallyResized = false

let pageResizeObserver:
  | ResizeObserver
  | null = null

let resizeTarget:
  | 'left'
  | 'right'
  | null = null

let resizeStartX = 0
let resizeStartWidth = 0

function getLayoutMode(width: number): LayoutMode {
  if (width < 800) {
    return 'small'
  }

  if (width < 1440) {
    return 'medium'
  }

  return 'large'
}

function clampPanelNumber(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  )
}

function getEffectiveTemplateWidth(
  fallbackWidth?: number
): number {
  const candidates: number[] = []

  if (
    typeof fallbackWidth === 'number' &&
    Number.isFinite(fallbackWidth) &&
    fallbackWidth > 0
  ) {
    candidates.push(fallbackWidth)
  }

  const pageWidth =
    pageRef.value?.clientWidth

  if (
    typeof pageWidth === 'number' &&
    Number.isFinite(pageWidth) &&
    pageWidth > 0
  ) {
    candidates.push(pageWidth)
  }

  if (typeof window !== 'undefined') {
    const values = [
      window.innerWidth,
      window.visualViewport?.width,
      window.screen?.width,
      window.screen?.availWidth,
    ]

    values.forEach((value) => {
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value > 0
      ) {
        candidates.push(value)
      }
    })
  }

  if (!candidates.length) {
    return 0
  }

  /*
   * 用最小有效宽度判断超大屏。
   * 普通 1920 屏即使因为浏览器缩放 / 投屏环境导致 CSS 宽度异常变大，
   * 也不会误判为 2200+。
   */
  return Math.min(...candidates)
}

function isUltraLargeTemplateScreen(
  fallbackWidth?: number
): boolean {
  return getEffectiveTemplateWidth(
    fallbackWidth
  ) >= 2200
}

function getAdaptivePanelWidth(
  side: 'left' | 'right',
  mode: LayoutMode,
  pageWidth: number
): number {
  const effectiveWidth =
    getEffectiveTemplateWidth(
      pageWidth
    )

  if (mode === 'small') {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.76, 260, 360)
      : clampPanelNumber(pageWidth * 0.80, 280, 380)
  }

  if (mode === 'medium') {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.36, 320, 480)
      : clampPanelNumber(pageWidth * 0.40, 360, 540)
  }

  /*
   * 2K / 4K / 教室超大屏增强：
   * 普通 1920×1080 电脑不默认触发。
   */
  if (
    isUltraLargeTemplateScreen(
      effectiveWidth
    )
  ) {
    return side === 'left'
      ? clampPanelNumber(effectiveWidth * 0.22, 420, 640)
      : clampPanelNumber(effectiveWidth * 0.25, 500, 760)
  }

  return side === 'left'
    ? clampPanelNumber(pageWidth * 0.19, 340, 520)
    : clampPanelNumber(pageWidth * 0.21, 380, 580)
}

function getPanelResizeBounds(
  side: 'left' | 'right'
) {
  const pageWidth =
    pageRef.value?.clientWidth ||
    window.innerWidth

  const effectiveWidth =
    getEffectiveTemplateWidth(
      pageWidth
    )

  if (layoutMode.value === 'small') {
    return {
      min:
        side === 'left'
          ? 220
          : 240,
      max:
        Math.max(
          side === 'left'
            ? 220
            : 240,
          Math.min(
            side === 'left'
              ? 420
              : 440,
            pageWidth * 0.86
          )
        ),
    }
  }

  if (layoutMode.value === 'medium') {
    return {
      min:
        side === 'left'
          ? 280
          : 300,
      max:
        Math.max(
          side === 'left'
            ? 280
            : 300,
          Math.min(
            side === 'left'
              ? 640
              : 700,
            pageWidth * 0.60
          )
        ),
    }
  }

  /*
   * 普通 large：1440 ~ 2199，包含普通 1920×1080 电脑。
   * 左侧最多 560px，右侧最多 620px。
   *
   * 超大屏：有效宽度 2200px 以上。
   * 左侧最多 820px，右侧最多 900px。
   */
  const isUltraLargeScreen =
    isUltraLargeTemplateScreen(
      effectiveWidth
    )

  return {
    min:
      side === 'left'
        ? 300
        : 340,
    max:
      Math.max(
        side === 'left'
          ? 300
          : 340,
        Math.min(
          side === 'left'
            ? (
              isUltraLargeScreen
                ? 820
                : 560
            )
            : (
              isUltraLargeScreen
                ? 900
                : 620
            ),
          effectiveWidth *
          (
            isUltraLargeScreen
              ? 0.54
              : 0.38
          )
        )
      ),
  }
}

function syncTemplateLayout() {
  const width =
    pageRef.value?.clientWidth ||
    window.innerWidth

  const nextMode =
    getLayoutMode(width)

  const modeChanged =
    previousLayoutMode !== nextMode

  layoutMode.value =
    nextMode

  /*
   * 以前这里会在 large 下把左侧压到 360、右侧压到 390，
   * medium 下又压到 292 / 308，导致默认宽度和公共模板不一致。
   * 现在改成统一自适应：
   * 1. 首次进入按屏幕宽度给默认值；
   * 2. 用户拖拽后不再被 ResizeObserver 拉回小宽度；
   * 3. 切换 large / medium / small 时重新给合理默认值。
   */
  if (
    modeChanged ||
    !leftPanelManuallyResized
  ) {
    leftPanelWidth.value =
      Math.round(
        getAdaptivePanelWidth(
          'left',
          nextMode,
          width
        )
      )
  }

  if (
    modeChanged ||
    !rightPanelManuallyResized
  ) {
    rightPanelWidth.value =
      Math.round(
        getAdaptivePanelWidth(
          'right',
          nextMode,
          width
        )
      )
  }

  previousLayoutMode =
    nextMode
}

function toggleAllPanels() {
  const shouldExpand =
    allPanelsCollapsed.value

  leftCollapsed.value =
    !shouldExpand

  rightCollapsed.value =
    !shouldExpand
}

function startResize(
  target: 'left' | 'right',
  event: PointerEvent
) {
  if (
    (target === 'left' && leftCollapsed.value) ||
    (target === 'right' && rightCollapsed.value)
  ) {
    return
  }

  event.stopPropagation()

  resizeTarget =
    target

  resizeStartX =
    event.clientX

  resizeStartWidth =
    target === 'left'
      ? leftPanelWidth.value
      : rightPanelWidth.value

  const handle =
    event.currentTarget as HTMLElement | null

  if (
    handle &&
    typeof handle.setPointerCapture === 'function'
  ) {
    try {
      handle.setPointerCapture(
        event.pointerId
      )
    } catch {
      // 部分触控屏或老浏览器可能不支持 pointer capture，继续用 document 监听兜底。
    }
  }

  document.body.classList.add(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    'col-resize'

  document.body.style.userSelect =
    'none'

  document.addEventListener(
    'pointermove',
    handlePanelResize
  )

  document.addEventListener(
    'pointerup',
    stopPanelResize,
    {
      once:
        true,
    }
  )

  document.addEventListener(
    'pointercancel',
    stopPanelResize,
    {
      once:
        true,
    }
  )
}

function handlePanelResize(event: PointerEvent) {
  if (!resizeTarget) {
    return
  }

  const bounds =
    getPanelResizeBounds(
      resizeTarget
    )

  const delta =
    event.clientX - resizeStartX

  if (resizeTarget === 'left') {
    leftPanelWidth.value =
      clampPanelNumber(
        resizeStartWidth + delta,
        bounds.min,
        bounds.max
      )

    leftPanelManuallyResized =
      true
  } else {
    rightPanelWidth.value =
      clampPanelNumber(
        resizeStartWidth - delta,
        bounds.min,
        bounds.max
      )

    rightPanelManuallyResized =
      true
  }

  handleResize()
}

function stopPanelResize() {
  resizeTarget =
    null

  document.body.classList.remove(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    ''

  document.body.style.userSelect =
    ''

  document.removeEventListener(
    'pointermove',
    handlePanelResize
  )

  document.removeEventListener(
    'pointerup',
    stopPanelResize
  )

  document.removeEventListener(
    'pointercancel',
    stopPanelResize
  )

  handleResize()
}


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

  // === 盆地（左下角，浅而平缓，无陡峭半山）===
  // 平缓环形矮丘 + 中央低洼，整体高度较小，避免突兀
  const basinCx = 0.20, basinCz = 0.20
  const dx = x - basinCx, dz = z - basinCz
  const dist = Math.sqrt(dx * dx + dz * dz)
  // 环形矮丘（半径 0.12，幅度仅 0.18，避免半山突兀）
  const ringR = 0.12
  const ringWidth = 0.05  // 较宽的衰减让边缘更平缓
  const ringHeight = 0.18
  const ringFactor = Math.exp(-((dist - ringR) ** 2) / (2 * ringWidth ** 2))
  // 中央浅凹（深度仅 0.15，平缓下降）
  const bowlFactor = Math.exp(-(dist * dist) / (2 * 0.06 ** 2))
  // 仅在盆地范围内（半径 0.20）生效，0.20 外为 0
  const inBasin = dist < 0.20 ? 1 : 0
  // 合并：环形矮丘 + 中央浅凹（无半山，无陡坡）
  const basin = ringHeight * ringFactor * inBasin - 0.15 * bowlFactor * inBasin

  return Math.max(0, peak1 + peak2 + peak3 +
    hill1 + hill2 + hill3 + hill4 + hill5 + hill6 + hill7 + hill8 + hill9 + hill10 +
    ridge1 + ridge2 + ridge3 + ridge4 +
    saddle1 + saddle2 + valley1 + valley2 + valley3 +
    detail + noiseVal + cliffDrop +
    basin + 0.04)
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
    while (found) {
      found = false
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue; const s = segs[j]
        if (dist(tx, tz, s.ax, s.az) < TOL) { pts.push(s.bx, y, s.bz); tx = s.bx; tz = s.bz; used[j] = true; found = true; break }
        if (dist(tx, tz, s.bx, s.bz) < TOL) { pts.push(s.ax, y, s.az); tx = s.ax; tz = s.az; used[j] = true; found = true; break }
      }
    }
    found = true
    while (found) {
      found = false
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue; const s = segs[j]
        if (dist(hx, hz, s.ax, s.az) < TOL) { pts.unshift(s.bx, y, s.bz); hx = s.bx; hz = s.bz; used[j] = true; found = true; break }
        if (dist(hx, hz, s.bx, s.bz) < TOL) { pts.unshift(s.ax, y, s.az); hx = s.ax; hz = s.az; used[j] = true; found = true; break }
      }
    }
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
  if (!threeContainerRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x101520)

  const aspect = threeContainerRef.value.clientWidth / threeContainerRef.value.clientHeight
  camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100)
  // 默认前视图（正面对齐地形）
  camera.position.set(0, 2.5, 7.0)
  camera.lookAt(0, 0.8, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(threeContainerRef.value.clientWidth, threeContainerRef.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.4
  threeContainerRef.value.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(threeContainerRef.value.clientWidth, threeContainerRef.value.clientHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.left = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  threeContainerRef.value.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.8, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.5
  controls.maxDistance = 14
  // 允许完全俯视 (0) 和完全仰视 (π)，无角度限制
  controls.minPolarAngle = 0
  controls.maxPolarAngle = Math.PI
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

  // 1. 3D 地形表面等高线 — 使用 Line2 贴合地形（深紫色）
  for (const level of levels) {
    const y = getDisplayHeight(level)
    const rawPolylines = connectContourPolylines(segments, level, y)
    for (const pts of rawPolylines) {
      const smoothPts = chaikinSmooth(pts, SMOOTH_ITER)
      // 用 LineBasicMaterial 创建普通等高线（无 polygonOffset 依赖，直接嵌入地形表面）
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.BufferAttribute(smoothPts, 3))
      const lineMat = new THREE.LineBasicMaterial({ color: 0x5a0d9a, transparent: true, opacity: 0.85 })
      const line = new THREE.Line(lineGeo, lineMat)
      contourGroup3D.add(line)
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

  // 4. 2D 投影等高线 — 紫红色
  for (const level of levels) {
    const rawPolylines = connectContourPolylines(segments, level, BASE_PLANE_Y + 0.005)
    for (const pts of rawPolylines) {
      const smoothPts = chaikinSmooth(pts, SMOOTH_ITER)
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.BufferAttribute(smoothPts, 3))
      const lineMat = new THREE.LineBasicMaterial({ color: 0x8833aa, transparent: true, opacity: 0.9 })
      const line = new THREE.Line(lineGeo, lineMat)
      projectionGroup.add(line)
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
  // ---- 山脊线（红色） ----
  const ridgePts = traceRidgeLine(segments)
  if (ridgePts) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(ridgePts, 3))
    ridgeGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff2222 })))

    const proj = new Float32Array(ridgePts.length)
    for (let k = 0; k < ridgePts.length; k += 3) { proj[k] = ridgePts[k]; proj[k + 1] = BASE_PLANE_Y + 0.006; proj[k + 2] = ridgePts[k + 2] }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(proj, 3))
    projectionGroup.add(new THREE.Line(pGeo, new THREE.LineBasicMaterial({ color: 0xff4444 })))
  }

  // ---- 山谷线（蓝色） ----
  const valleyPts = traceValleyLine(segments)
  if (valleyPts) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(valleyPts, 3))
    ridgeGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2266ff })))

    const proj = new Float32Array(valleyPts.length)
    for (let k = 0; k < valleyPts.length; k += 3) { proj[k] = valleyPts[k]; proj[k + 1] = BASE_PLANE_Y + 0.006; proj[k + 2] = valleyPts[k + 2] }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(proj, 3))
    projectionGroup.add(new THREE.Line(pGeo, new THREE.LineBasicMaterial({ color: 0x4488ff })))
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
    div.style.fontSize = `${13 * uiScale.value}px`
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
  // 根据当前地形生成类型，只显示对应标签
  const allFeatures = [
    { type: 'peak', text: '山顶', x: 0.78, z: 0.78, color: '#ff6b6b' },
    { type: 'saddle', text: '鞍部', x: 0.50, z: 0.52, color: '#f9ca24' },
    { type: 'ridge', text: '山脊', x: 0.48, z: 0.58, color: '#2bcbba' },
    { type: 'valley', text: '山谷', x: 0.58, z: 0.38, color: '#45aaf2' },
    { type: 'cliff', text: '陡崖', x: 0.32, z: 0.26, color: '#fd7944' },
    { type: 'steep', text: '陡坡', x: 0.28, z: 0.40, color: '#e67e22' },
    { type: 'gentle', text: '缓坡', x: 0.12, z: 0.50, color: '#778ca3' },
    { type: 'basin', text: '盆地', x: 0.18, z: 0.18, color: '#a78bfa' },
  ]
  const currentType = terrainGenType.value
  // "全部"显示所有标签，否则只显示对应的那一个
  const showTypes = currentType === 'all'
    ? allFeatures.map(f => f.type)
    : [currentType]

  const baseFont = 16 * uiScale.value
  for (const f of allFeatures) {
    if (!showTypes.includes(f.type)) continue
    const realH = getRealHeight(f.x, f.z)
    const displayH = getDisplayHeight(realH)
    const labelX = (f.x - 0.5) * TERRAIN_SIZE
    const labelY = displayH + 0.08
    const labelZ = (f.z - 0.5) * TERRAIN_SIZE

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

// ============================================================
// 视角切换 — 前/后/左/右/顶/底
// ============================================================
const VIEW_PRESETS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  front: { pos: [0, 2.5, 7.0], target: [0, 0.8, 0] },
  back: { pos: [0, 2.5, -7.0], target: [0, 0.8, 0] },
  left: { pos: [-7.0, 2.5, 0], target: [0, 0.8, 0] },
  right: { pos: [7.0, 2.5, 0], target: [0, 0.8, 0] },
  // 标准俯视：相机正上方，看向中心，X/Z 严格归零保证完全正交
  top: { pos: [0, 8.5, 0], target: [0, 0, 0] },
  bottom: { pos: [0, -7.0, 0], target: [0, 0, 0] },
}

function setView(view: keyof typeof VIEW_PRESETS) {
  if (!camera || !controls) return
  const preset = VIEW_PRESETS[view]
  if (!preset) return
  camera.position.set(preset.pos[0], preset.pos[1], preset.pos[2])
  controls.target.set(preset.target[0], preset.target[1], preset.target[2])
  camera.lookAt(preset.target[0], preset.target[1], preset.target[2])
  controls.update()
}


function updateViewCubeDockPosition() {
  const el =
    viewCube.value

  const page =
    pageRef.value

  if (
    !el ||
    !page
  ) {
    return
  }

  const rightPanel =
    page.querySelector<HTMLElement>(
      '#right-panel'
    )

  const pageRect =
    page.getBoundingClientRect()

  const gap =
    layoutMode.value === 'small'
      ? 8
      : layoutMode.value === 'medium'
        ? 10
        : 14

  let rightValue =
    gap

  /*
   * 关键：
   * 不再用 CSS 变量推测右侧面板宽度。
   * 直接读取右侧面板真实 DOM 位置。
   *
   * cube 的右边缘应该在：
   * rightPanel.left - gap
   *
   * 因此 right 值为：
   * pageRect.right - rightPanel.left + gap
   */
  if (
    rightPanel &&
    !rightCollapsed.value
  ) {
    const panelRect =
      rightPanel.getBoundingClientRect()

    if (
      panelRect.width > 0 &&
      panelRect.left < pageRect.right
    ) {
      rightValue =
        Math.max(
          gap,
          Math.round(
            pageRect.right -
            panelRect.left +
            gap
          )
        )
    }
  }

  el.style.setProperty(
    'left',
    'auto',
    'important'
  )

  el.style.setProperty(
    'right',
    `${rightValue}px`,
    'important'
  )
}

function updateViewCube() {
  // 跟随相机实时旋转立方体（与参考图项目一致）
  updateViewCubeDockPosition()

  const el = viewCube.value
  if (!el || !camera) return
  const target = controls?.target ?? new THREE.Vector3(0, 0, 0)
  const v = camera.position.clone().sub(target)
  const p = Math.asin(Math.max(-1, Math.min(1, v.y / v.length())))
  const y = Math.atan2(v.x, v.z)
  // 立方体边长 60px（基础），响应式缩放
  const halfSize = 30 * uiScale.value
  el.style.transform = `translateZ(${-halfSize}px) rotateX(${-p}rad) rotateY(${-y}rad)`
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
  if (terrainTransparent.value) {
    terrainMaterial.transparent = true
    terrainMaterial.opacity = 0.12
    terrainMaterial.color.setHex(0x88ccaa)
    terrainMaterial.vertexColors = false
  } else {
    // 恢复时完全重建地形几何（保证颜色与原始完全一致）
    terrainMaterial.transparent = false
    terrainMaterial.opacity = 1
    terrainMaterial.color.setHex(0xffffff)
    terrainMaterial.vertexColors = true
    // 直接从 heightsData 重建地形和颜色（与 buildTerrain 逻辑一致）
    const { positions, colors, indices, maxHeight } = generateTerrainData()
    terrainMesh.geometry.dispose()
    const newGeo = new THREE.BufferGeometry()
    newGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    newGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    newGeo.setIndex(indices)
    newGeo.computeVertexNormals()
    terrainMesh.geometry = newGeo
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



// ============================================================
// 随机地形生成
// ============================================================
const TERRAIN_SEEDS: Record<string, (x: number, z: number, params?: { cx: number; cz: number }) => number> = {
  peak: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return 0.95 * gauss2d(x, z, cx, cz, 0.14, 0.16) + 0.50 * gauss2d(x, z, cx - 0.05, cz - 0.05, 0.10, 0.10) + 0.04
  },
  saddle: (x, z, p) => {
    // 两座山 + 中间鞍部低谷
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    const peak1 = 0.80 * gauss2d(x, z, cx - 0.15, cz, 0.10, 0.12)
    const peak2 = 0.80 * gauss2d(x, z, cx + 0.15, cz, 0.10, 0.12)
    const dip = -0.45 * gauss2d(x, z, cx, cz, 0.10, 0.10)
    return Math.max(0, peak1 + peak2 + dip + 0.04)
  },
  ridge: (x, z, p) => {
    // 从高处向低处延伸的细长山脊（等高线向低处凸出）
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    return 0.55 * gauss2d(x, z, cx, cz, 0.35, 0.06) + 0.04
  },
  valley: (x, z, p) => {
    // 真实 U 型河谷：沿 z 方向的长条低洼，两侧由渐变到中央形成 V 形剖面
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    // 基础地形：两侧高，中央低
    const baseH = 0.55
    // 沿 x 方向的横截面曲线：距谷中心越远越高
    const distX = Math.abs(x - cx)
    // 高斯形状的横截面（z 方向延伸，x 方向收口）
    const crossSection = 0.30 * Math.exp(-(distX * distX) / (2 * 0.10 * 0.10)) - 0.20
    // 沿 z 方向有起伏（谷底不是平直的）
    const alongZ = 0.08 * Math.sin((z - cz) * 8) * Math.exp(-(distX * distX) / (2 * 0.15 * 0.15))
    return Math.max(0, baseH + crossSection + alongZ)
  },
  cliff: (x, z, p) => {
    const cx = p?.cx ?? 0.5, cz = p?.cz ?? 0.5
    const cf = Math.exp(-((x - cx) ** 2) / (2 * 0.08 ** 2))
    let drop = 0
    if (z < cz + 0.05 && cf > 0.06) { const t = Math.max(0, (cz + 0.05 - z) / 0.14); drop = -0.45 * cf * t * t }
    return Math.max(0, 0.55 + drop + 0.04)
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
    const dx = x - cx, dz = z - cz
    const dist = Math.sqrt(dx * dx + dz * dz)
    const ring = 0.20 * Math.exp(-((dist - 0.12) ** 2) / (2 * 0.05 ** 2))
    const bowl = 0.18 * Math.exp(-(dist * dist) / (2 * 0.06 ** 2))
    return Math.max(0, ring - bowl + 0.04)
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
      // "全部"：用随机偏移/缩放变异 getNormalizedHeight，每次不同
      const shiftX = Math.random() * 0.2 - 0.1
      const shiftZ = Math.random() * 0.2 - 0.1
      const scale = 0.7 + Math.random() * 0.6
      for (let j = 0; j < GRID_SIZE; j++) {
        newHeights[j] = []
        for (let i = 0; i < GRID_SIZE; i++) {
          const x = i / (GRID_SIZE - 1)
          const z = 1 - j / (GRID_SIZE - 1)
          const h = getNormalizedHeight(x + shiftX, z + shiftZ) * scale + 0.02 * Math.random()
          const realH = BASE_ELEVATION + h * MAX_RELIEF
          newHeights[j][i] = realH
          if (realH > newMax) newMax = realH
        }
      }
    } else {
      // 单类型：随机位置 + TERRAIN_SEEDS 函数，每次不同
      const cx = 0.15 + Math.random() * 0.70
      const cz = 0.15 + Math.random() * 0.70
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
    newGeo.computeVertexNormals()
    terrainMesh.geometry = newGeo

    // 重建等高线和标签
    buildContoursAndProjection()
    buildLabels()
    generatingTerrain.value = false
  }, 50)
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
function animate() {
  controls.update()
  updateViewCube()
  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

function handleResize() {
  if (
    !threeContainerRef.value ||
    !camera ||
    !renderer ||
    !labelRenderer
  ) {
    return
  }

  const w = threeContainerRef.value.clientWidth
  const h = threeContainerRef.value.clientHeight

  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  labelRenderer.setSize(w, h)
  contourRes.set(w, h)
  applyResponsiveScale()
  updateViewCubeDockPosition()
}

onMounted(() => {
  syncTemplateLayout()

  initScene()
  setupLights()
  buildTerrain()
  buildContoursAndProjection()
  buildLabels()

  if (threeContainerRef.value) {
    contourRes.set(
      threeContainerRef.value.clientWidth,
      threeContainerRef.value.clientHeight
    )
  }

  bindViewCube()
  applyResponsiveScale()
  animate()

  pageResizeObserver =
    new ResizeObserver(() => {
      syncTemplateLayout()
      handleResize()
    })

  if (pageRef.value) {
    pageResizeObserver.observe(pageRef.value)
  }

  window.addEventListener(
    'resize',
    handleResize
  )
})

onUnmounted(() => {
  document.body.classList.remove(
    'geo-panel-resizing'
  )

  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  document.removeEventListener(
    'pointermove',
    handlePanelResize
  )

  document.removeEventListener(
    'pointerup',
    stopPanelResize
  )

  document.removeEventListener(
    'pointercancel',
    stopPanelResize
  )

  cancelAnimationFrame(animationId)

  window.removeEventListener(
    'resize',
    handleResize
  )

  window.removeEventListener(
    'pointermove',
    handlePanelResize
  )

  pageResizeObserver?.disconnect()
  pageResizeObserver = null

  controls?.dispose()
  renderer?.dispose()

  if (threeContainerRef.value) {
    threeContainerRef.value.innerHTML = ''
  }
})
</script>

<style scoped>
.terrain-projection-template {
  --ui-scale: 1;

  /*
   * 5号模板公共 CSS 必须提供主布局。
   * 这里仅做当前组件的最小兜底，避免公共 CSS 未及时加载、
   * 加载顺序异常时，左右面板按文档流掉到主场景下方。
   */
  position: relative;
  display: block;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
}

.terrain-projection-template>.top-toolbar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 120;
}

.terrain-projection-template>.workspace {
  position: absolute;
  inset: 0;
  z-index: 1;
  min-height: 0;
}

.terrain-projection-template .center-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  min-width: 0;
  min-height: 0;
}

.terrain-projection-template .stage-content {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.terrain-projection-template .side-panel {
  position: absolute;
  top:
    var(--floating-panel-top-offset,
      74px);
  bottom:
    clamp(14px,
      1.6vh,
      22px);
  z-index: 90;
}

.terrain-projection-template .left-panel {
  left:
    clamp(14px,
      1.4vw,
      22px);
}

.terrain-projection-template .right-panel {
  right:
    clamp(14px,
      1.4vw,
      22px);
}

.terrain-projection-template .side-panel.collapsed {
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  padding: 0 !important;
  overflow: visible;
}

.terrain-projection-template .left-panel.collapsed {
  transform:
    translateX(calc(-100% - 18px));
}

.terrain-projection-template .right-panel.collapsed {
  transform:
    translateX(calc(100% + 18px));
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
   * 5号模板 layout-floating 下左右面板会覆盖主场景。
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

.view-cube {
  position: absolute;
  top:
    clamp(80px,
      8vh,
      92px);
  right:
    calc(var(--scene-right-safe) + var(--scene-overlay-gap) + 20px);
  z-index: 40;
  width:
    calc(60px * var(--ui-scale));
  height:
    calc(60px * var(--ui-scale));
  perspective: 3000px;
  perspective-origin: 50% 50%;
  user-select: none;
  transform-style: preserve-3d;
  pointer-events: auto;
}

.vc-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color:
    var(--text-secondary);
  font-family:
    'Microsoft YaHei',
    'PingFang SC',
    sans-serif;
  font-size:
    calc(14px * var(--ui-scale));
  font-weight: 900;
  cursor: pointer;
  user-select: none;
  background:
    rgba(255, 255, 255, 0.74);
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  backface-visibility: visible;
}

.vc-face:hover {
  color:
    var(--theme-on-primary);
  background:
    linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
  border-color:
    transparent;
  box-shadow:
    0 0 14px rgba(var(--theme-primary-rgb), 0.28);
}

.vc-face-front {
  transform:
    rotateY(0deg) translateZ(calc(30px * var(--ui-scale)));
}

.vc-face-back {
  transform:
    rotateY(180deg) translateZ(calc(30px * var(--ui-scale)));
}

.vc-face-right {
  transform:
    rotateY(90deg) translateZ(calc(30px * var(--ui-scale)));
}

.vc-face-left {
  transform:
    rotateY(-90deg) translateZ(calc(30px * var(--ui-scale)));
}

.vc-face-top {
  transform:
    rotateX(90deg) translateZ(calc(30px * var(--ui-scale)));
}

.vc-face-bottom {
  transform:
    rotateX(-90deg) translateZ(calc(30px * var(--ui-scale)));
}

.legend-panel {
  position: absolute;
  left:
    calc(var(--scene-left-safe) + var(--scene-overlay-gap) + 10px);
  bottom:
    clamp(14px,
      1.6vh,
      24px);
  z-index: 22;
  min-width:
    calc(166px * var(--ui-scale));
  padding:
    calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
  pointer-events: none;
  background:
    linear-gradient(145deg,
      rgba(255, 255, 255, 0.72),
      rgba(255, 255, 255, 0.42));
  border:
    1px solid rgba(var(--theme-primary-rgb), 0.24);
  border-radius:
    calc(13px * var(--ui-scale));
  box-shadow:
    0 12px 28px rgba(44, 86, 112, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
  backdrop-filter:
    blur(12px) saturate(145%);
  -webkit-backdrop-filter:
    blur(12px) saturate(145%);
}

.legend-title {
  margin-bottom:
    calc(9px * var(--ui-scale));
  padding-bottom:
    calc(6px * var(--ui-scale));
  color:
    var(--theme-primary);
  font-size:
    calc(14px * var(--ui-scale));
  font-weight: 900;
  border-bottom:
    1px solid rgba(var(--theme-primary-rgb), 0.18);
}

.legend-grid {
  display: grid;
  grid-template-columns:
    repeat(2,
      max-content);
  gap:
    calc(5px * var(--ui-scale)) calc(12px * var(--ui-scale));
  align-items: center;
}

.legend-color-scale-item {
  grid-column:
    1 / -1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap:
    calc(7px * var(--ui-scale));
  color:
    var(--text-secondary);
  font-size:
    calc(12px * var(--ui-scale));
  white-space: nowrap;
}

.legend-bar {
  width:
    calc(92px * var(--ui-scale));
  height:
    calc(10px * var(--ui-scale));
  border-radius: 999px;
  background:
    linear-gradient(to right,
      #1a5c1a,
      #2e8b2e,
      #6ab04c,
      #d4d47a,
      #e8c84a,
      #d4a030,
      #c08040,
      #a06030,
      #704020,
      #d2c8b9,
      #f0eee4,
      #fffcf0);
}

.legend-labels {
  display: flex;
  width:
    calc(92px * var(--ui-scale));
  justify-content: space-between;
  margin-top:
    calc(2px * var(--ui-scale));
  color:
    var(--text-muted);
  font-size:
    calc(10px * var(--ui-scale));
}

.badge {
  display: inline-block;
  width:
    calc(11px * var(--ui-scale));
  height:
    calc(11px * var(--ui-scale));
  flex: 0 0 auto;
  border-radius: 50%;
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

.profile-mode-btn.active {
  color:
    var(--theme-on-primary) !important;
}

.terrain-knowledge {
  display: grid;
  gap: 6px;
}

.terrain-knowledge p {
  margin: 0;
}

@media (max-width: 1280px) {
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

  .legend-panel {
    max-width:
      min(50vw,
        max(132px,
          calc(100% - var(--scene-left-safe) - var(--scene-right-safe) - 84px)),
        210px);
    padding:
      10px 12px;
  }

  .legend-grid {
    grid-template-columns:
      1fr;
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

  .legend-panel {
    left:
      calc(var(--scene-left-safe) + var(--scene-overlay-gap));
    bottom: 10px;
    max-width:
      max(112px,
        calc(100% - var(--scene-left-safe) - var(--scene-right-safe) - 78px));
    min-width: 122px;
  }

  .legend-title {
    font-size: 12px;
  }

  .legend-item {
    font-size: 10px;
  }

  .legend-bar,
  .legend-labels {
    width: 74px;
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

  .legend-panel {
    padding:
      8px 9px;
    min-width: 112px;
  }

  .legend-grid {
    gap:
      4px 8px;
  }

  .legend-title {
    margin-bottom: 6px;
    padding-bottom: 5px;
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

.terrain-projection-template.theme-dark .legend-panel {
  color:
    rgba(226, 246, 250, 0.88);
  background:
    linear-gradient(145deg,
      rgba(8, 20, 34, 0.70),
      rgba(8, 20, 34, 0.42));
  border-color:
    rgba(var(--theme-primary-light-rgb), 0.24);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter:
    blur(12px) saturate(150%);
  -webkit-backdrop-filter:
    blur(12px) saturate(150%);
}

.terrain-projection-template.theme-dark .legend-title {
  color:
    var(--theme-primary-light);
  border-bottom-color:
    rgba(var(--theme-primary-light-rgb), 0.18);
  text-shadow:
    0 0 12px rgba(var(--theme-primary-rgb), 0.24);
}

.terrain-projection-template.theme-dark .legend-item {
  color:
    rgba(226, 246, 250, 0.82);
}

.terrain-projection-template.theme-dark .legend-labels {
  color:
    rgba(184, 204, 218, 0.72);
}

.terrain-projection-template.theme-dark .badge {
  box-shadow:
    0 0 10px rgba(255, 255, 255, 0.10),
    0 0 8px currentColor;
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






/* ===================== v16: Cube 使用 DOM 实际位置贴右侧面板 =====================
   这版不再用 CSS 变量猜右侧面板宽度。
   updateViewCubeDockPosition() 会读取 #right-panel.getBoundingClientRect()，
   然后直接设置 view-cube 的 right。
   CSS 只做兜底和尺寸，不再写 transform，避免破坏 JS 旋转。
*/

/* 左侧面板中的图例卡片 */
.terrain-projection-template .panel-terrain-legend-card {
  padding:
    14px !important;
}

.terrain-projection-template .panel-terrain-legend-card .section-title {
  margin-bottom:
    10px !important;
}

.terrain-projection-template .panel-legend-grid {
  display:
    grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap:
    8px 10px;
}

.terrain-projection-template .panel-legend-color-scale-item {
  grid-column:
    1 / -1;
}

.terrain-projection-template .panel-legend-item {
  display:
    flex;
  align-items:
    center;
  gap:
    6px;
  min-width:
    0;
  font-size:
    clamp(12px, 0.7vw, 14px);
  line-height:
    1.3;
  color:
    rgba(226, 232, 240, 0.92);
}

.terrain-projection-template .panel-legend-item .badge {
  flex:
    0 0 auto;
  width:
    9px;
  height:
    9px;
  border-radius:
    999px;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.14);
}

/* 场景旧图例彻底隐藏，避免残留 */
.terrain-projection-template .terrain-scene-overlay>.legend-panel {
  display:
    none !important;
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

  .terrain-projection-template .panel-legend-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap:
      6px 8px;
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

  .terrain-projection-template .panel-terrain-legend-card {
    padding:
      12px !important;
  }
}
</style>
