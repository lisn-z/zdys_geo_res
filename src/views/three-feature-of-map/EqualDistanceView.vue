<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import type { Coordinate } from './map-lesson'
import { EARTH_RADIUS_METERS, projectEquidistant } from './equidistant-projection'

const props = withDefaults(defineProps<{
  points: readonly Coordinate[]
  graticule?: boolean
  active?: boolean
}>(), { graticule: false, active: true })
const emit = defineEmits<{
  ready: []
  error: [message: string]
  metrics: [value: { rulerMetres: number; metresPerPixel: number; distanceMetres: number }]
}>()

const host = ref<HTMLDivElement>()
const width = ref(1)
const height = ref(1)
const metresPerPixel = ref(1)
const centre = ref({ x: 0, y: 0 })
const textureState = ref<'loading' | 'ready' | 'failed'>('loading')
const rendererFailed = ref(false)
const dragging = ref(false)
const origin = computed(() => props.points[0] ?? { lat: 0, lng: 0 })
const target = computed(() => projectEquidistant(origin.value, props.points[1] ?? origin.value))
const distanceMetres = computed(() => target.value.distanceMeters)
const pointA = computed(() => toScreen(0, 0))
const pointB = computed(() => toScreen(target.value.x, target.value.y))
const screenLength = computed(() => Math.hypot(pointB.value.x - pointA.value.x, pointB.value.y - pointA.value.y))
const rulerMetres = computed(() => {
  const limit = metresPerPixel.value * (width.value < 600 ? 106 : 130)
  const power = 10 ** Math.floor(Math.log10(limit))
  const number = limit / power
  return (number >= 5 ? 5 : number >= 2 ? 2 : 1) * power
})
const rulerPixels = computed(() => rulerMetres.value / metresPerPixel.value)
const rulerLabel = computed(() => formatDistance(rulerMetres.value))
const unitVector = computed(() => {
  const length = screenLength.value
  return length ? { x: (pointB.value.x - pointA.value.x) / length, y: (pointB.value.y - pointA.value.y) / length } : { x: 1, y: 0 }
})
const visibleTicks = computed(() => {
  const a = pointA.value
  const b = pointB.value
  const clipped = clipSegment(a, b, width.value, height.value)
  if (!clipped || distanceMetres.value === 0) return []
  const from = Math.max(1, Math.ceil(clipped[0] * distanceMetres.value / rulerMetres.value))
  const to = Math.min(Math.ceil(distanceMetres.value / rulerMetres.value) - 1, Math.floor(clipped[1] * distanceMetres.value / rulerMetres.value))
  const stride = Math.max(1, Math.ceil((to - from + 1) / 40))
  const ticks: { id: number; x: number; y: number; text: string }[] = []
  for (let number = from; number <= to; number += stride) {
    const fraction = number * rulerMetres.value / distanceMetres.value
    ticks.push({ id: number, x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, text: formatDistance(number * rulerMetres.value) })
  }
  return ticks
})
const visibleRings = computed(() => {
  // Rings are true origin-to-point distances, in the same metre coordinates as
  // the raster projection, the A–B line and the ruler. Never infer metres from pixels.
  const nearestX = Math.max(0, -pointA.value.x, pointA.value.x - width.value)
  const nearestY = Math.max(0, -pointA.value.y, pointA.value.y - height.value)
  const near = Math.hypot(nearestX, nearestY) * metresPerPixel.value
  const far = Math.max(...[{ x: 0, y: 0 }, { x: width.value, y: 0 }, { x: width.value, y: height.value }, { x: 0, y: height.value }]
    .map(point => Math.hypot(point.x - pointA.value.x, point.y - pointA.value.y))) * metresPerPixel.value
  const interval = rulerMetres.value * 2
  const first = Math.max(1, Math.ceil(near / interval))
  const last = Math.min(Math.floor(far / interval), Math.floor(Math.PI * EARTH_RADIUS_METERS / interval))
  const stride = Math.max(1, Math.ceil((last - first + 1) / 18))
  const rings: { distance: number; radius: number }[] = []
  for (let n = first; n <= last; n += stride) rings.push({ distance: n * interval, radius: n * interval / metresPerPixel.value })
  return rings
})

let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.OrthographicCamera | undefined
let material: THREE.ShaderMaterial | undefined
let geometry: THREE.PlaneGeometry | undefined
let texture: THREE.Texture | undefined
let observer: ResizeObserver | undefined
let frame = 0
let disposed = false
let textureTimeout: ReturnType<typeof setTimeout> | undefined
const pointers = new Map<number, { x: number; y: number }>()
let gesture: { distance: number; midpoint: { x: number; y: number } } | undefined

function formatDistance(metres: number) {
  const value = metres >= 1000 ? metres / 1000 : metres
  return `${Number(value.toPrecision(7)).toLocaleString('zh-CN', { maximumFractionDigits: 3 })} ${metres >= 1000 ? '千米' : '米'}`
}

function toScreen(x: number, y: number) {
  return { x: width.value / 2 + (x - centre.value.x) / metresPerPixel.value, y: height.value / 2 - (y - centre.value.y) / metresPerPixel.value }
}

function clipSegment(a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number): [number, number] | null {
  let low = 0
  let high = 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  for (const [p, q] of [[-dx, a.x], [dx, w - a.x], [-dy, a.y], [dy, h - a.y]] as [number, number][]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue }
    const ratio = q / p
    if (p < 0) low = Math.max(low, ratio)
    else high = Math.min(high, ratio)
    if (low > high) return null
  }
  return [low, high]
}

function fitToPair() {
  if (!host.value) return
  const desktop = width.value >= 900
  const left = desktop ? 430 : 36
  const right = desktop ? 90 : 46
  const top = desktop ? 160 : 180
  const bottom = 110
  const usableWidth = Math.max(120, width.value - left - right)
  const usableHeight = Math.max(120, height.value - top - bottom)
  const required = Math.max(Math.abs(target.value.x) / usableWidth, Math.abs(target.value.y) / usableHeight, distanceMetres.value / (Math.hypot(usableWidth, usableHeight) * .94), .25)
  // A stable zoom ladder; all displayed geometry still shares this exact scale.
  metresPerPixel.value = Math.min(250000, Math.max(.025, 2 ** Math.ceil(Math.log2(required))))
  const focalX = left + usableWidth / 2
  const focalY = top + usableHeight / 2
  centre.value = {
    x: target.value.x / 2 - (focalX - width.value / 2) * metresPerPixel.value,
    y: target.value.y / 2 + (focalY - height.value / 2) * metresPerPixel.value,
  }
  scheduleRender()
}

function scaleAt(factor: number, point = { x: width.value / 2, y: height.value / 2 }) {
  const oldScale = metresPerPixel.value
  const newScale = Math.max(.025, Math.min(250000, oldScale * factor))
  centre.value = {
    x: centre.value.x + (point.x - width.value / 2) * (oldScale - newScale),
    y: centre.value.y - (point.y - height.value / 2) * (oldScale - newScale),
  }
  metresPerPixel.value = newScale
  scheduleRender()
}
function zoomBy(delta: number) { scaleAt(2 ** -delta) }
defineExpose({ zoomBy, fitToPair })

function scheduleRender() {
  if (disposed || !props.active || frame) return
  frame = requestAnimationFrame(() => { frame = 0; render() })
}

function render() {
  if (!renderer || !scene || !camera || !material || disposed) return
  material.uniforms.viewport!.value.set(width.value, height.value)
  material.uniforms.centreRadians!.value.set(centre.value.x / EARTH_RADIUS_METERS, centre.value.y / EARTH_RADIUS_METERS)
  material.uniforms.radiansPerPixel!.value = metresPerPixel.value / EARTH_RADIUS_METERS
  material.uniforms.originRadians!.value.set(origin.value.lat * Math.PI / 180, origin.value.lng * Math.PI / 180)
  material.uniforms.showGrid!.value = props.graticule ? 1 : 0
  renderer.render(scene, camera)
}

function localPoint(event: PointerEvent | WheelEvent) {
  const rect = host.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
function currentGesture() {
  const values = [...pointers.values()]
  if (values.length < 2) return undefined
  const first = values[0]!
  const second = values[1]!
  return { distance: Math.hypot(second.x - first.x, second.y - first.y), midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } }
}
function onPointerDown(event: PointerEvent) {
  if (!props.active || (event.pointerType === 'mouse' && event.button !== 0)) return
  host.value?.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, localPoint(event))
  gesture = currentGesture()
  dragging.value = true
}
function onPointerMove(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  if (!previous) return
  const next = localPoint(event)
  pointers.set(event.pointerId, next)
  const nextGesture = currentGesture()
  if (gesture && nextGesture) {
    centre.value = {
      x: centre.value.x - (nextGesture.midpoint.x - gesture.midpoint.x) * metresPerPixel.value,
      y: centre.value.y + (nextGesture.midpoint.y - gesture.midpoint.y) * metresPerPixel.value,
    }
    if (nextGesture.distance > 5 && gesture.distance > 5) scaleAt(gesture.distance / nextGesture.distance, nextGesture.midpoint)
  } else if (pointers.size === 1) {
    centre.value = { x: centre.value.x - (next.x - previous.x) * metresPerPixel.value, y: centre.value.y + (next.y - previous.y) * metresPerPixel.value }
  }
  gesture = nextGesture
  scheduleRender()
}
function onPointerEnd(event: PointerEvent) {
  pointers.delete(event.pointerId)
  gesture = currentGesture()
  dragging.value = pointers.size > 0
  if (host.value?.hasPointerCapture(event.pointerId)) host.value.releasePointerCapture(event.pointerId)
}
function onWheel(event: WheelEvent) {
  if (!props.active) return
  event.preventDefault()
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height.value : 1)
  scaleAt(Math.exp(Math.max(-.5, Math.min(.5, delta * .0015))), localPoint(event))
}

function initialiseRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.value!.prepend(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2)
    camera.position.z = 1
    geometry = new THREE.PlaneGeometry(2, 2)
    material = new THREE.ShaderMaterial({
      uniforms: {
        viewport: { value: new THREE.Vector2(1, 1) }, centreRadians: { value: new THREE.Vector2() },
        radiansPerPixel: { value: 1 }, originRadians: { value: new THREE.Vector2() },
        earthMap: { value: null }, hasTexture: { value: 0 }, showGrid: { value: 0 },
      },
      vertexShader: `varying vec2 screenUv;
        void main() { screenUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `precision highp float;
        varying vec2 screenUv;
        uniform vec2 viewport;
        uniform vec2 centreRadians;
        uniform float radiansPerPixel;
        uniform vec2 originRadians;
        uniform sampler2D earthMap;
        uniform float hasTexture;
        uniform float showGrid;
        const float PI = 3.141592653589793;
        float latitudeLine(float latitude, float target) {
          return 1.0 - smoothstep(.4, 1.4, abs(latitude - target) / max(fwidth(latitude), .00000001));
        }
        void main() {
          vec2 position = centreRadians + (screenUv - .5) * viewport * radiansPerPixel;
          float rho = length(position);
          vec3 colour = vec3(.014, .045, .067);
          if (rho < PI) {
            float sinOrigin = sin(originRadians.x);
            float cosOrigin = cos(originRadians.x);
            float latitude = originRadians.x;
            float longitude = originRadians.y;
            if (rho > .000000001) {
              float sinC = sin(rho);
              float cosC = cos(rho);
              latitude = asin(clamp(cosC * sinOrigin + position.y * sinC * cosOrigin / rho, -1.0, 1.0));
              longitude += atan(position.x * sinC, rho * cosOrigin * cosC - position.y * sinOrigin * sinC);
            }
            vec2 earthUv = vec2(fract(longitude / (2.0 * PI) + .5), latitude / PI + .5);
            if (hasTexture > .5) colour = texture2D(earthMap, earthUv).rgb * .86;
            else colour = vec3(.026, .092, .111);
            if (showGrid > .5) {
              vec2 degrees = vec2(longitude, latitude) * (180.0 / PI);
              vec2 grid = abs(fract(degrees / 30.0 + .5) - .5) * 30.0;
              vec2 derivative = max(fwidth(degrees), vec2(.000001));
              float ordinary = 1.0 - smoothstep(.3, 1.2, min(grid.x / derivative.x, grid.y / derivative.y));
              colour = mix(colour, vec3(.36, .76, .77), ordinary * .34);
              float equator = latitudeLine(degrees.y, 0.0);
              float tropics = max(latitudeLine(degrees.y, 23.433333333), latitudeLine(degrees.y, -23.433333333));
              float polar = max(latitudeLine(degrees.y, 66.566666667), latitudeLine(degrees.y, -66.566666667));
              float dash = step(.42, fract(gl_FragCoord.x / 15.0));
              colour = mix(colour, vec3(.86, .11, .15), equator * .95);
              colour = mix(colour, vec3(.95, .7, .16), tropics * dash * .9);
              colour = mix(colour, vec3(.46, .56, .91), polar * dash * .9);
            }
          }
          gl_FragColor = vec4(colour, 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    })
    scene.add(new THREE.Mesh(geometry, material))
    textureTimeout = setTimeout(() => {
      if (!disposed && textureState.value === 'loading') {
        textureState.value = 'failed'
        emit('error', '影像暂未载入；A、B 距离与比例尺仍可使用。')
      }
    }, 20000)
    new THREE.TextureLoader().load('/geo-resources-folder/images/Material.001_diffuse.jpg', loaded => {
      if (disposed) { loaded.dispose(); return }
      clearTimeout(textureTimeout)
      texture = loaded
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.minFilter = THREE.LinearFilter
      texture.generateMipmaps = false
      material!.uniforms.earthMap!.value = texture
      material!.uniforms.hasTexture!.value = 1
      textureState.value = 'ready'
      scheduleRender()
      emit('ready')
    }, undefined, () => {
      if (disposed) return
      clearTimeout(textureTimeout)
      textureState.value = 'failed'
      emit('error', '影像载入失败；A、B 距离与比例尺仍可使用。')
    })
  } catch {
    rendererFailed.value = true
    textureState.value = 'failed'
    emit('error', '当前设备无法显示影像，已保留等距量图和比例尺。')
  }
}

watch([rulerMetres, metresPerPixel, distanceMetres], () => {
  emit('metrics', { rulerMetres: rulerMetres.value, metresPerPixel: metresPerPixel.value, distanceMetres: distanceMetres.value })
}, { immediate: true })
watch(() => props.points, () => { fitToPair(); scheduleRender() }, { deep: true })
watch(() => props.graticule, scheduleRender)
watch(() => props.active, active => {
  if (active) scheduleRender()
  else { pointers.clear(); gesture = undefined; dragging.value = false }
})

onMounted(async () => {
  initialiseRenderer()
  await nextTick()
  if (!host.value || disposed) return
  const resize = () => {
    if (!host.value || disposed) return
    const rect = host.value.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const first = width.value === 1
    const changedLayout = (width.value >= 900) !== (rect.width >= 900)
    width.value = rect.width
    height.value = rect.height
    // Resize and paint in one callback so the drawing buffer never flashes clear.
    renderer?.setSize(rect.width, rect.height, false)
    if (first || changedLayout) fitToPair()
    render()
  }
  observer = new ResizeObserver(resize)
  observer.observe(host.value)
  resize()
  host.value.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  clearTimeout(textureTimeout)
  observer?.disconnect()
  host.value?.removeEventListener('wheel', onWheel)
  pointers.clear()
  geometry?.dispose()
  material?.dispose()
  texture?.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
})
</script>

<template>
  <div
    ref="host" class="equal-distance-view" :class="{ dragging }"
    :data-distance-metres="distanceMetres" :data-ruler-metres="rulerMetres"
    :data-metres-per-pixel="metresPerPixel" :data-distance-pixels="screenLength"
    :data-ruler-pixels="rulerPixels"
    role="img" aria-label="以 A 点为中心的等距量图，连线上的每一格与左下角比例尺长度相同"
    @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd" @lostpointercapture="onPointerEnd"
  >
    <svg class="equal-distance-overlay" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
      <g class="distance-rings">
        <circle v-for="ring in visibleRings" :key="ring.distance" :cx="pointA.x" :cy="pointA.y" :r="ring.radius" />
      </g>
      <line class="distance-route-shadow" :x1="pointA.x" :y1="pointA.y" :x2="pointB.x" :y2="pointB.y" />
      <line class="distance-route" data-measurement-line :data-length-pixels="screenLength" :data-length-metres="distanceMetres" :x1="pointA.x" :y1="pointA.y" :x2="pointB.x" :y2="pointB.y" />
      <g v-for="tick in visibleTicks" :key="tick.id" class="distance-tick" :data-distance-metres="tick.id * rulerMetres">
        <line :x1="tick.x - unitVector.y * 7" :y1="tick.y + unitVector.x * 7" :x2="tick.x + unitVector.y * 7" :y2="tick.y - unitVector.x * 7" />
        <text :x="tick.x - unitVector.y * 24" :y="tick.y + unitVector.x * 24" text-anchor="middle" dominant-baseline="middle">{{ tick.text }}</text>
      </g>
      <g v-if="distanceMetres > 0 && !target.antipodal && Math.abs(origin.lat) < 89.999999" class="origin-north" :transform="`translate(${pointA.x},${pointA.y})`">
        <path d="M0 -22V-68M-4 -62L0 -70L4 -62" />
        <text x="0" y="-81" text-anchor="middle">北</text>
      </g>
      <g class="measurement-point point-a" :transform="`translate(${pointA.x},${pointA.y})`"><circle r="15"/><text x="0" y="0" dy=".35em" text-anchor="middle">A</text></g>
      <g v-if="props.points.length > 1" class="measurement-point point-b" :transform="`translate(${pointB.x},${pointB.y})`"><circle r="15"/><text x="0" y="0" dy=".35em" text-anchor="middle">B</text></g>
    </svg>
    <div class="equal-distance-scale" :aria-label="`比例尺 ${rulerLabel}，与 A B 连线使用同一距离单位`">
      <div class="scale-title">按 A、B 圆心量取</div>
      <svg :width="rulerPixels + 12" height="36" :viewBox="`0 0 ${rulerPixels + 12} 36`" aria-hidden="true">
        <text x="5" y="12">0</text><text :x="rulerPixels + 5" y="12" text-anchor="end">{{ rulerLabel }}</text>
        <path data-ruler-line :data-length-pixels="rulerPixels" :data-length-metres="rulerMetres" :d="`M5 22V30H${rulerPixels + 5}V22`" />
      </svg>
    </div>
    <div class="equal-distance-caption">
      <strong>等距量图</strong><span>从 A 点量取地表距离</span>
    </div>
    <div v-if="target.antipodal" class="equal-distance-notice" role="status">A、B 互为对跖点，最短路线方向不唯一；此处沿正北方向展开，距离仍准确。</div>
    <div v-else-if="textureState !== 'ready'" class="equal-distance-notice" role="status">{{ textureState === 'loading' ? '正在载入等距影像…' : rendererFailed ? '设备未能显示影像；等距连线和比例尺仍可量取。' : '影像暂不可用；等距连线和比例尺仍可量取。' }}</div>
  </div>
</template>

<style scoped>
.equal-distance-view { position: absolute; inset: 0; overflow: hidden; background: #061823; touch-action: none; cursor: grab; user-select: none; }
.equal-distance-view.dragging { cursor: grabbing; }
.equal-distance-view :deep(canvas) { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.equal-distance-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; }
.distance-rings circle { fill: none; stroke: #abfff1; stroke-opacity: .16; stroke-width: 1; }
.distance-route-shadow { stroke: #15262c; stroke-opacity: .75; stroke-width: 7; }
.distance-route { stroke: #ffdf88; stroke-width: 4; stroke-dasharray: 10 6; stroke-linecap: round; }
.distance-tick line { stroke: #fff2b1; stroke-width: 2; }
.distance-tick text { fill: #fff3ca; font-size: 12px; font-weight: 700; paint-order: stroke; stroke: #0a202e; stroke-width: 4px; stroke-linejoin: round; }
.measurement-point circle { stroke: #fff; stroke-width: 2.5; }
.point-a circle { fill: #078b97; }.point-b circle { fill: #b97725; }
.measurement-point text { fill: white; font-size: 16px; font-family: Arial, sans-serif; font-weight: 800; }
.origin-north path { fill: none; stroke: #f1faf6; stroke-width: 2; stroke-linecap: round; }
.origin-north text { fill: #fff; font-size: 13px; font-weight: 700; paint-order: stroke; stroke: #082533; stroke-width: 4px; }
.equal-distance-scale { position: absolute; left: 18px; bottom: 18px; padding: 9px 12px 7px; border: 1px solid #315260; border-radius: 10px; background: #081e2deb; color: #ecfbf6; pointer-events: none; }
.scale-title { font-size: 11px; color: #9ecdc9; margin-bottom: 3px; }
.equal-distance-scale svg { display: block; overflow: visible; }.equal-distance-scale text { fill: #effffb; font: 600 11px sans-serif; }
.equal-distance-scale path { fill: none; stroke: #eafff4; stroke-width: 2; }
.equal-distance-caption { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 10px 15px; border: 1px solid #2a5864; background: #081e2ddb; border-radius: 10px; color: #b6d1d6; font-size: 12px; white-space: nowrap; pointer-events: none; }
.equal-distance-caption strong { color: #78e2d8; font-size: 13px; font-weight: 600; }
.equal-distance-notice { position: absolute; top: 80px; left: 50%; transform: translateX(-50%); max-width: min(440px, calc(100% - 48px)); width: max-content; padding: 10px 14px; border-radius: 9px; color: #ffedbd; background: #22313ae8; border: 1px solid #807858; font-size: 12px; pointer-events: none; }
@media (max-width: 700px) {
  .equal-distance-caption { left: 14px; bottom: 94px; transform: none; gap: 7px; padding: 7px 10px; font-size: 10px; }
  .equal-distance-caption strong { font-size: 11px; }.equal-distance-scale { left: 14px; bottom: 14px; }
  .equal-distance-notice { top: 146px; font-size: 11px; }
  .distance-tick text { font-size: 10px; }
}
</style>
