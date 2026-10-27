import * as THREE from 'three'

export interface SeafloorMaterials {
  terrain: THREE.MeshStandardMaterial
  cut: THREE.MeshStandardMaterial
  water: THREE.MeshStandardMaterial
  dispose: () => void
}
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function periodicNoise(x: number, y: number, period: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), dx = x - ix, dy = y - iy
  const tx = dx * dx * (3 - 2 * dx), ty = dy * dy * (3 - 2 * dy)
  const wrap = (n: number): number => (n % period + period) % period
  const a = hash(wrap(ix), wrap(iy)), b = hash(wrap(ix + 1), wrap(iy)), c = hash(wrap(ix), wrap(iy + 1)), d = hash(wrap(ix + 1), wrap(iy + 1))
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}
/** Seamless multiscale rock grain and sediment detail; generated once, with mipmaps. */
function groundTextures(): { albedo: THREE.DataTexture; relief: THREE.DataTexture } {
  const size = 512, albedo = new Uint8Array(size * size * 4), relief = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size
    const broad = periodicNoise(u * 8, v * 8, 8), medium = periodicNoise(u * 32, v * 32, 32)
    const fine = periodicNoise(u * 96, v * 96, 96), grain = hash(x, y)
    const fissure = Math.pow(1 - Math.abs(periodicNoise(u * 19, v * 19, 19) * 2 - 1), 20)
    const luminance = Math.round(209 + broad * 22 + medium * 11 + fine * 8 - fissure * 11)
    const height = Math.round(67 + medium * 60 + fine * 49 + grain * 22 - fissure * 15)
    const k = (y * size + x) * 4
    albedo.set([luminance, luminance, luminance, 255], k); relief.set([height, height, height, 255], k)
  }
  const configure = (bytes: Uint8Array): THREE.DataTexture => {
    const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true; texture.anisotropy = 8; texture.needsUpdate = true
    return texture
  }
  const map = configure(albedo); map.colorSpace = THREE.SRGBColorSpace
  return { albedo: map, relief: configure(relief) }
}

export function createSeafloorMaterials(): SeafloorMaterials {
  const maps = groundTextures()
  const terrain = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, map: maps.albedo, bumpMap: maps.relief,
    bumpScale: 0.035, roughness: 0.94, metalness: 0, side: THREE.FrontSide,
  })
  const cut = new THREE.MeshStandardMaterial({
    color: '#988977', map: maps.albedo, bumpMap: maps.relief, bumpScale: 0.020,
    roughness: 0.98, metalness: 0, side: THREE.FrontSide,
  })
  // Muted continuous bedding gives the section scale without inventing a named local geology.
  cut.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSectionPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSectionPosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSectionPosition;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float beds = vSectionPosition.y + 0.035 * sin(vSectionPosition.x * 0.7) + 0.025 * sin(vSectionPosition.z * 1.1);
        float strata = 0.5 + 0.5 * sin(beds * 15.0 + 0.22 * sin(beds * 31.0));
        float fineBeds = 0.5 + 0.5 * sin(beds * 41.0);
        float darkSeam = pow(0.5 + 0.5 * sin(beds * 7.8), 18.0);
        float weathering = 0.98 + 0.022 * sin(vSectionPosition.x * 4.1 + vSectionPosition.z * 3.2);
        diffuseColor.rgb *= (0.91 + strata * 0.10 + fineBeds * 0.025 - darkSeam * 0.055) * weathering;
      `)
  }
  cut.customProgramCacheKey = () => 'seafloor-continuous-rock-section-v1'
  const water = new THREE.MeshStandardMaterial({
    color: '#83c6d3', transparent: true, opacity: 0.23, roughness: 0.27, metalness: 0.04,
    depthWrite: false, side: THREE.DoubleSide,
  })
  return {
    terrain, cut, water,
    dispose() { terrain.dispose(); cut.dispose(); water.dispose(); maps.albedo.dispose(); maps.relief.dispose() },
  }
}
