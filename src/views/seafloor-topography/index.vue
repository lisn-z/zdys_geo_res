<template>
  <div
    ref="pageRef"
    class="seafloor-topography-container geo-template-page geo-page theme-dark"
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

      <h1 class="page-title">海底地形</h1>

      <div class="toolbar-actions"></div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <div class="overlay-layer">
            <button
              v-for="item in LANDFORMS"
              :key="item.id"
              type="button"
              class="seafloor-label"
              :class="{
                active: selectedId === item.id,
                hidden: !overlayVisible('label-' + item.id),
              }"
              :style="overlayStyle('label-' + item.id)"
              @click="selectLandform(item.id)"
            >
              {{ item.name }}
            </button>

            <svg class="overlay-svg" :class="{ hidden: !rulerVisible }">
              <line
                v-if="rulerLine"
                :x1="rulerLine.x1"
                :y1="rulerLine.y1"
                :x2="rulerLine.x2"
                :y2="rulerLine.y2"
                class="ruler-line"
              />
              <g
                v-for="tick in rulerTicks"
                :key="tick.id"
                :class="{ hidden: !tick.visible }"
              >
                <line
                  :x1="tick.x - 6"
                  :y1="tick.y"
                  :x2="tick.x + 6"
                  :y2="tick.y"
                  class="ruler-tick"
                />
                <text :x="tick.x + 10" :y="tick.y + 4" class="ruler-text">
                  {{ tick.label }}
                </text>
              </g>
              <text
                v-if="rulerLine"
                :x="rulerLine.x1 + 10"
                :y="rulerLine.y1 - 8"
                class="ruler-text ruler-note"
              >
                示意·非等比
              </text>
            </svg>

            <aside v-if="selectedDef" class="info-card">
              <div class="info-card-head">
                <strong>{{ selectedDef.name }}</strong>
                <button
                  type="button"
                  class="info-card-close"
                  aria-label="收起说明"
                  @click="selectLandform(null)"
                >
                  ×
                </button>
              </div>
              <p v-if="selectedDef.supplement" class="info-card-tag">
                补充说明·非教材原文
              </p>
              <p class="info-card-desc">{{ selectedDef.description }}</p>
              <p v-if="selectedDef.depthLine" class="info-card-depth">
                {{ selectedDef.depthLine }}
              </p>
            </aside>
          </div>

          <div class="timeline-dock seafloor-dock">
            <button
              type="button"
              class="timeline-icon-btn"
              :class="{ active: isPlaying }"
              :aria-label="isPlaying ? '暂停' : '播放'"
              :title="isPlaying ? '暂停' : '播放'"
              @click="togglePlay"
            >
              <el-icon>
                <VideoPause v-if="isPlaying" />
                <VideoPlay v-else />
              </el-icon>
            </button>

            <div class="timeline-main">
              <div class="timeline-copy">
                <span>演示进度</span>
                <strong>{{ Math.round(progress) }}%</strong>
              </div>

              <el-slider
                v-model="progress"
                :min="0"
                :max="100"
                :show-tooltip="false"
                @input="syncStopFromProgress"
              />
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

            <div class="dock-divider"></div>

            <label class="dock-switch">
              <span>标注</span>
              <el-switch v-model="labelsVisible" size="small" />
            </label>

            <label class="dock-switch">
              <span>水深尺</span>
              <el-switch v-model="rulerVisible" size="small" />
            </label>

            <div class="view-options">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="changeView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn" @click="resetAll">
              复位
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import { LANDFORMS, TOUR_STOPS, landformById, type LandformId } from './seafloor-data'
import {
  createSeafloorScene,
  type OverlayItem,
  type SeafloorController,
  type ViewId,
} from './seafloor-scene'

const hasLeftPanel = false
const hasRightPanel = false

const {
  rootRef: pageRef,
  layoutMode,
  workspaceAttrs,
  draggingSide,
  viewportResizing,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },

  onLayoutChange(state) {
    if (state.resizing) {
      return
    }
    scheduleSceneResize(90)
  },

  onResize(payload) {
    if (payload.phase === 'end' || payload.phase === 'reset') {
      scheduleSceneResize(0)
    }
  },
})

const threeContainerRef = ref<HTMLElement | null>(null)

const progress = ref(0)
const playbackSpeed = ref(1)
const isPlaying = ref(true)
const speedOptions = [1, 1.5, 2]
const labelsVisible = ref(true)
const rulerVisible = ref(true)
const currentView = ref<ViewId>('oblique')
const selectedId = ref<LandformId | null>(null)

const viewOptions: { label: string; value: ViewId }[] = [
  { label: '斜 45°', value: 'oblique' },
  { label: '正视剖面', value: 'section' },
  { label: '下潜近看', value: 'dive' },
]

const TOUR_SECONDS = 56
const STOP_COUNT = TOUR_STOPS.length

const selectedDef = computed(
  () => LANDFORMS.find((item) => item.id === selectedId.value) ?? null,
)

const overlayItems = ref<Record<string, OverlayItem>>({})
let lastOverlaySig = ''
let controller: SeafloorController | null = null

function overlayVisible(id: string): boolean {
  return overlayItems.value[id]?.visible ?? false
}

function overlayStyle(id: string): Record<string, string> {
  const item = overlayItems.value[id]
  if (!item) {
    return { display: 'none' }
  }
  return { left: item.x + 'px', top: item.y + 'px' }
}

const RULER_TICK_DEFS = [
  { id: 'ruler-shelf', label: '200 米以内' },
  { id: 'ruler-ridge', label: '高出两侧 3000 ~ 4000 米' },
  { id: 'ruler-slope', label: '数千米' },
  { id: 'ruler-trench', label: '1 万多米' },
]

const rulerTicks = computed(() =>
  RULER_TICK_DEFS.map((def) => {
    const item = overlayItems.value[def.id]
    return {
      ...def,
      x: item?.x ?? 0,
      y: item?.y ?? 0,
      visible: item?.visible ?? false,
    }
  }),
)

const rulerLine = computed(() => {
  const top = overlayItems.value['ruler-top']
  const bottom = overlayItems.value['ruler-bottom']
  if (!top?.visible || !bottom?.visible) {
    return null
  }
  return { x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y }
})

function selectLandform(id: LandformId | null): void {
  selectedId.value = id
  controller?.setSelected(id)
  if (id) {
    isPlaying.value = false
  }
}

let pointerDownX = 0
let pointerDownY = 0

function onHostPointerDown(event: PointerEvent): void {
  pointerDownX = event.clientX
  pointerDownY = event.clientY
}

function onHostPointerUp(event: PointerEvent): void {
  if (Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > 6) {
    return
  }
  const host = threeContainerRef.value
  if (!host || !controller) {
    return
  }
  selectLandform(
    controller.pick(event.clientX, event.clientY, host.getBoundingClientRect()),
  )
}

function changeView(view: ViewId): void {
  currentView.value = view
  controller?.setView(view)
}

function stopIndexFor(value: number): number {
  return Math.min(STOP_COUNT - 1, Math.floor(value / (100 / STOP_COUNT)))
}

let currentStop = -1

function syncStop(): void {
  const index = stopIndexFor(progress.value)
  if (index === currentStop) {
    return
  }
  currentStop = index
  const focus = TOUR_STOPS[index] ?? null
  const flightMs = (TOUR_SECONDS / STOP_COUNT) * 0.7 * 1000 / playbackSpeed.value
  controller?.flyToStop(focus ? landformById(focus).anchorFx : null, flightMs)
  selectedId.value = focus
  controller?.setSelected(focus)
}

function syncStopFromProgress(): void {
  currentStop = -1
  syncStop()
}

function togglePlay(): void {
  if (!isPlaying.value && progress.value >= 100) {
    progress.value = 0
    currentStop = -1
  }
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    syncStopFromProgress()
  }
}

function resetAll(): void {
  progress.value = 0
  isPlaying.value = false
  currentStop = -1
  selectedId.value = null
  currentView.value = 'oblique'
  controller?.setSelected(null)
  controller?.setView('oblique')
}

let tourFrameId = 0
let tourLastTime = 0

function tourTick(now: number): void {
  const dt = Math.min(0.1, (now - tourLastTime) / 1000)
  tourLastTime = now
  if (isPlaying.value) {
    progress.value = Math.min(
      100,
      progress.value + (dt * 100 / TOUR_SECONDS) * playbackSpeed.value,
    )
    syncStop()
    if (progress.value >= 100) {
      isPlaying.value = false
    }
  }
  tourFrameId = requestAnimationFrame(tourTick)
}

watch(labelsVisible, (value) => controller?.setLabelsVisible(value))
watch(rulerVisible, (value) => controller?.setRulerVisible(value))

let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let lastWidth = 0
let lastHeight = 0
let hostObserver: ResizeObserver | null = null

function applySceneSize(): void {
  const host = threeContainerRef.value
  if (!host || !controller) {
    return
  }
  const rect = host.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (width <= 0 || height <= 0) {
    return
  }
  if (width === lastWidth && height === lastHeight) {
    return
  }
  lastWidth = width
  lastHeight = height
  controller.resize(width, height)
}

function scheduleSceneResize(delay = 110): void {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }
  cancelAnimationFrame(sceneResizeFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) {
      return
    }
    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeFrame = requestAnimationFrame(applySceneSize)
    })
  }, delay)
}

onMounted(async () => {
  await nextTick()
  const host = threeContainerRef.value
  if (!host) {
    return
  }
  controller = createSeafloorScene(host, {
    onOverlay(items) {
      let sig = ''
      for (const item of items) {
        sig += item.id + Math.round(item.x) + ',' + Math.round(item.y) + ',' + (item.visible ? 1 : 0) + ';'
      }
      if (sig === lastOverlaySig) {
        return
      }
      lastOverlaySig = sig
      const map: Record<string, OverlayItem> = {}
      for (const item of items) {
        map[item.id] = item
      }
      overlayItems.value = map
    },
    onUserInteract() {
      isPlaying.value = false
    },
  })
  controller.setLabelsVisible(labelsVisible.value)
  controller.setRulerVisible(rulerVisible.value)
  applySceneSize()
  hostObserver = new ResizeObserver(() => scheduleSceneResize(120))
  hostObserver.observe(host)
  host.addEventListener('pointerdown', onHostPointerDown)
  host.addEventListener('pointerup', onHostPointerUp)
  tourLastTime = performance.now()
  tourFrameId = requestAnimationFrame(tourTick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(tourFrameId)
  cancelAnimationFrame(sceneResizeFrame)
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }
  const host = threeContainerRef.value
  if (host) {
    host.removeEventListener('pointerdown', onHostPointerDown)
    host.removeEventListener('pointerup', onHostPointerUp)
  }
  hostObserver?.disconnect()
  hostObserver = null
  controller?.dispose()
  controller = null
})
</script>

<style scoped>
.stage-content {
  position: relative;
}

.overlay-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.overlay-layer .hidden {
  display: none;
}

.seafloor-label {
  position: absolute;
  transform: translate(-50%, -130%);
  pointer-events: auto;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(126, 195, 224, 0.55);
  background: rgba(9, 26, 38, 0.78);
  color: #d9eef8;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
}

.seafloor-label.active {
  border-color: #7ec3e0;
  color: #ffffff;
  background: rgba(23, 62, 84, 0.9);
}

.overlay-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ruler-line {
  stroke: rgba(217, 238, 248, 0.75);
  stroke-width: 1.5;
}

.ruler-tick {
  stroke: rgba(217, 238, 248, 0.9);
  stroke-width: 1.5;
}

.ruler-text {
  fill: #d9eef8;
  font-size: 11px;
}

.ruler-note {
  fill: rgba(217, 238, 248, 0.6);
}

.info-card {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 268px;
  pointer-events: auto;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(126, 195, 224, 0.35);
  background: rgba(9, 26, 38, 0.86);
  color: #d9eef8;
}

.info-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
}

.info-card-close {
  border: 0;
  background: transparent;
  color: rgba(217, 238, 248, 0.7);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.info-card-tag {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(217, 238, 248, 0.55);
}

.info-card-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
}

.info-card-depth {
  margin-top: 6px;
  font-size: 12px;
  color: #7ec3e0;
}

.dock-divider {
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  background: rgba(126, 195, 224, 0.25);
}

.dock-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #cfe8f5;
  white-space: nowrap;
}

.view-options {
  display: inline-flex;
  gap: 6px;
}

.seafloor-dock {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  width: min(1200px, calc(100% - 28px));
}

.seafloor-dock > * {
  flex: 0 0 auto;
}

.seafloor-dock .timeline-main {
  flex: 1 1 auto;
  min-width: 120px;
}

.layout-small .seafloor-dock {
  flex-wrap: wrap;
  width: calc(100% - 20px);
}
</style>
