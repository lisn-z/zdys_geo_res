import type {
  PaleoNodeSource, PaleoProjectionRequest, PaleoWorkerRequest, PaleoWorkerResponse,
  PreparedPaleoNode, ProjectedPaleoFrame,
} from './paleo-data-contract'
export type {
  PaleoNodeSource, PaleoProjectionRequest, PaleoRotation, PreparedPaleoFeature,
  PreparedPaleoNode, ProjectedPaleoFeature, ProjectedPaleoFrame,
} from './paleo-data-contract'

/** Worker factory is injectable for regression tests; production uses the bundled module worker. */
export type PaleoWorkerLike = {
  onmessage: ((event: MessageEvent<PaleoWorkerResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: PaleoWorkerRequest): void
  terminate(): void
}
export type PaleoLoaderOptions = {
  maxPreparedNodes?: number
  maxPreparedBytes?: number
  workerFactory?: () => PaleoWorkerLike
  onPrefetchError?: (error: Error, ageMa: number) => void
}
type Deferred<T> = { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void }
type PrepareTask = Deferred<PreparedPaleoNode> & { node: PaleoNodeSource; id: number; foreground: boolean }
type ProjectTask = Deferred<ProjectedPaleoFrame | null> & { request: PaleoProjectionRequest; id: number; generation: number }
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function abortError(message = 'Paleo loader disposed'): Error { return Object.assign(new Error(message), { name: 'AbortError' }) }

/** Bounded CPU-data prefetch, independent of the renderer's texture cache. */
export function createPaleoPrefetchLoader(options: PaleoLoaderOptions = {}) {
  const maxNodes = Math.max(1, Math.min(3, Math.floor(options.maxPreparedNodes ?? 3)))
  const maxBytes = Math.max(1, options.maxPreparedBytes ?? 96 * 1024 * 1024)
  let initialFailure: Error | null = null
  let worker: PaleoWorkerLike
  try {
    worker = options.workerFactory?.()
      ?? new Worker(new URL('./paleo-data-worker.ts', import.meta.url), { type: 'module' })
  } catch (error) {
    // A blocked module worker must not prevent the independent modern map from opening.
    // Requests reject through the normal nonblocking status path; no heavy main-thread fallback.
    initialFailure = error instanceof Error ? error : new Error(String(error))
    worker = { onmessage: null, onerror: null, postMessage() {}, terminate() {} }
  }
  const cache = new Map<number, PreparedPaleoNode>()
  const knownNodes = new Map<number, PaleoNodeSource>()
  const tasks = new Map<number, PrepareTask>()
  let queue: PrepareTask[] = []
  let activePrepare: PrepareTask | null = null
  let activeProject: ProjectTask | null = null
  let queuedProject: ProjectTask | null = null
  let nextId = 1
  let generation = 0
  let disposed = false
  let failure: Error | null = initialFailure
  let byteCount = 0

  function remember(node: PaleoNodeSource): void {
    if (!Number.isFinite(node.ageMa) || !node.land) throw new Error('Invalid paleo node')
    const previous = knownNodes.get(node.ageMa)
    if (previous && previous.land !== node.land) release(node.ageMa)
    knownNodes.set(node.ageMa, node)
  }
  function release(ageMa: number): void {
    const entry = cache.get(ageMa)
    if (entry) { byteCount -= entry.bytes; cache.delete(ageMa) }
  }
  function retain(value: PreparedPaleoNode): void {
    release(value.ageMa)
    cache.set(value.ageMa, value); byteCount += value.bytes
    // One exceptionally large requested node is still usable; never evict the just-resolved node.
    while (cache.size > maxNodes || (byteCount > maxBytes && cache.size > 1)) {
      const oldest = cache.keys().next().value as number | undefined
      if (oldest === undefined) break
      release(oldest)
    }
  }
  function peek(ageMa: number): PreparedPaleoNode | undefined {
    const entry = cache.get(ageMa)
    if (entry) { cache.delete(ageMa); cache.set(ageMa, entry) }
    return entry
  }
  function pumpPrepare(): void {
    if (disposed || failure || activePrepare || !queue.length) return
    const priority = queue.findIndex(task => task.foreground)
    activePrepare = queue.splice(priority >= 0 ? priority : 0, 1)[0]!
    worker.postMessage({ type: 'prepare', requestId: activePrepare.id, node: activePrepare.node })
  }
  function taskFor(node: PaleoNodeSource, foreground: boolean): PrepareTask {
    let task = tasks.get(node.ageMa)
    if (task) {
      if (foreground) task.foreground = true
      return task
    }
    task = { ...deferred<PreparedPaleoNode>(), node, foreground, id: nextId++ }
    tasks.set(node.ageMa, task)
    if (foreground) queue.unshift(task); else queue.push(task)
    // Observe speculative rejections even when nobody later requests the prefetched node.
    void task.promise.catch(error => { if (!task!.foreground && !disposed && error.name !== 'AbortError') options.onPrefetchError?.(error, node.ageMa) })
    pumpPrepare()
    return task
  }
  function get(node: PaleoNodeSource): Promise<PreparedPaleoNode> {
    if (disposed || failure) return Promise.reject(failure ?? abortError())
    remember(node)
    const existing = peek(node.ageMa)
    return existing ? Promise.resolve(existing) : taskFor(node, true).promise
  }
  /** Replace speculative priorities with nearest nodes along playback direction. */
  function prefetch(nodes: readonly PaleoNodeSource[]): void {
    if (disposed || failure) return
    const preferred = nodes.slice(0, maxNodes - 1)
    const wanted = new Set(preferred.map(node => node.ageMa))
    queue = queue.filter(task => {
      if (task.foreground || wanted.has(task.node.ageMa)) return true
      tasks.delete(task.node.ageMa); task.reject(abortError('Speculative node superseded')); return false
    })
    for (const node of preferred) {
      remember(node)
      if (!cache.has(node.ageMa)) taskFor(node, false)
    }
  }
  function pumpProject(): void {
    if (disposed || failure || activeProject || !queuedProject) return
    const task = queuedProject; queuedProject = null
    const node = knownNodes.get(task.request.nodeAge)
    if (!node) { task.reject(new Error(`Paleo node ${task.request.nodeAge} was not requested`)); pumpProject(); return }
    activeProject = task
    worker.postMessage({ type: 'project', requestId: task.id, node, request: task.request })
  }
  function project(request: PaleoProjectionRequest): Promise<ProjectedPaleoFrame | null> {
    if (disposed || failure) return Promise.reject(failure ?? abortError())
    if (!Number.isFinite(request.targetAge)) return Promise.reject(new Error('Invalid paleo target age'))
    const task: ProjectTask = { ...deferred<ProjectedPaleoFrame | null>(), request, id: nextId++, generation }
    // Do not invalidate an in-flight frame during normal playback: that would starve rendering.
    // Only the latest waiting pose is needed; replaced waiters settle harmlessly with null.
    queuedProject?.resolve(null)
    queuedProject = task
    pumpProject()
    return task.promise
  }
  function invalidateProjects(): void {
    generation += 1
    queuedProject?.resolve(null); queuedProject = null
    if (activeProject) {
      activeProject.resolve(null)
      worker.postMessage({ type: 'cancel', requestId: activeProject.id })
      // Retain the in-flight slot until its reply: at most one physical projection is running.
    }
  }
  function failAll(error: Error): void {
    failure = error
    for (const task of tasks.values()) task.reject(error)
    tasks.clear(); queue = []; activePrepare = null
    activeProject?.reject(error); queuedProject?.reject(error)
    activeProject = null; queuedProject = null
    cache.clear(); byteCount = 0
  }
  worker.onmessage = event => {
    if (disposed) return
    const reply = event.data
    if (activePrepare?.id === reply.requestId) {
      const task = activePrepare
      activePrepare = null; tasks.delete(task.node.ageMa)
      if (reply.type === 'prepared') { retain(reply.value); task.resolve(reply.value) }
      else task.reject(Object.assign(new Error(reply.type === 'error' ? reply.message : 'Unexpected paleo prepare response'), { name: reply.type === 'error' ? reply.name : 'Error' }))
      pumpPrepare()
      return
    }
    if (activeProject?.id === reply.requestId) {
      const task = activeProject; activeProject = null
      if (task.generation !== generation) task.resolve(null)
      else if (reply.type === 'projected') task.resolve(reply.value)
      else if (reply.type === 'error' && reply.name === 'AbortError') task.resolve(null)
      else task.reject(Object.assign(new Error(reply.type === 'error' ? reply.message : 'Unexpected paleo project response'), { name: reply.type === 'error' ? reply.name : 'Error' }))
      pumpProject()
    }
  }
  worker.onerror = event => {
    if (!disposed) { failAll(new Error(event.message || 'Paleo data worker failed')); worker.terminate() }
  }
  worker.postMessage({ type: 'configure', maxSourceNodes: 3 })
  function dispose(): void {
    if (disposed) return
    disposed = true
    invalidateProjects()
    failAll(abortError())
    knownNodes.clear()
    worker.onmessage = null; worker.onerror = null; worker.terminate()
  }
  return {
    get, peek, prefetch, release, project, invalidateProjects, dispose,
    stats: () => ({ preparedAges: [...cache.keys()], preparedBytes: byteCount,
      preparingAge: activePrepare?.node.ageMa ?? null, queuedAges: queue.map(task => task.node.ageMa),
      projecting: Boolean(activeProject), queuedProjectAge: queuedProject?.request.targetAge ?? null, disposed }),
  }
}

