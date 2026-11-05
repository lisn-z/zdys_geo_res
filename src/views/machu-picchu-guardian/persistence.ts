import type { InvestigationNote, PhotoRecord, PlayerRecord, SiteId } from './types'

const DATABASE = 'machu-picchu-guardian'
const STORE = 'records'
const RECORD_KEY = 'player'
const FALLBACK_KEY = 'machu-picchu-guardian:record:v1'
const SITE_IDS: SiteId[] = ['viewpoint', 'archives', 'terrace', 'drain', 'plaza', 'station']
const MAX_PHOTOS = 6
let pending: Promise<unknown> = Promise.resolve()

function sequential<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation, operation)
  pending = next.catch(() => undefined)
  return next
}

export function createEmptyRecord(): PlayerRecord {
  const notes = {} as Record<SiteId, InvestigationNote>
  for (const id of SITE_IDS) notes[id] = { observation: '', cause: '', source: '' }
  return {
    version: 1, name: '', visited: [], notes, photos: [],
    proposal: { priority: '', measures: '', tradeoffs: '', evaluation: '' },
    reflection: '', introSeen: false, currentSite: 'viewpoint', updatedAt: new Date().toISOString(),
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
const string = (value: unknown): string => typeof value === 'string' ? value : ''
const siteId = (value: unknown): value is SiteId => typeof value === 'string' && SITE_IDS.includes(value as SiteId)
function date(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback
}
function jpeg(value: unknown): value is string {
  // A camera image must remain local. External URLs and SVG data cannot enter
  // the report renderer through a damaged or manually edited saved record.
  if (typeof value !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false
  const data = value.slice(23)
  return data.length % 4 === 0 && data.startsWith('/9j/')
}

function normalize(value: unknown, saving = false): PlayerRecord {
  const raw = object(value)
  if (!raw) throw new Error('本地记录格式损坏，无法恢复。请保留当前内容，或在确认后清除旧记录。')
  if (raw.version !== undefined && raw.version !== 0 && raw.version !== 1) throw new Error('这份记录来自其他版本，当前游戏无法读取；旧记录尚未被覆盖。')
  const result = createEmptyRecord()
  result.name = string(raw.name)
  result.updatedAt = date(raw.updatedAt, result.updatedAt)
  result.currentSite = siteId(raw.currentSite) ? raw.currentSite : 'viewpoint'
  result.introSeen = raw.introSeen === true
  result.visited = Array.isArray(raw.visited) ? [...new Set(raw.visited.filter(siteId))] : []
  const notes = object(raw.notes)
  for (const id of SITE_IDS) {
    const note = object(notes?.[id])
    if (note) result.notes[id] = { observation: string(note.observation), cause: string(note.cause), source: string(note.source) }
    // Early drafts could store a single observation string per location.
    else if (typeof notes?.[id] === 'string') result.notes[id].observation = notes[id] as string
  }
  const proposal = object(raw.proposal)
  if (proposal) for (const key of ['priority', 'measures', 'tradeoffs', 'evaluation'] as const) result.proposal[key] = string(proposal[key])
  result.reflection = string(raw.reflection)
  if (Array.isArray(raw.photos)) {
    if (saving && raw.photos.length > MAX_PHOTOS) throw new Error('一份记录最多保存 6 张照片，请先删除不需要的照片。')
    const seen = new Set<string>()
    for (const [index, candidate] of raw.photos.entries()) {
      const photo = object(candidate)
      if (!photo || !jpeg(photo.data) || !siteId(photo.site)) {
        if (saving) throw new Error('照片格式不完整，未覆盖原存档。请重新拍摄该照片后再保存。')
        continue
      }
      if (result.photos.length >= MAX_PHOTOS) break
      let id = string(photo.id) || `recovered-${photo.site}-${index}`
      if (seen.has(id)) id = `${id}-${index}`
      seen.add(id)
      const restored: PhotoRecord = { id, data: photo.data, site: photo.site, caption: string(photo.caption), createdAt: date(photo.createdAt, result.updatedAt) }
      result.photos.push(restored)
    }
  }
  return result
}

function storageError(error: unknown, action: '保存' | '读取' | '清除'): Error {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  if (name === 'QuotaExceededError') return new Error('浏览器本地存储空间不足，记录没有保存成功。请先导出当前记录，或减少照片后重试。')
  if (name === 'SecurityError' || name === 'NotAllowedError') return new Error(`浏览器不允许${action}本地记录。请检查该网站的存储权限；当前页面里的内容仍可导出。`)
  return error instanceof Error ? error : new Error(`本地记录${action}失败，请重试。`)
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    let factory: IDBFactory | undefined
    try { factory = globalThis.indexedDB } catch { resolve(null); return }
    if (!factory) { resolve(null); return }
    let request: IDBOpenDBRequest, settled = false
    try { request = factory.open(DATABASE, 1) } catch (error) {
      const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
      if (name === 'SecurityError' || name === 'NotSupportedError') resolve(null)
      else reject(error)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => {
      const db = request.result
      if (settled) { db.close(); return }
      settled = true
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => {
      if (settled) return
      settled = true
      if (request.error?.name === 'SecurityError' || request.error?.name === 'NotSupportedError') resolve(null)
      else reject(request.error ?? new Error('无法打开本地记录库。'))
    }
    request.onblocked = () => {
      if (settled) return
      settled = true
      reject(new Error('其他页面正在使用旧版记录库。请关闭同一游戏的其他标签页后重试。'))
    }
  })
}

function transaction<T>(db: IDBDatabase, mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction, request: IDBRequest<T>
    try { tx = db.transaction(STORE, mode); request = execute(tx.objectStore(STORE)) }
    catch (error) { db.close(); reject(error); return }
    tx.oncomplete = () => { db.close(); resolve(request.result) }
    tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? new Error('本地存储操作未完成。')) }
    tx.onerror = () => { /* The transaction's abort handler preserves the original error. */ }
  })
}

function readFallback(): unknown | null {
  const data = globalThis.localStorage.getItem(FALLBACK_KEY)
  if (data === null) return null
  try { return JSON.parse(data) as unknown } catch { throw new Error('本地记录内容损坏，无法解析。原记录仍保留，请确认后再清除。') }
}

export function loadRecord(): Promise<PlayerRecord | null> {
  return sequential(async () => {
    try {
      const db = await openDatabase()
      const stored = db ? await transaction(db, 'readonly', store => store.get(RECORD_KEY)) : readFallback()
      // Explicit null is a clear marker. Do not resurrect an older fallback
      // when its removal was blocked by the browser's localStorage policy.
      if (db && stored === null) return null
      if (stored !== undefined && stored !== null) return normalize(stored)
      // A previous session may have used the fallback before IndexedDB became
      // available. Its data is migrated on the next successful save.
      let fallback: unknown | null = null
      if (db) { try { fallback = readFallback() } catch (error) { if (!(error instanceof DOMException && error.name === 'SecurityError')) throw error } }
      return fallback === null ? null : normalize(fallback)
    } catch (error) { throw storageError(error, '读取') }
  })
}

export function saveRecord(record: PlayerRecord): Promise<void> {
  // Snapshot immediately so rapid autosaves cannot all serialize the last Vue
  // reactive state. Normalization creates plain objects without proxy references.
  let snapshot: PlayerRecord
  try { snapshot = normalize(record, true) } catch (error) { return Promise.reject(error) }
  return sequential(async () => {
    try {
      const db = await openDatabase()
      if (db) {
        await transaction(db, 'readwrite', store => store.put(snapshot, RECORD_KEY))
        try { globalThis.localStorage.removeItem(FALLBACK_KEY) } catch { /* IndexedDB already committed the whole record. */ }
      } else {
        // setItem is atomic. Quota failure keeps the preceding complete record;
        // photos are never silently discarded to make a partial save succeed.
        globalThis.localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot))
      }
    } catch (error) { throw storageError(error, '保存') }
  })
}

export function clearRecord(): Promise<void> {
  return sequential(async () => {
    try {
      const db = await openDatabase()
      if (db) await transaction(db, 'readwrite', store => store.put(null, RECORD_KEY))
      try { globalThis.localStorage.removeItem(FALLBACK_KEY) } catch (error) { if (!db) throw error }
    } catch (error) { throw storageError(error, '清除') }
  })
}
