// Latitude, pressure widths and wind endpoints follow general-atmospheric-circulation.
// Angles are stored in arcminutes at the application boundary; Three.js uses radians.
export const OBLIQUITY_MINUTES = 23 * 60 + 26
export const OBLIQUITY = OBLIQUITY_MINUTES / 60
export const POLAR_CIRCLE = 90 - OBLIQUITY
export const palette = {
  single: '#efc985',
  rising: '#ffa77a',
  sinking: '#79ccec',
  horizontalFlow: '#cbd3d5',
  hadley: '#2ed9c3',
  ferrel: '#ffb84d',
  polar: '#75a7ff',
  high: '#a6ead8',
  low: '#c6b8ff',
  warm: '#ff5a47',
  cold: '#72b8ff',
  summerMonsoon: '#ff4f9a',
  southSummerMonsoon: '#c166ff',
  winterMonsoon: '#d6ff61',
  southWinterMonsoon: '#35c79a',
  solar: '#ffd66b',
}
export function formatAngle(degrees: number) {
  const minutes = Math.round(Math.abs(degrees) * 60)
  return `${Math.floor(minutes / 60)}°${String(minutes % 60).padStart(2, '0')}′`
}
export function seasonalShift(month: number) {
  return -7.5 * Math.cos(((month - 1) / 12) * Math.PI * 2)
}
export function shiftLatitude(lat: number, shift: number) {
  return Math.max(-88, Math.min(88, lat + shift * Math.cos((Math.abs(lat) * Math.PI) / 180)))
}
export const SOLAR_REFERENCE_YEAR = 2026
// USNO approximate solar longitude; the app intentionally fixes obliquity at 23°26′.
// Fixed reference dates avoid falsely equating a whole month with its solstice/equinox.
export function subsolarLatitude(month: number) {
  const calendarMonth = ((Math.floor(month) - 1) % 12 + 12) % 12
  const days = (Date.UTC(SOLAR_REFERENCE_YEAR, calendarMonth, 15, 12) - Date.UTC(2000, 0, 1, 12)) / 86400000
  const rad = Math.PI / 180
  const anomaly = (357.529 + .98560028 * days) * rad
  const longitude = (280.459 + .98564736 * days + 1.915 * Math.sin(anomaly) + .020 * Math.sin(2 * anomaly)) * rad
  return Math.asin(Math.sin(OBLIQUITY * rad) * Math.sin(longitude)) / rad
}
export function damp(current: number, target: number, dt: number) {
  return target + (current - target) * Math.exp(-dt * 4.5)
}
export type CellKind = 'hadley' | 'ferrel' | 'polar'
export type LayerKey =
  | 'single'
  | 'hadley'
  | 'ferrel'
  | 'polar'
  | 'pressure'
  | 'pressureField'
  | 'isobars'
  | 'wind'
  | 'monsoons'
  | 'currents'
  | 'grid'
  | 'labels'
  | 'atmosphere'
  | 'sunlight'
export type Layers = Record<LayerKey, boolean>
export interface Selection {
  focus?: string
  title: string
  text: string
  color: string
  tag: string
}
export const cellDefinitions = [
  {
    kind: 'hadley' as CellKind,
    name: '哈德莱环流',
    from: 30,
    to: 0,
    range: '0°—30°',
    text: '赤道空气受热上升，高空气流向较高纬度运动，在约30°附近下沉；近地面气流返回赤道。',
  },
  {
    kind: 'ferrel' as CellKind,
    name: '费雷尔环流',
    from: 30,
    to: 60,
    range: '30°—60°',
    text: '近地面气流从副热带流向副极地，在约60°附近上升，高空回流。它是由相邻环流和中纬度涡旋共同维持的间接环流。',
  },
  {
    kind: 'polar' as CellKind,
    name: '极地环流',
    from: 88,
    to: 60,
    range: '60°—90°',
    text: '极地冷空气下沉，近地面流向较低纬度，在约60°附近与西风相遇上升，高空返回极地。',
  },
]
export const pressureDefinitions = [
  { lat: 88, name: '极地高气压带', high: true, halfWidth: 7 },
  { lat: 60, name: '副极地低气压带', high: false, halfWidth: 5.5 },
  { lat: 30, name: '副热带高气压带', high: true, halfWidth: 5.5 },
  { lat: 0, name: '赤道低气压带', high: false, halfWidth: 7 },
  { lat: -30, name: '副热带高气压带', high: true, halfWidth: 5.5 },
  { lat: -60, name: '副极地低气压带', high: false, halfWidth: 5.5 },
  { lat: -88, name: '极地高气压带', high: true, halfWidth: 7 },
]
export const windDefinitions = [
  // Show the interior trade-wind segment: seasonal translation must not carry
  // an unchanged easterly arrow across the equator. Regional crossing is in monsoonWinds.
  { name: '东北信风', kind: 'hadley' as CellKind, from: 28, to: 10, lonFrom: 14, lonTo: -14 },
  { name: '东南信风', kind: 'hadley' as CellKind, from: -28, to: -10, lonFrom: 14, lonTo: -14 },
  { name: '北半球盛行西风', kind: 'ferrel' as CellKind, from: 32, to: 58, lonFrom: -14, lonTo: 14 },
  { name: '南半球盛行西风', kind: 'ferrel' as CellKind, from: -32, to: -58, lonFrom: -14, lonTo: 14 },
  { name: '北半球极地东风', kind: 'polar' as CellKind, from: 86, to: 62, lonFrom: 13, lonTo: -13 },
  { name: '南半球极地东风', kind: 'polar' as CellKind, from: -86, to: -62, lonFrom: 13, lonTo: -13 },
]
export type Basin = 'all' | 'pacific' | 'atlantic' | 'indian'
export const bandControls = {
  pressure: pressureDefinitions.map(def => ({
    id: `pressure-${def.lat}`,
    name: `${def.lat === 0 ? '' : def.lat > 0 ? '北半球 · ' : '南半球 · '}${def.name}`,
    color: def.high ? palette.high : palette.low,
  })),
  wind: windDefinitions.map(def => ({ id: `wind-${def.from}`, name: def.name, color: palette[def.kind] })),
}
export function createBandVisibility(): Record<string, boolean> {
  return Object.fromEntries([...bandControls.pressure, ...bandControls.wind].map(item => [item.id, true]))
}
export type MonsoonSeason = 'summer' | 'winter'
export type SeasonalRegime = 'eastAsia' | 'southAsia' | 'northIndian' | 'somali'
// Schematic seasonal envelopes, NOT measured monthly wind/current speeds.
// Separate regional timing avoids implying that winds and ocean currents reverse together.
const seasonalProfiles: Record<SeasonalRegime, readonly number[]> = {
  eastAsia: [-1, -.9, -.55, -.1, .45, .85, 1, .9, .45, -.15, -.65, -.95],
  southAsia: [-1, -.85, -.45, -.2, .3, .9, 1, 1, .7, .1, -.65, -.95],
  northIndian: [-1, -.95, -.6, -.25, .1, .65, 1, 1, .8, .25, -.4, -.85],
  somali: [-1, -.9, -.25, .1, .65, 1, 1, .9, .55, -.1, -.65, -.9],
}
export function seasonalDirection(month: number, regime: SeasonalRegime) {
  const position = ((month - 1) % 12 + 12) % 12
  const index = Math.floor(position), fraction = position - index
  const blend = fraction * fraction * (3 - 2 * fraction)
  const profile = seasonalProfiles[regime]
  return profile[index]! + (profile[(index + 1) % 12]! - profile[index]!) * blend
}
export function monsoonStrength(direction: number, season: MonsoonSeason) {
  // Weak overlapping seasonal patterns represent a transition, not a windless globe.
  const summer = Math.max(0, Math.min(1, (direction + .2) / .4))
  const blend = summer * summer * (3 - 2 * summer)
  const strength = .25 + .75 * Math.abs(direction)
  return strength * (season === 'summer' ? blend : 1 - blend)
}
export const monsoonWinds: { name: string; season: MonsoonSeason; regime: SeasonalRegime; points: [number, number][]; note: string }[] = [
  {
    name: '东亚夏季东南季风',
    regime: 'eastAsia',
    season: 'summer',
    points: [
      [16, 150],
      [20, 143],
      [24, 135],
      [29, 126],
      [34, 116],
    ],
    note: '夏季从西北太平洋吹向东亚大陆，带来暖湿空气。风向按来向命名。',
  },
  {
    name: '南亚西南季风 · 阿拉伯海支流',
    regime: 'southAsia',
    season: 'summer',
    points: [
      [-12, 65],
      [-6, 57],
      [0, 52],
      [3, 54],
      [7, 64],
      [16, 72],
      [25, 80],
    ],
    note: '南半球东南信风先向西北吹，在西印度洋跨过赤道后向右偏转，成为吹向东北的西南季风，经阿拉伯海进入南亚。路径为教学示意。',
  },
  {
    name: '南亚西南季风 · 孟加拉湾支流',
    regime: 'southAsia',
    season: 'summer',
    points: [
      [3, 68],
      [5, 78],
      [8, 86],
      [13, 92],
      [22, 90],
      [26, 85],
    ],
    note: '展示跨赤道气流转向后的北半球支流：西南季风经孟加拉湾输送水汽，受地形影响转向印度东北部和恒河平原。路径为教学示意。',
  },
  {
    name: '东亚冬季西北季风',
    regime: 'eastAsia',
    season: 'winter',
    points: [
      [50, 98],
      [42, 104],
      [34, 111],
      [26, 120],
      [19, 130],
    ],
    note: '冬季空气从亚洲大陆高压区吹向海洋，东亚盛行西北季风。',
  },
  {
    name: '南亚冬季东北季风',
    regime: 'southAsia',
    season: 'winter',
    points: [
      [24, 90],
      [20, 87],
      [15, 84],
      [10, 81],
      [6, 78],
    ],
    note: '示意喜马拉雅山以南的东北季风，经孟加拉湾吹向印度东南部和斯里兰卡附近；海上增湿后可带来降水。不是从青藏高原穿越喜马拉雅山的近地面风路。',
  },
]
export interface OceanCurrent {
  name: string
  basin: Basin
  warm: boolean
  points: [number, number][]
  note: string
  monsoon?: boolean
  regime?: SeasonalRegime
  seasonalTemperature?: boolean
  surfaceMonths?: readonly number[]
  seasonLabel?: string
}
export function currentVisibleInMonth(current: Pick<OceanCurrent, 'surfaceMonths'>, month: number) {
  const calendarMonth = ((Math.floor(month) - 1) % 12 + 12) % 12 + 1
  return !current.surfaceMonths || current.surfaceMonths.includes(calendarMonth)
}
// Schematic surface-current routes, not observational velocity fields. Points are [latitude, longitude].
export const oceanCurrents: OceanCurrent[] = [
  {
    name: '北赤道暖流',
    basin: 'pacific',
    warm: true,
    points: [
      [12, -118],
      [12, -155],
      [12, 170],
      [12, 145],
      [14, 130],
    ],
    note: '东北信风推动热带表层海水向西流动。',
  },
  {
    name: '日本暖流',
    basin: 'pacific',
    warm: true,
    points: [
      [16, 126],
      [24, 123],
      [30, 131],
      [35, 143],
    ],
    note: '又称黑潮，沿北太平洋西部边界向较高纬度输送热量。',
  },
  {
    name: '北太平洋暖流',
    basin: 'pacific',
    warm: true,
    points: [
      [36, 148],
      [39, 175],
      [42, -155],
      [43, -130],
    ],
    note: '在盛行西风影响下总体向东运动。与日本暖流图示之间的小留白用于区分名称，不代表水流中断。',
  },
  {
    name: '阿拉斯加暖流',
    basin: 'pacific',
    warm: true,
    points: [
      [44, -135],
      [51, -135],
      [57, -145],
      [55, -157],
    ],
    note: '北太平洋暖流的北支，沿阿拉斯加湾运动。',
  },
  {
    name: '加利福尼亚寒流',
    basin: 'pacific',
    warm: false,
    points: [
      [45, -128],
      [35, -124],
      [25, -116],
      [18, -112],
    ],
    note: '沿北美洲西岸向低纬度流动。',
  },
  {
    name: '千岛寒流',
    basin: 'pacific',
    warm: false,
    points: [
      [53, 164],
      [46, 153],
      [39, 144],
    ],
    note: '冷水向南流动，在日本附近与暖流相遇。',
  },
  {
    name: '南赤道暖流',
    basin: 'pacific',
    warm: true,
    points: [
      [-12, -85],
      [-12, -125],
      [-12, -165],
      [-12.5, 170],
      [-12.5, 163],
      [-15, 155],
      [-17, 149],
    ],
    note: '东南信风推动表层海水向西运动。',
  },
  {
    name: '东澳大利亚暖流',
    basin: 'pacific',
    warm: true,
    points: [
      [-20, 150.5],
      [-23, 153],
      [-28, 155],
      [-32, 154.5],
      [-34, 158],
    ],
    note: '沿澳大利亚东侧向南输送暖水，约31°—34°S附近常离岸；末段示意向塔斯曼海的分支。与南赤道暖流之间的小留白用于区分名称，不代表水流中断；端点与分离点均为示意。',
  },
  {
    name: '秘鲁寒流',
    basin: 'pacific',
    warm: false,
    points: [
      [-43, -76],
      [-30, -74],
      [-17, -75],
      [-10, -80],
      [-5, -83],
    ],
    note: '沿南美洲西岸向北流动，伴有沿岸上升流。',
  },
  {
    name: '太平洋赤道逆流',
    basin: 'pacific',
    warm: true,
    points: [
      [5, 142],
      [6, 175],
      [6, -150],
      [5, -100],
    ],
    note: '在南、北赤道洋流之间向东运动。',
  },
  {
    name: '北赤道暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [18, -24],
      [17, -32],
      [14, -42],
      [16, -61],
    ],
    note: '东北信风驱动的向西表层海流。',
  },
  {
    name: '墨西哥湾暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [24, -81],
      [26, -79.5],
      [30, -79],
      [35, -74],
      [38, -68],
      [42, -49],
    ],
    note: '北大西洋西部的强暖流，向东北输送热量。',
  },
  {
    name: '北大西洋暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [42, -49],
      [49, -32],
      [55, -19],
      [61, -7],
    ],
    note: '墨西哥湾暖流的延续，对西欧沿岸气候有重要影响。',
  },
  {
    name: '加那利寒流',
    basin: 'atlantic',
    warm: false,
    points: [
      [37, -13],
      [33, -15],
      [28, -19.5],
      [20, -20],
      [13, -24],
    ],
    note: '沿非洲西北侧向较低纬度流动。',
  },
  {
    name: '拉布拉多寒流',
    basin: 'atlantic',
    warm: false,
    points: [
      [60, -57],
      [53, -53],
      [45, -51],
    ],
    note: '向南输送冷水，在纽芬兰附近与暖流相遇。',
  },
  {
    name: '南赤道暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [-8, 7],
      [-10, -15],
      [-11, -35],
    ],
    note: '横贯南大西洋热带海域的向西海流。',
  },
  {
    name: '巴西暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [-12, -36],
      [-16, -37],
      [-19, -38],
      [-22, -39.5],
      [-24, -42],
      [-28, -46],
      [-34, -50],
      [-38, -52],
    ],
    note: '沿南美洲东岸向南流动，是南大西洋的西边界流；在约38°S附近与马尔维纳斯寒流交汇，交汇区会移动。',
  },
  {
    name: '本格拉寒流',
    basin: 'atlantic',
    warm: false,
    points: [
      [-35, 16],
      [-30, 13],
      [-26, 11],
      [-22, 8],
      [-18, 4],
      [-15, -1],
      [-12, -7],
    ],
    note: '沿非洲西南侧向北输送冷水，图中只保留一条主线，在北段转向西北外海，逐渐过渡至南赤道洋流。实际流系存在分支，本图未展开；安哥拉—本格拉锋约在15°—17°S附近，外海延伸不能理解为沿岸寒流一直到赤道。端点和留白均为教学示意。',
  },
  {
    name: '南赤道暖流',
    basin: 'indian',
    warm: true,
    points: [
      [-13, 104],
      [-14, 78],
      [-15, 53],
    ],
    note: '南印度洋低纬度向西运动的暖流。',
  },
  {
    name: '厄加勒斯暖流',
    basin: 'indian',
    warm: true,
    points: [
      [-27, 34],
      [-30, 32],
      [-33, 29],
      [-35.5, 24.5],
      [-38, 20],
      [-40, 19],
      [-40.5, 23],
      [-40, 30],
    ],
    note: '沿非洲东南岸向南流动；末段示意南端回折并接向东的厄加勒斯回流，回折位置并非固定。',
  },
  {
    name: '西澳大利亚寒流',
    basin: 'indian',
    warm: false,
    points: [
      [-36, 110],
      [-31, 110],
      [-26, 109.5],
      [-21, 108.5],
      [-17, 107],
      [-15, 104],
    ],
    note: '示意澳大利亚西侧外海宽而较弱的向北冷水输送，北端弯向西北并过渡至南赤道洋流。与相邻路线的留白仅用于辨认，端点并非实测固定边界。近岸另有向南的利文暖流，不能把整个西岸都理解为向北寒流。',
  },
  {
    name: '北印度洋季风洋流',
    regime: 'northIndian',
    basin: 'indian',
    warm: true,
    points: [
      [7, 53],
      [5, 67],
      [5, 80],
      [8, 91],
    ],
    note: '示意斯里兰卡以南连接阿拉伯海与孟加拉湾的季风洋流：冬季总体向西，夏季总体向东。共用路线仅表示通道，冬夏流轴和分支实际不同；过渡不代表逐月实测流速。',
    monsoon: true,
  },
  {
    name: '东格陵兰寒流',
    basin: 'atlantic',
    warm: false,
    points: [
      [78, -8],
      [71, -19],
      [65, -34],
      [59.5, -42.5],
    ],
    note: '沿格陵兰东岸向南输送极地冷水。',
  },
  {
    name: '挪威暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [61, -3],
      [65, 4],
      [69, 12],
      [73, 20],
    ],
    note: '北大西洋暖水向东北延伸，沿挪威近海进入高纬海域。',
  },
  {
    name: '福克兰寒流',
    basin: 'atlantic',
    warm: false,
    points: [
      [-55, -57],
      [-51, -56],
      [-45, -57],
      [-40, -54],
      [-38, -52],
    ],
    note: '又称马尔维纳斯寒流，图示绕过群岛东侧、沿南美洲东南外海向北的主要通道，约38°S附近与巴西暖流交汇；未展开岛屿周围的全部分支。',
  },
  {
    name: '大西洋赤道逆流',
    basin: 'atlantic',
    warm: true,
    surfaceMonths: [6, 7, 8, 9, 10, 11, 12],
    seasonLabel: '约6—12月表层',
    points: [
      [6, -48],
      [6, -34],
      [5, -20],
      [4, -10],
    ],
    note: '示意北半球夏秋至初冬横贯大西洋的向东表层通道。西部在冬春常减弱、消失或反向，因此不全年画成连续东向流。约6—12月为教学显示窗口，不是逐年固定的开停日期。',
  },
  {
    name: '几内亚暖流',
    basin: 'atlantic',
    warm: true,
    points: [
      [4, -10],
      [4, -4],
      [3, 3],
      [2, 7],
    ],
    note: '沿几内亚湾北部近岸向东流动。',
  },
  {
    name: '莫桑比克暖流',
    basin: 'indian',
    warm: true,
    points: [
      [-12, 43],
      [-17, 42],
      [-22, 40],
      [-27, 34],
    ],
    note: '表示莫桑比克海峡内总体向南的暖水输送；实际以复杂涡旋输送为重要特征。',
  },
  {
    name: '东马达加斯加暖流',
    basin: 'indian',
    warm: true,
    points: [
      [-15, 52],
      [-20, 50],
      [-25, 48],
      [-28, 43],
    ],
    note: '南赤道洋流在马达加斯加岛附近分支，暖水沿岛东侧向南流动。',
  },
  {
    name: '索马里洋流',
    regime: 'somali',
    basin: 'indian',
    warm: false,
    monsoon: true,
    seasonalTemperature: true,
    points: [
      [-3, 43],
      [2, 47],
      [6, 50],
      [10, 53],
    ],
    note: '夏季向东北，伴随沿岸上升流，教学配色为冷色；冬季向西南，示意为暖色。温度性质与季节、位置有关，不能全年固定为寒流或暖流。',
  },
  {
    name: '印度洋南赤道逆流',
    basin: 'indian',
    surfaceMonths: [11, 12, 1, 2, 3, 4],
    seasonLabel: '冬季表层支流',
    warm: true,
    points: [
      [-5, 48],
      [-6, 60],
      [-7, 76],
      [-7, 88],
    ],
    note: '北半球冬季在赤道以南显示向东的表层支流。夏季主要为次表层流，上方可被向西流覆盖，因此本表层图在夏季隐藏；不表示整层海水停止。约11—4月为教学显示窗口，并非实测开停日期。',
  },
  {
    name: '西风漂流',
    basin: 'all',
    warm: false,
    points: [
      [-54, -180],
      [-54, -120],
      [-56, -90],
      [-58, -75],
      [-58, -65],
      [-57, -55],
      [-55, -40],
      [-56, -35],
      [-55, -25],
      [-54, 0],
      [-54, 60],
      [-54, 120],
      [-54, 180],
    ],
    note: '南极绕极流（西风漂流）在南半球西风驱动下总体向东，经南美洲以南的德雷克海峡环绕南极洲；路径受陆地与海底地形影响，并非固定纬线。',
  },
]
