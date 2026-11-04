import * as THREE from 'three'

export type MaterialTextureKind = 'wood' | 'paint' | 'tile' | 'concrete'

const SIZE = 512
const SEEDS: Record<MaterialTextureKind, number> = {
  wood: 41519,
  paint: 73981,
  tile: 98347,
  concrete: 25013,
}

/** Stable noise keeps materials identical after a scene retry or a view change. */
function randomAt(x: number, y: number, seed: number): number {
  let bits = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed
  bits = Math.imul(bits ^ (bits >>> 13), 1274126177)
  return ((bits ^ (bits >>> 16)) >>> 0) / 4294967295
}

function wrapped(value: number, period: number): number {
  return ((value % period) + period) % period
}

/** Periodic lattice noise makes repeat-wrapped textures meet without a seam. */
function noise(x: number, y: number, periodX: number, periodY: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  let u = x - ix
  let v = y - iy
  u = u * u * (3 - 2 * u)
  v = v * v * (3 - 2 * v)
  const a = randomAt(wrapped(ix, periodX), wrapped(iy, periodY), seed)
  const b = randomAt(wrapped(ix + 1, periodX), wrapped(iy, periodY), seed)
  const c = randomAt(wrapped(ix, periodX), wrapped(iy + 1, periodY), seed)
  const d = randomAt(wrapped(ix + 1, periodX), wrapped(iy + 1, periodY), seed)
  return ((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v) * 2 - 1
}

/**
 * Neutral, low-contrast surface color; the material still supplies its actual color.
 * Wood grain and paint brush marks run along V. These maps contain no baked light,
 * shadows, plank joins or tile joins, so they can follow the real model geometry.
 * The caller controls repeat/anisotropy and owns disposal of the returned texture.
 */
export function createMaterialTexture(kind: MaterialTextureKind): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Unable to prepare house material texture')
  const pixels = context.createImageData(SIZE, SIZE)
  const seed = SEEDS[kind]

  for (let y = 0; y < SIZE; y += 1) {
    const v = y / SIZE
    for (let x = 0; x < SIZE; x += 1) {
      const u = x / SIZE
      const grain = randomAt(x, y, seed) * 2 - 1
      let brightness: number

      if (kind === 'wood') {
        // Very gently wandering fibers, with irregular spacing instead of stripes.
        const wander = noise(u * 3, v * 3, 3, 3, seed + 1) * 1.35
        const fibers = noise(u * 74 + wander, v * 2, 74, 2, seed + 2)
        const fineFibers = noise(u * 183 + wander * 2.2, v * 5, 183, 5, seed + 3)
        const growth = noise(u * 12, v * 2, 12, 2, seed + 4)
        brightness = 242 + fibers * 5.5 + fineFibers * 2.5 + growth * 3 + grain * 1.4
      } else if (kind === 'paint') {
        // Painted cladding has almost uniform color, with a restrained brush tooth.
        const brush = noise(u * 192, v * 4, 192, 4, seed + 1)
        const undercoat = noise(u * 17, v * 11, 17, 11, seed + 2)
        brightness = 247 + brush * 2.1 + undercoat * 1.1 + grain * 1.25
      } else if (kind === 'tile') {
        // Fired clay: fine mineral speckle and weak, irregular firing variation.
        const firing = noise(u * 7, v * 7, 7, 7, seed + 1)
        const minerals = noise(u * 81, v * 81, 81, 81, seed + 2)
        const inclusion = randomAt(x, y, seed + 3) < 0.022 ? -8 : 0
        brightness = 241 + firing * 4 + minerals * 3.5 + grain * 4.4 + inclusion
      } else {
        // Concrete aggregates remain fine enough not to resemble pebbled cladding.
        const cement = noise(u * 10, v * 10, 10, 10, seed + 1)
        const sand = noise(u * 110, v * 110, 110, 110, seed + 2)
        const pores = randomAt(x, y, seed + 3) < 0.016 ? -14 : 0
        brightness = 239 + cement * 3.5 + sand * 4 + grain * 4.5 + pores
      }

      const shade = Math.round(THREE.MathUtils.clamp(brightness, 216, 253))
      const offset = (y * SIZE + x) * 4
      pixels.data[offset] = shade
      pixels.data[offset + 1] = shade
      pixels.data[offset + 2] = shade
      pixels.data[offset + 3] = 255
    }
  }

  context.putImageData(pixels, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.name = `earthquake-house-${kind}`
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  return texture
}
