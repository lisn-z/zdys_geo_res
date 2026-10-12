import { getMoonDirection, type Vec3 } from './moon-geometry'
import { MOON_DISC_ANGULAR_RADIUS, MOON_SPACE_SCALE } from './moon-texture'

/**
 * Render-only projection: keep the compressed orbital overview, then remove
 * its artificial parallax continuously as the camera approaches the Earth.
 * Camera positions at a station map to the exact eye used by getObservation.
 * Basing the transition on the moving camera also handles station transfers
 * and flights back to an orbital view without switching coordinate systems.
 */
export function getSpaceMoonPresentation(phase: number, camera: Vec3) {
  const { earthRadius, surfaceEyeHeight, orbitRadius, moonRadius } = MOON_SPACE_SCALE
  const eyeRadius = earthRadius + surfaceEyeHeight
  const cameraRadius = Math.hypot(camera.x, camera.y, camera.z)
  const clearance = Math.max(0, cameraRadius - eyeRadius)
  const progress = Math.max(0, Math.min(1, (clearance - earthRadius * 0.02) / (earthRadius * 0.98)))
  const correction = 1 - progress * progress * (3 - 2 * progress)
  const angle = phase * Math.PI / 180
  const overview = { x: orbitRadius * Math.cos(angle), y: 0, z: -orbitRadius * Math.sin(angle) }
  const distance = Math.hypot(overview.x - camera.x, overview.y - camera.y, overview.z - camera.z)
  const direction = getMoonDirection(phase, { x: camera.x / eyeRadius, y: camera.y / eyeRadius, z: camera.z / eyeRadius })
  const up = cameraRadius > 0
    ? { x: camera.x / cameraRadius, y: camera.y / cameraRadius, z: camera.z / cameraRadius }
    : { x: 0, y: 1, z: 0 }
  return {
    position: {
      x: overview.x + (camera.x + direction.x * distance - overview.x) * correction,
      y: overview.y + (camera.y + direction.y * distance - overview.y) * correction,
      z: overview.z + (camera.z + direction.z * distance - overview.z) * correction,
    },
    radius: moonRadius + (distance * Math.sin(MOON_DISC_ANGULAR_RADIUS) - moonRadius) * correction,
    correction,
    up,
    aboveHorizon: direction.x * up.x + direction.y * up.y + direction.z * up.z > 0,
  }
}
