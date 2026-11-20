export type RecordMode = 'manual' | 'quiet' | 'gentle' | 'rapid' | 'burst'

export const RECORD_MODES: { id: RecordMode; label: string; note: string }[] = [
  { id: 'manual', label: '手动摇动', note: '亲手左右摇动底座，记录这次实际操作。' },
  { id: 'quiet', label: '静置基准', note: '不施加模拟摇动，观察静置时的记录线。' },
  { id: 'gentle', label: '轻缓摇动', note: '模拟幅度较小、节奏较慢的连续摇动。' },
  { id: 'rapid', label: '急促摇动', note: '模拟节奏较快的连续摇动，观察记录线的疏密。' },
  { id: 'burst', label: '一阵强摇', note: '模拟短时较大幅度摇动，再观察停摇后的余摆。' },
]

export const PRESET_DURATION = 12
const START = 1.5
const smooth = (x: number) => {
  const value = Math.max(0, Math.min(1, x))
  return value * value * (3 - 2 * value)
}

/**
 * Simulated base targets in cm, not pre-drawn traces or earthquake magnitudes.
 * Feed these targets through createInstrumentPhysics().step exactly as manual
 * input. All presets start with 1.5 s at rest and stop forcing before the record
 * ends, leaving time for the instrument's own damped motion to be recorded.
 * Each complete preset joins rest with zero target position and zero end slope.
 * Manual input belongs to the caller; this function supplies no manual motion.
 */
export function getPresetTarget(mode: RecordMode, t: number): number {
  if (!Number.isFinite(t) || t <= START || t >= PRESET_DURATION || mode === 'quiet' || mode === 'manual') return 0
  const elapsed = t - START
  let amplitude: number
  let frequency: number
  let end: number
  let rise: number
  let fall: number
  switch (mode) {
    case 'gentle':
      amplitude = .55; frequency = .45; end = 8.5; rise = 1; fall = .9
      break
    case 'rapid':
      amplitude = 1.5; frequency = 1.55; end = 8.5; rise = .65; fall = .65
      break
    case 'burst':
      amplitude = 2; frequency = .95; end = 6.5; rise = .75; fall = .6
      break
  }
  if (t >= end) return 0
  const envelope = smooth(elapsed / rise) * smooth((end - t) / fall)
  return amplitude * envelope * Math.sin(2 * Math.PI * frequency * elapsed)
}
