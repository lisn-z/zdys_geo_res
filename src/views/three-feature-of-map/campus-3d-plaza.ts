import * as THREE from 'three'

type GroundPoint = { x: number; z: number }

function inside(point: GroundPoint, polygon: readonly GroundPoint[]) {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!
    if ((a.z > point.z) !== (b.z > point.z)
      && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) result = !result
  }
  return result
}

function edgeDistance(point: GroundPoint, polygon: readonly GroundPoint[]) {
  let result = Infinity
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length]!
    const dx = b.x - a.x, dz = b.z - a.z, lengthSquared = dx * dx + dz * dz
    const t = lengthSquared > 0 ? THREE.MathUtils.clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared, 0, 1) : 0
    result = Math.min(result, Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t))
  })
  return result
}

// Procedural flag artwork keeps the model self-contained, including headless previews.
function redFlagTexture() {
  const width = 384, height = 256
  const pixels = new Uint8Array(width * height * 4)
  function star(x: number, y: number, radius: number, angle: number) {
    return Array.from({ length: 10 }, (_, index) => {
      const theta = angle + index * Math.PI / 5
      const r = index % 2 ? radius * 0.382 : radius
      return { x: x + Math.cos(theta) * r, z: y + Math.sin(theta) * r }
    })
  }
  // Coordinates use a 30 × 20 field, with the small stars pointing toward the large star.
  const stars = [star(5, 5, 3, -Math.PI / 2), ...[[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y]) =>
    star(x!, y!, 1, Math.atan2(5 - y!, 5 - x!)))]
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const point = { x: (column + 0.5) / width * 30, z: (1 - (row + 0.5) / height) * 20 }
      const yellow = point.x < 14 && point.z < 11 && stars.some(polygon => inside(point, polygon))
      const offset = (row * width + column) * 4
      pixels[offset] = yellow ? 255 : 225
      pixels[offset + 1] = yellow ? 222 : 33
      pixels[offset + 2] = yellow ? 72 : 47
      pixels[offset + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat)
  texture.name = '校园五星红旗'
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** The paving follows the authored footprint exactly; all decoration fits inside it. */
export function createCampusPlaza(authoredPoints: readonly GroundPoint[]): {
  group: THREE.Group
  labelPosition: THREE.Vector3
  update: (elapsedSeconds: number) => void
} {
  const group = new THREE.Group()
  group.name = '校园升旗广场'
  const labelPosition = new THREE.Vector3(0, 2.3, 0)
  const empty = { group, labelPosition, update: (_elapsedSeconds: number) => {} }
  const points = authoredPoints.filter(point => Number.isFinite(point.x) && Number.isFinite(point.z))
  if (points.length < 3) return empty
  const xs = points.map(point => point.x), zs = points.map(point => point.z)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs)
  const width = maxX - minX, depth = maxZ - minZ, shortSide = Math.min(width, depth)
  if (shortSide < 1e-5) return empty

  const materials = new Map<number, THREE.MeshStandardMaterial>()
  function material(color: number) {
    let value = materials.get(color)
    if (!value) { value = new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); materials.set(color, value) }
    return value
  }
  function add(geometry: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material(color))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const shape = new THREE.Shape()
  points.forEach((point, index) => index ? shape.lineTo(point.x, -point.z) : shape.moveTo(point.x, -point.z))
  shape.closePath()
  const paving = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false, steps: 1, curveSegments: 1 })
  paving.rotateX(-Math.PI / 2)
  add(paving, 0xe5d4b2, 0, 0.02).name = '广场实际占地'

  // Concave outlines can have their bounds centre outside the paving. Find an interior
  // point with clearance so the flag platform and flower beds stay on the plaza.
  let center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 }
  let clearance = inside(center, points) ? edgeDistance(center, points) : 0
  for (let row = 0; row < 9; row++) {
    for (let column = 0; column < 9; column++) {
      const point = { x: minX + (column + 0.5) / 9 * width, z: minZ + (row + 0.5) / 9 * depth }
      if (!inside(point, points)) continue
      const distance = edgeDistance(point, points)
      if (distance > clearance + 1e-6) { center = point; clearance = distance }
    }
  }
  labelPosition.set(center.x, 2.3, center.z)
  if (clearance < 0.05) return empty

  const platformRadius = Math.min(THREE.MathUtils.clamp(shortSide * 0.075, 0.85, 2.4), clearance * 0.28)
  const circleRadius = Math.min(clearance * 0.78, platformRadius * 2.9)
  const tierHeight = Math.min(0.18, platformRadius * 0.16)
  add(new THREE.CylinderGeometry(circleRadius, circleRadius, 0.025, 48), 0xf4e9d2, center.x, 0.214, center.z)
  const ring = new THREE.RingGeometry(circleRadius * 0.9, circleRadius, 48)
  ring.rotateX(-Math.PI / 2)
  add(ring, 0xcfa58b, center.x, 0.23, center.z).castShadow = false
  for (let index = 0; index < 3; index++) {
    const radius = platformRadius * (1 - index * 0.18)
    add(new THREE.CylinderGeometry(radius, radius, tierHeight, 32), index === 2 ? 0xc45c51 : 0xeee2cd,
      center.x, 0.23 + tierHeight * (index + 0.5), center.z)
  }

  // Two low flower beds leave the main approach and the flag silhouette unobstructed.
  const flowerSize = Math.min(platformRadius * 0.48, 0.9)
  const flowerGeometry = new THREE.IcosahedronGeometry(flowerSize * 0.18, 0)
  for (const side of [-1, 1]) {
    const x = center.x + side * circleRadius * 0.59, z = center.z + circleRadius * 0.4
    add(new THREE.BoxGeometry(flowerSize * 1.6, flowerSize * 0.44, flowerSize * 1.2), 0xc99577, x, 0.23 + flowerSize * 0.22, z)
    add(new THREE.BoxGeometry(flowerSize * 1.44, flowerSize * 0.18, flowerSize * 1.03), 0x69a074, x, 0.23 + flowerSize * 0.5, z)
    for (let index = 0; index < 3; index++) {
      add(flowerGeometry, index === 1 ? 0xffd878 : 0xe98782, x + (index - 1) * flowerSize * 0.43,
        0.23 + flowerSize * 0.68, z + (index % 2 ? 0.15 : -0.15) * flowerSize)
    }
  }

  const platformTop = 0.23 + tierHeight * 3
  const poleHeight = Math.min(THREE.MathUtils.clamp(shortSide * 0.34, 5.5, 13), shortSide * 0.9)
  const poleRadius = Math.min(0.105, poleHeight * 0.008)
  add(new THREE.CylinderGeometry(poleRadius * 0.72, poleRadius, poleHeight, 12), 0xdde5e3,
    center.x, platformTop + poleHeight / 2, center.z).name = '升旗杆'
  add(new THREE.SphereGeometry(poleRadius * 1.65, 10, 6), 0xecc774,
    center.x, platformTop + poleHeight, center.z)

  const flagWidth = Math.min(THREE.MathUtils.clamp(shortSide * 0.105, 1.5, 4.2), clearance * 0.72)
  const flagHeight = flagWidth * 2 / 3
  const cloth = new THREE.PlaneGeometry(flagWidth, flagHeight, 30, 18)
  cloth.translate(flagWidth / 2, -flagHeight / 2, 0)
  const uv = cloth.attributes.uv as THREE.BufferAttribute
  const flagMaterial = new THREE.MeshStandardMaterial({
    name: '双面红旗布料', map: redFlagTexture(), color: 0xffffff,
    side: THREE.DoubleSide, roughness: 0.72, metalness: 0,
  })
  const flag = new THREE.Mesh(cloth, flagMaterial)
  flag.name = '随风飘动的五星红旗'
  flag.position.set(center.x + poleRadius * 0.85, platformTop + poleHeight - poleRadius * 2.8, center.z)
  flag.castShadow = true
  flag.receiveShadow = true
  group.add(flag)
  labelPosition.set(center.x, platformTop + poleHeight + Math.max(2, flagWidth * 0.7), center.z)

  const position = cloth.attributes.position as THREE.BufferAttribute
  position.setUsage(THREE.DynamicDrawUsage)
  // Conservative bounds include every wave phase without recomputing them each frame.
  cloth.boundingSphere = new THREE.Sphere(new THREE.Vector3(flagWidth / 2, -flagHeight * 0.56, 0), Math.hypot(flagWidth, flagHeight) * 0.68)
  function update(elapsedSeconds: number) {
    if (!Number.isFinite(elapsedSeconds)) return
    const time = elapsedSeconds % (Math.PI * 10000)
    for (let index = 0; index < position.count; index++) {
      const u = uv.getX(index), v = 1 - uv.getY(index)
      const x = flagWidth * u, y = -flagHeight * v
      const wave = Math.sin(u * 8.5 - time * 3.6 + v * 1.7)
        + 0.27 * Math.sin(u * 19 - time * 6.2 - v * 1.3)
      const z = flagWidth * 0.075 * u ** 0.85 * wave
      const sag = flagHeight * 0.09 * u * u
      // u = 0 pins both x/y and z of the entire hoist edge to the pole.
      position.setXYZ(index, x, y - sag + flagHeight * 0.019 * u * Math.sin(u * 11 - time * 4), z)
    }
    position.needsUpdate = true
    cloth.computeVertexNormals()
  }
  update(0)
  return { group, labelPosition, update }
}
