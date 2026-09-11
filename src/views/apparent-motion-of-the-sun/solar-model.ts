/**
 * 太阳视运动教学模型：角度统一以度为单位，时角 H=0 为当地太阳时 12:00，
 * H<0 为上午。场景采用右手坐标：+x 东、+y 天顶、+z 南。
 * 忽略大气折射、太阳视半径和一天内的赤纬变化；不用于精密天文预报。
 */
const DEG = Math.PI / 180
const EPSILON = 1e-12
const YEAR = 2026
const DAYS_IN_YEAR = 365
const DAY_MS = 86_400_000
const YEAR_START = Date.UTC(YEAR, 0, 1)
export const OBLIQUITY = 23.44

export interface SunPosition {
  x: number
  y: number
  z: number
  alt: number
  /** 北起顺时针；天顶、天底及精确极点没有唯一的地理方位角。 */
  azDeg: number | null
}

export interface Daylight {
  status: 'normal' | 'polar-day' | 'polar-night' | 'horizon'
  hours: number | null
  sunriseHourAngle: number | null
  sunsetHourAngle: number | null
}

export interface Season {
  id: string
  name: string
  day: number
  date: string
}

/**
 * 香港天文台 2026 年历（UTC+8 日期），按年内先后顺序排列。
 * https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt
 * 注意：2026 年立夏是 5 月 5 日，春分是第 79 天。
 */
export const seasons: readonly Season[] = [
  { id: 'lichun', name: '立春', day: 35, date: '2026-02-04' },
  { id: 'chunfen', name: '春分', day: 79, date: '2026-03-20' },
  { id: 'lixia', name: '立夏', day: 125, date: '2026-05-05' },
  { id: 'summer', name: '夏至', day: 172, date: '2026-06-21' },
  { id: 'liqiu', name: '立秋', day: 219, date: '2026-08-07' },
  { id: 'equinox', name: '秋分', day: 266, date: '2026-09-23' },
  { id: 'lidong', name: '立冬', day: 311, date: '2026-11-07' },
  { id: 'winter', name: '冬至', day: 356, date: '2026-12-22' },
]

function wrapDay(day: number): number {
  if (!Number.isFinite(day)) throw new RangeError('年内日期必须为有限数值')
  return ((day - 1) % DAYS_IN_YEAR + DAYS_IN_YEAR) % DAYS_IN_YEAR + 1
}

export function dateFromDay(day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_YEAR) {
    throw new RangeError('2026 年的日期序号须为 1 至 365 的整数')
  }
  return new Date(YEAR_START + (day - 1) * DAY_MS).toISOString().slice(0, 10)
}

/** 按 UTC 解析纯日期，避免本地时区或夏令时造成日期序号偏移。 */
export function dayFromDate(date: string): number {
  if (!/^2026-\d{2}-\d{2}$/.test(date)) throw new RangeError('日期须使用 2026-MM-DD 格式')
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  const day = (timestamp - YEAR_START) / DAY_MS + 1
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_YEAR || dateFromDay(day) !== date) {
    throw new RangeError('日期不在 2026 年有效日期范围内')
  }
  return day
}

/**
 * 在四个二分二至日之间分段匀速插值太阳黄经，再用
 * δ = asin(sin ε · sin λ) 求赤纬。四锚点精确为 0 / ±23.44°，
 * 其余日期为教学近似；按钮和日期滑块必须共用此函数。
 * 跨年沿同一个 365 日参考年循环，不把 1 月误判为接近立春。
 */
export function declinationForDay(day: number): number {
  const current = wrapDay(day)
  const anchors = [
    { day: 356 - DAYS_IN_YEAR, longitude: -90, declination: -OBLIQUITY },
    { day: 79, longitude: 0, declination: 0 },
    { day: 172, longitude: 90, declination: OBLIQUITY },
    { day: 266, longitude: 180, declination: 0 },
    { day: 356, longitude: 270, declination: -OBLIQUITY },
    { day: 79 + DAYS_IN_YEAR, longitude: 360, declination: 0 },
  ]
  for (let index = 1; index < anchors.length; index++) {
    const start = anchors[index - 1]!
    const end = anchors[index]!
    if (current > end.day) continue
    if (current === end.day) return end.declination
    if (current === start.day) return start.declination
    const fraction = (current - start.day) / (end.day - start.day)
    const longitude = start.longitude + (end.longitude - start.longitude) * fraction
    return Math.asin(Math.sin(OBLIQUITY * DEG) * Math.sin(longitude * DEG)) / DEG
  }
  // wrapDay 保证 current 位于锚点范围内。
  return 0
}

/** 最近的八个参考节气之一，按年周期计算距离，包括上一年的冬至。 */
export function closestSeason(day: number): Season {
  const current = wrapDay(day)
  let closest = seasons[0]!
  let distance = Infinity
  for (const season of seasons) {
    const difference = Math.abs(current - season.day)
    const cyclicDistance = Math.min(difference, DAYS_IN_YEAR - difference)
    if (cyclicDistance < distance) {
      distance = cyclicDistance
      closest = season
    }
  }
  return closest
}

/** 由赤道坐标直接旋转至本地地平坐标；不通过方位角反算位置，避免极点除零。 */
export function calculateSunPosition(
  latitude: number,
  declination: number,
  hourAngle: number,
  radius = 8,
): SunPosition {
  const phi = latitude * DEG
  const delta = declination * DEG
  const hour = hourAngle * DEG
  const sinPhi = Math.sin(phi)
  const cosPhi = Math.cos(phi)
  const sinDelta = Math.sin(delta)
  const cosDelta = Math.cos(delta)
  const east = -cosDelta * Math.sin(hour)
  const up = sinPhi * sinDelta + cosPhi * cosDelta * Math.cos(hour)
  const south = sinPhi * cosDelta * Math.cos(hour) - cosPhi * sinDelta
  const horizontal = Math.hypot(east, south)
  const azDeg = horizontal < EPSILON || Math.abs(cosPhi) < EPSILON
    ? null
    : (Math.atan2(east, -south) / DEG + 360) % 360
  return {
    x: radius * east,
    y: radius * up,
    z: radius * south,
    alt: Math.atan2(up, horizontal) / DEG,
    azDeg,
  }
}

/**
 * 太阳中心过几何地平线（高度 0°）为日出日落边界。
 * 用 sin(h)=A+B cos(H) 的极值判别，避免 tan(±90°) 和极地 NaN。
 * 与地平线相切的临界日归入 24h / 0h，不虚构一对普通日出日落。
 * 精确极点且 δ=0 时，太阳中心全天在地平线上，昼长不作 12h/24h 强行归类。
 */
export function getDaylight(latitude: number, declination: number): Daylight {
  const phi = latitude * DEG
  const delta = declination * DEG
  const offset = Math.sin(phi) * Math.sin(delta)
  const amplitude = Math.abs(Math.cos(phi) * Math.cos(delta))
  const noCrossing = (status: Daylight['status'], hours: number | null): Daylight => ({
    status, hours, sunriseHourAngle: null, sunsetHourAngle: null,
  })
  if (amplitude < EPSILON && Math.abs(offset) < EPSILON) return noCrossing('horizon', null)
  if (offset - amplitude >= -EPSILON) return noCrossing('polar-day', 24)
  if (offset + amplitude <= EPSILON) return noCrossing('polar-night', 0)
  const halfDayAngle = Math.acos(Math.max(-1, Math.min(1, -offset / amplitude))) / DEG
  return {
    status: 'normal',
    hours: 2 * halfDayAngle / 15,
    sunriseHourAngle: -halfDayAngle,
    sunsetHourAngle: halfDayAngle,
  }
}

/** 太阳日周运动轨迹平面与地平面的锐夹角；只随纬度变化，不随节气变化。 */
export function getTrackInclination(latitude: number): number {
  return 90 - Math.abs(latitude)
}
