import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LANDFORMS, WORLD, type LandformId } from './seafloor-data'
import { createTerrainGeometry, createCutFacesGeometry, createWaterGeometry, createWaterVolumeGeometry, terrainHeight, getLandformAnchor, landformAtPoint, trenchAxis } from './seafloor-geometry'
import { createSeafloorMaterials } from './seafloor-materials'
import { createSeafloorWater } from './seafloor-water'

export type ViewId = 'oblique' | 'section' | 'dive'
export interface OverlayItem { id: string; x: number; y: number; visible: boolean; anchorX?: number; anchorY?: number }
export interface SeafloorCallbacks {
  onOverlay?: (items: OverlayItem[]) => void
  onUserInteract?: () => void
  onDiveState?: (state: { underwater: boolean; landform: LandformId | null }) => void
}
export interface SeafloorController {
  setView(view: ViewId): void
  flyToStop(fx: number | null, durationMs: number): void
  pauseFlight(): void
  setSelected(id: LandformId | null): void
  setLabelsVisible(visible: boolean): void
  setRulerVisible(visible: boolean): void
  pick(clientX: number, clientY: number, rect: DOMRect): LandformId | null
  resize(width: number, height: number): void
  dispose(): void
}
interface Flight { elapsed: number; duration: number; fromEye: THREE.Vector3; toEye: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 }
const SURFACE = 0xf5f4ee, UNDERWATER = 0x719fa8, MAX_DPR = 1.65
const clamp = THREE.MathUtils.clamp
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function createSurveyShip(): THREE.Group {
  const group = new THREE.Group()
  const white = new THREE.MeshStandardMaterial({ color: 0xe9e7dc, roughness: 0.65 })
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x485e64, roughness: 0.7 })
  const glass = new THREE.MeshStandardMaterial({ color: 0x426470, roughness: 0.23, metalness: 0.15 })
  const deck = new THREE.MeshStandardMaterial({ color: 0x99958a, roughness: 0.85 })
  const shape = new THREE.Shape()
  shape.moveTo(-0.66, -0.19); shape.lineTo(0.42, -0.19)
  shape.quadraticCurveTo(0.82, -0.08, 0.86, 0)
  shape.quadraticCurveTo(0.82, 0.08, 0.42, 0.19)
  shape.lineTo(-0.66, 0.19); shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.025, steps: 1 })
  geo.rotateX(-Math.PI / 2)
  const hull = new THREE.Mesh(geo, hullMat); hull.position.y = -0.06; group.add(hull)
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); group.add(mesh)
  }
  box(1.08, 0.035, 0.34, -0.09, 0.14, 0, deck)
  box(0.47, 0.23, 0.27, -0.19, 0.255, 0, white)
  box(0.34, 0.12, 0.24, -0.1, 0.43, 0, white)
  box(0.37, 0.026, 0.27, -0.1, 0.5, 0, white)
  for (const z of [-0.137, 0.137]) {
    for (let x = -0.34; x < 0.03; x += 0.12) box(0.075, 0.07, 0.012, x, 0.29, z, glass)
    box(0.28, 0.07, 0.012, -0.1, 0.44, z * 0.88, glass)
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.3, 8), white)
  mast.position.set(-0.15, 0.64, 0); group.add(mast)
  box(0.22, 0.012, 0.025, -0.15, 0.73, 0, white)
  group.position.set(WORLD.length * 0.76, 0, -WORLD.width * 0.32)
  group.rotation.y = -0.18
  return group
}

export function createSeafloorScene(host: HTMLElement, callbacks: SeafloorCallbacks = {}): SeafloorController {
  const scene = new THREE.Scene(), fog = new THREE.Fog(SURFACE, 60, 140)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(37, 1, 0.008, 180)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.24
  renderer.setClearColor(SURFACE, 1)
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;'
  host.appendChild(renderer.domElement)
  let lost = false
  const onLost = (event: Event) => { event.preventDefault(); lost = true }
  const onRestored = () => { lost = false; renderer.shadowMap.needsUpdate = true }
  renderer.domElement.addEventListener('webglcontextlost', onLost)
  renderer.domElement.addEventListener('webglcontextrestored', onRestored)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = 0.09
  controls.minDistance = 2; controls.maxDistance = 60
  controls.maxPolarAngle = Math.PI * 0.82; controls.screenSpacePanning = true
  scene.add(new THREE.HemisphereLight(0xedf4f2, 0x817563, 1.65))
  const sun = new THREE.DirectionalLight(0xfff4df, 2.5)
  sun.position.set(-8, 18, 9); sun.target.position.set(13, -3, 0)
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -23, right: 23, top: 17, bottom: -17, near: 0.1, far: 70 })
  sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00006
  scene.add(sun, sun.target)
  const fill = new THREE.DirectionalLight(0xc5e1e4, 0.55); fill.position.set(28, 10, -16); scene.add(fill)
  const diveLight = new THREE.PointLight(0xc7e8eb, 0, 14, 1.3); scene.add(diveLight)
  const materials = createSeafloorMaterials()
  const terrain = new THREE.Mesh(createTerrainGeometry(), materials.terrain)
  terrain.castShadow = true; terrain.receiveShadow = true; scene.add(terrain)
  const cut = new THREE.Mesh(createCutFacesGeometry(), materials.cut); cut.receiveShadow = true; scene.add(cut)
  const ocean = createSeafloorWater(createWaterGeometry())
  const water = ocean.water
  water.renderOrder = 3; scene.add(water)
  const waterSideMaterial = new THREE.MeshPhysicalMaterial({ color: 0x147c9b, transparent: true, opacity: 0.38, roughness: 0.38, metalness: 0, depthWrite: false, side: THREE.FrontSide })
  const hiddenWaterMaterial = new THREE.MeshBasicMaterial({ visible: false })
  const waterVolume = new THREE.Mesh(createWaterVolumeGeometry(), [waterSideMaterial, hiddenWaterMaterial, hiddenWaterMaterial])
  waterVolume.renderOrder = 2; scene.add(waterVolume)
  const ship = createSurveyShip(); scene.add(ship)
  const selectedDot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), new THREE.MeshBasicMaterial({ color: 0xb66d37 }))
  selectedDot.visible = false; scene.add(selectedDot)
  let width = 1, height = 1, frameId = 0, disposed = false
  let view: ViewId = 'oblique', selected: LandformId | null = null
  let labelsVisible = true, rulerVisible = true, flight: Flight | null = null
  let underwaterMix = 0, lastTime = performance.now(), lastOverlayTime = -Infinity
  let previousUnder = false, cameraTouched = false
  const surfaceColor = new THREE.Color(SURFACE), underColor = new THREE.Color(UNDERWATER)
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()

  function anchor(id: LandformId) {
    const a = getLandformAnchor(id)
    return v(a.fx * WORLD.length, terrainHeight(a.fx, a.fz), a.fz * WORLD.width / 2)
  }
  function overviewPose(section = false) {
    const target = v(WORLD.length / 2, -4.1, 0)
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    let distance = Math.max(26 / (2 * tan * camera.aspect) * 1.26, (section ? 11.5 : 15.8) / (2 * tan))
    const direction = section ? v(0, 0.015, 1) : v(0.24, Math.SQRT1_2, Math.sqrt(0.5 - 0.24 ** 2))
    const fitCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 0.01, 180)
    // Reserve the floating dock's strip and fit all eight block corners. A
    // width-only estimate cuts off the near-left foot in perspective.
    for (let attempt = 0; attempt < 28; attempt++) {
      fitCamera.position.copy(target).addScaledVector(direction, distance)
      fitCamera.lookAt(target); fitCamera.updateMatrixWorld()
      let fits = true
      const check = (x: number, y: number, z: number) => {
        const p = v(x, y, z).project(fitCamera)
        if (Math.abs(p.x) > 0.90 || p.y > 0.88 || p.y < -0.72) fits = false
      }
      for (const x of [0, WORLD.length]) for (const z of [-6, 6]) { check(x, WORLD.bottom, z); check(x, 0, z) }
      const pos = terrain.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i += 24) check(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (fits) break
      distance *= 1.045
    }
    return { target, eye: target.clone().addScaledVector(direction, distance) }
  }
  function divePose(id: LandformId) {
    const a = getLandformAnchor(id)
    // Low eyes look along the landform. Evaluate the eye's own bed height,
    // never reuse the target depth across a steep slope.
    let fx = a.fx, fz = a.fz
    if (id === 'arc') { fx -= 0.029; fz -= 0.05 }
    if (id === 'ridge') fx += 0.014
    const tx = fx * WORLD.length, tz = clamp(fz * WORLD.width / 2, -3.7, 2.8)
    const shallow = id === 'shelf'
    const targetZ = tz - (shallow ? 0.28 : 0.5)
    const target = v(tx, terrainHeight(fx, targetZ / 6) + (shallow ? 0.035 : 0.14), targetZ)
    const baseX = tx - (shallow ? 0.35 : 0.5), ez = tz + (shallow ? 0.85 : 2.3)
    let ex = baseX, bestFloor = Infinity
    for (const dx of [0, -0.4, 0.4, -0.8, 0.8]) {
      const cx = clamp(baseX + dx, 0.2, WORLD.length - 0.2)
      const cf = terrainHeight(cx / WORLD.length, ez / 6)
      if (cf < bestFloor) { bestFloor = cf; ex = cx }
    }
    const eye = v(ex, Math.min(-0.055, bestFloor + (shallow ? 0.16 : 1.05)), ez)
    if (eye.y <= bestFloor + 0.035) eye.y = bestFloor + 0.08
    return { eye, target }
  }
  function beginFlight(eye: THREE.Vector3, target: THREE.Vector3, ms: number) {
    controls.update()
    flight = { elapsed: 0, duration: Math.max(1, ms), fromEye: camera.position.clone(), toEye: eye, fromTarget: controls.target.clone(), toTarget: target }
  }
  function applyView(ms = 1350) {
    controls.minDistance = view === 'dive' ? 0.12 : 2
    controls.maxDistance = view === 'dive' ? 18 : 60
    const pose = view === 'dive' ? divePose(selected ?? 'basin') : overviewPose(view === 'section')
    beginFlight(pose.eye, pose.target, ms)
  }
  function floorGuard() {
    const p = camera.position
    // The camera outside the block footprint is in air, not inside the edge.
    if (p.x >= 0 && p.x <= WORLD.length && Math.abs(p.z) <= WORLD.width / 2) {
      const bed = terrainHeight(p.x / WORLD.length, p.z / (WORLD.width / 2))
      p.y = Math.max(p.y, bed + (view === 'dive' ? 0.045 : 0.12))
    }
  }
  controls.addEventListener('start', () => { flight = null; cameraTouched = true; callbacks.onUserInteract?.() })
  function projected(point: THREE.Vector3) {
    const p = point.clone().project(camera)
    return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.3 && Math.abs(p.y) < 1.3 }
  }
  function pushOverlay() {
    if (!callbacks.onOverlay) return
    camera.updateMatrixWorld()
    const items: OverlayItem[] = []
    const labelItems = LANDFORMS.map((def, i) => {
      const point = anchor(def.id); point.y += 0.07
      const p = projected(point), lift = view === 'section' ? 66 : [63, 86, -15, 66, 82, 92][i]!
      return { id: 'label-' + def.id, x: clamp(p.x, 82, width - 82), y: clamp(p.y - lift, 42, height - 135), anchorX: p.x, anchorY: p.y, visible: labelsVisible && p.visible && (view !== 'dive' || selected === def.id) }
    })
    const continent = projected(v(2.2, terrainHeight(2.2 / 26, 0.55) + 0.08, 3.3))
    labelItems.push({ id: 'label-continent', x: continent.x, y: continent.y - 52, anchorX: continent.x, anchorY: continent.y, visible: labelsVisible && view !== 'dive' && continent.visible })
    const visible = labelItems.filter(item => item.visible).sort((a, b) => a.x - b.x)
    for (let i = 1; i < visible.length; i++) {
      const left = visible[i - 1]!, right = visible[i]!
      if (right.x - left.x < 125 && Math.abs(right.y - left.y) < 50) right.y = Math.max(35, left.y - 62)
    }
    items.push(...labelItems)
    const trenchFrontX = trenchAxis(1)
    const front = projected(v(trenchFrontX * WORLD.length, terrainHeight(trenchFrontX, 1) + 0.65, WORLD.width / 2 + 0.06))
    items.push({ id: 'label-trench-section', ...front, visible: labelsVisible && view !== 'dive' && camera.position.z > WORLD.width / 2 && front.visible })
    callbacks.onOverlay(items)
  }
  function frame(now: number) {
    if (disposed) return
    frameId = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now
    if (lost || width < 2 || height < 2) return
    if (flight) {
      flight.elapsed += dt * 1000
      const t = Math.min(1, flight.elapsed / flight.duration), k = t * t * (3 - 2 * t)
      camera.position.lerpVectors(flight.fromEye, flight.toEye, k)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k)
      if (t === 1) flight = null
    }
    controls.update(); floorGuard()
    controls.target.x = clamp(controls.target.x, -1, WORLD.length + 1)
    controls.target.y = clamp(controls.target.y, WORLD.bottom + 0.1, 3)
    controls.target.z = clamp(controls.target.z, -6.8, 6.8)
    camera.lookAt(controls.target)
    const under = camera.position.y < -0.025 && camera.position.x > WORLD.length * WORLD.shoreFx && camera.position.x < WORLD.length && Math.abs(camera.position.z) < 6.1
    underwaterMix += ((under ? 1 : 0) - underwaterMix) * Math.min(1, dt * 4)
    fog.color.copy(surfaceColor).lerp(underColor, underwaterMix)
    fog.near = THREE.MathUtils.lerp(60, 2.5, underwaterMix); fog.far = THREE.MathUtils.lerp(140, 24, underwaterMix)
    renderer.setClearColor(fog.color, 1)
    ocean.update(dt, underwaterMix)
    waterSideMaterial.opacity = THREE.MathUtils.lerp(0.38, 0.12, underwaterMix)
    materials.terrain.color.setRGB(1 - underwaterMix * 0.24, 1 - underwaterMix * 0.07, 1)
    diveLight.position.copy(camera.position); diveLight.intensity = underwaterMix * 1.1
    selectedDot.visible = selected !== null && view !== 'dive'; ship.visible = underwaterMix < 0.8
    if (under !== previousUnder) { previousUnder = under; callbacks.onDiveState?.({ underwater: under, landform: selected }) }
    renderer.render(scene, camera)
    if (now - lastOverlayTime > 32) { lastOverlayTime = now; pushOverlay() }
  }
  function resize(w: number, h: number) {
    if (disposed || w < 1 || h < 1) return
    width = Math.round(w); height = Math.round(h)
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix()
    if (!cameraTouched && view !== 'dive' && !selected) {
      const pose = overviewPose(view === 'section'); camera.position.copy(pose.eye); controls.target.copy(pose.target)
      flight = null; controls.update()
    }
    renderer.render(scene, camera); pushOverlay()
  }
  const initial = overviewPose(); camera.position.copy(initial.eye); controls.target.copy(initial.target); controls.update()
  const rect = host.getBoundingClientRect(); resize(rect.width, rect.height)
  frameId = requestAnimationFrame(frame)
  return {
    setView(next) { if (disposed) return; view = next; cameraTouched = false; applyView() },
    pauseFlight() { flight = null },
    flyToStop(fx, durationMs) {
      if (disposed) return
      if (fx === null) { const pose = overviewPose(view === 'section'); beginFlight(pose.eye, pose.target, durationMs); return }
      const def = LANDFORMS.reduce((a, b) => Math.abs(a.anchorFx - fx) < Math.abs(b.anchorFx - fx) ? a : b)
      if (view === 'section') return
      if (view === 'dive') { const pose = divePose(def.id); beginFlight(pose.eye, pose.target, durationMs); return }
      const target = anchor(def.id); target.y -= 0.2
      beginFlight(target.clone().add(v(-2.5, 8.3, 12)), target, durationMs)
    },
    setSelected(id) {
      if (disposed) return; selected = id
      if (id) { const p = anchor(id); p.y += 0.11; selectedDot.position.copy(p) }
      if (view === 'dive') applyView(1100)
    },
    setLabelsVisible(visible) { labelsVisible = visible; pushOverlay() },
    setRulerVisible(visible) { rulerVisible = visible; pushOverlay() },
    pick(clientX, clientY, rect) {
      if (disposed || rect.width < 1 || rect.height < 1) return null
      pointer.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(terrain, false)[0]
      return hit ? landformAtPoint(hit.point.x / WORLD.length, hit.point.z / (WORLD.width / 2)) : null
    },
    resize,
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(frameId); controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', onLost); renderer.domElement.removeEventListener('webglcontextrestored', onRestored)
      const geometries = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>()
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => mats.add(m)) })
      geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); materials.dispose(); ocean.dispose()
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
