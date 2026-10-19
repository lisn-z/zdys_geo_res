export type TraceId = 'equator' | 'north-tropic' | 'south-tropic' | 'west-boundary' | 'east-boundary'

export const TRACE_ORDER: readonly TraceId[] = [
  'equator', 'north-tropic', 'south-tropic', 'west-boundary', 'east-boundary',
]

export interface TraceDefinition {
  label: string
  color: string
  concept: string
}

export const TRACE_DEFINITIONS: Record<TraceId, TraceDefinition> = {
  equator: {
    label: '赤道 0°', color: '#ff4058',
    concept: '赤道是最大的纬线圈，所在平面经过地心并垂直于地轴，把地球分为南、北半球。',
  },
  'north-tropic': {
    label: '北回归线 23°26′N', color: '#ffd447',
    concept: '北回归线位于北纬 23°26′，是太阳直射点能到达的最北界线。',
  },
  'south-tropic': {
    label: '南回归线 23°26′S', color: '#ffd447',
    concept: '南回归线位于南纬 23°26′，是太阳直射点能到达的最南界线。',
  },
  'west-boundary': {
    label: '20°W 经线', color: '#ab83ee',
    concept: '20°W 与 160°E 两条相对的经线组成经线圈，通常用作东、西半球的分界线。20°W 经线本身只是这个圈的一半。',
  },
  'east-boundary': {
    label: '160°E 经线', color: '#ab83ee',
    concept: '160°E 与 20°W 相差 180°，共同构成东、西半球的分界线；每一条经线都是连接南、北极的半圆。',
  },
}

export function createTraceProgress(): Record<TraceId, number> {
  return { equator: 0, 'north-tropic': 0, 'south-tropic': 0, 'west-boundary': 0, 'east-boundary': 0 }
}

export interface TracePoint { x: number; y: number }

type TraceRail = { axis: 'x' | 'y'; direction: number; coordinates: number[]; span: number }
const railCache = new WeakMap<readonly TracePoint[], TraceRail | null>()

function traceRail(points: readonly TracePoint[]): TraceRail | null {
  if (railCache.has(points)) return railCache.get(points)!
  if (points.length < 2 || points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    railCache.set(points, null)
    return null
  }
  const first = points[0]!
  const last = points[points.length - 1]!
  const axis = Math.abs(last.x - first.x) >= Math.abs(last.y - first.y) ? 'x' : 'y'
  const direction = Math.sign(last[axis] - first[axis])
  const coordinates = points.map(point => (point[axis] - first[axis]) * direction)
  const span = coordinates[coordinates.length - 1]!
  // Each visible latitude half is monotonic horizontally; each pole-to-pole
  // meridian is monotonic vertically. A closed circle must be split first.
  const valid = span > 1e-8 && coordinates.every((value, index) => index === 0 || value >= coordinates[index - 1]! - 1e-8)
  const rail: TraceRail | null = valid ? { axis, direction, coordinates, span } : null
  railCache.set(points, rail)
  return rail
}

/**
 * A captured brush slides along a fixed rail. Pointer motion toward the end
 * determines progress; perpendicular hand drift cannot stop the stroke. The
 * output stays on the sampled geographic curve, never on the pointer's path.
 * Call only during a gesture that began on the brush (not on the end marker).
 */
export function advanceTrace(points: readonly TracePoint[], current: number, pointer: TracePoint): number {
  const progress = Number.isFinite(current) ? Math.max(0, Math.min(1, current)) : 0
  if (progress === 1 || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return progress
  const rail = traceRail(points)
  if (!rail) return progress
  const coordinate = (pointer[rail.axis] - points[0]![rail.axis]) * rail.direction
  if (coordinate <= 0) return progress
  // A few screen pixels of endpoint tolerance handle fractional pixel rounding.
  if (coordinate >= rail.span - Math.min(3, rail.span * 0.01)) return 1
  let lower = 0
  let upper = rail.coordinates.length - 1
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2)
    if (rail.coordinates[middle]! <= coordinate) lower = middle
    else upper = middle
  }
  const length = rail.coordinates[upper]! - rail.coordinates[lower]!
  const fraction = length > 1e-8 ? (coordinate - rail.coordinates[lower]!) / length : 0
  // Keep sample-index progress aligned with Three's equal-angle geometry.
  return Math.max(progress, Math.min(1, (lower + fraction) / (points.length - 1)))
}
