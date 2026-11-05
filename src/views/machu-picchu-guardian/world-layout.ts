import type { SitePoint, Vec3 } from './types'
import type { LandmarkSpec } from './world-landmarks'

// Metric teaching reconstruction organized from the official 2024 plan and
// historical photographs. Axes follow the ridge, not surveyed geographic north.
export type Point2 = readonly [number, number]
export const WORLD_BOUNDS = { minX: -125, maxX: 120, minZ: -265, maxZ: 305 }
export const MAP_BOUNDS = WORLD_BOUNDS
export const WORLD_SPAWN: Vec3 = [-88, 70, 218.8]
export const WORLD_SPAWN_LOOK_AT: Vec3 = [0, 44, -95]
export const RIDGE_OUTLINE: Point2[] = [[-108, 70], [-110, -40], [-102, -150], [-72, -230], [-28, -253], [25, -252], [78, -225], [102, -105], [108, 55], [99, 165], [82, 285], [-95, 290], [-112, 225]]
export const PLAZA_AREAS: Point2[][] = [
  [[-19, 40], [18, 40], [20, 13], [13, 8], [-17, 8]],
  [[-17, 0], [13, 0], [20, -15], [18, -42], [-18, -42], [-21, -18]],
  [[-18, -50], [18, -50], [21, -78], [17, -103], [-17, -103], [-21, -80]],
  [[-17, -111], [17, -111], [20, -132], [16, -155], [-16, -155], [-20, -132]],
  [[-16, -163], [16, -163], [18, -181], [14, -195], [-15, -195], [-18, -182]],
  [[-15, -203], [14, -203], [20, -218], [17, -225], [-19, -225], [-21, -218]],
]
export const PLAZA_HEIGHTS = [24, 22, 24, 27, 30, 32]
export function contourZ(band: number, x: number): number { return 65 + band * 10.2 + .0022 * (x + 12) ** 2 + x * .04 + 1.8 * Math.sin(x * .025 + band * .13) }
export const TERRACE_AREAS = Array.from({ length: 18 }, (_, band) => {
  const left = -98 + band * .55, right = 93 - band * .70, points: Point2[] = []
  for (let i = 0; i <= 30; i++) { const x = left + (right - left) * i / 30; points.push([x, contourZ(band, x)]) }
  for (let i = 30; i >= 0; i--) { const x = left + (right - left) * i / 30; points.push([x, contourZ(band + 1, x)]) }
  return { points, left, right, band, y: 26 + band * 2.15 }
})
export const URBAN_PLATFORMS: { id: string; y: number; points: Point2[] }[] = [
  { id: 'western-royal-south', y: 36, points: [[-88, 65], [-24, 65], [-24, -24], [-91, -24], [-99, 24]] },
  { id: 'western-sacred', y: 43, points: [[-108, -24], [-24, -24], [-24, -110], [-110, -110]] },
  { id: 'western-upper-north', y: 49, points: [[-110, -110], [-24, -110], [-24, -224], [-90, -224], [-108, -190]] },
  { id: 'western-quarry-return', y: 43, points: [[-108, -14], [-76, -14], [-76, -46], [-106, -46]] },
  { id: 'western-lower-outer', y: 32, points: [[-110, 60], [-99, 60], [-99, -14], [-108, -14], [-114, 27]] },
  { id: 'eastern-lower-south', y: 14, points: [[24, 65], [103, 65], [106, 25], [94, -20], [24, -20]] },
  { id: 'eastern-central', y: 18, points: [[24, -20], [83, -20], [86, -100], [24, -100]] },
  { id: 'eastern-residential-north', y: 22, points: [[24, -100], [101, -100], [98, -175], [23, -175]] },
  { id: 'eastern-northern-halls', y: 26, points: [[23, -175], [98, -175], [87, -239], [19, -239]] },
  { id: 'eastern-qolqa-outer', y: 8, points: [[83, -20], [106, -20], [105, -87], [86, -100]] },
  { id: 'sacred-north-neck', y: 32, points: [[-24, -225], [24, -225], [30, -240], [20, -253], [-21, -253], [-29, -240]] },
  { id: 'southern-entry-and-water', y: 24, points: [[-22, 40], [22, 40], [22, 67], [-22, 67]] },
  { id: 'western-entry-return', y: 36, points: [[-54, 63], [-46, 63], [-46, 74.1], [-54, 74.1]] },
  { id: 'guardhouse-slope-upper', y: 66, points: [[-110, 210], [-75, 213], [-70, 253], [-101, 255], [-113, 239]] },
  { id: 'guardhouse-slope-middle', y: 62, points: [[-112, 205], [-73, 208], [-68, 253], [-102, 255], [-115, 239]] },
  { id: 'guardhouse-slope-lower', y: 58, points: [[-114, 200], [-71, 203], [-66, 253], [-103, 255], [-117, 239]] },
  { id: 'guardhouse-overlook', y: 70, points: [[-108, 215], [-77, 218], [-72, 253], [-100, 255], [-111, 239]] },
]
export const LANDMARK_SPECS: LandmarkSpec[] = [
  { kind: 'sun-temple', x: -58, z: 24, y: 36, width: 27, depth: 30, height: 8 },
  { kind: 'royal-residence', x: -58, z: -10, y: 36, width: 34, depth: 30, height: 6 },
  { kind: 'sacred-plaza', x: -59, z: -72, y: 43, width: 54, depth: 52, height: 8 },
  { kind: 'intihuatana', x: -62, z: -153, y: 49, width: 49, depth: 62, height: 16 },
  { kind: 'sacred-rock', x: 0, z: -230, y: 32, width: 48, depth: 24, height: 7 },
  { kind: 'three-portals', x: 52, z: -127, y: 22, width: 45, depth: 39, height: 6 },
  { kind: 'twelve-openings', x: 50, z: -207, y: 26, width: 61, depth: 22, height: 6 },
  { kind: 'qolqa', x: 94, z: -53, y: 8, width: 18, depth: 62, height: 8 },
  { kind: 'water-mirrors', x: 58, z: -62, y: 18, width: 29, depth: 30, height: 5 },
  { kind: 'condor', x: 51, z: -20, y: 18, width: 34, depth: 29, height: 9 },
  { kind: 'fountains', x: -28, z: 30, y: 24, width: 12, depth: 64, height: 12 },
  { kind: 'main-gate', x: -39, z: 62, y: 36, width: 18, depth: 14, height: 7 },
  { kind: 'quarry', x: -91, z: -30, y: 43, width: 26, depth: 28, height: 9 },
  { kind: 'guardhouse', x: -92, z: 239, y: 70, width: 17, depth: 14, height: 6 },
]
export type StairLink = { id: string; a: Point2; b: Point2; fromY: number; toY: number; width: number }
export const STAIR_LINKS: StairLink[] = [
  { id: 'plaza-south', a: [0, 8], b: [0, 0], fromY: 24, toY: 22, width: 6 },
  { id: 'plaza-main', a: [0, -42], b: [0, -50], fromY: 22, toY: 24, width: 6 },
  { id: 'plaza-upper', a: [0, -103], b: [0, -111], fromY: 24, toY: 27, width: 6 },
  { id: 'plaza-northern', a: [0, -155], b: [0, -163], fromY: 27, toY: 30, width: 6 },
  { id: 'plaza-sacred', a: [0, -195], b: [0, -203], fromY: 30, toY: 32, width: 6 },
  { id: 'east-entry', a: [45, 48], b: [22, 48], fromY: 14, toY: 24, width: 4.2 },
  { id: 'west-entry', a: [-50, 72], b: [-18, 72], fromY: 36, toY: 26, width: 4.2 },
  { id: 'west-south-to-sacred', a: [-36, -8], b: [-36, -24], fromY: 36, toY: 43, width: 4.2 },
  { id: 'west-sacred-lower', a: [-18, -72], b: [-25.9, -72], fromY: 24, toY: 30, width: 4.2 },
  { id: 'west-sacred-upper', a: [-28, -69.9], b: [-28, -48], fromY: 30, toY: 43, width: 4.2 },
  { id: 'west-upper-street', a: [-28, -95], b: [-28, -110], fromY: 43, toY: 49, width: 4.2 },
  { id: 'west-north-lower', a: [-17, -137], b: [-25.9, -137], fromY: 27, toY: 33, width: 4.2 },
  { id: 'west-north-upper', a: [-28, -139.1], b: [-28, -168], fromY: 33, toY: 49, width: 4.2 },
  { id: 'east-central-south', a: [18, -34], b: [40, -34], fromY: 22, toY: 18, width: 4.2 },
  { id: 'east-central-north', a: [20, -80], b: [40, -80], fromY: 24, toY: 18, width: 4.2 },
  { id: 'east-residential', a: [16, -151], b: [40, -151], fromY: 27, toY: 22, width: 4.2 },
  { id: 'east-northern', a: [17, -185], b: [40, -185], fromY: 30, toY: 26, width: 4.2 },
  { id: 'east-neighbourhood-one', a: [78, -5], b: [78, -20], fromY: 14, toY: 18, width: 4 },
  { id: 'east-neighbourhood-two', a: [80, -85], b: [80, -100], fromY: 18, toY: 22, width: 4 },
  { id: 'east-neighbourhood-three', a: [79, -161], b: [79, -175], fromY: 22, toY: 26, width: 4 },
  { id: 'warehouse-access', a: [81, -94], b: [98, -94], fromY: 18, toY: 8, width: 4 },
  { id: 'guardhouse-descent', a: [-78, 244], b: [-60, contourZ(18, -60) - .75], fromY: 70, toY: 62.55, width: 4.2 },
]
export const DRAIN_DEMO = { x: -18, z0: 50.9, length: 6.3, bankY: 24, blockZ: 55.25,
  bridges: [{ z: 51.3, halfLength: .44, halfWidth: .52 }, { z: 53.9, halfLength: .7, halfWidth: .52 }, { z: 56.8, halfLength: .44, halfWidth: .52 }] }
export const drainBed = (z: number): number => 23.75 - (z - DRAIN_DEMO.z0) / DRAIN_DEMO.length * .14
const terraceVisitZ = contourZ(7.5, 8)
export const WORLD_SITES: SitePoint[] = [
  { id: 'viewpoint', title: '守卫屋与山脊全景', position: [-88, 71.1, 218.8], arrival: [...WORLD_SPAWN], lookAt: [...WORLD_SPAWN_LOOK_AT] },
  { id: 'archives', title: '神圣广场与历史档案', position: [-37, 44.5, -41], arrival: [-34, 43, -40], lookAt: [-59, 47, -72] },
  { id: 'terrace', title: '农业梯田与山坡', position: [8, 42.2, terraceVisitZ], arrival: [8, 41.05, terraceVisitZ], lookAt: [45, 30, 95] },
  { id: 'drain', title: '排水与泉池系统', position: [-18, 25.2, 54], arrival: [-15.5, 24, 54.5], lookAt: [-18, 23.9, 54] },
  { id: 'plaza', title: '分级广场与古城游线', position: [0, 25.4, -75], arrival: [0, 24, -75], lookAt: [-54, 47, -75] },
  { id: 'station', title: '古城守护站', position: [60, 15.4, 48], arrival: [59, 14, 48], lookAt: [68, 17, 45] },
]
export const SITE_LOCATIONS = WORLD_SITES.map(site => ({ id: site.id, x: site.position[0], z: site.position[2] }))
const mainPath: Point2[] = [[-88, 218.8], [-79, 223], [-78, 244], ...[-60, -45, -30, -15, 0].map(x => [x, contourZ(18, x) - .75] as Point2), [0, 65], [0, 48], [0, 8], [0, 0], [0, -42], [0, -50], [0, -103], [0, -111], [0, -155], [0, -163], [0, -195], [0, -203], [0, -221]]
const westPath: Point2[] = [[0, -72], [-18, -72], [-25.9, -72], [-28, -72], [-28, -69.9], [-28, -48], [-28, -40], [-34, -40], [-36, -24], [-36, -8], [-36, 39], [-50, 43], [-50, 72], [-18, 72], ...[-18, -9, 0].map(x => [x, contourZ(1, x) - .75] as Point2), [0, 65], [0, 48]]
const eastPath: Point2[] = [[0, 48], [22, 48], [45, 48], [59, 48]]
export const PATHS: Point2[][] = [mainPath, westPath, eastPath, [[0, -80], [20, -80], [40, -80], [80, -85], [80, -100]], [[0, -151], [16, -151], [40, -151], [79, -161], [79, -175], [40, -185], [17, -185], [0, -185]]]
export const WORLD_ROUTES = {
  original: [[59, 48], [45, 48], [22, 48], [0, 48], [0, 8], [0, 0], [0, -42], [0, -50], [0, -72], ...westPath.slice(1), [22, 48], [45, 48], [59, 48]] as Point2[],
  guided: [
    [[59, 48], [45, 48], [22, 48], [0, 48], [0, 8], [0, 0], [0, -42], [0, -50], [0, -103], [0, -111], [0, -155], [0, -163], [0, -185], [2, -185], [2, -163], [2, -155], [2, -111], [2, -103], [2, -50], [2, -42], [2, 0], [2, 8], [2, 48], [22, 48], [45, 48], [59, 48]],
    [[59, 48], [45, 48], [22, 48], [0, 48], [0, 8], [0, 0], [0, -42], [0, -50], [0, -72], ...westPath.slice(1), [22, 48], [45, 48], [59, 48]],
    [[59, 48], [45, 48], [22, 48], [0, 48], [0, 65], [0, contourZ(8, 0) - .70], [8, contourZ(8, 0) - .70], [8, terraceVisitZ], [8, contourZ(8, 0) - .70], [0, contourZ(8, 0) - .70], [0, 65], [0, 48], [22, 48], [45, 48], [59, 48]],
  ] as Point2[][],
}
export type RoomSpec = { x: number; z: number; y: number; width: number; depth: number; angle: number; height: number; style: 'gable' | 'ruin' | 'court' | 'hut'; seed: number }
export const ROOM_LAYOUT: RoomSpec[] = []

// Ordinary construction is composed by neighbourhood and courtyard, with
// infill fitting the remaining irregular plots. No four-room template is tiled
// over the ridge. Landmark courts and movement corridors are reserved first.
function hash(a: number, b: number): number { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }
function polygonContains(x: number, z: number, polygon: readonly Point2[]): boolean {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i]!, b = polygon[j]!; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result }
  return result
}
type PlotBox = { minX: number; maxX: number; minZ: number; maxZ: number }
const occupied: PlotBox[] = [], openCourts: PlotBox[] = []
function roomBox(x: number, z: number, width: number, depth: number, angle: number, margin = .25): PlotBox {
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle)), hx = width * c / 2 + depth * s / 2 + margin, hz = depth * c / 2 + width * s / 2 + margin
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz }
}
const overlaps = (a: PlotBox, b: PlotBox, margin = 0): boolean => a.minX < b.maxX + margin && a.maxX > b.minX - margin && a.minZ < b.maxZ + margin && a.maxZ > b.minZ - margin
const reservedLandmarks = LANDMARK_SPECS.map(spec => roomBox(spec.x, spec.z, spec.width, spec.depth, spec.angle ?? 0, 2.0))
function crossesBox(a: Point2, b: Point2, box: PlotBox, margin: number): boolean {
  let lo = 0, hi = 1
  for (const [start, delta, min, max] of [[a[0], b[0] - a[0], box.minX - margin, box.maxX + margin], [a[1], b[1] - a[1], box.minZ - margin, box.maxZ + margin]]) {
    if (Math.abs(delta!) < 1e-9) { if (start! < min! || start! > max!) return false; continue }
    let t0 = (min! - start!) / delta!, t1 = (max! - start!) / delta!
    if (t0 > t1) [t0, t1] = [t1, t0]
    lo = Math.max(lo, t0); hi = Math.min(hi, t1); if (lo > hi) return false
  }
  return true
}
const reservedLines: { a: Point2; b: Point2; margin: number }[] = []
for (const path of [...PATHS, WORLD_ROUTES.original, ...WORLD_ROUTES.guided]) for (let i = 1; i < path.length; i++) reservedLines.push({ a: path[i - 1]!, b: path[i]!, margin: 2.0 })
for (const link of STAIR_LINKS) reservedLines.push({ a: link.a, b: link.b, margin: link.width / 2 + .6 })
const districts = URBAN_PLATFORMS.filter(p => !p.id.includes('quarry') && !p.id.includes('neck') && !p.id.includes('guard') && !p.id.includes('entry') && !p.id.includes('qolqa'))
function addRoom(x: number, z: number, width: number, depth: number, angle: number, seed: number, preferred?: RoomSpec['style']): boolean {
  const plot = districts.find(p => polygonContains(x, z, p.points))
  if (!plot) return false
  const box = roomBox(x, z, width, depth, angle)
  if (![[box.minX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.minZ], [box.maxX, box.maxZ]].every(([px, pz]) => polygonContains(px!, pz!, plot.points))) return false
  if (reservedLandmarks.some(r => overlaps(box, r)) || occupied.some(r => overlaps(box, r, .6)) || openCourts.some(r => overlaps(box, r))) return false
  if (reservedLines.some(line => crossesBox(line.a, line.b, box, line.margin))) return false
  if (WORLD_SITES.some(site => overlaps(box, { minX: site.arrival[0] - 1.8, maxX: site.arrival[0] + 1.8, minZ: site.arrival[2] - 1.8, maxZ: site.arrival[2] + 1.8 }))) return false
  const choice = hash(seed, 8), style: RoomSpec['style'] = preferred ?? (choice < .30 ? 'ruin' : choice < .69 ? 'court' : 'gable')
  const height = style === 'ruin' ? 1.15 + hash(seed, 9) * 1.45 : 2.9 + hash(seed, 10) * 1.15
  ROOM_LAYOUT.push({ x, z, y: plot.y, width, depth, angle, height, style, seed }); occupied.push(box); return true
}
addRoom(68, 45, 10, 12, -Math.PI / 2, 1001, 'court')
const compounds: readonly (readonly [number, number, number])[] = [
  [-77, 50, .05], [-52, 48, -.09], [-85, 4, .04], [-38, 8, -.04], [-88, -105, .10], [-45, -112, -.07], [-84, -197, .08], [-54, -209, -.11], [-36, -195, .03], [-35, -123, -.05],
  [42, 31, -.04], [70, 27, .08], [39, 2, .06], [74, -7, -.06], [36, -58, -.07], [36, -89, .09], [71, -91, -.035], [79, -125, .02], [41, -166, -.08], [68, -164, .07], [35, -185, -.04], [74, -186, .08], [49, -232, -.09],
]
compounds.forEach(([cx, cz, angle], index) => {
  let placed = 0
  const template = index % 3 === 0
    ? [[-10, 0, 8, 12, Math.PI / 2], [11, -1, 9, 10, -Math.PI / 2], [-3, -12, 12, 8, 0], [7, 12, 8, 10, Math.PI], [-6, 12, 9, 8, Math.PI]]
    : index % 3 === 1
      ? [[-10, -3, 13, 8, Math.PI / 2], [10, 3, 9, 11, -Math.PI / 2], [-3, -13, 15, 8, 0], [1, 12, 11, 9, Math.PI]]
      : [[-11, -2, 8, 11, Math.PI / 2], [10, 0, 10, 10, -Math.PI / 2], [-5, -12, 8, 9, 0], [5, -12, 8, 9, 0], [0, 13, 14, 9, Math.PI]]
  for (let i = 0; i < template.length; i++) { const v = template[i]!, c = Math.cos(angle), s = Math.sin(angle); if (addRoom(cx + v[0]! * c + v[1]! * s, cz - v[0]! * s + v[1]! * c, v[2]!, v[3]!, v[4]! + angle, index * 11 + i + 1200)) placed++ }
  if (placed >= 3) openCourts.push({ minX: cx - 4, maxX: cx + 4, minZ: cz - 5, maxZ: cz + 5 })
})
function radicalInverse(value: number, base: number): number { let result = 0, factor = 1 / base; while (value > 0) { result += value % base * factor; value = Math.floor(value / base); factor /= base }; return result }
// Infill follows the remaining irregular district footprints. The low-discrepancy
// sequence has no visible global rows, while a limited set of wall directions
// preserves the archaeological courts' coherent orientation.
for (let attempt = 1; attempt <= 32000 && ROOM_LAYOUT.length < 164; attempt++) {
  const district = districts[attempt % districts.length]!, xs = district.points.map(p => p[0]), zs = district.points.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs), n = Math.floor(attempt / districts.length) + 127 * (attempt % districts.length) + 1
  const x = minX + radicalInverse(n, 2) * (maxX - minX), z = minZ + radicalInverse(n, 3) * (maxZ - minZ)
  const width = 7.0 + hash(attempt, 21) * 2.4, depth = 7.2 + hash(attempt, 22) * 3.0, angle = (attempt % 3 === 0 ? Math.PI / 2 : 0) + (hash(attempt, 23) - .5) * .20
  addRoom(x, z, width, depth, angle, attempt + 5000)
}
// Small service rooms occupy the remaining narrow plots; they use the same
// seven-metre minimum and never consume a reserved court, landmark or route.
for (const district of districts) {
  const xs = district.points.map(p => p[0]), zs = district.points.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs)
  for (let z = minZ + 4; z < maxZ - 4 && ROOM_LAYOUT.length < 164; z += .8) for (let x = minX + 4; x < maxX - 4 && ROOM_LAYOUT.length < 164; x += .8) addRoom(x, z, 7, 7, 0, 40000 + Math.round((x + 150) * 100 + z + 300))
}

// At the shelf edges these four doors face the inner lane, retaining the same
// footprint and preserving a full adult standing area outside the threshold.
for (const room of ROOM_LAYOUT) if ([6640, 6986, 7790, 8165].includes(room.seed)) room.angle += Math.PI
