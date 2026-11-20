import * as THREE from 'three'
import type { Selection } from './model.ts'

export interface CurrentNameRoute {
  id: string
  text: string
  curve: THREE.Curve<THREE.Vector3>
  selection?: Selection
}
export interface CurrentNameState {
  id: string
  visible: boolean
  opacity: number
  direction: number
  color: THREE.Color
}
export interface ActiveCurrentName {
  readonly id: string
  readonly text: string
  readonly direction: number
  readonly readingDirection: number
  readonly layout: 'horizontal' | 'vertical'
  readonly anchor: number
  readonly width: number
  readonly height: number
  readonly curve: THREE.Curve<THREE.Vector3>
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  readonly screenBounds?: Readonly<TextBounds>
}
export interface TextBounds { left: number; right: number; top: number; bottom: number }
interface TextCandidate { anchor: number; width: number; height: number; positions: Float32Array; bend: number; gentle: boolean }
interface TextPatch {
  canvas: HTMLCanvasElement
  advances: number[]
  texture: THREE.CanvasTexture
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  direction: number
  width: number
  height: number
  candidates: TextCandidate[]
  candidateIndex: number
  layout: 'horizontal' | 'vertical'
}
interface RouteEntry { route: CurrentNameRoute; length: number; patch?: TextPatch }

const PATCH_HEIGHT = .18

/** Shared bounds for transparent text meshes, including their real zoomed size. */
export function projectTextPatchBounds(mesh: THREE.Mesh, camera: THREE.Camera, width: number, height: number, padding = 0): TextBounds {
  mesh.updateWorldMatrix(true, false)
  const positions = mesh.geometry.getAttribute('position'), point = new THREE.Vector3()
  const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera)
    const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2
    bounds.left = Math.min(bounds.left, x - padding); bounds.right = Math.max(bounds.right, x + padding)
    bounds.top = Math.min(bounds.top, y - padding); bounds.bottom = Math.max(bounds.bottom, y + padding)
  }
  return bounds
}

/** A geographic text ribbon, not a camera-facing label or a moving particle. */
export class CurrentNameText {
  readonly group = new THREE.Group()
  private routes = new Map<string, RouteEntry>()
  private activePatches: ActiveCurrentName[] = []
  private retainedIds: string[] = []

  constructor(private radius: number) {
    this.group.name = 'current-name-text-patches'
    this.group.visible = false
  }

  get active(): readonly ActiveCurrentName[] { return this.activePatches }

  add(route: CurrentNameRoute) {
    this.routes.set(route.id, { route, length: route.curve.getLength() })
  }

  hide() {
    this.group.visible = false
    for (const entry of this.routes.values()) if (entry.patch) entry.patch.mesh.visible = false
    this.activePatches = []
  }

  private createPatch(entry: RouteEntry): TextPatch {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = '500 58px "Microsoft YaHei", sans-serif'
    // A little inter-character room also works for upright vertical Chinese type.
    // Both layouts use exactly the same atlas and geometric dimensions.
    const advances = [...entry.route.text].map(char => Math.max(58, ctx.measureText(char).width) * 1.08)
    canvas.width = Math.ceil(advances.reduce((sum, advance) => sum + advance, 0) + 28)
    canvas.height = 96
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 64, 6), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthTest: true, depthWrite: false,
      side: THREE.FrontSide, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }))
    mesh.name = `current-name-${entry.route.id}`
    mesh.renderOrder = 4
    mesh.userData.selection = entry.route.selection
    const naturalWidth = canvas.width / canvas.height * PATCH_HEIGHT
    // Short routes scale both axes together: do not squeeze wide names sideways.
    // Long circumglobal currents still receive one compact name, not a giant band.
    const width = Math.min(naturalWidth, entry.length * .9, 1.15)
    const patch: TextPatch = { canvas, advances, texture, mesh, direction: 0, width, height: PATCH_HEIGHT * Math.min(1, width / naturalWidth),
      candidates: [], candidateIndex: -1, layout: 'horizontal' }
    this.paintText(entry, patch, 'horizontal')
    // First prefer a gentle section of the actual current. A U-shaped return flow
    // must not bend the entire name into a U, even if its triangles are not inverted.
    for (const anchor of [.5, .35, .65, .2, .8]) for (const side of [1, -1]) {
      const candidate = this.createCandidate(entry, mesh.geometry, width, patch.height, anchor, side, false)
      if (candidate && !patch.candidates.some(other => Math.abs(other.anchor - candidate.anchor) < .001 &&
        Math.abs(other.positions[0]! - candidate.positions[0]!) < .001)) patch.candidates.push(candidate)
    }
    patch.candidates.sort((a, b) => a.bend + Math.abs(a.anchor - .5) * .2 - b.bend - Math.abs(b.anchor - .5) * .2)
    // Adjacent, mildly curved lettering is a readable fallback for short hairpins
    // and crowded labels. It uses the local route heading but never changes the flow.
    for (const anchor of [.2, .5, .8]) for (const side of [1, -1]) {
      const candidate = this.createCandidate(entry, mesh.geometry, width, patch.height, anchor, side, true)
      if (candidate) patch.candidates.push(candidate)
    }
    this.group.add(mesh)
    entry.patch = patch
    return patch
  }

  private paintText(entry: RouteEntry, patch: TextPatch, layout: 'horizontal' | 'vertical') {
    const ctx = patch.canvas.getContext('2d')!
    ctx.clearRect(0, 0, patch.canvas.width, patch.canvas.height)
    ctx.font = '500 58px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 7
    ctx.strokeStyle = 'rgba(7, 17, 28, .94)'
    ctx.shadowColor = 'rgba(3, 11, 23, .75)'
    ctx.shadowBlur = 3
    // Tint via the material, so seasonal color changes do not redraw the atlas.
    ctx.fillStyle = '#ffffff'
    let x = 14
    for (const [index, char] of [...entry.route.text].entries()) {
      const advance = patch.advances[index]!, center = x + advance / 2
      if (layout === 'vertical') {
        // Geometry's u direction now reads down the screen. Counter-rotate each
        // individual glyph, not the entire word; the characters remain upright.
        ctx.save()
        ctx.translate(center, 48)
        ctx.rotate(-Math.PI / 2)
        ctx.strokeText(char, 0, 0)
        ctx.fillText(char, 0, 0)
        ctx.restore()
      } else {
        ctx.strokeText(char, center, 48)
        ctx.fillText(char, center, 48)
      }
      x += advance
    }
    patch.layout = layout
    patch.texture.needsUpdate = true
  }

  private createCandidate(entry: RouteEntry, geometry: THREE.PlaneGeometry, width: number, height: number, anchor: number, side: number, gentle: boolean): TextCandidate | undefined {
    const uv = geometry.getAttribute('uv'), positions = new Float32Array(uv.count * 3)
    const halfSpan = width / entry.length / 2
    if (!gentle) anchor = THREE.MathUtils.clamp(anchor, halfSpan + .005, 1 - halfSpan - .005)
    const baseNormal = entry.route.curve.getPointAt(anchor).normalize()
    const baseTangent = entry.route.curve.getTangentAt(anchor)
      .addScaledVector(baseNormal, -entry.route.curve.getTangentAt(anchor).dot(baseNormal)).normalize()
    const baseLateral = new THREE.Vector3().crossVectors(baseNormal, baseTangent).normalize()
    const before = entry.route.curve.getTangentAt(Math.max(0, anchor - halfSpan * .5))
    const after = entry.route.curve.getTangentAt(Math.min(1, anchor + halfSpan * .5))
    const headingChange = Math.atan2(after.dot(baseLateral), after.dot(baseTangent)) - Math.atan2(before.dot(baseLateral), before.dot(baseTangent))
    const curvature = THREE.MathUtils.clamp(headingChange / Math.max(.01, width / 2), -.5 / width, .5 / width)
    const normal = new THREE.Vector3(), tangent = new THREE.Vector3(), lateral = new THREE.Vector3()
    const point = new THREE.Vector3()
    for (let i = 0; i < uv.count; i++) {
      const u = anchor + (uv.getX(i) - .5) * width / entry.length
      if (gentle) {
        const distance = (uv.getX(i) - .5) * width
        normal.copy(baseNormal).multiplyScalar(this.radius).addScaledVector(baseTangent, distance)
          .addScaledVector(baseLateral, curvature * distance * distance / 2).normalize()
        tangent.copy(baseTangent).addScaledVector(baseLateral, curvature * distance)
      } else {
        entry.route.curve.getPointAt(u, normal).normalize()
        entry.route.curve.getTangentAt(u, tangent)
      }
      tangent.addScaledVector(normal, -tangent.dot(normal)).normalize()
      lateral.crossVectors(normal, tangent).normalize()
      const offset = side * (.035 + height / 2) + (uv.getY(i) - .5) * height
      point.copy(normal).multiplyScalar(this.radius).addScaledVector(lateral, offset).normalize().multiplyScalar(this.radius)
      point.toArray(positions, i * 3)
    }
    const indices = geometry.index!, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    for (let i = 0; i < indices.count; i += 3) {
      a.fromArray(positions, indices.getX(i) * 3)
      b.fromArray(positions, indices.getX(i + 1) * 3).sub(a)
      c.fromArray(positions, indices.getX(i + 2) * 3).sub(a)
      if (b.cross(c).dot(a) <= 0) return undefined
    }
    // Measure heading changes in the anchor's tangent plane, excluding the globe's
    // ordinary spherical curvature. Reject curls and compressed/widened glyph spans.
    let bend = 0, previousHeading: number | undefined
    for (let col = 1; col <= 64; col++) {
      a.fromArray(positions, (3 * 65 + col - 1) * 3)
      b.fromArray(positions, (3 * 65 + col) * 3).sub(a)
      const stepLength = b.length() / (width / 64)
      if (stepLength < .68 || stepLength > 1.38) return undefined
      const heading = Math.atan2(b.dot(baseLateral), b.dot(baseTangent))
      if (previousHeading !== undefined) {
        const delta = Math.abs(Math.atan2(Math.sin(heading - previousHeading), Math.cos(heading - previousHeading)))
        if (delta > .065) return undefined
        bend += delta
      }
      previousHeading = heading
    }
    if (bend > .72) return undefined
    return { anchor, width, height, positions, bend, gentle }
  }

  private fitRoute(entry: RouteEntry, patch: TextPatch, direction: number, candidateIndex = Math.max(0, patch.candidateIndex)) {
    const candidate = patch.candidates[candidateIndex]
    if (!candidate) return
    const positions = patch.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < positions.count; i++) {
      // Reverse BOTH UV axes for a 180-degree turn: same front face, no mirror text.
      const source = (direction > 0 ? i : positions.count - 1 - i) * 3
      positions.setXYZ(i, candidate.positions[source]!, candidate.positions[source + 1]!, candidate.positions[source + 2]!)
    }
    positions.needsUpdate = true
    patch.mesh.geometry.computeVertexNormals()
    patch.mesh.geometry.computeBoundingSphere()
    patch.direction = direction
    patch.width = candidate.width
    patch.height = candidate.height
    patch.candidateIndex = candidateIndex
    patch.mesh.userData.currentName = { id: entry.route.id, text: entry.route.text, readingDirection: direction, anchor: candidate.anchor }
  }

  update(states: readonly CurrentNameState[]) {
    this.hide()
    for (const state of states) {
      const entry = this.routes.get(state.id)
      if (!entry || !state.visible || state.opacity < .006) continue
      const patch = entry.patch ?? this.createPatch(entry)
      if (!patch.candidates.length) continue
      const direction = Math.abs(state.direction) > .035 ? Math.sign(state.direction) : 0
      if (!patch.direction) this.fitRoute(entry, patch, 1)
      patch.mesh.material.color.copy(state.color)
      patch.mesh.material.opacity = state.opacity
      patch.mesh.visible = true
      this.activePatches.push({ id: entry.route.id, text: entry.route.text, direction, readingDirection: patch.direction, layout: patch.layout,
        anchor: patch.candidates[patch.candidateIndex]!.anchor,
        width: patch.width, height: patch.height, curve: entry.route.curve, mesh: patch.mesh })
    }
    this.group.visible = this.activePatches.length > 0
  }

  orientForCamera(camera: THREE.Camera, width = 1200, height = 750, excluded: readonly TextBounds[] = []) {
    this.group.updateWorldMatrix(true, false)
    const retained = new Set(this.retainedIds)
    const eye = camera.getWorldPosition(new THREE.Vector3()), center = this.group.getWorldPosition(new THREE.Vector3())
    const point = new THREE.Vector3(), normal = new THREE.Vector3(), view = new THREE.Vector3()
    const toScreen = (positions: Float32Array, index: number, result: THREE.Vector3) =>
      result.fromArray(positions, index * 3).applyMatrix4(this.group.matrixWorld).project(camera)
    const projected = this.activePatches.map(active => {
      const patch = this.routes.get(active.id)!.patch!
      const options = patch.candidates.map((candidate, index) => {
        point.fromArray(candidate.positions, Math.floor(candidate.positions.length / 6) * 3).applyMatrix4(this.group.matrixWorld)
        const facing = normal.copy(point).sub(center).normalize().dot(view.copy(eye).sub(point).normalize())
        if (facing < (retained.has(active.id) ? .055 : .13)) return undefined
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
        for (let i = 0; i < candidate.positions.length / 3; i++) {
          toScreen(candidate.positions, i, point)
          if (point.z < -1 || point.z > 1) return undefined
          const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2
          bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x)
          bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y)
        }
        if (bounds.left < 8 || bounds.right > width - 8 || bounds.top < 8 || bounds.bottom > height - 8) return undefined
        // First row has 65 vertices; use the center row's u=.25/.75 baseline.
        const a = toScreen(candidate.positions, 3 * 65 + 16, new THREE.Vector3())
        const b = toScreen(candidate.positions, 3 * 65 + 48, new THREE.Vector3())
        const dx = (b.x - a.x) * width, dy = -(b.y - a.y) * height
        const length = Math.hypot(dx, dy)
        const verticalRatio = Math.abs(dy) / Math.max(.001, length)
        // Different enter/leave thresholds prevent layout flicker as the globe
        // turns through a diagonal heading. Vertical names always read top-down.
        const layout: 'horizontal' | 'vertical' = patch.layout === 'vertical'
          ? verticalRatio < Math.sin(48 * Math.PI / 180) ? 'horizontal' : 'vertical'
          : verticalRatio > Math.sin(62 * Math.PI / 180) ? 'vertical' : 'horizontal'
        let reading = patch.direction
        const readingAxis = layout === 'vertical' ? dy : dx
        if (readingAxis * reading < -.12 * length) reading *= -1
        return { index, bounds, facing, reading, layout }
      }).filter(option => option !== undefined)
      options.sort((a, b) => Number(b.index === patch.candidateIndex) - Number(a.index === patch.candidateIndex) || a.index - b.index)
      return { active, patch, options }
    })
    const order = new Map(this.retainedIds.map((id, index) => [id, index]))
    projected.sort((a, b) => Number(retained.has(b.active.id)) - Number(retained.has(a.active.id)) ||
      (retained.has(a.active.id) ? order.get(a.active.id)! - order.get(b.active.id)! :
        (b.options[0]?.facing ?? 0) - (a.options[0]?.facing ?? 0) || a.active.id.localeCompare(b.active.id)))
    const shown: ActiveCurrentName[] = [], occupied: TextBounds[] = [...excluded]
    for (const { active, patch, options } of projected) {
      patch.mesh.visible = false
      for (const option of options) {
        const bounds = option.bounds
        const gap = retained.has(active.id) && option.index === patch.candidateIndex ? 3 : 8
        if (occupied.some(other => bounds.left < other.right + gap && bounds.right > other.left - gap &&
          bounds.top < other.bottom + gap && bounds.bottom > other.top - gap)) continue
        const entry = this.routes.get(active.id)!
        if (patch.direction !== option.reading || patch.candidateIndex !== option.index)
          this.fitRoute(entry, patch, option.reading, option.index)
        if (patch.layout !== option.layout) this.paintText(entry, patch, option.layout)
        patch.mesh.visible = true
        occupied.push(bounds)
        shown.push({ ...active, readingDirection: patch.direction, layout: patch.layout, anchor: patch.candidates[patch.candidateIndex]!.anchor,
          width: patch.width, height: patch.height, screenBounds: bounds })
        break
      }
    }
    this.activePatches = shown
    this.retainedIds = shown.map(patch => patch.id)
    this.group.visible = shown.length > 0
  }

  // Geometry/material disposal belongs to the parent scene traversal.
  dispose() {
    this.hide()
    for (const entry of this.routes.values()) entry.patch?.texture.dispose()
    this.routes.clear()
  }
}
