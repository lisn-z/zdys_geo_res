export type ExperimentLevel = 1 | 2 | 3
export type ExperimentParams = { rainfall: ExperimentLevel; slope: ExperimentLevel; material: ExperimentLevel }
export type ExperimentKind = 'landslide' | 'debris'
export const DEFAULT_PARAMS: ExperimentParams = { rainfall: 2, slope: 2, material: 2 }
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n))
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t) }
const levelValue = (n: ExperimentLevel) => [0, .25, .6, 1][n]!
export const channelCenter = (z: number) => 2.8 * Math.sin((z + 15) * .085)
export const slopeScale = (level: ExperimentLevel) => [0, .65, 1, 1.35][level]!

export interface ExperimentFrame {
  triggered: boolean
  onset: number | null
  motion: number
  extent: number
  volume: number
  travel: number
  flowFront: number
  flowWidthScale: number
  fanAdvance: number
  fanFront: number
  flowThickness: number
  fanThickness: number
}

/** Dimensionless classroom relationships, not calibrated hazard thresholds.
 * Rain and slope increase the driving conditions. `material` means lower
 * stability for a landslide, and more available loose sediment for debris flow.
 * All experiments share one normalized rainfall duration and starting layout.
 */
export function getExperimentFrame(kind: ExperimentKind, params: ExperimentParams, progress: number): ExperimentFrame {
  const rain = levelValue(params.rainfall), slope = levelValue(params.slope), material = levelValue(params.material)
  const driving = kind === 'landslide' ? .4 * rain + .35 * slope + .25 * material : .62 * rain + .38 * slope
  const triggered = driving > .48
  const extent = triggered ? clamp((driving - .48) / .32) : 0
  const onset = triggered ? .72 - .57 * extent : null
  const motion = onset === null ? 0 : smooth(onset, .96, progress)
  const volume = kind === 'landslide' ? 1 : (35 + 15 * params.material + 10 * params.rainfall) / 100
  const flowFront = -27 + 57 * extent * motion
  const fanAdvance = clamp((flowFront - 13) / 17)
  return {
    triggered, onset, extent, motion, volume,
    travel: 26 * extent * motion,
    flowFront,
    flowWidthScale: volume * (onset === null ? 0 : smooth(onset, Math.min(.96, onset + .18), progress)),
    fanAdvance, fanFront: 13 + 18 * fanAdvance,
    flowThickness: .28 + .38 * volume, fanThickness: .5 + .6 * volume,
  }
}

export function flowHalfWidth(frame: ExperimentFrame, z: number) {
  return (1.5 + .5 * Math.sin(z * .7)) * frame.flowWidthScale
}
export function fanHalfWidth(frame: ExperimentFrame, z: number) {
  return (2 * frame.fanAdvance + (z - 13) * .5) * frame.volume
}
export type ExperimentActor = { type: 'house' | 'tree'; x: number; z: number; exposed: boolean }
export function getExperimentActors(kind: ExperimentKind): ExperimentActor[] {
  const z = kind === 'landslide' ? 10 : 25
  const actors: ExperimentActor[] = [
    { type: 'house', x: kind === 'landslide' ? -4 : channelCenter(z) + 5.2, z, exposed: true },
    { type: 'house', x: 17, z: 18, exposed: false },
  ]
  for (let i = 0; i < 8; i++) {
    const exposed = i < 4, z = exposed ? (kind === 'landslide' ? -3 + i * 3 : 3 + i * 4) : -17 + (i - 4) * 12
    const x = exposed ? (kind === 'landslide' ? -7 + (i % 2) * 4 : channelCenter(z) + (i % 2 ? 1 : -1) * 1.8) : (i % 2 ? 23 : -18)
    actors.push({ type: 'tree', x, z, exposed })
  }
  return actors
}

/** Contact is shared by scene animation and the comparison result, so changing
 * a parameter cannot show a damaged house while reporting an untouched one. */
export function getActorImpact(kind: ExperimentKind, frame: ExperimentFrame, actor: ExperimentActor) {
  if (!actor.exposed || frame.motion === 0) return 0
  const halfZ = actor.type === 'house' ? 1.7 : .18, halfX = actor.type === 'house' ? 1.525 : .18
  if (kind === 'landslide') return smooth(actor.z - halfZ, actor.z + halfZ, -3.5 + frame.travel)
  const distance = Math.abs(actor.x - channelCenter(actor.z))
  const inFlow = smooth(actor.z - halfZ, actor.z + halfZ, frame.flowFront) * smooth(distance - halfX, distance + halfX, flowHalfWidth(frame, actor.z))
  const inFan = actor.z >= 13 && frame.fanAdvance > 0
    ? smooth(actor.z - halfZ, actor.z + halfZ, frame.fanFront) * smooth(distance - halfX, distance + halfX, fanHalfWidth(frame, actor.z)) : 0
  return Math.max(inFlow, inFan)
}

export interface ExperimentResult {
  triggered: boolean
  onset: number | null
  onsetLabel: string
  reachLabel: string
  volumeLabel: string
  houseAffected: boolean
  treeCount: number
  roadAffected: boolean
  explanation: string
}
export function evaluateExperiment(kind: ExperimentKind, params: ExperimentParams): ExperimentResult {
  const frame = getExperimentFrame(kind, params, 1), actors = getExperimentActors(kind)
  const impacts = actors.map(actor => getActorImpact(kind, frame, actor))
  const reached = kind === 'landslide' ? -3.5 + frame.travel : frame.flowFront
  const reachLabel = !frame.triggered ? '未启动' : kind === 'landslide'
    ? reached < 8.3 ? '停在坡中' : reached < 16 ? '到达坡下' : '到达坡脚'
    : reached < -5 ? '停在上游' : reached < 13 ? '到达中游' : '到达沟口'
  const onsetLabel = frame.onset === null ? '本轮未启动' : frame.onset < .35 ? '前段启动' : frame.onset < .6 ? '中段启动' : '后段启动'
  return {
    triggered: frame.triggered, onset: frame.onset, onsetLabel, reachLabel,
    volumeLabel: !frame.triggered?'未搬运':kind==='landslide'?'同一岩土体':frame.volume<.8?'较少':frame.volume<1?'中等':'较多',
    houseAffected: impacts[0]! > .05,
    treeCount: actors.filter((actor, i) => actor.type === 'tree' && impacts[i]! > .05).length,
    roadAffected: frame.triggered && (kind === 'landslide' ? reached > 11.7 : frame.fanFront > 28.5),
    explanation: !frame.triggered
      ? '在本轮相同的降雨持续过程中，这组条件未使模型启动。不能据此判断实际山地安全。'
      : kind === 'landslide'
        ? '本模型中，更强降雨、更大坡度或更弱岩土表示更有利于滑动的条件；变化幅度受模型上限限制，结果不一定继续增大。探究单项影响时，其余条件保持相同。'
        : '本模型中，降雨和沟谷坡度影响启动与推进；松散物源改变搬运规模、泥流宽厚和沟口扩散，不把更多物源直接等同于更快。',
  }
}
