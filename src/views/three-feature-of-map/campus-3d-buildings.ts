import * as THREE from 'three'
import type { CampusPoint, ProjectedCampusFeature } from './campus-3d-layout'

type Palette = { wall: number; accent: number; roof: number; glass: number }
type Facade = { a: CampusPoint; b: CampusPoint; length: number; nx: number; nz: number; angle: number }
type RoofPatch = { x: number; z: number; width: number; depth: number; angle: number }
export type CampusBuildingModel = {
  group: THREE.Group
  target: THREE.Vector3
  radius: number
  height: number
  labelPosition: THREE.Vector3
  labelWidth: number
}

const clamp = THREE.MathUtils.clamp
const cream = 0xfff4da
const palettes: Record<string, Palette> = {
  'teaching-building': { wall: 0xffecd2, accent: 0xd07f68, roof: 0xbc6656, glass: 0x76adc0 },
  library: { wall: 0xefe3cf, accent: 0xaa8cbb, roof: 0x7b789d, glass: 0x73b9c7 },
  canteen: { wall: 0xffeac8, accent: 0xd99757, roof: 0xb96752, glass: 0x8abdaf },
  administration: { wall: 0xe8e9d9, accent: 0x759990, roof: 0x597f78, glass: 0x82b6bd },
  dormitory: { wall: 0xffe4c1, accent: 0xcf977a, roof: 0x9e7b72, glass: 0x89b5c2 },
  laboratory: { wall: 0xe6edf0, accent: 0x899abb, roof: 0x668f9b, glass: 0x62aebe },
  gymnasium: { wall: 0xe2ebd7, accent: 0x719d94, roof: 0x6fa5a4, glass: 0x96c8ca },
  infirmary: { wall: 0xfff4e8, accent: 0x81b9c1, roof: 0x77a3ad, glass: 0x8ac3c9 },
  toilet: { wall: 0xe6eee0, accent: 0x7faa96, roof: 0x639385, glass: 0x90bbb9 },
}

function shape(points: CampusPoint[]) {
  const result = new THREE.Shape()
  points.forEach((point, index) => index ? result.lineTo(point.x, -point.z) : result.moveTo(point.x, -point.z))
  result.closePath()
  return result
}

function cross(a: CampusPoint, b: CampusPoint, c: CampusPoint) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
}

function inside(point: CampusPoint, polygon: CampusPoint[]) {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!, b = polygon[i]!
    if (Math.abs(cross(a, b, point)) < 1e-7 && point.x >= Math.min(a.x, b.x) - 1e-7 && point.x <= Math.max(a.x, b.x) + 1e-7 && point.z >= Math.min(a.z, b.z) - 1e-7 && point.z <= Math.max(a.z, b.z) + 1e-7) return true
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) result = !result
  }
  return result
}

// Find a roof rectangle inside the authored outline, in its longest-edge frame.
// Checking boundary intersections also protects concave footprints with an off-centre courtyard.
function interiorRoofPatch(points: CampusPoint[], facades: Facade[]): RoofPatch | undefined {
  const longest = facades.reduce((best, face) => face.length > best.length ? face : best, facades[0]!)
  if (!longest || longest.length < 0.05) return
  const ux = (longest.b.x - longest.a.x) / longest.length, uz = (longest.b.z - longest.a.z) / longest.length
  const local = points.map(point => ({ x: point.x * ux + point.z * uz, z: -point.x * uz + point.z * ux }))
  const minX = Math.min(...local.map(point => point.x)), maxX = Math.max(...local.map(point => point.x))
  const minZ = Math.min(...local.map(point => point.z)), maxZ = Math.max(...local.map(point => point.z))
  const width = maxX - minX, depth = maxZ - minZ
  if (Math.min(width, depth) < 0.08) return
  function fits(x: number, z: number, w: number, d: number) {
    const corners = [{ x: x - w / 2, z: z - d / 2 }, { x: x + w / 2, z: z - d / 2 }, { x: x + w / 2, z: z + d / 2 }, { x: x - w / 2, z: z + d / 2 }]
    if (!corners.every(point => inside(point, local))) return false
    for (let i = 0; i < local.length; i++) {
      const a = local[i]!, b = local[(i + 1) % local.length]!
      if (a.x > x - w / 2 + 1e-7 && a.x < x + w / 2 - 1e-7 && a.z > z - d / 2 + 1e-7 && a.z < z + d / 2 - 1e-7) return false
      for (let j = 0; j < 4; j++) {
        const c = corners[j]!, e = corners[(j + 1) % 4]!
        if (cross(a, b, c) * cross(a, b, e) < -1e-10 && cross(c, e, a) * cross(c, e, b) < -1e-10) return false
      }
    }
    return true
  }
  let best: RoofPatch | undefined
  let bestArea = 0
  const candidates = [{ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 }]
  for (let row = 0; row < 5; row++) for (let column = 0; column < 5; column++) candidates.push({ x: minX + width * (column + 0.5) / 5, z: minZ + depth * (row + 0.5) / 5 })
  for (const point of candidates) {
    if (!inside(point, local)) continue
    for (const ratio of [0.45, 0.8, 1.3, 2.2, width / depth]) {
      let low = 0, high = Math.min(width / ratio, depth)
      for (let attempt = 0; attempt < 12; attempt++) {
        const d = (low + high) / 2
        if (fits(point.x, point.z, d * ratio, d)) low = d
        else high = d
      }
      const d = low * 0.94, w = d * ratio
      if (w * d <= bestArea) continue
      bestArea = w * d
      best = { x: point.x * ux - point.z * uz, z: point.x * uz + point.z * ux, width: w, depth: d, angle: Math.atan2(-uz, ux) }
    }
  }
  return best
}

/** All ground coordinates remain in the projected east (+X), north (-Z) frame. */
export function createCampusBuilding(feature: ProjectedCampusFeature): CampusBuildingModel {
  const group = new THREE.Group()
  group.name = `campus-building-${feature.kind}`
  group.userData.architecturalStyle = feature.kind
  const palette = palettes[feature.kind] ?? palettes['teaching-building']!
  const pointSizes: Record<string, [number, number]> = { library: [11, 8], canteen: [10, 7], infirmary: [8, 6.4], toilet: [6, 4.8] }
  const [pointWidth, pointDepth] = pointSizes[feature.kind] ?? [9, 7]
  const points = feature.points.length >= 3 ? feature.points : [
    { x: feature.center.x - pointWidth / 2, z: feature.center.z - pointDepth / 2 },
    { x: feature.center.x + pointWidth / 2, z: feature.center.z - pointDepth / 2 },
    { x: feature.center.x + pointWidth / 2, z: feature.center.z + pointDepth / 2 },
    { x: feature.center.x - pointWidth / 2, z: feature.center.z + pointDepth / 2 },
  ]
  const signedArea = points.reduce((sum, a, index) => { const b = points[(index + 1) % points.length]!; return sum + a.x * b.z - b.x * a.z }, 0)
  const size = Math.sqrt(Math.max(Math.abs(signedArea) / 2, 0.2))
  const facades: Facade[] = points.map((a, index) => {
    const b = points[(index + 1) % points.length]!, length = Math.hypot(b.x - a.x, b.z - a.z)
    const direction = signedArea >= 0 ? 1 : -1
    const nx = (b.z - a.z) / Math.max(length, 1e-8) * direction, nz = -(b.x - a.x) / Math.max(length, 1e-8) * direction
    return { a, b, length, nx, nz, angle: Math.atan2(nx, nz) }
  }).filter(face => face.length > 0.05)
  const front = [...facades].sort((a, b) => b.length * (1 + b.nz * 0.35) - a.length * (1 + a.nz * 0.35))[0]
  const patch = interiorRoofPatch(points, facades)
  const lowRise = ['toilet', 'infirmary', 'canteen'].includes(feature.kind)
  const floors = feature.kind === 'gymnasium' ? 1 : lowRise ? (feature.kind === 'toilet' ? 1 : 2) : feature.kind === 'dormitory' ? 4 : 3
  const height = feature.kind === 'toilet' ? 3.4 : feature.kind === 'gymnasium' ? clamp(size * 0.25, 5.5, 10) : clamp(size * 0.34, floors * 2.4, floors * 3.2)
  const base = 0.5, top = base + height
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  const instances = new Map<string, { color: number; glass: boolean; matrices: THREE.Matrix4[] }>()
  function material(color: number, glass = false) {
    const key = `${color}-${glass}`
    let cached = materials.get(key)
    if (!cached) {
      cached = new THREE.MeshStandardMaterial({ color, roughness: glass ? 0.21 : 0.82, metalness: glass ? 0.18 : 0 })
      materials.set(key, cached)
    }
    return cached
  }
  function mesh(geometry: THREE.BufferGeometry, color: number, name: string, glass = false) {
    const object = new THREE.Mesh(geometry, material(color, glass))
    object.name = name; object.castShadow = true; object.receiveShadow = true
    group.add(object)
    return object
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, name: string, angle = 0, glass = false) {
    const object = mesh(unitBox, color, name, glass)
    object.position.set(x, y, z); object.scale.set(w, h, d); object.rotation.y = angle
    return object
  }
  function instance(x: number, y: number, z: number, w: number, h: number, d: number, color: number, name: string, angle = 0, glass = false) {
    const key = `${name}-${color}`
    let batch = instances.get(key)
    if (!batch) { batch = { color, glass, matrices: [] }; instances.set(key, batch) }
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), new THREE.Vector3(w, h, d))
    batch.matrices.push(transform)
  }
  function polygon(bottom: number, depth: number, color: number, name: string) {
    const geometry = new THREE.ExtrudeGeometry(shape(points), { depth, bevelEnabled: false, steps: 1, curveSegments: 1 })
    geometry.rotateX(-Math.PI / 2)
    const object = mesh(geometry, color, name)
    object.position.y = bottom
    return object
  }
  function onFacade(face: Facade, fraction: number, y: number, w: number, h: number, d: number, color: number, name: string, offset = 0.03, glass = false) {
    instance(face.a.x + (face.b.x - face.a.x) * fraction + face.nx * offset, y, face.a.z + (face.b.z - face.a.z) * fraction + face.nz * offset, w, h, d, color, name, face.angle, glass)
  }
  function patchPoint(x: number, z: number) {
    return { x: patch!.x + x * Math.cos(patch!.angle) + z * Math.sin(patch!.angle), z: patch!.z - x * Math.sin(patch!.angle) + z * Math.cos(patch!.angle) }
  }
  function roofBox(x: number, z: number, y: number, w: number, h: number, d: number, color: number, name: string, glass = false) {
    const point = patchPoint(x, z)
    return box(point.x, y, point.z, w, h, d, color, name, patch!.angle, glass)
  }
  function pitchedRoof(x: number, z: number, y: number, w: number, d: number, rise: number, color: number, name: string) {
    const vertices = [
      -w / 2, 0, -d / 2, w / 2, 0, -d / 2, w / 2, rise, 0,
      -w / 2, 0, -d / 2, w / 2, rise, 0, -w / 2, rise, 0,
      -w / 2, rise, 0, w / 2, rise, 0, w / 2, 0, d / 2,
      -w / 2, rise, 0, w / 2, 0, d / 2, -w / 2, 0, d / 2,
      -w / 2, 0, -d / 2, -w / 2, rise, 0, -w / 2, 0, d / 2,
      w / 2, 0, d / 2, w / 2, rise, 0, w / 2, 0, -d / 2,
    ]
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(Array.from({ length: vertices.length / 9 }, (_, index) => [index * 3, index * 3 + 2, index * 3 + 1]).flat())
    geometry.computeVertexNormals()
    const object = mesh(geometry, color, name, name === 'laboratory-glazed-skylights'), point = patchPoint(x, z)
    object.position.set(point.x, y, point.z); object.rotation.y = patch!.angle
    return object
  }

  polygon(0.06, base - 0.06, 0xc9bba1, 'building-foundation')
  polygon(base, height, palette.wall, 'building-footprint')
  polygon(base, 0.34, palette.accent, 'building-plinth')
  polygon(top - 0.18, 0.26, cream, 'building-cornice')
  polygon(top + 0.09, 0.2, palette.roof, 'building-roof-terrace')

  const classroomWindows = feature.kind === 'teaching-building'
  const diningWindows = feature.kind === 'canteen'
  const libraryWindows = feature.kind === 'library'
  const floorStep = height / floors
  if (['teaching-building', 'administration', 'dormitory', 'laboratory'].includes(feature.kind)) {
    for (let floor = 1; floor < floors; floor++) polygon(base + floor * floorStep - 0.13, 0.19, feature.kind === 'laboratory' ? palette.accent : cream, 'building-floor-band')
  }
  let windowCount = 0
  const windowLimit = 128
  for (const face of [...facades].sort((a, b) => b.length - a.length)) {
    if (face.length < 0.8) continue
    const columns = Math.min(10, Math.max(1, Math.floor(face.length / (diningWindows ? 2.9 : 2.35))))
    for (let floor = 0; floor < floors && windowCount < windowLimit; floor++) for (let column = 0; column < columns && windowCount < windowLimit; column++) {
      const fraction = (column + 0.5) / columns
      if (face === front && floor === 0 && Math.abs(fraction - 0.5) * face.length < Math.min(face.length * 0.18, 1.7)) continue
      const w = Math.min(diningWindows ? 2.3 : 1.8, face.length / columns * (libraryWindows ? 0.83 : 0.62))
      const h = floorStep * (libraryWindows ? 0.75 : diningWindows ? 0.65 : 0.48)
      const y = base + floorStep * (floor + 0.52)
      onFacade(face, fraction, y, w + 0.16, h + 0.17, 0.12, cream, 'window-frames', 0.055)
      onFacade(face, fraction, y, w, h, 0.05, palette.glass, 'window-glass', 0.13, true)
      onFacade(face, fraction, y, 0.065, h, 0.07, cream, 'window-mullions', 0.18)
      if (classroomWindows || diningWindows) onFacade(face, fraction, y, w, 0.065, 0.07, cream, 'window-transoms', 0.18)
      if (feature.kind === 'dormitory' && floor > 0) {
        onFacade(face, fraction, y - h / 2 - 0.14, w + 0.35, 0.16, 0.62, cream, 'dormitory-balcony-slabs', 0.25)
        onFacade(face, fraction, y - h / 2 + 0.22, w + 0.28, 0.45, 0.08, palette.accent, 'dormitory-balcony-rails', 0.52)
        for (const shift of [-0.37, 0.37]) onFacade(face, fraction + shift * w / face.length, y - h / 2 + 0.22, 0.055, 0.44, 0.08, cream, 'dormitory-balcony-pickets', 0.57)
      }
      if (feature.kind === 'laboratory') onFacade(face, fraction + w * 0.65 / face.length, y, 0.1, h + 0.35, 0.35, palette.accent, 'laboratory-sun-fins', 0.15)
      windowCount++
    }
  }

  if (front) {
    const entranceWidth = Math.min(front.length * 0.45, feature.kind === 'library' ? 4.5 : 3.2)
    const doorHeight = Math.min(height * 0.5, 2.5)
    onFacade(front, 0.5, base + doorHeight / 2, entranceWidth + 0.32, doorHeight + 0.18, 0.14, cream, 'entrance-surround', 0.09)
    onFacade(front, 0.5, base + doorHeight / 2, entranceWidth, doorHeight, 0.14, 0x537f8c, 'entrance-glass', 0.2, true)
    onFacade(front, 0.5, base + doorHeight / 2, 0.09, doorHeight, 0.08, cream, 'entrance-door-divider', 0.31)
    for (const side of [-1, 1]) onFacade(front, 0.5 + side * entranceWidth * 0.1 / front.length, base + doorHeight * 0.52, 0.07, 0.43, 0.1, 0xe8cd87, 'entrance-door-handles', 0.36)
    onFacade(front, 0.5, base + doorHeight + 0.32, entranceWidth + 0.5, 0.25, 0.92, palette.accent, 'entrance-canopy', 0.36)
    if (classroomWindows || feature.kind === 'administration') {
      for (const side of [-1, 1]) onFacade(front, 0.5 + side * (entranceWidth + 0.26) / 2 / front.length, base + doorHeight / 2, 0.19, doorHeight, 0.37, cream, 'entrance-columns', 0.3)
      onFacade(front, 0.5, base + doorHeight + 0.76, entranceWidth * 0.65, 0.5, 0.11, palette.accent, 'school-entrance-plaque', 0.1)
    }
    if (diningWindows) {
      const awningWidth = Math.min(front.length * 0.88, 12), stripes = 9
      for (let index = 0; index < stripes; index++) onFacade(front, 0.5 + ((index + 0.5) / stripes - 0.5) * awningWidth / front.length, base + floorStep * 0.94, awningWidth / stripes, 0.32, 0.86, index % 2 ? cream : palette.accent, 'canteen-striped-awning', 0.34)
    }
    if (feature.kind === 'infirmary') {
      const crossY = top - 1.4
      onFacade(front, 0.5, crossY, 1.65, 0.46, 0.12, 0x4d9ab7, 'infirmary-blue-cross', 0.16)
      onFacade(front, 0.5, crossY, 0.46, 1.65, 0.13, 0x4d9ab7, 'infirmary-blue-cross', 0.18)
    }
    if (feature.kind === 'toilet') {
      for (const side of [-1, 1]) onFacade(front, 0.5 + side * 0.12, base + doorHeight * 0.77, 0.25, 0.38, 0.08, side < 0 ? 0x75adc3 : 0xda9b98, 'toilet-door-signs', 0.33)
    }
  }

  if (patch && patch.width > 0.12 && patch.depth > 0.12) {
    const w = patch.width, d = patch.depth, roofY = top + 0.3
    if (feature.kind === 'teaching-building') {
      pitchedRoof(0, 0, roofY, w, d, clamp(d * 0.24, 0.6, 3.2), palette.roof, 'teaching-tiled-pitched-roof')
      roofBox(0, 0, roofY + clamp(d * 0.24, 0.6, 3.2), w, 0.16, Math.min(0.24, d * 0.15), cream, 'teaching-roof-ridge')
      const dormerW = w * 0.27, dormerD = d * 0.34, rise = clamp(d * 0.24, 0.6, 3.2)
      roofBox(0, -d * 0.08, roofY + rise * 0.64, dormerW, rise * 0.8, dormerD, cream, 'teaching-central-dormer')
      pitchedRoof(0, -d * 0.08, roofY + rise * 1.04, dormerW, dormerD, rise * 0.4, palette.roof, 'teaching-dormer-roof')
    } else if (feature.kind === 'library') {
      roofBox(0, 0, roofY + 0.7, w * 0.85, 1.4, d * 0.66, palette.glass, 'library-glazed-reading-hall', true)
      const columns = Math.min(7, Math.max(3, Math.floor(w / 1.5)))
      for (let index = 0; index <= columns; index++) for (const side of [-1, 1]) roofBox((index / columns - 0.5) * w * 0.85, side * d * 0.34, roofY + 0.7, 0.12, 1.55, 0.12, cream, 'library-reading-hall-mullions')
      pitchedRoof(0, 0, roofY + 1.47, w * 0.96, d * 0.9, Math.min(d * 0.22, 2.1), palette.roof, 'library-folded-roof')
      roofBox(0, 0, roofY + 1.49 + Math.min(d * 0.22, 2.1), w * 0.95, 0.16, Math.min(d * 0.12, 0.3), cream, 'library-roof-spine')
    } else if (feature.kind === 'administration') {
      const towerW = Math.min(w * 0.4, 4), towerD = Math.min(d * 0.56, 4), towerHeight = clamp(size * 0.22, 3, 5.3)
      roofBox(0, 0, roofY + towerHeight / 2, towerW, towerHeight, towerD, palette.wall, 'administration-clock-tower')
      roofBox(0, 0, roofY + towerHeight - 0.05, towerW, 0.2, towerD, cream, 'administration-tower-cornice')
      pitchedRoof(0, 0, roofY + towerHeight + 0.06, towerW, towerD, Math.min(towerD * 0.65, 2), palette.roof, 'administration-tower-roof')
      const clockRadius = Math.min(towerW, towerD, towerHeight) * 0.28
      for (const side of [-1, 1]) {
        const point = patchPoint(0, side * (towerD / 2 + 0.025))
        const clock = mesh(new THREE.CylinderGeometry(clockRadius, clockRadius, 0.08, 24), cream, 'administration-clock-face')
        clock.rotation.set(Math.PI / 2, 0, 0); clock.rotation.z = -patch.angle
        clock.position.set(point.x, roofY + towerHeight * 0.63, point.z)
        roofBox(0, side * (towerD / 2 + 0.09), roofY + towerHeight * 0.63 + clockRadius * 0.23, clockRadius * 0.11, clockRadius * 0.65, 0.08, palette.roof, 'administration-clock-hands')
        roofBox(clockRadius * 0.21, side * (towerD / 2 + 0.09), roofY + towerHeight * 0.63, clockRadius * 0.57, clockRadius * 0.1, 0.08, palette.roof, 'administration-clock-hands')
      }
    } else if (feature.kind === 'gymnasium') {
      const rise = Math.min(d * 0.43, 5)
      const vault = new THREE.Shape()
      vault.moveTo(-d / 2, 0)
      for (let index = 0; index <= 20; index++) { const t = index / 20; vault.lineTo(-d / 2 + d * t, Math.sin(t * Math.PI) * rise) }
      vault.lineTo(d / 2, 0); vault.closePath()
      const geometry = new THREE.ExtrudeGeometry(vault, { depth: w, bevelEnabled: false, steps: 1, curveSegments: 1 })
      // Shape X maps to patch depth; extrusion Z maps to patch width.
      geometry.rotateY(Math.PI / 2); geometry.translate(-w / 2, 0, 0)
      const object = mesh(geometry, palette.roof, 'gymnasium-barrel-vault')
      object.position.set(patch.x, roofY, patch.z); object.rotation.y = patch.angle
      const ribCount = Math.min(8, Math.max(3, Math.ceil(w / 4)))
      for (let rib = 0; rib <= ribCount; rib++) {
        const curve = new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, index) => {
          const t = index / 16
          return new THREE.Vector3((rib / ribCount - 0.5) * w * 0.98, Math.sin(t * Math.PI) * rise + roofY + 0.04, (t - 0.5) * d * 0.98)
        }))
        const rail = mesh(new THREE.TubeGeometry(curve, 24, Math.min(0.09, d * 0.018), 4, false), cream, 'gymnasium-roof-ribs')
        rail.position.set(patch.x, 0, patch.z); rail.rotation.y = patch.angle
      }
    } else if (feature.kind === 'laboratory') {
      const count = Math.min(4, Math.max(2, Math.floor(w / 3)))
      for (let index = 0; index < count; index++) {
        const x = ((index + 0.5) / count - 0.5) * w * 0.9, skylightW = w * 0.68 / count, skylightD = d * 0.76
        roofBox(x, 0, roofY + 0.28, skylightW, 0.55, skylightD, cream, 'laboratory-skylight-curbs')
        pitchedRoof(x, 0, roofY + 0.56, skylightW, skylightD, Math.min(d * 0.15, 1.3), palette.glass, 'laboratory-glazed-skylights')
      }
    } else if (feature.kind === 'dormitory') {
      pitchedRoof(0, 0, roofY, w, d, Math.min(d * 0.24, 2.5), palette.roof, 'dormitory-residential-roof')
      for (const side of [-1, 1]) roofBox(side * w * 0.3, 0, roofY + Math.min(d * 0.24, 2.5) * 0.8, w * 0.14, 1.35, d * 0.19, palette.wall, 'dormitory-roof-vent-housings')
    } else if (feature.kind === 'canteen') {
      pitchedRoof(0, 0, roofY, w, d, Math.min(d * 0.28, 2), palette.roof, 'canteen-pavilion-roof')
      const vent = Math.min(w, d) * 0.17
      roofBox(w * 0.25, 0, roofY + Math.min(d * 0.28, 2) + 0.45, vent, 1.2, vent, palette.accent, 'canteen-kitchen-chimney')
      roofBox(w * 0.25, 0, roofY + Math.min(d * 0.28, 2) + 1.08, vent * 1.15, 0.18, vent * 1.15, cream, 'canteen-chimney-cap')
    } else if (feature.kind === 'infirmary') {
      pitchedRoof(0, 0, roofY, w, d, Math.min(d * 0.2, 1.5), palette.roof, 'infirmary-clinic-roof')
      roofBox(0, 0, roofY + Math.min(d * 0.2, 1.5) + 0.08, w * 0.26, 0.12, d * 0.08, cream, 'infirmary-roof-cross')
      roofBox(0, 0, roofY + Math.min(d * 0.2, 1.5) + 0.09, w * 0.07, 0.13, d * 0.34, cream, 'infirmary-roof-cross')
    } else {
      pitchedRoof(0, 0, roofY, w, d, Math.min(d * 0.35, 1.7), palette.roof, 'toilet-garden-pavilion-roof')
      roofBox(0, 0, roofY + Math.min(d * 0.35, 1.7) + 0.14, w * 0.38, 0.3, d * 0.2, cream, 'toilet-roof-vent')
    }
  }

  // Repeated façade components use one draw call per material/component family.
  for (const [name, batch] of instances) {
    const object = new THREE.InstancedMesh(unitBox, material(batch.color, batch.glass), batch.matrices.length)
    object.name = name
    batch.matrices.forEach((matrix, index) => object.setMatrixAt(index, matrix))
    object.instanceMatrix.needsUpdate = true; object.castShadow = true; object.receiveShadow = true
    group.add(object)
  }
  group.updateMatrixWorld(true)
  const extent = new THREE.Box3().setFromObject(group)
  const fullHeight = extent.max.y
  const radius = Math.max(3.5, ...[extent.min.x, extent.max.x].flatMap(x => [extent.min.z, extent.max.z].map(z => Math.hypot(x - feature.center.x, z - feature.center.z))))
  return {
    group,
    target: new THREE.Vector3(feature.center.x, fullHeight * 0.45, feature.center.z),
    radius,
    height: fullHeight,
    labelPosition: new THREE.Vector3(feature.center.x, fullHeight + 1.8, feature.center.z),
    labelWidth: clamp(size * 0.7, 10, 17),
  }
}
