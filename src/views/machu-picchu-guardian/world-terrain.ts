import * as THREE from 'three'
import { inside, noise, type FloorRegion, WorldGeometry } from './world-geometry'
import { contourZ, DRAIN_DEMO, WORLD_SPAWN, type Point2 } from './world-layout'

const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp, smooth = THREE.MathUtils.smoothstep
type Section = readonly [z: number, height: number, width: number, axis: number]
const NORTH: readonly Section[] = [
  [-690, -45, 220, -8], [-610, 70, 210, -8], [-520, 230, 188, 2],
  [-455, 285, 165, 5], [-430, 313, 152, 12], [-410, 315, 143, 8],
  [-387, 292, 150, 22], [-360, 236, 169, 25], [-335, 155, 178, 29],
  [-310, 65, 162, 22], [-275, 23, 112, 10], [-250, 28, 96, 0],
]
function section(z: number, channel: 1 | 2 | 3): number {
  if (z <= NORTH[0]![0]) return NORTH[0]![channel]
  if (z >= NORTH[NORTH.length - 1]![0]) return NORTH[NORTH.length - 1]![channel]
  for (let i = 1; i < NORTH.length; i++) {
    const a = NORTH[i - 1]!, b = NORTH[i]!
    if (z > b[0]) continue
    const prev = NORTH[Math.max(0, i - 2)]!, next = NORTH[Math.min(NORTH.length - 1, i + 1)]!
    const span = b[0] - a[0], t = (z - a[0]) / span, t2 = t * t, t3 = t2 * t
    const ma = (b[channel] - prev[channel]) / (b[0] - prev[0]), mb = (next[channel] - a[channel]) / (next[0] - a[0])
    return (2 * t3 - 3 * t2 + 1) * a[channel] + (t3 - 2 * t2 + t) * span * ma + (-2 * t3 + 3 * t2) * b[channel] + (t3 - t2) * span * mb
  }
  return 0
}
function join(a: number, b: number, width: number): number {
  const h = Math.max(0, width - Math.abs(a - b)) / width
  return Math.max(a, b) + h * h * width * .25
}

/** Teaching coordinates in metres, not a surveyed river alignment. */
export const RIVER_LEVEL = -391
export const RIVER_FROM_Z = -120
export const RIVER_TO_Z = 560
export const RIVER_HALF_WIDTH = 17.2
export function riverCentreX(z: number): number { return 600 + Math.sin((z + 80) * .0032) * 31 + Math.sin(z * .008) * 7 }

/** A southern ridge approach, separate from the archaeological city footprint. */
export const ACCESS_ROUTE_POINT2: readonly Point2[] = [
  [126, 620], [107, 580], [132, 542], [111, 506], [134, 464], [112, 424],
  [106, 387], [105, 353], [96, 323], [86, 302], [69, 281], [40, 265],
  [16, 255], [0, contourZ(18, 0) - .15],
]

/** Metric ridge: west upper town, lower east town, deep lateral valleys and a
 * connected northern massif. All heights share the archaeological floor datum. */
export function naturalHeight(x: number, z: number): number {
  const northward = smooth(-z, 10, 230), agriculture = smooth(z, 60, 255)
  const centre = 22 + northward * 10 + agriculture * 42
  const west = 36 + northward * 13 + agriculture * 29
  const east = 14 + northward * 12 + agriculture * 49
  const top = x < 0 ? lerp(centre, west, smooth(-x, 8, 64)) : lerp(centre, east, smooth(x, 8, 65))
  const southward = smooth(z, 285, 650)
  const ridgeAxis = 3 + Math.sin(z * .009) * 6 + southward * 60
  const core = 95 + agriculture * 8 - smooth(-z, 180, 275) * 35 + southward * 27
  const outside = Math.max(0, Math.abs(x - ridgeAxis) - core)
  // A broad forested slope, not an extruded city-sized pillar. The first
  // shoulders are roughly 35–50 degrees; the valley lies 400+ m farther out.
  const sidefall = outside * .72 + 45 * (outside / (outside + 75)) ** 2 + outside * .18 * smooth(outside, 40, 220)
  let spine = top - sidefall - southward * 35
  spine -= Math.max(0, z - 650) * .72
  spine -= Math.pow(Math.max(0, -260 - z), 1.14) * .72
  const guard = WORLD_SPAWN[1] - .5 - .006 * (x - WORLD_SPAWN[0]) ** 2 - .003 * (z - 235) ** 2
  const guardWeight = (1 - smooth(Math.abs(x - WORLD_SPAWN[0]), 50, 95)) * (1 - smooth(Math.abs(z - 235), 55, 110))
  spine = lerp(spine, join(spine, guard, 5), guardWeight)

  const crest = section(z, 1), width = section(z, 2), axis = section(z, 3)
  const shiftedAxis = axis + Math.sin((z + 400) * .018) * 7
  const dx = Math.max(0, Math.abs(x - shiftedAxis) - 18)
  // A tilted short summit and unequal flanks, with a long eastern rock shoulder.
  // This is one connected massif rather than a radial cone or separate spires.
  let massif = crest - (crest + 38) * Math.pow(dx / (width * (x < axis ? .85 : 1.25)), x < axis ? 1.13 : 1.56) - (x - axis) * .18
  const shoulderAxis = -420 + x * .30 + Math.sin(x * .019) * 8
  const eastShoulder = 235 - Math.max(0, x - 70) * .50 - Math.abs(z - shoulderAxis) ** 1.50 * .27 - Math.max(0, 70 - x) ** 1.4 * .5 - Math.max(0, x - 240) ** 1.4 * .5
  const westKnuckle = 134 - Math.abs(x + 129) ** 1.35 * .31 - Math.abs(z + 348) ** 1.5 * .20
  massif = join(massif, eastShoulder, 15); massif = join(massif, westKnuckle, 12)
  let channels = 0
  for (let i = 0; i < 8; i++) {
    const cx = -111 + i * 34 + Math.sin(z * .013 + i * .73) * 8 + (z + 420) * .085
    const d = (x - cx) / (9 + i % 3 * 2.8)
    channels += Math.exp(-d * d) * (15 + i % 3 * 5.5)
  }
  massif -= channels * smooth(massif, 40, 145) * (1 - smooth(massif, 285, 321))
  massif += (noise(x * .025, z * .012) - .5) * 8 + (noise(x * .081, z * .051) - .5) * 5
  const northernGate = smooth(-z, 255, 293) * (1 - smooth(-z, 660, 790))
  let y = lerp(spine, join(spine, massif, 11), northernGate)

  // Opposite slopes begin beyond broad deep valleys, with broken forested crests.
  const ranges = [
    [-1230, -760, 310, 390, 470, -.16], [-1110, -40, 230, 350, 390, .22], [-1400, 650, 320, 450, 500, -.18],
    [1220, -800, 295, 380, 450, .20], [1190, -80, 245, 360, 400, -.20], [1450, 690, 330, 450, 510, .15],
    [-500, -1370, 310, 470, 310, -.28], [290, -1470, 380, 460, 360, .30],
  ] as const
  for (const [cx, cz, peak, crossWidth, alongWidth, bend] of ranges) {
    const along = z - cz, cross = x - cx + along * bend + Math.sin(along * .005) * 35
    let range = peak - (Math.abs(cross) / crossWidth) ** 1.42 * 410 - (Math.abs(along) / alongWidth) ** 1.64 * 360
    const radius = Math.hypot(cross, along), angle = Math.atan2(along, cross)
    // Broad branching gullies make the opposite valley sides turn in space.
    range -= (Math.sin(angle * 7 + .8) * .5 + .5) * 38 * smooth(radius, 90, 300)
    range += (noise(x * .006, z * .006) - .5) * 30
    y = join(y, range, 30)
  }
  const wild = smooth(Math.abs(x), 125, 300)
  y += (noise(x * .007, z * .005) - .5) * (3 + wild * 17) + (noise(x * .033, z * .021) - .5) * (1 + wild * 4)
  y = Math.max(-425 + noise(x * .004, z * .004) * 9, y)
  const riverDistance = Math.abs(x - riverCentreX(z))
  const riverGate = (1 - smooth(riverDistance, 42, 85)) * smooth(z, -260, -120) * (1 - smooth(z, 560, 720))
  const riverBed = -398 + Math.min(27, (riverDistance / 25) ** 2 * 14)
  y = lerp(y, riverBed, riverGate)
  const edge = Math.max(Math.abs(x) / 2048, Math.abs(z + 256) / 1792)
  return lerp(y, -540, smooth(edge, .86, 1))
}

function edgeDistance(x: number, z: number, region: FloorRegion): number {
  if (inside(x, z, region.points)) return 0
  let square = Infinity
  for (let i = 0, j = region.points.length - 1; i < region.points.length; j = i++) {
    const a = region.points[j]!, b = region.points[i]!, dx = b[0] - a[0], dz = b[1] - a[1]
    const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / Math.max(.000001, dx * dx + dz * dz), 0, 1)
    square = Math.min(square, (x - a[0] - dx * t) ** 2 + (z - a[1] - dz * t) ** 2)
  }
  return Math.sqrt(square)
}
type Cell = { x: number; z: number; size: number }

export function addTerrain(builder: WorldGeometry, material: THREE.Material, soil: THREE.Material): (x: number, z: number) => number {
  const regions = builder.floors, bucketSize = 32, apron = 38, buckets = new Map<string, FloorRegion[]>()
  const bucketKey = (x: number, z: number) => `${Math.floor(x / bucketSize)},${Math.floor(z / bucketSize)}`
  for (const r of regions) for (let ix = Math.floor((r.bounds.min.x - apron) / bucketSize); ix <= Math.floor((r.bounds.max.x + apron) / bucketSize); ix++) {
    for (let iz = Math.floor((r.bounds.min.y - apron) / bucketSize); iz <= Math.floor((r.bounds.max.y + apron) / bucketSize); iz++) {
      const key = `${ix},${iz}`, list = buckets.get(key) ?? []; list.push(r); buckets.set(key, list)
    }
  }
  function floorAt(x: number, z: number): number | null {
    let top = -Infinity, stair = Infinity
    for (const r of buckets.get(bucketKey(x, z)) ?? []) {
      if (x < r.bounds.min.x || x > r.bounds.max.x || z < r.bounds.min.y || z > r.bounds.max.y || !inside(x, z, r.points)) continue
      if (r.stair) stair = Math.min(stair, r.y)
      else top = Math.max(top, r.y)
    }
    return Number.isFinite(stair) ? stair : Number.isFinite(top) ? top : null
  }
  function height(x: number, z: number): number {
    const exact = floorAt(x, z)
    const drain = DRAIN_DEMO
    const inDrain = x > drain.x - .56 && x < drain.x + .56 && z > drain.z0 - .2 && z < drain.z0 + drain.length + .2
    if (exact !== null) return inDrain ? Math.min(exact - .35, drain.bankY - .7) : exact - .35
    let y = naturalHeight(x, z), nearTop = -Infinity, stairCap = Infinity
    for (const r of buckets.get(bucketKey(x, z)) ?? []) {
      if (x < r.bounds.min.x - apron || x > r.bounds.max.x + apron || z < r.bounds.min.y - apron || z > r.bounds.max.y + apron) continue
      const d = edgeDistance(x, z, r)
      if (d > apron) continue
      const support = r.y - .35 - .68 * d - .012 * d * d
      y = Math.max(y, lerp(y, support, 1 - smooth(d, 30, apron)))
      if (d < .8) {
        if (r.stair) stairCap = Math.min(stairCap, r.y - .35)
        else nearTop = Math.max(nearTop, r.y - .35)
      }
    }
    if (Number.isFinite(nearTop)) y = nearTop
    if (Number.isFinite(stairCap)) y = Math.min(y, stairCap)
    if (inDrain) y = Math.min(y, drain.bankY - .7)
    return y
  }

  function overlaps(r: FloorRegion, x: number, z: number, size: number): boolean {
    return r.bounds.max.x >= x && r.bounds.min.x <= x + size && r.bounds.max.y >= z && r.bounds.min.y <= z + size
  }
  function boundaryInCell(r: FloorRegion, x: number, z: number, size: number): boolean {
    const x1 = x + size, z1 = z + size
    for (let i = 0, j = r.points.length - 1; i < r.points.length; j = i++) {
      const a = r.points[j]!, b = r.points[i]!
      if (Math.max(a[0], b[0]) < x || Math.min(a[0], b[0]) > x1 || Math.max(a[1], b[1]) < z || Math.min(a[1], b[1]) > z1) continue
      // Liang–Barsky segment/box clipping; unlike a bounding box alone this does
      // not refine every empty corner beside an irregular large platform.
      let lo = 0, hi = 1
      const dx = b[0] - a[0], dz = b[1] - a[1]
      const ps = [-dx, dx, -dz, dz], qs = [a[0] - x, x1 - a[0], a[1] - z, z1 - a[1]]
      let hit = true
      for (let k = 0; k < 4; k++) {
        const p = ps[k]!, q = qs[k]!
        if (Math.abs(p) < 1e-9) { if (q < 0) { hit = false; break } }
        else if (p < 0) lo = Math.max(lo, q / p)
        else hi = Math.min(hi, q / p)
      }
      if (hit && lo <= hi) return true
    }
    return false
  }
  const leaves: Cell[] = []
  function subdivide(x: number, z: number, size: number, candidates: FloorRegion[]): void {
    const hits = candidates.filter(r => overlaps(r, x, z, size))
    const nearCity = x < 150 && x + size > -150 && z < 330 && z + size > -280
    const nearPeak = x < 265 && x + size > -250 && z < -270 && z + size > -720
    const nearRidge = x < 680 && x + size > -680 && z < 650 && z + size > -850
    const nearRanges = x < 1600 && x + size > -1600 && z < 1000 && z + size > -1600
    const nearRiver = z < 740 && z + size > -270 && x < riverCentreX(z + size / 2) + 65 && x + size > riverCentreX(z + size / 2) - 65
    const target = nearCity || nearPeak || nearRiver ? 8 : nearRidge ? 32 : nearRanges ? 64 : 128
    let split = size > target
    if (!split && size > .5 && hits.length) {
      const values = [[x, z], [x + size, z], [x + size, z + size], [x, z + size], [x + size / 2, z + size / 2]].map(p => floorAt(p[0]!, p[1]!))
      const valid = values.filter((value): value is number => value !== null)
      if (valid.length && (valid.length !== values.length || Math.max(...valid) - Math.min(...valid) > .12)) split = true
      else {
        const level = valid[0]
        split = hits.some(r => (level === undefined || r.stair || r.y > level + .12) && boundaryInCell(r, x, z, size))
      }
    }
    if (split) {
      const h = size / 2
      subdivide(x, z, h, hits); subdivide(x + h, z, h, hits); subdivide(x, z + h, h, hits); subdivide(x + h, z + h, h, hits)
    } else leaves.push({ x, z, size })
  }
  for (let z = -2048; z < 1536; z += 128) for (let x = -2048; x < 2048; x += 128) {
    subdivide(x, z, 128, regions.filter(r => overlaps(r, x, z, 128)))
  }
  // Stitch all quadtree borders to their neighbours before triangulation. There
  // are no T-junction cracks between the half-metre stair edges and distant LOD.
  const horizontal = new Map<number, Set<number>>(), vertical = new Map<number, Set<number>>()
  function edgePoint(x: number, z: number): void {
    const h = horizontal.get(z) ?? new Set<number>(); h.add(x); horizontal.set(z, h)
    const v = vertical.get(x) ?? new Set<number>(); v.add(z); vertical.set(x, v)
  }
  for (const c of leaves) { edgePoint(c.x, c.z); edgePoint(c.x + c.size, c.z); edgePoint(c.x + c.size, c.z + c.size); edgePoint(c.x, c.z + c.size) }
  const hLines = new Map([...horizontal].map(([key, values]) => [key, [...values].sort((a, b) => a - b)]))
  const vLines = new Map([...vertical].map(([key, values]) => [key, [...values].sort((a, b) => a - b)]))
  function lowerBound(values: number[], value: number): number { let lo = 0, hi = values.length; while (lo < hi) { const m = (lo + hi) >>> 1; if (values[m]! < value) lo = m + 1; else hi = m } return lo }
  const positions: number[] = [], colors: number[] = [], indices: number[] = [], vertexIds = new Map<string, number>()
  function vertex(x: number, z: number): number {
    const key = `${x},${z}`, found = vertexIds.get(key)
    if (found !== undefined) return found
    const id = positions.length / 3, y = height(x, z), tone = .90 + noise(x * .025, z * .021) * .10
    positions.push(x, y, z); colors.push(tone, tone, tone); vertexIds.set(key, id); return id
  }
  for (const c of leaves) {
    const x1 = c.x + c.size, z1 = c.z + c.size, boundary: number[] = []
    const top = hLines.get(c.z)!, right = vLines.get(x1)!, bottom = hLines.get(z1)!, left = vLines.get(c.x)!
    for (let i = lowerBound(top, c.x); i < top.length && top[i]! < x1; i++) boundary.push(vertex(top[i]!, c.z))
    for (let i = lowerBound(right, c.z); i < right.length && right[i]! < z1; i++) boundary.push(vertex(x1, right[i]!))
    for (let i = lowerBound(bottom, x1 + .0001) - 1; i >= 0 && bottom[i]! > c.x; i--) boundary.push(vertex(bottom[i]!, z1))
    for (let i = lowerBound(left, z1 + .0001) - 1; i >= 0 && left[i]! > c.z; i--) boundary.push(vertex(c.x, left[i]!))
    const centre = vertex(c.x + c.size / 2, c.z + c.size / 2)
    for (let i = 0; i < boundary.length; i++) indices.push(centre, boundary[(i + 1) % boundary.length]!, boundary[i]!)
  }
  // Walkable slabs already supply the ground over each footprint. Subtract the
  // exact planar union, so intersecting levels cannot expose heightfield triangles.
  type P = readonly [number, number]
  const floorPieces = new Map<FloorRegion, { points: readonly P[]; sign: number; bounds: THREE.Box2 }[]>()
  for (const r of regions) {
    let sign = 0, convex = true, area = 0
    for (let i = 0; i < r.points.length; i++) {
      const a = r.points[i]!, b = r.points[(i + 1) % r.points.length]!, c = r.points[(i + 2) % r.points.length]!
      area += a[0] * b[1] - b[0] * a[1]
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      if (Math.abs(cross) > 1e-8) { if (sign && sign !== Math.sign(cross)) convex = false; sign = Math.sign(cross) }
    }
    if (convex) floorPieces.set(r, [{ points: r.points, sign: Math.sign(area), bounds: r.bounds }])
    else {
      const triangles = THREE.ShapeUtils.triangulateShape(r.points.map(([x, z]) => new THREE.Vector2(x, z)), [])
      floorPieces.set(r, triangles.map(ids => {
        const points = ids.map(id => r.points[id]!)
        const a = points[0]!, b = points[1]!, c = points[2]!
        return { points, sign: Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])), bounds: new THREE.Box2().setFromPoints(points.map(p => new THREE.Vector2(...p))) }
      }))
    }
  }
  function subtract(poly: P[], clip: readonly P[], sign: number): P[][] {
    const result: P[][] = []
    let remaining = poly
    for (let i = 0; i < clip.length && remaining.length >= 3; i++) {
      const a = clip[i]!, b = clip[(i + 1) % clip.length]!, inner: P[] = [], outer: P[] = []
      const cross = (p: P) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * sign
      for (let j = 0; j < remaining.length; j++) {
        const u = remaining[j]!, v = remaining[(j + 1) % remaining.length]!, du = cross(u), dv = cross(v)
        if (du >= -1e-9) inner.push(u)
        if (du <= 1e-9) outer.push(u)
        if ((du > 1e-9 && dv < -1e-9) || (du < -1e-9 && dv > 1e-9)) {
          const t = du / (du - dv), hit: P = [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]
          inner.push(hit); outer.push(hit)
        }
      }
      if (outer.length >= 3) result.push(outer)
      remaining = inner
    }
    return result
  }
  const visibleIndices: number[] = []
  function boundaryVertex(x: number, z: number): number {
    const id = vertex(x, z)
    // Float32 storage may move a clipped edge a few micrometres inside the
    // neighbouring lower floor. Embed that shared edge below both side shells.
    for (const r of buckets.get(bucketKey(x, z)) ?? []) {
      if (x < r.bounds.min.x - .0001 || x > r.bounds.max.x + .0001 || z < r.bounds.min.y - .0001 || z > r.bounds.max.y + .0001) continue
      if (edgeDistance(x, z, r) < .0001) positions[id * 3 + 1] = Math.min(positions[id * 3 + 1]!, r.y - .35)
    }
    return id
  }
  for (let k = 0; k < indices.length; k += 3) {
    const ids = [indices[k]!, indices[k + 1]!, indices[k + 2]!]
    const triangle = ids.map(id => [positions[id * 3]!, positions[id * 3 + 2]!] as P)
    const minX = Math.min(...triangle.map(p => p[0])), maxX = Math.max(...triangle.map(p => p[0]))
    const minZ = Math.min(...triangle.map(p => p[1])), maxZ = Math.max(...triangle.map(p => p[1]))
    const candidates = (buckets.get(bucketKey((minX + maxX) / 2, (minZ + maxZ) / 2)) ?? []).filter(r => r.bounds.max.x >= minX && r.bounds.min.x <= maxX && r.bounds.max.y >= minZ && r.bounds.min.y <= maxZ)
    if (!candidates.length) { visibleIndices.push(...ids); continue }
    if (candidates.some(r => floorPieces.get(r)!.length === 1 && triangle.every(p => inside(p[0], p[1], r.points)))) continue
    let pieces: P[][] = [triangle]
    for (const r of candidates) for (const clip of floorPieces.get(r)!) {
      if (!pieces.length) break
      if (clip.bounds.max.x < minX || clip.bounds.min.x > maxX || clip.bounds.max.y < minZ || clip.bounds.min.y > maxZ) continue
      pieces = pieces.flatMap(poly => subtract(poly, clip.points, clip.sign))
    }
    for (const poly of pieces) for (let i = 1; i < poly.length - 1; i++) {
      const a = poly[0]!, b = poly[i]!, c = poly[i + 1]!
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      if (Math.abs(area) > 1e-9) visibleIndices.push(boundaryVertex(...a), boundaryVertex(...b), boundaryVertex(...c))
    }
  }
  const floatPositions = new Float32Array(positions), cleanIndices: number[] = []
  for (let i = 0; i < visibleIndices.length; i += 3) {
    const a = visibleIndices[i]!, b = visibleIndices[i + 1]!, c = visibleIndices[i + 2]!
    const area = (floatPositions[b * 3]! - floatPositions[a * 3]!) * (floatPositions[c * 3 + 2]! - floatPositions[a * 3 + 2]!) - (floatPositions[b * 3 + 2]! - floatPositions[a * 3 + 2]!) * (floatPositions[c * 3]! - floatPositions[a * 3]!)
    if (area < -1e-8) cleanIndices.push(a, b, c)
    else if (area > 1e-8) cleanIndices.push(a, c, b)
  }
  // Check the stored Float32 mesh as well: a curved terrace corner can round
  // the midpoint of a clipped edge inside its lower neighbour by micrometres.
  const probes = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.5, .5, 0], [.5, 0, .5], [0, .5, .5], [1 / 3, 1 / 3, 1 / 3], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6]]
  for (let i = 0; i < cleanIndices.length; i += 3) {
    const a = cleanIndices[i]! * 3, b = cleanIndices[i + 1]! * 3, c = cleanIndices[i + 2]! * 3
    if (Math.abs(floatPositions[a]!) > 220 || floatPositions[a + 2]! < -280 || floatPositions[a + 2]! > 670) continue
    let cap = Infinity
    for (const w of probes) {
      const x = floatPositions[a]! * w[0]! + floatPositions[b]! * w[1]! + floatPositions[c]! * w[2]!
      const z = floatPositions[a + 2]! * w[0]! + floatPositions[b + 2]! * w[1]! + floatPositions[c + 2]! * w[2]!
      const floor = floorAt(x, z)
      if (floor !== null) {
        const y = floatPositions[a + 1]! * w[0]! + floatPositions[b + 1]! * w[1]! + floatPositions[c + 1]! * w[2]!
        if (y > floor - .2) cap = Math.min(cap, floor - .35)
      }
    }
    if (Number.isFinite(cap)) for (const id of [a, b, c]) floatPositions[id + 1] = Math.min(floatPositions[id + 1]!, cap)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(floatPositions, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(cleanIndices); g.computeVertexNormals()
  g.userData.terrainLeaves = leaves.length; builder.add(g, material)
  // Close the distant cutaway below the visible valley floor.
  const edge: [number, number][] = []
  for (let x = -2048; x <= 2048; x += 128) edge.push([x, -2048])
  for (let z = -1920; z <= 1536; z += 128) edge.push([2048, z])
  for (let x = 1920; x >= -2048; x -= 128) edge.push([x, 1536])
  for (let z = 1408; z > -2048; z -= 128) edge.push([-2048, z])
  const side: number[] = []
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i]!, b = edge[(i + 1) % edge.length]!, ya = height(a[0], a[1]), yb = height(b[0], b[1])
    side.push(a[0], ya, a[1], b[0], yb, b[1], a[0], -620, a[1], b[0], yb, b[1], b[0], -620, b[1], a[0], -620, a[1])
  }
  const sides = new THREE.BufferGeometry(); sides.setAttribute('position', new THREE.Float32BufferAttribute(side, 3)); builder.add(sides, soil)
  return height
}

