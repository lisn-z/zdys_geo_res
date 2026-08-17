<!-- 喀斯特地貌 3D 动态模型 · Version 4 -->
<template>
  <div
    ref="pageRef"
    class="karst-landform-container geo-template-page geo-page theme-dark layout-floating"
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

      <h1 class="page-title">
        喀斯特地貌
        <span class="page-subtitle">
          溶蚀作用 · 地表与地下双形态
        </span>
      </h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
        <button
          type="button"
          class="theme-btn reset-scene-btn"
          @click="resetControls"
          title="恢复默认视角"
        >
          重置
        </button>
      </div>
    </header>

    <main
      class="workspace"
      v-bind="workspaceAttrs"
    >
      <section class="center-stage">
        <div class="stage-content">
          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>

          <!-- 左上角：阶段信息卡片 -->
          <div class="stage-overlay">
            <div class="overlay-card">
              <div class="overlay-title">
                <span class="overlay-tag">KARST · 4-7</span>
                <strong>{{ activeStage.label.split('·')[0] }}</strong>
              </div>
              <p>
                {{ activeStage.description }}
              </p>
              <div class="overlay-keypoints">
                <span
                  v-for="point in activeStage.points"
                  :key="point"
                >{{ point }}</span>
              </div>
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
              <span>演化进度</span>
              <strong>{{ Math.round(evolutionProgress) }}%</strong>
            </div>

            <div class="timeline-stages">
              <button
                v-for="(stage, idx) in timelineStages"
                :key="stage.id"
                type="button"
                class="timeline-stage-node"
                :class="{ active: activeStageIdx === idx, passed: activeStageIdx > idx }"
                :style="{ left: stage.left + '%' }"
                @click="onStageNodeClick(idx)"
                @mouseenter="hoverStageIdx = idx"
                @mouseleave="hoverStageIdx = null"
              >
                <span class="timeline-stage-dot"></span>
                <span class="timeline-stage-label">{{ stage.label }}</span>
              </button>
              <div
                class="timeline-progress-fill"
                :style="{ width: evolutionProgress + '%' }"
              ></div>
            </div>
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

        <!-- 底部 tab 切换 -->
        <div class="bottom-tabs-dock">
          <button
            v-for="tab in bottomTabs"
            :key="tab.id"
            type="button"
            class="bottom-tab-btn"
            :class="{ active: activeBottomTab === tab.id }"
            @click="activeBottomTab = tab.id"
          >
            <el-icon v-if="tab.icon">
              <component :is="tab.icon" />
            </el-icon>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- 右下角：复位/全屏 -->
        <div class="bottom-right-actions">
          <button
            type="button"
            class="theme-btn icon-action-btn"
            title="复位"
            @click="resetControls"
          >
            <el-icon><RefreshRight /></el-icon>
          </button>
          <button
            type="button"
            class="theme-btn icon-action-btn"
            :title="isFullscreen ? '退出全屏' : '全屏'"
            @click="toggleFullscreen"
          >
            <el-icon><FullScreen v-if="!isFullscreen" /><Aim v-else /></el-icon>
          </button>
        </div>
      </section>

      <!-- 右侧数据/说明面板 -->
      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>地貌与配图</h2>
              <p>典型形态 · 代表景观</p>
            </div>
            <span class="panel-badge">KARST</span>
          </div>

          <div class="data-grid">
            <article
              v-for="card in dataCards"
              :key="card.label"
              class="geo-card data-card"
              :class="card.className"
            >
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <small>{{ card.description }}</small>
            </article>
          </div>

          <el-collapse
            v-model="activePanels"
            class="analysis-collapse"
          >
            <el-collapse-item
              title="喀斯特作用过程"
              name="process"
            >
              <ul class="feature-list">
                <li>
                  <strong>溶蚀作用</strong>
                  <span>含 CO₂ 的水对可溶性岩石（石灰岩为主）进行化学溶蚀，是喀斯特地貌发育的根本动力。</span>
                </li>
                <li>
                  <strong>淀积作用</strong>
                  <span>含 Ca(HCO₃)₂ 的水在压力降低或温度升高时，CO₂ 逸出，CaCO₃ 重新沉淀形成钟乳石、石笋等。</span>
                </li>
                <li>
                  <strong>机械崩塌</strong>
                  <span>地下溶洞扩大后顶部岩层失稳崩塌，形成天坑、漏斗等塌陷地貌。</span>
                </li>
              </ul>
            </el-collapse-item>

            <el-collapse-item
              title="中国典型分布"
              name="china"
            >
              <ul class="feature-list">
                <li>
                  <strong>重庆武隆</strong>
                  <span>天坑群与天生三桥，塌陷型喀斯特典型。</span>
                </li>
                <li>
                  <strong>云南路南</strong>
                  <span>剑状石林与剑状喀斯特。</span>
                </li>
                <li>
                  <strong>广西桂林</strong>
                  <span>峰林、峰丛、溶蚀盆地组合景观。</span>
                </li>
                <li>
                  <strong>浙江桐庐</strong>
                  <span>瑶琳洞，溶洞与钟乳石发育典型。</span>
                </li>
              </ul>
            </el-collapse-item>
          </el-collapse>

          <section class="geo-card example-card">
            <header class="example-header">
              <div>
                <h3>典型景观</h3>
                <p>当前阶段 {{ activeStage.label.split('·')[0] }}</p>
              </div>
            </header>
            <div class="example-grid">
              <figure
                v-for="item in landscapeExamples"
                :key="item.title"
                class="example-figure"
              >
                <img
                  :src="item.image"
                  :alt="item.title"
                />
                <figcaption>
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.location }}</span>
                </figcaption>
              </figure>
            </div>
          </section>
        </div>

        <div
          class="resize-handle resize-left"
          v-bind="rightResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElIcon } from 'element-plus'
import {
  Aim,
  FullScreen,
  Histogram,
  RefreshRight,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import '@/styles/geo-page-template.css'

/* ============================================================
   数据：演化阶段
   ============================================================ */

interface ExampleImage {
  title: string
  location: string
  image: string
}

interface EvolutionStage {
  id: string
  label: string
  description: string
  points: string[]
  peakCount: number
  sinkholeCount: number
  showStoneTeeth: boolean
  showTiankeng: boolean
  showBasin: boolean
  examples: ExampleImage[]
}

const evolutionStages: EvolutionStage[] = [
  {
    id: 'juvenile',
    label: '幼年·石芽溶沟',
    description: '溶洞崩塌形成天坑，地形起伏较高。',
    points: ['天坑', '石林', '落水洞', '溶水盆地'],
    peakCount: 0,
    sinkholeCount: 0,
    showStoneTeeth: true,
    showTiankeng: false,
    showBasin: false,
    examples: [],
  },
  {
    id: 'early-mature',
    label: '壮年早期·天坑',
    description: '溶洞崩塌形成天坑，石林发育，地形起伏剧烈。',
    points: ['天坑', '石林', '落水洞', '溶蚀洼地'],
    peakCount: 14,
    sinkholeCount: 6,
    showStoneTeeth: true,
    showTiankeng: true,
    showBasin: false,
    examples: [
      {
        title: '重庆武隆天坑',
        location: '天生三桥 · 塌陷特典型',
        image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/tiankeng.png',
      },
      {
        title: '云南路南石林',
        location: '石林 · 剑状喀斯特',
        image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/stoneForest.png',
      },
    ],
  },
  {
    id: 'mature-mid',
    label: '壮年中期·峰丛',
    description: '溶蚀加深，峰丛逐渐明显，地下溶洞与暗河系统进一步发育。',
    points: ['峰丛', '落水洞', '溶洞', '地下河'],
    peakCount: 16,
    sinkholeCount: 5,
    showStoneTeeth: true,
    showTiankeng: true,
    showBasin: true,
    examples: [
      {
        title: '广西桂林山水',
        location: '峰丛 · 峰林',
        image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/peakForest.png',
      },
    ],
  },
  {
    id: 'mature-late',
    label: '壮年晚期·峰林盆地',
    description: '峰林与溶蚀盆地广布，地形分异强烈，是喀斯特发育最盛时期。',
    points: ['峰林', '溶蚀盆地', '天坑', '落水洞'],
    peakCount: 18,
    sinkholeCount: 4,
    showStoneTeeth: false,
    showTiankeng: true,
    showBasin: true,
    examples: [
      {
        title: '广西桂林山水',
        location: '峰林 · 峰丛',
        image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/peakForest.png',
      },
    ],
  },
  {
    id: 'old-age',
    label: '老年·孤峰',
    description: '峰林被进一步溶蚀降低，仅剩少数孤峰散布于准平原上。',
    points: ['孤峰', '溶蚀盆地'],
    peakCount: 4,
    sinkholeCount: 0,
    showStoneTeeth: false,
    showTiankeng: false,
    showBasin: true,
    examples: [],
  },
]

const speedOptions = [0.5, 1, 2, 5]

/* 5 段时间轴（与图片下方的 5 个 marker 一致） */
const timelineStages = [
  { id: 'juvenile', label: '幼年期', left: 5 },
  { id: 'early-mature', label: '壮年早期', left: 30 },
  { id: 'mature-mid', label: '壮年中期', left: 55 },
  { id: 'mature-late', label: '壮年晚期', left: 80 },
  { id: 'old-age', label: '老年期', left: 95 },
]

/* 底部 tab */
interface BottomTab {
  id: string
  label: string
  icon?: any
}

const bottomTabs = computed<BottomTab[]>(() => [
  { id: 'surface', label: '地表形态', icon: Histogram },
  { id: 'underground', label: '地下结构', icon: Histogram },
  { id: 'hydrology', label: '水文系统', icon: Histogram },
  { id: 'formation', label: '形成过程', icon: Histogram },
])

/* ============================================================
   状态
   ============================================================ */

const currentStage = ref('early-mature')
const evolutionProgress = ref(45)
const rotationSpeed = ref(0.10)
const playbackSpeed = ref(1)
const isPlaying = ref(false)
const activePanels = ref<string[]>(['process'])
const activeBottomTab = ref('surface')
const hoverStageIdx = ref<number | null>(null)
const isFullscreen = ref(false)

const activeStageIdx = computed(() => {
  const total = timelineStages.length - 1
  const floatIdx = (evolutionProgress.value / 100) * total
  return Math.round(floatIdx)
})

const activeStage = computed<EvolutionStage>(() => {
  const found = evolutionStages.find(
    (item) => item.id === currentStage.value
  )
  return found ?? evolutionStages[0]!
})

const featuredPhoto = computed<ExampleImage>(() => {
  return activeStage.value.examples[0] ?? {
    title: '重庆武隆天坑',
    location: '天生三桥 · 塌陷特典型',
    image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/tiankeng.png',
  }
})

const landscapeExamples = computed<ExampleImage[]>(() => {
  if (activeStage.value.examples.length >= 2) {
    return activeStage.value.examples.slice(0, 2)
  }
  return [
    {
      title: '重庆武隆天坑',
      location: '天生三桥 · 塌陷特典型',
      image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/tiankeng.png',
    },
    {
      title: '云南路南石林',
      location: '石林 · 剑状喀斯特',
      image: 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/karst/stoneForest.png',
    },
  ]
})

const dataCards = computed(() => {
  const stage = activeStage.value
  const [headPart, tailPart] = stage.label.split('·')
  return [
    {
      label: '当前阶段',
      value: (headPart ?? '').trim(),
      description: tailPart?.trim() || '',
      className: 'cyan-card',
    },
    {
      label: '典型形态',
      value: '4 种',
      description: '天坑 · 石林 · 落水洞 · 落水盆地',
      className: 'blue-card',
    },
    {
      label: '峰丛数量',
      value: '14 座',
      description: '当前阶段的峰丛估算',
      className: 'purple-card',
    },
    {
      label: '演化进度',
      value: Math.round(evolutionProgress.value) + '%',
      description: isPlaying.value
        ? '正在演示发育过程'
        : '可手动拖动控制',
      className: 'orange-card',
    },
  ]
})

/* ============================================================
   面板布局
   ============================================================ */

const hasRightPanel = true

const {
  rootRef: pageRef,
  layoutMode,

  rightCollapsed,
  allPanelsCollapsed,

  draggingSide,
  viewportResizing,

  workspaceAttrs,
  rightPanelAttrs,

  rightResizeAttrs,

  rightCollapseAttrs,

  rightEntryAttrs,

  setAllCollapsed,
  resetWidths,

  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  right: {
    enabled: hasRightPanel,
  },

  onLayoutChange(state) {
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

/* ============================================================
   Three.js 场景对象
   ============================================================ */

const threeContainerRef = ref<HTMLElement | null>(null)

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null

let mainLight: THREE.DirectionalLight | null = null

let terrainGroup: THREE.Group | null = null
let terrainMesh: THREE.Mesh | null = null
let strataGroup: THREE.Group | null = null
let sinkholeGroup: THREE.Group | null = null
let peakGroup: THREE.Group | null = null
let stoneToothGroup: THREE.Group | null = null
let basinGroup: THREE.Group | null = null
let waterGroup: THREE.Group | null = null
let stalactiteGroup: THREE.Group | null = null
let undergroundRiverMesh: THREE.Mesh | null = null
let caveGroup: THREE.Group | null = null
let permeationGroup: THREE.Group | null = null
let labelGroup: THREE.Group | null = null
let leaderLineMesh: THREE.LineSegments | null = null

interface DropletRecord {
  mesh: THREE.Mesh
  startY: number
  endY: number
  speed: number
  offset: number
}
const permeationDroplets: DropletRecord[] = []

interface PeakRecord {
  mesh: THREE.Mesh
  baseHeight: number
  targetScale: number
}

const peakRecords: PeakRecord[] = []

const sceneMaterials: THREE.Material[] = []
const sceneGeometries: THREE.BufferGeometry[] = []
const sceneTextures: THREE.CanvasTexture[] = []

let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

const sceneClock = new THREE.Clock()

/* ============================================================
   工具方法
   ============================================================ */

function createRandom(seed: number) {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 创建标签纹理 —— 用 Canvas 绘制圆角矩形 + 文字 + 引导线
 */
function createLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')!

  // 圆角矩形背景
  ctx.fillStyle = 'rgba(13, 28, 48, 0.85)'
  const roundRect = (ctx as any).roundRect
  if (typeof roundRect === 'function') {
    roundRect.call(ctx, 4, 8, 248, 56, 20)
  } else {
    ctx.rect(4, 8, 248, 56)
  }
  ctx.fill()

  // 边框
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  if (typeof roundRect === 'function') {
    roundRect.call(ctx, 4, 8, 248, 56, 20)
  } else {
    ctx.rect(4, 8, 248, 56)
  }
  ctx.stroke()

  // 文字
  ctx.font = 'bold 32px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 36)

  // 底部小圆点
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(128, 80, 5, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  sceneTextures.push(tex)
  return tex
}

/* ============================================================
   场景构建
   ============================================================ */

function buildTerrain() {
  if (!terrainGroup) return

  /*
   * V2：按教材剖面图重构为“立体地块 + 绿色地表 + 分层石灰岩剖面”。
   * 正面保留可观察的岩层切面，顶部使用高低起伏网格表现喀斯特峰丛。
   */
  const blockW = 18
  const blockD = 10
  const topY = 0.55
  const layerH = 0.62

  strataGroup = new THREE.Group()
  terrainGroup.add(strataGroup)

  // 地块底座：正面/侧面形成教材式剖面框
  const strataColors = ['#b18c5f', '#9a744c', '#805c3d', '#62452f']
  strataColors.forEach((color, idx) => {
    const geo = new THREE.BoxGeometry(blockW, layerH, blockD)
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.02,
      flatShading: true,
    })
    sceneGeometries.push(geo)
    sceneMaterials.push(mat)

    const slab = new THREE.Mesh(geo, mat)
    slab.position.set(0, -0.05 - idx * layerH - layerH / 2, 0)
    slab.receiveShadow = true
    slab.castShadow = true
    strataGroup?.add(slab)
  })

  // 顶部绿色地表
  const segmentsX = 96
  const segmentsZ = 72
  const geometry = new THREE.PlaneGeometry(
    blockW - 0.08,
    blockD - 0.08,
    segmentsX,
    segmentsZ,
  )
  const material = new THREE.MeshStandardMaterial({
    color: '#4e8f55',
    roughness: 0.82,
    metalness: 0.02,
    flatShading: true,
  })
  sceneGeometries.push(geometry)
  sceneMaterials.push(material)

  terrainMesh = new THREE.Mesh(geometry, material)
  terrainMesh.rotation.x = -Math.PI / 2
  terrainMesh.position.y = topY
  terrainMesh.receiveShadow = true
  terrainMesh.castShadow = true
  terrainGroup.add(terrainMesh)

  const positionAttr = terrainMesh.geometry.getAttribute('position') as THREE.BufferAttribute
  const rng = createRandom(20260715)

  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i)
    const z = positionAttr.getY(i)

    let h =
      Math.sin(x * 0.55) * Math.cos(z * 0.48) * 0.20 +
      Math.sin(x * 1.18 + 1.1) * Math.cos(z * 1.35) * 0.11 +
      Math.sin(x * 0.22 - z * 0.32) * 0.18

    // 中央峰丛区抬高，左右两侧向河谷过渡
    const ridge = Math.exp(-((x - 1.0) ** 2) / 18 - ((z + 0.8) ** 2) / 9)
    h += ridge * 0.45

    // 教材式落水盆地/洼地区域
    const basin1 = Math.exp(-((x - 3.4) ** 2) / 5 - ((z - 1.2) ** 2) / 2.6)
    const basin2 = Math.exp(-((x + 4.2) ** 2) / 4 - ((z + 1.0) ** 2) / 2.5)
    h -= basin1 * 0.28 + basin2 * 0.22

    // 边缘略低，形成台地轮廓
    h -= Math.max(0, Math.abs(x) - 7.2) * 0.08
    h -= Math.max(0, Math.abs(z) - 3.7) * 0.06
    h += (rng() - 0.5) * 0.035

    positionAttr.setZ(i, h)
  }

  positionAttr.needsUpdate = true
  terrainMesh.geometry.computeVertexNormals()

  // 正面岩层细纹：用细线条增强教材剖面辨识度
  for (let idx = 0; idx < 4; idx++) {
    const y = -0.18 - idx * layerH
    const pts = [
      new THREE.Vector3(-blockW / 2 + 0.1, y, blockD / 2 + 0.012),
      new THREE.Vector3(-blockW / 2 + 3.0, y + 0.05, blockD / 2 + 0.012),
      new THREE.Vector3(-1.8, y - 0.03, blockD / 2 + 0.012),
      new THREE.Vector3(2.8, y + 0.04, blockD / 2 + 0.012),
      new THREE.Vector3(blockW / 2 - 0.1, y - 0.02, blockD / 2 + 0.012),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({
      color: '#5b3e2b',
      transparent: true,
      opacity: 0.52,
    })
    sceneGeometries.push(geo)
    sceneMaterials.push(mat)
    const line = new THREE.Line(geo, mat)
    strataGroup?.add(line)
  }
}

function buildStoneTeeth() {
  if (!terrainGroup) return

  stoneToothGroup = new THREE.Group()
  terrainGroup.add(stoneToothGroup)

  const toothMat = new THREE.MeshStandardMaterial({
    color: '#7d786f',
    roughness: 0.68,
    metalness: 0.03,
    flatShading: true,
  })
  sceneMaterials.push(toothMat)

  // 石芽：前左侧较低、密集的小型锥状岩柱
  const rng = createRandom(771)
  for (let i = 0; i < 24; i++) {
    const x = -7.0 + rng() * 4.4
    const z = -2.7 + rng() * 3.6
    const h = 0.18 + rng() * 0.42
    const r = 0.09 + rng() * 0.11
    const geo = new THREE.ConeGeometry(r, h, 5)
    sceneGeometries.push(geo)
    const m = new THREE.Mesh(geo, toothMat)
    m.position.set(x, 0.72 + h / 2, z)
    m.rotation.y = rng() * Math.PI
    m.castShadow = true
    m.receiveShadow = true
    stoneToothGroup.add(m)
  }

  // 石林：中央偏后方的剑状喀斯特
  const forestMat = new THREE.MeshStandardMaterial({
    color: '#8c877e',
    roughness: 0.66,
    metalness: 0.04,
    flatShading: true,
  })
  sceneMaterials.push(forestMat)

  const forestRng = createRandom(881)
  const clusters = [
    { x: -1.1, z: -1.0, n: 9 },
    { x: 0.6, z: -0.5, n: 11 },
    { x: 2.0, z: -0.7, n: 8 },
  ]

  clusters.forEach((c) => {
    for (let i = 0; i < c.n; i++) {
      const cx = c.x + (forestRng() - 0.5) * 2.1
      const cz = c.z + (forestRng() - 0.5) * 2.0
      const h = 0.75 + forestRng() * 2.25
      const radius = 0.16 + forestRng() * 0.24
      const geo = new THREE.ConeGeometry(
        radius,
        h,
        5 + Math.floor(forestRng() * 3),
      )
      sceneGeometries.push(geo)
      const m = new THREE.Mesh(geo, forestMat)
      m.position.set(cx, 0.7 + h / 2, cz)
      m.rotation.y = forestRng() * Math.PI
      m.castShadow = true
      m.receiveShadow = true
      stoneToothGroup.add(m)
    }
  })

  // 右侧峰林：体量更大，呼应教材右侧典型景观
  const rightForestMat = new THREE.MeshStandardMaterial({
    color: '#77766f',
    roughness: 0.7,
    metalness: 0.02,
    flatShading: true,
  })
  sceneMaterials.push(rightForestMat)

  const rightRng = createRandom(913)
  for (let i = 0; i < 10; i++) {
    const x = 4.2 + rightRng() * 2.8
    const z = -1.8 + rightRng() * 3.1
    const h = 0.8 + rightRng() * 1.7
    const r = 0.18 + rightRng() * 0.24
    const geo = new THREE.ConeGeometry(r, h, 6)
    sceneGeometries.push(geo)
    const m = new THREE.Mesh(geo, rightForestMat)
    m.position.set(x, 0.72 + h / 2, z)
    m.castShadow = true
    m.receiveShadow = true
    stoneToothGroup.add(m)
  }
}

function buildSinkholes() {
  if (!terrainGroup) return

  sinkholeGroup?.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
    else mesh.material?.dispose()
  })
  if (sinkholeGroup) terrainGroup.remove(sinkholeGroup)

  sinkholeGroup = new THREE.Group()
  terrainGroup.add(sinkholeGroup)

  const darkMat = new THREE.MeshStandardMaterial({
    color: '#07130f',
    roughness: 0.98,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#345e45',
    roughness: 0.9,
    metalness: 0,
  })
  sceneMaterials.push(darkMat, rimMat)

  // 溶蚀洼地 / 落水洞
  const small = [
    [-5.1, 1.0, 0.48],
    [-4.0, 0.15, 0.42],
    [-3.4, -1.25, 0.35],
    [-2.3, 0.85, 0.42],
    [1.8, 1.8, 0.36],
  ] as Array<[number, number, number]>

  small.forEach(([x, z, r]) => {
    const geo = new THREE.SphereGeometry(r, 28, 18)
    sceneGeometries.push(geo)
    const m = new THREE.Mesh(geo, darkMat)
    m.position.set(x, 0.68, z)
    m.scale.y = 0.32
    m.castShadow = true
    sinkholeGroup!.add(m)

    const ringGeo = new THREE.TorusGeometry(r * 1.05, 0.045, 7, 28)
    sceneGeometries.push(ringGeo)
    const ring = new THREE.Mesh(ringGeo, rimMat)
    ring.position.set(x, 0.71, z)
    ring.rotation.x = Math.PI / 2
    sinkholeGroup!.add(ring)
  })

  // 两处典型天坑：做成较深的黑色凹口
  const tiankengs = [
    { x: -3.9, z: 1.05, rx: 0.9, rz: 0.72 },
    { x: -0.8, z: 0.65, rx: 0.72, rz: 0.58 },
  ]

  tiankengs.forEach((t) => {
    const geo = new THREE.SphereGeometry(1, 40, 24)
    sceneGeometries.push(geo)
    const m = new THREE.Mesh(geo, darkMat)
    m.position.set(t.x, 0.72, t.z)
    m.scale.set(t.rx, 0.30, t.rz)
    m.castShadow = true
    sinkholeGroup!.add(m)

    const rimGeo = new THREE.TorusGeometry(1, 0.055, 8, 40)
    sceneGeometries.push(rimGeo)
    const rim = new THREE.Mesh(rimGeo, rimMat)
    rim.position.set(t.x, 0.74, t.z)
    rim.scale.set(t.rx, 1, t.rz)
    rim.rotation.x = Math.PI / 2
    sinkholeGroup!.add(rim)
  })
}

function buildPeaks() {
  if (!terrainGroup) return

  peakGroup?.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
    else mesh.material?.dispose()
  })
  if (peakGroup) terrainGroup.remove(peakGroup)

  peakGroup = new THREE.Group()
  terrainGroup.add(peakGroup)
  peakRecords.length = 0

  const peakMat = new THREE.MeshStandardMaterial({
    color: '#4e8759',
    roughness: 0.72,
    metalness: 0.03,
    flatShading: true,
  })
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#827d73',
    roughness: 0.66,
    metalness: 0.03,
    flatShading: true,
  })
  sceneMaterials.push(peakMat, rockMat)

  const rng = createRandom(99821)

  // 峰丛：后侧形成连续的山体群，体量比石林更大
  for (let i = 0; i < 14; i++) {
    const x = 2.2 + rng() * 4.6
    const z = -3.0 + rng() * 1.8
    const h = 0.8 + rng() * 2.3
    const radius = 0.34 + rng() * 0.42

    const geo = new THREE.ConeGeometry(radius, h, 7 + Math.floor(rng() * 3))
    sceneGeometries.push(geo)
    const mesh = new THREE.Mesh(geo, peakMat)
    mesh.position.set(x, 0.68 + h / 2, z)
    mesh.rotation.y = rng() * Math.PI
    mesh.castShadow = true
    mesh.receiveShadow = true
    peakGroup.add(mesh)
    peakRecords.push({ mesh, baseHeight: h, targetScale: 1 })
  }

  // 远端大型峰体，形成教材右上方峰林轮廓
  for (let i = 0; i < 6; i++) {
    const x = 4.2 + rng() * 3.2
    const z = 0.2 + rng() * 2.7
    const h = 1.2 + rng() * 1.8
    const radius = 0.38 + rng() * 0.34
    const geo = new THREE.ConeGeometry(radius, h, 7)
    sceneGeometries.push(geo)
    const mesh = new THREE.Mesh(geo, rockMat)
    mesh.position.set(x, 0.68 + h / 2, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    peakGroup.add(mesh)
  }
}

function buildBasin() {
  if (!terrainGroup) return

  basinGroup = new THREE.Group()
  terrainGroup.add(basinGroup)

  const lakeMat = new THREE.MeshPhysicalMaterial({
    color: '#168dc2',
    roughness: 0.18,
    metalness: 0.15,
    transmission: 0.08,
    transparent: true,
    opacity: 0.9,
  })
  sceneMaterials.push(lakeMat)

  const lakeGeo = new THREE.CircleGeometry(1.25, 48)
  sceneGeometries.push(lakeGeo)
  const lake = new THREE.Mesh(lakeGeo, lakeMat)
  lake.rotation.x = -Math.PI / 2
  lake.position.set(2.6, 0.72, 1.65)
  lake.scale.set(1.25, 0.9, 1)
  lake.receiveShadow = true
  basinGroup.add(lake)

  // 地表河流：从高地进入盆地，再向右侧流出
  const riverMat = new THREE.MeshPhysicalMaterial({
    color: '#2ba6d6',
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.9,
  })
  sceneMaterials.push(riverMat)

  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.4, 0.73, 3.2),
    new THREE.Vector3(-6.5, 0.73, 1.9),
    new THREE.Vector3(-4.8, 0.73, 2.8),
    new THREE.Vector3(-2.5, 0.73, 1.4),
    new THREE.Vector3(-0.8, 0.73, 2.2),
    new THREE.Vector3(1.4, 0.73, 1.8),
    new THREE.Vector3(2.6, 0.73, 1.65),
    new THREE.Vector3(4.1, 0.73, 2.0),
    new THREE.Vector3(6.2, 0.73, 1.0),
    new THREE.Vector3(8.3, 0.73, -0.2),
  ])
  const riverGeo = new THREE.TubeGeometry(riverCurve, 120, 0.16, 10, false)
  sceneGeometries.push(riverGeo)
  const riverMesh = new THREE.Mesh(riverGeo, riverMat)
  riverMesh.receiveShadow = true
  basinGroup.add(riverMesh)

  // 右侧小瀑布
  const fallCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(7.0, 0.72, 1.0),
    new THREE.Vector3(7.1, 0.25, 1.0),
    new THREE.Vector3(7.15, -0.25, 1.0),
  ])
  const fallGeo = new THREE.TubeGeometry(fallCurve, 24, 0.12, 8, false)
  sceneGeometries.push(fallGeo)
  const fall = new THREE.Mesh(fallGeo, riverMat)
  basinGroup.add(fall)
}

function buildCave() {
  if (!terrainGroup) return

  caveGroup = new THREE.Group()
  terrainGroup.add(caveGroup)

  // 前剖面溶洞：黑色洞腔 + 暖色钟乳石，直接对应教材剖面图
  const caveMat = new THREE.MeshStandardMaterial({
    color: '#111814',
    emissive: '#08130e',
    emissiveIntensity: 0.35,
    roughness: 0.94,
    metalness: 0,
  })
  const caveRimMat = new THREE.MeshStandardMaterial({
    color: '#6d4b32',
    roughness: 0.9,
    metalness: 0,
  })
  sceneMaterials.push(caveMat, caveRimMat)

  const frontZ = 5.015
  const openings = [
    { x: -5.3, y: -0.9, rx: 1.45, ry: 0.65 },
    { x: -2.3, y: -1.0, rx: 1.65, ry: 0.72 },
    { x: 1.2, y: -1.05, rx: 1.75, ry: 0.72 },
    { x: 4.6, y: -0.9, rx: 1.45, ry: 0.62 },
  ]

  openings.forEach((o) => {
    const geo = new THREE.SphereGeometry(1, 36, 22)
    sceneGeometries.push(geo)
    const m = new THREE.Mesh(geo, caveMat)
    m.position.set(o.x, o.y, frontZ + 0.025)
    m.scale.set(o.rx, o.ry, 0.18)
    caveGroup!.add(m)

    const rimGeo = new THREE.TorusGeometry(1, 0.07, 8, 40)
    sceneGeometries.push(rimGeo)
    const rim = new THREE.Mesh(rimGeo, caveRimMat)
    rim.position.set(o.x, o.y, frontZ + 0.05)
    rim.scale.set(o.rx, o.ry, 1)
    rim.rotation.x = Math.PI / 2
    caveGroup!.add(rim)
  })

  // 地下洞穴主通道
  const cavePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7.2, -1.15, 4.7),
    new THREE.Vector3(-5.0, -1.28, 3.1),
    new THREE.Vector3(-2.0, -1.38, 2.0),
    new THREE.Vector3(0.5, -1.45, 1.2),
    new THREE.Vector3(3.0, -1.42, 2.0),
    new THREE.Vector3(6.6, -1.2, 3.6),
  ])
  const caveGeo = new THREE.TubeGeometry(cavePath, 120, 0.55, 18, false)
  sceneGeometries.push(caveGeo)
  const caveTube = new THREE.Mesh(caveGeo, caveMat)
  caveGroup.add(caveTube)

  // 钟乳石 / 石笋
  stalactiteGroup = new THREE.Group()
  caveGroup.add(stalactiteGroup)

  const stalactiteMat = new THREE.MeshStandardMaterial({
    color: '#d6a15b',
    roughness: 0.56,
    metalness: 0.02,
  })
  const stalagmiteMat = new THREE.MeshStandardMaterial({
    color: '#e0bd7b',
    roughness: 0.58,
    metalness: 0.02,
  })
  sceneMaterials.push(stalactiteMat, stalagmiteMat)

  const rng = createRandom(6677)
  for (let i = 0; i < 26; i++) {
    const x = -6.9 + rng() * 13.8
    const y = -0.85 - rng() * 0.6
    const z = 4.82 + (rng() - 0.5) * 0.35
    const h = 0.18 + rng() * 0.62
    const r = 0.055 + rng() * 0.085

    const topGeo = new THREE.ConeGeometry(r, h, 8)
    sceneGeometries.push(topGeo)
    const top = new THREE.Mesh(topGeo, stalactiteMat)
    top.position.set(x, y, z)
    top.rotation.x = Math.PI
    top.castShadow = true
    stalactiteGroup.add(top)

    const bottomGeo = new THREE.ConeGeometry(r * 0.85, h * 0.78, 8)
    sceneGeometries.push(bottomGeo)
    const bottom = new THREE.Mesh(bottomGeo, stalagmiteMat)
    bottom.position.set(x, y - 0.62, z)
    bottom.castShadow = true
    stalactiteGroup.add(bottom)
  }

  // 地下暗河：蓝色发光水脉
  const darkRiverMat = new THREE.MeshPhysicalMaterial({
    color: '#168fd0',
    emissive: '#0a4d73',
    emissiveIntensity: 0.55,
    roughness: 0.16,
    metalness: 0.18,
    transparent: true,
    opacity: 0.92,
  })
  sceneMaterials.push(darkRiverMat)

  const darkRiverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.2, -1.65, 4.9),
    new THREE.Vector3(-5.4, -1.72, 3.7),
    new THREE.Vector3(-2.2, -1.8, 2.8),
    new THREE.Vector3(0.8, -1.82, 2.2),
    new THREE.Vector3(3.7, -1.76, 3.0),
    new THREE.Vector3(7.8, -1.58, 4.7),
  ])
  const darkRiverGeo = new THREE.TubeGeometry(darkRiverCurve, 100, 0.16, 10, false)
  sceneGeometries.push(darkRiverGeo)
  undergroundRiverMesh = new THREE.Mesh(darkRiverGeo, darkRiverMat)
  caveGroup.add(undergroundRiverMesh)
}

function buildPermeation() {
  if (!terrainGroup) return

  permeationGroup = new THREE.Group()
  terrainGroup.add(permeationGroup)

  // 渗透管道材质（半透明蓝色）
  const streamMat = new THREE.MeshBasicMaterial({
    color: '#2ba6d6',
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  })
  sceneMaterials.push(streamMat)

  // 水滴材质
  const dropletMat = new THREE.MeshStandardMaterial({
    color: '#3fc7f0',
    emissive: '#1a8cc4',
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.4,
    transparent: true,
    opacity: 0.9,
  })
  sceneMaterials.push(dropletMat)

  // 渗透点：从落水洞/天坑表面向下到地下河
  const permeationPoints = [
    { x: -5.1, z: 0.48, surfaceY: 0.66, undergroundY: -1.62 },
    { x: -4.0, z: 0.15, surfaceY: 0.66, undergroundY: -1.68 },
    { x: -3.9, z: 1.05, surfaceY: 0.66, undergroundY: -1.65 },
    { x: -3.4, z: -1.25, surfaceY: 0.66, undergroundY: -1.72 },
    { x: -2.3, z: 0.85, surfaceY: 0.66, undergroundY: -1.74 },
    { x: -0.8, z: 0.65, surfaceY: 0.66, undergroundY: -1.78 },
    { x: 1.8, z: 1.8, surfaceY: 0.66, undergroundY: -1.76 },
  ]

  permeationPoints.forEach((pt) => {
    const height = pt.surfaceY - pt.undergroundY

    // 垂直渗透管道
    const tubeGeo = new THREE.CylinderGeometry(0.05, 0.03, height, 8, 1, true)
    sceneGeometries.push(tubeGeo)
    const tube = new THREE.Mesh(tubeGeo, streamMat)
    tube.position.set(pt.x, (pt.surfaceY + pt.undergroundY) / 2, pt.z)
    permeationGroup!.add(tube)

    // 水滴粒子（3个，错开时间）
    for (let i = 0; i < 3; i++) {
      const dropGeo = new THREE.SphereGeometry(0.045, 8, 6)
      sceneGeometries.push(dropGeo)
      const drop = new THREE.Mesh(dropGeo, dropletMat.clone())
      drop.position.set(pt.x, pt.surfaceY, pt.z)
      permeationGroup!.add(drop)
      permeationDroplets.push({
        mesh: drop,
        startY: pt.surfaceY,
        endY: pt.undergroundY,
        speed: 0.35 + Math.random() * 0.15,
        offset: i * 0.33,
      })
    }
  })
}

function buildWater() {
  if (!terrainGroup) return

  waterGroup = new THREE.Group()
  terrainGroup.add(waterGroup)

  // 落水洞水面（小圆）
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#3a96c8',
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.7,
  })
  sceneMaterials.push(waterMat)

  const waterLocs = [
    { x: -3.2, z: 0.5, r: 0.18 },
    { x: -3.5, z: -0.5, r: 0.16 },
    { x: -2.8, z: -0.8, r: 0.18 },
    { x: -3.0, z: 0.9, r: 0.15 },
    { x: -2.5, z: 0.6, r: 0.17 },
    { x: -2.6, z: -1.0, r: 0.15 },
  ]
  waterLocs.forEach((w) => {
    const geo = new THREE.CircleGeometry(w.r, 20)
    sceneGeometries.push(geo)
    const m = new THREE.Mesh(geo, waterMat)
    m.rotation.x = -Math.PI / 2
    m.position.set(w.x, 0.42, w.z)
    if (waterGroup) waterGroup.add(m)
  })
}

/* ============================================================
   引线标签系统
   ============================================================ */

interface LabelDef {
  text: string
  anchor: THREE.Vector3 /* 锚点（指向地貌） */
  tag: THREE.Vector3 /* 标签位置 */
  color: string
}

const labelDefs: LabelDef[] = [
  {
    text: '落水洞',
    anchor: new THREE.Vector3(-5.1, 0.72, 1.0),
    tag: new THREE.Vector3(-6.8, 2.1, 2.8),
    color: '#39d2ff',
  },
  {
    text: '石芽',
    anchor: new THREE.Vector3(-5.8, 0.82, -1.2),
    tag: new THREE.Vector3(-7.0, 1.5, -2.8),
    color: '#39d2ff',
  },
  {
    text: '天坑',
    anchor: new THREE.Vector3(-3.9, 0.78, 1.05),
    tag: new THREE.Vector3(-3.6, 2.2, 3.0),
    color: '#39d2ff',
  },
  {
    text: '石林',
    anchor: new THREE.Vector3(0.2, 2.0, -0.6),
    tag: new THREE.Vector3(1.2, 3.2, -2.2),
    color: '#39d2ff',
  },
  {
    text: '溶蚀洼地',
    anchor: new THREE.Vector3(2.6, 0.76, 1.65),
    tag: new THREE.Vector3(3.5, 1.9, 3.2),
    color: '#39d2ff',
  },
  {
    text: '峰丛',
    anchor: new THREE.Vector3(5.0, 2.1, -2.3),
    tag: new THREE.Vector3(6.5, 3.0, -3.4),
    color: '#39d2ff',
  },
  {
    text: '溶洞',
    anchor: new THREE.Vector3(-1.8, -1.0, 5.0),
    tag: new THREE.Vector3(-2.6, -2.0, 6.0),
    color: '#ffaa44',
  },
  {
    text: '地下河',
    anchor: new THREE.Vector3(2.0, -1.75, 4.0),
    tag: new THREE.Vector3(3.5, -2.2, 5.6),
    color: '#39d2ff',
  },
  {
    text: '渗透水',
    anchor: new THREE.Vector3(-3.9, -0.3, 1.05),
    tag: new THREE.Vector3(-5.8, -0.5, 2.8),
    color: '#3fc7f0',
  },
  {
    text: '云南路南石林',
    anchor: new THREE.Vector3(0.8, 2.7, -0.8),
    tag: new THREE.Vector3(0.8, 4.0, -1.8),
    color: '#7adcff',
  },
  {
    text: '广西桂林山水',
    anchor: new THREE.Vector3(5.8, 2.0, 1.2),
    tag: new THREE.Vector3(6.8, 3.2, 2.8),
    color: '#7adcff',
  },
]

function buildLabels() {
  if (!terrainGroup) return

  labelGroup = new THREE.Group()
  terrainGroup.add(labelGroup)

  const MAX_LINES = labelDefs.length * 2
  const linePositions = new Float32Array(MAX_LINES * 2 * 3)
  const lineColors = new Float32Array(MAX_LINES * 2 * 3)
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))
  lineGeo.setDrawRange(0, 0)
  sceneGeometries.push(lineGeo)

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
  })
  sceneMaterials.push(lineMat)

  leaderLineMesh = new THREE.LineSegments(lineGeo, lineMat)
  terrainGroup.add(leaderLineMesh)

  labelDefs.forEach((def) => {
    const tex = createLabelTexture(def.text, def.color)
    const planeGeo = new THREE.PlaneGeometry(1.65, 0.58)
    sceneGeometries.push(planeGeo)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    sceneMaterials.push(mat)
    const m = new THREE.Mesh(planeGeo, mat)
    m.position.copy(def.tag)
    m.userData = {
      isLabel: true,
      texture: tex,
      text: def.text,
      color: def.color,
    }
    m.renderOrder = 999
    if (labelGroup) labelGroup.add(m)

    // 引线
    const start = def.anchor
    const end = def.tag.clone().add(new THREE.Vector3(0, -0.30, 0))
    const c = new THREE.Color(def.color)
    if (!leaderLineMesh) return
    const positionAttr = leaderLineMesh.geometry.attributes.position
    const colorAttr = leaderLineMesh.geometry.attributes.color
    if (!positionAttr || !colorAttr) return
    const linePositions = positionAttr.array as Float32Array
    const lineColors = colorAttr.array as Float32Array
    const dr = leaderLineMesh.geometry.drawRange.count
    linePositions[dr + 0] = start.x
    linePositions[dr + 1] = start.y
    linePositions[dr + 2] = start.z
    linePositions[dr + 3] = end.x
    linePositions[dr + 4] = end.y
    linePositions[dr + 5] = end.z
    lineColors[dr + 0] = c.r
    lineColors[dr + 1] = c.g
    lineColors[dr + 2] = c.b
    lineColors[dr + 3] = c.r
    lineColors[dr + 4] = c.g
    lineColors[dr + 5] = c.b
    leaderLineMesh.geometry.drawRange.count = dr + 6
  })

  if (leaderLineMesh) {
    const positionAttr = leaderLineMesh.geometry.attributes.position
    const colorAttr = leaderLineMesh.geometry.attributes.color
    if (positionAttr) positionAttr.needsUpdate = true
    if (colorAttr) colorAttr.needsUpdate = true
  }
}

/* ============================================================
   场景生命周期
   ============================================================ */

function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0c2034')
  scene.fog = new THREE.Fog('#0c2034', 28, 80)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
  camera.position.set(13.5, 8.8, 18.5)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 13
  orbitControls.maxDistance = 38
  orbitControls.minPolarAngle = 0.2
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.12
  orbitControls.target.set(0, -0.05, 0)

  // 光照
  const hemi = new THREE.HemisphereLight(0xcaf6ff, 0x1a2532, 1.0)
  scene.add(hemi)

  mainLight = new THREE.DirectionalLight(0xfff5d0, 1.5)
  mainLight.position.set(8, 14, 8)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.set(1024, 1024)
  scene.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0x74eae5, 0.55)
  fillLight.position.set(-6, 6, -4)
  scene.add(fillLight)

  const backLight = new THREE.DirectionalLight(0xffd591, 0.4)
  backLight.position.set(0, -3, -5)
  scene.add(backLight)

  terrainGroup = new THREE.Group()
  scene.add(terrainGroup)

  buildTerrain()
  buildStoneTeeth()
  buildSinkholes()
  buildPeaks()
  buildBasin()
  buildCave()
  buildPermeation()
  buildWater()
  buildLabels()

  // V4：先强制确保舞台有真实像素尺寸，再设置相机与渲染器。
  // 解决 stage-content/布局高度为 0 时 Canvas 被压成 0 高度、模型完全不可见的问题。
  ensureSceneHostSize()
  resizeThreeSceneNow(true)
  frameCameraToModel()
  resizeThreeSceneNow(true)

  threeResizeObserver = new ResizeObserver(() => {
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  sceneClock.start()
  animateThreeScene()
}

function animateThreeScene() {
  sceneAnimationFrameId = requestAnimationFrame(animateThreeScene)

  const delta = Math.min(sceneClock.getDelta(), 0.05)

  if (terrainGroup && rotationSpeed.value > 0) {
    terrainGroup.rotation.y += delta * rotationSpeed.value * 0.18
  }

  if (isPlaying.value) {
    evolutionProgress.value =
      (evolutionProgress.value + delta * playbackSpeed.value * 4) % 100
  }

  // 时间轴与当前地貌阶段保持同步
  const stageIndex = Math.min(
    timelineStages.length - 1,
    Math.round((evolutionProgress.value / 100) * (timelineStages.length - 1)),
  )
  const stageId = timelineStages[stageIndex]?.id
  if (stageId && currentStage.value !== stageId) {
    currentStage.value = stageId
  }

  // 根据底部模式切换地下/水文/地表图层
  if (caveGroup) {
    caveGroup.visible = activeBottomTab.value !== 'surface'
  }
  // 地下河始终可见（即使在地表模式也能看到渗透下去的水流）
  if (undergroundRiverMesh) {
    undergroundRiverMesh.visible = true
  }
  // 渗透水流始终可见
  if (permeationGroup) {
    permeationGroup.visible = true
  }
  if (waterGroup || basinGroup) {
    const showWater = activeBottomTab.value !== 'underground'
    if (waterGroup) waterGroup.visible = showWater
    if (basinGroup) basinGroup.visible = showWater
  }
  if (peakGroup || stoneToothGroup || sinkholeGroup) {
    const showSurface = activeBottomTab.value !== 'underground'
    const stage = activeStage.value
    if (peakGroup) peakGroup.visible = showSurface && stage.peakCount > 0
    if (stoneToothGroup) stoneToothGroup.visible = showSurface && stage.showStoneTeeth
    if (sinkholeGroup) sinkholeGroup.visible = showSurface && stage.showTiankeng

    // 峰丛随演化阶段逐渐生长，增强“动态演化”的教学表现
    const peakRatio = Math.max(0.18, Math.min(1, stage.peakCount / 18))
    peakRecords.forEach((record, index) => {
      const visibleRatio = Math.min(1, (index + 1) / Math.max(1, stage.peakCount))
      const target = Math.min(1, peakRatio / Math.max(visibleRatio, 0.35))
      record.mesh.scale.y += (target - record.mesh.scale.y) * Math.min(1, delta * 4)
    })
  }

  // 渗透水滴动画
  const elapsed = sceneClock.elapsedTime
  permeationDroplets.forEach((d) => {
    const cycle = (elapsed * d.speed + d.offset) % 1
    d.mesh.position.y = d.startY - (d.startY - d.endY) * cycle
    const mat = d.mesh.material as THREE.MeshStandardMaterial
    // 水滴在接近底部时淡出，在顶部淡入
    const fade = cycle < 0.1 ? cycle / 0.1 : cycle > 0.85 ? (1 - cycle) / 0.15 : 1
    mat.opacity = 0.9 * fade
  })

  // 标签始终面向相机
  if (labelGroup && camera) {
    const camPos = camera.position
    labelGroup.traverse((obj) => {
      const data = obj.userData
      if (data?.isLabel) {
        obj.lookAt(camPos)
      }
    })
  }

  orbitControls?.update()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function frameCameraToModel() {
  if (!terrainGroup || !camera || !orbitControls) return

  terrainGroup.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(terrainGroup)
  if (box.isEmpty()) return

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)

  // V4：使用当前 Canvas 的真实宽高计算相机距离，并给足边缘留白。
  const aspect = Math.max(0.6, camera.aspect || 1.6)
  const vFov = THREE.MathUtils.degToRad(camera.fov)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  const verticalDistance = (size.y * 0.72) / Math.tan(vFov / 2)
  const horizontalDistance = (size.x * 0.72) / Math.tan(hFov / 2)
  const depthDistance = size.z * 1.35
  const distance = Math.max(13, Math.min(34, Math.max(verticalDistance, horizontalDistance, depthDistance)))

  // 教材剖面图：右前方、略高于模型的观察角度。
  const direction = new THREE.Vector3(0.88, 0.48, 1.18).normalize()
  camera.position.copy(center).add(direction.multiplyScalar(distance))
  camera.near = 0.05
  camera.far = Math.max(180, distance * 10)
  camera.lookAt(center)
  camera.updateProjectionMatrix()

  orbitControls.target.copy(center)
  orbitControls.minDistance = Math.max(6, distance * 0.38)
  orbitControls.maxDistance = Math.max(38, distance * 2.4)
  orbitControls.update()
}

function ensureSceneHostSize() {
  const container = threeContainerRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const hostWidth = Math.round(rect.width || container.clientWidth || 0)
  const hostHeight = Math.round(rect.height || container.clientHeight || 0)

  // 如果上层布局尚未给绝对定位舞台计算高度，使用视口高度作为安全兜底。
  // 同时把高度写回 host，保证 Canvas 真正拥有可见区域。
  const fallbackWidth = Math.max(320, Math.round(window.innerWidth * 0.72))
  const fallbackHeight = Math.max(520, window.innerHeight - 58)
  const width = Math.max(320, hostWidth || fallbackWidth)
  const height = Math.max(520, hostHeight || fallbackHeight)

  if (hostWidth < 10 || hostHeight < 10) {
    container.style.width = `${width}px`
    container.style.height = `${height}px`
  }
}

function resizeThreeSceneNow(force = false) {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return

  ensureSceneHostSize()

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || container.clientWidth))
  const height = Math.max(1, Math.round(rect.height || container.clientHeight))

  if (!force && width === lastSceneWidth && height === lastSceneHeight) return

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderer.domElement.style.width = `${width}px`
  renderer.domElement.style.height = `${height}px`

  if (scene) {
    renderer.render(scene, camera)
  }
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

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }
  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  orbitControls?.dispose()
  orbitControls = null

  sceneMaterials.forEach((material) => material.dispose())
  sceneGeometries.forEach((geometry) => geometry.dispose())
  sceneTextures.forEach((texture) => texture.dispose())

  sceneMaterials.length = 0
  sceneGeometries.length = 0
  sceneTextures.length = 0
  peakRecords.length = 0

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }
  renderer?.dispose()

  scene = null
  camera = null
  renderer = null
  mainLight = null
  terrainGroup = null
  terrainMesh = null
  strataGroup = null
  undergroundRiverMesh = null
  stalactiteGroup = null
  sinkholeGroup = null
  peakGroup = null
  stoneToothGroup = null
  basinGroup = null
  waterGroup = null
  caveGroup = null
  permeationGroup = null
  permeationDroplets.length = 0
  labelGroup = null
  leaderLineMesh = null
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()

  currentStage.value = 'early-mature'
  evolutionProgress.value = 45
  rotationSpeed.value = 0.10
  playbackSpeed.value = 1
  isPlaying.value = false
  activeBottomTab.value = 'surface'

  if (camera && orbitControls) {
    ensureSceneHostSize()
    resizeThreeSceneNow(true)
    frameCameraToModel()
    resizeThreeSceneNow(true)
  }

  scheduleSceneResize(90)
}

function onStageNodeClick(idx: number) {
  const total = timelineStages.length - 1
  evolutionProgress.value = (idx / total) * 100
  const stage = timelineStages[idx]
  if (stage) currentStage.value = stage.id
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    pageRef.value?.requestFullscreen?.().catch(() => {})
  } else {
    document.exitFullscreen?.().catch(() => {})
  }
}

/* ============================================================
   生命周期挂载
   ============================================================ */

onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.karst-landform-container .page-subtitle {
  margin-left: 12px;
  font-size: 0.62em;
  font-weight: 400;
  color: var(--text-muted);
}

/* ============================================================
   左上角overlay：仅卡片上移（让位给底部tabs）
   ============================================================ */
.stage-overlay {
  position: absolute;
  top: 22px;
  left: 22px;
  z-index: 5;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: flex-start;
}

.overlay-card {
  pointer-events: auto;
  width: min(260px, 78%);
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--panel-background);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(12px);
}

.overlay-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.overlay-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--theme-on-primary);
  background: linear-gradient(
    135deg,
    var(--theme-primary),
    var(--theme-secondary)
  );
}

.overlay-title strong {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 700;
}

.overlay-card p {
  margin: 4px 0 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.overlay-keypoints {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.overlay-keypoints span {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--theme-primary-light);
  background: rgba(46, 196, 182, 0.12);
  border: 1px solid rgba(46, 196, 182, 0.35);
}

/* 圆形实景配图气泡 */
.photo-bubble {
  position: relative;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 10px;
  border-radius: 14px;
  background: var(--panel-background);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(12px);
}

.photo-bubble-ring {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--theme-primary);
  box-shadow: 0 0 0 4px rgba(46, 196, 182, 0.18),
    0 4px 14px rgba(0, 0, 0, 0.35);
}

.photo-bubble-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-bubble-caption {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.photo-bubble-caption strong {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 700;
}

.photo-bubble-caption span {
  font-size: 10px;
  color: var(--text-muted);
}

.photo-bubble-tail {
  position: absolute;
  bottom: -8px;
  left: 24px;
  width: 14px;
  height: 14px;
  background: var(--panel-background);
  border-right: 1px solid var(--panel-border);
  border-bottom: 1px solid var(--panel-border);
  transform: rotate(45deg);
}

/* ============================================================
   时间轴（5 阶段）
   ============================================================ */
.timeline-dock {
  position: absolute;
  bottom: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-radius: 16px;
  background: var(--panel-background);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(12px);
  width: min(680px, 80%);
}

.timeline-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--inactive-border);
  background: rgba(46, 196, 182, 0.08);
  color: var(--theme-primary-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.timeline-icon-btn:hover,
.timeline-icon-btn.active {
  background: linear-gradient(
    135deg,
    var(--theme-primary),
    var(--theme-secondary)
  );
  color: var(--theme-on-primary);
  border-color: transparent;
}

.timeline-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.timeline-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.timeline-copy strong {
  color: var(--theme-primary-light);
  font-weight: 700;
}

.timeline-stages {
  position: relative;
  height: 28px;
  margin-top: 4px;
}

.timeline-stages::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(46, 196, 182, 0.18);
  border-radius: 1px;
}

.timeline-progress-fill {
  position: absolute;
  top: 12px;
  left: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    var(--theme-primary),
    var(--theme-secondary)
  );
  border-radius: 1px;
  transition: width 0.15s ease;
  pointer-events: none;
}

.timeline-stage-node {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 11px;
  transition: color 0.2s ease;
}

.timeline-stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--panel-background);
  border: 2px solid var(--inactive-border);
  transition: all 0.2s ease;
}

.timeline-stage-node.active .timeline-stage-dot,
.timeline-stage-node.passed .timeline-stage-dot {
  border-color: var(--theme-primary);
  background: var(--theme-primary);
  box-shadow: 0 0 0 4px rgba(46, 196, 182, 0.2);
}

.timeline-stage-node.active {
  color: var(--theme-primary-light);
  font-weight: 700;
}

.timeline-stage-label {
  white-space: nowrap;
}

.speed-options {
  display: flex;
  gap: 4px;
}

.speed-btn {
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 6px;
}

.speed-btn.active {
  background: linear-gradient(
    135deg,
    var(--theme-primary),
    var(--theme-secondary)
  );
  color: var(--theme-on-primary);
  border-color: transparent;
}

/* ============================================================
   底部 tab 切换
   ============================================================ */
.bottom-tabs-dock {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 14px;
  background: var(--panel-background);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(12px);
}

.bottom-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 0;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.bottom-tab-btn:hover {
  color: var(--text-primary);
  background: rgba(46, 196, 182, 0.08);
}

.bottom-tab-btn.active {
  color: var(--theme-on-primary);
  background: linear-gradient(
    135deg,
    var(--theme-primary),
    var(--theme-secondary)
  );
}

.bottom-tab-btn .el-icon {
  font-size: 14px;
}

/* ============================================================
   右下角 复位 / 全屏
   ============================================================ */
.bottom-right-actions {
  position: absolute;
  bottom: 22px;
  right: 22px;
  z-index: 5;
  display: flex;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 12px;
  background: var(--panel-background);
  border: 1px solid var(--panel-border);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(12px);
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 14px;
  background: transparent;
  border: 0;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-action-btn:hover {
  color: var(--theme-primary-light);
  background: rgba(46, 196, 182, 0.12);
}

/* ============================================================
   右侧面板样式
   ============================================================ */
.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(46, 196, 182, 0.08);
  border: 1px solid rgba(46, 196, 182, 0.22);
}

.feature-list li strong {
  font-size: 13px;
  color: var(--theme-primary-light);
}

.feature-list li span {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.example-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.example-header h3 {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
}

.example-header p {
  font-size: 12px;
  color: var(--text-muted);
  margin: 2px 0 0;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.example-figure {
  margin: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(15, 35, 54, 0.6);
  border: 1px solid var(--inactive-border);
}

.example-figure img {
  display: block;
  width: 100%;
  height: 130px;
  object-fit: cover;
}

.example-figure figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
}

.example-figure figcaption strong {
  font-size: 12px;
  color: var(--text-primary);
}

.example-figure figcaption span {
  font-size: 11px;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .overlay-card {
    width: min(86%, 260px);
  }
  .timeline-dock {
    width: min(94%, 680px);
    padding: 10px 14px;
  }
}

/* ============================================================
   V2 视觉还原：以教材剖面图为核心的 3D 地块构图
   ============================================================ */
.karst-landform-container {
  background:
    radial-gradient(circle at 48% 42%, rgba(21, 69, 88, 0.18), transparent 36%),
    #061b2e;
}

.karst-landform-container .top-toolbar {
  background: linear-gradient(180deg, rgba(3, 29, 51, 0.98), rgba(3, 25, 44, 0.92));
  border-bottom: 1px solid rgba(43, 184, 216, 0.16);
}

.karst-landform-container .page-title {
  letter-spacing: 0.03em;
  text-shadow: 0 0 18px rgba(31, 210, 221, 0.16);
}

.karst-landform-container .page-subtitle {
  color: #32a9d1;
}

.karst-landform-container .stage-content {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 52% 52%, rgba(18, 79, 91, 0.08), transparent 42%),
    transparent;
}

.karst-landform-container .scene-host {
  position: absolute;
  inset: 0;
}

.karst-landform-container .three-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.karst-landform-container .stage-overlay {
  top: 16px;
  left: 16px;
}

.karst-landform-container .overlay-card {
  width: 225px;
  padding: 12px 14px;
  border-radius: 13px;
  background: rgba(4, 28, 48, 0.86);
  border-color: rgba(39, 159, 192, 0.28);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
}

.karst-landform-container .overlay-title {
  gap: 8px;
}

.karst-landform-container .overlay-tag {
  height: 21px;
  font-size: 10px;
  padding: 0 8px;
}

.karst-landform-container .overlay-title strong {
  font-size: 16px;
}

.karst-landform-container .overlay-card p {
  font-size: 11px;
  line-height: 1.55;
}

.karst-landform-container .overlay-keypoints span {
  color: #55d7ea;
  background: rgba(35, 193, 211, 0.08);
  border-color: rgba(35, 193, 211, 0.3);
}

.karst-landform-container .timeline-dock {
  bottom: 74px;
  width: min(700px, 66%);
  background: rgba(5, 28, 48, 0.9);
  border-color: rgba(40, 168, 207, 0.26);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
}

.karst-landform-container .bottom-tabs-dock {
  bottom: 16px;
  background: rgba(5, 28, 48, 0.92);
  border-color: rgba(40, 168, 207, 0.26);
}

.karst-landform-container .bottom-tab-btn {
  min-width: 104px;
  justify-content: center;
}

.karst-landform-container .bottom-right-actions {
  bottom: 16px;
  right: 18px;
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}

.karst-landform-container .icon-action-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(5, 39, 64, 0.9);
  border: 1px solid rgba(45, 178, 215, 0.24);
}

.karst-landform-container .right-panel {
  background: linear-gradient(180deg, rgba(4, 29, 49, 0.96), rgba(3, 23, 41, 0.96));
  border-color: rgba(39, 151, 189, 0.24);
  box-shadow: -12px 0 32px rgba(0, 0, 0, 0.16);
}

.karst-landform-container .data-card {
  background: rgba(4, 34, 56, 0.72);
  border-color: rgba(47, 145, 177, 0.22);
}

.karst-landform-container .feature-list li {
  background: rgba(11, 66, 88, 0.34);
  border-color: rgba(36, 174, 204, 0.2);
}

.karst-landform-container .example-figure img {
  height: 112px;
}

@media (max-width: 1200px) {
  .karst-landform-container .timeline-dock {
    width: min(680px, 72%);
  }

  .karst-landform-container .bottom-tab-btn {
    min-width: 86px;
    padding-inline: 10px;
  }
}



/* ============================================================
   V3：Three.js 舞台高度/定位修复
   ============================================================ */
.karst-landform-container,
.karst-landform-container .workspace,
.karst-landform-container .center-stage {
  min-height: 0;
}

.karst-landform-container .center-stage {
  position: relative;
  overflow: hidden;
}

.karst-landform-container .stage-content {
  position: absolute;
  inset: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.karst-landform-container .scene-host.three-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 1px;
  min-height: 1px;
  display: block;
  overflow: hidden;
  background: #0c2034;
  z-index: 1;
}

.karst-landform-container .scene-canvas.three-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  z-index: 1;
}

.karst-landform-container .stage-overlay,
.karst-landform-container .timeline-dock,
.karst-landform-container .bottom-tabs-dock,
.karst-landform-container .bottom-right-actions {
  z-index: 8;
}

/* V4：强制为 Three.js 舞台提供稳定高度，避免绝对定位子元素导致父级高度塌陷。 */
.karst-landform-container .center-stage {
  position: relative;
  min-height: 520px;
  height: 100%;
  overflow: hidden;
}

.karst-landform-container .stage-content {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 520px;
}

.karst-landform-container .scene-host.three-host {
  width: 100%;
  height: 100%;
  min-height: 520px;
}

.karst-landform-container .scene-host.three-host canvas {
  display: block !important;
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
}

</style>
