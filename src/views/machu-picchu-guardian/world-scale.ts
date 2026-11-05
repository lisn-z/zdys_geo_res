import type { Vec3 } from './types'

/** The archaeological teaching layout uses metres for horizontal and vertical
 * distances alike. Visitors, doorways, stairs and districts share one scale. */
export const WORLD_HORIZONTAL_SCALE = 1
export const toWorldXZ = (value: number): number => value * WORLD_HORIZONTAL_SCALE
export const toCanonicalXZ = (value: number): number => value / WORLD_HORIZONTAL_SCALE
export const toWorldPoint = (point: readonly [number, number]): [number, number] => [toWorldXZ(point[0]), toWorldXZ(point[1])]
export const toWorldVec3 = (point: readonly [number, number, number]): Vec3 => [toWorldXZ(point[0]), point[1], toWorldXZ(point[2])]
