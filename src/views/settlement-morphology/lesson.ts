import type { Landscape } from './types'

export const BRAND_LOGO =
  'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

export const LANDSCAPES: {
  id: Landscape
  title: string
  subtitle: string
  shape: string
  description: string
  question: string
  clues: string[]
  takeaway: string
  figure: string
}[] = [
  {
    id: 'plain',
    title: '东北平原',
    subtitle: '平坦开阔 · 向四周发展',
    shape: '多呈团块状',
    description: '地面较平坦，周围用地较开阔，房屋容易向多个方向聚集。',
    question: '这里的乡村为什么常聚成一团？',
    clues: [
      '从俯视图看，房屋是聚成一片，还是排成一条？',
      '观察四周：哪些方向有平坦的陆地？',
      '进入“亲手选址”，试着向不同方向扩展聚落。',
    ],
    takeaway: '平坦开阔的地形利于聚落向四周发展，团块状较常见；道路、生产和历史也会影响形态。',
    figure: '教材第120页 · 图5-20 东北平原上的乡村',
  },
  {
    id: 'valley',
    title: '阿尔卑斯山谷',
    subtitle: '两侧山坡 · 沿谷地延伸',
    shape: '常沿谷地呈条带状',
    description: '两侧山坡较陡，谷地与山麓较平缓的地带为聚落提供了发展空间。',
    question: '山谷里的房屋为什么沿着谷地延伸？',
    clues: [
      '转动场景，比较谷底和两侧山坡的坡度。',
      '观察较平缓的陆地，是宽阔一片，还是狭长一带？',
      '进入“亲手选址”，比较谷地与陡坡上的放置反馈。',
    ],
    takeaway: '山地限制横向扩展，聚落常沿较平缓的谷地、山麓和交通线延伸。',
    figure: '教材第120页 · 图5-21 阿尔卑斯山区的乡村',
  },
  {
    id: 'river',
    title: '尼罗河岸',
    subtitle: '依水而建 · 沿河联系',
    shape: '本例沿河呈条带状',
    description: '河流提供水源，也有利于灌溉与水路联系。教材中的城镇沿尼罗河延伸。',
    question: '依水而建有哪些好处？房屋应放在哪里？',
    clues: [
      '观察房屋的排列方向与河流走向是否相近。',
      '想一想，生活取水、农田灌溉和交通怎样利用河流？',
      '进入“亲手选址”，比较河岸陆地与河道内的反馈。',
    ],
    takeaway: '依水而建有利于用水和联系，但依水不等于建在河道里，也不代表所有沿河聚落都是条带状。',
    figure: '教材第120页 · 图5-22 尼罗河畔的城镇',
  },
  {
    id: 'coast',
    title: '五渔村',
    subtitle: '迁移探究 · 山与海之间',
    shape: '依坡聚集，临海分布',
    description: '意大利五渔村由五个村镇组成。居民种植葡萄等作物，并利用渔港开展贸易。',
    question: '五渔村怎样适应山地与海洋环境？',
    clues: [
      '看地势：房屋怎样顺应山坡，利用有限的陆地？',
      '看临海位置：海湾与港口能为生产、联系提供什么便利？',
      '联系梯田农业、葡萄等作物和渔港贸易，解释人地关系。',
    ],
    takeaway: '五渔村体现了地势、临海位置与生产活动的共同影响。聚落形态不能只用一个因素解释。',
    figure: '教材第121页 · 图5-23 五渔村景观及位置',
  },
  {
    id: 'dubai',
    title: '阿联酋迪拜',
    subtitle: '教材拓展窗 · 从渔村到都市',
    shape: '从沙漠渔村到繁华都市',
    description: '教材用三个时期的照片记录迪拜的变化：早期渔村、20世纪60年代的城镇，以及教材中的现代都市。',
    question: '迪拜怎样从沙漠渔村发展为繁华都市？',
    clues: [
      '19世纪初还是小渔村，居民靠渔业、珍珠采集和骆驼贸易为生。',
      '20世纪起贸易发展、城市扩大；1966年发现海底石油后，迅速发展为重要的石油城市。',
      '后来发展旅游会展、交通运输、转口贸易、房地产等产业。对照教材三图，观察建筑和道路的变化。',
    ],
    takeaway: '迪拜的发展说明，聚落不仅受自然环境影响，也会随贸易、资源开发和产业发展而变化。今天的城镇可能由过去的乡村演变而来。',
    figure: '教材第122页 · 拓展窗 · 图5-24—5-26 迪拜的变化',
  },
]

export const DUBAI_ERAS: { title: string; period: string; detail: string }[] = [
  {
    title: '沙漠渔村',
    period: '20世纪初',
    detail: '图5-24：沙地与海湾边聚集着低矮建筑。教材介绍，早期居民靠渔业、珍珠采集和骆驼贸易为生。观察房屋、船只与沙地的关系。',
  },
  {
    title: '港口城镇',
    period: '20世纪60年代',
    detail: '图5-25：水道两岸出现密集的平顶楼房，船只往来。20世纪的贸易发展推动城市扩大；1966年发现海底石油，又带来新的发展。',
  },
  {
    title: '现代都市',
    period: '教材中的“今日”',
    detail: '图5-26：高楼形成天际线，道路与城市设施更加丰富。教材介绍迪拜后来发展旅游会展、交通运输、转口贸易、房地产等产业，成为知名旅游城市。',
  },
]

export const QUIZ: {
  id: string
  question: string
  options: { text: string; correct: boolean; feedback: string }[]
}[] = [
  {
    id: 'plain-shape',
    question: '东北平原上的乡村多呈团块状，哪项解释较合理？',
    options: [
      {
        text: '地势平坦开阔，聚落向四周发展较方便。',
        correct: true,
        feedback: '对！平坦开阔提供了空间，但道路和历史等因素也会影响形态。',
      },
      {
        text: '平原上的所有聚落都必须是团块状。',
        correct: false,
        feedback: '“多呈”表示常见，并不表示全部。请再比较地形与可用空间。',
      },
      {
        text: '两侧高山使房屋只能沿一个方向排列。',
        correct: false,
        feedback: '这更接近狭窄山谷的情况。东北平原的线索是平坦、开阔。',
      },
    ],
  },
  {
    id: 'valley-space',
    question: '阿尔卑斯山谷里的聚落常沿谷地延伸，主要观察依据是什么？',
    options: [
      {
        text: '只要在山里，房屋排列就一定相同。',
        correct: false,
        feedback: '不同山地的谷地宽窄、坡度和交通条件不同，聚落形态也会不同。',
      },
      {
        text: '两侧山坡较陡，较平缓的地带呈狭长分布。',
        correct: true,
        feedback: '对！可用空间较狭长，聚落常顺着谷地、山麓和交通线发展。',
      },
      {
        text: '谷地里没有水源，也没有道路。',
        correct: false,
        feedback: '“没有”不能从形态直接推断。请观察坡度、可用空间和交通联系。',
      },
    ],
  },
  {
    id: 'river-location',
    question: '关于“依水而建”，哪种理解合适？',
    options: [
      {
        text: '越靠近水越好，房屋可以直接放进河道。',
        correct: false,
        feedback: '河道需要行水。依水而建要利用岸上陆地，真实选址还要评估洪水等风险。',
      },
      {
        text: '所有河岸聚落都只能形成条带状。',
        correct: false,
        feedback: '尼罗河案例呈条带状，但沿河聚落也受地形、道路和历史等因素影响。',
      },
      {
        text: '水源、灌溉和交通带来便利，选址仍要考虑地势与风险。',
        correct: true,
        feedback: '对！利用水的好处，也要认识洪水等限制；模型不能代替真实选址调查。',
      },
    ],
  },
  {
    id: 'coast-transfer',
    question: '解释五渔村怎样适应自然环境，哪组线索最完整？',
    options: [
      {
        text: '山地地势、临海位置，以及梯田农业和渔港贸易。',
        correct: true,
        feedback: '对！把环境条件与居民的生产、生活联系起来，解释才更完整。',
      },
      {
        text: '只看海洋，山坡和居民的生产活动都不重要。',
        correct: false,
        feedback: '还要观察山地如何限制空间，以及居民怎样利用山坡和港湾。',
      },
      {
        text: '看见山坡上有房屋，就说明所有陡坡都适合建房。',
        correct: false,
        feedback: '不能从一幅景观图推断工程安全。真实建设需要调查和专业评估。',
      },
    ],
  },
  {
    id: 'dubai-evolution',
    question: '根据教材拓展窗，哪项能较完整地解释迪拜的发展？',
    options: [
      {
        text: '地形没有变化，聚落就不会发生变化。',
        correct: false,
        feedback: '聚落还会受经济社会发展影响。教材展示了迪拜在不同时期的明显变化。',
      },
      {
        text: '贸易发展、海底石油开发和后来的多种产业推动了城市发展。',
        correct: true,
        feedback: '对！教材先介绍贸易和石油带来的发展，再介绍旅游会展、交通运输、转口贸易等产业。',
      },
      {
        text: '发现石油是唯一原因，此后迪拜没有发展其他产业。',
        correct: false,
        feedback: '石油很重要，但不是全部。教材还介绍了旅游会展、交通运输、转口贸易、房地产等产业。',
      },
    ],
  },
]

export const MODEL_NOTE =
  '本模型以夸张地形示意聚落分布，位置、尺度和房屋数量不代表实景。地形、水源、交通、生产与历史共同影响形态。模型“可放置”不等于真实建设安全。'

export const SOURCES: { title: string; detail: string; url?: string }[] = [
  {
    title: '教材第120页｜聚落形态探究',
    detail: '第五单元“人文环境”，第二节“城镇与乡村”；图5-20、图5-21、图5-22。上海版地理六年级上册。',
  },
  {
    title: '教材第121页｜五渔村探究',
    detail: '图5-23“五渔村景观及位置”；结合地势、临海位置、种植与渔港贸易开展迁移探究。上海版地理六年级上册。',
  },
  {
    title: '教材第122页｜拓展窗：阿联酋迪拜',
    detail: '“阿联酋迪拜——从沙漠渔村发展为繁华都市”；图5-24为20世纪初，图5-25为20世纪60年代，图5-26题为“今日的迪拜”。“今日”指教材配图时期，场景为教学示意。上海版地理六年级上册。',
  },
  {
    title: '迪拜地标补充｜卓美亚帆船酒店',
    detail: '建筑外形参考卓美亚官方资料中的帆形轮廓、海上人工岛与直升机坪，用于辅助识别现代旅游产业。场景中的建筑比例与区位组合为教学示意。',
    url: 'https://mediahub.jumeirah.com/wp-content/uploads/2025/08/72d363d2b4b9f34c3f0da5e6e46cbe06.pdf',
  },
  {
    title: '课堂模型说明',
    detail: '三维场景为教学示意，不是实测地形或工程方案；团块状、条带状用于比较常见形态，不能作为所有聚落的固定规则。',
  },
]
