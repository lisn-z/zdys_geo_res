<template>
  <div v-if="lesson.active" class="climate-lesson-overlay">
    <button v-for="point in lesson.points" v-show="point.visible" :key="point.id" class="climate-station-pin" type="button"
      :class="{ selected: lesson.stationId === point.id }" :style="{ left: `${point.x}px`, top: `${point.y}px` }"
      :title="point.name" :aria-label="`查看${point.name}气候图`" @pointerdown.stop @click.stop="lesson.selectStation(point.id)">
      {{ point.number }}<span>{{ point.name }}</span>
    </button>

    <section class="climate-map-legend" aria-label="气候图例与地点">
      <div class="climate-legend-tabs">
        <button type="button" :class="{ active: lesson.legendTab === 'map' }" @click="lesson.legendTab = 'map'">分层图例</button>
        <button type="button" :class="{ active: lesson.legendTab === 'stations' }" @click="lesson.legendTab = 'stations'; lesson.showStations = true">12地气候图</button>
      </div>
      <p v-if="lesson.snapshot.phase === 'loading'" class="climate-source-note" role="status">正在加载地理分区…</p>
      <p v-else-if="lesson.snapshot.phase === 'error'" class="climate-source-note" role="alert">{{ lesson.snapshot.error }} <button type="button" @click="lesson.retry()">重新加载</button></p>
      <template v-if="lesson.legendTab === 'map'">
        <strong class="climate-legend-title">{{ lesson.title }}</strong>
        <div class="climate-legend-grid">
          <button v-for="item in lesson.snapshot.legend" :key="item.id" type="button"
            :class="{ selected: lesson.snapshot.selectedId === item.id }" :aria-pressed="lesson.snapshot.selectedId === item.id"
            @click="lesson.selectSource(item.id)"><i :style="{ background: item.color }"></i><span>{{ item.name }}</span></button>
        </div>
        <p v-if="lesson.pickedValue" class="climate-picked-value" role="status">{{ lesson.pickedValue }}</p>
        <button v-if="lesson.snapshot.selectedId" type="button" class="climate-reset-selection" @click="lesson.clearSelection()">显示全部分区</button>
        <details v-if="lesson.layer === 'climate'" class="atlas-type-details">
          <summary>图册细分气候类型 · {{ lesson.types.length }} 项</summary>
          <div class="atlas-type-list"><button v-for="type in lesson.types" :key="type.id" @click="lesson.selectType(type.id)">{{ type.name }}</button></div>
        </details>
        <p class="climate-source-note">{{ lesson.layer === 'climate' ? '地图为12类概括分区；点击查看图册对应细类。' : '按原始分区属性设色；无数据的海域保留底图。' }}</p>
      </template>
      <template v-else>
        <p class="climate-source-note">图册第30—31页 · 点击地点读取月度图</p>
        <div class="climate-station-list"><button v-for="(station, index) in lesson.stations" :key="station.id" type="button"
          :class="{ selected: lesson.stationId === station.id }" @click="lesson.selectStation(station.id)"><span>{{ index + 1 }}</span>{{ station.name }}</button></div>
      </template>
    </section>

    <FloatingFeatureCard v-if="lesson.infoOpen" v-model:collapsed="detailCollapsed" class="climate-detail-panel" title="气候类型与气候图" variant="data"
      :initial-top="90" :initial-right="16" :min-width="340" :min-height="380" :bottom-inset="88" :initial-collapsed="false">
      <template #header-meta><button class="climate-panel-close" type="button" aria-label="关闭气候面板" title="关闭气候面板" @pointerdown.stop @click.stop="lesson.clearSelection()">×</button></template>
      <template #title-prefix><button v-if="detailCollapsed" class="climate-panel-close climate-panel-close-collapsed" type="button" aria-label="关闭气候面板" title="关闭气候面板" @pointerdown.stop @click.stop="lesson.clearSelection()">×</button></template>
      <div v-if="lesson.variants.length > 1 && !lesson.stationId" class="climate-variant-tabs">
        <span>该概括分区对应的图册细类</span>
        <button v-for="type in lesson.variants" :key="type.id" type="button" :class="{ selected: lesson.selectedId === type.id }" @click="lesson.selectType(type.id)">{{ type.name }}</button>
      </div>
      <ClimateInfoCard :climate="lesson.selectedClimate" :stations="lesson.stations" :station-id="lesson.stationId"
        @select-station="lesson.selectStation" @close="lesson.clearSelection()" />
    </FloatingFeatureCard>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import ClimateInfoCard from './ClimateInfoCard.vue'
import type { ClimateLessonController } from '../simulation/useClimateLesson'
const props = defineProps<{ lesson: ClimateLessonController }>()
const detailCollapsed = ref(false)
watch(() => [props.lesson.selectedId, props.lesson.stationId, props.lesson.infoOpen], () => { if (props.lesson.infoOpen) detailCollapsed.value = false })
</script>

<style scoped>
.climate-lesson-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 80; color: #d9edf7; }
.climate-map-legend { pointer-events: auto; position: absolute; left: 22px; bottom: 108px; width: 256px; padding: 13px; max-height: calc(100dvh - 265px); overflow: auto; scrollbar-width: thin; border: 1px solid #244459; border-radius: 13px; background: rgba(3, 18, 31, .93); box-shadow: 0 12px 40px #0004; }
.climate-legend-tabs { display: flex; gap: 4px; border-bottom: 1px solid #234356; padding-bottom: 9px; margin-bottom: 12px; }
.climate-legend-tabs button { flex: 1; border: 0; background: transparent; color: #87a4b9; padding: 7px; cursor: pointer; border-radius: 5px; }
.climate-legend-tabs button.active { background: #173b50; color: #95ebf6; }
.climate-legend-title { font-size: 12px; display: block; margin-bottom: 9px; }
.climate-legend-grid { display: grid; gap: 3px; }
.climate-legend-grid button { display: flex; align-items: center; gap: 9px; min-height: 27px; border: 1px solid transparent; border-radius: 5px; background: none; color: #c5dbe7; text-align: left; font: inherit; font-size: 11px; padding: 3px 5px; cursor: pointer; }
.climate-legend-grid i { width: 23px; height: 12px; border: 1px solid #ffffff38; border-radius: 2px; flex: 0 0 auto; }
button.selected, .climate-legend-grid button:hover { border-color: #66b7ce; background: #144054; color: white; }
.climate-source-note { font-size: 10px; color: #92aebf; line-height: 1.6; margin: 9px 0; }
.climate-picked-value { color: #8ee6f1; font-size: 12px; }
.climate-reset-selection { color: #8fdae5; cursor: pointer; border: none; background: none; font-size: 11px; padding: 8px 0 0; }
.atlas-type-details { margin-top: 12px; font-size: 11px; color: #a9c9da; }
.atlas-type-details summary { cursor: pointer; }
.atlas-type-list { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; }
.atlas-type-list button, .climate-variant-tabs button { cursor: pointer; color: #bcd5e3; background: #102c3d; border: 1px solid #2b5269; border-radius: 4px; padding: 5px 6px; font-size: 10px; }
.climate-station-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.climate-station-list button { display: flex; align-items: center; gap: 7px; cursor: pointer; padding: 7px 5px; color: #c6dfeb; border: 1px solid #24495e; border-radius: 5px; background: #0a2638; font-size: 11px; }
.climate-station-list button span { color: #72d5e8; width: 18px; }
.climate-station-pin { position: absolute; pointer-events: auto; transform: translate(-50%,-50%); border: 1px solid #eafaff; background: #0c3b55; box-shadow: 0 0 0 3px #05182888; color: #efffff; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-size: 12px; }
.climate-station-pin.selected { background: #dcac58; color: #071f2e; }
.climate-station-pin>span { display: none; position: absolute; top: -25px; left: 50%; transform: translateX(-50%); padding: 3px 6px; background: #061a2ae8; border-radius: 4px; color: #efffff; white-space: nowrap; }
.climate-station-pin:hover>span, .climate-station-pin.selected>span, .climate-station-pin:focus-visible>span { display: block; }
.climate-detail-panel { pointer-events: auto; }
.climate-detail-panel:not(.collapsed) { width: min(410px, calc(100vw - 32px)); height: min(650px, calc(100dvh - 180px)); max-height: calc(100dvh - 180px); }
.climate-detail-panel :deep(.feature-card-content) { overflow-y: auto; padding-bottom: 12px; scrollbar-width: thin; scrollbar-color: #366078 transparent; }
.climate-panel-close { width: 27px; height: 27px; display: grid; place-items: center; padding: 0; border: 1px solid #376579; border-radius: 7px; background: #0d2d40; color: #a8dcea; font-size: 20px; line-height: 1; cursor: pointer; }
.climate-panel-close:hover { color: white; background: #21546b; }
.climate-panel-close-collapsed { position: absolute; right: 48px; top: 50%; transform: translateY(-50%); }
.climate-detail-panel.collapsed :deep(.feature-card-title) { padding-right: 34px; }
.climate-variant-tabs { display: flex; flex-wrap: wrap; gap: 5px; padding: 10px 14px 0; }
.climate-variant-tabs>span { width: 100%; font-size: 10px; color: #8db7cb; }
.climate-variant-tabs .selected { border-color: #6ecbde; }
button:focus-visible, a:focus-visible, summary:focus-visible { outline: 2px solid #8ee6ee; outline-offset: 2px; }
@media (max-width: 900px) { .climate-map-legend { width: 207px; left: 12px; bottom: 100px; max-height: 45vh; } }
</style>
