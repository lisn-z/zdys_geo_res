// Textbook sea-level pressure boundaries, not representative bin centers.
// N boundaries partition the full real-valued pressure range into N+1 colors.
export const pressureFillLevels = [996, 1000, 1004, 1008, 1016, 1020, 1024, 1028, 1036] as const
export const pressurePalette = [
  '#f18a1d',
  '#f6aa3a',
  '#f9cc6b',
  '#ffd777',
  '#fffde8',
  '#ddd6f4',
  '#b8a8e7',
  '#a494df',
  '#927bd4',
  '#715ac0',
] as const

const julyFillLevels = [996, 1000, 1008, 1012, 1020, 1024, 1026] as const
const julyPalette = ['#f18a1d', '#f6aa3a', '#ffd777', '#fffde8', '#ddd6f4', '#b8a8e7', '#927bd4', '#715ac0'] as const
const januaryLabelLevels = [996, 1000, 1004, 1008, 1012, 1016, 1020, 1024, 1028, 1036] as const
const julyLabelLevels = [996, 1000, 1004, 1008, 1012, 1020, 1024, 1026] as const

// An interval without an intermediate tick remains one fully colored interval:
// January 1008–1016, July 1000–1008 and 1012–1020 must not be split at midpoints.
export function pressureFillScaleForMonth(month: 1 | 7): { levels: readonly number[]; colors: readonly string[] } {
  return month === 1 ? { levels: pressureFillLevels, colors: pressurePalette }
    : { levels: julyFillLevels, colors: julyPalette }
}

export function pressureScaleForMonth(month: 1 | 7) {
  return pressureFillScaleForMonth(month)
}

export function pressureFillColor(pressure: number, month: 1 | 7) {
  const scale = pressureFillScaleForMonth(month)
  const nextBoundary = scale.levels.findIndex(boundary => pressure < boundary)
  return scale.colors[nextBoundary < 0 ? scale.levels.length : nextBoundary]!
}

// Actual labels are placed on intersections with the sampled pressure field,
// never invented at a textbook location when that value is absent in the data.
export function pressureLabelLevels(month: 1 | 7): readonly number[] {
  return month === 1 ? januaryLabelLevels : julyLabelLevels
}

export const pressureColors = {
  low: pressurePalette[1],
  middle: pressurePalette[4],
  high: pressurePalette[8],
  line: '#fff7df',
  // Preserve the textbook's blue-violet H / rose L distinction, with enough
  // lightness to read against this scene's dark satellite surface.
  highText: '#c8c2f3',
  lowText: '#ed70b1',
}
