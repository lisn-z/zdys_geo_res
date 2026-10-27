import type * as THREE from 'three'

export type InstrumentId = 'screen' | 'rain' | 'wind'
export type InstrumentAction = 'screen-door' | 'rain-cup'
export type ViewMode = 'overview' | 'walk' | InstrumentId
export interface WeatherState {
  temperature: number
  maximum: number
  minimum: number
  rainfall: number
  windDirection: number
  windSpeed: number
  screenOpen: boolean
  rainCutaway: boolean
  raining: boolean
  windVisible?: boolean
}
export interface WeatherModel {
  group: THREE.Group
  anchors: Record<InstrumentId, THREE.Vector3>
  actionAnchors: Record<InstrumentAction, THREE.Object3D>
  update: (state: WeatherState, delta: number, elapsed: number) => void
  dispose: () => void
}
export interface OverlayPoint { id: InstrumentId; x: number; y: number; visible: boolean }
export interface ActionOverlayPoint { id: InstrumentAction; x: number; y: number; visible: boolean }
export interface WeatherScene {
  setWeather: (state: WeatherState) => void
  setView: (mode: ViewMode) => void
  reset: () => void
  dispose: () => void
}
export interface SceneCallbacks {
  onOverlay: (points: OverlayPoint[]) => void
  onActions?: (points: ActionOverlayPoint[]) => void
  onSelect: (id: InstrumentId) => void
  onReady?: () => void
  onError?: (message: string) => void
}
