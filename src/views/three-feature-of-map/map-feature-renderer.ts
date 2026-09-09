import L from 'leaflet'
import type { Coordinate, FeatureType } from './map-lesson'

type ScreenPoint = { x: number; y: number }
type ScreenSize = { x: number; y: number }

function visibleInterval(a: ScreenPoint, b: ScreenPoint, size: ScreenSize): [number, number] | null {
  const dx = b.x - a.x; const dy = b.y - a.y
  let near = 0; let far = 1
  const padding = 24
  const constraints = [
    [-dx, a.x + padding], [dx, size.x + padding - a.x],
    [-dy, a.y + padding], [dy, size.y + padding - a.y],
  ]
  for (const [p, q] of constraints) {
    if (p === undefined || q === undefined) continue
    if (p === 0) { if (q < 0) return null; continue }
    const t = q / p
    if (p < 0) near = Math.max(near, t)
    else far = Math.min(far, t)
    if (near > far) return null
  }
  return [near, far]
}

// Work in screen pixels so battlements keep a readable size at every zoom.
// Clip before sampling: even a continent-long segment creates only visible detail.
export function greatWallCrenels(points: readonly ScreenPoint[], size: ScreenSize): ScreenPoint[][] {
  const crenels: ScreenPoint[][] = []
  const spacing = 20; const halfWidth = 4; const height = 6
  let phase = 0
  for (let index = 1; index < points.length && crenels.length < 4096; index++) {
    const a = points[index - 1]!; const b = points[index]!
    const dx = b.x - a.x; const dy = b.y - a.y
    const length = Math.hypot(dx, dy)
    if (!Number.isFinite(length) || length === 0) continue
    const interval = visibleInterval(a, b, size)
    if (interval && length >= halfWidth * 2) {
      const start = Math.max(halfWidth, interval[0] * length)
      const end = Math.min(length - halfWidth, interval[1] * length)
      const offset = (spacing / 2 - phase + spacing) % spacing
      const first = offset + Math.ceil((start - offset) / spacing) * spacing
      const ux = dx / length; const uy = dy / length
      for (let distance = first; distance <= end && crenels.length < 4096; distance += spacing) {
        const left = { x: a.x + ux * (distance - halfWidth), y: a.y + uy * (distance - halfWidth) }
        const right = { x: a.x + ux * (distance + halfWidth), y: a.y + uy * (distance + halfWidth) }
        crenels.push([left, { x: left.x + uy * height, y: left.y - ux * height }, { x: right.x + uy * height, y: right.y - ux * height }, right])
      }
    }
    phase = (phase + length) % spacing
  }
  return crenels
}

/** Add the feature's complete legend geometry; the caller attaches its label. */
export function drawMapFeature(map: L.Map, layer: L.LayerGroup, points: Coordinate[], definition: FeatureType): L.Layer {
  if (!points.length) return L.layerGroup().addTo(layer)
  const style: L.PathOptions = {
    color: definition.color, fillColor: definition.fillColor || definition.color,
    weight: 3, fillOpacity: 0.65, dashArray: definition.dashArray,
    lineCap: 'butt', interactive: false,
  }
  if (definition.geometry === 'point') {
    const symbol = document.createElement('span')
    symbol.className = 'map-textbook-symbol'
    symbol.innerHTML = definition.symbol
    return L.marker(points[0]!, {
      interactive: false,
      icon: L.divIcon({ className: 'lesson-marker', html: symbol, iconSize: [48, 28], iconAnchor: [24, 14] }),
    }).addTo(layer)
  }
  if (definition.geometry === 'area') {
    const polygon = L.polygon(points, style).addTo(layer)
    if (definition.id === 'reservoir' && points.length >= 3) {
      const dam = [points[points.length - 1]!, points[0]!]
      L.polyline(dam, { color: '#fff', weight: 6, opacity: 0.85, lineCap: 'butt', interactive: false }).addTo(layer)
      L.polyline(dam, { color: definition.color, weight: 3.5, lineCap: 'butt', interactive: false }).addTo(layer)
    }
    return polygon
  }

  const railway = definition.id === 'railway'
  const expressway = definition.id === 'expressway'
  L.polyline(points, { color: '#fff', opacity: 0.8, weight: expressway ? 9 : railway ? 7 : 5, interactive: false }).addTo(layer)
  const line = L.polyline(points, { ...style, weight: expressway ? 6 : railway ? 5 : 2.5 }).addTo(layer)
  if (railway) {
    L.polyline(points, { color: '#fff', weight: 2.8, dashArray: '10 10', dashOffset: '-10', lineCap: 'butt', interactive: false }).addTo(layer)
  } else if (expressway) {
    L.polyline(points, { color: '#ffd541', weight: 2.5, lineCap: 'butt', interactive: false }).addTo(layer)
  } else if (definition.id === 'campus-fence') {
    L.polyline(points, { color: definition.color, weight: 7, dashArray: '2 10', lineCap: 'butt', interactive: false }).addTo(layer)
  } else if (definition.id === 'great-wall') {
    const crenels = greatWallCrenels(points.map(point => map.latLngToContainerPoint(point)), map.getSize())
      .map(crenel => crenel.map(point => map.containerPointToLatLng(L.point(point.x, point.y))))
    if (crenels.length) {
      L.polyline(crenels, { color: '#fff', weight: 5, opacity: 0.8, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(layer)
      L.polyline(crenels, { color: definition.color, weight: 2.5, lineCap: 'butt', lineJoin: 'miter', interactive: false }).addTo(layer)
    }
  }
  return line
}
