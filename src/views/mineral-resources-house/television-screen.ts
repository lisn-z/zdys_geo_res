import * as THREE from 'three'

export interface TelevisionScreen {
  texture: THREE.CanvasTexture
  /** Called by the scene animation loop; true only when a new TV frame is ready. */
  update(timeMs: number): boolean
  dispose(): void
}
// The user explicitly requested visible playback. Keep animation enabled even
// when the OS prefers reduced motion; use a stationary camera and gentle travel.
const WIDTH = 384, HEIGHT = 216, HORIZON = 80, FPS = 20, SCALE = .75
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount
const modulo = (value: number, period: number) => ((value % period) + period) % period

function hash(x: number, y: number): number {
  let bits = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ 69321
  bits = Math.imul(bits ^ (bits >>> 13), 1274126177)
  return ((bits ^ (bits >>> 16)) >>> 0) / 4294967295
}
function noise(x: number, y: number, period?: number): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  let u = x - ix, v = y - iy
  u *= u * (3 - 2 * u); v *= v * (3 - 2 * v)
  const x0 = period === undefined ? ix : modulo(ix, period)
  const x1 = period === undefined ? ix + 1 : modulo(ix + 1, period)
  return (hash(x0, iy) * (1 - u) + hash(x1, iy) * u) * (1 - v)
    + (hash(x0, iy + 1) * (1 - u) + hash(x1, iy + 1) * u) * v
}

/** Silent coastal footage with moving clouds, advancing waves and a sailing boat. */
export function createTelevisionScreen(): TelevisionScreen {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH; canvas.height = HEIGHT
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Unable to prepare television coastal programme')
  const ctx: CanvasRenderingContext2D = context
  const base = ctx.createImageData(WIDTH, HEIGHT), image = ctx.createImageData(WIDTH, HEIGHT)
  const oceanPixels: number[] = [], skyPixels: number[] = []
  const seaDepth = new Float32Array(WIDTH * HEIGHT), seaDistance = new Float32Array(WIDTH * HEIGHT)
  const sunPath = new Float32Array(WIDTH * HEIGHT), wavePhase = new Float32Array(WIDTH * HEIGHT)
  const waveAmplitude = new Float32Array(WIDTH * HEIGHT), beachEdge = new Float32Array(HEIGHT)
  const cloudAlpha = new Uint8Array(WIDTH * HORIZON)

  for (let y = 0; y < HEIGHT; y++) {
    const t = clamp((y - HORIZON) / (HEIGHT - HORIZON))
    beachEdge[y] = (115 + t * 146 + Math.sin(t * 5.2) * 24 + noise(0, y / SCALE * .027) * 6) * SCALE
  }
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x, p = index * 4, lx = x / SCALE, ly = y / SCALE
      const film = (hash(x, y) - .5) * 2.2
      let r: number, g: number, b: number
      if (y < HORIZON) {
        const height = y / HORIZON
        r = lerp(135, 204, height); g = lerp(174, 213, height); b = lerp(193, 213, height)
        // Wrapped horizontal noise permits real cloud translation without a seam.
        const weather = noise(x / WIDTH * 6, y * .042, 6) * .72 + noise(x / WIDTH * 18, y * .081, 18) * .28
        cloudAlpha[index] = clamp((weather - .43) * 3.6) * Math.sin(height * Math.PI) * 155
        const ridge = 98 - Math.sin((lx - 290) * .016) * 13 - noise(lx * .023, 3) * 13
        if (lx > 286 && ly > ridge) {
          const haze = clamp((ly - ridge) / 30)
          r = lerp(120, 137, haze); g = lerp(147, 163, haze); b = lerp(152, 167, haze)
          const folds = noise(lx * .07, ly * .05) * 9
          r += folds; g += folds; b += folds
        } else skyPixels.push(index)
      } else {
        const perspective = (y - HORIZON) / (HEIGHT - HORIZON)
        const distance = (x - (beachEdge[y] ?? 0)) / SCALE
        if (distance < 0) {
          const beach = clamp(1 + distance / (5 + perspective * 17))
          const detail = noise(lx * .035, ly * .028) * .56 + noise(lx * .12, ly * .13) * .28 + hash(x, y) * .16
          const cliff = clamp((Math.sin(ly * .041 + lx * .024) + noise(lx * .018, ly * .017) - .3) * .7)
          const sandMix = clamp((beach - .05) * 1.4)
          r = lerp(47 + detail * 53 + cliff * 23, 203 - beach * 23 + detail * 12, sandMix)
          g = lerp(66 + detail * 49 + cliff * 15, 188 - beach * 22 + detail * 11, sandMix)
          b = lerp(51 + detail * 33 + cliff * 8, 155 - beach * 16 + detail * 10, sandMix)
          const haze = (1 - perspective) ** 4 * .54
          r = lerp(r, 164, haze); g = lerp(g, 183, haze); b = lerp(b, 182, haze)
        } else {
          const shallow = Math.exp(-distance / (16 + perspective * 53)), haze = (1 - perspective) ** 3
          r = lerp(lerp(24, 74, shallow), 157, haze * .55)
          g = lerp(lerp(98, 154, shallow), 187, haze * .55)
          b = lerp(lerp(121, 153, shallow), 193, haze * .55)
          const detail = noise(lx * .04, ly * .14) * 2
          r += detail; g += detail; b += detail
          oceanPixels.push(index); seaDepth[index] = perspective; seaDistance[index] = distance
          const lightCentre = 409 + Math.sin(perspective * 3) * 22
          sunPath[index] = Math.exp(-(((lx - lightCentre) / (14 + perspective * 85)) ** 2)) * (.2 + perspective * .8)
          wavePhase[index] = Math.max(0, ly - 107) ** .68 * 2.2 + lx * .037 + noise(lx * .018, ly * .05) * 2.3
          waveAmplitude[index] = 2.7 + perspective * 7.5
        }
      }
      base.data[p] = r + film; base.data[p + 1] = g + film; base.data[p + 2] = b + film; base.data[p + 3] = 255
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.name = 'mineral-house-television-coastal-landscape'
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  let disposed = false, startedAt: number | null = null, lastFrame = -1

  function draw(seconds: number) {
    const phase = seconds * .65
    image.data.set(base.data)
    // 5 logical pixels per second: clouds visibly cross the sky, not just pulse.
    const cloudOffset = seconds * 3.75, shift = Math.floor(cloudOffset), blend = cloudOffset - shift
    for (const index of skyPixels) {
      const y = Math.floor(index / WIDTH), x = index % WIDTH
      const a = cloudAlpha[y * WIDTH + modulo(x + shift, WIDTH)] ?? 0
      const b = cloudAlpha[y * WIDTH + modulo(x + shift + 1, WIDTH)] ?? 0
      const amount = lerp(a, b, blend) / 255, p = index * 4
      image.data[p] = lerp(base.data[p] ?? 0, 241, amount)
      image.data[p + 1] = lerp(base.data[p + 1] ?? 0, 239, amount)
      image.data[p + 2] = lerp(base.data[p + 2] ?? 0, 228, amount)
    }
    for (const index of oceanPixels) {
      const p = index * 4, t = seaDepth[index] ?? 0, distance = seaDistance[index] ?? 0
      const spatial = wavePhase[index] ?? 0, y = Math.floor(index / WIDTH) / SCALE
      const ripple = Math.sin(spatial - phase * 3) * .62 + Math.sin(spatial * 1.73 + phase * 4.3) * .38
      const amplitude = waveAmplitude[index] ?? 0
      const specular = Math.max(0, Math.sin(spatial * 2.1 - phase * 5) - .45) ** 2 * (sunPath[index] ?? 0) * 170
      // Increasing phase carries successive crests toward decreasing distance:
      // every ribbon advances toward the shore and dissolves into white water.
      const advancing = modulo(distance / (13 + t * 25) + seconds * .62 + Math.sin(y * .04) * .1, 1)
      const crestDistance = Math.min(advancing, 1 - advancing)
      const crest = Math.exp(-(crestDistance * crestDistance) / .0035) * Math.exp(-distance / 175) * (.09 + t * .25)
      const wash = (1 + t * 5) * (1.3 + Math.sin(y * .04 - seconds * 1.4) * .55)
      const foam = clamp(1 - Math.abs(distance - wash) / (1.3 + t * 3)) * (.45 + .3 * Math.sin(spatial * .4 + phase * 2) ** 2)
      const white = clamp(crest + foam, 0, .82)
      image.data[p] = lerp((base.data[p] ?? 0) + ripple * amplitude + specular, 224, white)
      image.data[p + 1] = lerp((base.data[p + 1] ?? 0) + ripple * amplitude * 1.3 + specular, 235, white)
      image.data[p + 2] = lerp((base.data[p + 2] ?? 0) + ripple * amplitude * 1.35 + specular * .94, 225, white)
    }
    ctx.putImageData(image, 0, 0)
    ctx.save(); ctx.scale(SCALE, SCALE)
    // The boat sails left at ~20 logical px/s. Its pointed bow faces travel and
    // the wake trails right. It disappears behind the headland before restarting
    // beyond the right edge, so the 24-second sailing loop never visibly jumps.
    ctx.save(); ctx.beginPath()
    ctx.moveTo((beachEdge[HORIZON] ?? 0) / SCALE, HORIZON / SCALE)
    for (let y = HORIZON; y < HEIGHT; y += 2) ctx.lineTo((beachEdge[y] ?? 0) / SCALE, y / SCALE)
    ctx.lineTo(512, 288); ctx.lineTo(512, HORIZON / SCALE); ctx.closePath(); ctx.clip()
    const boatX = 572 - modulo(seconds + 6, 24) / 24 * 472
    const boatY = 150 + Math.sin(seconds * 2.1) * .65
    const wake = ctx.createLinearGradient(boatX + 5, boatY, boatX + 43, boatY)
    wake.addColorStop(0, 'rgba(225,239,228,.48)'); wake.addColorStop(1, 'rgba(225,239,228,0)')
    ctx.strokeStyle = wake; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(boatX + 5, boatY + 3); ctx.lineTo(boatX + 43, boatY + 5); ctx.moveTo(boatX + 5, boatY + 2); ctx.lineTo(boatX + 37, boatY - 1); ctx.stroke()
    ctx.fillStyle = '#e8eadd'; ctx.beginPath(); ctx.moveTo(boatX + 1, boatY - 18); ctx.lineTo(boatX - 9, boatY - 1); ctx.lineTo(boatX + 1, boatY - 1); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#c8d6ce'; ctx.beginPath(); ctx.moveTo(boatX + 3, boatY - 14); ctx.lineTo(boatX + 8, boatY - 1); ctx.lineTo(boatX + 3, boatY - 1); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#4f6867'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(boatX + 2, boatY - 20); ctx.lineTo(boatX + 2, boatY + 2); ctx.stroke()
    ctx.fillStyle = '#eeeede'; ctx.beginPath(); ctx.moveTo(boatX - 12, boatY); ctx.lineTo(boatX + 9, boatY); ctx.lineTo(boatX + 6, boatY + 4); ctx.lineTo(boatX - 7, boatY + 3); ctx.closePath(); ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(244,246,234,.82)'; ctx.font = '13px "Microsoft YaHei", "PingFang SC", sans-serif'
    ctx.shadowColor = 'rgba(20,44,39,.35)'; ctx.shadowBlur = 3; ctx.fillText('海岸风光', 18, 270)
    ctx.restore()
    texture.needsUpdate = true
  }
  draw(0); lastFrame = 0
  return {
    texture,
    update(timeMs: number): boolean {
      if (disposed || !Number.isFinite(timeMs)) return false
      if (startedAt === null) startedAt = timeMs
      const frame = Math.floor(Math.max(0, timeMs - startedAt) / 1000 * FPS)
      if (frame === lastFrame) return false
      lastFrame = frame
      // Keep continuous elapsed time. Only clouds/boat wrap, both invisibly;
      // water is continuous sinusoids with no whole-programme reset.
      draw(frame / FPS)
      return true
    },
    dispose(): void {
      if (disposed) return
      disposed = true; texture.dispose(); canvas.width = canvas.height = 1
    },
  }
}
