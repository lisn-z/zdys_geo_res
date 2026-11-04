<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { HYDRATE_REGIONS, SOUTH_CHINA_SEA_PIXEL, type DistributionKind } from './distribution-data'

const emit = defineEmits<{ record: [observation: string] }>()
const mapUrl = `/geo-resources-folder/images/deep-sea-hydrates/distribution-textbook.svg`
const IMAGE_WIDTH = 1142, IMAGE_HEIGHT = 634, MAX_ZOOM = 1.5
const imageBounds = L.latLngBounds([[0, 0], [IMAGE_HEIGHT, IMAGE_WIDTH]])
const mapHost = ref<HTMLElement>()
const located = ref(false)
const imageFailed = ref(false)
const imageReady = ref(false)
const highlightedKind = ref<DistributionKind | null>(null)
const answerOpen = ref<string | null>(null)
const observation = ref('')
const savedObservation = ref('')
const saved = computed(() => Boolean(savedObservation.value) && savedObservation.value === observation.value.trim())
const questions = [
  { id: 'distribution', title: '图中的海洋标记常出现在什么位置？', answer: '教材图上，许多海洋标记靠近大陆边缘；不同海域都有分布。注意图中也有陆地区域的标记。标记多少不能直接用来比较储量。' },
  { id: 'evidence', title: '橙色标记是否说明已经发现可燃冰？', answer: '不能这样判断。按教材图例，橙色表示“推测的可燃冰”，蓝色表示“已发现的可燃冰”。两种信息要区分，也不能把“已发现”直接理解为已经具备开采条件。' },
]
let map: L.Map | null = null
let textbookImage: L.ImageOverlay | null = null
let highlights: Record<DistributionKind, L.LayerGroup> | null = null
let selectionRing: L.CircleMarker | null = null
let southChinaMarker: L.CircleMarker | null = null
let observer: ResizeObserver | null = null
let resizeFrame = 0
let fitZoom = -1
let disposed = false
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Preserve the printed projection. sourcePixel uses the crop's top-left origin;
// CRS.Simple uses [northing, easting], with northing increasing upwards.
const sourceLocation = ([x, y]: readonly [number, number]) => L.latLng(IMAGE_HEIGHT - y, x)

function makePopup(kind: DistributionKind, region: string, sourceNote?: string) {
  const wrapper = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = region
  const detail = document.createElement('p')
  detail.textContent = `教材图例：${kind === 'known' ? '已发现的可燃冰' : '推测的可燃冰'}`
  const note = document.createElement('p')
  note.className = 'hd-popup-note'
  note.textContent = sourceNote ? `${sourceNote} 教材分布示意，不表示精确勘探坐标。` : '教材分布示意，不表示精确勘探坐标。'
  wrapper.append(title, detail, note)
  return wrapper
}
function updateFitZoom() {
  if (!map) return
  // Lower the old minimum before measuring a smaller, rotated viewport.
  map.setMinZoom(-5)
  fitZoom = Math.min(MAX_ZOOM, map.getBoundsZoom(imageBounds, false, L.point(24, 24)))
  map.setMinZoom(fitZoom)
}
function loadTextbookImage() {
  if (!map) return
  imageFailed.value = false; imageReady.value = false
  textbookImage?.off(); textbookImage?.remove()
  textbookImage = L.imageOverlay(mapUrl, imageBounds, {
    interactive: false, opacity: 1,
    alt: '世界可燃冰分布示意，蓝色表示已发现，橙色表示推测，教材第78页图3-38。',
  })
  textbookImage.on('load', () => { if (!disposed) imageReady.value = true })
  textbookImage.on('error', () => { if (!disposed) imageFailed.value = true })
  textbookImage.addTo(map)
  // The bitmap itself contains all original symbols; only transparent targets
  // and optional rings are added, so neither symbols nor shorelines are redrawn.
  textbookImage.bringToBack()
}
function initMap() {
  if (!mapHost.value || disposed) return
  map = L.map(mapHost.value, {
    crs: L.CRS.Simple, center: imageBounds.getCenter(), zoom: -1,
    minZoom: -5, maxZoom: MAX_ZOOM, zoomControl: false, attributionControl: false,
    maxBounds: imageBounds.pad(.08), maxBoundsViscosity: .85,
    scrollWheelZoom: true, wheelPxPerZoomLevel: 110, zoomSnap: .125, zoomDelta: .5,
    worldCopyJump: false, bounceAtZoomLimits: false,
  })
  L.control.zoom({ position: 'bottomright', zoomInTitle: '放大分布图', zoomOutTitle: '缩小分布图' }).addTo(map)
  loadTextbookImage()
  highlights = { known: L.layerGroup(), inferred: L.layerGroup() }
  for (const point of HYDRATE_REGIONS) {
    const location = sourceLocation(point.sourcePixel)
    const status = point.kind === 'known' ? '已发现' : '推测'
    const target = L.marker(location, {
      icon: L.divIcon({ className: 'hd-source-hotspot', iconSize: [16, 16], iconAnchor: [8, 8], html: '<span class="hd-hit-target"></span>' }),
      title: `${point.region}：${status}的可燃冰（教材示意）`, alt: `${point.region}，${status}的可燃冰`, keyboard: true,
    }).bindPopup(makePopup(point.kind, point.region, point.sourceNote), { className: 'hd-region-popup', maxWidth: 260, minWidth: 190 }).addTo(map)
    target.on('popupopen', () => {
      if (!map) return
      selectionRing?.remove()
      selectionRing = L.circleMarker(location, { radius: 10, weight: 2, color: '#285e58', fill: false, interactive: false }).addTo(map)
    })
    target.on('popupclose', () => { selectionRing?.remove(); selectionRing = null })
    L.circleMarker(location, {
      radius: 7, weight: 1.5, color: point.kind === 'known' ? '#1f6c9c' : '#ba5f21',
      opacity: .8, fill: false, interactive: false,
    }).addTo(highlights[point.kind])
  }
  updateFitZoom()
  map.setView(imageBounds.getCenter(), fitZoom, { animate: false })
  observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (!map || !mapHost.value?.getBoundingClientRect().width) return
      const center = map.getCenter(), level = map.getZoom()
      const wasOverview = !located.value && Math.abs(level - fitZoom) < .15
      map.invalidateSize({ animate: false, pan: false })
      updateFitZoom()
      map.setView(wasOverview ? imageBounds.getCenter() : center, wasOverview ? fitZoom : Math.max(fitZoom, level), { animate: false })
    })
  })
  observer.observe(mapHost.value)
}
function highlightKind(kind: DistributionKind) {
  const next = highlightedKind.value === kind ? null : kind
  highlightedKind.value = next
  if (!map || !highlights) return
  highlights.known.remove(); highlights.inferred.remove()
  if (next) highlights[next].addTo(map)
}
function resetMap() {
  located.value = false
  southChinaMarker?.remove(); southChinaMarker = null
  selectionRing?.remove(); selectionRing = null
  map?.closePopup()
  map?.flyTo(imageBounds.getCenter(), fitZoom, { animate: !reduceMotion(), duration: .7 })
}
function locateSouthChinaSea() {
  if (!map || !imageReady.value) return
  located.value = true
  const location = sourceLocation(SOUTH_CHINA_SEA_PIXEL)
  if (!southChinaMarker) southChinaMarker = L.circleMarker(location, {
    radius: 13, color: '#a55a36', weight: 2.5, fill: false, interactive: false,
  }).bindTooltip('中国南海可燃冰试采地（教材标注）', { permanent: true, direction: 'top', className: 'hd-location-label', offset: [0, -14] }).addTo(map)
  map.closePopup()
  map.flyTo(location, Math.min(MAX_ZOOM, fitZoom + 1.5), { animate: !reduceMotion(), duration: .9 })
}
function record() {
  const text = observation.value.trim()
  if (!text) return
  emit('record', text)
  savedObservation.value = text
}
onMounted(() => {
  // The parent opens its modal after mounting this child: wait for a real size.
  const whenVisible = () => {
    if (disposed) return
    const bounds = mapHost.value?.getBoundingClientRect()
    if (!bounds || bounds.width < 1 || bounds.height < 1) {
      resizeFrame = requestAnimationFrame(whenVisible)
      return
    }
    initMap()
  }
  resizeFrame = requestAnimationFrame(whenVisible)
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  cancelAnimationFrame(resizeFrame)
  textbookImage?.off()
  map?.remove()
  map = null; textbookImage = null; highlights = null; selectionRing = null; southChinaMarker = null
})
</script>

<template>
  <section class="hy-distribution" aria-label="世界可燃冰分布读图">
    <div class="hd-map-tools" role="group" aria-label="分布图观察工具">
      <button type="button" class="hd-location" :aria-pressed="located" :disabled="!imageReady"
        @click="locateSouthChinaSea">定位南海试采地</button>
      <button type="button" :disabled="!imageReady" @click="resetMap">复位视野</button>
    </div>
    <div ref="mapHost" class="hd-map-viewport" aria-label="可拖动、缩放的教材世界可燃冰分布图" />
    <div v-if="imageFailed" class="hd-map-error" role="status"><span>分布图暂时未能加载。</span><button type="button"
        @click="loadTextbookImage">重新加载</button></div>
    <p v-else-if="!imageReady" class="hd-loading" role="status">正在加载分布图…</p>
    <div class="hd-legend" role="group" aria-label="教材分布图例，点击突出对应标记">
      <button type="button" :aria-pressed="highlightedKind === 'known'" :disabled="!imageReady"
        @click="highlightKind('known')">
        <svg class="hd-known" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2v16M2 10h16M4.3 4.3l11.4 11.4M4.3 15.7 15.7 4.3" />
        </svg>
        已发现的可燃冰<span>{{ highlightedKind === 'known' ? '已突出' : '突出显示' }}</span>
      </button>
      <button type="button" :aria-pressed="highlightedKind === 'inferred'" :disabled="!imageReady"
        @click="highlightKind('inferred')">
        <svg class="hd-inferred" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 2v16M2 10h16M4.3 4.3l11.4 11.4M4.3 15.7 15.7 4.3" />
        </svg>
        推测的可燃冰<span>{{ highlightedKind === 'inferred' ? '已突出' : '突出显示' }}</span>
      </button>
    </div>
    <p v-if="located" class="hd-location-note" role="status">已找到教材标注的中国南海试采地。圆圈用于帮助读图，不表示试采井的精确坐标。</p>
    <p class="hd-source">图源：上海地理六年级上册第 78 页图 3-38。分布符号为教材示意，不表示精确勘探坐标或资源储量。</p>
    <div class="hd-reading">
      <h3>带着问题读图</h3>
      <div v-for="question in questions" :key="question.id" class="hd-question">
        <button type="button" :aria-expanded="answerOpen === question.id"
          :aria-controls="`hydrate-map-answer-${question.id}`"
          @click="answerOpen = answerOpen === question.id ? null : question.id">
          <span>{{ question.title }}</span><span aria-hidden="true">{{ answerOpen === question.id ? '−' : '＋' }}</span>
        </button>
        <p v-show="answerOpen === question.id" :id="`hydrate-map-answer-${question.id}`">{{ question.answer }}</p>
      </div>
    </div>
    <div class="hd-record">
      <label for="hydrate-map-observation">我的读图发现</label>
      <textarea id="hydrate-map-observation" v-model="observation" maxlength="400" rows="3"
        placeholder="写下你的发现：两种标记有什么区别？南海试采地在哪里？" />
      <div>
        <p role="status">{{ saved ? '已加入学习记录，可在建议书中使用。' : '把观察到的信息作为提出开采建议的依据。' }}</p>
        <button type="button" class="hd-record-button" :disabled="!observation.trim() || saved" @click="record">{{ saved
          ? '已记录' : '记录读图发现' }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hy-distribution {
  color: #254b52;
  font: 14px/1.7 "PingFang SC", "Microsoft YaHei", sans-serif;
}

.hy-distribution *,
.hy-distribution *::before,
.hy-distribution *::after {
  box-sizing: border-box;
}

.hy-distribution button,
.hy-distribution button * {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.hy-distribution button {
  min-height: 40px;
  border: 1px solid #c6d7cd;
  border-radius: 7px;
  background: #f6f8ef;
  color: #315c53;
  padding: 7px 13px;
  font: inherit;
  line-height: 1.4;
  cursor: pointer;
  touch-action: manipulation;
}

.hy-distribution button:hover:not(:disabled) {
  background: #e5efe4;
  border-color: #79a493;
  color: #315c53;
}

.hy-distribution button:disabled {
  opacity: .5;
  cursor: default;
}

.hy-distribution button:focus-visible,
.hy-distribution textarea:focus-visible,
.hy-distribution .hd-map-viewport:focus-visible {
  outline: 3px solid #398e99;
  outline-offset: 3px;
}

.hy-distribution .hd-map-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.hy-distribution button.hd-location {
  border-color: #518b78;
  background: #e7f0e3;
  color: #315c53;
}

.hy-distribution button.hd-location:hover:not(:disabled) {
  border-color: #3f7c67;
  background: #dbe9d7;
  color: #254f43;
}

.hy-distribution button.hd-location[aria-pressed="true"] {
  background: #327462;
  border-color: #327462;
  color: #fffef8;
}

.hy-distribution button.hd-location[aria-pressed="true"]:hover:not(:disabled) {
  background: #245d4d;
  border-color: #245d4d;
  color: #fffef8;
}

.hy-distribution .hd-map-viewport {
  height: clamp(330px, 50dvh, 520px);
  overflow: hidden;
  isolation: isolate;
  position: relative;
  z-index: 0;
  border: 1px solid #c7d8d5;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
}

.hy-distribution .hd-map-viewport :deep(.leaflet-image-layer) {
  max-width: none;
  max-height: none;
  user-select: none;
  -webkit-user-drag: none;
}

.hy-distribution .hd-map-viewport :deep(.leaflet-control-zoom) {
  border: 1px solid #9bb7b9;
  box-shadow: 0 2px 7px #18383d25;
}

.hy-distribution .hd-map-viewport :deep(.leaflet-control-zoom a) {
  display: block;
  width: 38px;
  height: 38px;
  padding: 0;
  background: #fffef8;
  color: #254b52;
  border-color: #c5d8d6;
  font: bold 23px/38px Arial, sans-serif;
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.hy-distribution .hd-map-viewport :deep(.leaflet-control-zoom a:hover) {
  background: #e4f0e9;
  color: #193f40;
}

.hy-distribution .hd-map-viewport :deep(.leaflet-control-zoom a.leaflet-disabled),
.hy-distribution .hd-map-viewport :deep(.leaflet-control-zoom a.leaflet-disabled:hover) {
  color: #a4b2ad;
  background: #fffef8;
  cursor: default;
}

.hy-distribution .hd-map-viewport :deep(.leaflet-control-zoom a:focus-visible) {
  outline: 3px solid #398e99;
  outline-offset: 2px;
}

.hy-distribution .hd-map-viewport :deep(.hd-source-hotspot) {
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.hy-distribution .hd-map-viewport :deep(.hd-source-hotspot .hd-hit-target) {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 50%;
  background: transparent;
}

.hy-distribution .hd-map-viewport :deep(.hd-source-hotspot:focus-visible) {
  outline: 2px solid #285e58;
  outline-offset: 2px;
}

.hy-distribution .hd-map-viewport :deep(.hd-region-popup .leaflet-popup-content-wrapper) {
  background: #fffef9;
  color: #254b52;
  border: 1px solid #b6cbd0;
  border-radius: 9px;
  box-shadow: 0 4px 18px #1b485333;
}

.hy-distribution .hd-map-viewport :deep(.hd-region-popup .leaflet-popup-content) {
  margin: 14px 18px;
  font: 14px/1.6 "Microsoft YaHei", sans-serif;
}

.hy-distribution .hd-map-viewport :deep(.hd-region-popup p) {
  margin: 7px 0 0;
  color: #315c62;
}

.hy-distribution .hd-map-viewport :deep(.hd-region-popup p.hd-popup-note) {
  color: #6d7f75;
  font-size: 14px;
}

.hy-distribution .hd-map-viewport :deep(.hd-region-popup .leaflet-popup-tip) {
  background: #fffef9;
}

.hy-distribution .hd-map-viewport :deep(.hd-region-popup .leaflet-popup-close-button) {
  color: #53746d;
  font-size: 22px;
  width: 30px;
  height: 30px;
  line-height: 30px;
}

.hy-distribution .hd-map-viewport :deep(.hd-location-label) {
  color: #79422e;
  background: #fff9ef;
  border: 1px solid #c28566;
  padding: 6px 10px;
  font: 14px/1.4 "Microsoft YaHei", sans-serif;
}

.hy-distribution .hd-legend {
  display: flex;
  gap: 9px 13px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.hy-distribution .hd-legend>button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  background: #fffef9;
  color: #315c53;
}

.hy-distribution .hd-legend>button:hover:not(:disabled) {
  background: #edf3e8;
  border-color: #79a493;
  color: #315c53;
}

.hy-distribution .hd-legend>button[aria-pressed="true"] {
  border-color: #67927c;
  background: #e4eddf;
  color: #285744;
}

.hy-distribution .hd-legend>button[aria-pressed="true"]:hover:not(:disabled) {
  border-color: #42785e;
  background: #d7e6d1;
  color: #285744;
}

.hy-distribution .hd-legend svg {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
}

.hy-distribution .hd-legend>button>span {
  color: #607769;
  font-size: 14px;
}

.hy-distribution .hd-known {
  color: #207bb1;
}

.hy-distribution .hd-inferred {
  color: #cc782d;
}

.hy-distribution .hd-location-note {
  margin: 12px 0 0;
  padding: 10px 14px;
  border-left: 3px solid #b86140;
  border-radius: 0 7px 7px 0;
  background: #fbf0e4;
  color: #6e4c36;
}

.hy-distribution .hd-source,
.hy-distribution .hd-loading {
  margin: 10px 0 0;
  color: #6d7f78;
  font-size: 14px;
}

.hy-distribution .hd-reading {
  margin-top: 22px;
}

.hy-distribution .hd-reading>h3 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 500;
  color: #254b52;
}

.hy-distribution .hd-question {
  margin-top: 9px;
  border: 1px solid #d6e1d7;
  border-radius: 8px;
  overflow: hidden;
}

.hy-distribution .hd-question>button {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 0;
  border-radius: 0;
  background: #f4f6ed;
  color: #315c53;
}

.hy-distribution .hd-question>button>span:last-child {
  flex-shrink: 0;
}

.hy-distribution .hd-question>p {
  margin: 0;
  padding: 13px 15px;
  background: #fffef9;
  color: #527268;
}

.hy-distribution .hd-record {
  margin-top: 22px;
}

.hy-distribution .hd-record>label {
  display: block;
  margin-bottom: 8px;
  color: #254b52;
  font-weight: 500;
  font-size: 16px;
}

.hy-distribution textarea {
  display: block;
  width: 100%;
  min-height: 94px;
  padding: 11px 13px;
  border: 1px solid #bfd3c5;
  border-radius: 8px;
  resize: vertical;
  font: inherit;
  color: #254b52;
  background: #fffef9;
}

.hy-distribution textarea::placeholder {
  color: #83978b;
}

.hy-distribution .hd-record>div {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  margin-top: 10px;
}

.hy-distribution .hd-record>div>p {
  margin: 0;
  color: #6b8478;
  font-size: 14px;
}

.hy-distribution button.hd-record-button {
  flex-shrink: 0;
  background: #327462;
  color: #fffef8;
  border-color: #327462;
}

.hy-distribution button.hd-record-button:hover:not(:disabled) {
  background: #245d4d;
  border-color: #245d4d;
  color: #fffef8;
}

.hy-distribution .hd-map-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  color: #885c3e;
  background: #fbefdf;
  font-size: 14px;
}

@media(max-width: 600px) {
  .hy-distribution .hd-map-tools {
    gap: 8px;
  }

  .hy-distribution .hd-map-viewport {
    height: 340px;
  }

  .hy-distribution .hd-legend {
    gap: 8px;
  }

  .hy-distribution .hd-legend>button {
    justify-content: flex-start;
    flex: 1 1 100%;
    padding-inline: 10px;
    font-size: 14px;
  }

  .hy-distribution .hd-legend>button>span {
    margin-left: auto;
  }

  .hy-distribution .hd-record>div {
    align-items: stretch;
    flex-direction: column;
  }

  .hy-distribution .hd-record-button {
    align-self: flex-end;
  }
}
</style>
