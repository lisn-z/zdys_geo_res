import * as THREE from 'three'

export interface HadeanOrigin {
  group: THREE.Group
  center: THREE.Vector3
  marker: THREE.Vector3
  /** Optional, elapsed seconds. Leave uncalled when motion is disabled. */
  animate: (time: number) => void
  /** Only needed when removing this helper independently of scene disposal. */
  dispose: () => void
}

/**
 * A textbook-style formation symbol, not the Big Bang or a modern Earth.
 * All coordinates share the overview world's coordinate system. The caller can
 * registerPeriod(group, 0), use center for focus, and use marker for the label.
 */
export function createHadeanOrigin(connection: THREE.Vector3): HadeanOrigin {
  const group = new THREE.Group()
  group.name = 'hadean-formation-origin'
  group.userData.periodIndex = 0

  const center = new THREE.Vector3(-3.4, -5.2, 5.6)
  const marker = center.clone().add(new THREE.Vector3(0.04, 1.0, 0))
  const radius = 0.55
  // Pure white core: this is the textbook's formation symbol, without yellow
  // surface shading, modern continents, custom shaders, or global bloom.
  const sphereGeometry = new THREE.SphereGeometry(radius, 40, 28)
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, fog: false })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  sphere.name = 'hadean-white-core'
  sphere.position.copy(center)
  group.add(sphere)

  // Normal alpha blending keeps the blue corona visible on a white textbook
  // background. Depth testing lets the opaque spherical core hide its center.
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const context = canvas.getContext('2d')
  if (context) {
    const c = 256
    const random = (seed: number) => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
      return value - Math.floor(value)
    }
    const glow = context.createRadialGradient(c, c, 0, c, c, c)
    glow.addColorStop(0, 'rgba(255,255,255,0.0)')
    glow.addColorStop(0.37, 'rgba(234,255,255,0.18)')
    glow.addColorStop(0.43, 'rgba(203,252,255,0.86)')
    glow.addColorStop(0.51, 'rgba(64,210,247,0.66)')
    glow.addColorStop(0.63, 'rgba(30,153,225,0.30)')
    glow.addColorStop(0.81, 'rgba(35,138,216,0.07)')
    glow.addColorStop(1, 'rgba(35,138,216,0.0)')
    context.fillStyle = glow
    context.fillRect(0, 0, 512, 512)

    // A broken, finely toothed inner corona replaces a uniform blue doughnut.
    // Seeded irregularity is fixed in the texture, so the rays never flicker.
    context.save()
    context.globalCompositeOperation = 'lighter'
    const crown = context.createRadialGradient(c, c, c * 0.39, c, c, c * 0.73)
    crown.addColorStop(0, 'rgba(224,255,255,0.44)')
    crown.addColorStop(0.35, 'rgba(90,226,255,0.24)')
    crown.addColorStop(1, 'rgba(29,157,231,0.0)')
    context.fillStyle = crown
    context.beginPath()
    for (let i = 0; i <= 216; i++) {
      const index = i % 216
      const angle = index / 216 * Math.PI * 2
      const tooth = index % 3 === 1 ? 0.12 + random(index + 7) * 0.10 : random(index + 3) * 0.035
      const r = c * (0.47 + tooth)
      const x = c + Math.cos(angle) * r
      const y = c + Math.sin(angle) * r
      if (i === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.closePath()
    context.fill()

    // Fine radial filaments: blue-to-cyan near the nucleus, transparent tips.
    // There are no drifting particles or outward explosive motion.
    context.lineCap = 'round'
    for (let i = 0; i < 72; i++) {
      const angle = (i + (random(i + 19) - 0.5) * 0.34) / 72 * Math.PI * 2
      const startRadius = c * (0.405 + random(i + 41) * 0.035)
      const endRadius = c * (0.65 + random(i + 83) * 0.27)
      const x0 = c + Math.cos(angle) * startRadius
      const y0 = c + Math.sin(angle) * startRadius
      const x1 = c + Math.cos(angle) * endRadius
      const y1 = c + Math.sin(angle) * endRadius
      const filament = context.createLinearGradient(x0, y0, x1, y1)
      filament.addColorStop(0, 'rgba(235,255,255,0.88)')
      filament.addColorStop(0.20, 'rgba(116,235,255,0.78)')
      filament.addColorStop(0.55, 'rgba(58,176,242,0.38)')
      filament.addColorStop(1, 'rgba(43,151,228,0.0)')
      context.strokeStyle = filament
      context.lineWidth = 0.65 + random(i + 137) * 1.10
      context.beginPath()
      context.moveTo(x0, y0)
      context.lineTo(x1, y1)
      context.stroke()
    }
    context.restore()
  }
  const glowTexture = new THREE.CanvasTexture(canvas)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture, color: '#ffffff', transparent: true, opacity: 0.95,
    depthWrite: false, depthTest: true, toneMapped: false, fog: false,
  })
  const halo = new THREE.Sprite(glowMaterial)
  halo.name = 'hadean-contained-cyan-corona'
  halo.position.copy(center)
  halo.scale.set(2.6, 2.6, 1)
  // The opaque sphere is the intended pick target; the invisible sprite corners
  // must not swallow clicks on neighbouring periods.
  halo.raycast = () => {}
  group.add(halo)

  // Keep the two short curls beside the origin in the foreground before the
  // connector turns back into the spiral. A direct helix to the connection is
  // mostly hidden behind the broad outer terrain wall at this camera angle.
  const viewNormal = new THREE.Vector3(19.32, 22.136, 23.92).sub(center).normalize()
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), viewNormal).normalize()
  const up = new THREE.Vector3().crossVectors(viewNormal, right).normalize()
  const axis = right.clone().addScaledVector(up, 0.16).normalize()
  const lateral = up.clone().addScaledVector(right, -0.16).normalize()
  const start = center.clone().addScaledVector(axis, radius * 0.94)
  const points: THREE.Vector3[] = [start]
  const curls = [
    { at: 0.46, radius: 0.22, advance: 0.28 },
    { at: 1.22, radius: 0.29, advance: 0.35 },
  ]
  for (let curl = 0; curl < curls.length; curl++) {
    const spec = curls[curl]!
    for (let step = 0; step <= 24; step++) {
      const t = step / 24
      const angle = t * Math.PI * 2
      points.push(start.clone()
        .addScaledVector(axis, spec.at + spec.advance * t - spec.radius * Math.cos(angle))
        .addScaledVector(lateral, spec.radius * Math.sin(angle))
        .addScaledVector(viewNormal, 0.12 + Math.sin(angle) * 0.045))
    }
  }
  const foregroundEnd = start.clone().addScaledVector(axis, 2.0).addScaledVector(viewNormal, 0.12)
  points.push(foregroundEnd)
  // Only the final return is allowed to slip naturally behind the terrain.
  points.push(foregroundEnd.clone().lerp(connection, 0.38).addScaledVector(up, 0.12))
  points.push(foregroundEnd.clone().lerp(connection, 0.82))
  points.push(connection.clone())
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const tailGeometry = new THREE.TubeGeometry(curve, 240, 0.017, 5, false)
  const tailMaterial = new THREE.MeshBasicMaterial({
    color: '#62bdd7', transparent: true, opacity: 0.86,
    depthWrite: false, toneMapped: false, fog: false,
  })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.name = 'hadean-fine-curled-time-thread'
  tail.userData.connection = connection.clone()
  tail.raycast = () => {}
  group.add(tail)

  // Dispose the canvas-backed texture with its owning material, so the existing
  // scene traversal is sufficient even if the caller never invokes dispose().
  let textureDisposed = false
  glowMaterial.addEventListener('dispose', () => {
    if (textureDisposed) return
    textureDisposed = true
    glowTexture.dispose()
  })
  let disposed = false
  return {
    group,
    center,
    marker,
    animate(time: number) {
      if (disposed || !Number.isFinite(time)) return
      // Scale only: the caller's focus-opacity and reduced-motion controls keep
      // full authority over visibility. The surface and tail remain stationary.
      const pulse = 1 + Math.sin(time * 0.85) * 0.012
      halo.scale.set(2.6 * pulse, 2.6 * pulse, 1)
    },
    dispose() {
      if (disposed) return
      disposed = true
      sphereGeometry.dispose()
      tailGeometry.dispose()
      sphereMaterial.dispose()
      tailMaterial.dispose()
      glowMaterial.dispose()
      group.removeFromParent()
    },
  }
}
