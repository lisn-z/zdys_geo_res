import { oceanManifest } from './manifest'

export type PropertyKey = 'temperature' | 'salinity' | 'density'

export interface GridField {
  width: number
  height: number
  lonStart: number
  latStart: number
  lonStep: number
  latStep: number
  values: (number | null)[] | Float32Array
  units: string
  source: string
  date: string
}

export interface OceanDataset {
  depths: number[]
  layers: Record<PropertyKey, GridField[]>
  metadata: {
    period: string
    resolution: string
    densityMethod: string
    description: string
  }
}

export const dataSources = [
  {
    id: 'temperature',
    name: 'NOAA WOA23 · 海水温度',
    url: 'https://www.ncei.noaa.gov/access/world-ocean-atlas-2023/',
    description: '1991—2020 年平均客观分析场；0.25° × 0.25°；0、50、200、1000、2000 m；温度单位 °C。',
  },
  {
    id: 'salinity',
    name: 'NOAA WOA23 · 实用盐度',
    url: 'https://doi.org/10.25923/70qt-9574',
    description: '与温度同期、同格网、同深度；PSS-78 实用盐度为无量纲数值，并非直接测得的盐质量百分比。',
  },
  {
    id: 'density',
    name: 'TEOS-10 · 计算位密度',
    url: 'https://www.teos-10.org/pubs/gsw/html/gsw_pot_rho_t_exact.html',
    description: '从同位置、同深度的温盐场计算，统一参考海压 0 dbar；单位 kg/m³。反映温盐作用，不含深层原位压缩增密。',
  },
  {
    id: 'terrain',
    name: 'Natural Earth / Open-Elevation',
    url: 'https://www.naturalearthdata.com/',
    description: '沿用已托管的大陆轮廓与陆地高程资料；地形高度作显示夸张。',
  },
] as const

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`教学资料加载失败（${response.status}）：${url}`)
  return response.json() as Promise<T>
}

function validateField(field: GridField | undefined, name: string): asserts field is GridField {
  if (
    !field || !Number.isInteger(field.width) || !Number.isInteger(field.height) ||
    field.width < 2 || field.height < 2 ||
    !Number.isFinite(field.lonStart) || !Number.isFinite(field.latStart) ||
    !Number.isFinite(field.lonStep) || !Number.isFinite(field.latStep) ||
    field.lonStep === 0 || field.latStep === 0 ||
    !(field.values instanceof Float32Array) || field.values.length !== field.width * field.height ||
    field.values.some((value) => !Number.isFinite(value) && !Number.isNaN(value))
  ) throw new Error(`海水资料格网无效：${name}`)
}

interface FieldFile {
  depth: number
  file: string
  bytes: number
  units: string
  source: string
  date: string
}
const DATA_ROOT = '/geo-resources-folder/data/seawater-properties/woa23-quarter-degree/'
let oceanPromise: Promise<OceanDataset> | undefined

export function loadOceanData(onProgress?: (completed: number, total: number) => void): Promise<OceanDataset> {
  if (!oceanPromise) {
    oceanPromise = fetchOceanFields(onProgress).catch((error) => {
      oceanPromise = undefined
      throw error
    })
  }
  return oceanPromise
}

async function fetchOceanFields(onProgress?: (completed: number, total: number) => void): Promise<OceanDataset> {
  // The small index is bundled TS; only the fifteen binary fields use HTTP.
  const manifest = oceanManifest
  if (manifest.version !== 1 || manifest.format !== 'float32-le-gzip' ||
    manifest.grid?.width !== 1440 || manifest.grid?.height !== 720 ||
    manifest.grid?.lonStep !== .25 || manifest.grid?.latStep !== .25 ||
    !Array.isArray(manifest.depths) || manifest.depths.join(',') !== '0,50,200,1000,2000' || !manifest.metadata?.densityMethod) {
    throw new Error('海水资料深度或来源信息无效')
  }
  const data: OceanDataset = { depths: [...manifest.depths], metadata: { ...manifest.metadata },
    layers: { temperature: [], salinity: [], density: [] } }
  const queue: { key: PropertyKey; index: number; file: FieldFile }[] = []
  for (const key of ['temperature', 'salinity', 'density'] as const) {
    if (manifest.layers?.[key]?.length !== data.depths.length) throw new Error(`海水资料层数无效：${key}`)
    manifest.layers[key].forEach((file, index) => queue.push({ key, index, file }))
  }
  let completed = 0, cursor = 0
  const controller = new AbortController()
  onProgress?.(completed, queue.length)
  // Three compressed layer requests at a time; avoid a huge JSON parse or
  // fifteen simultaneous decompression allocations on classroom tablets.
  async function worker() {
    while (!controller.signal.aborted && cursor < queue.length) {
      const { key, index, file } = queue[cursor++]!
      if (file.depth !== data.depths[index] || !/^[a-z]+-\d+m\.bin\.gz$/.test(file.file)) throw new Error('海水资料文件索引无效')
      const response = await fetch(`${DATA_ROOT}${file.file}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`海水资料读取失败：${file.file}`)
      let buffer = await response.arrayBuffer()
      const signature = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength))
      // Also accepts a host which already served Content-Encoding:gzip.
      if (signature[0] === 0x1f && signature[1] === 0x8b) {
        buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
      }
      if (buffer.byteLength !== file.bytes || buffer.byteLength !== manifest.grid.width * manifest.grid.height * 4) throw new Error(`海水资料文件长度无效：${file.file}`)
      if (controller.signal.aborted) return
      const values = new Float32Array(buffer)
      // Binary files are little-endian. Swap only on a big-endian host.
      if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1) {
        const view = new DataView(buffer)
        for (let i = 0; i < values.length; i++) values[i] = view.getFloat32(i * 4, true)
      }
      const field = { ...manifest.grid, units: file.units, source: file.source, date: file.date, values }
      validateField(field, `${key} ${file.depth} m`)
      data.layers[key][index] = field
      onProgress?.(++completed, queue.length)
    }
  }
  const workers = [worker(), worker(), worker()]
  try {
    await Promise.all(workers)
  } catch (error) {
    // Finish cancelling the old batch before a retry can start a new one.
    controller.abort()
    await Promise.allSettled(workers)
    throw error
  }
  return data
}

let worldPromise: Promise<{ countries: any; elevation: any }> | undefined

export function loadWorldData(): Promise<{ countries: any; elevation: any }> {
  if (!worldPromise) {
    const root = '/geo-resources-folder/images/ocean-atmosphere/'
    worldPromise = Promise.all([
      fetchJson<any>(`${root}world-countries.geojson`),
      fetchJson<any>(`${root}world-elevation.json`),
    ]).then(([countries, elevation]) => {
      if (countries?.type !== 'FeatureCollection' || !Array.isArray(countries.features)) throw new Error('大陆轮廓资料格式无效')
      if (!Array.isArray(elevation?.values) || elevation.values.length !== elevation.width * elevation.height) throw new Error('陆地高程资料格式无效')
      return { countries, elevation }
    }).catch((error) => {
      worldPromise = undefined
      throw error
    })
  }
  return worldPromise
}

/** Bilinear display sampling, retaining the nearest cell's land / missing-depth mask. */
export function sampleField(field: GridField, lon: number, lat: number): number | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lat < -90 || lat > 90) return null
  const cyclic = Math.abs(Math.abs(field.lonStep) * field.width - 360) < 0.001
  let x = (lon - field.lonStart) / field.lonStep
  let y = (lat - field.latStart) / field.latStep
  if (cyclic) x = ((x % field.width) + field.width) % field.width
  // Cell centers sit half a grid step inside the bounds, which reach the poles.
  if (y < -0.5 || y > field.height - 0.5 || (!cyclic && (x < -0.5 || x > field.width - 0.5))) return null
  y = Math.max(0, Math.min(field.height - 1, y))
  if (!cyclic) x = Math.max(0, Math.min(field.width - 1, x))
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
