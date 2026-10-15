import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AXIAL_TILT_DEGREES, GLOBE_LINE_COLORS, POLAR_CIRCLE_DEGREES } from './globe-constants'

export interface GlobeSceneState {
  sphere: boolean
  axis: boolean
  axisOffset: number
  poles: boolean
  northLabel: 'N' | 'S' | null
  southLabel: 'N' | 'S' | null
  equator: boolean
  equatorOffset: number
  equatorTilt: number
  grid: boolean
  latitude: boolean
  longitude: boolean
  tropics: boolean
  polarCircles: boolean
  map: boolean
  stand: boolean
  rotating: boolean
  focus: 'assembly' | 'equator' | 'grid' | 'finished'
  selectedTool: string | null
}

export type Target = 'sphere' | 'north' | 'south'
export type LabelPosition = { x: number; y: number; visible: boolean }
export type HandleKind = 'axis' | 'equatorMove' | 'equatorTilt'
export type HandlePositions = Record<HandleKind, LabelPosition>
type Callbacks = {
  onTarget: (target: Target) => void
  onTextureStatus: (status: 'loading' | 'ready' | 'error') => void
  onLabels: (labels: { north: LabelPosition; south: LabelPosition }) => void
  onHandles?: (handles: HandlePositions) => void
}

const RADIUS = 2
const DEG = Math.PI / 180
const EARTH_TEXTURE_URL = '/geo-resources-folder/images/Material.002_diffuse.jpg'

/** Local +Y is geographic north. Positive rotation about +Y is eastward. */
export function createGlobeScene(host: HTMLElement, callbacks: Callbacks) {
  let disposed = false
  let frame = 0
  let width = 0
  let height = 0
  let previousTime = 0
  let textureStarted = false
  let earthTexture: THREE.Texture | null = null
  let pendingTexture: THREE.Texture | null = null
  let state: GlobeSceneState = {
    sphere: false, axis: false, axisOffset: 0, poles: false,
    northLabel: null, southLabel: null, equator: false,
    equatorOffset: 0, equatorTilt: 0, grid: false, latitude: false,
    longitude: false, tropics: false, polarCircles: false, map: false, stand: false, rotating: false,
    focus: 'assembly', selectedTool: null,
  }
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value)
    return value
  }
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value)
    return value
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#eef5f5')
  scene.fog = new THREE.Fog('#eef5f5', 19, 43)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;'
  renderer.domElement.setAttribute('aria-label', '可拖动旋转、滚轮缩放的地球仪制作工作台')
  host.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 7
  controls.maxDistance = 16
  controls.minPolarAngle = 0.025
  controls.maxPolarAngle = Math.PI - 0.08
  controls.rotateSpeed = 0.65
  controls.zoomSpeed = 0.8
  controls.target.set(0, -0.05, 0)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x91ada9, 2.4))
  const key = new THREE.DirectionalLight(0xfffcf2, 3.1)
  key.position.set(-5, 9, 7)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -6
  key.shadow.camera.right = 6
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -6
  key.shadow.normalBias = 0.025
  key.shadow.bias = -0.00025
  key.shadow.radius = 4
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xbde8ff, 1.2)
  fill.position.set(5, 3, -4)
  scene.add(fill)

  const floorMaterial = material(new THREE.MeshStandardMaterial({ color: '#e7eeee', roughness: 0.94 }))
  const floor = new THREE.Mesh(geometry(new THREE.PlaneGeometry(200, 200)), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.09
  floor.receiveShadow = true
  scene.add(floor)

  const platformMaterial = material(new THREE.MeshStandardMaterial({ color: '#fbfdfb', roughness: 0.68 }))
  const platform = new THREE.Mesh(geometry(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 96)), platformMaterial)
  platform.position.y = -3.015
  platform.receiveShadow = true
  platform.castShadow = true
  scene.add(platform)
  const rimMaterial = material(new THREE.MeshStandardMaterial({ color: '#b7d2d0', roughness: 0.5, metalness: 0.18 }))
  const platformRim = new THREE.Mesh(geometry(new THREE.TorusGeometry(3.43, 0.014, 8, 120)), rimMaterial)
  platformRim.rotation.x = Math.PI / 2
  platformRim.position.y = -2.948
  scene.add(platformRim)

  // A soft contact shadow remains smooth on devices with modest shadow-map resolution.
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const shadowContext = shadowCanvas.getContext('2d')
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(25,74,76,.22)')
    gradient.addColorStop(0.45, 'rgba(25,74,76,.12)')
    gradient.addColorStop(1, 'rgba(25,74,76,0)')
    shadowContext.fillStyle = gradient
    shadowContext.fillRect(0, 0, 128, 128)
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
  textures.add(shadowTexture)
  const shadow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(6.2, 5.4)),
    material(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(0.25, -2.944, 0.12)
  scene.add(shadow)

  const globe = new THREE.Group()
  globe.position.y = 0.05
  scene.add(globe)
  const spin = new THREE.Group()
  globe.add(spin)
  const sphereMaterial = material(new THREE.MeshStandardMaterial({ color: '#e2eff0', roughness: 0.72, metalness: 0.015 }))
  const sphere = new THREE.Mesh(geometry(new THREE.SphereGeometry(RADIUS, 96, 64)), sphereMaterial)
  sphere.castShadow = true
  sphere.receiveShadow = true
  sphere.userData.target = 'sphere'
  spin.add(sphere)

  const tealMaterial = material(new THREE.MeshStandardMaterial({ color: '#225b62', metalness: 0.55, roughness: 0.32 }))
  const goldMaterial = material(new THREE.MeshStandardMaterial({ color: '#d5b474', metalness: 0.7, roughness: 0.32 }))
  const axisGroup = new THREE.Group()
  globe.add(axisGroup)
  const axisRod = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.035, 0.035, 5.08, 16)), tealMaterial)
  axisRod.castShadow = true
  axisGroup.add(axisRod)
  for (const direction of [-1, 1]) {
    const collar = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 24)), goldMaterial)
    collar.position.y = direction * 2.3
    axisGroup.add(collar)
    const cap = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.063, 20, 12)), goldMaterial)
    cap.position.y = direction * 2.54
    axisGroup.add(cap)
  }

  // X-ray guide is only instructional: an actual globe uses a physical spindle,
  // whereas Earth's geographic axis is an imaginary line through its centre.
  const axisGuideMaterial = material(new THREE.LineDashedMaterial({
    color: '#387c87', dashSize: 0.09, gapSize: 0.055, transparent: true,
    opacity: 0.65, depthTest: false, depthWrite: false,
  }))
  const axisGuide = new THREE.Line(
    geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.08, 0), new THREE.Vector3(0, 2.08, 0)])),
    axisGuideMaterial,
  )
  axisGuide.computeLineDistances()
  axisGuide.renderOrder = 4
  axisGroup.add(axisGuide)
  const centreMaterial = material(new THREE.MeshBasicMaterial({ color: '#d6a254', depthTest: false, transparent: true, opacity: 0.95 }))
  const centrePoint = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.047, 16, 12)), centreMaterial)
  centrePoint.renderOrder = 5
  globe.add(centrePoint)

  const poleGroup = new THREE.Group()
  globe.add(poleGroup)
  const northMaterial = material(new THREE.MeshStandardMaterial({ color: '#e66e56', emissive: '#e66e56', emissiveIntensity: 0.12, roughness: 0.4 }))
  const southMaterial = material(new THREE.MeshStandardMaterial({ color: '#377b95', emissive: '#377b95', emissiveIntensity: 0.1, roughness: 0.4 }))
  const neutralPoleMaterial = material(new THREE.MeshStandardMaterial({ color: '#c5a66b', roughness: 0.45, metalness: 0.3 }))
  const northPole = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.10, 24, 16)), neutralPoleMaterial)
  const southPole = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.10, 24, 16)), neutralPoleMaterial)
  northPole.position.y = RADIUS + 0.045
  southPole.position.y = -RADIUS - 0.045
  northPole.userData.target = 'north'
  southPole.userData.target = 'south'
  poleGroup.add(northPole, southPole)

  const equatorGroup = new THREE.Group()
  spin.add(equatorGroup)
  const equatorMaterial = material(new THREE.MeshBasicMaterial({
    color: GLOBE_LINE_COLORS.equator, transparent: true, opacity: 0.98,
  }))
  const equatorRing = new THREE.Mesh(geometry(new THREE.TorusGeometry(1, 0.010, 10, 192)), equatorMaterial)
  equatorRing.rotation.x = Math.PI / 2
  equatorGroup.add(equatorRing)
  const latitudeGroup = new THREE.Group()
  const longitudeGroup = new THREE.Group()
  const tropicsGroup = new THREE.Group()
  const polarCirclesGroup = new THREE.Group()
  spin.add(latitudeGroup, longitudeGroup, tropicsGroup, polarCirclesGroup)
  // The same mint grid as earth-motion, with enough opacity for a pale workbench.
  const gridMaterial = material(new THREE.LineBasicMaterial({
    color: GLOBE_LINE_COLORS.grid, transparent: true, opacity: 0.62,
  }))
  function surfacePoint(latitude: number, longitude: number, radius: number) {
    const lat = latitude * DEG
    const lon = longitude * DEG
    return new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon))
  }
  function latitudePoints(latitude: number, radius: number) {
    const points: THREE.Vector3[] = []
    for (let longitude = -180; longitude <= 180; longitude += 2) {
      points.push(surfacePoint(latitude, longitude, radius))
    }
    return points
  }
  for (let latitude = -75; latitude <= 75; latitude += 15) {
    if (latitude === 0) continue
    latitudeGroup.add(new THREE.Line(
      geometry(new THREE.BufferGeometry().setFromPoints(latitudePoints(latitude, RADIUS * 1.007))), gridMaterial,
    ))
  }
  // Each longitude is one pole-to-pole semicircle. Opposite longitudes make a great circle.
  for (let longitude = 0; longitude < 360; longitude += 15) {
    const points: THREE.Vector3[] = []
    for (let latitude = -90; latitude <= 90; latitude += 3) {
      points.push(surfacePoint(latitude, longitude, RADIUS * 1.006))
    }
    longitudeGroup.add(new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(points)), gridMaterial))
  }
  // Scale dash lengths with radius so they match earth-motion's angular spacing.
  const lineScale = RADIUS / 1.35
  const specialLatitudes = [
    { group: tropicsGroup, latitude: AXIAL_TILT_DEGREES, color: GLOBE_LINE_COLORS.tropics, dashSize: 0.085, opacity: 0.98 },
    { group: polarCirclesGroup, latitude: POLAR_CIRCLE_DEGREES, color: GLOBE_LINE_COLORS.polarCircles, dashSize: 0.07, opacity: 0.9 },
  ]
  for (const { group, latitude, color, dashSize, opacity } of specialLatitudes) {
    const lineMaterial = material(new THREE.LineDashedMaterial({
      color, transparent: true, opacity, dashSize: dashSize * lineScale, gapSize: 0.055 * lineScale,
    }))
    for (const direction of [-1, 1]) {
      const line = new THREE.Line(
        geometry(new THREE.BufferGeometry().setFromPoints(latitudePoints(direction * latitude, RADIUS * 1.012))), lineMaterial,
      )
      line.computeLineDistances()
      group.add(line)
    }
  }

  const stand = new THREE.Group()
  scene.add(stand)
  const foot = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.82, 1.04, 0.16, 64)), tealMaterial)
  foot.position.y = -2.855
  foot.castShadow = true
  foot.receiveShadow = true
  stand.add(foot)
  const footAccent = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.77, 0.8, 0.045, 64)), goldMaterial)
  footAccent.position.y = -2.758
  stand.add(footAccent)
  const supportFrame = new THREE.Group()
  globe.add(supportFrame)
  const frameGeometry = geometry(new THREE.TorusGeometry(2.42, 0.048, 12, 128, Math.PI))
  const meridianFrame = new THREE.Mesh(frameGeometry, tealMaterial)
  meridianFrame.rotation.z = -Math.PI / 2
  meridianFrame.castShadow = true
  supportFrame.add(meridianFrame)
  const frameTrim = new THREE.Mesh(geometry(new THREE.TorusGeometry(2.42, 0.012, 8, 128, Math.PI)), goldMaterial)
  frameTrim.rotation.z = -Math.PI / 2
  frameTrim.position.z = 0.046
  supportFrame.add(frameTrim)
  // In the tilted assembly, this connection reaches the base without rotating with Earth.
  const stemStart = new THREE.Vector3(0, -2.735, 0)
  const stemEnd = new THREE.Vector3(0, -2.42, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), AXIAL_TILT_DEGREES * DEG)
  stemEnd.y += globe.position.y
  const stemVector = stemEnd.clone().sub(stemStart)
  const stem = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.07, 0.12, stemVector.length(), 24)), tealMaterial)
  stem.position.copy(stemStart).add(stemEnd).multiplyScalar(0.5)
  stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemVector.normalize())
  stem.castShadow = true
  stand.add(stem)

  // Empty workbench cue: a dashed footprint invites placing the first component.
  const emptyPoints: THREE.Vector3[] = []
  for (let index = 0; index <= 100; index++) {
    const angle = index / 100 * Math.PI * 2
    emptyPoints.push(new THREE.Vector3(1.5 * Math.cos(angle), -2.93, 1.5 * Math.sin(angle)))
  }
  const emptyGuide = new THREE.Line(
    geometry(new THREE.BufferGeometry().setFromPoints(emptyPoints)),
    material(new THREE.LineDashedMaterial({ color: '#96beba', dashSize: 0.13, gapSize: 0.08 })),
  )
  emptyGuide.computeLineDistances()
  scene.add(emptyGuide)

  function loadMap() {
    if (textureStarted || disposed) return
    textureStarted = true
    callbacks.onTextureStatus('loading')
    pendingTexture = new THREE.TextureLoader().load(EARTH_TEXTURE_URL, texture => {
      if (disposed) { texture.dispose(); return }
      textures.add(texture)
      earthTexture = texture
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
      sphereMaterial.map = state.map ? texture : null
      sphereMaterial.color.set(state.map ? '#ffffff' : '#e2eff0')
      sphereMaterial.needsUpdate = true
      callbacks.onTextureStatus('ready')
    }, undefined, () => {
      if (disposed) return
      pendingTexture?.dispose()
      pendingTexture = null
      callbacks.onTextureStatus('error')
    })
  }

  const poleWorld = new THREE.Vector3()
  const globeWorld = new THREE.Vector3()
  const cameraToPole = new THREE.Vector3()
  const projection = new THREE.Vector3()
  const occlusionRay = new THREE.Ray()
  const worldSphere = new THREE.Sphere(new THREE.Vector3(), RADIUS - 0.015)
  const intersection = new THREE.Vector3()
  function poleVisible(localPosition: THREE.Vector3) {
    poleWorld.copy(localPosition)
    globe.localToWorld(poleWorld)
    cameraToPole.copy(poleWorld).sub(camera.position)
    const distance = cameraToPole.length()
    occlusionRay.set(camera.position, cameraToPole.normalize())
    worldSphere.center.copy(globeWorld)
    const hit = occlusionRay.intersectSphere(worldSphere, intersection)
    return !hit || camera.position.distanceTo(intersection) >= distance - 0.07
  }
  function labelPosition(direction: number): LabelPosition {
    const localPosition = direction > 0 ? northPole.position : southPole.position
    const visible = state.sphere && state.poles && poleVisible(localPosition)
    projection.copy(localPosition).multiplyScalar(1.14)
    globe.localToWorld(projection)
    projection.project(camera)
    return {
      x: (projection.x * 0.5 + 0.5) * width,
      y: (0.5 - projection.y * 0.5) * height,
      visible: visible && projection.z > -1 && projection.z < 1 && Math.abs(projection.x) < 1 && Math.abs(projection.y) < 1,
    }
  }
  let lastLabels = ''
  function updateLabels() {
    globe.getWorldPosition(globeWorld)
    const north = labelPosition(1)
    const south = labelPosition(-1)
    const key = `${north.x.toFixed(1)},${north.y.toFixed(1)},${north.visible},${south.x.toFixed(1)},${south.y.toFixed(1)},${south.visible}`
    if (key !== lastLabels) {
      lastLabels = key
      callbacks.onLabels({ north, south })
    }
    updateHandles()
  }

  function projectPoint(localPoint: THREE.Vector3, parent: THREE.Object3D, visible = true): LabelPosition {
    const point = parent.localToWorld(localPoint.clone()).project(camera)
    return {
      x: (point.x * 0.5 + 0.5) * width,
      y: (0.5 - point.y * 0.5) * height,
      visible: visible && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95,
    }
  }

  let lastHandles = ''
  function updateHandles() {
    if (!callbacks.onHandles) return
    // Place the axis control beside its exposed end, clear of the pole-label target.
    const axis = projectPoint(new THREE.Vector3(0, 2.52, 0), axisGroup, state.sphere && state.axis && state.focus === 'assembly')
    axis.x += 86
    axis.y += 30
    const offset = equatorRing.position.y
    const radius = equatorRing.scale.x
    const localCamera = equatorGroup.worldToLocal(camera.position.clone())
    const front = new THREE.Vector3(localCamera.x, 0, localCamera.z).normalize()
    if (front.lengthSq() < 0.1) front.set(0, 0, 1)
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      .applyQuaternion(equatorGroup.getWorldQuaternion(new THREE.Quaternion()).invert())
    right.y = 0
    right.normalize()
    if (right.lengthSq() < 0.1) right.set(1, 0, 0)
    const visible = state.sphere && state.equator && state.focus === 'equator'
    const equatorMove = projectPoint(front.multiplyScalar(radius).setY(offset), equatorGroup, visible)
    const equatorTilt = projectPoint(right.multiplyScalar(radius).setY(offset), equatorGroup, visible)
    equatorMove.y += 24
    equatorTilt.x += 22
    // Keep touch handles separated even when the ring is viewed almost edge-on.
    if (Math.hypot(equatorTilt.x - equatorMove.x, equatorTilt.y - equatorMove.y) < 72) {
      equatorTilt.x = equatorMove.x + 72
    }
    const handles = { axis, equatorMove, equatorTilt }
    const key = Object.values(handles).map(value => `${value.x.toFixed(1)},${value.y.toFixed(1)},${value.visible}`).join(',')
    if (key !== lastHandles) {
      lastHandles = key
      callbacks.onHandles(handles)
    }
  }

  /** Return a model value; Vue owns the state and its undo history. */
  function adjustFromDrag(kind: HandleKind, dx: number, dy: number, startValue: number): number {
    const parent = kind === 'axis' ? globe : equatorGroup
    const origin = kind === 'axis'
      ? new THREE.Vector3(startValue * RADIUS, 2.52, 0)
      : new THREE.Vector3(0, startValue * RADIUS, 0)
    if (kind === 'equatorTilt') {
      // Drag the ring's right-hand control vertically to rotate its plane.
      // The screen-space tangent remains useful after orbiting the model.
      const angle = startValue * DEG
      const point = new THREE.Vector3(RADIUS * Math.cos(angle), RADIUS * Math.sin(angle), 0)
      const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0).multiplyScalar(RADIUS * DEG)
      const from = projectPoint(point, spin)
      const to = projectPoint(point.clone().add(tangent), spin)
      const vx = to.x - from.x
      const vy = to.y - from.y
      const lengthSq = vx * vx + vy * vy
      const delta = lengthSq > 0.1 ? (dx * vx + dy * vy) / lengthSq : -dy * 0.4
      const value = THREE.MathUtils.clamp(startValue + delta, -60, 60)
      return Math.abs(value) <= 1.5 ? 0 : value
    }
    const direction = kind === 'axis' ? new THREE.Vector3(RADIUS, 0, 0) : new THREE.Vector3(0, RADIUS, 0)
    const from = projectPoint(origin, parent)
    const to = projectPoint(origin.clone().add(direction), parent)
    const vx = to.x - from.x
    const vy = to.y - from.y
    const lengthSq = vx * vx + vy * vy
    const delta = lengthSq > 1 ? (dx * vx + dy * vy) / lengthSq : 0
    const value = THREE.MathUtils.clamp(startValue + delta, -0.6, 0.6)
    return Math.abs(value) <= 0.025 ? 0 : value
  }

  function update(next: GlobeSceneState) {
    if (disposed) return
    state = { ...next }
    globe.visible = state.sphere
    emptyGuide.visible = !state.sphere
    shadow.visible = state.sphere
    axisGroup.visible = state.axis
    const axisX = THREE.MathUtils.clamp(state.axisOffset, -0.8, 0.8) * RADIUS
    axisGroup.position.x = axisX
    axisGuide.visible = state.axis && state.focus === 'assembly'
    centrePoint.visible = state.axis && state.focus === 'assembly'
    poleGroup.visible = state.poles
    // While experimenting, the two markers follow the spindle's surface
    // intersections. They represent geographic poles only once the axis is centred.
    const poleY = Math.sqrt(RADIUS ** 2 - axisX ** 2)
    northPole.position.set(axisX, poleY, 0).multiplyScalar(1.02)
    southPole.position.set(axisX, -poleY, 0).multiplyScalar(1.02)
    northPole.material = state.northLabel === 'N' ? northMaterial : state.northLabel === 'S' ? southMaterial : neutralPoleMaterial
    southPole.material = state.southLabel === 'N' ? northMaterial : state.southLabel === 'S' ? southMaterial : neutralPoleMaterial
    equatorGroup.visible = state.equator
    const offset = THREE.MathUtils.clamp(state.equatorOffset, -0.9, 0.9) * RADIUS
    const equatorRadius = Math.sqrt(RADIUS ** 2 - offset ** 2) + 0.012
    // Rotating the entire plane about the sphere's centre keeps its circle on the sphere.
    equatorGroup.rotation.z = state.equatorTilt * DEG
    equatorRing.position.y = offset
    equatorRing.scale.set(equatorRadius, equatorRadius, 1)
    latitudeGroup.visible = state.grid && state.latitude
    longitudeGroup.visible = state.grid && state.longitude
    tropicsGroup.visible = state.grid && state.tropics
    polarCirclesGroup.visible = state.grid && state.polarCircles
    stand.visible = state.stand
    supportFrame.visible = state.stand
    globe.rotation.z = state.stand ? AXIAL_TILT_DEGREES * DEG : 0
    if (!state.sphere) spin.rotation.y = 0
    if (state.map || state.focus === 'grid' || state.focus === 'finished') loadMap()
    sphereMaterial.map = state.map ? earthTexture : null
    sphereMaterial.color.set(state.map && earthTexture ? '#ffffff' : '#e2eff0')
    sphereMaterial.needsUpdate = true
    renderer.domElement.style.cursor = state.selectedTool ? 'crosshair' : 'grab'
    scene.updateMatrixWorld(true)
    updateLabels()
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const pointerStart = new THREE.Vector2()
  let activePointer: number | null = null
  let dragDistance = 0
  let multiTouch = false
  const downPointers = new Set<number>()
  function hitTarget(clientX: number, clientY: number): Target | null {
    if (disposed) return null
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    if (!state.sphere) {
      // The workbench accepts the first sphere, including the space above its footprint.
      return raycaster.intersectObject(platform).length || raycaster.intersectObject(sphere).length ? 'sphere' : null
    }
    const candidates: THREE.Object3D[] = [sphere]
    if (state.poles) candidates.push(northPole, southPole)
    const hits = raycaster.intersectObjects(candidates, false)
    // Pole labels are touch-sized targets; keep the same front-surface occlusion rule.
    if (state.poles) {
      for (const [target, pole] of [['north', northPole], ['south', southPole]] as const) {
        const projected = projectPoint(pole.position, globe)
        if (projected.visible && poleVisible(pole.position) && Math.hypot(clientX - rect.left - projected.x, clientY - rect.top - projected.y) <= 25) return target
      }
    }
    return hits[0] ? hits[0].object.userData.target as Target : null
  }
  function onPointerDown(event: PointerEvent) {
    downPointers.add(event.pointerId)
    if (downPointers.size > 1) multiTouch = true
    if (event.button !== 0 || activePointer !== null) return
    activePointer = event.pointerId
    pointerStart.set(event.clientX, event.clientY)
    dragDistance = 0
  }
  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== activePointer) return
    dragDistance = Math.max(dragDistance, Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y))
  }
  function finishPointer(event: PointerEvent) {
    downPointers.delete(event.pointerId)
    const wasActive = event.pointerId === activePointer
    if (wasActive) activePointer = null
    const hadMultiTouch = multiTouch
    if (downPointers.size === 0) multiTouch = false
    if (!wasActive || hadMultiTouch || dragDistance > 7 || event.type === 'pointercancel') return
    const target = hitTarget(event.clientX, event.clientY)
    if (target) callbacks.onTarget(target)
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', finishPointer)
  renderer.domElement.addEventListener('pointercancel', finishPointer)

  function resize() {
    if (disposed) return
    const nextWidth = Math.max(1, Math.round(host.clientWidth))
    const nextHeight = Math.max(1, Math.round(host.clientHeight))
    if (nextWidth === width && nextHeight === height) return
    width = nextWidth
    height = nextHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.render(scene, camera)
    updateLabels()
  }

  function setView(view: 'front' | 'north') {
    if (disposed) return
    // Close to the equatorial plane so both pole targets remain accessible.
    controls.target.set(0, -0.05, 0)
    if (view === 'north') {
      const northDirection = new THREE.Vector3(0, 11.2, 0.12)
      northDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), state.stand ? AXIAL_TILT_DEGREES * DEG : 0)
      camera.position.copy(northDirection).add(globe.position)
      controls.target.copy(globe.position)
    } else {
      camera.position.set(4.6, globe.position.y, 10.2)
    }
    camera.up.set(0, 1, 0)
    controls.update()
    renderer.render(scene, camera)
    updateLabels()
  }
  function resetView() { setView('front') }
  function animate(time: number) {
    if (disposed) return
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
    previousTime = time
    if (state.rotating && state.sphere) spin.rotation.y += delta * 0.26
    controls.update()
    renderer.render(scene, camera)
    updateLabels()
    frame = requestAnimationFrame(animate)
  }

  update(state)
  resetView()
  resize()
  frame = requestAnimationFrame(animate)

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerup', finishPointer)
    renderer.domElement.removeEventListener('pointercancel', finishPointer)
    controls.dispose()
    geometries.forEach(value => value.dispose())
    materials.forEach(value => value.dispose())
    textures.forEach(value => value.dispose())
    if (pendingTexture && !textures.has(pendingTexture)) pendingTexture.dispose()
    key.shadow.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
    scene.clear()
  }

  function setInteractionEnabled(enabled: boolean) {
    controls.enabled = enabled
  }

  return { update, resize, resetView, setView, hitTarget, adjustFromDrag, setInteractionEnabled, dispose }
}
