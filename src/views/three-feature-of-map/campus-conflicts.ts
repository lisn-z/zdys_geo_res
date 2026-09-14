import { builderItemToFeature, type BuilderItem, type BuilderPoint } from './campus-builder-data'
import { isCampusBuilding } from './campus-3d-layout'

export type CampusConflict = {
  key: string
  itemIds: [number, number]
  kind: 'building-road' | 'building-water' | 'building-building'
  message: string
}

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number }
type Footprint = { points: BuilderPoint[]; bounds: Bounds }
type PreparedItem = {
  item: BuilderItem
  category: 'building' | 'road' | 'water'
  bounds: Bounds
  footprints: Footprint[]
}

// Coordinates and widths are metres. Ignore sub-micrometre contact and tiny
// floating-point slivers, while still reporting a visibly narrow overlap.
const lengthTolerance = 1e-7
const areaTolerance = 1e-6

function getBounds(points: readonly BuilderPoint[]): Bounds {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x)
    minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z)
  }
  return { minX, maxX, minZ, maxZ }
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > lengthTolerance
    && Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > lengthTolerance
}

function signedArea(points: readonly BuilderPoint[]): number {
  if (points.length < 3) return 0
  // Translate before taking products to avoid cancellation away from the origin.
  const origin = points[0]!
  let twiceArea = 0
  for (let index = 1; index + 1 < points.length; index++) {
    const a = points[index]!, b = points[index + 1]!
    twiceArea += (a.x - origin.x) * (b.z - origin.z) - (b.x - origin.x) * (a.z - origin.z)
  }
  return twiceArea / 2
}

/** Clip the actual polygon against the convex building footprint. */
function overlapsBuilding(subject: Footprint, building: Footprint): boolean {
  if (!boundsOverlap(subject.bounds, building.bounds)) return false
  let clipped = subject.points
  const direction = signedArea(building.points) >= 0 ? 1 : -1
  for (let edge = 0; edge < building.points.length; edge++) {
    const a = building.points[edge]!, b = building.points[(edge + 1) % building.points.length]!
    const dx = b.x - a.x, dz = b.z - a.z
    const edgeLength = Math.hypot(dx, dz)
    if (edgeLength <= lengthTolerance) continue
    const distance = (point: BuilderPoint) => direction * (dx * (point.z - a.z) - dz * (point.x - a.x)) / edgeLength
    const output: BuilderPoint[] = []
    if (!clipped.length) return false
    let previous = clipped[clipped.length - 1]!
    let previousDistance = distance(previous)
    for (const current of clipped) {
      const currentDistance = distance(current)
      const previousInside = previousDistance >= 0, currentInside = currentDistance >= 0
      if (previousInside !== currentInside) {
        const fraction = previousDistance / (previousDistance - currentDistance)
        output.push({ x: previous.x + (current.x - previous.x) * fraction, z: previous.z + (current.z - previous.z) * fraction })
      }
      if (currentInside) output.push(current)
      previous = current
      previousDistance = currentDistance
    }
    clipped = output
  }
  // A concave lake may produce several components joined along a clipping edge.
  // Those opposite boundary connectors cancel in signed area; mere contact is 0.
  return Math.abs(signedArea(clipped)) > areaTolerance
}

function prepare(item: BuilderItem): PreparedItem | null {
  const category = isCampusBuilding(item.kind) ? 'building'
    : item.kind === 'campus-road' || item.kind === 'footpath' ? 'road'
      : item.kind === 'campus-water' ? 'water' : null
  if (!category || ![item.x, item.z, item.width, item.depth, item.rotation].every(Number.isFinite)
    || item.width <= 0 || item.depth <= 0) return null
  const points = builderItemToFeature(item).points
  if (!points.every(point => Number.isFinite(point.x) && Number.isFinite(point.z))) return null
  const footprints: Footprint[] = []
  if (category === 'road') {
    // Match campus-3d-model's ribbon: its full shoulder width and flat segment
    // end caps, including bends. A centreline-only test misses roadside overlap.
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1]!, b = points[index]!
      const length = Math.hypot(b.x - a.x, b.z - a.z)
      if (length < 1e-6) continue
      const nx = -(b.z - a.z) / length * item.width / 2
      const nz = (b.x - a.x) / length * item.width / 2
      const outline = [
        { x: a.x + nx, z: a.z + nz }, { x: b.x + nx, z: b.z + nz },
        { x: b.x - nx, z: b.z - nz }, { x: a.x - nx, z: a.z - nz },
      ]
      footprints.push({ points: outline, bounds: getBounds(outline) })
    }
  } else if (points.length >= 3 && Math.abs(signedArea(points)) > areaTolerance) {
    footprints.push({ points, bounds: getBounds(points) })
  }
  if (!footprints.length) return null
  const bounds = footprints.reduce<Bounds>((combined, footprint) => ({
    minX: Math.min(combined.minX, footprint.bounds.minX), maxX: Math.max(combined.maxX, footprint.bounds.maxX),
    minZ: Math.min(combined.minZ, footprint.bounds.minZ), maxZ: Math.max(combined.maxZ, footprint.bounds.maxZ),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity })
  return { item, category, bounds, footprints }
}

/** Recompute from current positions/sizes/rotations; never blocks a deliberate layout. */
export function findCampusConflicts(items: readonly BuilderItem[]): CampusConflict[] {
  const prepared = items.map(prepare).filter((item): item is PreparedItem => item !== null)
  const conflicts: CampusConflict[] = []
  for (let left = 0; left < prepared.length; left++) {
    for (let right = left + 1; right < prepared.length; right++) {
      let a = prepared[left]!, b = prepared[right]!
      if (a.category !== 'building' && b.category !== 'building') continue
      if (a.category !== 'building' || (b.category === 'building' && a.item.id > b.item.id)) [a, b] = [b, a]
      if (!boundsOverlap(a.bounds, b.bounds) || !b.footprints.some(footprint => overlapsBuilding(footprint, a.footprints[0]!))) continue
      const kind: CampusConflict['kind'] = b.category === 'road' ? 'building-road'
        : b.category === 'water' ? 'building-water' : 'building-building'
      conflicts.push({
        key: `${kind}:${Math.min(a.item.id, b.item.id)}:${Math.max(a.item.id, b.item.id)}`,
        itemIds: [a.item.id, b.item.id],
        kind,
        message: `${a.item.name}与${b.item.name}${kind === 'building-building' ? '的占地重叠' : '重叠'}`,
      })
    }
  }
  return conflicts
}
