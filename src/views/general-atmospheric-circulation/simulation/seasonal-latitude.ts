/** Degrees throughout: keep the teaching belts together, taper only near poles. */
export const SEASONAL_TAPER_START = 70
const POLE = 90
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function shiftSeasonalLatitude(latitude: number, shift: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(shift)) {
    throw new RangeError('Seasonal latitude and displacement must be finite')
  }
  const base = clamp(latitude, -POLE, POLE)
  const t = clamp((Math.abs(base) - SEASONAL_TAPER_START) / (POLE - SEASONAL_TAPER_START), 0, 1)
  const taper = 1 - t * t * (3 - 2 * t)
  return clamp(base + shift * taper, -POLE, POLE)
}

/** Same degree-based transform for pressure surfaces, winds and 3D cell meshes. */
export const seasonalLatitudeGLSL = `
float shiftSeasonalLatitude(float latitude, float displacement) {
  float base = clamp(latitude, -${POLE.toFixed(1)}, ${POLE.toFixed(1)});
  float taper = 1.0 - smoothstep(${SEASONAL_TAPER_START.toFixed(1)}, ${POLE.toFixed(1)}, abs(base));
  return clamp(base + displacement * taper, -${POLE.toFixed(1)}, ${POLE.toFixed(1)});
}
`
