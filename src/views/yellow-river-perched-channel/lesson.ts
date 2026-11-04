export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

export interface RiverStage {
  id: number
  progress: number
  title: string
  short: string
  description: string
  question: string
}

export const STAGES: RiverStage[] = [
  {
    id: 1,
    progress: 0,
    title: '河床较低',
    short: '初始高度',
    description: '从河床低于两岸地面的示意状态开始，比较河床、水面与堤外地面的相对高度。',
    question: '此时，河床与堤外地面谁更高？',
  },
  {
    id: 2,
    progress: 0.33,
    title: '泥沙淤积',
    short: '河床抬高',
    description: '部分泥沙随黄河水到达下游并沉积，沉积层逐渐增厚，使河床抬高。',
    question: '泥沙在河道中不断淤积，河床会怎样变化？',
  },
  {
    id: 3,
    progress: 0.67,
    title: '堤防加高',
    short: '加高堤防',
    description: '为防止河水泛滥，人们加高大堤；泥沙长期淤积，河床与堤外地面的高差逐渐扩大。',
    question: '加高大堤能挡水，能直接减少河床上的泥沙吗？',
  },
  {
    id: 4,
    progress: 1,
    title: '地上河形态',
    short: '高出地面',
    description: '河床高于堤外两岸地面，是“地上河”的特点。对照地面基准线，观察河床的相对高度。',
    question: '判断“地上河”，应把河床与哪里比较？',
  },
]

export const FIXED_LEVEE_STAGES: RiverStage[] = [
  {
    id: 1,
    progress: 0,
    title: '保持原堤',
    short: '堤顶不变',
    description: '保留原来的堤顶高度，观察泥沙淤积后河床、水面与堤顶之间的相对位置。',
    question: '这个对比中，哪一处的高度保持不变？',
  },
  {
    id: 2,
    progress: 0.4,
    title: '水面抬升',
    short: '水面升高',
    description: '在本对比示意中，河床因淤积而抬高，水面也随之升高，与原堤顶的距离缩小。',
    question: '水面与堤顶之间的高度差怎样变化？',
  },
  {
    id: 3,
    progress: 0.6,
    title: '越堤临界',
    short: '越堤临界',
    description: '水面接近原堤顶；继续演示，水面超过堤顶后，河水开始向堤外漫溢。',
    question: '水面从低于变为高于堤顶后，水流发生什么变化？',
  },
  {
    id: 4,
    progress: 0.8,
    title: '越堤漫溢',
    short: '水漫堤外',
    description: '水面超过原堤顶后，河水越过堤顶，向堤外较低地面漫流。观察越堤后的水流去向。',
    question: '水越过堤顶后，为什么会流向堤外低处？',
  },
]

export const FIXED_LEVEE_INTRO = '保持原堤顶高度，先观察河床淤高、水面接近堤顶，再观察河水越堤后的漫流。对比堤防高度对挡水作用的影响。'

export const FIXED_LEVEE_MODEL_NOTE = '相对高度对比示意，原堤顶保持不变；水面随河床抬升为简化处理，漫流速度与范围非实测，不用于洪水预测。'

export const FIXED_LEVEE_QUESTION = {
  question: '水面高过原堤顶后，可能发生什么？',
  correct: '向堤外漫溢',
  incorrect: '水始终留在河槽',
  correctFeedback: '答对了。水面超过原堤顶时，河水可从堤顶向外漫溢。',
  incorrectFeedback: '再比较水面与堤顶。原堤顶低于水面时，河水可越过堤顶向外漫溢。',
}

export type RiverFeatureId = 'bed' | 'water' | 'levee' | 'plain' | 'sediment' | 'tower'

export interface RiverFeature {
  id: RiverFeatureId
  title: string
  description: string
  question: string
}

export const FEATURES: RiverFeature[] = [
  {
    id: 'bed',
    title: '河床',
    description: '河床是河道的底部。泥沙长期淤积会抬高河床；河床高出堤外两岸地面，是判断“地上河”的关键。',
    question: '对照两岸地面的基准线，河床在它的上方还是下方？',
  },
  {
    id: 'water',
    title: '水面',
    description: '水面是河水的上表面，水位高低会变化。判断“地上河”，要看河床是否高于堤外两岸地面。',
    question: '水位上涨与河床抬高，有什么不同？',
  },
  {
    id: 'levee',
    title: '大堤',
    description: '河道两侧的大堤约束河水，发挥防洪作用。加高、加固堤防与减少泥沙淤积，是作用不同的治理措施。',
    question: '如果河床不变，只加高大堤，河床与堤外地面的高差会变吗？',
  },
  {
    id: 'plain',
    title: '堤外地面',
    description: '大堤外侧的两岸地面，是比较河床相对高度的参照。本示意将这一地面保持固定，便于观察变化。',
    question: '观察形成过程，河床和堤外地面分别怎样变化？',
  },
  {
    id: 'sediment',
    title: '淤积泥沙',
    description: '黄土高原是黄河泥沙的主要来源。水中的褐色浑浊示意泥沙输移与沉降；泥沙在河床上长期淤积，使河床抬高。',
    question: '水中的泥沙沉积到哪里？长期积累后，河床会怎样变化？',
  },
  {
    id: 'tower',
    title: '开封铁塔',
    description: '以塔基所在的堤外地面作参照，观察河床是否高出两岸地面。铁塔与河道的间距、大小比例为教学示意。',
    question: '比较河床与塔基所在的地面，哪一个更高？',
  },
]

export const FIXED_LEVEE_FEATURES: RiverFeature[] = FEATURES.map(feature => {
  if (feature.id === 'bed') return {
    ...feature,
    description: '本对比先展示泥沙淤积、河床抬高，再观察水面越过原堤顶后的漫流。堤外地面仍是判断河床相对高度的参照。',
    question: '河床与两岸地面的高差、水面与堤顶的高差，有什么不同？',
  }
  if (feature.id === 'water') return {
    ...feature,
    description: '本对比中，水面随河床淤高而抬升；超过原堤顶后，出现越堤漫溢。观察水面与堤顶的相对高度。',
    question: '水面低于、接近和超过堤顶时，水流的去向有何不同？',
  }
  if (feature.id === 'levee') return {
    ...feature,
    description: '本模式保持原堤顶高度。水面超过堤顶时，河水可越堤漫溢。黄河治理还需结合水土保持、水沙调控等措施。',
    question: '堤顶不加高时，水面与堤顶之间的高度差怎样变化？',
  }
  if (feature.id === 'plain') return {
    ...feature,
    description: '堤外地面保持原来的高度。河水越过堤顶后，可沿坡向两岸低处漫流；图中的扩展用于说明水流去向。',
    question: '越过堤顶的水，为什么会流向两岸较低的地面？',
  }
  return feature
})

export const SOURCES: { title: string; url: string; note: string }[] = [
  {
    title: '上海版五四学制《地理》七年级上册',
    url: '',
    note: '本地教材：第58页（PDF第62页），图2-41“开封‘地上河’示意”；第59页介绍堤防、水库与水土流失综合治理。四阶段为依据教材概念编排的形成过程示意。',
  },
  {
    title: '黄委：主汛期前黄河调水调沙',
    url: 'https://btslj.xjbt.gov.cn/c/2026-06-23/8490350.shtml',
    note: '兵团水利局转载水利部黄河水利委员会，2026-06-23。水库群调控水沙关系，可减少淤积、维持河槽过流能力；其作用不能等同于立即消除地上河。',
  },
  {
    title: '上海市水务局：黄河调水调沙效果',
    url: 'https://swj.sh.gov.cn/swj-xyxx/20260715/6556e7bd0129446cbdc3a617228ce2e9.html',
    note: '转载中国水利，2026-07-13。调水调沙实现排沙减淤、部分河段过流能力提升等目标，仍需持续监测和防汛调度。',
  },
  {
    title: '河南博物院：开封铁塔的建筑形制',
    url: 'https://www.chnmus.net/ch/collection/appraise/details.html?id=512159059472609825',
    note: '铁塔模型参考八角十三层、褐色琉璃砖、逐层收分、圭形门窗及檐下斗栱。塔的位置和与河道的比例为教学示意。',
  },
  {
    title: '常德市水利局：漫堤与溃堤的区别',
    url: 'https://slj.changde.gov.cn/zhdt/sldt/content_78210554',
    note: '水位超过堤顶、从堤顶向外泄流称为漫堤；溃堤涉及堤体破坏。本课仅示意越堤漫溢，不模拟堤防破坏或实际淹没范围。',
  },
]

export const MODEL_NOTE = '相对高度教学示意，垂直方向夸大；细沙运动与形成进程均经简化，不对应实测速度或具体年代，不用于洪水预测。'
