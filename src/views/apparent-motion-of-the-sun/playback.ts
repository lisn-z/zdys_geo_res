/** 1× 每真实秒推进 9°，即 40 秒完成一个太阳日周。 */
export const BASE_HOUR_ANGLE_SPEED = 9

/**
 * 按真实经过时间推进时角，跨午夜或多个周期时保留剩余角度。
 * 正常推进采用 [-180, 180) 的等价时角；暂停保留 180° / 24:00 端点。
 * 此处不截断较长帧间隔；页面隐藏、恢复时的时钟重置由调用方处理。
 */
export function advanceHourAngle(
  hourAngle: number,
  speed: number,
  deltaSeconds: number,
): number {
  if (
    !Number.isFinite(hourAngle) ||
    !Number.isFinite(speed) || speed <= 0 ||
    !Number.isFinite(deltaSeconds) || deltaSeconds <= 0
  ) return hourAngle

  const nextAngle = hourAngle + BASE_HOUR_ANGLE_SPEED * speed * deltaSeconds
  if (!Number.isFinite(nextAngle)) return hourAngle

  return ((nextAngle + 180) % 360 + 360) % 360 - 180
}
