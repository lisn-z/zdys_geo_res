import * as THREE from 'three'
import { textbookStartAge } from './textbookChronology'
import { chronologyRouteAcross } from './chronologyLayout'

export interface ChronologyMilestone {
  index: number
  age: string
  unit: string
  position: THREE.Vector3
}

/**
 * Overview markers follow the lesson's 15-period layout. The spiral is not
 * proportional to duration. Overview bubbles share the textbook's boundary
 * labels with the outer chronology; detailed period data remains separate.
 */
export function createChronologyMarkers(
  pointAt: (t: number, across?: number, lift?: number) => THREE.Vector3,
  periodCount: number,
): { group: THREE.Group; milestones: ChronologyMilestone[]; updateLabels: (camera: THREE.Camera) => void } {
  const group = new THREE.Group()
  group.name = 'chronology-direction-markers'
  if (!Number.isInteger(periodCount) || periodCount < 1) {
    return { group, milestones: [], updateLabels: () => {} }
  }

  // Each head is a tapered strip on the actual rising curve, ending in one
  // pointed vertex. A flat yaw-only arrow can sink into the early rising coil.
  // There is no second thick shaft, and no route stroke crossing its tip.
  const arrowPeriods = new Set([2, 8, 11, 14])
  const routeLift = 0.192
  const epsilon = 0.018 / periodCount
  // The textbook puts the Cenozoic lettering on the inner side of the arrow.
  // Ease the continuous route outward before that arc; do not jump at a boundary.
  const routePoint = (t: number) => pointAt(t, chronologyRouteAcross(t, periodCount), routeLift)
  function edgeAt(t: number): THREE.Vector3 {
    const forward = routePoint(Math.min(1, t + epsilon)).sub(routePoint(Math.max(0, t - epsilon)))
    return new THREE.Vector3(forward.z, 0, -forward.x).normalize()
  }
  function atDistance(t: number, distance: number, direction: -1 | 1, limit: number): number {
    const center = routePoint(t)
    let low = 0
    let high = Math.abs(limit - t)
    for (let i = 0; i < 24; i++) {
      const middle = (low + high) / 2
      if (routePoint(t + direction * middle).distanceTo(center) < distance) low = middle
      else high = middle
    }
    return t + direction * (low + high) / 2
  }
  function geometryFrom(positions: number[], indices: number[]): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    return geometry
  }

  // Period 0 remains the separate formation symbol and its fine curled tail.
  for (let index = 1; index < periodCount; index++) {
    const startT = index / periodCount
    const endT = (index + 1) / periodCount
    const tipT = (index + 0.84) / periodCount
    const hasArrow = arrowPeriods.has(index)
    const referenceLength = routePoint((index + 0.28) / periodCount).distanceTo(routePoint((index + 0.60) / periodCount))
    const headLength = THREE.MathUtils.clamp(referenceLength * 0.33, 0.48, 0.84)
    const baseT = atDistance(tipT, headLength, -1, startT)
    // A small break makes the pointed termination legible instead of a cross.
    const resumeT = atDistance(tipT, 0.12, 1, endT)
    const routePositions: number[] = []
    const routeIndices: number[] = []
    function appendRoute(from: number, to: number): void {
      if (to <= from) return
      const offset = routePositions.length / 3
      const steps = Math.max(2, Math.ceil((to - from) * periodCount * 64))
      for (let step = 0; step <= steps; step++) {
        const t = THREE.MathUtils.lerp(from, to, step / steps)
        const center = routePoint(t)
        const edge = edgeAt(t).multiplyScalar(0.027)
        const left = center.clone().sub(edge)
        const right = center.clone().add(edge)
        routePositions.push(left.x, left.y, left.z, right.x, right.y, right.z)
        if (step < steps) {
          const a = offset + step * 2
          routeIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
        }
      }
    }
    if (hasArrow) { appendRoute(startT, baseT); appendRoute(resumeT, endT) }
    else appendRoute(startT, endT)
    const route = new THREE.Mesh(
      geometryFrom(routePositions, routeIndices),
      new THREE.MeshBasicMaterial({
        color: '#f8faf4', transparent: true, opacity: 0.80,
        depthTest: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      }),
    )
    route.name = `chronology-route-${index}`
    route.userData.periodIndex = index
    group.add(route)

    if (!hasArrow) continue
    const headPositions: number[] = []
    const headIndices: number[] = []
    const headSteps = 12
    for (let step = 0; step < headSteps; step++) {
      const fraction = step / headSteps
      const t = THREE.MathUtils.lerp(baseT, tipT, fraction)
      const center = routePoint(t)
      const edge = edgeAt(t).multiplyScalar(headLength * 0.29 * (1 - fraction))
      const left = center.clone().sub(edge)
      const right = center.clone().add(edge)
      headPositions.push(left.x, left.y, left.z, right.x, right.y, right.z)
      if (step < headSteps - 1) {
        const a = step * 2
        headIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const tip = routePoint(tipT)
    headPositions.push(tip.x, tip.y, tip.z)
    headIndices.push((headSteps - 1) * 2, headSteps * 2, (headSteps - 1) * 2 + 1)
    const material = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.94,
      depthTest: true, depthWrite: false,
      toneMapped: false, side: THREE.DoubleSide,
    })
    const arrow = new THREE.Mesh(geometryFrom(headPositions, headIndices), material)
    arrow.name = `chronology-direction-${index}`
    arrow.userData.periodIndex = index
    group.add(arrow)
  }

  // Individual characters follow the waterway. Their baseline follows later
  // time and their top faces the land, just as printed type follows a map arc.
  // Keep the Paleozoic phrase together on the front arc of the initial view,
  // instead of scattering its three characters over more than half a turn.
  const eraNames = [
    // The historical textbook labels are reproduced as printed. Eon names
    // remain on the outer rail; these are the book's waterway annotations.
    { text: '太古代', positions: [1.20, 1.49, 1.78], size: 0.42 },
    { text: '元古代', positions: [2.20, 2.49, 2.78], size: 0.52 },
    { text: '古生代', positions: [7.00, 7.90, 8.92] },
    { text: '中生代', positions: [9.12, 10.12, 11.12] },
    // Read from the present-day end toward the Paleogene: 新 → 生 → 代.
    { text: '新生代', positions: [14.12, 13.12, 12.12], across: -0.90, size: 0.58 },
  ]
  const glyphLabels: { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; flipped: boolean }[] = []
  for (const era of eraNames) {
    Array.from(era.text).forEach((character, characterIndex) => {
      const along = era.positions[characterIndex]
      if (along === undefined || along >= periodCount) return
      const periodIndex = Math.floor(along)
      const t = along / periodCount
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const context = canvas.getContext('2d')
      if (!context) return
      context.clearRect(0, 0, 256, 256)
      context.fillStyle = '#ffffff'
      context.font = '600 176px "Noto Sans SC", "Microsoft YaHei", sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(character, 128, 136)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const material = new THREE.MeshBasicMaterial({
        map: texture, color: '#ffffff', transparent: true, opacity: 0.96,
        alphaTest: 0.08, depthTest: true, depthWrite: false,
        // Text is printed on the top of the water surface. The underside must
        // never show mirrored writing when looking upward from a lower coil.
        toneMapped: false, side: THREE.FrontSide,
      })
      // The engine's normal material traversal owns disposal, including maps
      // made here that are intentionally outside its panorama texture cache.
      let textureDisposed = false
      material.addEventListener('dispose', () => {
        if (!textureDisposed) { textureDisposed = true; texture.dispose() }
      })
      const glyphSize = era.size ?? 0.72
      const glyphAcross = era.across ?? -0.38
      const glyph = new THREE.Mesh(new THREE.PlaneGeometry(glyphSize, glyphSize), material)
      const epsilon = 0.018 / periodCount
      const tangent = pointAt(t + epsilon, glyphAcross, 0.204).sub(pointAt(t - epsilon, glyphAcross, 0.204))
      glyph.position.copy(pointAt(t, glyphAcross, 0.204))
      glyph.rotation.set(-Math.PI / 2, Math.atan2(-tangent.z, tangent.x), 0, 'YXZ')
      glyph.name = `chronology-era-${era.text}-${characterIndex}`
      glyph.userData.periodIndex = periodIndex
      group.add(glyph)
      glyphLabels.push({ mesh: glyph, flipped: false })
    })
  }

  const baselineLeft = new THREE.Vector3()
  const baselineRight = new THREE.Vector3()
  function updateLabels(camera: THREE.Camera) {
    camera.updateMatrixWorld()
    group.updateWorldMatrix(true, true)
    const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1
    for (const label of glyphLabels) {
      // Project the original baseline, not the already flipped texture. This
      // avoids alternating decisions after applying the previous frame's flip.
      baselineLeft.set(-0.36, 0, 0).applyMatrix4(label.mesh.matrixWorld).project(camera)
      baselineRight.set(0.36, 0, 0).applyMatrix4(label.mesh.matrixWorld).project(camera)
      if (baselineLeft.z > 1 && baselineRight.z > 1) continue
      const dx = (baselineRight.x - baselineLeft.x) * aspect
      const dy = baselineRight.y - baselineLeft.y
      const length = Math.hypot(dx, dy)
      if (!Number.isFinite(length) || length < 1e-6) continue
      const horizontal = dx / length
      // Eight percent of projected baseline length provides a scale-independent
      // hysteresis band around the vertical direction, including at low angles.
      const flipped = horizontal < -0.08 ? true : horizontal > 0.08 ? false : label.flipped
      if (flipped === label.flipped) continue
      const uv = label.mesh.geometry.getAttribute('uv')
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i))
      uv.needsUpdate = true
      label.flipped = flipped
    }
  }

  const milestoneIndices = [0, 1, 2, 3, 9, 12]
  const milestones = milestoneIndices
    .filter(index => index < periodCount)
    .map((index): ChronologyMilestone => ({
      index,
      age: textbookStartAge(index),
      unit: '亿年',
      position: pointAt(index / periodCount, -1.12, 0.5),
    }))

  return { group, milestones, updateLabels }
}
