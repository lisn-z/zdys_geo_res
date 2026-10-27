import * as THREE from 'three'
import type { ViewMode, WeatherState } from './types'

interface WindVisuals {
  group: THREE.Group
  update: (weather: WeatherState, delta: number, elapsed: number, view: ViewMode, camera: THREE.Camera) => void
  dispose: () => void
}

const MAX_TRAILS = 26
const TRAIL_SEGMENTS = 24
const SEGMENTS_PER_TRAIL = TRAIL_SEGMENTS
const MAX_VERTICES = MAX_TRAILS * SEGMENTS_PER_TRAIL * 2
const NORTH = new THREE.Color('#a46a49')
const GUIDE = new THREE.Color('#477c83')
const FLOW = new THREE.Color('#559eaf')

function seeded(index: number, salt: number): number {
  let n = Math.imul(index + salt, 374761393)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function directionLabel(text: string, north: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 176
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '600 83px "Microsoft YaHei", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = 15
  ctx.strokeStyle = 'rgba(247,248,242,0.97)'
  ctx.strokeText(text, 256, 88)
  ctx.fillStyle = north ? '#955b39' : '#376b74'
  ctx.fillText(text, 256, 88)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  return map
}

function makeGuide(): { group: THREE.Group; sprites: THREE.Sprite[] } {
  const group = new THREE.Group()
  group.name = 'teaching-direction-guide'
  const positions: number[] = [], colors: number[] = []
  function segment(x1: number, z1: number, x2: number, z2: number, north = false): void {
    positions.push(x1, 0, z1, x2, 0, z2)
    const color = north ? NORTH : GUIDE
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
  }
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2, b = (i + 1) / 96 * Math.PI * 2
    segment(Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), i < 3 || i >= 93)
  }
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, start = i % 4 === 0 ? 0.86 : 0.94
    segment(Math.sin(a) * start, Math.cos(a) * start, Math.sin(a) * 1.05, Math.cos(a) * 1.05, i === 0)
  }
  // The north arrow is part of the guide, not a modeled physical instrument.
  segment(-0.045, 0.91, 0, 1.055, true)
  segment(0, 1.055, 0.045, 0.91, true)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const material = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.62,
    depthWrite: false, depthTest: true, toneMapped: false,
  })
  const ring = new THREE.LineSegments(geometry, material)
  ring.renderOrder = 10
  group.add(ring)
  const sprites: THREE.Sprite[] = []
  for (const [index, label] of ['北 N', '东 E', '南 S', '西 W'].entries()) {
    const map = directionLabel(label, index === 0)
    const spriteMaterial = new THREE.SpriteMaterial({
      map, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    const angle = -index / 4 * Math.PI * 2
    sprite.position.set(Math.sin(angle) * 1.18, 0.025, Math.cos(angle) * 1.18)
    sprite.scale.set(0.46, 0.158, 1)
    sprite.renderOrder = 12
    sprite.name = `direction-label-${index}`
    group.add(sprite); sprites.push(sprite)
  }
  return { group, sprites }
}

export function createWindVisuals(): WindVisuals {
  const group = new THREE.Group()
  group.name = 'wind-and-direction-teaching-visuals'
  const guide = makeGuide()
  group.add(guide.group)
  const positions = new Float32Array(MAX_VERTICES * 3)
  const colors = new Float32Array(MAX_VERTICES * 4)
  const flowGeometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)
  const colorAttribute = new THREE.BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage)
  flowGeometry.setAttribute('position', positionAttribute)
  flowGeometry.setAttribute('color', colorAttribute)
  const flowMaterial = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.64,
    depthWrite: false, depthTest: true, toneMapped: false,
  })
  const flow = new THREE.LineSegments(flowGeometry, flowMaterial)
  flow.frustumCulled = false
  flow.renderOrder = 9
  flow.name = 'moving-wind-filaments'
  group.add(flow)
  let lastElapsed: number | null = null, travel = 0
  let heading: number | null = null
  const pointA = new THREE.Vector3(), pointB = new THREE.Vector3()
  const labelWorld = new THREE.Vector3()

  function putVertex(index: number, point: THREE.Vector3, alpha: number): void {
    const p = index * 3, c = index * 4
    positions[p] = point.x; positions[p + 1] = point.y; positions[p + 2] = point.z
    colors[c] = FLOW.r; colors[c + 1] = FLOW.g; colors[c + 2] = FLOW.b; colors[c + 3] = alpha
  }
  function avoidReadingArea(point: THREE.Vector3, view: ViewMode): number {
    if (view === 'screen' && point.x > -3.85 && point.x < -2.15 && point.z > -0.8 && point.z < 1.15 && point.y > 1.12 && point.y < 2.25) return 0
    if (view === 'rain' && point.x > -0.45 && point.x < 0.8 && point.z > -2.55 && point.z < -1.4 && point.y < 1.03) return 0
    return 1
  }

  return {
    group,
    update(weather, delta, elapsed, view, camera): void {
      // In the right-handed, Y-up scene, north is +Z and east is -X.
      guide.group.visible = view === 'wind' || view === 'overview' || view === 'walk'
      const close = view === 'wind'
      const radius = close ? 1.15 : 2.4
      guide.group.position.set(close ? 3 : 0, close ? 9.6 : 0.085, close ? 2 : 1)
      guide.group.scale.setScalar(radius)
      guide.group.updateMatrixWorld(true)
      if (guide.group.visible) {
        const perspective = camera as THREE.PerspectiveCamera
        const fovFactor = perspective.isPerspectiveCamera ? Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2) : 0.354
        for (const sprite of guide.sprites) {
          sprite.getWorldPosition(labelWorld)
          // Keep labels readable at overview distance without making the close guide bulky.
          const distance = camera.position.distanceTo(labelWorld)
          const worldWidth = THREE.MathUtils.clamp(distance * fovFactor * 0.17, close ? 0.36 : 0.58, close ? 0.52 : 1.12)
          sprite.scale.set(worldWidth / radius, worldWidth * 176 / 512 / radius, 1)
        }
      }

      const elapsedStep = lastElapsed === null ? 0 : Math.max(0, elapsed - lastElapsed)
      lastElapsed = elapsed
      const speed = Math.max(0, weather.windSpeed)
      travel += elapsedStep * (0.35 + speed * 0.16)
      flow.visible = weather.windVisible !== false && speed > 0.2
      if (!flow.visible) return
      const targetHeading = -THREE.MathUtils.degToRad(weather.windDirection)
      if (heading === null) heading = targetHeading
      const difference = Math.atan2(Math.sin(targetHeading - heading), Math.cos(targetHeading - heading))
      heading += difference * (1 - Math.exp(-Math.max(0, delta) * 6))
      // A named wind comes FROM the vane's direction; the filaments travel the opposite way.
      const dx = -Math.sin(heading), dz = -Math.cos(heading)
      const crossX = -dz, crossZ = dx
      const count = close ? 12 : view === 'overview' ? 26 : 18
      let vertex = 0
      for (let trail = 0; trail < count; trail++) {
        const top = close || (view === 'overview' && trail >= 18)
        const extent = top ? 2.45 : view === 'screen' ? 3.5 : view === 'rain' ? 4.2 : 7.0
        const spread = top ? 1.36 : view === 'screen' ? 2.25 : view === 'rain' ? 3.0 : 5.5
        const centerX = top ? 3 : view === 'screen' ? -3 : 0
        const centerZ = top ? 2 : view === 'rain' ? -2 : view === 'screen' ? 0 : 1
        const sample = seeded(trail, 31), phase = seeded(trail, 67)
        const side = (sample * 2 - 1) * spread
        const baseY = top
          ? (trail % 2 === 0 ? 9.56 + seeded(trail, 93) * 0.30 : 10.45 + seeded(trail, 93) * 0.35)
          : 1.1 + seeded(trail, 93) * (view === 'rain' ? 0.45 : 1.1)
        const length = top ? 0.7 + seeded(trail, 113) * 0.65 : 1.25 + seeded(trail, 113) * 1.2
        const cycle = extent * 2 + length
        const alongHead = ((travel + phase * cycle) % cycle) - extent
        const envelope = THREE.MathUtils.smoothstep(alongHead, -extent, -extent + 0.5)
          * (1 - THREE.MathUtils.smoothstep(alongHead, extent - 0.25, extent + length))
        const wavePhase = seeded(trail, 147) * Math.PI * 2
        function pointAt(along: number, out: THREE.Vector3): THREE.Vector3 {
          const ripple = Math.sin(along * 1.7 + wavePhase - elapsed * 0.65) * (top ? 0.022 : 0.04)
          const heightWave = Math.sin(along * 2.1 + wavePhase - elapsed * 0.45) * (top ? 0.017 : 0.028)
          return out.set(centerX + dx * along + crossX * (side + ripple), baseY + heightWave, centerZ + dz * along + crossZ * (side + ripple))
        }
        for (let segment = 0; segment < TRAIL_SEGMENTS; segment++) {
          const a = segment / TRAIL_SEGMENTS, b = (segment + 1) / TRAIL_SEGMENTS
          pointAt(alongHead - length + length * a, pointA)
          pointAt(alongHead - length + length * b, pointB)
          const alphaA = Math.pow(a, 0.8) * envelope * avoidReadingArea(pointA, view)
          const alphaB = Math.pow(b, 0.8) * envelope * avoidReadingArea(pointB, view)
          putVertex(vertex++, pointA, alphaA); putVertex(vertex++, pointB, alphaB)
        }
      }
      flowGeometry.setDrawRange(0, vertex)
      positionAttribute.needsUpdate = true; colorAttribute.needsUpdate = true
    },
    dispose(): void {
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
      group.traverse((object) => {
        const renderable = object as THREE.Mesh
        if (renderable.geometry) geometries.add(renderable.geometry)
        if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) materials.add(material)
      })
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
        material.dispose()
      }
      for (const geometry of geometries) geometry.dispose()
      for (const texture of textures) texture.dispose()
      group.clear()
    },
  }
}
