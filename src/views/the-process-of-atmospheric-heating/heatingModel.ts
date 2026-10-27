export const processGroups = [
  { name: '太阳暖大地', caption: '短波输入', stages: [0, 1, 2] },
  { name: '大地暖大气', caption: '地面释热', stages: [3, 4, 5] },
  { name: '大气还大地', caption: '双向辐射与保温', stages: [6, 7, 8] },
] as const

export const stages = [
  { name: '太阳辐射', title: '太阳能穿过大气', start: 0, end: 11, group: 0, description: '太阳以短波辐射向地球输送能量。可见光能较顺利地穿过大气，抵达地表。', focus: '沿金色光束，观察能量由太阳进入地球系统。', takeaway: '太阳辐射是地球最主要的能量来源。' },
  { name: '大气削弱', title: '光在途中被吸收、反射和散射', start: 11, end: 23, group: 0, description: '臭氧吸收太阳辐射中的部分紫外线，水汽和二氧化碳吸收其中部分红外线。云反射一部分太阳辐射，空气分子和微粒使光向不同方向散射。', focus: '四种过程同时保留，播放时依次强调；也可点击过程名称查看。光球仅用于示意吸收位置，不表示四种过程先后发生。', takeaway: '大气对太阳辐射的削弱包括吸收、反射和散射；大气也能直接获得部分太阳能。' },
  { name: '地表吸收', title: '地表部分反射、其余吸收而增温', start: 23, end: 34, group: 0, description: '到达地表的太阳辐射，一部分被反射，其余被海洋和陆地吸收并转化为内能。地表性质不同，反射和吸收的比例也不同。', focus: '比较向上离开地面的反射光与地面吸收光斑：反射部分没有在地表转化为内能。', takeaway: '地表吸收太阳辐射而增温，同时也反射部分太阳辐射。' },
  { name: '地面长波', title: '暖地表向上发射红外长波', start: 34, end: 45, group: 1, description: '升温后的地表持续以长波辐射向外释放能量。图中的向上波线表示地面发出的红外辐射。', focus: '橙色波动光线从地面向上，表示地表释放红外能量。', takeaway: '地表温度比太阳低，发出的辐射波长更长。' },
  { name: '大气吸收', title: '温室气体吸收地面长波', start: 45, end: 56, group: 1, description: '对流层中的水汽、二氧化碳和云吸收地面长波，使大气获得能量。', focus: '橙色光线在分子附近汇聚，核心发亮，表现能量被吸收。', takeaway: '地面是近地面大气的主要直接热源。' },
  { name: '感热潜热', title: '空气运动与水的相变传递热量', start: 56, end: 68, group: 1, description: '暖地面与空气接触传热，湍流和对流等空气运动继续输送感热。地表水蒸发时吸收热量，水汽随空气输送，凝结成云滴时释放潜热。这两类过程都不是辐射。', focus: '观察暖空气的上升，以及水汽从蒸发到凝结的过程。气流和水汽标记不代表红外光线。', takeaway: '感热、潜热是非辐射能量交换，与地面长波辐射不同。' },
  { name: '双向辐射', title: '暖大气向各方向辐射：图示向上与向下', start: 68, end: 79, group: 2, description: '大气持续向各个方向发射长波辐射。本图选取向上、向下两条代表路径：一部分最终逸向太空，向下到达地表的部分称为大气逆辐射。', focus: '同时观察向上、向下的两条代表路径；大气辐射并非只有这两个方向。', takeaway: '大气向各方向辐射，其中朝向地表的部分形成大气逆辐射。' },
  { name: '大气逆辐射', title: '返回地表的长波减缓冷却', start: 79, end: 91, group: 2, description: '向下的大气长波被地表吸收，补偿地表损失的一部分热量，使地表冷却变慢。', focus: '琥珀色波线返回地表，落点出现贴地的吸收光斑。', takeaway: '逆辐射体现保温作用，并不会凭空创造能量。' },
  { name: '全过程总览', title: '全过程总览：地—气系统的能量交换', start: 91, end: 100, group: 2, description: '保留本模式已演示的全部机制：太阳短波输入、臭氧吸收紫外线、水汽和二氧化碳吸收太阳红外线、云反射、分子与微粒散射、地表反射与吸收、地面长波被大气吸收，以及大气向上辐射与逆辐射。重复路径合并显示。', focus: '沿短波输入、地表释热、大气回馈回看，吸收光球与路径标注一并保留。切换基础或拓展模式时，总览与该模式的演示内容保持一致。', takeaway: '这是已演示机制的全过程示意，不是定量能量收支图；不能由线条数量、粗细或光球大小推算能量。' },
] as const

export type LessonStep = {
  id: number
  name: string
  title: string
  start: number
  end: number
  group: number
  description: string
  focus: string
  takeaway: string
}

// Keep stable scene IDs while the teaching timeline omits optional transport.
export function createLessonPlan(includeExtensions: boolean): LessonStep[] {
  const selected = stages.map((stage, id) => ({ ...stage, id }))
    .filter(stage => includeExtensions || stage.id !== 5)
  const totalDuration = selected.reduce((sum, stage) => sum + stage.end - stage.start, 0)
  let elapsed = 0
  return selected.map((stage, index) => {
    const start = elapsed * 100 / totalDuration
    elapsed += stage.end - stage.start
    const end = index === selected.length - 1 ? 100 : elapsed * 100 / totalDuration
    return {
      ...stage,
      start,
      end,
      ...(includeExtensions && stage.id === 3 ? {
        description: stage.description + '其中一部分可经大气窗口直接逸向太空。',
        focus: stage.focus + '本步后段还可观察经大气窗口直接向太空释放的部分。',
      } : {}),
      ...(includeExtensions && stage.id === 8 ? {
        description: stage.description + '拓展模式同时保留大气窗口、感热与潜热。',
        focus: stage.focus + '注意区分辐射路径与感热、潜热这两类非辐射能量交换。',
      } : {}),
    }
  })
}

// The renderer retains its original substep thresholds (e.g. absorption at 14).
export function sceneProgressFor(step: { id: number; start: number; end: number }, progress: number): number {
  const sceneStage = stages[step.id]
  if (!sceneStage || step.end <= step.start) throw new RangeError('Invalid heating lesson step')
  const fraction = Math.max(0, Math.min(1, (progress - step.start) / (step.end - step.start)))
  return sceneStage.start + fraction * (sceneStage.end - sceneStage.start)
}

export type FlowId = 'solar' | 'ozone' | 'solarAirAbsorption' | 'reflection' | 'scatter' | 'ocean' | 'land' | 'surfaceReflection' | 'longwave' | 'window' | 'absorption' | 'sensible' | 'latent' | 'airUp' | 'airDown' | 'returnOcean' | 'returnLand'

export const attenuationSteps = [
  { id: 'ozone', name: '臭氧吸收紫外线', start: 11, end: 14 },
  { id: 'solarAirAbsorption', name: '水汽等吸收太阳红外线', start: 14, end: 17 },
  { id: 'reflection', name: '云反射', start: 17, end: 20 },
  { id: 'scatter', name: '分子与微粒散射', start: 20, end: 23 },
] as const satisfies readonly { id: FlowId; name: string; start: number; end: number }[]

// These intervals choose emphasis only; all four attenuation mechanisms stay visible.
export function focusedAttenuationFlow(progress: number): FlowId {
  return (attenuationSteps.find(step => progress < step.end) ?? attenuationSteps[attenuationSteps.length - 1]!).id
}

// Merge only duplicate paths: ocean -> solar, longwave -> absorption, airDown -> returnLand.
// Their absorption effects and destination labels remain represented in the overview.
export const overviewFlows: FlowId[] = ['solar', 'ozone', 'solarAirAbsorption', 'reflection', 'scatter', 'land', 'surfaceReflection', 'absorption', 'airUp', 'returnOcean', 'returnLand']
const extensionFlows: FlowId[] = ['window', 'sensible', 'latent']

// Both render and labels use this list, including when seeking or replaying a stage.
export function visibleFlows(stage: number, progress: number, includeExtensions = true): FlowId[] {
  if (progress >= 91 || stage === 8) return includeExtensions ? [...overviewFlows, ...extensionFlows] : [...overviewFlows]
  if (stage === 0) return ['solar']
  if (stage === 1) return attenuationSteps.map(step => step.id)
  if (stage === 2) return progress < 28 ? ['ocean', 'surfaceReflection'] : ['land', 'surfaceReflection']
  if (stage === 3) return !includeExtensions || progress < 42 ? ['longwave'] : ['longwave', 'window']
  if (stage === 4) return ['absorption']
  if (stage === 5) return includeExtensions ? ['sensible', 'latent'] : []
  if (stage === 6) return ['airUp', 'airDown']
  if (stage === 7) return ['returnOcean', 'returnLand']
  return []
}
