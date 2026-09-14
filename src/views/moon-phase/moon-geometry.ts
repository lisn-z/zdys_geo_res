/**
 * Geometry for the Moon-phase teaching model, independent of scene scale.
 * Angles are degrees; longitudes are positive east and phase starts at new Moon.
 * Earth has a 23.44° axial tilt and follows a uniform annual seasonal cycle.
 * The circular lunar orbit lies in the ecliptic; lunar orbital tilt, eccentricity,
 * refraction and the equation of time are deliberately omitted.
 *
 * Phase convention: https://science.nasa.gov/moon/moon-phases/
 * Horizon convention: https://aa.usno.navy.mil/faq/alt_az
 * Earth obliquity: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
 */
export type Vec3 = { x: number; y: number; z: number }

export interface ObservationInput {
  phase: number
  latitude: number
  longitude: number
  utcHour: number
  /** Fractional model day of year; day 80 is the March equinox. */
  dayOfYear?: number
}

export interface EarthFrame {
  /** Terrestrial north pole in the Sun-following world frame; ecliptic north is +Y. */
  axis: Vec3
  /** Equatorial direction of the subsolar meridian (local solar noon). */
  equatorialNoon: Vec3
  /** East tangent at equatorial solar noon. */
  equatorialEast: Vec3
  /** Opposite equatorialEast: third column of the Earth-orientation basis. */
  equatorialZ: Vec3
  /** Solar ecliptic longitude, in degrees from the March equinox, in [0, 360). */
  solarLongitude: number
  /** Solar declination north of the terrestrial equator, in degrees. */
  declination: number
}

export interface Observation {
  up: Vec3
  east: Vec3
  north: Vec3
  moonDirection: Vec3
  sunDirection: Vec3
  altitude: number
  /** Teaching-model visibility uses the Moon's center above 0°, ignoring limb size and refraction. */
  aboveHorizon: boolean
  /** Clockwise from north, in [0, 360). At the zenith/nadir, use 0. */
  azimuth: number
  sunAltitude: number
  /** Local mean solar time, not civil time, in [0, 24). */
  localSolarHour: number
  /** Local screen-up angle from projected celestial north toward screen right. */
  parallacticAngle: number
}

export interface MoonLighting {
  lightX: number
  lightY: number
  lightZ: number
}

export const SYNODIC_MONTH = 29.530588
export const EARTH_OBLIQUITY = 23.44
export const TROPICAL_YEAR = 365.2422
export const VERNAL_EQUINOX_DAY = 80

const DEG = Math.PI / 180
const MOON_DISTANCE = 60.3 // Earth radii; keeps horizon parallax independent of display scale.
const EPSILON = 1e-10

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const wrap = (value: number, period: number) => ((value % period) + period) % period

/** Convert local mean solar time to UTC hours in [0, 24), with longitude positive east. */
export function utcHourFromLocalSolarHour(localSolarHour: number, longitude: number): number {
  return wrap(localSolarHour - longitude / 15, 24)
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z)
const normalize = (v: Vec3): Vec3 => {
  const magnitude = length(v)
  return { x: v.x / magnitude, y: v.y / magnitude, z: v.z / magnitude }
}
const combine = (a: Vec3, scaleA: number, b: Vec3, scaleB: number): Vec3 => ({
  x: a.x * scaleA + b.x * scaleB,
  y: a.y * scaleA + b.y * scaleB,
  z: a.z * scaleA + b.z * scaleB,
})

/**
 * Earth orientation in a frame that follows Earth with the Sun fixed at +X.
 * The axis varies in this rotating frame; its obliquity remains constant.
 * For a globe, use basis (equatorialNoon, axis, equatorialZ), then rotate about
 * its local Y axis by (utcHour - 12) * 15°. The lunar orbit stays in world XZ.
 * The uniform tropical-year cycle is a teaching model, not a dated ephemeris.
 */
export function getEarthFrame(dayOfYear = VERNAL_EQUINOX_DAY): EarthFrame {
  const solarLongitude = wrap((dayOfYear - VERNAL_EQUINOX_DAY) / TROPICAL_YEAR * 360, 360)
  const solarAngle = solarLongitude * DEG
  const tilt = EARTH_OBLIQUITY * DEG
  const axis: Vec3 = {
    x: Math.sin(tilt) * Math.sin(solarAngle),
    y: Math.cos(tilt),
    z: -Math.sin(tilt) * Math.cos(solarAngle),
  }
  const equatorialNoon = normalize(combine({ x: 1, y: 0, z: 0 }, 1, axis, -axis.x))
  const equatorialEast = normalize(cross(axis, equatorialNoon))
  return {
    axis,
    equatorialNoon,
    equatorialEast,
    equatorialZ: { x: -equatorialEast.x, y: -equatorialEast.y, z: -equatorialEast.z },
    solarLongitude,
    declination: Math.asin(clamp(axis.x, -1, 1)) / DEG,
  }
}

/** The projection of local vertical sets the disk orientation seen by an observer. */
function viewingBasis(moonDirection: Vec3, up: Vec3, north: Vec3) {
  let right = cross(moonDirection, up)
  // At zenith/nadir, the vertical has no image-plane projection. Use local north
  // as a deterministic fallback instead of producing a zero vector or NaN.
  if (length(right) < EPSILON) right = cross(moonDirection, north)
  right = normalize(right)
  return { right, screenUp: normalize(cross(right, moonDirection)) }
}

export function getObservation(input: ObservationInput): Observation {
  const frame = getEarthFrame(input.dayOfYear)
  const latitude = clamp(input.latitude, -90, 90) * DEG
  const longitude = wrap(input.longitude + (input.utcHour - 12) * 15, 360) * DEG
  const phase = wrap(input.phase, 360) * DEG
  const cosLat = Math.cos(latitude)
  const sinLat = Math.sin(latitude)
  const cosLon = Math.cos(longitude)
  const sinLon = Math.sin(longitude)
  const equatorialRadial = combine(frame.equatorialNoon, cosLon, frame.equatorialEast, sinLon)
  const up = combine(equatorialRadial, cosLat, frame.axis, sinLat)
  const east = combine(frame.equatorialNoon, -sinLon, frame.equatorialEast, cosLon)
  const north = combine(equatorialRadial, -sinLat, frame.axis, cosLat)
  const moonDirection = normalize({
    x: MOON_DISTANCE * Math.cos(phase) - up.x,
    y: -up.y,
    z: -MOON_DISTANCE * Math.sin(phase) - up.z,
  })
  const sunDirection: Vec3 = { x: 1, y: 0, z: 0 }
  const moonEast = dot(moonDirection, east)
  const moonNorth = dot(moonDirection, north)
  const { screenUp } = viewingBasis(moonDirection, up, north)
  const celestialRight = normalize(cross(moonDirection, frame.axis))
  const celestialUp = normalize(cross(celestialRight, moonDirection))
  const altitude = Math.asin(clamp(dot(moonDirection, up), -1, 1)) / DEG

  return {
    up,
    east,
    north,
    moonDirection,
    sunDirection,
    altitude,
    aboveHorizon: altitude > 0,
    azimuth: Math.hypot(moonEast, moonNorth) < EPSILON
      ? 0
      : wrap(Math.atan2(moonEast, moonNorth) / DEG, 360),
    sunAltitude: Math.asin(clamp(dot(sunDirection, up), -1, 1)) / DEG,
    localSolarHour: wrap(input.utcHour + input.longitude / 15, 24),
    parallacticAngle: Math.atan2(dot(screenUp, celestialRight), dot(screenUp, celestialUp)) / DEG,
  }
}

/**
 * Sun vector for a shaded disk: +X is screen right, +Y screen up and +Z points
 * from the Moon to the observer. A canvas pixel normal (x, y, sqrt(1-x²-y²))
 * is sunlit exactly when its dot product with this vector is positive.
 */
export function getMoonLighting(input: ObservationInput): MoonLighting {
  const observation = getObservation(input)
  const { right, screenUp } = viewingBasis(observation.moonDirection, observation.up, observation.north)
  return {
    lightX: dot(observation.sunDirection, right),
    lightY: dot(observation.sunDirection, screenUp),
    lightZ: -dot(observation.sunDirection, observation.moonDirection),
  }
}

/** Smaller Sun–Earth–Moon angle at Earth, in [0, 180], not accumulated orbital position. */
export function phaseElongation(phase: number): number {
  const angle = wrap(phase, 360)
  return Math.min(angle, 360 - angle)
}

/** Geocentric illuminated fraction, in [0, 1]. */
export function phaseIllumination(phase: number): number {
  return (1 - Math.cos(wrap(phase, 360) * DEG)) / 2
}

/** Principal phases use narrow ±5° windows; intermediate phases retain their shape names. */
export function phaseName(phase: number): string {
  const angle = wrap(phase, 360)
  if (angle < 5 || angle >= 355) return '新月'
  if (angle < 85) return '蛾眉月'
  if (angle < 95) return '上弦月'
  if (angle < 175) return '盈凸月'
  if (angle < 185) return '满月'
  if (angle < 265) return '亏凸月'
  if (angle < 275) return '下弦月'
  return '残月'
}
