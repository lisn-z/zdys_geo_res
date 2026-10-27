import { loadResourceJson } from './resource-loader'
import type { LonLat } from './tectonic-geometry'

export type PresentGroupId = 'eurasian' | 'american' | 'african' | 'pacific' | 'indian' | 'antarctic' | 'other'
export type BoundaryType = 'divergent' | 'convergent' | 'transform'
export interface PresentGroup {
  id: PresentGroupId
  name: string
  color: string
  description: string
  focus: LonLat
  members: string[]
}

export type PresentPolygonGeometry =
  | { type: 'Polygon'; coordinates: LonLat[][] }
  | { type: 'MultiPolygon'; coordinates: LonLat[][][] }
export type PresentLineGeometry =
  | { type: 'LineString'; coordinates: LonLat[] }
  | { type: 'MultiLineString'; coordinates: LonLat[][] }
export type PresentGeometry = PresentPolygonGeometry | PresentLineGeometry
export interface PresentFeatureProperties {
  id: string
  label: string
  groupId: PresentGroupId
  [key: string]: unknown
}
export interface PresentPlateProperties extends PresentFeatureProperties {
  code: string
  nameEn: string
}
export interface PresentBoundaryProperties extends PresentFeatureProperties {
  type: BoundaryType
  code: string
  plateA: string
  plateB: string
  groupIds: PresentGroupId[]
  stepClass: string
  subductingPlate: string | null
  geometrySource: string
}
export interface PresentFeatureCollection<Properties = PresentFeatureProperties, Geometry = PresentGeometry> {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Properties
    geometry: Geometry
  }>
}
export type PresentPlateCollection = PresentFeatureCollection<PresentPlateProperties, PresentPolygonGeometry>
export type PresentBoundaryCollection = PresentFeatureCollection<PresentBoundaryProperties, PresentLineGeometry>
export interface PresentMotion {
  id: string; label: string; lon: number; lat: number; bearingDeg: number; speedMmYr: number
  referenceFrame: string; plateA: string; plateB: string; groupId: string; sourceStep: number
}
export interface PresentPoint {
  id: string; label: string; lon: number; lat: number; url: string
  mag?: number; depthKm?: number; date?: string; nameEn?: string; setting?: string | null
}
export interface PresentSource {
  name: string
  url: string
  license: string
  detail: string
}
export interface PresentConfig {
  PRESENT_GROUPS: PresentGroup[]
  PRESENT_SOURCES: PresentSource[]
}
export type PresentData = PresentConfig & {
  PRESENT_PLATES: PresentPlateCollection
  PRESENT_BOUNDARIES: PresentBoundaryCollection
}

/** Six teaching groups follow textbook Fig. 3-33; source model IDs stay intact. */
export async function loadPresentData(): Promise<PresentData> {
  const [config, plates, boundaries] = await Promise.all([
    loadResourceJson<PresentConfig>('present-config.json'),
    loadResourceJson<PresentPlateCollection>('present-plates.json'),
    loadResourceJson<PresentBoundaryCollection>('present-boundaries.json'),
  ])
  return { ...config, PRESENT_PLATES: plates, PRESENT_BOUNDARIES: boundaries }
}
