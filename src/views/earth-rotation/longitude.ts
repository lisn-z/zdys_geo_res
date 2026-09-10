export type LongitudeDirection = 'east' | 'west' | 'same' | 'opposite'

/** Direction is along the shorter longitude arc, not the ordering of signed longitude numbers. */
export function compareLongitudes(fromLongitude: number, toLongitude: number) {
  const rawDifference = toLongitude - fromLongitude
  const eastwardAngle = ((rawDifference % 360) + 360) % 360
  const same = Math.min(eastwardAngle, 360 - eastwardAngle) < 1e-9
  const opposite = Math.abs(eastwardAngle - 180) < 1e-9
  const shortestDelta = same ? 0 : opposite
    ? (rawDifference >= 0 ? 180 : -180)
    : eastwardAngle > 180 ? eastwardAngle - 360 : eastwardAngle
  const direction: LongitudeDirection = same ? 'same' : opposite ? 'opposite' : shortestDelta > 0 ? 'east' : 'west'
  return {
    direction,
    shortestDelta,
    angularSeparation: Math.abs(shortestDelta),
    // A geographical direction and a dated local-time difference are different quantities.
    signedTimeDifference: rawDifference / 15,
    dateLineCorrectionDays: Math.round((rawDifference - shortestDelta) / 360),
  }
}

export function describeLongitudeDirection(fromLongitude: number, toLongitude: number) {
  switch (compareLongitudes(fromLongitude, toLongitude).direction) {
    case 'east': return 'B 在 A 东侧'
    case 'west': return 'B 在 A 西侧'
    case 'same': return 'A / B 同经线'
    case 'opposite': return '相差 180°，东西等距'
  }
}
