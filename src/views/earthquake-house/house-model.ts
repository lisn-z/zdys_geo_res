import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createMaterialTexture } from './material-textures'

/** A geometric reconstruction of textbook figure 3-35. Units are illustrative metres. */
export interface HouseModel {
  root: THREE.Group
  setCutaway(enabled: boolean): void
  setExtensionVisible(enabled: boolean): void
  highlight(id: number | null): void
  dispose(): void
}

type V3 = [number, number, number]
type Bucket = { group: THREE.Group; geometry: Map<THREE.Material, THREE.BufferGeometry[]> }

export function createHouseModel(): HouseModel {
  const root = new THREE.Group()
  root.name = 'Textbook earthquake safety cottage'
  const extensionRoot = new THREE.Group()
  extensionRoot.name = 'Optional extension — kitchen and entry safety'
  extensionRoot.visible = false
  root.add(extensionRoot)
  const materials: THREE.MeshStandardMaterial[] = []
  const textures: THREE.Texture[] = []
  const wallFloorContacts: { group: string; floorTop: number; wallBottom: number; overlap: number; segments: number }[] = []
  const FLOOR_GROUND = 0.445, FLOOR_UPPER = 3.41, WALL_FLOOR_OVERLAP = 0.015
  const buckets: Bucket[] = []
  const features = new Map<number, THREE.Group>()
  const removable: THREE.Group[] = []
  const cutawayOnly: THREE.Group[] = []
  const material = (color: string, roughness = 0.78, metalness = 0): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.push(m)
    return m
  }
  const m = {
    concrete: material('#a5a39b'), foundation: material('#858b87'), mortar: material('#d6d3c8'),
    paving: material('#ddd5bc'), pavingDark: material('#a59a81'), soil: material('#696443'),
    grass: material('#6c7b54'), grassLight: material('#809061'), grassDeep: material('#536846'),
    foliage: material('#3f5b42'), foliageLight: material('#56704c'), flower: material('#955d52'),
    siding: material('#949a97'), sidingLight: material('#aaada5'), sidingDark: material('#74817c'),
    trim: material('#efe9d8'), trimShade: material('#c7c9c0'), plaster: material('#e7dfc7'),
    timber: material('#96744f'), timberLight: material('#af8c60'), timberEnd: material('#bea47b'),
    timberDark: material('#74573e'), plywood: material('#a98759'), plywoodLight: material('#bea276'),
    floor: material('#b29c7b'), floorLight: material('#beaa89'), floorDark: material('#a68c69'),
    roof0: material('#7f4439'), roof1: material('#82473b'), roof2: material('#884a3d'), roof3: material('#794035'),
    roofUnder: material('#593c30'), brick: material('#79695c'), brickLight: material('#93806c'),
    red: material('#ab3e37'), redInset: material('#89332e'), redLight: material('#bf5649'),
    glass: material('#527b93', 0.3, 0.12), glassLight: material('#779bab', 0.28, 0.1), glassDark: material('#354d68', 0.4),
    steel: material('#a9b6b9', 0.35, 0.72), bolt: material('#5c686d', 0.4, 0.72), brass: material('#b99c63', 0.35, 0.55),
    heater: material('#eeece2', 0.33), heaterShade: material('#d8ddd5', 0.35), pipe: material('#9a7960', 0.4, 0.45),
    blue: material('#386891'), blueLight: material('#5d8fab'), blueDark: material('#284a6e'),
    pillow: material('#e8e5d8'), rug: material('#64847c'), rugEdge: material('#abc0a7'),
    bookRed: material('#79564b'), bookBlue: material('#4d6471'), bookOchre: material('#9b8967'), bookGreen: material('#68735f'),
    bookNavy: material('#3c4757'), bookCream: material('#b8ad92'), bookBrown: material('#665349'),
    pages: material('#e2d7bd'), pageEdges: material('#b4aa93'), black: material('#303c3c'), utilityGreen: material('#688966'),
  }
  // Subtle physical surface detail multiplies the existing colours. Geometry carries
  // the construction itself; the maps only add grain, paint and mineral roughness.
  if (typeof document !== 'undefined') {
    const surface = (keys: (keyof typeof m)[], kind: 'wood' | 'paint' | 'tile' | 'concrete', bump: number) => {
      const texture = createMaterialTexture(kind)
      texture.repeat.set(kind === 'wood' ? 0.8 : 2, kind === 'wood' ? 2.5 : 2)
      texture.anisotropy = 4
      textures.push(texture)
      for (const key of keys) {
        m[key].map = texture
        m[key].bumpMap = texture
        m[key].bumpScale = bump
      }
    }
    surface(['timber', 'timberLight', 'timberEnd', 'timberDark', 'plywood', 'plywoodLight', 'floor', 'floorLight', 'floorDark'], 'wood', 0.012)
    surface(['siding', 'sidingLight', 'sidingDark', 'trim', 'trimShade', 'red', 'redInset', 'redLight'], 'paint', 0.003)
    surface(['roof0', 'roof1', 'roof2', 'roof3'], 'tile', 0.006)
    surface(['concrete', 'foundation', 'paving', 'pavingDark', 'brick', 'brickLight'], 'concrete', 0.009)
  }
  const bucket = (name: string, featureId?: number, hideInCutaway = false): Bucket => {
    const group = new THREE.Group()
    group.name = name
    root.add(group)
    const b: Bucket = { group, geometry: new Map() }
    buckets.push(b)
    if (featureId !== undefined) features.set(featureId, group)
    if (hideInCutaway) removable.push(group)
    return b
  }
  const add = (b: Bucket, geometry: THREE.BufferGeometry, mat: THREE.Material, p: V3 = [0, 0, 0], rotation?: THREE.Euler) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry
    if (g !== geometry) geometry.dispose()
    if (rotation) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation))
    g.translate(...p)
    let list = b.geometry.get(mat)
    if (!list) b.geometry.set(mat, list = [])
    list.push(g)
  }
  const box = (b: Bucket, mat: THREE.Material, p: V3, size: V3, rz = 0) =>
    add(b, new THREE.BoxGeometry(...size), mat, p, rz ? new THREE.Euler(0, 0, rz) : undefined)
  const cylinder = (b: Bucket, mat: THREE.Material, p: V3, radius: number, height: number, rotation?: THREE.Euler, radiusTop = radius, segments = 20) =>
    add(b, new THREE.CylinderGeometry(radiusTop, radius, height, segments), mat, p, rotation)
  const ball = (b: Bucket, mat: THREE.Material, p: V3, scale: V3, detail = 1) => {
    const g = new THREE.IcosahedronGeometry(1, detail)
    g.scale(...scale)
    add(b, g, mat, p)
  }
  const beam = (b: Bucket, mat: THREE.Material, a: V3, end: V3, width: number, depth = width) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...end), delta = to.clone().sub(from)
    const g = new THREE.BoxGeometry(width, delta.length(), depth)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
    add(b, g, mat, from.add(to).multiplyScalar(0.5).toArray() as V3)
  }
  const pipe = (b: Bucket, mat: THREE.Material, a: V3, end: V3, radius: number) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...end), delta = to.clone().sub(from)
    const g = new THREE.CylinderGeometry(radius, radius, delta.length(), 12)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
    add(b, g, mat, from.add(to).multiplyScalar(0.5).toArray() as V3)
  }
  const fastenerContacts: { group: string; axis: string; surface: number; bottom: number; gap: number }[] = []
  // Coordinates specify the physical mounting surface, never a guessed head offset.
  const screw = (b: Bucket, x: number, y: number, z: number, face: 'front' | 'side' | 'top' | 'bottom' = 'front', size = 0.032) => {
    const thickness = 0.018, axis = face === 'front' ? 2 : face === 'side' ? 0 : 1
    const position: V3 = [x, y, z], surface = position[axis]!
    const normal = face === 'bottom' ? -1 : 1
    position[axis] = surface + normal * thickness / 2
    const rotation = face === 'front' ? new THREE.Euler(Math.PI / 2, 0, 0) : face === 'side' ? new THREE.Euler(0, 0, Math.PI / 2) : undefined
    cylinder(b, m.bolt, position, size, thickness, rotation, size, 6)
    if (face === 'front') box(b, m.black, [x, y, z + thickness + 0.0002], [size * 1.2, 0.004, 0.0006])
    const bottom = position[axis]! - normal * thickness / 2
    fastenerContacts.push({ group: b.group.name, axis: ['x', 'y', 'z'][axis]!, surface, bottom, gap: Math.abs(bottom - surface) })
  }
  const jointPlate = (b: Bucket, p: V3, side: 'front' | 'side' = 'front', w = 0.34, h = 0.44) => {
    const center: V3 = [...p], axis = side === 'front' ? 2 : 0
    center[axis] += 0.0125
    box(b, m.steel, center, side === 'front' ? [w, h, 0.025] : [0.025, h, w])
    for (const v of [-1, 1]) for (const u of [-1, 1]) {
      screw(b, p[0] + (side === 'front' ? u * w * 0.31 : 0.025), p[1] + v * h * 0.3, p[2] + (side === 'side' ? u * w * 0.31 : 0.025), side)
    }
  }
  const fixed = bucket('Ground, concrete foundations and planted entrance')
  const rightGarden = bucket('Right garden shrubs replaced by the optional extension')
  const frame = bucket('Exposed timber frame and floor structure')
  const circulation = bucket('Connected staircase, landing, guardrails and open room doors')
  const facade = bucket('Retained exterior siding, window trim and entry')
  const cutFacade = bucket('Local wall openings in the textbook cutaway')
  cutawayOnly.push(cutFacade.group)
  const wallsClosed = bucket('Removable walls for structural cutaway', undefined, true)
  const mainRightClosed = bucket('Removable original right exterior wall', undefined, true)
  const mainRightWithDoor = bucket('Removable right wall with connecting doorway', undefined, true)
  const connectionInfill = bucket('Studs and sill replaced by connecting doorway')
  const connectionDoor = bucket('Open doorway connecting the original house and extension')
  const roof = bucket('Retained rear roof, overlapping terracotta tiles')
  const chimney = bucket('1 — Chimney sheathing and steel braces', 1)
  const fireplace = bucket('Masonry fireplace and continuous vertical flue')
  const dining = bucket('Wooden table and two chairs behind the living-room fixtures')
  const bookshelf = bucket('2 — Anchored tall bookshelf', 2)
  const bedroom = bucket('3 — Bedroom with clear walls and bed away from windows', 3)
  const sheathing = bucket('4 — Plywood screwed to wall studs', 4)
  const anchors = bucket('5 — Timber sill anchored to concrete', 5)
  const anchorFoundationCover = bucket('Foundation front restored outside structural cutaway', undefined, true)
  const heater = bucket('6 — Water heater secured by two steel straps', 6)
  const connectors = bucket('7 — Metal reinforcement of beam-to-post joints', 7)

  // An irregular garden edge keeps the house grounded without a toy-like pedestal.
  const garden = new THREE.Shape()
  garden.moveTo(-5.4, -3.55)
  garden.quadraticCurveTo(-5.9, 0, -5.35, 3.55)
  garden.quadraticCurveTo(-3.8, 5, -0.8, 4.7)
  garden.quadraticCurveTo(2, 5.25, 5.35, 3.55)
  garden.quadraticCurveTo(5.8, 0, 5.15, -3.45)
  garden.quadraticCurveTo(1, -4.1, -5.4, -3.55)
  const lawn = new THREE.ExtrudeGeometry(garden, { depth: 0.12, bevelEnabled: false, curveSegments: 20 })
  lawn.rotateX(-Math.PI / 2)
  add(fixed, lawn, m.grass, [0, -0.18, 0])
  // Low foundation courses expose the timber-to-concrete connection in the cutaway.
  // A small inspection section passes through the actual anchor axis, not in
  // front of the foundation. Its removed front half returns in the complete view.
  box(fixed, m.concrete, [0, 0.02, 0.0125], [8.65, 0.36, 5.375])
  for (const [a, end] of [[-4.325, -4.10], [-3.64, 4.325]]) box(fixed, m.concrete, [(a! + end!) / 2, 0.02, 2.7875], [end! - a!, 0.36, 0.175])
  for (const [a, end] of [[-4.35, -4.10], [-3.64, 4.35]]) box(fixed, m.foundation, [(a! + end!) / 2, 0.13, 2.8], [end! - a!, 0.42, 0.23])
  box(anchors, m.concrete, [-3.87, 0.13, 2.6875], [0.46, 0.42, 0.025])
  box(anchorFoundationCover, m.foundation, [-3.87, 0.09, 2.8075], [0.46, 0.5, 0.215])
  box(fixed, m.foundation, [4.3, 0.13, 0.06], [0.22, 0.42, 5.65])
  box(fixed, m.foundation, [-4.3, 0.13, 0.06], [0.22, 0.42, 5.65])
  for (let i = 0; i < 14; i++) {
    box(fixed, m.mortar, [-4.2 + i * 0.63, 0.13, 2.923], [0.012, 0.4, 0.008])
    box(fixed, m.mortar, [4.418, 0.13, -2.62 + i * 0.41], [0.008, 0.4, 0.01])
  }
  box(fixed, m.paving, [-0.55, 0.25, 3.1], [1.45, 0.38, 0.65])
  box(fixed, m.paving, [-0.55, 0.13, 3.61], [1.68, 0.25, 0.45])
  box(fixed, m.paving, [-0.55, 0.02, 4.02], [1.88, 0.12, 0.4])
  for (let i = 0; i < 5; i++) box(fixed, m.pavingDark, [-0.55, 0.45 - i * 0.09, 2.91 + i * 0.22], [1.46 + i * 0.09, 0.018, 0.018])
  for (let i = 0; i < 7; i++) box(fixed, i % 2 ? m.paving : m.pavingDark, [-0.4 + (i % 2) * 0.08, -0.035, 4.4 + i * 0.05], [1.22, 0.025, 0.08])

  // Shrubs and flower beds are permanent native geometry, not billboard images.
  const shrubs: V3[] = [[-4.98, 0.15, 2.45], [-4.98, 0.17, 1.35], [-4.98, 0.16, 0.2], [-4.98, 0.13, 3.1], [-2.45, 0.11, 3.35], [-1.96, 0.11, 3.45], [4.98, 0.14, -1.2], [4.98, 0.16, -2.3]]
  const shrubBounds: { index: number; min: number[]; max: number[] }[] = []
  shrubs.forEach((p, i) => {
    const gardenBucket = i >= 6 ? rightGarden : fixed
    const crownScale = i >= 4 && i < 6 ? 0.45 : 0.62
    const before = new Map<THREE.Material, number>(Array.from(gardenBucket.geometry, ([mat, geometries]) => [mat, geometries.length]))
    for (let j = 0; j < 5; j++) beam(gardenBucket, m.timberDark, [p[0], -0.2, p[2]], [p[0] + Math.sin(j * 2.6) * 0.28 * crownScale, p[1] + 0.1 * crownScale, p[2] + Math.cos(j * 2.6) * 0.28 * crownScale], 0.022 * crownScale)
    for (let j = 0; j < 32; j++) {
      const angle = j * 2.39996 + i * 0.71
      const radius = (0.11 + ((j * 7 + i * 3) % 13) / 40) * crownScale
      const height = (0.07 + ((j * 11 + i * 5) % 17) / 65) * crownScale
      const leafScale = (0.085 + ((j * 3 + i) % 7) * 0.012) * crownScale
      ball(gardenBucket, (j + i) % 4 ? m.foliage : m.foliageLight, [p[0] + Math.sin(angle) * radius, p[1] + height, p[2] + Math.cos(angle) * radius], [leafScale, leafScale * (0.65 + (j % 4) * 0.12), leafScale * 0.9])
    }
    if (i > 2 && i < 6) for (let j = 0; j < 5; j++) ball(gardenBucket, m.flower, [p[0] + Math.sin(j * 2.1) * 0.3 * crownScale, p[1] + (0.25 + (j % 3) * 0.05) * crownScale, p[2] + Math.cos(j * 1.7) * 0.25 * crownScale], [0.021 * crownScale, 0.022 * crownScale, 0.02 * crownScale], 0)
    const bounds = new THREE.Box3()
    for (const [mat, geometries] of gardenBucket.geometry) for (const geometry of geometries.slice(before.get(mat) ?? 0)) {
      geometry.computeBoundingBox()
      bounds.union(geometry.boundingBox!)
    }
    shrubBounds.push({ index: i, min: bounds.min.toArray(), max: bounds.max.toArray() })
  })

  // Floors: individual boards, exposed joists, end grain and two storeys.
  // Tongue-and-groove boards sit on continuous structural sheathing. Board seams
  // must never be transparent slots into the space underneath the floor.
  box(frame, m.floorDark, [0, 0.315, 0.05], [8.4, 0.05, 5.3])
  box(frame, m.floorDark, [1.39, 3.27, 0.05], [2.78, 0.06, 5.3])
  box(frame, m.floorDark, [3.49, 3.27, -2.375], [1.42, 0.06, 0.45])
  box(frame, m.floorDark, [3.49, 3.27, 2.175], [1.42, 0.06, 1.05])
  for (let i = 0; i < 42; i++) box(frame, [m.floor, m.floorLight, m.floorDark][i % 3]!, [-4.1 + i * 0.2, 0.39, 0.05], [0.194, 0.11, 5.3])
  for (let i = 0; i < 21; i++) {
    const x = 0.1 + i * 0.2, floorMat = i % 4 ? m.floorLight : m.floor
    if (x > 2.78) {
      // Genuine stairwell opening: no floor or hidden cross-joists through the flight.
      box(frame, floorMat, [x, 3.35, -2.375], [0.194, 0.12, 0.45])
      box(frame, floorMat, [x, 3.35, 2.175], [0.194, 0.12, 1.05])
    } else box(frame, floorMat, [x, 3.35, 0.05], [0.194, 0.12, 5.3])
  }
  for (let z = -2.45; z <= 2.65; z += 0.55) {
    const atOpening = z > -2.15 && z < 1.65
    box(frame, m.timber, [atOpening ? 1.39 : 2.1, 3.17, z], [atOpening ? 2.7 : 4.15, 0.27, 0.13])
  }
  for (const x of [2.76, 4.12]) box(frame, m.timber, [x, 3.17, -0.25], [0.15, 0.27, 3.8])
  for (const y of [0.48, 3.14, 6.12]) {
    box(frame, m.timber, [2.1, y, 2.64], [4.22, 0.18, 0.18])
    box(frame, m.timber, [2.1, y, -2.52], [4.22, 0.18, 0.18])
    if (y === 0.48) {
      box(frame, m.timber, [4.1, y, -0.425], [0.18, 0.18, 4.35])
      box(frame, m.timber, [4.1, y, 2.625], [0.18, 0.18, 0.15])
      box(connectionInfill, m.timber, [4.1, y, 2.15], [0.18, 0.18, 0.8])
    } else box(frame, m.timber, [4.1, y, 0.05], [0.18, 0.18, 5.3])
  }
  box(frame, m.timber, [-2.1, 0.48, 2.64], [4.18, 0.18, 0.18])
  box(frame, m.timber, [-2.1, 3.49, 2.64], [4.2, 0.18, 0.18])
  for (const x of [0.05, 2.9, 4.1]) {
    box(frame, m.timberLight, [x, 1.8, 2.64], [0.18, 2.65, 0.18])
    box(frame, m.timberLight, [x, 4.77, 2.64], [0.18, 2.64, 0.18])
  }
  // A lower cut line on the right reveals a row of real wall studs.
  for (let z = -2.45; z <= 2.7; z += 0.56) {
    const h = z > 0.65 ? 1.25 : 2.7
    box(z > 1.75 && z < 2.55 ? connectionInfill : frame, m.timberLight, [4.1, 0.49 + h / 2, z], [0.15, h, 0.14])
  }
  for (let x = -4.1; x < -1.35; x += 0.58) box(frame, m.timberLight, [x, 0.82, 2.64], [0.14, 0.65, 0.15])
  // Rafters sit below the finished tile surface.
  for (let z = -2.5; z <= 2.65; z += 1.04) {
    beam(frame, m.timber, [-0.12, 5.947, z], [2.1, 7.85, z], 0.13)
    beam(frame, m.timber, [2.1, 7.85, z], [4.32, 5.947, z], 0.13)
  }
  box(frame, m.timberDark, [2.1, 7.77, 0.02], [0.17, 0.2, 5.45])
  for (const y of [3.52, 6.2]) box(frame, m.timber, [2.1, y, 2.68], [4.25, 0.2, 0.2])

  // A usable route connects both floors. The stairs rise toward a rear landing,
  // then a door leads into the bedroom; the front textbook cutaway stays clear.
  const stairLeft = 2.89, stairRight = 3.98, stairCount = 15
  const stairBottom = 0.445, stairTop = 3.41, run = 3.8 / stairCount
  for (let step = 0; step < stairCount; step++) {
    const top = stairBottom + (step + 1) * (stairTop - stairBottom) / stairCount
    const frontZ = 1.65 - step * run
    box(circulation, step % 3 ? m.floor : m.floorLight, [(stairLeft + stairRight) / 2, top - 0.035, frontZ - run / 2], [stairRight - stairLeft, 0.07, run + 0.025])
    box(circulation, m.timberLight, [(stairLeft + stairRight) / 2, top - 0.13, frontZ], [stairRight - stairLeft, 0.2, 0.035])
    box(circulation, m.timberDark, [(stairLeft + stairRight) / 2, top + 0.004, frontZ + 0.009], [stairRight - stairLeft, 0.014, 0.03])
  }
  for (const x of [2.91, 3.95]) {
    beam(circulation, m.timber, [x, 0.43, 1.65], [x, 3.22, -2.15], 0.13, 0.2)
    beam(circulation, m.timberDark, [x, 1.493, 1.523], [x, 4.26, -2.023], 0.065)
    for (let step = 0; step < stairCount; step += 2) {
      const y = stairBottom + (step + 1) * (stairTop - stairBottom) / stairCount
      const z = 1.65 - (step + 0.5) * run
      box(circulation, m.timberLight, [x, y + 0.41, z], [0.045, 0.83, 0.045])
    }
    box(circulation, m.timber, [x, 1.118, 1.523], [0.09, 0.95, 0.09])
    box(circulation, m.timber, [x, 3.885, -2.023], [0.09, 0.95, 0.09])
  }
  // Guard the upper floor beside the opening, leaving the rear landing and front entry open.
  for (let i = 0; i < 12; i++) box(circulation, m.trimShade, [2.76, 3.86, -2.05 + i * 0.325], [0.045, 0.9, 0.045])
  box(circulation, m.timberDark, [2.76, 4.32, -0.25], [0.075, 0.075, 3.75])
  for (const z of [-2.1, 1.62]) box(circulation, m.timber, [2.76, 3.91, z], [0.105, 1.0, 0.105])
  box(circulation, m.timberDark, [3.45, 4.32, 1.68], [1.36, 0.075, 0.075])
  for (let x = 2.9; x < 4.1; x += 0.23) box(circulation, m.trimShade, [x, 3.86, 1.68], [0.045, 0.9, 0.045])

  // Ground-floor living-room doorway. The door leaf is open 90 degrees.
  box(circulation, m.plaster, [0, 1.7375, -1.335], [0.1, 2.615, 2.43])
  box(circulation, m.plaster, [0, 1.7375, 1.79], [0.1, 2.615, 1.54])
  for (const x of [-0.075, 0.075]) {
    box(circulation, m.trimShade, [x, 0.5, -1.335], [0.05, 0.13, 2.43])
    box(circulation, m.trimShade, [x, 0.5, 1.79], [0.05, 0.13, 1.54])
  }
  wallFloorContacts.push({ group: 'Ground-floor interior partition', floorTop: FLOOR_GROUND, wallBottom: 0.43, overlap: 0.015, segments: 2 })
  box(circulation, m.plaster, [0, 2.8, 0.45], [0.1, 0.49, 1.14])
  for (const z of [-0.12, 1.02]) box(circulation, m.trim, [-0.07, 1.5, z], [0.13, 2.13, 0.085])
  box(circulation, m.trim, [-0.07, 2.55, 0.45], [0.13, 0.1, 1.22])
  box(circulation, m.trimShade, [-0.48, 1.48, 1.02], [0.96, 2.02, 0.065])
  for (const y of [1.0, 1.94]) box(circulation, m.trim, [-0.48, y, 1.058], [0.73, 0.7, 0.025])
  box(circulation, m.brass, [-0.83, 1.48, 1.08], [0.04, 0.15, 0.025])
  beam(circulation, m.brass, [-0.84, 1.49, 1.113], [-0.72, 1.49, 1.113], 0.025)
  for (const y of [0.7, 2.24]) cylinder(circulation, m.brass, [-0.02, y, 1.02], 0.022, 0.13)

  // Upper rear hall gives the stair landing a real doorway into the bedroom.
  box(circulation, m.plaster, [0.91, 4.7825, -1.55], [1.62, 2.775, 0.1])
  box(circulation, m.plaster, [2.685, 4.7825, -1.55], [0.13, 2.775, 0.1])
  for (const z of [-1.475, -1.625]) {
    box(circulation, m.trimShade, [0.91, 3.465, z], [1.62, 0.13, 0.05])
    box(circulation, m.trimShade, [2.685, 3.465, z], [0.13, 0.13, 0.05])
  }
  wallFloorContacts.push({ group: 'Upper-floor interior partition', floorTop: FLOOR_UPPER, wallBottom: 3.395, overlap: 0.015, segments: 2 })
  box(circulation, m.plaster, [2.17, 5.82, -1.55], [0.9, 0.7, 0.1])
  for (const x of [1.72, 2.62]) box(circulation, m.trim, [x, 4.44, -1.48], [0.085, 2.08, 0.12])
  box(circulation, m.trim, [2.17, 5.48, -1.48], [1.0, 0.1, 0.12])
  box(circulation, m.trimShade, [2.62, 4.43, -1.995], [0.065, 2.02, 0.89])
  for (const y of [3.94, 4.89]) box(circulation, m.trim, [2.66, y, -1.995], [0.025, 0.69, 0.67])
  box(circulation, m.brass, [2.69, 4.43, -2.33], [0.025, 0.15, 0.04])
  for (const y of [3.67, 5.18]) cylinder(circulation, m.brass, [2.62, y, -1.56], 0.022, 0.13)

  // Vertical clapboard walls, with true openings cut by splitting the slats.
  type Opening = { u: number; width: number; bottom: number; top: number }
  const wall = (b: Bucket, axis: 'x' | 'z', at: number, u0: number, u1: number, y0: number, y1: number, openings: Opening[] = [], inside = true) => {
    const nominalBase = y0
    const floorTop = Math.abs(y0 - 0.5) < 0.005 ? FLOOR_GROUND : y0 >= 3.45 && y0 <= 3.56 ? FLOOR_UPPER : null
    if (floorTop !== null) y0 = floorTop - WALL_FLOOR_OVERLAP
    const adjustedOpenings = openings.map(o => ({ ...o, bottom: o.bottom <= nominalBase + 0.005 ? Math.min(o.bottom, y0 - 0.001) : o.bottom }))
    for (let u = u0 + 0.075, i = 0; u < u1; u += 0.15, i++) {
      let segments: [number, number][] = [[y0, y1]]
      for (const o of adjustedOpenings) if (Math.abs(u - o.u) < o.width / 2 + 0.055) {
        segments = segments.flatMap(([a, end]) => [[a, Math.min(end, o.bottom)], [Math.max(a, o.top), end]] as [number, number][]).filter(([a, end]) => end - a > 0.01)
      }
      for (const [a, end] of segments) {
        box(b, i % 5 ? m.siding : m.sidingLight, axis === 'z' ? [u, (a + end) / 2, at] : [at, (a + end) / 2, u], axis === 'z' ? [0.142, end - a, 0.105] : [0.105, end - a, 0.142])
        if (inside) box(b, m.plaster, axis === 'z' ? [u, (a + end) / 2, at + (at < 0 ? 0.09 : -0.09)] : [at + (at < 0 ? 0.09 : -0.09), (a + end) / 2, u], axis === 'z' ? [0.15, end - a, 0.045] : [0.045, end - a, 0.15])
      }
    }
    // Trim follows each solid wall segment. It never spans a doorway as a raised bar.
    let footSegments: [number, number][] = [[u0, u1]]
    for (const o of openings) if (o.bottom <= nominalBase + 0.005) {
      const left = o.u - o.width / 2 - 0.065, right = o.u + o.width / 2 + 0.065
      footSegments = footSegments.flatMap(([a, end]) => [[a, Math.min(end, left)], [Math.max(a, right), end]] as [number, number][]).filter(([a, end]) => end - a > 0.001)
    }
    for (const [a, end] of footSegments) {
      const mid = (a + end) / 2, width = end - a
      box(b, m.trim, axis === 'z' ? [mid, y0 + 0.03, at + (at > 0 ? 0.06 : -0.06)] : [at + (at > 0 ? 0.06 : -0.06), y0 + 0.03, mid], axis === 'z' ? [width, 0.14, 0.08] : [0.08, 0.14, width])
      if (floorTop !== null && inside) {
        const inward = at < 0 ? 1 : -1, insideAt = at + inward * 0.1375
        box(b, m.trimShade, axis === 'z' ? [mid, floorTop + 0.055, insideAt] : [insideAt, floorTop + 0.055, mid], axis === 'z' ? [width, 0.13, 0.05] : [0.05, 0.13, width])
      }
    }
    if (floorTop !== null) wallFloorContacts.push({ group: b.group.name, floorTop, wallBottom: y0, overlap: floorTop - y0, segments: footSegments.length })
  }
  const window = (b: Bucket, axis: 'x' | 'z', at: number, u: number, y: number, width: number, height: number, panes = 2) => {
    const front = axis === 'z', outward = at < 0 ? -1 : 1
    const point = (du: number, dy: number, depth = 0): V3 => front ? [u + du, y + dy, at + outward * depth] : [at + outward * depth, y + dy, u + du]
    const size = (w: number, h: number, d: number): V3 => front ? [w, h, d] : [d, h, w]
    // Real four-sided reveals connect the room-side plaster to the outer frame.
    // Their inner edges stop at the glazing; only the opening perimeter is closed.
    for (const side of [-1, 1]) {
      box(b, m.trimShade, point(side * (width / 2 + 0.07), 0, -0.065), size(0.14, height, 0.28))
      box(b, m.trimShade, point(0, side * (height / 2 + 0.07), -0.065), size(width + 0.28, 0.14, 0.28))
      box(b, m.trim, point(side * (width / 2 + 0.045), 0, -0.19), size(0.1, height + 0.18, 0.05))
      box(b, m.trim, point(0, side * (height / 2 + 0.045), -0.19), size(width + 0.2, 0.1, 0.05))
    }
    box(b, m.glassDark, point(0, 0), size(width, height, 0.055))
    for (let ix = 0; ix < panes; ix++) for (let iy = 0; iy < 3; iy++) box(b, (ix + iy) % 3 ? m.glass : m.glassLight, point(-width / 2 + (ix + 0.5) * width / panes, -height / 2 + (iy + 0.5) * height / 3, 0.04), size(width / panes - 0.045, height / 3 - 0.035, 0.022))
    for (const d of [-1, 1]) {
      box(b, m.trim, point(d * (width / 2 + 0.045), 0, 0.065), size(0.1, height + 0.18, 0.09))
      box(b, m.trim, point(0, d * (height / 2 + 0.045), 0.065), size(width + 0.2, 0.1, 0.09))
    }
    for (let i = 1; i < panes; i++) box(b, m.trim, point(-width / 2 + i * width / panes, 0, 0.077), size(0.055, height, 0.055))
    for (let i = 1; i < 3; i++) box(b, m.trim, point(0, -height / 2 + i * height / 3, 0.077), size(width, 0.035, 0.05))
    box(b, m.trim, point(0, -height / 2 - 0.09, 0.09), size(width + 0.28, 0.1, 0.23))
  }
  wall(facade, 'z', -2.65, -4.2, 0.05, 0.5, 3.5, [{ u: -2.65, width: 1.2, bottom: 1.4, top: 2.7 }])
  wall(facade, 'z', -2.65, 0, 4.2, 0.5, 6.2, [{ u: 2.1, width: 1.4, bottom: 1.45, top: 2.7 }, { u: 2.1, width: 1.4, bottom: 4.25, top: 5.6 }])
  wall(facade, 'x', -4.23, -2.65, 2.7, 0.5, 3.5, [{ u: 0.5, width: 1.4, bottom: 1.5, top: 2.9 }])
  // Keep a slender glazed section of the tall front gable as in the printed figure.
  wall(facade, 'z', 2.75, 2.93, 4.2, 0.5, 6.2, [{ u: 3.58, width: 0.94, bottom: 1.5, top: 2.82 }, { u: 3.58, width: 0.94, bottom: 4.35, top: 5.68 }])
  window(facade, 'z', 2.83, 3.58, 2.16, 0.92, 1.3)
  window(facade, 'z', 2.83, 3.58, 5.0, 0.92, 1.3)
  box(facade, m.trim, [3.58, 3.56, 2.84], [1.16, 0.1, 0.09])
  for (const x of [3.05, 3.58, 4.11]) box(facade, m.trim, [x, 3.56, 2.84], [0.065, 1.22, 0.08])
  wall(wallsClosed, 'z', 2.75, 0.02, 2.92, 0.5, 6.2, [{ u: 1.43, width: 1.15, bottom: 1.32, top: 2.55 }, { u: 1.43, width: 1.15, bottom: 4.3, top: 5.55 }])
  window(wallsClosed, 'z', 2.83, 1.43, 1.935, 1.13, 1.21)
  window(wallsClosed, 'z', 2.83, 1.43, 4.925, 1.13, 1.23)
  box(wallsClosed, m.trim, [1.47, 3.42, 2.84], [2.9, 0.13, 0.105])
  wall(wallsClosed, 'z', 2.75, -4.2, -1.28, 0.5, 3.5, [{ u: -2.7, width: 1.3, bottom: 1.35, top: 2.7 }])
  window(wallsClosed, 'z', 2.82, -2.7, 2.02, 1.27, 1.32)
  for (const b of [mainRightClosed, mainRightWithDoor]) {
    const openings = [{ u: -0.95, width: 1.3, bottom: 4.3, top: 5.68 }, { u: -0.95, width: 1.3, bottom: 1.3, top: 2.67 }]
    if (b === mainRightWithDoor) openings.push({ u: 2.15, width: 0.8, bottom: 0.48, top: 2.65 })
    wall(b, 'x', 4.22, -2.65, 2.7, 0.5, 6.2, openings)
    window(b, 'x', 4.29, -0.95, 5, 1.28, 1.36)
    window(b, 'x', 4.29, -0.95, 2, 1.28, 1.35)
  }
  for (const z of [1.75, 2.55]) box(connectionDoor, m.trim, [4.24, 1.55, z], [0.25, 2.2, 0.095])
  box(connectionDoor, m.trim, [4.24, 2.65, 2.15], [0.25, 0.1, 0.9])
  box(connectionDoor, m.floor, [4.2, 0.435, 2.15], [0.38, 0.04, 0.79])
  box(connectionDoor, m.trimShade, [4.69, 1.54, 2.56], [0.8, 2.07, 0.06])
  for (const y of [1.04, 2.04]) box(connectionDoor, m.trim, [4.69, y, 2.598], [0.62, 0.75, 0.02])
  box(connectionDoor, m.brass, [4.98, 1.54, 2.61], [0.025, 0.13, 0.02])
  // Reverse-facing side/back windows use the same genuine glazing geometry.
  window(facade, 'x', -4.31, 0.5, 2.2, 1.38, 1.38)
  window(facade, 'z', -2.72, -2.65, 2.05, 1.18, 1.28)
  window(facade, 'z', -2.72, 2.1, 2.075, 1.38, 1.23)
  window(facade, 'z', -2.72, 2.1, 4.925, 1.38, 1.33)
  // The textbook reveals small local openings in a finished house, not a bare frame.
  // Retain the front cladding around a curved bookshelf opening.
  const lowerFrontWall = (u0: number, u1: number, top: number) => {
    if (u1 <= -4.10 || u0 >= -3.42) {
      wall(cutFacade, 'z', 2.75, u0, u1, 0.5, top)
      return
    }
    // The through-bolt window follows the foundation cut; the adjoining taller
    // opening also clears the genuine post-to-sill plate and its fasteners.
    const edges = [u0, ...[-4.10, -3.78, -3.64, -3.42].filter(x => x > u0 && x < u1), u1]
    for (let i = 0; i < edges.length - 1; i++) {
      const a = edges[i]!, end = edges[i + 1]!, mid = (a + end) / 2, width = end - a
      const isPostConnection = mid > -3.78 && mid < -3.42
      const isInspection = (mid > -4.10 && mid < -3.64) || isPostConnection
      const bottom = isPostConnection ? 1.02 : isInspection ? 0.82 : FLOOR_GROUND - WALL_FLOOR_OVERLAP
      if (top > bottom) {
        box(cutFacade, m.sidingLight, [mid, (bottom + top) / 2, 2.75], [Math.max(0.008, width - 0.008), top - bottom, 0.105])
        box(cutFacade, m.plaster, [mid, (bottom + top) / 2, 2.66], [width, top - bottom, 0.045])
      }
      if (!isInspection) {
        box(cutFacade, m.trim, [mid, 0.46, 2.81], [width, 0.14, 0.08])
        box(cutFacade, m.trimShade, [mid, 0.5, 2.6125], [width, 0.13, 0.05])
      }
    }
  }
  for (let x = -4.2; x < -1.28; x += 0.15) {
    const center = x + 0.075
    const normalized = (center + 2.84) / 1.35
    if (Math.abs(normalized) >= 1) {
      lowerFrontWall(x, Math.min(x + 0.15, -1.28), 3.5)
    } else {
      const chord = Math.sqrt(1 - normalized * normalized)
      const lower = 1.74 - chord * 0.99, upper = 2.67 + chord * 0.3
      lowerFrontWall(x, Math.min(x + 0.15, -1.28), lower)
      wall(cutFacade, 'z', 2.75, x, Math.min(x + 0.15, -1.28), upper, 3.5)
    }
  }
  // One joined cap per cut line: the rear enters the siding at z=2.795, while
  // its front at 2.885 clears the white trim (at most 2.855). A single mitered
  // outline avoids coplanar overlapping strips at curves and rectangular corners.
  const cutEdge = (points: [number, number][], width: number) => {
    const path = points.map(p => new THREE.Vector2(...p))
    const left: THREE.Vector2[] = [], right: THREE.Vector2[] = []
    for (let i = 0; i < path.length; i++) {
      const current = path[i]!
      const before = i ? current.clone().sub(path[i - 1]!).normalize() : path[1]!.clone().sub(current).normalize()
      const after = i < path.length - 1 ? path[i + 1]!.clone().sub(current).normalize() : before.clone()
      const tangent = before.clone().add(after).normalize()
      const normal = new THREE.Vector2(-tangent.y, tangent.x)
      const previousNormal = new THREE.Vector2(-before.y, before.x)
      const offset = normal.multiplyScalar(width / 2 / Math.max(0.25, normal.dot(previousNormal)))
      left.push(current.clone().add(offset))
      right.push(current.clone().sub(offset))
    }
    const shape = new THREE.Shape()
    shape.moveTo(left[0]!.x, left[0]!.y)
    for (const p of left.slice(1)) shape.lineTo(p.x, p.y)
    for (const p of right.reverse()) shape.lineTo(p.x, p.y)
    shape.closePath()
    add(cutFacade, new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false }), m.redInset, [0, 0, 2.795])
  }
  cutEdge(Array.from({ length: 37 }, (_, i): [number, number] => {
    const angle = Math.PI + i / 36 * Math.PI
    return [-2.84 + Math.cos(angle) * 1.35, 1.74 + Math.sin(angle) * 0.99]
  }), 0.045)
  // The bedroom is exposed below its intact gable and roof. Its side wall stays finished.
  wall(cutFacade, 'z', 2.75, 0.02, 2.92, 5.46, 6.2)
  wall(cutFacade, 'z', 2.75, 0.02, 0.27, 3.48, 5.46)
  wall(cutFacade, 'z', 2.75, 2.68, 2.92, 3.48, 5.46)
  wall(cutFacade, 'x', 4.22, -2.65, 1.1, 3.46, 6.2, [{ u: -0.95, width: 1.3, bottom: 4.3, top: 5.68 }])
  window(cutFacade, 'x', 4.29, -0.95, 5, 1.28, 1.36)
  wall(cutFacade, 'x', 4.22, 1.1, 2.7, 5.62, 6.2)
  wall(cutFacade, 'x', 4.22, -2.65, -2.02, 0.5, 3.46)
  box(cutFacade, m.trim, [1.47, 3.42, 2.81], [2.62, 0.1, 0.09])
  cutEdge([[0.29, 3.46], [0.29, 5.44], [2.65, 5.44], [2.65, 3.46]], 0.04)
  // Cottage entry: white pilasters, six-panel red door, threshold and brass hardware.
  wall(facade, 'z', 2.75, -1.28, 0.03, 0.5, 3.5, [{ u: -0.62, width: 0.91, bottom: 0.5, top: 2.8 }])
  box(facade, m.red, [-0.62, 1.65, 2.79], [0.92, 2.3, 0.13])
  for (const x of [-0.84, -0.4]) for (const y of [0.95, 1.62, 2.29]) {
    box(facade, m.redInset, [x, y, 2.866], [0.32, 0.52, 0.025])
    box(facade, m.redLight, [x, y, 2.883], [0.25, 0.43, 0.013])
  }
  box(facade, m.trim, [-1.17, 1.71, 2.87], [0.14, 2.5, 0.13])
  box(facade, m.trim, [-0.07, 1.71, 2.87], [0.14, 2.5, 0.13])
  box(facade, m.trim, [-0.62, 2.95, 2.87], [1.26, 0.16, 0.15])
  box(facade, m.brass, [-0.27, 1.58, 2.89], [0.05, 0.2, 0.02])
  ball(facade, m.brass, [-0.27, 1.6, 2.93], [0.05, 0.05, 0.045])
  box(facade, m.paving, [-0.62, 0.49, 2.86], [1.24, 0.1, 0.4])
  for (const x of [-4.23, 4.23]) box(facade, m.trim, [x, x < 0 ? 2 : 3.35, -2.66], [0.15, x < 0 ? 3 : 5.7, 0.15])

  const roofPalette = [m.roof0, m.roof1, m.roof2, m.roof3]
  const gabledRoof = (cx: number, half: number, eave: number, peak: number, z0: number, z1: number, frontCut: number, leftWing: boolean) => {
    const slope = (peak - eave) / half, angle = Math.atan(slope)
    const fullWidth = Math.hypot(half + 0.22, (half + 0.22) * slope)
    for (const sign of [-1, 1]) {
      if (leftWing) {
        // A real opening around the continuous chimney: no roof timber runs through it.
        for (const [a, end, s0] of [[z0, 0.88, 0], [0.88, 1.82, 0.46], [1.82, z1, 0]]) {
          const s1 = half + 0.2, mid = (s0! + s1) / 2
          box(roof, m.roofUnder, [cx + sign * mid, peak - mid * slope, (a! + end!) / 2], [(s1 - s0!) * Math.sqrt(1 + slope * slope), 0.1, end! - a!], -sign * angle)
        }
      } else {
        for (const [a, end] of [[z0, frontCut], [frontCut, z1]]) box(roof, m.roofUnder, [cx + sign * (half + 0.2) / 2, peak - (half + 0.2) * slope / 2, (a! + end!) / 2], [fullWidth, 0.1, end! - a!], -sign * angle)
      }
      const rows = Math.ceil((half + 0.2) / 0.17), cols = Math.ceil((z1 - z0) / 0.32)
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const s = (row + 0.42) * (half + 0.2) / rows
        const z = z0 + (col + 0.5) * (z1 - z0) / cols
        if (leftWing && s < 0.55 && z > 0.72 && z < 1.98) continue
        const b = roof
        box(b, roofPalette[(row * 7 + col * 3 + (leftWing ? 1 : 0)) % 4]!, [cx + sign * s, peak - s * slope + 0.08 + (rows - row) * 0.001, z], [0.255, 0.045, (z1 - z0) / cols - 0.012], -sign * angle)
      }
      // White eave fascia and gable verge frame the silhouette.
      box(roof, m.trim, [cx + sign * (half + 0.23), eave - 0.17, (z0 + z1) / 2], [0.12, 0.2, z1 - z0 + 0.05])
      for (const z of [z0 - 0.015, z1 + 0.015]) beam(roof, m.trim, [cx, peak + 0.01, z], [cx + sign * (half + 0.27), eave - 0.17, z], 0.14, 0.15)
    }
    for (let z = z0 + 0.11; z < z1; z += 0.24) {
      if (leftWing && z > 0.77 && z < 1.93) continue
      const b = roof
      cylinder(b, m.roof1, [cx, peak + 0.12, z], 0.115, 0.235, new THREE.Euler(Math.PI / 2, 0, 0), 0.115, 12)
    }
    // The gables share the wall plane and overlap its actual top. Continuous
    // inner sheathing closes the siding joints instead of exposing the roof space.
    const wallTop = leftWing ? 3.5 : 6.2, gableBase = wallTop - 0.015
    for (const wallZ of [-2.65, 2.75]) {
      const infill = new THREE.Shape()
      infill.moveTo(cx - half, gableBase)
      infill.lineTo(cx + half, gableBase)
      infill.lineTo(cx, peak - 0.045)
      infill.closePath()
      add(roof, new THREE.ExtrudeGeometry(infill, { depth: 0.2, bevelEnabled: false }), m.plaster, [0, 0, wallZ - 0.1])
      box(roof, m.trimShade, [cx, wallTop, wallZ], [half * 2 + 0.025, 0.16, 0.24])
    }
    // Both gables remain clad, matching the nearly complete red roofs in figure 3-35.
    for (let x = cx - half + 0.075; x < cx + half; x += 0.15) {
      const height = peak - Math.abs(x - cx) * slope - gableBase
      if (height < 0.03) continue
      box(roof, m.sidingLight, [x, gableBase + height / 2, z1 - 0.25], [0.142, height, 0.09])
      box(roof, m.siding, [x, gableBase + height / 2, z0 + 0.25], [0.142, height, 0.09])
    }
  }
  gabledRoof(2.1, 2.1, 6.2, 8.0, -2.97, 3.09, 0.35, false)
  gabledRoof(-2.1, 2.12, 3.55, 5.32, -2.95, 3.09, 0.85, true)
  // Back edge of left wing is below the main house; finishing board hides the junction.
  wall(facade, 'x', -0.02, -2.65, 2.7, 3.55, 6.2)

  // 1. Masonry chimney: visible wooden collar, steel diagonal braces and bolted feet.
  for (const x of [-2.385, -1.815]) box(chimney, m.brick, [x, 5.55, -0.65], [0.1, 1.65, 0.7])
  for (const z of [-0.95, -0.35]) box(chimney, m.brick, [-2.1, 5.55, z], [0.47, 1.65, 0.1])
  for (let row = 0; row < 8; row++) for (let col = 0; col < 3; col++) {
    const x = -2.39 + col * 0.23 + (row % 2) * 0.065
    box(chimney, (row + col) % 3 ? m.brickLight : m.brick, [Math.min(x, -1.79), 4.84 + row * 0.195, -0.289], [0.208, 0.171, 0.028])
    box(chimney, row % 2 ? m.brick : m.brickLight, [-1.752, 4.84 + row * 0.195, -0.91 + col * 0.23], [0.028, 0.171, 0.208])
  }
  for (const x of [-2.415, -1.785]) box(chimney, m.concrete, [x, 6.41, -0.65], [0.21, 0.14, 0.87])
  for (const z of [-0.9675, -0.3325]) box(chimney, m.concrete, [-2.1, 6.41, z], [0.42, 0.14, 0.235])
  for (const x of [-2.47, -1.73]) box(chimney, m.plywood, [x, 5.43, -0.65], [0.065, 0.55, 0.83])
  for (const z of [-1.04, -0.26]) box(chimney, m.plywoodLight, [-2.1, 5.43, z], [0.81, 0.55, 0.065])
  for (const x of [-2.36, -1.84]) {
    const footX = x + (x < -2 ? -0.9 : 0.9)
    const footY = 5.32 - Math.abs(footX + 2.1) * (1.77 / 2.12) + 0.1
    beam(chimney, m.steel, [x, 5.58, -0.203], [footX, footY + 0.025, -0.15], 0.055, 0.065)
    box(chimney, m.steel, [footX, footY, -0.15], [0.26, 0.03, 0.25], (x < -2 ? 1 : -1) * Math.atan(1.77 / 2.12))
    jointPlate(chimney, [x, 5.58, -0.2275], 'front', 0.19, 0.24)
  }
  beam(chimney, m.steel, [-2.1, 5.6, -0.2275], [-2.1, 5.43, 0.65], 0.055, 0.06)
  for (const x of [-2.38, -1.82]) for (const y of [5.23, 5.61]) screw(chimney, x, y, -0.2275, 'front', 0.027)
  box(chimney, m.steel, [-2.1, 5.44, 0.65], [0.28, 0.03, 0.22])
  for (const x of [-2.18, -2.02]) screw(chimney, x, 5.455, 0.65, 'top')
  // Forward on the left-wing ridge so the tall main wing does not occlude it.
  for (const geometries of chimney.geometry.values()) for (const geometry of geometries) geometry.translate(0, 0, 2)

  // A straight masonry flue connects the roof chimney to a real unlit fireplace.
  // Its axis is unchanged; the narrower bookshelf beside it never intersects the flue.
  box(fireplace, m.concrete, [-2.1, 0.505, 1.35], [1.2, 0.12, 1.1])
  box(fireplace, m.pavingDark, [-2.1, 0.575, 1.34], [1.14, 0.04, 1.03])
  for (const x of [-2.55, -1.65]) box(fireplace, m.brick, [x, 1.21, 1.35], [0.15, 1.24, 0.85])
  box(fireplace, m.brick, [-2.1, 1.21, 0.98], [0.75, 1.24, 0.12])
  box(fireplace, m.brick, [-2.1, 1.85, 1.35], [1.05, 0.2, 0.85])
  box(fireplace, m.paving, [-2.1, 1.99, 1.35], [1.14, 0.1, 0.98])
  // Dark refractory lining, open mouth and a throat leading upward into the chimney.
  box(fireplace, m.black, [-2.1, 1.2, 1.047], [0.72, 1.12, 0.015])
  // The firebox liner rests directly on the refractory hearth (top 0.595).
  box(fireplace, m.bolt, [-2.1, 0.615, 1.35], [0.72, 0.04, 0.75])
  for (const x of [-2.46, -1.74]) box(fireplace, m.brickLight, [x, 1.2, 1.35], [0.025, 1.12, 0.69])
  for (let y = 0.72; y < 1.76; y += 0.19) {
    for (const x of [-2.55, -1.65]) box(fireplace, m.mortar, [x, y, 1.779], [0.15, 0.009, 0.008])
    box(fireplace, m.foundation, [-2.1, y, 1.06], [0.71, 0.006, 0.008])
  }
  // A four-legged fire grate: each leg starts on the liner at 0.635 and enters
  // a transverse rail. Every longitudinal bar overlaps both rails by 0.005.
  for (const x of [-2.37, -1.83]) for (const z of [1.23, 1.61]) {
    box(fireplace, m.bolt, [x, 0.69, z], [0.04, 0.11, 0.04])
  }
  for (const z of [1.23, 1.61]) box(fireplace, m.bolt, [-2.1, 0.745, z], [0.62, 0.04, 0.04])
  for (let i = 0; i < 7; i++) {
    const x = -2.37 + i * 0.09
    pipe(fireplace, m.bolt, [x, 0.772, 1.2], [x, 0.772, 1.64], 0.012)
  }
  for (const x of [-2.385, -1.815]) box(fireplace, m.brick, [x, 3.38, 1.35], [0.1, 2.72, 0.7])
  for (const z of [1.05, 1.65]) box(fireplace, m.brick, [-2.1, 3.38, z], [0.47, 2.72, 0.1])
  for (let y = 2.15; y < 4.72; y += 0.2) box(fireplace, m.mortar, [-2.1, y, 1.704], [0.67, 0.008, 0.008])
  // Roof flashing closes the gap around the masonry without cutting through timber.
  for (const sign of [-1, 1]) {
    const angle = Math.atan(1.77 / 2.12)
    box(fireplace, m.bolt, [-2.1 + sign * 0.47, 5.32 - 0.47 * (1.77 / 2.12) + 0.075, 1.35], [0.28, 0.025, 1.14], -sign * angle)
    for (const z of [0.83, 1.87]) box(fireplace, m.bolt, [-2.1 + sign * 0.23, 5.32 - 0.23 * (1.77 / 2.12) + 0.07, z], [0.6, 0.025, 0.16], -sign * angle)
  }

  // 2. Tall shelf, dense individual books and a clear wall fixing at both upper corners.
  box(bookshelf, m.plaster, [-2.65, 1.6775, 0.95], [2.05, 2.495, 0.08])
  box(bookshelf, m.trimShade, [-2.65, 0.5, 1.015], [2.05, 0.13, 0.05])
  wallFloorContacts.push({ group: 'Bookshelf backing wall', floorTop: FLOOR_GROUND, wallBottom: 0.43, overlap: 0.015, segments: 1 })
  box(bookshelf, m.timberDark, [-2.65, 1.56, 1.06], [1.82, 2.14, 0.09])
  for (const x of [-3.58, -1.72]) box(bookshelf, m.timberLight, [x, 1.58, 1.32], [0.1, 2.2, 0.61])
  for (const y of [0.52, 1.02, 1.53, 2.04, 2.64]) box(bookshelf, m.timberLight, [-2.65, y, 1.32], [1.96, 0.075, 0.63])
  box(bookshelf, m.timber, [-2.65, 2.69, 1.32], [2.08, 0.075, 0.7])
  const bookMats = [m.bookRed, m.bookBlue, m.bookOchre, m.bookGreen, m.bookNavy, m.bookCream, m.bookBrown]
  // Each volume has two thin covers, a separate recessed paper block and a shallow
  // curved spine. The same geometry can stand, lean or lie flat as one rigid book.
  const book = (x: number, base: number, h: number, w: number, depth: number, cover: THREE.Material, serial: number, lean = 0) => {
    const rotation = new THREE.Matrix4().makeRotationZ(lean)
    const centerY = base + Math.abs(Math.cos(lean)) * h / 2 + Math.abs(Math.sin(lean)) * w / 2
    const z = 1.39 + ((serial * 7) % 5 - 2) * 0.006
    const part = (g: THREE.BufferGeometry, mat: THREE.Material, p: V3) => {
      g.translate(...p)
      g.applyMatrix4(rotation)
      add(bookshelf, g, mat, [x, centerY, z])
    }
    part(new THREE.BoxGeometry(w - 0.012, h - 0.019, depth - 0.025), m.pages, [0, 0, -0.007])
    for (const side of [-1, 1]) part(new THREE.BoxGeometry(0.0048, h, depth), cover, [side * (w / 2 - 0.0024), 0, 0])
    // A half-cylinder has a rounded bookbinder's spine without a bulky tube shape.
    const spine = new THREE.CylinderGeometry(w / 2, w / 2, h, 12, 1, true, -Math.PI / 2, Math.PI)
    spine.scale(1, 1, 0.4)
    part(spine, cover, [0, 0, depth / 2 - 0.006])
    for (let page = 1; page < 7; page++) {
      const px = -w / 2 + 0.008 + page * (w - 0.016) / 7
      part(new THREE.BoxGeometry(0.0008, 0.001, depth - 0.038), m.pageEdges, [px, h / 2 - 0.009, -0.009])
    }
    // Restrained spine rules and a few publisher labels, not a repeating gold band.
    const printZ = depth / 2 - 0.005 + w * 0.2
    if (serial % 3 === 0) {
      part(new THREE.BoxGeometry(w * 0.63, h * 0.115, 0.0015), m.pages, [0, h * 0.16, printZ])
      for (const y of [0.15, 0.18]) part(new THREE.BoxGeometry(w * 0.4, 0.003, 0.001), m.bookBrown, [0, h * y, printZ + 0.0012])
    } else {
      part(new THREE.BoxGeometry(w * 0.47, 0.003, 0.001), m.pages, [0, h * 0.2, printZ])
      part(new THREE.BoxGeometry(w * 0.36, 0.0025, 0.001), m.pages, [0, h * 0.165, printZ])
    }
    if (serial % 4 === 0) for (const y of [-0.35, 0.35]) part(new THREE.BoxGeometry(w * 0.7, 0.003, 0.001), m.pageEdges, [0, h * y, printZ])
  }
  const shelfBases = [0.558, 1.058, 1.568, 2.078]
  for (let row = 0; row < 4; row++) {
    const base = shelfBases[row]!
    const stack = row === 1 || row === 3
    const limit = stack ? -2.31 : -1.8
    let cursor = -3.49
    for (let n = 0; n < 20; n++) {
      const serial = row * 23 + n
      const h = 0.29 + ((n * 5 + row * 3) % 7) * 0.019
      const w = 0.052 + ((n * 3 + row) % 5) * 0.012
      const depth = 0.29 + ((n * 7 + row * 2) % 5) * 0.015
      const lean = n === 7 || n === 8 ? -0.09 : n === 12 ? 0.11 : 0
      const footprint = Math.abs(Math.cos(lean)) * w + Math.abs(Math.sin(lean)) * h
      if (cursor + footprint > limit) break
      book(cursor + footprint / 2, base, h, w, depth, bookMats[(n * 3 + row * 2) % bookMats.length]!, serial, lean)
      cursor += footprint + 0.005 + (n % 6 === 5 ? 0.019 : 0)
    }
    if (stack) {
      let y = base
      for (let n = 0; n < 3; n++) {
        const thickness = 0.052 + n * 0.009
        book(-2.055 + (n % 2) * 0.025, y, 0.38 + (n % 2) * 0.035, thickness, 0.31 + n * 0.015, bookMats[(row + n * 2) % bookMats.length]!, 100 + row * 3 + n, Math.PI / 2)
        y += thickness + 0.003
      }
    }
  }
  for (const x of [-3.35, -1.95]) {
    box(bookshelf, m.steel, [x, 2.72, 1.14], [0.16, 0.035, 0.38])
    box(bookshelf, m.steel, [x, 2.82, 0.97], [0.16, 0.23, 0.03])
    screw(bookshelf, x, 2.88, 0.985)
    screw(bookshelf, x, 2.7375, 1.24, 'top')
  }
  box(bookshelf, m.rug, [-2.6, 0.459, 2.06], [1.9, 0.025, 0.89])
  for (const z of [1.64, 2.48]) box(bookshelf, m.rugEdge, [-2.6, 0.475, z], [1.9, 0.008, 0.035])
  for (const [mat, geometries] of bookshelf.geometry) for (const geometry of geometries) {
    geometry.translate(2.65, 0, 0)
    geometry.scale(0.65, 1, 1)
    geometry.translate(-3.35, 0, mat === m.rug || mat === m.rugEdge ? 0.05 : 0.25)
  }

  // 3. A blue quilted bed, no heavy shelf or objects overhead, clear of the windows.
  const bx = 1.3, bz = 0.15
  for (const x of [bx - 0.67, bx + 0.67]) for (const z of [bz - 1.0, bz + 1.0]) box(bedroom, m.timberDark, [x, 3.62, z], [0.13, 0.48, 0.13])
  box(bedroom, m.timberDark, [bx, 3.73, bz], [1.54, 0.24, 2.25])
  box(bedroom, m.pillow, [bx, 3.94, bz], [1.49, 0.2, 2.16])
  box(bedroom, m.blue, [bx, 4.075, bz + 0.22], [1.52, 0.12, 1.73])
  box(bedroom, m.blueDark, [bx, 3.95, bz + 1.08], [1.55, 0.38, 0.065])
  for (const x of [bx - 0.77, bx + 0.77]) box(bedroom, m.blueDark, [x, 3.97, bz + 0.22], [0.055, 0.3, 1.77])
  for (let i = 0; i < 7; i++) box(bedroom, i % 2 ? m.blueLight : m.blueDark, [bx - 0.66 + i * 0.22, 4.14, bz + 0.22], [0.012, 0.008, 1.72])
  for (let i = 0; i < 9; i++) box(bedroom, i % 3 ? m.blueLight : m.blueDark, [bx, 4.142, bz - 0.57 + i * 0.2], [1.5, 0.008, 0.014])
  for (const x of [bx - 0.38, bx + 0.38]) {
    box(bedroom, m.pillow, [x, 4.14, bz - 0.72], [0.63, 0.18, 0.42])
    box(bedroom, m.blueLight, [x, 4.232, bz - 0.72], [0.57, 0.009, 0.34])
  }
  box(bedroom, m.timberDark, [bx, 4.15, bz - 1.13], [1.66, 1.2, 0.13])
  box(bedroom, m.timberLight, [bx, 4.31, bz - 1.052], [1.41, 0.7, 0.035])
  for (const x of [bx - 0.57, bx, bx + 0.57]) box(bedroom, m.timber, [x, 4.31, bz - 1.024], [0.035, 0.7, 0.035])
  // A low bedside cabinet, with nothing hanging above the bed.
  box(bedroom, m.timber, [0.24, 3.75, -0.64], [0.32, 0.68, 0.5])
  box(bedroom, m.timberLight, [0.24, 4.11, -0.64], [0.36, 0.055, 0.56])
  for (const y of [3.62, 3.89]) {
    box(bedroom, m.timberLight, [0.24, y, -0.374], [0.25, 0.21, 0.025])
    ball(bedroom, m.brass, [0.24, y, -0.345], [0.022, 0.022, 0.02], 0)
  }

  // 4. Structural sheathing remains visible on the right cut face and bears nail heads.
  box(sheathing, m.plywood, [4.005, 1.82, -0.88], [0.07, 2.48, 2.18])
  box(sheathing, m.plywoodLight, [4.048, 1.82, -0.88], [0.022, 2.41, 2.11])
  for (const z of [-1.92, -1.38, -0.82, -0.26, 0.18]) box(sheathing, m.timberLight, [4.12, 1.83, z], [0.16, 2.65, 0.14])
  for (const y of [0.57, 1.45, 2.23, 3.07]) box(sheathing, m.timber, [4.12, y, -0.87], [0.17, 0.1, 2.33])
  for (let y = 0.75; y < 3; y += 0.3) for (const z of [-1.83, -0.88, 0.07]) screw(sheathing, 4.059, y, z, 'side', 0.018)
  // Thin wood grain lines, actual geometry, low contrast so they do not look like cracks.
  for (let i = 0; i < 9; i++) box(sheathing, i % 3 ? m.plywood : m.plywoodLight, [4.063, 0.77 + i * 0.245, -0.88], [0.003, 0.009, 2.03])

  // 5. Anchor rods, hex nuts, washers, post base and sill plate fixed into concrete.
  box(anchors, m.concrete, [-3.58, 0.37, 2.68], [1.04, 0.09, 0.23])
  // A shallow real recess in the sill receives the splice at the post face.
  // This keeps the connection behind the finished siding in the complete view.
  box(anchors, m.timberLight, [-3.91, 0.5, 2.68], [0.38, 0.17, 0.23])
  box(anchors, m.timberLight, [-3.27, 0.5, 2.68], [0.42, 0.17, 0.23])
  box(anchors, m.timberLight, [-3.6, 0.5, 2.665], [0.24, 0.17, 0.20])
  box(anchors, m.timberLight, [-3.6, 0.4375, 2.78], [0.24, 0.045, 0.03])
  box(anchors, m.timber, [-3.6, 0.94, 2.68], [0.28, 0.78, 0.17])
  box(anchors, m.steel, [-3.6, 0.69, 2.771], [0.24, 0.46, 0.012])
  for (const x of [-3.93, -3.29]) {
    pipe(anchors, m.steel, [x, 0.70, 2.7], [x, 0.10, 2.7], 0.022)
    const embeddedHook = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.11, 2.7), new THREE.Vector3(x, 0.015, 2.7),
      new THREE.Vector3(x + 0.06, -0.04, 2.7), new THREE.Vector3(x + 0.12, 0.005, 2.7),
      new THREE.Vector3(x + 0.12, 0.045, 2.7),
    ])
    add(anchors, new THREE.TubeGeometry(embeddedHook, 20, 0.022, 10, false), m.steel)
    cylinder(anchors, m.steel, [x, 0.594, 2.7], 0.075, 0.018)
    cylinder(anchors, m.bolt, [x, 0.627, 2.7], 0.047, 0.055, undefined, 0.047, 6)
  }
  for (const x of [-3.675, -3.525]) for (const y of [0.52, 0.82]) screw(anchors, x, y, 2.777, 'front', 0.022)

  // 6. White cylindrical water heater, TWO steel straps, wall plates and connected pipes.
  const hx = 1.45, hz = 1.55
  box(heater, m.plaster, [hx, 1.475, hz - 0.53], [1.23, 2.09, 0.085])
  box(heater, m.trimShade, [hx, 0.5, hz - 0.4625], [1.23, 0.13, 0.05])
  for (const x of [hx - 0.51, hx + 0.51]) box(heater, m.timber, [x, 1.495, hz - 0.59], [0.12, 2.13, 0.13])
  wallFloorContacts.push({ group: 'Water-heater backing wall', floorTop: FLOOR_GROUND, wallBottom: 0.43, overlap: 0.015, segments: 1 })
  cylinder(heater, m.heaterShade, [hx, 0.52, hz], 0.365, 0.1)
  cylinder(heater, m.heater, [hx, 1.27, hz], 0.345, 1.45)
  cylinder(heater, m.heaterShade, [hx, 2.01, hz], 0.35, 0.065)
  cylinder(heater, m.heater, [hx, 2.05, hz], 0.31, 0.03)
  for (const y of [0.9, 1.68]) {
    add(heater, new THREE.TorusGeometry(0.354, 0.025, 4, 48), m.steel, [hx, y, hz], new THREE.Euler(Math.PI / 2, 0, 0))
    // Broad band face, rather than a thin decorative ring.
    const band = new THREE.CylinderGeometry(0.358, 0.358, 0.1, 48, 1, true)
    add(heater, band, m.steel, [hx, y, hz])
    for (const sign of [-1, 1]) {
      beam(heater, m.steel, [hx + sign * 0.33, y, hz - 0.12], [hx + sign * 0.47, y, hz - 0.47], 0.032, 0.11)
      jointPlate(heater, [hx + sign * 0.47, y, hz - 0.4875], 'front', 0.14, 0.2)
    }
    box(heater, m.bolt, [hx, y, hz + 0.366], [0.12, 0.12, 0.026])
    screw(heater, hx, y, hz + 0.379)
  }
  box(heater, m.heaterShade, [hx, 0.69, hz + 0.343], [0.23, 0.24, 0.04])
  box(heater, m.glassDark, [hx, 1.3, hz + 0.348], [0.17, 0.25, 0.018])
  box(heater, m.trim, [hx, 1.3, hz + 0.361], [0.13, 0.18, 0.012])
  cylinder(heater, m.bolt, [hx, 0.7, hz + 0.385], 0.045, 0.035, new THREE.Euler(Math.PI / 2, 0, 0))
  for (const sign of [-1, 1]) {
    const x = hx + sign * 0.16
    pipe(heater, m.pipe, [x, 2.04, hz], [x, 2.32, hz], 0.027)
    pipe(heater, m.pipe, [x, 2.32, hz], [x, 2.32, hz - 0.5], 0.027)
    cylinder(heater, sign < 0 ? m.red : m.blue, [x, 2.14, hz], 0.047, 0.085)
  }
  box(heater, m.utilityGreen, [2.4, 0.87, 1.2], [0.56, 0.79, 0.54])
  box(heater, m.trimShade, [2.4, 1.28, 1.2], [0.59, 0.06, 0.57])
  for (const y of [0.63, 1.02]) box(heater, m.trimShade, [2.4, y, 1.475], [0.54, 0.025, 0.02])

  // 7. L straps, gusset plates and screw heads at the front beam/post node.
  box(connectors, m.timberLight, [4.04, 2.86, 2.64], [0.3, 0.65, 0.24])
  box(connectors, m.timber, [3.67, 3.18, 2.64], [0.96, 0.25, 0.24])
  box(connectors, m.steel, [3.965, 3.06, 2.7775], [0.18, 0.56, 0.035])
  box(connectors, m.steel, [3.75, 3.25, 2.7775], [0.61, 0.18, 0.035])
  jointPlate(connectors, [4.19, 3.14, 2.52], 'side', 0.32, 0.47)
  for (const y of [2.85, 3.03, 3.25]) screw(connectors, 3.965, y, 2.795)
  for (const x of [3.52, 3.72]) screw(connectors, x, 3.25, 2.795)
  // Metal reinforcement repeated at other structural nodes shows an integrated frame.
  for (const x of [0.05, 2.9]) jointPlate(connectors, [x, 3.13, 2.73], 'front', 0.27, 0.36)
  for (const z of [-1.94, -0.83, 0.27]) jointPlate(connectors, [4.19, 3.08, z], 'side', 0.24, 0.32)

  // Optional kitchen/entry extension: a connected, supported room for further study.
  const extensionBucket = (name: string, id?: number, hideInCutaway = false) => {
    const b = bucket(name, id, hideInCutaway)
    extensionRoot.add(b.group)
    return b
  }
  const extBuilding = extensionBucket('Extension foundation, floor, retained walls and doorway')
  const extShell = extensionBucket('Removable extension roof and front wall', undefined, true)
  const extCut = extensionBucket('Extension low cut edge')
  cutawayOnly.push(extCut.group)
  const extKitchen = extensionBucket('Kitchen worktop, sink and fitted lower cupboards')
  const cupboards = extensionBucket('8 — Cupboard latch securing both doors', 8)
  const lowStorage = extensionBucket('9 — Heavy cookware on low shelves', 9)
  const pendant = extensionBucket('10 — Ceiling light attached to a structural member', 10)
  const emergency = extensionBucket('11 — Emergency kit beside an unobstructed entry', 11)
  box(extBuilding, m.grass, [6.2, -0.14, 0.06], [4.55, 0.16, 6.2])
  box(extBuilding, m.concrete, [6.22, 0.02, 0.05], [4.12, 0.36, 5.55])
  box(extBuilding, m.foundation, [6.25, 0.13, 2.8], [4.19, 0.42, 0.23])
  box(extBuilding, m.foundation, [8.3, 0.13, 0.05], [0.22, 0.42, 5.65])
  for (let i = 0; i < 7; i++) box(extBuilding, m.mortar, [4.3 + i * 0.63, 0.13, 2.923], [0.012, 0.4, 0.008])
  box(extBuilding, m.floorDark, [6.22, 0.315, 0.05], [4.04, 0.05, 5.3])
  for (let i = 0; i < 20; i++) box(extBuilding, i % 3 ? m.floorLight : m.floor, [4.31 + i * 0.2, 0.39, 0.05], [0.194, 0.11, 5.3])
  wall(extBuilding, 'z', -2.65, 4.22, 8.24, 0.5, 3.2, [{ u: 7.08, width: 0.35, bottom: 2.55, top: 2.85 }])
  wall(extBuilding, 'x', 8.24, -2.65, 2.7, 0.5, 3.2, [{ u: 1.1, width: 1.1, bottom: 1.45, top: 2.63 }])
  window(extBuilding, 'x', 8.31, 1.1, 2.04, 1.08, 1.16)
  wall(extShell, 'z', 2.75, 4.25, 8.24, 0.5, 3.2, [{ u: 7.3, width: 0.98, bottom: 0.5, top: 2.66 }, { u: 5.5, width: 1.12, bottom: 1.47, top: 2.62 }])
  window(extShell, 'z', 2.83, 5.5, 2.045, 1.1, 1.13)
  wall(extCut, 'z', 2.75, 5.85, 6.65, 0.5, 0.67)
  for (const x of [6.81, 7.79]) box(extBuilding, m.trim, [x, 1.58, 2.83], [0.11, 2.22, 0.13])
  box(extBuilding, m.trim, [7.3, 2.69, 2.83], [1.1, 0.12, 0.13])
  // Entrance door stands open, beside the continuous clear path from the main house.
  box(extBuilding, m.utilityGreen, [7.79, 1.56, 2.31], [0.065, 2.12, 0.91])
  for (const y of [1.05, 2.04]) box(extBuilding, m.trimShade, [7.833, y, 2.31], [0.022, 0.76, 0.72])
  box(extBuilding, m.brass, [7.849, 1.53, 1.99], [0.025, 0.16, 0.04])
  // A solid sill overlaps both the finished floor and the outer stone landing.
  // The open doorway must not leave a daylight slot at the building edge.
  box(extBuilding, m.paving, [7.3, 0.425, 2.78], [1.1, 0.06, 0.38])
  box(extBuilding, m.paving, [7.3, 0.25, 3.06], [1.45, 0.38, 0.64])
  box(extBuilding, m.paving, [7.3, 0.13, 3.55], [1.68, 0.25, 0.44])
  box(extBuilding, m.paving, [7.3, 0.02, 3.96], [1.85, 0.12, 0.38])
  for (const x of [4.25, 8.2]) for (const z of [-2.55, 2.65]) box(extBuilding, m.trim, [x, 1.84, z], [0.15, 2.76, 0.15])
  for (let z = -2.45; z <= 2.55; z += 0.85) box(extBuilding, m.timber, [6.2, 3.08, z], [3.95, 0.16, 0.13])
  // Shallow attached roof, supported on the wall plates and joists below it.
  const annexAngle = Math.atan(0.28 / 4.2)
  // Sloping infill follows the underside of the roof; the outside shell has no
  // daylight slot between the flat wall top and the higher side of the roof.
  for (let x = 4.295; x < 8.24; x += 0.15) {
    const top = 3.34 - (x - 6.22) * Math.tan(annexAngle) - 0.045
    if (top <= 3.19) continue
    for (const [b, z] of [[extBuilding, -2.65], [extShell, 2.75]] as [Bucket, number][]) {
      box(b, m.siding, [x, (3.19 + top) / 2, z], [0.149, top - 3.19, 0.105])
      box(b, m.plaster, [x, (3.19 + top) / 2, z + (z < 0 ? 0.085 : -0.085)], [0.15, top - 3.19, 0.05])
    }
  }
  box(extShell, m.roofUnder, [6.22, 3.34, 0.05], [4.43, 0.12, 5.9], -annexAngle)
  for (let row = 0; row < 18; row++) for (let col = 0; col < 18; col++) {
    const x = 4.1 + (row + 0.5) * 4.25 / 18
    const z = -2.88 + (col + 0.5) * 5.85 / 18
    box(extShell, roofPalette[(row * 3 + col) % 4]!, [x, 3.34 - (x - 6.22) * Math.tan(annexAngle) + 0.08, z], [0.27, 0.04, 0.32], -annexAngle)
  }
  for (const z of [-2.94, 3.04]) beam(extShell, m.trim, [4.02, 3.49, z], [8.43, 3.195, z], 0.15)
  box(extShell, m.trim, [8.4, 3.2, 0.05], [0.14, 0.19, 6.05])
  box(extShell, m.steel, [4.25, 3.48, 0.05], [0.08, 0.22, 5.88])

  // A fitted kitchen gives the safety examples ordinary household context.
  // The lower cabinet is hollow so the sink basin actually descends into it.
  box(extKitchen, m.trimShade, [6.3, 0.855, -2.46], [2.55, 0.66, 0.04])
  box(extKitchen, m.trimShade, [6.3, 0.535, -2.12], [2.55, 0.04, 0.72])
  for (const x of [5.025, 5.9, 6.6, 7.575]) box(extKitchen, m.trimShade, [x, 0.85, -2.12], [0.045, 0.67, 0.72])
  // Recessed plinth bears on the floor; face rails and stiles back the small
  // door gaps while leaving the sink and lower cupboard interiors genuinely hollow.
  box(extKitchen, m.timberDark, [6.3, 0.49, -2.12], [2.55, 0.11, 0.67])
  for (const y of [0.535, 1.16]) box(extKitchen, m.trimShade, [6.315, y, -1.777], [2.56, 0.05, 0.06])
  for (const x of [5.055, 5.685, 6.315, 6.945, 7.575]) box(extKitchen, m.trimShade, [x, 0.85, -1.777], [0.04, 0.65, 0.06])
  // Four counter pieces leave a genuine 0.68 × 0.58 opening for the basin.
  box(extKitchen, m.paving, [5.0525, 1.21, -2.1], [0.175, 0.07, 0.84])
  box(extKitchen, m.paving, [6.7275, 1.21, -2.1], [1.815, 0.07, 0.84])
  for (const z of [-2.455, -1.745]) box(extKitchen, m.paving, [5.48, 1.21, z], [0.68, 0.07, 0.13])
  for (const x of [5.37, 6.0, 6.63, 7.26]) {
    box(extKitchen, m.utilityGreen, [x, 0.85, -1.746], [0.622, 0.64, 0.03])
    box(extKitchen, m.trimShade, [x, 0.85, -1.724], [0.49, 0.5, 0.014])
    for (const end of [-1, 1]) {
      box(extKitchen, m.steel, [x + end * 0.12, 1.055, -1.713], [0.047, 0.047, 0.012])
      pipe(extKitchen, m.bolt, [x + end * 0.12, 1.055, -1.707], [x + end * 0.12, 1.055, -1.651], 0.017)
    }
    pipe(extKitchen, m.bolt, [x - 0.135, 1.055, -1.651], [x + 0.135, 1.055, -1.651], 0.02)
  }
  box(extKitchen, m.steel, [5.48, 1.025, -2.1], [0.55, 0.018, 0.45])
  for (const sign of [-1, 1]) {
    box(extKitchen, m.steel, [5.48 + sign * 0.302, 1.135, -2.1], [0.018, 0.23, 0.55], -sign * Math.atan(0.055 / 0.22))
    add(extKitchen, new THREE.BoxGeometry(0.63, 0.23, 0.018), m.steel, [5.48, 1.135, -2.1 + sign * 0.252], new THREE.Euler(sign * Math.atan(0.055 / 0.22), 0, 0))
    box(extKitchen, m.steel, [5.48 + sign * 0.337, 1.252, -2.1], [0.035, 0.02, 0.6])
    box(extKitchen, m.steel, [5.48, 1.252, -2.1 + sign * 0.286], [0.65, 0.02, 0.035])
  }
  cylinder(extKitchen, m.bolt, [5.48, 1.039, -2.1], 0.038, 0.008, undefined, 0.038, 16)
  const tapCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(5.48, 1.245, -2.43), new THREE.Vector3(5.48, 1.51, -2.43), new THREE.Vector3(5.48, 1.63, -2.31), new THREE.Vector3(5.48, 1.56, -2.14)])
  add(extKitchen, new THREE.TubeGeometry(tapCurve, 24, 0.018, 10, false), m.steel)
  cylinder(extKitchen, m.steel, [5.48, 1.26, -2.43], 0.043, 0.03)
  for (const sign of [-1, 1]) {
    const x = 5.48 + sign * 0.19
    cylinder(extKitchen, m.steel, [x, 1.29, -2.43], 0.035, 0.09)
    cylinder(extKitchen, sign < 0 ? m.red : m.blue, [x, 1.337, -2.43], 0.018, 0.008, undefined, 0.018, 12)
    pipe(extKitchen, m.steel, [x, 1.325, -2.43], [x + sign * 0.07, 1.36, -2.36], 0.017)
    box(extKitchen, m.steel, [x + sign * 0.07, 1.36, -2.34], [0.045, 0.03, 0.09])
  }
  box(extKitchen, m.black, [7.08, 1.256, -2.09], [0.69, 0.022, 0.55])
  for (const x of [6.9, 7.25]) for (const z of [-2.23, -1.95]) cylinder(extKitchen, m.bolt, [x, 1.274, z], 0.095, 0.012)
  // A tiled non-combustible backsplash, independent extractor hood and a wall duct.
  for (let x = 6.49; x < 7.69; x += 0.2) for (let y = 1.37; y < 2.04; y += 0.17) box(extKitchen, m.trim, [x, y, -2.545], [0.192, 0.162, 0.025])
  const hood = new THREE.CylinderGeometry(0.23, 0.62, 0.27, 4)
  hood.rotateY(Math.PI / 4)
  hood.scale(1, 1, 0.75)
  add(extKitchen, hood, m.steel, [7.08, 2.16, -2.1])
  box(extKitchen, m.bolt, [7.08, 2.019, -2.1], [0.84, 0.025, 0.62])
  for (let x = 6.73; x < 7.47; x += 0.06) box(extKitchen, m.steel, [x, 2.003, -2.1], [0.027, 0.014, 0.5])
  box(extKitchen, m.steel, [7.08, 2.55, -2.1], [0.31, 0.55, 0.28])
  box(extKitchen, m.steel, [7.08, 2.7, -2.45], [0.31, 0.25, 0.7])
  box(extKitchen, m.bolt, [7.08, 2.7, -2.8], [0.41, 0.34, 0.04])
  for (let y = 2.57; y < 2.85; y += 0.055) box(extKitchen, m.steel, [7.08, y, -2.827], [0.38, 0.025, 0.035])

  // 8. Two cabinet doors have real hinge leaves, handles and a bridging latch.
  box(cupboards, m.timber, [5.72, 2.31, -2.18], [1.46, 0.72, 0.6])
  for (const x of [5.365, 6.075]) {
    box(cupboards, m.utilityGreen, [x, 2.31, -1.86], [0.69, 0.685, 0.04])
    box(cupboards, m.trimShade, [x, 2.31, -1.834], [0.56, 0.53, 0.016])
  }
  for (const x of [5.025, 6.415]) for (const y of [2.07, 2.55]) {
    box(cupboards, m.steel, [x, y, -1.8275], [0.07, 0.15, 0.025])
    screw(cupboards, x, y - 0.04, -1.815, 'front', 0.015)
    screw(cupboards, x, y + 0.04, -1.815, 'front', 0.015)
  }
  for (const x of [5.55, 5.89]) pipe(cupboards, m.steel, [x, 2.15, -1.785], [x, 2.47, -1.785], 0.013)
  for (const x of [5.65, 5.79]) {
    box(cupboards, m.steel, [x, 2.31, -1.811], [0.1, 0.13, 0.026])
    screw(cupboards, x, 2.27, -1.798, 'front', 0.014)
    screw(cupboards, x, 2.35, -1.798, 'front', 0.014)
  }
  box(cupboards, m.bolt, [5.72, 2.31, -1.784], [0.23, 0.045, 0.027])
  cylinder(cupboards, m.steel, [5.64, 2.31, -1.758], 0.025, 0.026, new THREE.Euler(Math.PI / 2, 0, 0), 0.025, 12)
  box(cupboards, m.steel, [5.81, 2.31, -1.759], [0.035, 0.07, 0.045])

  // 9. The heaviest items occupy the bottom shelf; only light baskets are above.
  box(lowStorage, m.timber, [7.65, 1.47, -0.61], [0.99, 1.99, 0.07])
  for (const x of [7.17, 8.13]) box(lowStorage, m.timberLight, [x, 1.47, -0.24], [0.075, 1.99, 0.79])
  for (const y of [0.54, 1.16, 1.82, 2.44]) box(lowStorage, m.timberLight, [7.65, y, -0.24], [1.03, 0.075, 0.8])
  jointPlate(lowStorage, [8.1675, 2.37, -0.25], 'side', 0.23, 0.2)
  for (const x of [7.43, 7.82]) {
    cylinder(lowStorage, m.steel, [x, 0.76, -0.16], 0.155, 0.33)
    cylinder(lowStorage, m.bolt, [x, 0.926, -0.16], 0.145, 0.015)
    cylinder(lowStorage, m.steel, [x, 0.942, -0.16], 0.158, 0.022)
    ball(lowStorage, m.bolt, [x, 0.978, -0.16], [0.04, 0.025, 0.04])
    for (const sign of [-1, 1]) pipe(lowStorage, m.bolt, [x + sign * 0.15, 0.83, -0.2], [x + sign * 0.21, 0.83, -0.2], 0.017)
  }
  for (const x of [7.4, 7.87]) {
    box(lowStorage, m.pages, [x, 1.36, -0.2], [0.31, 0.31, 0.41])
    box(lowStorage, m.bookCream, [x, 1.52, -0.2], [0.33, 0.035, 0.43])
  }
  for (const x of [7.43, 7.87]) {
    box(lowStorage, m.timberDark, [x, 1.88, -0.2], [0.33, 0.04, 0.4])
    for (let n = 0; n < 6; n++) for (const z of [-0.4, 0.0]) box(lowStorage, m.plywoodLight, [x - 0.145 + n * 0.058, 2.01, z], [0.025, 0.27, 0.02])
    for (const z of [-0.4, 0.0]) box(lowStorage, m.timberLight, [x, 2.15, z], [0.35, 0.03, 0.035])
  }

  // 10. The ceiling plate touches a continuous structural joist; rod and secondary
  // cable both terminate on physical fittings instead of floating in space.
  box(pendant, m.steel, [5.65, 2.9825, 0.1], [0.25, 0.035, 0.26])
  for (const x of [5.57, 5.73]) for (const z of [0.02, 0.18]) screw(pendant, x, 2.965, z, 'bottom', 0.022)
  cylinder(pendant, m.bolt, [5.65, 2.935, 0.1], 0.05, 0.06)
  pipe(pendant, m.steel, [5.65, 2.91, 0.1], [5.65, 2.45, 0.1], 0.012)
  pipe(pendant, m.bolt, [5.73, 2.965, 0.1], [5.8, 2.48, 0.1], 0.006)
  pipe(pendant, m.bolt, [5.8, 2.48, 0.1], [5.65, 2.46, 0.1], 0.006)
  cylinder(pendant, m.trimShade, [5.65, 2.4, 0.1], 0.24, 0.16, undefined, 0.06, 32)
  cylinder(pendant, m.trim, [5.65, 2.316, 0.1], 0.238, 0.012, undefined, 0.238, 32)
  const glow = material('#fff2d2', 0.5)
  glow.emissive.set('#d6bb84')
  glow.emissiveIntensity = 0.15
  ball(pendant, glow, [5.65, 2.3, 0.1], [0.08, 0.07, 0.08], 2)

  // 11. A compact emergency station leaves the entire entry path clear.
  box(emergency, m.timberLight, [5.3, 0.65, 1.15], [1.2, 0.1, 0.7])
  for (const x of [4.77, 5.83]) for (const z of [0.87, 1.43]) box(emergency, m.timber, [x, 0.54, z], [0.065, 0.23, 0.065])
  // A soft emergency backpack, with its flat base resting on the bench at 0.700.
  // The shoulder straps belong on its rear; they are not straight rods on the face.
  const packFabric = material('#596e56', 0.98), packPocket = material('#65795a', 0.98), packWebbing = material('#394b3f', 0.99)
  const packShape = new THREE.Shape()
  packShape.moveTo(-0.15, 0)
  packShape.lineTo(0.15, 0)
  packShape.quadraticCurveTo(0.183, 0, 0.185, 0.035)
  packShape.lineTo(0.18, 0.29)
  packShape.bezierCurveTo(0.177, 0.39, 0.105, 0.452, 0.015, 0.452)
  packShape.bezierCurveTo(-0.085, 0.455, -0.177, 0.397, -0.181, 0.29)
  packShape.lineTo(-0.185, 0.035)
  packShape.quadraticCurveTo(-0.183, 0, -0.15, 0)
  packShape.closePath()
  const packBody = new THREE.ExtrudeGeometry(packShape, { depth: 0.19, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.025, bevelSegments: 4, curveSegments: 14, steps: 1 })
  packBody.computeBoundingBox()
  const packBaseY = 0.7 - packBody.boundingBox!.min.y
  add(emergency, packBody, packFabric, [5.11, packBaseY, 1.06])
  const pocketShape = new THREE.Shape()
  pocketShape.moveTo(-0.105, 0)
  pocketShape.lineTo(0.105, 0)
  pocketShape.quadraticCurveTo(0.14, 0, 0.14, 0.033)
  pocketShape.lineTo(0.14, 0.144)
  pocketShape.quadraticCurveTo(0.14, 0.185, 0.10, 0.185)
  pocketShape.lineTo(-0.10, 0.185)
  pocketShape.quadraticCurveTo(-0.14, 0.185, -0.14, 0.144)
  pocketShape.lineTo(-0.14, 0.033)
  pocketShape.quadraticCurveTo(-0.14, 0, -0.105, 0)
  pocketShape.closePath()
  add(emergency, new THREE.ExtrudeGeometry(pocketShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.018, bevelSegments: 3, curveSegments: 10 }), packPocket, [5.11, 0.775, 1.274])
  const clothCurve = (points: V3[], mat: THREE.Material, radius: number) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    add(emergency, new THREE.TubeGeometry(curve, 24, radius, 8, false), mat)
  }
  clothCurve([[4.948, 1.035, 1.274], [4.974, 1.108, 1.278], [5.11, 1.145, 1.278], [5.246, 1.105, 1.278], [5.274, 1.025, 1.274]], packWebbing, 0.0045)
  clothCurve([[4.987, 0.942, 1.329], [5.11, 0.956, 1.329], [5.233, 0.942, 1.329]], packWebbing, 0.0038)
  box(emergency, m.bolt, [5.248, 1.097, 1.284], [0.014, 0.021, 0.008])
  add(emergency, new THREE.TorusGeometry(0.011, 0.0026, 5, 12), m.bolt, [5.252, 1.078, 1.291])
  box(emergency, m.bolt, [5.225, 0.946, 1.331], [0.012, 0.017, 0.006])
  add(emergency, new THREE.TorusGeometry(0.009, 0.0024, 5, 10), m.bolt, [5.228, 0.930, 1.336])
  // Broad curved webbing has a rectangular section and both ends sewn into the pack.
  const strapProfile = new THREE.Shape()
  strapProfile.moveTo(-0.018, -0.004)
  strapProfile.lineTo(0.018, -0.004)
  strapProfile.lineTo(0.018, 0.004)
  strapProfile.lineTo(-0.018, 0.004)
  strapProfile.closePath()
  for (const x of [5.015, 5.205]) {
    const shoulder = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 1.118, 1.055), new THREE.Vector3(x, 1.045, 0.986),
      new THREE.Vector3(x, 0.84, 0.980), new THREE.Vector3(x, 0.755, 1.055),
    ])
    add(emergency, new THREE.ExtrudeGeometry(strapProfile, { steps: 22, bevelEnabled: false, extrudePath: shoulder }), packWebbing)
  }
  clothCurve([[5.052, 1.142, 1.155], [5.058, 1.220, 1.155], [5.11, 1.237, 1.155], [5.165, 1.218, 1.155], [5.169, 1.142, 1.155]], packWebbing, 0.009)
  box(emergency, m.trimShade, [5.11, 0.863, 1.327], [0.12, 0.012, 0.004])
  box(emergency, m.heater, [5.53, 0.86, 1.18], [0.32, 0.29, 0.23])
  box(emergency, m.red, [5.53, 0.86, 1.3], [0.065, 0.17, 0.009])
  box(emergency, m.red, [5.53, 0.86, 1.301], [0.17, 0.065, 0.01])
  for (const x of [4.83, 4.94]) {
    cylinder(emergency, m.glassLight, [x, 0.87, 0.94], 0.043, 0.31, undefined, 0.034, 14)
    cylinder(emergency, m.blueDark, [x, 1.034, 0.94], 0.035, 0.025, undefined, 0.035, 12)
  }
  cylinder(emergency, m.bolt, [5.77, 0.83, 1.14], 0.055, 0.24, undefined, 0.055, 16)
  cylinder(emergency, m.heater, [5.77, 0.96, 1.14], 0.065, 0.025, undefined, 0.065, 16)
  // Small threshold mat sits flush with the floor; no object occupies the through-route.
  box(extBuilding, m.rug, [7.27, 0.453, 2.18], [0.87, 0.014, 0.58])

  // A compact dining place occupies the clear rear of the living room. It is
  // separated from the fireplace, bookshelf and doorway rather than obstructing them.
  const tableX = -2.35, tableZ = -0.85
  const tabletopOutline = new THREE.Shape()
  tabletopOutline.moveTo(-0.71, -0.385)
  tabletopOutline.lineTo(0.71, -0.385)
  tabletopOutline.lineTo(0.71, 0.385)
  tabletopOutline.lineTo(-0.71, 0.385)
  tabletopOutline.closePath()
  const tabletop = new THREE.ExtrudeGeometry(tabletopOutline, { depth: 0.044, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.008, bevelSegments: 2, steps: 1 })
  tabletop.rotateX(Math.PI / 2)
  add(dining, tabletop, m.timberLight, [tableX, 1.222, tableZ])
  // Tapered legs start on the finished floor and enter both the apron and top.
  for (const x of [tableX - 0.585, tableX + 0.585]) for (const z of [tableZ - 0.285, tableZ + 0.285]) {
    cylinder(dining, m.timber, [x, 0.8175, z], 0.035, 0.745, new THREE.Euler(0, Math.PI / 4, 0), 0.049, 4)
  }
  for (const z of [tableZ - 0.285, tableZ + 0.285]) box(dining, m.timber, [tableX, 1.10, z], [1.21, 0.16, 0.045])
  for (const x of [tableX - 0.585, tableX + 0.585]) box(dining, m.timber, [x, 1.10, tableZ], [0.045, 0.16, 0.61])
  for (const [cz, facing] of [[-1.75, 1], [0.05, -1]]) {
    const rearZ = cz! - facing! * 0.20, frontZ = cz! + facing! * 0.19
    box(dining, m.timberLight, [tableX, 0.89, cz!], [0.50, 0.06, 0.48])
    for (const x of [tableX - 0.20, tableX + 0.20]) {
      box(dining, m.timber, [x, 0.6725, frontZ], [0.045, 0.455, 0.045])
      // Continuous back posts are anchored by their lower ends; the backrest
      // rails and slats meet these posts with small physical overlaps.
      beam(dining, m.timber, [x, FLOOR_GROUND, rearZ], [x, 1.46, rearZ - facing! * 0.03], 0.045)
      box(dining, m.timber, [x, 0.825, cz!], [0.045, 0.08, 0.42])
      beam(dining, m.timber, [x, 0.64, rearZ - facing! * 0.006], [x, 0.64, frontZ], 0.025)
    }
    for (const z of [rearZ, frontZ]) box(dining, m.timber, [tableX, 0.825, z], [0.445, 0.08, 0.045])
    box(dining, m.timberLight, [tableX, 1.405, rearZ - facing! * 0.028], [0.445, 0.075, 0.045])
    box(dining, m.timber, [tableX, 1.015, rearZ - facing! * 0.017], [0.445, 0.055, 0.04])
    for (const x of [tableX - 0.12, tableX, tableX + 0.12]) {
      beam(dining, m.timberLight, [x, 1.025, rearZ - facing! * 0.017], [x, 1.395, rearZ - facing! * 0.028], 0.035, 0.025)
    }
  }

  // Merge static geometry by material and semantic group. No hundreds of per-tile draws.
  for (const b of buckets) for (const [mat, geometries] of b.geometry) {
    const merged = mergeGeometries(geometries, false)
    if (!merged) throw new Error(`Could not merge house geometry: ${b.group.name}`)
    for (const g of geometries) g.dispose()
    merged.computeBoundingSphere()
    const mesh = new THREE.Mesh(merged, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.safetyPoint = Array.from(features.entries()).find(([, group]) => group === b.group)?.[0]
    b.group.add(mesh)
  }

  // Fine gold wire outlines are actual edge geometry, enabled only on the chosen detail.
  const highlightMaterial = new THREE.LineBasicMaterial({ color: '#d6a456', transparent: true, opacity: 0.7, depthTest: true })
  const outlines = new Map<number, THREE.Group>()
  for (const [id, group] of features) {
    const edgeGroup = new THREE.Group()
    edgeGroup.name = `Selected safety point ${id}`
    edgeGroup.visible = false
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const edges = new THREE.EdgesGeometry(obj.geometry, 35)
        const lines = new THREE.LineSegments(edges, highlightMaterial)
        edgeGroup.add(lines)
      }
    })
    root.add(edgeGroup)
    outlines.set(id, edgeGroup)
  }
  let cutaway = true, extensionVisible = false, highlightedId: number | null = null
  const refreshVisibility = () => {
    removable.forEach(group => { group.visible = !cutaway })
    cutawayOnly.forEach(group => { group.visible = cutaway })
    extensionRoot.visible = extensionVisible
    rightGarden.group.visible = !extensionVisible
    connectionDoor.group.visible = extensionVisible
    connectionInfill.group.visible = !extensionVisible
    mainRightClosed.group.visible = !cutaway && !extensionVisible
    mainRightWithDoor.group.visible = !cutaway && extensionVisible
    connectors.group.visible = cutaway
    for (const [id, group] of outlines) group.visible = id === highlightedId && (id <= 7 || extensionVisible) && (id !== 7 || cutaway)
  }
  const setCutaway = (enabled: boolean) => { cutaway = enabled; refreshVisibility() }
  root.userData.fastenerContacts = fastenerContacts
  root.userData.maxFastenerGap = Math.max(...fastenerContacts.map(contact => contact.gap))
  root.userData.wallFloorContacts = wallFloorContacts
  root.userData.minWallFloorOverlap = Math.min(...wallFloorContacts.map(contact => contact.overlap))
  root.userData.shrubBounds = shrubBounds
  setCutaway(true)
  return {
    root,
    setCutaway,
    setExtensionVisible(enabled) { extensionVisible = enabled; refreshVisibility() },
    highlight(id) { highlightedId = id; refreshVisibility() },
    dispose() {
      root.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) obj.geometry.dispose() })
      materials.forEach(mat => mat.dispose())
      textures.forEach(texture => texture.dispose())
      highlightMaterial.dispose()
      root.clear()
    },
  }
}
