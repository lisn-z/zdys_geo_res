import * as THREE from 'three'
import { latitudeStyles } from './graticule.ts'

export interface PolarEquatorReference {
  group: THREE.Group
  line: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>
  labelPosition: THREE.Vector3
}

/**
 * A labelled projection aid for nearly polar viewpoints, not a surface feature.
 * The true equator must keep its ordinary depth-tested solid line. This sparse
 * dashed overlay deliberately ignores the globe depth so its projected position
 * remains interpretable even when the equatorial surface is beyond the horizon.
 * Parent UI must label it “赤道位置参考（投影）”.
 */
export function createPolarEquatorReference(radius = 2.5): PolarEquatorReference {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Earth radius must be positive and finite')
  const ringRadius = radius + .03
  const samples = 240
  const points = Array.from({ length: samples + 1 }, (_, i) => {
    const angle = i / samples * Math.PI * 2
    return new THREE.Vector3(ringRadius * Math.cos(angle), 0, -ringRadius * Math.sin(angle))
  })
  // Twenty-four short dashes separated by long gaps distinguish the projection
  // from both the continuous real equator and the tropic/polar-circle dashes.
  const period = 2 * Math.PI * ringRadius / 24
  const material = new THREE.LineDashedMaterial({
    color: latitudeStyles[0].color,
    dashSize: period * .3,
    gapSize: period * .7,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.NormalBlending,
  })
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)
  line.computeLineDistances()
  line.name = 'equator-projection-reference-dashes'
  line.renderOrder = 100
  line.frustumCulled = false
  line.userData.isProjectionReference = true
  const group = new THREE.Group()
  group.name = 'polar-equator-projection-reference'
  group.visible = false
  group.add(line)
  // Fixed geographic anchor avoids the label flipping sides when the camera
  // crosses the pole. It is an overlay label, not a visible surface annotation.
  const labelPosition = new THREE.Vector3(ringRadius, 0, 0)
  return { group, line, labelPosition }
}

/** View-dependent smooth fade: invisible through 0.88, fully shown by 0.98.
 * localEye is the camera position in the globe's local coordinate system.
 * No elapsed-time dependency: revisiting a viewpoint gives the same reference.
 */
export function updatePolarEquatorReference(
  reference: PolarEquatorReference,
  localEye: THREE.Vector3,
  enabled: boolean,
) {
  const length = localEye.length()
  const validEye = Number.isFinite(length) && length > 1e-8
  const polarAlignment = validEye ? Math.abs(localEye.y) / length : 0
  const opacity = enabled && validEye
    ? .72 * THREE.MathUtils.smoothstep(polarAlignment, .88, .98)
    : 0
  reference.line.material.opacity = opacity
  reference.group.visible = opacity > 0
}
