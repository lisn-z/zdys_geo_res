<template>
  <FloatingFeatureCard title="太阳直射点移动" :subtitle="activeView === 'map' ? '当前直射点的经纬位置' : '直射纬度年变化'" variant="track"
    :initial-top="initialTop" :initial-right="initialRight" :initial-collapsed="initialCollapsed"
    :bottom-inset="bottomInset">
    <template #header-meta>
      <span class="current-date">{{ currentMonthDay }}</span>
    </template>

    <div class="track-view-tabs" role="tablist" aria-label="太阳直射点视图">
      <button :id="`${viewId}-map-tab`" type="button" role="tab" :aria-selected="activeView === 'map'"
        :aria-controls="`${viewId}-panel`" :class="{ active: activeView === 'map' }" @click="activeView = 'map'">地图定位</button>
      <button :id="`${viewId}-annual-tab`" type="button" role="tab" :aria-selected="activeView === 'annual'"
        :aria-controls="`${viewId}-panel`" :class="{ active: activeView === 'annual' }" @click="activeView = 'annual'">年变化</button>
      <span>{{ activeView === 'map' ? '经度 / 纬度' : '月份 / 直射纬度' }}</span>
    </div>

    <div :id="`${viewId}-panel`" class="solar-map-frame" role="tabpanel"
      :aria-labelledby="`${viewId}-${activeView}-tab`">
      <svg class="solar-map-svg" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet" role="img"
        :class="{ 'annual-chart-svg': activeView === 'annual' }"
        :aria-label="activeView === 'map' ? `太阳直射点地图，${currentLatitude}，${currentLongitude}` : '太阳直射纬度随月份变化曲线'">
        <defs>
          <linearGradient :id="`${viewId}-shade`" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#010814" stop-opacity="0.52"></stop>
            <stop offset="50%" stop-color="#010814" stop-opacity="0.04"></stop>
            <stop offset="100%" stop-color="#010814" stop-opacity="0.52"></stop>
          </linearGradient>
          <linearGradient :id="`${viewId}-area`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffe17a" stop-opacity="0.34"></stop>
            <stop offset="48%" stop-color="#55c8e8" stop-opacity="0.15"></stop>
            <stop offset="100%" stop-color="#031321" stop-opacity="0.03"></stop>
          </linearGradient>
          <filter :id="`${viewId}-glow`" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>

        <template v-if="activeView === 'map'">
          <image :href="earthTexture" x="0" y="0" width="720" height="360" preserveAspectRatio="none"></image>
          <rect x="0" y="0" width="720" height="360" :fill="`url(#${viewId}-shade)`"></rect>
        </template>
        <path v-else :d="trackAreaPath" class="map-track-area" :fill="`url(#${viewId}-area)`"></path>

        <g class="map-grid-lines">
          <template v-if="activeView === 'map'">
            <line v-for="lon in longitudeTicks" :key="`lon-${lon}`" :x1="lonToX(lon)" y1="0" :x2="lonToX(lon)" y2="360"></line>
          </template>
          <template v-else>
            <line v-for="tick in monthTicks" :key="`month-${tick.progress}`" :x1="tick.progress * 720" y1="0"
              :x2="tick.progress * 720" y2="360"></line>
          </template>
          <line v-for="lat in latitudeTicks" :key="`lat-${lat.value}`" x1="0" :y1="latToY(lat.value)" x2="720"
            :y2="latToY(lat.value)"
            :class="{ major: Math.abs(lat.value) < 0.1 || Math.abs(Math.abs(lat.value) - 23.44) < 0.1 }"></line>
        </g>

        <g class="map-latitude-labels">
          <text v-for="lat in latitudeTicks" :key="`lat-label-${lat.value}`" x="10" :y="latToY(lat.value) - 5">
            {{ lat.label }}
          </text>
        </g>

        <g v-if="activeView === 'map'" class="map-axis-labels">
          <text v-for="lon in longitudeLabelTicks" :key="`longitude-label-${lon}`" :x="axisLabelX(lonToX(lon))" y="348"
            :text-anchor="lon === -180 ? 'start' : lon === 180 ? 'end' : 'middle'">{{ longitudeLabel(lon) }}</text>
        </g>
        <g v-else class="map-axis-labels">
          <text v-for="tick in monthTicks" :key="`${tick.label}-${tick.progress}`" :x="tick.progress * 720" y="348"
            :text-anchor="tick.progress === 0 ? 'start' : tick.progress === 1 ? 'end' : 'middle'">
            {{ tick.label }}
          </text>
        </g>

        <template v-if="activeView === 'map'">
          <line :x1="geographicPointX" :x2="geographicPointX" :y1="geographicPointY + 8" y2="336" class="current-day-guide"></line>
          <circle :cx="geographicPointX" :cy="geographicPointY" r="7.5" class="map-track-pulse"></circle>
          <circle :cx="geographicPointX" :cy="geographicPointY" r="4.5" class="map-track-dot"></circle>
          <text :x="Math.min(678, Math.max(42, geographicPointX))" :y="Math.max(22, geographicPointY - 14)"
            text-anchor="middle" class="map-current-label">直射点</text>
        </template>
        <template v-else>
          <path :d="trackPath" class="map-track-path" :filter="`url(#${viewId}-glow)`"></path>
          <line :x1="pointX" :x2="pointX" :y1="pointY + 8" y2="336" class="current-day-guide"></line>
          <circle :cx="pointX" :cy="pointY" r="7.5" class="map-track-pulse"></circle>
          <circle :cx="pointX" :cy="pointY" r="4.5" class="map-track-dot"></circle>
          <text :x="Math.min(640, Math.max(80, pointX))" :y="Math.max(22, pointY - 13)" text-anchor="middle"
            class="map-current-label">直射纬度 · {{ currentLatitude }}</text>
        </template>
      </svg>
    </div>

    <footer class="track-card-foot">
      <strong v-if="activeView === 'map'" class="current-coordinate">{{ currentLatitude }} · {{ currentLongitude }}</strong>
      <strong v-else class="current-coordinate">直射纬度 {{ currentLatitude }}</strong>
      <span>{{ solarTermName }} · 年内第 {{ dayOfYear }} 天</span>
    </footer>
  </FloatingFeatureCard>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'

defineProps<{
  earthTexture: string
  trackPath: string
  trackAreaPath: string
  pointX: number
  pointY: number
  geographicPointX: number
  geographicPointY: number
  currentMonthDay: string
  currentLatitude: string
  currentLongitude: string
  solarTermName: string
  dayOfYear: number
  bottomInset: number
  initialTop?: number
  initialRight?: number
  initialCollapsed?: boolean
}>()

const activeView = ref<'map' | 'annual'>('map')
const viewId = `solar-track-${useId()}`
const longitudeTicks = [-180, -135, -90, -45, 0, 45, 90, 135, 180]
const longitudeLabelTicks = [-180, -120, -60, 0, 60, 120, 180]
const latitudeTicks = [
  { value: 60, label: '60°N' },
  { value: 45, label: '45°N' },
  { value: 23.44, label: '北回归线' },
  { value: 0, label: '赤道' },
  { value: -23.44, label: '南回归线' },
  { value: -45, label: '45°S' },
  { value: -60, label: '60°S' },
]
const monthTicks = [
  { label: '1月', progress: 0 },
  // The chart uses a 365-day teaching year; month boundaries are not equally spaced.
  { label: '3月', progress: 59 / 365 },
  { label: '6月', progress: 151 / 365 },
  { label: '9月', progress: 243 / 365 },
  { label: '12月', progress: 334 / 365 },
  { label: '次年1月', progress: 1 },
]

function lonToX(longitude: number) {
  return ((Math.max(-180, Math.min(180, longitude)) + 180) / 360) * 720
}

function longitudeLabel(longitude: number) {
  if (longitude === 0 || Math.abs(longitude) === 180) return `${Math.abs(longitude)}°`
  return `${Math.abs(longitude)}°${longitude < 0 ? 'W' : 'E'}`
}

function axisLabelX(x: number) {
  return Math.min(712, Math.max(8, x))
}

function latToY(latitude: number) {
  return ((90 - Math.max(-90, Math.min(90, latitude))) / 180) * 360
}
</script>

<style scoped>
.current-date {
  white-space: nowrap;
}

.track-view-tabs {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px 0;
  background: rgba(1, 8, 17, 0.72);
}

.track-view-tabs button {
  border: 1px solid rgba(113, 191, 213, 0.24);
  border-radius: 5px;
  padding: 4px 9px;
  color: var(--feature-muted);
  background: transparent;
  font: inherit;
  font-size: clamp(11px, 0.55vw, 14px);
  line-height: 1.4;
  cursor: pointer;
}

.track-view-tabs button.active {
  border-color: rgba(85, 200, 232, 0.54);
  color: #dcf5fd;
  background: rgba(37, 144, 177, 0.22);
}

.track-view-tabs button:focus-visible {
  outline: 2px solid #55c8e8;
  outline-offset: 2px;
}

.track-view-tabs > span {
  margin-left: auto;
  color: var(--feature-muted);
  font-size: clamp(10px, 0.48vw, 12px);
  white-space: nowrap;
}

:global(.theme-light) .track-view-tabs {
  background: rgba(218, 235, 242, 0.76);
}

:global(.theme-light) .track-view-tabs button.active {
  color: #075973;
  background: rgba(43, 159, 192, 0.13);
}

.solar-map-frame {
  position: relative;
  padding: 8px 8px 0;
  background: rgba(1, 8, 17, 0.72);
}

:global(.theme-light) .solar-map-frame {
  background: rgba(218, 235, 242, 0.76);
}

.solar-map-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: hidden;
  border: 1px solid rgba(116, 214, 245, 0.28);
  border-radius: 8px;
  background: #03101c;
}

.map-grid-lines line {
  stroke: rgba(210, 235, 242, 0.31);
  stroke-width: 0.8;
  stroke-dasharray: 5 5;
}

.map-grid-lines line.major {
  stroke: rgba(255, 209, 83, 0.62);
  stroke-width: 1.2;
  stroke-dasharray: 7 4;
}

.map-latitude-labels text,
.map-axis-labels text {
  fill: rgba(229, 243, 247, 0.84);
  font-size: 13px;
  font-weight: 650;
  paint-order: stroke;
  stroke: rgba(1, 9, 16, 0.86);
  stroke-width: 2.4px;
}

.map-axis-labels text {
  fill: rgba(188, 218, 228, 0.72);
  font-size: 12px;
}

.map-track-area {
  stroke: none;
}

:global(.theme-light) .annual-chart-svg {
  background: #edf5f8;
}

:global(.theme-light) .annual-chart-svg .map-grid-lines line {
  stroke: rgba(69, 119, 139, 0.28);
}

:global(.theme-light) .annual-chart-svg .map-grid-lines line.major {
  stroke: rgba(162, 120, 17, 0.5);
}

:global(.theme-light) .annual-chart-svg .map-latitude-labels text,
:global(.theme-light) .annual-chart-svg .map-axis-labels text {
  fill: #496778;
  stroke: #edf5f8;
}

:global(.theme-light) .annual-chart-svg .map-current-label {
  fill: #805a0a;
  stroke: #edf5f8;
}

:global(.theme-light) .annual-chart-svg .current-day-guide {
  stroke: rgba(163, 122, 28, 0.58);
}

.map-track-path {
  fill: none;
  stroke: #ffd54f;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.current-day-guide {
  stroke: rgba(255, 222, 105, 0.38);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.map-track-pulse {
  fill: rgba(255, 213, 79, 0.18);
  stroke: rgba(255, 232, 151, 0.54);
  stroke-width: 1;
}

.map-track-dot {
  fill: #fff4bd;
  stroke: #ffd54f;
  stroke-width: 2.5;
}

.map-current-label {
  fill: #fff0a4;
  font-size: 12px;
  font-weight: 750;
  paint-order: stroke;
  stroke: rgba(2, 10, 18, 0.88);
  stroke-width: 3px;
}

.track-card-foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 8px 11px 10px;
  color: var(--feature-muted);
  font-size: clamp(10px, 0.48vw, 12px);
  background: rgba(2, 12, 21, 0.76);
}

:global(.theme-light) .track-card-foot {
  background: rgba(241, 248, 251, 0.90);
}

.track-card-foot strong {
  color: #d99a00;
  font-size: clamp(10px, 0.48vw, 13px);
  font-weight: 700;
}

.current-coordinate {
  white-space: nowrap;
}

:global(.theme-dark) .track-card-foot strong {
  color: rgba(255, 221, 108, 0.92);
}

.track-card-foot span:last-child {
  text-align: right;
}

@media (min-width: 1800px) and (min-height: 900px) {
  .solar-map-frame {
    padding: 11px 11px 0;
  }

  .track-card-foot {
    padding: 10px 14px 12px;
  }
}

@media (max-width: 720px) {
  .track-view-tabs > span {
    display: none;
  }

  .track-card-foot {
    grid-template-columns: 1fr;
    gap: 4px;
    text-align: center;
  }

  .track-card-foot span:last-child {
    text-align: center;
  }
}
</style>
