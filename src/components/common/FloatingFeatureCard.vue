<template>
  <section ref="cardRef" class="floating-feature-card"
    :class="[`variant-${variant}`, { collapsed, resizing, 'theme-light': light, 'resize-from-right': resizeFromRight }]" :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: !collapsed && size.width ? `${size.width}px` : undefined,
      height: !collapsed && size.height ? `${size.height}px` : undefined,
      zIndex: cardZIndex,
    }" @pointerdown.capture="bringToFront">
    <header class="feature-card-head" :class="{ draggable }" @pointerdown.stop.prevent="startDrag">
      <div class="feature-card-title">
        <span :title="title">{{ title }}</span>
        <strong v-if="subtitle">{{ subtitle }}</strong>
      </div>

      <div class="feature-card-actions">
        <slot v-if="!collapsed" name="header-meta"></slot>
        <span v-if="!collapsed && draggable" class="drag-hint">拖动</span>
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

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

type CardVariant = 'control' | 'data' | 'track'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  variant: CardVariant
  initialTop?: number
  initialBottom?: number
  initialLeft?: number
  initialRight?: number
  initialCenterY?: boolean
  bottomInset?: number
  collapsed?: boolean
  initialCollapsed?: boolean
  draggable?: boolean
  resizable?: boolean
  minWidth?: number
  minHeight?: number
  light?: boolean
}>(), {
  subtitle: '',
  initialTop: 76,
  initialRight: 18,
  initialCenterY: false,
  bottomInset: 10,
  initialCollapsed: false,
  draggable: true,
  resizable: true,
  light: false,
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const cardRef = ref<HTMLElement | null>(null)
const internalCollapsed = ref(props.initialCollapsed)
const instance = getCurrentInstance()
const isCollapsedControlled = Object.prototype.hasOwnProperty.call(
  instance?.vnode.props ?? {},
  'collapsed'
)
const collapsed = computed({
  get: () => isCollapsedControlled
    ? (props.collapsed ?? internalCollapsed.value)
    : internalCollapsed.value,
  set: (value: boolean) => {
    internalCollapsed.value = value
    emit('update:collapsed', value)
  },
})
const resizing = ref(false)
const cardZIndex = ref(44)
const position = reactive({ x: 10, y: 76 })
const size = reactive({ width: 0, height: 0 })
const resizeFromRight = computed(() => {
  if (typeof window === 'undefined') return props.initialLeft !== undefined
  const width = size.width || cardRef.value?.offsetWidth || getVariantDefaults().width
  return position.x + width * 0.5 <= window.innerWidth * 0.5
})
const relativePosition = reactive({
  x: 1,
  y: props.initialBottom === undefined ? 0 : 1,
})
let dragState: { startX: number; startY: number; x: number; y: number } | null = null
let resizeState: {
  startX: number
  startY: number
  x: number
  width: number
  height: number
  fromRight: boolean
} | null = null

function bringToFront() {
  const highestZIndex = Array.from(
    document.querySelectorAll<HTMLElement>('.floating-feature-card')
  ).filter(card => card !== cardRef.value).reduce((highest, card) => {
    const value = Number.parseInt(window.getComputedStyle(card).zIndex, 10)
    return Number.isFinite(value) ? Math.max(highest, value) : highest
  }, 44)

  if (cardZIndex.value <= highestZIndex) {
    cardZIndex.value = highestZIndex + 1
  }
}

function getMinimumSize() {
  const defaults = getVariantDefaults()
  return {
    width: props.minWidth ?? defaults.minWidth,
    height: props.minHeight ?? defaults.minHeight,
  }
}

function getVariantDefaults() {
  if (props.variant === 'track') {
    return { width: 620, height: 360, minWidth: 420, minHeight: 260 }
  }
  if (props.variant === 'control') {
    return { width: 380, height: 640, minWidth: 300, minHeight: 320 }
  }
  return { width: 360, height: 250, minWidth: 280, minHeight: 190 }
}

function getCardSize() {
  const defaults = getVariantDefaults()
  return {
    width: !collapsed.value && size.width
      ? size.width
      : cardRef.value?.offsetWidth || defaults.width,
    height: !collapsed.value && size.height
      ? size.height
      : cardRef.value?.offsetHeight || defaults.height,
  }
}

function getPositionBounds(width: number, height: number) {
  const margin = 10
  return {
    minX: margin,
    maxX: Math.max(margin, window.innerWidth - width - margin),
    minY: 62,
    maxY: Math.max(62, window.innerHeight - height - props.bottomInset),
  }
}

function clampPosition(x: number, y: number) {
  const { width, height } = getCardSize()
  const bounds = getPositionBounds(width, height)
  return {
    x: Math.max(bounds.minX, Math.min(x, bounds.maxX)),
    y: Math.max(bounds.minY, Math.min(y, bounds.maxY)),
  }
}

function updateRelativePosition() {
  const { width, height } = getCardSize()
  const bounds = getPositionBounds(width, height)
  const rangeX = bounds.maxX - bounds.minX
  const rangeY = bounds.maxY - bounds.minY
  if (rangeX > 0) relativePosition.x = Math.max(0, Math.min(1, (position.x - bounds.minX) / rangeX))
  if (rangeY > 0) relativePosition.y = Math.max(0, Math.min(1, (position.y - bounds.minY) / rangeY))
}

function applyRelativePosition() {
  if (size.width) size.width = Math.min(size.width, Math.max(1, window.innerWidth - 20))
  if (size.height) size.height = Math.min(size.height, Math.max(1, window.innerHeight - 62 - props.bottomInset))
  const { width, height } = getCardSize()
  const bounds = getPositionBounds(width, height)
  position.x = bounds.minX + (bounds.maxX - bounds.minX) * relativePosition.x
  position.y = bounds.minY + (bounds.maxY - bounds.minY) * relativePosition.y
}

function setInitialPosition() {
  const defaults = getVariantDefaults()
  const width = cardRef.value?.offsetWidth || defaults.width
  const height = cardRef.value?.offsetHeight || defaults.height
  const x = props.initialLeft === undefined
    ? window.innerWidth - width - props.initialRight
    : props.initialLeft
  const y = props.initialCenterY
    ? (window.innerHeight - height) * 0.5
    : props.initialBottom === undefined
      ? props.initialTop
      : window.innerHeight - height - props.initialBottom
  Object.assign(position, clampPosition(x, y))
  updateRelativePosition()
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  nextTick(applyRelativePosition)
}

function startDrag(event: PointerEvent) {
  if (!props.draggable) return
  dragState = {
    startX: event.clientX,
    startY: event.clientY,
    x: position.x,
    y: position.y,
  }
  document.body.classList.add('geo-panel-resizing')
  document.body.style.cursor = 'grabbing'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', moveDrag)
  window.addEventListener('pointerup', endDrag, { once: true })
  window.addEventListener('pointercancel', endDrag, { once: true })
}

function moveDrag(event: PointerEvent) {
  if (!dragState) return
  Object.assign(position, clampPosition(
    dragState.x + event.clientX - dragState.startX,
    dragState.y + event.clientY - dragState.startY,
  ))
}

function endDrag() {
  dragState = null
  updateRelativePosition()
  document.body.classList.remove('geo-panel-resizing')
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', moveDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
}

function startResize(event: PointerEvent) {
  const rect = cardRef.value?.getBoundingClientRect()
  if (!rect) return
  size.width = rect.width
  size.height = rect.height
  resizeState = {
    startX: event.clientX,
    startY: event.clientY,
    x: position.x,
    width: rect.width,
    height: rect.height,
    fromRight: resizeFromRight.value,
  }
  resizing.value = true
  document.body.classList.add('geo-panel-resizing')
  document.body.style.cursor = resizeState.fromRight ? 'nwse-resize' : 'nesw-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', moveResize)
  window.addEventListener('pointerup', endResize, { once: true })
  window.addEventListener('pointercancel', endResize, { once: true })
}

function moveResize(event: PointerEvent) {
  if (!resizeState) return
  const minimum = getMinimumSize()
  const maxHeight = Math.max(minimum.height, window.innerHeight - position.y - props.bottomInset)
  const requestedHeight = resizeState.height + event.clientY - resizeState.startY
  size.height = Math.max(minimum.height, Math.min(requestedHeight, maxHeight))

  if (resizeState.fromRight) {
    const maxWidth = Math.max(minimum.width, window.innerWidth - resizeState.x - 10)
    const requestedWidth = resizeState.width + event.clientX - resizeState.startX
    size.width = Math.max(minimum.width, Math.min(requestedWidth, maxWidth))
    position.x = resizeState.x
  } else {
    const rightEdge = resizeState.x + resizeState.width
    const maxWidth = Math.max(minimum.width, rightEdge - 10)
    const requestedWidth = resizeState.width + resizeState.startX - event.clientX
    size.width = Math.max(minimum.width, Math.min(requestedWidth, maxWidth))
    position.x = rightEdge - size.width
  }
}

function endResize() {
  resizeState = null
  resizing.value = false
  updateRelativePosition()
  document.body.classList.remove('geo-panel-resizing')
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', moveResize)
  window.removeEventListener('pointerup', endResize)
  window.removeEventListener('pointercancel', endResize)
}

onMounted(() => {
  nextTick(setInitialPosition)
  window.addEventListener('resize', handleViewportResize)
})

function handleViewportResize() {
  nextTick(applyRelativePosition)
}

watch(() => props.bottomInset, () => nextTick(applyRelativePosition))

watch(collapsed, (isCollapsed, wasCollapsed) => {
  if (wasCollapsed && !isCollapsed) {
    nextTick(bringToFront)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportResize)
  window.removeEventListener('pointermove', moveDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
  window.removeEventListener('pointermove', moveResize)
  window.removeEventListener('pointerup', endResize)
  window.removeEventListener('pointercancel', endResize)
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
  position: fixed;
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

.feature-card-title span {
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
