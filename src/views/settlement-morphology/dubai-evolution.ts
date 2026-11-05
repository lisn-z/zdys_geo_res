import * as THREE from 'three'
import { createOldTownBuilding, createModernBuilding, createDubaiLandmark, createDhow, createMarketStall } from './dubai-architecture'
import { createCamelCaravan, createFishingGoods, createPearlingGoods, updateCamelCaravan, resetCamelCaravan } from './dubai-livelihood'
import { createFishingNetAnimation } from './dubai-livelihood-animation'
import { createSailHotel } from './dubai-sail-hotel'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

type Ground = { heightAt(x: number, z: number): number; shoreline(x: number, z: number): number; waterLevel: number }
type Label = { id: string; text: string; position: THREE.Vector3 }
type Building = {
  object: THREE.Group; start: number; end: number; base: number; height: number
  x: number; z: number; angle: number; width: number; depth: number
  foundationBottom: number; cut: { value: number }; frame?: THREE.LineSegments; slab?: THREE.Mesh
}
type Path = {
  mesh: THREE.Mesh; points: THREE.Vector3[]; width: number; start: number; end: number; segments: number
  lift: number; drawEnds: number[]; bed?: THREE.Mesh
}
type Ship = { object: THREE.Group; x: number; z: number; angle: number; size: number; start: number; end: number; phase: number; emergence: number }
const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n) }
const phase = (value: number, start: number, end: number) => THREE.MathUtils.smoothstep(value, start, end)
const channelZ = (x: number) => 4.9 + Math.sin(x * .19) * .6

/**
 * One persistent town grows on an explicitly schematic site. Every construction
 * state comes from progress, including foundations, buildings, roads and docks.
 * Clock time only supplies a small movement to the boats.
 */
export function createDubaiEvolution(ground: Ground): {
  group: THREE.Group; labels: Label[]; setGrowth(value: number): void; update(time: number): void; dispose(): void
} {
  const group = new THREE.Group()
  group.name = 'dubai-persistent-port-and-new-city'
  const buildings: Building[] = []
  const paths: Path[] = []
  const ships: Ship[] = []
  const urbanBatches: { mesh: THREE.InstancedMesh; units: number; perUnit: number; start: number; end: number }[] = []
  const activityFootprints: { x: number; z: number; angle: number; width: number; depth: number }[] = []
  let conformCaravan: (() => void) | undefined
  const depthMaterials = new Set<THREE.Material>()
  const foundationMaterial = new THREE.MeshStandardMaterial({ color: '#b7ab91', roughness: .94 })
  const trackMaterial = new THREE.MeshStandardMaterial({ color: '#ad9978', roughness: 1 })
  const quayMaterial = new THREE.MeshStandardMaterial({ color: '#bfb7a4', roughness: .91 })
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#85877f', roughness: .96 })
  const laneMaterial = new THREE.MeshStandardMaterial({ color: '#d0c7ae', roughness: .85 })
  const timberMaterial = new THREE.MeshStandardMaterial({ color: '#74624b', roughness: .91 })
  const frameMaterial = new THREE.LineBasicMaterial({ color: '#9c8c73', transparent: true, opacity: .68, depthWrite: false })
  const slabMaterial = new THREE.MeshStandardMaterial({ color: '#b8b1a2', roughness: .92 })
  const reserved: { x: number; z: number; radius: number }[] = [{ x: 1.2, z: -1.35, radius: 2.65 }]
  const constructionLayer = new THREE.Group()
  constructionLayer.name = 'progress-driven-construction'
  group.add(constructionLayer)

  function addPath(name: string, controls: [number, number][], width: number, start: number, end: number, material: THREE.Material, lift: number): Path {
    const curve = new THREE.CatmullRomCurve3(controls.map(([x, z]) => new THREE.Vector3(x, 0, z)))
    const segments = Math.max(12, Math.ceil(curve.getLength() / .14))
    const points = curve.getPoints(segments)
    const vertices: number[] = [], indices: number[] = []
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)]!, after = points[Math.min(points.length - 1, index + 1)]!
      const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1
      for (const side of [-1, 1]) {
        const x = point.x - dz / length * width / 2 * side, z = point.z + dx / length * width / 2 * side
        vertices.push(x, ground.heightAt(x, z) + lift, z)
      }
      if (index < segments) indices.push(index * 2, index * 2 + 1, index * 2 + 2, index * 2 + 1, index * 2 + 3, index * 2 + 2)
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name; mesh.receiveShadow = true
    mesh.userData.evolution = { kind: 'path', start, end, totalIndices: indices.length, surfaceClearance: lift }
    group.add(mesh)
    const path: Path = { mesh, points, width, start, end, segments, lift, drawEnds: Array.from({ length: segments + 1 }, (_, index) => index * 6) }
    paths.push(path)
    return path
  }
  const northBank: [number, number][] = [], southBank: [number, number][] = []
  for (let x = -16; x <= -5; x += .5) {
    northBank.push([x, channelZ(x) - 1.95])
    if (x <= -6.5) southBank.push([x, channelZ(x) + 2.05])
  }
  // A connected hierarchy: one bank lane, a short town-edge street, then the new
  // district boulevard. The asphalt never cuts diagonally through the old quarter.
  const bank = addPath('old-port-north-bank-track', northBank, .42, -.2, -.01, trackMaterial, .032)
  addPath('old-port-south-bank-track', southBank, .42, .13, .36, trackMaterial, .032)
  const townStreet = addPath('town-edge-sand-street', [[-5, channelZ(-5) - 1.95], [-5.3, .9], [-5.6, -1.5], [-4.9, -3.8], [-3.5, -5.2]], .42, .10, .38, trackMaterial, .032)
  const marketLane = addPath('old-town-winding-market-lane', [[-5.3, .9], [-6.8, .9], [-9.1, .15], [-12.1, -.2], [-15, -.9]], .42, .21, .50, trackMaterial, .032)
  const connection = addPath('transport-connection-to-new-district', [[-3.5, -5.2], [-2.1, -5.35], [-.4, -5.3]], .75, .52, .66, roadMaterial, .084)
  const avenueControls: [number, number][] = [[-.4, -5.3], [5, -5.2], [10, -2.9], [13, 1.4], [13.5, 8.8]]
  const avenue = addPath('modern-district-curving-boulevard', avenueControls, 1.0, .66, .85, roadMaterial, .084)
  const marking = addPath('modern-boulevard-centre-marking', avenueControls, .035, .70, .92, laneMaterial, .100)
  const coastWalk: [number, number][] = [[-5, channelZ(-5) - 1.95]]
  for (let index = 0; index <= 32; index++) {
    const angle = Math.PI + .8 + index / 32 * (Math.PI - .8)
    coastWalk.push([1.7 + Math.cos(angle) * 7.03, 4.7 + Math.sin(angle) * 3.85])
  }
  for (let z = 5.2; z <= 11.2; z += .5) coastWalk.push([8.75 + (z - 4.7) * .16, z])
  const promenade = addPath('new-city-coastal-promenade', coastWalk, .5, .68, .94, quayMaterial, .032)

  // Joined sections share the same end vertices. The approach gradually changes
  // width and roadbed height before entering the next street.
  function joinPaths(first: Path, second: Path): void {
    const before = first.points[first.segments - 1]!, after = second.points[1]!
    const direction = new THREE.Vector3().subVectors(after, before).normalize()
    for (const path of [first, second]) {
      const position = path.mesh.geometry.getAttribute('position')
      for (let offset = 0; offset <= 5; offset++) {
        const index = path === first ? path.segments - offset : offset
        const point = path.points[index]!, prior = path.points[Math.max(0, index - 1)]!, next = path.points[Math.min(path.segments, index + 1)]!
        const blend = 1 - offset / 5
        const tangent = new THREE.Vector3().subVectors(next, prior).normalize().lerp(direction, blend).normalize()
        const width = THREE.MathUtils.lerp(path.width, second.width, blend)
        const lift = THREE.MathUtils.lerp(path.lift, second.lift, blend)
        for (let side = 0; side < 2; side++) {
          const x = point.x - tangent.z * width / 2 * (side * 2 - 1)
          const z = point.z + tangent.x * width / 2 * (side * 2 - 1)
          position.setXYZ(index * 2 + side, x, ground.heightAt(x, z) + lift, z)
        }
      }
    }
  }
  joinPaths(bank, townStreet); joinPaths(townStreet, connection); joinPaths(connection, avenue)
  const join = connection.points[connection.segments]!

  // Paint is sampled from its parent road plane, with a physical 0.016 separation.
  // Leave the junction mouth clear instead of carrying a line into the crossing.
  const roadPosition = avenue.mesh.geometry.getAttribute('position'), paintPosition = marking.mesh.geometry.getAttribute('position')
  const paintIndices: number[] = []
  marking.drawEnds = [0]
  for (let index = 0; index <= marking.segments; index++) {
    for (let side = 0; side < 2; side++) {
      const t = .5 + (side * 2 - 1) * marking.width / avenue.width / 2
      const left = index * 2, right = left + 1
      paintPosition.setXYZ(left + side,
        THREE.MathUtils.lerp(roadPosition.getX(left), roadPosition.getX(right), t),
        THREE.MathUtils.lerp(roadPosition.getY(left), roadPosition.getY(right), t) + .016,
        THREE.MathUtils.lerp(roadPosition.getZ(left), roadPosition.getZ(right), t))
    }
    if (index < marking.segments) {
      const point = marking.points[index]!, next = marking.points[index + 1]!
      if (point.distanceTo(join) > .75 && next.distanceTo(avenue.points[avenue.segments]!) > .4) {
        paintIndices.push(index * 2, index * 2 + 1, index * 2 + 2, index * 2 + 1, index * 2 + 3, index * 2 + 2)
      }
      marking.drawEnds.push(paintIndices.length)
    }
  }
  marking.mesh.geometry.setIndex(paintIndices)
  marking.mesh.userData.evolution.totalIndices = paintIndices.length

  // Solid shoulders connect every road surface to its sampled terrain bed.
  // The underside overlaps terrain slightly, avoiding a hovering strip at its edge.
  for (const path of paths) {
    path.mesh.geometry.computeVertexNormals(); path.mesh.geometry.computeBoundingBox(); path.mesh.geometry.computeBoundingSphere()
    if (path === marking) continue
    const source = path.mesh.geometry.getAttribute('position'), vertices: number[] = [], indices: number[] = []
    for (let index = 0; index <= path.segments; index++) for (let side = 0; side < 2; side++) {
      const i = index * 2 + side, x = source.getX(i), z = source.getZ(i)
      vertices.push(x, source.getY(i), z, x, ground.heightAt(x, z) - .006, z)
    }
    for (let index = 0; index < path.segments; index++) {
      const a = index * 4, b = a + 4
      indices.push(a, b, a + 1, b, b + 1, a + 1,
        a + 2, a + 3, b + 2, b + 2, a + 3, b + 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
    const bed = new THREE.Mesh(geometry, path.mesh.material)
    bed.name = `${path.mesh.name}-solid-shoulders`; bed.receiveShadow = true
    bed.userData.evolution = { kind: 'path-bed', start: path.start, end: path.end }
    group.add(bed); path.bed = bed
  }

  // Subtract the trunk's footprint from branch tops at junctions. Each road area
  // belongs to exactly one mesh, even when both sand surfaces have the same height.
  type TopTriangle = { points: THREE.Vector3[]; minX: number; maxX: number; minZ: number; maxZ: number }
  const cross = (a: THREE.Vector3, b: THREE.Vector3, p: THREE.Vector3) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)
  function topTriangles(path: Path): TopTriangle[] {
    const position = path.mesh.geometry.getAttribute('position'), index = path.mesh.geometry.getIndex()!
    const result: TopTriangle[] = []
    for (let i = 0; i < index.count; i += 3) {
      const points = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(position, index.getX(i + offset)))
      result.push({ points, minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) })
    }
    return result
  }
  function subtractTriangle(polygon: THREE.Vector3[], triangle: THREE.Vector3[]): THREE.Vector3[][] {
    const outside: THREE.Vector3[][] = []
    let remainder = polygon
    const orientation = Math.sign(cross(triangle[0]!, triangle[1]!, triangle[2]!))
    for (let edge = 0; edge < 3 && remainder.length >= 3; edge++) {
      const a = triangle[edge]!, b = triangle[(edge + 1) % 3]!, inside: THREE.Vector3[] = [], part: THREE.Vector3[] = []
      const edgeLength = Math.hypot(b.x - a.x, b.z - a.z) || 1
      for (let i = 0; i < remainder.length; i++) {
        const p = remainder[i]!, q = remainder[(i + 1) % remainder.length]!
        // A sub-millimetre cut tolerance keeps Float32 rounding from recreating
        // microscopic coplanar slivers along the shared boundary.
        const dp = cross(a, b, p) * orientation / edgeLength + .00004, dq = cross(a, b, q) * orientation / edgeLength + .00004
        ;(dp >= 0 ? inside : part).push(p)
        if ((dp >= 0) !== (dq >= 0)) {
          const intersection = p.clone().lerp(q, dp / (dp - dq))
          inside.push(intersection); part.push(intersection)
        }
      }
      if (part.length >= 3) outside.push(part)
      remainder = inside
    }
    return outside
  }
  function trimJunction(path: Path, trunks: Path[]): void {
    const source = topTriangles(path), occupied = trunks.flatMap(topTriangles), vertices: number[] = [], indices: number[] = []
    function emitTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, subdivisions: number): void {
      if (subdivisions > 0) {
        const ab = a.clone().lerp(b, .5), bc = b.clone().lerp(c, .5), ca = c.clone().lerp(a, .5)
        emitTriangle(a, ab, ca, subdivisions - 1); emitTriangle(ab, b, bc, subdivisions - 1)
        emitTriangle(ca, bc, c, subdivisions - 1); emitTriangle(ab, bc, ca, subdivisions - 1)
        return
      }
      const points = [a, b, c].map(p => new THREE.Vector3(Math.fround(p.x), Math.fround(ground.heightAt(p.x, p.z) + path.lift), Math.fround(p.z)))
      // Clipping can make extremely narrow pieces. Test their actual Float32
      // coordinates so rounding cannot turn them into zero-area GPU triangles.
      if (Math.abs(cross(points[0]!, points[1]!, points[2]!)) < 1e-7) return
      const offset = vertices.length / 3
      for (const p of points) vertices.push(p.x, p.y, p.z)
      indices.push(offset, offset + 1, offset + 2)
    }
    path.drawEnds = [0]
    for (let segment = 0; segment < path.segments; segment++) {
      for (const triangle of source.slice(segment * 2, segment * 2 + 2)) {
        let polygons = [triangle.points]
        for (const other of occupied) {
          if (triangle.maxX <= other.minX || triangle.minX >= other.maxX || triangle.maxZ <= other.minZ || triangle.minZ >= other.maxZ) continue
          polygons = polygons.flatMap(polygon => subtractTriangle(polygon, other.points))
        }
        for (const polygon of polygons) for (let i = 1; i < polygon.length - 1; i++) {
          const a = polygon[0]!, b = polygon[i]!, c = polygon[i + 1]!
          // The coastal bank changes slope across the walkway's width. Interior
          // samples stop a single wide triangle from slicing through that crest.
          emitTriangle(a, b, c, path === promenade ? 2 : 0)
        }
      }
      path.drawEnds.push(indices.length)
    }
    path.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); path.mesh.geometry.setIndex(indices)
    path.mesh.geometry.deleteAttribute('normal')
    path.mesh.geometry.computeVertexNormals(); path.mesh.geometry.computeBoundingBox(); path.mesh.geometry.computeBoundingSphere()
    path.mesh.userData.evolution.totalIndices = indices.length
  }
  trimJunction(marketLane, [townStreet, bank])
  trimJunction(promenade, [bank, townStreet, marketLane])

  // Modern blocks replace the open sand with continuous paving. Its triangles
  // follow the shore and are cut around every street, so there are no road decals
  // fighting a large coplanar ground plane underneath them.
  const pavingVertices: number[] = [], pavingUv: number[] = []
  const cell = .4, minPavingX = -3.6, minPavingZ = -10.8
  const roadBuckets = new Map<string, TopTriangle[]>()
  const pavingCuts = paths.filter(path => path !== marking).flatMap(topTriangles)
  const hotelConnection = [8.39, 8.81].flatMap(z => [new THREE.Vector3(7.84, 0, z), new THREE.Vector3(8.75 + (z - 4.7) * .16 - .25 * Math.sqrt(1 + .16 ** 2), 0, z)])
  for (const points of [[hotelConnection[0]!, hotelConnection[2]!, hotelConnection[1]!], [hotelConnection[1]!, hotelConnection[2]!, hotelConnection[3]!]]) {
    pavingCuts.push({ points, minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minZ: 8.39, maxZ: 8.81 })
  }
  for (const triangle of pavingCuts) {
    for (let x = Math.floor((triangle.minX - minPavingX) / cell); x <= Math.floor((triangle.maxX - minPavingX) / cell); x++)
      for (let z = Math.floor((triangle.minZ - minPavingZ) / cell); z <= Math.floor((triangle.maxZ - minPavingZ) / cell); z++) {
        const key = `${x},${z}`, list = roadBuckets.get(key) ?? []
        list.push(triangle); roadBuckets.set(key, list)
      }
  }
  const pavingDistance = (p: THREE.Vector3) => Math.min(16.65 - p.x, p.z + 10.65, 10.6 - p.z, ground.shoreline(p.x, p.z) - .16)
  function emitPaving(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, depth = 0): void {
    const points = [a, b, c].map(p => new THREE.Vector3(Math.fround(p.x), ground.heightAt(p.x, p.z) + .016, Math.fround(p.z)))
    const area = Math.abs(cross(points[0]!, points[1]!, points[2]!))
    const longestEdge = Math.max(points[0]!.distanceToSquared(points[1]!), points[1]!.distanceToSquared(points[2]!), points[2]!.distanceToSquared(points[0]!))
    if (area < 1e-7 || area / longestEdge < .0001) return
    const ab = points[0]!.clone().lerp(points[1]!, .5), bc = points[1]!.clone().lerp(points[2]!, .5), ca = points[2]!.clone().lerp(points[0]!, .5)
    const centre = points[0]!.clone().add(points[1]!).add(points[2]!).multiplyScalar(1 / 3)
    if (depth < 3 && [ab, bc, ca, centre].some(p => Math.abs(p.y - ground.heightAt(p.x, p.z) - .016) > .007)) {
      emitPaving(points[0]!, ab, ca, depth + 1); emitPaving(ab, points[1]!, bc, depth + 1)
      emitPaving(ca, bc, points[2]!, depth + 1); emitPaving(ab, bc, ca, depth + 1); return
    }
    const normal = points[1]!.clone().sub(points[0]!).cross(points[2]!.clone().sub(points[0]!)).normalize()
    // Extremely narrow clipped pieces can straddle the shoreline slope break.
    // Omit these sub-pixel slivers instead of creating an almost vertical paving face.
    if (normal.y < .8) return
    for (const p of points) { pavingVertices.push(p.x, p.y, p.z); pavingUv.push(p.x * .7, p.z * .7) }
  }
  function clipPaving(polygon: THREE.Vector3[]): THREE.Vector3[] {
    const result: THREE.Vector3[] = []
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, da = pavingDistance(a), db = pavingDistance(b)
      if (da >= 0) result.push(a)
      if ((da >= 0) !== (db >= 0)) {
        let low = 0, high = 1
        for (let step = 0; step < 12; step++) {
          const t = (low + high) / 2, p = a.clone().lerp(b, t)
          if ((pavingDistance(p) >= 0) === (da >= 0)) low = t; else high = t
        }
        result.push(a.clone().lerp(b, (low + high) / 2))
      }
    }
    return result
  }
  for (let ix = 0; ix < 51; ix++) for (let iz = 0; iz < 54; iz++) {
    const x = minPavingX + ix * cell, z = minPavingZ + iz * cell
    const corners = [new THREE.Vector3(x, 0, z), new THREE.Vector3(x + cell, 0, z), new THREE.Vector3(x + cell, 0, z + cell), new THREE.Vector3(x, 0, z + cell)]
    for (const triangle of [[corners[0]!, corners[2]!, corners[1]!], [corners[0]!, corners[3]!, corners[2]!]]) {
      let polygons = [clipPaving(triangle)].filter(p => p.length >= 3)
      for (const road of roadBuckets.get(`${ix},${iz}`) ?? []) polygons = polygons.flatMap(p => subtractTriangle(p, road.points))
      for (const polygon of polygons) for (let i = 1; i < polygon.length - 1; i++) {
        emitPaving(polygon[0]!, polygon[i]!, polygon[i + 1]!)
      }
    }
  }
  const pavingGeometry = new THREE.BufferGeometry()
  pavingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pavingVertices, 3)); pavingGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(pavingUv, 2)); pavingGeometry.computeVertexNormals()
  const pavingPixels = new Uint8Array(64 * 64 * 4)
  for (let z = 0; z < 64; z++) for (let x = 0; x < 64; x++) {
    const i = (z * 64 + x) * 4, grout = x % 16 === 0 || z % 16 === 0
    const value = (grout ? 207 : 225) + (hash(x, z) - .5) * 9
    pavingPixels[i] = value; pavingPixels[i + 1] = value; pavingPixels[i + 2] = value * .965; pavingPixels[i + 3] = 255
  }
  const pavingMap = new THREE.DataTexture(pavingPixels, 64, 64)
  pavingMap.wrapS = pavingMap.wrapT = THREE.RepeatWrapping; pavingMap.colorSpace = THREE.SRGBColorSpace
  pavingMap.generateMipmaps = true; pavingMap.minFilter = THREE.LinearMipmapLinearFilter; pavingMap.magFilter = THREE.LinearFilter; pavingMap.needsUpdate = true
  const paving = new THREE.Mesh(pavingGeometry, new THREE.MeshStandardMaterial({ color: '#c6c4b7', map: pavingMap, roughness: .96 }))
  paving.name = 'modern-city-connected-paved-blocks'; paving.receiveShadow = true; group.add(paving)

  // Clip real architectural geometry upward instead of stretching its windows and
  // roofs. Matching depth shaders keep unfinished buildings' shadows at their real height.
  function addConstructionClip(material: THREE.Material, cut: { value: number }): void {
    const previous = material.onBeforeCompile.bind(material)
    const priorKey = material.customProgramCacheKey.bind(material)
    material.onBeforeCompile = (shader, renderer) => {
      previous(shader, renderer)
      shader.uniforms.dubaiConstructionHeight = cut
      shader.vertexShader = 'varying float vDubaiConstructionY;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDubaiConstructionY = (modelMatrix * vec4(transformed, 1.0)).y;')
      shader.fragmentShader = 'uniform float dubaiConstructionHeight;\nvarying float vDubaiConstructionY;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace(/void\s+main\s*\(\s*\)\s*\{/, 'void main() {\nif (vDubaiConstructionY > dubaiConstructionHeight) discard;')
    }
    material.customProgramCacheKey = () => priorKey() + ':dubai-ground-up-construction-v2'
    material.needsUpdate = true
  }

  function footprint(x: number, z: number, width: number, depth: number, angle: number) {
    const samples: number[] = []
    let dry = true
    for (const dx of [-width / 2, 0, width / 2]) for (const dz of [-depth / 2, 0, depth / 2]) {
      const px = x + dx * Math.cos(angle) + dz * Math.sin(angle)
      const pz = z - dx * Math.sin(angle) + dz * Math.cos(angle)
      if (Math.abs(px) > 17.1 || Math.abs(pz) > 10.85 || ground.shoreline(px, pz) < .55) dry = false
      samples.push(ground.heightAt(px, pz))
    }
    return { dry, low: Math.min(...samples), high: Math.max(...samples) }
  }
  function addLivelihood(source: THREE.Group, activity: 'fishing' | 'pearling' | 'caravan', x: number, z: number, angle = 0, size = 1): THREE.Group {
    const bounds = new THREE.Box3().setFromObject(source)
    const centre = bounds.getCenter(new THREE.Vector3()), dimensions = bounds.getSize(new THREE.Vector3()).multiplyScalar(size)
    const object = new THREE.Group()
    object.name = `old-port-livelihood-${activity}`
    source.position.set(-centre.x * size, -bounds.min.y * size, -centre.z * size)
    source.scale.setScalar(size); object.add(source)
    const base = ground.heightAt(x, z)
    object.position.set(x, base, z); object.rotation.y = angle
    object.updateWorldMatrix(true, true)
    const point = new THREE.Vector3()
    const surfaces: { mesh: THREE.Mesh; positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute; inverse: THREE.Matrix4 }[] = []
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true; child.receiveShadow = true
      if (activity === 'caravan') child.frustumCulled = false
      surfaces.push({ mesh: child, positions: child.geometry.getAttribute('position'), inverse: new THREE.Matrix4() })
    })
    function conform(updateBounds = false): void {
      object.updateWorldMatrix(true, true)
      for (const { mesh, positions, inverse } of surfaces) {
        inverse.copy(mesh.matrixWorld).invert()
        // Camel animation writes the undeformed pose before this pass. Applying
        // current terrain heights therefore never accumulates a vertical drift.
        for (let index = 0; index < positions.count; index++) {
          point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld)
          point.y += ground.heightAt(point.x, point.z) - object.position.y
          point.applyMatrix4(inverse); positions.setXYZ(index, point.x, point.y, point.z)
        }
        positions.needsUpdate = true
        if (updateBounds) { mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere() }
      }
    }
    conform(true)
    if (activity === 'caravan') conformCaravan = conform
    object.userData.evolution = { kind: 'livelihood', activity, width: dimensions.x, depth: dimensions.z, groundConformed: true }
    group.add(object)
    // Reserve the full slow turning envelope, not only the starting footprint.
    activityFootprints.push(activity === 'caravan'
      ? { x: -12, z: -9.65, angle: 0, width: 5.6, depth: 4.1 }
      : { x, z, angle, width: dimensions.x, depth: dimensions.z })
    reserved.push({ x, z, radius: Math.hypot(dimensions.x, dimensions.z) / 2 + .12 })
    return object
  }
  function available(x: number, z: number, radius: number, ignoreLandmark = false): boolean {
    if (Math.abs(x) > 16 || Math.abs(z) > 10.3 || ground.shoreline(x, z) < radius + .65) return false
    if (reserved.some((other, index) => !(ignoreLandmark && index === 0) && Math.hypot(x - other.x, z - other.z) < radius + other.radius + .1)) return false
    return !paths.some(path => path !== promenade && path.points.some(point => Math.hypot(point.x - x, point.z - z) < radius + path.width / 2 + .1))
  }
  function addBuilding(object: THREE.Group, x: number, z: number, angle: number, size: number, start: number, end: number, name: string, modern: boolean, landmark = false, platform?: { base: number; bottom: number }): boolean {
    const local = new THREE.Box3().setFromObject(object)
    const dimensions = local.getSize(new THREE.Vector3()).multiplyScalar(size)
    const width = dimensions.x + .1, depth = dimensions.z + .1
    const foot = footprint(x, z, width, depth, angle)
    const cosine = Math.cos(angle), sine = Math.sin(angle)
    const roadOverlap = paths.some(path => path.points.some(point => {
      const dx = point.x - x, dz = point.z - z
      const localX = dx * cosine - dz * sine, localZ = dx * sine + dz * cosine
      return Math.hypot(Math.max(0, Math.abs(localX) - width / 2), Math.max(0, Math.abs(localZ) - depth / 2)) < path.width / 2 + .045
    }))
    const buildingOverlap = [...buildings, ...activityFootprints].some(other => {
      const oc = Math.cos(other.angle), os = Math.sin(other.angle)
      const axes = [[cosine, -sine], [sine, cosine], [oc, -os], [os, oc]]
      return axes.every(([ax, az]) => {
        const radius = width / 2 * Math.abs(ax! * cosine - az! * sine) + depth / 2 * Math.abs(ax! * sine + az! * cosine)
        const otherRadius = other.width / 2 * Math.abs(ax! * oc - az! * os) + other.depth / 2 * Math.abs(ax! * os + az! * oc)
        return Math.abs((other.x - x) * ax! + (other.z - z) * az!) < radius + otherRadius + .07
      })
    })
    if ((!platform && (!foot.dry || foot.high - foot.low > .13)) || roadOverlap || buildingOverlap) {
      // Factories return owned assets; a rejected site must release them immediately.
      const materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
      object.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return
        child.geometry.dispose()
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material)
      })
      materials.forEach(material => { for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); material.dispose() })
      textures.forEach(texture => texture.dispose())
      return false
    }
    const base = platform?.base ?? foot.high + .045
    const foundationBottom = platform?.bottom ?? foot.low - .025
    object.position.set(x, base - local.min.y * size, z)
    object.rotation.y = angle; object.scale.setScalar(size); object.name = name
    const cut = { value: base - 1 }
    const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    addConstructionClip(depthMaterial, cut); depthMaterials.add(depthMaterial)
    const patched = new Set<THREE.Material>()
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = true; child.receiveShadow = true; child.customDepthMaterial = depthMaterial
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) if (!patched.has(material)) { addConstructionClip(material, cut); patched.add(material) }
    })
    object.userData.evolution = { kind: modern ? 'modern-building' : 'old-town', start, end, base, height: dimensions.y, width, depth, foundationBottom, island: !!platform }
    group.add(object)
    const entry: Building = { object, start, end, base, height: dimensions.y, x, z, angle, width, depth, foundationBottom, cut }
    if (modern) {
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(width * .96, 1, depth * .96)), frameMaterial)
      frame.rotation.y = angle; frame.name = `${name}-temporary-structure`
      const slab = new THREE.Mesh(new THREE.BoxGeometry(width * .94, .035, depth * .94), slabMaterial)
      slab.rotation.y = angle; slab.castShadow = true; slab.receiveShadow = true; slab.name = `${name}-working-floor`
      constructionLayer.add(frame, slab); entry.frame = frame; entry.slab = slab
    }
    buildings.push(entry)
    if (!landmark) reserved.push({ x, z, radius: Math.max(width, depth) / 2 })
    return true
  }

  // The old port occupies the two curved banks. The heritage quarter remains as
  // the new district grows on previously open inland plots to its east.
  let oldVariant = 0
  function oldQuarter(count: number, seed: number, start: number, end: number, area: 'village' | 'banks' | 'town'): void {
    let placed = 0
    for (let attempt = 0; attempt < 1800 && placed < count; attempt++) {
      const x = area === 'town' ? -15.2 + hash(attempt, seed + 1) * 11.4 : -15.6 + hash(attempt, seed + 1) * 10.3
      const north = area === 'village' || hash(attempt, seed + 2) > .42
      const z = area === 'town' ? -7.8 + hash(attempt, seed + 3) * 8.7
        : north ? channelZ(x) - 3.0 - hash(attempt, seed + 3) * (area === 'village' ? 4.0 : 3.2)
          : channelZ(x) + 3.0 + hash(attempt, seed + 3) * 2.0
      const size = area === 'village' ? .88 : .9
      if (!available(x, z, .56)) continue
      const progress = placed / Math.max(1, count - 1)
      const birth = start + progress * (end - start) * .7
      const completion = Math.min(end, birth + (area === 'village' ? .055 : .085))
      const storeys = area === 'village' ? 1 : area === 'banks' ? (placed % 4 === 0 ? 2 : 1) : placed % 5 === 0 ? 3 : 2
      const angle = Math.sin(x * .19) * .18 + (hash(attempt, seed + 7) - .5) * .24 + (north ? 0 : Math.PI)
      if (addBuilding(createOldTownBuilding(oldVariant++, storeys), x, z, angle, size, birth, completion, `${area}-building-${placed}`, false)) placed++
    }
  }
  // These three livelihoods are already present in the initial village and stay
  // in its old port. Reserve their real bounds before selecting houses and shops.
  addLivelihood(createFishingGoods(), 'fishing', -15.7, 1.6, -.10)
  addLivelihood(createPearlingGoods(), 'pearling', -10.8, 1.25, .08)
  const caravanSource = createCamelCaravan()
  const caravan = addLivelihood(caravanSource, 'caravan', -12, -9.83)

  // Small shaded stalls make the new trade activity legible before tall buildings appear.
  for (let i = 0; i < 4; i++) {
    const x = -14.5 + i * 1.7, z = channelZ(x) - 2.92
    if (!available(x, z, .54)) continue
    addBuilding(createMarketStall(i), x, z, 0, .9, .10 + i * .012, .20 + i * .012, `waterfront-market-stall-${i}`, false)
  }
  oldQuarter(9, 31, -.14, -.01, 'village')
  oldQuarter(14, 67, .025, .28, 'banks')
  oldQuarter(25, 91, .22, .55, 'town')

  const dockSegments: { object: THREE.Mesh; start: number; end: number; anchor: THREE.Vector3; supportHeight?: number }[] = []
  for (const [dockIndex, x] of [-14.8, -11.0, -7.3].entries()) {
    const bank = channelZ(x) - 1.6
    for (let section = 0; section < 5; section++) {
      const z = bank + section * .29
      const deck = new THREE.Mesh(new THREE.BoxGeometry(.6, .09, .32), timberMaterial)
      deck.position.set(x, .59, z); deck.castShadow = true; deck.receiveShadow = true
      deck.name = `old-port-pier-${dockIndex}-${section}`; group.add(deck)
      dockSegments.push({ object: deck, start: .05 + dockIndex * .045 + section * .008, end: .10 + dockIndex * .045 + section * .008, anchor: deck.position.clone() })
      if (section === 1 || section === 4) for (const side of [-1, 1]) {
        const bottom = ground.heightAt(x + side * .21, z) - .025
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, .59 - bottom, 6), timberMaterial)
        pile.position.set(x + side * .21, (bottom + .59) / 2, z); pile.castShadow = true; group.add(pile)
        dockSegments.push({ object: pile, start: .02 + dockIndex * .045 + section * .008, end: .05 + dockIndex * .045 + section * .008, anchor: new THREE.Vector3(pile.position.x, bottom, z), supportHeight: .59 - bottom })
      }
    }
  }
  // Modern growth follows the transport axis and the dry eastern coastal strip.
  const skyline: [number, number, number][] = [
    [-2, -9.8, 1], [.5, -9.8, 1.03], [3, -9.8, .94], [5.5, -9.8, 1.02], [8, -9.8, .94], [10.5, -9.8, 1], [13, -9.8, .9], [15.5, -9.8, .82],
    [-1.3, -7.3, .76], [1.5, -7.4, .81], [4.3, -7.4, .74], [7.1, -7, .8], [9.9, -6.2, .86], [12.6, -4.9, .88], [15.3, -3.4, .93],
    [15.2, -.5, .92], [15.2, 2.1, .86], [15.2, 4.7, .91], [15.2, 7.3, .81], [15.2, 9.9, .71],
    [10.6, 1.1, .82], [11, 3.8, .75], [11.2, 6.4, .82], [11.6, 9, .71], [5.3, -1.4, .8], [7.8, .1, .78],
  ]
  let modernIndex = 0
  for (const [x, z, size] of skyline) {
    if (!available(x, z, 1.03)) continue
    const birth = .68 + modernIndex * .0065
    const angle = z < -6 ? 0 : Math.atan2(1.7 - x, 4.7 - z) * .20
    if (addBuilding(createModernBuilding(modernIndex), x, z, angle, size, birth, Math.min(1, birth + .16), `modern-city-building-${modernIndex}`, true)) modernIndex++
  }
  addBuilding(createDubaiLandmark(), 1.2, -1.35, -.08, 1, .72, 1, 'modern-city-stepped-landmark', true, true)

  // A compact, explicitly schematic island for the sail-shaped hotel. Its short
  // eastern causeway ends at the coast walk and leaves the western harbour open.
  const islandX = 6.55, islandZ = 8.6, islandBottom = -.1, islandTop = .64
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.42, islandTop - islandBottom, 40), new THREE.MeshStandardMaterial({ color: '#c4baa2', roughness: .94 }))
  island.position.set(islandX, (islandTop + islandBottom) / 2, islandZ); island.castShadow = true; island.receiveShadow = true; island.name = 'sail-hotel-grounded-island'; group.add(island)
  dockSegments.push({ object: island, start: .73, end: .84, anchor: new THREE.Vector3(islandX, islandBottom, islandZ), supportHeight: islandTop - islandBottom })
  const causewayVertices: number[] = [], halfWidth = .21, startX = 7.84
  for (const z of [islandZ - halfWidth, islandZ + halfWidth]) {
    const endX = 8.75 + (z - 4.7) * .16 - .25 * Math.sqrt(1 + .16 ** 2)
    causewayVertices.push(startX, .628, z, endX, ground.heightAt(endX, z) + .032, z, startX, islandBottom, z, endX, islandBottom, z)
  }
  const causewayGeometry = new THREE.BufferGeometry()
  causewayGeometry.setAttribute('position', new THREE.Float32BufferAttribute(causewayVertices, 3))
  causewayGeometry.setIndex([0, 4, 1, 1, 4, 5, 0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7, 0, 2, 4, 4, 2, 6, 1, 5, 3, 5, 7, 3, 2, 3, 6, 3, 7, 6])
  const causewayHeight = .628 - islandBottom, causewayCentre = (.628 + islandBottom) / 2
  causewayGeometry.translate(0, -causewayCentre, 0); causewayGeometry.computeVertexNormals()
  const causeway = new THREE.Mesh(causewayGeometry, quayMaterial); causeway.position.y = causewayCentre; causeway.castShadow = true; causeway.receiveShadow = true; causeway.name = 'sail-hotel-short-shore-connection'; group.add(causeway)
  dockSegments.push({ object: causeway, start: .79, end: .86, anchor: new THREE.Vector3(0, islandBottom, 0), supportHeight: causewayHeight })
  addBuilding(createSailHotel(), islandX, islandZ, 0, 1, .84, 1, 'modern-city-sail-hotel', true, false, { base: islandTop, bottom: islandTop - .025 })

  function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry { const result = mergeGeometries(parts, false)!; parts.forEach(part => part.dispose()); return result }
  function box(width: number, height: number, depth: number, x: number, y: number, z: number): THREE.BufferGeometry { return new THREE.BoxGeometry(width, height, depth).translate(x, y, z) }
  function batch(geometry: THREE.BufferGeometry, material: THREE.Material, transforms: THREE.Matrix4[], perUnit = 1, start = .79, end = .96): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length)
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix)); mesh.castShadow = true; mesh.receiveShadow = true
    mesh.name = 'modern-city-street-furniture'; group.add(mesh); urbanBatches.push({ mesh, units: transforms.length / perUnit, perUnit, start, end }); return mesh
  }
  const metal = new THREE.MeshStandardMaterial({ color: '#707a73', roughness: .77 })
  const warmLight = new THREE.MeshStandardMaterial({ color: '#dedbc6', roughness: .58, emissive: '#af9e69', emissiveIntensity: .16 })
  const lampTransforms: THREE.Matrix4[] = [], carTransforms: THREE.Matrix4[] = [], wheelTransforms: THREE.Matrix4[] = [], benchTransforms: THREE.Matrix4[] = []
  const transform = new THREE.Object3D()
  function pointClear(x: number, z: number, radius: number): boolean {
    return !buildings.some(building => {
      const dx = x - building.x, dz = z - building.z, c = Math.cos(building.angle), s = Math.sin(building.angle)
      return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - building.width / 2), Math.max(0, Math.abs(dx * s + dz * c) - building.depth / 2)) < radius
    })
  }
  for (const fraction of [.06, .19, .33, .47, .61, .75, .89]) {
    const index = Math.round(avenue.segments * fraction), p = avenue.points[index]!, a = avenue.points[index - 1]!, b = avenue.points[index + 1]!
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz)
    for (const side of [-1, 1]) {
      const x = p.x - dz / length * .68 * side, z = p.z + dx / length * .68 * side
      if (!pointClear(x, z, .25)) continue
      transform.position.set(x, ground.heightAt(x, z) + .016, z); transform.rotation.set(0, Math.atan2(dx, dz), 0); transform.scale.setScalar(1); transform.updateMatrix(); lampTransforms.push(transform.matrix.clone())
    }
  }
  const pole = new THREE.CylinderGeometry(.016, .023, .86, 7).translate(0, .43, 0)
  batch(merge([pole, box(.17, .024, .028, .065, .86, 0)]), metal, lampTransforms)
  batch(box(.14, .035, .075, .1, .874, 0), warmLight, lampTransforms)
  for (const [index, fraction] of [.12, .28, .43, .59, .74, .88].entries()) {
    const i = Math.round(avenue.segments * fraction), p = avenue.points[i]!, a = avenue.points[i - 1]!, b = avenue.points[i + 1]!, dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz), side = index % 2 ? -1 : 1
    const x = p.x - dz / length * .22 * side, z = p.z + dx / length * .22 * side
    transform.position.set(x, ground.heightAt(x, z) + .085, z); transform.rotation.set(0, Math.atan2(dx, dz) + (side < 0 ? Math.PI : 0), 0); transform.scale.setScalar(1); transform.updateMatrix(); carTransforms.push(transform.matrix.clone())
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const local = new THREE.Matrix4().makeTranslation(sx * .155, .055, sz * .23)
      wheelTransforms.push(transform.matrix.clone().multiply(local))
    }
  }
  const carPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .42, metalness: .18 })
  const cars = batch(box(.31, .12, .7, 0, .115, 0), carPaint, carTransforms, 1, .83, 1)
  const colors = ['#d9d6c7', '#7b989d', '#b39d7a']
  carTransforms.forEach((_, index) => cars.setColorAt(index, new THREE.Color(colors[index % colors.length]!)))
  batch(box(.265, .095, .32, 0, .2175, 0), new THREE.MeshStandardMaterial({ color: '#5c747f', roughness: .3, metalness: .2 }), carTransforms, 1, .83, 1)
  batch(new THREE.CylinderGeometry(.055, .055, .035, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#55564f', roughness: 1 }), wheelTransforms, 4, .83, 1)
  for (const [x, z, angle] of [[3.4, -3.65, 0], [-1.2, -3.6, 0], [4.0, -.2, Math.PI / 2], [10.1, 7.7, Math.PI / 2]]) {
    if (!pointClear(x!, z!, .45) || ground.shoreline(x!, z!) < .6) continue
    transform.position.set(x!, ground.heightAt(x!, z!) + .016, z!); transform.rotation.set(0, angle!, 0); transform.updateMatrix(); benchTransforms.push(transform.matrix.clone())
  }
  batch(merge([box(.64, .04, .20, 0, .19, 0), box(.64, .20, .025, 0, .29, .09)]), new THREE.MeshStandardMaterial({ color: '#a79372', roughness: .92 }), benchTransforms)
  batch(merge([box(.035, .17, .17, -.24, .085, 0), box(.035, .17, .17, .24, .085, 0)]), metal, benchTransforms)

  function addShip(x: number, z: number, angle: number, size: number, start: number, end: number, variant: number, activity: 'fishing' | 'pearling' | 'trade' = 'trade'): THREE.Group {
    const object = createDhow(variant)
    if (activity !== 'trade') {
      const goods = activity === 'fishing' ? createFishingGoods() : createPearlingGoods()
      const bounds = new THREE.Box3().setFromObject(goods), centre = bounds.getCenter(new THREE.Vector3())
      const scale = .24
      goods.scale.setScalar(scale)
      goods.position.set(-centre.x * scale, .046 - bounds.min.y * scale, -.27 - centre.z * scale)
      goods.name = `${activity}-equipment-on-deck`; object.add(goods)
    }
    object.position.set(x, ground.waterLevel, z); object.rotation.y = angle; object.scale.setScalar(size)
    object.name = `port-${activity}-dhow-${variant}`; object.userData.evolution = { kind: 'ship', activity, start, end }
    group.add(object); ships.push({ object, x, z, angle, size, start, end, phase: variant * 1.7, emergence: 1 })
    return object
  }
  const fishingBoat = addShip(-13.7, channelZ(-13.7) - .05, Math.PI / 2, .75, -.1, -.01, 0, 'fishing')
  const fishingNet = createFishingNetAnimation()
  fishingBoat.add(fishingNet.group)
  const pearlingBoat = addShip(-9.3, channelZ(-9.3) + .05, Math.PI / 2, .83, -.1, -.01, 1, 'pearling')
  addShip(-6.0, channelZ(-6) + .05, Math.PI / 2, .76, .18, .31, 2)
  addShip(2.5, 4.7, .6, .75, .31, .44, 3)

  const foundations = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), foundationMaterial, buildings.length)
  foundations.name = 'sequential-building-foundations'
  foundations.castShadow = true; foundations.receiveShadow = true; foundations.frustumCulled = false
  group.add(foundations)
  const foundationTransform = new THREE.Object3D()

  // The future architecture always contributes to framing, even at progress=0.
  // Shader reveals preserve geometry dimensions; this hidden proxy also stabilises
  // bounds against small boat motion and temporary construction structures.
  group.updateWorldMatrix(true, true)
  const finalBounds = new THREE.Box3().setFromObject(group).expandByScalar(.05)
  const proxySize = finalBounds.getSize(new THREE.Vector3())
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(proxySize.x, proxySize.y, proxySize.z), new THREE.MeshBasicMaterial())
  proxy.name = 'persistent-final-evolution-framing-bounds'
  proxy.position.copy(finalBounds.getCenter(new THREE.Vector3())); proxy.visible = false
  group.add(proxy)

  const labels: Label[] = []
  const activityLabels: Label[] = [
    { id: 'fishing', text: '渔业：渔网、鱼筐与渔船', position: new THREE.Vector3(fishingBoat.position.x, ground.waterLevel + .65, fishingBoat.position.z + .25) },
    { id: 'pearling', text: '采珠船：采珠篮与绳索', position: new THREE.Vector3(pearlingBoat.position.x, ground.waterLevel + .65, pearlingBoat.position.z) },
    { id: 'caravan', text: '骆驼贸易：载货商队', position: new THREE.Vector3(caravan.position.x, caravan.position.y + .95, caravan.position.z) },
  ]
  let progress = 1
  let milestone = -1
  let disposed = false
  let motionActive = false, motionTime = 0, previousTime: number | undefined
  function resetLivelihoodMotion(): void {
    motionTime = 0
    fishingNet.reset(); resetCamelCaravan(caravanSource)
    caravan.position.set(-12, ground.heightAt(-12, -9.83), -9.83); caravan.rotation.y = 0
    conformCaravan?.()
    activityLabels[2]!.position.set(caravan.position.x, caravan.position.y + .95, caravan.position.z)
  }
  function setGrowth(value: number): void {
    if (disposed) return
    const previousProgress = progress
    progress = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 1, 0, 1)
    const nextMotionActive = progress < .58
    if (nextMotionActive !== motionActive || (progress === 0 && previousProgress > 0)) resetLivelihoodMotion()
    motionActive = nextMotionActive
    let completed = 0, active = 0
    buildings.forEach((entry, index) => {
      const build = phase(progress, entry.start, entry.end)
      const foundation = phase(build, 0, .15)
      const heightFraction = phase(build, .12, 1)
      entry.object.visible = heightFraction > 0
      entry.cut.value = entry.base + entry.height * heightFraction + (heightFraction === 1 ? .02 : 0)
      if (heightFraction > 0 && heightFraction < 1) active++
      if (heightFraction === 1) completed++
      entry.object.userData.evolution.progress = heightFraction
      foundationTransform.position.set(entry.x, (entry.foundationBottom + entry.base) / 2, entry.z)
      foundationTransform.rotation.set(0, entry.angle, 0)
      foundationTransform.scale.set(entry.width * Math.max(.0001, foundation), entry.base - entry.foundationBottom, entry.depth * Math.max(.0001, foundation))
      foundationTransform.updateMatrix(); foundations.setMatrixAt(index, foundationTransform.matrix)
      if (entry.frame && entry.slab) {
        const visible = heightFraction > .005 && heightFraction < .995
        entry.frame.visible = visible; entry.slab.visible = visible
        entry.frame.position.set(entry.x, entry.base + entry.height * heightFraction / 2, entry.z)
        entry.frame.scale.y = Math.max(.01, entry.height * heightFraction)
        entry.slab.position.set(entry.x, entry.base + entry.height * heightFraction, entry.z)
      }
    })
    foundations.instanceMatrix.needsUpdate = true
    const paved = phase(progress, .58, .84)
    paving.visible = paved > 0
    paving.geometry.setDrawRange(0, Math.floor(pavingVertices.length / 9 * paved) * 3)
    for (const batch of urbanBatches) {
      batch.mesh.count = Math.floor(batch.units * phase(progress, batch.start, batch.end)) * batch.perUnit
      batch.mesh.visible = batch.mesh.count > 0
    }
    for (const path of paths) {
      const reveal = phase(progress, path.start, path.end)
      path.mesh.visible = reveal > 0
      const segments = Math.floor(path.segments * reveal)
      path.mesh.geometry.setDrawRange(0, path.drawEnds[segments]!)
      if (path.bed) { path.bed.visible = reveal > 0; path.bed.geometry.setDrawRange(0, segments * 12) }
    }
    for (const entry of dockSegments) {
      const reveal = phase(progress, entry.start, entry.end)
      entry.object.visible = reveal > 0
      if (entry.supportHeight !== undefined) {
        entry.object.scale.set(1, Math.max(.0001, reveal), 1)
        entry.object.position.set(entry.anchor.x, entry.anchor.y + entry.supportHeight * reveal / 2, entry.anchor.z)
      } else {
        entry.object.scale.set(1, 1, Math.max(.0001, reveal))
        entry.object.position.set(entry.anchor.x, entry.anchor.y, entry.anchor.z - .16 * (1 - reveal))
      }
    }
    for (const ship of ships) {
      ship.emergence = phase(progress, ship.start, ship.end)
      ship.object.visible = ship.emergence > 0
      ship.object.scale.setScalar(ship.size * Math.max(.0001, ship.emergence))
    }
    const nextMilestone = progress < .25 ? 0 : progress < .58 ? 1 : progress < .8 ? 2 : 3
    if (nextMilestone !== milestone) {
      milestone = nextMilestone
      const definitions: [string, string, number, number, number][] = milestone === 0
        ? [['open-land', '尚未建设的沙地', 10.5, .9, -6.8]]
        : milestone === 1
          ? [['old-town', '沿岸扩展的城镇', -11.5, 2.2, -3.4], ['water', '滨海水域（示意）', 3.8, .85, 6.8]]
          : milestone === 2
            ? [['transport', '交通联系扩展', -3.6, 1.2, -6.1], ['construction', '基础设施与新建区', 9.7, 2.1, -5.3]]
            : [['new-city', '多种产业推动新区扩展', 11, 3.6, -4.8], ['sail-hotel', '帆船形酒店（示意）', 6.55, 3.5, 8.6]]
      labels.splice(0, labels.length, ...activityLabels, ...definitions.map(([id, text, x, y, z]) => ({ id, text, position: new THREE.Vector3(x, y, z) })))
    }
    group.userData.evolutionState = { progress, milestone, buildings: buildings.length, completed, active, modernBuildings: modernIndex, roads: paths.length, livelihoods: activityFootprints.length }
  }
  setGrowth(1)
  return {
    group, labels, setGrowth,
    update(time) {
      if (disposed) return
      const elapsed = Number.isFinite(time) ? time : 0
      const delta = previousTime === undefined ? 0 : THREE.MathUtils.clamp(elapsed - previousTime, 0, .05)
      previousTime = elapsed
      for (const ship of ships) {
        ship.object.position.set(ship.x, ground.waterLevel + Math.sin(elapsed * .6 + ship.phase) * .008, ship.z)
        ship.object.rotation.set(Math.sin(elapsed * .45 + ship.phase) * .008, ship.angle, Math.sin(elapsed * .53 + ship.phase) * .01)
      }
      if (motionActive) {
        motionTime += delta
        // A very slow, compact oval keeps the caravan in its reserved dry sand.
        // The turn is continuous; it never snaps or walks backwards at an endpoint.
        const angle = -Math.PI / 2 + motionTime * .036
        const x = -12 + Math.cos(angle) * .72, z = -9.65 + Math.sin(angle) * .18
        caravan.position.set(x, ground.heightAt(x, z), z)
        caravan.rotation.y = -Math.atan2(Math.cos(angle) * .18, -Math.sin(angle) * .72)
        updateCamelCaravan(caravanSource, delta); conformCaravan?.()
        fishingNet.update(delta)
      }
      activityLabels[0]!.position.set(fishingBoat.position.x, fishingBoat.position.y + .65, fishingBoat.position.z + .25)
      activityLabels[1]!.position.set(pearlingBoat.position.x, pearlingBoat.position.y + .65, pearlingBoat.position.z)
      activityLabels[2]!.position.set(caravan.position.x, caravan.position.y + .95, caravan.position.z)
    },
    dispose() { if (disposed) return; disposed = true; fishingNet.dispose(); depthMaterials.forEach(material => material.dispose()) },
  }
}
