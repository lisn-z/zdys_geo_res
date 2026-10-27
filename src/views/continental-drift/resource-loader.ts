/** Same-origin OSS proxy shared by development, preview and production. */
export const RESOURCE_BASE = '/geo-resources-folder/images/continental-drift'

export function resourceUrl(path: string): string {
  // Uploaded manifests may still contain the former public-directory prefix.
  const origin = globalThis.location.origin
  const source = new URL(path, `${origin}/`)
  const relative = source.pathname.replace(/^\/+/, '')
    .replace(/^(?:geo-resources-folder\/images\/)?continental-drift\//, '')
  // Absolute same-origin URLs also work inside the blob-based decoding Worker.
  return new URL(`${RESOURCE_BASE}/${relative}${source.search}`, origin).href
}

const requests = new Map<string, Promise<unknown>>()

/** Share successful loads across the main scene, comparison scene and retry attempts. */
export function loadResourceJson<T>(file: string): Promise<T> {
  const url = resourceUrl(`data/${file}`)
  const existing = requests.get(url)
  if (existing) return existing as Promise<T>
  const request = (async (): Promise<T> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`Lesson resource ${file}: HTTP ${response.status}`)
      return await response.json() as T
    } finally {
      clearTimeout(timeout)
    }
  })()
  requests.set(url, request)
  // A failed request must not poison the shared cache: the existing retry button can load it again.
  void request.catch(() => { if (requests.get(url) === request) requests.delete(url) })
  return request
}
