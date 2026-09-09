import * as THREE from 'three'
import type { CampusPoint } from './campus-3d-layout'

// A shared distance phase follows the entire polyline, rather than restarting at each click.
// For extreme sketches, space all dashes evenly farther apart instead of truncating a road.
export function roadMarkingSegments(points: readonly CampusPoint[]): [CampusPoint, CampusPoint][] {
  const edges: { a: CampusPoint; b: CampusPoint; length: number; start: number }[] = []
  let total = 0
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!, b = points[index]!
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    if (!Number.isFinite(length) || length < 1e-6) continue
    edges.push({ a, b, length, start: total })
    total += length
  }
  if (!edges.length) return []
  const period = Math.max(3.2, total / 4096)
  const dash = total < period ? total * 0.6 : period * 0.5
  const offset = total < period ? total * 0.2 : period * 0.25
  const segments: [CampusPoint, CampusPoint][] = []
  let edgeIndex = 0
  for (let start = offset; start < total - 1e-6; start += period) {
    const end = Math.min(start + dash, total)
    while (edgeIndex < edges.length && edges[edgeIndex]!.start + edges[edgeIndex]!.length <= start) edgeIndex++
    for (let index = edgeIndex; index < edges.length; index++) {
      const edge = edges[index]!
      if (edge.start >= end) break
      const from = Math.max(start, edge.start), to = Math.min(end, edge.start + edge.length)
      if (to - from < 1e-6) continue
      const at = (distance: number) => ({
        x: edge.a.x + (edge.b.x - edge.a.x) * (distance - edge.start) / edge.length,
        z: edge.a.z + (edge.b.z - edge.a.z) * (distance - edge.start) / edge.length,
      })
      segments.push([at(from), at(to)])
    }
  }
  return segments
}

export function createRoadMarkingGeometry(points: readonly CampusPoint[], width = 0.18, height = 0.51): THREE.BufferGeometry {
  const positions: number[] = []
  for (const [a, b] of roadMarkingSegments(points)) {
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    const nx = -(b.z - a.z) / length * width / 2, nz = (b.x - a.x) / length * width / 2
    const corners = [[a.x + nx, height, a.z + nz], [b.x + nx, height, b.z + nz], [b.x - nx, height, b.z - nz], [a.x - nx, height, a.z - nz]]
    for (const index of [0, 1, 2, 0, 2, 3]) positions.push(...corners[index]!)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}
