import * as THREE from 'three'
import { SeasonalWarp } from './seasonal-warp.ts'

type Renderable = THREE.Object3D & {
  geometry?: THREE.BufferGeometry
  material?: THREE.Material | THREE.Material[]
  morphTargetInfluences?: number[]
}
interface NodeCopy { source: THREE.Object3D; target: Renderable; seen: number }
interface MaterialCopy { source: THREE.Material; target: THREE.Material; sourceVersion: number; seen: number; warped: boolean }
const WARP_UNIFORMS = new Set(['climateShift', 'climateClipToEarth', 'climateEarthToClip'])

/** Copy mutable uniform values, retaining reusable allocations and shared texture ownership. */
function copyUniformValue(source: unknown, previous: unknown): unknown {
  if (source === null || typeof source !== 'object') return source
  if ((source as THREE.Texture).isTexture) return source
  // Three.UniformsUtils clones arrays shallowly. A nested struct can initially
  // still be the source object; never reuse it as our mutable destination.
  if (previous === source) previous = undefined
  if (Array.isArray(source)) {
    const target = Array.isArray(previous) ? previous : []
    target.length = source.length
    for (let i = 0; i < source.length; i++) target[i] = copyUniformValue(source[i], target[i])
    return target
  }
  if (ArrayBuffer.isView(source)) {
    const input = source as unknown as { constructor: new (value: unknown) => unknown; length: number }
    const target = previous as { constructor?: unknown; length?: number; set?: (value: unknown) => void } | undefined
    if (target?.constructor === input.constructor && target.length === input.length && target.set) {
      target.set(source); return target
    }
    return new input.constructor(source)
  }
  const input = source as { clone?: () => unknown; constructor: unknown }
  if (typeof input.clone === 'function') {
    const target = previous as { copy?: (value: unknown) => void; constructor?: unknown } | undefined
    if (target && target.constructor === input.constructor && typeof target.copy === 'function') {
      target.copy(source); return target
    }
    return input.clone()
  }
  const target = previous && typeof previous === 'object' ? previous as Record<string, unknown> : {}
  const record = source as Record<string, unknown>
  for (const key of Object.keys(target)) if (!(key in record)) delete target[key]
  for (const key of Object.keys(record)) target[key] = copyUniformValue(record[key], target[key])
  return target
}

/**
 * Mirrors existing teaching visuals into one comparison Earth.
 * Geometry (including dynamic attributes/drawRange) and texture images remain
 * source-owned; Object3D transforms and materials/uniform values are independent.
 * Run update AFTER the source animation update, before rendering this pane.
 */
export class CirculationComparisonBridge {
  readonly group = new THREE.Group()
  private readonly warp: SeasonalWarp
  private readonly warpHost = new THREE.Object3D() as Renderable
  private readonly nodes = new Map<THREE.Object3D, NodeCopy>()
  private readonly materials = new Map<THREE.Material, MaterialCopy>()
  private generation = 0
  private disposed = false

  constructor(shift: { value: number }) {
    this.group.name = 'comparison-circulation'
    this.warp = new SeasonalWarp(shift)
  }

  /** Read-only access for diagnostics; never animate the returned copies directly. */
  getClone(source: THREE.Object3D): THREE.Object3D | undefined { return this.nodes.get(source)?.target }

  private materialFor(source: THREE.Material): THREE.Material {
    let copy = this.materials.get(source)
    if (!copy) {
      // Material.clone deliberately does not copy onBeforeCompile closures. The
      // source SeasonalWarp captures the original globe/camera and must not leak.
      const target = source.clone()
      const warped = source.customProgramCacheKey().startsWith('seasonal-world-warp-')
      copy = { source, target, sourceVersion: source.version, seen: -1, warped }
      this.materials.set(source, copy)
      // Only material already warped in the source needs a seasonal warp. The
      // polar rotation guide and unwarped force references must not drift in latitude.
      if (warped) {
        // ShaderMaterial compilation mutates material.uniforms in place. If the
        // source has already compiled, its injected camera/shift uniforms are
        // present in clone() too; discard those until this pane injects its own.
        if ((target as THREE.ShaderMaterial).isShaderMaterial)
          for (const key of WARP_UNIFORMS) delete (target as THREE.ShaderMaterial).uniforms[key]
        this.warpHost.material = target
        this.warp.attach(this.warpHost)
      }
    }
    if (copy.seen === this.generation) return copy.target
    const target = copy.target
    if (copy.sourceVersion !== source.version) {
      const ownWarp = copy.warped && (target as THREE.ShaderMaterial).isShaderMaterial
        ? Object.fromEntries([...WARP_UNIFORMS].map(key => [key, (target as THREE.ShaderMaterial).uniforms[key]])) : null
      target.copy(source)
      if (ownWarp) for (const key of WARP_UNIFORMS) {
        if (ownWarp[key]) (target as THREE.ShaderMaterial).uniforms[key] = ownWarp[key]!
        else delete (target as THREE.ShaderMaterial).uniforms[key]
      }
      copy.sourceVersion = source.version
      target.needsUpdate = true
    }
    target.visible = source.visible
    target.opacity = source.opacity
    target.depthTest = source.depthTest
    target.depthWrite = source.depthWrite
    target.colorWrite = source.colorWrite
    target.transparent = source.transparent
    target.blending = source.blending
    target.side = source.side
    const sourceColor = (source as THREE.MeshBasicMaterial).color
    if (sourceColor) (target as THREE.MeshBasicMaterial).color.copy(sourceColor)
    const sourceShader = source as THREE.ShaderMaterial, targetShader = target as THREE.ShaderMaterial
    if (sourceShader.isShaderMaterial) {
      for (const key of Object.keys(targetShader.uniforms))
        if (!(copy.warped && WARP_UNIFORMS.has(key)) && !(key in sourceShader.uniforms)) delete targetShader.uniforms[key]
      for (const [key, uniform] of Object.entries(sourceShader.uniforms)) {
        if (copy.warped && WARP_UNIFORMS.has(key)) continue
        const previous = targetShader.uniforms[key]
        if (previous) previous.value = copyUniformValue(uniform.value, previous.value)
        else targetShader.uniforms[key] = { value: copyUniformValue(uniform.value, undefined) }
      }
      targetShader.uniformsNeedUpdate = true
    }
    copy.seen = this.generation
    return target
  }

  private makeNode(source: THREE.Object3D): Renderable {
    const input = source as Renderable
    const material = input.material
    const clonedMaterial = material && (Array.isArray(material)
      ? material.map(item => this.materialFor(item)) : this.materialFor(material))
    // Avoid Object3D.copy's JSON serialization of userData: source moving arrows
    // store live mesh/curve references there, not rendering state.
    if (source instanceof THREE.Mesh) return new THREE.Mesh(input.geometry, clonedMaterial)
    if (source instanceof THREE.LineSegments) return new THREE.LineSegments(input.geometry, clonedMaterial)
    if (source instanceof THREE.LineLoop) return new THREE.LineLoop(input.geometry, clonedMaterial)
    if (source instanceof THREE.Line) return new THREE.Line(input.geometry, clonedMaterial)
    if (source instanceof THREE.Points) return new THREE.Points(input.geometry, clonedMaterial)
    if (source instanceof THREE.Sprite) return new THREE.Sprite(clonedMaterial as THREE.SpriteMaterial)
    return source instanceof THREE.Group ? new THREE.Group() : new THREE.Object3D()
  }

  private syncNode(source: THREE.Object3D, parent: THREE.Object3D) {
    let copy = this.nodes.get(source)
    if (copy?.seen === this.generation) return
    if (!copy) {
      copy = { source, target: this.makeNode(source), seen: this.generation }
      this.nodes.set(source, copy)
    }
    copy.seen = this.generation
    const target = copy.target, input = source as Renderable
    if (target.parent !== parent) parent.add(target)
    target.name = source.name
    target.position.copy(source.position)
    target.quaternion.copy(source.quaternion)
    target.scale.copy(source.scale)
    target.matrix.copy(source.matrix)
    target.matrixAutoUpdate = source.matrixAutoUpdate
    // World matrices belong to the destination Earth, even if the source freezes them.
    target.matrixWorldAutoUpdate = true
    target.matrixWorldNeedsUpdate = true
    target.visible = source.visible
    target.renderOrder = source.renderOrder
    target.layers.mask = source.layers.mask
    target.frustumCulled = false
    target.castShadow = source.castShadow
    target.receiveShadow = source.receiveShadow
    if (input.geometry) target.geometry = input.geometry
    if (input.material) target.material = Array.isArray(input.material)
      ? input.material.map(material => this.materialFor(material)) : this.materialFor(input.material)
    if (input.morphTargetInfluences) target.morphTargetInfluences = copyUniformValue(input.morphTargetInfluences, target.morphTargetInfluences) as number[]
    if (source instanceof THREE.Sprite) (target as THREE.Sprite).center.copy(source.center)
    for (const child of source.children) this.syncNode(child, target)
  }

  update(sources: readonly (THREE.Object3D | null | undefined)[], camera: THREE.Camera, earth: THREE.Object3D) {
    if (this.disposed) return
    this.generation++
    for (const source of sources) if (source) this.syncNode(source, this.group)
    for (const [source, copy] of this.nodes) if (copy.seen !== this.generation) {
      copy.target.removeFromParent()
      this.nodes.delete(source)
    }
    for (const [source, copy] of this.materials) if (copy.seen !== this.generation) {
      copy.target.dispose()
      this.materials.delete(source)
    }
    this.group.visible = this.nodes.size > 0
    this.warp.update(camera, earth)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const copy of this.materials.values()) copy.target.dispose()
    this.materials.clear(); this.nodes.clear()
    this.group.clear(); this.group.removeFromParent(); this.group.visible = false
    // Geometry and textures are shared with the main lesson, so never dispose them.
    this.warpHost.material = undefined
  }
}
