import * as THREE from 'three'

export type LonLat = [number, number]
export type GeoGeometry = { type: string; coordinates: unknown }
export type GeoFeature = { type?: 'Feature'; id?: string | number; properties?: Record<string, unknown> | null; geometry: GeoGeometry | null }
export type GeoCollection = { type: 'FeatureCollection'; features: GeoFeature[] }
export const GLOBE_RADIUS = 3.2
const DEG = Math.PI / 180
const MAX_EDGE = 5

// Robinson spherical forward coefficients, at 5-degree intervals, from PROJ.
// https://github.com/OSGeo/PROJ/blob/master/src/projections/robin.cpp
// PROJ's MIT license / attribution is preserved in /geo-resources-folder/images/continental-drift/sources/ROBINSON-PROJECTION.md.
type RobinsonCoefficients = readonly [number, number, number, number]
const ROBINSON_X: readonly RobinsonCoefficients[] = [
  [1, 2.2199e-17, -7.15515e-5, 3.1103e-6],
  [.9986, -.000482243, -2.4897e-5, -1.3309e-6],
  [.9954, -.00083103, -4.48605e-5, -9.86701e-7],
  [.99, -.00135364, -5.9661e-5, 3.6777e-6],
  [.9822, -.00167442, -4.49547e-6, -5.72411e-6],
  [.973, -.00214868, -9.03571e-5, 1.8736e-8],
  [.96, -.00305085, -9.00761e-5, 1.64917e-6],
  [.9427, -.00382792, -6.53386e-5, -2.6154e-6],
  [.9216, -.00467746, -.00010457, 4.81243e-6],
  [.8962, -.00536223, -3.23831e-5, -5.43432e-6],
  [.8679, -.00609363, -.000113898, 3.32484e-6],
  [.835, -.00698325, -6.40253e-5, 9.34959e-7],
  [.7986, -.00755338, -5.00009e-5, 9.35324e-7],
  [.7597, -.00798324, -3.5971e-5, -2.27626e-6],
  [.7186, -.00851367, -7.01149e-5, -8.6303e-6],
  [.6732, -.00986209, -.000199569, 1.91974e-5],
  [.6213, -.010418, 8.83923e-5, 6.24051e-6],
  [.5722, -.00906601, .000182, 6.24051e-6],
  [.5322, -.00677797, .000275608, 6.24051e-6],
]
const ROBINSON_Y: readonly RobinsonCoefficients[] = [
  [-5.20417e-18, .0124, 1.21431e-18, -8.45284e-11],
  [.062, .0124, -1.26793e-9, 4.22642e-10],
  [.124, .0124, 5.07171e-9, -1.60604e-9],
  [.186, .0123999, -1.90189e-8, 6.00152e-9],
  [.248, .0124002, 7.10039e-8, -2.24e-8],
  [.31, .0123992, -2.64997e-7, 8.35986e-8],
  [.372, .0124029, 9.88983e-7, -3.11994e-7],
  [.434, .0123893, -3.69093e-6, -4.35621e-7],
  [.4958, .0123198, -1.02252e-5, -3.45523e-7],
  [.5571, .0121916, -1.54081e-5, -5.82288e-7],
  [.6176, .0119938, -2.41424e-5, -5.25327e-7],
  [.6769, .011713, -3.20223e-5, -5.16405e-7],
  [.7346, .0113541, -3.97684e-5, -6.09052e-7],
  [.7903, .0109107, -4.89042e-5, -1.04739e-6],
  [.8435, .0103431, -6.4615e-5, -1.40374e-9],
  [.8936, .00969686, -6.4636e-5, -8.547e-6],
  [.9394, .00840947, -.000192841, -4.2106e-6],
  [.9761, .00616527, -.000256, -4.2106e-6],
  [1, .00328947, -.000319159, -4.2106e-6],
]
const ROBINSON_FX = .8487
const ROBINSON_FY = 1.3523
export const ROBINSON_MAP_HALF_WIDTH = ROBINSON_FX * Math.PI * GLOBE_RADIUS
export const ROBINSON_MAP_HALF_HEIGHT = ROBINSON_FY * GLOBE_RADIUS

function coefficientAt(coefficients: RobinsonCoefficients, offset: number): number {
  return coefficients[0] + offset * (coefficients[1] + offset * (coefficients[2] + offset * coefficients[3]))
}

/** Longitude is already relative/clipped. In particular, +180 must stay on the right edge. */
function projectRobinson(lon: number, lat: number, lift: number, target: THREE.Vector3): THREE.Vector3 {
  const latitude = THREE.MathUtils.clamp(lat, -90, 90)
  const absoluteLatitude = Math.abs(latitude)
  const interval = Math.min(18, Math.floor(absoluteLatitude / 5 + 1e-12))
  const offset = absoluteLatitude - interval * 5
  const xScale = coefficientAt(ROBINSON_X[interval]!, offset)
  const yScale = absoluteLatitude === 0 ? 0 : coefficientAt(ROBINSON_Y[interval]!, offset)
  return target.set(lon * DEG * GLOBE_RADIUS * ROBINSON_FX * xScale,
    Math.sign(latitude) * GLOBE_RADIUS * ROBINSON_FY * yScale, lift)
}

/** Same longitude convention as earth-motion and making-a-globe. */
export function geographicPoint(lon: number, lat: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = lat * DEG
  const lambda = lon * DEG
  return new THREE.Vector3(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).multiplyScalar(radius)
}

export function vectorLonLat(point: THREE.Vector3): LonLat {
  const length = point.length()
  const longitude = ((Math.atan2(-point.z, point.x) / DEG + 540) % 360) - 180
  return [longitude, Math.asin(THREE.MathUtils.clamp(point.y / (length || 1), -1, 1)) / DEG]
}

export function relativeLongitude(lon: number, centralMeridian = 0): number {
  return ((lon - centralMeridian + 180) % 360 + 360) % 360 - 180
}

export function mapPoint(lon: number, lat: number, lift = 0, centralMeridian = 0): THREE.Vector3 {
  return projectRobinson(centralMeridian ? relativeLongitude(lon, centralMeridian) : lon, lat, lift, new THREE.Vector3())
}

/** Fixed source triangles; rigid plate rotation and Robinson projection run every GPU frame. */
export function createPaleoGpuMap(unitTriangles: Float32Array, sourceUv: Float32Array,
  sourceMaterial: THREE.MeshBasicMaterial, lift = .022, rotationEnvelopeRadians = Math.PI) {
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(unitTriangles, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(sourceUv, 2))
  const anchorA = new Float32Array(unitTriangles.length)
  const anchorB = new Float32Array(unitTriangles.length)
  const corner = new Float32Array(unitTriangles.length / 3)
  for (let at = 0; at < unitTriangles.length; at += 9) {
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const output = at + vertex * 3
      for (let axis = 0; axis < 3; axis += 1) {
        anchorA[output + axis] = unitTriangles[at + axis]!
        anchorB[output + axis] = unitTriangles[at + 3 + axis]!
      }
      corner[output / 3] = vertex
    }
  }
  geometry.setAttribute('paleoAnchorA', new THREE.BufferAttribute(anchorA, 3))
  geometry.setAttribute('paleoAnchorB', new THREE.BufferAttribute(anchorB, 3))
  geometry.setAttribute('paleoCorner', new THREE.BufferAttribute(corner, 1))
  geometry.setAttribute('paleoLongitudeCopy', new THREE.InstancedBufferAttribute(new Float32Array([0]), 1))
  geometry.instanceCount = 1
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, lift), Math.hypot(ROBINSON_MAP_HALF_WIDTH, ROBINSON_MAP_HALF_HEIGHT))
  const seamGeometry = new THREE.InstancedBufferGeometry()
  for (const [name, attribute] of Object.entries(geometry.attributes)) seamGeometry.setAttribute(name, attribute)
  seamGeometry.setAttribute('paleoLongitudeCopy', new THREE.InstancedBufferAttribute(new Float32Array([-360, 0, 360]), 1))
  seamGeometry.instanceCount = 3
  seamGeometry.boundingSphere = geometry.boundingSphere.clone()
  let envelope = Math.max(0, Math.min(Math.PI, rotationEnvelopeRadians))
  function assignSeamCandidates(): void {
    const interior: number[] = [], seam: number[] = []
    // Source triangles have <=5° lon/lat edges, hence <8° spherical diameter.
    // The extra angular band also covers a seam crossing between their vertices.
    const band = Math.sin(Math.min(Math.PI / 2, envelope + 8 * DEG))
    for (let at = 0; at < unitTriangles.length; at += 9) {
      let nearSeam = envelope >= Math.PI / 2
      for (let vertex = 0; vertex < 3 && !nearSeam; vertex += 1) {
        const p = at + vertex * 3
        nearSeam = unitTriangles[p]! <= band && Math.abs(unitTriangles[p + 2]!) <= band
      }
      const indices = nearSeam ? seam : interior
      indices.push(at / 3, at / 3 + 1, at / 3 + 2)
    }
    geometry.setIndex(interior); seamGeometry.setIndex(seam)
  }
  assignSeamCandidates()
  const material = sourceMaterial.clone()
  const quaternion = new THREE.Quaternion()
  const qUniform = { value: new THREE.Vector4(0, 0, 0, 1) }
  const baseCompile = sourceMaterial.onBeforeCompile
  const baseKey = sourceMaterial.customProgramCacheKey()
  material.customProgramCacheKey = () => `${baseKey}:paleo-robinson-gpu-v1`
  material.onBeforeCompile = (shader, renderer) => {
    baseCompile.call(material, shader, renderer)
    shader.uniforms.paleoQuaternion = qUniform
    shader.uniforms.paleoRobinsonX = { value: ROBINSON_X.map(row => new THREE.Vector4(...row)) }
    shader.uniforms.paleoRobinsonY = { value: ROBINSON_Y.map(row => new THREE.Vector4(...row)) }
    shader.vertexShader = `
uniform vec4 paleoQuaternion;
uniform vec4 paleoRobinsonX[19];
uniform vec4 paleoRobinsonY[19];
attribute vec3 paleoAnchorA;
attribute vec3 paleoAnchorB;
attribute float paleoCorner;
attribute float paleoLongitudeCopy;
varying float vPaleoLongitude;
vec3 paleoRotate(vec3 p) {
  return p + 2.0 * cross(paleoQuaternion.xyz, cross(paleoQuaternion.xyz, p) + paleoQuaternion.w * p);
}
float paleoLongitude(vec3 p) { return degrees(atan(-p.z, p.x)); }
float paleoUnwrap(float lon, float reference) { return reference + mod(lon - reference + 180.0, 360.0) - 180.0; }
float paleoCubic(vec4 c, float d) { return c.x + d * (c.y + d * (c.z + d * c.w)); }
` + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
vec3 paleoPoint = normalize(paleoRotate(position));
float paleoFirst = paleoCorner < 0.5 ? paleoLongitude(paleoPoint) : paleoLongitude(paleoRotate(paleoAnchorA));
float paleoSecond = paleoCorner > 1.5 ? paleoUnwrap(paleoLongitude(paleoRotate(paleoAnchorB)), paleoFirst) : paleoFirst;
float paleoLon = paleoCorner < 0.5 ? paleoFirst : paleoUnwrap(paleoLongitude(paleoPoint), paleoCorner < 1.5 ? paleoFirst : paleoSecond);
paleoLon += paleoLongitudeCopy;
float paleoLat = degrees(asin(clamp(paleoPoint.y, -1.0, 1.0)));
float paleoAbsLat = abs(paleoLat);
int paleoSection = min(18, int(floor(paleoAbsLat / 5.0)));
float paleoOffset = paleoAbsLat - float(paleoSection) * 5.0;
float paleoX = paleoCubic(paleoRobinsonX[paleoSection], paleoOffset);
float paleoY = paleoCubic(paleoRobinsonY[paleoSection], paleoOffset);
vec3 transformed = vec3(radians(paleoLon) * ${GLOBE_RADIUS * ROBINSON_FX} * paleoX,
  sign(paleoLat) * ${GLOBE_RADIUS * ROBINSON_FY} * paleoY, ${lift});
vPaleoLongitude = paleoLon;
`)
    shader.fragmentShader = 'varying float vPaleoLongitude;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif (abs(vPaleoLongitude) > 180.0) discard;')
  }
  const mesh = new THREE.Mesh(geometry, material)
  const seamMesh = new THREE.Mesh(seamGeometry, material)
  mesh.add(seamMesh)
  mesh.renderOrder = seamMesh.renderOrder = 2
  mesh.frustumCulled = false
  seamMesh.frustumCulled = false
  mesh.onBeforeRender = seamMesh.onBeforeRender = () => {
    if (material.map !== sourceMaterial.map) { material.map = sourceMaterial.map; material.needsUpdate = true }
    material.color.copy(sourceMaterial.color)
    material.opacity = sourceMaterial.opacity
    material.visible = sourceMaterial.visible
  }
  // Raycast the inverse-projected point against the unchanged source sphere.
  // This preserves map clicks despite the visible positions living only on the GPU.
  const sourceGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(unitTriangles, 3))
  sourceGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.001)
  const pickMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const sourceMesh = new THREE.Mesh(sourceGeometry, pickMaterial)
  const inverseMatrix = new THREE.Matrix4()
  const localRay = new THREE.Ray()
  const localPoint = new THREE.Vector3()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -lift)
  const sourceRaycaster = new THREE.Raycaster()
  const inverseRotation = new THREE.Quaternion()
  const hits: THREE.Intersection[] = []
  mesh.raycast = (raycaster, intersections) => {
    inverseMatrix.copy(mesh.matrixWorld).invert()
    localRay.copy(raycaster.ray).applyMatrix4(inverseMatrix)
    if (!localRay.intersectPlane(plane, localPoint) || Math.abs(localPoint.y) > ROBINSON_MAP_HALF_HEIGHT) return
    let lower = -90, upper = 90
    for (let step = 0; step < 28; step += 1) {
      const middle = (lower + upper) / 2
      if (mapPoint(0, middle).y < localPoint.y) lower = middle; else upper = middle
    }
    const latitude = (lower + upper) / 2
    const longitude = localPoint.x / mapPoint(180, latitude).x * 180
    if (Math.abs(longitude) > 180) return
    sourceRaycaster.ray.origin.set(0, 0, 0)
    sourceRaycaster.ray.direction.copy(geographicPoint(longitude, latitude, 1)).applyQuaternion(inverseRotation.copy(quaternion).invert())
    sourceRaycaster.near = 0; sourceRaycaster.far = 1.1
    hits.length = 0
    sourceMesh.raycast(sourceRaycaster, hits)
    if (!hits.length) return
    const point = localPoint.clone().applyMatrix4(mesh.matrixWorld)
    const distance = raycaster.ray.origin.distanceTo(point)
    if (distance >= raycaster.near && distance <= raycaster.far) intersections.push({ distance, point, object: mesh, uv: hits[0]!.uv })
  }
  seamMesh.raycast = () => {}
  return {
    mesh, material,
    get stats() { return { sourceTriangles: unitTriangles.length / 9,
      interiorTriangles: (geometry.index?.count ?? 0) / 3, seamTriangles: (seamGeometry.index?.count ?? 0) / 3,
      rotationEnvelopeRadians: envelope } },
    reserveRotationEnvelope(radians: number): void {
      if (!Number.isFinite(radians)) return
      const requested = Math.max(0, Math.min(Math.PI, radians))
      if (requested <= envelope + 1e-7) return
      envelope = requested
      assignSeamCandidates()
    },
    setQuaternion(value: THREE.Quaternion): void {
      quaternion.copy(value).normalize()
      const angle = 2 * Math.acos(Math.min(1, Math.abs(quaternion.w)))
      if (angle > envelope + 1e-7) { envelope = Math.min(Math.PI, angle + DEG); assignSeamCandidates() }
      qUniform.value.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    },
    dispose(): void { geometry.dispose(); seamGeometry.dispose(); material.dispose(); sourceGeometry.dispose(); pickMaterial.dispose() },
  }
}

/** Curved ocean surface. Its UVs retain geographic longitude/latitude, not projected x/y. */
export function createRobinsonMapGeometry(lift = 0, widthSegments = 180, heightSegments = 90): THREE.BufferGeometry {
  const columns = Math.max(4, Math.floor(widthSegments))
  const rows = Math.max(4, Math.floor(heightSegments))
  const positions: number[] = []
  const uv: number[] = []
  const indices: number[] = []
  const point = new THREE.Vector3()
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      projectRobinson(u * 360 - 180, v * 180 - 90, lift, point)
      positions.push(point.x, point.y, point.z)
      uv.push(u, v)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column
        const b = a + 1
        const c = a + columns + 1
        const d = c + 1
        indices.push(a, b, d, a, d, c)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    .setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/** Continuous outer edge, without a repeated first point. Render with THREE.LineLoop. */
export function createRobinsonOutlineGeometry(lift = .01, latitudeSegments = 180): THREE.BufferGeometry {
  const segments = Math.max(18, Math.floor(latitudeSegments))
  const points: THREE.Vector3[] = []
  for (let step = 0; step <= segments; step += 1) points.push(mapPoint(180, -90 + step / segments * 180, lift))
  for (let step = segments; step >= 0; step -= 1) points.push(mapPoint(-180, -90 + step / segments * 180, lift))
  return new THREE.BufferGeometry().setFromPoints(points)
}

function validPoint(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])
}

export function geographicLines(geometry: GeoGeometry | null): LonLat[][] {
  if (!geometry) return []
  const coords = geometry.coordinates
  if (!Array.isArray(coords)) return []
  const clean = (ring: unknown): LonLat[] => Array.isArray(ring)
    ? ring.filter(validPoint).map(point => [point[0]!, THREE.MathUtils.clamp(point[1]!, -90, 90)])
    : []
  switch (geometry.type) {
    case 'LineString': return [clean(coords)]
    case 'MultiLineString': return coords.map(clean)
    case 'Polygon': return coords.map(clean)
    case 'MultiPolygon': return coords.flatMap(polygon => Array.isArray(polygon) ? polygon.map(clean) : [])
    default: return []
  }
}

/** Unwrap adjacent edges before clipping. Polar loops are closed along the pole. */
export function unwrapRing(input: LonLat[]): LonLat[] {
  if (input.length < 3) return []
  const result: LonLat[] = []
  for (const coordinate of input) {
    let lon = coordinate[0]
    const previous = result[result.length - 1]
    if (previous) {
      while (lon - previous[0] > 180) lon -= 360
      while (lon - previous[0] < -180) lon += 360
    }
    if (!previous || Math.abs(lon - previous[0]) + Math.abs(coordinate[1] - previous[1]) > 1e-8) result.push([lon, coordinate[1]])
  }
  const first = result[0]
  const last = result[result.length - 1]
  if (!first || !last) return []
  if (Math.abs(first[0] - last[0]) > 180 && Math.abs(first[1] - last[1]) < 5) {
    const pole = result.reduce((total, point) => total + point[1], 0) < 0 ? -90 : 90
    result.push([last[0], pole], [first[0], pole])
  } else if (Math.abs(first[0] - last[0]) + Math.abs(first[1] - last[1]) < 1e-8) result.pop()
  return result
}

function clipEdge(points: LonLat[], boundary: number, keepGreater: boolean): LonLat[] {
  const output: LonLat[] = []
  if (points.length < 3) return output
  let previous = points[points.length - 1]!
  let previousInside = keepGreater ? previous[0] >= boundary : previous[0] <= boundary
  for (const point of points) {
    const inside = keepGreater ? point[0] >= boundary : point[0] <= boundary
    if (inside !== previousInside) {
      const fraction = (boundary - previous[0]) / (point[0] - previous[0])
      output.push([boundary, previous[1] + (point[1] - previous[1]) * fraction])
    }
    if (inside) output.push(point)
    previous = point
    previousInside = inside
  }
  return output
}

export function clipLongitude(points: LonLat[], minimum: number, maximum: number): LonLat[] {
  return clipEdge(clipEdge(points, minimum, true), maximum, false)
}

function polygonsOf(geometry: GeoGeometry | null): LonLat[][][] {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geographicLines(geometry)]
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(coordinates => geographicLines({ type: 'Polygon', coordinates }))
  }
  return []
}

function pointDistance(a: LonLat, b: LonLat): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
}

/** Longitude/latitude subdivision keeps a large triangle from cutting through the ocean sphere. */
function subdivideTriangle(a: LonLat, b: LonLat, c: LonLat, output: number[], depth = 0): void {
  const ab = pointDistance(a, b)
  const bc = pointDistance(b, c)
  const ca = pointDistance(c, a)
  if (Math.max(ab, bc, ca) <= MAX_EDGE || depth >= 15) {
    for (const point of [a, b, c]) {
      const vector = geographicPoint(point[0], point[1], 1)
      output.push(vector.x, vector.y, vector.z)
    }
    return
  }
  const mid = (p: LonLat, q: LonLat): LonLat => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  if (ab >= bc && ab >= ca) {
    const middle = mid(a, b)
    subdivideTriangle(a, middle, c, output, depth + 1)
    subdivideTriangle(middle, b, c, output, depth + 1)
  } else if (bc >= ca) {
    const middle = mid(b, c)
    subdivideTriangle(a, b, middle, output, depth + 1)
    subdivideTriangle(a, middle, c, output, depth + 1)
  } else {
    const middle = mid(c, a)
    subdivideTriangle(a, b, middle, output, depth + 1)
    subdivideTriangle(middle, b, c, output, depth + 1)
  }
}

export function triangulateGeographic(geometry: GeoGeometry | null): Float32Array {
  const positions: number[] = []
  for (const polygon of polygonsOf(geometry)) {
    const rawOuter = polygon[0]
    if (!rawOuter) continue
    const outer = unwrapRing(rawOuter)
    if (outer.length < 3) continue
    const minimum = Math.min(...outer.map(point => point[0]))
    const maximum = Math.max(...outer.map(point => point[0]))
    const central = (minimum + maximum) / 2
    const holes = polygon.slice(1).map(ring => {
      const unwrapped = unwrapRing(ring)
      const mean = unwrapped.reduce((sum, point) => sum + point[0], 0) / (unwrapped.length || 1)
      const shift = Math.round((central - mean) / 360) * 360
      return unwrapped.map(([lon, lat]): LonLat => [lon + shift, lat])
    })
    for (let strip = Math.floor((minimum + 180) / 360); strip <= Math.floor((maximum + 180) / 360); strip += 1) {
      const left = -180 + strip * 360
      const right = 180 + strip * 360
      const clipped = clipLongitude(outer, left, right)
      if (clipped.length < 3) continue
      const contour = clipped.map(([x, y]) => new THREE.Vector2(x - strip * 360, y))
      const clippedHoles = holes.map(ring => clipLongitude(ring, left, right))
        .filter(ring => ring.length >= 3).map(ring => ring.map(([x, y]) => new THREE.Vector2(x - strip * 360, y)))
      const vertices = [...contour, ...clippedHoles.flat()]
      const triangles = THREE.ShapeUtils.triangulateShape(contour, clippedHoles)
      for (const indices of triangles) {
        const a = vertices[indices[0]!]
        const b = vertices[indices[1]!]
        const c = vertices[indices[2]!]
        if (a && b && c) subdivideTriangle([a.x, a.y], [b.x, b.y], [c.x, c.y], positions)
      }
    }
  }
  return new Float32Array(positions)
}

export type ProjectedMapData = {
  mapPositions: Float32Array
  mapUv: Float32Array
  mapVertexCount: number
}

/** Transferable initial buffers, prepared with the same lift and central meridian. */
export type ProjectedSurfaceInitial = ProjectedMapData & {
  globePositions: Float32Array
  sourceUv: Float32Array
}

export function createSurfaceSourceUv(unitTriangles: Float32Array): Float32Array {
  const result = new Float32Array(unitTriangles.length / 3 * 2)
  const vector = new THREE.Vector3()
  for (let index = 0; index < unitTriangles.length; index += 9) {
    const uv: number[] = []
    for (let corner = 0; corner < 3; corner += 1) {
      const [lon, lat] = vectorLonLat(vector.fromArray(unitTriangles, index + corner * 3))
      uv.push((lon + 180) / 360, (lat + 90) / 180)
    }
    if (Math.max(uv[0]!, uv[2]!, uv[4]!) - Math.min(uv[0]!, uv[2]!, uv[4]!) > .5) {
      for (const at of [0, 2, 4]) if (uv[at]! < .5) uv[at]! += 1
    }
    result.set(uv, index / 3 * 2)
  }
  return result
}

/** Worker-only scratch buffers. No WebGL objects, source mutation or per-frame globe work. */
export class ProjectedMapProjector {
  readonly mapPositions: Float32Array
  readonly mapUv: Float32Array
  mapVertexCount = 0
  private readonly vector = new THREE.Vector3()
  private readonly longitude = new Float64Array(3)
  private readonly latitude = new Float64Array(3)
  constructor(readonly unitTriangles: Float32Array, readonly sourceUv: Float32Array,
    readonly lift = .022, readonly centralMeridian = 0) {
    if (unitTriangles.length % 9 || sourceUv.length !== unitTriangles.length / 3 * 2) throw new RangeError('Invalid projection source')
    this.mapPositions = new Float32Array(unitTriangles.length * 3)
    this.mapUv = new Float32Array(unitTriangles.length * 2)
  }
  update(quaternion: THREE.Quaternion): void {
    let offset = 0
    let uvOffset = 0
    type TexturedPoint = [number, number, number, number]
    const clip = (points: TexturedPoint[], boundary: number, greater: boolean): TexturedPoint[] => {
      const output: TexturedPoint[] = []
      let previous = points[points.length - 1]
      if (!previous) return output
      let previousInside = greater ? previous[0] >= boundary : previous[0] <= boundary
      for (const point of points) {
        const inside = greater ? point[0] >= boundary : point[0] <= boundary
        if (inside !== previousInside) {
          const fraction = (boundary - previous[0]) / (point[0] - previous[0])
          output.push([boundary, previous[1] + (point[1] - previous[1]) * fraction,
            previous[2] + (point[2] - previous[2]) * fraction, previous[3] + (point[3] - previous[3]) * fraction])
        }
        if (inside) output.push(point)
        previous = point; previousInside = inside
      }
      return output
    }
    const append = (lon: number, lat: number, u: number, v: number): void => {
      if (offset + 3 > this.mapPositions.length) throw new RangeError('Map clipping exceeded reserved capacity')
      projectRobinson(lon, lat, this.lift, this.vector)
      this.mapPositions[offset++] = this.vector.x
      this.mapPositions[offset++] = this.vector.y
      this.mapPositions[offset++] = this.vector.z
      this.mapUv[uvOffset++] = u
      this.mapUv[uvOffset++] = v
    }
    for (let index = 0; index < this.unitTriangles.length; index += 9) {
      let minimum = Infinity
      let maximum = -Infinity
      for (let corner = 0; corner < 3; corner += 1) {
        this.vector.fromArray(this.unitTriangles, index + corner * 3).applyQuaternion(quaternion).normalize()
        const lon = ((Math.atan2(-this.vector.z, this.vector.x) / DEG + 540) % 360) - 180
        const relative = relativeLongitude(lon, this.centralMeridian)
        this.longitude[corner] = relative
        this.latitude[corner] = Math.asin(THREE.MathUtils.clamp(this.vector.y / (this.vector.length() || 1), -1, 1)) / DEG
        minimum = Math.min(minimum, relative)
        maximum = Math.max(maximum, relative)
      }
      // Nearly every triangle stays inside one strip. Avoid allocating/clipping it.
      if (maximum - minimum <= 180) {
        for (let corner = 0; corner < 3; corner += 1) {
          const uvAt = index / 3 * 2 + corner * 2
          append(this.longitude[corner]!, this.latitude[corner]!, this.sourceUv[uvAt]!, this.sourceUv[uvAt + 1]!)
        }
        continue
      }
      const triangle: TexturedPoint[] = []
      minimum = Infinity; maximum = -Infinity
      for (let corner = 0; corner < 3; corner += 1) {
        let lon = this.longitude[corner]!
        const previous = triangle[triangle.length - 1]
        if (previous) {
          while (lon - previous[0] > 180) lon -= 360
          while (lon - previous[0] < -180) lon += 360
        }
        const uvAt = index / 3 * 2 + corner * 2
        triangle.push([lon, this.latitude[corner]!, this.sourceUv[uvAt]!, this.sourceUv[uvAt + 1]!])
        minimum = Math.min(minimum, lon); maximum = Math.max(maximum, lon)
      }
      for (let strip = Math.floor((minimum + 180) / 360); strip <= Math.floor((maximum + 180) / 360); strip += 1) {
        const clipped = clip(clip(triangle, -180 + strip * 360, true), 180 + strip * 360, false)
        for (let vertex = 1; vertex < clipped.length - 1; vertex += 1) {
          for (const point of [clipped[0]!, clipped[vertex]!, clipped[vertex + 1]!]) {
            append(point[0] - strip * 360, point[1], point[2], point[3])
          }
        }
      }
    }
    this.mapVertexCount = offset / 3
  }
  compact(): ProjectedMapData {
    return { mapPositions: this.mapPositions.slice(0, this.mapVertexCount * 3),
      mapUv: this.mapUv.slice(0, this.mapVertexCount * 2), mapVertexCount: this.mapVertexCount }
  }
}

/** Reuses both geometries and their GPU buffers when a reconstruction changes age. */
export class ProjectedSurface {
  readonly globe = new THREE.BufferGeometry()
  readonly map = new THREE.BufferGeometry()
  private readonly mapArray: Float32Array
  private readonly globeArray: Float32Array
  private readonly sourceUv: Float32Array
  private readonly mapUv: Float32Array
  private readonly vector = new THREE.Vector3()
  constructor(readonly unitTriangles: Float32Array, readonly lift = 0.018, readonly centralMeridian = 0, initial?: ProjectedSurfaceInitial) {
    if (initial && (initial.globePositions.length !== unitTriangles.length || initial.sourceUv.length !== unitTriangles.length / 3 * 2)) {
      throw new RangeError('Prepared surface buffers do not match triangle count')
    }
    this.globeArray = initial?.globePositions ?? new Float32Array(unitTriangles.length)
    // A dateline-crossing triangle can be clipped into up to three triangles.
    this.mapArray = new Float32Array(unitTriangles.length * 3)
    this.sourceUv = initial?.sourceUv ?? createSurfaceSourceUv(unitTriangles)
    this.mapUv = new Float32Array(unitTriangles.length * 2)
    this.globe.setAttribute('position', new THREE.BufferAttribute(this.globeArray, 3).setUsage(THREE.DynamicDrawUsage))
    this.map.setAttribute('position', new THREE.BufferAttribute(this.mapArray, 3).setUsage(THREE.DynamicDrawUsage))
    this.globe.setAttribute('uv', new THREE.BufferAttribute(this.sourceUv, 2))
    this.map.setAttribute('uv', new THREE.BufferAttribute(this.mapUv, 2).setUsage(THREE.DynamicDrawUsage))
    this.globe.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_RADIUS + Math.abs(lift))
    this.map.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, lift), Math.hypot(ROBINSON_MAP_HALF_WIDTH, ROBINSON_MAP_HALF_HEIGHT))
    this.globe.setDrawRange(0, unitTriangles.length / 3)
    if (initial) this.applyMapProjection(initial)
    else this.update(new THREE.Quaternion())
  }
  /** Copies compact worker output into existing attributes; no main-thread reprojection. */
  applyMapProjection(data: ProjectedMapData): void {
    const count = data.mapVertexCount
    if (!Number.isSafeInteger(count) || count < 0 || count % 3 || count * 3 > this.mapArray.length
      || data.mapPositions.length !== count * 3 || data.mapUv.length !== count * 2) {
      throw new RangeError('Invalid prepared map buffers')
    }
    this.mapArray.set(data.mapPositions)
    this.mapUv.set(data.mapUv)
    for (const [name, length] of [['position', count * 3], ['uv', count * 2]] as const) {
      const attribute = this.map.getAttribute(name) as THREE.BufferAttribute
      attribute.clearUpdateRanges()
      attribute.addUpdateRange(0, length)
      attribute.needsUpdate = true
    }
    this.map.setDrawRange(0, count)
  }
  update(quaternion: THREE.Quaternion, updateGlobe = true): void {
    const radius = GLOBE_RADIUS + this.lift
    let offset = 0
    let uvOffset = 0
    type TexturedPoint = [number, number, number, number]
    const clip = (points: TexturedPoint[], boundary: number, greater: boolean): TexturedPoint[] => {
      const output: TexturedPoint[] = []
      let previous = points[points.length - 1]
      if (!previous) return output
      let previousInside = greater ? previous[0] >= boundary : previous[0] <= boundary
      for (const point of points) {
        const inside = greater ? point[0] >= boundary : point[0] <= boundary
        if (inside !== previousInside) {
          const fraction = (boundary - previous[0]) / (point[0] - previous[0])
          output.push([boundary, previous[1] + (point[1] - previous[1]) * fraction,
            previous[2] + (point[2] - previous[2]) * fraction, previous[3] + (point[3] - previous[3]) * fraction])
        }
        if (inside) output.push(point)
        previous = point; previousInside = inside
      }
      return output
    }
    for (let index = 0; index < this.unitTriangles.length; index += 9) {
      const triangle: TexturedPoint[] = []
      for (let corner = 0; corner < 3; corner += 1) {
        const at = index + corner * 3
        this.vector.fromArray(this.unitTriangles, at).applyQuaternion(quaternion).normalize()
        if (updateGlobe) {
          this.globeArray[at] = this.vector.x * radius
          this.globeArray[at + 1] = this.vector.y * radius
          this.globeArray[at + 2] = this.vector.z * radius
        }
        const coordinate = vectorLonLat(this.vector)
        coordinate[0] = relativeLongitude(coordinate[0], this.centralMeridian)
        const previous = triangle[triangle.length - 1]
        if (previous) {
          while (coordinate[0] - previous[0] > 180) coordinate[0] -= 360
          while (coordinate[0] - previous[0] < -180) coordinate[0] += 360
        }
        triangle.push([coordinate[0], coordinate[1], this.sourceUv[at / 3 * 2]!, this.sourceUv[at / 3 * 2 + 1]!])
      }
      const minimum = Math.min(...triangle.map(point => point[0]))
      const maximum = Math.max(...triangle.map(point => point[0]))
      for (let strip = Math.floor((minimum + 180) / 360); strip <= Math.floor((maximum + 180) / 360); strip += 1) {
        const clipped = clip(clip(triangle, -180 + strip * 360, true), 180 + strip * 360, false)
        for (let vertex = 1; vertex < clipped.length - 1; vertex += 1) {
          for (const coordinate of [clipped[0]!, clipped[vertex]!, clipped[vertex + 1]!]) {
            if (offset + 3 > this.mapArray.length) continue
            projectRobinson(coordinate[0] - strip * 360, coordinate[1], this.lift, this.vector)
            this.mapArray[offset++] = this.vector.x
            this.mapArray[offset++] = this.vector.y
            this.mapArray[offset++] = this.vector.z
            this.mapUv[uvOffset++] = coordinate[2]
            this.mapUv[uvOffset++] = coordinate[3]
          }
        }
      }
    }
    if (updateGlobe) this.globe.getAttribute('position').needsUpdate = true
    for (const [name, length] of [['position', offset], ['uv', uvOffset]] as const) {
      const attribute = this.map.getAttribute(name) as THREE.BufferAttribute
      attribute.clearUpdateRanges(); attribute.addUpdateRange(0, length); attribute.needsUpdate = true
    }
    this.globe.setDrawRange(0, this.unitTriangles.length / 3)
    this.map.setDrawRange(0, offset / 3)
    // Bounds are constant for every rigid rotation; avoid scanning unused capacity.
  }
  dispose(): void { this.globe.dispose(); this.map.dispose() }
}

export function projectLines(lines: LonLat[][], lift = 0.04, centralMeridian = 0): { globe: THREE.BufferGeometry; map: THREE.BufferGeometry } {
  const globe: number[] = []
  const map: number[] = []
  const projected = new THREE.Vector3()
  const appendMap = (a: LonLat, b: LonLat): void => {
    for (const point of [a, b]) {
      projectRobinson(point[0], point[1], lift, projected)
      map.push(projected.x, projected.y, projected.z)
    }
  }
  const addMap = (inputA: LonLat, inputB: LonLat): void => {
    const wrap = (longitude: number) => relativeLongitude(longitude, centralMeridian)
    const a: LonLat = [wrap(inputA[0]), inputA[1]]
    const b: LonLat = [wrap(inputB[0]), inputB[1]]
    const delta = b[0] - a[0]
    if (Math.abs(delta) <= 180) {
      appendMap(a, b)
      return
    }
    const bLongitude = b[0] + (delta > 0 ? -360 : 360)
    const boundary = bLongitude > a[0] ? 180 : -180
    const fraction = (boundary - a[0]) / (bLongitude - a[0])
    const latitude = a[1] + (b[1] - a[1]) * fraction
    appendMap(a, [boundary, latitude])
    appendMap([-boundary, latitude], b)
  }
  for (const line of lines) {
    for (let index = 1; index < line.length; index += 1) {
      const a = line[index - 1]!
      const b = line[index]!
      const from = geographicPoint(a[0], a[1], 1)
      const to = geographicPoint(b[0], b[1], 1)
      const count = Math.max(1, Math.ceil(from.angleTo(to) / (3 * DEG)))
      let previous = a
      let previousVector = from
      for (let part = 1; part <= count; part += 1) {
        const currentVector = from.clone().lerp(to, part / count).normalize()
        const current = part === count ? b : vectorLonLat(currentVector)
        for (const vector of [previousVector, currentVector]) globe.push(vector.x * (GLOBE_RADIUS + lift), vector.y * (GLOBE_RADIUS + lift), vector.z * (GLOBE_RADIUS + lift))
        addMap(previous, current)
        previous = current
        previousVector = currentVector
      }
    }
  }
  return {
    globe: new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(globe, 3)),
    map: new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(map, 3)),
  }
}

export class ProjectedLineSet {
  readonly globe: THREE.BufferGeometry
  readonly map: THREE.BufferGeometry
  private readonly source: Float32Array
  private readonly mapPositions: Float32Array
  private readonly vector = new THREE.Vector3()
  constructor(lines: LonLat[][], readonly lift = 0.048, readonly centralMeridian = 0) {
    const initial = projectLines(lines, lift, centralMeridian)
    this.globe = initial.globe
    initial.map.dispose()
    this.source = new Float32Array(this.globe.getAttribute('position').array)
    this.mapPositions = new Float32Array(this.source.length * 2)
    this.map = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(this.mapPositions, 3).setUsage(THREE.DynamicDrawUsage))
    this.update(new THREE.Quaternion())
  }
  update(quaternion: THREE.Quaternion): void {
    let offset = 0
    const append = (a: LonLat, b: LonLat) => {
      for (const point of [a, b]) {
        projectRobinson(point[0], point[1], this.lift, this.vector)
        this.mapPositions[offset++] = this.vector.x
        this.mapPositions[offset++] = this.vector.y
        this.mapPositions[offset++] = this.vector.z
      }
    }
    for (let index = 0; index < this.source.length; index += 6) {
      const a = vectorLonLat(this.vector.fromArray(this.source, index).applyQuaternion(quaternion))
      const b = vectorLonLat(this.vector.fromArray(this.source, index + 3).applyQuaternion(quaternion))
      a[0] = relativeLongitude(a[0], this.centralMeridian)
      b[0] = relativeLongitude(b[0], this.centralMeridian)
      const difference = b[0] - a[0]
      if (Math.abs(difference) <= 180) append(a, b)
      else {
        const end = b[0] + (difference > 0 ? -360 : 360)
        const edge = end > a[0] ? 180 : -180
        const latitude = a[1] + (b[1] - a[1]) * (edge - a[0]) / (end - a[0])
        append(a, [edge, latitude]); append([-edge, latitude], b)
      }
    }
    this.map.setDrawRange(0, offset / 3)
    this.map.getAttribute('position').needsUpdate = true
    this.map.computeBoundingSphere()
  }
  dispose(): void { this.globe.dispose(); this.map.dispose() }
}
