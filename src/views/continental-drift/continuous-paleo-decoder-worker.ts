/// <reference lib="webworker" />

type DecodeRequest = { id: number; url: string }
const worker = self as unknown as DedicatedWorkerGlobalScope
const queue: DecodeRequest[] = []
let processing: Promise<void> | null = null

/** PNG decoding / channel compaction stays off the rendering thread. */
async function decode({ id, url }: DecodeRequest): Promise<void> {
  let bitmap: ImageBitmap | undefined
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Coast field ${response.status}: ${url}`)
    bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
    const { width, height } = bitmap
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Cannot decode the coast field')
    context.drawImage(bitmap, 0, 0)
    bitmap.close(); bitmap = undefined
    const source = context.getImageData(0, 0, width, height).data
    const data = new Uint8Array(width * height * 2)
    for (let row = 0; row < height; row += 1) {
      let input = row * width * 4
      let output = (height - 1 - row) * width * 2
      const end = input + width * 4
      // Flip north-first PNG rows once: DataTexture row zero means UV v=0, i.e. south.
      for (; input < end; input += 4) {
        data[output++] = source[input]!
        data[output++] = source[input + 1]!
      }
    }
    canvas.width = canvas.height = 1
    worker.postMessage({ id, width, height, buffer: data.buffer }, [data.buffer])
  } catch (value) {
    bitmap?.close()
    worker.postMessage({ id, error: value instanceof Error ? value.message : String(value) })
  }
}

worker.addEventListener('message', (event: MessageEvent<DecodeRequest>) => {
  queue.push(event.data)
  // At most one full RGBA decode buffer lives here. During fast scrubbing, serve the
  // most recent requested coast first instead of making it wait behind stale seeks.
  processing ??= (async () => {
    while (queue.length) await decode(queue.pop()!)
  })().finally(() => { processing = null })
  return processing
})

export {}
