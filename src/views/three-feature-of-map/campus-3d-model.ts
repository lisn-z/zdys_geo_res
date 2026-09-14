import * as THREE from 'three'
import { type CampusLayout, type ProjectedCampusFeature, isCampusBuilding } from './campus-3d-layout'
import { createRoadMarkingGeometry } from './campus-3d-roads'
import { createCampusWater } from './campus-3d-water'
import { createCampusBuilding } from './campus-3d-buildings'
import { createCampusPlaza } from './campus-3d-plaza'

type GroundPoint = { x: number; z: number }
export type CampusBuilding = { id: number; name: string; target: THREE.Vector3; radius: number; height: number }

const clamp = THREE.MathUtils.clamp

function polygonShape(points: GroundPoint[]) {
  const shape = new THREE.Shape()
  points.forEach((point, index) => index ? shape.lineTo(point.x, -point.z) : shape.moveTo(point.x, -point.z))
  shape.closePath()
  return shape
}

function within(point: GroundPoint, polygon: GroundPoint[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

function bounds(points: GroundPoint[]) {
  const xs = points.map(point => point.x), zs = points.map(point => point.z)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs)
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ }
}

function inset(points: GroundPoint[], center: GroundPoint, scale: number) {
  return points.map(point => ({ x: center.x + (point.x - center.x) * scale, z: center.z + (point.z - center.z) * scale }))
}

function closed(points: GroundPoint[]) { return points.length ? [...points, points[0]!] : points }

// Every model is placed in the projected east/north frame. No layout rotation is applied.
export function buildCampusModel(layout: CampusLayout, options: { includeBase?: boolean; includeLabels?: boolean; roadWidth?: number; fenceWidth?: number } = {}): { group: THREE.Group; buildings: CampusBuilding[]; update: (elapsedSeconds: number) => void } {
  const group = new THREE.Group()
  group.name = '地理方位校园'
  const buildings: CampusBuilding[] = []
  const animations: ((elapsedSeconds: number) => void)[] = []
  const materials = new Map<number, THREE.MeshStandardMaterial>()
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
  const treeGeometry = new THREE.IcosahedronGeometry(1, 1)
  let remainingDetails = 1000

  function material(color: number) {
    let cached = materials.get(color)
    if (!cached) { cached = new THREE.MeshStandardMaterial({ color, roughness: 0.88 }); materials.set(color, cached) }
    return cached
  }

  function mesh(geometry: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material(color))
    object.position.set(x, y, z)
    object.castShadow = true
    object.receiveShadow = true
    group.add(object)
    return object
  }

  function box(x: number, y: number, z: number, width: number, height: number, depth: number, color: number, rotation = 0) {
    const object = mesh(boxGeometry, color, x, y, z)
    object.scale.set(width, height, depth)
    object.rotation.y = rotation
    return object
  }

  function polygon(points: GroundPoint[], bottom: number, height: number, color: number) {
    const geometry = new THREE.ExtrudeGeometry(polygonShape(points), { depth: height, bevelEnabled: false, steps: 1, curveSegments: 1 })
    geometry.rotateX(-Math.PI / 2)
    return mesh(geometry, color, 0, bottom, 0)
  }

  // A single mesh follows all original vertices, including sharp turns, without smoothing the route.
  function ribbon(points: GroundPoint[], width: number, bottom: number, height: number, color: number) {
    const positions: number[] = []
    const triangles = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 1, 2, 6, 1, 6, 5, 0, 4, 7, 0, 7, 3]
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1]!, b = points[index]!
      const distance = Math.hypot(b.x - a.x, b.z - a.z)
      if (distance < 1e-6) continue
      const nx = -(b.z - a.z) / distance * width / 2, nz = (b.x - a.x) / distance * width / 2
      const corners = [
        [a.x + nx, bottom, a.z + nz], [b.x + nx, bottom, b.z + nz],
        [b.x - nx, bottom, b.z - nz], [a.x - nx, bottom, a.z - nz],
        [a.x + nx, bottom + height, a.z + nz], [b.x + nx, bottom + height, b.z + nz],
        [b.x - nx, bottom + height, b.z - nz], [a.x - nx, bottom + height, a.z - nz],
      ]
      for (const vertex of triangles) positions.push(...corners[vertex]!)
    }
    if (!positions.length) return
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    return mesh(geometry, color)
  }

  function line(points: GroundPoint[], y: number, color: number, width = 0.12) {
    return ribbon(points, width, y, 0.025, color)
  }

  function circle(center: GroundPoint, radius: number, y: number, color: number, width = 0.13) {
    const points = Array.from({ length: 33 }, (_, index) => {
      const angle = index / 32 * Math.PI * 2
      return { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius }
    })
    line(points, y, color, width)
  }

  function label(text: string, x: number, y: number, z: number, accent: string, width = 11, cardinal = false) {
    if (options.includeLabels === false) return
    if (typeof document === 'undefined') return
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = cardinal ? 192 : 112
    const context = canvas.getContext('2d')
    if (!context) return
    const height = canvas.height
    context.fillStyle = '#fffcf5'
    context.strokeStyle = cardinal ? accent : '#d8e1d6'
    context.lineWidth = cardinal ? 7 : 3
    context.beginPath(); context.roundRect(5, 5, 502, height - 10, cardinal ? 36 : 28); context.fill(); context.stroke()
    context.textAlign = 'center'; context.textBaseline = 'middle'
    context.fillStyle = accent
    const fontSize = cardinal ? 94 : Math.min(51, 440 / Math.max(text.length, 1))
    context.font = `700 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
    context.fillText(text, 256, height / 2 + 3, 450)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, toneMapped: false })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.position.set(x, y, z)
    sprite.scale.set(width, width * height / 512, 1)
    sprite.renderOrder = cardinal ? 30 : 20
    group.add(sprite)
  }

  function tree(point: GroundPoint, size: number, seed: number, authored = false) {
    if (!authored && remainingDetails < 3) return
    remainingDetails = Math.max(0, remainingDetails - 3)
    mesh(new THREE.CylinderGeometry(size * 0.16, size * 0.22, size * 1.2, 6), 0xb68d61, point.x, size * 0.6, point.z)
    const crown = mesh(treeGeometry, seed % 2 ? 0x78ac79 : 0x98c581, point.x, size * 1.8, point.z)
    crown.scale.set(size, size * 1.2, size)
    crown.rotation.y = seed * 0.7
    const highlight = mesh(treeGeometry, 0xa5cf85, point.x - size * 0.25, size * 2.15, point.z - size * 0.1)
    highlight.scale.setScalar(size * 0.66)
  }

  function interiorSamples(points: GroundPoint[], count: number) {
    const extent = bounds(points), result: GroundPoint[] = []
    const columns = Math.max(2, Math.ceil(Math.sqrt(count * Math.max(extent.width, 1) / Math.max(extent.depth, 1))))
    const rows = Math.max(2, Math.ceil(count * 2 / columns))
    for (let row = 0; row < rows && result.length < count; row++) {
      for (let column = 0; column < columns && result.length < count; column++) {
        const point = { x: extent.minX + (column + 0.5) / columns * extent.width, z: extent.minZ + (row + 0.5) / rows * extent.depth }
        if (within(point, points)) result.push(point)
      }
    }
    return result
  }

  function building(feature: ProjectedCampusFeature) {
    const model = createCampusBuilding(feature)
    group.add(model.group)
    label(feature.name, model.labelPosition.x, model.labelPosition.y, model.labelPosition.z, '#3e5960', model.labelWidth)
    buildings.push({ id: feature.id, name: feature.name, target: model.target, radius: model.radius, height: model.height })
  }

  function gate(feature: ProjectedCampusFeature) {
    const { x, z } = feature.center
    box(x - 3.1, 2.1, z, 1, 4.2, 1.1, 0xf9e5c6)
    box(x + 3.1, 2.1, z, 1, 4.2, 1.1, 0xf9e5c6)
    box(x, 4.05, z, 7.6, 0.8, 1.4, 0xc77864)
    box(x, 0.18, z, 8.5, 0.36, 3, 0xd7c9aa)
    label(feature.name, x, 6.2, z, '#8e6253', 11)
  }

  function busStop(feature: ProjectedCampusFeature) {
    const { x, z } = feature.center
    box(x, 0.18, z, 5.2, 0.36, 3.4, 0xd6cbb6)
    box(x - 2, 1.75, z, 0.18, 3.5, 0.18, 0x6d8d89)
    box(x + 2, 1.75, z, 0.18, 3.5, 0.18, 0x6d8d89)
    box(x, 3.5, z, 5.1, 0.36, 3.2, 0x82b7a9)
    box(x, 0.9, z, 3.3, 0.22, 0.9, 0xc69666)
    label(feature.name, x, 5.5, z, '#3e6868', 9)
  }

  function fence(feature: ProjectedCampusFeature) {
    const widthScale = (options.fenceWidth ?? 1.1) / 1.1
    ribbon(feature.points, 0.65 * widthScale, 0, 2.3, 0xe8dcc6)
    ribbon(feature.points, 0.85 * widthScale, 2.3, 0.23, 0xb1a392)
    let pillarBudget = Math.min(remainingDetails, 36)
    for (let index = 1; index < feature.points.length && pillarBudget > 0; index++) {
      const a = feature.points[index - 1]!, b = feature.points[index]!
      const count = Math.min(12, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5)))
      for (let i = 0; i <= count && pillarBudget > 0; i++) {
        box(a.x + (b.x - a.x) * i / count, 1.4, a.z + (b.z - a.z) * i / count, 1.1 * widthScale, 2.8, 1.1 * widthScale, 0xc7b6a0)
        pillarBudget--; remainingDetails--
      }
    }
    label(feature.name, feature.center.x, 4.2, feature.center.z, '#726455', 10)
  }

  function road(feature: ProjectedCampusFeature) {
    const isPath = feature.kind === 'footpath', width = options.roadWidth !== undefined ? Math.max(0.2, options.roadWidth - 0.5) : (isPath ? 1.1 : 2.7)
    // Keep footpaths below the entire roadway, including its shoulder. A shared
    // surface height makes their different colours flicker at crossings; fixed
    // levels also keep intersections stable when either road is moved or rebuilt.
    const shoulderTop = isPath ? 0.27 : 0.4
    const surfaceTop = isPath ? 0.34 : 0.49
    const shoulder = ribbon(feature.points, options.roadWidth ?? width + 0.5, 0.02, shoulderTop - 0.02, isPath ? 0xd9c89e : 0xd3cbb8)
    const surface = ribbon(feature.points, width, shoulderTop, surfaceTop - shoulderTop, isPath ? 0xf0ddb1 : 0x7f8b87)
    if (shoulder) shoulder.name = `${feature.kind}-shoulder`
    if (surface) surface.name = `${feature.kind}-surface`
    if (isPath) return
    const markings = mesh(createRoadMarkingGeometry(feature.points, 0.18, surfaceTop + 0.02), 0xfff1c6)
    markings.name = 'road-centerline'
    markings.castShadow = false
  }

  function area(feature: ProjectedCampusFeature) {
    const points = feature.points
    if (points.length < 3) return
    const center = within(feature.center, points) ? feature.center : interiorSamples(points, 1)[0]
    const extent = bounds(points)
    const shortSide = Math.min(extent.width, extent.depth)
    if (feature.kind === 'green-space') {
      polygon(points, 0.02, 0.2, 0x9fc984)
      const trees = interiorSamples(points, Math.min(14, Math.max(2, Math.floor(extent.width * extent.depth / 35))))
      trees.forEach((point, index) => tree(point, clamp(shortSide / 7, 0.8, 2.2), index + feature.id))
    } else if (feature.kind === 'campus-water') {
      const water = createCampusWater(points)
      group.add(water.group)
      animations.push(water.update)
    } else if (feature.kind === 'sports-field') {
      polygon(points, 0.02, 0.18, 0xca8c75)
      if (center) {
        for (const scale of [0.92, 0.84]) line(closed(inset(points, center, scale)), 0.23, 0xffe7cf, 0.1)
        polygon(inset(points, center, 0.7), 0.22, 0.06, 0x80b792)
        const field = inset(points, center, 0.59)
        line(closed(field), 0.3, 0xf7f2d9)
        const radius = Math.min(shortSide * 0.1, 3)
        if (radius > 0.2) circle(center, radius, 0.31, 0xf7f2d9)
      }
    } else if (feature.kind === 'basketball-court') {
      polygon(points, 0.02, 0.22, 0xcf9573)
      if (center) {
        line(closed(inset(points, center, 0.84)), 0.27, 0xfff1d4)
        const radius = Math.min(shortSide * 0.17, 2.3)
        if (radius > 0.2) circle(center, radius, 0.28, 0xfff1d4)
        for (const point of interiorSamples(points, 2)) {
          box(point.x, 1.3, point.z, 0.13, 2.6, 0.13, 0xe4e5cf)
          box(point.x, 2.65, point.z, 1.1, 0.65, 0.1, 0xfff4d8)
        }
      }
    } else if (feature.kind === 'parking') {
      polygon(points, 0.02, 0.18, 0xa1aba7)
      interiorSamples(points, 8).forEach((point, index) => {
        const size = clamp(shortSide / 8, 0.35, 1)
        if (!within({ x: point.x + size * 0.75, z: point.z + size * 1.3 }, points)) return
        box(point.x, size * 0.35 + 0.2, point.z, size * 1.3, size * 0.65, size * 2.2, [0xd88271, 0xe8c575, 0x729fae][index % 3]!)
        box(point.x, size * 0.86 + 0.2, point.z, size * 1.05, size * 0.4, size * 1.15, 0xe9eadd)
      })
    } else if (feature.kind === 'plaza') {
      const plaza = createCampusPlaza(points)
      group.add(plaza.group)
      animations.push(plaza.update)
      label(feature.name, plaza.labelPosition.x, plaza.labelPosition.y, plaza.labelPosition.z, '#8f5146', clamp(shortSide * 0.75, 9, 15))
      return
    } else return
    label(feature.name, feature.center.x, 2.3, feature.center.z, '#426c58', clamp(shortSide * 0.75, 9, 15))
  }

  // The circular base provides a quiet edge for the fixed geographical compass.
  if (options.includeBase !== false) {
  mesh(new THREE.CylinderGeometry(layout.radius - 1, layout.radius - 3, 3.4, 96), 0xd2b996, 0, -2.6, 0)
  mesh(new THREE.CylinderGeometry(layout.radius, layout.radius, 0.9, 96), 0x739868, 0, -0.85, 0)
  mesh(new THREE.CylinderGeometry(layout.radius, layout.radius, 0.42, 96), 0x95bd73, 0, -0.21, 0)
  circle({ x: 0, z: 0 }, layout.radius - 2.4, 0.035, 0xd6e3b5, 0.3)
  const compassRadius = layout.radius - 10
  const directions = [
    { text: '北 N', x: 0, z: -compassRadius, color: '#426e99' },
    { text: '东 E', x: compassRadius, z: 0, color: '#b97455' },
    { text: '南 S', x: 0, z: compassRadius, color: '#498e7c' },
    { text: '西 W', x: -compassRadius, z: 0, color: '#8b74a3' },
  ]
  for (const direction of directions) {
    label(direction.text, direction.x, 2.4, direction.z, direction.color, 16, true)
    const magnitude = Math.hypot(direction.x, direction.z)
    line([{ x: direction.x / magnitude * (layout.radius - 4), z: direction.z / magnitude * (layout.radius - 4) }, { x: direction.x / magnitude * (layout.radius - 1), z: direction.z / magnitude * (layout.radius - 1) }], 0.05, 0xfaf2d9, 0.7)
  }
  }

  // Surface meshes precede structures so shadows and labels share one stable scene.
  for (const feature of layout.features) {
    if (feature.kind === 'campus-road' || feature.kind === 'footpath') road(feature)
    else if (['sports-field', 'basketball-court', 'green-space', 'campus-water', 'parking', 'plaza'].includes(feature.kind)) area(feature)
  }
  for (const feature of layout.features) {
    if (isCampusBuilding(feature.kind)) building(feature)
    else if (feature.kind === 'campus-gate') gate(feature)
    else if (feature.kind === 'bus-stop') busStop(feature)
    else if (feature.kind === 'campus-fence') fence(feature)
    else if (feature.kind === 'tree') {
      tree(feature.center, 2.6, feature.id, true)
      label(feature.name, feature.center.x, 9.6, feature.center.z, '#426c58', 9)
    }
  }

  // Single-object builder previews may not use either shared primitive.
  const usedGeometries = new Set<THREE.BufferGeometry>()
  group.traverse(object => { if (object instanceof THREE.Mesh) usedGeometries.add(object.geometry) })
  if (!usedGeometries.has(boxGeometry)) boxGeometry.dispose()
  if (!usedGeometries.has(treeGeometry)) treeGeometry.dispose()
  return { group, buildings, update: elapsedSeconds => animations.forEach(animate => animate(elapsedSeconds)) }
}
