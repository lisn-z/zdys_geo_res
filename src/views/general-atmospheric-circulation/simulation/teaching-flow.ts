import type { SeasonPoint } from './seasonal-controls.ts'

export const teachingLayerKeys = [
  'earth', 'singleCell', 'circulationEnvelope', 'airflowRibbons', 'hadleyCell', 'ferrelCell', 'polarCell', 'windForces',
  'surfaceWinds', 'pressureBands', 'regionalPressureCenters', 'monsoonWinds',
  'oceanCurrents', 'isobars', 'latLines', 'subsolarLine', 'textAnnotations', 'rotationGuide',
] as const

export type TeachingLayerKey = typeof teachingLayerKeys[number]
export interface TeachingStep {
  id: string
  title: string
  description: string
  layers: Record<string, boolean>
  singlePhase?: 'heating' | 'vertical' | 'closed'
  focusCell?: 'single' | 'hadley' | 'ferrel' | 'polar'
  month?: 0 | 6
  seasonPoint?: SeasonPoint
  neutralSeason?: boolean
  durationMs: number
}
export interface TeachingStage {
  id: string
  shortName: string
  title: string
  desc: string
  steps: TeachingStep[]
}
export interface TeachingPosition { stage: number; step: number }

// Every step owns a complete preset. No previously selected layer can leak into
// a later step, and applying a step never depends on the direction of navigation.
function layerPreset(enabled: Partial<Record<TeachingLayerKey, boolean>> = {}): Record<string, boolean> {
  return {
    earth: true,
    singleCell: false,
    circulationEnvelope: false,
    airflowRibbons: false,
    hadleyCell: false,
    ferrelCell: false,
    polarCell: false,
    windForces: false,
    surfaceWinds: false,
    pressureBands: false,
    regionalPressureCenters: false,
    monsoonWinds: false,
    oceanCurrents: false,
    isobars: false,
    latLines: true,
    subsolarLine: false,
    textAnnotations: true,
    rotationGuide: false,
    ...enabled,
  }
}

const stageDefinitions: TeachingStage[] = [
  {
    id: 'ideal',
    shortName: '理想单圈',
    title: '阶段一：理想单圈环流',
    desc: '假设地表均匀、地球不自转，从高低纬度受热差异推导南北半球的理想单圈环流。',
    steps: [
      {
        id: 'ideal-heating', title: '理想假设与冷热差异',
        description: '先只考虑高低纬度受热不均：赤道附近获得的太阳辐射较多，两极附近较少。暂不考虑海陆差异和地转偏向力。',
        layers: layerPreset(), singlePhase: 'heating', neutralSeason: true, durationMs: 7000,
      },
      {
        id: 'ideal-vertical', title: '赤道上升，两极下沉',
        description: '观察受热差异引起的垂直运动：赤道附近空气受热上升，两极附近空气冷却下沉。',
        layers: layerPreset(), singlePhase: 'vertical', neutralSeason: true, durationMs: 8000,
      },
      {
        id: 'ideal-closed', title: '连接成闭合单圈环流', focusCell: 'single',
        description: '高空气流从赤道流向两极，近地面气流从两极流向赤道，与上升、下沉气流共同构成理想闭合环流。',
        layers: layerPreset({ singleCell: true, circulationEnvelope: true, airflowRibbons: true }), singlePhase: 'closed', neutralSeason: true, durationMs: 10000,
      },
    ],
  },
  {
    id: 'three',
    shortName: '三圈环流',
    title: '阶段二：三圈环流与气流偏转',
    desc: '在理想模型中加入地球自转的影响，依次观察低纬、中纬和高纬环流，以及对应的气压带、风带。',
    steps: [
      {
        id: 'three-forces', title: '地球自转与风向偏转',
        description: '水平气压梯度力由高压指向低压。空气运动后受到地转偏向力作用，北半球向运动方向右侧偏转，南半球向左侧偏转。力箭头为教学示意。',
        layers: layerPreset({ windForces: true }), neutralSeason: true, durationMs: 9000,
      },
      {
        id: 'three-hadley', title: '低纬环流：赤道上升，副热带下沉', focusCell: 'hadley',
        description: '观察赤道附近上升、副热带地区下沉的低纬环流。近地面气流向赤道运动，并偏转形成信风。',
        layers: layerPreset({ hadleyCell: true, circulationEnvelope: true, airflowRibbons: true }), neutralSeason: true, durationMs: 9000,
      },
      {
        id: 'three-ferrel', title: '中纬环流：副极地上升，副热带下沉', focusCell: 'ferrel',
        description: '观察副极地附近上升、副热带附近下沉的中纬环流。近地面气流由副热带流向副极地，并偏转形成西风。',
        layers: layerPreset({ hadleyCell: true, ferrelCell: true, circulationEnvelope: true, airflowRibbons: true }), neutralSeason: true, durationMs: 9000,
      },
      {
        id: 'three-polar', title: '高纬环流：副极地上升，极地下沉', focusCell: 'polar',
        description: '观察副极地附近上升、极地冷却下沉的高纬环流。近地面气流由极地流向副极地，并偏转形成极地东风。',
        layers: layerPreset({ hadleyCell: true, ferrelCell: true, polarCell: true, circulationEnvelope: true, airflowRibbons: true }), neutralSeason: true, durationMs: 9000,
      },
      {
        id: 'three-belts', title: '对应七个气压带和六个风带',
        description: '将上升、下沉位置与气压带对应，再观察近地面风向：北半球向运动方向右侧偏转，南半球向左侧偏转。',
        layers: layerPreset({ hadleyCell: true, ferrelCell: true, polarCell: true, circulationEnvelope: true, airflowRibbons: true, pressureBands: true, surfaceWinds: true }),
        neutralSeason: true, durationMs: 10000,
      },
    ],
  },
  {
    id: 'pressure',
    shortName: '气压带风带',
    title: '阶段三：气压带和风带的季节移动',
    desc: '先观察南北对称的理想分布，再比较春分、夏至、秋分和冬至的气压带、风带位置。气压带和风带的位移为理想示意，不等同于太阳直射点的纬度变化幅度。',
    steps: [
      {
        id: 'pressure-belts', title: '观察七个气压带',
        description: '暂不考虑季节位移，辨认赤道低压带、副热带高压带、副极地低压带和极地高压带的南北对称分布。',
        layers: layerPreset({ pressureBands: true }), seasonPoint: 'spring-equinox', neutralSeason: true, durationMs: 7000,
      },
      {
        id: 'pressure-winds', title: '加入六个风带',
        description: '在气压带之间显示近地面风向，比较南北半球的信风、中纬西风与极地东风。',
        layers: layerPreset({ pressureBands: true, surfaceWinds: true }), seasonPoint: 'spring-equinox', neutralSeason: true, durationMs: 8000,
      },
      {
        id: 'pressure-spring-equinox', title: '春分：太阳直射赤道',
        description: '春分时太阳直射赤道，先观察气压带和风带接近南北对称的理想位置，作为比较季节移动的起点。气压带和风带的位移为理想示意。',
        layers: layerPreset({ pressureBands: true, surfaceWinds: true, subsolarLine: true }), seasonPoint: 'spring-equinox', neutralSeason: false, durationMs: 9000,
      },
      {
        id: 'pressure-summer-solstice', title: '夏至：气压带和风带北移',
        description: '夏至时太阳直射北回归线（北纬23°26′），理想气压带和风带整体偏北。气压带和风带的位移为理想示意，并非也向北移动23°26′。',
        layers: layerPreset({ pressureBands: true, surfaceWinds: true, subsolarLine: true }), seasonPoint: 'summer-solstice', neutralSeason: false, durationMs: 9000,
      },
      {
        id: 'pressure-autumn-equinox', title: '秋分：太阳直射点回归赤道',
        description: '秋分时太阳直射点回到赤道，气压带和风带也回到接近南北对称的理想位置。气压带和风带的位移为理想示意，不表示真实大气会在节气当天同步复位。',
        layers: layerPreset({ pressureBands: true, surfaceWinds: true, subsolarLine: true }), seasonPoint: 'autumn-equinox', neutralSeason: false, durationMs: 9000,
      },
      {
        id: 'pressure-winter-solstice', title: '冬至：气压带和风带南移',
        description: '冬至时太阳直射南回归线（南纬23°26′），理想气压带和风带整体偏南。气压带和风带的位移为理想示意，并非也向南移动23°26′。',
        layers: layerPreset({ pressureBands: true, surfaceWinds: true, subsolarLine: true }), seasonPoint: 'winter-solstice', neutralSeason: false, durationMs: 9000,
      },
    ],
  },
  {
    id: 'lat-lon',
    shortName: '海陆与季风',
    title: '阶段四：海陆气压、季风与洋流',
    desc: '利用全球海平面气压的多年平均月资料，比较海陆气压中心和季风的季节变化，并拓展观察洋流。',
    steps: [
      {
        id: 'regional-january', title: '1月：观察海陆气压中心',
        description: '读取1月多年平均海平面气压场，结合气压等级配色和数值，辨认亚洲高压和阿留申低压。这里展示的是气候平均状态，不是实时天气。',
        layers: layerPreset({ regionalPressureCenters: true }), month: 0, neutralSeason: false, durationMs: 9000,
      },
      {
        id: 'regional-july', title: '7月：比较海陆气压变化',
        description: '切换到7月多年平均气压场，观察亚洲低压与北太平洋副热带高压，比较海陆气压配置的季节差异。',
        layers: layerPreset({ regionalPressureCenters: true }), month: 6, neutralSeason: false, durationMs: 9000,
      },
      {
        id: 'monsoon-july', title: '7月：观察夏季风',
        description: '观察东亚东南季风，以及部分东南信风越过赤道、向右偏转形成南亚西南季风的过程。蓝色表示跨赤道前的信风，越过赤道后逐渐变为紫色。',
        layers: layerPreset({ regionalPressureCenters: true, surfaceWinds: true, monsoonWinds: true }),
        month: 6, neutralSeason: false, durationMs: 10000,
      },
      {
        id: 'monsoon-january', title: '1月：比较南北半球季风',
        description: '北半球冬季，东亚盛行西北季风、南亚盛行东北季风。南半球此时为夏季：部分东北信风越过赤道、向左偏转，形成澳大利亚北部的西北季风，并由蓝色逐渐变为紫色。',
        layers: layerPreset({ regionalPressureCenters: true, surfaceWinds: true, monsoonWinds: true }),
        month: 0, neutralSeason: false, durationMs: 10000,
      },
      {
        id: 'currents-extension', title: '拓展：表层洋流与季节变化',
        description: '保留风向并加入洋流，观察风与表层海水运动的联系。切换1月、7月比较北印度洋的季节变化。洋流路径为教学示意。',
        layers: layerPreset({ surfaceWinds: true, monsoonWinds: true, oceanCurrents: true }), month: 6, neutralSeason: false, durationMs: 10000,
      },
    ],
  },
]

// The single-cell stage assumes a nonrotating Earth. All later stages retain a
// north-polar rotation guide. In stage two, forces stay on as circulation is
// introduced; the view preserves any manual off choice between its steps.
export const stages: TeachingStage[] = stageDefinitions.map((stage, stageIndex) => ({
  ...stage,
  steps: stage.steps.map(step => ({
    ...step,
    layers: { ...step.layers, rotationGuide: stageIndex > 0, windForces: stageIndex === 1 || !!step.layers.windForces },
  })),
}))

function isTeachingPosition(stage: number, step: number): boolean {
  return Number.isInteger(stage) && Number.isInteger(step)
    && stage >= 0 && stage < stages.length && step >= 0 && step < stages[stage]!.steps.length
}

/** At the last step return null; callers decide whether to stop or explicitly replay. */
export function getNextTeachingPosition(stage: number, step: number): TeachingPosition | null {
  if (!isTeachingPosition(stage, step)) return null
  if (step + 1 < stages[stage]!.steps.length) return { stage, step: step + 1 }
  return stage + 1 < stages.length ? { stage: stage + 1, step: 0 } : null
}

/** Crossing a stage boundary returns the previous stage's last step, not its first. */
export function getPreviousTeachingPosition(stage: number, step: number): TeachingPosition | null {
  if (!isTeachingPosition(stage, step)) return null
  if (step > 0) return { stage, step: step - 1 }
  return stage > 0 ? { stage: stage - 1, step: stages[stage - 1]!.steps.length - 1 } : null
}
