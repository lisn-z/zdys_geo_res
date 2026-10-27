<template>
  <div ref="pageRef" class="seafloor-topography-container geo-template-page geo-page theme-light"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="智地有申" />
      </div>

      <h1 class="page-title">海底地形</h1>

      <div class="toolbar-actions"></div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="threeContainerRef" class="scene-host three-host"></div>

          <div class="overlay-layer">
            <svg class="overlay-svg label-leaders" aria-hidden="true">
              <g v-for="line in labelLeaders" :key="line.id"
                :class="{ active: line.landform && selectedId === line.landform }">
                <polyline :points="line.points" />
                <circle :cx="line.anchorX" :cy="line.anchorY" r="3" />
              </g>
            </svg>
            <span class="seafloor-label continent-label" :class="{ hidden: !overlayVisible('label-continent') }"
              :style="overlayStyle('label-continent')">大陆</span>
            <span class="seafloor-label section-label" :class="{ hidden: !overlayVisible('label-trench-section') }"
              :style="overlayStyle('label-trench-section')">海沟</span>
            <button v-for="item in LANDFORMS" :key="item.id" type="button" class="seafloor-label" :class="{
              active: selectedId === item.id,
              hidden: !overlayVisible('label-' + item.id),
            }" :style="overlayStyle('label-' + item.id)" :aria-pressed="selectedId === item.id"
              @click="selectLandform(item.id)">
              <span>{{ item.name }}</span>
              <small v-if="rulerVisible && item.depthLine">{{ item.depthLine }}</small>
            </button>

            <p v-if="rulerVisible" class="depth-note">地形纵向夸张 · 深度为教材概念范围</p>

            <aside v-if="selectedDef" class="info-card">
              <div class="info-card-head">
                <strong>{{ selectedDef.id === 'ridge' ? '海岭（大洋中脊）' : selectedDef.name }}</strong>
                <button type="button" class="info-card-close"
                  :aria-label="currentView === 'dive' ? '返回总览并收起说明' : '收起说明'" @click="closeInfo">
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
              <button v-if="currentView !== 'dive'" type="button" class="dive-button" @click="diveToSelected">
                下潜至此处
              </button>
              <template v-else>
                <nav class="dive-destinations" aria-label="切换下潜地形">
                  <button v-for="item in LANDFORMS" :key="item.id" type="button"
                    :class="{ active: selectedId === item.id }" :aria-pressed="selectedId === item.id"
                    @click="selectLandform(item.id)">{{ item.name }}</button>
                </nav>
                <button type="button" class="overview-button" @click="changeView('oblique')">返回总览</button>
              </template>
            </aside>
          </div>

          <div class="timeline-dock seafloor-dock">
            <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
              :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
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

              <el-slider v-model="progress" :min="0" :max="100" :show-tooltip="false" aria-label="海底地形演示进度"
                @input="syncStopFromProgress" />
            </div>

            <div class="speed-options">
              <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
                :class="{ active: playbackSpeed === item }" :aria-pressed="playbackSpeed === item"
                @click="playbackSpeed = item">
                {{ item }}×
              </button>
            </div>

            <div class="dock-divider"></div>

            <label class="dock-switch">
              <span>标注</span>
              <el-switch v-model="labelsVisible" size="small" />
            </label>

            <label class="dock-switch">
              <span>深度提示</span>
              <el-switch v-model="rulerVisible" size="small" />
            </label>

            <div class="view-options">
              <button v-for="item in viewOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: currentView === item.value }" :aria-pressed="currentView === item.value"
                @click="changeView(item.value)">
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
const isPlaying = ref(false)
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

const labelLeaders = computed(() => {
  const labels = LANDFORMS.filter((landform) => landform.depthLine).map((landform) => ({ id: 'label-' + landform.id, landform: landform.id }))
  return labels.flatMap((label) => {
    const item = overlayItems.value[label.id]
    if (!labelsVisible.value || !item?.visible || item.anchorX == null || item.anchorY == null) return []
    const startY = item.y + (rulerVisible.value ? 24 : 15)
    const elbowY = startY + (item.anchorY - startY) * .5
    return [{ ...item, landform: label.landform, anchorX: item.anchorX, anchorY: item.anchorY, points: `${item.x},${startY} ${item.x},${elbowY} ${item.anchorX},${item.anchorY}` }]
  })
})

function selectLandform(id: LandformId | null): void {
  isPlaying.value = false
  controller?.pauseFlight()
  selectedId.value = id
  controller?.setSelected(id)
}

function diveToSelected(): void {
  changeView('dive')
  controller?.setSelected(selectedId.value)
}

function closeInfo(): void {
  if (currentView.value === 'dive') changeView('oblique')
  selectedId.value = null
  controller?.setSelected(null)
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
  isPlaying.value = false
  controller?.pauseFlight()
  currentView.value = view
  if (view === 'dive' && !selectedId.value) {
    selectedId.value = 'shelf'
    controller?.setSelected('shelf')
  }
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
  if (!isPlaying.value) controller?.pauseFlight()
  if (isPlaying.value) {
    syncStopFromProgress()
  }
}

function resetAll(): void {
  progress.value = 0
  isPlaying.value = false
  controller?.pauseFlight()
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
        sig += item.id + Math.round(item.x) + ',' + Math.round(item.y) + ',' + Math.round(item.anchorX ?? 0) + ',' + Math.round(item.anchorY ?? 0) + ',' + (item.visible ? 1 : 0) + ';'
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
.seafloor-topography-container {
  --theme-primary: #2d6b70;
  --theme-primary-rgb: 45, 107, 112;
  --theme-secondary: #2d6b70;
  --theme-secondary-rgb: 45, 107, 112;
  --theme-primary-hover: #245b60;
  --theme-secondary-hover: #245b60;
  --theme-slider-middle: #5f9691;
  --theme-slider-end: #5f9691;
  --theme-on-primary: #fffefa;
  --page-background: #f5f4ee;
  --stage-background: #f5f4ee;
  --panel-background: rgba(255, 254, 250, .95);
  --panel-border: #d8dfda;
  --panel-shadow: 0 8px 24px rgba(42, 65, 62, .07);
  --text-primary: #294b50;
  --text-secondary: #526a6b;
  --text-muted: #7c8c8b;
  --inactive-background: #fbfbf7;
  --inactive-border: #dce3dd;
  --hover-background: #edf2ec;
  --hover-border: #a8c2bc;
  --slider-runway: #dce5df;
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  color: #294b50;
  background: #f5f4ee;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.seafloor-topography-container .top-toolbar {
  padding: 0 24px;
  background: #fbfaf6;
  border-bottom: 1px solid #dfe4dd;
  box-shadow: none;
  backdrop-filter: none;
}

.seafloor-topography-container .brand-area {
  display: grid;
  place-items: center;
  flex: 0 0 168px;
  width: 168px;
  height: 52px;
  max-width: none;
  overflow: hidden;
}

.seafloor-topography-container .brand-logo {
  display: block;
  width: 120px;
  height: 40px;
  max-width: none;
  max-height: none;
  object-fit: contain;
  object-position: center;
  transform: scale(2.15);
  transform-origin: center;
}

.seafloor-topography-container .page-title {
  max-width: calc(100% - 350px);
  color: transparent;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: .12em;
  background: linear-gradient(90deg, #2ec4b6, #247cff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.seafloor-topography-container .workspace,
.seafloor-topography-container .center-stage {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.seafloor-topography-container .stage-content {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f4ee;
}

.seafloor-topography-container .scene-host {
  position: absolute;
  z-index: 0;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  touch-action: none;
}

.scene-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.overlay-layer {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.overlay-layer .hidden {
  display: none;
}

.seafloor-label {
  position: absolute;
  z-index: 3;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  max-width: 180px;
  padding: 7px 11px;
  border: 1px solid #c7d4cd;
  border-radius: 5px;
  background: rgba(255, 254, 249, .96);
  box-shadow: 0 2px 8px rgba(53, 79, 70, .05);
  color: #31555b;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  cursor: pointer;
  pointer-events: auto;
  transition: border-color .18s, background .18s;
}

.seafloor-label small {
  font-size: 10px;
  font-weight: 400;
  color: #5a7477;
  line-height: 1.4;
  white-space: nowrap;
}

.continent-label,
.section-label {
  pointer-events: none;
}

.seafloor-label:hover,
.seafloor-label.active {
  border-color: #2d6b70;
  background: #edf5ed;
}

.seafloor-label:focus-visible,
.seafloor-topography-container button:focus-visible {
  outline: 2px solid #2d6b70;
  outline-offset: 3px;
}

.seafloor-topography-container .overlay-svg.label-leaders {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  max-width: none;
  max-height: none;
  opacity: 1;
  visibility: visible;
  pointer-events: none;
  overflow: visible;
}

.seafloor-topography-container .label-leaders g,
.seafloor-topography-container .label-leaders polyline,
.seafloor-topography-container .label-leaders circle {
  opacity: 1;
  visibility: visible;
}

.seafloor-topography-container .label-leaders polyline {
  stroke: #b65340;
  stroke-width: 1.5;
  stroke-dasharray: 2 4;
  stroke-linecap: round;
  fill: none;
  vector-effect: non-scaling-stroke;
}

.label-leaders circle {
  fill: #b65340;
  stroke: #fffaf0;
  stroke-width: 1.3;
}

.label-leaders .active polyline,
.label-leaders .active circle {
  stroke: #a14332;
  stroke-width: 1.8;
}

.depth-note {
  position: absolute;
  left: 24px;
  bottom: 94px;
  margin: 0;
  color: #71847d;
  font-size: 10px;
  letter-spacing: .03em;
}

.info-card {
  position: absolute;
  z-index: 4;
  top: 18px;
  right: 22px;
  width: 268px;
  max-width: calc(100% - 32px);
  box-sizing: border-box;
  pointer-events: auto;
  padding: 17px 18px 15px;
  border-radius: 9px;
  border: 1px solid #d9e0d8;
  background: rgba(255, 254, 249, .96);
  box-shadow: 0 8px 24px rgba(53, 79, 70, .06);
  color: #38585a;
}

.info-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 17px;
  letter-spacing: .04em;
}

.info-card-head strong {
  font-weight: 600;
}

.info-card-close {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #7b8e89;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.info-card-close:hover {
  background: #eef2eb;
}

.info-card-tag {
  margin: 7px 0 0;
  font-size: 10px;
  color: #8b9691;
}

.info-card-desc {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.85;
  color: #637875;
}

.info-card-depth {
  margin: 11px 0 0;
  padding-top: 10px;
  border-top: 1px solid #e6ebe4;
  font-size: 12px;
  color: #356a70;
}

.dive-button,
.overview-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid #c9d8d0;
  border-radius: 5px;
  color: #315f63;
  background: #eef4ed;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.dive-button:hover,
.overview-button:hover {
  background: #e1ece3;
}

.dive-destinations {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 14px;
}

.dive-destinations button {
  padding: 7px 2px;
  border: 1px solid #dce4db;
  border-radius: 4px;
  background: #fbfcf7;
  color: #72837c;
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.dive-destinations button.active {
  border-color: #7b9f92;
  background: #e9f1e8;
  color: #285c60;
}

.seafloor-topography-container .seafloor-dock {
  position: absolute;
  z-index: 5;
  left: 50%;
  right: auto;
  bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 12px;
  width: min(1120px, calc(100% - 36px));
  min-width: 0;
  max-width: calc(100% - 36px);
  height: auto;
  box-sizing: border-box;
  padding: 12px 16px;
  transform: translateX(-50%);
  border: 1px solid #d5dfd5;
  border-radius: 12px;
  background: rgba(255, 254, 249, .96);
  box-shadow: 0 5px 22px rgba(49, 75, 64, .08);
  backdrop-filter: blur(12px);
}

.seafloor-dock>* {
  flex: 0 0 auto;
}

.seafloor-topography-container .timeline-icon-btn {
  width: 40px;
  height: 40px;
  color: #fffefa;
  background: #2d6b70;
  border: 1px solid #2d6b70;
  box-shadow: none;
  font-size: 20px;
}

.seafloor-topography-container .timeline-icon-btn:hover {
  background: #245b60;
}

.seafloor-topography-container .timeline-main {
  flex: 1 1 170px;
  width: auto;
  min-width: 110px;
  max-width: 260px;
}

.seafloor-topography-container .timeline-copy {
  margin-bottom: 1px;
  color: #7c8c86;
  font-size: 10px;
  font-weight: 400;
}

.seafloor-topography-container .timeline-copy strong {
  color: #476f70;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.seafloor-topography-container .theme-btn {
  width: auto;
  min-height: 36px;
  padding: 7px 12px;
  color: #697c77;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  border: 1px solid #dce4dc;
  border-radius: 6px;
  background: #fafbf6;
  box-shadow: none;
  cursor: pointer;
}

.seafloor-topography-container .theme-btn:hover {
  background: #edf3eb;
}

/* The shared template uses !important glow styles; keep this lesson matte. */
.seafloor-topography-container .theme-btn:not(.active) {
  background: #fafbf6 !important;
  border-color: #dce4dc !important;
  box-shadow: none !important;
}

.seafloor-topography-container .theme-btn:not(.active):hover {
  background: #edf3eb !important;
  border-color: #b7cabe !important;
  box-shadow: none !important;
}

.seafloor-topography-container .theme-btn.active {
  color: #fffefa;
  background: #2d6b70;
  border-color: #2d6b70;
  box-shadow: none !important;
}

.seafloor-topography-container .timeline-icon-btn.active {
  box-shadow: none !important;
}

.seafloor-topography-container .speed-options {
  display: flex;
  gap: 4px;
}

.seafloor-topography-container .speed-btn {
  min-width: 38px;
  padding: 7px 8px;
  font-variant-numeric: tabular-nums;
}

.dock-divider {
  width: 1px;
  height: 30px;
  margin: 0 1px;
  background: #e0e6dd;
}

.dock-switch {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #6d8078;
  white-space: nowrap;
}

.seafloor-topography-container :deep(.el-switch__core) {
  min-width: 32px;
  height: 18px;
  border: 1px solid #c4d3ca;
  background: #dde5dc;
  box-shadow: none;
}

.seafloor-topography-container :deep(.el-switch.is-checked .el-switch__core) {
  background: #4c8381 !important;
  border-color: #4c8381 !important;
  box-shadow: none;
}

.seafloor-topography-container :deep(.el-switch__action) {
  width: 14px;
  height: 14px;
  background: #fffefa;
  box-shadow: none;
}

.seafloor-topography-container :deep(.el-slider) {
  height: 20px;
}

.seafloor-topography-container :deep(.el-slider__runway) {
  height: 3px;
  margin: 9px 0;
  background: #e0e7dd;
}

.seafloor-topography-container :deep(.el-slider__bar) {
  height: 3px;
  background: #5f9691 !important;
}

.seafloor-topography-container :deep(.el-slider__button-wrapper) {
  top: -17px;
}

.seafloor-topography-container :deep(.el-slider__button) {
  width: 10px;
  height: 10px;
  border: 2px solid #5f9691;
  background: #fffefa;
  box-shadow: none;
}

.view-options {
  display: inline-flex;
  gap: 4px;
}

.seafloor-topography-container .reset-scene-btn {
  flex: 0 0 auto;
  width: auto;
  min-width: 50px;
  margin: 0;
  padding: 7px 10px;
}

@media (max-width: 1100px) {
  .seafloor-topography-container .seafloor-dock {
    gap: 8px;
    padding: 10px 12px;
  }

  .seafloor-topography-container .theme-btn {
    padding: 7px 9px;
    font-size: 11px;
  }

  .dock-switch {
    gap: 5px;
    font-size: 11px;
  }
}

@media (max-width: 850px) {
  .seafloor-topography-container .seafloor-dock {
    flex-wrap: wrap;
    bottom: 10px;
  }

  .seafloor-topography-container .timeline-main {
    flex: 1 1 180px;
    max-width: none;
  }

  .seafloor-topography-container .top-toolbar {
    padding: 0 16px;
  }

  .info-card {
    top: 12px;
    right: 16px;
    width: 240px;
    padding: 13px 14px;
  }

  .dock-divider {
    display: none;
  }

  .depth-note {
    left: 18px;
    bottom: 132px;
    font-size: 9px;
  }
}

@media (max-width: 540px) {
  .seafloor-topography-container {
    grid-template-rows: 56px minmax(0, 1fr);
  }

  .seafloor-topography-container .brand-area {
    width: 132px;
    height: 44px;
    flex-basis: 132px;
  }

  .seafloor-topography-container .brand-logo {
    width: 132px;
    height: 44px;
  }

  .seafloor-topography-container .page-title {
    max-width: none;
    font-size: 19px;
    left: auto;
    right: 16px;
    transform: translateY(-50%);
  }

  .seafloor-topography-container .seafloor-dock {
    width: calc(100% - 20px);
    max-width: calc(100% - 20px);
    gap: 7px;
    padding: 10px;
  }

  .seafloor-topography-container .timeline-main {
    flex-basis: 90px;
    min-width: 70px;
  }

  .seafloor-topography-container .timeline-icon-btn {
    width: 34px;
    height: 34px;
  }

  .seafloor-topography-container .speed-btn {
    min-width: 33px;
    padding: 6px;
  }

  .seafloor-topography-container .theme-btn {
    min-height: 32px;
  }

  .seafloor-label {
    max-width: 145px;
    padding: 5px 7px;
    font-size: 12px;
  }

  .seafloor-label small {
    font-size: 9px;
    white-space: normal;
  }

  .info-card {
    width: 220px;
  }

  .depth-note {
    bottom: 158px;
  }
}

@media (min-width: 2200px) and (min-height: 1200px) {
  .seafloor-topography-container {
    grid-template-rows: 76px minmax(0, 1fr);
  }

  .seafloor-topography-container .brand-area {
    width: 208px;
    height: 64px;
    flex-basis: 208px;
  }

  .seafloor-topography-container .brand-logo {
    width: 208px;
    height: 64px;
  }

  .seafloor-topography-container .page-title {
    font-size: 30px;
  }

  .seafloor-topography-container .seafloor-dock {
    width: min(1500px, calc(100% - 60px));
    padding: 16px 24px;
    gap: 18px;
  }

  .seafloor-topography-container .theme-btn {
    font-size: 15px !important;
    min-height: 44px;
    padding: 10px 16px;
  }

  .seafloor-topography-container .timeline-icon-btn {
    width: 48px;
    height: 48px;
  }

  .seafloor-topography-container .timeline-copy {
    font-size: 13px !important;
  }

  .seafloor-topography-container .timeline-copy strong {
    font-size: 14px !important;
  }

  .dock-switch {
    font-size: 15px;
  }

  .seafloor-label {
    max-width: 230px;
    padding: 10px 16px;
    font-size: 18px;
  }

  .seafloor-label small {
    font-size: 13px;
  }

  .info-card {
    width: 330px;
    padding: 21px 22px;
  }

  .info-card-head {
    font-size: 21px;
  }

  .info-card-desc {
    font-size: 15px;
  }

  .info-card-depth,
  .dive-button,
  .overview-button {
    font-size: 15px;
  }

  .dive-destinations button {
    font-size: 13px;
  }
}
</style>
