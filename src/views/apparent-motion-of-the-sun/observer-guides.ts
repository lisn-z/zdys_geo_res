import { getObserverFrame, type Vec3 } from './observer-frame'

export interface ObserverGuideGeometry {
  /** 太阳相对当地地平面的有符号高度角，单位为度。 */
  altitude: number
  up: Vec3
  sunDirection: Vec3
  horizontalDirection: Vec3
  /** 64 段单位角弧，含起点和终点；调用方平移到观测点并按需缩放。 */
  angleDirections: Vec3[]
}

export interface TrackInclinationGuide {
  /** 每日太阳轨迹平面与当地地平面的夹角，单位为度。 */
  inclination: number
  up: Vec3
  /** 当地水平面内朝赤道的方向；赤道处约定向南。 */
  horizontalDirection: Vec3
  /** 平行于全球赤道平面的当地赤道径向。 */
  trackDirection: Vec3
  /** 64 段单位角弧，顶点由渲染方平移至同一个观测点。 */
  angleDirections: Vec3[]
}

const DEG = Math.PI / 180
const ANGLE_SEGMENTS = 64
const PROJECTION_EPSILON = 1e-12

/**
 * 世界北极为 +Y，未施加额外演示倾斜。所有方向和基底共用 getObserverFrame。
 * 天顶/天底的水平投影没有唯一方向，以当地 east 作参考，避免归一化零向量。
 * 0° 时弧退化为一个点：渲染方应省略零长度管道，仍可显示 0° 标签。
 */
export function getObserverGuideGeometry(
  latitude: number,
  declination: number,
  hourAngle: number,
): ObserverGuideGeometry {
  if (!Number.isFinite(hourAngle)) throw new RangeError('时角须为有限数值')
  const { up, east, south, sunDirection } = getObserverFrame(latitude, declination, hourAngle % 360)
  const vertical = up.x * sunDirection.x + up.y * sunDirection.y + up.z * sunDirection.z
  const eastProjection = east.x * sunDirection.x + east.y * sunDirection.y + east.z * sunDirection.z
  const southProjection = south.x * sunDirection.x + south.y * sunDirection.y + south.z * sunDirection.z
  // 在正交的水平基底中合成，避免接近天顶时 sun−up·dot 的相消误差。
  const projection = {
    x: east.x * eastProjection + south.x * southProjection,
    y: east.y * eastProjection + south.y * southProjection,
    z: east.z * eastProjection + south.z * southProjection,
  }
  const projectionLength = Math.hypot(eastProjection, southProjection)
  const horizontalDirection = projectionLength > PROJECTION_EPSILON
    ? { x: projection.x / projectionLength, y: projection.y / projectionLength, z: projection.z / projectionLength }
    : { ...east }
  const altitudeRadians = Math.atan2(vertical, projectionLength)
  const angleDirections = Array.from({ length: ANGLE_SEGMENTS + 1 }, (_, index): Vec3 => {
    if (index === 0) return { ...horizontalDirection }
    if (index === ANGLE_SEGMENTS) return { ...sunDirection }
    const angle = altitudeRadians * index / ANGLE_SEGMENTS
    const horizontal = Math.cos(angle)
    const height = Math.sin(angle)
    return {
      x: horizontalDirection.x * horizontal + up.x * height,
      y: horizontalDirection.y * horizontal + up.y * height,
      z: horizontalDirection.z * horizontal + up.z * height,
    }
  })

  return { altitude: altitudeRadians / DEG, up, sunDirection, horizontalDirection, angleDirections }
}

/**
 * 轨迹平面平行于赤道平面，因此倾角只取决于纬度，不随赤纬改变。
 * 在当地子午面内，从朝赤道的水平线向上量到赤道径向，即 90°−|φ|。
 * 与其他辅助线共用未施加演示倾斜的世界坐标；极点处两条边完全重合。
 */
export function getTrackInclinationGuide(latitude: number, hourAngle: number): TrackInclinationGuide {
  if (!Number.isFinite(hourAngle)) throw new RangeError('时角须为有限数值')
  const { up, east, south } = getObserverFrame(latitude, 0, hourAngle % 360)
  const inclination = 90 - Math.abs(latitude)
  const trackDirection = { x: -east.z, y: 0, z: east.x }
  // 精确极点消除 cos(±π/2) 的残余，避免 0° 角弧留下微小的非零线段。
  const horizontalDirection = inclination === 0
    ? { ...trackDirection }
    : latitude >= 0 ? { ...south } : { x: -south.x, y: -south.y, z: -south.z }
  const angleDirections = Array.from({ length: ANGLE_SEGMENTS + 1 }, (_, index): Vec3 => {
    if (inclination === 0 || index === ANGLE_SEGMENTS) return { ...trackDirection }
    if (index === 0) return { ...horizontalDirection }
    const angle = inclination * DEG * index / ANGLE_SEGMENTS
    const horizontal = Math.cos(angle)
    const height = Math.sin(angle)
    return {
      x: horizontalDirection.x * horizontal + up.x * height,
      y: horizontalDirection.y * horizontal + up.y * height,
      z: horizontalDirection.z * horizontal + up.z * height,
    }
  })
  return { inclination, up, horizontalDirection, trackDirection, angleDirections }
}

/**
 * 晨昏线是垂直于太阳方向、经过地心的单位大圆，与当日时角无关。
 * 返回 segments+1 个点，最后一点精确重复首点，可直接构造闭合折线。
 */
export function getTerminatorDirections(declination: number, segments = 128): Vec3[] {
  if (!Number.isInteger(segments) || segments < 3 || segments > 16384) {
    throw new RangeError('晨昏线分段数须为 3 至 16384 的整数')
  }
  const { sunDirection } = getObserverFrame(0, declination, 0)
  // 太阳始终位于世界 XY 平面，+Z 及 sun×(+Z) 为稳定正交基底。
  const tangent = { x: sunDirection.y, y: -sunDirection.x, z: 0 }
  const points = Array.from({ length: segments }, (_, index): Vec3 => {
    const angle = 2 * Math.PI * index / segments
    return {
      x: tangent.x * Math.sin(angle),
      y: tangent.y * Math.sin(angle),
      z: Math.cos(angle),
    }
  })
  points.push({ ...points[0]! })
  return points
}
