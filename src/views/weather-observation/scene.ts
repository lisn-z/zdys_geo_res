import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createWeatherInstruments } from './instruments'
import { createStationEnvironment } from './environment'
import { createWindVisuals } from './wind-visuals'
import type { InstrumentAction, InstrumentId, SceneCallbacks, ViewMode, WeatherScene, WeatherState } from './types'

const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const INITIAL: WeatherState = {
  temperature: 23.6, maximum: 26.8, minimum: 17.4, rainfall: 12.4,
  windDirection: 135, windSpeed: 4.2, screenOpen: false, rainCutaway: false, raining: false,
}
interface Pose { eye: THREE.Vector3; target: THREE.Vector3 }
interface Flight { from: Pose; to: Pose; startedAt: number }

export function createWeatherScene(host: HTMLElement, callbacks: SceneCallbacks): WeatherScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f4f3ed')
  scene.fog = new THREE.Fog('#f4f3ed', 38, 110)
  const camera = new THREE.PerspectiveCamera(39, 1, 0.012, 160)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;'
  renderer.domElement.tabIndex = 0
  renderer.domElement.setAttribute('aria-label', '三维气象观测场。进入观测场后，可用方向键或 W、A、S、D 行走。')
  host.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environmentMap = pmrem.fromScene(room, 0.04)
  scene.environment = environmentMap.texture
  scene.environmentIntensity = 0.42
  room.dispose(); pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xecf3f8, 0x777962, 1.35))
  const sun = new THREE.DirectionalLight(0xfff2d9, 2.25)
  sun.position.set(-6, 14, -8)
  sun.target.position.set(0, 1.3, 1)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -12, near: 0.5, far: 38 })
  sun.shadow.bias = -0.00006
  sun.shadow.normalBias = 0.006
  sun.shadow.radius = 3
  scene.add(sun, sun.target)
  const fill = new THREE.DirectionalLight(0xddeef7, 0.85)
  fill.position.set(3, 6, 12); scene.add(fill)
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e6dd, roughness: 1 })
  const floorGeometry = new THREE.PlaneGeometry(200, 200)
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; floor.receiveShadow = true; scene.add(floor)

  const station = createStationEnvironment()
  const instruments = createWeatherInstruments()
  const windVisuals = createWindVisuals()
  scene.add(station.group, instruments.group, windVisuals.group)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.085
  controls.maxPolarAngle = Math.PI * 0.492
  controls.minDistance = 0.35; controls.maxDistance = 55
  controls.enablePan = true
  controls.screenSpacePanning = true
  let width = 1, height = 1, disposed = false, lost = false, frame = 0
  let mode: ViewMode = 'overview', weather = { ...INITIAL }, flight: Flight | null = null
  let lastTime = performance.now(), elapsed = 0, lastOverlay = 0, ready = false, pointerMoved = false
  const pointerStart = new THREE.Vector2(), pointerLast = new THREE.Vector2()
  let userMoved = false, activePointer: number | null = null
  let walkYaw = 0, walkPitch = 0
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), projected = new THREE.Vector3(), actionWorld = new THREE.Vector3()
  const keys = new Set<string>()

  function overviewPose(): Pose {
    const target = vec(0, 3.4, 0.7)
    const direction = vec(-0.42, 0.48, 0.85).normalize()
    const reserve = width > 950 ? 340 : 0
    const fit = new THREE.PerspectiveCamera(39, Math.max(0.25, (width - reserve) / height), 0.01, 160)
    let distance = 24
    for (let attempt = 0; attempt < 35; attempt++) {
      fit.position.copy(target).addScaledVector(direction, distance); fit.lookAt(target); fit.updateMatrixWorld()
      let okay = true
      for (const x of [-7, 7]) for (const z of [-5, 7]) {
        const point = vec(x, -0.35, z).project(fit)
        if (Math.abs(point.x) > 0.91 || point.y < -0.78) okay = false
      }
      const mast = vec(3, 10.7, 2).project(fit)
      if (mast.y > 0.85 || Math.abs(mast.x) > 0.85) okay = false
      if (okay) break
      distance *= 1.035
    }
    return { eye: target.clone().addScaledVector(direction, distance), target }
  }

  function poseFor(view: ViewMode): Pose {
    const narrow = width < 700 ? 1.2 : 1
    if (view === 'screen') {
      // Include the open door and its handle as well as the thermometer cabinet.
      const target = vec(-3.22, 1.65, 0.36)
      return { target, eye: target.clone().add(vec(0.5, 0.25, 2.55).multiplyScalar(Math.max(1, 1.05 / camera.aspect))) }
    }
    if (view === 'rain') {
      if (weather.rainCutaway) {
        const waterLevel = 0.085 + weather.rainfall / 90
        const target = vec(0.16, waterLevel, -1.9)
        return { target, eye: target.clone().add(vec(0.1, 0, 1.7).multiplyScalar(narrow)) }
      }
      const target = vec(0.16, 0.39, -2)
      return { target, eye: target.clone().add(vec(0.7, 0.4, 1.55).multiplyScalar(narrow)) }
    }
    if (view === 'wind') {
      const target = vec(3, 10, 2)
      return { target, eye: target.clone().add(vec(1.8, 0.95, 3.3).multiplyScalar(narrow)) }
    }
    if (view === 'walk') return { eye: vec(0, 1.65, 5.7), target: vec(-2.5, 1.65, 0.1) }
    return overviewPose()
  }
  function syncWalkDirection() {
    const direction = controls.target.clone().sub(camera.position).normalize()
    walkYaw = Math.atan2(direction.x, direction.z)
    walkPitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1))
  }
  function applyWalkDirection() {
    const horizontal = Math.cos(walkPitch)
    controls.target.copy(camera.position).add(vec(
      Math.sin(walkYaw) * horizontal, Math.sin(walkPitch), Math.cos(walkYaw) * horizontal,
    ).multiplyScalar(4))
    camera.lookAt(controls.target)
  }
  function clearOrbitMotion() {
    // Disabling damping for one update clears its public-control momentum. Restore
    // the displayed pose so that this housekeeping cannot move the flight's start.
    const eye = camera.position.clone(), target = controls.target.clone(), quaternion = camera.quaternion.clone()
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    camera.position.copy(eye); controls.target.copy(target); camera.quaternion.copy(quaternion)
  }
  function jump(pose: Pose) {
    camera.position.copy(pose.eye); controls.target.copy(pose.target); camera.lookAt(pose.target)
    if (mode === 'walk') { syncWalkDirection(); applyWalkDirection() }
    else controls.update()
  }
  function applyControlLimits() {
    controls.minDistance = mode === 'overview' ? 5 : mode === 'rain' ? 0.25 : 0.45
    controls.maxDistance = mode === 'overview' ? 55 : mode === 'walk' ? 12 : mode === 'wind' ? 12 : 7
    controls.enabled = mode !== 'walk' && !flight
    controls.enablePan = mode !== 'walk'
  }
  function flyTo(view: ViewMode, immediate = false) {
    clearOrbitMotion()
    mode = view; keys.clear(); userMoved = false
    if (view === 'walk') renderer.domElement.focus({ preventScroll: true })
    if (activePointer !== null && renderer.domElement.hasPointerCapture(activePointer)) renderer.domElement.releasePointerCapture(activePointer)
    activePointer = null
    controls.minDistance = 0.1; controls.maxDistance = 60
    controls.enabled = false
    const pose = poseFor(view)
    if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flight = null; jump(pose); applyControlLimits()
    } else flight = { from: { eye: camera.position.clone(), target: controls.target.clone() }, to: pose, startedAt: performance.now() }
  }

  function resize() {
    if (disposed) return
    const rect = host.getBoundingClientRect()
    width = Math.max(1, rect.width); height = Math.max(1, rect.height)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Place the scene in the open area left of the floating observation card.
    camera.setViewOffset(width, height, width > 950 ? 170 : 0, 0, width, height)
    camera.updateProjectionMatrix()
    if (!userMoved) flyTo(mode, true)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  function getHit(event: PointerEvent): InstrumentId | null {
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.set((event.clientX - rect.left) / width * 2 - 1, -(event.clientY - rect.top) / height * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hits = raycaster.intersectObject(instruments.group, true)
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object
      while (object) {
        const id = object.userData.instrumentId as InstrumentId | undefined
        if (id === 'screen' || id === 'rain' || id === 'wind') return id
        object = object.parent
      }
    }
    return null
  }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary) return
    pointerStart.set(event.clientX, event.clientY); pointerMoved = false
    pointerLast.copy(pointerStart); activePointer = event.pointerId
    renderer.domElement.focus({ preventScroll: true })
    if (mode === 'walk' && !flight) renderer.domElement.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent) {
    if (event.pointerId === activePointer) {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerMoved = true
      if (mode === 'walk' && !flight) {
        event.preventDefault()
        walkYaw -= (event.clientX - pointerLast.x) * 0.0033
        walkPitch = THREE.MathUtils.clamp(walkPitch - (event.clientY - pointerLast.y) * 0.0033, -1.25, 1.25)
        applyWalkDirection()
        if (pointerMoved) userMoved = true
      }
      pointerLast.set(event.clientX, event.clientY)
    }
    if (event.buttons === 0) renderer.domElement.style.cursor = getHit(event) ? 'pointer' : 'grab'
  }
  function pointerUp(event: PointerEvent) {
    if (event.button !== 0 || event.pointerId !== activePointer) return
    if (mode === 'walk' && renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
    activePointer = null
    if (!pointerMoved && !flight) { const id = getHit(event); if (id) callbacks.onSelect(id) }
  }
  function pointerCancel(event: PointerEvent) { if (event.pointerId === activePointer) activePointer = null }
  function userInteract() { flight = null; userMoved = true; applyControlLimits() }
  function keyDown(event: KeyboardEvent) {
    if (mode !== 'walk' || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) return
    event.preventDefault()
    if (flight) return
    keys.add(event.code); userMoved = true
  }
  function keyUp(event: KeyboardEvent) { keys.delete(event.code) }
  function clearKeys() { keys.clear() }
  function walkBlocked(x: number, z: number): boolean {
    // The body and the opened door both need clearance, not just the eye point.
    if (x > -3.72 && x < -2.28 && z > -0.7 && z < 0.74) return true
    if (x > -4.0 && x < -3.08 && z > 0.25 && z < 1.42) return true
    if (x > -0.43 && x < 0.75 && z > -2.43 && z < -1.48) return true
    if (Math.hypot(x - 3, z - 2) < 0.43) return true
    // Keep a walking person clear of the mast's three guy wires and the open gate.
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI / 6 + i * Math.PI * 2 / 3
      const dx = Math.sin(angle) * 1.25, dz = Math.cos(angle) * 1.25
      const t = THREE.MathUtils.clamp(((x - 3) * dx + (z - 2) * dz) / 1.5625, 0, 1)
      if (Math.hypot(x - 3 - t * dx, z - 2 - t * dz) < 0.22) return true
    }
    return x > -1.04 && x < -0.38 && z > 5.1 && z < 6.5
  }
  function moveWalk(movement: THREE.Vector3) {
    // Short substeps prevent a large wheel event from tunnelling through a wall.
    const steps = Math.max(1, Math.ceil(movement.length() / 0.065))
    const dx = movement.x / steps, dz = movement.z / steps
    for (let i = 0; i < steps; i++) {
      const x = THREE.MathUtils.clamp(camera.position.x + dx, -6.35, 6.35)
      if (!walkBlocked(x, camera.position.z)) camera.position.x = x
      const z = THREE.MathUtils.clamp(camera.position.z + dz, -4.3, 6.3)
      if (!walkBlocked(camera.position.x, z)) camera.position.z = z
    }
    camera.position.y = 1.65
    applyWalkDirection()
  }
  function wheel(event: WheelEvent) {
    if (mode !== 'walk') return
    event.preventDefault()
    if (flight) return
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1
    const distance = THREE.MathUtils.clamp(-event.deltaY * unit * 0.0025, -0.6, 0.6)
    moveWalk(vec(Math.sin(walkYaw), 0, Math.cos(walkYaw)).multiplyScalar(distance))
    userMoved = true
  }
  function walk(delta: number) {
    if (mode !== 'walk' || flight || !keys.size) return
    const forward = vec(Math.sin(walkYaw), 0, Math.cos(walkYaw))
    const right = forward.clone().cross(vec(0, 1, 0))
    const movement = vec(0, 0, 0)
    if (keys.has('KeyW') || keys.has('ArrowUp')) movement.add(forward)
    if (keys.has('KeyS') || keys.has('ArrowDown')) movement.sub(forward)
    if (keys.has('KeyD') || keys.has('ArrowRight')) movement.add(right)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) movement.sub(right)
    movement.normalize().multiplyScalar(delta * 1.8)
    moveWalk(movement)
  }
  function onLost(event: Event) {
    event.preventDefault(); lost = true
    callbacks.onError?.('三维画面暂时中断，正在等待恢复。')
  }
  function onRestored() { lost = false; ready = false }
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointermove', pointerMove)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', pointerCancel)
  renderer.domElement.addEventListener('wheel', wheel, { passive: false })
  renderer.domElement.addEventListener('keydown', keyDown)
  renderer.domElement.addEventListener('keyup', keyUp)
  renderer.domElement.addEventListener('blur', clearKeys)
  renderer.domElement.addEventListener('webglcontextlost', onLost)
  renderer.domElement.addEventListener('webglcontextrestored', onRestored)
  controls.addEventListener('start', userInteract)

  function render(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(render)
    const delta = Math.min((now - lastTime) / 1000, 0.05); lastTime = now
    if (lost || document.hidden) return
    elapsed += delta
    if (flight) {
      const progress = Math.min(1, Math.max(0, (now - flight.startedAt) / 1150))
      const t = progress * progress * (3 - 2 * progress)
      camera.position.lerpVectors(flight.from.eye, flight.to.eye, t)
      controls.target.lerpVectors(flight.from.target, flight.to.target, t)
      camera.lookAt(controls.target)
      if (progress === 1) {
        flight = null
        if (mode === 'walk') { syncWalkDirection(); applyWalkDirection() }
        applyControlLimits()
      }
    }
    walk(delta)
    if (!flight && mode !== 'walk') {
      controls.update()
      // Orbit views stay above the field; walk mode separately maintains eye height.
      if (camera.position.y < 0.12) { camera.position.y = 0.12; camera.lookAt(controls.target) }
    }
    instruments.update(weather, delta, elapsed)
    station.update(weather, delta, elapsed)
    windVisuals.update(weather, delta, elapsed, mode, camera)
    renderer.render(scene, camera)
    if (!ready) { ready = true; callbacks.onReady?.() }
    if (now - lastOverlay > 45) {
      lastOverlay = now
      callbacks.onOverlay((Object.entries(instruments.anchors) as [InstrumentId, THREE.Vector3][]).map(([id, point]) => {
        projected.copy(point).project(camera)
        return {
          id, x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height,
          visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.96 && Math.abs(projected.y) < 0.88
            && (mode === 'overview' || mode === 'walk' || mode === id),
        }
      }))
      callbacks.onActions?.((Object.entries(instruments.actionAnchors) as [InstrumentAction, THREE.Object3D][]).map(([id, anchor]) => {
        anchor.getWorldPosition(actionWorld)
        projected.copy(actionWorld).project(camera)
        const instrument = id === 'screen-door' ? 'screen' : 'rain'
        return {
          id, x: THREE.MathUtils.clamp((projected.x * 0.5 + 0.5) * width, 48, width - 48), y: (-projected.y * 0.5 + 0.5) * height,
          visible: !flight && (mode === instrument || (mode === 'walk' && camera.position.distanceTo(actionWorld) < 3.5))
            && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .88 && Math.abs(projected.y) < .8,
        }
      }))
    }
  }
  resize(); flyTo('overview', true); frame = requestAnimationFrame(render)

  return {
    setWeather(state) {
      const changeRainView = state.rainCutaway !== weather.rainCutaway
      const changeRainLevel = state.rainfall !== weather.rainfall
      weather = { ...state }
      if (mode === 'rain' && (changeRainView || (changeRainLevel && weather.rainCutaway && !userMoved))) flyTo('rain')
    },
    setView(view) { flyTo(view) },
    reset() { flyTo('overview') },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', pointerCancel)
      renderer.domElement.removeEventListener('wheel', wheel)
      renderer.domElement.removeEventListener('keydown', keyDown)
      renderer.domElement.removeEventListener('keyup', keyUp)
      renderer.domElement.removeEventListener('blur', clearKeys)
      renderer.domElement.removeEventListener('webglcontextlost', onLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored)
      controls.removeEventListener('start', userInteract); controls.dispose()
      station.dispose(); instruments.dispose(); windVisuals.dispose(); environmentMap.dispose()
      floorGeometry.dispose(); floorMaterial.dispose(); sun.shadow.dispose()
      renderer.dispose(); renderer.domElement.remove()
    },
  }
}
