import type { Reading, Sample } from './types'

const TIME_STEP = 1 / 240
const MAX_FRAME_TIME = .25
const MAX_BASE = 2
const MAX_BASE_SPEED = 10
const MAX_BASE_ACCELERATION = 95
const BASE_FREQUENCY = 13
const BASE_DAMPING = 1.1
const MASS_FREQUENCY = 2.4
const MASS_DAMPING = .42
const REVERSAL_DISTANCE = .12
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/**
 * One horizontal degree of freedom, in centimetres and seconds.
 * The supplied pointer/keyboard target drives the base; it is never a waveform.
 * The mass has an absolute position and a weak restoring force to its moving
 * suspension point: m'' = w²(b-m) + 2*zeta*w*(b'-m'). The coefficients describe
 * this classroom apparatus, not earthquake magnitude or a calibrated sensor.
 */
export function createInstrumentPhysics() {
  let base = 0
  let baseVelocity = 0
  let mass = 0
  let massVelocity = 0
  let remainder = 0
  let target = 0

  const reading = (): Reading => ({ base, mass, mark: mass - base })

  function reset() {
    base = baseVelocity = mass = massVelocity = remainder = target = 0
  }

  function step(dt: number, targetBase: number): Reading {
    if (!Number.isFinite(dt) || dt <= 0) return reading()
    if (Number.isFinite(targetBase)) target = clamp(targetBase, -MAX_BASE, MAX_BASE)
    // Discard long tab-suspension gaps; no giant integration step or catch-up loop.
    remainder += Math.min(dt, MAX_FRAME_TIME)
    const steps = Math.floor((remainder + 1e-12) / TIME_STEP)
    remainder = Math.max(0, remainder - steps * TIME_STEP)
    for (let i = 0; i < steps; i++) {
      // A slightly overdamped hand-to-base actuator prevents pointer jumps from
      // teleporting the apparatus or injecting unbounded acceleration.
      const acceleration = clamp(
        BASE_FREQUENCY ** 2 * (target - base) - 2 * BASE_DAMPING * BASE_FREQUENCY * baseVelocity,
        -MAX_BASE_ACCELERATION, MAX_BASE_ACCELERATION,
      )
      baseVelocity = clamp(baseVelocity + acceleration * TIME_STEP, -MAX_BASE_SPEED, MAX_BASE_SPEED)
      base += baseVelocity * TIME_STEP

      const massAcceleration = MASS_FREQUENCY ** 2 * (base - mass)
        + 2 * MASS_DAMPING * MASS_FREQUENCY * (baseVelocity - massVelocity)
      massVelocity += massAcceleration * TIME_STEP
      mass += massVelocity * TIME_STEP
    }
    return reading()
  }

  return { reset, step }
}

/**
 * Amplitudes are maximum absolute displacements from the instrument's rest
 * zero line (cm), not peak-to-peak values. Reversals count base motion only:
 * a direction change must retreat at least 0.12 cm from the running extremum.
 * Small pointer noise and an initial move away from rest are not reversals.
 */
export function summarizeRecord(samples: Sample[]): {
  duration: number; amplitude: number; baseAmplitude: number; reversals: number
} {
  const valid = samples.filter(sample => Number.isFinite(sample.t) && Number.isFinite(sample.base)
    && Number.isFinite(sample.mass) && Number.isFinite(sample.mark)).sort((a, b) => a.t - b.t)
  const first = valid[0]
  const last = valid[valid.length - 1]
  if (!first || !last) return { duration: 0, amplitude: 0, baseAmplitude: 0, reversals: 0 }

  let amplitude = 0
  let baseAmplitude = 0
  let reversals = 0
  let direction = 0
  let extremum = first.base
  let initialLow = extremum
  let initialHigh = extremum
  for (const sample of valid) {
    amplitude = Math.max(amplitude, Math.abs(sample.mark))
    baseAmplitude = Math.max(baseAmplitude, Math.abs(sample.base))
    const displacement = sample.base - extremum
    if (!direction) {
      initialLow = Math.min(initialLow, sample.base)
      initialHigh = Math.max(initialHigh, sample.base)
      if (sample.base - initialLow >= REVERSAL_DISTANCE - 1e-12) direction = 1
      else if (initialHigh - sample.base >= REVERSAL_DISTANCE - 1e-12) direction = -1
      if (direction) {
        extremum = sample.base
      }
    } else if (direction * displacement >= 0) {
      extremum = sample.base
    } else if (Math.abs(displacement) >= REVERSAL_DISTANCE - 1e-12) {
      direction *= -1
      extremum = sample.base
      reversals++
    }
  }
  return { duration: Math.max(0, last.t - first.t), amplitude, baseAmplitude, reversals }
}
