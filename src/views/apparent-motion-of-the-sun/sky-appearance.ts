export type SkyRgb = [number, number, number]

export interface SkyAppearance {
  skyTop: SkyRgb
  skyMid: SkyRgb
  skyHorizon: SkyRgb
  groundMid: SkyRgb
  groundDark: SkyRgb
  ambientColor: SkyRgb
  /** 保留渲染前的原始尺度，调用方再乘场景亮度系数。 */
  ambientIntensity: number
  hemisphereSkyColor: SkyRgb
  hemisphereGroundColor: SkyRgb
  hemisphereIntensity: number
  groundColor: SkyRgb
}

interface SkyKeyframe {
  altitude: number
  appearance: SkyAppearance
}

/**
 * 视觉示意配色，不是天空辐射传输模型。亮度只由当前太阳高度决定：
 * 极夜表示没有日出，不代表全天没有曙暮光；极昼也可以有低高度的太阳。
 * 使用同一组锚点的连续插值，避免在 −6°、0° 等分支边界跳变。
 * 沿用场景原有的深蓝夜空、暖色地平线和蓝色日间天空。
 */
const keyframes: readonly SkyKeyframe[] = [
  {
    altitude: -18,
    appearance: {
      skyTop: [5, 8, 20], skyMid: [12.5, 19, 37.5], skyHorizon: [20, 30, 55],
      groundMid: [12, 18, 8], groundDark: [8, 12, 5],
      ambientColor: [12, 20, 45], ambientIntensity: 0.3,
      hemisphereSkyColor: [20, 35, 65], hemisphereGroundColor: [12, 18, 8],
      hemisphereIntensity: 0.25, groundColor: [15, 25, 12],
    },
  },
  {
    altitude: -12,
    appearance: {
      skyTop: [8, 12, 30], skyMid: [15, 25, 55], skyHorizon: [25, 35, 70],
      groundMid: [15, 25, 10], groundDark: [10, 15, 6],
      ambientColor: [15, 25, 55], ambientIntensity: 0.3,
      hemisphereSkyColor: [20, 35, 65], hemisphereGroundColor: [15, 25, 10],
      hemisphereIntensity: 0.25, groundColor: [18, 28, 14],
    },
  },
  {
    altitude: -6,
    appearance: {
      skyTop: [30, 40, 80], skyMid: [80, 70, 100], skyHorizon: [220, 120, 60],
      groundMid: [30, 45, 20], groundDark: [15, 25, 10],
      ambientColor: [25, 35, 70], ambientIntensity: 0.38,
      hemisphereSkyColor: [30, 45, 85], hemisphereGroundColor: [30, 45, 20],
      hemisphereIntensity: 0.33, groundColor: [22, 34, 16],
    },
  },
  {
    altitude: 0,
    appearance: {
      skyTop: [70, 100, 160], skyMid: [140, 160, 200], skyHorizon: [255, 170, 80],
      groundMid: [42, 75, 32], groundDark: [30, 45, 20],
      ambientColor: [100, 140, 200], ambientIntensity: 1.1,
      hemisphereSkyColor: [130, 160, 210], hemisphereGroundColor: [50, 100, 40],
      hemisphereIntensity: 1.05, groundColor: [50, 100, 40],
    },
  },
  {
    altitude: 15,
    appearance: {
      skyTop: [70, 130, 210], skyMid: [120, 170, 230], skyHorizon: [180, 210, 235],
      groundMid: [60, 120, 50], groundDark: [48, 90, 38],
      ambientColor: [160, 210, 240], ambientIntensity: 1.6,
      hemisphereSkyColor: [170, 210, 240], hemisphereGroundColor: [60, 120, 50],
      hemisphereIntensity: 1.35, groundColor: [60, 120, 50],
    },
  },
  {
    altitude: 45,
    appearance: {
      skyTop: [80, 150, 220], skyMid: [150, 190, 240], skyHorizon: [200, 220, 240],
      groundMid: [70, 140, 55], groundDark: [60, 120, 50],
      ambientColor: [190, 230, 250], ambientIntensity: 1.9,
      hemisphereSkyColor: [190, 230, 250], hemisphereGroundColor: [70, 140, 55],
      hemisphereIntensity: 1.55, groundColor: [70, 140, 55],
    },
  },
]

function mix(from: number, to: number, fraction: number): number {
  return from + (to - from) * fraction
}

function mixColor(from: SkyRgb, to: SkyRgb, fraction: number): SkyRgb {
  // 保留浮点通道，不在插值阶段取整，以维持连续性。
  return [
    mix(from[0], to[0], fraction),
    mix(from[1], to[1], fraction),
    mix(from[2], to[2], fraction),
  ]
}

function interpolate(from: SkyAppearance, to: SkyAppearance, fraction: number): SkyAppearance {
  return {
    skyTop: mixColor(from.skyTop, to.skyTop, fraction),
    skyMid: mixColor(from.skyMid, to.skyMid, fraction),
    skyHorizon: mixColor(from.skyHorizon, to.skyHorizon, fraction),
    groundMid: mixColor(from.groundMid, to.groundMid, fraction),
    groundDark: mixColor(from.groundDark, to.groundDark, fraction),
    ambientColor: mixColor(from.ambientColor, to.ambientColor, fraction),
    ambientIntensity: mix(from.ambientIntensity, to.ambientIntensity, fraction),
    hemisphereSkyColor: mixColor(from.hemisphereSkyColor, to.hemisphereSkyColor, fraction),
    hemisphereGroundColor: mixColor(from.hemisphereGroundColor, to.hemisphereGroundColor, fraction),
    hemisphereIntensity: mix(from.hemisphereIntensity, to.hemisphereIntensity, fraction),
    groundColor: mixColor(from.groundColor, to.groundColor, fraction),
  }
}

/**
 * 输入当前太阳高度（度）。−18° 以下使用深夜色，45° 以上保持日间色。
 * 返回独立的 RGB 数组，调用方调整配色不会修改后续调用使用的锚点。
 */
export function getSkyAppearance(sunAltitude: number): SkyAppearance {
  if (!Number.isFinite(sunAltitude)) throw new RangeError('太阳高度必须为有限数值')
  const first = keyframes[0]!
  if (sunAltitude <= first.altitude) return interpolate(first.appearance, first.appearance, 0)
  for (let index = 1; index < keyframes.length; index++) {
    const previous = keyframes[index - 1]!
    const next = keyframes[index]!
    if (sunAltitude <= next.altitude) {
      const fraction = (sunAltitude - previous.altitude) / (next.altitude - previous.altitude)
      return interpolate(previous.appearance, next.appearance, fraction)
    }
  }
  const last = keyframes[keyframes.length - 1]!
  return interpolate(last.appearance, last.appearance, 0)
}
