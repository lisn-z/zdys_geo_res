<template>
  <div v-if="hasGuide" ref="overlay" class="trace-overlay" :class="{ 'is-drawing': active }" :style="{ '--trace-color': color }">
    <svg class="trace-paths" aria-hidden="true">
      <path class="trace-halo" :d="fullPath" />
      <path class="trace-guide" :d="fullPath" />
      <path v-if="normalizedProgress > 0" class="trace-painted" :d="paintedPath" />
      <circle v-if="firstPoint" class="trace-start" :cx="firstPoint.x" :cy="firstPoint.y" r="4" />
      <g v-if="lastPoint" class="trace-finish" :transform="`translate(${lastPoint.x} ${lastPoint.y})`">
        <circle r="8" /><circle r="3" />
      </g>
    </svg>
    <button
      ref="brushButton"
      type="button"
      class="trace-brush"
      :class="{ 'at-segment-end': atSegmentEnd }"
      :style="{ transform: `translate3d(${brushPoint.x}px, ${brushPoint.y}px, 0) translate(-50%, -50%)` }"
      :aria-label="`${label}画笔，已描 ${percent}%。按住拖动沿虚线描画，或用右方向键、上方向键逐步描画。`"
      title="按住画笔往终点拖动，画笔会自动沿轨迹描画"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @keydown="onKeyDown"
      @click.prevent.stop
      @dragstart.prevent
    >
      <span class="brush-contact" aria-hidden="true"></span>
      <svg class="brush-art" width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
        <path class="brush-shadow" d="M8 38c5 1 10-2 12-7l-7-5c0 6-1 9-5 12Z" />
        <path class="brush-tip" d="M8 38c5 1 10-2 12-7l-7-5c0 6-1 9-5 12Z" />
        <path class="brush-ferrule" d="m13 26 6 6 7-8-6-5Z" />
        <path class="brush-handle" d="m20 19 6 5L39 9c4-5-2-9-5-5Z" />
        <path class="brush-shine" d="m24 18 11-12" />
      </svg>
    </button>
    <div class="trace-status" role="status" aria-live="off">
      <div class="trace-status-line"><span class="trace-color-dot"></span><strong>{{ label }}</strong><span class="trace-percent">{{ percent }}%</span></div>
      <div class="trace-progress-track"><span :style="{ width: `${percent}%` }"></span></div>
      <span class="trace-instruction">{{ atSegmentEnd ? '这一段完成了' : active ? '保持按住，往终点拖动' : '按住画笔拖动 · 自动沿轨迹描画' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { advanceTrace, type TraceId } from './globe-tracing'

type Point = { x: number; y: number }
const props = defineProps<{
  guide: { id: TraceId | null; points: Point[]; start: number; end: number }
  progress: number
  color: string
  label: string
}>()
const emit = defineEmits<{
  start: []
  progress: [value: number]
  pause: []
  complete: []
}>()

const overlay = ref<HTMLDivElement | null>(null)
const brushButton = ref<HTMLButtonElement | null>(null)
const active = ref(false)
const localProgress = ref(props.progress)
let pointerId: number | null = null
let captureElement: HTMLButtonElement | null = null
let completionSent = false
let grabOffset: Point = { x: 0, y: 0 }
let progressFrame = 0
let publishedProgress = props.progress
const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
const hasGuide = computed(() => props.guide.id !== null && props.guide.points.length >= 2 && props.guide.end > props.guide.start)
const normalizedProgress = computed(() => clamp((localProgress.value - props.guide.start) / (props.guide.end - props.guide.start)))
const atSegmentEnd = computed(() => normalizedProgress.value >= 1)
const percent = computed(() => Math.round(clamp(localProgress.value) * 100))
const firstPoint = computed(() => props.guide.points[0])
const lastPoint = computed(() => props.guide.points[props.guide.points.length - 1])

// The scene samples equal geographic angles. Interpolate by sample index, not
// screen-space arc length, to keep the pen and the 3D painted line aligned.
function pointAt(progress: number): Point {
  const points = props.guide.points
  if (!points.length) return { x: 0, y: 0 }
  const index = clamp(progress) * (points.length - 1)
  const lower = Math.floor(index)
  const first = points[lower]!
  const second = points[Math.min(lower + 1, points.length - 1)]!
  const fraction = index - lower
  return { x: first.x + (second.x - first.x) * fraction, y: first.y + (second.y - first.y) * fraction }
}
const brushPoint = computed(() => pointAt(normalizedProgress.value))
function pathFor(points: readonly Point[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ')
}
const fullPath = computed(() => pathFor(props.guide.points))
const paintedPath = computed(() => {
  const index = Math.floor(normalizedProgress.value * (props.guide.points.length - 1))
  return pathFor([...props.guide.points.slice(0, index + 1), brushPoint.value])
})

function publishProgress() {
  if (progressFrame) cancelAnimationFrame(progressFrame)
  progressFrame = 0
  if (localProgress.value === publishedProgress) return
  publishedProgress = localProgress.value
  emit('progress', publishedProgress)
}
function pauseGesture(publish = true) {
  if (publish) publishProgress()
  else { cancelAnimationFrame(progressFrame); progressFrame = 0 }
  const wasActive = active.value
  const previousPointer = pointerId
  const previousElement = captureElement
  pointerId = null
  captureElement = null
  active.value = false
  try {
    if (previousPointer !== null && previousElement?.hasPointerCapture(previousPointer)) previousElement.releasePointerCapture(previousPointer)
  } catch { /* Pointer cancellation or a guide change may remove the button. */ }
  if (wasActive) emit('pause')
}

function updateProgress(nextNormalized: number) {
  const next = clamp(nextNormalized)
  if (next <= normalizedProgress.value) return
  localProgress.value = props.guide.start + next * (props.guide.end - props.guide.start)
  // The pen responds locally; the larger Vue/Three scene only needs one update
  // per display frame, even when a pointer supplies many coalesced samples.
  if (!progressFrame) progressFrame = requestAnimationFrame(publishProgress)
  if (next >= 1) {
    // Releasing at a hemisphere boundary lets the scene reveal the next half.
    pauseGesture()
    if (props.guide.end >= 1 && !completionSent) {
      completionSent = true
      emit('complete')
    }
  }
}

function localPoint(event: PointerEvent, cachedBounds?: DOMRect): Point | null {
  const host = overlay.value
  if (!host) return null
  const bounds = cachedBounds || host.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return null
  return {
    x: (event.clientX - bounds.left) * host.clientWidth / bounds.width,
    y: (event.clientY - bounds.top) * host.clientHeight / bounds.height,
  }
}

function tracePointer(event: PointerEvent, bounds?: DOMRect) {
  if (!active.value || event.pointerId !== pointerId || !hasGuide.value) return
  const raw = localPoint(event, bounds)
  if (!raw) return
  const point = { x: raw.x - grabOffset.x, y: raw.y - grabOffset.y }
  const next = advanceTrace(props.guide.points, normalizedProgress.value, point)
  updateProgress(next)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary || active.value || !hasGuide.value || atSegmentEnd.value) return
  const point = localPoint(event)
  if (!point) return
  event.preventDefault()
  event.stopPropagation()
  pointerId = event.pointerId
  active.value = true
  // Students can grab any part of the brush, not just its contact point.
  grabOffset = { x: point.x - brushPoint.value.x, y: point.y - brushPoint.value.y }
  captureElement = event.currentTarget as HTMLButtonElement
  try { captureElement.setPointerCapture(event.pointerId) } catch { /* Window listeners below still release the gesture. */ }
  captureElement.focus({ preventScroll: true })
  emit('start')
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerId !== pointerId) return
  event.preventDefault()
  event.stopPropagation()
  if (event.pointerType === 'mouse' && !(event.buttons & 1)) { pauseGesture(); return }
  const bounds = overlay.value?.getBoundingClientRect()
  const coalesced = event.getCoalescedEvents?.() ?? []
  for (const sample of coalesced) tracePointer(sample, bounds)
  tracePointer(event, bounds)
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerId !== pointerId) return
  event.preventDefault()
  event.stopPropagation()
  tracePointer(event)
  pauseGesture()
}
function onPointerCancel(event: PointerEvent) {
  if (event.pointerId === pointerId) pauseGesture()
}
function onOtherPointer(event: PointerEvent) {
  if (active.value && pointerId !== null && event.pointerId !== pointerId) pauseGesture()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    pauseGesture()
    return
  }
  if (!['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Enter', ' '].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  if (!['ArrowRight', 'ArrowUp'].includes(event.key) || active.value || !hasGuide.value || atSegmentEnd.value) return
  active.value = true
  emit('start')
  const nextPoint = pointAt(Math.min(1, normalizedProgress.value + 0.02))
  updateProgress(advanceTrace(props.guide.points, normalizedProgress.value, nextPoint))
  pauseGesture()
}
function onGlobalKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && active.value) {
    event.preventDefault()
    pauseGesture()
  }
}

watch(() => props.progress, value => {
  // An acknowledged frame can lag the next local pointer sample. Only an
  // external rollback (such as Undo) should cancel the gesture.
  if (value === publishedProgress && value < localProgress.value) return
  if (value < localProgress.value) pauseGesture(false)
  localProgress.value = value
  publishedProgress = value
  if (value < 1) completionSent = false
})
// Comparing coordinates avoids cancellation when a stable scene simply emits
// a new points array each frame; a real camera/guide change ends the gesture.
watch(() => `${props.guide.id}:${props.guide.start}:${props.guide.end}:${props.guide.points.map((point: Point) => `${point.x},${point.y}`).join(';')}`, () => {
  pauseGesture(false)
  localProgress.value = props.progress
  publishedProgress = props.progress
  completionSent = false
})

onMounted(() => {
  window.addEventListener('pointerdown', onOtherPointer, true)
  // Keep a held stroke alive even if capture is unavailable or the moving
  // brush is no longer under the pointer. Up/cancel/blur still end it normally.
  window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerCancel, true)
  window.addEventListener('keydown', onGlobalKeyDown)
  window.addEventListener('blur', onWindowBlur)
})
function onWindowBlur() { pauseGesture() }
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onOtherPointer, true)
  window.removeEventListener('pointermove', onPointerMove, true)
  window.removeEventListener('pointerup', onPointerUp, true)
  window.removeEventListener('pointercancel', onPointerCancel, true)
  window.removeEventListener('keydown', onGlobalKeyDown)
  window.removeEventListener('blur', onWindowBlur)
  pauseGesture(false)
})
</script>

<style scoped>
.trace-overlay { position: absolute; inset: 0; z-index: 12; pointer-events: none; overflow: visible; --trace-color: #ff4058; }
.trace-paths { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.trace-paths path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.trace-halo { stroke: rgba(255, 255, 255, .62); stroke-width: 4; }
.trace-guide { stroke: rgba(43, 77, 82, .52); stroke-width: 1.4; stroke-dasharray: 3 6; }
.trace-painted { stroke: var(--trace-color); stroke-width: 3.2; }
.trace-start { fill: var(--trace-color); stroke: white; stroke-width: 1.5; }
.trace-finish circle:first-child { fill: rgba(255, 255, 255, .87); stroke: #385f64; stroke-width: 1.2; stroke-dasharray: 2 3; }
.trace-finish circle:last-child { fill: #385f64; }
.trace-brush { position: absolute; left: 0; top: 0; width: 48px; height: 48px; padding: 0; margin: 0; border: 0; border-radius: 50%; background: transparent; will-change: transform; pointer-events: auto; touch-action: none; cursor: grab; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
.trace-brush:focus-visible { outline: 3px solid #26788b; outline-offset: 4px; background: rgba(255, 255, 255, .4); }
.trace-brush:active, .is-drawing .trace-brush { cursor: grabbing; }
.brush-contact { position: absolute; inset: 17px; border: 2px solid white; border-radius: 50%; background: var(--trace-color); box-shadow: 0 1px 5px rgba(24, 52, 58, .25); }
.brush-art { position: absolute; left: 16px; bottom: 16px; overflow: visible; filter: drop-shadow(0 2px 2px rgba(22, 50, 54, .25)); transform-origin: 8px 38px; transform: rotate(0deg); transition: transform .15s ease; }
.is-drawing .brush-art { transform: rotate(-9deg); }
.brush-shadow { fill: white; stroke: white; stroke-width: 3.6; stroke-linejoin: round; }
.brush-tip { fill: var(--trace-color); stroke: #294950; stroke-width: 1.15; stroke-linejoin: round; }
.brush-ferrule { fill: #d4e2df; stroke: #294950; stroke-width: 1.15; }
.brush-handle { fill: #f4bb64; stroke: #294950; stroke-width: 1.3; }
.brush-shine { fill: none; stroke: #fff5d9; stroke-width: 1.5; stroke-linecap: round; }
.at-segment-end { cursor: default; }
.trace-status { position: absolute; bottom: 25px; left: 50%; width: min(230px, calc(100% - 32px)); padding: 10px 14px 9px; transform: translateX(-50%); border: 1px solid rgba(150, 180, 177, .5); border-radius: 13px; background: rgba(255, 255, 255, .9); box-shadow: 0 4px 16px rgba(34, 71, 73, .08); color: #34565a; text-align: center; pointer-events: none; }
.trace-status-line { display: flex; align-items: center; gap: 7px; font-size: 12px; line-height: 1.2; }
.trace-status-line strong { min-width: 0; font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }
.trace-color-dot { width: 7px; height: 7px; flex: 0 0 7px; border: 1px solid rgba(43, 77, 82, .15); border-radius: 50%; background: var(--trace-color); }
.trace-percent { margin-left: auto; flex-shrink: 0; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 650; }
.trace-progress-track { height: 3px; margin-top: 8px; overflow: hidden; border-radius: 3px; background: #e4eeeb; }
.trace-progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--trace-color); }
.trace-instruction { display: block; margin-top: 6px; color: #658184; font-size: 11px; line-height: 1.3; }
@media (max-width: 600px) { .trace-status { bottom: 16px; width: 194px; padding: 8px 12px; } }
@media (prefers-reduced-motion: reduce) { .brush-art { transition: none; } }
</style>
