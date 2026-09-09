// 教学时间轴：节气采用近似月日，自转一圈为一个 24 小时太阳日。
// 这是与可视化同步的简化太阳时模型，不含均时差、折射或真实节气时刻。
const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

export function normalizeHours(hours: number): number {
  return ((hours % 24) + 24) % 24
}

export function formatClockHour(hours: number): string {
  const minutes = Math.floor(normalizeHours(hours) * 60 + 1e-7) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function formatHourDifference(hours: number): string {
  const minutes = Math.round(Math.abs(hours) * 60)
  const wholeHours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (!restMinutes) return `${wholeHours}小时`
  return wholeHours ? `${wholeHours}小时${restMinutes}分` : `${restMinutes}分`
}

export function getSolarTermDeclination(termIndex: number, tiltDegrees: number): number {
  const longitude = (315 + termIndex * 15) * Math.PI / 180
  return Math.asin(Math.sin(tiltDegrees * Math.PI / 180) * Math.sin(longitude)) * 180 / Math.PI
}

export function getSimulationUtcMs(year: number, commonYearDay: number, rotationRadians: number): number {
  // 表内 day 是平年日序。先还原月日，再映射到本年，避免闰年从三月起偏一天。
  const monthDay = new Date(Date.UTC(2001, 0, commonYearDay))
  const epoch = Date.UTC(year, monthDay.getUTCMonth(), monthDay.getUTCDate(), 12)
  return epoch + rotationRadians / (2 * Math.PI) * DAY_MS
}

function dateLabel(year: number, month: number, day: number): string {
  return `${year}年${month}月${day}日`
}

export function getSolarClock(utcMs: number, longitude: number) {
  // 保留 ±180°，两侧钟面相同而日期相差一天；不按短弧归一经度差。
  const localMs = utcMs + longitude / 15 * HOUR_MS
  const localDate = new Date(localMs)
  const hour = normalizeHours(localMs / HOUR_MS)
  return {
    hour,
    time: formatClockHour(hour),
    date: dateLabel(localDate.getUTCFullYear(), localDate.getUTCMonth() + 1, localDate.getUTCDate()),
  }
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>()

export function getZonedClock(utcMs: number, timeZone: string) {
  let formatter = zoneFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
    zoneFormatters.set(timeZone, formatter)
  }
  const values: Record<string, number> = {}
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  const year = values.year!
  const month = values.month!
  const day = values.day!
  const hour = values.hour!
  const minute = values.minute!
  const second = values.second!
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  const offsetMinutes = Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60_000)
  return {
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    date: dateLabel(year, month, day),
    offsetMinutes,
  }
}

export function formatUtcOffset(offsetMinutes: number): string {
  const absolute = Math.abs(offsetMinutes)
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  return `UTC${offsetMinutes >= 0 ? '+' : '-'}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

export function formatBeijingDifference(offsetMinutes: number): string {
  const difference = offsetMinutes - 8 * 60
  return difference === 0 ? '与北京相同' : `比北京${difference > 0 ? '快' : '慢'}${formatHourDifference(difference / 60)}`
}

export function splitDayHour(rawHour: number) {
  return { hour: normalizeHours(rawHour), dayOffset: Math.floor(rawHour / 24) }
}

export function formatRelativeDay(dayOffset: number): string {
  if (dayOffset === 0) return '当日'
  if (dayOffset === 1) return '次日'
  if (dayOffset === -1) return '前日'
  return `${Math.abs(dayOffset)}天${dayOffset > 0 ? '后' : '前'}`
}
