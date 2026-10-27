export const HORIZONTAL_DIRECTIONS = [
  { id: 'east', name: '东', latin: 'E', heading: 90 },
  { id: 'south', name: '南', latin: 'S', heading: 180 },
  { id: 'west', name: '西', latin: 'W', heading: 270 },
  { id: 'north', name: '北', latin: 'N', heading: 0 },
] as const

export type CardinalDirection = typeof HORIZONTAL_DIRECTIONS[number]['id']

/** 只对精确地理极点改变文案；接近极点仍有正常地理方位。 */
export function isGeographicPole(latitude: number): boolean {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
    throw new RangeError('纬度须在 −90° 至 90° 内')
  }
  return Math.abs(latitude) === 90
}

/** 数学基底继续沿参考经线延拓；标签表达沿地表离开极点的地理方向。 */
export function getDirectionLabel(latitude: number, direction: CardinalDirection, includeLatin = false): string {
  if (isGeographicPole(latitude)) return latitude > 0 ? '南' : '北'
  const item = HORIZONTAL_DIRECTIONS.find(item => item.id === direction)
  if (!item) throw new RangeError('未知的水平方向')
  return includeLatin ? `${item.name} ${item.latin}` : item.name
}

export function getPoleDirectionNote(latitude: number): string {
  if (!isGeographicPole(latitude)) return ''
  return latitude > 0 ? '北极点：沿地表离开都向南' : '南极点：沿地表离开都向北'
}
