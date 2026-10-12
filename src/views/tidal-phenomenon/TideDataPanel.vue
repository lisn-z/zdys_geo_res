<template>
  <div class="tide-data-panel">
    <section class="tide-status" aria-label="观察点潮汐状态">
      <div>
        <span class="status-label">观察点 A · 当前潮汐</span>
        <strong class="status-value">{{ tideStage === '落潮中' ? '退潮中' : tideStage }}</strong>
      </div>
      <span class="playback-badge" :class="{ 'is-playing': playing }">
        <i aria-hidden="true"></i>{{ playing ? '播放中' : '已暂停' }}
      </span>
    </section>

    <section class="ratio-card" aria-labelledby="tide-period-ratio-label">
      <div class="ratio-heading">
        <h3 id="tide-period-ratio-label">运动周期比（约）</h3>
        <span class="ratio-tag">恒星周期</span>
      </div>
      <p class="ratio-order">地球自转 <span>:</span> 月球公转 <span>:</span> 月球自转</p>
      <strong class="ratio-value">{{ periodRatio }}</strong>
      <p class="ratio-explanation">角速度比约 <b>{{ angularSpeedRatio }}</b><br />同一顺序，与周期成反比</p>
      <p v-if="!linkedMotion" class="motion-notice">分项演示中 · 以上为参考周期，当前运动未全部开启。</p>
    </section>

    <section class="data-section" aria-label="运动周期">
      <h3 class="section-heading">周期时长</h3>
      <dl class="period-list">
        <div v-for="period in periods" :key="period.label" class="period-row">
          <dt>{{ period.label }}</dt>
          <dd class="period-value">{{ period.value }}</dd>
          <dd v-if="period.description" class="period-description">{{ period.description }}</dd>
        </div>
      </dl>
    </section>

    <section class="data-section" aria-label="当前场景数据">
      <h3 class="section-heading">当前场景</h3>
      <dl class="metrics-grid">
        <div v-for="(metric, index) in metrics" :key="metric.label" class="metric-item"
          :class="{ 'metric-wide': index >= 2 }">
          <dt>{{ metric.label }}</dt>
          <dd class="metric-value">{{ metric.value }}</dd>
          <dd v-if="metric.description" class="metric-description">{{ metric.description }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
type DataItem = {
  label: string
  value: string
  description: string
}

defineProps<{
  playing: boolean
  tideStage: string
  linkedMotion: boolean
  periodRatio: string
  angularSpeedRatio: string
  metrics: DataItem[]
  periods: DataItem[]
}>()
</script>

<style scoped>
.tide-data-panel {
  --data-border: rgba(116, 167, 190, 0.18);
  --data-muted: #88a6b7;
  --data-text: #d8e7ef;
  --data-accent: #91e5e8;
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 16px;
  color: var(--data-text);
  background: #071924;
  font-size: 13px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  container-type: inline-size;
}

.tide-data-panel * {
  box-sizing: border-box;
}

.tide-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.status-label {
  display: block;
  color: var(--data-muted);
  font-size: 12px;
}

.status-value {
  display: block;
  margin-top: 4px;
  color: #edf7fb;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.3;
}

.playback-badge {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--data-border);
  border-radius: 20px;
  color: #9bb2bf;
  font-size: 11px;
  white-space: nowrap;
}

.playback-badge i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.playback-badge.is-playing {
  color: var(--data-accent);
  background: rgba(49, 154, 158, 0.08);
}

.ratio-card {
  padding: 13px 14px 12px;
  border: 1px solid var(--data-border);
  border-radius: 10px;
  background: #0b2431;
}

.ratio-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ratio-heading h3,
.section-heading {
  margin: 0;
  color: #c8dde8;
  font-size: 12px;
  font-weight: 600;
}

.ratio-tag {
  color: var(--data-muted);
  font-size: 10px;
  white-space: nowrap;
}

.ratio-order {
  margin: 12px 0 4px;
  color: #a9c4d1;
  font-size: 12px;
  line-height: 1.65;
}

.ratio-order span {
  padding: 0 2px;
  color: #567787;
}

.ratio-value {
  display: block;
  color: var(--data-accent);
  font-size: clamp(22px, 7.5cqi, 26px);
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.35;
}

.ratio-explanation {
  margin: 10px 0 0;
  color: var(--data-muted);
  font-size: 11px;
  line-height: 1.7;
}

.ratio-explanation b {
  color: #c7e3ea;
  font-weight: 500;
}

.motion-notice {
  margin: 10px 0 0;
  padding-top: 9px;
  border-top: 1px solid var(--data-border);
  color: #acc8d5;
  font-size: 11px;
  line-height: 1.6;
}

.data-section,
.period-row,
.metric-item {
  min-width: 0;
}

.section-heading {
  margin-bottom: 9px;
}

.period-list,
.metrics-grid {
  margin: 0;
}

.period-list {
  border-top: 1px solid var(--data-border);
}

.period-row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 3px 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--data-border);
}

.period-row dt {
  align-self: baseline;
  color: #a6becb;
  font-size: 12px;
}

.period-value {
  margin: 0;
  color: #e0edf4;
  font-size: 13px;
  font-weight: 550;
  text-align: right;
}

.period-description {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--data-muted);
  font-size: 11px;
  line-height: 1.6;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.metric-item {
  padding: 10px 11px;
  border: 1px solid var(--data-border);
  border-radius: 8px;
  background: #0a202d;
}

.metric-wide {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  align-items: baseline;
  gap: 4px 10px;
}

.metric-item dt {
  color: var(--data-muted);
  font-size: 12px;
}

.metric-value {
  margin: 5px 0 0;
  color: #e2eef5;
  font-size: 20px;
  font-weight: 550;
  line-height: 1.35;
}

.metric-wide .metric-value {
  margin: 0;
  font-size: 16px;
  text-align: right;
}

.metric-description {
  margin: 5px 0 0;
  color: var(--data-muted);
  font-size: 11px;
  line-height: 1.6;
}

.metric-wide .metric-description {
  grid-column: 1 / -1;
  margin-top: 0;
}
</style>
