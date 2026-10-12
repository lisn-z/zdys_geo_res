import * as THREE from 'three'

/** CPU-side parcels remain independent; only their transparent draw calls are batched. */
export interface FogBillboardState {
  position: THREE.Vector3
  scale: THREE.Vector2
  rotation: number
  color: THREE.Color
  opacity: number
}

export function createFogBillboardBatch(states: FogBillboardState[], texture: THREE.Texture) {
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  const centers = new THREE.InstancedBufferAttribute(new Float32Array(states.length * 3), 3)
  const scales = new THREE.InstancedBufferAttribute(new Float32Array(states.length * 2), 2)
  const rotations = new THREE.InstancedBufferAttribute(new Float32Array(states.length), 1)
  const colors = new THREE.InstancedBufferAttribute(new Float32Array(states.length * 4), 4)
  for (const attribute of [centers, scales, rotations, colors]) attribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('parcelCenter', centers)
  geometry.setAttribute('parcelScale', scales)
  geometry.setAttribute('parcelRotation', rotations)
  geometry.setAttribute('parcelColor', colors)
  geometry.instanceCount = states.length
  const material = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), fogMap: { value: texture } },
    vertexShader: `
      attribute vec3 parcelCenter;
      attribute vec2 parcelScale;
      attribute float parcelRotation;
      attribute vec4 parcelColor;
      varying vec2 vUv;
      varying vec4 vParcelColor;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vParcelColor = parcelColor;
        vec4 mvPosition = modelViewMatrix * vec4(parcelCenter, 1.0);
        vec2 worldScale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        vec2 aligned = position.xy * parcelScale * worldScale;
        float c = cos(parcelRotation), s = sin(parcelRotation);
        mvPosition.xy += vec2(c * aligned.x - s * aligned.y, s * aligned.x + c * aligned.y);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform sampler2D fogMap;
      varying vec2 vUv;
      varying vec4 vParcelColor;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = texture2D(fogMap, vUv) * vParcelColor;
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    toneMapped: false,
    fog: true,
  })
  const mesh = new THREE.Mesh(geometry, material)
  // Vertex positions are billboard corners; the camera-fit collector uses parcel records.
  mesh.frustumCulled = false
  mesh.userData.fogBillboards = states
  const viewMatrix = new THREE.Matrix4()
  const lastViewMatrix = new THREE.Matrix4()
  const depth = new Float64Array(states.length)
  const order = Array.from({ length: states.length }, (_, index) => index)
  let dirty = true

  function sync(camera: THREE.Camera) {
    viewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld)
    if (!dirty && viewMatrix.equals(lastViewMatrix)) return
    lastViewMatrix.copy(viewMatrix)
    const e = viewMatrix.elements
    for (let index = 0; index < states.length; index += 1) {
      const position = states[index]!.position
      depth[index] = e[2]! * position.x + e[6]! * position.y + e[10]! * position.z + e[14]!
    }
    // Match Sprite's back-to-front normal-alpha composition, including after orbiting.
    order.sort((a, b) => depth[a]! - depth[b]! || a - b)
    for (let slot = 0; slot < order.length; slot += 1) {
      const state = states[order[slot]!]!
      centers.setXYZ(slot, state.position.x, state.position.y, state.position.z)
      scales.setXY(slot, state.scale.x, state.scale.y)
      rotations.setX(slot, state.rotation)
      colors.setXYZW(slot, state.color.r, state.color.g, state.color.b, state.opacity)
    }
    for (const attribute of [centers, scales, rotations, colors]) attribute.needsUpdate = true
    dirty = false
  }

  mesh.onBeforeRender = (_renderer, _scene, camera) => sync(camera)
  return { mesh, markDirty() { dirty = true }, sync }
}
