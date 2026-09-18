export interface MapRectangle { x: number; y: number; width: number; height: number }

/** Both tile mosaics are 6 × 3 square Web-Mercator tiles. Never stretch them. */
export function fitMapRectangle(width: number, height: number, topInset = 0, bottomInset = 0): MapRectangle {
  const top = Math.min(Math.max(0, topInset), Math.max(0, height - 1))
  const bottom = Math.min(Math.max(0, bottomInset), Math.max(0, height - top - 1))
  const usableHeight = Math.max(1, height - top - bottom)
  const mapWidth = Math.max(0, Math.min(width, usableHeight * 2))
  const mapHeight = mapWidth / 2
  return { x: (width - mapWidth) / 2, y: top + (usableHeight - mapHeight) / 2, width: mapWidth, height: mapHeight }
}

export function mapToScreen(point: { x: number; y: number }, rectangle: MapRectangle) {
  return { x: rectangle.x + point.x * rectangle.width, y: rectangle.y + point.y * rectangle.height }
}

export const VORTEX_MAP_PROFILE = {
  xScale: 1.48, yScale: 0.70, eyeRadius: 0.06, eyewallRadius: 0.12, outerRadius: 0.36,
} as const

export function vortexRadius(point: { x: number; y: number }, center: { x: number; y: number }) {
  // Normalized map x spans twice the distance of normalized map y.
  return Math.hypot((point.x - center.x) * 2 / VORTEX_MAP_PROFILE.xScale,
    (point.y - center.y) / VORTEX_MAP_PROFILE.yScale)
}
