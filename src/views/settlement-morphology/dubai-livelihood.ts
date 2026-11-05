import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Small, grounded livelihood models for textbook p.122's early Dubai harbour. */
const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n) }
type TextureKind = 'fur' | 'woven' | 'wood' | 'rug' | 'net' | 'shell' | 'fish'
type Maps = { map: THREE.DataTexture; normalMap: THREE.DataTexture; roughnessMap: THREE.DataTexture }
const cachedSources = new Map<TextureKind, Maps>()

function maps(kind: TextureKind): Maps {
  let cached = cachedSources.get(kind)
  if (!cached) {
    const size = 256, color = new Uint8Array(size * size * 4), normal = new Uint8Array(color.length), rough = new Uint8Array(color.length), heights = new Float32Array(size * size)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, p = i * 4, grain = hash(x, y)
      let value = 221 + (grain - .5) * 23, relief = grain * .07, alpha = 255, r = .92
      if (kind === 'fur') {
        const strand = Math.sin(x * 1.18 + Math.sin(y * .074) * .7)
        value += strand * 6 + Math.sin(x * .049) * Math.cos(y * .025) * 6; relief += strand * .035
      } else if (kind === 'woven' || kind === 'rug') {
        const weave = (x % 5 < 2 ? -11 : 4) + (y % 5 < 2 ? -9 : 4)
        value += weave; relief += weave * .002
        if (kind === 'rug') value *= Math.floor(x / 24) % 3 === 0 ? .68 : Math.floor(x / 24) % 3 === 1 ? .9 : 1.02
      } else if (kind === 'wood') {
        const fibre = Math.sin(x * .55 + Math.sin(y * .025) * 1.8)
        value += fibre * 12; relief += fibre * .05
      } else if (kind === 'net') {
        const a = ((x + y) % 32 + 32) % 32, b = ((x - y) % 32 + 32) % 32
        alpha = a < 3 || b < 3 ? 255 : 0; value = 217 + grain * 16; relief = grain * .045
      } else if (kind === 'shell') {
        const radius = Math.hypot((x - 128) / 128, (y - 128) / 128)
        const growth = Math.sin(radius * 92 + Math.sin(Math.atan2(y - 128, x - 128) * 9) * .8)
        value += growth * 14; relief += growth * .075
      } else {
        const scale = Math.sin(x * .7 + (Math.floor(y / 6) % 2) * Math.PI) * Math.sin(y * .52)
        value += scale * 9; relief = scale * .025; r = .4
      }
      color[p] = color[p + 1] = color[p + 2] = value; color[p + 3] = alpha; heights[i] = relief
      rough[p] = rough[p + 1] = rough[p + 2] = r * 255; rough[p + 3] = 255
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const h = (dx: number, dy: number) => heights[((y + dy + size) % size) * size + (x + dx + size) % size]!
      const dx = (h(-1, 0) - h(1, 0)) * 1.8, dy = (h(0, -1) - h(0, 1)) * 1.8, inv = 1 / Math.hypot(dx, dy, 1), p = (y * size + x) * 4
      normal[p] = (dx * inv * .5 + .5) * 255; normal[p + 1] = (dy * inv * .5 + .5) * 255; normal[p + 2] = (inv * .5 + .5) * 255; normal[p + 3] = 255
    }
    const texture = (data: Uint8Array, srgb: boolean) => {
      const t = new THREE.DataTexture(data, size, size); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; t.needsUpdate = true; return t
    }
    cached = { map: texture(color, true), normalMap: texture(normal, false), roughnessMap: texture(rough, false) }; cachedSources.set(kind, cached)
  }
  return { map: cached.map.clone(), normalMap: cached.normalMap.clone(), roughnessMap: cached.roughnessMap.clone() }
}

function material(color: string, kind?: TextureKind): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, ...(kind ? maps(kind) : {}), roughness: .94, normalScale: new THREE.Vector2(.32, .32) })
}

class Parts {
  frame = new THREE.Matrix4()
  skin?: (x: number, y: number, z: number, u: number) => readonly [number, number, number, number]
  private bins = new Map<THREE.Material, THREE.BufferGeometry[]>()
  add(geometry: THREE.BufferGeometry, mat: THREE.Material): void {
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2))
    if (this.skin) {
      const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), indices = new Uint16Array(p.count * 2), weights = new Float32Array(p.count * 2)
      for (let i = 0; i < p.count; i++) {
        const [a, wa, b, wb] = this.skin(p.getX(i), p.getY(i), p.getZ(i), uv.getX(i))
        indices[i * 2] = a; indices[i * 2 + 1] = b; weights[i * 2] = wa; weights[i * 2 + 1] = wb
      }
      geometry.setAttribute('camelJoints', new THREE.Uint16BufferAttribute(indices, 2)); geometry.setAttribute('camelWeights', new THREE.Float32BufferAttribute(weights, 2))
    }
    geometry.applyMatrix4(this.frame)
    const flat = geometry.index ? geometry.toNonIndexed() : geometry
    if (flat !== geometry) geometry.dispose()
    const list = this.bins.get(mat) ?? []; list.push(flat); this.bins.set(mat, list)
  }
  ellipsoid(mat: THREE.Material, x: number, y: number, z: number, rx: number, ry: number, rz: number, rotationZ = 0, detail = 14): void {
    const g = new THREE.SphereGeometry(1, detail, Math.max(6, Math.round(detail * .65))); g.scale(rx, ry, rz); g.rotateZ(rotationZ); g.translate(x, y, z); this.add(g, mat)
  }
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number): void { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); this.add(g, mat) }
  tube(mat: THREE.Material, points: THREE.Vector3[], radius: number, segments = 20, closed = false): void { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), segments, radius, 5, closed), mat) }
  tapered(mat: THREE.Material, points: THREE.Vector3[], radii: number[], segments = 22, sides = 9): void {
    const curve = new THREE.CatmullRomCurve3(points), frames = curve.computeFrenetFrames(segments, false), vertices: number[] = [], uv: number[] = [], indices: number[] = []
    for (let j = 0; j <= segments; j++) {
      const t = j / segments, point = curve.getPoint(t), at = t * (radii.length - 1), index = Math.min(radii.length - 2, Math.floor(at)), r = THREE.MathUtils.lerp(radii[index]!, radii[index + 1]!, at - index)
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * Math.PI * 2
        const v = point.clone().addScaledVector(frames.normals[j]!, Math.cos(a) * r).addScaledVector(frames.binormals[j]!, Math.sin(a) * r)
        vertices.push(v.x, v.y, v.z); uv.push(i / sides, t)
        if (j < segments && i < sides) { const a = j * (sides + 1) + i, b = a + sides + 1; indices.push(a, a + 1, b, a + 1, b + 1, b) }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); this.add(g, mat)
  }
  finish(name: string): THREE.Group {
    const group = new THREE.Group(); group.name = name
    for (const [mat, geometries] of this.bins) { const g = mergeGeometries(geometries, false)!; geometries.forEach(part => part.dispose()); const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh) }
    group.userData.resourceOwnership = 'independent-materials-geometries-texture-instances'
    return group
  }
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

type CamelLeg = {
  camel: number; joint: number; phase: number; bend: number
  hx: number; hy: number; kx: number; ky: number; fx: number; fy: number
  upper: number; lower: number; upperAngle: number; lowerAngle: number
  targetX: number; targetY: number
}
type AnimatedBatch = {
  positions: THREE.BufferAttribute; normals: THREE.BufferAttribute
  basePositions: Float32Array; baseNormals: Float32Array
  joints: Uint16Array; weights: Float32Array
}
type CamelAnimation = { time: number; legs: CamelLeg[]; palette: Float64Array; batches: AnimatedBatch[] }
const camelAnimations = new WeakMap<THREE.Group, CamelAnimation>()
const rigidSkin = (joint: number) => () => [joint, 1, joint, 0] as const

function camelLegSkin(upper: number, kneeY: number, ankleY: number): NonNullable<Parts['skin']> {
  return (_x, y) => {
    // Adjacent transforms share the exact joint position, so the blended skin
    // remains connected at both the knee and the two-toed foot pad.
    if (y > kneeY + .038) return [upper, 1, upper, 0]
    if (y > kneeY - .038) { const w = (y - kneeY + .038) / .076; return [upper, w, upper + 1, 1 - w] }
    if (y > ankleY + .018) return [upper + 1, 1, upper + 1, 0]
    const w = THREE.MathUtils.clamp((y - ankleY + .008) / .026, 0, 1)
    return [upper + 1, w, upper + 2, 1 - w]
  }
}

function bindCamelAnimation(group: THREE.Group, legs: CamelLeg[]): void {
  const batches: AnimatedBatch[] = []
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const positions = object.geometry.getAttribute('position') as THREE.BufferAttribute, normals = object.geometry.getAttribute('normal') as THREE.BufferAttribute
    const joints = object.geometry.getAttribute('camelJoints') as THREE.BufferAttribute, weights = object.geometry.getAttribute('camelWeights') as THREE.BufferAttribute
    batches.push({ positions, normals, basePositions: new Float32Array(positions.array), baseNormals: new Float32Array(normals.array), joints: new Uint16Array(joints.array), weights: new Float32Array(weights.array) })
    object.geometry.deleteAttribute('camelJoints'); object.geometry.deleteAttribute('camelWeights')
    positions.setUsage(THREE.DynamicDrawUsage); normals.setUsage(THREE.DynamicDrawUsage)
    // The reserved footprint is static, but feet move beyond their rest bounds.
    object.frustumCulled = false
  })
  camelAnimations.set(group, { time: 0, legs, palette: new Float64Array(39 * 4), batches })
  group.userData.animation = 'slow-dromedary-pace'
}

/** Advances only the local gait. The caller owns route motion and ground conform.
 * Every call restores all vertices from the factory bind pose before deforming;
 * a terrain adjustment applied afterwards therefore cannot accumulate.
 */
export function updateCamelCaravan(group: THREE.Group, deltaSeconds: number): void {
  const animation = camelAnimations.get(group)
  if (!animation) return
  if (Number.isFinite(deltaSeconds)) animation.time += Math.max(0, Math.min(.12, deltaSeconds))
  const { time, legs, palette, batches } = animation, fade = Math.min(1, time / .8), gain = fade * fade * (3 - 2 * fade)
  for (let camel = 0; camel < 3; camel++) {
    const phase = time / 4.8 + camel * .137
    let bob = (-.024 + .004 * Math.sin(phase * Math.PI * 4)) * gain
    for (const leg of legs) {
      if (leg.camel !== camel) continue
      const cycle = ((phase + leg.phase) % 1 + 1) % 1
      let advance: number, lift = 0
      if (cycle < .62) advance = 1 - 2 * cycle / .62
      else { const swing = (cycle - .62) / .38; advance = -Math.cos(swing * Math.PI); lift = .052 * Math.sin(swing * Math.PI) ** 1.5 }
      leg.targetX = leg.fx + advance * .065 * gain; leg.targetY = leg.fy + lift * gain
      // Limit the body height, rather than stretch a planted leg past its reach.
      const reach = leg.upper + leg.lower - .000001, dx = leg.targetX - leg.hx
      bob = Math.min(bob, leg.targetY + Math.sqrt(Math.max(.001, reach * reach - dx * dx)) - leg.hy)
    }
    const body = camel * 13 * 4
    palette[body] = 1; palette[body + 1] = 0; palette[body + 2] = 0; palette[body + 3] = bob
    for (const leg of legs) {
      if (leg.camel !== camel) continue
      const hx = leg.hx, hy = leg.hy + bob, dx = leg.targetX - hx, dy = leg.targetY - hy, distance = Math.hypot(dx, dy)
      const along = (leg.upper * leg.upper - leg.lower * leg.lower + distance * distance) / (2 * distance)
      const across = Math.sqrt(Math.max(0, leg.upper * leg.upper - along * along)) * leg.bend
      const kx = hx + dx / distance * along - dy / distance * across, ky = hy + dy / distance * along + dx / distance * across
      const upperAngle = Math.atan2(ky - hy, kx - hx) - leg.upperAngle, lowerAngle = Math.atan2(leg.targetY - ky, leg.targetX - kx) - leg.lowerAngle
      let at = leg.joint * 4, c = Math.cos(upperAngle), s = Math.sin(upperAngle)
      palette[at] = c; palette[at + 1] = s; palette[at + 2] = hx - c * leg.hx + s * leg.hy; palette[at + 3] = hy - s * leg.hx - c * leg.hy
      at += 4; c = Math.cos(lowerAngle); s = Math.sin(lowerAngle)
      palette[at] = c; palette[at + 1] = s; palette[at + 2] = kx - c * leg.kx + s * leg.ky; palette[at + 3] = ky - s * leg.kx - c * leg.ky
      at += 4; palette[at] = 1; palette[at + 1] = 0; palette[at + 2] = leg.targetX - leg.fx; palette[at + 3] = leg.targetY - leg.fy
    }
  }
  for (const batch of batches) {
    const { positions, normals, basePositions, baseNormals, joints, weights } = batch
    for (let i = 0; i < positions.count; i++) {
      const p = i * 3, w = i * 2, a = joints[w]! * 4, b = joints[w + 1]! * 4, wa = weights[w]!, wb = weights[w + 1]!
      const c = palette[a]! * wa + palette[b]! * wb, s = palette[a + 1]! * wa + palette[b + 1]! * wb
      const x = basePositions[p]!, y = basePositions[p + 1]!, nx = baseNormals[p]!, ny = baseNormals[p + 1]!, nz = baseNormals[p + 2]!
      positions.setXYZ(i, c * x - s * y + palette[a + 2]! * wa + palette[b + 2]! * wb, s * x + c * y + palette[a + 3]! * wa + palette[b + 3]! * wb, basePositions[p + 2]!)
      const tx = c * nx - s * ny, ty = s * nx + c * ny, inv = 1 / (Math.hypot(tx, ty, nz) || 1)
      normals.setXYZ(i, tx * inv, ty * inv, nz * inv)
    }
    positions.needsUpdate = true; normals.needsUpdate = true
  }
}

/** Restores the original stationary pose, also clearing any prior ground conform. */
export function resetCamelCaravan(group: THREE.Group): void {
  const animation = camelAnimations.get(group)
  if (!animation) return
  animation.time = 0
  for (const batch of animation.batches) {
    batch.positions.array.set(batch.basePositions); batch.normals.array.set(batch.baseNormals)
    batch.positions.needsUpdate = true; batch.normals.needsUpdate = true
  }
}

function hump(): THREE.BufferGeometry {
  const profile = [[.77, .205, .12], [.855, .177, .108], [.945, .115, .078], [1.005, .047, .038], [1.025, .003, .003]]
  const points: number[] = [], uv: number[] = [], index: number[] = [], sides = 22
  for (let row = 0; row < profile.length; row++) for (let i = 0; i <= sides; i++) {
    const [y, rx, rz] = profile[row]!, a = i / sides * Math.PI * 2
    points.push(-.075 + Math.cos(a) * rx!, y!, Math.sin(a) * rz!); uv.push(i / sides, row / (profile.length - 1))
    if (row < profile.length - 1 && i < sides) { const a = row * (sides + 1) + i, b = a + sides + 1; index.push(a, b, a + 1, a + 1, b, b + 1) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(index); g.computeVertexNormals(); return g
}

export function createCamelCaravan(): THREE.Group {
  const parts = new Parts(), fur = material('#c0a783', 'fur'), dark = material('#655447'), hide = material('#9c8262'), cloth = material('#b6a180', 'woven'), rug = material('#94775d', 'rug'), wood = material('#7d6043', 'wood'), rope = material('#c2b393', 'woven')
  const offsets = [[-1.23, -.075], [-.02, .075], [1.19, -.035]], scale = .93, legs: CamelLeg[] = []
  offsets.forEach(([cx, cz], camel) => {
    parts.frame.compose(v(cx!, 0, cz!), new THREE.Quaternion(), v(scale, scale, scale))
    const body = camel * 13, bodySkin = rigidSkin(body)
    parts.skin = bodySkin
    const bindLeg = (index: number, side: number, hx: number, hy: number, kx: number, ky: number, fx: number): number => {
      const fy = .03, joint = body + 1 + index * 3, upperAngle = Math.atan2(ky - hy, kx - hx), lowerAngle = Math.atan2(fy - ky, fx - kx)
      legs.push({ camel, joint, phase: (side < 0 ? 0 : .5) + (index % 2 ? .10 : 0), bend: Math.sign((fx - hx) * (ky - hy) - (fy - hy) * (kx - hx)) || 1,
        hx: cx! + hx * scale, hy: hy * scale, kx: cx! + kx * scale, ky: ky * scale, fx: cx! + fx * scale, fy: fy * scale,
        upper: Math.hypot(kx - hx, ky - hy) * scale, lower: Math.hypot(fx - kx, fy - ky) * scale, upperAngle, lowerAngle, targetX: 0, targetY: 0 })
      return joint
    }
    parts.ellipsoid(fur, -.065, .655, 0, .415, .19, .158)
    parts.ellipsoid(fur, .265, .605, 0, .13, .18, .14)
    parts.ellipsoid(fur, -.30, .625, 0, .13, .158, .137)
    parts.add(hump(), fur)
    parts.tapered(fur, [v(.25, .65, 0), v(.36, .77, 0), v(.405, .94, 0), v(.49, 1.055, 0), v(.60, 1.095, 0)], [.085, .072, .054, .044, .043], 26, 12)
    parts.ellipsoid(fur, .635, 1.106, 0, .105, .063, .052, -.08)
    parts.ellipsoid(fur, .739, 1.083, 0, .083, .043, .041, -.11)
    parts.ellipsoid(hide, .764, 1.061, 0, .057, .018, .033)
    for (const side of [-1, 1]) {
      parts.skin = bodySkin
      parts.ellipsoid(fur, .554, 1.166, side * .044, .022, .043, .014, .34 * side, 10)
      parts.ellipsoid(dark, .656, 1.127, side * .047, .0055, .0050, .0034, 0, 8)
      parts.ellipsoid(dark, .802, 1.089, side * .026, .006, .004, .004, -.3, 8)
      parts.tube(dark, [v(.733, 1.054, side * .031), v(.771, 1.053, side * .032), v(.806, 1.058, side * .021)], .0015, 8)
      const step = (camel % 2 ? -1 : 1) * side * .035
      const front = bindLeg(side < 0 ? 0 : 2, side, .245, .615, .24 + step, .30, .275 + step)
      parts.skin = camelLegSkin(front, .30, .03)
      parts.tapered(fur, [v(.245, .615, side * .113), v(.259, .43, side * .122), v(.24 + step, .30, side * .127), v(.275 + step, .030, side * .132)], [.039, .031, .025, .017], 15, 8)
      parts.ellipsoid(fur, .24 + step, .30, side * .127, .027, .031, .026, 0, 10)
      const rear = bindLeg(side < 0 ? 1 : 3, side, -.31, .62, -.295 - step, .285, -.36 - step)
      parts.skin = camelLegSkin(rear, .285, .03)
      parts.tapered(fur, [v(-.31, .62, side * .112), v(-.36, .44, side * .124), v(-.295 - step, .285, side * .129), v(-.36 - step, .030, side * .135)], [.043, .033, .023, .017], 15, 8)
      for (const [footX, footZ, footJoint] of [[.285 + step, side * .132, front + 2], [-.35 - step, side * .135, rear + 2]]) {
        parts.skin = rigidSkin(footJoint!)
        for (const toe of [-1, 1]) parts.ellipsoid(hide, footX! + .012, .020, footZ! + toe * .013, .039, .020, .018, 0, 9)
      }
    }
    parts.skin = bodySkin
    parts.tapered(fur, [v(-.43, .69, 0), v(-.50, .57, .015), v(-.52, .45, .027)], [.014, .011, .008], 15, 6)
    parts.ellipsoid(dark, -.521, .421, .03, .017, .042, .016, -.1, 10)
    const blanket = new THREE.PlaneGeometry(.45, .43, 12, 10); blanket.rotateX(-Math.PI / 2)
    const bp = blanket.getAttribute('position')
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i) - .075, z = bp.getZ(i); bp.setXYZ(i, x, .762 + .279 * Math.exp(-(((x + .075) / .20) ** 2) - (z / .137) ** 2), z) }
    blanket.computeVertexNormals(); rug.side = THREE.DoubleSide; parts.add(blanket, rug)
    for (const x of [-.18, .05]) parts.tube(wood, [v(x, .76, -.175), v(x, .94, -.105), v(x, 1.047, 0), v(x, .94, .105), v(x, .76, .175)], .010, 18)
    for (const side of [-1, 1]) {
      if (camel === 1) {
        parts.box(wood, .29, .235, .14, -.075, .70, side * .237)
        for (const x of [-.18, .025]) parts.box(rope, .012, .247, .151, x, .70, side * .237)
        parts.box(rope, .302, .015, .151, -.075, .70, side * .237)
      } else {
        parts.ellipsoid(cloth, -.075, .697, side * .239, .148, .147, .080, .05 * side, 14)
        parts.ellipsoid(cloth, -.075, .842, side * .225, .045, .034, .040, 0, 10)
        parts.tube(rope, [v(-.12, .83, side * .23), v(-.075, .82, side * .267), v(-.03, .83, side * .23), v(-.075, .84, side * .19)], .004, 12, true)
      }
      parts.tube(rope, [v(-.075, .84, side * .239), v(-.12, .94, side * .12), v(-.18, 1.005, 0)], .0045, 14)
    }
    if (camel === 2) for (const z of [-.065, .065]) {
      const roll = new THREE.CylinderGeometry(.043, .043, .34, 14); roll.rotateZ(Math.PI / 2); roll.translate(-.065, 1.06, z); parts.add(roll, cloth)
      for (const x of [-.17, .04]) parts.tube(rope, [v(x, 1.06, z - .044), v(x, 1.104, z), v(x, 1.06, z + .044), v(x, 1.017, z)], .0035, 12, true)
    }
    parts.tube(rope, [v(.762, 1.12, -.034), v(.789, 1.087, -.039), v(.765, 1.052, 0), v(.789, 1.087, .039), v(.762, 1.12, .034)], .003, 18)
    parts.tube(rope, [v(.77, 1.09, .039), v(.61, 1.05, .058), v(.49, 1.09, .042)], .003, 14)
  })
  parts.frame.identity()
  for (let i = 0; i < offsets.length - 1; i++) {
    const follower = offsets[i]!, leader = offsets[i + 1]!
    const start = v(follower[0]! + .77 * scale, 1.09 * scale, follower[1]! + .039 * scale)
    const end = v(leader[0]! - .18 * scale, .95 * scale, leader[1]! + .12 * scale)
    parts.skin = (_x, _y, _z, u) => [i * 13, 1 - u, (i + 1) * 13, u]
    parts.tube(rope, [start, start.clone().lerp(end, .45).add(v(0, -.105, .025)), end], .0032, 18)
  }
  const group = parts.finish('dubai-loaded-dromedary-caravan')
  bindCamelAnimation(group, legs)
  return group
}

function basket(parts: Parts, wicker: THREE.Material, x: number, z: number, scale = 1): void {
  const points = [[0, 0], [.12, 0], [.155, .025], [.198, .20], [.20, .22], [.184, .22], [.168, .045], [.10, .016], [0, .016]].map(([r, y]) => new THREE.Vector2(r! * scale, y! * scale))
  const bowl = new THREE.LatheGeometry(points, 28); bowl.translate(x, 0, z); parts.add(bowl, wicker)
  for (const y of [.06, .115, .17, .223]) {
    const r = y > .21 ? .197 : .151 + y * .21
    const hoop = new THREE.TorusGeometry(r * scale, (y > .21 ? .006 : .0028) * scale, 5, 36); hoop.rotateX(Math.PI / 2); hoop.translate(x, y * scale, z); parts.add(hoop, wicker)
  }
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; parts.tube(wicker, [v(x + Math.cos(a) * .137 * scale, .016 * scale, z + Math.sin(a) * .137 * scale), v(x + Math.cos(a) * .173 * scale, .12 * scale, z + Math.sin(a) * .173 * scale), v(x + Math.cos(a) * .198 * scale, .22 * scale, z + Math.sin(a) * .198 * scale)], .0027 * scale, 12) }
}

function fish(parts: Parts, silver: THREE.Material, dark: THREE.Material, x: number, y: number, z: number, angle: number): void {
  const prior = parts.frame.clone(); parts.frame.multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(angle))
  parts.ellipsoid(silver, 0, 0, 0, .095, .018, .027, 0, 12)
  const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([-.08, 0, 0, -.145, 0, -.035, -.127, .001, 0, -.08, 0, 0, -.127, .001, 0, -.145, 0, .035], 3)); tail.computeVertexNormals(); parts.add(tail, silver)
  for (const side of [-1, 1]) parts.ellipsoid(dark, .067, .008, side * .018, .0032, .003, .0023, 0, 7)
  parts.frame.copy(prior)
}

export function createFishingGoods(): THREE.Group {
  const parts = new Parts(), wicker = material('#ab8c62', 'woven'), wood = material('#8a7051', 'wood'), net = material('#c1b394', 'net'), silver = material('#acbfc0', 'fish'), dark = material('#3e4a47')
  net.alphaTest = .42; net.side = THREE.DoubleSide; net.forceSinglePass = true
  silver.roughness = .42; silver.metalness = .18; silver.side = THREE.DoubleSide
  basket(parts, wicker, -.285, .185, .94); basket(parts, wicker, .18, .19, .86)
  for (let i = 0; i < 5; i++) { fish(parts, silver, dark, -.285 + (i % 2 - .5) * .075, .175 + i * .008, .13 + (i - 2) * .031, -.3 + i * .25); fish(parts, silver, dark, .18 + (i % 2 - .5) * .05, .16 + i * .007, .17 + (i - 2) * .029, .4 - i * .2) }
  for (const x of [-.48, .48]) parts.tapered(wood, [v(x, 0, -.23), v(x, .39, -.23)], [.012, .010], 1, 7)
  parts.tapered(wood, [v(-.50, .388, -.23), v(.50, .388, -.23)], [.012, .012], 1, 7)
  const hanging = new THREE.PlaneGeometry(.88, .33, 18, 8), hp = hanging.getAttribute('position')
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i) + .205; hp.setXYZ(i, x, y, -.225 + Math.sin((x + .44) / .88 * Math.PI) * .045 * (1 - y / .39)) }
  hanging.computeVertexNormals(); parts.add(hanging, net)
  for (let i = 0; i < 8; i++) parts.ellipsoid(wicker, -.41 + i * .117, .375, -.223, .022, .012, .012, 0, 8)
  const folded = new THREE.PlaneGeometry(.36, .30, 12, 10); folded.rotateX(-Math.PI / 2)
  const fp = folded.getAttribute('position')
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setXYZ(i, x + .36, .004 + Math.sin(x * 22) ** 2 * .025, z - .02) }
  folded.computeVertexNormals(); parts.add(folded, net)
  return parts.finish('dubai-fish-baskets-and-open-mesh-net')
}

function shellSurface(inner: boolean, upper: boolean, x: number, z: number, scale = 1): THREE.BufferGeometry {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [], rings = 7, sides = 36
  for (let row = 0; row <= rings; row++) for (let i = 0; i <= sides; i++) {
    const r = row / rings, angle = i / sides * Math.PI * 2, irregular = 1 + .055 * Math.sin(angle * 7) + .025 * Math.sin(angle * 11)
    const px = Math.cos(angle) * r * .070 * irregular, pz = Math.sin(angle) * r * .085 * irregular
    const py = inner ? .010 + .018 * r * r : .000 + .025 * r * r
    const point = v(px, upper ? .056 - py : py, pz)
    if (upper) point.sub(v(0, .028, -.085)).applyAxisAngle(v(1, 0, 0), -1.03).add(v(0, .028, -.085))
    point.multiplyScalar(scale); positions.push(point.x + x, point.y, point.z + z); uv.push(.5 + Math.cos(angle) * r * .5, .5 + Math.sin(angle) * r * .5)
    if (row < rings && i < sides) { const a = row * (sides + 1) + i, b = a + sides + 1; if (inner !== upper) indices.push(a, a + 1, b, a + 1, b + 1, b); else indices.push(a, b, a + 1, a + 1, b, b + 1) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g
}

export function createPearlingGoods(): THREE.Group {
  const parts = new Parts(), wicker = material('#ad926b', 'woven'), rope = material('#c0b298', 'woven'), shell = material('#a89e8c', 'shell'), inside = material('#e1dece'), stone = material('#827c70', 'shell')
  inside.roughness = .32; inside.metalness = .12; inside.side = THREE.DoubleSide; shell.side = THREE.DoubleSide
  const pearl = new THREE.MeshPhysicalMaterial({ color: '#eee9da', roughness: .19, metalness: .05, clearcoat: .45, envMapIntensity: 1.1 })
  basket(parts, wicker, -.24, 0, .88)
  for (let i = 0; i < 6; i++) { const x = -.24 + (i % 3 - 1) * .069, z = (Math.floor(i / 3) - .5) * .09; parts.ellipsoid(shell, x, .165 + hash(i, 3) * .019, z, .051, .015, .064, .15, 12) }
  const coil: THREE.Vector3[] = []
  for (let i = 0; i <= 110; i++) { const t = i / 110, a = t * Math.PI * 7, r = .032 + t * .078; coil.push(v(.135 + Math.cos(a) * r, .0065, -.115 + Math.sin(a) * r)) }
  parts.tube(rope, coil, .0045, 110)
  parts.ellipsoid(stone, .34, .027, -.12, .048, .025, .066, -.12, 12)
  const weightRope = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([coil[coil.length - 1]!, v(.27, .009, -.16), v(.34, .052, -.12), v(.35, .009, -.05)]), 20, .004, 5, false)
  const weightRopePositions = weightRope.getAttribute('position')
  for (let i = 0; i < weightRopePositions.count; i++) weightRopePositions.setY(i, Math.max(.001, weightRopePositions.getY(i)))
  weightRope.computeVertexNormals(); parts.add(weightRope, rope)
  const sx = .20, sz = .15
  for (const upper of [false, true]) { parts.add(shellSurface(false, upper, sx, sz, 1.25), shell); parts.add(shellSurface(true, upper, sx, sz, 1.25), inside) }
  parts.ellipsoid(shell, sx, .031, sz - .110, .022, .012, .014, 0, 10)
  parts.ellipsoid(pearl, sx + .008, .027, sz + .011, .014, .014, .014, 0, 14)
  parts.ellipsoid(shell, .40, .016, .145, .050, .015, .065, .08, 12)
  return parts.finish('dubai-pearl-diving-basket-rope-and-open-oyster')
}

/** Convenience preview arrangement; scenes should place the three modules independently. */
export function createDubaiLivelihood(): THREE.Group {
  const group = new THREE.Group(); group.name = 'dubai-early-livelihoods'
  const caravan = createCamelCaravan(), fishing = createFishingGoods(), pearling = createPearlingGoods()
  caravan.position.set(0, 0, -.55); fishing.position.set(-1.15, 0, .60); pearling.position.set(.40, 0, .65)
  group.add(caravan, fishing, pearling); return group
}
