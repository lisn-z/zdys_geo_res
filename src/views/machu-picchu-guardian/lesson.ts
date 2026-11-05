import type { SiteId } from './types'

export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

export interface SiteLesson {
  id: SiteId
  title: string
  subtitle: string
  question: string
  body: string[]
  facts: { label: string; value: string }[]
  sourceIds: string[]
  hint: string
}

export const SOURCES: { id: string; title: string; url?: string; detail: string }[] = [
  { id: 'textbook', title: '六年级上册教材 · 第 132—133 页', detail: '《保护马丘比丘古城》：自然环境、保护问题与保护措施三项驱动问题；从地理、历史、社会学角度收集资料，向当地政府提出建议。原教材包含小组展示、投票与反思；本作改为单人探索、个人展示和自我检查。开场采用教材背景文字。' },
  { id: 'unesco', title: '联合国教科文组织 · 马丘比丘历史保护区', url: 'https://whc.unesco.org/en/list/274/', detail: '官方世界遗产条目。用于核对所在区域、山地森林环境、15 世纪的建造背景、自然与文化价值，以及旅游带来的收益和保护压力。' },
  { id: 'site-plan', title: '秘鲁文化部门 · 2024 年古城总平面图', url: 'https://cdn.www.gob.pe/uploads/document/file/6160191/5435413-rm-000159-2024-mc-anexo-2-plano.pdf?v=1712669616', detail: '2024 年征求意见文件所附总平面图。用于参考南部农业梯田、中央空地与两侧建筑群的空间关系，不作为现行游览规则。游戏与小地图仍为教学重建，不是测绘复原。' },
  { id: 'architecture', title: '秘鲁官方遗址总体规划 · 建筑群与类型', url: 'https://www2.congreso.gob.pe/sicr/cendocbib/con2_uibd.nsf/D4165F9C5B4D2323052577E00075B50C/%24FILE/SHMP_INC_INRENA.pdf', detail: '建筑调查章节区分城区与农业区、上部与下部城区，记录神庙、院落、敞厅、仓储建筑、天然岩室和泉池。用于组织古城的不同建筑群，具体室内功能仍应结合史料判断。' },
  { id: 'climate', title: '秘鲁文化部门 · 保护区总体规划：气候', url: 'https://www.machupicchu.gob.pe/wp-content/uploads/2024/05/1-11-DIAGNOSTICO-Y-ANEXOS-PLAN-MAESTRO-DEL-SHM.pdf', detail: '官方规划的自然环境章节说明海拔、地形与气候差异，以及古城所在区域湿润、多云雾的环境。游戏不提供未经核实的月均温或降水统计。' },
  { id: 'conservation', title: '马丘比丘官方站 · 保护工作', url: 'https://www.machupicchu.gob.pe/conservacion/', detail: '介绍日常维护、监测与遗产保护，指出影响既有自然因素，也有人类活动因素。可用来核对保护措施，而非自行改动遗址的操作指南。' },
  { id: 'engineering', title: '美国土木工程师学会 · 马丘比丘历史工程', url: 'https://www.asce.org/about-civil-engineering/history-and-heritage/historic-landmarks/machu-picchu', detail: '专业机构介绍梯田、石构建筑、供水与排水等工程特点。作为教材之外的拓展资料，不据此复原每一处地下构造。' },
  { id: 'simulation', title: '游戏中的教学情境说明', detail: '模型参考遗址的空间格局制作，具体尺寸与观察点经过教学简化。历史档案卡和守护站为学习活动安排；学生依据教材、现场模型观察和可核查资料形成保护建议。' },
]

export const INTRO_SCENES: { title: string; headline: string; text: string; commission: string }[] = [
  { title: '调查委托 · 走进双重遗产', headline: '山巅上的古城，\n迎来一位调查员。', text: '秘鲁的马丘比丘被称为“失落的印加古城”，是由印加人仅凭人力在山巅建造的一座城市。', commission: '你将独自探索这处自然与文化双遗产：看山脊和梯田，查石墙的历史，让每条判断都有证据。' },
  { title: '调查缘由 · 发展与保护', headline: '游客带来机会，\n也带来保护压力。', text: '马丘比丘为世界自然与文化双遗产，也是秘鲁最负盛名的旅游目的地。', commission: '在本次教学情境中，当地政府希望了解：这里的自然环境有什么特点？旅游活动和自然条件会带来哪些保护难题？' },
  { title: '你的任务 · 提交个人调查报告', headline: '给当地政府，\n一份有证据的建议。', text: '但随着旅游业的过度开发，当地面临的生态环境挑战日益严峻，马丘比丘面临被列入《濒危世界遗产名录》的威胁。\n这是教材背景表述，不代表当前已列入《濒危世界遗产名录》。', commission: '观察并拍照、查阅资料、写下依据；分析古城面临的保护问题及原因，再提出措施、说明取舍，生成一份带照片的个人报告。路线可以自由选择。' },
]

export const SITES: SiteLesson[] = [
  {
    id: 'viewpoint', title: '守卫屋旁的高台', subtitle: '看环境 · 地理线索',
    question: '古城处在怎样的自然环境中？这些条件给生活和保护带来什么影响？',
    body: [
      '从南侧守卫屋旁的高台向古城望去：近处梯田、沿山脊延伸的建筑、两侧陡坡与下方河谷有什么不同？拍一张能同时看见地形和建筑的照片。',
      '对照地图与资料：马丘比丘位于南美洲秘鲁，处在安第斯山脉东侧的山地环境中。周围的山地森林也是遗产的一部分。',
      '官方规划描述这里湿润、多云雾，气候随海拔和地形变化。画面中的一次晴雨只是一种天气，不能代表全年气候。',
    ],
    facts: [{ label: '位置', value: '南美洲 · 秘鲁 · 安第斯山地' }, { label: '地形观察', value: '山脊、陡坡、河谷' }, { label: '气候资料', value: '湿润、多云雾；不同海拔有差异' }],
    sourceIds: ['textbook', 'unesco', 'site-plan', 'climate', 'simulation'],
    hint: '笔记分别写“我看见的地形”和“资料告诉我的气候”，再写两者怎样影响保护。',
  },
  {
    id: 'archives', title: '神圣广场与历史档案', subtitle: '查史料 · 判断可信度',
    question: '这些石构建筑为什么值得保护？哪条资料能支持你的判断？',
    body: [
      '先观察神圣广场上的三窗建筑与敞厅，再沿阶梯寻找拴日石高台。对比它们与住宅院落、仓库的形态，把不同建筑怎样利用山脊空间记录下来。',
      '联合国教科文组织资料将古城的建造背景放在 15 世纪。这里的建筑、土地利用与山地环境相互联系，体现了印加人的创造力。',
      '保护对象既包括石墙和建筑，也包括与它们相连的自然环境。仍有一些历史用途未完全明确，可以把疑问保留下来。',
    ],
    facts: [{ label: '历史线索', value: '印加文明 · 建造于 15 世纪' }, { label: '保护价值', value: '文化与自然两方面' }, { label: '资料辨析', value: '谁发布？依据是什么？哪些仍不确定？' }],
    sourceIds: ['textbook', 'unesco', 'architecture', 'site-plan', 'simulation'],
    hint: '选择一处石墙或建筑，写“观察到的特点＋有来源的解释”，不用给每座房屋猜用途。',
  },
  {
    id: 'terrace', title: '农业梯田与石阶', subtitle: '沿坡探索 · 人与环境',
    question: '坡面为什么被整理成层层台地？从这里能看出怎样的建造智慧？',
    body: [
      '在古城南侧，沿石阶观察随坡势弯折的台面、挡土石墙与坡向。比较台面和旁边山坡，把空间差别记录下来。',
      '官方遗产资料记载了农业梯田。工程拓展资料也讨论了梯田与坡地稳定、排水的联系，说明一处设施可能具有多种作用。',
      '模型只表现外部层次，不能证明每级梯田内部的材料、古代产量或真实承载能力。遇到这些问题，应继续查资料。',
    ],
    facts: [{ label: '可观察', value: '台地、石墙、石阶、坡向' }, { label: '已知用途', value: '有农业梯田的资料记载' }, { label: '工程拓展', value: '坡地稳定与排水也值得调查' }],
    sourceIds: ['textbook', 'unesco', 'site-plan', 'engineering', 'simulation'],
    hint: '把梯田与相邻坡面拍在同一画面里，说明你的解释来自画面还是拓展资料。',
  },
  {
    id: 'station', title: '古城守护站', subtitle: '形成建议 · 展示讨论',
    question: '古城保护面临哪些问题，可能是什么原因？如果你代表当地政府，会怎样安排保护措施？',
    body: [
      '守护站是游戏设置的方案整理点。回看照片与笔记，选出一个有证据的问题：观察到了什么，可能是什么原因，还有哪些信息没有查清？',
      '提出对应措施，并说明代价、涉及的人群和检查效果的方法。日常维护、专业监测、游客引导与公众教育可以形成不同组合。',
      '完成后展示自己的保护方案。检查证据是否可靠、措施是否回应问题，再反思信息来自哪里、还有哪些地方可以改进。',
    ],
    facts: [{ label: '建议结构', value: '问题 → 证据与原因 → 措施' }, { label: '政府视角', value: '考虑保护需要与不同群体' }, { label: '展示后', value: '说明取舍，听取反馈，修改方案' }],
    sourceIds: ['textbook', 'conservation', 'unesco', 'simulation'],
    hint: '先写保护问题与可能原因，注明教材或查阅资料的依据，再提出对应措施并说明取舍。',
  },
]

export const MISSIONS: { id: string; title: string; question: string; sites: SiteId[]; hint: string }[] = [
  { id: 'environment', title: '读懂山巅古城', question: '马丘比丘的自然环境有哪些特点？', sites: ['viewpoint', 'terrace', 'archives'], hint: '从位置、地形、气候找线索，再联系石墙与梯田的历史价值。' },
  { id: 'problems', title: '追踪保护难题', question: '保护存在哪些问题？可能的原因是什么？', sites: ['archives', 'station'], hint: '结合教材的旅游开发与生态环境挑战，记录保护问题、可能原因和资料依据。' },
  { id: 'proposal', title: '留下守护方案', question: '当地政府怎样更好地保护古城？', sites: ['station'], hint: '用证据提出措施，解释取舍，导出完整记录，展示并检查自己的方案。' },
]
