import * as THREE from 'three'

/** Preserve framing when moving between orthographic and perspective views. */
export function createCameraTransition(
  from: THREE.Camera, fromTarget: THREE.Vector3,
  to: THREE.Camera, toTarget: THREE.Vector3,
) {
  const startTarget = fromTarget.clone(), endTarget = toTarget.clone()
  const startRotation = from.quaternion.clone(), endRotation = to.quaternion.clone()
  const startDistance = from.position.distanceTo(startTarget)
  const endDistance = to.position.distanceTo(endTarget)
  const startProjection = from.projectionMatrix.clone()
  const endProjection = to.projectionMatrix.clone()
  // Both projection matrices must have w=1 at the focal plane before blending.
  // Otherwise the perspective matrix dominates an orthographic one immediately.
  startProjection.multiplyScalar(1 / (startProjection.elements[15]! - startProjection.elements[11]! * startDistance))
  endProjection.multiplyScalar(1 / (endProjection.elements[15]! - endProjection.elements[11]! * endDistance))
  const rotation = new THREE.Quaternion(), offset = new THREE.Vector3()
  return {
    sample(camera: THREE.Camera, target: THREE.Vector3, amount: number) {
      const t = THREE.MathUtils.clamp(amount, 0, 1)
      const eased = t * t * t * (t * (t * 6 - 15) + 10)
      target.lerpVectors(startTarget, endTarget, eased)
      rotation.slerpQuaternions(startRotation, endRotation, eased)
      const radius = Math.exp(THREE.MathUtils.lerp(Math.log(startDistance), Math.log(endDistance), eased))
      offset.set(0, 0, radius).applyQuaternion(rotation)
      camera.position.copy(target).add(offset)
      camera.quaternion.copy(rotation)
      for (let i = 0; i < 16; i++) {
        camera.projectionMatrix.elements[i] = THREE.MathUtils.lerp(startProjection.elements[i]!, endProjection.elements[i]!, eased)
      }
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      camera.updateMatrixWorld()
      return eased
    },
  }
}
