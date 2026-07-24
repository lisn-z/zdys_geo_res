<template>
  <div ref="pageRef" class="find-terrain-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>
      <h1 class="page-title">找地形 <span class="page-subtitle">中国主要地形区判读</span></h1>
      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllPanels">{{
          allPanelsCollapsed ? '展开面板' : '收起面板' }}</button>
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
            <div>
              <h2>地形要素</h2>
              <p>山脉 · 盆地 · 河流</p>
            </div>
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
              <button v-for="f in filterTypes" :key="f.key" class="theme-btn option-btn"
                :class="{ active: activeFilter === f.key }" @click="activeFilter = f.key">{{ f.label }}</button>
            </div>
          </section>

          <!-- 找到的计数 -->
          <section class="geo-card control-section">
            <h3 class="section-title">📊 查找进度</h3>
            <div class="find-progress">
              <div class="progress-item"><span class="progress-icon">🏔</span><strong>{{ foundCount.mountains
              }}</strong><span>/ {{ totalCount.mountains }} 山脉</span></div>
              <div class="progress-item"><span class="progress-icon">🏺</span><strong>{{ foundCount.basins
              }}</strong><span>/ {{ totalCount.basins }} 盆地</span></div>
              <div class="progress-item"><span class="progress-icon">🌊</span><strong>{{ foundCount.rivers
              }}</strong><span>/ {{ totalCount.rivers }} 河流</span></div>
            </div>
          </section>

          <!-- 列表 -->
          <section class="geo-card control-section" v-if="activeFilter === 'all' || activeFilter === 'mountains'">
            <h3 class="section-title">🏔 主要山脉</h3>
            <div class="terrain-list">
              <div v-for="m in mountains" :key="m.name" class="terrain-item"
                :class="{ found: m.found, selected: selectedFeature?.name === m.name }" @click="selectFeature(m)">
                <span class="terrain-icon" style="color:#ef4444">🏔</span>
                <div class="terrain-info"><span class="terrain-name">{{ m.name }}</span><span class="terrain-desc">{{
                  m.desc }}</span></div>
                <span class="terrain-check" v-if="m.found">✓</span>
                <span class="terrain-arrow" v-else-if="selectedFeature?.name === m.name">→</span>
              </div>
            </div>
          </section>

          <section class="geo-card control-section" v-if="activeFilter === 'all' || activeFilter === 'basins'">
            <h3 class="section-title">🏺 四大盆地</h3>
            <div class="terrain-list">
              <div v-for="b in basins" :key="b.name" class="terrain-item"
                :class="{ found: b.found, selected: selectedFeature?.name === b.name }" @click="selectFeature(b)">
                <span class="terrain-icon" style="color:#fbbf24">🏺</span>
                <div class="terrain-info"><span class="terrain-name">{{ b.name }}</span><span class="terrain-desc">{{
                  b.desc }}</span></div>
                <span class="terrain-check" v-if="b.found">✓</span>
                <span class="terrain-arrow" v-else-if="selectedFeature?.name === b.name">→</span>
              </div>
            </div>
          </section>

          <section class="geo-card control-section" v-if="activeFilter === 'all' || activeFilter === 'rivers'">
            <h3 class="section-title">🌊 主要河流</h3>
            <div class="terrain-list">
              <div v-for="r in rivers" :key="r.name" class="terrain-item"
                :class="{ found: r.found, selected: selectedFeature?.name === r.name }" @click="selectFeature(r)">
                <span class="terrain-icon" style="color:#3b82f6">🌊</span>
                <div class="terrain-info"><span class="terrain-name">{{ r.name }}</span><span class="terrain-desc">{{
                  r.desc }}</span></div>
                <span class="terrain-check" v-if="r.found">✓</span>
                <span class="terrain-arrow" v-else-if="selectedFeature?.name === r.name">→</span>
              </div>
            </div>
          </section>
        </div>
        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>
        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">›</button>
      </aside>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs">›</button>
      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs">‹</button>
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
  area?: [number, number][] // 区域轮廓多边形
}

const mountains = reactive<TerrainFeature[]>([
  { name: '天山山脉', lat: 42.5, lon: 85, desc: '新疆中部，南疆北疆分界', type: 'mountain', found: false, area: [[44, 78], [44, 90], [41, 90], [41, 78]] },
  { name: '阴山山脉', lat: 41, lon: 107, desc: '内蒙古中部东西走向', type: 'mountain', found: false, area: [[42, 104], [42, 112], [40, 112], [40, 104]] },
  { name: '昆仑山脉', lat: 36.5, lon: 82, desc: '新疆与西藏交界', type: 'mountain', found: false, area: [[38, 76], [38, 92], [35, 92], [35, 76]] },
  { name: '秦岭', lat: 34, lon: 108, desc: '中国南北分界线', type: 'mountain', found: false, area: [[34.5, 104], [34.5, 114], [33, 114], [33, 104]] },
  { name: '南岭', lat: 25, lon: 113, desc: '湖南、江西与广东交界', type: 'mountain', found: false, area: [[26, 108], [26, 118], [24, 118], [24, 108]] },
  { name: '大兴安岭', lat: 50.5, lon: 123, desc: '内蒙古东北部', type: 'mountain', found: false, area: [[53, 120], [53, 127], [48, 127], [48, 120]] },
  { name: '太行山脉', lat: 37.5, lon: 113.5, desc: '山西与河北交界', type: 'mountain', found: false, area: [[39, 112], [39, 115], [36, 115], [36, 112]] },
  { name: '巫山', lat: 31, lon: 110, desc: '重庆与湖北交界', type: 'mountain', found: false, area: [[32, 109], [32, 111], [30, 111], [30, 109]] },
  { name: '雪峰山', lat: 27.5, lon: 110, desc: '湖南西部', type: 'mountain', found: false, area: [[29, 109], [29, 111], [26, 111], [26, 109]] },
  { name: '长白山脉', lat: 42, lon: 128, desc: '吉林东部中朝边境', type: 'mountain', found: false, area: [[43, 127], [43, 130], [41, 130], [41, 127]] },
  { name: '武夷山脉', lat: 27.5, lon: 118, desc: '福建与江西交界', type: 'mountain', found: false, area: [[29, 117], [29, 119], [26, 119], [26, 117]] },
  { name: '台湾山脉', lat: 23.5, lon: 121, desc: '台湾岛东部', type: 'mountain', found: false, area: [[25.5, 120], [25.5, 122], [23, 122], [23, 120]] },
  { name: '横断山脉', lat: 30, lon: 100, desc: '川滇藏交界南北走向', type: 'mountain', found: false, area: [[32, 97], [32, 103], [28, 103], [28, 97]] },
  { name: '阿尔泰山脉', lat: 47.5, lon: 88, desc: '新疆北部中俄边境', type: 'mountain', found: false, area: [[49, 86], [49, 92], [46, 92], [46, 86]] },
  { name: '祁连山脉', lat: 38.5, lon: 99, desc: '甘肃与青海交界', type: 'mountain', found: false, area: [[39, 94], [39, 104], [37, 104], [37, 94]] },
  { name: '贺兰山', lat: 38.5, lon: 106, desc: '宁夏西北部', type: 'mountain', found: false, area: [[40, 105], [40, 107], [38, 107], [38, 105]] },
])

const basins = reactive<TerrainFeature[]>([
  { name: '塔里木盆地', lat: 40, lon: 85, desc: '中国最大盆地，位于新疆南部', type: 'basin', found: false, area: [[42, 76], [42, 90], [37, 90], [37, 76]] },
  { name: '准噶尔盆地', lat: 46, lon: 87, desc: '新疆北部，中国第二大盆地', type: 'basin', found: false, area: [[48, 82], [48, 92], [44, 92], [44, 82]] },
  { name: '柴达木盆地', lat: 37, lon: 95, desc: '青海省西北部，"聚宝盆"', type: 'basin', found: false, area: [[39, 90], [39, 99], [36, 99], [36, 90]] },
  { name: '四川盆地', lat: 30, lon: 105, desc: '四川省东部，"天府之国"', type: 'basin', found: false, area: [[32, 102], [32, 110], [28, 110], [28, 102]] },
])

const rivers = reactive<TerrainFeature[]>([
  { name: '长江', lat: 30.5, lon: 114, desc: '中国第一长河，注入东海', type: 'river', found: false, path: [] },
  { name: '黄河', lat: 37, lon: 112, desc: '中国第二长河，注入渤海', type: 'river', found: false, path: [] },
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
type HiddenTerrainLayer = L.Marker | L.Polyline | L.GeoJSON
const hiddenMarkers: Record<string, HiddenTerrainLayer> = {}

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
let riverGeoJSONLayers: L.GeoJSON[] = []
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

  // 河流使用独立高层级 Pane，避免被底图或中国轮廓线遮挡
  if (!leafletMap.getPane('river-pane')) {
    const riverPane = leafletMap.createPane('river-pane')
    riverPane.style.zIndex = '650'
    riverPane.style.pointerEvents = 'auto'
  }

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
    html: `<div style="font-size:20px;line-height:1;text-shadow:0 0 3px ${color},0 1px 2px rgba(0,0,0,0.8);cursor:pointer;">${emoji}</div>`,
    className: 'terrain-div-icon', iconSize: [24, 24], iconAnchor: [12, 12],
  })
}

function addTerrainMarkers() {
  if (!leafletMap) return
  // 山脉标记 — 初始隐藏
  mountains.forEach(m => {
    const marker = L.marker([m.lat, m.lon], { icon: createIcon('⛰', '#ef4444') })
    marker.bindPopup(`<b style="color:#ef4444">${m.name}</b><br><span style="font-size:12px;color:#666">${m.desc}</span>`)
    marker.on('click', () => { m.found = true })
    marker.addTo(leafletMap!)
    marker.setOpacity(0) // 初始隐藏
    hiddenMarkers[m.name] = marker
  })
  // 盆地标记 — 初始隐藏
  basins.forEach(b => {
    const marker = L.marker([b.lat, b.lon], { icon: createIcon('◈', '#fbbf24') })
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
/**
 * 从任意 GeoJSON 几何结构中提取河流坐标。
 * GeoJSON 坐标顺序为 [经度, 纬度]，这里转换为 Leaflet 使用的 [纬度, 经度]。
 */
function collectRiverCoords(geometry: any, result: [number, number][]) {
  if (!geometry) return

  const pushCoord = (coord: any) => {
    if (
      Array.isArray(coord) &&
      coord.length >= 2 &&
      Number.isFinite(Number(coord[0])) &&
      Number.isFinite(Number(coord[1]))
    ) {
      result.push([Number(coord[1]), Number(coord[0])])
    }
  }

  if (geometry.type === 'LineString') {
    geometry.coordinates?.forEach(pushCoord)
    return
  }

  if (geometry.type === 'MultiLineString') {
    geometry.coordinates?.forEach((line: any[]) => {
      line?.forEach(pushCoord)
    })
    return
  }

  if (geometry.type === 'GeometryCollection') {
    geometry.geometries?.forEach((item: any) => {
      collectRiverCoords(item, result)
    })
  }
}

function extractAllRiverCoords(data: any): [number, number][] {
  const result: [number, number][] = []
  if (!data) return result

  if (data.type === 'FeatureCollection') {
    data.features?.forEach((feature: any) => {
      collectRiverCoords(feature?.geometry, result)
    })
    return result
  }

  if (data.type === 'Feature') {
    collectRiverCoords(data.geometry, result)
    return result
  }

  collectRiverCoords(data, result)
  return result
}

/**
 * 统一调整 Marker、Polyline、GeoJSON 图层透明度。
 */
function setTerrainLayerOpacity(layer: HiddenTerrainLayer, opacity: number) {
  if (layer instanceof L.Marker) {
    layer.setOpacity(opacity)
    return
  }

  if (layer instanceof L.GeoJSON) {
    layer.setStyle({
      opacity,
      fillOpacity: 0,
    })
    return
  }

  if (layer instanceof L.Polyline) {
    layer.setStyle({ opacity })
  }
}

async function loadRivers() {
  if (!leafletMap) return

  // 长江、黄河直接交给 L.geoJSON 渲染完整 FeatureCollection，
  // 不再只读取 data.features[0]。
  const geojsonRivers = [
    {
      name: '长江',
      url: '/geo-resources-folder/geojson/中国矢量数据/长江.geojson',
      color: '#3b82f6',
    },
    {
      name: '黄河',
      url: '/geo-resources-folder/geojson/中国矢量数据/黄河.geojson',
      color: '#eab308',
    },
  ]

  for (const config of geojsonRivers) {
    try {
      const res = await fetch(config.url)
      if (!res.ok) {
        throw new Error(`${config.name} GeoJSON 请求失败：${res.status}`)
      }

      const data = await res.json()
      const river = rivers.find(item => item.name === config.name)

      console.log(`${config.name} GeoJSON 顶层类型：`, data?.type)
      console.log(`${config.name} Feature 数量：`, data?.features?.length ?? 0)

      const geoJSONLayer = L.geoJSON(data, {
        pane: 'river-pane',

        // 河流文件只渲染线类型，避免文件中的点或面被误画出来
        filter(feature) {
          const type = feature?.geometry?.type
          return type === 'LineString' || type === 'MultiLineString' || type === 'GeometryCollection'
        },

        style() {
          return {
            color: config.color,
            weight: 4,
            opacity: 0.95,
            fill: false,
            lineCap: 'round',
            lineJoin: 'round',
          }
        },

        onEachFeature(_feature, layer) {
          layer.bindPopup(
            `<b style="color:${config.color}">${config.name}</b><br>` +
            `<span style="font-size:12px;color:#666">${river?.desc || ''}</span>`
          )

          layer.on('click', () => {
            if (river) river.found = true
          })
        },
      })

      const childLayerCount = geoJSONLayer.getLayers().length
      const bounds = geoJSONLayer.getBounds()

      console.log(`${config.name} 生成线图层数量：`, childLayerCount)
      console.log(
        `${config.name} 图层范围：`,
        bounds.isValid() ? bounds.toBBoxString() : '无效范围'
      )

      if (childLayerCount === 0 || !bounds.isValid()) {
        throw new Error(`${config.name} 没有生成有效的线图层`)
      }

      geoJSONLayer.addTo(leafletMap)
      geoJSONLayer.bringToFront()
      riverGeoJSONLayers.push(geoJSONLayer)
      hiddenMarkers[config.name] = geoJSONLayer

      // 提取全部 Feature、LineString、MultiLineString 中的坐标，供查找判断使用
      const coords = extractAllRiverCoords(data)
      console.log(`${config.name} 提取坐标数量：`, coords.length, '首点：', coords[0])

      if (coords.length > 0) {
        riverGeoJSONCoords[config.name] = coords
        if (river) river.path = coords
      }

      // 河流名称标签。保持原逻辑：长江、黄河加载成功后直接显示。
      const labelCenter = river
        ? L.latLng(river.lat, river.lon)
        : bounds.getCenter()

      const label = L.marker(labelCenter, {
        pane: 'river-pane',
        icon: L.divIcon({
          html: `<div style="font-size:12px;color:${config.color};font-weight:700;text-shadow:0 0 3px #fff,0 1px 2px rgba(0,0,0,0.8);white-space:nowrap;">${config.name}</div>`,
          className: 'river-label-icon',
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        }),
      })

      label.on('click', () => {
        if (river) river.found = true
      })
      label.addTo(leafletMap)
      hiddenMarkers[config.name + '_label'] = label
    } catch (error) {
      console.warn(`${config.name} GeoJSON 加载失败：`, error)

      // 后备逻辑：只有 rivers 中存在简化路径时才绘制
      const river = rivers.find(item => item.name === config.name)
      if (river && (river.path?.length ?? 0) > 0 && leafletMap) {
        const line = L.polyline(river.path!, {
          pane: 'river-pane',
          color: config.color,
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        })
        line.bindPopup(
          `<b style="color:${config.color}">${config.name}</b><br>` +
          `<span style="font-size:12px;color:#666">${river.desc}</span>`
        )
        line.on('click', () => { river.found = true })
        line.addTo(leafletMap)
        riverLayers.push(line)
        hiddenMarkers[config.name] = line
      }
    }
  }

  // 其余河流继续使用代码中的简化路径，默认隐藏
  rivers.forEach(river => {
    if (river.name === '长江' || river.name === '黄河') return
    if (!leafletMap || (river.path?.length ?? 0) === 0) return

    const line = L.polyline(river.path!, {
      pane: 'river-pane',
      color: '#3b82f6',
      weight: 3,
      opacity: 0,
      dashArray: '8 4',
      lineCap: 'round',
      lineJoin: 'round',
    })

    line.bindPopup(
      `<b style="color:#3b82f6">${river.name}</b><br>` +
      `<span style="font-size:12px;color:#666">${river.desc}</span>`
    )
    line.on('click', () => { river.found = true })
    line.addTo(leafletMap)

    riverLayers.push(line)
    hiddenMarkers[river.name] = line

    const marker = L.marker([river.lat, river.lon], {
      pane: 'river-pane',
      icon: L.divIcon({
        html: `<div style="font-size:11px;color:#3b82f6;font-weight:700;text-shadow:0 0 3px #fff,0 1px 2px rgba(0,0,0,0.8);white-space:nowrap;">${river.name}</div>`,
        className: 'river-label-icon',
        iconSize: [60, 16],
        iconAnchor: [30, 8],
      }),
    })

    marker.on('click', () => { river.found = true })
    marker.addTo(leafletMap)
    marker.setOpacity(0)
    hiddenMarkers[river.name + '_label'] = marker
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

// 显示区域轮廓（山脉/盆地多边形描边）
function showAreaContour(f: TerrainFeature) {
  if (!leafletMap) return
  const color = f.type === 'mountain' ? '#ef4444' : f.type === 'basin' ? '#fbbf24' : '#3b82f6'
  if ((f.area?.length ?? 0) > 0) {
    // 山脉/盆地：绘制区域多边形
    const contour = L.polygon(f.area!, {
      color, weight: 2, opacity: 0.7,
      fillColor: color, fillOpacity: 0.08,
      dashArray: '5 3',
    })
    contour.addTo(leafletMap)
    contourLayers.push(contour)
  }
}

function showFeatureMarker(f: TerrainFeature) {
  const marker = hiddenMarkers[f.name]
  if (marker) setTerrainLayerOpacity(marker, 0.9)

  const label = hiddenMarkers[f.name + '_label']
  if (label instanceof L.Marker) label.setOpacity(1)
}

// 展示全部地形
let showAllContours: L.Polygon[] = []
function toggleShowAll(on: boolean) {
  if (!leafletMap) return
  // 清除展示模式的轮廓
  showAllContours.forEach(c => c.remove()); showAllContours = []
  const allFeatures = [...mountains, ...basins, ...rivers]
  allFeatures.forEach(f => {
    const marker = hiddenMarkers[f.name]
    const label = hiddenMarkers[f.name + '_label']
    if (on) {
      // 显示全部
      if (marker) setTerrainLayerOpacity(marker, 0.9)
      if (label instanceof L.Marker) label.setOpacity(1)
      // 显示区域轮廓
      if ((f.area?.length ?? 0) > 0) {
        const color = f.type === 'mountain' ? '#ef4444' : f.type === 'basin' ? '#fbbf24' : '#3b82f6'
        const contour = L.polygon(f.area!, { color, weight: 1.5, opacity: 0.5, fillColor: color, fillOpacity: 0.05, dashArray: '4 3' })
        contour.addTo(leafletMap!)
        showAllContours.push(contour)
      }
    } else {
      // 隐藏未找到的
      if (!f.found) {
        if (marker) setTerrainLayerOpacity(marker, 0)
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
  showAllContours.forEach(l => l.remove()); showAllContours = []
  cancelAnimationFrame(sceneResizeFrame); cancelAnimationFrame(sceneResizeSettleFrame)
  leafletResizeObserver?.disconnect(); leafletResizeObserver = null
  featureMarkers.forEach(m => m.remove()); featureMarkers = []
  riverLayers.forEach(l => l.remove()); riverLayers = []
  riverGeoJSONLayers.forEach(l => l.remove()); riverGeoJSONLayers = []
  if (highlightMarker) { highlightMarker.remove(); highlightMarker = null }
  chinaOutlineLayer?.remove(); chinaOutlineLayer = null
  leafletMap?.remove(); leafletMap = null; tileLayer = null
})
</script>

<style scoped>
.page-subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
  margin-left: 10px;
  letter-spacing: 1px;
}

.map-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(10, 22, 40, 0.8);
  padding: 4px 14px;
  border-radius: 999px;
  border: 1px solid rgba(46, 196, 182, 0.25);
  pointer-events: none;
}

.filter-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 4px;
}

.filter-buttons .option-btn {
  font-size: 11px;
  padding: 5px 4px;
}

.find-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #94a3b8;
}

.progress-item .progress-icon {
  font-size: 18px;
}

.progress-item strong {
  color: #2ec4b6;
  font-size: 16px;
  min-width: 24px;
  text-align: right;
}

.terrain-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terrain-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(8, 12, 28, 0.5);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.terrain-item:hover {
  background: rgba(46, 196, 182, 0.1);
  border-color: rgba(46, 196, 182, 0.3);
}

.terrain-item.found {
  background: rgba(46, 196, 182, 0.15);
  border-color: rgba(46, 196, 182, 0.4);
}

.terrain-item.selected {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.2);
}

.terrain-arrow {
  color: #fbbf24;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
  animation: bounce-right 0.6s infinite alternate;
}

@keyframes bounce-right {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(3px);
  }
}

.map-hint.finding {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(40, 30, 10, 0.85);
}

.terrain-icon {
  font-size: 18px;
  flex-shrink: 0;
  font-weight: 700;
}

.terrain-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.terrain-name {
  font-size: 13px;
  color: #cbd5e1;
  font-weight: 600;
}

.terrain-desc {
  font-size: 10px;
  color: #64748b;
}

.terrain-check {
  color: #2ec4b6;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.find-terrain-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.find-terrain-container .leaflet-host {
  width: 100%;
  height: 100%;
}

.find-terrain-container .workspace.panel-resizing,
.find-terrain-container .workspace.layout-resizing,
.find-terrain-container .workspace.panel-resizing .side-panel,
.find-terrain-container .workspace.layout-resizing .side-panel,
.find-terrain-container .workspace.panel-resizing .center-stage,
.find-terrain-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}
</style>
