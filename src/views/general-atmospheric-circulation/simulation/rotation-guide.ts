import * as THREE from 'three'

export interface RotationGuide {
  group: THREE.Group
  labelPosition: THREE.Vector3
  readonly orbitRadius: number
  readonly height: number
  readonly arrows: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[]
}

const angularSpeed = .65
const up = new THREE.Vector3(0, 1, 0)
const radial = new THREE.Vector3()
const tangent = new THREE.Vector3()
const frame = new THREE.Matrix4()

/** North-polar rotation reference, independent of the atmospheric circulation paths. */
export function createRotationGuide(radius = 2.5): RotationGuide {
  const group = new THREE.Group()
  group.name = 'north-polar-rotation-guide'
  const orbitRadius = .49
  const height = radius + .32
  const track = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => {
      const theta = THREE.MathUtils.degToRad(22 + i / 127 * 316)
      return new THREE.Vector3(orbitRadius * Math.cos(theta), height, -orbitRadius * Math.sin(theta))
    })),
    new THREE.LineBasicMaterial({
      color: '#82d8f6', opacity: .38, transparent: true,
      depthTest: true, depthWrite: false, toneMapped: false,
    }),
  )
  track.name = 'rotation-guide-track'
  track.renderOrder = 3
  group.add(track)

  // Local +Y is the travel direction; the arrow itself is a thin flat shape.
  const shape = new THREE.Shape()
  shape.moveTo(-.022, -.09)
  shape.lineTo(.022, -.09)
  shape.lineTo(.022, .015)
  shape.lineTo(.061, .015)
  shape.lineTo(0, .105)
  shape.lineTo(-.061, .015)
  shape.lineTo(-.022, .015)
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape)
  const material = new THREE.MeshBasicMaterial({
    color: '#9ae6ff', transparent: true, opacity: .92,
    depthTest: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  })
  const arrows = [0, 1].map(index => {
    const arrow = new THREE.Mesh(geometry, material)
    arrow.name = `rotation-direction-arrow-${index + 1}`
    arrow.renderOrder = 4
    group.add(arrow)
    return arrow
  })
  const guide = { group, labelPosition: new THREE.Vector3(.69, height, 0), orbitRadius, height, arrows }
  updateRotationGuide(guide, 0, false)
  return guide
}

/** Positive +Y rotation is eastward: x=cos(theta), z=-sin(theta), CCW from the north. */
export function updateRotationGuide(guide: RotationGuide, time: number, enabled: boolean) {
  guide.group.visible = enabled
  for (let i = 0; i < guide.arrows.length; i++) {
    const theta = THREE.MathUtils.euclideanModulo(time * angularSpeed + i * Math.PI, 2 * Math.PI)
    radial.set(Math.cos(theta), 0, -Math.sin(theta))
    tangent.set(-Math.sin(theta), 0, -Math.cos(theta))
    const arrow = guide.arrows[i]!
    arrow.position.set(radial.x * guide.orbitRadius, guide.height, radial.z * guide.orbitRadius)
    arrow.quaternion.setFromRotationMatrix(frame.makeBasis(radial, tangent, up))
  }
}
