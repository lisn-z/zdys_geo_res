export type PropertyMode = 'temperature' | 'salinity' | 'density' | null
export type ViewMode = 'world' | 'top' | 'pacific' | 'atlantic'

export interface LessonStep {
  id: string
  title: string
  question: string
  observation: string
  explanation: string
  takeaway: string
  property: PropertyMode
  depth: number
  view: ViewMode
  focus?: { lon: number; lat: number }
  focusLabel?: string
  compareDepths?: boolean
  extension?: boolean
}

export interface Chapter {
  id: string
  title: string
  subtitle: string
  steps: LessonStep[]
}

// Each step declares its complete map state so chapter jumps are repeatable.
// WOA23 decav91C0 fields are 1991–2020 annual climatologies at 0.25° resolution.
// They are not live observations or a time animation.
// Density is TEOS-10 potential density: gsw.pot_rho_t_exact(SA, t, p, 0).
// SA is converted from practical salinity; pressure comes from depth and latitude.
// This is full potential density (kg/m³), not sigma0 or in-situ density at depth.
// It is derived from climatological mean T/S, not an independent mean density observation.
// Textbook alignment was checked against the 2020 first-edition / 2021 third-printing text;
// its monthly maps and continuous schematic profiles are not reproduced as WOA observations.
export const chapters: Chapter[] = [
  {
    id: 'observe',
    title: '认识海水',
    subtitle: '从一次取样，走向全球观察',
    steps: [
      {
        id: 'observe-properties',
        title: '同样是海水，性质相同吗？',
        question: '只看海面的蓝色，能知道海水的冷暖和咸淡吗？',
        observation: '调整视角，辨认各大洋；再分别打开温度、盐度、密度图层，观察它们是否具有相同的颜色格局。',
        explanation: '海水是含有多种溶解物质的混合溶液。温度、盐度和密度分别描述冷暖、含盐状况与单位体积的质量，需要通过观测或计算认识。图层颜色表示数值大小，并不是海水本来的颜色。',
        takeaway: '先分清研究哪一种性质，再用数据进行比较。',
        property: null, depth: 0, view: 'world',
      },
      {
        id: 'observe-data',
        title: '给每个读数加上位置与深度',
        question: '在地图上点一下，得到的是今天这杯海水的温度吗？',
        observation: '点击太平洋中的一个有效格点，读出经纬度、当前深度和温度；切到50米，查看同一位置的数值与剖面。',
        explanation: '本课使用WOA23的1991—2020年平均温盐资料，展示0、50、200、1000、2000米五个标准深度。点击读数来自附近0.25°资料格点的插值，不是实时测量。斜纹区表示所选深度无有效资料，常见于浅海或海底隆起，不能当作零。',
        takeaway: '一个读数至少要带着性质、位置、深度和时间口径。',
        property: 'temperature', depth: 0, view: 'pacific', focus: { lon: -150, lat: 15 },
      },
    ],
  },
  {
    id: 'temperature',
    title: '海水的温度',
    subtitle: '由水平分布，深入海面以下',
    steps: [
      {
        id: 'temperature-latitude',
        title: '表层海水哪里暖、哪里冷？',
        question: '从低纬向高纬移动，表层海温有什么总体变化？',
        observation: '保持0米，在太平洋由热带向南、北高纬分别选点；对照色标与读数，归纳总体趋势。',
        explanation: '海洋表层主要接收太阳辐射。受纬度影响，表层海温总体呈低纬较高、高纬较低的格局。这是大范围规律，不能据此认为同一纬度的所有海域温度都相同。',
        takeaway: '先找纬度方向的总体规律，再留意局部差异。',
        property: 'temperature', depth: 0, view: 'world', focus: { lon: -150, lat: 15 },
      },
      {
        id: 'temperature-heat',
        title: '同一纬度，为何也有冷暖差别？',
        question: '只知道太阳辐射，就能解释每个海域的海温吗？',
        observation: '在北太平洋相近纬度分别选择西部与东部海域，记录温度差异；再观察等色带是否完全沿纬线展开。',
        explanation: '海温变化取决于热量收支：吸收辐射获得热量，蒸发等过程带走热量，海流和混合又会搬运热量。因此纬度相近也可能冷暖不同。仅凭一张温度图可以发现差异，判定具体成因还需海流、风等资料。',
        takeaway: '太阳辐射形成基本格局，热量交换与输送造成区域差异。',
        property: 'temperature', depth: 0, view: 'pacific', focus: { lon: 150, lat: 35 },
      },
      {
        id: 'temperature-depth',
        title: '海面温暖，深处也温暖吗？',
        question: '温度随深度的变化，是均匀的吗？',
        observation: '在热带太平洋固定一个点，依次比较0、50、200、1000、2000米；结合剖面，比较每增加相同深度时的降温幅度，再到高纬海域复查。',
        explanation: '典型低纬海洋有较暖的上层，向下经过降温较快的温跃层，再进入变化较缓的冷水层；高纬剖面可能不同。五个深度值只能呈现大致结构，连线用于引导读图，不能据此精确判断温跃层的上下边界。',
        takeaway: '垂向变化有快慢；比较剖面要同时看温差与深度间隔。',
        property: 'temperature', depth: 200, view: 'top', focus: { lon: -150, lat: 15 },
      },
      {
        id: 'temperature-use',
        title: '认识温差，也认识资料的时间尺度',
        question: '这些温度资料可以帮助理解哪些海洋利用问题？',
        observation: '比较低纬与高纬点的表层温度、同一点表层与1000米温差；讨论海洋生物适应的环境与海水温差利用。',
        explanation: '水温影响海洋生物的生存和分布，表层与深层的温差也可用于海洋温差能研究。同一海区还存在季节和日变化，但本图是多年年平均，不能用它判断某天是否适宜养殖，或直接比较夏季与冬季。',
        takeaway: '资料可以帮助发现条件；具体利用还需要更细的时空观测。',
        property: 'temperature', depth: 1000, view: 'pacific', focus: { lon: -150, lat: 15 },
      },
    ],
  },
  {
    id: 'salinity',
    title: '海水的盐度',
    subtitle: '用淡水的收支解释咸淡变化',
    steps: [
      {
        id: 'salinity-meaning',
        title: '盐度表示什么？',
        question: '数值较大，代表这片海有更多水，还是水更咸？',
        observation: '切到0米盐度，选取两个颜色不同的有效格点，读数并判断谁更咸；注意此时已经更换色标。',
        explanation: '盐度描述海水的含盐状况，而不是一片海的盐总量。教材常用每千克海水的含盐质量和‰说明盐度。本数据采用无量纲的实用盐度（PSS-78）；开放大洋中数值与教材的‰表示接近，但定义并不完全相同。',
        takeaway: '先看量的含义与色标；实用盐度数值越大，海水通常越咸。',
        property: 'salinity', depth: 0, view: 'world', focus: { lon: -40, lat: 25 },
      },
      {
        id: 'salinity-latitude',
        title: '最暖的赤道，为什么未必最咸？',
        question: '从赤道经过副热带走向高纬，盐度是否像海温一样递减？',
        observation: '在大西洋分别读取赤道、副热带与高纬开阔海域；比较总体格局，再切回温度，检查两张图是否一致。',
        explanation: '蒸发带走水而把盐留下，降水补充淡水。在副热带，蒸发相对降水较强，表层盐度往往偏高；赤道降水丰富，表层盐度通常低于副热带。因此不能用“温度越高，盐度越高”概括全球海洋。',
        takeaway: '理解盐度要比较蒸发与降水，不能只看温度。',
        property: 'salinity', depth: 0, view: 'atlantic', focus: { lon: -40, lat: 0 },
      },
      {
        id: 'salinity-regional',
        title: '哪些过程会增加或减少淡水？',
        question: '同在海洋中，河口、干燥海域与冰区为何咸淡不同？',
        observation: '找到红海与高纬海域，比较有资料位置的表层盐度；用“淡水加入”或“淡水减少”解释可能的变化方向。',
        explanation: '河流入海和融冰增加淡水，一般使盐度降低；蒸发和海冰形成时的排盐可使周围海水更咸。海区与外海交换的强弱也很重要。年平均图体现多种作用的综合结果，不能把一处低值直接认定为正在融冰。',
        takeaway: '盐度由淡水收支和海水交换共同影响，成因判断要结合环境。',
        property: 'salinity', depth: 0, view: 'world', focus: { lon: 38, lat: 20 },
      },
      {
        id: 'salinity-depth',
        title: '盐度一定随深度降低吗？',
        question: '表层偏咸与表层偏淡的海域，会有相同的盐度剖面吗？',
        observation: '先查看北大西洋副热带点的五层盐度，再选择北太平洋高纬点；比较表层与200米、1000米的大小关系。',
        explanation: '蒸发、降水等直接作用在海面，海水混合与运动又影响下方水层。表层偏咸的海域，向下可能变淡；表层受淡水影响较强的海域，向下可能变咸。剖面也可能出现极大值或极小值，不能套用单一递增、递减规律。',
        takeaway: '盐度的垂直分布有区域差异，应以选点剖面为证据。',
        property: 'salinity', depth: 50, view: 'atlantic', focus: { lon: -40, lat: 25 },
      },
      {
        id: 'salinity-life',
        title: '咸淡变化怎样影响生产生活？',
        question: '理解海水盐度，对上海的用水问题有什么帮助？',
        observation: '在世界海陆图上辨认长江口，联系河水与海水的交汇；讨论淡水来量减少时，取水口为什么更需要盐度观测。',
        explanation: '海水可用于制盐和提取淡水，盐度升高也会影响河口取水与生态环境。咸潮来临时，取水安排需依据当地监测。全球多年平均格点不能解析长江口潮汐和咸潮过程，更不能作为取水口当天的水质判断。',
        takeaway: '理解全球规律之后，还要用当地、当时的资料解决实际问题。',
        property: 'salinity', depth: 0, view: 'world', focus: { lon: 124, lat: 31 },
      },
    ],
  },
  {
    id: 'density',
    title: '密度与联系',
    subtitle: '把冷暖、咸淡与海水的质量联系起来',
    steps: [
      {
        id: 'density-meaning',
        title: '同样一立方米，海水一样重吗？',
        question: '温度和盐度变化，为什么会改变海水密度？',
        observation: '打开密度图层，在同一选点同时查看温度、盐度与位密度，确认三个数值的单位和含义。',
        explanation: '密度是单位体积的质量，常用kg/m³表示。在常见海水条件下，其他条件相同时，降温或增盐通常使密度增大，压力增大也会压缩海水。本图将海水按绝热过程换算到同一海面参考压力（0 dbar），称为位密度，便于比较温盐作用。',
        takeaway: '比较密度先说清条件：温度、盐度和压力都会影响结果。',
        property: 'density', depth: 0, view: 'world', focus: { lon: -40, lat: 25 },
      },
      {
        id: 'density-surface',
        title: '最咸的地方，密度一定最大吗？',
        question: '一处海水更冷，另一处更咸，仅凭一项能排出密度大小吗？',
        observation: '比较北大西洋副热带与较高纬的两个点，把温度、盐度、密度一起记录；再检查全球密度图的总体纬度差异。',
        explanation: '冷却和增盐都可使海水变密，升温和淡化则作用相反。两地的温度与盐度常同时不同，最终大小要看共同作用。表层密度总体随纬度升高而增大的格局，与海温分布密切相关，局部仍会受淡水等因素影响。',
        takeaway: '用温盐共同解释密度；不能只按“更咸”或“更冷”下结论。',
        property: 'density', depth: 0, view: 'atlantic', focus: { lon: -40, lat: 55 },
      },
      {
        id: 'density-depth',
        title: '剖面反映了怎样的温盐分层？',
        question: '同一地点从表层到深处，温度、盐度和密度怎样变化？',
        observation: '在五层对照表中，从表层读到2000米，比较同一地点的温盐与参考密度；选择表头查看相应剖面，找出变化较明显的深度区间。',
        explanation: '初始的热带太平洋示例点上层较暖、参考密度较小，深层较冷、参考密度较大；盐度不一定随深度单调变化。五个深度的资料只能比较层间差异，不能精确定位跃层。地图展示所选深度的水平分布，右侧剖面展示同一地点的垂向变化。参考密度统一换算到0 dbar，不包含深水压力的直接压缩效应。',
        takeaway: '固定地点比较不同深度，把温盐变化与密度联系起来；参考密度的增加不能归因于当地压力更大。',
        property: 'density', depth: 2000, view: 'pacific', focus: { lon: -150, lat: 15 },
        focusLabel: '热带太平洋', compareDepths: true,
      },
      {
        id: 'density-ship',
        title: '密度变化，轮船吃水怎样变？',
        question: '载重不变的轮船，从较密的水驶入较疏的水，会浮高还是下沉一些？',
        observation: '选取两个表层密度不同的海域，按读数排列大小；假设船重不变，比较维持浮力所需排开海水的体积。',
        explanation: '漂浮时，浮力与船重平衡。水的密度较小时，需要排开更多体积的水才能获得同样浮力，因此吃水较深；密度较大时，吃水较浅。此处只比较密度作用，真实航行还需考虑船型、载荷和海况等条件。',
        takeaway: '同一艘船载重不变：水密度减小，吃水加深。',
        property: 'density', depth: 0, view: 'world', focus: { lon: -40, lat: 0 },
      },
      {
        id: 'density-investigate',
        extension: true,
        title: '用三种性质讲清一个海域',
        question: '你能提出一个判断，并用水平分布和垂向剖面共同支持它吗？',
        observation: '自选一个海域和一个对照点，比较表层温度、盐度、位密度，再检查深处；用“观察到什么—可能因为什么—还需要什么资料”组织解释。',
        explanation: '探究应区分数据现象与成因推测。温盐资料可以展示地区和深度差异，位密度把两种性质联系起来；要判断季节变化、海流方向或某次异常，则需要相应的额外观测。',
        takeaway: '让结论与证据的范围相匹配，是地理探究的重要一步。',
        property: 'density', depth: 1000, view: 'world', focus: { lon: -150, lat: 15 },
      },
    ],
  },
]

export const lessonSources: { name: string; url: string; description: string }[] = [
  {
    name: '教材目录 · 国家中小学智慧教育平台',
    url: 'https://r3-ndr.ykt.cbern.com.cn/edu_product/esp/assets_document/7a8797ab-dcee-4bb8-88f8-c6b67f0ac667.pkg/pdf.pdf',
    description: '中国地图出版社、中华地图学社，段玉山主编：《地理》必修第一册，第3单元主题8。官方文件本次未能直接读取。',
  },
  {
    name: '教材正文核对 · 可读镜像',
    url: 'https://fliphtml5.com/cozhh/hzxj/',
    description: '已核对版权页（2020年第1版、2021年第3次印刷）及印刷页75—81的性质内容。镜像用于核对，课件文字和交互为重新编写。',
  },
  {
    name: 'NOAA · World Ocean Atlas 2023',
    url: 'https://www.ncei.noaa.gov/products/world-ocean-atlas',
    description: '经质量控制和客观分析得到的全球海洋气候态资料。本课采用1991—2020年平均0.25°温盐场的五个标准深度，不代表实时海况。',
  },
  {
    name: 'NOAA · Sea Water',
    url: 'https://www.noaa.gov/jetstream/ocean/sea-water',
    description: '用于核对蒸发、降水、结冰融冰对盐度的影响，以及温盐与密度的关系。',
  },
  {
    name: 'NOAA · Thermocline',
    url: 'https://oceanservice.noaa.gov/facts/thermocline.html',
    description: '用于核对温跃层及其地区、时间差异；本课五层数据不用于精确定位跃层。',
  },
  {
    name: 'TEOS-10 · 位密度计算',
    url: 'https://www.teos-10.org/pubs/gsw/html/gsw_pot_rho_t_exact.html',
    description: '由温度、绝对盐度与压力计算海水位密度；本课参考压力为0 dbar，显示完整密度值，未减去1000。',
  },
  {
    name: 'TEOS-10 · 实用盐度转换',
    url: 'https://www.teos-10.org/pubs/gsw/html/gsw_SA_from_SP.html',
    description: '实用盐度无量纲，绝对盐度以g/kg表示。温盐图保留WOA实用盐度；密度计算另按位置与压力转换为绝对盐度。',
  },
]
