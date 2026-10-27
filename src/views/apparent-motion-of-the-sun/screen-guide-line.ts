import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial, type LineMaterialParameters } from 'three/examples/jsm/lines/LineMaterial.js'

/** CSS-pixel width; Line2.onBeforeRender keeps resolution in sync with the viewport. */
export function createScreenGuideLine(pointCount: number, parameters: LineMaterialParameters) {
  const geometry = new LineGeometry()
  geometry.setPositions(new Float32Array(pointCount * 3))
  const material = new LineMaterial({
    worldUnits: false, depthWrite: false, toneMapped: false, alphaToCoverage: true,
    ...parameters,
  })
  const line = new Line2(geometry, material)
  const positions = geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute
  positions.data.setUsage(THREE.DynamicDrawUsage)
  if (material.dashed) {
    line.computeLineDistances()
    const distances = geometry.getAttribute('instanceDistanceStart') as THREE.InterleavedBufferAttribute
    distances.data.setUsage(THREE.DynamicDrawUsage)
  }
  return line
}

/** Update the existing GPU buffers; daily animation must not allocate new geometries. */
export function writeScreenGuidePoints(line: Line2, points: readonly { x: number; y: number; z: number }[], scale: number) {
  const geometry = line.geometry
  const starts = geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute
  const ends = geometry.getAttribute('instanceEnd') as THREE.InterleavedBufferAttribute
  const distanceStarts = geometry.getAttribute('instanceDistanceStart') as THREE.InterleavedBufferAttribute | undefined
  const distanceEnds = geometry.getAttribute('instanceDistanceEnd') as THREE.InterleavedBufferAttribute | undefined
  let distance = 0
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!
    const end = points[index + 1]!
    starts.setXYZ(index, start.x * scale, start.y * scale, start.z * scale)
    ends.setXYZ(index, end.x * scale, end.y * scale, end.z * scale)
    distanceStarts?.setX(index, distance)
    distance += Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z) * scale
    distanceEnds?.setX(index, distance)
  }
  starts.data.needsUpdate = true
  if (distanceStarts) distanceStarts.data.needsUpdate = true
  geometry.instanceCount = Math.max(0, points.length - 1)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}
