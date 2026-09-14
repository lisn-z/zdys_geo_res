import type { Coordinate, FeatureKind } from './map-lesson'
import type { ProjectedCampusFeature } from './campus-3d-layout'

export type BuilderKind = FeatureKind
export type BuilderPoint = { x: number; z: number }
export type BuilderItem = {
  id: number
  kind: FeatureKind
  name: string
  x: number
  z: number
  /** Degrees around Three.js +Y: a positive turn sends east (+X) towards north (-Z). */
  rotation: number
  width: number
  depth: number
  /** Line vertices in local metres, relative to x/z and transformed by rotation. */
  points?: BuilderPoint[]
}
export type BuilderSpec = {
  kind: FeatureKind
  label: string
  category: string
  mode: 'place' | 'line'
  width: number
  depth: number
  icon: string
  description: string
}

export const CAMPUS_RADIUS = 200
export const GRID_METRES = 10
const buildableRadius = CAMPUS_RADIUS - 5
const radians = Math.PI / 180
const metresPerDegree = 6371008.8 * radians

const thumbnail = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 64" width="80" height="64" aria-hidden="true"><ellipse cx="41" cy="55" rx="32" ry="6" fill="#273c4115"/><g stroke="#435568" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">${content}</g></svg>`
const panes = (columns: number, rows: number, x: number, y: number, dx = 9, dy = 10, fill = '#81c9df') => Array.from({ length: columns * rows }, (_, i) => `<rect x="${x + (i % columns) * dx}" y="${y + Math.floor(i / columns) * dy}" width="5" height="6" rx="0.7" fill="${fill}" stroke="#ffffff" stroke-width="0.7"/>`).join('')

const icons: Record<string, string> = {
  'teaching-building': thumbnail('<path d="M10 29L52 25L69 32V54L27 58L10 51Z" fill="#ffead1"/><path d="M52 25L69 32V54L52 48Z" fill="#e1b993"/><path d="M7 28L22 15L55 16L73 31L51 29L22 21Z" fill="#dc7763"/><path d="M7 28L22 15L22 21L51 29L27 33Z" fill="#f3987d"/>' + panes(4, 2, 16, 34, 9, 10) + '<path d="M31 57V46H40V56" fill="#9e7568"/>'),
  laboratory: thumbnail('<path d="M13 22L55 18L69 25V52L27 57L13 50Z" fill="#d9eef2"/><path d="M55 18L69 25V52L55 46Z" fill="#92bbc7"/><path d="M13 22L55 18L69 25L27 30Z" fill="#83a9bf"/><path d="M18 33L50 29V49L18 53Z" fill="#64b8d4"/><path d="M25 32V52M34 31V51M43 30V50M18 42L50 38" fill="none" stroke="#d8f9ff"/><path d="M46 10V16L40 24Q49 29 58 22L51 15V9" fill="#d7fff4"/><path d="M43 20L55 19L58 22Q49 29 40 24Z" fill="#7bceb1"/><path d="M45 9H53" stroke="#57788a" stroke-width="2"/><circle cx="29" cy="13" r="6" fill="#f9dc72"/><path d="M22 13H36M29 6V20" stroke="#aa985d"/>'),
  library: thumbnail('<path d="M9 46L51 43L72 52L28 59Z" fill="#b1a6c8"/><path d="M12 42L52 39L68 46L26 51Z" fill="#d3c7e2"/><path d="M16 27L55 23V41L16 45Z" fill="#ecdef2"/><path d="M55 23L67 30V46L55 41Z" fill="#b7a4d0"/><path d="M18 30V42M27 29V41M36 28V40M45 27V39" stroke="#8973a8" stroke-width="3"/><path d="M12 18Q27 10 39 19Q51 9 66 17L64 29Q50 24 39 32Q25 25 13 30Z" fill="#fff9e7"/><path d="M39 19V32M18 21Q27 18 34 23M46 22Q53 18 60 21" fill="none" stroke="#a184b8"/>'),
  administration: thumbnail('<path d="M10 33L55 29L69 35V54L24 58L10 51Z" fill="#e9eddb"/><path d="M55 29L69 35V54L55 48Z" fill="#a4b9aa"/><path d="M8 33L25 24L58 25L72 35L25 39Z" fill="#75a395"/>' + panes(2, 1, 15, 41) + panes(2, 1, 47, 39) + '<path d="M30 54V15L47 13V52Z" fill="#fff4d8"/><path d="M47 13L53 18V54L47 52Z" fill="#c8c7ac"/><path d="M28 16L39 5L52 15Z" fill="#497f78"/><circle cx="39" cy="25" r="6" fill="#fffef5"/><path d="M39 21V25L42 27" fill="none"/><path d="M35 53V41H43V53" fill="#658c82"/>'),
  dormitory: thumbnail('<path d="M11 20L53 16L69 24V53L27 58L11 50Z" fill="#ffe7be"/><path d="M53 16L69 24V53L53 46Z" fill="#d4aa8b"/><path d="M10 19L52 14L70 23L27 28Z" fill="#b77a6c"/>' + panes(4, 2, 17, 29, 9, 12) + '<path d="M14 37L52 33V38L14 42ZM14 49L52 45V50L14 54Z" fill="#f5c9b0"/><path d="M17 36V40M24 35V39M32 35V39M40 34V38M47 33V37M17 48V52M25 47V51M33 47V51M41 46V50M48 45V49" stroke="#ab8377"/><path d="M57 29L63 32M57 39L63 42" stroke="#fef6de" stroke-width="3"/>'),
  canteen: thumbnail('<path d="M12 34L54 29L68 36V53L26 58L12 50Z" fill="#ffebbd"/><path d="M54 29L68 36V53L54 47Z" fill="#dcad79"/><path d="M8 32L54 27L72 36L25 41Z" fill="#de9057"/><path d="M12 34L25 41L30 38L17 31M32 30L45 37L50 34L37 28M51 28L64 36L69 34L56 27" fill="#fff1cf" stroke="none"/><path d="M20 45L50 42V52L20 55Z" fill="#96c9b9"/><circle cx="39" cy="17" r="10" fill="#fff7de"/><circle cx="39" cy="17" r="6" fill="#efc78b"/><path d="M22 9V18M26 9V18M24 9V27M22 17H26M54 9V27M54 9Q49 15 54 18" fill="none" stroke="#9b694a" stroke-width="2"/>'),
  toilet: thumbnail('<path d="M17 30L53 25L65 32V52L28 57L17 50Z" fill="#e0efe0"/><path d="M53 25L65 32V52L53 45Z" fill="#90b7a4"/><path d="M13 28L52 21L69 31L27 37Z" fill="#65a495"/><path d="M23 40L34 38V54L23 55ZM39 38L50 36V52L39 54Z" fill="#e6f7ec"/><circle cx="28" cy="43" r="1.5" fill="#3e7a77"/><path d="M28 46V51M26 48H30" stroke="#3e7a77"/><circle cx="44" cy="41" r="1.5" fill="#d98c86"/><path d="M44 44L41 49H47ZM44 49V51" fill="#d98c86" stroke="#d98c86"/><path d="M30 11H51V25H30Z" fill="#fffefa"/><text x="40.5" y="21" font-size="9" font-weight="700" fill="#3e7a77" stroke="none" text-anchor="middle">WC</text>'),
  infirmary: thumbnail('<path d="M14 30L54 26L67 33V53L27 58L14 50Z" fill="#fff3e6"/><path d="M54 26L67 33V53L54 46Z" fill="#abd0d2"/><path d="M10 29L53 22L71 33L26 39Z" fill="#86bfca"/><rect x="30" y="8" width="20" height="21" rx="3" fill="#ffffff"/><path d="M37 12H43V16H47V22H43V26H37V22H33V16H37Z" fill="#e78680" stroke="none"/>' + panes(2, 1, 18, 41, 9, 10) + '<path d="M40 55V41L51 40V53Z" fill="#8ac8d1"/>'),
  'sports-field': thumbnail('<path d="M9 29C10 11 54 11 70 25C85 41 53 61 25 55C15 53 7 43 9 29Z" fill="#ba7058"/><path d="M14 30C15 17 52 16 65 28C77 40 50 56 27 51C18 49 12 41 14 30Z" fill="none" stroke="#fff4e2"/><path d="M19 31C20 22 49 21 59 30C69 39 48 51 29 47C22 45 17 39 19 31Z" fill="#82b77a" stroke="#fff4e2"/><path d="M28 29L49 27L57 39L34 44ZM39 28L46 42" fill="none" stroke="#e8ffdc"/><ellipse cx="41" cy="36" rx="5" ry="4" fill="none" stroke="#e8ffdc"/>'),
  gymnasium: thumbnail('<path d="M9 36L55 29L72 38V52L25 59L9 51Z" fill="#d4e8da"/><path d="M55 29L72 38V52L55 44Z" fill="#79a8a0"/><path d="M7 36Q6 10 32 10Q54 12 58 30L74 38L24 45Z" fill="#80b7ba"/><path d="M7 36Q25 16 24 45M16 23Q33 13 37 43M32 11Q50 17 50 41M48 20Q57 26 62 40" fill="none" stroke="#c8eff0" stroke-width="2"/><path d="M16 47L49 42V51L16 56Z" fill="#75b6c6"/><path d="M22 47V54M31 45V53M41 43V51" stroke="#e9faf5"/>'),
  'basketball-court': thumbnail('<path d="M7 30L53 14L74 42L27 59Z" fill="#578f96"/><path d="M13 30L51 18L68 41L29 54Z" fill="#df9e72" stroke="#fff8e9"/><path d="M31 24L48 48M18 35L29 31L36 40L25 44M55 25L45 29L52 38L63 34" fill="none" stroke="#fff8e9"/><ellipse cx="39.5" cy="36" rx="6" ry="7" transform="rotate(-32 39.5 36)" fill="none" stroke="#fff8e9"/><path d="M13 34V21M65 40V28" stroke="#e5eee8" stroke-width="2"/><path d="M8 19L18 16V23L8 26ZM60 26L70 23V30L60 33Z" fill="#e8f8f2"/><path d="M12 27L17 25M64 34L69 32" stroke="#b96654" stroke-width="2"/>'),
  plaza: thumbnail('<path d="M7 35L41 16L74 35L41 57Z" fill="#d2c8b0"/><path d="M13 35L41 21L67 35L41 51Z" fill="#f1e7ca"/><path d="M22 30L51 45M32 25L60 40M22 41L51 26M32 46L60 31" stroke="#cebea0"/><path d="M36 27V13" stroke="#6f8b8c" stroke-width="2"/><path d="M36 13L50 15L36 20Z" fill="#e78b78"/><path d="M30 31L39 26L49 32L40 37Z" fill="#c0b39d"/><path d="M16 31V26M58 42V37M16 26L26 22M58 37L68 32" stroke="#9d805f" stroke-width="3"/>'),
  'campus-gate': thumbnail('<path d="M9 49L51 43L73 51L29 60Z" fill="#d1c5ac"/><path d="M16 50V22L24 20V52ZM55 46V17L63 20V50Z" fill="#ffedc9"/><path d="M13 20L55 14L67 20L24 28Z" fill="#b66a5e"/><path d="M13 20V26L24 32L67 24V20L24 28Z" fill="#e7a58a"/><path d="M27 34L52 30V47L27 51ZM31 34V50M37 33V49M43 32V48M49 31V47M27 40L52 36" fill="none" stroke="#597c80"/><path d="M32 22L48 20" stroke="#fff7dc" stroke-width="3"/>'),
  'campus-road': thumbnail('<path d="M5 41C16 25 28 40 39 29S58 8 75 14L74 34C59 28 56 43 45 48S25 45 16 58Z" fill="#ced8cd"/><path d="M8 43C18 31 29 43 40 34S59 16 74 20L74 29C58 24 55 40 44 43S25 39 14 54Z" fill="#70858a" stroke="none"/><path d="M11 48C21 36 29 43 42 38S59 19 74 24" fill="none" stroke="#f8e9ac" stroke-width="2" stroke-dasharray="6 5"/>'),
  footpath: thumbnail('<path d="M8 44C19 16 33 43 45 27S65 18 73 12L74 23C62 28 62 29 51 38S26 33 19 53Z" fill="#c6d9aa"/><path d="M11 46C23 22 32 46 48 31S64 24 74 17L74 24C61 30 61 30 51 38S26 35 18 52Z" fill="#eddbad"/><path d="M20 34L25 40M29 36L29 42M39 36L42 42M48 31L53 37M57 25L60 31M65 23L68 29" fill="none" stroke="#c5ac7c"/><path d="M15 24L18 19L21 24M54 48L57 43L60 48" fill="none" stroke="#76a25c"/>'),
  parking: thumbnail('<path d="M7 30L51 16L74 43L29 58Z" fill="#94a8b0"/><path d="M16 33L56 20M25 44L66 31M24 31L29 38M36 27L41 34M48 23L53 30M31 42L37 49M43 38L49 45M55 34L61 41" fill="none" stroke="#f4fbf7" stroke-width="1.6"/><path d="M19 33L25 31L29 36L23 38Z" fill="#f5c978"/><path d="M43 26L49 24L53 29L47 31Z" fill="#cd8582"/><path d="M46 39L52 37L56 42L50 44Z" fill="#98d1c1"/><path d="M14 30V11" stroke="#6f8f9e" stroke-width="2"/><rect x="6" y="6" width="17" height="17" rx="3" fill="#447eac" stroke="#d6f0f6"/><text x="14.5" y="19" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="white" stroke="none">P</text>'),
  'bus-stop': thumbnail('<path d="M12 45L51 39L69 47L30 56Z" fill="#d6c9ad"/><path d="M21 43V23M58 41V21" stroke="#648989" stroke-width="3"/><path d="M16 23L53 14L67 22L29 32Z" fill="#6da995"/><path d="M18 23L30 30L67 22V27L30 35L18 28Z" fill="#b0d7ba"/><path d="M28 33L50 29V39L28 44Z" fill="#bde3df"/><path d="M31 43L51 38M34 43V48M48 39V44" stroke="#aa8260" stroke-width="3"/><path d="M10 44V17" stroke="#6e8b91" stroke-width="2"/><rect x="4" y="9" width="13" height="18" rx="3" fill="#f5fff4"/><rect x="7" y="12" width="7" height="7" rx="1" fill="#7eafc4"/><circle cx="8" cy="22" r="1" fill="#5f7986"/><circle cx="13" cy="22" r="1" fill="#5f7986"/>'),
  'campus-fence': thumbnail('<path d="M9 47L54 28L73 35L26 56Z" fill="#ccc5b4"/><path d="M15 42V25L32 18V37ZM35 34V18L53 10V27ZM57 29V12L68 17V34Z" fill="#eadcc1"/><path d="M16 25L32 18M36 18L53 10M58 12L69 18" stroke="#a39782" stroke-width="4"/><path d="M13 46V22L19 19V43ZM31 39V14L37 12V36ZM51 31V7L57 5V28ZM67 35V14L72 16V38Z" fill="#d1bfa2"/><path d="M22 25V36M42 17V29M61 19V27" stroke="#c4b492"/>'),
  'green-space': thumbnail('<path d="M7 39Q18 23 42 29Q63 21 75 37L63 49L29 57Z" fill="#9ac477"/><path d="M25 41V28M45 39V23M61 40V29" stroke="#a37f54" stroke-width="3"/><path d="M14 31Q7 22 19 19Q23 7 31 18Q42 20 34 31Q24 37 14 31Z" fill="#79af76"/><path d="M34 26Q26 17 37 12Q42 2 51 13Q62 18 54 27Q45 33 34 26Z" fill="#a8cf80"/><path d="M51 31Q45 23 54 21Q60 11 67 22Q76 27 69 34Q59 39 51 31Z" fill="#639b74"/><path d="M23 48L27 44L30 49M47 47L50 42L54 46" fill="none" stroke="#e3ecab"/>'),
  tree: thumbnail('<ellipse cx="41" cy="53" rx="20" ry="6" fill="#b6d48b" stroke="none"/><path d="M38 51V31H44V51Z" fill="#b78e64"/><path d="M41 40L32 33M41 35L49 27" stroke="#b78e64" stroke-width="3"/><path d="M22 33Q10 23 24 16Q21 6 37 8Q46 0 53 12Q68 11 66 26Q74 35 59 40Q48 48 40 38Q26 44 22 33Z" fill="#80b781"/><path d="M26 21Q22 12 37 12Q45 4 51 17Q61 16 59 27Q45 32 41 23Q33 29 26 21Z" fill="#afd586" stroke="none"/>'),
  'campus-water': thumbnail('<path d="M8 34Q11 20 29 26Q36 10 52 20Q59 28 71 29Q80 42 59 47Q48 61 32 52Q13 55 8 43Z" fill="#a1ca81"/><path d="M12 34Q14 24 30 30Q38 16 51 24Q57 31 68 32Q76 42 56 43Q46 55 33 48Q15 52 12 40Z" fill="#66c9e0" stroke="#418daa"/><path d="M18 37Q24 33 31 36M38 29Q43 27 48 29M41 43Q49 46 55 40M23 44Q28 46 32 44" fill="none" stroke="#d9fcff" stroke-width="2"/><path d="M63 48V39M67 48V36M70 45V38" stroke="#85a35b" stroke-width="2"/>'),
}

export const builderGroups: { id: string; label: string; kinds: FeatureKind[] }[] = [
  { id: 'teaching', label: '教学与办公', kinds: ['teaching-building', 'laboratory', 'library', 'administration'] },
  { id: 'services', label: '生活与服务', kinds: ['dormitory', 'canteen', 'toilet', 'infirmary'] },
  { id: 'activities', label: '运动与活动', kinds: ['sports-field', 'gymnasium', 'basketball-court', 'plaza'] },
  { id: 'environment', label: '交通与环境', kinds: ['campus-gate', 'campus-road', 'footpath', 'parking', 'bus-stop', 'campus-fence', 'green-space', 'tree', 'campus-water'] },
]

type CatalogEntry = [FeatureKind, string, number, number, string, ('place' | 'line')?]
const entries: CatalogEntry[] = [
  ['teaching-building', '教学楼', 36, 16, '红色坡屋顶、整齐窗格与宽敞入口。'],
  ['laboratory', '实验楼', 32, 18, '玻璃立面与屋顶科学设施。'],
  ['library', '图书馆', 28, 22, '书本造型、阶梯入口与阅读空间。'],
  ['administration', '行政楼', 24, 18, '带钟楼的校园办公建筑。'],
  ['dormitory', '宿舍', 36, 14, '连续阳台与分层居住空间。'],
  ['canteen', '食堂', 30, 20, '暖色雨棚与明亮用餐大厅。'],
  ['toilet', '卫生间', 10, 8, '小型公共卫生间与醒目标识。'],
  ['infirmary', '校医室', 16, 12, '带医疗十字标记的校医建筑。'],
  ['sports-field', '操场', 90, 50, '椭圆跑道与中央运动草坪；90 × 50 米为课堂示意尺寸。'],
  ['gymnasium', '体育馆', 40, 28, '大跨度弧形屋顶与玻璃入口。'],
  ['basketball-court', '篮球场', 28, 15, '含中线、中圈、球篮与球场标线。'],
  ['plaza', '广场', 30, 30, '铺装格纹、旗台与休憩空间。'],
  ['campus-gate', '校门', 14, 5, '门柱、门楣与入口通道。'],
  ['campus-road', '校园道路', 6, 30, '依次点击地面铺设道路，默认路宽 6 米。', 'line'],
  ['footpath', '步行道', 3, 20, '依次点击地面铺设浅色步道，默认宽 3 米。', 'line'],
  ['parking', '停车场', 40, 24, 'P 标识、独立车位与停放车辆。'],
  ['bus-stop', '校车站', 10, 5, '候车雨棚、座椅与站牌。'],
  ['campus-fence', '围墙', 0.8, 30, '依次点击地面建造连续墙体，默认厚 0.8 米。', 'line'],
  ['green-space', '绿地', 30, 22, '草坪上分布不同高低的树丛。'],
  ['tree', '树木', 8, 8, '独立树干与蓬松树冠。'],
  ['campus-water', '湖泊', 40, 26, '自然弯曲的岸线与带波纹的水面。'],
]

export const builderCatalog: BuilderSpec[] = entries.map(([kind, label, width, depth, description, mode = 'place']) => ({
  kind, label, width, depth, description, mode,
  category: builderGroups.find(group => group.kinds.includes(kind))!.id,
  icon: icons[kind]!,
}))

export function getBuilderSpec(kind: FeatureKind): BuilderSpec {
  const spec = builderCatalog.find(item => item.kind === kind)
  if (!spec) throw new RangeError(`Unsupported campus object: ${kind}`)
  return spec
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback
}

export function createBuilderItem(kind: FeatureKind, id: number, position: BuilderPoint, overrides: Partial<BuilderItem> = {}): BuilderItem {
  const spec = getBuilderSpec(kind)
  const width = finiteOr(overrides.width, spec.width)
  const depth = finiteOr(overrides.depth, spec.depth)
  const item: BuilderItem = {
    id, kind,
    name: overrides.name?.trim() || spec.label,
    x: finiteOr(overrides.x, finiteOr(position.x, 0)),
    z: finiteOr(overrides.z, finiteOr(position.z, 0)),
    rotation: ((finiteOr(overrides.rotation, 0) % 360) + 360) % 360,
    width: width > 0 ? width : spec.width,
    depth: depth > 0 ? depth : spec.depth,
  }
  if (spec.mode === 'line') {
    item.points = overrides.points?.map(point => ({ x: point.x, z: point.z }))
      ?? [{ x: -item.depth / 2, z: 0 }, { x: item.depth / 2, z: 0 }]
  }
  return item
}

function transform(point: BuilderPoint, item: BuilderItem): BuilderPoint {
  const angle = item.rotation * radians, cosine = Math.cos(angle), sine = Math.sin(angle)
  return { x: item.x + point.x * cosine + point.z * sine, z: item.z - point.x * sine + point.z * cosine }
}

function rectangle(width: number, depth: number): BuilderPoint[] {
  return [{ x: -width / 2, z: -depth / 2 }, { x: width / 2, z: -depth / 2 }, { x: width / 2, z: depth / 2 }, { x: -width / 2, z: depth / 2 }]
}

function capsule(width: number, depth: number): BuilderPoint[] {
  if (depth > width) return capsule(depth, width).map(point => ({ x: point.z, z: point.x }))
  const radius = depth / 2, straight = (width - depth) / 2
  const points: BuilderPoint[] = []
  for (let index = 0; index <= 20; index++) {
    const angle = -Math.PI / 2 + index / 20 * Math.PI
    points.push({ x: straight + Math.cos(angle) * radius, z: Math.sin(angle) * radius })
  }
  for (let index = 0; index <= 20; index++) {
    const angle = Math.PI / 2 + index / 20 * Math.PI
    points.push({ x: -straight + Math.cos(angle) * radius, z: Math.sin(angle) * radius })
  }
  return points
}

function lakeOutline(width: number, depth: number): BuilderPoint[] {
  const points = Array.from({ length: 80 }, (_, index) => {
    const angle = index / 80 * Math.PI * 2
    const radius = 1 + 0.14 * Math.sin(3 * angle + 0.5) + 0.09 * Math.cos(5 * angle - 0.6)
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
  })
  const xs = points.map(point => point.x), zs = points.map(point => point.z)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs)
  return points.map(point => ({ x: ((point.x - minX) / (maxX - minX) - 0.5) * width, z: ((point.z - minZ) / (maxZ - minZ) - 0.5) * depth }))
}

function localFootprint(item: BuilderItem): BuilderPoint[] {
  if (getBuilderSpec(item.kind).mode === 'line') return item.points ?? []
  if (item.kind === 'campus-water') return lakeOutline(item.width, item.depth)
  if (item.kind === 'sports-field') return capsule(item.width, item.depth)
  return rectangle(item.width, item.depth)
}

/** Unlike the old map import, this conversion never fits or normalises the campus extent. */
export function builderItemToFeature(item: BuilderItem): ProjectedCampusFeature {
  const points = item.kind === 'tree'
    ? [{ x: item.x, z: item.z }]
    : localFootprint(item).map(point => transform(point, item))
  const center = getBuilderSpec(item.kind).mode === 'line' && points.length
    ? { x: (Math.min(...points.map(point => point.x)) + Math.max(...points.map(point => point.x))) / 2, z: (Math.min(...points.map(point => point.z)) + Math.max(...points.map(point => point.z))) / 2 }
    : { x: item.x, z: item.z }
  return { id: item.id, kind: item.kind, name: item.name, points, center }
}

/** All footprints, including line caps, must remain inside the five-metre edge margin. */
export function itemFitsCampus(item: BuilderItem): boolean {
  const spec = builderCatalog.find(entry => entry.kind === item.kind)
  if (!spec || ![item.x, item.z, item.rotation, item.width, item.depth].every(Number.isFinite) || item.width <= 0 || item.depth <= 0) return false
  const local = localFootprint(item)
  if (!local.length || (spec.mode === 'line' && local.length < 2)) return false
  if (!local.every(point => Number.isFinite(point.x) && Number.isFinite(point.z))) return false
  const halfWidth = spec.mode === 'line' ? item.width / 2 : 0
  // The disk is convex: when every thick line endpoint fits, each connecting capsule fits too.
  return local.every(point => {
    const world = transform(point, item)
    return Math.hypot(world.x, world.z) + halfWidth <= buildableRadius + 1e-7
  })
}

export function builderDistance(a: BuilderPoint, b: BuilderPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

function wrapLongitude(longitude: number): number {
  return ((longitude + 180) % 360 + 360) % 360 - 180
}

function longitudeScale(origin: Coordinate): number {
  return metresPerDegree * Math.max(1e-6, Math.cos(origin.lat * radians))
}

/** Local campus projection in metres: east +X, north -Z. The origin fixes the latitude scale. */
export function builderPointToCoordinate(point: BuilderPoint, origin: Coordinate): Coordinate {
  return { lat: origin.lat - point.z / metresPerDegree, lng: wrapLongitude(origin.lng + point.x / longitudeScale(origin)) }
}

export function builderCoordinateToPoint(coordinate: Coordinate, origin: Coordinate): BuilderPoint {
  return { x: wrapLongitude(coordinate.lng - origin.lng) * longitudeScale(origin), z: -(coordinate.lat - origin.lat) * metresPerDegree }
}

/** An optional teaching arrangement; the builder itself starts with an empty campus. */
export function createExampleCampus(): BuilderItem[] {
  let id = 1
  const result: BuilderItem[] = []
  const place = (kind: FeatureKind, x: number, z: number, overrides?: Partial<BuilderItem>) => {
    const number = result.filter(item => item.kind === kind).length + 1
    result.push(createBuilderItem(kind, id++, { x, z }, { ...overrides, name: `${getBuilderSpec(kind).label} ${number}` }))
  }
  place('campus-gate', 0, 154)
  place('campus-road', 0, 0, { points: [{ x: 0, z: 150 }, { x: 0, z: -100 }] })
  place('campus-road', 0, 0, { points: [{ x: -125, z: 20 }, { x: 125, z: 20 }] })
  place('footpath', 0, 0, { points: [{ x: -76, z: 20 }, { x: -76, z: -70 }, { x: 72, z: -70 }] })
  place('teaching-building', -50, -52)
  place('laboratory', 52, -52)
  place('library', -50, -99)
  place('administration', 48, -101)
  place('dormitory', -113, -56)
  place('canteen', -110, -11)
  place('sports-field', 85, 72)
  place('basketball-court', 98, -12)
  place('gymnasium', -103, 59)
  place('plaza', 0, 63, { width: 28, depth: 28 })
  place('parking', -62, 116)
  place('campus-water', 64, 131)
  place('green-space', -53, 65)
  place('bus-stop', -18, 143)
  place('infirmary', -103, 109)
  place('toilet', 135, 3)
  place('tree', 24, 103)
  place('tree', 22, -27)
  place('tree', -23, -120)
  place('campus-fence', 0, 0, { points: [{ x: -110, z: 135 }, { x: -155, z: 85 }, { x: -155, z: -70 }, { x: -110, z: -130 }, { x: 95, z: -135 }, { x: 148, z: -77 }, { x: 156, z: 72 }, { x: 112, z: 135 }] })
  return result
}
