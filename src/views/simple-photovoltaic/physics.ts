import type { Conditions, Output } from './types'

const DEG = Math.PI / 180
const LATITUDE = 30 * DEG

function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

/** Panel tilt is measured from horizontal; azimuth 0° faces south, +90° west. */
export function normalVector(tilt: number, azimuth: number): [number, number, number] {
  const beta = clamp(tilt, 0, 90, 30) * DEG
  const gamma = clamp(azimuth, -180, 180, 0) * DEG
  return [
    -Math.sin(beta) * Math.sin(gamma),
    Math.cos(beta),
    Math.sin(beta) * Math.cos(gamma),
  ]
}

/**
 * Illustrative equinox at 30° N. Coordinates: east +x, up +y, south +z.
 * `hour` is local solar time, not Beijing time. Direct-beam intensity is held
 * constant so pupils can isolate incident-angle changes. We omit diffuse light,
 * weather, temperature, electrical losses, and the lamp's real I–V response.
 * `power` is a relative front-surface output (0–100), not cell efficiency or W.
 */
export function calculateOutput(conditions: Conditions): Output {
  const hour = clamp(conditions.hour, 6, 18, 12)
  const hourAngle = (hour - 12) * 15 * DEG
  const horizon = hour === 6 || hour === 18
  const cosHour = horizon ? 0 : Math.cos(hourAngle)
  const sun: [number, number, number] = [
    -Math.sin(hourAngle),
    Math.cos(LATITUDE) * cosHour,
    Math.sin(LATITUDE) * cosHour,
  ]
  const normal = normalVector(conditions.tilt, conditions.azimuth)
  const dot = Math.min(1, Math.max(-1,
    sun[0] * normal[0] + sun[1] * normal[1] + sun[2] * normal[2],
  ))
  return {
    power: horizon ? 0 : 100 * Math.max(0, dot),
    incidence: Math.acos(dot) / DEG,
    altitude: Math.asin(Math.min(1, Math.max(0, sun[1]))) / DEG,
    sun,
  }
}

export function timeLabel(hour: number): string {
  const minutes = Math.round(clamp(hour, 6, 18, 12) * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function conditionsLabel(conditions: Conditions): string {
  const tilt = Math.round(clamp(conditions.tilt, 0, 90, 30))
  const azimuth = Math.round(clamp(conditions.azimuth, -180, 180, 0))
  const facing = azimuth === 0 ? '朝南'
    : Math.abs(azimuth) === 180 ? '朝北'
      : azimuth === -90 ? '朝东'
        : azimuth === 90 ? '朝西'
          : Math.abs(azimuth) < 90
            ? `南偏${azimuth < 0 ? '东' : '西'} ${Math.abs(azimuth)}°`
            : `北偏${azimuth < 0 ? '东' : '西'} ${180 - Math.abs(azimuth)}°`
  return `${timeLabel(conditions.hour)} · 倾角 ${tilt}° · ${facing}`
}

export interface StorageState { level: number; lampOn: boolean }

/**
 * Accelerated classroom storage illustration: 0–100 abstract storage marks,
 * not a measured state-of-charge percentage, battery capacity, or watt-hours.
 * A fully illuminated panel adds 3 marks per demonstration second; the ideal
 * regulated lamp uses 2. These chosen animation rates are not physical power
 * conversion factors. No battery chemistry, voltage curve, or loss model is
 * implied. The caller pauses this step during assembly, direct supply, and UI
 * pauses. An empty battery restarts the lamp at 5 marks to avoid frame flicker.
 */
export function stepStorage(state: StorageState, power: number, dt: number): StorageState {
  let level = clamp(state.level, 0, 100, 0)
  let lampOn = state.lampOn === true && level > 0
  const elapsed = clamp(dt, 0, .5, 0)
  const chargeRate = clamp(power, 0, 100, 0) / 100 * 3
  const useRate = 2
  const restartLevel = 5
  if (elapsed === 0) return { level, lampOn }

  if (!lampOn && level >= restartLevel) lampOn = true
  if (lampOn) {
    const netRate = chargeRate - useRate
    if (netRate < 0 && level + netRate * elapsed <= 0) {
      // Reach empty part-way through this frame, then recover only from input.
      const afterEmpty = elapsed - level / -netRate
      return { level: Math.min(100, Math.max(0, chargeRate * afterEmpty)), lampOn: false }
    }
    return { level: Math.min(100, Math.max(0, level + netRate * elapsed)), lampOn: true }
  }

  if (chargeRate === 0) return { level, lampOn: false }
  const untilRestart = (restartLevel - level) / chargeRate
  if (untilRestart > elapsed) return { level: Math.min(100, level + chargeRate * elapsed), lampOn: false }
  // Charge up to the restart mark, then include lamp use for the remaining time.
  level = restartLevel + (chargeRate - useRate) * (elapsed - untilRestart)
  return { level: Math.min(100, Math.max(0, level)), lampOn: true }
}
