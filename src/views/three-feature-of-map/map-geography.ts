import type { Coordinate } from './map-lesson'

const RADIANS = Math.PI / 180
// This is a geographic reference curve, not the imagery's ±85.051° clipping
// boundary. Keep polar selections on the same curve when displayed on a globe.
const FINITE_POLAR_LATITUDE = 90 - 1e-10
const DIRECTION_NAMES = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] as const

export type LongitudeDirection = 'east' | 'west' | 'same' | 'opposite'

/** Compare geographical meridians along their shorter arc, including world copies. */
export function compareLongitudes(fromLongitude: number, toLongitude: number) {
  const rawDifference = toLongitude - fromLongitude
  const eastwardAngle = ((rawDifference % 360) + 360) % 360
  const same = Math.min(eastwardAngle, 360 - eastwardAngle) < 1e-9
  const opposite = Math.abs(eastwardAngle - 180) < 1e-9
  // At 180° the sign only chooses a reproducible line to draw; neither direction
  // is geographically nearer, so readers must use `direction`, not this sign.
  const shortestDelta = same ? 0 : opposite
    ? (rawDifference >= 0 ? 180 : -180)
    : eastwardAngle > 180 ? eastwardAngle - 360 : eastwardAngle
  const direction: LongitudeDirection = same ? 'same' : opposite ? 'opposite' : shortestDelta > 0 ? 'east' : 'west'
  return { direction, shortestDelta, angularSeparation: Math.abs(shortestDelta) }
}

function finiteCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng)
}

/** Finite Mercator northing for reference curves, including a pole limit. */
export function geographicMercatorNorthing(latitude: number): number {
  const clamped = Math.max(-FINITE_POLAR_LATITUDE, Math.min(FINITE_POLAR_LATITUDE, latitude))
  return Math.asinh(Math.tan(clamped * RADIANS))
}

/** At a geographical pole local north/east are not a unique eight-way frame. */
export function hasLocalDirectionFrame(point: Coordinate): boolean {
  return finiteCoordinate(point) && Math.abs(point.lat) < 90
}

function latitudeFromNorthing(northing: number): number {
  return Math.atan(Math.sinh(northing)) / RADIANS
}

/**
 * Sample a straight EPSG:3857 reference line along the shorter longitude arc.
 * Keep longitudes continuous: B may use an equivalent longitude ±360° away
 * from its selected world copy, so crossing the date line does not make a lap.
 * This is a projected straight line, not a great-circle shortest-distance path;
 * both map and globe must use these same coordinates during the transition.
 * A pole has no distinct longitude: approach/depart it on the other endpoint's
 * meridian. For opposite poles use A's meridian as one consistent convention.
 */
export function mapReferencePath(a: Coordinate, b: Coordinate, segments = 128): Coordinate[] {
  if (!finiteCoordinate(a) || !finiteCoordinate(b)) return []
  const count = Number.isFinite(segments) ? Math.max(1, Math.min(4096, Math.floor(segments))) : 128
  const startY = geographicMercatorNorthing(a.lat)
  const endY = geographicMercatorNorthing(b.lat)
  const startIsPole = Math.abs(a.lat) === 90
  const endIsPole = Math.abs(b.lat) === 90
  const startLongitude = startIsPole && !endIsPole ? b.lng : a.lng
  const endLongitude = endIsPole ? startLongitude : startLongitude + compareLongitudes(startLongitude, b.lng).shortestDelta
  const points: Coordinate[] = [{ lat: a.lat, lng: startLongitude }]
  for (let index = 1; index < count; index += 1) {
    const fraction = index / count
    points.push({
      lat: startIsPole && a.lat === b.lat ? a.lat : latitudeFromNorthing(startY * (1 - fraction) + endY * fraction),
      lng: startLongitude * (1 - fraction) + endLongitude * fraction,
    })
  }
  // Preserve selected latitudes exactly, including those Leaflet clamps at
  // projection time. At a pole the displayed meridian is only a path convention.
  points.push({ lat: b.lat, lng: endLongitude })
  return points
}

export type MapDirectionSpoke = { bearing: number; label: string; points: Coordinate[] }

/** Eight north-up map directions, measured in world pixels at the given zoom. */
export function mapDirectionSpokes(origin: Coordinate, radiusPixels: number, zoom: number): MapDirectionSpoke[] {
  if (!hasLocalDirectionFrame(origin) || !Number.isFinite(radiusPixels) || radiusPixels <= 0 || !Number.isFinite(zoom)) return []
  const pixelsPerRadian = 256 * 2 ** zoom / (2 * Math.PI)
  const radius = radiusPixels / pixelsPerRadian
  if (!Number.isFinite(pixelsPerRadian) || pixelsPerRadian <= 0 || !Number.isFinite(radius) || radius <= 0) return []
  const originX = origin.lng * RADIANS
  const originY = geographicMercatorNorthing(origin.lat)
  const spokes: MapDirectionSpoke[] = []
  for (let direction = 0; direction < DIRECTION_NAMES.length; direction += 1) {
    const bearing = direction * 45
    const angle = bearing * RADIANS
    const east = Math.abs(Math.sin(angle)) < 1e-12 ? 0 : Math.sin(angle)
    const north = Math.abs(Math.cos(angle)) < 1e-12 ? 0 : Math.cos(angle)
    const points: Coordinate[] = [{ ...origin }]
    for (let sample = 1; sample <= 16; sample += 1) {
      const offset = radius * sample / 16
      const point = {
        lat: latitudeFromNorthing(originY + north * offset),
        lng: (originX + east * offset) / RADIANS,
      }
      if (!finiteCoordinate(point)) return []
      points.push(point)
    }
    spokes.push({ bearing, label: DIRECTION_NAMES[direction]!, points })
  }
  return spokes
}
