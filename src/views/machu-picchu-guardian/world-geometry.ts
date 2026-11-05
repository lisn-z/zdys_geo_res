import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Point2, RoomSpec } from './world-layout'

export const hash = (a: number, b: number): number => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }
export function noise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), u), THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v)
}
export function inside(x: number, z: number, points: readonly Point2[]): boolean {
  let result = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!, b = points[j]!
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result
  }
  return result
}
export type FloorRegion = { points: readonly Point2[]; y: number; bounds: THREE.Box2; stair?: boolean }
type Materials = { stone: THREE.Material; grass: THREE.Material; soil: THREE.Material; wood: THREE.Material }

/** Geometry is baked before material batching. Door openings remain actual holes;
 * only upward-facing floor triangles enter the walking raycast. */
export class WorldGeometry {
  readonly colliders: THREE.Box3[] = []
  readonly floors: FloorRegion[] = []
  private batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  private floorBatches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  private stairCuts: { points: Point2[]; bounds: THREE.Box2; low: number; high: number }[] = []
  private buildingStair = false
  constructor(readonly materials: Materials) {}
  add(geometry: THREE.BufferGeometry, material: THREE.Material, walkable = false): void {
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(n.getY(i)) > .6) { uv[i * 2] = p.getX(i) * .30; uv[i * 2 + 1] = p.getZ(i) * .30 }
      else if (Math.abs(n.getX(i)) > .6) { uv[i * 2] = p.getZ(i) * .55; uv[i * 2 + 1] = p.getY(i) * .55 }
      else { uv[i * 2] = p.getX(i) * .55; uv[i * 2 + 1] = p.getY(i) * .55 }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    if (!geometry.getAttribute('color')) geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3))
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    flat.userData.stairSurface = this.buildingStair
    const map = walkable ? this.floorBatches : this.batches, list = map.get(material) ?? []
    list.push(flat); map.set(material, list)
  }
  solid(geometry: THREE.BufferGeometry, side: THREE.Material, top: THREE.Material, walkable = true): void {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    const p = flat.getAttribute('position'), n = flat.getAttribute('normal'), tops: number[] = [], sides: number[] = []
    for (let i = 0; i < p.count; i += 3) {
      const target = n.getY(i) > .98 ? tops : sides
      for (let j = 0; j < 3; j++) target.push(p.getX(i + j), p.getY(i + j), p.getZ(i + j))
    }
    for (const [vertices, mat, floor] of [[tops, top, walkable], [sides, side, false]] as const) {
      if (!vertices.length) continue
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); this.add(g, mat, floor)
    }
    flat.dispose()
  }
  region(points: readonly Point2[], y: number): void {
    this.floors.push({ points, y, stair: this.buildingStair, bounds: new THREE.Box2().setFromPoints(points.map(([x, z]) => new THREE.Vector2(x, z))) })
  }
  slab(points: readonly Point2[], y: number, thickness = .8, top: THREE.Material = this.materials.grass, holes: readonly (readonly Point2[])[] = [], side: THREE.Material = this.materials.stone): void {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)))
    for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))))
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, y - thickness, 0); this.solid(geometry, side, top)
    this.region(points, y)
  }
  box(w: number, h: number, d: number, x: number, y: number, z: number, material = this.materials.stone, angle = 0): void {
    const g = new THREE.BoxGeometry(w, h, d); g.rotateY(angle); g.translate(x, y, z); this.add(g, material)
  }
  walkBox(w: number, h: number, d: number, x: number, top: number, z: number, material = this.materials.stone, angle = 0): void {
    const g = new THREE.BoxGeometry(w, h, d); g.rotateY(angle); g.translate(x, top - h / 2, z); this.solid(g, this.materials.stone, material)
    const c = Math.cos(angle), s = Math.sin(angle), points: Point2[] = []
    for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) points.push([x + a! * c + b! * s, z - a! * s + b! * c])
    this.region(points, top)
  }
  obstacle(x: number, y: number, z: number, w: number, h: number, d: number, angle = 0): void {
    const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle)), wx = (w * c + d * s) / 2, dz = (d * c + w * s) / 2
    this.colliders.push(new THREE.Box3(new THREE.Vector3(x - wx, y, z - dz), new THREE.Vector3(x + wx, y + h, z + dz)))
  }
  stairLanding(w: number, d: number, x: number, top: number, z: number): void {
    this.buildingStair = true
    this.walkBox(w, .72, d, x, top, z, this.materials.stone)
    this.buildingStair = false
  }
  stairs(a: Point2, b: Point2, fromY: number, toY: number, width: number, maxRise = .18): void {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), count = Math.ceil(Math.abs(toY - fromY) / maxRise), angle = -Math.atan2(dz, dx)
    if (!count || length < .001) return
    const nx = -dz / length * width / 2, nz = dx / length * width / 2
    const points: Point2[] = [[a[0] + nx, a[1] + nz], [a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], [b[0] + nx, b[1] + nz]]
    this.stairCuts.push({ points, bounds: new THREE.Box2().setFromPoints(points.map(p => new THREE.Vector2(...p))), low: Math.min(fromY, toY) - .012, high: Math.max(fromY, toY) + .012 })
    this.buildingStair = true
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, top = fromY + (toY - fromY) * (toY > fromY ? i + 1 : i) / count
      this.walkBox(length / count + .002, .72, width, a[0] + dx * t, top, a[1] + dz * t, this.materials.stone, angle)
    }
    this.buildingStair = false
  }
  /** Subtract stair footprints from horizontal slabs, including previously
   * authored platforms. This removes coincident triangles rather than hiding
   * their depth conflict with a rendering bias. */
  private cutStairOpenings(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    if (geometry.userData.stairSurface || !this.stairCuts.length) return geometry
    type P = [number, number, number]
    const p = geometry.getAttribute('position'), result: number[] = []
    let changed = false
    const cross = (a: Point2, b: Point2, v: P) => (b[0] - a[0]) * (v[2] - a[1]) - (b[1] - a[1]) * (v[0] - a[0])
    const split = (poly: P[], a: Point2, b: Point2, sign: number) => {
      const inner: P[] = [], outer: P[] = []
      for (let i = 0; i < poly.length; i++) {
        const u = poly[i]!, v = poly[(i + 1) % poly.length]!, du = cross(a,b,u) * sign, dv = cross(a,b,v) * sign
        // An on-plane vertex belongs to both polygons. Assigning it only to
        // the inner side discarded the outside triangle when a platform edge
        // exactly touched a stair cut, creating large triangular lawn holes.
        const epsilon = 1e-6
        if (du >= -epsilon) inner.push(u)
        if (du <= epsilon) outer.push(u)
        if ((du > epsilon && dv < -epsilon) || (du < -epsilon && dv > epsilon)) {
          const t = du / (du - dv), hit: P = [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t, u[2] + (v[2] - u[2]) * t]
          inner.push(hit); outer.push(hit)
        }
      }
      return { inner, outer }
    }
    for (let i = 0; i < p.count; i += 3) {
      let pieces: P[][] = [[0,1,2].map(j => [p.getX(i+j),p.getY(i+j),p.getZ(i+j)] as P)]
      for (const cut of this.stairCuts) {
        const next: P[][] = []
        for (const poly of pieces) {
          const xs=poly.map(v=>v[0]), zs=poly.map(v=>v[2]), y=poly[0]![1]
          if (y < cut.low || y > cut.high || Math.max(...xs) <= cut.bounds.min.x || Math.min(...xs) >= cut.bounds.max.x || Math.max(...zs) <= cut.bounds.min.y || Math.min(...zs) >= cut.bounds.max.y) { next.push(poly); continue }
          let remaining = poly
          let area = 0; for (let k=0;k<cut.points.length;k++){ const a=cut.points[k]!,b=cut.points[(k+1)%cut.points.length]!;area += a[0]*b[1]-b[0]*a[1] }
          for (let edge = 0; edge < cut.points.length && remaining.length >= 3; edge++) {
            const parts=split(remaining,cut.points[edge]!,cut.points[(edge+1)%cut.points.length]!,Math.sign(area))
            if(parts.outer.length>=3)next.push(parts.outer)
            remaining=parts.inner
          }
          changed = true
        }
        pieces = next
      }
      for (const poly of pieces) for (let j=1;j<poly.length-1;j++) result.push(...poly[0]!,...poly[j]!,...poly[j+1]!)
    }
    if (!changed) return geometry
    const cut = new THREE.BufferGeometry(); cut.setAttribute('position',new THREE.Float32BufferAttribute(result,3));cut.computeVertexNormals()
    const uv=new Float32Array(result.length/3*2),colors=new Float32Array(result.length).fill(1)
    for(let i=0;i<result.length/3;i++){uv[i*2]=result[i*3]!* .30;uv[i*2+1]=result[i*3+2]!* .30}
    cut.setAttribute('uv',new THREE.BufferAttribute(uv,2));cut.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.dispose();return cut
  }
  wall(cx: number, cz: number, y: number, length: number, angle: number, h: number, seed: number, door = false, window = false, gable = false): void {
    const half = length / 2, thick = .38, shape = new THREE.Shape(), doorH = Math.min(1.93, h - .20)
    shape.moveTo(-half, 0); shape.lineTo(-half, h)
    if (gable) shape.lineTo(0, h + length * .37)
    else { shape.lineTo(-half * .3, h + .025); shape.lineTo(half * .4, h - .045) }
    shape.lineTo(half, h); shape.lineTo(half, 0)
    if (door) { shape.lineTo(.68, 0); shape.lineTo(.53, doorH); shape.lineTo(-.53, doorH); shape.lineTo(-.68, 0) }
    shape.closePath()
    if (window && h > 1.9) {
      const p = new THREE.Path(); p.moveTo(-.26, 1.15); p.lineTo(.26, 1.15); p.lineTo(.20, 1.72); p.lineTo(-.20, 1.72); p.closePath(); shape.holes.push(p)
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }); g.translate(0, 0, -thick / 2); g.rotateY(angle); g.translate(cx, y, cz); this.add(g, this.materials.stone)
    const c = Math.cos(angle), s = Math.sin(angle)
    const segment = (offset: number, width: number, low: number, height: number) => this.obstacle(cx + offset * c, y + low, cz - offset * s, width, height, thick, angle)
    if (door) { const width = half - .68; if (width > 0) { segment(-.68 - width / 2, width, 0, h); segment(.68 + width / 2, width, 0, h) }; segment(0, 1.06, doorH, h - doorH) }
    else segment(0, length, 0, h)
    if (!gable) for (let i = 0; i < Math.floor(length / .48); i++) {
      const lx = -half + .25 + i * .48
      this.box(.42, .08 + hash(seed, i) * .075, .40, cx + lx * c, y + h + .018, cz - lx * s, this.materials.stone, angle + (hash(seed + 5, i) - .5) * .06)
    }
    // Slightly projecting jamb and lintel blocks make masonry openings readable
    // at walking distance without decals or overlapping coplanar planes.
    if (door) {
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
        const yy = (i + .5) * doorH / 5, lx = side * (.68 - .15 * yy / doorH + .065)
        this.box(.13, doorH / 5 - .018, thick + .035, cx + lx * c, y + yy, cz - lx * s, this.materials.stone, angle)
      }
      this.box(1.38, .22, thick + .055, cx, y + doorH + .11, cz, this.materials.stone, angle)
    }
  }
  room(spec: RoomSpec): void {
    const { x, z, y, width: w, depth: d, angle, height: h, seed, style } = spec, c = Math.cos(angle), s = Math.sin(angle)
    const point = (a: number, b: number): Point2 => [x + a * c + b * s, z - a * s + b * c]
    const front = point(0, d / 2), back = point(0, -d / 2), left = point(-w / 2, 0), right = point(w / 2, 0)
    if (style === 'ruin') {
      this.wall(back[0], back[1], y, w, angle, h, seed)
      this.wall(left[0], left[1], y, d, angle + Math.PI / 2, h * .84, seed + 1)
      this.wall(right[0], right[1], y, d * .74, angle + Math.PI / 2, h * .62, seed + 2)
      for (const side of [-1, 1]) { const p = point(side * (w / 2 - .35), d / 2); this.wall(p[0], p[1], y, .7, angle, .42, seed + 3) }
    } else {
      this.wall(front[0], front[1], y, w, angle, h, seed, true, false, style === 'gable' || style === 'hut')
      this.wall(back[0], back[1], y, w, angle, h, seed + 1, false, true, style === 'gable' || style === 'hut')
      this.wall(left[0], left[1], y, d - .38, angle + Math.PI / 2, h, seed + 2, false, seed % 3 === 0)
      this.wall(right[0], right[1], y, d - .38, angle + Math.PI / 2, h, seed + 3, false, seed % 3 === 1)
      if (style === 'hut') {
        const vertices: number[] = [], rise = w * .37, eave = .28
        for (const side of [-1, 1]) {
          const points = [[side * (w / 2 + eave), h - .04, -d / 2 - .3], [0, h + rise + .06, -d / 2 - .3], [side * (w / 2 + eave), h - .04, d / 2 + .3], [0, h + rise + .06, d / 2 + .3]]
          for (const index of side > 0 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]) { const p = points[index]!; const q = point(p[0]!, p[2]!); vertices.push(q[0], y + p[1]!, q[1]) }
        }
        const roof = new THREE.BufferGeometry(); roof.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); this.add(roof, this.materials.wood)
      }
    }
    // Buried footing closes a room's base where its court meets an adjacent
    // lower shelf; the same 25 mm threshold remains traversable at every door.
    this.walkBox(w + .06, 1.65, d + .06, x, y + .025, z, this.materials.soil, angle)
  }
  /** Remove the actual shared area of horizontal floors. A spatial hash and
   * height buckets restrict each subtraction to nearby coplanar triangles.
   * Stone paths win over room soil, which wins over planted/grass surfaces. */
  private deduplicateFloors(): { cuts: number; candidateTests: number } {
    type P = [number, number, number]
    type Accepted = { points: P[]; y: number; minX: number; maxX: number; minZ: number; maxZ: number }
    // Thin finish layers (the 25 mm room threshold, for example) also replace
    // the covered ground. Keeping both faces would still flicker from an aerial
    // camera hundreds of metres away despite not being exactly coplanar.
    const accepted: Accepted[] = [], cells = new Map<string, number[]>(), cellSize = 4, heightTolerance = .06, epsilon = 1e-7
    let cuts = 0, candidateTests = 0
    const area = (p: P[]): number => { let sum = 0; for (let i = 0; i < p.length; i++) { const a = p[i]!, b = p[(i + 1) % p.length]!; sum += a[0] * b[2] - b[0] * a[2] }; return sum / 2 }
    const bounds = (p: P[]) => ({ minX: Math.min(...p.map(v => v[0])), maxX: Math.max(...p.map(v => v[0])), minZ: Math.min(...p.map(v => v[2])), maxZ: Math.max(...p.map(v => v[2])) })
    function split(poly: P[], a: P, b: P, sign: number): { inner: P[]; outer: P[] } {
      const inner: P[] = [], outer: P[] = []
      const distance = (v: P) => ((b[0] - a[0]) * (v[2] - a[2]) - (b[2] - a[2]) * (v[0] - a[0])) * sign
      for (let i = 0; i < poly.length; i++) {
        const u = poly[i]!, v = poly[(i + 1) % poly.length]!, du = distance(u), dv = distance(v)
        if (du >= -epsilon) inner.push(u)
        if (du <= epsilon) outer.push(u)
        if ((du > epsilon && dv < -epsilon) || (du < -epsilon && dv > epsilon)) {
          const t = du / (du - dv), hit: P = [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t, u[2] + (v[2] - u[2]) * t]
          inner.push(hit); outer.push(hit)
        }
      }
      return { inner, outer }
    }
    function register(points: P[]): void {
      if (Math.abs(area(points)) < 1e-9) return
      const item: Accepted = { points, y: points[0]![1], ...bounds(points) }, id = accepted.length, bucket = Math.floor(item.y / heightTolerance)
      accepted.push(item)
      for (let x = Math.floor(item.minX / cellSize); x <= Math.floor(item.maxX / cellSize); x++) for (let z = Math.floor(item.minZ / cellSize); z <= Math.floor(item.maxZ / cellSize); z++) {
        const key = `${bucket}:${x}:${z}`, list = cells.get(key) ?? []; list.push(id); cells.set(key, list)
      }
    }
    const priority = (material: THREE.Material) => material === this.materials.stone ? 0 : material === this.materials.soil ? 1 : 2
    const batches = [...this.floorBatches].sort((a, b) => priority(a[0]) - priority(b[0]))
    for (const [material, geometries] of batches) {
      const output: THREE.BufferGeometry[] = []
      for (const geometry of geometries) {
        const p = geometry.getAttribute('position'), result: number[] = []
        let changed = false
        for (let i = 0; i < p.count; i += 3) {
          const source: P[] = [0, 1, 2].map(j => [p.getX(i + j), p.getY(i + j), p.getZ(i + j)])
          const y = source[0]![1], flat = source.every(v => Math.abs(v[1] - y) < 1e-5)
          if (!flat) { result.push(...source[0]!, ...source[1]!, ...source[2]!); continue }
          const box = bounds(source), bucket = Math.floor(y / heightTolerance), candidates = new Set<number>()
          for (let h = bucket - 1; h <= bucket + 1; h++) for (let x = Math.floor(box.minX / cellSize); x <= Math.floor(box.maxX / cellSize); x++) for (let z = Math.floor(box.minZ / cellSize); z <= Math.floor(box.maxZ / cellSize); z++) {
            for (const id of cells.get(`${h}:${x}:${z}`) ?? []) candidates.add(id)
          }
          let pieces = [source]
          for (const id of candidates) {
            const cut = accepted[id]!
            if (Math.abs(y - cut.y) > heightTolerance || box.maxX <= cut.minX || box.minX >= cut.maxX || box.maxZ <= cut.minZ || box.minZ >= cut.maxZ) continue
            const next: P[][] = [], sign = Math.sign(area(cut.points))
            for (const piece of pieces) {
              candidateTests++
              let intersection = piece
              for (let edge = 0; edge < 3 && intersection.length >= 3; edge++) intersection = split(intersection, cut.points[edge]!, cut.points[(edge + 1) % 3]!, sign).inner
              // Touching edges and point contacts have zero common area; do
              // not retriangulate them or create microscopic surface slivers.
              if (intersection.length < 3 || Math.abs(area(intersection)) < 1e-8) { next.push(piece); continue }
              changed = true; cuts++
              let remaining = piece
              for (let edge = 0; edge < 3 && remaining.length >= 3; edge++) {
                const parts = split(remaining, cut.points[edge]!, cut.points[(edge + 1) % 3]!, sign)
                if (parts.outer.length >= 3 && Math.abs(area(parts.outer)) > 1e-9) next.push(parts.outer)
                remaining = parts.inner
              }
            }
            pieces = next
            if (!pieces.length) break
          }
          for (const piece of pieces) for (let j = 1; j < piece.length - 1; j++) {
            const vertices = [piece[0]!, piece[j]!, piece[j + 1]!]
            if (Math.abs(area(vertices)) < 1e-9) continue
            result.push(...vertices[0]!, ...vertices[1]!, ...vertices[2]!); register(vertices)
          }
        }
        if (!changed) { output.push(geometry); continue }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(result, 3)); g.computeVertexNormals()
        const uv = new Float32Array(result.length / 3 * 2)
        for (let i = 0; i < result.length / 3; i++) { uv[i * 2] = result[i * 3]! * .30; uv[i * 2 + 1] = result[i * 3 + 2]! * .30 }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(result.length).fill(1), 3)); geometry.dispose(); output.push(g)
      }
      this.floorBatches.set(material, output)
    }
    return { cuts, candidateTests }
  }
  finish(group: THREE.Group, walkables: THREE.Object3D[]): void {
    for (const [material, geometries] of this.floorBatches) this.floorBatches.set(material, geometries.map(g => this.cutStairOpenings(g)))
    group.userData.floorUnion = this.deduplicateFloors()
    for (const [map, isFloor] of [[this.batches, false], [this.floorBatches, true]] as const) for (const [material, geometries] of map) {
      const parts = geometries
      const geometry = mergeGeometries(parts, false)
      if (!geometry) throw new Error('Cannot combine archaeological geometry')
      parts.forEach(part => part.dispose()); geometry.computeBoundingSphere()
      const mesh = new THREE.Mesh(geometry, material); mesh.name = isFloor ? 'ridge-walkable-tops' : 'archaeological-material-batch'; mesh.castShadow = !isFloor; mesh.receiveShadow = true
      group.add(mesh); if (isFloor) walkables.push(mesh)
    }
    this.batches.clear(); this.floorBatches.clear()
  }
}
