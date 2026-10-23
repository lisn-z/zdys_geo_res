export type LandformId =
  | 'shelf'
  | 'slope'
  | 'arc'
  | 'trench'
  | 'basin'
  | 'ridge'

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
  bottom: -9,
  waterY: 0,
  shoreFx: 0.16,
} as const

export const PALETTE = {
  land: 0x7fb069,
  shelf: 0xbfe3ef,
  slope: 0x5d8ea6,
  basin: 0x3d7d9c,
  ridge: 0x6fa8bf,
  trench: 0x123c52,
  cut: 0xa97c50,
  water: 0x7ec3e0,
  fog: 0x0b1622,
  underwater: 0x06222b,
} as const

export const LANDFORMS: LandformDef[] = [
  {
    id: 'shelf',
    name: '大陆架',
    description: '大陆架是陆地向海洋的自然延伸部分，坡度比较缓，水深一般在 200 米以内。',
    supplement: false,
    depthLine: '水深一般在 200 米以内',
    x0: 0.16,
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
    name: '海岭',
    description: '海岭是狭长绵延的大洋底部高地，一般高出两侧海底 3000 ~ 4000 米。位于大洋中央部分的海岭，也称大洋中脊。',
    supplement: false,
    depthLine: '高出两侧海底 3000 ~ 4000 米',
    x0: 0.8,
    x1: 0.92,
    anchorFx: 0.86,
    anchorFz: -0.2,
  },
]

export const TOUR_STOPS: (LandformId | null)[] = [
  null,
  'shelf',
  'slope',
  'arc',
  'trench',
  'basin',
  'ridge',
]

export const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 1.2],
  [0.13, 1.0],
  [0.16, 0.12],
  [0.24, -0.35],
  [0.3, -0.6],
  [0.34, -1.3],
  [0.42, -3.0],
  [0.47, -3.2],
  [0.5, -7.5],
  [0.53, -4.6],
  [0.6, -5.0],
  [0.8, -5.0],
  [0.86, -2.2],
  [0.885, -2.7],
  [0.92, -4.8],
  [1, -5.0],
]

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

export function profileY(fx: number): number {
  const x = Math.min(1, Math.max(0, fx))
  let prev = PROFILE[0]!
  for (let i = 1; i < PROFILE.length; i++) {
    const cur = PROFILE[i]!
    if (x <= cur[0]) {
      const span = cur[0] - prev[0]
      const t = span <= 0 ? 0 : (x - prev[0]) / span
      return prev[1] + (cur[1] - prev[1]) * smoothstep(t)
    }
    prev = cur
  }
  return prev[1]
}

export function landformAt(fx: number): LandformId | null {
  for (const item of LANDFORMS) {
    if (fx >= item.x0 && fx < item.x1) {
      return item.id
    }
  }
  return null
}

export function landformById(id: LandformId): LandformDef {
  return LANDFORMS.find((item) => item.id === id)!
}
