import * as THREE from 'three'
import { sampleField, type ClimateField } from './data'
import { WORLD_LON_START, WORLD_LON_END, WORLD_WIDTH, WORLD_DEPTH } from './world'

type ContourLayer = 'none' | 'sst' | 'pressure' | 'anomaly'
type OceanMask = (lon: number, lat: number) => boolean
type Point = { lon: number; lat: number }
export interface ContourSegment { level: number; start: Point; end: Point }

const CONTOUR_LEVELS: Record<Exclude<ContourLayer, 'none'>, readonly number[]> = {
  sst: [0, 10, 20, 25, 28, 30],
  pressure: [990, 1000, 1010, 1020, 1030, 1040],
  anomaly: [-3, -2, -1, 0, 1, 2, 3],
}
const SEA_LEVEL = 0.20
const worldX = (lon: number) => (lon - WORLD_LON_START) / (WORLD_LON_END - WORLD_LON_START) * WORLD_WIDTH - WORLD_WIDTH / 2
const worldZ = (lat: number) => -lat / 180 * WORLD_DEPTH

/** Marching squares over the current month's field, without joining missing cells. */
export function traceContourSegments(
  field: ClimateField,
  levels: readonly number[],
  isLand: OceanMask,
): ContourSegment[] {
  const latitudeEnd = field.latStart + field.latStep * (field.height - 1)
  const minLat = Math.max(-90, Math.min(field.latStart, latitudeEnd))
  const maxLat = Math.min(90, Math.max(field.latStart, latitudeEnd))
  if (minLat >= maxLat || !levels.length) return []

  // At least the source resolution; retain native 2° SST / 2.5° pressure detail.
  const step = THREE.MathUtils.clamp(Math.min(Math.abs(field.lonStep), Math.abs(field.latStep)), 1, 2.5)
  const lonSpan = WORLD_LON_END - WORLD_LON_START
  const columns = Math.ceil(lonSpan / step)
  const rows = Math.ceil((maxLat - minLat) / step)
  const lonAt = (column: number) => WORLD_LON_START + column * lonSpan / columns
  const latAt = (row: number) => minLat + row * (maxLat - minLat) / rows
  const values: (number | null)[] = new Array((columns + 1) * (rows + 1))
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const lon = lonAt(column), lat = latAt(row)
      values[row * (columns + 1) + column] = isLand(lon, lat) ? null : sampleField(field, lon, lat)
    }
  }

  const segments: ContourSegment[] = []
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]] as const
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const bottom = row * (columns + 1) + column
      const top = bottom + columns + 1
      const samples = [values[bottom], values[bottom + 1], values[top + 1], values[top]]
      // All four corners must be valid: no contours interpolated through a hole.
      if (samples.some((value) => value == null || !Number.isFinite(value))) continue
      const v = samples as [number, number, number, number]
      const low = Math.min(...v), high = Math.max(...v)
      if (low === high) continue
      const points: [Point, Point, Point, Point] = [
        { lon: lonAt(column), lat: latAt(row) },
        { lon: lonAt(column + 1), lat: latAt(row) },
        { lon: lonAt(column + 1), lat: latAt(row + 1) },
        { lon: lonAt(column), lat: latAt(row + 1) },
      ]
      for (const level of levels) {
        if (level < low || level > high) continue
        const crossings: (Point | undefined)[] = []
        for (let edge = 0; edge < edges.length; edge++) {
          const [a, b] = edges[edge]!
          if ((v[a] >= level) === (v[b] >= level)) continue
          const part = (level - v[a]) / (v[b] - v[a])
          crossings[edge] = {
            lon: THREE.MathUtils.lerp(points[a].lon, points[b].lon, part),
            lat: THREE.MathUtils.lerp(points[a].lat, points[b].lat, part),
          }
        }
        const intersected = crossings.flatMap((point, edge) => point ? [edge] : [])
        let pairs: number[][] = []
        if (intersected.length === 2) pairs = [intersected]
        else if (intersected.length === 4) {
          // Asymptotic decider resolves saddle cells without arbitrary crossings.
          const determinant = (v[0] - level) * (v[2] - level) - (v[1] - level) * (v[3] - level)
          pairs = determinant >= 0 ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]]
        }
        for (const pair of pairs) {
          const start = crossings[pair[0]!]!, end = crossings[pair[1]!]!
          if (Math.hypot(end.lon - start.lon, end.lat - start.lat) < 1e-7) continue
          // Check inside the cell too, so small islands cannot be bridged.
          if ([0.25, 0.5, 0.75].some((part) => isLand(
            THREE.MathUtils.lerp(start.lon, end.lon, part),
            THREE.MathUtils.lerp(start.lat, end.lat, part),
          ))) continue
          segments.push({ level, start, end })
        }
      }
    }
  }
  return segments
}

function makeContourLabel(text: string, position: Point): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 96
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '600 42px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = 'rgba(10, 36, 56, 0.96)'
  context.shadowBlur = 9
  context.strokeStyle = 'rgba(10, 36, 56, 0.78)'
  context.lineWidth = 4
  context.strokeText(text, canvas.width / 2, canvas.height / 2)
  context.fillStyle = '#f4fcff'
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false })
  const label = new THREE.Sprite(material)
  const baseWidth = 4.2
  label.position.set(worldX(position.lon), SEA_LEVEL + 0.12, worldZ(position.lat))
  label.scale.set(baseWidth, baseWidth * canvas.height / canvas.width, 1)
  label.userData.sceneLabel = { baseWidth, aspect: canvas.height / canvas.width, minPixels: 72 }
  label.userData.contourLabel = true
  label.renderOrder = 7
  return label
}

/** Owns only its children; the scene disposes geometries, materials and label maps. */
export function createFieldContours(field: ClimateField, layer: ContourLayer, isLand: OceanMask): THREE.Group {
  const group = new THREE.Group()
  group.name = `field-contours-${layer}`
  if (layer === 'none') return group
  const levels = CONTOUR_LEVELS[layer]
  const segments = traceContourSegments(field, levels, isLand)
  const labelPositions: Point[] = []
  for (let index = 0; index < levels.length; index++) {
    const level = levels[index]!
    const matching = segments.filter((segment) => segment.level === level)
    if (!matching.length) continue
    const positions: number[] = []
    for (const segment of matching) {
      positions.push(
        worldX(segment.start.lon), SEA_LEVEL, worldZ(segment.start.lat),
        worldX(segment.end.lon), SEA_LEVEL, worldZ(segment.end.lat),
      )
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const isZero = layer === 'anomaly' && level === 0
    const material = new THREE.LineBasicMaterial({
      color: isZero ? 0xffffff : 0xe6f8ff,
      opacity: isZero ? 0.86 : 0.60,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    const lines = new THREE.LineSegments(geometry, material)
    lines.renderOrder = 5
    group.add(lines)

    // One number per level, spatially separated and away from the board edges.
    const targetLon = WORLD_LON_START + 55 + ((index * 113 + (layer === 'pressure' ? 67 : 0)) % 250)
    const candidates = matching.map((segment) => ({
      lon: (segment.start.lon + segment.end.lon) / 2,
      lat: (segment.start.lat + segment.end.lat) / 2,
    })).filter((point) => point.lon > WORLD_LON_START + 14 && point.lon < WORLD_LON_END - 14 && Math.abs(point.lat) < 72
      && labelPositions.every((other) => Math.hypot(point.lon - other.lon, point.lat - other.lat) > 30))
    candidates.sort((a, b) => (Math.abs(a.lon - targetLon) + Math.abs(a.lat) * 0.25)
      - (Math.abs(b.lon - targetLon) + Math.abs(b.lat) * 0.25))
    const position = candidates[0]
    if (!position) continue
    labelPositions.push(position)
    const value = layer === 'anomaly' && level > 0 ? `+${level}` : String(level)
    group.add(makeContourLabel(`${value} ${layer === 'pressure' ? 'hPa' : '°C'}`, position))
  }
  return group
}
