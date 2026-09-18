// Shared geometry for the map, weather bands and city interpretations.
// Coordinates use map height as the distance unit (the tile mosaic is 2:1).
export type MapHemisphere = 'north' | 'south'
export interface MapPoint { x: number; y: number }
export type FrontPath = [MapPoint, MapPoint, MapPoint, MapPoint]
export type MovingFront = 'cold' | 'warm'

const TAU = Math.PI * 2
const radians = (degrees: number) => degrees * Math.PI / 180
const limit = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smoothstep = (start: number, end: number, value: number) => {
  const t = limit((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

/** The two lessons show different time windows of the same evolving system. */
export function getFrontalMapState(phaseValue: number, focus: MovingFront = 'cold') {
  const phase = limit(phaseValue)
  return {
    motion: smoothstep(0.28, 0.94, phase) * (focus === 'warm' ? 0.58 : 1),
    frontOpacity: smoothstep(0.04, 0.24, phase),
    cloudOpacity: smoothstep(0.25, 0.40, phase),
    rainOpacity: smoothstep(0.32, 0.46, phase),
    stageIndex: Math.min(3, Math.floor(phase * 4)),
  }
}

export const FRONT_BANDS = {
  cold: { cloudWidth: 0.16, cloudBias: -0.12, rainWidth: 0.09, rainBias: -0.18 },
  warm: { cloudWidth: 0.27, cloudBias: 0.40, rainWidth: 0.20, rainBias: 0.50 },
} as const

export function frontPoint(path: FrontPath, value: number): MapPoint {
  const t = limit(value)
  const v = 1 - t
  return {
    x: v ** 3 * path[0].x + 3 * v ** 2 * t * path[1].x + 3 * v * t ** 2 * path[2].x + t ** 3 * path[3].x,
    y: v ** 3 * path[0].y + 3 * v ** 2 * t * path[1].y + 3 * v * t ** 2 * path[2].y + t ** 3 * path[3].y,
  }
}

export function getFrontalMapGeometry(phaseValue: number, hemisphere: MapHemisphere, focus: MovingFront = 'cold') {
  const { motion } = getFrontalMapState(phaseValue, focus)
  const hemisphereSign = hemisphere === 'north' ? 1 : -1
  const lowCenter = { x: 0.49, y: hemisphere === 'north' ? 0.34 : 0.66 }
  // Keep the low fixed. Cold fronts sweep faster and narrow the warm sector,
  // without catching the warm front (occlusion is outside this demonstration).
  const coldRotation = radians(-140 * motion)
  const warmRotation = radians(-78 * motion)
  // The inner and outer fronts bend at different rates, preserving a finite
  // warm sector instead of rotating two rigid spokes around the low.
  const bend = Math.sin(Math.PI * motion)
  const polar = (radius: number, angle: number): MapPoint => ({
    x: lowCenter.x + Math.cos(angle) * radius / 2,
    y: lowCenter.y + Math.sin(angle) * radius * hemisphereSign,
  })
  const coldPath: FrontPath = [
    lowCenter,
    polar(0.25, radians(128 - 16 * bend) + coldRotation),
    polar(0.57, radians(140 - 7 * bend) + coldRotation),
    polar(0.92, radians(148 + 6 * bend) + coldRotation),
  ]
  const warmPath: FrontPath = [
    lowCenter,
    polar(0.29, radians(38 - 10 * bend) + warmRotation),
    polar(0.62, radians(44 + 2 * bend) + warmRotation),
    polar(0.94, radians(54 + 10 * bend) + warmRotation),
  ]
  return { lowCenter, coldPath, warmPath, coldRotation, warmRotation, hemisphereSign }
}

export function frontAdvanceDirection(phase: number, hemisphere: MapHemisphere, kind: MovingFront, u: number, focus: MovingFront = 'cold'): MapPoint {
  const geometry = getFrontalMapGeometry(phase, hemisphere, focus)
  const path = geometry[`${kind}Path`]
  const a = frontPoint(path, u - 0.0001)
  const b = frontPoint(path, u + 0.0001)
  const tx = (b.x - a.x) * 2
  const ty = b.y - a.y
  const length = Math.max(1e-8, Math.hypot(tx, ty))
  const normal = { x: ty / length, y: -tx / length }
  // Analytic circulation orientation is defined even before playback and in
  // the final observation interval, when finite-difference velocity is zero.
  const sign = geometry.hemisphereSign
  return { x: normal.x * sign, y: normal.y * sign }
}

export function frontRelation(city: MapPoint, path: FrontPath, hemisphere: MapHemisphere) {
  let distance = Infinity
  let u = 0
  let signedDistance = 0
  let previous = path[0]
  // Closest point on segments, rather than isolated samples. Endpoint distance
  // remains finite so extending an imaginary line cannot count as a crossing.
  for (let index = 1; index <= 96; index += 1) {
    const next = frontPoint(path, index / 96)
    const dx = (next.x - previous.x) * 2
    const dy = next.y - previous.y
    const px = (city.x - previous.x) * 2
    const py = city.y - previous.y
    const fraction = limit((px * dx + py * dy) / Math.max(1e-12, dx * dx + dy * dy))
    const offsetX = px - dx * fraction
    const offsetY = py - dy * fraction
    const candidate = Math.hypot(offsetX, offsetY)
    if (candidate < distance) {
      distance = candidate
      u = (index - 1 + fraction) / 96
      signedDistance = (offsetX * dy - offsetY * dx) / Math.max(1e-8, Math.hypot(dx, dy))
    }
    previous = next
  }
  // Positive always means the side toward which this front advances.
  signedDistance *= hemisphere === 'north' ? 1 : -1
  return { distance, signedDistance, u, onFrontExtent: u > 0.025 && u < 0.985 }
}

function angleAtRadius(path: FrontPath, center: MapPoint, radius: number, sign: number) {
  let lo = 0
  let hi = 1
  for (let index = 0; index < 16; index += 1) {
    const mid = (lo + hi) / 2
    const point = frontPoint(path, mid)
    if (Math.hypot((point.x - center.x) * 2, point.y - center.y) < radius) lo = mid
    else hi = mid
  }
  const point = frontPoint(path, (lo + hi) / 2)
  return Math.atan2((point.y - center.y) * sign, (point.x - center.x) * 2)
}

export function isInWarmSector(city: MapPoint, geometry: ReturnType<typeof getFrontalMapGeometry>) {
  const dx = (city.x - geometry.lowCenter.x) * 2
  const dy = (city.y - geometry.lowCenter.y) * geometry.hemisphereSign
  const radius = Math.hypot(dx, dy)
  if (radius < 0.045 || radius > 0.90) return false
  const angle = Math.atan2(dy, dx)
  const warmAngle = angleAtRadius(geometry.warmPath, geometry.lowCenter, radius, geometry.hemisphereSign)
  const coldAngle = angleAtRadius(geometry.coldPath, geometry.lowCenter, radius, geometry.hemisphereSign)
  const sectorWidth = (coldAngle - warmAngle + TAU) % TAU
  return (angle - warmAngle + TAU) % TAU <= sectorWidth
}

export type FrontalAirLabel = {
  key: 'warm' | 'cold-rear' | 'cold-ahead'
  text: string
  detail: string
  point: MapPoint
}

/** Pick actual air-mass points; screen clamping could move a label across a front. */
export function getFrontalAirLabels(phase: number, hemisphere: MapHemisphere, focus: MovingFront = 'cold'): FrontalAirLabel[] {
  const geometry = getFrontalMapGeometry(phase, hemisphere, focus)
  const labels: FrontalAirLabel[] = []
  const definitions = [
    { key: 'warm', text: '暖气团', detail: '两锋之间的暖区' },
    { key: 'cold-rear', text: '冷气团', detail: '冷锋后方' },
    { key: 'cold-ahead', text: '冷气团', detail: '暖锋前方' },
  ] as const
  for (const definition of definitions) {
    let best: { point: MapPoint; score: number } | undefined
    for (const radius of [0.38, 0.46, 0.30, 0.54, 0.22, 0.62, 0.16, 0.12]) {
      const coldAngle = angleAtRadius(geometry.coldPath, geometry.lowCenter, radius, geometry.hemisphereSign)
      const warmAngle = angleAtRadius(geometry.warmPath, geometry.lowCenter, radius, geometry.hemisphereSign)
      const width = (coldAngle - warmAngle + TAU) % TAU
      const angles = definition.key === 'warm'
        ? [0.5, 0.35, 0.65].map((fraction) => warmAngle + width * fraction)
        : [35, 50, 25, 70, 100, 140].map((offset) => definition.key === 'cold-rear' ? coldAngle + radians(offset) : warmAngle - radians(offset))
      for (const angle of angles) {
        const point = {
          x: geometry.lowCenter.x + Math.cos(angle) * radius / 2,
          y: geometry.lowCenter.y + Math.sin(angle) * radius * geometry.hemisphereSign,
        }
        if (point.x < 0.10 || point.x > 0.87 || point.y < 0.15 || point.y > 0.78) continue
        if (isInWarmSector(point, geometry) !== (definition.key === 'warm')) continue
        const cold = frontRelation(point, geometry.coldPath, hemisphere)
        const warm = frontRelation(point, geometry.warmPath, hemisphere)
        if (definition.key === 'cold-rear' && cold.signedDistance > -0.025) continue
        if (definition.key === 'cold-ahead' && warm.signedDistance < 0.025) continue
        const labelDistance = labels.length
          ? Math.min(...labels.map((label) => Math.hypot((label.point.x - point.x) * 2, label.point.y - point.y)))
          : 0.3
        const edgeSpace = Math.min((point.x - 0.10) * 2, (0.87 - point.x) * 2, point.y - 0.15, 0.78 - point.y)
        const score = Math.min(labelDistance, 0.3) * 2 + Math.min(cold.distance, warm.distance, 0.2) + Math.min(edgeSpace, 0.1) - Math.abs(radius - 0.38) * 0.25
        if (!best || score > best.score) best = { point, score }
      }
    }
    if (best) labels.push({ ...definition, point: best.point })
  }
  return labels
}

type Crossing = { kind: MovingFront; phase: number }
const crossingCache = new Map<string, Crossing[]>()

export function cityFrontCrossings(city: MapPoint, hemisphere: MapHemisphere, focus: MovingFront = 'cold'): Crossing[] {
  const key = `${hemisphere}:${focus}:${city.x.toFixed(7)}:${city.y.toFixed(7)}`
  const cached = crossingCache.get(key)
  if (cached) return cached
  const crossings: Crossing[] = []
  for (const kind of ['cold', 'warm'] as const) {
    let previous = frontRelation(city, getFrontalMapGeometry(0, hemisphere, focus)[`${kind}Path`], hemisphere)
    for (let step = 1; step <= 240; step += 1) {
      const phase = step / 240
      const current = frontRelation(city, getFrontalMapGeometry(phase, hemisphere, focus)[`${kind}Path`], hemisphere)
      if (previous.signedDistance > 0 && current.signedDistance <= 0 && current.onFrontExtent && current.distance < 0.012) {
        const fraction = previous.signedDistance / (previous.signedDistance - current.signedDistance)
        crossings.push({ kind, phase: (step - 1 + fraction) / 240 })
      }
      previous = current
    }
  }
  crossings.sort((a, b) => a.phase - b.phase)
  crossingCache.set(key, crossings)
  return crossings
}

export function frontBandContains(relation: ReturnType<typeof frontRelation>, kind: MovingFront, band: 'cloud' | 'rain') {
  const profile = FRONT_BANDS[kind]
  const width = band === 'cloud' ? profile.cloudWidth : profile.rainWidth
  const bias = band === 'cloud' ? profile.cloudBias : profile.rainBias
  return relation.onFrontExtent && Math.abs(relation.signedDistance - width * bias) <= width / 2
}

export function describeFrontalCity(
  city: MapPoint & { name: string },
  phaseValue: number,
  hemisphere: MapHemisphere,
  focus: MovingFront,
) {
  const phase = limit(phaseValue)
  const state = getFrontalMapState(phase, focus)
  const geometry = getFrontalMapGeometry(phase, hemisphere, focus)
  const cold = frontRelation(city, geometry.coldPath, hemisphere)
  const warm = frontRelation(city, geometry.warmPath, hemisphere)
  const crossings = cityFrontCrossings(city, hemisphere, focus)
  const past = crossings.filter((event) => event.phase <= phase)
  const last = past[past.length - 1]
  const next = crossings.find((event) => event.phase > phase)
  const inWarmSector = isInWarmSector(city, geometry)
  const north = hemisphere === 'north'
  const nearKind: MovingFront = cold.distance < warm.distance ? 'cold' : 'warm'
  const near = nearKind === 'cold' ? cold : warm
  const coldRain = state.rainOpacity > 0 && frontBandContains(cold, 'cold', 'rain')
  const warmRain = state.rainOpacity > 0 && frontBandContains(warm, 'warm', 'rain')
  const cloudNearby = state.cloudOpacity > 0 && (frontBandContains(cold, 'cold', 'cloud') || frontBandContains(warm, 'warm', 'cloud'))
  const crossingNearby = state.motion > 0 && phase < 0.94 && crossings.some((event) => event.kind === nearKind && Math.abs(event.phase - phase) < 0.035)
  const radius = Math.hypot((city.x - geometry.lowCenter.x) * 2, city.y - geometry.lowCenter.y)
  // The pressure centre does not translate. Rotation alone cannot imply a
  // pressure fall/rise; keep this distinct from a real travelling depression.
  const pressure = radius < 0.16 ? '低压中心附近，偏低' : radius < 0.48 ? '低压外围，相对偏低' : '外围影响较弱'
  const dx = (city.x - geometry.lowCenter.x) * 2
  const dy = city.y - geometry.lowCenter.y
  const spin = north ? -1 : 1
  const vx = -spin * dy - dx * 0.18
  const vy = spin * dx - dy * 0.18
  const fromBearing = (Math.atan2(-vx, vy) + TAU) % TAU
  const wind = crossingNearby && near.onFrontExtent && near.distance <= 0.025
    ? '过锋时风向改变，可能有阵风'
    : radius < 0.035 ? '中心附近风向不定' : `${['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(fromBearing / (Math.PI / 4)) % 8]}风（环流示意）`
  const focusNote = (kind: MovingFront) => kind !== focus ? '当前影响来自同一低压的另一条锋线。' : ''
  const sky = coldRain ? '冷锋窄带阵雨' : warmRain ? '暖锋前连续性降水' : cloudNearby ? '锋区云层覆盖' : state.cloudOpacity === 0 ? '云雨尚未发展' : '主云雨带未覆盖'
  let signal: string
  let temperature: string
  let impact: string
  if (state.motion === 0) {
    signal = `${city.name}当前位于${inWarmSector ? '冷锋与暖锋之间的暖区' : radius > 0.95 ? '此系统的外围' : '冷空气一侧'}。演示正在呈现初始气团分布，锋面尚未推进，不能判为已经过境。`
    temperature = radius > 0.95 ? '无法由此系统判断' : inWarmSector ? '暖侧相对偏暖' : '冷侧相对偏凉'
    impact = '继续播放可观察锋区和云雨带如何接近城市；此阶段不表示当地已经出现降水或过锋天气。'
  } else if (crossingNearby && near.onFrontExtent && near.distance <= 0.018) {
    const name = nearKind === 'cold' ? '冷锋' : '暖锋'
    signal = `${city.name}正处在${name}扫过的锋区附近，${nearKind === 'cold' ? '暖空气逐渐被冷空气替代' : '地面冷空气逐渐被暖空气替代'}。${focusNote(nearKind)}`
    temperature = nearKind === 'cold' ? '过锋时趋于下降' : '过锋时趋于回升'
    impact = nearKind === 'cold' ? '过锋时留意阵风、阵雨和体感转凉；强对流是否发生还取决于水汽与不稳定条件。' : '可能出现低云、雾和湿滑路面，出行留意能见度。'
  } else if (coldRain || warmRain) {
    const kind = coldRain ? 'cold' : 'warm'
    signal = `${city.name}位于${coldRain ? '冷锋附近的窄雨带内' : '暖锋前方的冷空气一侧，正受较宽层状云雨带影响'}。${focusNote(kind)}`
    temperature = inWarmSector ? '相对偏暖' : '相对偏凉'
    impact = '雨带覆盖时路面湿滑、能见度下降，通勤和户外活动应预留时间。'
  } else if (last?.kind === 'cold' && !inWarmSector) {
    signal = `演示中的冷锋已实际扫过${city.name}，当地目前在锋后冷空气一侧。${cloudNearby ? '仍有锋区云层影响。' : '主雨带已离开，但不能据此保证立即转晴。'}`
    temperature = '较过锋前降低'
    impact = '体感可能转凉，外出留意添衣；锋后仍可能有局地阵雨。'
  } else if (inWarmSector) {
    signal = `${last?.kind === 'warm' ? `演示中的暖锋已实际扫过${city.name}，` : `${city.name}当前`}位于冷锋与暖锋之间的暖区。${next?.kind === 'cold' ? '继续播放，旋转推进的冷锋将接近当地。' : '这并不代表两条锋线都已过境。'}`
    temperature = last?.kind === 'warm' ? '较过锋前回升' : '相对偏暖'
    impact = '暖区可能保留低云或雾；是否降雨以当前云雨带是否覆盖城市为准。'
  } else if (next && (near.distance < 0.20 || next.phase - phase < 0.20)) {
    const name = next.kind === 'cold' ? '冷锋' : '暖锋'
    signal = `${city.name}尚未被${name}扫过；按当前旋转路径，${name}将在后续进度接近当地。${cloudNearby ? '外围云层已影响当地。' : '当前主云雨带还没有覆盖城市。'}`
    temperature = next.kind === 'warm' ? '锋前相对偏凉' : '过锋前相对偏暖'
    impact = '可结合后续进度观察云雨带何时到达，再判断出行时段；未到达时不提前判为过境。'
  } else {
    signal = `${city.name}目前不在两条锋线之间的暖区，距离主要锋区${near.distance > 0.20 ? '较远' : '仍有一定距离'}。${past.length ? '曾有锋线扫过，但当前天气应按现有云雨带判断。' : '截至此进度，两条锋线都未实际扫过该城市。'}`
    temperature = radius > 0.95 ? '无法由此系统判断' : '冷侧相对偏凉'
    impact = '本图未表示当地其他天气系统；不在主雨带内，也不能据此认定当地一定晴朗。'
  }
  return { signal, temperature, pressure, wind, sky, impact }
}
