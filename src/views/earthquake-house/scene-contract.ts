import type { HouseView, RoomId } from './lesson'
export type ProjectedSafetyPoint = { id: number; x: number; y: number; visible: boolean }
export interface HouseSceneCallbacks {
  onPoints?: (points: ProjectedSafetyPoint[]) => void
  onSelect?: (id: number) => void
  onReady?: () => void
  onError?: (message: string) => void
  onViewChange?: (view: HouseView) => void
}
export interface HouseSceneController {
  setView(view: HouseView): void
  setExtensionVisible(enabled: boolean): void
  selectPoint(id: number | null): void
  setAutoRotate(enabled: boolean): void
  setLabelsVisible(visible: boolean): void
  enterRoom(room: RoomId): void
  reset(): void
  zoom(delta: number): void
  dispose(): void
}
