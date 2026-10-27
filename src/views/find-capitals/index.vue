<template>
  <div ref="pageRef" class="china-map-container geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area"><img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="地理互动课堂" /></div>
      <h1 class="page-title">找省会 · 识首府</h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="resetGame">重新开始</button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetMapView">地图复位</button>
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">{{ allPanelsCollapsed ? '展开面板' : '收起面板' }}</button>
      </div>
    </header>
    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content china-map-stage">
          <div class="map-zone">
            <div ref="chartRef" class="china-map-chart" tabindex="0" role="group" aria-label="中国互动地图；方向键切换城市点，回车选择" @keydown="onMapKeydown"></div>
            <div class="map-caption" aria-live="polite">
              <span class="eyebrow">{{ mode === 'special' ? '认识行政区' : isQuiz ? '城市定位练习' : '中国省会与首府' }}</span>
              <strong>{{ mapInstruction }}</strong>
              <span v-if="mode === 'learn'">{{ drilledRegion ? '当前仅显示该省区 · 可拖动与缩放' : '点击选择省区 · 在右侧选择“只看这个省区”可进入单独地图' }}</span>
              <span v-else-if="!isQuiz">拖动浏览 · 滚轮缩放 · 点击查看</span>
              <span v-else>{{ answerMode === 'drag' ? '拖动右侧题目卡片到城市圆点 · 松手匹配' : '点击圆点作答 · 可放大地图' }} · 方向键切换，回车确认</span>
              <button v-if="drilledRegion" class="back-to-national action" @click="returnToNational">← 返回全国地图</button>
            </div>
            <div class="map-legend"><span v-if="mode !== 'special' && scope !== 'autonomous'"><i class="dot capital-dot"></i>省会</span><span v-if="mode !== 'special' && scope !== 'province'"><i class="dot seat-dot"></i>首府</span><span v-if="isQuiz"><i class="dot solved-dot"></i>已找到</span><span v-if="mode === 'special'"><i class="dot special-dot"></i>行政区位置</span></div>
            <div v-if="loadState !== 'ready'" class="map-loading" role="status">
              <strong>{{ loadState === 'error' ? '地图暂时未能加载' : '正在展开中国地图…' }}</strong>
              <p>{{ loadState === 'error' ? '请检查网络连接后重试。' : '准备省区边界与城市点位' }}</p>
              <button v-if="loadState === 'error'" class="action primary" @click="initializeMap">重新加载</button>
            </div>
          </div>
        </div>
      </section>
      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll lesson-panel">
          <div class="panel-heading"><div><h2>在地图上认识中国</h2><p>记住名称，也找到位置</p></div><span class="panel-badge">地理课堂</span></div>
          <section class="geo-card mode-switch-card">
            <div class="mode-switch" aria-label="学习模式">
              <button v-for="item in modes" :key="item.value" class="mode-btn" :class="{ active: mode === item.value }" :aria-pressed="mode === item.value" @click="switchMode(item.value)">{{ item.label }}</button>
            </div>
          </section>
          <section v-if="mode !== 'special'" class="geo-card settings-card">
            <label>{{ isQuiz ? '练习范围' : '学习范围' }}<select v-model="scope" @change="onSettingsChange"><option value="all">省会与首府 · 28 座城市</option><option value="province">省会 · 23 座城市</option><option value="autonomous">首府 · 5 座城市</option></select></label>
            <label v-if="isQuiz">练习难度<select v-model="difficulty" @change="onSettingsChange"><option value="beginner">入门 · 四个具名候选点</option><option value="standard">进阶 · 隐藏地名，可用提示</option><option value="advanced">挑战 · 隐藏地名，不提供提示</option></select></label>
            <p class="small-note">{{ isQuiz ? '切换模式、范围或难度将开始新一轮。' : '省对应省会，自治区对应首府。' }}</p>
          </section>
          <template v-if="isQuiz">
            <section class="geo-card answer-mode-card">
              <div class="mode-switch" aria-label="匹配方式">
                <button class="mode-btn" :class="{ active: answerMode === 'click' }" :aria-pressed="answerMode === 'click'" @click="setAnswerMode('click')">👆 点选匹配</button>
                <button class="mode-btn" :class="{ active: answerMode === 'drag' }" :aria-pressed="answerMode === 'drag'" @click="setAnswerMode('drag')">🖐 拖拽匹配</button>
              </div>
              <p class="small-note">可随时切换，保留本轮进度。</p>
            </section>
            <section v-if="!finished && currentQuestion" class="geo-card question-card">
              <div class="question-meta"><span>{{ reviewing ? '错题重练' : mode === 'challenge' ? '限时挑战' : '找省会 · 识首府' }}</span><span>{{ questionIndex + 1 }} / {{ questions.length }}</span></div>
              <h2>{{ currentQuestion.name }}<br />的{{ capitalTerm(currentQuestion) }}在哪里？</h2>
              <button v-if="answerMode === 'drag'" type="button" class="drag-question" :class="{ dragging: dragState }" :disabled="!canAnswer"
                @pointerdown="startAnswerDrag" @pointermove="moveAnswerDrag" @pointerup="endAnswerDrag"
                @pointercancel="cancelAnswerDrag" @lostpointercapture="cancelAnswerDrag" @keydown.esc="cancelAnswerDrag">
                <span aria-hidden="true">⠿</span> {{ currentQuestion.name }} · {{ capitalTerm(currentQuestion) }}
                <small>{{ questionSolved ? '已匹配成功' : '按住此卡片，拖到地图上的城市圆点' }}</small>
              </button>
              <p class="question-help">{{ answerMode === 'drag' ? '拖到城市圆点后松手；落在空白处不计错，可重新拖动。' : difficulty === 'beginner' ? '从本题候选城市中选择，绿色点为已完成城市。' : '在地图上点击对应的城市圆点。' }}</p>
              <div v-if="hintLevel" class="hint-box">提示 {{ hintLevel }}/2：{{ hintLevel === 1 ? `位于${currentQuestion.area}地区，先找到这个省区。` : '目标省区已用金色描边，试着找出其中的城市点。' }}</div>
              <div class="feedback" :class="feedback?.tone" role="status" aria-live="polite">{{ feedback?.text || (answerMode === 'drag' ? '准备好了，把题目卡片拖到对应的城市点。' : '准备好了，就在地图上点一点。') }}</div>
              <div class="question-actions">
                <button v-if="difficulty !== 'advanced'" class="action" :disabled="!canAnswer || hintLevel >= 2" @click="giveHint">{{ hintLevel ? '再提示一下' : '给我提示' }}</button>
                <button v-if="!questionSolved" class="action" :disabled="!canAnswer" @click="skipQuestion">先跳过</button>
                <button v-else class="action primary" @click="nextQuestion">{{ questionIndex === questions.length - 1 ? '查看结果' : '下一题' }}</button>
              </div>
            </section>
            <section class="geo-card progress-card">
              <div class="progress-head"><div><strong>{{ finished ? '本轮结果' : '点亮进度' }}</strong><span>{{ solvedCount }} / {{ questions.length }} 已找到</span></div><div v-if="mode === 'challenge'" class="timer" :class="{ warn: timeLeft <= 30 }"><small>剩余时间</small>{{ formatTime(timeLeft) }}</div><div v-else class="timer"><small>已用时间</small>{{ formatTime(elapsed) }}</div></div>
              <div class="progress-bar-wrap" role="progressbar" :aria-valuenow="solvedCount" :aria-valuemax="questions.length" :aria-valuemin="0" aria-label="已找到城市"><div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div></div>
              <div class="score-grid"><div><strong>{{ firstCount }}</strong><span>首次答对</span></div><div><strong>{{ hintedCount }}</strong><span>提示后答对</span></div><div><strong>{{ retriedCount }}</strong><span>重试后答对</span></div></div>
            </section>
            <section v-if="finished" class="geo-card result-card" aria-live="polite">
              <span class="eyebrow">{{ timedOut ? '时间到' : '本轮练习结束' }}</span>
              <h2>{{ reviewQuestions.length ? '再巩固一次，更熟悉一点' : '全部独立答对！' }}</h2>
              <p>用时 {{ formatTime(elapsed) }}，还有 {{ pendingCount }} 个待完成。</p>
              <p v-if="reviewQuestions.length">重练将包含答错、使用提示、跳过和未完成的题目。</p>
              <div class="question-actions"><button v-if="reviewQuestions.length" class="action primary" @click="startReview">只练待巩固题（{{ reviewQuestions.length }}）</button><button class="action" @click="resetGame">再来一轮</button></div>
              <div class="result-list"><div v-for="item in questions" :key="item.adcode"><span>{{ item.name }} → <b>{{ item.city }}</b></span><span :class="{ 'result-good': answerStatus(records[item.adcode]!) === 'first' }">{{ statusLabels[answerStatus(records[item.adcode]!)] }}</span></div></div>
            </section>
            <section v-else class="geo-card map-note-card"><h3>怎样找到城市？</h3><p>{{ difficulty === 'beginner' ? '根据省区轮廓和城市名称，找到对应的城市点。地图不会提前标出目标省区。' : '根据省区轮廓和相对位置寻找城市。答题时隐藏省区名和未答对的城市名，在空白区域点击或松手不会计错。' }}</p><p>答对后城市会点亮。点击“下一题”继续，方便老师随时讲解。</p></section>
          </template>
          <template v-else>
            <section class="geo-card knowledge-card">
              <span class="eyebrow">{{ KIND_LABELS[selectedRegion.kind] }} · {{ selectedRegion.area }}</span>
              <h2>{{ selectedRegion.name }}</h2>
              <template v-if="selectedRegion.city"><p class="capital-answer"><span>{{ capitalTerm(selectedRegion) }}</span><strong>{{ selectedRegion.city }}</strong></p><p>在地图上找到亮起的城市点，记住它与省区的位置关系。</p></template>
              <template v-else><p class="region-kind">省级行政区</p><p>{{ selectedRegion.kind === 'municipality' ? '直辖市是由中央直接管辖的省级行政区。“省会”是省的行政中心的称谓，不适用于直辖市。' : '特别行政区是我国省级行政区的一种类型。“省会”是省的行政中心的称谓，不适用于特别行政区。' }}</p><p>地图标记用于帮助认识该行政区的位置。</p></template>
              <button v-if="mode === 'learn' && !drilledRegion" class="action primary" :disabled="loadState !== 'ready'" @click="drillIntoSelectedRegion">只看这个省区</button>
            </section>
            <section class="geo-card province-list-card"><div class="province-list-head"><h3>{{ mode === 'special' ? '4 个直辖市 · 2 个特别行政区' : '点击名称，点亮城市' }}</h3><span>{{ visibleRegions.length }} 个</span></div><div class="province-name-grid"><button v-for="item in visibleRegions" :key="item.adcode" class="region-card" :class="{ active: selectedRegion.adcode === item.adcode }" :aria-pressed="selectedRegion.adcode === item.adcode" @click="selectRegion(item)"><span class="short-badge">{{ item.shortName }}</span><span><b>{{ item.name }}</b><small>{{ item.city || KIND_LABELS[item.kind] }}</small></span></button></div></section>
          </template>
          <section class="geo-card map-note-card">
            <h3>省级行政区包括哪些？</h3>
            <p>我国有 34 个省级行政区：23 个省、5 个自治区、4 个直辖市和 2 个特别行政区。</p>
            <p>省的行政中心称为“省会”，自治区的行政中心称为“首府”。“省会”这一称谓不适用于直辖市和特别行政区。</p>
            <p>本课件的 28 座城市是省会与首府练习范围，并非省级行政区总数。直辖市和特别行政区在单独的模式中学习。</p>
          </section>
        </div>
        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>
        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">›</button>
      </aside>
    </main>
    <teleport to="body">
      <button v-if="hasRightPanel && rightCollapsed" type="button" class="viewport-panel-entry" v-bind="rightEntryAttrs" :style="panelEntryViewportStyle"><span aria-hidden="true">‹</span></button>
      <div class="map-zoom-controls" role="group" aria-label="地图缩放控制" :style="mapZoomControlsViewportStyle"><button class="map-zoom-btn" aria-label="缩小地图" @click="zoomMap('out')">−</button><button class="map-zoom-btn" aria-label="放大地图" @click="zoomMap('in')">＋</button></div>
      <div v-if="dragState" class="drag-preview" aria-hidden="true" :style="{ left: dragState.x + 'px', top: dragState.y + 'px' }">{{ currentQuestion?.name }} · {{ currentQuestion ? capitalTerm(currentQuestion) : '' }}</div>
      <dialog ref="challengeDialogRef" class="challenge-dialog" :class="{ 'challenge-timeout': challengeResult === 'timeout' }"
        aria-labelledby="challenge-result-title" aria-describedby="challenge-result-description"
        @cancel="dismissChallengeResult" @close="dismissChallengeResult">
        <span class="eyebrow">限时挑战 · {{ challengeResult === 'success' ? '全部点亮' : '本轮结束' }}</span>
        <h2 id="challenge-result-title">{{ challengeResult === 'success' ? '挑战成功，真棒！' : '时间到了，再接再厉！' }}</h2>
        <p id="challenge-result-description">{{ challengeResult === 'success'
          ? `本轮 ${questions.length} 座城市全部找到了！你对它们的位置越来越熟悉了。`
          : `你已经找到了 ${solvedCount} 座城市，还有 ${pendingCount} 座待完成。把没记牢的再练一遍，下次会更熟练。` }}</p>
        <div class="challenge-stats">
          <div><strong>{{ solvedCount }} / {{ questions.length }}</strong><span>已找到</span></div>
          <div><strong>{{ formatTime(elapsed) }}</strong><span>本轮用时</span></div>
          <div><strong>{{ firstCount }}</strong><span>首次答对</span></div>
        </div>
        <div class="question-actions">
          <button class="action primary" autofocus @click="dismissChallengeResult">查看本轮结果</button>
          <button class="action" @click="resetGame">再挑战一次</button>
        </div>
        <button v-if="reviewQuestions.length" class="dialog-review" @click="startReview">不限时巩固待复习题（{{ reviewQuestions.length }}）</button>
      </dialog>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  watch,
  onMounted,
  onUnmounted,
  ref,
  type CSSProperties,
} from 'vue'
import * as echarts from 'echarts'
/*
 * 公共模板样式已内置平板宽度与触控拖拽规则。
 */
import '@/styles/geo-page-template.css'
import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import { REGIONS, KIND_LABELS, capitalTerm, capitalRegions, shuffled, newRecord, answerStatus, needsReview, type Region, type Scope, type LessonMode, type Difficulty, type AnswerRecord } from './capitals'

const chartRef =
  ref<HTMLDivElement>()

const hasRightPanel = true

let chartResizeObserver:
  | ResizeObserver
  | null = null

let chartResizeTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let chartResizeFrame = 0
let chartResizeSettleFrame = 0

let lastChartWidth = 0
let lastChartHeight = 0

const mapZoomControlsViewportStyle = ref<CSSProperties>({})
const panelEntryViewportStyle = ref<CSSProperties>({})

const MAP_ZOOM_CONTROLS_WIDTH = 112
const MAP_ZOOM_CONTROLS_HEIGHT = 58
const PANEL_ENTRY_WIDTH = 44
const PANEL_ENTRY_HEIGHT = 60
const VIEWPORT_CONTROL_GAP = 16

let viewportControlsFrame = 0

/*
 * 浏览器捏合缩放时，VisualViewport 会在 LayoutViewport 内移动。
 * fixed 元素仍可能留在 LayoutViewport 的边缘，因此这里根据当前真正可见的
 * VisualViewport 计算绝对坐标，并反向抵消页面缩放，保证控件始终在屏幕内。
 */
function updateViewportControlsPosition() {
  const viewport = window.visualViewport
  const scale = Math.max(viewport?.scale || 1, 0.1)
  const pageLeft = viewport?.pageLeft ?? window.scrollX
  const pageTop = viewport?.pageTop ?? window.scrollY
  const width = viewport?.width ?? window.innerWidth
  const height = viewport?.height ?? window.innerHeight
  const inverseScale = 1 / scale

  mapZoomControlsViewportStyle.value = {
    left: `${pageLeft + (width - MAP_ZOOM_CONTROLS_WIDTH * inverseScale) / 2}px`,
    top: `${pageTop + height - (MAP_ZOOM_CONTROLS_HEIGHT + VIEWPORT_CONTROL_GAP) * inverseScale}px`,
    transform: `scale(${inverseScale})`,
  }

  panelEntryViewportStyle.value = {
    left: `${pageLeft + width - PANEL_ENTRY_WIDTH * inverseScale}px`,
    top: `${pageTop + (height - PANEL_ENTRY_HEIGHT * inverseScale) / 2}px`,
    transform: `scale(${inverseScale})`,
  }
}

function scheduleViewportControlsPosition() {
  cancelAnimationFrame(viewportControlsFrame)
  viewportControlsFrame = requestAnimationFrame(() => {
    viewportControlsFrame = 0
    updateViewportControlsPosition()
  })
}

/*
 * 本页面只有右侧模板面板。
 *
 * 平板宽度直接使用公共配置：
 * - medium 默认 300px，最小 240px；
 * - small 默认 270px，最小 210px。
 *
 * 不再由组件内部写死 300px 最小宽度。
 */
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

  toggleAll:
  toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: false,
  },

  right: {
    enabled: hasRightPanel,
    resizable: true,
  },

  onLayoutChange(state) {
    /*
     * 面板拖拽和浏览器连续缩放期间，
     * 不高频执行 ECharts resize。
     */
    if (state.resizing) {
      return
    }

    scheduleChartResize(90)
  },

  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleChartResize(0)
    }
  },
})
const PROVINCES = REGIONS

const modes: { value: LessonMode; label: string }[] = [
  { value: 'learn', label: '自由学习' }, { value: 'special', label: '直辖市与特别行政区' },
  { value: 'practice', label: '找省会·识首府' }, { value: 'challenge', label: '限时挑战' },
]
const mode = ref<LessonMode>('learn')
const scope = ref<Scope>('all')
const difficulty = ref<Difficulty>('standard')
const answerMode = ref<'click' | 'drag'>('click')
const dragState = ref<{ pointerId: number; adcode: string; x: number; y: number } | null>(null)
let dragHandle: HTMLElement | null = null

function cancelAnswerDrag() {
  const pointerId = dragState.value?.pointerId
  const handle = dragHandle
  dragState.value = null
  dragHandle = null
  if (pointerId !== undefined && handle?.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
}

function setAnswerMode(next: 'click' | 'drag') {
  cancelAnswerDrag()
  answerMode.value = next
}

function startAnswerDrag(event: PointerEvent) {
  tickClock()
  if (event.button !== 0 || dragState.value || answerMode.value !== 'drag' || !canAnswer.value || !currentQuestion.value) return
  event.preventDefault()
  dragHandle = event.currentTarget as HTMLElement
  dragHandle.focus({ preventScroll: true })
  dragState.value = { pointerId: event.pointerId, adcode: currentQuestion.value.adcode, x: event.clientX, y: event.clientY }
  dragHandle.setPointerCapture(event.pointerId)
}

function moveAnswerDrag(event: PointerEvent) {
  if (dragState.value?.pointerId !== event.pointerId) return
  dragState.value.x = event.clientX
  dragState.value.y = event.clientY
}

function endAnswerDrag(event: PointerEvent) {
  const drag = dragState.value
  if (!drag || drag.pointerId !== event.pointerId) return
  cancelAnswerDrag()
  tickClock()
  if (!canAnswer.value || currentQuestion.value?.adcode !== drag.adcode || !chartRef.value || !chart) return
  const bounds = chartRef.value.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    feedback.value = { tone: 'info', text: '卡片已返回，请拖到地图上的城市圆点。本次不计错。' }
    return
  }
  // CSS 缩放后的屏幕坐标转换为 ECharts 内部坐标。
  const px = (event.clientX - bounds.left) * chart.getWidth() / bounds.width
  const py = (event.clientY - bounds.top) * chart.getHeight() / bounds.height
  const nearest = findCityAtPoint(px, py)
  if (nearest) answerCity(nearest)
  else feedback.value = { tone: 'info', text: '请拖到城市圆点再松手；可以先放大地图。本次不计错。' }
}
const loadState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const selectedRegion = ref<Region>(REGIONS.find(item => item.adcode === '370000')!)
const drilledRegion = ref<Region | null>(null)
const questions = ref<Region[]>([])
const questionIndex = ref(0)
const records = ref<Record<string, AnswerRecord>>({})
const feedback = ref<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
const finished = ref(false)
const timedOut = ref(false)
const reviewing = ref(false)
const challengeDialogRef = ref<HTMLDialogElement>()
const challengeResult = ref<'success' | 'timeout' | null>(null)
const elapsed = ref(0)
const timeLeft = ref(300)
const focusedCity = ref('')
const statusLabels = { first: '首次答对', hinted: '提示后答对', retried: '重试后答对', pending: '待完成' }
const isQuiz = computed(() => mode.value === 'practice' || mode.value === 'challenge')
const visibleRegions = computed(() => mode.value === 'special'
  ? REGIONS.filter(region => !region.city) : capitalRegions(scope.value))
const currentQuestion = computed(() => questions.value[questionIndex.value])
const currentRecord = computed(() => currentQuestion.value ? records.value[currentQuestion.value.adcode] : undefined)
const hintLevel = computed(() => currentRecord.value?.hints || 0)
const questionSolved = computed(() => !!currentRecord.value?.solved)
const canAnswer = computed(() => isQuiz.value && loadState.value === 'ready' && !finished.value && !!currentQuestion.value && !questionSolved.value)
const solvedCount = computed(() => Object.values(records.value).filter(item => item.solved).length)
const firstCount = computed(() => Object.values(records.value).filter(item => answerStatus(item) === 'first').length)
const hintedCount = computed(() => Object.values(records.value).filter(item => answerStatus(item) === 'hinted').length)
const retriedCount = computed(() => Object.values(records.value).filter(item => answerStatus(item) === 'retried').length)
const pendingCount = computed(() => questions.value.length - solvedCount.value)
const progressPercent = computed(() => questions.value.length ? solvedCount.value / questions.value.length * 100 : 0)
const reviewQuestions = computed(() => questions.value.filter(item => {
  const record = records.value[item.adcode]
  return record && needsReview(record)
}))
const mapInstruction = computed(() => {
  if (!isQuiz.value) {
    if (mode.value === 'special') return '直辖市与特别行政区，都是省级行政区'
    return drilledRegion.value ? `${drilledRegion.value.name} · ${capitalTerm(drilledRegion.value)} ${drilledRegion.value.city}` : '点击省区或城市，探索它的省会与首府'
  }
  if (finished.value) return '本轮练习结束，看看有哪些城市需要巩固'
  const item = currentQuestion.value
  return item ? `找到${item.name}的${capitalTerm(item)}` : '正在准备题目'
})

// 入门仅展示四个候选城市；干扰项取附近城市，顺序不暗示答案。
const candidateRegions = computed(() => {
  const target = currentQuestion.value
  if (!isQuiz.value || difficulty.value !== 'beginner' || !target || finished.value) return visibleRegions.value
  const distance = (region: Region) => (region.coord[0] - target.coord[0]) ** 2 + (region.coord[1] - target.coord[1]) ** 2
  return [target, ...capitalRegions(scope.value).filter(item => item.adcode !== target.adcode)
    .sort((a, b) => distance(a) - distance(b)).slice(0, 3)].sort((a, b) => a.coord[0] - b.coord[0])
})
const mapRegions = computed(() => {
  if (mode.value === 'learn' && drilledRegion.value) return [drilledRegion.value]
  const regions = [...candidateRegions.value]
  if (isQuiz.value) for (const item of questions.value) {
    if (records.value[item.adcode]?.solved && !regions.some(region => region.adcode === item.adcode)) regions.push(item)
  }
  return regions
})

function beginClock() {
  roundStartedAt = Date.now()
  elapsed.value = 0
  timeLeft.value = 300
}

function tickClock() {
  if (!isQuiz.value || finished.value || loadState.value !== 'ready' || !roundStartedAt) return
  // 最后一题已答对时停表，保留反馈供教师讲解。
  if (questionSolved.value && questionIndex.value === questions.value.length - 1) return
  elapsed.value = Math.floor((Date.now() - roundStartedAt) / 1000)
  timeLeft.value = Math.max(0, 300 - elapsed.value)
  if (mode.value === 'challenge' && timeLeft.value === 0) {
    elapsed.value = 300
    finishRound(true)
  }
}

function startRound(items = capitalRegions(scope.value), review = false) {
  cancelAnswerDrag()
  challengeResult.value = null
  drilledRegion.value = null
  questions.value = shuffled(items)
  records.value = Object.fromEntries(items.map(item => [item.adcode, newRecord()]))
  questionIndex.value = 0
  finished.value = false
  timedOut.value = false
  reviewing.value = review
  feedback.value = null
  focusedCity.value = ''
  beginClock()
  resetMapView()
}

function resetGame() {
  cancelAnswerDrag()
  challengeResult.value = null
  drilledRegion.value = null
  if (isQuiz.value) startRound()
  else {
    questions.value = []
    questionIndex.value = 0
    records.value = {}
    finished.value = false
    timedOut.value = false
    reviewing.value = false
    feedback.value = null
    selectedRegion.value = visibleRegions.value[0]!
    focusedCity.value = ''
    resetMapView()
  }
}

function switchMode(next: LessonMode) {
  if (mode.value === next) return
  mode.value = next
  resetGame()
}

function onSettingsChange() {
  drilledRegion.value = null
  if (isQuiz.value) startRound()
  else {
    selectedRegion.value = visibleRegions.value[0]!
    resetMapView()
  }
}

function finishRound(timeout = false) {
  cancelAnswerDrag()
  finished.value = true
  timedOut.value = timeout
  focusedCity.value = ''
  feedback.value = null
  if (mode.value === 'challenge') {
    challengeResult.value = timeout ? 'timeout'
      : questions.value.length > 0 && solvedCount.value === questions.value.length ? 'success' : null
  }
}

function dismissChallengeResult() {
  challengeResult.value = null
}

watch(challengeResult, async () => {
  await nextTick()
  const dialog = challengeDialogRef.value
  if (!dialog) return
  if (challengeResult.value && !dialog.open) dialog.showModal()
  else if (!challengeResult.value && dialog.open) dialog.close()
})

function nextQuestion() {
  cancelAnswerDrag()
  tickClock()
  if (finished.value) return
  if (questionIndex.value === questions.value.length - 1) {
    finishRound()
    return
  }
  questionIndex.value++
  feedback.value = null
  focusedCity.value = ''
  resetMapView()
}

function skipQuestion() {
  tickClock()
  if (!canAnswer.value || !currentRecord.value) return
  currentRecord.value.skipped = true
  nextQuestion()
}

function giveHint() {
  tickClock()
  if (!canAnswer.value || !currentRecord.value || hintLevel.value >= 2 || difficulty.value === 'advanced') return
  currentRecord.value.hints++
  if (hintLevel.value === 2) resetMapView()
}

function startReview() {
  const items = [...reviewQuestions.value]
  if (!items.length) return
  mode.value = 'practice'
  startRound(items, true)
}

function selectRegion(region: Region) {
  if (isQuiz.value) return
  const wasSpecial = mode.value === 'special'
  const leavingDrill = !!drilledRegion.value && drilledRegion.value.adcode !== region.adcode
  if (!region.city) mode.value = 'special'
  else {
    if (mode.value === 'special') mode.value = 'learn'
    if (scope.value !== 'all' && region.kind !== scope.value) scope.value = 'all'
  }
  selectedRegion.value = region
  focusedCity.value = ''
  if (mode.value === 'learn') {
    if (drilledRegion.value?.adcode !== region.adcode) drilledRegion.value = null
    // 全国图上选择城市时保留用户的缩放、平移；只有切换地图才复位。
    if (wasSpecial || leavingDrill) resetMapView()
    else renderMap()
    return
  }
  drilledRegion.value = null
  // 港澳面积小，点击列表后定位放大；点位仅用于区域定位。
  chart?.setOption({ geo: { map: CHINA_MAP_NAME, center: region.kind === 'sar' ? [113.8, 22.4] : [104, 35], zoom: region.kind === 'sar' ? 7 : 1.2, layoutCenter: null, layoutSize: null } })
}

function answerCity(region: Region) {
  tickClock()
  if (!isQuiz.value) { selectRegion(region); return }
  if (!canAnswer.value || !currentQuestion.value || !currentRecord.value) return
  if (region.adcode !== currentQuestion.value.adcode) {
    currentRecord.value.mistakes++
    feedback.value = { tone: 'error', text: `这是${region.city}，再找找${currentQuestion.value.name}的${capitalTerm(currentQuestion.value)}。` }
    return
  }
  currentRecord.value.solved = true
  feedback.value = { tone: 'success', text: `答对了！${region.name}的${capitalTerm(region)}是${region.city}。` }
  if (mode.value === 'challenge' && solvedCount.value === questions.value.length) finishRound()
}

function resetMapView() {
  const region = drilledRegion.value
  if (mode.value === 'learn' && region && chart && geoJsonData) {
    const name = `${CHINA_MAP_NAME}-${region.adcode}`
    const features = geoJsonData.features.filter((feature: any) => feature.properties?.name === region.name)
    if (!features.length) return
    if (!echarts.getMap(name)) echarts.registerMap(name, { type: 'FeatureCollection', features } as any)
    // 清除全国地图中心，让 ECharts 根据该省区的真实边界重新适配。
    chart.setOption({ geo: { map: name, center: null, zoom: 1, layoutCenter: ['50%', '58%'], layoutSize: '75%' } })
  } else {
    chart?.setOption({ geo: { map: CHINA_MAP_NAME, center: [104, 35], zoom: 1.2, layoutCenter: null, layoutSize: null } })
  }
  renderMap()
}

function returnToNational() {
  drilledRegion.value = null
  focusedCity.value = ''
  resetMapView()
}

function drillIntoSelectedRegion() {
  if (mode.value !== 'learn' || loadState.value !== 'ready') return
  drilledRegion.value = selectedRegion.value
  resetMapView()
}

// 将相邻城市的标签分别放到点位两侧，避免西宁、兰州等名称相互遮挡。
const cityLabelPositions: Record<string, 'left' | 'right' | 'top' | 'bottom'> = {
  '630000': 'left', '140000': 'left', '340000': 'left', '430000': 'left',
  '360000': 'bottom', '110000': 'top', '120000': 'bottom',
  '810000': 'right', '820000': 'left',
}
const cityLabelOffsets: Record<string, [number, number]> = {
  '140000': [0, -28],
}

function renderMap() {
  if (!chart || loadState.value !== 'ready') return
  const displayedRegions = mapRegions.value
  chart.setOption({
    geo: { regions: getBaseGeoRegions() },
    series: [{
      id: 'capital-points', type: 'scatter', coordinateSystem: 'geo', silent: true, z: 6, animation: false,
      labelLayout: (params: { dataIndex?: number }) => {
        const region = displayedRegions[params.dataIndex ?? -1]
        const offset = region ? cityLabelOffsets[region.adcode] : undefined
        return { hideOverlap: false, moveOverlap: 'shiftY', dx: offset?.[0] || 0, dy: offset?.[1] || 0 }
      },
      labelLine: { show: true, lineStyle: { color: '#91b4c5', width: 1 } },
      emphasis: { disabled: true },
      data: displayedRegions.map(region => {
        const solved = isQuiz.value && !!records.value[region.adcode]?.solved
        const selected = !isQuiz.value && selectedRegion.value.adcode === region.adcode
        const focused = focusedCity.value === region.adcode
        const color = solved ? '#55e6a5' : !region.city ? '#c4a6ff' : region.kind === 'autonomous' ? '#f8ca72' : '#67d8ff'
        return {
          name: region.city || region.name, value: region.coord,
          symbolSize: focused || selected ? 20 : solved ? 14 : 12,
          itemStyle: { color, borderColor: focused || selected ? '#ffffff' : '#0b2133', borderWidth: focused || selected ? 3 : 2, opacity: 1, shadowBlur: selected || solved ? 12 : 0, shadowColor: color },
          label: {
            show: !isQuiz.value || difficulty.value === 'beginner' || solved || finished.value,
            formatter: region.city || region.name, position: cityLabelPositions[region.adcode] || 'right', distance: 7,
            color: selected || solved ? '#ffffff' : '#d9ebf4', fontSize: selected ? 16 : 13,
            backgroundColor: 'rgba(6, 20, 34, 0.85)', borderRadius: 4, padding: [4, 6],
          },
        }
      }),
    }],
  })
}

watch([mode, scope, difficulty, selectedRegion, drilledRegion, questionIndex, records, finished, focusedCity], renderMap, { deep: true })

/*
 * 省级行政区陆地相邻关系。
 * 使用 DSATUR 图着色生成底色，确保相邻省区不会使用同一种颜色。
 */
const PROVINCE_NEIGHBOR_PAIRS: Array<[string, string]> = [
  ['北京市', '天津市'], ['北京市', '河北省'], ['天津市', '河北省'],
  ['河北省', '辽宁省'], ['河北省', '内蒙古自治区'], ['河北省', '山西省'],
  ['河北省', '河南省'], ['河北省', '山东省'],
  ['山西省', '内蒙古自治区'], ['山西省', '陕西省'], ['山西省', '河南省'],
  ['内蒙古自治区', '黑龙江省'], ['内蒙古自治区', '吉林省'], ['内蒙古自治区', '辽宁省'],
  ['内蒙古自治区', '陕西省'], ['内蒙古自治区', '宁夏回族自治区'], ['内蒙古自治区', '甘肃省'],
  ['辽宁省', '吉林省'], ['吉林省', '黑龙江省'],
  ['上海市', '江苏省'], ['上海市', '浙江省'],
  ['江苏省', '山东省'], ['江苏省', '安徽省'], ['江苏省', '浙江省'],
  ['浙江省', '安徽省'], ['浙江省', '江西省'], ['浙江省', '福建省'],
  ['安徽省', '江西省'], ['安徽省', '湖北省'], ['安徽省', '河南省'], ['安徽省', '山东省'],
  ['福建省', '江西省'], ['福建省', '广东省'],
  ['江西省', '湖北省'], ['江西省', '湖南省'], ['江西省', '广东省'],
  ['山东省', '河南省'],
  ['河南省', '陕西省'], ['河南省', '湖北省'],
  ['湖北省', '陕西省'], ['湖北省', '重庆市'], ['湖北省', '湖南省'],
  ['湖南省', '重庆市'], ['湖南省', '贵州省'], ['湖南省', '广西壮族自治区'], ['湖南省', '广东省'],
  ['广东省', '广西壮族自治区'], ['广东省', '香港特别行政区'], ['广东省', '澳门特别行政区'],
  ['广西壮族自治区', '贵州省'], ['广西壮族自治区', '云南省'],
  ['重庆市', '陕西省'], ['重庆市', '四川省'], ['重庆市', '贵州省'],
  ['四川省', '青海省'], ['四川省', '甘肃省'], ['四川省', '陕西省'],
  ['四川省', '贵州省'], ['四川省', '云南省'], ['四川省', '西藏自治区'],
  ['贵州省', '云南省'],
  ['云南省', '西藏自治区'],
  ['西藏自治区', '新疆维吾尔自治区'], ['西藏自治区', '青海省'],
  ['陕西省', '甘肃省'], ['陕西省', '宁夏回族自治区'],
  ['甘肃省', '新疆维吾尔自治区'], ['甘肃省', '青海省'], ['甘肃省', '宁夏回族自治区'],
  ['青海省', '新疆维吾尔自治区'],
]

const PROVINCE_BASE_COLORS = [
  '#789ec6',
  '#c58fa2',
  '#86ad79',
  '#d0a35f',
  '#9b8cc1',
]

function createProvinceColorMap() {
  const neighbors = new Map(
    PROVINCES.map(province => [province.name, new Set<string>()])
  )

  for (const [left, right] of PROVINCE_NEIGHBOR_PAIRS) {
    neighbors.get(left)?.add(right)
    neighbors.get(right)?.add(left)
  }

  const colorIndexes = new Map<string, number>()
  const uncolored = new Set(PROVINCES.map(province => province.name))

  while (uncolored.size) {
    const name = [...uncolored].sort((a, b) => {
      const saturationA = new Set(
        [...(neighbors.get(a) || [])]
          .map(item => colorIndexes.get(item))
          .filter((item): item is number => item !== undefined)
      ).size
      const saturationB = new Set(
        [...(neighbors.get(b) || [])]
          .map(item => colorIndexes.get(item))
          .filter((item): item is number => item !== undefined)
      ).size

      return saturationB - saturationA ||
        (neighbors.get(b)?.size || 0) - (neighbors.get(a)?.size || 0)
    })[0]!

    const usedColors = new Set(
      [...(neighbors.get(name) || [])]
        .map(item => colorIndexes.get(item))
        .filter((item): item is number => item !== undefined)
    )
    const colorIndex = PROVINCE_BASE_COLORS.findIndex(
      (_, index) => !usedColors.has(index)
    )

    colorIndexes.set(name, colorIndex >= 0 ? colorIndex : 0)
    uncolored.delete(name)
  }

  return new Map(
    PROVINCES.map(province => [
      province.name,
      PROVINCE_BASE_COLORS[colorIndexes.get(province.name) || 0]!,
    ])
  )
}

const provinceBaseColorMap = createProvinceColorMap()

// 中国省级行政区 GeoJSON：高德下载的全国省级完整数据
const CHINA_GEOJSON_URL = '/geo-resources-folder/geojson/中国矢量数据/中国省级行政区.json'
// 不能注册成 china：ECharts 对名为 china 的地图会注入内置南海诸岛小窗。
// 使用自定义地图名后，完全按我们提供的 GeoJSON 原样渲染。
const CHINA_MAP_NAME = 'chinaCapitalLesson'

let chart: echarts.ECharts | null = null
let geoJsonData: any = null
let clockTimer: ReturnType<typeof setInterval> | null = null
let roundStartedAt = 0
let disposed = false
const mapAbortController = new AbortController()

/*
 * Chrome / Edge 会把触控板双指缩放转换成 ctrl + wheel。
 * ECharts 的 roam 也监听 wheel；在捕获阶段放行浏览器缩放手势，
 * 避免用户想缩放网页时反而只缩放了地图。
 */
function onChartWheelCapture(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) {
    return
  }

  event.stopImmediatePropagation()
}

function zoomMap(direction: 'in' | 'out') {
  if (!chart) {
    return
  }

  const option = chart.getOption()
  const geoOption = Array.isArray(option.geo)
    ? option.geo[0]
    : option.geo
  const optionZoom = Number(
    (geoOption as { zoom?: number } | undefined)?.zoom
  )
  const currentZoom = Number.isFinite(optionZoom)
    ? optionZoom
    : 1.8
  const zoomFactor = direction === 'in'
    ? 1.25
    : 0.8
  const nextZoom = Math.min(
    8,
    Math.max(0.7, currentZoom * zoomFactor)
  )

  chart.setOption(
    {
      geo: {
        zoom: nextZoom,
      },
    },
    {
      lazyUpdate: false,
    }
  )
}

// 高德 中国省级行政区.json 的最后一个辅助要素通常使用 adcode=100000_JD / adchar=JD，
// geometry 为 MultiPolygon。它不是普通省级行政区，而是九段线的面状几何表达。
const NINE_DASH_REGION_NAME = '__九段线__'

function isNineDashFeature(feature: any): boolean {
  const props = feature?.properties || {}
  const adcode = String(props.adcode ?? props.adCode ?? '').trim()
  const adchar = String(props.adchar ?? props.ADCHAR ?? '').trim().toUpperCase()
  const name = String(props.name ?? props.NAME ?? '').trim()

  return (
    adcode === '100000_JD' ||
    adchar === 'JD' ||
    /九段线|十段线|断续线/.test(name)
  )
}

function getBaseGeoRegions() {
  return [...REGIONS.map(region => {
    const solved = !!records.value[region.adcode]?.solved
    const highlighted = !isQuiz.value ? selectedRegion.value.adcode === region.adcode
      : currentQuestion.value?.adcode === region.adcode && hintLevel.value >= 2
    return {
      name: region.name,
      itemStyle: {
        areaColor: solved ? provinceBaseColorMap.get(region.name) : highlighted ? '#285772' : '#234258',
        borderColor: highlighted ? '#fbbf24' : '#91b4c5', borderWidth: highlighted ? 2.5 : 0.8,
      },
      label: { show: false },
    }
  }), { name: NINE_DASH_REGION_NAME, silent: true,
    label: { show: false }, itemStyle: { areaColor: '#ffffff', borderColor: '#ffffff', borderWidth: 0 },
    emphasis: { disabled: true }, select: { disabled: true },
  }]
}

function isPanelLayoutResizing() {
  return (
    draggingSide.value !== null ||
    viewportResizing.value
  )
}

function resizeChartNow() {
  const element =
    chartRef.value

  if (!chart || !element) {
    return
  }

  const width = Math.max(
    1,
    Math.round(
      element.clientWidth
    )
  )

  const height = Math.max(
    1,
    Math.round(
      element.clientHeight
    )
  )

  /*
   * 容器尺寸没有变化时不重复 resize。
   */
  if (
    width === lastChartWidth &&
    height === lastChartHeight
  ) {
    return
  }

  lastChartWidth = width
  lastChartHeight = height

  chart.resize({
    width,
    height,
    silent: true,
  })
}

function scheduleChartResize(
  delay = 110
) {
  if (chartResizeTimer) {
    clearTimeout(
      chartResizeTimer
    )
  }

  cancelAnimationFrame(
    chartResizeFrame
  )

  cancelAnimationFrame(
    chartResizeSettleFrame
  )

  /*
   * 拖拽过程中先让 ECharts DOM 通过 CSS 跟随。
   * 松手后再做最终像素校准。
   */
  if (isPanelLayoutResizing()) {
    return
  }

  chartResizeTimer =
    setTimeout(() => {
      chartResizeTimer = null

      chartResizeFrame =
        requestAnimationFrame(() => {
          chartResizeFrame = 0

          chartResizeSettleFrame =
            requestAnimationFrame(() => {
              chartResizeSettleFrame = 0
              resizeChartNow()
            })
        })
    }, delay)
}


function formatTime(seconds: number): string {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

// 射线法判断点是否在多边形内
function pointInPolygon(px: number, py: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!, yi = ring[i]![1]!
    const xj = ring[j]![0]!, yj = ring[j]![1]!
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function getProvinceAtPoint(x: number, y: number): string {
  try {
    if (!chart || !geoJsonData) return ''
    // 像素坐标 → 地理坐标
    const geoCoord = chart.convertFromPixel('geo', [x, y]) as number[]
    if (!geoCoord || geoCoord.length < 2) return ''
    const [lng, lat] = geoCoord as [number, number]

    // 这里只处理真正的 34 个省级行政区。
    // 九段线在该 GeoJSON 中也是 MultiPolygon，因此必须通过辅助标记排除。
    for (const feature of geoJsonData.features) {
      if (feature?.properties?.__auxiliary === 'nineDashLine') continue
      if (drilledRegion.value && feature?.properties?.name !== drilledRegion.value.name) continue

      const geom = feature?.geometry
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue

      const coordsList: number[][][][] =
        geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]

      for (const polygon of coordsList) {
        const outerRing = polygon[0] as number[][]
        if (outerRing && pointInPolygon(lng, lat, outerRing) && !polygon.slice(1).some(ring => pointInPolygon(lng, lat, ring))) {
          return feature.properties?.name || ''
        }
      }
    }
  } catch (_) { /* ignore */ }
  return ''
}

function findCityAtPoint(px: number, py: number) {
  if (!chart) return
  let nearest: Region | undefined
  let nearestDistance = 20
  for (const region of mapRegions.value) {
    const point = chart.convertToPixel({ geoIndex: 0 }, region.coord) as number[] | undefined
    if (!point || point.length < 2) continue
    const distance = Math.hypot(point[0]! - px, point[1]! - py)
    if (distance < nearestDistance) { nearest = region; nearestDistance = distance }
  }
  return nearest
}

function onMapClick(params: any) {
  if (!chart || loadState.value !== 'ready' || (isQuiz.value && answerMode.value === 'drag')) return
  const px = params.offsetX ?? params.event?.offsetX ?? 0
  const py = params.offsetY ?? params.event?.offsetY ?? 0
  const nearest = findCityAtPoint(px, py)
  if (nearest) { answerCity(nearest); return }
  if (!isQuiz.value) {
    const name = getProvinceAtPoint(px, py)
    const region = REGIONS.find(item => item.name === name)
    if (region) selectRegion(region)
  } else if (canAnswer.value) {
    feedback.value = { tone: 'info', text: '请点击城市圆点；可以放大地图再选择。本次不计错。' }
  }
}

function onMapKeydown(event: KeyboardEvent) {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return
  event.preventDefault()
  if (loadState.value !== 'ready') return
  if (event.key === 'Enter' || event.key === ' ') {
    const region = mapRegions.value.find(item => item.adcode === focusedCity.value)
    if (region) answerCity(region)
    return
  }
  const index = mapRegions.value.findIndex(item => item.adcode === focusedCity.value)
  const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
  const next = index === -1 ? 0 : (index + offset + mapRegions.value.length) % mapRegions.value.length
  focusedCity.value = mapRegions.value[next]?.adcode || ''
}

// 加载高德全国省级完整 GeoJSON
async function loadChinaGeoJson(): Promise<any> {
  const res = await fetch(CHINA_GEOJSON_URL, { signal: mapAbortController.signal })
  if (!res.ok) {
    throw new Error(`中国 GeoJSON 加载失败：HTTP ${res.status}`)
  }
  return await res.json()
}

// ---- 生命周期 ----
onMounted(async () => {
  updateViewportControlsPosition()
  window.visualViewport?.addEventListener(
    'resize',
    scheduleViewportControlsPosition
  )
  window.visualViewport?.addEventListener(
    'scroll',
    scheduleViewportControlsPosition
  )
  window.addEventListener(
    'resize',
    scheduleViewportControlsPosition
  )
  window.addEventListener(
    'scroll',
    scheduleViewportControlsPosition,
    true
  )

  await initializeMap()
})

async function initializeMap() {
  if (disposed || loadState.value === 'loading') return
  loadState.value = 'loading'
  try {
    const data = await loadChinaGeoJson()
    if (disposed) return
    const sourceFeatures = Array.isArray(data?.features) ? data.features : []

    if (!sourceFeatures.length) {
      throw new Error('中国地图没有可用的区域数据')
    }

    const provinceByAdcode = new Map(PROVINCES.map(p => [p.adcode, p]))
    const provinceByName = new Map(PROVINCES.map(p => [p.name, p]))
    const features: any[] = []

    let nineDashFeatureCount = 0

    for (const rawFeature of sourceFeatures) {
      if (!rawFeature?.geometry) continue

      const geometryType = rawFeature.geometry.type
      if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
        continue
      }

      const props = rawFeature.properties || {}

      // 高德全国 GeoJSON 的九段线本身就是 MultiPolygon，不能按 LineString 处理。
      // 保留真实坐标，只给它一个独立名称和辅助标记，交给 geo 原样渲染。
      if (isNineDashFeature(rawFeature)) {
        rawFeature.properties = {
          ...props,
          name: NINE_DASH_REGION_NAME,
          __auxiliary: 'nineDashLine',
        }
        features.push(rawFeature)
        nineDashFeatureCount += 1
        continue
      }

      const rawAdcode = String(props.adcode ?? props.adCode ?? '').trim()
      const rawName = String(props.name ?? props.NAME ?? '').trim()
      const province = provinceByAdcode.get(rawAdcode) || provinceByName.get(rawName)

      // 保留完整清单中的 34 个省级行政区，包含香港、澳门两个特别行政区。
      if (!province) continue

      rawFeature.properties = {
        ...props,
        name: province.name,
        shortName: province.shortName,
        adcode: province.adcode,
      }
      features.push(rawFeature)
    }

    geoJsonData = {
      type: 'FeatureCollection',
      features,
    }

    const provinceFeatureCount = features.filter(
      f => f?.properties?.__auxiliary !== 'nineDashLine'
    ).length

    if (!provinceFeatureCount) {
      throw new Error('中国地图没有省级行政区数据')
    }

    console.info(
      `[中国地图] 已从 ${CHINA_GEOJSON_URL} 加载 ${provinceFeatureCount} 个省级面要素；` +
      `九段线 MultiPolygon ${nineDashFeatureCount} 个；地图注册名：${CHINA_MAP_NAME}`
    )

    if (!nineDashFeatureCount) {
      console.warn(
        '[中国地图] 未识别到九段线 MultiPolygon。请检查最后一个 feature 的 adcode/adchar，' +
        '当前优先识别 100000_JD / JD。'
      )
    }

    // 关键：不要使用 "china" 作为注册名，否则 ECharts 会额外注入自己的南海诸岛小窗。
    echarts.registerMap(CHINA_MAP_NAME, geoJsonData)
  } catch (e) {
    if (!disposed) { loadState.value = 'error'; console.error('GeoJSON 加载失败:', e) }
    return
  }

  await nextTick()
  if (disposed || !chartRef.value) return
  const el = chartRef.value
  try { chart = echarts.init(el) }
  catch (error) { loadState.value = 'error'; console.error(error); return }
  chart.setOption({
    backgroundColor: 'transparent',
    geo: {
      map: CHINA_MAP_NAME,
      roam: true,
      silent: true,
      center: [104, 35],
      zoom: 1.2,
      scaleLimit: {
        min: 0.7,
        max: 8,
      },
      label: { show: false },
      itemStyle: {
        borderColor: '#ffffff',
        borderWidth: 1.2,
        areaColor: '#234258',
      },
      emphasis: {
        label: { show: false },
        itemStyle: { areaColor: '#234258' },
      },
      // 九段线是 MultiPolygon 辅助要素：单独设为白色，不参与城市答题。
      regions: getBaseGeoRegions(),
    },
  })

  /*
   * ECharts 初始化后监听真实地图容器。
   * 面板拖拽结束时 Hook 也会触发最终 resize。
   */
  chartResizeObserver =
    new ResizeObserver(() => {
      scheduleChartResize(110)
    })

  chartResizeObserver.observe(el)

  el.addEventListener(
    'wheel',
    onChartWheelCapture,
    {
      capture: true,
      passive: false,
    }
  )

  /*
   * 初始化时记录当前尺寸并做最终校准。
   */
  lastChartWidth = 0
  lastChartHeight = 0
  scheduleChartResize(0)

  // 监听地图底层点击（silent 模式下用 getZr 捕获像素坐标）
  chart.getZr().on('click', onMapClick)

  loadState.value = 'ready'
  resetMapView()
  if (isQuiz.value) beginClock()
  clockTimer = setInterval(tickClock, 250)
}

onUnmounted(() => {
  cancelAnswerDrag()
  disposed = true
  mapAbortController.abort()
  if (clockTimer) clearInterval(clockTimer)
  window.visualViewport?.removeEventListener(
    'resize',
    scheduleViewportControlsPosition
  )
  window.visualViewport?.removeEventListener(
    'scroll',
    scheduleViewportControlsPosition
  )
  window.removeEventListener(
    'resize',
    scheduleViewportControlsPosition
  )
  window.removeEventListener(
    'scroll',
    scheduleViewportControlsPosition,
    true
  )
  cancelAnimationFrame(viewportControlsFrame)
  viewportControlsFrame = 0

  chartResizeObserver?.disconnect()
  chartResizeObserver = null

  if (chartResizeTimer) {
    clearTimeout(
      chartResizeTimer
    )

    chartResizeTimer = null
  }

  if (chartResizeFrame) {
    cancelAnimationFrame(
      chartResizeFrame
    )

    chartResizeFrame = 0
  }

  if (chartResizeSettleFrame) {
    cancelAnimationFrame(
      chartResizeSettleFrame
    )

    chartResizeSettleFrame = 0
  }

  const el = chartRef.value
  if (el) {
    el.removeEventListener(
      'wheel',
      onChartWheelCapture,
      true
    )
  }
  chart?.dispose()
})
</script>

<style scoped>

.china-map-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.china-map-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.map-zone {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.china-map-chart {
  width: 100%;
  height: 100%;
}

/*
 * 右栏折叠后的可视区级入口。
 * 使用 fixed + Teleport 脱离页面自身的 overflow / transform 裁切。
 */
.viewport-panel-entry {
  position: absolute;
  z-index: 900;
  display: grid;
  width: 44px;
  height: 60px;
  place-items: center;
  padding: 0;
  color: #ffffff;
  font: inherit;
  font-size: clamp(26px, 2.2vw, 32px);
  cursor: pointer;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  border: 0;
  border-radius: 9px 0 0 9px;
  box-shadow: 0 0 16px rgba(46, 196, 182, 0.2);
  transform-origin: top left;
}

.viewport-panel-entry:hover {
  filter: brightness(1.08);
}

.viewport-panel-entry:focus-visible {
  outline: 3px solid rgba(255, 255, 255, 0.9);
  outline-offset: 2px;
}

.viewport-panel-entry span[aria-hidden='true'] {
  line-height: 1;
}

.map-zoom-controls {
  position: absolute;
  z-index: 900;
  display: flex;
  box-sizing: border-box;
  width: 112px;
  height: 58px;
  gap: 10px;
  padding: 6px;
  background: rgba(8, 18, 34, 0.82);
  border: 1px solid rgba(116, 234, 229, 0.24);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  transform-origin: top left;
}

.map-zoom-btn {
  display: grid;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(135deg, #2ec4b6, #247cff);
  border: 0;
  border-radius: 11px;
  box-shadow: 0 0 14px rgba(46, 196, 182, 0.18);
}

.map-zoom-btn:hover {
  filter: brightness(1.1);
}

.map-zoom-btn:active {
  transform: scale(0.94);
}

.map-zoom-btn:focus-visible {
  outline: 3px solid rgba(255, 255, 255, 0.9);
  outline-offset: 2px;
}

.map-zoom-btn svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}


.lesson-panel .geo-card { margin-bottom: 14px; padding: 16px; }
.lesson-panel h2, .lesson-panel h3, .lesson-panel p { margin-top: 0; }
.lesson-panel p { color: var(--text-secondary); line-height: 1.7; font-size: 13px; margin-bottom: 8px; }
.lesson-panel h3 { font-size: 14px; margin-bottom: 8px; }
.lesson-panel button, .lesson-panel select { font: inherit; }
.mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.mode-btn { padding: 11px 4px; min-height: 44px; color: #b8ccda; background: #102c40; border: 1px solid #355367; border-radius: 8px; cursor: pointer; font-size: 13px !important; }
.mode-btn.active { color: #91fff2; border-color: #2ec4b6; background: #154442; }
.settings-card label { display: flex; flex-direction: column; gap: 7px; font-size: 12px; color: #b8ccda; margin-bottom: 12px; }
.settings-card select { width: 100%; min-height: 40px; padding: 8px; border-radius: 7px; border: 1px solid #38586a; background: #102638; color: #eaf8ff; font-size: 13px; }
.lesson-panel .small-note { font-size: 11px; margin: 0; color: #90aabd; }
.eyebrow { display: block; color: #74eae5; font-size: 11px; letter-spacing: 2px; margin-bottom: 10px; }
.knowledge-card, .question-card { background: linear-gradient(140deg, rgba(46, 196, 182, .12), rgba(36, 124, 255, .06)); border-color: rgba(116, 234, 229, .38); }
.knowledge-card h2 { font-size: 23px; line-height: 1.4; margin-bottom: 14px; }
.capital-answer { display: flex; align-items: center; gap: 16px; padding: 15px 0; border-top: 1px solid #2a4c60; border-bottom: 1px solid #2a4c60; }
.capital-answer strong { color: #7de9e0; font-size: 32px; line-height: 1.3; }
.capital-answer span { color: #b8ccda; font-size: 13px; white-space: nowrap; }
.knowledge-card .region-kind { color: #d6beff; font-size: 26px; font-weight: 700; margin: 12px 0; }
.province-list-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.province-list-head span { flex-shrink: 0; color: #90aabd; font-size: 11px; }
.province-name-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.region-card { display: flex; align-items: center; gap: 7px; min-height: 62px; padding: 9px; text-align: left; color: #d9ebf4; border: 1px solid #2a485c; border-radius: 9px; background: #102638; cursor: pointer; }
.region-card.active { background: #174544; border-color: #2ec4b6; }
.region-card b { display: block; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.region-card small { display: block; color: #91b4c5; font-size: 11px; margin-top: 3px; }
.short-badge { color: #74eae5; background: #1b3d4e; font-size: 13px; border-radius: 5px; min-width: 24px; padding: 5px 0; text-align: center; flex-shrink: 0; }
.map-caption { position: absolute; top: 18px; left: 22px; right: 22px; pointer-events: none; z-index: 5; }
.map-caption .eyebrow { margin-bottom: 8px; }
.map-caption strong { display: block; color: #eaf8ff; font-size: clamp(16px, 1.6vw, 23px); text-shadow: 0 2px 8px #06111f; }
.map-caption > span:last-child { display: block; margin-top: 9px; color: #9cb7c9; font-size: 12px; }
.map-caption > span:not(.eyebrow) { display: block; margin-top: 9px; color: #9cb7c9; font-size: 12px; }
.back-to-national { display: inline-block; margin-top: 14px; pointer-events: auto; }
.map-legend { position: absolute; bottom: 18px; left: 22px; display: flex; flex-wrap: wrap; gap: 14px; padding: 9px 12px; background: rgba(6, 20, 34, .85); border: 1px solid #28495b; border-radius: 8px; pointer-events: none; }
.map-legend span { display: flex; align-items: center; gap: 6px; color: #b8ccda; font-size: 12px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.capital-dot { background: #67d8ff; }
.seat-dot { background: #f8ca72; }
.solved-dot { background: #55e6a5; }
.special-dot { background: #c4a6ff; }
.map-loading { position: absolute; inset: 0; background: rgba(6, 20, 34, .95); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: #eaf8ff; z-index: 10; }
.map-loading strong { font-size: 22px; }
.map-loading p { color: #9cb7c9; font-size: 14px; }
.question-meta { display: flex; justify-content: space-between; gap: 8px; color: #74eae5; font-size: 12px; }
.question-card h2 { font-size: clamp(21px, 1.7vw, 27px); line-height: 1.5; margin: 18px 0 12px; }
.question-card .question-help { font-size: 12px; color: #9cb7c9; }
.hint-box { background: rgba(251, 191, 36, .09); color: #f9d77c; border-left: 3px solid #fbbf24; padding: 10px; line-height: 1.65; font-size: 13px; margin: 12px 0; }
.feedback { min-height: 52px; display: flex; align-items: center; padding: 12px; margin: 14px 0; border: 1px solid #305267; border-radius: 8px; color: #a9c5d5; line-height: 1.6; font-size: 13px; box-sizing: border-box; }
.feedback.success { color: #8ef0bc; border-color: #318966; background: rgba(53, 189, 126, .1); }
.feedback.error { color: #ffc0b5; border-color: #995d59; background: rgba(223, 119, 103, .1); }
.question-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.action { min-height: 42px; flex: 1; padding: 9px 12px; background: #173347; color: #d7eaf5; border: 1px solid #406278; border-radius: 8px; font: inherit; font-size: 13px !important; cursor: pointer; }
.action.primary { background: #2ec4b6; border-color: #2ec4b6; color: #05252a; font-weight: 700; }
.action:disabled { cursor: default; opacity: .45; }
.lesson-panel button:hover:not(:disabled) { filter: brightness(1.15); }
button:focus-visible, select:focus-visible, .china-map-chart:focus-visible { outline: 2px solid #ffffff; outline-offset: -3px; }
.progress-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
.progress-head strong { display: block; font-size: 14px; }
.progress-head span { display: block; margin-top: 5px; color: #9cb7c9; font-size: 12px; }
.timer { font-size: 25px; font-weight: 700; color: #74eae5; font-variant-numeric: tabular-nums; }
.timer small { display: block; margin-bottom: 3px; color: #9cb7c9; font-size: 11px; font-weight: 400; }
.timer.warn { color: #ffb4a6; }
.progress-bar-wrap { height: 6px; background: #203c4e; border-radius: 6px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #2ec4b6, #39a7ff); transition: width .25s; }
.score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; text-align: center; margin-top: 17px; }
.score-grid strong { display: block; font-size: 21px; color: #eaf8ff; }
.score-grid span { display: block; font-size: 10px; color: #9cb7c9; margin-top: 5px; }
.result-card h2 { font-size: 21px; line-height: 1.5; }
.result-list { margin-top: 18px; }
.result-list > div { display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-top: 1px solid #28495b; font-size: 12px; line-height: 1.5; }
.result-list > div > span:last-child { color: #f8ca72; flex-shrink: 0; font-size: 11px; }
.result-list .result-good { color: #8ef0bc !important; }
.challenge-dialog { position: fixed; inset: 0; margin: auto; box-sizing: border-box; width: min(92vw, 480px); max-height: 90vh; overflow-y: auto; padding: 32px; color: #eaf8ff; border: 1px solid #2ec4b6; border-radius: 20px; background: radial-gradient(ellipse at top, #174a4c, transparent 70%), #081c2b; box-shadow: 0 24px 80px #0009; }
.answer-mode-card { padding: 14px; }
.lesson-panel .answer-mode-card .small-note { margin-top: 12px; line-height: 1.6; }
.drag-question { width: 100%; padding: 14px 10px; margin-bottom: 12px; border: 1px dashed #49d6c8; border-radius: 10px; background: #153d49; color: #dcfffa; font: inherit; font-weight: 700; cursor: grab; touch-action: none; user-select: none; }
.drag-question small { display: block; margin-top: 8px; font-weight: 400; font-size: 12px; line-height: 1.6; }
.drag-question.dragging { opacity: .5; cursor: grabbing; }
.drag-question:disabled { cursor: default; opacity: .5; }
.drag-question:focus-visible { outline: 2px solid #9bf5df; outline-offset: 3px; }
.drag-preview { position: fixed; transform: translate(-50%, calc(-100% - 14px)); z-index: 2000; pointer-events: none; max-width: 80vw; padding: 12px 18px; border: 1px solid #7af4dc; border-radius: 10px; color: #e7fffa; background: #154753; box-shadow: 0 8px 28px #0006; font-weight: 700; }
.challenge-dialog::backdrop { background: rgba(1, 9, 18, .76); backdrop-filter: blur(4px); }
.challenge-dialog h2 { margin: 12px 0; font-size: 28px; color: #8ef0bc; line-height: 1.4; }
.challenge-dialog p { color: #b8ccda; font-size: 14px; line-height: 1.8; margin: 12px 0 22px; }
.challenge-timeout { border-color: #e6b665; background: radial-gradient(ellipse at top, #443c29, transparent 70%), #081c2b; }
.challenge-timeout h2 { color: #f8d391; }
.challenge-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 18px 0; margin-bottom: 22px; border-block: 1px solid #ffffff20; text-align: center; }
.challenge-stats strong { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
.challenge-stats span { display: block; margin-top: 6px; font-size: 12px; color: #9cb7c9; }
.dialog-review { display: block; width: 100%; min-height: 44px; margin-top: 12px; background: transparent; border: 0; color: #9ddedb; font: inherit; font-size: 13px; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; }
.map-note-card h3 { color: #74eae5; }
.map-note-card p:last-child { margin-bottom: 0; }
.map-zoom-btn { font-size: 26px; }
:deep(canvas) { display: block; }
@media (max-width: 900px) {
  .lesson-panel .geo-card { padding: 12px; }
  .province-name-grid { grid-template-columns: 1fr; }
  .map-caption { left: 14px; top: 14px; right: 14px; }
  .map-caption > span:last-child { font-size: 10px; }
  .map-legend { left: 12px; gap: 10px; }
  .panel-heading .panel-badge { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .progress-bar-fill { transition: none; }
}
</style>
