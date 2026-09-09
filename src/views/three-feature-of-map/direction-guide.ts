/** Screen directions for a north-up map: +x is east and +y is south. */
export const mapDirections = [
  { label: '北', bearing: 0, dx: 0, dy: -1 },
  { label: '东北', bearing: 45, dx: Math.SQRT1_2, dy: -Math.SQRT1_2 },
  { label: '东', bearing: 90, dx: 1, dy: 0 },
  { label: '东南', bearing: 135, dx: Math.SQRT1_2, dy: Math.SQRT1_2 },
  { label: '南', bearing: 180, dx: 0, dy: 1 },
  { label: '西南', bearing: 225, dx: -Math.SQRT1_2, dy: Math.SQRT1_2 },
  { label: '西', bearing: 270, dx: -1, dy: 0 },
  { label: '西北', bearing: 315, dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 },
] as const

/** Use the same metrics for the SVG and its Leaflet icon size/anchor. */
export function directionGuideMetrics(requestedRadius: number) {
  const radius = Number.isFinite(requestedRadius)
    ? Math.min(260, Math.max(72, requestedRadius))
    : 136
  const center = radius + 30
  return { radius, center, size: center * 2 }
}

/** The guide uses pixels rather than geographic offsets so it stays readable on zoom. */
export function directionGuideSvg(requestedRadius: number): string {
  const { radius, center, size } = directionGuideMetrics(requestedRadius)
  const n = (value: number) => Number(value.toFixed(3))
  const rays = mapDirections.map(({ label, bearing, dx, dy }) => {
    const cardinal = bearing % 90 === 0
    const color = bearing === 0 ? '#bc362d' : cardinal ? '#174b60' : '#416965'
    const position = (distance: number) => ({
      x: center + dx * distance,
      y: center + dy * distance,
    })
    const start = position(24)
    const end = position(radius - 9)
    const tip = position(radius)
    const base = position(radius - 10)
    const labelPosition = position(radius + 16)
    const arrow = [
      `${n(tip.x)},${n(tip.y)}`,
      `${n(base.x - dy * 4.5)},${n(base.y + dx * 4.5)}`,
      `${n(base.x + dy * 4.5)},${n(base.y - dx * 4.5)}`,
    ].join(' ')
    const line = `x1="${n(start.x)}" y1="${n(start.y)}" x2="${n(end.x)}" y2="${n(end.y)}"`
    return `<g class="direction-ray" data-bearing="${bearing}">
      <line ${line} stroke="#fff" stroke-width="5" stroke-opacity="0.88" />
      <line ${line} stroke="${color}" stroke-width="${cardinal ? 2.1 : 1.7}" stroke-dasharray="6 5" />
      <polygon points="${arrow}" fill="${color}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" />
      <text class="direction-ray-label" x="${n(labelPosition.x)}" y="${n(labelPosition.y)}" fill="${color}" stroke="#fff" stroke-width="4" paint-order="stroke" text-anchor="middle" dominant-baseline="central" font-size="${cardinal ? 15 : 13}" font-weight="${cardinal ? 800 : 700}">${label}</text>
    </g>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="以A点为中心的八方向参考" fill="none" stroke-linecap="round" font-family="Microsoft YaHei, PingFang SC, sans-serif">${rays}</svg>`
}
