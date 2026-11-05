import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type VisitorWaypoint = readonly [number, number]
export interface VisitorRoutes {
  original: readonly VisitorWaypoint[]
  guided: readonly (readonly VisitorWaypoint[])[]
}
type Track = { points: VisitorWaypoint[]; lengths: number[]; total: number }
type Crossing = { x: number; z: number; radius: number; owner: number | null; entered: boolean }
type Walker = { track: Track; distance: number; phase: number; x: number; z: number; heading: number; ground: number; size: number; moving: boolean }
type Ring = readonly [y: number, width: number, depth: number]

/** Ten adult visitors, instanced by anatomical part. All parts and textures belong to this group. */
export function createVisitors(heightAt: (x: number, z: number) => number, routes?: VisitorRoutes) {
  const group = new THREE.Group(); group.name = 'ten-articulated-visitors'; group.visible = false
  const fallback: VisitorWaypoint[] = [[0, 23], [0, 12], [0, 3], [-2.8, 1.4], [-5.8, 1.4], [-5.8, -.4], [-5.8, 1.4], [-2.8, 1.4], [0, 3], [.3, -26.5], [0, 3], [0, 23]]
  const fallbackGuided: VisitorWaypoint[][] = [
    [[-.55, 23], [-.55, 12], [-2.8, 8], [-2.8, 1.4], [-5.8, 1.4], [-5.8, -.4], [-5.8, 1.4], [-2.8, 1.4], [-2.8, 8], [-.55, 12], [-.55, 23]],
    [[.55, 23], [.55, 12], [5.2, 11], [5.2, 9], [9.1, 9], [9.1, -12], [5.1, -12], [.8, -9], [.8, 7], [.55, 12], [.55, 23]],
    [[0, 23], [0, 12], [.7, 5], [.5, -7], [.25, -26.5], [.75, -26.5], [.75, -9], [.7, 5], [0, 12], [0, 23]],
  ]
  function cleanRoute(input: readonly VisitorWaypoint[]): VisitorWaypoint[] {
    const points: VisitorWaypoint[] = []
    for (const p of input) {
      const previous = points[points.length - 1]
      if (Number.isFinite(p[0]) && Number.isFinite(p[1]) && (!previous || Math.hypot(previous[0] - p[0], previous[1] - p[1]) > .01)) points.push([p[0], p[1]])
    }
    if (points.length < 2) return [...fallback]
    const first = points[0]!, last = points[points.length - 1]!
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > .01) points.push(first)
    return points
  }
  // All route coordinates already use world metres. Anatomical sizes and the
  // spacing below are deliberately independent of the landscape's XZ scale.
  const MIN_SPACING = 1.12, ENTRY_SPACING = 1.65, LANE_OFFSET = .66
  const originalCenter = cleanRoute(routes?.original ?? fallback)
  function makeTrack(input: readonly VisitorWaypoint[]): Track {
    const route = cleanRoute(input), count = route.length - 1, points: VisitorWaypoint[] = []
    for (let i = 0; i < count; i++) {
      const previous = route[(i + count - 1) % count]!, current = route[i]!, next = route[(i + 1) % count]!
      const incomingLength = Math.hypot(current[0] - previous[0], current[1] - previous[1]), outgoingLength = Math.hypot(next[0] - current[0], next[1] - current[1])
      const ux = (current[0] - previous[0]) / incomingLength, uz = (current[1] - previous[1]) / incomingLength
      const vx = (next[0] - current[0]) / outgoingLength, vz = (next[1] - current[1]) / outgoingLength
      const dot = ux * vx + uz * vz
      const centreHeight = heightAt(current[0], current[1])
      function lanePoint(x: number, z: number): void {
        // At a terrace edge the lane may narrow, but it must not step sideways
        // onto the next retaining wall. Ordinary stair treads remain allowed.
        for (const amount of [1, .75, .5, .25, 0]) {
          const px = current[0] + (x - current[0]) * amount, pz = current[1] + (z - current[1]) * amount
          const floor = heightAt(px, pz)
          if (amount === 0 || Number.isFinite(floor) && Math.abs(floor - centreHeight) <= .36) { points.push([px, pz]); break }
        }
      }
      if (dot < -.94) {
        // A small turning arc joins opposite lanes at an out-and-back endpoint.
        // It prevents an instantaneous lane jump or a head-on route reversal.
        const from = Math.atan2(-ux, uz), to = Math.atan2(-vx, vz)
        let turn = Math.atan2(Math.sin(to - from), Math.cos(to - from))
        if (Math.abs(Math.abs(turn) - Math.PI) < .02) turn = Math.PI
        const steps = Math.ceil(Math.abs(turn) / (Math.PI / 12))
        for (let step = 0; step <= steps; step++) {
          const angle = from + turn * step / steps
          lanePoint(current[0] + Math.cos(angle) * LANE_OFFSET, current[1] + Math.sin(angle) * LANE_OFFSET)
        }
      } else {
        const nx = uz + vz, nz = -ux - vx, length = Math.max(.001, Math.hypot(nx, nz))
        const distance = Math.min(.94, LANE_OFFSET / Math.max(.35, (nx * uz - nz * ux) / length))
        lanePoint(current[0] + nx / length * distance, current[1] + nz / length * distance)
      }
    }
    const offset = cleanRoute(points), refined: VisitorWaypoint[] = []
    function append(point: VisitorWaypoint): void {
      const a = refined[refined.length - 2], b = refined[refined.length - 1]
      if (a && b && Math.abs((b[0] - a[0]) * (point[1] - b[1]) - (b[1] - a[1]) * (point[0] - b[0])) < 1e-8) refined.pop()
      refined.push(point)
    }
    for (let i = 0; i < offset.length - 1; i++) {
      const a = offset[i]!, b = offset[i + 1]!, steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .60))
      for (let step = 0; step < steps; step++) {
        const t = step / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t
        let closestX = x, closestZ = z, closest = Infinity
        for (let j = 0; j < route.length - 1; j++) {
          const p = route[j]!, q = route[j + 1]!, dx = q[0] - p[0], dz = q[1] - p[1]
          const along = THREE.MathUtils.clamp(((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz), 0, 1)
          const px = p[0] + dx * along, pz = p[1] + dz * along, distance = Math.hypot(x - px, z - pz)
          if (distance < closest) { closest = distance; closestX = px; closestZ = pz }
        }
        const reference = heightAt(closestX, closestZ), floor = heightAt(x, z)
        if (Number.isFinite(reference) && (!Number.isFinite(floor) || Math.abs(floor - reference) > .36)) {
          for (const amount of [.75, .5, .25, 0]) {
            const px = closestX + (x - closestX) * amount, pz = closestZ + (z - closestZ) * amount, adjusted = heightAt(px, pz)
            if (amount === 0 || Number.isFinite(adjusted) && Math.abs(adjusted - reference) <= .36) { append([px, pz]); break }
          }
        } else append([x, z])
      }
    }
    const closed = cleanRoute(refined), lengths: number[] = []
    for (let i = 0; i < closed.length - 1; i++) lengths.push(Math.hypot(closed[i + 1]![0] - closed[i]![0], closed[i + 1]![1] - closed[i]![1]))
    return { points: closed, lengths, total: lengths.reduce((sum, length) => sum + length, 0) }
  }
  const original = makeTrack(originalCenter)
  const guided = (routes?.guided.length ? routes.guided : fallbackGuided).map(makeTrack)
  function sample(track: Track, distance: number) {
    let remaining = Math.max(0, distance) % track.total, segment = 0
    while (segment < track.lengths.length - 1 && remaining > track.lengths[segment]!) remaining -= track.lengths[segment++]!
    const a = track.points[segment]!, b = track.points[segment + 1]!, length = track.lengths[segment]!, t = remaining / length
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) }
  }
  function crossingsFor(tracks: Track[]): Crossing[] {
    const segments = tracks.flatMap((track, route) => track.points.slice(0, -1).map((a, index) => ({ a, b: track.points[index + 1]!, route, index, count: track.lengths.length })))
    const crossings: Crossing[] = []
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i]!, b = segments[j]!
      if (a.route === b.route && (Math.abs(a.index - b.index) <= 1 || Math.abs(a.index - b.index) === a.count - 1)) continue
      const ax = a.b[0] - a.a[0], az = a.b[1] - a.a[1], bx = b.b[0] - b.a[0], bz = b.b[1] - b.a[1], cross = ax * bz - az * bx
      if (Math.abs(cross) < .0001) continue
      const dx = b.a[0] - a.a[0], dz = b.a[1] - a.a[1], t = (dx * bz - dz * bx) / cross, u = (dx * az - dz * ax) / cross
      if (t < -.001 || t > 1.001 || u < -.001 || u > 1.001) continue
      const x = a.a[0] + ax * t, z = a.a[1] + az * t
      if (!crossings.some(gate => Math.hypot(gate.x - x, gate.z - z) < .25)) crossings.push({ x, z, radius: 1.65, owner: null, entered: false })
    }
    // Nearby branches form one junction, preventing competing reservations in
    // overlapping pieces of the same small turning area.
    let merged = true
    while (merged) {
      merged = false
      for (let i = 0; i < crossings.length && !merged; i++) for (let j = i + 1; j < crossings.length; j++) {
        const a = crossings[i]!, b = crossings[j]!, distance = Math.hypot(a.x - b.x, a.z - b.z)
        if (distance >= a.radius + b.radius + .6) continue
        if (a.radius >= distance + b.radius) { crossings.splice(j, 1); merged = true; break }
        if (b.radius >= distance + a.radius) { crossings[i] = b; crossings.splice(j, 1); merged = true; break }
        const radius = (distance + a.radius + b.radius) / 2, shift = (radius - a.radius) / Math.max(.0001, distance)
        a.x += (b.x - a.x) * shift; a.z += (b.z - a.z) * shift; a.radius = radius
        crossings.splice(j, 1); merged = true; break
      }
    }
    return crossings
  }
  function profile(rings: readonly Ring[], segments = 12): THREE.BufferGeometry {
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    rings.forEach(([y, width, depth], row) => {
      for (let side = 0; side <= segments; side++) {
        const angle = side / segments * Math.PI * 2
        positions.push(Math.cos(angle) * width, y, Math.sin(angle) * depth); uvs.push(side / segments, row / (rings.length - 1))
      }
    })
    for (let row = 0; row < rings.length - 1; row++) for (let side = 0; side < segments; side++) {
      const a = row * (segments + 1) + side, b = a + segments + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); result.setIndex(indices); result.computeVertexNormals()
    return result
  }
  function ellipsoid(x: number, y: number, z: number, sx: number, sy: number, sz: number, width = 12, height = 8): THREE.BufferGeometry {
    return new THREE.SphereGeometry(1, width, height).scale(sx, sy, sz).translate(x, y, z)
  }
  function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const geometry = mergeGeometries(parts, false)!
    parts.forEach(part => part.dispose()); return geometry
  }
  const clothData = new Uint8Array(32 * 32 * 4)
  for (let i = 0; i < 32 * 32; i++) { const value = 230 + ((i * 71 + Math.floor(i / 32) * 13) % 23); clothData[i * 4] = clothData[i * 4 + 1] = clothData[i * 4 + 2] = value; clothData[i * 4 + 3] = 255 }
  const weave = new THREE.DataTexture(clothData, 32, 32); weave.colorSpace = THREE.SRGBColorSpace; weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(5, 5); weave.generateMipmaps = true; weave.minFilter = THREE.LinearMipmapLinearFilter; weave.needsUpdate = true
  const skin = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .86 })
  const cloth = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, map: weave })
  const trouser = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .98, map: weave })
  const dark = new THREE.MeshStandardMaterial({ color: '#312d29', roughness: .94 })
  const pack = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .98, map: weave })
  const hatMaterial = new THREE.MeshStandardMaterial({ color: '#c6b595', roughness: 1 })
  const meshes: THREE.InstancedMesh[] = []
  function batch(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.name = name
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); meshes.push(mesh); group.add(mesh); return mesh
  }
  const headShape = profile([[-.115, 0, 0], [-.10, .048, .055], [-.065, .075, .071], [.018, .091, .088], [.080, .080, .074], [.112, .038, .038], [.120, 0, 0]])
  const neck = new THREE.CylinderGeometry(.043, .047, .105, 10).translate(0, -.139, -.005)
  const nose = new THREE.ConeGeometry(.021, .043, 5).rotateX(Math.PI / 2).translate(0, -.008, .096)
  const heads = batch('visitor-head-neck-nose-ears', merged([headShape, neck, nose, ellipsoid(-.091, -.006, -.006, .018, .030, .021, 8, 6), ellipsoid(.091, -.006, -.006, .018, .030, .021, 8, 6)]), skin, 10)
  const hair = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI * .58).scale(.094, .124, .091).translate(0, .006, -.008)
  const details = batch('visitor-hair-eyes', merged([hair, ellipsoid(-.031, .022, .079, .010, .005, .006, 6, 4), ellipsoid(.031, .022, .079, .010, .005, .006, 6, 4)]), dark, 10)
  const hatCrown = profile([[0, .095, .090], [.055, .094, .087], [.072, .073, .069], [.076, 0, 0]]).translate(0, .085, -.008)
  const hatBrim = new THREE.CylinderGeometry(.15, .15, .009, 16).scale(1, 1, .84).translate(0, .085, .012)
  const hats = batch('visitor-sun-hats', merged([hatCrown, hatBrim]), hatMaterial, 10)
  const torsos = batch('visitor-shirt-shaped-torso', profile([[-.22, 0, 0], [-.215, .142, .092], [-.10, .148, .096], [.10, .197, .115], [.20, .195, .103], [.247, .095, .066], [.25, 0, 0]]), cloth, 10)
  const pelvis = batch('visitor-trouser-pelvis', profile([[-.12, 0, 0], [-.10, .142, .088], [.08, .15, .097], [.105, .14, .089], [.11, 0, 0]]), trouser, 10)
  const sleeves = batch('visitor-shirt-sleeves', profile([[-.53, 0, 0], [-.51, .060, .059], [-.05, .078, .076], [.38, .080, .078], [.52, .045, .045], [.54, 0, 0]], 10), cloth, 20)
  const forearms = batch('visitor-forearms', profile([[-.53, 0, 0], [-.50, .034, .032], [.10, .049, .046], [.49, .050, .047], [.53, 0, 0]], 10), skin, 20)
  const hands = batch('visitor-palms-fingers', ellipsoid(0, 0, 0, .038, .058, .025, 9, 6), skin, 20)
  const thighs = batch('visitor-trouser-thighs', profile([[-.53, 0, 0], [-.51, .066, .069], [.02, .089, .092], [.50, .101, .098], [.53, 0, 0]], 10), trouser, 20)
  const calves = batch('visitor-trouser-calves', profile([[-.53, 0, 0], [-.50, .043, .047], [-.20, .055, .060], [.18, .071, .074], [.50, .066, .069], [.53, 0, 0]], 10), trouser, 20)
  const shoes = batch('visitor-walking-shoes', merged([ellipsoid(0, .062, .038, .070, .058, .136, 12, 6), new THREE.BoxGeometry(.132, .025, .234).translate(0, .014, .032)]), dark, 20)
  const bagShape = profile([[-.192, 0, 0], [-.18, .10, .053], [-.11, .139, .075], [.10, .13, .069], [.18, .09, .047], [.19, 0, 0]]).translate(0, .015, -.176)
  const pocket = ellipsoid(0, -.040, -.233, .099, .107, .033, 10, 6)
  const bags = batch('visitor-fitted-backpacks', merged([bagShape, pocket]), pack, 10)
  const strapsGeometry: THREE.BufferGeometry[] = []
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(side * .105, -.12, -.174), new THREE.Vector3(side * .125, .20, -.12), new THREE.Vector3(side * .125, .25, .005), new THREE.Vector3(side * .123, .16, .109), new THREE.Vector3(side * .112, -.12, .094)])
    strapsGeometry.push(new THREE.TubeGeometry(curve, 12, .013, 5, false))
  }
  const straps = batch('visitor-backpack-shoulder-straps', merged(strapsGeometry), dark, 10)
  const shirtColors = ['#817e64', '#4d787d', '#b08a66', '#68778d', '#9a6b62']
  const trouserColors = ['#4f5557', '#656452', '#535d69', '#6d6455']
  const skinColors = ['#c89d7c', '#a77857', '#d0aa8d', '#b88765', '#93684d']
  for (let i = 0; i < 10; i++) {
    const shirt = new THREE.Color(shirtColors[i % shirtColors.length]!), pants = new THREE.Color(trouserColors[i % trouserColors.length]!), complexion = new THREE.Color(skinColors[i % skinColors.length]!)
    torsos.setColorAt(i, shirt); pelvis.setColorAt(i, pants); heads.setColorAt(i, complexion)
    bags.setColorAt(i, new THREE.Color(i % 2 ? '#67705b' : '#8a694b'))
    for (let side = 0; side < 2; side++) {
      sleeves.setColorAt(i * 2 + side, shirt); thighs.setColorAt(i * 2 + side, pants); calves.setColorAt(i * 2 + side, pants)
      forearms.setColorAt(i * 2 + side, complexion); hands.setColorAt(i * 2 + side, complexion)
    }
  }
  let plan: 'original' | 'guided' = 'original', playing = false, crossings: Crossing[] = []
  const walkers: Walker[] = Array.from({ length: 10 }, (_, i) => ({ track: original, distance: -i * ENTRY_SPACING, phase: i * 1.7, x: 0, z: 0, heading: 0, ground: 0, size: .965 + i % 5 * .017, moving: false }))
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), facing = new THREE.Quaternion()
  const position = new THREE.Vector3(), scale = new THREE.Vector3(), direction = new THREE.Vector3()
  const axisY = new THREE.Vector3(0, 1, 0), localRotation = new THREE.Quaternion()
  function point(walker: Walker, x: number, y: number, z: number): void {
    const c = Math.cos(walker.heading), s = Math.sin(walker.heading), size = walker.size
    position.set(walker.x + (x * c + z * s) * size, walker.ground + y * size, walker.z + (-x * s + z * c) * size)
  }
  function part(mesh: THREE.InstancedMesh, index: number, walker: Walker, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, visible = true): void {
    point(walker, x, y, z); quaternion.setFromAxisAngle(axisY, walker.heading)
    const size = visible && walker.distance >= 0 ? walker.size : 0
    scale.set(sx * size, sy * size, sz * size); matrix.compose(position, quaternion, scale); mesh.setMatrixAt(index, matrix)
  }
  function segment(mesh: THREE.InstancedMesh, index: number, walker: Walker, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    point(walker, (ax + bx) * .5, (ay + by) * .5, (az + bz) * .5)
    direction.set(ax - bx, ay - by, az - bz); const length = direction.length(); direction.multiplyScalar(1 / Math.max(length, .0001))
    localRotation.setFromUnitVectors(axisY, direction); facing.setFromAxisAngle(axisY, walker.heading); quaternion.copy(facing).multiply(localRotation)
    const size = walker.distance >= 0 ? walker.size : 0
    scale.set(size, length * size, size); matrix.compose(position, quaternion, scale); mesh.setMatrixAt(index, matrix)
  }
  function footHeight(walker: Walker, x: number, z: number): number {
    const c = Math.cos(walker.heading), s = Math.sin(walker.heading)
    let highest = -Infinity
    for (const ox of [-.072, .072]) for (const oz of [-.14, .15]) {
      const h = heightAt(walker.x + ((x + ox) * c + (z + oz) * s) * walker.size, walker.z + (-(x + ox) * s + (z + oz) * c) * walker.size)
      if (Number.isFinite(h)) highest = Math.max(highest, h)
    }
    return Number.isFinite(highest) ? (highest - walker.ground) / walker.size : 0
  }
  function render(): void {
    walkers.forEach((walker, i) => {
      const h = heightAt(walker.x, walker.z); walker.ground = Number.isFinite(h) ? h : 0
      const phase = walker.phase, moving = playing && walker.distance >= 0 && walker.moving
      const bob = moving ? Math.cos(phase * 2) * .009 : 0, body = 1.17 + bob
      part(heads, i, walker, 0, 1.575 + bob, .012)
      part(details, i, walker, 0, 1.575 + bob, .012)
      part(hats, i, walker, 0, 1.575 + bob, .012, 1, 1, 1, i % 3 !== 1)
      part(torsos, i, walker, 0, body, 0)
      part(pelvis, i, walker, 0, .941 + bob, 0)
      part(bags, i, walker, 0, body, 0); part(straps, i, walker, 0, body, 0)
      for (const side of [-1, 1]) {
        const n = i * 2 + (side > 0 ? 1 : 0), legPhase = phase + (side > 0 ? Math.PI : 0)
        const forward = moving ? -Math.cos(legPhase) * .26 : 0
        const lift = moving ? Math.max(0, Math.sin(legPhase)) * .078 : 0
        const footX = side * .101, footY = footHeight(walker, footX, forward + .03) + lift
        const hipY = .921 + bob, ankleY = footY + .092, dy = ankleY - hipY, dz = forward
        const distance = Math.max(.001, Math.hypot(dy, dz)), stretch = Math.max(1, distance / .832)
        const upper = .417 * stretch, lower = .423 * stretch
        const along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
        const bend = Math.sqrt(Math.max(.0001, upper * upper - along * along))
        const kneeY = hipY + dy * along / distance + dz * bend / distance
        const kneeZ = dz * along / distance - dy * bend / distance
        segment(thighs, n, walker, side * .099, hipY, 0, footX, kneeY, kneeZ)
        segment(calves, n, walker, footX, kneeY, kneeZ, footX, ankleY, forward)
        part(shoes, n, walker, footX, footY, forward)
        const swing = moving ? Math.cos(legPhase) * .14 : .015
        const shoulderX = side * .205, shoulderY = 1.377 + bob
        const elbowX = side * .234, elbowY = 1.122 + bob, elbowZ = swing - .015
        const wristX = side * .231, wristY = .888 + bob, wristZ = swing * .70 + .103
        segment(sleeves, n, walker, shoulderX, shoulderY, 0, elbowX, elbowY, elbowZ)
        segment(forearms, n, walker, elbowX, elbowY, elbowZ, wristX, wristY, wristZ)
        part(hands, n, walker, wristX, wristY - .035, wristZ + .008)
      }
    })
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true
  }
  function reset(): void {
    crossings = crossingsFor(plan === 'original' ? [original] : guided)
    walkers.forEach((walker, i) => {
      walker.track = plan === 'original' ? original : guided[i % guided.length]!
      walker.distance = -i * ENTRY_SPACING; walker.phase = i * 1.7; walker.moving = false
      const point = sample(walker.track, 0)
      walker.x = point.x; walker.z = point.z; walker.heading = point.heading
    })
    group.visible = playing; render()
  }
  // Relative swept distance checks the entire small step, not only its end.
  function sweptDistance(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): number {
    const rx = ax - cx, rz = az - cz, vx = (bx - ax) - (dx - cx), vz = (bz - az) - (dz - cz)
    const t = THREE.MathUtils.clamp(-(rx * vx + rz * vz) / Math.max(1e-12, vx * vx + vz * vz), 0, 1)
    return Math.hypot(rx + vx * t, rz + vz * t)
  }
  function speed(walker: Walker, index: number): number {
    const junction = originalCenter[Math.min(2, originalCenter.length - 1)]!
    const slow = plan === 'original' && Math.hypot(walker.x - junction[0], walker.z - junction[1]) < 2.2 ? .38 : 1
    return (.66 + index % 3 * .035) * slow
  }
  function step(dt: number): void {
    const starts = walkers.map(walker => ({ x: walker.x, z: walker.z, active: walker.distance >= 0 }))
    const speeds = walkers.map(speed), proposed = walkers.map((walker, i) => sample(walker.track, walker.distance + speeds[i]! * dt))
    const yieldTo = walkers.map(() => false)
    // A crossing keeps its current visitor until they have exited. Reserving
    // before entry leaves a clear centre and prevents reciprocal deadlocks.
    for (const gate of crossings) {
      if (gate.owner !== null) {
        const owner = walkers[gate.owner]!, distance = Math.hypot(owner.x - gate.x, owner.z - gate.z)
        if (distance < gate.radius + MIN_SPACING) gate.entered = true
        if (gate.entered && distance > gate.radius + MIN_SPACING * 2) { gate.owner = null; gate.entered = false }
      }
      if (gate.owner === null) {
        let closest = Infinity
        walkers.forEach((walker, i) => {
          if (walker.distance < 0) return
          for (let ahead = 0; ahead <= 4; ahead += .25) {
            const p = sample(walker.track, walker.distance + ahead)
            if (Math.hypot(p.x - gate.x, p.z - gate.z) < gate.radius + MIN_SPACING) { if (ahead < closest) { closest = ahead; gate.owner = i }; break }
          }
        })
      }
      if (gate.owner === null) continue
      proposed.forEach((point, i) => { if (i !== gate.owner && Math.hypot(point.x - gate.x, point.z - gate.z) < gate.radius + MIN_SPACING) yieldTo[i] = true })
    }
    // Within each lane, brake before catching the visitor ahead. Crossings use
    // the reservations above rather than changing priority at every frame.
    for (let i = 0; i < walkers.length; i++) for (let j = i + 1; j < walkers.length; j++) {
      const a = walkers[i]!, b = walkers[j]!
      if (a.distance < 0 || b.distance < 0) continue
      let previousA = starts[i]!, previousB = starts[j]!, conflict = false
      for (let horizon = .4; horizon <= 3.201; horizon += .4) {
        const nextA = sample(a.track, a.distance + speeds[i]! * horizon), nextB = sample(b.track, b.distance + speeds[j]! * horizon)
        if (sweptDistance(previousA.x, previousA.z, nextA.x, nextA.z, previousB.x, previousB.z, nextB.x, nextB.z) < MIN_SPACING + .04) { conflict = true; break }
        previousA = { ...nextA, active: true }; previousB = { ...nextB, active: true }
      }
      if (!conflict) continue
      const nextA = sample(a.track, a.distance + .5), nextB = sample(b.track, b.distance + .5)
      const ax = nextA.x - a.x, az = nextA.z - a.z, bx = nextB.x - b.x, bz = nextB.z - b.z
      const sameDirection = (ax * bx + az * bz) / Math.max(.0001, Math.hypot(ax, az) * Math.hypot(bx, bz)) > .72
      if (sameDirection) yieldTo[(b.x - a.x) * ax + (b.z - a.z) * az > 0 ? i : j] = true
    }
    const accepted = starts.map(start => ({ x: start.x, z: start.z }))
    walkers.forEach((walker, i) => {
      walker.moving = false
      const distance = walker.distance + speeds[i]! * dt
      if (distance < 0) { walker.distance = distance; return }
      const next = proposed[i]!, entering = !starts[i]!.active
      if (yieldTo[i]) return
      for (let j = 0; j < walkers.length; j++) {
        if (j === i || !starts[j]!.active && walkers[j]!.distance < 0) continue
        const other = accepted[j]!, from = starts[j]!
        const clearance = entering ? Math.hypot(next.x - other.x, next.z - other.z) : sweptDistance(walker.x, walker.z, next.x, next.z, from.x, from.z, other.x, other.z)
        if (clearance < MIN_SPACING) return
      }
      const travelled = entering ? 0 : speeds[i]! * dt
      walker.distance = distance % walker.track.total; walker.phase += travelled * Math.PI / .52
      walker.x = next.x; walker.z = next.z; walker.moving = travelled > .00001
      const angle = Math.atan2(Math.sin(next.heading - walker.heading), Math.cos(next.heading - walker.heading))
      walker.heading += angle * Math.min(1, dt * 9)
      accepted[i] = { x: next.x, z: next.z }
    })
  }
  reset(); group.userData.routes = { original: original.points, guided: guided.map(track => track.points) }
  group.userData.minimumVisitorSpacing = MIN_SPACING
  group.userData.adultHeights = walkers.map(walker => 1.736 * walker.size)
  return {
    group,
    setPlan(value: 'original' | 'guided') { plan = value; reset() },
    setPlaying(value: boolean) { playing = value; group.visible = value; render() },
    reset,
    update(_time: number, delta: number) {
      if (!playing) return
      let remaining = Math.min(.16, Math.max(0, Number.isFinite(delta) ? delta : 0))
      while (remaining > .000001) { const dt = Math.min(1 / 30, remaining); step(dt); remaining -= dt }
      render()
    },
  }
}

