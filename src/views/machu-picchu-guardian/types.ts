import type * as THREE from 'three'

export type SiteId = 'viewpoint' | 'archives' | 'terrace' | 'drain' | 'plaza' | 'station'
export type MoveAction = 'forward' | 'backward' | 'left' | 'right'
export type SceneMode = 'walk' | 'overview'
export type Vec3 = [number, number, number]
export interface SitePoint { id: SiteId; title: string; position: Vec3; arrival: Vec3; lookAt: Vec3 }
export interface WorldModel {
  group: THREE.Group
  walkables: THREE.Object3D[]
  colliders: THREE.Box3[]
  sites: SitePoint[]
  spawn: Vec3
  spawnLookAt: Vec3
  update(time: number, delta: number): void
  setDrain(clear: boolean): void
  setVisitorPlan(plan: 'original' | 'guided'): void
  setVisitorsPlaying(playing: boolean): void
  resetVisitors(): void
  dispose(): void
}
export interface ProjectedSite { id: SiteId; x: number; y: number; distance: number; visible: boolean }
export interface CameraState { x: number; z: number; heading: number; near: SiteId | null }
export interface GameScene {
  setMode(mode: SceneMode): void
  setMoving(action: MoveAction, pressed: boolean): void
  stopMoving(): void
  setPaused(paused: boolean): void
  travelTo(id: SiteId): void
  setIntro(progress: number): void
  finishIntro(): void
  setDrain(clear: boolean): void
  setVisitorPlan(plan: 'original' | 'guided'): void
  setVisitorsPlaying(playing: boolean): void
  resetVisitors(): void
  capture(): Promise<string>
  dispose(): void
}
export interface SceneOptions {
  onReady(): void
  onError(message: string): void
  onCamera(state: CameraState): void
  onSites(sites: ProjectedSite[]): void
  onInteract(id: SiteId): void
}
export interface PhotoRecord { id: string; data: string; caption: string; site: SiteId; createdAt: string }
export interface InvestigationNote { observation: string; cause: string; source: string }
export interface PlayerRecord {
  version: 1
  name: string
  visited: SiteId[]
  notes: Record<SiteId, InvestigationNote>
  photos: PhotoRecord[]
  proposal: { priority: string; measures: string; tradeoffs: string; evaluation: string }
  reflection: string
  introSeen: boolean
  currentSite: SiteId
  updatedAt: string
}
