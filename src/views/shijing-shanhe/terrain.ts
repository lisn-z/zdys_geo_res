import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { Poem } from './data'

type Ring = Array<[number, number]>
type PreparedPolygon = { rings: Ring[]; bounds: [number, number, number, number] }
type PreparedProvince = { name: string; polygons: PreparedPolygon[] }
type ChinaGeoJSON = {
  features: Array<{
    properties: { name: string }
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
  }>
}
type DemData = {
  width: number; height: number; minX: number; maxX: number; minY: number; maxY: number; values: number[]
}
type WaterGeoJSON = {
  features: Array<{
    geometry: { type: 'MultiLineString'; coordinates: number[][][] }
  }>
}

export type TerrainController = {
  reset: () => void
  focusPoem: (poemId: string) => void
  dispose: () => void
}

const MAP_SCALE = 0.245
const GRID_X = 384
const GRID_Y = 232
const WATER_URL = '/geo-resources-folder/geojson/中国矢量数据/中国主要水系分布.geojson'

const projectCoordinate = ([longitude, latitude]: number[]): [number, number] => [
  (longitude - 104) * MAP_SCALE,
  (latitude - 35) * MAP_SCALE,
]

async function fetchJsonWithProgress<T>(url: string, onProgress: (ratio: number) => void): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`数据请求失败：${response.status}`)
  if (!response.body) {
    onProgress(1)
    return response.json() as Promise<T>
  }

  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let received = 0
  let jsonText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    jsonText += decoder.decode(value, { stream: true })
    const ratio = total
      ? Math.min(0.98, received / total)
      : Math.min(0.94, received / (received + 900_000))
    onProgress(ratio)
  }
  jsonText += decoder.decode()
  onProgress(1)
  return JSON.parse(jsonText) as T
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

function prepareChinaMap(geojson: ChinaGeoJSON): PreparedProvince[] {
  return geojson.features.map((feature) => {
    const source = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : feature.geometry.coordinates as number[][][][]
    const polygons = source
      .filter((polygon) => polygon[0]?.some((point) => point[1] >= 15))
      .map((polygon) => {
        const rings = polygon.map((ring) => ring.map(projectCoordinate))
        const xs = rings[0].map(([x]) => x)
        const ys = rings[0].map(([, y]) => y)
        return {
          rings,
          bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as [number, number, number, number],
        }
      })
    return { name: feature.properties.name, polygons }
  })
}

function pointInRing(x: number, y: number, ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function pointInChina(x: number, y: number, provinces: PreparedProvince[]) {
  for (const province of provinces) {
    for (const polygon of province.polygons) {
      const [minX, minY, maxX, maxY] = polygon.bounds
      if (x < minX || x > maxX || y < minY || y > maxY) continue
      if (!pointInRing(x, y, polygon.rings[0])) continue
      if (polygon.rings.slice(1).some((hole) => pointInRing(x, y, hole))) continue
      return true
    }
  }
  return false
}

function createElevationSampler(dem: DemData) {
  return (x: number, y: number) => {
    const gx = THREE.MathUtils.clamp((x - dem.minX) / (dem.maxX - dem.minX) * (dem.width - 1), 0, dem.width - 1)
    const gy = THREE.MathUtils.clamp((y - dem.minY) / (dem.maxY - dem.minY) * (dem.height - 1), 0, dem.height - 1)
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const x1 = Math.min(dem.width - 1, x0 + 1), y1 = Math.min(dem.height - 1, y0 + 1)
    const at = (px: number, py: number) => dem.values[py * dem.width + px]
    const low = THREE.MathUtils.lerp(at(x0, y0), at(x1, y0), gx - x0)
    const high = THREE.MathUtils.lerp(at(x0, y1), at(x1, y1), gx - x0)
    return THREE.MathUtils.lerp(low, high, gy - y0)
  }
}

const terrainHeight = (meters: number) => 0.02 + Math.max(0, meters) / 7500

function terrainColor(meters: number) {
  if (meters < 80) return new THREE.Color('#c4b995')
  if (meters < 200) return new THREE.Color('#b3ad86')
  if (meters < 350) return new THREE.Color('#a3a77f')
  if (meters < 600) return new THREE.Color('#91a07b')
  if (meters < 900) return new THREE.Color('#7f9578')
  if (meters < 1300) return new THREE.Color('#6c8872')
  if (meters < 1800) return new THREE.Color('#5b7b6b')
  if (meters < 2400) return new THREE.Color('#4c6e65')
  if (meters < 3000) return new THREE.Color('#3f625f')
  if (meters < 3600) return new THREE.Color('#365761')
  if (meters < 4300) return new THREE.Color('#3f5665')
  if (meters < 5000) return new THREE.Color('#626a6d')
  if (meters < 5700) return new THREE.Color('#8b8a7e')
  // The nationwide DEM is intentionally coarse and its sampled maximum is about 6720 m.
  // Calibrate the visual snow cap to the sampled range so high peaks remain visible.
  const sampledSnowProgress = THREE.MathUtils.clamp((meters - 5700) / 1000, 0, 1)
  const snowRatio = Math.pow(sampledSnowProgress, 0.6)
  return new THREE.Color('#8b8a7e').lerp(new THREE.Color('#fffefa'), snowRatio)
}

async function createTerrainGeometry(
  provinces: PreparedProvince[],
  sampleElevation: (x: number, y: number) => number,
  onProgress: (ratio: number) => void,
) {
  const positions: number[] = []
  const colors: number[] = []
  const minX = -7.8, maxX = 7.85, minY = -4.25, maxY = 4.75
  const dx = (maxX - minX) / GRID_X, dy = (maxY - minY) / GRID_Y

  const pushTriangle = (a: [number, number], b: [number, number], c: [number, number]) => {
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3
    if (!pointInChina(cx, cy, provinces)) return
    for (const [x, y] of [a, b, c]) {
      const meters = sampleElevation(x, y)
      const color = terrainColor(meters)
      positions.push(x, y, terrainHeight(meters))
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let iy = 0; iy < GRID_Y; iy++) {
    for (let ix = 0; ix < GRID_X; ix++) {
      const x = minX + ix * dx, y = minY + iy * dy
      const a: [number, number] = [x, y]
      const b: [number, number] = [x + dx, y]
      const c: [number, number] = [x, y + dy]
      const d: [number, number] = [x + dx, y + dy]
      pushTriangle(a, b, d)
      pushTriangle(a, d, c)
    }
    if (iy % 12 === 0 || iy === GRID_Y - 1) {
      onProgress((iy + 1) / GRID_Y)
      await nextPaint()
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function createWaterLayer(
  geojson: WaterGeoJSON,
  provinces: PreparedProvince[],
  sampleElevation: (x: number, y: number) => number,
) {
  const positions: number[] = []
  for (const feature of geojson.features) {
    if (feature.geometry.type !== 'MultiLineString') continue
    for (const line of feature.geometry.coordinates) {
      for (let index = 1; index < line.length; index++) {
        const first = line[index - 1]
        const second = line[index]
        const middleLongitude = (first[0] + second[0]) / 2
        const middleLatitude = (first[1] + second[1]) / 2
        if (middleLongitude < 72 || middleLongitude > 136 || middleLatitude < 17 || middleLatitude > 55) continue
        const [middleX, middleY] = projectCoordinate([middleLongitude, middleLatitude])
        if (!pointInChina(middleX, middleY, provinces)) continue
        const [x1, y1] = projectCoordinate(first)
        const [x2, y2] = projectCoordinate(second)
        positions.push(
          x1, y1, terrainHeight(sampleElevation(x1, y1)) + 0.018,
          x2, y2, terrainHeight(sampleElevation(x2, y2)) + 0.018,
        )
      }
    }
  }
  const glowGeometry = new LineSegmentsGeometry()
  glowGeometry.setPositions(positions)
  const glowMaterial = new LineMaterial({
    color: '#dbe8df', linewidth: 3.2, transparent: true, opacity: 0.3, depthWrite: false,
  })
  const glow = new LineSegments2(glowGeometry, glowMaterial)
  glow.computeLineDistances()

  const riverGeometry = new LineSegmentsGeometry()
  riverGeometry.setPositions(positions)
  const riverMaterial = new LineMaterial({
    color: '#4e9693', linewidth: 1.35, transparent: true, opacity: 0.96, depthWrite: false,
  })
  const river = new LineSegments2(riverGeometry, riverMaterial)
  river.computeLineDistances()

  const group = new THREE.Group()
  group.add(glow, river)
  return { group, riverMaterial, materials: [glowMaterial, riverMaterial], geometries: [glowGeometry, riverGeometry] }
}

export async function mountTerrain(
  mount: HTMLElement,
  poems: Poem[],
  getLabels: () => ReadonlyMap<string, HTMLButtonElement>,
  onProgress: (value: number) => void = () => undefined,
): Promise<TerrainController> {
  const download = { map: 0, dem: 0, water: 0 }
  const reportDownload = (key: keyof typeof download, ratio: number) => {
    download[key] = ratio
    onProgress(Math.round((download.map * 0.13 + download.dem * 0.22 + download.water * 0.65) * 78))
  }
  onProgress(2)
  const [mapGeoJSON, demData, waterGeoJSON] = await Promise.all([
    fetchJsonWithProgress<ChinaGeoJSON>('/geo-resources-folder/geojson/中国矢量数据/china-provinces.geojson', (ratio) => reportDownload('map', ratio)),
    fetchJsonWithProgress<DemData>('/geo-resources-folder/geojson/中国矢量数据/china-dem.json', (ratio) => reportDownload('dem', ratio)),
    fetchJsonWithProgress<WaterGeoJSON>(WATER_URL, (ratio) => reportDownload('water', ratio)),
  ])
  onProgress(81)
  await nextPaint()
  const provinces = prepareChinaMap(mapGeoJSON)
  const sampleElevation = createElevationSampler(demData)
  onProgress(84)
  await nextPaint()

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#e8e2d3', 0.027)

  const initialViewport = mount.getBoundingClientRect()
  let viewportWidth = Math.max(2, initialViewport.width)
  let viewportHeight = Math.max(2, initialViewport.height)
  let renderPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  const baseFieldOfView = 36
  const designAspect = 16 / 9
  const camera = new THREE.PerspectiveCamera(baseFieldOfView, viewportWidth / viewportHeight, 0.1, 100)
  camera.up.set(0, 0, 1)
  const homePosition = new THREE.Vector3(0, -21, 5.8)
  const homeTarget = new THREE.Vector3(0, 0, 0.55)
  camera.position.copy(homePosition)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(renderPixelRatio)
  renderer.setSize(Math.round(viewportWidth), Math.round(viewportHeight), false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  mount.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.055
  controls.enablePan = true
  controls.screenSpacePanning = true
  controls.zoomToCursor = true
  controls.minDistance = 0
  controls.maxDistance = Infinity
  controls.minPolarAngle = 0
  controls.maxPolarAngle = Math.PI * 0.495
  controls.target.copy(homeTarget)

  const terrainGroup = new THREE.Group()
  terrainGroup.rotation.z = -0.025
  scene.add(terrainGroup)

  const terrainGeometry = await createTerrainGeometry(
    provinces,
    sampleElevation,
    (ratio) => onProgress(Math.round(84 + ratio * 10)),
  )
  onProgress(94)
  await nextPaint()
  const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0.01, flatShading: true,
  }))
  terrain.castShadow = true
  terrain.receiveShadow = true
  terrainGroup.add(terrain)

  // Derive the opening composition from the actual China terrain rather than
  // fixed screen coordinates. This keeps the map centered across OS scaling,
  // browser zoom levels and different initial viewport sizes.
  terrainGeometry.computeBoundingBox()
  const terrainBounds = terrainGeometry.boundingBox
  if (terrainBounds) {
    const localCenter = new THREE.Vector3()
    const terrainSize = new THREE.Vector3()
    terrainBounds.getCenter(localCenter)
    terrainBounds.getSize(terrainSize)
    localCenter.z = THREE.MathUtils.clamp(terrainBounds.min.z + terrainSize.z * 0.22, 0.35, 0.9)
    terrainGroup.updateMatrixWorld(true)
    homeTarget.copy(localCenter).applyMatrix4(terrainGroup.matrixWorld)
    const homeDistance = Math.max(20, terrainSize.x * 1.35, terrainSize.y * 2.2)
    const viewDirection = new THREE.Vector3(0, -1, 0.25).normalize()
    homePosition.copy(homeTarget).addScaledVector(viewDirection, homeDistance)
    camera.position.copy(homePosition)
    controls.target.copy(homeTarget)
    controls.update()
  }

  const contourGeometry = terrainGeometry.clone()
  const contour = new THREE.Mesh(contourGeometry, new THREE.MeshBasicMaterial({
    color: '#d8c99e', wireframe: true, transparent: true, opacity: 0.04,
  }))
  contour.position.z = 0.012
  terrainGroup.add(contour)
  const waterLayer = createWaterLayer(waterGeoJSON, provinces, sampleElevation)
  onProgress(96)
  await nextPaint()
  waterLayer.materials.forEach((material) => material.resolution.set(viewportWidth * renderPixelRatio, viewportHeight * renderPixelRatio))
  terrainGroup.add(waterLayer.group)

  scene.add(new THREE.HemisphereLight('#fff9e8', '#1e3d3b', 2.15))
  const sun = new THREE.DirectionalLight('#fff1c5', 3.2)
  sun.position.set(-6, -4, 15)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -11; sun.shadow.camera.right = 11
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10
  scene.add(sun)
  const rim = new THREE.DirectionalLight('#7ba9a1', 1.1)
  rim.position.set(8, 8, 4)
  scene.add(rim)

  const dustPositions = new Float32Array(90 * 3)
  for (let i = 0; i < 90; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 23
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 15
    dustPositions[i * 3 + 2] = 1.5 + Math.random() * 6
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dustMaterial = new THREE.PointsMaterial({ color: '#a58b58', size: 0.035, transparent: true, opacity: 0.22 })
  const dust = new THREE.Points(dustGeometry, dustMaterial)
  scene.add(dust)

  const poemVectors = new Map(poems.map((poem) => {
    const [x, y] = projectCoordinate([poem.longitude, poem.latitude])
    return [poem.id, new THREE.Vector3(x, y, terrainHeight(sampleElevation(x, y)) + 0.27)] as const
  }))
  let renderWidth = viewportWidth
  let renderHeight = viewportHeight

  const updateResponsiveProjection = (width: number, height: number) => {
    const aspect = width / height
    const baseFovRadians = THREE.MathUtils.degToRad(baseFieldOfView)
    // A narrow viewport needs a wider vertical field of view to keep China's
    // east-west extent in frame. Wide viewports retain the original composition.
    const fittedFov = aspect < designAspect
      ? 2 * Math.atan(Math.tan(baseFovRadians / 2) * (designAspect / aspect))
      : baseFovRadians
    camera.aspect = aspect
    camera.fov = THREE.MathUtils.radToDeg(fittedFov)
    camera.updateProjectionMatrix()
  }

  updateResponsiveProjection(viewportWidth, viewportHeight)

  const syncViewport = () => {
    const mountRect = mount.getBoundingClientRect()
    const nextWidth = Math.max(2, mountRect.width)
    const nextHeight = Math.max(2, mountRect.height)
    const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    const sizeChanged = Math.abs(nextWidth - renderWidth) > 0.01 || Math.abs(nextHeight - renderHeight) > 0.01
    const pixelRatioChanged = Math.abs(nextPixelRatio - renderPixelRatio) > 0.001

    if (sizeChanged || pixelRatioChanged) {
      viewportWidth = nextWidth
      viewportHeight = nextHeight
      renderWidth = nextWidth
      renderHeight = nextHeight
      renderPixelRatio = nextPixelRatio
      updateResponsiveProjection(nextWidth, nextHeight)
      renderer.setPixelRatio(nextPixelRatio)
      renderer.setSize(Math.round(nextWidth), Math.round(nextHeight), false)
      waterLayer.materials.forEach((material) => material.resolution.set(nextWidth * nextPixelRatio, nextHeight * nextPixelRatio))
    }

    const canvasRect = renderer.domElement.getBoundingClientRect()
    const labels = getLabels()
    const firstLabel = labels.values().next().value as HTMLButtonElement | undefined
    const labelLayer = firstLabel?.parentElement
    const labelRect = labelLayer?.getBoundingClientRect() ?? canvasRect
    return { canvasRect, labelRect, labels }
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let frame = 0
  let flight: {
    startedAt: number
    fromPosition: THREE.Vector3
    fromTarget: THREE.Vector3
    toPosition: THREE.Vector3
    toTarget: THREE.Vector3
  } | null = null
  let lastLabelUpdate = -Infinity
  const projectedPosition = new THREE.Vector3()
  controls.addEventListener('start', () => { flight = null })
  const render = (time = 0) => {
    const { canvasRect, labelRect, labels } = syncViewport()
    if (flight) {
      const progress = Math.min(1, (time - flight.startedAt) / 1450)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2
      camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, eased)
      if (progress >= 1) flight = null
    }
    controls.update()
    if (!reduceMotion) dust.rotation.z += 0.00016
    if (!reduceMotion) waterLayer.riverMaterial.opacity = 0.9 + Math.sin(time * 0.0011) * 0.06
    scene.updateMatrixWorld()
    if (time - lastLabelUpdate >= 30) {
      labels.forEach((label, poemId) => {
        const position = poemVectors.get(poemId)
        if (!position) return
        projectedPosition.copy(position).applyMatrix4(terrainGroup.matrixWorld).project(camera)
        const x = canvasRect.left - labelRect.left + (projectedPosition.x * 0.5 + 0.5) * canvasRect.width
        const y = canvasRect.top - labelRect.top + (-projectedPosition.y * 0.5 + 0.5) * canvasRect.height
        label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`
        label.style.setProperty('--depth', `${Math.max(0.35, 1 - projectedPosition.z * 0.18)}`)
        label.dataset.inView = projectedPosition.z > -1 && projectedPosition.z < 1
          && projectedPosition.x > -1.04 && projectedPosition.x < 1.04
          && projectedPosition.y > -1.04 && projectedPosition.y < 1.04 ? 'true' : 'false'
      })
      lastLabelUpdate = time
    }
    renderer.render(scene, camera)
    frame = requestAnimationFrame(render)
  }
  render()
  onProgress(100)

  return {
    reset: () => {
      flight = null
      camera.position.copy(homePosition)
      controls.target.copy(homeTarget)
      controls.update()
    },
    focusPoem: (poemId: string) => {
      const poemPosition = poemVectors.get(poemId)
      if (!poemPosition) return
      terrainGroup.updateMatrixWorld(true)
      const destinationTarget = poemPosition.clone().applyMatrix4(terrainGroup.matrixWorld)
      destinationTarget.z = Math.max(0.18, destinationTarget.z - 0.2)
      const direction = camera.position.clone().sub(controls.target).normalize()
      const destinationPosition = destinationTarget.clone().add(direction.multiplyScalar(6.4))
      destinationPosition.z = Math.max(destinationPosition.z, destinationTarget.z + 1.9)
      flight = {
        startedAt: performance.now(),
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPosition: destinationPosition,
        toTarget: destinationTarget,
      }
    },
    dispose: () => {
      cancelAnimationFrame(frame)
      controls.dispose()
      renderer.dispose()
      terrainGeometry.dispose()
      contourGeometry.dispose()
      waterLayer.geometries.forEach((geometry) => geometry.dispose())
      waterLayer.materials.forEach((material) => material.dispose())
      dustGeometry.dispose()
      dustMaterial.dispose()
      mount.replaceChildren()
    },
  }
}
