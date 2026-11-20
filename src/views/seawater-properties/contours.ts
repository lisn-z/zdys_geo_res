/** Source-grid isolines. Missing samples are never inferred from display padding. */
export interface ContourGrid {
  width: number
  height: number
  lonStart: number
  latStart: number
  lonStep: number
  latStep: number
  values: ArrayLike<number | null>
}

export interface ContourAnchor {
  lon: number
  lat: number
  /** Tangent angle in geographic coordinates, in radians. */
  angle: number
  /** Length of the connected line in angular degrees (longitude is latitude-scaled). */
  length: number
}

export interface ContourLevel {
  value: number
  /** Separate line segments, [lon1, lat1, lon2, lat2, ...], clipped at the map seam. */
  segments: Float32Array
  /** Candidate positions. The renderer should also reject land and overlapping screen labels. */
  labels: ContourAnchor[]
}

export interface ContourOptions {
  /** Left edge of the teaching map. Output includes both edges without wrapping the right edge. */
  mapLonStart?: number
  minLabelLength?: number
  labelSpacing?: number
  maxLabelsPerLevel?: number
}

export const contourLevels = {
  temperature: [0, 5, 10, 15, 20, 25, 30],
  salinity: [30, 32, 33, 34, 35, 36, 37, 38],
  density: [1020, 1022, 1024, 1026, 1027, 1027.5, 1028, 1028.5],
} as const

/** Deep waters vary over a narrower range; finer isolines keep those gradients
 * readable without changing the fixed colour scale or exaggerating its colours. */
export function getContourLevels(property: keyof typeof contourLevels, depth = 0): readonly number[] {
  if (depth < 1000) return contourLevels[property]
  if (property === 'temperature') return depth >= 2000 ? [0, 1, 2, 3, 4, 5, 10, 15] : [0, 2, 4, 6, 8, 10, 15, 20]
  if (property === 'salinity') return depth >= 2000 ? [34.4, 34.5, 34.6, 34.7, 34.8, 34.9, 35, 35.5, 36, 38]
    : [34, 34.2, 34.4, 34.6, 34.8, 35, 35.5, 36, 38, 40]
  return depth >= 2000 ? [1027.5, 1027.6, 1027.7, 1027.8, 1027.9, 1028, 1028.1, 1028.2, 1028.5, 1029]
    : [1027, 1027.2, 1027.4, 1027.6, 1027.8, 1028, 1028.2, 1028.5, 1029]
}

interface Node { lon: number; lat: number; links: number[] }
interface Segment { a: number; b: number }
interface Builder { value: number; nodes: Map<number, Node>; edges: Segment[]; segments: number[] }

const wrap = (value: number, start: number) => ((value - start) % 360 + 360) % 360 + start
const shortDelta = (delta: number) => ((delta + 180) % 360 + 360) % 360 - 180
const finite = (value: number | null | undefined): value is number => value != null && Number.isFinite(value)

function appendClippedSegment(output: number[], a: Node, b: Node, left: number) {
  const right = left + 360
  const x1 = wrap(a.lon, left), x2 = x1 + shortDelta(b.lon - a.lon)
  if (x2 >= left && x2 <= right) {
    output.push(x1, a.lat, x2, b.lat)
    return
  }
  const seam = x2 < left ? left : right
  const t = (seam - x1) / (x2 - x1), lat = a.lat + t * (b.lat - a.lat)
  const shift = x2 < left ? 360 : -360
  if (Math.abs(x1 - seam) > 1e-10 || Math.abs(a.lat - lat) > 1e-10) output.push(x1, a.lat, seam, lat)
  if (Math.abs(x2 - seam) > 1e-10 || Math.abs(b.lat - lat) > 1e-10) output.push(seam + shift, lat, x2 + shift, b.lat)
}

function lineLength(a: Node, b: Node): number {
  return Math.hypot(shortDelta(b.lon - a.lon) * Math.cos((a.lat + b.lat) * Math.PI / 360), b.lat - a.lat)
}

function collectLabels(builder: Builder, left: number, minimum: number, spacing: number, maximum: number): ContourAnchor[] {
  if (maximum <= 0) return []
  const used = new Uint8Array(builder.edges.length)
  const paths: { nodes: Node[]; length: number }[] = []
  function follow(start: number, firstEdge: number) {
    const path = [builder.nodes.get(start)!]
    let nodeId = start, edgeId = firstEdge, length = 0
    while (!used[edgeId]) {
      used[edgeId] = 1
      const edge = builder.edges[edgeId]!, nextId = edge.a === nodeId ? edge.b : edge.a
      const next = builder.nodes.get(nextId)!
      length += lineLength(path[path.length - 1]!, next); path.push(next)
      nodeId = nextId
      // Do not invent continuity at degenerate level-valued grid vertices.
      if (next.links.length !== 2) break
      const nextEdge = next.links.find((candidate) => !used[candidate])
      if (nextEdge === undefined) break
      edgeId = nextEdge
    }
    if (length >= minimum) paths.push({ nodes: path, length })
  }
  for (const [nodeId, node] of builder.nodes) if (node.links.length !== 2) {
    for (const edgeId of node.links) if (!used[edgeId]) follow(nodeId, edgeId)
  }
  for (let edgeId = 0; edgeId < builder.edges.length; edgeId++) if (!used[edgeId]) follow(builder.edges[edgeId]!.a, edgeId)
  paths.sort((a, b) => b.length - a.length)
  const labels: ContourAnchor[] = []
  for (const path of paths) {
    // Long connected lines can offer several candidates; screen-space culling
    // remains a renderer concern because the map can be freely rotated/zoomed.
    const count = Math.max(1, Math.min(5, Math.floor(path.length / spacing)))
    let segment = 1, walked = 0
    for (let index = 0; index < count; index++) {
      const distance = path.length * (index + .5) / count
      while (segment < path.nodes.length - 1 && walked + lineLength(path.nodes[segment - 1]!, path.nodes[segment]!) < distance) {
        walked += lineLength(path.nodes[segment - 1]!, path.nodes[segment]!); segment++
      }
      const a = path.nodes[segment - 1]!, b = path.nodes[segment]!, part = lineLength(a, b)
      const t = part > 0 ? Math.max(0, Math.min(1, (distance - walked) / part)) : 0
      const dx = shortDelta(b.lon - a.lon), dy = b.lat - a.lat
      const lon = wrap(a.lon + t * dx, left), lat = a.lat + t * dy
      // Keep labels away from the physical edge of the board.
      if (lon < left + 2 || lon > left + 358 || Math.abs(lat) > 80) continue
      if (labels.some((label) => Math.hypot(shortDelta(label.lon - lon) * Math.cos(lat * Math.PI / 180), label.lat - lat) < minimum)) continue
      labels.push({ lon, lat, angle: Math.atan2(dy, dx), length: path.length })
      if (labels.length >= maximum) return labels
    }
  }
  return labels
}

/**
 * Marching squares, with the bilinear asymptotic decider for saddle cells.
 * Output uses unwrapped map longitudes: project them linearly, not through a
 * wrapping helper, so a point exactly at mapLonStart + 360 stays on the right.
 * All four samples must be valid. No contours run through source-data gaps.
 */
export function extractContours(field: ContourGrid, values: readonly number[], options: ContourOptions = {}): ContourLevel[] {
  const { width, height, lonStart, latStart, lonStep, latStep } = field
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || field.values.length !== width * height ||
    !Number.isFinite(lonStart) || !Number.isFinite(latStart) || !Number.isFinite(lonStep) || !Number.isFinite(latStep) || lonStep <= 0 || latStep <= 0) {
    throw new Error('Invalid contour grid; ascending longitude and latitude are required')
  }
  const left = options.mapLonStart ?? -30
  if (!Number.isFinite(left)) throw new Error('Invalid contour map seam')
  const levels = [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b)
  const builders: Builder[] = levels.map((value) => ({ value, nodes: new Map(), edges: [], segments: [] }))
  const cyclic = Math.abs(width * lonStep - 360) < .001, columns = cyclic ? width : width - 1
  const nodeCount = width * height
  for (let row = 0; row < height - 1; row++) for (let column = 0; column < columns; column++) {
    const nextColumn = (column + 1) % width
    // Counterclockwise corners a=SW, b=SE, c=NE, d=NW.
    const ia = row * width + column, ib = row * width + nextColumn, ic = (row + 1) * width + nextColumn, id = (row + 1) * width + column
    const a = field.values[ia], b = field.values[ib], c = field.values[ic], d = field.values[id]
    if (!finite(a) || !finite(b) || !finite(c) || !finite(d)) continue
    const low = Math.min(a, b, c, d), high = Math.max(a, b, c, d)
    if (low === high) continue
    for (const builder of builders) {
      const level = builder.value
      if (level <= low) continue
      if (level > high) break
      const mask = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0)
      if (!mask || mask === 15) continue
      function edgeNode(edge: number): number {
        // Edges: south (a→b), east (b→c), north (d→c), west (a→d).
        const first = (edge === 1 ? b : edge === 2 ? d : a)!
        const second = (edge === 0 ? b : edge === 1 || edge === 2 ? c : d)!
        const t = (level - first) / (second - first)
        const firstId = edge === 1 ? ib : edge === 2 ? id : ia
        const secondId = edge === 0 ? ib : edge === 1 || edge === 2 ? ic : id
        const horizontal = edge === 0 || edge === 2
        const edgeId = horizontal ? nodeCount + (row + (edge === 2 ? 1 : 0)) * width + column
          : nodeCount * 2 + row * width + (edge === 1 ? nextColumn : column)
        const key = t <= 1e-12 ? firstId : t >= 1 - 1e-12 ? secondId : edgeId
        if (!builder.nodes.has(key)) {
          const x = column + (horizontal ? t : edge === 1 ? 1 : 0)
          const y = row + (horizontal ? edge === 2 ? 1 : 0 : t)
          builder.nodes.set(key, { lon: lonStart + x * lonStep, lat: latStart + y * latStep, links: [] })
        }
        return key
      }
      function connect(keyA: number, keyB: number) {
        if (keyA === keyB) return
        const pointA = builder.nodes.get(keyA)!, pointB = builder.nodes.get(keyB)!
        if (Math.abs(shortDelta(pointB.lon - pointA.lon)) < 1e-12 && Math.abs(pointB.lat - pointA.lat) < 1e-12) return
        // A flat ridge exactly equal to the level can be emitted by both cells
        // sharing its edge. Draw/connect that edge once, rather than as a loop.
        if (pointA.links.some((index) => builder.edges[index]!.a === keyB || builder.edges[index]!.b === keyB)) return
        const edgeIndex = builder.edges.length
        builder.edges.push({ a: keyA, b: keyB }); pointA.links.push(edgeIndex); pointB.links.push(edgeIndex)
        appendClippedSegment(builder.segments, pointA, pointB, left)
      }
      function add(first: number, second: number) { connect(edgeNode(first), edgeNode(second)) }
      if (mask === 5 || mask === 10) {
        const determinant = (a - level) * (c - level) - (b - level) * (d - level)
        if (determinant === 0) {
          // At the exact bilinear saddle value, four branches meet. Preserve
          // that intersection instead of arbitrarily joining opposite highs.
          const coefficient = a - b + c - d, key = nodeCount * 3 + ia
          builder.nodes.set(key, { lon: lonStart + (column + (a - d) / coefficient) * lonStep,
            lat: latStart + (row + (a - b) / coefficient) * latStep, links: [] })
          for (let edge = 0; edge < 4; edge++) connect(edgeNode(edge), key)
        }
        else if (determinant > 0) { add(0, 1); add(2, 3) }
        else { add(0, 3); add(1, 2) }
      } else {
        // Exactly two crossing edges in all non-saddle cases.
        let first = -1
        const crosses = [((mask & 1) !== 0) !== ((mask & 2) !== 0), ((mask & 2) !== 0) !== ((mask & 4) !== 0),
          ((mask & 8) !== 0) !== ((mask & 4) !== 0), ((mask & 1) !== 0) !== ((mask & 8) !== 0)]
        for (let edge = 0; edge < 4; edge++) if (crosses[edge]) {
          if (first < 0) first = edge
          else add(first, edge)
        }
      }
    }
  }
  return builders.map((builder) => ({
    value: builder.value,
    segments: new Float32Array(builder.segments),
    labels: collectLabels(builder, left, options.minLabelLength ?? 7, options.labelSpacing ?? 28, options.maxLabelsPerLevel ?? 8),
  }))
}
