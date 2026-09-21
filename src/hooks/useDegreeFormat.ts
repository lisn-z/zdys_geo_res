const MINUTES_PER_DEGREE = 60

/** 度分制的负号用 U+2212，与教材排版的减号一致。 */
const MINUS_SIGN = '\u2212'

function toDegreeMinutes(decimalDegrees: number) {
  const totalMinutes = Math.round(Math.abs(decimalDegrees) * MINUTES_PER_DEGREE)
  return {
    totalMinutes,
    negative: decimalDegrees < 0 && totalMinutes > 0,
    degrees: Math.floor(totalMinutes / MINUTES_PER_DEGREE),
    minutes: totalMinutes % MINUTES_PER_DEGREE,
  }
}

/**
 * 把小数度数格式化为度分形式，如 23.44 -> 23°26′。
 * 整度时省略分，负数保留负号。
 */
export function formatDegrees(decimalDegrees: number): string {
  const { negative, degrees, minutes } = toDegreeMinutes(decimalDegrees)
  const sign = negative ? MINUS_SIGN : ''
  if (minutes === 0) return `${sign}${degrees}°`
  return `${sign}${degrees}°${minutes.toString().padStart(2, '0')}′`
}

/**
 * 带显式正负号的度分形式，如 +23°26′ / −23°26′，用于需要体现方向的角度（如太阳高度角 h）。
 * 四舍五入到 0 分时不显示符号。
 */
export function formatSignedDegrees(decimalDegrees: number): string {
  const { totalMinutes, negative } = toDegreeMinutes(decimalDegrees)
  const sign = totalMinutes === 0 ? '' : negative ? MINUS_SIGN : '+'
  return `${sign}${formatDegrees(Math.abs(decimalDegrees))}`
}

/** 按四舍五入后的分值判断半球，避免赤道 / 春秋分附近的微小值被标成 0°N。 */
function withHemisphere(decimalDegrees: number, positive: string, negative: string): string {
  if (toDegreeMinutes(decimalDegrees).totalMinutes === 0) return formatDegrees(0)
  return `${formatDegrees(Math.abs(decimalDegrees))}${decimalDegrees > 0 ? positive : negative}`
}

/**
 * 纬度格式化：北纬补 N、南纬补 S，赤道显示为 0°。
 */
export function formatLatitude(decimalDegrees: number): string {
  return withHemisphere(decimalDegrees, 'N', 'S')
}

/**
 * 经度格式化：东经补 E、西经补 W，本初子午线显示为 0°。
 */
export function formatLongitude(decimalDegrees: number): string {
  return withHemisphere(decimalDegrees, 'E', 'W')
}

export function useDegreeFormat() {
  return {
    formatDegrees,
    formatSignedDegrees,
    formatLatitude,
    formatLongitude,
  }
}
