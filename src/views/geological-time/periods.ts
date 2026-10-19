import { textbookAgeRange, textbookStartMa } from './textbookChronology'

export type SceneKind = 'volcanic' | 'coast' | 'underwater' | 'forest' | 'desert' | 'grassland' | 'ice'

export interface GeologicPeriod {
  id: string
  name: string
  eon: string
  era: string
  rank: '宙' | '纪'
  /** Textbook figure 1-28 boundaries, internally stored in Ma; labels use 亿年. */
  startMa: number
  endMa: number
  ageLabel: string
  color: string
  sceneKind: SceneKind
  representativeAge: string
  location: string
  hook: string
  summary: string
  subtitles: string[]
  organisms: { name: string; note: string; kind: 'animal' | 'plant' | 'microbe' }[]
  facts: { label: string; value: string }[]
  panorama: string
}

/** Same-origin OSS path; development and production supply the proxy. */
export const ASSET_BASE = '/geo-resources-folder/images/geological-time'

export function assetUrl(filename: string): string {
  if (/^(?:https?:|data:|blob:)/i.test(filename)) return filename
  return `${ASSET_BASE}/${filename.replace(/^\/+/, '')}`
}

export const scientificNote = '场景依据化石与地质证据重建，展示各时期某一时间、某一地区的代表性环境；颜色、天气和个体行为含艺术推测。'
export const spiralNote = '螺旋按年代先后排列，长度与真实时长不成比例；演化是分支过程，并非朝某个目标逐级上升。'
export const chronologyNote = '年代分界及单位按教材图1-28：以亿年表示距今的年龄；螺旋示意年代先后，不按实际时长等比例绘制。'

export const periods: GeologicPeriod[] = [
  {
    id: 'hadean', name: '冥古宙', eon: '冥古宙', era: '', rank: '宙',
    startMa: textbookStartMa(0), endMa: textbookStartMa(1), ageLabel: textbookAgeRange(0),
    color: '#e97951', sceneKind: 'volcanic', representativeAge: '约 44 亿年前',
    location: '早期地球 · 假想火山海岸', hook: '行星初生，岩石与海洋的序章',
    summary: '地球在吸积与碰撞中形成，并逐渐分异出内部圈层。古老锆石提示，约 44 亿年前地表可能已有液态水；冥古宙的具体景观仍存在很大不确定性。',
    subtitles: [
      '越过四十多亿年，来到地球早期的海岸。',
      '冷却的岩石与仍在活动的火山，共同塑造年轻地表。',
      '古老锆石提示：液态水可能比想象中更早出现。',
      '这是一种有证据约束的假想景观，生命起源仍待探索。',
    ],
    organisms: [],
    facts: [
      { label: '岩石线索', value: '约 44 亿年前的锆石' },
      { label: '环境线索', value: '早期地壳与可能的液态水' },
      { label: '生命证据', value: '尚无公认的冥古宙生物化石' },
    ],
    panorama: assetUrl('hadean-sr.webp'),
  },
  {
    id: 'archean', name: '太古宙', eon: '太古宙', era: '', rank: '宙',
    startMa: textbookStartMa(1), endMa: textbookStartMa(2), ageLabel: textbookAgeRange(1),
    color: '#dc9b57', sceneKind: 'coast', representativeAge: '约 34.8 亿年前',
    location: '皮尔巴拉 · 火山浅水环境', hook: '微小生命，留下宏大的地质记录',
    summary: '原始大气圈、水圈与岩石圈持续相互作用，大气中的游离氧含量很低。微生物群落在浅水环境生长，部分叠层石保存了它们改造沉积物的痕迹。',
    subtitles: [
      '岩石海岸寂静，水下却可能已有繁忙的微生物世界。',
      '菌席捕获沉积颗粒，日积月累形成层层纹理。',
      '大气圈与水圈已经存在，空气仍远不同于今天。',
      '这里没有森林；太古宙叠层石也不能直接等同于绿藻。',
    ],
    organisms: [
      { name: '微生物菌席', note: '多种微生物形成的群落；早期具体类群仍有不确定性。', kind: 'microbe' },
      { name: '叠层石建造者', note: '叠层石是层状沉积结构，并非单一生物种类。', kind: 'microbe' },
    ],
    facts: [
      { label: '化石参照', value: '约 34.8 亿年前的德雷瑟组' },
      { label: '大气特征', value: '游离氧很少' },
      { label: '生命尺度', value: '以微生物世界为主' },
    ],
    panorama: assetUrl('archean-sr.webp'),
  },
  {
    id: 'proterozoic', name: '元古宙', eon: '元古宙', era: '', rank: '宙',
    startMa: textbookStartMa(2), endMa: textbookStartMa(3), ageLabel: textbookAgeRange(2),
    color: '#b59ac9', sceneKind: 'coast', representativeAge: '约 10 亿年前',
    location: '华北古海域 · 浅海潮坪', hook: '细胞的联合，打开复杂生命的大门',
    summary: '元古宙经历了大气含氧量上升、真核生物与多细胞生物的发展。本场景选取约 10 亿年前的浅海：微小绿藻已有化石记录，陆地森林尚未出现。',
    subtitles: [
      '海水之下，一些细胞已经开始以多细胞的方式生活。',
      '约十亿年前的绿藻化石，记录下细小分枝的身体。',
      '它们只有毫米量级，并不是今天高大的海藻森林。',
      '元古宙跨度漫长；画面只截取其中一个浅海瞬间。',
    ],
    organisms: [
      { name: '多细胞绿藻', note: 'Proterocladus antiquus，约 10 亿年前的毫米级多细胞绿藻。', kind: 'plant' },
      { name: '微生物菌席', note: '铺展在沉积物表面的微生物群落。', kind: 'microbe' },
    ],
    facts: [
      { label: '化石参照', value: '华北南芬组的多细胞绿藻' },
      { label: '重要变化', value: '真核与多细胞生物发展' },
      { label: '时间提醒', value: '埃迪卡拉生物群在更晚时期出现' },
    ],
    panorama: assetUrl('proterozoic-sr.webp'),
  },
  {
    id: 'cambrian', name: '寒武纪', eon: '显生宙', era: '古生代', rank: '纪',
    startMa: textbookStartMa(3), endMa: textbookStartMa(4), ageLabel: textbookAgeRange(3),
    color: '#83b887', sceneKind: 'underwater', representativeAge: '约 5.08 亿年前',
    location: '伯吉斯页岩古海域 · 大陆边缘海底', hook: '海洋中，动物身体的多样性展开',
    summary: '寒武纪早期，许多动物类群在化石记录中变得丰富。伯吉斯页岩保存了约 5.08 亿年前的海洋群落，包括三叶虫、海绵与奇虾等动物。',
    subtitles: [
      '潜入五亿多年前的海洋，陌生的身体形态在身边展开。',
      '三叶虫沿海底活动，海绵从水流中获取食物。',
      '奇虾摆动身体两侧的叶片，游过这片古老海域。',
      '所谓寒武纪生命大爆发，是地质时间尺度上的多样化。',
    ],
    organisms: [
      { name: '三叶虫', note: '已经灭绝的海生节肢动物，拥有分节外骨骼。', kind: 'animal' },
      { name: '奇虾', note: '放射齿类节肢动物；以身体两侧的叶片游泳。', kind: 'animal' },
      { name: '海绵', note: '固着生活、依靠水流滤食的动物。', kind: 'animal' },
    ],
    facts: [
      { label: '化石窗口', value: '加拿大伯吉斯页岩生物群' },
      { label: '生态舞台', value: '海洋' },
      { label: '主要变化', value: '动物身体结构与生态角色多样化' },
    ],
    panorama: assetUrl('cambrian-sr.webp'),
  },
  {
    id: 'ordovician', name: '奥陶纪', eon: '显生宙', era: '古生代', rank: '纪',
    startMa: textbookStartMa(4), endMa: textbookStartMa(5), ageLabel: textbookAgeRange(4),
    color: '#68ada0', sceneKind: 'underwater', representativeAge: '约 4.5 亿年前',
    location: '劳伦大陆 · 温暖的浅海陆棚', hook: '浅海之中，生命织成更密的网络',
    summary: '奥陶纪海洋生物显著多样化。腕足动物、苔藓动物和海百合组成丰富的海底群落，带壳头足类在海水中活动；纪末发生了与气候和海平面变化有关的灭绝事件。',
    subtitles: [
      '温暖浅海覆盖大陆边缘，海底铺开繁盛的群落。',
      '海百合伸展腕部；它们看似花朵，其实是动物。',
      '腕足动物固守海底，带壳头足类穿过上方水层。',
      '走到这一纪的末尾，降温与海平面变化将重塑海洋。',
    ],
    organisms: [
      { name: '海百合', note: '棘皮动物，利用腕部从水流中收集食物。', kind: 'animal' },
      { name: '腕足动物', note: '具有背、腹两壳，与双壳贝类属于不同类群。', kind: 'animal' },
      { name: '直壳头足类', note: '一类具有直形外壳的古生代海洋动物。', kind: 'animal' },
    ],
    facts: [
      { label: '生物事件', value: '奥陶纪生物大辐射' },
      { label: '海底群落', value: '腕足动物、苔藓动物、海百合' },
      { label: '纪末转折', value: '冰期与海平面变化伴随灭绝' },
    ],
    panorama: assetUrl('ordovician-sr.webp'),
  },
  {
    id: 'silurian', name: '志留纪', eon: '显生宙', era: '古生代', rank: '纪',
    startMa: textbookStartMa(5), endMa: textbookStartMa(6), ageLabel: textbookAgeRange(5),
    color: '#96bcab', sceneKind: 'coast', representativeAge: '约 4.25 亿年前',
    location: '古不列颠南部 · 潮湿海岸', hook: '简单分枝的植物，拓展陆地上的绿色',
    summary: '志留纪海洋生态逐步恢复，有颌脊椎动物进一步发展。陆生植物的记录可追溯至更早的奥陶纪；志留纪的部分植物已有简单分枝和孢子囊，植株仍矮小，尚未形成高大的森林。',
    subtitles: [
      '潮水退去，湿润的沉积物上出现零星绿色。',
      '这些简单分枝的早期植物，还没有现代树木的模样。',
      '水边的板足鲎属于节肢动物，不是今天的蝎子。',
      '陆地生态系统的建立，是跨越漫长岁月的过程。',
    ],
    organisms: [
      { name: '库克逊植物类', note: '厘米级的早期陆生植物，以简单分枝和顶端孢子囊为特征。', kind: 'plant' },
      { name: '板足鲎', note: '已经灭绝的水生节肢动物，常被俗称为海蝎。', kind: 'animal' },
    ],
    facts: [
      { label: '陆地变化', value: '早期陆生植物逐渐扩展' },
      { label: '植物形态', value: '矮小、简单分枝、以孢子繁殖' },
      { label: '海洋变化', value: '有颌脊椎动物发展' },
    ],
    panorama: assetUrl('silurian-sr.webp'),
  },
  {
    id: 'devonian', name: '泥盆纪', eon: '显生宙', era: '古生代', rank: '纪',
    startMa: textbookStartMa(6), endMa: textbookStartMa(7), ageLabel: textbookAgeRange(6),
    color: '#b3a268', sceneKind: 'forest', representativeAge: '约 3.85 亿年前',
    location: '吉尔博亚古环境 · 赤道附近的湿地', hook: '第一批森林，开始改写大地',
    summary: '泥盆纪鱼类十分多样，森林也开始在陆地扩展。吉尔博亚化石记录揭示了早期森林的复杂组成；根系、凋落物和树冠逐渐改变土壤与水文过程。',
    subtitles: [
      '第一次穿行在森林之中，头顶却没有熟悉的阔叶树冠。',
      '早期树木抬高了绿色的高度，也改变了脚下的土壤。',
      '根系、流水与岩石相遇，陆地的物质循环随之变化。',
      '泥盆纪的足迹与骨骼化石，还记录了四足动物的早期演化。',
    ],
    organisms: [
      { name: '枝蕨类树木', note: '以吉尔博亚早期森林为参照，树冠由分枝结构组成。', kind: 'plant' },
      { name: '早期石松类', note: '泥盆纪森林群落中的维管植物类群。', kind: 'plant' },
      { name: '盾皮鱼类', note: '泥盆纪多样化的有颌鱼类，头部与躯干前部常覆骨甲；此处不指定属种。', kind: 'animal' },
    ],
    facts: [
      { label: '化石参照', value: '美国纽约州吉尔博亚古森林' },
      { label: '环境影响', value: '森林改变土壤、风化与水文过程' },
      { label: '海洋生命', value: '鱼类高度多样化' },
    ],
    panorama: assetUrl('devonian-sr.webp'),
  },
  {
    id: 'carboniferous', name: '石炭纪', eon: '显生宙', era: '古生代', rank: '纪',
    startMa: textbookStartMa(7), endMa: textbookStartMa(8), ageLabel: textbookAgeRange(7),
    color: '#70a99b', sceneKind: 'forest', representativeAge: '约 3.1 亿年前',
    location: '欧美古大陆 · 赤道煤沼森林', hook: '高耸的煤沼森林，将阳光封存入地下',
    summary: '晚石炭世赤道部分低地分布着茂密煤沼森林，树状石松类、芦木与种子蕨共同生长。植物遗体在适合的埋藏条件下积累，经过地质作用形成部分煤层。',
    subtitles: [
      '沿着湿润林地前行，鳞木与芦木拔地而起。',
      '倒下的植物在低洼处积累，留下未来煤层的原料。',
      '巨型节肢动物曾在这样的古老陆地环境中活动。',
      '这只是赤道低地的一幕，石炭纪的地球也有冰川。',
    ],
    organisms: [
      { name: '鳞木类', note: '高大的树状石松植物，树干可留下鳞片状叶痕。', kind: 'plant' },
      { name: '芦木', note: '木贼类的古老亲缘类群，具有明显的节与节间。', kind: 'plant' },
      { name: '节胸类', note: 'Arthropleura，部分个体巨大；食性等细节仍有争论。', kind: 'animal' },
    ],
    facts: [
      { label: '典型环境', value: '赤道部分低地的煤沼森林' },
      { label: '岩石记录', value: '植物遗体埋藏形成部分煤层' },
      { label: '气候提醒', value: '同期南半球存在大范围冰川' },
    ],
    panorama: assetUrl('carboniferous-sr.webp'),
  },
  {
    id: 'permian', name: '二叠纪', eon: '显生宙', era: '古生代', rank: '纪',
    startMa: textbookStartMa(8), endMa: textbookStartMa(9), ageLabel: textbookAgeRange(8),
    color: '#cc886f', sceneKind: 'desert', representativeAge: '约 2.8 亿年前',
    location: '古得克萨斯北部 · 季节性干旱河漫滩', hook: '盘古大陆之上，陆地生态继续分化',
    summary: '盘古大陆的广大内陆地区呈现较强的干旱与季节性。早二叠世陆地上生活着异齿龙等合弓类；二叠纪末发生了地球历史上规模最大的生物灭绝事件之一。',
    subtitles: [
      '河水切过红色沉积物，雨季与旱季交替到来。',
      '异齿龙背负高大的帆状结构，走过稀疏植被之间。',
      '它属于合弓类，与哺乳动物的亲缘比与恐龙更近。',
      '数千万年后，二叠纪末的大灭绝将深刻改变生命史。',
    ],
    organisms: [
      { name: '异齿龙', note: '早期合弓类动物，不属于恐龙。', kind: 'animal' },
      { name: '早期松柏类', note: '适应部分较干环境的种子植物。', kind: 'plant' },
      { name: '种子蕨', note: '具有蕨状叶片、以种子繁殖的多种古老植物。', kind: 'plant' },
    ],
    facts: [
      { label: '大陆格局', value: '盘古大陆广泛形成' },
      { label: '动物辨别', value: '异齿龙是合弓类，不是恐龙' },
      { label: '纪末事件', value: '约 2.52 亿年前的生物大灭绝' },
    ],
    panorama: assetUrl('permian-sr.webp'),
  },
  {
    id: 'triassic', name: '三叠纪', eon: '显生宙', era: '中生代', rank: '纪',
    startMa: textbookStartMa(9), endMa: textbookStartMa(10), ageLabel: textbookAgeRange(9),
    color: '#b696c8', sceneKind: 'forest', representativeAge: '约 2.2 亿年前',
    location: '钦利古环境 · 河流与针叶林', hook: '大灭绝之后，生态系统重新展开',
    summary: '三叠纪生命在大灭绝后逐步恢复。晚三叠世河流平原上，针叶林与蕨类生长，植龙和坚蜥等爬行动物十分显眼；早期恐龙已经出现，尚未占据所有大型陆生动物的位置。',
    subtitles: [
      '河流穿过针叶林，新的生态系统在废墟之后建立。',
      '水边潜伏着植龙，林间活动着披甲的坚蜥。',
      '它们都不是恐龙；中生代的陆地远比想象中多样。',
      '早期恐龙已经登场，更广阔的扩展仍在后面。',
    ],
    organisms: [
      { name: '植龙', note: '外形似鳄的已灭绝爬行动物，鼻孔位置靠近眼部。', kind: 'animal' },
      { name: '坚蜥', note: '背覆骨质甲板的主龙类，与鳄类亲缘较近。', kind: 'animal' },
      { name: '针叶树与蕨类', note: '河流平原上的重要植物，没有被子植物花海。', kind: 'plant' },
    ],
    facts: [
      { label: '化石参照', value: '北美钦利群与石化林地区' },
      { label: '生命进程', value: '大灭绝后的恢复与演化' },
      { label: '动物辨别', value: '植龙、坚蜥均不属于恐龙' },
    ],
    panorama: assetUrl('triassic-sr.webp'),
  },
  {
    id: 'jurassic', name: '侏罗纪', eon: '显生宙', era: '中生代', rank: '纪',
    startMa: textbookStartMa(10), endMa: textbookStartMa(11), ageLabel: textbookAgeRange(10),
    color: '#71b8c7', sceneKind: 'forest', representativeAge: '约 1.5 亿年前',
    location: '莫里森古环境 · 北美河流平原', hook: '与巨龙同行，穿越裸子植物的世界',
    summary: '晚侏罗世莫里森河流平原生活着梁龙与剑龙等恐龙。针叶树、银杏类、蕨类和木贼类构成当地植被；这里没有现代草原，也不能加入晚白垩世的霸王龙与三角龙。',
    subtitles: [
      '沿河岸抬头，梁龙的长颈越过低矮植被。',
      '剑龙穿行其间，远处的树冠以裸子植物为主。',
      '脚下生长的是蕨类和木贼类，并非现代草坪。',
      '我们来到晚侏罗世的一处河谷，距离霸王龙还很遥远。',
    ],
    organisms: [
      { name: '梁龙', note: '晚侏罗世北美蜥脚类恐龙，长颈长尾，四足行走。', kind: 'animal' },
      { name: '剑龙', note: '背部有骨板、尾部有尖刺的植食性恐龙。', kind: 'animal' },
      { name: '针叶树、苏铁类与蕨类', note: '莫里森环境的代表植物；苏铁类外形似棕榈，但属于裸子植物。', kind: 'plant' },
    ],
    facts: [
      { label: '化石参照', value: '北美莫里森组' },
      { label: '地貌参照', value: '河流、洪泛平原与季节性干湿变化' },
      { label: '时间辨别', value: '霸王龙与三角龙生活在更晚时期' },
    ],
    panorama: assetUrl('jurassic-hd.webp'),
  },
  {
    id: 'cretaceous', name: '白垩纪', eon: '显生宙', era: '中生代', rank: '纪',
    startMa: textbookStartMa(11), endMa: textbookStartMa(12), ageLabel: textbookAgeRange(11),
    color: '#a7c981', sceneKind: 'forest', representativeAge: '约 6700 万年前',
    location: '地狱溪古环境 · 北美河漫滩', hook: '花开之后，熟悉又陌生的恐龙世界',
    summary: '白垩纪被子植物广泛发展。本场景选取约 6700 万年前的地狱溪生态系统，三角龙与霸王龙生活于林地和河漫滩；约 6600 万年前，非鸟类恐龙灭绝，鸟类延续至今。',
    subtitles: [
      '阔叶植物逐渐改变景观，河漫滩上展开丰富的食物网。',
      '三角龙沿河岸活动，霸王龙出现在同一地区的化石记录中。',
      '此时距离白垩纪末的大灾变，只剩约一百万年。',
      '灭绝带走了非鸟类恐龙；鸟类这一支仍飞翔在今天。',
    ],
    organisms: [
      { name: '三角龙', note: '晚白垩世北美角龙类，头部有角和骨质颈盾。', kind: 'animal' },
      { name: '霸王龙', note: '晚白垩世北美大型兽脚类恐龙。', kind: 'animal' },
      { name: '被子植物与针叶树', note: '地狱溪化石记录还包括棕榈类与蕨类等。', kind: 'plant' },
    ],
    facts: [
      { label: '化石参照', value: '北美地狱溪组' },
      { label: '植物变化', value: '被子植物在白垩纪广泛发展' },
      { label: '灭绝辨别', value: '灭绝的是非鸟类恐龙，鸟类幸存' },
    ],
    panorama: assetUrl('cretaceous-sr.webp'),
  },
  {
    id: 'paleogene', name: '古近纪', eon: '显生宙', era: '新生代', rank: '纪',
    startMa: textbookStartMa(12), endMa: textbookStartMa(13), ageLabel: textbookAgeRange(12),
    color: '#d6ad7f', sceneKind: 'coast', representativeAge: '约 5200 万年前',
    location: '绿河古湖 · 亚热带湖岸', hook: '湖光与林影中，新的世界逐渐成形',
    summary: '古近纪哺乳动物与鸟类继续多样化。约 5200 万年前，今天的美国怀俄明地区曾有温暖湖泊，鱼类、龟类、鸟类和繁茂植物共同组成古湖生态系统。',
    subtitles: [
      '湖面倒映棕榈与阔叶树，温暖的空气掠过岸边。',
      '龟类停栖在倒木上，鸟类沿着温暖的湖岸活动。',
      '湖底细密的沉积，保存下这个世界的生命切片。',
      '新生代展开了；哺乳动物与鸟类的故事仍在延伸。',
    ],
    organisms: [
      { name: '古湖鱼类', note: '绿河组保存了丰富且精细的淡水鱼类化石。', kind: 'animal' },
      { name: '龟类与鸟类', note: '古湖及周边环境中的脊椎动物。', kind: 'animal' },
      { name: '棕榈与阔叶树', note: '植物化石反映了当时温暖的古湖环境。', kind: 'plant' },
      { name: '早期马类', note: '始新世北美的小型森林食叶动物；早期类型前足四趾、后足三趾。', kind: 'animal' },
    ],
    facts: [
      { label: '化石参照', value: '绿河组化石湖，约 5200 万年前' },
      { label: '当时气候', value: '该地区比今天温暖' },
      { label: '生命变化', value: '哺乳动物与鸟类持续多样化' },
    ],
    panorama: assetUrl('paleogene-sr.webp'),
  },
  {
    id: 'neogene', name: '新近纪', eon: '显生宙', era: '新生代', rank: '纪',
    startMa: textbookStartMa(13), endMa: textbookStartMa(14), ageLabel: textbookAgeRange(13),
    color: '#d7bf6c', sceneKind: 'grassland', representativeAge: '约 1900 万年前',
    location: '阿盖特古环境 · 北美疏林与草地', hook: '开阔的地平线，带来新的生存方式',
    summary: '新近纪许多地区的开阔环境扩展，食草哺乳动物群落随之变化。本场景参考北美阿盖特化石记录，展示小型犀类与爪兽类生活的疏林、草地和水源地。',
    subtitles: [
      '树林之间出现更开阔的空间，水源吸引着成群动物。',
      '小型犀类在岸边活动，爪兽类取食周围的植物。',
      '这些动物并不是今天非洲草原物种的简单复制。',
      '草地与疏林的变化，塑造了新的取食与移动方式。',
    ],
    organisms: [
      { name: '小型犀类 Menoceras', note: '阿盖特记录中的小型犀类；雄性鼻角左右并列，雌性没有鼻角。', kind: 'animal' },
      { name: 'Moropus 爪兽', note: '具有爪状末端的奇蹄类植食动物。', kind: 'animal' },
      { name: '草本与疏林植物', note: '开放环境与林地并存，不代表整个新近纪的全球景观。', kind: 'plant' },
    ],
    facts: [
      { label: '化石参照', value: '美国内布拉斯加州阿盖特化石床' },
      { label: '生态变化', value: '许多地区开阔环境扩展' },
      { label: '代表动物', value: '小型犀类与爪兽类' },
    ],
    panorama: assetUrl('neogene-sr.webp'),
  },
  {
    id: 'quaternary', name: '第四纪', eon: '显生宙', era: '新生代', rank: '纪',
    startMa: textbookStartMa(14), endMa: textbookStartMa(15), ageLabel: textbookAgeRange(14),
    color: '#acd5dc', sceneKind: 'ice', representativeAge: '约 2 万年前',
    location: '西伯利亚 · 猛犸草原', hook: '冰期的旷野，通向我们生活的今天',
    summary: '第四纪冰期与间冰期交替，现代人类在这一时期出现并广泛扩散。末次冰期的部分西伯利亚低地寒冷而干燥，草本植被养活了猛犸等大型植食动物，并非处处被冰盖覆盖。',
    subtitles: [
      '冷风掠过草原，长毛猛犸沿开阔的地平线移动。',
      '这里寒冷而干燥，地面仍长着足以维持生命的草本。',
      '冰期并不意味着整个地球，都埋在厚厚的冰层之下。',
      '时间继续向前，第四纪延伸到你我正在经历的此刻。',
    ],
    organisms: [
      { name: '长毛猛犸', note: '适应寒冷开放环境的象类，体被长毛、耳较小。', kind: 'animal' },
      { name: '寒地草本', note: '包含多种禾草与杂类草，是古草原食物网的基础。', kind: 'plant' },
    ],
    facts: [
      { label: '气候节律', value: '冰期与间冰期交替' },
      { label: '景观辨别', value: '部分西伯利亚低地保持无冰状态' },
      { label: '概览中的人类', value: '更新世用火生活示意，不表示人类最早用火的时刻' },
      { label: '今天的位置', value: '显生宙 · 新生代 · 第四纪' },
    ],
    panorama: assetUrl('quaternary-hd.webp'),
  },
]

export const citations = [
  { label: '史密森学会 · 人类用火与炉灶证据', url: 'https://humanorigins.si.edu/evidence/behavior/hearths-shelters' },
  { label: 'Nature · 早期陆生植物与奥陶纪孢子证据', url: 'https://pubmed.ncbi.nlm.nih.gov/13679913/' },
  { label: 'Nature · 中泥盆世四足动物足迹', url: 'https://www.nature.com/articles/nature08623' },
  { label: 'PNAS · 二叠纪末灭绝的测年区间', url: 'https://doi.org/10.1073/pnas.1317692111' },
  { label: 'NASA · 古老锆石与早期液态水', url: 'https://science.nasa.gov/earth/earth-observatory/ancient-crystals-suggest-earlier-ocean/' },
  { label: 'Nature Communications · 34.8 亿年前的德雷瑟组', url: 'https://www.nature.com/articles/ncomms15263' },
  { label: 'Nature Ecology & Evolution · 约 10 亿年前的绿藻', url: 'https://www.nature.com/articles/s41559-020-1122-9' },
  { label: '皇家安大略博物馆 · 伯吉斯页岩奇虾', url: 'https://burgess-shale.rom.on.ca/fossils/anomalocaris-canadensis/' },
  { label: 'NPS · 奥陶纪海洋生物', url: 'https://www.nps.gov/articles/000/ordovician-period.htm' },
  { label: '威尔士国家博物馆 · 志留纪库克逊植物标本', url: 'https://museum.wales/database/geology/palaeontology/?count=2&position=0&specimen=69&value=Cooksonia+cambrensis' },
  { label: 'Nature · 吉尔博亚泥盆纪森林', url: 'https://www.nature.com/articles/nature10819' },
  { label: '自然历史博物馆 · 节胸类的新化石证据', url: 'https://www.nhm.ac.uk/discover/news/2024/october/largest-ever-millipede-head-revealed.html' },
  { label: '史密森学会 · 深时生命史展览', url: 'https://www.si.edu/newsdesk/factsheets/david-h-koch-hall-fossils-deep-time' },
  { label: 'NPS · 三叠纪石化林的主龙类', url: 'https://www.nps.gov/pefo/learn/pseudosuchians.htm' },
  { label: 'NPS · 莫里森组的侏罗纪环境', url: 'https://www.nps.gov/subjects/fossils/the-morrison-formation.htm' },
  { label: '史密森国家自然历史博物馆 · 地狱溪植物', url: 'https://naturalhistory.si.edu/education/teaching-resources/paleontology/make-dinosaur-ecosystem-mural/plants' },
  { label: 'NPS · 5200 万年前的化石湖', url: 'https://www.nps.gov/fobu/learn/nature/fossils.htm' },
  { label: 'NPS · 阿盖特的中新世哺乳动物', url: 'https://www.nps.gov/agfo/learn/nature/mammalfossils.htm' },
  { label: '自然历史博物馆 · 猛犸与寒冷草原环境', url: 'https://www.nhm.ac.uk/discover/were-all-mammoths-woolly.html' },
  { label: 'NPS · 冰期白令地区的无冰低地', url: 'https://www.nps.gov/articles/aps-v12-i2-c8.htm' },
  { label: '美国自然历史博物馆 · 早期马类与分类修订', url: 'https://research.amnh.org/paleontology/perissodactyl/evolution/groups/equoidea' },
  { label: '史密森海洋 · 泥盆纪装甲鱼类', url: 'https://ocean.si.edu/through-time/bony-beginnings-rise-vertebrate-innovation-devonian' },
]
