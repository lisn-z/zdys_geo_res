<template>
  <div class="tp-container">
    <!-- 顶部标题栏 -->
    <header class="tp-header">
      <div class="header-left">
        <span class="header-tag">一起做</span>
        <h1 class="header-title">绘制气温曲线和降水量柱状图</h1>
      </div>
      <div class="header-tip" v-if="!currentCity">
        <el-icon><InfoFilled /></el-icon>
        <span>请在地图上点击城市或在下方下拉框选择城市</span>
      </div>
      <div class="header-tip active" v-else>
        <el-icon><Location /></el-icon>
        <span>当前城市：<b>{{ currentCity.name }}</b>（{{ climateTypeLabel }}）</span>
      </div>
    </header>

    <!-- 左右主体 -->
    <main class="tp-main">
      <!-- 左侧：地图控制面板 -->
      <aside class="tp-left">
        <div class="left-card glass-panel">
          <div class="card-title">
            <el-icon><Reading /></el-icon>
            <span>操作说明</span>
          </div>
          <p class="card-desc">在左侧地图上点击城市，或在下方下拉框中选择城市，右侧将显示该城市各月平均气温、降水量统计表以及气温曲线和降水量柱状图。</p>
        </div>

        <div class="left-card glass-panel">
          <div class="card-title">
            <el-icon><Filter /></el-icon>
            <span>选择城市</span>
          </div>
          <el-select
            v-model="selectedCityId"
            placeholder="请选择主要城市"
            class="city-select"
            :disabled="cityList.length === 0"
            @change="onCityChange"
          >
            <el-option
              v-for="c in cityList"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </div>

        <div class="left-card map-card glass-panel">
          <div class="card-title">
            <el-icon><Globe /></el-icon>
            <span>全球主要城市分布</span>
          </div>
          <div ref="mapRef" class="leaflet-map"></div>
        </div>
      </aside>

      <!-- 右侧：图表区域（仅在选中城市后显示） -->
      <section class="tp-right" v-if="currentCity">
        <!-- 上：统计表 -->
        <div class="right-card glass-panel">
          <div class="card-title">
            <el-icon><DataAnalysis /></el-icon>
            <span>{{ currentCity.name }}各月平均气温和降水量统计表</span>
          </div>
          <div class="table-wrap">
            <table class="tp-table">
              <thead>
                <tr>
                  <th class="row-head">月份</th>
                  <th v-for="m in 12" :key="m">{{ m }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="row-head">月均温/℃</td>
                  <td v-for="(t, idx) in currentCity.temperature" :key="`t-${idx}`">
                    {{ t.toFixed(1) }}
                  </td>
                </tr>
                <tr>
                  <td class="row-head">月降水量/毫米</td>
                  <td v-for="(p, idx) in currentCity.precipitation" :key="`p-${idx}`">
                    {{ p.toFixed(1) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 下：ECharts 图表 -->
        <div class="right-card glass-panel">
          <div class="card-title">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ currentCity.name }}气温曲线和降水量柱状图</span>
          </div>
          <div ref="chartRef" class="echart-box"></div>
        </div>
      </section>

      <!-- 右侧：未选择城市时的占位 -->
      <section class="tp-right tp-placeholder" v-else>
        <div class="placeholder-inner glass-panel">
          <div class="placeholder-icon">
            <el-icon :size="64"><Promotion /></el-icon>
          </div>
          <p class="placeholder-title">请先在左侧地图上选择城市</p>
          <p class="placeholder-desc">点击地图上的城市，或在「选择城市」下拉框中选择一个城市，右侧将显示对应的气温与降水量统计表及图表。</p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, shallowRef, computed, nextTick, watch } from 'vue'
import L, { type Map as LMap, type Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as echarts from 'echarts'

interface CityItem {
  id: string
  name: string
  lat: number
  lng: number
  climate: 'mediterranean' | 'tropical' | 'temperate' | 'continental' | 'arid' | 'polar'
  temperature: number[] // 12 个月
  precipitation: number[] // 12 个月
}

// 气候类型中文映射
const climateMap: Record<CityItem['climate'], string> = {
  mediterranean: '地中海气候',
  tropical: '热带气候',
  temperate: '温带气候',
  continental: '大陆性气候',
  arid: '干旱气候',
  polar: '极地气候',
}

// 目前只标注希腊雅典，后续补充其它主要城市
const cityList: CityItem[] = [
  {
    id: 'athens',
    name: '希腊雅典',
    lat: 37.9842,
    lng: 23.7281,
    climate: 'mediterranean',
    temperature: [8.7, 9.3, 11.2, 15.3, 20.7, 25.6, 28.0, 27.4, 23.3, 18.1, 13.7, 10.3],
    precipitation: [56.9, 46.7, 40.7, 30.8, 22.7, 10.6, 5.8, 6.0, 13.9, 52.6, 58.3, 69.1],
  },
]

const mapRef = ref<HTMLDivElement | null>(null)
const chartRef = ref<HTMLDivElement | null>(null)

const mapInstance = shallowRef<LMap | null>(null)
const markerMap = new Map<string, LMarker>()
const chartInstance = shallowRef<echarts.ECharts | null>(null)

const selectedCityId = ref<string>('')
const currentCity = ref<CityItem | null>(null)

const climateTypeLabel = computed(() => (currentCity.value ? climateMap[currentCity.value.climate] : ''))

// 防抖 resize 处理
let resizeTimer: ReturnType<typeof setTimeout> | null = null
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    mapInstance.value?.invalidateSize()
    chartInstance.value?.resize()
    resizeTimer = null
  }, 150)
}

function onCityChange(id: string) {
  const city = cityList.find((c) => c.id === id) || null
  if (city) {
    currentCity.value = city
    // 地图飞向该城市
    if (mapInstance.value) {
      mapInstance.value.flyTo([city.lat, city.lng], 4, { duration: 1.0 })
      // 高亮对应 marker
      const m = markerMap.get(city.id)
      if (m) m.openPopup()
    }
    nextTick(() => renderChart())
  }
}

// 初始化 Leaflet 地图
function initMap() {
  if (!mapRef.value) return
  const map = L.map(mapRef.value, {
    center: [39.9042, 116.4074], // 中国北京
    zoom: 3,
    minZoom: 0,
    maxZoom: 5,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
    fadeAnimation: false,
    zoomAnimation: true,
  })
  // 瓦片底图：google-tiles 服务（仅此一个瓦片源，无 fallback）
  const tileLayer = L.tileLayer(
    'https://zdys.szjx.ai-study.net/geo-resources-folder/tiles/google-tiles/{z}/{x}/{y}.png',
    {
      minZoom: 0,
      maxZoom: 5,
      crossOrigin: false,
      tileSize: 256,
      detectRetina: false,
      errorTileUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23aadaff"/></svg>',
    }
  )
  tileLayer.on('tileerror', (e) => {
    // eslint-disable-next-line no-console
    console.warn('[Leaflet] tile load error:', e?.tile?.src)
  })
  tileLayer.addTo(map)

  // 缩放控件放置右下
  L.control.zoom({ position: 'bottomright' }).addTo(map)

  // 红色大头针图标（自定义）：标签 = 城市名称（经纬度）
  const redPinIcon = L.divIcon({
    className: 'tp-pin-wrapper',
    html: `
      <div class="tp-pin">
        <div class="tp-pin-head"></div>
        <div class="tp-pin-stick"></div>
        <div class="tp-pin-label">${cityList[0].name}（${cityList[0].lng.toFixed(2)}°E，${cityList[0].lat.toFixed(2)}°N）</div>
      </div>
    `,
    iconSize: [220, 60],
    iconAnchor: [20, 28],
    popupAnchor: [0, -36],
  })

  // 标注城市
  cityList.forEach((city) => {
    const marker = L.marker([city.lat, city.lng], { icon: redPinIcon }).addTo(map)
    marker.bindPopup(
      `<div class="tp-popup">
        <div class="tp-popup-name">${city.name}（${city.lng.toFixed(2)}°E，${city.lat.toFixed(2)}°N）</div>
        <div class="tp-popup-climate">主要气候类型：<b>${climateMap[city.climate]}</b></div>
      </div>`,
      { closeButton: false, autoPan: true }
    )
    marker.on('click', () => {
      selectedCityId.value = city.id
      currentCity.value = city
      nextTick(() => renderChart())
    })
    markerMap.set(city.id, marker)
  })

  mapInstance.value = map

  // 地图尺寸自适应（多次调用保证容器尺寸变化后底图正确渲染）
  setTimeout(() => map.invalidateSize(), 100)
  setTimeout(() => map.invalidateSize(), 400)
  setTimeout(() => map.invalidateSize(), 1000)
  window.addEventListener('resize', handleResize)
}

function onResize() {
  handleResize()
}

// 渲染 ECharts：气温折线（左轴）+ 降水柱状（右轴）
function renderChart() {
  if (!chartRef.value || !currentCity.value) return
  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value)
  }
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const option: echarts.EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#2ec4b6' } },
      backgroundColor: 'rgba(11, 54, 96, 0.9)',
      borderColor: '#2ec4b6',
      textStyle: { color: '#fff' },
    },
    legend: {
      data: ['月均温/℃', '月降水量/毫米'],
      textStyle: { color: '#0b3660' },
      top: 6,
      itemGap: 24,
    },
    grid: {
      left: 60,
      right: 70,
      top: 50,
      bottom: 60,
      containLabel: false,
    },
    xAxis: [
      {
        type: 'category',
        data: months,
        axisPointer: { type: 'shadow' },
        name: '月份',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#0b3660', fontWeight: 600, fontSize: 13 },
        axisLine: { lineStyle: { color: '#7da8c9' } },
        axisLabel: { color: '#0b3660' },
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '气温/℃',
        min: -10,
        max: 40,
        interval: 5,
        nameTextStyle: { color: '#0b3660', fontWeight: 600 },
        axisLine: { lineStyle: { color: '#2ec4b6' } },
        axisLabel: { color: '#0b3660' },
        splitLine: { lineStyle: { type: 'dashed', color: 'rgba(125, 168, 201, 0.4)' } },
      },
      {
        type: 'value',
        name: '降水量/毫米',
        min: 0,
        max: 250,
        interval: 25,
        nameTextStyle: { color: '#0b3660', fontWeight: 600 },
        axisLine: { lineStyle: { color: '#247cff' } },
        axisLabel: { color: '#0b3660' },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '月均温/℃',
        type: 'line',
        yAxisIndex: 0,
        data: currentCity.value.temperature,
        smooth: true,
        symbol: 'circle',
        symbolSize: 9,
        lineStyle: { width: 3, color: '#e63946' },
        itemStyle: { color: '#e63946', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(230, 57, 70, 0.35)' },
            { offset: 1, color: 'rgba(230, 57, 70, 0.02)' },
          ]),
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 38,
          itemStyle: { color: '#e63946' },
          label: { color: '#fff', fontSize: 10 },
          data: [
            { type: 'max', name: '最高' },
            { type: 'min', name: '最低' },
          ],
        },
      },
      {
        name: '月降水量/毫米',
        type: 'bar',
        yAxisIndex: 1,
        data: currentCity.value.precipitation,
        barWidth: 16,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#247cff' },
            { offset: 1, color: '#2ec4b6' },
          ]),
        },
      },
    ],
  }
  chartInstance.value.setOption(option, true)
  chartInstance.value.resize()
}

watch(currentCity, () => {
  nextTick(() => renderChart())
})

onMounted(async () => {
  await nextTick()
  initMap()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
  mapInstance.value?.remove()
  mapInstance.value = null
  chartInstance.value?.dispose()
  chartInstance.value = null
  markerMap.clear()
})
</script>

<style scoped>
.tp-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0b3660 0%, #1a6ba0 50%, #2ec4b6 100%);
  color: #fff;
  overflow: hidden;
}

/* ==================== 顶部标题栏 ==================== */
.tp-header {
  position: relative;
  flex-shrink: 0;
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  background: linear-gradient(90deg, rgba(46, 196, 182, 0.18) 0%, rgba(36, 124, 255, 0.18) 100%);
  border-bottom: 1px solid rgba(46, 196, 182, 0.35);
  backdrop-filter: blur(8px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.header-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 28px 0 14px;
  background: linear-gradient(90deg, #2ec4b6 0%, #247cff 100%);
  color: #fff;
  font-weight: 700;
  letter-spacing: 2px;
  font-size: 14px;
  clip-path: polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0% 100%);
  box-shadow: 0 4px 12px rgba(46, 196, 182, 0.35);
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-tip {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(11, 54, 96, 0.35);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(46, 196, 182, 0.4);
  white-space: nowrap;
  flex-shrink: 0;
}

.header-tip.active {
  background: linear-gradient(90deg, rgba(46, 196, 182, 0.3) 0%, rgba(36, 124, 255, 0.3) 100%);
  border-color: rgba(46, 196, 182, 0.7);
}

.header-tip b {
  color: #fff;
  margin: 0 4px;
}

/* ==================== 主体布局 ==================== */
.tp-main {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  min-height: 0;
}

/* ==================== 通用卡片 ==================== */
.glass-panel {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 14px;
  border: 1px solid rgba(46, 196, 182, 0.35);
  box-shadow: 0 8px 32px rgba(11, 54, 96, 0.25);
  color: #0b3660;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  color: #0b3660;
  padding: 14px 16px 8px 16px;
  border-bottom: 1px solid rgba(46, 196, 182, 0.25);
  flex-shrink: 0;
}

.card-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #4a6582;
  padding: 10px 16px 14px 16px;
  margin: 0;
}

/* ==================== 左侧面板 ==================== */
.tp-left {
  width: 380px;
  min-width: 280px;
  max-width: 460px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 12px;
  overflow: hidden;
}

.left-card {
  display: flex;
  flex-direction: column;
}

.left-card:not(.map-card) {
  flex-shrink: 0;
}

.city-select {
  width: calc(100% - 32px);
  margin: 8px 16px 4px 16px;
}

.left-card.map-card {
  flex: 1 1 auto;
  min-height: 360px;
  overflow: hidden;
}

.left-card.map-card .card-title {
  flex-shrink: 0;
}

.leaflet-map {
  flex: 1 1 auto;
  width: 100%;
  min-height: 280px;
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 14px;
  overflow: hidden;
  background: #aadaff;
}

/* ==================== 右侧区域 ==================== */
.tp-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 0;
}

.tp-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.placeholder-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(46, 196, 182, 0.2) 0%, rgba(36, 124, 255, 0.2) 100%);
  color: #2ec4b6;
  margin-bottom: 24px;
  box-shadow: 0 0 0 6px rgba(46, 196, 182, 0.1);
}

.placeholder-title {
  font-size: 20px;
  font-weight: 700;
  color: #0b3660;
  margin: 0 0 8px 0;
}

.placeholder-desc {
  font-size: 14px;
  color: #4a6582;
  line-height: 1.7;
  max-width: 460px;
  margin: 0;
}

.right-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.right-card:first-child {
  flex: 0 0 auto;
}

.right-card:last-child {
  flex: 1;
  min-height: 280px;
}

/* ==================== 统计表 ==================== */
.table-wrap {
  padding: 16px;
  overflow-x: auto;
}

.tp-table {
  width: 100%;
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  color: #0b3660;
}

.tp-table th,
.tp-table td {
  border: 1px solid rgba(46, 196, 182, 0.35);
  padding: 8px 10px;
  text-align: center;
  min-width: 52px;
}

.tp-table thead th {
  background: linear-gradient(180deg, rgba(46, 196, 182, 0.2) 0%, rgba(36, 124, 255, 0.18) 100%);
  color: #0b3660;
  font-weight: 700;
}

.tp-table thead th:first-child {
  background: rgba(46, 196, 182, 0.3);
}

.tp-table .row-head {
  background: rgba(46, 196, 182, 0.12);
  color: #0b3660;
  font-weight: 700;
  white-space: nowrap;
}

.tp-table tbody tr:hover td {
  background: rgba(36, 124, 255, 0.08);
}

/* ==================== ECharts 容器 ==================== */
.echart-box {
  flex: 1;
  width: 100%;
  min-height: 280px;
  padding: 8px 12px 12px 12px;
}

/* ==================== 红色大头针 ==================== */
:deep(.tp-pin-wrapper) {
  background: transparent !important;
  border: none !important;
}

:deep(.tp-pin) {
  position: relative;
  width: 220px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
}

:deep(.tp-pin-head) {
  width: 18px;
  height: 18px;
  background: radial-gradient(circle at 35% 30%, #ff6b7a 0%, #e63946 60%, #b71c1c 100%);
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 2;
}

:deep(.tp-pin-stick) {
  width: 2px;
  height: 6px;
  background: linear-gradient(180deg, #b71c1c 0%, transparent 100%);
  margin-top: -1px;
}

:deep(.tp-pin-label) {
  margin-top: 2px;
  padding: 3px 10px;
  background: rgba(230, 57, 70, 0.95);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 1px solid #fff;
  letter-spacing: 0.3px;
}

/* ==================== 弹窗样式 ==================== */
:deep(.leaflet-popup-content-wrapper) {
  background: linear-gradient(135deg, #ffffff 0%, #f0fbfa 100%);
  color: #0b3660;
  border-radius: 10px;
  border: 1px solid #2ec4b6;
  box-shadow: 0 6px 20px rgba(46, 196, 182, 0.35);
}

:deep(.leaflet-popup-tip) {
  background: #2ec4b6;
}

:deep(.leaflet-popup-content) {
  margin: 12px 16px;
  font-size: 13px;
  line-height: 1.7;
}

:deep(.tp-popup-name) {
  font-weight: 700;
  font-size: 14px;
  color: #0b3660;
  margin-bottom: 4px;
}

:deep(.tp-popup-climate) {
  color: #4a6582;
}

:deep(.tp-popup-climate b) {
  color: #247cff;
  margin-left: 4px;
}

/* ==================== Leaflet 缩放控件 ==================== */
:deep(.leaflet-control-zoom) {
  border: none !important;
  box-shadow: 0 4px 12px rgba(11, 54, 96, 0.3) !important;
}

:deep(.leaflet-control-zoom a) {
  background: linear-gradient(135deg, #2ec4b6 0%, #247cff 100%) !important;
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  font-weight: 700;
  transition: all 0.2s;
}

:deep(.leaflet-control-zoom a:hover) {
  background: linear-gradient(135deg, #247cff 0%, #2ec4b6 100%) !important;
  transform: scale(1.05);
}

:deep(.leaflet-control-attribution) {
  background: rgba(255, 255, 255, 0.85) !important;
  color: #0b3660 !important;
  font-size: 11px !important;
  padding: 2px 8px !important;
  border-radius: 4px !important;
  border: 1px solid rgba(46, 196, 182, 0.4) !important;
}

:deep(.leaflet-control-attribution a) {
  color: #247cff !important;
}

/* ==================== 响应式：多断点自适应 ==================== */

/* 平板横屏 / 小笔记本：1024px ~ 1200px */
@media (max-width: 1200px) {
  .tp-header {
    height: 56px;
    padding: 0 16px;
    gap: 12px;
  }
  .header-tag {
    height: 26px;
    padding: 0 24px 0 10px;
    font-size: 12px;
    letter-spacing: 1px;
    clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0% 100%);
  }
  .header-title {
    font-size: 17px;
  }
  .header-tip {
    font-size: 12px;
    padding: 4px 10px;
  }
  .tp-main {
    gap: 12px;
    padding: 12px;
  }
  .tp-left {
    width: 320px;
    min-width: 240px;
    gap: 10px;
  }
  .left-card.map-card {
    min-height: 300px;
  }
  .leaflet-map {
    min-height: 240px;
  }
  .tp-right {
    gap: 12px;
  }
  .right-card:last-child {
    min-height: 240px;
  }
  .echart-box {
    min-height: 240px;
  }
}

/* 平板竖屏 / 大手机横屏：768px ~ 1024px */
@media (max-width: 1024px) {
  .tp-header {
    height: 50px;
    padding: 0 12px;
    gap: 10px;
  }
  .header-tag {
    height: 24px;
    padding: 0 20px 0 8px;
    font-size: 11px;
    clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0% 100%);
  }
  .header-title {
    font-size: 15px;
    letter-spacing: 0.5px;
  }
  .header-tip {
    font-size: 11px;
    padding: 3px 8px;
  }
  .tp-main {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  .tp-left {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    max-height: 45%;
    gap: 8px;
  }
  .left-card.map-card {
    min-height: 220px;
  }
  .leaflet-map {
    min-height: 180px;
  }
  .tp-right {
    gap: 10px;
  }
  .right-card:last-child {
    min-height: 220px;
  }
  .echart-box {
    min-height: 220px;
  }
  .card-title {
    font-size: 13px;
    padding: 10px 12px 6px 12px;
  }
  .card-desc {
    font-size: 12px;
    padding: 8px 12px 10px 12px;
  }
  .placeholder-icon {
    width: 80px;
    height: 80px;
  }
  .placeholder-icon :deep(.el-icon) {
    font-size: 40px !important;
  }
  .placeholder-title {
    font-size: 17px;
  }
  .placeholder-desc {
    font-size: 13px;
  }
  .placeholder-inner {
    padding: 24px;
  }
  .table-wrap {
    padding: 10px;
  }
  .tp-table {
    font-size: 12px;
  }
  .tp-table th,
  .tp-table td {
    padding: 6px 8px;
    min-width: 44px;
  }
}

/* 小屏手机：< 768px */
@media (max-width: 768px) {
  .tp-header {
    height: 44px;
    padding: 0 8px;
    gap: 8px;
  }
  .header-tag {
    display: none;
  }
  .header-title {
    font-size: 13px;
  }
  .header-tip span {
    display: none;
  }
  .header-tip b {
    display: inline;
  }
  .tp-main {
    gap: 8px;
    padding: 8px;
  }
  .tp-left {
    max-height: 40%;
    gap: 6px;
  }
  .left-card.map-card {
    min-height: 160px;
  }
  .leaflet-map {
    min-height: 140px;
  }
  .tp-right {
    gap: 8px;
  }
  .right-card:last-child {
    min-height: 180px;
  }
  .echart-box {
    min-height: 180px;
    padding: 4px 8px 8px 8px;
  }
  .card-title {
    font-size: 12px;
    padding: 8px 10px 4px 10px;
    gap: 4px;
  }
  .card-desc {
    font-size: 11px;
    padding: 6px 10px 8px 10px;
  }
  .city-select {
    width: calc(100% - 20px);
    margin: 6px 10px 2px 10px;
  }
  .table-wrap {
    padding: 8px;
  }
  .tp-table {
    font-size: 11px;
    min-width: 520px;
  }
  .tp-table th,
  .tp-table td {
    padding: 4px 6px;
    min-width: 36px;
  }
}
</style>
