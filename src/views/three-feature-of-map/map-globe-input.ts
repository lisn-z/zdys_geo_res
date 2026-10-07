import L from 'leaflet'
import { GLOBE_EXIT_ZOOM } from './map-view-config'

type BoundaryOptions = { canEnter(): boolean; enter(): void }
type TouchPoint = { clientX: number; clientY: number }

const MAP_BOUNDARY_ZOOM = GLOBE_EXIT_ZOOM
const CAPTURE_FROM_ZOOM = 5

/** Intercept outward input before Leaflet changes the boundary map's center. */
export function createGlobeBoundaryInput(map: L.Map, options: BoundaryOptions): { dispose(): void } {
  const container = map.getContainer()
  const capture = { capture: true, passive: false } as const
  let disposed = false
  let wheelPauseUntil = 0
  let pinch: { distance: number; zoom: number; restoreDragging: boolean; entered: boolean } | null = null
  const pointers = new Map<number, TouchPoint>()

  const stop = (event: Event) => {
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }
  const isFormTarget = (target: EventTarget | null) => target instanceof Element
    && !!target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="slider"]')
  const available = () => !disposed && options.canEnter() && map.getZoom() <= CAPTURE_FROM_ZOOM

  function stepOut() {
    if (map.getZoom() <= MAP_BOUNDARY_ZOOM) options.enter()
    else map.setZoom(MAP_BOUNDARY_ZOOM, { animate: false })
  }
  function onWheel(event: WheelEvent) {
    // Leave inward zoom and scrolling in controls to their original owners.
    if (!available() || event.deltaY <= 0 || isFormTarget(event.target)) return
    stop(event)
    const now = performance.now()
    if (now < wheelPauseUntil) return
    wheelPauseUntil = now + 240
    stepOut()
  }
  function onKeyDown(event: KeyboardEvent) {
    if (!available() || event.altKey || event.ctrlKey || event.metaKey || isFormTarget(event.target)) return
    if (event.key !== '-' && event.key !== '_' && event.code !== 'NumpadSubtract') return
    stop(event)
    if (!event.repeat) stepOut()
  }
  const separation = (points: TouchPoint[]) => Math.hypot(points[0]!.clientX - points[1]!.clientX, points[0]!.clientY - points[1]!.clientY)

  function beginPinch(event: Event, points: TouchPoint[]) {
    if (pinch) { stop(event); return }
    if (points.length !== 2 || !available() || !map.touchZoom.enabled()) return
    const distance = separation(points)
    if (distance < 8) return
    stop(event)
    const restoreDragging = map.dragging.enabled()
    // Public disable ends an already-started single-finger drag cleanly.
    if (restoreDragging) map.dragging.disable()
    map.stop()
    pinch = { distance, zoom: map.getZoom(), restoreDragging, entered: false }
  }
  function movePinch(event: Event, points: TouchPoint[]) {
    if (!pinch) return
    stop(event)
    if (points.length !== 2 || pinch.entered || !options.canEnter()) return
    const distance = separation(points)
    if (distance < 8) return
    const requestedZoom = map.getScaleZoom(distance / pinch.distance, pinch.zoom)
    if (requestedZoom < MAP_BOUNDARY_ZOOM - 0.12) {
      // A large first movement may cross two levels. Stop at the handover
      // scale before entering, never render the z3 bounds-clamped map.
      if (map.getZoom() !== MAP_BOUNDARY_ZOOM) map.setZoom(MAP_BOUNDARY_ZOOM, { animate: false })
      pinch.entered = true
      options.enter()
      return
    }
    const nextZoom = Math.max(MAP_BOUNDARY_ZOOM, Math.round(requestedZoom))
    if (nextZoom === map.getZoom()) return
    const midpoint = new MouseEvent('mousemove', {
      clientX: (points[0]!.clientX + points[1]!.clientX) / 2,
      clientY: (points[0]!.clientY + points[1]!.clientY) / 2,
    })
    if (map.options.touchZoom === 'center') map.setZoom(nextZoom, { animate: false })
    else map.setZoomAround(map.mouseEventToContainerPoint(midpoint), nextZoom, { animate: false })
  }
  function releasePinch() {
    const restoreDragging = pinch?.restoreDragging
    pinch = null
    // Entering the globe intentionally disables Leaflet input. Do not undo it.
    if (restoreDragging && !disposed && options.canEnter()) map.dragging.enable()
  }
  function endPinch(event: Event, remaining: number) {
    if (!pinch) return
    stop(event)
    // Consume the remaining finger until it lifts, avoiding a pan jump.
    if (!remaining) releasePinch()
  }
  const touchPoints = (event: TouchEvent) => Array.from(event.touches)
  const onTouchStart = (event: TouchEvent) => beginPinch(event, touchPoints(event))
  const onTouchMove = (event: TouchEvent) => movePinch(event, touchPoints(event))
  const onTouchEnd = (event: TouchEvent) => endPinch(event, event.touches.length)
  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') return
    pointers.set(event.pointerId, event)
    beginPinch(event, [...pointers.values()])
  }
  function onPointerMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, event)
    movePinch(event, [...pointers.values()])
  }
  function onPointerUp(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return
    endPinch(event, pointers.size)
  }
  function onBlur() { pointers.clear(); releasePinch() }

  container.addEventListener('wheel', onWheel, capture)
  container.addEventListener('keydown', onKeyDown, capture)
  // Match Leaflet's public browser capability choice so the same gesture is
  // handled only once on browsers emitting both pointer and touch events.
  const nativeTouch = 'ontouchstart' in window || 'TouchEvent' in window
  if (nativeTouch) {
    container.addEventListener('touchstart', onTouchStart, capture)
    document.addEventListener('touchmove', onTouchMove, capture)
    document.addEventListener('touchend', onTouchEnd, capture)
    document.addEventListener('touchcancel', onTouchEnd, capture)
  } else {
    container.addEventListener('pointerdown', onPointerDown, capture)
    document.addEventListener('pointermove', onPointerMove, capture)
    document.addEventListener('pointerup', onPointerUp, capture)
    document.addEventListener('pointercancel', onPointerUp, capture)
  }
  window.addEventListener('blur', onBlur)

  return { dispose() {
    if (disposed) return
    releasePinch()
    disposed = true
    pointers.clear()
    container.removeEventListener('wheel', onWheel, true)
    container.removeEventListener('keydown', onKeyDown, true)
    container.removeEventListener('touchstart', onTouchStart, true)
    document.removeEventListener('touchmove', onTouchMove, true)
    document.removeEventListener('touchend', onTouchEnd, true)
    document.removeEventListener('touchcancel', onTouchEnd, true)
    container.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('pointermove', onPointerMove, true)
    document.removeEventListener('pointerup', onPointerUp, true)
    document.removeEventListener('pointercancel', onPointerUp, true)
    window.removeEventListener('blur', onBlur)
  } }
}
