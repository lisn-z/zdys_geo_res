export type LandformId =
  | 'shelf'
  | 'slope'
  | 'arc'
  | 'trench'
  | 'basin'
  | 'ridge'

/**
 * 单位约定：
 * - `x0` / `x1` / `anchorFx`：占 `WORLD.length` 的分数，范围 0–1。
 * - `anchorFz`：占**半宽**（`WORLD.width / 2`）的分数，范围 [-1, 1]。
 * - 深度 / 高度：世界单位，水面 y = 0，向下为负。
 */
export interface LandformDef {
  id: LandformId
  name: string
  description: string
  supplement: boolean
  depthLine: string | null
  x0: number
  x1: number
  anchorFx: number
  anchorFz: number
}

export const WORLD = {
  length: 26,
  width: 12,
  bottom: -6.55,
  waterY: 0,
  shoreFx: 0.16,
} as const

export const LANDFORMS: ReadonlyArray<Readonly<LandformDef>> = [
  {
    id: 'shelf',
    name: '大陆架',
    description: '大陆架是陆地向海洋的自然延伸部分，坡度比较缓，水深一般在 200 米以内。',
    supplement: false,
    depthLine: '水深一般在 200 米以内',
    x0: WORLD.shoreFx,
    x1: 0.3,
    anchorFx: 0.23,
    anchorFz: -0.2,
  },
  {
    id: 'slope',
    name: '大陆坡',
    description: '大陆坡是大陆架向海洋倾斜的陡坡，水深急剧增至数千米。',
    supplement: false,
    depthLine: '水深急剧增至数千米',
    x0: 0.3,
    x1: 0.42,
    anchorFx: 0.36,
    anchorFz: -0.3,
  },
  {
    id: 'arc',
    name: '岛弧',
    description: '呈弧形分布的群岛，常与海沟相伴出现。',
    supplement: true,
    depthLine: null,
    x0: 0.42,
    x1: 0.47,
    anchorFx: 0.445,
    anchorFz: -0.15,
  },
  {
    id: 'trench',
    name: '海沟',
    description: '海沟是海洋底部最深的地方，最大水深 1 万多米。',
    supplement: false,
    depthLine: '最大水深 1 万多米',
    x0: 0.47,
    x1: 0.53,
    anchorFx: 0.5,
    anchorFz: 0.1,
  },
  {
    id: 'basin',
    name: '大洋盆地',
    description: '大洋底部宽广而相对平坦的凹地，是海底面积最大的部分。',
    supplement: true,
    depthLine: null,
    x0: 0.53,
    x1: 0.8,
    anchorFx: 0.66,
    anchorFz: -0.25,
  },
  {
    id: 'ridge',
    name: '大洋中脊',
    description: '海岭是狭长绵延的大洋底部高地，一般高出两侧海底 3000 ~ 4000 米。位于大洋中央部分的海岭，也称大洋中脊。',
    supplement: false,
    depthLine: '高出两侧海底 3000 ~ 4000 米',
    x0: 0.8,
    x1: 0.92,
    anchorFx: 0.86,
    anchorFz: -0.2,
  },
]

export const TOUR_STOPS: readonly (LandformId | null)[] = [
  null,
  'shelf',
  'slope',
  'arc',
  'trench',
  'basin',
  'ridge',
]

export function landformById(id: LandformId): Readonly<LandformDef> {
  const found = LANDFORMS.find((item) => item.id === id)
  if (!found) {
    throw new Error('未知地形 id：' + id)
  }
  return found
}
