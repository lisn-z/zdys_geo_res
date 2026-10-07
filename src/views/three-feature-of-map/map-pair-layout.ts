/** Whole-world shifts that keep an overlay visible on Leaflet's wrapped map.
 * Routes and their endpoint markers share these copies without a long line
 * crossing the map when the short longitude arc crosses 180°.
 */
export function visibleWorldOffsets(longitudes: readonly number[], west: number, east: number): number[] {
  if (!longitudes.length || ![...longitudes, west, east].every(Number.isFinite) || west > east) return []
  const minimum = Math.min(...longitudes)
  const maximum = Math.max(...longitudes)
  const first = Math.ceil((west - maximum) / 360)
  const last = Math.floor((east - minimum) / 360)
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return []
  // Even a malformed viewport must not create unbounded overlay layers.
  const middle = Math.round((west / 2 + east / 2 - minimum / 2 - maximum / 2) / 360)
  if (!Number.isSafeInteger(middle)) return []
  const offsets: number[] = []
  for (let copy = Math.max(first, middle - 16); copy <= Math.min(last, middle + 16); copy++) offsets.push(copy * 360)
  return offsets
}
