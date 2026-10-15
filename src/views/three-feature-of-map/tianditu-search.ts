export interface AddressSearchResult {
  id: string
  name: string
  address: string
  lng: number
  lat: number
}

export interface AddressSearchResponse {
  items: AddressSearchResult[]
  suggestions: string[]
}

const resultLimit = 10
const timeoutMs = 12_000

class TiandituSearchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TiandituSearchError'
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function records(value: unknown): Record<string, unknown>[] {
  return (Array.isArray(value) ? value : [value])
    .map(record).filter((item): item is Record<string, unknown> => Boolean(item))
}

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function serviceError(description: string, code?: unknown): TiandituSearchError {
  if (/域名|domain|referer|origin/i.test(description)) {
    return new TiandituSearchError('天地图搜索的域名校验未通过，请检查当前环境密钥的允许域名。')
  }
  if (/密钥|key|token|权限|授权|permission|forbidden/i.test(description) || Number(code) === 403) {
    return new TiandituSearchError('天地图搜索授权失败，请检查当前环境密钥及地名搜索服务权限。')
  }
  if (/配额|限额|次数|频率|quota|limit/i.test(description) || Number(code) === 429) {
    return new TiandituSearchError('天地图搜索次数已达限制，请稍后重试。')
  }
  const codeLabel = /^\d+$/.test(String(code ?? '')) ? `（${String(code)}）` : ''
  return new TiandituSearchError(`天地图搜索暂不可用${codeLabel}，请稍后重试。`)
}

function coordinates(value: unknown): { lng: number, lat: number } | undefined {
  if (typeof value !== 'string') return undefined
  const parts = value.split(',').map(part => part.trim())
  if (parts.length !== 2 || parts.some(part => !part)) return undefined
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) return undefined
  return { lng, lat }
}

/** Parse provider coordinates as longitude, latitude; never infer a missing point. */
export function parseTiandituSearchResponse(value: unknown): AddressSearchResponse {
  const body = record(value)
  if (!body) throw new TiandituSearchError('天地图返回了无法识别的搜索结果，请稍后重试。')

  // The service documents status as JSON; deployments return an object or array.
  const status = records(body.status)[0]
  const infoCode = status?.infocode
  if (infoCode !== undefined && !['1000', '3001'].includes(String(infoCode))) {
    throw serviceError(string(status?.cndesc), infoCode)
  }
  // Authentication failures can be returned outside the normal search envelope.
  const gatewayCode = body.code
  if (gatewayCode !== undefined && !['0', '200', '1000'].includes(String(gatewayCode))) {
    throw serviceError(string(body.msg) || string(body.message), gatewayCode)
  }
  if (body.resultType === undefined && body.pois === undefined && body.area === undefined
    && body.suggests === undefined && body.statistics === undefined && String(infoCode) !== '3001') {
    throw serviceError(string(body.msg) || string(body.message) || string(status?.cndesc), gatewayCode)
  }

  const suggestions = new Set<string>()
  const addSuggestion = (value: unknown) => {
    const name = string(value)
    if (name && name !== '全球') suggestions.add(name)
  }
  const suggests = Array.isArray(body.suggests) ? body.suggests : []
  suggests.forEach(item => addSuggestion(typeof item === 'string' ? item : record(item)?.name))
  records(body.prompt).forEach(prompt => {
    // Type 2 reports an unsuccessful search in a region; it is not a suggestion.
    if (Number(prompt.type) === 2) return
    records(prompt.admins).forEach(admin => {
      const name = string(admin.adminName)
      const keyword = string(admin.keyword) || string(prompt.keyword) || string(body.keyword)
      if (name) addSuggestion(keyword ? (keyword.includes(name) ? keyword : `${name}${keyword}`) : name)
    })
  })
  // A broad query may return city statistics rather than actual address points.
  // Suggest a narrower search; do not disguise the city's centre as the POI.
  records(body.statistics).forEach(statistics => {
    records(statistics.priorityCitys).concat(records(statistics.allAdmins)).forEach(admin => {
      const name = string(admin.name)
      const keyword = string(body.keyword)
      if (name) addSuggestion(keyword ? (keyword.includes(name) ? keyword : `${name}${keyword}`) : name)
    })
  })

  const items: AddressSearchResult[] = []
  const seen = new Set<string>()
  const source = Number(body.resultType) === 3 ? records(body.area) : records(body.pois)
  source.forEach(item => {
    const point = coordinates(item.lonlat)
    const name = string(item.name)
    if (!point || !name || items.length >= resultLimit) return
    const identity = `${name}:${point.lng},${point.lat}`
    if (seen.has(identity)) return
    seen.add(identity)
    const regions = [...new Set([item.province, item.city, item.county].map(string).filter(Boolean))].join('')
    items.push({
      id: string(item.hotPointID) || string(item.adminCode) || identity,
      name,
      address: string(item.address) || regions || (Number(body.resultType) === 3 ? '行政区中心' : ''),
      ...point,
    })
  })
  return { items, suggestions: [...suggestions].slice(0, resultLimit) }
}

function abortError(): Error {
  const error = new Error('搜索已取消')
  error.name = 'AbortError'
  return error
}

export async function searchTiandituAddresses(
  keyword: string,
  key: string,
  options: { signal?: AbortSignal } = {},
): Promise<AddressSearchResponse> {
  if (options.signal?.aborted) throw abortError()
  const term = keyword.trim()
  if (!term) throw new TiandituSearchError('请输入要搜索的地址或地点名称。')
  if (!key.trim()) throw new TiandituSearchError('尚未配置当前环境的天地图密钥。')

  // Official V2 place search: https://lbs.tianditu.gov.cn/server/search2.html
  // A full-world bound avoids restricting address searches to the current map.
  const params = new URLSearchParams({
    postStr: JSON.stringify({ keyWord: term, queryType: 7, mapBound: '-180,-90,180,90', level: 12, start: 0, count: resultLimit, show: 2 }),
    type: 'query',
    tk: key,
  })
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onAbort, { once: true })
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(`https://api.tianditu.gov.cn/v2/search?${params}`, { signal: controller.signal })
    if (!response.ok) throw serviceError('', response.status)
    let data: unknown
    try {
      data = await response.json()
    } catch (error) {
      if (controller.signal.aborted) throw error
      throw new TiandituSearchError('天地图返回了无法识别的搜索结果，请稍后重试。')
    }
    if (controller.signal.aborted) throw abortError()
    return parseTiandituSearchResponse(data)
  } catch (error) {
    if (options.signal?.aborted) throw abortError()
    if (timedOut) throw new TiandituSearchError('地址搜索超时，请稍后重试。')
    if (error instanceof TiandituSearchError) throw error
    throw new TiandituSearchError('无法连接天地图搜索，请检查网络或当前域名的访问权限。')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', onAbort)
  }
}
