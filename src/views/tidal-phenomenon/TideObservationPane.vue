<template>
  <section class="tide-observation-pane" aria-label="潮汐观察">
    <header class="observation-pane-header">
      <h2>潮汐观察</h2>
      <p>观察点 A · 三维小岛与岸滩</p>
    </header>

    <CoastalTideScene class="observer-coast" :height="tide.height" :playing="playing" :speed="speed"
      :active="active" />

    <div class="observer-details">
      <div class="observer-heading">
        <span><i class="observer-dot"></i>A 点潮位 · 与地球同步</span>
        <strong>{{ tide.stage === '落潮中' ? '退潮中' : tide.stage }}</strong>
      </div>
      <div class="coast-stage-options" aria-label="查看潮汐阶段">
        <button v-for="stage in coastStages" :key="stage.key" type="button"
          :class="{ active: coastStageKey === stage.key }" :aria-pressed="coastStageKey === stage.key"
          @click="emit('select-stage', stage.phase)">{{ stage.label }}</button>
        <button type="button" class="coast-play" :aria-label="playing ? '暂停潮汐过程' : '播放潮汐过程'"
          @click="emit('toggle-play')">{{ playing ? '暂停' : '播放' }}</button>
      </div>

      <svg class="tide-chart" viewBox="0 0 480 106" role="img"
        :aria-label="`观察点 A 的示意潮位：${tide.stage}。一个相对周期内有两次高潮、两次低潮。`">
        <line x1="14" y1="58" x2="466" y2="58" class="chart-reference" />
        <text x="16" y="52" class="chart-reference-text">参考海面</text>
        <path :d="tideChartPath" class="chart-curve" />
        <line :x1="localTideChartPoint.x" y1="16" :x2="localTideChartPoint.x" y2="88" class="chart-cursor" />
        <circle :cx="localTideChartPoint.x" :cy="localTideChartPoint.y" r="5" class="chart-point" />
        <text x="127" y="14" class="chart-extreme">高潮</text>
        <text x="353" y="14" class="chart-extreme">高潮</text>
        <text x="14" y="100" class="chart-extreme">低潮</text>
        <text x="240" y="100" class="chart-extreme">低潮</text>
        <text x="466" y="100" class="chart-extreme">低潮</text>
      </svg>

      <div class="coast-reference-legend">
        <span><i class="coast-reference high-reference"></i>高潮岸线</span>
        <span><i class="coast-reference low-reference"></i>低潮岸线</span>
        <span><i class="coast-reference current-reference"></i>当前岸线</span>
      </div>
      <p class="coast-process-copy">{{ coastProcessCopy }}</p>
      <div class="observer-footer">
        <span>{{ motionPeriodLabel }}</span>
        <span>{{ playing ? '播放中' : '已暂停' }}</span>
      </div>
      <p class="observer-note">虚线保留高低潮岸线作对照；水位升降为教学放大，细小波纹表示海浪。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CoastalTideScene from './CoastalTideScene.vue'
import { equilibriumHeight, type observerTide } from './tide-model'

const props = defineProps<{
  tide: ReturnType<typeof observerTide>
  playing: boolean
  speed: number
  active: boolean
  motionPeriodLabel: string
}>()

const emit = defineEmits<{
  'select-stage': [phase: number]
  'toggle-play': []
}>()

const coastStages = [
  { key: 'low', label: '低潮', phase: 90 },
  { key: 'rising', label: '涨潮', phase: 135 },
  { key: 'high', label: '高潮', phase: 180 },
  { key: 'falling', label: '退潮', phase: 225 },
]

const coastStageKey = computed(() => props.tide.height > 0.995 ? 'high'
  : props.tide.height < -0.495 ? 'low'
    : props.tide.rate > 0 ? 'rising'
      : props.tide.rate < 0 ? 'falling' : '')

const coastProcessCopy = computed(() => ({
  low: '低潮：岸滩露出最多，低处石阶露出水面。',
  rising: '涨潮：水面抬升，岸线向岛内推进，低处石阶逐渐被淹没。',
  high: '高潮：岸滩露出最少，低处石阶被海水覆盖。',
  falling: '退潮：水面下降，岸线向海退去，湿润岸滩和石阶逐渐露出。',
  '': '位置固定：对比当前岸线与高、低潮参考岸线。',
}[coastStageKey.value]))

const localTideChartPoint = computed(() => ({
  x: 14 + props.tide.cycleProgress * 452,
  y: 58 - props.tide.height * 36,
}))

const tideChartPath = Array.from({ length: 181 }, (_, index) => {
  const phase = index / 180 * Math.PI * 2 - Math.PI / 2
  const x = 14 + index / 180 * 452
  const y = 58 - equilibriumHeight(Math.cos(phase)) * 36
  return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
}).join(' ')
</script>

<style scoped>
.tide-observation-pane {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  background: #03121f;
  color: #d8e9ef;
  scrollbar-width: thin;
  scrollbar-color: #375267 #03121f;
  container-type: inline-size;
}

.observation-pane-header {
  flex: 0 0 auto;
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(101, 214, 220, 0.2);
  background: linear-gradient(110deg, #0e3040, #071d2c);
}

.observation-pane-header h2 {
  margin: 0;
  color: #d8f7ff;
  font-size: 17px;
  line-height: 1.4;
}

.observation-pane-header p {
  margin: 4px 0 0;
  color: #a4c4d4;
  font-size: 12px;
  line-height: 1.5;
}

.observer-coast {
  flex: 1 0 260px;
  min-height: 260px;
}

.observer-coast :deep(.coastal-tools) {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.observer-details {
  flex: 0 0 auto;
  padding: 14px 18px 16px;
  background: #03121f;
}

.observer-heading,
.observer-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 6px 10px;
  font-size: 13px;
  line-height: 1.5;
}

.observer-heading strong {
  color: #ffe080;
  white-space: nowrap;
}

.observer-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: #ffdc55;
}

.coast-stage-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  margin: 10px 0 2px;
}

.coast-stage-options button {
  min-height: 36px;
  padding: 6px 3px;
  border: 1px solid #375267;
  border-radius: 6px;
  background: #122b3c;
  color: #bcd7e3;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  touch-action: manipulation;
}

.coast-stage-options button:hover,
.coast-stage-options button.active {
  border-color: #59cfc4;
  background: #174c52;
  color: #d6fff8;
}

.coast-stage-options .coast-play {
  color: #ffe18a;
  border-color: #746738;
}

.coast-stage-options button:focus-visible {
  outline: 2px solid #ffe18a;
  outline-offset: 2px;
}

.tide-chart {
  display: block;
  width: 100%;
  height: 106px;
  margin: 8px 0;
  overflow: visible;
}

.chart-reference {
  stroke: #899bad;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart-reference-text {
  fill: #98afc0;
  font-size: 12px;
}

.chart-curve {
  fill: none;
  stroke: #65d6dc;
  stroke-width: 2.5;
}

.chart-cursor {
  stroke: #e9c75e;
  stroke-opacity: 0.35;
  stroke-dasharray: 3 3;
}

.chart-point {
  fill: #ffdc55;
  stroke: #132433;
  stroke-width: 2;
}

.chart-extreme {
  fill: #b9cbd9;
  font-size: 12px;
  text-anchor: middle;
}

.coast-reference-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  color: #c0d3df;
  font-size: 12px;
}

.coast-reference-legend span {
  white-space: nowrap;
}

.coast-reference {
  display: inline-block;
  width: 15px;
  margin-right: 5px;
  vertical-align: middle;
  border-top: 2px dashed;
}

.high-reference {
  border-color: #ffac7f;
}

.low-reference {
  border-color: #69dfff;
}

.current-reference {
  border-color: #f1fff4;
  border-top-style: solid;
}

.coast-process-copy {
  margin: 10px 0;
  color: #d8e9ef;
  font-size: 13px;
  line-height: 1.6;
}

.observer-footer {
  color: #c9dbe7;
  font-size: 12px;
}

.observer-note {
  margin: 6px 0 0;
  color: #90abba;
  font-size: 11px;
  line-height: 1.6;
}

@container (max-width: 360px) {
  .observation-pane-header,
  .observer-details {
    padding-right: 12px;
    padding-left: 12px;
  }

  .coast-stage-options {
    gap: 4px;
  }

  .coast-reference-legend {
    font-size: 11px;
  }
}
</style>
