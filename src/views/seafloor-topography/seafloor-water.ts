import * as THREE from 'three'

// Same normal texture used by the sea-and-land-breezes lesson, through its existing proxy.
const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'

export interface SeafloorWater {
  water: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  update(dt: number, underwaterMix: number): void
  /** Disposes the water material and owned textures; the scene owns the supplied geometry. */
  dispose(): void
}

/**
 * A transparent sea surface on the supplied XZ geometry. Unlike Three's Water,
 * this uses the existing world Y-up plane directly and does not rotate the mesh
 * or render the entire scene a second time into a planar reflection target.
 * Animated normal layers, Fresnel reflection and depth-dependent colour keep
 * the water legible without hiding the lesson's bathymetry.
 */
export function createSeafloorWater(geometry: THREE.BufferGeometry): SeafloorWater {
  let disposed = false
  const flatNormal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1)
  flatNormal.colorSpace = THREE.NoColorSpace
  flatNormal.needsUpdate = true

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uWaterNormals: { value: flatNormal },
      uWaveTime: { value: 0 },
      uSubmerged: { value: 0 },
      uAlpha: { value: 0.46 },
      uShallowColour: { value: new THREE.Color('#459eab') },
      uDeepColour: { value: new THREE.Color('#126f8c') },
      uHorizonColour: { value: new THREE.Color('#d4e7e8') },
      uSkyColour: { value: new THREE.Color('#85b5cc') },
      uSunColour: { value: new THREE.Color('#fff3dc') },
      uSunDirection: { value: new THREE.Vector3(-0.40, 0.82, 0.42).normalize() },
    },
  ])
  // UniformsUtils clones textures. Keep one clearly owned fallback rather than a clone.
  uniforms.uWaterNormals!.value = flatNormal

  const normalMap = new THREE.TextureLoader().load(
    WATER_NORMALS_URL,
    (texture) => {
      if (disposed) { texture.dispose(); return }
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.colorSpace = THREE.NoColorSpace
      texture.anisotropy = 4
      uniforms.uWaterNormals!.value = texture
    },
    undefined,
    () => { /* Analytic ripples remain visible if the shared normal image is unavailable. */ },
  )
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.colorSpace = THREE.NoColorSpace

  const material = new THREE.ShaderMaterial({
    name: 'SeafloorTransparentSea',
    uniforms,
    defines: geometry.hasAttribute('aWaterDepth') ? { HAS_WATER_DEPTH: 1 } : {},
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    fog: true,
    toneMapped: true,
    vertexShader: /* glsl */ `
      varying vec3 vWaterWorldPosition;
      varying float vWaterDepth;
      #ifdef HAS_WATER_DEPTH
        attribute float aWaterDepth;
      #endif
      #include <common>
      #include <fog_pars_vertex>
      #include <logdepthbuf_pars_vertex>

      void main() {
        // Optical waves only: moving shoreline vertices would open gaps in the
        // clipped coastline and in the closed water-volume side faces.
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWaterWorldPosition = worldPosition.xyz;
        #ifdef HAS_WATER_DEPTH
          vWaterDepth = max(0.0, aWaterDepth);
        #else
          vWaterDepth = 2.5;
        #endif
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uWaterNormals;
      uniform float uWaveTime;
      uniform float uSubmerged;
      uniform float uAlpha;
      uniform vec3 uShallowColour;
      uniform vec3 uDeepColour;
      uniform vec3 uHorizonColour;
      uniform vec3 uSkyColour;
      uniform vec3 uSunColour;
      uniform vec3 uSunDirection;
      varying vec3 vWaterWorldPosition;
      varying float vWaterDepth;
      #include <common>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>

      void main() {
        #include <logdepthbuf_fragment>
        vec2 p = vWaterWorldPosition.xz;
        float t = uWaveTime;
        // Independently travelling broad ripples and fine capillary detail,
        // sampled in world space so the shoreline clipping cannot stretch UVs.
        vec3 broad = texture2D(uWaterNormals, p * 0.105 + vec2(t * 0.009, -t * 0.006)).xyz * 2.0 - 1.0;
        mat2 turn = mat2(0.80, -0.60, 0.60, 0.80);
        vec3 fine = texture2D(uWaterNormals, turn * p * 0.285 + vec2(-t * 0.013, t * 0.010)).xyz * 2.0 - 1.0;
        vec2 longRipples = vec2(
          0.040 * cos(dot(p, vec2(1.6, 0.7)) - t * 0.71),
          0.028 * cos(dot(p, vec2(-0.9, 2.1)) - t * 0.57)
        );
        float openWater = smoothstep(0.015, 0.65, vWaterDepth);
        vec2 slopes = (broad.xy * 0.33 + fine.xy * 0.14 + longRipples)
          * mix(0.42, 1.0, openWater);
        vec3 normal = normalize(vec3(slopes.x, 1.0, slopes.y));
        vec3 toEye = normalize(cameraPosition - vWaterWorldPosition);
        // The underside is a softly lit water ceiling, not a backface hole.
        if (dot(normal, toEye) < 0.0) normal = -normal;
        float facing = clamp(dot(normal, toEye), 0.0, 1.0);
        float fresnel = 0.020 + 0.980 * pow(1.0 - facing, 5.0);
        vec3 reflected = reflect(-toEye, normal);
        vec3 reflectedSky = mix(uHorizonColour, uSkyColour, smoothstep(-0.08, 0.75, reflected.y));
        float depthBlend = 1.0 - exp(-vWaterDepth * 0.58);
        vec3 waterColour = mix(uShallowColour, uDeepColour, depthBlend);
        float waveLight = 0.96 + 0.08 * dot(normal.xz, vec2(0.6, 0.8));
        vec3 surface = waterColour * waveLight;
        surface = mix(surface, reflectedSky, (0.10 + fresnel * 0.72) * (1.0 - uSubmerged * 0.65));
        // Small sun glints break up the surface without a blown-out white sheet.
        float alignment = max(0.0, dot(reflected, uSunDirection));
        float glint = pow(alignment, 120.0) * 0.55 + pow(alignment, 28.0) * 0.035;
        surface += uSunColour * glint * (1.0 - uSubmerged) * openWater;
        vec3 ceiling = mix(uShallowColour * 0.86, uHorizonColour * 0.78, pow(facing, 2.0) * 0.45);
        surface = mix(surface, ceiling, uSubmerged * 0.68);
        // The depth contribution is qualitative; no invented metre conversion.
        float alpha = uAlpha + depthBlend * 0.065 + fresnel * 0.22 * (1.0 - uSubmerged * 0.7);
        alpha *= mix(0.52, 1.0, smoothstep(0.0, 0.18, vWaterDepth));
        gl_FragColor = vec4(surface, clamp(alpha, 0.04, 0.76));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })

  const water = new THREE.Mesh(geometry, material)
  water.name = 'seafloor-sea-surface'
  water.renderOrder = 2

  return {
    water,
    update(dt, underwaterMix) {
      if (disposed) return
      const delta = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0
      const submerged = Number.isFinite(underwaterMix) ? THREE.MathUtils.clamp(underwaterMix, 0, 1) : 0
      uniforms.uWaveTime!.value += delta
      uniforms.uSubmerged!.value = submerged
      uniforms.uAlpha!.value = THREE.MathUtils.lerp(0.46, 0.105, submerged)
    },
    dispose() {
      if (disposed) return
      disposed = true
      material.dispose()
      normalMap.dispose()
      flatNormal.dispose()
    },
  }
}
