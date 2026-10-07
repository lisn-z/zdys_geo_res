import * as THREE from 'three'

export const WIND_ARROW_PHASES = [0, 0.5] as const

export function createWindCurve(
  definition: { from: number; to: number; lonFrom: number; lonTo: number },
  longitude: number,
  radius: number,
) {
  const points = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    const lat = (THREE.MathUtils.lerp(definition.from, definition.to, t) * Math.PI) / 180
    const lon = ((longitude + THREE.MathUtils.lerp(definition.lonFrom, definition.lonTo, t)) * Math.PI) / 180
    return new THREE.Vector3(
      radius * Math.cos(lat) * Math.cos(lon),
      radius * Math.sin(lat),
      -radius * Math.cos(lat) * Math.sin(lon),
    )
  })
  return new THREE.CatmullRomCurve3(points)
}

// One placement rule for construction and animation prevents a first-frame jump.
export function surfaceArrowFrame(progress: number, span: number, direction = 1, inset = 0.06) {
  const phase = THREE.MathUtils.euclideanModulo(progress, 1)
  return {
    start: inset + phase * (1 - inset * 2 + span) - (direction > 0 ? span : 0),
    clipMin: inset,
    clipMax: 1 - inset,
  }
}

// Flat ribbons follow the sphere rather than extruding cones or cylindrical shafts.
const rows = [0, 0.14, 0.28, 0.42, 0.56, 0.7]
export function createSurfaceArrowGeometry() {
  const geometry = new THREE.BufferGeometry()
  const count = rows.length * 2 + 4
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage),
  )
  const uv: number[] = [],
    indices: number[] = []
  rows.forEach((t, i) => {
    uv.push(t, 0, t, 1)
    if (i < rows.length - 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  })
  uv.push(0.7, 0, 0.7, 1, 1, 0.5, 1, 0.5)
  indices.push(count - 4, count - 3, count - 2, count - 3, count - 1, count - 2)
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  return geometry
}

const center = new THREE.Vector3(),
  tangent = new THREE.Vector3(),
  normal = new THREE.Vector3(),
  side = new THREE.Vector3(),
  vertex = new THREE.Vector3()
export function updateSurfaceArrow(
  geometry: THREE.BufferGeometry,
  curve: THREE.Curve<THREE.Vector3>,
  start: number,
  span: number,
  direction: number,
  radius: number,
  halfWidth: number,
  clipMin = 0,
  clipMax = 1,
) {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  // Clip in the arrow's longitudinal coordinates. The head becomes a trapezoid
  // as its tip crosses the boundary; no stretching or per-arrow opacity fade.
  const boundaryA = (clipMin - start) / (span * direction)
  const boundaryB = (clipMax - start) / (span * direction)
  const visibleMin = THREE.MathUtils.clamp(Math.min(boundaryA, boundaryB), 0, 1)
  const visibleMax = THREE.MathUtils.clamp(Math.max(boundaryA, boundaryB), 0, 1)
  let index = 0
  const pair = (t: number, width: number) => {
    const sample = THREE.MathUtils.clamp(start + t * span * direction, clipMin, clipMax)
    curve.getPoint(sample, center).normalize().multiplyScalar(radius)
    curve.getTangent(sample, tangent).multiplyScalar(direction)
    normal.copy(center).normalize()
    side.crossVectors(normal, tangent).normalize()
    for (const sign of [-1, 1]) {
      vertex
        .copy(center)
        .addScaledVector(side, width * sign)
        .normalize()
        .multiplyScalar(radius)
      uv.setXY(index, t, sign < 0 ? 0 : 1)
      position.setXYZ(index++, vertex.x, vertex.y, vertex.z)
    }
  }
  const shaftMin = Math.min(visibleMin, 0.7)
  const shaftMax = Math.min(visibleMax, 0.7)
  for (const t of rows) pair(THREE.MathUtils.clamp(t, shaftMin, shaftMax), halfWidth)
  for (const t of [0.7, 1]) {
    const clipped = THREE.MathUtils.clamp(t, Math.max(0.7, visibleMin), Math.max(0.7, visibleMax))
    pair(clipped, (halfWidth * 2.65 * (1 - clipped)) / 0.3)
  }
  position.needsUpdate = true
  uv.needsUpdate = true
}
