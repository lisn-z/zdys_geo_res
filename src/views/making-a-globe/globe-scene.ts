import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { AXIAL_TILT_DEGREES, GLOBE_LINE_COLORS, POLAR_CIRCLE_DEGREES } from './globe-constants'
import { TRACE_DEFINITIONS, TRACE_ORDER, type TraceId } from './globe-tracing'
import { createMapWrapMesh } from './globe-map-wrap'

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
  mounted: boolean
  traces: Record<TraceId, number>
  activeTrace: TraceId | null
  axialTilt: number
  tiltAdjusted: boolean
  rotating: boolean
  focus: 'assembly' | 'map' | 'equator' | 'grid' | 'tilt' | 'mounting' | 'finished'
  selectedTool: string | null
}

export type Target = 'sphere' | 'north' | 'south'
export type LabelPosition = { x: number; y: number; visible: boolean }
export type HandleKind = 'axis' | 'equatorMove' | 'equatorTilt' | 'axialTilt'
export type HandlePositions = Record<HandleKind, LabelPosition>
export type AssemblyGuidePosition = LabelPosition & { radius: number }
export type AssemblyGuides = Record<'parked' | 'stand' | 'socket', AssemblyGuidePosition>
export type AssemblyDragId = 'stand' | 'mount-globe'
export type TraceGuide = { id: TraceId | null; points: Array<{ x: number; y: number }>; start: number; end: number }
type Callbacks = {
  onTarget: (target: Target) => void
  onTextureStatus: (status: 'loading' | 'ready' | 'error') => void
  onLabels: (labels: { north: LabelPosition; south: LabelPosition }) => void
  onHandles?: (handles: HandlePositions) => void
  onAssemblyGuides?: (guides: AssemblyGuides) => void
  onTraceGuide?: (guide: TraceGuide) => void
  onTiltGuide?: (guide: AssemblyGuidePosition) => void
  onMapWrapState?: (status: 'wrapping' | 'complete' | 'cancelled') => void
  onMountComplete?: () => void
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
  let mapWrap: {
    sheet: ReturnType<typeof createMapWrapMesh>
    started: number
    startQuaternion: THREE.Quaternion
    focus: GlobeSceneState['focus']
    cameraOffset: THREE.Vector3
    fitDistance: number
    spinStart: number
  } | null = null
  let state: GlobeSceneState = {
    sphere: false, axis: false, axisOffset: 0, poles: false,
    northLabel: null, southLabel: null, equator: false,
    equatorOffset: 0, equatorTilt: 0, grid: false, latitude: false,
    longitude: false, tropics: false, polarCircles: false, map: false, stand: false, mounted: false, rotating: false,
    traces: { equator: 0, 'north-tropic': 0, 'south-tropic': 0, 'west-boundary': 0, 'east-boundary': 0 },
    activeTrace: null, axialTilt: 0, tiltAdjusted: false, focus: 'assembly', selectedTool: null,
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
  // An orthographic teaching view exposes exactly one hemisphere, including its rim.
  // A finite perspective camera would hide the ends of a nominal 180-degree trace.
  const instructionCamera = new THREE.OrthographicCamera(-4, 4, 3.5, -3.5, 0.1, 80)
  function instructionViewActive() { return state.activeTrace !== null || state.focus === 'tilt' }
  function sceneCamera(): THREE.Camera { return instructionViewActive() ? instructionCamera : camera }
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

  const frontViewDirection = new THREE.Vector3(2.2, 0.6, 11)
  const frontViewDistance = frontViewDirection.length()
  frontViewDirection.normalize()
  function fittedViewDistance() {
    const verticalHalfAngle = camera.fov * DEG / 2
    const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * camera.aspect)
    // A sphere of this radius encloses the ball, meridian band and wooden base.
    // Fitting the narrower field of view also handles tall desktop workbenches.
    const distance = 3.15 * 1.12 / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle))
    return Math.min(60, Math.max(frontViewDistance, distance))
  }
  function frontViewPosition() {
    return frontViewDirection.clone().multiplyScalar(fittedViewDistance()).add(new THREE.Vector3(0, -0.05, 0))
  }
  function updateViewDistanceLimit() {
    controls.maxDistance = Math.max(16, Math.min(70, fittedViewDistance() * 1.6))
  }

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

  const goldMaterial = material(new THREE.MeshStandardMaterial({ color: '#d5b474', metalness: 0.7, roughness: 0.32 }))
  const axisGroup = new THREE.Group()
  globe.add(axisGroup)
  const axisRod = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.035, 0.035, 5.08, 16)), goldMaterial)
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
    // SphereGeometry UV u=(longitude+180)/360: eastward longitude points toward -Z.
    // This matches earth-motion and the unshifted equirectangular sea/land texture.
    return new THREE.Vector3(radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon))
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

  type TraceLayer = { object: THREE.Line | THREE.Mesh; points: THREE.Vector3[]; segments: number; indicesPerSegment: number; label?: THREE.Sprite }
  const traceLayers = new Map<TraceId, TraceLayer>()
  const traceGroup = new THREE.Group()
  spin.add(traceGroup)
  const traceRadius = RADIUS * 1.014
  const isLatitudeTrace = (id: TraceId) => id === 'equator' || id === 'north-tropic' || id === 'south-tropic'
  function traceLatitude(id: TraceId) {
    return id === 'north-tropic' ? AXIAL_TILT_DEGREES : id === 'south-tropic' ? -AXIAL_TILT_DEGREES : 0
  }
  for (const id of TRACE_ORDER) {
    const latitudeTrace = isLatitudeTrace(id)
    const segments = latitudeTrace ? 360 : 180
    const points: THREE.Vector3[] = []
    for (let index = 0; index <= segments; index++) {
      points.push(latitudeTrace
        ? surfacePoint(traceLatitude(id), -180 + index, traceRadius)
        : surfacePoint(90 - index, id === 'west-boundary' ? -20 : 160, traceRadius))
    }
    const dashed = id === 'north-tropic' || id === 'south-tropic'
    const object = dashed
      ? new THREE.Line(
        geometry(new THREE.BufferGeometry().setFromPoints(points)),
        material(new THREE.LineDashedMaterial({ color: TRACE_DEFINITIONS[id].color, transparent: true, opacity: 0.98, dashSize: 0.085 * lineScale, gapSize: 0.055 * lineScale })),
      )
      : new THREE.Mesh(
        geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, id === 'equator' ? 0.012 : 0.014, 6, false)),
        material(new THREE.MeshBasicMaterial({ color: TRACE_DEFINITIONS[id].color, transparent: true, opacity: 0.98 })),
      )
    if (object instanceof THREE.Line) object.computeLineDistances()
    traceGroup.add(object)
    const layer: TraceLayer = { object, points, segments, indicesPerSegment: dashed ? 1 : 36 }
    if (!latitudeTrace) {
      const labelCanvas = document.createElement('canvas')
      labelCanvas.width = 320
      labelCanvas.height = 100
      const context = labelCanvas.getContext('2d')
      if (context) {
        context.fillStyle = '#634a8e'
        context.beginPath()
        context.roundRect(4, 4, 312, 92, 28)
        context.fill()
        context.fillStyle = '#ffffff'
        context.font = '600 60px Arial, sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(id === 'west-boundary' ? '20°W' : '160°E', 160, 52)
      }
      const texture = new THREE.CanvasTexture(labelCanvas)
      texture.colorSpace = THREE.SRGBColorSpace
      textures.add(texture)
      const label = new THREE.Sprite(material(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })))
      label.position.copy(surfacePoint(8, id === 'west-boundary' ? -20 : 160, RADIUS * 1.1))
      label.scale.set(0.64, 0.2, 1)
      traceGroup.add(label)
      layer.label = label
    }
    traceLayers.set(id, layer)
  }

  const tiltReference = new THREE.Group()
  tiltReference.position.copy(globe.position)
  scene.add(tiltReference)
  const normalReferenceMaterial = material(new THREE.LineDashedMaterial({ color: '#678b98', transparent: true, opacity: 0.8, dashSize: 0.1, gapSize: 0.07, depthTest: false, depthWrite: false }))
  const targetReferenceMaterial = material(new THREE.LineDashedMaterial({ color: '#c8993d', transparent: true, opacity: 0.75, dashSize: 0.08, gapSize: 0.065, depthTest: false, depthWrite: false }))
  const normalReference = new THREE.Line(
    geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.8, 0), new THREE.Vector3(0, 3.05, 0)])), normalReferenceMaterial,
  )
  normalReference.computeLineDistances()
  const targetDirection = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -AXIAL_TILT_DEGREES * DEG)
  const targetReference = new THREE.Line(
    geometry(new THREE.BufferGeometry().setFromPoints([targetDirection.clone().multiplyScalar(-2.65), targetDirection.clone().multiplyScalar(3.05)])), targetReferenceMaterial,
  )
  targetReference.computeLineDistances()
  const anglePoints: THREE.Vector3[] = []
  for (let index = 0; index <= 60; index++) {
    const angle = index / 60 * AXIAL_TILT_DEGREES * DEG
    anglePoints.push(new THREE.Vector3(Math.sin(angle) * 2.83, Math.cos(angle) * 2.83, 0))
  }
  const angleReference = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(anglePoints)), material(new THREE.LineBasicMaterial({ color: '#bd933f', depthTest: false })))
  const planeReference = new THREE.LineSegments(
    geometry(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.15, -2.8, 0), new THREE.Vector3(3.15, -2.8, 0),
      new THREE.Vector3(0, -2.61, 0), new THREE.Vector3(0.19, -2.61, 0),
      new THREE.Vector3(0.19, -2.61, 0), new THREE.Vector3(0.19, -2.8, 0),
    ])), material(new THREE.LineBasicMaterial({ color: '#8a9f9d', depthTest: false })),
  )
  tiltReference.add(normalReference, targetReference, angleReference, planeReference)
  tiltReference.renderOrder = 6

  const stand = new THREE.Group()
  scene.add(stand)
  const woodDarkMaterial = material(new THREE.MeshStandardMaterial({ color: '#4a1d21', roughness: 0.42, metalness: 0.03 }))
  const woodFaceMaterial = material(new THREE.MeshStandardMaterial({ color: '#60292a', roughness: 0.46, metalness: 0.025 }))
  for (const [top, bottom, height, y, surface] of [
    [1.03, 1.05, 0.11, -2.88, woodDarkMaterial],
    [0.92, 1.00, 0.12, -2.77, woodFaceMaterial],
    [0.82, 0.91, 0.09, -2.665, woodDarkMaterial],
  ] as const) {
    const footLayer = new THREE.Mesh(geometry(new THREE.CylinderGeometry(top, bottom, height, 96)), surface)
    footLayer.position.y = y
    footLayer.castShadow = true
    footLayer.receiveShadow = true
    stand.add(footLayer)
  }
  const footAccent = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.19, 0.23, 0.035, 40)), goldMaterial)
  footAccent.position.y = -2.6025
  stand.add(footAccent)
  const supportFrame = new THREE.Group()
  // The frame belongs to the stand; the assembled ball rotates independently inside it.
  supportFrame.position.y = 0.05
  supportFrame.name = 'support-frame'
  stand.add(supportFrame)
  // A broad brass meridian band follows the right-hand semicircle, with its
  // ends aligned to the geographic axis and its lowest point above the post.
  const frameShape = new THREE.Shape()
  frameShape.absarc(0, 0, 2.48, -Math.PI / 2, Math.PI / 2, false)
  frameShape.absarc(0, 0, 2.36, Math.PI / 2, -Math.PI / 2, true)
  frameShape.closePath()
  const frameGeometry = geometry(new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.12, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 72,
  }))
  frameGeometry.translate(0, 0, -0.06)
  const meridianFrame = new THREE.Mesh(frameGeometry, goldMaterial)
  meridianFrame.castShadow = true
  supportFrame.add(meridianFrame)
  const frameTicks: THREE.Vector3[] = []
  for (let degrees = -90; degrees <= 90; degrees += 10) {
    const angle = degrees * DEG
    const innerRadius = degrees % 30 === 0 ? 2.385 : 2.415
    frameTicks.push(new THREE.Vector3(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius, 0.071))
    frameTicks.push(new THREE.Vector3(Math.cos(angle) * 2.465, Math.sin(angle) * 2.465, 0.071))
  }
  supportFrame.add(new THREE.LineSegments(geometry(new THREE.BufferGeometry().setFromPoints(frameTicks)), material(new THREE.LineBasicMaterial({ color: '#7f582d' }))))
  // A vertical post supports the bottom of the meridian band. It must not
  // swing toward the south pole when the frame tilts.
  const stemStart = new THREE.Vector3(0, -2.60, 0)
  const stemEnd = new THREE.Vector3(0, -2.42, 0)
  stemEnd.y += globe.position.y
  const stemVector = stemEnd.clone().sub(stemStart)
  const stemBaseLength = stemVector.length()
  const stem = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.095, 0.13, stemBaseLength, 32)), goldMaterial)
  stem.name = 'stand-stem'
  stem.position.copy(stemStart).add(stemEnd).multiplyScalar(0.5)
  stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemVector.normalize())
  stem.castShadow = true
  stand.add(stem)

  const standGuideMaterial = material(new THREE.MeshBasicMaterial({
    color: '#4d9b92', transparent: true, opacity: 0.28, depthWrite: false,
  }))
  const standGuide = stand.clone(true)
  standGuide.traverse(child => {
    if (child instanceof THREE.LineSegments) child.visible = false
    if (child instanceof THREE.Mesh) {
      child.material = standGuideMaterial
      child.castShadow = false
      child.receiveShadow = false
    }
  })
  scene.add(standGuide)
  const ghostFrame = standGuide.getObjectByName('support-frame')!
  const ghostStem = standGuide.getObjectByName('stand-stem')!

  function axialTiltRadians() { return -THREE.MathUtils.clamp(state.axialTilt, 0, 40) * DEG }
  function updateStandTilt() {
    const tilt = axialTiltRadians()
    supportFrame.rotation.z = tilt
    ghostFrame.rotation.z = tilt
    const end = new THREE.Vector3(0, -2.42, 0)
    end.y += 0.05
    const direction = end.clone().sub(stemStart)
    stem.position.copy(stemStart).add(end).multiplyScalar(0.5)
    stem.scale.y = direction.length() / stemBaseLength
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    ghostStem.position.copy(stem.position)
    ghostStem.scale.copy(stem.scale)
    ghostStem.quaternion.copy(stem.quaternion)
  }

  const socketGuide = new THREE.Group()
  const socketFillMaterial = material(new THREE.MeshBasicMaterial({
    color: '#6bb3a8', transparent: true, opacity: 0.085, depthWrite: false,
  }))
  socketGuide.add(new THREE.Mesh(sphere.geometry, socketFillMaterial))
  const socketLineMaterial = material(new THREE.LineDashedMaterial({
    color: '#5c9f96', transparent: true, opacity: 0.62, dashSize: 0.1, gapSize: 0.065, depthWrite: false,
  }))
  const socketOutlinePoints: THREE.Vector3[] = []
  for (let index = 0; index <= 180; index++) {
    const angle = index / 180 * Math.PI * 2
    socketOutlinePoints.push(new THREE.Vector3(Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS, 0.02))
  }
  const socketOutline = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(socketOutlinePoints)), socketLineMaterial)
  socketOutline.computeLineDistances()
  socketGuide.add(socketOutline)
  const socketAxis = new THREE.Line(
    geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.54, 0), new THREE.Vector3(0, 2.54, 0)])),
    socketLineMaterial,
  )
  socketAxis.computeLineDistances()
  socketGuide.add(socketAxis)
  for (const direction of [-1, 1]) {
    const bearing = new THREE.Mesh(geometry(new THREE.TorusGeometry(0.14, 0.025, 8, 24)), socketFillMaterial)
    bearing.position.y = direction * 2.5
    socketGuide.add(bearing)
  }
  scene.add(socketGuide)

  type Pose = { position: THREE.Vector3; scale: number; tilt: number }
  type PoseTween = { from: Pose; to: Pose; started: number; duration: number }
  const poseTweens = new Map<THREE.Object3D, PoseTween>()
  const defaultGlobePosition = new THREE.Vector3(0, 0.05, 0)
  let parkedPose: Pose = { position: defaultGlobePosition.clone(), scale: 1, tilt: 0 }
  let socketPose: Pose = { position: defaultGlobePosition.clone(), scale: 1, tilt: 0 }
  let assemblyStandPose: Pose = { position: new THREE.Vector3(), scale: 1, tilt: 0 }
  let assemblyDrag: AssemblyDragId | null = null
  let assemblyDragValid: boolean | undefined
  const dragGrabOffset = new THREE.Vector3()
  let standDragOrigin: Pose | null = null
  let standReturningUntil = 0
  let interactionEnabled = true
  let completionPhase: 'socket' | 'presenting' | null = null
  let completionPhaseStarted = 0
  let presentationCameraFrom: THREE.Vector3 | null = null
  let traceViewKey = ''
  let traceRotationTween: { from: number; to: number; started: number; duration: number } | null = null

  function mountingActive() { return state.focus === 'mounting' && !state.mounted }
  function getPose(object: THREE.Object3D): Pose {
    return { position: object.position.clone(), scale: object.scale.x, tilt: object.rotation.z }
  }
  function applyPose(object: THREE.Object3D, pose: Pose) {
    object.position.copy(pose.position)
    object.scale.setScalar(pose.scale)
    object.rotation.z = pose.tilt
  }
  function tweenPose(object: THREE.Object3D, to: Pose, duration = 340) {
    poseTweens.set(object, { from: getPose(object), to, started: performance.now(), duration })
  }
  function updateControlAvailability() {
    controls.enabled = interactionEnabled && !mountingActive() && !instructionViewActive() && completionPhase === null && assemblyDrag === null && mapWrap === null
  }
  function traceSegment(id: TraceId) {
    if (!isLatitudeTrace(id)) return { start: 0, end: 1 }
    return state.traces[id] < 0.5 ? { start: 0, end: 0.5 } : { start: 0.5, end: 1 }
  }
  function updateInstructionView(animateRotation = true) {
    if (!instructionViewActive()) {
      traceViewKey = ''
      traceRotationTween = null
      return
    }
    const aspect = Math.max(width, 1) / Math.max(height, 1)
    const halfHeight = Math.max(3.5, 3.25 / aspect)
    instructionCamera.left = -halfHeight * aspect
    instructionCamera.right = halfHeight * aspect
    instructionCamera.top = halfHeight
    instructionCamera.bottom = -halfHeight
    instructionCamera.updateProjectionMatrix()
    const id = state.activeTrace
    const segment = id ? traceSegment(id) : { start: 0, end: 1 }
    const key = id ? `${id}:${segment.start}` : 'tilt'
    const cameraLatitude = id === 'equator' ? 16 : id === 'north-tropic' ? 26 : id === 'south-tropic' ? -26 : 0
    instructionCamera.position.set(0, Math.sin(cameraLatitude * DEG) * 12, Math.cos(cameraLatitude * DEG) * 12).add(defaultGlobePosition)
    instructionCamera.up.set(0, 1, 0)
    instructionCamera.lookAt(defaultGlobePosition)
    instructionCamera.updateMatrixWorld(true)
    if (key === traceViewKey) return
    traceViewKey = key
    poseTweens.delete(globe)
    applyPose(globe, { position: defaultGlobePosition.clone(), scale: 1, tilt: id ? 0 : axialTiltRadians() })
    if (id) {
      const target = isLatitudeTrace(id)
        ? (segment.start === 0 ? 0 : -Math.PI)
        : (-90 - (id === 'west-boundary' ? -20 : 160) + (id === 'west-boundary' ? -28 : 28)) * DEG
      const delta = Math.atan2(Math.sin(target - spin.rotation.y), Math.cos(target - spin.rotation.y))
      if (animateRotation && Math.abs(delta) > 0.025) {
        traceRotationTween = { from: spin.rotation.y, to: spin.rotation.y + delta, started: performance.now(), duration: 380 }
      } else {
        traceRotationTween = null
        spin.rotation.y += delta
      }
    } else traceRotationTween = null
  }
  function setMountingCamera() {
    // A fixed frontal work plane makes dragging predictable on both mice and touchscreens.
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    controls.target.set(0, 0, 0)
    camera.position.set(0, 0, 16)
    camera.up.set(0, 1, 0)
    camera.lookAt(controls.target)
    camera.updateMatrixWorld(true)
  }
  function updateAssemblyLayout() {
    const viewportHeight = 2 * Math.tan(camera.fov * DEG / 2) * 16
    const worldPerPixel = viewportHeight / Math.max(height, 1)
    const wide = width >= 640 && width / Math.max(height, 1) >= 1.25
    const narrow = width < 480
    const parkedRadius = wide ? Math.min(width * 0.14, height * 0.2) : Math.min(width * 0.23, height * 0.125)
    const socketRadius = wide ? Math.min(width * 0.2, height * 0.24) : Math.min(width * 0.31, height * 0.18)
    const worldPosition = (x: number, y: number) => new THREE.Vector3((x - width / 2) * worldPerPixel, (height / 2 - y) * worldPerPixel, 0)
    parkedPose = {
      position: worldPosition(width * (wide ? 0.24 : narrow ? 0.5 : 0.28), height * (wide ? 0.31 : 0.245)),
      scale: parkedRadius * worldPerPixel / RADIUS, tilt: axialTiltRadians(),
    }
    socketPose = {
      position: worldPosition(width * (wide ? 0.67 : narrow ? 0.5 : 0.6), height * (wide ? 0.53 : 0.66)),
      scale: socketRadius * worldPerPixel / RADIUS, tilt: axialTiltRadians(),
    }
    assemblyStandPose = {
      position: socketPose.position.clone().addScaledVector(defaultGlobePosition, -socketPose.scale),
      scale: socketPose.scale, tilt: 0,
    }
    applyPose(standGuide, assemblyStandPose)
    applyPose(socketGuide, socketPose)
    if (assemblyDrag !== 'mount-globe') tweenPose(globe, parkedPose)
    if (assemblyDrag !== 'stand') tweenPose(stand, assemblyStandPose)
  }

  function startMountCompletion() {
    assemblyDrag = null
    completionPhase = 'socket'
    completionPhaseStarted = performance.now()
    standReturningUntil = 0
    tweenPose(globe, socketPose, 280)
    tweenPose(stand, assemblyStandPose, 280)
    updateControlAvailability()
  }

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
      updateSphereMap()
      callbacks.onTextureStatus('ready')
    }, undefined, () => {
      if (disposed) return
      pendingTexture?.dispose()
      pendingTexture = null
      callbacks.onTextureStatus('error')
    })
  }

  function updateSphereMap() {
    const nextMap = state.map && !mapWrap ? earthTexture : null
    if (sphereMaterial.map !== nextMap) {
      sphereMaterial.map = nextMap
      sphereMaterial.needsUpdate = true
    }
    sphereMaterial.color.set(nextMap ? '#ffffff' : '#e2eff0')
  }

  function finishMapWrap(status: 'complete' | 'cancelled', notify = true) {
    if (!mapWrap) return
    const previous = mapWrap
    mapWrap = null
    spin.remove(previous.sheet.mesh)
    previous.sheet.dispose()
    spin.rotation.y = previous.spinStart
    camera.position.copy(previous.cameraOffset)
      .multiplyScalar(fittedViewDistance() / previous.fitDistance).add(controls.target)
    camera.lookAt(controls.target)
    // Swap the finished paper for the permanent sphere within one render frame.
    updateSphereMap()
    updateControlAvailability()
    if (notify) callbacks.onMapWrapState?.(status)
  }

  function cancelMapWrap() { finishMapWrap('cancelled') }

  function startMapWrap(): boolean {
    if (disposed || mapWrap || !earthTexture || !state.sphere || !state.map || mountingActive() || instructionViewActive()) return false
    // Flush any residual orbit damping before freezing the view.
    const damping = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
    scene.updateMatrixWorld(true)
    const sheet = createMapWrapMesh(earthTexture, RADIUS)
    // The sheet initially faces the student's current camera. Its final transform
    // is identity in spin, exactly matching the permanent SphereGeometry UVs.
    const startQuaternion = spin.getWorldQuaternion(new THREE.Quaternion()).invert()
      .multiply(camera.quaternion)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2))
    sheet.mesh.quaternion.copy(startQuaternion)
    spin.add(sheet.mesh)
    mapWrap = {
      sheet, started: performance.now(), startQuaternion, focus: state.focus,
      cameraOffset: camera.position.clone().sub(controls.target), fitDistance: fittedViewDistance(),
      spinStart: spin.rotation.y,
    }
    updateSphereMap()
    updateControlAvailability()
    callbacks.onMapWrapState?.('wrapping')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishMapWrap('complete')
    return true
  }

  const mapWrapIdentity = new THREE.Quaternion()
  function animateMapWrap(now: number) {
    if (!mapWrap) return
    const progress = THREE.MathUtils.clamp((now - mapWrap.started) / 3900, 0, 1)
    const pasted = mapWrap.sheet.update(progress)
    const turn = THREE.MathUtils.smoothstep(progress, 0, 0.12)
    mapWrap.sheet.mesh.quaternion.slerpQuaternions(mapWrap.startQuaternion, mapWrapIdentity, turn)
    // Turn the globe under the paper roll, keeping the contact edge visible on
    // the left. Pasted columns and the sphere share spin, so they cannot slide.
    const visibleEdge = 0.5 * THREE.MathUtils.smoothstep(progress, 0, 0.13)
      * (1 - THREE.MathUtils.smoothstep(progress, 0.91, 1))
    spin.rotation.y = mapWrap.spinStart + visibleEdge + Math.PI * 2 * pasted
    const resizeRatio = fittedViewDistance() / mapWrap.fitDistance
    const originalDistance = mapWrap.cameraOffset.length() * resizeRatio
    const verticalHalfAngle = camera.fov * DEG / 2
    const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * camera.aspect)
    const paperDistance = Math.max(originalDistance, 4.35 / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle)))
    const widen = THREE.MathUtils.smoothstep(progress, 0, 0.18) * (1 - THREE.MathUtils.smoothstep(progress, 0.82, 1))
    const distance = THREE.MathUtils.lerp(originalDistance, paperDistance, widen)
    camera.position.copy(mapWrap.cameraOffset).multiplyScalar(distance / mapWrap.cameraOffset.length()).add(controls.target)
    camera.lookAt(controls.target)
    if (progress === 1) finishMapWrap('complete')
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
    const visibleCamera = sceneCamera()
    cameraToPole.copy(poleWorld).sub(visibleCamera.position)
    const distance = cameraToPole.length()
    occlusionRay.set(visibleCamera.position, cameraToPole.normalize())
    worldSphere.center.copy(globeWorld)
    worldSphere.radius = (RADIUS - 0.015) * globe.scale.x
    const hit = occlusionRay.intersectSphere(worldSphere, intersection)
    return !hit || visibleCamera.position.distanceTo(intersection) >= distance - 0.07
  }
  function labelPosition(direction: number): LabelPosition {
    const localPosition = direction > 0 ? northPole.position : southPole.position
    const visible = state.sphere && state.poles && poleVisible(localPosition)
    projection.copy(localPosition).multiplyScalar(1.14)
    globe.localToWorld(projection)
    projection.project(sceneCamera())
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
    updateAssemblyGuides()
    updateTraceGuide()
    updateTiltGuide()
  }

  function projectPoint(localPoint: THREE.Vector3, parent: THREE.Object3D, visible = true): LabelPosition {
    const point = parent.localToWorld(localPoint.clone()).project(sceneCamera())
    return {
      x: (point.x * 0.5 + 0.5) * width,
      y: (0.5 - point.y * 0.5) * height,
      visible: visible && point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.95,
    }
  }

  let lastTraceGuide = ''
  const traceProjectionMatrix = new THREE.Matrix4()
  const lastTraceProjectionMatrix = new THREE.Matrix4()
  const traceProjectionPoint = new THREE.Vector3()
  function updateTraceGuide() {
    if (!callbacks.onTraceGuide) return
    const id = state.activeTrace
    const segment = id ? traceSegment(id) : { start: 0, end: 1 }
    const layer = id ? traceLayers.get(id) : null
    const hasPoints = !!layer && !traceRotationTween
    const key = `${id}:${segment.start}:${segment.end}:${width}:${height}:${hasPoints}`
    if (hasPoints) {
      const visibleCamera = sceneCamera()
      traceProjectionMatrix.multiplyMatrices(visibleCamera.projectionMatrix, visibleCamera.matrixWorldInverse)
        .multiply(spin.matrixWorld)
    }
    // Progress changes only the drawn portion, not its fixed guide. Reuse that
    // guide until the camera, globe, viewport or active half actually changes.
    if (key === lastTraceGuide && (!hasPoints || traceProjectionMatrix.equals(lastTraceProjectionMatrix))) return
    lastTraceGuide = key
    lastTraceProjectionMatrix.copy(traceProjectionMatrix)
    const points: TraceGuide['points'] = []
    if (hasPoints && layer) {
      for (let index = Math.round(segment.start * layer.segments); index <= Math.round(segment.end * layer.segments); index++) {
        traceProjectionPoint.copy(layer.points[index]!).applyMatrix4(traceProjectionMatrix)
        points.push({ x: (traceProjectionPoint.x * 0.5 + 0.5) * width, y: (0.5 - traceProjectionPoint.y * 0.5) * height })
      }
    }
    callbacks.onTraceGuide({ id, points, ...segment })
  }
  let lastTiltGuide = ''
  function updateTiltGuide() {
    if (!callbacks.onTiltGuide) return
    const centre = projectPoint(new THREE.Vector3(), globe, state.sphere && state.focus === 'tilt')
    const edge = projectPoint(globe.position.clone().add(new THREE.Vector3(RADIUS * globe.scale.x, 0, 0)), scene)
    const guide = { ...centre, radius: Math.abs(edge.x - centre.x) }
    const key = `${guide.x.toFixed(1)},${guide.y.toFixed(1)},${guide.radius.toFixed(1)},${guide.visible}`
    if (key !== lastTiltGuide) {
      lastTiltGuide = key
      callbacks.onTiltGuide(guide)
    }
  }

  const standGrabAnchor = new THREE.Vector3(0.65, -0.3, 0)
  function assemblyGuidePosition(pose: Pose, localPosition: THREE.Vector3, radius: number, visible: boolean): AssemblyGuidePosition {
    const world = localPosition.clone().multiplyScalar(pose.scale).add(pose.position)
    const point = projectPoint(world, scene, visible)
    const edge = projectPoint(world.clone().add(new THREE.Vector3(radius * pose.scale, 0, 0)), scene)
    return { ...point, radius: Math.max(0, Math.abs(edge.x - point.x)) }
  }
  function getAssemblyGuides(): AssemblyGuides {
    const active = mountingActive()
    return {
      // The source anchor intentionally stays parked while the real globe follows the pointer.
      parked: assemblyGuidePosition(parkedPose, new THREE.Vector3(), RADIUS, active && state.sphere),
      stand: assemblyGuidePosition(assemblyStandPose, standGrabAnchor, 2.65, active && !state.stand),
      socket: assemblyGuidePosition(socketPose, new THREE.Vector3(), RADIUS, active && state.stand),
    }
  }
  let lastAssemblyGuides = ''
  function updateAssemblyGuides() {
    if (!callbacks.onAssemblyGuides) return
    const guides = getAssemblyGuides()
    const key = Object.values(guides).map(value => `${value.x.toFixed(1)},${value.y.toFixed(1)},${value.radius.toFixed(1)},${value.visible}`).join(',')
    if (key !== lastAssemblyGuides) {
      lastAssemblyGuides = key
      callbacks.onAssemblyGuides(guides)
    }
  }

  function hitAssemblyTarget(id: AssemblyDragId, clientX: number, clientY: number): boolean {
    if (disposed || !mountingActive() || (id === 'stand' ? state.stand : !state.stand)) return false
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false
    const guide = getAssemblyGuides()[id === 'stand' ? 'stand' : 'socket']
    if (!guide.visible || !guide.radius) return false
    const dx = clientX - rect.left - guide.x
    const dy = clientY - rect.top - guide.y
    // The full silhouette is a target, without demanding contact with a two-pixel frame tube.
    return id === 'stand'
      ? (dx / (guide.radius * 0.7)) ** 2 + (dy / (guide.radius * 0.95)) ** 2 <= 1
      : Math.hypot(dx, dy) <= Math.max(28, guide.radius * 0.58)
  }

  const assemblyRaycaster = new THREE.Raycaster()
  const assemblyPointer = new THREE.Vector2()
  const assemblyWorkPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const assemblyPointerWorld = new THREE.Vector3()
  function setAssemblyDrag(id: AssemblyDragId | null, clientX?: number, clientY?: number, valid?: boolean) {
    if (disposed) return
    if (id === null) {
      const previousDrag = assemblyDrag
      assemblyDrag = null
      assemblyDragValid = undefined
      if (completionPhase === null && mountingActive()) {
        if (previousDrag === 'mount-globe') tweenPose(globe, parkedPose, 320)
        if (previousDrag === 'stand') {
          if (state.stand) tweenPose(stand, assemblyStandPose, 280)
          else if (standDragOrigin) {
            standReturningUntil = performance.now() + 280
            tweenPose(stand, standDragOrigin, 280)
          }
        }
      }
      updateAssemblyVisibility()
      updateControlAvailability()
      return
    }
    if (!mountingActive() || clientX === undefined || clientY === undefined || (id === 'stand' ? state.stand : !state.stand)) return
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    assemblyPointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1)
    assemblyRaycaster.setFromCamera(assemblyPointer, camera)
    if (!assemblyRaycaster.ray.intersectPlane(assemblyWorkPlane, assemblyPointerWorld)) return
    if (assemblyDrag !== id) {
      assemblyDrag = id
      standReturningUntil = 0
      if (id === 'mount-globe') dragGrabOffset.copy(globe.position).sub(assemblyPointerWorld)
      else {
        standDragOrigin = {
          position: assemblyPointerWorld.clone().addScaledVector(standGrabAnchor, -assemblyStandPose.scale),
          scale: assemblyStandPose.scale, tilt: 0,
        }
        applyPose(stand, standDragOrigin)
      }
    }
    assemblyDragValid = valid
    const object = id === 'stand' ? stand : globe
    poseTweens.delete(object)
    if (id === 'stand') {
      stand.position.copy(assemblyPointerWorld).addScaledVector(standGrabAnchor, -assemblyStandPose.scale)
      stand.scale.setScalar(assemblyStandPose.scale)
    } else {
      globe.position.copy(assemblyPointerWorld).add(dragGrabOffset)
      const distance = Math.max(parkedPose.position.distanceTo(socketPose.position), 0.01)
      const progress = THREE.MathUtils.smoothstep(1 - globe.position.distanceTo(socketPose.position) / distance, 0, 1)
      globe.scale.setScalar(THREE.MathUtils.lerp(parkedPose.scale, socketPose.scale, progress))
      globe.rotation.z = THREE.MathUtils.lerp(parkedPose.tilt, socketPose.tilt, progress)
    }
    updateAssemblyVisibility()
    updateControlAvailability()
    scene.updateMatrixWorld(true)
    updateLabels()
  }

  function updateAssemblyVisibility() {
    const active = mountingActive()
    stand.visible = state.stand || assemblyDrag === 'stand' || performance.now() < standReturningUntil
    supportFrame.visible = true
    standGuide.visible = active && !state.stand
    socketGuide.visible = active && state.stand
    const tint = assemblyDragValid === true ? '#3d9f78' : assemblyDragValid === false ? '#b88f61' : '#5c9f96'
    standGuideMaterial.color.set(tint)
    socketLineMaterial.color.set(tint)
    socketFillMaterial.color.set(tint)
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
    const axialTilt = projectPoint(new THREE.Vector3(0, 2.66, 0), globe, state.sphere && state.focus === 'tilt')
    axialTilt.x -= 24
    axialTilt.y -= 4
    equatorMove.y += 24
    equatorTilt.x += 22
    // Keep touch handles separated even when the ring is viewed almost edge-on.
    if (Math.hypot(equatorTilt.x - equatorMove.x, equatorTilt.y - equatorMove.y) < 72) {
      equatorTilt.x = equatorMove.x + 72
    }
    const handles = { axis, equatorMove, equatorTilt, axialTilt }
    const key = Object.values(handles).map(value => `${value.x.toFixed(1)},${value.y.toFixed(1)},${value.visible}`).join(',')
    if (key !== lastHandles) {
      lastHandles = key
      callbacks.onHandles(handles)
    }
  }

  /** Return a model value; Vue owns the state and its undo history. */
  function adjustFromDrag(kind: HandleKind, dx: number, dy: number, startValue: number): number {
    if (kind === 'axialTilt') {
      const angle = startValue * DEG
      const point = new THREE.Vector3(Math.sin(angle) * 2.6, Math.cos(angle) * 2.6, 0).add(defaultGlobePosition)
      const tangent = new THREE.Vector3(Math.cos(angle), -Math.sin(angle), 0).multiplyScalar(2.6 * DEG)
      const from = projectPoint(point, scene)
      const to = projectPoint(point.clone().add(tangent), scene)
      const vx = to.x - from.x
      const vy = to.y - from.y
      const lengthSq = vx * vx + vy * vy
      const delta = lengthSq > 0.1 ? (dx * vx + dy * vy) / lengthSq : dx * 0.3
      const value = THREE.MathUtils.clamp(startValue + delta, 0, 40)
      return Math.abs(value - AXIAL_TILT_DEGREES) <= 0.8 ? AXIAL_TILT_DEGREES : value
    }
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
    const wasMounting = mountingActive()
    const wasMounted = state.mounted
    state = { ...next, traces: { ...next.traces } }
    if (mapWrap && (!state.map || !state.sphere || state.focus !== mapWrap.focus)) cancelMapWrap()
    updateStandTilt()
    updateInstructionView()
    const isMounting = mountingActive()
    if (isMounting && !wasMounting) {
      completionPhase = null
      presentationCameraFrom = null
      setMountingCamera()
      updateAssemblyLayout()
    } else if (!wasMounted && state.mounted && wasMounting) {
      startMountCompletion()
    } else if (!wasMounted && state.mounted) {
      // Undo may restore a finished globe while a reset/revisit tween is still
      // moving its old pose. Restore the complete assembly atomically so that
      // the cancelled transition cannot later straighten the restored axis.
      completionPhase = null
      presentationCameraFrom = null
      assemblyDrag = null
      standReturningUntil = 0
      poseTweens.delete(globe)
      poseTweens.delete(stand)
      applyPose(globe, { position: defaultGlobePosition.clone(), scale: 1, tilt: axialTiltRadians() })
      applyPose(stand, { position: new THREE.Vector3(), scale: 1, tilt: 0 })
      setView('front')
    } else if (!isMounting && !state.mounted && (wasMounting || wasMounted)) {
      completionPhase = null
      assemblyDrag = null
      standReturningUntil = 0
      tweenPose(globe, { position: defaultGlobePosition.clone(), scale: 1, tilt: state.tiltAdjusted ? axialTiltRadians() : 0 })
      tweenPose(stand, { position: new THREE.Vector3(), scale: 1, tilt: 0 })
      setView('front')
    }
    globe.visible = state.sphere
    emptyGuide.visible = !state.sphere
    // A southern teaching view looks upward: workbench undersides would occlude
    // the globe. Keep the instructional canvas clear, then restore the workbench.
    const showWorkbench = !instructionViewActive()
    floor.visible = showWorkbench
    platform.visible = showWorkbench
    platformRim.visible = showWorkbench
    shadow.visible = state.sphere && !isMounting && showWorkbench
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
    // The student's trace is the permanent latitude; never replace it with a preset ring.
    equatorGroup.visible = false
    const offset = THREE.MathUtils.clamp(state.equatorOffset, -0.9, 0.9) * RADIUS
    const equatorRadius = Math.sqrt(RADIUS ** 2 - offset ** 2) + 0.012
    // Rotating the entire plane about the sphere's centre keeps its circle on the sphere.
    equatorGroup.rotation.z = state.equatorTilt * DEG
    equatorRing.position.y = offset
    equatorRing.scale.set(equatorRadius, equatorRadius, 1)
    latitudeGroup.visible = state.grid && state.latitude
    longitudeGroup.visible = state.grid && state.longitude
    tropicsGroup.visible = false
    polarCirclesGroup.visible = state.grid && state.polarCircles
    traceGroup.visible = state.sphere
    const tropicsComplete = (state.traces['north-tropic'] ?? 0) >= 1 && (state.traces['south-tropic'] ?? 0) >= 1
    for (const [id, layer] of traceLayers) {
      const progress = THREE.MathUtils.clamp(state.traces[id] ?? 0, 0, 1)
      const finishedTropic = (id === 'north-tropic' || id === 'south-tropic') && tropicsComplete && (!state.activeTrace || state.focus === 'finished')
      layer.object.visible = progress > 0 && (!finishedTropic || state.tropics)
      const count = layer.object instanceof THREE.Line
        ? Math.floor(progress * layer.segments) + 1
        : Math.floor(progress * layer.segments) * layer.indicesPerSegment
      layer.object.geometry.setDrawRange(0, count)
      if (layer.label) layer.label.visible = progress >= 0.55
    }
    tiltReference.visible = state.sphere && state.focus === 'tilt'
    if (!isMounting && completionPhase === null && !poseTweens.has(globe)) {
      globe.rotation.z = state.activeTrace ? 0 : state.focus === 'tilt' || state.tiltAdjusted || state.mounted ? axialTiltRadians() : 0
    }
    updateAssemblyVisibility()
    updateControlAvailability()
    if (!state.sphere) spin.rotation.y = 0
    if (state.map || state.focus === 'map' || state.focus === 'grid' || state.focus === 'finished') loadMap()
    updateSphereMap()
    renderer.domElement.style.cursor = state.selectedTool ? 'crosshair' : isMounting ? 'default' : 'grab'
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
    if (disposed || mapWrap) return null
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, sceneCamera())
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
  function resetPointerTracking() {
    const interruptedPointers = [...downPointers]
    activePointer = null
    downPointers.clear()
    multiTouch = false
    dragDistance = 0
    for (const pointerId of interruptedPointers) {
      try {
        if (renderer.domElement.hasPointerCapture(pointerId)) renderer.domElement.releasePointerCapture(pointerId)
      } catch { /* The browser may already have cancelled the pointer. */ }
    }
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', finishPointer)
  renderer.domElement.addEventListener('pointercancel', finishPointer)
  window.addEventListener('blur', resetPointerTracking)

  function resize() {
    if (disposed) return
    const nextWidth = Math.max(1, Math.round(host.clientWidth))
    const nextHeight = Math.max(1, Math.round(host.clientHeight))
    if (nextWidth === width && nextHeight === height) return
    const previousFitDistance = fittedViewDistance()
    width = nextWidth
    height = nextHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    updateViewDistanceLimit()
    if (!mountingActive() && completionPhase === null) {
      // Preserve the user's orbit direction and zoom relative to the fitted view.
      camera.position.sub(controls.target).multiplyScalar(fittedViewDistance() / previousFitDistance).add(controls.target)
      camera.updateMatrixWorld(true)
    }
    renderer.setSize(width, height, false)
    if (mountingActive()) {
      setMountingCamera()
      updateAssemblyLayout()
    }
    updateInstructionView(false)
    renderer.render(scene, sceneCamera())
    updateLabels()
  }

  function setView(view: 'front' | 'north') {
    if (disposed || mapWrap) return
    if (instructionViewActive()) {
      updateInstructionView(false)
      updateLabels()
      return
    }
    if (mountingActive()) {
      setMountingCamera()
      updateLabels()
      return
    }
    if (completionPhase !== null) return
    updateViewDistanceLimit()
    // Close to the equatorial plane so both pole targets remain accessible.
    controls.target.set(0, -0.05, 0)
    if (view === 'north') {
      const northDirection = new THREE.Vector3(0, 11.2, 0.12).normalize().multiplyScalar(fittedViewDistance())
      northDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), globe.rotation.z)
      camera.position.copy(northDirection).add(globe.position)
      controls.target.copy(globe.position)
    } else {
      camera.position.copy(frontViewPosition())
    }
    camera.up.set(0, 1, 0)
    controls.update()
    renderer.render(scene, sceneCamera())
    updateLabels()
  }
  function resetView() { setView('front') }
  function animateAssembly(now: number) {
    for (const [object, tween] of poseTweens) {
      const progress = THREE.MathUtils.clamp((now - tween.started) / tween.duration, 0, 1)
      const eased = 1 - (1 - progress) ** 3
      object.position.lerpVectors(tween.from.position, tween.to.position, eased)
      object.scale.setScalar(THREE.MathUtils.lerp(tween.from.scale, tween.to.scale, eased))
      object.rotation.z = THREE.MathUtils.lerp(tween.from.tilt, tween.to.tilt, eased)
      if (progress === 1) poseTweens.delete(object)
    }
    if (completionPhase === 'socket' && now - completionPhaseStarted >= 320) {
      completionPhase = 'presenting'
      completionPhaseStarted = now
      presentationCameraFrom = camera.position.clone()
      tweenPose(globe, { position: defaultGlobePosition.clone(), scale: 1, tilt: axialTiltRadians() }, 520)
      tweenPose(stand, { position: new THREE.Vector3(), scale: 1, tilt: 0 }, 520)
    }
    if (completionPhase === 'presenting' && presentationCameraFrom) {
      const progress = THREE.MathUtils.clamp((now - completionPhaseStarted) / 520, 0, 1)
      const eased = 1 - (1 - progress) ** 3
      camera.position.lerpVectors(presentationCameraFrom, frontViewPosition(), eased)
      controls.target.set(0, -0.05 * eased, 0)
      camera.lookAt(controls.target)
      if (progress === 1) {
        completionPhase = null
        presentationCameraFrom = null
        updateControlAvailability()
        callbacks.onMountComplete?.()
      }
    }
    const ground = mountingActive() || completionPhase === 'socket'
      ? assemblyStandPose
      : completionPhase === 'presenting'
        ? getPose(stand)
        : { position: new THREE.Vector3(), scale: 1, tilt: 0 }
    floor.position.y = ground.position.y - 3.09 * ground.scale
    platform.position.set(0, -3.015, 0).multiplyScalar(ground.scale).add(ground.position)
    platform.scale.setScalar(ground.scale)
    platformRim.position.set(0, -2.948, 0).multiplyScalar(ground.scale).add(ground.position)
    platformRim.scale.setScalar(ground.scale)
    shadow.position.set(0.25, -2.944, 0.12).multiplyScalar(ground.scale).add(ground.position)
    shadow.scale.setScalar(ground.scale)
    updateAssemblyVisibility()
  }
  function animate(time: number) {
    if (disposed) return
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
    previousTime = time
    if (state.rotating && state.sphere && state.mounted && !mapWrap) spin.rotation.y += delta * 0.26
    if (traceRotationTween) {
      const progress = THREE.MathUtils.clamp((performance.now() - traceRotationTween.started) / traceRotationTween.duration, 0, 1)
      spin.rotation.y = THREE.MathUtils.lerp(traceRotationTween.from, traceRotationTween.to, 1 - (1 - progress) ** 3)
      if (progress === 1) traceRotationTween = null
    }
    animateAssembly(performance.now())
    animateMapWrap(time)
    if (controls.enabled) controls.update()
    renderer.render(scene, sceneCamera())
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
    finishMapWrap('cancelled', false)
    cancelAnimationFrame(frame)
    window.removeEventListener('blur', resetPointerTracking)
    resetPointerTracking()
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
    interactionEnabled = enabled
    updateControlAvailability()
  }

  return { update, resize, resetView, setView, hitTarget, hitAssemblyTarget, setAssemblyDrag, adjustFromDrag, setInteractionEnabled, startMapWrap, cancelMapWrap, dispose }
}
