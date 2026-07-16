<template>
  <div class="tp-container">
    <!-- 顶部标题栏：标题居中 -->
    <header class="tp-header">
      <h1 class="header-title">绘制气温曲线和降水量柱状图</h1>
    </header>

    <!-- 左右主体 -->
    <main class="tp-main">
      <!-- 左侧：地图控制面板（始终占 1/3） -->
      <aside class="tp-left">
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

        <!-- 城市气候类型信息卡（仅在选中城市时显示） -->
        <div v-if="currentCity" class="left-card glass-panel">
          <div class="card-title">
            <el-icon><Document /></el-icon>
            <span>城市气候类型</span>
          </div>
          <div class="city-info">
            <div class="city-info-name">
              {{ currentCity.name }}（海拔{{ currentCity.altitude }}米）
            </div>
            <div class="city-info-line">
              <span class="city-info-label">气候类型：</span>
              <span class="city-info-value">{{ currentCity.climateName }}</span>
            </div>
            <div class="city-info-line">
              <span class="city-info-label">气候特点：</span>
              <span class="city-info-value">{{ currentCity.feature }}</span>
            </div>
          </div>
        </div>

        <div class="left-card map-card glass-panel">
          <div class="card-title">
            <el-icon><Globe /></el-icon>
            <span>世界气候类型典型城市分布</span>
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
            <el-button
              class="card-title-export"
              type="primary"
              size="default"
              :icon="Download"
              @click="exportChart"
            >
              导出图片
            </el-button>
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
import { Download } from '@element-plus/icons-vue'
import L, { type Map as LMap, type Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as echarts from 'echarts'

interface CityItem {
  id: string
  name: string // 城市名（不含国家前缀）
  lat: number
  lng: number
  altitude: number // 海拔（米）
  climateKey: string
  climateName: string // 气候类型中文名
  feature: string // 气候特点
  temperature: number[] // 12 个月
  precipitation: number[] // 12 个月
}

// 12 个世界气候类型典型城市（数据按图片 Y 轴 -60~40℃ / 0~500mm 刻度逐月精确还原，保留 1 位小数）
const cityList: CityItem[] = [
  {
    id: 'ibadan',
    name: '伊基托斯',
    lat: 7.3775,
    lng: 3.9470,
    altitude: 126,
    climateKey: 'tropical-rainforest',
    climateName: '热带雨林气候',
    feature: '分布在赤道附近，全年高温多雨，生长着茂密的森林，有多种鸟类和动物栖息。',
    // 气温：全年 25~27℃；降水：全年 150~310mm
    temperature: [26.0, 27.0, 27.0, 27.0, 26.0, 25.0, 25.0, 25.0, 25.0, 26.0, 26.0, 25.0],
    precipitation: [260.0, 220.0, 250.0, 300.0, 260.0, 210.0, 170.0, 160.0, 200.0, 230.0, 270.0, 280.0],
  },
  {
    id: 'bamako',
    name: '巴马科',
    lat: 12.6392,
    lng: -8.0029,
    altitude: 331,
    climateKey: 'tropical-savanna',
    climateName: '热带稀树草原气候',
    feature: '分布在热带雨林地区的南北两侧，一年分为湿季和干季，地面树木稀疏，长着较高的草。',
    // 气温：5月最高 33℃；降水：8月最高 330mm
    temperature: [24.0, 27.0, 30.0, 32.0, 33.0, 30.0, 27.0, 26.0, 26.0, 27.0, 26.0, 24.0],
    precipitation: [0.0, 0.0, 5.0, 20.0, 60.0, 140.0, 220.0, 330.0, 190.0, 60.0, 5.0, 0.0],
  },
  {
    id: 'huzhiming',
    name: '胡志明市',
    lat: 10.8231,
    lng: 106.6297,
    altitude: 6,
    climateKey: 'tropical-monsoon',
    climateName: '热带季风气候',
    feature: '分布在南亚、东南亚地区，全年高温，夏季降水丰沛，冬季降水稀少。',
    // 气温：4-5月最高 30℃；降水：6/9月最高 300/320mm
    temperature: [25.5, 26.5, 28.5, 30.0, 30.0, 29.0, 28.0, 28.0, 27.5, 27.0, 26.5, 25.5],
    precipitation: [10.0, 5.0, 10.0, 50.0, 220.0, 300.0, 280.0, 260.0, 320.0, 240.0, 100.0, 30.0],
  },
  {
    id: 'bilma',
    name: '比尔马',
    lat: 18.6853,
    lng: 12.9167,
    altitude: 359,
    climateKey: 'tropical-desert',
    climateName: '热带沙漠气候',
    feature: '分布在南、北回归线附近的大陆西部和中部，终年干旱酷热，地面沙漠广布，只有很少的耐旱植物。',
    // 气温：7月最高 40℃；降水：全年几乎为 0
    temperature: [20.0, 22.0, 26.0, 31.0, 35.0, 38.0, 40.0, 39.0, 36.0, 30.0, 25.0, 21.0],
    precipitation: [0.0, 0.0, 0.0, 0.0, 0.0, 5.0, 10.0, 15.0, 5.0, 0.0, 0.0, 0.0],
  },
  {
    id: 'shanghai',
    name: '上海',
    lat: 31.2304,
    lng: 121.4737,
    altitude: 4,
    climateKey: 'subtropical-monsoon',
    climateName: '亚热带季风气候和亚热带湿润气候',
    feature: '分布在亚热带地区的大陆东岸，受季风影响，夏季高温多雨，冬季温度较低，雨量偏少。',
    // 气温：7-8月最高 28℃；降水：6月最高 140mm
    temperature: [2.0, 4.5, 8.5, 14.5, 20.0, 24.5, 28.5, 28.0, 24.5, 19.0, 12.5, 6.0],
    precipitation: [50.0, 60.0, 80.0, 90.0, 110.0, 140.0, 130.0, 130.0, 120.0, 60.0, 50.0, 40.0],
  },
  {
    id: 'moscow',
    name: '莫斯科',
    lat: 55.7558,
    lng: 37.6173,
    altitude: 149,
    climateKey: 'temperate-continental',
    climateName: '温带大陆性气候',
    feature: '分布在亚欧大陆和北美大陆的内陆地区，受海洋影响小，终年干旱少雨，冬季严寒，夏季炎热，气温年较差很大。',
    // 气温：7月最高 22℃；降水：7月最高 80mm
    temperature: [-10.0, -8.0, -2.0, 6.0, 14.0, 18.0, 22.0, 20.0, 14.0, 6.0, 0.0, -6.0],
    precipitation: [40.0, 30.0, 40.0, 40.0, 50.0, 60.0, 80.0, 70.0, 60.0, 60.0, 50.0, 40.0],
  },
  {
    id: 'athens',
    name: '雅典',
    lat: 37.9842,
    lng: 23.7281,
    altitude: 107,
    climateKey: 'mediterranean',
    climateName: '地中海气候',
    feature: '在地中海地区分布最广，夏季炎热干燥，冬季温和湿润。',
    // 气温：7-8月最高 28℃；降水：12月最高 60mm，7-8月接近 0
    temperature: [10.0, 11.0, 13.0, 16.0, 21.0, 26.0, 28.0, 28.0, 24.0, 19.0, 14.0, 11.0],
    precipitation: [50.0, 40.0, 30.0, 20.0, 15.0, 5.0, 3.0, 3.0, 10.0, 40.0, 50.0, 60.0],
  },
  {
    id: 'yakutsk',
    name: '雅库茨克',
    lat: 62.0355,
    lng: 129.6755,
    altitude: 99,
    climateKey: 'subarctic',
    climateName: '亚寒带针叶林气候',
    feature: '分布在亚欧大陆和北美洲的北部，冬季严寒，夏季温暖，地面生长着大片针叶林。',
    // 气温：7月最高 20℃；降水：7-8月最高 50mm
    temperature: [-42.0, -35.0, -22.0, -6.0, 6.0, 16.0, 20.0, 16.0, 6.0, -8.0, -28.0, -40.0],
    precipitation: [10.0, 10.0, 5.0, 10.0, 20.0, 40.0, 50.0, 50.0, 30.0, 20.0, 15.0, 10.0],
  },
  {
    id: 'beijing',
    name: '北京',
    lat: 39.9042,
    lng: 116.4074,
    altitude: 31,
    climateKey: 'temperate-monsoon',
    climateName: '温带季风气候',
    feature: '分布在温带地区的亚欧大陆东岸，受季风影响，夏季高温多雨，冬季寒冷干燥。',
    // 气温：8月最高 30℃；降水：8月最高 240mm
    temperature: [-4.0, -1.0, 6.0, 13.5, 20.0, 24.5, 28.0, 30.0, 22.0, 14.0, 6.0, 0.0],
    precipitation: [3.0, 5.0, 10.0, 25.0, 35.0, 70.0, 180.0, 240.0, 55.0, 25.0, 10.0, 3.0],
  },
  {
    id: 'lhasa',
    name: '拉萨',
    lat: 29.6520,
    lng: 91.1721,
    altitude: 3648,
    climateKey: 'plateau',
    climateName: '高原山地气候',
    feature: '分布在亚洲、欧洲、非洲和南、北美洲的一些海拔很高的高山高原地区。一般来说，地势越高，气温越低。',
    // 气温：7-8月最高 18℃；降水：8月最高 140mm
    temperature: [-2.0, 1.0, 4.0, 8.0, 12.0, 16.0, 18.0, 18.0, 14.0, 8.0, 2.0, -1.0],
    precipitation: [0.0, 2.0, 3.0, 5.0, 30.0, 70.0, 120.0, 140.0, 60.0, 10.0, 2.0, 1.0],
  },
  {
    id: 'london',
    name: '伦敦',
    lat: 51.5074,
    lng: -0.1278,
    altitude: 60,
    climateKey: 'temperate-marine',
    climateName: '温带海洋性气候',
    feature: '分布在温带地区的大陆西岸，受海面吹来的暖湿西风影响，全年温和多雨。',
    // 气温：7-8月最高 18℃；降水：全年均匀 50~70mm
    temperature: [5.0, 5.0, 7.0, 10.0, 13.0, 16.0, 18.0, 18.0, 15.0, 11.0, 7.0, 5.0],
    precipitation: [60.0, 50.0, 50.0, 55.0, 60.0, 60.0, 60.0, 65.0, 60.0, 70.0, 65.0, 60.0],
  },
  {
    id: 'vostok',
    name: '东方站',
    lat: -78.4644,
    lng: 106.8370,
    altitude: 3420,
    climateKey: 'polar',
    climateName: '极地气候',
    feature: '分布在南极大陆和格陵兰岛的大部分地区，气温极低，地面全被冰雪覆盖。',
    // 气温：7-8月最低 -72℃；降水：全年 0
    temperature: [-32.0, -45.0, -58.0, -64.0, -68.0, -70.0, -72.0, -72.0, -68.0, -58.0, -44.0, -32.0],
    precipitation: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  },
]

const mapRef = ref<HTMLDivElement | null>(null)
const chartRef = ref<HTMLDivElement | null>(null)

const mapInstance = shallowRef<LMap | null>(null)
const markerMap = new Map<string, LMarker>()
const chartInstance = shallowRef<echarts.ECharts | null>(null)

const selectedCityId = ref<string>('')
const currentCity = ref<CityItem | null>(null)

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
    // 地图飞向该城市（不打开 popup，因为已经去掉了主要气候类型文字框）
    if (mapInstance.value) {
      mapInstance.value.flyTo([city.lat, city.lng], 4, { duration: 1.0 })
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
  // 瓦片底图：arcgis-tiles 服务（仅此一个瓦片源，无 fallback）
  const tileLayer = L.tileLayer(
    'https://zdys.szjx.ai-study.net/geo-resources-folder/tiles/arcgis-tiles/{z}/{x}/{y}.png',
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

  // 标注所有城市
  cityList.forEach((city) => {
    // 关键：使用 Leaflet 原生 marker + custom icon，
    // iconSize 与 iconAnchor 使用「像素-像素坐标」而非「经纬度坐标」，
    // 这样缩放时大头针不会飘动（位置由 marker 的 latLng 锁定）
    const redPinIcon = L.icon({
      iconUrl: makePinSvg(city.name, city.lat, city.lng),
      iconSize: [220, 56],
      iconAnchor: [20, 50], // 针尖对准坐标点
      popupAnchor: [0, -46],
    })
    const marker = L.marker([city.lat, city.lng], {
      icon: redPinIcon,
      // 关键：禁用拖拽、设置 riseOffset 让选中的 marker 在最上层
      riseOnHover: true,
      riseOffset: 250,
      keyboard: false,
    }).addTo(map)
    // 不再 bindPopup（已去掉主要气候类型文字框）
    marker.on('click', () => {
      selectedCityId.value = city.id
      currentCity.value = city
      // 飞向该城市（仅移动地图，不打开 popup）
      map.flyTo([city.lat, city.lng], 4, { duration: 1.0 })
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

// 用 SVG 内联生成大头针图标（避免使用 divIcon 缩放时位置漂移）
function makePinSvg(name: string, lat: number, lng: number): string {
  const label = `${name}（${lng.toFixed(2)}°E，${lat.toFixed(2)}N）`
  // 转义 XML 特殊字符
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#ff6b7a"/>
      <stop offset="60%" stop-color="#e63946"/>
      <stop offset="100%" stop-color="#b71c1c"/>
    </radialGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- 红色圆形针头 -->
  <circle cx="20" cy="20" r="10" fill="url(#g)" stroke="#fff" stroke-width="2" filter="url(#s)"/>
  <!-- 针身 -->
  <line x1="20" y1="28" x2="20" y2="42" stroke="#b71c1c" stroke-width="2"/>
  <!-- 文字框 -->
  <rect x="38" y="6" width="178" height="28" rx="6" ry="6" fill="rgba(230,57,70,0.95)" stroke="#fff" stroke-width="1" filter="url(#s)"/>
  <text x="127" y="25" text-anchor="middle" font-family="Microsoft YaHei, PingFang SC, Arial, sans-serif" font-size="12" font-weight="600" fill="#fff">${safe}</text>
</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
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
  // 根据当前城市数据动态计算 Y 轴范围
  const tMin = Math.min(...currentCity.value.temperature)
  const tMax = Math.max(...currentCity.value.temperature)
  const pMax = Math.max(...currentCity.value.precipitation)
  // 气温 Y 轴：上下留 10℃ 余量，整 5 对齐
  const yTempMin = Math.floor((tMin - 10) / 5) * 5
  const yTempMax = Math.ceil((tMax + 10) / 5) * 5
  // 降水 Y 轴：向上取 50 整
  const yPrecMax = Math.ceil((pMax + 50) / 50) * 50

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
    toolbox: {
      show: false, // 不在图表内部显示工具栏（导出图片按钮在标题栏）
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
        min: yTempMin,
        max: yTempMax,
        nameTextStyle: { color: '#0b3660', fontWeight: 600 },
        axisLine: { lineStyle: { color: '#2ec4b6' } },
        axisLabel: { color: '#0b3660' },
        splitLine: { lineStyle: { type: 'dashed', color: 'rgba(125, 168, 201, 0.4)' } },
      },
      {
        type: 'value',
        name: '降水量/毫米',
        min: 0,
        max: yPrecMax,
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

// 导出当前城市的 ECharts 图为 PNG 图片
function exportChart() {
  if (!chartInstance.value || !currentCity.value) return
  const url = chartInstance.value.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  })
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentCity.value.name}_气温曲线和降水量柱状图.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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

/* ==================== 顶部标题栏（标题居中） ==================== */
.tp-header {
  position: relative;
  flex-shrink: 0;
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, rgba(46, 196, 182, 0.18) 0%, rgba(36, 124, 255, 0.18) 100%);
  border-bottom: 1px solid rgba(46, 196, 182, 0.35);
  backdrop-filter: blur(8px);
}

.header-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(90deg, #2ec4b6 0%, #247cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
  white-space: nowrap;
  text-align: center;
  position: relative;
  padding: 0 18px;
}

.header-title::before,
.header-title::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #2ec4b6, #247cff);
  border-radius: 2px;
}

.header-title::before {
  left: -50px;
  background: linear-gradient(90deg, transparent, #2ec4b6);
}

.header-title::after {
  right: -50px;
  background: linear-gradient(90deg, #247cff, transparent);
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
  padding: 12px 16px 8px 16px;
  border-bottom: 1px solid rgba(46, 196, 182, 0.25);
  flex-shrink: 0;
}

/* 标题栏右侧的导出图片按钮（与标题同一行） */
.card-title-export {
  margin-left: auto !important;
  background: linear-gradient(90deg, #2ec4b6 0%, #247cff 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600 !important;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(46, 196, 182, 0.35);
  transition: all 0.2s;
}

.card-title-export:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 196, 182, 0.5);
}

.card-title-export :deep(.el-icon) {
  font-size: 16px;
}

.card-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #4a6582;
  padding: 10px 16px 14px 16px;
  margin: 0;
}

/* ==================== 左侧面板（固定占 1/3） ==================== */
.tp-left {
  /* 关键：使用百分比宽度固定占 1/3（不论分辨率） */
  width: 33.333%;
  min-width: 320px;
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

/* ==================== 城市气候类型信息卡 ==================== */
.city-info {
  padding: 10px 16px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.city-info-name {
  font-size: 14px;
  font-weight: 700;
  color: #0b3660;
  padding-bottom: 6px;
  border-bottom: 1px dashed rgba(46, 196, 182, 0.35);
}

.city-info-line {
  display: flex;
  gap: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #4a6582;
}

.city-info-label {
  font-weight: 600;
  color: #247cff;
  flex-shrink: 0;
}

.city-info-value {
  color: #0b3660;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.left-card.map-card {
  flex: 1 1 auto;
  min-height: 320px;
  overflow: hidden;
}

.left-card.map-card .card-title {
  flex-shrink: 0;
}

.leaflet-map {
  flex: 1 1 auto;
  width: 100%;
  min-height: 240px;
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

/* 平板横屏 / 小笔记本：1024px ~ 1200px（仍保持 1/3 布局） */
@media (max-width: 1200px) {
  .tp-header {
    height: 56px;
    padding: 0 16px;
  }
  .header-title {
    font-size: 18px;
    letter-spacing: 1px;
  }
  .header-title::before,
  .header-title::after {
    width: 40px;
  }
  .header-title::before {
    left: -30px;
  }
  .header-title::after {
    right: -30px;
  }
  .tp-main {
    gap: 12px;
    padding: 12px;
  }
  .tp-left {
    gap: 10px;
  }
  .left-card.map-card {
    min-height: 280px;
  }
  .leaflet-map {
    min-height: 220px;
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
  .city-info-name {
    font-size: 13px;
  }
  .city-info-line {
    font-size: 12px;
  }
}

/* 平板竖屏 / 大手机横屏：< 1024px（切换为上下布局） */
@media (max-width: 1024px) {
  .tp-header {
    height: 50px;
    padding: 0 12px;
  }
  .header-title {
    font-size: 16px;
    letter-spacing: 1px;
  }
  .header-title::before,
  .header-title::after {
    width: 24px;
  }
  .header-title::before {
    left: -16px;
  }
  .header-title::after {
    right: -16px;
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
    max-height: 50%;
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
  }
  .header-title {
    font-size: 14px;
    letter-spacing: 0.5px;
  }
  .header-title::before,
  .header-title::after {
    display: none;
  }
  .tp-main {
    gap: 8px;
    padding: 8px;
  }
  .tp-left {
    max-height: 45%;
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
  .city-select {
    width: calc(100% - 20px);
    margin: 6px 10px 2px 10px;
  }
  .city-info {
    padding: 8px 10px 10px 10px;
  }
  .city-info-name {
    font-size: 12px;
  }
  .city-info-line {
    font-size: 11px;
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
