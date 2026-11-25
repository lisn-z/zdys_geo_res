import * as THREE from 'three'
import { shiftLatitude } from './model.ts'

export interface MonsoonLaunch {
  active: boolean
  travel: number
  readonly pausedPreviewTravel: number
}

/** Show the leading source arrow without placing a parcel beyond the equator. */
export function monsoonPausedPreviewPhase(span: number, sourceEndProgress: number) {
  const safeSpan = Number.isFinite(span) ? Math.max(0, span) : 0
  const sourceEnd = Number.isFinite(sourceEndProgress) ? THREE.MathUtils.clamp(sourceEndProgress, 0, 1) : 0
  // At this phase the leading tip reaches one arrow-length along the route.
  // For an unusually short source branch, retain a margin before the equator.
  return Math.min(safeSpan, sourceEnd * .8) / (1 + safeSpan)
}

export function createMonsoonLaunch(pausedPreviewTravel = .12): MonsoonLaunch {
  return { active: false, travel: 0,
    pausedPreviewTravel: Number.isFinite(pausedPreviewTravel) ? THREE.MathUtils.clamp(pausedPreviewTravel, 0, .5) : .12 }
}

/** Start at the source when this region's summer layer enters, then circulate. */
export function advanceMonsoonLaunch(
  launch: MonsoonLaunch, enabled: boolean, dt: number, speed: number, rate: number, playing: boolean,
) {
  if (!enabled) { launch.active = false; return }
  if (!launch.active) {
    // Date/layer changes may happen while paused. A zero phase is entirely
    // clipped at the source; use a static source preview only on this entrance.
    // Resuming playback continues from that position, without a second reset.
    launch.travel = playing ? 0 : launch.pausedPreviewTravel
    launch.active = true
  }
  if (playing) launch.travel += Math.max(0, dt) * Math.max(0, speed) * rate
}

/** Null means this arrow has not yet been emitted; modulo is only used after emission. */
export function monsoonLaunchPhase(launch: MonsoonLaunch, ordinal: number, count: number) {
  const travel = launch.travel - ordinal / count
  return travel < 0 ? null : THREE.MathUtils.euclideanModulo(travel, 1)
}

/** Anchor a name on the destination branch at an actual route/latitude intersection. */
export function monsoonDestinationAnchor(curve: THREE.Curve<THREE.Vector3>, latitude: number) {
  const latitudeAt = (progress: number) => {
    const p = curve.getPoint(progress)
    return THREE.MathUtils.radToDeg(Math.asin(p.y / p.length()))
  }
  const direction = Math.sign(latitudeAt(1) - latitudeAt(0)) || 1
  let lower = 0, upper = 1
  for (let i = 1; i <= 128; i++) {
    const progress = i / 128
    if ((latitudeAt(progress) - latitude) * direction >= 0) { lower = (i - 1) / 128; upper = progress; break }
  }
  for (let i = 0; i < 32; i++) {
    const middle = (lower + upper) / 2
    if ((latitudeAt(middle) - latitude) * direction < 0) lower = middle
    else upper = middle
  }
  const progress = (lower + upper) / 2, point = curve.getPoint(progress)
  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(point.y / point.length())),
    lon: THREE.MathUtils.radToDeg(Math.atan2(-point.z, point.x)),
    progress,
  }
}

export function northernMonsoonAnchor(curve: THREE.Curve<THREE.Vector3>, latitude = 12) {
  return monsoonDestinationAnchor(curve, latitude)
}

/** Replace only an overlapping source-hemisphere trade route, not the global belt. */
export function overlapsMonsoonSource(
  wind: THREE.Curve<THREE.Vector3>, monsoons: readonly THREE.Curve<THREE.Vector3>[], latitudeShift = 7.5,
  sourceHemisphere: 'north' | 'south' = 'south',
) {
  const sourceSign = sourceHemisphere === 'north' ? 1 : -1
  const sources = monsoons.flatMap(curve => Array.from({ length: 65 }, (_, i) => curve.getPoint(i / 64).normalize()))
    .filter(point => point.y * sourceSign > 0)
  const maxAngle = THREE.MathUtils.degToRad(3)
  for (let i = 0; i <= 32; i++) {
    const p = wind.getPoint(i / 32).normalize()
    const latitude = THREE.MathUtils.degToRad(shiftLatitude(THREE.MathUtils.radToDeg(Math.asin(p.y)), latitudeShift))
    if (latitude * sourceSign <= 0) continue
    const longitude = Math.atan2(p.z, p.x)
    p.set(Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude))
    if (sources.some(source => p.angleTo(source) < maxAngle)) return true
  }
  return false
}
