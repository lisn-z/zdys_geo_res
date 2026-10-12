import * as THREE from 'three'

function orbitalTilt(inclination: number, nodeProgress: number) {
  const nodeAngle = THREE.MathUtils.degToRad(nodeProgress)
  return new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(Math.cos(nodeAngle), 0, Math.sin(nodeAngle)),
    THREE.MathUtils.degToRad(inclination),
  )
}

export function calculateMoonPosition(
  longitude: number,
  inclination: number,
  nodeProgress: number,
  distance: number,
) {
  const angle = THREE.MathUtils.degToRad(longitude + 180)
  // 从北侧看逆时针公转；0°位于日地之间。
  return new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))
    .multiplyScalar(distance)
    .applyQuaternion(orbitalTilt(inclination, nodeProgress))
}

export function calculateMoonOrientation(
  rotation: number,
  inclination: number,
  nodeProgress: number,
) {
  // 自转姿态独立于轨道位置；自转角与公转角相等时，贴图中央经线（+X）朝向地心。
  return orbitalTilt(inclination, nodeProgress).multiply(
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.degToRad(rotation),
    ),
  )
}

export function calculateSkyUp(
  direction: THREE.Vector3,
  observerUp: THREE.Vector3,
  localNorth: THREE.Vector3,
) {
  const skyUp = observerUp.clone().addScaledVector(direction, -observerUp.dot(direction))
  // 天顶时投影退化；两个视图采用同一个北向基准，避免月面突然翻转。
  if (skyUp.lengthSq() < 1e-8) {
    skyUp.copy(localNorth).addScaledVector(direction, -localNorth.dot(direction))
  }
  return skyUp.normalize()
}
