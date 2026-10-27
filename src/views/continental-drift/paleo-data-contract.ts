import type { ProjectedMapData, ProjectedSurfaceInitial } from './tectonic-geometry'

export type PaleoNodeSource = { ageMa: number; land: string }
export type PreparedPaleoFeature = {
  id: string
  properties: Record<string, unknown> | null
  referenceAgeMa: number
  unitTriangles: Float32Array
  center: [number, number, number]
  area: number
  initial: ProjectedSurfaceInitial
}
export type PaleoPreparationTimings = {
  fetchMs: number; parseMs: number; triangulateMs: number
  sourceUvMs: number; measuresMs: number; initialMs: number; totalMs: number
}
export type PreparedPaleoNode = {
  ageMa: number
  features: PreparedPaleoFeature[]
  bytes: number
  timings: PaleoPreparationTimings
  sourceCacheAges: number[]
}
/** Quaternions already mean q(targetAge) * inverse(q(feature.referenceAgeMa)). */
export type PaleoRotation = { id: string; quaternion: [number, number, number, number] }
export type PaleoProjectionRequest = { nodeAge: number; targetAge: number; rotations: PaleoRotation[] }
export type ProjectedPaleoFeature = ProjectedMapData & { index: number; id: string }
export type ProjectedPaleoFrame = {
  nodeAge: number
  targetAge: number
  features: ProjectedPaleoFeature[]
  elapsedMs: number
  sourceCacheAges: number[]
}
export type PaleoWorkerRequest =
  | { type: 'prepare'; requestId: number; node: PaleoNodeSource }
  | { type: 'project'; requestId: number; node: PaleoNodeSource; request: PaleoProjectionRequest }
  | { type: 'cancel'; requestId: number }
  | { type: 'configure'; maxSourceNodes: number }
export type PaleoWorkerResponse =
  | { type: 'prepared'; requestId: number; value: PreparedPaleoNode }
  | { type: 'projected'; requestId: number; value: ProjectedPaleoFrame }
  | { type: 'error'; requestId: number; message: string; name: string }

