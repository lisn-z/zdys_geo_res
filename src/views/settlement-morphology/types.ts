export type Landscape = 'plain' | 'valley' | 'river' | 'coast' | 'dubai'
export type StudyMode = 'observe' | 'build'
export type Tool = 'orbit' | 'house' | 'road' | 'erase'
export type CameraView = 'perspective' | 'overhead' | 'ground'
export interface Placement { id: string; kind: 'house' | 'road'; x: number; z: number; rotation: number }
export interface SiteResult { valid: boolean; reason: string; height: number; slope: number; nearWater: boolean }
export interface SceneStats { houses: number; roads: number; spread: string; nearWater: number }
export interface SceneLabel { id: string; text: string; x: number; y: number; visible: boolean }
export interface SceneOptions {
  onReady(): void
  onError(message: string): void
  onFeedback(message: string, valid: boolean): void
  onStats(stats: SceneStats): void
  onLabels(labels: SceneLabel[]): void
}
export interface SettlementScene {
  setLandscape(id: Landscape): void
  setMode(mode: StudyMode): void
  setTool(tool: Tool): void
  setView(view: CameraView): void
  focusLabel(id: string): void
  setLabels(visible: boolean): void
  setConstraints(visible: boolean): void
  setGrowth(value: number): void
  placeAtClient(x: number, y: number, kind: 'house' | 'road'): void
  rotatePlacement(): void
  undo(): void
  clear(): void
  reset(): void
  zoom(direction: number): void
  dispose(): void
}
