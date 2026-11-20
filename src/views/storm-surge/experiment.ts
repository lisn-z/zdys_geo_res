/** A deterministic, uncalibrated classroom model of a bounded coastal strip.
 * All heights share an illustrative datum. The tide is held constant during
 * each experiment to isolate the wind and defence variables. Wind setup is
 * separated from astronomical tide; waves, pressure, breaches and lateral
 * bypass are deliberately outside this model. It is not a flood forecast.
 */
export type Level = 1 | 2 | 3
export type WindDirection = 'onshore' | 'alongshore' | 'offshore'
export interface ExperimentParams {
  wind: Level
  tide: Level
  barrier: Level
  direction: WindDirection
}

export const DEFAULT_PARAMS: ExperimentParams = { wind: 2, tide: 2, barrier: 1, direction: 'onshore' }
export const PEAK_PROGRESS = 0.56
export const WALL_X = 5
export const COAST_BOUNDS = { minX: -75, maxX: 125, minZ: -90, maxZ: 90 } as const
export const TIDE_HEIGHTS = [0.15, 0.8, 1.45] as const
export const BARRIER_HEIGHTS = [1.9, 3.2, 4.6] as const
const WIND_SETUP = [0.7, 1.7, 3] as const
const DIRECTION_FACTOR: Record<WindDirection, number> = { onshore: 1, alongshore: 0.08, offshore: -0.35 }
const STEPS = 240
const MIN_LAND = 0.88
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function barrierHeight(params: ExperimentParams) { return BARRIER_HEIGHTS[params.barrier - 1]! }
export function terrainHeight(x: number, z: number) {
  const alongShore = 0.000028 * z * z
  if (x <= 0) return 0.55 + 0.13 * x + alongShore
  if (x <= WALL_X) return 0.55 + 0.066 * x + alongShore
  // Low, gently rising coastal land, with a shallow central corridor. The
  // irregularity is small enough that elevations still rise towards inland.
  return MIN_LAND + 0.019 * (x - WALL_X) + alongShore
    + 0.022 * Math.sin((x - WALL_X) * 0.16) * Math.sin(z * 0.18)
}

export interface House {
  id: string; x: number; z: number; width: number; depth: number
  storeys: number; style: 'coastal' | 'block' | 'apartment'
}
export const HOUSES: readonly House[] = [20, 42, 64, 86, 108].flatMap((x, column) =>
  [-84, -60, -36, -12, 12, 36, 60, 84].map((z, row) => ({
    id: `block-${column + 1}-${row + 1}`, x, z, width: 8, depth: 10,
    storeys: column + 1, style: column === 0 ? 'coastal' as const : column < 3 ? 'block' as const : 'apartment' as const,
  })),
)
export const CITY_ROADS = { x: [9, 31, 53, 75, 97, 119], z: [-72, -48, -24, 0, 24, 48, 72], width: 4 } as const
const foundations = new WeakMap<House, number>()

/** Foundation top clears the entire footprint, rather than just its centre. */
export function houseBaseHeight(house: House) {
  const saved = foundations.get(house)
  if (saved !== undefined) return saved
  let highest = -Infinity
  for (let ix = 0; ix <= 6; ix++) {
    for (let iz = 0; iz <= 6; iz++) {
      const dx = -house.width / 2 + house.width * ix / 6, dz = -house.depth / 2 + house.depth * iz / 6
      highest = Math.max(highest, terrainHeight(house.x + dx, house.z + dz))
    }
  }
  const height = highest + 0.12
  foundations.set(house, height)
  return height
}

export interface ExperimentFrame {
  progress: number
  storm: number
  astronomicalTide: number
  surge: number
  seaLevel: number
  inlandLevel: number
  peakSeaLevel: number
  barrierCrest: number
  overtopping: boolean
  overflowDepth: number
  hasOvertopped: boolean
  floodFront: number
  stage: string
}

type Trajectory = { levels: number[]; fronts: number[]; entered: boolean[] }
const trajectories = new Map<string, Trajectory>()
const results = new Map<string, ExperimentResult>()
const eventCache = new Map<string, ExperimentEvent[]>()
const keyOf = (params: ExperimentParams) => `${params.wind}:${params.tide}:${params.barrier}:${params.direction}`
export function sameParams(a: ExperimentParams, b: ExperimentParams) {
  return a.wind === b.wind && a.tide === b.tide && a.barrier === b.barrier && a.direction === b.direction
}
export function validParams(value: unknown): value is ExperimentParams {
  if (!value || typeof value !== 'object') return false
  const p = value as ExperimentParams
  return [1, 2, 3].includes(p.wind) && [1, 2, 3].includes(p.tide)
    && [1, 2, 3].includes(p.barrier) && ['onshore', 'alongshore', 'offshore'].includes(p.direction)
}
export function describeParams(params: ExperimentParams) {
  return `${['弱风', '中风', '强风'][params.wind - 1]} · ${{ onshore: '向岸风', alongshore: '沿岸风', offshore: '离岸风' }[params.direction]} · ${['低潮位', '中潮位', '高潮位'][params.tide - 1]} · ${['低堤', '中堤', '高堤'][params.barrier - 1]}`
}

function stormAt(progress: number) {
  return progress <= PEAK_PROGRESS ? smooth((progress - 0.08) / (PEAK_PROGRESS - 0.08))
    : 1 - smooth((progress - PEAK_PROGRESS) / (1 - PEAK_PROGRESS))
}
function seaAt(params: ExperimentParams, progress: number) {
  const astronomicalTide = TIDE_HEIGHTS[params.tide - 1]!
  const surge = WIND_SETUP[params.wind - 1]! * DIRECTION_FACTOR[params.direction] * stormAt(progress)
  return { astronomicalTide, surge, seaLevel: astronomicalTide + surge }
}

/** Storage and wet-front motion are integrated once per parameter set. Using
 * the cached trajectory makes seeking, pausing and replaying path-independent.
 * No water is placed behind an intact wall until its crest is exceeded.
 */
function trajectoryFor(params: ExperimentParams): Trajectory {
  const key = keyOf(params), existing = trajectories.get(key)
  if (existing) return existing
  const trajectory: Trajectory = { levels: [MIN_LAND], fronts: [WALL_X], entered: [false] }
  let level = MIN_LAND, front = WALL_X, entered = false
  const crest = barrierHeight(params), dt = 1 / STEPS
  for (let step = 1; step <= STEPS; step++) {
    const sea = seaAt(params, (step - 0.5) / STEPS).seaLevel
    const overflow = Math.max(0, sea - crest)
    if (overflow > 0) {
      entered = true
      // Greater overflow supplies more water, but the inland water surface
      // cannot exceed the water supplying it. A higher wall reduces inflow.
      const supply = 10 * Math.pow(overflow, 1.4) * Math.max(0, sea - level)
      level = Math.min(sea, level + supply * dt)
      front += (230 * Math.sqrt(overflow) + 36 * Math.max(0, level - MIN_LAND)) * dt
    } else if (entered) {
      // Water continues spreading after the storm peak. Slow drainage is a
      // qualitative residual-storage term, not a simulated drainage network.
      front += 56 * Math.max(0, level - MIN_LAND) * dt
      level = Math.max(MIN_LAND, level - 0.06 * (level - MIN_LAND) * dt)
    }
    front = Math.min(COAST_BOUNDS.maxX + 4, front)
    trajectory.levels.push(level)
    trajectory.fronts.push(front)
    trajectory.entered.push(entered)
  }
  trajectories.set(key, trajectory)
  return trajectory
}

export function getFrame(params: ExperimentParams, progress: number): ExperimentFrame {
  const p = clamp(progress), trajectory = trajectoryFor(params)
  const sample = p * STEPS, i = Math.min(STEPS - 1, Math.floor(sample)), f = sample - i
  const sea = seaAt(params, p), crest = barrierHeight(params)
  const inlandLevel = mix(trajectory.levels[i]!, trajectory.levels[i + 1]!, f)
  const overflowDepth = Math.max(0, sea.seaLevel - crest)
  const hasOvertopped = trajectory.entered[i]! || overflowDepth > 0
  return {
    progress: p, storm: stormAt(p), ...sea, inlandLevel,
    peakSeaLevel: TIDE_HEIGHTS[params.tide - 1]! + Math.max(0, WIND_SETUP[params.wind - 1]! * DIRECTION_FACTOR[params.direction]),
    barrierCrest: crest, overtopping: overflowDepth > 0.001, overflowDepth,
    hasOvertopped, floodFront: mix(trajectory.fronts[i]!, trajectory.fronts[i + 1]!, f),
    stage: p === 0 ? '风暴前' : p < 0.48 ? '风暴增强' : p < 0.64 ? '风暴最强阶段'
      : p < 1 ? '风暴减弱' : hasOvertopped ? '风弱后仍有积水' : '风暴过程结束',
  }
}

/** Inland depth shared by rendering and statistics. The wetting edge tapers
 * continuously over four teaching metres, so water cannot appear isolated
 * inland or flicker when moving between timeline samples.
 */
export function getFloodDepth(x: number, z: number, frame: ExperimentFrame) {
  if (!frame.hasOvertopped || x <= WALL_X || x > COAST_BOUNDS.maxX
    || z < COAST_BOUNDS.minZ || z > COAST_BOUNDS.maxZ) return 0
  const wetting = smooth((frame.floodFront - x) / 4)
  const surface = frame.inlandLevel - 0.004 * (x - WALL_X)
  return Math.max(0, surface - terrainHeight(x, z)) * wetting
}

export function houseFloodDepth(house: House, frame: ExperimentFrame) {
  let highestWater = -Infinity
  // All sides of the building are inspected. The floor/reference plane is
  // the same foundation top exported for placement in the three-dimensional scene.
  for (const dx of [-house.width / 2, 0, house.width / 2]) {
    for (const dz of [-house.depth / 2, 0, house.depth / 2]) {
      const x = house.x + dx, z = house.z + dz, depth = getFloodDepth(x, z, frame)
      if (depth > 0.002) highestWater = Math.max(highestWater, terrainHeight(x, z) + depth)
    }
  }
  return Math.max(0, highestWater - houseBaseHeight(house))
}

export interface ExperimentResult {
  peakSeaLevel: number
  /** Signed extremum at maximum wind; negative denotes wind-driven setdown. */
  peakSurge: number
  maxDepth: number
  floodedHouses: number
  floodedArea: number
  overtopped: boolean
  explanation: string
}

export interface ExperimentEvent {
  id: 'overtopping' | 'first-house' | 'max-area'
  label: string
  progress: number
}

/** Keep the true side of the threshold as the jump target. Both boundaries
 * come from adjacent process samples, so the returned frame already exhibits
 * the event rather than stopping one frame before it. */
function firstEventProgress(params: ExperimentParams, sample: number, occurs: (frame: ExperimentFrame) => boolean) {
  let low = Math.max(0, (sample - 1) / STEPS), high = sample / STEPS
  if (occurs(getFrame(params, low))) return low
  for (let i = 0; i < 28; i++) {
    const middle = (low + high) / 2
    if (occurs(getFrame(params, middle))) high = middle
    else low = middle
  }
  return high
}

/** Events and the result table use one cached analysis of the same model.
 * Calling this while the playhead moves never rescans the flood grid. */
export function getExperimentEvents(params: ExperimentParams): ExperimentEvent[] {
  const key = keyOf(params)
  if (!eventCache.has(key)) evaluateExperiment(params)
  return eventCache.get(key)!
}

/** Maximum inundation during the entire process, not the final-frame value.
 * Flood area is sampled on a shared two-metre grid; it excludes the sea-side
 * beach. Houses are counted when water exceeds their foundation plane by 8 cm.
 */
export function evaluateExperiment(params: ExperimentParams): ExperimentResult {
  const key = keyOf(params), existing = results.get(key)
  if (existing) return existing
  let maxDepth = 0, floodedArea = 0, overtopped = false
  let firstOvertopping: number | undefined, firstHouse: number | undefined, maxAreaProgress = 0
  const peakSeaLevel = getFrame(params, PEAK_PROGRESS).peakSeaLevel
  const affected = new Set<string>()
  for (let i = 0; i <= STEPS; i++) {
    const frame = getFrame(params, i / STEPS)
    overtopped ||= frame.overtopping
    if (firstOvertopping === undefined && frame.overtopping) {
      firstOvertopping = firstEventProgress(params, i, value => value.overtopping)
    }
    if (!frame.hasOvertopped) continue
    let area = 0
    for (let x = WALL_X + 1; x < COAST_BOUNDS.maxX; x += 2) {
      for (let z = COAST_BOUNDS.minZ + 1; z < COAST_BOUNDS.maxZ; z += 2) {
        const depth = getFloodDepth(x, z, frame)
        maxDepth = Math.max(maxDepth, depth)
        if (depth > 0.02) area += 4
      }
    }
    if (area > floodedArea) { floodedArea = area; maxAreaProgress = i / STEPS }
    let houseAffected = false
    for (const house of HOUSES) if (houseFloodDepth(house, frame) > 0.08) {
      affected.add(house.id); houseAffected = true
    }
    if (firstHouse === undefined && houseAffected) {
      firstHouse = firstEventProgress(params, i, value => HOUSES.some(house => houseFloodDepth(house, value) > 0.08))
    }
  }
  const result: ExperimentResult = {
    peakSeaLevel, peakSurge: WIND_SETUP[params.wind - 1]! * DIRECTION_FACTOR[params.direction],
    maxDepth, floodedArea, floodedHouses: affected.size, overtopped,
    explanation: params.direction === 'offshore'
      ? '本模型中，离岸风使沿岸水位下降。实际水位还受气压、地形与其他过程影响。'
      : overtopped
        ? '海侧水位超过堤顶后，海水进入堤内低地并逐渐扩展。风暴减弱后，低地积水不会立即消失。'
        : '本组条件下海侧水位未超过堤顶，模型堤内未进水。这里未模拟波浪越堤、海堤破坏与侧向绕流。',
  }
  const events: ExperimentEvent[] = []
  if (firstOvertopping !== undefined) events.push({ id: 'overtopping', label: '开始越堤', progress: firstOvertopping })
  if (firstHouse !== undefined) events.push({ id: 'first-house', label: '首栋房屋受淹', progress: firstHouse })
  if (floodedArea > 0) events.push({ id: 'max-area', label: '淹没范围最大', progress: maxAreaProgress })
  events.sort((a, b) => a.progress - b.progress)
  eventCache.set(key, events)
  results.set(key, result)
  return result
}
