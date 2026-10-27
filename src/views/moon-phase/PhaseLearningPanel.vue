<template>
  <FloatingFeatureCard class="phase-learning-panel" title="月相演变规律" variant="control"
    :initial-right="24" :initial-top="panelTop" :collapsed="collapsed" :bottom-inset="16" :resizable="true" :min-width="290" :min-height="300"
    @update:collapsed="emit('update:collapsed', $event)">
    <template #title-prefix>
      <svg class="learning-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 4h5l2 2 2-2h5v12h-5l-2 1-2-1H3Z"/><path d="M10 6v11"/></svg>
    </template>

    <div class="learning-content">
      <div class="learning-intro">
        <p>同一时刻，月相阶段相同；纬度影响月面朝向、高度和升落。选好纬度与月相，再播放一天中的变化。</p>
      </div>

      <section class="learning-section" aria-labelledby="learning-region-title">
        <div class="learning-section-heading"><h3 id="learning-region-title">① 选择纬度地区</h3><span>统一经度 0°</span></div>
        <div class="learning-regions">
          <button v-for="region in regions" :key="region.latitude" type="button" class="theme-btn" :class="{ active: latitude === region.latitude }"
            :aria-pressed="latitude === region.latitude" @click="latitude = region.latitude">
            <span>{{ region.name }}</span><small>{{ region.coordinate }}</small>
          </button>
        </div>
      </section>

      <section class="learning-section" aria-labelledby="learning-phase-title">
        <div class="learning-section-heading"><h3 id="learning-phase-title">② 选择代表月相</h3><button type="button" class="learning-link" @click="adoptScene">采用主场景参数</button></div>
        <div class="learning-phases">
          <button v-for="item in phases" :key="item.angle" type="button" class="theme-btn" :class="{ active: currentName === item.name }"
            :aria-pressed="currentName === item.name" :title="`${item.name} · 农历参考：${lunarDateReference(item.name)}`" @click="selectPhase(item.angle)"><span>{{ item.name }}</span><small>{{ lunarDateReference(item.name) }}</small></button>
        </div>
        <p class="learning-caption">{{ LUNAR_DATE_NOTE }}</p>
        <div class="learning-moon-summary">
          <div class="learning-moon" role="img" :aria-label="`${currentName}形态示意`"><MoonDisc :phase="currentInput.phase" :observation="currentObservation" :lighting="currentLighting" /></div>
          <div class="learning-moon-copy">
            <span class="learning-eyebrow">{{ selectedRegion.name }} · {{ selectedRegion.coordinate }}</span>
            <h4>{{ currentName }}</h4>
            <p class="learning-lunar-date">农历参考 · {{ lunarDateReference(currentName) }}</p>
            <p>照亮比例 {{ (phaseIllumination(currentInput.phase) * 100).toFixed(1) }}% · 月龄 {{ (currentInput.phase / 360 * SYNODIC_MONTH).toFixed(1) }} 天</p>
            <p :class="{ 'learning-below': !currentObservation.aboveHorizon }">{{ currentObservation.aboveHorizon ? '月心在地平线上方' : '月心在地平线以下' }}</p>
          </div>
        </div>
        <p class="learning-caption">月面为形态示意；在地平线以下时也保留展示。</p>
      </section>

      <section class="learning-section" aria-labelledby="learning-day-title">
        <div class="learning-section-heading"><h3 id="learning-day-title">③ 看一天中的升落</h3><span>UTC · 00:00—24:00</span></div>
        <div class="learning-chart-legend"><span><i class="moon-key"></i>月心高度</span><span><i class="day-key"></i>太阳在地平线上方</span></div>
        <svg class="learning-chart" viewBox="0 0 460 200" role="img" :aria-label="`${selectedRegion.name}24小时月心高度曲线，${dailyDescription}`">
          <rect x="36" y="24" width="410" height="144" rx="6" class="chart-sky" />
          <rect x="36" y="96" width="410" height="72" class="chart-ground" />
          <rect v-for="(band, index) in daylightBands" :key="index" :x="chartX(band.start)" y="24" :width="chartX(band.end) - chartX(band.start)" height="144" class="chart-day" />
          <line v-for="angle in [90, 0, -90]" :key="angle" x1="36" x2="446" :y1="chartY(angle)" :y2="chartY(angle)" class="chart-grid" :class="{ horizon: angle === 0 }" />
          <text v-for="angle in [90, 0, -90]" :key="`label-${angle}`" x="29" :y="chartY(angle) + 4" text-anchor="end" class="chart-label">{{ angle }}°</text>
          <text v-for="hour in [0, 6, 12, 18, 24]" :key="hour" :x="chartX(hour)" y="190" text-anchor="middle" class="chart-label">{{ String(hour).padStart(2, '0') }}:00</text>
          <path :d="moonPath" fill="none" class="chart-moon-path" />
          <line :x1="chartX(minutes / 60)" :x2="chartX(minutes / 60)" y1="24" y2="168" class="chart-cursor" />
          <circle :cx="chartX(minutes / 60)" :cy="chartY(currentObservation.altitude)" r="4.5" class="chart-current" />
          <circle v-for="(event, index) in track.crossings" :key="`cross-${index}`" :cx="chartX(event.hour)" cy="96" r="3.5" class="chart-crossing" />
          <text x="440" y="90" text-anchor="end" class="chart-horizon-label">地平线</text>
        </svg>
        <div class="learning-time-heading"><span>观测时刻 <strong>{{ formatHour(minutes / 60) }} UTC</strong></span><button type="button" class="theme-btn learning-preview-play" :class="{ active: previewPlaying }" @click="togglePreview">{{ previewPlaying ? '暂停演示' : '播放升落' }}</button></div>
        <div @pointerdown.capture="stopPreview" @keydown.capture="stopPreview"><ElSlider v-model="minutes" :min="0" :max="1439" :step="1" :show-tooltip="false" aria-label="月相规律演示UTC时刻" /></div>
        <p class="learning-reading">月心高度 {{ signedAngle(currentObservation.altitude) }} · 方位 {{ currentObservation.azimuth.toFixed(0) }}°</p>
        <div class="learning-events" aria-live="polite">
          <template v-if="track.crossings.length">
            <span v-for="(event, index) in track.crossings" :key="index"><b>{{ event.kind === 'rise' ? '月出' : '月落' }}</b>{{ formatHour(event.hour) }} UTC</span>
          </template>
          <span v-else class="learning-no-crossing">{{ dailyDescription }}</span>
          <span><b>本日最高</b>{{ signedAngle(track.highest.altitude) }} · {{ formatHour(track.highest.hour) }} UTC</span>
        </div>
        <p class="learning-caption">月出、月落按月心跨过地平线估算。一天内月相也会缓慢变化；曲线沿用主场景的简化轨道模型。</p>
      </section>

      <details class="learning-rules">
        <summary>怎么归纳规律</summary>
        <p>月相由日、地、月的相对位置决定。本面板保持经度与季节一致，只改变纬度来比较观测差异。</p>
        <ol>
          <li><b>看形态：</b>新月 → 蛾眉月 → 上弦月 → 盈凸月 → 满月 → 亏凸月 → 下弦月 → 残月，约 {{ SYNODIC_MONTH.toFixed(2) }} 天一个周期。</li>
          <li><b>看时间：</b>一天内月相变化较小，月亮的升落主要与地球自转有关。拖动时刻，观察月心何时跨过地平线。</li>
          <li><b>看纬度：</b>切换纬度比较曲线和月面朝向。高纬地区在某些季节、月相下，一天内可能没有月出或月落。</li>
        </ol>
        <p>月心在地平线上方不代表肉眼一定能看清，实际观测还受到日光、天气和地形影响。</p>
      </details>
      <div class="learning-footer"><span>沿用主场景公转位置 · 教学近似<br>独立演示，应用后同步。</span><button type="button" class="theme-btn active" @click="applyExample">应用到场景</button></div>
    </div>
  </FloatingFeatureCard>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElSlider } from 'element-plus'
import 'element-plus/es/components/slider/style/css'
import FloatingFeatureCard from './MoonFloatingPanel.vue'
import MoonDisc from './MoonDisc.vue'
import { lunarDateReference, LUNAR_DATE_NOTE } from './phase-calendar'
import { getMoonLighting, getObservation, phaseIllumination, phaseName, SYNODIC_MONTH } from './moon-geometry'
import { buildDailyMoonTrack, observationAtHour, wrapPhase, type DailyMoonInput } from './phase-learning'

const props = defineProps<{ phase: number; utcHour: number; dayOfYear: number; collapsed: boolean; active: boolean; initialTop?: number }>()
const panelTop = computed(() => props.initialTop ?? ((typeof window === 'undefined' || window.innerWidth > 1280 ? 148 : window.innerWidth > 820 ? 176 : 204) + 58))
const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  'apply-observation': [input: DailyMoonInput & { name: string }]
}>()
const regions = [
  { name: '北半球中纬', coordinate: '30° N', latitude: 30 },
  { name: '赤道', coordinate: '0°', latitude: 0 },
  { name: '南半球中纬', coordinate: '30° S', latitude: -30 },
  { name: '北半球高纬', coordinate: '70° N', latitude: 70 },
  { name: '南半球高纬', coordinate: '70° S', latitude: -70 },
]
const phases = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'].map((name, index) => ({ name, angle: index * 45 }))
const latitude = ref(30)
const anchorPhase = ref(props.phase)
const anchorHour = ref(props.utcHour)
const anchorDay = ref(props.dayOfYear)
const minutes = ref(toMinutes(props.utcHour))
const previewPlaying = ref(false)
let previewFrame = 0
const selectedRegion = computed(() => regions.find(region => region.latitude === latitude.value)!)
const anchorInput = computed<DailyMoonInput>(() => ({ phase: anchorPhase.value, utcHour: anchorHour.value, dayOfYear: anchorDay.value, latitude: latitude.value, longitude: 0 }))
const currentInput = computed(() => observationAtHour(anchorInput.value, minutes.value / 60))
const currentObservation = computed(() => getObservation(currentInput.value))
const currentLighting = computed(() => getMoonLighting(currentInput.value))
const currentName = computed(() => phaseName(currentInput.value.phase))
const track = computed(() => buildDailyMoonTrack(anchorInput.value))
const dailyDescription = computed(() => track.value.allAbove ? '全天月心在地平线上方' : track.value.allBelow ? '全天月心在地平线以下' : track.value.crossings.map(event => `${event.kind === 'rise' ? '月出' : '月落'} ${formatHour(event.hour)} UTC`).join('，') || '本日月心接近地平线')
const chartX = (hour: number) => 36 + hour / 24 * 410
const chartY = (altitude: number) => 96 - altitude / 90 * 72
const moonPath = computed(() => track.value.samples.map((sample, index) => `${index ? 'L' : 'M'}${chartX(sample.hour).toFixed(2)},${chartY(sample.altitude).toFixed(2)}`).join(' '))
const daylightBands = computed(() => {
  const bands: { start: number; end: number }[] = []
  for (let index = 1; index < track.value.samples.length; index += 1) {
    const before = track.value.samples[index - 1]!
    const after = track.value.samples[index]!
    if ((before.sunAltitude + after.sunAltitude) / 2 <= 0) continue
    const last = bands[bands.length - 1]
    if (last && Math.abs(last.end - before.hour) < 1e-6) last.end = after.hour
    else bands.push({ start: before.hour, end: after.hour })
  }
  return bands
})
function toMinutes(hour: number) { return Math.min(1439, Math.floor(((hour % 24) + 24) % 24 * 60)) }
function formatHour(hour: number) { const value = Math.max(0, Math.min(1440, Math.round(hour * 60))); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function signedAngle(value: number) { return `${value > 0 ? '+' : ''}${value.toFixed(1)}°` }
function adoptScene() { stopPreview(); anchorPhase.value = props.phase; anchorHour.value = props.utcHour; anchorDay.value = props.dayOfYear; minutes.value = toMinutes(props.utcHour) }
function selectPhase(phase: number) {
  // Set the representative shape at the currently selected time, leaving the day intact.
  anchorPhase.value = wrapPhase(phase - (minutes.value / 60 - anchorHour.value) / 24 * 360 / SYNODIC_MONTH)
}
function applyExample() { stopPreview(); emit('apply-observation', { ...currentInput.value, name: `${selectedRegion.value.name}示例` }) }
function stopPreview() { previewPlaying.value = false; cancelAnimationFrame(previewFrame); previewFrame = 0 }
function togglePreview() {
  if (previewPlaying.value) { stopPreview(); return }
  if (props.collapsed || !props.active) return
  if (minutes.value >= 1439) minutes.value = 0
  previewPlaying.value = true
  let progress = minutes.value
  let previous = performance.now()
  function advance(now: number) {
    const elapsed = Math.min(100, now - previous)
    previous = now
    if (!document.hidden) progress += elapsed / 18000 * 1440
    minutes.value = Math.min(1439, Math.floor(progress))
    if (minutes.value >= 1439) { stopPreview(); return }
    previewFrame = requestAnimationFrame(advance)
  }
  previewFrame = requestAnimationFrame(advance)
}
watch(() => [props.collapsed, props.active], () => { if (props.collapsed || !props.active) stopPreview() })
watch(() => props.collapsed, (collapsed, wasCollapsed) => { if (!collapsed && wasCollapsed) adoptScene() })
onBeforeUnmount(stopPreview)
</script>

<style scoped>
.floating-feature-card.phase-learning-panel { width: 510px; height: min(760px, calc(100dvh - 110px)); max-width: calc(100vw - 20px); max-height: calc(100dvh - 88px); container-type: inline-size; }
.floating-feature-card.phase-learning-panel.collapsed { width: 220px; height: auto; }
.phase-learning-panel :deep(.feature-card-content) { padding: 0; scrollbar-width: thin; scrollbar-color: #53778d transparent; }
.phase-learning-panel :deep(.feature-card-head) { min-height: 46px; padding: 10px 14px; }
.phase-learning-panel :deep(.feature-card-title-label) { font-size: 15px; font-weight: 600; }
.phase-learning-panel :deep(.feature-resize-handle) { width: 32px; height: 32px; border-radius: 8px; }
.learning-icon { width: 18px; height: 18px; color: var(--feature-title); }
.learning-content { padding: 12px 16px 42px; font-size: 12px; line-height: 1.65; }
.learning-intro { padding: 8px 10px; border-radius: 9px; background: #0d243142; border: 1px solid #32536780; }
.learning-eyebrow { font-size: 11px; color: #8bd8d2; }
.learning-intro p { margin: 0; color: #c0d2df; font-size: 11px; }
.learning-section { padding-top: 12px; }
.learning-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 7px; }
.learning-section-heading h3 { margin: 0; font-size: 13px; font-weight: 600; color: #cde6e8; }
.learning-section-heading > span, .learning-caption { color: #91adbd; font-size: 10px; }
.learning-caption { margin: 7px 0 0; line-height: 1.6; }
.learning-regions { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
.learning-regions button { display: flex; flex-direction: column; gap: 2px; padding: 6px 2px; font-size: 10px; }
.learning-regions small { font-size: 10px; opacity: .8; }
.learning-phases { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.learning-phases button { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 7px 3px; font-size: 11px; }
.learning-phases small { color: #a9cecf; font-size: 9px; line-height: 1.4; white-space: normal; }
.learning-phases button.active small { color: inherit; }
.learning-link { border: 0; background: transparent; color: #9cddd7; font-size: 10px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 3px 0; }
.learning-moon-summary { display: flex; align-items: center; gap: 16px; margin-top: 9px; padding: 10px 14px; border-radius: 10px; background: #0d243142; border: 1px solid #32536780; }
.learning-moon { width: 90px; flex: 0 0 90px; aspect-ratio: 1; }
.learning-moon-copy { min-width: 0; }
.learning-moon-copy h4 { font-size: 23px; font-weight: 500; margin: 4px 0 7px; line-height: 1.2; }
.learning-moon-copy p { margin: 4px 0 0; font-size: 10px; color: #b7cddd; }
.learning-moon-copy .learning-lunar-date { color: #a9cecf; }
.learning-moon-copy p.learning-below { color: #e7bc7b; }
.learning-chart-legend { display: flex; flex-wrap: wrap; gap: 14px; color: #a9c3d2; font-size: 10px; }
.learning-chart-legend span { display: inline-flex; align-items: center; gap: 5px; }
.learning-chart-legend i { display: inline-block; width: 14px; height: 3px; border-radius: 1px; }
.learning-chart-legend .moon-key { background: #84e4dd; }
.learning-chart-legend .day-key { background: #d5b86a70; height: 8px; }
.learning-chart { display: block; width: 100%; height: auto; overflow: visible; margin: 2px 0 8px; }
.chart-sky { fill: #0d243142; }
.chart-ground { fill: #111e28; }
.chart-day { fill: #dfc18012; }
.chart-grid { stroke: #355164; stroke-width: .7; }
.chart-grid.horizon { stroke: #94aabd; stroke-dasharray: 4 3; }
.chart-label { fill: #afc7d7; font-size: 11px; }
.chart-horizon-label { fill: #b7cbd9; font-size: 10px; }
.chart-moon-path { stroke: #84e4dd; stroke-width: 2.5; stroke-linecap: round; }
.chart-cursor { stroke: #d9f6f2; stroke-width: 1; stroke-dasharray: 3 3; opacity: .65; }
.chart-current { fill: #e4fffb; stroke: #258b9b; stroke-width: 2; }
.chart-crossing { fill: #102b39; stroke: #e6b76f; stroke-width: 2; }
.learning-time-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11px; }
.learning-time-heading strong { color: #aff1e8; font-size: 13px; margin-left: 7px; font-variant-numeric: tabular-nums; }
.learning-time-heading > span { color: #b2c7d5; font-size: 11px; }
.learning-preview-play { padding: 5px 10px; font-size: 10px; }
.learning-reading { margin: 1px 0 9px; color: #b2c7d5; font-size: 10px; }
.phase-learning-panel :deep(.el-slider) { height: 30px; }
.learning-events { display: flex; gap: 8px; flex-wrap: wrap; }
.learning-events > span { display: inline-flex; gap: 5px; padding: 5px 8px; border: 1px solid #32536780; border-radius: 6px; background: #0d243142; font-size: 10px; color: #c2d7e4; }
.learning-events b { color: #96b7cb; font-weight: 400; }
.learning-events > .learning-no-crossing { color: #e8c991; }
.learning-rules { margin-top: 14px; padding: 10px 12px; border: 1px solid #32536780; border-radius: 9px; background: #0d243142; }
.learning-rules p { margin: 8px 0 0; color: #b6cbd9; font-size: 11px; }
.learning-rules summary { color: #bbdedf; cursor: pointer; font-size: 12px; }
.learning-rules ol { padding-left: 18px; margin: 10px 0 0; color: #b6cbd9; font-size: 11px; }
.learning-rules li + li { margin-top: 7px; }
.learning-rules b { color: #e1f0f5; font-weight: 500; }
.learning-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.learning-footer > span { color: #96b0c3; font-size: 10px; }
.learning-footer button { padding: 8px 12px; font-size: 11px; flex-shrink: 0; }
@container (max-width: 430px) {
  .learning-regions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .learning-phases { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@container (max-width: 350px) {
  .learning-content { padding: 14px 12px 40px; }
  .learning-regions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .learning-moon-summary { gap: 12px; padding: 10px; }
  .learning-moon { width: 84px; flex-basis: 84px; }
  .learning-moon-copy h4 { font-size: 20px; }
}
@media (min-width: 821px) and (max-width: 1280px) { .floating-feature-card.phase-learning-panel { height: min(760px, calc(100dvh - 140px)); max-height: calc(100dvh - 140px); } }
@media (max-width: 820px) { .floating-feature-card.phase-learning-panel { height: min(700px, calc(100dvh - 216px)); max-height: calc(100dvh - 216px); } }
</style>
