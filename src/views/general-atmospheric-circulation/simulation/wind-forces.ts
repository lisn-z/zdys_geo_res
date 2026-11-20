import * as THREE from 'three'
import { monsoonWinds } from './model.ts'
import { createGeographicCurve } from './geographic-paths.ts'
import { monsoonDestinationAnchor } from './monsoon-crossing.ts'

export const windForceColors = {
  pressure: '#6fdcff',
  wind: '#f6fbff',
  coriolis: '#ffad60',
} as const

export const windForceDescription = '两半球跨赤道后气流的镜像对照示意，北侧、南侧分别对应7月、1月；气压梯度力指向低压区。未展示摩擦力，不代表实测位置与瞬时力平衡，箭头长度不表示力的大小。'
export const WIND_FORCE_CYCLE_SECONDS = 16

export type WindForceKind = keyof typeof windForceColors
export interface WindForceLabel {
  text: string
  position: THREE.Vector3
  color: string
  cluster: string
  kind: WindForceKind
  opacity: number
}

type ForceArrow = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
export interface WindForceCluster {
  id: string
  group: THREE.Group
  /** Fixed geographic anchor for selecting a region, not the moving parcel. */
  origin: THREE.Vector3
  hemisphere: 'north' | 'south'
  illustration: 'equatorial-mirror'
  representedMonth: 1 | 7
  /** Shape reference only: the illustration is relocated and mirrored. */
  routeId: string
  latitude: number
  longitude: number
  radius: number
  arrows: Record<WindForceKind, ForceArrow>
  marker: ForceArrow
  path: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  labels: WindForceLabel[]
}

export interface WindForceVisuals {
  group: THREE.Group
  labels: WindForceLabel[]
  clusters: WindForceCluster[]
  description: string
}

const poleAxis = new THREE.Vector3(0, 1, 0)
// An explicit mirrored comparison, NOT two observed geographic trajectories.
// Borrow the northern branch's curvature, place its 7° point at 105°E, then
// reflect the same curve across y=0. The actual monsoon layer is untouched.
const referenceRouteIndex = 2
const referenceCurve = createGeographicCurve(monsoonWinds[referenceRouteIndex]!.points, 1)
const referenceStart = monsoonDestinationAnchor(referenceCurve, 5)
const referenceAnchor = monsoonDestinationAnchor(referenceCurve, 7)
const referenceEnd = monsoonDestinationAnchor(referenceCurve, 9)
const illustrationLongitude = 105
const illustrationRotation = THREE.MathUtils.degToRad(illustrationLongitude - referenceAnchor.lon)
export const windForceExamples = (['north', 'south'] as const).map(hemisphere => {
  const sign = hemisphere === 'north' ? 1 : -1
  const points = referenceCurve.points.map(point => {
    const p = point.clone().applyAxisAngle(poleAxis, illustrationRotation)
    p.y *= sign
    return p
  })
  const curve = new THREE.CatmullRomCurve3(points, false, referenceCurve.curveType, referenceCurve.tension)
  return { hemisphere, routeId: `monsoon-${referenceRouteIndex}`, curve,
    illustration: 'equatorial-mirror' as const, representedMonth: hemisphere === 'north' ? 7 as const : 1 as const,
    latitude: sign * 7, longitude: illustrationLongitude,
    startProgress: referenceStart.progress, endProgress: referenceEnd.progress }
})

/**
 * Geographic tangent basis and a schematic pressure-gradient direction toward
 * the receiving summer hemisphere's low pressure, not a sampled pressure field.
 * The animated frame below uses the displayed mirror-illustration tangent.
 * Coriolis is perpendicular to the wind: right in the north, left in the south.
 * This is a direction diagram, not a solution of the force balance (friction omitted).
 * Source: https://oceanservice.noaa.gov/education/tutorial_currents/04currents1.html
 */
export function windForceFrame(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 90 || latitude === 0) {
    throw new RangeError('A wind-force example must be away from the equator and poles')
  }
  const lat = THREE.MathUtils.degToRad(latitude), lon = THREE.MathUtils.degToRad(longitude)
  const normal = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
  const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon))
  const north = new THREE.Vector3(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon))
  const hemisphere = Math.sign(latitude)
  const pressure = north.clone().multiplyScalar(hemisphere)
  const wind = pressure.clone().multiplyScalar(Math.cos(Math.PI * .29)).addScaledVector(east, Math.sin(Math.PI * .29)).normalize()
  const coriolis = wind.clone().cross(normal).multiplyScalar(hemisphere).normalize()
  return { normal, north, east, pressure, wind, coriolis }
}

/** Exact tangent of the displayed mirrored illustration, on the sphere. */
export function windForcePathFrame(hemisphere: 'north' | 'south', longitude: number, progress: number) {
  if (!Number.isFinite(progress)) throw new RangeError('Path progress must be finite')
  const t = THREE.MathUtils.clamp(progress, 0, 1)
  const sign = hemisphere === 'north' ? 1 : -1
  const example = windForceExamples.find(example => example.hemisphere === hemisphere)!
  const sample = THREE.MathUtils.lerp(example.startProgress, example.endProgress, t)
  const sourcePoint = example.curve.getPoint(sample).normalize()
  const sourceTangent = example.curve.getTangent(sample)
  sourceTangent.addScaledVector(sourcePoint, -sourceTangent.dot(sourcePoint)).normalize()
  // Preserve the optional longitude offset in the original frame API. The
  // default passes the fixed anchor longitude, so the offset is exactly zero.
  const longitudeOffset = longitude - example.longitude
  const latitude = THREE.MathUtils.radToDeg(Math.asin(sourcePoint.y))
  const pathLongitude = THREE.MathUtils.radToDeg(Math.atan2(-sourcePoint.z, sourcePoint.x)) + longitudeOffset
  const frame = windForceFrame(latitude, pathLongitude)
  frame.wind.copy(sourceTangent).applyAxisAngle(poleAxis, THREE.MathUtils.degToRad(longitudeOffset))
  frame.coriolis.copy(frame.wind).cross(frame.normal).multiplyScalar(sign).normalize()
  return { ...frame, latitude, longitude: pathLongitude }
}

const arrowSide = new THREE.Vector3(), arrowVertex = new THREE.Vector3()
// Keep the equatorward Coriolis arrows inside their own hemispheres even at the
// 5° start, so the two mirrored examples do not intersect. Lengths are schematic.
const lengths = { pressure: .42, wind: .46, coriolis: .22 }
const titles = { pressure: '水平气压梯度力', wind: '风向', coriolis: '地转偏向力' }
const kinds = ['pressure', 'wind', 'coriolis'] as const

// A filled ribbon, not a 3D cone: every vertex is projected back onto the same shell.
// Only BufferAttribute values change during animation; geometry/materials are reused.
function updateForceArrow(mesh: ForceArrow, origin: THREE.Vector3, direction: THREE.Vector3, length: number, radius: number) {
  arrowSide.copy(origin).normalize().cross(direction).normalize()
  const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
  const halfWidth = .0105
  let index = 0
  const vertex = (distance: number, width: number) => {
    arrowVertex.copy(origin).addScaledVector(direction, distance).normalize().multiplyScalar(radius)
      .addScaledVector(arrowSide, width).normalize().multiplyScalar(radius)
    positions.setXYZ(index++, arrowVertex.x, arrowVertex.y, arrowVertex.z)
  }
  // The small shared-origin gap avoids coplanar overlapping arrow shafts.
  for (let row = 0; row <= 16; row++) {
    const t = row / 16, distance = .025 + (length * .75 - .025) * t
    vertex(distance, -halfWidth)
    vertex(distance, halfWidth)
  }
  vertex(length * .72, -.038)
  vertex(length * .72, .038)
  vertex(length, 0)
  positions.needsUpdate = true
  mesh.userData.direction.copy(direction)
  mesh.userData.origin.copy(origin)
}

function createForceArrow(radius: number, kind: WindForceKind) {
  const indices: number[] = []
  for (let row = 0; row < 16; row++) {
    const a = row * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  indices.push(34, 35, 36)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(37 * 3), 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setIndex(indices)
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + .04)
  const material = new THREE.MeshBasicMaterial({ color: windForceColors[kind], side: THREE.DoubleSide,
    transparent: true, opacity: 0, depthTest: true, depthWrite: false, toneMapped: false })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = `wind-force-${kind}`
  mesh.userData.kind = kind
  mesh.userData.direction = new THREE.Vector3()
  mesh.userData.origin = new THREE.Vector3()
  mesh.renderOrder = 7
  return mesh
}

function createParcelMarker(radius: number) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setIndex([0, 1, 2, 1, 3, 2])
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + .04)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: windForceColors.wind,
    side: THREE.DoubleSide, transparent: true, opacity: 0, depthTest: true, depthWrite: false, toneMapped: false }))
  mesh.name = 'wind-parcel-marker'
  mesh.renderOrder = 7.1
  return mesh
}

export function updateWindForceVisuals(visuals: WindForceVisuals, time: number) {
  if (!Number.isFinite(time)) return
  const t = THREE.MathUtils.euclideanModulo(time, WIND_FORCE_CYCLE_SECONDS) / WIND_FORCE_CYCLE_SECONDS
  // Fade out before the return to t=0, then fade in; never run backwards along the path.
  const opacity = THREE.MathUtils.smoothstep(t, 0, .06) * (1 - THREE.MathUtils.smoothstep(t, .86, .98))
  for (const cluster of visuals.clusters) {
    const frame = windForcePathFrame(cluster.hemisphere, cluster.longitude, t)
    const origin = frame.normal.clone().multiplyScalar(cluster.radius)
    for (const kind of kinds) {
      const arrow = cluster.arrows[kind]
      updateForceArrow(arrow, origin, frame[kind], lengths[kind], cluster.radius)
      arrow.material.opacity = opacity
    }
    const markerPositions = cluster.marker.geometry.getAttribute('position') as THREE.BufferAttribute
    const side = frame.normal.clone().cross(frame.wind).normalize()
    let index = 0
    for (const along of [-1, 1]) for (const across of [-1, 1]) {
      arrowVertex.copy(origin).addScaledVector(frame.wind, along * .017).addScaledVector(side, across * .017)
        .normalize().multiplyScalar(cluster.radius + .006)
      markerPositions.setXYZ(index++, arrowVertex.x, arrowVertex.y, arrowVertex.z)
    }
    markerPositions.needsUpdate = true
    cluster.marker.material.opacity = opacity
    for (const label of cluster.labels) {
      label.position.copy(origin).addScaledVector(frame[label.kind], lengths[label.kind] + .12)
        .normalize().multiplyScalar(cluster.radius + .035)
      label.opacity = opacity
    }
  }
}

export function createWindForceVisuals(radius = 2.5): WindForceVisuals {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Earth radius must be positive')
  const group = new THREE.Group()
  group.name = 'wind-direction-and-forces'
  const labels: WindForceLabel[] = []
  const clusters: WindForceVisuals['clusters'] = []
  const surfaceRadius = radius + .12
  for (const example of windForceExamples) {
      const lat = example.latitude, lon = example.longitude
      const frame = windForceFrame(lat, lon)
      const origin = frame.normal.clone().multiplyScalar(surfaceRadius)
      const cluster = new THREE.Group()
      const id = `force-${lat}-${lon}`
      cluster.name = id
      const hemisphere = lat > 0 ? 'north' : 'south'
      const pathPoints = Array.from({ length: 97 }, (_, i) =>
        windForcePathFrame(hemisphere, lon, i / 96).normal.multiplyScalar(surfaceRadius - .008))
      const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathPoints),
        new THREE.LineBasicMaterial({ color: windForceColors.wind, transparent: true, opacity: .4,
          depthTest: true, depthWrite: false, toneMapped: false }))
      path.name = 'wind-parcel-curved-path'
      path.renderOrder = 6.9
      const marker = createParcelMarker(surfaceRadius)
      const arrows = Object.fromEntries(kinds.map(kind => [kind, createForceArrow(surfaceRadius, kind)])) as Record<WindForceKind, ForceArrow>
      const clusterLabels: WindForceLabel[] = []
      for (const kind of kinds) {
        cluster.add(arrows[kind])
        const label = { text: titles[kind], position: new THREE.Vector3(), color: windForceColors[kind], cluster: id, kind, opacity: 0 }
        labels.push(label)
        clusterLabels.push(label)
      }
      cluster.add(path, marker)
      group.add(cluster)
      clusters.push({ id, group: cluster, origin, hemisphere, routeId: example.routeId,
        illustration: example.illustration, representedMonth: example.representedMonth,
        latitude: lat, longitude: lon, radius: surfaceRadius, arrows, marker, path, labels: clusterLabels })
  }
  const visuals = { group, labels, clusters, description: windForceDescription }
  updateWindForceVisuals(visuals, 0)
  return visuals
}
