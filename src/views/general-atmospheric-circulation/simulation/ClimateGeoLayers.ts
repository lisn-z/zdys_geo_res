import * as THREE from 'three'
import { findClimateInteriorPoint } from './climate-focus.ts'
import { CLIMATE_GEO_URLS, climateDatasetKey, climateLegend, paintClimateGeoData, pickClimateGeoData, prepareClimateGeoData,
  type ClimateDatasetKey, type ClimateGeoPick, type ClimateLegendItem, type ClimateMapLayer, type ClimateMapMonth,
  type PreparedClimateData, type SourceClimateCollection } from './climate-geo-data.ts'
export type { ClimateGeoPick, ClimateLegendItem, ClimateMapLayer, ClimateMapMonth } from './climate-geo-data.ts'

export interface ClimateGeoState { visible: boolean; layer: ClimateMapLayer; month: ClimateMapMonth; opacity?: number }
export interface ClimateGeoSnapshot {
  readonly phase: 'idle' | 'loading' | 'ready' | 'error'
  readonly layer: ClimateMapLayer
  readonly month: ClimateMapMonth
  readonly legend: readonly ClimateLegendItem[]
  readonly selectedId: string | null
  readonly error?: string
  readonly featureCount?: number
}
export interface ClimateGeoOptions {
  onChange?: (snapshot: ClimateGeoSnapshot) => void
  fetcher?: typeof fetch
  canvasFactory?: () => HTMLCanvasElement
  textureWidth?: number
}

/** Four remote GIS sources share one reusable, geographic CanvasTexture shell. */
export class ClimateGeoLayers {
  readonly group = new THREE.Group()
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private texture: THREE.CanvasTexture
  private state: ClimateGeoState = { visible: false, layer: 'climate', month: 1, opacity: .88 }
  private phase: ClimateGeoSnapshot['phase'] = 'idle'
  private error: string | undefined
  private selectedId: string | null = null
  private active: PreparedClimateData | null = null
  private cache = new Map<ClimateDatasetKey, PreparedClimateData>()
  private loading = new Map<ClimateDatasetKey, { promise: Promise<PreparedClimateData>; controller: AbortController }>()
  private disposed = false
  private requestVersion = 0
  private fetcher: typeof fetch

  constructor(radius = 2.5, private options: ClimateGeoOptions = {}) {
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis)
    this.canvas = options.canvasFactory?.() ?? document.createElement('canvas')
    this.canvas.width = Math.max(1024, Math.min(4096, options.textureWidth ?? 4096))
    this.canvas.height = this.canvas.width / 2
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法创建气候图层画布')
    this.context = context
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.wrapS = THREE.RepeatWrapping
    this.texture.wrapT = THREE.ClampToEdgeWrapping
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter
    this.texture.generateMipmaps = false
    // A geographic fill hugs the ground; a wind-arrow-sized offset creates
    // visible coastline parallax when the camera approaches the globe's limb.
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius + .006, 128, 64), new THREE.MeshBasicMaterial({
      map: this.texture, transparent: true, opacity: .88, depthTest: true, depthWrite: false,
      side: THREE.FrontSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }))
    // SphereGeometry u=(longitude+180)/360 agrees with the rest of this globe;
    // the CanvasTexture's top row is 90°N. Attach this group to the rotating Earth.
    this.mesh.name = 'climate-gis-surface'
    // Keep ideal pressure belts (order 2) and surface arrows (order 4) readable
    // above the GIS surface when the climate lesson combines these layers.
    this.mesh.renderOrder = 1.5
    this.mesh.visible = false
    this.group.name = 'climate-gis-layers'
    this.group.visible = false
    this.group.add(this.mesh)
  }

  get snapshot(): ClimateGeoSnapshot {
    return { phase: this.phase, layer: this.state.layer, month: this.state.month, legend: climateLegend(this.state.layer),
      selectedId: this.selectedId, error: this.error, featureCount: this.active?.featureCount }
  }

  private notify() { if (!this.disposed) this.options.onChange?.(this.snapshot) }

  setState(next: ClimateGeoState) {
    if (this.disposed) return
    const opacity = next.opacity ?? .88
    if (this.state.visible === next.visible && this.state.layer === next.layer && this.state.month === next.month &&
      this.state.opacity === opacity) return
    const previousKey = climateDatasetKey(this.state.layer, this.state.month)
    const layerChanged = this.state.layer !== next.layer
    this.state = { ...next, opacity }
    this.group.visible = next.visible
    this.mesh.material.opacity = THREE.MathUtils.clamp(this.state.opacity!, 0, 1)
    if (layerChanged) this.selectedId = null
    const key = climateDatasetKey(next.layer, next.month)
    if (this.active?.key === key) {
      this.phase = 'ready'; this.error = undefined; this.mesh.visible = true
      if (layerChanged) this.paint()
      this.notify()
      return
    }
    if (previousKey !== key) { this.mesh.visible = false; this.active = null; this.phase = 'idle'; this.error = undefined }
    if (!next.visible) { this.notify(); return }
    if (this.phase === 'error' && previousKey === key) { this.notify(); return }
    if (!this.loading.has(key) || previousKey !== key) void this.activate(key)
  }

  private load(key: ClimateDatasetKey): Promise<PreparedClimateData> {
    const cached = this.cache.get(key)
    if (cached) return Promise.resolve(cached)
    const existing = this.loading.get(key)
    if (existing) return existing.promise
    const controller = new AbortController()
    const promise = this.fetcher(CLIMATE_GEO_URLS[key], { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const source = await response.json() as SourceClimateCollection
      if (controller.signal.aborted || this.disposed) throw new DOMException('Aborted', 'AbortError')
      const prepared = prepareClimateGeoData(source, key)
      if (controller.signal.aborted || this.disposed) throw new DOMException('Aborted', 'AbortError')
      this.cache.set(key, prepared)
      return prepared
    }).finally(() => {
      if (this.loading.get(key)?.controller === controller) this.loading.delete(key)
    })
    this.loading.set(key, { promise, controller })
    return promise
  }

  private async activate(key: ClimateDatasetKey) {
    const version = ++this.requestVersion
    this.phase = 'loading'; this.error = undefined; this.mesh.visible = false; this.notify()
    try {
      const data = await this.load(key)
      if (this.disposed || version !== this.requestVersion || climateDatasetKey(this.state.layer, this.state.month) !== key) return
      this.active = data
      this.paint()
      this.phase = 'ready'; this.mesh.visible = true; this.notify()
    } catch (error) {
      if (this.disposed || version !== this.requestVersion || climateDatasetKey(this.state.layer, this.state.month) !== key) return
      this.phase = 'error'; this.mesh.visible = false
      this.error = `地图数据加载失败：${error instanceof Error ? error.message : String(error)}。可重试。`
      this.notify()
    }
  }

  private paint() {
    if (!this.active || this.disposed) return
    paintClimateGeoData(this.context, this.active, this.canvas.width, this.canvas.height, this.selectedId)
    this.texture.needsUpdate = true
  }

  select(typeId: string | null) {
    if (this.disposed) return
    const selected = typeId && climateLegend(this.state.layer).some(item => item.id === typeId) ? typeId : null
    if (selected === this.selectedId) return
    this.selectedId = selected
    this.paint(); this.notify()
  }

  pickGeo(latitude: number, longitude: number): ClimateGeoPick | null {
    return !this.disposed && this.state.visible && this.phase === 'ready' && this.active
      ? pickClimateGeoData(this.active, latitude, longitude, this.state.month) : null
  }

  focusPoint(typeId: string) {
    if (this.disposed || !this.active || this.phase !== 'ready') return null
    return findClimateInteriorPoint(this.active, typeId)
  }

  async retry() {
    if (this.disposed || !this.state.visible) return
    const key = climateDatasetKey(this.state.layer, this.state.month)
    this.loading.get(key)?.controller.abort()
    this.loading.delete(key); this.cache.delete(key)
    await this.activate(key)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true; this.requestVersion++
    for (const request of this.loading.values()) request.controller.abort()
    this.loading.clear(); this.cache.clear(); this.active = null
    this.group.visible = false
    this.texture.dispose(); this.mesh.material.dispose(); this.mesh.geometry.dispose()
    this.group.remove(this.mesh)
    this.canvas.width = this.canvas.height = 1
  }
}
