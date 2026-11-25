/** Atlas categories and examples, kept separate from the supplied 12-class GIS map. */
export interface TextbookClimateType {
  readonly id: string
  readonly name: string
  /** Broad GIS-class association for information cards, never a new spatial boundary. */
  readonly sourceClimateId: string | null
  readonly color: string
  readonly group?: string
  readonly distribution: string
  readonly temperature: string
  readonly precipitation: string
  readonly characteristics: string
  readonly mechanism: string
  readonly mappingNote?: string
}

export const climateTextbookSource = Object.freeze({
  title: '普通高中教科书·地理图册 选择性必修1 自然地理基础',
  publisher: '中国地图出版社、中华地图学社',
  isbn: '9787558803215',
  url: 'https://basic.smartedu.cn/tchMaterial/detail?catalogType=tchMaterial&contentId=66dcb89a-f1ee-46c1-b022-bef71b2b97fd&contentType=assets_document&subCatalog=tchMaterial',
  pages: [30, 31] as const,
  figure: '世界气候类型分布及12地气温、降水量图',
  monthlyData: 'estimated-from-chart' as const,
  note: '月值按图册曲线与柱形估读；年值、海拔保留图册标注。原图未注明统计时段，不能作为实时资料或精确气候平均值使用。',
  classificationNote: '跨页图例实际有17个色块，其中温带大陆性气候下列4个子类；12个点位是示例，不与全部类型一一对应。',
})

// Colors sampled inside the official atlas legend swatches. The broad GIS map
// retains its OWN source colors and classes; these colors must not relabel its polygons.
export const textbookClimateTypes: readonly TextbookClimateType[] = [
  { id: 'tropical-rainforest', name: '热带雨林气候', sourceClimateId: 'tropical-rainforest', color: '#f3afb0',
    distribution: '赤道附近的亚马孙平原、刚果盆地和马来群岛等地。',
    temperature: '全年高温，气温年较差小。', precipitation: '各月降水较多，没有明显干季。',
    characteristics: '全年高温多雨。', mechanism: '赤道低气压带的上升气流和充足水汽有利于降水；局部还受地形、海陆位置影响。' },
  { id: 'tropical-desert', name: '热带沙漠气候', sourceClimateId: 'tropical-desert', color: '#f6ad3a',
    distribution: '回归线附近的大陆内部和西岸，如撒哈拉、阿拉伯半岛与澳大利亚内陆。',
    temperature: '全年较热，昼夜温差通常较大。', precipitation: '全年降水稀少，年际变化大。',
    characteristics: '炎热干燥，植被稀疏。', mechanism: '副热带高气压带的下沉气流、干燥信风及部分西岸寒流共同抑制降水。' },
  { id: 'tropical-savanna', name: '热带稀树草原气候', sourceClimateId: 'tropical-savanna', color: '#fce5d3',
    distribution: '热带雨林两侧的非洲、南美洲及澳大利亚北部等地。',
    temperature: '全年高温。', precipitation: '一年有明显干季和湿季。',
    characteristics: '干湿季交替，草原随季节枯荣。', mechanism: '赤道低气压带与信风带随季节移动，水汽和上升气流的变化形成干湿季。' },
  { id: 'tropical-monsoon', name: '热带季风气候', sourceClimateId: 'tropical-monsoon', color: '#fadce8',
    distribution: '南亚、东南亚及我国海南等热带季风区。',
    temperature: '全年高温，雨季前常较炎热。', precipitation: '雨季降水集中，干季降水明显减少。',
    characteristics: '高温，旱雨季分明。', mechanism: '海陆热力差异与气压带、风带季节移动形成季风，夏季来自海洋的气流带来丰富水汽。' },
  { id: 'subtropical-monsoon', name: '亚热带季风气候', sourceClimateId: 'subtropical-monsoon-humid', color: '#5e906b',
    distribution: '亚洲东部的亚热带地区，如我国秦岭—淮河以南大部。',
    temperature: '夏季高温，冬季较温和。', precipitation: '降水较多，通常夏季较集中。',
    characteristics: '夏季高温多雨，冬季较温和少雨。', mechanism: '大陆与海洋的热力差异造成冬夏风向转换，夏季海洋气流增加水汽输送。' },
  { id: 'subtropical-humid', name: '亚热带季风性湿润气候', sourceClimateId: 'subtropical-monsoon-humid', color: '#8ac782',
    distribution: '北美洲东南部、南美洲东南部及澳大利亚东岸等地。',
    temperature: '夏季炎热，冬季温和。', precipitation: '全年有降水，季节分配因地区而异。',
    characteristics: '温暖湿润，季风性弱于东亚典型季风区。', mechanism: '海洋水汽、西风天气系统及副热带高压边缘气流共同影响，不能只按单一风带解释。' },
  { id: 'subtropical-steppe-desert', name: '亚热带草原和沙漠气候', sourceClimateId: null, color: '#fcd475',
    distribution: '亚热带大陆内部及部分大陆西部的干旱、半干旱地区。',
    temperature: '夏季炎热，冬季气温低于热带沙漠区。', precipitation: '全年少雨，草原区通常比沙漠区稍湿润。',
    characteristics: '水分不足，草原与荒漠景观交替。', mechanism: '副热带下沉气流、远离海洋或山地阻隔使水汽难以到达。',
    mappingNote: '所给12类矢量没有独立对应类型，不以热带沙漠或温带大陆性面代替其范围。' },
  { id: 'mediterranean', name: '亚热带地中海气候', sourceClimateId: 'mediterranean', color: '#bedfc2',
    distribution: '南北纬约30°—40°大陆西岸，地中海沿岸最典型。',
    temperature: '夏季炎热，冬季温和。', precipitation: '夏季少雨、冬季多雨。',
    characteristics: '雨热不同期。', mechanism: '夏季受副热带高气压带控制，冬季西风带移入并带来海洋水汽。' },
  { id: 'subarctic-coniferous', name: '亚寒带针叶林气候', sourceClimateId: 'subarctic-coniferous', color: '#bbe2e9', group: '温带大陆性气候',
    distribution: '亚欧大陆和北美大陆的高纬度地区。',
    temperature: '冬季漫长严寒，夏季短促。', precipitation: '降水较少，主要集中于较暖季节。',
    characteristics: '年温差大，适合耐寒针叶林生长。', mechanism: '高纬度太阳辐射较弱，大陆性强，冬季受寒冷大陆气团影响显著。' },
  { id: 'temperate-deciduous', name: '温带落叶阔叶林气候', sourceClimateId: 'temperate-continental', color: '#e7f0c3', group: '温带大陆性气候',
    distribution: '温带大陆中较湿润的地区，以图册中的莫斯科为示例。',
    temperature: '冬季寒冷，夏季温暖，四季分明。', precipitation: '降水适中，暖季通常较多。',
    characteristics: '具有大陆性季节变化，同时水分能够支持森林。', mechanism: '内陆位置带来较大温差，西风和天气系统仍可输送一定水汽。' },
  { id: 'temperate-steppe', name: '温带草原气候', sourceClimateId: 'temperate-continental', color: '#fefbc6', group: '温带大陆性气候',
    distribution: '温带大陆内部森林与荒漠之间的半干旱地带。',
    temperature: '冬冷夏热，年温差较大。', precipitation: '降水偏少，通常夏季较多。',
    characteristics: '水分不足以形成连片森林，以草本植被为主。', mechanism: '距海较远，海洋水汽输送减弱，并受地形阻隔及大陆气团影响。' },
  { id: 'temperate-desert', name: '温带沙漠气候', sourceClimateId: 'temperate-continental', color: '#ffeabf', group: '温带大陆性气候',
    distribution: '温带大陆深处或山地背风侧，如中亚及我国西北部分地区。',
    temperature: '夏热冬冷，气温年较差大。', precipitation: '全年降水稀少。',
    characteristics: '干旱，大陆性强。', mechanism: '远离海洋和山地阻挡限制水汽输入，不宜简单归因为全年受副热带高压控制。' },
  { id: 'temperate-oceanic', name: '温带海洋性气候', sourceClimateId: 'temperate-oceanic', color: '#77c3e7',
    distribution: '南北纬约40°—60°大陆西岸，以西欧最典型。',
    temperature: '冬温夏凉，年温差较小。', precipitation: '全年较湿润，降水较均匀。',
    characteristics: '温和湿润，海洋调节明显。', mechanism: '常年受西风影响，海洋水汽及沿岸洋流共同调节气温和降水。' },
  { id: 'temperate-monsoon', name: '温带季风气候', sourceClimateId: 'temperate-monsoon', color: '#e2e6cf',
    distribution: '亚洲东部温带地区，如我国华北、东北和朝鲜半岛北部。',
    temperature: '夏季高温，冬季寒冷。', precipitation: '降水主要集中在夏季。',
    characteristics: '雨热同期，季节变化明显。', mechanism: '冬季大陆冷高压与夏季海陆气压差异造成季风转换，夏季海洋气流供给水汽。' },
  { id: 'tundra', name: '寒带苔原气候', sourceClimateId: 'polar', color: '#dddaed',
    distribution: '北冰洋沿岸和部分高纬岛屿。',
    temperature: '冬季漫长严寒，短暂夏季可略高于0 ℃。', precipitation: '降水少，低温使蒸发也弱。',
    characteristics: '地表生长苔藓、地衣及矮小植物。', mechanism: '纬度高，太阳辐射弱，极地气团和漫长寒季限制热量供给。' },
  { id: 'ice-cap', name: '寒带冰原气候', sourceClimateId: 'polar', color: '#eef0ef',
    distribution: '南极大陆和格陵兰岛内陆等永久冰雪地区。',
    temperature: '全年严寒，最暖月仍低于0 ℃。', precipitation: '降水稀少，主要为固态降水。',
    characteristics: '冰雪常年覆盖。', mechanism: '高纬度、冰雪高反射率及部分地区的高海拔共同维持低温。' },
  { id: 'highland', name: '高原高山气候', sourceClimateId: 'highland', color: '#8c99cd',
    distribution: '青藏高原、安第斯山脉等高海拔地区。',
    temperature: '随海拔升高而降低，低纬高地也可全年凉爽。', precipitation: '随高度、坡向和水汽条件变化，不能统一判为干旱。',
    characteristics: '垂直地带性明显，地区差异大。', mechanism: '海拔、坡向和山地对气流的抬升、阻挡共同改变热量与水分条件。' },
]

export interface TextbookClimateStation {
  readonly id: string
  readonly name: string
  readonly climateId: string
  readonly sourceClimateId: string | null
  /** Approximate named-place positions for globe markers, not surveyed station metadata. */
  readonly latitude: number
  readonly longitude: number
  readonly coordinateQuality: 'approximate-place-location'
  readonly elevationM: number
  readonly annualTemperatureC: number
  readonly annualPrecipitationMm: number | null
  readonly annualPrecipitationUpperBoundMm?: number
  readonly temperatureC: readonly number[]
  readonly precipitationMm: readonly (number | null)[]
  readonly monthlyDataQuality: 'chart-estimate'
  readonly sourcePage: 30 | 31
  readonly note?: string
}

type StationInput = Omit<TextbookClimateStation, 'sourceClimateId' | 'coordinateQuality' | 'monthlyDataQuality'>
const station = (input: StationInput): TextbookClimateStation => ({
  ...input,
  sourceClimateId: textbookClimateTypes.find(type => type.id === input.climateId)?.sourceClimateId ?? null,
  coordinateQuality: 'approximate-place-location', monthlyDataQuality: 'chart-estimate',
})

// Monthly points/bars were digitized from the page images, NOT substituted with
// modern city normals. Reading uncertainty is roughly 1–2 °C and 5–10 mm; tiny
// rainfall bars are particularly uncertain. Printed annual statistics remain
// independent and must never be recalculated from these illustrative readings.
export const textbookClimateStations: readonly TextbookClimateStation[] = [
  station({ id: 'kazachye', name: '卡扎奇耶', climateId: 'tundra', latitude: 70.77, longitude: 136.25,
    elevationM: 17, annualTemperatureC: -16.1, annualPrecipitationMm: 147, sourcePage: 30,
    temperatureC: [-42, -36, -28, -18, -6, 4, 9, 5, -5, -15, -27, -37],
    precipitationMm: [5, 5, 5, 5, 10, 10, 10, 15, 10, 10, 10, 5],
    note: '月降水柱极低，仅可粗略估读；年降水量147 mm为原图明确标注。' }),
  station({ id: 'vostok', name: '东方站', climateId: 'ice-cap', latitude: -78.45, longitude: 106.87,
    elevationM: 3420, annualTemperatureC: -55.2, annualPrecipitationMm: null, annualPrecipitationUpperBoundMm: 50, sourcePage: 30,
    temperatureC: [-33, -45, -57, -65, -66, -65, -67, -68, -67, -57, -43, -32],
    precipitationMm: Array<number | null>(12).fill(null),
    note: '原图仅明确标注年降水量<50 mm，月降水柱不足以可靠区分，保留缺测显示，不填成0。' }),
  station({ id: 'london', name: '伦敦', climateId: 'temperate-oceanic', latitude: 51.51, longitude: -.13,
    elevationM: 60, annualTemperatureC: 10, annualPrecipitationMm: 694, sourcePage: 30,
    temperatureC: [3, 5, 7, 10, 13, 15, 16, 15, 14, 10, 6, 3],
    precipitationMm: [45, 35, 35, 45, 55, 60, 75, 70, 70, 80, 60, 45] }),
  station({ id: 'beijing', name: '北京', climateId: 'temperate-monsoon', latitude: 39.90, longitude: 116.40,
    elevationM: 31, annualTemperatureC: 11.5, annualPrecipitationMm: 644, sourcePage: 30,
    temperatureC: [-7, -4, 3, 13, 16, 26, 29, 26, 20, 14, 4, -4],
    precipitationMm: [5, 20, 20, 25, 45, 75, 195, 235, 55, 25, 15, 5] }),
  station({ id: 'bilma', name: '比尔马', climateId: 'tropical-desert', latitude: 18.69, longitude: 12.92,
    elevationM: 359, annualTemperatureC: 26.1, annualPrecipitationMm: 21, sourcePage: 30,
    temperatureC: [15, 22, 29, 33, 35, 37, 37, 37, 34, 31, 26, 20],
    precipitationMm: [0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0],
    note: '近零的月柱仅代表图示量级；原图月温曲线与印刷年均温也不严格吻合，不据此反算年均值。' }),
  station({ id: 'bamako', name: '巴马科', climateId: 'tropical-savanna', latitude: 12.65, longitude: -8,
    elevationM: 331, annualTemperatureC: 28.2, annualPrecipitationMm: 1098, sourcePage: 30,
    temperatureC: [23, 26, 29, 30, 29, 26, 24, 25, 26, 27, 25, 21],
    precipitationMm: [0, 0, 0, 15, 45, 140, 210, 330, 195, 55, 15, 0] }),
  station({ id: 'bogota', name: '波哥大', climateId: 'highland', latitude: 4.71, longitude: -74.07,
    elevationM: 2547, annualTemperatureC: 11.7, annualPrecipitationMm: 799, sourcePage: 31,
    temperatureC: [12, 13, 13, 14, 14, 13, 13, 13, 13, 13, 13, 13],
    precipitationMm: [25, 40, 60, 105, 85, 55, 40, 45, 65, 115, 80, 55] }),
  station({ id: 'moscow', name: '莫斯科', climateId: 'temperate-deciduous', latitude: 55.75, longitude: 37.62,
    elevationM: 149, annualTemperatureC: 4.3, annualPrecipitationMm: 581, sourcePage: 31,
    temperatureC: [-10, -7, -4, 5, 16, 17, 20, 17, 12, 5, -3, -6],
    precipitationMm: [25, 15, 30, 35, 45, 55, 70, 80, 65, 45, 65, 50] }),
  station({ id: 'athens', name: '雅典', climateId: 'mediterranean', latitude: 37.98, longitude: 23.73,
    elevationM: 107, annualTemperatureC: 18.3, annualPrecipitationMm: 431, sourcePage: 31,
    temperatureC: [13, 14, 16, 18, 20, 23, 25, 26, 26, 24, 21, 17],
    precipitationMm: [70, 50, 35, 15, 25, 25, 15, 15, 25, 50, 85, 90] }),
  station({ id: 'shanghai', name: '上海', climateId: 'subtropical-monsoon', latitude: 31.23, longitude: 121.47,
    elevationM: 4, annualTemperatureC: 15.7, annualPrecipitationMm: 1123, sourcePage: 31,
    temperatureC: [2, 5, 10, 14, 18, 23, 28, 28, 24, 19, 12, 4],
    precipitationMm: [40, 60, 80, 100, 115, 160, 140, 110, 140, 55, 70, 45] }),
  station({ id: 'ho-chi-minh-city', name: '胡志明市', climateId: 'tropical-monsoon', latitude: 10.78, longitude: 106.70,
    elevationM: 6, annualTemperatureC: 27.9, annualPrecipitationMm: 1930, sourcePage: 31,
    temperatureC: [27, 28, 30, 33, 32, 31, 30, 29, 28, 28, 26, 24],
    precipitationMm: [20, 0, 5, 40, 215, 310, 290, 270, 325, 255, 110, 40] }),
  station({ id: 'iquitos', name: '伊基托斯', climateId: 'tropical-rainforest', latitude: -3.75, longitude: -73.25,
    elevationM: 126, annualTemperatureC: 26.7, annualPrecipitationMm: 2878, sourcePage: 31,
    temperatureC: [26, 26, 26, 26, 25, 25, 25, 25, 25, 26, 26, 26],
    precipitationMm: [280, 210, 280, 305, 270, 185, 170, 160, 170, 230, 260, 280] }),
]
