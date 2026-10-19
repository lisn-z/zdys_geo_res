import { createSpiralRoam } from './createSpiralRoam'
import { createPanoramaEcosystem } from './createPanoramaEcosystem'
import { createPanoramaVolcanism } from './createPanoramaVolcanism'
import { createHadeanOrigin } from './createHadeanOrigin'
import { createChronologyMarkers } from './createChronologyMarkers'
import { createOuterChronology } from './createOuterChronology'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { GeologicPeriod } from './periods'
import { assetUrl } from './periods'

export interface GeologicLabel {
  index: number
  x: number
  y: number
  visible: boolean
}

export interface SpiralRoamState {
  phase: 'idle' | 'playing' | 'paused' | 'finished'
  progress: number
  index: number
}

interface SceneCallbacks {
  onRoamState?: (state: SpiralRoamState) => void
  onFocusOrbitChange?: (enabled: boolean) => void
  onSelect: (index: number) => void
  onLabels: (labels: GeologicLabel[]) => void
  onMilestones?: (labels: (GeologicLabel & { age: string; unit: string; anchorX: number; anchorY: number })[]) => void
  onLoadState?: (state: { loading: boolean; error: string; source?: 'panorama' | 'context' }) => void
  onIllustrationState?: (state: { failed: number; retrying: boolean }) => void
}

export interface GeologicScene {
  setSelected: (index: number) => void
  focusPeriod: (index: number) => void
  clearFocus: () => void
  setFocusOpacity: (opacity: number) => void
  enterPanorama: (index: number) => Promise<void>
  exitPanorama: () => void
  setAutoRotate: (enabled: boolean) => void
  setFocusOrbit: (enabled: boolean) => void
  retryIllustrations: () => Promise<void>
  startRoam: () => void
  pauseRoam: () => void
  stopRoam: () => void
  seekRoam: (progress: number) => void
  setTour: (enabled: boolean) => void
  setLifeMotion: (enabled: boolean) => void
  lookAtVolcano: () => void
  lookAtOrganism: () => void
  resetView: () => void
  resize: () => void
  dispose: () => void
}

type CameraFlight = {
  from: THREE.Vector3
  to: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  started: number
  duration: number
  fromFov?: number
  toFov?: number
  complete?: () => void
}

type Palette = { rock: string; high: string; water: string; stratum: string; vegetation?: 'cooksonia' | 'earlytree' | 'lycopsid' | 'conifer' | 'broadleaf' }

// These plants are schematic reconstructions. Land plants are deliberately absent
// from the Hadean, Archean, Proterozoic, Cambrian and Ordovician landscapes.
const PALETTES: Palette[] = [
  { rock: '#4c3a38', high: '#ab6550', water: '#fd7c37', stratum: '#a95235' },
  { rock: '#655e50', high: '#a19c77', water: '#63b6b7', stratum: '#b39763' },
  { rock: '#8d7661', high: '#c7aa87', water: '#53bacb', stratum: '#ae795b' },
  { rock: '#b4aa7d', high: '#ded0a5', water: '#35b6bf', stratum: '#b39164' },
  { rock: '#a6a77b', high: '#d2c99c', water: '#43bfd0', stratum: '#9b845e' },
  { rock: '#909867', high: '#c7ba8e', water: '#49aeb8', stratum: '#a38b5e', vegetation: 'cooksonia' },
  { rock: '#718d56', high: '#bcb383', water: '#4aaeb5', stratum: '#a5855e', vegetation: 'earlytree' },
  { rock: '#496d49', high: '#8c9864', water: '#488f91', stratum: '#7c7451', vegetation: 'lycopsid' },
  { rock: '#b98e67', high: '#ddbb88', water: '#4fa6b5', stratum: '#ad724a', vegetation: 'conifer' },
  { rock: '#bd9264', high: '#dec49b', water: '#45b3bd', stratum: '#af754e', vegetation: 'conifer' },
  { rock: '#779060', high: '#c0b284', water: '#38b1bb', stratum: '#9e8558', vegetation: 'conifer' },
  { rock: '#709565', high: '#c7bc8d', water: '#45bec3', stratum: '#a08b65', vegetation: 'broadleaf' },
  { rock: '#77925a', high: '#b5b282', water: '#5ebac3', stratum: '#ad936d', vegetation: 'broadleaf' },
  { rock: '#a9a578', high: '#d1c7a0', water: '#55b3c5', stratum: '#b19169', vegetation: 'broadleaf' },
  { rock: '#b4a28b', high: '#d4c3a3', water: '#82c9d6', stratum: '#b3a58f', vegetation: 'conifer' },
]

const DEFAULT_PALETTE: Palette = { rock: '#a69978', high: '#d1c2a0', water: '#56b6c4', stratum: '#a68a69' }
const TAU = Math.PI * 2
const SPIRAL_TURNS = 2.76
const START_ANGLE = -Math.PI * 0.12
const OVERVIEW_VOLCANIC_PERIODS = [1, 2, 8, 9, 10, 11, 12, 13, 14]
const JURASSIC_STEGOSAURUS = { fraction: 0.46, v: 0.50, size: 1.45 }
// The textbook horse is inside the Quaternary, while the rhino is centred
// exactly on its boundary with the Neogene. Keep foliage clear of both.
const QUATERNARY_HORSE = { fraction: 0.20, inland: 0.68, size: 1.50 }
const BOUNDARY_RHINO = { fraction: 1, inland: 0.60, size: 1.40 }
const OVERVIEW_FOV = 31
const LIFE_BOUNDS = [
  [0.275, 0.445, 0.730, 0.697], [0.229, 0.471, 0.762, 0.664], [0.232, 0.369, 0.773, 0.719],
  [0.234, 0.320, 0.787, 0.643], [0.238, 0.363, 0.797, 0.648], [0.275, 0.299, 0.736, 0.654],
]
const VEGETATION_BOUNDS = [
  [0.318, 0.312, 0.752, 0.801], [0.248, 0.219, 0.758, 0.838], [0.275, 0.230, 0.707, 0.844],
  [0.295, 0.117, 0.756, 0.770], [0.240, 0.141, 0.762, 0.766], [0.223, 0.283, 0.789, 0.650],
]
const EARLY_LIFE_BOUNDS = [
  [0.222, 0.455, 0.825, 0.856], [0.211, 0.512, 0.799, 0.835], [0.230, 0.318, 0.756, 0.926],
  [0.242, 0.275, 0.830, 0.749], [0.208, 0.378, 0.813, 0.670], [0.160, 0.400, 0.785, 0.651],
  [0.227, 0.146, 0.825, 0.644], [0.196, 0.220, 0.809, 0.610], [0.201, 0.191, 0.797, 0.670],
]
// Bounds measured from the corrected atlas; 4 px padding in each 512 px cell.
const MARINE_LIFE_BOUNDS = [
  [0.107422, 0.263672, 0.968750, 0.822266], [0.255859, 0.251953, 0.783203, 0.843750],
  [0.126953, 0.277344, 0.875000, 0.781250], [0.107422, 0.265625, 0.958984, 0.666016],
  [0.164062, 0.166016, 0.851562, 0.718750], [0.029297, 0.208984, 0.929688, 0.667969],
]

function atlasCrop(bounds: number[] | undefined, padding = 0.01) {
  const x0 = Math.max(0, (bounds?.[0] ?? padding) - padding)
  const y0 = Math.max(0, (bounds?.[1] ?? padding) - padding)
  const x1 = Math.min(1, (bounds?.[2] ?? 1 - padding) + padding)
  const y1 = Math.min(1, (bounds?.[3] ?? 1 - padding) + padding)
  return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0, aspect: (x1 - x0) / (y1 - y0) }
}

// Authored look directions use normalized coordinates in the equirectangular image.
const PANORAMA_VIEWS: Record<string, { u: number; v: number; fov: number; direction?: number; sweep?: number }> = {
  hadean: { u: 0.23, v: 0.40, fov: 76 },
  archean: { u: 0.34, v: 0.47, fov: 80 },
  proterozoic: { u: 0.50, v: 0.56, fov: 76 },
  cambrian: { u: 0.59, v: 0.43, fov: 73, direction: -1 },
  ordovician: { u: 0.59, v: 0.46, fov: 74 },
  silurian: { u: 0.68, v: 0.66, fov: 74, direction: 1 },
  devonian: { u: 0.69, v: 0.44, fov: 76 },
  carboniferous: { u: 0.43, v: 0.62, fov: 76 },
  permian: { u: 0.45, v: 0.46, fov: 72 },
  triassic: { u: 0.23, v: 0.54, fov: 76 },
  jurassic: { u: 0.505, v: 0.53, fov: 85, direction: 1, sweep: 0.15 },
  cretaceous: { u: 0.59, v: 0.53, fov: 74 },
  paleogene: { u: 0.49, v: 0.58, fov: 76, direction: 1, sweep: 0.12 },
  neogene: { u: 0.47, v: 0.59, fov: 76 },
  quaternary: { u: 0.72, v: 0.49, fov: 80, direction: 1, sweep: 0.10 },
}

/** Continuous educational spiral: segment lengths are intentionally not time-proportional. */
function spiral(t: number, across = 0, lift = 0): THREE.Vector3 {
  // Compact early coils rise into the broad, flatter Phanerozoic display.
  const early = Math.min(t / 0.2, 1)
  const upper = Math.max(0, (t - 0.2) / 0.8)
  const turns = t < 0.2 ? early : 1 + (SPIRAL_TURNS - 1) * upper
  const angle = START_ANGLE + TAU * (turns - 0.6)
  const baseRadius = t < 0.2 ? 1.1 + 2.8 * Math.pow(early, 0.85) : 3.9 + 9.2 * Math.pow(upper, 0.9)
  const radius = baseRadius + 1.8 * THREE.MathUtils.smoothstep(t, 0.55, 0.78)
  const halfWidth = 0.42 + 1.1 * Math.pow(t, 0.48)
  const r = radius + across * halfWidth
  const rise = t < 0.2 ? -3.9 + 5.2 * early : 1.3 + 2.2 * upper
  // Reveal the lower early-eon coils while keeping both terrace joins fixed.
  const earlyProgress = THREE.MathUtils.clamp((t - 1 / 15) / (0.2 - 1 / 15), 0, 1)
  const earlyDrop = Math.pow(Math.sin(earlyProgress * Math.PI), 2)
  return new THREE.Vector3(Math.cos(angle) * r + earlyDrop * 0.63, rise + lift - earlyDrop * 0.72, Math.sin(angle) * r + earlyDrop * 0.78)
}

function noise(t: number, v: number): number {
  return (
    Math.sin(t * 151.7 + v * 5.1) * 0.35 +
    Math.sin(t * 367.3 - v * 11.9) * 0.22 +
    Math.sin(t * 743.9 + v * 19.7) * 0.13 +
    Math.sin(t * 1629.1 - v * 27.3) * 0.07
  )
}

function lattice(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(lattice(ix, iy), lattice(ix + 1, iy), sx),
    THREE.MathUtils.lerp(lattice(ix, iy + 1), lattice(ix + 1, iy + 1), sx), sy,
  ) * 2 - 1
}

function fractalNoise(x: number, y: number): number {
  let amplitude = 0.53
  let result = 0
  for (let octave = 0; octave < 5; octave++) {
    result += valueNoise(x, y) * amplitude
    x = x * 2.07 + 17.3
    y = y * 2.07 - 11.9
    amplitude *= 0.48
  }
  return result
}

function shoreline(t: number): number {
  // Marine intervals have broad shelves; later forests and arid landscapes have
  // narrower, irregular waterways. Interpolation keeps every boundary continuous.
  const coasts = [0, 0.14, 0.3, 0.33, 0.32, 0.12, 0, -0.08, -0.1, -0.08, -0.04, 0, 0.02, -0.06, -0.1]
  const along = Math.max(0, t * coasts.length - 0.5)
  const index = Math.min(coasts.length - 1, Math.floor(along))
  const a = coasts[index] ?? -0.35
  const b = coasts[Math.min(coasts.length - 1, index + 1)] ?? a
  const fraction = along - Math.floor(along)
  const base = THREE.MathUtils.lerp(a, b, fraction * fraction * (3 - 2 * fraction))
  return THREE.MathUtils.clamp(base + fractalNoise(t * 29.5, 8.1) * 0.18 + fractalNoise(t * 128.5, 17.8) * 0.08, -0.18, 0.42)
}

function outerEdge(t: number): number {
  return 1 + fractalNoise(t * 130, 7.2) * 0.105
}

function innerEdge(t: number): number {
  return -1 + fractalNoise(t * 95, 51.2) * 0.09
}

/** The inner bank is added inward; the white route at v=-0.85 stays open. */
function innerBankBounds(t: number) {
  const halfWidth = 0.42 + 1.1 * Math.pow(t, 0.48)
  // The widest arrow head has a 0.244-world-unit half-width. Reserve 0.30
  // from its centre to the dry shore, including on the narrow early coils.
  const shore = Math.min(-1.12, innerEdge(t) - 0.10, -0.85 - 0.30 / halfWidth)
  const earlyWidth = (0.22 + 0.58 * THREE.MathUtils.smoothstep(t, 0.25, 0.90))
    * (1 + fractalNoise(t * 46, 31.2) * 0.16)
  const lateWidth = THREE.MathUtils.clamp(
    1.32 + Math.sin(t * 32 + 0.4) * 0.12 + fractalNoise(t * 21, 20.3) * 0.14, 1.20, 1.45,
  )
  const broadWidth = THREE.MathUtils.lerp(earlyWidth, lateWidth, THREE.MathUtils.smoothstep(t, 8.6 / 15, 9 / 15))
  // Shallow coves preserve views of the preceding coil while retaining at
  // least 60% of the bank. The final camp and mammoth stand on broad platforms
  // at fractions 0.90 and 0.76, beyond these coves.
  const cove = Math.max(
    1 - THREE.MathUtils.smoothstep(Math.abs(t - 14.08 / 15), 0.0012, 0.0050),
    1 - THREE.MathUtils.smoothstep(Math.abs(t - 0.9653), 0.0012, 0.0050),
  )
  const width = broadWidth * (1 - cove * 0.40)
  return { shore, edge: shore - width / halfWidth, width, halfWidth }
}

function innerBankHeight(t: number, across: number): number {
  const bank = innerBankBounds(t)
  const inland = THREE.MathUtils.clamp((bank.shore - across) / (bank.shore - bank.edge), 0, 1)
  const rise = THREE.MathUtils.smoothstep(inland, 0, 0.30)
  // Keep this opposite shore low enough for a ground-level view across the
  // water. Its seaward toe joins below the 0.16 water surface, without a gap.
  const relief = 0.12 + 0.065 * Math.sin(inland * Math.PI)
    + fractalNoise(t * 115, across * 5.1) * 0.035
  return 0.12 + rise * relief
}

export type OverviewBankSide = 'inner' | 'outer'

/**
 * Grounded placement for overview organisms and the Quaternary camp.
 * `inland` runs from the wet shoreline (0) toward the land edge (1).
 * Period 0 is the separate formation symbol and has no bank.
 */
export function overviewBankPoint(
  index: number, fraction: number, side: OverviewBankSide = 'inner', inland = 0.5, lift = 0,
): { position: THREE.Vector3; t: number; across: number; height: number; side: OverviewBankSide } {
  if (!Number.isInteger(index) || index < 1 || index > 14) throw new RangeError('Overview banks exist for periods 1–14.')
  const t = (index + THREE.MathUtils.clamp(Number.isFinite(fraction) ? fraction : 0.5, 0, 1)) / 15
  const depth = THREE.MathUtils.clamp(Number.isFinite(inland) ? inland : 0.5, 0.18, 0.88)
  const bank = innerBankBounds(t)
  const across = side === 'inner'
    ? THREE.MathUtils.lerp(bank.shore, bank.edge, depth)
    : THREE.MathUtils.lerp(shoreline(t) + 0.09, outerEdge(t) - 0.06, depth)
  const height = side === 'inner' ? innerBankHeight(t, across) : terrainHeight(t, across, index)
  return { position: spiral(t, across, height + lift), t, across, height, side }
}

function baseTerrainHeight(t: number, v: number, period: number): number {
  const coast = shoreline(t)
  const coastalRise = THREE.MathUtils.smoothstep(v, coast - 0.025, coast + 0.25)
  const inland = THREE.MathUtils.clamp((v - coast) / (1 - coast), 0, 1)
  const continental = Math.max(0, fractalNoise(t * 32 + 4.2, v * 1.9) + 0.5)
  const ridges = Math.pow(1 - Math.abs(fractalNoise(t * 73.8, v * 3.4)), 2.3)
  const ruggedness = [1.6, 1.25, 0.9, 0.46, 0.5, 0.52, 1.05, 0.62, 1.5, 1.55, 1.23, 1.0, 1.3, 1.9, 1.25][period] ?? 1
  const interior = Math.pow(Math.sin(inland * Math.PI * 0.93), 1.35)
  const smallRocks = fractalNoise(t * 360, v * 14) * 0.14
  const fracture = Math.pow(Math.max(0, 0.13 - Math.abs(valueNoise(t * 146, v * 6.1))) / 0.13, 2) * 0.23
  return 0.11 + coastalRise * Math.max(0.025, 0.12 + continental * ridges * ruggedness * interior * 0.74 + smallRocks - fracture)
}

// Volcanic relief is part of the terrain surface, with a continuous talus apron.
// No separate cone or flat pedestal can float above the slope.
function volcanicRelief(t: number, v: number, period: number) {
  if (!OVERVIEW_VOLCANIC_PERIODS.includes(period)) return { weight: 0, elevation: 0 }
  const centerT = (period + 0.27) / 15
  const center = spiral(centerT, 0.65)
  const sample = spiral(t, v)
  const radius = period < 3 ? 0.43 + period * 0.035 : 0.70
  const angle = Math.atan2(sample.z - center.z, sample.x - center.x)
  const irregular = 1 + 0.06 * Math.sin(angle * 5 + period)
  const r = Math.hypot(sample.x - center.x, sample.z - center.z) / (radius * irregular)
  const weight = 1 - THREE.MathUtils.smoothstep(r, 0.52, 1.42)
  if (weight <= 0) return { weight: 0, elevation: 0 }
  const height = period < 3 ? 0.76 : 1.04
  const profile = r < 0.24
    ? THREE.MathUtils.lerp(0.48, 1, THREE.MathUtils.smoothstep(r, 0.04, 0.24))
    : Math.pow(Math.max(0, (1.42 - r) / 1.18), 1.65)
  const centerGround = center.y + baseTerrainHeight(centerT, 0.65, period)
  const ridges = Math.sin(angle * 13 + r * 6) * 0.025 * Math.min(r, 1)
  return { weight, elevation: centerGround + height * profile + ridges - sample.y }
}

function terrainHeight(t: number, v: number, period: number): number {
  const base = baseTerrainHeight(t, v, period)
  const relief = volcanicRelief(t, v, period)
  return THREE.MathUtils.lerp(base, relief.elevation, relief.weight)
}

function seeded(value: number): number {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453123
  return n - Math.floor(n)
}

function createLandGeometry(start: number, end: number, period: number, palette: Palette, side: OverviewBankSide = 'outer'): THREE.BufferGeometry {
  const steps = 160
  const rows = side === 'inner' ? 12 : 48
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const volcanic: number[] = []
  const indices: number[] = []
  const low = new THREE.Color(palette.rock)
  const high = new THREE.Color(palette.high)
  const shore = new THREE.Color('#d8c9a0')
  const shade = new THREE.Color()
  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(start, end, i / steps)
    const bank = innerBankBounds(t)
    for (let j = 0; j <= rows; j++) {
      // Both meshes run from lower to higher across so their normals match.
      const v = side === 'inner'
        ? THREE.MathUtils.lerp(bank.edge, bank.shore + 0.025, j / rows)
        : THREE.MathUtils.lerp(shoreline(t) - 0.06, outerEdge(t), j / rows)
      const elevation = side === 'inner' ? innerBankHeight(t, v) : terrainHeight(t, v, period)
      const p = spiral(t, v, elevation)
      positions.push(p.x, p.y, p.z)
      volcanic.push(side === 'inner' ? 0 : volcanicRelief(t, v, period).weight)
      uvs.push(i / steps, j / rows)
      const n = THREE.MathUtils.clamp(0.34 + noise(t, v) * 0.4 + elevation * 0.32, 0, 1)
      shade.copy(low).lerp(high, n)
      if (v < -0.04 && period > 0) shade.lerp(shore, 0.6)
      colors.push(shade.r, shade.g, shade.b)
      if (i < steps && j < rows) {
        const a = i * (rows + 1) + j
        const b = a + rows + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('volcanicWeight', new THREE.Float32BufferAttribute(volcanic, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createWaterGeometry(start: number, end: number): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const steps = 100
  const rows = 10
  // Match the textbook's blue-cyan time waterway. It is a diagrammatic band,
  // not a claim that all ancient seas had one measured colour.
  const deep = new THREE.Color('#159cca')
  const shallow = new THREE.Color('#77d0d4')
  const col = new THREE.Color()
  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(start, end, i / steps)
    for (let j = 0; j <= rows; j++) {
      const q = j / rows
      const across = THREE.MathUtils.lerp(innerBankBounds(t).shore, shoreline(t) + 0.04, q)
      const p = spiral(t, across, 0.16)
      positions.push(p.x, p.y, p.z)
      uvs.push(i / steps * 2, q)
      const shoreMix = Math.max(Math.pow(q, 3) * 0.72, Math.pow(1 - q, 9) * 0.35)
      col.copy(deep).lerp(shallow, shoreMix)
      colors.push(col.r, col.g, col.b)
      if (i < steps && j < rows) {
        const a = i * (rows + 1) + j
        indices.push(a, a + rows + 1, a + 1, a + rows + 1, a + rows + 2, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createShoalGeometry(t: number, across: number, seed: number): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const length = 0.0025 + seeded(seed + 4) * 0.0025
  const width = 0.11 + seeded(seed + 7) * 0.085
  const peak = 0.18 + seeded(seed + 11) * 0.17
  const steps = 14
  for (let i = 0; i <= steps; i++) {
    const u = i / steps * 2 - 1
    for (let j = 0; j <= steps; j++) {
      const v = j / steps * 2 - 1
      const dome = Math.pow(Math.max(0, 1 - u * u - v * v), 0.62)
      const roughness = valueNoise(u * 5 + seed, v * 5) * 0.045 * dome
      const point = spiral(t + u * length, across + v * width + u * 0.035, 0.06 + dome * peak + roughness)
      positions.push(point.x, point.y, point.z)
      uvs.push(i / steps, j / steps)
      if (i < steps && j < steps) {
        const a = i * (steps + 1) + j
        indices.push(a, a + steps + 1, a + 1, a + steps + 1, a + steps + 2, a + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('volcanicWeight', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3), 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createCliffGeometry(start: number, end: number, across: number, period: number, palette: Palette): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const steps = 100
  const layers = 18
  const base = new THREE.Color(palette.stratum)
  const dark = new THREE.Color('#303944')
  const pale = new THREE.Color('#d1b891')
  const col = new THREE.Color()
  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(start, end, i / steps)
    const edge = across < 0 ? innerBankBounds(t).edge : outerEdge(t)
    const top = across < 0 ? innerBankHeight(t, edge) : terrainHeight(t, edge, period)
    for (let j = 0; j <= layers; j++) {
      const depth = j / layers
      const ripple = (fractalNoise(t * 187, depth * 4.2) * 0.055 + Math.sin(t * 46 + depth * 4) * 0.025) * Math.sin(depth * Math.PI)
      // The added inner shore is a shallow terrace, not a second tall wall
      // hanging over the previous coil's names and dates.
      const bottom = across < 0 ? -0.015 : -0.23 - t * 0.12
      const p = spiral(t, edge + ripple, THREE.MathUtils.lerp(top, bottom, depth))
      positions.push(p.x, p.y, p.z)
      uvs.push(i / steps, 1 - depth)
      col.copy(base).lerp(pale, 0.08).lerp(dark, depth * 0.28)
      col.multiplyScalar(0.94 - depth * 0.22 + valueNoise(t * 230, depth * 15) * 0.08)
      colors.push(col.r, col.g, col.b)
      if (i < steps && j < layers) {
        const a = i * (layers + 1) + j
        const b = a + layers + 1
        indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeWaterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#d0d7d4'
    context.fillRect(0, 0, 512, 128)
    for (let n = 0; n < 240; n++) {
      const x = seeded(n + 18) * 512
      const y = seeded(n + 53) * 128
      context.strokeStyle = n % 3 === 0
        ? `rgba(41,109,125,${0.10 + seeded(n + 92) * 0.11})`
        : `rgba(255,255,255,${0.12 + seeded(n + 92) * 0.24})`
      context.lineWidth = 0.6 + seeded(n + 4) * 0.8
      context.beginPath()
      context.moveTo(x, y)
      context.bezierCurveTo(x + 6, y - 2, x + 15, y + 2, x + 21, y)
      context.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const glow = ctx.createRadialGradient(64, 64, 4, 64, 64, 61)
    glow.addColorStop(0, 'rgba(221,225,224,0.65)')
    glow.addColorStop(0.4, 'rgba(207,215,214,0.35)')
    glow.addColorStop(1, 'rgba(190,204,205,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 128, 128)
  }
  return new THREE.CanvasTexture(canvas)
}

export function createGeologicScene(host: HTMLElement, periods: GeologicPeriod[], callbacks: SceneCallbacks): GeologicScene {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Photo panoramas and biological cards opt out of tone mapping.
  renderer.toneMappingExposure = 1.40
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.setAttribute('aria-label', '可旋转和缩放的地质年代三维螺旋；点击各年代聚焦观察')
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'none'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const overviewBackground = new THREE.Color('#081b29')
  const overviewFog = new THREE.FogExp2('#081b29', 0.007)
  scene.background = overviewBackground
  scene.fog = overviewFog
  const camera = new THREE.PerspectiveCamera(OVERVIEW_FOV, 1, 0.1, 240)
  const initialPosition = new THREE.Vector3(22.117536, 25.1530528, 27.383616)
  const initialTarget = new THREE.Vector3(0, 1.3, 0)
  // Wider late-period terraces need the full outer ring inside the overview.
  initialPosition.sub(initialTarget).multiplyScalar(1.10).add(initialTarget)
  camera.position.copy(initialPosition)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(initialTarget)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.minDistance = 13
  controls.maxDistance = 66
  controls.minPolarAngle = 0.14
  controls.maxPolarAngle = Math.PI * 0.47
  controls.enablePan = true
  controls.panSpeed = 0.6
  controls.rotateSpeed = 0.55
  controls.zoomSpeed = 0.7
  controls.autoRotateSpeed = 0.22
  controls.update()

  const world = new THREE.Group()
  world.userData.periodIndex = -1
  scene.add(world)
  let focusedIndex: number | null = null
  let contextOpacity = 0.52
  // Only context that crosses the final sightline receives this extra fade.
  const focusOccluders = new Set<number>()
  const focusRaycaster = new THREE.Raycaster()
  const focusMaterials = new Map<THREE.Material, { period: number; baseOpacity: number; factor: number; transparent: boolean; depthWrite: boolean }>()
  function registerPeriod(object: THREE.Object3D, index: number) {
    object.traverse(child => {
      child.userData.periodIndex = index
      const renderable = child as THREE.Mesh
      const materials = renderable.material ? (Array.isArray(renderable.material) ? renderable.material : [renderable.material]) : []
      for (const material of materials) {
        if (!focusMaterials.has(material)) focusMaterials.set(material, {
          period: index, baseOpacity: material instanceof THREE.ShaderMaterial && material.uniforms.imageOpacity ? Number(material.uniforms.imageOpacity.value) : material.opacity,
          factor: 1, transparent: material.transparent, depthWrite: material.depthWrite,
        })
      }
    })
  }
  function updateFocusVisuals(dt: number, immediate = false) {
    for (const [material, state] of focusMaterials) {
      const obstructing = focusedIndex !== null && focusOccluders.has(state.period)
      const nearby = roamPhase !== 'idle' && focusedIndex !== null && Math.abs(state.period - focusedIndex) <= 1
      const active = state.period === focusedIndex || material.userData.adjacentPeriod === focusedIndex
      const target = focusedIndex === null || active || state.period < 0
        ? 1 : obstructing ? Math.min(contextOpacity, 0.055) : nearby ? 1 : contextOpacity
      state.factor = immediate || reducedMotion.matches ? target : THREE.MathUtils.damp(state.factor, target, 6, dt)
      if (Math.abs(state.factor - target) < 0.001) state.factor = target
      const opacity = (material.userData.focusBaseOpacity ?? state.baseOpacity) * state.factor
      if (material instanceof THREE.ShaderMaterial && material.uniforms.imageOpacity) material.uniforms.imageOpacity.value = opacity
      else material.opacity = opacity
      const transparent = state.transparent || state.factor < 0.999
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
      // Context on the sightline must not depth-mask the selected organism
      // cutouts. Other context retains its depth to avoid overlapping ghosts.
      material.depthWrite = state.depthWrite && !obstructing
      material.forceSinglePass = true
      if (material instanceof THREE.ShaderMaterial && material.uniforms.inspectionBlend) {
        const close = focusedIndex !== null && active ? 1 : 0
        material.uniforms.inspectionBlend.value = immediate || reducedMotion.matches ? close : THREE.MathUtils.damp(Number(material.uniforms.inspectionBlend.value), close, 5, dt)
      }
    }
  }
  const hemisphere = new THREE.HemisphereLight('#dce5e5', '#655b49', 1.55)
  scene.add(hemisphere)
  const sunlight = new THREE.DirectionalLight('#fff0da', 2.8)
  sunlight.position.set(-12, 25, 8)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -19
  sunlight.shadow.camera.right = 19
  sunlight.shadow.camera.top = 19
  sunlight.shadow.camera.bottom = -19
  sunlight.shadow.camera.near = 1
  sunlight.shadow.camera.far = 70
  sunlight.shadow.normalBias = 0.045
  sunlight.shadow.bias = -0.0002
  sunlight.shadow.radius = 3
  scene.add(sunlight)
  const rimLight = new THREE.DirectionalLight('#a0bec7', 0.65)
  rimLight.position.set(12, 8, -16)
  scene.add(rimLight)

  const groundShadow = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ color: '#020c14', opacity: 0.1, depthWrite: false }))
  groundShadow.rotation.x = -Math.PI / 2
  groundShadow.position.y = -7
  groundShadow.receiveShadow = true
  world.add(groundShadow)
  registerPeriod(groundShadow, -1)

  const waterTexture = makeWaterTexture()
  waterTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  const smokeTexture = makeSmokeTexture()
  const landMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0.02, side: THREE.DoubleSide })
  const cliffMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })
  const pickMeshes: THREE.Object3D[] = []
  const periodCenters: THREE.Vector3[] = []
  const labelPoints: THREE.Vector3[] = []
  const labelStems: THREE.Line[] = []
  const accents: THREE.Line[] = []
  const terrainMaterials: THREE.MeshStandardMaterial[] = []
  const innerSoilMaterials: THREE.MeshStandardMaterial[] = []
  const cliffMaterials: THREE.MeshStandardMaterial[] = []
  const smokePuffs: { sprite: THREE.Sprite; base: THREE.Vector3; phase: number }[] = []
  const vegetationPlacements: { period: number; position: THREE.Vector3; height: number; cell: number; yaw: number }[] = []

  function queueVegetation(start: number, end: number, index: number) {
    const cellByPeriod: Record<number, number> = { 5: 0, 6: 1, 7: 2, 8: 3, 9: 3, 10: 3, 11: 4, 12: 4, 13: 5, 14: 5 }
    const cell = cellByPeriod[index]
    if (cell === undefined) return
    const heights = [0.16, 1.28, 1.6, 1.35, 1.32, 0.22]
    const count = cell === 5 ? 30 : index === 8 || index === 9 ? 11 : index === 7 ? 26 : 20
    for (let n = 0; n < count; n++) {
      const key = index * 83 + n
      const fraction = 0.045 + seeded(key + 100) * 0.91
      const t = THREE.MathUtils.lerp(start, end, fraction)
      const useInner = index === 12 || ((index === 13 || index === 14) && n % 2 === 0)
      const bankPoint = useInner ? overviewBankPoint(index, fraction, 'inner', 0.50 + seeded(key + 920) * 0.30) : undefined
      const v = bankPoint?.across ?? THREE.MathUtils.lerp(shoreline(t) + 0.15, 0.88, seeded(key + 900))
      if (useInner) {
        if (innerBankBounds(t).width < 0.28) continue
        if (index === 12 && (Math.abs(fraction - 0.38) < 0.10 || Math.abs(fraction - 0.72) < 0.08 || (fraction > 0.74 && fraction < 0.97))) continue
        if (index === 13 && Math.abs(fraction - BOUNDARY_RHINO.fraction) < 0.10) continue
        if (index === 14 && (Math.abs(fraction - QUATERNARY_HORSE.fraction) < 0.10 || Math.abs(fraction - 0.90) < 0.07 || Math.abs(fraction - 0.76) < 0.08)) continue
      }
      // Leave a small clearing around the period's animal illustration.
      if (!useInner && Math.abs(fraction - 0.67) < 0.105 && v < 0.69 && cell !== 0 && cell !== 5) continue
      if (index === 6 && Math.abs(fraction - 0.40) < 0.08 && v < 0.62) continue
      if (index === 10 && Math.abs(fraction - JURASSIC_STEGOSAURUS.fraction) < 0.07 && Math.abs(v - JURASSIC_STEGOSAURUS.v) < 0.18) continue
      if (index === 11 && Math.abs(fraction - 0.43) < 0.10 && v < 0.76) continue
      if (OVERVIEW_VOLCANIC_PERIODS.includes(index) && Math.abs(fraction - 0.27) < 0.16 && v > 0.38) continue
      const groundHeight = bankPoint?.height ?? terrainHeight(t, v, index)
      if (cell !== 0 && cell !== 5 && groundHeight > 1.28) continue
      const height = (heights[cell] ?? 1) * (0.72 + seeded(key + 300) * 0.48) * (index === 12 && useInner ? 0.78 : 1)
      vegetationPlacements.push({
        period: index,
        position: spiral(t, v, groundHeight - height * 0.015),
        height,
        cell,
        yaw: seeded(key + 700) * TAU,
      })
    }
    // A few small early trees place the Devonian shore animal in a vegetated
    // setting, while the main Gilboa-style forest remains on the outer bank.
    if (index === 6) {
      for (const fraction of [0.18, 0.72, 0.86]) {
        const placement = overviewBankPoint(index, fraction, 'inner', 0.74)
        vegetationPlacements.push({ period: index, position: placement.position, height: 0.68, cell: 1, yaw: seeded(fraction * 600) * TAU })
      }
    }
    // Textbook opposite banks have distinct vegetation clusters, not a bare
    // parallel strip. Keep a low back row and clear foreground for the animals.
    if (index >= 9 && index <= 11) {
      const fractions = index === 9 ? [0.64, 0.82, 0.91]
        : index === 10 ? [0.15, 0.66, 0.82, 0.91] : [0.16, 0.38, 0.80, 0.90]
      fractions.forEach((fraction, n) => {
        const placement = overviewBankPoint(index, fraction, 'inner', 0.80)
        const height = (index === 11 && fraction > 0.75 ? 0.90 : 0.70) + seeded(index * 53 + n) * 0.18
        vegetationPlacements.push({ period: index, position: placement.position, height, cell: index === 11 && fraction > 0.75 ? 4 : 3, yaw: seeded(index * 23 + n) * TAU })
      })
    }
    if (index === 14) {
      for (const [fraction, height] of [[0.54, 0.58], [0.66, 0.90]]) {
        const placement = overviewBankPoint(index, fraction!, 'inner', 0.82)
        vegetationPlacements.push({ period: index, position: placement.position, height: height!, cell: 4, yaw: seeded(fraction! * 600) * TAU })
      }
    }
    // Neogene open woodland retains grass between a few broadleaf trees.
    // Its sparse woodland occupies the inner bank; the outer animal stands on
    // open ground beside the geological landscape.
    if (index === 13) {
      const sparseTrees = [0.08, 0.30, 0.44] as const
      sparseTrees.forEach((fraction, n) => {
        const placement = overviewBankPoint(index, fraction, 'inner', 0.76)
        const height = 0.90 + seeded(1300 + n) * 0.28
        vegetationPlacements.push({
          period: index,
          position: placement.position.add(new THREE.Vector3(0, -height * 0.015, 0)),
          height,
          cell: 4,
          yaw: seeded(1400 + n) * TAU,
        })
      })
    }
  }

  const hadeanOrigin = createHadeanOrigin(spiral(1 / periods.length, 0, 0.18))
  periods.forEach((period, index) => {
    if (index === 0) {
      const group = hadeanOrigin.group
      periodCenters.push(hadeanOrigin.center.clone())
      labelPoints.push(hadeanOrigin.marker.clone())
      const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([hadeanOrigin.center, hadeanOrigin.marker]), new THREE.LineBasicMaterial({ color: '#bedcdd', transparent: true, opacity: 0.28 }))
      labelStems.push(stem)
      group.add(stem)
      const accent = new THREE.Line(new THREE.BufferGeometry().setFromPoints([hadeanOrigin.center, hadeanOrigin.center]), new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }))
      accents.push(accent)
      group.add(accent)
      group.traverse(child => { if (child instanceof THREE.Mesh) pickMeshes.push(child) })
      registerPeriod(group, 0)
      world.add(group)
      return
    }
    const start = index / periods.length
    const end = (index + 1) / periods.length
    const palette = PALETTES[index] ?? DEFAULT_PALETTE
    const group = new THREE.Group()
    group.userData.periodIndex = index
    const material = landMaterial.clone()
    terrainMaterials[index] = material
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float volcanicWeight; varying float volcanicBlend; varying vec2 terrainUv;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvolcanicBlend = volcanicWeight; terrainUv = uv;')
      shader.fragmentShader = 'varying float volcanicBlend; varying vec2 terrainUv;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float ash = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(ash * 0.87, ash * 0.86, ash * 0.82), volcanicBlend * 0.64);
      `)
    }
    material.customProgramCacheKey = () => 'continuous-volcanic-terrain-v1'
    const land = new THREE.Mesh(createLandGeometry(start, end, index, palette), material)
    land.castShadow = true
    land.receiveShadow = true
    land.userData.periodIndex = index
    group.add(land)
    const innerMaterial = index === 12 || index === 13 ? material.clone() : material
    if (innerMaterial !== material) innerSoilMaterials.push(innerMaterial)
    const innerLand = new THREE.Mesh(createLandGeometry(start, end, index, palette, 'inner'), innerMaterial)
    innerLand.name = `inner-bank-${index}`
    innerLand.castShadow = true
    innerLand.receiveShadow = true
    innerLand.userData.periodIndex = index
    group.add(innerLand)
    pickMeshes.push(innerLand)
    const water = new THREE.Mesh(createWaterGeometry(start, end), new THREE.MeshBasicMaterial({
      color: '#ffffff',
      map: waterTexture,
      vertexColors: index !== 0,
      toneMapped: false,
      side: THREE.DoubleSide,
    }))
    water.receiveShadow = true
    water.userData.periodIndex = index
    group.add(water)
    if (index > 0) {
      for (let island = 0; island < (index < 5 ? 2 : 1); island++) {
        const t = THREE.MathUtils.lerp(start, end, island === 0 ? 0.3 : 0.79)
        const across = shoreline(t) - 0.11 - seeded(index * 21 + island) * 0.1
        const shoal = new THREE.Mesh(createShoalGeometry(t, across, index * 17 + island), material)
        shoal.castShadow = true
        shoal.receiveShadow = true
        shoal.userData.periodIndex = index
        group.add(shoal)
        pickMeshes.push(shoal)
      }
    }
    const periodCliffMaterial = cliffMaterial.clone()
    cliffMaterials.push(periodCliffMaterial)
    for (const side of [-1, 1]) {
      const cliff = new THREE.Mesh(createCliffGeometry(start, end, side, index, palette), periodCliffMaterial)
      cliff.castShadow = true
      cliff.receiveShadow = true
      cliff.userData.periodIndex = index
      group.add(cliff)
      pickMeshes.push(cliff)
    }
    const accentPoints: THREE.Vector3[] = []
    for (let step = 0; step <= 60; step++) {
      const t = THREE.MathUtils.lerp(start, end, step / 60)
      const edge = innerBankBounds(t).edge
      accentPoints.push(spiral(t, edge - 0.015, innerBankHeight(t, edge) + 0.02))
    }
    const accent = new THREE.Line(new THREE.BufferGeometry().setFromPoints(accentPoints), new THREE.LineBasicMaterial({ color: index === 1 ? '#46c86a' : index === 2 ? '#b576dc' : period.color, transparent: true, opacity: index < 3 ? 0.90 : 0.45 }))
    group.add(accent)
    accents.push(accent)

    const boundary: THREE.Vector3[] = []
    for (let j = 0; j <= 16; j++) {
      const bank = innerBankBounds(start)
      const v = THREE.MathUtils.lerp(bank.edge, outerEdge(start), j / 16)
      const height = v < bank.shore ? innerBankHeight(start, v) + 0.025
        : v < shoreline(start) ? 0.2 : terrainHeight(start, v, index) + 0.025
      boundary.push(spiral(start, v, height))
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary), new THREE.LineBasicMaterial({ color: '#c2b497', transparent: true, opacity: 0.23 })))
    queueVegetation(start, end, index)
    const middle = (start + end) / 2
    periodCenters.push(spiral(middle, 0.15, 0.55))
    const markerPoint = spiral(middle, -0.57, 0.25)
    const labelPoint = markerPoint.clone().add(new THREE.Vector3(0, 0.8 + index * 0.018, 0))
    labelPoints.push(labelPoint)
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([markerPoint, labelPoint]), new THREE.LineBasicMaterial({ color: '#d0e8e1', transparent: true, opacity: 0.32 }))
    group.add(stem)
    labelStems.push(stem)
    // Generic volcanic landscapes are illustrative of these long intervals;
    // these cones do not label any particular flood-basalt eruption or locality.
    if (OVERVIEW_VOLCANIC_PERIODS.includes(index)) {
      const t = THREE.MathUtils.lerp(start, end, 0.27)
      const early = index < 3
      const radius = early ? 0.43 + index * 0.035 : 0.70
      const coneHeight = early ? 0.76 : 1.04
      const volcano = new THREE.Group()
      volcano.position.copy(spiral(t, 0.65, baseTerrainHeight(t, 0.65, index)))
      const crater = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.12, 32), new THREE.MeshBasicMaterial({ color: '#242623', toneMapped: false }))
      crater.rotation.x = -Math.PI / 2
      crater.position.y = coneHeight * 0.485
      volcano.add(crater)
      for (let puff = 0; puff < 4; puff++) {
        const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture, opacity: 0.40, transparent: true, depthWrite: false, color: '#e1e4df', toneMapped: false }))
        smoke.position.set(puff * 0.065, coneHeight + 0.20 + puff * 0.29, puff * 0.035)
        smoke.scale.setScalar(0.37 + puff * 0.17)
        smokePuffs.push({ sprite: smoke, base: smoke.position.clone(), phase: index + puff * 1.4 })
        volcano.add(smoke)
      }
      group.add(volcano)
      pickMeshes.push(crater)
    }
    pickMeshes.push(land, water)
    world.add(group)
    registerPeriod(group, index)
  })


  const chronologyMarkers = createChronologyMarkers(spiral, periods.length)
  world.add(chronologyMarkers.group)
  chronologyMarkers.group.children.forEach(child => registerPeriod(child, Number(child.userData.periodIndex)))
  const firstMilestone = chronologyMarkers.milestones[0]
  if (firstMilestone) firstMilestone.position.copy(hadeanOrigin.center).add(new THREE.Vector3(-1.1, 0.4, 0.6))
  const outerChronology = createOuterChronology(spiral, periods)
  world.add(outerChronology.group)
  outerChronology.group.children.forEach(child => {
    registerPeriod(child, Number(child.userData.periodIndex))
    if (child instanceof THREE.Mesh) pickMeshes.push(child)
  })

  const panoramaMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false })
  // Animal motion belongs exclusively to the independent alpha-cutout layers.
  // The panorama remains a static backdrop except for the authored tidal water.
  const panoramaMotion = {
    enabled: { value: 0 }, time: { value: 0 }, water: { value: 0 },
  }
  let activeWaterMotion = false

  function configureEnvironmentMotion(id: string) {
    activeWaterMotion = id === 'proterozoic'
    panoramaMotion.enabled.value = 0
    panoramaMotion.water.value = activeWaterMotion ? 1 : 0
  }
  panoramaMaterial.onBeforeCompile = shader => {
    shader.uniforms.geoWaterMotion = panoramaMotion.enabled
    shader.uniforms.geoWaterTime = panoramaMotion.time
    shader.uniforms.geoWater = panoramaMotion.water
    shader.fragmentShader = `
      uniform float geoWaterMotion;
      uniform float geoWaterTime;
      uniform float geoWater;
    ` + shader.fragmentShader
    const sample = THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'geoPanoramaColor')
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec2 geoSampleUv = vMapUv;
        if (geoWaterMotion > 0.5 && geoWater > 0.5) {
          // Actual Proterozoic tidal pools only; shore and horizon stay fixed.
          vec2 imageUv = vec2(vMapUv.x, 1.0 - vMapUv.y);
          vec2 pool = (imageUv - vec2(0.51, 0.49)) / vec2(0.16, 0.055);
          vec2 shallows = (imageUv - vec2(0.51, 0.635)) / vec2(0.10, 0.045);
          float waterMask = max(1.0 - smoothstep(0.35, 1.0, dot(pool, pool)),
            1.0 - smoothstep(0.35, 1.0, dot(shallows, shallows)));
          geoSampleUv += waterMask * vec2(
            sin(imageUv.y * 310.0 + geoWaterTime * 1.15) * 0.00065,
            sin(imageUv.x * 145.0 + imageUv.y * 190.0 - geoWaterTime * 0.85) * 0.00028);
        }
        vec4 geoPanoramaColor = texture2D(map, geoSampleUv);
        vec2 geoDx = dFdx(geoSampleUv);
        vec2 geoDy = dFdy(geoSampleUv);
        float geoEdgeDistance = min(geoSampleUv.x, 1.0 - geoSampleUv.x);
        if (geoEdgeDistance < 0.02) {
          // Static seam blending; independent of animal motion and elapsed time.
          vec4 geoOppositeEdge = textureGrad(map, vec2(1.0 - geoSampleUv.x, geoSampleUv.y),
            vec2(-geoDx.x, geoDx.y), vec2(-geoDy.x, geoDy.y));
          float geoBlend = 0.5 * (1.0 - smoothstep(0.0, 0.02, geoEdgeDistance));
          geoPanoramaColor = mix(geoPanoramaColor, geoOppositeEdge, geoBlend);
        }
      #endif
    ` + sample)
  }
  panoramaMaterial.customProgramCacheKey = () => 'geological-static-panorama-water-seam-v5'
  const panoramaGeometry = new THREE.SphereGeometry(70, 72, 44)
  panoramaGeometry.scale(-1, 1, 1)
  const panorama = new THREE.Mesh(panoramaGeometry, panoramaMaterial)
  // In the inward sphere, u = 0.5 initially faces -X; rotate it toward +Z.
  panorama.rotation.y = Math.PI / 2
  panorama.visible = false
  panorama.frustumCulled = false
  scene.add(panorama)
  const panoramaEcosystem = createPanoramaEcosystem()
  const panoramaVolcanism = createPanoramaVolcanism()
  const panoramaLife = panoramaEcosystem.group
  panoramaLife.visible = false
  panoramaVolcanism.group.visible = false
  scene.add(panoramaLife, panoramaVolcanism.group)

  const loader = new THREE.TextureLoader()
  const cancelTextureLoads = new Set<() => void>()
  const textureCache = new Map<string, THREE.Texture>()
  const pendingTextures = new Map<string, Promise<THREE.Texture>>()
  const auxiliaryTextures = new Set<THREE.Texture>()
  let disposed = false
  let contextLost = false
  let mode: 'overview' | 'panorama' = 'overview'
  let enteringFlight = false
  let selected = 3
  let panoramaRequest = 0
  let requestedPanoramaUrl = ''
  let autoRotate = false
  let focusOrbit = false
  let focusOrbitElapsed = 0
  let focusOrbitDuration = 75
  let focusOrbitYaw = 0
  let focusOrbitRadius = 1
  let focusOrbitApproach: CameraFlight | null = null
  let lastFocusOrbitSightline = 0
  const focusOrbitCenter = new THREE.Vector3()
  const roamPath = createSpiralRoam(spiral, periods.length)
  let roamPhase: SpiralRoamState['phase'] = 'idle'
  let roamProgress = 0
  let roamVelocity = 0
  let lastRoamNotice = 0
  let lastRoamSightline = 0
  let tour = true
  let lifeMotion = true
  let lifeElapsed = 0
  let width = 1
  let height = 1
  let framingScale = 1
  let resizePending = true
  let flight: CameraFlight | null = null
  let raf = 0
  let lastFrame = performance.now()
  let flightSuspendedAt: number | null = document.hidden ? lastFrame : null
  let lastLabelFrame = 0
  let manualUntil = 0
  let yaw = 0
  let pitch = 0.015
  let targetYaw = 0
  let targetPitch = 0.015
  let targetFov = 68
  let tourVelocity = 0
  let tourPhase = 0
  let tourAnchorYaw = 0
  let tourDirection = -1
  let tourSweep = 0.35
  let initialYaw = 0
  let initialPitch = 0.015
  let initialFov = 68
  let pointerStart: { x: number; y: number; at: number } | null = null
  let previousPointer: { x: number; y: number } | null = null
  let pinchDistance = 0
  const pointers = new Map<number, { x: number; y: number }>()
  const savedPosition = initialPosition.clone()
  const savedTarget = initialTarget.clone()
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const projected = new THREE.Vector3()
  const labelOffsets = new Map<number, readonly number[]>()
  const ageOffsets = new Map<number, readonly number[]>()
  const lookDirection = new THREE.Vector3()

  function slicedAtlas(texture: THREE.Texture, cell: number, columns: number, rows: number, bounds?: number[]) {
    const tile = texture.clone()
    const inset = 0.002
    const crop = atlasCrop(bounds)
    tile.repeat.set(crop.width / columns - inset * 2, crop.height / rows - inset * 2)
    tile.offset.set((cell % columns + crop.x0) / columns + inset, 1 - (Math.floor(cell / columns) + crop.y1) / rows + inset)
    tile.needsUpdate = true
    auxiliaryTextures.add(tile)
    return tile
  }

  type IllustrationJob = { filename: string; apply: (texture: THREE.Texture) => void; failed: boolean; running: Promise<void> | null }
  const illustrationJobs: IllustrationJob[] = []

  function loadTextureWithTimeout(url: string, timeoutMs: number): Promise<THREE.Texture> {
    if (disposed) return Promise.reject(new Error('Scene disposed'))
    return new Promise((resolve, reject) => {
      let settled = false
      let timer: number | undefined
      const fail = (reason: unknown) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        cancelTextureLoads.delete(cancel)
        reject(reason)
      }
      const cancel = () => fail(new Error('Scene disposed'))
      cancelTextureLoads.add(cancel)
      timer = window.setTimeout(() => fail(new Error('Image load timed out')), timeoutMs)
      void Promise.resolve().then(() => {
        if (settled || disposed) throw new Error('Scene disposed')
        return loader.loadAsync(url)
      }).then(texture => {
        // TextureLoader cannot abort an Image request. A timed-out or disposed
        // scene must release its eventual result instead of installing it.
        if (settled || disposed) {
          texture.dispose()
          if (!settled) cancel()
          return
        }
        settled = true
        window.clearTimeout(timer)
        cancelTextureLoads.delete(cancel)
        resolve(texture)
      }, fail)
    })
  }

  function notifyIllustrations() {
    if (disposed) return
    callbacks.onIllustrationState?.({
      failed: illustrationJobs.filter(job => job.failed).length,
      retrying: illustrationJobs.some(job => job.failed && job.running !== null),
    })
  }

  async function loadIllustration(filename: string): Promise<THREE.Texture> {
    let failure: unknown
    // One bounded automatic retry absorbs a transient resource failure.
    // Further attempts require the explicit, resource-only retry button.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (disposed) throw new Error('Scene disposed')
      try {
        const texture = await loadTextureWithTimeout(assetUrl(filename), 15000)
        if (disposed) {
          texture.dispose()
          throw new Error('Scene disposed')
        }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        auxiliaryTextures.add(texture)
        return texture
      } catch (error) {
        if (disposed) throw error
        failure = error
      }
    }
    throw failure
  }

  function runIllustration(job: IllustrationJob): Promise<void> {
    if (disposed) return Promise.resolve()
    if (job.running) return job.running
    job.running = (async () => {
      try {
        const texture = await loadIllustration(job.filename)
        if (disposed) return
        job.apply(texture)
        job.failed = false
      } catch (error) {
        if (!disposed) {
          job.failed = true
          console.warn('[geological-time] Illustration failed:', job.filename, error)
        }
      } finally {
        job.running = null
        notifyIllustrations()
      }
    })()
    notifyIllustrations()
    return job.running
  }

  function queueIllustration(filename: string, apply: (texture: THREE.Texture) => void) {
    const job: IllustrationJob = { filename, apply, failed: false, running: null }
    illustrationJobs.push(job)
    void runIllustration(job)
  }

  async function retryIllustrations() {
    if (disposed) return
    await Promise.all(illustrationJobs.filter(job => job.failed).map(runIllustration))
  }

  queueIllustration('terrain-atlas.webp', texture => {
    // The forest-litter tile contains broad leaves, so it is reserved for the
    // late Cretaceous and Cenozoic rather than used in older forest scenes.
    // Pale exposed ground and greenish wet forest floors follow the supplied
    // textbook. The Quaternary outer bank stays bare, with local volcanic relief.
    const terrainCells = [0, 0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1]
    terrainMaterials.forEach((material, index) => {
      const tile = slicedAtlas(texture, terrainCells[index] ?? 1, 3, 2)
      material.map = tile
      material.bumpMap = tile
      material.bumpScale = index === 14 ? 0.1 : 0.16
      material.vertexColors = false
      material.color.set('#eee8d5')
      material.roughness = 0.95
      material.metalness = 0
      material.needsUpdate = true
    })
    // The Cenozoic inner woodland has an olive ground layer; the opposite
    // exposed mountains remain pale rock, not the same dark leaf-litter tile.
    innerSoilMaterials.forEach(material => {
      material.map = slicedAtlas(texture, 2, 3, 2)
      material.bumpMap = material.map
      material.bumpScale = 0.07
      material.vertexColors = false
      material.color.set('#bdc69a')
      material.roughness = 0.98
      material.needsUpdate = true
    })
    // Photographic rock is also a useful fallback until the layered cliff loads.
    for (const material of [cliffMaterial, ...cliffMaterials]) {
      if (material.map) continue
      material.map = slicedAtlas(texture, 1, 3, 2)
      material.bumpMap = material.map
      material.bumpScale = 0.1
      material.vertexColors = false
      material.color.set('#b7ab96')
      material.needsUpdate = true
    }
  })

  queueIllustration('cliff-strata.webp', texture => {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2.5, 1)
    texture.needsUpdate = true
    for (const material of [cliffMaterial, ...cliffMaterials]) {
      material.map = texture
      material.bumpMap = texture
      material.bumpScale = 0.13
      material.vertexColors = false
      material.color.set('#e0ddd6')
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          float layerGray = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(layerGray), 0.65) * 0.82 + vec3(0.10, 0.11, 0.11);
        `)
      }
      material.customProgramCacheKey = () => 'textbook-gray-strata-v1'
      material.roughness = 0.98
      material.needsUpdate = true
    }
  })

  queueIllustration('vegetation-atlas.webp', texture => {
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    // Three crossed photo cutouts retain their volume as the lesson is orbited.
    for (let plane = 0; plane < 3; plane++) {
      const a = plane / 3 * Math.PI
      const dx = Math.cos(a) * 0.5
      const dz = Math.sin(a) * 0.5
      const base = positions.length / 3
      positions.push(-dx, 0, -dz, dx, 0, dz, -dx, 1, -dz, dx, 1, dz)
      uvs.push(0, 0, 1, 0, 0, 1, 1, 1)
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const dummy = new THREE.Object3D()
    for (let period = 0; period < periods.length; period++) {
      const periodInstances = vegetationPlacements.filter(placement => placement.period === period)
      for (const cell of new Set(periodInstances.map(placement => placement.cell))) {
        const instances = periodInstances.filter(placement => placement.cell === cell)
        const material = new THREE.MeshBasicMaterial({
          map: slicedAtlas(texture, cell, 3, 2, VEGETATION_BOUNDS[cell]),
          alphaTest: 0.35,
          side: THREE.DoubleSide,
          color: '#c5c8b6',
          toneMapped: false,
        })
        const plants = new THREE.InstancedMesh(geometry, material, instances.length)
        instances.forEach((placement, index) => {
          dummy.position.copy(placement.position)
          dummy.rotation.set(0, placement.yaw, 0)
          const aspect = atlasCrop(VEGETATION_BOUNDS[cell]).aspect
          dummy.scale.set(placement.height * aspect, placement.height, placement.height * aspect)
          dummy.updateMatrix()
          plants.setMatrixAt(index, dummy.matrix)
        })
        plants.castShadow = true
        plants.instanceMatrix.needsUpdate = true
        plants.computeBoundingSphere()
        world.add(plants)
        registerPeriod(plants, period)
      }
    }
    updateFocusVisuals(0, true)
  })

  type LifeCard = { period: number; cell: number; size: number; v: number; fraction?: number; lift?: number; bank?: OverviewBankSide; inland?: number; adjacentPeriod?: number; overviewOnly?: boolean; softEdges?: boolean; inspectionTilt?: number; tint?: string; label?: string; scaleNote?: string; kind: 'marine' | 'land' | 'microbe' | 'plant' }
  type LifeAtlas = { texture: THREE.Texture; columns: number; rows: number; cards: LifeCard[]; bounds: number[][]; padding: number }
  const lifeAtlases: LifeAtlas[] = []
  const primaryCards: LifeCard[] = [
    { period: 3, cell: 0, size: 1.30, v: -0.38, fraction: 0.72, kind: 'marine' },
    { period: 7, cell: 1, size: 1.58, v: 0.42, kind: 'land' },
    { period: 8, cell: 2, size: 1.66, v: 0.42, kind: 'land' },
    { period: 10, cell: 3, size: 2.20, v: 0.42, kind: 'land' },
    { period: 11, cell: 4, size: 1.99, v: 0.42, kind: 'land' },
    { period: 14, cell: 5, size: 1.52, v: 0.40, fraction: 0.76, bank: 'inner', inland: 0.60, kind: 'land' },
  ]
  const earlyCards: LifeCard[] = [
    { period: 1, cell: 0, size: 1.0, v: -0.45, kind: 'microbe' },
    { period: 2, cell: 1, size: 1.25, v: -0.28, kind: 'microbe' },
    // Crinoids are animals; 'plant' here selects anchored swaying motion only.
    { period: 4, cell: 2, size: 1.35, v: -0.57, fraction: 0.35, kind: 'plant' },
    { period: 5, cell: 3, size: 1.00, v: -0.36, kind: 'marine' },
    { period: 6, cell: 4, size: 1.6, v: -0.43, kind: 'marine' },
    { period: 9, cell: 5, size: 1.66, v: 0.42, kind: 'land' },
    { period: 12, cell: 6, size: 0.70, v: 0.42, fraction: 0.72, bank: 'inner', inland: 0.56, kind: 'land' },
    { period: 13, cell: 7, ...BOUNDARY_RHINO, v: 0.40, bank: 'inner', adjacentPeriod: 14, kind: 'land', label: '犀类示意（新近纪—第四纪分界）' },
    { period: 4, cell: 8, size: 1.35, v: -0.28, fraction: 0.80, kind: 'marine' },
    // Broad clade reminders on the overview only; these are not assignments
    // of the textbook's indistinct fish outlines to particular fossil species.
    { period: 7, cell: 2, size: 0.90, v: -0.36, fraction: 0.45, kind: 'plant', overviewOnly: true, label: '海百合类示意' },
    { period: 9, cell: 2, size: 1.05, v: -0.36, fraction: 0.52, kind: 'plant', overviewOnly: true, label: '海百合类示意' },
  ]
  // These marine reconstructions belong only to the period overview, never to
  // the geographically specific river/forest panorama. Fixed animals do not swim.
  const marineCards: LifeCard[] = [
    { period: 3, cell: 0, size: 1.30, v: -0.30, fraction: 0.24, kind: 'marine', overviewOnly: true },
    // A sponge is an animal; 'plant' only selects an upright, anchored cutout.
    { period: 3, cell: 1, size: 0.51, v: -0.10, fraction: 0.12, kind: 'plant', overviewOnly: true },
    { period: 4, cell: 2, size: 0.84, v: -0.36, fraction: 0.54, kind: 'marine', overviewOnly: true },
    { period: 5, cell: 3, size: 1.20, v: -0.37, fraction: 0.25, kind: 'marine', overviewOnly: true },
    { period: 10, cell: 4, size: 0.95, v: -0.48, fraction: 0.26, kind: 'marine', overviewOnly: true },
    { period: 10, cell: 5, size: 1.40, v: -0.45, fraction: 0.76, kind: 'marine', overviewOnly: true },
    { period: 7, cell: 2, size: 0.76, v: -0.38, fraction: 0.62, kind: 'marine', overviewOnly: true, label: '腕足动物类群示意' },
    { period: 8, cell: 2, size: 0.80, v: -0.42, fraction: 0.25, kind: 'marine', overviewOnly: true, label: '腕足动物类群示意' },
  ]

  function makeLifeMaterial(atlas: LifeAtlas, card: LifeCard, animateLife = false) {
    const crop = atlasCrop(atlas.bounds[card.cell], atlas.padding)
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        atlas: { value: atlas.texture },
        atlasOffset: { value: new THREE.Vector2((card.cell % atlas.columns + crop.x0) / atlas.columns, 1 - (Math.floor(card.cell / atlas.columns) + crop.y1) / atlas.rows) },
        atlasScale: { value: new THREE.Vector2(crop.width / atlas.columns, crop.height / atlas.rows) },
        lifeTime: { value: 0 },
        motion: { value: animateLife ? 1 : 0 },
        imageOpacity: { value: 1 },
        imageTint: { value: new THREE.Color('#ffffff') },
        alphaCutoff: { value: card.softEdges ? 0.035 : 0.35 },
        lifeKind: { value: card.kind === 'marine' ? (card.period === 3 || card.period === 5 ? 3 : 1) : card.kind === 'plant' ? 2 : 0 },
        waterAligned: { value: !animateLife && card.kind === 'marine' ? 1 : 0 },
        inspectionBlend: { value: 0 },
        inspectionTilt: { value: card.inspectionTilt ?? 0.36 },
      },
      vertexShader: `
        varying vec2 atlasUv;
        uniform vec2 atlasOffset;
        uniform vec2 atlasScale;
        uniform float lifeTime;
        uniform float motion;
        uniform float lifeKind;
        uniform float waterAligned;
        uniform float inspectionBlend;
        uniform float inspectionTilt;
        void main() {
          atlasUv = atlasOffset + uv * atlasScale;
          vec3 local = position;
          float upper = smoothstep(0.2, 0.55, uv.y);
          if (lifeKind < 0.5) {
            local.y += sin(lifeTime * 1.7) * 0.007 * upper * motion;
            float edge = smoothstep(0.65, 0.96, abs(uv.x - 0.5) * 2.0);
            local.y += sin(lifeTime * 0.9 + uv.x * 5.0) * 0.008 * edge * upper * motion;
          } else if (lifeKind < 1.5) {
            local.y += sin(lifeTime * 1.3 + uv.x * 7.0) * 0.012 * smoothstep(0.5, 0.95, uv.x) * motion;
          } else if (lifeKind < 2.5) {
            local.x += sin(lifeTime * 0.65 + uv.y * 3.0) * 0.018 * uv.y * uv.y * motion;
          } else {
            // Benthic trilobites/eurypterids stay on the substrate. Only the
            // peripheral appendage region moves; the body never swims or bobs.
            float appendages = smoothstep(0.45, 0.85, abs(uv.x - 0.5) * 2.0)
              * (1.0 - smoothstep(0.25, 0.7, uv.y));
            local.x += sin(lifeTime * 1.2 + uv.x * 12.0) * 0.006 * appendages * motion;
          }
          if (waterAligned > 0.5) {
            vec4 surface = modelViewMatrix * vec4(local, 1.0);
            vec4 raised = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec2 dimensions = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
            raised.xy += vec2(local.x, local.y + 0.5) * dimensions;
            // A slight inspection tilt keeps water animals legible without
            // lifting them upright over the land like flying creatures.
            gl_Position = projectionMatrix * mix(surface, raised, inspectionBlend * inspectionTilt);
            return;
          }
          vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec2 size = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
          center.xy += local.xy * size;
          gl_Position = projectionMatrix * center;
        }
      `,
      fragmentShader: `
        varying vec2 atlasUv;
        uniform sampler2D atlas;
        uniform float imageOpacity;
        uniform vec3 imageTint;
        uniform float alphaCutoff;
        void main() {
          vec4 color = texture2D(atlas, atlasUv);
          if (color.a < alphaCutoff) discard;
          gl_FragColor = vec4(color.rgb * imageTint, color.a * imageOpacity);
          #include <colorspace_fragment>
        }
      `,
    })
  }

  function loadLifeAtlas(filename: string, columns: number, rows: number, cards: LifeCard[], bounds: number[][], padding = 0.01) {
    queueIllustration(filename, texture => {
      const atlas = { texture, columns, rows, cards, bounds, padding }
      lifeAtlases.push(atlas)
      const geometry = new THREE.PlaneGeometry(1, 1, 24, 16)
      const image = texture.image as { width?: number; height?: number }
      const cellAspect = ((image.width ?? columns) / columns) / ((image.height ?? rows) / rows)
      for (const card of cards) {
        if (!periods[card.period]) continue
        const t = (card.period + (card.fraction ?? 0.67)) / periods.length
        const aquatic = card.kind === 'marine' || card.kind === 'microbe' || card.kind === 'plant'
        const bankPoint = card.bank && !aquatic
          ? overviewBankPoint(card.period, card.fraction ?? 0.67, card.bank, card.inland ?? 0.5)
          : undefined
        const placementT = bankPoint?.t ?? t
        // Later coils have a separate inner bank: its real shoreline, rather
        // than the original ribbon edge, bounds the available water surface.
        const waterInnerLimit = card.period >= 12 ? innerBankBounds(t).shore + 0.12 : innerEdge(t) + 0.14
        const across = bankPoint?.across ?? (aquatic ? THREE.MathUtils.clamp(card.v, waterInnerLimit, shoreline(t) - 0.12) : card.v)
        const lift = (bankPoint?.height ?? (aquatic ? 0.17 : terrainHeight(t, across, card.period))) + (card.lift ?? 0)
        const crop = atlasCrop(bounds[card.cell], padding)
        const imageHeight = card.size / (crop.aspect * cellAspect)
        const billboard = new THREE.Mesh(geometry, makeLifeMaterial(atlas, card))
        if (card.adjacentPeriod !== undefined) billboard.material.userData.adjacentPeriod = card.adjacentPeriod
        if (card.label) { billboard.name = card.label; billboard.userData.label = card.label }
        if (card.kind === 'marine') {
          billboard.position.copy(spiral(placementT, across, 0.195))
          billboard.rotation.set(-Math.PI / 2, -Math.atan2(billboard.position.z, billboard.position.x) - Math.PI / 2, 0, 'YXZ')
          billboard.material.uniforms.imageTint!.value.set(card.tint ?? '#e4f3f3')
          billboard.material.uniforms.imageOpacity!.value = 1
        } else {
          billboard.position.copy(spiral(placementT, across, lift + imageHeight * (0.5 - padding / crop.height)))
          if (card.overviewOnly && aquatic) billboard.material.uniforms.imageTint!.value.set('#b1dce0')
        }
        billboard.scale.set(card.size, imageHeight, 1)
        billboard.frustumCulled = false
        world.add(billboard)
        registerPeriod(billboard, card.period)
        pickMeshes.push(billboard)
        if (card.scaleNote) {
          const canvas = document.createElement('canvas')
          canvas.width = 512; canvas.height = 72
          const context = canvas.getContext('2d')
          if (context) {
            context.font = '500 40px "Microsoft YaHei", sans-serif'
            context.textAlign = 'center'; context.textBaseline = 'middle'
            context.fillStyle = '#e0ecd1'
            context.fillText(card.scaleNote, 256, 36)
            const map = new THREE.CanvasTexture(canvas)
            map.colorSpace = THREE.SRGBColorSpace
            auxiliaryTextures.add(map)
            const note = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }))
            note.position.copy(billboard.position).add(new THREE.Vector3(0, imageHeight * 0.5 + 0.14, 0))
            note.scale.set(1.55, 0.218, 1)
            note.renderOrder = 3
            note.name = card.scaleNote
            world.add(note)
            registerPeriod(note, card.period)
          }
        }
      }
      updateFocusVisuals(0, true)

    })
  }

  loadLifeAtlas('life-atlas.webp', 3, 2, primaryCards, LIFE_BOUNDS)
  loadLifeAtlas('life-atlas-early.webp', 3, 3, earlyCards, EARLY_LIFE_BOUNDS)
  // Millimetre-scale branched green algae, enlarged with an explicit scale
  // note. Never show them as Archean organisms or as a giant kelp forest.
  loadLifeAtlas('proterozoic-algae.png', 1, 1, [
    { period: 2, cell: 0, size: 0.58, v: -0.56, fraction: 0.38, kind: 'plant', overviewOnly: true, softEdges: true, label: '元古宙分枝绿藻放大示意', scaleNote: '绿藻 · 放大示意' },
  ], [[.043619792, .023437500, .965494792, .971679688]], .004)
  loadLifeAtlas('marine-atlas.webp', 3, 2, marineCards, MARINE_LIFE_BOUNDS, 4 / 512)
  // The textbook's tower-shaped shell is represented by a Silurian high-spired
  // gastropod. This is a static benthic symbol, not a swimming ammonite.
  loadLifeAtlas('silurian-gastropod.png', 1, 1, [
    { period: 5, cell: 0, size: 0.55, v: -0.36, fraction: 0.90, kind: 'marine', overviewOnly: true, softEdges: true, label: '志留纪高螺塔腹足类示意' },
  ], [[.2264752791, .0470494418, .8173843700, .9609250399]], .004)
  // Eocene archaeocete morphology belongs to the Paleogene marine overview;
  // it must not be inserted into the Green River freshwater panorama.
  loadLifeAtlas('paleogene-archaeocete.png', 1, 1, [
    { period: 12, cell: 0, size: 2.30, v: -0.34, fraction: 0.84, kind: 'marine', overviewOnly: true, softEdges: true, inspectionTilt: 0.60, label: '古近纪长身古鲸类示意' },
  ], [[.017495396, .182320442, .989410681, .809392265]], .004)
  // Textbook waterway symbols. These are overview illustrations of broad
  // groups, not co-occurring fauna in a single freshwater panorama.
  loadLifeAtlas('marine-textbook-atlas.png', 3, 2, [
    { period: 11, cell: 0, size: 1.10, v: -0.40, fraction: 0.24, kind: 'marine', overviewOnly: true, label: '鳐形鱼类示意' },
    { period: 11, cell: 1, size: 1.25, v: -0.33, fraction: 0.45, kind: 'marine', overviewOnly: true, label: '鱿鱼状鞘形类示意' },
    { period: 11, cell: 2, size: 0.64, v: -0.34, fraction: 0.65, kind: 'marine', overviewOnly: true, label: '海星类示意' },
    { period: 11, cell: 3, size: 0.61, v: -0.31, fraction: 0.82, kind: 'marine', overviewOnly: true, label: '海胆类示意' },
    { period: 12, cell: 4, size: 0.80, v: -0.30, fraction: 0.44, kind: 'marine', overviewOnly: true, label: '扇形双壳类示意' },
    { period: 12, cell: 5, size: 0.85, v: -0.18, fraction: 0.61, kind: 'marine', overviewOnly: true, label: '辐鳍鱼类示意' },
    { period: 13, cell: 5, size: 0.90, v: -0.88, fraction: 0.38, kind: 'marine', overviewOnly: true, label: '辐鳍鱼类示意' },
    { period: 14, cell: 5, size: 0.90, v: -0.88, fraction: 0.61, kind: 'marine', overviewOnly: true, label: '辐鳍鱼类示意' },
  ], [
    [.259766, .314453, .873047, .798828], [.142578, .412109, .865234, .789062],
    [.208984, .277344, .826172, .851562], [.179688, .123047, .857422, .748047],
    [.177734, .152344, .781250, .718750], [.111328, .236328, .876953, .679688],
  ], .004)
  // Distinct high-bodied silhouette outside the arrow, matching the textbook
  // composition. Vertical bands are an artistic choice, not fossil colour data.
  loadLifeAtlas('cenozoic-deep-bodied-fish.png', 1, 1, [
    { period: 13, cell: 0, size: 0.76, v: -0.37, fraction: 0.73, kind: 'marine', overviewOnly: true, label: '高体辐鳍鱼类示意' },
  ], [[.0159489633, .1012759171, .9856459330, .8548644338]], .004)
  // A documented Quaternary gastropod shape supplements the indistinct cone
  // in the textbook. This is not an identification of that printed organism.
  // Overview cards are stationary; the benthic shell is never made to swim.
  loadLifeAtlas('cenozoic-turret-shell.png', 1, 1, [
    { period: 14, cell: 0, size: 1.30, v: -0.86, fraction: 0.30, kind: 'marine', overviewOnly: true, label: '高塔形腹足类贝壳示意（代表性补充）' },
  ], [[.03268877, .20856354, .96685083, .77900552]], .004)
  loadLifeAtlas('coelophysis.png', 1, 1, [
    { period: 9, cell: 0, size: 1.40, v: 0.30, fraction: 0.34, bank: 'inner', inland: 0.60, kind: 'land', overviewOnly: true, softEdges: true, label: '晚三叠世早期兽脚类示意（腔骨龙形态参照）' },
  ], [[.017474634, .127395716, .986471251, .906426156]], .004)
  loadLifeAtlas('plesiosaur.png', 1, 1, [
    { period: 10, cell: 0, size: 1.85, v: -0.49, fraction: 0.54, kind: 'marine', overviewOnly: true, softEdges: true, inspectionTilt: 0.60, tint: '#c5d3aa', label: '长颈蛇颈龙类示意' },
  ], [[.025214322, .145018916, .975289965, .847414880]], .004)
  loadLifeAtlas('coryphodon.png', 1, 1, [
    { period: 12, cell: 0, size: 1.70, v: 0.40, fraction: 0.38, bank: 'inner', inland: 0.55, kind: 'land', overviewOnly: true, softEdges: true, label: '古近纪大型哺乳动物示意（冠齿兽形态参照）' },
  ], [[.022786458, .125976563, .977213542, .857421875]], .004)
  loadLifeAtlas('quaternary-horse.png', 1, 1, [
    { period: 14, cell: 0, ...QUATERNARY_HORSE, v: 0.40, bank: 'inner', kind: 'land', overviewOnly: true, softEdges: true, label: '第四纪马类示意' },
  ], [[.055989583, .020507813, .958333333, .967773438]], .004)
  loadLifeAtlas('neogene-camelid.png', 1, 1, [
    { period: 13, cell: 0, size: 1.48, v: 0.30, fraction: 0.79, bank: 'outer', inland: 0.25, kind: 'land', overviewOnly: true, softEdges: true, label: '新近纪驼类示意' },
  ], [[.0924479167, .0185546875, .8808593750, .96484375]], .004)
  // A long-tailed pterosaur above the Jurassic overview; the geographically
  // specific Morrison panorama remains a separate reconstruction.
  loadLifeAtlas('rhamphorhynchus.png', 1, 1, [
    { period: 10, cell: 0, size: 1.65, v: 0.24, fraction: 0.38, lift: 1.65, kind: 'land', overviewOnly: true, softEdges: true, label: '长尾翼龙示意（喙嘴翼龙类）' },
  ], [[0.0069, 0.0227, 0.9947, 0.8732]], 0.004)
  // Separate Cretaceous reconstructions; the Jurassic long-tailed pterosaur
  // is not reused as a substitute for the textbook's later flying silhouette.
  loadLifeAtlas('pteranodon.png', 1, 1, [
    { period: 11, cell: 0, size: 1.48, v: 0.70, fraction: 0.86, lift: 1.35, kind: 'land', overviewOnly: true, softEdges: true, label: '无齿翼龙类示意' },
  ], [[0.034505, 0.015625, 0.987630, 0.969727]], 0.004)
  loadLifeAtlas('ceratopsian.png', 1, 1, [
    { period: 11, cell: 0, size: 1.68, v: 0.40, fraction: 0.43, bank: 'outer', inland: 0.40, kind: 'land', overviewOnly: true, softEdges: true, label: '角龙类示意（三角龙形态参照）' },
    { period: 11, cell: 0, size: 1.26, v: 0.40, fraction: 0.60, bank: 'inner', inland: 0.45, kind: 'land', overviewOnly: true, softEdges: true, label: '角龙类内岸生态示意' },
  ], [[0.011068, 0.085938, 0.990885, 0.886719]], 0.004)
  // Terrestrial cycad-like seed plants complement conifers in the Mesozoic.
  // `land` controls ground placement here, not biological classification.
  loadLifeAtlas('cycad.png', 1, 1, [
    { period: 9, cell: 0, size: 0.72, v: 0.28, fraction: 0.12, bank: 'inner', inland: 0.68, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 9, cell: 0, size: 0.65, v: 0.28, fraction: 0.66, bank: 'inner', inland: 0.65, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 9, cell: 0, size: 0.90, v: 0.28, fraction: 0.48, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 10, cell: 0, size: 1.05, v: 0.30, fraction: 0.13, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 10, cell: 0, size: 0.85, v: 0.30, fraction: 0.86, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 10, cell: 0, size: 0.68, v: 0.30, fraction: 0.22, bank: 'inner', inland: 0.65, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 10, cell: 0, size: 0.70, v: 0.30, fraction: 0.72, bank: 'inner', inland: 0.65, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 11, cell: 0, size: 0.92, v: 0.30, fraction: 0.16, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
    { period: 11, cell: 0, size: 0.65, v: 0.30, fraction: 0.24, bank: 'inner', inland: 0.65, kind: 'land', overviewOnly: true, softEdges: true, label: '苏铁类植物示意' },
  ], [[0.019139, 0.115630, 0.983254, 0.886762]], 0.004)
  // The overview spans the whole Devonian, including later early tetrapods.
  // Do not insert this into the older, locality-specific Gilboa panorama.
  loadLifeAtlas('early-tetrapod.png', 1, 1, [
    { period: 6, cell: 0, size: 1.35, v: 0.20, fraction: 0.45, bank: 'inner', inland: 0.40, kind: 'land', overviewOnly: true, softEdges: true, label: '晚泥盆世早期四足动物示意' },
  ], [[0.018416, 0.237569, 0.987109, 0.861878]], 0.004)
  loadLifeAtlas('stegosaurus.webp', 1, 1, [
    { period: 10, cell: 0, ...JURASSIC_STEGOSAURUS, kind: 'land', overviewOnly: true, label: '剑龙' },
    { period: 10, cell: 0, size: 1.16, v: 0.40, fraction: 0.39, bank: 'inner', inland: 0.45, kind: 'land', overviewOnly: true, label: '剑龙内岸生态示意' },
  ], [[0.01888, 0.09961, 0.99023, 0.85156]], 0.008)
  // A general Pleistocene life vignette, not a claim about the first use of fire.
  loadLifeAtlas('human-camp.webp', 1, 1, [
    { period: 14, cell: 0, size: 1.02, v: 0.38, fraction: 0.90, bank: 'inner', inland: 0.60, kind: 'land', overviewOnly: true, softEdges: true, label: '更新世人类用火生活示意' },
  ], [[0.106858, 0.039075, 0.960128, 0.924242]], 0)

  function cancelFlight() {
    const complete = flight?.complete
    flight = null
    complete?.()
  }

  function flyTo(position: THREE.Vector3, target: THREE.Vector3, duration: number, fov = camera.fov): Promise<void> {
    cancelFlight()
    if (reducedMotion.matches || duration === 0) {
      camera.position.copy(position)
      controls.target.copy(target)
      camera.fov = fov
      camera.updateProjectionMatrix()
      camera.lookAt(target)
      return Promise.resolve()
    }
    return new Promise(resolve => {
      flight = { from: camera.position.clone(), to: position.clone(), fromTarget: controls.target.clone(), toTarget: target.clone(), started: performance.now(), duration, fromFov: camera.fov, toFov: fov, complete: resolve }
    })
  }

  function updateHighlights() {
    accents.forEach((accent, index) => {
      const material = accent.material as THREE.LineBasicMaterial
      material.userData.focusBaseOpacity = index === selected ? 0.4 : 0
      material.opacity = material.userData.focusBaseOpacity
    })
  }

  function focusSightlines(index: number, position: THREE.Vector3, samples: THREE.Vector3[]) {
    const obstructing = new Set<number>()
    let ownTerrainPenalty = 0
    // The perspective shader's cutouts do not have matching CPU geometry.
    // Assess actual terrain only, which is stable even before atlases finish.
    const terrain = pickMeshes.filter(object => {
      const material = (object as THREE.Mesh).material
      return material && !Array.isArray(material) && !(material instanceof THREE.ShaderMaterial)
    })
    for (const sample of samples) {
      const direction = sample.clone().sub(position)
      focusRaycaster.near = 0.05
      focusRaycaster.far = Math.max(0.06, direction.length() - 0.3)
      focusRaycaster.set(position, direction.normalize())
      const seen = new Set<number>()
      for (const hit of focusRaycaster.intersectObjects(terrain, false)) {
        const period: unknown = hit.object.userData.periodIndex
        if (typeof period !== 'number' || period < 0 || seen.has(period)) continue
        seen.add(period)
        if (period === index) ownTerrainPenalty += 3
        else obstructing.add(period)
      }
    }
    return { obstructing, ownTerrainPenalty }
  }

  function focusSamples(index: number, target: THREE.Vector3): THREE.Vector3[] {
    const fractions = index === 13 ? [0.44, 0.78, BOUNDARY_RHINO.fraction]
      : index === 14 ? [QUATERNARY_HORSE.fraction, 0.76, 0.90] : [0.24, 0.5, 0.76]
    return index === 0 ? [target.clone(), target.clone().add(new THREE.Vector3(0, 0.5, 0))] : fractions.flatMap(fraction => {
      const t = (index + fraction) / periods.length
      return [
        overviewBankPoint(index, fraction, 'inner', 0.5, 0.30).position,
        spiral(t, -0.45, 0.3),
        spiral(t, 0.62, terrainHeight(t, 0.62, index) + 0.45),
      ]
    })
  }

  function focusWidthAllowance(index: number | null) {
    return index === 14 ? 1.60 : index === 13 ? 1.40 : 0.90
  }

  function focusPose(index: number): { position: THREE.Vector3; target: THREE.Vector3 } {
    // Include the shore rhino at the Neogene–Quaternary boundary when framing
    // the Neogene segment. The horse stands farther inland in the Quaternary.
    const target = index === 13
      ? overviewBankPoint(index, 0.78, 'inner', 0.5, 0.55).position
      : (periodCenters[index] ?? initialTarget).clone().add(new THREE.Vector3(0, 0.08, 0))
    // Approach from the sea side at 12 degrees above the horizon. The previous
    // 60–78 degree elevation exposed the sea but read as a bird's-eye view.
    const inward = index === 0
      ? new THREE.Vector3(initialPosition.x, 0, initialPosition.z).normalize()
      : new THREE.Vector3(-target.x, 0, -target.z).normalize()
    const widthAllowance = focusWidthAllowance(index)
    const distance = (8.8 + index / Math.max(1, periods.length - 1) * 6.2) * Math.max(1, widthAllowance / camera.aspect)
    const elevation = THREE.MathUtils.degToRad(12)
    const samples = focusSamples(index, target)
    world.updateMatrixWorld(true)
    let bestPosition = target.clone()
    let bestOccluders = new Set<number>()
    let bestScore = Infinity
    // Small changes in azimuth can look through a gap without lifting the camera.
    for (const azimuth of [0, -0.40, 0.40, -0.75, 0.75]) {
      const direction = inward.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, azimuth)
      direction.multiplyScalar(Math.cos(elevation))
      direction.y = Math.sin(elevation)
      const position = target.clone().addScaledVector(direction, distance)
      const result = focusSightlines(index, position, samples)
      const score = result.ownTerrainPenalty + result.obstructing.size + Math.abs(azimuth) * 0.2
      if (score < bestScore) {
        bestScore = score
        bestPosition = position
        bestOccluders = result.obstructing
      }
    }
    focusOccluders.clear()
    bestOccluders.forEach(period => focusOccluders.add(period))
    return { position: bestPosition, target }
  }

  function stopFocusOrbit() {
    if (!focusOrbit) return
    focusOrbit = false
    if (flight && flight === focusOrbitApproach) cancelFlight()
    focusOrbitApproach = null
    callbacks.onFocusOrbitChange?.(false)
  }

  function setFocusOrbit(enabled: boolean) {
    if (!enabled) { stopFocusOrbit(); return }
    if (disposed || contextLost || mode !== 'overview' || focusedIndex === null || roamPhase !== 'idle' || enteringFlight || requestedPanoramaUrl) {
      callbacks.onFocusOrbitChange?.(false)
      return
    }
    if (focusOrbit) return
    autoRotate = false
    controls.autoRotate = false
    // Keep the segment's authored center even after manual panning. If its
    // approach flight is still running, finish that approach before orbiting.
    const destination = (flight?.to ?? camera.position).clone()
    const offset = destination.sub(focusOrbitCenter)
    focusOrbitRadius = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance)
    focusOrbitYaw = Math.atan2(offset.x, offset.z)
    focusOrbitElapsed = 0
    focusOrbitDuration = reducedMotion.matches ? 110 : 75
    lastFocusOrbitSightline = 0
    focusOrbitApproach = null
    // Flush OrbitControls' residual drag without changing the visible pose.
    const position = camera.position.clone()
    const target = controls.target.clone()
    const damping = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
    camera.position.copy(position)
    controls.target.copy(target)
    if (!flight) {
      const elevation = THREE.MathUtils.degToRad(12)
      const start = focusOrbitCenter.clone().add(new THREE.Vector3(
        Math.sin(focusOrbitYaw) * Math.cos(elevation), Math.sin(elevation), Math.cos(focusOrbitYaw) * Math.cos(elevation),
      ).multiplyScalar(focusOrbitRadius))
      void flyTo(start, focusOrbitCenter, 650, OVERVIEW_FOV)
      focusOrbitApproach = flight
    }
    focusOrbit = true
    callbacks.onFocusOrbitChange?.(true)
  }

  function advanceFocusOrbit(dt: number, now: number) {
    if (!focusOrbit || flight || focusedIndex === null) return
    // Only visible frame time advances the circuit: a hidden tab never jumps.
    focusOrbitElapsed = Math.min(focusOrbitDuration, focusOrbitElapsed + dt)
    const progress = focusOrbitElapsed / focusOrbitDuration
    const angle = focusOrbitYaw + TAU * progress * progress * (3 - 2 * progress)
    const elevation = THREE.MathUtils.degToRad(12)
    camera.position.set(
      Math.sin(angle) * Math.cos(elevation), Math.sin(elevation), Math.cos(angle) * Math.cos(elevation),
    ).multiplyScalar(focusOrbitRadius).add(focusOrbitCenter)
    controls.target.copy(focusOrbitCenter)
    if (now - lastFocusOrbitSightline > 450 || progress === 1) {
      world.updateMatrixWorld(true)
      const result = focusSightlines(focusedIndex, camera.position, focusSamples(focusedIndex, focusOrbitCenter))
      focusOccluders.clear()
      result.obstructing.forEach(index => focusOccluders.add(index))
      lastFocusOrbitSightline = now
    }
    if (progress === 1) stopFocusOrbit()
  }

  function notifyRoam() {
    callbacks.onRoamState?.({ phase: roamPhase, progress: roamProgress, index: selected })
  }

  function updateRoamFocus(pose: ReturnType<typeof roamPath.sample>, now: number) {
    if (selected !== pose.index || focusedIndex !== pose.index) {
      selected = pose.index
      focusedIndex = pose.index
      updateHighlights()
      lastRoamSightline = 0
      notifyRoam()
    }
    // Recheck along the moving sightline, not just at period boundaries: a
    // higher coil must not hide the scenery on the route beneath it.
    if (now - lastRoamSightline > 450) {
      world.updateMatrixWorld(true)
      const result = focusSightlines(pose.index, pose.position, [pose.target])
      focusOccluders.clear()
      result.obstructing.forEach(index => focusOccluders.add(index))
      lastRoamSightline = now
    }
  }

  function prepareRoamPose() {
    const pose = roamPath.sample(roamProgress)
    updateRoamFocus(pose, performance.now())
    return pose
  }

  function startRoam() {
    if (disposed || contextLost || mode !== 'overview' || enteringFlight || roamPhase === 'playing') return
    stopFocusOrbit()
    if (roamPhase === 'idle' || roamPhase === 'finished') roamProgress = 0
    cancelFlight()
    autoRotate = false
    controls.autoRotate = false
    // Flush residual orbit damping before the route takes ownership.
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    controls.enabled = false
    controls.minDistance = 0.35
    roamPhase = 'playing'
    roamVelocity = 0
    applyViewOffset()
    const pose = prepareRoamPose()
    void flyTo(pose.position, pose.target, 1600, 55)
    notifyRoam()
    emitLabels()
  }

  function pauseRoam() {
    if (roamPhase !== 'playing') return
    cancelFlight()
    roamPhase = 'paused'
    roamVelocity = 0
    controls.enabled = true
    notifyRoam()
  }

  function endRoam(restoreOverview: boolean) {
    if (roamPhase === 'idle') return
    cancelFlight()
    roamPhase = 'idle'
    roamVelocity = 0
    focusedIndex = null
    focusOccluders.clear()
    controls.enabled = true
    controls.minDistance = 13
    applyViewOffset()
    notifyRoam()
    if (restoreOverview) void flyTo(initialPosition, initialTarget, 1100, OVERVIEW_FOV)
  }

  function seekRoam(progress: number) {
    if (disposed || mode !== 'overview' || roamPhase === 'idle' || !Number.isFinite(progress)) return
    cancelFlight()
    roamProgress = THREE.MathUtils.clamp(progress, 0, 1)
    roamPhase = roamProgress === 1 ? 'finished' : 'paused'
    roamVelocity = 0
    controls.enabled = true
    const pose = prepareRoamPose()
    void flyTo(pose.position, pose.target, 450, 55)
    notifyRoam()
  }

  function advanceRoam(dt: number, now: number) {
    if (roamPhase !== 'playing' || flight) return
    roamVelocity = THREE.MathUtils.damp(roamVelocity, 1, 2.5, dt)
    // Integrating visible frame time avoids jumps after tab suspension.
    roamProgress = Math.min(1, roamProgress + dt * roamVelocity / roamPath.durationSeconds)
    const pose = roamPath.sample(roamProgress)
    camera.position.copy(pose.position)
    controls.target.copy(pose.target)
    updateRoamFocus(pose, now)
    if (roamProgress === 1) {
      roamPhase = 'finished'
      controls.enabled = true
      roamVelocity = 0
      notifyRoam()
    } else if (now - lastRoamNotice > 100) {
      lastRoamNotice = now
      notifyRoam()
    }
  }

  function focusPeriod(index: number) {
    if (disposed || mode !== 'overview' || !periods[index]) return
    stopFocusOrbit()
    endRoam(false)
    selected = index
    focusedIndex = index
    autoRotate = false
    controls.autoRotate = false
    controls.minDistance = 8
    updateHighlights()
    applyViewOffset()
    const pose = focusPose(index)
    focusOrbitCenter.copy(pose.target)
    void flyTo(pose.position, pose.target, 1050, OVERVIEW_FOV)
    if (reducedMotion.matches) updateFocusVisuals(0, true)
  }

  function clearFocus() {
    if (disposed || mode !== 'overview') return
    stopFocusOrbit()
    endRoam(false)
    focusedIndex = null
    focusOccluders.clear()
    controls.minDistance = 13
    applyViewOffset()
    void flyTo(initialPosition, initialTarget, 1000, OVERVIEW_FOV)
    if (reducedMotion.matches) updateFocusVisuals(0, true)
  }

  function estimatedTextureBytes(texture: THREE.Texture): number {
    const image = texture.image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number } | undefined
    const imageWidth = image?.naturalWidth || image?.width || 1
    const imageHeight = image?.naturalHeight || image?.height || 1
    // Conservative RGBA + full mip chain estimate; compressed file size does
    // not represent the decoded texture's memory cost. Never downsample here.
    return Math.ceil(imageWidth * imageHeight * 4 * 4 / 3)
  }

  function trimTextures() {
    // Use the existing responsive viewport, without device-memory/UA probing.
    const compactViewport = width <= 900
    const budget = (compactViewport ? 96 : 192) * 1024 * 1024
    const maxEntries = compactViewport ? 1 : 2
    let totalBytes = 0
    for (const texture of textureCache.values()) totalBytes += estimatedTextureBytes(texture)
    for (const [url, texture] of textureCache) {
      if (totalBytes <= budget && textureCache.size <= maxEntries) break
      // Keep the displayed image at full quality even when it exceeds budget.
      // Pin the newest request through its camera flight so an obsolete load
      // cannot evict it. Two pinned images may coexist briefly during a switch.
      if (url === requestedPanoramaUrl || (mode === 'panorama' && texture === panoramaMaterial.map)) continue
      totalBytes -= estimatedTextureBytes(texture)
      if (texture === panoramaMaterial.map) {
        panoramaMaterial.map = null
        panoramaMaterial.needsUpdate = true
      }
      texture.dispose()
      textureCache.delete(url)
    }
  }

  async function getPanorama(url: string): Promise<THREE.Texture> {
    const cached = textureCache.get(url)
    if (cached) {
      textureCache.delete(url)
      textureCache.set(url, cached)
      trimTextures()
      return cached
    }
    const pending = pendingTextures.get(url)
    if (pending) return pending
    const task = loadTextureWithTimeout(url, 20000).then(texture => {
      if (disposed) {
        texture.dispose()
        throw new Error('场景已关闭')
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      textureCache.set(url, texture)
      trimTextures()
      return texture
    }).finally(() => pendingTextures.delete(url))
    pendingTextures.set(url, task)
    return task
  }

  function resize() {
    // ResizeObserver runs after RAF; clearing the canvas there exposes a blank
    // frame. Only invalidate here, then resize and redraw together in animate.
    if (!disposed) resizePending = true
  }

  function applyPendingResize(): boolean {
    if (!resizePending) return false
    const nextWidth = host.clientWidth
    const nextHeight = host.clientHeight
    if (nextWidth < 1 || nextHeight < 1) return false
    resizePending = false
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.7)
    if (width === nextWidth && height === nextHeight && renderer.getPixelRatio() === pixelRatio) return false
    const previousAspect = camera.aspect
    width = nextWidth
    height = nextHeight
    renderer.setDrawingBufferSize(width, height, pixelRatio)
    camera.aspect = width / height
    const nextFramingScale = Math.max(1, 1.37 / camera.aspect)
    const overviewRatio = nextFramingScale / framingScale
    const widthAllowance = focusWidthAllowance(focusedIndex)
    const focusRatio = Math.max(1, widthAllowance / camera.aspect) / Math.max(1, widthAllowance / previousAspect)
    const activeRatio = focusedIndex === null ? overviewRatio : focusRatio
    initialPosition.sub(initialTarget).multiplyScalar(overviewRatio).add(initialTarget)
    savedPosition.sub(savedTarget).multiplyScalar(activeRatio).add(savedTarget)
    if (mode === 'overview' && roamPhase === 'idle') {
      camera.position.sub(controls.target).multiplyScalar(activeRatio).add(controls.target)
      if (focusOrbit) focusOrbitRadius *= activeRatio
      // Preserve the chosen azimuth and flight progress. Re-running focusPose
      // while resizing can switch between its discrete sightline candidates.
      if (flight) {
        flight.from.sub(flight.fromTarget).multiplyScalar(activeRatio).add(flight.fromTarget)
        flight.to.sub(flight.toTarget).multiplyScalar(activeRatio).add(flight.toTarget)
      }
    }
    framingScale = nextFramingScale
    controls.maxDistance = Math.max(66, 66 * framingScale)
    applyViewOffset()
    trimTextures()
    return true
  }

  function applyViewOffset() {
    if (mode === 'overview' && roamPhase === 'idle') {
      const desktopOffset = -0.06 * THREE.MathUtils.smoothstep(width, 840, 960)
      const portraitOffset = focusedIndex === null ? 0.07 * (1 - THREE.MathUtils.smoothstep(camera.aspect, 0.85, 1.05)) : 0
      camera.setViewOffset(width, height, width * (desktopOffset + portraitOffset), 0, width, height)
    } else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }

  function emitLabels() {
    if (mode !== 'overview') return
    if (roamPhase !== 'idle') {
      labelStems.forEach(stem => { stem.visible = false })
      callbacks.onLabels([])
      callbacks.onMilestones?.([])
      return
    }
    camera.updateMatrixWorld()
    const depths: number[] = []
    const labels = labelPoints.map((point, index) => {
      projected.copy(point).project(camera)
      depths.push(projected.z)
      return {
        index,
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.04 && Math.abs(projected.y) < 1.04,
      }
    })
    const priority = [...labels].sort((a, b) => (a.index === selected ? -1 : b.index === selected ? 1 : a.index - b.index))
    const placed: { x: number; y: number; halfWidth: number }[] = []
    const offsets = [[0, 0], [0, -32], [0, 32], [-58, -16], [58, -16], [0, -64], [0, 64], [-72, -46], [72, -46]]
    for (const label of priority) {
      // The overview uses names printed along the outer chronology. Keep the
      // floating name only for the separate origin; restore labels in close-up.
      if (focusedIndex === null && label.index > 0) label.visible = false
      if (!label.visible) {
        const stem = labelStems[label.index]
        if (stem) stem.visible = false
        continue
      }
      const halfWidth = width > 760 && focusedIndex !== null && label.index === selected ? 56 : width > 760 ? 38 : 32
      const anchorX = label.x
      const anchorY = label.y
      let resolved = false
      const previousOffset = labelOffsets.get(label.index)
      for (const [dx = 0, dy = 0] of previousOffset ? [previousOffset, ...offsets] : offsets) {
        const x = THREE.MathUtils.clamp(anchorX + dx, halfWidth + 6, width - halfWidth - 6)
        const y = THREE.MathUtils.clamp(anchorY + dy, 34, height - 22)
        if (placed.some(other => Math.abs(x - other.x) < halfWidth + other.halfWidth + 7 && Math.abs(y - other.y) < 31)) continue
        label.x = x
        label.y = y
        labelOffsets.set(label.index, [dx, dy])
        placed.push({ x, y, halfWidth })
        resolved = true
        break
      }
      label.visible = resolved
      const stem = labelStems[label.index]
      if (stem) {
        stem.visible = resolved
        if (resolved) {
          projected.set(label.x / width * 2 - 1, -(label.y / height * 2 - 1), depths[label.index] ?? 0).unproject(camera)
          const vertices = stem.geometry.getAttribute('position')
          vertices.setXYZ(1, projected.x, projected.y, projected.z)
          vertices.needsUpdate = true
          stem.geometry.computeBoundingSphere()
        }
      }
    }
    callbacks.onLabels(labels)
    const bubblePlacements: { x: number; y: number }[] = []
    callbacks.onMilestones?.(chronologyMarkers.milestones.map(milestone => {
      projected.copy(milestone.position).project(camera)
      const anchorX = (projected.x * 0.5 + 0.5) * width
      const anchorY = (-projected.y * 0.5 + 0.5) * height
      const inView = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.94 && Math.abs(projected.y) < 0.9
      let x = anchorX, y = anchorY, visible = false
      if (inView) {
        const candidates = [[0, -18], [0, -70], [35, 70], [-35, 70], [35, -70], [-35, -70], [55, -16], [-55, -16], [0, 64], [68, 52], [-68, 52], [100, 0], [-100, 0], [0, -105], [0, 110], [-95, -90], [95, -90], [140, 30], [-140, 30]]
        const previousOffset = ageOffsets.get(milestone.index)
        for (const [dx = 0, dy = 0] of previousOffset ? [previousOffset, ...candidates] : candidates) {
          const px = THREE.MathUtils.clamp(anchorX + dx, 37, width - 37)
          const py = THREE.MathUtils.clamp(anchorY + dy, 134, height - 37)
          if (width > 760 && px < 295 && py > 235) continue
          if (width < 761 && py > height - 125) continue
          if (placed.some(label => Math.abs(px - label.x) < label.halfWidth + 33 && Math.abs(py - 25 - label.y) < 47)) continue
          if (bubblePlacements.some(point => Math.abs(px - point.x) < 70 && Math.abs(py - point.y) < 72)) continue
          x = px; y = py; visible = true; ageOffsets.set(milestone.index, [dx, dy]); bubblePlacements.push({ x, y }); break
        }
      }
      return { index: milestone.index, age: milestone.age, unit: milestone.unit, x, y, anchorX, anchorY, visible }
    }))
  }

  function pauseAutomatic() {
    stopFocusOrbit()
    pauseRoam()
    manualUntil = performance.now() + 6500
    cancelFlight()
  }

  function onPointerDown(event: PointerEvent) {
    // OrbitControls also accepts middle/right-button drags in overview.
    if (mode === 'overview') stopFocusOrbit()
    if (event.button !== 0 && event.pointerType === 'mouse') return
    pauseAutomatic()
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    pointerStart = { x: event.clientX, y: event.clientY, at: performance.now() }
    previousPointer = { x: event.clientX, y: event.clientY }
    if (mode === 'panorama') renderer.domElement.setPointerCapture(event.pointerId)
    if (pointers.size === 2) {
      const pair = Array.from(pointers.values())
      if (pair[0] && pair[1]) pinchDistance = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y)
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (mode === 'overview') {
      if (pointerStart) return
      const bounds = renderer.domElement.getBoundingClientRect()
      pointerNdc.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
      raycaster.setFromCamera(pointerNdc, camera)
      renderer.domElement.style.cursor = raycaster.intersectObjects(pickMeshes, false).length ? 'pointer' : 'grab'
      return
    }
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    manualUntil = performance.now() + 6500
    if (pointers.size === 2) {
      const pair = Array.from(pointers.values())
      if (pair[0] && pair[1]) {
        const distance = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y)
        if (pinchDistance > 0) targetFov = THREE.MathUtils.clamp(targetFov - (distance - pinchDistance) * 0.09, 40, camera.aspect < 0.7 ? 120 : 100)
        pinchDistance = distance
      }
    } else if (previousPointer) {
      const sensitivity = targetFov / Math.max(400, height) * Math.PI / 180
      targetYaw -= (event.clientX - previousPointer.x) * sensitivity
      targetPitch += (event.clientY - previousPointer.y) * sensitivity
      targetPitch = THREE.MathUtils.clamp(targetPitch, -Math.PI * 0.38, Math.PI * 0.38)
    }
    previousPointer = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: PointerEvent) {
    const start = pointerStart
    pointers.delete(event.pointerId)
    pinchDistance = 0
    previousPointer = null
    pointerStart = null
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
    if (mode === 'panorama') {
      tourAnchorYaw = targetYaw
      tourPhase = 0
    }
    if (mode !== 'overview' || !start || performance.now() - start.at > 700 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return
    const bounds = renderer.domElement.getBoundingClientRect()
    pointerNdc.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
    raycaster.setFromCamera(pointerNdc, camera)
    const hit = raycaster.intersectObjects(pickMeshes, false)[0]
    const index: unknown = hit?.object.userData.periodIndex
    if (typeof index === 'number') callbacks.onSelect(index)
  }

  function onPointerCancel(event: PointerEvent) {
    pointers.delete(event.pointerId)
    pointerStart = null
    previousPointer = null
    pinchDistance = 0
  }

  function onWheel(event: WheelEvent) {
    pauseAutomatic()
    if (mode !== 'panorama') return
    event.preventDefault()
    targetFov = THREE.MathUtils.clamp(targetFov + Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY) * 0.035, 4), 40, camera.aspect < 0.7 ? 120 : 100)
  }

  function onContextLost(event: Event) {
    event.preventDefault()
    stopFocusOrbit()
    contextLost = true
    flightSuspendedAt ??= performance.now()
    pauseRoam()
    callbacks.onLoadState?.({ loading: false, error: '三维画面暂时中断，正在等待显卡恢复。', source: 'context' })
  }

  function onContextRestored() {
    contextLost = false
    lastFrame = performance.now()
    callbacks.onLoadState?.({ loading: false, error: '', source: 'context' })
    resize()
  }

  function onVisibilityChange() {
    // Browsers may stop RAF entirely in background tabs, so record the actual
    // visibility event as well as checking it in the animation loop.
    if (document.hidden) flightSuspendedAt ??= performance.now()
    else lastFrame = performance.now()
  }

  function animate(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(animate)
    const dt = Math.min((now - lastFrame) / 1000, 0.05)
    lastFrame = now
    if (contextLost || document.hidden) {
      flightSuspendedAt ??= now
      return
    }
    if (flightSuspendedAt !== null) {
      if (flight) flight.started += now - Math.max(flight.started, flightSuspendedAt)
      flightSuspendedAt = null
    }
    const resized = applyPendingResize()
    if (mode === 'overview') {
      advanceRoam(dt, now)
      const cameraOrbiting = focusOrbit
      advanceFocusOrbit(dt, now)
      const cameraInFlight = Boolean(flight)
      if (flight) {
        const progress = Math.min((now - flight.started) / flight.duration, 1)
        const ease = progress * progress * (3 - 2 * progress)
        camera.position.lerpVectors(flight.from, flight.to, ease)
        controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease)
        if (flight.fromFov !== undefined && flight.toFov !== undefined) {
          camera.fov = THREE.MathUtils.lerp(flight.fromFov, flight.toFov, ease)
          camera.updateProjectionMatrix()
        }
        if (progress === 1) {
          const complete = flight.complete
          flight = null
          complete?.()
        }
      }
      controls.autoRotate = autoRotate && roamPhase === 'idle' && focusedIndex === null && !reducedMotion.matches && now > manualUntil && !flight
      // Orbit limits and residual damping must not alter a scripted flight.
      if (cameraInFlight || cameraOrbiting || roamPhase === 'playing') camera.lookAt(controls.target)
      else controls.update(dt)
      camera.updateMatrixWorld()
      outerChronology.updateLabels(camera)
      chronologyMarkers.updateLabels(camera)
      if (!reducedMotion.matches) {
        waterTexture.offset.x = now * 0.0000035
        hadeanOrigin.animate(now * 0.001)
        for (const puff of smokePuffs) {
          const drift = now * 0.0003 + puff.phase
          puff.sprite.position.copy(puff.base)
          puff.sprite.position.x += Math.sin(drift) * 0.05
          puff.sprite.position.y += Math.sin(drift * 0.7) * 0.035
          puff.sprite.material.userData.focusBaseOpacity = 0.36 + Math.sin(drift) * 0.035
        }
      }
      updateFocusVisuals(dt)
      if (resized || now - lastLabelFrame > 45) {
        emitLabels()
        lastLabelFrame = now
      }
    } else {
      const moving = tour && !reducedMotion.matches && now > manualUntil && pointers.size === 0
      tourVelocity = THREE.MathUtils.damp(tourVelocity, moving ? 0.018 : 0, 1.4, dt)
      if (moving) {
        tourPhase += tourVelocity / 0.018 * dt * 0.045
        targetYaw = tourAnchorYaw + Math.sin(tourPhase) * tourSweep * tourDirection
      }
      yaw = THREE.MathUtils.damp(yaw, targetYaw, 10, dt)
      pitch = THREE.MathUtils.damp(pitch, targetPitch, 10, dt)
      const drift = moving ? Math.sin(now * 0.00016) * 0.009 : 0
      lookDirection.set(Math.sin(yaw) * Math.cos(pitch + drift), Math.sin(pitch + drift), Math.cos(yaw) * Math.cos(pitch + drift))
      camera.lookAt(lookDirection)
      // The UI defaults this off for reduced motion. An explicit user enable
      // must still work and match the visible switch state.
      const animateOrganisms = lifeMotion
      if (animateOrganisms) lifeElapsed += dt
      panoramaMotion.enabled.value = animateOrganisms && activeWaterMotion ? 1 : 0
      panoramaMotion.time.value = lifeElapsed
      panoramaEcosystem.update(dt, animateOrganisms)
      panoramaVolcanism.update(dt, animateOrganisms)
      const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 8, dt)
      if (Math.abs(nextFov - camera.fov) > 0.001) {
        camera.fov = nextFov
        camera.updateProjectionMatrix()
      }
    }
    renderer.render(scene, camera)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  renderer.domElement.addEventListener('pointerdown', onPointerDown, true)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerCancel)
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false, capture: true })
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)
  document.addEventListener('visibilitychange', onVisibilityChange)
  resize()
  updateHighlights()
  raf = requestAnimationFrame(animate)

  return {
    setSelected(index) {
      if (disposed || !periods[index]) return
      if (index !== selected) stopFocusOrbit()
      selected = index
      updateHighlights()
    },
    focusPeriod,
    clearFocus,
    setFocusOrbit,
    retryIllustrations,
    startRoam,
    pauseRoam,
    stopRoam: () => endRoam(true),
    seekRoam,
    setFocusOpacity(opacity) {
      contextOpacity = THREE.MathUtils.clamp(opacity, 0.35, 0.7)
      if (reducedMotion.matches) updateFocusVisuals(0, true)
    },
    async enterPanorama(index) {
      const period = periods[index]
      if (!period || disposed) return
      if (contextLost) throw new Error('三维画面正在恢复，请稍后再试。')
      stopFocusOrbit()
      const wasRoaming = roamPhase !== 'idle'
      endRoam(false)
      if (wasRoaming) {
        // The entry veil already covers this reset. Save a stable overview
        // before loading so cancelling or failing a load never leaves the
        // camera at a near-water pose with overview orbit limits.
        camera.position.copy(initialPosition)
        controls.target.copy(initialTarget)
        savedPosition.copy(initialPosition)
        savedTarget.copy(initialTarget)
        camera.fov = OVERVIEW_FOV
        applyViewOffset()
        camera.lookAt(controls.target)
      }
      const request = ++panoramaRequest
      requestedPanoramaUrl = period.panorama
      callbacks.onLoadState?.({ loading: true, error: '' })
      try {
        const texture = await getPanorama(period.panorama)
        if (disposed || request !== panoramaRequest) return
        selected = index
        updateHighlights()
        if (mode === 'overview') {
          if (!enteringFlight) {
            savedPosition.copy(wasRoaming ? initialPosition : camera.position)
            savedTarget.copy(wasRoaming ? initialTarget : controls.target)
          }
          enteringFlight = true
          const center = periodCenters[index] ?? initialTarget
          const direction = camera.position.clone().sub(center).normalize()
          const closePosition = center.clone().addScaledVector(direction, 13.5)
          await flyTo(closePosition, center, 900)
        }
        if (disposed || request !== panoramaRequest) return
        enteringFlight = false
        panoramaMaterial.map = texture
        configureEnvironmentMotion(period.id)
        panoramaMaterial.needsUpdate = true
        panorama.visible = true
        world.visible = false
        scene.background = new THREE.Color('#081017')
        scene.fog = null
        mode = 'panorama'
        renderer.domElement.setAttribute('aria-label', `${period.name}全景，拖动环视，滚轮缩放`)
        renderer.shadowMap.enabled = false
        controls.enabled = false
        controls.autoRotate = false
        camera.position.set(0, 0, 0)
        const view = PANORAMA_VIEWS[period.id] ?? { u: 0.5, v: 0.48, fov: 70 }
        initialYaw = (0.5 - view.u) * TAU
        initialPitch = (0.5 - view.v) * Math.PI
        initialFov = view.fov
        camera.fov = initialFov
        camera.near = 0.1
        applyViewOffset()
        yaw = targetYaw = initialYaw
        pitch = targetPitch = initialPitch
        targetFov = initialFov
        tourVelocity = 0
        tourPhase = 0
        tourAnchorYaw = initialYaw
        tourDirection = view.direction ?? -1
        tourSweep = view.sweep ?? 0.35
        lifeElapsed = 0
        void panoramaEcosystem.setPeriod(index).catch(() => {
          if (!disposed && request === panoramaRequest && mode === 'panorama') {
            callbacks.onLoadState?.({ loading: false, error: '部分生态素材暂未加载成功，可重试此年代。' })
          }
        })
        panoramaVolcanism.setPeriod(period.id)
        panoramaLife.visible = true
        manualUntil = performance.now() + 1800
        renderer.domElement.style.cursor = 'grab'
        callbacks.onLabels([])
        callbacks.onMilestones?.([])
        requestedPanoramaUrl = ''
        trimTextures()
        callbacks.onLoadState?.({ loading: false, error: '' })
      } catch {
        if (disposed || request !== panoramaRequest) return
        requestedPanoramaUrl = ''
        trimTextures()
        const message = `${period.name}全景暂未加载成功，请检查图片资源后重试。`
        callbacks.onLoadState?.({ loading: false, error: message })
        throw new Error(message)
      }
    },
    exitPanorama() {
      panoramaRequest++
      requestedPanoramaUrl = ''
      cancelFlight()
      callbacks.onLoadState?.({ loading: false, error: '' })
      if (disposed) return
      if (mode === 'overview') {
        if (enteringFlight) void flyTo(savedPosition, savedTarget, 650)
        enteringFlight = false
        trimTextures()
        return
      }
      mode = 'overview'
      renderer.domElement.setAttribute('aria-label', '可旋转和缩放的地质年代三维螺旋；点击各年代聚焦观察')
      renderer.shadowMap.enabled = true
      panorama.visible = false
      trimTextures()
      panoramaLife.visible = false
      panoramaVolcanism.group.visible = false
      world.visible = true
      scene.background = overviewBackground
      scene.fog = overviewFog
      controls.enabled = true
      camera.fov = OVERVIEW_FOV
      applyViewOffset()
      const center = periodCenters[selected] ?? initialTarget
      camera.position.copy(center).add(savedPosition.clone().sub(savedTarget).normalize().multiplyScalar(20))
      controls.target.copy(center.clone().lerp(initialTarget, 0.7))
      controls.update()
      void flyTo(savedPosition, savedTarget, 900)
      manualUntil = performance.now() + 1800
      emitLabels()
    },
    setAutoRotate(enabled) {
      if (enabled) stopFocusOrbit()
      if (enabled) endRoam(true)
      autoRotate = enabled
    },
    setTour(enabled) {
      tour = enabled
    },
    setLifeMotion(enabled) {
      lifeMotion = enabled
    },
    lookAtVolcano() {
      if (mode !== 'panorama' || (selected !== 0 && selected !== 1)) return
      // Actual vent bearings, available after freely looking around the coast.
      const u = selected === 0 ? 0.175 : 0.211
      const destination = (0.5 - u) * TAU
      targetYaw = destination + Math.round((yaw - destination) / TAU) * TAU
      targetPitch = (0.5 - 0.37) * Math.PI
      targetFov = 76
      tourAnchorYaw = targetYaw
      tourPhase = 0
      manualUntil = performance.now() + 10000
    },
    lookAtOrganism() {
      if (mode !== 'panorama') return
      const focus = panoramaEcosystem.getFocus(camera.aspect)
      if (!focus) return
      const destination = (0.5 - focus.u) * TAU
      targetYaw = destination + Math.round((yaw - destination) / TAU) * TAU
      targetPitch = (0.5 - focus.v) * Math.PI
      targetFov = focus.fov
      tourAnchorYaw = targetYaw
      tourPhase = 0
      manualUntil = performance.now() + 10000
    },
    resetView() {
      stopFocusOrbit()
      if (mode === 'panorama') {
        targetYaw = initialYaw + Math.round((yaw - initialYaw) / TAU) * TAU
        targetPitch = initialPitch
        targetFov = initialFov
        tourAnchorYaw = targetYaw
        tourPhase = 0
      } else {
        clearFocus()
      }
    },
    resize,
    dispose() {
      if (disposed) return
      stopFocusOrbit()
      disposed = true
      panoramaRequest++
      requestedPanoramaUrl = ''
      cancelFlight()
      cancelAnimationFrame(raf)
      for (const cancel of cancelTextureLoads) cancel()
      cancelTextureLoads.clear()
      resizeObserver.disconnect()
      illustrationJobs.length = 0
      controls.dispose()
      // Each effect module owns its resources. Remove it before traversing
      // the remaining scene to avoid disposing the same geometry twice.
      scene.remove(panoramaLife, panoramaVolcanism.group)
      panoramaEcosystem.dispose()
      panoramaVolcanism.dispose()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown, true)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel)
      renderer.domElement.removeEventListener('wheel', onWheel, true)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      const textures = new Set<THREE.Texture>([waterTexture, smokeTexture, ...textureCache.values(), ...auxiliaryTextures])
      scene.traverse(object => {
        if (object instanceof THREE.InstancedMesh) object.dispose()
        const renderable = object as THREE.Mesh
        if (renderable.geometry) geometries.add(renderable.geometry)
        if (renderable.material) {
          const objectMaterials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
          objectMaterials.forEach(material => materials.add(material))
        }
      })
      // Shared geometries need explicit disposal even when no matching period exists.
      for (const material of [landMaterial, cliffMaterial]) materials.add(material)
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      textures.forEach(texture => texture.dispose())
      textureCache.clear()
      auxiliaryTextures.clear()
      pendingTextures.clear()
      sunlight.shadow.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
