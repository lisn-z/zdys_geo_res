import * as THREE from 'three'
import { assetUrl } from './periods'

type AtlasKey = 'life' | 'early' | 'marine' | 'vegetation' | 'stegosaurus'
type MotionKind = 'land' | 'benthic' | 'fish' | 'radiodont' | 'nautiloid' | 'plant' | 'crinoid' | 'sessile'
type Bounds = readonly [number, number, number, number]
type AtlasSpec = { filename: string; columns: number; rows: number; bounds: readonly Bounds[]; alphaCutoff?: number }
type Placement = {
  atlas: AtlasKey
  cell: number
  label: string
  kind: MotionKind
  /** Image coordinates: rightward u, downward v; v is the foot for anchored life. */
  u: number
  v: number
  /** Approximate horizontal span in the source equirectangular image. */
  width: number
  heightDegrees?: number
  tint?: string
  opacity?: number
  head?: readonly [number, number]
  tail?: readonly [number, number]
  gestureScale?: number
  /** Maximum horizontal travel, in source-image u, for swimming animals only. */
  swim?: number
}

const ATLASES: Record<AtlasKey, AtlasSpec> = {
  life: {
    filename: 'life-atlas.webp', columns: 3, rows: 2,
    bounds: [
      [0.275, 0.445, 0.730, 0.697], [0.229, 0.471, 0.762, 0.664], [0.232, 0.369, 0.773, 0.719],
      [0.234, 0.320, 0.787, 0.643], [0.234, 0.363, 0.797, 0.648], [0.275, 0.299, 0.736, 0.654],
    ],
  },
  early: {
    filename: 'life-atlas-early.webp', columns: 3, rows: 3,
    bounds: [
      [0.222, 0.455, 0.825, 0.856], [0.211, 0.512, 0.799, 0.835], [0.230, 0.318, 0.756, 0.926],
      [0.242, 0.275, 0.830, 0.749], [0.208, 0.378, 0.813, 0.670], [0.160, 0.400, 0.785, 0.651],
      [0.227, 0.146, 0.825, 0.644], [0.196, 0.220, 0.809, 0.610], [0.201, 0.191, 0.797, 0.670],
    ],
  },
  marine: {
    filename: 'marine-atlas.webp', columns: 3, rows: 2,
    bounds: [
      [0.107422, 0.263672, 0.968750, 0.822266], [0.255859, 0.251953, 0.783203, 0.843750],
      [0.126953, 0.277344, 0.875000, 0.781250], [0.107422, 0.265625, 0.958984, 0.666016],
      [0.164062, 0.166016, 0.851562, 0.718750], [0.029297, 0.208984, 0.929688, 0.667969],
    ],
  },
  vegetation: {
    filename: 'vegetation-atlas.webp', columns: 3, rows: 2,
    bounds: [
      [0.318, 0.312, 0.752, 0.801], [0.248, 0.219, 0.758, 0.838], [0.275, 0.230, 0.707, 0.844],
      [0.295, 0.117, 0.756, 0.766], [0.240, 0.141, 0.762, 0.766], [0.223, 0.283, 0.789, 0.650],
    ],
  },
  stegosaurus: {
    filename: 'stegosaurus.webp', columns: 1, rows: 1,
    bounds: [[0.01888, 0.09961, 0.99023, 0.85156]], alphaCutoff: 0.2,
  },
}

// These are locality-specific reconstructions, not all life in an entire period.
// There are deliberately no ammonites/ichthyosaurs in the Morrison river valley,
// no Chinese Silurian fish transplanted into the British coastal scene, and no
// large algae/animals added to the early-eon environments.
const PLACEMENTS: Readonly<Record<number, readonly Placement[]>> = {
  3: [
    { atlas: 'marine', cell: 0, label: '奇虾', kind: 'radiodont', u: 0.58, v: 0.46, width: 0.040, tint: '#c8ddd8', opacity: 0.94, swim: 0.012 },
    { atlas: 'life', cell: 0, label: '三叶虫', kind: 'benthic', u: 0.54, v: 0.625, width: 0.032, tint: '#cbd5c5' },
  ],
  4: [
    { atlas: 'early', cell: 8, label: '直壳头足类', kind: 'nautiloid', u: 0.47, v: 0.48, width: 0.045, tint: '#c5ddd3', swim: 0.006 },
    { atlas: 'early', cell: 2, label: '海百合（动物）', kind: 'crinoid', u: 0.57, v: 0.69, width: 0.030, heightDegrees: 16, tint: '#bfc7ac' },
  ],
  5: [
    { atlas: 'early', cell: 3, label: '板足鲎', kind: 'benthic', u: 0.555, v: 0.69, width: 0.050, tint: '#b8c2ad', opacity: 0.88 },
    { atlas: 'vegetation', cell: 0, label: '矮小的库克逊植物类', kind: 'plant', u: 0.54, v: 0.71, width: 0.008, heightDegrees: 4.5, tint: '#8d9e72' },
  ],
  6: [
    { atlas: 'early', cell: 4, label: '盾皮鱼类（不指定属种）', kind: 'fish', u: 0.605, v: 0.625, width: 0.040, tint: '#b3c4b5', opacity: 0.62, swim: 0.005 },
    { atlas: 'vegetation', cell: 1, label: '枝蕨类早期树木', kind: 'plant', u: 0.81, v: 0.60, width: 0.045, heightDegrees: 26, tint: '#b9c49d' },
  ],
  7: [
    { atlas: 'life', cell: 1, label: '节胸类', kind: 'benthic', u: 0.60, v: 0.79, width: 0.095, tint: '#d9cbb2' },
    { atlas: 'vegetation', cell: 2, label: '树状石松植物', kind: 'plant', u: 0.45, v: 0.69, width: 0.021, heightDegrees: 16, tint: '#9aa17c' },
  ],
  8: [
    { atlas: 'life', cell: 2, label: '异齿龙（合弓类）', kind: 'land', u: 0.28, v: 0.64, width: 0.130, tint: '#f0dec3', head: [0.12, 0.30], tail: [0.85, 0.28] },
  ],
  9: [
    { atlas: 'early', cell: 5, label: '坚蜥', kind: 'land', u: 0.38, v: 0.66, width: 0.140, tint: '#e8d4b6', head: [0.88, 0.40], tail: [0.12, 0.60] },
    { atlas: 'vegetation', cell: 3, label: '针叶植物示意', kind: 'plant', u: 0.32, v: 0.51, width: 0.015, heightDegrees: 9, tint: '#a0ab82' },
  ],
  10: [
    { atlas: 'stegosaurus', cell: 0, label: '剑龙', kind: 'land', u: 0.425, v: 0.638, width: 0.110, tint: '#ffffff', head: [0.10, 0.28], tail: [0.84, 0.49], gestureScale: 1.4 },
    { atlas: 'vegetation', cell: 3, label: '针叶植物示意', kind: 'plant', u: 0.32, v: 0.595, width: 0.020, heightDegrees: 12, tint: '#9da77e' },
  ],
  11: [
    { atlas: 'life', cell: 4, label: '霸王龙', kind: 'land', u: 0.445, v: 0.71, width: 0.205, tint: '#e4e2cb', head: [0.18, 0.64], tail: [0.84, 0.70] },
    { atlas: 'vegetation', cell: 4, label: '阔叶被子植物', kind: 'plant', u: 0.37, v: 0.535, width: 0.018, heightDegrees: 12, tint: '#8b9e72' },
  ],
  12: [
    { atlas: 'early', cell: 6, label: '北美早期马类示意', kind: 'land', u: 0.66, v: 0.745, width: 0.060, tint: '#e8dfc8', head: [0.17, 0.78], tail: [0.92, 0.40] },
  ],
  13: [
    { atlas: 'early', cell: 7, label: '无角雌性 Menoceras 示意', kind: 'land', u: 0.55, v: 0.61, width: 0.085, tint: '#e1d0b7', head: [0.17, 0.60], tail: [0.92, 0.45] },
    { atlas: 'vegetation', cell: 5, label: '低矮草本', kind: 'plant', u: 0.59, v: 0.605, width: 0.018, heightDegrees: 3, tint: '#a7a27e' },
  ],
  14: [
    { atlas: 'life', cell: 5, label: '披毛猛犸', kind: 'land', u: 0.88, v: 0.60, width: 0.090, tint: '#e0ddd4', head: [0.82, 0.70], tail: [0.90, 0.32], gestureScale: 1.5 },
    { atlas: 'vegetation', cell: 5, label: '低矮草本', kind: 'plant', u: 0.84, v: 0.685, width: 0.018, heightDegrees: 2.5, tint: '#a2916f', opacity: 0.8 },
  ],
}

const DISTANCE = 12
const ORIGIN = new THREE.Vector3()
const MOTION_INDEX: Record<MotionKind, number> = { land: 0, benthic: 1, fish: 2, radiodont: 3, nautiloid: 4, plant: 5, crinoid: 6, sessile: 7 }

function panoramaPoint(u: number, v: number) {
  const longitude = (0.5 - u) * Math.PI * 2
  const latitude = (0.5 - v) * Math.PI
  return new THREE.Vector3(Math.sin(longitude) * Math.cos(latitude), Math.sin(latitude), Math.cos(longitude) * Math.cos(latitude)).multiplyScalar(DISTANCE)
}

function cropFor(spec: AtlasSpec, cell: number) {
  const bounds = spec.bounds[cell]!
  const padding = 0.008
  const x0 = Math.max(0, bounds[0] - padding), y0 = Math.max(0, bounds[1] - padding)
  const x1 = Math.min(1, bounds[2] + padding), y1 = Math.min(1, bounds[3] + padding)
  return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 }
}

function makeMaterial(texture: THREE.Texture, spec: AtlasSpec, placement: Placement, phase: number) {
  const crop = cropFor(spec, placement.cell)
  const head = placement.head ?? [0.18, 0.65]
  const tail = placement.tail ?? [0.85, 0.48]
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
    uniforms: {
      atlas: { value: texture },
      atlasOffset: { value: new THREE.Vector2((placement.cell % spec.columns + crop.x0) / spec.columns, 1 - (Math.floor(placement.cell / spec.columns) + crop.y1) / spec.rows) },
      atlasScale: { value: new THREE.Vector2(crop.width / spec.columns, crop.height / spec.rows) },
      time: { value: 0 }, phase: { value: phase }, kind: { value: MOTION_INDEX[placement.kind] },
      gestureScale: { value: placement.gestureScale ?? 1 }, alphaCutoff: { value: spec.alphaCutoff ?? 0.07 },
      opacity: { value: placement.opacity ?? 1 }, tint: { value: new THREE.Color(placement.tint ?? '#ffffff') },
      head: { value: new THREE.Vector2(...head) }, tail: { value: new THREE.Vector2(...tail) },
      contact: { value: placement.kind === 'land' || placement.kind === 'benthic' ? 0.13 : 0 },
    },
    vertexShader: `
      varying vec2 imageUv;
      varying vec2 localUv;
      uniform vec2 atlasOffset;
      uniform vec2 atlasScale;
      uniform vec2 head;
      uniform vec2 tail;
      uniform float time;
      uniform float phase;
      uniform float kind;
      uniform float gestureScale;
      float mask(vec2 point, vec2 center, vec2 radius) {
        vec2 d = (point - center) / radius;
        return exp(-dot(d, d) * 2.0);
      }
      void main() {
        imageUv = atlasOffset + uv * atlasScale;
        localUv = uv;
        vec3 p = position;
        float t = time + phase;
        // The lowest part of every grounded animal remains in exactly the same
        // place. Motion is confined to head/neck, tail and upper torso.
        float footGate = smoothstep(0.12, 0.34, uv.y);
        if (kind < 0.5) {
          float body = mask(uv, vec2(0.50, 0.48), vec2(0.38, 0.32));
          float headMask = mask(uv, head, vec2(0.22, 0.26));
          float tailMask = mask(uv, tail, vec2(0.22, 0.23));
          p.y += sin(t * 1.55) * 0.012 * body * footGate;
          p.x += sin(t * 0.82) * 0.025 * headMask * footGate * gestureScale;
          p.y += sin(t * 0.82 + 0.7) * 0.018 * headMask * footGate * gestureScale;
          p.y += sin(t * 1.10 + uv.x * 2.0) * 0.035 * tailMask * footGate * gestureScale;
        } else if (kind < 1.5) {
          // Benthic arthropods: limbs and feelers move; the trunk never bobs.
          float edge = smoothstep(0.18, 0.44, abs(uv.x - 0.5));
          float limbs = (1.0 - smoothstep(0.25, 0.65, uv.y)) * smoothstep(0.035, 0.15, uv.y);
          p.x += sin(t * 2.4 + uv.x * 18.0) * 0.009 * limbs;
          p.y += sin(t * 1.2 + uv.x * 9.0) * 0.010 * edge * footGate;
        } else if (kind < 2.5) {
          // Fish tail oscillates, while the armored anterior body stays firm.
          float tailGate = smoothstep(0.50, 0.93, uv.x);
          p.y += sin(t * 2.7 - uv.x * 7.0) * 0.045 * tailGate;
          p.x += sin(t * 2.7 - uv.x * 7.0) * 0.008 * tailGate;
        } else if (kind < 3.5) {
          // Radiodont lateral flaps, rather than a fish-like tail-only stroke.
          float flap = smoothstep(0.08, 0.36, abs(uv.y - 0.52));
          p.y += sin(t * 2.5 + uv.x * 13.0) * 0.032 * flap;
        } else if (kind < 4.5) {
          // The straight shell is rigid; only the exposed tentacles deform.
          float tentacles = (1.0 - smoothstep(0.26, 0.58, uv.x)) * (1.0 - smoothstep(0.40, 0.72, uv.y));
          p.x += sin(t * 1.6 + uv.y * 8.0) * 0.022 * tentacles;
          p.y += sin(t * 1.3 + uv.x * 8.0) * 0.015 * tentacles;
        } else if (kind < 5.5) {
          // Roots remain fixed, with increasing branch displacement upward.
          p.x += (sin(t * 0.75 + uv.y * 2.0) + sin(t * 1.13 + uv.x * 5.0) * 0.23) * 0.025 * uv.y * uv.y;
        } else if (kind < 6.5) {
          // Crinoids are animals. Their attached stalk base remains fixed.
          p.x += sin(t * 0.65 + uv.y * 3.2) * 0.025 * pow(uv.y, 3.0);
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 imageUv;
      varying vec2 localUv;
      uniform sampler2D atlas;
      uniform vec3 tint;
      uniform float opacity;
      uniform float contact;
      uniform float alphaCutoff;
      void main() {
        vec4 pixel = texture2D(atlas, imageUv);
        if (pixel.a < alphaCutoff) pixel = vec4(0.0);
        // A very small soft contact shade ties grounded cutouts to their foot
        // point without inventing a moving ground plane or baked background.
        vec2 d = (localUv - vec2(0.5, 0.033)) / vec2(0.35, 0.038);
        float shade = exp(-dot(d, d) * 2.0) * contact;
        float alpha = max(pixel.a * opacity, shade);
        if (alpha < 0.025) discard;
        vec3 color = mix(vec3(0.035, 0.045, 0.035), pixel.rgb * tint, smoothstep(0.025, 0.15, pixel.a));
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Sparse animated image layers anchored to the authored panorama, not 3D animals. */
export function createPanoramaEcosystem(): {
  group: THREE.Group
  setPeriod: (index: number) => Promise<void>
  getFocus: (aspect?: number) => { u: number; v: number; fov: number } | null
  update: (dt: number, enabled: boolean) => void
  dispose: () => void
} {
  const group = new THREE.Group()
  group.name = 'panorama-ecosystem'
  const loader = new THREE.TextureLoader()
  const textures = new Set<THREE.Texture>()
  const entries: { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; placement: Placement; phase: number }[] = []
  let disposed = false
  let requestVersion = 0
  let elapsed = 0

  function clear() {
    for (const entry of entries) {
      entry.mesh.geometry.dispose()
      entry.mesh.material.dispose()
    }
    entries.length = 0
    group.clear()
    textures.forEach(texture => texture.dispose())
    textures.clear()
    elapsed = 0
  }

  async function setPeriod(index: number) {
    if (disposed) return
    const version = ++requestVersion
    clear()
    group.userData.periodIndex = index
    group.userData.loadErrors = []
    const placements = PLACEMENTS[index] ?? []
    if (!placements.length) return
    const keys = [...new Set(placements.map(placement => placement.atlas))]
    const loaded = new Map<AtlasKey, THREE.Texture>()
    await Promise.all(keys.map(async key => {
      try {
        const texture = await loader.loadAsync(assetUrl(ATLASES[key].filename))
        if (disposed || version !== requestVersion) { texture.dispose(); return }
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 4
        textures.add(texture)
        loaded.set(key, texture)
      } catch {
        if (!disposed && version === requestVersion) group.userData.loadErrors.push(ATLASES[key].filename)
      }
    }))
    // An earlier slow image request must never insert objects into a newer period.
    if (disposed || version !== requestVersion) return
    if (loaded.size === 0) throw new Error('此年代的动态生物图层暂未加载成功，请检查图片资源后重试。')
    for (const [order, placement] of placements.entries()) {
      const texture = loaded.get(placement.atlas)
      if (!texture) continue
      const spec = ATLASES[placement.atlas]
      const crop = cropFor(spec, placement.cell)
      // Actual sheet cells are square in the shipped atlases, but preserve aspect
      // even if a future atlas has rectangular cells or changes export resolution.
      const image = texture.image as { width?: number; height?: number }
      const cellAspect = ((image.width ?? spec.columns) / spec.columns) / ((image.height ?? spec.rows) / spec.rows)
      const aspect = crop.width / crop.height * cellAspect
      const latitude = (0.5 - placement.v) * Math.PI
      let width = 2 * DISTANCE * Math.tan(placement.width * Math.PI) * Math.cos(latitude)
      const height = placement.heightDegrees === undefined ? width / aspect : 2 * DISTANCE * Math.tan(THREE.MathUtils.degToRad(placement.heightDegrees) / 2)
      if (placement.heightDegrees !== undefined) width = height * aspect
      const swimming = placement.kind === 'fish' || placement.kind === 'radiodont' || placement.kind === 'nautiloid'
      const geometry = new THREE.PlaneGeometry(1, 1, 36, 24)
      if (!swimming) geometry.translate(0, 0.5, 0)
      const phase = order * 1.7 + index * 0.51
      const material = makeMaterial(texture, spec, placement, phase)
      material.uniforms.time!.value = elapsed
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = placement.label
      mesh.userData.periodIndex = index
      mesh.userData.panoramaImageLayer = true
      mesh.userData.motionKind = placement.kind
      const travel = placement.swim ?? 0
      const initialU = placement.u + (travel > 0 ? Math.sin(elapsed * 0.16 + phase) * travel : 0)
      const initialV = placement.v + (travel > 0 ? Math.sin(elapsed * 0.28 + phase) * 0.0015 : 0)
      mesh.position.copy(panoramaPoint(initialU, initialV))
      mesh.lookAt(ORIGIN)
      mesh.scale.set(width, height, 1)
      mesh.frustumCulled = false
      mesh.renderOrder = 3
      group.add(mesh)
      entries.push({ mesh, placement, phase })
    }
  }

  function getFocus(aspect = 1): { u: number; v: number; fov: number } | null {
    if (disposed) return null
    // Use an animal actually loaded for this period, never a pending/obsolete
    // placement or a tree. The current swimming position includes its drift.
    const entry = entries.find(candidate => candidate.placement.kind !== 'plant')
    if (!entry) return null
    entry.mesh.geometry.computeBoundingBox()
    const center = new THREE.Vector3()
    entry.mesh.geometry.boundingBox?.getCenter(center)
    entry.mesh.updateWorldMatrix(true, false)
    entry.mesh.localToWorld(center)
    const radius = center.length()
    if (!Number.isFinite(radius) || radius < 1e-6) return null
    // The geometry center sits above the fixed feet of a land animal, so the
    // look direction includes its whole body instead of aiming at the ground.
    const u = THREE.MathUtils.euclideanModulo(0.5 - Math.atan2(center.x, center.z) / (Math.PI * 2), 1)
    const v = 0.5 - Math.asin(THREE.MathUtils.clamp(center.y / radius, -1, 1)) / Math.PI
    // Fit both dimensions of the actual loaded card. On portrait screens the
    // horizontal requirement is converted to a vertical FOV using the real
    // viewport aspect; a fixed close-up FOV would clip the enlarged animals.
    const viewportAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
    const size = new THREE.Vector3()
    entry.mesh.geometry.boundingBox?.getSize(size)
    const worldScale = new THREE.Vector3()
    entry.mesh.getWorldScale(worldScale)
    const motionPadding = 1.12
    const halfWidth = Math.abs(size.x * worldScale.x) * 0.5 * motionPadding
    const halfHeight = Math.abs(size.y * worldScale.y) * 0.5 * motionPadding
    // Aim for about one third of either screen dimension. Limits prevent an
    // extreme macro view of tiny taxa or an uncomfortable ultra-wide view.
    const targetFraction = 0.34
    const tangent = Math.max(
      halfHeight / (radius * targetFraction),
      halfWidth / (radius * viewportAspect * targetFraction),
    )
    // Wide-bodied animals need a larger vertical FOV in a portrait viewport.
    const maxFov = viewportAspect < 0.7 ? 120 : 88
    const fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(tangent)), 48, maxFov)
    return { u, v, fov }
  }

  function update(dt: number, enabled: boolean) {
    if (disposed || !enabled) return
    // Resuming after background suspension never catches up hidden wall time.
    elapsed += THREE.MathUtils.clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05)
    for (const entry of entries) {
      entry.mesh.material.uniforms.time!.value = elapsed
      const travel = entry.placement.swim ?? 0
      if (travel > 0) {
        // A bounded low-speed drift stays inside the water region chosen by hand.
        const u = entry.placement.u + Math.sin(elapsed * 0.16 + entry.phase) * travel
        const v = entry.placement.v + Math.sin(elapsed * 0.28 + entry.phase) * 0.0015
        entry.mesh.position.copy(panoramaPoint(u, v))
        entry.mesh.lookAt(ORIGIN)
      }
    }
  }

  function dispose() {
    if (disposed) return
    disposed = true
    requestVersion++
    clear()
    group.removeFromParent()
  }

  return { group, setPeriod, getFocus, update, dispose }
}
