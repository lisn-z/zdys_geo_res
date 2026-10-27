import * as THREE from 'three'
import type { ObserverFrame, Vec3 } from './observer-frame'

export type ViewVector = Readonly<Vec3> | readonly [number, number, number]
export type ViewTilt = Readonly<{ x: number; y: number; z: number; w: number }>

export interface ObserverView {
  /** 太空世界系中的相机位置。 */
  position: THREE.Vector3
  /** 观测点世界位置，也是相机看向的目标。 */
  target: THREE.Vector3
  /** 相机 up 参考向量；不是人物身体的朝向。 */
  up: THREE.Vector3
  /** 从 target 指向 position 的向量；可归一化后用于重新适配取景距离。 */
  offset: THREE.Vector3
}

function vector(value: ViewVector, name: string): THREE.Vector3 {
  const components = 'x' in value ? [value.x, value.y, value.z] : value
  if (components.length !== 3 || !components.every(Number.isFinite)) {
    throw new RangeError(`${name}须包含三个有限数值`)
  }
  return new THREE.Vector3(components[0], components[1], components[2])
}

/**
 * 将朝向当地原点的相机，刚性映射到太空中的同一观测点。
 * 当地 +X/+Y/+Z 分别对应 east/up/south，随后整体施加演示用 tilt。
 * 相机偏移和 up 必须一起变换；不读取人物 yaw，也不单独旋转地平面。
 *
 * observerRadius 是地心到观测点的距离（例如 EARTH_RADIUS + 0.022）。
 * distanceScale=1 时，同尺度的当地几何与映射后的几何拥有相同透视投影。
 * 修改 distanceScale 只调整取景距离；若要求有限物体的投影大小也相同，
 * 对应物体相对 target 的尺寸应使用同一比例。方向的相机坐标始终一致。
 * 调用方应使用相同 FOV/aspect 比较画面，并确保原相机朝向当地原点。
 */
export function mapViewToObserver(
  frame: Pick<ObserverFrame, 'east' | 'up' | 'south'>,
  tilt: ViewTilt,
  localCameraOffset: ViewVector,
  localCameraUp: ViewVector,
  observerRadius: number,
  distanceScale = 1,
): ObserverView {
  if (!Number.isFinite(observerRadius) || observerRadius < 0
    || !Number.isFinite(distanceScale) || distanceScale <= 0) {
    throw new RangeError('观测点半径须为非负有限数，取景比例须为正有限数')
  }
  const east = vector(frame.east, 'east')
  const localUp = vector(frame.up, 'up')
  const south = vector(frame.south, 'south')
  const tolerance = 1e-8
  if ([east, localUp, south].some(axis => Math.abs(axis.lengthSq() - 1) > tolerance)
    || Math.abs(east.dot(localUp)) > tolerance || Math.abs(east.dot(south)) > tolerance
    || Math.abs(localUp.dot(south)) > tolerance
    || east.clone().cross(localUp).distanceTo(south) > tolerance) {
    throw new RangeError('east/up/south 须构成右手正交单位基底')
  }
  const tiltComponents = [tilt.x, tilt.y, tilt.z, tilt.w]
  const tiltLength = Math.hypot(...tiltComponents)
  if (!tiltComponents.every(Number.isFinite) || !Number.isFinite(tiltLength) || tiltLength === 0) {
    throw new RangeError('演示倾斜须为有效旋转四元数')
  }
  const rotation = new THREE.Quaternion(tilt.x / tiltLength, tilt.y / tiltLength, tilt.z / tiltLength, tilt.w / tiltLength)
  const offset = vector(localCameraOffset, '相机偏移')
  const up = vector(localCameraUp, '相机up')
  if (offset.lengthSq() < 1e-20 || up.lengthSq() < 1e-20
    || offset.clone().normalize().cross(up.clone().normalize()).lengthSq() < 1e-20) {
    throw new RangeError('相机偏移和up不能为零或互相平行')
  }
  const basis = new THREE.Matrix3().set(
    east.x, localUp.x, south.x,
    east.y, localUp.y, south.y,
    east.z, localUp.z, south.z,
  )
  const target = localUp.clone().multiplyScalar(observerRadius).applyQuaternion(rotation)
  offset.applyMatrix3(basis).applyQuaternion(rotation).multiplyScalar(distanceScale)
  up.applyMatrix3(basis).applyQuaternion(rotation).normalize()
  const position = target.clone().add(offset)
  if (![...position.toArray(), ...target.toArray(), ...offset.toArray(), ...up.toArray()].every(Number.isFinite)) {
    throw new RangeError('取景参数过大，无法生成有限相机坐标')
  }
  return { position, target, up, offset }
}
