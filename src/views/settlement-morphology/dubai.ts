import * as THREE from 'three'
import type { Placement, SiteResult } from './types'
import { createSettlementWater } from './water'
import { createDubaiEvolution } from './dubai-evolution'

/** Textbook p.122, figs.5-24/25/26. This is a comparison model, not a street map. */
const WATER_LEVEL = 0.28
const BOTTOM = -1.2
const hash = (a: number, b: number) => {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return value - Math.floor(value)
}
const shoreline = (x: number, z: number) => {
  // An open coastal inlet, not a named lake or a reconstruction of Dubai Creek.
  // The rounded inland head opens continuously toward the front cut boundary.
  const halfWidth = 6.3 + Math.max(0, z - 4.7) * .16
  const inlet = (Math.hypot((x - 1.7) / halfWidth, Math.min(0, z - 4.7) / 3.15) - 1) * 3.15
  const channel = Math.abs(z - (4.9 + Math.sin(x * 0.19) * 0.6)) - 1.02
  return Math.min(inlet, x < -2.5 ? channel : 30)
}
function heightAt(x: number, z: number): number {
  const distance = shoreline(x, z)
  const dry = THREE.MathUtils.clamp(distance / 0.85, 0, 1)
  return WATER_LEVEL + THREE.MathUtils.clamp(distance * 0.48, -0.34, 0.34)
    + dry * (Math.sin(x * 0.18) * Math.cos(z * 0.2) * 0.025)
}
function site(x: number, z: number): SiteResult {
  const samples = [[-.62, -.57], [.62, -.57], [-.62, .57], [.62, .57], [0, 0]]
  const heights = samples.map(([dx, dz]) => heightAt(x + dx!, z + dz!))
  const result = { valid: true, reason: '平坦的滨海沙地（教学示意）', height: Math.min(...heights), slope: Math.max(...heights) - Math.min(...heights), nearWater: shoreline(x, z) < 3.7 }
  if (Math.abs(x) > 16.5 || Math.abs(z) > 10.7) return { ...result, valid: false, reason: '请在地块内部观察。' }
  if (samples.some(([dx, dz]) => shoreline(x + dx!, z + dz!) < 0.25)) return { ...result, valid: false, reason: '这里是水域与岸线。' }
  return result.slope > 0.12 ? { ...result, valid: false, reason: '请避开岸边坡面。' } : result
}

function grainTexture(kind: 'sand' | 'stone' | 'glass'): THREE.DataTexture {
  const size = 256
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const random = hash(x, y)
    const index = (y * size + x) * 4
    let r: number, g: number, b: number
    if (kind === 'glass') {
      const mullion = x % 21 < 2 || y % 13 < 1
      const pane = hash(Math.floor(x / 21), Math.floor(y / 13))
      const light = mullion ? 0.51 : 0.76 + pane * 0.23
      r = 138 * light; g = 167 * light; b = 177 * light
    } else {
      const ripple = Math.sin(y * 0.23 + Math.sin(x * 0.047) * 2.4) * (kind === 'sand' ? 7 : 2)
      const value = 211 + (random - 0.5) * 31 + ripple
      r = value; g = value * 0.96; b = value * 0.86
    }
    pixels[index] = r; pixels[index + 1] = g; pixels[index + 2] = b; pixels[index + 3] = 255
  }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

export function createDubaiLandscape(): {
  group: THREE.Group
  terrain: THREE.Mesh
  constraints: THREE.Group
  labels: { id: string; text: string; position: THREE.Vector3 }[]
  samples: Placement[]
  site(x: number, z: number): SiteResult
  heightAt(x: number, z: number): number
  setGrowth(value: number): void
  update(time: number): void
  dispose(): void
} {
  const group = new THREE.Group()
  group.name = 'dubai-continuous-settlement-evolution'
  const constraints = new THREE.Group()
  constraints.visible = false
  group.add(constraints)
  const sandMap = grainTexture('sand'); sandMap.repeat.set(13, 9)
  const stoneMap = grainTexture('stone')
  const sand = new THREE.MeshStandardMaterial({ color: '#d4c39f', map: sandMap, roughness: 0.97 })
  const earth = new THREE.MeshStandardMaterial({ color: '#a58d67', map: stoneMap, roughness: 1 })
  const allMaterials = [sand, earth]
  const topGeometry = new THREE.PlaneGeometry(36, 24, 180, 120)
  topGeometry.rotateX(-Math.PI / 2)
  const topPositions = topGeometry.getAttribute('position')
  for (let i = 0; i < topPositions.count; i++) topPositions.setY(i, heightAt(topPositions.getX(i), topPositions.getZ(i)))
  topGeometry.computeVertexNormals()
  const terrain = new THREE.Mesh(topGeometry, sand)
  terrain.receiveShadow = true
  group.add(terrain)

  const wallPositions: number[] = [], wallIndices: number[] = []
  const boundary: [number, number][] = []
  for (let i = 0; i < 144; i++) boundary.push([-18 + i * .25, -12])
  for (let i = 0; i < 96; i++) boundary.push([18, -12 + i * .25])
  for (let i = 0; i < 144; i++) boundary.push([18 - i * .25, 12])
  for (let i = 0; i < 96; i++) boundary.push([-18, 12 - i * .25])
  boundary.forEach(([x, z], i) => {
    wallPositions.push(x, heightAt(x, z), z, x, BOTTOM, z)
    const next = (i + 1) % boundary.length
    wallIndices.push(i * 2, next * 2, i * 2 + 1, next * 2, next * 2 + 1, i * 2 + 1)
  })
  const wallGeometry = new THREE.BufferGeometry()
  wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3))
  wallGeometry.setIndex(wallIndices); wallGeometry.computeVertexNormals()
  const side = new THREE.Mesh(wallGeometry, earth); side.castShadow = true; side.receiveShadow = true; group.add(side)
  const underside = new THREE.Mesh(new THREE.BoxGeometry(36, .08, 24), earth)
  underside.position.y = BOTTOM - .04; group.add(underside)

  const water = createSettlementWater('coast')
  const waterVertices: number[] = [], waterUv: number[] = [], waterDepth: number[] = []
  type SurfacePoint = { x: number; z: number; distance: number }
  function clipWater(points: SurfacePoint[]): void {
    const clipped: SurfacePoint[] = []
    for (let index = 0; index < points.length; index++) {
      const a = points[index]!, b = points[(index + 1) % points.length]!
      if (a.distance <= 0) clipped.push(a)
      if ((a.distance <= 0) !== (b.distance <= 0)) {
        let low = 0, high = 1
        for (let step = 0; step < 12; step++) {
          const middle = (low + high) / 2
          const distance = shoreline(THREE.MathUtils.lerp(a.x, b.x, middle), THREE.MathUtils.lerp(a.z, b.z, middle))
          if ((distance <= 0) === (a.distance <= 0)) low = middle
          else high = middle
        }
        const mix = (low + high) / 2
        clipped.push({ x: THREE.MathUtils.lerp(a.x, b.x, mix), z: THREE.MathUtils.lerp(a.z, b.z, mix), distance: 0 })
      }
    }
    for (let i = 1; i < clipped.length - 1; i++) for (const point of [clipped[0]!, clipped[i]!, clipped[i + 1]!]) {
      waterVertices.push(point.x, WATER_LEVEL, point.z)
      waterUv.push(point.x * .3, point.z * .3)
      waterDepth.push(Math.max(.015, WATER_LEVEL - heightAt(point.x, point.z)))
    }
  }
  for (let ix = 0; ix < 144; ix++) for (let iz = 0; iz < 96; iz++) {
    const corners = [[ix * .25 - 18, iz * .25 - 12], [(ix + 1) * .25 - 18, iz * .25 - 12], [(ix + 1) * .25 - 18, (iz + 1) * .25 - 12], [ix * .25 - 18, (iz + 1) * .25 - 12]]
      .map(([x, z]) => ({ x: x!, z: z!, distance: shoreline(x!, z!) }))
    clipWater([corners[0]!, corners[2]!, corners[1]!]); clipWater([corners[0]!, corners[3]!, corners[2]!])
  }
  const waterGeometry = new THREE.BufferGeometry()
  waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterVertices, 3))
  waterGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(waterUv, 2))
  waterGeometry.setAttribute('waterDepth', new THREE.Float32BufferAttribute(waterDepth, 1))
  waterGeometry.computeVertexNormals()
  const waterMesh = new THREE.Mesh(waterGeometry, water.material); waterMesh.receiveShadow = true; group.add(waterMesh)
  // At the cut edge, the water closes against its actual bed rather than floating above it.
  const closureVertices: number[] = []
  for (let z = -12; z < 12; z += .1) {
    if (shoreline(-18, z + .05) >= 0) continue
    const lowA = heightAt(-18, z), lowB = heightAt(-18, z + .1)
    closureVertices.push(-18, WATER_LEVEL, z, -18, lowA, z, -18, WATER_LEVEL, z + .1,
      -18, lowA, z, -18, lowB, z + .1, -18, WATER_LEVEL, z + .1)
  }
  for (let x = -18; x < 18; x += .1) {
    if (shoreline(x + .05, 12) >= 0) continue
    const lowA = heightAt(x, 12), lowB = heightAt(x + .1, 12)
    closureVertices.push(x, WATER_LEVEL, 12, x, lowA, 12, x + .1, WATER_LEVEL, 12,
      x, lowA, 12, x + .1, lowB, 12, x + .1, WATER_LEVEL, 12)
  }
  const closureGeometry = new THREE.BufferGeometry()
  closureGeometry.setAttribute('position', new THREE.Float32BufferAttribute(closureVertices, 3)); closureGeometry.computeVertexNormals()
  const closureMaterial = new THREE.MeshStandardMaterial({ color: '#477d86', roughness: .4, transparent: true, opacity: .92, side: THREE.DoubleSide })
  allMaterials.push(closureMaterial)
  group.add(new THREE.Mesh(closureGeometry, closureMaterial))

  const evolution = createDubaiEvolution({ heightAt, shoreline, waterLevel: WATER_LEVEL })
  group.add(evolution.group)
  const labels = evolution.labels
  const setGrowth = evolution.setGrowth
  let disposed = false
  return {
    group, terrain, constraints, labels, samples: [], site, heightAt, setGrowth,
    update(time) { if (!disposed) { water.update(time); evolution.update(time) } },
    dispose() {
      if (disposed) return
      disposed = true
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>(allMaterials)
      const textures = new Set<THREE.Texture>([sandMap, stoneMap])
      group.traverse(object => {
        if (object instanceof THREE.InstancedMesh) object.dispose()
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material !== water.material) materials.add(material)
      })
      for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
      evolution.dispose()
      water.dispose()
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose())
      group.clear()
    },
  }
}
