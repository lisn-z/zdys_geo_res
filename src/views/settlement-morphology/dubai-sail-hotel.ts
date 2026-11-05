import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Recognisable teaching interpretation of the dhow-sail hotel, not a surveyed
 * reconstruction. Local +Z presents the white membrane; the base rests on y=0.
 */
export function createSailHotel(): THREE.Group {
  const white = new THREE.MeshStandardMaterial({ color: '#e5e8e6', roughness: .42, metalness: .08 })
  const membrane = new THREE.MeshStandardMaterial({ color: '#eeeae0', roughness: .78, side: THREE.DoubleSide })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#528a9f', roughness: .21, metalness: .18, clearcoat: .35, envMapIntensity: 1.45 })
  const metal = new THREE.MeshStandardMaterial({ color: '#a9b8bf', roughness: .35, metalness: .58 })
  const stone = new THREE.MeshStandardMaterial({ color: '#d1c7b3', roughness: .84 })
  const landing = new THREE.MeshStandardMaterial({ color: '#718a80', roughness: .89 })
  const bins = new Map<THREE.Material, THREE.BufferGeometry[]>()
  function add(geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): void {
    geometry.translate(x, y, z)
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2))
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    const list = bins.get(mat) ?? []; list.push(flat); bins.set(mat, list)
  }
  function box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number): void { add(new THREE.BoxGeometry(w, h, d), mat, x, y, z) }
  function ellipse(mat: THREE.Material, rx: number, rz: number, h: number, x: number, y: number, z: number): void {
    const geometry = new THREE.CylinderGeometry(1, 1, h, 48); geometry.scale(rx, 1, rz); add(geometry, mat, x, y, z)
  }
  function roundedPodium(mat: THREE.Material, width: number, depth: number, radius: number, bottom: number, height: number, x: number, z = 0): void {
    const shape = new THREE.Shape(), a = width / 2, b = depth / 2
    shape.moveTo(-a + radius, -b); shape.lineTo(a - radius, -b)
    shape.absarc(a - radius, -b + radius, radius, -Math.PI / 2, 0, false)
    shape.lineTo(a, b - radius); shape.absarc(a - radius, b - radius, radius, 0, Math.PI / 2, false)
    shape.lineTo(-a + radius, b); shape.absarc(-a + radius, b - radius, radius, Math.PI / 2, Math.PI, false)
    shape.lineTo(-a, -b + radius); shape.absarc(-a + radius, -b + radius, radius, Math.PI, Math.PI * 1.5, false)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 10 })
    geometry.rotateX(-Math.PI / 2); add(geometry, mat, x, bottom, z)
  }
  function rod(mat: THREE.Material, start: THREE.Vector3, end: THREE.Vector3, radius: number, tip = radius): void {
    const direction = end.clone().sub(start), geometry = new THREE.CylinderGeometry(tip, radius, direction.length(), 8, 1, true)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    add(geometry, mat, (start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2)
  }
  function tube(mat: THREE.Material, points: THREE.Vector3[], radius: number, segments = 40): void {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 7, false), mat)
  }
  const base = .26, height = 3.96
  const left = (t: number) => -.43 + .095 * t
  const right = (t: number) => -.315 + 1.24 * Math.sqrt(Math.max(0, 1 - t)) + .12 * Math.sin(Math.PI * t) - .18 * (1 - t) ** 5
  const depth = (t: number) => .345 - .14 * t
  const point = (t: number, u: number, side: number, offset = 0) => new THREE.Vector3(THREE.MathUtils.lerp(left(t), right(t), u), base + t * height, side * (depth(t) + offset))
  const sailPoint = (t: number, u: number) => {
    const p = point(t, u, 1, .008)
    p.z += .075 * Math.sin(u * Math.PI) * Math.sin(t * Math.PI)
    return p
  }
  function surface(rows: number, columns: number, sample: (t: number, u: number) => THREE.Vector3, flip: boolean): THREE.BufferGeometry {
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, u = column / columns, p = sample(t, u)
      positions.push(p.x, p.y, p.z); uv.push(u, t)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1
        if (flip) indices.push(a, b, a + 1, a + 1, b, b + 1)
        else indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
  }

  // The tower's rectangular heel must be contained by the podium in plan.
  // An ellipse cut through its rear corners. These closed, nested rounded
  // footprints support the whole heel and the complete external-frame rings.
  roundedPodium(stone, 1.72, 1.03, .14, 0, .07, .025)
  roundedPodium(white, 1.62, .95, .20, .07, .035, .065)
  roundedPodium(glass, 1.40, .84, .09, .105, .130, .145)
  roundedPodium(white, 1.46, .90, .12, .235, .025, .145)
  for (const x of [-.34, -.17, 0, .17, .34]) {
    // All of these posts lie on the straight front/back runs of the new plan.
    box(metal, .010, .126, .016, x, .171, .427)
    box(metal, .010, .126, .016, x, .171, -.427)
  }
  // The entrance canopy starts at the glazing face; it no longer passes through
  // a curved glass wall or the main roof. Its columns stand on the stone apron.
  roundedPodium(white, .66, .115, .025, .216, .018, .03, .4775)
  for (const x of [-.23, .29]) rod(white, new THREE.Vector3(x, .07, .50), new THREE.Vector3(x, .216, .50), .010)

  const heel = new THREE.BufferGeometry(), x0 = left(0), x1 = right(0), z0 = -depth(0), z1 = sailPoint(0, 1).z
  heel.setAttribute('position', new THREE.Float32BufferAttribute([x0, base, z0, x1, base, z0, x1, base, z1, x0, base, z0, x1, base, z1, x0, base, z1], 3))
  heel.computeVertexNormals(); add(heel, white)

  add(surface(40, 20, sailPoint, false), membrane)
  add(surface(40, 12, (t, u) => point(t, u, -1), true), glass)
  add(surface(40, 8, (t, u) => new THREE.Vector3(right(t), base + t * height, (u * 2 - 1) * depth(t)), true), glass)
  add(surface(40, 8, (t, u) => new THREE.Vector3(left(t), base + t * height, (u * 2 - 1) * depth(t)), false), glass)

  // Glazing and its floor slabs follow the continuous curved elevation, instead
  // of stacking cuboids under a triangular cap.
  for (let floor = 1; floor < 29; floor++) {
    const t = floor / 29, y = base + t * height, x0 = left(t), x1 = right(t)
    box(white, x1 - x0 + .014, .014, .019, (x0 + x1) / 2, y, -depth(t) - .009)
    box(white, .018, .014, depth(t) * 2, x1 + .005, y, 0)
    box(metal, .014, .010, depth(t) * 2, x0 - .003, y, 0)
    if (floor % 3 === 0) tube(metal, Array.from({ length: 13 }, (_, i) => { const p = sailPoint(t, i / 12); p.z += .003; return p }), .0022, 16)
  }
  for (let column = 1; column < 7; column++) {
    tube(metal, Array.from({ length: 30 }, (_, row) => point(row / 29, column / 7, -1, .012)), .0045, 40)
  }
  for (const z of [-.22, -.11, 0, .11, .22]) {
    tube(metal, Array.from({ length: 28 }, (_, row) => { const t = row / 29; return new THREE.Vector3(right(t) + .006, base + t * height, z / .345 * depth(t)) }), .0042, 36)
  }

  // The twin curving external legs, rear mast and diagonals are independent
  // structural members with visible depth, including on the back elevation.
  for (const side of [-1, 1]) {
    tube(white, Array.from({ length: 34 }, (_, row) => { const t = row / 33; return new THREE.Vector3(right(t) + .025, base + t * height, side * (depth(t) + .031)) }), .036, 54)
    tube(white, Array.from({ length: 22 }, (_, row) => { const t = row / 21; return new THREE.Vector3(left(t) - .025, base + t * height, side * (depth(t) + .030)) }), .031, 34)
    for (const [a, b] of side < 0 ? [[.08, .54], [.50, .91]] : []) {
      rod(white, point(a!, .01, side, .034), point(b!, .96, side, .034), .016)
    }
  }
  rod(white, new THREE.Vector3(-.45, base, 0), new THREE.Vector3(-.37, 4.43, 0), .040, .023)
  rod(metal, new THREE.Vector3(-.37, 4.40, 0), new THREE.Vector3(-.37, 4.60, 0), .013, .004)
  for (const side of [-1, 1]) rod(white, point(1, 1, side, .03), new THREE.Vector3(-.37, 4.43, 0), .022, .015)

  // Cantilevered circular helipad, including its supporting arm and painted H.
  const padX = -.735, padY = 3.285, padZ = .045
  rod(white, new THREE.Vector3(-.39, 3.14, .02), new THREE.Vector3(padX, padY - .035, padZ), .031)
  for (const z of [-.06, .14]) rod(white, new THREE.Vector3(-.41, 2.96, z), new THREE.Vector3(padX, padY - .042, z * .35), .018)
  const padSupport = new THREE.CylinderGeometry(.241, .085, .065, 40); add(padSupport, white, padX, padY - .034, padZ)
  ellipse(landing, .237, .237, .012, padX, padY + .0045, padZ)
  const circle = new THREE.TorusGeometry(.201, .0045, 5, 40); circle.rotateX(Math.PI / 2); add(circle, white, padX, padY + .012, padZ)
  for (const x of [-.049, .049]) box(white, .015, .003, .129, padX + x, padY + .013, padZ)
  box(white, .083, .003, .015, padX, padY + .013, padZ)

  // The opposite small glazed sky restaurant balances the distinctive disc.
  ellipse(white, .31, .135, .030, -.02, 3.433, -.405)
  ellipse(glass, .294, .121, .108, -.02, 3.502, -.405)
  ellipse(white, .31, .135, .021, -.02, 3.5665, -.405)
  for (const x of [-.22, -.11, 0, .11, .22]) box(metal, .007, .102, .010, x - .02, 3.502, -.524)

  const group = new THREE.Group(); group.name = 'dubai-burj-al-arab-sail-hotel'
  for (const [material, geometries] of bins) {
    const geometry = mergeGeometries(geometries, false)!; geometries.forEach(part => part.dispose())
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
  }
  group.userData.resourceOwnership = 'independent-materials-geometries'
  group.userData.interpretation = 'educational-landmark-not-surveyed-reconstruction'
  group.userData.front = '+Z'
  return group
}
