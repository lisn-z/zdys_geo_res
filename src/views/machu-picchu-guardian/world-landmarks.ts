import * as THREE from 'three'
import type { WorldGeometry } from './world-geometry'
import type { createWorldMaterials } from './world-materials'

export type LandmarkKind = 'sun-temple' | 'royal-residence' | 'sacred-plaza' | 'intihuatana' | 'sacred-rock' | 'three-portals' | 'twelve-openings' | 'qolqa' | 'water-mirrors' | 'condor' | 'fountains' | 'main-gate' | 'quarry' | 'guardhouse'
export interface LandmarkSpec {
  kind: LandmarkKind
  x: number
  z: number
  /** Finished surrounding platform; all local elevations are relative to it. */
  y: number
  width: number
  depth: number
  /** Radians, matching Three.js rotation about Y. */
  angle?: number
  /** Overall elevation envelope, not a uniform surviving-wall height. */
  height?: number
}

type Materials = ReturnType<typeof createWorldMaterials>
type P = [number, number]
type Opening = { at: number; width: number; topWidth?: number; bottom: number; height: number; niche?: boolean }
const noise = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }

/** Local authoring keeps all floors, stairs and collision volumes in the same
 * metre coordinate system. Meshes still enter the world's material batches. */
class LandmarkBuilder {
  readonly w: number
  readonly d: number
  readonly angle: number
  constructor(readonly build: WorldGeometry, readonly m: Materials, readonly spec: LandmarkSpec) {
    this.w = spec.width; this.d = spec.depth; this.angle = spec.angle ?? 0
  }
  point(x: number, z: number): P { const c = Math.cos(this.angle), s = Math.sin(this.angle); return [this.spec.x + x * c + z * s, this.spec.z - x * s + z * c] }
  add(g: THREE.BufferGeometry, material: THREE.Material = this.m.stone): void {
    g.rotateY(this.angle); g.translate(this.spec.x, this.spec.y, this.spec.z); this.build.add(g, material)
  }
  box(w: number, h: number, d: number, x: number, bottom: number, z: number, material: THREE.Material = this.m.stone, angle = 0, solid = false): void {
    const p = this.point(x, z)
    this.build.box(w, h, d, p[0], this.spec.y + bottom + h / 2, p[1], material, this.angle + angle)
    if (solid) this.build.obstacle(p[0], this.spec.y + bottom, p[1], w, h, d, this.angle + angle)
  }
  obstacle(x: number, bottom: number, z: number, w: number, h: number, d: number, angle = 0): void {
    const p = this.point(x, z); this.build.obstacle(p[0], this.spec.y + bottom, p[1], w, h, d, this.angle + angle)
  }
  floor(w: number, d: number, x = 0, z = 0, y = 0, material: THREE.Material = this.m.soil, angle = 0, thickness = .6): void {
    const p = this.point(x, z); this.build.walkBox(w, thickness, d, p[0], this.spec.y + y, p[1], material, this.angle + angle)
  }
  slab(points: readonly P[], y: number, thickness: number, material: THREE.Material = this.m.grass, side: THREE.Material = this.m.stone): void {
    this.build.slab(points.map(p => this.point(...p)), this.spec.y + y, thickness, material, [], side)
  }
  stairs(a: P, b: P, fromY: number, toY: number, width = 2): void {
    this.build.stairs(this.point(...a), this.point(...b), this.spec.y + fromY, this.spec.y + toY, width)
  }
  /** Multiple trapezoidal openings are holes in the masonry, not black decals.
   * Niches have a recessed stone back; door colliders leave the actual passage. */
  wall(x: number, z: number, length: number, height: number, angle = 0, openings: readonly Opening[] = [], y = 0, thick = .66, coping = true): void {
    const half = length / 2, shape = new THREE.Shape()
    const doors = openings.filter(o => o.bottom <= .001).sort((a, b) => b.at - a.at)
    shape.moveTo(-half, 0); shape.lineTo(-half, height); shape.lineTo(half, height); shape.lineTo(half, 0)
    for (const o of doors) {
      const tw = o.topWidth ?? o.width * .78
      shape.lineTo(o.at + o.width / 2, 0); shape.lineTo(o.at + tw / 2, o.height); shape.lineTo(o.at - tw / 2, o.height); shape.lineTo(o.at - o.width / 2, 0)
    }
    shape.closePath()
    for (const o of openings.filter(v => v.bottom > .001)) {
      const tw = o.topWidth ?? o.width * .78, p = new THREE.Path()
      p.moveTo(o.at - o.width / 2, o.bottom); p.lineTo(o.at + o.width / 2, o.bottom); p.lineTo(o.at + tw / 2, o.bottom + o.height); p.lineTo(o.at - tw / 2, o.bottom + o.height); p.closePath(); shape.holes.push(p)
    }
    const c = Math.cos(angle), s = Math.sin(angle)
    const pos = (u: number, v = 0): P => [x + u * c + v * s, z - u * s + v * c]
    const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 1 })
    g.translate(0, y, -thick / 2); g.rotateY(angle); g.translate(x, 0, z); this.add(g)
    let cursor = -half
    for (const o of [...doors].reverse()) {
      const end = o.at - o.width / 2
      if (end > cursor) { const p = pos((cursor + end) / 2); this.obstacle(p[0], y, p[1], end - cursor, height, thick, angle) }
      const p = pos(o.at); this.obstacle(p[0], y + o.height, p[1], o.width, Math.max(.05, height - o.height), thick, angle)
      cursor = o.at + o.width / 2
    }
    if (cursor < half) { const p = pos((cursor + half) / 2); this.obstacle(p[0], y, p[1], half - cursor, height, thick, angle) }
    for (const o of openings) {
      if (o.niche) {
        const p = pos(o.at, -thick / 2 + .045)
        this.box(o.width + .08, o.height + .08, .09, p[0], y + o.bottom - .04, p[1], this.m.stone, angle)
      }
      const p = pos(o.at)
      this.box((o.topWidth ?? o.width * .78) + .36, .24, thick + .055, p[0], y + o.bottom + o.height, p[1], this.m.stone, angle)
    }
    if (coping) {
      const count = Math.max(1, Math.floor(length / 1.14))
      for (let i = 0; i < count; i++) {
        const p = pos(-half + (i + .5) * length / count)
        this.box(length / count - .07, .10 + noise(x + i, z) * .13, thick + .035, p[0], y + height - .035, p[1], this.m.stone, angle)
      }
    }
  }
  hall(x: number, z: number, w: number, d: number, h: number, y = 0, turn = 0, niches = false): void {
    const c = Math.cos(turn), s = Math.sin(turn), p = (u: number, v: number): P => [x + u * c + v * s, z - u * s + v * c]
    this.floor(w + .15, d + .15, x, z, y, this.m.soil, turn)
    const back = p(0, -d / 2), left = p(-w / 2, 0), right = p(w / 2, 0)
    const holes: Opening[] = niches ? [-.30, 0, .30].map(v => ({ at: w * v, width: 1.05, bottom: 1.05, height: 1.16, niche: true })) : []
    this.wall(back[0], back[1], w, h, turn, holes, y)
    this.wall(left[0], left[1], d, h * .91, turn + Math.PI / 2, [], y)
    this.wall(right[0], right[1], d, h * .85, turn + Math.PI / 2, [], y)
  }
  rock(x: number, z: number, w: number, d: number, h: number, y = 0, seed = 1, tilt = 0): void {
    // An unequal multi-ring rock, with a sunk base and broad fractured crown.
    const rings = 9, vertices: number[] = [], positions: THREE.Vector3[][] = []
    for (let row = 0; row < 4; row++) {
      const ring: THREE.Vector3[] = [], levels = [-.12, .19, .70, .94], sizes = [.82, 1, .86, .34]
      for (let i = 0; i < rings; i++) {
        const a = i / rings * Math.PI * 2, r = sizes[row]! * (.88 + noise(seed + i, row) * .22)
        ring.push(new THREE.Vector3(Math.cos(a) * w / 2 * r + tilt * row / 3, h * (levels[row]! + (row ? (noise(seed + 13, i + row * 5) - .5) * .13 : 0)), Math.sin(a) * d / 2 * r))
      }
      positions.push(ring)
    }
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    for (let j = 0; j < 3; j++) for (let i = 0; i < rings; i++) {
      const a = positions[j]![i]!, b = positions[j]![(i + 1) % rings]!, c = positions[j + 1]![i]!, d1 = positions[j + 1]![(i + 1) % rings]!
      tri(a, c, b); tri(b, c, d1)
    }
    const top = new THREE.Vector3(tilt, h, 0)
    for (let i = 0; i < rings; i++) tri(positions[3]![i]!, top, positions[3]![(i + 1) % rings]!)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.translate(x, y, z); this.add(g, this.m.rock)
    this.obstacle(x + tilt * .3, y - h * .04, z, w * .83, h * 1.02, d * .83)
  }
  roof(x: number, z: number, w: number, d: number, eaveY: number, rise: number, turn = 0): void {
    // Only the few recognisable restored shelters receive a thatched covering.
    const v: number[] = [], c = Math.cos(turn), s = Math.sin(turn)
    const put = (p: number[]) => { v.push(x + p[0]! * c + p[2]! * s, p[1]!, z - p[0]! * s + p[2]! * c) }
    for (const side of [-1, 1]) {
      const points = [[side * w / 2, eaveY, -d / 2], [0, eaveY + rise, -d / 2], [side * w / 2, eaveY, d / 2], [0, eaveY + rise, d / 2]]
      for (const i of side > 0 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]) put(points[i]!)
    }
    // A distinct lower face makes thatch visible from inside the open shelters;
    // it is separated by 18 cm rather than relying on a double-sided decal.
    const upper = [...v]
    for (let i = 0; i < upper.length; i += 9) for (const vertex of [0, 2, 1]) {
      const at = i + vertex * 3; v.push(upper[at]!, upper[at + 1]! - .18, upper[at + 2]!)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); this.add(g, this.m.wood)
    // Downturned eaves give the roof thickness without a second coplanar sheet.
    for (const side of [-1, 1]) {
      const xx = side * w / 2
      this.box(.19, .24, d, x + xx * c, eaveY - .12, z - xx * s, this.m.wood, turn)
    }
  }
}

/** Recognisable spatial forms from the official sanctuary master plan and
 * surviving fabric. This is a navigable teaching reconstruction, not a survey.
 * Source: Plan Maestro del Santuario Historico de Machupicchu, pp. 84–91,
 * https://www2.congreso.gob.pe/sicr/cendocbib/con2_uibd.nsf/D4165F9C5B4D2323052577E00075B50C/$FILE/SHMP_INC_INRENA.pdf
 * Positions come from the shared spatial interpretation of the 2024 plan;
 * traditional monument names do not establish every building's original use. */
export function addLandmarks(build: WorldGeometry, materials: Materials, specs: readonly LandmarkSpec[]): void {
  for (const spec of specs) addLandmark(build, materials, spec)
}

function addLandmark(build: WorldGeometry, materials: Materials, spec: LandmarkSpec): void {
  const b = new LandmarkBuilder(build, materials, spec), { w, d, m } = b
  const door = (at = 0, width = 1.8, height = 2.25): Opening => ({ at, width, bottom: 0, height })
  const niche = (at: number): Opening => ({ at, width: 1.12, bottom: 1.1, height: 1.12, niche: true })
  switch (spec.kind) {
    case 'sun-temple': sunTemple(b); break
    case 'royal-residence': {
      // Two connected courts and differently sized chambers; the central route
      // stays open through the double-jamb entrance and cross-court doorway.
      b.floor(w * .94, d * .94)
      b.wall(0, d * .43, w * .92, 3.5, 0, [door(-w * .15, 2.1)])
      b.wall(0, -d * .43, w * .92, 3.3, 0, [niche(-w * .30), niche(0), niche(w * .30)])
      b.wall(-w * .46, 0, d * .86, 3.2, Math.PI / 2)
      b.wall(w * .46, 0, d * .86, 3.0, Math.PI / 2, [door(d * .13)])
      b.wall(w * .04, 0, d * .86, 2.8, Math.PI / 2, [door(0, 2.0)])
      b.hall(-w * .24, -d * .28, w * .31, d * .24, 3.4, 0, 0, true)
      b.hall(w * .28, -d * .27, w * .25, d * .24, 2.7)
      b.hall(w * .28, d * .26, w * .25, d * .24, 2.3, 0, Math.PI)
      b.box(3.6, .65, 1.3, -w * .31, 0, -d * .26, m.stone, 0, true)
      // Second jamb is a genuine short return, leaving the full entrance clear.
      for (const side of [-1, 1]) b.box(.36, 2.55, 1.0, -w * .15 + side * 1.27, 0, d * .43 - .5, m.stone, 0, true)
      break
    }
    case 'sacred-plaza': {
      b.floor(w * .94, d * .91, 0, 0, 0, m.grass)
      b.hall(-w * .09, -d * .30, w * .43, d * .24, 4.0, 0, 0, true)
      b.box(w * .28, .75, 1.45, -w * .09, 0, -d * .36, m.stone, 0, true)
      // Three Windows: the long east wall has three large through openings;
      // its west side faces the shared court and is deliberately open.
      const cx = w * .34, cz = d * .03, length = d * .43, hw = w * .20
      b.floor(hw, length, cx, cz)
      b.wall(cx + hw / 2, cz, length, 3.8, Math.PI / 2, [-.29, 0, .29].map(t => ({ at: length * t, width: 2.6, topWidth: 2.05, bottom: 1.05, height: 1.85 })), 0, .9)
      b.wall(cx, cz - length / 2, hw, 3.45)
      b.wall(cx, cz + length / 2, hw, 3.1)
      b.box(1.0, 2.7, 1.0, cx - hw / 2, 0, cz, m.stone, 0, true)
      b.hall(-w * .34, d * .20, w * .18, d * .29, 2.7, 0, -Math.PI / 2)
      b.box(1.6, 1.0, 1.5, -w * .06, 0, d * .12, m.rock, .14, true)
      break
    }
    case 'intihuatana': intihuatana(b); break
    case 'sacred-rock': {
      b.floor(w * .92, d * .88, 0, 0, 0, m.soil)
      const hallWidth = d * .62, hallDepth = w * .20
      b.hall(-w * .33, 0, hallWidth, hallDepth, 2.8, 0, Math.PI / 2)
      b.hall(w * .33, 0, hallWidth, hallDepth, 2.65, 0, -Math.PI / 2)
      b.roof(-w * .33, 0, hallWidth + .8, hallDepth + .9, 2.85, 2.1, Math.PI / 2)
      b.roof(w * .33, 0, hallWidth + .8, hallDepth + .9, 2.7, 2.1, -Math.PI / 2)
      b.floor(w * .38, 3.6, 0, -d * .31, .65, m.stone)
      // Thin long granite silhouette, not a standing obelisk.
      const shape = new THREE.Shape([new THREE.Vector2(-7.2, 0), new THREE.Vector2(-7.0, 1.5), new THREE.Vector2(-5.7, 2.9), new THREE.Vector2(-3.3, 3.8), new THREE.Vector2(-.2, 3.2), new THREE.Vector2(2.1, 4.15), new THREE.Vector2(4.3, 3.75), new THREE.Vector2(6.7, 2.2), new THREE.Vector2(7.2, 0)])
      const g = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelSize: .20, bevelThickness: .17, bevelSegments: 1 }); g.translate(0, .65, -d * .31 - .8); b.add(g, m.rock)
      b.obstacle(0, .65, -d * .31, 14.5, 4.4, 1.9)
      break
    }
    case 'three-portals': {
      b.floor(w * .94, d * .92)
      const centers = [-w * .30, 0, w * .30], bay = w * .29
      b.wall(0, d * .42, w * .92, 3.3, 0, centers.map(x => door(x, 2.05, 2.35)))
      b.wall(0, -d * .42, w * .92, 3.05)
      for (const x of [-w * .46, -w * .15, w * .15, w * .46]) b.wall(x, 0, d * .84, 2.7, Math.PI / 2)
      for (const x of centers) {
        b.hall(x, -d * .28, bay * .85, d * .25, 3.05, 0, 0, true)
        b.wall(x, d * .14, bay * .86, 1.65, 0, [door(0, 1.75, 1.5)])
        for (const side of [-1, 1]) b.box(.30, 2.6, .95, x + side * 1.22, 0, d * .42 - .42, m.stone, 0, true)
      }
      break
    }
    case 'twelve-openings': {
      const length = w * .92, depth = Math.min(d * .66, 10.5), h = 3.25
      b.floor(length + .2, depth + .2)
      const entries = Array.from({ length: 12 }, (_, i) => door((i - 5.5) * length / 12, Math.min(2.0, length / 12 * .45), 2.15))
      b.wall(0, depth / 2, length, h, 0, entries, 0, .8)
      b.wall(0, -depth / 2, length, h * .94, 0, [-.35, -.12, .12, .35].map(t => niche(length * t)), 0, .8)
      b.wall(-length / 2, 0, depth, h * .90, Math.PI / 2)
      b.wall(length / 2, 0, depth, h * .79, Math.PI / 2)
      // The interior remains one long roofless hall, not twelve tiny boxes.
      break
    }
    case 'qolqa': {
      // Long narrow storage structures on the low east edge; surviving double
      // storey walls and floor ledges, with no speculative intact upper floor.
      const width = w * .82, length = d * .43
      for (const center of [-d * .25, d * .25]) {
        b.floor(width + .12, length + .12, 0, center)
        for (const side of [-1, 1]) {
          const holes: Opening[] = [-.30, 0, .30].map(t => door(length * t, 1.7, 2.1))
          for (const t of [-.30, 0, .30]) holes.push({ at: length * t, width: 1.25, bottom: 3.4, height: 1.35 })
          b.wall(side * width / 2, center, length, 5.4, Math.PI / 2, holes, 0, .70)
          b.box(.30, .22, length, side * (width / 2 - .36), 2.8, center, m.stone)
        }
        b.wall(0, center - length / 2, width, 4.9)
        b.wall(0, center + length / 2, width, 4.5)
      }
      break
    }
    case 'water-mirrors': {
      b.floor(w * .9, d * .9)
      b.hall(-w * .02, -d * .08, w * .65, d * .64, 2.8)
      b.wall(-w * .02, d * .24, w * .65, 2.45, 0, [door(w * .18)])
      // Two shallow hollows cut into one low exposed bedrock slab. Their
      // interpretation is intentionally not encoded as an astronomical device.
      const outline: P[] = [[-4.6, -3], [3.9, -3.4], [5.0, .8], [3.0, 3.0], [-4.4, 2.5]]
      const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p[0], -p[1])))
      for (const x of [-1.75, 1.75]) { const hole = new THREE.Path(); hole.absarc(x, 0, .76, 0, Math.PI * 2, true); shape.holes.push(hole) }
      const g = new THREE.ExtrudeGeometry(shape, { depth: .48, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -.16, 0); b.add(g, m.rock)
      for (const x of [-1.75, 1.75]) {
        const basin = new THREE.LatheGeometry([new THREE.Vector2(.76, .32), new THREE.Vector2(.61, .14), new THREE.Vector2(.43, .04), new THREE.Vector2(0, .03)], 32); basin.translate(x, 0, 0); b.add(basin, m.rock)
      }
      b.obstacle(0, 0, 0, 9.0, .33, 6.0)
      break
    }
    case 'condor': {
      b.floor(w * .90, d * .90)
      // The two granite masses frame a low chamber; no sculpted bird statue.
      b.rock(-w * .22, -d * .05, w * .38, d * .59, 6.7, 0, 19, -1.1)
      b.rock(w * .19, -d * .12, w * .32, d * .67, 7.5, 0, 61, 1.4)
      b.wall(0, -d * .26, w * .19, 2.0, 0, [{ at: 0, width: 1.0, bottom: .65, height: 1.1, niche: true }], 0, .75)
      b.wall(0, d * .05, w * .23, 1.85, 0, [door(0, 1.6, 1.58)], 0, .80)
      b.box(w * .24, .60, d * .28, 0, 1.85, -d * .10, m.rock, 0, true)
      b.rock(-.5, d * .24, 4.7, 5.0, .44, .04, 82)
      b.hall(-w * .28, d * .30, w * .23, d * .23, 1.65, 0, Math.PI)
      break
    }
    case 'fountains': fountains(b); break
    case 'main-gate': {
      b.floor(w * .94, d * .88, 0, 0, 0, m.stone)
      b.wall(0, 0, w * .92, 3.85, 0, [door(0, 2.8, 3.15)], 0, 1.2, false)
      // Heavy single lintel and inward-tapered jambs define the original form.
      b.box(3.9, .65, 1.46, 0, 3.15, 0, m.stone)
      b.wall(-w * .40, -d * .20, d * .4, 1.9, Math.PI / 2)
      b.wall(w * .40, d * .19, d * .38, 1.5, Math.PI / 2)
      break
    }
    case 'quarry': {
      for (let i = 0; i < 23; i++) {
        const x = (noise(i, 14) - .5) * w * .84, z = (noise(i, 29) - .5) * d * .82
        // An open diagonal aisle keeps the quarry permeable on foot.
        if (Math.abs(x + z * .32) < 2.6) continue
        const size = 1.3 + noise(i, 67) * 4.5
        b.rock(x, z, size * 1.25, size, size * (.42 + noise(i, 82) * .5), 0, 80 + i)
      }
      for (let i = 0; i < 5; i++) b.box(1.1 + noise(i, 20), .65 + noise(i, 21), 1.2, -w * .35 + i * 2.0, 0, d * .30, m.stone, i * .27, true)
      break
    }
    case 'guardhouse': {
      const width = w * .68, depth = d * .72, h = 2.45
      b.floor(width + .6, depth + .6, 0, 0, 0, m.soil)
      b.wall(0, depth / 2, width, h, 0, [door(0, 1.75, 2.06)])
      b.wall(0, -depth / 2, width, h, 0, [{ at: 0, width: .70, bottom: 1.2, height: .70 }])
      b.wall(-width / 2, 0, depth, h, Math.PI / 2)
      b.wall(width / 2, 0, depth, h, Math.PI / 2)
      // Gable infill, unlike the roofless urban fabric below.
      for (const z of [-depth / 2, depth / 2]) {
        const shape = new THREE.Shape([new THREE.Vector2(-width / 2, h), new THREE.Vector2(0, h + 2.7), new THREE.Vector2(width / 2, h)])
        const g = new THREE.ExtrudeGeometry(shape, { depth: .64, bevelEnabled: false }); g.translate(0, 0, z - .32); b.add(g)
      }
      b.roof(0, 0, width + 1.3, depth + 1.2, h + .08, 2.75)
      break
    }
  }
}

function sunTemple(b: LandmarkBuilder): void {
  const { w, d, m } = b, radius = Math.min(w * .27, d * .26), base = 3.1, h = 3.05, cz = -d * .10
  // Bedrock is split around a real lower chamber instead of filling its entry.
  b.rock(-radius * .64, cz, radius * .83, radius * 1.45, 3.3, 0, 12)
  b.rock(radius * .64, cz, radius * .83, radius * 1.45, 3.45, 0, 26)
  b.wall(0, cz - radius * .64, radius * .85, 2.55, 0, [{ at: 0, width: 1.1, bottom: .8, height: 1.1, niche: true }], 0, .55)
  b.floor(radius * .79, radius * 1.60, 0, cz + radius * .12)
  // The chamber ceiling ends at the actual straight facade. Extending its box
  // beyond that edge would invisibly block the last three approach treads.
  b.obstacle(0, base - .70, cz - radius * .115, radius * 1.6, .70, radius * 1.77)
  const plan: P[] = []
  for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI; plan.push([radius * Math.cos(a), cz - radius * Math.sin(a)]) }
  plan.push([-radius, cz + radius * .77], [radius, cz + radius * .77])
  b.slab(plan, base, .70, m.stone, m.rock)
  // Polygonal curved masonry built in narrow sectors: two open window bands
  // go completely through the arc. No dark planes masquerade as openings.
  const count = 40, thick = .70
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI, c = (i + 1) / count * Math.PI
    const polygon: P[] = [[radius * Math.cos(a), cz - radius * Math.sin(a)], [radius * Math.cos(c), cz - radius * Math.sin(c)], [(radius - thick) * Math.cos(c), cz - (radius - thick) * Math.sin(c)], [(radius - thick) * Math.cos(a), cz - (radius - thick) * Math.sin(a)]]
    const band = (low: number, high: number) => {
      const shape = new THREE.Shape(polygon.map(p => new THREE.Vector2(p[0], -p[1])))
      const g = new THREE.ExtrudeGeometry(shape, { depth: high - low, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, base + low, 0); b.add(g)
    }
    if ((i >= 7 && i < 11) || (i >= 26 && i < 30)) { band(0, 1.12); band(2.35, h) } else band(0, h)
    const middle = (a + c) / 2
    b.obstacle((radius - thick / 2) * Math.cos(middle), base, cz - (radius - thick / 2) * Math.sin(middle), radius * Math.PI / count + .03, h, thick, middle + Math.PI / 2)
  }
  b.wall(-radius + thick / 2, cz + radius * .385, radius * .77, h, Math.PI / 2, [], base, thick)
  b.wall(radius - thick / 2, cz + radius * .385, radius * .77, h, Math.PI / 2, [], base, thick)
  b.wall(0, cz + radius * .77, radius * 2, h, 0, [{ at: -radius * .25, width: 1.65, bottom: 0, height: 2.2 }], base, thick)
  b.stairs([-radius * .25, d * .45], [-radius * .25, cz + radius * .77 + .15], 0, base, 2.0)
  b.rock(radius * .12, cz - radius * .15, radius * .63, radius * .67, .64, base, 39)
}

function intihuatana(b: LandmarkBuilder): void {
  const { w, d, m } = b, rise = b.spec.height ?? 16, levels = 8, top = rise - 2.6
  // Eight nonconcentric retaining terraces wrap the rocky hill. Their tops are
  // real supported floors and the cut stair follows the south-east shoulder.
  for (let i = 0; i < levels; i++) {
    const t = i / (levels - 1), sx = w * (.49 - t * .24), sz = d * (.48 - t * .24), shift = t * w * .065
    const polygon: P[] = [[-sx + shift, -sz * .54], [-sx * .64 + shift, -sz], [sx * .43 + shift, -sz * .95], [sx + shift, -sz * .39], [sx * .91 + shift, sz * .51], [sx * .40 + shift, sz], [-sx * .57 + shift, sz * .87], [-sx * .97 + shift, sz * .28]]
    // Each retaining contour follows an unequal shoulder instead of repeating
    // a regular pyramid ring. Offsets stay smaller than the inter-level setback.
    if (i > 0) for (let j = 0; j < polygon.length; j++) { polygon[j]![0] += (noise(i, j + 31) - .5) * 1.3; polygon[j]![1] += (noise(i + 9, j + 71) - .5) * 1.7 }
    const y = (i + 1) / levels * top
    b.slab(polygon, y, top / levels + .04, i === levels - 1 ? m.soil : m.grass)
  }
  // Continuous rise through the retained south face. The shared builder cuts
  // each intervening platform out of the stair volume before merging floors.
  b.stairs([w * .30, d * .47], [w * .24, -d * .01], 0, top, 2.1)
  b.floor(5.0, 4.8, w * .18, -d * .04, top, m.stone)
  b.hall(-w * .13, -d * .15, w * .23, d * .17, 2.3, top, 0)
  // Carved polyhedral base and squat angled upright, not a tall obelisk.
  const shape: P[] = [[-3.6, -2.1], [-1.6, -3.2], [2.6, -2.6], [3.6, .9], [1.5, 2.7], [-3.1, 1.8]]
  b.slab(shape, top + .55, .55, m.rock, m.rock)
  b.box(3.6, .50, 2.8, -.2, top + .55, -.3, m.rock, -.16, true)
  const pillar = new THREE.CylinderGeometry(.62, .95, 1.15, 4, 1); pillar.rotateY(.24); pillar.translate(-.40, top + 1.05 + .575, -.40); b.add(pillar, m.rock)
  b.obstacle(-.4, top + 1.05, -.4, 1.6, 1.15, 1.6)
}

function fountains(b: LandmarkBuilder): void {
  const { w, d, m } = b, rise = b.spec.height ?? 12, count = 12, step = d * .88 / count
  // A stepped chain of small individual basins beside the circulation stairs;
  // quiet water occupies only the basin recesses and the narrow connectors.
  b.stairs([w * .27, d * .46], [w * .27, -d * .46], 0, rise, Math.max(1.8, w * .26))
  for (let i = 0; i < count; i++) {
    const z = -d * .44 + (i + .5) * step, y = rise * (1 - (i + 1) / count), x = -w * .15
    b.floor(w * .45, step, x, z, y, m.stone, 0, rise / count + .1)
    const bw = Math.min(2.65, w * .28), bd = Math.min(2.8, step * .64)
    b.box(bw, .44, .35, x, y, z - bd / 2, m.stone, 0, true)
    for (const side of [-1, 1]) b.box(.34, .44, bd, x + side * bw / 2, y, z, m.stone, 0, true)
    // Two front cheeks leave the small overflow notch visibly open.
    for (const side of [-1, 1]) b.box(bw / 2 - .18, .37, .35, x + side * (bw / 4 + .09), y, z + bd / 2, m.stone, 0, true)
    const water = new THREE.PlaneGeometry(bw - .36, bd - .25); water.rotateX(-Math.PI / 2); water.translate(x, y + .10, z); b.add(water, m.water)
    if (i < count - 1) {
      b.box(.23, rise / count, .14, x, y - rise / count + .1, z + bd / 2 + .18, m.water)
      b.box(.48, .17, step - bd, x, y - .12, z + step / 2, m.stone)
    }
  }
}
