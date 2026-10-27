<template>
  <div class="space-observer-window">
    <div class="space-observer-actions">
      <div class="space-view-tools" role="group" aria-label="太空视角操作">
        <button type="button" class="space-view-action correspondence-action"
          :aria-pressed="correspondenceActive" :disabled="!!errorMessage"
          @click="requestCorrespondence" title="让两边从同一方向观察小人脚下的地平面">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M12 5v14M6 12h3m6 0h3" />
          </svg>
          <span>{{ correspondenceActive ? '结束演示' : '视角对应' }}</span>
        </button>
        <button type="button" class="space-view-action" @click="findObserver" title="转到当前观测点所在的一侧">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          <span>找到小人</span>
        </button>
        <button type="button" class="space-view-action reset-action" @click="resetView" title="恢复太空窗口的初始观察方向">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 10a8 8 0 1 1 1.8 7M4 4v6h6" />
          </svg>
          <span>重置</span>
        </button>
      </div>
    </div>
    <div ref="host" class="space-observer-canvas" role="img"
      :aria-label="`地球自转示意，观测点${latitudeText}，${visibilityText}。拖动旋转，滚轮缩放。`">
      <p v-if="errorMessage" class="space-observer-error" role="status">{{ errorMessage }}</p>
      <div v-else ref="legendElement" class="space-legend" aria-label="晨昏线与观测辅助线图例">
        <span :style="{ '--key-color': DAWN_COLOR }"><i></i>晨线 · 日出</span>
        <span :style="{ '--key-color': DUSK_COLOR }"><i></i>昏线 · 日落</span>
        <span class="normal-key"><i></i>地表法线</span>
        <span class="sight-key"><i></i>观测延长线</span>
        <span class="altitude-key"><b>h</b>太阳高度角</span>
        <span class="inclination-key"><b>β</b>轨迹倾角</span>
        <span class="reference-plane-key"><i></i>轨迹参考面 <em>∥ 赤道面</em></span>
      </div>
      <span v-if="textureState !== 'ready' && !errorMessage" class="space-texture-status" role="status">
        {{ textureState === 'loading' ? '正在加载地球表面…' : '地球贴图暂不可用，显示备用材质' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { getObserverFrame } from './observer-frame'
import { getObserverGuideGeometry, getTrackInclinationGuide } from './observer-guides'
import { createObserverFigure, faceObserverTowardSun } from './observer-figure'
import { calculateSunPosition, OBLIQUITY } from './solar-model'
import { formatLatitudeDMS, formatAngleDMS } from './latitude-format'
import { getDirectionLabel, type CardinalDirection } from './observer-directions'
import { createEarthMotionSurfaceMaterial, createEarthAtmosphereMaterial, EARTH_TEXTURE_PATH, EARTH_REMOTE_TEXTURE_PATH, EARTH_DAY_TEXTURE, EARTH_NIGHT_TEXTURE, type EarthUniforms } from './space-earth-material'
import { GALAXY_BACKGROUND_COLOR, loadEarthMotionGalaxySky } from './space-galaxy-sky'
import { mapViewToObserver } from './view-correspondence'
import { createScreenGuideLine, writeScreenGuidePoints } from './screen-guide-line'

const props = withDefaults(defineProps<{
  latitude: number
  declination: number
  hourAngle: number
  active?: boolean
  correspondenceHighlight?: 'ground' | 'altitude' | null
}>(), { active: true })
const emit = defineEmits<{
  'request-correspondence': []
  'correspondence-ready': []
  'correspondence-end': []
}>()
const correspondenceActive = ref(false)

const host = ref<HTMLElement | null>(null)
const legendElement = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const textureState = ref<'loading' | 'ready' | 'fallback'>('loading')
const latitudeText = computed(() => formatLatitudeDMS(props.latitude))
const altitude = computed(() => calculateSunPosition(props.latitude, props.declination, props.hourAngle, 1).alt)
const visibilityText = computed(() => Math.abs(altitude.value) < 0.005
  ? '太阳中心位于当地地平线'
  : altitude.value > 0 ? '太阳在当地地平面上方' : '太阳在当地地平面下方')

const EARTH_RADIUS = 1.15
const SUNLIGHT_ORIGIN_X = EARTH_RADIUS + 0.85
const SUBSOLAR_RAY_LENGTH = 1.2
// 两条边界光线与晨昏圈相切；中心直射点光线单独强调。
const sunlightRayTargets = [
  new THREE.Vector3(0, -EARTH_RADIUS, 0),
  new THREE.Vector3(0, EARTH_RADIUS, 0),
]
// 与 earth-motion 深色太空视图的图例一致。
const DAWN_COLOR = '#70ceeb'
const DUSK_COLOR = '#dc789a'
let scene: THREE.Scene | undefined
let renderer: THREE.WebGLRenderer | undefined
let disposeGalaxySky: (() => void) | undefined
let camera: THREE.PerspectiveCamera | undefined
let controls: OrbitControls | undefined
let earth: THREE.Group | undefined
let equatorialFrame: THREE.Group | undefined
let earthUniforms: EarthUniforms | undefined
let observer: THREE.Group | undefined
let observerFigure: THREE.Group | undefined
let observerGround: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | undefined
let observerGroundRim: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | undefined
let parallelLight: THREE.DirectionalLight | undefined
let sunlightArrows: THREE.Group | undefined
let subsolarMarker: THREE.Mesh | undefined
let subsolarLabel: THREE.Sprite | undefined
let selectedParallel: THREE.LineLoop | undefined
let observerGuides: THREE.Group | undefined
let normalArrow: THREE.ArrowHelper | undefined
let sightArrow: THREE.ArrowHelper | undefined
let sightShaft: Line2 | undefined
let belowSight: Line2 | undefined
let horizonProjection: Line2 | undefined
let altitudeArc: Line2 | undefined
let belowAltitudeArc: Line2 | undefined
let altitudeLabel: THREE.Sprite | undefined
let trackDirectionArrow: THREE.ArrowHelper | undefined
let trackBaseline: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial> | undefined
let trackInclinationArc: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | undefined
let trackPlane: THREE.Mesh | undefined
let trackInclinationLabel: THREE.Sprite | undefined
let lastAltitudeLabel = ''
let lastInclinationLabel = ''
const altitudeLabelAnchor = new THREE.Vector3()
const inclinationLabelAnchor = new THREE.Vector3()
const NORMAL_LENGTH = 0.72
const SIGHT_LENGTH = 0.82
const ANGLE_RADIUS = 0.38
const guideUp = new THREE.Vector3()
const guideSun = new THREE.Vector3()
const guideHorizontal = new THREE.Vector3()
let resizeObserver: ResizeObserver | undefined
let animationFrame = 0
let disposed = false
let sizeReady = false
let lastWidth = 0
let lastHeight = 0
let legendBounds: { left: number; right: number; top: number; bottom: number } | undefined
let lastFitDistance = 0
const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -OBLIQUITY * Math.PI / 180)
const inverseTilt = tilt.clone().invert()
const earthTextures = new Set<THREE.Texture>()
const textureTimers = new Set<number>()
const latitudeLabels: { latitude: number; sprite: THREE.Sprite }[] = []
const sceneLabels: { sprite: THREE.Sprite; width: number; maxPixels: number; minPixels?: number }[] = []
type CameraPose = {
  position: THREE.Vector3
  up: THREE.Vector3
  quaternion: THREE.Quaternion
  target: THREE.Vector3
}
type CorrespondenceView = {
  direction: THREE.Vector3
  up: THREE.Vector3
  target: THREE.Vector3
}
let correspondenceView: CorrespondenceView | undefined
let savedCorrespondenceView: (CameraPose & {
  enabled: boolean
  enableDamping: boolean
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
  minAzimuthAngle: number
  maxAzimuthAngle: number
  fitDistance: number
  width: number
  height: number
}) | undefined
type CameraTransition = {
  startedAt: number
  duration: number
  from: CameraPose
  to: CameraPose
  radialRotation: THREE.Quaternion
  upRotation: THREE.Quaternion
}
let correspondenceTransition: CameraTransition | undefined
let cameraFlight: (CameraTransition & {
  kind: 'reset' | 'observer'
  direction: THREE.Vector3
  fitDistance: number
  enabled: boolean
  enableDamping: boolean
  minDistance: number
  maxDistance: number
  lastEasedProgress: number
}) | undefined
let correspondencePointer: PointerEvent | undefined

function createSpaceControls() {
  if (!camera || !renderer) return
  const next = new OrbitControls(camera, renderer.domElement)
  next.enableDamping = true
  next.dampingFactor = 0.1
  next.enablePan = false
  next.minDistance = 3.6
  next.maxDistance = 40
  next.rotateSpeed = 0.65
  return next
}

function clearOrbitInertia() {
  if (!camera || !controls || !renderer) return
  const pose = captureCameraPose()!
  const previous = controls
  previous.dispose()
  controls = createSpaceControls()
  if (!controls) return
  camera.position.copy(pose.position)
  camera.up.copy(pose.up)
  camera.quaternion.copy(pose.quaternion)
  controls.target.copy(pose.target)
  controls.minDistance = previous.minDistance
  controls.maxDistance = previous.maxDistance
  controls.minPolarAngle = previous.minPolarAngle
  controls.maxPolarAngle = previous.maxPolarAngle
  controls.minAzimuthAngle = previous.minAzimuthAngle
  controls.maxAzimuthAngle = previous.maxAzimuthAngle
  controls.enabled = previous.enabled
  controls.enableDamping = previous.enableDamping
  // The fresh controller has no queued rotation. Do not flush the old damping
  // tail: that would jump away from the last displayed pose before the flight.
}

function drawDirectionLabel(context: CanvasRenderingContext2D, text: string) {
  context.clearRect(0, 0, 256, 112)
  context.beginPath()
  context.roundRect(80, 8, 96, 96, 20)
  context.fillStyle = 'rgba(5, 23, 34, 0.94)'
  context.fill()
  context.strokeStyle = '#93d9cf'
  context.lineWidth = 3
  context.stroke()
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 60px "Microsoft YaHei", sans-serif'
  context.fillStyle = '#edfff9'
  context.fillText(text, 128, 57)
}

function label(text: string, color: string, width = 0.32, isDirection = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 112
  const context = canvas.getContext('2d')!
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 56px "Microsoft YaHei", sans-serif'
  context.strokeStyle = '#081c2b'
  context.lineWidth = 10
  context.strokeText(text, 128, 56)
  context.fillStyle = color
  context.fillText(text, 128, 56)
  if (isDirection) drawDirectionLabel(context, text)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.scale.set(width, width * 112 / 256, 1)
  if (isDirection) {
    sprite.material.depthTest = false
    sprite.material.toneMapped = false
    sprite.renderOrder = 14
  }
  sceneLabels.push({ sprite, width, maxPixels: isDirection ? 88 : Math.max(64, width * 110), minPixels: isDirection ? 80 : 0 })
  return sprite
}

function updateTextLabel(sprite: THREE.Sprite, text: string, color: string) {
  const texture = sprite.material.map as THREE.CanvasTexture
  const canvas = texture.image as HTMLCanvasElement
  const context = canvas.getContext('2d')!
  if (sprite.userData.cardinalDirection) {
    drawDirectionLabel(context, text)
    texture.needsUpdate = true
    return
  }
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 56px "Microsoft YaHei", sans-serif'
  const size = Math.min(56, Math.floor(56 * 232 / Math.max(context.measureText(text).width, 1)))
  context.font = `700 ${size}px "Microsoft YaHei", sans-serif`
  context.lineWidth = 8
  context.strokeStyle = '#081c2b'
  context.strokeText(text, 128, 56)
  context.fillStyle = color
  context.fillText(text, 128, 56)
  texture.needsUpdate = true
}

function dynamicGeometry(pointCount: number, dashed = false) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pointCount * 3), 3).setUsage(THREE.DynamicDrawUsage))
  if (dashed) geometry.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(pointCount), 1).setUsage(THREE.DynamicDrawUsage))
  return geometry
}

function writeGuidePoints(geometry: THREE.BufferGeometry, points: readonly { x: number; y: number; z: number }[], scale: number) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const distances = geometry.getAttribute('lineDistance') as THREE.BufferAttribute | undefined
  let distance = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!
    positions.setXYZ(index, point.x * scale, point.y * scale, point.z * scale)
    if (index > 0) {
      const previous = points[index - 1]!
      distance += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z) * scale
    }
    distances?.setX(index, distance)
  }
  positions.needsUpdate = true
  if (distances) distances.needsUpdate = true
  geometry.setDrawRange(0, points.length)
  geometry.computeBoundingSphere()
}

function createObserverGuides() {
  observerGuides = new THREE.Group()
  normalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), NORMAL_LENGTH, '#5af2e6', 0.12, 0.065)
  sightArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), SIGHT_LENGTH, '#ffe378', 0.12, 0.065)
  sightArrow.line.visible = false
  sightShaft = createScreenGuideLine(2, { color: '#ffe378', linewidth: 1.8 })
  belowSight = createScreenGuideLine(2, { color: '#ffe378', linewidth: 1.8, dashed: true, dashSize: 0.055, gapSize: 0.035, depthTest: false, transparent: true, opacity: 0.9 })
  horizonProjection = createScreenGuideLine(2, { color: '#b8d9ef', linewidth: 1.5, dashed: true, dashSize: 0.05, gapSize: 0.032, transparent: true, opacity: 0.95 })
  altitudeArc = createScreenGuideLine(65, { color: '#ff9b2f', linewidth: 2 })
  belowAltitudeArc = createScreenGuideLine(65, { color: '#ff9b2f', linewidth: 2, dashed: true, dashSize: 0.025, gapSize: 0.016, depthTest: false })
  altitudeLabel = label('h = 0°00′', '#ffbd80', 0.72)
  trackDirectionArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.78, '#87bfff', 0.10, 0.05)
  trackBaseline = new THREE.Line(dynamicGeometry(2, true), new THREE.LineDashedMaterial({ color: '#87bfff', dashSize: 0.045, gapSize: 0.025 }))
  trackInclinationArc = new THREE.Line(dynamicGeometry(65), new THREE.LineBasicMaterial({ color: '#87bfff' }))
  // 参考面平移到小人脚下，保持与赤道面平行；用于比较两面的倾角。
  trackPlane = new THREE.Mesh(new THREE.CircleGeometry(0.60, 64), new THREE.MeshBasicMaterial({ color: '#bd94f4', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }))
  trackPlane.rotation.x = -Math.PI / 2
  trackInclinationLabel = label('β = 0°00′', '#acd1ff', 0.78)
  for (const text of [altitudeLabel, trackInclinationLabel]) {
    text.material.depthTest = false
    text.renderOrder = 5
  }
  observerGuides.add(normalArrow, sightArrow, sightShaft, belowSight, horizonProjection, altitudeArc, belowAltitudeArc, altitudeLabel)
  observerGuides.add(trackPlane, trackDirectionArrow, trackBaseline, trackInclinationArc, trackInclinationLabel)
  equatorialFrame?.add(observerGuides)
}

function updateObserverGuides() {
  if (!observerGuides || !normalArrow || !sightArrow || !sightShaft || !belowSight || !horizonProjection || !altitudeArc || !belowAltitudeArc || !altitudeLabel) return
  const geometry = getObserverGuideGeometry(props.latitude, props.declination, props.hourAngle)
  guideUp.set(geometry.up.x, geometry.up.y, geometry.up.z)
  guideSun.set(geometry.sunDirection.x, geometry.sunDirection.y, geometry.sunDirection.z)
  guideHorizontal.set(geometry.horizontalDirection.x, geometry.horizontalDirection.y, geometry.horizontalDirection.z)
  observerGuides.position.copy(guideUp).multiplyScalar(EARTH_RADIUS + 0.022)
  normalArrow.setDirection(guideUp)
  sightArrow.setDirection(guideSun)
  const below = geometry.altitude < -0.005
  sightArrow.visible = !below
  sightShaft.visible = !below
  belowSight.visible = below
  writeScreenGuidePoints(sightShaft, [{ x: 0, y: 0, z: 0 }, geometry.sunDirection], SIGHT_LENGTH - 0.12)
  writeScreenGuidePoints(belowSight, [{ x: 0, y: 0, z: 0 }, geometry.sunDirection], SIGHT_LENGTH)
  writeScreenGuidePoints(horizonProjection, [{ x: 0, y: 0, z: 0 }, geometry.horizontalDirection], 0.65)
  writeScreenGuidePoints(altitudeArc, geometry.angleDirections, ANGLE_RADIUS)
  writeScreenGuidePoints(belowAltitudeArc, geometry.angleDirections, ANGLE_RADIUS)
  altitudeArc.visible = !below && Math.abs(geometry.altitude) > 0.005
  belowAltitudeArc.visible = below
  const middle = geometry.angleDirections[Math.floor(geometry.angleDirections.length / 2)]!
  altitudeLabelAnchor.set(middle.x, middle.y, middle.z).multiplyScalar(0.59)
  altitudeLabel.position.copy(altitudeLabelAnchor)
  const text = `h = ${formatAngleDMS(geometry.altitude)}`
  if (lastAltitudeLabel !== text) {
    lastAltitudeLabel = text
    updateTextLabel(altitudeLabel, text, '#ffbd80')
  }
  updateTrackInclinationGuide()
}

function updateTrackInclinationGuide() {
  if (!trackDirectionArrow || !trackBaseline || !trackInclinationArc || !trackPlane || !trackInclinationLabel) return
  const guide = getTrackInclinationGuide(props.latitude, props.hourAngle)
  const direction = new THREE.Vector3(guide.trackDirection.x, guide.trackDirection.y, guide.trackDirection.z)
  trackDirectionArrow.setDirection(direction)
  writeGuidePoints(trackBaseline.geometry, [{ x: 0, y: 0, z: 0 }, guide.horizontalDirection], 0.70)
  writeGuidePoints(trackInclinationArc.geometry, guide.angleDirections, 0.50)
  trackInclinationArc.visible = guide.inclination > 0.005
  // 极点处两面重合，以地平面本身表示，避免共面闪烁。
  trackPlane.visible = guide.inclination > 0.005
  const middle = guide.angleDirections[Math.floor(guide.angleDirections.length / 2)]!
  inclinationLabelAnchor.set(middle.x, middle.y, middle.z).multiplyScalar(0.65)
  trackInclinationLabel.position.copy(inclinationLabelAnchor)
  const text = `β = ${formatAngleDMS(guide.inclination)}`
  if (lastInclinationLabel !== text) {
    lastInclinationLabel = text
    updateTextLabel(trackInclinationLabel, text, '#acd1ff')
  }
}

function circleAtLatitude(latitude: number, radius: number, material: THREE.LineBasicMaterial) {
  const phi = latitude * Math.PI / 180
  const points: THREE.Vector3[] = []
  for (let index = 0; index < 128; index++) {
    const angle = index / 128 * Math.PI * 2
    points.push(new THREE.Vector3(radius * Math.cos(phi) * Math.cos(angle), radius * Math.sin(phi), -radius * Math.cos(phi) * Math.sin(angle)))
  }
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material)
}

function solidTexture(color: THREE.ColorRepresentation) {
  const rgb = new THREE.Color(color)
  const texture = new THREE.DataTexture(new Uint8Array([Math.round(rgb.r * 255), Math.round(rgb.g * 255), Math.round(rgb.b * 255), 255]), 1, 1)
  texture.needsUpdate = true
  earthTextures.add(texture)
  return texture
}

function loadEarthTexture(name: string, receive: (texture: THREE.Texture) => void, isDay = false) {
  const loader = new THREE.TextureLoader()
  const attempt = (base: string, retry: boolean) => {
    if (disposed) return
    let finished = false
    let pending: THREE.Texture | undefined
    const fail = () => {
      if (finished || disposed) return
      finished = true
      window.clearTimeout(timeout)
      textureTimers.delete(timeout)
      pending?.dispose()
      if (retry) attempt(EARTH_REMOTE_TEXTURE_PATH, false)
      else if (isDay) textureState.value = 'fallback'
    }
    const timeout = window.setTimeout(fail, 10000)
    textureTimers.add(timeout)
    pending = loader.load(base + name, texture => {
      if (finished || disposed) { texture.dispose(); return }
      finished = true
      window.clearTimeout(timeout)
      textureTimers.delete(timeout)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, renderer?.capabilities.getMaxAnisotropy() ?? 1)
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = true
      texture.needsUpdate = true
      earthTextures.add(texture)
      receive(texture)
      if (isDay) textureState.value = 'ready'
    }, undefined, fail)
  }
  attempt(EARTH_TEXTURE_PATH, true)
}

function createEarth() {
  const group = new THREE.Group()
  earthUniforms = {
    uMap: { value: solidTexture('#247ca0') },
    uNightMap: { value: solidTexture('#000000') },
    uLightDirection: { value: new THREE.Vector3(1, 0, 0) },
    uOpacity: { value: 1 },
    uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
    uAtmosphereTwilightColor: { value: new THREE.Color('#bc490b') },
  }
  const earthAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(tilt)
  group.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 96, 96), createEarthMotionSurfaceMaterial(earthUniforms, earthAxis)))
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.055, 96, 96), createEarthAtmosphereMaterial(earthUniforms))
  atmosphere.renderOrder = 2
  group.add(atmosphere)
  const gridMaterial = new THREE.LineBasicMaterial({ color: '#b4dcf4', transparent: true, opacity: 0.22 })
  for (const latitude of [-75, -60, -45, -30, -15, 15, 30, 45, 60, 75]) {
    group.add(circleAtLatitude(latitude, EARTH_RADIUS * 1.006, gridMaterial))
  }
  for (let longitude = 0; longitude < 180; longitude += 30) {
    const points: THREE.Vector3[] = []
    const angle = longitude * Math.PI / 180
    for (let index = 0; index < 128; index++) {
      const phi = index / 128 * Math.PI * 2
      points.push(new THREE.Vector3((EARTH_RADIUS + 0.009) * Math.cos(phi) * Math.cos(angle), (EARTH_RADIUS + 0.009) * Math.sin(phi), -(EARTH_RADIUS + 0.009) * Math.cos(phi) * Math.sin(angle)))
    }
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), gridMaterial))
  }
  // Wrap the same highlighted parallels used by earth-motion around the actual globe.
  for (const latitude of [-(90 - OBLIQUITY), -OBLIQUITY, 0, OBLIQUITY, 90 - OBLIQUITY]) {
    const color = latitude === 0 ? '#ff4058' : Math.abs(latitude) < 30 ? '#ffd447' : '#66d9ff'
    const line = circleAtLatitude(latitude, EARTH_RADIUS * 1.014, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.96 }))
    if (latitude !== 0) {
      line.material.dispose()
      line.material = new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0.96, dashSize: 0.055, gapSize: 0.028 })
      line.computeLineDistances()
    }
    group.add(line)
    const text = label(formatLatitudeDMS(latitude), color, 0.52)
    text.material.depthTest = false
    text.center.set(0, 0.5)
    latitudeLabels.push({ latitude, sprite: text })
  }
  loadEarthTexture(EARTH_DAY_TEXTURE, texture => { if (earthUniforms) earthUniforms.uMap.value = texture }, true)
  loadEarthTexture(EARTH_NIGHT_TEXTURE, texture => { if (earthUniforms) earthUniforms.uNightMap.value = texture })
  return group
}

function createLocalObserver() {
  const group = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.CircleGeometry(0.56, 64), new THREE.MeshBasicMaterial({
    color: '#5ce3cd', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false,
  }))
  ground.rotation.x = -Math.PI / 2
  observerGround = ground
  group.add(ground)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.011, 6, 64), new THREE.MeshBasicMaterial({ color: '#7affde' }))
  rim.rotation.x = Math.PI / 2
  observerGroundRim = rim
  group.add(rim)
  const crossMaterial = new THREE.LineBasicMaterial({ color: '#6ff5da', transparent: true, opacity: 0.7 })
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.56, 0.006, 0), new THREE.Vector3(0.56, 0.006, 0),
    new THREE.Vector3(0, 0.006, -0.56), new THREE.Vector3(0, 0.006, 0.56),
  ]), crossMaterial))
  const directions = [{ id: 'east', x: 0.7, z: 0 }, { id: 'south', x: 0, z: 0.7 }, { id: 'west', x: -0.7, z: 0 }, { id: 'north', x: 0, z: -0.7 }] as const
  for (const direction of directions) {
    const directionText = getDirectionLabel(props.latitude, direction.id)
    const text = label(directionText, '#edfff9', 0.64, true)
    text.userData.cardinalDirection = direction.id
    text.userData.directionText = directionText
    text.position.set(direction.x, 0.025, direction.z)
    group.add(text)
  }
  observerFigure = createObserverFigure(0.36)
  group.add(observerFigure)
  return group
}

function createSunlightArrows() {
  const group = new THREE.Group()
  for (const target of sunlightRayTargets) {
    const origin = new THREE.Vector3(SUNLIGHT_ORIGIN_X, target.y, 0)
    group.add(new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), origin, SUNLIGHT_ORIGIN_X - target.x, '#ffd578', 0.17, 0.07))
  }
  // 与 earth-motion 一样，以金色中心箭头和地表圆点强调直射点。
  // 本页太阳在远处，箭头仅绘制靠近地球的一段，尖端准确落在球面。
  const directRay = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(EARTH_RADIUS + SUBSOLAR_RAY_LENGTH, 0, 0), SUBSOLAR_RAY_LENGTH, 0xffd166, 0.25, 0.11)
  directRay.name = 'subsolar-ray'
  group.add(directRay)
  subsolarMarker = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 0.04, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 }))
  subsolarMarker.name = 'subsolar-point'
  subsolarMarker.position.set(EARTH_RADIUS, 0, 0)
  group.add(subsolarMarker)
  subsolarLabel = label('直射点', '#ffd166', 0.55)
  subsolarLabel.position.set(EARTH_RADIUS + 0.16, -0.12, 0.10)
  subsolarLabel.material.depthTest = false
  group.add(subsolarLabel)
  return group
}

function setup() {
  if (!host.value || disposed) return
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(GALAXY_BACKGROUND_COLOR, 1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    const canvas = renderer.domElement
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', '太空视角。拖动旋转，滚轮缩放。Home 键找到小人，R 键重置。')
    canvas.addEventListener('keydown', handleKeydown)
    canvas.addEventListener('pointerdown', handleCorrespondencePointerDown, true)
    canvas.addEventListener('wheel', handleCorrespondenceWheel, { capture: true, passive: true })
    document.addEventListener('pointermove', handleCorrespondencePointerMove, true)
    document.addEventListener('pointerup', clearCorrespondencePointer, true)
    document.addEventListener('pointercancel', clearCorrespondencePointer, true)
    host.value.appendChild(canvas)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200)
    controls = createSpaceControls()
    scene.add(new THREE.AmbientLight('#b9dce9', 0.35))
    parallelLight = new THREE.DirectionalLight('#fff3ce', 3.2)
    scene.add(parallelLight, parallelLight.target)
    disposeGalaxySky = loadEarthMotionGalaxySky(scene, renderer.capabilities.getMaxAnisotropy(), drawScene)
    // Tilt the whole equatorial reference frame, including the observer and
    // incoming light, so the local φ/δ/H geometry is unchanged.
    equatorialFrame = new THREE.Group()
    equatorialFrame.quaternion.copy(tilt)
    scene.add(equatorialFrame)
    earth = createEarth()
    equatorialFrame.add(earth)
    for (const item of latitudeLabels) equatorialFrame.add(item.sprite)
    observer = createLocalObserver()
    equatorialFrame.add(observer)
    createObserverGuides()
    const axis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1.43, 0), 3.02, '#ceeef9', 0.13, 0.065)
    equatorialFrame.add(axis)
    const north = label('北极', '#d8f6ff', 0.48)
    north.position.set(0, 1.76, 0)
    const south = label('南极', '#d8f6ff', 0.48)
    south.position.set(0, -1.58, 0)
    equatorialFrame.add(north, south)
    // Positive rotation about +Y carries the reference meridian west → east.
    const spinPoints: THREE.Vector3[] = []
    for (let index = 0; index <= 50; index++) {
      const angle = -2.3 + 1.65 * index / 50
      spinPoints.push(new THREE.Vector3(1.37 * Math.cos(angle), 0, -1.37 * Math.sin(angle)))
    }
    equatorialFrame.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(spinPoints), new THREE.LineBasicMaterial({ color: '#b1e3ff' })))
    const spinEnd = spinPoints[spinPoints.length - 1]!
    equatorialFrame.add(new THREE.ArrowHelper(new THREE.Vector3(-Math.sin(-0.65), 0, -Math.cos(-0.65)), spinEnd, 0.22, '#b1e3ff', 0.17, 0.095))
    sunlightArrows = createSunlightArrows()
    equatorialFrame.add(sunlightArrows)
    updateLatitudeCircle()
    updateGeometry()
    startCameraFlight('reset', true)
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    if (legendElement.value) resizeObserver.observe(legendElement.value)
    document.addEventListener('visibilitychange', syncRendering)
    resize()
    syncRendering()
  } catch {
    errorMessage.value = '太空视角暂时无法启动；可继续使用主场景。请检查浏览器 WebGL 支持。'
    stopRendering()
  }
}

function updateLatitudeCircle() {
  if (!earth) return
  if (selectedParallel) {
    earth.remove(selectedParallel)
    selectedParallel.geometry.dispose()
    ;(selectedParallel.material as THREE.Material).dispose()
  }
  selectedParallel = circleAtLatitude(props.latitude, EARTH_RADIUS + 0.014, new THREE.LineBasicMaterial({ color: '#7affde', transparent: true, opacity: 0.85 }))
  earth.add(selectedParallel)
}

function updateGeometry() {
  if (!earth || !observer || !parallelLight || !sunlightArrows) return
  const frame = getObserverFrame(props.latitude, props.declination, props.hourAngle)
  const up = new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z)
  const east = new THREE.Vector3(frame.east.x, frame.east.y, frame.east.z)
  const south = new THREE.Vector3(frame.south.x, frame.south.y, frame.south.z)
  const sunlight = new THREE.Vector3(frame.sunDirection.x, frame.sunDirection.y, frame.sunDirection.z)
  earth.rotation.y = props.hourAngle * Math.PI / 180
  observer.position.copy(up).multiplyScalar(EARTH_RADIUS + 0.022)
  observer.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, up, south))
  for (const child of observer.children) {
    if (!(child instanceof THREE.Sprite) || !child.userData.cardinalDirection) continue
    const text = getDirectionLabel(props.latitude, child.userData.cardinalDirection as CardinalDirection)
    if (child.userData.directionText === text) continue
    updateTextLabel(child, text, '#baffed')
    child.userData.directionText = text
  }
  if (observerFigure) faceObserverTowardSun(observerFigure, calculateSunPosition(props.latitude, props.declination, props.hourAngle, 1))
  parallelLight.position.copy(sunlight).multiplyScalar(10)
  parallelLight.position.applyQuaternion(tilt)
  earthUniforms?.uLightDirection.value.copy(sunlight).applyQuaternion(tilt)
  sunlightArrows.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), sunlight)
  updateObserverGuides()
}

function updateLegendBounds() {
  const legend = legendElement.value
  const container = host.value
  if (!legend || !container) { legendBounds = undefined; return }
  const bounds = legend.getBoundingClientRect()
  const origin = container.getBoundingClientRect()
  legendBounds = {
    left: bounds.left - origin.left, right: bounds.right - origin.left,
    top: bounds.top - origin.top, bottom: bounds.bottom - origin.top,
  }
}

function resize() {
  updateLegendBounds()
  if (!host.value || !renderer || !camera) return
  const width = Math.round(host.value.clientWidth)
  const height = Math.round(host.value.clientHeight)
  sizeReady = width > 0 && height > 0
  if (sizeReady && (width !== lastWidth || height !== lastHeight)) {
    lastWidth = width
    lastHeight = height
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    const nextFitDistance = fitDistance()
    // Resize preserves the orbit direction and relative user zoom. Only the
    // framing scale follows the available horizontal/vertical field of view.
    if (correspondenceActive.value) {
      resizeCorrespondence()
    } else if (cameraFlight) {
      resizeCameraFlight()
    } else if (controls) {
      const offset = camera.position.clone().sub(controls.target)
      const zoomRatio = lastFitDistance > 0 ? offset.length() / lastFitDistance : 1
      camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(nextFitDistance * zoomRatio))
      const framingScale = lastFitDistance > 0 ? nextFitDistance / lastFitDistance : 1
      controls.minDistance = lastFitDistance > 0 ? controls.minDistance * framingScale : nextFitDistance * 0.45
      controls.maxDistance = lastFitDistance > 0 ? controls.maxDistance * framingScale : nextFitDistance * 3
      controls.update()
    }
    lastFitDistance = nextFitDistance
    // setSize 会清空绘图缓冲；ResizeObserver 可能晚于本帧的 RAF 执行。
    // 在浏览器合成画面前立即补绘，不能只等下一帧，否则连续拖动会闪出空白帧。
    drawScene()
  }
  syncRendering()
}

function fitDistance(viewDirection?: THREE.Vector3, viewTarget?: THREE.Vector3, viewUp?: THREE.Vector3) {
  if (!camera) return 7
  const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) / 2
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect)
  const target = viewTarget ?? controls?.target ?? new THREE.Vector3()
  const backwards = viewDirection?.clone().normalize() ?? camera.position.clone().sub(target).normalize()
  const right = new THREE.Vector3().crossVectors(viewUp ?? camera.up, backwards).normalize()
  const up = new THREE.Vector3().crossVectors(backwards, right).normalize()
  const center = target.clone().negate()
  // Fit the main teaching model as a compact sphere. Fit the light arrows
  // separately in projected X/Y, so wide layouts can use their spare width
  // instead of shrinking the globe to the arrows' enclosing sphere.
  let distance = 2.12 / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov))
    + center.dot(backwards)
    + Math.max(Math.abs(center.dot(right)) / Math.tan(horizontalHalfFov), Math.abs(center.dot(up)) / Math.tan(verticalHalfFov))
  const delta = props.declination * Math.PI / 180
  const lightRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(Math.cos(delta), Math.sin(delta), 0))
  for (const tip of sunlightRayTargets) {
    for (const localPoint of [tip, new THREE.Vector3(SUNLIGHT_ORIGIN_X, tip.y, 0)]) {
      const point = localPoint.clone().applyQuaternion(lightRotation).applyQuaternion(tilt).sub(target)
      distance = Math.max(distance,
        point.dot(backwards) + (Math.abs(point.dot(right)) + 0.1) / Math.tan(horizontalHalfFov),
        point.dot(backwards) + (Math.abs(point.dot(up)) + 0.1) / Math.tan(verticalHalfFov))
    }
  }
  const directRayStart = new THREE.Vector3(EARTH_RADIUS + SUBSOLAR_RAY_LENGTH, 0, 0).applyQuaternion(lightRotation).applyQuaternion(tilt).sub(target)
  distance = Math.max(distance,
    directRayStart.dot(backwards) + (Math.abs(directRayStart.dot(right)) + 0.1) / Math.tan(horizontalHalfFov),
    directRayStart.dot(backwards) + (Math.abs(directRayStart.dot(up)) + 0.1) / Math.tan(verticalHalfFov))
  return distance
}

function correspondencePose(): CameraPose | undefined {
  if (!camera || !correspondenceView) return
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect)
  // Focus on the 0.56-radius horizon disc and 0.72-high guides at the station,
  // rather than fitting the whole globe and making the observer tiny again.
  const distance = Math.max(1.75, 0.82 / Math.sin(Math.min(vertical, horizontal)))
  const target = correspondenceView.target.clone()
  const position = target.clone().addScaledVector(correspondenceView.direction, distance)
  const up = correspondenceView.up.clone()
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position, target, up))
  return { position, target, up, quaternion }
}

function beginCorrespondence(localCameraOffset: { x: number; y: number; z: number }, localCameraUp: { x: number; y: number; z: number }): boolean {
  if (disposed || !props.active || !sizeReady || !camera || !controls || correspondenceActive.value) return false
  let mapped: ReturnType<typeof mapViewToObserver>
  try {
    mapped = mapViewToObserver(getObserverFrame(props.latitude, props.declination, props.hourAngle),
      tilt, localCameraOffset, localCameraUp, EARTH_RADIUS + 0.022)
  } catch { return false }
  correspondenceView = { direction: mapped.offset.clone().normalize(), up: mapped.up, target: mapped.target }
  const to = correspondencePose()
  if (!to) { correspondenceView = undefined; return false }
  cancelCameraFlight()
  // Capture the displayed pose after discarding old orbit inertia, without
  // applying the queued tail or allowing controls to undo the mapped roll.
  clearOrbitInertia()
  if (!controls) return false
  const enableDamping = controls.enableDamping
  controls.enableDamping = false
  const from: CameraPose = {
    position: camera.position.clone(), up: camera.up.clone(), quaternion: camera.quaternion.clone(), target: controls.target.clone(),
  }
  savedCorrespondenceView = {
    ...from, enableDamping, enabled: controls.enabled,
    minDistance: controls.minDistance, maxDistance: controls.maxDistance,
    minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle,
    minAzimuthAngle: controls.minAzimuthAngle, maxAzimuthAngle: controls.maxAzimuthAngle,
    fitDistance: lastFitDistance, width: lastWidth, height: lastHeight,
  }
  controls.enabled = false
  correspondenceActive.value = true
  correspondenceTransition = {
    startedAt: performance.now(),
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1600,
    from, to,
    radialRotation: new THREE.Quaternion().setFromUnitVectors(from.position.clone().normalize(), to.position.clone().normalize()),
    upRotation: new THREE.Quaternion().setFromUnitVectors(from.up.clone().normalize(), to.up.clone().normalize()),
  }
  updateCorrespondenceHighlight()
  syncRendering()
  return true
}

function resizeCorrespondence() {
  if (!camera || !controls) return
  const to = correspondencePose()
  if (!to) return
  if (correspondenceTransition) {
    correspondenceTransition.to = to
    correspondenceTransition.radialRotation.setFromUnitVectors(
      correspondenceTransition.from.position.clone().normalize(), to.position.clone().normalize())
  } else {
    camera.position.copy(to.position)
    camera.quaternion.copy(to.quaternion)
    camera.up.copy(to.up)
    controls.target.copy(to.target)
  }
}

function updateCorrespondence(): boolean {
  if (!correspondenceActive.value || !camera || !controls) return false
  const transition = correspondenceTransition
  if (!transition) return true
  if (applyCameraTransition(transition)) {
    correspondenceTransition = undefined
    emit('correspondence-ready')
  }
  return true
}

function applyCameraTransition(transition: CameraTransition, easedStep?: number): boolean {
  if (!camera || !controls) return false
  const progress = transition.duration === 0 ? 1
    : THREE.MathUtils.clamp((performance.now() - transition.startedAt) / transition.duration, 0, 1)
  const eased = easedStep ?? progress * progress * (3 - 2 * progress)
  const { from, to } = transition
  // Travel around the globe, never through it when the station is on its far side.
  const radialRotation = new THREE.Quaternion().slerp(transition.radialRotation, eased)
  camera.position.copy(from.position).normalize().applyQuaternion(radialRotation)
    .multiplyScalar(THREE.MathUtils.lerp(from.position.length(), to.position.length(), eased))
  camera.quaternion.slerpQuaternions(from.quaternion, to.quaternion, eased)
  camera.up.copy(from.up).normalize().applyQuaternion(new THREE.Quaternion().slerp(transition.upRotation, eased))
  controls.target.lerpVectors(from.target, to.target, eased)
  if (progress === 1) {
    camera.position.copy(to.position)
    camera.quaternion.copy(to.quaternion)
    camera.up.copy(to.up)
    controls.target.copy(to.target)
  }
  return progress === 1
}

function updateCorrespondenceHighlight() {
  const highlight = correspondenceActive.value ? props.correspondenceHighlight : null
  // Keep the secondary trajectory explanation present, but leave the two
  // highlighted correspondences visually in front during this short lesson.
  if (trackPlane) (trackPlane.material as THREE.MeshBasicMaterial).opacity = correspondenceActive.value ? 0.06 : 0.22
  for (const object of [trackDirectionArrow?.line, trackDirectionArrow?.cone, trackBaseline, trackInclinationArc, trackInclinationLabel]) {
    if (!object) continue
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      const transparent = correspondenceActive.value || object instanceof THREE.Sprite
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true }
      material.opacity = correspondenceActive.value ? 0.24 : 1
    }
  }
  if (observerGround) {
    observerGround.material.color.set(highlight === 'ground' ? '#78fff0' : '#5ce3cd')
    observerGround.material.opacity = highlight === 'ground' ? 0.42 : 0.25
  }
  observerGroundRim?.material.color.set(highlight === 'ground' ? '#78fff0' : '#7affde')
  altitudeArc?.material.color.set(highlight === 'altitude' ? '#ffad45' : '#ff9b2f')
  belowAltitudeArc?.material.color.set(highlight === 'altitude' ? '#ffad45' : '#ff9b2f')
  if (altitudeLabel && lastAltitudeLabel) updateTextLabel(altitudeLabel, lastAltitudeLabel, highlight === 'altitude' ? '#ffad45' : '#ffbd80')
}

function finishCorrespondence(notify = true, restore = false) {
  if (!correspondenceActive.value && !savedCorrespondenceView) return
  const saved = savedCorrespondenceView
  const wasMoving = !!correspondenceTransition
  // Clear first: the parent's end handler may call the exposed end method again.
  correspondenceActive.value = false
  correspondenceTransition = undefined
  correspondenceView = undefined
  savedCorrespondenceView = undefined
  correspondencePointer = undefined
  if (!disposed && saved && camera && controls && renderer) {
    const retained = {
      position: camera.position.clone(), up: camera.up.clone(), quaternion: camera.quaternion.clone(), target: controls.target.clone(),
    }
    if (wasMoving && !restore) {
      // Mid-flight the interpolated quaternion need not yet look at the final
      // station. Preserve that exact view instead of snapping its orientation.
      retained.target.copy(retained.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()),
        retained.position.distanceTo(controls.target))
      retained.up.set(0, 1, 0).applyQuaternion(retained.quaternion)
    }
    const pose = restore ? saved : retained
    camera.up.copy(pose.up)
    controls.dispose()
    // OrbitControls captures its up-axis in the public constructor. Recreate
    // it after changing camera.up so the next drag uses this same local frame.
    controls = createSpaceControls()
    if (!controls) return
    camera.position.copy(pose.position)
    camera.quaternion.copy(pose.quaternion)
    controls.target.copy(pose.target)
    let sizeRatio = 1
    if (restore && saved.fitDistance > 0 && (saved.width !== lastWidth || saved.height !== lastHeight)) {
      sizeRatio = fitDistance() / saved.fitDistance
      camera.position.sub(saved.target).multiplyScalar(sizeRatio).add(saved.target)
    }
    const retainedDistance = camera.position.distanceTo(controls.target)
    controls.minDistance = restore ? saved.minDistance * sizeRatio : Math.min(saved.minDistance, retainedDistance * 0.45)
    controls.maxDistance = restore ? saved.maxDistance * sizeRatio : Math.max(saved.maxDistance, retainedDistance * 3)
    if (restore) {
      controls.minPolarAngle = saved.minPolarAngle
      controls.maxPolarAngle = saved.maxPolarAngle
      controls.minAzimuthAngle = saved.minAzimuthAngle
      controls.maxAzimuthAngle = saved.maxAzimuthAngle
    }
    controls.enabled = saved.enabled
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = saved.enableDamping
    lastFitDistance = restore ? saved.fitDistance * sizeRatio : fitDistance()
  }
  updateCorrespondenceHighlight()
  if (notify) emit('correspondence-end')
}

function endCorrespondence(restore = false) { finishCorrespondence(true, restore) }
function handleCorrespondencePointerDown(event: PointerEvent) {
  if (correspondenceActive.value || cameraFlight) correspondencePointer = event
}
function clearCorrespondencePointer(event: PointerEvent) {
  if (correspondencePointer?.pointerId === event.pointerId) correspondencePointer = undefined
}
function handleCorrespondencePointerMove(event: PointerEvent) {
  const down = correspondencePointer
  if ((!correspondenceActive.value && !cameraFlight) || !down || down.pointerId !== event.pointerId
    || Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) <= 6) return
  endCorrespondence()
  cancelCameraFlight()
  // The disabled controls did not receive the initial press. Hand the same
  // active pointer to their replacement so this drag continues immediately.
  renderer?.domElement.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, cancelable: true, pointerId: down.pointerId, pointerType: down.pointerType,
    isPrimary: down.isPrimary, button: down.button, buttons: event.buttons,
    clientX: down.clientX, clientY: down.clientY,
    ctrlKey: down.ctrlKey, metaKey: down.metaKey, shiftKey: down.shiftKey, altKey: down.altKey,
  }))
}
function handleCorrespondenceWheel() { endCorrespondence(); cancelCameraFlight() }
function requestCorrespondence() {
  if (correspondenceActive.value) endCorrespondence()
  else emit('request-correspondence')
}

function navigationDestination(kind: 'reset' | 'observer') {
  const up = new THREE.Vector3(0, 1, 0)
  const target = new THREE.Vector3(0.14, 0.06, 0)
  const direction = new THREE.Vector3(5, 1.5, -1.2).normalize()
  if (kind === 'observer') {
    const frame = getObserverFrame(props.latitude, props.declination, props.hourAngle)
    const stationUp = new THREE.Vector3(frame.up.x, frame.up.y, frame.up.z)
    const east = new THREE.Vector3(frame.east.x, frame.east.y, frame.east.z)
    target.copy(stationUp).multiplyScalar(0.3).applyQuaternion(tilt)
    direction.copy(stationUp).multiplyScalar(5.3).addScaledVector(east, 1.4).normalize().applyQuaternion(tilt)
  }
  const distance = fitDistance(direction, target, up)
  const position = target.clone().addScaledVector(direction, distance)
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position, target, up))
  return { pose: { position, up, quaternion, target }, direction, distance }
}

function captureCameraPose(): CameraPose | undefined {
  if (!camera || !controls) return
  return { position: camera.position.clone(), up: camera.up.clone(), quaternion: camera.quaternion.clone(), target: controls.target.clone() }
}

function startCameraFlight(kind: 'reset' | 'observer', immediate = false) {
  if (disposed || !camera || !controls) return
  endCorrespondence()
  cancelCameraFlight()
  if (!controls) return
  const destination = navigationDestination(kind)
  const { pose: to, direction, distance } = destination
  // Initial mount starts at the origin: place its initial view before rendering,
  // rather than flying out from inside the Earth. User actions always animate.
  if (immediate) {
    camera.position.copy(to.position)
    camera.up.copy(to.up)
    camera.quaternion.copy(to.quaternion)
    controls.target.copy(to.target)
    controls.minDistance = distance * 0.45
    controls.maxDistance = distance * 3
    lastFitDistance = distance
    controls.update()
    return
  }
  clearOrbitInertia()
  if (!controls) return
  const enableDamping = controls.enableDamping
  controls.enableDamping = false
  const from = captureCameraPose()!
  cameraFlight = {
    kind, direction, fitDistance: distance, from, to, lastEasedProgress: 0,
    startedAt: performance.now(),
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100,
    enabled: controls.enabled, enableDamping,
    minDistance: controls.minDistance, maxDistance: controls.maxDistance,
    radialRotation: new THREE.Quaternion().setFromUnitVectors(from.position.clone().normalize(), to.position.clone().normalize()),
    upRotation: new THREE.Quaternion().setFromUnitVectors(from.up.clone().normalize(), to.up.clone().normalize()),
  }
  controls.enabled = false
  syncRendering()
}

function resizeCameraFlight() {
  if (!cameraFlight) return
  const from = captureCameraPose()
  if (!from) return
  const destination = navigationDestination(cameraFlight.kind)
  const now = performance.now()
  cameraFlight.duration = Math.max(0, cameraFlight.duration - (now - cameraFlight.startedAt))
  cameraFlight.startedAt = now
  cameraFlight.lastEasedProgress = 0
  cameraFlight.from = from
  cameraFlight.to = destination.pose
  cameraFlight.direction.copy(destination.direction)
  cameraFlight.fitDistance = destination.distance
  cameraFlight.radialRotation.setFromUnitVectors(from.position.clone().normalize(), destination.pose.position.clone().normalize())
  cameraFlight.upRotation.setFromUnitVectors(from.up.clone().normalize(), destination.pose.up.clone().normalize())
}

function updateCameraFlight(): boolean {
  const flight = cameraFlight
  if (!flight) return false
  // At high playback speeds the station moves during the flight. Keep its
  // destination current without restarting elapsed time, then stop following.
  if (flight.kind === 'observer') {
    const destination = navigationDestination('observer')
    flight.to = destination.pose
    flight.direction.copy(destination.direction)
    flight.fitDistance = destination.distance
  }
  const progress = flight.duration === 0 ? 1
    : THREE.MathUtils.clamp((performance.now() - flight.startedAt) / flight.duration, 0, 1)
  const eased = progress * progress * (3 - 2 * progress)
  const step = flight.lastEasedProgress < 1 ? (eased - flight.lastEasedProgress) / (1 - flight.lastEasedProgress) : 1
  flight.lastEasedProgress = eased
  // Advance from the last displayed pose. A moving destination can pass the
  // initial point's antipode without switching the whole path to the other side.
  const from = captureCameraPose()
  if (!from) return false
  flight.from = from
  flight.radialRotation.setFromUnitVectors(from.position.clone().normalize(), flight.to.position.clone().normalize())
  flight.upRotation.setFromUnitVectors(from.up.clone().normalize(), flight.to.up.clone().normalize())
  if (applyCameraTransition(flight, THREE.MathUtils.clamp(step, 0, 1))) finishCameraFlight(true)
  return true
}

function finishCameraFlight(arrived = false) {
  const flight = cameraFlight
  if (!flight) return
  cameraFlight = undefined
  correspondencePointer = undefined
  if (disposed || !camera || !controls || !renderer) return
  const pose = captureCameraPose()!
  if (!arrived) {
    pose.target.copy(pose.position).addScaledVector(camera.getWorldDirection(new THREE.Vector3()),
      pose.position.distanceTo(controls.target))
    pose.up.set(0, 1, 0).applyQuaternion(pose.quaternion)
  }
  camera.up.copy(pose.up)
  controls.dispose()
  controls = createSpaceControls()
  if (!controls) return
  camera.position.copy(pose.position)
  camera.quaternion.copy(pose.quaternion)
  controls.target.copy(pose.target)
  const distance = pose.position.distanceTo(pose.target)
  controls.minDistance = arrived ? flight.fitDistance * 0.45 : Math.min(flight.minDistance, distance * 0.45)
  controls.maxDistance = arrived ? flight.fitDistance * 3 : Math.max(flight.maxDistance, distance * 3)
  controls.enabled = flight.enabled
  controls.enableDamping = false
  controls.update()
  controls.enableDamping = flight.enableDamping
  lastFitDistance = arrived ? flight.fitDistance : fitDistance()
}

function cancelCameraFlight() { finishCameraFlight() }
function resetView() { startCameraFlight('reset') }
function findObserver() { startCameraFlight('observer') }

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Home') { event.preventDefault(); findObserver() }
  if (event.key.toLowerCase() === 'r') { event.preventDefault(); resetView() }
}

function stopRendering() {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
}

function render() {
  animationFrame = 0
  if (disposed || !props.active || document.hidden || !sizeReady || !renderer || !scene || !camera || !controls) return
  if (!updateCorrespondence() && !updateCameraFlight()) controls.update()
  drawScene()
  animationFrame = requestAnimationFrame(render)
}

function drawScene() {
  if (disposed || !props.active || document.hidden || !sizeReady || !renderer || !scene || !camera) return
  updateLatitudeLabels()
  updateGuideVisibility()
  updateLabelLayout()
  renderer.render(scene, camera)
}

function updateLabelLayout() {
  if (!camera || !observerGuides || !lastWidth || !lastHeight) return
  camera.updateMatrixWorld()
  observerGuides.updateWorldMatrix(true, true)
  const worldPerPixelAtDepth = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / lastHeight
  // 放大地球时标注不再无限放大，字高保持在可阅读的小字号范围。
  for (const { sprite, width, maxPixels, minPixels = 0 } of sceneLabels) {
    const viewPosition = sprite.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse)
    const worldPerPixel = Math.max(0.01, -viewPosition.z) * worldPerPixelAtDepth
    const size = THREE.MathUtils.clamp(width, minPixels * worldPerPixel, maxPixels * worldPerPixel)
    sprite.scale.set(size, size * 112 / 256, 1)
    if (sprite.userData.cardinalDirection) {
      sprite.center.set(0.5, 0.5)
      if (legendBounds && sprite.visible) {
        const projected = sprite.getWorldPosition(new THREE.Vector3()).project(camera)
        const x = (projected.x + 1) * lastWidth / 2
        const y = (1 - projected.y) * lastHeight / 2
        // Measure the painted 96px badge, excluding the transparent texture
        // margin. Offset only its screen attachment; its geographic anchor stays put.
        const halfBadge = size / worldPerPixel * 96 / 256 / 2
        if (x + halfBadge > legendBounds.left - 8 && x - halfBadge < legendBounds.right + 8
          && y + halfBadge > legendBounds.top - 8 && y - halfBadge < legendBounds.bottom + 8) {
          const shift = y + halfBadge - legendBounds.top + 8
          sprite.center.y -= shift / (size / worldPerPixel * 112 / 256)
        }
      }
    }
  }
  if (!altitudeLabel || !trackInclinationLabel) return
  const placed: { x: number; y: number; width: number; height: number }[] = []
  for (const entry of [
    { sprite: trackInclinationLabel, anchor: inclinationLabelAnchor, dx: -32, dy: -18 },
    { sprite: altitudeLabel, anchor: altitudeLabelAnchor, dx: 28, dy: 22 },
  ]) {
    const world = observerGuides.localToWorld(entry.anchor.clone())
    const projected = world.clone().project(camera)
    const depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z
    entry.sprite.visible = depth > 0 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1
    if (!entry.sprite.visible) continue
    const width = entry.sprite.scale.x / (depth * worldPerPixelAtDepth)
    const height = width * 112 / 256
    const minY = height / 2 + 8
    const maxY = Math.max(minY, lastHeight - (window.innerWidth <= 720 ? 148 : 102) - height / 2 - 8)
    let x = (projected.x + 1) * lastWidth / 2 + entry.dx
    let y = (1 - projected.y) * lastHeight / 2 + entry.dy
    x = THREE.MathUtils.clamp(x, width / 2 + 8, lastWidth - width / 2 - 8)
    y = THREE.MathUtils.clamp(y, minY, maxY)
    for (const previous of placed) {
      if (Math.abs(x - previous.x) < (width + previous.width) / 2 + 6
        && Math.abs(y - previous.y) < (height + previous.height) / 2 + 6) {
        const clearance = (height + previous.height) / 2 + 6
        const below = previous.y + clearance
        y = below <= maxY ? below : Math.max(minY, previous.y - clearance)
      }
    }
    placed.push({ x, y, width, height })
    const position = new THREE.Vector3(x / lastWidth * 2 - 1, 1 - y / lastHeight * 2, projected.z).unproject(camera)
    entry.sprite.position.copy(observerGuides.worldToLocal(position))
  }
}

function updateGuideVisibility() {
  if (!camera || !observerGuides) return
  const upWorld = guideUp.clone().applyQuaternion(tilt)
  const footWorld = observerGuides.position.clone().applyQuaternion(tilt)
  // The body still uses normal depth occlusion. Hide explanatory labels and
  // underground dashed guides as well when their station is on the far side.
  observerGuides.visible = upWorld.dot(camera.position.clone().sub(footWorld)) > 0
  if (observer) {
    observer.updateWorldMatrix(true, true)
    for (const child of observer.children) {
      if (!(child instanceof THREE.Sprite) || !child.userData.cardinalDirection) continue
      child.visible = observerGuides.visible
      if (!child.visible) continue
      // Labels stay in front of transparent guide surfaces, but never show
      // through the globe when their actual geographic anchor is hidden.
      const anchor = child.getWorldPosition(new THREE.Vector3())
      const toCamera = camera.position.clone().sub(anchor)
      const lengthSquared = toCamera.lengthSq()
      const closestFraction = lengthSquared > 0 ? -anchor.dot(toCamera) / lengthSquared : 0
      if (closestFraction > 0 && closestFraction < 1
        && anchor.addScaledVector(toCamera, closestFraction).lengthSq() < EARTH_RADIUS ** 2 - 1e-10) {
        child.visible = false
      }
    }
  }
  if (subsolarMarker && subsolarLabel) {
    const pointWorld = subsolarMarker.getWorldPosition(new THREE.Vector3())
    subsolarLabel.visible = pointWorld.dot(camera.position.clone().sub(pointWorld)) > 0
  }
}

function updateLatitudeLabels() {
  if (!camera) return
  // Keep degree/minute labels attached to the visible side of each parallel,
  // instead of allowing daily spin to hide every label on the far hemisphere.
  camera.updateMatrixWorld()
  const localCamera = camera.position.clone().applyQuaternion(inverseTilt)
  const sideAngle = Math.atan2(-localCamera.z, localCamera.x) + Math.PI / 2
  const candidates: { sprite: THREE.Sprite; latitude: number; left: number; right: number; top: number; bottom: number }[] = []
  for (const { latitude, sprite } of latitudeLabels) {
    const phi = latitude * Math.PI / 180
    const radius = EARTH_RADIUS * 1.014 * Math.cos(phi) + 0.06
    sprite.position.set(radius * Math.cos(sideAngle), EARTH_RADIUS * 1.014 * Math.sin(phi), -radius * Math.sin(sideAngle))
    sprite.visible = true
    // These anchors sit outside the globe's silhouette. A surface-normal test
    // would hide valid limb labels; test the actual sight segment instead.
    const toCamera = localCamera.clone().sub(sprite.position)
    const distanceSquared = toCamera.lengthSq()
    const closestFraction = distanceSquared > 0 ? -sprite.position.dot(toCamera) / distanceSquared : 0
    if (closestFraction > 0 && closestFraction < 1
      && sprite.position.clone().addScaledVector(toCamera, closestFraction).lengthSq() < EARTH_RADIUS ** 2 - 1e-10) {
      sprite.visible = false
      continue
    }
    if (!lastWidth || !lastHeight) continue
    const world = sprite.position.clone().applyQuaternion(tilt)
    const viewPosition = world.clone().applyMatrix4(camera.matrixWorldInverse)
    if (-viewPosition.z <= camera.near) {
      sprite.visible = false
      continue
    }
    const projected = world.project(camera)
    // Match updateLabelLayout's final scale in this frame, including its cap,
    // rather than using the previous frame's sprite size after a zoom/resize.
    const metadata = sceneLabels.find(entry => entry.sprite === sprite)
    const worldPerPixel = -viewPosition.z * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / lastHeight
    const width = metadata ? Math.min(metadata.width / worldPerPixel, metadata.maxPixels) : sprite.scale.x / worldPerPixel
    const height = width * 112 / 256
    const x = (projected.x + 1) * lastWidth / 2
    const y = (1 - projected.y) * lastHeight / 2
    const bounds = {
      sprite, latitude,
      left: x - sprite.center.x * width,
      right: x + (1 - sprite.center.x) * width,
      top: y - (1 - sprite.center.y) * height,
      bottom: y + sprite.center.y * height,
    }
    sprite.visible = projected.z <= 1 && bounds.right >= 0 && bounds.left <= lastWidth && bounds.bottom >= 0 && bounds.top <= lastHeight
    if (sprite.visible) candidates.push(bounds)
  }
  // Prefer the equator, then tropics, then polar circles; within a pair prefer
  // the hemisphere facing the camera. Never move a label off its own parallel.
  candidates.sort((a, b) => Math.abs(a.latitude) - Math.abs(b.latitude)
    || Math.sign(localCamera.y) * (b.latitude - a.latitude))
  const placed: typeof candidates = []
  for (const candidate of candidates) {
    candidate.sprite.visible = !placed.some(previous => candidate.left < previous.right + 5
      && candidate.right > previous.left - 5 && candidate.top < previous.bottom + 5 && candidate.bottom > previous.top - 5)
    if (candidate.sprite.visible) placed.push(candidate)
  }
}

function syncRendering() {
  if (disposed || !props.active || document.hidden || !sizeReady) { cancelCameraFlight(); stopRendering() }
  else if (!animationFrame && renderer && scene) animationFrame = requestAnimationFrame(render)
}

watch(() => [props.latitude, props.declination, props.hourAngle], () => { endCorrespondence(); updateGeometry() })
watch(() => props.latitude, updateLatitudeCircle)
watch(() => props.correspondenceHighlight, updateCorrespondenceHighlight)
watch(() => props.active, () => { if (!props.active) { endCorrespondence(); cancelCameraFlight() }; resize(); syncRendering() }, { flush: 'post' })
defineExpose({ beginCorrespondence, endCorrespondence })
onMounted(setup)
onUnmounted(() => {
  disposed = true
  cancelCameraFlight()
  finishCorrespondence(false, false)
  stopRendering()
  disposeGalaxySky?.()
  disposeGalaxySky = undefined
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', syncRendering)
  controls?.dispose()
  textureTimers.forEach(timer => window.clearTimeout(timer))
  textureTimers.clear()
  renderer?.domElement.removeEventListener('keydown', handleKeydown)
  renderer?.domElement.removeEventListener('pointerdown', handleCorrespondencePointerDown, true)
  renderer?.domElement.removeEventListener('wheel', handleCorrespondenceWheel, true)
  document.removeEventListener('pointermove', handleCorrespondencePointerMove, true)
  document.removeEventListener('pointerup', clearCorrespondencePointer, true)
  document.removeEventListener('pointercancel', clearCorrespondencePointer, true)
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  scene?.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
      if (!(object instanceof THREE.Sprite)) geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material)
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
      }
    }
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
  textures.forEach(texture => texture.dispose())
  earthTextures.forEach(texture => texture.dispose())
  earthTextures.clear()
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
})
</script>

<style scoped>
.space-observer-window { position: relative; height: 100%; min-height: 0; color: #315c6b; container: space-view / inline-size; }
.space-observer-actions { position: absolute; top: 80px; left: 18px; right: 18px; z-index: 3; display: flex; justify-content: flex-end; pointer-events: none; }
.space-view-tools {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px;
  border: 1px solid rgba(171, 211, 223, .22);
  border-radius: 14px;
  background: rgba(10, 28, 40, .88);
  box-shadow: 0 6px 20px #0003, inset 0 1px 0 #ffffff09;
  backdrop-filter: blur(16px);
  pointer-events: auto;
}
.space-view-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #c1d4de;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color .16s ease, border-color .16s ease, color .16s ease;
}
.space-view-action svg { width: 16px; height: 16px; flex: 0 0 16px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.space-view-action:hover:not(:disabled) { background: #c4e9f014; color: #f1fbff; }
.space-view-action:active:not(:disabled) { background: #c4e9f023; }
.space-view-action:focus-visible { outline: 2px solid #87eadb; outline-offset: 2px; }
.space-view-action:disabled { opacity: .45; cursor: not-allowed; }
.correspondence-action { border-color: #77dece30; background: #76dfcb12; color: #a5f0e3; font-weight: 600; }
.correspondence-action:hover:not(:disabled) { border-color: #88e6d665; background: #76dfcb25; color: #d6fff6; }
.correspondence-action[aria-pressed="true"] { border-color: #8ce4d5; background: #8ce4d5; color: #103e3b; }
.correspondence-action[aria-pressed="true"]:hover { border-color: #a8f0e3; background: #a8f0e3; color: #103e3b; }
.reset-action { position: relative; margin-left: 3px; }
.reset-action::before { content: ''; position: absolute; left: -5px; height: 16px; width: 1px; background: #b9d9e32b; }
.space-observer-canvas { position: absolute; inset: 0; min-height: 0; overflow: hidden; background: #081c2b; }
.space-observer-canvas :deep(canvas) { width: 100%; height: 100%; display: block; touch-action: none; }
.space-observer-canvas :deep(canvas:focus-visible) { outline: 2px solid #39d7e2; outline-offset: -3px; }
.space-legend { position: absolute; left: 18px; bottom: 112px; z-index: 2; display: grid; grid-template-columns: repeat(2, max-content); gap: 8px 18px; max-width: calc(100% - 36px); padding: 12px 14px; border: 1px solid rgba(174, 208, 228, .22); border-radius: 12px; background: rgba(5, 18, 31, .78); box-shadow: 0 6px 22px #0003; backdrop-filter: blur(10px); color: #d7e7f0; font-size: 12px; line-height: 1.4; pointer-events: none; }
.space-legend span { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
.space-legend i { flex: 0 0 14px; height: 2px; border-radius: 2px; background: var(--key-color); }
.space-legend b { flex: 0 0 14px; color: var(--key-color); text-align: center; font-size: 14px; font-weight: 600; }
.normal-key { --key-color: #78fff0; }
.sight-key { --key-color: #ffe378; }
.altitude-key { --key-color: #ffbd80; }
.inclination-key { --key-color: #acd1ff; }
.space-legend .reference-plane-key { --key-color: #bd94f4; grid-column: 1 / -1; padding-top: 8px; border-top: 1px solid #bed9e61f; }
.space-legend .reference-plane-key i { height: 10px; border: 1px solid #d2b7ff; background: #bd94f44d; }
.space-legend em { color: #a4bac9; font-size: 11px; font-style: normal; }
.space-texture-status { position: absolute; left: 18px; top: 116px; z-index: 1; max-width: calc(100% - 36px); padding: 5px 8px; background: #06121fd9; border-radius: 6px; color: #dceef6; font-size: 12px; pointer-events: none; }
.space-observer-error { position: absolute; top: 182px; left: 18px; right: 18px; margin: 0; color: #e2edf2; font-size: 13px; line-height: 1.6; }
@media (max-width: 720px) {
  .space-observer-actions { top: 82px; left: 8px; right: 8px; gap: 6px; }
  .space-legend { left: 8px; bottom: 176px; max-width: calc(100% - 16px); padding: 9px; gap: 6px 10px; border-radius: 9px; font-size: 10px; }
  .space-legend span { gap: 4px; }
  .space-legend i, .space-legend b { flex-basis: 10px; }
  .space-legend em { font-size: 10px; }
  .space-texture-status, .space-observer-error { top: 124px; left: 8px; right: 8px; max-width: calc(100% - 16px); }
}
@container space-view (max-width: 340px) {
  .space-observer-actions { left: 8px; right: 8px; }
  .space-view-action { gap: 0; padding-inline: 8px; }
  .space-view-action svg { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .space-view-action { transition: none; }
}
</style>
