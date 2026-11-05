import * as THREE from 'three'
import { inside, WorldGeometry } from './world-geometry'
import type { Point2 } from './world-layout'

export type FoundationSpec = { points: readonly Point2[]; y: number; material: THREE.Material; holes?: readonly (readonly Point2[])[]; name: string }
type Cut = { points: readonly Point2[]; bounds: THREE.Box2 }

const area = (points: readonly Point2[]): number => points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]!; return sum + p[0] * q[1] - q[0] * p[1] }, 0) * .5
const box = (points: readonly Point2[]): THREE.Box2 => new THREE.Box2().setFromPoints(points.map(p => new THREE.Vector2(...p)))
const cross = (a: Point2, b: Point2, p: Point2): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])

/** Split a convex polygon by one directed line. On-line points belong to both
 * sides, so an opening touching a platform edge cannot remove a whole triangle. */
function split(poly: Point2[], a: Point2, b: Point2, sign: number): { inner: Point2[]; outer: Point2[] } {
  const inner: Point2[] = [], outer: Point2[] = []
  for (let i = 0; i < poly.length; i++) {
    const u = poly[i]!, v = poly[(i + 1) % poly.length]!, du = cross(a, b, u) * sign, dv = cross(a, b, v) * sign
    if (du >= -1e-7) inner.push(u)
    if (du <= 1e-7) outer.push(u)
    if (du > 1e-7 && dv < -1e-7 || du < -1e-7 && dv > 1e-7) {
      const t = du / (du - dv), p: Point2 = [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t]
      inner.push(p); outer.push(p)
    }
  }
  return { inner, outer }
}
function subtract(poly: Point2[], cut: Cut): Point2[][] {
  if (!box(poly).intersectsBox(cut.bounds)) return [poly]
  const outside: Point2[][] = [], sign = Math.sign(area(cut.points))
  let remaining = poly
  for (let i = 0; i < cut.points.length && remaining.length >= 3; i++) {
    const pieces = split(remaining, cut.points[i]!, cut.points[(i + 1) % cut.points.length]!, sign)
    if (pieces.outer.length >= 3 && Math.abs(area(pieces.outer)) > 1e-7) outside.push(pieces.outer)
    remaining = pieces.inner
  }
  return outside
}
function distance(x: number, z: number, points: readonly Point2[]): number {
  if (inside(x, z, points)) return 0
  let best = Infinity
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!, dx = b[0] - a[0], dz = b[1] - a[1]
    const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / Math.max(1e-8, dx * dx + dz * dz), 0, 1)
    best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz))
  }
  return best
}
/** Closed prism. Its top is a real walk surface; bottom and side walls form
 * continuous earth-retaining volume rather than a disconnected edge curtain. */
function prism(vertices: number[], input: readonly Point2[], top: number, bottom: number): void {
  const p = area(input) > 0 ? input : input.slice().reverse()
  const v = (i: number, y: number): number[] => [p[i]![0], y, p[i]![1]]
  for (let i = 1; i < p.length - 1; i++) {
    vertices.push(...v(0, top), ...v(i + 1, top), ...v(i, top))
    vertices.push(...v(0, bottom), ...v(i, bottom), ...v(i + 1, bottom))
  }
  for (let i = 0; i < p.length; i++) {
    const j = (i + 1) % p.length
    vertices.push(...v(i, top), ...v(j, top), ...v(i, bottom), ...v(j, top), ...v(j, bottom), ...v(i, bottom))
  }
}

/** Foundation volumes are cut through by every lower stair and landing. The
 * previous thin-slab approach clipped only the caps, leaving visible voids and
 * a tall wall across the lower part of a staircase. */
export function addFoundations(build: WorldGeometry, specs: readonly FoundationSpec[], naturalHeight: (x: number, z: number) => number, fillMaterial: THREE.Material = build.materials.soil): { platforms: number; stairSupports: number; lowestBase: number } {
  const stairs = build.floors.filter(region => region.stair), bounds = specs.map(spec => box(spec.points))
  let lowestBase = Infinity, stairSupports = 0
  const minimumBase = (points: readonly Point2[], top: number, neighbours: boolean): number => {
    let base = top - 3.2
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!, b = points[(i + 1) % points.length]!, count = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2))
      for (let j = 0; j <= count; j++) {
        const x = a[0] + (b[0] - a[0]) * j / count, z = a[1] + (b[1] - a[1]) * j / count
        base = Math.min(base, naturalHeight(x, z) - 2)
        if (neighbours) for (let n = 0; n < specs.length; n++) {
          const other = specs[n]!, bb = bounds[n]!
          if (other.y >= top - .01 || x < bb.min.x - 3 || x > bb.max.x + 3 || z < bb.min.y - 3 || z > bb.max.y + 3) continue
          if (distance(x, z, other.points) < 3) base = Math.min(base, other.y - 1)
        }
      }
    }
    lowestBase = Math.min(lowestBase, base)
    return base
  }
  const bases = specs.map(spec => minimumBase(spec.points, spec.y, true))
  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index]!, bb = bounds[index]!, base = bases[index]!
    const cuts: Cut[] = [...(spec.holes ?? []).map(points => ({ points, bounds: box(points) })), ...stairs.filter(r => r.y < spec.y - .006 && r.bounds.intersectsBox(bb)).map(r => ({ points: r.points, bounds: r.bounds }))]
    const points = spec.points.map(p => new THREE.Vector2(...p)), triangles = THREE.ShapeUtils.triangulateShape(points, []), vertices: number[] = [], lowerVertices: number[] = [], wallBase = Math.max(base, spec.y - 4.2)
    for (const triangle of triangles) {
      let pieces: Point2[][] = [triangle.map(i => spec.points[i]!)]
      for (const cut of cuts) pieces = pieces.flatMap(piece => subtract(piece, cut))
      for (const piece of pieces) if (Math.abs(area(piece)) > 1e-7) {
        prism(vertices, piece, spec.y, wallBase)
        if (base < wallBase) prism(lowerVertices, piece, wallBase, base)
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals()
    build.solid(geometry, build.materials.stone, spec.material)
    if (lowerVertices.length) {
      const fill = new THREE.BufferGeometry(); fill.setAttribute('position', new THREE.Float32BufferAttribute(lowerVertices, 3)); fill.computeVertexNormals(); build.add(fill, fillMaterial)
    }
    build.region(spec.points, spec.y)
  }
  // Treads keep their validated tops and risers. These closed solids meet the
  // underside at the same coordinates and extend continuously to bedrock.
  // No support is added to bridges or to the Sun Temple's upper cavern roof.
  for (const step of stairs) {
    let base = minimumBase(step.points, step.y, false)
    // A cut through a taller platform reaches that platform's bedrock, too.
    // Stopping at the higher natural datum would leave another void beneath
    // the staircase when seen from an adjoining low court.
    const cx = (step.bounds.min.x + step.bounds.max.x) / 2, cz = (step.bounds.min.y + step.bounds.max.y) / 2
    for (let index = 0; index < specs.length; index++) {
      const bb = bounds[index]!
      if (cx < bb.min.x - 3 || cx > bb.max.x + 3 || cz < bb.min.y - 3 || cz > bb.max.y + 3) continue
      if (distance(cx, cz, specs[index]!.points) < 3) base = Math.min(base, bases[index]!)
    }
    const top = step.y - .72
    if (base >= top) continue
    const wallBase = Math.max(base, step.y - 4.2)
    for (const [upper, lower, material] of [[top, wallBase, build.materials.stone], [wallBase, base, fillMaterial]] as const) {
      if (upper <= lower) continue
      const vertices: number[] = []; prism(vertices, step.points, upper, lower)
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals(); build.add(geometry, material)
    }
    stairSupports++
  }
  return { platforms: specs.length, stairSupports, lowestBase }
}
