<template>
  <div ref="pageRef" class="find-terrain-container geo-template-page geo-page theme-dark" :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="logo" />
      </div>
      <h1 class="page-title">找地形 <span class="page-subtitle">中国主要地形区判读</span></h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">{{ allPanelsCollapsed ? '展开面板' : '收起面板' }}</button>
      </div>
    </header>

    <main class="workspace" v-bind="workspaceAttrs">
      <section class="center-stage">
        <div class="stage-content">
          <div ref="leafletContainerRef" class="scene-host leaflet-host"></div>
          <div class="map-hint" :class="{ finding: selectedFeature }">{{ findingHint || '点击右侧列表中的地形名称，在地图上点击查找' }}</div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div><h2>地形要素</h2><p>山脉 · 盆地 · 河流</p></div>
            <span class="panel-badge">FIND</span>
          </div>

          <!-- 展示模式 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🗺 展示模式</h3>
            <div class="switch-row">
              <div class="control-copy"><strong>显示全部地形</strong><span>在地图上展示所有山脉、盆地、河流</span></div>
              <el-switch v-model="showAllMode" @change="toggleShowAll" />
            </div>
          </section>

          <!-- 筛选 -->
          <section class="geo-card control-section">
            <h3 class="section-title">🔍 类型筛选</h3>
            <div class="filter-buttons">
              <button v-for="f in filterTypes" :key="f.key" class="theme-btn option-btn" :class="{ active: activeFilter === f.key }" @click="activeFilter = f.key">{{ f.label }}</button>
            </div>
          </section>

          <!-- 找到的计数 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📊 查找进度</h3>
            <div class="find-progress">
              <div class="progress-item" :class="{ 'has-found': foundCount.mountains > 0, completed: foundCount.mountains === totalCount.mountains }"><span class="progress-icon">🏔</span><strong>{{ foundCount.mountains }}</strong><span>/ {{ totalCount.mountains }} 山脉</span></div>
              <div class="progress-item" :class="{ 'has-found': foundCount.basins > 0, completed: foundCount.basins === totalCount.basins }"><span class="progress-icon">🏺</span><strong>{{ foundCount.basins }}</strong><span>/ {{ totalCount.basins }} 盆地</span></div>
              <div class="progress-item" :class="{ 'has-found': foundCount.rivers > 0, completed: foundCount.rivers === totalCount.rivers }"><span class="progress-icon">🌊</span><strong>{{ foundCount.rivers }}</strong><span>/ {{ totalCount.rivers }} 河流</span></div>
            </div>
          </section>

          <!-- 列表 -->
          <section class="geo-card control-section" v-if="activeFilter === 'all' || activeFilter === 'mountains'">
            <h3 class="section-title">🏔 主要山脉</h3>
            <div class="terrain-list">
              <div v-for="m in mountains" :key="m.name" class="terrain-item" :class="{ found: m.found, selected: selectedFeature?.name === m.name }" @click="selectFeature(m)">
                <span class="terrain-icon" style="color:#ef4444">🏔</span>
                <div class="terrain-info"><span class="terrain-name">{{ m.name }}</span><span class="terrain-desc">{{ m.desc }}</span></div>
                <span class="terrain-check" v-if="m.found">✓</span>
                <span class="terrain-arrow" v-else-if="selectedFeature?.name === m.name">→</span>
              </div>
            </div>
          </section>

          <section class="geo-card control-section" v-if="activeFilter === 'all' || activeFilter === 'basins'">
            <h3 class="section-title">🏺 四大盆地</h3>
            <div class="terrain-list">
              <div v-for="b in basins" :key="b.name" class="terrain-item" :class="{ found: b.found, selected: selectedFeature?.name === b.name }" @click="selectFeature(b)">
                <span class="terrain-icon" style="color:#fbbf24">🏺</span>
                <div class="terrain-info"><span class="terrain-name">{{ b.name }}</span><span class="terrain-desc">{{ b.desc }}</span></div>
                <span class="terrain-check" v-if="b.found">✓</span>
                <span class="terrain-arrow" v-else-if="selectedFeature?.name === b.name">→</span>
              </div>
            </div>
          </section>

          <section class="geo-card control-section" v-if="activeFilter === 'all' || activeFilter === 'rivers'">
            <h3 class="section-title">🌊 主要河流</h3>
            <div class="terrain-list">
              <div v-for="r in rivers" :key="r.name" class="terrain-item" :class="{ found: r.found, selected: selectedFeature?.name === r.name }" @click="selectFeature(r)">
                <span class="terrain-icon" :style="{ color: getRiverColor(r.name) }">🌊</span>
                <div class="terrain-info"><span class="terrain-name">{{ r.name }}</span><span class="terrain-desc">{{ r.desc }}</span></div>
                <span class="terrain-check" v-if="r.found">✓</span>
                <span class="terrain-arrow" v-else-if="selectedFeature?.name === r.name">→</span>
              </div>
            </div>
          </section>
        </div>
        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>
        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">›</button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left" v-bind="leftEntryAttrs">›</button>
      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right" v-bind="rightEntryAttrs">‹</button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import '@/styles/geo-page-template.css'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const hasLeftPanel = false
const hasRightPanel = true

const {
  rootRef: pageRef, layoutMode,
  leftCollapsed, rightCollapsed, allPanelsCollapsed,
  draggingSide, viewportResizing,
  workspaceAttrs, leftPanelAttrs, rightPanelAttrs,
  leftResizeAttrs, rightResizeAttrs,
  leftCollapseAttrs, rightCollapseAttrs,
  leftEntryAttrs, rightEntryAttrs,
  setAllCollapsed, resetWidths, toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: { enabled: hasLeftPanel },
  right: { enabled: hasRightPanel },
  onLayoutChange(state) { if (!state.resizing) scheduleSceneResize(90) },
  onResize(payload) { if (payload.phase === 'end' || payload.phase === 'reset') scheduleSceneResize(0) },
})

// ==================== 地形数据（初中教材知识点） ====================
interface TerrainFeature {
  name: string; lat: number; lon: number; desc: string; type: 'mountain' | 'basin' | 'river'; found: boolean
  path?: [number, number][] // 河流路径
  area?: [number, number][] // 盆地轮廓多边形
  extent?: [number, number][] // 山脉走向线段 [起点, 终点]
}

const mountains = reactive<TerrainFeature[]>([
  { name: '天山山脉', lat: 42.5, lon: 85, desc: '新疆中部，南疆北疆分界', type: 'mountain', found: false, extent: [[42.5, 78], [42.5, 90]] },
  { name: '阴山山脉', lat: 41, lon: 107, desc: '内蒙古中部东西走向', type: 'mountain', found: false, extent: [[41, 104], [41, 112]] },
  { name: '昆仑山脉', lat: 36.5, lon: 82, desc: '新疆与西藏交界', type: 'mountain', found: false, extent: [[36.5, 76], [36.5, 91]] },
  { name: '秦岭', lat: 34, lon: 108, desc: '中国南北分界线', type: 'mountain', found: false, extent: [[34, 104], [34, 113]] },
  { name: '南岭', lat: 25, lon: 113, desc: '湖南、江西与广东交界', type: 'mountain', found: false, extent: [[25, 108], [25, 118]] },
  { name: '大兴安岭', lat: 50.5, lon: 123, desc: '内蒙古东北部', type: 'mountain', found: false, extent: [[53, 122], [48, 124]] },
  { name: '太行山脉', lat: 37.5, lon: 113.5, desc: '山西与河北交界', type: 'mountain', found: false, extent: [[39, 113.5], [35, 113.5]] },
  { name: '巫山', lat: 31, lon: 110, desc: '重庆与湖北交界', type: 'mountain', found: false, extent: [[32, 110], [30, 110]] },
  { name: '雪峰山', lat: 27.5, lon: 110, desc: '湖南西部', type: 'mountain', found: false, extent: [[29, 110], [26, 110]] },
  { name: '长白山脉', lat: 42, lon: 128, desc: '吉林东部中朝边境', type: 'mountain', found: false, extent: [[43, 128], [41, 130]] },
  { name: '武夷山脉', lat: 27.5, lon: 118, desc: '福建与江西交界', type: 'mountain', found: false, extent: [[29, 117.5], [26, 117.5]] },
  { name: '台湾山脉', lat: 23.5, lon: 121, desc: '台湾岛东部', type: 'mountain', found: false, extent: [[25.5, 121], [22.5, 121]] },
  { name: '横断山脉', lat: 30, lon: 100, desc: '川滇藏交界南北走向', type: 'mountain', found: false, extent: [[32, 99], [27, 99]] },
  { name: '阿尔泰山脉', lat: 47.5, lon: 88, desc: '新疆北部中俄边境', type: 'mountain', found: false, extent: [[49, 86], [46, 91]] },
  { name: '祁连山脉', lat: 38.5, lon: 99, desc: '甘肃与青海交界', type: 'mountain', found: false, extent: [[39, 95], [36.5, 103]] },
  { name: '贺兰山', lat: 38.5, lon: 106, desc: '宁夏西北部', type: 'mountain', found: false, extent: [[40, 106], [38, 106]] },
])

const basins = reactive<TerrainFeature[]>([
  { name: '塔里木盆地', lat: 40, lon: 85, desc: '中国最大盆地，位于新疆南部', type: 'basin', found: false, area: [[42,76],[42,90],[37,90],[37,76]] },
  { name: '准噶尔盆地', lat: 46, lon: 87, desc: '新疆北部，中国第二大盆地', type: 'basin', found: false, area: [[48,82],[48,92],[44,92],[44,82]] },
  { name: '柴达木盆地', lat: 37, lon: 95, desc: '青海省西北部，"聚宝盆"', type: 'basin', found: false, area: [[39,90],[39,99],[36,99],[36,90]] },
  { name: '四川盆地', lat: 30, lon: 105, desc: '四川省东部，"天府之国"', type: 'basin', found: false, area: [[32,102],[32,110],[28,110],[28,102]] },
])

const rivers = reactive<TerrainFeature[]>([
  { name: '长江', lat: 30.5, lon: 114, desc: '中国第一长河，注入东海', type: 'river', found: false, path: [[28, 96], [29, 100], [29.5, 103], [29.5, 106], [30, 110], [30.5, 114], [31, 117], [31.5, 119], [32, 121]] },
  { name: '黄河', lat: 37, lon: 112, desc: '中国第二长河，注入渤海', type: 'river', found: false, path: [[35, 96], [36, 100], [36, 103], [37, 106], [39, 108], [40, 110], [40, 112], [38, 114], [37, 116], [38, 118]] },
  { name: '珠江', lat: 23, lon: 113, desc: '南方最大河流，注入南海', type: 'river', found: false, path: [[24.5, 103], [24, 106], [23.5, 110], [23, 113], [22.5, 113.5]] },
  { name: '黑龙江', lat: 50, lon: 128, desc: '中俄界河，注入鄂霍次克海', type: 'river', found: false, path: [[53, 122], [52, 126], [49, 128], [48, 134]] },
  { name: '雅鲁藏布江', lat: 29, lon: 91, desc: '西藏最大河流，注入印度洋', type: 'river', found: false, path: [[30, 82], [29.5, 88], [29, 91], [28, 95], [27, 97]] },
  { name: '塔里木河', lat: 40, lon: 84, desc: '中国最长的内流河', type: 'river', found: false, path: [[37, 79], [39, 81], [41, 84], [40.5, 87]] },
])

const filterTypes = [
  { key: 'all', label: '全部' },
  { key: 'mountains', label: '山脉' },
  { key: 'basins', label: '盆地' },
  { key: 'rivers', label: '河流' },
]
const activeFilter = ref('all')
const selectedFeature = ref<TerrainFeature | null>(null)
const findingHint = ref('')
const showAllMode = ref(false)

// 河流 GeoJSON 坐标存储（用于距离判断）
const riverGeoJSONCoords: Record<string, [number, number][]> = {}
// 隐藏的标记（找到后显示）
const hiddenMarkers: Record<string, L.Marker | L.Polyline> = {}

const totalCount = { mountains: mountains.length, basins: basins.length, rivers: rivers.length }
const foundCount = computed(() => ({
  mountains: mountains.filter(m => m.found).length,
  basins: basins.filter(b => b.found).length,
  rivers: rivers.filter(r => r.found).length,
}))

// ==================== 简化中国轮廓线 ====================
const chinaOutline: [number, number][] = [
  [49.5, 87.5], [50, 92], [50.5, 97], [52, 105], [53, 115], [53.5, 122], [52.5, 124.5],
  [49, 125], [47, 130], [44, 131], [42.5, 130.5], [41, 128], [39.5, 125], [38, 124],
  [37, 126], [36, 129], [35.5, 131], [33, 130], [31, 122], [30, 121.5], [28, 121],
  [27, 120.5], [25, 119.5], [23.5, 118], [22, 116], [21.5, 112], [21, 108.5],
  [20, 110], [19, 110], [18, 109], [20.5, 108], [21.5, 106], [22.5, 104], [23.5, 105],
  [24, 103], [27, 100.5], [28, 98.5], [29, 97], [28, 92.5], [27.5, 88], [28, 85],
  [30, 82], [32, 79], [34, 78.5], [36, 76], [37, 75.5], [38.5, 74.5], [39, 73.5],
  [40, 74], [42, 80], [44, 80.5], [45, 82], [46.5, 84], [48, 85.5], [49.5, 87.5],
]

// ==================== Leaflet ====================
const leafletContainerRef = ref<HTMLElement | null>(null)
let leafletMap: L.Map | null = null
let tileLayer: L.TileLayer | null = null
let chinaOutlineLayer: L.GeoJSON | L.Polygon | null = null
let featureMarkers: L.Marker[] = []
let riverLayers: L.Polyline[] = []
let highlightMarker: L.CircleMarker | null = null
let hintLayer: L.Circle | L.Polygon | null = null
const contourLayers: (L.Polygon | L.Polyline)[] = []
let leafletResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

const ARCGIS_TILE_URL = '/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png'

// ==================== 中国轮廓线加载 ====================
// 为 Leaflet SVG path 应用主题渐变描边
function applyGradientStroke(layer: L.GeoJSON | L.Polygon) {
  const layerAny = layer as any
  const container = (layerAny.getElement?.() ?? null) as SVGElement | null
  const paths: SVGElement[] = []
  if (container) {
    if (container.tagName === 'path') paths.push(container)
    else container.querySelectorAll?.('path').forEach(p => paths.push(p as SVGElement))
  }
  if (!paths.length) return
  const svg = paths[0]!.ownerSVGElement
  if (!svg) return
  // 创建渐变定义
  let defs = svg.querySelector('defs')
  if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); svg.insertBefore(defs, svg.firstChild) }
  // 避免重复创建
  if (defs.querySelector('#china-gradient-stroke')) return
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
  grad.setAttribute('id', 'china-gradient-stroke')
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%')
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%')
  const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#2ec4b6')
  const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#247cff')
  grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad)
  // 应用渐变描边到所有 path
  paths.forEach(p => {
    p.setAttribute('stroke', 'url(#china-gradient-stroke)')
    p.setAttribute('stroke-width', '4')
  })
}

async function loadChinaOutline() {
  if (!leafletMap) return
  try {
    const res = await fetch('/geo-resources-folder/geojson/中国矢量数据/中国轮廓线.geojson')
    if (!res.ok) throw new Error('GeoJSON 文件不存在')
    const data = await res.json()
    chinaOutlineLayer = L.geoJSON(data, {
      style() {
        return {
          color: '#2ec4b6', weight: 4, opacity: 0.9,
          fillColor: '#2ec4b6', fillOpacity: 0.04,
        }
      },
    })
    chinaOutlineLayer.addTo(leafletMap)
    applyGradientStroke(chinaOutlineLayer)
  } catch {
    // 后备：使用简化多边形
    chinaOutlineLayer = L.polygon(chinaOutline, {
      color: '#2ec4b6', weight: 4, opacity: 0.9,
      fillColor: '#2ec4b6', fillOpacity: 0.04,
    })
    chinaOutlineLayer.addTo(leafletMap)
    applyGradientStroke(chinaOutlineLayer as L.Polygon)
  }
}

// ==================== 初始化 ====================
async function initScene() {
  const container = leafletContainerRef.value
  if (!container) return

  leafletMap = L.map(container, {
    center: [35, 105], zoom: 4, minZoom: 3, maxZoom: 8,
    zoomControl: true, attributionControl: false,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
  })

  tileLayer = L.tileLayer(ARCGIS_TILE_URL, { minZoom: 0, maxZoom: 8, maxNativeZoom: 8, opacity: 1, noWrap: true })
  tileLayer.addTo(leafletMap)

  // 中国轮廓线 — 优先从 GeoJSON 文件加载，失败则用简化多边形
  await loadChinaOutline()

  // 审图号
  const ApprovalControl = L.Control.extend({
    onAdd() {
      const el = L.DomUtil.create('div', 'map-approval-number')
      el.textContent = 'GS(2025)5996'
      el.style.cssText = 'font-size:12px;color:#666;background:rgba(255,255,255,0.8);padding:2px 6px;border-radius:3px;white-space:nowrap;'
      return el
    },
  })
  new ApprovalControl({ position: 'bottomleft' }).addTo(leafletMap)

  // 比例尺
  L.control.scale({ imperial: false, position: 'bottomright' }).addTo(leafletMap)

  // 地形标记
  addTerrainMarkers()

  leafletResizeObserver = new ResizeObserver(() => scheduleSceneResize(110))
  leafletResizeObserver.observe(container)
  scheduleSceneResize(0)
}

// ==================== 地形标记（初始隐藏，找到后显示） ====================
function createIcon(emoji: string, color: string) {
  return L.divIcon({
    html: `<div style="font-size:20px;line-height:1;text-shadow:0 0 3px ${color};cursor:pointer;">${emoji}</div>`,
    className: 'terrain-div-icon', iconSize: [24, 24], iconAnchor: [12, 12],
  })
}

// 生成锯齿状路径（让山脉走向线不那么平滑）
function generateZigzagExtent(extent: [number, number][]): [number, number][] {
  if (extent.length < 2) return extent
  const [start, end] = extent
  const lat1 = start![0], lon1 = start![1]
  const lat2 = end![0], lon2 = end![1]
  const dLat = lat2 - lat1, dLon = lon2 - lon1
  const length = Math.sqrt(dLat * dLat + dLon * dLon)
  if (length < 1) return extent
  const pLat = -dLon / length, pLon = dLat / length
  const offsetMag = Math.min(1.2, length * 0.07)
  const numSeg = Math.max(4, Math.min(8, Math.round(length / 2)))
  const points: [number, number][] = [[lat1, lon1]]
  for (let i = 1; i < numSeg; i++) {
    const t = i / numSeg
    const baseLat = lat1 + dLat * t
    const baseLon = lon1 + dLon * t
    const sign = i % 2 === 1 ? 1 : -1
    points.push([baseLat + pLat * offsetMag * sign, baseLon + pLon * offsetMag * sign])
  }
  points.push([lat2, lon2])
  return points
}

// 将角度 snap 到最近的 45° 增量（让箭头方向不那么平滑）
function snapAngle45(angle: number): number {
  return Math.round(angle / 45) * 45
}

// 获取河流专属颜色（黄河用金色，其余用蓝色）
function getRiverColor(name: string): string {
  if (name === '黄河') return '#facc15'
  return '#60a5fa'
}

function addTerrainMarkers() {
  if (!leafletMap) return
  // 山脉标记 — 初始隐藏（图标与右面板一致 🏔）
  mountains.forEach(m => {
    const marker = L.marker([m.lat, m.lon], { icon: createIcon('🏔', '#ef4444') })
    marker.bindPopup(`<b style="color:#ef4444">${m.name}</b><br><span style="font-size:12px;color:#666">${m.desc}</span>`)
    marker.on('click', () => { m.found = true })
    marker.addTo(leafletMap!)
    marker.setOpacity(0) // 初始隐藏
    hiddenMarkers[m.name] = marker
  })
  // 盆地标记 — 初始隐藏（图标与右面板一致 🏺）
  basins.forEach(b => {
    const marker = L.marker([b.lat, b.lon], { icon: createIcon('🏺', '#fbbf24') })
    marker.bindPopup(`<b style="color:#fbbf24">${b.name}</b><br><span style="font-size:12px;color:#666">${b.desc}</span>`)
    marker.on('click', () => { b.found = true })
    marker.addTo(leafletMap!)
    marker.setOpacity(0)
    hiddenMarkers[b.name] = marker
  })
  // 河流 — 先加载 GeoJSON，其余用简化路径
  loadRivers()
}

// ==================== 河流 GeoJSON 加载 ====================
async function loadRivers() {
  if (!leafletMap) return
  // 长江、黄河从 GeoJSON 加载
  const geojsonRivers = [
    { name: '长江', url: '/geo-resources-folder/geojson/中国矢量数据/长江.geojson', color: '#60a5fa' },
    { name: '黄河', url: '/geo-resources-folder/geojson/中国矢量数据/黄河.geojson', color: '#facc15' },
  ]
  for (const gr of geojsonRivers) {
    try {
      const res = await fetch(gr.url)
      if (!res.ok) throw new Error(`${gr.name} GeoJSON 不存在`)
      const data = await res.json()
      const feature = data.features?.[0]
      if (feature?.geometry?.coordinates) {
        // GeoJSON 坐标为 [lon, lat]，转换为 [lat, lon]
        const coords: [number, number][] = feature.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])
        riverGeoJSONCoords[gr.name] = coords
        // 更新 rivers 数据中的 path
        const river = rivers.find(r => r.name === gr.name)
        if (river) river.path = coords
        // 创建折线（始终显示为参考细线）
        const line = L.polyline(coords, { color: gr.color, weight: 2, opacity: 0.35 })
        line.bindPopup(`<b style="color:${gr.color}">${gr.name}</b><br><span style="font-size:12px;color:#666">${river?.desc || ''}</span>`)
        line.on('click', () => { if (river) river.found = true })
        line.addTo(leafletMap!)
        hiddenMarkers[gr.name] = line
      }
    } catch {
      // 后备：使用简化路径
      const river = rivers.find(r => r.name === gr.name)
      if (river && (river.path?.length ?? 0) > 0) {
        const line = L.polyline(river.path!, { color: gr.color, weight: 2, opacity: 0.35 })
        line.addTo(leafletMap!)
        hiddenMarkers[gr.name] = line
      }
    }
  }
  // 其余河流用简化路径
  rivers.forEach(r => {
    if ((r.path?.length ?? 0) > 0 && !hiddenMarkers[r.name] && leafletMap) {
      const line = L.polyline(r.path!, { color: getRiverColor(r.name), weight: 2, opacity: 0.35 })
      line.bindPopup(`<b style="color:${getRiverColor(r.name)}">${r.name}</b><br><span style="font-size:12px;color:#666">${r.desc}</span>`)
      line.on('click', () => { r.found = true })
      line.addTo(leafletMap!)
      hiddenMarkers[r.name] = line
    }
    // 河流图标标记 — 🌊（初始隐藏，与右面板一致）
    if (leafletMap && !hiddenMarkers[r.name + '_icon']) {
      const riverIcon = L.marker([r.lat, r.lon], { icon: createIcon('🌊', getRiverColor(r.name)), zIndexOffset: 900 })
      riverIcon.bindPopup(`<b style="color:${getRiverColor(r.name)}">${r.name}</b><br><span style="font-size:12px;color:#666">${r.desc}</span>`)
      riverIcon.on('click', () => { r.found = true })
      riverIcon.addTo(leafletMap)
      riverIcon.setOpacity(0)
      hiddenMarkers[r.name + '_icon'] = riverIcon
    }
    // 河流名称标记（初始隐藏）
    if (leafletMap && (r.path?.length ?? 0) === 0) return // 等待 GeoJSON
    const marker = L.marker([r.lat, r.lon], { icon: L.divIcon({ html: `<div style="font-size:11px;color:${getRiverColor(r.name)};font-weight:700;text-shadow:0 0 3px ${getRiverColor(r.name)};white-space:nowrap;">🌊 ${r.name}</div>`, className: 'river-label-icon', iconSize: [80, 16], iconAnchor: [40, 8] }) })
    marker.on('click', () => { r.found = true })
    marker.addTo(leafletMap!)
    marker.setOpacity(0)
    hiddenMarkers[r.name + '_label'] = marker
  })
}

// ==================== 自主查找模式 ====================
function selectFeature(f: TerrainFeature) {
  if (f.found) return
  selectedFeature.value = f
  findingHint.value = `请在地图上点击「${f.name}」的大致位置`
  if (!leafletMap) return
  // 清除上一次提示
  if (hintLayer) { hintLayer.remove(); hintLayer = null }
  // 显示搜索提示区域（半透明圆）
  hintLayer = L.circle([f.lat, f.lon], {
    radius: 300000, // 300km
    color: '#fbbf24', weight: 2, opacity: 0.5,
    fillColor: '#fbbf24', fillOpacity: 0.08,
    dashArray: '6 4',
  })
  hintLayer.addTo(leafletMap)
  // 启用地图点击查找
  leafletMap.on('click', onMapClickFind)
}

function onMapClickFind(e: L.LeafletMouseEvent) {
  const f = selectedFeature.value
  if (!f || !leafletMap) return
  const clickLat = e.latlng.lat; const clickLon = e.latlng.lng
  let isCorrect = false

  if (f.type === 'river' && (f.path?.length ?? 0) > 0) {
    // 河流：检查点击位置是否靠近河流路径任一点
    const threshold = 2.5 // 度
    isCorrect = f.path!.some(([plat, plon]) => {
      const dLat = plat - clickLat; const dLon = plon - clickLon
      return Math.sqrt(dLat * dLat + dLon * dLon) < threshold
    })
  } else {
    // 山脉/盆地：检查点击位置是否靠近实际位置
    const threshold = 3.5 // 度
    const dLat = f.lat - clickLat; const dLon = f.lon - clickLon
    isCorrect = Math.sqrt(dLat * dLat + dLon * dLon) < threshold
  }

  if (isCorrect) {
    f.found = true
    findingHint.value = `✅ 正确！「${f.name}」已找到`
    // 清除搜索提示区域
    if (hintLayer) { hintLayer.remove(); hintLayer = null }
    // 显示该地形的标记和区域轮廓
    showFeatureMarker(f)
    showAreaContour(f)
    // 高亮
    if (highlightMarker) highlightMarker.remove()
    highlightMarker = L.circleMarker([f.lat, f.lon], { radius: 20, color: '#2ec4b6', weight: 3, fillOpacity: 0, dashArray: '4 4' })
    highlightMarker.addTo(leafletMap)
    setTimeout(() => { if (highlightMarker) { highlightMarker.remove(); highlightMarker = null } }, 3000)
    // 清除选中
    selectedFeature.value = null
    leafletMap.off('click', onMapClickFind)
    setTimeout(() => { findingHint.value = '' }, 2500)
  } else {
    findingHint.value = `❌ 不太对哦，再试试找「${f.name}」的位置`
  }
}

// 显示区域轮廓 — 山脉：箭头走向 / 盆地：圈出范围 / 河流：粗线
function showAreaContour(f: TerrainFeature) {
  if (!leafletMap) return
  const color = f.type === 'mountain' ? '#ef4444' : f.type === 'basin' ? '#fbbf24' : getRiverColor(f.name)
  const name = f.name; const desc = f.desc

  if (f.type === 'mountain') {
    // 山脉：沿走向绘制箭头线段
    drawMountainArrows(f, color, name, desc)
  } else if (f.type === 'river') {
    // 河流：粗线已由 showFeatureMarker 显示，此处加缓冲带 + 流向箭头 + 🌊 图标
    const coords = f.path
    if ((coords?.length ?? 0) > 0) {
      const color = getRiverColor(f.name)
      // 缓冲区（范围带）
      const buffer = L.polyline(coords!, {
        color, weight: 12, opacity: 0.12,
      })
      buffer.addTo(leafletMap)
      contourLayers.push(buffer as any)
      // 沿路径放置流向箭头 + 🌊 图标
      drawRiverFlowArrows(coords!, color)
    }
  } else if (f.type === 'basin' && (f.area?.length ?? 0) > 0) {
    // 盆地：圈出范围 + 🏺 图标 + 流向箭头（指向中心，表示地势内倾）
    const contour = L.polygon(f.area!, {
      color, weight: 3.5, opacity: 0.9,
      fillColor: color, fillOpacity: 0.18,
      dashArray: '5 3',
    })
    contour.bindPopup(`<b style="color:${color}">${name}</b><br><span style="font-size:12px;color:#666">${desc}</span>`)
    contour.addTo(leafletMap)
    contourLayers.push(contour)
    drawBasinDirectionArrows(f.area!, color)
  }
}

// 山脉走向：锯齿状线段 + 🏔 图标 + ▶ 方向箭头
function drawMountainArrows(f: TerrainFeature, color: string, name: string, desc: string) {
  if (!leafletMap || !f.extent || f.extent.length < 2) return
  const lat1 = f.extent[0]![0]; const lon1 = f.extent[0]![1]
  const lat2 = f.extent[1]![0]; const lon2 = f.extent[1]![1]
  // 生成锯齿状走向路径（不那么平滑）
  const zigzagPath = generateZigzagExtent(f.extent)
  // 走向基准线（锯齿状虚线）
  const baseLine = L.polyline(zigzagPath, {
    color, weight: 3.5, opacity: 0.85, dashArray: '8 4',
  })
  baseLine.bindPopup(`<b style="color:${color}">${name}</b><br><span style="font-size:12px;color:#666">${desc}</span>`)
  baseLine.addTo(leafletMap)
  contourLayers.push(baseLine as any)
  // 计算总体走向角度（snap到45°，不那么平滑）
  const arrowAngle = snapAngle45(Math.atan2(lon2 - lon1, lat2 - lat1) * (180 / Math.PI))
  // 沿路径放置 🏔 图标（与右侧面板一致）
  const numEmoji = 3
  for (let i = 0; i < numEmoji; i++) {
    const t = (i + 1) / (numEmoji + 1)
    const idx = Math.min(Math.floor(t * (zigzagPath.length - 1)), zigzagPath.length - 1)
    const [elat, elon] = zigzagPath[idx]!
    const emojiIcon = L.divIcon({
      html: `<div style="font-size:18px;color:${color};text-shadow:0 0 4px ${color};line-height:1;">🏔</div>`,
      className: 'mountain-emoji-icon', iconSize: [22, 22], iconAnchor: [11, 11],
    })
    const emojiMarker = L.marker([elat, elon], { icon: emojiIcon, interactive: false })
    emojiMarker.addTo(leafletMap); contourLayers.push(emojiMarker as any)
  }
  // 沿路径放置 ▶ 方向箭头（snap到45°方向）
  const numArrows = 5
  for (let i = 0; i < numArrows; i++) {
    const t = (i + 0.5) / numArrows
    const idx = Math.min(Math.floor(t * (zigzagPath.length - 1)), zigzagPath.length - 1)
    const [alat, alon] = zigzagPath[idx]!
    const arrowIcon = L.divIcon({
      html: `<div style="font-size:13px;color:${color};transform:rotate(${arrowAngle}deg);text-shadow:0 0 3px ${color};line-height:1;">▶</div>`,
      className: 'mountain-arrow-icon', iconSize: [18, 18], iconAnchor: [9, 9],
    })
    const arrowMarker = L.marker([alat, alon], { icon: arrowIcon, interactive: false })
    arrowMarker.addTo(leafletMap); contourLayers.push(arrowMarker as any)
  }
}

// 河流流向：粗线 + 🌊 图标 + ▶ 流向箭头（snap到45°）
function drawRiverFlowArrows(coords: [number, number][], color: string) {
  if (!leafletMap || coords.length < 2) return
  // 沿路径放置 🌊 图标（与右侧面板一致）
  const numEmoji = Math.min(3, coords.length - 1)
  for (let i = 0; i < numEmoji; i++) {
    const t = (i + 1) / (numEmoji + 1)
    const idx = Math.min(Math.floor(t * (coords.length - 1)), coords.length - 1)
    const [elat, elon] = coords[idx]!
    const emojiIcon = L.divIcon({
      html: `<div style="font-size:16px;color:${color};text-shadow:0 0 4px ${color};line-height:1;">🌊</div>`,
      className: 'river-emoji-icon', iconSize: [20, 20], iconAnchor: [10, 10],
    })
    const emojiMarker = L.marker([elat, elon], { icon: emojiIcon, interactive: false })
    emojiMarker.addTo(leafletMap); contourLayers.push(emojiMarker as any)
  }
  // 沿路径放置 ▶ 流向箭头（snap到45°方向）
  const numArrows = Math.min(8, coords.length - 1)
  for (let i = 0; i < numArrows; i++) {
    const idx = Math.floor((i + 0.5) * (coords.length - 1) / numArrows)
    if (idx >= coords.length - 1) continue
    const [lat1, lon1] = coords[idx]!
    const [lat2, lon2] = coords[idx + 1]!
    const angle = snapAngle45(Math.atan2(lon2 - lon1, lat2 - lat1) * (180 / Math.PI))
    const arrowIcon = L.divIcon({
      html: `<div style="font-size:12px;color:${color};transform:rotate(${angle}deg);text-shadow:0 0 3px ${color};line-height:1;">▶</div>`,
      className: 'river-arrow-icon', iconSize: [16, 16], iconAnchor: [8, 8],
    })
    const arrowMarker = L.marker([lat1, lon1], { icon: arrowIcon, interactive: false })
    arrowMarker.addTo(leafletMap); contourLayers.push(arrowMarker as any)
  }
}

// 盆地流向：边界内指箭头（表示地势向中心倾斜）+ 🏺 图标
function drawBasinDirectionArrows(area: [number, number][], color: string) {
  if (!leafletMap || area.length < 3) return
  const centerLat = area.reduce((s, p) => s + p[0], 0) / area.length
  const centerLon = area.reduce((s, p) => s + p[1], 0) / area.length
  // 沿边界放置 🏺 图标
  const numEmoji = Math.min(4, area.length)
  for (let i = 0; i < numEmoji; i++) {
    const idx = Math.floor((i + 0.5) * area.length / numEmoji) % area.length
    const [elat, elon] = area[idx]!
    const emojiIcon = L.divIcon({
      html: `<div style="font-size:14px;color:${color};text-shadow:0 0 4px ${color};line-height:1;">🏺</div>`,
      className: 'basin-emoji-icon', iconSize: [18, 18], iconAnchor: [9, 9],
    })
    const emojiMarker = L.marker([elat, elon], { icon: emojiIcon, interactive: false })
    emojiMarker.addTo(leafletMap); contourLayers.push(emojiMarker as any)
  }
  // 在每条边界中点放置指向中心的 ▶ 箭头（snap到45°）
  for (let i = 0; i < area.length; i++) {
    const next = (i + 1) % area.length
    const midLat = (area[i]![0] + area[next]![0]) / 2
    const midLon = (area[i]![1] + area[next]![1]) / 2
    const angle = snapAngle45(Math.atan2(centerLon - midLon, centerLat - midLat) * (180 / Math.PI))
    const arrowIcon = L.divIcon({
      html: `<div style="font-size:11px;color:${color};transform:rotate(${angle}deg);text-shadow:0 0 2px ${color};line-height:1;">▶</div>`,
      className: 'basin-arrow-icon', iconSize: [14, 14], iconAnchor: [7, 7],
    })
    const arrowMarker = L.marker([midLat, midLon], { icon: arrowIcon, interactive: false })
    arrowMarker.addTo(leafletMap); contourLayers.push(arrowMarker as any)
  }
}

function showFeatureMarker(f: TerrainFeature) {
  const marker = hiddenMarkers[f.name]
  if (marker) {
    if (marker instanceof L.Marker) {
      marker.setOpacity(1)
      // 山脉/盆地/河流找到后添加辉光标注圆
      addFoundGlow(f)
    } else if (marker instanceof L.Polyline) {
      // 河流路径：粗实线展现，使用河流专属颜色
      marker.setStyle({ opacity: 0.85, weight: 5, dashArray: '', color: getRiverColor(f.name) })
      addFoundGlow(f)
    }
  }
  // 河流图标标记（🌊，与右面板一致）
  const riverIcon = hiddenMarkers[f.name + '_icon']
  if (riverIcon instanceof L.Marker) riverIcon.setOpacity(1)
  // 文字标签
  const label = hiddenMarkers[f.name + '_label']
  if (label instanceof L.Marker) label.setOpacity(1)
}

// 为已找到的地形添加辉光 + 文字标牌
const foundGlowLayers: L.Circle[] = []
function addFoundGlow(f: TerrainFeature) {
  if (!leafletMap) return
  const color = f.type === 'mountain' ? '#ef4444' : f.type === 'basin' ? '#fbbf24' : getRiverColor(f.name)
  // 辉光圈
  const glow = L.circle([f.lat, f.lon], {
    radius: 120000,
    color, weight: 2, opacity: 0.6, fillOpacity: 0,
    dashArray: '3 3',
  })
  glow.addTo(leafletMap)
  foundGlowLayers.push(glow)
  // 文字标牌（地图中央标注名称，含图标）
  const emoji = f.type === 'mountain' ? '🏔' : f.type === 'basin' ? '🏺' : '🌊'
  const labelIcon = L.divIcon({
    html: `<div style="
      font-size:13px;font-weight:800;color:${color};white-space:nowrap;
      text-shadow: 0 0 4px ${color};
      background:rgba(0,0,0,.3);padding:2px 8px;border-radius:4px;
      border:1px solid ${color};letter-spacing:1px;
    ">${emoji} ${f.name}</div>`,
    className: 'found-label-icon',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
  const labelMarker = L.marker([f.lat, f.lon], { icon: labelIcon, zIndexOffset: 1000 })
  labelMarker.addTo(leafletMap)
  foundGlowLayers.push(labelMarker as any)
}

// 展示全部地形
let showAllContours: (L.Polygon | L.Polyline | L.Marker)[] = []
function toggleShowAll(on: boolean) {
  if (!leafletMap) return
  // 清除展示模式的轮廓
  showAllContours.forEach(c => c.remove()); showAllContours = []
  const allFeatures = [...mountains, ...basins, ...rivers]
  allFeatures.forEach(f => {
    const marker = hiddenMarkers[f.name]
    const label = hiddenMarkers[f.name + '_label']
    const riverIcon = hiddenMarkers[f.name + '_icon']
    if (on) {
      // 显示全部
      if (marker) {
        if (marker instanceof L.Marker) marker.setOpacity(1)
        else if (marker instanceof L.Polyline) {
          marker.setStyle({ opacity: 0.8, ...(f.type === 'river' ? { weight: 4, dashArray: '', color: getRiverColor(f.name) } : {}) })
        }
      }
      if (riverIcon instanceof L.Marker) riverIcon.setOpacity(1)
      if (label instanceof L.Marker) label.setOpacity(1)
      // 山脉：锯齿状走向线 + 🏔 图标 + ▶ 箭头
      if (f.type === 'mountain' && (f.extent?.length ?? 0) >= 2) {
        const color = '#ef4444'
        const ext = f.extent!
        const sLat = ext[0]![0]; const sLon = ext[0]![1]
        const eLat = ext[1]![0]; const eLon = ext[1]![1]
        const zigzag = generateZigzagExtent(ext)
        const baseLine = L.polyline(zigzag, { color, weight: 2, opacity: 0.55, dashArray: '6 3' })
        baseLine.addTo(leafletMap!); showAllContours.push(baseLine)
        const arrowAngle = snapAngle45(Math.atan2(eLon - sLon, eLat - sLat) * (180 / Math.PI))
        // 🏔 图标沿走向分布
        const numEmoji = 2
        for (let i = 0; i < numEmoji; i++) {
          const t = (i + 1) / (numEmoji + 1)
          const idx = Math.min(Math.floor(t * (zigzag.length - 1)), zigzag.length - 1)
          const [elat, elon] = zigzag[idx]!
          const eIcon = L.divIcon({
            html: `<div style="font-size:14px;color:${color};text-shadow:0 0 3px ${color};line-height:1;">🏔</div>`,
            className: 'mountain-emoji-icon', iconSize: [18, 18], iconAnchor: [9, 9],
          })
          const em = L.marker([elat, elon], { icon: eIcon, interactive: false })
          em.addTo(leafletMap!); showAllContours.push(em)
        }
        // ▶ 方向箭头（snap到45°）
        const numArrows = 4
        for (let i = 0; i < numArrows; i++) {
          const t = (i + 0.5) / numArrows
          const idx = Math.min(Math.floor(t * (zigzag.length - 1)), zigzag.length - 1)
          const [al, an] = zigzag[idx]!
          const icon = L.divIcon({
            html: `<div style="font-size:11px;color:${color};transform:rotate(${arrowAngle}deg);text-shadow:0 0 2px ${color};line-height:1;">▶</div>`,
            className: 'mountain-arrow-icon', iconSize: [14, 14], iconAnchor: [7, 7],
          })
          const am = L.marker([al, an], { icon, interactive: false })
          am.addTo(leafletMap!); showAllContours.push(am)
        }
      }
      // 盆地：圈出范围 + 🏺 图标 + 流向箭头
      if (f.type === 'basin' && (f.area?.length ?? 0) > 0) {
        const color = '#fbbf24'
        const area = f.area!
        const contour = L.polygon(area, { color, weight: 2, opacity: 0.5, fillColor: color, fillOpacity: 0.07, dashArray: '4 3' })
        contour.addTo(leafletMap!)
        showAllContours.push(contour)
        const centerLat = area.reduce((s, p) => s + p[0], 0) / area.length
        const centerLon = area.reduce((s, p) => s + p[1], 0) / area.length
        // 🏺 图标沿边界分布
        const numEmoji = Math.min(2, area.length)
        for (let i = 0; i < numEmoji; i++) {
          const idx = Math.floor((i + 0.5) * area.length / numEmoji) % area.length
          const [elat, elon] = area[idx]!
          const eIcon = L.divIcon({
            html: `<div style="font-size:12px;color:${color};text-shadow:0 0 3px ${color};line-height:1;">🏺</div>`,
            className: 'basin-emoji-icon', iconSize: [16, 16], iconAnchor: [8, 8],
          })
          const em = L.marker([elat, elon], { icon: eIcon, interactive: false })
          em.addTo(leafletMap!); showAllContours.push(em)
        }
        // ▶ 指向中心的流向箭头（snap到45°）
        for (let i = 0; i < area.length; i++) {
          const next = (i + 1) % area.length
          const midLat = (area[i]![0] + area[next]![0]) / 2
          const midLon = (area[i]![1] + area[next]![1]) / 2
          const angle = snapAngle45(Math.atan2(centerLon - midLon, centerLat - midLat) * (180 / Math.PI))
          const icon = L.divIcon({
            html: `<div style="font-size:9px;color:${color};transform:rotate(${angle}deg);text-shadow:0 0 2px ${color};line-height:1;">▶</div>`,
            className: 'basin-arrow-icon', iconSize: [12, 12], iconAnchor: [6, 6],
          })
          const am = L.marker([midLat, midLon], { icon, interactive: false })
          am.addTo(leafletMap!); showAllContours.push(am)
        }
      }
      // 河流：粗线已由 hiddenMarkers 显示，此处加 🌊 图标 + ▶ 流向箭头
      if (f.type === 'river' && (f.path?.length ?? 0) > 0) {
        const color = getRiverColor(f.name)
        const coords = f.path!
        // 🌊 图标沿河流分布
        const numEmoji = Math.min(2, coords.length - 1)
        for (let i = 0; i < numEmoji; i++) {
          const t = (i + 1) / (numEmoji + 1)
          const idx = Math.min(Math.floor(t * (coords.length - 1)), coords.length - 1)
          const [elat, elon] = coords[idx]!
          const eIcon = L.divIcon({
            html: `<div style="font-size:14px;color:${color};text-shadow:0 0 3px ${color};line-height:1;">🌊</div>`,
            className: 'river-emoji-icon', iconSize: [18, 18], iconAnchor: [9, 9],
          })
          const em = L.marker([elat, elon], { icon: eIcon, interactive: false })
          em.addTo(leafletMap!); showAllContours.push(em)
        }
        // ▶ 流向箭头（snap到45°）
        const numArrows = Math.min(5, coords.length - 1)
        for (let i = 0; i < numArrows; i++) {
          const idx = Math.floor((i + 0.5) * (coords.length - 1) / numArrows)
          if (idx >= coords.length - 1) continue
          const [lat1, lon1] = coords[idx]!
          const [lat2, lon2] = coords[idx + 1]!
          const angle = snapAngle45(Math.atan2(lon2 - lon1, lat2 - lat1) * (180 / Math.PI))
          const icon = L.divIcon({
            html: `<div style="font-size:10px;color:${color};transform:rotate(${angle}deg);text-shadow:0 0 2px ${color};line-height:1;">▶</div>`,
            className: 'river-arrow-icon', iconSize: [12, 12], iconAnchor: [6, 6],
          })
          const am = L.marker([lat1, lon1], { icon, interactive: false })
          am.addTo(leafletMap!); showAllContours.push(am)
        }
      }
    } else {
      // 隐藏未找到的
      if (!f.found) {
        if (marker) {
        if (marker instanceof L.Marker) marker.setOpacity(0)
        else if (marker instanceof L.Polyline) {
          // 未找到河流仍保留细线可见
          if (f.type === 'river') marker.setStyle({ opacity: 0.35, weight: 2, color: getRiverColor(f.name) })
          else marker.setStyle({ opacity: 0 })
        }
        }
        if (riverIcon instanceof L.Marker) riverIcon.setOpacity(0)
        if (label instanceof L.Marker) label.setOpacity(0)
      }
    }
  })
}

// ==================== Resize ====================
function resizeLeafletNow() {
  const container = leafletContainerRef.value
  if (!leafletMap || !container) return
  const w = Math.max(1, Math.round(container.clientWidth)); const h = Math.max(1, Math.round(container.clientHeight))
  if (w === lastSceneWidth && h === lastSceneHeight) return
  lastSceneWidth = w; lastSceneHeight = h
  leafletMap.invalidateSize({ animate: false, pan: false })
}
function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) clearTimeout(sceneResizeTimer)
  cancelAnimationFrame(sceneResizeFrame); cancelAnimationFrame(sceneResizeSettleFrame)
  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null
    if (draggingSide.value || viewportResizing.value) return
    sceneResizeFrame = requestAnimationFrame(() => { sceneResizeSettleFrame = requestAnimationFrame(() => resizeLeafletNow()) })
  }, delay)
}

// ==================== 生命周期 ====================
onMounted(async () => { await nextTick(); initScene() })

onBeforeUnmount(() => {
  if (sceneResizeTimer) { clearTimeout(sceneResizeTimer); sceneResizeTimer = null }
  leafletMap?.off('click', onMapClickFind)
  if (hintLayer) { hintLayer.remove(); hintLayer = null }
  contourLayers.forEach(l => l.remove()); contourLayers.length = 0
  foundGlowLayers.forEach(l => l.remove()); foundGlowLayers.length = 0
  showAllContours.forEach(l => l.remove()); showAllContours = []
  cancelAnimationFrame(sceneResizeFrame); cancelAnimationFrame(sceneResizeSettleFrame)
  leafletResizeObserver?.disconnect(); leafletResizeObserver = null
  featureMarkers.forEach(m => m.remove()); featureMarkers = []
  riverLayers.forEach(l => l.remove()); riverLayers = []
  if (highlightMarker) { highlightMarker.remove(); highlightMarker = null }
  chinaOutlineLayer?.remove(); chinaOutlineLayer = null
  leafletMap?.remove(); leafletMap = null; tileLayer = null
})
</script>

<style scoped>
.page-subtitle { font-size: 13px; color: #64748b; font-weight: 400; margin-left: 10px; letter-spacing: 1px; }
.map-hint { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 10; font-size: 12px; color: #94a3b8; background: rgba(10,22,40,0.8); padding: 4px 14px; border-radius: 999px; border: 1px solid rgba(46,196,182,0.25); pointer-events: none; }

.filter-buttons { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; }
.filter-buttons .option-btn { font-size: 11px; padding: 5px 4px; }

.find-progress { display: flex; flex-direction: column; gap: 6px; }
.progress-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #94a3b8; transition: all 0.3s ease; }
.progress-item .progress-icon { font-size: 18px; transition: all 0.3s ease; }
.progress-item.has-found .progress-icon {
  transform: scale(1.2);
  filter: drop-shadow(0 0 6px currentColor);
}
.progress-item.completed { color: #2ec4b6; }
.progress-item.completed .progress-icon {
  filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor);
}
.progress-item strong { color: #2ec4b6; font-size: 16px; min-width: 24px; text-align: right; }

.terrain-list { display: flex; flex-direction: column; gap: 4px; }
.terrain-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(8,12,28,0.5); border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
.terrain-item:hover { background: rgba(46,196,182,0.1); border-color: rgba(46,196,182,0.3); }
.terrain-item.found { background: rgba(46,196,182,0.15); border-color: rgba(46,196,182,0.4); }
.terrain-item.found .terrain-icon {
  transform: scale(1.25);
  filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 16px currentColor);
}
.terrain-item.selected { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.5); box-shadow: 0 0 8px rgba(251,191,36,0.2); }
.terrain-arrow { color: #fbbf24; font-size: 16px; font-weight: 700; flex-shrink: 0; animation: bounce-right 0.6s infinite alternate; }
@keyframes bounce-right { from { transform: translateX(0); } to { transform: translateX(3px); } }
.map-hint.finding { color: #fbbf24; border-color: rgba(251,191,36,0.4); background: rgba(40,30,10,0.85); }
.terrain-icon { font-size: 20px; flex-shrink: 0; font-weight: 700; transition: all 0.3s ease; }
.terrain-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.terrain-name { font-size: 13px; color: #cbd5e1; font-weight: 600; }
.terrain-desc { font-size: 10px; color: #64748b; }
.terrain-check { color: #2ec4b6; font-size: 16px; font-weight: 700; flex-shrink: 0; }

.find-terrain-container .three-canvas { display: block; width: 100% !important; height: 100% !important; }
.find-terrain-container .leaflet-host { width: 100%; height: 100%; }
.find-terrain-container .workspace.panel-resizing,
.find-terrain-container .workspace.layout-resizing,
.find-terrain-container .workspace.panel-resizing .side-panel,
.find-terrain-container .workspace.layout-resizing .side-panel,
.find-terrain-container .workspace.panel-resizing .center-stage,
.find-terrain-container .workspace.layout-resizing .center-stage { transition: none !important; }
</style>
