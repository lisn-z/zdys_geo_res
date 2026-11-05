import * as THREE from 'three'

/** Same project asset used by yellow-river-perched-channel/river-water.ts. */
export const WATER_NORMAL_URL = '/geo-resources-folder/images/waternormals.jpg'

/** A complete offline normal map, made from periodic gradients rather than painted stripes. */
function createFallbackNormal(): THREE.DataTexture {
  const size = 192
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2
    const v = y / size * Math.PI * 2
    const dx = 0.25 * Math.cos(4 * u + 2 * v) + 0.14 * Math.cos(11 * u - 3 * v)
      + 0.065 * Math.cos(19 * u + 5 * v) + 0.055 * Math.cos(7 * u + 13 * v)
    const dy = 0.125 * Math.cos(4 * u + 2 * v) - 0.065 * Math.cos(11 * u - 3 * v)
      + 0.025 * Math.cos(19 * u + 5 * v) + 0.10 * Math.cos(7 * u + 13 * v)
    const length = Math.hypot(dx, dy, 1)
    const offset = (y * size + x) * 4
    pixels[offset] = (-dx / length * 0.5 + 0.5) * 255
    pixels[offset + 1] = (-dy / length * 0.5 + 0.5) * 255
    pixels[offset + 2] = (1 / length * 0.5 + 0.5) * 255
    pixels[offset + 3] = 255
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

/**
 * Clear water adapts the reference river's three moving normal layers and Fresnel sky
 * reflection. Water meshes supply `waterDepth` in world units; x/z sampling prevents
 * stretched ripples at curved banks. The material owns its normal maps.
 */
export function createSettlementWater(kind: 'river' | 'coast'): {
  material: THREE.MeshPhysicalMaterial
  update(time: number): void
  dispose(): void
} {
  const coast = kind === 'coast'
  const time = { value: 0 }
  const flow = { value: coast ? new THREE.Vector2(0.016, -0.011) : new THREE.Vector2(0.006, -0.031) }
  const scale = { value: coast ? 0.19 : 0.24 }
  const shallow = { value: new THREE.Color(coast ? '#719da0' : '#7c9e89') }
  const deep = { value: new THREE.Color(coast ? '#285c73' : '#3c716a') }
  const fallbackNormal = createFallbackNormal()
  let disposed = false
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: coast ? 0.18 : 0.21,
    ior: 1.333, specularIntensity: 1, envMapIntensity: 1.5,
    normalMap: fallbackNormal,
    normalScale: new THREE.Vector2(coast ? 0.58 : 0.48, coast ? 0.48 : 0.36),
    transparent: true, opacity: 0.96, depthWrite: false, side: THREE.DoubleSide,
  })
  material.name = `settlement-${kind}-flowing-water`
  material.onBeforeCompile = shader => {
    shader.uniforms.settlementWaterTime = time
    shader.uniforms.settlementWaterFlow = flow
    shader.uniforms.settlementWaterScale = scale
    shader.uniforms.settlementWaterShallow = shallow
    shader.uniforms.settlementWaterDeep = deep
    shader.vertexShader = `
      attribute float waterDepth;
      varying vec3 vSettlementWaterPosition;
      varying float vSettlementWaterDepth;
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vSettlementWaterPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vSettlementWaterDepth = waterDepth;
    `)
    shader.fragmentShader = `
      uniform float settlementWaterTime;
      uniform float settlementWaterScale;
      uniform vec2 settlementWaterFlow;
      uniform vec3 settlementWaterShallow;
      uniform vec3 settlementWaterDeep;
      varying vec3 vSettlementWaterPosition;
      varying float vSettlementWaterDepth;
      ${shader.fragmentShader}
    `
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #ifdef USE_NORMALMAP
        vec2 waterUv = vSettlementWaterPosition.xz * settlementWaterScale;
        vec2 drift = settlementWaterFlow * settlementWaterTime;
        vec3 rippleA = texture2D(normalMap, waterUv + drift).xyz * 2.0 - 1.0;
        vec3 rippleB = texture2D(normalMap, waterUv * 1.873 + drift * 0.67 + vec2(0.37, 0.21)).xyz * 2.0 - 1.0;
        vec3 rippleC = texture2D(normalMap, waterUv * 3.217 + vec2(-drift.x, drift.y) * 1.31 + vec2(0.71, 0.53)).xyz * 2.0 - 1.0;
        vec2 waterSlope = (rippleA.xy + rippleB.xy * 0.46 + rippleC.xy * 0.18) * normalScale;
        waterSlope += vec2(
          sin(vSettlementWaterPosition.x * 1.7 + vSettlementWaterPosition.z * 0.8 - settlementWaterTime * 0.58),
          sin(vSettlementWaterPosition.z * 2.1 - vSettlementWaterPosition.x * 0.65 - settlementWaterTime * 0.71)
        ) * 0.016;
        // Build the moving normal in world space; the mesh is a horizontal water surface.
        normal = normalize(mat3(viewMatrix) * normalize(vec3(waterSlope.x, 1.0, waterSlope.y)));
        #ifdef DOUBLE_SIDED
          normal *= faceDirection;
        #endif
      #endif
    `)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float waterDepthBlend = smoothstep(0.025, 0.19, vSettlementWaterDepth);
      diffuseColor.rgb *= mix(settlementWaterShallow, settlementWaterDeep, waterDepthBlend);
      diffuseColor.a *= mix(0.69, 0.98, waterDepthBlend);
    `)
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 waterEye = normalize(vViewPosition);
      vec3 waterReflection = inverseTransformDirection(reflect(-waterEye, normal), viewMatrix);
      float waterFresnel = 0.0204 + 0.9796 * pow(1.0 - clamp(dot(waterEye, normal), 0.0, 1.0), 5.0);
      vec3 waterSky = mix(vec3(0.48, 0.53, 0.53), vec3(0.22, 0.34, 0.43), clamp(waterReflection.y, 0.0, 1.0));
      // PMREM provides the reflected sky; this grazing-angle term keeps the open sky
      // readable even when a device cannot generate an environment texture.
      outgoingLight = mix(outgoingLight, waterSky, waterFresnel * 0.68);
      diffuseColor.a = mix(diffuseColor.a, 1.0, waterFresnel);
      #include <opaque_fragment>
    `)
  }
  material.customProgramCacheKey = () => 'settlement-three-scale-water-depth-fresnel-v1'
  const loadedNormal = new THREE.TextureLoader().load(WATER_NORMAL_URL, texture => {
    if (disposed) { texture.dispose(); return }
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.NoColorSpace
    texture.anisotropy = 4
    material.normalMap = texture
    material.needsUpdate = true
  }, undefined, () => {
    // The already-active periodic normal continues to animate when the asset is unavailable.
  })
  return {
    material,
    update(elapsed) { if (!disposed) time.value = Number.isFinite(elapsed) ? elapsed : 0 },
    dispose() {
      if (disposed) return
      disposed = true
      loadedNormal.dispose()
      fallbackNormal.dispose()
      material.dispose()
    },
  }
}

/** A local outdoor environment: broad daylight, soft cloud variation and a small sun. */
export function createSettlementEnvironment(renderer: THREE.WebGLRenderer): {
  texture: THREE.Texture
  dispose(): void
} {
  const width = 256
  const height = 128
  const pixels = new Float32Array(width * height * 4)
  const sunDirection = new THREE.Vector3(-22, 35, 18).normalize()
  const horizon = new THREE.Color('#b7c4c8')
  const zenith = new THREE.Color('#7c9eb5')
  const earth = new THREE.Color('#77786a')
  const color = new THREE.Color()
  const direction = new THREE.Vector3()
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const latitude = ((y + 0.5) / height - 0.5) * Math.PI
    const longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2
    direction.set(Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude))
    if (direction.y >= 0) {
      color.copy(horizon).lerp(zenith, Math.pow(direction.y, 0.55))
      const cloud = Math.pow(Math.max(0, Math.sin(longitude * 5 + direction.y * 17)
        * Math.sin(longitude * 3 - direction.y * 11)), 4) * 0.095
      color.r += cloud; color.g += cloud; color.b += cloud
      const sun = Math.exp((direction.dot(sunDirection) - 1) / 0.0015) * 3.2
      color.r += sun; color.g += sun * 0.94; color.b += sun * 0.81
    } else color.copy(horizon).lerp(earth, Math.min(1, -direction.y * 5 + 0.42))
    const offset = (y * width + x) * 4
    pixels[offset] = color.r; pixels[offset + 1] = color.g; pixels[offset + 2] = color.b; pixels[offset + 3] = 1
  }
  const source = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat, THREE.FloatType)
  source.mapping = THREE.EquirectangularReflectionMapping
  source.colorSpace = THREE.LinearSRGBColorSpace
  source.needsUpdate = true
  const generator = new THREE.PMREMGenerator(renderer)
  try {
    const environment = generator.fromEquirectangular(source)
    return { texture: environment.texture, dispose: () => environment.dispose() }
  } finally {
    source.dispose()
    generator.dispose()
  }
}
