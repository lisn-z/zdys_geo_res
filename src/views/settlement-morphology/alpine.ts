import type { Placement, SiteResult } from './types'

/**
 * Interpreted from textbook p.120, fig.5-21: an open, inhabited valley beneath
 * continuous green mountainsides, with a larger slope on the right. This is a
 * teaching landscape rather than a reconstruction of the photographed village.
 */
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const smooth = (low: number, high: number, value: number) => {
  const t = clamp((value - low) / (high - low), 0, 1)
  return t * t * (3 - 2 * t)
}
const hash = (a: number, b: number) => {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return value - Math.floor(value)
}

/** The valley gently bends and opens toward the foreground; it is not a V extruded along z. */
export function alpineValleyAxis(z: number): number {
  return -0.7 + Math.sin((z + 2) * 0.13) * 1.1 + Math.sin(z * 0.28) * 0.24
}

export function alpineValleyWidths(z: number): { left: number; right: number } {
  return {
    left: 4.25 + smooth(-10, 9, z) * 1.0 + Math.cos(z * 0.19) * 0.2,
    right: 4.7 + smooth(-8, 10, z) * 0.65 + Math.cos(z * 0.17 + 0.4) * 0.28,
  }
}

export function alpineHeight(x: number, z: number): number {
  const axis = alpineValleyAxis(z)
  const widths = alpineValleyWidths(z)
  const floor = 0.54 + z * 0.0012 + Math.sin(z * 0.16) * 0.017 + Math.sin(x * 0.37 + z * 0.21) * 0.008
  const rightSide = x >= axis
  const distance = rightSide ? x - axis : axis - x
  const floorWidth = rightSide ? widths.right : widths.left
  const outerWidth = rightSide ? 18 - axis - floorWidth : 18 + axis - floorWidth
  const rise = smooth(0, 1, (distance - floorWidth) / outerWidth)
  if (rise <= 0) return floor

  // Broad ridges continue beyond the cut block; low-frequency shoulders avoid
  // the repeated cones / isolated sharp humps of a height-noise mountain field.
  const ridge = rightSide
    ? 4.25 + Math.sin(z * 0.12 + 0.6) * 0.45 + Math.cos(z * 0.29 - 1) * 0.22
    : 3.4 + Math.sin(z * 0.13 - 1.1) * 0.4 + Math.cos(z * 0.21 + 0.7) * 0.32
  const shoulder = Math.sin(z * 0.22 + distance * 0.16 + (rightSide ? 0.5 : 2.1)) * 0.16
    + Math.sin(z * 0.43 - distance * 0.22) * 0.075
  const drainage = Math.sin(z * 0.39 + distance * 0.28) * 0.09
    + Math.sin(z * 0.74 - distance * 0.31) * 0.035
  return floor + Math.pow(rise, 0.92) * (ridge + shoulder) + drainage * rise * (1 - rise) * 2
}

export function alpineRoadX(z: number): number {
  return alpineValleyAxis(z) + 0.4 + Math.sin(z * 0.22 + 0.6) * 0.46
}

/** Shared masks keep the meadow colour and grouped forest planting in agreement. */
export function alpineSurfaceWeights(x: number, z: number): { woodland: number; rock: number } {
  const h = alpineHeight(x, z)
  const woodlandPattern = 0.5 + Math.sin(x * 0.35 + z * 0.19) * 0.23
    + Math.sin(x * 0.19 - z * 0.34 + 1.1) * 0.19 + Math.cos(x * 0.54 + z * 0.09) * 0.09
  const woodland = smooth(0.37, 0.66, woodlandPattern) * smooth(0.95, 1.9, h)
    * (1 - smooth(4.65, 5.75, h) * 0.45)
  // The reference is overwhelmingly green. Rocky highlights are restrained and
  // confined to the upper ridge, rather than covering every non-buildable slope.
  const rock = smooth(4.9, 5.8, h) * smooth(0.55, 0.84, woodlandPattern) * 0.16
  return { woodland, rock }
}

export function alpineTreeSuitable(x: number, z: number): boolean {
  const h = alpineHeight(x, z)
  return h > 1.05 && h < 5.55 && alpineSurfaceWeights(x, z).woodland > 0.43
}

/**
 * Observation examples use continuous coordinates instead of the editing grid:
 * a gently curving road and irregular, separated groups of mountain houses.
 * `site` remains the authoritative foundation/water/edge check in landscape.ts.
 */
export function createAlpineSamples(site: (x: number, z: number) => SiteResult): Placement[] {
  const roads: Placement[] = []
  for (let index = 0; index <= 14; index++) {
    const z = -10.15 + index * 1.45
    const x = alpineRoadX(z)
    if (!site(x, z).valid) continue
    const tangent = (alpineRoadX(z + .1) - alpineRoadX(z - .1)) / .2
    roads.push({ id: `sample-valley-road-${index}`, kind: 'road', x, z, rotation: Math.atan(tangent) })
  }
  const houses: Placement[] = []
  for (let attempt = 0; attempt < 2400 && houses.length < 38; attempt++) {
    const z = -9.8 + hash(attempt, 7) * 19.6
    const side = hash(attempt, 11) > 0.48 ? 1 : -1
    const distance = 2.0 + hash(attempt, 13) * 2.2
    const x = alpineRoadX(z) + side * distance
    // A denser middle village with smaller groups farther up the valley.
    const density = 0.46 + Math.exp(-(((z - 1.1) / 4.3) ** 2)) * 0.48
    if (hash(attempt, 17) > density || !site(x, z).valid) continue
    if (roads.some(road => Math.hypot(x - road.x, z - road.z) < 2.1)) continue
    if (houses.some(house => Math.hypot(x - house.x, z - house.z) < 1.68)) continue
    const rotation = (side < 0 ? Math.PI / 2 : -Math.PI / 2) + (hash(attempt, 23) - .5) * .3
    houses.push({ id: `sample-valley-house-${houses.length}`, kind: 'house', x, z, rotation })
  }
  houses.sort((a, b) => Math.abs(a.z - 1.1) - Math.abs(b.z - 1.1))
  return [...roads, ...houses]
}
