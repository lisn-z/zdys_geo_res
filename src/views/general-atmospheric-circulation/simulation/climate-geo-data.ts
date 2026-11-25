export type ClimateMapLayer = 'climate' | 'temperature' | 'precipitation'
export type ClimateMapMonth = 1 | 7
export type ClimateDatasetKey = 'climate' | 'temperature-1' | 'temperature-7' | 'precipitation'
export interface ClimateLegendItem {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly sourceColor: string
  readonly min?: number
  readonly max?: number
  readonly unit?: string
}

const entry = (id: string, name: string, sourceColor: string): ClimateLegendItem =>
  Object.freeze({ id, name, color: sourceColor, sourceColor })

// The supplied vector map has TWELVE source classes. In particular it does not
// distinguish tundra from ice cap; do not invent a thirteenth spatial subdivision.
export const CLIMATE_TYPE_LEGEND: readonly ClimateLegendItem[] = Object.freeze([
  entry('tropical-rainforest', '热带雨林气候', '#318739'),
  entry('tropical-savanna', '热带草原气候', '#77e69b'),
  entry('tropical-monsoon', '热带季风气候', '#b2e579'),
  entry('tropical-desert', '热带沙漠气候', '#fafbd6'),
  entry('subtropical-monsoon-humid', '亚热带季风气候和湿润气候', '#ffe884'),
  entry('mediterranean', '地中海气候', '#fba861'),
  entry('temperate-oceanic', '温带海洋性气候', '#fa6156'),
  entry('temperate-monsoon', '温带季风气候', '#f79eab'),
  entry('temperate-continental', '温带大陆性气候', '#ffbbd3'),
  entry('subarctic-coniferous', '亚寒带针叶林气候', '#43d1e0'),
  entry('polar', '寒带气候', '#ca81c4'),
  entry('highland', '高原山地气候', '#624b80'),
])

// These source-color boundaries were checked against the source's labelled
// isotherms/isohyets on BOTH sides of the line, not guessed from color alone.
export const TEMPERATURE_LEGEND: readonly ClimateLegendItem[] = Object.freeze([
  { ...entry('temperature-0', '低于 −40 ℃', '#9cb3ec'), max: -40, unit: '℃' },
  { ...entry('temperature-1', '−40～−30 ℃', '#c6d1ed'), min: -40, max: -30, unit: '℃' },
  { ...entry('temperature-2', '−30～−20 ℃', '#bde7d1'), min: -30, max: -20, unit: '℃' },
  { ...entry('temperature-3', '−20～−10 ℃', '#fff9b9'), min: -20, max: -10, unit: '℃' },
  { ...entry('temperature-4', '−10～0 ℃', '#fadfa4'), min: -10, max: 0, unit: '℃' },
  { ...entry('temperature-5', '0～10 ℃', '#f7ba6b'), min: 0, max: 10, unit: '℃' },
  { ...entry('temperature-6', '10～20 ℃', '#f28d44'), min: 10, max: 20, unit: '℃' },
  { ...entry('temperature-7', '20～30 ℃', '#ff6a00'), min: 20, max: 30, unit: '℃' },
  { ...entry('temperature-8', '30 ℃及以上', '#fa7f6c'), min: 30, unit: '℃' },
])
export const PRECIPITATION_LEGEND: readonly ClimateLegendItem[] = Object.freeze([
  { ...entry('precipitation-0', '少于 200 mm', '#F7FBFF'), min: 0, max: 200, unit: 'mm' },
  { ...entry('precipitation-1', '200～500 mm', '#D2E3F3'), min: 200, max: 500, unit: 'mm' },
  { ...entry('precipitation-2', '500～1000 mm', '#9ECAE1'), min: 500, max: 1000, unit: 'mm' },
  { ...entry('precipitation-3', '1000～2000 mm', '#6BAED6'), min: 1000, max: 2000, unit: 'mm' },
  { ...entry('precipitation-4', '2000 mm及以上', '#4292C6'), min: 2000, unit: 'mm' },
])

export const CLIMATE_GEO_URLS: Readonly<Record<ClimateDatasetKey, string>> = Object.freeze({
  climate: '/geo-resources-folder/geojson/全球矢量数据/全球气候类型.geojson',
  'temperature-1': '/geo-resources-folder/geojson/全球矢量数据/全球一月平均气温.geojson',
  'temperature-7': '/geo-resources-folder/geojson/全球矢量数据/全球七月平均气温.geojson',
  precipitation: '/geo-resources-folder/geojson/全球矢量数据/全球年降水量分布.geojson',
})
export const climateDatasetKey = (layer: ClimateMapLayer, month: ClimateMapMonth): ClimateDatasetKey =>
  layer === 'temperature' ? `temperature-${month}` : layer
export function climateLegend(layer: ClimateMapLayer): readonly ClimateLegendItem[] {
  return layer === 'climate' ? CLIMATE_TYPE_LEGEND : layer === 'temperature' ? TEMPERATURE_LEGEND : PRECIPITATION_LEGEND
}
export const normalizeLongitude = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180

type Position = readonly number[]
export interface SourceClimateFeature {
  type?: 'Feature'
  properties?: Record<string, unknown> | null
  geometry: { type: string; coordinates: unknown } | null
}
export interface SourceClimateCollection { type: 'FeatureCollection'; features: SourceClimateFeature[] }
export interface GeographicBounds { west: number; east: number; south: number; north: number }
export interface ClimatePolygon {
  readonly featureIndex: number
  readonly type: ClimateLegendItem
  readonly properties: Readonly<Record<string, unknown>>
  readonly rings: readonly Float64Array[]
  readonly bounds: GeographicBounds
}
export interface ClimateGeoPick {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly sourceColor: string
  readonly properties: Readonly<Record<string, unknown>>
  readonly featureIndex: number
  readonly layer: ClimateMapLayer
  readonly month: ClimateMapMonth
  readonly valueLabel?: string
}
export interface PreparedClimateData {
  readonly key: ClimateDatasetKey
  readonly layer: ClimateMapLayer
  readonly polygons: readonly ClimatePolygon[]
  readonly featureCount: number
  readonly sourceFeatureCount: number
  readonly vertexCount: number
  readonly legend: readonly ClimateLegendItem[]
  readonly sourceLabels: readonly { text: string; lon: number; lat: number }[]
}

function unwrapRing(raw: readonly Position[], nearLongitude?: number): Float64Array | null {
  if (raw.length < 4) return null
  const values: number[] = []
  let previous = Number(raw[0]![0])
  if (!Number.isFinite(previous)) return null
  if (nearLongitude !== undefined) previous += Math.round((nearLongitude - previous) / 360) * 360
  for (const position of raw) {
    const sourceLongitude = Number(position[0]), latitude = Number(position[1])
    if (!Number.isFinite(sourceLongitude) || !Number.isFinite(latitude)) return null
    const longitude = sourceLongitude + Math.round((previous - sourceLongitude) / 360) * 360
    // The source contains small cartographic overshoots (e.g. −90.217°).
    // Clamp latitude only; altitude=30000 on text points is never a climate value.
    values.push(longitude, Math.max(-90, Math.min(90, latitude)))
    previous = longitude
  }
  let area = 0
  for (let i = 0, j = values.length - 2; i < values.length; j = i, i += 2)
    area += values[j]! * values[i + 1]! - values[i]! * values[j + 1]!
  return Math.abs(area) > 1e-10 ? new Float64Array(values) : null
}

/** Keep only geographic geometry and source properties, never the 14 MB JSON text. */
export function prepareClimateGeoData(collection: SourceClimateCollection, key: ClimateDatasetKey): PreparedClimateData {
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('数据不是有效的 GeoJSON FeatureCollection')
  const layer: ClimateMapLayer = key.startsWith('temperature') ? 'temperature' : key as ClimateMapLayer
  const legend = climateLegend(layer), colors = new Map(legend.map(item => [item.sourceColor.toLowerCase(), item]))
  const polygons: ClimatePolygon[] = [], sourceLabels: { text: string; lon: number; lat: number }[] = []
  let featureCount = 0, vertexCount = 0
  for (const [featureIndex, feature] of collection.features.entries()) {
    if (!feature.geometry) continue
    const properties = Object.freeze({ ...feature.properties })
    if (feature.geometry.type === 'Point') {
      const point = feature.geometry.coordinates as Position
      if (typeof properties.labelText === 'string' && Number.isFinite(point[0]) && Number.isFinite(point[1]))
        sourceLabels.push({ text: properties.labelText, lon: point[0]!, lat: point[1]! })
      continue
    }
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) continue
    const color = String(properties.fillColor ?? '').toLowerCase(), type = colors.get(color)
    if (!type) throw new Error(`数据包含未识别的分区颜色 ${color || '（空）'}，需要核对源图例`)
    const sourcePolygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as Position[][]] : feature.geometry.coordinates as Position[][][]
    let accepted = false
    for (const source of sourcePolygons) {
      const outer = unwrapRing(source[0] ?? [])
      if (!outer) continue
      const bounds = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }
      for (let i = 0; i < outer.length; i += 2) {
        bounds.west = Math.min(bounds.west, outer[i]!); bounds.east = Math.max(bounds.east, outer[i]!)
        bounds.south = Math.min(bounds.south, outer[i + 1]!); bounds.north = Math.max(bounds.north, outer[i + 1]!)
      }
      const rings = [outer, ...source.slice(1).map(hole => unwrapRing(hole, (bounds.west + bounds.east) / 2)).filter((ring): ring is Float64Array => ring !== null)]
      polygons.push({ featureIndex, type, properties, rings, bounds })
      vertexCount += rings.reduce((sum, ring) => sum + ring.length / 2, 0)
      accepted = true
    }
    if (accepted) featureCount++
  }
  if (!polygons.length) throw new Error('数据中没有可显示的气候分区面')
  return { key, layer, polygons, featureCount, sourceFeatureCount: collection.features.length, vertexCount, legend, sourceLabels }
}

function ringContains(ring: Float64Array, longitude: number, latitude: number) {
  let inside = false
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const ax = ring[j]!, ay = ring[j + 1]!, bx = ring[i]!, by = ring[i + 1]!
    const cross = (longitude - ax) * (by - ay) - (latitude - ay) * (bx - ax)
    if (Math.abs(cross) < 1e-9 && longitude >= Math.min(ax, bx) - 1e-9 && longitude <= Math.max(ax, bx) + 1e-9 &&
      latitude >= Math.min(ay, by) - 1e-9 && latitude <= Math.max(ay, by) + 1e-9) return true
    if ((ay > latitude) !== (by > latitude) && longitude < (bx - ax) * (latitude - ay) / (by - ay) + ax) inside = !inside
  }
  return inside
}

export function pickClimateGeoData(data: PreparedClimateData, latitude: number, longitude: number, month: ClimateMapMonth): ClimateGeoPick | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90) return null
  longitude = normalizeLongitude(longitude)
  // Last drawn polygon wins at shared edges, matching the texture's draw order.
  for (let i = data.polygons.length - 1; i >= 0; i--) {
    const polygon = data.polygons[i]!, bounds = polygon.bounds
    if (latitude < bounds.south || latitude > bounds.north) continue
    const localLongitude = longitude + Math.round(((bounds.west + bounds.east) / 2 - longitude) / 360) * 360
    if (localLongitude < bounds.west || localLongitude > bounds.east || !ringContains(polygon.rings[0]!, localLongitude, latitude) ||
      polygon.rings.slice(1).some(hole => ringContains(hole, localLongitude, latitude))) continue
    return { ...polygon.type, properties: polygon.properties, featureIndex: polygon.featureIndex,
      layer: data.layer, month, valueLabel: data.layer === 'climate' ? undefined : polygon.type.name }
  }
  return null
}

/**
 * Draw an entire class in ONE fill: separate antialiased fills leave translucent
 * seams at the source's rectangular clipping tiles. Opposite ring windings keep
 * actual lakes/holes empty while nonzero filling unites touching/overlapping tiles.
 */
export function paintClimateGeoData(ctx: CanvasRenderingContext2D, data: PreparedClimateData, width: number, height: number, selectedId: string | null) {
  ctx.clearRect(0, 0, width, height)
  ctx.lineJoin = 'round'
  const classes = new Map<string, ClimatePolygon[]>()
  for (const polygon of data.polygons) {
    const members = classes.get(polygon.type.id)
    if (members) members.push(polygon)
    else classes.set(polygon.type.id, [polygon])
  }
  for (const [typeId, polygons] of classes) {
    const selected = typeId === selectedId
    ctx.globalAlpha = selectedId && !selected ? .19 : 1
    ctx.fillStyle = polygons[0]!.type.color
    ctx.beginPath()
    for (const polygon of polygons) {
      // Raster clipping makes antimeridian polygons continuous at both texture edges.
      const firstCopy = Math.ceil((-180 - polygon.bounds.east) / 360)
      const lastCopy = Math.floor((180 - polygon.bounds.west) / 360)
      for (let copy = firstCopy; copy <= lastCopy; copy++) {
        for (const [ringIndex, ring] of polygon.rings.entries()) {
          let signedArea = 0
          for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2)
            signedArea += ring[j]! * ring[i + 1]! - ring[i]! * ring[j + 1]!
          const reverse = ringIndex === 0 ? signedArea < 0 : signedArea > 0
          for (let vertex = 0; vertex < ring.length / 2; vertex++) {
            const i = reverse ? ring.length - 2 - vertex * 2 : vertex * 2
            const x = (ring[i]! + copy * 360 + 180) / 360 * width
            const y = (90 - ring[i + 1]!) / 180 * height
            if (vertex === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
        }
      }
    }
    ctx.fill('nonzero')
    // Opacity highlights the complete climate class. Never stroke clipping tiles.
  }
  ctx.globalAlpha = 1
}
