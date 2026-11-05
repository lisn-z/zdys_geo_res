import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createWorld } from './world'
import { SITES } from './lesson'
import { overviewFrame } from './world-camera'
import { WORLD_HORIZONTAL_SCALE, toWorldVec3 } from './world-scale'
import type { GameScene, MoveAction, SceneMode, SceneOptions, SiteId, SitePoint, Vec3 } from './types'

const EYE = 1.65
const RADIUS = .30
const STEP_UP = .38
const STEP_DOWN = .48
const WALK_SPEED = 3.05
const INTERACT_DISTANCE = 4.2 * WORLD_HORIZONTAL_SCALE
const SUPPORT_OFFSETS = [[0, 0], [RADIUS * .8, 0], [-RADIUS * .8, 0], [0, RADIUS * .8], [0, -RADIUS * .8]] as const
const MOVE_KEYS: Record<string, MoveAction> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
}
const vec = (value: Vec3) => new THREE.Vector3(...value)
const smooth = (value: number) => value * value * (3 - 2 * value)
const editable = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable="true"]'))

/** One renderer and one RAF own navigation, observation flights and photography. */
export function createGameScene(host: HTMLElement, options: SceneOptions): GameScene {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance', preserveDrawingBuffer: false })
  } catch {
    options.onError('无法启动三维场景，请检查浏览器的图形加速设置。')
    const noop = () => {}
    return { setMode: noop, setMoving: noop, stopMoving: noop, setPaused: noop, travelTo: noop, setIntro: noop, finishIntro: noop,
      setDrain: noop, setVisitorPlan: noop, setVisitorsPlaying: noop, resetVisitors: noop, dispose: noop,
      capture: () => Promise.reject(new Error('三维场景尚未启动。')) }
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const canvas = renderer.domElement
  canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%'
  canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none'
  canvas.style.setProperty('-webkit-touch-callout', 'none')
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', '马丘比丘三维探访场景，拖动画面环顾，WASD或方向键行走，E键调查附近地点')
  host.appendChild(canvas)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#a9c8d9')
  scene.fog = new THREE.FogExp2('#b5cbd0', .00045)
  const camera = new THREE.PerspectiveCamera(56, 1, .12, 4200)
  const world = createWorld()
  const activeSites = world.sites.filter(site => SITES.some(lesson => lesson.id === site.id))
  world.setDrain(true)
  scene.add(world.group)
  world.group.updateWorldMatrix(true, true)
  const hemisphere = new THREE.HemisphereLight('#d4e5ef', '#858875', 1.45)
  const sun = new THREE.DirectionalLight('#fff1d8', 2.5)
  sun.position.set(-360, 650, 250); sun.target.position.set(0, 40, -80)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -310; sun.shadow.camera.right = 310
  sun.shadow.camera.top = 310; sun.shadow.camera.bottom = -310
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 1600
  sun.shadow.normalBias = .035; sun.shadow.bias = -.00015
  scene.add(hemisphere, sun, sun.target)

  // A closed, camera-centred sky sphere covers the whole viewing direction,
  // including the deep valley below an overview camera. The 3:1 photograph's
  // middle row is the horizon; its lower half supplies the surrounding valley.
  const panoramaGeometry = new THREE.SphereGeometry(3200, 96, 48)
  const panoramaPositions = panoramaGeometry.getAttribute('position')
  const panoramaColors = new Float32Array(panoramaPositions.count * 3)
  const skyColor = new THREE.Color('#9fc4ed'), horizonColor = new THREE.Color('#afc6ca'), valleyColor = new THREE.Color('#788b77'), skySample = new THREE.Color()
  for (let index = 0; index < panoramaPositions.count; index++) {
    const y = panoramaPositions.getY(index) / 3200
    if (y >= 0) skySample.copy(horizonColor).lerp(skyColor, THREE.MathUtils.smoothstep(y, 0, .7))
    else skySample.copy(valleyColor).lerp(horizonColor, THREE.MathUtils.smoothstep(y, -.7, 0))
    panoramaColors[index * 3] = skySample.r; panoramaColors[index * 3 + 1] = skySample.g; panoramaColors[index * 3 + 2] = skySample.b
  }
  panoramaGeometry.setAttribute('color', new THREE.BufferAttribute(panoramaColors, 3))
  const panoramaMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })
  const panorama = new THREE.Mesh(panoramaGeometry, panoramaMaterial)
  panorama.name = 'andes-complete-sky-and-valley-panorama'; panorama.rotation.y = Math.PI / 2; panorama.renderOrder = -10; panorama.frustumCulled = false
  scene.add(panorama)
  let panoramaTexture: THREE.Texture | undefined
  let disposed = false
  new THREE.TextureLoader().load('/machu-picchu-guardian/mountains.png', texture => {
    if (disposed) { texture.dispose(); return }
    panoramaTexture = texture; texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping
    // Keep the distant ridges near the horizon instead of stretching a wide
    // panorama over the entire vertical hemisphere.
    texture.repeat.set(1, 1.8); texture.offset.y = -.4
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    panoramaMaterial.map = texture; panoramaMaterial.vertexColors = false; panoramaMaterial.needsUpdate = true
  }, undefined, () => {})

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true; controls.dampingFactor = .08
  controls.minDistance = 12; controls.maxDistance = 2100
  controls.minPolarAngle = .16; controls.maxPolarAngle = Math.PI * .48
  controls.enablePan = true; controls.screenSpacePanning = false
  controls.target.set(0, 35, -80); controls.enabled = false

  const walkBounds = new THREE.Box3()
  const walkSurfaces = world.walkables.map(object => ({ object, bounds: new THREE.Box3().setFromObject(object) }))
  for (const surface of walkSurfaces) walkBounds.union(surface.bounds)
  if (walkBounds.isEmpty()) walkBounds.set(new THREE.Vector3(-30, -10, -35), new THREE.Vector3(30, 20, 30))
  const player = vec(world.spawn)
  const velocity = new THREE.Vector3()
  const downward = new THREE.Vector3(0, -1, 0)
  const groundRay = new THREE.Raycaster()
  const intersections: THREE.Intersection[] = []
  const groundCandidates: THREE.Object3D[] = []
  const candidateBox = new THREE.Box3()
  const probe = new THREE.Vector3()
  const rayPoint = new THREE.Vector3()
  const lineRay = new THREE.Ray()
  const forward = new THREE.Vector3()
  const projected = new THREE.Vector3()
  const toSite = new THREE.Vector3()
  const targetQuaternion = new THREE.Quaternion()
  const lookMatrix = new THREE.Matrix4()
  const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ')
  let yaw = 0, pitch = 0, bobTime = 0
  let eyeY = player.y + EYE
  let mode: SceneMode = 'walk'
  let paused = false, hidden = document.hidden, contextLost = false, introActive = false
  const keys = new Set<string>(), virtual = new Set<MoveAction>()
  const siteVectors = new Map(activeSites.map(site => [site.id, vec(site.position)]))
  const pickerGeometry = new THREE.SphereGeometry(.8 * WORLD_HORIZONTAL_SCALE, 8, 6)
  const pickerMaterial = new THREE.MeshBasicMaterial()
  const pickers = activeSites.map(site => {
    const mesh = new THREE.Mesh(pickerGeometry, pickerMaterial)
    mesh.position.copy(siteVectors.get(site.id)!); mesh.userData.site = site.id; mesh.updateMatrixWorld(true)
    return mesh
  })
  const pickRay = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let near: SiteId | null = null
  let lastInteraction = -1000
  type Flight = { from: THREE.Vector3; to: THREE.Vector3; fromRotation: THREE.Quaternion; toRotation: THREE.Quaternion; elapsed: number; duration: number; lift: number; done(): void }
  let flight: Flight | undefined
  let dragging: { id: number; x: number; y: number; originX: number; originY: number; moved: boolean } | undefined

  function groundAt(x: number, z: number, originY: number, distance: number): number | null {
    probe.set(x, originY, z); groundRay.set(probe, downward)
    groundRay.near = 0; groundRay.far = distance
    groundCandidates.length = 0
    for (const surface of walkSurfaces) {
      const bounds = surface.bounds
      if (x >= bounds.min.x - .0001 && x <= bounds.max.x + .0001 && z >= bounds.min.z - .0001 && z <= bounds.max.z + .0001 && originY >= bounds.min.y && originY - distance <= bounds.max.y) groundCandidates.push(surface.object)
    }
    intersections.length = 0; groundRay.intersectObjects(groundCandidates, true, intersections)
    return intersections.length ? intersections[0]!.point.y : null
  }
  function blocked(x: number, y: number, z: number): boolean {
    candidateBox.min.set(x - RADIUS, y + .09, z - RADIUS)
    candidateBox.max.set(x + RADIUS, y + EYE, z + RADIUS)
    return world.colliders.some(box => candidateBox.intersectsBox(box))
  }
  function supported(x: number, z: number, previousY: number): number | null {
    if (x < walkBounds.min.x + RADIUS || x > walkBounds.max.x - RADIUS || z < walkBounds.min.z + RADIUS || z > walkBounds.max.z - RADIUS) return null
    let centre: number | null = null
    for (const [dx, dz] of SUPPORT_OFFSETS) {
      const height = groundAt(x + dx, z + dz, previousY + STEP_UP + .04, STEP_UP + STEP_DOWN + .08)
      if (height === null || height - previousY > STEP_UP || previousY - height > STEP_DOWN) return null
      if (dx === 0 && dz === 0) centre = height
    }
    return centre !== null && !blocked(x, centre, z) ? centre : null
  }
  function safeArrival(position: Vec3): THREE.Vector3 {
    const requested = vec(position)
    for (const radius of [0, .4, .8, 1.2]) for (let direction = 0; direction < (radius ? 8 : 1); direction++) {
      const x = requested.x + Math.cos(direction * Math.PI / 4) * radius, z = requested.z + Math.sin(direction * Math.PI / 4) * radius
      const y = groundAt(x, z, requested.y + 1, 3)
      if (y !== null && Math.abs(y - requested.y) < .65 && !blocked(x, y, z)) return new THREE.Vector3(x, y, z)
    }
    return requested
  }
  function rotationToward(position: THREE.Vector3, target: THREE.Vector3, result: THREE.Quaternion): THREE.Quaternion {
    lookMatrix.lookAt(position, target, camera.up); return result.setFromRotationMatrix(lookMatrix)
  }
  function readWalkRotation(): void {
    cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ'); yaw = cameraEuler.y
    pitch = THREE.MathUtils.clamp(cameraEuler.x, -1.42, 1.42)
  }
  function walkCamera(bob = 0): void {
    camera.position.set(player.x, eyeY + bob, player.z)
    camera.quaternion.setFromEuler(cameraEuler.set(pitch, yaw, 0, 'YXZ'))
  }
  function stopMoving(): void { keys.clear(); virtual.clear(); velocity.set(0, 0, 0) }
  function enabledControls(): void { controls.enabled = mode === 'overview' && !paused && !introActive && !flight && !contextLost }
  function fly(to: THREE.Vector3, lookAt: THREE.Vector3, duration: number, lift: number, done: () => void): void {
    stopMoving(); dragging = undefined; controls.enabled = false
    flight = { from: camera.position.clone(), to, fromRotation: camera.quaternion.clone(), toRotation: rotationToward(to, lookAt, targetQuaternion).clone(), elapsed: 0, duration, lift, done }
  }
  function enterWalk(arrival: THREE.Vector3, lookAt: THREE.Vector3): void {
    player.copy(arrival); eyeY = player.y + EYE; camera.position.copy(arrival).addScaledVector(camera.up, EYE)
    camera.quaternion.copy(rotationToward(camera.position, lookAt, targetQuaternion)); readWalkRotation()
    mode = 'walk'; controls.enabled = false; bobTime = 0; stopMoving()
  }
  enterWalk(safeArrival(world.spawn), vec(world.spawnLookAt))

  function lineOfSight(position: THREE.Vector3): boolean {
    toSite.copy(position).sub(camera.position)
    const distance = toSite.length()
    if (distance < .05) return true
    lineRay.set(camera.position, toSite.multiplyScalar(1 / distance))
    return !world.colliders.some(box => lineRay.intersectBox(box, rayPoint) !== null && camera.position.distanceTo(rayPoint) < distance - .35)
  }
  function nearestSite(): SitePoint | undefined {
    let result: SitePoint | undefined, closest = INTERACT_DISTANCE
    for (const site of activeSites) {
      const distance = Math.hypot(player.x - site.position[0], player.z - site.position[2])
      if (distance <= closest && lineOfSight(siteVectors.get(site.id)!)) { result = site; closest = distance }
    }
    return result
  }
  function interact(id?: SiteId): void {
    if (paused || introActive || flight || mode !== 'walk') return
    const site = id ? activeSites.find(value => value.id === id) : nearestSite()
    if (!site || Math.hypot(player.x - site.position[0], player.z - site.position[2]) > INTERACT_DISTANCE || !lineOfSight(siteVectors.get(site.id)!)) return
    const now = performance.now()
    if (now - lastInteraction < 300) return
    lastInteraction = now; stopMoving(); options.onInteract(site.id)
  }
  function pickSite(clientX: number, clientY: number): void {
    const bounds = canvas.getBoundingClientRect()
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1)
    pickRay.setFromCamera(pointer, camera)
    const hit = pickRay.intersectObjects(pickers, false)[0]
    if (hit) interact(hit.object.userData.site as SiteId)
  }
  function pointerDown(event: PointerEvent): void {
    if (mode !== 'walk' || paused || introActive || flight || event.button !== 0 || dragging) return
    event.preventDefault(); canvas.focus({ preventScroll: true })
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY, moved: false }
    canvas.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent): void {
    if (!dragging || dragging.id !== event.pointerId) return
    const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y
    dragging.x = event.clientX; dragging.y = event.clientY
    if (Math.hypot(event.clientX - dragging.originX, event.clientY - dragging.originY) > 5) dragging.moved = true
    if (paused || introActive || flight) return
    yaw -= dx * .0032; pitch = THREE.MathUtils.clamp(pitch - dy * .0028, -1.42, 1.42)
    walkCamera()
  }
  function pointerUp(event: PointerEvent): void {
    if (!dragging || dragging.id !== event.pointerId) return
    const clicked = !dragging.moved && event.type === 'pointerup'
    dragging = undefined
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    if (clicked) pickSite(event.clientX, event.clientY)
  }
  function keyDown(event: KeyboardEvent): void {
    if (editable(event.target) || event.metaKey || event.ctrlKey || event.altKey || paused || hidden || mode !== 'walk' || introActive || flight) return
    if (MOVE_KEYS[event.code]) { event.preventDefault(); if (!event.repeat || keys.has(event.code)) keys.add(event.code) }
    else if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); interact() }
  }
  function keyUp(event: KeyboardEvent): void { keys.delete(event.code) }
  function blur(): void { stopMoving(); dragging = undefined }
  function contextMenu(event: Event): void { event.preventDefault() }
  function pressed(action: MoveAction): boolean {
    if (virtual.has(action)) return true
    for (const key of keys) if (MOVE_KEYS[key] === action) return true
    return false
  }
  function movePlayer(delta: number): void {
    const along = Number(pressed('forward')) - Number(pressed('backward')), across = Number(pressed('right')) - Number(pressed('left'))
    const length = Math.hypot(along, across) || 1
    const dx = (across * Math.cos(yaw) - along * Math.sin(yaw)) / length * WALK_SPEED
    const dz = (-across * Math.sin(yaw) - along * Math.cos(yaw)) / length * WALK_SPEED
    const blend = 1 - Math.exp(-11 * delta)
    velocity.x = THREE.MathUtils.lerp(velocity.x, dx, blend); velocity.z = THREE.MathUtils.lerp(velocity.z, dz, blend)
    if (Math.abs(velocity.x) + Math.abs(velocity.z) < .002) velocity.set(0, 0, 0)
    const steps = Math.max(1, Math.ceil(Math.hypot(velocity.x, velocity.z) * delta / .12))
    let travelled = 0
    for (let step = 0; step < steps; step++) {
      const x = velocity.x * delta / steps, z = velocity.z * delta / steps
      if (Math.abs(x) + Math.abs(z) < .00001) break
      const together = supported(player.x + x, player.z + z, player.y)
      if (together !== null) { player.set(player.x + x, together, player.z + z); travelled += Math.hypot(x, z); continue }
      const horizontal = supported(player.x + x, player.z, player.y)
      if (horizontal !== null) { player.x += x; player.y = horizontal; travelled += Math.abs(x) }
      const vertical = supported(player.x, player.z + z, player.y)
      if (vertical !== null) { player.z += z; player.y = vertical; travelled += Math.abs(z) }
    }
    if (travelled > .0001) bobTime += travelled * 2.6
    eyeY = THREE.MathUtils.lerp(eyeY, player.y + EYE, 1 - Math.exp(-14 * delta))
    walkCamera(travelled > .0001 ? Math.sin(bobTime * Math.PI * 2) * .012 : 0)
  }

  const introPositions = new THREE.CatmullRomCurve3([vec(toWorldVec3([-170, 180, 360])), vec(toWorldVec3([-140, 125, 285])), vec(toWorldVec3([-105, 91, 245])), vec(world.spawn).add(new THREE.Vector3(0, EYE, 0))])
  const introTargets = new THREE.CatmullRomCurve3([vec(toWorldVec3([0, 44, -95])), vec(toWorldVec3([0, 44, -95])), vec(toWorldVec3([0, 44, -95])), vec(world.spawnLookAt)])
  const introTarget = new THREE.Vector3()
  let width = 1, height = 1, resizePending = true, ready = false
  let raf = 0, lastTime = 0, elapsed = 0, lastReport = -1000
  let cameraSignature = '', sitesSignature = ''
  const captures: { resolve(value: string): void; reject(reason: Error): void }[] = []
  function report(): void {
    near = mode === 'walk' && !introActive && !flight ? nearestSite()?.id ?? null : null
    camera.getWorldDirection(forward)
    const state = { x: Math.round(camera.position.x * 100) / 100, z: Math.round(camera.position.z * 100) / 100,
      heading: Math.round((THREE.MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)) + 360) % 360), near }
    const signature = JSON.stringify(state)
    if (signature !== cameraSignature) { cameraSignature = signature; options.onCamera(state) }
    const sites = activeSites.map(site => {
      const position = siteVectors.get(site.id)!
      projected.copy(position).project(camera)
      const inFront = toSite.copy(position).sub(camera.position).dot(forward) > 0
      return { id: site.id, x: Math.round((projected.x + 1) * width / 2), y: Math.round((1 - projected.y) * height / 2),
        distance: Math.round(camera.position.distanceTo(position) * 10) / 10,
        visible: inFront && projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05 && lineOfSight(position) }
    })
    const nextSignature = JSON.stringify(sites)
    if (nextSignature !== sitesSignature) { sitesSignature = nextSignature; options.onSites(sites) }
  }
  function resize(): void {
    const nextWidth = Math.max(1, Math.round(host.clientWidth)), nextHeight = Math.max(1, Math.round(host.clientHeight))
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    if (width !== nextWidth || height !== nextHeight || renderer.getPixelRatio() !== ratio) {
      const oldAspect = camera.aspect
      width = nextWidth; height = nextHeight
      if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix()
      if (mode === 'overview' && !introActive && Math.abs(oldAspect - camera.aspect) > .001) {
        const nextFrame = overviewFrame(camera.aspect, camera.fov)
        if (flight) { flight.to.copy(vec(nextFrame.position)); controls.target.copy(vec(nextFrame.target)) }
        else {
          const oldFrame = overviewFrame(oldAspect, camera.fov)
          const scale = vec(nextFrame.position).distanceTo(vec(nextFrame.target)) / vec(oldFrame.position).distanceTo(vec(oldFrame.target))
          const offset = camera.position.clone().sub(controls.target)
          offset.setLength(THREE.MathUtils.clamp(offset.length() * scale, controls.minDistance, controls.maxDistance))
          camera.position.copy(controls.target).add(offset)
        }
      }
    }
    resizePending = false
  }
  function fulfilCaptures(): void {
    if (!captures.length) return
    const requests = captures.splice(0)
    try {
      const source = renderer.domElement, scale = Math.min(1, 1440 / Math.max(source.width, source.height))
      const output = document.createElement('canvas'); output.width = Math.max(1, Math.round(source.width * scale)); output.height = Math.max(1, Math.round(source.height * scale))
      const context = output.getContext('2d')
      if (!context) throw new Error('无法创建照片画布。')
      context.drawImage(source, 0, 0, output.width, output.height)
      const data = output.toDataURL('image/jpeg', .9)
      if (!data.startsWith('data:image/jpeg')) throw new Error('照片编码失败。')
      requests.forEach(request => request.resolve(data))
    } catch (error) {
      const failure = error instanceof Error ? error : new Error('照片保存失败，请重试。')
      requests.forEach(request => request.reject(failure))
    }
  }
  function frame(now: number): void {
    raf = 0
    if (disposed || hidden) return
    // Low-frame-rate surfaces still advance at a useful pace. Walking subdivides
    // this interval into <=0.12-unit collision probes; hidden tabs reset lastTime.
    const delta = lastTime ? Math.min(.16, Math.max(0, (now - lastTime) / 1000)) : 0
    lastTime = now
    if (!contextLost) {
      if (resizePending || renderer.getPixelRatio() !== Math.min(window.devicePixelRatio || 1, 1.5)) resize()
      elapsed += delta
      if (!paused) {
        if (flight) {
          flight.elapsed += delta
          const t = Math.min(1, flight.elapsed / flight.duration), eased = smooth(t)
          camera.position.lerpVectors(flight.from, flight.to, eased); camera.position.y += Math.sin(Math.PI * t) * flight.lift
          camera.quaternion.slerpQuaternions(flight.fromRotation, flight.toRotation, eased)
          if (t === 1) { const done = flight.done; flight = undefined; done(); enabledControls() }
        } else if (!introActive && mode === 'walk') movePlayer(delta)
        else if (!introActive && mode === 'overview') controls.update(delta)
      }
      // Investigation panels pause the player, while drainage and visitor
      // experiments remain observable. Hidden pages still stop this entire RAF.
      world.update(elapsed, delta)
      panorama.position.copy(camera.position)
      // Keep walking shadows detailed without a gigantic texture; the overhead
      // view uses a single, stable city-wide shadow frustum. Snapping the centre
      // avoids sub-texel shadow shimmer while moving through the ruins.
      const localShadow = mode === 'walk' && !flight && !introActive
      const shadowExtent = localShadow ? 52 : 360
      const shadowX = localShadow ? Math.round(player.x) : 0
      const shadowZ = localShadow ? Math.round(player.z) : -20
      const shadowY = localShadow ? Math.round(player.y) : 40
      sun.target.position.set(shadowX, shadowY, shadowZ)
      sun.position.set(shadowX - 360, shadowY + 610, shadowZ + 330)
      if (sun.shadow.camera.right !== shadowExtent) {
        sun.shadow.camera.left = -shadowExtent; sun.shadow.camera.right = shadowExtent
        sun.shadow.camera.top = shadowExtent; sun.shadow.camera.bottom = -shadowExtent
        sun.shadow.camera.updateProjectionMatrix()
      }
      renderer.render(scene, camera)
      fulfilCaptures()
      if (now - lastReport > 100 || resizePending) { lastReport = now; report() }
      if (!ready) { ready = true; options.onReady() }
    }
    raf = requestAnimationFrame(frame)
  }
  function visibility(): void {
    hidden = document.hidden; stopMoving(); dragging = undefined; lastTime = 0
    if (hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; captures.splice(0).forEach(request => request.reject(new Error('页面已隐藏，照片尚未生成。'))) }
    else if (!raf && !disposed) { resizePending = true; raf = requestAnimationFrame(frame) }
  }
  function lost(event: Event): void {
    event.preventDefault(); contextLost = true; stopMoving(); enabledControls()
    captures.splice(0).forEach(request => request.reject(new Error('图形上下文已暂停。')))
    options.onError('图形渲染暂时中断，正在等待浏览器恢复。')
  }
  function restored(): void { contextLost = false; resizePending = true; lastTime = 0; enabledControls(); options.onReady() }
  const observer = new ResizeObserver(() => { resizePending = true })
  observer.observe(host)
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp)
  canvas.addEventListener('contextmenu', contextMenu); canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored)
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', visibility)
  if (!hidden) raf = requestAnimationFrame(frame)

  return {
    setMode(next) {
      if (disposed || next === mode && !introActive && !flight) return
      introActive = false; flight = undefined; stopMoving()
      if (next === 'overview') {
        if (mode === 'walk') readWalkRotation()
        mode = 'overview'
        const frame = overviewFrame(camera.aspect, camera.fov)
        controls.target.copy(vec(frame.target))
        const to = vec(frame.position)
        fly(to, controls.target.clone(), .85, 1.5, () => { controls.update(); enabledControls() })
      } else {
        mode = 'walk'
        const to = player.clone().add(new THREE.Vector3(0, EYE, 0))
        cameraEuler.set(pitch, yaw, 0, 'YXZ'); targetQuaternion.setFromEuler(cameraEuler)
        const target = new THREE.Vector3(0, 0, -1).applyQuaternion(targetQuaternion).add(to)
        fly(to, target, .7, .7, () => walkCamera())
      }
    },
    setMoving(action, pressed) { if (disposed) return; if (pressed && !paused && mode === 'walk' && !introActive && !flight) virtual.add(action); else virtual.delete(action) },
    stopMoving,
    setPaused(value) { if (disposed) return; paused = value; if (value) { stopMoving(); dragging = undefined }; enabledControls(); lastTime = 0 },
    travelTo(id) {
      if (disposed) return
      const site = activeSites.find(value => value.id === id)
      if (!site) return
      introActive = false; mode = 'walk'
      const arrival = safeArrival(site.arrival), to = arrival.clone().add(new THREE.Vector3(0, EYE, 0)), target = vec(site.lookAt)
      const distance = camera.position.distanceTo(to)
      fly(to, target, THREE.MathUtils.clamp(distance / 90, 1.15, 4.5), Math.min(150, distance * .32), () => enterWalk(arrival, target))
    },
    setIntro(progress) {
      if (disposed) return
      introActive = true; flight = undefined; stopMoving(); controls.enabled = false
      const t = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1)
      introPositions.getPoint(t, camera.position); introTargets.getPoint(t, introTarget)
      camera.quaternion.copy(rotationToward(camera.position, introTarget, targetQuaternion)); report()
    },
    finishIntro() { if (disposed) return; introActive = false; flight = undefined; enterWalk(safeArrival(world.spawn), vec(world.spawnLookAt)); report() },
    setDrain(clear) { if (!disposed) world.setDrain(clear) },
    setVisitorPlan(plan) { if (!disposed) world.setVisitorPlan(plan) },
    setVisitorsPlaying(playing) { if (!disposed) world.setVisitorsPlaying(playing) },
    resetVisitors() { if (!disposed) world.resetVisitors() },
    capture() {
      if (disposed || contextLost || hidden || !ready || host.clientWidth < 1 || host.clientHeight < 1) return Promise.reject(new Error('当前场景尚不能拍照，请在画面显示后重试。'))
      return new Promise<string>((resolve, reject) => { captures.push({ resolve, reject }) })
    },
    dispose() {
      if (disposed) return
      disposed = true; stopMoving(); if (raf) cancelAnimationFrame(raf)
      observer.disconnect(); controls.dispose()
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp)
      canvas.removeEventListener('contextmenu', contextMenu); canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
      captures.splice(0).forEach(request => request.reject(new Error('场景已关闭。')))
      world.dispose(); pickerGeometry.dispose(); pickerMaterial.dispose()
      panorama.geometry.dispose(); panorama.material.dispose(); panoramaTexture?.dispose(); sun.shadow.map?.dispose()
      scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove()
    },
  }
}
