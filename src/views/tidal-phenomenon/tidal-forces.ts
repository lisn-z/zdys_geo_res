import * as THREE from 'three'

export type TidalForceMode = 'gravity' | 'tidal'

interface ForceArrow {
  group: THREE.Group
  originSide: -1 | 0 | 1
  directionSign: -1 | 1
  marker: THREE.Mesh
  markerTravel: number
}

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const ignoreRaycast: THREE.Object3D['raycast'] = () => {}
const OVERLAY_ORDER = 20
const MARKER_START = 0.06

/**
 * Schematic force arrows, centered on Earth. Their fixed lengths compare forces;
 * moving highlights indicate arrow direction, not water or matter in motion.
 */
export class TidalForceField extends THREE.Group {
  private readonly gravityField = new THREE.Group()
  private readonly tidalField = new THREE.Group()
  private readonly arrows: ForceArrow[] = []
  private readonly shaftGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1, 12)
  private readonly headGeometry = new THREE.ConeGeometry(0.13, 1, 16)
  private readonly markerGeometry = new THREE.SphereGeometry(0.059, 12, 8)
  private readonly materials: THREE.MeshBasicMaterial[] = []
  private readonly moonDirection = new THREE.Vector3(0, 0, 1)
  private readonly arrowDirection = new THREE.Vector3()
  private flowPhase = 0
  private disposed = false

  constructor() {
    super()
    this.name = 'tidal-force-field'
    this.renderOrder = OVERLAY_ORDER
    this.raycast = ignoreRaycast

    this.gravityField.name = 'gravity-arrows'
    this.tidalField.name = 'tidal-arrows'
    this.gravityField.renderOrder = OVERLAY_ORDER
    this.tidalField.renderOrder = OVERLAY_ORDER
    this.add(this.gravityField, this.tidalField)

    const gravityMaterial = this.makeMaterial('#f6d58b', 0.9)
    const gravityHighlight = this.makeMaterial('#fff6dd', 1)
    const tidalMaterial = this.makeMaterial('#6ee7db', 0.95)
    const tidalHighlight = this.makeMaterial('#d7fff9', 1)

    // All actual lunar attraction points toward the Moon, including the far side.
    this.addArrow(this.gravityField, 'gravity-near', 1, 1, 1.25, gravityMaterial, gravityHighlight)
    this.addArrow(this.gravityField, 'gravity-center', 0, 1, 0.8, gravityMaterial, gravityHighlight)
    this.addArrow(this.gravityField, 'gravity-far', -1, 1, 0.45, gravityMaterial, gravityHighlight)

    // Subtracting Earth's central acceleration leaves opposite tidal effects.
    this.addArrow(this.tidalField, 'tidal-near', 1, 1, 1, tidalMaterial, tidalHighlight)
    this.addArrow(this.tidalField, 'tidal-far', -1, -1, 1, tidalMaterial, tidalHighlight)
    this.update(this.moonDirection, 1, 'gravity', 0, false)
  }

  private makeMaterial(color: string, opacity: number) {
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    this.materials.push(material)
    return material
  }

  private addArrow(
    parent: THREE.Group,
    name: string,
    originSide: -1 | 0 | 1,
    directionSign: -1 | 1,
    length: number,
    material: THREE.MeshBasicMaterial,
    highlight: THREE.MeshBasicMaterial,
  ) {
    const group = new THREE.Group()
    group.name = name
    group.renderOrder = OVERLAY_ORDER
    group.raycast = ignoreRaycast

    const headLength = Math.min(0.24, length * 0.34)
    const shaftLength = length - headLength
    const shaft = new THREE.Mesh(this.shaftGeometry, material)
    shaft.name = 'shaft'
    shaft.scale.y = shaftLength
    shaft.position.y = shaftLength / 2
    shaft.renderOrder = OVERLAY_ORDER
    shaft.raycast = ignoreRaycast

    const head = new THREE.Mesh(this.headGeometry, material)
    head.name = 'head'
    head.scale.y = headLength
    head.position.y = length - headLength / 2
    head.renderOrder = OVERLAY_ORDER + 1
    head.raycast = ignoreRaycast

    const marker = new THREE.Mesh(this.markerGeometry, highlight)
    marker.name = 'direction-highlight'
    marker.renderOrder = OVERLAY_ORDER + 2
    marker.raycast = ignoreRaycast

    group.add(shaft, head, marker)
    parent.add(group)
    this.arrows.push({
      group,
      originSide,
      directionSign,
      marker,
      markerTravel: shaftLength - MARKER_START * 2,
    })
  }

  update(
    direction: THREE.Vector3,
    surfaceRadius: number,
    mode: TidalForceMode,
    deltaSeconds: number,
    animate: boolean,
  ) {
    if (this.disposed) return

    const directionLength = direction.lengthSq()
    if (Number.isFinite(directionLength) && directionLength > 1e-12) {
      this.moonDirection.copy(direction).normalize()
    }
    const radius = Number.isFinite(surfaceRadius) ? Math.max(0, surfaceRadius) : 0
    if (animate && Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      this.flowPhase = (this.flowPhase + deltaSeconds * 0.45) % 1
    }

    this.gravityField.visible = mode === 'gravity'
    this.tidalField.visible = mode === 'tidal'

    for (const arrow of this.arrows) {
      arrow.group.position.copy(this.moonDirection).multiplyScalar(radius * arrow.originSide)
      this.arrowDirection.copy(this.moonDirection).multiplyScalar(arrow.directionSign)
      arrow.group.quaternion.setFromUnitVectors(Y_AXIS, this.arrowDirection)
      arrow.marker.position.y = MARKER_START + this.flowPhase * arrow.markerTravel
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.shaftGeometry.dispose()
    this.headGeometry.dispose()
    this.markerGeometry.dispose()
    this.materials.forEach((material) => material.dispose())
    this.arrows.length = 0
    this.materials.length = 0
    this.visible = false
    this.clear()
    this.removeFromParent()
  }
}
