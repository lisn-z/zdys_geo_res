<template>
  <div ref="pageRef" class="find-terrain-container geo-template-page geo-page theme-dark"
    :inert="showRoundResult || terrainLoadState !== 'ready'" :aria-busy="terrainLoadState === 'loading'">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>
      <h1 class="page-title">
        找地形
        <span class="page-subtitle">中国主要地形区判读</span>
      </h1>
      <div class="toolbar-actions">
        <div class="round-clock" :class="{ urgent: timeIsUrgent }">
          <label v-if="roundStatus === 'ready'">限时
            <select v-model.number="roundMinutes" aria-label="答题时限">
              <option :value="3">3 分钟</option>
              <option :value="5">5 分钟</option>
              <option :value="10">10 分钟</option>
            </select>
          </label>
          <span v-else>{{ roundEnded ? '本轮用时' : '剩余时间' }}</span>
          <strong>{{ clockText }}</strong>
        </div>
        <button v-if="roundEnded" type="button" class="theme-btn toolbar-btn" @click="openRoundResult">查看结果</button>
        <button type="button" class="theme-btn toolbar-btn" @click="resetGame">重新开始</button>
      </div>
    </header>

    <main class="workspace">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="leafletContainerRef" class="scene-host leaflet-host"></div>

          <!-- 地图顶部：任务提示 + 总进度 -->
          <div class="game-top-hud">
            <div class="mission-box" :class="mapHintState">
              <span class="mission-dot"></span>
              <div class="mission-copy">
                <span class="mission-kicker">当前任务</span>
                <strong role="status">{{ terrainLoadState === 'loading' ? '正在加载地形数据…' : terrainLoadState === 'error' ?
                  terrainLoadError : findingHint || '从下方选择一个地形名称，再点击地图中对应的地形走向或范围' }}</strong>
                <span v-if="terrainLoadState === 'ready' && roundStatus === 'ready'"
                  class="round-note">首次选择地形后开始计时</span>
                <span v-if="timeIsUrgent" class="round-warning" role="status">仅剩 30 秒，请抓紧时间！</span>
              </div>
            </div>

            <div class="progress-panel">
              <div class="progress-box">
                <div class="progress-head">
                  <span>查找进度</span>
                  <strong>{{ foundTotal }}/{{ totalTerrainCount }}</strong>
                </div>
                <div class="progress-track">
                  <span :style="{ width: `${progressPercent}%` }"></span>
                </div>
                <div class="progress-groups">
                  <span><i class="legend-dot mountain"></i>山脉 {{ foundCount.mountains }}/{{ totalCount.mountains }}</span>
                  <span><i class="legend-dot basin"></i>盆地 {{ foundCount.basins }}/{{ totalCount.basins }}</span>
                  <span><i class="legend-dot river"></i>河流 {{ foundCount.rivers }}/{{ totalCount.rivers }}</span>
                  <span><i class="legend-dot hill"></i>丘陵 {{ foundCount.hills }}/{{ totalCount.hills }}</span>
                  <span><i class="legend-dot plain"></i>平原 {{ foundCount.plains }}/{{ totalCount.plains }}</span>
                </div>
              </div>
              <p class="terrain-scope-note">注：地形范围为教学示意，非测绘边界。</p>
            </div>
          </div>

          <!-- 地图底部：横向题库 -->
          <div class="terrain-dock">
            <div class="dock-head">
              <div class="dock-title">
                <span class="dock-title-icon">⌖</span>
                <div>
                  <strong>{{ activeFilterTitle }}</strong>
                  <span>先选名称，再到地图中找对应的无名称地形</span>
                </div>
              </div>

              <div class="dock-filters">
                <button v-for="f in filterTypes" :key="f.key" type="button" class="filter-tab"
                  :class="{ active: activeFilter === f.key }" @click="activeFilter = f.key">{{ f.label }}</button>
              </div>

              <div class="dock-tools">
                <div class="dock-legend">
                  <span><svg class="legend-mountain" viewBox="0 0 28 16" aria-hidden="true"><path d="M1 13H27M3 13L10 3L15 10L20 5L25 13Z" /></svg>山脉</span>
                  <span><i class="legend-area basin"></i>盆地</span>
                  <span><i class="legend-line river"></i>河流</span>
                  <span><svg class="legend-hill" viewBox="0 0 28 16" aria-hidden="true"><path d="M2 13Q8 1 14 13M15 13Q20 4 26 13" /></svg>丘陵</span>
                  <span><i class="legend-area plain"></i>平原</span>
                </div>
                <button type="button" class="zone-toggle" :class="{ active: showAllMode }"
                  @click="toggleShowAll(!showAllMode)">
                  <span class="toggle-light"></span>
                  {{ showAllMode ? '地形已显示' : '地形已隐藏' }}
                </button>
              </div>
            </div>

            <div class="terrain-strip">
              <button v-for="item in filteredFeatures" :key="item.name" type="button" class="terrain-chip" :class="[
                item.type,
                {
                  found: item.found,
                  selected: selectedFeature?.name === item.name,
                },
              ]" :title="item.desc" :disabled="roundEnded || terrainLoadState !== 'ready'"
                @click="selectFeature(item)">
                <span class="chip-icon">{{ getTerrainEmoji(item.type) }}</span>
                <span class="chip-copy">
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.desc }}</small>
                </span>
                <span v-if="item.found" class="chip-status found">✓</span>
                <span v-else-if="selectedFeature?.name === item.name" class="chip-status selected">定位</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
    <Teleport to="body">
      <div v-if="terrainLoadState !== 'ready'" class="page-loading-overlay">
        <div class="page-loading-card" :role="terrainLoadState === 'error' ? 'alert' : 'status'" aria-live="polite">
          <span v-if="terrainLoadState === 'loading'" class="page-loading-spinner" aria-hidden="true"></span>
          <span v-else class="page-loading-error" aria-hidden="true">!</span>
          <h2>{{ terrainLoadState === 'loading' ? '正在加载地形地图' : '地图加载未完成' }}</h2>
          <p>{{ terrainLoadState === 'loading' ? '正在准备河流、平原与答题地图，请稍候…' : terrainLoadError }}</p>
          <button v-if="terrainLoadState === 'error'" type="button" class="result-primary" @click="loadTerrainData">重新加载</button>
        </div>
      </div>
      <div v-if="showRoundResult" class="round-result-overlay" @keydown="onResultKeydown">
        <div ref="roundResultRef" class="round-result" role="dialog" aria-modal="true"
          aria-labelledby="round-result-title" aria-describedby="round-result-description" tabindex="-1">
          <div class="result-icon" :class="roundStatus" aria-hidden="true">{{ roundStatus === 'won' ? '✓' : '⌛' }}</div>
          <h2 id="round-result-title">{{ roundStatus === 'won' ? '全部答对，挑战成功！' : '时间到，本轮挑战结束' }}</h2>
          <p id="round-result-description">{{ roundStatus === 'won' ? '你已找齐全部地形，做得不错！' : `已找到 ${foundTotal} 个地形，还有
            ${totalTerrainCount - foundTotal} 个未找到。再挑战一次吧！` }}</p>
          <div class="result-stats">
            <div><span>答对地形</span><strong>{{ foundTotal }} / {{ totalTerrainCount }}</strong></div>
            <div><span>本轮用时</span><strong>{{ formatRoundTime(elapsedMs) }}</strong></div>
          </div>
          <div class="result-actions">
            <button type="button" class="result-secondary" @click="closeRoundResult">查看地图</button>
            <button type="button" class="result-primary" @click="resetGame">再来一次</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import '@/styles/geo-page-template.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { applyRiverGeometry, applyNamedRiverGeometry, applyPlainGeometry, NAMED_RIVER_DATA, PLAINS_DATA_URL, RIVER_DATA_URL, terrainDefinitions, type TerrainDefinition } from './terrain-data'
import { hitsTerrain } from './terrain-geometry'
import { formatRoundTime, useTerrainRound, type RoundResult } from './use-terrain-round'

interface TerrainFeature extends TerrainDefinition { found: boolean }

type TerrainAnswerLayer = L.Path
const pageRef = ref<HTMLElement | null>(null)
const leafletContainerRef = ref<HTMLElement | null>(null)
const features = reactive<TerrainFeature[]>(terrainDefinitions.map(feature => ({ ...feature, found: false })))
const mountains = features.filter(feature => feature.type === 'mountain')
const basins = features.filter(feature => feature.type === 'basin')
const rivers = features.filter(feature => feature.type === 'river')
const hills = features.filter(feature => feature.type === 'hill')
const plains = features.filter(feature => feature.type === 'plain')

const filterTypes = [
  { key: 'all', label: '全部' },
  { key: 'mountains', label: '山脉' },
  { key: 'basins', label: '盆地' },
  { key: 'rivers', label: '河流' },
  { key: 'hills', label: '丘陵' },
  { key: 'plains', label: '平原' },
] as const

const activeFilter = ref<'all' | 'mountains' | 'basins' | 'rivers' | 'hills' | 'plains'>('all')
const selectedFeature = ref<TerrainFeature | null>(null)
const findingHint = ref('')
const showAllMode = ref(true)
const terrainLoadState = ref<'loading' | 'ready' | 'error'>('loading')
const terrainLoadError = ref('')
let terrainLoadController: AbortController | null = null
const roundMinutes = ref(5)
const roundResultRef = ref<HTMLDivElement | null>(null)
const showRoundResult = ref(false)
let resultReturnFocus: HTMLElement | null = null
const round = useTerrainRound(finishRound)
const { status: roundStatus, remainingMs, elapsedMs, ended: roundEnded } = round
const clockText = computed(() => formatRoundTime(roundStatus.value === 'ready' ? roundMinutes.value * 60_000 : roundEnded.value ? elapsedMs.value : remainingMs.value))
const timeIsUrgent = computed(() => roundStatus.value === 'running' && remainingMs.value <= 30_000)
let roundTimer: ReturnType<typeof setInterval> | null = null
let disposed = false

function stopRoundTimer() {
  if (roundTimer !== null) clearInterval(roundTimer)
  roundTimer = null
}

function openRoundResult() {
  if (!roundEnded.value || showRoundResult.value) return
  resultReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  showRoundResult.value = true
  void nextTick(() => roundResultRef.value?.querySelector<HTMLButtonElement>('.result-primary')?.focus())
}

function closeRoundResult() {
  showRoundResult.value = false
  void nextTick(() => {
    if (!disposed && resultReturnFocus?.isConnected) resultReturnFocus.focus()
  })
}

function onResultKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeRoundResult()
  } else if (event.key === 'Tab') {
    const buttons = roundResultRef.value?.querySelectorAll<HTMLButtonElement>('button')
    if (!buttons?.length) return
    const first = buttons[0]!
    const last = buttons[buttons.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

function clearTransientFeedback() {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  if (wrongFlashTimer) clearTimeout(wrongFlashTimer)
  feedbackTimer = null
  wrongFlashTimer = null
}

function finishRound(result: RoundResult) {
  stopRoundTimer()
  clearTransientFeedback()
  selectedFeature.value = null
  allFeatures.value.forEach(feature => setAnswerZoneState(feature, feature.found ? 'found' : 'idle'))
  findingHint.value = result === 'won'
    ? `✅ 全部答对！已找到 ${totalTerrainCount} 个地形，用时 ${formatRoundTime(elapsedMs.value)}`
    : `❌ 时间到！本轮已找到 ${foundTotal.value}/${totalTerrainCount} 个地形，点击“重新开始”再挑战`
  void nextTick(() => { if (!disposed) openRoundResult() })
}

function checkRoundDeadline() {
  round.tick()
  return !roundEnded.value
}

const allFeatures = computed(() => [...mountains, ...basins, ...rivers, ...hills, ...plains])
const filteredFeatures = computed(() => {
  if (activeFilter.value === 'mountains') return mountains
  if (activeFilter.value === 'basins') return basins
  if (activeFilter.value === 'rivers') return rivers
  if (activeFilter.value === 'hills') return hills
  if (activeFilter.value === 'plains') return plains
  return allFeatures.value
})

const activeFilterTitle = computed(() => {
  if (activeFilter.value === 'mountains') return '主要山脉'
  if (activeFilter.value === 'basins') return '四大盆地'
  if (activeFilter.value === 'rivers') return '主要河流'
  if (activeFilter.value === 'hills') return '主要丘陵'
  if (activeFilter.value === 'plains') return '主要平原'
  return '全部地形题库'
})

const totalCount = {
  mountains: mountains.length,
  basins: basins.length,
  rivers: rivers.length,
  hills: hills.length,
  plains: plains.length,
}

const foundCount = computed(() => ({
  mountains: mountains.filter(item => item.found).length,
  basins: basins.filter(item => item.found).length,
  rivers: rivers.filter(item => item.found).length,
  hills: hills.filter(item => item.found).length,
  plains: plains.filter(item => item.found).length,
}))

const totalTerrainCount = mountains.length + basins.length + rivers.length + hills.length + plains.length
const foundTotal = computed(() => foundCount.value.mountains + foundCount.value.basins + foundCount.value.rivers + foundCount.value.hills + foundCount.value.plains)
const progressPercent = computed(() => totalTerrainCount ? (foundTotal.value / totalTerrainCount) * 100 : 0)

const mapHintState = computed(() => {
  if (terrainLoadState.value === 'error') return 'error'
  if (findingHint.value.startsWith('✅')) return 'success'
  if (findingHint.value.startsWith('❌')) return 'error'
  if (selectedFeature.value) return 'active'
  return 'idle'
})

function getTerrainEmoji(type: TerrainFeature['type']) {
  if (type === 'mountain') return '🏔'
  if (type === 'basin') return '◉'
  if (type === 'river') return '≈'
  if (type === 'hill') return '⌁'
  return '▰'
}

// Preserve source vertices. Interpolation must not move a ridge, river bend,
// coastline or regional boundary. Separate parts remain separate geometries.
// ==================== Leaflet ====================
const ARCGIS_TILE_URL = '/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png'
const CHINA_OUTLINE_TILE_URL = 'https://gis.szjx.ai-study.net/geoserver/gwc/service/tms/1.0.0/geography_prod:styled_fd8e517f@EPSG:900913@png/{z}/{x}/{y}.png'
let leafletMap: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let chinaOutlineLayer: L.TileLayer | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let wrongFlashTimer: ReturnType<typeof setTimeout> | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const answerZoneLayers: Record<string, TerrainAnswerLayer> = {}
const detailLayers: Record<string, L.Layer[]> = {}
const mountainSymbolLayers: Record<string, L.Polygon> = {}
const hillSymbolLayers: Record<string, L.Polygon> = {}
const hillPatternPaths: Record<string, SVGPathElement> = {}
const foundLabelLayers: Record<string, L.Marker> = {}
let hillPatternId = ''

/** Space peak symbols in screen pixels while retaining the geographic ridge axis. */
function mountainSymbols(feature: TerrainFeature): L.LatLng[][] {
  if (!leafletMap) return []
  const map = leafletMap
  const viewport = map.getPixelBounds()
  const visible = L.bounds(viewport.min!.subtract([24, 24]), viewport.max!.add([24, 24]))
  const symbols: L.LatLng[][] = []
  for (const line of feature.lines || []) {
    const points = line.map(point => map.project(point))
    const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]!))
    const total = lengths.reduce((sum, length) => sum + length, 0)
    if (!total) continue
    // 全国最小缩放下，大兴安岭符号加大间距，避开靠近中蒙边界的放置点。
    // 保留原始山形尺寸和地理轴线；缩放 4–8 级仍使用正常间距。
    const symbolSpacing = feature.name === '大兴安岭' && map.getZoom() === 3 ? 28 : 20
    const count = Math.max(1, Math.floor(total / symbolSpacing))
    const spacing = total / count
    let segment = 0
    let walked = 0
    for (let index = 0; index < count; index++) {
      const distance = (index + 0.5) * spacing
      while (segment < lengths.length - 1 && walked + lengths[segment]! < distance) {
        walked += lengths[segment++]!
      }
      const a = points[segment]!, b = points[segment + 1]!
      const length = lengths[segment]!
      if (!length) continue
      const center = a.add(b.subtract(a).multiplyBy((distance - walked) / length))
      if (!visible.contains(center)) continue
      // Keep peaks on the upper side of the axis, independent of coordinate order.
      let tangent = b.subtract(a).divideBy(length)
      if (tangent.x < 0 || (tangent.x === 0 && tangent.y < 0)) tangent = tangent.multiplyBy(-1)
      const normal = L.point(tangent.y, -tangent.x)
      // Small peaks such as Wuzhishan need a readable icon at national scale.
      // Enlarge the symbol only; the ridge coordinates and answer zone stay unchanged.
      const scale = total < 20 ? 1.3 : 1
      const outline = [[-7, -1.5], [-2, 6], [1, 1.5], [3.5, 4.5], [7, -1.5]]
      symbols.push(outline.map(([x, y]) => map.unproject(center.add(tangent.multiplyBy(x! * scale)).add(normal.multiplyBy(y! * scale)))))
    }
  }
  return symbols
}

function refreshMountainSymbols() {
  mountains.forEach(feature => mountainSymbolLayers[feature.name]?.setLatLngs(mountainSymbols(feature)))
}

/** Only mound strokes are visible; the geographic polygons clip symbols and retain holes. */
function installHillPattern(layer: L.Path, feature: TerrainFeature) {
  const svg = layer.getElement()?.closest('svg')
  const patternId = `${hillPatternId}-${L.Util.stamp(layer)}`
  if (!svg || svg.querySelector(`#${patternId}`)) return
  const ns = 'http://www.w3.org/2000/svg'
  const defs = document.createElementNS(ns, 'defs')
  const pattern = document.createElementNS(ns, 'pattern')
  pattern.setAttribute('id', patternId)
  pattern.setAttribute('patternUnits', 'userSpaceOnUse')
  pattern.setAttribute('width', '28')
  pattern.setAttribute('height', '24')
  const mounds = document.createElementNS(ns, 'path')
  mounds.setAttribute('d', 'M2 9 Q7 0 12 9 M16 21 Q21 12 26 21')
  mounds.setAttribute('fill', 'none')
  mounds.setAttribute('stroke', '#a855f7')
  mounds.setAttribute('stroke-width', '1.6')
  mounds.setAttribute('stroke-linecap', 'round')
  pattern.append(mounds)
  defs.append(pattern)
  svg.prepend(defs)
  hillPatternPaths[feature.name] = mounds
  layer.setStyle({ fillColor: `url(#${patternId})` })
}

function getTerrainZoneColor(feature: TerrainFeature) {
  if (feature.type === 'mountain') return '#facc15'
  if (feature.type === 'basin') return '#d97706'
  if (feature.type === 'river') return '#0e7490'
  if (feature.type === 'hill') return '#7c3aed'
  return '#15803d'
}

function getTerrainDetailColor(feature: TerrainFeature) {
  if (feature.type === 'mountain') return '#fef9c3'
  if (feature.type === 'basin') return '#fde68a'
  if (feature.type === 'river') return '#67e8f9'
  if (feature.type === 'hill') return '#a855f7'
  return '#bbf7d0'
}

async function loadTerrainData() {
  if (!leafletMap || disposed || terrainLoadController || terrainLoadState.value === 'ready') return
  terrainLoadState.value = 'loading'
  terrainLoadError.value = ''
  const controller = new AbortController()
  terrainLoadController = controller
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const [riverData, plainData, ...namedRiverData] = await Promise.all([
      { url: RIVER_DATA_URL, name: '河流' }, { url: PLAINS_DATA_URL, name: '平原' }, ...NAMED_RIVER_DATA,
    ].map(async ({ url, name }) => {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`${name} HTTP ${response.status}`)
      return response.json() as Promise<unknown>
    }))
    if (disposed || !leafletMap) return
    const nextRivers = rivers.map(river => ({ ...river }))
    const nextPlains = plains.map(plain => ({ ...plain }))
    applyRiverGeometry(nextRivers.filter(river => !NAMED_RIVER_DATA.some(source => source.name === river.name)), riverData)
    NAMED_RIVER_DATA.forEach((source, index) => {
      applyNamedRiverGeometry(nextRivers.find(river => river.name === source.name)!, namedRiverData[index])
    })
    applyPlainGeometry(nextPlains, plainData)
    rivers.forEach((river, index) => Object.assign(river, nextRivers[index]))
    plains.forEach((plain, index) => Object.assign(plain, nextPlains[index]))
    addTerrainAnswerZones()
    toggleShowAll(showAllMode.value)
    terrainLoadState.value = 'ready'
  } catch (error) {
    if (disposed) return
    terrainLoadState.value = 'error'
    terrainLoadError.value = controller.signal.aborted
      ? '地形数据加载超时，请重新加载'
      : `地形数据加载失败，请重新加载（${error instanceof Error ? error.message : '网络异常'}）`
  } finally {
    clearTimeout(timeout)
    controller.abort()
    terrainLoadController = null
  }
}

async function initScene() {
  const container = leafletContainerRef.value
  if (!container) return

  leafletMap = L.map(container, {
    crs: L.CRS.EPSG3857,
    center: [35, 105],
    zoom: 4,
    minZoom: 3,
    maxZoom: 8,
    zoomControl: true,
    attributionControl: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
    preferCanvas: false,
  })
  hillPatternId = `terrain-hills-${L.Util.stamp(leafletMap)}`

  const outlinePane = leafletMap.createPane('outline-pane')
  outlinePane.style.zIndex = '540'
  outlinePane.style.pointerEvents = 'none'

  const areaPane = leafletMap.createPane('terrain-area-pane')
  areaPane.style.zIndex = '500'

  const terrainPane = leafletMap.createPane('terrain-zone-pane')
  terrainPane.style.zIndex = '520'

  const detailPane = leafletMap.createPane('terrain-detail-pane')
  detailPane.style.zIndex = '530'
  detailPane.style.pointerEvents = 'none'

  // 山脉连线和山形符号置于丘陵纹样上方，缩小地图时仍能清楚识别山脉。
  const mountainPane = leafletMap.createPane('terrain-mountain-pane')
  mountainPane.style.zIndex = '535'

  const labelPane = leafletMap.createPane('terrain-label-pane')
  labelPane.style.zIndex = '650'
  labelPane.style.pointerEvents = 'none'

  tileLayer = L.tileLayer(ARCGIS_TILE_URL, {
    minZoom: 0,
    maxZoom: 8,
    maxNativeZoom: 8,
    opacity: 1,
    noWrap: true,
  }).addTo(leafletMap)

  // EPSG:900913 与地图 EPSG:3857 同为 Web Mercator，z 与 Leaflet 一致。
  // TMS 行号从南向北：Leaflet 的 (z, x, y) 对应服务端 (z, x, 2^z - 1 - y)。
  chinaOutlineLayer = L.tileLayer(CHINA_OUTLINE_TILE_URL, {
    pane: 'outline-pane',
    tileSize: 256,
    minZoom: 0,
    maxZoom: 8,
    zoomOffset: 0,
    tms: true,
    noWrap: true,
    opacity: 1,
  }).addTo(leafletMap)

  const ApprovalControl = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('div', 'map-approval-number')
      el.textContent = 'GS(2025)5996'
      el.style.cssText = 'font-size:12px;color:#666;background:rgba(255,255,255,.84);padding:2px 6px;border-radius:3px;white-space:nowrap;'
      return el
    },
  })
  new ApprovalControl({ position: 'bottomleft' }).addTo(leafletMap)
  L.control.scale({ imperial: false, position: 'bottomright' }).addTo(leafletMap)

  leafletMap.on('click', onMapBlankClick)
  leafletMap.on('zoomend moveend', refreshMountainSymbols)

  resizeObserver = new ResizeObserver(() => scheduleSceneResize())
  resizeObserver.observe(container)
  scheduleSceneResize(0)
  await loadTerrainData()
}

function setAnswerZoneState(feature: TerrainFeature, state: 'idle' | 'hover' | 'found' | 'wrong') {
  const layer = answerZoneLayers[feature.name]
  if (!layer) return

  if (feature.type === 'hill') {
    layer.setStyle({ weight: 0, opacity: 0, fillOpacity: 0 })
    hillSymbolLayers[feature.name]?.setStyle({ fillOpacity: state === 'idle' ? 0.95 : 1 })
    hillPatternPaths[feature.name]?.setAttribute('stroke', state === 'wrong' ? '#f87171' : state === 'idle' ? '#a855f7' : '#c084fc')
    return
  }

  if (feature.type === 'basin' || feature.type === 'plain') {
    const color = state === 'wrong' ? '#ef4444' : getTerrainZoneColor(feature)
    layer.setStyle({
      color,
      weight: state === 'found' ? 3.2 : state === 'hover' ? 3 : 2.4,
      opacity: state === 'wrong' ? 1 : state === 'found' ? 1 : state === 'hover' ? 0.98 : 0.92,
      fillColor: color,
      fillOpacity: state === 'wrong' ? 0.38 : state === 'found' ? 0.36 : state === 'hover' ? 0.3 : 0.16,
      dashArray: '',
    })
    return
  }

  const color = state === 'wrong' ? '#ef4444' : getTerrainZoneColor(feature)
  const baseWeight = feature.type === 'mountain' ? 1.8 : 3
  mountainSymbolLayers[feature.name]?.setStyle({
    fillColor: color,
    color: state === 'wrong' ? '#fecaca' : '#fef9c3',
    fillOpacity: state === 'hover' || state === 'found' ? 1 : 0.94,
    weight: state === 'hover' || state === 'found' ? 1.2 : 0.8,
  })
  layer.setStyle({
    color,
    weight: state === 'found' ? baseWeight + 2 : state === 'hover' ? baseWeight + 1 : baseWeight,
    opacity: state === 'wrong' ? 1 : state === 'found' ? 0.98 : state === 'hover' ? 0.96 : 0.88,
    lineCap: 'round',
    lineJoin: 'round',
  })
}

function addTerrainAnswerZones() {
  if (!leafletMap) return

  allFeatures.value.forEach(feature => {
    let answerLayer: TerrainAnswerLayer | null = null
    const detail: L.Layer[] = []

    if (feature.type === 'mountain' && feature.lines?.length) {
      const coords = feature.lines
      answerLayer = L.polyline(coords, {
        pane: 'terrain-mountain-pane',
        color: getTerrainZoneColor(feature),
        weight: 1.8,
        opacity: 0.88,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true,
        bubblingMouseEvents: false,
      })
      const symbols = L.polygon(mountainSymbols(feature), {
        pane: 'terrain-mountain-pane',
        color: getTerrainDetailColor(feature),
        weight: 0.8,
        opacity: 1,
        fillColor: getTerrainZoneColor(feature),
        fillOpacity: 0.94,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      })
      mountainSymbolLayers[feature.name] = symbols
      detail.push(symbols)
    }

    if (feature.polygons?.length) {
      const area = feature.polygons
      answerLayer = L.polygon(area, {
        pane: 'terrain-area-pane',
        color: getTerrainZoneColor(feature),
        weight: feature.type === 'hill' ? 0 : 2.4,
        opacity: feature.type === 'hill' ? 0 : 0.92,
        fillColor: getTerrainZoneColor(feature),
        fillOpacity: feature.type === 'hill' ? 0 : 0.16,
        smoothFactor: 0,
        interactive: true,
        bubblingMouseEvents: false,
      })
      const areaDetail = L.polygon(area, {
        pane: 'terrain-detail-pane',
        color: getTerrainDetailColor(feature),
        weight: feature.type === 'hill' ? 0 : 1.2,
        opacity: feature.type === 'hill' ? 0 : 0.68,
        fillColor: getTerrainDetailColor(feature),
        fillOpacity: feature.type === 'hill' ? 0.8 : 0,
        smoothFactor: 0,
        interactive: false,
      })
      if (feature.type === 'hill') {
        hillSymbolLayers[feature.name] = areaDetail
        areaDetail.on('add', () => installHillPattern(areaDetail, feature))
      }
      detail.push(areaDetail)
    }

    if (feature.type === 'river' && feature.lines?.length) {
      const coords = feature.lines
      answerLayer = L.polyline(coords, {
        pane: 'terrain-zone-pane',
        color: '#0e7490',
        weight: 3,
        opacity: 0.9,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: true,
        bubblingMouseEvents: false,
      })
      detail.push(L.polyline(coords, {
        pane: 'terrain-detail-pane',
        color: '#67e8f9',
        weight: 1.2,
        opacity: 0.95,
        smoothFactor: 0,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }))
    }

    if (!answerLayer) return

    answerZoneLayers[feature.name] = answerLayer
    detailLayers[feature.name] = detail

    answerLayer.on('click', (event: L.LeafletMouseEvent) => handleTerrainZoneClick(feature, event.latlng))
    answerLayer.on('mouseover', () => {
      if (!feature.found) setAnswerZoneState(feature, 'hover')
    })
    answerLayer.on('mouseout', () => {
      setAnswerZoneState(feature, feature.found ? 'found' : 'idle')
    })

    if (showAllMode.value) {
      answerLayer.addTo(leafletMap!)
      detail.forEach(layer => layer.addTo(leafletMap!))
    }
  })
}

function selectFeature(feature: TerrainFeature) {
  if (terrainLoadState.value !== 'ready' || !leafletMap || !checkRoundDeadline()) return
  if (roundStatus.value === 'ready') {
    round.start(roundMinutes.value * 60)
    roundTimer = setInterval(round.tick, 250)
  }
  if (feature.found) {
    findingHint.value = `✅ 「${feature.name}」已经找到，可继续选择其他地形`
    clearFeedbackLater(1600)
    return
  }

  selectedFeature.value = feature
  findingHint.value = `请在地图中点击「${feature.name}」对应的${feature.type === 'basin' || feature.type === 'hill' || feature.type === 'plain' ? '地形范围' : '地形走向'}`
}

function hitsSelected(latlng: L.LatLng) {
  const feature = selectedFeature.value
  return !!feature && !!leafletMap && hitsTerrain(feature, [latlng.lat, latlng.lng], point => leafletMap!.latLngToLayerPoint(point))
}

function onMapBlankClick(event: L.LeafletMouseEvent) {
  if (terrainLoadState.value !== 'ready' || !checkRoundDeadline()) return
  if (hitsSelected(event.latlng)) {
    handleTerrainZoneClick(selectedFeature.value!, event.latlng)
    return
  }
  if (!selectedFeature.value) {
    findingHint.value = '请先从下方题库选择一个地形名称'
    clearFeedbackLater(1500)
    return
  }
  findingHint.value = `❌ 这里不在「${selectedFeature.value.name}」的判读范围内，请再观察位置和走向`
}

function handleTerrainZoneClick(clicked: TerrainFeature, latlng: L.LatLng) {
  if (!checkRoundDeadline()) return
  const target = selectedFeature.value

  if (!target) {
    findingHint.value = '请先从下方题库选择一个地形名称，再点击地图地形'
    clearFeedbackLater(1600)
    return
  }

  // Prefer the selected answer where landform regions naturally overlap.
  if (clicked.name !== target.name && !hitsSelected(latlng)) {
    findingHint.value = `❌ 这里不是「${target.name}」，再观察一下走向和位置`
    if (wrongFlashTimer) clearTimeout(wrongFlashTimer)
    setAnswerZoneState(clicked, 'wrong')
    wrongFlashTimer = setTimeout(() => {
      setAnswerZoneState(clicked, clicked.found ? 'found' : 'idle')
      wrongFlashTimer = null
    }, 520)
    return
  }

  const accepted = round.recordCorrect(() => {
    target.found = true
    setAnswerZoneState(target, 'found')
    addFoundLabel(target)
    return foundTotal.value === totalTerrainCount
  })
  if (!accepted || roundEnded.value) return
  findingHint.value = `✅ 正确！「${target.name}」已找到`
  selectedFeature.value = null
  clearFeedbackLater(2100)
}

function addFoundLabel(feature: TerrainFeature) {
  if (!leafletMap || foundLabelLayers[feature.name]) return

  const color = getTerrainDetailColor(feature)
  const icon = L.divIcon({
    className: 'terrain-found-label-wrapper',
    html: `<div class="terrain-found-label terrain-found-label-${feature.type}" style="--terrain-color:${color}">
      <span>${getTerrainEmoji(feature.type)}</span><strong>${feature.name}</strong>
    </div>`,
    iconSize: [140, 34],
    iconAnchor: [70, 17],
  })

  const marker = L.marker(feature.label, {
    pane: 'terrain-label-pane',
    icon,
    interactive: false,
  }).addTo(leafletMap)

  foundLabelLayers[feature.name] = marker
}

function toggleShowAll(on: boolean) {
  showAllMode.value = on
  if (!leafletMap) return

  allFeatures.value.forEach(feature => {
    const answer = answerZoneLayers[feature.name]
    const details = detailLayers[feature.name] || []
    if (!answer) return

    if (on) {
      if (!leafletMap!.hasLayer(answer)) answer.addTo(leafletMap!)
      details.forEach(layer => {
        if (!leafletMap!.hasLayer(layer)) layer.addTo(leafletMap!)
      })
      setAnswerZoneState(feature, feature.found ? 'found' : 'idle')
    } else {
      if (leafletMap!.hasLayer(answer)) answer.remove()
      details.forEach(layer => {
        if (leafletMap!.hasLayer(layer)) layer.remove()
      })
    }
  })
}

function resetGame() {
  stopRoundTimer()
  clearTransientFeedback()
  closeRoundResult()
  round.reset()
  mountains.forEach(item => { item.found = false })
  basins.forEach(item => { item.found = false })
  rivers.forEach(item => { item.found = false })
  hills.forEach(item => { item.found = false })
  plains.forEach(item => { item.found = false })
  selectedFeature.value = null
  findingHint.value = '已重新开始：从下方选择一个地形名称'

  allFeatures.value.forEach(feature => setAnswerZoneState(feature, 'idle'))
  Object.values(foundLabelLayers).forEach(layer => layer.remove())
  Object.keys(foundLabelLayers).forEach(key => delete foundLabelLayers[key])
  clearFeedbackLater(1700)
}

function clearFeedbackLater(delay: number) {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    if (!selectedFeature.value && !roundEnded.value) findingHint.value = ''
    feedbackTimer = null
  }, delay)
}

function scheduleSceneResize(delay = 80) {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    leafletMap?.invalidateSize({ animate: false, pan: false })
  }, delay)
}

onMounted(async () => {
  document.addEventListener('visibilitychange', round.tick)
  window.addEventListener('focus', round.tick)
  await nextTick()
  await initScene()
})

onBeforeUnmount(() => {
  disposed = true
  terrainLoadController?.abort()
  stopRoundTimer()
  document.removeEventListener('visibilitychange', round.tick)
  window.removeEventListener('focus', round.tick)
  if (resizeTimer) clearTimeout(resizeTimer)
  if (wrongFlashTimer) clearTimeout(wrongFlashTimer)
  if (feedbackTimer) clearTimeout(feedbackTimer)
  resizeObserver?.disconnect()
  resizeObserver = null

  Object.values(answerZoneLayers).forEach(layer => layer.remove())
  Object.values(detailLayers).flat().forEach(layer => layer.remove())
  Object.values(foundLabelLayers).forEach(layer => layer.remove())

  leafletMap?.off('click', onMapBlankClick)
  leafletMap?.off('zoomend moveend', refreshMountainSymbols)
  chinaOutlineLayer?.remove()
  tileLayer?.remove()
  leafletMap?.remove()
  leafletMap = null
  tileLayer = null
  chinaOutlineLayer = null
})
</script>

<style scoped>
.page-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 6000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 14, 28, .88);
  backdrop-filter: blur(8px);
}

.page-loading-card {
  width: min(420px, 100%);
  padding: 36px 28px;
  border: 1px solid #334155;
  border-radius: 18px;
  background: #0f172a;
  color: #e2e8f0;
  text-align: center;
  box-shadow: 0 24px 80px #0006;
}

.page-loading-card h2 { margin: 20px 0 10px; font-size: 20px; }
.page-loading-card p { margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.7; }
.page-loading-card button { margin-top: 24px; padding: 10px 24px; cursor: pointer; }
.page-loading-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 3px solid #23374b;
  border-top-color: #2dd4bf;
  border-radius: 50%;
  animation: terrain-loading-spin .85s linear infinite;
}
.page-loading-error { font-size: 36px; font-weight: 700; color: #fb923c; }
@keyframes terrain-loading-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .page-loading-spinner { animation: none; } }

.round-clock {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.round-clock label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.round-clock select {
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 4px;
  background: #0f172a;
  color: #e2e8f0;
}

.round-clock strong {
  color: #5eead4;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.round-clock.urgent strong,
.round-warning {
  color: #fca5a5;
}

.round-note,
.round-warning {
  font-size: 11px;
}

.round-note {
  color: #94a3b8;
}

.round-result {
  width: min(440px, calc(100vw - 32px));
  box-sizing: border-box;
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 30px;
  border: 1px solid #475569;
  border-radius: 20px;
  color: #e2e8f0;
  background: #0f172a;
  text-align: center;
  box-shadow: 0 24px 80px #0009;
}

.round-result-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: #020617b8;
  backdrop-filter: blur(5px);
}

.result-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  border-radius: 50%;
  font-size: 34px;
  background: #78350f66;
}

.result-icon.won {
  color: #5eead4;
  background: #0f766e55;
}

.round-result h2 {
  margin: 0 0 12px;
  font-size: 23px;
  color: #f8fafc;
}

.round-result p {
  margin: 0;
  color: #94a3b8;
  line-height: 1.7;
  font-size: 14px;
}

.result-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 24px 0;
}

.result-stats div {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 10px;
  background: #1e293b;
}

.result-stats span {
  color: #94a3b8;
  font-size: 12px;
}

.result-stats strong {
  color: #5eead4;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.result-actions {
  display: flex;
  gap: 12px;
}

.result-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 9px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.result-primary {
  border: 1px solid #2dd4bf;
  background: #2dd4bf;
  color: #042f2e;
}

.result-secondary {
  border: 1px solid #475569;
  background: #1e293b;
  color: #e2e8f0;
}

.terrain-chip:disabled {
  cursor: default;
}

.terrain-chip:disabled:hover {
  transform: none;
}

@media (max-width: 680px) {
  .round-clock {
    gap: 4px;
  }

  .round-clock>span {
    display: none;
  }

  .round-clock strong {
    font-size: 16px;
  }

  .round-result {
    padding: 22px;
  }

  .find-terrain-container .page-subtitle {
    display: none;
  }
}

.find-terrain-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.find-terrain-container .top-toolbar {
  height: 72px !important;
  min-height: 72px !important;
  box-sizing: border-box;
}

.find-terrain-container .workspace {
  position: relative !important;
  width: 100% !important;
  height: calc(100vh - 72px) !important;
  min-width: 0;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.find-terrain-container .center-stage {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
}

.find-terrain-container .stage-content {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
}

.find-terrain-container .leaflet-host {
  position: absolute !important;
  inset: 0 !important;
  width: auto !important;
  height: auto !important;
  min-width: 0;
  min-height: 0;
}

.page-subtitle {
  margin-left: 10px;
  color: #64748b;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
}

.game-top-hud {
  position: absolute;
  top: 14px;
  left: 64px;
  right: 18px;
  z-index: 1000;
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(330px, 390px);
  gap: 12px;
  align-items: stretch;
  pointer-events: none;
}

.mission-box,
.progress-box,
.terrain-dock {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(5, 13, 28, 0.92);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, .04);
  backdrop-filter: blur(14px);
}

.mission-box {
  display: flex;
  width: fit-content;
  max-width: min(640px, 100%);
  justify-self: start;
  align-self: start;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 64px;
  padding: 10px 16px;
  border-radius: 14px;
  pointer-events: auto;
  transition: .2s ease;
}

.mission-box.active {
  border-color: rgba(251, 191, 36, .76);
  background: rgba(40, 28, 7, .94);
  box-shadow: 0 12px 34px rgba(0, 0, 0, .34), 0 0 22px rgba(251, 191, 36, .16);
}

.mission-box.success {
  border-color: rgba(34, 197, 94, .78);
  background: rgba(4, 34, 20, .94);
}

.mission-box.error {
  border-color: rgba(248, 113, 113, .8);
  background: rgba(43, 8, 14, .94);
}

.mission-dot {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #2ec4b6;
  box-shadow: 0 0 0 5px rgba(46, 196, 182, .12), 0 0 16px rgba(46, 196, 182, .75);
}

.mission-box.active .mission-dot {
  background: #fbbf24;
  box-shadow: 0 0 0 5px rgba(251, 191, 36, .12), 0 0 16px rgba(251, 191, 36, .75);
}

.mission-box.success .mission-dot {
  background: #22c55e;
  box-shadow: 0 0 0 5px rgba(34, 197, 94, .12), 0 0 16px rgba(34, 197, 94, .75);
}

.mission-box.error .mission-dot {
  background: #f87171;
  box-shadow: 0 0 0 5px rgba(248, 113, 113, .12), 0 0 16px rgba(248, 113, 113, .75);
}

.mission-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mission-kicker {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.mission-copy strong {
  color: #f8fafc;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 800;
  white-space: normal;
  overflow-wrap: anywhere;
}



.filter-tab,
.zone-toggle,
.terrain-chip {
  appearance: none;
  border: 0;
  font: inherit;
  cursor: pointer;
}

.filter-tab {
  height: 28px;
  padding: 0 9px;
  border: 1px solid rgba(148, 163, 184, .18);
  border-radius: 8px;
  color: #94a3b8;
  background: rgba(15, 23, 42, .62);
  font-size: 12px;
  font-weight: 700;
  transition: .18s ease;
}

.filter-tab:hover {
  color: #e2e8f0;
  border-color: rgba(46, 196, 182, .38);
}

.filter-tab.active {
  color: #dffcf8;
  border-color: rgba(46, 196, 182, .7);
  background: rgba(46, 196, 182, .16);
  box-shadow: 0 0 12px rgba(46, 196, 182, .12);
}

.zone-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 24px;
  border-radius: 7px;
  color: #64748b;
  background: rgba(15, 23, 42, .46);
  font-size: 11px;
  font-weight: 700;
}

.zone-toggle.active {
  color: #99f6e4;
}

.toggle-light {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #64748b;
}

.zone-toggle.active .toggle-light {
  background: #2ec4b6;
  box-shadow: 0 0 8px rgba(46, 196, 182, .8);
}

.progress-panel {
  display: flex;
  flex-direction: column;
  align-self: start;
  gap: 8px;
  min-width: 0;
}

.progress-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
  min-height: 64px;
  padding: 9px 14px;
  border-radius: 14px;
  pointer-events: auto;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
}

.progress-head strong {
  color: #5eead4;
  font-size: 16px;
}

.progress-track {
  width: 100%;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, .16);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2ec4b6, #247cff);
  box-shadow: 0 0 10px rgba(46, 196, 182, .45);
  transition: width .3s ease;
}

.progress-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
}

.progress-groups span,
.dock-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.legend-dot.mountain {
  background: #facc15;
}

.legend-dot.basin {
  background: #d97706;
}

.legend-dot.river {
  background: #0e7490;
}

.legend-dot.hill {
  background: #7c3aed;
}

.legend-dot.plain {
  background: #15803d;
}

.terrain-dock {
  position: absolute;
  right: 18px;
  bottom: 8px;
  left: 18px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 10px 12px 11px;
  border-radius: 16px;
}

.terrain-scope-note {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(251, 191, 36, .5);
  border-left: 3px solid #fbbf24;
  border-radius: 10px;
  background: rgba(40, 30, 12, .94);
  color: #fef3c7;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .24);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.dock-head {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto minmax(330px, auto);
  align-items: center;
  gap: 14px;
  min-height: 34px;
}

.dock-filters {
  display: grid;
  grid-template-columns: repeat(6, minmax(52px, 1fr));
  gap: 5px;
  min-width: 390px;
  padding: 3px;
  border: 1px solid rgba(148, 163, 184, .12);
  border-radius: 10px;
  background: rgba(15, 23, 42, .42);
}

.dock-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
}

.dock-tools .zone-toggle {
  flex: 0 0 auto;
  min-width: 86px;
  padding: 0 10px;
  border: 1px solid rgba(148, 163, 184, .18);
}

.dock-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dock-title-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(46, 196, 182, .38);
  border-radius: 9px;
  color: #5eead4;
  background: rgba(46, 196, 182, .1);
  font-size: 17px;
}

.dock-title>div {
  display: flex;
  align-items: baseline;
  gap: 9px;
  min-width: 0;
}

.dock-title strong {
  color: #f8fafc;
  font-size: 14px;
  white-space: nowrap;
}

.dock-title span:not(.dock-title-icon) {
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #94a3b8;
  font-size: 11px;
  white-space: nowrap;
}

.legend-line {
  width: 18px;
  height: 5px;
  border-radius: 999px;
}

.legend-mountain {
  width: 26px;
  height: 16px;
  fill: #facc15;
  stroke: #fef9c3;
  stroke-width: 1;
  stroke-linejoin: round;
}

.legend-line.river {
  background: #0e7490;
  box-shadow: inset 0 0 0 1px rgba(103, 232, 249, .52);
}

.legend-area {
  width: 14px;
  height: 10px;
  border-radius: 3px;
}

.legend-area.basin {
  background: rgba(217, 119, 6, .82);
  border: 1px solid #fde68a;
}

.legend-hill {
  width: 26px;
  height: 16px;
  fill: none;
  stroke: #a855f7;
  stroke-width: 1.5;
  stroke-linecap: round;
}

.legend-area.plain {
  background: rgba(21, 128, 61, .78);
  border: 1px solid #bbf7d0;
}

.terrain-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1px 2px 3px;
  scrollbar-width: thin;
  scrollbar-color: rgba(46, 196, 182, .32) transparent;
}

.terrain-strip::-webkit-scrollbar {
  height: 5px;
}

.terrain-strip::-webkit-scrollbar-thumb {
  background: rgba(46, 196, 182, .28);
  border-radius: 999px;
}

.terrain-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 212px;
  min-width: 0;
  height: 90px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, .2);
  border-radius: 14px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, .72);
  text-align: left;
  transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
}

.terrain-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, .42);
  background: rgba(30, 41, 59, .82);
}

.terrain-chip.mountain {
  --chip-color: #facc15;
}

.terrain-chip.basin {
  --chip-color: #fbbf24;
}

.terrain-chip.river {
  --chip-color: #67e8f9;
}

.terrain-chip.hill {
  --chip-color: #c4b5fd;
}

.terrain-chip.plain {
  --chip-color: #86efac;
}

.terrain-chip.selected {
  border-color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 14%, rgba(15, 23, 42, .9));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--chip-color) 35%, transparent), 0 0 18px color-mix(in srgb, var(--chip-color) 16%, transparent);
}

.terrain-chip.found {
  border-color: rgba(46, 196, 182, .56);
  background: rgba(15, 118, 110, .16);
}

.chip-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  border-radius: 11px;
  color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  font-size: 23px;
  font-weight: 900;
}

.chip-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.chip-copy strong {
  overflow: hidden;
  color: #e2e8f0;
  font-size: 16.5px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-copy small {
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-status {
  position: absolute;
  top: 5px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 900;
}

.chip-status.found {
  color: #d1fae5;
  background: #0f766e;
}

.chip-status.selected {
  color: #422006;
  background: #fbbf24;
}

.find-terrain-container :deep(.leaflet-interactive) {
  cursor: pointer;
}

.find-terrain-container :deep(.terrain-found-label-wrapper) {
  background: transparent !important;
  border: none !important;
}

.find-terrain-container :deep(.terrain-found-label) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 94px;
  height: 28px;
  padding: 0 9px;
  border: 1px solid var(--terrain-color);
  border-radius: 999px;
  color: #f8fafc;
  background: rgba(3, 10, 20, .9);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .36), 0 0 12px color-mix(in srgb, var(--terrain-color) 35%, transparent);
  font-size: 11px;
  white-space: nowrap;
}

.find-terrain-container :deep(.terrain-found-label strong) {
  font-weight: 900;
}

@media (max-width: 1280px) {
  .game-top-hud {
    grid-template-columns: 1fr 330px;
  }

  .dock-head {
    grid-template-columns: 1fr auto;
  }

  .dock-title {
    display: none;
  }

  .dock-filters {
    min-width: 0;
  }

  .terrain-chip {
    flex-basis: 190px;
  }
}

@media (max-width: 980px) {
  .progress-box {
    display: none;
  }

  .game-top-hud {
    grid-template-columns: 1fr;
  }

  .dock-head {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .dock-tools {
    justify-content: space-between;
  }

  .dock-filters {
    grid-template-columns: repeat(6, minmax(46px, 1fr));
  }

  .dock-legend {
    display: none;
  }
}

@media (max-width: 860px) {
  .game-top-hud {
    left: 52px;
  }

  .mission-copy strong {
    font-size: 13px;
  }

  .dock-legend {
    display: none;
  }

  .dock-title>div {
    align-items: flex-start;
    flex-direction: column;
    gap: 1px;
  }
}
</style>
