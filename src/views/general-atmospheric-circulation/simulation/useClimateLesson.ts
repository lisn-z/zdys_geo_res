import { computed, reactive, ref, watch } from 'vue'
import * as THREE from 'three'
import { ClimateGeoLayers, type ClimateGeoSnapshot, type ClimateMapLayer } from './ClimateGeoLayers'
import { CLIMATE_TYPE_LEGEND } from './climate-geo-data'
import { climateTextbookSource, textbookClimateTypes, textbookClimateStations } from './stage5-textbook-data'
import type { ClimateStationData, ClimateTypeInfo } from '../components/climate-chart'
import type { ClimateFocusRequest } from './climate-focus'

const landscapeIds: Record<string, string> = {
  'subtropical-monsoon': 'subtropical-monsoon-humid', 'subtropical-humid': 'subtropical-monsoon-humid',
  'subtropical-steppe-desert': 'tropical-desert', 'temperate-deciduous': 'temperate-monsoon',
  'temperate-steppe': 'temperate-continental', 'temperate-desert': 'tropical-desert',
}
export const climateTopics = [
  { id: 'climate', title: '气候类型' },
  { id: 'temperature', title: '月均气温' },
  { id: 'precipitation', title: '年降水量' },
] as const
export type ClimateTopicId = typeof climateTopics[number]['id']

/** Vue state and Three picking live together so a region, legend and station agree. */
export function useClimateLesson(onInspect: () => void, onFocus?: (request: ClimateFocusRequest) => void) {
  const active = ref(false), layer = ref<ClimateMapLayer>('climate'), month = ref<1 | 7>(1)
  const opacity = ref(.78), showStations = ref(false), selectedId = ref<string | null>(null)
  const stationId = ref<string | null>(null), infoOpen = ref(false), legendTab = ref<'map' | 'stations'>('map')
  const snapshot = ref<ClimateGeoSnapshot>({ phase: 'idle', layer: 'climate', month: 1, legend: [], selectedId: null })
  const points = ref<{ id: string; name: string; number: number; x: number; y: number; visible: boolean }[]>([])
  const pickedValue = ref('')
  const comparisonActive = ref(false)
  const comparisonLeft = computed(() => ({ id: 'january', layer: layer.value, month: 1 as const, title: '1月' }))
  const comparisonRight = computed(() => ({ id: 'july', layer: layer.value, month: 7 as const, title: '7月' }))
  let engine: ClimateGeoLayers | null = null
  let earth: THREE.Object3D | null = null, camera: THREE.Camera | null = null, canvas: HTMLCanvasElement | null = null
  let pointerStart: { x: number; y: number; id: number } | null = null
  let pendingFocus: { id: string; sourceId: string; source: ClimateFocusRequest['source'] } | null = null
  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2()
  const world = new THREE.Vector3(), globeCenter = new THREE.Vector3(), cameraWorld = new THREE.Vector3()
  const surfaceNormal = new THREE.Vector3(), towardCamera = new THREE.Vector3()

  const types = textbookClimateTypes.map(type => ({
    ...type,
    color: CLIMATE_TYPE_LEGEND.find(item => item.id === type.sourceClimateId)?.color ?? type.color,
    image: `/geo-resources-folder/images/general-atmospheric-circulation/${landscapeIds[type.id] ?? type.id}.webp`,
    imageAlt: `${type.name}典型自然景观示意`, imageNote: 'AI生成',
  }))
  const stations: ClimateStationData[] = textbookClimateStations.map(station => ({
    id: station.id, name: station.name, climateId: station.climateId,
    lat: station.latitude, lon: station.longitude,
    temperature: station.temperatureC, precipitation: station.precipitationMm ?? Array(12).fill(null),
    annualTemperatureC: station.annualTemperatureC, annualPrecipitationMm: station.annualPrecipitationMm,
    annualPrecipitationUpperBoundMm: station.annualPrecipitationUpperBoundMm,
    dataNote: '月值依据配套地图册曲线、柱形估读，用于比较季节变化，不作为精确观测数据。',
  }))
  const selectedClimate = computed<ClimateTypeInfo | null>(() => {
    const type = types.find(item => item.id === selectedId.value)
    if (!type) return null
    return { ...type, temperature: type.temperature, precipitation: type.precipitation, circulation: type.mechanism }
  })
  const selectedStation = computed(() => textbookClimateStations.find(station => station.id === stationId.value))
  const variants = computed(() => {
    const type = types.find(item => item.id === selectedId.value)
    return type?.sourceClimateId ? types.filter(item => item.sourceClimateId === type.sourceClimateId) : []
  })
  const title = computed(() => layer.value === 'climate' ? '世界气候类型' : layer.value === 'temperature' ? `${month.value}月平均气温 / ℃` : '年降水量 / mm')
  const selectedSourceId = computed(() => types.find(type => type.id === selectedId.value)?.sourceClimateId ?? null)

  function requestRegionFocus(id: string, sourceId: string, source: ClimateFocusRequest['source']) {
    if (!onFocus) return
    pendingFocus = { id, sourceId, source }
    flushPendingFocus()
  }
  function flushPendingFocus() {
    if (!pendingFocus || !onFocus) return
    const point = engine?.focusPoint(pendingFocus.sourceId)
    if (!point) return
    const { id, source } = pendingFocus
    pendingFocus = null
    onFocus({ ...point, id, source })
  }
  function selectType(id: string, fromStation = false, focus = true, source: ClimateFocusRequest['source'] = 'type') {
    const type = types.find(item => item.id === id)
    if (!type) return
    pendingFocus = null
    selectedId.value = id
    if (!fromStation) stationId.value = null
    infoOpen.value = true
    if (layer.value === 'climate') engine?.select(type.sourceClimateId ?? null)
    onInspect()
    if (focus && onFocus) {
      const station = stations.find(item => item.climateId === id)
      if (station) onFocus({ latitude: station.lat, longitude: station.lon, id, source, stationId: station.id })
      else if (type.sourceClimateId) requestRegionFocus(id, type.sourceClimateId, source)
    }
  }
  function selectSource(id: string, focus = true) {
    pickedValue.value = ''
    pendingFocus = null
    if (layer.value !== 'climate') {
      pickedValue.value = snapshot.value.legend.find(item => item.id === id)?.name ?? ''
      engine?.select(id)
      if (focus) { onInspect(); requestRegionFocus(id, id, 'legend') }
      return
    }
    const type = types.find(item => item.sourceClimateId === id)
    if (type) selectType(type.id, false, focus, 'legend')
  }
  function selectStation(id: string) {
    const station = stations.find(item => item.id === id)
    if (!station) return
    stationId.value = id
    showStations.value = true
    selectType(station.climateId, true, false)
    onFocus?.({ latitude: station.lat, longitude: station.lon, id: station.id, stationId: station.id, source: 'station' })
  }
  function clearSelection() {
    selectedId.value = null; stationId.value = null; pickedValue.value = ''; infoOpen.value = false
    pendingFocus = null
    engine?.select(null)
  }
  function setLayer(value: ClimateMapLayer) {
    layer.value = value
    clearSelection()
  }
  function compareTemperatures() {
    layer.value = 'temperature'; comparisonActive.value = true
    clearSelection()
  }
  function toggleComparison() { comparisonActive.value = !comparisonActive.value; clearSelection() }
  function setPreset(value: ClimateMapLayer, stationMarkers: boolean) {
    setLayer(value); showStations.value = stationMarkers; legendTab.value = stationMarkers ? 'stations' : 'map'
  }
  function onPointerDown(event: PointerEvent) {
    pointerStart = active.value && event.button === 0 && event.isPrimary !== false
      ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null
  }
  function onPointerCancel() { pointerStart = null }
  function onPointerUp(event: PointerEvent) {
    const start = pointerStart; pointerStart = null
    if (!active.value || !start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 || !canvas || !camera || !earth || !engine) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    camera.updateWorldMatrix(true, false)
    raycaster.setFromCamera(mouse, camera)
    earth.updateWorldMatrix(true, false)
    const hit = raycaster.intersectObject(earth, false)[0]
    if (!hit) return
    if (engine.snapshot.phase !== 'ready') return
    const local = earth.worldToLocal(hit.point.clone()).normalize()
    const pick = engine.pickGeo(THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(local.y, -1, 1))), THREE.MathUtils.radToDeg(Math.atan2(-local.z, local.x)))
    // A picked polygon is already in view; keep the teacher's chosen angle.
    if (pick) selectSource(pick.id, false)
    else pickedValue.value = '该位置没有源数据分区'
  }
  function attach(target: THREE.Object3D, targetCamera: THREE.Camera, targetCanvas: HTMLCanvasElement) {
    earth = target; camera = targetCamera; canvas = targetCanvas
    engine = new ClimateGeoLayers(2.5, { onChange: value => {
      snapshot.value = value
      if (value.phase === 'ready') flushPendingFocus()
    } })
    earth.add(engine.group)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    sync()
  }
  function sync() { engine?.setState({ visible: active.value && !comparisonActive.value, layer: layer.value, month: month.value, opacity: opacity.value }) }
  watch([active, layer, month, opacity, comparisonActive], sync)
  watch(active, value => { if (!value) { infoOpen.value = false; points.value = []; pickedValue.value = ''; pendingFocus = null } })
  function project() {
    if (!active.value || comparisonActive.value || !showStations.value || !earth || !camera || !canvas) { if (points.value.length) points.value = []; return }
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) { if (points.value.length) points.value = []; return }
    camera.updateWorldMatrix(true, false)
    earth.updateWorldMatrix(true, false)
    earth.getWorldPosition(globeCenter); camera.getWorldPosition(cameraWorld)
    points.value = stations.map((station, index) => {
      const lat = THREE.MathUtils.degToRad(station.lat), lon = THREE.MathUtils.degToRad(station.lon)
      world.set(2.55 * Math.cos(lat) * Math.cos(lon), 2.55 * Math.sin(lat), -2.55 * Math.cos(lat) * Math.sin(lon)).applyMatrix4(earth!.matrixWorld)
      surfaceNormal.copy(world).sub(globeCenter).normalize()
      towardCamera.copy(cameraWorld).sub(world).normalize()
      // A small angular limb margin, independent of camera distance/zoom. Both
      // vectors are in world space, so Earth rotation and camera roll agree.
      const visible = surfaceNormal.dot(towardCamera) > .03
      world.project(camera!)
      return { id: station.id, name: station.name, number: index + 1, x: rect.left + (world.x + 1) * rect.width / 2,
        y: rect.top + (1 - world.y) * rect.height / 2, visible: visible && Math.abs(world.x) < 1 && Math.abs(world.y) < 1 && Math.abs(world.z) < 1 }
    })
  }
  function dispose() {
    canvas?.removeEventListener('pointerdown', onPointerDown); canvas?.removeEventListener('pointerup', onPointerUp)
    canvas?.removeEventListener('pointercancel', onPointerCancel)
    pointerStart = null
    pendingFocus = null
    engine?.dispose(); engine = null; earth = null; camera = null; canvas = null
  }
  return reactive({ active, layer, month, opacity, showStations, selectedId, selectedSourceId, stationId, infoOpen, legendTab, snapshot, points,
    topics: climateTopics, comparisonActive, comparisonLeft, comparisonRight, toggleComparison, compareTemperatures,
    pickedValue, selectedClimate, selectedStation, variants, types, stations, title, source: climateTextbookSource, sourceLegend: CLIMATE_TYPE_LEGEND,
    selectType, selectSource, selectStation, clearSelection, setLayer, setPreset, attach, project, dispose, retry: () => engine?.retry() })
}
export type ClimateLessonController = ReturnType<typeof useClimateLesson>
