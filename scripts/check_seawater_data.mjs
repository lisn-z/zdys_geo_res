// Node 22.18+ and the project's installed TypeScript dependency.
// Run from any directory: node scripts/check_seawater_data.mjs [--root PROJECT]
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire, registerHooks } from 'node:module'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

const args = process.argv.slice(2)
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--root'), 'Usage: node check_seawater_data.mjs [--root PROJECT]')
const root = path.resolve(args[1] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const sourceDir = path.join(root, 'src', 'views', 'seawater-properties')
const publicDir = path.join(root, 'public')
const dataDir = path.join(publicDir, 'seawater-properties', 'woa23-quarter-degree')
// Match the app's TypeScript imports without adding .ts extensions to app code
// or generating compiled files inside the project. Limit hooks to this lesson.
const ts = createRequire(path.join(root, 'package.json'))('typescript')
const sourceUrl = pathToFileURL(`${sourceDir}${path.sep}`).href
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(sourceUrl) && specifier.startsWith('.') && !path.extname(specifier)) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceUrl) && url.endsWith('.ts')) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        fileName: fileURLToPath(url),
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText
      return { format: 'module', source, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
let manifest, loadOceanData, sampleField, extractContours, getContourLevels
try {
  ;({ oceanManifest: manifest } = await import(pathToFileURL(path.join(sourceDir, 'manifest.ts'))))
  ;({ loadOceanData, sampleField } = await import(pathToFileURL(path.join(sourceDir, 'data.ts'))))
  ;({ extractContours, getContourLevels } = await import(pathToFileURL(path.join(sourceDir, 'contours.ts'))))
} finally {
  hooks.deregister()
}
const properties = ['temperature', 'salinity', 'density']
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const originalFetch = globalThis.fetch
const requested = []
const progress = []
let failNextBinaryRequest = true, compressedResponses = 0, decodedResponses = 0

assert.equal(manifest.version, 1)
assert.equal(manifest.format, 'float32-le-gzip')
assert.deepEqual(manifest.depths, [0, 50, 200, 1000, 2000])
assert.deepEqual(manifest.grid, { width: 1440, height: 720, lonStart: -179.875, latStart: -89.875, lonStep: .25, latStep: .25 })
for (const property of properties) assert.equal(manifest.layers[property].length, manifest.depths.length)

globalThis.fetch = async (input, options) => {
  assert.equal(typeof input, 'string', 'Data loader should request local public resources')
  assert.ok(input.startsWith('/seawater-properties/woa23-quarter-degree/'), `Unexpected data request: ${input}`)
  assert.match(input, /\/[a-z]+-\d+m\.bin\.gz$/, 'The inline manifest must never trigger a manifest/data JSON request')
  options?.signal?.throwIfAborted()
  const relative = input.slice(1)
  const file = path.resolve(publicDir, relative)
  assert.ok(file.startsWith(`${path.resolve(dataDir)}${path.sep}`), 'Data request escaped its public directory')
  requested.push(input)
  if (failNextBinaryRequest) {
    // A rejected binary load must clear the cache so a subsequent retry works.
    failNextBinaryRequest = false
    return new Response(null, { status: 503 })
  }
  const bytes = await fs.readFile(file)
  options?.signal?.throwIfAborted()
  // Exercise both ordinary .gz responses and hosts that already decoded gzip.
  if (path.basename(file).startsWith('density-')) {
    decodedResponses++
    return new Response(gunzipSync(bytes), { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'gzip' } })
  }
  compressedResponses++
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/gzip' } })
}

try {
  await assert.rejects(loadOceanData(), /海水资料读取失败/)
  assert.ok(requested.length > 0 && requested.length <= 3, 'Failed workers must stop before the remaining fields are fetched')
  requested.length = 0; compressedResponses = 0; decodedResponses = 0
  const pending = loadOceanData((completed, total) => progress.push([completed, total]))
  assert.equal(loadOceanData(), pending, 'Concurrent callers must share one loading promise')
  const dataset = await pending
  assert.equal(await loadOceanData(), dataset, 'Completed data must be cached')
  assert.equal(requested.length, 15, 'Only fifteen binary fields should be fetched; the manifest is bundled TypeScript')
  assert.equal(new Set(requested).size, 15, 'Every field should be fetched once')
  assert.deepEqual(progress, Array.from({ length: 16 }, (_, i) => [i, 15]))
  assert.equal(compressedResponses, 10); assert.equal(decodedResponses, 5)
  assert.deepEqual(dataset.depths, manifest.depths)
  assert.deepEqual(dataset.metadata, manifest.metadata)

  let samples = 0, validSamples = 0, missingSamples = 0, deepMissing = 0, checkedBytes = 0
  const contourSummary = []
  for (const property of properties) {
    for (let depthIndex = 0; depthIndex < dataset.depths.length; depthIndex++) {
      const depth = dataset.depths[depthIndex], field = dataset.layers[property][depthIndex]
      const descriptor = manifest.layers[property][depthIndex]
      assert.equal(descriptor.depth, depth)
      assert.match(descriptor.file, /^[a-z]+-\d+m\.bin\.gz$/)
      const compressed = await fs.readFile(path.join(dataDir, descriptor.file))
      const raw = gunzipSync(compressed)
      assert.equal(compressed.byteLength, descriptor.gzipBytes)
      assert.equal(raw.byteLength, descriptor.bytes)
      assert.equal(sha256(compressed), descriptor.gzipSha256, `${descriptor.file}: compressed checksum`)
      assert.equal(sha256(raw), descriptor.sha256, `${descriptor.file}: raw Float32 checksum`)
      assert.equal(raw.byteLength, field.width * field.height * 4)
      checkedBytes += raw.byteLength
      assert.ok(field.values instanceof Float32Array)
      assert.equal(field.values.length, field.width * field.height)
      for (const key of Object.keys(manifest.grid)) assert.equal(field[key], manifest.grid[key])
      for (const key of ['units', 'source', 'date']) assert.equal(field[key], descriptor[key])
      const source = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
      const sourceHash = sha256(Buffer.from(field.values.buffer, field.values.byteOffset, field.values.byteLength))
      let validCount = 0, missingCount = 0, min = Infinity, max = -Infinity
      for (let index = 0; index < field.values.length; index++) {
        const original = source.getFloat32(index * 4, true), value = field.values[index]
        const lon = field.lonStart + (index % field.width) * field.lonStep
        const lat = field.latStart + Math.floor(index / field.width) * field.latStep
        const sample = sampleField(field, lon, lat)
        samples++
        if (Number.isFinite(original)) {
          if (value !== original || sample !== original) assert.fail(`${property} ${depth} m at index ${index}: original value changed`)
          validCount++; validSamples++
          min = Math.min(min, original); max = Math.max(max, original)
        } else {
          assert.ok(Number.isNaN(original) && Number.isNaN(value), 'Missing binary samples must be NaN, never Infinity or zero')
          if (sample !== null) assert.fail(`${property} ${depth} m at index ${index}: missing source read as a value`)
          missingCount++; missingSamples++
          // Inside the missing nearest-cell footprint, neighbouring data must
          // not turn a missing probe into an invented measurement.
          if (index % 997 === 0) assert.equal(sampleField(field, lon + field.lonStep * .2, lat + field.latStep * .2), null)
          if (depth === 2000 && Number.isFinite(dataset.layers[property][0].values[index])) {
            deepMissing++
            assert.equal(sample, null, 'Deep source gaps must not borrow surface values')
          }
        }
        if (property === 'density') {
          const bothValid = Number.isFinite(dataset.layers.temperature[depthIndex].values[index]) && Number.isFinite(dataset.layers.salinity[depthIndex].values[index])
          if (Number.isFinite(value) !== bothValid) assert.fail(`Density mask differs from T∩S at depth ${depth}, index ${index}`)
        }
      }
      assert.equal(validCount + missingCount, field.values.length)
      assert.ok(validCount > 400000 && validCount < 800000, 'Global source layers must contain both ocean and missing cells')
      const [low, high] = { temperature: [-3, 45], salinity: [0, 50], density: [990, 1045] }[property]
      assert.ok(min >= low && max <= high && min < max, `${property} ${depth} m: invalid physical range`)
      for (const lat of [-90, -89.875, -40, 0, 40, 89.875, 90]) {
        assert.equal(sampleField(field, -180, lat), sampleField(field, 180, lat), 'Date-line continuity')
        assert.equal(sampleField(field, 15, lat), sampleField(field, 375, lat), 'Periodic longitude')
      }
      for (const [lon, lat] of [[NaN, 0], [Infinity, 0], [0, NaN], [0, 91], [0, -91]]) assert.equal(sampleField(field, lon, lat), null)

      const levels = getContourLevels(property, depth)
      assert.ok(levels.length > 0 && levels.every(Number.isFinite))
      const contours = extractContours(field, levels, { mapLonStart: -30, maxLabelsPerLevel: 8 })
      let segmentCount = 0, labelCount = 0
      for (const line of contours) {
        assert.ok(levels.includes(line.value))
        assert.equal(line.segments.length % 4, 0)
        assert.ok(line.labels.length <= 8)
        segmentCount += line.segments.length / 4; labelCount += line.labels.length
        for (let i = 0; i < line.segments.length; i += 4) {
          const [x1, y1, x2, y2] = line.segments.subarray(i, i + 4)
          assert.ok([x1, y1, x2, y2].every(Number.isFinite))
          assert.ok(x1 >= -30.00001 && x1 <= 330.00001 && x2 >= -30.00001 && x2 <= 330.00001)
          assert.ok(Math.abs(x2 - x1) <= field.lonStep + .0001, 'Contour segment jumps across the map seam')
        }
        for (const label of line.labels) assert.ok([label.lon, label.lat, label.angle, label.length].every(Number.isFinite))
      }
      assert.ok(segmentCount > 0, `No source-derived ${property} contours at ${depth} m`)
      if (property === 'density' && depth === 2000) assert.ok(labelCount > 0, 'Deep density needs finer levels with readable values')
      assert.equal(sha256(Buffer.from(field.values.buffer, field.values.byteOffset, field.values.byteLength)), sourceHash, 'Sampling/contours mutated the source')
      contourSummary.push({ property, depth, segments: segmentCount, labels: labelCount })
    }
  }
  // Explicit missing-cell regression independent of real coastline complexity.
  const missingCell = { width: 2, height: 2, lonStart: 0, latStart: 0, lonStep: .25, latStep: .25, values: new Float32Array([0, 2, NaN, 2]) }
  assert.equal(extractContours(missingCell, [1])[0].segments.length, 0)
  assert.ok(deepMissing > 0, 'Test must encounter real surface-valid / 2000 m-missing cells')
  console.log(JSON.stringify({ result: 'PASS', resolution: manifest.metadata.resolution,
    fieldFiles: 15, checkedUncompressedBytes: checkedBytes, samples, validSamples, missingSamples,
    surfaceValidBut2000mMissing: deepMissing, sha256: 'all compressed and raw files verified',
    loading: '15 binary requests, no manifest request; progress, cache, failed-load retry, gzip and decoded responses verified',
    densityMask: 'temperature ∩ salinity', sourceArrays: 'unchanged', contours: contourSummary }, null, 2))
} finally {
  globalThis.fetch = originalFetch
}
