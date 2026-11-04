<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { DRIVING_QUESTIONS, FEATURES, MODEL_NOTE, PRESSURE_NOTE, QUESTION, SOURCES, STEPS, pressureMPa } from './lesson'
import { createHydrateScene } from './scene'
import DistributionStudy from './DistributionStudy.vue'
import HydrateSample from './HydrateSample.vue'
import ProposalNotebook from './ProposalNotebook.vue'
import DivingSuitStudy from './DivingSuitStudy.vue'
import ObservationMap from './ObservationMap.vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import type { CameraView, FeatureId, LessonStep, Marker, SceneController } from './types'

const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'
const iconPaths: Record<string, string[]> = {
  info: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 16v-4m0-4h.01'],
  reset: ['M3 10a9 9 0 1 1 2 8', 'M3 4v6h6'],
  water: ['M2 6c3-4 5 4 8 0s5 4 8 0 3 0 4 0', 'M2 12c3-4 5 4 8 0s5 4 8 0 3 0 4 0', 'M2 18c3-4 5 4 8 0s5 4 8 0 3 0 4 0'],
  eye: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  minus: ['M5 12h14'], plus: ['M5 12h14', 'M12 5v14'], close: ['m6 6 12 12M6 18 18 6'],
  down: ['m6 9 6 6 6-6'], up: ['m6 15 6-6 6 6'],
  play: ['m8 5 11 7-11 7V5'], pause: ['M8 5v14M16 5v14'],
  notebook: ['M5 3h14v18H5z', 'M3 7h4M3 12h4M3 17h4', 'M10 8h5M10 12h5M10 16h3'],
  map: ['m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5', 'M9 3v16M15 5v16'],
  external: ['M15 3h6v6', 'm10 14 11-11', 'M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5'],
}
const Icon = (props: { name: string; size?: number }) => h('svg', {
  width: props.size ?? 18, height: props.size ?? 18, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
}, (iconPaths[props.name] ?? []).map(d => h('path', { d })))

const sceneHost = ref<HTMLElement>()
const panelBody = ref<HTMLElement>()
const stageElement = ref<HTMLElement>()
const panelResetKey = ref(0)
const panelPlacement = ref({ ready: false, mode: 'wide', top: 175, bottom: 140, maxHeight: 410, height: 410 })
let panelObserver: ResizeObserver | undefined
function updatePanelPlacement() {
  const rect = stageElement.value?.getBoundingClientRect()
  if (!rect) return
  const portrait = window.innerWidth <= 1050 && window.innerWidth <= window.innerHeight
  const phone = window.innerWidth <= 760
  const maxHeight = Math.max(180, rect.height - 80)
  const height = Math.min(maxHeight, phone || portrait ? Math.max(220, rect.height * .57) : 590)
  panelPlacement.value = { ready: true, mode: phone ? 'phone' : portrait ? 'portrait' : 'wide', top: phone || portrait ? rect.bottom - height - 68 : rect.top + 12, bottom: window.innerHeight - rect.bottom + 68, maxHeight, height }
}
const sourcesDialog = ref<HTMLDialogElement>()
const sourcesTrigger = ref<HTMLButtonElement>()
const loading = ref(true)
const error = ref('')
const logoFailed = ref(false)
const step = ref<LessonStep>('resource')
const view = ref<CameraView>('overview')
const depth = ref(800)
const progress = ref(0)
const playing = ref(false)
const waterVisible = ref(true)
const markersVisible = ref(true)
const projected = ref<Marker[]>([])
const selectedFeature = ref<FeatureId | null>(null)
const panelCollapsed = ref(false)
const sourcesOpen = ref(false)
const answer = ref<string | null>(null)
type Activity = 'map' | 'sample' | 'proposal' | 'suit' | 'guide'
const activity = ref<Activity | null>(null)
const activityDialog = ref<HTMLDialogElement>()
const modalOpen = computed(() => sourcesOpen.value || activity.value !== null)
const activityTitles: Record<Activity, string> = { map: '世界可燃冰分布 · 教材读图', sample: '冰状样品为什么能燃烧？', proposal: '南海可燃冰开采建议书', suit: '3D 潜水服 · 为什么需要耐压？', guide: '观察地图' }
const visited = ref<string[]>([])
function markVisited(id: string) { if (!visited.value.includes(id)) visited.value.push(id) }
function chooseObservation(id: string) {
  markVisited(id)
  if (id === 'map' || id === 'sample' || id === 'suit') { void openActivity(id); return }
  closeActivity()
  if (id === 'pressure') { changeStep('pressure'); return }
  if (id === 'transport') { changeStep('extraction'); return }
  if (id === 'environment') { changeStep('protection'); return }
  if (!(id in FEATURES)) return
  const feature = id as FeatureId
  changeStep(feature === 'monitor' ? 'protection' : feature === 'rov' ? 'pressure' : feature === 'riser' || feature === 'wellhead' ? 'extraction' : 'resource')
  focusFeature(feature)
}
const records = ref<{ id: string; text: string }[]>([])
const recordFeedback = ref('')
const RECORD_KEY = 'zdys-hydrate-observations-v1'
let activityTrigger: HTMLElement | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

function loadRecords() {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]')
    if (Array.isArray(saved)) records.value = saved.filter(row => row && typeof row.id === 'string' && typeof row.text === 'string')
  } catch { /* Observation tools remain usable when local storage is unavailable. */ }
}
function saveRecords() {
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(records.value)); return true } catch { return false }
}
function recordObservation(text: string) {
  const value = text.trim()
  if (!value) return
  if (!records.value.some(row => row.text === value)) records.value.push({ id: `observation-${Date.now()}-${records.value.length}`, text: value })
  recordFeedback.value = saveRecords() ? '已加入学习记录，可在建议书中引用。' : '已加入本次学习记录；浏览器未能保存，请导出建议书保留。'
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => { recordFeedback.value = '' }, 6000)
}
function removeRecord(id: string) { records.value = records.value.filter(row => row.id !== id); saveRecords() }
function recordPressure() { recordObservation(`水深 ${depth.value} 米时，海水压力估算为 ${pressureMPa(depth.value).toFixed(1)} MPa（表压，未计大气压）。`) }
function recordTransport() { recordObservation('在补充的降压开采示意中，储层内的水合物分解后，气、水经井筒和密封管道输送到海面平台，并非整块冰被吊起。') }
async function openActivity(value: Activity) {
  stopPlayback()
  if (!activity.value) activityTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (value === 'map' || value === 'sample' || value === 'suit') markVisited(value)
  activity.value = value
  await nextTick()
  if (!activityDialog.value?.open) activityDialog.value?.showModal()
  if (activityDialog.value) activityDialog.value.scrollTop = 0
  activityDialog.value?.querySelector<HTMLButtonElement>('.hy-activity-close')?.focus()
}
function closeActivity() { activityDialog.value?.close(); activity.value = null; activityTrigger?.focus({ preventScroll: true }) }
function closeActivityBackdrop(event: MouseEvent) {
  const dialog = activityDialog.value
  if (!dialog || event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeActivity()
}

const views: { id: CameraView; title: string }[] = [
  { id: 'overview', title: '总览' }, { id: 'section', title: '地层剖面' },
  { id: 'dive', title: '下潜观察' }, { id: 'platform', title: '海面平台' },
]
const stepViews: Record<LessonStep, CameraView> = { resource: 'overview', pressure: 'dive', extraction: 'section', protection: 'overview' }
const stepFeatures: Record<LessonStep, FeatureId[]> = {
  resource: ['platform', 'hydrate', 'sediment'], pressure: ['rov', 'wellhead'],
  extraction: ['platform', 'riser', 'wellhead', 'hydrate'], protection: ['monitor', 'rov', 'wellhead'],
}
const unavailable = computed(() => loading.value || Boolean(error.value))
const activeStep = computed(() => STEPS.find(item => item.id === step.value) ?? STEPS[0]!)
const activeFeature = computed(() => selectedFeature.value ? FEATURES[selectedFeature.value] : null)
const activeAnswer = computed(() => QUESTION.options.find(option => option.id === answer.value))
const visibleMarkers = computed(() => markersVisible.value ? projected.value.filter(marker => marker.visible && stepFeatures[step.value].includes(marker.id)) : [])
const progressPercent = computed(() => Math.round(progress.value * 100))
const processPhase = computed(() => progress.value < .2 ? '确认开采通道' : progress.value < .55 ? '降压促使水合物分解' : progress.value < .85 ? '气、水沿井筒向上输送' : '海面平台接收与处理')
let scene: SceneController | undefined
let disposed = false
let generation = 0

function stopPlayback() { playing.value = false; scene?.setPlaying(false) }
function syncProgress(value: number) {
  if (!Number.isFinite(value)) return
  progress.value = Math.min(1, Math.max(0, value))
  if (progress.value >= 1) stopPlayback()
}
function changeStep(value: LessonStep) {
  if (unavailable.value) return
  stopPlayback()
  step.value = value
  if (value !== 'resource') markVisited(value === 'extraction' ? 'transport' : value === 'protection' ? 'environment' : 'pressure')
  view.value = stepViews[value]
  selectedFeature.value = null
  panelCollapsed.value = false
  scene?.setStep(value)
  void nextTick(() => panelBody.value?.scrollTo({ top: 0 }))
}
function changeView(value: CameraView) { view.value = value; scene?.setView(value) }
function changeDepth(event: Event) {
  depth.value = Math.max(0, Math.min(1600, Number((event.target as HTMLInputElement).value)))
  scene?.setDepth(depth.value)
}
function seek(event: Event) {
  stopPlayback()
  syncProgress(Number((event.target as HTMLInputElement).value) / 100)
  scene?.setProgress(progress.value)
}
function togglePlayback() {
  if (unavailable.value) return
  if (playing.value) { stopPlayback(); return }
  if (progress.value >= 1) { progress.value = 0; scene?.setProgress(0) }
  playing.value = true
  scene?.setPlaying(true)
}
function toggleWater() { waterVisible.value = !waterVisible.value; scene?.setWaterVisible(waterVisible.value) }
function focusFeature(id: FeatureId) {
  markVisited(id)
  selectedFeature.value = id
  panelCollapsed.value = false
  scene?.focus(id)
  if (id === 'platform') view.value = 'platform'
  void nextTick(() => panelBody.value?.querySelector<HTMLElement>('.hy-feature-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}
function inspectFeature() {
  const id = selectedFeature.value
  if (!id) return
  if (id === 'platform') { waterVisible.value = false; scene?.setWaterVisible(false) }
  scene?.focus(id, true)
}
function resetScene() {
  stopPlayback()
  depth.value = 800; progress.value = 0
  selectedFeature.value = null; answer.value = null
  waterVisible.value = true; markersVisible.value = true
  view.value = stepViews[step.value]
  scene?.reset()
}
function initialize() {
  if (!sceneHost.value || disposed) return
  const revision = ++generation
  stopPlayback()
  scene?.dispose(); scene = undefined
  sceneHost.value.replaceChildren()
  loading.value = true; error.value = ''; projected.value = []
  try {
    scene = createHydrateScene(sceneHost.value, {
      onMarkers(markers) { if (!disposed && revision === generation) projected.value = markers },
      onProgress(value) { if (!disposed && revision === generation) syncProgress(value) },
      onReady() { if (!disposed && revision === generation) loading.value = false },
      onError(message) { if (!disposed && revision === generation) { error.value = message; loading.value = false; stopPlayback() } },
    })
    scene.setStep(step.value)
    scene.setView(view.value)
    scene.setDepth(depth.value)
    scene.setProgress(progress.value)
    scene.setWaterVisible(waterVisible.value)
  } catch (cause) {
    console.error('Hydrate scene initialization failed', cause)
    loading.value = false
    error.value = '三维场景暂时无法打开，请重新加载。'
  }
}
function openSources() {
  if (!sourcesDialog.value) return
  stopPlayback()
  sourcesDialog.value.showModal()
  sourcesOpen.value = true
  void nextTick(() => sourcesDialog.value?.querySelector<HTMLButtonElement>('button')?.focus())
}
function closeSources() {
  sourcesDialog.value?.close()
  sourcesOpen.value = false
  sourcesTrigger.value?.focus({ preventScroll: true })
}
function closeBackdrop(event: MouseEvent) {
  const dialog = sourcesDialog.value
  if (!dialog || event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSources()
}
onMounted(() => {
  loadRecords(); initialize(); updatePanelPlacement()
  panelObserver = new ResizeObserver(updatePanelPlacement)
  if (stageElement.value) panelObserver.observe(stageElement.value)
  window.addEventListener('resize', updatePanelPlacement)
})
onBeforeUnmount(() => {
  disposed = true; generation += 1
  stopPlayback(); scene?.dispose(); scene = undefined
  sourcesDialog.value?.close()
  activityDialog.value?.close()
  clearTimeout(feedbackTimer)
  panelObserver?.disconnect()
  window.removeEventListener('resize', updatePanelPlacement)
})
</script>

<template>
  <main class="hydrate-page">
    <header class="hy-header" :inert="modalOpen">
      <div class="hy-brand" aria-label="智地有申">
        <img v-if="!logoFailed" :src="BRAND_LOGO" alt="智地有申" draggable="false" @error="logoFailed = true" />
        <span v-else>智地有申</span>
      </div>
      <div class="hy-heading"><p>跨学科主题学习 · 陆地与海洋</p><h1>开采海底可燃冰需要解决哪些难题</h1></div>
      <button ref="sourcesTrigger" type="button" class="hy-icon-button hy-info-button" title="资料来源与模型说明"
        aria-label="资料来源与模型说明" aria-haspopup="dialog" aria-controls="hydrate-sources" :aria-expanded="sourcesOpen" @click="openSources"><Icon name="info" :size="21" /></button>
    </header>

    <div class="hy-toolbar" :inert="modalOpen">
      <div class="hy-views" role="group" aria-label="观察视角">
        <button v-for="option in views" :key="option.id" type="button" :class="{ active: view === option.id }"
          :aria-pressed="view === option.id" :disabled="unavailable" @click="changeView(option.id)">{{ option.title }}</button>
      </div>
      <span class="hy-toolbar-divider" aria-hidden="true" />
      <div class="hy-tools" role="group" aria-label="场景工具">
        <button type="button" class="hy-tool" :disabled="unavailable" @click="resetScene"><Icon name="reset" />复位</button>
        <button type="button" class="hy-tool" :class="{ active: waterVisible }" :aria-pressed="waterVisible" :disabled="unavailable" @click="toggleWater"><Icon name="water" />水体</button>
        <button type="button" class="hy-tool" :class="{ active: markersVisible }" :aria-pressed="markersVisible" :disabled="unavailable" @click="markersVisible = !markersVisible"><Icon name="eye" />标注</button>
        <div class="hy-observation-actions">
          <button type="button" class="hy-tool hy-guide-trigger" @click="openActivity('guide')"><Icon name="map" />观察地图</button>
          <button type="button" class="hy-tool hy-notebook-trigger" @click="openActivity('proposal')"><Icon name="notebook" />观察记录 · 导出图片<span v-if="records.length" class="hy-record-count">{{ records.length }}</span></button>
        </div>
      </div>
    </div>

    <section ref="stageElement" class="hy-stage" aria-label="深海可燃冰开采三维示意" :inert="modalOpen">
      <div ref="sceneHost" class="hy-scene-host" :aria-busy="loading" />
      <div v-if="!unavailable" class="hy-marker-layer" aria-label="点击结构标注查看说明">
        <button v-for="marker in visibleMarkers" :key="marker.id" class="hy-marker" type="button"
          :class="{ selected: selectedFeature === marker.id }" :style="{ left: `${marker.x}px`, top: `${marker.y}px` }"
          :aria-label="`查看${FEATURES[marker.id].title}的说明`" :aria-pressed="selectedFeature === marker.id" @click="focusFeature(marker.id)">
          <span class="hy-marker-dot" aria-hidden="true" />{{ FEATURES[marker.id].title }}
        </button>
      </div>

      <FloatingFeatureCard v-if="panelPlacement.ready" :key="`${panelPlacement.mode}-${panelResetKey}`"
        v-model:collapsed="panelCollapsed" class="hy-lesson-card" :class="{ interactive: step === 'pressure' || step === 'extraction' }"
        :style="{ '--hy-panel-height': `${panelPlacement.height}px`, '--hy-panel-max-height': `${panelPlacement.maxHeight}px` }"
        :title="activeStep.title" variant="control" :initial-top="panelPlacement.top" :initial-right="panelPlacement.mode === 'wide' ? 24 : 12"
        :bottom-inset="panelPlacement.bottom" :min-width="240" :min-height="180" light aria-label="课堂探究">
        <template #title-prefix><span class="hy-panel-number">{{ activeStep.number }}</span></template>
        <template #header-meta>
          <button type="button" class="hy-icon-button hy-panel-layout-reset" title="复原面板位置与大小" aria-label="复原面板位置与大小" @pointerdown.stop @click="panelResetKey++"><Icon name="reset" :size="16" /></button>
        </template>
        <div id="hydrate-lesson-body" ref="panelBody" class="hy-panel-body">
          <section v-if="activeFeature" class="hy-feature-detail" aria-live="polite">
            <div><h4>{{ activeFeature.title }}</h4><button class="hy-icon-button" type="button" aria-label="关闭结构说明" @click="selectedFeature = null"><Icon name="close" :size="16" /></button></div>
            <strong v-if="activeFeature.role" class="hy-feature-role">{{ activeFeature.role }}</strong>
            <p>{{ activeFeature.description }}</p>
            <dl v-if="activeFeature.dataUses" class="hy-feature-facts">
              <template v-for="item in activeFeature.dataUses" :key="item.measure"><dt>{{ item.measure }}</dt><dd>{{ item.purpose }}</dd></template>
            </dl>
            <dl v-if="activeFeature.parts" class="hy-feature-facts">
              <template v-for="part in activeFeature.parts" :key="part.name"><dt>{{ part.name }}</dt><dd>{{ part.description }}</dd></template>
            </dl>
            <p v-if="activeFeature.observation" class="hy-feature-observe">{{ activeFeature.observation }}</p>
            <button v-if="activeFeature.focusLabel" type="button" class="hy-record-button" :disabled="unavailable" @click="inspectFeature">{{ activeFeature.focusLabel }}<span aria-hidden="true"> →</span></button>
            <p v-if="activeFeature.note" class="hy-small-note">{{ activeFeature.note }}</p>
          </section>
          <p class="hy-kicker">{{ activeStep.subtitle }}</p>
          <h3 class="hy-question">{{ activeStep.question }}</h3>

          <div v-if="step === 'resource'" class="hy-resource-actions">
            <button type="button" @click="openActivity('map')"><span>读图</span><strong>世界可燃冰分布</strong><small>区分已发现与推测，定位南海</small></button>
            <button type="button" @click="openActivity('sample')"><span>观察</span><strong>可燃冰样品与燃烧</strong><small>观察现象，记录你的发现</small></button>
          </div>

          <button v-if="step === 'protection'" type="button" class="hy-proposal-action" @click="openActivity('proposal')"><Icon name="notebook" />整理证据，完成开采建议书</button>
          <div v-if="step === 'pressure'" class="hy-experiment">
            <div class="hy-readouts">
              <div><span>探究深度</span><strong>{{ depth.toLocaleString() }}<small>m</small></strong></div>
              <div><span>海水压力 · 表压</span><strong>{{ pressureMPa(depth).toFixed(1) }}<small>MPa</small></strong></div>
            </div>
            <label class="hy-control-label" for="hydrate-depth">改变下潜深度</label>
            <input id="hydrate-depth" class="hy-range" type="range" min="0" max="1600" step="25" :value="depth" :disabled="unavailable"
              :aria-valuetext="`水深${depth}米，海水压力约${pressureMPa(depth).toFixed(1)}兆帕表压`" :style="{ '--fill': `${depth / 16}%` }" @input="changeDepth" />
            <div class="hy-range-scale"><span>海面 0 m</span><span>800 m</span><span>1,600 m</span></div>
            <button type="button" class="hy-record-button" @click="recordPressure">记录当前水深与压力</button>
            <p class="hy-small-note">{{ PRESSURE_NOTE }}</p>
          </div>

          <div v-if="step === 'extraction'" class="hy-experiment">
            <div class="hy-playback">
              <button type="button" class="hy-play-button" :aria-label="playing ? '暂停开采过程' : progress >= 1 ? '重新播放开采过程' : '播放开采过程'"
                :aria-pressed="playing" :disabled="unavailable" @click="togglePlayback"><Icon :name="playing ? 'pause' : 'play'" :size="19" /></button>
              <div><span class="hy-control-label">{{ playing ? '正在演示' : progress >= 1 ? '演示完成' : '开采与输送过程' }}</span><p>{{ processPhase }}</p></div>
              <span class="hy-progress-number">{{ progressPercent }}%</span>
            </div>
            <label class="hy-sr-only" for="hydrate-progress">开采过程进度</label>
            <input id="hydrate-progress" class="hy-range" type="range" min="0" max="100" step="1" :value="progressPercent" :disabled="unavailable"
              :aria-valuetext="`${processPhase}，进度${progressPercent}%`" :style="{ '--fill': `${progressPercent}%` }" @input="seek" />
            <div class="hy-range-scale"><span>确认通道</span><span>降压分解</span><span>输送处理</span></div>
            <p class="hy-small-note">管道上的光点表示气、水输送；降压开采为补充原理示意。</p>
            <button type="button" class="hy-record-button" @click="recordTransport">记录输送过程的观察</button>
          </div>

          <p v-if="recordFeedback" class="hy-record-feedback" role="status">{{ recordFeedback }}</p>
          <p class="hy-explanation">{{ activeStep.explanation }}</p>

          <div v-if="step === 'protection'" class="hy-quiz">
            <p class="hy-control-label">小探究</p><h4>{{ QUESTION.prompt }}</h4>
            <div class="hy-answers">
              <button v-for="option in QUESTION.options" :key="option.id" type="button" :aria-pressed="answer === option.id"
                :class="{ chosen: answer === option.id, correct: answer === option.id && option.correct }" @click="answer = option.id">{{ option.text }}</button>
            </div>
            <p v-if="activeAnswer" class="hy-feedback" :class="{ correct: activeAnswer.correct }" role="status">{{ activeAnswer.feedback }}</p>
          </div>

          <div class="hy-takeaway"><span>记住这一点</span><p>{{ activeStep.takeaway }}</p></div>
        </div>
        <div class="hy-observation-tools">
          <div class="hy-observation-heading"><h3>点击观察</h3></div>
          <div class="hy-feature-shortcuts" aria-label="本步观察对象">
            <button v-if="step === 'pressure'" type="button" class="hy-suit-trigger" @click="openActivity('suit')">3D 潜水服<span aria-hidden="true">›</span></button>
            <button v-for="id in stepFeatures[step]" :key="id" type="button" :disabled="unavailable" :aria-pressed="selectedFeature === id" @click="focusFeature(id)">{{ FEATURES[id].title }}<span aria-hidden="true">›</span></button>
          </div>
        </div>
      </FloatingFeatureCard>

      <div v-if="!unavailable" class="hy-scene-note">深度与尺寸作示意</div>
      <div v-if="!unavailable" class="hy-zoom" role="group" aria-label="场景缩放">
        <button type="button" class="hy-icon-button" title="缩小" aria-label="缩小场景" @click="scene?.zoom(-1)"><Icon name="minus" /></button>
        <button type="button" class="hy-icon-button" title="放大" aria-label="放大场景" @click="scene?.zoom(1)"><Icon name="plus" /></button>
      </div>
      <div v-if="unavailable" class="hy-scene-message" :role="error ? 'alert' : 'status'">
        <div><Icon name="water" :size="34" /><h2>{{ error ? '场景暂时无法打开' : '正在走进深海' }}</h2>
          <p>{{ error || '准备海洋、地层与开采平台…' }}</p>
          <button v-if="error" class="hy-primary-button" type="button" @click="initialize">重新加载</button><progress v-else aria-label="正在加载三维场景" /></div>
      </div>
    </section>

    <footer class="hy-dock" :inert="modalOpen">
      <div class="hy-inquiry-heading"><h2>驱动问题</h2></div>
      <nav class="hy-steps" aria-label="四个驱动问题">
        <button v-for="item in DRIVING_QUESTIONS" :key="item.id" type="button" :class="{ active: step === item.id }" :aria-label="`驱动问题${item.number}：${item.text}`"
          :aria-current="step === item.id ? 'step' : undefined" :disabled="unavailable" @click="changeStep(item.id)">
          <span class="hy-step-number">{{ item.number }}</span><span class="hy-driver-copy"><strong>{{ item.shortTitle }}</strong><small>{{ item.text }}</small></span>
        </button>
      </nav>
    </footer>

    <dialog id="hydrate-sources" ref="sourcesDialog" class="hy-sources-dialog" aria-labelledby="hydrate-sources-title"
      @cancel.prevent="closeSources" @close="sourcesOpen = false" @click="closeBackdrop">
      <div class="hy-dialog-head"><div><p>课堂资料</p><h2 id="hydrate-sources-title">资料来源与模型说明</h2></div>
        <button type="button" class="hy-icon-button" aria-label="关闭资料来源" @click="closeSources"><Icon name="close" :size="22" /></button></div>
      <div class="hy-dialog-body">
        <h3>教材学习主线</h3><p>上海六年级上册第 78—79 页，跨学科主题学习“开采海底可燃冰需要解决哪些难题”。围绕这一主题，认识可燃冰，观察深海高压环境，了解开采与输送，并思考海洋环境保护。</p>
        <h3>怎样理解这个模型</h3>
        <p>{{ MODEL_NOTE }}</p>
        <p>平台、井筒、海底与地层的垂直距离经过调整，不代表某个实际采区。可燃冰分布于海底沉积物中，并非裸露在海水里的整块冰。</p>
        <p>深度滑块用于比较水深和海水压力，读数为海水产生的表压，不含大气压，也不等于地层孔隙压力。模型按恒定海水密度估算，0—1,600 m 为探究范围。</p>
        <p>降压开采作为补充原理：降低储层压力，使水合物分解，再通过井筒收集和输送气、水。动画不代表现场作业速度，也不表示深海开采已经可以大规模商业化。</p>
        <h3>参考资料</h3>
        <ul class="hy-source-list"><li v-for="source in SOURCES" :key="source.title">
          <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}<Icon name="external" :size="15" /></a><strong v-else>{{ source.title }}</strong>
          <p>{{ source.note }}</p>
        </li></ul>
      </div>
    </dialog>

    <dialog ref="activityDialog" class="hy-activity-dialog" aria-labelledby="hydrate-activity-title" @cancel.prevent="closeActivity" @close="activity = null" @click="closeActivityBackdrop">
      <div class="hy-dialog-head"><div><p>上海六年级上册 · 第 78—79 页</p><h2 id="hydrate-activity-title">{{ activity ? activityTitles[activity] : '' }}</h2></div><button type="button" class="hy-icon-button hy-activity-close" aria-label="关闭探究活动" @click="closeActivity"><Icon name="close" :size="22" /></button></div>
      <p v-if="recordFeedback" class="hy-activity-feedback" role="status">{{ recordFeedback }}</p>
      <div class="hy-activity-body">
        <ObservationMap v-if="activity === 'guide'" :visited="visited" @choose="chooseObservation" />
        <DistributionStudy v-else-if="activity === 'map'" @record="recordObservation" />
        <HydrateSample v-else-if="activity === 'sample'" @record="recordObservation" />
        <DivingSuitStudy v-else-if="activity === 'suit'" @record="recordObservation" />
        <ProposalNotebook v-else-if="activity === 'proposal'" :records="records" @remove-record="removeRecord" />
      </div>
    </dialog>
  </main>
</template>

<style scoped src="./classroom.css"></style>
