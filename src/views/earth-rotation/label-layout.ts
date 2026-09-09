export interface LabelSize {
  width: number
  height: number
}

export interface LabelBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface LabelCandidate {
  x: number
  y: number
  visible: boolean
}

// Conservative first-frame bounds for the 14px grid / 15px special-latitude labels.
export function getGridLabelFallbackSize(label: { text: string; special?: boolean }): LabelSize {
  return {
    width: label.text.length * (label.special ? 15 : 10) + (label.special ? 22 : 18),
    height: label.special ? 30 : 28,
  }
}

// Both overlays use translate(-50%, -50%); all dimensions are CSS pixels, not device pixels.
export function getLabelBounds(point: Pick<LabelCandidate, 'x' | 'y'>, size: LabelSize): LabelBounds {
  return {
    left: point.x - size.width / 2,
    top: point.y - size.height / 2,
    right: point.x + size.width / 2,
    bottom: point.y + size.height / 2,
  }
}

export function findLabelPlacement<T extends LabelCandidate>(
  candidates: readonly T[],
  size: LabelSize,
  occupied: readonly LabelBounds[],
  viewport: LabelSize,
  gap = 6,
): { candidate: T; bounds: LabelBounds } | null {
  for (const candidate of candidates) {
    if (!candidate.visible || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) continue
    const bounds = getLabelBounds(candidate, size)
    if (bounds.left < gap || bounds.top < gap ||
      bounds.right > viewport.width - gap || bounds.bottom > viewport.height - gap) continue
    const overlaps = occupied.some(other => (
      bounds.left < other.right + gap && bounds.right > other.left - gap &&
      bounds.top < other.bottom + gap && bounds.bottom > other.top - gap
    ))
    if (!overlaps) return { candidate, bounds }
  }
  return null
}
