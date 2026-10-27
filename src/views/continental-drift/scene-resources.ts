import { loadResourceJson, resourceUrl } from './resource-loader'
import { loadPresentData } from './present-data'
import { loadTextbookData } from './textbook-present-data'
import type { GeoCollection } from './tectonic-geometry'
import type { ContinuousPaleoNode } from './continuous-paleo-surface'

export type MotionPlate = {
  id: string | number
  name: string
  rotations: { ageMa: number; quaternion: [number, number, number, number] }[]
}
type PaleoLabels = {
  nodes: { ageMa: number; labels: { id: string | number; name: string; lon: number; lat: number }[] }[]
}
type PaleoManifest = { nodes: ContinuousPaleoNode[] }

async function fetchSceneResources() {
  const [present, textbook, motion, land, labels, manifest] = await Promise.all([
    loadPresentData(),
    loadTextbookData(),
    loadResourceJson<{ plates: MotionPlate[] }>('paleo-motion.json'),
    loadResourceJson<GeoCollection>('present-land.json'),
    loadResourceJson<PaleoLabels>('continuous-paleo-labels.json'),
    loadResourceJson<PaleoManifest>('continuous-paleo-manifest.json'),
  ])
  return {
    present, textbook, land,
    labelNodes: labels.nodes,
    rotationIndex: new Map(motion.plates.map(plate => [String(plate.id), {
      ...plate, rotations: plate.rotations.slice().sort((a, b) => a.ageMa - b.ageMa),
    }])),
    nodes: manifest.nodes.map(node => ({ ...node, coast: resourceUrl(node.coast), terrain: resourceUrl(node.terrain) })),
  }
}

export type TectonicResources = Awaited<ReturnType<typeof fetchSceneResources>>
let pending: Promise<TectonicResources> | null = null
let loaded: TectonicResources | null = null

export function loadTectonicResources(): Promise<TectonicResources> {
  if (loaded) return Promise.resolve(loaded)
  if (!pending) {
    pending = fetchSceneResources().then(resources => { loaded = resources; return resources })
      .finally(() => { pending = null })
  }
  return pending
}

/** Synchronous helpers may run after the page has completed loadTectonicResources(). */
export function getTectonicResources(): TectonicResources {
  if (!loaded) throw new Error('Lesson resources have not finished loading')
  return loaded
}
