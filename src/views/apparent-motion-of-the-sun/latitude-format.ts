const UNAVAILABLE_ANGLE = '—'

/** 角度统一四舍五入到整分，进位后再拆出度、分，避免出现 60′。 */
function absoluteMinutes(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const minutes = Math.abs(value) * 60
  // 抵消恰好半分时的二进制浮点误差，保证 26′30″ 按四舍五入成为 27′。
  const rounded = Math.round(minutes + Number.EPSILON * Math.max(1, minutes))
  return Number.isSafeInteger(rounded) ? rounded : null
}

/** 带符号的度分格式，例如 23°26′、40°00′、−23°26′。 */
export function formatAngleDMS(value: number): string {
  const minutes = absoluteMinutes(value)
  if (minutes === null) return UNAVAILABLE_ANGLE
  const degrees = Math.floor(minutes / 60)
  const remainder = (minutes % 60).toString().padStart(2, '0')
  const sign = value < 0 && minutes !== 0 ? '−' : ''
  return `${sign}${degrees}°${remainder}′`
}

/** 纬度/赤纬用 N、S 表方向；零及舍入到零分的数值不添加半球或负号。 */
export function formatLatitudeDMS(value: number): string {
  const magnitude = formatAngleDMS(Math.abs(value))
  if (magnitude === UNAVAILABLE_ANGLE || magnitude === '0°00′') return magnitude
  return `${magnitude}${value < 0 ? 'S' : 'N'}`
}
