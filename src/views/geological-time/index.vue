<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { periods, citations, assetUrl } from './periods'
import { createGeologicScene, type SpiralRoamState } from './useGeologicScene'
import { textbookStartAge } from './textbookChronology'

const page = ref<HTMLElement>()
const stage = ref<HTMLElement>()
const guideDialog = ref<HTMLDialogElement>()
const guideButton = ref<HTMLButtonElement>()
const selectedIndex = ref(3)
const focusedIndex = ref<number | null>(null)
const selected = computed(() => periods[selectedIndex.value] ?? periods[0]!)
const mode = ref<'overview' | 'panorama'>('overview')
const labels = ref<{ index: number; x: number; y: number; visible: boolean }[]>([])
const milestones = ref<{ index: number; age: string; unit: string; x: number; y: number; anchorX: number; anchorY: number; visible: boolean }[]>([])
const loading = ref(false)
const sceneError = ref('')
const contextError = ref('')
const illustrationState = ref({ failed: 0, retrying: false })
const entering = ref(false)
const webglReady = ref(false)
const autoRotate = ref(false)
const focusOrbit = ref(false)
const roam = ref<SpiralRoamState>({ phase: 'idle', progress: 0, index: 1 })
const roaming = computed(() => roam.value.phase !== 'idle')
const roamButtonLabel = computed(() => ({ idle: '沿线漫游', playing: '暂停漫游', paused: '继续漫游', finished: '重新漫游' })[roam.value.phase])
const tour = ref(true)
const lifeMotion = ref(true)
const captionsVisible = ref(true)
const detailVisible = ref(false)
const subtitleIndex = ref(0)
const subtitleProgress = ref(0)
const isFullscreen = ref(false)
const reducedMotion = ref(false)
const guideOpen = ref(false)
const fullscreenMessage = ref('')
let engine: ReturnType<typeof createGeologicScene> | undefined
let entryVersion = 0
let timer: ReturnType<typeof setInterval> | undefined
let media: MediaQueryList | undefined
let lastTick = 0
let elapsed = 0
let returnFocus: HTMLElement | null = null
const subtitleDuration = 8500
const groups = computed(() => [
  { name: '早期的三个宙', sub: '冥古宙 · 太古宙 · 元古宙', indices: [0, 1, 2], color: '#a9b7d3' },
  { name: '古生代', sub: '', indices: [3, 4, 5, 6, 7, 8], color: '#64cfc3' },
  { name: '中生代', sub: '', indices: [9, 10, 11], color: '#e6bb6e' },
  { name: '新生代', sub: '', indices: [12, 13, 14], color: '#a9cc85' },
])
const subtitle = computed(() => selected.value.subtitles[subtitleIndex.value] ?? '')
const breadcrumb = computed(() => [selected.value.eon, selected.value.era, selected.value.rank === '纪' ? selected.value.name : ''].filter(Boolean))

function focusPeriod(index: number) {
  if (mode.value !== 'overview' || entering.value) return
  selectedIndex.value = index
  focusedIndex.value = index
  autoRotate.value = false
  engine?.setAutoRotate(false)
  engine?.focusPeriod(index)
}

function resetOverview() {
  focusedIndex.value = null
  engine?.resetView()
}

function alignOverviewSelection() {
  engine?.setSelected(selectedIndex.value)
  if (focusedIndex.value !== null) {
    focusedIndex.value = selectedIndex.value
    engine?.focusPeriod(selectedIndex.value)
  }
}

function dismissSceneError() {
  if (contextError.value) contextError.value = ''
  else sceneError.value = ''
}

async function enterPeriod(index: number) {
  if (!engine || entering.value) return
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const version = ++entryVersion
  selectedIndex.value = index
  entering.value = true
  sceneError.value = ''
  detailVisible.value = false
  resetCaptions()
  try {
    await engine.enterPanorama(index)
    if (version !== entryVersion) return
    mode.value = 'panorama'
    engine.setTour(tour.value)
    await nextTick()
    page.value?.querySelector<HTMLButtonElement>('.back-to-spiral')?.focus({ preventScroll: true })
  } catch (error) {
    if (version === entryVersion) {
      engine.exitPanorama()
      mode.value = 'overview'
      alignOverviewSelection()
      sceneError.value = error instanceof Error ? error.message : '全景暂时无法加载，请重试。'
    }
  } finally {
    if (version === entryVersion) entering.value = false
  }
}

function exitPanorama() {
  ++entryVersion
  entering.value = false
  loading.value = false
  engine?.exitPanorama()
  engine?.setAutoRotate(autoRotate.value)
  alignOverviewSelection()
  mode.value = 'overview'
  sceneError.value = ''
  detailVisible.value = false
  resetCaptions()
  nextTick(() => {
    const target = returnFocus?.isConnected ? returnFocus : page.value?.querySelector<HTMLButtonElement>('.enter-button')
    target?.focus({ preventScroll: true })
  })
}

function resetCaptions() {
  subtitleIndex.value = 0
  subtitleProgress.value = 0
  elapsed = 0
  lastTick = performance.now()
}

function goToCaption(index: number) {
  subtitleIndex.value = index
  subtitleProgress.value = 0
  elapsed = 0
}

function toggleTour() {
  if (!tour.value && subtitleIndex.value === selected.value.subtitles.length - 1 && subtitleProgress.value >= 1) resetCaptions()
  tour.value = !tour.value
  engine?.setTour(tour.value)
  lastTick = performance.now()
}

function toggleRoam() {
  if (roam.value.phase === 'playing') engine?.pauseRoam()
  else {
    focusedIndex.value = null
    autoRotate.value = false
    engine?.startRoam()
  }
}

function seekRoam(event: Event) {
  engine?.seekRoam(Number((event.target as HTMLInputElement).value) / 1000)
}

function toggleRotation() {
  autoRotate.value = !autoRotate.value
  if (autoRotate.value && focusedIndex.value !== null) resetOverview()
  engine?.setAutoRotate(autoRotate.value)
}

function toggleFocusObservation() {
  if (focusedIndex.value === null || entering.value || !engine) return
  autoRotate.value = false
  engine.setFocusOrbit(!focusOrbit.value)
}

function toggleLifeMotion() {
  lifeMotion.value = !lifeMotion.value
  engine?.setLifeMotion(lifeMotion.value)
}

function observeVolcano() {
  tour.value = false
  engine?.setTour(false)
  engine?.lookAtVolcano()
}

function observeOrganism() {
  tour.value = false
  engine?.setTour(false)
  engine?.lookAtOrganism()
}

function adjacentPeriod(delta: number) {
  const next = selectedIndex.value + delta
  if (next >= 0 && next < periods.length) void enterPeriod(next)
}

function openGuide() {
  engine?.pauseRoam()
  engine?.setFocusOrbit(false)
  guideOpen.value = true
  guideDialog.value?.showModal()
}

function closeGuide() {
  guideDialog.value?.close()
  guideOpen.value = false
  guideButton.value?.focus()
}

async function toggleFullscreen() {
  fullscreenMessage.value = ''
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await page.value?.requestFullscreen()
  } catch {
    fullscreenMessage.value = '此窗口不支持全屏，可使用浏览器全屏模式。'
  }
}

function handleFullscreen() {
  isFullscreen.value = document.fullscreenElement === page.value
  engine?.resize()
}

function handleKeyboard(event: KeyboardEvent) {
  if (guideOpen.value) return
  if (event.key === 'Escape' && roaming.value) { engine?.stopRoam(); return }
  if (mode.value === 'overview' && roaming.value && event.code === 'Space' && !(event.target instanceof Element && event.target.closest('button,a,input:not([type="range"]),select,textarea'))) {
    event.preventDefault(); toggleRoam(); return
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
  if (event.key === 'Escape' && (mode.value === 'panorama' || entering.value)) exitPanorama()
  else if (event.key === 'Escape' && mode.value === 'overview' && focusedIndex.value !== null) resetOverview()
  if (mode.value === 'panorama' && !entering.value && !(event.target instanceof Element && event.target.closest('button,a,input,select,textarea'))) {
    if (event.key === 'ArrowLeft') adjacentPeriod(-1)
    if (event.key === 'ArrowRight') adjacentPeriod(1)
    if (event.code === 'Space') { event.preventDefault(); toggleTour() }
  }
}

function onMotionPreference() {
  reducedMotion.value = media?.matches ?? false
  if (reducedMotion.value) {
    engine?.pauseRoam()
    autoRotate.value = false
    tour.value = false
    lifeMotion.value = false
    engine?.setAutoRotate(false)
    engine?.setTour(false)
    engine?.setLifeMotion(false)
  }
}

function initializeScene() {
  if (!stage.value) return
  sceneError.value = ''
  contextError.value = ''
  illustrationState.value = { failed: 0, retrying: false }
  roam.value = { phase: 'idle', progress: 0, index: selectedIndex.value }
  try {
    engine?.dispose()
    engine = createGeologicScene(stage.value, periods, {
      onFocusOrbitChange: enabled => { focusOrbit.value = enabled },
      onRoamState: state => {
        roam.value = state
        if (state.phase !== 'idle') { selectedIndex.value = state.index; focusedIndex.value = null }
      },
      onSelect: focusPeriod,
      onLabels: value => { labels.value = value },
      onMilestones: value => { milestones.value = value },
      onIllustrationState: state => { illustrationState.value = state },
      onLoadState: state => {
        if (state.source === 'context') {
          contextError.value = state.error
          return
        }
        loading.value = state.loading
        if (state.error) sceneError.value = state.error
      },
    })
    webglReady.value = true
    engine.setSelected(selectedIndex.value)
    engine.setAutoRotate(autoRotate.value)
    engine.setLifeMotion(lifeMotion.value)
  } catch (error) {
    webglReady.value = false
    sceneError.value = error instanceof Error ? error.message : '三维场景初始化失败，请启用浏览器的硬件加速后重试。'
  }
}

onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  onMotionPreference()
  media.addEventListener('change', onMotionPreference)
  initializeScene()
  const requestedEra = new URLSearchParams(window.location.search).get('era')
  const requestedIndex = periods.findIndex(period => period.id === requestedEra)
  if (requestedIndex >= 0) void enterPeriod(requestedIndex)
  document.addEventListener('fullscreenchange', handleFullscreen)
  document.addEventListener('keydown', handleKeyboard)
  lastTick = performance.now()
  timer = setInterval(() => {
    const now = performance.now()
    const delta = Math.min(now - lastTick, 300)
    lastTick = now
    if (mode.value !== 'panorama' || entering.value || !tour.value || guideOpen.value || document.hidden || !captionsVisible.value) return
    elapsed += delta
    subtitleProgress.value = Math.min(elapsed / subtitleDuration, 1)
    if (elapsed >= subtitleDuration) {
      elapsed = 0
      if (subtitleIndex.value < selected.value.subtitles.length - 1) subtitleIndex.value += 1
      else { tour.value = false; engine?.setTour(false); subtitleProgress.value = 1 }
    }
  }, 100)
})

onBeforeUnmount(() => {
  ++entryVersion
  if (timer) clearInterval(timer)
  engine?.dispose()
  media?.removeEventListener('change', onMotionPreference)
  document.removeEventListener('fullscreenchange', handleFullscreen)
  document.removeEventListener('keydown', handleKeyboard)
})
</script>

<template>
  <main ref="page" class="geological-time-page"
    :class="{ 'is-panorama': mode === 'panorama', 'is-entering': entering, 'is-roaming': roaming, 'is-focused': mode === 'overview' && focusedIndex !== null }">
    <header class="course-header">
      <div class="course-brand">
        <a href="javascript:void(0)" class="brand-link" aria-label="智地有申 · 返回课件目录" title="返回课件目录">
          <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
            alt="智地有申" />
        </a>
        <div class="course-heading">
          <span class="eyebrow">地球演化 · 互动课件</span>
          <h1>地质年代的划分</h1>
          <span class="course-time-label">{{ mode === 'overview' ? '46 亿年的时间之旅' : '古环境 · 沉浸式重建' }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button ref="guideButton" class="text-button guide-button" @click="openGuide"><span
            class="info-symbol">i</span>如何划分</button>
        <button class="icon-button fullscreen-button" :aria-label="isFullscreen ? '退出全屏' : '进入全屏'"
          :title="isFullscreen ? '退出全屏' : '进入全屏'" @click="toggleFullscreen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path v-if="!isFullscreen" d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
            <path v-else d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5" />
          </svg>
        </button>
      </div>
    </header>

    <section class="scene-layout" :aria-label="mode === 'overview' ? '可交互的三维地质年代螺旋' : selected.name + '全景'">
      <div ref="stage" class="scene-host" />
      <div class="scene-vignette" aria-hidden="true" />

      <template v-if="mode === 'overview'">
        <div class="overview-intro"><span class="eyebrow">DEEP TIME / 深时</span>
          <p>沿着时间，<br>走进地球的过去。</p><span class="intro-hint">拖动旋转 · 滚轮缩放 · 点击年代聚焦</span>
        </div>
        <div class="projected-labels" aria-label="三维年代标记">
          <svg class="age-leaders" aria-hidden="true">
            <g v-for="milestone in milestones" v-show="milestone.visible && !entering" :key="milestone.index"
              :opacity="focusedIndex !== null && milestone.index !== focusedIndex ? .22 : .5">
              <line :x1="milestone.x" :y1="milestone.y + 8" :x2="milestone.anchorX" :y2="milestone.anchorY" />
              <circle :cx="milestone.anchorX" :cy="milestone.anchorY" r="2" />
            </g>
          </svg>
          <div v-for="milestone in milestones" v-show="milestone.visible && !entering" :key="'age-' + milestone.index"
            class="age-bubble" :class="{ subdued: focusedIndex !== null && milestone.index !== focusedIndex }"
            :style="{ left: milestone.x + 'px', top: milestone.y + 'px' }" :aria-label="milestone.age + milestone.unit">
            <strong>{{ milestone.age }}</strong><small>{{ milestone.unit }}</small>
          </div>
          <button v-for="label in labels" v-show="label.visible && !entering" :key="label.index" class="period-label"
            :class="{ selected: label.index === selectedIndex, subdued: focusedIndex !== null && label.index !== focusedIndex }"
            :style="{ left: label.x + 'px', top: label.y + 'px', '--period-color': periods[label.index]?.color }"
            :tabindex="-1" :aria-pressed="label.index === focusedIndex"
            :aria-label="'聚焦' + periods[label.index]?.name + '区段'" @click="focusPeriod(label.index)">
            <span class="label-dot" /><span>{{ periods[label.index]?.name }}</span><small
              v-if="focusedIndex === label.index">正在近览</small>
          </button>
        </div>

        <aside class="selected-card" :style="{ '--period-color': selected.color }">
          <div class="card-kicker"><span class="tiny-line" />{{ selected.eon }}<template v-if="selected.era"> / {{
            selected.era }}</template>
          </div>
          <div class="card-heading">
            <h2>{{ selected.name }}</h2><span>{{ String(selectedIndex + 1).padStart(2, '0') }} / 15</span>
          </div>
          <p class="age-label">{{ selected.ageLabel }}</p>
          <p class="period-hook">{{ selected.hook }}</p>
          <div class="card-actions">
            <button class="enter-button" :disabled="entering || !webglReady"
              @click="enterPeriod(selectedIndex)"><span>走进{{
                selected.name }}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                <path d="M4 12h15m-6-6 6 6-6 6" />
              </svg></button>
            <button v-if="focusedIndex !== null && !roaming" class="focus-orbit-button" :class="{ active: focusOrbit }"
              :aria-pressed="focusOrbit" :disabled="entering || !webglReady"
              :title="focusOrbit ? '停止旋转，保留当前视角' : '围绕当前区段旋转一周'" @click="toggleFocusObservation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path v-if="focusOrbit" d="M9 5v14M15 5v14" />
                <path v-else d="M20 7V3m0 4h-4M4 17v4m0-4h4M5.1 8a8 8 0 0 1 13.7-2L20 7M4 17l1.2 1A8 8 0 0 0 19 16" />
              </svg>
              <span>{{ focusOrbit ? '停止旋转' : '360°观察' }}</span>
            </button>
          </div>
          <div class="card-footnote" aria-live="polite">{{ focusOrbit ? '正在环绕此区段 · 拖动或滚轮可停止' : roaming ?
            '沿白色箭头由古至今·可暂停近览' :
            focusedIndex !== null ? '正在近览此区段 · 可进入全景或旋转观察' : '点击年代聚焦 · 全景由此进入' }}</div>
        </aside>

        <div class="scene-tools">
          <button class="tool-button roam-button" :class="{ active: roaming }" :disabled="entering || !webglReady"
            :aria-pressed="roam.phase === 'playing'" @click="toggleRoam"><svg viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path v-if="roam.phase === 'playing'" d="M8 5v14M16 5v14" />
              <path v-else d="m9 5 11 7-11 7V5ZM4 5v14" />
            </svg>{{ roamButtonLabel }}</button>
          <button v-if="roaming" class="tool-button" @click="engine?.stopRoam()"><span
              aria-hidden="true">↗</span>退出漫游</button>
          <button v-if="!roaming" class="tool-button" :class="{ active: autoRotate }" :aria-pressed="autoRotate"
            @click="toggleRotation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 7V3m0 4h-4M4 17v4m0-4h4M5.1 8a8 8 0 0 1 13.7-2L20 7M4 17l1.2 1A8 8 0 0 0 19 16" />
            </svg>{{ autoRotate ? '停止环绕' : '自动环绕' }}</button>
          <button v-if="!roaming" class="tool-button" @click="resetOverview"><svg viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.5">
              <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
            </svg>{{ focusedIndex !== null ? '返回完整螺旋' : '复位视角' }}</button>
        </div>
        <div v-if="roaming" class="roam-progress">
          <div class="roam-progress-heading"><span aria-live="polite">{{ roam.phase === 'finished' ? '漫游结束' : roam.phase
            ===
            'paused' ? '已暂停 · 拖动自由观察' : '沿箭头上升' }} · {{ selected.name }}</span><span>{{ Math.round(roam.progress *
                100)
              }}%</span></div>
          <input type="range" min="0" max="1000" step="1" :value="Math.round(roam.progress * 1000)" aria-label="漫游进度"
            :aria-valuetext="selected.name + '，' + Math.round(roam.progress * 100) + '%'" @input="seekRoam" />
          <small>拖动进度定位 · 空格暂停 / 继续 · Esc 返回螺旋</small>
        </div>
        <div class="scale-note"><span class="axis-line" />教材图示 · 单位：亿年 · 螺旋长度不代表时长</div>
      </template>

      <template v-else>
        <div class="panorama-top">
          <button class="back-to-spiral" @click="exitPanorama"><span aria-hidden="true">←</span>返回年代螺旋</button>
          <div class="reconstruction-badge"><span />古环境艺术复原</div>
        </div>
        <div class="panorama-title">
          <div class="panorama-breadcrumb"><span v-for="(part, index) in breadcrumb" :key="index">{{ part }}<i
                v-if="index < breadcrumb.length - 1">/</i></span></div>
          <h2>{{ selected.name }}</h2>
          <p>{{ selected.representativeAge }}<span>·</span>{{ selected.location }}</p>
        </div>
        <div class="panorama-actions">
          <button class="round-control" :class="{ active: tour }" :aria-pressed="tour" @click="toggleTour"><span
              aria-hidden="true">{{ tour ? 'Ⅱ' : '▷' }}</span>{{ tour ? '暂停导览' : '播放导览' }}</button>
          <button class="round-control" :class="{ active: captionsVisible }" :aria-pressed="captionsVisible"
            @click="captionsVisible = !captionsVisible"><span class="cc-icon">CC</span>字幕</button>
          <button class="round-control" :class="{ active: lifeMotion }" :aria-pressed="lifeMotion"
            @click="toggleLifeMotion"><span aria-hidden="true">∿</span>{{ selectedIndex < 3 ? '环境动态' : '生态动态'
            }}</button>
              <button v-if="selectedIndex < 2" class="round-control" @click="observeVolcano"><span
                  aria-hidden="true">△</span>观察火山</button>
              <button v-if="selectedIndex >= 3" class="round-control" @click="observeOrganism"><span
                  aria-hidden="true">⌖</span>观察生物</button>
              <button class="round-control" :class="{ active: detailVisible }" :aria-expanded="detailVisible"
                @click="detailVisible = !detailVisible"><span class="info-symbol">i</span>时代档案</button>
        </div>
        <div class="panorama-drag-hint">拖动环顾四周 · 滚轮调整视野</div>

        <Transition name="drawer">
          <aside v-if="detailVisible" class="era-drawer" aria-label="时代档案">
            <header><span class="eyebrow">时代档案</span><button class="icon-button" aria-label="关闭时代档案"
                @click="detailVisible = false">×</button></header>
            <h3>{{ selected.name }}</h3>
            <p class="drawer-age">{{ selected.ageLabel }}</p>
            <p class="drawer-summary">{{ selected.summary }}</p>
            <dl class="era-facts">
              <div v-for="fact in selected.facts" :key="fact.label">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            </dl>
            <h4>此处的生命</h4>
            <ul v-if="selected.organisms.length" class="organisms">
              <li v-for="organism in selected.organisms" :key="organism.name"><span class="organism-marker"
                  :class="organism.kind" />
                <div><strong>{{ organism.name }}</strong>
                  <p>{{ organism.note }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="no-life">尚无可确认的生命化石证据。</p>
            <p class="reconstruction-note">图像为依据科学资料生成的代表性古环境；色彩、天气及个体外观包含艺术重建。生物动作仅作行为示意。</p>
          </aside>
        </Transition>

        <div v-if="captionsVisible && !entering" class="cinema-captions">
          <div class="caption-counter"><span>{{ String(subtitleIndex + 1).padStart(2, '0') }}</span> / {{
            String(selected.subtitles.length).padStart(2, '0') }}<i /></div>
          <Transition name="caption" mode="out-in">
            <p :key="selected.id + subtitleIndex" aria-live="polite">{{ subtitle }}</p>
          </Transition>
          <div class="caption-steps"><button v-for="(_, index) in selected.subtitles" :key="index"
              :aria-label="'第' + (index + 1) + '段字幕'" :aria-current="subtitleIndex === index ? 'step' : undefined"
              @click="goToCaption(index)"><i
                :style="{ width: (index < subtitleIndex ? 100 : index === subtitleIndex ? subtitleProgress * 100 : 0) + '%' }" /></button>
          </div>
        </div>
        <nav class="panorama-navigation" aria-label="切换全景年代"><button :disabled="selectedIndex === 0 || entering"
            @click="adjacentPeriod(-1)">←<span>{{ periods[selectedIndex - 1]?.name ?? '地球诞生' }}</span></button><span
            class="panorama-position">{{ String(selectedIndex + 1).padStart(2, '0') }}<i>/</i>15</span><button
            :disabled="selectedIndex === periods.length - 1 || entering" @click="adjacentPeriod(1)"><span>{{
              periods[selectedIndex + 1]?.name ?? '今天' }}</span>→</button></nav>
      </template>

      <Transition name="veil">
        <div v-if="entering" class="transition-veil" role="status" aria-live="polite"><span
            class="eyebrow">正在穿越地质时间</span>
          <h2>{{ selected.name }}</h2>
          <p>{{ selected.representativeAge }}</p><span class="loading-line" /><span class="loading-description">{{
            loading ?
              '正在展开 360° 古环境' : '镜头正在进入古环境' }}</span><button class="cancel-entry" @click="exitPanorama">返回螺旋</button>
        </div>
      </Transition>
      <div v-if="(contextError || (!webglReady && sceneError)) && !entering" class="scene-error" role="alert"><strong>{{
        contextError ? '三维画面正在恢复' : '三维场景暂时无法启动' }}</strong>
        <p>{{ contextError || sceneError }}</p><button v-if="!contextError"
          @click="initializeScene">重新尝试</button><button v-if="webglReady" class="dismiss-error"
          @click="dismissSceneError">关闭</button>
      </div>
      <div v-if="webglReady && !contextError && !entering" class="load-notices">
        <div v-if="sceneError" class="resource-notice" role="status" aria-live="polite"><span>{{ sceneError
        }}</span><button @click="enterPeriod(selectedIndex)">重试全景</button><button aria-label="关闭全景加载提示"
            @click="sceneError = ''">×</button>
        </div>
        <div v-if="mode === 'overview' && illustrationState.failed > 0" class="resource-notice" role="status"
          aria-live="polite"><span>部分生态素材未加载，可继续浏览。</span><button :disabled="illustrationState.retrying"
            @click="engine?.retryIllustrations()">{{ illustrationState.retrying ? '正在重试…' : '重试素材' }}</button></div>
      </div>
      <p v-if="fullscreenMessage" class="fullscreen-message" role="status">{{ fullscreenMessage }}<button
          aria-label="关闭提示" @click="fullscreenMessage = ''">×</button></p>
    </section>

    <nav v-if="mode === 'overview'" class="chronology" aria-label="按宙和代浏览地质年代">
      <div class="chronology-heading"><span>点击年代，靠近这一段地球历史</span><span>过去 <span aria-hidden="true">────────→</span>
          现在</span></div>
      <div class="chronology-scroll">
        <div class="chronology-tracks">
          <div id="phanerozoic-range" class="eon-range" aria-label="显生宙范围：古生代、中生代、新生代"><span>显生宙</span></div>
          <div v-for="(group, groupIndex) in groups" :key="group.name" class="time-group"
            :style="{ '--group-color': group.color, gridColumn: groupIndex + 1 }"
            :aria-describedby="groupIndex > 0 ? 'phanerozoic-range' : undefined">
            <div class="group-heading"><span>{{ group.name }}</span><small v-if="group.sub">{{ group.sub }}</small>
            </div>
            <div class="period-buttons">
              <button v-for="index in group.indices" :key="periods[index]?.id"
                :class="{ active: selectedIndex === index }" :style="{ '--period-color': periods[index]?.color }"
                :disabled="entering || !webglReady" :aria-pressed="focusedIndex === index"
                :aria-label="'聚焦' + periods[index]?.name + '，起始于' + textbookStartAge(index) + '亿年前'"
                @click="focusPeriod(index)"><span>{{ periods[index]?.name }}</span><small>{{ textbookStartAge(index)
                }}</small></button>
            </div>
          </div>
        </div>
      </div>
      <div class="chronology-note"><span>各年代起始 · 距今亿年</span><span>年代数值、单位按教材图1-28</span></div>
    </nav>

    <dialog ref="guideDialog" class="science-dialog" @close="guideOpen = false" @cancel="guideOpen = false"
      @click="($event.target === guideDialog) && closeGuide()">
      <article>
        <header>
          <div><span class="eyebrow">读懂地质时间</span>
            <h2>地球的历史，如何划分？</h2>
          </div><button class="icon-button" aria-label="关闭说明" @click="closeGuide">×</button>
        </header>
        <div class="rank-diagram">
          <div><small>最大的单位</small><strong>宙</strong><span>显生宙</span></div><b>›</b>
          <div><small>宙的下一级</small><strong>代</strong><span>中生代</span></div><b>›</b>
          <div><small>代的下一级</small><strong>纪</strong><span>侏罗纪</span></div>
        </div>
        <p>科学家依据岩层的先后关系、化石组合及地球环境变化划分地质时间，再通过同位素定年等方法确定数值年龄。许多界线由全球界线层型剖面和点位（GSSP，俗称“金钉子”）定义。</p>
        <dl class="guide-notes">
          <div>
            <dt>沿螺旋由古至今</dt>
            <dd>螺旋用于表现时间顺序，长度、宽度与高度均不按时长等比例绘制。它也不代表生物演化有预定方向。早期三个宙在此作为概览，内部的代、纪未逐一展开。</dd>
          </div>
          <div>
            <dt>年代数值与教材图一致</dt>
            <dd>外圈、年份气泡、时间轴和年代区间均按教材图1-28，单位为亿年，表示距今的年龄。第四纪起始值为0.0258亿年，即258万年。数值越大，距今越久；各纪按先后顺序衔接。</dd>
          </div>
          <div>
            <dt>每个全景是一处代表性环境</dt>
            <dd>总览并置各时期不同地区的代表生物；全景呈现该时期的一处特定环境，并标注具体时段和地点；尚无确切证据的外观以艺术重建呈现。绿藻安排在元古宙，太古宙的生命以微生物为代表。</dd>
          </div>
        </dl>
        <h3>科学资料</h3>
        <ul class="source-links">
          <li v-for="citation in citations" :key="citation.url"><a :href="citation.url" target="_blank"
              rel="noopener noreferrer">{{ citation.label }} ↗</a></li>
        </ul><button class="guide-done" @click="closeGuide">开始探索</button>
      </article>
    </dialog>
  </main>
</template>

<style scoped>
.geological-time-page {
  --ink: #e9edf0;
  --muted: #a4b3c1;
  --gold: #e8c184;
  --night: #091722;
  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 540px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--night);
  color: var(--ink);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color-scheme: dark
}

.geological-time-page * {
  box-sizing: border-box
}

.geological-time-page button,
.geological-time-page a {
  -webkit-tap-highlight-color: transparent
}

.geological-time-page button {
  font: inherit;
  cursor: pointer
}

.geological-time-page button:disabled {
  cursor: default;
  opacity: .4
}

.geological-time-page button:focus-visible,
.geological-time-page a:focus-visible {
  outline: 2px solid #efcd93;
  outline-offset: 5px
}

.geological-time-page button {
  border: 0
}

svg {
  width: 21px;
  height: 21px;
  flex-shrink: 0
}

h1,
h2,
h3,
h4,
p {
  margin: 0
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  font-weight: 500
}

.course-brand {
  display: flex;
  align-items: center;
  gap: 21px
}

.home-link {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: #4e626b;
  border-right: 1px solid #ced2cc;
  padding-right: 13px;
  box-sizing: content-box
}

.home-link svg {
  width: 22px;
  height: 22px
}

.course-brand .eyebrow {
  color: #768080;
  letter-spacing: 2.5px;
  font-size: 10px
}

.course-brand h1 {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 2px;
  line-height: 1.6
}

.header-center {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  letter-spacing: 2px;
  color: #65747b
}

.status-dot,
.reconstruction-badge span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #758b82
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 27px
}

.text-button,
.icon-button {
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px
}

.text-button {
  font-size: 12px !important;
  padding: 10px 0
}

.icon-button {
  width: 32px;
  height: 32px;
  font-size: 25px !important
}

.info-symbol {
  display: inline-grid;
  place-items: center;
  font-family: Georgia, serif;
  font-style: italic;
  border: 1px solid currentColor;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  font-size: 12px
}

.scene-layout {
  position: relative;
  flex: 1;
  min-height: 0;
  isolation: isolate
}

.scene-host {
  position: absolute;
  inset: 0;
  touch-action: none;
  outline: none
}

.scene-host :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block
}

.scene-vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(5, 17, 27, .42), transparent 35%, transparent 80%, rgba(5, 17, 27, .1)), linear-gradient(0deg, rgba(6, 20, 30, .36), transparent 20%)
}

.overview-intro {
  position: absolute;
  top: 34px;
  left: 35px;
  z-index: 3;
  pointer-events: none
}

.overview-intro>.eyebrow {
  font-size: 9px;
  color: #829aa9;
  letter-spacing: 3px
}

.overview-intro>p {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 29px;
  line-height: 1.55;
  letter-spacing: 3px;
  color: #e8e7df;
  margin-top: 16px
}

.intro-hint {
  display: block;
  margin-top: 18px;
  font-size: 10px;
  color: #8ea5b3;
  letter-spacing: 1px
}

.selected-card {
  position: absolute;
  left: 35px;
  bottom: 55px;
  width: 238px;
  z-index: 5;
  padding: 21px 0 0;
  border-top: 1px solid #ffffff30
}

.card-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  letter-spacing: 2px;
  color: #b3c4cb
}

.tiny-line {
  width: 15px;
  height: 2px;
  background: var(--period-color)
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px
}

.card-heading h2 {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-weight: 500;
  font-size: 36px;
  letter-spacing: 5px
}

.card-heading>span {
  font-size: 10px;
  color: #7c94a3;
  letter-spacing: 2px
}

.age-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: #aec0cb;
  margin-top: 7px;
  line-height: 1.8
}

.period-hook {
  font-size: 13px;
  line-height: 1.9;
  color: #b3c2c8;
  margin-top: 16px;
  min-height: 48px
}

.enter-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #e9c78e;
  color: #172e37;
  padding: 14px 17px;
  margin-top: 20px;
  font-size: 13px !important;
  letter-spacing: 1.5px;
  transition: background .2s, transform .2s
}

.enter-button:hover {
  background: #f2d4a2;
  transform: translateY(-2px)
}

.enter-button svg {
  width: 19px
}

.card-footnote {
  margin-top: 11px;
  font-size: 9px;
  letter-spacing: 2px;
  color: #728e9f
}

.scene-tools {
  position: absolute;
  top: 31px;
  right: 31px;
  display: flex;
  gap: 6px;
  z-index: 6
}

.tool-button {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #132b37ad;
  color: #acbdc5;
  border: 1px solid #94b4c024 !important;
  font-size: 10px !important;
  letter-spacing: .5px;
  padding: 9px 11px;
  backdrop-filter: blur(10px)
}

.tool-button svg {
  width: 16px;
  height: 16px
}

.tool-button.active {
  color: #ecd1a3;
  background: #35403d
}

.tool-button:hover {
  background: #28424c
}

.projected-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
  overflow: hidden
}

.period-label {
  position: absolute;
  transform: translate(-50%, -100%);
  white-space: nowrap;
  background: rgba(8, 26, 36, .83);
  border: 1px solid #adc2d13a !important;
  backdrop-filter: blur(8px);
  color: #dbe7eb;
  font-size: 11px !important;
  line-height: 1.1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 3px;
  pointer-events: auto;
  box-shadow: 0 3px 14px #0003
}

.period-label::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  width: 1px;
  height: 13px;
  background: #adc2d155
}

.label-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--period-color)
}

.period-label.selected,
.period-label:hover {
  color: #f4d398;
  border-color: #d6be7f99 !important;
  background: #1d3037
}

.period-label small {
  font-size: 8px;
  color: #c5b18c;
  border-left: 1px solid #e5c68950;
  padding-left: 6px
}

.scale-note {
  position: absolute;
  bottom: 21px;
  right: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 9px;
  letter-spacing: 1px;
  color: #829aa9;
  z-index: 3
}

.axis-line {
  width: 30px;
  height: 1px;
  background: #718993;
  position: relative
}

.axis-line:after {
  content: '';
  border-left: 4px solid #718993;
  border-top: 3px solid transparent;
  border-bottom: 3px solid transparent;
  position: absolute;
  right: -1px;
  top: -2.5px
}

.chronology {
  flex-shrink: 0;
  background: #0b1b26;
  z-index: 15;
  border-top: 1px solid #657b8533;
  padding: 16px 34px 12px
}

.chronology-heading,
.chronology-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 1px;
  color: #8099a8
}

.chronology-heading {
  margin-bottom: 16px
}

.chronology-heading>span:first-child {
  font-size: 11px;
  color: #c7d3d8
}

.chronology-heading>span:last-child {
  letter-spacing: 2px
}

.chronology-scroll {
  display: flex;
  gap: 23px;
  overflow: auto;
  padding: 2px 1px 8px;
  scrollbar-width: thin;
  scrollbar-color: #395564 transparent
}

.time-group {
  min-width: 0;
  flex-basis: 0
}

.group-heading {
  border-top: 2px solid var(--group-color);
  padding-top: 9px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--group-color);
  font-size: 10px;
  letter-spacing: 2px;
  margin-bottom: 9px
}

.group-heading small {
  font-size: 8px;
  letter-spacing: 1px;
  color: #77909f
}

.period-buttons {
  display: flex;
  gap: 3px
}

.period-buttons button {
  flex: 1;
  background: #152936;
  color: #bfccd2;
  padding: 9px 1px 7px;
  min-width: 52px;
  transition: background .15s;
  border: 1px solid transparent !important;
  border-radius: 2px
}

.period-buttons button.active {
  background: #2c464b;
  border-color: #c6b58170 !important;
  color: #f6dbad
}

.period-buttons button:hover {
  background: #385054
}

.period-buttons button>span {
  font-size: 10px;
  letter-spacing: 1px;
  display: block;
  white-space: nowrap
}

.period-buttons button>small {
  font-size: 8px;
  color: #7e9aa9;
  display: block;
  margin-top: 5px;
  font-variant-numeric: tabular-nums
}

.period-buttons button.active small {
  color: #c6b58d
}

.chronology-note {
  font-size: 8px;
  padding-top: 1px;
  letter-spacing: .5px
}

.is-panorama .scene-vignette {
  background: linear-gradient(180deg, #0009, transparent 37%, transparent 56%, #000b), linear-gradient(90deg, #0004, transparent 50%)
}

.panorama-top {
  position: absolute;
  left: 34px;
  right: 34px;
  top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 3
}

.back-to-spiral {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #14252f88;
  border: 1px solid #dce7ef45 !important;
  color: #e1e7eb;
  padding: 10px 15px;
  font-size: 11px !important;
  letter-spacing: 1px;
  backdrop-filter: blur(8px)
}

.back-to-spiral>span {
  font-size: 20px;
  line-height: 15px
}

.reconstruction-badge {
  display: flex;
  gap: 9px;
  align-items: center;
  font-size: 10px;
  letter-spacing: 2px;
  color: #d1dadf;
  text-shadow: 0 1px 6px #000
}

.reconstruction-badge span {
  background: #d5b87f
}

.panorama-title {
  position: absolute;
  top: 101px;
  left: 37px;
  z-index: 3;
  pointer-events: none;
  text-shadow: 0 2px 18px #0009
}

.panorama-breadcrumb {
  display: flex;
  font-size: 10px;
  letter-spacing: 2px;
  color: #d9dfe0;
  gap: 10px
}

.panorama-breadcrumb i {
  font-style: normal;
  margin-left: 10px;
  color: #9ea6a8
}

.panorama-title h2 {
  font-size: 49px;
  font-weight: 500;
  letter-spacing: 7px;
  line-height: 1.8;
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif
}

.panorama-title>p {
  font-size: 11px;
  letter-spacing: 1px;
  color: #cbd7de;
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  max-width: 550px;
  line-height: 1.8
}

.panorama-actions {
  position: absolute;
  top: 85px;
  right: 34px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
  z-index: 5
}

.round-control {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e0e4e4;
  background: #11232f80;
  border: 1px solid #dce7ef30 !important;
  padding: 9px 12px;
  font-size: 10px !important;
  letter-spacing: 1px;
  backdrop-filter: blur(12px);
  min-width: 106px
}

.round-control>span {
  width: 19px;
  text-align: center;
  font-size: 17px
}

.round-control.active {
  background: #283c459e;
  border-color: #f0d1a65e !important;
  color: #f4d6a9
}

.round-control .info-symbol {
  width: 16px;
  height: 16px;
  font-size: 12px;
  margin-right: 3px
}

.round-control .cc-icon {
  font-size: 9px;
  letter-spacing: -.5px;
  border: 1px solid currentColor;
  height: 14px;
  line-height: 12px
}

.panorama-drag-hint {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  letter-spacing: 2px;
  color: #d1d9dcaa;
  z-index: 3;
  pointer-events: none
}

.cinema-captions {
  position: absolute;
  bottom: 102px;
  left: 50%;
  transform: translateX(-50%);
  width: min(75%, 950px);
  z-index: 4;
  text-align: center;
  pointer-events: none
}

.caption-counter {
  font-size: 9px;
  letter-spacing: 3px;
  color: #c9d4dcaa;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-bottom: 14px
}

.caption-counter>span {
  color: #edc995
}

.caption-counter>i {
  display: none
}

.cinema-captions>p {
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 23px;
  line-height: 1.8;
  letter-spacing: 2px;
  text-shadow: 0 2px 4px #000, 0 3px 22px #000, 0 0 44px #000;
  min-height: 42px;
  color: #fffdf2
}

.caption-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  pointer-events: auto
}

.caption-steps button {
  position: relative;
  width: 56px;
  height: 44px;
  flex-shrink: 0;
  background: transparent;
  padding: 0;
  touch-action: manipulation
}

.caption-steps button:before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 19px;
  height: 6px;
  border-radius: 3px;
  background: #d3dce35e;
  transition: background .15s
}

.caption-steps button:hover:before,
.caption-steps button:focus-visible:before {
  background: #e4edf195
}

.caption-steps i {
  display: block;
  position: absolute;
  top: 19px;
  left: 0;
  background: #ebcc95;
  height: 6px;
  border-radius: 3px;
  pointer-events: none;
  transition: width .1s linear
}

.panorama-navigation {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 26px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between
}

.panorama-navigation>button {
  display: flex;
  gap: 12px;
  align-items: center;
  color: #edf1f2;
  background: transparent;
  padding: 12px 4px;
  font-size: 19px !important
}

.panorama-navigation>button>span {
  font-size: 11px;
  letter-spacing: 2px
}

.panorama-position {
  font-size: 10px;
  letter-spacing: 2px;
  color: #c0cdd3
}

.panorama-position i {
  font-style: normal;
  color: #8496a0;
  margin: 0 15px
}

.era-drawer {
  position: absolute;
  right: 164px;
  top: 83px;
  bottom: 95px;
  width: 335px;
  z-index: 8;
  background: #0e202bea;
  backdrop-filter: blur(20px);
  border: 1px solid #a6b6c333;
  padding: 20px 24px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: #38505e transparent;
  box-shadow: 0 8px 40px #0003
}

.era-drawer>header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a1b1bd;
  margin-bottom: 12px
}

.era-drawer .eyebrow {
  font-size: 9px
}

.era-drawer h3 {
  font-family: 'SimSun', serif;
  font-size: 27px;
  letter-spacing: 3px;
  font-weight: 500
}

.drawer-age {
  font-size: 10px;
  color: #d7bd91;
  line-height: 1.8;
  margin: 10px 0 16px
}

.drawer-summary {
  font-size: 12px;
  line-height: 2;
  color: #b8c7d0
}

.era-facts {
  margin: 20px 0;
  padding: 16px 0;
  border-top: 1px solid #aabcca30;
  border-bottom: 1px solid #aabcca30
}

.era-facts>div+div {
  margin-top: 12px
}

.era-facts dt {
  font-size: 10px;
  color: #7d9aab;
  margin-bottom: 6px
}

.era-facts dd {
  font-size: 11px;
  line-height: 1.8;
  margin: 0;
  color: #d7e0e4
}

.era-drawer h4 {
  font-weight: 400;
  font-size: 11px;
  letter-spacing: 2px;
  margin-bottom: 18px;
  color: #e8cfaa
}

.organisms {
  list-style: none;
  padding: 0;
  margin: 0
}

.organisms>li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px
}

.organisms strong {
  font-size: 11px;
  font-weight: 500
}

.organisms p {
  font-size: 10px;
  line-height: 1.8;
  color: #91aab9;
  margin-top: 4px
}

.organism-marker {
  width: 5px;
  height: 5px;
  background: #bfb58b;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0
}

.organism-marker.plant {
  background: #9cb589
}

.organism-marker.microbe {
  background: #91bfc7
}

.reconstruction-note {
  font-size: 9px;
  line-height: 1.9;
  color: #7b95a5;
  border-top: 1px solid #aabcca30;
  padding-top: 15px;
  margin-top: 17px
}

.no-life {
  font-size: 11px;
  color: #a0b2bf;
  line-height: 1.8
}

.transition-veil {
  position: absolute;
  inset: 0;
  background: #071520ed;
  backdrop-filter: blur(12px);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #e9ddc2
}

.transition-veil>.eyebrow {
  font-size: 10px;
  color: #94a8b8;
  letter-spacing: 5px
}

.transition-veil>h2 {
  font-family: 'SimSun', serif;
  font-weight: 400;
  font-size: 55px;
  letter-spacing: 13px;
  margin: 25px 0 15px
}

.transition-veil>p {
  color: #9cb2bf;
  font-size: 12px;
  letter-spacing: 3px
}

.loading-line {
  width: 130px;
  height: 1px;
  background: #3c505b;
  margin-top: 40px;
  position: relative;
  overflow: hidden
}

.loading-line:after {
  content: '';
  position: absolute;
  inset: 0;
  background: #e5c48f;
  transform: translateX(-100%);
  animation: loading 1.8s ease-in-out infinite
}

.loading-description {
  margin-top: 13px;
  font-size: 9px;
  letter-spacing: 2px;
  color: #7992a2
}

.cancel-entry {
  position: absolute;
  bottom: 35px;
  color: #c0cdd3;
  font-size: 10px !important;
  background: transparent;
  padding: 10px 15px;
  border: 1px solid #546a7444 !important;
  letter-spacing: 2px
}

.scene-error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(90%, 450px);
  padding: 27px 30px;
  background: #102b3af5;
  border: 1px solid #7d9bab80;
  z-index: 40;
  box-shadow: 0 20px 80px #0008
}

.scene-error strong {
  font-size: 17px;
  font-weight: 500
}

.scene-error p {
  font-size: 12px;
  line-height: 2;
  color: #b9cbd4;
  margin: 13px 0
}

.scene-error button {
  padding: 10px 14px;
  background: #e7c58c;
  color: #142c38;
  font-size: 12px !important;
  margin: 8px 10px 0 0
}

.scene-error button.dismiss-error {
  background: transparent;
  color: #ccd8de;
  border: 1px solid #6f899d80 !important
}

.fullscreen-message {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: #263e4de8;
  color: #e8edf0;
  padding: 10px 18px;
  font-size: 11px;
  z-index: 50
}

.fullscreen-message button {
  background: transparent;
  color: inherit;
  font-size: 18px;
  margin-left: 12px
}

.science-dialog {
  color: #253c47;
  color-scheme: light;
  background: transparent;
  padding: 0;
  border: 0;
  max-width: 690px;
  width: calc(100% - 36px);
  max-height: calc(100dvh - 54px);
  margin: auto;
  box-shadow: 0 24px 120px #0006;
  overflow: auto;
  scrollbar-width: thin
}

.science-dialog::backdrop {
  background: #020d18b3;
  backdrop-filter: blur(6px)
}

.science-dialog>article {
  background: #f3f0e8;
  padding: 31px 38px 30px
}

.science-dialog header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px
}

.science-dialog .eyebrow {
  font-size: 9px;
  color: #8b8b78
}

.science-dialog h2 {
  font-family: 'SimSun', serif;
  font-size: 25px;
  letter-spacing: 2px;
  font-weight: 500;
  margin-top: 10px
}

.science-dialog>article>p {
  font-size: 12px;
  line-height: 2.1;
  color: #57696f;
  margin-top: 23px
}

.rank-diagram {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 21px 12px;
  background: #e5e6dd
}

.rank-diagram>div {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 9px
}

.rank-diagram small {
  font-size: 9px;
  color: #7b8c8b;
  letter-spacing: 1px
}

.rank-diagram strong {
  font-family: 'SimSun', serif;
  font-weight: 500;
  font-size: 31px
}

.rank-diagram span {
  font-size: 11px;
  color: #667d7d;
  letter-spacing: 2px
}

.rank-diagram b {
  font-size: 25px;
  color: #a4b0a9;
  font-weight: 300
}

.guide-notes {
  margin: 23px 0
}

.guide-notes>div+div {
  margin-top: 17px
}

.guide-notes dt {
  font-size: 12px;
  font-weight: 600;
  color: #3b535c;
  margin-bottom: 5px
}

.guide-notes dd {
  font-size: 11px;
  line-height: 2;
  color: #6b7d82;
  margin-left: 0
}

.science-dialog h3 {
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 500;
  border-top: 1px solid #cfd4cc;
  padding-top: 20px
}

.source-links {
  padding-left: 16px;
  line-height: 1.9;
  color: #8e9a8e;
  margin: 10px 0 23px;
  font-size: 10px
}

.source-links a {
  color: #48706c;
  text-underline-offset: 3px
}

.guide-done {
  background: #234e54;
  color: #f5f0e2;
  padding: 12px 20px;
  width: 100%;
  font-size: 12px !important;
  letter-spacing: 3px
}

.caption-enter-active,
.caption-leave-active {
  transition: opacity .45s, transform .45s
}

.caption-enter-from {
  opacity: 0;
  transform: translateY(7px)
}

.caption-leave-to {
  opacity: 0;
  transform: translateY(-7px)
}

.veil-enter-active {
  transition: opacity .35s
}

.veil-leave-active {
  transition: opacity 1s;
  pointer-events: none
}

.veil-enter-from,
.veil-leave-to {
  opacity: 0
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity .25s, transform .25s
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateX(12px)
}

@keyframes loading {
  to {
    transform: translateX(100%)
  }
}

:global(.app-container:has(.geological-time-page)>.back-home-btn) {
  display: none
}

@media(min-width:1650px) {
  .overview-intro {
    top: 45px;
    left: 46px
  }

  .overview-intro>p {
    font-size: 34px
  }

  .selected-card {
    left: 46px;
    bottom: 65px;
    width: 265px
  }

  .chronology {
    padding: 18px 44px 16px
  }

  .period-buttons button {
    padding: 13px 3px 10px
  }

  .period-buttons button>span {
    font-size: 12px
  }

  .period-buttons button>small {
    font-size: 10px
  }

  .group-heading {
    font-size: 12px
  }

  .card-heading h2 {
    font-size: 40px
  }

  .period-hook {
    font-size: 14px
  }

  .chronology-heading>span:first-child {
    font-size: 12px
  }

  .period-label {
    font-size: 12px !important;
    padding: 8px 11px
  }
}

@media(max-width:1100px) {
  .course-brand h1 {
    font-size: 21px
  }

  .header-center {
    display: none
  }

  .overview-intro {
    left: 24px;
    top: 27px
  }

  .overview-intro>p {
    font-size: 24px
  }

  .intro-hint {
    font-size: 9px;
    letter-spacing: 0
  }

  .selected-card {
    left: 24px;
    width: 200px;
    bottom: 40px
  }

  .card-heading h2 {
    font-size: 30px
  }

  .period-hook {
    font-size: 11px;
    min-height: 42px;
    margin-top: 10px
  }

  .age-label {
    font-size: 9px
  }

  .enter-button {
    font-size: 11px !important;
    padding: 12px 14px;
    margin-top: 13px
  }

  .chronology {
    padding: 13px 24px 10px
  }

  .chronology-scroll {
    gap: 16px
  }

  .time-group {
    min-width: max-content
  }

  .period-buttons button {
    min-width: 53px
  }

  .scene-tools {
    top: 24px;
    right: 24px
  }

  .period-label {
    font-size: 10px !important;
    padding: 6px 7px
  }

  .panorama-title h2 {
    font-size: 41px
  }

  .cinema-captions>p {
    font-size: 21px
  }

  .era-drawer {
    right: 150px;
    width: 310px
  }
}

@media(max-width:760px) {
  .geological-time-page {
    min-height: 570px
  }

  .course-brand {
    gap: 12px
  }

  .home-link {
    width: 24px;
    padding-right: 10px
  }

  .course-brand .eyebrow {
    font-size: 8px;
    letter-spacing: 1.5px
  }

  .course-brand h1 {
    font-size: 18px;
    letter-spacing: 1.5px
  }

  .header-actions {
    gap: 13px
  }

  .text-button {
    font-size: 10px !important
  }

  .info-symbol {
    width: 15px;
    height: 15px
  }

  .fullscreen-button {
    display: none
  }

  .overview-intro {
    top: 21px;
    left: 19px
  }

  .overview-intro>.eyebrow {
    font-size: 8px
  }

  .overview-intro>p {
    font-size: 22px;
    line-height: 1.4;
    margin-top: 10px
  }

  .intro-hint {
    display: none
  }

  .scene-tools {
    right: 15px;
    top: 20px;
    flex-direction: column
  }

  .tool-button {
    padding: 8px;
    font-size: 9px !important
  }

  .selected-card {
    left: 19px;
    right: 19px;
    bottom: 32px;
    width: auto;
    padding-top: 13px;
    display: grid;
    grid-template-columns: 1fr 150px;
    column-gap: 18px;
    pointer-events: none
  }

  .selected-card>* {
    pointer-events: auto
  }

  .card-kicker {
    font-size: 8px;
    letter-spacing: 1px;
    grid-column: 1
  }

  .card-heading {
    grid-column: 1;
    grid-row: 2;
    margin-top: 7px;
    justify-content: flex-start;
    gap: 15px
  }

  .card-heading h2 {
    font-size: 25px;
    letter-spacing: 3px
  }

  .card-heading>span {
    font-size: 8px
  }

  .age-label {
    grid-column: 1;
    font-size: 9px;
    margin-top: 4px;
    letter-spacing: 0
  }

  .period-hook,
  .card-footnote {
    display: none
  }

  .enter-button {
    grid-column: 2;
    grid-row: 2 / 4;
    align-self: center;
    margin: 0;
    padding: 12px;
    font-size: 10px !important;
    letter-spacing: 0
  }

  .enter-button svg {
    width: 15px
  }

  .scale-note {
    bottom: 10px;
    right: 18px;
    font-size: 8px
  }

  .chronology {
    padding: 11px 18px 9px
  }

  .chronology-heading {
    margin-bottom: 11px
  }

  .chronology-heading>span:first-child {
    font-size: 10px
  }

  .chronology-heading>span:last-child {
    display: none
  }

  .chronology-scroll {
    gap: 15px;
    padding-bottom: 7px
  }

  .period-buttons button {
    min-width: 53px;
    padding: 7px 2px 6px
  }

  .group-heading {
    font-size: 10px;
    margin-bottom: 7px;
    padding-top: 7px
  }

  .chronology-note {
    font-size: 7px
  }

  .period-label {
    font-size: 9px !important;
    padding: 5px 6px
  }

  .period-label small {
    display: none
  }

  .panorama-top {
    top: 18px;
    left: 19px;
    right: 19px
  }

  .back-to-spiral {
    font-size: 9px !important;
    gap: 8px;
    padding: 8px 11px
  }

  .reconstruction-badge {
    font-size: 8px;
    letter-spacing: 1px
  }

  .panorama-drag-hint {
    display: none
  }

  .panorama-title {
    top: 85px;
    left: 22px;
    right: 125px
  }

  .panorama-title h2 {
    font-size: 34px;
    letter-spacing: 5px
  }

  .panorama-title>p {
    font-size: 9px;
    gap: 5px
  }

  .panorama-breadcrumb {
    font-size: 8px;
    gap: 7px;
    letter-spacing: 1px
  }

  .panorama-breadcrumb i {
    margin-left: 7px
  }

  .panorama-actions {
    top: 80px;
    right: 19px;
    gap: 7px
  }

  .round-control {
    font-size: 9px !important;
    gap: 7px;
    min-width: 90px;
    padding: 8px 9px
  }

  .round-control>span {
    font-size: 14px
  }

  .cinema-captions {
    bottom: 99px;
    width: 87%
  }

  .cinema-captions>p {
    font-size: 18px;
    letter-spacing: 1px;
    min-height: 64px
  }

  .caption-counter {
    margin-bottom: 10px
  }

  .caption-steps {
    margin-top: 11px
  }

  .panorama-navigation {
    left: 20px;
    right: 20px;
    bottom: 22px
  }

  .panorama-navigation>button>span {
    font-size: 10px
  }

  .era-drawer {
    right: 18px;
    left: 18px;
    width: auto;
    top: 215px;
    bottom: 84px;
    padding: 17px 20px
  }

  .science-dialog>article {
    padding: 23px
  }

  .science-dialog h2 {
    font-size: 21px
  }

  .rank-diagram {
    padding: 17px 8px
  }
}

@media(max-height:760px) and (min-width:761px) {
  .overview-intro {
    top: 22px
  }

  .overview-intro>p {
    font-size: 24px;
    margin-top: 9px;
    line-height: 1.4
  }

  .intro-hint {
    margin-top: 10px
  }

  .selected-card {
    bottom: 35px;
    padding-top: 14px
  }

  .card-heading h2 {
    font-size: 29px
  }

  .card-heading {
    margin-top: 8px
  }

  .period-hook {
    font-size: 11px;
    margin-top: 9px;
    min-height: 37px
  }

  .enter-button {
    margin-top: 12px;
    padding: 11px 14px
  }

  .card-footnote {
    margin-top: 8px
  }

  .chronology {
    padding-top: 11px
  }

  .chronology-heading {
    margin-bottom: 11px
  }

  .panorama-title {
    top: 89px
  }

  .panorama-title h2 {
    font-size: 39px
  }

  .cinema-captions {
    bottom: 83px
  }

  .cinema-captions>p {
    font-size: 20px
  }

  .panorama-navigation {
    bottom: 17px
  }
}

@media(prefers-reduced-motion:reduce) {

  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important
  }
}

.is-roaming .overview-intro {
  display: none;
}

.is-roaming .selected-card {
  border-top-color: var(--period-color);
}

.roam-button {
  color: #eed5a6;
}

.roam-progress {
  position: absolute;
  right: 34px;
  bottom: 60px;
  z-index: 5;
  width: min(340px, 35%);
  text-shadow: 0 1px 10px #06141f;
}

.roam-progress-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #e9d2a7;
}

.roam-progress-heading>span:last-child {
  font-variant-numeric: tabular-nums;
}

.roam-progress input {
  display: block;
  width: 100%;
  height: 24px;
  margin: 10px 0 3px;
  accent-color: #edce98;
  cursor: pointer;
}

.roam-progress input:focus-visible {
  outline: 2px solid #efcd93;
  outline-offset: 3px;
}

.roam-progress small {
  font-size: 9px;
  line-height: 1.7;
  letter-spacing: .5px;
  color: #b5c3cb;
}

@media (max-width: 760px) {
  .roam-progress {
    left: 19px;
    right: 19px;
    bottom: 142px;
    width: auto;
  }

  .roam-progress-heading {
    font-size: 10px;
  }

  .roam-progress small {
    font-size: 8px;
  }
}
</style>

<style scoped>
.brand-link {
  position: relative;
  display: block;
  width: 170px;
  height: 48px;
  border-right: 1px solid #cbd1cb;
  flex-shrink: 0;
  overflow: hidden;
  cursor: default
}

.brand-logo {
  position: absolute;
  width: 155px;
  height: auto;
  max-width: none;
  left: -5px;
  top: -22px;
  display: block
}

@media(max-width:1100px) {
  .brand-link {
    width: 145px;
    height: 43px
  }

  .brand-logo {
    width: 134px;
    top: -19px;
    left: -4px
  }
}

@media(max-width:760px) {
  .brand-link {
    width: 106px;
    height: 34px
  }

  .brand-logo {
    width: 100px;
    top: -13px;
    left: -3px
  }

  .course-brand {
    gap: 12px
  }

  .course-brand h1 {
    font-size: 16px
  }

  .course-brand .eyebrow {
    font-size: 7px;
    letter-spacing: 1px
  }

  .header-actions {
    gap: 5px
  }

  .guide-button>.info-symbol {
    display: none
  }
}
</style>


<style scoped>
/* Unframed floating navigation: only the link and controls intercept the scene. */
.geological-time-page {
  --header-top: 18px;
  --header-height: 64px;
  --header-bottom: calc(var(--header-top) + var(--header-height));
}

.course-header {
  position: absolute;
  top: var(--header-top);
  left: 34px;
  right: 34px;
  z-index: 20;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0;
  color: #f1f5f2;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  text-shadow: 0 1px 3px rgb(0 10 16 / 70%), 0 2px 12px rgb(0 10 16 / 45%);
  pointer-events: none;
}

.course-brand {
  gap: 18px;
  min-width: 0;
}

.course-brand h1 {
  font-size: 21px;
  line-height: 1.5;
  white-space: nowrap;
}

.course-brand .eyebrow {
  color: #b2c5ca;
  font-size: 9px;
}

.header-center {
  color: #bfcece;
  font-size: 11px;
}

.status-dot {
  background: #b3d2bf;
}

.header-actions {
  gap: 18px;
  flex-shrink: 0;
}

.header-actions button {
  min-height: 44px;
  pointer-events: auto;
}

.header-actions .icon-button {
  width: 44px;
}

.header-actions svg {
  filter: drop-shadow(0 1px 3px rgb(0 10 16 / 65%));
}

.header-actions .text-button {
  color: #e1ebeb;
}

.header-actions button:hover {
  color: #f4d7a3;
}

.header-actions .guide-button:hover {
  text-decoration: underline;
  text-underline-offset: 5px;
}

.brand-link {
  width: 141px;
  height: 44px;
  border: 0;
  pointer-events: auto;
}

.brand-logo {
  width: 141px;
  left: -4px;
  top: -20px;
  filter: brightness(1.42) drop-shadow(0 1px 3px rgb(0 10 20 / 20%));
}

.scene-host,
.projected-labels {
  top: 0;
}

.course-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.course-heading .eyebrow {
  font-size: 8px;
  letter-spacing: 2px;
}

.course-time-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  color: #e3c58f;
  font-size: 10px;
  line-height: 1.4;
  letter-spacing: 2px;
  white-space: nowrap;
}

.course-time-label::before {
  content: '';
  width: 16px;
  height: 1px;
  background: currentColor;
  opacity: .8;
}

.period-label {
  transition: opacity .65s ease, background .2s, border-color .2s;
}

.period-label.subdued {
  opacity: .48;
}

.period-label.subdued:hover,
.period-label.subdued:focus-visible {
  opacity: 1;
}

.is-focused .overview-intro>p {
  display: none;
}

.is-focused .intro-hint {
  margin-top: 10px;
}

.is-focused .selected-card {
  border-top-color: var(--period-color);
}

.card-footnote {
  line-height: 1.8;
  letter-spacing: 1px;
}

.age-bubble {
  position: absolute;
  width: 55px;
  height: 55px;
  transform: translate(-50%, -100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #277b91;
  filter: drop-shadow(0 3px 7px #03121a44);
  transition: opacity .6s;
}

.age-leaders {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.age-leaders line {
  stroke: #b8dbd9;
  stroke-width: 1;
}

.age-leaders circle {
  fill: #cce5df;
}

.age-bubble::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50% 50% 0 50%;
  transform: rotate(45deg);
  background: #f3f8f5;
  border: 1px solid #a6d0d4;
  z-index: -1;
}

.age-bubble strong {
  font-family: Arial, 'Microsoft YaHei', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.age-bubble small {
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.2;
  letter-spacing: .4px;
}

.age-bubble.subdued {
  opacity: .36;
}

@media (max-width: 760px) {
  .age-bubble {
    width: 45px;
    height: 45px;
  }

  .age-bubble strong {
    font-size: 11px;
  }

  .age-bubble small {
    font-size: 8px;
  }
}

@media (max-width: 760px) {
  .course-heading {
    gap: 1px;
  }

  .course-heading .eyebrow {
    font-size: 6px;
    letter-spacing: .7px;
  }

  .course-time-label {
    font-size: 8px;
    letter-spacing: .7px;
    gap: 5px;
    margin-top: 1px;
  }

  .course-time-label::before {
    width: 11px;
  }
}

.overview-intro {
  top: calc(var(--header-bottom) + 26px);
}

.scene-tools {
  top: calc(var(--header-bottom) + 24px);
}

.panorama-top {
  top: calc(var(--header-bottom) + 20px);
}

.panorama-drag-hint {
  top: calc(var(--header-bottom) + 31px);
}

.panorama-title {
  top: calc(var(--header-bottom) + 90px);
}

.panorama-actions {
  top: calc(var(--header-bottom) + 80px);
}

.era-drawer {
  top: calc(var(--header-bottom) + 78px);
}

@media (min-width: 1650px) {
  .geological-time-page {
    --header-top: 22px;
    --header-height: 70px;
  }

  .course-header {
    left: 46px;
    right: 44px;
  }

  .course-brand h1 {
    font-size: 23px;
  }
}

@media (max-width: 1100px) {
  .course-header {
    left: 24px;
    right: 24px;
  }

  .course-brand h1 {
    font-size: 20px;
  }

  .brand-link {
    width: 140px;
    height: 42px;
  }

  .brand-logo {
    width: 130px;
    top: -18px;
  }
}

@media (max-width: 760px) {
  .geological-time-page {
    --header-top: 12px;
    --header-height: 56px;
  }

  .course-header {
    left: 19px;
    right: 19px;
    gap: 10px;
  }

  .course-brand {
    gap: 10px;
  }

  .course-brand h1 {
    font-size: 15px;
    letter-spacing: 1px;
  }

  .course-brand .eyebrow {
    font-size: 7px;
    letter-spacing: .7px;
  }

  .brand-link {
    width: 96px;
    height: 34px;
  }

  .brand-logo {
    width: 91px;
    left: -3px;
    top: -11px;
  }

  .header-actions {
    gap: 4px;
  }

  .overview-intro {
    top: calc(var(--header-bottom) + 24px);
  }

  .scene-tools {
    top: calc(var(--header-bottom) + 22px);
  }

  .panorama-top {
    top: calc(var(--header-bottom) + 18px);
  }

  .panorama-title {
    top: calc(var(--header-bottom) + 82px);
  }

  .panorama-actions {
    top: calc(var(--header-bottom) + 77px);
  }

  .era-drawer {
    top: calc(var(--header-bottom) + 214px);
  }
}

@media (max-height: 700px) and (min-width: 761px) {
  .geological-time-page {
    --header-top: 12px;
    --header-height: 56px;
  }

  .overview-intro {
    top: calc(var(--header-bottom) + 20px);
  }

  .panorama-title {
    top: calc(var(--header-bottom) + 76px);
  }

  .panorama-actions {
    top: calc(var(--header-bottom) + 67px);
  }

  .era-drawer {
    top: calc(var(--header-bottom) + 67px);
  }
}

.chronology-scroll {
  display: block;
}

.chronology-tracks {
  display: grid;
  grid-template-columns: minmax(174px, 3fr) minmax(333px, 6fr) repeat(2, minmax(165px, 3fr));
  column-gap: 23px;
  row-gap: 8px;
  min-width: 906px;
}

.chronology-tracks .time-group {
  grid-row: 2;
  min-width: 0;
}

.eon-range {
  grid-column: 2 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #e4c69b;
  font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif;
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 3px;
}

.eon-range::before,
.eon-range::after {
  content: '';
  flex: 1;
  height: 7px;
  border-top: 1px solid #d3b380b3;
  transform: translateY(3px);
}

.eon-range::before {
  border-left: 1px solid #d3b380b3;
}

.eon-range::after {
  border-right: 1px solid #d3b380b3;
}

@media (max-width: 1100px) {
  .chronology-tracks {
    column-gap: 16px;
    min-width: 885px;
  }
}

@media (max-width: 760px) {
  .chronology-tracks {
    column-gap: 15px;
    min-width: 882px;
    row-gap: 6px;
  }

  .eon-range {
    font-size: 12px;
  }
}

.card-actions {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-top: 20px;
}

.card-actions .enter-button {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  width: auto;
  margin: 0;
}

.is-focused .card-actions {
  width: 360px;
  max-width: calc(100vw - 68px);
}

.focus-orbit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex: 0 0 116px;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #d2be924d;
  background: #112a37b3;
  color: #e9d2a7;
  font-size: 11px;
  letter-spacing: .5px;
  white-space: nowrap;
}

.focus-orbit-button svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.focus-orbit-button:hover {
  border-color: #ecd4a5;
  background: #1e3b47d9;
}

.focus-orbit-button.active {
  border-color: #ecd4a5;
  color: #fff2d2;
  background: #34504bcc;
}

.focus-orbit-button:focus-visible {
  outline: 2px solid #efcd93;
  outline-offset: 3px;
}

.focus-orbit-button:disabled {
  opacity: .45;
  cursor: default;
}

.load-notices {
  position: absolute;
  right: 24px;
  top: calc(var(--header-bottom, 80px) + 62px);
  z-index: 7;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: max-content;
  max-width: min(420px, calc(100% - 48px));
  pointer-events: none;
}

.resource-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  background: #102a36ed;
  border: 1px solid #c9b58c45;
  color: #c9d6d8;
  font-size: 11px;
  pointer-events: none;
}

.resource-notice button {
  flex-shrink: 0;
  color: #efcd93;
  background: transparent;
  padding: 7px 3px;
  pointer-events: auto;
}

@media (max-width: 1100px) {
  .card-actions {
    margin-top: 13px;
  }

  .is-focused .card-actions {
    width: 328px;
    max-width: calc(100vw - 48px);
  }
}

@media (max-width: 760px) {
  .card-actions {
    grid-column: 2;
    grid-row: 2 / 4;
    align-self: center;
    margin: 0;
  }

  .is-focused .card-actions {
    grid-column: 1 / -1;
    grid-row: 4;
    width: 100%;
    max-width: none;
    margin-top: 12px;
  }

  .focus-orbit-button {
    flex-basis: 132px;
    font-size: 10px;
  }
}
</style>
