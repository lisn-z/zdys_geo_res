import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createMineralHouseModel } from './mineral-model'
import { createTelevisionScreen } from './television-screen'
import { createTableFlowers } from './table-flowers'
import { createModelYCar } from './model-y-car'
import { createIndoorFlightPath, INDOOR_POINTS } from './indoor-navigation'
import { MATERIAL_POINTS, type HouseView, type RoomId, type Vec3 } from './lesson'

export type ProjectedPoint = { id: number; x: number; y: number; visible: boolean; anchorX?: number; anchorY?: number }
export type MoveAction = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down'
export interface MineralSceneController {
  setView(view: HouseView): void; selectPoint(id: number | null): boolean
  enterRoom(room: RoomId): boolean; reset(): void; setAutoRotate(enabled: boolean): void
  zoom(delta: number): void; setMove(action: MoveAction, pressed: boolean): void; dispose(): void
}
type Callbacks = { onPoints?: (points: ProjectedPoint[]) => void; onReady?: () => void; onError?: (message: string) => void; onNotice?: (message: string) => void; onSelect?: (id: number) => void }
// Textbook view: look diagonally from the living-room/garage side, so the
// kitchen is on the left, bathroom at the back and garage on the right.
const HOME_EYE = new THREE.Vector3(16, 20, 16)
const HOME_TARGET = new THREE.Vector3(0, 1.6, .45)
const ROOMS: Record<RoomId, { eye: Vec3; target: Vec3 }> = {
  living: { eye: [3.1, 1.65, 4.7], target: [3.1, 1.1, .9] },
  kitchen: { eye: [-2.6, 1.65, 1.2], target: [-4.4, 1.13, 1.85] },
  bathroom: { eye: [-.8, 1.65, -3.8], target: [-.45, .6, -5.02] },
  garage: { eye: [1.55, 1.65, -2.9], target: [3.2, .9, -4.12] },
}
const KEYS: Record<string, MoveAction> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'down', KeyE: 'up',
}

export function createMineralScene(host: HTMLElement, callbacks: Callbacks = {}): MineralSceneController {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0xf5f3ed, 0)
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .96
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', '矿产资源房屋三维场景；自由探索中可用WASD或方向键移动，Q和E升降')
  renderer.domElement.setAttribute('role', 'img')
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, .045, 150)
  let model: ReturnType<typeof createMineralHouseModel>
  try { model = createMineralHouseModel() }
  catch (error) { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); throw error }
  const modelY = createModelYCar()
  modelY.root.position.set(3.03, .24, -4.12)
  model.root.add(modelY.root)
  for (const [id, anchor] of Object.entries(modelY.root.userData.featureAnchors as Record<number, Vec3>)) {
    model.root.userData.featureAnchors[id] = new THREE.Vector3(...anchor).add(modelY.root.position).toArray()
  }
  const highlight = (id: number | null) => { model.highlight(id); modelY.highlight(id) }
  const setCutaway = (enabled: boolean) => { model.setCutaway(enabled); modelY.setCutaway(enabled) }
  scene.add(model.root)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environmentRoom = new RoomEnvironment()
  let environment: THREE.WebGLRenderTarget
  try { environment = pmrem.fromScene(environmentRoom, .04) }
  catch (error) { modelY.root.removeFromParent(); modelY.dispose(); model.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); throw error }
  finally { environmentRoom.dispose(); pmrem.dispose() }
  scene.environment = environment.texture
  scene.environmentIntensity = .48
  scene.add(new THREE.HemisphereLight(0xf2f7ff, 0xc1aa8d, 1.15))
  const sun = new THREE.DirectionalLight(0xfff4df, 2.6)
  sun.position.set(-6, 14, 8); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: .5, far: 40 })
  sun.shadow.bias = -.00015; sun.shadow.normalBias = .022
  sun.shadow.radius = 3
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xd4e6ff, .65)
  fill.position.set(7, 7, -5); scene.add(fill)
  const groundGeometry = new THREE.PlaneGeometry(200, 200)
  const groundMaterial = new THREE.ShadowMaterial({ color: 0x625e53, opacity: .12 })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.38; ground.receiveShadow = true; scene.add(ground)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = .09
  controls.minDistance = 1.4; controls.maxDistance = 80
  controls.minPolarAngle = .05; controls.maxPolarAngle = Math.PI * .49
  controls.rotateSpeed = .65; controls.zoomSpeed = .75; controls.autoRotateSpeed = .7
  let view: HouseView = 'cutaway', disposed = false, paused = document.hidden, dirty = true
  let hiddenAt: number | null = document.hidden ? performance.now() : null
  let contextUnavailable = false
  let width = 1, height = 1, frame = 0, last = performance.now(), lastProjection = ''
  let yaw = 0, pitch = 0, selected: number | null = null
  let flight: null | {
    start: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; target: THREE.Vector3; duration: number
    path?: THREE.Curve<THREE.Vector3>; fromRotation: THREE.Quaternion; toRotation: THREE.Quaternion
  } = null
  let drag: null | { id: number; x: number; y: number; startX: number; startY: number; moved: boolean } = null
  const pressed = new Set<string>(), virtual = new Set<MoveAction>()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const pickRay = new THREE.Raycaster(), collisionRay = new THREE.Raycaster(), labelRay = new THREE.Raycaster()
  const colliders: THREE.Mesh[] = []
  model.root.traverse(object => { if (object instanceof THREE.Mesh) colliders.push(object) })
  const visible = (object: THREE.Object3D): boolean => { for (let item: THREE.Object3D | null = object; item; item = item.parent) if (!item.visible) return false; return true }
  const invalidate = () => { dirty = true }
  model.root.userData.onTextureReady = invalidate
  const tableFlowers = createTableFlowers()
  tableFlowers.root.position.set(3.1, .78, 3.35)
  model.root.add(tableFlowers.root)
  const television = createTelevisionScreen()
  const screen = model.root.userData.televisionScreen as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
  screen.material.map = television.texture
  screen.material.color.set('#ffffff'); screen.material.toneMapped = false; screen.material.needsUpdate = true
  const stoneTile = new THREE.TextureLoader().load('/geo-resources-folder/images/mineral-resources-house/grey-stone-tile-albedo.png', texture => {
    if (disposed) { texture.dispose(); return }
    model.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) if (material instanceof THREE.MeshStandardMaterial && material.userData.stoneTile) {
        material.map = texture; material.color.set('#ffffff'); material.roughness = .65; material.bumpScale = .003; material.needsUpdate = true
      }
    })
    invalidate()
  }, undefined, () => { /* Keep the local procedural material if offline. */ })
  stoneTile.colorSpace = THREE.SRGBColorSpace
  stoneTile.wrapS = stoneTile.wrapT = THREE.RepeatWrapping
  stoneTile.anisotropy = 8
  const shadowChange = () => { renderer.shadowMap.needsUpdate = true; dirty = true }
  controls.addEventListener('change', invalidate)
  controls.addEventListener('start', cancelFlight)
  function cancelFlight() { flight = null }
  function clearMovement() { pressed.clear(); virtual.clear(); drag = null }
  function setAngles(target: THREE.Vector3) {
    const direction = target.clone().sub(camera.position).normalize()
    yaw = Math.atan2(-direction.x, -direction.z)
    pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -.995, .995))
  }
  function look() {
    const direction = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
    camera.lookAt(camera.position.clone().add(direction)); controls.target.copy(camera.position).add(direction)
  }
  function resize() {
    const nextWidth = Math.max(1, host.clientWidth), nextHeight = Math.max(1, host.clientHeight)
    const changed = width !== nextWidth || height !== nextHeight
    if (changed) {
      width = nextWidth; height = nextHeight
      renderer.setSize(width, height, false)
    }
    camera.aspect = width / height
    // The floating card must not shift the house away from the page centre.
    camera.clearViewOffset()
    // Only close inspections reserve space for their expanded explanation card.
    if (selected !== null && view !== 'interior' && width >= 900) camera.setViewOffset(width, height, 170, 0, width, height)
    camera.updateProjectionMatrix(); dirty = true
    // Resizing a canvas clears its drawing buffer. Repaint in the same observer
    // callback rather than expose a blank frame while the window is dragged.
    if (changed && !disposed) { renderer.render(scene, camera); project() }
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  function fly(eye: THREE.Vector3, target: THREE.Vector3, duration = 850) {
    controls.autoRotate = false; clearMovement()
    // Clear orbit inertia without moving a first-person camera whose look target
    // may be closer than OrbitControls.minDistance.
    const origin = camera.position.clone(), rotation = camera.quaternion.clone(), originTarget = controls.target.clone()
    const damping = controls.enableDamping
    controls.enableDamping = false; controls.update(); controls.enableDamping = damping
    camera.position.copy(origin); camera.quaternion.copy(rotation); controls.target.copy(originTarget)
    const indoor = view === 'interior'
    model.root.updateMatrixWorld(true)
    const path = indoor ? createIndoorFlightPath(origin, eye, flightSegmentClear) : undefined
    if (path === null) {
      cancelFlight(); setAngles(originTarget); dirty = true
      callbacks.onNotice?.('当前位置无法安全到达，请先退回通道，或点击复位后重新进入。')
      return false
    }
    const toRotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, target, camera.up))
    if (reducedMotion.matches && !indoor) {
      camera.position.copy(eye); controls.target.copy(target); camera.lookAt(target); setAngles(target); dirty = true; flight = null
    } else {
      // Explicit navigation still has a short transition with reduced motion.
      // Longer room-to-room trips have enough time to show their route.
      const travelTime = path ? THREE.MathUtils.clamp(650 + path.getLength() * 135, 850, 2600) : duration
      flight = {
        start: performance.now(), duration: reducedMotion.matches ? 350 : travelTime,
        from: origin, to: eye, fromTarget: originTarget, target, path,
        fromRotation: rotation, toRotation
      }
      dirty = true
    }
    return true
  }
  function home() {
    const target = HOME_TARGET.clone()
    const back = HOME_EYE.clone().sub(HOME_TARGET).normalize()
    const right = new THREE.Vector3().crossVectors(camera.up, back).normalize()
    const up = new THREE.Vector3().crossVectors(back, right)
    const availableWidth = Math.max(240, width - (width < 650 ? 44 : 230))
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)) * .89
    const tanX = tanY * availableWidth / height
    const surfaces: THREE.Vector3[] = []
    model.root.updateMatrixWorld(true)
    model.root.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !visible(object)) return
      const vertices = object.geometry.getAttribute('position')
      for (let i = 0; i < vertices.count; i += 3) {
        surfaces.push(new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld))
      }
    })
    // Centre the projected silhouette, rather than the floor origin. The raised
    // rear roof and projecting front entrance make the world-space centre differ.
    const relative = new THREE.Vector3()
    let distance = 10
    for (let iteration = 0; iteration < 4; iteration++) {
      distance = 10
      for (const point of surfaces) {
        relative.copy(point).sub(target)
        distance = Math.max(distance, Math.abs(relative.dot(right)) / tanX + relative.dot(back), Math.abs(relative.dot(up)) / tanY + relative.dot(back))
      }
      if (iteration === 3) break
      let left = Infinity, rightEdge = -Infinity, bottom = Infinity, top = -Infinity
      for (const point of surfaces) {
        relative.copy(point).sub(target)
        const depth = distance - relative.dot(back)
        const x = relative.dot(right) / depth, y = relative.dot(up) / depth
        left = Math.min(left, x); rightEdge = Math.max(rightEdge, x)
        bottom = Math.min(bottom, y); top = Math.max(top, y)
      }
      target.addScaledVector(right, (left + rightEdge) * distance * .5)
      target.addScaledVector(up, (bottom + top) * distance * .5)
    }
    fly(back.multiplyScalar(distance).add(target), target)
  }
  function setView(next: HouseView) {
    view = next; selected = null; highlight(null); controls.autoRotate = false; clearMovement()
    setCutaway(next !== 'exterior'); controls.enabled = next !== 'interior'
    camera.fov = next === 'interior' ? 64 : 38; resize()
    if (next === 'interior') enterRoom('living'); else home()
    shadowChange()
  }
  function enterRoom(room: RoomId) {
    const previous = selected
    view = 'interior'; selected = null; highlight(null); controls.enabled = false
    controls.autoRotate = false; setCutaway(true)
    camera.fov = 64
    resize(); shadowChange()
    const accepted = fly(new THREE.Vector3(...ROOMS[room].eye), new THREE.Vector3(...ROOMS[room].target))
    if (!accepted) { selected = previous; highlight(previous); resize(); shadowChange() }
    return accepted
  }
  function selectPoint(id: number | null) {
    const previous = selected
    const point = MATERIAL_POINTS.find(item => item.id === id)
    if (id !== null && !point) return false
    selected = id; highlight(id)
    if (id === null) { if (view !== 'interior') { camera.fov = 38; resize(); home() }; shadowChange(); return true }
    if (!point) return false
    if (view === 'interior') {
      const focus = INDOOR_POINTS[id]
      if (!focus) return false
      controls.enabled = false; camera.fov = 64; resize(); shadowChange()
      const accepted = fly(new THREE.Vector3(...focus.eye), new THREE.Vector3(...focus.target))
      if (!accepted) { selected = previous; highlight(previous); resize(); shadowChange() }
      return accepted
    }
    view = 'cutaway'; controls.enabled = true; setCutaway(true)
    camera.fov = 44; resize()
    fly(new THREE.Vector3(...point.camera), new THREE.Vector3(...point.target)); shadowChange()
    return true
  }
  function keydown(event: KeyboardEvent) {
    if (view !== 'interior' || disposed || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (KEYS[event.code]) { event.preventDefault(); pressed.add(event.code); flight = null }
  }
  function keyup(event: KeyboardEvent) { pressed.delete(event.code) }
  function pointerdown(event: PointerEvent) {
    if (event.button !== 0) return
    renderer.domElement.focus({ preventScroll: true })
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false }
    if (view === 'interior') { renderer.domElement.setPointerCapture(event.pointerId); event.preventDefault() }
  }
  function pointermove(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true
    if (view === 'interior') {
      if (drag.moved) cancelFlight()
      yaw -= (event.clientX - drag.x) * .004
      pitch = THREE.MathUtils.clamp(pitch - (event.clientY - drag.y) * .0035, -1.45, 1.45)
      look(); dirty = true
    }
    drag.x = event.clientX; drag.y = event.clientY
  }
  function pointerup(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return
    if (!drag.moved && view !== 'interior') {
      const box = renderer.domElement.getBoundingClientRect()
      pickRay.setFromCamera(new THREE.Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1), camera)
      const hit = pickRay.intersectObjects(colliders, false).find(item => visible(item.object))
      if (hit) {
        let node: THREE.Object3D | null = hit.object
        while (node && !node.userData.featureId) node = node.parent
        if (node?.userData.featureId) callbacks.onSelect?.(Number(node.userData.featureId))
      }
    }
    drag = null
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
  }
  const clearDrag = () => { drag = null }
  renderer.domElement.addEventListener('pointerdown', pointerdown)
  renderer.domElement.addEventListener('pointermove', pointermove)
  renderer.domElement.addEventListener('pointerup', pointerup)
  renderer.domElement.addEventListener('pointercancel', clearDrag)
  window.addEventListener('pointerup', clearDrag)
  window.addEventListener('keydown', keydown)
  window.addEventListener('keyup', keyup)
  window.addEventListener('blur', clearMovement)
  function visibility() {
    const now = performance.now()
    if (document.hidden) {
      if (hiddenAt === null) hiddenAt = now
    } else if (hiddenAt !== null) {
      // Resume at the same point, including a flight requested while hidden.
      if (flight) flight.start += Math.max(0, now - Math.max(hiddenAt, flight.start))
      hiddenAt = null
    }
    paused = document.hidden || contextUnavailable
    clearMovement(); last = now; dirty = true
  }
  document.addEventListener('visibilitychange', visibility)
  function contextLost(event: Event) { event.preventDefault(); contextUnavailable = true; paused = true; clearMovement(); callbacks.onError?.('三维显示连接中断，请点击重试重新打开房屋。') }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)

  // Swept clearance rays stop the eye sphere before solid geometry. Resolve axes
  // separately so navigation slides along a wall instead of becoming stuck.
  const clearance = .19
  const offsets = [new THREE.Vector3(), new THREE.Vector3(clearance, 0, 0), new THREE.Vector3(-clearance, 0, 0), new THREE.Vector3(0, clearance, 0), new THREE.Vector3(0, -clearance, 0), new THREE.Vector3(0, 0, clearance), new THREE.Vector3(0, 0, -clearance)]
  function flightSegmentClear(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const direction = to.clone().sub(from), length = direction.length()
    if (length < .00001) return true
    direction.divideScalar(length)
    collisionRay.near = 0; collisionRay.far = length + clearance
    const obstacles = colliders.filter(mesh => visible(mesh))
    for (const offset of offsets) {
      collisionRay.set(from.clone().add(offset), direction)
      if (collisionRay.intersectObjects(obstacles, false).length) return false
    }
    return true
  }
  function tryStep(delta: THREE.Vector3) {
    const length = delta.length()
    if (length < .00001) return
    const direction = delta.clone().divideScalar(length)
    collisionRay.near = 0; collisionRay.far = length + clearance
    const obstacles = colliders.filter(mesh => visible(mesh))
    for (const offset of offsets) {
      collisionRay.set(camera.position.clone().add(offset), direction)
      if (collisionRay.intersectObjects(obstacles, false).length) return
    }
    camera.position.add(delta)
    camera.position.clamp(new THREE.Vector3(-16, .48, -16), new THREE.Vector3(16, 15, 16))
  }
  function move(dt: number) {
    const active = new Set<MoveAction>(virtual)
    pressed.forEach(key => { if (KEYS[key]) active.add(KEYS[key]) })
    if (!active.size) return
    const forward = Number(active.has('forward')) - Number(active.has('backward'))
    const right = Number(active.has('right')) - Number(active.has('left'))
    const up = Number(active.has('up')) - Number(active.has('down'))
    const direction = new THREE.Vector3(-Math.sin(yaw) * forward + Math.cos(yaw) * right, up, -Math.cos(yaw) * forward - Math.sin(yaw) * right)
    if (direction.lengthSq() === 0) return
    direction.normalize().multiplyScalar(dt * 2.3)
    tryStep(new THREE.Vector3(direction.x, 0, 0)); tryStep(new THREE.Vector3(0, direction.y, 0)); tryStep(new THREE.Vector3(0, 0, direction.z))
    look(); dirty = true
  }
  function project() {
    const occupied: { x: number; y: number }[] = []
    const offsets: Record<number, [number, number]> = { 1: [-160, -95], 2: [100, -100], 3: [-190, -25], 4: [-160, 30], 5: [-105, 85], 6: [115, 90], 7: [170, 55], 8: [175, -45] }
    const points = MATERIAL_POINTS.map(point => {
      const anchor = model.root.userData.featureAnchors?.[point.id] as Vec3 | undefined
      const world = new THREE.Vector3(...(anchor ?? point.position))
      if (view === 'interior' && point.id === 6 && selected !== 6) world.set(4.76, 1.35, .8)
      const projected = world.clone().project(camera)
      const anchorX = (projected.x + 1) * width / 2, anchorY = (1 - projected.y) * height / 2
      const offset = offsets[point.id] ?? [60, -40]
      const scale = view === 'interior' ? .35 : width < 650 ? .4 : 1
      let x = THREE.MathUtils.clamp(anchorX + offset[0] * scale, 85, width - 140)
      let y = THREE.MathUtils.clamp(anchorY + offset[1] * scale, 25, height - 36)
      let show = projected.z > -1 && projected.z < 1 && anchorX > 12 && anchorX < width - 12 && anchorY > 12 && anchorY < height - 12 && view !== 'exterior' && (view === 'interior' || selected === null || selected === point.id)
      if (show && view === 'interior') {
        const direction = world.clone().sub(camera.position)
        labelRay.set(camera.position, direction.clone().normalize()); labelRay.far = Math.max(0, direction.length() - .12)
        const hit = labelRay.intersectObjects(colliders, false).find(item => visible(item.object))
        if (hit && hit.object.userData.featureId !== point.id && !(point.id === 8 && hit.object.userData.featureId === 7)) show = false
      }
      if (show) {
        // Small deterministic vertical separation prevents two annotations hiding
        // each other as the house turns; their location stays close to its object.
        const initialY = y
        for (let step = 0; step < 12 && occupied.some(other => Math.abs(x - other.x) < 126 && Math.abs(y - other.y) < 34); step++) {
          const direction = step % 2 === 0 ? 1 : -1
          y = THREE.MathUtils.clamp(initialY + direction * Math.ceil((step + 1) / 2) * 36, 25, height - 36)
        }
        occupied.push({ x, y })
      }
      return { id: point.id, x: Math.round(x), y: Math.round(y), anchorX: Math.round(anchorX), anchorY: Math.round(anchorY), visible: show }
    })
    const signature = JSON.stringify(points)
    if (signature !== lastProjection) { lastProjection = signature; callbacks.onPoints?.(points) }
  }
  function tick(time: number) {
    if (disposed) return
    frame = requestAnimationFrame(tick)
    const dt = Math.min((time - last) / 1000, .04); last = time
    if (paused) return
    if (view !== 'exterior' && television.update(time)) dirty = true
    if (flight) {
      const t = Math.min(1, (time - flight.start) / flight.duration), ease = t * t * (3 - 2 * t)
      if (flight.path) {
        flight.path.getPointAt(ease, camera.position)
        camera.quaternion.slerpQuaternions(flight.fromRotation, flight.toRotation, ease)
        const lookDistance = THREE.MathUtils.lerp(flight.from.distanceTo(flight.fromTarget), flight.to.distanceTo(flight.target), ease)
        controls.target.copy(camera.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), Math.max(.1, lookDistance))
      } else {
        camera.position.lerpVectors(flight.from, flight.to, ease)
        controls.target.lerpVectors(flight.fromTarget, flight.target, ease)
        camera.lookAt(controls.target)
      }
      if (t === 1) {
        camera.position.copy(flight.to); controls.target.copy(flight.target); camera.lookAt(controls.target); flight = null
      }
      setAngles(controls.target); dirty = true
    } else if (view === 'interior') move(dt)
    else controls.update(dt)
    if (dirty) { renderer.render(scene, camera); project(); dirty = false }
  }
  resize(); camera.position.copy(HOME_EYE); controls.target.copy(HOME_TARGET); camera.lookAt(HOME_TARGET)
  setCutaway(true); shadowChange(); home(); frame = requestAnimationFrame(tick)
  callbacks.onReady?.()
  return {
    setView, selectPoint, enterRoom,
    reset() { setView('cutaway') },
    setAutoRotate(enabled) { if (view !== 'interior') { if (enabled) flight = null; controls.autoRotate = enabled && !reducedMotion.matches; dirty = true } },
    zoom(delta) { if (view === 'interior') return; flight = null; const d = camera.position.clone().sub(controls.target); const length = THREE.MathUtils.clamp(d.length() * (delta > 0 ? .83 : 1.2), 1.4, 80); camera.position.copy(controls.target).add(d.setLength(length)); dirty = true },
    setMove(action, held) { if (held && view === 'interior') { cancelFlight(); virtual.add(action) } else virtual.delete(action) },
    dispose() {
      if (disposed) return; disposed = true; clearMovement(); cancelAnimationFrame(frame)
      resizeObserver.disconnect(); controls.dispose()
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearMovement); window.removeEventListener('pointerup', clearDrag)
      document.removeEventListener('visibilitychange', visibility)
      renderer.domElement.removeEventListener('pointerdown', pointerdown); renderer.domElement.removeEventListener('pointermove', pointermove); renderer.domElement.removeEventListener('pointerup', pointerup); renderer.domElement.removeEventListener('pointercancel', clearDrag); renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      modelY.root.removeFromParent(); modelY.dispose(); tableFlowers.dispose(); television.dispose(); stoneTile.dispose(); model.dispose(); environment.dispose(); sun.shadow.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
