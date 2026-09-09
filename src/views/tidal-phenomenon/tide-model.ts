// Circular, coplanar lunar equilibrium tide. Heights are illustrative, not metres.
export const SIDEREAL_DAY_HOURS = 23.9344696
export const SIDEREAL_MONTH_HOURS = 27.321661 * 24
export const EARTH_DEGREES_PER_HOUR = 360 / SIDEREAL_DAY_HOURS
export const MOON_DEGREES_PER_HOUR = 360 / SIDEREAL_MONTH_HOURS
export const LUNAR_DAY_HOURS = 360 / (EARTH_DEGREES_PER_HOUR - MOON_DEGREES_PER_HOUR)
export const SIMULATION_HOURS_PER_SECOND = 0.8

export const EARTH_RADIUS = 2.65
// The reference water layer is thickened so exaggerated low water stays outside land.
export const MEAN_SEA_RADIUS = EARTH_RADIUS * 1.13
export const TIDE_AMPLITUDE = EARTH_RADIUS * 0.1

export function normalizeDegrees(angle: number) {
  return ((angle % 360) + 360) % 360
}

// Degree-two equilibrium potential: opposite points have the same tide;
// the global spherical average is zero, with maxima +1 and minima -1/2.
export function equilibriumHeight(directionCosine: number) {
  return (3 * directionCosine * directionCosine - 1) / 2
}

export function seaRadius(directionCosine: number, strength: number) {
  return MEAN_SEA_RADIUS + TIDE_AMPLITUDE * strength * equilibriumHeight(directionCosine)
}

export function advanceAngles(earth: number, moon: number, hours: number, rotateEarth: boolean, orbitMoon: boolean) {
  return {
    earth: normalizeDegrees(earth + (rotateEarth ? hours * EARTH_DEGREES_PER_HOUR : 0)),
    moon: normalizeDegrees(moon + (orbitMoon ? hours * MOON_DEGREES_PER_HOUR : 0)),
  }
}

export function observerTide(earth: number, moon: number, rotateEarth = true, orbitMoon = true) {
  const phase = normalizeDegrees(earth - moon) * Math.PI / 180
  const height = equilibriumHeight(Math.cos(phase))
  const relativeSpeed = (rotateEarth ? EARTH_DEGREES_PER_HOUR : 0) - (orbitMoon ? MOON_DEGREES_PER_HOUR : 0)
  const rate = -1.5 * Math.sin(2 * phase) * relativeSpeed * Math.PI / 180
  const stage = relativeSpeed === 0 ? '位置固定'
    : height > 0.995 ? '高潮附近'
      : height < -0.495 ? '低潮附近'
        : rate > 0 ? '涨潮中' : '落潮中'
  return { height, stage, rate, cycleProgress: normalizeDegrees(earth - moon + 90) / 360 }
}
