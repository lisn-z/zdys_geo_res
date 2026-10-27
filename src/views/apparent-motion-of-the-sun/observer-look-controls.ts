import { Vector3, type PerspectiveCamera } from 'three'

export interface ObserverLookControls {
  setEnabled(enabled: boolean): void
  setDirection(heading: number, pitch: number): void
  dispose(): void
}

/**
 * 固定站位的第一人称环顾。只修改朝向，不移动相机，也不启动渲染循环。
 * 地平方向：+X 东、+Y 天顶、+Z 南；方位角从北起顺时针增加。
 * 调用方负责 tabindex、touch-action 和切换时停用 OrbitControls。
 */
export function createObserverLookControls(
  camera: PerspectiveCamera,
  element: HTMLElement,
  onChange?: (heading: number, pitch: number) => void,
): ObserverLookControls {
  let enabled = false
  let disposed = false
  let heading = 135
  let pitch = 20
  let drag: { pointerId: number; x: number; y: number } | null = null
  const target = new Vector3()
  const degrees = Math.PI / 180

  function applyDirection() {
    if (!enabled || disposed) return
    const headingRadians = heading * degrees
    const pitchRadians = pitch * degrees
    const horizontal = Math.cos(pitchRadians)
    target.set(
      Math.sin(headingRadians) * horizontal,
      Math.sin(pitchRadians),
      -Math.cos(headingRadians) * horizontal,
    ).add(camera.position)
    camera.lookAt(target)
    onChange?.(heading, pitch)
  }

  function setDirection(nextHeading: number, nextPitch: number) {
    if (disposed || !Number.isFinite(nextHeading) || !Number.isFinite(nextPitch)) return
    heading = ((nextHeading % 360) + 360) % 360
    pitch = Math.max(-75, Math.min(89.8, nextPitch))
    applyDirection()
  }

  function releaseDrag() {
    const pointerId = drag?.pointerId
    drag = null
    if (pointerId === undefined) return
    // 指针取消或元素被移除时，浏览器可能已经自动释放捕获。
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  }

  function onPointerDown(event: PointerEvent) {
    if (!enabled || disposed || drag || !event.isPrimary || event.button !== 0) return
    event.preventDefault()
    element.focus({ preventScroll: true })
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    element.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent) {
    if (!enabled || !drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag.x = event.clientX
    drag.y = event.clientY
    setDirection(heading + dx * 0.22, pitch - dy * 0.18)
  }

  function onPointerEnd(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) releaseDrag()
  }

  function onLostPointerCapture(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) drag = null
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!enabled || disposed || element.ownerDocument.activeElement !== element) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const step = event.shiftKey ? 12 : 4
    switch (event.key) {
      case 'ArrowLeft': setDirection(heading - step, pitch); break
      case 'ArrowRight': setDirection(heading + step, pitch); break
      case 'ArrowUp': setDirection(heading, pitch + step); break
      case 'ArrowDown': setDirection(heading, pitch - step); break
      default: return
    }
    event.preventDefault()
    event.stopPropagation()
  }

  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerup', onPointerEnd)
  element.addEventListener('pointercancel', onPointerEnd)
  element.addEventListener('lostpointercapture', onLostPointerCapture)
  element.addEventListener('keydown', onKeyDown)

  return {
    setEnabled(nextEnabled) {
      if (disposed) return
      if (!nextEnabled) releaseDrag()
      enabled = nextEnabled
      applyDirection()
    },
    setDirection,
    dispose() {
      if (disposed) return
      releaseDrag()
      enabled = false
      disposed = true
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerEnd)
      element.removeEventListener('pointercancel', onPointerEnd)
      element.removeEventListener('lostpointercapture', onLostPointerCapture)
      element.removeEventListener('keydown', onKeyDown)
    },
  }
}
