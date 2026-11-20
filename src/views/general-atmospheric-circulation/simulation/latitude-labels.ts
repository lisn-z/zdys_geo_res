import * as THREE from 'three'
import { latitudeStyles } from './graticule.ts'

const referenceLatitudeLabels = latitudeStyles.flatMap(style =>
  style.latitudes.map(latitude => {
    const minutes = Math.round(Math.abs(latitude) * 60)
    const degrees = Math.floor(minutes / 60)
    const remainder = minutes % 60
    const hemisphere = latitude > 0 ? 'N' : latitude < 0 ? 'S' : ''
    const angle = `${degrees}°${remainder ? `${String(remainder).padStart(2, '0')}′` : ''}${hemisphere}`
    const name = style.key === 'equator' ? '赤道'
      : style.key === 'tropics' ? (latitude > 0 ? '北回归线' : '南回归线')
        : latitude > 0 ? '北极圈' : '南极圈'
    return { id: `latitude-${style.key}-${hemisphere || 'zero'}`, latitude, text: `${angle} · ${name}`, color: style.color }
  }),
)

const regularLatitudeLabels = [-60, -30, 30, 60].map(latitude => {
  const hemisphere = latitude > 0 ? 'N' : 'S'
  return {
    id: `latitude-regular-${Math.abs(latitude)}-${hemisphere}`,
    latitude, text: `${Math.abs(latitude)}°${hemisphere}`, color: '#78b9d8',
  }
})

export const latitudeLabelDefinitions = [...referenceLatitudeLabels, ...regularLatitudeLabels]

function isRegularLatitude(latitude: number) {
  return Math.abs(latitude) === 30 || Math.abs(latitude) === 60
}

export interface LatitudeScreenLabel {
  id: string
  text: string
  color: string
  x: number
  y: number
  anchorX: number
  anchorY: number
  visible: boolean
}

/** Keep the longitude on the camera-facing part of each actual latitude ring. */
export function getLatitudeLabelAnchor(
  latitude: number,
  earth: THREE.Object3D,
  camera: THREE.Camera,
  earthRadius = 2.5,
) {
  earth.updateWorldMatrix(true, false)
  camera.updateWorldMatrix(true, false)
  const eye = earth.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))
  const regular = isRegularLatitude(latitude)
  const lat = THREE.MathUtils.degToRad(latitude)
  const radius = regular ? earthRadius + .012 : earthRadius * 1.012
  const facingLongitude = Math.atan2(-eye.z, eye.x)
  const horizon = (earthRadius * 1.005 - Math.sin(lat) * eye.y)
    / Math.max(1e-8, Math.cos(lat) * Math.hypot(eye.x, eye.z))
  const visibleArc = Math.acos(THREE.MathUtils.clamp(horizon, -1, 1))
  const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()))
    .transformDirection(earth.matrixWorld.clone().invert())
  const east = new THREE.Vector3(-Math.sin(facingLongitude), 0, -Math.cos(facingLongitude))
  // Approach the visible left edge of each ring, continuously even when the globe is tilted.
  const longitude = facingLongitude - .92 * visibleArc * Math.tanh(8 * east.dot(cameraRight))
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(longitude),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(longitude),
  ).applyMatrix4(earth.matrixWorld)
}

/** Exact horizontal silhouette bound for a perspective sphere, including a panned view. */
export function getGlobeScreenLeft(earth: THREE.Object3D, camera: THREE.Camera, width: number, earthRadius = 2.5) {
  earth.updateWorldMatrix(true, false)
  camera.updateWorldMatrix(true, false)
  const center = earth.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse)
  const scale = earth.getWorldScale(new THREE.Vector3())
  const radius = earthRadius * Math.max(scale.x, scale.y, scale.z)
  const projection = camera.projectionMatrix.elements
  let ndcX: number
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && center.z < -radius) {
    const slope = (-center.x * center.z - radius * Math.sqrt(center.x ** 2 + center.z ** 2 - radius ** 2))
      / (center.z ** 2 - radius ** 2)
    ndcX = projection[0]! * slope - projection[8]!
  } else {
    ndcX = center.clone().add(new THREE.Vector3(-radius, 0, 0)).applyMatrix4(camera.projectionMatrix).x
  }
  return (ndcX * .5 + .5) * width
}

export function projectLatitudeLabels(
  earth: THREE.Object3D,
  camera: THREE.Camera,
  width: number,
  height: number,
  earthRadius = 2.5,
): LatitudeScreenLabel[] {
  earth.updateWorldMatrix(true, false)
  camera.updateWorldMatrix(true, false)
  const eye = camera.getWorldPosition(new THREE.Vector3())
  const center = earth.getWorldPosition(new THREE.Vector3())
  const scale = earth.getWorldScale(new THREE.Vector3())
  const sphere = new THREE.Sphere(center, earthRadius * Math.max(scale.x, scale.y, scale.z))
  const columnX = THREE.MathUtils.clamp(getGlobeScreenLeft(earth, camera, width, earthRadius) - 14,
    Math.min(150, width - 14), width - 14)
  const labels = latitudeLabelDefinitions.map(label => {
    const world = getLatitudeLabelAnchor(label.latitude, earth, camera, earthRadius)
    const projected = world.clone().project(camera)
    const toLabel = world.clone().sub(eye)
    const distance = toLabel.length()
    const ray = new THREE.Ray(eye, toLabel.normalize())
    const hit = ray.intersectSphere(sphere, new THREE.Vector3())
    const occluded = !!hit && eye.distanceTo(hit) < distance - .002
    const anchorX = (projected.x * .5 + .5) * width
    const anchorY = (-projected.y * .5 + .5) * height
    return {
      id: label.id, text: label.text, color: label.color, x: columnX, y: anchorY, anchorX, anchorY,
      visible: !occluded && projected.z >= -1 && projected.z <= 1
        && anchorX > 0 && anchorX < width && anchorY > 0 && anchorY < height,
    }
  })
  const northPole = new THREE.Vector3(0, earthRadius, 0).applyMatrix4(earth.matrixWorld).project(camera)
  const southPole = new THREE.Vector3(0, -earthRadius, 0).applyMatrix4(earth.matrixWorld).project(camera)
  const latitudeOrder = northPole.y >= southPole.y - 1e-7 ? -1 : 1
  const latitudeById = new Map(latitudeLabelDefinitions.map(label => [label.id, label.latitude]))
  // Perspective can reverse the projected heights of nearby ring anchors.
  // The teaching column follows the geographic north–south order instead.
  const visible = labels.filter(label => label.visible).sort((a, b) =>
    latitudeOrder * (latitudeById.get(a.id)! - latitudeById.get(b.id)!))
  const gap = 22
  let previousY = -Infinity
  visible.forEach((label, index) => {
    label.y = Math.max(previousY + gap, THREE.MathUtils.clamp(label.anchorY,
      16 + index * gap, height - 16 - (visible.length - 1 - index) * gap))
    previousY = label.y
  })
  return labels
}
