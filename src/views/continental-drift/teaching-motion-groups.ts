import { loadResourceJson } from './resource-loader'
import type { GeoFeature, LonLat } from './tectonic-geometry'

export interface TeachingMotionGroupsSource {
  version: number
  scope: string
  method: string
  source: string
  independentExceptions: number[]
  staticIdZero: string
  byAge: Record<string, Record<string, string>>
  staticByAge: Record<string, Record<string, string>>
  evidence: Array<{
    ageMa: number
    groups: Array<{ family: string; driver: number; members: number[]; staticComponents: number[]; sharedVertexToleranceDegrees: number }>
  }>
}

let source: TeachingMotionGroupsSource | null = null
let pendingLoad: Promise<void> | null = null

/** Share one load per execution context; failed requests remain retryable. */
export function loadTeachingMotionGroups(): Promise<void> {
  if (source) return Promise.resolve()
  if (!pendingLoad) {
    pendingLoad = loadResourceJson<TeachingMotionGroupsSource>('teaching-motion-groups.json')
      .then(value => { source = value })
      .catch(error => { pendingLoad = null; throw error })
  }
  return pendingLoad
}

function loadedSource(): TeachingMotionGroupsSource {
  if (!source) throw new Error('Teaching motion groups have not been loaded')
  return source
}

/** Explicit teaching approximation: preserve the chosen snapshot's connected
 * continental subdivisions. Independent original land blocks keep their model.
 * This changes only animation drivers, never source geometry, UV, or source ID.
 */
export function teachingMotionId(sourceId: string, referenceAge: number): string {
  const exact = loadedSource().byAge[String(referenceAge)]
  return exact?.[sourceId] ?? sourceId
}

/** A global id-0 MultiPolygon must never be attached wholesale to one continent.
 * Keep original polygon coordinates; combine only components with the same
 * explicitly audited teaching driver. Unresolved components remain id 0.
 */
export function teachingFeatures(feature: GeoFeature, referenceAge: number): GeoFeature[] {
  if (String(feature.properties?.plateId ?? feature.id ?? '') !== '0') return [feature]
  const geometry = feature.geometry
  if (!geometry || geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return [feature]
  const drivers = loadedSource().staticByAge[String(referenceAge)]
  if (!drivers) return [feature]
  const polygons = (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as LonLat[][][]
  const groups = new Map<string, LonLat[][][]>()
  polygons.forEach((polygon, index) => {
    const driver = drivers[String(index)] ?? '0'
    if (!groups.has(driver)) groups.set(driver, [])
    groups.get(driver)!.push(polygon)
  })
  return [...groups].map(([driver, coordinates]) => ({
    ...feature,
    properties: { ...feature.properties, teachingMotionId: driver, sourcePlateId: 0 },
    geometry: { type: 'MultiPolygon', coordinates },
  }))
}
