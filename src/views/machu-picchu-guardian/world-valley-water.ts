import * as THREE from 'three'
import { RIVER_LEVEL, RIVER_FROM_Z, RIVER_TO_Z, RIVER_HALF_WIDTH, riverCentreX } from './world-terrain'

/** A narrow river follows the cut valley bed, far below the inhabited ridge. */
export function createValleyRiver(source: THREE.MeshPhysicalMaterial) {
  const segments = 240, positions: number[] = [], uv: number[] = [], indices: number[] = []
  for (let row = 0; row <= segments; row++) {
    const t = row / segments, z = THREE.MathUtils.lerp(RIVER_FROM_Z, RIVER_TO_Z, t)
    for (const side of [-1, 1]) {
      positions.push(riverCentreX(z) + side * RIVER_HALF_WIDTH, RIVER_LEVEL, z)
      uv.push((side + 1) * 1.5, t * 24)
    }
    if (row < segments) { const a = row * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices); geometry.computeVertexNormals()
  const material = source.clone()
  material.color.set('#54777b'); material.opacity = .93; material.roughness = .27
  material.normalScale.set(.25, .25); material.depthWrite = false
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'valley-river-below-the-citadel'; mesh.renderOrder = 2
  return {
    group: mesh,
    update() {
      if (material.normalMap !== source.normalMap) { material.normalMap = source.normalMap; material.needsUpdate = true }
    },
  }
}
