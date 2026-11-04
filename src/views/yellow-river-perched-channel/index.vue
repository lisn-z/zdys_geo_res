<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, Box, ChevronRight, CircleHelp, Droplets, ExternalLink, Eye, Info, Layers, Map, Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, Waves, X } from 'lucide'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import LessonIcon from './LessonIcon.vue'
import { BRAND_LOGO, FEATURES, FIXED_LEVEE_FEATURES, FIXED_LEVEE_INTRO, FIXED_LEVEE_MODEL_NOTE, FIXED_LEVEE_QUESTION, FIXED_LEVEE_STAGES, MODEL_NOTE, SOURCES, STAGES } from './lesson'
import { createRiverScene, type ProjectedLabel, type RiverSceneController, type ViewMode } from './river-scene'
import type { LeveeScenario } from './river-bed-profile'

const page = ref<HTMLElement>()
const sceneHost = ref<HTMLElement>()
const lessonRail = ref<HTMLElement>()
const railHeading = ref<HTMLElement>()
const dock = ref<HTMLElement>()
const sourcesDialog = ref<HTMLDialogElement>()
const sourcesTrigger = ref<HTMLButtonElement>()
const loading = ref(true)
const error = ref('')
const logoFailed = ref(false)
const progress = ref(1)
const playing = ref(false)
const view = ref<ViewMode>('perspective')
const scenario = ref<LeveeScenario>('raised')
const guidesVisible = ref(true)
const waterVisible = ref(true)
const sedimentVisible = ref(true)
const projected = ref<ProjectedLabel[]>([])
const selected = ref<string | null>(null)
const panelCollapsed = ref(true)
const fullscreen = ref(false)
const pageFullscreen = ref(false)
const sourcesOpen = ref(false)
const sourcesFallback = ref(false)
const answer = ref<'correct' | 'incorrect' | null>(null)
const notice = ref('')
const dockHeight = ref(136)
function getPanelPlacement() {
  if (typeof window === 'undefined') return { key: 'desktop', top: 182 }
  if (window.innerWidth >= 601 && window.innerHeight <= 550) return window.innerWidth <= 1020
    ? { key: 'landscape-compact', top: 174 }
    : { key: 'landscape-wide', top: 128 }
  if (window.innerWidth <= 600) return { key: 'phone', top: 240 }
  if (window.innerWidth < 900) return { key: 'tablet', top: 202 }
  return { key: 'desktop', top: 182 }
}
const panelPlacement = ref(getPanelPlacement())
const scenarios: { id: LeveeScenario; title: string }[] = [
  { id: 'raised', title: '加高堤防' },
  { id: 'fixed', title: '不加高堤防' },
]
const views = [
  { id: 'perspective' as const, title: '三维', icon: Box },
  { id: 'section' as const, title: '正面剖面', icon: Layers },
  { id: 'overhead' as const, title: '俯视', icon: Map },
]
const unavailable = computed(() => loading.value || Boolean(error.value))
const stages = computed(() => scenario.value === 'fixed' ? FIXED_LEVEE_STAGES : STAGES)
const features = computed(() => scenario.value === 'fixed' ? FIXED_LEVEE_FEATURES : FEATURES)
const modelNote = computed(() => scenario.value === 'fixed' ? FIXED_LEVEE_MODEL_NOTE : MODEL_NOTE)
const processTitle = computed(() => scenario.value === 'fixed' ? '不加高堤防对比' : '形成过程')
const question = computed(() => scenario.value === 'fixed' ? FIXED_LEVEE_QUESTION : {
  question: '地上河的河床高于哪里？',
  correct: '两岸地面',
  incorrect: '堤顶',
  correctFeedback: '答对了！判断依据是河床高于两岸地面，不能只看河水水位。',
  incorrectFeedback: '再看看两岸地面。地上河指河床高于两岸地面，判断时不以堤顶为参照。',
})
const activeFeature = computed(() => features.value.find(feature => feature.id === selected.value))
const activeStage = computed(() => [...stages.value].reverse().find(stage => progress.value >= stage.progress - .0001) ?? stages.value[0]!)
const visibleLabels = computed(() => guidesVisible.value ? projected.value.filter(label => label.visible &&
  (label.id !== 'water' || waterVisible.value) && (label.id !== 'sediment' || sedimentVisible.value))
  .map(label => ({ ...label, feature: features.value.find(feature => feature.id === label.id) })).filter(label => label.feature) : [])
const progressPercent = computed(() => Math.round(progress.value * 100))
const sceneDescription = computed(() => {
  const subject = scenario.value === 'fixed' ? '不加高堤防对比' : '黄河地上河'
  return view.value === 'perspective'
    ? `${subject}三维视图，可拖动旋转、双指或滚轮缩放，点击标注查看结构`
    : `${subject}${view.value === 'section' ? '正面剖面' : '俯视'}视图，可拖动平移、双指或滚轮缩放，点击标注查看结构`
})

let scene: RiverSceneController | undefined
let disposed = false
let revision = 0
let animationFrame = 0
let previousFrame = 0
let dockObserver: ResizeObserver | undefined
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let fullscreenPending = false
const PLAYBACK_DURATION = 32_000

function stopPlayback() {
  playing.value = false
  scene?.setPlaying(false)
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  previousFrame = 0
}
function syncProgress(value: number) {
  if (!Number.isFinite(value)) return
  progress.value = Math.min(1, Math.max(0, value))
}
function applyProgress(value: number) {
  syncProgress(value)
  scene?.setProgress(progress.value)
}
function advancePlayback(timestamp: number) {
  animationFrame = 0
  if (!playing.value || disposed || document.hidden) { previousFrame = 0; return }
  if (!previousFrame) previousFrame = timestamp
  const elapsed = timestamp - previousFrame
  // Updating the Vue controls and model at 30 fps is sufficient for this slow process.
  if (elapsed >= 1000 / 30) {
    previousFrame = timestamp
    applyProgress(progress.value + elapsed / PLAYBACK_DURATION)
    if (progress.value >= 1) { stopPlayback(); return }
  }
  animationFrame = requestAnimationFrame(advancePlayback)
}
function togglePlayback() {
  if (unavailable.value) return
  if (playing.value) { stopPlayback(); return }
  if (progress.value >= 1) applyProgress(0)
  playing.value = true
  scene?.setPlaying(true)
  previousFrame = 0
  animationFrame = requestAnimationFrame(advancePlayback)
}
function handleVisibility() {
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  previousFrame = 0
  if (!document.hidden && playing.value) animationFrame = requestAnimationFrame(advancePlayback)
}
function seek(event: Event) {
  stopPlayback()
  applyProgress(Number((event.target as HTMLInputElement).value) / 1000)
}
function goToStage(value: number) { stopPlayback(); applyProgress(value) }
function changeView(value: ViewMode) { view.value = value; scene?.setView(value) }
function changeScenario(value: LeveeScenario) {
  if (unavailable.value || value === scenario.value) return
  stopPlayback()
  scenario.value = value
  selected.value = null
  answer.value = null
  panelCollapsed.value = true
  waterVisible.value = true
  sedimentVisible.value = true
  scene?.setWaterVisible(true)
  scene?.setSedimentVisible(true)
  scene?.setScenario(value)
  applyProgress(0)
  void nextTick(() => { if (!disposed) lessonRail.value?.scrollTo({ top: 0 }) })
}
function toggleGuides() { guidesVisible.value = !guidesVisible.value; scene?.setGuidesVisible(guidesVisible.value) }
function toggleWater() { waterVisible.value = !waterVisible.value; scene?.setWaterVisible(waterVisible.value) }
function toggleSediment() { sedimentVisible.value = !sedimentVisible.value; scene?.setSedimentVisible(sedimentVisible.value) }
function selectFeature(id: string) {
  if (unavailable.value || !features.value.some(feature => feature.id === id)) return
  stopPlayback()
  selected.value = id
  panelCollapsed.value = false
  scene?.focusFeature(id)
  focusRailHeading()
}
function showOverview() {
  selected.value = null
  focusRailHeading()
}
function focusRailHeading() {
  void nextTick(() => {
    if (disposed || panelCollapsed.value) return
    lessonRail.value?.scrollTo({ top: 0 })
    railHeading.value?.focus({ preventScroll: true })
  })
}
function collapsePanel() {
  const card = lessonRail.value?.closest('.floating-feature-card')
  const restoreFocus = card?.contains(document.activeElement)
  panelCollapsed.value = true
  if (restoreFocus) void nextTick(() => {
    if (!disposed) card?.querySelector<HTMLButtonElement>('.collapse-btn')?.focus({ preventScroll: true })
  })
}
function updatePanelPlacement() {
  const nextPlacement = getPanelPlacement()
  if (nextPlacement.key === panelPlacement.value.key) return
  const restoreFocus = lessonRail.value?.closest('.floating-feature-card')?.contains(document.activeElement)
  panelPlacement.value = nextPlacement
  if (restoreFocus) void nextTick(() => {
    if (disposed || sourcesOpen.value) return
    if (!panelCollapsed.value) railHeading.value?.focus({ preventScroll: true })
    else lessonRail.value?.closest('.floating-feature-card')?.querySelector<HTMLButtonElement>('.collapse-btn')?.focus({ preventScroll: true })
  })
}
function resetScene() {
  stopPlayback()
  selected.value = null
  panelCollapsed.value = true
  view.value = 'perspective'
  guidesVisible.value = true
  waterVisible.value = true
  sedimentVisible.value = true
  answer.value = null
  scene?.setGuidesVisible(true)
  scene?.setWaterVisible(true)
  scene?.setSedimentVisible(true)
  void nextTick(() => { if (!disposed) lessonRail.value?.scrollTo({ top: 0 }) })
  // The scene owns the camera and progress transition; onProgress synchronizes the controls.
  scene?.reset()
}
async function initialize() {
  const currentRevision = ++revision
  stopPlayback()
  loading.value = true
  error.value = ''
  projected.value = []
  scene?.dispose()
  scene = undefined
  await nextTick()
  if (disposed || currentRevision !== revision || !sceneHost.value) return
  sceneHost.value.replaceChildren()
  const isCurrent = () => !disposed && currentRevision === revision
  const initialProgress = progress.value
  try {
    scene = createRiverScene(sceneHost.value, {
      onLabels: labels => { if (isCurrent()) projected.value = labels },
      onProgress: (value: number) => { if (isCurrent()) syncProgress(value) },
      onSelect: id => { if (isCurrent()) selectFeature(id) },
      onReady: () => { if (isCurrent()) loading.value = false },
      onError: message => {
        if (!isCurrent()) return
        stopPlayback()
        loading.value = false
        error.value = message || '三维场景暂时无法加载，请重试。'
      },
    })
    scene.setScenario(scenario.value)
    syncProgress(initialProgress)
    scene.setProgress(initialProgress)
    scene.setPlaying(playing.value)
    scene.setView(view.value)
    scene.setGuidesVisible(guidesVisible.value)
    scene.setWaterVisible(waterVisible.value)
    scene.setSedimentVisible(sedimentVisible.value)
  } catch (cause) {
    if (!isCurrent()) return
    loading.value = false
    error.value = '三维场景暂时无法加载。请检查浏览器是否支持 WebGL，然后重试。'
    console.warn('[yellow-river-aboveground] Scene initialization failed', cause)
  }
}
function showNotice(message: string) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = '' }, 4500)
}
async function toggleFullscreen() {
  if (fullscreenPending) return
  fullscreenPending = true
  let fullscreenTimer: ReturnType<typeof setTimeout> | undefined
  try {
    if (pageFullscreen.value) { pageFullscreen.value = false; return }
    if (document.fullscreenElement) { await document.exitFullscreen(); return }
    if (!page.value?.requestFullscreen) throw new Error('Fullscreen API unavailable')
    await Promise.race([
      page.value.requestFullscreen(),
      new Promise<never>((_, reject) => {
        fullscreenTimer = setTimeout(() => reject(new Error('Fullscreen request timed out')), 1500)
      }),
    ])
  } catch {
    if (disposed) return
    pageFullscreen.value = !document.fullscreenElement
    if (pageFullscreen.value) showNotice('已切换为页内全屏，按 Esc 或再次点击全屏按钮退出。')
  } finally {
    clearTimeout(fullscreenTimer)
    fullscreenPending = false
    if (!disposed) {
      updateFullscreen()
      window.dispatchEvent(new Event('resize'))
    }
  }
}
function updateFullscreen() {
  fullscreen.value = Boolean(document.fullscreenElement)
  if (fullscreen.value) pageFullscreen.value = false
}
function handleSourcesClosed() {
  const restoreFocus = sourcesOpen.value
  sourcesOpen.value = false
  sourcesFallback.value = false
  if (restoreFocus) void nextTick(() => {
    if (!disposed) sourcesTrigger.value?.focus({ preventScroll: true })
  })
}
function closeSources() {
  if (sourcesDialog.value?.open && typeof sourcesDialog.value.close === 'function') sourcesDialog.value.close()
  sourcesDialog.value?.removeAttribute('open')
  handleSourcesClosed()
}
function openSources() {
  const dialog = sourcesDialog.value
  if (!dialog || sourcesOpen.value || disposed) return
  stopPlayback()
  sourcesOpen.value = true
  try {
    if (typeof dialog.showModal !== 'function') throw new Error('Dialog API unavailable')
    dialog.showModal()
  } catch {
    sourcesFallback.value = true
    dialog.setAttribute('open', '')
  }
  void nextTick(() => {
    if (disposed || !sourcesOpen.value) return
    dialog.scrollTop = 0
    dialog.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  })
}
function handleKey(event: KeyboardEvent) {
  if (sourcesOpen.value) {
    if (event.key === 'Escape') { event.preventDefault(); closeSources(); return }
    if (event.key === 'Tab') {
      const elements = Array.from(sourcesDialog.value?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!sourcesDialog.value?.contains(document.activeElement)) { event.preventDefault(); first?.focus({ preventScroll: true }) }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll: true }) }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll: true }) }
    }
    return
  }
  if (event.key === 'Escape') {
    if (pageFullscreen.value) { pageFullscreen.value = false; window.dispatchEvent(new Event('resize')) }
    else if (!document.fullscreenElement) collapsePanel()
  }
}
onMounted(() => {
  void initialize()
  document.addEventListener('visibilitychange', handleVisibility)
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('keydown', handleKey)
  window.addEventListener('resize', updatePanelPlacement)
  if (dock.value) {
    dockHeight.value = dock.value.getBoundingClientRect().height
    dockObserver = new ResizeObserver(entries => {
      const height = entries[0]?.target.getBoundingClientRect().height
      if (height) dockHeight.value = height
    })
    dockObserver.observe(dock.value)
  }
})
onBeforeUnmount(() => {
  disposed = true
  revision += 1
  stopPlayback()
  scene?.dispose()
  scene = undefined
  dockObserver?.disconnect()
  clearTimeout(noticeTimer)
  document.removeEventListener('visibilitychange', handleVisibility)
  document.removeEventListener('fullscreenchange', updateFullscreen)
  document.removeEventListener('keydown', handleKey)
  window.removeEventListener('resize', updatePanelPlacement)
})
</script>

<template>
  <main ref="page" class="river-page" :class="{ 'page-fullscreen': pageFullscreen }"
    :style="{ '--dock-height': `${dockHeight}px` }" @contextmenu.prevent @selectstart.prevent @dragstart.prevent>
    <header class="lesson-header" :inert="sourcesOpen">
      <div class="brand" aria-label="智地有申" style="cursor: default">
        <img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" draggable="false" @error="logoFailed = true" />
        <span v-else class="brand-fallback">智地有申</span>
      </div>
      <div class="lesson-heading">
        <p class="eyebrow">地理 · 互动课堂</p>
        <h1>黄河地上河</h1>
      </div>
      <div class="header-actions">
        <button ref="sourcesTrigger" class="icon-button data-info-button" type="button" aria-label="资料来源与模型说明"
          title="资料来源与模型说明" aria-haspopup="dialog" aria-controls="river-sources-dialog" :aria-expanded="sourcesOpen"
          @click="openSources">
          <LessonIcon :icon="Info" :size="20" />
        </button>
        <button class="icon-button fullscreen-button" type="button"
          :aria-label="fullscreen || pageFullscreen ? '退出全屏' : '全屏展示'"
          :title="fullscreen || pageFullscreen ? '退出全屏' : '全屏展示'" @click="toggleFullscreen">
          <LessonIcon :icon="fullscreen || pageFullscreen ? Minimize : Maximize" :size="21" />
        </button>
      </div>
    </header>

    <section class="model-stage" :aria-label="scenario === 'fixed' ? '不加高堤防的水位与漫溢原理示意' : '黄河下游地上河三维示意'"
      :inert="sourcesOpen">
      <div class="stage-toolbar">
        <div class="view-switch" role="group" aria-label="观察方式">
          <button v-for="option in views" :key="option.id" type="button" :class="{ active: view === option.id }"
            :aria-pressed="view === option.id" :disabled="unavailable" @click="changeView(option.id)">
            <LessonIcon :icon="option.icon" :size="18" />{{ option.title }}
          </button>
        </div>
        <span class="toolbar-divider" aria-hidden="true" />
        <div class="camera-tools" role="group" aria-label="场景显示工具">
          <button class="control-button" type="button" :disabled="unavailable" title="平滑恢复当前情景的三维视角与演示终态，并重置课堂选项"
            @click="resetScene">
            <LessonIcon :icon="RotateCcw" :size="17" />复位
          </button>
          <button class="control-button" type="button" :class="{ active: guidesVisible }" :aria-pressed="guidesVisible"
            :disabled="unavailable" @click="toggleGuides">
            <LessonIcon :icon="Eye" :size="17" />标注
          </button>
          <button class="control-button" type="button" :class="{ active: waterVisible }" :aria-pressed="waterVisible"
            :disabled="unavailable" @click="toggleWater">
            <LessonIcon :icon="Droplets" :size="17" />水体
          </button>
          <button class="control-button" type="button" :class="{ active: sedimentVisible }"
            :aria-pressed="sedimentVisible" :disabled="unavailable" title="显示或隐藏泥沙运动与沙层强调，保留实体河床"
            aria-label="显示泥沙运动与沙层强调" @click="toggleSediment">
            <LessonIcon :icon="Layers" :size="17" />泥沙
          </button>
        </div>
        <div class="scenario-switch" role="group" aria-label="堤防对比情景">
          <button v-for="option in scenarios" :key="option.id" type="button" :class="{ active: scenario === option.id }"
            :aria-pressed="scenario === option.id" :disabled="unavailable" @click="changeScenario(option.id)">{{
              option.title }}</button>
        </div>
      </div>
      <div class="scene-frame">
        <div ref="sceneHost" class="scene-host" role="group" :aria-busy="loading" :aria-label="sceneDescription" />
        <div v-if="!unavailable" class="hotspot-layer" aria-label="河道结构标注">
          <svg class="leader-lines" aria-hidden="true">
            <g v-for="label in visibleLabels" :key="label.id" :class="{ selected: selected === label.id }">
              <line :x1="label.anchorX" :y1="label.anchorY" :x2="label.x" :y2="label.y" />
              <circle :cx="label.anchorX" :cy="label.anchorY" r="3" />
            </g>
          </svg>
          <button v-for="label in visibleLabels" :key="label.id" class="hotspot" type="button"
            :class="{ selected: selected === label.id }" :style="{ left: `${label.x}px`, top: `${label.y}px` }"
            :aria-label="`查看${label.feature?.title}的讲解`" :aria-pressed="selected === label.id"
            @click="selectFeature(label.id)"><span class="hotspot-dot" aria-hidden="true" /><span>{{
              label.feature?.title }}</span></button>
        </div>
        <div v-if="!unavailable" class="scene-caption"><span>{{ scenario === 'fixed' ? '不加高堤防 · 对比' : '黄河下游 · 地上河'
            }}</span><span>{{ scenario === 'fixed' ? '原理示意，不预测水位或范围' : '垂直方向夸大' }}</span></div>
        <div v-if="!unavailable" class="scene-navigation">
          <div class="zoom-tools" role="group" aria-label="场景缩放"><button type="button" class="icon-button"
              aria-label="缩小场景" title="缩小" @click="scene?.zoom(-1)">
              <LessonIcon :icon="Minus" :size="19" />
            </button><button type="button" class="icon-button" aria-label="放大场景" title="放大" @click="scene?.zoom(1)">
              <LessonIcon :icon="Plus" :size="19" />
            </button></div>
        </div>
        <div v-if="loading || error" class="scene-message" :role="error ? 'alert' : 'status'">
          <div class="message-card">
            <LessonIcon :icon="Waves" :size="36" />
            <h2>{{ error ? '场景暂时无法打开' : '正在打开黄河地上河' }}</h2>
            <p>{{ error || '准备河道、泥沙与两岸地形…' }}</p><button v-if="error" type="button" class="primary-button"
              @click="initialize">重新加载</button><progress v-else aria-label="正在加载三维场景" />
          </div>
        </div>
      </div>
    </section>

    <footer ref="dock" class="process-dock" :aria-label="processTitle" :inert="sourcesOpen">
      <div class="process-controls">
        <button type="button" class="play-button" :class="{ playing }" :disabled="unavailable"
          :aria-label="`${playing ? '暂停' : progress >= 1 ? '从头播放' : '播放'}${processTitle}`"
          :title="playing ? '暂停' : progress >= 1 ? '从头播放' : '播放'" :aria-pressed="playing" @click="togglePlayback">
          <LessonIcon :icon="playing ? Pause : Play" :size="21" />
        </button>
        <div class="timeline">
          <div class="timeline-copy"><label for="river-progress">{{ processTitle }}</label><span>{{ progressPercent
              }}%</span></div><input id="river-progress" type="range" min="0" max="1000" step="1"
            :value="Math.round(progress * 1000)" :disabled="unavailable"
            :aria-valuetext="`${activeStage.title}，演示进度${Math.round(progress * 1000) / 10}%`"
            :style="{ '--progress': `${progressPercent}%` }" @pointerdown="stopPlayback" @input="seek" />
        </div>
        <nav class="stage-options" aria-label="选择演示阶段"><button v-for="(stage, index) in stages" :key="stage.id"
            type="button" :class="{ active: activeStage.id === stage.id, complete: progress > stage.progress }"
            :aria-current="activeStage.id === stage.id ? 'step' : undefined"
            :aria-label="`第${index + 1}阶段：${stage.title}`" :title="stage.title" :disabled="unavailable"
            @click="goToStage(stage.progress)"><span class="step-number">{{ index + 1 }}</span><span>{{ stage.short
              }}</span></button></nav>
      </div>
      <div class="stage-explanation">
        <p><strong>{{ activeStage.title }}</strong><span>{{ activeStage.description }}</span></p>
      </div>
    </footer>

    <FloatingFeatureCard :key="panelPlacement.key" v-model:collapsed="panelCollapsed" class="explanation-card"
      :title="scenario === 'fixed' ? '不加高堤防' : '地上河的形成'" variant="control" :initial-top="panelPlacement.top"
      :initial-right="20" :bottom-inset="dockHeight + 10" :min-width="panelPlacement.key === 'phone' ? 240 : 290"
      :min-height="panelPlacement.key === 'phone' ? 120 : 250" :inert="sourcesOpen"
      :draggable="panelPlacement.key !== 'phone'" :resizable="panelPlacement.key !== 'phone'" light>
      <aside ref="lessonRail" class="lesson-rail" :aria-label="scenario === 'fixed' ? '不加高堤防对比讲解' : '地上河结构讲解'">
        <template v-if="activeFeature">
          <button type="button" class="text-button back-button" @click="showOverview">
            <LessonIcon :icon="ArrowLeft" :size="16" />全部结构
          </button>
          <p class="rail-eyebrow">{{ scenario === 'fixed' ? '不加高堤防对比' : '观察地上河' }}</p>
          <h2 ref="railHeading" tabindex="-1">{{ activeFeature.title }}</h2>
          <p class="explanation-copy">{{ activeFeature.description }}</p>
          <div class="observation">
            <LessonIcon :icon="Eye" :size="18" />
            <p>{{ activeFeature.question }}</p>
          </div>
        </template>
        <template v-else>
          <p class="rail-eyebrow">{{ scenario === 'fixed' ? '对比情景 · 堤顶保持不变' : '黄河下游 · 结构与过程' }}</p>
          <h2 ref="railHeading" tabindex="-1">{{ scenario === 'fixed' ? '堤防不加高，会怎样？' : '河床，怎样高过地面？' }}</h2>
          <p class="intro-copy">{{ scenario === 'fixed' ? FIXED_LEVEE_INTRO : '比较河床与两岸地面的高度，观察泥沙淤积时河床的变化。' }}</p>
          <div class="feature-list"><button v-for="feature in features" :key="feature.id" type="button"
              :disabled="unavailable" @click="selectFeature(feature.id)"><span>{{ feature.title }}</span>
              <LessonIcon :icon="ChevronRight" :size="18" />
            </button></div>
          <div class="observation">
            <LessonIcon :icon="Eye" :size="18" />
            <p>{{ activeStage.question }}</p>
          </div>
        </template>
        <section class="thinking-card" aria-labelledby="river-question">
          <div class="thinking-title">
            <LessonIcon :icon="CircleHelp" :size="18" /><span>小思考</span>
          </div>
          <h3 id="river-question">{{ question.question }}</h3>
          <div class="answer-options"><button type="button"
              :class="{ chosen: answer === 'correct', correct: answer === 'correct' }"
              :aria-pressed="answer === 'correct'" @click="answer = 'correct'">{{ question.correct }}</button><button
              type="button" :class="{ chosen: answer === 'incorrect' }" :aria-pressed="answer === 'incorrect'"
              @click="answer = 'incorrect'">{{ question.incorrect }}</button></div>
          <p v-if="answer" class="answer-feedback" :class="{ correct: answer === 'correct' }" role="status">{{ answer
            ===
            'correct' ? question.correctFeedback : question.incorrectFeedback }}</p>
        </section>
        <p class="model-note">{{ modelNote }}</p>
      </aside>
    </FloatingFeatureCard>

    <div v-if="sourcesFallback && sourcesOpen" class="dialog-backdrop" @click="closeSources" />
    <dialog id="river-sources-dialog" ref="sourcesDialog" class="sources-dialog"
      :class="{ 'fallback-dialog': sourcesFallback }" role="dialog" aria-labelledby="sources-title" aria-modal="true"
      @cancel.prevent="closeSources" @close="handleSourcesClosed" @selectstart.stop @contextmenu.stop>
      <header class="dialog-header">
        <div>
          <p class="rail-eyebrow">课程资料</p>
          <h2 id="sources-title">资料来源与模型说明</h2>
        </div><button type="button" class="icon-button" aria-label="关闭资料来源" @click="closeSources">
          <LessonIcon :icon="X" :size="21" />
        </button>
      </header>
      <div class="dialog-body">
        <p class="sources-note">{{ modelNote }}</p>
        <ol class="source-list">
          <li v-for="source in SOURCES" :key="source.title"><a v-if="source.url" :href="source.url" target="_blank"
              rel="noopener noreferrer" :aria-label="`${source.title}（在新窗口打开）`"><span>{{ source.title }}</span>
              <LessonIcon :icon="ExternalLink" :size="16" />
            </a><strong v-else class="local-source-title">{{ source.title }}</strong>
            <p>{{ source.note }}</p>
          </li>
        </ol>
      </div>
    </dialog>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  </main>
</template>

<style scoped src="./classroom.css"></style>
