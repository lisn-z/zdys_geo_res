import { computed, ref } from 'vue'

export type RoundStatus = 'ready' | 'running' | 'won' | 'timeout'
export type RoundResult = 'won' | 'timeout'

/** Absolute deadlines keep background-tab throttling from extending a round. */
export function useTerrainRound(onFinish: (result: RoundResult) => void, now = Date.now) {
  const status = ref<RoundStatus>('ready')
  const remainingMs = ref(0)
  const elapsedMs = ref(0)
  const ended = computed(() => status.value === 'won' || status.value === 'timeout')
  let startedAt = 0
  let durationMs = 0

  function finish(result: RoundResult) {
    if (status.value !== 'running') return
    status.value = result
    onFinish(result)
  }

  function tick() {
    if (status.value !== 'running') return
    elapsedMs.value = Math.min(durationMs, Math.max(0, now() - startedAt))
    remainingMs.value = Math.max(0, durationMs - elapsedMs.value)
    if (remainingMs.value === 0) finish('timeout')
  }

  function start(seconds: number) {
    if (status.value !== 'ready') return
    durationMs = seconds * 1000
    startedAt = now()
    elapsedMs.value = 0
    remainingMs.value = durationMs
    status.value = 'running'
  }

  function recordCorrect(updateProgress: () => boolean) {
    // Check the deadline before awarding a point; settle the same accepted event.
    tick()
    if (status.value !== 'running') return false
    if (updateProgress()) finish('won')
    return true
  }

  function reset() {
    status.value = 'ready'
    elapsedMs.value = 0
    remainingMs.value = 0
    startedAt = 0
    durationMs = 0
  }

  return { status, remainingMs, elapsedMs, ended, start, tick, recordCorrect, reset }
}

export function formatRoundTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
