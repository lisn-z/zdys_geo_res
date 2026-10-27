export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'
export type HouseView = 'cutaway' | 'exterior' | 'interior'
export type RoomId = 'living' | 'fireplace' | 'dining' | 'bedroom' | 'utility' | 'kitchen' | 'entry'
export type LessonGroup = 'textbook' | 'extension'
export type Vec3Tuple = [number, number, number]
export interface SafetyPoint {
  id: number; title: string; category: string; textbook: string; explanation: string; observe: string
  group: LessonGroup; sourceTitle?: string; sourceUrl?: string
  position: Vec3Tuple; camera: Vec3Tuple; target: Vec3Tuple
}
// Small lesson content is bundled with the component; no separate data request.
export const LESSON_METADATA = {
  title: "抗震小屋的启示",
  source: "https://dtxs.sinomaps.com/files/headimg/3369e6b4-3cb4-4985-bc13-81489f961a2b.pdf#page=79",
  textbookPage: 75,
  figure: "图3-35 抗震小屋示意图",
  note: "教材七项依据图3-35制作；楼梯、房门、背面与课外拓展附屋为辅助教学补充。"
}

export const SAFETY_POINTS: SafetyPoint[] = [
  {
    id: 1,
    title: "加固烟囱",
    category: "屋顶结构",
    textbook: "用金属支架固定烟囱，并在烟囱的四周钉上一层木板。",
    explanation: "观察金属支架与木板的位置，理解如何加强烟囱及周围构件的连接。",
    observe: "找一找：金属支架连接了哪两个部位？",
    position: [-2.1, 5.9, 1.35],
    camera: [-5.4, 7.8, 6.1],
    target: [-2.1, 5.7, 1.35],
    group: "textbook"
  },
  {
    id: 2,
    title: "固定高大家具",
    category: "室内安全",
    textbook: "将书架、壁橱和高大的梳妆台固定在墙壁上。",
    explanation: "高大的家具容易在摇晃中倾倒。观察书架背面的固定件与墙壁的连接。",
    observe: "找一找：书架上方的固定件在哪里？",
    position: [-3.35, 2.25, 2.2],
    camera: [-3.1, 2.7, 5.4],
    target: [-3.35, 1.7, 1.6],
    group: "textbook"
  },
  {
    id: 3,
    title: "安全安置床铺",
    category: "室内安全",
    textbook: "在床的上方和墙上，不放置重物，把床放置在远离玻璃窗的地方。",
    explanation: "观察床、窗户和墙面的相对位置，减少坠物和碎玻璃对休息空间的威胁。",
    observe: "想一想：床头上方适合放重物吗？",
    position: [1.65, 4.15, 0.55],
    camera: [1.8, 5.3, 7.9],
    target: [1.55, 4.05, 0.15],
    group: "textbook"
  },
  {
    id: 4,
    title: "木板加固墙壁",
    category: "房屋结构",
    textbook: "用木板加固墙壁。",
    explanation: "观察木板如何与墙体框架连接，认识墙板与木框架共同作用的结构。",
    observe: "找一找：木板覆盖在哪些立柱之间？",
    position: [4.05, 2, -0.5],
    camera: [7.7, 3.8, 4.7],
    target: [3.8, 2, -0.5],
    group: "textbook"
  },
  {
    id: 5,
    title: "连接混凝土地基",
    category: "地基连接",
    textbook: "将房子固定在混凝土地基上。",
    explanation: "观察木构件、金属锚固件与混凝土地基之间的连接，理解房屋与地基需要可靠连接。",
    observe: "找一找：房屋底部是怎样与地基连接的？",
    position: [-3.6, 0.35, 2.85],
    camera: [-6.8, 1.7, 6.7],
    target: [-3.6, 0.35, 2.7],
    group: "textbook"
  },
  {
    id: 6,
    title: "固定热水器",
    category: "室内安全",
    textbook: "将热水器固定在墙壁上。",
    explanation: "观察热水器的固定带和墙体连接，避免设备在摇晃中倾倒、牵拉管线。",
    observe: "找一找：热水器上有几道固定带？",
    position: [1.45, 1.25, 1.55],
    camera: [3.2, 2.2, 6],
    target: [1.45, 1.2, 1.5],
    group: "textbook"
  },
  {
    id: 7,
    title: "加固框架连接",
    category: "房屋结构",
    textbook: "用金属铰链来加固房屋的框架结构。",
    explanation: "观察梁与柱连接处的金属件，认识连接部位在整体结构中的作用。",
    observe: "找一找：哪些梁柱节点增加了金属件？",
    position: [4, 3.2, 2.65],
    camera: [7.2, 4.1, 6.5],
    target: [3.9, 3.15, 2.65],
    group: "textbook"
  },
  {
    id: 8,
    title: "橱柜加装锁扣",
    category: "厨房收纳",
    textbook: "给橱柜门安装可靠的锁扣，减少摇晃时柜门打开、餐具掉落的风险。",
    explanation: "观察柜门与柜体之间的扣件。锁扣要连接牢固，平时使用后也要扣好。",
    observe: "找一找：锁扣的两部分分别连接在哪里？",
    sourceTitle: "CDC · 震前家庭准备",
    sourceUrl: "https://www.cdc.gov/earthquakes/safety/index.html",
    position: [5.72, 2.31, -1.82],
    camera: [5.8, 2.6, 1.35],
    target: [5.72, 2.31, -1.81],
    group: "extension"
  },
  {
    id: 9,
    title: "重物放在低处",
    category: "物品摆放",
    textbook: "将较重和易碎的物品放在低层搁板或低柜内，较轻的物品放在上层。",
    explanation: "比较低层储物罐与上层轻物的位置。低放有助于减少掉落造成的伤害，高大家具仍需要固定。",
    observe: "想一想：重锅和轻盒，哪一个更适合放低层？",
    sourceTitle: "ECA · 家居物品固定",
    sourceUrl: "https://www.earthquakecountry.org/step1/",
    position: [7.65, 0.9, 0.12],
    camera: [7.3, 1.65, 3.3],
    target: [7.65, 1.1, -0.15],
    group: "extension"
  },
  {
    id: 10,
    title: "固定悬挂灯具",
    category: "顶部安全",
    textbook: "检查悬挂灯具与建筑构件的连接，并由专业人员进行必要的固定。",
    explanation: "观察灯具上方的连接件与辅助固定。这里展示连接关系，具体安装方法应按灯具和房屋条件确定。",
    observe: "找一找：灯具的连接件固定在什么位置？",
    sourceTitle: "ECA · 家居物品固定",
    sourceUrl: "https://www.earthquakecountry.org/step1/",
    position: [5.65, 3.02, 0.1],
    camera: [6.6, 2.45, 1.7],
    target: [5.65, 2.97, 0.1],
    group: "extension"
  },
  {
    id: 11,
    title: "应急用品与通道",
    category: "家庭准备",
    textbook: "把饮水、食品、手电和急救用品等存放在方便取用的位置，保持门口与通道畅通。",
    explanation: "应急用品集中收纳在低柜旁，不占用通道。与家人一起了解存放位置，并定期检查和补充。",
    observe: "找一找：应急用品放在哪里，取用时会挡住门吗？",
    sourceTitle: "ECA · 家庭防震行动清单",
    sourceUrl: "https://www.earthquakecountry.org/library/ECA_Your_Action_Plan_For_The_Seven_Steps-EN.pdf",
    position: [5.3, 0.95, 1.45],
    camera: [5.8, 1.65, 4.2],
    target: [5.3, 0.9, 1.2],
    group: "extension"
  }
]
