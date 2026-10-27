/** Fixed teaching-model offsets, in minutes east of UTC. No calendar or DST is inferred. */
export const STATION_STANDARD_OFFSETS: Readonly<Record<string, number>> = Object.freeze({
  上海: 480,
  东京: 540,
  新加坡: 480,
  新德里: 330,
  迪拜: 240,
  伦敦: 0,
  巴黎: 60,
  柏林: 60,
  莫斯科: 180,
  纽约: -300,
  洛杉矶: -480,
  墨西哥城: -360,
  基多: -300,
  里约热内卢: -180,
  开罗: 120,
  开普敦: 120,
  内罗毕: 180,
  悉尼: 600,
  奥克兰: 720,
})

export type StationTimeInput = { name: string; longitude: number; readonly: boolean }
export type StationTime = {
  utcTime: string
  localTime: string
  localMinutes: number
  label: '当地时间' | '区时估算'
  offsetMinutes: number
  offsetLabel: string
  /** Local calendar-day difference relative to the displayed UTC day. */
  dayOffset: number
  dayLabel: '' | '前一日' | '次日'
  source: 'standard' | 'estimated'
  description: string
}

function wrapMinutes(minutes: number) { return ((minutes % 1440) + 1440) % 1440 }
function formatMinutes(minutes: number) {
  const wrapped = wrapMinutes(minutes)
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

export function formatUtcOffset(offsetMinutes: number): string {
  const rounded = Math.round(offsetMinutes)
  const absolute = Math.abs(rounded)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `UTC${rounded < 0 ? '−' : '+'}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

/** Custom points use ideal 15-degree zones, not longitude-derived solar time or political time zones. */
export function nominalZoneOffset(longitude: number): number {
  const bounded = Math.max(-180, Math.min(180, longitude))
  return Math.sign(bounded) * Math.floor(Math.abs(bounded) / 15 + 0.5) * 60
}

export function getStationTime(utcHour: number, station: StationTimeInput): StationTime {
  if (!Number.isFinite(utcHour) || !Number.isFinite(station.longitude)) {
    throw new RangeError('Station time requires a finite UTC hour and longitude')
  }
  const knownOffset = station.readonly && Object.prototype.hasOwnProperty.call(STATION_STANDARD_OFFSETS, station.name)
    ? STATION_STANDARD_OFFSETS[station.name] : undefined
  const offsetMinutes = knownOffset ?? nominalZoneOffset(station.longitude)
  const source = knownOffset === undefined ? 'estimated' : 'standard'
  // Use the same nearest-minute convention as the main UTC clock, including midnight wrap.
  const utcMinutes = wrapMinutes(Math.round(utcHour * 60))
  const localMinutes = utcMinutes + offsetMinutes
  const dayOffset = Math.floor(localMinutes / 1440)
  return {
    utcTime: formatMinutes(utcMinutes),
    localTime: formatMinutes(localMinutes),
    localMinutes: wrapMinutes(localMinutes),
    label: source === 'standard' ? '当地时间' : '区时估算',
    offsetMinutes,
    offsetLabel: formatUtcOffset(offsetMinutes),
    dayOffset,
    dayLabel: dayOffset < 0 ? '前一日' : dayOffset > 0 ? '次日' : '',
    source,
    description: source === 'standard'
      ? '按城市标准时区换算；教学模型不模拟夏令时。前一日或次日均相对于 UTC 日期。'
      : '按经度所在的名义时区估算，不代表当地实际行政时区；前一日或次日均相对于 UTC 日期。',
  }
}

/** A local-clock edit changes the shared UTC instant, never the stored observation coordinates. */
export function utcHourFromStationMinutes(localMinutes: number, station: StationTimeInput): number {
  if (!Number.isFinite(localMinutes)) throw new RangeError('Local time requires a finite minute value')
  const { offsetMinutes } = getStationTime(0, station)
  return wrapMinutes(Math.round(localMinutes) - offsetMinutes) / 60
}
