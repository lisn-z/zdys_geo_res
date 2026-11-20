import * as THREE from 'three'

export interface ArchitecturalMaterials {
  cream: THREE.MeshStandardMaterial
  brick: THREE.MeshStandardMaterial
  earth: THREE.MeshStandardMaterial
  stone: THREE.MeshStandardMaterial
  timber: THREE.MeshStandardMaterial
  dark: THREE.MeshStandardMaterial
  ceramic: THREE.MeshStandardMaterial
  windowMat: THREE.MeshStandardMaterial
  tileMat: THREE.MeshStandardMaterial
  groundMat: THREE.MeshStandardMaterial
  stageMat: THREE.MeshStandardMaterial
}

// Original CC0 photographic PBR maps served through the application's OSS route.
// Original Poly Haven CC0 textures; source and checksum records are archived outside the courseware.
const TEXTURE_BASE = '/geo-resources-folder/images/roof-and-rainfall/'
const SOURCES = {
  brick: {
    color: TEXTURE_BASE + 'brick_diff.jpg',
    normal: TEXTURE_BASE + 'brick_normal.jpg',
    rough: TEXTURE_BASE + 'brick_rough.jpg',
    meters: 1.9,
  },
  plaster: {
    color: TEXTURE_BASE + 'plaster_diff.jpg',
    normal: TEXTURE_BASE + 'plaster_normal.jpg',
    rough: TEXTURE_BASE + 'plaster_rough.jpg',
    meters: 1,
  },
  earth: {
    color: TEXTURE_BASE + 'earth_diff.jpg',
    normal: TEXTURE_BASE + 'earth_normal.jpg',
    rough: TEXTURE_BASE + 'earth_rough.jpg',
    meters: 2,
  },
  wood: {
    color: TEXTURE_BASE + 'wood_diff.jpg',
    normal: TEXTURE_BASE + 'wood_normal.jpg',
    meters: .5,
  },
  stone: {
    color: TEXTURE_BASE + 'stone_diff.jpg',
    normal: TEXTURE_BASE + 'stone_normal.jpg',
    meters: 2,
  },
  tile: {
    color: TEXTURE_BASE + 'tile_diff.jpg',
    normal: TEXTURE_BASE + 'tile_normal.jpg',
    meters: 8,
  },
} as const

/**
 * Geometry UVs must be expressed in physical metres, not normalized per face.
 * For a wall, u=horizontal distance, v=height. A horizontal face uses (x,z).
 * Keep shared tile vertices in their physical dimensions before setting UVs;
 * instance colours should be neutral multipliers near white (about .82–1).
 * The maps' repeats convert metres to the photographed surface's native scale.
 */
export function createArchitecturalMaterials(
  renderer: THREE.WebGLRenderer,
  textures: Set<THREE.Texture>,
  materials: Set<THREE.Material>,
  isDisposed: () => boolean,
): ArchitecturalMaterials {
  const loader = new THREE.TextureLoader()
  const cache = new Map<string, THREE.Texture>()
  type MapKey = 'map' | 'normalMap' | 'roughnessMap'
  type Binding = { material: THREE.MeshStandardMaterial; key: MapKey; fallback: number }
  const bindings = new Map<THREE.Texture, Binding[]>()
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  function load(url: string, colorMap: boolean, meters: number): THREE.Texture {
    const cached = cache.get(url)
    if (cached) return cached
    const map = loader.load(url, loaded => {
      if (isDisposed()) {
        // The parent may have disposed a pending texture before the image arrived.
        // Dispose again instead of leaving an asynchronously completed GPU resource.
        loaded.dispose()
        textures.delete(loaded)
        return
      }
      loaded.userData.loadState = 'ready'
    }, undefined, () => {
      if (isDisposed()) { map.dispose(); textures.delete(map); return }
      map.userData.loadState = 'failed'
      for (const binding of bindings.get(map) ?? []) {
        if (binding.material[binding.key] !== map) continue
        binding.material[binding.key] = null
        if (binding.key === 'map') binding.material.color.setHex(binding.fallback)
        binding.material.needsUpdate = true
      }
      map.dispose()
      textures.delete(map)
      console.warn('An architectural texture could not be loaded:', url)
    })
    map.name = url.slice(url.lastIndexOf('/') + 1)
    map.colorSpace = colorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.setScalar(1 / meters)
    map.anisotropy = anisotropy
    map.minFilter = THREE.LinearMipmapLinearFilter
    map.magFilter = THREE.LinearFilter
    map.userData.loadState = 'pending'
    map.userData.metersPerTile = meters
    textures.add(map)
    cache.set(url, map)
    return map
  }

  function solid(name: string, params: THREE.MeshStandardMaterialParameters) {
    const value = new THREE.MeshStandardMaterial(params)
    value.name = name
    materials.add(value)
    return value
  }

  function photographic(
    name: string,
    source: keyof typeof SOURCES,
    fallback: number,
    normalStrength: number,
    roughness: number,
    doubleSided = false,
  ) {
    const files = SOURCES[source]
    const value = solid(name, {
      // The photographic albedo already contains its correct material colour.
      // Multiplying it by the old yellow/brown procedural colours made walls black.
      color: 0xffffff,
      roughness,
      metalness: 0,
      normalScale: new THREE.Vector2(normalStrength, normalStrength),
      side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    })
    const channels: [MapKey, string, boolean][] = [
      ['map', files.color, true],
      ['normalMap', files.normal, false],
    ]
    if ('rough' in files) channels.push(['roughnessMap', files.rough, false])
    for (const [key, url, colorMap] of channels) {
      const map = load(url, colorMap, files.meters)
      value[key] = map
      const uses = bindings.get(map) ?? []
      uses.push({ material: value, key, fallback })
      bindings.set(map, uses)
    }
    value.userData.textureMeters = files.meters
    value.userData.uvUnits = 'metres'
    return value
  }

  function greySlate(name: string, fallback: number, normalStrength: number, roughness: number) {
    const value = photographic(name, 'stone', fallback, normalStrength, roughness)
    // The original Slate Floor 03 photograph contains rusty orange stone.
    // Preserve its photographed joints, luminance and normal-map relief, while
    // grading albedo to the cool grey stone used by this architectural model.
    // This is a runtime material adjustment; the original CC0 files are unchanged.
    value.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        #ifdef USE_MAP
          float slateLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = min(vec3(0.94), vec3(slateLuminance * 1.16 + 0.025) * vec3(0.94, 0.985, 1.0));
        #endif
      `)
    }
    value.customProgramCacheKey = () => 'architectural-cool-grey-slate-v1'
    value.userData.albedoAdjustment = 'Photographic luminance, desaturated cool grey, slightly brightened in linear colour space'
    return value
  }

  const groundNormal = load(SOURCES.earth.normal, false, SOURCES.earth.meters)
  const groundMat = solid('Muted grey-green ground', {
    color: 0xc2c5ae,
    roughness: 1,
    normalMap: groundNormal,
    normalScale: new THREE.Vector2(.055, .055),
  })
  const groundUses = bindings.get(groundNormal) ?? []
  groundUses.push({ material: groundMat, key: 'normalMap', fallback: 0xc2c5ae })
  bindings.set(groundNormal, groundUses)
  groundMat.userData.textureMeters = SOURCES.earth.meters
  groundMat.userData.uvUnits = 'metres'

  return {
    cream: photographic('Aged lime plaster', 'plaster', 0xd5d4cb, .35, 1),
    brick: photographic('Weathered grey brick', 'brick', 0x898d89, .62, 1),
    earth: photographic('Earthen plaster', 'earth', 0xb29572, .5, 1),
    stone: greySlate('Weathered grey slate', 0x8b908d, .52, .93),
    timber: photographic('Weathered timber', 'wood', 0x786a56, .48, .88),
    dark: solid('Recessed dark timber', { color: 0x242b29, roughness: .94 }),
    ceramic: photographic('Grey roof backing', 'tile', 0x777c79, .22, .9),
    windowMat: solid('Recessed window glass', { color: 0x273638, roughness: .34, metalness: 0 }),
    tileMat: photographic('Weathered grey roof tiles', 'tile', 0x7b817e, .3, .86, true),
    groundMat,
    stageMat: greySlate('Stone courtyard paving', 0x92978e, .36, .98),
  }
}
