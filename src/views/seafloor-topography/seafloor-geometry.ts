import * as THREE from 'three'
import { WORLD, type LandformId } from './seafloor-data.ts'

/** A continuous, vertically exaggerated teaching model, not measured bathymetry. */
export const GRID = { nx: 384, nz: 192 } as const
const clamp = (n: number, a = 0, b = 1): number => Math.max(a, Math.min(b, n))
const smooth = (n: number): number => { const t = clamp(n); return t * t * (3 - 2 * t) }
const band = (x: number, a: number, b: number, feather = 0.02): number =>
  smooth((x - a + feather) / (2 * feather)) * (1 - smooth((x - b + feather) / (2 * feather)))
function hash(x: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1
}
function noise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z), tx = smooth(x - ix), tz = smooth(z - iz)
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1)
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz
}
function fbm(x: number, z: number, octaves = 4): number {
  let sum = 0, amplitude = 0.5, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise(x, z) * amplitude; norm += amplitude
    x = x * 2.03 + 13.2; z = z * 2.03 + 7.1; amplitude *= 0.48
  }
  return sum / norm
}

// The island arc and oceanic trench share broad curvature, with trench seaward of arc.
export function arcAxis(fz: number): number { return 0.442 + 0.021 * (1 - fz * fz) + 0.003 * Math.sin(fz * 3) }
export function trenchAxis(fz: number): number { return arcAxis(fz) + 0.063 }
export function ridgeAxis(fz: number): number {
  return 0.855 + 0.009 * Math.sin(fz * 2.9) + 0.0045 * Math.tanh(Math.sin(fz * 8) * 5)
}
const BASE_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 1.25], [0.075, 1.07], [0.13, 0.70], [0.16, 0], [0.23, -0.22],
  [0.295, -0.46], [0.325, -1.05], [0.38, -2.80], [0.425, -3.70],
  [0.48, -4.25], [0.56, -4.92], [0.76, -4.94], [1, -4.95],
]
// Shape-preserving Hermite slopes avoid overshooting shallow shelf or flat basin keys.
const TANGENTS = BASE_PROFILE.map((p, i) => {
  const prev = BASE_PROFILE[Math.max(0, i - 1)]!, next = BASE_PROFILE[Math.min(BASE_PROFILE.length - 1, i + 1)]!
  if (i === 0 || i === BASE_PROFILE.length - 1) return (next[1] - prev[1]) / (next[0] - prev[0])
  const d0 = (p[1] - prev[1]) / (p[0] - prev[0]), d1 = (next[1] - p[1]) / (next[0] - p[0])
  return d0 * d1 <= 0 ? 0 : 2 * d0 * d1 / (d0 + d1)
})
function baseHeight(x: number): number {
  if (x <= 0) return BASE_PROFILE[0]![1]
  for (let i = 1; i < BASE_PROFILE.length; i++) {
    const a = BASE_PROFILE[i - 1]!, b = BASE_PROFILE[i]!
    if (x > b[0]) continue
    const width = b[0] - a[0], t = (x - a[0]) / width, t2 = t * t, t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * width * TANGENTS[i - 1]!
      + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * width * TANGENTS[i]!
  }
  return BASE_PROFILE[BASE_PROFILE.length - 1]![1]
}
const ISLANDS = [
  { z: -0.73, r: 0.93, lift: 4.20, skew: -0.19 },
  { z: -0.20, r: 1.12, lift: 5.35, skew: 0.14 },
  { z: 0.35, r: 1.06, lift: 5.13, skew: -0.11 },
  { z: 0.83, r: 0.81, lift: 4.30, skew: 0.19 },
] as const

export function terrainHeight(fx: number, fz: number): number {
  const x = Number.isFinite(fx) ? clamp(fx) : 0, z = Number.isFinite(fz) ? clamp(fz, -1, 1) : 0
  const wx = x * WORLD.length, wz = z * WORLD.width / 2
  const coastWarp = (0.007 * Math.sin(z * 5.2) + 0.004 * noise(z * 8, 2)) * (1 - smooth((x - 0.22) / 0.18))
  const px = clamp(x - coastWarp)
  let y = baseHeight(px)
  const continental = 1 - smooth((px - 0.115) / 0.050)
  y += continental * (0.38 * fbm(wx * 0.65, wz * 0.43) + 0.12 * fbm(wx * 2.1, wz * 1.1, 3))
  y += band(px, 0.165, 0.30, 0.012) * (0.026 * fbm(wx * 1.9, wz * 0.9, 3) + 0.010 * Math.sin(wx * 6 + wz * 1.1))
  // Branching incised submarine canyons, running downhill instead of repeated round bumps.
  const phase = wz * 3.6 + noise(wx * 0.7, wz * 0.8) * 1.2 + Math.sin(wx * 0.8) * 0.45
  const channels = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(phase))), 5)
  y += band(px, 0.305, 0.423, 0.018) * (-0.29 * channels + 0.09 * fbm(wx * 2.8, wz * 2.0, 3))
  // Distinct irregular volcanoes on a curved submarine apron; only small summits emerge.
  const arcDistance = (x - arcAxis(z)) * WORLD.length
  y += 0.25 * Math.exp(-(arcDistance * arcDistance) / 0.9)
  for (const island of ISLANDS) {
    const dz = (z - island.z) * WORLD.width / 2, dx = (x - arcAxis(island.z)) * WORLD.length + island.skew * dz
    const radius = Math.hypot(dx / island.r, dz / (island.r * 1.05))
    if (radius > 3.4) continue
    const irregular = 1 + 0.11 * fbm(wx * 3.5, wz * 3.5, 3)
    const cone = island.lift * Math.exp(-Math.pow(radius * irregular, 1.56) * 1.45)
    const gullies = 0.11 * Math.sin(Math.atan2(dz, dx) * 11 + radius * 3) * smooth(radius * 4) * Math.exp(-radius * 1.8)
    y += cone + gullies - 0.17 * Math.exp(-radius * radius / 0.008)
  }
  // Curved, continuous, narrow and asymmetric trench, open in the front section.
  const td = x - trenchAxis(z), tw = (td < 0 ? 0.0140 : 0.0190) * (1 + 0.09 * Math.sin(z * 5.6))
  y -= (3.10 + 0.12 * Math.sin(z * 4.3)) * Math.exp(-Math.pow(Math.abs(td) / tw, 1.38))
  y += band(x, 0.55, 0.78) * (0.055 * fbm(wx * 0.7, wz * 0.8, 4) + 0.017 * fbm(wx * 5, wz * 4, 2))
  // A low isolated seamount occupies the distant part of the otherwise flat basin.
  const seamount = Math.hypot((x - 0.707) * WORLD.length / 0.58, (z + 0.61) * WORLD.width / 2 / 0.72)
  y += 0.72 * Math.exp(-Math.pow(seamount, 1.55) * 1.8)
  // Broad spreading ridge: asymmetric broken crest, central rift and transverse fault valleys.
  const rd = (x - ridgeAxis(z)) * WORLD.length, envelope = Math.exp(-Math.pow(Math.abs(rd) / 1.45, 1.65))
  const rift = 0.58 * Math.exp(-(rd * rd) / 0.031)
  const fault = Math.pow(1 - Math.abs(Math.sin(z * 8)), 14)
  y += envelope * (2.62 + 0.17 * fbm(wz * 1.8, wx * 0.65, 3) + 0.30 * fbm(wx * 3.4 + 0.4 * Math.sin(wz * 2), wz * 1.5, 4) - 0.38 * fault) - rift
  return y * 0.78
}

export function getLandformAnchor(id: LandformId): { fx: number; fz: number } {
  switch (id) {
    case 'shelf': return { fx: 0.235, fz: -0.22 }
    case 'slope': return { fx: 0.363, fz: -0.25 }
    case 'arc': return { fx: arcAxis(-0.20), fz: -0.20 }
    case 'trench': return { fx: trenchAxis(0.08), fz: 0.08 }
    case 'basin': return { fx: 0.667, fz: -0.25 }
    case 'ridge': return { fx: ridgeAxis(-0.18) - 0.016, fz: -0.18 }
  }
}
export function landformAtPoint(fx: number, fz: number): LandformId | null {
  if (fx < 0.16 || fx > 1 || Math.abs(fz) > 1) return null
  if (Math.abs(fx - trenchAxis(fz)) < 0.030) return 'trench'
  if (Math.abs(fx - arcAxis(fz)) < 0.034) return 'arc'
  if (fx < 0.30) return 'shelf'
  if (fx < 0.423) return 'slope'
  if (Math.abs(fx - ridgeAxis(fz)) < 0.085) return 'ridge'
  return 'basin'
}
const LAND = new THREE.Color('#787b5e'), SOIL = new THREE.Color('#9b8b72'), SAND = new THREE.Color('#c7bea3')
const SEDIMENT = new THREE.Color('#aba89c'), ROCK = new THREE.Color('#77766e'), BASALT = new THREE.Color('#696c68')
function surfaceColor(x: number, z: number, y: number, out: THREE.Color): void {
  const texture = fbm(x * 85, z * 29, 3)
  if (y >= -0.20) {
    out.copy(SAND).lerp(LAND, smooth((y + 0.20) / 0.65) * 0.88)
    out.lerp(SOIL, smooth(texture * 2 + 0.35) * 0.34)
    if (x > 0.35) out.lerp(ROCK, smooth((y - 0.25) / 0.8) * 0.60)
  } else {
    out.copy(SAND).lerp(SEDIMENT, smooth((-y - 0.3) / 2.8))
    out.lerp(ROCK, clamp(band(x, 0.31, 0.43) * 0.30 + Math.exp(-Math.pow((x - arcAxis(z)) / 0.025, 2)) * 0.55))
    out.lerp(BASALT, Math.exp(-Math.pow((x - ridgeAxis(z)) / 0.043, 2)) * 0.78)
    out.lerp(ROCK, Math.exp(-Math.pow((x - trenchAxis(z)) / 0.018, 2)) * 0.30)
  }
  out.multiplyScalar(0.94 + texture * 0.11 + noise(x * WORLD.length * 0.72, z * WORLD.width * 0.265) * 0.045)
}

export function createTerrainGeometry(): THREE.BufferGeometry {
  const { nx, nz } = GRID, count = (nx + 1) * (nz + 1)
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), uvs = new Float32Array(count * 2)
  const indices = new Uint32Array(nx * nz * 6), color = new THREE.Color()
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = i / nx, z = j / nz * 2 - 1, v = i * (nz + 1) + j, y = terrainHeight(x, z)
    positions.set([x * WORLD.length, y, z * WORLD.width / 2], v * 3)
    uvs.set([x * WORLD.length / 2.5, z * WORLD.width / 5], v * 2)
    surfaceColor(x, z, y, color); colors.set([color.r, color.g, color.b], v * 3)
  }
  let k = 0
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = i * (nz + 1) + j, b = a + nz + 1, d = a + 1, e = b + 1
    indices.set([a, d, b, b, d, e], k); k += 6
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}

/** All four section faces and base share the exact edge samples of the upper mesh. */
export function createCutFacesGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], colors: number[] = []
  const push = (x: number, y: number, z: number, u: number): void => {
    positions.push(x, y, z); uvs.push(u / 4, (y - WORLD.bottom) / 3); colors.push(1, 1, 1)
  }
  const face = (a: [number, number, number], b: [number, number, number], u0: number, u1: number): void => {
    push(...a, u0); push(a[0], WORLD.bottom, a[2], u0); push(...b, u1)
    push(...b, u1); push(a[0], WORLD.bottom, a[2], u0); push(b[0], WORLD.bottom, b[2], u1)
    // One base triangle per wall segment: no long base edge meeting subdivided wall edges.
    push(WORLD.length / 2, WORLD.bottom, 0, WORLD.length / 2)
    push(b[0], WORLD.bottom, b[2], u1); push(a[0], WORLD.bottom, a[2], u0)
  }
  const hw = WORLD.width / 2
  for (let i = 0; i < GRID.nx; i++) {
    const x0 = i / GRID.nx, x1 = (i + 1) / GRID.nx
    face([x0 * WORLD.length, terrainHeight(x0, 1), hw], [x1 * WORLD.length, terrainHeight(x1, 1), hw], x0 * WORLD.length, x1 * WORLD.length)
    face([x1 * WORLD.length, terrainHeight(x1, -1), -hw], [x0 * WORLD.length, terrainHeight(x0, -1), -hw], x1 * WORLD.length, x0 * WORLD.length)
  }
  for (let j = 0; j < GRID.nz; j++) {
    const z0 = j / GRID.nz * 2 - 1, z1 = (j + 1) / GRID.nz * 2 - 1
    face([0, terrainHeight(0, z0), z0 * hw], [0, terrainHeight(0, z1), z1 * hw], z0 * hw, z1 * hw)
    face([WORLD.length, terrainHeight(1, z1), z1 * hw], [WORLD.length, terrainHeight(1, z0), z0 * hw], z1 * hw, z0 * hw)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals(); return geometry
}
type WaterPoint = { x: number; z: number; height: number }

function waterSamples(): WaterPoint[] {
  const samples: WaterPoint[] = []
  const { nx, nz } = GRID
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const fx = i / nx, fz = j / nz * 2 - 1
    samples.push({ x: fx * WORLD.length, z: fz * WORLD.width / 2, height: terrainHeight(fx, fz) })
  }
  return samples
}

function shoreIntersection(p: WaterPoint, q: WaterPoint): WaterPoint {
  // Canonical edge order gives bit-identical shore intersections from adjacent triangles.
  const a = p.x < q.x || (p.x === q.x && p.z < q.z) ? p : q
  const b = a === p ? q : p
  const t = (WORLD.waterY - a.height) / (b.height - a.height)
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, height: WORLD.waterY }
}

function forEachWetTriangle(samples: WaterPoint[], emit: (a: WaterPoint, b: WaterPoint, c: WaterPoint) => void): void {
  const { nx, nz } = GRID
  const clip = (triangle: WaterPoint[]): void => {
    const polygon: WaterPoint[] = []
    for (let i = 0; i < 3; i++) {
      const p = triangle[i]!, q = triangle[(i + 1) % 3]!, pWet = p.height <= WORLD.waterY, qWet = q.height <= WORLD.waterY
      if (pWet) polygon.push(p)
      if (pWet !== qWet) polygon.push(shoreIntersection(p, q))
    }
    for (let i = 1; i < polygon.length - 1; i++) emit(polygon[0]!, polygon[i]!, polygon[i + 1]!)
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = i * (nz + 1) + j, b = a + nz + 1, d = a + 1, e = b + 1
    clip([samples[a]!, samples[d]!, samples[b]!]); clip([samples[b]!, samples[d]!, samples[e]!])
  }
}

/** Water is clipped against the same terrain triangles, including all island shorelines. */
export function createWaterGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], depths: number[] = []
  forEachWetTriangle(waterSamples(), (a, b, c) => {
    for (const p of [a, b, c]) {
      positions.push(p.x, WORLD.waterY, p.z); uvs.push(p.x / 7, p.z / 7)
      depths.push(Math.max(0, WORLD.waterY - p.height))
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('aWaterDepth', new THREE.Float32BufferAttribute(depths, 1))
  geometry.computeVertexNormals(); return geometry
}

/**
 * Closed water solid, sharing the exact top shoreline and submerged terrain triangles.
 * Groups: 0 = visible perimeter walls; 1 = hidden seabed; 2 = hidden sea-level cap.
 * Keep groups 1/2 geometrically present but render with invisible material: the existing
 * terrain and separate water surface already render those coincident boundaries.
 */
export function createWaterVolumeGeometry(): THREE.BufferGeometry {
  const samples = waterSamples(), positions: number[] = [], uvs: number[] = []
  const { nx, nz } = GRID
  const push = (p: WaterPoint, y: number): void => { positions.push(p.x, y, p.z); uvs.push((p.x + p.z) / 7, y / 7) }
  const wall = (rawA: WaterPoint, rawB: WaterPoint): void => {
    if (rawA.height >= WORLD.waterY && rawB.height >= WORLD.waterY) return
    const a = rawA.height > WORLD.waterY ? shoreIntersection(rawA, rawB) : rawA
    const b = rawB.height > WORLD.waterY ? shoreIntersection(rawA, rawB) : rawB
    // Collapsed triangle at a shoreline endpoint is omitted rather than left degenerate.
    if (a.height < WORLD.waterY) { push(a, WORLD.waterY); push(a, a.height); push(b, WORLD.waterY) }
    if (b.height < WORLD.waterY) { push(b, WORLD.waterY); push(a, a.height); push(b, b.height) }
  }
  for (let i = 0; i < nx; i++) {
    wall(samples[i * (nz + 1) + nz]!, samples[(i + 1) * (nz + 1) + nz]!)
    wall(samples[(i + 1) * (nz + 1)]!, samples[i * (nz + 1)]!)
  }
  for (let j = 0; j < nz; j++) {
    wall(samples[j]!, samples[j + 1]!)
    wall(samples[nx * (nz + 1) + j + 1]!, samples[nx * (nz + 1) + j]!)
  }
  const sidesCount = positions.length / 3
  forEachWetTriangle(samples, (a, b, c) => { push(c, c.height); push(b, b.height); push(a, a.height) })
  const floorCount = positions.length / 3 - sidesCount
  forEachWetTriangle(samples, (a, b, c) => { push(a, WORLD.waterY); push(b, WORLD.waterY); push(c, WORLD.waterY) })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.addGroup(0, sidesCount, 0)
  geometry.addGroup(sidesCount, floorCount, 1)
  geometry.addGroup(sidesCount + floorCount, positions.length / 3 - sidesCount - floorCount, 2)
  geometry.computeVertexNormals(); geometry.computeBoundingSphere()
  return geometry
}
