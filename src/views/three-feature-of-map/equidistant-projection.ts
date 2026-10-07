import type { Coordinate } from './map-lesson'

/** Match Leaflet's CRS.Earth.R and spherical LatLng.distanceTo model. */
export const EARTH_RADIUS_METERS = 6_371_000
export const MAX_EQUIDISTANT_RADIUS_METERS = Math.PI * EARTH_RADIUS_METERS

const RAD = Math.PI / 180
const COINCIDENT_TOLERANCE = 1e-15
const ANTIPODAL_TOLERANCE = 1e-12
type Vector = readonly [number, number, number]

export interface EquidistantPoint {
  /** East and north coordinates in real metres, not display pixels. */
  x: number
  y: number
  distanceMeters: number
  /** Initial azimuth clockwise from the origin's local north. */
  bearing: number | null
  /** The antipode has no unique azimuth and maps to the disk's entire rim. */
  antipodal: boolean
}

export interface GreatCircleSample extends Coordinate {
  distanceMeters: number
}

export interface GreatCircleSamples {
  points: GreatCircleSample[]
  distanceMeters: number
  antipodal: boolean
}

function wrapLongitude(longitude: number) {
  return ((longitude + 180) % 360 + 360) % 360 - 180
}

function checkCoordinate(point: Coordinate) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat) > 90) {
    throw new RangeError('A geographic coordinate needs a finite longitude and a latitude between -90° and 90°.')
  }
}

function unitVector(point: Coordinate): Vector {
  const latitude = point.lat * RAD
  const longitude = wrapLongitude(point.lng) * RAD
  // The exact poles have no longitude-dependent position.
  const radius = Math.abs(point.lat) === 90 ? 0 : Math.cos(latitude)
  return [radius * Math.cos(longitude), radius * Math.sin(longitude), Math.sin(latitude)]
}

function localFrame(origin: Coordinate) {
  const latitude = origin.lat * RAD
  const longitude = wrapLongitude(origin.lng) * RAD
  const east: Vector = [-Math.sin(longitude), Math.cos(longitude), 0]
  const north: Vector = [-Math.sin(latitude) * Math.cos(longitude), -Math.sin(latitude) * Math.sin(longitude), Math.cos(latitude)]
  return { east, north }
}

function dot(a: Vector, b: Vector) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function relationship(origin: Coordinate, point: Coordinate) {
  checkCoordinate(origin)
  checkCoordinate(point)
  const a = unitVector(origin)
  const b = unitVector(point)
  const chord = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const oppositeChord = Math.hypot(a[0] + b[0], a[1] + b[1], a[2] + b[2])
  // Equivalent to the spherical haversine distance. The two chord lengths
  // avoid loss of precision for very short and almost-antipodal distances.
  const angle = 2 * Math.atan2(chord, oppositeChord)
  return { a, b, angle, coincident: chord <= COINCIDENT_TOLERANCE, antipodal: oppositeChord <= ANTIPODAL_TOLERANCE }
}

/** Great-circle surface distance in the same spherical model as Leaflet. */
export function sphericalDistance(a: Coordinate, b: Coordinate): number {
  return relationship(a, b).angle * EARTH_RADIUS_METERS
}

export const haversineDistance = sphericalDistance

/** At a pole the origin's longitude defines its meridian reference frame. */
export function initialBearing(origin: Coordinate, point: Coordinate): number | null {
  const relation = relationship(origin, point)
  if (relation.coincident || relation.antipodal) return null
  const frame = localFrame(origin)
  return (Math.atan2(dot(relation.b, frame.east), dot(relation.b, frame.north)) / RAD + 360) % 360
}

/**
 * Spherical azimuthal equidistant projection centred on origin.
 * Every origin-to-point radius equals its true great-circle distance. This
 * does NOT preserve distances between arbitrary pairs away from the origin.
 * For the non-unique antipode, return a canonical northward rim point and flag
 * it; callers must not present that arbitrary azimuth as a unique direction.
 */
export function projectEquidistant(origin: Coordinate, point: Coordinate): EquidistantPoint {
  const relation = relationship(origin, point)
  const distanceMeters = relation.angle * EARTH_RADIUS_METERS
  if (relation.coincident) return { x: 0, y: 0, distanceMeters, bearing: null, antipodal: false }
  if (relation.antipodal) return { x: 0, y: distanceMeters, distanceMeters, bearing: null, antipodal: true }
  const frame = localFrame(origin)
  const east = dot(relation.b, frame.east)
  const north = dot(relation.b, frame.north)
  const norm = Math.hypot(east, north)
  return {
    x: distanceMeters * east / norm,
    y: distanceMeters * north / norm,
    distanceMeters,
    bearing: (Math.atan2(east, north) / RAD + 360) % 360,
    antipodal: false,
  }
}

/** Inverse AEQD, accepting the closed disk whose radius is half Earth's circumference. */
export function unprojectEquidistant(origin: Coordinate, point: { x: number; y: number }): Coordinate {
  checkCoordinate(origin)
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new RangeError('Projected coordinates must be finite metres.')
  const distance = Math.hypot(point.x, point.y)
  const angle = distance / EARTH_RADIUS_METERS
  if (angle > Math.PI + ANTIPODAL_TOLERANCE) throw new RangeError('The point lies outside the azimuthal equidistant disk.')
  if (distance === 0) return { lat: origin.lat, lng: wrapLongitude(origin.lng) }
  if (Math.abs(angle - Math.PI) <= ANTIPODAL_TOLERANCE) return { lat: -origin.lat, lng: wrapLongitude(origin.lng + 180) }
  const start = unitVector(origin)
  const frame = localFrame(origin)
  const east = point.x / distance
  const north = point.y / distance
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const vector = start.map((value, index) => value * cosine + (frame.east[index]! * east + frame.north[index]! * north) * sine)
  const horizontal = Math.hypot(vector[0]!, vector[1]!)
  return {
    lat: Math.atan2(vector[2]!, horizontal) / RAD,
    lng: horizontal < COINCIDENT_TOLERANCE ? wrapLongitude(origin.lng) : wrapLongitude(Math.atan2(vector[1]!, vector[0]!) / RAD),
  }
}

/**
 * Sample the shortest surface route at exact real-distance intervals, with a
 * final remainder segment. No projected pixel length enters the calculation.
 * An antipodal route uses a canonical northward meridian and is flagged.
 */
export function sampleGreatCircle(a: Coordinate, b: Coordinate, stepMeters: number): GreatCircleSamples {
  if (!Number.isFinite(stepMeters) || stepMeters <= 0) throw new RangeError('The sampling interval must be positive metres.')
  const target = projectEquidistant(a, b)
  const segmentCount = Math.ceil(target.distanceMeters / stepMeters)
  if (segmentCount > 20_000) throw new RangeError('Choose a larger interval; a route may contain at most 20,000 segments.')
  const points: GreatCircleSample[] = [{ ...a, distanceMeters: 0 }]
  if (target.distanceMeters <= COINCIDENT_TOLERANCE * EARTH_RADIUS_METERS) {
    return { points, distanceMeters: target.distanceMeters, antipodal: false }
  }
  for (let index = 1; index < segmentCount; index += 1) {
    const distanceMeters = index * stepMeters
    const fraction = distanceMeters / target.distanceMeters
    const point = unprojectEquidistant(a, { x: target.x * fraction, y: target.y * fraction })
    points.push({ ...point, distanceMeters })
  }
  points.push({ ...b, distanceMeters: target.distanceMeters })
  return { points, distanceMeters: target.distanceMeters, antipodal: target.antipodal }
}
