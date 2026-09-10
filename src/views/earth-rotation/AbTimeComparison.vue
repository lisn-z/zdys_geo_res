<template>
  <section class="time-comparison" aria-label="A/B 模拟地方时对比">
    <div class="comparison-locations">
      <article v-for="(point, index) in points" :key="point.name" class="comparison-location"
        :class="index === 0 ? 'comparison-location--a' : 'comparison-location--b'">
        <header class="comparison-location-head">
          <span class="comparison-point-badge">{{ point.name }}</span>
          <span class="comparison-point-name">{{ point.name }} 点</span>
          <strong class="comparison-longitude">{{ point.longitude }}</strong>
        </header>
        <strong class="comparison-clock">{{ point.time }}</strong>
        <div class="comparison-date"><span>日期</span><strong>{{ point.date }}</strong></div>
        <span class="comparison-sun-state" :class="point.statusKind">{{ point.statusIcon }} {{ point.statusLabel }}</span>
        <div class="comparison-sun-events" :title="sunEventDescription">
          <div><span>日出</span><strong>{{ point.sunrise }}</strong></div>
          <div><span>日落</span><strong>{{ point.sunset }}</strong></div>
        </div>
      </article>
    </div>

    <div class="comparison-metrics">
      <section class="comparison-metric">
        <h3>不看日期</h3>
        <strong class="comparison-metric-number">{{ clockGap }}</strong>
        <p>按 24 小时循环取最短间隔</p>
      </section>
      <section class="comparison-metric comparison-metric--dated">
        <h3>连同日期比较</h3>
        <div class="comparison-dated-result">
          <span v-if="leader">{{ leader }} 领先</span>
          <strong class="comparison-metric-number">{{ datedGap }}</strong>
        </div>
        <p>{{ leader ? '对照上方完整日期和时间读数' : '两地的日期和时间读数相同' }}</p>
      </section>
    </div>

    <aside class="comparison-explanation">
      <strong v-if="equation" class="comparison-equation">{{ equation }}</strong>
      <p>{{ explanation }}</p>
      <small>两地处于同一瞬间，比较的是地方时读数，不是经过了多少时间。</small>
    </aside>
    <footer class="comparison-model-note" :title="modelDescription">教学模拟 · 日出日落为几何地方时</footer>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  points: {
    name: string
    longitude: string
    time: string
    date: string
    statusKind: string
    statusIcon: string
    statusLabel: string
    sunrise: string
    sunset: string
  }[]
  clockGap: string
  datedGap: string
  leader: string
  equation: string
  explanation: string
  sunEventDescription: string
  modelDescription: string
}>()
</script>

<style scoped>
.time-comparison {
  container: ab-time-comparison / inline-size;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 12px;
  color: #deedf7;
  font-size: 14px;
  line-height: 1.45;
}

.comparison-locations,
.comparison-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.comparison-location {
  --point-accent: #ff787d;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(143, 194, 218, 0.16);
  border-top: 3px solid var(--point-accent);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(18, 41, 60, 0.85), rgba(6, 20, 35, 0.88));
}

.comparison-location--b { --point-accent: #58a5ff; }
.comparison-location-head { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.comparison-point-badge {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  border-radius: 50%;
  color: #fff;
  font-weight: 800;
  background: var(--point-accent);
}
.comparison-point-name { font-weight: 700; white-space: nowrap; }
.comparison-longitude { margin-left: auto; color: var(--point-accent); white-space: nowrap; }
.comparison-clock {
  display: block;
  margin: 10px 0 8px;
  color: #f2faff;
  font-size: clamp(32px, 6cqi, 40px);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.comparison-date { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font-size: 13px; }
.comparison-date > span { color: #8baabd; }
.comparison-date > strong { color: #d0e3ef; font-weight: 600; overflow-wrap: anywhere; }
.comparison-sun-state { display: inline-block; margin: 10px 0; color: #ffe29b; font-size: 13px; font-weight: 700; }
.comparison-sun-state.night, .comparison-sun-state.polar-night { color: #9cc5f5; }
.comparison-sun-events { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.comparison-sun-events > div { display: grid; gap: 2px; padding: 7px 9px; border-radius: 7px; background: rgba(0, 5, 15, 0.28); }
.comparison-sun-events span { color: #91afc2; font-size: 12px; }
.comparison-sun-events strong { font-size: 14px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.comparison-metrics { margin-top: 12px; }
.comparison-metric { min-width: 0; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(111, 198, 214, 0.18); background: rgba(29, 81, 101, 0.12); }
.comparison-metric--dated { border-color: rgba(242, 204, 114, 0.2); background: rgba(122, 89, 27, 0.09); }
.comparison-metric h3 { margin: 0 0 7px; color: #bed5e4; font-size: 14px; font-weight: 600; }
.comparison-metric-number { color: #80e3ed; font-size: 22px; font-weight: 800; line-height: 1.3; white-space: nowrap; }
.comparison-metric--dated .comparison-metric-number { color: #ffe29b; }
.comparison-dated-result { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 8px; }
.comparison-dated-result > span { color: #ffe29b; white-space: nowrap; }
.comparison-metric p { margin: 7px 0 0; color: #91afc2; font-size: 12px; }
.comparison-explanation { margin-top: 12px; padding: 11px 13px; border-left: 2px solid #50b6c5; border-radius: 0 8px 8px 0; background: rgba(62, 122, 143, 0.08); }
.comparison-equation { display: block; margin-bottom: 5px; color: #e3f4fc; font-size: 15px; line-height: 1.5; }
.comparison-explanation p { margin: 0; color: #b7d0df; font-size: 13px; overflow-wrap: anywhere; }
.comparison-explanation small { display: block; margin-top: 5px; color: #88a5b8; font-size: 12px; line-height: 1.5; }
.comparison-model-note { padding-top: 10px; color: #819fb2; font-size: 12px; }

@container ab-time-comparison (max-width: 430px) {
  .comparison-metrics { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .comparison-location { padding: 11px; }
}
@container ab-time-comparison (max-width: 340px) {
  .comparison-locations { grid-template-columns: minmax(0, 1fr); }
}
</style>
