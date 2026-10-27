import { resourceUrl } from './resource-loader'
import * as THREE from 'three'
import { GLOBE_RADIUS, ProjectedMapProjector, createSurfaceSourceUv, triangulateGeographic } from './tectonic-geometry'
import type { GeoCollection } from './tectonic-geometry'
import { loadTeachingMotionGroups, teachingFeatures } from './teaching-motion-groups'
import type {
  PaleoNodeSource, PaleoPreparationTimings, PaleoProjectionRequest, PaleoWorkerRequest, PaleoWorkerResponse,
  PreparedPaleoFeature, PreparedPaleoNode, ProjectedPaleoFrame,
} from './paleo-data-contract'

type SourceFeature = Omit<PreparedPaleoFeature, 'initial'> & { sourceUv: Float32Array }
type SourceNode = { ageMa: number; land: string; features: SourceFeature[]; timings: PaleoPreparationTimings }
const LIFT = .022
const sourceNodes = new Map<number, SourceNode>()
const preparing = new Map<number, Promise<SourceNode>>()
const controllers = new Map<number, AbortController>()
const cancelled = new Set<number>()
const running = new Set<number>()
let maxSourceNodes = 3
let activeAge: number | null = null
let activeProjectors: ProjectedMapProjector[] = []
// Explicit worker scope avoids mixing DOM and WebWorker global declaration libraries.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PaleoWorkerRequest>) => void) | null
  postMessage(message: PaleoWorkerResponse, transfer: Transferable[]): void
}
const yieldTask = () => new Promise<void>(resolve => setTimeout(resolve, 0))
const abortError = () => Object.assign(new Error('Paleo preparation cancelled'), { name: 'AbortError' })
function assertActive(requestId: number): void { if (cancelled.has(requestId)) throw abortError() }
function touch(node: SourceNode): void {
  sourceNodes.delete(node.ageMa); sourceNodes.set(node.ageMa, node)
  while (sourceNodes.size > maxSourceNodes) {
    const candidate = [...sourceNodes.keys()].find(age => age !== activeAge && age !== node.ageMa)
    if (candidate === undefined) break
    sourceNodes.delete(candidate)
  }
}
function measures(triangles: Float32Array): { center: [number, number, number]; area: number } {
  const center = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const cross = new THREE.Vector3(), centroid = new THREE.Vector3()
  let area = 0
  for (let index = 0; index < triangles.length; index += 9) {
    a.fromArray(triangles, index).normalize(); b.fromArray(triangles, index + 3).normalize(); c.fromArray(triangles, index + 6).normalize()
    const weight = 2 * Math.atan2(Math.abs(a.dot(cross.crossVectors(b, c))), 1 + a.dot(b) + b.dot(c) + c.dot(a))
    if (!Number.isFinite(weight) || weight <= 0) continue
    center.add(centroid.copy(a).add(b).add(c).normalize().multiplyScalar(weight)); area += weight
  }
  if (center.lengthSq()) center.normalize(); else center.set(1, 0, 0)
  return { center: [center.x, center.y, center.z], area }
}

async function ensureSource(node: PaleoNodeSource): Promise<SourceNode> {
  const cached = sourceNodes.get(node.ageMa)
  if (cached && cached.land === node.land) { touch(cached); return cached }
  const pending = preparing.get(node.ageMa)
  if (pending) return pending
  const task = (async () => {
    const started = performance.now()
    const controller = new AbortController()
    controllers.set(node.ageMa, controller)
    const timer = setTimeout(() => controller.abort(), 16000)
    const timings: PaleoPreparationTimings = { fetchMs: 0, parseMs: 0, triangulateMs: 0, sourceUvMs: 0, measuresMs: 0, initialMs: 0, totalMs: 0 }
    let collection: GeoCollection
    try {
      const response = await fetch(resourceUrl(node.land), { signal: controller.signal })
      if (!response.ok) throw new Error(`Paleo coast request failed (${response.status})`)
      const text = await response.text()
      timings.fetchMs = performance.now() - started
      const parsedAt = performance.now()
      collection = JSON.parse(text) as GeoCollection
      timings.parseMs = performance.now() - parsedAt
      if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('Invalid paleo coast collection')
    } finally { clearTimeout(timer); controllers.delete(node.ageMa) }
    await loadTeachingMotionGroups()
    const features: SourceFeature[] = []
    let yieldedAt = performance.now()
    const teachingSourceFeatures = collection.features.flatMap(feature => teachingFeatures(feature, Number(feature.properties?.referenceAgeMa ?? node.ageMa)))
    for (const [index, feature] of teachingSourceFeatures.entries()) {
      let tick = performance.now()
      const unitTriangles = triangulateGeographic(feature.geometry)
      timings.triangulateMs += performance.now() - tick
      if (!unitTriangles.length) continue
      tick = performance.now()
      const sourceUv = createSurfaceSourceUv(unitTriangles)
      timings.sourceUvMs += performance.now() - tick
      tick = performance.now()
      const measured = measures(unitTriangles)
      timings.measuresMs += performance.now() - tick
      const reference = Number(feature.properties?.referenceAgeMa ?? node.ageMa)
      features.push({ id: String(feature.properties?.plateId ?? feature.id ?? index), properties: feature.properties ?? null,
        referenceAgeMa: Number.isFinite(reference) ? reference : node.ageMa, unitTriangles, sourceUv, ...measured })
      // Permit a pending active-map request between independent feature preparations.
      if (performance.now() - yieldedAt > 12) { await yieldTask(); yieldedAt = performance.now() }
    }
    if (!features.length) throw new Error('Paleo coast collection has no renderable polygons')
    timings.totalMs = performance.now() - started
    const source = { ageMa: node.ageMa, land: node.land, features, timings }
    touch(source)
    return source
  })()
  preparing.set(node.ageMa, task)
  try { return await task } finally { preparing.delete(node.ageMa) }
}

async function prepare(node: PaleoNodeSource, requestId: number): Promise<PreparedPaleoNode> {
  const source = await ensureSource(node)
  assertActive(requestId)
  const initialAt = performance.now()
  const features: PreparedPaleoFeature[] = []
  const identity = new THREE.Quaternion()
  let bytes = 0
  let yieldedAt = initialAt
  for (const feature of source.features) {
    assertActive(requestId)
    const projector = new ProjectedMapProjector(feature.unitTriangles, feature.sourceUv, LIFT)
    projector.update(identity)
    const map = projector.compact()
    const globePositions = new Float32Array(feature.unitTriangles.length)
    // Match the existing renderer's normalization, including Float32 source rounding.
    const vector = new THREE.Vector3()
    for (let at = 0; at < globePositions.length; at += 3) {
      vector.fromArray(feature.unitTriangles, at).normalize().multiplyScalar(GLOBE_RADIUS + LIFT).toArray(globePositions, at)
    }
    const unitTriangles = feature.unitTriangles.slice()
    const sourceUv = feature.sourceUv.slice()
    features.push({ id: feature.id, properties: feature.properties, referenceAgeMa: feature.referenceAgeMa,
      center: feature.center, area: feature.area, unitTriangles, initial: { ...map, globePositions, sourceUv } })
    bytes += unitTriangles.byteLength + sourceUv.byteLength + globePositions.byteLength + map.mapPositions.byteLength + map.mapUv.byteLength
    if (performance.now() - yieldedAt > 12) { await yieldTask(); yieldedAt = performance.now() }
  }
  assertActive(requestId)
  const initialMs = performance.now() - initialAt
  return { ageMa: node.ageMa, features, bytes, sourceCacheAges: [...sourceNodes.keys()],
    timings: { ...source.timings, initialMs, totalMs: source.timings.totalMs + initialMs } }
}

async function project(node: PaleoNodeSource, request: PaleoProjectionRequest, requestId: number): Promise<ProjectedPaleoFrame> {
  const source = await ensureSource(node)
  assertActive(requestId)
  const started = performance.now()
  if (activeAge !== node.ageMa || activeProjectors.length !== source.features.length) {
    activeAge = node.ageMa
    activeProjectors = source.features.map(feature => new ProjectedMapProjector(feature.unitTriangles, feature.sourceUv, LIFT))
  }
  touch(source)
  const rotations = new Map(request.rotations.map(rotation => [rotation.id, rotation.quaternion]))
  const quaternion = new THREE.Quaternion()
  const features = source.features.map((feature, index) => {
    const values = rotations.get(feature.id)
    if (values && values.every(Number.isFinite)) quaternion.fromArray(values).normalize()
    else quaternion.identity()
    const projector = activeProjectors[index]!
    projector.update(quaternion)
    return { index, id: feature.id, ...projector.compact() }
  })
  assertActive(requestId)
  return { nodeAge: node.ageMa, targetAge: request.targetAge, features,
    elapsedMs: performance.now() - started, sourceCacheAges: [...sourceNodes.keys()] }
}

function transfers(value: PreparedPaleoNode | ProjectedPaleoFrame): Transferable[] {
  const buffers: Transferable[] = []
  for (const feature of value.features) {
    if ('initial' in feature) buffers.push(feature.unitTriangles.buffer, feature.initial.globePositions.buffer,
      feature.initial.sourceUv.buffer, feature.initial.mapPositions.buffer, feature.initial.mapUv.buffer)
    else buffers.push(feature.mapPositions.buffer, feature.mapUv.buffer)
  }
  return buffers
}

scope.onmessage = event => {
  const message = event.data
  if (message.type === 'configure') { maxSourceNodes = Math.max(2, Math.min(3, Math.floor(message.maxSourceNodes))); return }
  if (message.type === 'cancel') { if (running.has(message.requestId)) cancelled.add(message.requestId); return }
  running.add(message.requestId)
  void (async () => {
    try {
      if (message.type === 'prepare') {
        const value = await prepare(message.node, message.requestId)
        scope.postMessage({ type: 'prepared', requestId: message.requestId, value }, transfers(value))
      } else {
        const value = await project(message.node, message.request, message.requestId)
        scope.postMessage({ type: 'projected', requestId: message.requestId, value }, transfers(value))
      }
    } catch (error) {
      scope.postMessage({ type: 'error', requestId: message.requestId,
        message: error instanceof Error ? error.message : String(error), name: error instanceof Error ? error.name : 'Error' }, [])
    } finally { cancelled.delete(message.requestId); running.delete(message.requestId) }
  })()
}

