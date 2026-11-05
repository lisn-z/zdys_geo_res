<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import Icon from './LessonIcon.vue'
import { BRAND_LOGO, LANDSCAPES, DUBAI_ERAS, MODEL_NOTE, SOURCES } from './lesson'
import { createSettlementScene } from './scene'
import { INQUIRIES, DUBAI_DRIVERS, getDubaiDriver, evaluateInquiry, type NaturalLandscape } from './inquiry'
import type { Landscape, StudyMode, Tool, CameraView, SettlementScene, SceneLabel, SceneStats } from './types'

const page = ref<HTMLElement>(), host = ref<HTMLElement>(), sourceDialog = ref<HTMLDialogElement>()
const landscape = ref<Landscape>('plain'), mode = ref<StudyMode>('observe'), tool = ref<Tool>('orbit')
const viewLocked = ref(false)
const view = ref<CameraView>('perspective'), labelsOn = ref(true), constraintsOn = ref(false)
const loading = ref(true), error = ref(''), logoError = ref(false), panelCollapsed = ref(false)
const showExplanation = ref(false), sourceOpen = ref(false), full = ref(false)
const labels = ref<SceneLabel[]>([]), stats = ref<SceneStats>({ houses: 0, roads: 0, spread: '继续布置', nearWater: 0 })
const growth = ref(100), playing = ref(false)
const dubaiEra = ref(2)
const courseMode = ref<'inquire' | 'explore'>('explore'), inquiryStep = ref(0), comparing = ref(false), previewing = ref(false)
const readingEnvironment = computed(() => courseMode.value === 'inquire' && inquiryStep.value <= 1)
const exampleSwitchVisible = computed(() => landscape.value !== 'dubai' && (courseMode.value === 'inquire' || mode.value === 'build' || comparing.value))
const exampleSwitchLabel = computed(() => readingEnvironment.value ? '查看完整案例模型' : '与教材案例的布局比较')
const exampleSwitchOn = computed(() => readingEnvironment.value ? previewing.value : comparing.value)
const stepNames = ['读环境', '作判断', '动手验证', '解释原因']
const predictions = ref<Partial<Record<Landscape, string>>>({})
const evidence = ref<Partial<Record<Landscape, string[]>>>({})
const reasons = ref<Partial<Record<Landscape, string[]>>>({})
const ownStats = ref<Partial<Record<Landscape, SceneStats>>>({})
const placementStats = computed(() => ownStats.value[landscape.value] || { houses: 0, roads: 0, spread: '继续布置', nearWater: 0 })
let toolBeforeCompare: Tool = 'house'
let viewLockedBeforeCompare = true
const driverAnswers = ref<Record<string, string>>({}), pausedDriver = ref<string | null>(null)
const passedDrivers = new Set<string>()
const inquiry = computed(() => landscape.value === 'dubai' ? null : INQUIRIES[landscape.value])
const evaluation = computed(() => landscape.value === 'dubai' ? null : evaluateInquiry({ landscape: landscape.value as NaturalLandscape, prediction: predictions.value[landscape.value] || null, evidenceIds: evidence.value[landscape.value] || [], stats: ownStats.value[landscape.value] || { houses: 0, roads: 0, spread: '继续布置', nearWater: 0 } }))
const driver = computed(() => getDubaiDriver(growth.value / 100))
const chosenDriverAnswer = computed(() => driver.value.choices.find(item => item.id === driverAnswers.value[driver.value.id]))
const visibleLabels = computed(() => labels.value.filter(item => item.visible && !(landscape.value !== 'dubai' && (mode.value === 'build' || courseMode.value === 'inquire' && inquiryStep.value <= 1 && !comparing.value && !previewing.value) && /聚落|房屋|城镇|彩色/.test(item.text))))
const caseCues: Record<Landscape, string> = { plain: '开阔平地', valley: '谷地与山坡', river: '河流与干旱', coast: '山地与海岸', dubai: '教材拓展窗' }
const neutralQuestions: Record<Landscape, string> = { plain: '平坦开阔的土地上，人们会把房屋建在哪里？', valley: '山谷里的房屋怎样选址，又会向哪里扩展？', river: '干旱地区的居民怎样利用河流安排生产与生活？', coast: '在山地与海洋之间，居民怎样安排居住与生产？', dubai: '同样是沙漠环境，聚落为什么发生了巨大变化？' }
const feedback = ref(''), feedbackValid = ref(true), compact = ref(false), panelReset = ref(0)
const dragPalette = ref<{ x: number; y: number; kind: 'house' | 'road' } | null>(null)
const current = computed(() => LANDSCAPES.find(item => item.id === landscape.value)!)
const unavailable = computed(() => loading.value || Boolean(error.value))
const views: { id: CameraView; name: string; icon: string }[] = [
  { id: 'perspective', name: '三维', icon: 'box' }, { id: 'overhead', name: '俯视', icon: 'map' }, { id: 'ground', name: '走近', icon: 'walk' },
]
const tools: { id: Tool; name: string; icon: string }[] = [
  { id: 'house', name: '房屋', icon: 'house' },
  { id: 'road', name: '道路', icon: 'road' }, { id: 'erase', name: '移除', icon: 'erase' },
]
const availableTools = computed(() => landscape.value === 'coast' ? tools.filter(item => item.id !== 'road') : tools)
let progressTween: { from: number; to: number; start: number; duration: number } | null = null
let scene: SettlementScene | undefined, disposed = false, revision = 0, raf = 0, lastTime = 0
let feedbackTimer: ReturnType<typeof setTimeout> | undefined
let paletteStart: { x: number; y: number; kind: 'house' | 'road'; pointer: number } | null = null
function notify(message: string, valid = true) {
  feedback.value = message; feedbackValid.value = valid
  clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { feedback.value = '' }, 4800)
}
function stop() { playing.value = false; cancelAnimationFrame(raf); raf = 0; lastTime = 0; progressTween = null }
function setProgress(value: number) {
  growth.value = Math.max(0, Math.min(100, value))
  if (landscape.value === 'dubai') dubaiEra.value = growth.value < 25 ? -1 : growth.value < 58 ? 0 : growth.value < 80 ? 1 : 2
  scene?.setGrowth(growth.value / 100)
}
function tick(time: number) {
  if (!playing.value || disposed) return
  if (progressTween) {
    if (!progressTween.start) progressTween.start = time
    const t = Math.min(1, (time - progressTween.start) / progressTween.duration)
    setProgress(progressTween.from + (progressTween.to - progressTween.from) * t * t * (3 - 2 * t))
    if (t >= 1) { stop(); return }
  } else if (lastTime && !document.hidden) {
    let next = Math.min(100, growth.value + Math.min(time - lastTime, 70) / (landscape.value === 'dubai' ? 300 : 160))
    if (landscape.value === 'dubai' && courseMode.value === 'inquire') {
      const checkpoint = DUBAI_DRIVERS.find(item => item.threshold > 0 && item.threshold * 100 > growth.value + .0001 && item.threshold * 100 <= next && !passedDrivers.has(item.id))
      if (checkpoint) { next = checkpoint.threshold * 100; setProgress(next); pausedDriver.value = checkpoint.id; passedDrivers.add(checkpoint.id); panelCollapsed.value = false; stop(); return }
    }
    setProgress(next)
  }
  lastTime = time
  if (growth.value >= 100 && !progressTween) stop(); else raf = requestAnimationFrame(tick)
}
function togglePlay() {
  if (playing.value) { stop(); return }
  if (growth.value >= 100) { setProgress(0); passedDrivers.clear() }
  pausedDriver.value = null
  playing.value = true; raf = requestAnimationFrame(tick)
}
function seek(event: Event) {
  stop(); pausedDriver.value = null; setProgress(Number((event.target as HTMLInputElement).value))
  passedDrivers.clear(); for (const item of DUBAI_DRIVERS) if (item.threshold * 100 <= growth.value) passedDrivers.add(item.id)
}
function selectLandscape(id: Landscape) {
  if (id === landscape.value || unavailable.value) return
  stop(); feedback.value = ''; showExplanation.value = false
  mode.value = 'observe'; tool.value = 'orbit'; viewLocked.value = false; scene?.setMode('observe'); scene?.setTool('orbit')
  landscape.value = id; inquiryStep.value = 0; comparing.value = false; previewing.value = false; pausedDriver.value = null; passedDrivers.clear()
  constraintsOn.value = false; scene?.setConstraints(false); scene?.setLandscape(id)
  setProgress(courseMode.value === 'inquire' ? 0 : 100)
}
function selectEra(index: number) {
  stop(); pausedDriver.value = null; passedDrivers.clear()
  if (index > 0 && view.value === 'ground') resetView()
  const target = [25, 58, 100][index] ?? 100
  progressTween = { from: growth.value, to: target, start: 0, duration: 1200 + Math.abs(target - growth.value) * 10 }
  playing.value = true; raf = requestAnimationFrame(tick)
}
function setCourseMode(value: 'inquire' | 'explore') {
  stop(); courseMode.value = value; panelCollapsed.value = false; pausedDriver.value = null
  if (landscape.value === 'dubai') { setProgress(value === 'inquire' ? 0 : 100); passedDrivers.clear(); return }
  if (value === 'inquire') setInquiryStep(0)
  else { setMode('observe'); setProgress(100); comparing.value = false; previewing.value = false }
}
function setInquiryStep(index: number) {
  if (landscape.value === 'dubai') return
  stop(); inquiryStep.value = index; comparing.value = false; previewing.value = false; panelCollapsed.value = false
  if (index === 2 || index === 3) { setMode('build'); selectTool(index === 2 ? 'house' : 'orbit') }
  else { setMode('observe'); setProgress(0) }
  constraintsOn.value = index === 2; scene?.setConstraints(constraintsOn.value)
}
function toggleEvidence(id: string) {
  const list = [...(evidence.value[landscape.value] || [])], at = list.indexOf(id)
  if (at >= 0) list.splice(at, 1); else list.push(id)
  evidence.value[landscape.value] = list
  constraintsOn.value = true; scene?.setConstraints(true); setView(id === 'valley-slopes' || id === 'coast-slope' ? 'perspective' : 'overhead')
}
function toggleReason(id: string) {
  const list = [...(reasons.value[landscape.value] || [])], at = list.indexOf(id)
  if (at >= 0) list.splice(at, 1); else list.push(id)
  reasons.value[landscape.value] = list
}
function compareExample() {
  if (unavailable.value) return
  if (!comparing.value) { toolBeforeCompare = tool.value; viewLockedBeforeCompare = viewLocked.value }
  comparing.value = !comparing.value
  setMode(comparing.value ? 'observe' : 'build'); selectTool(comparing.value ? 'orbit' : toolBeforeCompare)
  if (!comparing.value && !viewLockedBeforeCompare) setViewLocked(false)
  if (comparing.value) setProgress(100)
}
function previewExample() { previewing.value = !previewing.value; setProgress(previewing.value ? 100 : 0) }
function toggleExample() { if (readingEnvironment.value) previewExample(); else compareExample() }
function compareCondition() {
  const target: Record<Landscape, Landscape> = { plain: 'valley', valley: 'plain', river: 'plain', coast: 'river', dubai: 'plain' }
  selectLandscape(target[landscape.value])
}
function setMode(id: StudyMode) {
  if (unavailable.value || id === mode.value || landscape.value === 'dubai' && id === 'build') return
  stop(); feedback.value = ''; clearTimeout(feedbackTimer); mode.value = id; tool.value = id === 'build' ? 'house' : 'orbit'
  viewLocked.value = id === 'build'
  scene?.setMode(id); scene?.setTool(tool.value)
  if (id === 'build') notify(landscape.value === 'coast' ? '选中房屋，再点较平缓的台地放置；也可以把房屋拖进场景。' : '选中房屋或道路，再点地面放置；也可以直接把工具拖进场景。')
}
function setViewLocked(value: boolean) {
  if (unavailable.value || mode.value !== 'build') return
  viewLocked.value = value
  scene?.setTool(value ? tool.value : 'orbit')
}
function selectTool(id: Tool) {
  if (unavailable.value) return
  if (id === 'orbit') { if (mode.value === 'build') setViewLocked(false); else scene?.setTool('orbit'); return }
  tool.value = id; viewLocked.value = true; scene?.setTool(id)
}
function setView(id: CameraView) { view.value = id; scene?.setView(id) }
function focusLivelihood(id: string) { stop(); view.value = 'ground'; scene?.focusLabel(id) }
function toggleLabels() { labelsOn.value = !labelsOn.value; scene?.setLabels(labelsOn.value) }
function toggleConstraints() { constraintsOn.value = !constraintsOn.value; scene?.setConstraints(constraintsOn.value) }
function resetView() { view.value = 'perspective'; scene?.reset() }
function beginPalette(event: PointerEvent, kind: 'house' | 'road') {
  if (unavailable.value || event.button !== 0) return
  paletteStart = { x: event.clientX, y: event.clientY, kind, pointer: event.pointerId }
}
function movePalette(event: PointerEvent) {
  if (!paletteStart || event.pointerId !== paletteStart.pointer) return
  if (Math.hypot(event.clientX - paletteStart.x, event.clientY - paletteStart.y) > 10) {
    dragPalette.value = { x: event.clientX, y: event.clientY, kind: paletteStart.kind }
  }
}
function endPalette(event: PointerEvent) {
  if (!paletteStart || event.pointerId !== paletteStart.pointer) return
  const kind = paletteStart.kind, moved = Boolean(dragPalette.value)
  paletteStart = null; dragPalette.value = null
  selectTool(kind)
  if (moved) scene?.placeAtClient(event.clientX, event.clientY, kind)
}
function cancelPalette() { paletteStart = null; dragPalette.value = null }
function onKey(event: KeyboardEvent) {
  if (sourceOpen.value || mode.value !== 'build') return
  if (event.key === 'Escape') { event.preventDefault(); cancelPalette(); setViewLocked(false); return }
  if ((event.target as HTMLElement)?.closest('input,textarea,button,a,dialog')) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); scene?.undo() }
  if (event.key.toLowerCase() === 'r') scene?.rotatePlacement()
}
function updateCompact() {
  const next = window.innerWidth < 960
  if (next && !compact.value) panelCollapsed.value = true
  compact.value = next
}
function visibilityChange() { lastTime = 0 }
async function openSources() { sourceOpen.value = true; await nextTick(); sourceDialog.value?.showModal() }
function closeSources() { sourceDialog.value?.close(); sourceOpen.value = false }
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (page.value?.requestFullscreen) await page.value.requestFullscreen()
    else full.value = !full.value
  } catch { full.value = !full.value }
}
function syncFullscreen() { full.value = Boolean(document.fullscreenElement) }
async function initialize() {
  const run = ++revision; loading.value = true; error.value = ''; stop(); scene?.dispose(); scene = undefined
  await nextTick()
  if (disposed || run !== revision || !host.value) return
  try {
    const active = () => !disposed && run === revision
    scene = createSettlementScene(host.value, {
      onReady: () => { if (active()) loading.value = false },
      onError: message => { if (active()) { error.value = message; loading.value = false; stop() } },
      onFeedback: (message, valid) => { if (active()) notify(message, valid) },
      onLabels: value => { if (active()) labels.value = value },
      onStats: value => { if (active()) { stats.value = value; if (mode.value === 'build') ownStats.value[landscape.value] = { ...value } } },
    })
    scene.setLandscape(landscape.value); scene.setMode(mode.value); scene.setTool(mode.value === 'build' && viewLocked.value ? tool.value : 'orbit')
    scene.setLabels(labelsOn.value); scene.setConstraints(constraintsOn.value); scene.setGrowth(growth.value / 100)
  } catch { error.value = '三维场景暂时无法加载，请重新加载。'; loading.value = false }
}
onMounted(() => {
  updateCompact(); panelCollapsed.value = compact.value
  window.addEventListener('resize', updateCompact)
  window.addEventListener('pointermove', movePalette); window.addEventListener('pointerup', endPalette); window.addEventListener('pointercancel', cancelPalette)
  window.addEventListener('keydown', onKey); window.addEventListener('blur', cancelPalette)
  document.addEventListener('visibilitychange', visibilityChange); document.addEventListener('fullscreenchange', syncFullscreen)
  void initialize()
})
onBeforeUnmount(() => {
  disposed = true; revision++; stop(); clearTimeout(feedbackTimer); scene?.dispose()
  window.removeEventListener('resize', updateCompact)
  window.removeEventListener('pointermove', movePalette); window.removeEventListener('pointerup', endPalette); window.removeEventListener('pointercancel', cancelPalette)
  window.removeEventListener('keydown', onKey); window.removeEventListener('blur', cancelPalette)
  document.removeEventListener('visibilitychange', visibilityChange); document.removeEventListener('fullscreenchange', syncFullscreen)
})
</script>

<template>
  <main id="settlement-lesson" ref="page" class="settlement-page" :class="{ 'is-fullscreen': full }">
    <header class="st-header">
      <div class="st-brand" aria-label="智地有申"><img v-if="!logoError" :src="BRAND_LOGO" alt="智地有申" draggable="false" @error="logoError = true"><strong v-else>智地有申</strong></div>
      <div class="st-heading"><p>地理 · 互动课堂</p><h1>聚落选址与形态</h1></div>
      <nav class="st-mode-switch" aria-label="学习方式"><button :class="{ active: courseMode === 'inquire' }" :aria-pressed="courseMode === 'inquire'" :disabled="unavailable" @click="setCourseMode('inquire')">探究推导</button><button :class="{ active: courseMode === 'explore' }" :aria-pressed="courseMode === 'explore'" :disabled="unavailable" @click="setCourseMode('explore')">自由观察</button></nav>
      <div class="st-header-actions"><button class="st-icon-btn" title="资料来源与模型说明" aria-label="资料来源与模型说明" @click="openSources"><Icon name="info" /></button><button class="st-icon-btn" :aria-label="full ? '退出全屏' : '全屏显示'" :title="full ? '退出全屏' : '全屏显示'" @click="toggleFullscreen"><Icon name="fullscreen" /></button></div>
    </header>

    <section class="st-stage" :class="{ hasEditTools: mode === 'build' || comparing }" aria-label="聚落与自然环境三维场景">
      <div class="st-toolbar">
        <div class="st-view-switch" role="group" aria-label="观察视角"><button v-for="item in views" :key="item.id" :class="{ active: view === item.id }" :aria-pressed="view === item.id" :disabled="unavailable" @click="setView(item.id)"><Icon :name="item.icon" :size="18" />{{ item.name }}</button></div>
        <span class="st-divider" />
        <button class="st-tool-btn" :disabled="unavailable" @click="resetView"><Icon name="reset" :size="18" />复位</button>
        <button class="st-tool-btn" :class="{ active: labelsOn }" :aria-pressed="labelsOn" :disabled="unavailable" @click="toggleLabels"><Icon name="eye" :size="18" />标注</button>
        <button v-if="landscape !== 'dubai'" class="st-tool-btn" :class="{ active: constraintsOn }" :aria-pressed="constraintsOn" :disabled="unavailable" @click="toggleConstraints"><Icon name="contour" :size="18" />选址条件</button>
        <div v-if="mode === 'build' || comparing" class="st-context-actions"><button class="st-tool-btn st-clear-btn" :disabled="unavailable || comparing || !stats.houses && !stats.roads" @click="scene?.clear()"><Icon name="trash" :size="18" />清空布置</button></div>
      </div>
      <div class="st-world" :class="{ 'is-building': mode === 'build' }">
        <div ref="host" class="st-canvas" />
        <div v-if="labelsOn && !unavailable" class="st-label-layer" aria-hidden="true"><span v-for="label in visibleLabels" :key="label.id" class="st-world-label" :style="{ left: `${label.x}px`, top: `${label.y}px` }"><i />{{ label.text }}</span></div>
        <div v-if="constraintsOn && !unavailable" class="st-legend"><span><i class="available" />较平缓的陆地</span><span><i class="limited" />较陡或边缘地带</span></div>
        <div v-if="!unavailable" class="st-scene-identity"><span>教学示意 · 参考{{ current.figure }}</span><strong>{{ current.title }} · {{ landscape === 'dubai' ? driver.title : caseCues[landscape] }}</strong></div>
        <div v-if="feedback && !unavailable" class="st-feedback" :class="{ invalid: !feedbackValid }" role="status"><Icon :name="feedbackValid ? 'check' : 'info'" :size="18" />{{ feedback }}</div>
        <div class="st-zoom" v-if="!unavailable"><button class="st-icon-btn" aria-label="缩小场景" title="缩小" @click="scene?.zoom(-1)"><Icon name="minus" /></button><button class="st-icon-btn" aria-label="放大场景" title="放大" @click="scene?.zoom(1)"><Icon name="plus" /></button></div>
        <button v-if="mode === 'build' && !unavailable" type="button" role="switch" aria-label="锁定视角" :aria-checked="viewLocked" class="st-compare-switch st-camera-lock" :title="viewLocked ? '视角已锁定，可点击或拖放布置；关闭后拖动旋转场景' : '可拖动旋转场景；打开后锁定视角并继续布置'" @click="setViewLocked(!viewLocked)"><span>锁定视角</span><span class="st-switch-track" aria-hidden="true"><span /></span></button>
        <div v-if="unavailable" class="st-loading" :role="error ? 'alert' : 'status'"><Icon name="contour" :size="36" /><strong>{{ error ? '场景暂时无法打开' : '正在生成山川与聚落' }}</strong><p>{{ error || '准备地形、房屋与道路…' }}</p><button v-if="error" class="st-primary" @click="initialize">重新加载</button><progress v-else aria-label="加载三维场景" /></div>
      </div>
      <FloatingFeatureCard :key="`${compact}-${panelReset}`" v-model:collapsed="panelCollapsed" class="st-lesson-card" :title="courseMode === 'inquire' ? '模型与因果推导' : '观察与探究'" variant="control" :initial-top="compact ? 224 : 158" :initial-right="18" :bottom-inset="compact ? 230 : 188" :min-width="260" :min-height="210" light>
        <template #header-meta><button class="st-icon-btn st-panel-reset" aria-label="复原面板位置与大小" title="复原面板位置与大小" @pointerdown.stop @click="panelReset++"><Icon name="reset" :size="16" /></button></template>
        <div class="st-panel-body">
          <div class="st-kicker">{{ landscape === 'dubai' ? '教材拓展窗 · 阿联酋迪拜' : landscape === 'coast' ? '迁移探究 · 五渔村' : '一起探究 · 聚落形态' }}</div>
          <h2>{{ courseMode === 'inquire' ? neutralQuestions[landscape] : current.question }}</h2>
          <button v-if="exampleSwitchVisible" type="button" role="switch" :aria-label="exampleSwitchLabel" class="st-compare-switch st-panel-example-switch" :aria-checked="exampleSwitchOn" :disabled="unavailable" @click="toggleExample"><span>{{ exampleSwitchLabel }}</span><span class="st-switch-track" aria-hidden="true"><span /></span></button>
          <template v-if="landscape === 'dubai'">
            <section class="st-development-card">
              <div class="st-driver-heading"><span>{{ driver.period }}</span><strong>{{ driver.title }}</strong></div>
              <section v-if="dubaiEra <= 0" class="st-livelihood"><h3>走近早期居民的生活</h3><div><button @click="focusLivelihood('fishing')">渔船与渔网</button><button @click="focusLivelihood('pearling')">采珠船与器具</button><button @click="focusLivelihood('caravan')">运货骆驼队</button></div></section>
              <ol class="st-causal-chain"><li><small>条件变化</small><p>{{ driver.condition }}</p></li><li><small>人的活动</small><p>{{ driver.activity }}</p></li><li><small>空间结果</small><p>{{ driver.spatialChange }}</p></li></ol>
              <h3>{{ driver.question }}</h3>
              <div class="st-answers"><button v-for="answer in driver.choices" :key="answer.id" :class="{ chosen: driverAnswers[driver.id] === answer.id }" :aria-pressed="driverAnswers[driver.id] === answer.id" @click="driverAnswers[driver.id] = answer.id">{{ answer.label }}</button></div>
              <p v-if="chosenDriverAnswer" class="st-answer-feedback" :class="{ correct: chosenDriverAnswer.correct }" role="status">{{ chosenDriverAnswer.explanation }}</p>
              <button v-if="pausedDriver" class="st-primary st-inquiry-next" @click="togglePlay">继续看空间怎样变化<Icon name="arrow" :size="16" /></button>
              <p class="st-diagram-note">按教材梳理发展条件；建筑扩展是过程示意，不是逐年实景复原。</p>
            </section>
          </template>
          <template v-else-if="courseMode === 'inquire' && inquiry">
            <nav class="st-inquiry-steps" aria-label="推导步骤"><button v-for="(name, index) in stepNames" :key="name" :class="{ active: inquiryStep === index }" :aria-current="inquiryStep === index ? 'step' : undefined" @click="setInquiryStep(index)"><span>{{ index + 1 }}</span>{{ name }}</button></nav>
            <template v-if="inquiryStep === 0">
              <p class="st-description">{{ landscape === 'coast' ? '先观察山坡、可用台地与港湾，寻找居住和生产的线索。也可以查看完整案例，再隐藏房屋作判断。' : '先观察地形、水源和道路，寻找选址线索。也可以先查看完整案例，再隐藏房屋作判断。' }}</p>
              <div class="st-evidence"><button v-for="item in inquiry.evidence" :key="item.id" :aria-pressed="evidence[landscape]?.includes(item.id) || false" :class="{ selected: evidence[landscape]?.includes(item.id) }" @click="toggleEvidence(item.id)"><strong>{{ item.label }}</strong><span>{{ item.observation }}</span><small v-if="evidence[landscape]?.includes(item.id)">{{ item.explanation }}</small></button></div>
              <button class="st-primary st-inquiry-next" @click="setInquiryStep(1)">带着证据作判断<Icon name="arrow" :size="16" /></button>
            </template>
            <template v-else-if="inquiryStep === 1">
              <p class="st-description">{{ previewing ? '正在查看完整案例，可关闭上方开关，再作出你的预测。' : '暂时隐藏示例房屋。利用刚才找到的条件，预测人们会怎样安排聚落。' }}</p>
              <h3 class="st-prompt">你认为更可能出现哪种布局？</h3>
              <div class="st-answers"><button v-for="item in inquiry.predictions" :key="item.id" :aria-pressed="predictions[landscape] === item.id" :class="{ chosen: predictions[landscape] === item.id }" @click="predictions[landscape] = item.id">{{ item.label }}</button></div>
              <p v-if="!predictions[landscape]" class="st-diagram-note">选一个预测，再通过布置来检验。也可以边操作边修正判断。</p>
              <button class="st-primary st-inquiry-next" @click="setInquiryStep(2)">进入地面验证<Icon name="arrow" :size="16" /></button>
            </template>
            <template v-else-if="inquiryStep === 2">
              <p class="st-description">{{ landscape === 'coast' ? '尝试在台地放置至少 4 栋房屋，观察建筑高低与港湾的位置关系。' : '尝试放置至少 4 栋房屋，再铺道路。留意哪些位置受限制，房屋向哪个方向扩展。' }}</p>
              <h3 v-if="comparing" class="st-prompt">我的布置记录</h3>
              <div class="st-stat-grid" :class="{ stTwo: landscape === 'coast' }"><div><strong>{{ placementStats.houses }}</strong><span>栋房屋</span></div><div v-if="landscape !== 'coast'"><strong>{{ placementStats.roads }}</strong><span>段道路</span></div><div><strong>{{ placementStats.nearWater }}</strong><span>栋临近水体</span></div></div>
              <p class="st-placement-observation">{{ evaluation?.feedback }}</p>
              <button class="st-primary st-inquiry-next" @click="setInquiryStep(3)">用布局解释原因<Icon name="arrow" :size="16" /></button>
              <p class="st-diagram-note">4 栋是便于观察轮廓的建议，可以随时继续观察。</p>
            </template>
            <template v-else>
              <h3 class="st-prompt">把条件、选择与形态连起来</h3>
              <div class="st-answers"><button v-for="item in inquiry.reasonOptions" :key="item.id" :aria-pressed="reasons[landscape]?.includes(item.id) || false" :class="{ chosen: reasons[landscape]?.includes(item.id) }" @click="toggleReason(item.id)">{{ item.label }}</button></div>
              <template v-for="item in inquiry.reasonOptions" :key="`reason-${item.id}`"><p v-if="reasons[landscape]?.includes(item.id)" class="st-answer-feedback" :class="{ correct: item.correct }">{{ item.feedback }}</p></template>
              <section class="st-placement-evidence"><h3>从你的布置看</h3><p v-for="item in evaluation?.placementEvidence" :key="item">{{ item }}</p><p>{{ evaluation?.feedback }}</p></section>
              <button class="st-reveal" :aria-expanded="showExplanation" @click="showExplanation = !showExplanation">归纳这条因果链<Icon :name="showExplanation ? 'minus' : 'plus'" :size="18" /></button>
              <template v-if="showExplanation"><ol class="st-causal-chain"><li><small>环境条件</small><p>{{ inquiry.causalChain.condition }}</p></li><li><small>人的选择与活动</small><p>{{ inquiry.causalChain.choice }}</p></li><li><small>聚落形态</small><p>{{ inquiry.causalChain.form }}</p></li></ol><p class="st-takeaway">{{ inquiry.takeaway }}</p></template>
              <section class="st-counterfactual"><h3>如果条件改变了呢？</h3><p>{{ inquiry.counterfactual.condition }}</p><p>{{ inquiry.counterfactual.question }}</p><details><summary>看看可能怎样变化</summary><p>{{ inquiry.counterfactual.explanation }}</p></details></section><section class="st-next-case"><button class="st-reveal" @click="compareCondition">再比较另一个案例<Icon name="arrow" :size="16" /></button><p class="st-diagram-note">不同案例的条件不止一项发生变化，请重新寻找证据。</p></section>
              <p class="st-diagram-note">{{ evaluation?.caution }}</p>
            </template>
          </template>
          <template v-else>
            <p class="st-description">{{ current.description }}</p>
            <section class="st-clues"><h3>寻找这些线索</h3><ol><li v-for="(clue, i) in current.clues" :key="clue"><span>{{ String(i + 1).padStart(2, '0') }}</span>{{ clue }}</li></ol></section>
            <button class="st-reveal" :aria-expanded="showExplanation" @click="showExplanation = !showExplanation">{{ showExplanation ? '收起解释' : '看看如何解释' }}<Icon :name="showExplanation ? 'minus' : 'arrow'" :size="18" /></button><p v-if="showExplanation" class="st-takeaway">{{ current.takeaway }}</p>
            <button class="st-primary st-inquiry-next" @click="setCourseMode('inquire')">进入条件推导<Icon name="arrow" :size="16" /></button>
          </template>
        </div>
      </FloatingFeatureCard>
    </section>

    <footer class="st-footer" :class="{ 'is-building': mode === 'build' }">
      <section class="st-environment-group" aria-label="切换教材案例">
        <div class="st-control-heading"><h2>教材案例</h2><span>比较形态与发展</span></div>
        <nav class="st-landscapes" aria-label="选择教材案例"><button v-for="item in LANDSCAPES" :key="item.id" :class="{ active: landscape === item.id, extension: item.id === 'coast' || item.id === 'dubai' }" :disabled="unavailable" :aria-pressed="landscape === item.id" @click="selectLandscape(item.id)"><span><strong>{{ item.title }}</strong><small>{{ caseCues[item.id] }}</small></span></button></nav>
      </section>
      <section class="st-action-group" :aria-label="landscape === 'dubai' ? '迪拜时期对比' : mode === 'observe' ? '聚落展开演示' : '聚落选址工具'">
        <div class="st-control-heading"><h2>{{ landscape === 'dubai' ? '从渔村到都市' : courseMode === 'inquire' ? '条件 → 选择 → 形态' : mode === 'observe' ? '聚落展开' : '选址工具' }}</h2><span>{{ landscape === 'dubai' ? '可播放，也可拖动回看' : courseMode === 'inquire' ? '观察与验证' : mode === 'observe' ? '分步观察 · 非历史复原' : landscape === 'coast' ? '选择房屋后点台地放置' : '选择工具后点地面放置' }}</span></div>
      <div v-if="landscape === 'dubai'" class="st-dubai-timeline">
        <div class="st-growth-row"><button class="st-play" :disabled="unavailable" :aria-label="playing ? '暂停迪拜发展演示' : '播放迪拜发展演示'" @click="togglePlay"><Icon :name="playing ? 'pause' : 'play'" /></button><div class="st-range-wrap"><input aria-label="迪拜发展过程" type="range" min="0" max="100" step="0.1" :value="growth" :disabled="unavailable" @input="seek"><div><span>渔村与早期贸易</span><span>现代都市</span></div></div></div>
        <div class="st-era-buttons" role="group" aria-label="教材三个时期对照"><button v-for="(era, i) in DUBAI_ERAS" :key="era.title" :disabled="unavailable" :class="{ active: dubaiEra === i }" :aria-pressed="dubaiEra === i" @click="selectEra(i)"><strong>{{ era.title }}</strong><span>{{ era.period }}</span></button></div>
      </div>
      <div v-else-if="courseMode === 'inquire' && inquiryStep !== 2" class="st-inquiry-navigation"><div><strong>{{ inquiryStep + 1 }} / 4 · {{ stepNames[inquiryStep] }}</strong><span>{{ inquiryStep === 0 ? '找出影响选址的环境线索' : inquiryStep === 1 ? '先预测，再用模型验证' : '将环境条件与空间结果联系起来' }}</span></div><button v-if="inquiryStep < 3" class="st-primary" @click="setInquiryStep(inquiryStep + 1)">{{ inquiryStep === 0 ? '作出判断' : '动手验证' }}<Icon name="arrow" :size="16" /></button><button v-else class="st-primary" @click="setInquiryStep(2)">调整我的布局</button></div>
      <div v-else-if="mode === 'observe'" class="st-growth-row"><button class="st-play" :disabled="unavailable" :aria-label="playing ? '暂停聚落展开' : '演示聚落展开'" @click="togglePlay"><Icon :name="playing ? 'pause' : 'play'" /></button><div class="st-range-wrap"><input aria-label="聚落展示进度" type="range" min="0" max="100" :value="growth" :disabled="unavailable" @input="seek"><div><span>{{ landscape === 'coast' ? '山地与港湾' : '环境与道路' }}</span><span>聚落全貌</span></div></div><button class="st-primary st-try" :disabled="unavailable" @click="comparing ? compareExample() : setMode('build')">{{ comparing ? '回到我的布局' : '亲手选址' }}<Icon name="arrow" :size="17" /></button></div>
      <div v-else class="st-build-toolbar"><div class="st-palette" role="group" aria-label="选址工具"><button v-for="item in availableTools" :key="item.id" :class="{ active: tool === item.id }" :aria-pressed="tool === item.id" :disabled="unavailable" @pointerdown="(item.id === 'house' || item.id === 'road') && beginPalette($event, item.id)" @click="selectTool(item.id)" @contextmenu.prevent><Icon :name="item.icon" />{{ item.name }}</button></div><div class="st-edit-tools"><button class="st-tool-btn" :disabled="unavailable" title="转向（R）" aria-label="旋转房屋或道路" @click="scene?.rotatePlacement()"><Icon name="rotate" :size="18" /></button><button class="st-tool-btn" :disabled="unavailable" title="撤销（Ctrl+Z）" aria-label="撤销布置" @click="scene?.undo()"><Icon name="undo" :size="18" /></button></div></div>
      </section>
    </footer>
    <div v-if="dragPalette" class="st-drag-token" :style="{ left: `${dragPalette.x}px`, top: `${dragPalette.y}px` }"><Icon :name="dragPalette.kind === 'house' ? 'house' : 'road'" />{{ dragPalette.kind === 'house' ? '房屋' : '道路' }}</div>
    <dialog v-if="sourceOpen" ref="sourceDialog" class="st-dialog" aria-labelledby="st-sources-title" @cancel="sourceOpen = false" @click="($event.target === sourceDialog) && closeSources()"><article><header><div><p>课程依据</p><h2 id="st-sources-title">资料来源与模型说明</h2></div><button class="st-icon-btn" aria-label="关闭资料说明" @click="closeSources"><Icon name="close" /></button></header><div class="st-source-body"><section v-for="source in SOURCES" :key="source.title"><h3>{{ source.title }}</h3><p>{{ source.detail }}</p><a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">查看资料 ↗</a></section><section class="st-model-note"><h3>怎样使用这个模型</h3><p>{{ MODEL_NOTE }}</p></section></div></article></dialog>
  </main>
</template>

<style scoped src="./classroom.css"></style>
