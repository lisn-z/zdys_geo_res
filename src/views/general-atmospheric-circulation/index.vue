<template>
  <div
    ref="pageRef"
    class="general-atmospheric-circulation-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">大气环流 <span class="page-subtitle">Atmospheric Circulation Lab</span></h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn primary replay-btn" @click="replayAll">▶ 从头演示</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main
      class="workspace"
      :class="{ 'has-left': hasLeftPanel, 'has-right': hasRightPanel }"
      :style="{
        '--left-panel-width': leftCollapsed ? '0px' : leftPanelWidth + 'px',
        '--right-panel-width': rightCollapsed ? '0px' : rightPanelWidth + 'px',
      }"
    >
      <!-- ===== 左侧面板：图层控制 ===== -->
      <aside id="left-panel" class="side-panel left-panel" :class="{ collapsed: leftCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>图层探索</h2>
              <p>分层查看大气环流</p>
            </div>
            <span class="panel-badge">LAYERS</span>
          </div>

          <!-- 模式选择 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🎯 实验模式</h3>
            <div class="mode-buttons">
              <button
                v-for="m in modes" :key="m.id"
                class="mode-option-btn"
                :class="{ active: simMode === m.id }"
                @click="setMode(m.id)"
              >
                <span class="mode-icon" v-html="m.icon"></span>
                <span>{{ m.label }}</span>
              </button>
            </div>
          </section>

          <!-- 三圈环流 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🌀 三圈环流</h3>
            <div class="switch-row" v-for="l in cellLayerDefs" :key="l.key">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" />
            </div>
          </section>

          <!-- 风向 -->
          <section class="geo-card control-section">
            <h3 class="section-title">💨 风向</h3>
            <div class="switch-row" v-for="l in windLayerDefs" :key="l.key">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" />
            </div>
          </section>

          <!-- 气压带 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📊 气压带</h3>
            <div class="switch-row" v-for="l in pressureLayerDefs" :key="l.key">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" />
            </div>
          </section>

          <!-- 其他 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🎨 其他</h3>
            <div class="switch-row" v-for="l in otherLayerDefs" :key="l.key">
              <div class="control-copy">
                <strong>{{ l.label }}</strong>
                <span>{{ l.desc }}</span>
              </div>
              <el-switch v-model="layers[l.key]" />
            </div>
          </section>

          <!-- 图例 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📖 图例</h3>
            <div class="legend-list">
              <div class="legend-item"><span class="legend-line" style="background:#ef4444"></span>低纬环流·哈德莱</div>
              <div class="legend-item"><span class="legend-line" style="background:#2ec4b6"></span>中纬环流·费雷尔</div>
              <div class="legend-item"><span class="legend-line" style="background:#247cff"></span>高纬环流·极地</div>
              <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>信风带</div>
              <div class="legend-item"><span class="legend-dot" style="background:#b91c1c"></span>西风带</div>
              <div class="legend-item"><span class="legend-dot" style="background:#fbbf24"></span>极地东风带</div>
              <div class="legend-item"><span class="legend-band" style="background:#ff8800"></span>低压带（L）</div>
              <div class="legend-item"><span class="legend-band" style="background:#ef4444"></span>高压带（H）</div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-right" @pointerdown.prevent="startResize('left', $event)"></div>
        <button type="button" class="panel-collapse-btn collapse-left" aria-label="收起左侧面板" @click="leftCollapsed = true">‹</button>
      </aside>

      <!-- ===== 中心舞台 ===== -->
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>
          <div class="labels-overlay" ref="labelsOverlayRef">
            <div
              v-for="(l, i) in labelScreenData" :key="i"
              v-show="l.visible" class="scene-label" :class="l.cls"
              :style="{ left: l.x + 'px', top: l.y + 'px' }"
            >{{ l.text }}</div>
          </div>
        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" @click="isPlaying = !isPlaying">
            <el-icon><VideoPause v-if="isPlaying" /><VideoPlay v-else /></el-icon>
          </button>
          <div class="timeline-main">
            <div class="timeline-copy">
              <span>模式：{{ simModeLabel }}</span>
              <strong>{{ simModeHint }}</strong>
            </div>
          </div>
          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">{{ item }}×</button>
          </div>
        </div>
      </section>

      <!-- ===== 右侧面板：教学流程 ===== -->
      <aside id="right-panel" class="side-panel right-panel" :class="{ collapsed: rightCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>教学流程</h2>
              <p>从单圈环流到三圈环流</p>
            </div>
            <span class="panel-badge">TEACH</span>
          </div>

          <!-- 阶段导航 -->
          <div class="stage-nav">
            <div v-for="(stage, i) in stages" :key="stage.id" class="stage-nav-item"
              :class="{ active: currentStage === i, done: currentStage > i }" @click="goToStage(i)">
              <span class="stage-num">{{ i + 1 }}</span>
              <span class="stage-name">{{ stage.shortName }}</span>
            </div>
          </div>

          <section class="geo-card stage-card" v-if="currentStageData">
            <div class="stage-header">
              <span class="stage-badge">阶段 {{ currentStage + 1 }}</span>
              <h3 class="section-title">{{ currentStageData.title }}</h3>
            </div>
            <p class="stage-desc">{{ currentStageData.desc }}</p>
            <div class="stage-points">
              <div v-for="(p, idx) in currentStageData.points" :key="idx" class="step-point"
                :class="{ done: stepDone[idx] }" @click="toggleStep(idx)">
                <span class="step-num">{{ idx + 1 }}</span>
                <span class="step-text">{{ p }}</span>
              </div>
            </div>
            <div class="stage-nav-buttons">
              <button class="theme-btn option-btn" :disabled="currentStage === 0" @click="prevStage">← 上一步</button>
              <button class="theme-btn primary" @click="nextStage">
                {{ currentStage < stages.length - 1 ? '下一步 →' : '从头演示' }}
              </button>
            </div>
          </section>

          <section class="geo-card knowledge-card" v-if="currentStageData">
            <h3 class="section-title">📚 高亮知识</h3>
            <div class="kp-content" v-html="currentStageData.knowledge"></div>
          </section>

          <section class="geo-card knowledge-card">
            <h3 class="section-title">🌬 六个风带</h3>
            <div class="wind-list">
              <div v-for="w in windBelts" :key="w.name + w.range" class="wind-item" :class="w.type">
                <span class="wind-icon">{{ w.icon }}</span>
                <div class="wind-info">
                  <span class="wind-name">{{ w.name }}</span>
                  <span class="wind-range">{{ w.range }}</span>
                </div>
                <span class="wind-dir">{{ w.direction }}</span>
              </div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-left" @pointerdown.prevent="startResize('right', $event)"></div>
        <button type="button" class="panel-collapse-btn collapse-right" aria-label="收起右侧面板" @click="rightCollapsed = true">›</button>
      </aside>
    </main>

    <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left" @click="leftCollapsed = false">›</button>
    <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right" @click="rightCollapsed = false">‹</button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ==================== 常量 ====================
const EARTH_RADIUS = 2.5
const TILT = 23.5 * Math.PI / 180

// 气压带定义
const beltDefs = [
  { name: '赤道低气压带', lat: 0, color: 0xff8800, width: 14 },
  { name: '副热带高气压带', lat: 30, color: 0xef4444, width: 10 },
  { name: '副热带高气压带', lat: -30, color: 0xef4444, width: 10 },
  { name: '副极地低气压带', lat: 60, color: 0x6366f1, width: 10 },
  { name: '副极地低气压带', lat: -60, color: 0x6366f1, width: 10 },
]

const windBelts = [
  { name: '赤道低压带', range: '0° 附近', direction: '上升气流', icon: '⬆️', type: 'pressure-low' },
  { name: '东北信风带', range: '0°~30°N', direction: '东北→西南', icon: '🌬', type: 'trade' },
  { name: '东南信风带', range: '0°~30°S', direction: '东南→西北', icon: '🌬', type: 'trade' },
  { name: '副热带高压带', range: '30° 附近', direction: '下沉气流', icon: '⬇️', type: 'pressure-high' },
  { name: '盛行西风带', range: '30°~60°N', direction: '西南→东北', icon: '💨', type: 'westerly' },
  { name: '盛行西风带', range: '30°~60°S', direction: '西北→东南', icon: '💨', type: 'westerly' },
  { name: '副极地低压带', range: '60° 附近', direction: '上升气流', icon: '⬆️', type: 'pressure-low' },
  { name: '极地东风带', range: '60°~90°N', direction: '东北→西南', icon: '❄️', type: 'polar' },
  { name: '极地东风带', range: '60°~90°S', direction: '东南→西北', icon: '❄️', type: 'polar' },
  { name: '极地高压带', range: '90° 附近', direction: '下沉气流', icon: '⬇️', type: 'pressure-high' },
]

const cellLayerDefs = [
  { key: 'hadleyCell', label: '低纬·哈德莱环流', desc: '0°~30°' },
  { key: 'ferrelCell', label: '中纬·费雷尔环流', desc: '30°~60°' },
  { key: 'polarCell', label: '高纬·极地环流', desc: '60°~90°' },
]
const windLayerDefs = [
  { key: 'surfaceWinds', label: '地面风向箭头', desc: '信风/西风/东风带' },
]
const pressureLayerDefs = [
  { key: 'pressureBands', label: '气压带纬线圈', desc: '7 个气压带' },
  { key: 'pressureArrows', label: '垂直气流箭头', desc: '上升/下沉' },
]
const otherLayerDefs = [
  { key: 'latLines', label: '纬度线', desc: '关键纬线' },
  { key: 'textAnnotations', label: '文字标注', desc: '环流名称/HL' },
]

// ==================== 阶段化教学 ====================
interface Stage {
  id: string; shortName: string; title: string; desc: string; points: string[]; knowledge: string
  layers: Record<string, boolean>
}

const stages: Stage[] = [
  {
    id: 'ideal', shortName: '理想单圈', title: '阶段一：理想单圈环流',
    desc: '假设地表均匀，地转偏向力为零，地球自转形成最简化的单圈环流。',
    points: ['假设地表均匀，无海陆差异', '忽略地转偏向力', '赤道受热上升，极地冷却下沉', '高空：赤道→极地；地面：极地→赤道'],
    knowledge: '理想情况下，若地球不自转、地表均匀，热力环流将仅在赤道与极地之间形成<strong>单一环流圈</strong>。<br>但真实地球<strong>自转且地表不均</strong>，环流被分割为多个。',
    layers: { earth: true, hadleyCell: false, ferrelCell: false, polarCell: false, surfaceWinds: false, pressureBands: false, latLines: true, textAnnotations: true },
  },
  {
    id: 'three', shortName: '三圈环流', title: '阶段二：三圈环流（地转偏向力）',
    desc: '考虑地转偏向力后，单圈环流被分割为南/北半球的低纬、中纬、高纬三圈环流。',
    points: ['赤道上升：0° 受热 → 上升', '高空 0°→30°：向极地流动，受偏转向右', '30° 堆积下沉：副热带高压', '低空 30°→0°：信风带', '60° 极地冷气流相遇：副极地低压（上升）', '高空 60°→30°：西风（极锋急流）', '极地下沉：极地高压'],
    knowledge: '<strong>地转偏向力</strong>使北半球运动物体向右偏、南半球向左偏。赤道上升气流无法直接到达极地，被分割为<strong>三圈环流</strong>。<br>• <strong>低纬环流</strong>（哈德莱）<br>• <strong>中纬环流</strong>（费雷尔）<br>• <strong>高纬环流</strong>（极地）',
    layers: { earth: true, hadleyCell: true, ferrelCell: true, polarCell: true, textAnnotations: true },
  },
  {
    id: 'pressure', shortName: '气压带风带', title: '阶段三：气压带风带的季节移动',
    desc: '由于太阳直射点南北移动，气压带和风带在一年中也随之南北移动。',
    points: ['七个气压带：4L 3H 相间分布', '六个风带：信风/西风/极地东风', '北半球夏季：气压带风带北移', '北半球冬季：气压带风带南移', '移动幅度约 5°~10°'],
    knowledge: '随<strong>太阳直射点</strong>南北移动，气压带和风带在一年中也随之移动。<br>• 夏至：北移到最北位置<br>• 冬至：南移到最南位置<br>• 春分秋分：对称分布',
    layers: { earth: true, hadleyCell: true, ferrelCell: true, polarCell: true, surfaceWinds: true, pressureBands: true, pressureArrows: true, latLines: true, textAnnotations: true },
  },
  {
    id: 'lat-lon', shortName: '海陆分布', title: '阶段四：海陆分布与气压中心',
    desc: '实际海陆热力差异使气压带断裂，形成块状气压中心，季风环流显著。',
    points: ['7月（北半球夏季）：亚洲低压、北太平洋副高', '1月（北半球冬季）：亚洲高压、阿留申低压', '东亚季风：东南季风/西北季风', '南亚季风：西南季风（夏季）'],
    knowledge: '海陆热力性质差异使<strong>气压带被分裂为块状气压中心</strong>：<br>• 夏季陆地形成低压，海洋形成高压<br>• 冬季相反<br>形成<strong>季风环流</strong>：东亚/南亚/澳大利亚北部季风等。',
    layers: { earth: true, hadleyCell: true, ferrelCell: true, polarCell: true, surfaceWinds: true, pressureBands: true, textAnnotations: true },
  },
  {
    id: 'climate', shortName: '季风气候', title: '阶段五：季风环流与气候',
    desc: '三圈环流和季风共同塑造全球降水和气候类型的分布。',
    points: ['气压带风带控制降水分布', '低压带/西风迎风坡：多雨', '高压带/信风离岸：干燥', '季风区：雨热同期'],
    knowledge: '<strong>气压带风带</strong>是全球气候类型形成的主导因素：<br>• 赤道低压带：热带雨林气候<br>• 西风带：温带海洋性气候<br>• 信风带内陆：热带沙漠气候<br>• 季风区：雨热同期，适宜农业',
    layers: { earth: true, hadleyCell: true, ferrelCell: true, polarCell: true, surfaceWinds: true, pressureBands: true, textAnnotations: true },
  },
]

// ==================== 布局状态 ====================
type LayoutMode = 'large' | 'medium' | 'small'
const pageRef = ref<HTMLElement | null>(null)
const hasLeftPanel = true
const hasRightPanel = true
const layoutMode = ref<LayoutMode>('large')
const leftPanelWidth = ref(300)
const rightPanelWidth = ref(320)
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const isPlaying = ref(true)
const playbackSpeed = ref(1)
const speedOptions = [0.5, 1, 2, 5]

// ==================== 业务状态 ====================
const threeContainerRef = ref<HTMLElement | null>(null)
const labelsOverlayRef = ref<HTMLElement | null>(null)
const simMode = ref<'single' | 'three' | 'seasonal'>('three')
const month = ref(6) // 0-11

const modes = [
  { id: 'single' as const, label: '单圈环流', icon: '○' },
  { id: 'three' as const, label: '三圈环流', icon: '◎' },
  { id: 'seasonal' as const, label: '季节变化', icon: '☀' },
]

const simModeLabel = computed(() => {
  const m = modes.find(x => x.id === simMode.value)
  return m ? m.label : ''
})
const simModeHint = computed(() => {
  if (simMode.value === 'single') return '理想单圈：无地转偏向力'
  if (simMode.value === 'three') return '三圈环流完整展示'
  return `季节偏移：${month.value < 6 ? '向南偏移' : '向北偏移'}`
})

const layers = reactive<Record<string, boolean>>({
  earth: true,
  hadleyCell: true,
  ferrelCell: true,
  polarCell: true,
  surfaceWinds: true,
  pressureBands: true,
  pressureArrows: true,
  latLines: true,
  textAnnotations: true,
})

const currentStage = ref(1)
const stepDone = ref<Record<number, boolean>>({})
const currentStageData = computed(() => stages[currentStage.value])

// ==================== 标签 ====================
interface SceneLabel { text: string; lat: number; lon: number; cls: string; type: 'pressure' | 'wind' | 'cell' | 'vertical' }

const cellLabels = computed<SceneLabel[]>(() => [
  { text: '高纬环流', lat: 75, lon: 200, cls: 'label-cell3', type: 'cell' },
  { text: '中纬环流', lat: 45, lon: 200, cls: 'label-cell2', type: 'cell' },
  { text: '低纬环流', lat: 15, lon: 200, cls: 'label-cell1', type: 'cell' },
  { text: '低纬环流', lat: -15, lon: 340, cls: 'label-cell1', type: 'cell' },
  { text: '中纬环流', lat: -45, lon: 340, cls: 'label-cell2', type: 'cell' },
  { text: '高纬环流', lat: -75, lon: 340, cls: 'label-cell3', type: 'cell' },
])

const pressureLabels = computed<SceneLabel[]>(() => [
  { text: '极地高气压带', lat: 80, lon: 300, cls: 'label-high', type: 'pressure' },
  { text: '副极地低气压带', lat: 60, lon: 300, cls: 'label-low', type: 'pressure' },
  { text: '副热带高气压带', lat: 30, lon: 300, cls: 'label-high', type: 'pressure' },
  { text: '赤道低气压带', lat: 0, lon: 300, cls: 'label-low', type: 'pressure' },
  { text: '副热带高气压带', lat: -30, lon: 240, cls: 'label-high', type: 'pressure' },
  { text: '副极地低气压带', lat: -60, lon: 240, cls: 'label-low', type: 'pressure' },
  { text: '极地高气压带', lat: -80, lon: 240, cls: 'label-high', type: 'pressure' },
])

const verticalLabels = computed<SceneLabel[]>(() => [
  { text: '上升', lat: 0, lon: 220, cls: 'label-vertical-up', type: 'vertical' },
  { text: '下沉', lat: 30, lon: 220, cls: 'label-vertical-down', type: 'vertical' },
  { text: '上升', lat: 60, lon: 220, cls: 'label-vertical-up', type: 'vertical' },
  { text: '下沉', lat: 85, lon: 220, cls: 'label-vertical-down', type: 'vertical' },
  { text: '下沉', lat: -30, lon: 320, cls: 'label-vertical-down', type: 'vertical' },
  { text: '上升', lat: -60, lon: 320, cls: 'label-vertical-up', type: 'vertical' },
])

const windLabels = computed<SceneLabel[]>(() => [
  { text: '东北信风带', lat: 15, lon: 160, cls: 'label-trade', type: 'wind' },
  { text: '中纬西风带', lat: 45, lon: 160, cls: 'label-westerly', type: 'wind' },
  { text: '极地东风带', lat: 75, lon: 160, cls: 'label-polar', type: 'wind' },
  { text: '东南信风带', lat: -15, lon: 20, cls: 'label-trade', type: 'wind' },
  { text: '中纬西风带', lat: -45, lon: 20, cls: 'label-westerly', type: 'wind' },
  { text: '极地东风带', lat: -75, lon: 20, cls: 'label-polar', type: 'wind' },
])

const allLabels = computed<SceneLabel[]>(() => [
  ...pressureLabels.value, ...windLabels.value, ...cellLabels.value, ...verticalLabels.value,
])
const labelScreenData = ref<{ text: string; x: number; y: number; visible: boolean; cls: string }[]>([])

// ==================== Three.js 变量 ====================
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null
let earthGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh | null = null
let cellGroups: THREE.Group[] = []
let windArrowGroup: THREE.Group | null = null
let pressureBeltGroup: THREE.Group | null = null
let pressureBeltMeshes: THREE.Mesh[] = []
let latLineGroup: THREE.Group | null = null

let sceneReady = false
let rotationAngle = 0
let animationId = 0
const clock = new THREE.Clock()
let timeAccum = 0

let pageResizeObserver: ResizeObserver | null = null
let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let lastSceneWidth = 0
let lastSceneHeight = 0
let leftPanelManuallyResized = false
let rightPanelManuallyResized = false
let isPanelResizing = false

// ==================== 辅助 ====================
function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }

// ==================== 地球纹理 ====================
function createEarthTexture(): THREE.CanvasTexture {
  const w = 2048, h = 1024
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0d2840'); grad.addColorStop(0.5, '#1a4a7a'); grad.addColorStop(1, '#0d2840')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)
  const lands: number[][][] = [
    [[-168,65],[-128,70],[-75,78],[-55,55],[-70,42],[-82,25],[-100,20],[-115,30],[-125,38],[-140,55],[-155,60],[-168,65]],
    [[-80,10],[-60,8],[-42,-8],[-38,-15],[-50,-35],[-68,-50],[-72,-55],[-78,-20],[-80,10]],
    [[-17,35],[10,35],[33,31],[35,15],[44,12],[42,0],[35,-12],[28,-20],[20,-32],[12,-18],[0,3],[-15,12],[-17,35]],
    [[-10,36],[10,45],[30,42],[48,40],[62,30],[75,20],[80,10],[95,22],[108,12],[122,0],[130,0],[140,35],[145,44],[160,60],[170,65],[180,68],[130,75],[60,72],[20,66],[2,52],[-5,48],[-10,36]],
    [[114,-22],[130,-12],[142,-10],[146,-18],[150,-25],[148,-35],[140,-38],[130,-32],[114,-28],[114,-22]],
    [[-55,60],[-30,65],[-22,80],[-35,82],[-50,80],[-58,72],[-55,60]],
    [[-180,-72],[-60,-72],[0,-70],[60,-68],[120,-70],[180,-72],[180,-90],[-180,-90],[-180,-72]],
  ]
  lands.forEach(path => {
    ctx.beginPath()
    path.forEach((pt, i) => {
      const x = (pt[0]! + 180) / 360 * w; const y = (90 - pt[1]!) / 180 * h
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.closePath(); ctx.fillStyle = '#2a5a3a'; ctx.fill()
    ctx.strokeStyle = '#1a3a2a'; ctx.lineWidth = 2; ctx.stroke()
  })
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ==================== 气压带（分段带状色块） ====================
function createPressureBands(): THREE.Group {
  const group = new THREE.Group()
  beltDefs.forEach(bd => {
    const phiCenter = (90 - bd.lat) * Math.PI / 180
    const phiWidth = bd.width * Math.PI / 180
    const geo = new THREE.SphereGeometry(EARTH_RADIUS * 1.003, 64, 8, 0, Math.PI * 2, phiCenter - phiWidth / 2, phiWidth)
    const mat = new THREE.MeshBasicMaterial({ color: bd.color, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData = { phiStart: phiCenter - phiWidth / 2, phiLength: phiWidth }
    group.add(mesh); pressureBeltMeshes.push(mesh)
  })
  // 极地高压点
  ;[1, -1].forEach(sign => {
    const geo = new THREE.SphereGeometry(0.18, 12, 8)
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.45 }))
    m.position.set(0, sign * EARTH_RADIUS * 1.002, 0)
    group.add(m)
  })
  return group
}

// ==================== 三圈环流（平滑弧线） ====================
function createCirculationCells(): THREE.Group[] {
  const cellRanges = [
    { lat1: 2, lat2: 28, color: 0xef4444 },
    { lat1: 32, lat2: 58, color: 0x2ec4b6 },
    { lat1: 62, lat2: 87, color: 0x247cff },
  ]
  return cellRanges.map(cell => {
    const group = new THREE.Group()
    const tubeMat = new THREE.MeshBasicMaterial({ color: cell.color, transparent: true, opacity: 0.5, depthWrite: false })
    ;[1, -1].forEach(s => {
      const lat1 = s * cell.lat1; const lat2 = s * cell.lat2
      const midLat = (lat1 + lat2) / 2
      for (let lon = 0; lon < 360; lon += 30) {
        const pts = [
          latLonToVec3(lat1, lon, EARTH_RADIUS * 1.015),
          latLonToVec3(lat1 + (lat2 - lat1) * 0.22, lon, EARTH_RADIUS * 1.09),
          latLonToVec3(midLat, lon, EARTH_RADIUS * 1.17),
          latLonToVec3(lat2 - (lat2 - lat1) * 0.22, lon, EARTH_RADIUS * 1.09),
          latLonToVec3(lat2, lon, EARTH_RADIUS * 1.015),
        ]
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.025, 8, false)
        group.add(new THREE.Mesh(tubeGeo, tubeMat))
        // 高空流向箭头
        const headP = curve.getPoint(0.54)
        const headP2 = curve.getPoint(0.58)
        const headDir = headP2.clone().sub(headP).normalize()
        const head = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.2, 8),
          new THREE.MeshBasicMaterial({ color: cell.color }),
        )
        head.position.copy(headP2)
        head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), headDir)
        group.add(head)
      }
    })
    return group
  })
}

// ==================== 风向箭头 ====================
function createWindArrows(): THREE.Group {
  const group = new THREE.Group()
  const r = EARTH_RADIUS

  const bands: { lat1: number; lat2: number; color: number; dir: 'west' | 'east' }[] = [
    { lat1: 5, lat2: 28, color: 0xef4444, dir: 'west' },
    { lat1: -5, lat2: -28, color: 0xef4444, dir: 'west' },
    { lat1: 32, lat2: 58, color: 0xb91c1c, dir: 'east' },
    { lat1: -32, lat2: -58, color: 0xb91c1c, dir: 'east' },
    { lat1: 62, lat2: 87, color: 0xfbbf24, dir: 'west' },
    { lat1: -62, lat2: -87, color: 0xfbbf24, dir: 'west' },
  ]
  bands.forEach(b => {
    const midLat = (b.lat1 + b.lat2) / 2
    if (Math.abs(midLat) > 88) return
    const dLon = b.dir === 'east' ? 30 : -30
    for (let lon = 15; lon < 360; lon += 40) {
      const s = latLonToVec3(midLat, lon, r)
      const e = latLonToVec3(midLat, lon + dLon, r)
      const dir = e.clone().sub(s).normalize()
      const len = 0.5; const se = s.clone().add(dir.clone().multiplyScalar(len))
      const sm = s.clone().add(se).multiplyScalar(0.5)
      const sGeo = new THREE.CylinderGeometry(0.03, 0.03, len, 8)
      const shaft = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: b.color, opacity: 0.9, transparent: true }))
      shaft.position.copy(sm); shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      group.add(shaft)
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), new THREE.MeshBasicMaterial({ color: b.color }))
      h.position.copy(se.clone().add(dir.clone().multiplyScalar(0.1)))
      h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      group.add(h)
    }
  })
  return group
}

// ==================== 纬线 ====================
function createLatLines(): THREE.Group {
  const group = new THREE.Group()
  const r = EARTH_RADIUS * 1.005
  ;[-60, -30, 0, 30, 60].forEach(lat => {
    const pts: THREE.Vector3[] = []
    for (let lon = -180; lon <= 180; lon += 2) pts.push(latLonToVec3(lat, lon, r))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: lat === 0 ? 0xfbbf24 : 0x4a6a8a, transparent: true, opacity: lat === 0 ? 0.6 : 0.3 })))
  })
  return group
}

// ==================== 垂直气流箭头 ====================
function createPressureArrows(): THREE.Group {
  const group = new THREE.Group()
  const bands = [
    { lat: 0, color: 0xff8800, dir: 1 },
    { lat: 30, color: 0xef4444, dir: -1 },
    { lat: 60, color: 0x6366f1, dir: 1 },
    { lat: -30, color: 0xef4444, dir: -1 },
    { lat: -60, color: 0x6366f1, dir: 1 },
  ]
  bands.forEach(b => {
    const r = EARTH_RADIUS * 1.01
    const arLen = 0.45; const headS = 0.1
    for (let lon = 30; lon < 360; lon += 70) {
      const base = latLonToVec3(b.lat, lon, r)
      const tip = latLonToVec3(b.lat, lon, r + arLen * b.dir)
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([base, tip]),
        new THREE.LineBasicMaterial({ color: b.color, transparent: true, opacity: 0.8 }),
      ))
      const head = new THREE.Mesh(new THREE.ConeGeometry(headS, headS * 1.5, 6), new THREE.MeshBasicMaterial({ color: b.color }))
      head.position.copy(tip)
      if (b.dir > 0) head.lookAt(tip.x * 2, tip.y * 2, tip.z * 2)
      else head.lookAt(0, 0, 0)
      head.rotateX(Math.PI / 2)
      group.add(head)
    }
  })
  return group
}

// ==================== 重建函数 ====================
function rebuildCells() { if (!earthMesh || !sceneReady) return; cellGroups.forEach(g => earthMesh!.remove(g)); cellGroups = createCirculationCells(); cellGroups.forEach(g => earthMesh!.add(g)) }
function rebuildWindArrows() { if (!earthMesh || !sceneReady) return; if (windArrowGroup) earthMesh.remove(windArrowGroup); windArrowGroup = createWindArrows(); earthMesh.add(windArrowGroup) }
function rebuildPressureBands() { if (!earthMesh || !sceneReady) return; if (pressureBeltGroup) earthMesh.remove(pressureBeltGroup); pressureBeltMeshes = []; pressureBeltGroup = createPressureBands(); earthMesh.add(pressureBeltGroup) }

// ==================== 初始化 ====================
function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000511)
  scene.fog = new THREE.FogExp2(0x000511, 0.01)

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(0, 3, 9)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.className = 'scene-canvas three-canvas'
  renderer.localClippingEnabled = true
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true; orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 4; orbitControls.maxDistance = 25

  const sun = new THREE.DirectionalLight(0xffffff, 2.5)
  sun.position.set(8, 3, 5); scene.add(sun)
  scene.add(new THREE.AmbientLight(0x4a5a8a, 0.8))

  earthGroup = new THREE.Group()
  earthGroup.rotation.z = TILT
  scene.add(earthGroup)

  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const earthTex = createEarthTexture()
  const earthMat = new THREE.MeshPhongMaterial({
    map: earthTex, shininess: 10,
    transparent: false, opacity: 1.0,
    emissive: 0x1a2a44, emissiveIntensity: 0.25,
  })
  earthMesh = new THREE.Mesh(earthGeo, earthMat)
  earthGroup.add(earthMesh)

  // 异步加载贴图
  new THREE.TextureLoader().load('/geo-resources-folder/images/earth.jpg', tex => {
    tex.colorSpace = THREE.SRGBColorSpace; earthMat.map = tex; earthMat.needsUpdate = true
  }, undefined, () => { console.warn('地球贴图加载失败，使用程序化纹理') })

  // 线框
  const wfGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(EARTH_RADIUS, 64, 16))
  earthMesh.add(new THREE.LineSegments(wfGeo, new THREE.LineBasicMaterial({ color: 0x304050, transparent: true, opacity: 0.08 })))

  // 各图层
  cellGroups = createCirculationCells(); cellGroups.forEach(g => earthMesh!.add(g))
  windArrowGroup = createWindArrows(); earthMesh!.add(windArrowGroup)
  pressureBeltGroup = createPressureBands(); earthMesh!.add(pressureBeltGroup)
  // 垂直气流箭头单独放在 earthGroup 下以便旋转
  const pressureArrowGroup = createPressureArrows()
  earthGroup!.add(pressureArrowGroup)
  ;(pressureArrowGroup as any).__pressureArrowsGroup = true

  latLineGroup = createLatLines(); earthMesh!.add(latLineGroup)

  resizeThreeSceneNow()
  threeResizeObserver = new ResizeObserver(() => scheduleSceneResize())
  threeResizeObserver.observe(container)

  sceneReady = true
  applyLayerVisibility()
  animate()
}

// ==================== 动画 ====================
function animate() {
  animationId = requestAnimationFrame(animate)
  if (!sceneReady || !earthMesh) return
  const dt = Math.min(clock.getDelta(), 0.05)
  timeAccum += dt

  const rotSpd = simMode.value === 'single' ? 0.05 : 0.8
  rotationAngle += dt * rotSpd * playbackSpeed.value * 0.3
  earthMesh.rotation.y = rotationAngle

  // 季节偏移
  if (simMode.value === 'seasonal') {
    const shiftDeg = -23.5 * Math.cos((month.value / 12) * Math.PI * 2)
    const shiftRad = -shiftDeg * Math.PI / 180
    pressureBeltMeshes.forEach(m => { m.rotation.x = shiftRad })
  } else {
    pressureBeltMeshes.forEach(m => { m.rotation.x = 0 })
  }

  orbitControls?.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
  updateLabels()
}

// ==================== 标签更新 ====================
function updateLabels() {
  const container = threeContainerRef.value
  if (!container || !camera) return
  const w = container.clientWidth; const h = container.clientHeight
  const camDir = camera.position.clone().normalize()
  const rotAxis = new THREE.Vector3(0, 1, 0)
  const tiltAxis = new THREE.Vector3(0, 0, 1)

  labelScreenData.value = allLabels.value.map(label => {
    let r = EARTH_RADIUS * 1.03
    if (label.type === 'pressure') r = EARTH_RADIUS * 1.02
    else if (label.type === 'cell') r = EARTH_RADIUS * 1.2
    else if (label.type === 'wind') r = EARTH_RADIUS * 1.025
    else if (label.type === 'vertical') r = EARTH_RADIUS * 1.16
    const localPos = latLonToVec3(label.lat, label.lon, r)
    localPos.applyAxisAngle(rotAxis, rotationAngle)
    localPos.applyAxisAngle(tiltAxis, TILT)
    const dot = localPos.clone().normalize().dot(camDir)
    const visible = dot > 0.1
    const screenPos = localPos.clone().project(camera!)
    const x = (screenPos.x * 0.5 + 0.5) * w
    const y = (-screenPos.y * 0.5 + 0.5) * h
    return { text: label.text, x, y, visible, cls: label.cls }
  })
}

// ==================== 图层可见性 ====================
function applyLayerVisibility() {
  if (!sceneReady || !earthMesh) return
  earthMesh.visible = !!layers.earth
  if (cellGroups.length >= 3) {
    if (cellGroups[0]) cellGroups[0].visible = !!layers.hadleyCell
    if (cellGroups[1]) cellGroups[1].visible = !!layers.ferrelCell
    if (cellGroups[2]) cellGroups[2].visible = !!layers.polarCell
  }
  if (windArrowGroup) windArrowGroup.visible = !!layers.surfaceWinds
  if (pressureBeltGroup) pressureBeltGroup.visible = !!layers.pressureBands
  if (latLineGroup) latLineGroup.visible = !!layers.latLines
  earthMesh.parent?.children.forEach(c => {
    if ((c as any).__pressureArrowsGroup) c.visible = !!layers.pressureArrows
  })
}

// ==================== 模式切换 ====================
function setMode(mode: 'single' | 'three' | 'seasonal') {
  simMode.value = mode
  if (mode === 'single') goToStage(0)
  else if (mode === 'three') goToStage(1)
}

// ==================== 阶段控制 ====================
function applyStage(stageIndex: number) {
  const stage = stages[stageIndex]; if (!stage) return
  Object.keys(layers).forEach(k => { (layers as any)[k] = false })
  Object.entries(stage.layers).forEach(([k, v]) => { (layers as any)[k] = v })
  stepDone.value = {}
}

function goToStage(stageIndex: number) { currentStage.value = stageIndex; applyStage(stageIndex) }
function nextStage() {
  if (currentStage.value < stages.length - 1) goToStage(currentStage.value + 1)
  else replayAll()
}
function prevStage() { if (currentStage.value > 0) goToStage(currentStage.value - 1) }
function toggleStep(idx: number) { stepDone.value[idx] = !stepDone.value[idx] }

function replayAll() {
  currentStage.value = 0; applyStage(0)
  setTimeout(() => goToStage(1), 500)
  setTimeout(() => goToStage(2), 1500)
  setTimeout(() => goToStage(3), 2500)
  setTimeout(() => goToStage(4), 3500)
}

watch(currentStage, () => { if (sceneReady) applyStage(currentStage.value) })

// ==================== Resize ====================
function resizeThreeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !camera || !renderer) return
  const w = Math.max(1, Math.round(container.clientWidth))
  const h = Math.max(1, Math.round(container.clientHeight))
  if (w === lastSceneWidth && h === lastSceneHeight) return
  lastSceneWidth = w; lastSceneHeight = h
  camera.aspect = w / h; camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}

function scheduleSceneResize(delay = 140) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (isPanelResizing) { scheduleSceneResize(90); return }
    resizeThreeSceneNow()
  }, delay)
}

// ==================== 布局 ====================
function getAdaptivePanelWidth(side: 'left' | 'right', mode: LayoutMode, pageWidth: number) {
  if (mode === 'small') return clamp(pageWidth * 0.82, 260, 360)
  if (mode === 'medium') return clamp(pageWidth * 0.38, 300, 440)
  return clamp(pageWidth * (side === 'left' ? 0.19 : 0.20), side === 'left' ? 300 : 320, side === 'left' ? 460 : 500)
}

function updateLayoutMode() {
  const pageWidth = pageRef.value?.clientWidth || window.innerWidth
  const nextMode: LayoutMode = pageWidth >= 1440 ? 'large' : pageWidth >= 820 ? 'medium' : 'small'
  layoutMode.value = nextMode
  if (!leftPanelManuallyResized) leftPanelWidth.value = getAdaptivePanelWidth('left', nextMode, pageWidth)
  if (!rightPanelManuallyResized) rightPanelWidth.value = getAdaptivePanelWidth('right', nextMode, pageWidth)
}

function getPanelResizeBounds(side: 'left' | 'right') {
  const pageWidth = pageRef.value?.clientWidth || window.innerWidth
  if (layoutMode.value === 'small') return { min: 220, max: Math.max(220, Math.min(400, pageWidth * 0.86)) }
  if (layoutMode.value === 'medium') return { min: 280, max: Math.max(280, Math.min(560, pageWidth * 0.58)) }
  return { min: side === 'left' ? 280 : 300, max: Math.max(side === 'left' ? 280 : 300, Math.min(720, pageWidth * 0.50)) }
}

function startResize(side: 'left' | 'right', event: PointerEvent) {
  if ((side === 'left' && leftCollapsed.value) || (side === 'right' && rightCollapsed.value)) return
  if (side === 'left') leftPanelManuallyResized = true
  else rightPanelManuallyResized = true
  isPanelResizing = true
  const startX = event.clientX
  const startWidth = side === 'left' ? leftPanelWidth.value : rightPanelWidth.value
  const bounds = getPanelResizeBounds(side)
  const onMove = (moveEvent: PointerEvent) => {
    const deltaX = moveEvent.clientX - startX
    const nextWidth = side === 'left' ? startWidth + deltaX : startWidth - deltaX
    const width = clamp(nextWidth, bounds.min, bounds.max)
    if (side === 'left') leftPanelWidth.value = width
    else rightPanelWidth.value = width
  }
  const finishResize = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', finishResize)
    window.removeEventListener('pointercancel', finishResize)
    document.body.style.cursor = ''; document.body.style.userSelect = ''
    isPanelResizing = false; scheduleSceneResize(0)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', finishResize)
  window.addEventListener('pointercancel', finishResize)
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
}

function toggleAllPanels() {
  const shouldCollapse = !allPanelsCollapsed.value
  if (hasLeftPanel) leftCollapsed.value = shouldCollapse
  if (hasRightPanel) rightCollapsed.value = shouldCollapse
  scheduleSceneResize()
}

const allPanelsCollapsed = computed(() => {
  const states: boolean[] = []
  if (hasLeftPanel) states.push(leftCollapsed.value)
  if (hasRightPanel) states.push(rightCollapsed.value)
  return states.length > 0 && states.every(Boolean)
})

// ==================== 监听 ====================
watch(layers, applyLayerVisibility, { deep: true })

// ==================== 生命周期 ====================
onMounted(async () => {
  updateLayoutMode()
  pageResizeObserver = new ResizeObserver(() => { updateLayoutMode(); scheduleSceneResize() })
  if (pageRef.value) pageResizeObserver.observe(pageRef.value)
  await nextTick()
  initScene()
  applyStage(currentStage.value)
})

onBeforeUnmount(() => {
  sceneReady = false
  cancelAnimationFrame(animationId)
  pageResizeObserver?.disconnect(); pageResizeObserver = null
  threeResizeObserver?.disconnect(); threeResizeObserver = null
  if (sceneResizeTimer) { clearTimeout(sceneResizeTimer); sceneResizeTimer = null }
  orbitControls?.dispose(); orbitControls = null
  scene?.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
      else (obj.material as THREE.Material)?.dispose()
    }
  })
  renderer?.dispose()
  if (renderer?.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
  scene = null; camera = null; renderer = null
  earthGroup = null; earthMesh = null
})
</script>

<style scoped>
.page-subtitle { font-size: 14px; color: #64748b; font-weight: 400; margin-left: 10px; letter-spacing: 1px; }
.replay-btn { background: linear-gradient(135deg, #2ec4b6, #247cff) !important; color: #fff !important; font-weight: 600; }

/* 模式按钮 */
.mode-buttons { display: flex; flex-direction: column; gap: 5px; }
.mode-option-btn {
  display: flex; align-items: center; gap: 8px; padding: 7px 12px;
  border-radius: 8px; border: 1px solid rgba(46,196,182,0.2);
  background: rgba(8,12,28,0.5); color: #94a3b8;
  cursor: pointer; transition: all 0.15s; font-size: 13px;
}
.mode-option-btn:hover { border-color: #2ec4b6; color: #cbd5e1; }
.mode-option-btn.active { border-color: #2ec4b6; background: rgba(46,196,182,0.12); color: #2ec4b6; }
.mode-icon { font-size: 16px; width: 20px; text-align: center; }

/* 阶段导航 */
.stage-nav {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;
  padding: 10px 14px; background: rgba(8,12,28,0.6);
  border-bottom: 1px solid rgba(46,196,182,0.12);
}
.stage-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 4px; border-radius: 6px; cursor: pointer;
  background: rgba(8,12,28,0.5); transition: all 0.2s;
}
.stage-nav-item:hover { background: rgba(46,196,182,0.12); }
.stage-nav-item.active { background: linear-gradient(135deg, #2ec4b6, #247cff); color: #fff; box-shadow: 0 2px 8px rgba(46,196,182,0.3); }
.stage-nav-item.done { border: 1px solid rgba(46,196,182,0.3); }
.stage-num { width: 24px; height: 24px; border-radius: 50%; background: rgba(46,196,182,0.2); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.stage-nav-item.active .stage-num { background: rgba(255,255,255,0.25); }
.stage-name { font-size: 11px; color: #94a3b8; text-align: center; }
.stage-nav-item.active .stage-name { color: #fff; }

/* 阶段卡片 */
.stage-card { background: linear-gradient(135deg, rgba(46,196,182,0.08), rgba(36,124,255,0.08)) !important; }
.stage-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.stage-badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; background: linear-gradient(135deg, #2ec4b6, #247cff); color: #fff; }
.stage-desc { font-size: 13px; color: #94a3b8; line-height: 1.7; margin: 0 0 12px; }
.stage-points { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.step-point { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: rgba(8,12,28,0.5); cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.step-point:hover { background: rgba(46,196,182,0.1); }
.step-point.done { background: rgba(46,196,182,0.18); border-color: rgba(46,196,182,0.4); }
.step-num { width: 22px; height: 22px; border-radius: 50%; background: rgba(46,196,182,0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #2ec4b6; flex-shrink: 0; }
.step-point.done .step-num { background: #2ec4b6; color: #fff; }
.step-text { font-size: 13px; color: #cbd5e1; line-height: 1.5; }
.stage-nav-buttons { display: flex; gap: 8px; }
.stage-nav-buttons .theme-btn { flex: 1; }
.stage-nav-buttons .theme-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 知识点 */
.knowledge-card { margin-bottom: 14px; }
.kp-content { font-size: 13px; color: #94a3b8; line-height: 1.8; }
.kp-content :deep(strong) { color: #fbbf24; }

/* 风带列表 */
.wind-list { display: flex; flex-direction: column; gap: 6px; }
.wind-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; border: 1px solid transparent; background: rgba(8,12,28,0.4); }
.wind-icon { font-size: 16px; }
.wind-info { flex: 1; display: flex; flex-direction: column; }
.wind-name { font-size: 13px; color: #cbd5e1; }
.wind-range { font-size: 11px; color: #64748b; }
.wind-dir { font-size: 11px; color: #2ec4b6; font-weight: 600; }
.wind-item.pressure-low .wind-icon { color: #ff8800; }
.wind-item.pressure-high .wind-icon { color: #ef4444; }

/* 图例 */
.legend-list { display: flex; flex-direction: column; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-line { width: 16px; height: 3px; border-radius: 2px; flex-shrink: 0; }
.legend-band { width: 18px; height: 10px; border-radius: 4px; flex-shrink: 0; }

/* HTML 标签 */
.labels-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
.scene-label { position: absolute; transform: translate(-50%, -50%); font-weight: 700; white-space: nowrap; padding: 3px 10px; border-radius: 5px; text-shadow: 0 1px 3px rgba(0,0,0,0.9); font-size: 13px; }
.scene-label.label-high { color: #fff; background: rgba(8,12,28,0.45); border: 1px solid rgba(239,68,68,0.35); font-size: 12px; }
.scene-label.label-low { color: #fff; background: rgba(8,12,28,0.45); border: 1px solid rgba(255,136,0,0.35); font-size: 12px; }
.scene-label.label-trade { color: #ef4444; font-size: 12px; }
.scene-label.label-westerly { color: #fca5a5; font-size: 12px; }
.scene-label.label-polar { color: #fbbf24; font-size: 12px; }
.scene-label.label-cell1, .scene-label.label-cell2, .scene-label.label-cell3 { color: #fff; font-size: 14px; }
.scene-label.label-vertical-up, .scene-label.label-vertical-down { color: #ef4444; font-size: 15px; font-weight: 800; text-shadow: 0 0 4px rgba(0,0,0,0.9); }

/* 时间轴 */
.timeline-copy strong { color: #2ec4b6; }
</style>
