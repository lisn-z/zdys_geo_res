import L from 'leaflet'
import { formatDegreesMinutes } from './map-lesson'

/** Conventional latitude used for the textbook's tropics: 23°26′. */
export const TROPIC_LATITUDE = 23 + 26 / 60
/** Conventional latitude used for the textbook's polar circles: 66°34′. */
export const POLAR_CIRCLE_LATITUDE = 66 + 34 / 60
const MAX_LATITUDE = 85
const PANE_NAME = 'teachingGraticulePane'
const STEP_CHOICES = [0.00001, 0.00002, 0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 180]

export type GraticuleBounds = { south: number; north: number; west: number; east: number }
export type GraticuleLine = {
  axis: 'latitude' | 'longitude'
  value: number
  special: boolean
  label: string
  points: [number, number][]
}

export function graticuleStep(span: number, pixels: number, spacing: number): number {
  const desired = Math.max(0, span) / Math.max(1, Math.min(24, pixels / spacing))
  // Very wide views can show several world copies. Grow past 180° instead of
  // filling the line budget at the west edge and leaving the east edge empty.
  return STEP_CHOICES.find(step => step >= desired - 1e-10) ?? Math.ceil(desired / 180) * 180
}

export function formatGraticuleCoordinate(value: number, axis: GraticuleLine['axis']): string {
  if (!Number.isFinite(value)) return '—'
  const coordinate = axis === 'longitude' ? ((value + 180) % 360 + 360) % 360 - 180 : value
  const text = formatDegreesMinutes(coordinate)
  if (text === '0°00′') return '0°'
  if (axis === 'longitude' && text === '180°00′') return text
  return `${text}${axis === 'latitude' ? (coordinate > 0 ? 'N' : 'S') : (coordinate > 0 ? 'E' : 'W')}`
}

function multiples(min: number, max: number, step: number): number[] {
  const values: number[] = []
  const start = Math.ceil((min - step * 1e-8) / step)
  const end = Math.floor((max + step * 1e-8) / step)
  // A hard ceiling is useful even for degenerate map sizes or malformed bounds.
  for (let index = start; index <= end && values.length < 32; index += 1) {
    values.push(Number((index * step).toFixed(8)))
  }
  return values
}

/** Geometry follows visible world copies; labels describe geographical meridians. */
export function buildGraticuleLines(bounds: GraticuleBounds, size: { x: number; y: number }): GraticuleLine[] {
  if (![bounds.south, bounds.north, bounds.west, bounds.east, size.x, size.y].every(Number.isFinite) || size.x <= 0 || size.y <= 0) return []
  const south = Math.max(-MAX_LATITUDE, bounds.south)
  const north = Math.min(MAX_LATITUDE, bounds.north)
  const west = bounds.west
  const east = bounds.east
  if (south >= north || west >= east) return []
  if (!Number.isFinite(bounds.north - bounds.south) || !Number.isFinite(east - west)) return []

  // Use the unclipped span when choosing spacing: a small strip of world at the
  // edge of the viewport should not receive a whole screen's worth of lines.
  const latStep = graticuleStep(bounds.north - bounds.south, size.y, 86)
  const lngStep = graticuleStep(bounds.east - bounds.west, size.x, 118)
  const lines: GraticuleLine[] = []
  const specialLatitudes = [0, TROPIC_LATITUDE, -TROPIC_LATITUDE, POLAR_CIRCLE_LATITUDE, -POLAR_CIRCLE_LATITUDE]

  for (const lat of multiples(south, north, latStep)) {
    if (specialLatitudes.some(value => Math.abs(lat - value) < 1e-8)) continue
    lines.push({ axis: 'latitude', value: lat, special: false, label: formatGraticuleCoordinate(lat, 'latitude'), points: [[lat, west], [lat, east]] })
  }
  for (const lng of multiples(west, east, lngStep)) {
    lines.push({ axis: 'longitude', value: lng, special: false, label: formatGraticuleCoordinate(lng, 'longitude'), points: [[south, lng], [north, lng]] })
  }
  for (const lat of specialLatitudes) {
    if (lat < south || lat > north) continue
    const type = Math.abs(lat) === POLAR_CIRCLE_LATITUDE ? '极圈' : '回归线'
    const label = lat === 0 ? '赤道 0°' : `${lat > 0 ? '北' : '南'}${type} ${formatDegreesMinutes(lat)}${lat > 0 ? 'N' : 'S'}`
    lines.push({ axis: 'latitude', value: lat, special: true, label, points: [[lat, west], [lat, east]] })
  }
  return lines
}

export function createMapGraticule(map: L.Map): { setVisible(visible: boolean): void; dispose(): void } {
  const existingPane = map.getPane(PANE_NAME)
  const pane = existingPane ?? map.createPane(PANE_NAME)
  pane.style.zIndex = '350'
  pane.style.pointerEvents = 'none'
  pane.setAttribute('aria-hidden', 'true')
  const renderer = L.svg({ pane: PANE_NAME, padding: 0.15 })
  const group = L.layerGroup()
  let visible = false
  let disposed = false
  let frame = 0

  function render() {
    if (!visible || disposed) return
    const size = map.getSize()
    if (!size.x || !size.y) return
    const bounds = map.getBounds()
    const definitions = buildGraticuleLines({ south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() }, size)
    group.clearLayers()

    for (const line of definitions) {
      L.polyline(line.points, {
        pane: PANE_NAME,
        renderer,
        interactive: false,
        bubblingMouseEvents: false,
        color: line.special ? (line.value === 0 ? '#ff555f' : Math.abs(line.value) === POLAR_CIRCLE_LATITUDE ? '#a9baff' : '#ffdb55') : '#bce9ee',
        weight: line.special ? 2 : 1,
        opacity: line.special ? 0.96 : 0.48,
        dashArray: line.special && line.value !== 0 ? '9 7' : undefined,
        lineCap: 'butt',
      }).addTo(group)
    }

    const used: { x: number; y: number; width: number; height: number }[] = []
    // Special parallels win collisions with ordinary coordinate labels.
    for (const line of [...definitions].sort((a, b) => Number(b.special) - Number(a.special))) {
      const latitude = line.axis === 'latitude'
      const width = line.special ? (line.value === 0 ? 76 : 164) : Math.max(48, line.label.length * 7.5 + 14)
      const height = 24
      let x: number
      let y: number
      if (latitude) {
        const rightEnd = map.latLngToContainerPoint(line.points[1]!)
        // Follow the visible edge while panning through repeated world copies.
        x = Math.min(size.x - 14, rightEnd.x - 8) - width
        y = map.latLngToContainerPoint(line.points[0]!).y - height / 2
      } else {
        const bottomEnd = map.latLngToContainerPoint(line.points[0]!)
        x = bottomEnd.x - width / 2
        y = Math.min(size.y - 50, bottomEnd.y - 12) - height
      }
      if (x < 4 || y < 4 || x + width > size.x - 4 || y + height > size.y - 4) continue
      const box = { x, y, width, height }
      if (used.some(other => x < other.x + other.width + 8 && x + width + 8 > other.x && y < other.y + other.height + 8 && y + height + 8 > other.y)) continue
      used.push(box)
      const color = line.special ? (line.value === 0 ? '#ff9399' : Math.abs(line.value) === POLAR_CIRCLE_LATITUDE ? '#c6d1ff' : '#ffe47f') : '#def4f5'
      const label = document.createElement('span')
      label.textContent = line.label
      label.style.cssText = `display:block;box-sizing:border-box;width:${width}px;height:${height}px;line-height:${height}px;padding:0 6px;border-radius:4px;background:rgba(5,22,34,.72);color:${color};font:600 12px/${height}px system-ui,sans-serif;white-space:nowrap;text-align:center;text-shadow:0 1px 2px #06131c;pointer-events:none;user-select:none;`
      L.marker(map.containerPointToLatLng([x, y]), {
        pane: PANE_NAME,
        interactive: false,
        keyboard: false,
        bubblingMouseEvents: false,
        icon: L.divIcon({ className: 'map-graticule-label', html: label, iconSize: [width, height], iconAnchor: [0, 0] }),
      }).addTo(group)
    }
  }

  function schedule() {
    if (!visible || disposed || frame) return
    frame = requestAnimationFrame(() => { frame = 0; render() })
  }

  const events = 'move zoom resize viewreset'
  map.on(events, schedule)

  return {
    setVisible(nextVisible) {
      if (disposed || visible === nextVisible) return
      visible = nextVisible
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      if (visible) { group.addTo(map); render() }
      else { group.remove(); group.clearLayers(); renderer.remove() }
    },
    dispose() {
      if (disposed) return
      disposed = true
      visible = false
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      map.off(events, schedule)
      group.remove()
      group.clearLayers()
      renderer.remove()
      // Keep Leaflet's pane registry valid if this overlay is recreated on the
      // same map. An empty inert pane is owned and removed by the map itself.
    },
  }
}
