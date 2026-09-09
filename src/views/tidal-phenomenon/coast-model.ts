// Display units only: this is a magnified shore at observer A, not a local forecast.
export const COAST_LOW_WATER = -0.35
export const COAST_HIGH_WATER = 1.15
export const ISLAND_CENTER = { x: -1.5, z: -0.8 }
export const ISLAND_PEAK = 3.1
export const BEACH_SLOPE = 0.48

export function coastalWaterLevel(equilibriumLevel: number) {
  const fraction = Math.max(0, Math.min(1, (equilibriumLevel + 0.5) / 1.5))
  return COAST_LOW_WATER + fraction * (COAST_HIGH_WATER - COAST_LOW_WATER)
}

function coastShape(angle: number) {
  return 1 + 0.07 * Math.sin(3 * angle) + 0.04 * Math.cos(5 * angle)
}

export function islandHeight(x: number, z: number) {
  const dx = x - ISLAND_CENTER.x
  const dz = (z - ISLAND_CENTER.z) / 0.78
  const angle = Math.atan2(dz, dx)
  const radius = Math.hypot(dx, dz) / coastShape(angle)
  return Math.max(-1.25, ISLAND_PEAK - BEACH_SLOPE * radius)
}

export function shorelinePoint(angle: number, waterLevel: number) {
  const radius = (ISLAND_PEAK - waterLevel) / BEACH_SLOPE * coastShape(angle)
  return {
    x: ISLAND_CENTER.x + Math.cos(angle) * radius,
    y: waterLevel,
    z: ISLAND_CENTER.z + Math.sin(angle) * radius * 0.78,
  }
}
