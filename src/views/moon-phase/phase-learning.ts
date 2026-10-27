import { getObservation, SYNODIC_MONTH, TROPICAL_YEAR, type ObservationInput } from './moon-geometry'

export interface DailyMoonInput extends ObservationInput {
  dayOfYear: number
}

export const wrapPhase = (phase: number) => ((phase % 360) + 360) % 360

/** Preserve the shared instant while exploring the surrounding UTC day. */
export function observationAtHour(input: DailyMoonInput, utcHour: number): DailyMoonInput {
  const elapsedDays = (utcHour - input.utcHour) / 24
  return {
    ...input,
    utcHour,
    dayOfYear: ((input.dayOfYear - 1 + elapsedDays) % TROPICAL_YEAR + TROPICAL_YEAR) % TROPICAL_YEAR + 1,
    phase: wrapPhase(input.phase + elapsedDays * 360 / SYNODIC_MONTH),
  }
}

export function buildDailyMoonTrack(input: DailyMoonInput) {
  // Five-minute sampling locates crossings; bisection refines them to under a second.
  const samples = Array.from({ length: 289 }, (_, index) => {
    const hour = index / 12
    return { hour, ...getObservation(observationAtHour(input, hour)) }
  })
  const crossings: { hour: number; kind: 'rise' | 'set' }[] = []
  for (let index = 1; index < samples.length; index += 1) {
    const before = samples[index - 1]!
    const after = samples[index]!
    const rising = before.altitude <= 0 && after.altitude > 0
    const setting = before.altitude > 0 && after.altitude <= 0
    if (!rising && !setting) continue
    let low = before.hour
    let high = after.hour
    for (let iteration = 0; iteration < 14; iteration += 1) {
      const middle = (low + high) / 2
      const above = getObservation(observationAtHour(input, middle)).altitude > 0
      if (above === rising) high = middle
      else low = middle
    }
    crossings.push({ hour: (low + high) / 2, kind: rising ? 'rise' : 'set' })
  }
  const highest = samples.reduce((best, sample) => sample.altitude > best.altitude ? sample : best)
  const allAbove = samples.every(sample => sample.altitude > 0)
  const allBelow = samples.every(sample => sample.altitude <= 0)
  return { samples, crossings, highest, allAbove, allBelow }
}
