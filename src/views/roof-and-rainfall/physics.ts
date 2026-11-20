import type { Conditions, WaterResult } from './types'

/** Horizontal catchment projection, m²; changing slope never changes this area. */
export const ROOF_AREA = 24
/** Simulated seconds: 10 minutes of rain followed by 2 minutes of drainage. */
export const RAIN_DURATION = 600
export const TOTAL_TIME = 720
/** Teaching capacity of the combined roof/gutter store, litres; not a roof rating. */
export const RETENTION_CAPACITY = 96
export const MODEL_NOTE = '同一屋顶水平投影面积为24平方米，降雨垂直落下，持续10分钟，再观察2分钟。受雨体积只由水平面积、雨强和历时决定。暂存水包含屋面与檐沟中的水，已流出量包含正常排水及溢流。排水响应时间与96升暂存容量均为教学设定；主出口堵塞后，仅超过容量的水溢出，雨停后未溢出的水仍暂存。忽略蒸发、渗漏等损失，不用于预测真实民居的积水量或排空时间。'

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

/**
 * An illustrative response time, not an empirical roof-design relationship.
 * 2° -> 180 s, 20° -> 108 s, 40° -> 28 s. Surface/outlet properties are fixed.
 */
function responseTime(slope: number): number {
  return 180 - 4 * (clamp(slope, 2, 40, 20) - 2)
}

/**
 * Exact, stateless solution, safe for arbitrary timeline seeking.
 *
 * Open outlet: dS/dt = I - Q, Q = S/tau, initial storage S(0)=0.
 * During rain S = I*tau*(1-exp(-t/tau)); after rain S decays exponentially.
 * Blocked outlet: Q_main=0, S=min(total rain, capacity); excess spills over.
 *
 * All volumes are litres; outflowRate is L/s. 1 mm over 1 m² equals 1 L.
 * `drained` includes overflow and `peakRetained` is the peak up to this time.
 * For the supported inputs, open-outlet storage stays below the 96 L capacity.
 * The hard spill cap idealizes overflow: its rate may jump at the threshold,
 * while all cumulative volumes remain continuous and conserve water exactly.
 */
export function simulate(conditions: Conditions, requestedTime: number): WaterResult {
  const time = clamp(requestedTime, 0, TOTAL_TIME, 0)
  const intensity = clamp(conditions.intensity, 0, 60, 30)
  const inflowRate = ROOF_AREA * intensity / 3600
  const rainElapsed = Math.min(time, RAIN_DURATION)
  const rainVolume = inflowRate * rainElapsed
  const rainActive = time < RAIN_DURATION && intensity > 0

  if (conditions.outlet === 'blocked') {
    const retained = Math.min(rainVolume, RETENTION_CAPACITY)
    return {
      time, rainVolume,
      drained: Math.max(0, rainVolume - retained),
      retained,
      peakRetained: retained,
      rainActive,
      outflowRate: rainActive && rainVolume >= RETENTION_CAPACITY ? inflowRate : 0,
    }
  }

  const tau = responseTime(conditions.slope)
  const peakRetained = inflowRate * tau * -Math.expm1(-rainElapsed / tau)
  const afterRain = Math.max(0, time - RAIN_DURATION)
  const retained = Math.min(rainVolume, Math.max(0, peakRetained * Math.exp(-afterRain / tau)))
  return {
    time, rainVolume,
    drained: Math.max(0, rainVolume - retained),
    retained,
    peakRetained,
    rainActive,
    outflowRate: retained / tau,
  }
}

/** Includes both the rain-stop boundary and the fixed experiment end. */
export function sampleSeries(conditions: Conditions, interval = 10): WaterResult[] {
  const step = clamp(interval, 1, TOTAL_TIME, 10)
  const times = new Set<number>([0, RAIN_DURATION, TOTAL_TIME])
  for (let time = step; time < TOTAL_TIME; time += step) times.add(time)
  return [...times].sort((a, b) => a - b).map(time => simulate(conditions, time))
}
