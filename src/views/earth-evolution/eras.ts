export type EonId =
  | 'hadean'
  | 'archean'
  | 'proterozoic'
  | 'phanerozoic'

export type EraId =
  | 'hadean'
  | 'archean'
  | 'proterozoic'
  | 'paleozoic'
  | 'mesozoic'
  | 'cenozoic'

export type EraSceneType =
  | 'hadean'
  | 'archean'
  | 'proterozoic'
  | 'cambrian'
  | 'ordovician'
  | 'silurian'
  | 'devonian'
  | 'carboniferous'
  | 'permian'
  | 'triassic'
  | 'jurassic'
  | 'cretaceous'
  | 'paleogene'
  | 'neogene'
  | 'quaternary'

export interface EraDefinition {
  id: string
  name: string
  eon: EonId
  eonLabel: string
  era: EraId
  eraLabel: string
  scene: EraSceneType
  ageLabel: string
  ageMya: number
  tag: string
  description: string
  creatures: string
  environment: string
  events: string
}

export const eras: EraDefinition[] = [
  {
    id: 'hadean',
    name: '冥古宙',
    eon: 'hadean',
    eonLabel: 'Hadean · 冥古宙',
    era: 'hadean',
    eraLabel: '冥古宙',
    scene: 'hadean',
    ageLabel: '46~40 亿年前',
    ageMya: 4600,
    tag: '地球形成',
    description:
      '地球在 46 亿年前由太阳系原始星云吸积形成。早期地球被炽热的岩浆海覆盖，地表温度超过 1200℃，不断遭受陨石撞击，没有海洋、没有生命，只有翻腾的岩浆与冲天的火山。',
    creatures: '尚无生命',
    environment:
      '熔岩海洋 / 火山遍布 / 还原性大气',
    events: '原始地球吸积 / 月球形成 / 岩浆海',
  },
  {
    id: 'archean',
    name: '太古宙',
    eon: 'archean',
    eonLabel: 'Archean · 太古宙',
    era: 'archean',
    eraLabel: '太古宙',
    scene: 'archean',
    ageLabel: '40~25 亿年前',
    ageMya: 4000,
    tag: '原始生命',
    description:
      '随着地表冷却，水蒸气凝结形成原始海洋，地球出现最早的水圈。最原始的原核生物在深海热泉口附近诞生，蓝藻通过光合作用开始改造大气。',
    creatures: '蓝藻 / 原始细菌',
    environment:
      '浅海 / 火山岛弧 / 缺氧富铁海洋',
    events: '海洋形成 / 最早生命 / 叠层石',
  },
  {
    id: 'proterozoic',
    name: '元古宙',
    eon: 'proterozoic',
    eonLabel: 'Proterozoic · 元古宙',
    era: 'proterozoic',
    eraLabel: '元古宙',
    scene: 'proterozoic',
    ageLabel: '25~5.41 亿年前',
    ageMya: 2500,
    tag: '氧气革命',
    description:
      '蓝藻大规模繁盛，释放氧气引发"大氧化事件"，使海洋中的二价铁被氧化成条带状铁建造，大气含氧量上升，真核生物逐渐出现，多细胞生物开始演化。',
    creatures:
      '蓝藻 / 真核藻类 / 早期多细胞生物',
    environment:
      '氧化大气 / 巨型海洋 / 罗迪尼亚超大陆',
    events: '大氧化事件 / 雪球地球 / 真核生物起源',
  },
  {
    id: 'cambrian',
    name: '寒武纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'paleozoic',
    eraLabel: '古生代 · 寒武纪',
    scene: 'cambrian',
    ageLabel: '约 5.41 亿年前',
    ageMya: 541,
    tag: '生命大爆发',
    description:
      '在短短两千万年内，几乎所有现生动物门类的祖先突然出现于海洋中，被称为"寒武纪生命大爆发"。节肢动物、腕足动物、脊索动物共同登场，三叶虫成为海洋的统治者。',
    creatures:
      '三叶虫 / 奇虾 / 欧巴宾海蝎 / 云南鱼',
    environment:
      '温暖浅海 / 氧气充足 / 大陆低平',
    events: '寒武纪大爆发 / 澄江生物群',
  },
  {
    id: 'ordovician',
    name: '奥陶纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'paleozoic',
    eraLabel: '古生代 · 奥陶纪',
    scene: 'ordovician',
    ageLabel: '约 4.85 亿年前',
    ageMya: 485,
    tag: '海洋繁盛',
    description:
      '海平面上升，广泛浅海覆盖大陆。海洋无脊椎动物空前繁盛，鹦鹉螺、笔石、海百合、腕足类遍布各海域，原始脊椎动物无颌鱼类出现。',
    creatures: '鹦鹉螺 / 笔石 / 海百合 / 早期鱼类',
    environment:
      '广泛浅海 / 气候温暖 / 无陆地生物',
    events: '海洋生物大繁荣 / 末期大灭绝',
  },
  {
    id: 'silurian',
    name: '志留纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'paleozoic',
    eraLabel: '古生代 · 志留纪',
    scene: 'silurian',
    ageLabel: '约 4.44 亿年前',
    ageMya: 444,
    tag: '登陆先驱',
    description:
      '海洋节肢动物开始登陆，最早的维管植物——裸蕨类在湿地与河岸出现。地衣和苔藓覆盖岩石。植物登陆开启了陆地生态系统的演化。',
    creatures:
      '裸蕨 / 早期维管植物 / 板足鲎 / 早期昆虫',
    environment:
      '温暖湿润 / 大陆低平 / 河湖遍布',
    events: '植物登陆 / 维管植物出现',
  },
  {
    id: 'devonian',
    name: '泥盆纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'paleozoic',
    eraLabel: '古生代 · 泥盆纪',
    scene: 'devonian',
    ageLabel: '约 4.19 亿年前',
    ageMya: 419,
    tag: '鱼类时代',
    description:
      '被称为"鱼类的时代"，盾皮鱼、软骨鱼、硬骨鱼共同繁荣。最早的森林形成，种子植物开始出现。肉鳍鱼类演化成最早的四足动物，开始登陆。',
    creatures:
      '盾皮鱼 / 邓氏鱼 / 提塔利克鱼 / 早期两栖类',
    environment:
      '温暖湿润 / 大型森林 / 河口与沼泽',
    events: '鱼类鼎盛 / 森林出现 / 四足动物登陆',
  },
  {
    id: 'carboniferous',
    name: '石炭纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'paleozoic',
    eraLabel: '古生代 · 石炭纪',
    scene: 'carboniferous',
    ageLabel: '约 3.59 亿年前',
    ageMya: 359,
    tag: '巨虫森林',
    description:
      '广袤的蕨类森林和沼泽遍布大陆，形成今日主要煤层。氧气浓度高达 35%，孕育出巨型昆虫：翼展近 1 米的巨型蜻蜓、巨脉蜻蜓。爬行动物开始摆脱水体。',
    creatures:
      '巨型蜻蜓 / 巨型马陆 / 早期爬行类 / 林蜥',
    environment:
      '高温高湿 / 巨型蕨类森林 / 富氧',
    events: '煤炭形成 / 巨型昆虫 / 爬行动物起源',
  },
  {
    id: 'permian',
    name: '二叠纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'paleozoic',
    eraLabel: '古生代 · 二叠纪',
    scene: 'permian',
    ageLabel: '约 2.99 亿年前',
    ageMya: 299,
    tag: '盘古大陆',
    description:
      '所有大陆汇聚成"盘古大陆"，内陆气候变得干燥。兽孔类——似哺乳爬行动物繁盛并成为顶级掠食者。末期发生地球史上最严重的大灭绝。',
    creatures:
      '兽孔类 / 异齿龙 / 巨齿龙 / 二齿兽',
    environment:
      '盘古大陆 / 内陆干旱 / 海岸退缩',
    events: '盘古大陆 / 二叠纪末大灭绝',
  },
  {
    id: 'triassic',
    name: '三叠纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'mesozoic',
    eraLabel: '中生代 · 三叠纪',
    scene: 'triassic',
    ageLabel: '约 2.52 亿年前',
    ageMya: 252,
    tag: '恐龙起源',
    description:
      '大灭绝后生命复苏，幸存的爬行动物迅速分化。恐龙在三叠纪晚期首次出现并逐渐繁盛，原始的哺乳类作为小型夜行动物也已登场。',
    creatures:
      '早期恐龙 / 始盗龙 / 板龙 / 原始哺乳类',
    environment:
      '盘古大陆开始分裂 / 气候干燥',
    events: '恐龙起源 / 哺乳类起源',
  },
  {
    id: 'jurassic',
    name: '侏罗纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'mesozoic',
    eraLabel: '中生代 · 侏罗纪',
    scene: 'jurassic',
    ageLabel: '约 2.01 亿年前',
    ageMya: 201,
    tag: '恐龙盛世',
    description:
      '大陆进一步分裂，气候温暖湿润，森林茂密。恐龙成为陆地的绝对霸主：腕龙、梁龙等蜥脚类庞大无比，异特龙、角鼻龙等兽脚类称霸食物链。始祖鸟等早期鸟类飞上天空。',
    creatures:
      '腕龙 / 异特龙 / 剑龙 / 始祖鸟 / 鱼龙',
    environment:
      '温暖湿润 / 茂密森林 / 浅海扩张',
    events: '恐龙极盛 / 鸟类起源 / 冈瓦纳大陆分裂',
  },
  {
    id: 'cretaceous',
    name: '白垩纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'mesozoic',
    eraLabel: '中生代 · 白垩纪',
    scene: 'cretaceous',
    ageLabel: '约 1.45 亿年前',
    ageMya: 145,
    tag: '恐龙巅峰',
    description:
      '被子植物兴起并迅速多样化，蜜蜂、蝴蝶等传粉昆虫协同演化。霸王龙、棘龙、三角龙等恐龙达到形态巅峰。末期一颗小行星撞击地球，恐龙时代终结。',
    creatures:
      '霸王龙 / 三角龙 / 棘龙 / 早期蛇类 / 原始灵长类',
    environment:
      '温暖气候 / 被子植物森林 / 海平面高',
    events: '被子植物兴起 / 恐龙绝灭 / 小行星撞击',
  },
  {
    id: 'paleogene',
    name: '古近纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'cenozoic',
    eraLabel: '新生代 · 古近纪',
    scene: 'paleogene',
    ageLabel: '约 0.66 亿年前',
    ageMya: 66,
    tag: '哺乳兴起',
    description:
      '恐龙灭绝后，哺乳动物迅速填补空缺。原始的始祖马、始祖象、始祖鲸等出现，被子植物成为陆地植物的主导。气候温暖，森林密布。',
    creatures:
      '始祖马 / 始祖象 / 早期灵长类 / 古鲸类',
    environment:
      '温暖湿润 / 全球森林 / 大陆接近现代格局',
    events: '哺乳动物辐射演化 / 被子植物主导',
  },
  {
    id: 'neogene',
    name: '新近纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'cenozoic',
    eraLabel: '新生代 · 新近纪',
    scene: 'neogene',
    ageLabel: '约 0.23 亿年前',
    ageMya: 23,
    tag: '草原扩张',
    description:
      '气候变冷变干，森林退缩，广阔的草原扩张。三趾马、丽牛、原上猿等适应开阔生境的动物繁盛。人类与黑猩猩的共同祖先在非洲出现。',
    creatures:
      '三趾马 / 剑齿象 / 巨犀 / 原上猿',
    environment:
      '全球变冷 / 草原扩张 / 气候干燥',
    events: '草原扩张 / 类人猿分化',
  },
  {
    id: 'quaternary',
    name: '第四纪',
    eon: 'phanerozoic',
    eonLabel: 'Phanerozoic · 显生宙',
    era: 'cenozoic',
    eraLabel: '新生代 · 第四纪',
    scene: 'quaternary',
    ageLabel: '约 258 万年前至今',
    ageMya: 2.58,
    tag: '人类登场',
    description:
      '地球进入冰河时代与间冰期交替的循环。猛犸象、剑齿虎、披毛犀等冰川动物繁盛。晚期智人出现并扩散到全球，创造了辉煌的人类文明。',
    creatures:
      '猛犸象 / 剑齿虎 / 披毛犀 / 智人',
    environment:
      '冰期与间冰期交替 / 气候波动剧烈',
    events: '冰河时代 / 智人出现 / 农业文明',
  },
]
