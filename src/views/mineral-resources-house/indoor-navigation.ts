import * as THREE from 'three'

type Vec3 = [number, number, number]
type ClearSegment = (from: THREE.Vector3, to: THREE.Vector3) => boolean

export const INDOOR_POINTS: Record<number, { eye: Vec3; target: Vec3 }> = {
  1: { eye: [-.6, 1.35, -3.85], target: [.58, .28, -4.65] },
  2: { eye: [-.2, 1.6, -4.05], target: [-1.5, 1.72, -5.98] },
  3: { eye: [-2, 1.5, -2.6], target: [-2, 1.45, -1.29] },
  4: { eye: [-3.85, 1.7, 3.8], target: [-4.636, 1.02, 3.67] },
  5: { eye: [1.5, .78, 6.65], target: [.5, 0, 6.09] },
  6: { eye: [4.15, 1.6, 2.4], target: [4.57, .95, .794] },
  7: { eye: [1.6, 1.65, -2.95], target: [3.2, 1, -4.12] },
  8: { eye: [4.35, 1.45, -2.87], target: [3.03, .63, -3.84] },
}

// The fixed corridor edges have been swept in both directions against the house
// and car, including the raised battery-inspection body. Only the two dynamic
// endpoint connections and any proposed shortcuts need collision queries.
const nodePositions: Record<string, Vec3> = {
  living: [3.1, 1.65, 4.7], aisle: [.55, 1.65, 4.7], central: [.45, 1.65, 2],
  north: [.45, 1.65, -.6], utility: [.05, 1.65, -2.65],
  bathdoor: [-1.8, 1.65, -3.2], bathinside: [-1.8, 1.65, -3.75], bathroom: [-.8, 1.65, -3.8],
  garagehall: [.35, 1.65, -3.1], garage: [1.55, 1.65, -2.9],
  livingfront: [3.1, 1.75, 2.3], kitchen: [-2.6, 1.65, 1.2],
  entranceOutside: [1.5, 1.65, 6.65],
  // Free exploration can reach the back and sides of the house. Use an outer
  // ring to return around the exterior walls instead of flying through them.
  outerNorthWest: [-6.2, 1.65, -7.2], outerNorth: [0, 1.65, -7.2],
  outerNorthEast: [6.3, 1.65, -7.2], outerEast: [6.3, 1.65, 0],
  outerSouthEast: [6.3, 1.65, 8], outerSouth: [1.5, 1.65, 8],
  outerSouthWest: [-6.2, 1.65, 8], outerWest: [-6.2, 1.65, 0],
}
for (const [id, point] of Object.entries(INDOOR_POINTS)) nodePositions[`point${id}`] = [...point.eye]
const nodeNames = Object.keys(nodePositions)
const fixedNodes = nodeNames.map(name => new THREE.Vector3(...nodePositions[name]!))
const edgeNames: [string, string][] = [
  ['living', 'aisle'], ['aisle', 'central'], ['central', 'north'], ['north', 'utility'],
  ['utility', 'bathdoor'], ['bathdoor', 'bathinside'], ['bathinside', 'bathroom'],
  ['utility', 'garagehall'], ['garagehall', 'garage'], ['living', 'livingfront'], ['aisle', 'livingfront'],
  ['central', 'kitchen'], ['kitchen', 'point4'], ['aisle', 'entranceOutside'], ['entranceOutside', 'point5'],
  ['livingfront', 'point6'], ['utility', 'point3'], ['bathroom', 'point1'], ['bathroom', 'point2'],
  ['garage', 'point7'], ['garage', 'point8'],
  ['outerNorthWest', 'outerNorth'], ['outerNorth', 'outerNorthEast'],
  ['outerNorthEast', 'outerEast'], ['outerEast', 'outerSouthEast'],
  ['outerSouthEast', 'outerSouth'], ['outerSouth', 'outerSouthWest'],
  ['outerSouthWest', 'outerWest'], ['outerWest', 'outerNorthWest'],
  ['outerSouth', 'entranceOutside'],
]
const fixedEdges = edgeNames.map(([a, b]) => {
  const from = nodeNames.indexOf(a), to = nodeNames.indexOf(b)
  return { from, to, length: fixedNodes[from]!.distanceTo(fixedNodes[to]!) }
})

function roundedPath(points: THREE.Vector3[], isClear: ClearSegment): THREE.Curve<THREE.Vector3> {
  if (points.length < 3) return new THREE.LineCurve3(points[0]!.clone(), points[points.length - 1]!.clone())
  const path = new THREE.CurvePath<THREE.Vector3>()
  let cursor = points[0]!.clone()
  const addLine = (end: THREE.Vector3) => {
    if (cursor.distanceToSquared(end) > 1e-10) path.add(new THREE.LineCurve3(cursor.clone(), end.clone()))
    cursor = end.clone()
  }
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1]!, corner = points[i]!, next = points[i + 1]!
    const incoming = corner.clone().sub(previous), outgoing = next.clone().sub(corner)
    const inLength = incoming.length(), outLength = outgoing.length()
    incoming.normalize(); outgoing.normalize()
    if (incoming.dot(outgoing) > .9995) continue
    const radius = Math.min(.24, inLength * .3, outLength * .3)
    let curve: THREE.QuadraticBezierCurve3 | null = null
    for (const scale of [1, .5]) {
      const start = corner.clone().addScaledVector(incoming, -radius * scale)
      const end = corner.clone().addScaledVector(outgoing, radius * scale)
      const candidate = new THREE.QuadraticBezierCurve3(start, corner.clone(), end)
      let clear = true, last = start
      // These short chords closely bound a <=24 cm corner, and isClear applies
      // the same swept 19 cm clearance used by manual movement.
      for (let sample = 1; sample <= 5; sample++) {
        const current = candidate.getPoint(sample / 5)
        if (!isClear(last, current)) { clear = false; break }
        last = current
      }
      if (clear) { curve = candidate; break }
    }
    if (curve) { addLine(curve.v0); path.add(curve); cursor = curve.v2.clone() }
    else addLine(corner)
  }
  addLine(points[points.length - 1]!)
  return path
}

export function createIndoorFlightPath(
  from: THREE.Vector3,
  to: THREE.Vector3,
  isClear: ClearSegment,
): THREE.Curve<THREE.Vector3> | null {
  const direct = () => new THREE.LineCurve3(from.clone(), to.clone())
  if (from.distanceToSquared(to) < 1e-10) return direct()
  const checked = new Map<string, boolean>()
  const clear: ClearSegment = (a, b) => {
    if (a.distanceToSquared(b) < 1e-10) return true
    const key = `${a.x},${a.y},${a.z}>${b.x},${b.y},${b.z}`
    const cached = checked.get(key)
    if (cached !== undefined) return cached
    const result = isClear(a, b); checked.set(key, result); return result
  }
  if (clear(from, to)) return direct()

  const points = [...fixedNodes.map(node => node.clone()), from.clone(), to.clone()]
  const start = fixedNodes.length, goal = start + 1
  const adjacency: { node: number; length: number }[][] = points.map(() => [])
  for (const edge of fixedEdges) {
    adjacency[edge.from]!.push({ node: edge.to, length: edge.length })
    adjacency[edge.to]!.push({ node: edge.from, length: edge.length })
  }
  for (const endpoint of [start, goal]) {
    const sorted = fixedNodes.map((node, index) => ({ index, distance: node.distanceTo(points[endpoint]!) }))
      .sort((a, b) => a.distance - b.distance)
    let connections = 0
    for (const item of sorted) {
      const a = endpoint === start ? points[start]! : points[item.index]!
      const b = endpoint === start ? points[item.index]! : points[goal]!
      if (!clear(a, b)) continue
      if (endpoint === start) adjacency[start]!.push({ node: item.index, length: item.distance })
      else adjacency[item.index]!.push({ node: goal, length: item.distance })
      if (++connections === 3) break
    }
    // A blocked direct segment must never become the fallback. A custom camera
    // position with no safe connection stays put; the scene can explain why.
    if (!connections) return null
  }

  const distances = points.map(() => Infinity), previous = points.map(() => -1), visited = new Set<number>()
  distances[start] = 0
  for (let iteration = 0; iteration < points.length; iteration++) {
    let current = -1, shortest = Infinity
    for (let i = 0; i < points.length; i++) if (!visited.has(i) && distances[i]! < shortest) {
      current = i; shortest = distances[i]!
    }
    if (current < 0 || current === goal) break
    visited.add(current)
    for (const edge of adjacency[current]!) {
      const candidate = shortest + edge.length
      if (candidate < distances[edge.node]!) { distances[edge.node] = candidate; previous[edge.node] = current }
    }
  }
  if (!Number.isFinite(distances[goal])) return null
  const route: THREE.Vector3[] = []
  for (let index = goal; index >= 0; index = previous[index]!) {
    route.push(points[index]!.clone())
    if (index === start) break
  }
  route.reverse()
  const unique = route.filter((point, index) => !index || point.distanceToSquared(route[index - 1]!) > 1e-10)
  const shortened: THREE.Vector3[] = [unique[0]!.clone()]
  let cursor = 0, shortcutQueries = 0
  while (cursor < unique.length - 1) {
    let next = cursor + 1
    // Bound shortcut work; do not cast a new complete visibility graph.
    for (let candidate = unique.length - 1; candidate > cursor + 1 && shortcutQueries < 6; candidate--) {
      shortcutQueries++
      if (clear(unique[cursor]!, unique[candidate]!)) { next = candidate; break }
    }
    shortened.push(unique[next]!.clone()); cursor = next
  }
  return roundedPath(shortened, clear)
}
