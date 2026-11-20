import * as THREE from 'three'

/**
 * Sweep a filled meridional cell through longitude, including both filled caps.
 * This is the volume occupied by the cell, not a tube around its outline.
 * The input may have longitude shear: cap triangulation uses (horizontal radius,
 * height), but every vertex retains the input curve's original longitude.
 * Width is illustrative/exaggerated for teaching, not atmospheric scale.
 */
export function createCirculationVolumeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  longitudeWidthDegrees: number,
  samples = 120,
  slices = 24,
) {
  if (!Number.isFinite(longitudeWidthDegrees) || longitudeWidthDegrees <= 0 || longitudeWidthDegrees >= 180) {
    throw new RangeError('Cell longitude width must be between 0 and 180 degrees')
  }
  if (!Number.isInteger(samples) || samples < 8 || !Number.isInteger(slices) || slices < 1) {
    throw new RangeError('Cell volume requires at least eight samples and one sweep slice')
  }
  const boundary = Array.from({ length: samples }, (_, i) => curve.getPointAt(i / samples))
  let contour = boundary.map(p => new THREE.Vector2(Math.hypot(p.x, p.z), p.y))
  // The vertical branches contain collinear samples. Ear clipping those samples
  // can make zero-area cap slivers after Float32 conversion; simplify the shared
  // boundary before making either caps or skin so no cracks/T-junctions remain.
  for (let i = contour.length - 1; i >= 0 && contour.length > 8; i--) {
    const a = contour[(i + contour.length - 1) % contour.length]!
    const b = contour[i]!, c = contour[(i + 1) % contour.length]!
    const ac = c.clone().sub(a), ab = b.clone().sub(a)
    const along = ab.dot(ac) / Math.max(1e-12, ac.lengthSq())
    const distance = Math.abs(ac.x * ab.y - ac.y * ab.x) / Math.max(1e-12, ac.length())
    if (distance < 1e-6 && along >= 0 && along <= 1) {
      boundary.splice(i, 1)
      contour.splice(i, 1)
    }
  }
  samples = boundary.length
  // Counter-clockwise in the radial/height plane gives the first cap an outward
  // normal, since increasing a Three.js Y rotation points towards -Z at +X.
  if (THREE.ShapeUtils.isClockWise(contour)) {
    boundary.reverse()
    contour.reverse()
  }
  const faces = THREE.ShapeUtils.triangulateShape(contour, [])
  const minX = Math.min(...contour.map(p => p.x)), maxX = Math.max(...contour.map(p => p.x))
  const minY = Math.min(...contour.map(p => p.y)), maxY = Math.max(...contour.map(p => p.y))
  const spanX = Math.max(1e-8, maxX - minX), spanY = Math.max(1e-8, maxY - minY)
  const halfWidth = THREE.MathUtils.degToRad(longitudeWidthDegrees) / 2
  const axis = new THREE.Vector3(0, 1, 0)
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  const addVertex = (point: THREE.Vector3, angle: number, u: number, v: number) => {
    const p = point.clone().applyAxisAngle(axis, angle)
    const index = positions.length / 3
    positions.push(p.x, p.y, p.z)
    uvs.push(u, v)
    return index
  }

  // Duplicate seam vertices only for UV continuity, not as repeated curve samples.
  // Each cap has its own vertices to keep crisp normals where the skin meets it.
  for (let j = 0; j <= slices; j++) {
    const angle = THREE.MathUtils.lerp(-halfWidth, halfWidth, j / slices)
    for (let i = 0; i <= samples; i++) {
      addVertex(boundary[i % samples]!, angle, j / slices, i / samples)
    }
  }
  for (let j = 0; j < slices; j++) {
    for (let i = 0; i < samples; i++) {
      const a = j * (samples + 1) + i, b = a + 1
      const c = a + samples + 1, d = c + 1
      indices.push(a, c, d, a, d, b)
    }
  }
  const skinIndexCount = indices.length
  for (const cap of [-1, 1]) {
    const start = positions.length / 3
    for (let i = 0; i < samples; i++) {
      const p = contour[i]!
      addVertex(boundary[i]!, cap * halfWidth, (p.x - minX) / spanX, (p.y - minY) / spanY)
    }
    for (const face of faces) {
      const [a, b, c] = face as [number, number, number]
      indices.push(start + a, start + (cap < 0 ? b : c), start + (cap < 0 ? c : b))
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.name = 'filled-circulation-volume'
  geometry.userData.longitudeWidthDegrees = longitudeWidthDegrees
  geometry.userData.boundarySamples = samples
  geometry.userData.skinIndexCount = skinIndexCount
  geometry.userData.capTriangleCount = faces.length
  return geometry
}
