import * as THREE from 'three'

// 教学模型固定采用 23°26′；不能写成 23.26° 或四舍五入为 23.5°。
export const EARTH_AXIAL_TILT_DEGREES = 23 + 26 / 60

export function calculateEarthOrientation(orbitalPosition: number, rotationAngle: number) {
  // 场景固定日地连线，季节转换通过相对轨道坐标系表达。
  const orbitalFrame = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(90 + orbitalPosition),
  )
  const axialTilt = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    THREE.MathUtils.degToRad(-EARTH_AXIAL_TILT_DEGREES),
  )
  const spin = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(rotationAngle),
  )
  // 先绕本地地轴自转，再倾斜，避免自转变成绕黄道面法线旋转。
  return orbitalFrame.multiply(axialTilt).multiply(spin)
}
