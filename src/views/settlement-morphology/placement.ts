import type { Placement, SceneStats, SiteResult } from './types'

export const GRID_SIZE = 1.8
// Conservative footprint for the rendered houses, including the coastal homes'
// slight rotation. Keep terrain cuts and siting checks on the same dimensions.
export const HOUSE_SITE_HALF_WIDTH = 0.62
export const HOUSE_SITE_HALF_DEPTH = 0.57

export function snapCoordinate(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export function copyPlacements(items: readonly Placement[]): Placement[] {
  return items.map(item => ({ ...item }))
}

export function validatePlacement(
  placement: Placement,
  items: readonly Placement[],
  site: (x: number, z: number) => SiteResult,
  ignoredId?: string,
): SiteResult {
  const result = site(placement.x, placement.z)
  if (!result.valid) return result
  const occupied = items.some(item => item.id !== ignoredId
    && Math.abs(item.x - placement.x) < GRID_SIZE * 0.75
    && Math.abs(item.z - placement.z) < GRID_SIZE * 0.75)
  return occupied ? { ...result, valid: false, reason: '这个位置已有建筑或道路，请换一个空格。' } : result
}

export function getSettlementStats(items: readonly Placement[], site: (x: number, z: number) => SiteResult): SceneStats {
  const houses = items.filter(item => item.kind === 'house')
  let spread = '继续布置'
  if (houses.length >= 3) {
    // Measure along the settlement's own axes, so a diagonal street also reads as a strip.
    const meanX = houses.reduce((sum, item) => sum + item.x, 0) / houses.length
    const meanZ = houses.reduce((sum, item) => sum + item.z, 0) / houses.length
    let xx = 0
    let zz = 0
    let xz = 0
    for (const item of houses) {
      const x = item.x - meanX
      const z = item.z - meanZ
      xx += x * x
      zz += z * z
      xz += x * z
    }
    const angle = Math.atan2(2 * xz, xx - zz) / 2
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const along = houses.map(item => (item.x - meanX) * cosine + (item.z - meanZ) * sine)
    const across = houses.map(item => -(item.x - meanX) * sine + (item.z - meanZ) * cosine)
    const major = Math.max(...along) - Math.min(...along) + GRID_SIZE
    const minor = Math.max(...across) - Math.min(...across) + GRID_SIZE
    spread = Math.max(major, minor) / Math.min(major, minor) > 2 ? '条带倾向' : '团块倾向'
  }
  return {
    houses: houses.length,
    roads: items.length - houses.length,
    spread,
    nearWater: houses.filter(item => site(item.x, item.z).nearWater).length,
  }
}
