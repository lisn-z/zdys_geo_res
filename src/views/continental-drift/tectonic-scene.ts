import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { createContinuousPaleoSurface } from './continuous-paleo-surface'
import { getTectonicResources, type TectonicResources } from './scene-resources'
import { DEFAULT_TERRAIN_PALETTE, DEFAULT_TERRAIN_STYLE, TERRAIN_PALETTES, type TerrainPaletteId } from './terrain-palettes'
import {
  GLOBE_RADIUS, ProjectedSurface, ProjectedLineSet, geographicPoint, mapPoint, vectorLonLat,
  ROBINSON_MAP_HALF_WIDTH, ROBINSON_MAP_HALF_HEIGHT, createRobinsonMapGeometry, createRobinsonOutlineGeometry,
  geographicLines, projectLines, triangulateGeographic,
  type GeoCollection, type GeoFeature, type LonLat,
} from './tectonic-geometry'

export type TectonicMode = 'evolution' | 'present'
export type TectonicProjection = 'globe' | 'map'
export type PolarView = 'north' | 'south'
export type TerrainPalette = TerrainPaletteId
export interface TectonicLayers {
  boundaries: boolean
  motion: boolean
  volcanoes: boolean
  earthquakes: boolean
  faults: boolean
  grid: boolean
  terrain: boolean
  labels: boolean
  belts: boolean
  seismicity: boolean
}
export interface TectonicSceneState {
  mode: TectonicMode
  projection: TectonicProjection
  ageMa: number
  layers: TectonicLayers
  selectedPlate: string | null
  playing?: boolean
  follow?: boolean
  terrainPalette?: TerrainPalette
}
export type TectonicScenePatch = Omit<Partial<TectonicSceneState>, 'layers'> & { layers?: Partial<TectonicLayers> }
/** Public Vue state may supply only the layer switches present in its toolbar. */
export type SceneState = Omit<TectonicSceneState, 'layers'> & { layers: Partial<TectonicLayers> }
export interface TectonicLabel { id: string; groupId?: string; name: string; x: number; y: number; visible: boolean; color?: string; writingMode?: 'horizontal' | 'vertical'; rotationDeg?: number; letterSpacingPx?: number; opacity?: number; ancient?: boolean }
export interface TectonicCallbacks {
  onSelect: (id: string | null) => void
  onLabels?: (labels: TectonicLabel[]) => void
  onStatus?: (state: { loading: boolean; error: string }) => void
  onFollowChange?: (enabled: boolean) => void
  onPolarViewChange?: (pole: PolarView | null) => void
  onPlaybackReadyChange?: (ready: boolean) => void
  onMotionReferenceChange?: (ageMa: number | null) => void
  onFeatureHover?: (feature: { id: string; name: string; detail: string; x: number; y: number } | null) => void
}
type Pair = { globe: THREE.Group; map: THREE.Group }
type PlateVisual = {
  id: string; name: string; color: string; center: THREE.Vector3; area: number
  /** Display motion may use a reviewed teaching group; source identity and picking stay unchanged. */
  motionId?: string
  surface?: ProjectedSurface; globe: THREE.Mesh; map: THREE.Mesh
  material: THREE.MeshBasicMaterial; referenceAge: number; quaternion: THREE.Quaternion
  outline?: { surface: ProjectedLineSet; globe: THREE.LineSegments; map: THREE.LineSegments; material: THREE.LineBasicMaterial }
}
type ViewPose = { position: THREE.Vector3; target: THREE.Vector3; zoom: number }
type Flight = { start: number; duration: number; from: ViewPose; to: ViewPose; projection: TectonicProjection }
const DEG = Math.PI / 180
const BACKGROUND = '#f4f2eb'
const PALEO_LAND_COLOR = '#decda1'
const PRESENT_CENTRAL_MERIDIAN = 150
const EVOLUTION_LABELS = [
  { id: '101', name: '北美陆块' }, { id: '201', name: '南美陆块' },
  { id: '301', name: '欧亚主体' }, { id: '501', name: '印度陆块' },
  { id: '701', name: '非洲陆块' }, { id: '801', name: '澳大利亚陆块' },
  { id: '802', name: '南极陆块' },
]
/** Four-ocean school convention; the Atlantic repeat belongs only to the cut map. */
const OCEAN_LABELS: { id: string; name: string; centers: LonLat[]; halfLatitude?: number }[] = [
  { id: 'ocean-pacific', name: '太平洋', centers: [[-158, -18], [-145, -18], [-132, -18]] },
  { id: 'ocean-atlantic', name: '大西洋', centers: [[-42, 25], [-42, 15], [-42, 5]] },
  { id: 'ocean-atlantic-edge', name: '大西洋', centers: [[-13, -5], [-13, -15], [-13, -25]] },
  { id: 'ocean-indian', name: '印度洋', centers: [[61, -18], [73, -18], [85, -18]] },
  { id: 'ocean-arctic', name: '北冰洋', centers: [[20, 78], [115, 80], [-145, 78]] },
]
// Independent water anchors spread the name across the ocean, not into a large local word plaque.
const ARCTIC_MAP_CENTERS: LonLat[] = [[20, 78], [115, 80], [-145, 78]]
// Three water anchors form a readable left-to-right row in the north-pole view.
const ARCTIC_GLOBE_CENTERS: LonLat[] = [[-177.137595, 78.448430], [-18.434949, 88.187846], [-2.202598, 74.918531]]
const maximumAgeMa = 250
const IDENTITY = new THREE.Quaternion()

export function samplePlateRotation(id: string, ageMa: number, target = new THREE.Quaternion()): THREE.Quaternion {
  const samples = getTectonicResources().rotationIndex.get(id)?.rotations
  if (!samples?.length) return target.identity()
  const first = samples[0]!
  const last = samples[samples.length - 1]!
  if (ageMa <= first.ageMa) return target.fromArray(first.quaternion).normalize()
  if (ageMa >= last.ageMa) return target.fromArray(last.quaternion).normalize()
  let left = 0
  let right = samples.length - 1
  while (right - left > 1) {
    const middle = (left + right) >> 1
    if (samples[middle]!.ageMa <= ageMa) left = middle
    else right = middle
  }
  const a = samples[left]!
  const b = samples[right]!
  return target.fromArray(a.quaternion).slerp(new THREE.Quaternion().fromArray(b.quaternion), (ageMa - a.ageMa) / (b.ageMa - a.ageMa)).normalize()
}

function surfaceMeasures(triangles: Float32Array): { center: THREE.Vector3; area: number } {
  const center = new THREE.Vector3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const cross = new THREE.Vector3()
  const centroid = new THREE.Vector3()
  let area = 0
  // Solid angle weights prevent many small high-latitude triangles or coastline vertices from dragging a label away.
  for (let index = 0; index < triangles.length; index += 9) {
    a.fromArray(triangles, index).normalize()
    b.fromArray(triangles, index + 3).normalize()
    c.fromArray(triangles, index + 6).normalize()
    const triangleArea = 2 * Math.atan2(Math.abs(a.dot(cross.crossVectors(b, c))), 1 + a.dot(b) + b.dot(c) + c.dot(a))
    if (!Number.isFinite(triangleArea) || triangleArea <= 0) continue
    center.add(centroid.copy(a).add(b).add(c).normalize().multiplyScalar(triangleArea))
    area += triangleArea
  }
  return { center: center.lengthSq() > 0 ? center.normalize() : new THREE.Vector3(1, 0, 0), area }
}

/** The renderer and scene live for the entire lesson. Switching projection only selects a camera and prepared geometry. */
export function createTectonicScene(host: HTMLElement, callbacks: TectonicCallbacks, resources: TectonicResources) {
  const { present: { PRESENT_GROUPS, PRESENT_PLATES, PRESENT_BOUNDARIES },
    textbook: { TEXTBOOK_LABELS, TEXTBOOK_MOTION_PAIRS, TEXTBOOK_BELTS, TEXTBOOK_VOLCANOES,
      TEXTBOOK_QUAKES, TEXTBOOK_SEISMICITY, TEXTBOOK_PLATE_GROUPS },
    land: presentLandSource, labelNodes: paleoLabelNodes, nodes,
  } = resources
  let disposed = false
  let contextLost = false
  let frame = 0
  let lastTime = 0
  let width = 0
  let height = 0
  let pixelRatio = 0
  let resizeDirty = true
  let preparationRevision = 0
  let requestedContinuousAge: number | null = null
  let continuousRequest: Promise<void> | null = null
  let playbackReady = false
  let loadingPaleo = false
  let direction: -1 | 1 = -1
  let prefetchKey = ''
  let flight: Flight | null = null
  let pointerDown: { x: number; y: number; id: number } | null = null
  let labelClock = 0
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const errors = new Map<string, string>()
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const surfaces = new Set<ProjectedSurface>()
  const pickables: THREE.Object3D[] = []
  let state: TectonicSceneState = {
    mode: 'evolution', projection: 'globe', ageMa: maximumAgeMa, selectedPlate: null,
    layers: { boundaries: true, motion: true, volcanoes: true, earthquakes: true, faults: false, grid: true, terrain: true, labels: true, belts: false, seismicity: true },
    playing: false, follow: false, terrainPalette: DEFAULT_TERRAIN_PALETTE,
  }
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;'
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '海陆变迁三维地球，可拖动旋转、滚轮缩放、点击板块')
  host.appendChild(renderer.domElement)
  const globeCamera = new THREE.PerspectiveCamera(39, 1, 0.05, 100)
  // Orthographic rays reach the equatorial limb from either pole; perspective rays cannot.
  const polarCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.05, 100)
  let polarView: PolarView | null = null
  const mapCamera = new THREE.OrthographicCamera(-ROBINSON_MAP_HALF_WIDTH, ROBINSON_MAP_HALF_WIDTH, ROBINSON_MAP_HALF_HEIGHT, -ROBINSON_MAP_HALF_HEIGHT, 0.05, 100)
  mapCamera.position.set(0, 0, 30)
  const globeControls = new OrbitControls(globeCamera, renderer.domElement)
  const mapControls = new OrbitControls(mapCamera, renderer.domElement)
  const polarControls = new OrbitControls(polarCamera, renderer.domElement)
  polarControls.enableRotate = false
  polarControls.enablePan = false
  polarControls.enableDamping = false
  polarControls.minZoom = 0.65
  polarControls.maxZoom = 1
  globeControls.enableDamping = mapControls.enableDamping = true
  globeControls.dampingFactor = mapControls.dampingFactor = 0.085
  globeControls.enablePan = false
  globeControls.minDistance = GLOBE_RADIUS * 1.85
  globeControls.maxDistance = 70
  globeControls.rotateSpeed = 0.62
  globeControls.minPolarAngle = 0.015
  globeControls.maxPolarAngle = Math.PI - 0.015
  mapControls.enableRotate = false
  mapControls.screenSpacePanning = true
  mapControls.minZoom = 0.7
  mapControls.maxZoom = 3.2
  mapControls.mouseButtons.LEFT = THREE.MOUSE.PAN
  mapControls.touches.ONE = THREE.TOUCH.PAN
  mapControls.touches.TWO = THREE.TOUCH.DOLLY_PAN
  const globeRoot = new THREE.Group()
  const mapRoot = new THREE.Group()
  scene.add(globeRoot, mapRoot)
  const makePair = (): Pair => {
    const pair = { globe: new THREE.Group(), map: new THREE.Group() }
    globeRoot.add(pair.globe)
    mapRoot.add(pair.map)
    return pair
  }
  const presentPair = makePair()
  const presentLandPair = makePair()
  const gridPair = makePair()
  const presentGridPair = makePair()
  const polarEquatorPair = makePair()
  const beltPair = makePair()
  const boundaryPair = makePair()
  const selectedBoundaryPairs = new Map<string, Pair>()
  const motionPair = makePair()
  const volcanoPair = makePair()
  const quakePair = makePair()
  const seismicityPair = makePair()
  const textbookLabelPair = makePair()
  const oceanLabelPair = makePair()
  const arcticMapGlyphs: THREE.Mesh[] = []
  const arcticGlobeGlyphs: THREE.Mesh[] = []
  const textbookGlyphMaterials: { groupId: string; material: THREE.ShaderMaterial }[] = []
  const modernPlates: PlateVisual[] = []
  const camera = () => state.projection === 'globe' ? polarView ? polarCamera : globeCamera : mapCamera
  const mapMeridian = () => state.mode === 'present' ? PRESENT_CENTRAL_MERIDIAN : 0
  const mapWidthAtLatitude = (lat: number) => 2 * Math.abs(mapPoint(180, lat).x)
  function mapPointNear(lon: number, lat: number, lift: number, referenceX: number, meridian: number): THREE.Vector3 {
    const point = mapPoint(lon, lat, lift, meridian)
    const fullWidth = mapWidthAtLatitude(lat)
    if (point.x - referenceX > fullWidth / 2) point.x -= fullWidth
    else if (referenceX - point.x > fullWidth / 2) point.x += fullWidth
    return point
  }
  const controls = () => state.projection === 'globe' ? polarView ? polarControls : globeControls : mapControls
  const keepGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => { geometries.add(geometry); return geometry }
  const keepMaterial = <T extends THREE.Material>(material: T): T => { materials.add(material); return material }
  function reportStatus(): void {
    if (!disposed) callbacks.onStatus?.({ loading: loadingPaleo, error: [...errors.values()].join('；') })
  }
  function setError(key: string, message: string): void {
    if ((errors.get(key) ?? '') === message) return
    if (message) errors.set(key, message)
    else errors.delete(key)
    reportStatus()
  }
  function addLines(lines: LonLat[][], pair: Pair, color: THREE.ColorRepresentation, opacity = 1, lift = 0.045, dashed = false, centralMeridian = 0): void {
    const projected = projectLines(lines, lift, centralMeridian)
    const material = keepMaterial(dashed ? new THREE.LineDashedMaterial({ color, opacity, transparent: true, depthWrite: false, dashSize: 0.045, gapSize: 0.025 }) : new THREE.LineBasicMaterial({ color, opacity, transparent: true, depthWrite: false }))
    const globe = new THREE.LineSegments(keepGeometry(projected.globe), material)
    const map = new THREE.LineSegments(keepGeometry(projected.map), material)
    globe.renderOrder = map.renderOrder = 4
    if (dashed) { globe.computeLineDistances(); map.computeLineDistances() }
    pair.globe.add(globe); pair.map.add(map)
  }
  function addWideLines(lines: LonLat[][], pair: Pair, color: string, lineWidth: number, lift: number): void {
    const projected = projectLines(lines, lift, PRESENT_CENTRAL_MERIDIAN)
    const material = keepMaterial(new LineMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false, worldUnits: false }))
    material.linewidth = lineWidth
    for (const projection of ['globe', 'map'] as const) {
      const geometry = keepGeometry(new LineSegmentsGeometry().setPositions(projected[projection].getAttribute('position').array as Float32Array))
      const line = new LineSegments2(geometry, material)
      line.renderOrder = lineWidth > 2 ? 8 : 5
      pair[projection].add(line)
      projected[projection].dispose()
    }
  }

  // A simple ocean remains usable independently of reconstruction assets.
  const oceanMaterial = keepMaterial(new THREE.MeshBasicMaterial({ color: '#4da6c8' }))
  globeRoot.add(new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(GLOBE_RADIUS, 112, 72)), oceanMaterial))
  mapRoot.add(new THREE.Mesh(keepGeometry(createRobinsonMapGeometry()), oceanMaterial))
  const continuousSurface = createContinuousPaleoSurface({ renderer, nodes })
  globeRoot.add(continuousSurface.globe)
  mapRoot.add(continuousSurface.map)
  const mapFrame = new THREE.LineLoop(keepGeometry(createRobinsonOutlineGeometry(0.014)), keepMaterial(new THREE.LineBasicMaterial({ color: '#647e86', transparent: true, opacity: 0.52, depthWrite: false })))
  mapFrame.renderOrder = 1
  mapRoot.add(mapFrame)
  const rim = keepMaterial(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide,
    vertexShader: `varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }`,
    fragmentShader: `varying vec3 n; varying vec3 v; void main(){ float a=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0)*.13; gl_FragColor=vec4(.40,.57,.63,a); }`,
  }))
  globeRoot.add(new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 64, 48)), rim))

  const parallel = (lat: number): LonLat[] => Array.from({ length: 181 }, (_, index): LonLat => [-180 + index * 2, lat])
  addWideLines([parallel(0)], polarEquatorPair, '#ff4058', 1.8, 0.034)
  const grid: LonLat[][] = []
  for (let lat = -60; lat <= 60; lat += 30) if (lat) grid.push(parallel(lat))
  for (let lon = -180; lon < 180; lon += 30) grid.push(Array.from({ length: 91 }, (_, index): LonLat => [lon, -90 + index * 2]))
  for (const [pair, meridian] of [[gridPair, 0], [presentGridPair, PRESENT_CENTRAL_MERIDIAN]] as const) {
    addLines(grid, pair, '#a8fff6', 0.48, 0.028, false, meridian)
    addLines([parallel(0)], pair, '#ff4058', 0.90, 0.031, false, meridian)
    addLines([parallel(-23.5), parallel(23.5)], pair, '#ffd447', 0.90, 0.030, true, meridian)
    addLines([parallel(-66.5), parallel(66.5)], pair, '#66d9ff', 0.85, 0.030, true, meridian)
  }

  function makePlate(feature: GeoFeature, pair: Pair, id: string, name: string, color: string, referenceAge = 0, modern = false): PlateVisual | null {
    const triangles = triangulateGeographic(feature.geometry)
    if (!triangles.length) return null
    const surface = new ProjectedSurface(triangles, modern ? 0.017 : 0.022, modern ? PRESENT_CENTRAL_MERIDIAN : 0)
    surfaces.add(surface)
    const material = keepMaterial(new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: modern ? 0.27 : 0.88,
      side: THREE.DoubleSide, depthWrite: false,
    }))
    const globe = new THREE.Mesh(surface.globe, material)
    const map = new THREE.Mesh(surface.map, material)
    globe.renderOrder = map.renderOrder = modern ? 3 : 2
    globe.userData.plateId = map.userData.plateId = id
    pair.globe.add(globe)
    pair.map.add(map)
    pickables.push(globe, map)
    const measures = surfaceMeasures(triangles)
    const visual: PlateVisual = { id, name, color, surface, globe, map, material, referenceAge, ...measures, quaternion: new THREE.Quaternion() }
    // Numerical rotation partitions have no teaching outlines; avoid building invisible line meshes.
    return visual
  }
  for (const feature of (PRESENT_PLATES as unknown as GeoCollection).features) {
    const code = String(feature.properties?.code ?? '')
    const id = TEXTBOOK_PLATE_GROUPS[code]
    if (!id) continue
    const group = PRESENT_GROUPS.find(value => value.id === id)
    const visual = makePlate(feature, presentPair, id, group?.name ?? String(feature.properties?.label ?? id), group?.color ?? '#a5b9b7', 0, true)
    if (visual) modernPlates.push(visual)
  }
  // Modern coastlines are a separate high-detail vector dataset; they never enter the ancient reconstruction.
  const presentLand = presentLandSource as unknown as GeoCollection
  const landParts = presentLand.features.map(feature => triangulateGeographic(feature.geometry))
  const landTriangles = new Float32Array(landParts.reduce((length, part) => length + part.length, 0))
  let landOffset = 0
  for (const part of landParts) { landTriangles.set(part, landOffset); landOffset += part.length }
  const modernLandSurface = new ProjectedSurface(landTriangles, 0.010, PRESENT_CENTRAL_MERIDIAN)
  // This coastline never rotates relative to modern coordinates. Upload only used map vertices,
  // rather than the extra dateline-clipping capacity required by animated ancient meshes.
  function compactMapGeometry(surface: ProjectedSurface): void {
    for (const [name, components] of [['position', 3], ['uv', 2]] as const) {
      const attribute = surface.map.getAttribute(name)
      surface.map.setAttribute(name, new THREE.BufferAttribute(
        new Float32Array(attribute.array.slice(0, surface.map.drawRange.count * components)), components,
      ))
    }
  }
  compactMapGeometry(modernLandSurface)
  surfaces.add(modernLandSurface)
  const modernLandMaterial = keepMaterial(new THREE.MeshBasicMaterial({ color: '#f4ead1', side: THREE.DoubleSide }))
  presentLandPair.globe.add(new THREE.Mesh(modernLandSurface.globe, modernLandMaterial))
  presentLandPair.map.add(new THREE.Mesh(modernLandSurface.map, modernLandMaterial))
  addLines(presentLand.features.flatMap(feature => geographicLines(feature.geometry)), presentLandPair, '#527780', 0.62, 0.027, false, PRESENT_CENTRAL_MERIDIAN)
  const teachingBoundaries = (PRESENT_BOUNDARIES as unknown as GeoCollection).features.filter(feature => {
    const a = TEXTBOOK_PLATE_GROUPS[String(feature.properties?.plateA ?? '')]
    const b = TEXTBOOK_PLATE_GROUPS[String(feature.properties?.plateB ?? '')]
    return a && b && a !== b
  })
  const motionBoundarySegments = teachingBoundaries.flatMap(feature => geographicLines(feature.geometry).flatMap(line => line.slice(1).map((point, index) => ({
    a: geographicPoint(line[index]![0], line[index]![1], 1), b: geographicPoint(point[0], point[1], 1),
    type: String(feature.properties?.type ?? ''),
  }))))
  const placedMotionPairs = TEXTBOOK_MOTION_PAIRS.map(arrow => {
    const anchor = geographicPoint(arrow.lon, arrow.lat, 1)
    let closest: THREE.Vector3 | undefined
    let closestNormal: THREE.Vector3 | undefined
    // The southern-America icon is checked against the same-region Antarctic/South American convergence,
    // rather than the closer Scotia transform boundary. Other symbols stay within six degrees.
    let bestDistance = (arrow.id === 'southern-america' ? 8 : 6) * DEG
    for (const segment of motionBoundarySegments) {
      // A nearby transform segment must not silently replace a divergent or convergent teaching example.
      if (segment.type !== arrow.type) continue
      const normal = segment.a.clone().cross(segment.b)
      if (normal.lengthSq() < 1e-14) continue
      normal.normalize()
      const candidate = anchor.clone().addScaledVector(normal, -anchor.dot(normal)).normalize()
      if (candidate.dot(anchor) < 0) candidate.negate()
      const arc = segment.a.angleTo(segment.b)
      if (segment.a.angleTo(candidate) + candidate.angleTo(segment.b) > arc + 1e-7) {
        candidate.copy(anchor.angleTo(segment.a) <= anchor.angleTo(segment.b) ? segment.a : segment.b)
      }
      const distance = anchor.angleTo(candidate)
      if (distance < bestDistance) { closest = candidate; closestNormal = normal; bestDistance = distance }
    }
    if (!closest) return { ...arrow, sourceLongitude: arrow.lon }
    const [lon, lat] = vectorLonLat(closest)
    const east = new THREE.Vector3(-Math.sin(lon * DEG), 0, -Math.cos(lon * DEG))
    const north = new THREE.Vector3(-Math.sin(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG), Math.sin(lat * DEG) * Math.sin(lon * DEG))
    const normalBearing = Math.atan2(closestNormal!.dot(east), closestNormal!.dot(north)) / DEG
    const axisDifference = ((normalBearing - arrow.bearingDeg + 90) % 180 + 180) % 180 - 90
    // Preserve textbook bearings unless they would run mainly along the actual selected boundary.
    const bearingDeg = Math.abs(axisDifference) > 45 ? (arrow.bearingDeg + axisDifference + 360) % 360 : arrow.bearingDeg
    return { ...arrow, lon, lat, bearingDeg, sourceLongitude: arrow.lon,
      sourceRegion: arrow.id === 'southwest-pacific' ? '西南太平洋，六组概括后的挤压边界' : arrow.sourceRegion }
  })
  addWideLines(teachingBoundaries.flatMap(feature => geographicLines(feature.geometry)), boundaryPair, '#25292b', 1.6, 0.065)
  for (const group of PRESENT_GROUPS.filter(group => group.id !== 'other')) {
    const pair = makePair()
    const lines = teachingBoundaries.filter(feature => [feature.properties?.plateA, feature.properties?.plateB]
      .some(code => TEXTBOOK_PLATE_GROUPS[String(code)] === group.id)).flatMap(feature => geographicLines(feature.geometry))
    addWideLines(lines, pair, '#263c49', 3.6, 0.082)
    selectedBoundaryPairs.set(group.id, pair)
  }
  for (const feature of (TEXTBOOK_BELTS as unknown as GeoCollection).features) {
    const triangles = triangulateGeographic(feature.geometry)
    if (!triangles.length) continue
    const surface = new ProjectedSurface(triangles, 0.038, PRESENT_CENTRAL_MERIDIAN)
    surfaces.add(surface)
    const material = keepMaterial(new THREE.MeshBasicMaterial({ color: String(feature.properties?.color ?? '#b99166'), transparent: true, opacity: 0.70, side: THREE.DoubleSide, depthWrite: false }))
    const globe = new THREE.Mesh(surface.globe, material)
    const map = new THREE.Mesh(surface.map, material)
    globe.renderOrder = map.renderOrder = 4
    beltPair.globe.add(globe); beltPair.map.add(map)
  }

  const glyphTextures = new Map<string, THREE.CanvasTexture>()
  const glyphMaterialCache = new Map<string, THREE.ShaderMaterial>()
  function glyphTexture(character: string): THREE.CanvasTexture {
    const cached = glyphTextures.get(character)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 192
    const context = canvas.getContext('2d')!
    context.font = '600 156px "Microsoft YaHei", "Noto Sans SC", "SimSun", sans-serif'
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.lineJoin = 'round'
    // RGB distinguishes the narrow pale outline from the dark ink; alpha preserves antialiasing.
    context.strokeStyle = '#ffffff'; context.lineWidth = 8
    context.strokeText(character, 96, 100)
    context.fillStyle = '#000000'; context.fillText(character, 96, 100)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    textures.add(texture); glyphTextures.set(character, texture)
    return texture
  }
  function glyphMaterial(character: string, groupId: string, ocean = false): THREE.ShaderMaterial {
    const key = `${groupId}:${character}`
    const cached = glyphMaterialCache.get(key)
    if (cached) return cached
    const material = keepMaterial(new THREE.ShaderMaterial({
      uniforms: { glyph: { value: glyphTexture(character) }, ink: { value: new THREE.Color(ocean ? '#074d78' : '#26363a') }, halo: { value: new THREE.Color(ocean ? '#f4fbff' : '#fffaf0') }, opacity: { value: 1 } },
      transparent: true, depthTest: true, depthWrite: false, side: THREE.FrontSide,
      vertexShader: 'varying vec2 glyphUv; void main(){glyphUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform sampler2D glyph; uniform vec3 ink; uniform vec3 halo; uniform float opacity; varying vec2 glyphUv;
        void main(){vec4 texel=texture2D(glyph,glyphUv);if(texel.a<0.025)discard;gl_FragColor=vec4(mix(ink,halo,texel.r),texel.a*opacity);
        #include <colorspace_fragment>
        }`,
    }))
    glyphMaterialCache.set(key, material)
    if (!ocean) textbookGlyphMaterials.push({ groupId, material })
    return material
  }
  function textbookGlyphGeometry(lon: number, lat: number, rotationDeg: number, projection: TectonicProjection, halfLatitude = 3): THREE.BufferGeometry {
    const angle = rotationDeg * DEG
    const cosine = Math.cos(angle), sine = Math.sin(angle)
    const center = mapPoint(lon, lat, 0.115, PRESENT_CENTRAL_MERIDIAN)
    const dx = Math.abs(mapPointNear(lon + 0.1, lat, 0.115, center.x, PRESENT_CENTRAL_MERIDIAN).x - center.x) / 0.1
    const dy = Math.abs(mapPoint(lon, lat + 0.1, 0.115, PRESENT_CENTRAL_MERIDIAN).y - center.y) / 0.1
    const halfLongitude = projection === 'globe' ? halfLatitude / Math.max(Math.cos(lat * DEG), 0.25) : halfLatitude * dy / Math.max(dx, 0.0001)
    if (projection === 'map') {
      const edgeMargin = Math.abs(halfLongitude * cosine) + Math.abs(halfLatitude * sine) + 0.15
      const relative = ((lon - PRESENT_CENTRAL_MERIDIAN + 180) % 360 + 360) % 360 - 180
      lon = PRESENT_CENTRAL_MERIDIAN + THREE.MathUtils.clamp(relative, -180 + edgeMargin, 180 - edgeMargin)
    }
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    const segments = 3
    for (let row = 0; row <= segments; row += 1) for (let col = 0; col <= segments; col += 1) {
      const x = (col / segments * 2 - 1) * halfLongitude
      const y = (row / segments * 2 - 1) * halfLatitude
      const longitude = lon + x * cosine + y * sine
      const latitude = THREE.MathUtils.clamp(lat - x * sine + y * cosine, -89.5, 89.5)
      const point = projection === 'globe' ? geographicPoint(longitude, latitude, GLOBE_RADIUS + 0.115) : mapPoint(longitude, latitude, 0.115, PRESENT_CENTRAL_MERIDIAN)
      positions.push(point.x, point.y, point.z); uvs.push(col / segments, row / segments)
      if (row < segments && col < segments) {
        const a = row * (segments + 1) + col, b = a + 1, c = a + segments + 1, d = c + 1
        indices.push(a, b, c, b, d, c)
      }
    }
    const geometry = keepGeometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)).setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)).setIndex(indices))
    geometry.computeBoundingSphere()
    return geometry
  }
  for (const label of TEXTBOOK_LABELS) {
    const characters = Array.from(label.name)
    const angle = label.rotationDeg * DEG
    for (const [index, character] of characters.entries()) {
      const advance = (index - (characters.length - 1) / 2) * label.letterSpacingDeg
      const x = label.writingMode === 'vertical' ? 0 : advance
      const y = label.writingMode === 'vertical' ? -advance : 0
      const lon = label.glyphCenters?.[index]?.[0] ?? label.lon + x * Math.cos(angle) + y * Math.sin(angle)
      const lat = label.glyphCenters?.[index]?.[1] ?? label.lat - x * Math.sin(angle) + y * Math.cos(angle)
      const material = glyphMaterial(character, label.groupId)
      for (const projection of ['globe', 'map'] as const) {
        // The cut-edge repeat belongs to the flat atlas only; the globe has no duplicated Atlantic edge.
        if (projection === 'globe' && label.id.endsWith('-edge')) continue
        const mesh = new THREE.Mesh(textbookGlyphGeometry(lon, lat, label.rotationDeg, projection), material)
        mesh.renderOrder = 10
        mesh.userData = { plateId: label.groupId, textbookLabel: true, projection }
        textbookLabelPair[projection].add(mesh); pickables.push(mesh)
      }
    }
  }
  function arcticGlyphPoint(index: number, x: number, y: number): THREE.Vector3 {
    const center = ARCTIC_GLOBE_CENTERS[index]!
    const normal = geographicPoint(center[0], center[1], 1)
    // Align each independent patch to the north-pole screen axes, then conform it to the sphere.
    const right = new THREE.Vector3(1, 0, 0).addScaledVector(normal, -normal.x).normalize()
    const up = normal.clone().cross(right).normalize()
    return normal.multiplyScalar(GLOBE_RADIUS).addScaledVector(right, x).addScaledVector(up, y)
      .normalize().multiplyScalar(GLOBE_RADIUS + 0.115)
  }
  function arcticGlyphGeometry(index: number, projection: TectonicProjection): THREE.BufferGeometry {
    if (projection === 'map') {
      // Robinson determines the anchor only. An orthogonal XY quad preserves upright square lettering.
      return keepGeometry(new THREE.BufferGeometry()
        .setAttribute('position', new THREE.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0], 3))
        .setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2))
        .setIndex([0, 1, 2, 1, 3, 2]))
    }
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    const segments = 3, size = .34
    for (let row = 0; row <= segments; row += 1) for (let col = 0; col <= segments; col += 1) {
      const point = arcticGlyphPoint(index, (col / segments - .5) * size, (row / segments - .5) * size)
      positions.push(point.x, point.y, point.z); uvs.push(col / segments, row / segments)
      if (row < segments && col < segments) {
        const a = row * (segments + 1) + col, b = a + 1, c = a + segments + 1
        indices.push(a, b, c, b, c + 1, c)
      }
    }
    return keepGeometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)).setIndex(indices))
  }
  function updateArcticMapLayout(): void {
    if (!height) return
    const size = 22 * (mapCamera.top - mapCamera.bottom) / height
    for (const [index, mesh] of arcticMapGlyphs.entries()) {
      const center = ARCTIC_MAP_CENTERS[index]!
      mesh.scale.set(size, size, 1)
      mesh.position.copy(mapPoint(center[0], center[1], .115, PRESENT_CENTRAL_MERIDIAN))
    }
  }
  function updateArcticGlobeLayout(): void {
    if (!height || state.mode !== 'present' || state.projection !== 'globe') return
    for (const [index, mesh] of arcticGlobeGlyphs.entries()) {
      const center = ARCTIC_GLOBE_CENTERS[index]!
      const anchor = geographicPoint(center[0], center[1], GLOBE_RADIUS + 0.115)
      const worldPerPixel = polarView
        ? (polarCamera.top - polarCamera.bottom) / height / polarCamera.zoom
        : 2 * globeCamera.position.distanceTo(anchor) * Math.tan(globeCamera.fov * DEG / 2) / height / globeCamera.zoom
      const size = THREE.MathUtils.clamp(28 * worldPerPixel, 0.14, 0.60)
      if (Math.abs(Number(mesh.userData.arcticSize ?? 0) - size) < 0.001) continue
      const attribute = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let row = 0; row <= 3; row += 1) for (let col = 0; col <= 3; col += 1) {
        const point = arcticGlyphPoint(index, (col / 3 - .5) * size, (row / 3 - .5) * size)
        attribute.setXYZ(row * 4 + col, point.x, point.y, point.z)
      }
      attribute.needsUpdate = true
      mesh.geometry.computeBoundingSphere()
      mesh.userData.arcticSize = size
    }
  }
  for (const label of OCEAN_LABELS) for (const [index, character] of Array.from(label.name).entries()) {
    const center = label.centers[index]
    if (!center) continue
    const material = glyphMaterial(character, 'ocean', true)
    for (const projection of ['globe', 'map'] as const) {
      if (projection === 'globe' && label.id.endsWith('-edge')) continue
      const arctic = label.id === 'ocean-arctic'
      const geometry = arctic ? arcticGlyphGeometry(index, projection) : textbookGlyphGeometry(center[0], center[1], 0, projection, label.halfLatitude ?? 2.3)
      const mesh = new THREE.Mesh(geometry, material)
      if (arctic && projection === 'map') arcticMapGlyphs.push(mesh)
      if (arctic && projection === 'globe') arcticGlobeGlyphs.push(mesh)
      mesh.renderOrder = 10
      oceanLabelPair[projection].add(mesh)
    }
  }

  function makeSymbolTexture(kind: 'volcano' | 'quake', color: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, 64, 64)
    if (kind === 'volcano') {
      context.fillStyle = color; context.strokeStyle = '#fffaf0'; context.lineWidth = 5; context.beginPath()
      // Textbook cone: two crater lips and a low filled cone, rather than a coloured point.
      context.moveTo(7, 55); context.lineTo(25, 15); context.lineTo(32, 23)
      context.lineTo(39, 15); context.lineTo(57, 55); context.closePath()
      context.fill(); context.stroke()
    } else {
      for (const [radius, fill] of [[30, color === '#c5473b' ? '#632826' : '#244d29'], [27, '#fffdf4'], [23, color]] as const) {
        context.fillStyle = fill; context.beginPath(); context.arc(32, 32, radius, 0, Math.PI * 2); context.fill()
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    textures.add(texture)
    return texture
  }
  function addPoints(points: readonly { lon: number; lat: number }[], pair: Pair, kind: 'volcano' | 'quake', color: string, size: number): void {
    const globe: number[] = []
    const map: number[] = []
    for (const point of points) {
      const lift = kind === 'quake' ? 0.095 : 0.075
      globe.push(...geographicPoint(point.lon, point.lat, GLOBE_RADIUS + lift).toArray())
      map.push(...mapPoint(point.lon, point.lat, lift, PRESENT_CENTRAL_MERIDIAN).toArray())
    }
    const material = keepMaterial(new THREE.PointsMaterial({ map: makeSymbolTexture(kind, color), size, sizeAttenuation: false, transparent: true, alphaTest: 0.12, depthWrite: false }))
    const globePoints = new THREE.Points(keepGeometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(globe, 3))), material)
    const mapPoints = new THREE.Points(keepGeometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(map, 3))), material)
    globePoints.renderOrder = mapPoints.renderOrder = kind === 'quake' ? 9 : 5
    pair.globe.add(globePoints); pair.map.add(mapPoints)
  }
  addPoints(TEXTBOOK_VOLCANOES, volcanoPair, 'volcano', '#222327', 13)
  // Three multiplies PointsMaterial.size by DPR. A 60/64px drawn disk therefore has ~8.4/11.3 CSS-pixel diameter.
  addPoints(TEXTBOOK_QUAKES.filter(point => (point.mag ?? 0) < 8), quakePair, 'quake', '#699e40', 9)
  addPoints(TEXTBOOK_QUAKES.filter(point => (point.mag ?? 0) >= 8), quakePair, 'quake', '#c5473b', 12)
  // A single historical catalogue supplies both the fine distribution and the strong-event symbols.
  // Keep every measured coordinate; no regional hulls, invented jitter or synthetic density points.
  const seismicityGlobe: number[] = [], seismicityMap: number[] = []
  for (const point of TEXTBOOK_SEISMICITY) {
    seismicityGlobe.push(...geographicPoint(point.lon, point.lat, GLOBE_RADIUS + 0.072).toArray())
    seismicityMap.push(...mapPoint(point.lon, point.lat, 0.072, PRESENT_CENTRAL_MERIDIAN).toArray())
  }
  const seismicityMaterial = keepMaterial(new THREE.PointsMaterial({ color: '#824a35', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.42, depthWrite: false }))
  for (const [projection, coordinates] of [['globe', seismicityGlobe], ['map', seismicityMap]] as const) {
    const points = new THREE.Points(keepGeometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3))), seismicityMaterial)
    points.renderOrder = 6
    seismicityPair[projection].add(points)
  }

  function destination(lon: number, lat: number, bearing: number, angle: number): LonLat {
    const phi = lat * DEG
    const theta = bearing * DEG
    const latitude = Math.asin(Math.sin(phi) * Math.cos(angle) + Math.cos(phi) * Math.sin(angle) * Math.cos(theta))
    const longitude = lon * DEG + Math.atan2(Math.sin(theta) * Math.sin(angle) * Math.cos(phi), Math.cos(angle) - Math.sin(phi) * Math.sin(latitude))
    return [((longitude / DEG + 540) % 360) - 180, latitude / DEG]
  }
  // Paired textbook symbols show the local divergent/convergent relationship, not absolute velocity.
  // Meshes keep the shafts, triangular heads and central separator legible at any zoom.
  const motionViewport = { value: new THREE.Vector2(1, 1) }
  function pairedArrowShape(type: 'divergent' | 'convergent'): number[] {
    const arrow = [3, -1.1, 13, -1.1, 13, 1.1, 3, -1.1, 13, 1.1, 3, 1.1, 11, -4, 18, 0, 11, 4]
    const output = [-0.85, -6, 0.85, -6, 0.85, 6, -0.85, -6, 0.85, 6, -0.85, 6]
    for (const side of [-1, 1]) for (let index = 0; index < arrow.length; index += 2) {
      output.push(side * (type === 'divergent' ? arrow[index]! : 21 - arrow[index]!), arrow[index + 1]!)
    }
    return output
  }
  function motionMapPoint(arrow: typeof placedMotionPairs[number]): THREE.Vector3 {
    const point = mapPoint(arrow.lon, arrow.lat, 0.085, PRESENT_CENTRAL_MERIDIAN)
    const sourceX = mapPoint(arrow.sourceLongitude, arrow.lat, 0.085, PRESENT_CENTRAL_MERIDIAN).x
    const mapWidth = mapWidthAtLatitude(arrow.lat)
    // Preserve the authored side at the map cut: a sub-degree snap must not jump across the whole atlas.
    if (point.x - sourceX > mapWidth / 2) point.x -= mapWidth
    else if (sourceX - point.x > mapWidth / 2) point.x += mapWidth
    return point
  }
  function createMotionGeometry(projection: TectonicProjection): THREE.BufferGeometry {
    const positions: number[] = []
    const directions: number[] = []
    const shapes: number[] = []
    const senses: number[] = []
    for (const arrow of placedMotionPairs) {
      const arrowShape = pairedArrowShape(arrow.type)
      const end = destination(arrow.lon, arrow.lat, arrow.bearingDeg, 0.045)
      // A map arrow crossing 180° must still point along the local bearing.
      while (end[0] - arrow.lon > 180) end[0] -= 360
      while (end[0] - arrow.lon < -180) end[0] += 360
      const anchor = projection === 'globe' ? geographicPoint(arrow.lon, arrow.lat, GLOBE_RADIUS + 0.085) : motionMapPoint(arrow)
      const direction = projection === 'globe' ? geographicPoint(end[0], end[1], GLOBE_RADIUS + 0.085)
        : mapPointNear(end[0], end[1], 0.085, anchor.x, PRESENT_CENTRAL_MERIDIAN)
      for (let index = 0; index < arrowShape.length; index += 2) {
        positions.push(anchor.x, anchor.y, anchor.z)
        directions.push(direction.x, direction.y, direction.z)
        shapes.push(arrowShape[index]!, arrowShape[index + 1]!)
        senses.push(arrow.type === 'divergent' ? 1 : -1)
      }
    }
    return keepGeometry(new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      .setAttribute('geographicDirection', new THREE.Float32BufferAttribute(directions, 3))
      .setAttribute('arrowOffset', new THREE.Float32BufferAttribute(shapes, 2))
      .setAttribute('motionSense', new THREE.Float32BufferAttribute(senses, 1)))
  }
  const motionTime = { value: 0 }
  const motionEnabled = { value: reducedMotion.matches ? 0 : 1 }
  function motionMaterial(color: string, scaleX: number, scaleY: number): THREE.ShaderMaterial {
    return keepMaterial(new THREE.ShaderMaterial({
      uniforms: { viewport: motionViewport, symbolScale: { value: new THREE.Vector2(scaleX, scaleY) }, color: { value: new THREE.Color(color) }, motionTime, motionEnabled, animatedInk: { value: scaleX === 1 ? 1 : 0 } },
      transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        attribute vec3 geographicDirection;
        attribute vec2 arrowOffset;
        attribute float motionSense;
        varying vec2 symbolOffset;
        varying float flowSense;
        uniform vec2 viewport;
        uniform vec2 symbolScale;
        void main() {
          symbolOffset = arrowOffset; flowSense = motionSense;
          vec4 origin = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 toward = projectionMatrix * modelViewMatrix * vec4(geographicDirection, 1.0);
          vec2 delta = (toward.xy / toward.w - origin.xy / origin.w) * viewport;
          vec2 direction = delta / max(length(delta), 0.000001);
          vec2 perpendicular = vec2(-direction.y, direction.x);
          vec2 pixels = direction * arrowOffset.x * symbolScale.x + perpendicular * arrowOffset.y * symbolScale.y;
          gl_Position = origin;
          gl_Position.xy += pixels * 2.0 / max(viewport, vec2(1.0)) * origin.w;
        }
      `,
      fragmentShader: `uniform vec3 color; uniform float motionTime; uniform float motionEnabled; uniform float animatedInk;
        varying vec2 symbolOffset; varying float flowSense;
        void main() {
        float phase = fract(motionTime * 0.24 - flowSense * abs(symbolOffset.x) / 18.0);
        float pulse = smoothstep(0.60,0.74,phase) * (1.0-smoothstep(0.74,0.90,phase));
        float shaft = smoothstep(3.0,4.0,abs(symbolOffset.x)) * (1.0-smoothstep(1.0,2.0,abs(symbolOffset.y)));
        // Only a small ink highlight travels. Anchors, centre bars and arrow geometry never move.
        gl_FragColor = vec4(mix(color,vec3(0.42),pulse*shaft*motionEnabled*animatedInk*0.72), 1.0);
        #include <colorspace_fragment>
      }`,
    }))
  }
  const arrowHalo = motionMaterial('#f8f3e6', 1.07, 1.30)
  const arrowFill = motionMaterial('#23252a', 1, 1)
  for (const projection of ['globe', 'map'] as const) {
    const geometry = createMotionGeometry(projection)
    const halo = new THREE.Mesh(geometry, arrowHalo)
    const fill = new THREE.Mesh(geometry, arrowFill)
    halo.renderOrder = 6; fill.renderOrder = 7
    // Clip-space expansion is intentionally absent from the CPU anchor bounding box.
    halo.frustumCulled = fill.frustumCulled = false
    motionPair[projection].add(halo, fill)
  }

  function setPlaybackReady(ready: boolean): void {
    if (playbackReady === ready) return
    playbackReady = ready
    callbacks.onPlaybackReadyChange?.(ready)
  }
  function prefetchContinuous(): void {
    const key = `${Math.floor(state.ageMa / 5)}:${direction}`
    if (prefetchKey === key) return
    prefetchKey = key
    continuousSurface.prefetch(state.ageMa, direction)
  }
  function updateContinuous(): Promise<void> {
    if (disposed || state.mode !== 'evolution') return Promise.resolve()
    if (continuousSurface.setAge(state.ageMa)) {
      const wasLoading = loadingPaleo
      preparationRevision += 1
      requestedContinuousAge = null
      loadingPaleo = false
      setPlaybackReady(true)
      setError('paleo', '')
      if (wasLoading) reportStatus()
      prefetchContinuous()
      return Promise.resolve()
    }
    setPlaybackReady(false)
    if (requestedContinuousAge === state.ageMa && continuousRequest) return continuousRequest
    const age = state.ageMa
    const revision = ++preparationRevision
    requestedContinuousAge = age
    loadingPaleo = true
    reportStatus()
    const request = continuousSurface.prepareAge(age).then(() => {
      if (disposed || revision !== preparationRevision || state.mode !== 'evolution' || state.ageMa !== age) return
      setPlaybackReady(continuousSurface.setAge(age))
      setError('paleo', '')
      prefetchContinuous()
      updateLabels()
    }).catch(error => {
      if (disposed || revision !== preparationRevision) return
      console.warn('[continental-drift] reconstruction unavailable', error)
      setError('paleo', '这一时刻的资料暂未加载，当前画面已保留，可以重试或选择其他年代')
    }).finally(() => {
      if (disposed || revision !== preparationRevision) return
      loadingPaleo = false
      requestedContinuousAge = null
      continuousRequest = null
      reportStatus()
    })
    continuousRequest = request
    return request
  }
  function evolutionLabelCenters() {
    const age = continuousSurface.getRenderedAge() ?? state.ageMa
    const older = paleoLabelNodes.find(node => node.ageMa >= age) ?? paleoLabelNodes[paleoLabelNodes.length - 1]!
    const younger = [...paleoLabelNodes].reverse().find(node => node.ageMa <= age) ?? paleoLabelNodes[0]!
    const t = older.ageMa === younger.ageMa ? 0 : (age - younger.ageMa) / (older.ageMa - younger.ageMa)
    const cores = EVOLUTION_LABELS.flatMap(label => {
      const a = younger.labels.find(point => String(point.id) === label.id)
      const b = older.labels.find(point => String(point.id) === label.id)
      if (!a && !b) return []
      const first = a ?? b!, last = b ?? a!
      const center = geographicPoint(first.lon, first.lat, 1).lerp(geographicPoint(last.lon, last.lat, 1), t).normalize()
      return [{ ...label, color: PALEO_LAND_COLOR, center }]
    })
    // These crossfade windows govern map labelling, not instantaneous geological events.
    // 250 Ma: Pangaea; 200 Ma: Laurasia/Gondwana; 135 Ma onward: their dispersing fragments.
    // North America anchors Laurasia; Africa anchors Gondwana. India belongs to Gondwana.
    const pangaeaOpacity = THREE.MathUtils.smoothstep(age, 205, 225)
    const groupedOpacity = THREE.MathUtils.smoothstep(age, 145, 165)
    const northern = cores.find(label => label.id === '101')
    const southern = cores.find(label => label.id === '701')
    const ancient = []
    if (northern && southern) {
      ancient.push({ id: 'pangaea', name: '盘古大陆（联合古陆）', center: northern.center.clone().lerp(southern.center, .6).normalize(), opacity: pangaeaOpacity })
      ancient.push({ id: 'laurasia', name: '劳亚大陆', center: northern.center, opacity: groupedOpacity * (1 - pangaeaOpacity) })
      ancient.push({ id: 'gondwana', name: '冈瓦纳大陆', center: southern.center, opacity: groupedOpacity * (1 - pangaeaOpacity) })
    }
    return [
      ...ancient.map(label => ({ ...label, ancient: true, color: PALEO_LAND_COLOR })),
      ...cores.map(label => ({ ...label, ancient: false, opacity: 1 - groupedOpacity })),
    ].filter(label => label.opacity > .015)
  }
  function applySelection(): void {
    const palette = TERRAIN_PALETTES.find(value => value.id === state.terrainPalette) ?? DEFAULT_TERRAIN_STYLE
    oceanMaterial.color.set(state.mode === 'present' ? '#4da6c8' : palette.sea)
    continuousSurface.setPalette(palette.id)
    continuousSurface.setTerrainEnabled(state.layers.terrain)
    const selected = state.selectedPlate
    for (const glyph of textbookGlyphMaterials) {
      const active = !selected || glyph.groupId === selected
      glyph.material.uniforms.opacity!.value = active ? 1 : 0.36
      glyph.material.uniforms.ink!.value.set(selected && active ? '#102e35' : '#26363a')
      glyph.material.uniforms.halo!.value.set(selected && active ? '#fff0b0' : '#fffaf0')
    }
    for (const plate of modernPlates) {
      const active = !selected || selected === plate.id
      plate.material.opacity = selected ? active ? 0.90 : 0.74 : 0.38
      plate.material.color.set(selected && !active ? '#edf0e9' : plate.color)
    }
  }
  function applyVisibility(): void {
    globeRoot.visible = state.projection === 'globe'
    mapRoot.visible = state.projection === 'map'
    globeControls.enabled = !contextLost && state.projection === 'globe' && !polarView
    polarControls.enabled = !contextLost && state.projection === 'globe' && !!polarView
    mapControls.enabled = !contextLost && state.projection === 'map'
    polarEquatorPair.globe.visible = !!polarView && state.layers.grid
    polarEquatorPair.map.visible = false
    const present = state.mode === 'present'
    presentPair.globe.visible = presentPair.map.visible = present
    presentLandPair.globe.visible = presentLandPair.map.visible = present
    continuousSurface.setVisible(!present)
    for (const [id, pair] of selectedBoundaryPairs) pair.globe.visible = pair.map.visible = present && state.selectedPlate === id
    for (const [pair, visible] of [
      [gridPair, !present && state.layers.grid], [presentGridPair, present && state.layers.grid],
      [beltPair, present && state.layers.belts], [boundaryPair, present && state.layers.boundaries],
      [motionPair, present && state.layers.motion], [volcanoPair, present && state.layers.volcanoes],
      [quakePair, present && state.layers.earthquakes],
      [seismicityPair, present && state.layers.seismicity],
      [textbookLabelPair, present && state.layers.labels],
      [oceanLabelPair, present],
    ] as [Pair, boolean][]) pair.globe.visible = pair.map.visible = visible
    applySelection()
    renderer.domElement.setAttribute('aria-label', `${state.mode === 'evolution' ? '古地理演变' : '现代板块'}${state.projection === 'globe' ? polarView ? `${polarView === 'north' ? '北极' : '南极'}正交俯视，完整赤道` : '三维地球，拖动旋转' : '二维地图，拖动平移'}，滚轮缩放、点击板块`)
  }

  function fittedGlobeDistance(aspect: number): number {
    const halfVertical = globeCamera.fov * DEG / 2
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect)
    return GLOBE_RADIUS * 1.15 / Math.sin(Math.min(halfVertical, halfHorizontal))
  }
  function defaultGlobePose(): ViewPose {
    // Centre the adjoining South American / African units while retaining northern Pangaea.
    return { position: geographicPoint(-15, -5, fittedGlobeDistance(width > 0 && height > 0 ? width / height : 1.4)), target: new THREE.Vector3(), zoom: 1 }
  }
  function fitPolarCamera(): void {
    if (!width || !height) return
    // Keep the entire equatorial ring inside the central area between floating tools.
    const top = Math.min(100, height * 0.24)
    const bottom = Math.min(85, height * 0.20)
    const side = Math.min(36, width * 0.08)
    const worldPerPixel = 2 * (GLOBE_RADIUS + 0.034) * 1.04 / Math.max(1, Math.min(width - 2 * side, height - top - bottom))
    const verticalCenter = (top - bottom) * worldPerPixel / 2
    polarCamera.left = -width * worldPerPixel / 2
    polarCamera.right = width * worldPerPixel / 2
    polarCamera.top = verticalCenter + height * worldPerPixel / 2
    polarCamera.bottom = verticalCenter - height * worldPerPixel / 2
    polarCamera.updateProjectionMatrix()
  }
  function clearPolarView(): void {
    if (!polarView) return
    polarView = null
    callbacks.onPolarViewChange?.(null)
    applyVisibility()
  }
  function focusPole(pole: PolarView): void {
    if (disposed || state.projection !== 'globe') return
    stopCameraFlight()
    if (state.follow) { state.follow = false; callbacks.onFollowChange?.(false) }
    polarView = pole
    polarCamera.position.set(0, (pole === 'north' ? 1 : -1) * GLOBE_RADIUS * 3.5, 0)
    polarCamera.up.set(0, 0, pole === 'north' ? -1 : 1)
    polarControls.target.set(0, 0, 0)
    polarCamera.zoom = 1
    polarCamera.lookAt(0, 0, 0)
    fitPolarCamera()
    polarCamera.updateMatrixWorld(true)
    applyVisibility()
    callbacks.onPolarViewChange?.(pole)
    updateLabels()
  }
  function pose(): ViewPose { return { position: camera().position.clone(), target: controls().target.clone(), zoom: camera().zoom } }
  function applyPose(value: ViewPose): void {
    camera().position.copy(value.position)
    controls().target.copy(value.target)
    camera().zoom = value.zoom
    camera().updateProjectionMatrix()
    camera().lookAt(value.target)
    camera().updateMatrixWorld(true)
  }
  globeCamera.position.copy(defaultGlobePose().position)
  globeCamera.lookAt(0, 0, 0)
  mapCamera.lookAt(0, 0, 0)

  function resize(): void { if (!disposed) resizeDirty = true }
  function applyPendingResize(): boolean {
    if (!resizeDirty || disposed || contextLost) return false
    const nextWidth = Math.round(host.clientWidth)
    const nextHeight = Math.round(host.clientHeight)
    if (nextWidth <= 0 || nextHeight <= 0) return false
    resizeDirty = false
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    const sizeChanged = width !== nextWidth || height !== nextHeight
    const dprChanged = pixelRatio !== nextDpr
    if (!sizeChanged && !dprChanged) return false
    const previousFit = fittedGlobeDistance(width > 0 && height > 0 ? width / height : 1.4)
    width = nextWidth; height = nextHeight
    motionViewport.value.set(width, height)
    const aspect = width / height
    globeCamera.aspect = aspect
    globeCamera.updateProjectionMatrix()
    const ratio = fittedGlobeDistance(aspect) / previousFit
    if (Number.isFinite(ratio) && ratio > 0) {
      globeCamera.position.sub(globeControls.target).multiplyScalar(ratio).add(globeControls.target)
      if (flight?.projection === 'globe') {
        flight.from.position.sub(flight.from.target).multiplyScalar(ratio).add(flight.from.target)
        flight.to.position.sub(flight.to.target).multiplyScalar(ratio).add(flight.to.target)
      }
    }
    const halfHeight = Math.max(ROBINSON_MAP_HALF_HEIGHT * 1.10, ROBINSON_MAP_HALF_WIDTH * 1.055 / aspect)
    mapCamera.left = -halfHeight * aspect; mapCamera.right = halfHeight * aspect
    mapCamera.top = halfHeight; mapCamera.bottom = -halfHeight
    mapCamera.updateProjectionMatrix()
    updateArcticMapLayout()
    fitPolarCamera()
    if (dprChanged) { pixelRatio = nextDpr; renderer.setPixelRatio(nextDpr) }
    renderer.setSize(width, height, false)
    camera().updateMatrixWorld(true)
    // setSize clears the drawing buffer. Render inside this same animation task.
    renderer.render(scene, camera())
    updateLabels()
    return true
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  window.addEventListener('resize', resize)

  function stopCameraFlight(): void { flight = null }
  function onControlStart(): void { stopCameraFlight(); if (state.follow) { state.follow = false; callbacks.onFollowChange?.(false) } }
  globeControls.addEventListener('start', onControlStart)
  mapControls.addEventListener('start', onControlStart)
  polarControls.addEventListener('start', onControlStart)
  function focusRegion(lon: number, lat: number): void {
    if (disposed || !Number.isFinite(lon) || !Number.isFinite(lat)) return
    clearPolarView()
    stopCameraFlight()
    const destinationPose: ViewPose = state.projection === 'globe'
      ? { position: geographicPoint(lon, THREE.MathUtils.clamp(lat, -80, 80), Math.max(GLOBE_RADIUS * 2, fittedGlobeDistance(width / Math.max(height, 1)) * 0.77)), target: new THREE.Vector3(), zoom: 1 }
      : { position: mapPoint(lon, lat, 30, mapMeridian()), target: mapPoint(lon, lat, 0, mapMeridian()), zoom: 1.7 }
    globeCamera.up.set(0, 1, 0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { applyPose(destinationPose); flight = null }
    else flight = { start: performance.now(), duration: 850, from: pose(), to: destinationPose, projection: state.projection }
  }
  function resetView(): void {
    if (disposed) return
    stopCameraFlight()
    clearPolarView()
    globeCamera.up.set(0, 1, 0)
    if (state.projection === 'globe') applyPose(defaultGlobePose())
    else applyPose({ position: new THREE.Vector3(0, 0, 30), target: new THREE.Vector3(), zoom: 1 })
  }
  function updateFlight(now: number): void {
    if (!flight || flight.projection !== state.projection) return
    const progress = THREE.MathUtils.clamp((now - flight.start) / flight.duration, 0, 1)
    const eased = progress * progress * (3 - 2 * progress)
    const from = flight.from
    const to = flight.to
    const next = { position: from.position.clone().lerp(to.position, eased), target: from.target.clone().lerp(to.target, eased), zoom: THREE.MathUtils.lerp(from.zoom, to.zoom, eased) }
    if (state.projection === 'globe') {
      const a = from.position.clone().sub(from.target)
      const b = to.position.clone().sub(to.target)
      const fromDistance = a.length()
      const toDistance = b.length()
      const turn = new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize())
      next.position.copy(a.normalize().applyQuaternion(IDENTITY.clone().slerp(turn, eased)).multiplyScalar(THREE.MathUtils.lerp(fromDistance, toDistance, eased))).add(next.target)
    }
    applyPose(next)
    if (progress >= 1) flight = null
  }

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  function isFrontFacing(point: THREE.Vector3): boolean {
    return point.dot(polarView ? camera().position : camera().position.clone().sub(point)) >= 0
  }
  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }
  function onPointerUp(event: PointerEvent): void {
    const down = pointerDown
    pointerDown = null
    if (!down || down.id !== event.pointerId || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6 || contextLost) return
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
    raycaster.setFromCamera(pointer, camera())
    if (state.mode === 'present' && state.layers.labels) {
      const labelMeshes = textbookLabelPair[state.projection].children
      const labelHit = raycaster.intersectObjects(labelMeshes, false).find(value => state.projection === 'map' || isFrontFacing(value.point))
      if (labelHit) { callbacks.onSelect(String(labelHit.object.userData.plateId)); return }
    }
    const motion = motionAtPointer(event.clientX, event.clientY)
    if (motion) { callbacks.onFeatureHover?.(motion); return }
    const candidates = (state.mode === 'present' ? modernPlates : []).map(plate => state.projection === 'globe' ? plate.globe : plate.map)
    const hit = raycaster.intersectObjects(candidates, false).find(value => state.projection === 'map' || isFrontFacing(value.point))
    callbacks.onSelect(hit ? String(hit.object.userData.plateId) : null)
  }
  function motionAtPointer(clientX: number, clientY: number): { id: string; name: string; detail: string; x: number; y: number } | null {
    if (state.mode !== 'present' || !state.layers.motion || !width || !height) return null
    const rect = renderer.domElement.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    let nearest: { id: string; name: string; detail: string; x: number; y: number } | null = null
    let nearestDistance = 26
    for (const arrow of placedMotionPairs) {
      const point = state.projection === 'globe' ? geographicPoint(arrow.lon, arrow.lat, GLOBE_RADIUS + 0.085) : motionMapPoint(arrow)
      if (state.projection === 'globe' && !isFrontFacing(point)) continue
      point.project(camera())
      if (point.z < -1 || point.z > 1) continue
      const px = (point.x * 0.5 + 0.5) * width
      const py = (0.5 - point.y * 0.5) * height
      const distance = Math.hypot(px - x, py - y)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = { id: arrow.id, name: arrow.type === 'divergent' ? '张裂 · 相互分离' : '挤压 · 相互靠近', detail: `${arrow.sourceRegion}。方向为教材示意，箭头长度不表示速度。`, x: px, y: py }
      }
    }
    return nearest
  }
  function onPointerMove(event: PointerEvent): void {
    if (!pointerDown) callbacks.onFeatureHover?.(motionAtPointer(event.clientX, event.clientY))
  }
  function onPointerLeave(): void { callbacks.onFeatureHover?.(null) }
  const clearPointer = () => { pointerDown = null }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', clearPointer)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)
  const project = new THREE.Vector3()
  function updateLabels(): void {
    if (!callbacks.onLabels || !width || !height) return
    // Modern teaching names are geographic surface meshes; only ancient land labels use DOM.
    if (!state.layers.labels || state.mode === 'present') { callbacks.onLabels([]); return }
    const source = evolutionLabelCenters()
    const labels: TectonicLabel[] = []
    const accepted: { x: number; y: number; halfWidth: number }[] = []
    source.sort((a, b) => Number(b.id === state.selectedPlate) - Number(a.id === state.selectedPlate) || b.opacity - a.opacity)
    for (const label of source) {
      const [lon, lat] = vectorLonLat(label.center)
      project.copy(state.projection === 'globe' ? label.center.clone().multiplyScalar(GLOBE_RADIUS + 0.09) : mapPoint(lon, lat, 0.09, mapMeridian()))
      let visible = state.projection === 'map' || isFrontFacing(project)
      project.project(camera())
      const x = (project.x * 0.5 + 0.5) * width
      const y = (0.5 - project.y * 0.5) * height
      visible &&= project.z >= -1 && project.z <= 1 && x > 24 && x < width - 24 && y > 22 && y < height - 22
      const halfWidth = Math.max(40, label.name.length * (label.ancient ? 8.5 : 6.5) + 12)
      if (visible && accepted.some(other => Math.abs(other.x - x) < halfWidth + other.halfWidth && Math.abs(other.y - y) < 35)) visible = false
      if (visible) accepted.push({ x, y, halfWidth })
      labels.push({ id: label.id, name: label.name, color: label.color, opacity: label.opacity, ancient: label.ancient, x, y, visible })
    }
    callbacks.onLabels(labels)
  }
  function onContextLost(event: Event): void {
    event.preventDefault(); contextLost = true; stopCameraFlight(); applyVisibility()
    setError('context', '图形显示暂时中断，恢复后会继续显示')
  }
  function onContextRestored(): void {
    contextLost = false; resizeDirty = true; setError('context', ''); applyVisibility()
  }
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)
  function setState(patch: TectonicScenePatch): void {
    if (disposed) return
    const previous = state
    state = { ...state, ...patch, layers: { ...state.layers, ...patch.layers }, ageMa: THREE.MathUtils.clamp(patch.ageMa ?? state.ageMa, 0, maximumAgeMa) }
    const changedAge = previous.ageMa !== state.ageMa
    if (changedAge) direction = state.ageMa < previous.ageMa ? -1 : 1
    if (Object.keys(patch).every(key => key === 'ageMa')) {
      if (changedAge && state.mode === 'evolution') void updateContinuous()
      return
    }
    const changedMode = previous.mode !== state.mode
    const changedProjection = previous.projection !== state.projection
    if (changedMode) {
      preparationRevision += 1
      requestedContinuousAge = null
      continuousRequest = null
      loadingPaleo = false
      callbacks.onMotionReferenceChange?.(null)
      reportStatus()
    }
    if (state.projection === 'map') clearPolarView()
    if (polarView && state.follow) { state.follow = false; callbacks.onFollowChange?.(false) }
    if (changedProjection || changedMode) { stopCameraFlight(); resizeDirty = true }
    if (changedProjection || changedMode || !state.layers.motion) callbacks.onFeatureHover?.(null)
    applyVisibility()
    if (state.mode === 'evolution') void updateContinuous()
    updateLabels()
  }
  /** Playback, pause, direct seek and 0 Ma all evaluate the same continuous surface. */
  async function seekAge(ageMa: number): Promise<void> {
    if (disposed || !Number.isFinite(ageMa)) return
    const age = THREE.MathUtils.clamp(ageMa, 0, maximumAgeMa)
    if (age !== state.ageMa) direction = age < state.ageMa ? -1 : 1
    state = { ...state, ageMa: age, playing: false }
    prefetchKey = ''
    await updateContinuous()
  }
  function retryData(): void {
    if (disposed) return
    requestedContinuousAge = null
    continuousRequest = null
    prefetchKey = ''
    void updateContinuous()
  }
  function animate(now: number): void {
    if (disposed) return
    frame = requestAnimationFrame(animate)
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0
    lastTime = now
    if (document.hidden || contextLost) return
    applyPendingResize()
    if (!width || !height) return
    updateFlight(now)
    motionEnabled.value = reducedMotion.matches ? 0 : 1
    if (state.mode === 'present' && state.layers.motion && !reducedMotion.matches) motionTime.value += dt
    controls().update(dt)
    updateArcticGlobeLayout()
    camera().updateMatrixWorld(true)
    renderer.render(scene, camera())
    labelClock += dt
    if (labelClock >= 0.05) { updateLabels(); labelClock = 0 }
  }
  function onVisibility(): void { lastTime = 0; if (!document.hidden) resizeDirty = true }
  document.addEventListener('visibilitychange', onVisibility)
  applyVisibility()
  void updateContinuous()
  frame = requestAnimationFrame(animate)

  function dispose(): void {
    if (disposed) return
    disposed = true; preparationRevision += 1
    continuousSurface.dispose()
    cancelAnimationFrame(frame); observer.disconnect()
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
    renderer.domElement.removeEventListener('pointercancel', clearPointer)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
    renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
    globeControls.removeEventListener('start', onControlStart); mapControls.removeEventListener('start', onControlStart); polarControls.removeEventListener('start', onControlStart)
    globeControls.dispose(); mapControls.dispose(); polarControls.dispose()
    for (const surface of surfaces) surface.dispose()
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
    for (const texture of textures) texture.dispose()
    scene.clear(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    pickables.length = 0
    callbacks.onLabels?.([])
    callbacks.onFeatureHover?.(null)
  }
  return { setState, seekAge, resetView, focusRegion, focusPole, retryData, resize, dispose }
}
