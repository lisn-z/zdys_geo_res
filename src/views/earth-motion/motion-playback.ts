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

export interface CartesianDirection {
  x: number
  y: number
  z: number
}

const nonnegativeFinite = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0

/**
 * World-space relative angular velocity, in radians per simulation second.
 * The Earth rotates about its tilted axis A, while sunlight rotates about the
 * ecliptic normal Y. Thus W = spinRate * A - orbitRate * Y and, at every surface
 * normal n, d(n·sun)/dt = (W × n)·sun. This includes changing solar declination;
 * reversing the ordinary spin-based dawn/dusk labels by solar-hour sign does not.
 * orbitRateScale is d(seasonProgress)/d(calendarProgress) for the current date.
 */
export function relativeIlluminationAngularVelocity(
  state: Pick<MotionPlaybackState, 'orbit' | 'rotation'>,
  axialTilt: number,
  daySpeed: number,
  orbitSpeed = 1,
  orbitRateScale = 1,
): CartesianDirection {
  const spinRate = state.rotation ? nonnegativeFinite(daySpeed) * ROTATION_RADIANS_PER_SECOND : 0
  const orbitRate = state.orbit
    ? nonnegativeFinite(orbitSpeed) * nonnegativeFinite(orbitRateScale) * ORBIT_CYCLES_PER_SECOND * TAU
    : 0
  return {
    x: spinRate * Math.sin(axialTilt),
    y: spinRate * Math.cos(axialTilt) - orbitRate,
    z: 0,
  }
}

function unitDirection(vector?: CartesianDirection): CartesianDirection | null {
  if (!vector) return null
  const length = Math.hypot(vector.x, vector.y, vector.z)
  return Number.isFinite(length) && length > 1e-10
    ? { x: vector.x / length, y: vector.y / length, z: vector.z / length }
    : null
}

/**
 * Stable display direction for both terminator coloring and dawn/dusk cameras.
 * Pass the previously displayed axis so a pause or zero-rate cancellation does
 * not relabel the frozen scene. A newly mounted paused scene uses its remembered
 * playback combination, then the ordinary tilted spin axis as a final fallback.
 * The actual derivative is zero while paused; this is only its display reference.
 */
export function terminatorMotionAxis(
  state: Pick<MotionPlaybackState, 'orbit' | 'rotation'> & Partial<Pick<MotionPlaybackState, 'resumeOrbit' | 'resumeRotation'>>,
  axialTilt: number,
  daySpeed: number,
  orbitSpeed = 1,
  orbitRateScale = 1,
  previousAxis?: CartesianDirection,
): CartesianDirection {
  const activeAxis = unitDirection(relativeIlluminationAngularVelocity(state, axialTilt, daySpeed, orbitSpeed, orbitRateScale))
  if (activeAxis) return activeAxis
  const previous = unitDirection(previousAxis)
  if (previous) return previous
  const resumed = unitDirection(relativeIlluminationAngularVelocity({
    orbit: state.resumeOrbit ?? false,
    rotation: state.resumeRotation ?? true,
  }, axialTilt, daySpeed, orbitSpeed, orbitRateScale))
  return resumed ?? { x: Math.sin(axialTilt), y: Math.cos(axialTilt), z: 0 }
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
