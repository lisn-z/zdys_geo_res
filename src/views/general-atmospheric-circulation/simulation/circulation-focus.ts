import * as THREE from 'three'
import { AtmosphericCellCurve } from './circulation-section.ts'
import { deflectCirculationCurve } from './circulation-spatial.ts'

type FocusCellKind = 'single' | 'hadley' | 'ferrel' | 'polar'

const EARTH_RADIUS = 2.5
const ranges: Record<FocusCellKind, readonly [number, number]> = {
  single: [88, 0], hadley: [30, 0], ferrel: [30, 60], polar: [88, 60],
}
const middleLatitudes: Record<FocusCellKind, number> = { single: 44, hadley: 15, ferrel: 45, polar: 75 }

/**
 * Frame one complete northern cell after the existing rightward globe roll.
 * The target meridian remains the full airflow section, rather than one of the
 * thin arrow-only sections. Fit its entire swept volume, including zonal shear,
 * so the lower branch and rounded returns remain in frame on narrow screens.
 */
export function getCellFocusView(aspect: number, sectionLongitude: number, kind: FocusCellKind) {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('Aspect must be positive and finite')
  if (!Number.isFinite(sectionLongitude)) throw new RangeError('Section longitude must be finite')
  if (!ranges[kind]) throw new RangeError('Unknown circulation cell')

  const [from, to] = ranges[kind]
  const curve = deflectCirculationCurve(new AtmosphericCellCurve({
    type: kind, surfaceFromLat: from, surfaceToLat: to, riseLat: to,
    upperFromLat: to, upperToLat: from, sinkLat: from,
  }, sectionLongitude), kind)
  const earthRotationY = THREE.MathUtils.degToRad(180 - sectionLongitude)
  const earthRotationZ = -Math.PI / 2
  const transform = new THREE.Matrix4().makeRotationZ(earthRotationZ)
    .multiply(new THREE.Matrix4().makeRotationY(earthRotationY))
  const axis = new THREE.Vector3(0, 1, 0)
  const halfWidth = kind === 'single' ? 25 : 22
  const points: THREE.Vector3[] = []
  for (let index = 0; index < 256; index++) {
    const point = curve.getPointAt(index / 256)
    for (let slice = 0; slice <= 12; slice++) {
      points.push(point.clone().applyAxisAngle(axis, THREE.MathUtils.degToRad(-halfWidth + 2 * halfWidth * slice / 12))
        .applyMatrix4(transform))
    }
  }

  const target = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3())
  const latitude = THREE.MathUtils.degToRad(middleLatitudes[kind])
  const outward = new THREE.Vector3(Math.sin(latitude), Math.cos(latitude), 0)
  // Face the meridional section almost squarely. A modest outward elevation
  // clears the globe without compressing the loop into a narrow side view.
  const eyeDirection = outward.multiplyScalar(.4).add(new THREE.Vector3(0, 0, Math.sqrt(1 - .4 ** 2)))
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), eyeDirection).normalize()
  const up = new THREE.Vector3().crossVectors(eyeDirection, right).normalize()
  const fov = 50
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov / 2))
  const tanX = tanY * aspect
  // Keep a generous, consistent 16% frame margin without an excessively close
  // approach to small polar cells. All distances are from the actual cell target.
  let distance = 2.2
  for (const point of points) {
    const relative = point.clone().sub(target)
    distance = Math.max(distance, relative.dot(eyeDirection) + Math.max(
      Math.abs(relative.dot(right)) / (tanX * .84),
      Math.abs(relative.dot(up)) / (tanY * .84),
    ))
  }
  const position = target.clone().addScaledVector(eyeDirection, distance)
  if (position.length() < EARTH_RADIUS + .15) position.setLength(EARTH_RADIUS + .15)
  return { position, target, fov, earthRotationY, earthRotationZ }
}
