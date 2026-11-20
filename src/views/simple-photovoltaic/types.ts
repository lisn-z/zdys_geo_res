export type PartId = 'stand' | 'panel' | 'lamp' | 'battery' | 'positive' | 'negative'
export type SupplyMode = 'direct' | 'battery'
export type ViewMode = 'perspective' | 'front' | 'top'
export interface Guide { x: number; y: number; radius: number; visible: boolean }
export type Guides = Record<PartId | 'tilt', Guide>
export interface Conditions { tilt: number; azimuth: number; hour: number }
export interface Output { power: number; incidence: number; altitude: number; sun: [number, number, number] }
export interface SceneState extends Conditions {
  installed: PartId[]
  activePart: PartId | null
  dragStatus: 'valid' | 'invalid' | null
  power: number
  lampPower: number
  batteryLevel: number
  supplyMode: SupplyMode
  experimenting: boolean
}
export interface ExperimentRecord extends Conditions { id: number; name: string; power: number; incidence: number }
export interface PhotovoltaicScene {
  update(state: SceneState): void
  setInteractionLocked(locked: boolean): void
  setView(view: ViewMode): void
  capture(): string
  dispose(): void
}
