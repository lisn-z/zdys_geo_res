import { loadResourceJson } from './resource-loader'
import type { LonLat } from './tectonic-geometry'

export type TextbookGroupId = 'eurasian' | 'american' | 'african' | 'pacific' | 'indian' | 'antarctic'
export interface TextbookLabel {
  id: string; groupId: TextbookGroupId; name: string; lon: number; lat: number
  rotationDeg: number; writingMode: 'horizontal' | 'vertical'; letterSpacingDeg: number
  /** Optional per-character anchors keep curved names inside their teaching plate group. */
  glyphCenters?: LonLat[]
}
export interface TextbookMotionPair {
  id: string; lon: number; lat: number; bearingDeg: number
  type: 'divergent' | 'convergent'; lengthDeg: number; sourceRegion: string
}
export type TextbookBeltType = 'pacific' | 'alpide' | 'atlantic'
export interface TextbookBeltLegendItem {
  id: string
  type: TextbookBeltType
  name: string
  color: string
}
export interface TextbookBeltProperties extends TextbookBeltLegendItem {
  teachingSchematic: boolean
  basis: string
  revision: string
}
export interface TextbookBeltCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: TextbookBeltProperties
    geometry: { type: 'MultiPolygon'; coordinates: LonLat[][][] }
  }>
}
export interface TextbookVolcano {
  id: string
  label: string
  nameEn: string
  lon: number
  lat: number
  url: string
  setting: string | null
  symbol: string
  selectionNote: string
}
export type PublicSeismicityEvent = [id: string, lon: number, lat: number, depthKm: number, mag: number, timeUtc: string, magType: string]
export interface PublicSeismicityCatalog {
  metadata: {
    title: string
    source: string
    sourceUrl: string
    downloadedAt: string
    startInclusive: string
    endExclusive: string
    minMagnitude: number
    eventType: string
    count: number
    columns: string[]
    license: string
    licenseUrl: string
    interpretation: string
    downloads: Array<{ url: string; file: string; bytes: number; rows: number; sha256: string }>
  }
  events: PublicSeismicityEvent[]
}
export interface TextbookSeismicityPoint {
  lon: number
  lat: number
}
export interface TextbookQuake extends TextbookSeismicityPoint {
  id: string
  depthKm: number
  mag: number
  date: string
  magType: string
  label: string
  url: string
  color: string
  magnitudeBand: string
}
export interface TextbookPresentNotes {
  model: string
  modelNote: string
  arrowNote: string
  beltNote: string
  volcanoNote: string
  seismicityLabel: string
  seismicityNote: string
  quakeLabel: string
  quakeNote: string
}
export interface TextbookConfig {
  TEXTBOOK_PLATE_GROUPS: Record<string, TextbookGroupId>
  TEXTBOOK_LABELS: TextbookLabel[]
  TEXTBOOK_MOTION_PAIRS: TextbookMotionPair[]
  TEXTBOOK_BELT_LEGEND: TextbookBeltLegendItem[]
  TEXTBOOK_PRESENT_NOTES: TextbookPresentNotes
}
export type TextbookData = TextbookConfig & {
  TEXTBOOK_BELTS: TextbookBeltCollection
  TEXTBOOK_VOLCANOES: TextbookVolcano[]
  TEXTBOOK_SEISMICITY: TextbookSeismicityPoint[]
  TEXTBOOK_QUAKES: TextbookQuake[]
}

export async function loadTextbookData(): Promise<TextbookData> {
  const [config, belts, volcanoes, publicSeismicity] = await Promise.all([
    loadResourceJson<TextbookConfig>('textbook-present-config.json'),
    loadResourceJson<TextbookBeltCollection>('textbook-belts.json'),
    loadResourceJson<TextbookVolcano[]>('textbook-volcanoes.json'),
    loadResourceJson<PublicSeismicityCatalog>('public-seismicity-1976-2024.json'),
  ])
  const historicalEvents = publicSeismicity.events
  // One shared static catalog: the point cloud and strong-event symbols use the same window.
  const seismicity = historicalEvents.map(event => ({ lon: event[1], lat: event[2] }))
  const quakes = historicalEvents.filter(event => event[4] >= 7).map(([id, lon, lat, depthKm, mag, date, magType]) => ({
    id, lon, lat, depthKm, mag, date, magType,
    label: `M${mag.toFixed(1)} · ${date.slice(0, 10)}`,
    url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
    color: mag >= 8 ? '#c5473b' : '#699e40', magnitudeBand: mag >= 8 ? '8.0以上' : '7.0～7.9',
  }))
  return { ...config, TEXTBOOK_BELTS: belts, TEXTBOOK_VOLCANOES: volcanoes, TEXTBOOK_SEISMICITY: seismicity, TEXTBOOK_QUAKES: quakes }
}
