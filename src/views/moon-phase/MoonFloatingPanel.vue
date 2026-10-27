<template>
  <section ref="cardRef" class="floating-feature-card"
    :class="[`variant-${variant}`, { collapsed, resizing, 'theme-light': light, 'resize-from-right': resizeFromRight }]"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: !collapsed && (size.width || initialWidth) ? `${size.width || initialWidth}px` : undefined,
      maxWidth: `${available.width}px`,
      maxHeight: `${available.height}px`,
      height: !collapsed && size.height ? `${size.height}px` : undefined,
      zIndex: cardZIndex,
    }" @pointerdown.capture="bringToFront">
    <header class="feature-card-head" :class="{ draggable }" @pointerdown.stop.prevent="startDrag">
      <div class="feature-card-title">
        <div class="feature-card-title-line">
          <slot name="title-prefix"></slot>
          <span class="feature-card-title-label" :title="title">{{ title }}</span>
        </div>
        <strong v-if="subtitle">{{ subtitle }}</strong>
      </div>

      <div class="feature-card-actions">
        <slot name="header-controls"></slot>
        <slot v-if="!collapsed" name="header-meta"></slot>
        <button type="button" class="collapse-btn" :aria-label="collapsed ? `展开${title}` : `收起${title}`"
          :title="collapsed ? `展开${title}` : `收起${title}`" @pointerdown.stop @click.stop="toggleCollapsed">
          {{ collapsed ? '+' : '−' }}
        </button>
      </div>
    </header>

    <div v-show="!collapsed" class="feature-card-content">
      <slot></slot>
    </div>

    <button v-if="resizable && !collapsed" type="button" class="feature-resize-handle" title="拖动调整卡片大小"
      aria-label="拖动调整卡片大小" @pointerdown.stop.prevent="startResize">
      <i></i>
    </button>
  </section>
</template>

<script lang="ts">
type PanelLayerEntry = { element: HTMLElement; observation: boolean; setZIndex: (value: number) => void }
const pagePanelLayers = new WeakMap<HTMLElement, PanelLayerEntry[]>()
function normalizePanelLayers(entries: PanelLayerEntry[]) {
  // Keep both groups bounded below the page header (70), picker (64), and pick hint (66).
  entries.filter(entry => !entry.observation).forEach((entry, index) => entry.setZIndex(44 + Math.min(index, 15)))
  entries.filter(entry => entry.observation).forEach((entry, index) => entry.setZIndex(60 + Math.min(index, 3)))
}
</script>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { fitPanelRect, getPanelBounds, resizePanelRect, type PanelBounds, type PanelRect } from './panel-bounds'

type CardVariant = 'control' | 'data' | 'track'
const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  variant: CardVariant
  initialTop?: number
  initialBottom?: number
  initialLeft?: number
  initialRight?: number
  initialWidth?: number
  followInitialPosition?: boolean
  initialCenterY?: boolean
  bottomInset?: number
  collapsed?: boolean
  initialCollapsed?: boolean
  draggable?: boolean
  resizable?: boolean
  minWidth?: number
  minHeight?: number
  light?: boolean
  layer?: 'default' | 'observation'
}>(), {
  subtitle: '', initialTop: 76, initialRight: 18, initialCenterY: false,
  bottomInset: 10, initialCollapsed: false, draggable: true, resizable: true, light: false, followInitialPosition: false, layer: 'default',
})
const emit = defineEmits<{ 'update:collapsed': [value: boolean] }>()
const cardRef = ref<HTMLElement | null>(null)
const internalCollapsed = ref(props.initialCollapsed)
const controlled = Object.prototype.hasOwnProperty.call(getCurrentInstance()?.vnode.props ?? {}, 'collapsed')
const collapsed = computed({
  get: () => controlled ? (props.collapsed ?? internalCollapsed.value) : internalCollapsed.value,
  set: (value: boolean) => { internalCollapsed.value = value; emit('update:collapsed', value) },
})
const position = reactive({ x: 10, y: 76 })
// Retain the requested size while collapsed or temporarily constrained by the page.
const size = reactive({ width: 0, height: 0 })
const available = reactive({ width: 10000, height: 10000 })
const bounds = reactive<PanelBounds>({ left: 10, top: 76, right: 10000, bottom: 10000 })
const resizing = ref(false)
const cardZIndex = ref(44)
const resizeFromRight = computed(() => position.x + Math.min(size.width || cardRef.value?.offsetWidth || 320, available.width) / 2
  <= (bounds.left + bounds.right) / 2)
let page: HTMLElement | null = null
let layerEntry: PanelLayerEntry | null = null
let initialized = false
let userPositioned = false
let disposed = false
let layoutVersion = 0
let frame = 0
let observer: ResizeObserver | null = null
type PointerState = { clientX: number; clientY: number; rect: PanelRect; scaleX: number; scaleY: number }
let dragState: PointerState | null = null
let resizeState: (PointerState & { fromRight: boolean }) | null = null
let previousCursor = ''
let previousUserSelect = ''

function defaults() {
  return props.variant === 'track' ? { width: 620, height: 360, minWidth: 420, minHeight: 260 }
    : props.variant === 'control' ? { width: 380, height: 640, minWidth: 300, minHeight: 320 }
      : { width: 360, height: 250, minWidth: 280, minHeight: 190 }
}
function measuredRect(): PanelRect {
  const fallback = defaults()
  return { ...position, width: cardRef.value?.offsetWidth || fallback.width, height: cardRef.value?.offsetHeight || fallback.height }
}
function coordinateFrame() {
  const owner = cardRef.value?.offsetParent as HTMLElement | null
  const element = owner ?? page
  if (!element) return { x: 0, y: 0, scaleX: 1, scaleY: 1, scrollLeft: 0, scrollTop: 0 }
  const rect = element.getBoundingClientRect()
  const scaleX = rect.width / (element.offsetWidth || rect.width || 1)
  const scaleY = rect.height / (element.offsetHeight || rect.height || 1)
  return { x: rect.left + element.clientLeft * scaleX, y: rect.top + element.clientTop * scaleY,
    scaleX: scaleX || 1, scaleY: scaleY || 1, scrollLeft: element.scrollLeft, scrollTop: element.scrollTop }
}
function clientBox(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const sx = rect.width / (element.offsetWidth || rect.width || 1)
  const sy = rect.height / (element.offsetHeight || rect.height || 1)
  const left = rect.left + element.clientLeft * sx
  const top = rect.top + element.clientTop * sy
  return { left, top, right: left + element.clientWidth * sx, bottom: top + element.clientHeight * sy }
}
function updateBounds() {
  if (!page) return false
  const box = clientBox(page)
  if (box.right <= box.left || box.bottom <= box.top) return false
  const viewport = window.visualViewport
  const visible = {
    left: Math.max(box.left, viewport?.offsetLeft ?? 0), top: Math.max(box.top, viewport?.offsetTop ?? 0),
    right: Math.min(box.right, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? document.documentElement.clientWidth)),
    bottom: Math.min(box.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)),
  }
  // Embedded pages can be clipped by a scrolling/cropped host smaller than the window.
  for (let ancestor = page.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor)
    const clip = clientBox(ancestor)
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
      visible.left = Math.max(visible.left, clip.left); visible.right = Math.min(visible.right, clip.right)
    }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
      visible.top = Math.max(visible.top, clip.top); visible.bottom = Math.min(visible.bottom, clip.bottom)
    }
  }
  if (visible.right <= visible.left || visible.bottom <= visible.top) return false
  const coordinate = coordinateFrame()
  const localX = (value: number) => (value - coordinate.x) / coordinate.scaleX + coordinate.scrollLeft
  const localY = (value: number) => (value - coordinate.y) / coordinate.scaleY + coordinate.scrollTop
  const header = page.querySelector<HTMLElement>(':scope > .lab-header')
  Object.assign(bounds, getPanelBounds({ left: localX(visible.left), top: localY(visible.top),
    right: localX(visible.right), bottom: localY(visible.bottom) },
    header ? localY(header.getBoundingClientRect().bottom) : localY(visible.top), props.bottomInset))
  available.width = Math.max(1, bounds.right - bounds.left)
  available.height = Math.max(1, bounds.bottom - bounds.top)
  return true
}
function clampCurrent(rect = measuredRect()) {
  const fitted = fitPanelRect(rect, bounds)
  position.x = fitted.x; position.y = fitted.y
}
async function layout(previous?: PanelRect) {
  const version = ++layoutVersion
  await nextTick()
  if (disposed || version !== layoutVersion || !updateBounds()) return
  // Wait for max dimensions to be reflected before measuring expanded content.
  await nextTick()
  if (disposed || version !== layoutVersion || !cardRef.value?.offsetWidth) return
  const rect = measuredRect()
  if (!initialized || (props.followInitialPosition && !userPositioned && !previous)) {
    const coordinate = coordinateFrame()
    const box = clientBox(page!)
    const pageLeft = (box.left - coordinate.x) / coordinate.scaleX + coordinate.scrollLeft
    const pageTop = (box.top - coordinate.y) / coordinate.scaleY + coordinate.scrollTop
    const width = (box.right - box.left) / coordinate.scaleX
    const height = (box.bottom - box.top) / coordinate.scaleY
    rect.x = pageLeft + (props.initialLeft ?? (width - rect.width - props.initialRight))
    rect.y = pageTop + (props.initialCenterY ? (height - rect.height) / 2
      : props.initialBottom === undefined ? props.initialTop : height - rect.height - props.initialBottom)
    initialized = true
  } else if (previous) {
    // Preserve the user's dragged edge and vertical position when the width changes.
    rect.x = previous.x + previous.width / 2 > (bounds.left + bounds.right) / 2
      ? previous.x + previous.width - rect.width : previous.x
    rect.y = previous.y
  }
  clampCurrent(rect)
}
function scheduleLayout() {
  if (frame || disposed) return
  frame = requestAnimationFrame(() => { frame = 0; void layout() })
}
function bringToFront() {
  if (!page || !layerEntry) return
  const entries = pagePanelLayers.get(page)
  if (!entries) return
  const index = entries.indexOf(layerEntry)
  if (index >= 0) entries.splice(index, 1)
  entries.push(layerEntry)
  updatePanelLayer()
}
function updatePanelLayer() {
  if (!page || !layerEntry) return
  layerEntry.observation = props.layer === 'observation' && !collapsed.value
  normalizePanelLayers(pagePanelLayers.get(page) ?? [])
}
function toggleCollapsed() { collapsed.value = !collapsed.value }
function beginPointer(cursor: string) {
  previousCursor = document.body.style.cursor; previousUserSelect = document.body.style.userSelect
  document.body.classList.add('geo-panel-resizing')
  document.body.style.cursor = cursor; document.body.style.userSelect = 'none'
  window.addEventListener('pointerup', endPointer, { once: true })
  window.addEventListener('pointercancel', endPointer, { once: true })
}
function startDrag(event: PointerEvent) {
  if (!props.draggable || event.button !== 0 || (event.target as HTMLElement).closest('button, input, select, a, [role="switch"]')) return
  updateBounds()
  const coordinate = coordinateFrame()
  dragState = { clientX: event.clientX, clientY: event.clientY, rect: measuredRect(), scaleX: coordinate.scaleX, scaleY: coordinate.scaleY }
  beginPointer('grabbing')
  window.addEventListener('pointermove', moveDrag)
}
function moveDrag(event: PointerEvent) {
  if (!dragState) return
  userPositioned = true
  clampCurrent({ ...dragState.rect, x: dragState.rect.x + (event.clientX - dragState.clientX) / dragState.scaleX,
    y: dragState.rect.y + (event.clientY - dragState.clientY) / dragState.scaleY })
}
function startResize(event: PointerEvent) {
  if (event.button !== 0) return
  updateBounds()
  const coordinate = coordinateFrame()
  resizeState = { clientX: event.clientX, clientY: event.clientY, rect: measuredRect(), scaleX: coordinate.scaleX,
    scaleY: coordinate.scaleY, fromRight: resizeFromRight.value }
  resizing.value = true
  beginPointer(resizeState.fromRight ? 'nwse-resize' : 'nesw-resize')
  window.addEventListener('pointermove', moveResize)
}
function moveResize(event: PointerEvent) {
  if (!resizeState) return
  userPositioned = true
  const fallback = defaults()
  const rect = resizePanelRect(resizeState.rect, (event.clientX - resizeState.clientX) / resizeState.scaleX,
    (event.clientY - resizeState.clientY) / resizeState.scaleY, resizeState.fromRight,
    { width: props.minWidth ?? fallback.minWidth, height: props.minHeight ?? fallback.minHeight }, bounds)
  size.width = rect.width; size.height = rect.height
  position.x = rect.x; position.y = rect.y
}
function endPointer() {
  if (dragState || resizeState) {
    document.body.style.cursor = previousCursor; document.body.style.userSelect = previousUserSelect
    document.body.classList.remove('geo-panel-resizing')
  }
  dragState = null; resizeState = null; resizing.value = false
  window.removeEventListener('pointermove', moveDrag); window.removeEventListener('pointermove', moveResize)
  window.removeEventListener('pointerup', endPointer); window.removeEventListener('pointercancel', endPointer)
}
watch(collapsed, (value) => {
  const previous = measuredRect() // Default pre-flush watcher still sees the old DOM dimensions.
  endPointer()
  updatePanelLayer()
  void layout(previous)
  if (!value) void nextTick(bringToFront)
})
watch(() => props.bottomInset, scheduleLayout)
watch(() => props.layer, updatePanelLayer)
watch(() => [props.initialTop, props.initialBottom, props.initialLeft, props.initialRight, props.initialWidth], () => {
  if (props.followInitialPosition && !userPositioned) scheduleLayout()
})
onMounted(() => {
  page = cardRef.value?.closest<HTMLElement>('.lunar-lab') ?? cardRef.value?.parentElement ?? null
  if (page && cardRef.value) {
    const entries = pagePanelLayers.get(page) ?? []
    layerEntry = { element: cardRef.value, observation: props.layer === 'observation' && !collapsed.value, setZIndex: value => { cardZIndex.value = value } }
    entries.push(layerEntry)
    pagePanelLayers.set(page, entries)
    normalizePanelLayers(entries)
  }
  observer = new ResizeObserver(scheduleLayout)
  if (page) {
    for (let element: HTMLElement | null = page; element; element = element.parentElement) observer.observe(element)
    const header = page.querySelector<HTMLElement>(':scope > .lab-header')
    if (header) observer.observe(header)
  }
  if (cardRef.value) observer.observe(cardRef.value)
  window.addEventListener('resize', scheduleLayout)
  window.addEventListener('scroll', scheduleLayout, true)
  window.visualViewport?.addEventListener('resize', scheduleLayout)
  window.visualViewport?.addEventListener('scroll', scheduleLayout)
  void layout()
})
onUnmounted(() => {
  disposed = true; layoutVersion++
  if (page && layerEntry) {
    const entries = pagePanelLayers.get(page) ?? []
    const index = entries.indexOf(layerEntry)
    if (index >= 0) entries.splice(index, 1)
    if (entries.length) normalizePanelLayers(entries)
    else pagePanelLayers.delete(page)
    layerEntry = null
  }
  cancelAnimationFrame(frame); observer?.disconnect(); endPointer()
  window.removeEventListener('resize', scheduleLayout)
  window.removeEventListener('scroll', scheduleLayout, true)
  window.visualViewport?.removeEventListener('resize', scheduleLayout)
  window.visualViewport?.removeEventListener('scroll', scheduleLayout)
})
</script>

<style scoped>
.floating-feature-card {
  --feature-bg: linear-gradient(145deg, rgba(3, 14, 27, 0.91), rgba(5, 23, 38, 0.76));
  --feature-head-bg: linear-gradient(90deg, rgba(5, 41, 64, 0.72), rgba(4, 23, 39, 0.28));
  --feature-border: rgba(82, 206, 255, 0.28);
  --feature-divider: rgba(95, 210, 255, 0.15);
  --feature-title: #62d6ff;
  --feature-text: rgba(238, 249, 255, 0.92);
  --feature-muted: rgba(181, 220, 238, 0.58);
  --feature-button-bg: rgba(21, 88, 118, 0.24);
  --feature-button-border: rgba(99, 212, 255, 0.24);
  position: absolute;
  z-index: 44;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  color: var(--feature-text);
  pointer-events: auto;
  border: 1px solid var(--feature-border);
  border-radius: 14px;
  background: var(--feature-bg);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(64, 181, 232, 0.05) inset;
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  touch-action: none;
}

.floating-feature-card.resizing {
  transition: none !important;
}

.floating-feature-card.theme-light {
  --feature-bg: linear-gradient(145deg, rgba(248, 253, 255, 0.93), rgba(229, 243, 249, 0.84));
  --feature-head-bg: linear-gradient(90deg, rgba(216, 240, 249, 0.92), rgba(244, 250, 253, 0.72));
  --feature-border: rgba(33, 133, 174, 0.30);
  --feature-divider: rgba(34, 131, 168, 0.18);
  --feature-title: #087aa5;
  --feature-text: #173b52;
  --feature-muted: rgba(47, 91, 113, 0.68);
  --feature-button-bg: rgba(47, 151, 189, 0.10);
  --feature-button-border: rgba(26, 132, 173, 0.28);
  box-shadow: 0 18px 42px rgba(44, 86, 112, 0.18), 0 1px 0 rgba(255, 255, 255, 0.95) inset;
}

.variant-data {
  width: clamp(310px, 18vw, 420px);
}

.variant-control {
  width: clamp(320px, 20vw, 410px);
  height: min(720px, calc(100vh - 88px));
}

.variant-track {
  width: min(clamp(460px, 26vw, 600px), calc(100vw - 28px));
}

.feature-card-head {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 13px;
  border-bottom: 1px solid var(--feature-divider);
  background: var(--feature-head-bg);
  user-select: none;
}

.feature-card-head.draggable {
  cursor: grab;
}

.feature-card-head.draggable:active {
  cursor: grabbing;
}

.feature-card-title {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.feature-card-title-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.feature-card-title-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--feature-title);
  font-size: clamp(13px, 0.65vw, 18px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-card-title strong {
  color: var(--feature-text);
  font-size: clamp(12px, 0.56vw, 15px);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-card-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--feature-muted);
  font-size: clamp(10px, 0.46vw, 13px);
}

.feature-card-content {
  min-width: 0;
  min-height: 0;
  padding-bottom: 34px;
  overflow: auto;
}

.drag-hint {
  padding: 4px 7px;
  border: 1px solid var(--feature-button-border);
  border-radius: 999px;
  color: var(--feature-muted);
  font-size: clamp(9px, 0.42vw, 11px);
  letter-spacing: 0.06em;
  background: var(--feature-button-bg);
}

.collapse-btn {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  padding: 0;
  border: 1px solid var(--feature-button-border);
  border-radius: 8px;
  color: var(--feature-title);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  background: var(--feature-button-bg);
}

.feature-resize-handle {
  position: absolute;
  left: 7px;
  bottom: 7px;
  z-index: 20;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--feature-button-border);
  border-radius: 9px;
  cursor: nesw-resize;
  background: color-mix(in srgb, var(--feature-button-bg) 82%, transparent);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.feature-resize-handle::before,
.feature-resize-handle::after,
.feature-resize-handle i {
  content: '';
  position: absolute;
  left: 6px;
  bottom: 6px;
  border-left: 2px solid var(--feature-title);
  border-bottom: 2px solid var(--feature-title);
  border-bottom-left-radius: 3px;
  opacity: 0.86;
}

.feature-resize-handle::before {
  width: 14px;
  height: 14px;
}

.feature-resize-handle::after {
  width: 9px;
  height: 9px;
}

.feature-resize-handle i {
  width: 4px;
  height: 4px;
}

.feature-resize-handle:hover {
  border-color: var(--feature-title);
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--feature-title) 45%, transparent));
}

.floating-feature-card.resize-from-right .feature-resize-handle {
  right: 7px;
  left: auto;
  cursor: nwse-resize;
}

.floating-feature-card.resize-from-right .feature-resize-handle::before,
.floating-feature-card.resize-from-right .feature-resize-handle::after,
.floating-feature-card.resize-from-right .feature-resize-handle i {
  right: 6px;
  left: auto;
  border-right: 2px solid var(--feature-title);
  border-bottom: 2px solid var(--feature-title);
  border-left: 0;
  border-bottom-right-radius: 3px;
  border-bottom-left-radius: 0;
}

.collapsed .feature-card-head {
  min-height: 48px;
  padding: 8px 10px;
  border-bottom-color: transparent;
}

.collapsed .feature-card-title strong {
  display: none;
}

.collapsed .feature-card-title {
  flex: 1 1 auto;
  overflow: hidden;
}

.variant-data.collapsed {
  width: 158px;
}

.variant-control.collapsed {
  width: 178px;
  height: auto;
}

.variant-track.collapsed {
  width: 224px;
}

@media (min-width: 1800px) and (min-height: 900px) {
  .feature-card-head {
    min-height: 66px;
    padding: 12px 16px;
  }

  .collapse-btn {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }

  .variant-data.collapsed {
    width: 188px;
  }

  .variant-control.collapsed {
    width: 208px;
  }

  .variant-track.collapsed {
    width: 268px;
  }
}

@media (max-width: 1100px) {
  .variant-data {
    width: 292px;
  }

  .variant-control {
    width: min(320px, calc(100vw - 22px));
  }

  .variant-track {
    width: min(460px, calc(100vw - 22px));
  }

  .variant-data.collapsed {
    width: 158px;
  }

  .variant-control.collapsed {
    width: 178px;
  }

  .variant-track.collapsed {
    width: 224px;
  }
}
</style>
