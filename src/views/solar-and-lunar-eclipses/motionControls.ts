const wrapDegrees = (angle: number) => ((angle % 360) + 360) % 360

// NASA mean sidereal periods. Seasons remain user-selected (no annual integration).
export const MOON_SIDEREAL_DAYS = 27.3217
export const EARTH_SIDEREAL_HOURS = 23.9345
export const MOON_DEGREES_PER_SECOND = 7.2
export const EARTH_DEGREES_PER_SECOND = MOON_DEGREES_PER_SECOND * MOON_SIDEREAL_DAYS * 24 / EARTH_SIDEREAL_HOURS

export function advanceEarthRotation(angle: number, seconds: number, speed: number) {
  return wrapDegrees(angle + seconds * speed * EARTH_DEGREES_PER_SECOND)
}

// 同步模式由公转相位决定姿态，暂停/拖动/跳转后也保持同一面朝向地球。
// 关闭同步才保留手动自转角，作为非真实的对比实验。
export function advanceMoonMotion(
  orbit: number, spin: number, seconds: number, speed: number,
  orbitEnabled: boolean, spinEnabled: boolean,
) {
  const step = seconds * MOON_DEGREES_PER_SECOND * speed
  const nextOrbit = orbitEnabled ? wrapDegrees(orbit + step) : orbit
  return {
    orbit: nextOrbit,
    spin: spinEnabled ? wrapDegrees(nextOrbit) : spin,
  }
}

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2] as const

export function stepPlaybackSpeed(speed: number, direction: 1 | -1) {
  const current = PLAYBACK_SPEEDS.findIndex((value) => value === speed)
  const step = current <= 0 ? 1 : current >= PLAYBACK_SPEEDS.length - 1 ? -1 : direction
  const index = Math.max(0, current) + step
  return {
    speed: PLAYBACK_SPEEDS[index]!,
    direction: (index === PLAYBACK_SPEEDS.length - 1 ? -1 : index === 0 ? 1 : step) as 1 | -1,
  }
}
