import { MathUtils } from 'three'

/** One waterway for both the printed direction arrow and the roaming camera. */
export function chronologyRouteAcross(t: number, periodCount: number): number {
  const along = t * periodCount
  // Ease outward before the Cenozoic, leaving its textbook lettering inside.
  // Keep a single offset for the whole Cenozoic arc. Aquatic illustrations
  // are positioned around this smooth line rather than locally bending it.
  return MathUtils.lerp(-0.85, -0.62, MathUtils.smoothstep(along, 11.60, 12.05))
}
