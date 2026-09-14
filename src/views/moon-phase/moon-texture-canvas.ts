import type { MoonLighting } from './moon-geometry'
import { getMoonTextureProjection, moonTextureUvAt, MOON_TEXTURE_URLS, type MoonTextureObserver } from './moon-texture'

let textureRequest: Promise<ImageData | null> | undefined
const staticDiscs = new Map<string, ImageData>()

/** One decoded, CORS-safe source image shared by all cards and timeline icons. */
export function loadMoonTexturePixels(): Promise<ImageData | null> {
  if (!textureRequest) textureRequest = (async () => {
    for (const url of MOON_TEXTURE_URLS) {
      try {
        return await new Promise<ImageData>((resolve, reject) => {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          const timeout = window.setTimeout(() => { image.onload = image.onerror = null; reject(new Error('Moon texture timeout')) }, 7000)
          image.onerror = () => { window.clearTimeout(timeout); reject(new Error('Moon texture unavailable')) }
          image.onload = () => {
            window.clearTimeout(timeout)
            try {
              const canvas = document.createElement('canvas')
              canvas.width = Math.min(image.naturalWidth, 2048)
              canvas.height = Math.max(1, Math.round(image.naturalHeight * canvas.width / image.naturalWidth))
              const context = canvas.getContext('2d', { willReadFrequently: true })
              if (!context) throw new Error('Canvas unavailable')
              context.drawImage(image, 0, 0, canvas.width, canvas.height)
              resolve(context.getImageData(0, 0, canvas.width, canvas.height))
            } catch (error) { reject(error) }
          }
          image.src = url
        })
      } catch { /* Match the space scene's bounded local to remote fallback. */ }
    }
    return null
  })()
  return textureRequest
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export function paintMoonDisc(context: CanvasRenderingContext2D, size: number, phase: number, texture: ImageData | null, observer?: MoonTextureObserver, lighting?: MoonLighting): void {
  const cacheKey = !observer && !lighting && Math.abs(phase % 45) < 1e-8 ? `${size}:${phase % 360}` : null
  const cached = cacheKey ? staticDiscs.get(cacheKey) : undefined
  if (cached) { context.putImageData(cached, 0, 0); return }
  const projection = getMoonTextureProjection(phase, observer)
  const radians = phase * Math.PI / 180
  const light = lighting ?? { lightX: Math.sin(radians), lightY: 0, lightZ: -Math.cos(radians) }
  const pixels = context.createImageData(size, size)
  const output = pixels.data
  const half = size / 2
  const radius = half / 1.06
  const uv = { u: 0, v: 0 }
  for (let row = 0; row < size; row++) {
    const y = (half - row - 0.5) / radius
    for (let column = 0; column < size; column++) {
      const x = (column + 0.5 - half) / radius
      const squared = x * x + y * y
      if (squared > 1) continue
      moonTextureUvAt(projection, x, y, uv)
      const front = Math.sqrt(Math.max(0, 1 - squared))
      const incidence = x * light.lightX + y * light.lightY + front * light.lightZ
      const transition = clamp01(incidence * size * 0.8 + 0.5)
      const sunlit = transition * transition * (3 - 2 * transition)
      const brightness = 0.065 + sunlit * (0.68 + 0.255 * Math.sqrt(Math.max(0, incidence)))
      const offset = (row * size + column) * 4
      if (texture) {
        // Repeat U across the same seam as Three.js; clamp V at the two poles.
        const sourceX = uv.u * texture.width - 0.5
        const sourceY = Math.max(0, Math.min(texture.height - 1, (1 - uv.v) * texture.height - 0.5))
        const floorX = Math.floor(sourceX)
        const x0 = (floorX + texture.width) % texture.width
        const x1 = (x0 + 1) % texture.width
        const y0 = Math.floor(sourceY)
        const y1 = Math.min(y0 + 1, texture.height - 1)
        const fx = sourceX - floorX
        const fy = sourceY - y0
        const a = (y0 * texture.width + x0) * 4
        const b = (y0 * texture.width + x1) * 4
        const c = (y1 * texture.width + x0) * 4
        const d = (y1 * texture.width + x1) * 4
        for (let channel = 0; channel < 3; channel++) {
          const top = texture.data[a + channel]! * (1 - fx) + texture.data[b + channel]! * fx
          const bottom = texture.data[c + channel]! * (1 - fx) + texture.data[d + channel]! * fx
          output[offset + channel] = (top * (1 - fy) + bottom * fy) * brightness
        }
      } else {
        output[offset] = 208 * brightness
        output[offset + 1] = 210 * brightness
        output[offset + 2] = 211 * brightness
      }
      output[offset + 3] = 255 * clamp01((1 - Math.sqrt(squared)) * radius)
    }
  }
  context.putImageData(pixels, 0, 0)
  if (cacheKey && texture) {
    if (staticDiscs.size >= 32) staticDiscs.delete(staticDiscs.keys().next().value!)
    staticDiscs.set(cacheKey, pixels)
  }
}
