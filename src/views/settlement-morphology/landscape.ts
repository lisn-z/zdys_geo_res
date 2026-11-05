import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Landscape, Placement, SiteResult } from './types'
import { createSettlementWater } from './water'
import { createDubaiLandscape } from './dubai'
import { alpineHeight, alpineSurfaceWeights, alpineTreeSuitable, createAlpineSamples } from './alpine'
import { GRID_SIZE, HOUSE_SITE_HALF_WIDTH, HOUSE_SITE_HALF_DEPTH, snapCoordinate } from './placement'
import { createCoastalBoat } from './coastal-boat'
import { createNileFelucca, createNilePassengerBoat } from './nile-felucca'

// This is a geographic teaching model: proportions and siting are illustrative.
const X = 18
const Z = 12
const GRID = GRID_SIZE
const WATER = 0.24
const clamp = THREE.MathUtils.clamp
const mix = THREE.MathUtils.lerp
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}
function noise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = smooth(0, 1, x - ix), fz = smooth(0, 1, z - iz)
  return mix(mix(hash(ix, iz), hash(ix + 1, iz), fx), mix(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx), fz)
}
type SurfaceKind = 'earth' | 'wall' | 'roof' | 'road' | 'soil' | 'rock' | 'wood' | 'foliage'
type SurfaceImages = { albedo: HTMLCanvasElement; normal: HTMLCanvasElement; roughness: HTMLCanvasElement }
// Cache source pixels, never live materials: independent objects remain safe to dispose.
const surfaceImages = new Map<string, SurfaceImages>()
const surfaceSources = new WeakMap<HTMLCanvasElement, THREE.Source<HTMLCanvasElement>>()
function surfaceTexture(kind: SurfaceKind, seed = 0, repeatX = 1, repeatY = 1) {
  seed = Math.abs(Math.floor(seed)) % 5
  const key = `${kind}:${seed}`
  let images = surfaceImages.get(key)
  if (!images) {
    const size = kind === 'earth' || kind === 'rock' ? 512 : 256
    const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c }
    images = { albedo: canvas(), normal: canvas(), roughness: canvas() }
    const albedoCtx = images.albedo.getContext('2d')!, normalCtx = images.normal.getContext('2d')!, roughCtx = images.roughness.getContext('2d')!
    const colorPixels = albedoCtx.createImageData(size, size), normalPixels = normalCtx.createImageData(size, size), roughPixels = roughCtx.createImageData(size, size)
    const heights = new Float32Array(size * size)
    // A periodic noise sampler prevents seams on repeated ground and building surfaces.
    const periodic = (u: number, v: number, cells: number) => {
      const px = u * cells, py = v * cells, ix = Math.floor(px), iy = Math.floor(py)
      const fx = smooth(0, 1, px - ix), fy = smooth(0, 1, py - iy)
      const at = (x: number, y: number) => hash((x % cells) + seed * 11, (y % cells) + seed * 7)
      return mix(mix(at(ix, iy), at(ix + 1, iy), fx), mix(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy)
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, index = y * size + x, p = index * 4
      const broad = periodic(u, v, 4), grain = periodic(u, v, 32), speck = hash(x + seed * 31, y + 7)
      let value = .76 + (broad - .5) * .22 + (grain - .5) * .13 + (speck - .5) * .12
      let relief = grain * .45 + speck * .15, rough = .87, warmth = 0
      if (kind === 'earth') {
        const stone = speck > .986 ? .16 : speck < .016 ? -.19 : 0
        value += stone + (periodic(u, v, 11) - .5) * .1
        relief += stone * 1.7; warmth = .025
      } else if (kind === 'wall') {
        const row = Math.floor(v * 11), brickX = ((u * 6 + (row % 2) * .5) % 1)
        const mortar = Math.min(brickX, 1 - brickX) < .024 || (v * 11) % 1 < .06
        const exposed = broad < .47 || seed === 2
        const brick = hash(Math.floor(u * 6 + (row % 2) * .5), row + seed * 3)
        value = .84 + (broad - .5) * .17 + (speck - .5) * .075
        if (exposed) { value += mortar ? .08 : (brick - .5) * .17 - .065; relief = mortar ? .18 : .62 + grain * .09 }
        else relief = grain * .11 + speck * .045
        // Narrow runoff streaks and weathering keep stucco from reading as flat plastic.
        value -= Math.pow(periodic(u, v * .15, 16), 5) * .11
        rough = exposed ? .9 : .82; warmth = exposed && !mortar ? .015 : 0
      } else if (kind === 'roof') {
        const row = Math.floor(v * 9), tileX = (u * 12 + (row % 2) * .04) % 1, tileY = (v * 9) % 1
        const gutter = tileX < .045 || tileY < .075
        const tile = hash(Math.floor(u * 12), row + seed * 7)
        const curve = Math.pow(Math.sin(tileX * Math.PI), .7)
        relief = gutter ? .09 : .35 + curve * .4 + tileY * .12 + grain * .04
        value = .64 + curve * .14 + tile * .16 + (speck - .5) * .07 - (gutter ? .21 : 0)
        rough = .77 + tile * .13; warmth = .015
      } else if (kind === 'road') {
        const pebble = Math.pow(periodic(u, v, 52), 3)
        relief = pebble * .6 + speck * .2
        value = .76 + (broad - .5) * .17 + (pebble - .25) * .27 + (speck - .5) * .15
        rough = .98; warmth = .025
      } else if (kind === 'soil' || kind === 'rock') {
        const strata = Math.sin(v * Math.PI * 28 + periodic(u, v, 4) * 4)
        const fissure = Math.pow(Math.abs(Math.sin(u * 24 + v * 19 + broad * 6)), 26)
        relief = .5 + (broad - .5) * .35 + (grain - .5) * .3 + strata * .055 - fissure * .15
        value = .75 + (broad - .5) * .27 + (grain - .5) * .19 + (speck - .5) * .09 + strata * .035 - fissure * .08
        rough = .86 + grain * .11; warmth = kind === 'soil' ? .035 : .008
      } else if (kind === 'wood') {
        const fibres = Math.sin((u + periodic(u, v, 4) * .015) * Math.PI * 94)
        value = .73 + fibres * .08 + (grain - .5) * .08 + (broad - .5) * .19
        relief = fibres * .12 + grain * .08; rough = .82; warmth = .03
      } else {
        const leaf = periodic(u, v, 42), shade = periodic(u, v, 12)
        value = .63 + leaf * .3 + (shade - .5) * .28 + (speck - .5) * .08
        relief = leaf * .72 + shade * .13; rough = .92
      }
      heights[index] = relief
      colorPixels.data[p] = clamp((value + warmth) * 255, 0, 255)
      colorPixels.data[p + 1] = clamp(value * 255, 0, 255)
      colorPixels.data[p + 2] = clamp((value - warmth * 1.3) * 255, 0, 255)
      colorPixels.data[p + 3] = 255
      const r = clamp((rough + (speck - .5) * .055) * 255, 0, 255)
      roughPixels.data[p] = roughPixels.data[p + 1] = roughPixels.data[p + 2] = r; roughPixels.data[p + 3] = 255
    }
    const strength = kind === 'roof' ? 2.3 : kind === 'rock' ? 5 : kind === 'wall' ? 2.4 : 3
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const at = (dx: number, dy: number) => heights[((y + dy + size) % size) * size + (x + dx + size) % size]!
      const dx = (at(-1, 0) - at(1, 0)) * strength, dy = (at(0, -1) - at(0, 1)) * strength
      const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1), p = (y * size + x) * 4
      normalPixels.data[p] = (dx * inverse * .5 + .5) * 255; normalPixels.data[p + 1] = (dy * inverse * .5 + .5) * 255
      normalPixels.data[p + 2] = (inverse * .5 + .5) * 255; normalPixels.data[p + 3] = 255
    }
    albedoCtx.putImageData(colorPixels, 0, 0); normalCtx.putImageData(normalPixels, 0, 0); roughCtx.putImageData(roughPixels, 0, 0)
    surfaceImages.set(key, images)
  }
  const texture = (canvas: HTMLCanvasElement, color: boolean) => {
    const t = new THREE.CanvasTexture(canvas)
    const source = surfaceSources.get(canvas)
    if (source) t.source = source
    else surfaceSources.set(canvas, t.source)
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.anisotropy = 8
    return t
  }
  return { map: texture(images.albedo, true), normalMap: texture(images.normal, false), roughnessMap: texture(images.roughness, false) }
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = true; mesh.receiveShadow = true
  return mesh
}

/** A genuinely cut-out leafy twig: transparent gaps remain between individual leaves. */
function foliageTexture(olive = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')!, data = context.createImageData(256, 256)
  const paint = (x: number, y: number, r: number, g: number, b: number, alpha: number) => {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || x > 255 || y < 0 || y > 255) return
    const p = (y * 256 + x) * 4
    if (alpha < data.data[p + 3]!) return
    data.data[p] = r; data.data[p + 1] = g; data.data[p + 2] = b; data.data[p + 3] = alpha
  }
  const line = (ax: number, ay: number, bx: number, by: number, width: number) => {
    const length = Math.ceil(Math.hypot(bx - ax, by - ay) * 2)
    for (let i = 0; i <= length; i++) for (let dx = -width; dx <= width; dx++) for (let dy = -width; dy <= width; dy++) {
      if (dx * dx + dy * dy <= width * width) paint(mix(ax, bx, i / length) + dx, mix(ay, by, i / length) + dy, 140, 144, 111, 235)
    }
  }
  line(129, 244, 122, 22, 1)
  for (let row = 0; row < 8; row++) for (const side of [-1, 1]) {
    const junctionY = 46 + row * 23, spread = 26 + hash(row, side + 3) * 30
    const cx = 125 + side * spread, cy = junctionY - 11 + hash(row, side + 7) * 4
    const angle = side < 0 ? -.6 : -2.5, major = olive ? 20 : 19 + hash(row, side + 1) * 6, minor = olive ? 4.6 : 8 + hash(row, side + 9) * 2
    line(125, junctionY, cx, cy, 1)
    const cos = Math.cos(angle), sin = Math.sin(angle)
    for (let py = Math.floor(cy - major - 2); py <= cy + major + 2; py++) for (let px = Math.floor(cx - major - 2); px <= cx + major + 2; px++) {
      const dx = px - cx, dy = py - cy, u = dx * cos + dy * sin, v = -dx * sin + dy * cos
      const radius = u * u / (major * major) + v * v / (minor * minor)
      if (radius > 1) continue
      const vein = Math.abs(v) < .65 ? 13 : 0, variation = (hash(px, py) - .5) * 10
      const value = 187 + (1 - radius) * 22 + vein + variation + v / minor * 11
      paint(px, py, value - (olive ? 1 : 8), value + 5, value - (olive ? 8 : 26), clamp((1 - radius) * 1300, 0, 255))
    }
  }
  context.putImageData(data, 0, 0)
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8
  return map
}

function openLeafCluster(): THREE.BufferGeometry {
  const cards: THREE.BufferGeometry[] = []
  for (let i = 0; i < 28; i++) {
    const angle = i * 2.39996, radius = .14 + hash(i, 151) * .17
    const card = new THREE.PlaneGeometry(.35 + hash(i, 152) * .1, .36 + hash(i, 153) * .11)
    card.rotateX((hash(i, 154) - .5) * 1.3); card.rotateY(angle); card.rotateZ((hash(i, 155) - .5) * 2.8)
    card.translate(Math.cos(angle) * radius, (hash(i, 156) - .5) * .35, Math.sin(angle) * radius)
    cards.push(card)
  }
  const geometry = mergeGeometries(cards, false)!
  cards.forEach(card => card.dispose()); return geometry
}

function cerealGeometry(withEar: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const stalk = new THREE.CylinderGeometry(.0015, .0021, .145, 4); stalk.translate(0, .0725, 0); parts.push(stalk)
  // Leaves grow from nodes on the stalk and bend outwards, rather than floating.
  for (let leaf = 0; leaf < 3; leaf++) {
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    const angle = leaf * 2.45, length = .072 - leaf * .013, attachment = .033 + leaf * .032
    for (let step = 0; step <= 6; step++) {
      const t = step / 6, radius = length * t, width = Math.sin(Math.PI * t) * .0038
      for (const side of [-1, 1]) { positions.push(Math.cos(angle) * radius + Math.sin(angle) * width * side, attachment + Math.sin(Math.PI * t) * .024 + t * .012, Math.sin(angle) * radius - Math.cos(angle) * width * side); uv.push((side + 1) / 2, t) }
      if (step < 6) { const a = step * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); blade.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); blade.setIndex(indices); blade.computeVertexNormals(); parts.push(blade)
  }
  if (withEar) {
    const axis = new THREE.CylinderGeometry(.0008, .0011, .052, 4); axis.translate(0, .166, 0); parts.push(axis)
    for (let row = 0; row < 5; row++) for (const side of [-1, 1]) {
      const y = .147 + row * .0082, x = side * .0034
      const grain = new THREE.SphereGeometry(1, 5, 3)
      grain.scale(.0031, .0063, .0023); grain.rotateZ(-side * .58); grain.translate(x, y, (row % 2) * .0008); parts.push(grain)
      const awn = new THREE.BufferGeometry(), tipX = x + side * (.008 + row * .0007), tipY = y + .031
      awn.setAttribute('position', new THREE.Float32BufferAttribute([x - .00028, y + .004, 0, x + .00028, y + .004, 0, tipX + .00018, tipY, 0, tipX - .00018, tipY, 0], 3))
      awn.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); awn.setIndex([0, 1, 2, 0, 2, 3]); awn.computeVertexNormals(); parts.push(awn)
    }
  }
  const geometry = mergeGeometries(parts, false)!
  parts.forEach(part => part.dispose()); return geometry
}

/** Rasterize the actual near model, retaining its grains, awns and attached leaves. */
function cerealCardTexture(geometry: THREE.BufferGeometry): THREE.CanvasTexture {
  const size = 512, canvas = document.createElement('canvas'); canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!, pixels = context.createImageData(size, size)
  const depth = new Float32Array(size * size).fill(-Infinity)
  const position = geometry.attributes.position!, normal = geometry.attributes.normal!, index = geometry.index!
  const cosine = Math.cos(.45), sine = Math.sin(.45)
  const points: { x: number; y: number; z: number; shade: number }[] = []
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const light = Math.abs(normal.getX(i) * -.35 + normal.getY(i) * .79 + normal.getZ(i) * .5)
    points.push({ x: size * (.5 + (x * cosine + z * sine) / .16), y: size * (1 - y / .225), z: -x * sine + z * cosine, shade: .94 + clamp(light, 0, 1) * .06 })
  }
  for (let i = 0; i < index.count; i += 3) {
    const a = points[index.getX(i)]!, b = points[index.getX(i + 1)]!, c = points[index.getX(i + 2)]!
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
    if (Math.abs(denominator) < .00001) continue
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), maxX = Math.min(size - 1, Math.ceil(Math.max(a.x, b.x, c.x)))
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), maxY = Math.min(size - 1, Math.ceil(Math.max(a.y, b.y, c.y)))
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const u = ((b.y - c.y) * (x + .5 - c.x) + (c.x - b.x) * (y + .5 - c.y)) / denominator
      const v = ((c.y - a.y) * (x + .5 - c.x) + (a.x - c.x) * (y + .5 - c.y)) / denominator, w = 1 - u - v
      if (u < 0 || v < 0 || w < 0) continue
      const z = a.z * u + b.z * v + c.z * w, at = y * size + x
      if (z <= depth[at]!) continue
      const shade = (a.shade * u + b.shade * v + c.shade * w) * 255
      pixels.data[at * 4] = pixels.data[at * 4 + 1] = pixels.data[at * 4 + 2] = shade
      pixels.data[at * 4 + 3] = 255; depth[at] = z
    }
  }
  context.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8
  return map
}

function cerealCards(planes: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < planes; i++) {
    const plane = new THREE.PlaneGeometry(.16, .225)
    plane.translate(0, .1125, 0); plane.rotateY(i / planes * Math.PI); parts.push(plane)
  }
  const merged = mergeGeometries(parts, false)!
  parts.forEach(part => part.dispose()); return merged
}

function photographicCliff(material: THREE.MeshStandardMaterial): void {
  let disposed = false
  const requested = new THREE.TextureLoader().load('/geo-resources-folder/images/alpine-rock-albedo.png', texture => {
    if (disposed) { texture.dispose(); return }
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8
    const fallback = material.map; material.map = texture; material.needsUpdate = true; fallback?.dispose()
  }, undefined, () => { /* The complete procedural PBR texture remains available offline. */ })
  material.addEventListener('dispose', () => { disposed = true; requested.dispose() })
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCliffPosition;\nvarying vec3 vCliffNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCliffPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvCliffNormal = normalize(mat3(modelMatrix) * objectNormal);')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCliffPosition;\nvarying vec3 vCliffNormal;')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec3 cliffWeights = pow(abs(normalize(vCliffNormal)), vec3(5.0));
          cliffWeights /= max(dot(cliffWeights, vec3(1.0)), .0001);
          vec3 cliffAlbedo = texture2D(map, vCliffPosition.zy * .48).rgb * cliffWeights.x
            + texture2D(map, vCliffPosition.xz * .48 + vec2(.23,.41)).rgb * cliffWeights.y
            + texture2D(map, vCliffPosition.xy * .48 + vec2(.57,.13)).rgb * cliffWeights.z;
          diffuseColor.rgb *= cliffAlbedo;
        #endif
      `)
  }
  material.customProgramCacheKey = () => 'settlement-cliff-triplanar-v1'
}

/** Each returned object owns its materials, geometries and textures. Local base is y=0. */
export function createBuilding(id: Landscape, variant = 0): THREE.Group {
  const group = new THREE.Group()
  const k = Math.floor(hash(Math.abs(Math.floor(variant)), 27) * 10007)
  const coast = id === 'coast', alpine = id === 'valley', riverTown = id === 'river'
  const palettes = coast ? ['#d5aa70', '#d9bb81', '#e4d6b9', '#c87d69', '#b0be9f', '#d09a87', '#c58b58'] : riverTown ? ['#d8c5a0', '#d8cdb9', '#cabb9d', '#dfd6c5', '#c9b394'] : ['#d8d0bc', '#c7c1b2', '#d8d1c0', '#c8b8a1', '#d0c6b2']
  const wall = new THREE.MeshStandardMaterial({ color: palettes[k % palettes.length]!, ...surfaceTexture('wall', k), normalScale: new THREE.Vector2(.48, .48), roughness: .95 })
  const roof = new THREE.MeshStandardMaterial({ color: riverTown ? '#c2b297' : alpine ? '#706b62' : coast ? '#a97960' : ['#77756e', '#898378', '#7b7d79', '#7f786e', '#98785e', '#8b6c57'][k % 6]!, ...surfaceTexture(riverTown ? 'wall' : 'roof', k), normalScale: new THREE.Vector2(.9, .9), roughness: .95 })
  const stone = new THREE.MeshStandardMaterial({ color: '#a59e8e', ...surfaceTexture('rock', 2), normalScale: new THREE.Vector2(.45, .45), roughness: 1 })
  const wood = new THREE.MeshStandardMaterial({ color: alpine ? '#71604c' : coast ? '#637269' : '#77705e', ...surfaceTexture('wood', k), normalScale: new THREE.Vector2(.3, .3), roughness: .94 })
  const glass = new THREE.MeshStandardMaterial({ color: '#32434a', roughness: .13, metalness: .21, envMapIntensity: .85 })
  const trim = new THREE.MeshStandardMaterial({ color: '#d7d0bb', ...surfaceTexture('wall', 0), normalScale: new THREE.Vector2(.18, .18), roughness: .89 })
  const width = coast ? 1.06 + (k % 2) * .05 : riverTown ? .79 + hash(k, 11) * .24 : .88 + hash(k, 11) * .17
  const depth = .79 + hash(k, 12) * .14
  const height = coast ? 2.12 + (k % 4) * .27 : alpine ? 1.02 + (k % 2) * 0.16 : riverTown ? 1.05 + hash(k, 13) * 1.0 : .80 + hash(k, 13) * .24
  group.add(box(width + 0.045, 0.1, depth + 0.045, stone, 0, 0.05))
  group.add(box(width, height - 0.1, depth, wall, 0, (height + 0.1) / 2))
  const eave = Math.min(.6, width / 2 + .085), end = Math.min(.55, depth / 2 + .075), rise = alpine ? 0.42 : 0.3
  if (riverTown) {
    group.add(box(width + .035, .065, depth + .035, roof, 0, height + .015))
    for (const sign of [-1, 1]) {
      group.add(box(width + .04, .115, .055, wall, 0, height + .08, sign * depth / 2))
      group.add(box(.055, .115, depth, wall, sign * width / 2, height + .08))
    }
    if (k % 3 !== 0) group.add(box(.33, .22, .31, wall, -.14, height + .14, -.12))
  } else {
  const points = [
    -eave, height, -end, -eave, height, end, 0, height + rise, end, 0, height + rise, -end,
    0, height + rise, -end, 0, height + rise, end, eave, height, end, eave, height, -end,
  ]
  const roofGeo = new THREE.BufferGeometry()
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0], 2))
  roofGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  roofGeo.computeVertexNormals()
  const roofMesh = new THREE.Mesh(roofGeo, roof); roofMesh.castShadow = true; roofMesh.receiveShadow = true; group.add(roofMesh)
  const gable = new THREE.BufferGeometry()
  gable.setAttribute('position', new THREE.Float32BufferAttribute([-width / 2, height, -depth / 2, 0, height + rise - .014, -depth / 2, width / 2, height, -depth / 2, -width / 2, height, depth / 2, 0, height + rise - .014, depth / 2, width / 2, height, depth / 2], 3))
  gable.setAttribute('uv', new THREE.Float32BufferAttribute([0, .1, .5, .4, 1, .1, 0, .1, .5, .4, 1, .1], 2))
  gable.setIndex([0, 1, 2, 3, 5, 4]); gable.computeVertexNormals(); group.add(new THREE.Mesh(gable, wall))
  group.add(box(.055, .035, end * 2, roof, 0, height + rise + .008))
  group.add(box(eave * 2 - .025, 0.045, end * 2 - .025, wood, 0, height - .015))
  }
  const floors = coast ? 4 + k % 2 : alpine ? 2 : riverTown ? 2 + k % 2 : 1
  for (let floor = 0; floor < floors; floor++) {
    const wy = coast || riverTown ? 0.35 + floor * (height - .28) / floors : alpine ? .33 + floor * .47 : .48
    for (const xx of [-.27, .27]) {
      for (const sign of [-1, 1]) {
        group.add(box(.205, .255, .024, trim, xx, wy, sign * (depth / 2 + .014)))
        group.add(box(.145, .202, .029, glass, xx, wy, sign * (depth / 2 + .03)))
        group.add(box(.018, .215, .035, wood, xx, wy, sign * (depth / 2 + .035)))
        group.add(box(.15, .018, .037, wood, xx, wy - .025, sign * (depth / 2 + .038)))
        group.add(box(.228, .028, .085, stone, xx, wy - .145, sign * (depth / 2 + .04)))
        if (coast || alpine) for (const side of [-1, 1]) group.add(box(.058, .24, .03, wood, xx + side * .139, wy, sign * (depth / 2 + .028)))
      }
    }
    for (const sign of [-1, 1]) {
      group.add(box(.025, .25, .20, trim, sign * (width / 2 + .014), wy, 0))
      group.add(box(.032, .195, .14, glass, sign * (width / 2 + .028), wy, 0))
    }
  }
  group.add(box(.19, .34, .04, wood, 0, .2, depth / 2 + .025))
  group.add(box(.22, .025, .06, stone, 0, .381, depth / 2 + .03))
  group.add(box(.012, .026, .018, stone, .061, .21, depth / 2 + .052))
  group.add(box(.24, .045, .16, stone, 0, .023, depth / 2 + .05))
  if (alpine) {
    group.add(box(width + .02, .075, .04, wood, 0, .69, depth / 2 + .024))
    for (const xx of [-width / 2 + .04, width / 2 - .04]) group.add(box(.06, height - .1, .04, wood, xx, height / 2, depth / 2 + .022))
  }
  if (k % 4 !== 3 && !riverTown) {
    group.add(box(.14, .35, .15, wall, .29, height + .19, -.2))
    group.add(box(.18, .045, .19, stone, .29, height + .375, -.2))
  }
  // Batch all walls/windows/trim by material: a house needs six draw calls,
  // regardless of its number of windows. Every house still owns its resources.
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  for (const child of [...group.children]) {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    mesh.updateMatrix()
    const transformed = mesh.geometry.clone().applyMatrix4(mesh.matrix)
    const batch = batches.get(mesh.material) ?? []
    batch.push(transformed); batches.set(mesh.material, batch)
    mesh.geometry.dispose(); group.remove(child)
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false)
    if (merged) {
      const mesh = new THREE.Mesh(merged, material)
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    }
    geometries.forEach(geometry => geometry.dispose())
  }
  return group
}

export function createRoad(): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#b9b2a0', ...surfaceTexture('road', 0, 2, 2), normalScale: new THREE.Vector2(.55, .55), roughness: 1 })
  const tile = box(GRID, .035, GRID, material, 0, .0175)
  tile.castShadow = false
  group.add(tile)
  return group
}

export function createLandscape(id: Landscape): {
  group: THREE.Group
  terrain: THREE.Mesh
  constraints: THREE.Group
  labels: { id: string; text: string; position: THREE.Vector3 }[]
  samples: Placement[]
  site(x: number, z: number): SiteResult
  heightAt(x: number, z: number): number
  setGrowth?(value: number): void
  update(time: number): void
  dispose(): void
} {
  if (id === 'dubai') return createDubaiLandscape()
  const group = new THREE.Group()
  const constraints = new THREE.Group()
  constraints.visible = false
  group.add(constraints)
  const riverX = (z: number) => 6.8 + Math.sin(z * .15) * .35
  const riverHalfWidth = 4.8
  // Low, elongated river islets recall the visible green shoal in fig. 5-22.
  // Their positions and dimensions are illustrative, not an Aswan channel chart.
  const nileIslets = [{ x: 6.25, z: -.9, rx: .72, rz: 3.05 }, { x: 7.85, z: 4.4, rx: .48, rz: 1.4 }]
  function nileIsletHeight(x: number, z: number): number {
    let elevation = .08
    for (const island of nileIslets) {
      const along = (z - island.z) / island.rz
      const across = (x - island.x - Math.sin(along * 2.6) * .10) / island.rx
      const radius = Math.hypot(across, along)
      elevation = Math.max(elevation, .08 + (1 - smooth(.40, 1.08, radius)) * .39)
    }
    return elevation
  }
  function riverBedHeight(x: number, z: number): number {
    const distance = Math.abs(x - riverX(z))
    const bank = smooth(riverHalfWidth - .28, riverHalfWidth + .35, distance)
    const distantRidge = smooth(12.2, 18, -x) * (.45 + noise(x * .12, z * .12) * .28)
    const outerPlain = smooth(14, 18, x) * .10
    const fine = (noise(x * .68, z * .68) - .5) * .045
    return .08 + bank * .47 + distantRidge + outerPlain + fine * bank * .45
  }
  const shoreX = (z: number) => 7.45 + 2.35 * Math.exp(-((z + 2) ** 2) / 19) - 1.45 * Math.exp(-((z - 6.2) ** 2) / 5.8) + Math.sin(z * .42) * .28
  const coastalPads = new Map<string, [number, number][]>()
  const coastalHomes: Placement[] = []
  const coastalCells = new Set<string>()
  for (let row = 0; row < 9; row++) for (let column = 0; column < 8; column++) {
    // A visible house platform must remain reachable after manual pointer snapping.
    // Previously the sample-only 1.45/1.42 lattice left just one usable 1.8-grid cell.
    const x = snapCoordinate(-1.4 + column * 1.45 + (row % 2) * .46)
    const z = snapCoordinate(-7.2 + row * 1.42)
    if (((x - 3.65) / 5.45) ** 2 + ((z + 1.6) / 5.2) ** 2 > 1 || shoreX(z) - x < .98) continue
    const cell = `${x}:${z}`
    if (coastalCells.has(cell)) continue
    coastalCells.add(cell)
    const key = `${Math.floor(x / GRID)}:${Math.floor(z / GRID)}`, bucket = coastalPads.get(key) ?? []
    bucket.push([x, z]); coastalPads.set(key, bucket)
    coastalHomes.push({ id: `sample-coast-house-${row}-${column}`, kind: 'house', x, z, rotation: -Math.PI / 2 + (hash(column, row + 51) - .5) * .14 })
  }
  const coastalLand = (x: number, z: number) => {
    const inland = Math.max(0, shoreX(z) - x)
    return 1.86 + smooth(0, 16.5, inland) * 3.48 + (noise(x * .24, z * .24) - .5) * .18
  }
  const coastalTerraces = [
    { x: -10.8, level: 5.65 },
    { x: -7.2, level: 4.95 },
    { x: -3.6, level: 4.25 },
  ]
  const terraceShift = (z: number) => Math.sin(z * .32) * .12
  function coastalTerracedLand(x: number, z: number): number {
    const natural = coastalLand(x, z), localX = x - terraceShift(z)
    const coverage = smooth(-12.8, -12.2, localX) * (1 - smooth(-2.2, -1.7, localX)) * (1 - smooth(8.4, 9.3, Math.abs(z)))
    if (!coverage) return natural
    let level = coastalTerraces[0]!.level
    for (let i = 0; i < coastalTerraces.length - 1; i++) {
      const terrace = coastalTerraces[i]!, next = coastalTerraces[i + 1]!
      level = mix(level, next.level, smooth(terrace.x + 1.4, terrace.x + 1.58, localX))
    }
    return mix(natural, level, coverage)
  }
  function height(x: number, z: number): number {
    const fine = (noise(x * .68, z * .68) - .5) * .045
    if (id === 'plain') return .58 + Math.sin(x * .14) * .035 + Math.cos(z * .19) * .025 + fine * .35
    if (id === 'valley') {
      return alpineHeight(x, z)
    }
    if (id === 'river') {
      // Textbook fig. 5-22 shows broad water and low, dry banks, with only a
      // distant desert ridge. Two high side slopes would read as an Alpine valley.
      return Math.max(riverBedHeight(x, z), nileIsletHeight(x, z))
    }
    const inland = shoreX(z) - x
    if (inland < 0) return .07 + fine
    // Agricultural treads are actual terrain, not colored strips draped over a slope.
    // Village pads share the manual grid and include a small footprint margin.
    let land = coastalTerracedLand(x, z)
    const gx = Math.floor(x / GRID), gz = Math.floor(z / GRID)
    for (let ix = gx - 1; ix <= gx + 1; ix++) for (let iz = gz - 1; iz <= gz + 1; iz++) {
      for (const pad of coastalPads.get(`${ix}:${iz}`) ?? []) {
        const distance = Math.max(Math.abs(x - pad[0]) / (HOUSE_SITE_HALF_WIDTH + .08), Math.abs(z - pad[1]) / (HOUSE_SITE_HALF_DEPTH + .08))
        land = mix(land, coastalTerracedLand(pad[0], pad[1]), 1 - smooth(1, 1.18, distance))
      }
    }
    const cliff = smooth(.02, .46, inland)
    return .08 + cliff * (land - .08) + fine * .3
  }
  function wet(x: number, z: number): boolean {
    return id === 'river' ? Math.abs(x - riverX(z)) < riverHalfWidth + .3 : id === 'coast' ? x > shoreX(z) - .37 : false
  }
  function site(x: number, z: number): SiteResult {
    const h = height(x, z)
    const nearWater = id === 'river' ? Math.abs(x - riverX(z)) < riverHalfWidth + 4.3 : id === 'coast' ? shoreX(z) - x < 5.3 : false
    const offsets = [[0, 0], [-HOUSE_SITE_HALF_WIDTH, -HOUSE_SITE_HALF_DEPTH], [HOUSE_SITE_HALF_WIDTH, -HOUSE_SITE_HALF_DEPTH], [-HOUSE_SITE_HALF_WIDTH, HOUSE_SITE_HALF_DEPTH], [HOUSE_SITE_HALF_WIDTH, HOUSE_SITE_HALF_DEPTH]]
    const heights = offsets.map(([dx, dz]) => height(x + dx!, z + dz!))
    const slope = Math.max(...heights) - Math.min(...heights)
    // Start the foundation at the lowest sampled corner, keeping it embedded
    // in gently uneven ground instead of leaving a floating downhill edge.
    const result = { valid: true, reason: '满足模型的平缓陆地条件，可以放置', height: Math.min(...heights), slope, nearWater }
    if (Math.abs(x) > 16.5 || Math.abs(z) > 10.7) return { ...result, valid: false, reason: '已接近地块边缘，请向内选择位置' }
    if (offsets.some(([dx, dz]) => wet(x + dx!, z + dz!))) return { ...result, valid: false, reason: '这里是水域或紧邻水边，请移到较高的陆地' }
    // Elevation alone does not make a flat coastal tread unusable. Keep rejecting
    // water, cliff edges and steep risers through the same footprint measurements.
    if (slope > .12 || id !== 'coast' && h > 1.08) return { ...result, valid: false, reason: id === 'coast' ? '房屋占地跨到陡坡或台阶边缘，请移到平整台面中央' : id === 'river' ? '远处地面起伏较大，请比较较平缓的河岸陆地' : '山坡较陡，平缓的谷地更便于集中建设' }
    return result
  }

  const groundGeo = new THREE.PlaneGeometry(X * 2, Z * 2, 240, 160)
  groundGeo.rotateX(-Math.PI / 2)
  const positions = groundGeo.attributes.position!
  const colors: number[] = []
  const shade = new THREE.Color()
  const lowColor = new THREE.Color(id === 'plain' ? '#b1ae87' : id === 'coast' ? '#a3aa80' : id === 'river' ? '#cdbd9a' : '#a0ac7c')
  const highColor = new THREE.Color(id === 'coast' ? '#839071' : id === 'river' ? '#b9a485' : '#7b8e69')
  const rockColor = new THREE.Color('#b4b0a0')
  const groundColorAt = (x: number, z: number, h: number, color: THREE.Color) => {
    if (id === 'valley') {
      const cover = alpineSurfaceWeights(x, z)
      return color.set('#91ad68').lerp(new THREE.Color('#4f7049'), cover.woodland * .65).lerp(rockColor, cover.rock).multiplyScalar(.94 + noise(x * .3, z * .3) * .1)
    }
    if (id === 'river') {
      color.copy(lowColor).lerp(highColor, smooth(.65, 1.35, h))
      if (wet(x, z)) color.set('#a5a48d')
      if (nileIsletHeight(x, z) > WATER) color.set('#bcaf83').lerp(new THREE.Color('#7e925e'), smooth(WATER + .025, .42, h))
      return color.multiplyScalar(.93 + noise(x * .24, z * .24) * .10)
    }
    color.copy(lowColor).lerp(highColor, smooth(.75, 4, h))
    const gradient = Math.hypot(height(x + .15, z) - height(x - .15, z), height(x, z + .15) - height(x, z - .15)) / .3
    const outcrop = smooth(.28, .7, gradient) * smooth(.32, .66, noise(x * .65, z * .58))
    color.lerp(rockColor, outcrop * .85 + smooth(3.8, 6.1, h) * .28)
    if (id === 'coast') color.lerp(rockColor, (1 - smooth(.55, 1.3, shoreX(z) - x)) * .96)
    if (wet(x, z)) color.set('#9a9b83')
    color.multiplyScalar(.84 + noise(x * .17, z * .17) * .23 + noise(x * 1.1, z * 1.1) * .075)
    return color
  }
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), h = height(x, z)
    positions.setY(i, h)
    groundColorAt(x, z, h, shade)
    colors.push(shade.r, shade.g, shade.b)
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  groundGeo.computeVertexNormals()
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, ...surfaceTexture('earth', 0, 12, 8), normalScale: new THREE.Vector2(.7, .7), roughness: 1 })
  const terrain = new THREE.Mesh(groundGeo, groundMat)
  terrain.receiveShadow = true; terrain.name = 'selectable-land-surface'; group.add(terrain)

  // A closed terrain block: continuous boundary walls and a solid underside.
  const perimeter: [number, number][] = []
  const borderSteps = 120
  for (let n = 0; n < borderSteps; n++) perimeter.push([-X + n / borderSteps * X * 2, -Z])
  for (let n = 0; n < borderSteps; n++) perimeter.push([X, -Z + n / borderSteps * Z * 2])
  for (let n = 0; n < borderSteps; n++) perimeter.push([X - n / borderSteps * X * 2, Z])
  for (let n = 0; n < borderSteps; n++) perimeter.push([-X, Z - n / borderSteps * Z * 2])
  const edgePos: number[] = [], edgeUv: number[] = [], edgeIdx: number[] = []
  perimeter.forEach(([x, z], n) => {
    edgePos.push(x, height(x, z), z, x, -1.15, z)
    edgeUv.push(n / 7, 1, n / 7, 0)
    const next = (n + 1) % perimeter.length
    edgeIdx.push(n * 2, next * 2, n * 2 + 1, next * 2, next * 2 + 1, n * 2 + 1)
  })
  const edgeGeo = new THREE.BufferGeometry()
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3)); edgeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(edgeUv, 2)); edgeGeo.setIndex(edgeIdx); edgeGeo.computeVertexNormals()
  const soilMat = new THREE.MeshStandardMaterial({ color: '#8d8065', ...surfaceTexture('soil'), normalScale: new THREE.Vector2(.65, .65), roughness: 1, side: THREE.DoubleSide })
  const edge = new THREE.Mesh(edgeGeo, soilMat); edge.castShadow = true; edge.receiveShadow = true; group.add(edge)
  group.add(box(36, .12, 24, new THREE.MeshStandardMaterial({ color: '#665c48', roughness: 1 }), 0, -1.21))

  const ribbonMaterials = new Map<string, THREE.MeshStandardMaterial>()
  function ribbon(points: [number, number][], width: number, color: string, opacity = 1): THREE.Mesh {
    const vertices: number[] = [], indices: number[] = []
    points.forEach(([x, z], i) => {
      const prev = points[Math.max(0, i - 1)]!, next = points[Math.min(points.length - 1, i + 1)]!
      const dx = next[0] - prev[0], dz = next[1] - prev[1], length = Math.hypot(dx, dz) || 1
      const nx = -dz / length * width / 2, nz = dx / length * width / 2
      for (const s of [-1, 1]) vertices.push(x + nx * s, height(x + nx * s, z + nz * s) + .022, z + nz * s)
      if (i < points.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    })
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals()
    const key = `${color}:${opacity}`
    let material = ribbonMaterials.get(key)
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity === 1 })
      ribbonMaterials.set(key, material)
    }
    const mesh = new THREE.Mesh(geo, material)
    mesh.name = 'field-detail'; mesh.receiveShadow = true; group.add(mesh); return mesh
  }

  // Agricultural parcels sit on the terrain, with subtle furrows and narrow earthen banks.
  const fieldTones = ['#a7aa7d', '#b3ae81', '#a0a578', '#b3aa80', '#9ca17a']
  const parcels: { x: number; z: number; w: number; d: number; seed: number }[] = []
  function field(x: number, z: number, w: number, d: number, seed: number): void {
    parcels.push({ x, z, w, d, seed })
    const geo = new THREE.PlaneGeometry(w, d, 12, 8); geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position!, fieldColors: number[] = []
    const crop = new THREE.Color(fieldTones[seed % fieldTones.length]!), color = new THREE.Color()
    for (let n = 0; n < pos.count; n++) {
      const localX = pos.getX(n), localZ = pos.getZ(n)
      const px = localX + x + Math.sin(localZ * .6 + seed) * .035, pz = localZ + z
      const h = height(px, pz), edgeDistance = Math.min(w / 2 - Math.abs(localX), d / 2 - Math.abs(localZ))
      pos.setXYZ(n, px, h + .018, pz)
      groundColorAt(px, pz, h, color)
      color.lerp(crop, smooth(0, .24, edgeDistance) * .8).multiplyScalar(.92 + noise(px * .8, pz * .8) * .16)
      fieldColors.push(color.r, color.g, color.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(fieldColors, 3))
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, ...surfaceTexture('earth', seed, w * .65, d * .65), normalScale: new THREE.Vector2(.56, .56), roughness: 1 }))
    mesh.receiveShadow = true; group.add(mesh)
    for (let zz = z - d / 2 + .1; zz <= z + d / 2 - .1; zz += .24) {
      const pts: [number, number][] = []
      for (let xx = x - w / 2 + .07; xx <= x + w / 2 - .07; xx += .2) pts.push([xx, zz + Math.sin(xx * 1.5 + seed) * .018])
      ribbon(pts, .019, '#687150', .2)
    }
    ribbon([[x - w / 2, z - d / 2], [x + w / 2, z - d / 2]], .055, '#aaa17d')
    ribbon([[x - w / 2, z + d / 2], [x + w / 2, z + d / 2]], .055, '#aaa17d')
  }
  if (id === 'plain') {
    // Long agricultural strips and staggered divisions avoid a toy checkerboard.
    for (let ix = 0; ix < 3; ix++) for (const s of [-1, 1]) {
      const widths = [2.25, 2.7, 2.2], centers = [9.7, 12.55, 15.3]
      const split = -2.6 + hash(ix, s + 4) * 4.8
      field(s * centers[ix]!, (-11 + split) / 2, widths[ix]!, split + 10.8, ix + (s + 1))
      field(s * centers[ix]!, (11 + split) / 2, widths[ix]!, 10.8 - split, ix + 3 + (s + 1))
    }
    field(0, -10.1, 14.9, 2.1, 7); field(0, 10.1, 14.9, 2.1, 8)
  } else if (id === 'river') {
    for (let iz = 0; iz < 4; iz++) field(-7.25, -8.4 + iz * 5.3, 2.05, 4.9, iz + 1)
    const strip: [number, number][] = []
    for (let z = -11.6; z <= 11.6; z += .2) strip.push([riverX(z) - riverHalfWidth - .55, z])
    ribbon(strip, .43, '#8a9970', .8)
  } else if (id === 'coast') {
    const terraceStone = new THREE.MeshStandardMaterial({ color: '#9c9481', ...surfaceTexture('rock', 3, 2, 2), normalScale: new THREE.Vector2(1, 1), roughness: 1, side: THREE.DoubleSide })
    const stoneBlocks: { x: number; y: number; z: number; height: number; row: number }[] = []
    for (let index = 0; index < coastalTerraces.length; index++) {
      const terrace = coastalTerraces[index]!
      for (const z of [-5.4, 0, 5.4]) field(terrace.x, z, 2.48, 4.62, index + Math.round(z + 10))
      // The wall follows the steep face in height(), so its top is a real, usable
      // tread rather than an ornamental strip over sloping ground.
      const wallVertices: number[] = [], wallUv: number[] = [], wallIndices: number[] = []
      const wallSteps = 88
      for (let i = 0; i <= wallSteps; i++) {
        const z = -8.1 + i / wallSteps * 16.2, x = terrace.x + 1.58 + terraceShift(z)
        const bottom = Math.min(terrace.level - .05, height(x + .12, z) - .035)
        wallVertices.push(x, terrace.level + .025, z, x, bottom, z)
        wallUv.push(z * .8, terrace.level * 2, z * .8, bottom * 2)
        if (i < wallSteps) { const n = i * 2; wallIndices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2) }
      }
      const wallGeo = new THREE.BufferGeometry()
      wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallVertices, 3)); wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUv, 2)); wallGeo.setIndex(wallIndices); wallGeo.computeVertexNormals()
      const wall = new THREE.Mesh(wallGeo, terraceStone)
      wall.name = 'coastal-terrace-retaining-face'; wall.castShadow = true; wall.receiveShadow = true; group.add(wall)
      for (let z = -7.95; z <= 7.95; z += .4) {
        const x = terrace.x + 1.59 + terraceShift(z), bottom = height(x + .12, z) - .025
        for (let row = 0, top = terrace.level + .025; top - .09 > bottom; row++, top -= .18) {
          const blockHeight = Math.min(.165, top - bottom)
          stoneBlocks.push({ x, y: top - blockHeight / 2, z: z + (row % 2) * .12, height: blockHeight, row })
        }
      }
      const path: [number, number][] = []
      for (let z = -8; z <= 8; z += .2) path.push([terrace.x + 1.13 + terraceShift(z), z])
      ribbon(path, .16, '#b0a486')
      // Long, dark planting lines make the contour-parallel rows legible at class scale.
      for (const offset of [-.7, 0, .7]) {
        const row: [number, number][] = []
        for (let z = -7.65; z <= 7.65; z += .2) row.push([terrace.x + offset, z])
        ribbon(row, .055, '#596b45', .65)
      }
    }
    const masonry = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .16, .365), terraceStone, stoneBlocks.length)
    const stonePose = new THREE.Object3D()
    stoneBlocks.forEach((block, i) => {
      stonePose.position.set(block.x + .025, block.y, block.z)
      stonePose.scale.set(1, block.height / .16, .94 + hash(i, 83) * .12)
      stonePose.rotation.set(0, Math.cos(block.z * .32) * .038, (hash(i, 85) - .5) * .025)
      stonePose.updateMatrix(); masonry.setMatrixAt(i, stonePose.matrix)
      masonry.setColorAt(i, new THREE.Color().setHSL(.105, .12, .77 + hash(i, 87) * .16))
    })
    masonry.name = 'coastal-terrace-stone-courses'; masonry.castShadow = true; masonry.receiveShadow = true; group.add(masonry)
  }

  let waterSurface: ReturnType<typeof createSettlementWater> | undefined
  if (id === 'river' || id === 'coast') {
    const vertices: number[] = [], indices: number[] = [], uv: number[] = [], depths: number[] = []
    const steps = 180, across = 8, stride = across + 1
    for (let i = 0; i <= steps; i++) {
      const z = -Z + i / steps * Z * 2
      const riverEdge = (sign: number) => {
        let low = 0, high = riverHalfWidth + .7
        // Solve only the banks: an emerged mid-channel islet must not move the
        // outer water boundary or split the already-closed river cut faces.
        for (let n = 0; n < 18; n++) { const mid = (low + high) / 2; if (riverBedHeight(riverX(z) + sign * mid, z) < WATER) low = mid; else high = mid }
        return riverX(z) + sign * (low + high) / 2
      }
      let coastLow = shoreX(z) - .8, coastHigh = shoreX(z) + .05
      if (id === 'coast') for (let n = 0; n < 18; n++) { const mid = (coastLow + coastHigh) / 2; if (height(mid, z) > WATER) coastLow = mid; else coastHigh = mid }
      const left = id === 'river' ? riverEdge(-1) : (coastLow + coastHigh) / 2
      const right = id === 'river' ? riverEdge(1) : X
      for (let j = 0; j <= across; j++) {
        const x = mix(left, right, j / across)
        vertices.push(x, WATER, z); uv.push(x * .3, z * .3); depths.push(Math.max(.015, WATER - height(x, z)))
        if (i < steps && j < across) {
          const a = i * stride + j, b = a + stride
          indices.push(a, b, a + 1, a + 1, b, b + 1)
        }
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('waterDepth', new THREE.Float32BufferAttribute(depths, 1)); geo.setIndex(indices); geo.computeVertexNormals()
    waterSurface = createSettlementWater(id)
    const water = new THREE.Mesh(geo, waterSurface.material)
    water.receiveShadow = true; water.name = 'water'; group.add(water)
    // The surface meets the exact terrain/water intersection. Cut faces connect
    // to the real riverbed; the soil block closes the remainder down to the base.
    const closurePoints: number[] = [], closureIndices: number[] = []
    const wallQuad = (a: number, b: number) => {
      const ax = vertices[a * 3]!, az = vertices[a * 3 + 2]!, bx = vertices[b * 3]!, bz = vertices[b * 3 + 2]!
      const ay = Math.min(WATER, height(ax, az)), by = Math.min(WATER, height(bx, bz)), start = closurePoints.length / 3
      closurePoints.push(ax, WATER, az, bx, WATER, bz, bx, by, bz, ax, ay, az)
      closureIndices.push(start, start + 1, start + 2, start, start + 2, start + 3)
    }
    for (let j = 0; j < across; j++) { wallQuad(j + 1, j); wallQuad(steps * stride + j, steps * stride + j + 1) }
    for (let i = 0; i < steps; i++) { wallQuad(i * stride, (i + 1) * stride); wallQuad((i + 1) * stride + across, i * stride + across) }
    const closureGeo = new THREE.BufferGeometry(); closureGeo.setAttribute('position', new THREE.Float32BufferAttribute(closurePoints, 3)); closureGeo.setIndex(closureIndices); closureGeo.computeVertexNormals()
    const closure = new THREE.Mesh(closureGeo, new THREE.MeshStandardMaterial({ color: id === 'coast' ? '#527b85' : '#71978d', roughness: .45, transparent: true, opacity: .92, depthWrite: true, side: THREE.DoubleSide }))
    closure.name = 'water-closed-cut-faces'; group.add(closure)
  }

  if (id === 'river') {
    // Modest landing places and small sailboats make riverside activity visible;
    // the photograph does not justify an invented container or industrial port.
    const waterfront = new THREE.Group(); waterfront.name = 'nile-riverside-landings'
    const quayStone = new THREE.MeshStandardMaterial({ color: '#c0b89e', ...surfaceTexture('rock', 2, 2, 1), roughness: .94 })
    const timber = new THREE.MeshStandardMaterial({ color: '#8a7359', ...surfaceTexture('wood', 2, 2, 1), roughness: .92 })
    const rope = new THREE.MeshStandardMaterial({ color: '#c3b18a', roughness: 1 })
    for (const centreZ of [-5.2, 5.1]) {
      const quayX = riverX(centreZ) - riverHalfWidth - .12
      for (let n = 0; n < 16; n++) {
        const z = centreZ - 2.55 + n * .30, x = riverX(z) - riverHalfWidth - .12
        waterfront.add(box(.65, .37, .31, quayStone, x, .355, z))
      }
      const pierZ = centreZ + 1.1
      waterfront.add(box(1.25, .105, .46, timber, quayX + .68, .48, pierZ))
      for (const x of [quayX + .18, quayX + 1.18]) for (const z of [pierZ - .17, pierZ + .17]) {
        waterfront.add(box(.065, .43, .065, timber, x, .29, z))
      }
      // Two broad steps meet the land without occupying a manual house cell.
      waterfront.add(box(.37, .14, .9, quayStone, quayX - .40, .46, centreZ - .7))
      const boat = createNilePassengerBoat(centreZ < 0 ? 0 : 1)
      boat.position.set(quayX + 1.0, WATER, centreZ - .95); waterfront.add(boat)
      const line = new THREE.CatmullRomCurve3([
        new THREE.Vector3(quayX + 1.02, WATER + .23, centreZ + .74),
        new THREE.Vector3(quayX + .7, WATER + .16, centreZ + .73),
        new THREE.Vector3(quayX + .24, .54, pierZ),
      ])
      waterfront.add(new THREE.Mesh(new THREE.TubeGeometry(line, 12, .009, 5, false), rope))
    }
    const sailingBoat = createNileFelucca(2)
    sailingBoat.scale.setScalar(.75); sailingBoat.position.set(9.3, WATER, -.1); sailingBoat.rotation.y = -.42; waterfront.add(sailingBoat)
    const distantSailboat = createNileFelucca(3)
    distantSailboat.scale.setScalar(.72); distantSailboat.position.set(7.8, WATER, -7.1); distantSailboat.rotation.y = .22; waterfront.add(distantSailboat)
    waterfront.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
    group.add(waterfront)

    // Short reeds stay on the emerged islet surface; no sample building or
    // manual placement is allowed in this small, water-surrounded channel zone.
    const reedGeometry = new THREE.ConeGeometry(.10, .30, 5)
    const reedMaterial = new THREE.MeshStandardMaterial({ color: '#74854c', roughness: 1 })
    const reedSeeds: [number, number, number][] = []
    for (const island of nileIslets) for (let n = 0; n < 24; n++) {
      const x = island.x + (hash(n, island.x) - .5) * island.rx * 1.2
      const z = island.z + (hash(n, island.z + 83) - .5) * island.rz * 1.65
      if (height(x, z) > WATER + .08) reedSeeds.push([x, z, .45 + hash(n, 80) * .70])
    }
    const reeds = new THREE.InstancedMesh(reedGeometry, reedMaterial, reedSeeds.length), reedPose = new THREE.Object3D()
    reedSeeds.forEach(([x, z, scale], index) => {
      reedPose.position.set(x, height(x, z) + scale * .15, z); reedPose.scale.set(scale, scale, scale)
      reedPose.rotation.y = hash(x, z) * Math.PI; reedPose.updateMatrix(); reeds.setMatrixAt(index, reedPose.matrix)
    })
    reeds.name = 'nile-low-islet-reeds'; reeds.castShadow = true; reeds.receiveShadow = true; group.add(reeds)
  }

  if (id === 'coast') {
    // A sheltered inlet, curved rubble mole and fishing boats recall the textbook
    // photograph without claiming to reproduce a named village's street plan.
    const cliffPoints: number[] = [], cliffUv: number[] = [], cliffIndices: number[] = []
    const cliffAcross = 8, cliffSteps = 180
    for (let i = 0; i <= cliffSteps; i++) for (let j = 0; j <= cliffAcross; j++) {
      const z = -Z + i / cliffSteps * Z * 2, x = shoreX(z) - .018 - j / cliffAcross * .76, y = height(x, z)
      cliffPoints.push(x, y + .007, z); cliffUv.push(z * .53, y * .64)
      if (i < cliffSteps && j < cliffAcross) { const a = i * (cliffAcross + 1) + j, b = a + cliffAcross + 1; cliffIndices.push(a, a + 1, b, a + 1, b + 1, b) }
    }
    const cliffGeo = new THREE.BufferGeometry(); cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(cliffPoints, 3)); cliffGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cliffUv, 2)); cliffGeo.setIndex(cliffIndices); cliffGeo.computeVertexNormals()
    const cliff = new THREE.Mesh(cliffGeo, new THREE.MeshStandardMaterial({ color: '#bbb9ac', ...surfaceTexture('rock', 0), normalScale: new THREE.Vector2(.92, .92), roughness: 1, side: THREE.DoubleSide }))
    photographicCliff(cliff.material)
    cliff.receiveShadow = true; group.add(cliff)
    const stone = new THREE.MeshStandardMaterial({ color: '#b9b7a6', ...surfaceTexture('rock', 1, 2, 2), normalScale: new THREE.Vector2(.85, .85), roughness: 1 })
    const mole: [number, number][] = [[shoreX(9.2) - .1, 9.2], [8.9, 9.4], [10.35, 9.0], [11.15, 8.1], [11.1, 6.95]]
    const rubbleGeo = new THREE.SphereGeometry(.26, 8, 6), rubble = new THREE.InstancedMesh(rubbleGeo, stone, (mole.length - 1) * 14)
    const pose = new THREE.Object3D()
    for (let j = 0; j < mole.length - 1; j++) {
      const a = mole[j]!, b = mole[j + 1]!, dx = b[0] - a[0], dz = b[1] - a[1]
      const segment = box(.47, .26, Math.hypot(dx, dz) + .15, stone, (a[0] + b[0]) / 2, WATER + .025, (a[1] + b[1]) / 2)
      segment.rotation.y = Math.atan2(dx, dz); group.add(segment)
      for (let k = 0; k < 14; k++) {
        const t = k / 13, scale = .65 + hash(j, k) * .7
        pose.position.set(mix(a[0], b[0], t) + (hash(k, j + 18) - .5) * .44, WATER + .02 + hash(k, j + 3) * .09, mix(a[1], b[1], t) + (hash(k, j + 9) - .5) * .36)
        pose.scale.set(scale, scale * .68, scale); pose.rotation.set(k, j, k * .3); pose.updateMatrix(); rubble.setMatrixAt(j * 14 + k, pose.matrix)
      }
    }
    rubble.castShadow = true; rubble.receiveShadow = true; group.add(rubble)
    const boatSpots = [[7.35, 6.05], [8.0, 7.0], [8.75, 6.45], [9.2, 7.7]]
    boatSpots.forEach(([x, z], i) => {
      const boat = createCoastalBoat(i)
      boat.position.set(x!, WATER, z!); boat.rotation.y = -.35 + i * .22; group.add(boat)
    })
    const steps = 18, stairX = shoreX(6.6) - .62, stairTop = height(stairX, 6.6)
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      group.add(box(.36, .095, .24, stone, stairX + t * .7, mix(stairTop, WATER + .14, t), 6.6 + t * 2.0))
    }
  }

  // Sparse vegetation gives scale while leaving the inhabited corridor legible.
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#807562', ...surfaceTexture('wood', 3, 2, 1), normalScale: new THREE.Vector2(.6, .6), roughness: 1 })
  const leafMaterial = new THREE.MeshStandardMaterial({ color: '#eff0df', map: foliageTexture(id === 'coast'), roughness: .94, side: THREE.DoubleSide, alphaTest: .48 })
  leafMaterial.forceSinglePass = true
  const stemParts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(.014, .025, .5, 7)]
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.39996, start = new THREE.Vector3(0, .05 + hash(i, 161) * .1, 0)
    const end = new THREE.Vector3(Math.cos(angle) * .24, .36 + hash(i, 162) * .09, Math.sin(angle) * .24)
    const direction = end.clone().sub(start), branch = new THREE.CylinderGeometry(.0028, .007, direction.length(), 5)
    branch.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    branch.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2); stemParts.push(branch)
  }
  const trunkGeo = mergeGeometries(stemParts, false)!
  stemParts.forEach(part => part.dispose())
  let crownGeo: THREE.BufferGeometry
  if (id === 'river') {
    const points: number[] = [], uv: number[] = [], index: number[] = []
    for (let frond = 0; frond < 8; frond++) {
      const angle = frond / 8 * Math.PI * 2, start = points.length / 3
      for (let part = 0; part <= 8; part++) {
        const t = part / 8, radius = t * (.5 + (frond % 2) * .1), width = Math.sin(t * Math.PI) * .052
        for (const sign of [-1, 1]) {
          points.push(Math.cos(angle) * radius + Math.sin(angle) * width * sign, Math.sin(t * Math.PI) * .15 - t * .15, Math.sin(angle) * radius - Math.cos(angle) * width * sign)
          uv.push((sign + 1) / 2, t)
        }
        if (part < 8) { const a = start + part * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
      }
    }
    crownGeo = new THREE.BufferGeometry(); crownGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); crownGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); crownGeo.setIndex(index)
    leafMaterial.side = THREE.DoubleSide
  } else crownGeo = openLeafCluster()
  const leafPositions = crownGeo.attributes.position!
  for (let i = 0; i < leafPositions.count; i++) {
    const x = leafPositions.getX(i), y = leafPositions.getY(i), z = leafPositions.getZ(i)
    const irregularity = .86 + noise(x * 8 + y * 3, z * 8 - y * 2) * .3 + Math.sin(x * 29 + y * 18 + z * 23) * .055
    leafPositions.setXYZ(i, x * irregularity, y * irregularity, z * irregularity)
  }
  crownGeo.computeVertexNormals()
  const treeSeeds: [number, number, number][] = []
  for (let i = 0; i < 205; i++) {
    const x = -17.2 + hash(i, 5) * 34.4, z = -11.4 + hash(i, 7) * 22.8
    const h = height(x, z)
    const eligible = id === 'plain' ? Math.abs(x) > 8.4 && (Math.abs(z) > 10.6 || Math.abs(x) > 16.5) : id === 'valley' ? alpineTreeSuitable(x, z) : id === 'river' ? false : x < -3.8 && noise(x * .27, z * .27) > .46
    if (eligible && h > .3 && !wet(x, z)) treeSeeds.push([x, z, .46 + hash(i, 15) * .48])
  }
  if (id === 'plain') for (let z = -10.8; z <= 10.8; z += 1.1) for (const sign of [-1, 1]) treeSeeds.push([sign * (17.05 + Math.sin(z * .8) * .08), z, .48 + hash(z, sign + 2) * .2])
  if (id === 'river') for (let z = -10.3; z <= 10.3; z += 1.45) treeSeeds.push([riverX(z) - riverHalfWidth - .54, z, .47 + hash(z, 82) * .18])
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSeeds.length)
  const lobes = 1
  const crowns = new THREE.InstancedMesh(crownGeo, leafMaterial, treeSeeds.length * lobes)
  const transform = new THREE.Object3D()
  treeSeeds.forEach(([x, z, scale], i) => {
    const h = height(x, z)
    transform.position.set(x, h + .25 * scale, z); transform.scale.setScalar(scale); transform.rotation.set(0, 0, 0); transform.updateMatrix(); trunks.setMatrixAt(i, transform.matrix)
    for (let j = 0; j < lobes; j++) {
      transform.position.set(x + (lobes === 1 ? 0 : j - 1) * .15 * scale, h + (.68 + (j === 1 ? .2 : 0)) * scale, z + Math.sin(j * 2) * .15 * scale)
      transform.scale.set(scale * (.76 + hash(i, j + 7) * .3), scale * (id === 'valley' ? 1.5 : .9 + hash(i, j + 9) * .3), scale)
      transform.rotation.set(lobes === 1 ? 0 : i, j + i * .7, lobes === 1 ? 0 : i * .7); transform.updateMatrix(); crowns.setMatrixAt(i * lobes + j, transform.matrix)
      crowns.setColorAt(i * lobes + j, new THREE.Color((id === 'coast' ? ['#8f967e', '#899475', '#919a80', '#7d896c', '#8b967b'] : ['#6c7a51', '#7a845b', '#899166', '#71845e', '#89936b'])[(i + j) % 5]!))
    }
  })
  trunks.castShadow = true; crowns.castShadow = true; trunks.receiveShadow = true; crowns.receiveShadow = true
  trunks.name = 'tree-trunks'; crowns.name = 'tree-open-leafcards'
  group.add(trunks, crowns)

  // Low crops are instanced separately from trees: cultivated rows, meadow grass,
  // and vines have an agricultural pattern instead of uniformly scattered balls.
  const plantPositions: [number, number, number][] = []
  const cropPatches: { x: number; z: number; start: number; end: number }[] = []
  if (id === 'plain' || id === 'river') for (const parcel of parcels) {
    const start = plantPositions.length
    const spacingX = id === 'plain' ? .15 : .2, spacingZ = id === 'plain' ? .18 : .25
    for (let x = parcel.x - parcel.w / 2 + .13; x < parcel.x + parcel.w / 2 - .1; x += spacingX) {
      for (let z = parcel.z - parcel.d / 2 + .13; z < parcel.z + parcel.d / 2 - .1; z += spacingZ) plantPositions.push([x + (hash(x, z) - .5) * .045, z, .75 + noise(x * 2, z * 2) * .6])
    }
    cropPatches.push({ x: parcel.x, z: parcel.z, start, end: plantPositions.length })
  }
  if (id === 'valley') for (let i = 0; i < 1150; i++) {
    const x = -15.8 + hash(i, 91) * 31.6, z = -11.4 + hash(i, 92) * 22.8
    if (Math.abs(x) > 4.8 && height(x, z) < 4.6 && noise(x * .6, z * .6) > .36) plantPositions.push([x, z, .65 + hash(i, 93) * .5])
  }
  if (plantPositions.length) {
    const plantGeo = cerealGeometry(id !== 'valley')
    const plantMat = new THREE.MeshStandardMaterial({ color: id === 'plain' ? '#c1aa64' : id === 'river' ? '#97a163' : '#8c9a68', roughness: 1, side: THREE.DoubleSide })
    const makePlants = (start: number, end: number, origin: THREE.Vector3) => {
      const plants = new THREE.InstancedMesh(plantGeo, plantMat, end - start)
      plants.name = id === 'valley' ? 'meadow-grass' : 'cereal-grains-leaves-awns'
      for (let i = start; i < end; i++) {
        const [x, z, scale] = plantPositions[i]!
        transform.position.set(x - origin.x, height(x, z) + .018 - origin.y, z - origin.z)
        transform.scale.set(scale, scale, scale); transform.rotation.set((hash(i, 95) - .5) * .2, hash(i, 96) * 6.2, (hash(i, 97) - .5) * .2)
        transform.updateMatrix(); plants.setMatrixAt(i - start, transform.matrix)
        plants.setColorAt(i - start, new THREE.Color().setScalar(.85 + hash(i, 94) * .25))
      }
      plants.receiveShadow = true; plants.castShadow = false; return plants
    }
    if (id === 'valley') group.add(makePlants(0, plantPositions.length, new THREE.Vector3()))
    else {
      const middleGeo = cerealCards(3), farGeo = cerealCards(2)
      const cardMat = new THREE.MeshStandardMaterial({ color: plantMat.color.clone(), map: cerealCardTexture(plantGeo), roughness: 1, side: THREE.DoubleSide, alphaTest: .08, alphaToCoverage: true })
      cardMat.forceSinglePass = true
      for (const [patchIndex, patch] of cropPatches.entries()) {
        if (patch.end === patch.start) continue
        const lod = new THREE.LOD(); lod.name = `cereal-patch-lod-${patchIndex}`
        lod.position.set(patch.x, height(patch.x, patch.z), patch.z)
        const near = makePlants(patch.start, patch.end, lod.position)
        const copyLevel = (geometry: THREE.BufferGeometry, name: string) => {
          const plants = new THREE.InstancedMesh(geometry, cardMat, near.count)
          plants.name = name; plants.instanceMatrix.copy(near.instanceMatrix)
          plants.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(near.instanceColor!.array), 3)
          plants.receiveShadow = true; plants.castShadow = false; return plants
        }
        lod.addLevel(near, 0)
        lod.addLevel(copyLevel(middleGeo, 'cereal-complete-silhouette-middle'), 10, .12)
        lod.addLevel(copyLevel(farGeo, 'cereal-complete-silhouette-far'), 25, .12)
        group.add(lod)
      }
    }
  }
  if (id === 'coast') {
    const vines: [number, number][] = []
    for (const parcel of parcels) for (let z = parcel.z - parcel.d / 2 + .25; z < parcel.z + parcel.d / 2 - .2; z += .37) {
      for (const side of [-1, 0, 1]) vines.push([parcel.x + side * .7, z])
    }
    const postGeo = new THREE.CylinderGeometry(.016, .021, .38, 5)
    const vineCards = [new THREE.PlaneGeometry(.31, .3), new THREE.PlaneGeometry(.31, .3).rotateY(Math.PI / 2)]
    const vineGeo = mergeGeometries(vineCards, false)!; vineCards.forEach(card => card.dispose())
    const posts = new THREE.InstancedMesh(postGeo, trunkMat, vines.length), vineLeaves = new THREE.InstancedMesh(vineGeo, leafMaterial, vines.length)
    posts.name = 'vine-trellis-posts'; vineLeaves.name = 'vine-open-leafcards'
    vines.forEach(([x, z], i) => {
      transform.position.set(x, height(x, z) + .19, z); transform.scale.set(1, 1, 1); transform.rotation.set(0, 0, 0); transform.updateMatrix(); posts.setMatrixAt(i, transform.matrix)
      transform.position.y += .09; transform.scale.set(1.0 + hash(i, 101) * .18, .95, 1); transform.rotation.y = hash(i, 102) * .5; transform.updateMatrix(); vineLeaves.setMatrixAt(i, transform.matrix); vineLeaves.setColorAt(i, new THREE.Color('#7c915f'))
    })
    posts.receiveShadow = true; vineLeaves.receiveShadow = true; group.add(posts, vineLeaves)
  }

  // Weathered outcrops, embedded into unavailable slopes, add geological scale.
  if (id !== 'plain') {
    const rockGeo = new THREE.SphereGeometry(.5, 12, 8), rockPositions = rockGeo.attributes.position!
    for (let i = 0; i < rockPositions.count; i++) {
      const x = rockPositions.getX(i), y = rockPositions.getY(i), z = rockPositions.getZ(i)
      const irregularity = .87 + noise(x * 7 + y * 2, z * 7) * .29 + Math.sin(x * 19 + z * 11) * .06
      rockPositions.setXYZ(i, x * irregularity, y * irregularity * .7, z * irregularity)
    }
    rockGeo.computeVertexNormals()
    const rockMaterial = new THREE.MeshStandardMaterial({ color: '#c0baa7', ...surfaceTexture('rock', 0, 2, 2), normalScale: new THREE.Vector2(.95, .95), roughness: 1 })
    const rockSeeds: [number, number, number][] = []
    for (let i = 0; i < 130; i++) {
      const z = -11.6 + hash(i, 42) * 23.2
      const x = id === 'coast' && i < 38 ? shoreX(z) - .38 - hash(i, 43) * .16 : -17.5 + hash(i, 44) * 35
      const h = height(x, z)
      if (id === 'valley' && alpineSurfaceWeights(x, z).rock <= .08) continue
      if (!wet(x, z) && !site(x, z).valid && (h > 1.4 || id === 'coast' && x > 7.4)) rockSeeds.push([x, z, .35 + hash(i, 45) * .85])
    }
    const rocks = new THREE.InstancedMesh(rockGeo, rockMaterial, rockSeeds.length)
    rockSeeds.forEach(([x, z, scale], i) => {
      transform.position.set(x, height(x, z) - scale * .15, z)
      transform.rotation.set(hash(i, 51) * .3, hash(i, 52) * Math.PI, hash(i, 53) * .18)
      transform.scale.set(scale * (1.05 + hash(i, 54) * .9), scale, scale * .8); transform.updateMatrix(); rocks.setMatrixAt(i, transform.matrix)
      rocks.setColorAt(i, new THREE.Color().setHSL(.105, .09 + hash(i, 55) * .09, .75 + hash(i, 56) * .16))
    })
    rocks.castShadow = true; rocks.receiveShadow = true; group.add(rocks)
  }

  const occupied = new Set<string>()
  const samples: Placement[] = []
  function add(kind: Placement['kind'], gx: number, gz: number, rotation = 0): void {
    const key = `${gx}:${gz}`
    const jitter = kind === 'house' && id === 'river' ? .24 : kind === 'house' && id === 'plain' ? .07 : 0
    const x = Math.round((gx * GRID + (hash(gx, gz + 19) - .5) * jitter) * 100) / 100
    const z = Math.round((gz * GRID + (hash(gz, gx + 23) - .5) * jitter) * 100) / 100
    if (occupied.has(key) || !site(x, z).valid) return
    occupied.add(key); samples.push({ id: `sample-${id}-${kind}-${key}`, kind, x, z, rotation: rotation + (kind === 'house' && (id === 'coast' || id === 'river') ? (hash(gx, gz + 51) - .5) * .12 : 0) })
  }
  if (id === 'plain') {
    for (let i = -4; i <= 4; i++) { add('road', i, 0); add('road', 0, i) }
    const candidates: [number, number][] = []
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x * x + z * z <= 21 && x && z) candidates.push([x, z])
    candidates.sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2)
    candidates.slice(0, 44).forEach(([x, z]) => add('house', x, z, z > 0 ? Math.PI : 0))
  } else if (id === 'valley') {
    samples.push(...createAlpineSamples(site))
  } else if (id === 'river') {
    for (let z = -5; z <= 5; z++) add('road', -1, z)
    const rows = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]
    for (const z of rows) for (const x of [-3, -2, 0]) add('house', x, z, x < -1 ? Math.PI / 2 : -Math.PI / 2)
  } else {
    // The coastal textbook example presents houses, slope cultivation and the
    // harbor; it deliberately has no illustrative road-placement samples.
    samples.push(...coastalHomes.filter(home => site(home.x, home.z).valid).sort((a, b) => Math.hypot(a.x - 4, a.z + 2) - Math.hypot(b.x - 4, b.z + 2)))
  }

  // The constraint layer illustrates unavailable land; it is intentionally qualitative.
  const restrictedPos: number[] = [], restrictedColor: number[] = []
  const red = new THREE.Color('#d99a74')
  for (let gx = -9; gx <= 9; gx++) for (let gz = -6; gz <= 6; gz++) {
    const x = gx * GRID, z = gz * GRID
    const corners = [[x - .82, z - .82], [x + .82, z - .82], [x + .82, z + .82], [x - .82, z + .82]]
    // Water already reads as a continuous surface. Floating blue squares looked
    // like structures in the river and obscured islands/boats. Keep the grid on
    // dry terrain only, including its full footprint at the water's edge.
    if (site(x, z).valid || wet(x, z) || corners.some(([cx, cz]) => wet(cx!, cz!))) continue
    const color = red
    for (const n of [0, 2, 1, 0, 3, 2]) {
      const [cx, cz] = corners[n]!
      restrictedPos.push(cx!, Math.max(height(cx!, cz!), wet(cx!, cz!) ? WATER : 0) + .055, cz!)
      restrictedColor.push(color.r, color.g, color.b)
    }
  }
  const constraintGeo = new THREE.BufferGeometry(); constraintGeo.setAttribute('position', new THREE.Float32BufferAttribute(restrictedPos, 3)); constraintGeo.setAttribute('color', new THREE.Float32BufferAttribute(restrictedColor, 3)); constraintGeo.computeVertexNormals()
  constraints.add(new THREE.Mesh(constraintGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide })))

  const label = (key: string, text: string, x: number, z: number, lift = .55) => ({ id: key, text, position: new THREE.Vector3(x, Math.max(height(x, z), wet(x, z) ? WATER : 0) + lift, z) })
  const labels = id === 'plain' ? [label('farmland', '开阔平原 · 耕地', -12, -4), label('settlement', '聚落向四周扩展', 1, 6.5, 1.3)] :
    id === 'valley' ? [label('mountain-west', '山地阻隔', -10, -3), label('valley', '谷地 · 较平缓', 0, -8.4), label('mountain-east', '山地阻隔', 10, 3)] :
      id === 'river' ? [label('river', '宽阔河流', riverX(7), 7), label('bank', '沿河城镇带', -3.6, -8.5, 1.9), label('slope', '远处干旱缓丘', -15.6, 3), label('landing', '岸边停泊 · 小码头', 2.7, -5.4), label('islet', '低矮江渚', 6.25, -.9)] :
        [label('sea', '海洋', 14, 2), label('terrace', '坡地梯田', -7.1, -5), label('coast-village', '陡岸彩色聚落 · 教学示意', 2, -6.5, 3.5), label('harbor', '小港湾 · 防波堤', 9.5, 7.8, .5)]

  // All furrows of a material are a single draw call.
  for (const material of ribbonMaterials.values()) {
    const meshes = group.children.filter(child => child.name === 'field-detail' && (child as THREE.Mesh).material === material) as THREE.Mesh<THREE.BufferGeometry>[]
    const merged = mergeGeometries(meshes.map(mesh => mesh.geometry), false)
    if (!merged) continue
    meshes.forEach(mesh => { group.remove(mesh); mesh.geometry.dispose() })
    const mesh = new THREE.Mesh(merged, material); mesh.receiveShadow = true; group.add(mesh)
  }

  let disposed = false
  return {
    group, terrain, constraints, labels, samples, site, heightAt: height,
    update(time: number) {
      waterSurface?.update(time)
    },
    dispose() {
      if (disposed) return
      disposed = true
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
      group.traverse(object => {
        if (object instanceof THREE.InstancedMesh) object.dispose()
        const renderable = object as THREE.Mesh
        if (renderable.geometry) geometries.add(renderable.geometry)
        if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) if (material !== waterSurface?.material) materials.add(material)
      })
      materials.forEach(material => {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
        material.dispose()
      })
      waterSurface?.dispose()
      textures.forEach(texture => texture.dispose()); geometries.forEach(geometry => geometry.dispose()); group.clear()
    },
  }
}
