<template>
  <section ref="host" class="climate-comparison" aria-label="一月与七月双球对比">
    <div ref="canvasHost" class="comparison-canvas" aria-hidden="true"></div>
    <section v-for="(choice, index) in choices" :key="index" class="comparison-pane" :aria-label="choice.title">
      <header class="comparison-title"><span>{{ index === 0 ? 'A' : 'B' }}</span><div><h3>{{ paneTitle(index) }}</h3><p v-if="stage < 2">理想模型暂不考虑季节差异</p></div></header>
      <div :ref="element => setOrbitElement(element, index)" class="comparison-orbit" :aria-label="`${choice.title}，拖动旋转，滚轮缩放，两球视角同步`"></div>
      <div class="comparison-labels" aria-hidden="true"><span v-for="(label, labelIndex) in projectedLabels[index]" :key="label.id ?? labelIndex"
        :class="label.cls" :style="{ left: `${label.x}px`, top: `${label.y}px`, color: label.color, opacity: label.opacity }">{{ label.text }}</span></div>
      <div v-if="stage === 4 && snapshots[index]?.phase === 'loading'" class="comparison-status" role="status">正在加载{{ choice.title }}…</div>
      <div v-else-if="stage === 4 && snapshots[index]?.phase === 'error'" class="comparison-status is-error" role="alert">
        <p>{{ snapshots[index]?.error }}</p><button type="button" @click="retryLayer(index)">重新加载</button>
      </div>
      <details v-if="stage === 4" class="comparison-legend">
        <summary>图例 <span>{{ legendFor(index).length }} {{ choice.layer === 'climate' ? '类' : '档' }}</span></summary>
        <div class="comparison-legend-items">
          <div v-for="item in legendFor(index)" :key="item.id"><i :style="{ background: item.color }"></i><span>{{ item.name }}</span></div>
        </div>
      </details>
    </section>
    <div v-if="baseTextureError || renderError" class="comparison-base-error" role="alert">
      <span>{{ renderError || baseTextureError }}</span><button v-if="!renderError" type="button" @click="loadBaseTexture">重试底图</button>
    </div>
    <p class="comparison-help">两球联动 · 拖动旋转 · 滚轮缩放</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ClimateGeoLayers, type ClimateGeoPick, type ClimateGeoSnapshot } from '../simulation/ClimateGeoLayers'
import { climateLegend } from '../simulation/climate-geo-data'
import { earthTextureUvScale } from '../simulation/earth-texture-registration'
import { SurfaceClimate, type ClimateLabel } from '../simulation/SurfaceClimate'
import { createReferenceLatitudes } from '../simulation/graticule'
import { CirculationComparisonBridge } from '../simulation/CirculationComparisonBridge'
import { ThermalZones } from '../simulation/ThermalZones'
import type { SeasonPoint } from '../simulation/seasonal-controls'
import { cloneComparisonEarthTexture, comparisonClimateState, comparisonFitDistance, comparisonSceneRadius, comparisonViewport, synchronizeComparisonCamera, type ClimateComparisonChoice } from './climate-comparison'

const props = defineProps<{
  left: ClimateComparisonChoice
  right: ClimateComparisonChoice
  playing: boolean
  speed: number
  opacity: number
  stage: number
  layers: Record<string, boolean>
  seasonPoint?: SeasonPoint
  neutralSeason?: boolean
  getCirculationSources?: () => THREE.Object3D[]
  getBaseTexture?: () => THREE.Texture | null
}>()
const emit = defineEmits<{ pick: [id: string, side: 'left' | 'right', data: ClimateGeoPick] }>()
const choices = computed(() => [props.left, props.right])
const host = ref<HTMLElement | null>(null), canvasHost = ref<HTMLElement | null>(null)
const snapshots = shallowRef<(ClimateGeoSnapshot | null)[]>([null, null])
const projectedLabels = shallowRef<ClimateLabel[][]>([[], []])
const baseTextureError = ref(''), renderError = ref('')
const orbitElements: (HTMLElement | null)[] = [null, null]
const radius = 2.5
interface Pane {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  earth: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
  layers: ClimateGeoLayers
  surfaceClimate: SurfaceClimate
  graticule: THREE.Group
  circulation: CirculationComparisonBridge
  thermalZones: ThermalZones
  controls: OrbitControls
  fitDistance: number
  viewport: { x: number; y: number; width: number; height: number }
}
const panes: Pane[] = [], cleanups: (() => void)[] = []
const interacting = new Set<number>()
let renderer: THREE.WebGLRenderer | null = null
let sphereGeometry: THREE.SphereGeometry | null = null
let earthTexture: THREE.Texture | null = null
let textureRequest: AbortController | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0, disposed = false, synchronizing = false
let lastTime = 0, lastInteraction = -Infinity, rotation = THREE.MathUtils.degToRad(-105)
const raycaster = new THREE.Raycaster()

function setOrbitElement(element: Element | ComponentPublicInstance | null, index: number) {
  orbitElements[index] = element instanceof HTMLElement ? element : null
}
function legendFor(index: number) {
  return snapshots.value[index]?.legend ?? climateLegend(choices.value[index]!.layer)
}
function retryLayer(index: number) { void panes[index]?.layers.retry() }
function paneTitle(index: number) {
  return props.stage === 4 ? choices.value[index]!.title : `${index === 0 ? 1 : 7}月`
}
function climateState(index: number) {
  return comparisonClimateState(props.stage, index === 0 ? 1 : 7, props.layers, props.playing, props.speed, props.seasonPoint, props.neutralSeason)
}
const fitRadius = computed(() => comparisonSceneRadius(props.layers, radius))
function syncLayers() {
  panes.forEach((pane, index) => {
    const choice = choices.value[index]!
    pane.layers.setState({ visible: props.stage === 4, layer: choice.layer, month: choice.month, opacity: props.opacity })
    pane.graticule.visible = !!props.layers.latLines
    pane.thermalZones.update(!!props.layers.thermalZones)
  })
}
watch(() => [props.left.layer, props.left.month, props.right.layer, props.right.month, props.opacity, props.stage, props.layers.latLines, props.layers.thermalZones], syncLayers)
watch(fitRadius, resize)

function createGraticule() {
  const group = createReferenceLatitudes(radius)
  const geo = (lat: number, lon: number) => {
    const phi = THREE.MathUtils.degToRad(lat), theta = THREE.MathUtils.degToRad(lon), r = radius + .012
    return new THREE.Vector3(r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(theta))
  }
  const add = (points: THREE.Vector3[], color: string, opacity: number) => group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: true })))
  for (let lat = -75; lat <= 75; lat += 15) if (lat !== 0)
    add(Array.from({ length: 181 }, (_, i) => geo(lat, i * 2 - 180)), '#78b9d8', .22)
  for (let lon = -165; lon <= 180; lon += 15)
    add(Array.from({ length: 91 }, (_, i) => geo(i * 2 - 90, lon)), lon === 0 ? '#2ec4b6' : lon === 180 ? '#ff5f9e' : '#a7e4ff', lon % 180 === 0 ? .8 : .34)
  return group
}

function syncCamera(index: number) {
  if (synchronizing || disposed) return
  const source = panes[index], target = panes[1 - index]
  if (!source || !target) return
  synchronizing = true
  synchronizeComparisonCamera(source.camera, target.camera, source.controls.target, target.controls.target,
    source.fitDistance, target.fitDistance)
  target.controls.update()
  synchronizing = false
}

function createPane(index: number) {
  const element = orbitElements[index]!
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, .05, 150)
  const fitDistance = comparisonFitDistance(1, fitRadius.value)
  camera.position.set(0, .24, 1).normalize().multiplyScalar(fitDistance)
  camera.lookAt(0, 0, 0)
  const earth = new THREE.Mesh(sphereGeometry!, new THREE.MeshBasicMaterial({ color: '#758393', toneMapped: false }))
  earth.rotation.y = rotation
  scene.add(earth)
  const layers = new ClimateGeoLayers(radius, { textureWidth: 4096, onChange: snapshot => {
    if (disposed) return
    const next = [...snapshots.value]; next[index] = snapshot; snapshots.value = next
  } })
  earth.add(layers.group)
  const surfaceClimate = new SurfaceClimate()
  surfaceClimate.initialize(climateState(index))
  const graticule = createGraticule()
  const circulation = new CirculationComparisonBridge(surfaceClimate.shift)
  const thermalZones = new ThermalZones(radius)
  earth.add(surfaceClimate.group, graticule, circulation.group, thermalZones.group)
  const controls = new OrbitControls(camera, element)
  controls.enablePan = false
  controls.enableDamping = false
  controls.rotateSpeed = .62
  controls.zoomSpeed = .85
  controls.minDistance = radius + .28
  controls.maxDistance = fitDistance * 3
  const pane: Pane = { scene, camera, earth, layers, surfaceClimate, graticule, circulation, thermalZones, controls, fitDistance, viewport: { x: 0, y: 0, width: 1, height: 1 } }
  panes.push(pane)
  const onStart = () => { interacting.add(index); lastInteraction = performance.now() }
  const onEnd = () => { interacting.delete(index); lastInteraction = performance.now() }
  const onChange = () => syncCamera(index)
  controls.addEventListener('start', onStart)
  controls.addEventListener('end', onEnd)
  controls.addEventListener('change', onChange)
  let start: { id: number; x: number; y: number } | null = null
  const pointerDown = (event: PointerEvent) => {
    lastInteraction = performance.now()
    start = event.button === 0 && event.isPrimary !== false ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null
  }
  const pointerCancel = () => { start = null; onEnd() }
  const pointerUp = (event: PointerEvent) => {
    const previous = start; start = null; lastInteraction = performance.now()
    if (props.stage !== 4) return
    if (!previous || previous.id !== event.pointerId || Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 6) return
    const rect = element.getBoundingClientRect()
    const mouse = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
    camera.updateMatrixWorld(); earth.updateWorldMatrix(true, false)
    raycaster.setFromCamera(mouse, camera)
    const hit = raycaster.intersectObject(earth, false)[0]
    if (!hit) return
    const local = earth.worldToLocal(hit.point.clone()).normalize()
    const pick = layers.pickGeo(THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(local.y, -1, 1))),
      THREE.MathUtils.radToDeg(Math.atan2(-local.z, local.x)))
    if (pick) emit('pick', pick.id, index === 0 ? 'left' : 'right', pick)
  }
  element.addEventListener('pointerdown', pointerDown)
  element.addEventListener('pointerup', pointerUp)
  element.addEventListener('pointercancel', pointerCancel)
  cleanups.push(() => {
    controls.removeEventListener('start', onStart); controls.removeEventListener('end', onEnd); controls.removeEventListener('change', onChange)
    element.removeEventListener('pointerdown', pointerDown); element.removeEventListener('pointerup', pointerUp); element.removeEventListener('pointercancel', pointerCancel)
  })
}

async function loadBaseTexture() {
  if (disposed) return
  textureRequest?.abort()
  textureRequest = null
  baseTextureError.value = ''
  const source = props.getBaseTexture?.()
  if (source) {
    // The main globe already decoded this image. Attach our independently owned
    // texture before the first RAF instead of briefly painting a textureless ball.
    const texture = cloneComparisonEarthTexture(source, renderer?.capabilities.getMaxAnisotropy() ?? 1)
    const previous = earthTexture; earthTexture = texture
    for (const pane of panes) { pane.earth.material.map = texture; pane.earth.material.needsUpdate = true }
    previous?.dispose()
    return
  }
  const request = new AbortController(); textureRequest = request
  let objectUrl: string | null = null
  try {
    const response = await fetch('/geo-resources-folder/images/Material.003_diffuse.jpg', { signal: request.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    if (request.signal.aborted || disposed) return
    objectUrl = URL.createObjectURL(blob)
    const image = new Image(); image.src = objectUrl
    await image.decode()
    if (request.signal.aborted || disposed) return
    const texture = new THREE.Texture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    const [scaleX, scaleY] = earthTextureUvScale(image.naturalWidth, image.naturalHeight)
    texture.repeat.set(scaleX, scaleY)
    texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 1)
    texture.needsUpdate = true
    const previous = earthTexture; earthTexture = texture
    for (const pane of panes) { pane.earth.material.map = texture; pane.earth.material.needsUpdate = true }
    previous?.dispose()
  } catch (error) {
    if (!disposed && !request.signal.aborted) baseTextureError.value = `地球底图加载失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    if (textureRequest === request) textureRequest = null
  }
}

function resize() {
  if (!host.value || !renderer || disposed) return
  const rect = host.value.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setSize(rect.width, rect.height, false)
  synchronizing = true
  panes.forEach((pane, index) => {
    const paneRect = orbitElements[index]!.getBoundingClientRect()
    pane.viewport = comparisonViewport(rect, paneRect)
    const zoomRatio = pane.camera.position.distanceTo(pane.controls.target) / pane.fitDistance
    pane.camera.aspect = Math.max(.05, paneRect.width / Math.max(1, paneRect.height))
    pane.fitDistance = comparisonFitDistance(pane.camera.aspect, fitRadius.value)
    pane.controls.maxDistance = pane.fitDistance * 3
    pane.camera.position.sub(pane.controls.target).setLength(Math.max(pane.controls.minDistance, pane.fitDistance * zoomRatio)).add(pane.controls.target)
    pane.camera.updateProjectionMatrix(); pane.controls.update()
  })
  synchronizing = false
  syncCamera(0)
}

function render(now: number) {
  if (disposed || !renderer) return
  // Match the source lesson clock, which also drives the bridged circulation.
  const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0
  lastTime = now
  if (props.stage > 0 && props.playing && interacting.size === 0 && now - lastInteraction > 1200) rotation += dt * .075 * props.speed
  renderer.setScissorTest(false)
  renderer.clear(true, true, true)
  renderer.setScissorTest(true)
  const labels: ClimateLabel[][] = []
  const circulationSources = props.getCirculationSources?.() ?? []
  for (const [index, pane] of panes.entries()) {
    pane.earth.rotation.y = rotation
    const { x, y, width, height } = pane.viewport
    const state = climateState(index)
    pane.surfaceClimate.update(dt, state)
    pane.circulation.update(circulationSources, pane.camera, pane.earth)
    pane.earth.updateWorldMatrix(true, true)
    labels.push([...pane.surfaceClimate.projectLabels(pane.camera, width, height, state),
      ...(props.layers.textAnnotations ? pane.thermalZones.projectLabels(pane.camera, width, height) : [])])
    renderer.setViewport(x, y, width, height); renderer.setScissor(x, y, width, height)
    renderer.render(pane.scene, pane.camera)
  }
  projectedLabels.value = labels
  animationFrame = requestAnimationFrame(render)
}

onMounted(() => {
  if (!host.value || !canvasHost.value || orbitElements.some(element => !element)) return
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setClearColor(0x000000, 0)
    renderer.autoClear = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NoToneMapping
    canvasHost.value.appendChild(renderer.domElement)
    sphereGeometry = new THREE.SphereGeometry(radius, 128, 64)
    createPane(0); createPane(1)
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    orbitElements.forEach(element => resizeObserver!.observe(element!))
    resize(); syncLayers(); void loadBaseTexture()
    animationFrame = requestAnimationFrame(render)
  } catch (error) {
    renderError.value = `暂时无法显示对比地球：${error instanceof Error ? error.message : String(error)}`
  }
})
onBeforeUnmount(() => {
  disposed = true; cancelAnimationFrame(animationFrame); textureRequest?.abort(); resizeObserver?.disconnect()
  cleanups.forEach(cleanup => cleanup())
  for (const pane of panes) {
    pane.controls.dispose(); pane.layers.dispose(); pane.surfaceClimate.dispose(); pane.circulation.dispose(); pane.thermalZones.dispose()
    disposeOwnedGroup(pane.surfaceClimate.group); disposeOwnedGroup(pane.graticule)
    pane.earth.material.dispose(); pane.scene.clear()
  }
  panes.length = 0; sphereGeometry?.dispose(); earthTexture?.dispose()
  renderer?.dispose(); renderer?.domElement.remove(); renderer = null
})

function disposeOwnedGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  group.traverse(object => {
    const mesh = object as THREE.Mesh
    if (mesh.geometry) geometries.add(mesh.geometry)
    for (const material of mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
      if (material instanceof THREE.ShaderMaterial)
        for (const uniform of Object.values(material.uniforms)) if (uniform.value instanceof THREE.Texture) textures.add(uniform.value)
    }
  })
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose())
  group.clear()
}
</script>

<style scoped>
.climate-comparison { position: fixed; top: 64px; right: 0; bottom: 90px; left: 0; z-index: 10; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); color: #dcedf7; background: linear-gradient(#000a1a3d, #000a1a3d), url('/geo-resources-folder/images/atmospheric-space-bg.png') center / cover no-repeat #000a1a; }
.comparison-canvas { position: absolute; inset: 0; pointer-events: none; }
.comparison-canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.comparison-pane { position: relative; min-width: 0; min-height: 0; }
.comparison-pane + .comparison-pane { border-left: 1px solid #78c4df1c; }
.comparison-title { position: absolute; top: 13px; right: 10px; left: 10px; display: flex; justify-content: center; align-items: center; gap: 9px; pointer-events: none; }
.comparison-title>span { display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid #71bad84d; border-radius: 5px; background: #0b253a9c; color: #88dce9; font-size: 11px; }
.comparison-title h3 { margin: 0; color: #d5eaf5; font-weight: 500; font-size: clamp(13px, 1.1vw, 18px); line-height: 1.4; }
.comparison-title p { margin: 2px 0 0; color: #7797ac; font-size: 10px; text-align: center; }
.comparison-orbit { position: absolute; top: 49px; right: 5px; bottom: 42px; left: 5px; touch-action: none; cursor: grab; outline: none; }
.comparison-orbit:active { cursor: grabbing; }
.comparison-labels { position: absolute; top: 49px; right: 5px; bottom: 42px; left: 5px; overflow: hidden; pointer-events: none; }
.comparison-labels span { position: absolute; transform: translate(-50%, -50%); white-space: pre-line; width: max-content; font-size: 10px; line-height: 1.2; text-align: center; text-shadow: 0 1px 3px #000, 0 0 5px #000; }
.comparison-labels .thermal-zone-label { padding: 2px 5px; border-radius: 3px; background: #06162480; font-size: 11px; font-weight: 600; letter-spacing: 1px; }
.comparison-status { position: absolute; top: 48%; left: 50%; transform: translate(-50%, -50%); width: max-content; max-width: calc(100% - 52px); padding: 10px 14px; border: 1px solid #5b9bb13b; border-radius: 8px; background: #04182be6; color: #a6cfdf; font-size: 12px; text-align: center; pointer-events: none; }
.comparison-status.is-error { pointer-events: auto; }
.comparison-status p { margin: 0 0 8px; line-height: 1.5; }
.comparison-status button, .comparison-base-error button { padding: 5px 9px; border: 1px solid #3e728d; border-radius: 5px; background: #0d334a; color: #b9eff7; font: inherit; cursor: pointer; }
.comparison-legend { position: absolute; z-index: 2; left: 16px; bottom: 13px; max-width: min(340px, calc(100% - 32px)); color: #a7c7da; font-size: 11px; }
.comparison-legend summary { width: fit-content; padding: 5px 8px; border-radius: 5px; background: #071b2dc9; cursor: pointer; }
.comparison-legend summary span { margin-left: 5px; color: #6fa6bf; font-size: 10px; }
.comparison-legend[open] { padding: 8px; border: 1px solid #2a526b; border-radius: 8px; background: #061c2ef5; }
.comparison-legend[open] summary { padding: 0 0 7px; background: none; }
.comparison-legend-items { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px 11px; max-height: 220px; overflow-y: auto; scrollbar-width: thin; }
.comparison-legend-items>div { display: flex; align-items: center; gap: 6px; font-size: 10px; line-height: 1.4; }
.comparison-legend-items i { width: 19px; height: 10px; flex: 0 0 19px; border: 1px solid #ffffff30; border-radius: 2px; }
.comparison-help { position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); margin: 0; color: #75a1b8; font-size: 10px; white-space: nowrap; pointer-events: none; }
.comparison-base-error { position: absolute; z-index: 3; top: 49px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 9px; max-width: calc(100% - 40px); padding: 9px 12px; border: 1px solid #537f99; border-radius: 6px; background: #061c2eea; color: #b2cfdf; font-size: 11px; }
.comparison-base-error button { flex: 0 0 auto; }
button:focus-visible, summary:focus-visible { outline: 2px solid #8be2f1; outline-offset: 3px; }
@media (max-width: 760px) and (orientation: portrait) {
  .climate-comparison { grid-template-columns: 1fr; grid-template-rows: repeat(2, minmax(0, 1fr)); }
  .comparison-pane + .comparison-pane { border-left: 0; border-top: 1px solid #78c4df1c; }
  .comparison-title { top: 8px; }
  .comparison-orbit { top: 38px; bottom: 31px; }
  .comparison-labels { top: 38px; bottom: 31px; }
  .comparison-legend { left: 10px; bottom: 5px; }
  .comparison-legend-items { max-height: 160px; }
  .comparison-help { bottom: -13px; font-size: 9px; }
}
</style>
