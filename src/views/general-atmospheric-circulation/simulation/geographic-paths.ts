import * as THREE from 'three'

// Geographic control points are schematic, never velocities or observations.
// Smooth the sparse geographic waypoints first, then resample the whole spline.
// Interpolating densely along each straight leg first would retain angular joins.
export function createGeographicCurve(waypoints: readonly (readonly [number, number])[], radius: number) {
  const controls: THREE.Vector3[] = []
  let longitude = waypoints[0]![1]
  for (let i = 0; i < waypoints.length; i++) {
    if (i) longitude += THREE.MathUtils.euclideanModulo(waypoints[i]![1] - waypoints[i - 1]![1] + 180, 360) - 180
    controls.push(new THREE.Vector3(longitude, waypoints[i]![0], 0))
  }
  const geographic = new THREE.CatmullRomCurve3(controls, false, 'centripetal')
  const points: THREE.Vector3[] = []
  const append = (lat: number, lon: number) => {
    const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180
    points.push(new THREE.Vector3(
      radius * Math.cos(phi) * Math.cos(lambda), radius * Math.sin(phi),
      -radius * Math.cos(phi) * Math.sin(lambda),
    ))
  }
  const samples = Math.max(64, Math.ceil(geographic.getLength() * 4))
  for (let i = 0; i <= samples; i++) {
    const point = geographic.getPoint(i / samples)
    append(point.y, point.x)
  }
  return new THREE.CatmullRomCurve3(points)
}
