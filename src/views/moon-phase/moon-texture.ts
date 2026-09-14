import type { Observation, Vec3 } from './moon-geometry'

/** Shared with the original space-scene spheres and surface camera. */
export const MOON_SPACE_SCALE = {
  earthRadius: 5.6,
  orbitRadius: 22,
  moonRadius: 1.5,
  surfaceEyeHeight: 0.012,
} as const

export const MOON_TEXTURE_URLS = [
  '/geo-resources-folder/images/moon.jpg',
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/moon.jpg',
] as const

/** Matches Three.js SphereGeometry; keep U continuous for GPU mipmap derivatives. */
export const MOON_SPHERE_UV_GLSL = `
  vec2 moonSphereUv(vec3 normal) {
    float longitude = dot(normal.xz, normal.xz) < 0.00000001 ? 0.0 : atan(normal.z, -normal.x);
    return vec2(longitude / 6.28318530718, asin(clamp(normal.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
  }
`

export interface MoonTextureProjection {
  /** Camera basis expressed in the original Moon mesh's local coordinates. */
  right: Vec3
  up: Vec3
  towardEye: Vec3
  /** Actual space Moon radius / distance to its surface observer. */
  radiusToDistance: number
}

export type MoonTextureObserver = Pick<Observation, 'up' | 'north'>
export type MoonUv = { u: number; v: number }
const DEG = Math.PI / 180
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v.x, v.y, v.z)
  return { x: v.x / length, y: v.y / length, z: v.z / length }
}

/** UVs have bottom-up V, as in Three.js; an ImageData row uses 1 - V. */
export function moonSphereUv(normal: Vec3, result: MoonUv = { u: 0, v: 0 }): MoonUv {
  const longitude = normal.x * normal.x + normal.z * normal.z < 1e-8 ? 0 : Math.atan2(normal.z, -normal.x)
  result.u = ((longitude / (2 * Math.PI)) % 1 + 1) % 1
  result.v = Math.asin(Math.max(-1, Math.min(1, normal.y))) / Math.PI + 0.5
  return result
}

/**
 * Reproduce the original space-scene surface camera looking at the actual Moon
 * mesh. Its exaggerated distances affect texture parallax and perspective.
 * Moon.rotation.y = phase; transforming this camera basis by the inverse
 * rotation preserves the same lunar longitudes, poles, and visible hemisphere.
 * Lighting intentionally remains separate and uses the true observation model.
 */
export function getMoonTextureProjection(phase: number, observer?: MoonTextureObserver): MoonTextureProjection {
  const angle = phase * DEG
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const eyeRadius = observer ? MOON_SPACE_SCALE.earthRadius + MOON_SPACE_SCALE.surfaceEyeHeight : 0
  const vertical = observer?.up ?? { x: 0, y: 1, z: 0 }
  const toEye: Vec3 = {
    x: vertical.x * eyeRadius - MOON_SPACE_SCALE.orbitRadius * cos,
    y: vertical.y * eyeRadius,
    z: vertical.z * eyeRadius + MOON_SPACE_SCALE.orbitRadius * sin,
  }
  const distance = Math.hypot(toEye.x, toEye.y, toEye.z)
  const towardEye = normalize(toEye)
  let right = cross(vertical, towardEye)
  if (dot(right, right) < 1e-12) right = cross(observer?.north ?? { x: 0, y: 0, z: 1 }, towardEye)
  right = normalize(right)
  const screenUp = normalize(cross(towardEye, right))
  const toMoonLocal = (v: Vec3): Vec3 => ({ x: cos * v.x - sin * v.z, y: v.y, z: sin * v.x + cos * v.z })
  return {
    right: toMoonLocal(right),
    up: toMoonLocal(screenUp),
    towardEye: toMoonLocal(towardEye),
    radiusToDistance: MOON_SPACE_SCALE.moonRadius / distance,
  }
}

/**
 * Sample the sphere at normalized image coordinates (+Y up). This is the exact
 * ray/sphere intersection for a disk framed at its apparent silhouette, not a
 * square crop or an orthographic approximation. The reusable output avoids
 * allocation inside the canvas renderer's pixel loop.
 */
export function moonTextureUvAt(projection: MoonTextureProjection, x: number, y: number, result: MoonUv = { u: 0, v: 0 }): MoonUv | null {
  const squared = x * x + y * y
  if (squared > 1) return null
  const q = projection.radiusToDistance
  const qSquared = q * q
  const front = Math.sqrt(Math.max(0, 1 - squared))
  const denominator = 1 - qSquared * (1 - squared)
  const sideScale = Math.sqrt(1 - qSquared) * (1 - q * front) / denominator
  const nx = x * sideScale
  const ny = y * sideScale
  const nz = (q * squared + (1 - qSquared) * front) / denominator
  return moonSphereUv({
    x: projection.right.x * nx + projection.up.x * ny + projection.towardEye.x * nz,
    y: projection.right.y * nx + projection.up.y * ny + projection.towardEye.y * nz,
    z: projection.right.z * nx + projection.up.z * ny + projection.towardEye.z * nz,
  }, result)
}
