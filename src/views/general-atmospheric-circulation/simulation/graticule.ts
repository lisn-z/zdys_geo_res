import * as THREE from 'three'
import { OBLIQUITY, POLAR_CIRCLE } from './model.ts'

// Match earth-motion's reference latitude colors and dash proportions.
export const latitudeStyles = [
  { key: 'equator', label: '赤道', latitudes: [0], color: '#ff4058', opacity: .98, dashSize: 0 },
  { key: 'tropics', label: '南北回归线', latitudes: [-OBLIQUITY, OBLIQUITY], color: '#ffd447', opacity: .98, dashSize: .085 },
  { key: 'polarCircles', label: '南北极圈', latitudes: [-POLAR_CIRCLE, POLAR_CIRCLE], color: '#66d9ff', opacity: .9, dashSize: .07 },
] as const

export function createReferenceLatitudes(earthRadius: number) {
  const group = new THREE.Group()
  group.name = 'reference-latitudes'
  const radius = earthRadius * 1.012
  const scale = earthRadius / 1.35
  for (const style of latitudeStyles) {
    for (const latitude of style.latitudes) {
      const points: THREE.Vector3[] = []
      const lat = THREE.MathUtils.degToRad(latitude)
      for (let longitude = -180; longitude <= 180; longitude += 2) {
        const lon = THREE.MathUtils.degToRad(longitude)
        points.push(new THREE.Vector3(
          radius * Math.cos(lat) * Math.cos(lon),
          radius * Math.sin(lat),
          -radius * Math.cos(lat) * Math.sin(lon),
        ))
      }
      const options = {
        color: style.color, transparent: true, opacity: style.opacity,
        depthTest: true, depthWrite: false, toneMapped: false,
      }
      const material = style.dashSize
        ? new THREE.LineDashedMaterial({ ...options, dashSize: style.dashSize * scale, gapSize: .055 * scale })
        : new THREE.LineBasicMaterial(options)
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)
      line.name = `${style.key}-${latitude}`
      line.userData.latitude = latitude
      if (style.dashSize) line.computeLineDistances()
      // Keep the equator identifiable when the solar latitude coincides with it.
      line.renderOrder = 6
      group.add(line)
    }
  }
  return group
}
