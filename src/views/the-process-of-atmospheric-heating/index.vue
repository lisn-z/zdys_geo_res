<template>
  <div ref="pageRef" class="heating-lab">
    <header class="lab-header">
      <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
        alt="智地有申" />
      <div class="header-title"><span>地理 · 交互课堂</span>
        <h1>大气受热过程</h1>
      </div>
      <div class="header-tools" role="group" aria-label="演示画面选项">
        <button class="tool-button" :class="{ selected: showLabels }" :aria-pressed="showLabels" aria-label="切换路径文字标注"
          title="文字标注" @click="showLabels = !showLabels">
          <PriceTag /><span>标注</span>
        </button>
        <button class="tool-button" :class="{ selected: motion }" :aria-pressed="motion" aria-label="切换动态光效"
          title="动态光效" @click="motion = !motion">
          <MagicStick /><span>光效</span>
        </button>
        <button class="tool-button panel-toggle" :aria-pressed="panelsVisible"
          :aria-label="panelsVisible ? '隐藏浮动面板' : '显示浮动面板'" @click="panelsVisible = !panelsVisible">
          <Hide v-if="panelsVisible" />
          <View v-else /><span>面板</span>
        </button>
        <button class="tool-button fullscreen-button" :aria-label="isFullscreen ? '退出全屏' : '全屏演示'" title="全屏"
          @click="toggleFullscreen">
          <FullScreen />
        </button>
      </div>
    </header>

    <main class="scene-area" aria-label="大气受热过程实景演示">
      <div class="scene-frame">
        <AtmosphericHeating2D :stage-index="currentStageIndex" :progress="sceneProgress" :motion="motion"
          :show-labels="showLabels" :include-extensions="extendedMode" />
      </div>
      <nav class="process-segments" aria-label="三大受热过程">
        <button v-for="(group, index) in processGroups" :key="group.name"
          :class="{ active: !isOverview && currentStage.group === index }" :aria-label="'演示' + group.name"
          :aria-current="!isOverview && currentStage.group === index ? 'step' : undefined"
          @click="goToStage(group.stages[0])">
          <span class="process-number">0{{ index + 1 }}</span><span>{{ group.name }}</span>
        </button>
        <button class="overview-segment" :class="{ active: isOverview }" :aria-pressed="isOverview" aria-label="显示全过程总览"
          @click="showOverview">
          <Grid /><span>总览</span>
        </button>
      </nav>
    </main>

    <!-- Keep the card instance on expand/collapse so its own focus/stacking logic runs. -->
    <FloatingFeatureCard :key="'stage-' + compactLayout" v-show="panelsVisible" v-model:collapsed="stageCollapsed"
      class="heating-panel stage-panel" title="阶段控制"
      :subtitle="isOverview ? lessonModeName + ' · ' + lessonPlan.length + ' 步' : currentGroup.name + ' · 第 ' + stepNumber + ' 步'"
      variant="data" light :initial-top="compactLayout ? 134 : 100" :initial-right="20"
      :bottom-inset="100" :min-width="300" :min-height="280">
      <template #title-prefix>
        <Operation class="panel-title-icon" />
      </template>
      <template #header-meta><span class="panel-progress">{{ Math.round(progress) }}%</span></template>
      <div class="panel-body">
        <div class="lesson-mode" role="group" aria-label="选择讲解范围">
          <button :aria-pressed="!extendedMode" @click="changeLessonMode(false)">基础讲解</button>
          <button :aria-pressed="extendedMode" @click="changeLessonMode(true)">拓展演示</button>
        </div>
        <p class="panel-intro">{{ extendedMode ? '增加大气窗口与感热、潜热输送；数值仍按需查看。' : '先看三大受热过程。感热、潜热与大气窗口可在拓展演示中查看。' }}</p>
        <div class="stage-groups">
          <section v-for="(group, groupIndex) in lessonGroups" :key="group.name" class="stage-group"
            :class="{ 'current-group': !isOverview && currentStage.group === groupIndex }"
            :aria-labelledby="'stage-group-' + groupIndex">
            <div class="stage-group-heading">
              <span class="stage-group-number" aria-hidden="true">{{ groupIndex + 1 }}</span>
              <div class="stage-group-copy">
                <h3 :id="'stage-group-' + groupIndex">{{ group.name }}</h3>
                <p>{{ group.caption }}</p>
              </div>
              <span v-if="!isOverview && currentStage.group === groupIndex" class="current-group-label">当前过程</span>
            </div>
            <div class="step-list" :style="{ gridTemplateColumns: `repeat(${group.steps.length}, minmax(0, 1fr))` }">
              <button v-for="step in group.steps" :key="step.id"
                :class="{ active: !isOverview && currentStageIndex === step.id }"
                :aria-label="'第' + step.number + '步：' + step.title"
                :aria-current="!isOverview && currentStageIndex === step.id ? 'step' : undefined"
                @click="goToStage(step.id)">
                <span>0{{ step.number }}{{ step.id === 5 ? ' · 拓展' : '' }}</span><strong>{{ step.name }}</strong>
              </button>
            </div>
          </section>
        </div>
        <div class="stage-summary"><span>{{ isOverview ? lessonModeName + ' · 总览' : currentGroup.name + ' · 第 ' +
          stepNumber + ' 步' }}</span><strong>{{ currentStage.title }}</strong></div>
        <div class="stage-actions">
          <button :disabled="currentPlanIndex === 0" aria-label="转到上一步" @click="goToAdjacentStage(-1)">
            <ArrowLeft />上一步
          </button>
          <button class="stage-play" :aria-label="isPlaying && playbackMode === 'stage' ? '暂停本阶段' : '播放本阶段'"
            @click="playCurrentStage">
            <VideoPause v-if="isPlaying && playbackMode === 'stage'" />
            <VideoPlay v-else />{{ isPlaying && playbackMode === 'stage' ? '暂停' : '播放本步' }}
          </button>
          <button :disabled="currentPlanIndex === lessonPlan.length - 1" aria-label="转到下一步"
            @click="goToAdjacentStage(1)">下一步
            <ArrowRight />
          </button>
        </div>
      </div>
    </FloatingFeatureCard>

    <FloatingFeatureCard :key="'insight-' + compactLayout" v-show="panelsVisible" v-model:collapsed="insightCollapsed"
      class="heating-panel insight-panel" title="过程解读"
      :subtitle="isOverview ? '理解地—气能量交换' : currentGroup.name" variant="data" light
      :initial-top="compactLayout ? 196 : 162" :initial-right="20" :bottom-inset="100" :min-width="300"
      :min-height="280">
      <template #title-prefix>
        <Reading class="panel-title-icon" />
      </template>
      <div class="panel-body insight-body" aria-live="polite">
        <p class="insight-phase">{{ lessonModeName }} · {{ isOverview ? '主要路径总览' : '第 ' + stepNumber + ' 步 / 共 ' + lessonPlan.length + ' 步' }}</p>
        <h2>{{ currentStage.title }}</h2>
        <div class="core-takeaway"><span>本步重点</span><p class="insight-takeaway">{{ currentStage.takeaway }}</p></div>
        <p class="insight-description">{{ currentStage.description }}</p>
        <div v-if="currentStageIndex === 2" class="surface-comparison" aria-label="相同阳光下的地表反射比较">
          <span>相同入射条件下</span>
          <div><strong>新雪</strong><p>反射较多 · 吸收较少</p></div>
          <div><strong>草地</strong><p>反射较少 · 吸收较多</p></div>
          <small>比较的是太阳辐射分配，不直接据此判定地表温度。</small>
        </div>
        <details class="reading-notes">
          <summary>观察提示与读图说明</summary>
          <div class="observation"><span>观察提示</span><p>{{ currentStage.focus }}</p></div>
          <div class="mini-legend" aria-label="光线颜色图例"><span><i class="solar-dot"></i>太阳短波</span><span><i class="ground-dot"></i>地面长波</span><span><i class="air-dot"></i>大气长波</span></div>
          <div class="teaching-note"><p>分步为教学拆解，实际过程同时、持续发生。光色、波线与吸收光球为示意，不是肉眼可见的光迹；线条粗细不代表能量大小。总览精选主要路径，不是完整的定量收支图。</p></div>
        </details>
        <TextbookExtension />
      </div>
    </FloatingFeatureCard>

    <footer class="playback-bar" aria-label="演示播放与阶段控制">
      <div class="playback-inner">
        <button class="play-button" :aria-label="isPlaying ? '暂停演示' : isOverview ? '从头播放全过程' : '继续播放演示'"
          @click="togglePlayback">
          <VideoPause v-if="isPlaying" />
          <VideoPlay v-else />
        </button>
        <button class="icon-button replay-button" aria-label="从头重新播放" title="重新播放" @click="restartPlayback">
          <RefreshLeft />
        </button>
        <div class="timeline">
          <div class="timeline-heading"><span>{{ lessonModeName }} · {{ isOverview ? '总览' : '0' + stepNumber + ' · ' +
              currentStage.name }}</span><span class="timeline-progress">{{ Math.round(progress)
              }}<small>%</small></span>
          </div>
          <input class="progress-slider" type="range" min="0" max="100" step="0.1" :value="progress"
            :style="{ '--progress': progress + '%' }" aria-label="受热过程演示进度"
            :aria-valuetext="Math.round(progress) + '%，' + currentStage.name" @input="scrubProgress" />
        </div>
        <div class="speed-switch" role="group" aria-label="播放速度"><button v-for="speed in speedOptions" :key="speed"
            :class="{ active: playbackSpeed === speed }" :aria-pressed="playbackSpeed === speed"
            :aria-label="speed + '倍速播放'" @click="playbackSpeed = speed">{{ speed }}×</button></div>
        <button class="icon-button loop-button" :class="{ selected: loop }" :aria-pressed="loop" aria-label="切换全过程循环播放"
          title="循环播放" @click="loop = !loop">
          <Refresh />
        </button>
      </div>
    </footer>
    <p v-if="fullscreenError" class="fullscreen-notice" role="status">{{ fullscreenError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AtmosphericHeating2D from './AtmosphericHeating2D.vue'
import TextbookExtension from './TextbookExtension.vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import { processGroups, createLessonPlan, sceneProgressFor } from './heatingModel'
import { VideoPlay, VideoPause, RefreshLeft, Refresh, FullScreen, PriceTag, MagicStick, Reading, Operation, Grid, ArrowLeft, ArrowRight, Hide, View } from '@element-plus/icons-vue'

type PlaybackMode = 'all' | 'stage'
const pageRef = ref<HTMLElement | null>(null)
const progress = ref(100)
const playbackSpeed = ref(1)
const speedOptions = [.5, 1, 2]
const isPlaying = ref(false)
const playbackMode = ref<PlaybackMode>('all')
const loop = ref(false)
const motion = ref(true)
const showLabels = ref(true)
const extendedMode = ref(false)
const stageCollapsed = ref(true)
const insightCollapsed = ref(true)
const panelsVisible = ref(true)
const compactLayout = ref(typeof window !== 'undefined' && window.innerWidth <= 960)
const isFullscreen = ref(false)
const fullscreenError = ref('')
const isOverview = computed(() => progress.value >= 100)
const lessonModeName = computed(() => extendedMode.value ? '拓展演示' : '基础讲解')
const lessonPlan = computed(() => createLessonPlan(extendedMode.value))
const lessonGroups = computed(() => processGroups.map((group, index) => ({
  ...group,
  steps: lessonPlan.value.map((step, i) => ({ ...step, number: i + 1 })).filter(step => step.group === index),
})))
const currentPlanIndex = computed(() => {
  const value = Math.min(progress.value, 99.999)
  return Math.max(0, lessonPlan.value.findIndex(stage => value >= stage.start && value < stage.end))
})
const currentStage = computed(() => lessonPlan.value[currentPlanIndex.value]!)
const currentGroup = computed(() => processGroups[currentStage.value.group] || processGroups[0])
const currentStageIndex = computed(() => currentStage.value.id)
const stepNumber = computed(() => currentPlanIndex.value + 1)
const sceneProgress = computed(() => sceneProgressFor(currentStage.value, progress.value))

let animationFrame = 0
let lastTime: number | null = null
let stageStopAt = 100
let noticeTimer: ReturnType<typeof setTimeout> | undefined

function pause() { isPlaying.value = false }
function togglePlayback() {
  if (isPlaying.value) { pause(); return }
  if (isOverview.value) progress.value = 0
  playbackMode.value = 'all'
  isPlaying.value = true
}
function restartPlayback() {
  progress.value = 0
  playbackMode.value = 'all'
  isPlaying.value = true
}
function playCurrentStage() {
  if (isPlaying.value && playbackMode.value === 'stage') { pause(); return }
  const stage = currentStage.value
  stageStopAt = stage.end - .01
  if (progress.value >= stageStopAt - .01) progress.value = stage.start
  playbackMode.value = 'stage'
  isPlaying.value = true
}
function goToStage(index: number) {
  pause()
  const step = lessonPlan.value.find(stage => stage.id === index) || lessonPlan.value[0]!
  progress.value = step.start
}
function goToAdjacentStage(offset: number) {
  const index = Math.max(0, Math.min(lessonPlan.value.length - 1, currentPlanIndex.value + offset))
  goToStage(lessonPlan.value[index]!.id)
}
function changeLessonMode(extended: boolean) {
  if (extended === extendedMode.value) return
  pause()
  const previous = currentStage.value
  const fraction = (progress.value - previous.start) / (previous.end - previous.start)
  const wasOverview = isOverview.value
  extendedMode.value = extended
  const next = lessonPlan.value.find(stage => stage.id === previous.id)
    || lessonPlan.value.find(stage => stage.id === 4)!
  progress.value = wasOverview ? 100 : next.start + (next.id === previous.id ? fraction : 0) * (next.end - next.start)
}
function showOverview() { pause(); progress.value = 100 }
function scrubProgress(event: Event) {
  pause()
  progress.value = Number((event.target as HTMLInputElement).value)
}
function animate(time: number) {
  const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .1)
  lastTime = time
  if (isPlaying.value && !document.hidden) {
    const end = playbackMode.value === 'stage' ? stageStopAt : 100
    const next = progress.value + delta * playbackSpeed.value * 1.2
    if (next >= end) {
      if (playbackMode.value === 'all' && loop.value) progress.value = 0
      else { progress.value = end; pause() }
    } else progress.value = next
  }
  animationFrame = requestAnimationFrame(animate)
}
function resetFrameTime() { lastTime = null }
function syncCompactLayout() { compactLayout.value = window.innerWidth <= 960 }
function syncFullscreen() { isFullscreen.value = document.fullscreenElement === pageRef.value }
async function toggleFullscreen() {
  fullscreenError.value = ''
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await pageRef.value?.requestFullscreen()
  } catch {
    fullscreenError.value = '当前浏览器暂不支持全屏，可收起悬浮面板查看完整画面。'
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => fullscreenError.value = '', 4500)
  }
}
onMounted(() => {
  animationFrame = requestAnimationFrame(animate)
  document.addEventListener('visibilitychange', resetFrameTime)
  document.addEventListener('fullscreenchange', syncFullscreen)
  window.addEventListener('resize', syncCompactLayout)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  clearTimeout(noticeTimer)
  document.removeEventListener('visibilitychange', resetFrameTime)
  document.removeEventListener('fullscreenchange', syncFullscreen)
  window.removeEventListener('resize', syncCompactLayout)
})
</script>

<style scoped>
/* All theme tokens and shared-component overrides are local to this route. */
.heating-lab {
  --paper: #f7f6f0;
  --ink: #283c36;
  --muted: #6a7770;
  --accent: #396b58;
  --line: #dce1d9;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  color: var(--ink);
  background: var(--paper);
  font: 14px "Microsoft YaHei", "PingFang SC", sans-serif;
  -webkit-font-smoothing: antialiased;
}

.heating-lab *,
.heating-lab *::before,
.heating-lab *::after {
  box-sizing: border-box
}

.heating-lab button {
  font: inherit;
  cursor: pointer;
  transition: background .18s, color .18s;
  -webkit-tap-highlight-color: transparent
}

.heating-lab button:disabled {
  cursor: default;
  opacity: .35
}

.heating-lab button:focus-visible,
.heating-lab input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px
}

.heating-lab button>svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: block
}

.lab-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 76px;
  padding: 0 28px;
  background: var(--paper);
  border-bottom: 1px solid var(--line)
}

.brand-logo {
  display: block;
  width: 164px;
  height: 46px;
  object-fit: cover;
  object-position: center
}

.header-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  white-space: nowrap
}

.header-title>span {
  color: #7c8980;
  font-size: 10px;
  letter-spacing: 3px
}

.header-title h1 {
  margin: 4px 0 0;
  color: var(--ink);
  font-size: 23px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 2px
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 5px
}

.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  color: #7c867f;
  background: transparent
}

.tool-button.selected,
.tool-button[aria-pressed=true] {
  color: var(--accent)
}

.tool-button:hover {
  background: #e6ebe2;
  color: #244e3e
}

.fullscreen-button {
  border-left: 1px solid var(--line);
  border-radius: 0;
  margin-left: 5px;
  padding-left: 16px
}

.scene-area {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  background: #082345
}

.scene-frame {
  width: 100%;
  height: 100%
}

.process-segments {
  position: absolute;
  z-index: 5;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
  padding: 5px;
  max-width: calc(100% - 400px);
  border: 1px solid #fff4;
  border-radius: 9px;
  background: #f7f6f0f0;
  box-shadow: 0 5px 20px #00000016;
  backdrop-filter: blur(12px)
}

.process-segments button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 37px;
  padding: 7px 18px;
  white-space: nowrap;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #5f6c65
}

.process-segments button.active {
  background: var(--accent);
  color: white
}

.process-segments button:hover:not(.active) {
  background: #e6ebe2
}

.process-number {
  color: #96a197;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums
}

.active .process-number {
  color: #c5daca
}

.overview-segment {
  border-left: 1px solid #dce1d9 !important;
  margin-left: 4px
}

.overview-segment.active {
  border-color: transparent !important
}

.overview-segment svg {
  width: 15px !important;
  height: 15px !important
}

/* Reuse FloatingFeatureCard; never override position/left/top/width with !important. */
.heating-lab .heating-panel.theme-light {
  --feature-bg: #f8f7f1f5;
  --feature-head-bg: #f2f3ec;
  --feature-border: #d8ded3;
  --feature-divider: #e0e4db;
  --feature-title: #344e40;
  --feature-text: #34463c;
  --feature-muted: #7a887b;
  --feature-button-bg: #e8ede3;
  --feature-button-border: #d0dacb;
}

.heating-lab .heating-panel {
  --panel-anchor-top: 100px;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: calc(100dvh - var(--panel-anchor-top) - 100px);
  border-radius: 10px;
  box-shadow: 0 12px 36px #06170f29;
  backdrop-filter: blur(18px);
}

.heating-lab .insight-panel {
  --panel-anchor-top: 162px;
}

.heating-lab .heating-panel.collapsed {
  width: 156px;
  height: auto
}

.heating-lab .heating-panel :deep(.feature-card-head) {
  min-height: 58px;
  padding: 12px 16px
}

.heating-lab .heating-panel.collapsed :deep(.feature-card-head) {
  min-height: 42px;
  padding: 8px 11px
}

.heating-lab .heating-panel :deep(.feature-card-title-label) {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: .5px
}

.heating-lab .heating-panel :deep(.feature-card-title strong) {
  color: #7b877c;
  font-size: 12px;
  font-weight: 400
}

.heating-lab .heating-panel :deep(.feature-card-content) {
  padding-bottom: 24px;
  scrollbar-width: thin;
  scrollbar-color: #bdc8b8 transparent
}

.heating-lab .heating-panel :deep(.collapse-btn) {
  border: 0;
  border-radius: 5px;
  color: #5a705d;
  background: transparent
}

.heating-lab .heating-panel :deep(.collapse-btn:hover) {
  background: #e0e7da
}

.heating-lab .heating-panel :deep(.feature-resize-handle) {
  width: 20px;
  height: 20px;
  border: 0;
  box-shadow: none;
  background: transparent;
  opacity: .55
}

.panel-title-icon {
  width: 16px;
  height: 16px;
  color: var(--accent)
}

.panel-progress {
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums
}

.panel-body {
  padding: 16px 18px 4px
}

.panel-intro {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65
}

.lesson-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #e9eee4;
}
.lesson-mode button {
  padding: 9px 6px;
  border: 0;
  border-radius: 4px;
  color: var(--muted);
  background: transparent;
  font-size: 13px;
}
.lesson-mode button[aria-pressed=true] { color: #fff; background: var(--accent); }
.core-takeaway { padding: 13px; margin: 15px 0; border-left: 3px solid #6d977c; border-radius: 0 5px 5px 0; background: #e8efe2; }
.core-takeaway > span { color: #5c765d; font-size: 11px; letter-spacing: 1px; }
.core-takeaway .insight-takeaway { margin: 7px 0 0; padding: 0; border: 0; background: transparent; }
.surface-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin: 16px 0; }
.surface-comparison > span, .surface-comparison > small { grid-column: 1 / -1; }
.surface-comparison > span { font-size: 12px; font-weight: 600; color: var(--accent); }
.surface-comparison > div { padding: 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff8; }
.surface-comparison strong { font-size: 13px; font-weight: 600; }
.surface-comparison p { margin: 6px 0 0; font-size: 11px; line-height: 1.65; color: var(--muted); }
.surface-comparison > small { font-size: 11px; line-height: 1.6; color: var(--muted); }
.reading-notes { margin-top: 18px; padding-top: 13px; border-top: 1px solid var(--line); }
.reading-notes > summary { color: #506a56; font-size: 13px; cursor: pointer; line-height: 1.7; }
.reading-notes > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.reading-notes .teaching-note { margin-top: 12px; padding-top: 0; border: 0; }

.stage-groups {
  display: grid;
  gap: 12px
}

.stage-group {
  padding: 12px;
  border: 1px solid #dfe4da;
  border-radius: 7px;
  background: #fff4
}

.stage-group.current-group {
  border-color: #a0b498;
  background: #edf3e7
}

.stage-group-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px
}

.stage-group-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  color: #73816b;
  background: #e7ecdf;
  font-size: 12px;
  font-weight: 600
}

.current-group .stage-group-number {
  color: white;
  background: var(--accent)
}

.stage-group-copy {
  flex: 1;
  min-width: 0
}

.stage-group-copy h3 {
  margin: 0;
  color: #42553b;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600
}

.stage-group-copy p {
  margin: 3px 0 0;
  color: #859077;
  font-size: 11px;
  line-height: 1.4
}

.current-group-label {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 10px;
  font-weight: 500
}

.step-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px
}

.step-list button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 57px;
  padding: 8px 6px;
  border: 1px solid #dce1d7;
  border-radius: 5px;
  background: #fff9;
  color: #46584d;
  text-align: left
}

.step-list button span {
  color: #98a28f;
  font-size: 11px;
  font-variant-numeric: tabular-nums
}

.step-list strong {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: normal
}

.step-list button.active {
  border-color: #90ad93;
  background: #e2eddd;
  color: #34583c
}

.step-list button.active span {
  color: #608467
}

.step-list button:hover {
  border-color: #9cac94
}

.stage-summary {
  display: grid;
  gap: 7px;
  margin: 18px 0;
  padding-top: 15px;
  border-top: 1px solid var(--line)
}

.stage-summary>span {
  color: #87917f;
  font-size: 11px;
  letter-spacing: 1px
}

.stage-summary>strong {
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500
}

.stage-actions {
  display: grid;
  grid-template-columns: 1fr 1.1fr 1fr;
  gap: 6px
}

.stage-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 35px;
  padding: 7px 5px;
  border: 1px solid #d5ddd0;
  border-radius: 5px;
  color: #64715f;
  background: transparent;
  font-size: 12px
}

.stage-actions .stage-play {
  color: white;
  border-color: var(--accent);
  background: var(--accent)
}

.stage-actions button>svg {
  width: 13px;
  height: 13px
}

.insight-phase {
  margin: 0 0 12px;
  color: #829077;
  font-size: 11px;
  letter-spacing: 1px
}

.insight-body h2 {
  margin: 0 0 12px;
  font-size: 19px;
  line-height: 1.6;
  font-weight: 600;
  color: #304432
}

.insight-description {
  margin: 0;
  font-size: 14px;
  line-height: 1.9;
  color: #62705f
}

.insight-takeaway {
  margin: 18px 0;
  padding: 12px 14px;
  border-left: 3px solid #87a57c;
  background: #eaf0e3;
  color: #425d39;
  font-size: 14px;
  line-height: 1.8
}

.observation>span {
  font-size: 11px;
  letter-spacing: 1px;
  color: #8a927b
}

.observation p {
  margin: 7px 0 0;
  color: #6b765f;
  font-size: 13px;
  line-height: 1.85
}

.mini-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--line);
  color: #7b846d;
  font-size: 11px
}

.mini-legend span {
  display: flex;
  align-items: center;
  gap: 5px
}

.mini-legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1px solid #0002
}

.solar-dot {
  background: #e0bc55
}

.ground-dot {
  background: #e3894b
}

.air-dot {
  background: #dbab7c
}

.teaching-note {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line)
}

.teaching-note>span {
  color: #65785c;
  font-size: 12px;
  font-weight: 600
}

.teaching-note p {
  margin: 7px 0 0;
  color: #75806b;
  font-size: 12px;
  line-height: 1.8
}

.textbook-reference {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 15px;
  padding: 12px;
  border: 1px solid #d8e1cf;
  border-radius: 6px;
  background: #edf2e8;
  color: var(--accent);
  text-decoration: none
}

.textbook-reference:hover {
  background: #e3ecdc
}

.textbook-reference:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px
}

.textbook-reference>svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px
}

.textbook-reference>span {
  flex: 1;
  min-width: 0
}

.textbook-reference strong,
.textbook-reference small {
  display: block;
  line-height: 1.65
}

.textbook-reference strong {
  font-size: 12px;
  font-weight: 500
}

.textbook-reference small {
  margin-top: 3px;
  font-size: 11px;
  color: #75816e
}

.playback-bar {
  z-index: 10;
  flex-shrink: 0;
  height: 88px;
  padding: 0 98px 0 24px;
  background: var(--paper);
  border-top: 1px solid var(--line)
}

.playback-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  width: min(1050px, 100%);
  height: 100%;
  margin: auto
}

.play-button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: white;
  background: var(--accent)
}

.play-button:hover {
  background: #2d5545
}

.play-button>svg {
  width: 26px !important;
  height: 26px !important
}

.icon-button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  padding: 7px;
  border: 0;
  border-radius: 5px;
  color: #81917f;
  background: transparent
}

.icon-button:hover,
.icon-button.selected {
  color: var(--accent);
  background: #e6ebe0
}

.timeline {
  flex: 1;
  min-width: 70px
}

.timeline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #69765f
}

.timeline-heading>span:first-child {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis
}

.timeline-progress {
  color: #53784c;
  font-variant-numeric: tabular-nums
}

.timeline-progress small {
  padding-left: 3px;
  font-size: 10px;
  color: #8a9a80
}

.progress-slider {
  display: block;
  width: 100%;
  height: 16px;
  margin: 0;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background: transparent
}

.progress-slider::-webkit-slider-runnable-track {
  height: 3px;
  background: linear-gradient(to right, #74936b var(--progress), #dce3d3 var(--progress));
  border-radius: 3px
}

.progress-slider::-moz-range-track {
  height: 3px;
  background: linear-gradient(to right, #74936b var(--progress), #dce3d3 var(--progress));
  border-radius: 3px
}

.progress-slider::-webkit-slider-thumb {
  width: 11px;
  height: 11px;
  margin-top: -4px;
  appearance: none;
  -webkit-appearance: none;
  border: 2px solid var(--paper);
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 1px #557c50
}

.progress-slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border: 2px solid var(--paper);
  border-radius: 50%;
  background: var(--accent)
}

.speed-switch {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  border-radius: 6px;
  background: #e9ede3
}

.speed-switch button {
  min-width: 38px;
  min-height: 30px;
  padding: 5px 8px;
  border: 0;
  border-radius: 4px;
  color: #8a967f;
  background: transparent;
  font-size: 12px
}

.speed-switch button.active {
  color: #3c6340;
  background: #fff;
  box-shadow: 0 1px 4px #52614115
}

.fullscreen-notice {
  position: fixed;
  z-index: 100;
  top: 84px;
  left: 50%;
  max-width: calc(100vw - 32px);
  margin: 0;
  padding: 12px 16px;
  transform: translateX(-50%);
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 7px;
  font-size: 14px
}

@media (min-width: 1800px) {
  .lab-header {
    height: 84px;
    padding-inline: 34px
  }

  .brand-logo {
    width: 180px;
    height: 50px
  }

  .header-title h1 {
    font-size: 26px
  }

  .process-segments {
    top: 22px
  }

  .process-segments button {
    min-height: 42px;
    padding-inline: 24px;
    font-size: 15px
  }

  .heating-lab .heating-panel {
    width: 390px
  }

  .heating-lab .heating-panel.collapsed {
    width: 172px
  }

  .heating-lab .heating-panel :deep(.feature-card-title-label) {
    font-size: 16px
  }

  .playback-bar {
    height: 96px
  }

  .playback-inner {
    width: 1200px
  }

  .timeline-heading {
    font-size: 14px
  }
}

@media (max-width: 1100px) {
  .lab-header {
    padding-inline: 18px
  }

  .brand-logo {
    width: 137px;
    height: 40px
  }

  .tool-button {
    padding-inline: 7px
  }

  .header-title h1 {
    font-size: 21px
  }

  .header-title>span {
    font-size: 9px
  }

  .process-segments {
    max-width: calc(100% - 32px);
    top: 15px
  }

  .process-segments button {
    padding-inline: 12px;
    font-size: 13px
  }

  .heating-lab .heating-panel {
    width: 320px
  }
}

@media (max-width: 960px) {
  .heating-lab .stage-panel {
    --panel-anchor-top: 134px;
  }

  .heating-lab .insight-panel {
    --panel-anchor-top: 196px;
  }

  .heating-lab {
    min-height: 0;
  }

  .lab-header {
    height: 68px;
    padding-inline: 12px
  }

  .brand-logo {
    width: 100px;
    height: 32px
  }

  .header-title {
    position: static;
    transform: none;
    margin-right: auto;
    margin-left: 12px;
    text-align: left
  }

  .header-title h1 {
    font-size: 17px;
    letter-spacing: 0
  }

  .header-title>span {
    display: none
  }

  .header-tools {
    gap: 1px
  }

  .tool-button {
    width: 29px;
    height: 32px;
    padding: 5px
  }

  .tool-button span {
    display: none
  }

  .fullscreen-button {
    margin-left: 1px;
    padding-left: 6px
  }

  .scene-area {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .process-segments {
    position: static;
    order: 0;
    width: 100%;
    max-width: none;
    transform: none;
    justify-content: center;
    padding: 10px 6px;
    border: 0;
    border-radius: 0;
    background: var(--paper);
    box-shadow: none;
    backdrop-filter: none;
    flex-shrink: 0;
  }

  .process-segments button {
    flex: 1;
    min-height: 34px;
    padding: 5px 3px;
    gap: 4px;
    font-size: 11px
  }

  .process-number {
    font-size: 9px
  }

  .overview-segment {
    margin-left: 1px
  }

  .overview-segment svg {
    display: none !important
  }

  .scene-frame {
    order: 1;
    height: auto;
    min-height: 0;
    flex: 1;
  }

  .playback-bar {
    height: 78px;
    padding: 0 96px 0 12px
  }

  .playback-inner {
    gap: 9px;
    width: 100%
  }

  .play-button {
    width: 38px;
    height: 38px
  }

  .replay-button {
    display: none
  }

  .speed-switch button {
    min-width: 29px;
    padding-inline: 5px;
    font-size: 11px
  }

  .loop-button {
    width: 26px
  }

  .timeline-heading {
    font-size: 11px
  }

  .heating-lab .heating-panel {
    width: min(340px, calc(100vw - 24px))
  }

  .heating-lab .heating-panel.collapsed {
    width: 156px
  }
}

@media (max-width: 480px) {
  .playback-bar { height: 96px; }
  .playback-inner {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) 26px;
    grid-template-rows: 1fr 1fr;
    column-gap: 8px;
    row-gap: 0;
    padding-block: 8px;
  }
  .play-button { grid-row: 1 / 3; }
  .timeline { grid-column: 2 / 4; grid-row: 1; }
  .speed-switch { grid-column: 2; grid-row: 2; width: max-content; }
  .loop-button { grid-column: 3; grid-row: 2; }
}

@media (max-width: 360px) {
  .brand-logo { width: 76px; flex-shrink: 0; }
  .header-title { margin-left: 8px; }
  .header-title h1 { font-size: 15px; }
  .tool-button { width: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  .heating-lab button {
    transition: none
  }
}
</style>
