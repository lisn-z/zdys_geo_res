import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { formatDegreesMinutes, type Coordinate } from './map-lesson'
import { GLOBE_ENTRY_ZOOM, GLOBE_EXIT_ZOOM, GLOBE_MIN_ZOOM } from './map-view-config'
import { geographicMercatorNorthing, hasLocalDirectionFrame, mapReferencePath } from './map-geography'
import { directionGuideMetrics, mapDirections } from './direction-guide'

export interface MapGlobeScene {
  setView(center: Coordinate, zoom: number): void
  setTransition(progress: number, flatZoom?: number): void
  setActive(active: boolean): void
  setGraticule(visible: boolean): void
  setDirectionGuide(visible: boolean): void
  setPoints(points: Coordinate[]): void
  zoomBy(delta: number): void
  getCenter(): Coordinate
  getZoom(): number
  resize(): void
  dispose(): void
}

type GlobeCallbacks = {
  onZoom(zoom: number): void
  onCenterChange(center: Coordinate): void
  onPick(point: Coordinate): void
  onError(message: string): void
}

// The day texture is shared with the 地球运动 resource. Its equirectangular
// image puts 0° longitude halfway across, with north at the top.
const EARTH_TEXTURE_URL = '/geo-resources-folder/images/Material.001_diffuse.jpg'
const RAD = Math.PI / 180
const MERCATOR_LIMIT = 85.0511287798
const TROPIC = 23 + 26 / 60
const POLAR_CIRCLE = 66 + 34 / 60
const LONGITUDE_SEGMENTS = 192
const LATITUDE_SEGMENTS = 96
const MIN_ZOOM = GLOBE_MIN_ZOOM
const MAX_ZOOM = GLOBE_EXIT_ZOOM

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const wrapLongitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180

function longitudeDifference(longitude: number, center: number) {
  const difference = longitude - center
  const wrapped = wrapLongitude(difference)
  return wrapped === -180 && difference > 0 ? 180 : wrapped
}

function mercatorY(latitude: number) {
  const sine = Math.sin(clamp(latitude, -MERCATOR_LIMIT, MERCATOR_LIMIT) * RAD)
  return Math.log((1 + sine) / (1 - sine)) / 2
}

/** Unit-radius globe, tangent to the map at its view center; north stays up. */
export function globeCoordinatePosition(point: Coordinate, center: Coordinate, progress: number) {
  const latitude = point.lat * RAD
  const longitude = longitudeDifference(point.lng, center.lng) * RAD
  const centerLatitude = center.lat * RAD
  const cosCenter = Math.cos(centerLatitude)
  const sinCenter = Math.sin(centerLatitude)
  const cosLatitude = Math.cos(latitude)
  const sinLatitude = Math.sin(latitude)
  const sinLongitude = Math.sin(longitude)
  const cosLongitude = Math.cos(longitude)
  const flatX = longitude * cosCenter
  const flatY = (mercatorY(point.lat) - mercatorY(center.lat)) * cosCenter
  const sphereX = cosLatitude * sinLongitude
  const sphereY = sinLatitude * cosCenter - cosLatitude * cosLongitude * sinCenter
  const facing = sinLatitude * sinCenter + cosLatitude * cosLongitude * cosCenter
  return {
    x: flatX + (sphereX - flatX) * progress,
    y: flatY + (sphereY - flatY) * progress,
    z: (facing - 1) * progress,
    facing,
    flatX,
    flatY,
    sphereX,
    sphereY,
  }
}

/** Interpolate the final pixel positions, rather than multiplying two lerps.
 * Independent radius and coordinate lerps introduce an extra p(1-p) term,
 * which can make distant land bulge outward before moving into the globe.
 */
export function globeProjectedPosition(point: Coordinate, center: Coordinate, progress: number, flatRadius: number, globeRadius: number, elevation = 0) {
  const position = globeCoordinatePosition(point, center, progress)
  const flatX = position.flatX * flatRadius
  const flatY = position.flatY * flatRadius
  return {
    x: flatX + (position.sphereX * (globeRadius + elevation) - flatX) * progress,
    y: flatY + (position.sphereY * (globeRadius + elevation) - flatY) * progress,
    z: (position.facing - 1) * globeRadius * progress + (position.facing * progress + 1 - progress) * elevation,
    facing: position.facing,
  }
}

/** Keep each ray on one constant-bearing line in Mercator coordinates. At the
 * planar endpoint its offsets are the existing SVG's exact CSS pixels; on the
 * globe the same local north/east axes form a small, readable spherical guide.
 */
export function globeDirectionGuideCoordinate(origin: Coordinate, bearing: number, eastPixels: number, northPixels: number, mapZoom: number, guideRadius: number, sphereRadius: number, progress: number): Coordinate {
  if (!hasLocalDirectionFrame(origin)) return { ...origin }
  const angle = bearing * RAD
  const latitude = origin.lat * RAD
  const originNorthing = geographicMercatorNorthing(origin.lat)
  const north = Math.cos(angle)
  const east = Math.sin(angle)
  const desiredPixels = clamp(guideRadius * 0.65, 75, 115)
  let angularDistance = Math.min(24 * RAD, desiredPixels / Math.max(1, sphereRadius))
  if (Math.abs(north) > 1e-8) {
    const availableLatitude = north > 0 ? Math.PI / 2 - 1e-12 - latitude : latitude + Math.PI / 2 - 1e-12
    angularDistance = Math.min(angularDistance, Math.max(0, availableLatitude) / Math.abs(north))
  }
  const targetLatitude = latitude + angularDistance * north
  const targetNorthing = geographicMercatorNorthing(targetLatitude / RAD)
  const northingDifference = targetNorthing - originNorthing
  const q = Math.abs(northingDifference) > 1e-8 ? (targetLatitude - latitude) / northingDifference : Math.cos(latitude)
  const longitudeDifference = angularDistance * east / Math.max(1e-6, q)
  // Near a pole, circling along its tiny parallel should not wrap a local
  // reference arrow around the whole globe.
  const longitudeLimit = Math.abs(longitudeDifference) > 55 * RAD ? 55 * RAD / Math.abs(longitudeDifference) : 1
  const globeMercatorRadius = Math.hypot(longitudeDifference, northingDifference) * longitudeLimit
  const flatMercatorPerPixel = Math.PI * 2 / (256 * 2 ** mapZoom)
  const globeMercatorPerPixel = globeMercatorRadius / guideRadius
  const amount = flatMercatorPerPixel * (1 - progress) + globeMercatorPerPixel * progress
  const anchorNorthing = mercatorY(origin.lat) * (1 - progress) + originNorthing * progress
  return { lat: Math.atan(Math.sinh(anchorNorthing + northPixels * amount)) / RAD, lng: origin.lng + eastPixels * amount / RAD }
}

/** Spherical shortest route, including stable coincident/antipodal cases. */
export function globeGreatCircle(a: Coordinate, b: Coordinate, segments = 128): Coordinate[] {
  const vector = (point: Coordinate) => new THREE.Vector3(
    Math.cos(point.lat * RAD) * Math.cos(point.lng * RAD),
    Math.sin(point.lat * RAD),
    Math.cos(point.lat * RAD) * Math.sin(point.lng * RAD),
  )
  const start = vector(a)
  const end = vector(b)
  const angle = Math.acos(clamp(start.dot(end), -1, 1))
  let tangent = end.clone().addScaledVector(start, -Math.cos(angle))
  if (tangent.lengthSq() < 1e-14) {
    const reference = Math.abs(start.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    tangent = reference.addScaledVector(start, -reference.dot(start))
  }
  tangent.normalize()
  return Array.from({ length: segments + 1 }, (_, index) => {
    if (index === segments) return { ...b }
    const arc = angle * index / segments
    const point = start.clone().multiplyScalar(Math.cos(arc)).addScaledVector(tangent, Math.sin(arc)).normalize()
    return { lat: Math.asin(clamp(point.y, -1, 1)) / RAD, lng: Math.atan2(point.z, point.x) / RAD }
  })
}

function loadEarthTexture(): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = window.setTimeout(() => {
      settled = true
      reject(new Error('地球贴图加载超时，已保留二维地图。'))
    }, 25000)
    new THREE.TextureLoader().load(EARTH_TEXTURE_URL, texture => {
      if (settled) { texture.dispose(); return }
      settled = true
      window.clearTimeout(timeout)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      resolve(texture)
    }, undefined, () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      reject(new Error('地球贴图暂时无法加载，已保留二维地图。'))
    })
  })
}

type CoordinateLabel = {
  element: HTMLDivElement
  point: Coordinate
  special?: boolean
  priority?: number
  marker?: boolean
  direction?: boolean
}

type GeographicLine = {
  coordinates: Coordinate[]
  line: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial | THREE.LineDashedMaterial> | LineSegments2
  graticule: boolean
  direction?: boolean
}

export async function createMapGlobe(host: HTMLElement, callbacks: GlobeCallbacks): Promise<MapGlobeScene> {
  const texture = await loadEarthTexture()
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  } catch {
    texture.dispose()
    throw new Error('当前设备无法创建三维地球，已保留二维地图。')
  }
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x071725, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const canvas = renderer.domElement
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;cursor:grab;'
  canvas.setAttribute('aria-label', '三维地球：拖动旋转，滚轮或双指缩放，放大返回地图')
  canvas.setAttribute('role', 'img')
  host.appendChild(canvas)

  const labelsHost = document.createElement('div')
  labelsHost.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;'
  labelsHost.setAttribute('aria-hidden', 'true')
  host.appendChild(labelsHost)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100000)
  camera.position.set(0, 0, 10000)
  camera.lookAt(0, 0, 0)
  const vertexCount = (LONGITUDE_SEGMENTS + 1) * (LATITUDE_SEGMENTS + 1)
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices: number[] = []
  for (let row = 0; row < LATITUDE_SEGMENTS; row += 1) {
    for (let column = 0; column < LONGITUDE_SEGMENTS; column += 1) {
      const a = row * (LONGITUDE_SEGMENTS + 1) + column
      const b = a + 1
      const c = a + LONGITUDE_SEGMENTS + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2).setUsage(THREE.DynamicDrawUsage))
  // Match Leaflet's wrapped tiles from the planar handoff onward: coordinates
  // beyond ±180° are the same texture in an adjacent world copy.
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide, transparent: true })
  const earth = new THREE.Mesh(geometry, material)
  earth.frustumCulled = false
  scene.add(earth)

  const glowGeometry = new THREE.PlaneGeometry(2.24, 2.24)
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform float opacity;void main(){float r=length((vUv-.5)*2.24);float glow=exp(-pow((r-1.)/.045,2.))*smoothstep(.98,1.01,r);gl_FragColor=vec4(.25,.72,1.,glow*.36*opacity);}',
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  glow.renderOrder = -10
  scene.add(glow)

  let center: Coordinate = { lat: 30, lng: 120 }
  let zoom = GLOBE_ENTRY_ZOOM
  let targetZoom = GLOBE_ENTRY_ZOOM
  let flatZoom = GLOBE_ENTRY_ZOOM
  let progress = 0
  let active = false
  let disposed = false
  let graticuleVisible = false
  let directionGuideVisible = false
  let width = 1
  let height = 1
  let radius = 1
  let flatRadius = 1
  let globeRadius = 1
  let frame = 0
  let needsResize = true
  let geometryDirty = true
  let centerNotification = false
  let points: Coordinate[] = []
  let route: GeographicLine | null = null
  const geographicLines: GeographicLine[] = []
  const gridLabels: CoordinateLabel[] = []
  const pointLabels: CoordinateLabel[] = []
  const directionLabels: CoordinateLabel[] = []
  const raycaster = new THREE.Raycaster()

  function newLabel(text: string, color: string, special = false, marker = false) {
    const element = document.createElement('div')
    element.textContent = text
    element.style.cssText = marker
      ? `position:absolute;left:0;top:0;box-sizing:border-box;width:28px;height:28px;margin:0;padding:0;display:flex;align-items:center;justify-content:center;flex:none;border-radius:50%;border:2px solid #fff;background:${color};color:#fff;font:700 14px/1 Arial,sans-serif;letter-spacing:0;text-indent:0;text-align:center;box-shadow:0 2px 9px #0008;transform:translate(-50%,-50%);`
      : `position:absolute;left:0;top:0;box-sizing:border-box;margin:0;padding:3px 5px;border:0;border-radius:4px;white-space:nowrap;background:rgba(5,19,31,.7);color:${color};font:${special ? 600 : 400} ${special ? 12 : 11}px/1.25 "Microsoft YaHei",sans-serif;letter-spacing:0;text-indent:0;text-align:center;text-shadow:0 1px 3px #000;transform:translate(-50%,-50%);`
    labelsHost.appendChild(element)
    return element
  }

  function newLine(coordinates: Coordinate[], color: string, dashed = false, graticule = true, opacity = 1): GeographicLine {
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(0, coordinates.length - 1) * 6), 3).setUsage(THREE.DynamicDrawUsage))
    const lineMaterial = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 7, gapSize: 5, depthWrite: false })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    const line = new THREE.LineSegments(lineGeometry, lineMaterial)
    line.frustumCulled = false
    line.renderOrder = 1
    const result = { coordinates, line, graticule }
    geographicLines.push(result)
    scene.add(line)
    return result
  }

  function newRoute(coordinates: Coordinate[]): GeographicLine {
    // WebGL's native line width is usually fixed at one pixel. Use screen-space
    // mesh strokes so the reference route matches Leaflet's four-pixel line.
    const segmentCount = coordinates.length - 1
    const lineGeometry = new LineSegmentsGeometry()
    lineGeometry.setPositions(new Float32Array(segmentCount * 6))
    const starts = lineGeometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute
    starts.data.setUsage(THREE.DynamicDrawUsage)
    const distances = new THREE.InstancedInterleavedBuffer(new Float32Array(segmentCount * 2), 2, 1)
    distances.setUsage(THREE.DynamicDrawUsage)
    lineGeometry.setAttribute('instanceDistanceStart', new THREE.InterleavedBufferAttribute(distances, 1, 0))
    lineGeometry.setAttribute('instanceDistanceEnd', new THREE.InterleavedBufferAttribute(distances, 1, 1))
    const lineMaterial = new LineMaterial({ color: '#fcdf8a', linewidth: 4, dashed: true, dashSize: 8, gapSize: 7, worldUnits: false, transparent: true, depthWrite: false })
    const line = new LineSegments2(lineGeometry, lineMaterial)
    line.frustumCulled = false
    line.renderOrder = 1
    const result = { coordinates, line, graticule: false }
    geographicLines.push(result)
    scene.add(line)
    return result
  }

  const latitudeLines: { latitude: number; definition: GeographicLine; label: CoordinateLabel }[] = []
  for (const latitude of [0, TROPIC, -TROPIC, POLAR_CIRCLE, -POLAR_CIRCLE, -60, -30, 30, 60]) {
    const polarCircle = Math.abs(latitude) === POLAR_CIRCLE
    const special = latitude === 0 || Math.abs(latitude) === TROPIC || polarCircle
    const color = latitude === 0 ? '#ff5964' : polarCircle ? '#a9baff' : special ? '#ffdc58' : '#b9e5ed'
    const latitudeName = polarCircle ? (latitude > 0 ? '北极圈 ' : '南极圈 ')
      : Math.abs(latitude) === TROPIC ? (latitude > 0 ? '北回归线 ' : '南回归线 ') : ''
    const text = latitude === 0 ? '赤道 0°'
      : `${latitudeName}${formatDegreesMinutes(latitude)}${latitude > 0 ? 'N' : 'S'}`
    const definition = newLine(Array.from({ length: 193 }, () => ({ lat: latitude, lng: 0 })), color, latitude !== 0 && special, true, special ? 1 : 0.36)
    // In the polar view, 60° and 66°34′ can project only a few pixels apart.
    // Reserve room for the named polar circle before ordinary coordinate labels.
    const label: CoordinateLabel = { element: newLabel(text, color, special), point: { lat: latitude, lng: 0 }, special, priority: polarCircle ? 3 : special ? 2 : 0 }
    gridLabels.push(label)
    latitudeLines.push({ latitude, definition, label })
  }
  for (let longitude = -180; longitude < 180; longitude += 30) {
    newLine(Array.from({ length: 97 }, (_, index) => ({ lat: 90 - index * 180 / 96, lng: longitude })), '#b9e5ed', false, true, 0.3)
    const text = longitude === 0 ? '0°' : `${formatDegreesMinutes(longitude)}${longitude > 0 ? 'E' : 'W'}`
    gridLabels.push({ element: newLabel(text, '#c3e5ec'), point: { lat: 0, lng: longitude } })
  }

  const directionRays = mapDirections.map(direction => {
    const color = direction.bearing === 0 ? '#ff716f' : direction.bearing % 90 === 0 ? '#d0faff' : '#a2e1d5'
    const ray = newLine(Array.from({ length: 25 }, () => ({ lat: 0, lng: 0 })), color, true, false)
    const arrow = newLine(Array.from({ length: 3 }, () => ({ lat: 0, lng: 0 })), color, false, false)
    ray.direction = true
    arrow.direction = true
    const label: CoordinateLabel = { element: newLabel(direction.label, color, true), point: { lat: 0, lng: 0 }, direction: true }
    label.element.style.fontWeight = '800'
    label.element.style.fontSize = direction.bearing % 90 === 0 ? '14px' : '12px'
    label.element.style.background = 'rgba(5,19,31,.85)'
    directionLabels.push(label)
    return { direction, ray, arrow, label }
  })

  function project(point: Coordinate, elevation = 0, unboundedGuide = false) {
    const position = globeProjectedPosition(point, center, progress, flatRadius, globeRadius, elevation)
    if (unboundedGuide && progress < 1) {
      // Leaflet's SVG direction guide may extend beyond the imagery's Mercator
      // limit. Preserve those screen pixels during the planar handoff too.
      const trueNorthing = Math.log(Math.tan(Math.PI / 4 + clamp(point.lat, -89.999999, 89.999999) * RAD / 2))
      position.y += (trueNorthing - mercatorY(point.lat)) * Math.cos(center.lat * RAD) * flatRadius * (1 - progress)
    }
    return position
  }

  function updateGeometry() {
    const cosCenter = Math.max(0.086, Math.cos(center.lat * RAD))
    flatRadius = 256 * 2 ** flatZoom / (Math.PI * 2 * cosCenter)
    globeRadius = Math.min(width, height) * 0.39 * 2 ** (zoom - GLOBE_ENTRY_ZOOM)
    radius = flatRadius + (globeRadius - flatRadius) * progress
    for (let row = 0; row <= LATITUDE_SEGMENTS; row += 1) {
      const latitude = 90 - row * 180 / LATITUDE_SEGMENTS
      for (let column = 0; column <= LONGITUDE_SEGMENTS; column += 1) {
        const longitude = center.lng - 180 + column * 360 / LONGITUDE_SEGMENTS
        const index = row * (LONGITUDE_SEGMENTS + 1) + column
        const position = project({ lat: latitude, lng: longitude })
        positions[index * 3] = position.x
        positions[index * 3 + 1] = position.y
        positions[index * 3 + 2] = position.z
        uvs[index * 2] = (longitude + 180) / 360
        uvs[index * 2 + 1] = (latitude + 90) / 180
      }
    }
    geometry.attributes.position!.needsUpdate = true
    geometry.attributes.uv!.needsUpdate = true
    geometry.computeBoundingSphere()
    glow.scale.setScalar(globeRadius)
    glowMaterial.uniforms.opacity!.value = progress ** 4
    glow.visible = progress > 0.01

    for (const latitudeLine of latitudeLines) {
      latitudeLine.definition.coordinates.forEach((point, index) => { point.lng = center.lng - 180 + index * 360 / 192 })
      latitudeLine.label.point.lng = center.lng + (latitudeLine.label.special ? 38 : -42)
    }
    for (const label of gridLabels) {
      if (!latitudeLines.some(line => line.label === label)) label.point.lat = clamp(center.lat - 42, -64, 64)
    }
    const hasDirectionGuide = directionGuideVisible && points.length === 2 && hasLocalDirectionFrame(points[0]!)
    if (hasDirectionGuide) {
      const origin = points[0]!
      const guideRadius = directionGuideMetrics(Math.min(190, Math.max(110, Math.min(width, height) * 0.23))).radius
      for (const { direction, ray, arrow, label } of directionRays) {
        const at = (distance: number, sideways = 0) => globeDirectionGuideCoordinate(origin, direction.bearing,
          direction.dx * distance - direction.dy * sideways,
          -direction.dy * distance - direction.dx * sideways,
          flatZoom, guideRadius, globeRadius, progress)
        ray.coordinates.forEach((point, index) => Object.assign(point, at(24 + (guideRadius - 33) * index / 24)))
        Object.assign(arrow.coordinates[0]!, at(guideRadius - 10, 4.5))
        Object.assign(arrow.coordinates[1]!, at(guideRadius))
        Object.assign(arrow.coordinates[2]!, at(guideRadius - 10, -4.5))
        Object.assign(label.point, at(guideRadius + 16))
      }
    }
    for (const definition of geographicLines) {
      definition.line.visible = definition.direction ? hasDirectionGuide : !definition.graticule || graticuleVisible
      if (!definition.line.visible) continue
      const thickLine = definition.line instanceof LineSegments2 ? definition.line : null
      const attribute = definition.line.geometry.getAttribute('position') as THREE.BufferAttribute
      const starts = thickLine?.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute | undefined
      const ends = thickLine?.geometry.getAttribute('instanceEnd') as THREE.InterleavedBufferAttribute | undefined
      const distanceStarts = thickLine?.geometry.getAttribute('instanceDistanceStart') as THREE.InterleavedBufferAttribute | undefined
      const distanceEnds = thickLine?.geometry.getAttribute('instanceDistanceEnd') as THREE.InterleavedBufferAttribute | undefined
      let count = 0
      let distance = 0
      for (let index = 1; index < definition.coordinates.length; index += 1) {
        const start = definition.coordinates[index - 1]!
        const end = definition.coordinates[index]!
        // The cut is behind the globe. Do not draw a spurious cross-map segment
        // while its two edges are still unfolding into the Mercator plane.
        if (progress < 0.98 && Math.abs(longitudeDifference(start.lng, center.lng) - longitudeDifference(end.lng, center.lng)) > 180) continue
        const a = project(start, 0.9, definition.direction)
        const b = project(end, 0.9, definition.direction)
        if (thickLine) {
          starts!.setXYZ(count, a.x, a.y, a.z)
          ends!.setXYZ(count, b.x, b.y, b.z)
          distanceStarts!.setX(count, distance)
          distance += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
          distanceEnds!.setX(count++, distance)
        } else {
          attribute.setXYZ(count++, a.x, a.y, a.z)
          attribute.setXYZ(count++, b.x, b.y, b.z)
        }
      }
      if (thickLine) {
        starts!.data.needsUpdate = true
        distanceStarts!.data.needsUpdate = true
        thickLine.geometry.instanceCount = count
      } else {
        attribute.needsUpdate = true
        definition.line.geometry.setDrawRange(0, count)
        if (definition.line.material instanceof THREE.LineDashedMaterial) definition.line.computeLineDistances()
      }
    }
    geometryDirty = false
  }

  function updateLabels() {
    const occupied: { left: number; right: number; top: number; bottom: number }[] = []
    const labels = [...pointLabels, ...directionLabels, ...gridLabels.slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))]
    for (const label of labels) {
      const point = project(label.point, 1.5, label.direction)
      const x = width / 2 + point.x
      const y = height / 2 - point.y
      const enabled = label.marker || (label.direction ? directionGuideVisible && points.length === 2 && hasLocalDirectionFrame(points[0]!) : graticuleVisible)
      const visible = enabled && (progress < 0.68 || point.facing > 0.08)
        && x > 24 && x < width - 24 && y > 24 && y < height - 24
      label.element.style.display = visible ? (label.marker ? 'flex' : 'block') : 'none'
      if (!visible) continue
      const labelWidth = label.marker ? 30 : label.element.offsetWidth
      const labelHeight = label.marker ? 30 : label.element.offsetHeight
      const box = { left: x - labelWidth / 2 - 5, right: x + labelWidth / 2 + 5, top: y - labelHeight / 2 - 4, bottom: y + labelHeight / 2 + 4 }
      if (!label.marker && !label.direction && occupied.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) {
        label.element.style.display = 'none'
        continue
      }
      occupied.push(box)
      label.element.style.left = `${x}px`
      label.element.style.top = `${y}px`
    }
  }

  function applyResize() {
    const nextWidth = Math.max(1, host.clientWidth)
    const nextHeight = Math.max(1, host.clientHeight)
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth
      height = nextHeight
      renderer.setSize(width, height, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()
      geometryDirty = true
    }
    needsResize = false
  }

  function draw() {
    if (disposed) return
    if (needsResize) applyResize()
    if (geometryDirty) updateGeometry()
    updateLabels()
    renderer.render(scene, camera)
  }

  function requestRender() {
    if (!active || disposed || frame) return
    frame = requestAnimationFrame(tick)
  }

  function tick() {
    frame = 0
    if (!active || disposed) return
    if (progress >= 0.999 && Math.abs(targetZoom - zoom) > 0.0001) {
      zoom += (targetZoom - zoom) * 0.22
      if (Math.abs(targetZoom - zoom) < 0.002) zoom = targetZoom
      geometryDirty = true
      callbacks.onZoom(zoom)
    }
    draw()
    if (centerNotification) {
      centerNotification = false
      callbacks.onCenterChange({ ...center })
    }
    if (progress >= 0.999 && Math.abs(targetZoom - zoom) > 0.0001) requestRender()
  }

  const pointers = new Map<number, { x: number; y: number }>()
  let pointerDown: { x: number; y: number } | null = null
  let moved = false
  let pinching = false
  let pinchDistance = 1
  let pinchZoom = GLOBE_ENTRY_ZOOM
  const canInteract = () => active && progress >= 0.999 && !disposed

  function pointerDistance() {
    const pair = [...pointers.values()]
    return pair.length >= 2 ? Math.hypot(pair[0]!.x - pair[1]!.x, pair[0]!.y - pair[1]!.y) : 1
  }

  function onPointerDown(event: PointerEvent) {
    if (!canInteract() || event.button > 0) return
    canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 1) {
      pointerDown = { x: event.clientX, y: event.clientY }
      moved = false
      pinching = false
      canvas.style.cursor = 'grabbing'
    } else {
      pinching = true
      moved = true
      pinchDistance = Math.max(1, pointerDistance())
      pinchZoom = zoom
    }
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent) {
    const previous = pointers.get(event.pointerId)
    if (!previous || !canInteract()) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size >= 2) {
      targetZoom = clamp(pinchZoom + Math.log2(Math.max(1, pointerDistance()) / pinchDistance), MIN_ZOOM, MAX_ZOOM)
      requestRender()
    } else {
      const dx = event.clientX - previous.x
      const dy = event.clientY - previous.y
      if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 5) moved = true
      if (moved) {
        const longitudeScale = Math.max(0.28, Math.cos(center.lat * RAD))
        center.lng = wrapLongitude(center.lng - dx / Math.max(radius * longitudeScale, 70) / RAD)
        center.lat = clamp(center.lat + dy / Math.max(radius, 80) / RAD, -80, 80)
        geometryDirty = true
        centerNotification = true
        requestRender()
      }
    }
    event.preventDefault()
  }

  function pick(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect()
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2), camera)
    earth.updateMatrixWorld(true)
    const intersection = raycaster.intersectObject(earth, false)[0]
    if (!intersection?.uv) return
    callbacks.onPick({ lat: clamp(intersection.uv.y * 180 - 90, -90, 90), lng: wrapLongitude(intersection.uv.x * 360 - 180) })
  }

  function onPointerUp(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    const shouldPick = canInteract() && !moved && !pinching && event.type === 'pointerup'
    pointers.delete(event.pointerId)
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    if (pointers.size === 0) {
      canvas.style.cursor = 'grab'
      pointerDown = null
    }
    if (shouldPick) pick(event.clientX, event.clientY)
  }

  function onWheel(event: WheelEvent) {
    if (!canInteract()) return
    event.preventDefault()
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1)
    targetZoom = clamp(targetZoom - clamp(pixels, -180, 180) / 500, MIN_ZOOM, MAX_ZOOM)
    requestRender()
  }

  function onContextLost(event: Event) {
    event.preventDefault()
    active = false
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    callbacks.onError('三维显示暂时中断，已返回二维地图。')
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('webglcontextlost', onContextLost)
  const resizeObserver = new ResizeObserver(() => { needsResize = true; requestRender() })
  resizeObserver.observe(host)

  function removeRoute() {
    if (!route) return
    scene.remove(route.line)
    route.line.geometry.dispose()
    route.line.material.dispose()
    geographicLines.splice(geographicLines.indexOf(route), 1)
    route = null
  }

  draw()

  return {
    setView(nextCenter, nextZoom) {
      if (disposed) return
      center = { lat: clamp(nextCenter.lat, -MERCATOR_LIMIT, MERCATOR_LIMIT), lng: wrapLongitude(nextCenter.lng) }
      zoom = targetZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
      geometryDirty = true
      requestRender()
    },
    setTransition(nextProgress, nextFlatZoom) {
      if (disposed) return
      progress = clamp(nextProgress, 0, 1)
      if (nextFlatZoom !== undefined) flatZoom = nextFlatZoom
      geometryDirty = true
      // This synchronous render keeps the exact 0/1 handoff frame aligned with
      // the parent opacity animation, including reduced-motion transitions.
      draw()
    },
    setActive(nextActive) {
      if (disposed) return
      active = nextActive
      if (!active) {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        for (const id of pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id)
        pointers.clear()
        pointerDown = null
        canvas.style.cursor = 'grab'
        targetZoom = zoom
      } else {
        needsResize = true
        requestRender()
      }
    },
    setGraticule(visible) {
      if (disposed) return
      graticuleVisible = visible
      geometryDirty = true
      requestRender()
    },
    setDirectionGuide(visible) {
      if (disposed) return
      directionGuideVisible = visible
      geometryDirty = true
      requestRender()
    },
    setPoints(nextPoints) {
      if (disposed) return
      points = nextPoints.slice(0, 2).map(point => ({ ...point }))
      pointLabels.splice(0).forEach(label => label.element.remove())
      removeRoute()
      const path = points.length === 2 ? mapReferencePath(points[0]!, points[1]!) : []
      const markerPoints = path.length ? [path[0]!, path[path.length - 1]!] : points
      markerPoints.forEach((point, index) => pointLabels.push({ point, marker: true, element: newLabel(index === 0 ? 'A' : 'B', index === 0 ? '#168b95' : '#be762a', false, true) }))
      if (path.length) route = newRoute(path)
      geometryDirty = true
      requestRender()
    },
    zoomBy(delta) {
      if (!canInteract()) return
      targetZoom = clamp(targetZoom + delta, MIN_ZOOM, MAX_ZOOM)
      requestRender()
    },
    getCenter: () => ({ ...center }),
    getZoom: () => zoom,
    resize() {
      if (disposed) return
      needsResize = true
      requestRender()
    },
    dispose() {
      if (disposed) return
      disposed = true
      active = false
      if (frame) cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      pointers.clear()
      geographicLines.forEach(definition => { definition.line.geometry.dispose(); definition.line.material.dispose() })
      geometry.dispose()
      material.dispose()
      texture.dispose()
      glowGeometry.dispose()
      glowMaterial.dispose()
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      labelsHost.remove()
    },
  }
}
