export const DYNASTIES = ['全部', '诗经', '汉魏', '唐', '宋', '元', '明清'] as const

export type Dynasty = (typeof DYNASTIES)[number]

export type GeographyProfile = {
  coordinate: string
  naturalRegion: string
  terrainStep: string
  landform: string
  basin: string
  climate: string
  spatialReading: string
  imageReading: string
  humanGeography: string
  deepAnalysis: string
  inquiry: string
}

export type Poem = {
  id: string
  title: string
  author: string
  dynasty: Exclude<Dynasty, '全部'>
  place: string
  longitude: number
  latitude: number
  lines: string[]
  note: string
  curriculum?: Array<'小学' | '初中' | '高中'>
  geography: GeographyProfile
}

let poemsRequest: Promise<Poem[]> | null = null

export const loadPoems = () => {
  if (!poemsRequest) {
    poemsRequest = fetch('/geo-resources-folder/json/poems.json').then(async (response) => {
      if (!response.ok) throw new Error(`诗词数据加载失败（${response.status}）`)
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('诗词数据格式不正确')
      return data as Poem[]
    })
  }
  return poemsRequest
}
