import type { RoofKind } from './types'

export interface HomeDescription {
  id: RoofKind
  name: string
  roofName: string
  subtitle: string
  climate: string
  feature: string
  flow: string
  hint: string
}

export const CLIMATE_OPTIONS = [
  '年降水量较少，季节变化较大',
  '年降水量较多',
  '年降水量少，气候干旱',
] as const

export const FUNCTION_OPTIONS = [
  '向内汇集雨水',
  '使雨水较快排走',
  '便于晾晒、利用屋顶空间',
] as const

export const HOMES: HomeDescription[] = [
  {
    id: 'shanxi',
    name: '山西民居',
    roofName: '单坡屋顶',
    subtitle: '屋面向院内倾斜',
    climate: CLIMATE_OPTIONS[0],
    feature: '教材所示的屋面由外侧向院内降低，雨水顺坡汇向院落，便于收集利用。',
    flow: '雨水沿单坡流向内侧檐口，再汇入院内的集水路径。',
    hint: '找一找屋面哪边高、哪边低，再沿雨水流向判断它为什么有利于集水。',
  },
  {
    id: 'anhui',
    name: '安徽民居',
    roofName: '双坡屋顶',
    subtitle: '屋脊两侧分别排水',
    climate: CLIMATE_OPTIONS[1],
    feature: '屋脊两侧的屋面向下倾斜，雨水顺坡流向檐口，有利于较快排离屋面。',
    flow: '落在屋脊两侧的雨水分别沿坡流下，再经檐口和排水路径离开屋面。',
    hint: '先判断两侧水流的方向，再想一想：降水较多时，及时排走屋面雨水有什么作用？',
  },
  {
    id: 'xinjiang',
    name: '新疆民居',
    roofName: '平屋顶',
    subtitle: '屋顶较平，空间可利用',
    climate: CLIMATE_OPTIONS[2],
    feature: '教材所示民居的屋顶外观较平，便于晾晒和利用屋顶空间；平屋顶仍需微坡与排水口。',
    flow: '少量雨水也要顺微坡流向排水口，不能把“平屋顶”理解为完全水平、无需排水。',
    hint: '联系当地干旱少雨的特点解释屋顶用途，再检查雨水有没有出口。',
  },
]

export const ANSWERS: Record<RoofKind, { climate: string; function: string }> = {
  shanxi: { climate: CLIMATE_OPTIONS[0], function: FUNCTION_OPTIONS[0] },
  anhui: { climate: CLIMATE_OPTIONS[1], function: FUNCTION_OPTIONS[1] },
  xinjiang: { climate: CLIMATE_OPTIONS[2], function: FUNCTION_OPTIONS[2] },
}

export const answers = ANSWERS

export const TEXTBOOK_NOTE = '上海版五四学制《地理》七年级上册，第 44 页「一起探究：民居屋顶与降水」，表 2-3「民居屋顶特点及功能」。'

export const SOURCE_TEXT = [
  '教材通过山西、安徽、新疆的民居实例，要求联系当地降水特点，分析屋顶特点与功能。山西一列已给出“年降水量较少、降水季节变化较大”和“收集雨水”；安徽、新疆两列由学生补充。',
  '本课件参照教材所示的单坡、双坡和平屋顶形态，帮助观察雨水去向。它们是民居实例，不代表一个省区所有房屋都采用同一种屋顶。',
  '降水是影响屋顶设计的因素之一。建筑材料、施工技术、保温需要、生活习惯与地方文化等，也会影响民居形态。',
  '调节坡度、改变降雨和检查排水口，是为了比较条件影响而增设的课堂实验。模型尺寸、坡度、降雨及水量读数用于示意，不是教材照片中房屋的实测数据，也不是建筑设计参数。',
]
