import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Riverside vessels are teaching illustrations, not reconstructions of a named
// boat or an exact historical Aswan berth. Local y=0 is the loaded waterline.
class BoatParts {
  private bins = new Map<THREE.Material, THREE.BufferGeometry[]>()
  add(geometry: THREE.BufferGeometry, material: THREE.Material): void {
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2))
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    const list = this.bins.get(material) ?? []; list.push(flat); this.bins.set(material, list)
  }
  box(material: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number): void {
    const geometry = new THREE.BoxGeometry(w, h, d); geometry.translate(x, y, z); this.add(geometry, material)
  }
  rod(material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number): void {
    const direction = b.clone().sub(a), geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 7)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); this.add(geometry, material)
  }
  tube(material: THREE.Material, points: THREE.Vector3[], radius: number): void {
    this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(12, points.length * 3), radius, 6, false), material)
  }
  finish(name: string): THREE.Group {
    const group = new THREE.Group(); group.name = name
    for (const [material, pieces] of this.bins) {
      const geometry = mergeGeometries(pieces, false)!; pieces.forEach(piece => piece.dispose())
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    }
    return group
  }
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .84, side: THREE.DoubleSide })

/** Narrow open wooden boat, single mast and a large triangular lateen sail. */
export function createNileFelucca(index: number): THREE.Group {
  const parts = new BoatParts(), wood = mat(index % 2 ? '#8d6948' : '#876141'), trim = mat('#d5c39d'), rope = mat('#8a8068'), cloth = mat('#f0ead5')
  const rows = 32, across = 16, vertices: number[] = [], indices: number[] = []
  const halfWidth = (t: number) => .014 + .315 * Math.sin(Math.PI * t) ** .70
  const rim = (t: number) => .14 + Math.abs(t * 2 - 1) ** 3 * .10
  const shellSize = (rows + 1) * (across + 1)
  for (let shell = 0; shell < 2; shell++) for (let row = 0; row <= rows; row++) {
    const t = row / rows, width = Math.max(.006, halfWidth(t) - shell * .020), depth = .34 * Math.sin(Math.PI * t) - shell * .018 * Math.sin(Math.PI * t)
    for (let column = 0; column <= across; column++) {
      const angle = column / across * Math.PI
      vertices.push(Math.cos(angle) * width, rim(t) - Math.sin(angle) * depth, (t - .5) * 2.28)
      if (row < rows && column < across) {
        const a = shell * shellSize + row * (across + 1) + column, b = a + across + 1
        if (shell) indices.push(a, b, a + 1, a + 1, b, b + 1)
        else indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  // Join both shell lips and close the tiny end sections.
  for (let row = 0; row < rows; row++) for (const column of [0, across]) {
    const a = row * (across + 1) + column, b = a + across + 1
    indices.push(a, b, a + shellSize, b, b + shellSize, a + shellSize)
  }
  for (const row of [0, rows]) for (let column = 0; column < across; column++) {
    const a = row * (across + 1) + column
    indices.push(a, a + 1, a + shellSize, a + 1, a + shellSize + 1, a + shellSize)
  }
  const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); hull.setIndex(indices); hull.computeVertexNormals(); parts.add(hull, wood)
  for (const side of [-1, 1]) {
    const points: THREE.Vector3[] = []
    for (let n = 0; n <= rows; n++) points.push(v(side * halfWidth(n / rows), rim(n / rows) + .004, (n / rows - .5) * 2.28))
    parts.tube(trim, points, .013)
  }
  // Short thwarts touch the inner shell; the central well remains visibly open.
  for (const z of [-.62, -.18, .52]) {
    const t = z / 2.28 + .5, depth = .322 * Math.sin(Math.PI * t)
    const width = (halfWidth(t) - .020) * Math.sqrt(1 - ((rim(t) - .08) / depth) ** 2)
    parts.box(trim, width * 2 + .008, .032, .14, 0, .08, z)
  }
  const mastBase = v(0, .09, -.20), mastTop = v(0, 1.74, -.20)
  parts.rod(wood, mastBase, mastTop, .021)
  const head = v(.026, 2.40, -1.02), tack = v(.026, .62, 1.07), clew = v(.17, .30, -.91)
  parts.rod(wood, head, tack, .013)
  // Curved cloth with three fixed edges keeps the sail triangular and connected
  // to the long sloping yard instead of reading as a rectangular ship cabin.
  const points: number[] = [], uv: number[] = [], faces: number[] = [], starts: number[] = [], divisions = 14
  for (let row = 0; row <= divisions; row++) {
    starts.push(points.length / 3)
    for (let column = 0; column <= divisions - row; column++) {
      const u = row / divisions, w = column / divisions, t = 1 - u - w
      const point = head.clone().multiplyScalar(t).addScaledVector(tack, u).addScaledVector(clew, w)
      point.x += Math.sin(Math.PI * u) * Math.sin(Math.PI * w) * Math.sin(Math.PI * t) * .44
      points.push(point.x, point.y, point.z); uv.push(u, w)
    }
  }
  for (let row = 0; row < divisions; row++) for (let column = 0; column < divisions - row; column++) {
    const a = starts[row]! + column, b = starts[row + 1]! + column
    faces.push(a, b, a + 1); if (column < divisions - row - 1) faces.push(a + 1, b, b + 1)
  }
  const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); sail.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sail.setIndex(faces); sail.computeVertexNormals(); parts.add(sail, cloth)
  for (const [a, b] of [[head, tack], [tack, clew], [clew, head]]) parts.rod(trim, a!, b!, .004)
  for (const [a, b] of [[mastTop, v(-.26, .15, .56)], [mastTop, v(.26, .15, .56)], [mastTop, head.clone().lerp(tack, .37)], [clew, v(.23, .16, -.63)]]) parts.rod(rope, a!, b!, .004)
  parts.box(wood, .035, .30, .15, 0, -.025, -1.10)
  return parts.finish(`nile-lateen-sailboat-${index}`)
}

/** The long white multi-deck riverboats visible along the fig. 5-22 waterfront. */
export function createNilePassengerBoat(index: number): THREE.Group {
  const parts = new BoatParts(), white = mat('#e8e4d7'), shade = mat('#cfcfc2'), glass = mat('#546d71'), deck = mat('#ad9671'), blue = mat('#61797e')
  const stations = [-1.75, -1.35, -.5, .65, 1.40, 1.75], widths = [.32, .43, .44, .44, .34, .035]
  const positions: number[] = [], faces: number[] = []
  for (let i = 0; i < stations.length; i++) {
    const z = stations[i]!, w = widths[i]!
    positions.push(-w * .76, -.13, z, -w, .23, z, w, .23, z, w * .76, -.13, z)
    if (i < stations.length - 1) for (let j = 0; j < 4; j++) {
      const a = i * 4 + j, b = i * 4 + (j + 1) % 4
      faces.push(a, b, a + 4, b, b + 4, a + 4)
    }
  }
  faces.push(0, 2, 1, 0, 3, 2, 20, 21, 22, 20, 22, 23)
  const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); hull.setIndex(faces); hull.computeVertexNormals(); parts.add(hull, white)
  parts.box(deck, .78, .035, 2.92, 0, .255, -.08)
  parts.box(white, .76, .265, 2.72, 0, .40, -.11)
  parts.box(white, .70, .245, 2.35, 0, .69, -.19)
  parts.box(shade, .86, .045, 2.91, 0, .555, -.11)
  parts.box(white, .79, .045, 2.56, 0, .835, -.19)
  for (const side of [-1, 1]) {
    parts.box(blue, .012, .04, 2.73, side * .383, .293, -.11)
    for (let n = 0; n < 12; n++) parts.box(glass, .012, .145, .155, side * .385, .422, -1.29 + n * .214)
    for (let n = 0; n < 10; n++) parts.box(glass, .012, .125, .159, side * .355, .70, -1.18 + n * .218)
    // Open upper sun deck: thin supports and rails distinguish it from a box.
    for (const z of [-1.24, -.64, -.04, .56, .90]) parts.rod(white, v(side * .32, .86, z), v(side * .32, 1.035, z), .009)
    parts.rod(white, v(side * .32, .94, -1.25), v(side * .32, .94, .91), .009)
  }
  parts.box(white, .74, .035, 2.30, 0, 1.045, -.17)
  parts.box(white, .48, .19, .36, 0, .89, 1.02)
  parts.box(glass, .40, .105, .012, 0, .92, 1.207)
  for (const x of [-.26, .26]) for (const z of [-.8, -.25, .30]) parts.box(deck, .17, .025, .25, x, .866, z)
  return parts.finish(`nile-white-river-passenger-boat-${index}`)
}
