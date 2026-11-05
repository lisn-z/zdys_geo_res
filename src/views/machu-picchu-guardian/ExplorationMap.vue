<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SiteId } from './types'
import { MAP_BOUNDS, SITE_LOCATIONS, RIDGE_OUTLINE, PLAZA_AREAS, TERRACE_AREAS, PATHS, ROOM_LAYOUT, URBAN_PLATFORMS, LANDMARK_SPECS, type Point2 } from './world-layout'
import { toCanonicalXZ } from './world-scale'
import { SITES } from './lesson'

const props = defineProps<{ camera: { x: number; z: number; heading: number }; visited: SiteId[] }>()
const emit = defineEmits<{ travel: [id: SiteId] }>()
const canvas = ref<HTMLCanvasElement>()
type MapSite = { id: SiteId; label: string; x: number; z: number; row: 'top' | 'bottom'; slot: number; number: string }
// Geometry and site coordinates come from the same data as the 3D world.
// Label slots belong to this schematic map's presentation.
const labels: Partial<Record<SiteId, Omit<MapSite, 'id' | 'x' | 'z'>>> = {
  viewpoint: { label: '守卫屋', row: 'top', slot: 0, number: '01' },
  archives: { label: '神圣广场', row: 'top', slot: 1, number: '02' },
  terrace: { label: '梯田', row: 'bottom', slot: 0, number: '03' },
  station: { label: '守护站', row: 'bottom', slot: 2, number: '04' },
}
const sites: MapSite[] = SITE_LOCATIONS.filter(site => SITES.some(lesson => lesson.id === site.id)).map(site => ({ ...site, ...labels[site.id]! }))
function inside(x: number, z: number, polygon: readonly Point2[]): boolean {
  let result = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result
  }
  return result
}
function hull(points: readonly Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const half = (list: Point2[]) => {
    const result: Point2[] = []
    for (const point of list) { while (result.length >= 2 && cross(result[result.length - 2]!, result[result.length - 1]!, point) <= 0) result.pop(); result.push(point) }
    return result.slice(0, -1)
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}
const skirt = hull([...RIDGE_OUTLINE, ...TERRACE_AREAS.flatMap(area => area.points), ...PATHS.flat(), ...sites.map(site => [site.x, site.z] as Point2)])
const positionLabel = computed(() => {
  const x = toCanonicalXZ(props.camera.x), z = toCanonicalXZ(props.camera.z)
  if (!Number.isFinite(x + z)) return '正在定位'
  if (x < MAP_BOUNDS.minX || x > MAP_BOUNDS.maxX || z < MAP_BOUNDS.minZ || z > MAP_BOUNDS.maxZ) return '视点位于场景外侧'
  const closest = [...sites].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0]!
  if (Math.hypot(closest.x - x, closest.z - z) < 4.2) return `当前位置 · ${closest.label}`
  return `当前位置 · ${TERRACE_AREAS.some(area => inside(x, z, area.points)) ? '农业梯田' : PLAZA_AREAS.some(area => inside(x, z, area)) ? '中央开敞空间' : '山脊步道'}`
})
type HitArea = { id: SiteId; x: number; y: number; label: { x: number; y: number; width: number; height: number } }
let hits: HitArea[] = [], hovered: SiteId | null = null, width = 0, height = 0
let frame = 0, observer: ResizeObserver | undefined, mounted = false
const font = '"Microsoft YaHei", "PingFang SC", sans-serif'

function schedule() {
  if (!mounted || frame) return
  frame = requestAnimationFrame(() => { frame = 0; draw() })
}

function draw() {
  const element = canvas.value
  if (!element) return
  const bounds = element.getBoundingClientRect(), ctx = element.getContext('2d')
  if (!ctx || bounds.width <= 0 || bounds.height <= 0) return
  width = bounds.width; height = bounds.height
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const pixelWidth = Math.max(1, Math.round(width * dpr)), pixelHeight = Math.max(1, Math.round(height * dpr))
  if (element.width !== pixelWidth || element.height !== pixelHeight) { element.width = pixelWidth; element.height = pixelHeight }
  ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const paper = ctx.createLinearGradient(0, 0, width, height)
  paper.addColorStop(0, '#f4f2e6'); paper.addColorStop(.55, '#e9eddd'); paper.addColorStop(1, '#f5f0e2')
  ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height)

  // -z follows the ridge toward the northern peak. A uniform scale preserves
  // the shared layout's proportions; this is not a surveyed north-up map.
  const scale = Math.min((width - 34) / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ), (height - 64) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX))
  const centerX = (MAP_BOUNDS.minX + MAP_BOUNDS.maxX) / 2, centerZ = (MAP_BOUNDS.minZ + MAP_BOUNDS.maxZ) / 2
  const point = (x: number, z: number) => ({ x: width * .5 - (z - centerZ) * scale, y: height * .50 + (x - centerX) * scale })
  function path(points: readonly (readonly number[])[], close = false) {
    ctx!.beginPath()
    points.forEach(([x, z], index) => { const p = point(x!, z!); if (index) ctx!.lineTo(p.x, p.y); else ctx!.moveTo(p.x, p.y) })
    if (close) ctx!.closePath()
  }
  function area(points: readonly (readonly number[])[], fill: string, stroke?: string) {
    path(points, true); ctx!.fillStyle = fill; ctx!.fill()
    if (stroke) { ctx!.strokeStyle = stroke; ctx!.lineWidth = 1; ctx!.stroke() }
  }
  // These decorative contour rings surround the shared terrain footprint;
  // they illustrate a ridge without pretending to be measured contour lines.
  for (let ring = 4; ring >= 0; ring--) {
    const expanded = skirt.map(([x, z]) => [centerX + (x - centerX) * (1.025 + ring * .055), centerZ + (z - centerZ) * (1.02 + ring * .025)] as const)
    area(expanded, ['#d5dfc3', '#dde5ce', '#e3e8d7', '#e8ebde', '#edf0e3'][ring]!, '#d5ddc8')
  }
  ctx.strokeStyle = 'rgba(112,139,102,.21)'; ctx.lineWidth = .7
  for (let edge = 0; edge < skirt.length; edge++) {
    const a = skirt[edge]!, b = skirt[(edge + 1) % skirt.length]!
    const steps = Math.max(1, Math.floor(Math.hypot(a[0] - b[0], a[1] - b[1]) / 3))
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1), x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t
      path([[x * 1.03, z * 1.03], [x * 1.09, z * 1.07]]); ctx.stroke()
    }
  }
  area(RIDGE_OUTLINE, '#b8c6a2', '#8f9f7d')
  for (const platform of URBAN_PLATFORMS) area(platform.points, platform.id.startsWith('western') ? '#d1c9ac' : '#c8cbb2', '#abb18e')
  PLAZA_AREAS.forEach((polygon, i) => area(polygon, ['#c5d3a9', '#cbd9b0', '#c3d1a3', '#cbd7b1'][i % 4]!, '#a8b992'))
  for (const terrace of TERRACE_AREAS) {
    area(terrace.points, terrace.band % 2 ? '#cfbd91' : '#bba77c', '#a79a78')
    // The first half is the terrace's curved retaining edge, shared with 3D.
    path(terrace.points.slice(0, terrace.points.length / 2)); ctx.strokeStyle = '#a59e7f'; ctx.lineWidth = 1.15; ctx.stroke()
  }
  // The same primary paths are used to construct the world's stone walkways.
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const route of PATHS) {
    path(route); ctx.strokeStyle = '#b3a686'; ctx.lineWidth = 3.1; ctx.stroke()
    path(route); ctx.strokeStyle = '#eee5cc'; ctx.lineWidth = 1.8; ctx.stroke()
  }
  for (const room of ROOM_LAYOUT) {
    const c = Math.cos(room.angle), s = Math.sin(room.angle)
    const corners: Point2[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dz]) => {
      const x = dx! * room.width / 2, z = dz! * room.depth / 2
      return [room.x + x * c + z * s, room.z - x * s + z * c]
    })
    area(corners, room.style === 'hut' ? '#c4b79b' : '#dfdbc5', '#8c917b')
    path(corners.slice(1, 3)); ctx.strokeStyle = '#a29f85'; ctx.lineWidth = 1.3; ctx.stroke()
  }
  for (const landmark of LANDMARK_SPECS) {
    const p = point(landmark.x, landmark.z)
    const w = landmark.depth * scale, h = landmark.width * scale
    ctx.fillStyle = '#b2a487'; ctx.strokeStyle = '#776d56'; ctx.lineWidth = .8
    ctx.beginPath()
    if (['sun-temple', 'intihuatana', 'sacred-rock', 'condor', 'quarry'].includes(landmark.kind)) ctx.ellipse(p.x, p.y, w * .43, h * .43, 0, 0, Math.PI * 2)
    else ctx.rect(p.x - w * .43, p.y - h * .43, w * .86, h * .86)
    ctx.fill(); ctx.stroke()
    if (landmark.kind === 'intihuatana') {
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w * .23, h * .23, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }

  hits = []
  const seen = new Set(props.visited), labelY = { top: 17, bottom: height - 17 }
  ctx.font = `600 11px ${font}`
  // Fixed, independent label slots prevent the central sites' names from
  // colliding at narrow sizes. Leaders connect each label to its true position.
  for (const site of sites) {
    const p = point(site.x, site.z), anchorX = width * (.17 + site.slot * .33), anchorY = labelY[site.row]
    const label = `${site.number}  ${site.label}`, labelWidth = ctx.measureText(label).width + 18
    const left = Math.max(5, Math.min(width - labelWidth - 5, anchorX - labelWidth / 2)), top = anchorY - 11
    const targetX = left + labelWidth / 2, targetY = site.row === 'top' ? top + 22 : top
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + (site.row === 'top' ? -9 : 9)); ctx.lineTo(targetX, targetY)
    ctx.strokeStyle = hovered === site.id ? '#3b7057' : 'rgba(93,119,85,.58)'; ctx.lineWidth = hovered === site.id ? 1.3 : .8; ctx.stroke()
    ctx.fillStyle = hovered === site.id ? '#fffbed' : 'rgba(250,248,237,.93)'
    ctx.strokeStyle = hovered === site.id ? '#71916b' : '#ccd6bc'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.roundRect(left, top, labelWidth, 22, 6); ctx.fill(); ctx.stroke()
    ctx.fillStyle = seen.has(site.id) ? '#315d42' : '#63745c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, targetX, anchorY + .3)
    hits.push({ id: site.id, x: p.x, y: p.y, label: { x: left, y: top, width: labelWidth, height: 22 } })
  }
  // Draw site marks above the leader lines so intersections stay unambiguous.
  for (const site of sites) {
    const p = point(site.x, site.z), visited = seen.has(site.id)
    ctx.beginPath(); ctx.arc(p.x, p.y, hovered === site.id ? 7.7 : 6.4, 0, Math.PI * 2)
    ctx.fillStyle = visited ? '#3d7050' : '#fffdf0'; ctx.fill(); ctx.strokeStyle = visited ? '#f4f1df' : '#6f8d66'; ctx.lineWidth = 1.5; ctx.stroke()
    if (visited) {
      ctx.beginPath(); ctx.moveTo(p.x - 2.6, p.y); ctx.lineTo(p.x - .6, p.y + 2); ctx.lineTo(p.x + 2.8, p.y - 2.2)
      ctx.strokeStyle = '#faf9e9'; ctx.lineWidth = 1.3; ctx.stroke()
    } else { ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2); ctx.fillStyle = '#728f68'; ctx.fill() }
  }

  if (Number.isFinite(props.camera.x + props.camera.z + props.camera.heading)) {
    const raw = point(toCanonicalXZ(props.camera.x), toCanonicalXZ(props.camera.z))
    const p = { x: Math.max(12, Math.min(width - 12, raw.x)), y: Math.max(35, Math.min(height - 35, raw.y)) }
    const heading = props.camera.heading * Math.PI / 180
    const angle = heading
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(angle)
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16)
    glow.addColorStop(0, 'rgba(252,208,101,.43)'); glow.addColorStop(1, 'rgba(252,208,101,0)')
    ctx.fillStyle = glow; ctx.fillRect(-17, -17, 34, 34)
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5.5, -5.5); ctx.lineTo(-3, 0); ctx.lineTo(-5.5, 5.5); ctx.closePath()
    ctx.fillStyle = '#e5aa49'; ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 1.7; ctx.fill(); ctx.stroke()
    ctx.restore()
  }
  // The scene axis follows the ridge. Label the actual landmark direction,
  // rather than representing that teaching axis as a precise compass bearing.
  const compassX = width - 70, compassY = height - 46
  ctx.strokeStyle = '#8a9b7c'; ctx.fillStyle = '#708365'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(compassX - 11, compassY); ctx.lineTo(compassX + 4, compassY); ctx.lineTo(compassX, compassY - 3); ctx.moveTo(compassX + 4, compassY); ctx.lineTo(compassX, compassY + 3); ctx.stroke()
  ctx.font = `10px ${font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('北峰方向', compassX + 8, compassY)
}

function hit(event: MouseEvent | PointerEvent): SiteId | null {
  const element = canvas.value
  if (!element || !width || !height) return null
  const bounds = element.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return null
  // Drawing coordinates are CSS pixels. Backing-store DPR is already handled
  // by the context transform and must not be applied to pointer coordinates.
  const x = (event.clientX - bounds.left) * width / bounds.width, y = (event.clientY - bounds.top) * height / bounds.height
  const label = hits.find(item => x >= item.label.x && x <= item.label.x + item.label.width && y >= item.label.y && y <= item.label.y + item.label.height)
  if (label) return label.id
  const closest = [...hits].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]
  return closest && Math.hypot(closest.x - x, closest.y - y) <= 18 ? closest.id : null
}
function pointerMove(event: PointerEvent) {
  const next = hit(event)
  if (canvas.value) canvas.value.style.cursor = next ? 'pointer' : 'default'
  if (next !== hovered) { hovered = next; schedule() }
}
function pointerLeave() { if (hovered) { hovered = null; schedule() } }
function travel(event: MouseEvent) { const id = hit(event); if (id) emit('travel', id) }

watch(() => [props.camera.x, props.camera.z, props.camera.heading, props.visited.join('|')], schedule)
onMounted(() => {
  mounted = true
  if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(schedule); if (canvas.value) observer.observe(canvas.value) }
  window.addEventListener('resize', schedule); schedule()
})
onBeforeUnmount(() => {
  mounted = false; observer?.disconnect(); window.removeEventListener('resize', schedule)
  if (frame) cancelAnimationFrame(frame)
  frame = 0; hits = []
})
</script>

<template>
  <figure class="exploration-map">
    <figcaption><strong>场景导览 · 教学示意</strong><span :title="positionLabel"><i aria-hidden="true" />{{ positionLabel }}</span></figcaption>
    <div class="exploration-map-canvas"><canvas ref="canvas" role="img" :aria-label="`四处观察点的场景导览。${positionLabel}。也可使用下方地点卡前往。`" @pointermove="pointerMove" @pointerleave="pointerLeave" @click="travel">场景导览：山脊观察台、遗址档案、梯田与守护站。请使用下方地点卡前往。</canvas></div>
  </figure>
</template>

<style scoped>
.exploration-map{box-sizing:border-box;display:grid;grid-template-rows:auto minmax(0,1fr);width:100%;height:240px;margin:0;overflow:hidden;border:1px solid #d5ddc8;border-radius:14px;background:#f4f2e6;box-shadow:inset 0 1px 0 #fffaf0}
.exploration-map figcaption{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:38px;padding:7px 13px;border-bottom:1px solid #dfe4d2;color:#52684c}
.exploration-map strong{flex-shrink:0;font-size:12px;font-weight:650;letter-spacing:.025em}
.exploration-map figcaption span{display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap}
.exploration-map figcaption i{display:block;flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:#daa348;box-shadow:0 0 0 2px #f4e7c8}
.exploration-map-canvas{min-height:0;overflow:hidden}
.exploration-map canvas{display:block;width:100%;height:100%;touch-action:pan-y}
@media(max-width:380px){.exploration-map figcaption{gap:6px;padding-inline:10px}.exploration-map strong{font-size:11px}.exploration-map figcaption span{font-size:9px}}
</style>
