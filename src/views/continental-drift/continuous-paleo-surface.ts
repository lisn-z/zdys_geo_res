import * as THREE from 'three'
import { resourceUrl } from './resource-loader'
import { createRobinsonMapGeometry, GLOBE_RADIUS } from './tectonic-geometry'
import { DEFAULT_TERRAIN_STYLE, TERRAIN_PALETTES, TERRAIN_PALETTE_GLSL, terrainDataUrl, type TerrainPaletteId } from './terrain-palettes'

export type ContinuousPaleoNode = { ageMa: number; coast: string; terrain: string }
export type ContinuousPaleoOptions = {
  renderer?: Pick<THREE.WebGLRenderer, 'initTexture'>
  nodes?: readonly ContinuousPaleoNode[]
  onReadyChange?: (ready: boolean) => void
  onError?: (error: Error) => void
  maxCacheBytes?: number
  /** Test/host injection; images must retain their original data bytes. */
  loadTexture?: (url: string) => Promise<THREE.Texture>
}

export const CONTINUOUS_PALEO_NODES: readonly ContinuousPaleoNode[] = Array.from({ length: 51 }, (_, index) => {
  const ageMa = index * 5
  return {
    ageMa,
    coast: resourceUrl(`paleo/${String(ageMa).padStart(3, '0')}-coast-sdf.png`),
    terrain: terrainDataUrl(ageMa, ageMa === 0),
  }
})

type Frame = { node: ContinuousPaleoNode; coast: THREE.Texture; terrain: THREE.Texture; bytes: number; touched: number; terrainError?: Error }
type Interval = { younger: ContinuousPaleoNode; older: ContinuousPaleoNode; mix: number }

/**
 * Continuous interpolation of adjacent reconstructed coast fields, not rigid microplates.
 * All pixels lie on one immutable sphere / Robinson surface. Coastlines move through the
 * zero contour of an interpolated signed-distance field; there is no alpha slideshow,
 * detached polygon, height displacement, or special 0 Ma geometry replacement.
 */
export function createContinuousPaleoSurface(options: ContinuousPaleoOptions = {}) {
  const nodes = [...(options.nodes ?? CONTINUOUS_PALEO_NODES)].sort((a, b) => a.ageMa - b.ageMa)
  if (!nodes.length || nodes.some((node, index) => !Number.isFinite(node.ageMa) || index > 0 && node.ageMa <= nodes[index - 1]!.ageMa)) {
    throw new RangeError('Continuous paleo ages must be finite and unique')
  }
  const loader = new THREE.TextureLoader()
  const loadTexture = options.loadTexture ?? ((url: string) => loader.loadAsync(url))
  const decoder = !options.loadTexture && typeof Worker !== 'undefined'
    ? new Worker(new URL('./continuous-paleo-decoder-worker.ts', import.meta.url), { type: 'module' }) : null
  let decodeSequence = 0
  let decoderFailed = false
  const decodeRequests = new Map<number, { resolve: (texture: THREE.Texture) => void; reject: (error: Error) => void }>()
  decoder?.addEventListener('message', (event: MessageEvent<{ id: number; width: number; height: number; buffer: ArrayBuffer; error?: string }>) => {
    const result = event.data, request = decodeRequests.get(result.id)
    if (!request) return
    decodeRequests.delete(result.id)
    if (result.error) { request.reject(new Error(result.error)); return }
    const texture = new THREE.DataTexture(new Uint8Array(result.buffer), result.width, result.height, THREE.RGFormat, THREE.UnsignedByteType)
    texture.flipY = false // Worker already places southernmost pixels in row zero.
    texture.userData.coastBytesPerPixel = 2
    request.resolve(texture)
  })
  decoder?.addEventListener('error', event => {
    decoderFailed = true
    decoder.terminate()
    for (const request of decodeRequests.values()) request.reject(new Error(event.message || 'Coast decoder failed'))
    decodeRequests.clear()
  })
  function loadCoast(url: string): Promise<THREE.Texture> {
    if (!decoder || decoderFailed) return loadTexture(url)
    return new Promise((resolve, reject) => {
      const id = ++decodeSequence
      decodeRequests.set(id, { resolve, reject })
      decoder.postMessage({ id, url })
    })
  }
  const cache = new Map<number, Frame>()
  const pending = new Map<number, Promise<Frame>>()
  const maxBytes = options.maxCacheBytes ?? 192 * 1024 * 1024
  const oceanFallback = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  const terrainFallback = new THREE.DataTexture(new Uint8Array([46, 224, 200, 255]), 1, 1)
  for (const texture of [oceanFallback, terrainFallback]) {
    texture.colorSpace = THREE.NoColorSpace
    texture.needsUpdate = true
  }
  const uniforms = {
    coastA: { value: oceanFallback as THREE.Texture }, coastB: { value: oceanFallback as THREE.Texture },
    terrainA: { value: terrainFallback as THREE.Texture }, terrainB: { value: terrainFallback as THREE.Texture },
    ageMix: { value: 0 }, terrainPalette: { value: Number(DEFAULT_TERRAIN_STYLE.index) }, terrainEnabled: { value: 1 },
    oceanColor: { value: new THREE.Color(DEFAULT_TERRAIN_STYLE.sea) },
    flatLandColor: { value: new THREE.Color(DEFAULT_TERRAIN_STYLE.low) },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    // Opaque, single-sided, depth-writing surfaces cannot blend back-facing land over the front.
    side: THREE.FrontSide, depthTest: true, depthWrite: true,
    vertexShader: `varying vec2 vGeoUv;
      void main() { vGeoUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${TERRAIN_PALETTE_GLSL}
      varying vec2 vGeoUv;
      uniform sampler2D coastA, coastB, terrainA, terrainB;
      uniform float ageMix, terrainEnabled;
      uniform vec3 oceanColor, flatLandColor;
      float signedCoast(vec3 data) { return (dot(data.rg,vec2(65280.0,255.0))-32768.0)/256.0; }
      vec2 heightAndShade(vec3 data) {
        return vec2(dot(data.rg,vec2(65280.0,255.0))-12000.0,data.b*255.0/200.0);
      }
      vec3 fieldTerrainColour(vec2 heightShade) {
        float height=max(heightShade.x,0.0);
        vec3 palette=terrainPalette>2.5 ? terrainTopo(height) : terrainSand(height);
        vec3 colour=terrainSrgbToLinear(palette*heightShade.y);
        float luminance=dot(colour,vec3(0.2126,0.7152,0.0722));
        if(terrainPalette>2.5) return colour;
        if(terrainPalette>1.5) return mix(colour,luminance*vec3(0.72,0.83,0.89),0.82);
        if(terrainPalette>0.5) return mix(mix(colour,vec3(luminance),0.64),vec3(0.94,0.91,0.82),0.24);
        return colour;
      }
      void main() {
        // Packed bytes are decoded independently before temporal interpolation. No RGB crossfade.
        float distanceA=signedCoast(texture2D(coastA,vGeoUv).rgb);
        float distanceB=signedCoast(texture2D(coastB,vGeoUv).rgb);
        float distanceToCoast=mix(distanceA,distanceB,ageMix);
        float aa=max(fwidth(distanceToCoast)*0.7,0.002);
        float land=smoothstep(-aa,aa,distanceToCoast);
        vec2 terrain=mix(heightAndShade(texture2D(terrainA,vGeoUv).rgb),
                         heightAndShade(texture2D(terrainB,vGeoUv).rgb),ageMix);
        vec3 landColour=mix(flatLandColor,fieldTerrainColour(terrain),terrainEnabled);
        gl_FragColor=vec4(mix(oceanColor,landColour,land),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  material.name = 'continuous-reconstructed-coast-surface'
  // Same equirectangular UV convention: u=0 at 180 W, v=0 at the south pole.
  const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + .010, 256, 128), material)
  const map = new THREE.Mesh(createRobinsonMapGeometry(.010, 360, 180), material)
  globe.name = map.name = 'continuous-paleo-surface'
  globe.renderOrder = map.renderOrder = 1
  let disposed = false
  let targetAge = nodes[nodes.length - 1]!.ageMa
  let renderedAge: number | null = null
  let activeA: Frame | null = null, activeB: Frame | null = null
  let ready = false
  let requestRevision = 0
  let prefetchRevision = 0
  let sequence = 0
  const failures = new Map<number, number>()

  function intervalFor(ageMa: number): Interval {
    const age = THREE.MathUtils.clamp(Number.isFinite(ageMa) ? ageMa : nodes[0]!.ageMa, nodes[0]!.ageMa, nodes[nodes.length - 1]!.ageMa)
    const olderIndex = nodes.findIndex(node => node.ageMa >= age)
    const older = nodes[olderIndex < 0 ? nodes.length - 1 : olderIndex]!
    const younger = nodes[Math.max(0, olderIndex - 1)]!
    if (Math.abs(older.ageMa - age) < 1e-8) return { younger: older, older, mix: 0 }
    return { younger, older, mix: (age - younger.ageMa) / (older.ageMa - younger.ageMa) }
  }
  function clampAge(ageMa: number): number {
    return THREE.MathUtils.clamp(Number.isFinite(ageMa) ? ageMa : nodes[0]!.ageMa, nodes[0]!.ageMa, nodes[nodes.length - 1]!.ageMa)
  }
  function setReady(value: boolean): void {
    if (ready === value) return
    ready = value
    options.onReadyChange?.(value)
  }
  function textureBytes(texture: THREE.Texture): number {
    const image = texture.image as { width?: number; height?: number } | undefined
    return Math.max(1, image?.width ?? 1) * Math.max(1, image?.height ?? 1) * Number(texture.userData.coastBytesPerPixel ?? 4)
  }
  function trim(): void {
    let bytes = [...cache.values()].reduce((sum, frame) => sum + frame.bytes, 0)
    const requested = intervalFor(targetAge)
    for (const frame of [...cache.values()].sort((a, b) => a.touched - b.touched)) {
      if (cache.size <= 6 && bytes <= maxBytes) break
      if (frame === activeA || frame === activeB || frame.node.ageMa === requested.younger.ageMa || frame.node.ageMa === requested.older.ageMa) continue
      cache.delete(frame.node.ageMa)
      bytes -= frame.bytes
      frame.coast.dispose(); if (frame.terrain !== terrainFallback) frame.terrain.dispose()
    }
  }
  async function acquire(node: ContinuousPaleoNode): Promise<Frame> {
    if (disposed) throw new Error('Continuous paleo surface is disposed')
    const cached = cache.get(node.ageMa)
    if (cached) { cached.touched = ++sequence; return cached }
    const existing = pending.get(node.ageMa)
    if (existing) return existing
    const task = (async () => {
      let coast: THREE.Texture | undefined, terrain: THREE.Texture | undefined
      try {
        coast = await loadCoast(node.coast)
        let terrainError: Error | undefined
        try { terrain = await loadTexture(node.terrain) } catch (value) {
          // A missing relief image must not make a successfully loaded coast unusable.
          terrain = terrainFallback
          terrainError = value instanceof Error ? value : new Error(String(value))
        }
        if (disposed) throw new Error('Continuous paleo surface is disposed')
        for (const texture of [coast, terrain]) {
          texture.colorSpace = THREE.NoColorSpace
          texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping
          texture.magFilter = texture.minFilter = THREE.LinearFilter
          texture.generateMipmaps = false
          texture.needsUpdate = true
          options.renderer?.initTexture(texture)
          // Yield between uploads; do not stack several full-resolution images in a draw frame.
          await new Promise<void>(resolve => setTimeout(resolve, 0))
        }
        if (disposed) throw new Error('Continuous paleo surface is disposed')
        const frame: Frame = { node, coast, terrain, bytes: textureBytes(coast) + textureBytes(terrain), touched: ++sequence, terrainError }
        cache.set(node.ageMa, frame)
        // A rapid manual scrub can finish obsolete requests after the newest view is paused.
        // Bound memory here as well: those requests will not necessarily reach prepareAge's trim.
        trim()
        failures.delete(node.ageMa)
        return frame
      } catch (error) {
        coast?.dispose(); if (terrain !== terrainFallback) terrain?.dispose()
        failures.set(node.ageMa, performance.now())
        throw error
      } finally { pending.delete(node.ageMa) }
    })()
    pending.set(node.ageMa, task)
    return task
  }
  function applyAge(ageMa: number): boolean {
    const interval = intervalFor(ageMa)
    const a = cache.get(interval.younger.ageMa), b = cache.get(interval.older.ageMa)
    if (!a || !b) return false
    activeA = a; activeB = b
    a.touched = b.touched = ++sequence
    uniforms.coastA.value = a.coast; uniforms.coastB.value = b.coast
    uniforms.terrainA.value = a.terrain; uniforms.terrainB.value = b.terrain
    uniforms.ageMix.value = interval.mix
    renderedAge = ageMa
    trim()
    return true
  }
  function setAge(ageMa: number): boolean {
    if (disposed) return false
    targetAge = clampAge(ageMa)
    const applied = applyAge(targetAge)
    setReady(applied)
    return applied
  }
  async function prepareAge(ageMa: number): Promise<void> {
    if (disposed) return
    targetAge = clampAge(ageMa)
    const desiredAge = targetAge
    const revision = ++requestRevision
    if (applyAge(desiredAge)) { setReady(true); return }
    setReady(false)
    const interval = intervalFor(desiredAge)
    try {
      const frames = await Promise.all([acquire(interval.younger), acquire(interval.older)])
      if (disposed || revision !== requestRevision || targetAge !== desiredAge) return
      setReady(applyAge(desiredAge))
      const degraded = frames.find(frame => frame.terrainError)?.terrainError
      if (degraded) options.onError?.(degraded)
      trim()
    } catch (value) {
      if (disposed || revision !== requestRevision) return
      const error = value instanceof Error ? value : new Error(String(value))
      // Keep both last complete textures bound on failure; a broken request cannot clear the map.
      options.onError?.(error)
      throw error
    }
  }
  function prefetch(ageMa: number, direction: -1 | 1 = -1): void {
    if (disposed) return
    const revision = ++prefetchRevision
    const age = clampAge(ageMa)
    const interval = intervalFor(age)
    const firstIndex = nodes.indexOf(direction < 0 ? interval.younger : interval.older)
    const requested = [firstIndex, firstIndex + direction, firstIndex + direction * 2]
      .filter(index => index >= 0 && index < nodes.length).map(index => nodes[index]!)
    void (async () => {
      for (const node of requested) {
        if (disposed || revision !== prefetchRevision) return
        if ((failures.get(node.ageMa) ?? -Infinity) + 5000 > performance.now()) continue
        try { await acquire(node); trim() } catch { /* Explicit prepareAge reports errors and permits retry. */ }
      }
    })()
  }
  return {
    globe, map, material, nodes,
    setAge, prepareAge, prefetch,
    getRenderedAge: (): number | null => renderedAge,
    setPalette(id: TerrainPaletteId): void {
      const palette = TERRAIN_PALETTES.find(value => value.id === id) ?? DEFAULT_TERRAIN_STYLE
      uniforms.terrainPalette.value = palette.index
      uniforms.oceanColor.value.set(palette.sea)
      uniforms.flatLandColor.value.set(palette.low)
    },
    setTerrainEnabled(enabled: boolean): void { uniforms.terrainEnabled.value = enabled ? 1 : 0 },
    setVisible(visible: boolean): void { globe.visible = map.visible = visible },
    dispose(): void {
      disposed = true; requestRevision += 1; prefetchRevision += 1
      decoder?.terminate()
      for (const request of decodeRequests.values()) request.reject(new Error('Continuous paleo surface is disposed'))
      decodeRequests.clear()
      globe.removeFromParent(); map.removeFromParent()
      globe.geometry.dispose(); map.geometry.dispose(); material.dispose()
      for (const frame of cache.values()) { frame.coast.dispose(); if (frame.terrain !== terrainFallback) frame.terrain.dispose() }
      cache.clear(); oceanFallback.dispose(); terrainFallback.dispose()
    },
  }
}

export type ContinuousPaleoSurface = ReturnType<typeof createContinuousPaleoSurface>
