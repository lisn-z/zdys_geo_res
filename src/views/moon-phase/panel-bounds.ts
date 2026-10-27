export type PanelRect = { x: number; y: number; width: number; height: number }
export type PanelBounds = { left: number; top: number; right: number; bottom: number }

/** Coordinates are CSS pixels in the panel's positioning container. */
export function getPanelBounds(visible: PanelBounds, headerBottom: number, bottomInset = 10): PanelBounds {
  const width = Math.max(1, visible.right - visible.left)
  const height = Math.max(1, visible.bottom - visible.top)
  const marginX = Math.min(10, Math.max(0, (width - 1) / 2))
  const marginBottom = Math.min(Math.max(0, bottomInset), Math.max(0, height - 1))
  const bottom = Math.max(visible.top + 1, visible.bottom - marginBottom)
  const top = Math.min(bottom - 1, Math.max(visible.top, headerBottom + 8))
  return { left: visible.left + marginX, right: visible.left + width - marginX, top, bottom }
}

export function fitPanelRect(rect: PanelRect, bounds: PanelBounds): PanelRect {
  const width = Math.max(1, Math.min(rect.width, bounds.right - bounds.left))
  const height = Math.max(1, Math.min(rect.height, bounds.bottom - bounds.top))
  return {
    width, height,
    x: Math.max(bounds.left, Math.min(rect.x, bounds.right - width)),
    y: Math.max(bounds.top, Math.min(rect.y, bounds.bottom - height)),
  }
}

export function resizePanelRect(start: PanelRect, dx: number, dy: number, fromRight: boolean,
  minimum: { width: number; height: number }, bounds: PanelBounds): PanelRect {
  const original = fitPanelRect(start, bounds)
  const right = original.x + original.width
  const maxWidth = Math.max(1, fromRight ? bounds.right - original.x : right - bounds.left)
  const maxHeight = Math.max(1, bounds.bottom - original.y)
  // The visible area wins over the preferred minimum in a small embedded page.
  const width = Math.max(Math.min(minimum.width, maxWidth), Math.min(maxWidth, original.width + (fromRight ? dx : -dx)))
  const height = Math.max(Math.min(minimum.height, maxHeight), Math.min(maxHeight, original.height + dy))
  return fitPanelRect({ x: fromRight ? original.x : right - width, y: original.y, width, height }, bounds)
}
