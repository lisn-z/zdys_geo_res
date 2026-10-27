/** 世界坐标中的方向向量；不依赖 Three.js，便于两种视角共用同一套几何。 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface ObserverFrame {
  /** 当地天顶方向，同时是地心指向观测点的单位向量。 */
  up: Vec3
  /** 当地正东；精确极点处按参考经线延拓。 */
  east: Vec3
  /** 当地正南；与 east、up 构成右手基底，正北为其反向。 */
  south: Vec3
  /** 从地球指向太阳的单位向量，太阳入射光的传播方向与之相反。 */
  sunDirection: Vec3
}

/**
 * 北极沿世界 +Y；固定日期下太阳方向不随日周播放改变。
 * 地球相对正午位置绕 +Y 转过时角 H，观测者随地球一起转动。
 * 世界方向投影到 (east, up, south)，即太阳主场使用的 (+X 东,+Y 上,+Z 南)。
 * 极点的水平基底只是所选参考经线的连续延拓，不表示唯一的地理东/南。
 */
export function getObserverFrame(
  latitude: number,
  declination: number,
  hourAngle: number,
): ObserverFrame {
  if (
    !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    !Number.isFinite(declination) || Math.abs(declination) > 90 ||
    !Number.isFinite(hourAngle)
  ) throw new RangeError('纬度和赤纬须在 −90° 至 90° 内，时角须为有限数值')

  const phi = latitude * Math.PI / 180
  const delta = declination * Math.PI / 180
  const hour = hourAngle * Math.PI / 180
  const sinPhi = Math.sin(phi)
  const cosPhi = Math.cos(phi)
  const sinHour = Math.sin(hour)
  const cosHour = Math.cos(hour)

  return {
    up: { x: cosPhi * cosHour, y: sinPhi, z: -cosPhi * sinHour },
    east: { x: -sinHour, y: 0, z: -cosHour },
    south: { x: sinPhi * cosHour, y: -cosPhi, z: -sinPhi * sinHour },
    sunDirection: { x: Math.cos(delta), y: Math.sin(delta), z: 0 },
  }
}
