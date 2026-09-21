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

/** 真实比例：地球公转一圈约自转 365 圈（中学地理教学取值）。 */
export const REAL_ROTATIONS_PER_ORBIT = 365

/**
 * 演示模式基准：公转一圈约 150 秒、自转约 20 圈。
 * 这是为"看得完四季 + 看得清自转"妥协的示意比例，并非真实值（真实为 365:1），
 * 真实比例由科学模式提供。比例被显式定义，不再是两个魔数偶然相除的结果。
 */
const DEMO_SECONDS_PER_ORBIT = 150
export const DEMO_ROTATIONS_PER_ORBIT = 20
const DEMO_ORBIT_CYCLES_PER_SECOND = 1 / DEMO_SECONDS_PER_ORBIT

/**
 * 科学模式：锁定真实比例。自转保持肉眼可见（约 2 秒/圈），
 * 公转按 365:1 随之极慢（一年约 12 分钟），四季改用时间轴或节气按钮跳转观察。
 */
const SCIENCE_SECONDS_PER_SPIN = 2
const SCIENCE_ROTATION_RADIANS_PER_SECOND = TAU / SCIENCE_SECONDS_PER_SPIN
const SCIENCE_ORBIT_CYCLES_PER_SECOND = (1 / SCIENCE_SECONDS_PER_SPIN) / REAL_ROTATIONS_PER_ORBIT

export interface MotionRates {
  /** 公转：每秒完成的轨道圈数（yearProgress 增量）。 */
  orbitCyclesPerSecond: number
  /** 自转：每秒转过的弧度（spinAngle 增量）。 */
  rotationRadiansPerSecond: number
  /** 当前每公转一圈对应的自转圈数，用于界面比例读数。 */
  rotationsPerOrbit: number
}

/**
 * 把播放模式与两个演示倍速换算成实际角速度。
 * 科学模式忽略倍速滑块，始终返回锁定的真实比例；演示模式下两滑块仍可独立调节。
 */
export function resolveMotionRates(scienceMode: boolean, daySpeed: number, orbitSpeed: number): MotionRates {
  if (scienceMode) {
    return {
      orbitCyclesPerSecond: SCIENCE_ORBIT_CYCLES_PER_SECOND,
      rotationRadiansPerSecond: SCIENCE_ROTATION_RADIANS_PER_SECOND,
      rotationsPerOrbit: REAL_ROTATIONS_PER_ORBIT,
    }
  }
  const orbitCyclesPerSecond = Math.max(0, orbitSpeed) * DEMO_ORBIT_CYCLES_PER_SECOND
  const rotationRadiansPerSecond = Math.max(0, daySpeed) * DEMO_ROTATIONS_PER_ORBIT * DEMO_ORBIT_CYCLES_PER_SECOND * TAU
  const rotationsPerOrbit = orbitCyclesPerSecond > 0
    ? (rotationRadiansPerSecond / TAU) / orbitCyclesPerSecond
    : 0
  return { orbitCyclesPerSecond, rotationRadiansPerSecond, rotationsPerOrbit }
}

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
  rates: MotionRates,
  orbitRateScale = 1,
) {
  const spinRate = state.rotation ? rates.rotationRadiansPerSecond : 0
  const projectedY = Math.sin(axialTilt) * Math.sin(orbitAngle)
  const sunLongitudeRate = state.orbit
    ? rates.orbitCyclesPerSecond * Math.max(0, orbitRateScale) * TAU * Math.cos(axialTilt) / (1 - projectedY * projectedY)
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
  rates: MotionRates,
) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0
  return {
    yearProgress: state.orbit && elapsed > 0
      ? wrap(yearProgress + elapsed * rates.orbitCyclesPerSecond, 1)
      : yearProgress,
    spinAngle: state.rotation && elapsed > 0
      ? wrap(spinAngle + elapsed * rates.rotationRadiansPerSecond, TAU)
      : spinAngle,
  }
}
