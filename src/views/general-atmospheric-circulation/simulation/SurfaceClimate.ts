// Surface layers ported from 三圈环流-self; destination palette and stage adapter only.
import * as THREE from 'three'
import { createSurfaceArrowGeometry, updateSurfaceArrow, createWindCurve, surfaceArrowFrame, WIND_ARROW_PHASES, surfaceWindArrowFragment, setCrossEquatorialArrowColors } from './surface-arrows.ts'
import { createMonsoonLaunch, advanceMonsoonLaunch, monsoonLaunchPhase, monsoonPausedPreviewPhase, monsoonDestinationAnchor, overlapsMonsoonSource, type MonsoonLaunch } from './monsoon-crossing.ts'
import { PressureField } from './PressureField.ts'
import { PressureCenterText } from './PressureCenterText.ts'
import { PressureValueText } from './PressureValueText.ts'
import { CurrentNameText, projectTextPatchBounds, type CurrentNameState } from './CurrentNameText.ts'
import { Sunlight } from './Sunlight.ts'
import { resolveSeasonTargets, type SeasonPoint } from './seasonal-controls.ts'
import { createGeographicCurve } from './geographic-paths.ts'
import { createCurrentLineGeometry, advancePulse, flowMotionDirection } from './flow-effects.ts'
import { contourAnchors, formatPressure, pressureCenterAnchors, pressureLabelLevels, pressureColors, type PressureMonth } from './pressure-data.ts'
import { flowFragment, flowVertex, pressureFragment, currentPulseFragment } from './shaders.ts'
import { damp, formatAngle, oceanCurrents, currentVisibleInMonth, monsoonWinds, monsoonStrength, seasonalDirection,
  palette, pressureDefinitions, shiftLatitude, seasonalShift, windDefinitions,
  type SeasonalRegime, type MonsoonSeason, type Basin, type Layers, type Selection } from './model.ts'
const R = 2.5
const rad = Math.PI / 180
const geo = (lat: number, lon: number, radius = R) => new THREE.Vector3(
  radius * Math.cos(lat * rad) * Math.cos(lon * rad), radius * Math.sin(lat * rad),
  -radius * Math.cos(lat * rad) * Math.sin(lon * rad))
export interface ClimateState {
  stage: number
  month: 1 | 7
  playing: boolean
  speed: number
  layers: Record<string, boolean>
  neutralSeason?: boolean
  seasonPoint?: SeasonPoint
}
export interface ClimateLabel { id?: string; text: string; x: number; y: number; visible: boolean; cls: string; color: string; opacity: number }
export interface PressureLabelCandidate extends ClimateLabel { id: string; value: number; lat: number; lon: number; contourId: string }
export interface LabelBounds { left: number; right: number; top: number; bottom: number }
const labelTextWidth = (text: string) => Math.max(...text.split('\n').map(line =>
  [...line].reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 12 : 7), 20)))
const labelTextHeight = (text: string) => text.split('\n').length * 16 + 6
const labelBounds = (label: ClimateLabel, padding = 4): LabelBounds => ({
  left: label.x - labelTextWidth(label.text) / 2 - padding,
  right: label.x + labelTextWidth(label.text) / 2 + padding,
  top: label.y - labelTextHeight(label.text) / 2 - padding,
  bottom: label.y + labelTextHeight(label.text) / 2 + padding,
})
const boundsOverlap = (a: LabelBounds, b: LabelBounds) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

/** Spread labels across the visible pressure levels before repeating a value. */
export function selectPressureLabelCandidates(
  candidates: readonly PressureLabelCandidate[], occupied: readonly LabelBounds[], width: number, height: number,
  retainedIds: readonly string[] = [],
) {
  const limit = width < 900 ? 9 : 14
  const repeatedValueLimit = width < 900 ? 2 : 3
  const selected: PressureLabelCandidate[] = []
  const boxes: LabelBounds[] = []
  const selectedIds = new Set<string>()
  const counts = new Map<number, number>()
  const add = (candidate: PressureLabelCandidate) => {
    selected.push(candidate)
    boxes.push(labelBounds(candidate, 2))
    selectedIds.add(candidate.id)
    counts.set(candidate.value, (counts.get(candidate.value) ?? 0) + 1)
  }
  // Existing labels keep their geographic anchors. A smaller exit clearance than
  // entrance clearance prevents alternating labels near a collision boundary.
  const byId = new Map(candidates.map(candidate => [candidate.id, candidate]))
  for (const id of retainedIds) {
    const candidate = byId.get(id)
    if (!candidate || selected.length >= limit) continue
    const box = labelBounds(candidate, 2)
    if (box.left < 2 || box.right > width - 2 || box.top < 2 || box.bottom > height - 2) continue
    if (occupied.some(other => boundsOverlap(box, other)) || boxes.some(other => boundsOverlap(box, other))) continue
    add(candidate)
  }
  const levels = new Map<number, PressureLabelCandidate[]>()
  for (const candidate of candidates) {
    if (selectedIds.has(candidate.id)) continue
    const box = labelBounds(candidate, 6)
    if (box.left < 12 || box.right > width - 12 || box.top < 12 || box.bottom > height - 12) continue
    if (occupied.some(other => boundsOverlap(box, other))) continue
    const bucket = levels.get(candidate.value) ?? []
    bucket.push(candidate)
    levels.set(candidate.value, bucket)
  }
  // Give rare high/low levels a chance. Candidate ordering is fixed geographically,
  // not re-ranked by camera distance on every frame.
  for (const bucket of levels.values()) bucket.sort((a, b) => a.id.localeCompare(b.id))
  const buckets = [...levels.values()].sort((a, b) => a.length - b.length || a[0]!.value - b[0]!.value)
  for (let round = 0; round < repeatedValueLimit && selected.length < limit; round++) {
    for (const bucket of buckets) {
      if ((counts.get(bucket[0]!.value) ?? 0) > round) continue
      for (const candidate of bucket) {
        if (selectedIds.has(candidate.id)) continue
        const box = labelBounds(candidate, 6)
        if (boxes.some(other => boundsOverlap(box, other))) continue
        const distance = selected.length ? Math.min(...selected.map(other =>
          ((other.x - candidate.x) / 100) ** 2 + ((other.y - candidate.y) / 52) ** 2)) : 1
        if (distance < 1) continue
        add(candidate)
        break
      }
      if (selected.length >= limit) break
    }
  }
  return selected
}

// Sample a fixed geographic set once per month; do not slide a number between
// neighboring source-grid intersections as the globe turns.
function fixedPressureLabelAnchors(month: PressureMonth) {
  const allowed = new Set(pressureLabelLevels(month))
  const bins = new Map<string, ReturnType<typeof contourAnchors>[number]>()
  for (const anchor of contourAnchors(month)) {
    if (!allowed.has(anchor.value)) continue
    const row = Math.floor((anchor.lat + 90) / 6)
    const lonStep = 6 / Math.max(.4, Math.cos((row * 6 - 87) * rad))
    const col = Math.floor((anchor.lon + 180) / lonStep)
    const key = `${anchor.contourId}:${row}:${col}`
    const previous = bins.get(key)
    const distance = (point: typeof anchor) => (point.lat - (row * 6 - 87)) ** 2 +
      ((point.lon - ((col + .5) * lonStep - 180)) * Math.cos(point.lat * rad)) ** 2
    if (!previous || distance(anchor) < distance(previous)) bins.set(key, anchor)
  }
  return [...bins.values()].sort((a, b) => a.id.localeCompare(b.id))
}
interface LabelAnchor {
  cls?: string
  surfaceMonths?: readonly number[]
  id: string
  text: string
  lat: number
  lon: number
  radius: number
  layer: keyof Layers
  color: string
  seasonal: boolean
  selection: Selection
  basin?: Basin
  opacity?: number
  monsoonSeason?: MonsoonSeason
  regime?: SeasonalRegime
  seasonalTemperature?: boolean
  contourId?: string
}
interface Flow {
  replacedByCrossEquatorialMonths?: readonly number[]
  surfaceMonths?: readonly number[]
  pulse?: boolean
  wasAvailable?: boolean
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  layer: keyof Layers
  focus: string
  basin?: Basin
  monsoon?: boolean
  monsoonSeason?: MonsoonSeason
  regime?: SeasonalRegime
  seasonalTemperature?: boolean
  baseOpacity: number
  currentOpacity: number
}
export class SurfaceClimate {
  readonly group = new THREE.Group()
  readonly shift = { value: 0 }
  readonly pressureField = new PressureField(R + .027)
  readonly pressureValues = new PressureValueText(R + .06)
  readonly currentNames = new CurrentNameText(R + .085)
  readonly sunlight = new Sunlight(R)
  private pressureText = { january: new PressureCenterText(R + .065), july: new PressureCenterText(R + .065) }
  private time = { value: 0 }
  private flows: Flow[] = []
  private labels: LabelAnchor[] = []
  private pressureLabelMonth: PressureMonth | null = null
  private pressureLabelIds: string[] = []
  private pressureLabelAnchors = new Map<PressureMonth, ReturnType<typeof fixedPressureLabelAnchors>>()
  private surfaceArrows: {
    flow: Flow; curve: THREE.Curve<THREE.Vector3>; progress: number; span: number; speed: number; halfWidth: number; direction: number; inset: number
    monsoonLaunch?: { clock: MonsoonLaunch; ordinal: number; count: number; activeMonth: 1 | 7 }
  }[] = []
  private monsoonLaunches: {
    clock: MonsoonLaunch; rate: number; activeMonth: 1 | 7; season: MonsoonSeason; regime?: SeasonalRegime
  }[] = []
  private seasonalDirections: Record<SeasonalRegime, { value: number }> = {
    eastAsia: { value: 1 }, southAsia: { value: 1 }, northIndian: { value: 1 }, somali: { value: 1 },
  }

  constructor() {
    this.group.name = 'surface-climate-self'
    this.group.add(this.pressureField.mesh, this.pressureText.january.group, this.pressureText.july.group, this.pressureValues.group, this.currentNames.group, this.sunlight.group)
    this.createPressure()
    this.createWinds()
    this.createMonsoons()
    this.createCurrents()
  }

  /** Settle a newly created globe at its actual month before its first frame.
   * The stationary update resolves date/layer transitions without advancing
   * moving arrows, launch clocks or shader time. Subsequent updates remain smooth.
   */
  initialize(state: ClimateState) {
    this.update(10, { ...state, playing: false })
  }

  private enabled(layer: keyof Layers, state: ClimateState) {
    const map: Partial<Record<keyof Layers, string>> = {
      pressure: 'pressureBands', wind: 'surfaceWinds', monsoons: 'monsoonWinds',
      currents: 'oceanCurrents', pressureField: 'regionalPressureCenters', isobars: 'isobars', sunlight: 'subsolarLine',
    }
    if (layer === 'sunlight') return !!state.layers.subsolarLine
    if (state.stage === 0) return false
    if (['pressureField', 'isobars'].includes(layer) && state.stage !== 3) return false
    if (['monsoons', 'currents'].includes(layer) && state.stage < 3) return false
    return !!state.layers[map[layer] ?? '']
  }

  update(dt: number, state: ClimateState) {
    const targets = resolveSeasonTargets(state.stage, state.month, state.seasonPoint, state.neutralSeason)
    this.shift.value = damp(this.shift.value, targets.latitudeShift, dt)
    this.sunlight.update(state.month, state.stage < 2 || !!state.neutralSeason, this.enabled('sunlight', state), state.playing, state.speed, dt, false, targets.solarLatitude)
    this.pressureField.summerMix.value = damp(this.pressureField.summerMix.value, state.month === 7 ? 1 : 0, dt)
    this.pressureField.fill.value = damp(this.pressureField.fill.value, this.enabled('pressureField', state) ? 1 : 0, dt)
    this.pressureField.lines.value = damp(this.pressureField.lines.value, this.enabled('isobars', state) ? 1 : 0, dt)
    this.pressureField.mesh.visible = this.pressureField.fill.value + this.pressureField.lines.value > .005
    if (!state.layers.textAnnotations || !(this.enabled('pressureField', state) || this.enabled('isobars', state)) ||
      !(state.month === 7 ? this.pressureField.summerMix.value > .985 : this.pressureField.summerMix.value < .015)) this.pressureValues.hide()
    for (const regime of Object.keys(this.seasonalDirections) as SeasonalRegime[])
      this.seasonalDirections[regime].value = damp(this.seasonalDirections[regime].value, seasonalDirection(state.month, regime), dt)
    if (state.playing) this.time.value += dt * state.speed
    const currentNameStates: CurrentNameState[] = []
    for (const flow of this.flows) {
      const inSeason = currentVisibleInMonth(flow, state.month)
      const replaced = flow.replacedByCrossEquatorialMonths?.includes(state.month) && this.enabled('monsoons', state)
      const available = this.enabled(flow.layer, state) && inSeason && !replaced
      const seasonOpacity = flow.monsoonSeason && flow.regime ? monsoonStrength(this.seasonalDirections[flow.regime].value, flow.monsoonSeason) : 1
      const uniforms = flow.mesh.material.uniforms
      if (flow.seasonalTemperature)
        (uniforms.color!.value as THREE.Color).set(palette.warm).lerp(new THREE.Color(palette.cold), (this.seasonalDirections.somali.value + 1) / 2)
      flow.currentOpacity = damp(flow.currentOpacity, available ? flow.baseOpacity * seasonOpacity : 0, dt)
      uniforms.opacity!.value = flow.currentOpacity
      flow.mesh.visible = flow.currentOpacity > .006
      if (flow.pulse) {
        const direction = flowMotionDirection(flow, flow.regime ? this.seasonalDirections[flow.regime].value : 1)
        uniforms.travel!.value = THREE.MathUtils.euclideanModulo(advancePulse(uniforms.travel!.value, dt, state.speed, direction, state.playing), uniforms.spacing!.value)
        if (Math.abs(direction) > .035) uniforms.direction!.value = Math.sign(direction)
        uniforms.strength!.value = Math.min(1, Math.abs(direction) * 3)
        currentNameStates.push({ id: flow.focus,
          visible: available && !!state.layers.textAnnotations,
          opacity: flow.currentOpacity * uniforms.strength!.value,
          direction, color: uniforms.color!.value as THREE.Color })
      }
    }
    this.currentNames.update(currentNameStates)
    for (const launch of this.monsoonLaunches) {
      const launchEnabled = this.enabled('monsoons', state) && state.month === launch.activeMonth &&
        (!launch.regime || monsoonStrength(this.seasonalDirections[launch.regime].value, launch.season) > .03)
      advanceMonsoonLaunch(launch.clock, launchEnabled, dt, state.speed, launch.rate, state.playing)
    }
    for (const arrow of this.surfaceArrows) {
      if (!arrow.flow.mesh.visible) continue
      const signedSpeed = flowMotionDirection(arrow.flow, arrow.flow.regime ? this.seasonalDirections[arrow.flow.regime].value : 1)
      if (arrow.monsoonLaunch) {
        const { clock, ordinal, count } = arrow.monsoonLaunch
        const phase = monsoonLaunchPhase(clock, ordinal, count)
        if (phase === null) { arrow.flow.mesh.visible = false; continue }
        arrow.progress = phase
      } else if (state.playing) arrow.progress = THREE.MathUtils.euclideanModulo(arrow.progress + dt * state.speed * arrow.speed * signedSpeed, 1)
      if (Math.abs(signedSpeed) > .035) arrow.direction = signedSpeed < 0 ? -1 : 1
      const frame = surfaceArrowFrame(arrow.progress, arrow.span, arrow.direction, arrow.inset)
      updateSurfaceArrow(arrow.flow.mesh.geometry, arrow.curve, frame.start, arrow.span, arrow.direction,
        R + (arrow.flow.layer === 'monsoons' ? .105 : .073), arrow.halfWidth, frame.clipMin, frame.clipMax)
    }
    // Do not slide H/L marks from one pressure system to an unrelated one.
    // Fade the endpoint labels out during field interpolation, then show the new extrema.
    const mix = this.pressureField.summerMix.value
    const opacity = Math.max(this.pressureField.fill.value, this.pressureField.lines.value)
    this.pressureText.january.update(pressureCenterAnchors(1), !!state.layers.textAnnotations && opacity > .005 && mix < .2, opacity * Math.max(0, 1 - mix * 5))
    this.pressureText.july.update(pressureCenterAnchors(7), !!state.layers.textAnnotations && opacity > .005 && mix > .8, opacity * Math.max(0, 1 - (1 - mix) * 5))
  }

  projectLabels(camera: THREE.Camera, width: number, height: number, state: ClimateState): ClimateLabel[] {
    if (this.pressureLabelMonth !== state.month) {
      this.pressureLabelMonth = state.month
      this.pressureLabelIds = []
    }
    if (!state.layers.textAnnotations) { this.pressureValues.hide(); this.currentNames.hide(); return [] }
    if (!this.enabled('currents', state)) this.currentNames.hide()
    this.group.updateWorldMatrix(true, true)
    // Regional monsoon branches carry the current lesson; give them room before
    // generic wind-belt names, while retaining the same globe occlusion checks.
    const entries = [...this.labels].sort((a, b) => Number(b.layer === 'monsoons') - Number(a.layer === 'monsoons'))
    const solar = this.sunlight.latitude
    if (this.enabled('sunlight', state)) {
      const view = this.group.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))
      entries.unshift({ id: 'solar', text: `太阳直射纬度 · ${solar > .005 ? '北纬' : solar < -.005 ? '南纬' : ''}${formatAngle(solar)}`,
        lat: solar, lon: Math.atan2(-view.z, view.x) / rad, radius: R + .09, color: palette.solar, layer: 'sunlight', seasonal: false, selection: {} as Selection })
    }
    const mix = this.pressureField.summerMix.value
    const visible: ClimateLabel[] = []
    const planetCenter = this.group.getWorldPosition(new THREE.Vector3())
    const eye = camera.getWorldPosition(new THREE.Vector3())
    for (const label of entries) {
      if (!this.enabled(label.layer, state) || !currentVisibleInMonth(label, state.month)) continue
      const opacity = label.monsoonSeason && label.regime ? monsoonStrength(this.seasonalDirections[label.regime].value, label.monsoonSeason) : 1
      if (opacity < .03) continue
      const world = geo(label.seasonal ? shiftLatitude(label.lat, this.shift.value) : label.lat, label.lon, label.radius).applyMatrix4(this.group.matrixWorld)
      if (world.clone().sub(planetCenter).normalize().dot(eye.clone().sub(world).normalize()) < .1) continue
      const p = world.project(camera)
      if (Math.abs(p.x) > .96 || Math.abs(p.y) > .94 || p.z < -1 || p.z > 1) continue
      const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2
      const color = label.seasonalTemperature
        ? new THREE.Color(palette.warm).lerp(new THREE.Color(palette.cold), (this.seasonalDirections.somali.value + 1) / 2).getStyle() : label.color
      const projected = { id: label.id, text: label.text, x, y, visible: true, cls: label.cls ?? 'climate-label', color, opacity }
      if (visible.some(other => boundsOverlap(labelBounds(projected), labelBounds(other)))) continue
      visible.push(projected)
    }

    const occupied = visible.map(label => labelBounds(label))
    // Geographic pressure centers cannot move. Reserve their actual text patches
    // (including both endpoint months while fading) before placing current names.
    for (const centerGroup of [this.pressureText.january.group, this.pressureText.july.group]) {
      if (!centerGroup.visible) continue
      for (const child of centerGroup.children) {
        if (!(child instanceof THREE.Mesh) || !child.visible || child.material.opacity < .05) continue
        const center = child.userData.center
        if (!center) continue
        const world = geo(center.lat, center.lon, R + .065).applyMatrix4(this.group.matrixWorld)
        if (world.clone().sub(planetCenter).normalize().dot(eye.clone().sub(world).normalize()) < .1) continue
        occupied.push(projectTextPatchBounds(child, camera, width, height, 6))
      }
    }
    this.currentNames.orientForCamera(camera, width, height, occupied)
    const currentBounds = this.currentNames.active.flatMap(label => label.screenBounds ? [label.screenBounds] : [])
    occupied.push(...currentBounds)
    const pressureEnabled = this.enabled('pressureField', state) || this.enabled('isobars', state)
    // Values belong to a settled monthly field. Never label interpolated weather
    // or leave July's values visible immediately after January is selected.
    const settled = state.month === 7 ? mix > .985 : mix < .015
    const pressureOpacity = Math.max(this.pressureField.fill.value, this.pressureField.lines.value)
    if (!pressureEnabled || !settled || pressureOpacity < .03) { this.pressureValues.hide(); return visible }
    const month: PressureMonth = state.month
    const pressureTextCenters = pressureCenterAnchors(month)
    if (!this.pressureLabelAnchors.has(month)) this.pressureLabelAnchors.set(month, fixedPressureLabelAnchors(month))
    const retained = new Set(this.pressureLabelIds)
    const candidates: PressureLabelCandidate[] = []
    for (const anchor of this.pressureLabelAnchors.get(month)!) {
      const id = `pressure-${month}-${anchor.id}`
      if (pressureTextCenters.some(center => Math.abs(anchor.lat - center.lat) < 6 &&
        Math.abs(((anchor.lon - center.lon + 540) % 360) - 180) * Math.cos(center.lat * rad) < 14)) continue
      const world = geo(anchor.lat, anchor.lon, R + .045).applyMatrix4(this.group.matrixWorld)
      const facing = world.clone().sub(planetCenter).normalize().dot(eye.clone().sub(world).normalize())
      const keep = retained.has(id)
      if (facing < (keep ? .06 : .16)) continue
      const p = world.project(camera)
      if (Math.abs(p.x) > (keep ? .99 : .95) || Math.abs(p.y) > (keep ? .98 : .93) || p.z < -1 || p.z > 1) continue
      candidates.push({ id, text: formatPressure(anchor.value), x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2,
        visible: true, cls: 'climate-contour-label', color: pressureColors.line,
        opacity: pressureOpacity * THREE.MathUtils.smoothstep(facing, .06, .16),
        value: anchor.value, lat: anchor.lat, lon: anchor.lon, contourId: anchor.contourId })
    }
    const selected = selectPressureLabelCandidates(candidates, occupied, width, height, this.pressureLabelIds)
    this.pressureValues.update(selected)
    // At close zoom the numeric mesh is larger than its nominal screen label.
    // Give current names room using the real spherical text footprint as well.
    const overlapping = new Set(this.pressureValues.active.filter(patch => {
      const bounds = projectTextPatchBounds(patch.mesh, camera, width, height, 4)
      return currentBounds.some(other => boundsOverlap(bounds, other))
    }).map(patch => patch.label.id))
    const cleared = selected.filter(label => !overlapping.has(label.id))
    if (overlapping.size) this.pressureValues.update(cleared)
    this.pressureLabelIds = cleared.map(label => label.id)
    return visible
  }

  dispose() {
    this.pressureText.january.dispose()
    this.pressureText.july.dispose()
    this.pressureValues.dispose()
    this.currentNames.dispose()
    // Parent scene traversal releases geometries and materials.
  }
  private material(color: string, seasonal = true, pressure = false) {
    return new THREE.ShaderMaterial({
      vertexShader: flowVertex,
      fragmentShader: pressure ? pressureFragment : flowFragment,
      uniforms: {
        shift: this.shift,
        time: this.time,
        color: { value: new THREE.Color(color) },
        seasonal: { value: seasonal ? 1 : 0 },
        opacity: { value: 0 },
        highlight: { value: 0 },
        glow: { value: 0 },
        direction: { value: 1 },
        risingColor: { value: new THREE.Color(palette.rising) },
        sinkingColor: { value: new THREE.Color(palette.sinking) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }
  private addFlow(
    geometry: THREE.BufferGeometry,
    material: THREE.ShaderMaterial,
    layer: keyof Layers,
    focus: string,
    extras: Partial<Flow> = {},
  ) {
    const verticalFlow = new Float32Array(geometry.getAttribute('position').count)
    if (geometry instanceof THREE.TubeGeometry) {
      const { path, tubularSegments, radialSegments } = geometry.parameters
      // TubeGeometry samples the curve by arc length. Positive radial velocity
      // means ascent; negative radial velocity means descent, in both hemispheres.
      for (let i = 0; i <= tubularSegments; i++) {
        const u = i / tubularSegments
        const direction = path.getTangentAt(u).dot(path.getPointAt(u).normalize())
        for (let j = 0; j <= radialSegments; j++) verticalFlow[i * (radialSegments + 1) + j] = direction
      }
    }
    if (!geometry.hasAttribute('verticalFlow'))
      geometry.setAttribute('verticalFlow', new THREE.BufferAttribute(verticalFlow, 1))
    const mesh = new THREE.Mesh(geometry, material)
    // Transparent layers do not write depth: explicitly draw the pressure field,
    // then the latitude bands, then moving arrows. All still test the globe depth.
    mesh.renderOrder = layer === 'pressure' ? 2 : 4
    mesh.frustumCulled = false
    this.group.add(mesh)
    const flow = { mesh, layer, focus, baseOpacity: 1, currentOpacity: 0, ...extras }
    this.flows.push(flow)
    return flow
  }
  private glowHalo(flow: Flow, geometry: THREE.BufferGeometry) {
    const material = flow.mesh.material.clone()
    // Motion, color and selection are shared with the core, so halos never lag.
    material.uniforms = { ...flow.mesh.material.uniforms, glow: { value: 1 } }
    material.blending = THREE.AdditiveBlending
    const halo = new THREE.Mesh(geometry, material)
    halo.renderOrder = flow.mesh.renderOrder
    halo.frustumCulled = false
    flow.mesh.add(halo)
  }
  private createPressure() {
    for (const def of pressureDefinitions) {
      const pos: number[] = [],
        uv: number[] = [],
        indices: number[] = []
      for (let j = 0; j <= 12; j++)
        for (let i = 0; i <= 160; i++) {
          const lat = THREE.MathUtils.clamp(def.lat + ((j / 12) * 2 - 1) * def.halfWidth, -89.8, 89.8)
          const p = geo(lat, (i / 160) * 360 - 180, R + 0.035)
          pos.push(p.x, p.y, p.z)
          uv.push(i / 160, j / 12)
          if (j < 12 && i < 160) {
            const a = j * 161 + i
            indices.push(a, a + 161, a + 1, a + 1, a + 161, a + 162)
          }
        }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
      geometry.setIndex(indices)
      const color = def.high ? palette.high : palette.low
      this.addFlow(geometry, this.material(color, true, true), 'pressure', `pressure-${def.lat}`, { baseOpacity: 1 })
      this.labels.push({
        id: `pressure-${def.lat}`,
        text: `${def.high ? 'H' : 'L'} · ${def.name}`,
        lat: def.lat,
        lon: -106,
        radius: R + 0.08,
        color,
        layer: 'pressure',
        seasonal: true,
        selection: {
          title: def.name,
          text: def.high ? '近地面高气压区，空气通常下沉并向周围辐散。' : '近地面低气压区，空气辐合并上升。',
          tag: def.high ? '高气压带' : '低气压带',
          color,
        },
      })
    }
  }
  private arrow(
    curve: THREE.Curve<THREE.Vector3>,
    color: string,
    layer: keyof Layers,
    focus: string,
    seasonal: boolean,
    extras: Partial<Flow> = {},
    phase?: number,
  ) {
    const atmosphericWind = layer === 'wind' || layer === 'monsoons'
    const geometry = createSurfaceArrowGeometry()
    geometry.userData.taperedTail = atmosphericWind
    const material = this.material(color, seasonal)
    if (atmosphericWind) material.fragmentShader = surfaceWindArrowFragment
    const flow = this.addFlow(geometry, material, layer, focus, extras)
    const length = curve.getLength()
    const ocean = layer === 'currents'
    const span = Math.min(ocean ? 0.65 : atmosphericWind ? .66 : 0.31,
      (ocean ? 0.62 : atmosphericWind ? .72 : 0.3) / Math.max(length, 0.01))
    const arrow = {
      flow,
      curve,
      progress: phase ?? (this.surfaceArrows.length * 0.381966) % 1,
      span,
      speed: layer === 'wind' || layer === 'single' || layer === 'monsoons' ? 0.32 : 0.085,
      halfWidth: ocean ? 0.012 : 0.027,
      direction: 1,
      inset: atmosphericWind ? 0 : 0.06,
    }
    this.surfaceArrows.push(arrow)
    updateSurfaceArrow(
      geometry,
      curve,
      surfaceArrowFrame(arrow.progress, span, 1, arrow.inset).start,
      span,
      1,
      R + (layer === 'monsoons' ? 0.105 : layer === 'wind' ? 0.073 : 0.06),
      arrow.halfWidth,
      arrow.inset,
      1 - arrow.inset,
    )
    return flow
  }
  private createWinds() {
    for (const def of windDefinitions) {
      for (let lon = -176; lon <= 176; lon += 40) {
        const curve = createWindCurve(def, lon, R + 0.073)
        const routePhase = (((lon + 176) / 40) * 0.13) % 1
        // Two staggered arrows per route: upstream entry overlaps downstream exit.
        for (const phase of WIND_ARROW_PHASES)
          this.arrow(curve, palette[def.kind], 'wind', `wind-${def.from}`, true, {}, (routePhase + phase) % 1)
      }
      this.labels.push({
        id: `wind-${def.from}`,
        text: def.name,
        lat: (def.from + def.to) / 2,
        lon: -130,
        radius: R + 0.09,
        color: palette[def.kind],
        layer: 'wind',
        seasonal: true,
        selection: {
          title: def.name,
          text: `近地面由高压区流向低压区，并受地转偏向力影响。${def.from > 0 ? '北半球向右偏。' : '南半球向左偏。'}`,
          tag: '盛行风带',
          color: palette[def.kind],
        },
      })
    }
  }
  private createMonsoons() {
    const crossEquatorialRoutes: {
      route: THREE.Curve<THREE.Vector3>; activeMonth: 1 | 7; sourceHemisphere: 'north' | 'south'
    }[] = []
    monsoonWinds.forEach((def, index) => {
      // Smooth the original geographic waypoints without splitting the route into
      // short pieces. A long tapered arrow can then visibly follow its curvature.
      const route = createGeographicCurve(def.points, R + .105)
      const crossEquatorial = def.crossEquatorial
      const span = Math.min(.66, .72 / Math.max(route.getLength(), .01))
      const launch = crossEquatorial ? createMonsoonLaunch(monsoonPausedPreviewPhase(
        span, monsoonDestinationAnchor(route, 0).progress,
      )) : undefined
      const surfaceMonths = crossEquatorial ? [crossEquatorial.activeMonth] : undefined
      if (crossEquatorial) crossEquatorialRoutes.push({ route, activeMonth: crossEquatorial.activeMonth,
        sourceHemisphere: crossEquatorial.destinationHemisphere === 'north' ? 'south' : 'north' })
      const color = def.color ?? (def.season === 'summer'
        ? (def.regime === 'eastAsia' ? palette.summerMonsoon : palette.southSummerMonsoon)
        : (def.regime === 'eastAsia' ? palette.winterMonsoon : palette.southWinterMonsoon))
      const count = Math.max(2, Math.ceil((route.getLength() + .72) / .95))
      for (let arrow = 0; arrow < count; arrow++) {
        const flow = this.arrow(
          route,
          color,
          'monsoons',
          `monsoon-${index}`,
          false,
          { monsoonSeason: def.season, regime: def.regime, surfaceMonths },
          launch ? 0 : (arrow / count + index * .13) % 1,
        )
        if (launch && crossEquatorial) {
          const motion = this.surfaceArrows[this.surfaceArrows.length - 1]!
          motion.monsoonLaunch = { clock: launch, ordinal: arrow, count, activeMonth: crossEquatorial.activeMonth }
          if (arrow === 0) this.monsoonLaunches.push({ clock: launch, rate: motion.speed,
            activeMonth: crossEquatorial.activeMonth, season: def.season, regime: def.regime })
          setCrossEquatorialArrowColors(flow.mesh.geometry, flow.mesh.material, palette.hadley, color, crossEquatorial.destinationHemisphere)
          const frame = surfaceArrowFrame(0, motion.span, 1, motion.inset)
          updateSurfaceArrow(flow.mesh.geometry, route, frame.start, motion.span, 1, R + .105,
            motion.halfWidth, frame.clipMin, frame.clipMax)
        }
      }
      const center = def.points[2]!
      const label = crossEquatorial ? monsoonDestinationAnchor(route, crossEquatorial.labelLatitude) : { lat: center[0], lon: center[1] }
      this.labels.push({
        id: `monsoon-${index}`,
        text: def.label ?? def.name,
        cls: crossEquatorial ? 'climate-label climate-monsoon-label' : undefined,
        lat: label.lat,
        lon: label.lon,
        radius: R + 0.14,
        layer: 'monsoons',
        color,
        seasonal: false,
        monsoonSeason: def.season,
        regime: def.regime,
        surfaceMonths,
        selection: { title: def.name, text: def.note, color, tag: '亚洲季风 · 近地面风' },
      })
    })
    // Only geographically overlapping source trade routes yield to the same air
    // continuing across the equator, and only in that destination's summer month.
    for (const arrow of this.surfaceArrows) {
      if (arrow.flow.layer !== 'wind' || !['wind--28', 'wind-28'].includes(arrow.flow.focus)) continue
      arrow.flow.replacedByCrossEquatorialMonths = [...new Set(crossEquatorialRoutes.filter(crossing =>
        overlapsMonsoonSource(arrow.curve, [crossing.route], seasonalShift(crossing.activeMonth), crossing.sourceHemisphere))
        .map(crossing => crossing.activeMonth))]
    }
  }
  private createCurrents() {
    oceanCurrents.forEach((def, index) => {
      const color = def.warm ? palette.warm : palette.cold
      const curve = createGeographicCurve(def.points, R + 0.06)
      const material = this.material(color, false)
      material.fragmentShader = currentPulseFragment
      const length = curve.getLength()
      const spacing = length / Math.max(2, Math.round(length / .72))
      Object.assign(material.uniforms, {
        travel: { value: index * .137 % spacing },
        pathLength: { value: length }, spacing: { value: spacing }, strength: { value: 1 },
      })
      const flow = this.addFlow(createCurrentLineGeometry(curve, R + .06), material, 'currents', `current-${index}`, {
        basin: def.basin, monsoon: def.monsoon, regime: def.regime,
        surfaceMonths: def.surfaceMonths,
        seasonalTemperature: def.seasonalTemperature, pulse: true,
      })
      this.glowHalo(flow, createCurrentLineGeometry(curve, R + .059, .055))
      this.currentNames.add({
        id: `current-${index}`,
        text: def.name,
        curve,
        selection: {
          title: def.name,
          text: def.note,
          tag: def.seasonLabel ?? (def.monsoon ? '季节性表层洋流' : def.warm ? '暖流' : '寒流'),
          color,
        },
      })
    })
  }
}
