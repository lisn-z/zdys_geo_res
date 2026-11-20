export type RoofKind = 'shanxi' | 'anhui' | 'xinjiang'
export type LessonMode = 'explore' | 'experiment' | 'compare'
export type ViewMode = 'perspective' | 'top' | 'drainage'
export interface Conditions { slope: number; intensity: number; outlet: 'open' | 'blocked' }
export interface WaterResult { time: number; rainVolume: number; drained: number; retained: number; peakRetained: number; rainActive: boolean; outflowRate: number }
export interface SceneState {
  mode: LessonMode; roof: RoofKind; slope: number; intensity: number; outlet: 'open' | 'blocked';
  running: boolean; time: number; water: WaterResult; showFlow: boolean
}
export interface ScreenPoint { x: number; y: number; visible: boolean }
export interface RoofScene {
  update(state: SceneState): void
  setView(view: ViewMode): void
  setInteractionLocked(locked: boolean): void
  capture(): string
  dispose(): void
}
export interface ExperimentRecord extends Conditions { id: number; name: string; result: WaterResult }
