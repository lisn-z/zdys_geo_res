export type HazardId = 'landslide' | 'debris'

export interface HazardQuestion {
  id: string
  prompt: string
  options: { text: string; correct: boolean; feedback: string }[]
}

export interface HazardLesson {
  id: HazardId
  title: string
  subtitle: string
  definition: string
  conditions: string[]
  /** Starting positions on the normalized 0–1 demonstration timeline. */
  stages: { at: number; title: string; text: string }[]
  questions: HazardQuestion[]
}

export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

export const LESSON_INTRO = '山坡上的岩土怎样滑动？泥沙和石块怎样随水沿沟谷运动？转动模型，比较两种灾害，再辨认避险方向。'
export const TEXTBOOK_NOTE = '上海版地理七年级上册：第126页认识主要自然灾害及分布；第130页表5-1学习泥石流防灾避险。三维过程、控制变量实验、进度回放与判断题为配套拓展。'
export const MODEL_NOTE = '参数预设以中档为基准一键设置条件，也可直接微调降雨强度、坡度和岩土／物源，在相同观察时段内比较是否启动、启动阶段、推进范围和受影响对象。只改变一项可探究它的独立影响；改变多项时，结果反映综合作用，不能归因于某一项。三档参数与运动关系是依据形成条件设计的定性教学模型，并非来源提供的数值公式；未模拟完整的入渗、孔隙水压力、岩土结构及后续洪流，不能据此推算真实阈值、概率或安全距离。“本轮未启动”不等于现实安全。雨丝开关只控制视觉，实验降雨强度在变量面板设置。现实避险应依据当地预警、规定路线和现场组织。'

export const SAFETY_RULES = [
  '关注预警及防范提示；收到转移通知后，按组织安排及时撤离，不等待灾害发生。',
  '突遇泥石流，向沟道两侧稳固的高地撤离，不沿沟向上游或下游跑。',
  '不要横穿泥石流，不在松软斜坡或陡峭山体下停留。',
  '撤离后不为取物折返，雨停也不代表可以立即返回。',
]

export const HAZARDS: Record<HazardId, HazardLesson> = {
  landslide: {
    id: 'landslide',
    title: '滑坡',
    subtitle: '岩土沿坡下滑',
    definition: '斜坡上的岩土受重力作用，沿软弱面或软弱带向下滑动。',
    conditions: [
      '有一定坡度的地形，为岩土下滑提供条件。',
      '岩土中存在软弱面或软弱带，影响坡体稳定。',
      '降雨、地震、坡脚开挖等可能诱发滑动；本例演示降雨影响。',
    ],
    stages: [
      { at: 0, title: '观察坡体', text: '先看坡度、岩土层与坡脚，辨认可能滑动的岩土体。' },
      { at: 0.35, title: '沿面滑动', text: '本例中，降雨影响坡体稳定，岩土沿软弱面向坡下移动。' },
      { at: 0.75, title: '坡脚堆积', text: '岩土在下方堆积，可能掩埋房屋、阻断道路；停止运动也不能立即靠近。' },
    ],
    questions: [
      {
        id: 'landslide-motion',
        prompt: '哪一项最能说明模型中的滑坡？',
        options: [
          { text: '岩土沿软弱面向下滑动', correct: true, feedback: '抓住了运动方式：滑坡的岩土沿一定的面或带向下滑动。' },
          { text: '泥沙石块随大量水沿沟流动', correct: false, feedback: '这更符合泥石流。再观察岩土是否沿一个滑动面移动。' },
          { text: '只要下雨，所有山坡都会滑动', correct: false, feedback: '降雨只是可能的诱因；岩土结构、坡度等条件也会影响稳定性。' },
        ],
      },
      {
        id: 'landslide-warning',
        prompt: '当地已通知撤离滑坡危险区，应该怎样做？',
        options: [
          { text: '等待看见岩土移动再离开', correct: false, feedback: '不要等待灾害发生；按通知及时撤离。' },
          { text: '按规定路线，听从组织及时转移', correct: true, feedback: '预警和组织转移是提前避险的重要依据。' },
          { text: '到裂缝旁拍照确认', correct: false, feedback: '不要靠近危险坡体查看；及时撤离并向有关人员报告。' },
        ],
      },
      {
        id: 'landslide-direction',
        prompt: '突然发现滑坡正在逼近，应辨认哪个撤离方向？',
        options: [
          { text: '沿滑动方向向坡下跑', correct: false, feedback: '坡下可能位于滑动和堆积范围，应迅速离开它的运动路径。' },
          { text: '向滑动方向两侧、远离滑坡体的安全地带', correct: true, feedback: '向两侧离开滑坡运动路径，避开不稳定的坡体，听从现场组织。' },
          { text: '顺滑坡体向上爬', correct: false, feedback: '向上仍可能进入滑坡体，不能把“上坡”一概当作安全。' },
        ],
      },
    ],
  },
  debris: {
    id: 'debris',
    title: '泥石流',
    subtitle: '水与泥沙石块沿沟流动',
    definition: '大量泥沙、石块与水混合，在山区沟谷或坡面上向下流动，形成特殊洪流。',
    conditions: [
      '较陡的沟谷或坡面，利于汇水和物质运动。',
      '较多松散的泥土、沙和石块，提供物质来源。',
      '强降雨、融水等提供水源；本例演示降雨汇流。',
    ],
    stages: [
      { at: 0, title: '汇水与松散物', text: '找出上游松散物质与沟道，想一想雨水将向哪里汇集。' },
      { at: 0.35, title: '沿沟奔流', text: '水与泥沙、石块混合并沿沟谷向下运动，沿途可能冲击、裹挟更多物质。' },
      { at: 0.75, title: '沟口堆积', text: '部分物质在较平缓地带堆积，可能冲毁、淤埋设施，后续洪流仍可能到来。' },
    ],
    questions: [
      {
        id: 'debris-conditions',
        prompt: '本例泥石流的形成需要关注哪组条件？',
        options: [
          { text: '只有雨量，其他条件不用考虑', correct: false, feedback: '水源之外，还要关注松散物质与便于汇流的地形。' },
          { text: '较陡地形、松散物质与水源', correct: true, feedback: '三类条件共同参与。本模型观察它们与运动过程的联系，不给出现实发生阈值。' },
          { text: '只有房屋数量', correct: false, feedback: '房屋影响受灾对象，不能代替地形、物质与水源条件。' },
        ],
      },
      {
        id: 'debris-direction',
        prompt: '泥石流沿沟谷袭来，哪种方向较符合避险原则？',
        options: [
          { text: '顺沟向下游跑', correct: false, feedback: '下游仍在运动路径上，应向沟道两侧撤离。' },
          { text: '沿沟向上游跑', correct: false, feedback: '上游也在沟道中，可能还有后续洪流，不应沿沟逆行。' },
          { text: '向两侧稳固的高地撤离', correct: true, feedback: '横向离开沟道，选择稳固高地，避开松软斜坡和陡峭山体下方。' },
        ],
      },
      {
        id: 'debris-crossing',
        prompt: '对岸看起来更近，可以穿过泥石流吗？',
        options: [
          { text: '不可以，应离开沟道并避开洪流', correct: true, feedback: '不能横渡泥石流。“向两侧撤离”指离开沟道，不是穿过流动的泥石流。' },
          { text: '流量看起来小就可以', correct: false, feedback: '外观不能说明安全，泥石流还可能继续增大，不能尝试横渡。' },
          { text: '结伴通过就可以', correct: false, feedback: '结伴也不能消除被冲走、陷入或掩埋的危险。' },
        ],
      },
    ],
  },
}

export const SOURCES: { title: string; url: string; description: string }[] = [
  { title: 'USGS｜滑坡及其成因', url: 'https://www.usgs.gov/faqs/what-a-landslide-and-what-causes-one', description: '下滑驱动力与岩土强度的关系，以及降雨、地形等多种因素的共同作用；用于变量实验的定性依据。' },
  { title: 'Poly Haven｜地表实拍材质', url: 'https://polyhaven.com/license', description: '草岩、碎石土与裸岩贴图及 OpenGL 法线贴图，采用 CC0 许可。' },
  {
    title: '北京市应急管理局｜什么是滑坡？',
    url: 'https://yjglj.beijing.gov.cn/art/2019/12/19/art_6216_457972.html',
    description: '滑坡定义、软弱面与常见诱发因素。',
  },
  {
    title: '应急管理部｜山洪泥石流及其应对措施',
    url: 'https://www.mem.gov.cn/kp/zrzh/201904/t20190401_366089.shtml',
    description: '泥石流形成条件；向沟道两侧撤离、不横渡、听从指挥及不折返。',
  },
  {
    title: '应急管理部｜2025年8月5日汛期安全知识发布会',
    url: 'https://www.mem.gov.cn/xw/xwfbh/2025n08y05xwfbh/',
    description: '关注预警与防范提示，及时转移；离开滑坡和泥石流的运动路径。',
  },
]


