import * as THREE from 'three'

/** Pacific-facing teaching map, with an Atlantic seam to keep Africa intact. */
export const WORLD_WIDTH = 72
export const WORLD_DEPTH = 36
export const WORLD_LON_START = -30
export const WORLD_LON_END = 330
export const SEA_Y = 0
const LONGITUDE_SPAN = WORLD_LON_END - WORLD_LON_START
const LONGITUDE_CENTER = (WORLD_LON_START + WORLD_LON_END) / 2

type Coordinate = [number, number]
type Polygon = Coordinate[][]
interface GeoFeature {
  geometry?: { type: string; coordinates: unknown }
}
interface Countries { features?: GeoFeature[] }
interface Elevation {
  width: number; height: number; minLon: number; maxLon: number
  minLat: number; maxLat: number; values: number[]
}
interface PreparedPolygon { rings: Polygon; bounds: [number, number, number, number] }
export interface WorldTerrain {
  group: THREE.Group
  isLand: (lon: number, lat: number) => boolean
  dispose: () => void
}

const LAND_Y = 0.14
const SMALL_ISLAND_Y = SEA_Y + 0.045
const RELIEF_CLEARANCE = 0.03
const GRID_STEP = 1
const LAND_TEXTURE_FILE = 'Material.001_diffuse.jpg?x-oss-process=image/resize,w_4096/quality,q_88'
const LAND_TEXTURE_PATH = `/geo-resources-folder/images/${LAND_TEXTURE_FILE}`
const LAND_TEXTURE_REMOTE = `/geo-resources-folder/images/${LAND_TEXTURE_FILE}`
const normalizeLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180
const pauseForPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

function setGeographicUv(geometry: THREE.BufferGeometry): void {
  const positions = geometry.getAttribute('position')
  const uv = new Float32Array(positions.count * 2)
  for (let index = 0; index < positions.count; index++) {
    // The source image runs 180°W → 180°E. Keep U continuous over that
    // texture seam and let RepeatWrapping align the -30° → 330° board.
    const longitude = WORLD_LON_START + (positions.getX(index) / WORLD_WIDTH + .5) * LONGITUDE_SPAN
    uv[index * 2] = (longitude + 180) / 360
    uv[index * 2 + 1] = 0.5 - positions.getZ(index) / WORLD_DEPTH
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

export function geoToWorld(lon: number, lat: number): THREE.Vector3 {
  const wrappedLon = ((lon - WORLD_LON_START) % LONGITUDE_SPAN + LONGITUDE_SPAN) % LONGITUDE_SPAN + WORLD_LON_START
  return new THREE.Vector3((wrappedLon - LONGITUDE_CENTER) / LONGITUDE_SPAN * WORLD_WIDTH, SEA_Y, -lat / 180 * WORLD_DEPTH)
}

export function worldToGeo(x: number, z: number): { lon: number; lat: number } {
  return { lon: normalizeLongitude(WORLD_LON_START + (x / WORLD_WIDTH + .5) * LONGITUDE_SPAN), lat: THREE.MathUtils.clamp(-z / WORLD_DEPTH * 180, -90, 90) }
}

function prepareCountries(countries: Countries): PreparedPolygon[] {
  const result: PreparedPolygon[] = []
  for (const feature of countries.features ?? []) {
    const geometry = feature.geometry
    if (!geometry) continue
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as Polygon]
      : geometry.type === 'MultiPolygon' ? geometry.coordinates as Polygon[] : []
    for (const rings of polygons) {
      if (!rings[0] || rings[0].length < 3) continue
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
      for (const point of rings[0]) {
        minLon = Math.min(minLon, point[0]); maxLon = Math.max(maxLon, point[0])
        minLat = Math.min(minLat, point[1]); maxLat = Math.max(maxLat, point[1])
      }
      result.push({ rings, bounds: [minLon, minLat, maxLon, maxLat] })
    }
  }
  return result
}

function pointInRing(lon: number, lat: number, ring: Coordinate[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!
    if ((a[1] > lat) !== (b[1] > lat) && lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

function createLandMask(polygons: PreparedPolygon[]): (lon: number, lat: number) => boolean {
  // Ten-degree buckets avoid testing every country's detailed outline for every vertex.
  const buckets = new Map<string, PreparedPolygon[]>()
  for (const polygon of polygons) {
    const [west, south, east, north] = polygon.bounds
    for (let bx = Math.floor((west + 180) / 10); bx <= Math.min(35, Math.floor((east + 180) / 10)); bx++) {
      for (let by = Math.floor((south + 90) / 10); by <= Math.min(17, Math.floor((north + 90) / 10)); by++) {
        const key = `${bx}:${by}`
        const bucket = buckets.get(key) ?? []
        bucket.push(polygon); buckets.set(key, bucket)
      }
    }
  }
  return (longitude, latitude) => {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false
    const lon = normalizeLongitude(longitude)
    const lat = THREE.MathUtils.clamp(latitude, -89.9999, 89.9999)
    const key = `${Math.floor((lon + 180) / 10)}:${Math.floor((lat + 90) / 10)}`
    return (buckets.get(key) ?? []).some(({ rings, bounds }) => {
      if (lon < bounds[0] || lon > bounds[2] || lat < bounds[1] || lat > bounds[3]) return false
      if (!pointInRing(lon, lat, rings[0]!)) return false
      return !rings.slice(1).some((hole) => pointInRing(lon, lat, hole))
    })
  }
}

function createElevationSampler(grid: Elevation): (lon: number, lat: number) => number {
  if (!grid || grid.width < 2 || grid.height < 2 || grid.values.length !== grid.width * grid.height) throw new Error('世界高程数据格式不完整')
  return (longitude, latitude) => {
    // The source has no Antarctic DEM. Do not extrapolate the last data row to the poles.
    if (latitude < grid.minLat || latitude > grid.maxLat) return 0
    const lon = normalizeLongitude(longitude)
    const gx = THREE.MathUtils.clamp((lon - grid.minLon) / (grid.maxLon - grid.minLon) * (grid.width - 1), 0, grid.width - 1)
    const gy = THREE.MathUtils.clamp((grid.maxLat - latitude) / (grid.maxLat - grid.minLat) * (grid.height - 1), 0, grid.height - 1)
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const x1 = Math.min(grid.width - 1, x0 + 1), y1 = Math.min(grid.height - 1, y0 + 1)
    const sample = (x: number, y: number) => Math.max(0, Number(grid.values[y * grid.width + x]) || 0)
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(sample(x0, y0), sample(x1, y0), gx - x0),
      THREE.MathUtils.lerp(sample(x0, y1), sample(x1, y1), gx - x0), gy - y0,
    )
  }
}

function polygonArea(polygon: PreparedPolygon): number {
  const ring = polygon.rings[0]!
  let doubleArea = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!, b = ring[(i + 1) % ring.length]!
    doubleArea += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(doubleArea) / 2
}

function isUnsampledSmallIsland(polygon: PreparedPolygon, grid: Elevation, isLand: (lon: number, lat: number) => boolean, isMainland: (lon: number, lat: number) => boolean): boolean {
  const [west, south, east, north] = polygon.bounds
  if (south < grid.minLat || north > grid.maxLat || east - west > 8 || north - south > 8 || polygonArea(polygon) > 12) return false
  const ring = polygon.rings[0]!
  const within = (lon: number, lat: number) => pointInRing(lon, lat, ring)
    && !polygon.rings.slice(1).some((hole) => pointInRing(lon, lat, hole))
  const lonStep = (grid.maxLon - grid.minLon) / (grid.width - 1)
  const latStep = (grid.maxLat - grid.minLat) / (grid.height - 1)
  // Only real source-grid samples support a raised island surface. Interpolated
  // values from a nearby mainland must not invent a mountain on a smaller island.
  for (let row = Math.max(0, Math.ceil((grid.maxLat - north) / latStep)); row <= Math.min(grid.height - 1, Math.floor((grid.maxLat - south) / latStep)); row++) {
    for (let column = Math.max(0, Math.ceil((west - grid.minLon) / lonStep)); column <= Math.min(grid.width - 1, Math.floor((east - grid.minLon) / lonStep)); column++) {
      if ((grid.values[row * grid.width + column] ?? 0) > 0 && within(grid.minLon + column * lonStep, grid.maxLat - row * latStep)) return false
    }
  }
  // Country polygons also contain political borders. Leave mainland enclaves
  // and small coastal countries at the main terrain level; lower ocean islands.
  let coastal = 0, tested = 0
  const stride = Math.max(1, Math.floor(ring.length / 24))
  const epsilon = Math.max(.005, Math.min(.07, (east - west) / 6, (north - south) / 6))
  for (let i = 0; i < ring.length; i += stride) {
    const a = ring[i]!, b = ring[(i + 1) % ring.length]!
    const lon = (a[0] + b[0]) / 2, lat = (a[1] + b[1]) / 2
    // A small peninsula country can have mostly coastline but still adjoin a
    // continental polygon. Keep that shared land surface at its original level.
    if (isMainland(lon - .003, lat) || isMainland(lon + .003, lat) || isMainland(lon, lat - .003) || isMainland(lon, lat + .003)) return false
    if (!isLand(lon - epsilon, lat) || !isLand(lon + epsilon, lat) || !isLand(lon, lat - epsilon) || !isLand(lon, lat + epsilon)) coastal++
    tested++
  }
  return tested > 0 && coastal / tested >= .7
}

function landColor(meters: number, latitude: number): THREE.Color {
  if (latitude < -60) return new THREE.Color('#d9e4e1')
  const stops: [number, string][] = [[0, '#92a48a'], [450, '#6f896b'], [1200, '#839274'], [2300, '#aa9c7f'], [3800, '#8c8172'], [5200, '#d1cfc4'], [7000, '#edf0eb']]
  for (let index = 1; index < stops.length; index++) {
    const from = stops[index - 1]!, to = stops[index]!
    if (meters <= to[0]) return new THREE.Color(from[1]).lerp(new THREE.Color(to[1]), THREE.MathUtils.smoothstep(meters, from[0], to[0]))
  }
  return new THREE.Color(stops[stops.length - 1]![1])
}

/** Clip before wrapping, so a coastline triangle never spans opposite map edges. */
function clipAtMapSeam(polygon: Coordinate[], eastOfSeam: boolean): Coordinate[] {
  const output: Coordinate[] = []
  const within = (point: Coordinate) => eastOfSeam ? point[0] >= WORLD_LON_START : point[0] <= WORLD_LON_START
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!
    const aInside = within(a), bInside = within(b)
    if (aInside) output.push(a)
    if (aInside !== bInside) {
      const t = (WORLD_LON_START - a[0]) / (b[0] - a[0])
      output.push([WORLD_LON_START, a[1] + (b[1] - a[1]) * t])
    }
  }
  return output
}

export async function createWorldTerrain(countries: Countries, elevation: Elevation): Promise<WorldTerrain> {
  const polygons = prepareCountries(countries)
  if (!polygons.length) throw new Error('世界大陆轮廓数据为空')
  const isLand = createLandMask(polygons)
  const sampleElevation = createElevationSampler(elevation)
  const mainland = createLandMask(polygons.filter((polygon) => polygon.bounds[2] - polygon.bounds[0] > 8 || polygon.bounds[3] - polygon.bounds[1] > 8 || polygonArea(polygon) > 12))
  const smallIslands = new Set(polygons.filter((polygon) => isUnsampledSmallIsland(polygon, elevation, isLand, mainland)))
  const isFlatIsland = createLandMask([...smallIslands])
  const group = new THREE.Group()
  group.name = 'real-world-land-terrain'
  group.userData.source = 'Natural Earth 1:110m + Open-Elevation 2° land samples'
  group.userData.longitudeExtent = [WORLD_LON_START, WORLD_LON_END]
  group.userData.heightNote = '陆地高程垂直夸张；南极仅显示轮廓及平坦冰面；不含海底地形'
  group.userData.flatIslandCount = smallIslands.size
  group.userData.smallIslandNote = '未有有效高程采样的小岛贴近海面显示真实轮廓，不补造山高'
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const rememberGeometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.push(value); return value }
  const rememberMaterial = <T extends THREE.Material>(value: T): T => { materials.push(value); return value }
  const landMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide }))
  const coastMaterial = rememberMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }))

  // Exact Natural Earth silhouettes under the relief preserve islands smaller than the DEM grid.
  const floorPositions: number[] = [], floorColors: number[] = []
  const skirtPositions: number[] = [], skirtColors: number[] = []
  // Do not use geoToWorld here: seam vertices belong to opposite board edges
  // depending on which clipped polygon they close.
  const projectedX = (longitude: number, eastOfSeam: boolean) =>
    (longitude + (eastOfSeam ? 0 : LONGITUDE_SPAN) - LONGITUDE_CENTER) / LONGITUDE_SPAN * WORLD_WIDTH
  const pushFloor = (vertices: Coordinate[], eastOfSeam: boolean, surfaceY: number) => {
    for (let i = 1; i < vertices.length - 1; i++) {
      for (const [lon, lat] of [vertices[0]!, vertices[i]!, vertices[i + 1]!]) {
        const x = projectedX(lon, eastOfSeam)
        const color = landColor(0, lat)
        floorPositions.push(x, surfaceY, -lat / 5)
        floorColors.push(color.r, color.g, color.b)
      }
    }
  }
  const addWall = (a: Coordinate, b: Coordinate, eastOfSeam: boolean, surfaceY: number) => {
    const ax = projectedX(a[0], eastOfSeam), az = -a[1] / 5
    const bx = projectedX(b[0], eastOfSeam), bz = -b[1] / 5
    // The southern polar edge (and any clipped map edge) meets the ocean box.
    // Keep the top attached to the cap, but tuck the submerged edge inside the
    // box so two faces never share its x=±36 / z=±18 exterior plane.
    const insetBoundary = (value: number, halfExtent: number) => Math.abs(value) >= halfExtent - .00001 ? Math.sign(value) * (halfExtent - .025) : value
    const bottomAx = insetBoundary(ax, WORLD_WIDTH / 2), bottomAz = insetBoundary(az, WORLD_DEPTH / 2)
    const bottomBx = insetBoundary(bx, WORLD_WIDTH / 2), bottomBz = insetBoundary(bz, WORLD_DEPTH / 2)
    const color = landColor(0, (a[1] + b[1]) / 2).multiplyScalar(0.75)
    skirtPositions.push(ax, surfaceY, az, bx, surfaceY, bz, bottomAx, -0.24, bottomAz, bx, surfaceY, bz, bottomBx, -0.24, bottomBz, bottomAx, -0.24, bottomAz)
    for (let vertex = 0; vertex < 6; vertex++) skirtColors.push(color.r, color.g, color.b)
  }
  for (let polygonIndex = 0; polygonIndex < polygons.length; polygonIndex++) {
    const polygon = polygons[polygonIndex]!
    const surfaceY = smallIslands.has(polygon) ? SMALL_ISLAND_Y : LAND_Y
    const rings = polygon.rings.map((ring) => {
      const clean = ring.slice()
      if (clean.length > 1 && clean[0]![0] === clean[clean.length - 1]![0] && clean[0]![1] === clean[clean.length - 1]![1]) clean.pop()
      return clean
    })
    const contour = rings[0]!.map(([lon, lat]) => new THREE.Vector2(lon, lat))
    const holes = rings.slice(1).map((ring) => ring.map(([lon, lat]) => new THREE.Vector2(lon, lat)))
    const vertices = rings.flat()
    const faces = THREE.ShapeUtils.triangulateShape(contour, holes)
    for (const face of faces) {
      const triangle = face.map((index) => vertices[index]!)
      pushFloor(clipAtMapSeam(triangle, true), true, surfaceY)
      pushFloor(clipAtMapSeam(triangle, false), false, surfaceY)
    }
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!, b = ring[(i + 1) % ring.length]!
        if (Math.abs(a[0] - b[0]) > 180 && a[1] > -85 && b[1] > -85) continue
        if ((a[0] < WORLD_LON_START) !== (b[0] < WORLD_LON_START)) {
          const t = (WORLD_LON_START - a[0]) / (b[0] - a[0])
          const crossing: Coordinate = [WORLD_LON_START, a[1] + (b[1] - a[1]) * t]
          addWall(a, crossing, a[0] >= WORLD_LON_START, surfaceY); addWall(crossing, b, b[0] >= WORLD_LON_START, surfaceY)
        } else addWall(a, b, (a[0] + b[0]) / 2 >= WORLD_LON_START, surfaceY)
      }
    }
    if (polygonIndex % 40 === 0) await pauseForPaint()
  }
  const meshFromArrays = (positions: number[], colors: number[], name: string, material: THREE.Material = landMaterial) => {
    const geometry = rememberGeometry(new THREE.BufferGeometry())
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    setGeographicUv(geometry)
    geometry.computeVertexNormals(); geometry.computeBoundingSphere()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name; mesh.receiveShadow = true; mesh.castShadow = true
    group.add(mesh)
    return mesh
  }
  meshFromArrays(floorPositions, floorColors, 'precise-land-silhouette')
  // Satellite coastal pixels often contain blue sea. They belong on the map's
  // horizontal face, not stretched down the island sides as bright blue walls.
  meshFromArrays(skirtPositions, skirtColors, 'land-sea-sealed-sides', coastMaterial)

  const columns = LONGITUDE_SPAN / GRID_STEP, rows = 180 / GRID_STEP, stride = columns + 1
  const positions = new Float32Array(stride * (rows + 1) * 3)
  const colors = new Float32Array(positions.length)
  const mask = new Uint8Array(stride * (rows + 1))
  const indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const lat = 90 - row * GRID_STEP
    for (let column = 0; column <= columns; column++) {
      const lon = normalizeLongitude(WORLD_LON_START + column * GRID_STEP)
      const index = row * stride + column
      const land = isLand(lon, lat) && !isFlatIsland(lon, lat)
      mask[index] = land ? 1 : 0
      const meters = land ? sampleElevation(lon, lat) : 0
      const color = landColor(meters, lat)
      positions[index * 3] = (column / columns - .5) * WORLD_WIDTH
      positions[index * 3 + 1] = LAND_Y + RELIEF_CLEARANCE + meters / 3400
      positions[index * 3 + 2] = -lat / 5
      colors.set([color.r, color.g, color.b], index * 3)
    }
    if (row % 18 === 0) await pauseForPaint()
  }
  // At the coastal boundary relief tapers into the exact polygon floor, sealing mask edges.
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) {
      const i = row * stride + column
      if (!mask[i]) continue
      const neighbors = [column > 0 ? i - 1 : i, column < columns ? i + 1 : i, row > 0 ? i - stride : i, row < rows ? i + stride : i]
      if (neighbors.some((neighbor) => !mask[neighbor])) positions[i * 3 + 1] = LAND_Y + RELIEF_CLEARANCE
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1
      if (mask[a] && mask[b] && mask[c]) indices.push(a, c, b)
      if (mask[b] && mask[c] && mask[d]) indices.push(b, c, d)
    }
  }
  const reliefGeometry = rememberGeometry(new THREE.BufferGeometry())
  reliefGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  reliefGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  setGeographicUv(reliefGeometry)
  reliefGeometry.setIndex(indices)
  reliefGeometry.computeVertexNormals(); reliefGeometry.computeBoundingSphere()
  const relief = new THREE.Mesh(reliefGeometry, landMaterial)
  relief.name = 'sampled-world-elevation'; relief.castShadow = true; relief.receiveShadow = true
  group.add(relief)
  let disposed = false
  const textures = new Set<THREE.Texture>()
  const textureLoader = new THREE.TextureLoader()
  group.userData.textureStatus = 'loading'
  const loadLandTexture = (url: string, allowRemoteRetry: boolean): void => {
    const pending = textureLoader.load(url, (texture) => {
      if (disposed) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = 8
      texture.needsUpdate = true
      landMaterial.map = texture
      // Preserve the existing DEM colours for failure fallback, but do not tint
      // the real geographic image green/brown a second time.
      landMaterial.vertexColors = false
      landMaterial.needsUpdate = true
      group.userData.textureStatus = 'ready'
      group.userData.surfaceTexture = '现有地球昼面纹理 Material.002_diffuse.jpg（包含原图云层）'
    }, undefined, (error) => {
      textures.delete(pending)
      pending.dispose()
      if (disposed) return
      if (allowRemoteRetry) { loadLandTexture(LAND_TEXTURE_REMOTE, false); return }
      landMaterial.map = null
      landMaterial.vertexColors = true
      landMaterial.needsUpdate = true
      group.userData.textureStatus = 'fallback'
      console.warn('海—气场景地球昼面纹理加载失败，已使用原始高程分层配色。', error)
    })
    textures.add(pending)
  }
  loadLandTexture(LAND_TEXTURE_PATH, true)
  return {
    group, isLand,
    dispose() {
      if (disposed) return
      disposed = true
      group.removeFromParent(); group.clear()
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      textures.forEach((texture) => texture.dispose())
      textures.clear()
    },
  }
}
