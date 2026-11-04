import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties, type Ref } from 'vue'

type PanelPosition = { left: number; top: number }
type Interaction = {
  kind: 'drag' | 'resize'
  pointerId: number
  startX: number
  startY: number
  left: number
  top: number
  width: number
  height: number
  handle: Element | null
}
const EDGE = 8
const MIN_WIDTH = 260
const MIN_HEIGHT = 200
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high))

/** Pointer-based panel placement, independent from the 3D scene's controls. */
export function useMovablePanel(
  stageRef: Ref<HTMLElement | undefined>,
  panelRef: Ref<HTMLElement | undefined>,
  collapsedRef: Ref<boolean>,
) {
  const position = ref<PanelPosition | null>(null)
  const customWidth = ref<number | null>(null)
  const customHeight = ref<number | null>(null)
  const stageSize = ref({ width: 0, height: 0 })
  const moving = ref(false)
  let interaction: Interaction | null = null
  let observer: ResizeObserver | undefined
  let resizeFrame = 0
  let disposed = false

  function readStage() {
    const stage = stageRef.value
    if (!stage) return null
    const rect = stage.getBoundingClientRect()
    const width = stage.clientWidth, height = stage.clientHeight
    if (width <= 0 || height <= 0) return null
    if (stageSize.value.width !== width || stageSize.value.height !== height) stageSize.value = { width, height }
    return { rect, width, height, x: rect.left + stage.clientLeft, y: rect.top + stage.clientTop }
  }

  function fittedWidth(value: number, available: number) {
    const maximum = Math.max(0, available - EDGE * 2)
    return clamp(value, Math.min(MIN_WIDTH, maximum), maximum)
  }
  function fittedHeight(value: number, available: number) {
    const maximum = Math.max(0, available - EDGE * 2)
    return clamp(value, Math.min(MIN_HEIGHT, maximum), maximum)
  }

  const panelStyle = computed<CSSProperties>(() => {
    const point = position.value
    if (!point) return {}
    const { width, height } = stageSize.value
    const style: CSSProperties = {
      position: 'absolute', left: `${point.left}px`, top: `${point.top}px`, right: 'auto', bottom: 'auto',
      maxWidth: `${Math.max(0, width - EDGE * 2)}px`,
    }
    if (customWidth.value !== null && !collapsedRef.value) style.width = `${fittedWidth(customWidth.value, width)}px`
    // Removing inline height on collapse lets the normal header-only CSS take over.
    // The remembered expanded height remains unchanged until the next resize.
    if (customHeight.value !== null && !collapsedRef.value) {
      style.maxHeight = `${Math.max(0, height - point.top - EDGE)}px`
      style.height = `${Math.min(fittedHeight(customHeight.value, height), Math.max(0, height - point.top - EDGE))}px`
    }
    return style
  })

  function fitPosition(left: number, top: number, width: number, height: number) {
    const size = stageSize.value
    return {
      left: clamp(left, Math.min(EDGE, size.width / 2), size.width - width - EDGE),
      top: clamp(top, Math.min(EDGE, size.height / 2), size.height - height - EDGE),
    }
  }

  function clampPanel() {
    resizeFrame = 0
    if (disposed || !readStage() || !position.value || !panelRef.value) return
    const rect = panelRef.value.getBoundingClientRect()
    const size = stageSize.value
    const width = customWidth.value !== null && !collapsedRef.value ? fittedWidth(customWidth.value, size.width) : Math.min(rect.width, Math.max(0, size.width - EDGE * 2))
    const height = customHeight.value !== null && !collapsedRef.value ? fittedHeight(customHeight.value, size.height) : Math.min(rect.height, Math.max(0, size.height - EDGE * 2))
    const fitted = fitPosition(position.value.left, position.value.top, width, height)
    if (Math.abs(fitted.left - position.value.left) > .25 || Math.abs(fitted.top - position.value.top) > .25) position.value = fitted
  }
  function scheduleClamp() {
    if (!disposed && !resizeFrame && typeof requestAnimationFrame === 'function') resizeFrame = requestAnimationFrame(clampPanel)
  }

  function removeListeners() {
    window.removeEventListener('pointermove', pointerMove)
    window.removeEventListener('pointerup', pointerEnd)
    window.removeEventListener('pointercancel', pointerEnd)
    window.removeEventListener('blur', cancelInteraction)
  }
  function cancelInteraction() {
    const previous = interaction
    interaction = null; moving.value = false
    removeListeners()
    if (previous?.handle) {
      try {
        if (previous.handle.hasPointerCapture(previous.pointerId)) previous.handle.releasePointerCapture(previous.pointerId)
      } catch { /* The handle may have been unmounted or capture cancelled by the browser. */ }
    }
    scheduleClamp()
  }
  function pointerEnd(event: PointerEvent) {
    if (!interaction || event.pointerId !== interaction.pointerId) return
    event.stopPropagation()
    cancelInteraction()
  }
  function pointerMove(event: PointerEvent) {
    const active = interaction
    if (!active || active.pointerId !== event.pointerId) return
    const stage = readStage()
    if (!stage) { cancelInteraction(); return }
    const dx = event.clientX - active.startX, dy = event.clientY - active.startY
    if (active.kind === 'drag' && !moving.value && Math.hypot(dx, dy) < 3) return
    event.preventDefault(); event.stopPropagation(); moving.value = true
    if (active.kind === 'resize') {
      const width = fittedWidth(active.width + dx, stage.width)
      const height = fittedHeight(active.height + dy, stage.height)
      customWidth.value = width; customHeight.value = height
      position.value = fitPosition(active.left, active.top, width, height)
    } else {
      const rect = panelRef.value?.getBoundingClientRect()
      position.value = fitPosition(active.left + dx, active.top + dy,
        Math.min(rect?.width ?? active.width, Math.max(0, stage.width - EDGE * 2)),
        Math.min(rect?.height ?? active.height, Math.max(0, stage.height - EDGE * 2)))
    }
  }

  function begin(event: PointerEvent, kind: Interaction['kind']) {
    if (disposed || interaction || !event.isPrimary || event.button !== 0) return
    if (kind === 'resize' && collapsedRef.value) return
    if (kind === 'drag' && event.target instanceof Element && event.target.closest('button, input, textarea, select, a, [contenteditable="true"], [role="button"]')) return
    const stage = readStage(), panel = panelRef.value
    if (!stage || !panel) return
    event.preventDefault(); event.stopPropagation()
    const rect = panel.getBoundingClientRect()
    interaction = {
      kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      left: rect.left - stage.x + (stageRef.value?.scrollLeft ?? 0),
      top: rect.top - stage.y + (stageRef.value?.scrollTop ?? 0),
      width: rect.width, height: rect.height,
      handle: event.currentTarget instanceof Element ? event.currentTarget : null,
    }
    try { interaction.handle?.setPointerCapture(event.pointerId) } catch { /* Window listeners still finish the gesture if capture is unsupported. */ }
    window.addEventListener('pointermove', pointerMove, { passive: false })
    window.addEventListener('pointerup', pointerEnd)
    window.addEventListener('pointercancel', pointerEnd)
    window.addEventListener('blur', cancelInteraction)
  }

  const stopRefs = watch([stageRef, panelRef], () => {
    observer?.disconnect()
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleClamp)
      if (stageRef.value) observer.observe(stageRef.value)
      if (panelRef.value) observer.observe(panelRef.value)
    }
    readStage(); scheduleClamp()
  }, { immediate: true, flush: 'post' })
  const stopCollapse = watch(collapsedRef, () => {
    cancelInteraction()
    void nextTick(scheduleClamp)
  }, { flush: 'post' })

  function resetPanel() {
    cancelInteraction()
    position.value = null; customWidth.value = null; customHeight.value = null
  }
  onBeforeUnmount(() => {
    disposed = true; cancelInteraction(); stopRefs(); stopCollapse(); observer?.disconnect()
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
  })
  return { panelStyle, beginDrag: (event: PointerEvent) => begin(event, 'drag'), beginResize: (event: PointerEvent) => begin(event, 'resize'), resetPanel, moving }
}
