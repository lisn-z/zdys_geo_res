import * as THREE from 'three'

const VERTICAL_COMPLETE = .35
const SAMPLE_COUNT = 2048
const JOIN_FRACTION = .06
const wrap = (u: number) => THREE.MathUtils.euclideanModulo(u, 1)
const ease = (u: number) => THREE.MathUtils.smoothstep(u, 0, 1)

/**
 * Arrival time of each point while a cell is constructed for teaching.
 * Input order is lower branch → ascent → upper branch → descent → lower branch.
 * Vertical branches start together and reach their ends by progress .35; the
 * horizontal branches then connect the circuit. The animation along that circuit
 * must continue to use the original u, never this formation attribute.
 *
 * A tiny receiving join on each horizontal branch blends back to the already
 * present vertical origin. Without it, an arrival field cannot be both continuous
 * and assign time 0 to a vertical origin adjacent to a time-1 horizontal endpoint.
 * Only that short join may be visible early; the horizontal branch as a whole
 * connects after the vertical motions. This is construction order, not parcel age.
 */
export function createCirculationFormation(curve: THREE.Curve<THREE.Vector3>): (u: number) => number {
  const radii = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => curve.getPointAt(i / SAMPLE_COUNT).length())
  const minRadius = Math.min(...radii), maxRadius = Math.max(...radii)
  const heightRange = maxRadius - minRadius
  // A flat or malformed curve has no meaningful vertical sequence. Keep its
  // reveal finite and conservative rather than inventing an ascent/descent.
  if (!Number.isFinite(heightRange) || heightRange < 1e-7) return () => 1
  const heights = radii.map(radius => (radius - minRadius) / heightRange)

  const firstCrossing = (level: number) => {
    const index = heights.findIndex(value => value > level)
    if (index <= 0) return 0
    const before = heights[index - 1]!, after = heights[index]!
    return (index - 1 + (level - before) / (after - before)) / SAMPLE_COUNT
  }
  const lastCrossing = (level: number) => {
    let index = heights.length - 1
    while (index >= 0 && heights[index]! <= level) index--
    if (index < 0) return 0
    if (index >= SAMPLE_COUNT) return 1
    const before = heights[index]!, after = heights[index + 1]!
    return (index + (level - before) / (after - before)) / SAMPLE_COUNT
  }

  const riseStart = firstCrossing(.02)
  const upperStart = firstCrossing(.98)
  const sinkStart = lastCrossing(.98)
  const lowerStart = lastCrossing(.02)
  if (!(riseStart < upperStart && upperStart < sinkStart && sinkStart < lowerStart)) return () => 1

  const horizontalArrival = (progress: number) => {
    if (progress <= 1 - JOIN_FRACTION) {
      return VERTICAL_COMPLETE + (1 - VERTICAL_COMPLETE) * ease(progress / (1 - JOIN_FRACTION))
    }
    return 1 - ease((progress - (1 - JOIN_FRACTION)) / JOIN_FRACTION)
  }

  return (u: number) => {
    if (!Number.isFinite(u)) return 1
    const phase = wrap(u)
    if (phase >= riseStart && phase < upperStart) {
      return VERTICAL_COMPLETE * ease((phase - riseStart) / (upperStart - riseStart))
    }
    if (phase >= upperStart && phase < sinkStart) {
      return horizontalArrival((phase - upperStart) / (sinkStart - upperStart))
    }
    if (phase >= sinkStart && phase < lowerStart) {
      return VERTICAL_COMPLETE * ease((phase - sinkStart) / (lowerStart - sinkStart))
    }
    // Lower branch crosses the 1/0 seam; unwrap it rather than restarting there.
    const distance = phase >= lowerStart ? phase - lowerStart : phase + 1 - lowerStart
    return horizontalArrival(distance / (1 - lowerStart + riseStart))
  }
}
