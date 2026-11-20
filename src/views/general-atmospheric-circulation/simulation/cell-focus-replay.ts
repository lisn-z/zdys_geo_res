export type CellFocusKind = 'single' | 'hadley' | 'ferrel' | 'polar'

/** A focused cell starts its formation replay only after the camera arrives. */
export class CellFocusReplay {
  kind: CellFocusKind | null = null
  waitingForArrival = false
  progress = 0
  elapsed = 0

  begin(kind: CellFocusKind) {
    this.kind = kind
    this.waitingForArrival = true
    this.progress = 0
    this.elapsed = 0
  }

  arrive() {
    if (this.kind && this.waitingForArrival) this.waitingForArrival = false
  }

  advance(simDelta: number) {
    if (!this.kind || this.waitingForArrival || !Number.isFinite(simDelta) || simDelta <= 0) return
    this.elapsed += simDelta
    this.progress = Math.min(1, this.progress + simDelta * .20)
  }

  clear() {
    this.kind = null
    this.waitingForArrival = false
    this.progress = 0
    this.elapsed = 0
  }

  revealFor(kind: CellFocusKind | 'single', fallback: number) {
    if (!this.kind) return fallback
    if (kind !== this.kind) return 1
    return this.waitingForArrival ? 0 : this.progress
  }

  timeFor(kind: CellFocusKind | 'single', fallback: number) {
    return kind === this.kind ? this.elapsed : fallback
  }
}
