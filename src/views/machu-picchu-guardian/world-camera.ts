import * as THREE from 'three'
import { LANDMARK_SPECS, PLAZA_AREAS, PLAZA_HEIGHTS, ROOM_LAYOUT, URBAN_PLATFORMS } from './world-layout'
import type { Vec3 } from './types'

/** A close archaeological overview. The guardhouse walk view provides the
 * mountain panorama; this preset makes the urban districts readable. */
export function overviewFrame(aspect: number, fov: number): { position: Vec3; target: Vec3 } {
  const target = new THREE.Vector3(0, 36, -85), direction = new THREE.Vector3(-.42, .67, .61).normalize()
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
  const up = new THREE.Vector3().crossVectors(direction, right).normalize()
  const tangent = Math.tan(THREE.MathUtils.degToRad(THREE.MathUtils.clamp(fov, 25, 85) / 2)) * .925
  const safeAspect = Number.isFinite(aspect) ? Math.max(.2, aspect) : 1
  let distance = 200
  const point = new THREE.Vector3()
  function fit(x: number, y: number, z: number): void {
    point.set(x, y, z).sub(target)
    distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.dot(right)) / (tangent * safeAspect), Math.abs(point.dot(up)) / tangent))
  }
  const urban = (x: number, z: number) => x >= -115 && x <= 115 && z >= -255 && z <= 75
  for (const platform of URBAN_PLATFORMS) for (const [x, z] of platform.points) {
    if (urban(x, z)) { fit(x, platform.y, z); fit(x, platform.y - 3.2, z) }
  }
  PLAZA_AREAS.forEach((points, i) => points.forEach(([x, z]) => fit(x, PLAZA_HEIGHTS[i]!, z)))
  for (const room of ROOM_LAYOUT) {
    if (!urban(room.x, room.z)) continue
    const c = Math.cos(room.angle), s = Math.sin(room.angle)
    for (const x of [-room.width / 2 - .3, room.width / 2 + .3]) for (const z of [-room.depth / 2 - .3, room.depth / 2 + .3]) {
      const px = room.x + x * c + z * s, pz = room.z - x * s + z * c
      fit(px, room.y, pz); fit(px, room.y + room.height + room.width * .37 + .1, pz)
    }
  }
  for (const landmark of LANDMARK_SPECS) {
    if (!urban(landmark.x, landmark.z)) continue
    for (const x of [-landmark.width / 2, landmark.width / 2]) for (const z of [-landmark.depth / 2, landmark.depth / 2]) {
      fit(landmark.x + x, landmark.y, landmark.z + z); fit(landmark.x + x, landmark.y + (landmark.height ?? 10) + 1, landmark.z + z)
    }
  }
  const position = direction.multiplyScalar(distance).add(target)
  return { position: position.toArray() as Vec3, target: target.toArray() as Vec3 }
}

