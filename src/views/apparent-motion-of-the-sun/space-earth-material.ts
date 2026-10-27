import * as THREE from 'three'
import { createEarthAtmosphereMaterial, type EarthUniforms } from '../tidal-phenomenon/earth-material'

// Same source assets and surface-lighting constants as earth-motion/index.vue.
// Only that lesson's cutaway/latitude-colouring overlays are omitted here.
export const EARTH_TEXTURE_PATH = '/geo-resources-folder/images/'
export const EARTH_REMOTE_TEXTURE_PATH = 'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'
export const EARTH_DAY_TEXTURE = 'Material.002_diffuse.jpg'
export const EARTH_NIGHT_TEXTURE = 'emissive.jpg'

export { createEarthAtmosphereMaterial, type EarthUniforms }

export function createEarthMotionSurfaceMaterial(uniforms: EarthUniforms, earthAxis: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uEarthAxis: { value: earthAxis.clone().normalize() } },
    toneMapped: true,
    vertexShader: `
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
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uNightMap;
      uniform vec3 uLightDirection;
      uniform vec3 uEarthAxis;
      uniform vec3 uAtmosphereDayColor;
      uniform vec3 uAtmosphereTwilightColor;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(uLightDirection);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
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
        vec3 nightLit = nightColor * 1.75 * (0.26 + 0.5) * nightSide;
        float rimFill = 0.48 + 0.52 * pow(1.0 - abs(lightAmount), 0.72);
        vec3 darkSurface = dayColor * 0.05 * rimFill * nightSide;
        vec3 color = mix(darkSurface + nightLit, litDay + oceanGlint, dayMask);
        // 与 earth-motion 相同的贴地柔边、蓝色晨线和红色昏线。
        // 按正常自转方向分段，不受播放速度、观测点或相机方位影响。
        float terminatorMask = 1.0 - smoothstep(0.0, 0.035, abs(lightAmount));
        float dawnSignal = dot(cross(uEarthAxis, normal), sun);
        vec3 dawnColor = vec3(0.12, 0.38, 0.56);
        vec3 duskColor = vec3(0.56, 0.12, 0.22);
        color = mix(color, dawnSignal >= 0.0 ? dawnColor : duskColor, terminatorMask * 0.52);
        float atmosphereDayStrength = smoothstep(-0.5, 1.0, lightAmount);
        float fresnel = 1.0 - abs(dot(normal, viewDirection));
        vec3 atmosphereColor = mix(uAtmosphereTwilightColor, uAtmosphereDayColor,
          smoothstep(-0.25, 0.75, lightAmount));
        float atmosphereMix = clamp(atmosphereDayStrength * pow(fresnel, 2.0) * 0.46, 0.0, 0.46);
        color = mix(color, atmosphereColor, atmosphereMix);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}
