import { onBeforeUnmount, onMounted, reactive } from 'vue'

export type AdjustmentKind = 'axis' | 'equatorMove' | 'equatorTilt'
type DropTarget = 'sphere' | 'north' | 'south'

interface GlobeDragOptions {
  canUse: (id: string) => boolean
  select: (id: string) => void
  prepare: (id: string) => void
  resolveDrop: (id: string, x: number, y: number) => DropTarget | null
  drop: (id: string, target: DropTarget) => void
  cancel: () => void
  startAdjustment: (kind: AdjustmentKind) => number
  adjust: (kind: AdjustmentKind, dx: number, dy: number, startValue: number) => void
  finishAdjustment: () => void
  setInteraction: (enabled: boolean) => void
}

type PointerSession = {
  pointerId: number
  originX: number
  originY: number
  element: Element | null
} & (
  | { type: 'tool'; id: string; started: boolean }
  | { type: 'adjustment'; kind: AdjustmentKind; startValue: number }
)

export function useGlobeDrag(options: GlobeDragOptions) {
  const drag = reactive({ active: false, id: null as string | null, x: 0, y: 0, valid: false })
  const pressedPointers = new Set<number>()
  let session: PointerSession | null = null
  let blockedByMultiplePointers = false
  let interactionPaused = false

  function pauseInteraction() {
    if (interactionPaused) return
    interactionPaused = true
    options.setInteraction(false)
  }

  function capture(event: PointerEvent) {
    const element = event.currentTarget instanceof Element ? event.currentTarget : null
    // The pointer may already have ended if a host synchronously removed its tool.
    try { element?.setPointerCapture(event.pointerId) } catch { /* Window listeners remain active. */ }
    return element
  }

  function clearSession() {
    const previous = session
    session = null
    Object.assign(drag, { active: false, id: null, x: 0, y: 0, valid: false })
    if (previous?.element?.hasPointerCapture(previous.pointerId)) {
      previous.element.releasePointerCapture(previous.pointerId)
    }
    if (interactionPaused) {
      interactionPaused = false
      options.setInteraction(true)
    }
    return previous
  }

  function cancelDrag() {
    const previous = clearSession()
    if (previous?.type === 'tool' && previous.started) options.cancel()
    if (previous?.type === 'adjustment') {
      options.adjust(previous.kind, 0, 0, previous.startValue)
      options.finishAdjustment()
    }
  }

  function trackPointerDown(event: PointerEvent) {
    pressedPointers.add(event.pointerId)
    if (pressedPointers.size > 1) {
      blockedByMultiplePointers = true
      cancelDrag()
    }
  }

  function canStart(event: PointerEvent) {
    pressedPointers.add(event.pointerId)
    return event.button === 0 && event.isPrimary && !session
      && !blockedByMultiplePointers && pressedPointers.size === 1
  }

  function onToolPointerDown(event: PointerEvent, id: string) {
    if (!canStart(event) || !options.canUse(id)) return
    event.preventDefault()
    event.stopPropagation()
    session = {
      type: 'tool', id, started: false,
      pointerId: event.pointerId, originX: event.clientX, originY: event.clientY,
      element: capture(event),
    }
  }

  function onToolClick(event: MouseEvent, id: string) {
    // Pointer input is handled above; detail 0 preserves Enter/Space activation.
    if (event.detail !== 0 || session || pressedPointers.size || blockedByMultiplePointers) return
    if (!options.canUse(id)) return
    event.preventDefault()
    event.stopPropagation()
    options.select(id)
  }

  function onHandlePointerDown(event: PointerEvent, kind: AdjustmentKind) {
    if (!canStart(event)) return
    event.preventDefault()
    event.stopPropagation()
    pauseInteraction()
    session = {
      type: 'adjustment', kind, startValue: options.startAdjustment(kind),
      pointerId: event.pointerId, originX: event.clientX, originY: event.clientY,
      element: capture(event),
    }
  }

  function moveTool(current: Extract<PointerSession, { type: 'tool' }>, event: PointerEvent) {
    if (!current.started && Math.hypot(event.clientX - current.originX, event.clientY - current.originY) >= 5) {
      if (!options.canUse(current.id)) { cancelDrag(); return }
      current.started = true
      pauseInteraction()
      options.prepare(current.id)
    }
    if (!current.started || session !== current) return
    Object.assign(drag, {
      active: true, id: current.id, x: event.clientX, y: event.clientY,
      valid: options.resolveDrop(current.id, event.clientX, event.clientY) !== null,
    })
  }

  function onPointerMove(event: PointerEvent) {
    const current = session
    if (!current || event.pointerId !== current.pointerId) return
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) { cancelDrag(); return }
    event.preventDefault()
    if (current.type === 'tool') moveTool(current, event)
    else options.adjust(current.kind, event.clientX - current.originX, event.clientY - current.originY, current.startValue)
  }

  function releasePointer(event: PointerEvent) {
    pressedPointers.delete(event.pointerId)
    if (pressedPointers.size === 0) blockedByMultiplePointers = false
  }

  function onPointerUp(event: PointerEvent) {
    releasePointer(event)
    const current = session
    if (!current || event.pointerId !== current.pointerId) return
    event.preventDefault()
    if (current.type === 'adjustment') {
      options.adjust(current.kind, event.clientX - current.originX, event.clientY - current.originY, current.startValue)
      clearSession()
      options.finishAdjustment()
      return
    }
    // Account for a fast release whose final motion was coalesced by the browser.
    moveTool(current, event)
    if (session !== current) return
    const target = current.started && options.canUse(current.id)
      ? options.resolveDrop(current.id, event.clientX, event.clientY) : null
    clearSession()
    if (!current.started) {
      if (options.canUse(current.id)) options.select(current.id)
    } else if (target) options.drop(current.id, target)
    else options.cancel()
  }

  function onPointerCancel(event: PointerEvent) {
    releasePointer(event)
    if (session?.pointerId === event.pointerId) cancelDrag()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !session) return
    event.preventDefault()
    cancelDrag()
  }

  function onBlur() {
    cancelDrag()
    pressedPointers.clear()
    blockedByMultiplePointers = false
  }

  onMounted(() => {
    window.addEventListener('pointerdown', trackPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: false })
    window.addEventListener('pointercancel', onPointerCancel, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', onBlur)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', trackPointerDown, true)
    window.removeEventListener('pointermove', onPointerMove, true)
    window.removeEventListener('pointerup', onPointerUp, true)
    window.removeEventListener('pointercancel', onPointerCancel, true)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('blur', onBlur)
    onBlur()
  })

  return { drag, onToolPointerDown, onToolClick, onHandlePointerDown, cancelDrag }
}
