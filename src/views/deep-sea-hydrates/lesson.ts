import type { FeatureId, LessonStep } from './types'

export interface LessonContent {
  id: LessonStep
  number: string
  title: string
  subtitle: string
  question: string
  explanation: string
  takeaway: string
}

/** 认识资源作为第一步；后三题保留上海六上第79页的教材措辞。 */
export const DRIVING_QUESTIONS: { id: LessonStep; number: string; shortTitle: string; text: string }[] = [
  { id: 'resource', number: '01', shortTitle: '认识可燃冰', text: '看起来像冰，为什么还能燃烧？' },
  { id: 'pressure', number: '02', shortTitle: '深海高压', text: '为什么潜水时必须穿坚固耐压的潜水服？' },
  { id: 'extraction', number: '03', shortTitle: '海底输送', text: '怎样将可燃冰从海底运送到海面上？' },
  { id: 'protection', number: '04', shortTitle: '环境影响', text: '大量开采海底可燃冰会对海洋环境产生哪些影响？' },
]

/** 教材依据：上海六年级上册，第 78–79 页。文字为教学改写。 */
export const STEPS: LessonContent[] = [
  {
    id: 'resource',
    number: '01',
    title: '认识可燃冰',
    subtitle: '从海面，看向海底',
    question: '看起来像冰，为什么还能燃烧？',
    explanation: '先观察冰状样品和燃烧现象，再阅读教材分布图，区分“已发现”与“推测”，找到我国南海试采地。把观察记下来，为后续的开采探究寻找依据。',
    takeaway: '先调查资源分布，再了解它所在的海底环境。',
  },
  {
    id: 'pressure',
    number: '02',
    title: '深水压力',
    subtitle: '越往下，压力越大',
    question: DRIVING_QUESTIONS[1]!.text,
    explanation: '比较不同深度的压力。想一想：到了深海，探测设备的外壳和管道需要具备什么本领？',
    takeaway: '深海设备需要耐压；下潜越深，对设备的要求越高。',
  },
  {
    id: 'extraction',
    number: '03',
    title: '开采与输送',
    subtitle: '让资源安全到达海面',
    question: DRIVING_QUESTIONS[2]!.text,
    explanation: '补充知识：降压开采是研究和试采采用的方法之一。降低储层压力，使水合物分解为甲烷和水，再通过井和管道收集、输送。本演示用流动光点表示这一过程。',
    takeaway: '要把“分解、收集、输送”连起来，并防止气体泄漏。',
  },
  {
    id: 'protection',
    number: '04',
    title: '保护海洋',
    subtitle: '开发，也要守护',
    question: DRIVING_QUESTIONS[3]!.text,
    explanation: '开采前应调查海洋环境，开采中应持续监测。补充知识：需要关注甲烷泄漏、水环境变化和海底沉积物的稳定。发现异常，应及时采取措施。合理开发要同时考虑能源需求与海洋保护。',
    takeaway: '先调查、再评估、持续监测，让开发与保护同行。',
  },
]

export interface FeatureContent {
  title: string
  description: string
  role?: string
  parts?: { name: string; description: string }[]
  dataUses?: { measure: string; purpose: string }[]
  observation?: string
  focusLabel?: string
  note?: string
}

/** 模型中的设备均为简化教学部件，不代表某一试采工程的真实结构。 */
export const FEATURES: Record<FeatureId, FeatureContent> = {
  platform: {
    title: '半潜式作业平台',
    role: '浮力承重 · 锚缆限制漂移',
    description: '它浮在水中，靠水下浮筒和浸水立柱提供浮力；锚缆连接海床锚点，帮助保持作业位置。甲板下的立柱不一直撑到海底。',
    parts: [
      { name: '浮筒与立柱', description: '两只水下浮筒和四根立柱组成浮体，支撑上方甲板。' },
      { name: '锚缆与海床锚点', description: '向四周拉住浮体，限制风、浪、海流造成的漂移。' },
      { name: '中央输送管', description: '连接海底井口与平台，用于输送，不是支撑平台的柱子。' },
    ],
    observation: '先看水面下的浮筒，再沿斜向锚缆找到海床锚点。',
    focusLabel: '查看水下浮筒与锚缆',
    note: '这是锚泊式半潜平台的教学示意，并非“蓝鲸1号”复刻；海深与设备比例作了压缩。',
  },
  riser: {
    title: '输送管道',
    description: '连接海底与海面。管道需要耐压、密封，才能把采出的气体和水安全送上来。',
  },
  wellhead: {
    title: '海底井口',
    description: '连接地下的井与上方的输送系统，是观察“海底到海面”通路的关键位置。',
  },
  hydrate: {
    title: '含可燃冰的沉积层',
    description: '可燃冰含有甲烷和水。略浅、带有白色小斑点的一层表示含水合物的沉积物；颜色、形状和厚度仅作示意。',
  },
  sediment: {
    title: '海底沉积物',
    description: '海底沉积物中可能存在可燃冰。开发时还要关注沉积物是否稳定。',
  },
  rov: {
    title: '水下机器人',
    role: '移动巡检 · 海底的“眼睛和手”',
    description: '海面人员通过连接缆遥控它，靠近井口和管道查看情况，也可用机械臂协助水下操作。',
    parts: [
      { name: '摄像头与灯', description: '照亮近处，把井口、管道的画面传回海面。' },
      { name: '推进器', description: '帮助移动，并在需要观察的位置附近悬停。' },
      { name: '机械臂', description: '由人员控制，协助抓取样品或操作部件。' },
      { name: '连接缆', description: '连接海面，传递控制信号和观测画面。' },
    ],
    observation: '先找前方的镜头和双灯，再找机械臂与带螺旋桨的推进器。',
    focusLabel: '靠近观察机器人',
    note: '本课件展示结构与下潜示意，没有接入真实摄像画面。',
  },
  monitor: {
    title: '海底监测站',
    role: '定点观测 · 持续记录环境变化',
    description: '它留在海床上收集观测信息。将开采前后的记录作比较，帮助发现变化、排查异常。',
    dataUses: [
      { measure: '水中甲烷、气泡', purpose: '与原有记录比较，排查是否出现异常气体逸散。' },
      { measure: '温度、压力', purpose: '分析水合物稳定条件是否变化；海水与地下环境需分别布设测点。' },
      { measure: '海床倾斜、位移', purpose: '查看海床有无沉降或形变，辅助判断沉积物是否稳定。' },
    ],
    parts: [
      { name: '三脚支架', description: '把仪器支撑在海床上。' },
      { name: '探头与仪器筒', description: '示意采集位置及容纳仪器的外壳。' },
      { name: '海底电缆', description: '示意供电与数据传输的连接通路。' },
    ],
    observation: '找到贴近海床的细探头，再沿电缆寻找它与水下系统的连接。',
    focusLabel: '靠近观察监测站',
    note: '这些数据由配置不同传感器的监测系统获取；简模不表示一根探头能测全部指标，也没有实时监测读数。',
  },
}

export const QUESTION = {
  prompt: '为南海可燃冰开发选择一条合理建议。',
  options: [
    {
      id: 'a',
      text: '只要找到可燃冰，就尽快大量开采。',
      correct: false,
      feedback: '发现资源只是第一步。还要了解海底压力、输送条件和环境影响。',
    },
    {
      id: 'b',
      text: '调查资源与环境，采用耐压密封设备，并持续监测。',
      correct: true,
      feedback: '合理！这条建议同时考虑了深海压力、安全输送和海洋保护。',
    },
    {
      id: 'c',
      text: '设备能够耐压，就可以省去环境监测。',
      correct: false,
      feedback: '耐压解决了一部分技术问题，气体泄漏、水环境变化和海底稳定仍需监测。',
    },
  ],
}

/**
 * 海水静压力的课堂估算（表压），单位 MPa。
 * depth 为距海面的垂直水深，单位 m；调用者传入非负有限数值。
 * p = ρgh；ρ = 1025 kg/m³，g = 9.81 m/s²，密度视为常数。
 * 未计大气压，所以 pressureMPa(0) = 0；这不是绝对压力。
 * 不表示沉积物内储层压力，也不用于水合物稳定性或工程计算。
 */
export function pressureMPa(depth: number): number {
  return (1025 * 9.81 * depth) / 1_000_000
}

export const PRESSURE_NOTE = '海水压力为相对海面的估算值（表压），未计大气压。0–1600 米仅作课堂探究，不对应真实试采站点。'
export const MODEL_NOTE = '三维场景与流动光点为教学示意；设备比例、地层形状和演示进度不代表实测工程数据。'

/**
 * 下列链接仅为补充知识来源；教材页由任务提供的第 78、79 页照片核对。
 * 2026-11-02 核查。正文未引用产量、精确分布点或试采工程参数。
 */
export const SOURCES: { title: string; url: string; note: string }[] = [
  {
    title: '美国地质调查局：什么是天然气水合物',
    url: 'https://www.usgs.gov/faqs/what-are-gas-hydrates',
    note: '样品观察依据：水合物呈冰状；燃烧的是释放出的甲烷，而不是水。',
  },
  {
    title: '伍兹霍尔海洋研究所：常压潜水服',
    url: 'https://www.whoi.edu/oceanus/feature/exosuit/',
    note: '潜水服模块依据：硬壳、密封关节与生命支持装置。模型为结构示意，不表示可下潜至主场景的全部深度。',
  },
  {
    title: '美国海军研究生院：潜水员与保温防护',
    url: 'https://nps.edu/web/awtl/background-diver',
    note: '补充区别：普通软式潜水衣主要用于保温，不能像常压硬壳潜水服那样隔绝外部高压。',
  },
  {
    title: '美国能源部：甲烷水合物开采原理',
    url: 'https://www.energy.gov/hgeo/methane-hydrate-production-feasibility',
    note: '补充依据：压力降低可使水合物分解为甲烷和水；降压是一种研究和试采方法。',
  },
  {
    title: '美国地质调查局：可燃冰与环境',
    url: 'https://www.usgs.gov/programs/coastal-and-marine-hazards-and-resources-program/science/gas-hydrate-and-environment',
    note: '补充依据：甲烷释放与水环境变化需要关注；研究使用水下观测和监测。',
  },
  {
    title: '美国能源部：水合物研究路线图',
    url: 'https://www.energy.gov/documents/gas-hydrates-roadmapmhacpdf',
    note: '补充依据：开采中的储层稳定与海底变化需要研究和监测。',
  },
  {
    title: '美国国家海洋和大气管理局：水下机器人',
    url: 'https://oceanexplorer.noaa.gov/ocean-fact/rov/',
    note: '补充依据：海面遥控、连接缆、摄像照明及机械臂；可用于水下管道和平台巡检。',
  },
  {
    title: '美国能源部资助研究：水合物相关地质风险的观测',
    url: 'https://netl.doe.gov/sites/default/files/2018-12/Measurements-for-Assessmentof-Hydrate-Related-Geohazards.pdf',
    note: '补充依据：气体、温压和海床变化需用不同测量手段获取，再用于分析异常逸散及稳定性。',
  },
  {
    title: '美国海洋能源管理局：海上半潜式结构',
    url: 'https://www.boem.gov/sites/default/files/environmental-stewardship/Environmental-Assessment/NEPA/BOEM-EIS-2016-018-v1.pdf',
    note: '补充依据：半潜式结构依靠浮筒提供浮力，并可通过连接海床锚点的系泊系统保持位置。',
  },
  {
    title: '国务院国资委：“蓝鲸1号”半潜式钻井平台',
    url: 'https://wap.sasac.gov.cn/n2588025/n2588149/c12960221/content.html',
    note: '实际装备背景资料；本课件采用锚泊式半潜平台简模，不对应“蓝鲸1号”的真实配置与尺寸。',
  },
]
