import * as THREE from 'three'

// Reuse earth-motion/index.vue's loadGalaxySkybox texture, shader and display settings.
export const GALAXY_SKYBOX_URL = '/geo-resources-folder/images/milky-way-6k.jpg'
export const GALAXY_BACKGROUND_COLOR = 0x020713

function createGalaxySkyDome(texture: THREE.Texture, maxAnisotropy: number) {
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = Math.min(8, maxAnisotropy)

  const image = texture.image as HTMLImageElement
  const textureWidth = Math.max(1, image.naturalWidth || image.width || 6000)
  const textureHeight = Math.max(1, image.naturalHeight || image.height || 3000)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      skyMap: { value: texture },
      texelSize: { value: new THREE.Vector2(1 / textureWidth, 1 / textureHeight) },
      exposure: { value: 0.105 },
      sharpness: { value: 1.65 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        mat4 viewRotation = mat4(mat3(viewMatrix));
        vec4 viewPosition = viewRotation * vec4(position, 1.0);
        if (isOrthographic) {
          // 星空仍按方向投影，避免极点正交俯视把远处星点放大。
          float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
          float focalLength = 1.0 / tan(radians(38.0) * 0.5);
          gl_Position = vec4(viewPosition.x * focalLength / aspect,
            viewPosition.y * focalLength, -viewPosition.z, -viewPosition.z);
        } else {
          gl_Position = projectionMatrix * viewPosition;
        }
      }
    `,
    fragmentShader: `
      uniform sampler2D skyMap;
      uniform vec2 texelSize;
      uniform float exposure;
      uniform float sharpness;
      varying vec2 vUv;

      void main() {
        vec2 uv = vec2(1.0 - vUv.x, vUv.y);
        vec3 center = texture2D(skyMap, uv).rgb;
        vec3 neighbors = (
          texture2D(skyMap, uv + vec2(texelSize.x, 0.0)).rgb +
          texture2D(skyMap, uv - vec2(texelSize.x, 0.0)).rgb +
          texture2D(skyMap, uv + vec2(0.0, texelSize.y)).rgb +
          texture2D(skyMap, uv - vec2(0.0, texelSize.y)).rgb
        ) * 0.25;
        vec3 color = max(center + (center - neighbors) * sharpness, 0.0) * exposure;

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  })

  const dome = new THREE.Mesh(new THREE.SphereGeometry(72, 128, 64), material)
  dome.name = 'earth-motion-galaxy-sky'
  dome.rotation.x = -0.4
  dome.frustumCulled = false
  dome.renderOrder = -10000
  return dome
}

export function loadEarthMotionGalaxySky(
  scene: THREE.Scene,
  maxAnisotropy: number,
  onReady: () => void,
  loader: Pick<THREE.TextureLoader, 'load'> = new THREE.TextureLoader(),
) {
  let disposed = false
  let dome: ReturnType<typeof createGalaxySkyDome> | undefined
  let pending: THREE.Texture | undefined
  let releasedTexture: THREE.Texture | undefined
  const releaseTexture = (texture: THREE.Texture | undefined) => {
    if (!texture || texture === releasedTexture) return
    texture.dispose()
    releasedTexture = texture
  }

  pending = loader.load(GALAXY_SKYBOX_URL, texture => {
    // Loading may finish after the component has gone; never resurrect its scene.
    if (disposed) { releaseTexture(texture); return }
    dome = createGalaxySkyDome(texture, maxAnisotropy)
    scene.add(dome)
    onReady()
  }, undefined, error => {
    releaseTexture(pending)
    if (!disposed) console.warn('银河天空盒加载失败，已保留深色背景', error)
  })

  return () => {
    if (disposed) return
    disposed = true
    // Remove before the component traverses the rest of the scene for disposal.
    dome?.removeFromParent()
    dome?.geometry.dispose()
    dome?.material.dispose()
    dome = undefined
    releaseTexture(pending)
  }
}
