import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildCampusModel } from './campus-3d-model'
import { builderItemToFeature, CAMPUS_RADIUS, GRID_METRES, type BuilderItem, type BuilderPoint } from './campus-builder-data'

export type BuilderViewState = {
  compassAngle: number
  scalePixels: number
  scaleMetres: number
  scaleValid: boolean
  view: 'perspective' | 'plan'
}
export type BuilderArtworkCapture = {
  canvas: HTMLCanvasElement
  view: BuilderViewState
  viewportWidth: number
  viewportHeight: number
}
type Interaction = 'select' | 'place' | 'line' | 'measure' | 'move'
export type BuilderTourState = { active: boolean; label: string; index: number; total: number; finished: boolean }
type BuilderSceneCallbacks = {
  onGroundClick: (point: BuilderPoint) => void
  onSelect: (id: number | null) => void
  onHover?: (point: BuilderPoint | null) => void
  onViewChange?: (state: BuilderViewState) => void
  onTourChange?: (state: BuilderTourState) => void
  onError: (message: string) => void
}
export type BuilderSceneHandle = {
  setItems: (items: readonly BuilderItem[]) => void
  setInteraction: (mode: Interaction) => void
  setSelected: (id: number | null) => void
  setConflicts: (ids: readonly number[]) => void
  setDraft: (points: readonly BuilderPoint[]) => void
  setMeasure: (points: readonly BuilderPoint[]) => void
  setGhost: (item: BuilderItem | null) => void
  setGrid: (visible: boolean) => void
  setGroundRuler: (visible: boolean) => void
  setActive: (active: boolean) => void
  showOverview: () => void
  showPlan: () => void
  startTour: () => void
  stopTour: () => void
  zoomBy: (factor: number) => void
  captureArtwork: () => BuilderArtworkCapture
  resize: () => void
  dispose: () => void
}

type CachedModel = ReturnType<typeof buildCampusModel> & { key: string; item: BuilderItem }
export type CampusTourSubject = { id: number; kind: string; name: string; center: BuilderPoint; radius: number; height: number }
export type CampusTourShot = { label: string; duration: number; cameraPath: THREE.CatmullRomCurve3; targetPath: THREE.CatmullRomCurve3 }

/** Pure path planning in the unchanged metre frame; the sampler enforces a roof-clear safety floor. */
export function createCampusTourShots(subjects: readonly CampusTourSubject[], initialCamera: THREE.Vector3, initialTarget: THREE.Vector3, radius = CAMPUS_RADIUS) {
  const highestRoof = Math.max(0, ...subjects.map(subject => subject.height))
  const minimumHeight = Math.max(24, highestRoof + 8)
  const shots: CampusTourShot[] = []
  let previousCamera = initialCamera.clone(); previousCamera.y = Math.max(previousCamera.y, minimumHeight)
  let previousTarget = initialTarget.clone()
  const pointAt = (center: BuilderPoint, angle: number, distance: number, height: number) => new THREE.Vector3(center.x + Math.sin(angle) * distance, Math.max(minimumHeight, height), center.z + Math.cos(angle) * distance)
  function shot(label: string, duration: number, cameraPoints: THREE.Vector3[], target: THREE.Vector3) {
    shots.push({
      label, duration,
      cameraPath: new THREE.CatmullRomCurve3([previousCamera.clone(), ...cameraPoints.map(point => point.clone())], false, 'centripetal'),
      targetPath: new THREE.CatmullRomCurve3([previousTarget.clone(), previousTarget.clone().lerp(target, 0.4), target.clone(), target.clone()], false, 'centripetal'),
    })
    previousCamera = cameraPoints[cameraPoints.length - 1]!.clone()
    previousTarget = target.clone()
  }
  shot('序章 · 飞越我们的校园', 6, [pointAt({ x: 0, z: 0 }, 0.5, radius * 1.7, radius * 1.9), pointAt({ x: 0, z: 0 }, 0.23, radius * 1.3, radius * 1.05)], new THREE.Vector3(0, 3, 0))
  const priorities = ['campus-gate', 'teaching-building', 'library', 'sports-field', 'campus-water', 'plaza', 'laboratory', 'dormitory', 'gymnasium', 'administration', 'canteen', 'basketball-court', 'infirmary']
  const candidates = subjects.filter(subject => priorities.includes(subject.kind)).sort((a, b) => a.id - b.id)
  // Reserve shots for distinct places before showing repeated buildings, so scenery added late is included.
  const representatives = priorities.map(kind => candidates.find(subject => subject.kind === kind)).filter((subject): subject is CampusTourSubject => !!subject)
  const representativeIds = new Set(representatives.map(subject => subject.id))
  const ordered = [...representatives, ...candidates.filter(subject => !representativeIds.has(subject.id))].slice(0, 10)
  if (ordered.length) {
    ordered.forEach((subject, index) => {
      const isGate = subject.kind === 'campus-gate'
      const landscape = ['campus-water', 'sports-field', 'basketball-court', 'plaza'].includes(subject.kind)
      const distance = THREE.MathUtils.clamp(subject.radius * (landscape ? 2.4 : 2.2) + 22, 38, radius * 0.8)
      const angle = Math.atan2(subject.center.x, subject.center.z) + (index % 2 ? 0.55 : -0.45)
      const altitude = Math.max(minimumHeight, subject.height + Math.max(18, subject.radius * (landscape ? 1.2 : 0.7)))
      shot(`${isGate ? '迎入校园' : landscape ? '掠过风景' : '建筑巡礼'} · ${subject.name}`, isGate ? 5 : 5.5, [
        pointAt(subject.center, angle - 0.7, distance * 1.35, altitude + 16),
        pointAt(subject.center, angle - 0.2, distance, altitude),
        pointAt(subject.center, angle + 0.5, distance * 0.9, altitude + (index % 2 ? 9 : 3)),
      ], new THREE.Vector3(subject.center.x, landscape ? 0.5 : subject.height * 0.42, subject.center.z))
    })
  } else {
    shot('环绕 · 400 米的校园想象', 6, [pointAt({ x: 0, z: 0 }, 0.9, radius * 1.2, radius * 0.72), pointAt({ x: 0, z: 0 }, 1.7, radius * 1.4, radius * 0.88), pointAt({ x: 0, z: 0 }, 2.4, radius * 1.3, radius)], new THREE.Vector3(0, 0, 0))
  }
  shot('终章 · 升空，望见完整校园', 6, [pointAt({ x: 0, z: 0 }, -0.55, radius * 0.9, radius * 0.9), pointAt({ x: 0, z: 0 }, -0.3, radius * 1.35, radius * 1.7), pointAt({ x: 0, z: 0 }, 0, radius * 1.6, radius * 2.1)], new THREE.Vector3(0, 0, 0))
  return { shots, minimumHeight }
}

export function sampleCampusTourShot(shot: CampusTourShot, progress: number, minimumHeight: number) {
  const t = THREE.MathUtils.clamp(progress, 0, 1)
  const eased = t * t * t * (t * (t * 6 - 15) + 10)
  const position = shot.cameraPath.getPoint(eased)
  position.y = Math.max(minimumHeight, position.y)
  return { position, target: shot.targetPath.getPoint(eased) }
}

type TapPointer = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'button' | 'pointerType'>

/** A multi-touch gesture remains ineligible for placement until every finger has lifted. */
export function createBuilderTapTracker() {
  const pointers = new Set<number>()
  let candidate: { id: number; x: number; y: number; threshold: number } | null = null
  let blocked = false
  function invalidate() { candidate = null; blocked = pointers.size > 0 }
  return {
    down(event: TapPointer, canStartTap = true) {
      pointers.add(event.pointerId)
      if (!canStartTap || blocked || pointers.size !== 1 || event.button !== 0) { invalidate(); return }
      candidate = { id: event.pointerId, x: event.clientX, y: event.clientY, threshold: event.pointerType === 'touch' ? 8 : 5 }
    },
    move(event: TapPointer) {
      if (candidate?.id === event.pointerId && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > candidate.threshold) invalidate()
    },
    up(event: TapPointer) {
      if (!pointers.has(event.pointerId)) return false
      const tapped = !!candidate && candidate.id === event.pointerId && !blocked && pointers.size === 1 && event.button === 0
        && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) <= candidate.threshold
      pointers.delete(event.pointerId)
      candidate = null
      blocked = pointers.size > 0
      return tapped
    },
    cancel(pointerId: number) {
      if (!pointers.has(pointerId)) return
      pointers.delete(pointerId); invalidate()
    },
    invalidate,
    reset() { pointers.clear(); candidate = null; blocked = false },
  }
}

type BuilderViewport = { width: number; height: number; pixelRatio: number }

/** Coalesce observer notifications without touching the currently displayed drawing buffer. */
export function createBuilderViewportQueue() {
  let pending: BuilderViewport | null = null
  let applied: BuilderViewport | null = null
  const same = (a: BuilderViewport | null, b: BuilderViewport | null) => !!a && !!b
    && a.width === b.width && a.height === b.height && a.pixelRatio === b.pixelRatio
  return {
    queue(width: number, height: number, pixelRatio: number) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
        pending = null
        return false
      }
      const next = {
        width: Math.floor(width), height: Math.floor(height),
        pixelRatio: Math.min(1.75, Math.max(0.5, Math.round((Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1) * 100) / 100)),
      }
      if (same(next, applied)) { pending = null; return false }
      const changed = !same(next, pending)
      pending = next
      return changed
    },
    peek() { return pending },
    take() {
      const next = pending
      if (next) { applied = next; pending = null }
      return next
    },
  }
}
const up = new THREE.Vector3(0, 1, 0)
const groundPlane = new THREE.Plane(up, 0)
const directions = [
  { label: '北 N', angle: 0 }, { label: '东北', angle: 45 },
  { label: '东 E', angle: 90 }, { label: '东南', angle: 135 },
  { label: '南 S', angle: 180 }, { label: '西南', angle: 225 },
  { label: '西 W', angle: 270 }, { label: '西北', angle: 315 },
]

function releaseObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root.traverse(object => {
    const drawable = object as THREE.Mesh
    if (drawable.geometry) geometries.add(drawable.geometry)
    for (const material of drawable.material ? (Array.isArray(drawable.material) ? drawable.material : [drawable.material]) : []) {
      materials.add(material)
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value) })
      if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach(uniform => {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value)
      })
    }
  })
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
  geometries.forEach(geometry => geometry.dispose())
  root.removeFromParent()
  root.clear()
}

function label(text: string, position: THREE.Vector3, width: number, color = '#245c53', background = '#fffcf0'): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(800, Math.max(188, 38 + text.length * 62)); canvas.height = 112
  const context = canvas.getContext('2d')!
  context.fillStyle = background
  context.beginPath(); context.roundRect(4, 4, canvas.width - 8, 104, 22); context.fill()
  context.fillStyle = color
  context.font = '700 62px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'; context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, 60, canvas.width - 30)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, toneMapped: false }))
  sprite.position.copy(position)
  sprite.scale.set(width, width * canvas.height / canvas.width, 1)
  sprite.userData.labelAspect = canvas.width / canvas.height
  sprite.userData.baseLabelHeight = width * canvas.height / canvas.width
  sprite.userData.minimumPixelHeight = 26
  sprite.renderOrder = 30
  sprite.raycast = () => {}
  return sprite
}

function stroke(points: readonly BuilderPoint[], color: number, y: number, radius = 0.25, overlay = false) {
  const group = new THREE.Group()
  const material = new THREE.MeshBasicMaterial({ color, depthTest: !overlay, depthWrite: !overlay })
  const direction = new THREE.Vector3()
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!, b = points[index]!
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    if (!Number.isFinite(length) || length < 1e-5) continue
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 5), material)
    mesh.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2)
    direction.set(b.x - a.x, 0, b.z - a.z).normalize()
    mesh.quaternion.setFromUnitVectors(up, direction)
    mesh.renderOrder = overlay ? 21 : 1
    mesh.raycast = () => {}
    group.add(mesh)
  }
  if (!group.children.length) material.dispose()
  return group
}

/** The entire scene is a fixed local metric frame: one unit = one metre, east +X, north -Z. */
export function createCampusBuilderScene(host: HTMLElement, callbacks: BuilderSceneCallbacks): BuilderSceneHandle {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dce9e4')
  const perspective = new THREE.PerspectiveCamera(40, 1, 0.5, 3000)
  const plan = new THREE.OrthographicCamera(-230, 230, 230, -230, 0.5, 1600)
  plan.up.set(0, 0, -1)
  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspective
  let view: BuilderViewState['view'] = 'perspective'
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }) }
  catch (error) { callbacks.onError('浏览器暂时无法创建 3D 画布，请检查硬件加速后重试。'); throw error }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;'
  renderer.domElement.setAttribute('aria-label', '可交互的米制校园沙盘，东为 X 正向，北为 Z 负向')
  renderer.domElement.tabIndex = 0
  host.appendChild(renderer.domElement)
  let controls: OrbitControls
  const objects = new THREE.Group()
  objects.name = '米制校园地物'
  scene.add(objects)
  const cache = new Map<number, CachedModel>()
  let selected: number | null = null
  let conflictIds = new Set<number>()
  let selection = new THREE.Group(), conflicts = new THREE.Group(), draft = new THREE.Group(), measurement = new THREE.Group()
  scene.add(selection, conflicts, draft, measurement)
  let ghost: CachedModel | null = null
  let mode: Interaction = 'select'
  let active = true, disposed = false, contextLost = false
  let frame = 0, elapsed = 0, lastTime = 0, lastViewKey = ''
  let tour: { shots: CampusTourShot[]; minimumHeight: number; index: number; startedAt: number } | null = null
  let lastTourViewUpdate = 0
  let preferredGridVisible = true, preferredGroundRulerVisible = true
  let width = 1, height = 1
  let surfaceVisible = false
  const viewportQueue = createBuilderViewportQueue()
  const screenLabels = new Set<THREE.Sprite>()
  const labelPosition = new THREE.Vector3()
  function screenLabel(...args: Parameters<typeof label>) {
    const sprite = label(...args)
    screenLabels.add(sprite)
    return sprite
  }
  function release(root: THREE.Object3D) {
    root.traverse(object => { if (object instanceof THREE.Sprite) screenLabels.delete(object) })
    releaseObject(root)
  }
  function updateLabels() {
    camera.updateMatrixWorld()
    for (const sprite of screenLabels) {
      sprite.getWorldPosition(labelPosition).applyMatrix4(camera.matrixWorldInverse)
      const metresPerPixel = camera instanceof THREE.OrthographicCamera
        ? (camera.top - camera.bottom) / camera.zoom / height
        : 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1, -labelPosition.z) / height
      const labelHeight = Math.max(sprite.userData.baseLabelHeight as number, (sprite.userData.minimumPixelHeight as number) * metresPerPixel)
      sprite.scale.set(labelHeight * (sprite.userData.labelAspect as number), labelHeight, 1)
    }
  }
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const tapTracker = createBuilderTapTracker()

  scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x8b9d70, 2.4))
  const sunlight = new THREE.DirectionalLight(0xfff0d3, 3.1)
  sunlight.position.set(-160, 340, 180)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -230; sunlight.shadow.camera.right = 230
  sunlight.shadow.camera.top = 230; sunlight.shadow.camera.bottom = -230
  sunlight.shadow.camera.near = 5; sunlight.shadow.camera.far = 800
  sunlight.shadow.normalBias = 0.22
  sunlight.shadow.bias = -0.0001
  scene.add(sunlight)
  const base = new THREE.Group()
  base.name = '固定直径 400 米草地底座'
  for (const tier of [
    { top: CAMPUS_RADIUS - 0.5, bottom: CAMPUS_RADIUS - 2, depth: 4, y: -2.4, color: 0xcdb493 },
    { top: CAMPUS_RADIUS, bottom: CAMPUS_RADIUS, depth: 0.5, y: -0.25, color: 0x9cbc7c },
  ]) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(tier.top, tier.bottom, tier.depth, 128), new THREE.MeshStandardMaterial({ color: tier.color, roughness: 0.92 }))
    mesh.position.y = tier.y; mesh.receiveShadow = true
    base.add(mesh)
  }
  const edge = Array.from({ length: 129 }, (_, index) => ({ x: Math.cos(index / 128 * Math.PI * 2) * (CAMPUS_RADIUS - 0.8), z: Math.sin(index / 128 * Math.PI * 2) * (CAMPUS_RADIUS - 0.8) }))
  base.add(stroke(edge, 0xf8efcc, 0.07, 0.36))
  scene.add(base)
  const grid = new THREE.Group()
  grid.name = '每格 10 米，每 50 米加重'
  for (const major of [false, true]) {
    const positions: number[] = []
    for (let offset = -CAMPUS_RADIUS + GRID_METRES; offset < CAMPUS_RADIUS; offset += GRID_METRES) {
      if ((Math.abs(offset % 50) < 1e-6) !== major) continue
      const extent = Math.sqrt(CAMPUS_RADIUS ** 2 - offset ** 2)
      positions.push(offset, 0.045, -extent, offset, 0.045, extent, -extent, 0.045, offset, extent, 0.045, offset)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({ color: major ? 0x628d61 : 0x7fa16a, transparent: true, opacity: major ? 0.65 : 0.4 })
    const lines = new THREE.LineSegments(geometry, material)
    lines.raycast = () => {}
    grid.add(lines)
  }
  scene.add(grid)
  const worldGuides = new THREE.Group()
  worldGuides.name = '世界方位与真实米制标尺'
  for (const direction of directions) {
    const radians = THREE.MathUtils.degToRad(direction.angle)
    const x = Math.sin(radians), z = -Math.cos(radians)
    worldGuides.add(screenLabel(direction.label, new THREE.Vector3(x * (CAMPUS_RADIUS + 14), 0.4, z * (CAMPUS_RADIUS + 14)), direction.angle % 90 ? 23 : 28, direction.angle === 0 ? '#b45239' : '#295a51'))
    worldGuides.add(stroke([{ x: x * (CAMPUS_RADIUS - 5), z: z * (CAMPUS_RADIUS - 5) }, { x: x * CAMPUS_RADIUS, z: z * CAMPUS_RADIUS }], direction.angle === 0 ? 0xb75a40 : 0xfff3d1, 0.18, 0.5))
  }
  // The endpoints are exactly 400 metres apart, independently of campus contents.
  const groundRuler = new THREE.Group()
  groundRuler.name = '可切换的草地距离尺'
  groundRuler.add(stroke([{ x: -CAMPUS_RADIUS, z: 0 }, { x: CAMPUS_RADIUS, z: 0 }], 0xe6e8c1, 0.08, 0.18))
  for (const x of [-CAMPUS_RADIUS, CAMPUS_RADIUS]) groundRuler.add(stroke([{ x, z: -4 }, { x, z: 4 }], 0xfff3d1, 0.12, 0.6))
  const rulerZ = 151
  groundRuler.add(stroke([{ x: -50, z: rulerZ }, { x: 50, z: rulerZ }], 0x355e48, 0.1, 0.44))
  for (const [x, text] of [[-50, '0'], [0, '50 m'], [50, '100 m']] as const) {
    groundRuler.add(stroke([{ x, z: rulerZ - 2.6 }, { x, z: rulerZ + 2.6 }], 0x355e48, 0.1, 0.35))
    groundRuler.add(screenLabel(text, new THREE.Vector3(x, 0.4, rulerZ + 8), 18))
  }
  scene.add(worldGuides, groundRuler)

  function setupControls() {
    controls?.dispose()
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.09
    controls.screenSpacePanning = false
    controls.minDistance = 45; controls.maxDistance = 1300
    controls.minZoom = 0.65; controls.maxZoom = 8
    controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI * 0.43
    if (view === 'plan') {
      controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI
      controls.screenSpacePanning = true
    }
    controls.enabled = active
    updateInteraction()
    controls.addEventListener('change', publishView)
  }

  function updateInteraction() {
    if (!controls) return
    controls.enableRotate = view === 'perspective'
    controls.mouseButtons.LEFT = mode === 'select' ? (view === 'plan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE) : null
    controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN
    controls.touches.ONE = mode === 'select' ? (view === 'plan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE) : null
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN
    renderer.domElement.style.cursor = mode === 'select' ? 'grab' : 'crosshair'
  }

  function hitGround(ndc: THREE.Vector2): THREE.Vector3 | null {
    camera.updateMatrixWorld()
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())
  }

  function pointAt(event: PointerEvent): BuilderPoint | null {
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    const point = hitGround(mouse)
    return point && Number.isFinite(point.x) && Number.isFinite(point.z) ? { x: point.x, z: point.z } : null
  }

  function readView(): BuilderViewState {
    const center = hitGround(new THREE.Vector2(0, 0))
    const right = hitGround(new THREE.Vector2(200 / width, 0))
    const metresPerPixel = center && right ? center.distanceTo(right) / 100 : 0
    const scaleValid = metresPerPixel > 0 && Number.isFinite(metresPerPixel) && !!center && Math.hypot(center.x, center.z) <= CAMPUS_RADIUS * 1.6
    const desiredMetres = metresPerPixel * 100
    const candidates = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
    const fitting = candidates.filter(value => value <= desiredMetres)
    const scaleMetres = fitting[fitting.length - 1] ?? 1
    // A compass represents horizontal heading; perspective foreshortening must not distort its eight equal sectors.
    const compassAngle = view === 'plan' ? 0 : THREE.MathUtils.radToDeg(Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z))
    return { compassAngle: Math.round(compassAngle * 10) / 10, scalePixels: scaleValid ? scaleMetres / metresPerPixel : 0, scaleMetres, scaleValid, view }
  }

  function publishView() {
    if (disposed || !width || !height || !controls) return
    const state = readView()
    const key = JSON.stringify({ ...state, scalePixels: Math.round(state.scalePixels * 10) / 10 })
    if (key !== lastViewKey) { lastViewKey = key; callbacks.onViewChange?.(state) }
  }

  function resize() {
    if (disposed) return
    const nextWidth = host.clientWidth, nextHeight = host.clientHeight
    surfaceVisible = nextWidth > 0 && nextHeight > 0
    if (viewportQueue.queue(nextWidth, nextHeight, window.devicePixelRatio) || !surfaceVisible) tapTracker.invalidate()
  }

  function applyPendingViewport() {
    const viewport = viewportQueue.take()
    if (!viewport) return false
    width = viewport.width; height = viewport.height
    perspective.aspect = width / height; perspective.updateProjectionMatrix()
    const halfHeight = 242 * Math.max(1, height / width)
    plan.left = -halfHeight * width / height; plan.right = halfHeight * width / height
    plan.top = halfHeight; plan.bottom = -halfHeight; plan.updateProjectionMatrix()
    // One buffer allocation and its render stay in the same task; no cleared canvas is exposed between frames.
    renderer.setDrawingBufferSize(width, height, viewport.pixelRatio)
    return true
  }

  function drawFrame() {
    if (disposed || !active || contextLost || document.hidden || !surfaceVisible) return
    const resized = applyPendingViewport()
    updateLabels()
    renderer.render(scene, camera)
    if (resized) publishView()
  }

  function captureArtwork(): BuilderArtworkCapture {
    if (disposed || !active || contextLost || document.hidden) throw new Error('请在校园场景显示时再导出作品。')
    resize()
    if (!surfaceVisible) throw new Error('校园画布暂不可见，请展开场景后重试。')
    applyPendingViewport()
    const artwork = host.ownerDocument.createElement('canvas')
    artwork.width = renderer.domElement.width; artwork.height = renderer.domElement.height
    const context = artwork.getContext('2d')
    if (!context) throw new Error('浏览器暂时无法生成作品图片，请稍后重试。')
    const decorations = [selection, conflicts, draft, measurement, ...(ghost ? [ghost.group] : [])]
    const visibility = decorations.map(object => object.visible)
    try {
      decorations.forEach(object => { object.visible = false })
      updateLabels()
      const capturedView = readView()
      renderer.render(scene, camera)
      // Copy in this same synchronous task: the WebGL buffer need not be preserved between frames.
      context.drawImage(renderer.domElement, 0, 0)
      return { canvas: artwork, view: capturedView, viewportWidth: width, viewportHeight: height }
    } finally {
      decorations.forEach((object, index) => { object.visible = visibility[index]! })
      drawFrame()
      publishView()
    }
  }

  function onVisibilityChange() {
    lastTime = 0
    if (active && !document.hidden && !contextLost) { resize(); drawFrame() }
  }

  function showOverview() {
    if (disposed) return
    tapTracker.invalidate()
    stopTour()
    camera = perspective; view = 'perspective'
    const viewport = viewportQueue.peek()
    const aspect = viewport ? viewport.width / viewport.height : perspective.aspect
    const halfFov = Math.min(THREE.MathUtils.degToRad(perspective.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2)) * aspect))
    const distance = 238 / Math.sin(halfFov)
    perspective.up.set(0, 1, 0)
    perspective.position.set(0.45, 0.94, 1).normalize().multiplyScalar(distance)
    setupControls(); controls.target.set(0, 0, 0); controls.update(); publishView()
  }

  function showPlan() {
    if (disposed) return
    tapTracker.invalidate()
    stopTour()
    camera = plan; view = 'plan'
    plan.up.set(0, 0, -1); plan.position.set(0, 650, 0); plan.zoom = 1
    plan.lookAt(0, 0, 0); plan.updateProjectionMatrix()
    setupControls(); controls.target.set(0, 0, 0); controls.update(); publishView()
  }

  function selectionOutline() {
    release(selection)
    selection = new THREE.Group()
    if (selected !== null) {
      const model = cache.get(selected)
      if (model) {
        model.group.updateMatrixWorld(true)
        // Sprites are intentionally excluded: selection hugs the authored ground footprint and roof.
        const box = new THREE.Box3()
        model.group.traverse(object => {
          if (object instanceof THREE.Mesh) box.expandByObject(object)
        })
        if (!box.isEmpty()) {
          box.expandByScalar(0.8)
          const helper = new THREE.Box3Helper(box, 0xf4be47)
          const material = helper.material as THREE.LineBasicMaterial
          material.depthTest = false; material.depthWrite = false
          helper.renderOrder = 25; helper.raycast = () => {}
          selection.add(helper)
          selection.add(stroke([{ x: box.min.x, z: box.min.z }, { x: box.max.x, z: box.min.z }, { x: box.max.x, z: box.max.z }, { x: box.min.x, z: box.max.z }, { x: box.min.x, z: box.min.z }], 0xffda70, 0.8, 0.32, true))
        }
      }
    }
    scene.add(selection)
  }

  function conflictOutlines() {
    release(conflicts)
    conflicts = new THREE.Group()
    conflicts.name = '布局重叠提醒'
    conflicts.visible = !tour
    for (const id of conflictIds) {
      const item = cache.get(id)?.item
      if (!item) continue
      const feature = builderItemToFeature(item)
      const isLine = ['campus-road', 'footpath', 'campus-fence'].includes(item.kind)
      const outlines: BuilderPoint[][] = []
      if (isLine) {
        for (let index = 1; index < feature.points.length; index++) {
          const a = feature.points[index - 1]!, b = feature.points[index]!
          const length = Math.hypot(b.x - a.x, b.z - a.z)
          if (length < 1e-5) continue
          const offsetX = -(b.z - a.z) / length * (item.width / 2 + 0.4)
          const offsetZ = (b.x - a.x) / length * (item.width / 2 + 0.4)
          outlines.push([
            { x: a.x + offsetX, z: a.z + offsetZ }, { x: b.x + offsetX, z: b.z + offsetZ },
            { x: b.x - offsetX, z: b.z - offsetZ }, { x: a.x - offsetX, z: a.z - offsetZ },
          ])
        }
      } else if (item.kind === 'tree') {
        const angle = THREE.MathUtils.degToRad(item.rotation), sine = Math.sin(angle), cosine = Math.cos(angle)
        outlines.push(Array.from({ length: 32 }, (_, index) => {
          const x = Math.cos(index / 32 * Math.PI * 2) * item.width / 2
          const z = Math.sin(index / 32 * Math.PI * 2) * item.depth / 2
          return { x: item.x + x * cosine + z * sine, z: item.z - x * sine + z * cosine }
        }))
      } else if (feature.points.length >= 3) outlines.push(feature.points)
      for (const outline of outlines) {
        const border = stroke([...outline, outline[0]!], 0xf06442, 0.5, 0.48, true)
        border.name = `重叠地物-${id}`
        border.traverse(object => { object.renderOrder = 24; object.raycast = () => {} })
        conflicts.add(border)
      }
    }
    scene.add(conflicts)
  }

  function setConflicts(ids: readonly number[]) {
    if (disposed) return
    const next = new Set(ids)
    if (next.size === conflictIds.size && [...next].every(id => conflictIds.has(id))) return
    conflictIds = next
    conflictOutlines()
  }

  function modelFor(item: BuilderItem, isGhost = false): CachedModel {
    const feature = builderItemToFeature({ ...item, x: 0, z: 0, rotation: 0 })
    const model = buildCampusModel({ origin: { lat: 0, lng: 0 }, metresPerUnit: 1, radius: CAMPUS_RADIUS, features: [feature] }, { includeBase: false, includeLabels: false, roadWidth: item.width, fenceWidth: item.width })
    const body = model.group
    // The point-style models have authored metre dimensions; honour the builder's footprint fields.
    if (['tree', 'campus-gate', 'bus-stop'].includes(item.kind)) {
      const extent = new THREE.Box3().setFromObject(body)
      const size = extent.getSize(new THREE.Vector3()), center = extent.getCenter(new THREE.Vector3())
      body.scale.set(item.width / Math.max(size.x, 0.01), 1, item.depth / Math.max(size.z, 0.01))
      body.position.set(-center.x * body.scale.x, 0, -center.z * body.scale.z)
    }
    const group = new THREE.Group()
    group.add(body)
    if (!isGhost && !['campus-road', 'footpath'].includes(item.kind)) {
      const extent = new THREE.Box3().setFromObject(body)
      const nameLabel = screenLabel(item.name, new THREE.Vector3(feature.center.x, Math.max(7, extent.max.y + 6), feature.center.z), THREE.MathUtils.clamp(Math.sqrt(item.width * item.depth) * 0.7, 12, 23))
      nameLabel.center.set(0.5, 0)
      nameLabel.userData.minimumPixelHeight = 22
      group.add(nameLabel)
    }
    group.position.set(item.x, 0, item.z)
    group.rotation.y = THREE.MathUtils.degToRad(item.rotation)
    group.name = `${isGhost ? '放置预览' : '校园地物'}-${item.id}`
    group.userData.builderItemId = item.id
    if (isGhost) {
      const oldMaterials = new Set<THREE.Material>(), oldTextures = new Set<THREE.Texture>()
      const translucent = new THREE.MeshBasicMaterial({ color: 0x34b8ac, transparent: true, opacity: 0.38, depthWrite: false })
      group.traverse(object => {
        object.raycast = () => {}
        if (object instanceof THREE.Mesh) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            oldMaterials.add(material)
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) oldTextures.add(value) })
            if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach(uniform => { if (uniform.value instanceof THREE.Texture) oldTextures.add(uniform.value) })
          }
          object.material = translucent; object.castShadow = false; object.receiveShadow = false
        }
      })
      oldTextures.forEach(texture => texture.dispose()); oldMaterials.forEach(material => material.dispose())
    }
    return { ...model, group, key: JSON.stringify(item), item }
  }

  function setItems(items: readonly BuilderItem[]) {
    if (disposed) return
    stopTour()
    const ids = new Set(items.map(item => item.id))
    for (const [id, model] of cache) if (!ids.has(id)) { release(model.group); cache.delete(id) }
    for (const item of items) {
      if (cache.get(item.id)?.key === JSON.stringify(item)) continue
      const old = cache.get(item.id)
      if (old) release(old.group)
      const model = modelFor(item)
      cache.set(item.id, model); objects.add(model.group)
    }
    selectionOutline()
    conflictOutlines()
  }

  function setGhost(item: BuilderItem | null) {
    if (disposed) return
    if (!item) { if (ghost) release(ghost.group); ghost = null; return }
    // Translation is applied to the cached ghost group; moving the pointer does not rebuild a model.
    const normalized = { ...item, id: 0, name: '', x: 0, z: 0 }
    const key = JSON.stringify(normalized)
    if (ghost?.key !== key) {
      if (ghost) release(ghost.group)
      ghost = modelFor(normalized, true); ghost.key = key; scene.add(ghost.group)
    }
    ghost.group.position.set(item.x, 0, item.z)
  }

  function drawPoints(points: readonly BuilderPoint[], color: number, measuring: boolean) {
    const group = stroke(points, color, 1.1, 0.34, true)
    const material = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false })
    points.forEach((point, index) => {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), material)
      marker.position.set(point.x, 1.1, point.z); marker.renderOrder = 23; marker.raycast = () => {}
      group.add(marker)
      if (measuring) group.add(screenLabel(index === 0 ? 'A' : 'B', new THREE.Vector3(point.x, 5, point.z), 6, '#714918', '#fff1be'))
    })
    if (!points.length) material.dispose()
    if (measuring && points.length >= 2) {
      const a = points[0]!, b = points[1]!, metres = Math.hypot(b.x - a.x, b.z - a.z)
      group.add(screenLabel(`${metres.toFixed(1)} m`, new THREE.Vector3((a.x + b.x) / 2, 5.5, (a.z + b.z) / 2), 20, '#714918', '#fff1be'))
    }
    return group
  }

  function onPointerDown(event: PointerEvent) {
    if (!active) return
    tapTracker.down(event, event.target === renderer.domElement)
  }
  function onPointerMove(event: PointerEvent) {
    if (!active) return
    tapTracker.move(event)
    if (mode !== 'select' && !event.buttons) callbacks.onHover?.(pointAt(event))
  }
  function onPointerUp(event: PointerEvent) {
    if (!tapTracker.up(event) || !active) return
    const point = pointAt(event)
    if (!point) return
    if (mode === 'select') {
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(objects.children, true).find(intersection => !(intersection.object instanceof THREE.Sprite))
      let object: THREE.Object3D | null | undefined = hit?.object
      while (object && typeof object.userData.builderItemId !== 'number') object = object.parent
      callbacks.onSelect(object ? object.userData.builderItemId as number : null)
    } else callbacks.onGroundClick(point)
  }
  function onPointerLeave() { callbacks.onHover?.(null) }
  function onPointerCancel(event: PointerEvent) { tapTracker.cancel(event.pointerId); callbacks.onHover?.(null) }
  function onCanvasWheel() { stopTour(); tapTracker.invalidate() }
  function onContextLost(event: Event) {
    event.preventDefault(); stopTour(); contextLost = true; cancelAnimationFrame(frame)
    callbacks.onError('3D 绘图暂时中断。点击“重试 3D 场景”恢复，已建地物会保留。')
  }

  function setTourDecorations(flying: boolean) {
    grid.visible = preferredGridVisible && !flying
    groundRuler.visible = preferredGroundRulerVisible && !flying
    conflicts.visible = !flying
  }

  function stopTour() {
    const previous = tour
    if (!previous) return
    tour = null
    setTourDecorations(false)
    controls.enabled = active; controls.enableDamping = true
    // Keep the exact interrupted shot instead of snapping back to the free camera's former limits.
    const offset = camera.position.clone().sub(controls.target)
    controls.maxPolarAngle = Math.max(Math.PI * 0.43, Math.acos(THREE.MathUtils.clamp(offset.y / Math.max(offset.length(), 1), -1, 1)) + 0.001)
    controls.update(); publishView()
    callbacks.onTourChange?.({ active: false, label: '漫游已暂停 · 自由查看当前视角', index: previous.index, total: previous.shots.length, finished: false })
  }

  function startTour() {
    if (disposed || !active || contextLost) return
    stopTour()
    if (view !== 'perspective') showOverview()
    const subjects: CampusTourSubject[] = []
    for (const [id, model] of cache) {
      const extent = new THREE.Box3()
      model.group.updateMatrixWorld(true)
      model.group.traverse(object => { if (object instanceof THREE.Mesh) extent.expandByObject(object) })
      if (extent.isEmpty()) continue
      const center = extent.getCenter(new THREE.Vector3()), size = extent.getSize(new THREE.Vector3())
      subjects.push({ id, kind: model.item.kind, name: model.item.name, center: { x: center.x, z: center.z }, radius: Math.hypot(size.x, size.z) / 2, height: extent.max.y })
    }
    controls.enableDamping = false; controls.update(); controls.enabled = false
    tour = { ...createCampusTourShots(subjects, camera.position, controls.target), index: 0, startedAt: elapsed }
    setTourDecorations(true)
    camera.position.y = Math.max(camera.position.y, tour.minimumHeight)
    tapTracker.invalidate()
    callbacks.onTourChange?.({ active: true, label: tour.shots[0]!.label, index: 0, total: tour.shots.length, finished: false })
  }

  function advanceTour() {
    if (!tour) return
    const current = tour, shot = current.shots[current.index]!
    const progress = Math.min(1, (elapsed - current.startedAt) / shot.duration)
    const sample = sampleCampusTourShot(shot, progress, current.minimumHeight)
    camera.position.copy(sample.position); controls.target.copy(sample.target); camera.lookAt(sample.target)
    if (elapsed - lastTourViewUpdate >= 0.1) { publishView(); lastTourViewUpdate = elapsed }
    if (progress < 1) return
    if (current.index < current.shots.length - 1) {
      current.index++; current.startedAt = elapsed
      callbacks.onTourChange?.({ active: true, label: current.shots[current.index]!.label, index: current.index, total: current.shots.length, finished: false })
    } else {
      tour = null; setTourDecorations(false); controls.enabled = active; controls.enableDamping = true; controls.update(); publishView()
      callbacks.onTourChange?.({ active: false, label: '漫游完成 · 自由查看校园', index: current.index, total: current.shots.length, finished: true })
    }
  }

  function animate(time: number) {
    if (disposed || !active || contextLost) return
    const delta = lastTime ? Math.min(0.08, (time - lastTime) / 1000) : 0
    lastTime = time
    if (!document.hidden && surfaceVisible) {
      elapsed += delta
      if (tour) advanceTour()
      else controls.update()
      for (const model of cache.values()) model.update(elapsed)
      drawFrame()
    }
    frame = requestAnimationFrame(animate)
  }

  resize(); showOverview(); drawFrame()
  const canvas = renderer.domElement
  const pointerDocument = canvas.ownerDocument
  canvas.addEventListener('pointerdown', stopTour, true)
  canvas.addEventListener('wheel', onCanvasWheel, { capture: true, passive: true })
  pointerDocument.addEventListener('pointerdown', onPointerDown)
  pointerDocument.addEventListener('pointermove', onPointerMove)
  pointerDocument.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointerleave', onPointerLeave)
  pointerDocument.addEventListener('pointercancel', onPointerCancel)
  canvas.addEventListener('webglcontextlost', onContextLost)
  pointerDocument.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('resize', resize, { passive: true })
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  frame = requestAnimationFrame(animate)

  return {
    setItems,
    setInteraction(next) { stopTour(); mode = next; tapTracker.invalidate(); updateInteraction() },
    setSelected(id) { if (disposed) return; selected = id; selectionOutline() },
    setConflicts,
    setDraft(points) { if (disposed) return; release(draft); draft = drawPoints(points, 0x38c7bd, false); scene.add(draft) },
    setMeasure(points) { if (disposed) return; release(measurement); measurement = drawPoints(points, 0xffc456, true); scene.add(measurement) },
    setGhost,
    setGrid(visible) { preferredGridVisible = visible; grid.visible = visible && !tour },
    setGroundRuler(visible) { preferredGroundRulerVisible = visible; groundRuler.visible = visible && !tour },
    setActive(next) {
      if (disposed || active === next) return
      if (!next) stopTour()
      active = next; controls.enabled = next; tapTracker.reset(); lastTime = 0
      if (next && !contextLost) { resize(); drawFrame(); frame = requestAnimationFrame(animate) }
      else cancelAnimationFrame(frame)
    },
    showOverview,
    showPlan,
    startTour,
    stopTour,
    captureArtwork,
    zoomBy(factor) {
      if (disposed || !Number.isFinite(factor) || factor <= 0) return
      stopTour()
      if (camera instanceof THREE.OrthographicCamera) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.65, 8); camera.updateProjectionMatrix() }
      else {
        const offset = camera.position.clone().sub(controls.target)
        offset.setLength(THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance))
        camera.position.copy(controls.target).add(offset)
      }
      controls.update(); publishView()
    },
    resize,
    dispose() {
      if (disposed) return
      stopTour()
      disposed = true; active = false; cancelAnimationFrame(frame)
      observer.disconnect(); controls.dispose()
      canvas.removeEventListener('pointerdown', stopTour, true)
      canvas.removeEventListener('wheel', onCanvasWheel, true)
      pointerDocument.removeEventListener('pointerdown', onPointerDown)
      pointerDocument.removeEventListener('pointermove', onPointerMove)
      pointerDocument.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      pointerDocument.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      pointerDocument.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('resize', resize)
      release(scene); cache.clear(); screenLabels.clear(); ghost = null
      sunlight.shadow.dispose(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
