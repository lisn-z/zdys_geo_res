export interface ContourAnchor {
  id: string
  contourId: string
  lat: number
  lon: number
  value: number
}

// Trace connected contours on the source grid, including closed loops between
// meridians. Shared edge IDs also join contours across the date line.
export function traceContourAnchors(sample: (lon: number, lat: number) => number, levels: readonly number[]) {
  const cols = 144,
    rows = 72,
    step = 2.5
  const values = Float64Array.from({ length: cols * (rows + 1) }, (_, i) =>
    sample(-180 + (i % cols) * step, -90 + Math.floor(i / cols) * step),
  )
  const anchors: ContourAnchor[] = []
  for (const level of levels) {
    const horizontal = new Int32Array(values.length).fill(-1)
    const vertical = new Int32Array(cols * rows).fill(-1)
    const nodes: Omit<ContourAnchor, 'contourId'>[] = [],
      parents: number[] = []
    const root = (i: number): number => {
      while (parents[i] !== i) {
        parents[i] = parents[parents[i]!]!
        i = parents[i]!
      }
      return i
    }
    const join = (a: number, b: number) => {
      parents[root(b)] = root(a)
    }
    const edge = (a: number, b: number, row: number, col: number, east: boolean) => {
      if (!((a <= level && b > level) || (b <= level && a > level))) return -1
      const t = (level - a) / (b - a),
        index = nodes.length
      nodes.push({
        id: `isobar-${level}-${east ? 'h' : 'v'}-${row}-${col}`,
        value: level,
        lon: -180 + (col + (east ? t : 0)) * step,
        lat: -90 + (row + (east ? 0 : t)) * step,
      })
      parents.push(index)
      return index
    }
    for (let row = 0; row <= rows; row++)
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col,
          a = values[index]!
        horizontal[index] = edge(a, values[row * cols + ((col + 1) % cols)]!, row, col, true)
        if (row < rows) vertical[index] = edge(a, values[index + cols]!, row, col, false)
      }
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col,
          next = row * cols + ((col + 1) % cols)
        const edges = [horizontal[i]!, vertical[next]!, horizontal[i + cols]!, vertical[i]!]
        const crossed = edges.filter((index) => index >= 0)
        if (crossed.length === 2) join(crossed[0]!, crossed[1]!)
        else if (crossed.length === 4) {
          // Asymptotic decider for the two possible saddle connections.
          const determinant =
            (values[i]! - level) * (values[next + cols]! - level) -
            (values[next]! - level) * (values[i + cols]! - level)
          if (determinant >= 0) {
            join(edges[0]!, edges[1]!)
            join(edges[2]!, edges[3]!)
          } else {
            join(edges[0]!, edges[3]!)
            join(edges[1]!, edges[2]!)
          }
        }
      }
    nodes.forEach((node, index) => anchors.push({ ...node, contourId: `contour-${level}-${root(index)}` }))
  }
  return anchors
}
