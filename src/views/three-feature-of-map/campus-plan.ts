import type { Coordinate, FeatureKind } from './map-lesson'
import { CAMPUS_RADIUS, builderCatalog, builderItemToFeature, getBuilderSpec, type BuilderItem, type BuilderPoint } from './campus-builder-data'

export type CampusPlanOptions = { items: readonly BuilderItem[]; title: string; origin: Coordinate }

type PlanStyle = { fill: string; stroke: string; glyph?: string }
const styles: Partial<Record<FeatureKind, PlanStyle>> = {
  'teaching-building': { fill: '#edb39e', stroke: '#9c4f3e' },
  laboratory: { fill: '#b0dfe8', stroke: '#377c96' },
  library: { fill: '#d6c7ea', stroke: '#795b9f' },
  administration: { fill: '#c3ddcf', stroke: '#4f8272' },
  dormitory: { fill: '#f1d5a6', stroke: '#ab7951' },
  canteen: { fill: '#f7d699', stroke: '#b47733' },
  toilet: { fill: '#dce9db', stroke: '#5a8576', glyph: 'WC' },
  infirmary: { fill: '#fce6dc', stroke: '#bc6c68' },
  'sports-field': { fill: '#b9715d', stroke: '#975441' },
  gymnasium: { fill: '#b2d6d7', stroke: '#558a94' },
  'basketball-court': { fill: '#e1a879', stroke: '#975f42' },
  plaza: { fill: '#e7ddc7', stroke: '#ad9c7c' },
  'campus-gate': { fill: '#e9cab2', stroke: '#986952' },
  'campus-road': { fill: '#88959b', stroke: '#627379' },
  footpath: { fill: '#e8d4a4', stroke: '#bfa46f' },
  parking: { fill: '#c2cdd2', stroke: '#627b8b', glyph: 'P' },
  'bus-stop': { fill: '#b8dacf', stroke: '#528b7b', glyph: '站' },
  'campus-fence': { fill: '#b3a596', stroke: '#746b62' },
  'green-space': { fill: '#c6dfab', stroke: '#80a365' },
  tree: { fill: '#92be7c', stroke: '#568156' },
  'campus-water': { fill: '#9eddec', stroke: '#3e9dbb' },
}
const fontFamily = '"Microsoft YaHei", "PingFang SC", sans-serif'
const ink = '#294349'
const muted = '#668087'
const tau = Math.PI * 2
const mapCenter = { x: 555, y: 554 }
const mapRadius = 395
const pixelsPerMetre = mapRadius / CAMPUS_RADIUS

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 20, color = ink, weight = 400, align: CanvasTextAlign = 'left') {
  ctx.font = `${weight} ${size}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(value, x, y)
}

function fittedText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, size = 20, color = ink, weight = 400) {
  ctx.font = `${weight} ${size}px ${fontFamily}`
  let label = value
  while (label.length && ctx.measureText(label).width > maxWidth) label = label.slice(0, -1)
  if (label !== value) {
    while (label.length && ctx.measureText(`${label}…`).width > maxWidth) label = label.slice(0, -1)
    label += '…'
  }
  text(ctx, label, x, y, size, color, weight)
}

function indexedName(ctx: CanvasRenderingContext2D, value: string, x: number, y: number) {
  ctx.font = `400 17px ${fontFamily}`
  const lines: string[] = []
  let current = ''
  for (const character of value) {
    if (current && ctx.measureText(current + character).width > 325) {
      lines.push(current)
      current = character
    } else current += character
  }
  if (current) lines.push(current)
  lines.forEach((label, index) => text(ctx, label, x, y + index * 20 - (lines.length > 1 ? 7 : 0), 17))
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly BuilderPoint[], close = true) {
  ctx.beginPath()
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.z) : ctx.moveTo(point.x, point.z))
  if (close) ctx.closePath()
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string, stroke?: string, width = 1) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, tau)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.stroke()
  }
}

function drawTree(ctx: CanvasRenderingContext2D, width: number, depth: number, variant = false) {
  ctx.save()
  ctx.scale(width / 10, depth / 10)
  ctx.beginPath()
  for (let i = 0; i < 72; i++) {
    const angle = i / 72 * tau
    const radius = 4.25 + 0.5 * Math.cos(angle * 7)
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = variant ? '#a7c98b' : '#92be7c'
  ctx.strokeStyle = '#568156'
  ctx.lineWidth = 0.45
  ctx.fill()
  ctx.stroke()
  circle(ctx, 0, 0, 1.35, '#bada9c')
  ctx.restore()
}

/** Interior marks remain attached to each object's local axes, including after rotation. */
function drawInterior(ctx: CanvasRenderingContext2D, item: BuilderItem) {
  const w = item.width, d = item.depth
  const style = styles[item.kind]!
  const unit = Math.min(w, d)
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = 0.7
  if (style.glyph) {
    text(ctx, style.glyph, 0, 0, unit * (item.kind === 'toilet' ? 0.43 : 0.58), style.stroke, 700, 'center')
    return
  }
  switch (item.kind) {
    case 'teaching-building':
      line(ctx, -w * 0.41, 0, w * 0.41, 0, style.stroke, 0.9)
      line(ctx, -w * 0.5, -d * 0.5, -w * 0.32, 0, style.stroke, 0.65)
      line(ctx, -w * 0.5, d * 0.5, -w * 0.32, 0, style.stroke, 0.65)
      line(ctx, w * 0.5, -d * 0.5, w * 0.32, 0, style.stroke, 0.65)
      line(ctx, w * 0.5, d * 0.5, w * 0.32, 0, style.stroke, 0.65)
      break
    case 'laboratory':
      for (let x = -w * 0.3; x <= w * 0.31; x += w * 0.2) line(ctx, x, -d * 0.32, x, d * 0.32, '#eaf9fc', 1.2)
      line(ctx, -w * 0.4, 0, w * 0.4, 0, '#eaf9fc', 1.2)
      break
    case 'library': {
      const a = unit * 0.33, h = unit * 0.26
      polygon(ctx, [{ x: -a, z: -h }, { x: 0, z: -h * 0.6 }, { x: a, z: -h }, { x: a, z: h }, { x: 0, z: h * 1.25 }, { x: -a, z: h }])
      ctx.fillStyle = '#fffcf0'
      ctx.fill()
      ctx.stroke()
      line(ctx, 0, -h * 0.6, 0, h * 1.25, style.stroke, 0.6)
      break
    }
    case 'administration':
      circle(ctx, 0, 0, unit * 0.31, '#fffbed', style.stroke, 0.7)
      line(ctx, 0, -unit * 0.21, 0, 0, style.stroke, 0.8)
      line(ctx, 0, 0, unit * 0.15, unit * 0.1, style.stroke, 0.8)
      break
    case 'dormitory':
      for (const y of [-d * 0.27, d * 0.27]) {
        line(ctx, -w * 0.44, y, w * 0.44, y, style.stroke, 0.7)
        for (let x = -w * 0.35; x <= w * 0.4; x += w * 0.14) line(ctx, x, y - d * 0.1, x, y + d * 0.1, style.stroke, 0.6)
      }
      break
    case 'canteen':
      circle(ctx, 0, 0, unit * 0.26, '#fff5d6', style.stroke, 0.7)
      circle(ctx, 0, 0, unit * 0.17, '#fff5d6', style.stroke, 0.45)
      line(ctx, -unit * 0.38, -unit * 0.25, -unit * 0.38, unit * 0.25, style.stroke, 0.9)
      line(ctx, unit * 0.38, -unit * 0.25, unit * 0.38, unit * 0.25, style.stroke, 0.9)
      break
    case 'infirmary':
      ctx.fillStyle = '#c97270'
      ctx.fillRect(-unit * 0.1, -unit * 0.32, unit * 0.2, unit * 0.64)
      ctx.fillRect(-unit * 0.32, -unit * 0.1, unit * 0.64, unit * 0.2)
      break
    case 'sports-field': {
      const horizontal = w >= d
      ctx.save()
      if (!horizontal) ctx.rotate(Math.PI / 2)
      const length = Math.max(w, d), breadth = Math.min(w, d)
      const radius = breadth * 0.37, straight = (length - breadth) / 2
      for (let lane = 0; lane < 3; lane++) {
        const r = radius + lane * breadth * 0.04
        ctx.beginPath()
        ctx.arc(straight, 0, r, -Math.PI / 2, Math.PI / 2)
        ctx.arc(-straight, 0, r, Math.PI / 2, Math.PI * 1.5)
        ctx.closePath()
        if (!lane) { ctx.fillStyle = '#8fbf8f'; ctx.fill() }
        ctx.strokeStyle = '#fff4df'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      const fw = length * 0.45, fd = breadth * 0.52
      ctx.strokeStyle = '#e8f8de'
      ctx.strokeRect(-fw / 2, -fd / 2, fw, fd)
      line(ctx, 0, -fd / 2, 0, fd / 2, '#e8f8de', 0.5)
      ctx.beginPath(); ctx.arc(0, 0, breadth * 0.11, 0, tau); ctx.stroke()
      ctx.restore()
      break
    }
    case 'gymnasium':
      for (let x = -w * 0.32; x <= w * 0.33; x += w * 0.16) {
        ctx.beginPath(); ctx.ellipse(x, 0, w * 0.04, d * 0.4, 0, 0, tau)
        ctx.strokeStyle = '#e3f5f1'; ctx.lineWidth = 0.8; ctx.stroke()
      }
      break
    case 'basketball-court':
      ctx.strokeStyle = '#fff9e4'; ctx.lineWidth = 0.5
      ctx.strokeRect(-w * 0.44, -d * 0.4, w * 0.88, d * 0.8)
      ctx.strokeRect(-w * 0.44, -d * 0.22, w * 0.18, d * 0.44)
      ctx.strokeRect(w * 0.26, -d * 0.22, w * 0.18, d * 0.44)
      ctx.beginPath(); ctx.arc(0, 0, unit * 0.17, 0, tau); ctx.stroke()
      line(ctx, 0, -d * 0.4, 0, d * 0.4, '#fff9e4', 0.5)
      break
    case 'plaza':
      for (let x = -w / 2; x < w / 2; x += Math.max(3, w / 6)) line(ctx, x, -d / 2, x, d / 2, '#c9baa0', 0.4)
      for (let y = -d / 2; y < d / 2; y += Math.max(3, d / 6)) line(ctx, -w / 2, y, w / 2, y, '#c9baa0', 0.4)
      circle(ctx, 0, 0, unit * 0.16, '#f7eedb', '#af9b7e', 0.5)
      line(ctx, 0, 0, 0, -unit * 0.26, '#6b7880', 0.65)
      polygon(ctx, [{ x: 0, z: -unit * 0.26 }, { x: unit * 0.23, z: -unit * 0.2 }, { x: unit * 0.23, z: -unit * 0.08 }, { x: 0, z: -unit * 0.13 }])
      ctx.fillStyle = '#d84547'; ctx.fill()
      break
    case 'campus-gate':
      ctx.fillStyle = '#a87359'
      ctx.fillRect(-w * 0.48, -d * 0.45, w * 0.13, d * 0.9)
      ctx.fillRect(w * 0.35, -d * 0.45, w * 0.13, d * 0.9)
      line(ctx, -w * 0.35, 0, w * 0.35, 0, '#775e52', 0.6)
      for (let x = -w * 0.3; x <= w * 0.31; x += w * 0.1) line(ctx, x, -d * 0.22, x, d * 0.22, '#775e52', 0.45)
      break
    case 'green-space':
      for (const [x, y, ratio] of [[-0.26, -0.2, 0.23], [0.2, 0.15, 0.29], [0.26, -0.28, 0.2], [-0.3, 0.3, 0.15]]) {
        ctx.save(); ctx.translate(w * x!, d * y!); drawTree(ctx, unit * ratio! * 2, unit * ratio! * 2, x! > 0); ctx.restore()
      }
      break
    case 'campus-water':
      for (let y = -d * 0.4; y <= d * 0.4; y += Math.max(3, d / 5)) {
        ctx.beginPath()
        for (let x = -w / 2; x <= w / 2; x += w / 48) {
          const py = y + Math.sin(x / Math.max(2, w * 0.1) + y) * Math.min(0.7, d * 0.025)
          if (x === -w / 2) ctx.moveTo(x, py)
          else ctx.lineTo(x, py)
        }
        ctx.strokeStyle = '#e5faff'; ctx.lineWidth = 0.65; ctx.stroke()
      }
      break
  }
}

function drawObject(ctx: CanvasRenderingContext2D, item: BuilderItem) {
  const style = styles[item.kind]
  if (!style) return
  const feature = builderItemToFeature(item)
  ctx.save()
  if (getBuilderSpec(item.kind).mode === 'line') {
    polygon(ctx, feature.points, false)
    ctx.strokeStyle = style.stroke
    ctx.lineWidth = item.width
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    if (item.width > 0.65) {
      ctx.strokeStyle = style.fill
      ctx.lineWidth = Math.max(item.width * 0.55, item.width - 0.65)
      ctx.stroke()
    }
    if (item.kind === 'campus-road') {
      ctx.setLineDash([3, 2.5])
      ctx.lineWidth = Math.min(0.4, item.width * 0.1)
      ctx.strokeStyle = '#fff2b8'; ctx.stroke()
    } else if (item.kind === 'footpath') {
      ctx.setLineDash([0.4, 2.2]); ctx.lineWidth = item.width * 0.78
      ctx.strokeStyle = '#bba77f'; ctx.stroke()
    } else {
      ctx.setLineDash([0.6, 3]); ctx.lineWidth = item.width * 1.7
      ctx.strokeStyle = style.stroke; ctx.stroke()
    }
    ctx.restore()
    return
  }
  if (item.kind === 'tree') {
    ctx.translate(item.x, item.z)
    ctx.rotate(-item.rotation * Math.PI / 180)
    drawTree(ctx, item.width, item.depth)
    ctx.restore()
    return
  }
  polygon(ctx, feature.points)
  ctx.fillStyle = style.fill
  ctx.fill()
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = Math.min(0.8, Math.min(item.width, item.depth) * 0.06)
  ctx.stroke()
  ctx.clip()
  ctx.translate(item.x, item.z)
  ctx.rotate(-item.rotation * Math.PI / 180)
  drawInterior(ctx, item)
  ctx.restore()
}

function layerOrder(item: BuilderItem) {
  if (item.kind === 'green-space') return 0
  if (item.kind === 'campus-water') return 1
  if (item.kind === 'plaza' || item.kind === 'parking' || item.kind === 'sports-field' || item.kind === 'basketball-court') return 2
  if (item.kind === 'campus-road') return 3
  if (item.kind === 'footpath') return 4
  if (item.kind === 'campus-fence') return 5
  if (item.kind === 'tree') return 7
  return 6
}

function drawNumber(ctx: CanvasRenderingContext2D, number: number, x: number, y: number, small = false) {
  const r = small ? 11 : 14
  circle(ctx, x, y, r, '#fffef7', '#36575e', 1.5)
  text(ctx, String(number), x, y + 0.5, small ? 12 : number >= 100 ? 13 : 15, ink, 700, 'center')
}

type PlanPoint = { x: number; y: number }
type LabelObstacle = { points: PlanPoint[]; closed: boolean; padding: number; minX: number; minY: number; maxX: number; maxY: number }

function labelObstacle(item: BuilderItem): LabelObstacle {
  const feature = builderItemToFeature(item)
  const closed = getBuilderSpec(item.kind).mode !== 'line'
  let worldPoints = feature.points
  if (item.kind === 'tree') {
    const radians = item.rotation * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians)
    worldPoints = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => ({
      x: item.x + x! * item.width / 2 * c + z! * item.depth / 2 * s,
      z: item.z - x! * item.width / 2 * s + z! * item.depth / 2 * c,
    }))
  }
  const points = worldPoints.map(point => ({ x: mapCenter.x + point.x * pixelsPerMetre, y: mapCenter.y + point.z * pixelsPerMetre }))
  return { points, closed, padding: closed ? 0 : item.width * pixelsPerMetre / 2,
    minX: Math.min(...points.map(point => point.x)), minY: Math.min(...points.map(point => point.y)),
    maxX: Math.max(...points.map(point => point.x)), maxY: Math.max(...points.map(point => point.y)),
  }
}

function closestOnSegment(point: PlanPoint, a: PlanPoint, b: PlanPoint): PlanPoint {
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0
  return { x: a.x + t * dx, y: a.y + t * dy }
}

function closestOnOutline(point: PlanPoint, obstacle: LabelObstacle): PlanPoint {
  let closest = obstacle.points[0] ?? point, distance = Infinity
  const count = obstacle.closed ? obstacle.points.length : obstacle.points.length - 1
  for (let i = 0; i < count; i++) {
    const candidate = closestOnSegment(point, obstacle.points[i]!, obstacle.points[(i + 1) % obstacle.points.length]!)
    const nextDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y)
    if (nextDistance < distance) { closest = candidate; distance = nextDistance }
  }
  return closest
}

function badgeTouchesObject(point: PlanPoint, obstacle: LabelObstacle) {
  const clearance = 18 + obstacle.padding
  if (point.x < obstacle.minX - clearance || point.x > obstacle.maxX + clearance || point.y < obstacle.minY - clearance || point.y > obstacle.maxY + clearance) return false
  if (obstacle.closed) {
    let inside = false
    for (let i = 0, j = obstacle.points.length - 1; i < obstacle.points.length; j = i++) {
      const a = obstacle.points[i]!, b = obstacle.points[j]!
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    if (inside) return true
  }
  const boundary = closestOnOutline(point, obstacle)
  return Math.hypot(point.x - boundary.x, point.y - boundary.y) < clearance
}

function drawMapNumbers(ctx: CanvasRenderingContext2D, items: readonly BuilderItem[]) {
  const used: PlanPoint[] = []
  const obstacles = items.map(labelObstacle)
  const labels: { anchor: PlanPoint; position: PlanPoint; number: number }[] = []
  items.forEach((item, index) => {
    const feature = builderItemToFeature(item)
    const center = getBuilderSpec(item.kind).mode === 'line' && feature.points.length > 1
      ? lineMidpoint(feature.points) : feature.center
    const anchor = { x: mapCenter.x + center.x * pixelsPerMetre, y: mapCenter.y + center.z * pixelsPerMetre }
    let position: PlanPoint | undefined
    // Search the nearest empty space, including a full badge radius around each symbol.
    // If a very full campus leaves no free ground, protect small symbols and this object's
    // outline first; a callout may then sit on another broad grass/sports surface.
    for (let pass = 0; pass < 2 && !position; pass++) {
      const protectedObstacles = pass ? obstacles.filter((obstacle, objectIndex) => objectIndex === index
        || (obstacle.maxX - obstacle.minX <= 100 && obstacle.maxY - obstacle.minY <= 100)) : obstacles
      for (let step = 1; step < 5000; step++) {
        const angle = step * 2.399963229728653, radius = Math.sqrt(step) * 9
        const candidate = { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius }
        if (candidate.x < 110 || candidate.x > 1020 || candidate.y < 178 || candidate.y > 932 || (candidate.x > 974 && candidate.y < 298)) continue
        if (used.some(point => Math.hypot(point.x - candidate.x, point.y - candidate.y) < 33)) continue
        if (protectedObstacles.some(obstacle => badgeTouchesObject(candidate, obstacle))) continue
        position = candidate
        break
      }
    }
    // Valid campus objects leave margins outside the grass disk, so this is only a guard
    // for externally supplied geometry that exceeds the builder's placement bounds.
    position ??= { x: 110 + index % 28 * 33, y: 178 + Math.floor(index / 28) * 33 }
    used.push(position)
    const obstacle = obstacles[index]!
    const edge = closestOnOutline(position, obstacle)
    const distance = Math.hypot(position.x - edge.x, position.y - edge.y) || 1
    const offset = obstacle.padding + 1
    const edgeAnchor = { x: edge.x + (position.x - edge.x) / distance * offset, y: edge.y + (position.y - edge.y) / distance * offset }
    labels.push({ anchor: edgeAnchor, position, number: index + 1 })
  })
  labels.forEach(({ anchor, position }) => {
    line(ctx, anchor.x, anchor.y, position.x, position.y, '#53737b', 1.1)
    circle(ctx, anchor.x, anchor.y, 1.8, '#36575e')
  })
  labels.forEach(({ number, position }) => drawNumber(ctx, number, position.x, position.y))
}

function lineMidpoint(points: readonly BuilderPoint[]): BuilderPoint {
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z)
  let remaining = total / 2
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    if (remaining <= length && length > 0) return { x: a.x + (b.x - a.x) * remaining / length, z: a.z + (b.z - a.z) * remaining / length }
    remaining -= length
  }
  return points[0] ?? { x: 0, z: 0 }
}

function drawLegendSymbol(ctx: CanvasRenderingContext2D, kind: FeatureKind, x: number, y: number) {
  const spec = getBuilderSpec(kind)
  ctx.save()
  ctx.translate(x, y)
  if (spec.mode === 'line') {
    const sample: BuilderItem = { id: -1, kind, name: '', x: 0, z: 0, rotation: 0, width: kind === 'campus-fence' ? 2 : 7, depth: 50, points: [{ x: -26, z: 3 }, { x: -10, z: -3 }, { x: 9, z: 3 }, { x: 26, z: -2 }] }
    drawObject(ctx, sample)
  } else {
    const ratio = Math.min(50 / spec.width, 27 / spec.depth)
    ctx.scale(ratio, ratio)
    drawObject(ctx, { id: -1, kind, name: '', x: 0, z: 0, rotation: 0, width: spec.width, depth: spec.depth })
  }
  ctx.restore()
}

/** A true overhead drawing: positive X is east, negative Z is north, and geometry is never fitted to the current objects. */
export function renderCampusPlan({ items, title, origin }: CampusPlanOptions): HTMLCanvasElement {
  const indexColumns = 4, indexRowHeight = 48, indexStart = 1114
  const indexRows = Math.ceil(items.length / indexColumns)
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = Math.max(1200, indexStart + indexRows * indexRowHeight + 65)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前设备无法生成校园平面图，请尝试更新浏览器。')
  ctx.fillStyle = '#fbfcf7'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#27756c'; ctx.fillRect(48, 48, 8, 66)
  fittedText(ctx, title.trim() || '我的校园', 76, 67, 1110, 38, ink, 700)
  text(ctx, '校园平面图', 76, 108, 20, muted)
  text(ctx, '方向 · 比例尺 · 图例', 1544, 70, 20, '#477970', 500, 'right')
  text(ctx, '3D 校园的俯视表达', 1544, 107, 17, muted, 400, 'right')

  ctx.fillStyle = '#ffffff'; ctx.fillRect(64, 142, 1035, 885)
  ctx.strokeStyle = '#dce7dc'; ctx.lineWidth = 1.5; ctx.strokeRect(64, 142, 1035, 885)
  circle(ctx, mapCenter.x, mapCenter.y, mapRadius, '#edf4e3', '#a9c19c', 2)
  ctx.save()
  ctx.beginPath(); ctx.arc(mapCenter.x, mapCenter.y, mapRadius, 0, tau); ctx.clip()
  ctx.translate(mapCenter.x, mapCenter.y)
  ctx.scale(pixelsPerMetre, pixelsPerMetre)
  // Each grid interval is a real fifty metres, independent of screen or export size.
  for (let offset = -CAMPUS_RADIUS; offset <= CAMPUS_RADIUS; offset += 50) {
    line(ctx, offset, -CAMPUS_RADIUS, offset, CAMPUS_RADIUS, '#d8e5cf', 0.45)
    line(ctx, -CAMPUS_RADIUS, offset, CAMPUS_RADIUS, offset, '#d8e5cf', 0.45)
  }
  items.map((item, index) => ({ item, index })).sort((a, b) => layerOrder(a.item) - layerOrder(b.item) || a.index - b.index).forEach(({ item }) => drawObject(ctx, item))
  ctx.restore()
  drawMapNumbers(ctx, items)
  if (!items.length) {
    text(ctx, '从一座建筑开始，设计你的校园', mapCenter.x, mapCenter.y, 23, '#6d8f75', 400, 'center')
  }

  const compass = { x: 1029, y: 228 }
  line(ctx, compass.x, compass.y - 32, compass.x, compass.y + 24, '#577572', 2)
  line(ctx, compass.x - 21, compass.y, compass.x + 21, compass.y, '#91aaa1', 1.5)
  polygon(ctx, [{ x: compass.x, z: compass.y - 42 }, { x: compass.x - 10, z: compass.y - 19 }, { x: compass.x, z: compass.y - 24 }, { x: compass.x + 10, z: compass.y - 19 }])
  ctx.fillStyle = '#27756c'; ctx.fill()
  text(ctx, '北 N', compass.x, compass.y - 60, 21, '#27756c', 700, 'center')
  text(ctx, '东', compass.x + 29, compass.y, 14, muted)
  text(ctx, '南', compass.x, compass.y + 38, 14, muted, 400, 'center')
  text(ctx, '西', compass.x - 39, compass.y, 14, muted)

  const scaleX = 110, scaleY = 986, scaleMetres = 100, segment = scaleMetres / 2 * pixelsPerMetre
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i ? '#ffffff' : ink
    ctx.fillRect(scaleX + i * segment, scaleY, segment, 9)
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.strokeRect(scaleX + i * segment, scaleY, segment, 9)
  }
  for (let i = 0; i < 3; i++) text(ctx, `${i * 50}`, scaleX + i * segment, scaleY - 13, 16, ink, 400, 'center')
  text(ctx, '米', scaleX + 2 * segment + 19, scaleY + 4, 16)
  text(ctx, '细网格间隔 50 米', 435, scaleY + 3, 17, muted)
  text(ctx, '校园直径 400 米', 1057, scaleY + 3, 17, muted, 400, 'right')

  const legendX = 1150
  text(ctx, '校园示意图例', legendX, 168, 25, ink, 700)
  text(ctx, '课堂自定义符号', legendX, 202, 17, muted)
  const usedKinds = new Set(items.map(item => item.kind))
  const legendItems = builderCatalog.filter(spec => usedKinds.has(spec.kind))
  legendItems.forEach((spec, index) => {
    const y = 250 + index * 33
    drawLegendSymbol(ctx, spec.kind, legendX + 31, y)
    text(ctx, spec.label, legendX + 78, y, 19)
    text(ctx, String(items.filter(item => item.kind === spec.kind).length), 1528, y, 17, muted, 400, 'right')
  })
  if (!legendItems.length) text(ctx, '添加地物后显示对应图例', legendX, 260, 18, muted)
  line(ctx, legendX, 977, 1542, 977, '#d9e4db', 1.5)
  text(ctx, '方位参考：中心经纬度', legendX, 998, 16, muted)
  text(ctx, `${Math.abs(origin.lat).toFixed(5)}°${origin.lat >= 0 ? 'N' : 'S'}   ${Math.abs(origin.lng).toFixed(5)}°${origin.lng >= 0 ? 'E' : 'W'}`, legendX, 1022, 17, ink)

  line(ctx, 64, 1061, 1542, 1061, '#d9e4db', 1.5)
  text(ctx, '地物名称索引', 64, 1089, 23, ink, 700)
  text(ctx, `${items.length} 个地物 · 图中编号对应下方名称`, 1542, 1089, 17, muted, 400, 'right')
  items.forEach((item, index) => {
    const column = index % indexColumns, row = Math.floor(index / indexColumns)
    const x = 80 + column * 370, y = indexStart + row * indexRowHeight + 16
    drawNumber(ctx, index + 1, x, y, true)
    indexedName(ctx, item.name.trim() || getBuilderSpec(item.kind).label, x + 22, y)
  })
  text(ctx, '依据校园模型绘制；比例尺随图片等比缩放。校园示意图不代表真实校址。', 64, canvas.height - 29, 16, muted)
  return canvas
}
