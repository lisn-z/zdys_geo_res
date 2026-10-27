export type RegionKind = 'province' | 'autonomous' | 'municipality' | 'sar'
export type Scope = 'all' | 'province' | 'autonomous'
export type LessonMode = 'learn' | 'practice' | 'challenge' | 'special'
export type Difficulty = 'beginner' | 'standard' | 'advanced'

export interface Region {
  adcode: string
  name: string
  shortName: string
  kind: RegionKind
  city: string | null
  /** 城市中心的近似经纬度，用于教学点位，不使用省区几何中心。 */
  coord: [number, number]
  area: string
}

// 省级行政区包含省、自治区、直辖市和特别行政区，不能用省会题库代替完整行政区清单。
// 分类依据：https://www.zlb.gov.cn/zggq/index.htm
// 内蒙古简称依据：https://www.nmg.gov.cn/asnmg/yxnmg/xzqh/nmgzzqgk/
export const REGIONS: Region[] = [
  { adcode: '110000', name: '北京市', shortName: '京', kind: 'municipality', city: null, coord: [116.407, 39.904], area: '华北' },
  { adcode: '120000', name: '天津市', shortName: '津', kind: 'municipality', city: null, coord: [117.201, 39.084], area: '华北' },
  { adcode: '130000', name: '河北省', shortName: '冀', kind: 'province', city: '石家庄', coord: [114.515, 38.042], area: '华北' },
  { adcode: '140000', name: '山西省', shortName: '晋', kind: 'province', city: '太原', coord: [112.549, 37.871], area: '华北' },
  { adcode: '150000', name: '内蒙古自治区', shortName: '内蒙古', kind: 'autonomous', city: '呼和浩特', coord: [111.749, 40.842], area: '华北' },
  { adcode: '210000', name: '辽宁省', shortName: '辽', kind: 'province', city: '沈阳', coord: [123.432, 41.806], area: '东北' },
  { adcode: '220000', name: '吉林省', shortName: '吉', kind: 'province', city: '长春', coord: [125.324, 43.886], area: '东北' },
  { adcode: '230000', name: '黑龙江省', shortName: '黑', kind: 'province', city: '哈尔滨', coord: [126.643, 45.757], area: '东北' },
  { adcode: '310000', name: '上海市', shortName: '沪', kind: 'municipality', city: null, coord: [121.474, 31.230], area: '华东' },
  { adcode: '320000', name: '江苏省', shortName: '苏', kind: 'province', city: '南京', coord: [118.797, 32.060], area: '华东' },
  { adcode: '330000', name: '浙江省', shortName: '浙', kind: 'province', city: '杭州', coord: [120.155, 30.274], area: '华东' },
  { adcode: '340000', name: '安徽省', shortName: '皖', kind: 'province', city: '合肥', coord: [117.227, 31.820], area: '华东' },
  { adcode: '350000', name: '福建省', shortName: '闽', kind: 'province', city: '福州', coord: [119.296, 26.075], area: '华东' },
  { adcode: '360000', name: '江西省', shortName: '赣', kind: 'province', city: '南昌', coord: [115.858, 28.683], area: '华东' },
  { adcode: '370000', name: '山东省', shortName: '鲁', kind: 'province', city: '济南', coord: [117.000, 36.651], area: '华东' },
  { adcode: '410000', name: '河南省', shortName: '豫', kind: 'province', city: '郑州', coord: [113.625, 34.747], area: '华中' },
  { adcode: '420000', name: '湖北省', shortName: '鄂', kind: 'province', city: '武汉', coord: [114.305, 30.593], area: '华中' },
  { adcode: '430000', name: '湖南省', shortName: '湘', kind: 'province', city: '长沙', coord: [112.939, 28.228], area: '华中' },
  { adcode: '440000', name: '广东省', shortName: '粤', kind: 'province', city: '广州', coord: [113.264, 23.129], area: '华南' },
  { adcode: '450000', name: '广西壮族自治区', shortName: '桂', kind: 'autonomous', city: '南宁', coord: [108.366, 22.817], area: '华南' },
  { adcode: '460000', name: '海南省', shortName: '琼', kind: 'province', city: '海口', coord: [110.331, 20.032], area: '华南' },
  { adcode: '500000', name: '重庆市', shortName: '渝', kind: 'municipality', city: null, coord: [106.551, 29.563], area: '西南' },
  { adcode: '510000', name: '四川省', shortName: '川', kind: 'province', city: '成都', coord: [104.067, 30.572], area: '西南' },
  { adcode: '520000', name: '贵州省', shortName: '黔', kind: 'province', city: '贵阳', coord: [106.630, 26.647], area: '西南' },
  { adcode: '530000', name: '云南省', shortName: '滇', kind: 'province', city: '昆明', coord: [102.833, 24.880], area: '西南' },
  { adcode: '540000', name: '西藏自治区', shortName: '藏', kind: 'autonomous', city: '拉萨', coord: [91.140, 29.645], area: '西南' },
  { adcode: '610000', name: '陕西省', shortName: '陕', kind: 'province', city: '西安', coord: [108.940, 34.342], area: '西北' },
  { adcode: '620000', name: '甘肃省', shortName: '甘', kind: 'province', city: '兰州', coord: [103.834, 36.061], area: '西北' },
  { adcode: '630000', name: '青海省', shortName: '青', kind: 'province', city: '西宁', coord: [101.778, 36.617], area: '西北' },
  { adcode: '640000', name: '宁夏回族自治区', shortName: '宁', kind: 'autonomous', city: '银川', coord: [106.230, 38.487], area: '西北' },
  { adcode: '650000', name: '新疆维吾尔自治区', shortName: '新', kind: 'autonomous', city: '乌鲁木齐', coord: [87.617, 43.826], area: '西北' },
  { adcode: '710000', name: '台湾省', shortName: '台', kind: 'province', city: '台北', coord: [121.565, 25.033], area: '华东' },
  { adcode: '810000', name: '香港特别行政区', shortName: '港', kind: 'sar', city: null, coord: [114.169, 22.319], area: '华南' },
  { adcode: '820000', name: '澳门特别行政区', shortName: '澳', kind: 'sar', city: null, coord: [113.544, 22.198], area: '华南' },
]

export const KIND_LABELS: Record<RegionKind, string> = {
  province: '省', autonomous: '自治区', municipality: '直辖市', sar: '特别行政区',
}

export function capitalTerm(region: Region): string {
  return region.kind === 'autonomous' ? '首府' : region.kind === 'province' ? '省会' : ''
}

export function capitalRegions(scope: Scope = 'all'): Region[] {
  return REGIONS.filter(region => region.city !== null && (scope === 'all' || region.kind === scope))
}

export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export interface AnswerRecord {
  mistakes: number
  hints: number
  solved: boolean
  skipped: boolean
}

export function newRecord(): AnswerRecord {
  return { mistakes: 0, hints: 0, solved: false, skipped: false }
}

export function answerStatus(record: AnswerRecord): 'first' | 'hinted' | 'retried' | 'pending' {
  if (!record.solved) return 'pending'
  if (record.mistakes || record.skipped) return 'retried'
  return record.hints ? 'hinted' : 'first'
}

export function needsReview(record: AnswerRecord): boolean {
  return answerStatus(record) !== 'first'
}
