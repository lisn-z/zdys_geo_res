import * as THREE from 'three'
import { calculateEarthOrientation } from './earthOrientation'

/** 地理北向只随季节参考系变化，不随地球每日自转旋转。 */
export function spaceCameraUp(season: number, view: string) {
  const up = new THREE.Vector3(0, 1, 0)
  return view === 'top' || view === 'presentation' ? up : up.applyQuaternion(calculateEarthOrientation(season, 0)).normalize()
}

/** 截图对应的侧向展示机位：太阳在左、地球在右，略高于轨道面；不是黄道俯视。 */
export function presentationSpacePose(
  scale: { earthRadius: number; sunRadius: number; sunDistance: number },
  aspect: number,
) {
  const centerX = -scale.sunDistance * 0.2
  // 与主场景的窄屏 FOV 补偿一致，避免窄分屏裁掉太阳左缘。
  const horizontalHalfFovTangent = Math.tan(THREE.MathUtils.degToRad(45) / 2) * Math.max(1, aspect)
  const framingDistance = (scale.sunDistance * 0.8 + scale.sunRadius) * 1.08 / horizontalHalfFovTangent
  const distance = Math.max(74, scale.sunDistance * 2.1, framingDistance)
  return {
    position: new THREE.Vector3(centerX, scale.sunDistance * 0.22, distance),
    target: new THREE.Vector3(centerX, scale.earthRadius * 0.15, 0),
    up: new THREE.Vector3(0, 1, 0),
  }
}

/** 把赤道侧面的预设机位转入北向上参考系，不旋转任何天体或光源。 */
export function northUpSpacePose(position: THREE.Vector3, target: THREE.Vector3, season: number) {
  const up = spaceCameraUp(season, 'overview')
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
  return {
    position: position.clone().applyQuaternion(rotation),
    target: target.clone().applyQuaternion(rotation),
    up,
  }
}

/** 切换季节时保留用户的缩放、平移和环绕位置，只转换观察参考系。 */
export function transportSpaceCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  nextUp: THREE.Vector3,
) {
  const rotation = new THREE.Quaternion().setFromUnitVectors(camera.up.clone().normalize(), nextUp)
  camera.position.applyQuaternion(rotation)
  target.applyQuaternion(rotation)
  camera.up.copy(nextUp)
  camera.lookAt(target)
  camera.updateMatrixWorld()
}
