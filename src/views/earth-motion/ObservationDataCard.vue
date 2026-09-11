<template>
  <FloatingFeatureCard title="观测数据" :subtitle="place" variant="data" :initial-top="initialTop"
    :initial-right="initialRight" :initial-collapsed="initialCollapsed">
    <div v-if="hasObservation" class="data-card-content">
      <div class="data-hero-row">
        <article>
          <span>太阳高度角</span>
          <strong>{{ solarAltitude }}</strong>
        </article>
        <article>
          <span>当地太阳时</span>
          <strong>{{ solarTime }}</strong>
        </article>
      </div>

      <div class="data-meta-line">
        <span>{{ dateLabel }}</span>
        <span>{{ coordinateLabel }}</span>
      </div>

      <dl class="key-data-grid">
        <div>
          <dt>直射纬度</dt>
          <dd>{{ directLatitude }}</dd>
        </div>
        <div>
          <dt>{{ dayNightLabel }}</dt>
          <dd>{{ dayNightValue }}</dd>
        </div>
        <div>
          <dt>日出（估算）</dt>
          <dd>{{ sunrise }}</dd>
        </div>
        <div>
          <dt>日落（估算）</dt>
          <dd>{{ sunset }}</dd>
        </div>
        <div>
          <dt>自转角速度</dt>
          <dd>{{ angularSpeed }}</dd>
        </div>
        <div>
          <dt>自转线速度</dt>
          <dd>{{ linearSpeed }}</dd>
        </div>
      </dl>
      <p class="speed-model-note">采用当地太阳时（非北京时间）。昼长、日出日落及自转速度按约 24 小时自转的理想模型估算；未计大气折射与地形，不代表演示中的实际时长或速度。</p>
      <p v-if="orbitOnlyReference" class="speed-model-note">仅公转为假设演示：地球自转姿态不变，当地太阳时会随公转反向变化。</p>
    </div>

    <p v-else class="empty-tip">选择预设城市或点击地球选点，查看观测数据。</p>
  </FloatingFeatureCard>
</template>

<script setup lang="ts">
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'

defineProps<{
  hasObservation: boolean
  orbitOnlyReference?: boolean
  place: string
  solarAltitude: string
  solarTime: string
  dateLabel: string
  coordinateLabel: string
  directLatitude: string
  dayNightLabel: string
  dayNightValue: string
  sunrise: string
  sunset: string
  angularSpeed: string
  linearSpeed: string
  initialTop?: number
  initialRight?: number
  initialCollapsed?: boolean
}>()
</script>

<style scoped>
.data-card-content {
  --metric-bg: linear-gradient(145deg, rgba(23, 74, 100, 0.26), rgba(5, 25, 39, 0.36));
  --metric-border: rgba(78, 199, 244, 0.14);
  --grid-bg: rgba(75, 181, 221, 0.09);
  --grid-cell-bg: rgba(3, 17, 29, 0.76);
  padding: 12px;
}

:global(.theme-light) .data-card-content {
  --metric-bg: linear-gradient(145deg, rgba(213, 240, 248, 0.72), rgba(246, 251, 253, 0.80));
  --metric-border: rgba(35, 141, 180, 0.18);
  --grid-bg: rgba(44, 139, 174, 0.12);
  --grid-cell-bg: rgba(247, 252, 254, 0.86);
}

.data-hero-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.data-hero-row article {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--metric-border);
  border-radius: 10px;
  background: var(--metric-bg);
}

.data-hero-row span,
.key-data-grid dt {
  color: var(--feature-muted);
  font-size: clamp(10px, 0.48vw, 13px);
  letter-spacing: 0.04em;
}

.data-hero-row strong {
  color: var(--feature-title);
  font-size: clamp(19px, 0.95vw, 27px);
  font-weight: 700;
  line-height: 1.15;
}

.data-meta-line {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  margin: 9px 1px 10px;
  color: var(--feature-muted);
  font-size: clamp(10px, 0.46vw, 13px);
  white-space: nowrap;
}

.key-data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--metric-border);
  border-radius: 10px;
  background: var(--grid-bg);
}

.key-data-grid>div {
  min-width: 0;
  padding: 8px 9px;
  background: var(--grid-cell-bg);
}

.key-data-grid dt {
  margin-bottom: 3px;
}

.key-data-grid dd {
  margin: 0;
  color: var(--feature-text);
  font-size: clamp(12px, 0.58vw, 16px);
  font-weight: 650;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tip {
  margin: 0;
  padding: 16px;
  color: var(--feature-muted);
  font-size: 12px;
}

.speed-model-note {
  margin: 10px 0 0;
  color: var(--feature-muted);
  font-size: clamp(11px, 0.55vw, 14px);
  line-height: 1.6;
}

@media (min-width: 1800px) and (min-height: 900px) {
  .data-card-content {
    padding: 15px;
  }

  .data-hero-row {
    gap: 10px;
  }

  .data-hero-row article {
    gap: 6px;
    padding: 13px;
    border-radius: 12px;
  }

  .data-meta-line {
    margin: 12px 2px 13px;
  }

  .key-data-grid>div {
    padding: 11px 12px;
  }
}
</style>
