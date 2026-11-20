export type PartId='frame'|'mass'|'pen'|'paper'
export type ViewMode='workshop'|'front'|'top'
export interface Sample { t:number; base:number; mass:number; mark:number }
export interface Reading { base:number; mass:number; mark:number }
export interface InstrumentState {
  installed:PartId[]
  penGap:number
  base:number
  mass:number
  paperTravel:number
  trace:Sample[]
  activePart:PartId|null
  dragStatus?:'valid'|'invalid'|null
  phase:'assembly'|'adjust'|'record'|'review'
}
export interface Guide { x:number; y:number; radius:number; visible:boolean }
export type Guides=Record<PartId|'adjust'|'shake',Guide>
export interface RecordRun { id:number; name:string; mode:string; penGap:number; samples:Sample[]; duration:number; amplitude:number; baseAmplitude:number; reversals:number }
