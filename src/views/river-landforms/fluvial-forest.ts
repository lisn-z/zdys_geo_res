import * as THREE from 'three'
import {
  DOMAIN, clamp, coastZ, deltaAmount, deltaPoints, evolution, fanAmount, fieldHeight, hash,
  noise, rawHeight, riverPoints, shortcutPoints, smooth, upperX,
  type ChannelPoint, type Field,
} from './fluvial-model'

export interface AlpineForest {
  group: THREE.Group
  update(): void
  dispose(): void
}

interface TreeLocation {
  x: number
  z: number
  height: number
  width: number
  rotation: number
  score: number
}

/** Extract alpha before mipmaps can mix the magenta backdrop into the canopy. */
function createFoliageTexture(image: HTMLImageElement): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!
    const magenta = Math.max(0, Math.min(r, b) - g)
    const matte = 1 - smooth(25, 145, magenta)
    data[i + 3] = Math.round(data[i + 3]! * matte)
    if (matte < .005) {
      // Retain foliage-colored RGB under zero alpha to avoid colored or black
      // fringes when the GPU filters the already cut-out texture at a distance.
      data[i] = 52; data[i + 1] = 73; data[i + 2] = 30
    } else {
      const spill = Math.max(0, magenta - 12)
      data[i] = Math.max(0, r - spill)
      data[i + 2] = Math.max(0, b - spill)
    }
  }
  context.putImageData(pixels, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

/** Three intersecting photo cards share one geometry and one instanced draw. */
function createCrossedCards(): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let plane = 0; plane < 3; plane++) {
    const angle = plane * Math.PI / 3
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const corners = [[-.5, 0], [.5, 0], [.5, 1], [-.5, 1]] as const
    for (const [x, y] of corners) {
      positions.push(x * cos, y, x * sin)
      // Each card represents a volume of upward-facing needles, not a flat wall.
      normals.push(-sin * .35, .93675, cos * .35)
      uvs.push(x + .5, y)
    }
    const first = plane * 4
    indices.push(first, first + 1, first + 2, first, first + 2, first + 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

/** Rasterized segment capsules reserve the full moving river corridor. */
function createWaterEnvelope() {
  const cell = .25
  const nx = Math.ceil((DOMAIN.x1 - DOMAIN.x0) / cell)
  const nz = Math.ceil((DOMAIN.z1 - DOMAIN.z0) / cell)
  const blocked = new Uint8Array(nx * nz)
  function reserve(points: ChannelPoint[]) {
    for (let n = 1; n < points.length; n++) {
      const a = points[n - 1]!, b = points[n]!
      // A cell diagonal allowance keeps the continuous .65 bank clearance.
      const radius = Math.max(a.width, b.width) + .65 + cell * Math.SQRT2
      const x0 = clamp(Math.floor((Math.min(a.x, b.x) - radius - DOMAIN.x0) / cell), 0, nx - 1)
      const x1 = clamp(Math.ceil((Math.max(a.x, b.x) + radius - DOMAIN.x0) / cell), 0, nx - 1)
      const z0 = clamp(Math.floor((Math.min(a.z, b.z) - radius - DOMAIN.z0) / cell), 0, nz - 1)
      const z1 = clamp(Math.ceil((Math.max(a.z, b.z) + radius - DOMAIN.z0) / cell), 0, nz - 1)
      const dx = b.x - a.x, dz = b.z - a.z, lengthSquared = dx * dx + dz * dz
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
        const k = iz * nx + ix
        if (blocked[k]) continue
        const x = DOMAIN.x0 + (ix + .5) * cell, z = DOMAIN.z0 + (iz + .5) * cell
        const t = lengthSquared > .000001
          ? clamp(((x - a.x) * dx + (z - a.z) * dz) / lengthSquared) : 0
        if ((x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2 <= radius * radius) blocked[k] = 1
      }
    }
  }
  // Include requested snapshots and intermediate migrating bends. Do not reserve
  // the whole loop's bounding box: land inside an untouched island remains valid.
  const snapshots = new Set([0, .3, .6, .76, 1])
  for (let step = 0; step <= 18; step++) snapshots.add(.48 + step * (.28 / 18))
  for (const progress of snapshots) reserve(riverPoints(evolution(progress)))
  reserve(shortcutPoints(evolution(1)))
  for (const branch of deltaPoints(evolution(1))) reserve(branch)
  return (x: number, z: number) => {
    const ix = Math.floor((x - DOMAIN.x0) / cell), iz = Math.floor((z - DOMAIN.z0) / cell)
    return ix < 0 || ix >= nx || iz < 0 || iz >= nz || blocked[iz * nx + ix] === 1
  }
}

function chooseLocations(): TreeLocation[] {
  const waterReserved = createWaterEnvelope()
  const locations: TreeLocation[] = []
  const spacing = .43
  const matureState = evolution(1)
  for (let iz = 0; iz < 122; iz++) for (let ix = 0; ix < 100; ix++) {
    const x = DOMAIN.x0 + .6 + (ix + .5 + (hash(ix + 10, iz) - .5) * .78) * spacing
    const z = -31.5 + (iz + .5 + (hash(ix, iz + 70) - .5) * .78) * spacing
    if (x > DOMAIN.x1 - .6 || z > coastZ(x) - 1.2 || waterReserved(x, z)) continue
    if (z < -26 && Math.abs(x - upperX(z)) < 1.9) continue
    if (((x + 6.1) / 2.0) ** 2 + ((z + 15.69) / 1.55) ** 2 < 1) continue
    // Fresh mountain-front gravels are kept exposed so the fan remains legible.
    if (fanAmount(x, z, matureState) > .18) continue
    const y = rawHeight(x, z)
    if (y < DOMAIN.sea + .22 || y > 11) continue
    const sample = .28
    const dx = (rawHeight(x + sample, z) - rawHeight(x - sample, z)) / (2 * sample)
    const dz = (rawHeight(x, z + sample) - rawHeight(x, z - sample)) / (2 * sample)
    const slope = Math.hypot(dx, dz)
    if (slope > .92) continue
    const cluster = noise(x * .19 + 61, z * .19 - 12) * .64
      + noise(x * .57 - 19, z * .57 + 36) * .36
    const elevationLimit = 1 - smooth(8.4, 11, y)
    const score = cluster * .69 + hash(ix + 174, iz - 81) * .28
      + (1 - smooth(-14, 8, z)) * .08 + elevationLimit * .035 - slope * .035
    const height = .65 + hash(ix + 87, iz + 241) ** .74
      * (1 - smooth(7, 11, y) * .37)
    locations.push({
      x, z, height,
      width: height * (.66 + hash(ix - 9, iz + 132) * .16),
      rotation: hash(ix + 5, iz - 22) * Math.PI * 2,
      score,
    })
  }
  locations.sort((a, b) => b.score - a.score)
  return locations.slice(0, 2300)
}

function channelClearance(x: number, z: number, points: ChannelPoint[]): number {
  let clearance = Infinity
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz
    const t = length > .000001 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / length) : 0
    clearance = Math.min(clearance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz)
      - (a.width + (b.width - a.width) * t))
  }
  return clearance
}

function chooseDeltaLocations(): TreeLocation[] {
  const mature = evolution(1), main = riverPoints(mature), branches = deltaPoints(mature)
  const locations: TreeLocation[] = []
  for (let iz = 0; iz < 24; iz++) for (let ix = 0; ix < 41; ix++) {
    const x = -6.4 + (ix + hash(ix + 391, iz + 69) * .75) * .32
    const z = 21.35 + (iz + hash(ix - 211, iz + 793) * .75) * .32
    if (deltaAmount(x, z, mature) <= .55) continue
    const width = .32 + hash(ix + 41, iz - 302) * .30
    const canopyRadius = width * .52
    if (channelClearance(x, z, main) <= .4 + canopyRadius) continue
    if (branches.some((branch) => channelClearance(x, z, branch) <= .28 + canopyRadius)) continue
    const patch = noise(x * .73 + 121, z * .81 - 39) * .75
      + noise(x * 1.67 - 17, z * 1.49 + 43) * .25
    locations.push({
      x, z, width,
      height: .18 + hash(ix + 841, iz + 741) * .24,
      rotation: hash(ix - 212, iz + 678) * Math.PI * 2,
      score: patch * .80 + hash(ix - 764, iz + 87) * .20,
    })
  }
  locations.sort((a, b) => b.score - a.score)
  return locations.slice(0, 170)
}

/** Low plants establish only on emerged ground, after sediment has accumulated. */
function deltaShrubGrowth(field: Field, shrub: TreeLocation): number {
  const radius = shrub.width * .52
  let lowestGround = Infinity
  for (const [ox, oz] of [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]) {
    const x = shrub.x + ox!, z = shrub.z + oz!
    lowestGround = Math.min(lowestGround, fieldHeight(field, x, z))
    const ix = clamp(Math.round((x - DOMAIN.x0) / field.dx), 0, field.nx)
    const iz = clamp(Math.round((z - DOMAIN.z0) / field.dz), 0, field.nz)
    const k = iz * (field.nx + 1) + ix
    const gridAllowance = Math.hypot(field.dx, field.dz) * .75
    const clearance = (z <= 22.5 ? .4 : .28) + gridAllowance
    if (field.wet[k]! > .01 && field.distance[k]! - field.width[k]! <= clearance) return 0
  }
  return smooth(DOMAIN.sea + .12, DOMAIN.sea + .30, lowestGround)
}

export function createAlpineForest(field: Field, cultivatedGround?: (x: number, z: number) => number): AlpineForest {
  const group = new THREE.Group()
  group.name = 'Alpine spruce forest'
  group.visible = false
  let disposed = false
  let texture: THREE.CanvasTexture | null = null
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: .24,
    roughness: .95,
    metalness: 0,
    alphaTest: .33,
    alphaToCoverage: true,
    transparent: false,
    side: THREE.DoubleSide,
  })
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>', /* glsl */ `
        #include <normal_fragment_begin>
        // Reverse Three's back-face flip for the volume-like canopy normals:
        // both sides of a photo card must still receive light from the sky.
        #ifdef DOUBLE_SIDED
          normal *= faceDirection;
        #endif
      `,
    )
  }
  material.customProgramCacheKey = () => 'alpine-spruce-canopy-lighting-1'
  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaTest: .33,
    side: THREE.DoubleSide,
  })
  const distanceMaterial = new THREE.MeshDistanceMaterial({
    alphaTest: .33,
    side: THREE.DoubleSide,
  })
  const sourceTexture = new THREE.TextureLoader().load(
    '/geo-resources-folder/images/alpine-spruce-keyed.png',
    (loaded) => {
      if (disposed) { loaded.dispose(); return }
      texture = createFoliageTexture(loaded.image as HTMLImageElement)
      // A little of the photographed needle color fills shadowed branches. The
      // image, not a solid emissive color, retains the canopy's internal shading.
      material.emissiveMap = texture
      for (const target of [material, depthMaterial, distanceMaterial]) {
        target.map = texture
        target.needsUpdate = true
      }
      loaded.dispose()
      group.visible = true
    },
  )
  const locations = chooseLocations()
  const geometry = createCrossedCards()
  const trees = new THREE.InstancedMesh(geometry, material, locations.length)
  trees.name = 'Photo spruce canopy'
  trees.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  trees.castShadow = true
  trees.receiveShadow = false
  trees.customDepthMaterial = depthMaterial
  trees.customDistanceMaterial = distanceMaterial
  const tint = new THREE.Color()
  for (let i = 0; i < locations.length; i++) {
    const value = .83 + hash(i, 562) * .17
    tint.setRGB(value * (.95 + hash(i, 83) * .05), value, value * .93)
    trees.setColorAt(i, tint)
  }
  group.add(trees)
  group.userData.treeCount = locations.length
  const shrubLocations = chooseDeltaLocations()
  const shrubs = new THREE.InstancedMesh(geometry, material, shrubLocations.length)
  shrubs.name = 'Emergent delta scrub patches'
  shrubs.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  shrubs.castShadow = true
  shrubs.receiveShadow = false
  shrubs.customDepthMaterial = depthMaterial
  shrubs.customDistanceMaterial = distanceMaterial
  group.add(shrubs)
  group.userData.shrubCount = shrubLocations.length
  const matrix = new THREE.Object3D()
  function update() {
    if (disposed) return
    for (let i = 0; i < locations.length; i++) {
      const tree = locations[i]!
      const y = fieldHeight(field, tree.x, tree.z)
      matrix.position.set(tree.x, y - .012, tree.z)
      matrix.rotation.set(0, tree.rotation, 0)
      const retained = 1 - clamp(cultivatedGround?.(tree.x, tree.z) ?? 0)
      matrix.scale.set(tree.width * retained, tree.height * retained, tree.width * retained)
      matrix.updateMatrix()
      trees.setMatrixAt(i, matrix.matrix)
    }
    trees.instanceMatrix.needsUpdate = true
    trees.computeBoundingSphere()
    let emerged = 0
    for (const shrub of shrubLocations) {
      const growth = deltaShrubGrowth(field, shrub)
      if (growth <= .002) continue
      matrix.position.set(shrub.x, fieldHeight(field, shrub.x, shrub.z) - .006, shrub.z)
      matrix.rotation.set(0, shrub.rotation, 0)
      matrix.scale.set(shrub.width * growth, shrub.height * growth, shrub.width * growth)
      matrix.updateMatrix()
      shrubs.setMatrixAt(emerged, matrix.matrix)
      tint.setRGB(.92, .96, .78)
      shrubs.setColorAt(emerged, tint)
      emerged++
    }
    shrubs.count = emerged
    shrubs.instanceMatrix.needsUpdate = true
    if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true
    shrubs.computeBoundingSphere()
    group.userData.emergedShrubCount = emerged
  }
  update()
  return {
    group,
    update,
    dispose() {
      if (disposed) return
      disposed = true
      group.removeFromParent()
      trees.dispose()
      shrubs.dispose()
      geometry.dispose()
      material.dispose()
      depthMaterial.dispose()
      distanceMaterial.dispose()
      sourceTexture.dispose()
      texture?.dispose()
    },
  }
}
