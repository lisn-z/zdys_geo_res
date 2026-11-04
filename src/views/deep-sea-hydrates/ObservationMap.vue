<script setup lang="ts">
import { computed } from 'vue'

type ObservationId = 'map' | 'sample' | 'suit' | 'pressure' | 'platform' | 'hydrate' | 'sediment' | 'rov' | 'wellhead' | 'riser' | 'monitor' | 'transport' | 'environment'
interface ObservationPoint {
  id: ObservationId
  title: string
  prompt: string
  recordable?: boolean
}
interface ObservationGroup {
  id: string
  title: string
  question: string
  points: ObservationPoint[]
}

const props = defineProps<{ visited: string[] }>()
const emit = defineEmits<{ choose: [id: ObservationId] }>()
const visitedPoints = computed(() => new Set(props.visited))
const groups: ObservationGroup[] = [
  {
    id: 'prepare', title: '探究准备', question: '先认识资源与开采场景',
    points: [
      { id: 'map', title: '分布读图', prompt: '查看南海位置、分布范围和图例。', recordable: true },
      { id: 'sample', title: '可燃冰样品', prompt: '比较样品与燃烧示意，火焰来自哪里？', recordable: true },
      { id: 'platform', title: '半潜式作业平台', prompt: '查看水下浮筒和海床锚缆：平台怎样漂浮并保持位置？' },
    ],
  },
  {
    id: 'pressure', title: '深海高压', question: '深海环境给观察和作业带来什么困难？',
    points: [
      { id: 'suit', title: '耐压潜水服', prompt: '观察壳体、关节和密封连接，思考怎样承受水压。', recordable: true },
      { id: 'pressure', title: '水深与压力', prompt: '改变深度，比较不同水深的压力读数。', recordable: true },
      { id: 'rov', title: '水下机器人', prompt: '靠近看摄像头、灯和机械臂：它怎样替人巡检井口与管道？' },
      { id: 'hydrate', title: '含可燃冰沉积层', prompt: '观察可燃冰所在层位，与周围地层比较。' },
      { id: 'sediment', title: '海底沉积层', prompt: '查看层理与井筒位置，区分海床表面和地下地层。' },
    ],
  },
  {
    id: 'transport', title: '开采输送', question: '海底资源怎样到达海面？',
    points: [
      { id: 'wellhead', title: '海底井口', prompt: '查看井口装置与井筒、立管怎样连接。' },
      { id: 'riser', title: '海底至海面的立管', prompt: '沿管线寻找起点与终点，追踪输送路径。' },
      { id: 'transport', title: '开采与输送观察', prompt: '播放开采示意，追踪物质进入井筒后的路径。', recordable: true },
    ],
  },
  {
    id: 'protect', title: '海洋保护', question: '开发资源时，还需要关注什么？',
    points: [
      { id: 'monitor', title: '海底监测站', prompt: '靠近看探头与电缆，再了解甲烷、温压和海床变化分别有什么用。' },
      { id: 'environment', title: '开采环境影响', prompt: '对照开采过程，思考可能的影响与保护措施。' },
    ],
  },
]
const pointCount = groups.reduce((count, group) => count + group.points.length, 0)
</script>

<template>
  <section class="hy-observation-map" aria-labelledby="hy-observation-map-title">
    <header class="om-header">
      <div class="om-title-row"><h3 id="hy-observation-map-title">观察地图</h3><span>{{ pointCount }} 个观察点</span></div>
      <p>从一个观察点开始，比较、提问，再记录你的发现。</p>
      <p class="om-legend"><span class="om-recordable">可记录</span> 标有此标签的活动提供观察记录入口。</p>
    </header>

    <div class="om-groups">
      <section v-for="(group, index) in groups" :key="group.id" class="om-group" :aria-labelledby="`om-group-${group.id}`">
        <header class="om-group-heading">
          <span class="om-step" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><h4 :id="`om-group-${group.id}`">{{ group.title }}</h4><p>{{ group.question }}</p></div>
        </header>
        <div class="om-points">
          <button
            v-for="point in group.points" :key="point.id" type="button" class="om-point"
            :class="{ 'is-visited': visitedPoints.has(point.id) }"
            @click="emit('choose', point.id)"
          >
            <span class="om-point-content">
              <span class="om-point-title">{{ point.title }}</span>
              <span class="om-prompt">{{ point.prompt }}</span>
              <span v-if="point.recordable || visitedPoints.has(point.id)" class="om-tags">
                <span v-if="point.recordable" class="om-recordable">可记录</span>
                <span v-if="visitedPoints.has(point.id)" class="om-visited">已看过</span>
              </span>
            </span>
            <svg class="om-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m7 4 6 6-6 6" /></svg>
          </button>
        </div>
      </section>
    </div>
    <p class="om-footnote">“已看过”只表示打开过这个观察点，不代表已经完成探究。可以随时返回，重新观察。</p>
  </section>
</template>

<style scoped>
.hy-observation-map { color: #284f54; font: 14px/1.65 "PingFang SC", "Microsoft YaHei", sans-serif; }
.hy-observation-map *, .hy-observation-map *::before, .hy-observation-map *::after { box-sizing: border-box; }
.hy-observation-map h3, .hy-observation-map h4, .hy-observation-map p { margin: 0; }
.hy-observation-map .om-header { padding-bottom: 21px; border-bottom: 1px solid #d7e1d4; }
.hy-observation-map .om-title-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 18px; }
.hy-observation-map .om-title-row h3 { color: #254f56; font-size: 25px; line-height: 1.4; font-weight: 600; }
.hy-observation-map .om-title-row > span { color: #6b8174; font-size: 14px; }
.hy-observation-map .om-header > p { margin-top: 10px; color: #526d63; font-size: 15px; }
.hy-observation-map .om-header > p.om-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 13px; color: #6a7e70; font-size: 14px; }
.hy-observation-map .om-groups { display: grid; gap: 27px; margin-top: 23px; }
.hy-observation-map .om-group-heading { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 12px; }
.hy-observation-map .om-step { display: inline-flex; justify-content: center; align-items: center; flex: 0 0 32px; height: 32px; border: 1px solid #cbdac9; border-radius: 8px; background: #edf3e7; color: #547a65; font-size: 14px; font-variant-numeric: tabular-nums; }
.hy-observation-map .om-group-heading h4 { color: #315e56; font-size: 18px; line-height: 1.5; font-weight: 600; }
.hy-observation-map .om-group-heading p { margin-top: 2px; color: #708173; font-size: 14px; }
.hy-observation-map .om-points { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.hy-observation-map button.om-point { display: flex; align-items: center; justify-content: space-between; gap: 13px; min-width: 0; min-height: 102px; margin: 0; padding: 15px 17px; border: 1px solid #cbdacf; border-radius: 9px; background: #fffef9; color: #315e56; font: inherit; font-size: 14px; text-align: left; text-decoration: none; cursor: pointer; appearance: none; box-shadow: 0 2px 5px rgb(42 78 65 / 4%); touch-action: manipulation; transition: background-color .15s, border-color .15s; }
.hy-observation-map button.om-point, .hy-observation-map button.om-point * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.hy-observation-map button.om-point:hover { border-color: #719682; background: #edf4e9; color: #244f47; }
.hy-observation-map button.om-point.is-visited { border-color: #aac2aa; background: #f2f6ed; color: #315e56; }
.hy-observation-map button.om-point.is-visited:hover { border-color: #648b73; background: #e3eee1; color: #244f47; }
.hy-observation-map button.om-point:focus-visible { outline: 3px solid #5b9581; outline-offset: 3px; }
.hy-observation-map button.om-point .om-point-content { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
.hy-observation-map button.om-point .om-point-title { color: #2c5a52; font-size: 16px; line-height: 1.5; font-weight: 600; }
.hy-observation-map button.om-point .om-prompt { color: #62796c; font-size: 14px; line-height: 1.65; overflow-wrap: anywhere; }
.hy-observation-map button.om-point:hover .om-point-title, .hy-observation-map button.om-point.is-visited:hover .om-point-title { color: #204b42; }
.hy-observation-map button.om-point:hover .om-prompt, .hy-observation-map button.om-point.is-visited:hover .om-prompt { color: #526e60; }
.hy-observation-map .om-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 3px; }
.hy-observation-map .om-recordable { display: inline-flex; align-items: center; padding: 1px 7px; border: 1px solid #c6d8c3; border-radius: 5px; background: #e8f1e1; color: #466d50; font-size: 14px; line-height: 1.6; font-weight: 400; }
.hy-observation-map .om-visited { display: inline-flex; align-items: center; padding: 1px 7px; border: 1px solid #447563; border-radius: 5px; background: #447563; color: #fffef4; font-size: 14px; line-height: 1.6; font-weight: 400; }
.hy-observation-map button.om-point .om-chevron { display: block; flex: 0 0 19px; width: 19px; height: 19px; color: #53806b; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.hy-observation-map .om-footnote { margin-top: 22px; padding-top: 16px; border-top: 1px solid #d7e1d4; color: #738373; font-size: 14px; }
@media (max-width: 600px) {
  .hy-observation-map .om-title-row h3 { font-size: 22px; }
  .hy-observation-map .om-points { grid-template-columns: minmax(0, 1fr); }
  .hy-observation-map button.om-point { min-height: 96px; padding: 13px 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .hy-observation-map button.om-point { transition: none; }
}
</style>
