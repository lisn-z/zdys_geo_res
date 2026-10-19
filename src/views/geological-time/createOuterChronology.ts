import * as THREE from 'three'
import { textbookStartAge } from './textbookChronology'

type PeriodBoundary = { name: string; startMa: number; endMa: number }
type PointAt = (t: number, across: number, lift: number) => THREE.Vector3

/** Convert Ma to 亿年前 by moving the decimal point, without binary rounding. */
export function ageInHundredMillionYears(ma: number): string {
  if (!Number.isFinite(ma) || ma < 0) return ''
  const raw = String(ma)
  if (/e/i.test(raw)) return (ma / 100).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 12 })
  const [integer = '0', fraction = ''] = raw.split('.')
  const padded = integer.padStart(3, '0')
  const whole = padded.slice(0, -2).replace(/^0+(?=\d)/, '')
  const decimals = (padded.slice(-2) + fraction).replace(/0+$/, '')
  return decimals ? `${whole}.${decimals}` : whole
}

/** Textbook-style labels and boundary ticks; all meshes remain in world space. */
export function createOuterChronology(
  pointAt: PointAt,
  periods: PeriodBoundary[],
): { group: THREE.Group; updateLabels: (camera: THREE.Camera) => void } {
  const group = new THREE.Group()
  group.name = 'outer-chronology'
  const labelStates: {
    mesh: THREE.Mesh
    uv: THREE.BufferAttribute
    originalUV: Float32Array
    originalStart: THREE.Vector3
    originalEnd: THREE.Vector3
    flipped: boolean
    initialized: boolean
  }[] = []
  const projectedStart = new THREE.Vector3()
  const projectedEnd = new THREE.Vector3()
  const eonLegends: { index: number; label: THREE.Sprite; leader: THREE.Line }[] = []

  function updateLabels(camera: THREE.Camera) {
    camera.updateWorldMatrix(true, false)
    group.updateWorldMatrix(true, true)
    const projection = camera.projectionMatrix.elements
    const aspect = Math.abs((projection[5] ?? 1) / (projection[0] || 1))
    // Anchor each eon legend beside the exposed, camera-near part of its arc.
    // Keeping it below the rim prevents a facing name from covering a mountain.
    const towardCamera = camera.position.clone().setY(0).normalize()
    for (const legend of eonLegends) {
      let bestT = (legend.index + 0.5) / count
      let closest = -Infinity
      for (let sample = 0; sample <= 24; sample++) {
        const t = (legend.index + 0.10 + 0.80 * sample / 24) / count
        const anchor = pointAt(t, 1.55, 0.18)
        const projected = anchor.clone().project(camera)
        const viewDepth = -anchor.clone().applyMatrix4(camera.matrixWorldInverse).z
        if (viewDepth < 2 || projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.4 || Math.abs(projected.y) > 1.4) continue
        const distance = anchor.dot(towardCamera)
        if (distance > closest) { closest = distance; bestT = t }
      }
      legend.label.visible = legend.leader.visible = Number.isFinite(closest)
      if (!legend.label.visible) continue
      const anchor = pointAt(bestT, 1.55, 0.18)
      const outward = pointAt(bestT, 1.65, 0.18).sub(anchor).setY(0).normalize()
      legend.label.position.copy(anchor).addScaledVector(outward, 0.95).add(new THREE.Vector3(0, -0.48, 0))
      const screen = legend.label.position.clone().project(camera)
      const depth = -legend.label.position.clone().applyMatrix4(camera.matrixWorldInverse).z
      if (depth < 2 || screen.z < -1 || screen.z > 1) {
        legend.label.visible = legend.leader.visible = false
        continue
      }
      if (screen.z > -1 && screen.z < 1) {
        screen.y = THREE.MathUtils.clamp(screen.y - 0.10, -0.80, 0.80)
        screen.x = THREE.MathUtils.clamp(screen.x, aspect > 1.6 && screen.y < 0.20 ? -0.42 : -0.78, 0.78)
        legend.label.position.copy(screen.unproject(camera))
      }
      // A nearby context coil must not enlarge its legend across the screen.
      const screenWidth = camera instanceof THREE.PerspectiveCamera
        ? 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * depth * aspect : 20
      const labelWidth = Math.min(1.40, screenWidth * 0.085)
      legend.label.scale.set(labelWidth, labelWidth * 0.48 / 1.40, 1)
      const vertices = legend.leader.geometry.getAttribute('position')
      vertices.setXYZ(0, anchor.x, anchor.y, anchor.z)
      vertices.setXYZ(1, legend.label.position.x, legend.label.position.y, legend.label.position.z)
      vertices.needsUpdate = true
      legend.leader.geometry.computeBoundingSphere()
    }
    // Keep the previous orientation near a vertical screen baseline. Crossing
    // the opposite threshold is required before changing it again.
    const hysteresis = 0.18
    for (const state of labelStates) {
      projectedStart.copy(state.originalStart).applyMatrix4(state.mesh.matrixWorld).project(camera)
      projectedEnd.copy(state.originalEnd).applyMatrix4(state.mesh.matrixWorld).project(camera)
      const dx = (projectedEnd.x - projectedStart.x) * aspect
      const dy = projectedEnd.y - projectedStart.y
      const screenLength = Math.hypot(dx, dy)
      if (!Number.isFinite(screenLength) || screenLength < 1e-8) continue
      if (projectedStart.z < -1 || projectedEnd.z < -1 || projectedStart.z > 1 || projectedEnd.z > 1) continue
      const direction = dx / screenLength
      const flipped = !state.initialized ? direction < 0
        : state.flipped ? direction <= hysteresis : direction < -hysteresis
      if (state.initialized && flipped === state.flipped) continue
      state.initialized = true
      state.flipped = flipped
      for (let vertex = 0; vertex < state.uv.count; vertex++) {
        const u = state.originalUV[vertex * 2] ?? 0
        const v = state.originalUV[vertex * 2 + 1] ?? 0
        // Rotate both texture axes by 180 degrees; never reflect one axis.
        state.uv.setXY(vertex, flipped ? 1 - u : u, flipped ? 1 - v : v)
      }
      state.uv.needsUpdate = true
      state.mesh.userData.textFlipped = flipped
    }
  }

  const count = periods.length
  if (count < 2) return { group, updateLabels }

  const eonColors: Record<number, string> = { 1: '#46c86a', 2: '#b576dc' }

  function addLine(points: THREE.Vector3[], periodIndex: number, opacity: number, name: string, color = '#b5a27e') {
    // Each material belongs to exactly one period for independent focus fading.
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false })
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)
    line.name = name
    line.userData.periodIndex = periodIndex
    group.add(line)
  }

  function crossTick(t: number, from: number, to: number, index: number, opacity: number, name: string, color = '#b5a27e') {
    const points: THREE.Vector3[] = []
    for (let step = 0; step <= 12; step++) points.push(pointAt(t, THREE.MathUtils.lerp(from, to, step / 12), 0.185))
    addLine(points, index, opacity, name, color)
  }

  function outside(t: number, minimum: number, edge: number, height: number): number {
    const scale = pointAt(t, edge + 0.01, 0.20).distanceTo(pointAt(t, edge, 0.20)) / 0.01
    return Math.max(minimum, edge + (height / 2 + 0.06) / Math.max(scale, 0.001))
  }

  function addText(text: string, t: number, across: number, width: number, height: number, index: number, name: string, color = '#e4c69b') {
    if (typeof document === 'undefined') return
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return
    const font = '500 128px "Noto Serif SC", "Songti SC", "SimSun", serif'
    context.font = font
    const metrics = context.measureText(text)
    const inkWidth = Math.max(1, metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight || 0)
    // Tight horizontal padding keeps the actual lettering above 80% of the
    // texture width, including short ages such as 25 or 0.66.
    canvas.width = Math.ceil(inkWidth * 1.15) + 8
    canvas.height = 160
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = color
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.font = font
    const ascent = metrics.actualBoundingBoxAscent || 108
    const descent = metrics.actualBoundingBoxDescent || 12
    context.fillText(text, canvas.width / 2, (canvas.height + ascent - descent) / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    if (eonColors[index] && name === `outer-chronology-name-${index}`) {
      // The book prints the two lower-eon names horizontally outside their
      // colored rails. A facing legend stays readable beside the steep lower
      // coils, instead of disappearing when its map plane is seen edge-on.
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false })
      material.addEventListener('dispose', () => texture.dispose())
      const label = new THREE.Sprite(material)
      label.position.copy(pointAt(t, Math.max(across, 2.40), 0.35))
      label.scale.set(1.40, 0.48, 1)
      label.name = name
      label.renderOrder = 6
      label.userData.periodIndex = index
      label.userData.label = text
      group.add(label)
      const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([label.position, label.position]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.80, depthWrite: false, toneMapped: false }))
      leader.name = `${name}-leader`
      leader.userData.periodIndex = index
      group.add(leader)
      eonLegends.push({ index, label, leader })
      return
    }
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, opacity: 1, depthWrite: false,
      toneMapped: false, fog: false, side: THREE.FrontSide,
    })
    // The parent only needs to dispose geometry/material, as for other meshes.
    let textureDisposed = false
    material.addEventListener('dispose', () => {
      if (!textureDisposed) { textureDisposed = true; texture.dispose() }
    })

    const epsilon = 0.001 / count
    const left = pointAt(Math.max(0, t - epsilon), across, 0.20)
    const right = pointAt(Math.min(1, t + epsilon), across, 0.20)
    const span = Math.max(epsilon, Math.min(1, t + epsilon) - Math.max(0, t - epsilon))
    const lengthPerT = left.distanceTo(right) / span
    const halfT = Math.min(0.30 / count, width / Math.max(lengthPerT, 0.001) / 2)
    const outward = pointAt(t, across + 0.01, 0.20).sub(pointAt(t, across, 0.20))
    const acrossScale = outward.length() / 0.01
    const readingDirection = right.clone().sub(left).cross(outward).y >= 0 ? 1 : -1
    const halfAcross = height / Math.max(acrossScale, 0.001) / 2
    const positions: number[] = [], uvs: number[] = [], indices: number[] = []
    const segments = 24
    // Bend the text strip along the spiral instead of facing the camera.
    // Top faces outward. Choose the upward-facing UV frame so the letters are
    // rotated along the ring, never mirrored when viewed from above.
    for (let i = 0; i <= segments; i++) {
      const u = i / segments
      const along = t + (u - 0.5) * halfT * 2 * readingDirection
      for (let row = 0; row < 2; row++) {
        const p = pointAt(along, across + (row - 0.5) * halfAcross * 2, 0.20)
        positions.push(p.x, p.y, p.z)
        uvs.push(u, row)
      }
      if (i < segments) {
        const a = i * 2
        indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const uvAttribute = new THREE.Float32BufferAttribute(uvs, 2)
    geometry.setAttribute('uv', uvAttribute)
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const label = new THREE.Mesh(geometry, material)
    label.name = name
    label.userData.periodIndex = index
    label.userData.label = text
    group.add(label)
    const positionAttribute = geometry.getAttribute('position')
    labelStates.push({
      mesh: label,
      uv: uvAttribute,
      originalUV: new Float32Array(uvs),
      // Original UV (0,0) and (1,0): the text's bottom edge before rotation.
      // Apply matrixWorld on every update in case a parent also rotates.
      originalStart: new THREE.Vector3().fromBufferAttribute(positionAttribute, 0),
      originalEnd: new THREE.Vector3().fromBufferAttribute(positionAttribute, positionAttribute.count - 2),
      flipped: false,
      initialized: false,
    })
  }

  for (let index = 1; index < count; index++) {
    const period = periods[index]
    if (!period) continue
    const start = index / count
    const end = (index + 1) / count
    const rail: THREE.Vector3[] = []
    for (let step = 0; step <= 40; step++) rail.push(pointAt(THREE.MathUtils.lerp(start, end, step / 40), 1.55, 0.18))
    const eonColor = eonColors[index]
    addLine(rail, index, eonColor ? 0.95 : 0.60, `outer-chronology-rail-${index}`, eonColor)
    crossTick(start, 1.04, 1.95, index, eonColor ? 0.90 : 0.65, `outer-chronology-tick-${index}`, eonColor)
    crossTick(start, -0.94, -0.18, index, 0.26, `water-chronology-tick-${index}`)
    const middle = (index + 0.5) / count
    addText(period.name, middle, outside(middle, 1.80, 1.55, 0.82), 2.10, 0.82, index, `outer-chronology-name-${index}`, eonColor)
    const age = textbookStartAge(index)
    addText(age, start, outside(start, 2.12, 1.95, 0.64), Math.max(1.05, age.length * 0.25), 0.64, index, `outer-chronology-age-${index}`)
  }

  const finalIndex = count - 1
  crossTick(1, 1.04, 1.95, finalIndex, 0.65, 'outer-chronology-tick-present')
  crossTick(1, -0.94, -0.18, finalIndex, 0.26, 'water-chronology-tick-present')
  const finalAge = ageInHundredMillionYears(periods[finalIndex]?.endMa ?? 0)
  const endLabel = finalAge === '0' ? '现在' : finalAge
  addText(endLabel, 1, outside(1, 2.05, 1.95, 0.50), Math.max(0.90, endLabel.length * 0.22), 0.50, finalIndex, 'outer-chronology-age-present')
  addText('亿年', 1 - 0.90 / count, 2.65, 1.10, 0.50, finalIndex, 'outer-chronology-unit')
  // A separate outer bracket encloses all three eras, outside the period
  // names and ages. Its joined sections follow the same spiral from the
  // Cambrian boundary to the present, while retaining per-period focus fading.
  const eonRailAcross = 2.85
  const eonRailColor = '#d3b380'
  for (let index = 3; index < count; index++) {
    const points: THREE.Vector3[] = []
    for (let step = 0; step <= 64; step++) {
      points.push(pointAt((index + step / 64) / count, eonRailAcross, 0.185))
    }
    addLine(points, index, 0.88, `phanerozoic-range-${index}`, eonRailColor)
  }
  crossTick(3 / count, 1.55, eonRailAcross, 3, 0.88, 'phanerozoic-start', eonRailColor)
  crossTick(1, 1.55, eonRailAcross, finalIndex, 0.88, 'phanerozoic-end', eonRailColor)
  addText('显生宙', 1 - 0.32 / count, 2.50, 1.65, 0.60, finalIndex, 'outer-chronology-eon')
  return { group, updateLabels }
}
