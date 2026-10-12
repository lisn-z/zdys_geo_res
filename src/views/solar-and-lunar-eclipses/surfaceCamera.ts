import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OBSERVER_FOV, OBSERVER_CLOSE_FOV } from './observerProjection'

export interface SurfaceState {
  up: THREE.Vector3
  north: THREE.Vector3
  targetDirection: THREE.Vector3
  radius: number
}

export function surfaceFrame(state: SurfaceState) {
  const east = new THREE.Vector3().crossVectors(state.north, state.up).normalize()
  // 眼睛在原地球网格表面稍上方；观测视线独立于教学场景的缩距模型。
  const position = state.up.clone().multiplyScalar(state.radius * 1.012)
  const sight = state.targetDirection
  const eastward = sight.dot(east), northward = sight.dot(state.north)
  // 天顶方位无定义，与当地天空/2D预览统一以北向为基准。
  const heading = Math.hypot(eastward, northward) < 1e-8 ? 0 : THREE.MathUtils.radToDeg(Math.atan2(eastward, northward))
  const altitude = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(sight.dot(state.up), -1, 1)))
  return { east, position, heading, altitude }
}

export function surfaceFlightPosition(start: THREE.Vector3, end: THREE.Vector3, progress: number, minRadius: number) {
  const from = start.clone().normalize(), to = end.clone().normalize()
  const turn = new THREE.Quaternion().setFromUnitVectors(from, to)
  const arc = new THREE.Quaternion().identity().slerp(turn, progress)
  const radius = Math.max(minRadius, THREE.MathUtils.lerp(start.length(), end.length(), progress))
  return from.applyQuaternion(arc).multiplyScalar(radius)
}

/** 左侧原场景的地表相机；右侧当地天空使用独立相机，交互互不干扰。 */
export function createSurfaceCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  canvas: HTMLCanvasElement,
  report: (heading: number, pitch: number, following: boolean, closeUp: boolean) => void,
) {
  let enabled = false
  let following = true
  let heading = 180, pitch = 20
  let state: SurfaceState | null = null
  let pointer: { id: number; x: number; y: number } | null = null
  let saved: { position: THREE.Vector3; quaternion: THREE.Quaternion; up: THREE.Vector3; target: THREE.Vector3; fov: number; near: number } | null = null
  let flight: { position: THREE.Vector3; quaternion: THREE.Quaternion; up: THREE.Vector3; fov: number; time: number; skyBlend: number } | null = null
  let skyBlend = 0
  let lastTime = 0
  const notify = () => report((heading % 360 + 360) % 360, pitch, following, camera.fov < 30)

  function resetView() {
    if (!state) return
    const aim = surfaceFrame(state)
    heading = aim.heading
    pitch = THREE.MathUtils.clamp(aim.altitude, 5, 89.8)
    following = true
    camera.fov = OBSERVER_FOV
    camera.updateProjectionMatrix()
    notify()
  }

  function setEnabled(next: boolean, nextState: SurfaceState) {
    state = nextState
    if (next === enabled) return
    // 排空 OrbitControls 惯性，同时保留用户最后的机位。
    const position = camera.position.clone(), quaternion = camera.quaternion.clone()
    controls.enableDamping = false; controls.update(); controls.enableDamping = true
    camera.position.copy(position); camera.quaternion.copy(quaternion)
    if (next && !saved) saved = {
      position, quaternion, up: camera.up.clone(), target: controls.target.clone(), fov: camera.fov, near: camera.near,
    }
    enabled = next
    pointer = null
    controls.enabled = false
    flight = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(), fov: camera.fov, time: performance.now(), skyBlend }
    if (next) {
      const aim = surfaceFrame(state)
      heading = aim.heading; pitch = THREE.MathUtils.clamp(aim.altitude, 5, 89.8)
      following = true
    }
    camera.near = 0.001
    canvas.style.cursor = next ? 'grab' : 'progress'
    notify()
  }

  function update(nextState: SurfaceState, time: number) {
    state = nextState
    if (!enabled && !flight) return
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
    lastTime = time
    const frame = surfaceFrame(state)
    if (enabled && following) {
      const blend = 1 - Math.exp(-dt * 6)
      heading += (((frame.heading - heading + 540) % 360) - 180) * blend
      pitch = THREE.MathUtils.lerp(pitch, THREE.MathUtils.clamp(frame.altitude, camera.fov < 30 ? 0 : 5, 89.8), blend)
    }
    const h = THREE.MathUtils.degToRad(heading), p = THREE.MathUtils.degToRad(pitch)
    const direction = frame.east.clone().multiplyScalar(Math.sin(h) * Math.cos(p))
      .addScaledVector(state.north, Math.cos(h) * Math.cos(p)).addScaledVector(state.up, Math.sin(p))
    const destination = enabled ? frame.position : saved!.position
    const up = enabled ? state.up : saved!.up
    const rotation = enabled
      ? new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(destination, destination.clone().add(direction), up))
      : saved!.quaternion
    if (flight) {
      const progress = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min((time - flight.time) / 1600, 1)
      const t = progress * progress * (3 - 2 * progress)
      skyBlend = THREE.MathUtils.lerp(flight.skyBlend, enabled ? 1 : 0, t)
      camera.position.copy(surfaceFlightPosition(flight.position, destination, t, state.radius * 1.012))
      camera.quaternion.copy(flight.quaternion).slerp(rotation, t)
      camera.up.copy(flight.up).lerp(up, t).normalize()
      camera.fov = THREE.MathUtils.lerp(flight.fov, enabled ? OBSERVER_FOV : saved!.fov, t)
      camera.updateProjectionMatrix()
      if (progress === 1) {
        flight = null
        if (!enabled) {
          camera.near = saved!.near
          camera.position.copy(saved!.position); camera.quaternion.copy(saved!.quaternion); camera.up.copy(saved!.up)
          controls.target.copy(saved!.target)
          camera.updateProjectionMatrix()
          controls.enabled = true
          canvas.style.cursor = ''
          saved = null
        }
      }
    } else {
      camera.position.copy(destination); camera.quaternion.copy(rotation); camera.up.copy(up)
    }
    notify()
  }

  function pointerDown(event: PointerEvent) {
    if (!enabled || flight || event.button !== 0 || pointer) return
    canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId)
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
    following = false; notify()
  }
  function pointerMove(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return
    const sensitivity = camera.fov / Math.max(canvas.clientHeight, 200)
    heading -= (event.clientX - pointer.x) * sensitivity
    pitch = THREE.MathUtils.clamp(pitch + (event.clientY - pointer.y) * sensitivity, -80, 89.8)
    pointer.x = event.clientX; pointer.y = event.clientY; notify()
  }
  function pointerUp(event: PointerEvent) {
    if (pointer?.id !== event.pointerId) return
    pointer = null
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  }
  function wheel(event: WheelEvent) {
    if (!enabled || flight) return
    event.preventDefault()
    camera.fov = THREE.MathUtils.clamp(camera.fov * Math.exp(event.deltaY * 0.001), 4, 100)
    camera.updateProjectionMatrix()
  }
  function keydown(event: KeyboardEvent) {
    if (!enabled || flight) return
    if (event.key === 'Home') { event.preventDefault(); resetView(); return }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault(); following = false
    const step = event.shiftKey ? 8 : 2
    if (event.key === 'ArrowLeft') heading -= step
    if (event.key === 'ArrowRight') heading += step
    if (event.key === 'ArrowUp') pitch += step
    if (event.key === 'ArrowDown') pitch -= step
    pitch = THREE.MathUtils.clamp(pitch, -80, 89.8); notify()
  }
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', '3D 地球地表视角，拖动或方向键环顾，滚轮缩放')
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', pointerUp)
  canvas.addEventListener('lostpointercapture', pointerUp)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('keydown', keydown)
  function cancel() {
    enabled = false; flight = null; saved = null; pointer = null; skyBlend = 0
    controls.enabled = true; canvas.style.cursor = ''
  }
  function dispose() {
    canvas.removeEventListener('pointerdown', pointerDown)
    canvas.removeEventListener('pointermove', pointerMove)
    canvas.removeEventListener('pointerup', pointerUp)
    canvas.removeEventListener('pointercancel', pointerUp)
    canvas.removeEventListener('lostpointercapture', pointerUp)
    canvas.removeEventListener('wheel', wheel)
    canvas.removeEventListener('keydown', keydown)
  }
  return { setEnabled, update, resetView, cancel, dispose,
    locate() {
      following = true
      camera.fov = camera.fov < 30 ? OBSERVER_FOV : OBSERVER_CLOSE_FOV
      camera.updateProjectionMatrix(); notify()
    },
    toggleFollow() { following = !following; notify() },
    get active() { return enabled || !!flight },
    get skyBlend() { return skyBlend },
  }
}
