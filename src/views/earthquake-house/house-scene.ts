import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SAFETY_POINTS, type HouseView, type RoomId, type SafetyPoint } from './lesson'
import { createHouseModel } from './house-model'
import type { HouseSceneCallbacks, HouseSceneController, ProjectedSafetyPoint } from './scene-contract'

const DEFAULT_EYE = new THREE.Vector3(8.8, 8.6, 16)
const DEFAULT_TARGET = new THREE.Vector3(0, 3.25, 0)
const EXTENSION_EYE = new THREE.Vector3(13, 9, 19)
const EXTENSION_TARGET = new THREE.Vector3(2, 3, 0)
const ROOM_VIEWS: Record<RoomId, { eye: [number, number, number]; target: [number, number, number] }> = {
  living: { eye: [-3.9, 1.7, 2.4], target: [-3.35, 1.6, 1.6] },
  fireplace: { eye: [-0.7, 1.65, 2.45], target: [-2.1, 1.2, 1.6] },
  dining: { eye: [-0.65, 1.65, -0.25], target: [-2.35, 1.08, -0.85] },
  bedroom: { eye: [3.25, 4.65, 1.85], target: [1.55, 4.05, 0.15] },
  utility: { eye: [3.3, 1.7, 2.25], target: [1.45, 1.3, 1.55] },
  kitchen: { eye: [5.2, 1.75, 1.2], target: [6.3, 1.8, -1.8] },
  entry: { eye: [6.65, 1.75, 2.1], target: [5.3, 0.95, 1.25] },
}

type CameraFlight = {
  started: number; duration: number
  fromEye: THREE.Vector3; toEye: THREE.Vector3
  fromTarget: THREE.Vector3; toTarget: THREE.Vector3
  fromFov: number; toFov: number; complete?: () => void
  path?: THREE.CatmullRomCurve3
}

/** Two real views of a shared model: an orbitable house and a close-up camera. */
export function createHouseScene(host: HTMLElement, detailHost: HTMLElement, callbacks: HouseSceneCallbacks = {}): HouseSceneController {
  let disposed = false
  let lostContext = false
  let view: HouseView = 'cutaway'
  let selected: number | null = null
  let labelsVisible = true
  let autoRotate = false
  let frame = 0
  let dirty = true
  let detailDirty = true
  let previousTime = performance.now()
  let hiddenAt: number | null = null
  let flight: CameraFlight | null = null
  let mainWidth = 1
  let mainHeight = 1
  let detailWidth = 1
  let detailHeight = 1
  let detailVisible = false
  let ready = false
  let interiorYaw = 0
  let interiorPitch = 0
  let activeRoom: RoomId | null = null
  let extensionVisible = false
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const points = new Map(SAFETY_POINTS.map(point => [point.id, point]))
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.045, 180)
  camera.position.copy(DEFAULT_EYE)
  camera.lookAt(DEFAULT_TARGET)
  const detailCamera = new THREE.PerspectiveCamera(35, 1, 0.035, 120)
  const lookTarget = DEFAULT_TARGET.clone()

  function makeRenderer(label: string): THREE.WebGLRenderer {
    const result = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    result.setClearColor(0xf5f3ec, 0)
    result.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    result.outputColorSpace = THREE.SRGBColorSpace
    result.toneMapping = THREE.ACESFilmicToneMapping
    result.toneMappingExposure = 0.98
    result.shadowMap.enabled = true
    result.shadowMap.type = THREE.PCFShadowMap
    result.shadowMap.autoUpdate = false
    result.shadowMap.needsUpdate = true
    result.domElement.setAttribute('aria-label', label)
    result.domElement.setAttribute('role', 'img')
    result.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;'
    return result
  }
  const renderer = makeRenderer('抗震小屋三维模型，可拖动旋转、滚轮缩放')
  let detailRenderer: THREE.WebGLRenderer
  try {
    detailRenderer = makeRenderer('选中部位的三维放大视图')
  } catch (error) {
    renderer.dispose()
    renderer.forceContextLoss()
    throw error
  }
  renderer.domElement.tabIndex = 0
  host.appendChild(renderer.domElement)
  detailHost.appendChild(detailRenderer.domElement)

  const hemisphere = new THREE.HemisphereLight(0xe7edf2, 0x797768, 1.1)
  scene.add(hemisphere)
  const keyLight = new THREE.DirectionalLight(0xfff7e9, 2.7)
  keyLight.position.set(-7, 14, 10)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.left = -10
  keyLight.shadow.camera.right = 10
  keyLight.shadow.camera.top = 11
  keyLight.shadow.camera.bottom = -9
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 45
  keyLight.shadow.bias = -0.0003
  keyLight.shadow.normalBias = 0.025
  keyLight.shadow.radius = 3
  keyLight.target.position.set(0, 2.5, 0)
  scene.add(keyLight, keyLight.target)
  const fillLight = new THREE.DirectionalLight(0xe3eaf0, 0.55)
  fillLight.position.set(9, 8, -5)
  scene.add(fillLight)
  const frontFill = new THREE.DirectionalLight(0xfff9f0, 0.32)
  frontFill.position.set(0, 4, 11)
  scene.add(frontFill)

  const model = createHouseModel()
  scene.add(model.root)
  model.setCutaway(true)
  model.setExtensionVisible(false)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(DEFAULT_TARGET)
  controls.enableDamping = true
  controls.dampingFactor = 0.085
  controls.rotateSpeed = 0.6
  controls.panSpeed = 0.65
  controls.zoomSpeed = 0.65
  controls.minDistance = 5.5
  controls.maxDistance = 30
  controls.minPolarAngle = 0.12
  controls.maxPolarAngle = Math.PI * 0.485
  controls.autoRotateSpeed = 0.55
  controls.update()

  const invalidate = () => { dirty = true; detailDirty = true }
  const shadowsChanged = () => {
    renderer.shadowMap.needsUpdate = true
    detailRenderer.shadowMap.needsUpdate = true
    invalidate()
  }
  const controlChanged = () => {
    if (view !== 'interior') {
      // Keep a dragged model within a useful classroom framing.
      const bounded = controls.target.clone().clamp(new THREE.Vector3(-5, 0.2, -4), new THREE.Vector3(extensionVisible ? 9 : 5, 7, 4))
      if (!bounded.equals(controls.target)) {
        camera.position.add(bounded.clone().sub(controls.target))
        controls.target.copy(bounded)
      }
      lookTarget.copy(controls.target)
    }
    dirty = true
  }
  controls.addEventListener('change', controlChanged)

  function resize(): void {
    if (disposed) return
    const width = Math.max(1, Math.round(host.clientWidth))
    const height = Math.max(1, Math.round(host.clientHeight))
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    if (width !== mainWidth || height !== mainHeight || renderer.getPixelRatio() !== dpr) {
      mainWidth = width
      mainHeight = height
      renderer.setPixelRatio(dpr)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      dirty = true
    }
    const nextDetailWidth = Math.round(detailHost.clientWidth)
    const nextDetailHeight = Math.round(detailHost.clientHeight)
    detailVisible = nextDetailWidth > 1 && nextDetailHeight > 1
    if (detailVisible && (nextDetailWidth !== detailWidth || nextDetailHeight !== detailHeight || detailRenderer.getPixelRatio() !== dpr)) {
      detailWidth = nextDetailWidth
      detailHeight = nextDetailHeight
      detailRenderer.setPixelRatio(dpr)
      detailRenderer.setSize(detailWidth, detailHeight, false)
      detailCamera.aspect = detailWidth / detailHeight
      detailCamera.updateProjectionMatrix()
      detailDirty = true
    }
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  observer.observe(detailHost)
  window.addEventListener('resize', resize)
  resize()

  function updatePoints(): void {
    if (!callbacks.onPoints) return
    camera.updateMatrixWorld()
    const projected: ProjectedSafetyPoint[] = []
    for (const point of SAFETY_POINTS) {
      if (!pointInCurrentGroup(point)) continue
      const p = new THREE.Vector3(...point.position).project(camera)
      projected.push({
        id: point.id,
        x: (p.x + 1) * mainWidth / 2,
        y: (1 - p.y) * mainHeight / 2,
        visible: labelsVisible && view !== 'interior' && p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.03 && Math.abs(p.y) < 1.03,
      })
    }
    callbacks.onPoints(projected)
  }

  function pointInCurrentGroup(point: SafetyPoint): boolean {
    return point.group === (extensionVisible ? 'extension' : 'textbook')
  }

  function entryXForRoom(room: RoomId): number {
    return room === 'living' ? -3.35 : room === 'fireplace' || room === 'dining' ? -1.55 : room === 'kitchen' || room === 'entry' ? 6.65 : 1.8
  }

  function entryDepthForRoom(room: RoomId): number {
    return room === 'fireplace' || room === 'dining' ? 2.35 : 2.15
  }

  function startFlight(eye: THREE.Vector3, target: THREE.Vector3, complete?: () => void, fov = 36, destinationRoom?: RoomId): void {
    controls.enabled = false
    controls.autoRotate = false
    // Flush damping so a prior drag does not nudge the destination after a flight.
    const savedEye = camera.position.clone()
    const savedTarget = controls.target.clone()
    const savedLookTarget = lookTarget.clone()
    const damping = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
    camera.position.copy(savedEye)
    controls.target.copy(savedTarget)
    lookTarget.copy(savedLookTarget)
    camera.lookAt(lookTarget)
    flight = {
      started: performance.now(), duration: reducedMotion.matches ? 1 : 980,
      fromEye: camera.position.clone(), toEye: eye.clone(),
      fromTarget: lookTarget.clone(), toTarget: target.clone(),
      fromFov: camera.fov, toFov: fov, complete,
    }
    if (activeRoom || destinationRoom) {
      // Reach the room through its actual cutaway opening. The retained window
      // column and red entrance door must never pass through the camera.
      const route = [camera.position.clone()]
      if (activeRoom) {
        if (activeRoom === 'dining') {
          route.push(new THREE.Vector3(-1.25, camera.position.y, 0.6), new THREE.Vector3(-1.25, camera.position.y, 1.4))
        }
        const exitX = entryXForRoom(activeRoom)
        route.push(new THREE.Vector3(exitX, camera.position.y, entryDepthForRoom(activeRoom)), new THREE.Vector3(exitX, camera.position.y, 4.7))
      }
      if (destinationRoom) {
        const entryX = entryXForRoom(destinationRoom)
        route.push(new THREE.Vector3(entryX, eye.y, 4.7), new THREE.Vector3(entryX, eye.y, entryDepthForRoom(destinationRoom)))
        if (destinationRoom === 'dining') {
          // Pass between the fireplace and the open internal door before
          // turning into the seating area behind the chimney.
          route.push(new THREE.Vector3(-1.25, eye.y, 1.4), new THREE.Vector3(-1.25, eye.y, 0.6))
        }
      }
      route.push(eye.clone())
      // Consecutive repeated points can occur when resetting the same room.
      const spaced = route.filter((point, index) => index === 0 || point.distanceToSquared(route[index - 1]!) > 0.01)
      flight.path = new THREE.CatmullRomCurve3(spaced, false, 'centripetal')
      flight.duration = reducedMotion.matches ? 1 : activeRoom && destinationRoom ? 1800 : 1450
    }
    activeRoom = null
    dirty = true
  }

  function configureControls(): void {
    controls.enabled = view !== 'interior' && flight === null
    controls.autoRotate = autoRotate && view !== 'interior' && flight === null && !reducedMotion.matches
    controls.minDistance = selected === null ? 5.5 : 1.6
    // The ceiling fixture is inspected from below; don't let orbit constraints
    // silently pull this camera above the beam when the focus flight finishes.
    controls.maxPolarAngle = selected === 10 ? Math.PI * 0.68 : Math.PI * 0.485
    controls.maxDistance = selected === 10 ? 4.5 : 30
    renderer.domElement.style.cursor = view === 'interior' ? 'grab' : 'grab'
    renderer.domElement.setAttribute('aria-label', view === 'interior'
      ? '抗震小屋室内视角，拖动或使用方向键环顾室内'
      : '抗震小屋三维模型，可拖动旋转、滚轮缩放')
  }

  function setView(next: HouseView): void {
    if (disposed) return
    if (next === 'interior') { enterRoom(extensionVisible ? 'kitchen' : 'living'); return }
    view = next
    frontFill.intensity = 0.32
    selected = null
    model.highlight(null)
    model.setCutaway(true)
    callbacks.onViewChange?.(view)
    shadowsChanged()
    startFlight(extensionVisible ? EXTENSION_EYE : DEFAULT_EYE, extensionVisible ? EXTENSION_TARGET : DEFAULT_TARGET, () => {
      model.setCutaway(next === 'cutaway')
      shadowsChanged()
    })
  }

  function setDetailCamera(point: SafetyPoint): void {
    const target = new THREE.Vector3(...point.target)
    const source = new THREE.Vector3(...point.camera)
    const factor = point.id === 3 || point.id === 6 || point.id === 9 ? 0.7 : point.id === 1 ? 0.55 : 0.48
    detailCamera.position.copy(target).add(source.sub(target).multiplyScalar(factor))
    if (point.id === 2) {
      // The main view frames the shelf; this view reveals its actual wall bracket.
      target.set(-2.895, 2.76, 1.35)
      detailCamera.position.set(-3.1, 3.2, 2.4)
    } else if (point.id === 5) {
      // Frame the continuous bolt from the sill nut down into the concrete
      // section, with its embedded J hook visible through the front cut face.
      target.set(-3.89, 0.3, 2.7)
      detailCamera.position.set(-3.25, 1.12, 4.22)
    } else if (point.id === 8) {
      // The cabinet latch has a realistic small size; keep it legible in the
      // detail viewport without enlarging the physical fitting in the house.
      detailCamera.position.copy(target).add(new THREE.Vector3(0.22, 0.16, 0.75))
    }
    detailCamera.lookAt(target)
    detailCamera.updateMatrixWorld()
    detailDirty = true
  }

  function selectPoint(id: number | null): void {
    if (disposed || (id !== null && (!points.has(id) || !pointInCurrentGroup(points.get(id)!)))) return
    selected = id
    model.highlight(id)
    if (id === null) { setView('cutaway'); return }
    const point = points.get(id)!
    view = 'cutaway'
    frontFill.intensity = 0.32
    model.setCutaway(true)
    callbacks.onViewChange?.(view)
    setDetailCamera(point)
    shadowsChanged()
    startFlight(new THREE.Vector3(...point.camera), new THREE.Vector3(...point.target))
  }

  function syncInteriorAngles(): void {
    const direction = lookTarget.clone().sub(camera.position).normalize()
    interiorYaw = Math.atan2(direction.x, -direction.z)
    interiorPitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1))
  }

  function interiorLook(): void {
    interiorPitch = THREE.MathUtils.clamp(interiorPitch, -1.05, 1.05)
    const c = Math.cos(interiorPitch)
    lookTarget.copy(camera.position).add(new THREE.Vector3(Math.sin(interiorYaw) * c, Math.sin(interiorPitch), -Math.cos(interiorYaw) * c))
    camera.lookAt(lookTarget)
    dirty = true
  }

  function enterRoom(room: RoomId): void {
    if (disposed) return
    if ((room === 'kitchen' || room === 'entry') && !extensionVisible) return
    const placement = ROOM_VIEWS[room]
    if (!placement) return
    view = 'interior'
    frontFill.intensity = 0.5
    selected = null
    autoRotate = false
    model.highlight(null)
    model.setCutaway(true)
    callbacks.onViewChange?.(view)
    shadowsChanged()
    startFlight(new THREE.Vector3(...placement.eye), new THREE.Vector3(...placement.target), () => {
      activeRoom = room
      syncInteriorAngles()
      // Once inside, restore the real surrounding walls. Cutaway is used only
      // during the entry/exit flight and when inspecting the teaching details.
      model.setCutaway(false)
      shadowsChanged()
    }, 63, room)
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerStart: { id: number; x: number; y: number; lastX: number; lastY: number; moved: boolean } | null = null

  function pointerDown(event: PointerEvent): void {
    if (event.button !== 0 || disposed) return
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false }
    if (view === 'interior') {
      if (flight) return
      renderer.domElement.setPointerCapture(event.pointerId)
      renderer.domElement.style.cursor = 'grabbing'
      renderer.domElement.focus({ preventScroll: true })
    } else if (flight) {
      // Ignore orbit gestures during a sub-second camera move.
      pointerStart = null
    }
  }

  function pointerMove(event: PointerEvent): void {
    if (!pointerStart || pointerStart.id !== event.pointerId) return
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerStart.moved = true
    if (view === 'interior' && !flight) {
      interiorYaw -= (event.clientX - pointerStart.lastX) * 0.004
      interiorPitch += (event.clientY - pointerStart.lastY) * 0.0035
      interiorLook()
    }
    pointerStart.lastX = event.clientX
    pointerStart.lastY = event.clientY
  }

  function isVisible(object: THREE.Object3D): boolean {
    for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false
    return true
  }

  function pointerUp(event: PointerEvent): void {
    const start = pointerStart
    pointerStart = null
    renderer.domElement.style.cursor = 'grab'
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
    if (!start || start.id !== event.pointerId || start.moved || flight || view === 'interior') return
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(model.root, true).filter(hit => hit.object instanceof THREE.Mesh && isVisible(hit.object))
    // Respect opaque foreground geometry instead of selecting through walls.
    const first = hits[0]
    if (!first) return
    for (let object: THREE.Object3D | null = first.object; object; object = object.parent) {
      const id = Number(object.userData.safetyPoint)
      if (points.has(id) && pointInCurrentGroup(points.get(id)!)) { callbacks.onSelect?.(id); return }
    }
  }

  function pointerCancel(): void { pointerStart = null; renderer.domElement.style.cursor = 'grab' }
  function keyDown(event: KeyboardEvent): void {
    if (view !== 'interior' || flight) return
    if (event.key === 'ArrowLeft') interiorYaw -= 0.08
    else if (event.key === 'ArrowRight') interiorYaw += 0.08
    else if (event.key === 'ArrowUp') interiorPitch += 0.07
    else if (event.key === 'ArrowDown') interiorPitch -= 0.07
    else return
    event.preventDefault()
    interiorLook()
  }

  function contextLost(event: Event): void {
    event.preventDefault()
    lostContext = true
    callbacks.onError?.('三维画面暂时中断，正在等待显卡恢复。若未恢复，请重新打开课件。')
  }
  function contextRestored(): void {
    lostContext = false
    shadowsChanged()
    resize()
    callbacks.onReady?.()
  }
  function visibilityChanged(): void {
    const now = performance.now()
    previousTime = now
    if (document.hidden) hiddenAt = now
    else {
      if (flight && hiddenAt !== null) flight.started += now - hiddenAt
      hiddenAt = null
    }
    dirty = true
  }
  function motionChanged(): void { configureControls(); dirty = true }
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointermove', pointerMove)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', pointerCancel)
  renderer.domElement.addEventListener('keydown', keyDown)
  for (const canvas of [renderer.domElement, detailRenderer.domElement]) {
    canvas.addEventListener('webglcontextlost', contextLost)
    canvas.addEventListener('webglcontextrestored', contextRestored)
  }
  document.addEventListener('visibilitychange', visibilityChanged)
  reducedMotion.addEventListener('change', motionChanged)

  function tick(now: number): void {
    if (disposed) return
    frame = requestAnimationFrame(tick)
    const delta = Math.min((now - previousTime) / 1000, 0.05)
    previousTime = now
    if (document.hidden || lostContext || mainWidth < 2 || mainHeight < 2) return
    if (flight) {
      const running = flight
      const progress = THREE.MathUtils.clamp((now - running.started) / running.duration, 0, 1)
      const eased = progress * progress * (3 - 2 * progress)
      if (running.path) camera.position.copy(running.path.getPoint(eased))
      else camera.position.lerpVectors(running.fromEye, running.toEye, eased)
      lookTarget.lerpVectors(running.fromTarget, running.toTarget, eased)
      camera.fov = THREE.MathUtils.lerp(running.fromFov, running.toFov, eased)
      camera.updateProjectionMatrix()
      camera.lookAt(lookTarget)
      dirty = true
      if (progress === 1) {
        flight = null
        controls.target.copy(lookTarget)
        running.complete?.()
        configureControls()
      }
    } else if (view !== 'interior') controls.update(delta)
    try {
      if (dirty) {
        renderer.render(scene, camera)
        updatePoints()
        dirty = false
        if (!ready) { ready = true; callbacks.onReady?.() }
      }
      if (selected !== null && detailVisible && detailDirty) {
        detailRenderer.render(scene, detailCamera)
        detailDirty = false
      }
    } catch (error) {
      lostContext = true
      console.error('Earthquake house renderer failed:', error)
      callbacks.onError?.('三维画面加载失败，请重试。')
    }
  }
  configureControls()
  frame = requestAnimationFrame(tick)

  return {
    setView,
    selectPoint,
    enterRoom,
    setExtensionVisible(enabled) {
      if (disposed || extensionVisible === enabled) return
      extensionVisible = enabled
      selected = null
      autoRotate = false
      activeRoom = null
      model.setExtensionVisible(enabled)
      setView('cutaway')
    },
    setAutoRotate(enabled) { autoRotate = enabled; configureControls(); dirty = true },
    setLabelsVisible(visible) { labelsVisible = visible; dirty = true },
    reset() { autoRotate = false; setView('cutaway') },
    zoom(delta) {
      if (disposed || flight) return
      if (view === 'interior') {
        camera.fov = THREE.MathUtils.clamp(camera.fov - delta * 4, 38, 76)
        camera.updateProjectionMatrix()
      } else {
        const offset = camera.position.clone().sub(controls.target)
        const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(-delta * 0.14), controls.minDistance, controls.maxDistance)
        camera.position.copy(controls.target).add(offset.setLength(distance))
        controls.update()
      }
      dirty = true
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', visibilityChanged)
      reducedMotion.removeEventListener('change', motionChanged)
      controls.removeEventListener('change', controlChanged)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', pointerCancel)
      renderer.domElement.removeEventListener('keydown', keyDown)
      for (const canvas of [renderer.domElement, detailRenderer.domElement]) {
        canvas.removeEventListener('webglcontextlost', contextLost)
        canvas.removeEventListener('webglcontextrestored', contextRestored)
      }
      model.dispose()
      keyLight.shadow.map?.dispose()
      scene.clear()
      for (const output of [renderer, detailRenderer]) {
        output.dispose()
        output.forceContextLoss()
        output.domElement.remove()
      }
      callbacks.onPoints?.([])
    },
  }
}
