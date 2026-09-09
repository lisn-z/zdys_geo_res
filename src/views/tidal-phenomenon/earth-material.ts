import * as THREE from 'three'

export interface EarthUniforms {
  [name: string]: THREE.IUniform
  uMap: THREE.IUniform<THREE.Texture>
  uNightMap: THREE.IUniform<THREE.Texture>
  uLightDirection: THREE.IUniform<THREE.Vector3>
  uOpacity: THREE.IUniform<number>
  uAtmosphereDayColor: THREE.IUniform<THREE.Color>
  uAtmosphereTwilightColor: THREE.IUniform<THREE.Color>
}

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

// Adapted from earth-motion/createEarth: identical day/night textures, ocean
// highlights and atmospheric shading, without that lesson's latitude overlays.
export function createEarthSurfaceMaterial(uniforms: EarthUniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    toneMapped: true,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    vertexShader: earthVertexShader,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uNightMap;
      uniform vec3 uLightDirection;
      uniform vec3 uAtmosphereDayColor;
      uniform vec3 uAtmosphereTwilightColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(uLightDirection);
        // The tide scene uses an orthographic camera: every viewing ray is
        // parallel, so highlights must not bend toward the camera position.
        vec3 viewDirection = isOrthographic
          ? normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]))
          : normalize(cameraPosition - vWorldPosition);
        vec3 dayColor = pow(max(texture2D(uMap, vUv).rgb, vec3(0.0)), vec3(1.08));
        vec3 nightColor = texture2D(uNightMap, vUv).rgb;
        float lightAmount = dot(normal, sun);
        float dayMask = smoothstep(-0.24, 0.34, lightAmount);
        float luma = dot(dayColor, vec3(0.2126, 0.7152, 0.0722));
        float blueDominance = dayColor.b - max(dayColor.r, dayColor.g);
        float oceanMask = smoothstep(-0.025, 0.115, blueDominance)
          * (1.0 - smoothstep(0.48, 0.82, luma));
        float cloudMask = smoothstep(0.64, 0.94, luma) * (1.0 - oceanMask * 0.72);

        float directLight = max(lightAmount, 0.0);
        const float sunPower = 1.45;
        vec3 litDay = dayColor * (0.18 + sunPower * 0.58 * directLight);
        litDay *= mix(1.0, 1.02, cloudMask);
        litDay *= mix(vec3(1.0), vec3(0.74, 0.86, 1.0), oceanMask * 0.48);
        vec3 halfDirection = normalize(sun + viewDirection);
        float specular = pow(max(dot(normal, halfDirection), 0.0), mix(28.0, 105.0, oceanMask))
          * oceanMask * directLight * dayMask;
        vec3 oceanGlint = mix(vec3(0.40, 0.64, 0.82), vec3(1.0), specular)
          * specular * (0.42 + sunPower * 0.22);

        float nightSide = 1.0 - dayMask;
        vec3 nightLit = nightColor * 1.75 * (0.26 + 2.15) * nightSide;
        float rimFill = 0.48 + 0.52 * pow(1.0 - abs(lightAmount), 0.72);
        vec3 darkSurface = dayColor * 0.05 * rimFill * nightSide;
        vec3 color = mix(darkSurface + nightLit, litDay + oceanGlint, dayMask);

        float atmosphereDayStrength = smoothstep(-0.5, 1.0, lightAmount);
        float fresnel = 1.0 - abs(dot(normal, viewDirection));
        vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor,
          smoothstep(-0.25, 0.75, lightAmount));
        float atmosphereMix = clamp(atmosphereDayStrength * pow(fresnel, 2.0) * 0.46, 0.0, 0.46);
        color = mix(color, atmosphereColor, atmosphereMix);
        gl_FragColor = vec4(color, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

export function createEarthAtmosphereMaterial(uniforms: EarthUniforms) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    toneMapped: true,
    vertexShader: earthVertexShader,
    fragmentShader: `
      uniform vec3 uLightDirection;
      uniform vec3 uAtmosphereDayColor;
      uniform vec3 uAtmosphereTwilightColor;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 viewDirection = isOrthographic
          ? normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]))
          : normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(normal, viewDirection));
        float sunOrientation = dot(normal, normalize(uLightDirection));
        float daylight = smoothstep(-0.5, 1.0, sunOrientation);
        float innerEdge = 1.0 - smoothstep(0.67, 1.0, fresnel);
        float alpha = pow(innerEdge, 2.65) * daylight;
        if (alpha < 0.004) discard;
        vec3 glowColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor,
          smoothstep(-0.25, 0.75, sunOrientation));
        gl_FragColor = vec4(glowColor * 1.08, min(alpha * 1.10, 1.0) * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}
