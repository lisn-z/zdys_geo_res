<template>
  <div ref="pageRef" class="soil-erosion-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>
      <h1 class="page-title">水土流失</h1>
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
              <h2>实验变量调控</h2>
              <p>调整参数观察水土流失变化</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">🌳 植被覆盖</h3>
            <div class="section-title-row">
              <span class="mini-control-label">覆盖度</span>
              <strong class="control-value">{{ vegState }}%</strong>
            </div>
            <el-slider v-model="vegState" :min="0" :max="100" :step="1" :show-tooltip="false" @input="onParamChange" />

            <h3 class="section-title">🌧️ 降雨强度</h3>
            <div class="section-title-row">
              <span class="mini-control-label">强度</span>
              <strong class="control-value">{{ rainLabel }}</strong>
            </div>
            <el-slider v-model="rainState" :min="0" :max="100" :step="1" :show-tooltip="false" @input="onParamChange" />

            <h3 class="section-title">⛰️ 地形坡度</h3>
            <div class="section-title-row">
              <span class="mini-control-label">坡度</span>
              <strong class="control-value">{{ slopeState }}°</strong>
            </div>
            <el-slider v-model="slopeState" :min="5" :max="45" :step="1" :show-tooltip="false" @input="onParamChange" />

            <div class="color-control-row first-control-row">
              <div class="control-copy"><strong>🌱 土壤质地</strong><span>不同质地对侵蚀的影响</span></div>
            </div>
            <div class="soil-type-grid">
              <button v-for="s in soilOptions" :key="s.value" type="button" class="theme-btn option-btn"
                :class="{ active: soilTypeState === s.value }" @click="selectSoil(s.value)">
                {{ s.icon }} {{ s.label }}
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">⚡ 快速预设场景</h3>
            <div class="preset-grid">
              <button type="button" class="theme-btn option-btn" :class="{ active: activePreset === 'forest' }"
                @click="applyPreset('forest')">
                🌲 生态林区 · 高覆盖 / 缓坡 / 壤土
              </button>
              <button type="button" class="theme-btn option-btn" :class="{ active: activePreset === 'plateau' }"
                @click="applyPreset('plateau')">
                🏜️ 黄土高原 · 低覆盖 / 陡坡 / 黏土
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">🎬 模拟控制</h3>
            <div class="sim-control-row">
              <button type="button" class="theme-btn option-btn" :class="{ 'sim-active': isRaining }"
                @click="toggleSimulation">{{ simulateButtonText }}</button>
              <button type="button" class="theme-btn option-btn" @click="resetAll">重置场景</button>
            </div>
            <div v-if="isRaining || progress > 0" class="timer-display">
              <span class="timer-icon">⏱️</span><span class="timer-text">模拟剩余 {{ remainingSeconds }}s</span>
            </div>
            <div class="switch-row sound-switch-row">
              <div class="control-copy"><strong>🔊 雨声音效</strong><span>随降雨强度动态变化</span></div>
              <el-switch v-model="soundEnabled" @change="onSoundToggle" />
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
          <div ref="canvasContainerRef" class="scene-host three-host">
            <canvas ref="canvasRef" class="scene-canvas"></canvas>
          </div>
          <div v-if="isRaining" class="sim-status-badge sim-running"><span class="sim-dot"></span>模拟运行中</div>
          <div v-else-if="progress > 0 && progress < 100" class="sim-status-badge sim-paused"><span
              class="sim-dot"></span>模拟已暂停</div>
          <div v-else class="sim-status-badge sim-idle"><span class="sim-dot"></span>待机中</div>
          <div v-if="progress === 0" class="scene-hint">点击"开始降雨模拟"，观察径流、侵蚀与含沙量变化</div>
        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>
          <div class="timeline-main">
            <div class="timeline-copy"><span>模拟进度</span><strong>{{ Math.round(progress) }}%</strong></div>
            <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" @change="onProgressSeek" />
          </div>
          <button type="button" class="theme-btn speed-btn" @click="cycleSpeed" :title="'倍速: ' + playbackSpeed + '×'">{{
            playbackSpeed }}×</button>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>模拟结果</h2>
              <p>实时水土流失监测数据</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>
          <div class="data-grid">
            <article class="geo-card data-card" :class="dataCardClass(0)"><span>💧 地表径流量</span><strong>{{
              simStats.runoff }}</strong><small>L/s · 水流强度</small></article>
            <article class="geo-card data-card" :class="dataCardClass(1)"><span>⛰️ 流失土壤量</span><strong>{{
              simStats.erosion.toFixed(1) }}</strong><small>kg · 土壤损失</small></article>
            <article class="geo-card data-card" :class="dataCardClass(2)"><span>🟠 河流含沙量</span><strong>{{
              simStats.sediment }}</strong><small>% · 浑浊度</small></article>
          </div>
          <div class="erosion-level-card geo-card">
            <div class="level-header"><span>流失等级评估</span><span class="level-badge" :class="levelClass">{{ levelText
                }}</span></div>
            <div class="level-track">
              <div class="level-fill" :style="{ width: levelPercent + '%' }"></div>
            </div>
            <div class="level-labels"><span>轻度</span><span>中度</span><span>重度</span></div>
          </div>
          <el-collapse v-model="activePanels" class="analysis-collapse">
            <el-collapse-item title="🌍 什么是水土流失" name="concept">
              <div class="collapse-content principle-content">
                <p><strong>定义：</strong>水土流失是指土壤在<strong>水力、风力、重力</strong>等外力作用下，被破坏、剥蚀、搬运和沉积的过程。</p>
                <p>
                  <strong>主要分布区：</strong>我国水土流失主要发生在<strong>山区、丘陵区和风沙区</strong>，尤其是<strong>黄土高原</strong>。我国是世界上水土流失最严重的国家之一。
                </p>
                <p><strong>发生过程：</strong>降雨落在地面→土壤被雨滴打散→地表水汇成径流→冲刷土壤→携带泥沙流入河流→在低洼处沉积。</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="⛰️ 以黄土高原为例" name="loess">
              <div class="collapse-content principle-content">
                <p><strong>自然原因：</strong></p>
                <p>① <strong>黄土特性：</strong>由风积形成，<strong>土质疏松</strong>，遇水易崩解。</p>
                <p>② <strong>气候：</strong>温带季风气候，<strong>夏季降水集中</strong>且多暴雨。</p>
                <p>③ <strong>地形：</strong>坡度大，<strong>沟壑纵横</strong>，利于水流冲刷。</p>
                <p>④ <strong>植被：</strong>天然植被<strong>覆盖率低</strong>，保护作用弱。</p>
                <p>
                  <strong>人为原因：</strong><strong>过度开垦</strong>陡坡、<strong>过度放牧</strong>、<strong>过度砍伐</strong>、<strong>露天开矿</strong>等破坏地表植被。
                </p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="⚠️ 水土流失的危害" name="harm">
              <div class="collapse-content principle-content">
                <p><strong>① 土地资源：</strong>土壤肥力下降，土地变得<strong>贫瘠</strong>，农业减产。</p>
                <p><strong>② 河流含沙量：</strong>大量泥沙涌入河流，<strong>淤塞河道、水库、渠道</strong>。</p>
                <p><strong>③ 生态环境：</strong>加剧<strong>干旱、洪涝、滑坡</strong>等自然灾害。</p>
                <p><strong>④ 经济发展：</strong>影响农业生产，制约区域可持续发展。</p>
              </div>
            </el-collapse-item>
            <el-collapse-item title="🌱 治理措施" name="treatment">
              <div class="collapse-content principle-content">
                <p><strong>① 工程措施（修）：</strong>修建<strong>梯田</strong>减缓坡度；修建<strong>淤地坝</strong>拦截泥沙。</p>
                <p><strong>② 生物措施（种）：</strong><strong>植树种草</strong>恢复植被；陡坡耕地<strong>退耕还林还草</strong>。</p>
                <p><strong>③ 农业技术措施（养）：</strong><strong>轮作、间作</strong>合理利用土地；<strong>秸秆还田</strong>增加有机质。</p>
                <p><strong>④ 综合治理：</strong><strong>小流域综合治理</strong>，把工程、生物、农业措施结合起来。</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>

        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">
          ›
        </button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">
        ›
      </button>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">
        ‹
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
/*
 * 公共模板样式已内置平板宽度、触控拖拽与防误触规则。
 */
import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

// ===== State =====
const hasLeftPanel = true
const hasRightPanel = true

/*
 * 左右面板统一交给公共 Hook。
 * 业务组件只负责水土流失模拟和主画布最终尺寸校准。
 */
const {
  rootRef: pageRef,
  layoutMode,

  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,

  draggingSide,
  viewportResizing,

  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,

  leftResizeAttrs,
  rightResizeAttrs,

  leftCollapseAttrs,
  rightCollapseAttrs,

  leftEntryAttrs,
  rightEntryAttrs,

  toggleAll: toggleAllPanels,
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
     * 面板拖拽或浏览器连续缩放期间，
     * 不重建 2D Canvas 像素缓冲区。
     */
    if (state.resizing) {
      return
    }

    scheduleCanvasResize(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleCanvasResize(0)
    }
  },
})

const vegState = ref(55)
const rainState = ref(35)
const slopeState = ref(18)
const soilTypeState = ref('loam')
const isRaining = ref(false)
const isPlaying = ref(false)
const progress = ref(0)
const playbackSpeed = ref(1)
const speedSteps = [0.5, 1, 2, 5]
let speedIdx = 1
const soundEnabled = ref(true)
const activePreset = ref('')

const soilOptions = [
  { value: 'sand', label: '沙土', icon: '🟡' },
  { value: 'loam', label: '壤土', icon: '🟤' },
  { value: 'clay', label: '黏土', icon: '🟠' },
]

const soilParams: Record<string, { color: number[]; erodibility: number; runoffFactor: number }> = {
  sand: { color: [210, 180, 120], erodibility: 2.0, runoffFactor: 0.55 },
  loam: { color: [110, 95, 75], erodibility: 0.68, runoffFactor: 0.85 },
  clay: { color: [130, 70, 45], erodibility: 1.3, runoffFactor: 1.2 },
}

const simStats = ref({ runoff: 0, erosion: 0, sediment: 0 })
const accumulatedErosion = ref(0)
const accumulatedRunoff = ref(0)
const remainingSeconds = ref(10)
const dataCardClasses = ['cyan-card', 'blue-card', 'purple-card']
function dataCardClass(i: number) { return dataCardClasses[i] ?? '' }

const MAX_DEPOSIT = 45
const LIGHT_MAX = 8
const MODERATE_MAX = 22
const SIM_DURATION = 10
let elapsedTime = 0

const activePanels = ref(['concept', 'loess', 'harm', 'treatment'])

const rainLabel = computed(() => {
  const r = rainState.value
  if (r < 20) return '微雨'
  if (r < 50) return '中雨'
  if (r < 80) return '大雨'
  return '暴雨'
})

const levelText = computed(() => {
  const e = simStats.value.erosion
  if (e < LIGHT_MAX) return '轻度流失'
  if (e < MODERATE_MAX) return '中度流失'
  return '重度流失'
})

const levelClass = computed(() => {
  const e = simStats.value.erosion
  if (e < LIGHT_MAX) return 'level-good'
  if (e < MODERATE_MAX) return 'level-mid'
  return 'level-bad'
})

const levelPercent = computed(() => {
  const e = simStats.value.erosion
  if (e < LIGHT_MAX) return (e / LIGHT_MAX) * 33
  if (e < MODERATE_MAX) return 33 + ((e - LIGHT_MAX) / (MODERATE_MAX - LIGHT_MAX)) * 34
  const heavy = Math.min(e, MAX_DEPOSIT)
  return 67 + ((heavy - MODERATE_MAX) / (MAX_DEPOSIT - MODERATE_MAX)) * 33
})

const simulateButtonText = computed(() => {
  if (!isRaining.value && progress.value === 0) return '▶ 开始降雨模拟'
  if (isPlaying.value) return '■ 暂停模拟'
  if (progress.value >= 100) return '↻ 重新模拟'
  return '▶ 继续模拟'
})

// ===== Layout =====
/*
 * 面板宽度、断点、拖拽、折叠和事件清理
 * 已全部由 useGeoPanelLayout 管理。
 */

function cl(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, value)
  )
}


// ===== Web Audio =====
let audioCtx: AudioContext | null = null
let gainNode: GainNode | null = null
let noiseSrc: AudioBufferSourceNode | null = null
let bpFilter: BiquadFilterNode | null = null

function initAudio() {
  if (audioCtx) return
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!AC) return
  audioCtx = new AC() as AudioContext
  const bs = audioCtx.sampleRate * 2
  const nb = audioCtx.createBuffer(1, bs, audioCtx.sampleRate)
  const d = nb.getChannelData(0)
  for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * 0.7
  noiseSrc = audioCtx.createBufferSource()
  noiseSrc.buffer = nb
  noiseSrc.loop = true
  bpFilter = audioCtx.createBiquadFilter()
  bpFilter.type = 'bandpass'
  bpFilter.frequency.value = 1600
  bpFilter.Q.value = 1.2
  const hp = audioCtx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 450
  gainNode = audioCtx.createGain()
  gainNode.gain.value = 0
  noiseSrc.connect(hp)
  hp.connect(bpFilter)
  bpFilter.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  noiseSrc.start()
}

function updateRainAudio() {
  if (!audioCtx || !gainNode || !bpFilter) return
  const n = Math.min(1, Math.max(0, rainState.value / 100))
  const vol = isRaining.value && soundEnabled.value ? n * 0.45 : 0
  gainNode.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.08)
  bpFilter.frequency.setTargetAtTime(900 + n * 1900, audioCtx.currentTime, 0.08)
  bpFilter.Q.setTargetAtTime(1 + n * 0.4, audioCtx.currentTime, 0.08)
}

async function onSoundToggle(en: boolean | string | number) {
  if (en) { if (!audioCtx) initAudio(); if (audioCtx && audioCtx.state === 'suspended') { try { await audioCtx.resume() } catch { } } }
  updateRainAudio()
}

watch(rainState, () => { if (isRaining.value) updateRainAudio() })
watch(soundEnabled, () => updateRainAudio())

// ===== 2D Canvas =====
const canvasContainerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let canvasWidth = 900
let canvasHeight = 500
let ctx: CanvasRenderingContext2D | null = null
let animFrameId = 0
let frameCount = 0

let viewScale = 1
let viewX = 0
let viewY = 0

let terrainPts: { x: number; y: number }[] = []
let rainParticles: any[] = []
let treeData: { x: number; y: number; size: number; swayOffset: number; type: string }[] = []

function rand(mn: number, mx: number) { return mn + Math.random() * (mx - mn) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function mixCol(a: number[], b: number[], t: number) {
  return [Math.round(lerp(a[0] ?? 0, b[0] ?? 0, t)), Math.round(lerp(a[1] ?? 0, b[1] ?? 0, t)), Math.round(lerp(a[2] ?? 0, b[2] ?? 0, t))]
}
function col(arr: number[], alpha = 1) { return 'rgba(' + (arr[0] ?? 0) + ',' + (arr[1] ?? 0) + ',' + (arr[2] ?? 0) + ',' + alpha + ')' }

function terrainYAt(x: number) {
  const idx = cl(Math.floor(x / 5), 0, terrainPts.length - 1)
  return terrainPts[idx]?.y ?? canvasHeight - 76
}

function generateTerrain() {
  terrainPts = []
  const rad = slopeState.value * Math.PI / 180
  const endY = canvasHeight - 76
  let startY = endY - Math.tan(rad) * canvasWidth
  startY = cl(startY, 50, canvasHeight - 160)
  for (let x = 0; x <= canvasWidth; x += 5) {
    const y = lerp(startY, endY, x / canvasWidth) + Math.sin(x * 0.035) * 5 + Math.sin(x * 0.011 + 1.5) * 4
    terrainPts.push({ x, y })
  }
}

// 确定性随机（用种子保证同序号值不变）
function srand(seed: number) { const x = Math.sin(seed) * 10000; return x - Math.floor(x) }

function generateVegetation() {
  treeData = []
  const count = Math.floor(lerp(0, 78, vegState.value / 100))
  for (let i = 0; i < count; i++) {
    const x = 28 + srand(i * 137) * (canvasWidth - 56)
    const y = terrainYAt(x)
    treeData.push({ x, y: y - 2, size: 14 + srand(i * 257) * 18, swayOffset: srand(i * 389) * 1000, type: srand(i * 521) > 0.28 ? 'tree' : 'bush' })
  }
}

function resetSceneObjects() {
  terrainPts = []; treeData = []; rainParticles = []
  accumulatedErosion.value = 0; accumulatedRunoff.value = 0
  simStats.value = { runoff: 0, erosion: 0, sediment: 0 }
  generateTerrain(); generateVegetation()
}

function drawBackground() {
  if (!ctx) return
  const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight / 2)
  grad.addColorStop(0, '#c8e6fa')
  grad.addColorStop(1, '#e6f5eb')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
}

function drawTerrain() {
  if (!ctx || !terrainPts.length) return
  const soil = soilParams[soilTypeState.value]
  if (!soil) return
  const base = soil.color
  ctx.fillStyle = col([Math.round((base[0] ?? 0) * 0.58), Math.round((base[1] ?? 0) * 0.58), Math.round((base[2] ?? 0) * 0.58)])
  ctx.beginPath()
  ctx.moveTo(0, canvasHeight)
  for (const pt of terrainPts) ctx.lineTo(pt.x, pt.y + 8)
  ctx.lineTo(canvasWidth, canvasHeight)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = col(base)
  ctx.beginPath()
  ctx.moveTo(0, canvasHeight)
  for (const pt of terrainPts) ctx.lineTo(pt.x, pt.y)
  ctx.lineTo(canvasWidth, canvasHeight)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,.12)'
  for (let i = 0; i < 180; i++) {
    const x = (i * 53 + frameCount * 0.3) % canvasWidth
    const y = rand(terrainYAt(x) + 8, canvasHeight - 6)
    ctx.fillRect(x, y, 1, 1)
  }
}

function drawVegetation() {
  if (!ctx) return
  for (const t of treeData) {
    ctx.save()
    ctx.translate(t.x, t.y)
    const sway = Math.sin(frameCount * 0.02 + t.swayOffset) * 1.5
    if (t.type === 'tree') {
      ctx.fillStyle = '#46321e'
      ctx.fillRect(-2, -5, 4, 9)
      ctx.fillStyle = '#288246'
      ctx.beginPath()
      ctx.ellipse(sway, -t.size / 1.8, t.size * 0.5, t.size * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(30,100,50,.58)'
      ctx.beginPath()
      ctx.ellipse(sway + 2, -t.size / 1.8, t.size * 0.3, t.size * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = '#32783c'
      ctx.beginPath()
      ctx.ellipse(sway, 0, t.size * 0.5, t.size * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

function drawRiver() {
  if (!ctx) return
  const sedRatio = simStats.value.sediment / 100
  const c = mixCol([60, 140, 210], [210, 100, 40], sedRatio)
  ctx.fillStyle = col(c)
  ctx.fillRect(0, canvasHeight - 72, canvasWidth, 72)
  ctx.fillStyle = 'rgba(255,255,255,.25)'
  ctx.beginPath()
  ctx.moveTo(0, canvasHeight - 72)
  for (let x = 0; x <= canvasWidth; x += 20) {
    const y = canvasHeight - 72 + Math.sin(x * 0.04 + frameCount * 0.08) * 5
    ctx.lineTo(x, y)
  }
  ctx.lineTo(canvasWidth, canvasHeight)
  ctx.lineTo(0, canvasHeight)
  ctx.closePath()
  ctx.fill()
}

function updateCanvasPhysics() {
  if (!isRaining.value) return
  const vegCover = vegState.value / 100
  const rainInt = rainState.value / 100
  const slopeRad = slopeState.value * Math.PI / 180
  const slopeFactor = Math.sin(slopeRad)
  const soil = soilParams[soilTypeState.value]
  if (!soil) return
  let runoffCoeff = rainInt * (0.4 + slopeFactor) * soil.runoffFactor * (1 - vegCover * 0.75)
  runoffCoeff = cl(runoffCoeff, 0.03, 1.1)
  accumulatedRunoff.value = cl(accumulatedRunoff.value + runoffCoeff * 0.58, 0, 100)
  simStats.value.runoff = Math.floor(accumulatedRunoff.value)
  let erosionIntensity = slopeFactor * soil.erodibility * rainInt * (1.2 - vegCover * 0.9)
  erosionIntensity = cl(erosionIntensity, 0.02, 1.9)
  if (accumulatedErosion.value < MAX_DEPOSIT) accumulatedErosion.value += erosionIntensity * 0.085
  accumulatedErosion.value = cl(accumulatedErosion.value, 0, MAX_DEPOSIT)
  const displayErosion = (accumulatedErosion.value / MAX_DEPOSIT) * 60
  simStats.value.erosion = Math.min(99, Number(displayErosion.toFixed(1)))
  simStats.value.sediment = Math.min(100, Math.floor((simStats.value.runoff / 100) * 40 + (simStats.value.erosion / 60) * 55))
  const rainDensity = Math.floor(lerp(2, 28, rainState.value / 100))
  for (let i = 0; i < rainDensity; i++) {
    rainParticles.push({ x: rand(0, canvasWidth), y: rand(-20, 10), vx: rand(-0.8, 0.8), vy: rand(5, 12), sediment: 0, onGround: false, life: 255 })
  }
  for (let i = rainParticles.length - 1; i >= 0; i--) {
    const p = rainParticles[i]
    if (!p) continue
    if (!p.onGround) {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > canvasWidth || p.y > canvasHeight + 60) { rainParticles.splice(i, 1); continue }
      if (p.y >= terrainYAt(p.x)) { p.onGround = true; p.y = terrainYAt(p.x) }
    } else {
      const speed = 2 + slopeFactor * 7
      p.x += speed
      if (p.x >= 0 && p.x < canvasWidth) { p.y = terrainYAt(p.x) } else { p.life -= 12 }
      if (Math.random() < erosionIntensity * 0.14) p.sediment += 0.6
    }
    if (p.life <= 0) rainParticles.splice(i, 1)
  }
  updateRainAudio()
}

function drawRainAndFlow() {
  if (!ctx) return
  for (const pt of rainParticles) {
    if (!pt.onGround) {
      ctx.strokeStyle = 'rgba(165,210,240,.78)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(pt.x, pt.y)
      ctx.lineTo(pt.x + pt.vx, pt.y + 7)
      ctx.stroke()
    } else {
      const muddy = mixCol([70, 140, 210], [220, 100, 30], cl(pt.sediment / 5, 0, 1))
      ctx.fillStyle = col(muddy, 0.86)
      ctx.beginPath()
      ctx.ellipse(pt.x, pt.y, 4, 2.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawErosionDeposit() {
  if (!ctx || !terrainPts.length) return
  const last = terrainPts[terrainPts.length - 1]
  if (!last) return
  const t = accumulatedErosion.value / MAX_DEPOSIT
  const ph = Math.min(56, Math.pow(t, 1.2) * 56)
  if (ph <= 1.5) return
  const t2 = cl(t, 0, 1)
  const rc = Math.round(lerp(240, 180, t2))
  const gc = Math.round(lerp(130, 50, t2))
  const bc2 = Math.round(lerp(40, 25, t2))
  const bx = last.x - 52
  const by = last.y
  ctx.fillStyle = col([rc, gc, bc2], 0.95)
  ctx.beginPath()
  ctx.moveTo(bx, by)
  for (let off = 0; off <= 104; off += 6) {
    const h = Math.sin((off / 104) * Math.PI) * ph
    ctx.lineTo(bx + off, by - h)
  }
  ctx.lineTo(bx + 104, by)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(250,150,70,.75)'
  for (let k = 0; k < 16; k++) {
    const rx = bx + rand(12, 92)
    const rh2 = rand(2, ph)
    ctx.beginPath()
    ctx.ellipse(rx, by - rh2, 2.2, 1.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}



let canvasDpr = 1

let canvasResizeObserver:
  | ResizeObserver
  | null = null

let canvasResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let canvasResizeFrame = 0
let canvasResizeSettleFrame = 0

let lastCanvasWidth = 0
let lastCanvasHeight = 0
let lastCanvasDpr = 0

function renderFrame() {
  animFrameId = requestAnimationFrame(renderFrame)
  frameCount++
  if (isPlaying.value && isRaining.value) {
    elapsedTime += 0.016 * playbackSpeed.value
    progress.value = Math.min(100, (elapsedTime / SIM_DURATION) * 100)
    remainingSeconds.value = Math.max(0, Math.ceil(SIM_DURATION - elapsedTime))
    if (elapsedTime >= SIM_DURATION) { isPlaying.value = false; isRaining.value = false; updateRainAudio() }
  }
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const cvs = canvasRef.value
  if (cvs) ctx.clearRect(0, 0, cvs.width, cvs.height)
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0)
  ctx.save()
  ctx.translate(viewX, viewY)
  ctx.scale(viewScale, viewScale)
  drawBackground()
  drawTerrain()
  drawVegetation()
  updateCanvasPhysics()
  drawRainAndFlow()
  drawRiver()
  drawErosionDeposit()
  ctx.restore()
}

function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeCanvas() {
  const container =
    canvasContainerRef.value

  const canvas =
    canvasRef.value

  if (!container || !canvas) {
    return
  }

  /*
   * 使用真实容器尺寸，不再强制 320×240。
   * 平板或窄屏主场景不会因最小画布尺寸发生溢出。
   */
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

  /*
   * canvas.width / canvas.height 每次赋值都会清空整张画布。
   * 尺寸和 DPR 都未变化时绝不重复赋值。
   */
  if (
    width === lastCanvasWidth &&
    height === lastCanvasHeight &&
    dpr === lastCanvasDpr
  ) {
    return
  }

  lastCanvasWidth = width
  lastCanvasHeight = height
  lastCanvasDpr = dpr

  canvasDpr = dpr
  canvasWidth = width
  canvasHeight = height

  canvas.width =
    Math.max(
      1,
      Math.round(
        width * canvasDpr
      )
    )

  canvas.height =
    Math.max(
      1,
      Math.round(
        height * canvasDpr
      )
    )

  canvas.style.width =
    width + 'px'

  canvas.style.height =
    height + 'px'

  ctx =
    canvas.getContext('2d')

  if (ctx) {
    ctx.setTransform(
      canvasDpr,
      0,
      0,
      canvasDpr,
      0,
      0
    )
  }

  viewX = 0
  viewY = 0

  generateTerrain()
  generateVegetation()
}

function scheduleCanvasResize(
  delay = 110
) {
  if (canvasResizeTimer) {
    clearTimeout(
      canvasResizeTimer
    )
  }

  cancelAnimationFrame(
    canvasResizeFrame
  )

  cancelAnimationFrame(
    canvasResizeSettleFrame
  )

  /*
   * 拖拽过程中先依靠 CSS 拉伸已有画布，
   * 松手后再重建真实像素缓冲区。
   */
  if (isPanelLayoutResizing()) {
    return
  }

  canvasResizeTimer =
    setTimeout(() => {
      canvasResizeTimer = null

      canvasResizeFrame =
        requestAnimationFrame(() => {
          canvasResizeFrame = 0

          canvasResizeSettleFrame =
            requestAnimationFrame(() => {
              canvasResizeSettleFrame = 0
              resizeCanvas()
            })
        })
    }, delay)
}

function initCanvas() {
  const canvas =
    canvasRef.value

  const container =
    canvasContainerRef.value

  if (!canvas || !container) {
    return
  }

  /*
   * 动画开始前先同步真实容器尺寸，
   * 避免首屏低分辨率画布被 CSS 拉伸。
   */
  resizeCanvas()
  renderFrame()

  canvasResizeObserver =
    new ResizeObserver(() => {
      scheduleCanvasResize(110)
    })

  canvasResizeObserver.observe(
    container
  )

  /*
   * 首屏 Grid 和面板布局完成后再最终校准一次。
   */
  scheduleCanvasResize(0)
}

function cycleSpeed() {
  speedIdx = (speedIdx + 1) % speedSteps.length
  playbackSpeed.value = speedSteps[speedIdx] ?? 1
}

function startSimulation() {
  elapsedTime = 0; progress.value = 0; remainingSeconds.value = 10
  accumulatedErosion.value = 0; accumulatedRunoff.value = 0
  simStats.value = { runoff: 0, erosion: 0, sediment: 0 }
  rainParticles = []; isRaining.value = true; isPlaying.value = true
  updateRainAudio()
}

function pauseSimulation() { isPlaying.value = false; isRaining.value = false; updateRainAudio() }
function stopSimulation() { isPlaying.value = false; isRaining.value = false; elapsedTime = 0; progress.value = 0; remainingSeconds.value = 10; updateRainAudio() }

function togglePlay() {
  if (!isRaining.value && progress.value === 0) { startSimulation() }
  else if (isPlaying.value) { pauseSimulation() }
  else if (progress.value >= 100) { startSimulation() }
  else { isPlaying.value = true; isRaining.value = true; updateRainAudio() }
}

function toggleSimulation() { togglePlay() }

function onProgressSeek(val: number | number[]) {
  const v = Array.isArray(val) ? val[0] : val
  if (v === undefined) return
  elapsedTime = (v / 100) * SIM_DURATION; progress.value = v
  remainingSeconds.value = Math.max(0, Math.ceil(SIM_DURATION - elapsedTime))
}

function onParamChange() { if (isRaining.value) pauseSimulation(); resetSceneObjects() }
function selectSoil(val: string) { if (isRaining.value) pauseSimulation(); soilTypeState.value = val; resetSceneObjects() }

function applyPreset(preset: string) {
  if (isRaining.value) pauseSimulation()
  activePreset.value = preset
  if (preset === 'forest') { vegState.value = 90; rainState.value = 15; slopeState.value = 6; soilTypeState.value = 'loam' }
  else { vegState.value = 10; rainState.value = 85; slopeState.value = 42; soilTypeState.value = 'clay' }
  resetSceneObjects()
}

function resetAll() {
  stopSimulation()
  vegState.value = 55; rainState.value = 35; slopeState.value = 18; soilTypeState.value = 'loam'
  activePreset.value = ''; resetSceneObjects(); updateRainAudio()
}

onMounted(async () => {
  await nextTick()

  initCanvas()

  document.addEventListener(
    'pointerdown',
    () => {
      if (
        soundEnabled.value &&
        !audioCtx
      ) {
        initAudio()
      }
    },
    {
      once: true,
    }
  )
})

onBeforeUnmount(() => {
  cancelAnimationFrame(
    animFrameId
  )

  cancelAnimationFrame(
    canvasResizeFrame
  )

  cancelAnimationFrame(
    canvasResizeSettleFrame
  )

  if (canvasResizeTimer) {
    clearTimeout(
      canvasResizeTimer
    )

    canvasResizeTimer = null
  }

  canvasResizeObserver?.disconnect()
  canvasResizeObserver = null

  if (audioCtx) {
    try {
      gainNode?.gain.setTargetAtTime(
        0,
        audioCtx.currentTime,
        0.05
      )
    } catch {
      // 音频上下文可能已经关闭。
    }

    setTimeout(() => {
      try {
        audioCtx?.close()
      } catch {
        // 忽略重复关闭。
      }
    }, 200)
  }
})
</script>

<style scoped>
/* ===== Canvas ===== */
.scene-host {
  overflow: hidden;
}

.scene-host canvas {
  display: block;
  background: #c8e6fa;
}

/* ===== Status Badge (右侧) ===== */
.sim-status-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(6px);
  z-index: 2;
}

.sim-running {
  background: rgba(239, 68, 68, 0.78);
  color: #fff;
}

.sim-paused {
  background: rgba(245, 158, 11, 0.78);
  color: #fff;
}

.sim-idle {
  background: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.85);
}

.sim-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.sim-running .sim-dot {
  background: #ff6b6b;
  box-shadow: 0 0 6px rgba(255, 107, 107, 0.6);
  animation: pulse-dot 1.2s ease-in-out infinite;
}

.sim-paused .sim-dot {
  background: #fbbf24;
}

.sim-idle .sim-dot {
  background: rgba(255, 255, 255, 0.5);
}

@keyframes pulse-dot {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

/* ===== Scene Hint ===== */
.scene-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(31, 47, 40, 0.75);
  font-size: 15px;
  font-weight: 800;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.5);
  z-index: 2;
}

/* ===== Soil Type ===== */
.soil-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

/* ===== Sim Control ===== */
.sim-control-row {
  display: flex;
  gap: 10px;
}

.sim-control-row button {
  min-height: 44px;
  font-size: 14px;
}

.sim-control-row button:first-child {
  flex: 1;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 800;
  color: var(--theme-warning, #e67e22);
}

.timer-icon {
  font-size: 16px;
}

.sound-switch-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--inactive-border, rgba(255, 255, 255, 0.08));
}

/* ===== Erosion Level ===== */
.erosion-level-card {
  padding: 14px 16px;
  margin-bottom: 12px;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 10px;
}

.level-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.level-good {
  background: #dcfce7;
  color: #15803d;
}

.level-mid {
  background: #ffedd5;
  color: #c2410c;
}

.level-bad {
  background: #fee2e2;
  color: #b91c1c;
}

.level-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #22c55e, #f97316, #ef4444);
  transition: width 0.25s ease;
}

.level-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 700;
}

/* ===== Knowledge ===== */
.principle-content p {
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.7;
}

.principle-content p:last-child {
  margin-bottom: 0;
}

.principle-content strong {
  color: var(--theme-primary, #2ec4b6);
}

/* ===== Data Grid ===== */
.data-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

@media (min-width: 1600px) {
  .data-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ===================== v2：公共面板 Hook =====================
   左右面板宽度、断点、平板触控拖拽与展开折叠，
   统一由 useGeoPanelLayout 和 geo-page-template.css 管理。
*/
</style>
