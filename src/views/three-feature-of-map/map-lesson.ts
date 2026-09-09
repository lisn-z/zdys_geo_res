export type Coordinate = { lat: number; lng: number }
export type FeatureKind =
  | 'settlement' | 'peak' | 'railway' | 'road' | 'river' | 'lake'
  | 'airport' | 'port' | 'expressway' | 'sea-route'
  | 'seasonal-river' | 'seasonal-lake' | 'reservoir' | 'hydropower-station' | 'waterfall'
  | 'volcano' | 'mountain-pass' | 'great-wall'
  | 'campus-road' | 'campus-gate' | 'teaching-building' | 'library' | 'canteen' | 'sports-field' | 'green-space' | 'campus-water' | 'laboratory' | 'administration' | 'dormitory' | 'gymnasium' | 'basketball-court' | 'parking' | 'plaza' | 'footpath' | 'campus-fence' | 'toilet' | 'infirmary' | 'bus-stop' | 'tree'
export type Geometry = 'point' | 'line' | 'area'
export type LegendSet = 'textbook' | 'campus'
export type DrawingStep = `legend:${LegendSet}` | 'practice'
export type FeatureType = { id: FeatureKind; label: string; color: string; symbol: string; geometry: Geometry; fillColor?: string; dashArray?: string; hint?: string }

// Geography teaching conventions, including the original textbook selection and
// transport, water and terrain symbols from common atlas/teaching references.
// Colours and silhouettes follow the user's supplied common-map-legend reference.
// These are redrawn vectors, not publisher-issued artwork or a complete edition facsimile.
const svg = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 28" width="48" height="28" aria-hidden="true">${content}</svg>`
export const textbookFeatureTypes: FeatureType[] = [
  { id: 'settlement', label: '居民点', color: '#202020', geometry: 'point', symbol: svg('<circle cx="24" cy="14" r="6" fill="white" stroke="#202020" stroke-width="1.6"/><circle cx="24" cy="14" r="2.3" fill="#202020"/>') },
  { id: 'peak', label: '山峰', color: '#202020', geometry: 'point', symbol: svg('<path d="M24 6 L30 21 H18 Z" fill="#202020"/>') },
  { id: 'railway', label: '铁路', color: '#202020', geometry: 'line', symbol: svg('<path d="M3 14 H45" stroke="#202020" stroke-width="5"/><path d="M3 14 H45" stroke="white" stroke-width="2.8" stroke-dasharray="10 10" stroke-dashoffset="-10"/>') },
  { id: 'road', label: '公路', hint: '用粉红色曲线表示公路。', color: '#ed4b9d', geometry: 'line', symbol: svg('<path d="M3 18C17 5 29 25 45 17" fill="none" stroke="#ed4b9d" stroke-width="2.5"/>') },
  { id: 'river', label: '常年河流', color: '#20b9e9', geometry: 'line', symbol: svg('<path d="M3 18 C10 4 18 25 26 12 S38 10 45 9" fill="none" stroke="#20b9e9" stroke-width="2"/>') },
  { id: 'lake', label: '常年湖泊', color: '#20b9e9', fillColor: '#a8dff3', geometry: 'area', symbol: svg('<path d="M9 16 C4 9 16 10 18 5 C24 2 29 7 32 6 C43 5 41 13 35 15 C38 24 28 22 24 20 C15 24 18 16 9 16Z" fill="#a8dff3" stroke="#20b9e9" stroke-width="1.5"/>') },
  { id: 'airport', label: '机场', hint: '洋红色圆圈内的飞机表示机场；点击地图标注。', color: '#ec008c', geometry: 'point', symbol: svg('<circle cx="24" cy="14" r="10" fill="white" stroke="#ec008c" stroke-width="1.6"/><path d="M24 5.5C23 5.5 22.8 7 22.8 8.5V12L16.5 16V18L22.8 15.5V20L20.5 21.5V23L24 21.5L27.5 23V21.5L25.2 20V15.5L31.5 18V16L25.2 12V8.5C25.2 7 25 5.5 24 5.5Z" fill="#ec008c"/>') },
  { id: 'port', label: '港口', hint: '蓝色圆圈内的船锚表示港口；点击地图标注。', color: '#20b9e9', geometry: 'point', symbol: svg('<circle cx="24" cy="14" r="10" fill="white" stroke="#20b9e9" stroke-width="1.6"/><circle cx="24" cy="8" r="1.7" fill="none" stroke="#20b9e9" stroke-width="1.5"/><path d="M24 10V22M20 12H28M17 16C17 21 20 22 24 22C28 22 31 21 31 16M15 17L17 15L20 17M28 17L31 15L33 17" fill="none" stroke="#20b9e9" stroke-width="1.7" stroke-linejoin="round"/>') },
  { id: 'expressway', label: '高速公路', hint: '粉红色外线与黄色内芯表示高速公路。', color: '#ed4b9d', geometry: 'line', symbol: svg('<path d="M3 14H45" stroke="#ed4b9d" stroke-width="5"/><path d="M3 14H45" stroke="#ffd541" stroke-width="2.5"/>') },
  { id: 'sea-route', label: '航海线', color: '#20b9e9', geometry: 'line', dashArray: '10 6', symbol: svg('<path d="M3 14H45" stroke="#20b9e9" stroke-width="1.8" stroke-dasharray="10 6"/>') },
  { id: 'seasonal-river', label: '时令河', hint: '用蓝色虚线表示季节性河流。', color: '#20b9e9', geometry: 'line', dashArray: '6 5', symbol: svg('<path d="M3 18C10 4 18 25 26 12S38 10 45 9" fill="none" stroke="#20b9e9" stroke-width="2" stroke-dasharray="5 4"/>') },
  { id: 'seasonal-lake', label: '时令湖', hint: '用蓝色虚线轮廓表示季节性湖泊。', color: '#20b9e9', fillColor: '#a8dff3', geometry: 'area', dashArray: '6 5', symbol: svg('<path d="M9 16C4 9 16 10 18 5C24 2 29 7 32 6C43 5 41 13 35 15C38 24 28 22 24 20C15 24 18 16 9 16Z" fill="#a8dff3" stroke="#20b9e9" stroke-width="1.5" stroke-dasharray="4 3"/>') },
  { id: 'reservoir', label: '水库', hint: '圈绘库区，最后一点与起点之间的闭合边表示水坝。', color: '#20b9e9', fillColor: '#a8dff3', geometry: 'area', symbol: svg('<path d="M3 13C11 8 16 12 20 13M33 16Q40 16 45 19" fill="none" stroke="#20b9e9" stroke-width="1.7"/><path d="M20 13C20 6 29 6 32 10L36 17C29 23 18 23 20 13Z" fill="#a8dff3" stroke="#20b9e9" stroke-width="1.7"/><path d="M40 7L36 10L34 24L37 27" fill="none" stroke="#20b9e9" stroke-width="1.7"/>') },
  { id: 'hydropower-station', label: '水电站', color: '#20b9e9', geometry: 'point', symbol: svg('<g fill="none" stroke="#20b9e9" stroke-width="1.6"><path d="M24 3V7M24 21V25M13 14H17M31 14H35M16 6L19 9M29 19L32 22M16 22L19 19M29 9L32 6"/><circle cx="24" cy="14" r="8" fill="#fff200"/></g><circle cx="24" cy="14" r="2.3" fill="#20b9e9"/>') },
  { id: 'waterfall', label: '瀑布', color: '#20b9e9', geometry: 'point', symbol: svg('<path d="M3 8H45M3 19H45M14 8V23M20 8V23M26 8V23M32 8V23" fill="none" stroke="#20b9e9" stroke-width="1.7"/>') },
  { id: 'volcano', label: '火山', color: '#ec008c', geometry: 'point', symbol: svg('<path d="M17 9H31L35 20H13Z" fill="#ec008c"/>') },
  { id: 'mountain-pass', label: '关隘', color: '#202020', geometry: 'point', symbol: svg('<path d="M14 9L34 19M14 19L34 9" fill="none" stroke="#202020" stroke-width="1.8"/>') },
  { id: 'great-wall', label: '长城', hint: '沿线路绘制，单侧垛口表示长城。', color: '#202020', geometry: 'line', symbol: svg('<path d="M3 19H9V11H16V19H24V11H31V19H39V11H45" fill="none" stroke="#202020" stroke-width="2.3"/>') },
]

export const textbookCategories: { id: string; label: string; kinds: FeatureKind[] }[] = [
  { id: 'transport', label: '交通与设施', kinds: ['airport', 'port', 'railway', 'road', 'expressway', 'sea-route'] },
  { id: 'water', label: '水系与水利', kinds: ['river', 'seasonal-river', 'lake', 'seasonal-lake', 'reservoir', 'hydropower-station', 'waterfall'] },
  { id: 'terrain', label: '地形与地物', kinds: ['settlement', 'peak', 'volcano', 'mountain-pass', 'great-wall'] },
]

// Classroom conventions for campus sketching, deliberately separate from textbook symbols.
export const campusFeatureTypes: FeatureType[] = [
  { id: 'campus-road', label: '校园道路', color: '#bd8440', geometry: 'line', symbol: svg('<path d="M3 14 H45" stroke="#bd8440" stroke-width="2.5"/>') },
  { id: 'campus-gate', label: '校门', color: '#36536b', geometry: 'point', symbol: svg('<path d="M11 23V8H37V23M17 23V13H31V23" fill="none" stroke="#36536b" stroke-width="3"/><path d="M9 7H39" stroke="#36536b" stroke-width="3"/>') },
  { id: 'teaching-building', label: '教学楼', color: '#ac5d4a', fillColor: '#e8b29f', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#e8b29f" stroke="#ac5d4a" stroke-width="2"/>') },
  { id: 'library', label: '图书馆', color: '#70549b', geometry: 'point', symbol: svg('<path d="M24 8Q16 3 9 7V22Q17 18 24 23Q31 18 39 22V7Q32 3 24 8Z" fill="#e2d7ee" stroke="#70549b" stroke-width="2"/><path d="M24 8V23" stroke="#70549b" stroke-width="2"/>') },
  { id: 'canteen', label: '食堂', color: '#9d692b', geometry: 'point', symbol: svg('<circle cx="26" cy="14" r="8" fill="#f4d7a7" stroke="#9d692b" stroke-width="2"/><path d="M10 4V13M14 4V13M10 10H14M12 13V24M39 4V24M39 4Q33 10 39 14" fill="none" stroke="#9d692b" stroke-width="2"/>') },
  { id: 'sports-field', label: '操场', hint: '圈出操场范围；3D 中呈现跑道和运动场地。', color: '#ba7654', fillColor: '#f0c59e', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#f0c59e" stroke="#ba7654" stroke-width="2"/>') },
  { id: 'green-space', label: '绿地', hint: '圈出绿地范围；3D 中呈现草地和树丛。', color: '#548550', fillColor: '#b5d8a1', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#b5d8a1" stroke="#548550" stroke-width="2"/>') },
  { id: 'campus-water', label: '湖泊', hint: '圈出校园湖泊或池塘；3D 中沿轮廓生成水面。', color: '#358ba1', fillColor: '#a2dce9', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#a2dce9" stroke="#358ba1" stroke-width="2"/>') },
  { id: 'tree', label: '树木', hint: '点击标注单棵树；大片树木可使用绿地图例。', color: '#4e8153', geometry: 'point', symbol: svg('<path d="M24 16V25" stroke="#9b704b" stroke-width="4"/><path d="M12 14C7 7 17 2 22 5C25 0 35 5 33 10C42 16 30 23 24 19C17 24 7 20 12 14Z" fill="#9ac580" stroke="#4e8153" stroke-width="1.8"/>') },
  { id: 'laboratory', label: '实验楼', color: '#895375', fillColor: '#dbb2cc', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#dbb2cc" stroke="#895375" stroke-width="2"/>') },
  { id: 'administration', label: '行政楼', color: '#526c92', fillColor: '#adc5e5', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#adc5e5" stroke="#526c92" stroke-width="2"/>') },
  { id: 'dormitory', label: '宿舍', color: '#a7742e', fillColor: '#efd59f', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#efd59f" stroke="#a7742e" stroke-width="2"/>') },
  { id: 'gymnasium', label: '体育馆', color: '#886145', fillColor: '#d5b49a', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#d5b49a" stroke="#886145" stroke-width="2"/>') },
  { id: 'basketball-court', label: '篮球场', color: '#b45b37', fillColor: '#eea888', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#eea888" stroke="#b45b37" stroke-width="2"/>') },
  { id: 'parking', label: '停车场', color: '#64778c', fillColor: '#bfcbd7', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#bfcbd7" stroke="#64778c" stroke-width="2"/>') },
  { id: 'plaza', label: '广场', color: '#937b57', fillColor: '#e4d8bf', geometry: 'area', symbol: svg('<rect x="9" y="6" width="30" height="16" fill="#e4d8bf" stroke="#937b57" stroke-width="2"/>') },
  { id: 'footpath', label: '步行道', color: '#bd8440', geometry: 'line', dashArray: '5 5', symbol: svg('<path d="M3 14 H45" stroke="#bd8440" stroke-width="2.5" stroke-dasharray="5 5"/>') },
  { id: 'campus-fence', label: '围墙', hint: '沿校园边界依次选点绘制围墙；3D 中生成连续墙体。', color: '#6b6675', geometry: 'line', symbol: svg('<path d="M3 14 H45" stroke="#6b6675" stroke-width="3"/><path d="M7 9V19M18 9V19M30 9V19M41 9V19" stroke="#6b6675" stroke-width="3"/>') },
  { id: 'toilet', label: '卫生间', color: '#3a7e8b', geometry: 'point', symbol: svg('<rect x="7" y="4" width="34" height="20" rx="3" fill="#e1f2f2" stroke="#3a7e8b" stroke-width="2"/><path d="M12 9L15 19L19 11L23 19L26 9M36 10C27 5 27 23 36 18" fill="none" stroke="#3a7e8b" stroke-width="2" stroke-linejoin="round"/>') },
  { id: 'infirmary', label: '校医室', color: '#456faa', geometry: 'point', symbol: svg('<rect x="13" y="3" width="22" height="22" rx="3" fill="#e3edf9" stroke="#456faa" stroke-width="2"/><path d="M21 7H27V11H31V17H27V21H21V17H17V11H21Z" fill="#456faa"/>') },
  { id: 'bus-stop', label: '校车站', color: '#466d79', geometry: 'point', symbol: svg('<rect x="13" y="3" width="22" height="19" rx="4" fill="#d5e6ec" stroke="#466d79" stroke-width="2"/><path d="M16 7H32V14H16Z" fill="white" stroke="#466d79"/><path d="M17 22V25M31 22V25" stroke="#466d79" stroke-width="3"/><circle cx="18" cy="18" r="1.5" fill="#466d79"/><circle cx="30" cy="18" r="1.5" fill="#466d79"/>') },
]
export const featureTypes = [...textbookFeatureTypes, ...campusFeatureTypes]
export const campusCategories: { id: string; label: string; kinds: FeatureKind[] }[] = [
  { id: 'teaching', label: '教学与办公', kinds: ['teaching-building', 'laboratory', 'library', 'administration'] },
  { id: 'services', label: '生活与服务', kinds: ['dormitory', 'canteen', 'toilet', 'infirmary'] },
  { id: 'activities', label: '运动与活动', kinds: ['sports-field', 'gymnasium', 'basketball-court', 'plaza'] },
  { id: 'environment', label: '交通与环境', kinds: ['campus-gate', 'campus-road', 'footpath', 'parking', 'bus-stop', 'campus-fence', 'green-space', 'tree', 'campus-water'] },
]

// Ownership follows the step that created a feature, even when another step displays it.
export function lastFeatureInStep<T extends { step: DrawingStep }>(features: readonly T[], step: DrawingStep | null): T | undefined {
  for (let index = features.length - 1; index >= 0; index--) {
    if (features[index]!.step === step) return features[index]
  }
}

// Each drawing stage exposes its own symbol set; features remain stored in their stage.
export function getLegendGroups(activeSet: LegendSet) {
  return ([
    { id: 'textbook' as const, label: '教材图例', items: textbookCategories.flatMap(group => group.kinds.map(kind => textbookFeatureTypes.find(item => item.id === kind)!)) },
    { id: 'campus' as const, label: '校园图例 · 非正式', items: campusFeatureTypes },
  ]).filter(group => group.id === activeSet)
}

export function bearingBetween(a: Coordinate, b: Coordinate) {
  const radians = Math.PI / 180
  const lat1 = a.lat * radians
  const lat2 = b.lat * radians
  const delta = (b.lng - a.lng) * radians
  const y = Math.sin(delta) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta)
  return (Math.atan2(y, x) / radians + 360) % 360
}

export function directionName(bearing: number) {
  const names = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  return names[Math.round(((bearing % 360 + 360) % 360) / 45) % 8]!
}

export function formatDistance(metres: number) {
  if (!Number.isFinite(metres) || metres < 0) return '—'
  return metres >= 1000 ? `${(metres / 1000).toFixed(2)} 千米` : `${Math.round(metres)} 米`
}

export function paperDistance(centimetres: number, denominator: number) {
  return centimetres * denominator / 100
}

// Reject coincident/collinear vertices rather than saving invisible area features.
export function isValidArea(points: Coordinate[]) {
  if (points.length < 3) return false
  const origin = points[0]!
  let twiceArea = 0
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    twiceArea += (a.lng - origin.lng) * (b.lat - origin.lat) - (b.lng - origin.lng) * (a.lat - origin.lat)
  }
  return Math.abs(twiceArea) > 1e-12
}
