export type StationPanelLayout = {
  width: number
  margin: number
  gap: number
  activeOnly: boolean
  rightOffsets: number[]
}

/** Fit all compared stations on one row, or use tabs when full-height cards cannot fit. */
export function getStationPanelLayout(availableWidth: number, count: number): StationPanelLayout {
  const width = Math.max(1, availableWidth)
  const total = Math.max(1, Math.min(3, Math.floor(count)))
  const margin = Math.min(width > 820 ? 24 : 14, Math.max(0, (width - 1) / 2))
  const gap = 12
  const inner = Math.max(1, width - margin * 2)
  const sharedWidth = (inner - gap * (total - 1)) / total
  const activeOnly = total > 1 && sharedWidth < 240
  const cardWidth = Math.min(320, Math.max(1, activeOnly ? inner : sharedWidth))
  return {
    width: cardWidth,
    margin,
    gap,
    activeOnly,
    rightOffsets: Array.from({ length: total }, (_, index) => margin + (activeOnly ? 0 : index * (cardWidth + gap))),
  }
}
