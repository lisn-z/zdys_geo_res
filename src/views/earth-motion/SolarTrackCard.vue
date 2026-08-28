<template>
  <FloatingFeatureCard title="太阳直射点移动" subtitle="南北回归线之间的周年摆动" variant="track" :initial-bottom="bottomInset + 10"
    :initial-right="18" :bottom-inset="bottomInset">
    <template #header-meta>
      <span class="current-date">{{ currentMonthDay }}</span>
    </template>

    <div class="solar-map-frame">
      <svg class="solar-map-svg" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="太阳直射点周年移动轨迹世界地图">
        <defs>
          <linearGradient id="mapShade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#010814" stop-opacity="0.52"></stop>
            <stop offset="50%" stop-color="#010814" stop-opacity="0.04"></stop>
            <stop offset="100%" stop-color="#010814" stop-opacity="0.52"></stop>
          </linearGradient>
          <linearGradient id="mapTrackAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffe17a" stop-opacity="0.34"></stop>
            <stop offset="48%" stop-color="#55c8e8" stop-opacity="0.15"></stop>
            <stop offset="100%" stop-color="#031321" stop-opacity="0.03"></stop>
          </linearGradient>
          <filter id="trackGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>

        <image :href="earthTexture" x="0" y="0" width="720" height="360" preserveAspectRatio="none"></image>
        <rect x="0" y="0" width="720" height="360" fill="url(#mapShade)"></rect>
        <path :d="trackAreaPath" class="map-track-area"></path>

        <g class="map-grid-lines">
          <line v-for="lon in longitudeTicks" :key="`lon-${lon}`" :x1="lonToX(lon)" y1="0" :x2="lonToX(lon)" y2="360">
          </line>
          <line v-for="lat in latitudeTicks" :key="`lat-${lat.value}`" x1="0" :y1="latToY(lat.value)" x2="720"
            :y2="latToY(lat.value)"
            :class="{ major: Math.abs(lat.value) < 0.1 || Math.abs(Math.abs(lat.value) - 23.44) < 0.1 }"></line>
        </g>

        <g class="map-latitude-labels">
          <text v-for="lat in latitudeTicks" :key="`lat-label-${lat.value}`" x="10" :y="latToY(lat.value) - 5">
            {{ lat.label }}
          </text>
        </g>

        <g class="map-month-labels">
          <text v-for="tick in monthTicks" :key="`${tick.label}-${tick.progress}`" :x="tick.progress * 720" y="348"
            :text-anchor="tick.progress === 0 ? 'start' : tick.progress === 1 ? 'end' : 'middle'">
            {{ tick.label }}
          </text>
        </g>

        <path :d="trackPath" class="map-track-path" filter="url(#trackGlow)"></path>
        <line :x1="pointX" :x2="pointX" :y1="pointY + 8" y2="360" class="current-day-guide"></line>
        <circle :cx="pointX" :cy="pointY" r="7.5" class="map-track-pulse"></circle>
        <circle :cx="pointX" :cy="pointY" r="4.5" class="map-track-dot"></circle>
        <text :x="Math.min(664, Math.max(56, pointX))" :y="Math.max(22, pointY - 13)" text-anchor="middle"
          class="map-current-label">太阳直射点 · {{ currentLatitude }}</text>
      </svg>
    </div>

    <footer class="track-card-foot">
      <span>北回归线 23.44°N</span>
      <strong>{{ solarTermName }} · 第 {{ dayOfYear }} 天</strong>
      <span>南回归线 23.44°S</span>
    </footer>
  </FloatingFeatureCard>
</template>

<script setup lang="ts">
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'

defineProps<{
  earthTexture: string
  trackPath: string
  trackAreaPath: string
  pointX: number
  pointY: number
  currentMonthDay: string
  currentLatitude: string
  solarTermName: string
  dayOfYear: number
  bottomInset: number
}>()

const longitudeTicks = [-180, -135, -90, -45, 0, 45, 90, 135, 180]
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
  { label: '3月', progress: 2 / 12 },
  { label: '6月', progress: 5 / 12 },
  { label: '9月', progress: 8 / 12 },
  { label: '12月', progress: 11 / 12 },
  { label: '1月', progress: 1 },
]

function lonToX(longitude: number) {
  return ((Math.max(-180, Math.min(180, longitude)) + 180) / 360) * 720
}

function latToY(latitude: number) {
  return ((90 - Math.max(-90, Math.min(90, latitude))) / 180) * 360
}
</script>

<style scoped>
.current-date {
  white-space: nowrap;
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
.map-month-labels text {
  fill: rgba(229, 243, 247, 0.84);
  font-size: 10px;
  font-weight: 650;
  paint-order: stroke;
  stroke: rgba(1, 9, 16, 0.86);
  stroke-width: 2.4px;
}

.map-month-labels text {
  fill: rgba(188, 218, 228, 0.72);
  font-size: 9px;
}

.map-track-area {
  fill: url(#mapTrackAreaGradient);
  stroke: none;
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
  font-size: 11px;
  font-weight: 750;
  paint-order: stroke;
  stroke: rgba(2, 10, 18, 0.88);
  stroke-width: 3px;
}

.track-card-foot {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 11px 10px;
  color: var(--feature-muted);
  font-size: clamp(9px, 0.43vw, 12px);
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
  .track-card-foot span {
    display: none;
  }

  .track-card-foot {
    grid-template-columns: 1fr;
    text-align: center;
  }
}
</style>
