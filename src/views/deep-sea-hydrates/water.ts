import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'

// Same shared normal map and ocean optics as ocean-atmosphere-interaction.
const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'

export interface OceanSurface {
  water: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  update(dt: number, underwaterMix: number): void
  /** Owns a geometry clone; caller retains ownership of the supplied geometry. */
  dispose(): void
}

/**
 * The four water-column walls terminate on the sediment mesh's exact sampled
 * upper boundary. A deep rectangular box would overlap the sediment's outward
 * faces on the same planes and cause depth fighting along the whole contact.
 * The teaching cutaway is not a physical flooded trench: its missing infill
 * retains the same conceptual seabed contact, never a wall down to the well.
 */
export function createOceanSideGeometries(
  seafloorHeight: (x: number, z: number) => number,
  samples: (from: number, to: number) => number[],
): THREE.BufferGeometry[] {
  const corners: [number, number][] = [[-15, -8], [15, -8], [15, 8], [-15, 8]]
  return corners.map((a, side) => {
    const b = corners[(side + 1) % corners.length]!
    const axis = a[0] === b[0] ? 1 : 0
    const points = samples(Math.min(a[axis], b[axis]), Math.max(a[axis], b[axis]))
    if (a[axis] > b[axis]) points.reverse()
    const positions: number[] = [], indices: number[] = []
    for (let i = 0; i < points.length; i++) {
      const t = (points[i]! - a[axis]) / (b[axis] - a[axis])
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t
      positions.push(x, 0, z, x, seafloorHeight(x, z), z)
      if (i < points.length - 1) {
        const n = i * 2
        indices.push(n, n + 2, n + 1, n + 2, n + 3, n + 1)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    return geometry
  })
}

function fallbackOceanNormals() {
  const size = 256, pixels = new Uint8Array(size * size * 4)
  // Differently oriented periodic wind/capillary ripples retain optical texture
  // when the shared normal-map image cannot load; this is not a flat normal.
  const waves = [
    [3, 1, .14, .2], [1, 5, .095, 1.1], [7, -4, .065, 2.4],
    [-11, 8, .04, .8], [19, 13, .024, 3.1], [31, -21, .012, 1.8],
  ] as const
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let sx = 0, sy = 0
    for (const [kx, ky, amplitude, phase] of waves) {
      const wave = Math.cos(Math.PI * 2 * (kx * x + ky * y) / size + phase) * amplitude
      const length = Math.hypot(kx, ky)
      sx += wave * kx / length; sy += wave * ky / length
    }
    const length = Math.sqrt(sx * sx + sy * sy + 1), i = (y * size + x) * 4
    pixels[i] = Math.round((sx / length * .5 + .5) * 255)
    pixels[i + 1] = Math.round((sy / length * .5 + .5) * 255)
    pixels[i + 2] = Math.round((1 / length * .5 + .5) * 255)
    pixels[i + 3] = 255
  }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.colorSpace = THREE.NoColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** Actual planar reflection plus Three Water's four animated normal-map scales. */
export function createOceanSurface(geometry: THREE.BufferGeometry): OceanSurface {
  let disposed = false
  const fallbackNormal = fallbackOceanNormals()
  // Water derives the reflector normal from local +Z. Restore the caller's XZ
  // vertices to XY locally, then rotate the mesh back to horizontal. No vertex
  // displacement is used, so the edges keep meeting the closed water sides.
  const ownedGeometry = geometry.clone().rotateX(Math.PI / 2)
  const water = new Water(ownedGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: fallbackNormal,
    alpha: .96,
    sunDirection: new THREE.Vector3(-.4, .82, .42).normalize(),
    sunColor: 0xb8cad6,
    waterColor: 0x0576b5,
    distortionScale: 2.8,
    clipBias: .0005,
    side: THREE.DoubleSide,
    fog: false,
  })
  water.rotation.x = -Math.PI / 2
  water.name = 'hydrate-reflective-ocean-surface'
  water.renderOrder = 2
  const mat = water.material, uniforms = mat.uniforms
  mat.name = 'HydrateOceanWater'
  mat.transparent = true
  mat.depthWrite = false
  mat.depthTest = true
  mat.forceSinglePass = true
  // Three's planar reflector only updates above the plane. Its reverse side
  // must not display that last above-water frame while the camera dives.
  mat.fragmentShader = mat.fragmentShader
    .replace(
      'vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
      'vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) ); if (!gl_FrontFacing) surfaceNormal = -surfaceNormal;',
    )
    .replace(
      'vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',
      `vec3 reflectionSample = waterColor;
       if (gl_FrontFacing && mirrorCoord.w > 0.0001) {
         reflectionSample = texture2D(mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion).rgb;
       }`,
    )
  // Existing scene hook is the very same uniform, rather than a copied value.
  uniforms.uAlpha = uniforms.alpha!
  uniforms.size!.value = 18
  ;(uniforms.sunColor!.value as THREE.Color).multiplyScalar(.48)

  const normalMap = new THREE.TextureLoader().load(WATER_NORMALS_URL, texture => {
    if (disposed) { texture.dispose(); return }
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.NoColorSpace
    texture.anisotropy = 4
    uniforms.normalSampler!.value = texture
  }, undefined, () => { /* Keep the fully textured deterministic fallback. */ })
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
  normalMap.colorSpace = THREE.NoColorSpace

  const reflect = water.onBeforeRender.bind(water)
  water.onBeforeRender = (renderer, scene, camera, geo, material, group) => {
    // Water returns early when seen from below. Update eye first so its underside
    // cannot keep a stale camera vector from the last above-water reflection.
    ;(uniforms.eye!.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld)
    reflect(renderer, scene, camera, geo, material, group)
  }
  const oceanColor = new THREE.Color(0x0576b5), submergedColor = new THREE.Color('#0b536d')
  return {
    water,
    update(dt, underwaterMix) {
      if (disposed) return
      const delta = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .1) : 0
      const submerged = Number.isFinite(underwaterMix) ? THREE.MathUtils.clamp(underwaterMix, 0, 1) : 0
      uniforms.time!.value += delta * .45
      // Opacity belongs to the scene's continuous view transition. Resetting it
      // here makes that damping restart every frame and flicker with frame time.
      ;(uniforms.waterColor!.value as THREE.Color).copy(oceanColor).lerp(submergedColor, submerged)
    },
    dispose() {
      if (disposed) return
      disposed = true
      ownedGeometry.dispose(); mat.dispose(); normalMap.dispose(); fallbackNormal.dispose()
      // Water keeps its render target in a private closure. Release its public
      // texture here. Owner must forceContextLoss when disposing its renderer,
      // which releases the private reflection framebuffer/renderbuffer as well.
      ;(uniforms.mirrorSampler!.value as THREE.Texture).dispose()
      water.onBeforeRender = () => {}
    },
  }
}
