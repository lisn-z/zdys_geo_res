export type ClimateScenario = 'normal' | 'elnino' | 'lanina'

export interface ClimateField {
  width: number
  height: number
  lonStart: number
  latStart: number
  lonStep: number
  latStep: number
  values: (number | null)[]
  units: string
  source: string
  date: string
  baseline?: string
}

export interface ClimateSnapshot {
  sst: ClimateField
  pressure: ClimateField
  anomaly?: ClimateField
}

export const dataSources = [
  {
    id: 'sst',
    name: 'NOAA ERSST v5',
    description: '历史月平均海表温度分析，2° × 2°；距平相对 1971—2000 年同期平均。',
    url: 'https://www.ncei.noaa.gov/products/extended-reconstructed-sst',
  },
  {
    id: 'pressure',
    name: 'NCEP/NCAR Reanalysis 1',
    description: '历史月平均海平面气压再分析，2.5° × 2.5°；单位 hPa。',
    url: 'https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.html',
  },
  {
    id: 'terrain',
    name: 'Natural Earth / Open-Elevation',
    description: '大陆轮廓与 2° 陆地高程资料；为便于观察山地起伏，地形高度作适度夸张。',
    url: 'https://www.naturalearthdata.com/',
  },
] as const

export const climateDates: Record<ClimateScenario, string> = {
  normal: '2013-12',
  elnino: '2015-12',
  lanina: '2010-12',
}

export function oceanAsset(filename: string): string {
  return `/geo-resources-folder/images/ocean-atmosphere/${filename}`
}

async function fetchJson<T>(filename: string): Promise<T> {
  const response = await fetch(oceanAsset(filename))
  if (!response.ok) throw new Error(`教学资料加载失败：${filename}（${response.status}）`)
  return response.json() as Promise<T>
}

function validateField(field: ClimateField | undefined, name: string): asserts field is ClimateField {
  if (
    !field || !Number.isInteger(field.width) || !Number.isInteger(field.height) ||
    field.width < 2 || field.height < 2 || !Number.isFinite(field.lonStep) ||
    !Number.isFinite(field.latStep) || field.lonStep === 0 || field.latStep === 0 ||
    !Array.isArray(field.values) || field.values.length !== field.width * field.height
  ) throw new Error(`教学资料格网无效：${name}`)
}

let climatePromise: Promise<Record<ClimateScenario, ClimateSnapshot>> | undefined

export function loadClimateData(): Promise<Record<ClimateScenario, ClimateSnapshot>> {
  if (!climatePromise) {
    climatePromise = fetchJson<Record<ClimateScenario, ClimateSnapshot>>('climate-snapshots.json')
      .then((data) => {
        for (const scenario of ['normal', 'elnino', 'lanina'] as const) {
          validateField(data[scenario]?.sst, `${scenario} SST`)
          validateField(data[scenario]?.pressure, `${scenario} SLP`)
          validateField(data[scenario]?.anomaly, `${scenario} SSTA`)
        }
        return data
      })
      .catch((error) => {
        climatePromise = undefined
        throw error
      })
  }
  return climatePromise
}

let worldPromise: Promise<{ countries: any; elevation: any }> | undefined

export function loadWorldData(): Promise<{ countries: any; elevation: any }> {
  if (!worldPromise) {
    worldPromise = Promise.all([
      fetchJson<any>('world-countries.geojson'),
      fetchJson<any>('world-elevation.json'),
    ]).then(([countries, elevation]) => {
      if (countries?.type !== 'FeatureCollection' || !Array.isArray(countries.features)) {
        throw new Error('大陆轮廓资料格式无效')
      }
      if (elevation?.values?.length !== elevation?.width * elevation?.height) {
        throw new Error('陆地高程资料格式无效')
      }
      return { countries, elevation }
    }).catch((error) => {
      worldPromise = undefined
      throw error
    })
  }
  return worldPromise
}

/** Bilinear geographic sampling; preserve the nearest cell's land/no-data mask. */
export function sampleField(field: ClimateField, lon: number, lat: number): number | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
  const cyclic = Math.abs(Math.abs(field.lonStep) * field.width - 360) < 0.001
  let x = (lon - field.lonStart) / field.lonStep
  const y = (lat - field.latStart) / field.latStep
  if (cyclic) x = ((x % field.width) + field.width) % field.width
  if (y < 0 || y > field.height - 1 || (!cyclic && (x < 0 || x > field.width - 1))) return null
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = cyclic ? (x0 + 1) % field.width : Math.min(x0 + 1, field.width - 1)
  const y1 = Math.min(y0 + 1, field.height - 1)
  const nearestX = cyclic ? Math.round(x) % field.width : Math.round(x)
  const nearest = field.values[Math.round(y) * field.width + nearestX]
  if (nearest == null || !Number.isFinite(nearest)) return null
  const dx = x - x0
  const dy = y - y0
  const samples: [number | null | undefined, number][] = [
    [field.values[y0 * field.width + x0], (1 - dx) * (1 - dy)],
    [field.values[y0 * field.width + x1], dx * (1 - dy)],
    [field.values[y1 * field.width + x0], (1 - dx) * dy],
    [field.values[y1 * field.width + x1], dx * dy],
  ]
  let total = 0
  let weight = 0
  for (const [value, part] of samples) {
    if (value != null && Number.isFinite(value) && part > 0) {
      total += value * part
      weight += part
    }
  }
  return weight > 0 ? total / weight : nearest
}
