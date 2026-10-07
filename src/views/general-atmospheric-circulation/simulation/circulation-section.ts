import * as THREE from 'three'
import { shiftLatitude } from './model.ts'

interface CellPathDefinition {
  type: 'single' | 'hadley' | 'ferrel' | 'polar'
  surfaceFromLat: number
  surfaceToLat: number
  riseLat: number
  upperFromLat: number
  upperToLat: number
  sinkLat: number
}
const EARTH_RADIUS = 2.5
const lerpValue = THREE.MathUtils.lerp
function latLonToVec3(lat: number, lon: number, radius: number) {
  const latitude = THREE.MathUtils.degToRad(lat), longitude = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.sin(latitude), -radius * Math.cos(latitude) * Math.sin(longitude))
}

export class AtmosphericCellCurve extends THREE.Curve<THREE.Vector3> {
  private readonly smoothCurve: THREE.CatmullRomCurve3

  constructor(
    definition: CellPathDefinition,
    centerLon: number,
    latitudeOffset = 0,
  ) {
    super()

    const surfaceFromLat = shiftLatitude(definition.surfaceFromLat, latitudeOffset)
    const surfaceToLat = shiftLatitude(definition.surfaceToLat, latitudeOffset)
    const riseLat = shiftLatitude(definition.riseLat, latitudeOffset)
    const upperFromLat = shiftLatitude(definition.upperFromLat, latitudeOffset)
    const upperToLat = shiftLatitude(definition.upperToLat, latitudeOffset)
    const sinkLat = shiftLatitude(definition.sinkLat, latitudeOffset)

    const surfaceRadius = EARTH_RADIUS + 0.09

    const upperHeightByType: Record<CellPathDefinition['type'], number> = {
      single: 0.95,
      hadley: 0.78,
      ferrel: 0.68,
      polar: 0.76,
    }

    const upperRadius = EARTH_RADIUS + upperHeightByType[definition.type]
    const middleRadius = THREE.MathUtils.lerp(surfaceRadius, upperRadius, 0.5)

    const point = (lat: number, radius: number) =>
      latLonToVec3(lat, centerLon, radius)

    /*
     * 按真实气流方向组织控制点：
     * 近地面支 → 上升圆角 → 高空支 → 下沉圆角 → 起点。
     * 在升降转折处同时改变纬度和半径，再交给闭合 CatmullRomCurve3
     * 做连续切线插值，避免“直角”和分段折线感。
     */
    const controls = [
      point(surfaceFromLat, surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.28), surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.68), surfaceRadius),
      point(lerpValue(surfaceFromLat, surfaceToLat, 0.93), surfaceRadius + 0.025),

      point(riseLat, surfaceRadius + (upperRadius - surfaceRadius) * 0.16),
      point(riseLat, middleRadius),
      point(riseLat, upperRadius - (upperRadius - surfaceRadius) * 0.16),

      point(lerpValue(upperFromLat, upperToLat, 0.07), upperRadius - 0.025),
      point(lerpValue(upperFromLat, upperToLat, 0.34), upperRadius),
      point(lerpValue(upperFromLat, upperToLat, 0.72), upperRadius),
      point(lerpValue(upperFromLat, upperToLat, 0.94), upperRadius - 0.025),

      point(sinkLat, upperRadius - (upperRadius - surfaceRadius) * 0.16),
      point(sinkLat, middleRadius),
      point(sinkLat, surfaceRadius + (upperRadius - surfaceRadius) * 0.16),

      point(lerpValue(sinkLat, surfaceFromLat, 0.82), surfaceRadius + 0.025),
    ]

    this.smoothCurve = new THREE.CatmullRomCurve3(
      controls,
      true,
      'centripetal',
      0.5,
    )

    this.smoothCurve.arcLengthDivisions = definition.type === 'single' ? 720 : 540
    this.arcLengthDivisions = definition.type === 'single' ? 720 : 540
  }

  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.smoothCurve.getPointAt(((t % 1) + 1) % 1))
  }
}

/** A meridional section has a fixed plane, independent of the camera. */
export function sectionPlaneNormal(point: THREE.Vector3) {
  return new THREE.Vector3(-point.z, 0, point.x).normalize()
}

/** Fit an inset loop to the section's radial and angular bounds.
 * Unlike a normal offset, this stays smooth at the tight polar corners.
 */
export function insetSectionCurve(curve: THREE.Curve<THREE.Vector3>, clearance: number) {
  const count = 640
  const points = Array.from({ length: count }, (_, i) => curve.getPointAt(i / count))
  const radial = points.reduce((sum, p) => sum.add(new THREE.Vector3(p.x, 0, p.z)), new THREE.Vector3()).normalize()
  const radii = points.map(p => p.length())
  const latitudes = points.map(p => Math.atan2(p.y, p.dot(radial)))
  const minRadius = Math.min(...radii), maxRadius = Math.max(...radii)
  const minLatitude = Math.min(...latitudes), maxLatitude = Math.max(...latitudes)
  const angularMargin = Math.asin(clearance / minRadius)
  const inset = points.map((p, i) => {
    const r = THREE.MathUtils.mapLinear(radii[i]!, minRadius, maxRadius, minRadius + clearance, maxRadius - clearance)
    const lat = THREE.MathUtils.mapLinear(latitudes[i]!, minLatitude, maxLatitude, minLatitude + angularMargin, maxLatitude - angularMargin)
    return radial.clone().multiplyScalar(r * Math.cos(lat)).setY(r * Math.sin(lat))
  })
  const result = new THREE.CatmullRomCurve3(inset, true, 'centripetal')
  result.arcLengthDivisions = 960
  return result
}

/** Roll the north pole to the right, then look up from near the surface at the airflow. */
export function circulationCloseView(aspect: number, sectionLongitude: number, single: boolean) {
  const latitude = THREE.MathUtils.degToRad(single ? 0 : 15)
  // After the roll, this meridian is above the globe and north is screen-right.
  const groundNormal = new THREE.Vector3(Math.sin(latitude), Math.cos(latitude), 0)
  const northward = new THREE.Vector3(Math.cos(latitude), -Math.sin(latitude), 0)
  const position = groundNormal.clone().multiplyScalar(EARTH_RADIUS + .15).setZ(single ? 1.35 : 1.15)
  const target = groundNormal.clone().multiplyScalar(EARTH_RADIUS + (single ? .62 : .56))
    .addScaledVector(northward, single ? 0 : .12)
  // Pull back along the existing sightline: retain the approved ground-level
  // angle and roll, but leave more room around the circulation.
  position.sub(target).multiplyScalar(2.4).add(target)
  // Maintain a useful horizontal field of view in narrow layouts without pulling
  // the observer back into a whole-globe overview.
  const fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(37)) / Math.max(.5, aspect)),
  ), 48, 100)
  return {
    position, target, fov,
    earthRotationY: THREE.MathUtils.degToRad(180 - sectionLongitude),
    earthRotationZ: -Math.PI / 2,
  }
}

export function circulationTransitionProgress(progress: number, entering: boolean) {
  const ease = (t: number) => THREE.MathUtils.smoothstep(t, 0, 1)
  return entering
    ? { rotation: ease(progress / .62), camera: ease((progress - .28) / .72) }
    : { rotation: ease((progress - .3) / .7), camera: ease(progress / .72) }
}

/** An orbit-like approach cannot cut through the globe when starting behind it. */
export function interpolateCirculationCamera(from: THREE.Vector3, to: THREE.Vector3, progress: number, target = new THREE.Vector3()) {
  const turn = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize())
  const rotation = new THREE.Quaternion().slerp(turn, progress)
  return target.copy(from).normalize().applyQuaternion(rotation)
    .multiplyScalar(THREE.MathUtils.lerp(from.length(), to.length(), progress))
}
