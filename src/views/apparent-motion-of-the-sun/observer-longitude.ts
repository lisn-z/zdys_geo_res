/**
 * 地球纹理绕北极轴的旋转角（弧度），东经为正。
 * H 是所选地点的地方太阳时时角；旋转 H−λ 后，该经线上的观测点
 * 位于 H 对应的空间方向。改变经度不改变同一地方太阳时的太阳高度。
 */
export function getEarthSpinAngle(hourAngle: number, longitude: number): number {
  if (!Number.isFinite(hourAngle) || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    throw new RangeError('时角须为有限数值，经度须在 −180° 至 180° 内')
  }
  return (hourAngle - longitude) * (Math.PI / 180)
}
