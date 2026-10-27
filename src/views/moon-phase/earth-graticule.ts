import * as THREE from 'three'
import { EARTH_OBLIQUITY } from './moon-geometry'

const DEG = Math.PI / 180
// Match the earth-motion scene's angular dash spacing at any display radius.
const REFERENCE_EARTH_RADIUS = 1.35

function surfacePoint(latitude: number, longitude: number, radius: number) {
  const lat = latitude * DEG
  const lon = longitude * DEG
  return new THREE.Vector3(
    Math.cos(lon) * Math.cos(lat) * radius,
    Math.sin(lat) * radius,
    -Math.sin(lon) * Math.cos(lat) * radius,
  )
}

/**
 * Earth-local graticule: +Y is the north pole, +X is longitude zero.
 * Attach to the Earth mesh so its seasonal tilt and daily rotation stay aligned.
 * The caller owns geometry/material disposal; line materials are shared per layer.
 */
export function createEarthGraticule(radius: number): THREE.Group {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Earth graticule radius must be positive and finite')

  const root = new THREE.Group()
  root.name = 'earth-graticule'
  const grid = new THREE.Group()
  grid.name = 'grid'
  root.add(grid)

  const materialOptions = { transparent: true, depthTest: true, depthWrite: false, toneMapped: false }
  const gridMaterial = new THREE.LineBasicMaterial({ ...materialOptions, color: 0xa8fff6, opacity: 0.23 })

  function addLine(parent: THREE.Group, points: THREE.Vector3[], material: THREE.LineBasicMaterial, name: string) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    geometry.computeBoundingSphere()
    const line = new THREE.Line(geometry, material)
    line.name = name
    // Draw after the Earth has populated depth, retaining solid-body occlusion.
    line.renderOrder = 2
    if (material instanceof THREE.LineDashedMaterial) line.computeLineDistances()
    parent.add(line)
    return line
  }

  for (let longitude = 0; longitude < 360; longitude += 15) {
    const points: THREE.Vector3[] = []
    for (let latitude = -90; latitude <= 90; latitude += 3) points.push(surfacePoint(latitude, longitude, radius * 1.006))
    const line = addLine(grid, points, gridMaterial, `meridian-${longitude}`)
    line.userData.longitude = longitude
  }

  for (let latitude = -75; latitude <= 75; latitude += 15) {
    // Keep the red equator free of a coincident ordinary grid line.
    if (latitude === 0) continue
    const points: THREE.Vector3[] = []
    for (let longitude = -180; longitude <= 180; longitude += 3) points.push(surfacePoint(latitude, longitude, radius * 1.007))
    const line = addLine(grid, points, gridMaterial, `parallel-${latitude}`)
    line.userData.latitude = latitude
  }

  const scale = radius / REFERENCE_EARTH_RADIUS
  const layers = [
    { name: 'equator', latitudes: [0], color: 0xff4058, opacity: 0.98, dashSize: 0 },
    { name: 'tropics', latitudes: [-EARTH_OBLIQUITY, EARTH_OBLIQUITY], color: 0xffd447, opacity: 0.98, dashSize: 0.085 },
    { name: 'polarCircles', latitudes: [EARTH_OBLIQUITY - 90, 90 - EARTH_OBLIQUITY], color: 0x66d9ff, opacity: 0.9, dashSize: 0.07 },
  ]
  for (const layer of layers) {
    const group = new THREE.Group()
    group.name = layer.name
    root.add(group)
    const options = { ...materialOptions, color: layer.color, opacity: layer.opacity }
    const material = layer.dashSize
      ? new THREE.LineDashedMaterial({ ...options, dashSize: layer.dashSize * scale, gapSize: 0.055 * scale })
      : new THREE.LineBasicMaterial(options)
    for (const latitude of layer.latitudes) {
      const points: THREE.Vector3[] = []
      for (let longitude = -180; longitude <= 180; longitude += 2) points.push(surfacePoint(latitude, longitude, radius * 1.012))
      const line = addLine(group, points, material, `${layer.name}-${latitude}`)
      line.userData.latitude = latitude
    }
  }
  return root
}
