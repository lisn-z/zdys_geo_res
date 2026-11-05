import * as THREE from 'three'
import { createDubaiFisherman } from './dubai-fisherman'

/** A small cast net attached to the fishing dhow's port rail. Local units use
 * the dhow's existing scale; the net opens toward its local -X / world +Z side. */
export function createFishingNetAnimation(): {
  group: THREE.Group; update(deltaSeconds: number): void; reset(): void; dispose(): void
} {
  const group = new THREE.Group()
  group.name = 'fishing-dhow-casting-net-cycle'
  const fisherman = createDubaiFisherman()
  fisherman.group.position.set(-.13, .045, .065)
  for (const name of ['dubai-fisherman-left-foot', 'dubai-fisherman-right-foot']) {
    const foot = fisherman.group.getObjectByName(name)!
    // Dhow deck rises very slightly toward its bow. Correct the two fixed sole
    // joints independently; articulation preserves these stationary foot offsets.
    const deckZ = fisherman.group.position.z + foot.position.z
    foot.position.y = Math.max(0, deckZ) / .36 * .00275
  }
  group.add(fisherman.group)
  const handPosition = new THREE.Vector3()
  const sides = 32, rings = 8, count = 1 + sides * rings
  const positions = new Float32Array(count * 3), uv = new Float32Array(count * 2)
  const radial = new Float32Array(count), cosine = new Float32Array(count), sine = new Float32Array(count)
  const indices: number[] = []
  uv[0] = uv[1] = 3
  for (let ring = 1; ring <= rings; ring++) for (let side = 0; side < sides; side++) {
    const index = 1 + (ring - 1) * sides + side, angle = side / sides * Math.PI * 2
    radial[index] = ring / rings; cosine[index] = Math.cos(angle); sine[index] = Math.sin(angle)
    uv[index * 2] = (1 + cosine[index]! * radial[index]!) * 3
    uv[index * 2 + 1] = (1 + sine[index]! * radial[index]!) * 3
    const next = 1 + (ring - 1) * sides + (side + 1) % sides
    if (ring === 1) indices.push(0, next, index)
    else {
      const prior = index - sides, priorNext = next - sides
      indices.push(prior, next, index, prior, priorNext, next)
    }
  }
  const gridSize = 32, pixels = new Uint8Array(gridSize * gridSize * 4)
  for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) {
    const index = (y * gridSize + x) * 4
    pixels[index] = 193; pixels[index + 1] = 180; pixels[index + 2] = 147
    pixels[index + 3] = x < 2 || y < 2 ? 235 : 0
  }
  const texture = new THREE.DataTexture(pixels, gridSize, gridSize)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true; texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true
  const netMaterial = new THREE.MeshStandardMaterial({ color: '#d7cdb2', map: texture, roughness: .96, alphaTest: .2, side: THREE.DoubleSide })
  netMaterial.forceSinglePass = true
  const geometry = new THREE.BufferGeometry()
  const position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', position); geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geometry.setIndex(indices)
  const mesh = new THREE.Mesh(geometry, netMaterial)
  mesh.name = 'flexible-open-mesh-cast-net'; mesh.frustumCulled = false; mesh.receiveShadow = true
  group.add(mesh)

  const rimPositions = new Float32Array(sides * 3), linePositions = new Float32Array(8 * 3)
  const rimGeometry = new THREE.BufferGeometry(), lineGeometry = new THREE.BufferGeometry()
  const rimAttribute = new THREE.BufferAttribute(rimPositions, 3).setUsage(THREE.DynamicDrawUsage)
  const lineAttribute = new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage)
  rimGeometry.setAttribute('position', rimAttribute); lineGeometry.setAttribute('position', lineAttribute)
  const ropeMaterial = new THREE.LineBasicMaterial({ color: '#796a4e' })
  const rim = new THREE.LineLoop(rimGeometry, ropeMaterial), tether = new THREE.Line(lineGeometry, ropeMaterial)
  rim.name = 'cast-net-rope-rim'; tether.name = 'cast-net-hauling-rope'
  rim.frustumCulled = tether.frustumCulled = false
  group.add(rim, tether)
  const weights = new THREE.InstancedMesh(new THREE.SphereGeometry(.014, 6, 4), new THREE.MeshStandardMaterial({ color: '#c5ae72', roughness: .9 }), 8)
  weights.name = 'cast-net-rim-floats'; weights.frustumCulled = false
  group.add(weights)
  const transform = new THREE.Object3D()
  const state = { phase: 'rest', elapsed: 0, radius: .035, centreX: -.30, centreY: .18 }
  group.userData.castNet = state
  let elapsed = 0, disposed = false
  const ease = (value: number) => THREE.MathUtils.smoothstep(value, 0, 1)

  function pose(): void {
    const time = elapsed % 11
    const cast = time >= 1 && time < 2.7 ? Math.sin(Math.PI * (time - 1) / 1.7) : 0
    const haulPhase = (time - 5.5) / 3.8
    const haul = time >= 5.5 && time < 9.3 ? ease(haulPhase / .18) * ease((1 - haulPhase) / .18) : 0
    fisherman.pose(cast, haul, 1 - Math.max(cast, haul), elapsed)
    fisherman.rightHand.getWorldPosition(handPosition)
    group.worldToLocal(handPosition)
    let centreX = -.30, centreY = .18, radius = .035, sag = .045
    if (time >= 1 && time < 2.7) {
      const t = (time - 1) / 1.7, travel = ease(t)
      centreX = THREE.MathUtils.lerp(-.30, -.82, travel)
      centreY = THREE.MathUtils.lerp(.18, .045, travel) + Math.sin(Math.PI * t) * .48
      radius = THREE.MathUtils.lerp(.035, .47, ease(Math.min(1, t * 1.4)))
      sag = THREE.MathUtils.lerp(.045, .11, t)
    } else if (time >= 2.7 && time < 5.5) {
      const t = ease((time - 2.7) / 2.8)
      centreX = -.82; centreY = .045
      radius = .47; sag = THREE.MathUtils.lerp(.11, .15, t)
    } else if (time >= 5.5 && time < 7.4) {
      const t = ease((time - 5.5) / 1.9)
      centreX = THREE.MathUtils.lerp(-.82, -.62, t)
      centreY = THREE.MathUtils.lerp(.045, .07, t)
      radius = THREE.MathUtils.lerp(.47, .16, t); sag = THREE.MathUtils.lerp(.15, .22, t)
    } else if (time >= 7.4 && time < 9.3) {
      const t = ease((time - 7.4) / 1.9)
      centreX = THREE.MathUtils.lerp(-.62, -.30, t)
      centreY = THREE.MathUtils.lerp(.07, .18, t)
      radius = THREE.MathUtils.lerp(.16, .035, t); sag = THREE.MathUtils.lerp(.22, .045, t)
    }
    // The net bag droops below a rim with small cork floats. The rim stays above
    // the opaque water while the bag sinks, so the soaking phase remains legible.
    for (let index = 0; index < count; index++) {
      const r = radial[index]!, c = cosine[index]!, s = sine[index]!
      positions[index * 3] = centreX + c * radius * r
      positions[index * 3 + 1] = centreY - sag * (1 - r * r) + Math.sin(index * 2.4) * .004 * r
      positions[index * 3 + 2] = -.12 + s * radius * r
    }
    for (let side = 0; side < sides; side++) {
      const index = 1 + (rings - 1) * sides + side
      rimPositions[side * 3] = positions[index * 3]!
      rimPositions[side * 3 + 1] = positions[index * 3 + 1]!
      rimPositions[side * 3 + 2] = positions[index * 3 + 2]!
      if (side % 4 === 0) {
        transform.position.set(rimPositions[side * 3]!, rimPositions[side * 3 + 1]!, rimPositions[side * 3 + 2]!)
        transform.updateMatrix(); weights.setMatrixAt(side / 4, transform.matrix)
      }
    }
    for (let index = 0; index < 8; index++) {
      const t = index / 7
      linePositions[index * 3] = THREE.MathUtils.lerp(handPosition.x, centreX + radius, t)
      linePositions[index * 3 + 1] = THREE.MathUtils.lerp(handPosition.y, centreY, t) - Math.sin(t * Math.PI) * .025
      linePositions[index * 3 + 2] = THREE.MathUtils.lerp(handPosition.z, -.12, t)
    }
    position.needsUpdate = rimAttribute.needsUpdate = lineAttribute.needsUpdate = true
    weights.instanceMatrix.needsUpdate = true
    geometry.computeVertexNormals()
    state.phase = time < 1 || time >= 9.3 ? 'rest' : time < 2.7 ? 'casting' : time < 5.5 ? 'soaking' : 'hauling'
    state.elapsed = elapsed; state.radius = radius; state.centreX = centreX; state.centreY = centreY
  }
  pose()
  return {
    group,
    update(deltaSeconds) { if (disposed) return; elapsed += THREE.MathUtils.clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, .05); pose() },
    reset() { if (disposed) return; elapsed = 0; pose() },
    // All meshes/lines remain under the landscape and use its unified disposal.
    dispose() { disposed = true },
  }
}
