import type { Coordinate, FeatureKind } from './map-lesson'

export type CampusFeature = {
  id: number
  kind: FeatureKind
  name: string
  points: Coordinate[]
}

export type CampusPoint = { x: number; z: number }
export type ProjectedCampusFeature = Omit<CampusFeature, 'points'> & {
  points: CampusPoint[]
  center: CampusPoint
}
export type CampusLayout = {
  origin: Coordinate
  metresPerUnit: number
  radius: number
  features: ProjectedCampusFeature[]
}

export const campusBuildingKinds: readonly FeatureKind[] = [
  'teaching-building', 'laboratory', 'administration', 'dormitory',
  'gymnasium', 'library', 'canteen', 'toilet', 'infirmary',
]

export function isCampusBuilding(kind: FeatureKind): boolean {
  return campusBuildingKinds.includes(kind)
}

const earthRadiusMetres = 6371008.8
const radians = Math.PI / 180
const baseRadius = 100
const contentRadius = 78

function wrapLongitude(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180
}

function isValidCoordinate(point: Coordinate): boolean {
  return Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng)
}

// Find the smallest longitude arc containing the drawing, including drawings at 180°.
function longitudeMidpoint(points: readonly Coordinate[]): number {
  const longitudes = points.map(point => wrapLongitude(point.lng)).sort((a, b) => a - b)
  let largestGap = -1
  let arcStart = longitudes[0]!
  let arcLength = 0
  for (let index = 0; index < longitudes.length; index++) {
    const left = longitudes[index]!
    const right = index + 1 < longitudes.length ? longitudes[index + 1]! : longitudes[0]! + 360
    const gap = right - left
    if (gap > largestGap) {
      largestGap = gap
      arcStart = right
      arcLength = 360 - gap
    }
  }
  return wrapLongitude(arcStart + arcLength / 2)
}

/**
 * Campus-scale equirectangular projection: east is +X, north is -Z, and Y is up.
 * One shared scale fits the drawing onto the circular base without rotating it.
 * This is a schematic local model; terrain and building heights are not surveyed.
 */
export function createCampusLayout(
  features: readonly CampusFeature[],
  fallbackCenter: Coordinate,
): CampusLayout {
  const usableFeatures = features.map(feature => ({
    ...feature,
    points: feature.points.filter(isValidCoordinate),
  })).filter(feature => feature.points.length > 0)
  const coordinates = usableFeatures.flatMap(feature => feature.points)
  if (coordinates.length === 0) {
    const origin = isValidCoordinate(fallbackCenter)
      ? { lat: fallbackCenter.lat, lng: wrapLongitude(fallbackCenter.lng) }
      : { lat: 0, lng: 0 }
    return { origin, metresPerUnit: 1, radius: baseRadius, features: [] }
  }

  let minLatitude = Infinity
  let maxLatitude = -Infinity
  for (const coordinate of coordinates) {
    minLatitude = Math.min(minLatitude, coordinate.lat)
    maxLatitude = Math.max(maxLatitude, coordinate.lat)
  }
  const origin = {
    lat: (minLatitude + maxLatitude) / 2,
    lng: longitudeMidpoint(coordinates),
  }
  const eastMetresPerDegree = earthRadiusMetres * radians * Math.cos(origin.lat * radians)
  const northMetresPerDegree = earthRadiusMetres * radians
  let furthestMetres = 0
  const projected = usableFeatures.map(feature => {
    const points = feature.points.map(point => {
      const position = {
        x: wrapLongitude(wrapLongitude(point.lng) - origin.lng) * eastMetresPerDegree,
        z: -(point.lat - origin.lat) * northMetresPerDegree,
      }
      furthestMetres = Math.max(furthestMetres, Math.hypot(position.x, position.z))
      return position
    })
    return { ...feature, points }
  })
  // A lone point or tiny sketch must not become an enormous building footprint.
  const metresPerUnit = Math.max(1, furthestMetres / contentRadius)
  return {
    origin,
    metresPerUnit,
    radius: baseRadius,
    features: projected.map(feature => {
      let minX = Infinity
      let maxX = -Infinity
      let minZ = Infinity
      let maxZ = -Infinity
      const points = feature.points.map(point => {
        const position = { x: point.x / metresPerUnit, z: point.z / metresPerUnit }
        minX = Math.min(minX, position.x)
        maxX = Math.max(maxX, position.x)
        minZ = Math.min(minZ, position.z)
        maxZ = Math.max(maxZ, position.z)
        return position
      })
      return { ...feature, points, center: { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 } }
    }),
  }
}
