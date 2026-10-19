type LayerPreviewId = 'latitude' | 'longitude' | 'tropics' | 'polarCircles'
type Point3 = { x: number; y: number; z: number }

const DEG = Math.PI / 180
const TROPIC = (23 + 26 / 60) * DEG
const ELEVATION = 8 * DEG
const RADIUS = 48
const CENTER_X = 60
const CENTER_Y = 54

/** True orthographic sphere projection, with both polar circles in view. */
function visiblePath(points: Point3[], elevation = ELEVATION): string {
  const cos = Math.cos(elevation)
  const sin = Math.sin(elevation)
  let path = ''
  let connected = false
  for (const point of points) {
    const depth = point.y * sin + point.z * cos
    if (depth < 0) { connected = false; continue }
    const x = CENTER_X + RADIUS * point.x
    const y = CENTER_Y - RADIUS * (point.y * cos - point.z * sin)
    path += `${connected ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
    connected = true
  }
  return path
}

function latitudePath(latitude: number): string {
  const radius = Math.cos(latitude)
  return visiblePath(Array.from({ length: 361 }, (_, index) => {
    const longitude = (index - 180) * DEG
    return { x: radius * Math.sin(longitude), y: Math.sin(latitude), z: radius * Math.cos(longitude) }
  }))
}

function longitudePath(longitude: number): string {
  return visiblePath(Array.from({ length: 181 }, (_, index) => {
    const latitude = (index - 90) * DEG
    return { x: Math.cos(latitude) * Math.sin(longitude), y: Math.sin(latitude), z: Math.cos(latitude) * Math.cos(longitude) }
  }), 0)
}

function icon(id: LayerPreviewId): string {
  const definitions = {
    latitude: { title: '普通纬线：与赤道平行的圆', color: '#a8fff6', paths: [-60, -30, 30, 60].map(angle => latitudePath(angle * DEG)), dashed: false },
    longitude: { title: '经线：连接南北两极的半圆', color: '#a8fff6', paths: [-70, -35, 0, 35, 70].map(angle => longitudePath(angle * DEG)), dashed: false },
    tropics: { title: '南北回归线：南北纬23°26′', color: '#ffd447', paths: [-TROPIC, TROPIC].map(latitudePath), dashed: true },
    polarCircles: { title: '南北极圈：南北纬66°34′', color: '#66d9ff', paths: [TROPIC - Math.PI / 2, Math.PI / 2 - TROPIC].map(latitudePath), dashed: true },
  }
  const definition = definitions[id]
  const strokes = definition.paths.map(path => `<path d="${path}"/>`).join('')
  const poles = id === 'longitude'
    ? `<circle cx="60" cy="${CENTER_Y - RADIUS}" r="2.1" fill="#d2fff9"/><circle cx="60" cy="${CENTER_Y + RADIUS}" r="2.1" fill="#d2fff9"/>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 112" role="img" aria-label="${definition.title}">
    <defs><radialGradient id="sphere" cx="30%" cy="23%" r="88%"><stop stop-color="#407b86"/><stop offset=".48" stop-color="#205767"/><stop offset="1" stop-color="#0a2c3c"/></radialGradient></defs>
    <ellipse cx="60" cy="107" rx="30" ry="3" fill="#174b5b" opacity=".12"/>
    <circle cx="60" cy="54" r="48" fill="url(#sphere)" stroke="#2c6572" stroke-width="1"/>
    <g fill="none" stroke="${definition.color}" stroke-width="${definition.dashed ? 3.4 : 2.8}" stroke-linecap="round" stroke-linejoin="round" ${definition.dashed ? 'stroke-dasharray="4.5 3.5"' : ''}>${strokes}</g>
    ${poles}
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Vector previews stay legible at toolbox size and do not depend on WebGL. */
export const LAYER_PREVIEW_ICONS: Record<LayerPreviewId, string> = {
  latitude: icon('latitude'),
  longitude: icon('longitude'),
  tropics: icon('tropics'),
  polarCircles: icon('polarCircles'),
}
