import { sampleNcepSlp } from '../ncep-slp-climatology.ts'
import { traceContourAnchors, type ContourAnchor } from './contour-labels.ts'

// Same levels and climatological source as general-atmospheric-circulation.
export const pressureLevels = [980, 988, 996, 1004, 1012, 1020, 1028, 1036, 1044] as const
export const pressurePalette = [
  '#374ada',
  '#374ada',
  '#5b7ee8',
  '#91caf6',
  '#d9e1dc',
  '#f6c27d',
  '#f47d42',
  '#e9482b',
  '#e9482b',
]
export const pressureColors = {
  low: pressurePalette[0]!,
  middle: pressurePalette[4]!,
  high: pressurePalette[8]!,
  line: '#fff7df',
  highText: '#ffdc9e',
  lowText: '#b6edff',
}
export const formatPressure = (value: number) => `${Number(value.toFixed(1))} hPa`
export const pressureMonths = [1, 7] as const
export type PressureMonth = (typeof pressureMonths)[number]
export function samplePressure(lon: number, lat: number, month: PressureMonth) {
  if (month !== 1 && month !== 7) throw new RangeError('气压资料仅包含1月与7月')
  return sampleNcepSlp(month === 1 ? 'january' : 'july', lon, lat)
}

interface PressureCenter {
  name: string
  symbol: 'H' | 'L'
  lat: number
  lon: number
  // [south, north, west, east]; prevents selecting another system or a land high.
  bounds?: readonly [number, number, number, number]
}
// Geographic search seeds, not the plotted H/L positions.
const januaryCenters: PressureCenter[] = [
  { name: '亚洲高压', symbol: 'H', lat: 48, lon: 92 },
  { name: '北美高压', symbol: 'H', lat: 45, lon: -105 },
  { name: '阿留申低压', symbol: 'L', lat: 52, lon: -172 },
  { name: '冰岛低压', symbol: 'L', lat: 60, lon: -25 },
  { name: '澳大利亚低压', symbol: 'L', lat: -25, lon: 135 },
  { name: '南印度洋高压', symbol: 'H', lat: -32, lon: 78 },
  { name: '南太平洋高压', symbol: 'H', lat: -31, lon: -108 },
  { name: '北太平洋高压', symbol: 'H', lat: 30, lon: -135, bounds: [20, 37.5, -165, -120] },
  { name: '北大西洋高压', symbol: 'H', lat: 35, lon: -30, bounds: [20, 40, -60, -15] },
  { name: '南大西洋高压', symbol: 'H', lat: -30, lon: -10, bounds: [-40, -15, -35, 5] },
  { name: '南美低压', symbol: 'L', lat: -25, lon: -60, bounds: [-35, -15, -65, -45] },
  { name: '南非低压', symbol: 'L', lat: -25, lon: 22.5, bounds: [-35, -15, 10, 35] },
]
const julyCenters: PressureCenter[] = [
  { name: '亚洲低压', symbol: 'L', lat: 30, lon: 76 },
  { name: '北太平洋高压', symbol: 'H', lat: 31, lon: -148 },
  { name: '北大西洋高压', symbol: 'H', lat: 30, lon: -38 },
  { name: '南印度洋高压', symbol: 'H', lat: -30, lon: 73 },
  { name: '澳大利亚高压', symbol: 'H', lat: -28, lon: 134 },
  { name: '南太平洋高压', symbol: 'H', lat: -31, lon: -110 },
  { name: '南大西洋高压', symbol: 'H', lat: -30, lon: -10, bounds: [-40, -15, -35, 5] },
  { name: '北美低压', symbol: 'L', lat: 32.5, lon: -110, bounds: [25, 45, -120, -95] },
  { name: '南非高压', symbol: 'H', lat: -27.5, lon: 27.5, bounds: [-35, -15, 10, 35] },
  { name: '冰岛低压', symbol: 'L', lat: 60, lon: -25, bounds: [55, 67.5, -45, -10] },
  { name: '撒哈拉低压', symbol: 'L', lat: 25, lon: 0, bounds: [20, 30, -15, 15] },
]
function regionalExtremum(center: PressureCenter, month: PressureMonth) {
  const sign = center.symbol === 'H' ? 1 : -1
  const [south, north, west, east] = center.bounds ?? [center.lat - 15, center.lat + 15, center.lon - 30, center.lon + 30]
  let best: { lat: number; lon: number; value: number } | undefined
  for (let lat = Math.ceil(Math.max(-85, south) / 2.5) * 2.5; lat <= Math.min(85, north); lat += 2.5) {
    for (let lon = Math.ceil(west / 2.5) * 2.5; lon <= east; lon += 2.5) {
      const value = samplePressure(lon, lat, month)
      if (best && sign * value <= sign * best.value) continue
      let local = true, strict = false
      for (const dy of [-2.5, 0, 2.5]) for (const dx of [-2.5, 0, 2.5]) {
        if (!dx && !dy) continue
        const delta = sign * (value - samplePressure(lon + dx, lat + dy, month))
        if (delta < -1e-8) local = false
        if (delta > 1e-8) strict = true
      }
      // A boundary value or a flat region alone must not be called a pressure center.
      if (local && strict) best = { lat, lon: ((lon + 540) % 360) - 180, value }
    }
  }
  return best
}
const centerCache = new Map<PressureMonth, (PressureCenter & { id: string; opacity: number; value: number })[]>()
export function pressureCenterAnchors(month: PressureMonth) {
  const cached = centerCache.get(month)
  if (cached) return cached
  const centers = (month === 1 ? januaryCenters : julyCenters).flatMap(center => {
    const extremum = regionalExtremum(center, month)
    return extremum ? [{...center, ...extremum, id: 'center-' + center.name, opacity: 1}] : []
  })
  centerCache.set(month, centers)
  return centers
}

const contourCache = new Map<PressureMonth, ContourAnchor[]>()
export function contourAnchors(month: PressureMonth) {
  let anchors = contourCache.get(month)
  if (!anchors) {
    anchors = traceContourAnchors((lon, lat) => samplePressure(lon, lat, month), pressureLevels)
      // With a small label budget, show representative high/low values around
      // normal pressure before spending the budget on only the lowest levels.
      .sort((a, b) => Math.abs(a.value - 1012) - Math.abs(b.value - 1012) || b.value - a.value)
    contourCache.set(month, anchors)
  }
  return anchors
}
