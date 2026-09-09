<template>
  <div class="campus-modal-backdrop" @click.self="emit('close')">
    <section ref="dialogRef" class="campus-modal" role="dialog" aria-modal="true" aria-labelledby="campus-3d-title" aria-describedby="campus-3d-description" tabindex="-1" @keydown="onDialogKeydown">
      <header class="campus-modal-header">
        <div><p class="campus-kicker">CAMPUS ATELIER / 校园沙盘</p><h2 id="campus-3d-title">我们的校园 <span>3D</span></h2></div>
        <button ref="closeRef" type="button" class="campus-button close-campus" aria-label="关闭 3D 校园" @click="emit('close')">关闭 <span aria-hidden="true">×</span></button>
      </header>
      <div class="campus-modal-stage">
        <div ref="hostRef" class="campus-canvas-host" role="img" aria-label="校园三维沙盘：东为经度增加方向，北为纬度增加方向；拖动旋转，滚轮缩放" />
        <div class="campus-scene-caption"><span class="campus-mode">校园沙盘</span><p id="campus-3d-description">{{ features.length }} 个地物 · 按经纬度定位<br /><small>建筑高度与点状建筑外形为卡通示意</small></p></div>
        <div class="campus-orientation" aria-label="随视角变化的地理方位指示">
          <div class="campus-compass-rose">
            <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36" /><path d="M50 14V86M14 50H86" :transform="`rotate(${compassAngle} 50 50)`" /></svg>
            <span v-for="direction in directions" :key="direction.label" :class="{ north: direction.label === '北' }" :style="directionStyle(direction.angle)">{{ direction.label }}<small>{{ direction.letter }}</small></span>
            <i aria-hidden="true">⌖</i>
          </div>
          <p>真实方位 · 随视角更新</p>
        </div>
        <div v-if="loading || sceneError" class="campus-scene-message" :role="sceneError ? 'alert' : 'status'">
          <strong>{{ sceneError ? '暂时无法显示 3D 校园' : '正在搭建校园沙盘…' }}</strong>
          <p>{{ sceneError || '保留地图中的位置、道路和建筑轮廓' }}</p>
          <button v-if="sceneError" type="button" class="campus-button" @click="emit('close')">返回地图</button>
        </div>
        <div v-if="!loading && !sceneError" class="campus-scene-controls">
          <button type="button" class="campus-button" @click="showOverview()">校园全景</button>
          <button type="button" class="campus-button" @click="showNorthView">正北俯视</button>
          <button type="button" class="campus-button" aria-label="向左旋转 3D 校园视角" @click="rotateView(-1)">↶</button>
          <button type="button" class="campus-button" aria-label="向右旋转 3D 校园视角" @click="rotateView(1)">↷</button>
        </div>
        <div v-if="!loading && !sceneError" class="campus-tour-card" aria-live="polite">
          <span class="tour-step">{{ buildings.length ? currentShot >= 0 ? `镜头 ${currentShot + 1} / ${buildings.length}` : '校园全景' : '自由参观' }}</span>
          <strong>{{ currentShot >= 0 ? buildings[currentShot]?.name : tourFinished ? '参观完成' : '自由查看校园' }}</strong>
          <p>{{ !buildings.length ? '当前只有景观、道路或场地，添加建筑后可自动逐栋参观。' : touring ? '正在自动参观每栋建筑，拖动沙盘可暂停。' : tourFinished ? '已逐栋参观完成，可重播或自由查看。' : tourStarted ? '导览已暂停，可以拖动查看或继续参观。' : `拖动观察校园，或自动参观 ${buildings.length} 栋建筑。` }}</p>
          <div v-if="buildings.length" class="tour-buttons">
            <button type="button" class="campus-button tour-primary" @click="toggleTour">{{ touring ? '暂停导览' : tourFinished ? '重新参观' : tourStarted ? '继续导览' : '自动参观' }}</button>
            <button v-if="tourStarted" type="button" class="campus-button" @click="restartTour">从头参观</button>
          </div>
        </div>
      </div>
      <footer class="campus-modal-footer">
        <p>拖动旋转 · 滚轮缩放 <span>｜</span> 方位以草地边缘和右上角标识为准</p>
        <span>中心 {{ Math.abs(layout.origin.lng).toFixed(5) }}°{{ layout.origin.lng < 0 ? 'W' : 'E' }} · {{ Math.abs(layout.origin.lat).toFixed(5) }}°{{ layout.origin.lat < 0 ? 'S' : 'N' }}</span>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createCampusLayout, type CampusFeature } from './campus-3d-layout'
import { buildCampusModel, type CampusBuilding } from './campus-3d-model'
import type { Coordinate } from './map-lesson'

const props = defineProps<{ features: CampusFeature[]; center: Coordinate }>()
const emit = defineEmits<{ close: [] }>()
const hostRef = ref<HTMLElement | null>(null)
const dialogRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLButtonElement | null>(null)
const loading = ref(true)
const sceneError = ref('')
const layout = computed(() => createCampusLayout(props.features, props.center))
const buildings = shallowRef<CampusBuilding[]>([])
const currentShot = ref(-1)
const touring = ref(false)
const tourStarted = ref(false)
const tourFinished = ref(false)
const compassAngle = ref(0)
const directions = [{ label: '北', letter: 'N', angle: 0 }, { label: '东', letter: 'E', angle: 90 }, { label: '南', letter: 'S', angle: 180 }, { label: '西', letter: 'W', angle: 270 }]
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let frame = 0
let disposed = false
let sceneClock = 0
let previousTime = 0
let nextShotAt = Infinity
let maxBuildingHeight = 20
let previousFocus: HTMLElement | null = null
let updateModel: ((elapsedSeconds: number) => void) | null = null
type Flight = { fromPosition: THREE.Vector3; fromTarget: THREE.Vector3; toPosition: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number; arc: number; done?: () => void }
let flight: Flight | null = null

function directionStyle(angle: number) {
  const radians = (angle + compassAngle.value) * Math.PI / 180
  return { left: `${50 + 38 * Math.sin(radians)}%`, top: `${50 - 38 * Math.cos(radians)}%` }
}
function cancelTour() {
  touring.value = false
  nextShotAt = Infinity
  flight = null
}
function flyTo(position: THREE.Vector3, target: THREE.Vector3, duration = 1400, done?: () => void) {
  if (!camera || !controls) return
  flight = { fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), toPosition: position, toTarget: target, start: sceneClock, duration, arc: Math.max(18, maxBuildingHeight * 0.8), done }
}
function overviewPosition(northView = false) {
  if (!camera) return new THREE.Vector3(0, 190, 245)
  const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect))
  const distance = (layout.value.radius + 16) / Math.sin(halfFov) * 1.07
  return new THREE.Vector3(0, northView ? 1 : 0.78, northView ? 0.001 : 1).normalize().multiplyScalar(distance)
}
function showOverview(animate = true, preserveTour = false) {
  if (!camera || !controls) return
  if (!preserveTour) cancelTour()
  currentShot.value = -1
  const position = overviewPosition()
  if (animate) flyTo(position, new THREE.Vector3())
  else { flight = null; camera.position.copy(position); controls.target.set(0, 0, 0); controls.update() }
}
function showNorthView() {
  cancelTour()
  currentShot.value = -1
  flyTo(overviewPosition(true), new THREE.Vector3())
}
function rotateView(direction: number) {
  if (!camera || !controls) return
  cancelTour()
  const target = controls.target.clone()
  const offset = camera.position.clone().sub(target).applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 4)
  flyTo(offset.add(target), target, 550)
}
function focusBuilding(index: number) {
  if (!camera || !controls) return
  const building = buildings.value[index]
  if (!building) return
  currentShot.value = index
  const target = building.target.clone()
  const halfFov = Math.min(THREE.MathUtils.degToRad(camera.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect))
  const subjectRadius = Math.max(9, Math.hypot(building.radius, building.height * 0.55))
  const distance = subjectRadius / Math.sin(halfFov) * 1.35
  const position = new THREE.Vector3(0.55, 0.85, 1).normalize().multiplyScalar(distance).add(target)
  nextShotAt = Infinity
  flyTo(position, target, 1700, () => { if (touring.value) nextShotAt = sceneClock + 2900 })
}
function advanceTour() {
  if (!touring.value) return
  const index = currentShot.value + 1
  if (index < buildings.value.length) focusBuilding(index)
  else {
    touring.value = false
    tourFinished.value = true
    nextShotAt = Infinity
    showOverview(true, true)
  }
}
function restartTour() {
  if (!buildings.value.length) return
  cancelTour()
  tourStarted.value = true
  tourFinished.value = false
  touring.value = true
  showOverview(true, true)
  nextShotAt = sceneClock + 2200
}
function toggleTour() {
  if (touring.value) { cancelTour(); return }
  if (tourFinished.value || !tourStarted.value) { restartTour(); return }
  touring.value = true
  if (currentShot.value >= 0) focusBuilding(currentShot.value)
  else nextShotAt = sceneClock + 300
}
function onContextLost(event: Event) {
  event.preventDefault()
  cancelTour()
  sceneError.value = '浏览器的 3D 绘图已中断，请关闭弹窗后重新生成。地图中的绘制会保留。'
  cancelAnimationFrame(frame)
}
function resizeScene() {
  const host = hostRef.value
  if (!host || !renderer || !camera || !host.clientWidth || !host.clientHeight) return
  camera.aspect = host.clientWidth / host.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(host.clientWidth, host.clientHeight)
  if (currentShot.value < 0 && !flight) showOverview(false, true)
}
function animate(time: number) {
  if (disposed || !renderer || !scene || !camera || !controls) return
  const delta = previousTime ? Math.min(80, time - previousTime) : 0
  previousTime = time
  if (!document.hidden) {
    sceneClock += delta
    if (flight) {
      const active = flight
      const t = Math.min(1, (sceneClock - active.start) / active.duration)
      const eased = t * t * (3 - 2 * t)
      camera.position.lerpVectors(active.fromPosition, active.toPosition, eased)
      camera.position.y += Math.sin(Math.PI * eased) * active.arc
      controls.target.lerpVectors(active.fromTarget, active.toTarget, eased)
      if (t === 1) { flight = null; active.done?.() }
    }
    controls.update()
    // With a camera south of its target, north is up. Turning east moves north to screen-right.
    compassAngle.value = Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()) * 10) / 10
    if (touring.value && !flight && sceneClock >= nextShotAt) advanceTour()
    updateModel?.(sceneClock / 1000)
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(animate)
}
function onDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.stopPropagation(); emit('close'); return }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const focusable = [...dialogRef.value.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length)
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function releaseScene() {
  cancelAnimationFrame(frame)
  updateModel = null
  cancelTour()
  resizeObserver?.disconnect()
  controls?.dispose()
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  scene?.traverse(object => {
    const drawable = object as THREE.Mesh
    if (drawable.geometry) geometries.add(drawable.geometry)
    if (drawable.material) (Array.isArray(drawable.material) ? drawable.material : [drawable.material]).forEach(material => {
      materials.add(material)
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value) })
      if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach(uniform => {
        if (uniform.value instanceof THREE.Texture) textures.add(uniform.value)
        else if (Array.isArray(uniform.value)) uniform.value.forEach(value => { if (value instanceof THREE.Texture) textures.add(value) })
      })
    })
    if (object instanceof THREE.Light && 'shadow' in object) (object as THREE.DirectionalLight).shadow?.dispose()
  })
  geometries.forEach(geometry => geometry.dispose())
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
  renderer?.domElement.removeEventListener('webglcontextlost', onContextLost)
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
  renderer = null; scene = null; camera = null; controls = null
}
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  if (disposed || !hostRef.value) return
  closeRef.value?.focus()
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color('#e5f1e9')
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 4000)
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    hostRef.value.appendChild(renderer.domElement)
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = false
    controls.enablePan = false
    controls.minDistance = 12
    controls.maxDistance = 1800
    controls.minPolarAngle = 0.001
    controls.maxPolarAngle = Math.PI * 0.47
    controls.addEventListener('start', cancelTour)
    scene.add(new THREE.HemisphereLight('#f6fbff', '#8aab72', 2.1))
    const sun = new THREE.DirectionalLight('#fff0d4', 2.5)
    sun.position.set(-100, 190, 95)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = sun.shadow.camera.bottom = -140
    sun.shadow.camera.right = sun.shadow.camera.top = 140
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 500
    sun.shadow.normalBias = 0.18
    scene.add(sun)
    const model = buildCampusModel(layout.value)
    updateModel = model.update
    buildings.value = model.buildings
    maxBuildingHeight = Math.max(20, ...model.buildings.map(building => building.height))
    scene.add(model.group)
    resizeScene()
    showOverview(false)
    resizeObserver = new ResizeObserver(resizeScene)
    resizeObserver.observe(hostRef.value)
    loading.value = false
    frame = requestAnimationFrame(animate)
  } catch {
    releaseScene()
    loading.value = false
    sceneError.value = '当前浏览器无法启动 WebGL 3D 渲染。请启用图形加速后重试，地图中的绘制会保留。'
  }
})
onBeforeUnmount(() => {
  disposed = true
  releaseScene()
  const focus = previousFocus
  nextTick(() => { if (focus?.isConnected) focus.focus() })
})
</script>

<style scoped>
.campus-modal-backdrop { position: fixed; inset: 0; z-index: 3000; padding: 28px; display: grid; place-items: center; background: #071823c7; backdrop-filter: blur(8px); }
.campus-modal { display: flex; flex-direction: column; width: min(1440px, 100%); height: min(940px, 100%); overflow: hidden; border: 1px solid #d8e9df; border-radius: 22px; background: #f4f7ee; box-shadow: 0 30px 100px #0006; color: #294a45; font-family: inherit; }
.campus-modal-header { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; padding: 19px 26px; gap: 20px; background: #fbfcf6; border-bottom: 1px solid #d9e5dc; }
.campus-kicker { margin: 0 0 6px; color: #6a8980; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
.campus-modal h2 { margin: 0; font-size: 23px; font-weight: 750; letter-spacing: 1px; }
.campus-modal h2 span { margin-left: 9px; padding: 3px 7px; vertical-align: middle; border-radius: 5px; background: #e0eecb; color: #607744; font-size: 12px; letter-spacing: 0; }
.campus-button { min-height: 36px; padding: 8px 13px; border: 1px solid #cbdcd1; border-radius: 9px; background: #fffffff0; color: #31594d; font: inherit; font-size: 12px; cursor: pointer; }
.campus-button:hover { background: #e9f2df; border-color: #97b6a2; }
.campus-button:focus-visible { outline: 3px solid #4a947c; outline-offset: 3px; }
.close-campus { display: flex; gap: 17px; align-items: center; flex-shrink: 0; }
.close-campus span { font-size: 22px; line-height: 15px; }
.campus-modal-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.campus-canvas-host { position: absolute; inset: 0; }
.campus-canvas-host :deep(canvas) { display: block; width: 100%; height: 100%; touch-action: none; }
.campus-scene-caption { position: absolute; left: 24px; top: 24px; pointer-events: none; }
.campus-mode { display: inline-block; background: #f8fcf3eb; padding: 7px 11px; border: 1px solid #c6d8c7; border-radius: 7px; font-size: 12px; font-weight: 700; }
.campus-scene-caption p { margin: 9px 0 0; font-size: 12px; color: #46695d; line-height: 1.8; }
.campus-scene-caption small { font-size: 11px; color: #738779; }
.campus-orientation { position: absolute; right: 20px; top: 16px; padding: 9px; background: #fbfdf5d9; border: 1px solid #d6e4d5; border-radius: 15px; pointer-events: none; }
.campus-compass-rose { position: relative; width: 110px; height: 110px; }
.campus-compass-rose svg { width: 100%; height: 100%; fill: none; stroke: #a9bca6; stroke-width: 0.65; }
.campus-compass-rose span { position: absolute; transform: translate(-50%, -50%); min-width: 25px; text-align: center; background: #fbfdf5; color: #4d6857; font-size: 14px; font-weight: 750; line-height: 1.15; border-radius: 5px; padding: 1px; }
.campus-compass-rose span.north { color: #b15e3b; }
.campus-compass-rose small { display: block; font-size: 8px; margin-top: 2px; }
.campus-compass-rose i { position: absolute; inset: 40%; display: grid; place-items: center; font-style: normal; font-size: 21px; color: #72947b; }
.campus-orientation p { margin: 3px 0 0; text-align: center; font-size: 9px; color: #6c8671; }
.campus-scene-controls { position: absolute; right: 20px; bottom: 20px; display: flex; flex-wrap: wrap; gap: 7px; }
.campus-tour-card { position: absolute; left: 24px; bottom: 20px; width: 255px; padding: 17px; border: 1px solid #d1dfc9; background: #fffef2ed; border-radius: 15px; box-shadow: 0 7px 24px #3c5c4412; }
.tour-step { display: block; color: #8a9568; font-size: 10px; letter-spacing: 1px; }
.campus-tour-card strong { display: block; margin-top: 7px; font-size: 19px; color: #3e604d; }
.campus-tour-card p { color: #76816a; line-height: 1.6; font-size: 11px; margin: 8px 0 0; }
.tour-buttons { display: flex; gap: 7px; margin-top: 13px; }
.tour-primary { background: #315e4b; border-color: #315e4b; color: #fffdf0; }
.tour-primary:hover { background: #42745e; color: #fff; }
.campus-modal-footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 24px; border-top: 1px solid #d7e5d8; background: #fbfcf6; color: #6e8271; font-size: 11px; }
.campus-modal-footer p { margin: 0; }
.campus-modal-footer p span { margin: 0 6px; color: #bccab9; }
.campus-modal-footer > span { font-size: 10px; white-space: nowrap; }
.campus-scene-message { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(400px, 85%); padding: 26px; box-sizing: border-box; border: 1px solid #c4d7c7; border-radius: 15px; background: #fffef7; text-align: center; }
.campus-scene-message p { font-size: 13px; color: #718272; line-height: 1.8; }
@media (max-width: 850px) {
  .campus-modal-backdrop { padding: 10px; }
  .campus-modal-header { padding: 14px 17px; }
  .campus-modal h2 { font-size: 19px; }
  .campus-scene-caption { top: 16px; left: 16px; }
  .campus-orientation { right: 12px; top: 12px; padding: 5px; }
  .campus-compass-rose { width: 94px; height: 94px; }
  .campus-tour-card { left: 14px; bottom: 64px; width: 215px; padding: 12px; }
  .campus-scene-controls { bottom: 12px; right: 12px; }
  .campus-modal-footer { padding: 10px 14px; flex-wrap: wrap; font-size: 10px; gap: 5px; }
}
@media (max-height: 650px) {
  .campus-modal-backdrop { padding: 8px; }
  .campus-modal-header { padding: 10px 20px; }
  .campus-kicker { display: none; }
  .campus-tour-card { padding: 11px; width: 230px; }
  .campus-tour-card strong { font-size: 16px; }
}
</style>
