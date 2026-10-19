import * as THREE from 'three'
import { chronologyRouteAcross } from './chronologyLayout'

export interface SpiralRoamSample {
  position: THREE.Vector3
  target: THREE.Vector3
  index: number
}

/** Pure camera path: no renderer, listeners, timers, textures, or disposal. */
export function createSpiralRoam(
  spiral: (t: number, across?: number, lift?: number) => THREE.Vector3,
  periodCount: number,
): { durationSeconds: number; sample: (progress: number, aspect?: number) => SpiralRoamSample } {
  if (!Number.isInteger(periodCount) || periodCount < 2) throw new RangeError('Spiral roaming needs at least two periods.')
  const startT = 1 / periodCount
  const guideSteps = 240
  const eyeGuides: THREE.Vector3[] = []
  const aimGuides: THREE.Vector3[] = []
  for (let i = 0; i <= guideSteps; i++) {
    const t = THREE.MathUtils.lerp(startT, 1, i / guideSteps)
    // Low flight above the inner-water arrow. The outer land stays beside the
    // camera, rather than between the camera and the sea's organisms.
    const clearance = 1.30 + 0.45 * THREE.MathUtils.smoothstep(t, 0.20, 0.65)
    eyeGuides.push(spiral(t, chronologyRouteAcross(t, periodCount), 0.192 + clearance).clone())
    aimGuides.push(spiral(t, -0.05, 0.88).clone())
  }
  // Smooth the slope change between the small early coils and the broad upper
  // coil. Dense guides keep this curve close to the actual arrow geometry.
  const eyeCurve = new THREE.CatmullRomCurve3(eyeGuides, false, 'centripetal')
  const aimCurve = new THREE.CatmullRomCurve3(aimGuides, false, 'centripetal')
  const arcSteps = 4096
  const points = eyeCurve.getPoints(arcSteps)
  const distances = new Float64Array(arcSteps + 1)
  for (let i = 1; i <= arcSteps; i++) {
    distances[i] = (distances[i - 1] ?? 0) + points[i]!.distanceTo(points[i - 1]!)
  }
  const fullLength = distances[arcSteps] ?? 0
  if (!Number.isFinite(fullLength) || fullLength < 1e-5) throw new RangeError('Spiral roaming path must have a finite nonzero length.')

  function distanceAtParameter(u: number) {
    const scaled = THREE.MathUtils.clamp(u, 0, 1) * arcSteps
    const lower = Math.min(arcSteps - 1, Math.floor(scaled))
    return THREE.MathUtils.lerp(distances[lower]!, distances[lower + 1]!, scaled - lower)
  }

  function parameterAtDistance(distance: number) {
    const clamped = THREE.MathUtils.clamp(distance, 0, fullLength)
    let lower = 0, upper = arcSteps
    while (upper - lower > 1) {
      const middle = (lower + upper) >>> 1
      if (distances[middle]! < clamped) lower = middle
      else upper = middle
    }
    const span = distances[upper]! - distances[lower]!
    const fraction = span > 1e-9 ? (clamped - distances[lower]!) / span : 0
    return (lower + fraction) / arcSteps
  }

  const finalPeriodStart = ((periodCount - 1) / periodCount - startT) / (1 - startT)
  const finalPeriodLength = fullLength - distanceAtParameter(finalPeriodStart)
  // Finish inside the Quaternary with its latter half still ahead. Continuing
  // to the literal ribbon tip would leave only empty space in the forward view.
  const endMargin = Math.min(finalPeriodLength * 0.62, Math.max(2.5, finalPeriodLength * 0.52))
  const travelLength = fullLength - endMargin

  return {
    durationSeconds: 120,
    sample(progress, aspect = 16 / 9) {
      const p = THREE.MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1)
      // Constant arc speed for the first 94%; only the final 7.2 seconds ease
      // to rest. The integrated smoothstep keeps acceleration continuous.
      const settleStart = 0.94
      const settleSpan = 1 - settleStart
      const normalization = settleStart + settleSpan * 0.5
      const u = THREE.MathUtils.clamp((p - settleStart) / settleSpan, 0, 1)
      const travelled = p <= settleStart ? p : settleStart + settleSpan * (u - u ** 3 + 0.5 * u ** 4)
      const distance = travelLength * travelled / normalization
      const parameter = parameterAtDistance(distance)
      const position = eyeCurve.getPoint(parameter)

      // Shorter look-ahead on the tight early coils avoids looking across the
      // centre of the helix. Straightening later sections naturally see farther.
      const before = eyeCurve.getPoint(parameterAtDistance(Math.max(0, distance - 0.4)))
      const after = eyeCurve.getPoint(parameterAtDistance(Math.min(fullLength, distance + 0.4)))
      const tangent = after.clone().sub(before).setY(0).normalize()
      const t = THREE.MathUtils.lerp(startT, 1, parameter)
      const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9
      const viewportFactor = 0.9 + 0.1 * THREE.MathUtils.smoothstep(safeAspect, 0.5, 1.4)
      const desiredLead = (1.9 + 3.5 * THREE.MathUtils.smoothstep(t, 0.20, 0.65)) * viewportFactor
      const remaining = fullLength - distance
      let lead = desiredLead * (1 - Math.exp(-remaining / desiredLead))
      let target = aimCurve.getPoint(parameterAtDistance(distance + lead))
      // Keep the gaze forward even if a future spiral variant bends unusually
      // sharply. This changes only look-ahead, never the constant-speed eye path.
      for (let attempt = 0; attempt < 5 && target.clone().sub(position).dot(tangent) <= 0.15; attempt++) {
        lead *= 0.72
        target = aimCurve.getPoint(parameterAtDistance(distance + lead))
      }
      if (target.clone().sub(position).dot(tangent) <= 0.15) {
        target = position.clone().addScaledVector(tangent, 1.7)
        target.y -= 0.35
      }
      return { position, target, index: Math.min(periodCount - 1, Math.floor(t * periodCount + 1e-8)) }
    },
  }
}
