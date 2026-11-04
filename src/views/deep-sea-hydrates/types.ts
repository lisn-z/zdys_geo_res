import type { Group, Vector3 } from 'three'

export type LessonStep = 'resource' | 'pressure' | 'extraction' | 'protection'
export type CameraView = 'overview' | 'section' | 'dive' | 'platform'
export type FeatureId = 'platform' | 'riser' | 'wellhead' | 'hydrate' | 'sediment' | 'rov' | 'monitor'
export type Marker = { id: FeatureId; x: number; y: number; visible: boolean }
export interface HydrateModel {
  group: Group
  anchors: Record<FeatureId, Vector3>
  update: (elapsed: number, progress: number, extracting: boolean, depth: number) => void
  setSection: (enabled: boolean) => void
  setWaterVisible: (visible: boolean) => void
  dispose: () => void
}
export interface SceneController {
  setStep: (step: LessonStep) => void
  setView: (view: CameraView) => void
  setDepth: (depth: number) => void
  setProgress: (progress: number) => void
  setPlaying: (playing: boolean) => void
  setWaterVisible: (visible: boolean) => void
  focus: (id: FeatureId, detail?: boolean) => void
  reset: () => void
  zoom: (direction: number) => void
  dispose: () => void
}
export interface SceneCallbacks {
  onMarkers: (markers: Marker[]) => void
  onProgress: (progress: number) => void
  onReady: () => void
  onError: (message: string) => void
}
