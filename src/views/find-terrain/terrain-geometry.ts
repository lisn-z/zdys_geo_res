import type { LatLon, TerrainDefinition } from './terrain-data'

export type Point = { x: number; y: number }

export function pointInRing([lat, lon]: LatLon, ring: LatLon[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i]!, [yj, xj] = ring[j]!
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function containsRegion(feature: TerrainDefinition, point: LatLon): boolean {
  return (feature.polygons || []).some(([outer, ...holes]) =>
    outer && pointInRing(point, outer) && !holes.some(hole => pointInRing(point, hole)),
  )
}

export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

/** Screen-space tolerance only affects clicking, never geographic geometry. */
export function hitsTerrain(feature: TerrainDefinition, point: LatLon, project: (p: LatLon) => Point, tolerance = 8): boolean {
  if (feature.polygons) return containsRegion(feature, point)
  const p = project(point)
  return (feature.lines || []).some(line => line.slice(1).some((b, i) =>
    segmentDistance(p, project(line[i]!), project(b)) <= tolerance,
  ))
}
