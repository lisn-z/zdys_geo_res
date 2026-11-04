/** Copied from the project's general-atmospheric-circulation/simulation/model.ts.
 * Geographic teaching routes, NOT measured ocean velocity or temperature fields.
 * All climate snapshots in this lesson are December; seasonal routes use winter direction.
 * Coordinate order is [latitude, longitude]. Original route notes retained below.
 */
type Basin = 'all' | 'pacific' | 'atlantic' | 'indian'
type SeasonalRegime = 'eastAsia' | 'southAsia' | 'northIndian' | 'somali'
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
