<template>
  <FloatingFeatureCard class="observation-station" :class="{ 'is-active': active, 'is-compact': compact }"
    :style="stationStyle" :title="station.name" variant="data" :collapsed="collapsed"
    :initial-right="initialRight" :initial-top="initialTop" :bottom-inset="bottomInset"
    :resizable="true" :draggable="!compact" :min-width="240" :min-height="260"
    @update:collapsed="emit('update:collapsed', $event)">
    <template #title-prefix><span class="station-color" aria-hidden="true"></span></template>
    <template #header-meta>
      <button type="button" class="theme-btn header-select" :class="{ active: selectedInBothViews }" :aria-pressed="selectedInBothViews"
        :aria-label="selectedInBothViews ? `${station.name}已应用到左右视图` : `将${station.name}同时应用到左右视图`"
        title="同时切换左右观测视图" @pointerdown.stop @click.stop="emit('syncView')">{{ selectedInBothViews ? '已选用' : '选用' }}</button>
      <button v-if="canRemove" type="button" class="theme-btn header-remove" :aria-label="`删除${station.name}`"
        :title="`删除${station.name}`" @pointerdown.stop @click.stop="emit('remove')">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" /></svg>
      </button>
    </template>

    <div class="station-content">
      <div class="moon-row">
        <div class="station-moon" role="img" :aria-label="observation.aboveHorizon ? `${station.name}的${currentPhaseName}` : `${station.name}当前无法看见月球，月球在地平线以下`">
          <MoonDisc v-if="observation.aboveHorizon" :phase="phase" :lighting="lighting" :observation="observation" />
          <div v-else class="unavailable-moon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M9 32s8-14 23-14 23 14 23 14-8 14-23 14S9 32 9 32Z" />
              <circle cx="32" cy="32" r="8" /><path d="m11 11 42 42" />
            </svg>
          </div>
        </div>
      </div>
      <div class="observation-status" :class="{ unavailable: !observation.aboveHorizon }" aria-live="polite">
        <h3>{{ observation.aboveHorizon ? currentPhaseName : '当前不可见' }}</h3>
        <p>{{ observation.aboveHorizon ? '月球在当地地平线上方' : '月球在当地地平线以下' }}</p>
        <span v-if="!observation.aboveHorizon" class="phase-reference">月相原理：{{ currentPhaseName }}</span>
      </div>

      <dl class="station-statistics">
        <div><dt>照亮比例</dt><dd>{{ illumination.toFixed(1) }}<small>%</small></dd></div>
        <div><dt>月龄</dt><dd>{{ phaseAge.toFixed(1) }}<small>天</small></dd></div>
        <div><dt>月心高度</dt><dd :class="{ negative: !observation.aboveHorizon }">{{ signedAngle(observation.altitude) }}</dd></div>
        <div><dt>月球方位</dt><dd>{{ observation.azimuth.toFixed(0) }}°<small>{{ compassName(observation.azimuth) }}</small></dd></div>
      </dl>

      <div class="station-parameters">
        <div v-if="station.readonly" class="preset-coordinates">
          <span class="preset-label">预设城市</span>
          <dl>
            <div><dt>纬度</dt><dd>{{ latitudeLabel }}</dd></div>
            <div><dt>经度</dt><dd>{{ longitudeLabel }}</dd></div>
          </dl>
        </div>
        <template v-else>
          <div class="parameter-block">
            <div class="parameter-heading"><span>纬度</span><output>{{ latitudeLabel }}</output></div>
            <ElSlider v-model="latitudeValue" :min="-90" :max="90" :step="0.01" :show-tooltip="false"
              :aria-label="`${station.name}观测纬度`" />
            <div class="parameter-scale"><span>90° S</span><span>赤道</span><span>90° N</span></div>
          </div>
          <div class="parameter-block">
            <div class="parameter-heading"><span>经度</span><output>{{ longitudeLabel }}</output></div>
            <ElSlider v-model="longitudeValue" :min="-180" :max="180" :step="0.01" :show-tooltip="false"
              :aria-label="`${station.name}观测经度`" />
            <div class="parameter-scale"><span>180° W</span><span>本初子午线</span><span>180° E</span></div>
          </div>
        </template>
        <div class="parameter-block time-parameter">
          <div class="parameter-heading"><span>当地太阳时</span><output>{{ localTimeLabel }}</output></div>
          <ElSlider v-model="localMinutes" :min="0" :max="1439" :step="1" :show-tooltip="false"
            :aria-label="`${station.name}当地太阳时`" />
          <div class="parameter-scale"><span>00:00</span><span>12:00</span><span>23:59</span></div>
          <div class="daylight-state"><span>{{ daylightLabel }}</span><span>太阳高度 {{ signedAngle(observation.sunAltitude) }}</span></div>
        </div>
      </div>

      <div class="station-actions">
        <button type="button" class="theme-btn" :class="{ active }" :aria-pressed="active"
          @click="emit('select')">{{ active ? '已应用第一人称场景' : '应用第一人称场景' }}</button>
        <button type="button" class="theme-btn" :disabled="!observation.aboveHorizon"
          @click="emit('locate')">定位月亮 <span aria-hidden="true">↗</span></button>
        <button type="button" class="theme-btn" :aria-label="`同步${station.name}的观测视角`"
          title="左右场景同步观测点" @click="emit('syncView')">同步观测视角</button>
      </div>
      <p class="station-footnote">{{ observation.aboveHorizon ? '实际可见性还受日光与天气影响。' : '调整地点或时刻，等待月亮升起。' }}</p>
    </div>
  </FloatingFeatureCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElSlider } from 'element-plus'
import 'element-plus/es/components/slider/style/css'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import MoonDisc from './MoonDisc.vue'
import { phaseIllumination, phaseName, SYNODIC_MONTH, type MoonLighting, type Observation } from './moon-geometry'

const props = withDefaults(defineProps<{
  station: { id: string; name: string; latitude: number; longitude: number; color: string; readonly: boolean }
  observation: Observation
  phase: number
  lighting: MoonLighting
  active: boolean
  collapsed: boolean
  compact: boolean
  initialRight: number
  initialTop: number
  bottomInset: number
  canRemove?: boolean
  selectedInBothViews?: boolean
}>(), { canRemove: true, selectedInBothViews: false })
const emit = defineEmits<{
  select: []
  remove: []
  'update:latitude': [value: number]
  'update:longitude': [value: number]
  'update:localSolarHour': [value: number]
  'update:collapsed': [value: boolean]
  locate: []
  syncView: []
}>()

const stationStyle = computed(() => ({
  '--station-color': props.station.color,
  '--station-top': `${Math.max(74, props.initialTop)}px`,
  '--station-bottom': `${Math.max(12, props.bottomInset)}px`,
}))
const currentPhaseName = computed(() => phaseName(props.phase))
const illumination = computed(() => phaseIllumination(props.phase) * 100)
const phaseAge = computed(() => Math.max(0, Math.min(360, props.phase)) / 360 * SYNODIC_MONTH)
const latitudeLabel = computed(() => `${Math.abs(props.station.latitude).toFixed(2)}° ${props.station.latitude < 0 ? 'S' : 'N'}`)
const longitudeLabel = computed(() => `${Math.abs(props.station.longitude).toFixed(2)}° ${props.station.longitude < 0 ? 'W' : 'E'}`)
const latitudeValue = computed({
  get: () => props.station.latitude,
  set: (value: number) => { if (!props.station.readonly && Number.isFinite(value)) emit('update:latitude', Math.max(-90, Math.min(90, value))) },
})
const longitudeValue = computed({
  get: () => props.station.longitude,
  set: (value: number) => { if (!props.station.readonly && Number.isFinite(value)) emit('update:longitude', Math.max(-180, Math.min(180, value))) },
})
const localMinutes = computed({
  get: () => ((Math.round(props.observation.localSolarHour * 60) % 1440) + 1440) % 1440,
  set: (value: number) => { if (Number.isFinite(value)) emit('update:localSolarHour', Math.max(0, Math.min(1439, value)) / 60) },
})
const localTimeLabel = computed(() => `${String(Math.floor(localMinutes.value / 60)).padStart(2, '0')}:${String(localMinutes.value % 60).padStart(2, '0')}`)
const daylightLabel = computed(() => props.observation.sunAltitude > 1 ? '白天' : props.observation.sunAltitude < -6 ? '夜间' : '晨昏时分')
function signedAngle(value: number) { return `${value > 0 ? '+' : ''}${value.toFixed(1)}°` }
function compassName(value: number) { return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(((value % 360) + 360) % 360 / 45) % 8] }
</script>

<style scoped>
.observation-station {
  --feature-title: var(--text-primary, #eaf8ff);
  --feature-text: var(--text-primary, #eaf8ff);
  --feature-muted: var(--text-muted, #7894a8);
  --feature-head-bg: rgba(16, 31, 48, .72);
  --feature-divider: var(--panel-border, rgba(116, 234, 229, .18));
  --feature-button-bg: var(--inactive-background, #102336);
  --feature-button-border: var(--inactive-border, rgba(116, 234, 229, .2));
  width: 320px;
  height: min(690px, calc(100dvh - var(--station-top) - var(--station-bottom)));
  max-width: calc(100vw - 20px);
  max-height: calc(100dvh - 74px - var(--station-bottom));
  container-type: inline-size;
  background: rgba(7, 19, 32, .93);
  border-color: rgba(128, 165, 192, .28);
  touch-action: auto;
}
.observation-station.is-active { border-color: var(--station-color); box-shadow: 0 14px 44px #0005, inset 0 2px var(--station-color); }
.observation-station.is-compact { width: 272px; }
.observation-station.collapsed { width: 188px; height: auto; }
.observation-station :deep(.feature-card-head) { min-height: 46px; gap: 8px; padding: 9px 11px; touch-action: none; }
.observation-station :deep(.feature-card-title-label) { font-size: 13px; font-weight: 600; letter-spacing: .03em; }
.observation-station :deep(.feature-card-actions) { gap: 5px; }
.observation-station :deep(.drag-hint) { display: none; }
.observation-station :deep(.collapse-btn) { width: 25px; height: 25px; border-radius: 6px; }
.observation-station :deep(.feature-card-content) { padding: 0; scrollbar-width: thin; scrollbar-color: #456175 transparent; }
.station-color { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: var(--station-color); box-shadow: 0 0 9px color-mix(in srgb, var(--station-color), transparent 55%); }
.header-select { padding: 4px 6px; font-size: 10px; white-space: nowrap; }
.header-remove { width: 25px; height: 25px; display: grid; place-items: center; padding: 3px; }
.header-remove svg { width: 17px; height: 17px; }
.station-content { padding: 15px 16px 43px; }
.moon-row { display: flex; justify-content: center; width: 100%; padding: 4px 0 12px; }
.station-moon { width: clamp(108px, 48cqi, 180px); max-width: 100%; aspect-ratio: 1; flex: 0 0 auto; }
.unavailable-moon { width: 100%; height: 100%; display: grid; place-items: center; border: 1px dashed var(--inactive-border, #365567); border-radius: 50%; background: rgba(20, 38, 56, .45); color: var(--text-muted, #7894a8); }
.unavailable-moon svg { width: 62%; height: 62%; }
.observation-status { text-align: center; }
.observation-status h3 { margin: 0 0 5px; color: var(--text-primary, #eaf8ff); font-size: 23px; font-weight: 500; letter-spacing: .06em; line-height: 1.35; }
.observation-status p { margin: 0; color: var(--text-secondary, #b8ccda); font-size: 11px; line-height: 1.6; }
.observation-status.unavailable h3 { color: var(--theme-warning, #e6a928); }
.phase-reference { display: block; margin-top: 5px; color: var(--text-muted, #7894a8); font-size: 10px; }
.station-statistics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px 8px; margin: 17px 0; padding: 13px 8px; background: rgba(109, 156, 185, .06); border: 1px solid var(--feature-divider); border-radius: 9px; }
.station-statistics > div { min-width: 0; text-align: center; }
.station-statistics dt { color: var(--text-muted, #7894a8); font-size: 10px; }
.station-statistics dd { margin: 5px 0 0; font-size: 17px; color: var(--text-primary, #eaf8ff); font-variant-numeric: tabular-nums; white-space: nowrap; }
.station-statistics small { margin-left: 4px; font-size: 10px; color: var(--text-secondary, #b8ccda); }
.station-statistics .negative { color: #e5bb7f; }
.station-parameters { display: flex; flex-direction: column; gap: 17px; }
.preset-label { display: block; margin-bottom: 8px; color: var(--text-muted, #7894a8); font-size: 10px; }
.preset-coordinates dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; }
.preset-coordinates dl > div { min-width: 0; }
.preset-coordinates dt { color: var(--text-muted, #7894a8); font-size: 10px; }
.preset-coordinates dd { margin: 4px 0 0; color: var(--text-primary, #eaf8ff); font-size: 13px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.parameter-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 12px; color: var(--text-secondary, #b8ccda); }
.parameter-heading output { color: var(--text-primary, #eaf8ff); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.parameter-block :deep(.el-slider) { width: 100%; height: 27px; margin-top: 5px; }
.parameter-block :deep(.el-slider__runway) { margin: 0; }
.parameter-scale { display: flex; justify-content: space-between; gap: 6px; color: var(--text-muted, #7894a8); font-size: 9px; }
.time-parameter { padding-top: 14px; border-top: 1px solid var(--feature-divider); }
.daylight-state { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 8px; margin-top: 10px; color: var(--text-muted, #7894a8); font-size: 10px; }
.station-actions { display: flex; flex-direction: column; gap: 5px; margin-top: 15px; }
.station-actions button { width: 100%; padding: 6px 8px; font-size: 11px; line-height: 1.4; white-space: nowrap; }
.station-actions button:disabled { cursor: default; opacity: .46; }
.station-footnote { margin: 11px 0 0; color: var(--text-muted, #7894a8); text-align: center; font-size: 10px; line-height: 1.6; }
.observation-station :deep(.feature-resize-handle) { width: 33px; height: 33px; bottom: 6px; border: 1px solid var(--station-color); border-radius: 8px; background: #142b3e; box-shadow: 0 2px 12px #0007; opacity: 1; touch-action: none; }
.observation-station :deep(.feature-resize-handle::before), .observation-station :deep(.feature-resize-handle::after), .observation-station :deep(.feature-resize-handle i) { border-color: var(--station-color); opacity: 1; }
.observation-station :deep(.feature-resize-handle:hover) { background: #204059; }
.observation-station :deep(button:focus-visible) { outline: 2px solid var(--station-color); outline-offset: 2px; }
@container (min-width: 360px) {
  .station-content { padding-left: 23px; padding-right: 23px; }
  .station-statistics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .station-statistics dd { font-size: 16px; }
}
@media (max-height: 700px) {
  .station-content { padding-top: 10px; }
  .station-statistics { margin-top: 13px; margin-bottom: 14px; }
}
</style>
