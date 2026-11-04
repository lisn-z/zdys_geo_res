export type LayerMode = 'none' | 'sst' | 'pressure' | 'anomaly'
export type Scenario = 'normal' | 'elnino' | 'lanina'
export type ComparisonFocus = 'sst' | 'pressure' | 'anomaly' | 'section' | 'atmosphere'
export type ViewMode = 'world' | 'pacific' | 'section' | 'surface' | 'exchange-side' | 'water-cycle' | 'walker-west' | 'walker-east' | 'china'
export type Effect =
  | 'sun' | 'currents' | 'wind' | 'rise' | 'sink' | 'return'
  | 'clouds' | 'rain' | 'evaporation' | 'section' | 'upwelling' | 'heatExchange'
  | 'pressure' | 'equator' | 'oceans' | 'windDrivenWater' | 'warmWaterExpansion' | 'warmWaterAccumulation'
  | 'moistureTransport' | 'landWaterCycle' | 'globalHeatTransport' | 'regionalImpacts' | 'chinaImpacts' | 'monitoring'

export interface LessonStep {
  id: string
  title: string
  question: string
  explanation: string
  observation: string
  takeaway: string
  view: ViewMode
  layer: LayerMode
  scenario: Scenario
  effects: Effect[]
  extension?: boolean
}

export interface Chapter {
  id: string
  title: string
  subtitle: string
  icon: string
  steps: LessonStep[]
}

// Every step declares its entire visible state. Jumping backward or across
// chapters must not retain effects from the previously visited step.
// The reveal order is a teaching sequence, not a claim that coupled physical
// processes start one after another in nature.
export const chapters: Chapter[] = [
  {
    id: 'ocean',
    title: '认识海洋',
    subtitle: '从世界海陆格局，走进海水内部',
    icon: '01',
    steps: [
      {
        id: 'ocean-world',
        title: '先看清世界的海陆格局',
        question: '各大洋是彼此独立的水池吗？',
        explanation: '先沿大陆边缘观察海洋。大洋通过广阔水域相连，共同构成世界海洋；大陆形状会约束海水运动的通道。',
        observation: '找出太平洋、大西洋和印度洋，辨认它们之间的联系。',
        takeaway: '海洋是相互连通的整体，也是后面所有过程的共同舞台。',
        view: 'world', layer: 'none', scenario: 'normal', effects: ['oceans'],
      },
      {
        id: 'ocean-latitude',
        title: '用赤道建立观察坐标',
        question: '比较海温之前，先要看什么位置条件？',
        explanation: '红色实线是赤道，划分南、北半球；黄色虚线是南北回归线，两线之间为热带。先辨认纬度位置，再沿相同纬度比较东西两侧海温。',
        observation: '辨认赤道与两条回归线，再沿赤道从印度洋经过太平洋，找到南美洲西岸。',
        takeaway: '先定位，再比较；纬度与海陆位置都是理解海温的背景。',
        view: 'world', layer: 'none', scenario: 'normal', effects: ['oceans', 'equator'],
      },
      {
        id: 'ocean-sst',
        title: '读一张真实海表温度图',
        question: '不同海域的表层海水一样暖吗？',
        explanation: '海表温度就是海洋表层的水温，图中用不同颜色表示。低纬通常较暖、高纬通常较冷，但海流、季节等因素也会改变分布。读图时同时看单位、日期和色标。',
        observation: '选取一个低纬点和一个高纬点，比较海温读数。',
        takeaway: '温度颜色表示数据大小；它不是海水原本的颜色。',
        view: 'world', layer: 'sst', scenario: 'normal', effects: ['oceans', 'equator'],
      },
      {
        id: 'ocean-energy',
        title: '海洋吸收并储存太阳能',
        question: '太阳照射后，海洋只会让表面变热吗？',
        explanation: '海洋吸收太阳辐射并储存热量。海水储热能力强，升温、降温较慢，能够缓和沿海气温的变化；混合和海流又会搬运热量。因此，海洋会影响季节变化及更长时间的气候。',
        observation: '观察照射海面的光束，并联系上一页的全球海温分布。',
        takeaway: '海洋储热能够缓和气温波动，海流输热又连接不同地区。',
        view: 'surface', layer: 'none', scenario: 'normal', effects: ['sun', 'equator'],
      },
      {
        id: 'ocean-depth',
        extension: true,
        title: '打开海洋，看看温度随深度的变化',
        question: '表层海温能代表整片海洋吗？',
        explanation: '典型热带海洋的表层较暖，温跃层内温度随深度下降较快，下面是较冷的水。剖面用于认识结构，其垂直比例和温跃层形状是教学示意。',
        observation: '区分海面、表层暖水、温跃层与深层冷水。',
        takeaway: '海表温度是一层信息；理解海气变化，还需要观察海面以下。',
        view: 'section', layer: 'none', scenario: 'normal', effects: ['section', 'equator'],
      },
    ],
  },
  {
    id: 'currents',
    title: '洋流与输热',
    subtitle: '海水怎样运动，热量怎样被带走',
    icon: '02',
    steps: [
      {
        id: 'currents-motion',
        title: '海面起伏与海水输送是两回事',
        question: '看到海浪，就能判断洋流方向吗？',
        explanation: '波浪表现为海面的起伏；洋流是海水较持续、具有方向的流动。这里用暖、寒色带内移动的纹理表示海水输送，路径是主要表层洋流的教学概括。',
        observation: '追踪色带内纹理的移动方向，而不是仅凭海浪起伏判断海流。',
        takeaway: '波浪与洋流需要用不同的视觉线索区分。',
        view: 'world', layer: 'none', scenario: 'normal', effects: ['oceans', 'currents'],
      },
      {
        id: 'currents-wind',
        title: '风推动表层海水流动',
        question: '海面上的风怎样带动海水？',
        explanation: '信风是热带地区较稳定的偏东风。风通过海面摩擦推动表层海水，这种推动也称动量传递。先看赤道太平洋上方由东向西的风，再看下方逐渐出现的定向水纹。',
        observation: '对照赤道太平洋上方的风与下方的定向水纹，辨认向西推动的作用；水纹是输送机制示意。',
        takeaway: '风是表层海流的重要驱动力，但不是决定所有海流的唯一因素。',
        view: 'pacific', layer: 'none', scenario: 'normal', effects: ['equator', 'wind', 'windDrivenWater'],
      },
      {
        id: 'currents-warm-cold',
        title: '理解寒流和暖流的“相对”含义',
        question: '暖流一定是很热的水，寒流一定是很冷的水吗？',
        explanation: '寒暖流相对于流经海域的水温而言：较暖的水流入称暖流，较冷的水流入称寒流。先在自然水面追踪寒暖流色带，再切换海温图，比较来源海域与流经海域的水温。',
        observation: '先看寒暖流色带及流向，再切换控制面板的“海温”读取资料；数据图层保持颜色稳定，不叠加寒暖流色带。',
        takeaway: '寒暖流是相对概念，不能直接用某个固定温度划分。',
        view: 'world', layer: 'none', scenario: 'normal', effects: ['equator', 'oceans', 'currents'],
      },
      {
        id: 'currents-transport',
        title: '海流重新分配海洋热量',
        question: '海水移动以后，原来的海温格局会怎样？',
        explanation: '洋流搬运不同温度的海水，总体上把热量从低纬输向高纬，缓和两者的温差。暖流和寒流也会影响沿岸气候。海洋再与上方空气交换热量，把海水运动与大气变化连接起来。',
        observation: '在自然水面看输送方向与寒暖流色带，再切换“海温”读取历史月平均资料。水纹只示意推动过程，不表示实测海浪或海流速度。',
        takeaway: '洋流连接不同海域，也为海洋影响天气和气候提供通道。',
        view: 'pacific', layer: 'none', scenario: 'normal', effects: ['equator', 'currents', 'windDrivenWater'],
      },
    ],
  },
  {
    id: 'exchange',
    title: '海—气交换',
    subtitle: '从海面交换，走向全球水热平衡',
    icon: '03',
    steps: [
      {
        id: 'exchange-heat',
        title: '先认识海气之间的热量交换',
        question: '海洋储存的热量怎样与大气发生联系？',
        explanation: '阳光主要以短波辐射加热海洋；海面和大气也以长波辐射交换能量。温差引起的直接热量交换称显热交换，可双向进行；蒸发吸收的能量随水汽携带，称潜热，凝结时才释放。',
        observation: '紫色波纹表示辐射能量的传播，不是空气流动；暖色上升气流表示海暖气凉时的显热交换；红色箭头表示水汽携带潜热。颜色与动画均为示意，水汽和长波辐射本身不可见。',
        takeaway: '太阳输入与海气交换要分清；海面最终升温还是降温取决于总的热量收支。',
        view: 'exchange-side', layer: 'none', scenario: 'normal', effects: ['sun', 'heatExchange'],
      },
      {
        id: 'exchange-evaporation',
        title: '蒸发把水分带入空气',
        question: '蒸发时，海水失去的只是水吗？',
        explanation: '海水蒸发需要吸收能量，使海面失热，能量随水汽进入大气。水汽本身不可见，红色箭头只是输送示意。太阳加热与蒸发失热可同时发生，海面最终怎样变化要看总的热量收支。',
        observation: '区分太阳加热、海面蒸发失热和向上的水汽输送；不要把示踪线当作真实白烟。',
        takeaway: '蒸发同时联系水分交换与能量交换，并对海面起冷却作用。',
        view: 'exchange-side', layer: 'none', scenario: 'normal', effects: ['sun', 'evaporation'],
      },
      {
        id: 'exchange-condensation',
        title: '湿空气上升冷却时，云怎样形成？',
        question: '水汽一进入空气，就一定会形成云吗？',
        explanation: '湿空气上升、膨胀并冷却，达到饱和后，水汽可附着在空气中的微粒上凝结成云滴，这些微粒叫凝结核。凝结在云区释放潜热；海面蒸发吸热、云区凝结放热，由此把热量送入大气。',
        observation: '沿上升运动区分海面蒸发吸热、水汽输送和云区凝结放热。云区向外扩散的暖色光晕表示周围空气获得热量，并非云真的发光；云中可见的是小水滴或冰晶，不是水汽本身。',
        takeaway: '海温偏高不等于立即下雨；云的形成还需要相应的大气条件。',
        view: 'exchange-side', layer: 'none', scenario: 'normal', effects: ['evaporation', 'rise', 'clouds'],
      },
      {
        id: 'exchange-rain',
        title: '降水把水分送回海洋',
        question: '云中的水怎样返回地表？',
        explanation: '云中水滴或冰晶增长到能够落下时形成降水，部分水分回到海洋。并不是所有云都会产生降水，降水落区也会受到大气输送的影响。',
        observation: '将云下的降水与海面的蒸发联系起来，辨认水分往返。',
        takeaway: '蒸发与降水把海洋和大气连接成水分交换系统。',
        view: 'pacific', layer: 'none', scenario: 'normal', effects: ['evaporation', 'rise', 'clouds', 'rain'],
      },
      {
        id: 'exchange-moisture-transport',
        title: '一部分海洋水汽被送往陆地',
        question: '陆地上的雨水，与海洋有什么联系？',
        explanation: '海洋蒸发产生的水汽，大部分在海上形成降水，另一部分随大气运动进入陆地。它在适宜条件下凝结降水，为河流、湖泊和土壤补充淡水。沿着输送方向，看看海洋怎样联系陆地。',
        observation: '先追踪海面蒸发，再沿水汽输送箭头找到陆地上空。',
        takeaway: '海洋提供水汽，大气输送水汽，海陆之间因此建立联系。',
        view: 'water-cycle', layer: 'none', scenario: 'normal', effects: ['oceans', 'moistureTransport'],
      },
      {
        id: 'exchange-runoff',
        title: '水返回海洋，收支怎样平衡？',
        question: '海洋蒸发的水比降水补回的多，会一直变少吗？',
        explanation: '多年平均看，全球海洋蒸发量大于降水量，全球陆地则降水量大于蒸发和蒸腾总量。大气将水汽净输送到陆地，陆地水又经地表和地下径流返回海洋，补偿海洋的水分损失。全球蒸发与降水总量大致平衡。',
        observation: '追踪陆地降水、蒸散与径流回海，比较海洋、陆地和全球三个范围的水量收支。',
        takeaway: '水量平衡要看范围和时间；某地一次降雨不等于全球长期收支。',
        view: 'water-cycle', layer: 'none', scenario: 'normal', effects: ['oceans', 'moistureTransport', 'landWaterCycle'],
      },
      {
        id: 'exchange-global-heat',
        title: '海洋和大气共同搬运热量',
        question: '低纬多得到的热量，怎样送往高纬？',
        explanation: '按长期平均的辐射收支，低纬获得的能量多于向外散失的，高纬则相反。大气环流和洋流的总体净输热方向是低纬到高纬，缓和温差；海气交换把两种输送联系起来，共同参与全球热量平衡。',
        observation: '先辨认低纬与高纬，再分别追踪大气和海洋的热量输送；看总体方向，不把每一支流都理解为向极地运动。',
        takeaway: '水分循环和海气输热共同参与全球收支调节，并缓和地区间的热量差异。',
        view: 'world', layer: 'none', scenario: 'normal', effects: ['oceans', 'equator', 'globalHeatTransport'],
      },
      {
        id: 'exchange-feedback',
        title: '大气又反过来改变海洋',
        question: '为什么海—气相互作用不能只讲海洋影响大气？',
        explanation: '风推动表层海流并增强混合，进而调整海温；海温变化又影响热量和水汽交换。本页把已经认识的过程连接起来，现实中它们会同时作用。',
        observation: '在自然水面追踪风、水纹与水汽输送，再切换海温图读数；水纹是机制示意，月平均海温不是这一段动画演变的结果。',
        takeaway: '海洋和大气双向联系，称为海气耦合；变化相互影响，形成反馈。',
        view: 'pacific', layer: 'none', scenario: 'normal', effects: ['wind', 'evaporation', 'rise', 'clouds', 'rain', 'windDrivenWater'],
      },
    ],
  },
  {
    id: 'walker',
    title: '沃克环流',
    subtitle: '拆解赤道太平洋正常情况下的海气联系',
    icon: '04',
    steps: [
      {
        id: 'walker-region',
        extension: true,
        title: '把视线集中到赤道太平洋',
        question: '西太平洋和东太平洋分别在哪里？',
        explanation: '左侧是印度尼西亚、澳大利亚附近，右侧是南美洲西岸。下面按知识点拆解正常情况，不代表海洋与大气在现实中按这些页面先后启动。',
        observation: '找准西部与东部，并沿赤道建立比较方向。',
        takeaway: '先明确区域和方向，再讨论海温、气压与环流。',
        view: 'pacific', layer: 'none', scenario: 'normal', effects: ['equator', 'oceans'],
      },
      {
        id: 'walker-temperature',
        title: '同在赤道，东西海温仍有差异',
        question: '为什么不能只用纬度解释这里的海温？',
        explanation: '正常情况下，赤道西太平洋通常较暖，东部相对较冷。这与海水输送和冷水上涌有关；先观察差异，后面再回到海洋内部寻找联系。',
        observation: '比较同一纬度的西部暖水与东部较冷海水。',
        takeaway: '同纬度也可能存在显著海温差异。',
        view: 'pacific', layer: 'sst', scenario: 'normal', effects: ['equator'],
      },
      {
        id: 'walker-rise',
        title: '观察暖海域上方的上升运动',
        question: '西部暖海域与上方对流有什么联系？',
        explanation: '西部暖水区为大气提供热量和水分，有利于空气强烈上升，发展成伸展到较高空的深对流。本页先突出上升气流和云区，辨认环流中的垂直运动。',
        observation: '关注西部橙色上升气流及其上方的云。',
        takeaway: '海温与上方对流相互联系。',
        view: 'walker-west', layer: 'sst', scenario: 'normal', effects: ['equator', 'rise', 'clouds'],
      },
      {
        id: 'walker-sink',
        title: '再观察东部的下沉运动',
        question: '完整环流中，东侧空气怎样运动？',
        explanation: '正常沃克环流在东部相对冷海域上方具有下沉支。它与西部上升支相联系；下沉也使当地深对流发展相对受到抑制。',
        observation: '比较西部上升与东部下沉的位置，暂不加入水平运动。',
        takeaway: '先辨认环流的两支垂直运动，再连接它们。',
        view: 'walker-east', layer: 'sst', scenario: 'normal', effects: ['equator', 'rise', 'sink', 'clouds'],
      },
      {
        id: 'walker-pressure',
        title: '海平面气压也存在东西差异',
        question: '水平空气运动与什么差异有关？',
        explanation: '气压是空气产生的压力。正常情况下，西部海平面气压相对较低，东部相对较高；差异推动近海面空气运动。图层单位hPa读作百帕，表示海平面气压，不能直接代表高空气压。',
        observation: '对照东西两侧的海平面气压读数及高低压提示。',
        takeaway: '水平气压差为近海面的空气运动提供重要动力。',
        view: 'pacific', layer: 'pressure', scenario: 'normal', effects: ['equator', 'rise', 'sink', 'pressure'],
      },
      {
        id: 'walker-trades',
        title: '近海面信风由东向西吹',
        question: '把气压差和近海面风连起来，会看到什么？',
        explanation: '赤道太平洋近海面以东向西的信风为主。本页加入低层水平气流，把它与前面看到的气压分布和垂直运动联系起来。',
        observation: '沿平面箭头从南美洲方向追踪到西太平洋。',
        takeaway: '信风是正常沃克环流的低层水平组成部分。',
        view: 'pacific', layer: 'pressure', scenario: 'normal', effects: ['equator', 'rise', 'sink', 'pressure', 'wind'],
      },
      {
        id: 'walker-return',
        title: '加入高空返回气流，认识整个环流',
        question: '上升后的空气怎样参与完整环流？',
        explanation: '在示意环流中，西部上升空气在高空向东流动，在东部下沉，再由近海面信风返回西部。云雨主要与上升对流区域相联系。',
        observation: '从近海面出发，依次追踪上升、高空返回和下沉。',
        takeaway: '沃克环流是热带地区东西向的垂直环流。',
        view: 'pacific', layer: 'none', scenario: 'normal', effects: ['equator', 'rise', 'sink', 'wind', 'return', 'clouds', 'rain'],
      },
      {
        id: 'walker-ocean-feedback',
        extension: true,
        title: '风与海洋共同维持东西差异',
        question: '海面下的结构怎样参与这套环流？',
        explanation: '信风推动表层暖水向西输送，西部暖水层较厚、温跃层较深；东部温跃层较浅，冷水上涌有助于维持较冷海面。海温分布又影响上方大气。',
        observation: '先在自然水面看向西水纹，再对照温跃层西深东浅的结构和东部冷水上涌；切换海温图可读取历史资料，水下剖面仍是机制示意。',
        takeaway: '正常沃克环流与海洋结构是一套相互联系的状态。',
        view: 'section', layer: 'none', scenario: 'normal', effects: ['equator', 'section', 'wind', 'currents', 'upwelling', 'rise', 'sink', 'return', 'clouds', 'windDrivenWater'],
      },
    ],
  },
  {
    id: 'el-nino',
    title: '厄尔尼诺',
    subtitle: '从正常情况理解偏暖的海气变化',
    icon: '05',
    steps: [
      {
        id: 'elnino-baseline',
        title: '先看看正常情况，作为比较起点',
        question: '说海洋“异常偏暖”，是和什么相比？',
        explanation: '温跃层是水温随深度下降较快的一层水。先观察正常情况下的海温、信风和温跃层。本课用2013年12月作中性参考；判断异常仍需与1971—2000年同期月平均比较，差值叫海温距平。',
        observation: '记住西暖东冷、温跃层西深东浅的典型格局。',
        takeaway: '只有明确参照，才能判断什么发生了改变。',
        view: 'section', layer: 'sst', scenario: 'normal', effects: ['equator', 'section', 'wind', 'upwelling'],
      },
      {
        id: 'elnino-wind',
        title: '从信风减弱这一扰动开始观察',
        question: '把表层水推向西边的作用减弱，会怎样？',
        explanation: '用信风减弱作为讲解切入点：向西推动表层海水的作用随之减弱。真实厄尔尼诺涉及海洋和大气的耦合变化，不是单个开关独立触发。',
        observation: '与正常情况比较：信风和海面向西的定向水纹都减弱。这里表示风的推动作用，不代表所有海流都改为向东。',
        takeaway: '信风变化会改变海洋，但它本身也受到海温变化的影响。',
        view: 'pacific', layer: 'none', scenario: 'elnino', effects: ['equator', 'wind', 'windDrivenWater'],
      },
      {
        id: 'elnino-warm-water',
        title: '暖水向中东太平洋扩展',
        question: '原来集中的暖水分布怎样调整？',
        explanation: '信风减弱后，向西输送减弱，暖水范围向中东赤道太平洋扩展；东部冷水对海面的冷却作用也减弱，东西海温差通常减小。西部暖池仍然存在，不同事件的偏暖中心与强度不完全相同。',
        observation: '观察暖水前缘由西向东推进，中东部暖色范围逐渐扩大。暂停可停住过程，重播可重新观察；切换控制面板中的“海温”，可对照真实月平均资料。暖色示意不对应具体温度数值。',
        takeaway: '关键在于海温分布发生调整，而不是整个海洋一起变热。',
        view: 'pacific', layer: 'none', scenario: 'elnino', effects: ['equator', 'wind', 'warmWaterExpansion'],
      },
      {
        id: 'elnino-thermocline',
        extension: true,
        title: '东部温跃层加深，冷却作用改变',
        question: '海面下发生了什么变化？',
        explanation: '典型厄尔尼诺时期，东部温跃层加深、西部相对变浅，东西倾斜减小，冷水对东部海面的冷却作用减弱。虚线保留正常位置，实线示意当前状态；20 ℃线用来参考温跃层位置，上升流并非完全停止。',
        observation: '比较正常位置的虚线与当前20 ℃线：观察东部向下移动、上方暖水层增厚，以及东西倾斜减小。暂停或重播可逐段观察；图中深度和变化时长均为示意。',
        takeaway: '海表异常与海面以下的结构变化紧密相连。',
        view: 'section', layer: 'none', scenario: 'elnino', effects: ['equator', 'section', 'wind', 'currents', 'upwelling', 'windDrivenWater'],
      },
      {
        id: 'elnino-anomaly',
        title: '用海温距平检验“偏暖”',
        question: '哪些海域比常年同月更暖？',
        explanation: '距平是实际值减去相应多年平均值，本课资料采用1971—2000年同期月平均。红色代表偏暖，蓝色代表偏冷，零值代表接近基准；它与实际海温图的颜色含义不同。只看一个月的距平，还不能判断偏暖是否持续。',
        observation: '读取色标与基准说明，寻找中东赤道太平洋的正距平。',
        takeaway: '厄尔尼诺识别依赖海温异常及持续的海气条件，不能仅凭一张暖色图判断。',
        view: 'pacific', layer: 'anomaly', scenario: 'elnino', effects: ['equator'],
      },
      {
        id: 'elnino-atmosphere',
        title: '对流区调整，海气反馈连成环',
        question: '海温格局改变后，上方大气会怎样响应？',
        explanation: '中东部偏暖使对流活跃区向东扩展、气压分布调整，信风进一步减弱；向西输送和东部冷却作用减弱，又有利于维持或加强偏暖。这是事件发展中的放大反馈，并非会无限增强；具体云雨变化因事件和地区而异。',
        observation: '用控制面板中的“海气状态对比”，在同一视角比较云雨区、上升支和信风，再对照海温距平。云体与雨线只表示典型强弱，不是实测降雨量。',
        takeaway: '偏暖改变大气，大气又有利于维持偏暖，海气反馈由此连成环。',
        view: 'pacific', layer: 'none', scenario: 'elnino', effects: ['equator', 'wind', 'rise', 'sink', 'return', 'clouds', 'rain', 'windDrivenWater'],
      },
      {
        id: 'elnino-impacts',
        title: '海温异常怎样影响生活？',
        question: '为什么要关注海洋之外的变化？',
        explanation: '厄尔尼诺可能提高厄瓜多尔、秘鲁北部沿海的强降水风险，也使印尼、澳大利亚部分地区面临干旱和森林火灾风险。秘鲁附近上升流的营养盐补给减少，还可能影响渔业。具体影响取决于地区、季节及事件特点。',
        observation: '把偏暖海区、降水变化与沿岸的防洪、用水和渔业活动联系起来。',
        takeaway: '海气变化会影响自然环境和生产生活；风险提示需要结合当地情况。',
        view: 'pacific', layer: 'anomaly', scenario: 'elnino', effects: ['equator', 'regionalImpacts'],
      },
      {
        id: 'elnino-china-winter',
        title: '看我国：冬季偏暖的可能性增大',
        question: '厄尔尼诺发生后，我国冬天一定暖和吗？',
        explanation: '统计上，中等及以上强度的厄尔尼诺事件发生当年的冬季（12月至次年2月），我国气温偏暖的可能性增大。但整个冬季偏暖，不代表每天都暖；阶段性强冷空气仍可能带来明显降温。',
        observation: '先看柔和暖色表示的冬季偏暖倾向，再看随后出现的短时冷空气；颜色与气流都不是实测值。区分季节平均与短时天气，联系农业防寒和日常防护。',
        takeaway: '这是冬季气候的统计倾向，不是某一天的天气预报，也不表示我国各地同步升温。',
        view: 'china', layer: 'none', scenario: 'elnino', effects: ['chinaImpacts'],
      },
      {
        id: 'elnino-china-summer',
        title: '看我国：次年夏季关注长江流域防汛',
        question: '太平洋的异常，为什么还要跨季节关注？',
        explanation: '典型厄尔尼诺事件盛期冬季之后的夏季（通常为次年夏季），我国长江流域部分地区降水偏多、洪涝风险可能增加。海气异常是影响季风和降水的背景因素之一，是否发生洪灾还取决于具体天气、地形及防洪条件。',
        observation: '镜头转向长江流域附近的雨线示意。此处讲的是次年夏季倾向，不能当作历史12月海温图对应的同月降水实况。',
        takeaway: '多雨风险提示应服务防汛准备；厄尔尼诺不是某次洪灾的唯一原因。',
        view: 'china', layer: 'none', scenario: 'elnino', effects: ['chinaImpacts'],
      },
    ],
  },
  {
    id: 'la-nina',
    title: '拉尼娜',
    subtitle: '理解偏冷异常，并归纳三种状态',
    icon: '06',
    steps: [
      {
        id: 'lanina-baseline',
        title: '再次回到正常情况作比较',
        question: '能直接把厄尔尼诺画面倒过来当作拉尼娜吗？',
        explanation: '先回到正常情况，再观察拉尼娜的变化。参考月份2013年12月没有明显厄尔尼诺或拉尼娜现象，但不等于多年平均；判断偏暖或偏冷仍要与多年同期平均比较。两种现象的强度、持续时间和区域影响也不必完全对称。',
        observation: '重新辨认正常海温、信风和温跃层结构。',
        takeaway: '先用正常情况理解过程，再用多年同期平均判断偏暖或偏冷。',
        view: 'section', layer: 'sst', scenario: 'normal', effects: ['equator', 'section', 'wind', 'upwelling'],
      },
      {
        id: 'lanina-wind',
        title: '增强的信风改变表层输送',
        question: '向西推动海水的作用增强后会怎样？',
        explanation: '拉尼娜的典型海气状态中，赤道太平洋信风较强，向西输送表层暖水的作用增强。观察水纹向西移动、暖水向西部集中，再到下一页观察西部暖水层增厚与东部温跃层变浅。暖水堆积不等于西太平洋所有海域都持续升温。',
        observation: '先看增强的信风，再追踪橙红色暖水范围向西集中；西部暖池保留，中东部暖水范围收缩。颜色只表示暖水范围，切换“海温”可对照真实月平均数据。',
        takeaway: '信风增强联系着暖水向西堆积，以及西部暖水层增厚、东部冷水更易影响海面。',
        view: 'pacific', layer: 'none', scenario: 'lanina', effects: ['equator', 'wind', 'windDrivenWater', 'warmWaterAccumulation'],
      },
      {
        id: 'lanina-thermocline',
        title: '东西温跃层差异增强',
        question: '东部冷水怎样更有效地影响海面？',
        explanation: '典型拉尼娜状态下，温跃层西深东浅的倾斜增强，东部温跃层偏浅，冷水上涌及其冷却作用增强，有助于维持中东部较冷的海面。',
        observation: '对照正常位置的虚线，观察东部20 ℃线向上移动、西部向下移动，东西倾斜增大。20 ℃线是温跃层位置参考，剖面深度和变化时长为示意。',
        takeaway: '水下结构与上升流共同影响海表温度。',
        view: 'section', layer: 'none', scenario: 'lanina', effects: ['equator', 'section', 'wind', 'currents', 'upwelling', 'windDrivenWater'],
      },
      {
        id: 'lanina-anomaly',
        title: '读取中东太平洋的负距平',
        question: '蓝色是否说明这里的海水已经很冷？',
        explanation: '距平图中的蓝色表示比1971—2000年同期月平均偏冷，并不等于海水的绝对温度很低。将中东部负距平与前面的海洋结构变化联系起来；只看一个月的距平还不够，判断拉尼娜还需要看偏冷是否持续，以及大气是否发生相应变化。',
        observation: '读出一个负距平值，再回想实际海温与距平的区别。',
        takeaway: '拉尼娜的“冷”首先是相对于气候基准而言。',
        view: 'pacific', layer: 'anomaly', scenario: 'lanina', effects: ['equator'],
      },
      {
        id: 'lanina-atmosphere',
        title: '海温差异与大气环流共同增强',
        question: '云雨和空气运动会怎样响应这种海温格局？',
        explanation: '中东部偏冷使东西海温差通常增大，西部对流较活跃、沃克环流增强；较强信风又推动暖水西聚，并加强东部冷却作用，有利于维持偏冷。这是发展中的放大反馈，降水变化具有区域性，不代表全球一起变湿或变干。',
        observation: '用“海气状态对比”观察西部云体发展、雨线疏密及上升下沉的差异，再联系信风与海温。云雨增强是典型机制提示，不对应实测雨量或真实变化时长。',
        takeaway: '偏冷改变环流，较强信风又有利于维持偏冷，形成拉尼娜状态下的海气反馈。',
        view: 'pacific', layer: 'none', scenario: 'lanina', effects: ['equator', 'wind', 'rise', 'sink', 'return', 'clouds', 'rain', 'windDrivenWater'],
      },
      {
        id: 'lanina-impacts',
        title: '偏冷异常也会带来区域影响',
        question: '海洋偏冷，是否意味着各地都变冷、少下雨？',
        explanation: '拉尼娜时期，印尼、澳大利亚部分地区降水偏多、洪涝风险上升，赤道太平洋东岸部分地区则可能偏干。这些变化影响农业用水、防洪准备等活动，具体表现因地区和季节而异，并非厄尔尼诺影响的完全反转。',
        observation: '比较两种异常状态下的区域风险，区分“海温偏冷”与“当地天气一定变冷”。',
        takeaway: '海温异常的影响跨越海陆；比较时既要找规律，也要看地区差异。',
        view: 'pacific', layer: 'anomaly', scenario: 'lanina', effects: ['equator', 'regionalImpacts'],
      },
      {
        id: 'lanina-china-winter',
        title: '看我国：冬季关注冷空气与阶段性降温',
        question: '拉尼娜就一定会带来冷冬吗？',
        explanation: '历史分析表明，拉尼娜盛期冬季影响我国的冷空气往往较频繁，中东部气温偏低的可能性较大。但并非每次拉尼娜都出现冷冬，仍要结合其他气候因素和最新预报判断。',
        observation: '先看冰蓝色表示的偏冷倾向，再观察冷空气活动示意，联系农作物防寒、交通出行和能源保障；颜色不对应实测气温，气流也不是某次过程的实际路径。',
        takeaway: '提高对阶段性降温的关注，不等于断言整个冬天或全国各地都会持续寒冷。',
        view: 'china', layer: 'none', scenario: 'lanina', effects: ['chinaImpacts'],
      },
      {
        id: 'lanina-china-summer',
        title: '看我国：次年夏季多雨区并不固定',
        question: '能把厄尔尼诺的旱涝分布直接反过来吗？',
        explanation: '拉尼娜盛期冬季之后的夏季（通常为次年夏季），我国北方降水偏多的可能性较大，但多雨区的位置、范围和强度因事件而异，还受春夏海温演变及其他气候因素影响。不能据此画出固定的“南旱北涝”分界。',
        observation: '北方附近的少量雨线仅提示关注降水风险，不圈定预测雨区。联系当地防汛、农业排涝和实际天气预报。',
        takeaway: '关注北方多雨的统计倾向，同时保留地区、季节和不同事件之间的差异。',
        view: 'china', layer: 'none', scenario: 'lanina', effects: ['chinaImpacts'],
      },
      {
        id: 'enso-monitoring',
        title: '持续观测，才能研判风险',
        question: '一张海温图足以判断未来旱涝吗？',
        explanation: '卫星、海洋浮标和气象站持续观测海温、水下温度、气压及风。研究者结合连续观测与数值模式（用物理规律计算海气变化）预测发展，为农业、防灾提供参考。跨地区共享资料，有助于更好地应对风险。',
        observation: '在控制面板切换海温或气压图层，核对历史资料的日期，再列出还需要连续观测的要素；单月图只能提供部分证据。',
        takeaway: '连续观测支持预测，预测服务风险准备；历史教学案例不是实时预报。',
        view: 'pacific', layer: 'none', scenario: 'lanina', effects: ['equator', 'monitoring'],
      },
      {
        id: 'enso-summary',
        title: '用同一条关系链比较三种状态',
        question: '你能用风、温跃层、海温和云雨解释每一种状态吗？',
        explanation: '三种情况都可沿同一关系链理解：信风改变海水输送与温跃层，进而影响海温；海温改变对流和气压，又反馈到信风。打开“海气状态对比”，在同一视角、同一色标下逐项比较，注意区分历史资料与典型机制。',
        observation: '先预测一个要素怎样变化，再在“海气状态对比”中切换海温、气压、距平、温跃层或云雨环流，检查对应关系。',
        takeaway: '海—气相互作用的关键是双向联系；三种状态不是按课件顺序固定轮流出现。',
        view: 'section', layer: 'none', scenario: 'lanina', effects: ['equator', 'section', 'wind', 'upwelling', 'rise', 'sink', 'return', 'clouds', 'rain', 'windDrivenWater'],
      },
    ],
  },
]

export const allSteps: LessonStep[] = chapters.flatMap((chapter) => chapter.steps)

const comparisonScenarios: Record<Scenario, { title: string; month: string }> = {
  normal: { title: '正常情况', month: '2013年12月' },
  elnino: { title: '厄尔尼诺', month: '2015年12月' },
  lanina: { title: '拉尼娜', month: '2010年12月' },
}

// Comparisons keep the same camera and visible variables across all three
// scenarios. Their IDs deliberately do not trigger the lesson transitions.
export function makeComparisonStep(scenario: Scenario, focus: ComparisonFocus): LessonStep {
  const selected = comparisonScenarios[scenario]
  const base = {
    id: `compare-${focus}-${scenario}`,
    scenario,
    view: 'pacific' as ViewMode,
  }
  if (focus === 'section') {
    return {
      ...base,
      title: `${selected.title} · 温跃层`,
      question: '在相同剖面视角下，东西两侧的温跃层怎样不同？',
      explanation: '用同一剖面比较三种情况：正常情况下西深东浅；厄尔尼诺时东部加深、东西倾斜减小；拉尼娜时倾斜通常增大。20 ℃线用于参考温跃层位置，整幅水下结构不是所选历史月份的实测剖面。',
      observation: '依次切换三种状态，比较同一位置的暖水层厚度、20 ℃线与东部上涌强弱；长度、深度、速度均为示意。',
      takeaway: '同一视角比较水下结构，能看清冷水对海面影响的变化。',
      view: 'section', layer: 'none', effects: ['section', 'wind', 'upwelling', 'equator'],
    }
  }
  if (focus === 'atmosphere') {
    return {
      ...base,
      title: `${selected.title} · 云雨与环流`,
      question: '信风、上升支与云雨区怎样一起调整？',
      explanation: '用相同要素比较典型环流：正常情况下西部上升、东部下沉；厄尔尼诺时信风减弱，对流活跃区向东扩展；拉尼娜时信风和西部对流通常增强。每次现象的具体位置与影响都有差异。',
      observation: '在同一视角比较风的强弱、上升区位置、云体与雨线疏密；这些是典型机制示意，不是三个历史月份的实测云雨或风场。',
      takeaway: '海温分布影响大气，大气变化又会反馈到海洋。',
      layer: 'none', effects: ['wind', 'rise', 'sink', 'return', 'clouds', 'rain', 'equator'],
    }
  }
  const dataCopy = {
    sst: {
      title: '海表温度',
      question: '同一色标下，赤道太平洋的海温分布有什么差异？',
      explanation: '这里比较三个历史月份的月平均海表温度。“正常情况”选取没有明显厄尔尼诺或拉尼娜现象的月份作参考，参考月份不等于多年平均。海温还受纬度等因素影响，不能把两张图相减直接叫作海温距平。',
      observation: '固定观察位置，比较西、中、东赤道太平洋的数值与东西温差；同时核对日期和单位 ℃。',
      takeaway: '海表温度表示当月实际有多暖；异常偏暖或偏冷要另看距平。',
    },
    pressure: {
      title: '海平面气压',
      question: '三个月份中，近海面的东西气压差怎样变化？',
      explanation: '这里比较三个历史月份的月平均海平面气压，单位为 hPa。固定位置比较东西差异，不能把水面上的设色当作海水压力，也不能由此直接判定高空气压分布。',
      observation: '用相同位置和色标比较海平面气压读数；历史个例的细节可能与简化的典型环流不同。',
      takeaway: '气压资料描述具体月份，环流示意帮助解释其中的联系。',
    },
    anomaly: {
      title: '海温距平',
      question: '相对于气候基准，哪些海域偏暖，哪些偏冷？',
      explanation: '三个历史月份都使用1971—2000年同期月平均作为海温距平基准。正值为偏暖，负值为偏冷；“正常情况”的参考月份也不等于多年平均，各海域的距平不必恰好为零。只看一个月的距平，还不能判断偏暖或偏冷是否持续。',
      observation: '沿赤道比较中东太平洋的正负值与范围；保持同一色标，留意资料日期。',
      takeaway: '统一气候基准，才有可比较的海温异常。',
    },
  }[focus]
  return {
    ...base,
    ...dataCopy,
    title: `${selected.title} · ${dataCopy.title}`,
    explanation: `${selected.month}资料。${dataCopy.explanation}`,
    layer: focus,
    effects: ['equator', 'oceans'],
  }
}

export const lessonReferences = [
  { title: '国家气候中心：厄尔尼诺对我国冬季气温及次年夏季降水的影响', url: 'https://www.ncc-cma.net/channel/news/newsid/9826' },
  { title: '中国气象报社：拉尼娜与我国冬季冷空气，冷冬并非必然', url: 'https://www.weather.com.cn/climate/2022/10/3570790.shtml' },
  { title: '国家气候中心专家解读：拉尼娜次年夏季降水影响并非固定反转', url: 'https://news.weather.com.cn/2022/07/3548497.shtml' },
  { title: '中华地图版《地理·选择性必修1 自然地理基础》（2020年第1版，主题8，p88—100）', url: 'https://r1-ndr.ykt.cbern.com.cn/edu_product/esp/assets/416cedfa-fac4-439e-a69c-e74404cf92f2.pkg/pdf.pdf' },
  { title: 'NOAA：海气之间的热量、水分与动量交换', url: 'https://www.pmel.noaa.gov/ocs/air-sea-fluxes/' },
  { title: 'NOAA：云的形成', url: 'https://www.noaa.gov/jetstream/clouds/how-clouds-form' },
  { title: 'NASA：水循环中的蒸发、凝结与能量交换', url: 'https://science.nasa.gov/earth/earth-observatory/the-water-cycle/' },
  { title: 'NOAA：洋流教学资料', url: 'https://www.noaa.gov/education/resource-collections/ocean-coasts/ocean-currents' },
  { title: 'NOAA：厄尔尼诺与拉尼娜', url: 'https://www.noaa.gov/education/resource-collections/weather-atmosphere/el-nino' },
  { title: 'NOAA：厄尔尼诺和拉尼娜发展中的海气反馈', url: 'https://content-drupal.climate.gov/news-features/blogs/enso/rise-el-ni%C3%B1o-and-la-ni%C3%B1a' },
  { title: 'NOAA CPC：厄尔尼诺时期的海洋与大气结构', url: 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensocycle/enso_schem.shtml' },
]
