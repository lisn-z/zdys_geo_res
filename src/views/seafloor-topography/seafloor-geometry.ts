import * as THREE from 'three'
import { LANDFORMS, PALETTE, WORLD, profileY, type LandformId } from './seafloor-data.ts'

export const GRID = { nx: 256, nz: 128 } as const

function hash(ix: number, iz: number): number {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return (((h ^ (h >> 16)) >>> 0) / 4294967295) * 2 - 1
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const tx = smooth(x - ix)
  const tz = smooth(z - iz)
  const a = hash(ix, iz)
  const b = hash(ix + 1, iz)
  const c = hash(ix, iz + 1)
  const d = hash(ix + 1, iz + 1)
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz
}

function fbm(x: number, z: number, octaves: number): number {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, z * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

function bandMask(fx: number, id: LandformId, feather = 0.02): number {
  const def = LANDFORMS.find((item) => item.id === id)!
  const up = smooth((fx - (def.x0 - feather)) / (feather * 2))
  const down = 1 - smooth((fx - (def.x1 - feather)) / (feather * 2))
  return up * down
}

const ARC_CONES: ReadonlyArray<readonly [number, number, number]> = [
  [0.432, -0.55, 0.9],
  [0.444, -0.15, 1.15],
  [0.452, 0.25, 1.0],
  [0.462, 0.62, 0.8],
]

function coneHeight(fx: number, fz: number): number {
  let h = 0
  for (const [cx, cz, ch] of ARC_CONES) {
    const dx = (fx - cx) * WORLD.length
    const dz = (fz - cz) * (WORLD.width / 2)
    h += ch * Math.exp(-(dx * dx + dz * dz) * 0.5)
  }
  return h
}

function ridged(x: number, z: number): number {
  return (1 - Math.abs(valueNoise(x * 30, z * 10))) * 0.6 - 0.3
}

export function terrainHeight(fx: number, fz: number): number {
  const x = Math.min(1, Math.max(0, fx))
  const z = Math.min(1, Math.max(-1, fz))
  let y = profileY(x)
  const land = x < WORLD.shoreFx ? 1 : 0
  const slope = bandMask(x, 'slope')
  const basin = bandMask(x, 'basin')
  const ridge = bandMask(x, 'ridge')
  y += land * fbm(x * 26, z * 7, 3) * 0.16
  y += slope * Math.sin(z * 26 + fbm(x * 40, z * 8, 2) * 2.2) * 0.22
  y += basin * fbm(x * 34, z * 12, 3) * 0.16
  y += ridge * (ridged(x, z) * 0.4 + Math.sin(z * 18) * 0.08)
  y += bandMask(x, 'arc', 0.012) * coneHeight(x, z)
  return y
}

const COLOR_LAND = new THREE.Color(PALETTE.land)
const COLOR_SHELF = new THREE.Color(PALETTE.shelf)
const COLOR_SLOPE = new THREE.Color(PALETTE.slope)
const COLOR_BASIN = new THREE.Color(PALETTE.basin)
const COLOR_RIDGE = new THREE.Color(PALETTE.ridge)
const COLOR_TRENCH = new THREE.Color(PALETTE.trench)
const COLOR_CUT = new THREE.Color(PALETTE.cut)

function colorFor(fx: number, y: number, out: THREE.Color): void {
  if (fx < WORLD.shoreFx) {
    out.copy(COLOR_LAND)
    return
  }
  if (y > -1) {
    out.copy(COLOR_SHELF)
    return
  }
  const t = Math.min(1, Math.max(0, (y + 6) / 4))
  out.copy(COLOR_BASIN).lerp(COLOR_SLOPE, t)
  const ridge = bandMask(fx, 'ridge')
  if (ridge > 0) {
    out.lerp(COLOR_RIDGE, ridge * 0.7)
  }
  const trench = bandMask(fx, 'trench', 0.012)
  if (trench > 0) {
    out.lerp(COLOR_TRENCH, trench * 0.85)
  }
}

export function createTerrainGeometry(): THREE.BufferGeometry {
  const { nx, nz } = GRID
  const count = (nx + 1) * (nz + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const indices: number[] = []
  const color = new THREE.Color()
  let v = 0
  for (let i = 0; i <= nx; i++) {
    const fx = i / nx
    for (let j = 0; j <= nz; j++) {
      const fz = (j / nz) * 2 - 1
      const y = terrainHeight(fx, fz)
      positions[v * 3] = fx * WORLD.length
      positions[v * 3 + 1] = y
      positions[v * 3 + 2] = fz * (WORLD.width / 2)
      colorFor(fx, y, color)
      colors[v * 3] = color.r
      colors[v * 3 + 1] = color.g
      colors[v * 3 + 2] = color.b
      v++
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j
      const b = a + nz + 1
      const d = a + 1
      const e = b + 1
      indices.push(a, d, b, b, d, e)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function createCutFacesGeometry(): THREE.BufferGeometry {
  const { nx, nz } = GRID
  const positions: number[] = []
  const colors: number[] = []
  const push = (x: number, y: number, z: number): void => {
    positions.push(x, y, z)
    colors.push(COLOR_CUT.r, COLOR_CUT.g, COLOR_CUT.b)
  }
  const halfW = WORLD.width / 2
  for (let i = 0; i < nx; i++) {
    const fx0 = i / nx
    const fx1 = (i + 1) / nx
    const x0 = fx0 * WORLD.length
    const x1 = fx1 * WORLD.length
    const t0 = terrainHeight(fx0, 1)
    const t1 = terrainHeight(fx1, 1)
    push(x0, t0, halfW)
    push(x0, WORLD.bottom, halfW)
    push(x1, t1, halfW)
    push(x1, t1, halfW)
    push(x0, WORLD.bottom, halfW)
    push(x1, WORLD.bottom, halfW)
  }
  for (let j = 0; j < nz; j++) {
    const fz0 = (j / nz) * 2 - 1
    const fz1 = ((j + 1) / nz) * 2 - 1
    const z0 = fz0 * halfW
    const z1 = fz1 * halfW
    const t0 = terrainHeight(0, fz0)
    const t1 = terrainHeight(0, fz1)
    push(0, t0, z0)
    push(0, WORLD.bottom, z0)
    push(0, t1, z1)
    push(0, t1, z1)
    push(0, WORLD.bottom, z0)
    push(0, WORLD.bottom, z1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createWaterGeometry(): THREE.BufferGeometry {
  const length = WORLD.length * (1 - WORLD.shoreFx)
  const geometry = new THREE.PlaneGeometry(length, WORLD.width, 1, 1)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(WORLD.length * (1 + WORLD.shoreFx) / 2, 0, 0)
  return geometry
}
