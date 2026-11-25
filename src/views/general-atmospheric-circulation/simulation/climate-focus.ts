import * as THREE from 'three'
import { normalizeLongitude, pickClimateGeoData, type PreparedClimateData } from './climate-geo-data.ts'

export interface ClimateFocusRequest {
  latitude: number
  longitude: number
  source: 'type' | 'station' | 'legend'
  id: string
  stationId?: string
}

/** Pick an actual interior point, never the bounding-box centre of a coast or hole. */
export function findClimateInteriorPoint(data: PreparedClimateData, id: string): { latitude: number; longitude: number } | null {
  const polygons = data.polygons.filter(polygon => polygon.type.id === id)
    .sort((a, b) => area(b.bounds) - area(a.bounds)).slice(0, 24)
  let best: { latitude: number; longitude: number; width: number } | null = null
  for (const polygon of polygons) {
    const { south, north } = polygon.bounds
    // A horizontal scan through the outer ring and all holes produces intervals
    // whose midpoints are safely inside even concave, tiled or dateline polygons.
    for (let row = 1; row <= 11; row++) {
      const latitude = south + (north - south) * row / 12
      const crossings: number[] = []
      for (const ring of polygon.rings) {
        for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
          const y1 = ring[j + 1]!, y2 = ring[i + 1]!
          if ((y1 > latitude) === (y2 > latitude)) continue
          crossings.push(ring[j]! + (ring[i]! - ring[j]!) * (latitude - y1) / (y2 - y1))
        }
      }
      crossings.sort((a, b) => a - b)
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const west = crossings[i]!, east = crossings[i + 1]!
        const longitude = normalizeLongitude((west + east) / 2)
        const width = (east - west) * Math.cos(latitude * Math.PI / 180)
        if (width <= (best?.width ?? 0) || pickClimateGeoData(data, latitude, longitude, 1)?.id !== id) continue
        best = { latitude, longitude, width }
      }
    }
  }
  return best ? { latitude: best.latitude, longitude: best.longitude } : null
}

function area(bounds: { east: number; west: number; north: number; south: number }) {
  return (bounds.east - bounds.west) * (bounds.north - bounds.south)
    * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180)
}

interface FocusOrbitControls {
  target: THREE.Vector3
  enableDamping: boolean
  minDistance: number
  maxDistance: number
  update(): unknown
}

/** Camera-only flight. It neither rotates the Earth nor starts/stops its animation. */
export class ClimateCameraFlight {
  private camera: THREE.PerspectiveCamera | null = null
  private controls: FocusOrbitControls | null = null
  private fromTarget = new THREE.Vector3()
  private toTarget = new THREE.Vector3()
  private fromDirection = new THREE.Vector3()
  private toDirection = new THREE.Vector3()
  private rotation = new THREE.Quaternion()
  private interpolatedRotation = new THREE.Quaternion()
  private fromUp = new THREE.Vector3()
  private toUp = new THREE.Vector3()
  private fromDistance = 0
  private toDistance = 0
  private elapsed = 0
  private restoreDamping = true
  readonly duration = 1.15
  get active() { return this.camera !== null }

  start(request: ClimateFocusRequest, earth: THREE.Object3D, camera: THREE.PerspectiveCamera, controls: FocusOrbitControls, radius = 2.5) {
    if (!Number.isFinite(request.latitude) || !Number.isFinite(request.longitude) || Math.abs(request.latitude) > 90) return false
    this.cancel()
    earth.updateWorldMatrix(true, false)
    this.camera = camera; this.controls = controls
    this.restoreDamping = controls.enableDamping
    // Drain residual OrbitControls damping once; leave controls enabled so a
    // teacher's pointer interaction can cancel immediately via its start event.
    controls.enableDamping = false; controls.update()
    this.fromTarget.copy(controls.target)
    earth.getWorldPosition(this.toTarget)
    this.fromDirection.copy(camera.position).sub(this.fromTarget)
    this.fromDistance = this.fromDirection.length()
    if (this.fromDistance < 1e-6) this.fromDirection.set(0, 0, 1)
    else this.fromDirection.normalize()
    const lat = THREE.MathUtils.degToRad(request.latitude), lon = THREE.MathUtils.degToRad(request.longitude)
    this.toDirection.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
      .transformDirection(earth.matrixWorld)
    this.rotation.setFromUnitVectors(this.fromDirection, this.toDirection)
    this.fromUp.copy(camera.up)
    this.toUp.set(0, 1, 0).transformDirection(earth.matrixWorld)
    if (Math.abs(this.toUp.dot(this.toDirection)) > .985) this.toUp.set(0, 0, -1).transformDirection(earth.matrixWorld)
    const scale = earth.getWorldScale(new THREE.Vector3()).length() / Math.sqrt(3)
    this.toDistance = THREE.MathUtils.clamp(radius * scale * 2.3, controls.minDistance, controls.maxDistance)
    this.elapsed = 0
    return true
  }

  update(deltaSeconds: number) {
    if (!this.camera || !this.controls) return false
    this.elapsed += Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)
    const t = Math.min(1, this.elapsed / this.duration)
    const eased = t * t * (3 - 2 * t)
    this.controls.target.lerpVectors(this.fromTarget, this.toTarget, eased)
    this.interpolatedRotation.identity().slerp(this.rotation, eased)
    const direction = this.fromDirection.clone().applyQuaternion(this.interpolatedRotation)
    this.camera.position.copy(this.controls.target).addScaledVector(direction,
      THREE.MathUtils.lerp(this.fromDistance, this.toDistance, eased))
    this.camera.up.lerpVectors(this.fromUp, this.toUp, eased).normalize()
    this.camera.lookAt(this.controls.target)
    this.camera.updateMatrixWorld(true)
    if (t === 1) this.cancel()
    return true
  }

  cancel() {
    if (this.controls) this.controls.enableDamping = this.restoreDamping
    this.camera = null; this.controls = null
  }
}
