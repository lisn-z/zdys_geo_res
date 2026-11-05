import * as THREE from 'three'
import type { WorldGeometry } from './world-geometry'
import type { createWorldMaterials } from './world-materials'
import { contourZ, TERRACE_AREAS } from './world-layout'
import { ACCESS_ROUTE_POINT2 } from './world-terrain'

export interface AccessPathInfo {
  /** Metre coordinates, ordered from the southern ridge toward the city. */
  centreline: readonly (readonly [x: number, y: number, z: number])[]
  width: number
  length: number
  maxRise: number
  steps: number
  /** This route illustrates a connection; it is not an archaeological survey. */
  educationalAlignment: true
}

type Materials = ReturnType<typeof createWorldMaterials>

/** Add before addTerrain so the narrow stone-road footprints can be fitted
 * into the same hillside mesh, instead of hovering above a separate surface. */
export function addAccessPath(build: WorldGeometry, materials: Materials, heightAt: (x: number, z: number) => number): AccessPathInfo {
  return buildAccess(build, materials, heightAt)
}

function buildAccess(build: WorldGeometry, materials: Materials, heightAt: (x: number, z: number) => number): AccessPathInfo {
  const width = 2.2, maxStepRise = .17
  const controls = ACCESS_ROUTE_POINT2.map(([x, z]) => new THREE.Vector3(x, 0, z))
  // The last metre lies inside the existing axial agricultural staircase.
  // No second road is laid across the cultivated fields or the guardhouse.
  controls[controls.length - 1]!.set(0, 0, contourZ(TERRACE_AREAS.length, 0) - .15)
  const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal')
  curve.arcLengthDivisions = 1600
  const length = curve.getLength(), count = Math.ceil(length / 1.1), points = curve.getSpacedPoints(count)
  const finalY = TERRACE_AREAS[TERRACE_AREAS.length - 1]!.y
  const centreline: [number, number, number][] = []
  for (let i = 0; i <= count; i++) {
    const p = points[i]!, remaining = length * (1 - i / count)
    // The final section cuts gently into the shoulder to meet the actual 62.55m
    // field datum. Earlier sections sit only 10cm above their natural surface.
    const blend = 1 - THREE.MathUtils.smoothstep(remaining, 0, 40)
    const y = THREE.MathUtils.lerp(heightAt(p.x, p.z) + .10, finalY, blend)
    centreline.push([p.x, y, p.z])
  }
  let steps = 0, maxRise = 0
  for (let i = 1; i < centreline.length; i++) {
    const a = centreline[i - 1]!, b = centreline[i]!, dx = b[0] - a[0], dz = b[2] - a[2], run = Math.hypot(dx, dz)
    const rise = b[1] - a[1], angle = -Math.atan2(dz, dx)
    if (Math.abs(rise) < .015) {
      // Almost level stretches are broad fitted paving, not hundreds of tiny
      // artificial risers. The 90cm closed stone bed remains buried at its edge.
      build.walkBox(run + .055, .90, width, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, materials.stone, angle)
      maxRise = Math.max(maxRise, Math.abs(rise))
    } else {
      const treadCount = Math.ceil(Math.abs(rise) / maxStepRise)
      // Adjacent stone flights overlap by 8cm at the joint. This closes the
      // small outside wedge at a bend without adding coplanar patch platforms.
      const overlap = .04, ux = dx / run, uz = dz / run
      build.stairs([a[0] - ux * overlap, a[2] - uz * overlap], [b[0] + ux * overlap, b[2] + uz * overlap], a[1], b[1], width, maxStepRise)
      steps += treadCount; maxRise = Math.max(maxRise, Math.abs(rise) / treadCount)
    }
    // Occasional irregular outer stones make the worn edge readable. They are
    // low, interrupted and outside the clear walking width, not a modern rail.
    if (i % 5 === 0 && i < centreline.length - 14) {
      const nx = -dz / run, nz = dx / run, side = i % 15 ? 1 : -1
      const blockLength = .48 + .16 * Math.sin(i * 2.23) ** 2, h = .13 + .06 * Math.sin(i * .83) ** 2
      build.box(blockLength, h, .28, b[0] + nx * side * (width / 2 + .07), b[1] - h / 2 + .065, b[2] + nz * side * (width / 2 + .07), materials.stone, angle + Math.sin(i) * .06)
    }
  }
  const start = centreline[0]!, next = centreline[1]!
  build.walkBox(2.0, .90, width, start[0], start[1], start[2], materials.stone, -Math.atan2(next[2] - start[2], next[0] - start[0]))
  // A short supported landing joins the highest farm terrace exactly. Keeping
  // it within the existing 5m axial corridor prevents an agricultural shortcut.
  const end = centreline[centreline.length - 1]!
  // Stay on the final existing tread; a deeper landing would cover two lower
  // agricultural steps and turn their normal risers into a single large drop.
  build.stairLanding(2.5, .8, end[0], finalY, end[2])
  return { centreline, width, length, maxRise, steps, educationalAlignment: true }
}
