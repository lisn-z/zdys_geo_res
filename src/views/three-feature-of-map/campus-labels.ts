import type { CampusPoint, ProjectedCampusFeature } from './campus-3d-layout'

/** A line label belongs on its geometry, not at the centre of its bounding box. */
export function campusLabelAnchor(feature: ProjectedCampusFeature): CampusPoint {
  if (!['campus-fence', 'campus-road', 'footpath'].includes(feature.kind)) return { ...feature.center }
  const points = feature.points
  if (!points.length) return { ...feature.center }
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index]!.x, point.z - points[index]!.z))
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!
    if (length === 0) continue
    if (remaining <= length) {
      const start = points[index]!, end = points[index + 1]!
      const fraction = remaining / length
      return { x: start.x + (end.x - start.x) * fraction, z: start.z + (end.z - start.z) * fraction }
    }
    remaining -= length
  }
  return { ...points[0]! }
}
