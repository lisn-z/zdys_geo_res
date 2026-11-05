import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type DubaiFisherman = {
  group: THREE.Group
  /** Cast and haul are action weights; time is elapsed seconds, not a frame count. */
  pose(cast: number, haul: number, rest: number, time: number): void
  leftHand: THREE.Object3D
  rightHand: THREE.Object3D
}

type Joint = { node: THREE.Group; inverseBind: THREE.Matrix4; skin: THREE.Matrix4 }
type Batch = { position: THREE.BufferAttribute; normal: THREE.BufferAttribute; rest: Float32Array; restNormal: Float32Array; joints: Uint8Array }

function clothMap(): THREE.DataTexture {
  const size = 128, data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    const value = 229 + (grain - Math.floor(grain) - .5) * 14 - (x % 4 === 0 ? 10 : 0) - (y % 4 === 0 ? 7 : 0), i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255
  }
  const map = new THREE.DataTexture(data, size, size)
  map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.needsUpdate = true
  return map
}

/** One deckhand, facing local -X. Geometry and all five materials are owned by
 * the returned group; the scene's normal geometry/material/texture disposal
 * handles them. There is no RAF, skeleton texture, or external asset to release.
 */
export function createDubaiFisherman(): DubaiFisherman {
  const group = new THREE.Group(); group.name = 'dubai-fishing-deckhand'
  const skin = new THREE.MeshStandardMaterial({ color: '#ad8061', roughness: .93 })
  const shirt = new THREE.MeshStandardMaterial({ color: '#d3c5a7', map: clothMap(), roughness: .98 })
  const trousers = new THREE.MeshStandardMaterial({ color: '#827f70', map: clothMap(), roughness: .98 })
  const dark = new THREE.MeshStandardMaterial({ color: '#4d4438', roughness: .96 })
  const belt = new THREE.MeshStandardMaterial({ color: '#647367', map: clothMap(), roughness: .98 })
  const joints: Joint[] = [], parts = new Map<THREE.Material, THREE.BufferGeometry[]>(), batches: Batch[] = []
  function joint(name: string, parent: THREE.Object3D, x: number, y: number, z: number): number {
    const node = new THREE.Group(); node.name = name; node.position.set(x, y, z); parent.add(node)
    joints.push({ node, inverseBind: new THREE.Matrix4(), skin: new THREE.Matrix4() }); return joints.length - 1
  }
  const root = joint('dubai-fisherman-fixed-legs', group, 0, 0, 0)
  const torso = joint('dubai-fisherman-torso', group, 0, .29, 0), torsoNode = joints[torso]!.node
  const head = joint('dubai-fisherman-head', torsoNode, -.005, .235, 0)
  const leftFoot = joint('dubai-fisherman-left-foot', group, -.014, 0, .063)
  const rightFoot = joint('dubai-fisherman-right-foot', group, .012, 0, -.063)
  const leftShoulder = joint('dubai-fisherman-left-shoulder', torsoNode, 0, .157, .076)
  const rightShoulder = joint('dubai-fisherman-right-shoulder', torsoNode, 0, .157, -.076)
  const leftElbow = joint('dubai-fisherman-left-elbow', joints[leftShoulder]!.node, 0, -.102, 0)
  const rightElbow = joint('dubai-fisherman-right-elbow', joints[rightShoulder]!.node, 0, -.102, 0)
  const leftHand = new THREE.Object3D(), rightHand = new THREE.Object3D()
  leftHand.name = 'dubai-fisherman-left-hand'; rightHand.name = 'dubai-fisherman-right-hand'
  leftHand.position.set(-.003, -.116, 0); rightHand.position.copy(leftHand.position)
  joints[leftElbow]!.node.add(leftHand); joints[rightElbow]!.node.add(rightHand)
  group.updateMatrixWorld(true)
  for (const entry of joints) entry.inverseBind.copy(entry.node.matrixWorld).invert()

  function add(geometry: THREE.BufferGeometry, mat: THREE.Material, bind: number): void {
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2))
    geometry.applyMatrix4(joints[bind]!.node.matrixWorld)
    const index = new Uint8Array(geometry.getAttribute('position').count); index.fill(bind)
    geometry.setAttribute('humanJoint', new THREE.Uint8BufferAttribute(index, 1))
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    const list = parts.get(mat) ?? []; list.push(flat); parts.set(mat, list)
  }
  function ellipsoid(mat: THREE.Material, bind: number, x: number, y: number, z: number, rx: number, ry: number, rz: number, detail = 10): void {
    const geometry = new THREE.SphereGeometry(1, detail, 7); geometry.scale(rx, ry, rz); geometry.translate(x, y, z); add(geometry, mat, bind)
  }
  function limb(mat: THREE.Material, bind: number, length: number, topRadius: number, bottomRadius: number, y = 0): void {
    const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, length, 10, 2); geometry.translate(0, y - length / 2, 0); add(geometry, mat, bind)
  }
  function ring(mat: THREE.Material, bind: number, radius: number, thickness: number, y: number, stretchX = 1, stretchZ = 1): void {
    const geometry = new THREE.TorusGeometry(radius, thickness, 5, 18); geometry.rotateX(Math.PI / 2); geometry.scale(stretchX, 1, stretchZ); geometry.translate(0, y, 0); add(geometry, mat, bind)
  }
  function torsoShape(): THREE.BufferGeometry {
    const profile = [[-.020, .045, .062], [.018, .049, .066], [.080, .049, .078], [.137, .042, .080], [.177, .029, .037]]
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [], sides = 16
    for (let row = 0; row < profile.length; row++) for (let side = 0; side <= sides; side++) {
      const [y, rx, rz] = profile[row]!, angle = side / sides * Math.PI * 2
      vertices.push(Math.cos(angle) * rx! - .004, y!, Math.sin(angle) * rz!); uv.push(side / sides, row / (profile.length - 1))
      if (row < profile.length - 1 && side < sides) { const a = row * (sides + 1) + side, b = a + sides + 1; indices.push(a, b, a + 1, a + 1, b, b + 1) }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
  }

  // Shoes sit exactly on y=0. Their named joints are intentionally never changed
  // by pose(), so the caller may add a small deck-height correction to each foot.
  for (const foot of [leftFoot, rightFoot]) {
    ellipsoid(dark, foot, -.020, .015, 0, .047, .015, .025)
    ellipsoid(dark, foot, .009, .023, 0, .026, .019, .023)
  }
  ellipsoid(trousers, root, 0, .270, 0, .047, .043, .066)
  for (const side of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(.033, .026, .133, 10, 2)
    leg.translate(side < 0 ? .006 : -.006, .211, side * .052); add(leg, trousers, root)
    ellipsoid(trousers, root, side < 0 ? .009 : -.009, .148, side * .058, .027, .030, .027)
    const calf = new THREE.CylinderGeometry(.026, .020, .116, 10, 2)
    calf.translate(side < 0 ? .012 : -.014, .090, side * .063); add(calf, trousers, root)
  }
  add(torsoShape(), shirt, torso)
  ring(belt, torso, .052, .008, .014, .91, 1.29)
  // Shirt opening and collar have their own depth instead of coplanar decals.
  const placket = new THREE.BoxGeometry(.004, .086, .011); placket.translate(-.053, .090, 0); add(placket, belt, torso)
  ellipsoid(skin, torso, -.005, .185, 0, .019, .025, .019)
  ring(shirt, torso, .021, .005, .173, .95, 1.05)
  ellipsoid(skin, head, -.002, 0, 0, .034, .044, .033, 12)
  ellipsoid(skin, head, -.032, -.004, 0, .015, .013, .009)
  ellipsoid(skin, head, -.021, -.028, 0, .021, .015, .025)
  for (const side of [-1, 1]) {
    ellipsoid(skin, head, .001, -.003, side * .033, .009, .014, .006, 8)
    ellipsoid(dark, head, -.029, .010, side * .019, .003, .003, .004, 8)
    ellipsoid(dark, head, -.028, .017, side * .020, .003, .002, .008, 8)
  }
  ellipsoid(dark, head, -.035, -.020, 0, .0025, .0022, .013, 8)
  ellipsoid(shirt, head, 0, .031, 0, .038, .024, .039, 12)
  for (const y of [.020, .027, .034]) ring(shirt, head, .037, .0032, y, .98, 1.02)
  const scarfTail = new THREE.BoxGeometry(.011, .061, .025); scarfTail.translate(.034, -.016, .015); add(scarfTail, shirt, head)

  for (const [shoulder, elbow] of [[leftShoulder, leftElbow], [rightShoulder, rightElbow]]) {
    ellipsoid(shirt, shoulder!, 0, 0, 0, .025, .029, .026)
    limb(shirt, shoulder!, .098, .024, .020)
    ring(shirt, shoulder!, .021, .004, -.093)
    ellipsoid(skin, elbow!, 0, 0, 0, .017, .018, .017)
    limb(skin, elbow!, .084, .016, .011)
    ellipsoid(skin, elbow!, -.002, -.097, 0, .014, .025, .011)
    ellipsoid(skin, elbow!, -.013, -.093, .002, .008, .016, .008, 8)
  }

  for (const [mat, geometries] of parts) {
    const geometry = mergeGeometries(geometries, false)!; geometries.forEach(value => value.dispose())
    const position = geometry.getAttribute('position') as THREE.BufferAttribute, normal = geometry.getAttribute('normal') as THREE.BufferAttribute, indices = geometry.getAttribute('humanJoint') as THREE.BufferAttribute
    batches.push({ position, normal, rest: new Float32Array(position.array), restNormal: new Float32Array(normal.array), joints: new Uint8Array(indices.array) })
    geometry.deleteAttribute('humanJoint'); position.setUsage(THREE.DynamicDrawUsage); normal.setUsage(THREE.DynamicDrawUsage)
    const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh)
  }
  const inverseRoot = new THREE.Matrix4()
  function pose(cast: number, haul: number, rest: number, time: number): void {
    cast = THREE.MathUtils.clamp(Number.isFinite(cast) ? cast : 0, 0, 1)
    haul = THREE.MathUtils.clamp(Number.isFinite(haul) ? haul : 0, 0, 1)
    rest = THREE.MathUtils.clamp(Number.isFinite(rest) ? rest : 1, 0, 1)
    time = Number.isFinite(time) ? time : 0
    const tug = Math.sin(time * 2.7), active = 1 - rest
    torsoNode.rotation.set(0, haul * Math.sin(time * 2.7) * .035, .035 + cast * .11 + haul * (.075 + tug * .014))
    joints[head]!.node.rotation.z = -.015 - cast * .025
    for (let side = 0; side < 2; side++) {
      const shoulder = joints[side === 0 ? leftShoulder : rightShoulder]!.node, elbow = joints[side === 0 ? leftElbow : rightElbow]!.node
      const alternate = side === 0 ? tug : -tug
      shoulder.rotation.set((side === 0 ? 1 : -1) * (.035 + cast * .025), 0, -.20 - active * .15 - cast * 1.02 - haul * (.19 + alternate * .18))
      elbow.rotation.z = -.76 + cast * .55 - haul * (.25 - alternate * .24)
    }
    group.updateWorldMatrix(true, true); inverseRoot.copy(group.matrixWorld).invert()
    for (const entry of joints) entry.skin.multiplyMatrices(inverseRoot, entry.node.matrixWorld).multiply(entry.inverseBind)
    for (const batch of batches) {
      const { position, normal, rest: base, restNormal, joints: indices } = batch
      for (let i = 0; i < position.count; i++) {
        const p = i * 3, matrix = joints[indices[i]!]!.skin.elements, x = base[p]!, y = base[p + 1]!, z = base[p + 2]!, nx = restNormal[p]!, ny = restNormal[p + 1]!, nz = restNormal[p + 2]!
        position.setXYZ(i, matrix[0]! * x + matrix[4]! * y + matrix[8]! * z + matrix[12]!, matrix[1]! * x + matrix[5]! * y + matrix[9]! * z + matrix[13]!, matrix[2]! * x + matrix[6]! * y + matrix[10]! * z + matrix[14]!)
        normal.setXYZ(i, matrix[0]! * nx + matrix[4]! * ny + matrix[8]! * nz, matrix[1]! * nx + matrix[5]! * ny + matrix[9]! * nz, matrix[2]! * nx + matrix[6]! * ny + matrix[10]! * nz)
      }
      position.needsUpdate = true; normal.needsUpdate = true
    }
  }
  group.userData.resourceOwnership = 'independent-materials-geometries-texture-instances'
  group.userData.facing = '-X'
  pose(0, 0, 1, 0)
  return { group, pose, leftHand, rightHand }
}
