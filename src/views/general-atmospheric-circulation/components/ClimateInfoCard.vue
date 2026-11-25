<template>
  <section ref="cardRoot" class="climate-info-card" aria-label="气候类型与典型地点" :style="{ '--climate-accent': climate?.color || '#76d9ec' }">
    <header class="climate-info-heading">
      <h3><i aria-hidden="true"></i>{{ climate?.name || '选择气候类型' }}</h3>
    </header>

    <template v-if="climate">
      <nav class="climate-content-tabs" aria-label="气候详情内容">
        <button type="button" :class="{ active: activeView === 'overview' }" :aria-pressed="activeView === 'overview'" @click="setView('overview')">气候概览</button>
        <button type="button" :class="{ active: activeView === 'chart' }" :aria-pressed="activeView === 'chart'" @click="setView('chart')">气温与降水</button>
      </nav>

      <section v-if="activeView === 'overview'" class="climate-overview" aria-label="气候概览">
      <figure v-if="climate.image && !imageFailed" class="climate-landscape" :data-image-note="climate.imageNote">
        <img :src="climate.image" :alt="climate.imageAlt || `${climate.name}典型景观示意`" loading="lazy" decoding="async" @error="imageFailed = true" />
      </figure>

      <dl class="climate-characteristics">
        <div class="climate-fact climate-fact-distribution climate-fact-wide"><dt>主要分布</dt><dd>{{ climate.distribution || '暂无说明' }}</dd></div>
        <div class="climate-fact climate-fact-temperature"><dt>气温特征</dt><dd>{{ climate.temperature || '暂无说明' }}</dd></div>
        <div class="climate-fact climate-fact-precipitation"><dt>降水特征</dt><dd>{{ climate.precipitation || '暂无说明' }}</dd></div>
        <div class="climate-fact climate-fact-circulation climate-fact-wide"><dt>形成原因</dt><dd>{{ climate.circulation || '暂无说明' }}</dd></div>
      </dl>

      <button v-if="availableStations.length" type="button" class="climate-chart-link" @click="setView('chart')">
        <span>查看典型地点气候图 →</span><small>{{ availableStations.map(station => station.name).join('、') }}</small>
      </button>
      </section>

      <section v-else class="climate-chart-view" aria-label="气温与降水">
      <section v-if="availableStations.length > 1 || !selectedStation" class="climate-stations" aria-label="选择典型地点">
        <h4>选择地点</h4>
        <div v-if="availableStations.length" class="climate-station-options">
          <button v-for="station in availableStations" :key="station.id" type="button"
            :class="{ selected: selectedStation?.id === station.id }" :aria-pressed="selectedStation?.id === station.id"
            @click="selectStation(station.id)">{{ station.name }}</button>
        </div>
        <p v-else class="climate-empty">此类型暂无地点月度数据。</p>
      </section>

      <section v-if="selectedStation" class="climate-station-detail" aria-live="polite">
        <div class="climate-station-heading"><h4>{{ selectedStation.name }}</h4><span>{{ coordinates }}</span></div>
        <div v-if="hasAnnualValues" class="climate-annual-summary" aria-label="图册年值">
          <div v-if="selectedStation.annualTemperatureC !== undefined"><span>图册年均温</span><strong>{{ formatValue(selectedStation.annualTemperatureC) }} <small>℃</small></strong></div>
          <div v-if="selectedStation.annualPrecipitationMm != null"><span>图册年降水量</span><strong>{{ formatValue(selectedStation.annualPrecipitationMm) }} <small>mm</small></strong></div>
          <div v-else-if="selectedStation.annualPrecipitationUpperBoundMm !== undefined"><span>图册年降水量</span><strong>＜{{ selectedStation.annualPrecipitationUpperBoundMm }} <small>mm</small></strong></div>
        </div>
        <template v-if="chart.hasData">
          <div class="climate-chart-legend" aria-hidden="true"><span><i class="temperature-key"></i>月均气温</span><span><i class="precipitation-key"></i>月降水量</span></div>
          <svg class="climate-monthly-chart" :viewBox="`0 0 ${chart.frame.width} ${chart.frame.height}`" role="img"
            :aria-label="`${selectedStation.name}各月平均气温与降水量；红线对应左侧摄氏温标，蓝柱对应右侧毫米刻度。月度数值可在下方展开查看。`">
            <text x="5" y="14" class="temperature-axis-title">气温 / ℃</text>
            <text x="355" y="14" text-anchor="end" class="precipitation-axis-title">降水 / mm</text>
            <g v-for="tick in chart.temperatureAxis.ticks" :key="`temperature-${tick.value}`">
              <line :x1="chart.frame.left" :x2="chart.frame.left + chart.frame.plotWidth" :y1="tick.y" :y2="tick.y"
                class="chart-grid-line" :class="{ 'zero-temperature': tick.value === 0 }" />
              <text :x="chart.frame.left - 8" :y="tick.y + 3" text-anchor="end" class="temperature-axis-value">{{ tick.value }}</text>
            </g>
            <g v-for="tick in chart.precipitationAxis.ticks" :key="`precipitation-${tick.value}`">
              <line :x1="chart.frame.left + chart.frame.plotWidth" :x2="chart.frame.left + chart.frame.plotWidth + 4" :y1="tick.y" :y2="tick.y" class="chart-axis-line" />
              <text :x="chart.frame.left + chart.frame.plotWidth + 7" :y="tick.y + 3" class="precipitation-axis-value">{{ tick.value }}</text>
            </g>
            <path :d="`M ${chart.frame.left} ${chart.frame.top} V ${chart.bottom} H ${chart.frame.left + chart.frame.plotWidth} V ${chart.frame.top}`" class="chart-axis-line" />
            <rect v-for="bar in chart.bars" :key="`bar-${bar.month}`" :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height" class="precipitation-bar">
              <title>{{ bar.month }}月降水量：{{ formatValue(bar.value) }} mm</title>
            </rect>
            <path v-for="(path, index) in chart.temperaturePaths" :key="`curve-${index}`" :d="path" class="temperature-curve" />
            <circle v-for="point in chart.points" :key="`point-${point.month}`" :cx="point.x" :cy="point.y" r="2.2" class="temperature-point">
              <title>{{ point.month }}月平均气温：{{ formatValue(point.value) }} ℃</title>
            </circle>
            <g v-for="month in chart.months" :key="month.month">
              <text v-if="month.precipitation === null" :x="month.x" :y="chart.bottom - 3" text-anchor="middle" class="chart-missing">—</text>
              <text :x="month.x" :y="chart.bottom + 17" text-anchor="middle" class="chart-month">{{ month.month }}</text>
            </g>
            <text x="180" y="236" text-anchor="middle" class="chart-month">月份</text>
          </svg>
          <p v-if="chart.missingMonths" class="climate-data-note">{{ chart.missingMonths }} 个月含缺测值；缺测处不连线、不补柱。</p>
          <details class="climate-monthly-values">
            <summary>查看月度数值</summary>
            <table><caption>{{ selectedStation.name }}月度气候数据</caption><thead><tr><th scope="col">月份</th><th scope="col">气温 / ℃</th><th scope="col">降水 / mm</th></tr></thead>
              <tbody><tr v-for="month in chart.months" :key="month.month"><th scope="row">{{ month.month }}月</th><td>{{ formatValue(month.temperature) }}</td><td>{{ formatValue(month.precipitation) }}</td></tr></tbody>
            </table>
          </details>
        </template>
        <p v-else class="climate-empty">该地点暂未提供可用的月度气温、降水数值。</p>
        <p v-if="selectedStation.dataNote" class="climate-data-note">{{ selectedStation.dataNote }}</p>
      </section>
      <p v-else-if="availableStations.length" class="climate-empty">选择地点，查看各月气温与降水。</p>
      </section>
    </template>
    <p v-else class="climate-empty">点击地图区域或气候图例，查看对应气候。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { createClimateChartModel, type ClimateStationData, type ClimateTypeInfo } from './climate-chart'

const props = withDefaults(defineProps<{
  climate?: ClimateTypeInfo | null
  stations?: readonly ClimateStationData[]
  stationId?: string | null
}>(), { stations: () => [] })
const emit = defineEmits<{ selectStation: [stationId: string]; close: [] }>()
const cardRoot = ref<HTMLElement | null>(null)
const activeView = ref<'overview' | 'chart'>('overview')
const imageFailed = ref(false)
watch(() => props.climate?.image, () => { imageFailed.value = false })
const availableStations = computed(() => props.climate ? props.stations.filter(station => station.climateId === props.climate!.id) : [])
const selectedStation = computed(() => availableStations.value.find(station => station.id === props.stationId))
const chart = computed(() => createClimateChartModel(selectedStation.value))
const hasAnnualValues = computed(() => {
  const station = selectedStation.value
  return !!station && (station.annualTemperatureC !== undefined || station.annualPrecipitationMm != null
    || station.annualPrecipitationUpperBoundMm !== undefined)
})
watch(() => [props.climate?.id, selectedStation.value?.id], () => {
  activeView.value = selectedStation.value ? 'chart' : 'overview'
}, { immediate: true })
watch([activeView, () => selectedStation.value?.id, () => props.climate?.id], async () => {
  await nextTick()
  // The FloatingFeatureCard body is the only scroll owner; start each new view at its top.
  const body = cardRoot.value?.closest<HTMLElement>('.feature-card-content')
  if (body) body.scrollTop = 0
}, { flush: 'post' })
function selectStation(stationId: string) {
  activeView.value = 'chart'
  emit('selectStation', stationId)
}
function setView(view: 'overview' | 'chart') {
  activeView.value = view
  const station = selectedStation.value ?? availableStations.value[0]
  if (view === 'chart' && station) selectStation(station.id)
}
const coordinates = computed(() => {
  const station = selectedStation.value
  if (!station || !Number.isFinite(station.lat) || !Number.isFinite(station.lon)) return ''
  return `${formatValue(Math.abs(station.lat))}°${station.lat < 0 ? 'S' : 'N'} · ${formatValue(Math.abs(station.lon))}°${station.lon < 0 ? 'W' : 'E'}`
})
function formatValue(value: number | null) {
  return value === null ? '—' : String(Math.round(value * 10) / 10)
}
</script>

<style scoped>
.climate-info-card { width: 100%; min-width: 0; height: auto; max-height: none; overflow: visible; box-sizing: border-box; padding: 12px 14px 14px; color: var(--feature-text, #d7e9f3); font-size: 12px; container-type: inline-size; }
.climate-info-heading { margin-bottom: 11px; }
.climate-info-heading h3 { display: flex; align-items: center; gap: 8px; margin: 0; color: #e5f3fa; font-size: 16px; line-height: 1.35; }
.climate-info-heading h3 i { display: block; width: 12px; height: 12px; flex: 0 0 12px; border-radius: 3px; background: var(--climate-accent); }
.climate-content-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 14px; padding: 3px; border: 1px solid #244a5f; border-radius: 8px; background: #061c2c; }
.climate-content-tabs button { min-height: 31px; padding: 5px 8px; border: 0; border-radius: 5px; background: transparent; color: #8faec2; font: inherit; cursor: pointer; }
.climate-content-tabs button.active { background: #1a455a; color: #dffbff; font-weight: 600; }
.climate-chart-link { display: grid; width: 100%; gap: 3px; margin-top: 15px; padding: 10px 11px; border: 1px solid #356177; border-radius: 7px; background: #0c2d41; color: #9de5ee; font: inherit; text-align: left; cursor: pointer; }
.climate-chart-link small { color: #95b6c9; font-size: 10px; line-height: 1.4; }
.climate-landscape { margin: 0 0 13px; }
.climate-landscape img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 7px; }
.climate-characteristics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; }
.climate-fact {
  --fact-accent: #85d8bd;
  --fact-wash: #85d8bd14;
  position: relative;
  min-width: 0;
  padding: 13px 13px 14px 20px;
  border: 1px solid #b9d5e51c;
  border-radius: 10px;
  background: linear-gradient(115deg, var(--fact-wash), transparent 90%), #0b2232;
  box-shadow: inset 0 1px 0 #ffffff05;
}
.climate-fact::before { content: ''; position: absolute; top: 13px; bottom: 13px; left: 0; width: 4px; border-radius: 0 3px 3px 0; background: var(--fact-accent); }
.climate-fact-temperature { --fact-accent: #ffb37d; --fact-wash: #ffb37d16; }
.climate-fact-precipitation { --fact-accent: #83bdff; --fact-wash: #83bdff16; }
.climate-fact-circulation { --fact-accent: #bdacf6; --fact-wash: #bdacf615; }
.climate-fact-wide { grid-column: 1 / -1; }
.climate-characteristics dt { margin-bottom: 7px; color: var(--fact-accent); font-size: 12px; font-weight: 600; line-height: 1.4; letter-spacing: .06em; }
.climate-characteristics dd { margin: 0; color: #e0eaf1; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
@container (max-width: 300px) {
  .climate-characteristics { grid-template-columns: minmax(0, 1fr); }
}
.climate-stations { margin: 0 0 13px; padding-bottom: 12px; border-bottom: 1px solid var(--feature-divider, #244a5d); }
.climate-station-detail { margin: 0; padding: 0; }
.climate-info-card h4 { margin: 0; color: #d9eef7; font-size: 12px; line-height: 1.4; }
.climate-station-options { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 8px; }
.climate-station-options button { min-height: 31px; padding: 5px 10px; border: 1px solid #31566b; border-radius: 6px; background: #0a2233; color: #bed4e1; font: inherit; cursor: pointer; }
.climate-station-options button.selected { border-color: #78d7e9; background: #18485b; color: #effcff; }
.climate-station-options button:hover, .climate-chart-link:hover { border-color: #78d7e9; }
.climate-info-card button:focus-visible, .climate-monthly-values summary:focus-visible { outline: 2px solid #8ee6ee; outline-offset: 3px; }
.climate-station-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 8px; }
.climate-station-heading h4 { font-size: 15px; }
.climate-station-heading span { color: #93b3c6; font-size: 10px; line-height: 1.7; }
.climate-chart-legend { display: flex; justify-content: center; gap: 18px; margin: 10px 0 5px; font-size: 10px; color: #b9d0df; }
.climate-chart-legend span { display: flex; align-items: center; gap: 5px; }
.temperature-key { width: 18px; height: 2px; background: #ff7776; }
.precipitation-key { width: 11px; height: 9px; background: #59a8ee; }
.climate-monthly-chart { display: block; width: 100%; max-width: 360px; height: auto; aspect-ratio: 3 / 2; margin: 0 auto; overflow: visible; font-family: inherit; }
.climate-monthly-chart text { font-size: 10px; }
.chart-grid-line { stroke: #376077; stroke-width: .6; opacity: .7; }
.chart-grid-line.zero-temperature { stroke: #cc9b9f; stroke-dasharray: 3 3; opacity: .8; }
.chart-axis-line { fill: none; stroke: #8da8ba; stroke-width: .7; }
.temperature-axis-title, .temperature-axis-value { fill: #ff9893; }
.precipitation-axis-title, .precipitation-axis-value { fill: #8fc7f6; }
.precipitation-bar { fill: #59a8ee; opacity: .82; }
.temperature-curve { fill: none; stroke: #ff7776; stroke-width: 2.1; stroke-linejoin: round; stroke-linecap: round; }
.temperature-point { fill: #ff8b83; stroke: #0c2335; stroke-width: .7; }
.chart-month { fill: #c7dce8; }
.chart-missing { fill: #91b6cf; }
.climate-data-note, .climate-empty { margin: 9px 0 0; color: #91b2c6; font-size: 11px; line-height: 1.6; }
.climate-annual-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 10px 0 8px; }
.climate-annual-summary>div { display: grid; gap: 3px; padding: 7px 9px; border-radius: 6px; background: #0d2a3b; }
.climate-annual-summary span { color: #91b3c7; font-size: 10px; }
.climate-annual-summary strong { color: #e2f1f8; font-size: 17px; line-height: 1.2; font-weight: 600; font-variant-numeric: tabular-nums; }
.climate-annual-summary small { color: #b0ccdc; font-size: 10px; font-weight: 400; }
.climate-monthly-values { margin-top: 10px; }
.climate-monthly-values summary { width: fit-content; color: #86d3e7; font-size: 11px; cursor: pointer; }
.climate-monthly-values table { width: 100%; margin-top: 7px; border-collapse: collapse; color: #bfd6e4; font-size: 11px; text-align: right; font-variant-numeric: tabular-nums; }
.climate-monthly-values caption { padding-bottom: 5px; color: #88a9bf; font-size: 10px; text-align: left; }
.climate-monthly-values th, .climate-monthly-values td { padding: 5px 7px; border-bottom: 1px solid #1c3b50; }
.climate-monthly-values th { font-weight: 500; }
.climate-monthly-values th:first-child { text-align: left; }
</style>
