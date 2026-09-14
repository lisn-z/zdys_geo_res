export type MotionChannel = 'orbit' | 'rotation'

export interface MotionPlaybackState {
  orbit: boolean
  rotation: boolean
  resumeOrbit: boolean
  resumeRotation: boolean
}

export function createMotionPlayback(): MotionPlaybackState {
  return { orbit: true, rotation: true, resumeOrbit: true, resumeRotation: true }
}

export function setMotionPlaying(state: MotionPlaybackState, channel: MotionChannel, playing: boolean) {
  if (state[channel] === playing) return
  // Remember the last running combination even when the final channel is paused individually.
  if (state.orbit || state.rotation) {
    state.resumeOrbit = state.orbit
    state.resumeRotation = state.rotation
  }
  state[channel] = playing
  if (state.orbit || state.rotation) {
    state.resumeOrbit = state.orbit
    state.resumeRotation = state.rotation
  }
}

export function toggleMotionPlayback(state: MotionPlaybackState) {
  if (state.orbit || state.rotation) {
    state.resumeOrbit = state.orbit
    state.resumeRotation = state.rotation
    state.orbit = false
    state.rotation = false
  } else {
    state.orbit = state.resumeOrbit
    state.rotation = state.resumeRotation
  }
}

const TAU = Math.PI * 2
const ORBIT_CYCLES_PER_SECOND = 0.45 / 36
const ROTATION_RADIANS_PER_SECOND = 0.9 * Math.PI / 12
const wrap = (value: number, period: number) => ((value % period) + period) % period

/** Solar longitude in the tilted, but not yet spun, Earth frame used by the scene. */
export function solarLongitudeAtOrbitAngle(orbitAngle: number, axialTilt: number) {
  return Math.atan2(-Math.cos(orbitAngle), Math.cos(axialTilt) * Math.sin(orbitAngle))
}

/** Greenwich apparent solar time is derived from orientation, not an independent clock. */
export function solarHourFromSpinAngle(spinAngle: number, orbitAngle: number, axialTilt: number) {
  return wrap(12 + (spinAngle - solarLongitudeAtOrbitAngle(orbitAngle, axialTilt)) * 12 / Math.PI, 24)
}

/** Used only to set an initial time or explicitly scrub the solar-time slider. */
export function spinAngleFromSolarHour(solarHour: number, orbitAngle: number, axialTilt: number) {
  return wrap(solarLongitudeAtOrbitAngle(orbitAngle, axialTilt) + (solarHour - 12) * Math.PI / 12, TAU)
}

/** Signed rate also explains reverse solar time when a very slow spin is playing. */
export function solarHourRate(
  state: Pick<MotionPlaybackState, 'orbit' | 'rotation'>,
  orbitAngle: number,
  axialTilt: number,
  daySpeed: number,
  orbitSpeed = 1,
  orbitRateScale = 1,
) {
  const spinRate = state.rotation ? Math.max(0, daySpeed) * ROTATION_RADIANS_PER_SECOND : 0
  const projectedY = Math.sin(axialTilt) * Math.sin(orbitAngle)
  const sunLongitudeRate = state.orbit
    ? Math.max(0, orbitSpeed) * Math.max(0, orbitRateScale) * ORBIT_CYCLES_PER_SECOND * TAU * Math.cos(axialTilt) / (1 - projectedY * projectedY)
    : 0
  return (spinRate - sunLongitudeRate) * 12 / Math.PI
}

export function formatSolarHour(value: number) {
  // Round the complete time first so 11:59:59 carries to 12:00, including midnight.
  const totalMinutes = Math.round(wrap(value, 24) * 60) % 1440
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export function formatSolarDuration(hours: number) {
  const totalMinutes = Math.round(Math.max(0, hours) * 60)
  return `${Math.floor(totalMinutes / 60)}小时${totalMinutes % 60}分`
}

/** Independent physical phases: pausing rotation freezes orientation relative to the stars. */
export function advanceMotion(
  state: Pick<MotionPlaybackState, 'orbit' | 'rotation'>,
  yearProgress: number,
  spinAngle: number,
  dt: number,
  daySpeed: number,
  orbitSpeed = 1,
) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0
  return {
    yearProgress: state.orbit && elapsed > 0
      ? wrap(yearProgress + elapsed * Math.max(0, orbitSpeed) * ORBIT_CYCLES_PER_SECOND, 1)
      : yearProgress,
    spinAngle: state.rotation && elapsed > 0
      ? wrap(spinAngle + elapsed * Math.max(0, daySpeed) * ROTATION_RADIANS_PER_SECOND, TAU)
      : spinAngle,
  }
}
