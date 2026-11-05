import type { Landscape, SceneStats } from './types'

export type NaturalLandscape = Exclude<Landscape, 'dubai'>
export type InquiryStage = 'observe' | 'predict' | 'place' | 'explain'

export interface InquiryEvidence {
  id: string
  label: string
  observation: string
  explanation: string
}

export interface InquiryPrediction {
  id: string
  label: string
  explanation: string
}

export interface InquiryReason {
  id: string
  label: string
  correct: boolean
  feedback: string
}

export interface InquiryCausalChain {
  condition: string
  choice: string
  form: string
}

export interface InquiryCase {
  landscape: NaturalLandscape
  question: string
  evidence: InquiryEvidence[]
  requiredEvidenceIds: string[]
  predictions: InquiryPrediction[]
  expectedPredictionId: string
  reasonOptions: InquiryReason[]
  correctReasonIds: string[]
  causalChain: InquiryCausalChain
  counterfactual: { condition: string; question: string; explanation: string }
  takeaway: string
}

export const INQUIRY_MODEL_NOTE =
  '这是条件与形态的课堂比较。模型允许放置，只表示满足简化规则，不代表真实建设安全；真实选址还要调查洪水、地质等条件。'

export const INQUIRIES: Record<NaturalLandscape, InquiryCase> = {
  plain: {
    landscape: 'plain',
    question: '在怎样的地势和交通条件下，聚落容易向四周展开？',
    evidence: [
      { id: 'plain-open', label: '四周地面较平坦', observation: '转到俯视与斜视，比较村落四周的高低起伏。', explanation: '平坦开阔使多个方向都有较多可用空间。' },
      { id: 'plain-roads', label: '道路可以向多方向联系', observation: '找出穿过村落和通向周围农田的道路。', explanation: '道路联系影响房屋靠近哪里，也可能使局部沿路延伸。' },
      { id: 'plain-fields', label: '村落周围有成片农田', observation: '观察房屋与周边规则农田的位置关系。', explanation: '居住与农业生产需要联系，聚落发展还要考虑土地利用。' },
    ],
    requiredEvidenceIds: ['plain-open', 'plain-roads'],
    predictions: [
      { id: 'plain-cluster', label: '向多个方向聚集，较易成团块', explanation: '这与四周开阔、多方向联系的条件相符；只是常见趋势，不是唯一结果。' },
      { id: 'plain-strip', label: '主要沿一条线延伸', explanation: '如果房屋集中沿一条道路发展，也可能成条带；需要指出这条限制或吸引线在哪里。' },
      { id: 'plain-scattered', label: '房屋远距离分散', explanation: '分散也可能与生产方式有关，但平坦本身不能解释为什么房屋必须彼此远离。' },
    ],
    expectedPredictionId: 'plain-cluster',
    reasonOptions: [
      { id: 'plain-space-reason', label: '地势开阔，多个方向有发展空间', correct: true, feedback: '这解释了向四周展开的可能性，但还需看人的活动。' },
      { id: 'plain-link-reason', label: '道路与农业生产影响房屋的位置', correct: true, feedback: '把交通和生产与可用空间联系起来，原因更完整。' },
      { id: 'plain-only-reason', label: '只要是平原，就一定形成团块', correct: false, feedback: '把“常见”说成了“一定”。交通线、生产和历史也能改变布局。' },
      { id: 'plain-water-reason', label: '没有河流，就不可能形成聚落', correct: false, feedback: '不能从画面中没有大河推断完全没有水源，也不能据此否定聚落。' },
    ],
    correctReasonIds: ['plain-space-reason', 'plain-link-reason'],
    causalChain: {
      condition: '地面平坦开阔，农田与道路提供生产和多方向联系条件。',
      choice: '居民在便于耕作和通行的地方聚居，可向多个方向发展。',
      form: '聚落较易向四周形成团块，也可能受主要道路吸引而延伸。',
    },
    counterfactual: {
      condition: '只保留一条主要通行道路，其余方向联系变弱。',
      question: '即使地势仍平坦，房屋还一定向四周同样扩展吗？',
      explanation: '可能更多沿主要道路延伸。地形提供空间，交通和活动改变人们选择的位置。',
    },
    takeaway: '平坦开阔提供多方向空间，道路和生产影响具体位置，因此团块状较常见，但并非必然。',
  },
  valley: {
    landscape: 'valley',
    question: '当可用空间被山坡夹住时，聚落为什么常顺着谷地延伸？',
    evidence: [
      { id: 'valley-floor', label: '较平缓的谷地呈狭长分布', observation: '从俯视图追踪谷地的走向，比较长度与宽度。', explanation: '较平缓的陆地沿谷地延伸，可用空间并非四周同样开阔。' },
      { id: 'valley-slopes', label: '两侧山坡明显抬升', observation: '转到斜视，比较两侧山坡与谷底的坡度。', explanation: '坡度限制了横向扩展的便利程度，但不能仅凭画面判定建设安全。' },
      { id: 'valley-road', label: '道路顺着谷地联系', observation: '找出道路与较平缓地带是否大致同向。', explanation: '沿谷交通把分布在谷地、山麓的居民点联系起来。' },
    ],
    requiredEvidenceIds: ['valley-floor', 'valley-slopes'],
    predictions: [
      { id: 'valley-strip', label: '主要沿谷地呈条带延伸', explanation: '较平缓空间狭长，加上沿谷交通，支持这种预测。' },
      { id: 'valley-cluster', label: '主要向四周聚成团块', explanation: '局部宽谷可能聚成团块；若要解释整个山谷，需要比较两侧坡度与谷地宽度。' },
      { id: 'valley-scattered', label: '均匀散布在所有山坡上', explanation: '这忽略了坡度差异。先比较哪些位置较平缓，再解释分布。' },
    ],
    expectedPredictionId: 'valley-strip',
    reasonOptions: [
      { id: 'valley-space-reason', label: '两侧山坡使较平缓空间较狭长', correct: true, feedback: '这解释了为什么横向扩展受到限制。' },
      { id: 'valley-link-reason', label: '沿谷地的交通有利于居民点联系', correct: true, feedback: '交通与狭长空间一起影响聚落发展的方向。' },
      { id: 'valley-only-reason', label: '所有山区聚落都一定是条带状', correct: false, feedback: '谷地宽窄、坡度、交通与历史不同，山区也会出现其他形态。' },
      { id: 'valley-safe-reason', label: '模型能放下房屋的坡面都适合真实建房', correct: false, feedback: '模型只有简化条件。真实建设需要地质、灾害等调查与专业评估。' },
    ],
    correctReasonIds: ['valley-space-reason', 'valley-link-reason'],
    causalChain: {
      condition: '两侧山坡抬升，较平缓谷地狭长，道路沿谷地联系。',
      choice: '居民较多利用平缓谷地和山麓，沿交通线安排居住活动。',
      form: '聚落常顺谷地呈条带延伸，局部宽谷也可能形成团块。',
    },
    counterfactual: {
      condition: '谷地变宽，较平缓的空间向两侧增加。',
      question: '聚落还会保持同样细长吗？',
      explanation: '可能向两侧扩展，局部更趋团聚；道路和原有聚落位置仍会影响发展方向。',
    },
    takeaway: '山坡与谷地宽度影响可用空间，沿谷交通影响联系，聚落因而常沿谷地和山麓延伸。',
  },
  river: {
    landscape: 'river',
    question: '水源和沿河联系怎样影响选址？为什么“依水”不等于“入水”？',
    evidence: [
      { id: 'river-water', label: '河流提供水源与水路联系', observation: '找出河流走向，想想取水、灌溉和水路联系怎样利用它。', explanation: '这些便利会吸引生产和居住活动靠近河岸。' },
      { id: 'river-banks', label: '河岸陆地与河道可以区分', observation: '比较河岸陆地、河面和离河更远的土地。', explanation: '房屋利用岸上土地；河道需要行水，依水不代表在水中建房。' },
      { id: 'river-links', label: '岸边城镇沿河联系', observation: '俯视比较城镇排列、河流走向与岸边道路。', explanation: '本例的水源、岸上用地与交通联系共同支持沿河延伸。' },
    ],
    requiredEvidenceIds: ['river-water', 'river-banks'],
    predictions: [
      { id: 'river-strip', label: '在岸上主要沿河呈条带延伸', explanation: '符合教材尼罗河案例，但要同时核对岸上空间和交通，不能推广为所有沿河聚落。' },
      { id: 'river-cluster', label: '在宽阔岸地向四周形成团块', explanation: '宽阔岸地或交通节点也可能形成团块。需要补充这些条件，而不是直接判错。' },
      { id: 'river-scattered', label: '分散各处，与河流没有明显关系', explanation: '其他活动可能产生这种分布；若解释本例依水而建，仍需回应用水和沿河联系。' },
    ],
    expectedPredictionId: 'river-strip',
    reasonOptions: [
      { id: 'river-use-reason', label: '水源、灌溉与交通为生活生产提供便利', correct: true, feedback: '这说明人们为什么愿意利用临河位置。' },
      { id: 'river-land-reason', label: '还要结合岸上地势、用地和沿河联系', correct: true, feedback: '把河流的便利与实际可用陆地一起考虑，解释才完整。' },
      { id: 'river-only-reason', label: '只要有河，聚落就一定是条带状', correct: false, feedback: '不同河岸的地形、交通和历史不同，也可能出现团块或其他形态。' },
      { id: 'river-safe-reason', label: '越贴近河流越好，近水就代表安全', correct: false, feedback: '临水有便利也有约束；不能占据河道，真实选址还需评估洪水等风险。' },
    ],
    correctReasonIds: ['river-use-reason', 'river-land-reason'],
    causalChain: {
      condition: '河流便于取水、灌溉和联系，岸上地势与用地各不相同。',
      choice: '居民利用岸上土地接近水源和交通，同时考虑洪水等限制。',
      form: '本例沿河延伸成条带，宽阔岸地或交通节点也可能团聚。',
    },
    counterfactual: {
      condition: '岸上出现一处更宽阔的平地，并成为道路交会点。',
      question: '聚落只会沿河拉长，还是也可能向道路交会点聚集？',
      explanation: '可能在交会点形成较团聚的部分，同时保留沿河延伸。水源、空间和交通共同影响形态。',
    },
    takeaway: '河流带来用水和联系便利，岸上空间与交通共同影响分布；本例沿河呈条带，不等于所有沿河聚落都如此。',
  },
  coast: {
    landscape: 'coast',
    question: '有限的山坡陆地与临海港湾，怎样共同影响五渔村？',
    evidence: [
      { id: 'coast-slope', label: '山坡与陡岩限制陆地空间', observation: '转到斜视，观察房屋位置高低与岩岸的关系。', explanation: '可用陆地有限，房屋随地势聚集，不能把海岸当成一条平直平地。' },
      { id: 'coast-harbor', label: '临海港湾提供联系条件', observation: '找出海湾、港口与房屋的位置关系。', explanation: '教材说明渔港主要用于贸易，临海位置与居民活动有关。' },
      { id: 'coast-fields', label: '坡地种植与村落相邻', observation: '观察坡地上的种植空间，联系教材中的葡萄等作物。', explanation: '居民同时利用山地与海洋条件，聚落不是只受海水影响。' },
    ],
    requiredEvidenceIds: ['coast-slope', 'coast-harbor'],
    predictions: [
      { id: 'coast-stepped', label: '依坡紧密聚集，面向港湾联系', explanation: '结合有限坡地与港湾活动，符合五渔村案例；它不是所有海岸聚落的固定形态。' },
      { id: 'coast-strip', label: '在平直海岸上均匀排成长带', explanation: '平缓狭长海岸可能如此，但本例有陡岩和明显高差，应先回应这些地势证据。' },
      { id: 'coast-scattered', label: '分散在远离港湾的山地', explanation: '不能仅凭有山就这样推断，还需解释为何居民的种植与港口贸易会选择这些位置。' },
    ],
    expectedPredictionId: 'coast-stepped',
    reasonOptions: [
      { id: 'coast-space-reason', label: '有限的陆地与高差影响建筑的聚集方式', correct: true, feedback: '这回应了山坡与岩岸的空间限制。' },
      { id: 'coast-life-reason', label: '居民利用坡地种植和渔港贸易的条件', correct: true, feedback: '把地势、临海位置与生产生活联系起来，解释比单看山或海更完整。' },
      { id: 'coast-only-reason', label: '只要临海，房屋就必须排成条带', correct: false, feedback: '海岸地势、港湾和人的活动不同，沿海聚落形态也会不同。' },
      { id: 'coast-safe-reason', label: '已有悬崖房屋，说明所有陡坡都安全', correct: false, feedback: '景观照片不能代替工程调查，模型中的放置也不能作为真实建设建议。' },
    ],
    correctReasonIds: ['coast-space-reason', 'coast-life-reason'],
    causalChain: {
      condition: '山坡与岩岸限制陆地空间，港湾和坡地提供贸易与种植条件。',
      choice: '居民顺应地势聚居，利用坡地种植，并通过渔港开展贸易。',
      form: '房屋在有限陆地上依坡紧密聚集，并与临海港湾保持联系。',
    },
    counterfactual: {
      condition: '海边换成宽阔平地，房屋不再受到同样的山坡限制。',
      question: '建筑还需要像本例这样随坡紧密聚集吗？',
      explanation: '可能向更多方向展开，层叠特征减弱；港口位置与生产活动仍会影响房屋聚集在哪里。',
    },
    takeaway: '有限坡地影响空间，港湾和种植条件影响生产生活，两者共同塑造五渔村的分布。',
  },
}

export interface EvaluateInquiryInput {
  landscape: NaturalLandscape
  prediction: string | null
  evidenceIds: readonly string[]
  stats: SceneStats
}

export interface InquiryEvaluation {
  stage: InquiryStage
  title: string
  feedback: string
  placementEvidence: string[]
  nextStep: string
  hasEnoughHouses: boolean
  /** Agreement with this case's initial hypothesis, not a grade for the student's settlement. */
  predictionMatches: boolean | null
  evidenceMatches: string[]
  missingEvidenceIds: string[]
  caution: string
}

function placementInterpretation(landscape: NaturalLandscape, stats: SceneStats): string {
  if (stats.houses < 4) return `目前只有${stats.houses}栋房屋，证据还不足以比较稳定的形态。可以继续观察，也可以再放一些房屋。`
  const strip = stats.spread === '条带倾向'
  const cluster = stats.spread === '团块倾向'
  if (landscape === 'plain') {
    if (strip) return '你的布置呈条带倾向。检查是否主动沿一条道路排房：平坦允许向四周展开，并不要求你一定排成团块。'
    if (cluster) return '你的布置呈团块倾向，与多方向空间开阔的假设相容；仍要指出道路和生产联系，不能只凭轮廓判定原因。'
    return '先俯视比较房屋向几个方向展开，再联系四周地势和道路解释。'
  }
  if (landscape === 'valley') {
    if (strip) return '你的布置呈条带倾向。统计不记录它与谷地的朝向，请俯视核对房屋是否顺着较平缓的谷地延伸。'
    if (cluster) return '你的布置较团聚，可能集中在局部较宽的谷地。这不是放错了；再比较向谷地两端和向山坡扩展的差别。'
    return '比较房屋沿谷地延伸与向两侧山坡扩展时遇到的条件，不只观察房屋数量。'
  }
  if (landscape === 'river') {
    if (stats.nearWater === 0) return '这次还没有房屋被模型标记为近水。仅凭房屋轮廓，不能用这次布置验证“依水”的解释；可尝试岸上不同位置作比较。'
    if (strip) return '你的布置既呈条带倾向，又有房屋近水。还需俯视核对条带是否沿河，并解释用水、岸地和联系的作用。'
    if (cluster) return '你的布置较团聚，也有房屋近水。这说明临河不必只能成条带；可以检查宽阔岸地或道路节点的影响。'
    return '你已利用部分近水位置，再比较河流走向、岸上空间与房屋排列，说明选择这些位置的理由。'
  }
  return stats.nearWater > 0
    ? '你已布置部分临水房屋，但平面的团块/条带统计不能检验“依坡层叠”。请转到斜视，核对高差、有限陆地与港湾联系。'
    : '平面轮廓不能检验“依坡层叠”。请转到斜视观察高差，并解释这次远离模型近水区的房屋怎样与港湾和种植地联系。'
}

/** Evaluates an explanation against selected evidence and actual placement counts; never ranks a settlement. */
export function evaluateInquiry(input: EvaluateInquiryInput): InquiryEvaluation {
  const inquiry = INQUIRIES[input.landscape]
  const prediction = inquiry.predictions.find(item => item.id === input.prediction)
  const chosen = new Set(input.evidenceIds)
  const evidenceMatches = inquiry.evidence.filter(item => chosen.has(item.id)).map(item => item.id)
  const missingEvidenceIds = inquiry.requiredEvidenceIds.filter(id => !chosen.has(id))
  const hasEnoughHouses = input.stats.houses >= 4
  const predictionMatches = prediction ? prediction.id === inquiry.expectedPredictionId : null
  const stage: InquiryStage = evidenceMatches.length === 0 ? 'observe' : !prediction ? 'predict' : !hasEnoughHouses ? 'place' : 'explain'
  const titles: Record<InquiryStage, string> = {
    observe: '先说出你看见的条件',
    predict: '用线索提出一个预测',
    place: '继续观察，或增加布置作比较',
    explain: '把条件、选择与形态连起来',
  }
  const missingLabels = inquiry.evidence.filter(item => missingEvidenceIds.includes(item.id)).map(item => item.label)
  const evidenceFeedback = missingLabels.length
    ? `还可以补看：${missingLabels.join('、')}。`
    : '你已选出本案例的核心环境线索；还需用实际布置说明它们怎样影响选择。'
  const placementEvidence = [input.landscape === 'coast'
    ? `实际布置：${input.stats.houses}栋房屋。`
    : `实际布置：${input.stats.houses}栋房屋、${input.stats.roads}段道路。`]
  if (hasEnoughHouses) placementEvidence.push(`平面轮廓统计：${input.stats.spread}。它描述排列，不自动证明原因。`)
  if (input.landscape !== 'coast') {
    placementEvidence.push(input.stats.roads > 0
      ? `你放置了${input.stats.roads}段道路；数量不能说明道路是否连通，请观察房屋与道路的联系。`
      : '你尚未放置道路；可回到读环境观察示例道路，也可补放道路比较房屋位置。')
  }
  if (input.landscape === 'river' || input.landscape === 'coast') {
    placementEvidence.push(`${input.stats.houses}栋房屋中，${input.stats.nearWater}栋被模型标记为近水。这不是越多越好，也不是安全判定。`)
  }
  const nextStep = evidenceMatches.length === 0
    ? '先选择你能在场景中指出位置的线索；可以转动、俯视或走近观察。'
    : !prediction
      ? '选一个形态预测，再说明你用的是哪两条线索。'
      : !hasEnoughHouses
        ? '当前房屋少于4栋，形态对比证据还少；你可以继续观察，或在不同方向增加房屋后再比较。'
        : missingLabels.length
          ? `回到场景核对“${missingLabels.join('、')}”，再补充解释；不必把自己的聚落改成唯一答案。`
          : inquiry.counterfactual.question
  return {
    stage,
    title: titles[stage],
    feedback: [prediction ? prediction.explanation : '还没有形成形态预测。', evidenceFeedback, placementInterpretation(input.landscape, input.stats)].join(''),
    placementEvidence,
    nextStep,
    hasEnoughHouses,
    predictionMatches,
    evidenceMatches,
    missingEvidenceIds,
    caution: INQUIRY_MODEL_NOTE,
  }
}

export interface DubaiDriverChoice {
  id: string
  label: string
  correct: boolean
  explanation: string
}

export interface DubaiDriver {
  id: 'livelihood' | 'trade' | 'oil' | 'diversification'
  threshold: number
  title: string
  period: string
  condition: string
  activity: string
  spatialChange: string
  question: string
  choices: DubaiDriverChoice[]
}

/** Four drivers from textbook p.122, not four dated photographs or a measured growth timeline. */
export const DUBAI_DRIVERS: DubaiDriver[] = [
  {
    id: 'livelihood', threshold: 0, title: '早期渔村的生计', period: '正文从19世纪初说起',
    condition: '19世纪初，迪拜还是一个小渔村。',
    activity: '居民以渔业、珍珠采集和骆驼贸易为生。',
    spatialChange: '早期聚落规模较小；图5-24展示的是20世纪初的低矮聚落，照片年代与正文起点不同。',
    question: '教材中的早期居民，主要怎样谋生？',
    choices: [
      { id: 'livelihood-local', label: '渔业、珍珠采集和骆驼贸易', correct: true, explanation: '这三种活动来自教材正文，说明早期聚落与居民生计的联系。' },
      { id: 'livelihood-oil', label: '海底石油开发和现代会展', correct: false, explanation: '这些是后来阶段的驱动。教材记载发现海底石油是在1966年。' },
      { id: 'livelihood-none', label: '只看地形，不必考虑居民活动', correct: false, explanation: '教材用居民生计解释聚落发展，人的活动不能从原因中省去。' },
    ],
  },
  {
    id: 'trade', threshold: 0.25, title: '贸易推动城镇扩大', period: '20世纪开始',
    condition: '当地贸易迅速发展。',
    activity: '商业活动日益繁荣。',
    spatialChange: '迪拜的城市规模开始逐渐扩大；图5-25呈现20世纪60年代的城镇景观。',
    question: '为什么地形变化不大，聚落仍可能扩大？',
    choices: [
      { id: 'trade-activity', label: '贸易与商业活动增加，会推动城市发展', correct: true, explanation: '教材将贸易迅速发展、商业繁荣与城市规模扩大联系起来。' },
      { id: 'trade-static', label: '自然地形不变，城市规模就一定不变', correct: false, explanation: '这忽略了经济社会活动。教材中的贸易发展推动了城市扩大。' },
      { id: 'trade-only-coast', label: '只要临海，就自动成为同样的大城市', correct: false, explanation: '临海不能单独解释发展过程，还要考察实际发生的贸易和其他活动。' },
    ],
  },
  {
    id: 'oil', threshold: 0.58, title: '海底石油带来新驱动', period: '1966年',
    condition: '发现海底石油。',
    activity: '石油开发成为城市发展的重要驱动。',
    spatialChange: '此后迪拜迅速发展成为世界重要的石油城市；不能把整个20世纪60年代都当作同一发展状态。',
    question: '教材明确指出，1966年出现了什么新条件？',
    choices: [
      { id: 'oil-discovery', label: '发现海底石油', correct: true, explanation: '教材给出了1966年这一节点，并说明迪拜此后迅速发展为重要石油城市。' },
      { id: 'oil-trade-start', label: '迪拜从这一年才开始一切贸易', correct: false, explanation: '贸易活动更早就存在；教材说20世纪开始当地贸易已迅速发展。' },
      { id: 'oil-single-cause', label: '石油能解释之前和之后的全部变化', correct: false, explanation: '石油是重要的新驱动，但此前有贸易发展，之后还有产业多样化。' },
    ],
  },
  {
    id: 'diversification', threshold: 0.8, title: '多种产业共同发展', period: '之后的发展',
    condition: '在石油城市发展的基础上，迪拜转向发展多种产业。',
    activity: '发展旅游会展、交通运输、转口贸易、房地产等产业。',
    spatialChange: '成为世界闻名的旅游城市；图5-26呈现高楼与城市设施，它的“今日”指教材配图时期。',
    question: '解释教材中的现代迪拜，为什么不能只说“因为有石油”？',
    choices: [
      { id: 'diversification-multiple', label: '还要考虑旅游、运输、贸易等产业的发展', correct: true, explanation: '教材明确列出多种产业，这些活动共同参与城市的发展过程。' },
      { id: 'diversification-natural', label: '高楼完全是自然地形自己决定的', correct: false, explanation: '建筑和城市设施体现人的经济社会活动，不能只用自然地形解释。' },
      { id: 'diversification-never', label: '发现石油后，迪拜就没有再改变', correct: false, explanation: '教材继续介绍了产业转向和旅游城市的发展，城市并未停在石油发现阶段。' },
    ],
  },
]

export function getDubaiDriver(progress: number): DubaiDriver {
  const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
  let current = DUBAI_DRIVERS[0]!
  for (const driver of DUBAI_DRIVERS) {
    if (value >= driver.threshold) current = driver
  }
  return current
}
