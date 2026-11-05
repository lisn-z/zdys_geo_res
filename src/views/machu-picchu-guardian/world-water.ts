import * as THREE from 'three'

export interface DrainWaterOptions {
  x?: number
  z0?: number
  length?: number
  bed?: (z: number) => number
  bankY?: number
  blockZ?: number
  bridges?: readonly { z: number; halfLength: number; halfWidth: number }[]
}

/** Water only: the archaeological bed, bridge and removable blockage stay in
 * world.ts. Geometry coordinates are canonical, under the world's shared scale. */
export function createDrainWater(source: THREE.MeshPhysicalMaterial, options: DrainWaterOptions = {}) {
  const x = options.x ?? -2.5, z0 = options.z0 ?? 6.9, length = options.length ?? 6.3
  const bankY = options.bankY ?? 6.6, blockZ = options.blockZ ?? 11.25, halfChannel = .2275
  const bed = options.bed ?? ((z: number) => 6.35 - (z - z0) / length * .14)
  const bridges = options.bridges ?? [{ z: 7.3, halfLength: .44, halfWidth: .52 }, { z: 9.9, halfLength: .7, halfWidth: .52 }, { z: 12.8, halfLength: .44, halfWidth: .52 }]
  const bridgeMasks = Array.from({ length: 8 }, (_, i) => {
    const bridge = bridges[i]
    return bridge ? new THREE.Vector4(x - bridge.halfWidth - .007, x + bridge.halfWidth + .007, bridge.z - bridge.halfLength - .007, bridge.z + bridge.halfLength + .007) : new THREE.Vector4(1, -1, 1, -1)
  })
  const group = new THREE.Group(); group.name = 'connected-drain-and-shallow-overflow'
  let flood = 1, targetFlood = 1, previousTime: number | undefined
  const materials: { material: THREE.MeshPhysicalMaterial; still: boolean }[] = []
  function waterMaterial(still: boolean): THREE.MeshPhysicalMaterial {
    const material = source.clone()
    material.name = still ? 'shallow-overflow-water' : 'flowing-channel-water'
    material.depthWrite = false; material.transparent = true
    material.onBeforeCompile = shader => {
      shader.uniforms.guardianBridgeMasks = { value: bridgeMasks }
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float drainShore;\nattribute float drainDepth;\nattribute vec2 drainCoord;\nvarying float vDrainShore;\nvarying float vDrainDepth;\nvarying vec2 vDrainCoord;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDrainShore=drainShore;\nvDrainDepth=drainDepth;\nvDrainCoord=drainCoord;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vDrainShore;\nvarying float vDrainDepth;\nvarying vec2 vDrainCoord;\nuniform vec4 guardianBridgeMasks[8];')
        .replace('#include <color_fragment>', `#include <color_fragment>
          for(int bridge=0;bridge<8;bridge++){
            vec4 mask=guardianBridgeMasks[bridge];
            if(vDrainCoord.x>mask.x&&vDrainCoord.x<mask.y&&vDrainCoord.y>mask.z&&vDrainCoord.y<mask.w) discard;
          }
          float wetEdge=smoothstep(0.0,0.17,vDrainShore);
          float wetDepth=smoothstep(0.0004,0.012,vDrainDepth);
          diffuseColor.a*=wetEdge*mix(0.12,1.0,wetDepth);
          diffuseColor.rgb*=mix(vec3(0.87,0.95,0.90),vec3(1.0),wetDepth);
        `)
    }
    material.customProgramCacheKey = () => still ? 'guardian-puddle-shore-v1' : 'guardian-drain-shore-v1'
    materials.push({ material, still }); return material
  }
  function geometry(vertexCount: number, indices: number[]): THREE.BufferGeometry {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3).setUsage(THREE.DynamicDrawUsage))
    result.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3))
    result.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2).setUsage(THREE.DynamicDrawUsage))
    result.setAttribute('drainCoord', new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2).setUsage(THREE.DynamicDrawUsage))
    result.setAttribute('drainShore', new THREE.BufferAttribute(new Float32Array(vertexCount), 1))
    result.setAttribute('drainDepth', new THREE.BufferAttribute(new Float32Array(vertexCount), 1).setUsage(THREE.DynamicDrawUsage))
    result.setIndex(indices); return result
  }
  function stripIndices(columns: number, rows: number, positive = true): number[] {
    const result: number[] = []
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + 1, c = a + columns + 1, d = c + 1
      if (positive) result.push(a, c, b, b, c, d)
      else result.push(a, b, c, b, d, c)
    }
    return result
  }
  const flowColumns = 4, flowRows = 72
  const flowGeometry = geometry((flowColumns + 1) * (flowRows + 1), stripIndices(flowColumns, flowRows))
  const flow = new THREE.Mesh(flowGeometry, waterMaterial(false)); flow.name = 'continuous-channel-water'
  flow.renderOrder = 3; flow.frustumCulled = false; group.add(flow)
  const pondColumns = 9, pondRows = 56
  const ponds = ([-1, 1] as const).map(side => {
    const pondGeometry = geometry((pondColumns + 1) * (pondRows + 1), stripIndices(pondColumns, pondRows, side > 0))
    const mesh = new THREE.Mesh(pondGeometry, waterMaterial(true)); mesh.name = side > 0 ? 'overflow-eastern-bank' : 'overflow-western-bank'
    mesh.renderOrder = 3; mesh.frustumCulled = false; group.add(mesh)
    return { side, mesh, geometry: pondGeometry }
  })
  function setVertex(g: THREE.BufferGeometry, index: number, px: number, py: number, pz: number, depth: number, shore: number): void {
    g.getAttribute('position').setXYZ(index, px, py, pz)
    // Meter-based UVs retain the normal texture's scale on the narrow channel.
    g.getAttribute('uv').setXY(index, px * .62, pz * .62)
    g.getAttribute('drainCoord').setXY(index, px, pz)
    g.getAttribute('drainShore').setX(index, shore)
    g.getAttribute('drainDepth').setX(index, Math.max(0, depth))
  }
  function invalidate(g: THREE.BufferGeometry): void {
    for (const name of ['position', 'uv', 'drainCoord', 'drainShore', 'drainDepth']) g.getAttribute(name).needsUpdate = true
    g.computeVertexNormals()
    const normals = g.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) if (normals.getX(i) ** 2 + normals.getY(i) ** 2 + normals.getZ(i) ** 2 < .5) normals.setXYZ(i, 0, 1, 0)
  }
  function syncMaterial(): void {
    for (const item of materials) {
      const material = item.material
      if (material.normalMap !== source.normalMap) { material.normalMap = source.normalMap; material.needsUpdate = true }
      if (material.envMap !== source.envMap) { material.envMap = source.envMap; material.needsUpdate = true }
      material.normalScale.copy(source.normalScale).multiplyScalar(item.still ? .46 : 1)
      material.opacity = source.opacity
      material.roughness = item.still ? Math.min(.26, source.roughness + .035) : source.roughness
      material.color.copy(source.color)
    }
  }
  function updateGeometry(time: number): void {
    // Water remains below the 6.62 bridge top throughout filling and drainage.
    // Overflow retreats along the bank before the channel water drops below it.
    const waterLevel = bankY + .014 * flood, floodedChannel = THREE.MathUtils.smoothstep(flood, 0, .18)
    for (let row = 0; row <= flowRows; row++) {
      const z = z0 + .035 + (length - .07) * row / flowRows
      const behindBlockage = 1 - THREE.MathUtils.smoothstep(z, blockZ - .10, blockZ + .42)
      for (let col = 0; col <= flowColumns; col++) {
        const across = col / flowColumns, px = x + (across * 2 - 1) * halfChannel
        const clearY = bed(z) + .043
        const level = THREE.MathUtils.lerp(clearY, waterLevel, floodedChannel * behindBlockage)
        const ripple = Math.sin(z * 13.7 - time * 3.8) * .00065 * Math.sin(across * Math.PI)
        const py = level + ripple
        setVertex(flowGeometry, row * (flowColumns + 1) + col, px, py, z, py - bed(z), .58 + Math.sin(across * Math.PI) * .42)
      }
    }
    invalidate(flowGeometry)
    const extent = Math.pow(Math.max(.00001, flood), .62)
    const centreZ = blockZ - 1.52, halfLength = Math.min(1.38, (blockZ - z0) * .35) * (.24 + .76 * Math.sqrt(flood))
    for (const pond of ponds) {
      pond.mesh.visible = flood > .012
      for (let row = 0; row <= pondRows; row++) {
        const t = row / pondRows, z = centreZ + (t * 2 - 1) * halfLength
        const taper = Math.pow(Math.max(0, Math.sin(t * Math.PI)), .72)
        const scallop = .89 + .12 * Math.sin(t * 16.3 + pond.side) + .07 * Math.sin(t * 29.5 - .4)
        const outerWidth = taper * scallop * (pond.side > 0 ? 1.08 : .54) * extent
        for (let col = 0; col <= pondColumns; col++) {
          const across = col / pondColumns, px = x + pond.side * (halfChannel + across * outerWidth)
          const depth = .014 * flood * Math.pow(1 - across, .52)
          // No overlap with the central strip: both share exactly its bank edge.
          setVertex(pond.geometry, row * (pondColumns + 1) + col, px, waterLevel, z, depth, (1 - across) * Math.min(1, taper * 4))
        }
      }
      invalidate(pond.geometry)
    }
  }
  syncMaterial(); updateGeometry(0)
  return {
    group,
    setDrain(clear: boolean): void { targetFlood = clear ? 0 : 1 },
    update(time: number, delta?: number): void {
      const dt = THREE.MathUtils.clamp(delta ?? (previousTime === undefined ? 0 : time - previousTime), 0, .16)
      previousTime = time
      flood = THREE.MathUtils.lerp(flood, targetFlood, 1 - Math.exp(-2.2 * dt))
      if (Math.abs(flood - targetFlood) < .0001) flood = targetFlood
      syncMaterial(); updateGeometry(time)
    },
  }
}

