// Surface layers ported from 三圈环流-self; destination palette and stage adapter only.
import * as THREE from 'three'
import { createSurfaceArrowGeometry, updateSurfaceArrow, createWindCurve, surfaceArrowFrame, WIND_ARROW_PHASES } from './surface-arrows.ts'
import { PressureField } from './PressureField.ts'
import { PressureCenterText } from './PressureCenterText.ts'
import { Sunlight } from './Sunlight.ts'
import { createGeographicCurve } from './geographic-paths.ts'
import { createCurrentLineGeometry, advancePulse, flowMotionDirection } from './flow-effects.ts'
import { contourAnchors, formatPressure, pressureCenterAnchors, pressureColors, type PressureMonth } from './pressure-data.ts'
import { flowFragment, flowVertex, pressureFragment, currentPulseFragment } from './shaders.ts'
import { damp, formatAngle, oceanCurrents, currentVisibleInMonth, monsoonWinds, monsoonStrength, seasonalDirection,
  palette, pressureDefinitions, seasonalShift, shiftLatitude, windDefinitions,
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
}
export interface ClimateLabel { text: string; x: number; y: number; visible: boolean; cls: string; color: string; opacity: number }
interface LabelAnchor {
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
  readonly sunlight = new Sunlight(R)
  private pressureText = { january: new PressureCenterText(R + .065), july: new PressureCenterText(R + .065) }
  private time = { value: 0 }
  private flows: Flow[] = []
  private labels: LabelAnchor[] = []
  private surfaceArrows: { flow: Flow; curve: THREE.Curve<THREE.Vector3>; progress: number; span: number; speed: number; halfWidth: number; direction: number; inset: number }[] = []
  private seasonalDirections: Record<SeasonalRegime, { value: number }> = {
    eastAsia: { value: 1 }, southAsia: { value: 1 }, northIndian: { value: 1 }, somali: { value: 1 },
  }

  constructor() {
    this.group.name = 'surface-climate-self'
    this.group.add(this.pressureField.mesh, this.pressureText.january.group, this.pressureText.july.group, this.sunlight.group)
    this.createPressure()
    this.createWinds()
    this.createMonsoons()
    this.createCurrents()
  }

  private enabled(layer: keyof Layers, state: ClimateState) {
    const map: Partial<Record<keyof Layers, string>> = {
      pressure: 'pressureBands', wind: 'surfaceWinds', monsoons: 'monsoonWinds',
      currents: 'oceanCurrents', pressureField: 'regionalPressureCenters', isobars: 'isobars', sunlight: 'subsolarLine',
    }
    if (layer === 'sunlight') return !!state.layers.subsolarLine
    if (state.stage === 0) return false
    if (['monsoons', 'currents', 'pressureField', 'isobars'].includes(layer) && state.stage !== 3) return false
    return !!state.layers[map[layer] ?? '']
  }

  update(dt: number, state: ClimateState) {
    this.shift.value = damp(this.shift.value, state.stage >= 2 ? seasonalShift(state.month) : 0, dt)
    this.sunlight.update(state.month, state.stage < 2, this.enabled('sunlight', state), state.playing, state.speed, dt)
    this.pressureField.summerMix.value = damp(this.pressureField.summerMix.value, state.month === 7 ? 1 : 0, dt)
    this.pressureField.fill.value = damp(this.pressureField.fill.value, this.enabled('pressureField', state) ? 1 : 0, dt)
    this.pressureField.lines.value = damp(this.pressureField.lines.value, this.enabled('isobars', state) ? 1 : 0, dt)
    this.pressureField.mesh.visible = this.pressureField.fill.value + this.pressureField.lines.value > .005
    for (const regime of Object.keys(this.seasonalDirections) as SeasonalRegime[])
      this.seasonalDirections[regime].value = damp(this.seasonalDirections[regime].value, seasonalDirection(state.month, regime), dt)
    if (state.playing) this.time.value += dt * state.speed
    for (const flow of this.flows) {
      const inSeason = currentVisibleInMonth(flow, state.month)
      const available = this.enabled(flow.layer, state) && inSeason
      const seasonOpacity = flow.monsoonSeason ? monsoonStrength(this.seasonalDirections[flow.regime!].value, flow.monsoonSeason) : 1
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
      }
    }
    for (const arrow of this.surfaceArrows) {
      if (!arrow.flow.mesh.visible) continue
      const signedSpeed = flowMotionDirection(arrow.flow, arrow.flow.regime ? this.seasonalDirections[arrow.flow.regime].value : 1)
      if (state.playing) arrow.progress = THREE.MathUtils.euclideanModulo(arrow.progress + dt * state.speed * arrow.speed * signedSpeed, 1)
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
    if (!state.layers.textAnnotations) return []
    this.group.updateWorldMatrix(true, false)
    const entries = [...this.labels]
    const solar = this.sunlight.latitude
    if (this.enabled('sunlight', state)) {
      const view = this.group.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))
      entries.unshift({ id: 'solar', text: `太阳直射纬度 · ${solar > .005 ? '北纬' : solar < -.005 ? '南纬' : ''}${formatAngle(solar)}`,
        lat: solar, lon: Math.atan2(-view.z, view.x) / rad, radius: R + .09, color: palette.solar, layer: 'sunlight', seasonal: false, selection: {} as Selection })
    }
    const mix = this.pressureField.summerMix.value
    if (this.enabled('isobars', state) && (mix < .015 || mix > .985)) {
      const month: PressureMonth = mix > .5 ? 7 : 1
      for (const anchor of contourAnchors(month)) entries.push({ ...anchor, text: formatPressure(anchor.value), radius: R + .045,
        color: pressureColors.line, layer: 'isobars', seasonal: false, selection: {} as Selection })
    }
    const visible: ClimateLabel[] = []
    const contourLimit = width < 900 ? 6 : 8
    const contourValues = new Map<string, number>()
    const visibleContours: ClimateLabel[] = []
    const planetCenter = this.group.getWorldPosition(new THREE.Vector3())
    const eye = camera.getWorldPosition(new THREE.Vector3())
    for (const label of entries) {
      if (!this.enabled(label.layer, state) || !currentVisibleInMonth(label, state.month)) continue
      const contour = label.layer === 'isobars'
      // Allow a second, well-separated annotation of the same pressure value,
      // while keeping a screen-wide budget instead of labeling every grid point.
      if (contour && (visibleContours.length >= contourLimit || (contourValues.get(label.text) ?? 0) >= 2)) continue
      const opacity = label.monsoonSeason ? monsoonStrength(this.seasonalDirections[label.regime!].value, label.monsoonSeason) : 1
      if (opacity < .03) continue
      const world = geo(label.seasonal ? shiftLatitude(label.lat, this.shift.value) : label.lat, label.lon, label.radius).applyMatrix4(this.group.matrixWorld)
      if (world.clone().sub(planetCenter).normalize().dot(eye.clone().sub(world).normalize()) < .1) continue
      const p = world.project(camera)
      if (Math.abs(p.x) > .96 || Math.abs(p.y) > .94 || p.z < -1 || p.z > 1) continue
      const x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2
      const textWidth = (text: string) => [...text].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 12 : 7), 20)
      if (visible.some(other => Math.abs(other.x - x) < (textWidth(other.text) + textWidth(label.text)) / 2 + 8 && Math.abs(other.y - y) < 29)) continue
      if (contour && visibleContours.some(other => Math.hypot((other.x - x) / 140, (other.y - y) / 85) < 1)) continue
      const color = label.seasonalTemperature
        ? new THREE.Color(palette.warm).lerp(new THREE.Color(palette.cold), (this.seasonalDirections.somali.value + 1) / 2).getStyle() : label.color
      const projected = { text: label.text, x, y, visible: true, cls: contour ? 'climate-contour-label' : 'climate-label', color, opacity }
      visible.push(projected)
      if (contour) {
        visibleContours.push(projected)
        contourValues.set(label.text, (contourValues.get(label.text) ?? 0) + 1)
      }
    }
    return visible
  }

  dispose() {
    this.pressureText.january.dispose()
    this.pressureText.july.dispose()
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
    const geometry = createSurfaceArrowGeometry()
    const flow = this.addFlow(geometry, this.material(color, seasonal), layer, focus, extras)
    const length = curve.getLength()
    const ocean = layer === 'currents'
    const span = Math.min(ocean ? 0.65 : 0.31, (ocean ? 0.62 : 0.3) / Math.max(length, 0.01))
    const arrow = {
      flow,
      curve,
      progress: phase ?? (this.surfaceArrows.length * 0.381966) % 1,
      span,
      speed: layer === 'wind' || layer === 'single' || layer === 'monsoons' ? 0.32 : 0.085,
      halfWidth: ocean ? 0.012 : 0.027,
      direction: 1,
      inset: layer === 'wind' ? 0 : 0.06,
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
    monsoonWinds.forEach((def, index) => {
      const points: THREE.Vector3[] = []
      for (let segment = 0; segment < def.points.length - 1; segment++) {
        const a = def.points[segment]!,
          b = def.points[segment + 1]!
        for (let i = 0; i < 20; i++)
          points.push(
            geo(THREE.MathUtils.lerp(a[0], b[0], i / 20), THREE.MathUtils.lerp(a[1], b[1], i / 20), R + 0.105),
          )
      }
      const end = def.points[def.points.length - 1]!
      points.push(geo(end[0], end[1], R + 0.105))
      const route = new THREE.CatmullRomCurve3(points)
      const color = def.season === 'summer'
        ? (def.regime === 'eastAsia' ? palette.summerMonsoon : palette.southSummerMonsoon)
        : (def.regime === 'eastAsia' ? palette.winterMonsoon : palette.southWinterMonsoon)
      for (let section = 0; section < 3; section++) {
        const curve = new THREE.CatmullRomCurve3(
          Array.from({ length: 24 }, (_, j) => route.getPoint((section + j / 23) / 3)),
        )
        for (const phase of WIND_ARROW_PHASES)
          this.arrow(
            curve,
            color,
            'monsoons',
            `monsoon-${index}`,
            false,
            { monsoonSeason: def.season, regime: def.regime },
            (phase + section * 0.13) % 1,
          )
      }
      const center = def.points[2]!
      this.labels.push({
        id: `monsoon-${index}`,
        text: def.name,
        lat: center[0],
        lon: center[1],
        radius: R + 0.14,
        layer: 'monsoons',
        color,
        seasonal: false,
        monsoonSeason: def.season,
        regime: def.regime,
        selection: { title: def.name, text: def.note, color, tag: '亚洲季风 · 近地面风' },
      })
    })
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
      const center = def.points[Math.floor(def.points.length / 2)]!
      this.labels.push({
        id: `current-${index}`,
        text: def.name,
        lat: center[0],
        lon: center[1],
        radius: R + 0.1,
        color,
        layer: 'currents',
        seasonal: false,
        basin: def.basin,
        regime: def.regime,
        surfaceMonths: def.surfaceMonths,
        seasonalTemperature: def.seasonalTemperature,
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
