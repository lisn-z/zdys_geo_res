/** Teaching maximum: 23 degrees 26 arcminutes, not 23.26 decimal degrees. */
export const MAX_OBLIQUITY_MINUTES = 23 * 60 + 26
export const MAX_OBLIQUITY_DEGREES = MAX_OBLIQUITY_MINUTES / 60

export function formatDegreesMinutes(degrees: number) {
  const totalMinutes = Math.round(Math.abs(degrees) * 60)
  const sign = degrees < 0 && totalMinutes > 0 ? '−' : ''
  return `${sign}${Math.floor(totalMinutes / 60)}°${String(totalMinutes % 60).padStart(2, '0')}′`
}

export function formatLatitudeDegreesMinutes(latitude: number) {
  const angle = formatDegreesMinutes(Math.abs(latitude))
  // Omit the hemisphere when the displayed angle rounds to zero, including at the equinoxes.
  const hemisphere = Math.round(Math.abs(latitude) * 60) === 0 ? '' : latitude > 0 ? 'N' : 'S'
  return `${angle}${hemisphere}`
}

export function formatLongitudeDegreesMinutes(longitude: number) {
  const angle = formatDegreesMinutes(Math.abs(longitude))
  const hemisphere = Math.round(Math.abs(longitude) * 60) === 0 ? '' : longitude > 0 ? 'E' : 'W'
  return `${angle}${hemisphere}`
}

export function formatSignedDegreesMinutes(degrees: number) {
  const angle = formatDegreesMinutes(Math.abs(degrees))
  const sign = Math.round(Math.abs(degrees) * 60) === 0 ? '' : degrees < 0 ? '−' : '+'
  return `${sign}${angle}`
}
