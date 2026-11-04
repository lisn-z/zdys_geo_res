<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createSampleScene, type SampleScene } from './sample-scene'

const emit = defineEmits<{ record: [observation: string] }>()
const host = ref<HTMLElement>()
const burning = ref(false)
const observedBurning = ref(false)
const recorded = ref(false)
const unavailable = ref(false)
let scene: SampleScene | undefined
const observation = computed(() => observedBurning.value
  ? '可燃冰外观呈白色冰状。演示中样品上方出现火焰，燃烧的是水合物释放出的甲烷；水本身不燃烧。'
  : '可燃冰外观呈白色冰状；它由水和气体形成，不能仅凭“像冰”就判断它是普通冰。')

function burn() { burning.value = true; observedBurning.value = true; recorded.value = false; scene?.setBurning(true) }
function stop() { burning.value = false; scene?.setBurning(false) }
function observe() { stop(); scene?.reset() }
function record() { emit('record', observation.value); recorded.value = true }
function initialize() {
  if (!host.value) return
  unavailable.value = false
  scene?.dispose(); scene = undefined; host.value.replaceChildren()
  try {
    scene = createSampleScene(host.value, () => { unavailable.value = true; burning.value = false })
    scene.setBurning(burning.value)
  } catch (error) {
    console.error('Hydrate sample viewer', error)
    unavailable.value = true; burning.value = false
  }
}
onMounted(initialize)
onBeforeUnmount(() => { scene?.dispose(); scene = undefined })
</script>

<template>
  <section class="hy-sample" aria-label="可燃冰样品与燃烧观察">
    <div class="hy-sample-heading"><span>图 3-37 · 现象观察</span><h3>看起来像冰，为什么还能燃烧？</h3></div>
    <div class="hy-sample-view">
      <div ref="host" class="hy-sample-canvas" />
      <p class="hy-sample-state" role="status">{{ burning ? '燃烧现象 · 动态示意' : '冰状水合物 · 三维示意' }}</p>
      <div class="hy-sample-zoom" role="group" aria-label="样品视角">
        <button type="button" :disabled="unavailable" aria-label="缩小样品" @click="scene?.zoom(-1)">−</button>
        <button type="button" :disabled="unavailable" aria-label="放大样品" @click="scene?.zoom(1)">+</button>
      </div>
      <div v-if="unavailable" class="hy-sample-error" role="alert"><p>样品视图暂时无法打开</p><button type="button" @click="initialize">重新加载</button></div>
    </div>
    <div class="hy-sample-controls" role="group" aria-label="样品观察方式">
      <button type="button" :disabled="unavailable" :aria-pressed="!burning" @click="observe">观察样品</button>
      <button type="button" :disabled="unavailable" :class="{ active: burning }" :aria-pressed="burning" @click="burn">演示燃烧</button>
      <button type="button" :disabled="!burning || unavailable" @click="stop">停止演示</button>
    </div>
    <div class="hy-sample-notes">
      <div><h4>观察什么</h4><p>{{ burning || observedBurning ? '比较样品和火焰的位置：白色冰状物与它上方燃烧的气体，是同一种东西吗？' : '先转动样品，观察白色、不规则的冰状外观，再选择“演示燃烧”。' }}</p></div>
      <div class="hy-sample-answer"><h4>{{ observedBurning ? '解释现象' : '认识样品' }}</h4><p>{{ observedBurning ? '水合物分解释放甲烷，甲烷可以燃烧。水本身不燃烧，“可燃冰”也不等于普通冰。' : '可燃冰是水和气体形成的固态水合物，主要气体成分是甲烷。' }}</p></div>
    </div>
    <div class="hy-sample-foot"><p>样品形状、火焰与时间均作教学示意。</p><button type="button" class="hy-sample-record" @click="record">{{ recorded ? '已加入学习记录' : '记录观察' }}</button></div>
  </section>
</template>

<style scoped>
.hy-sample { color: #254b52; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
.hy-sample *, .hy-sample *::before, .hy-sample *::after { box-sizing: border-box; }
.hy-sample h3, .hy-sample h4, .hy-sample p { margin: 0; }
.hy-sample .hy-sample-heading { margin-bottom: 14px; }
.hy-sample .hy-sample-heading > span { font-size: 12px; color: #68847e; letter-spacing: .7px; }
.hy-sample .hy-sample-heading > h3 { margin-top: 6px; font-size: 22px; line-height: 1.5; font-weight: 500; }
.hy-sample .hy-sample-view { position: relative; height: 390px; overflow: hidden; border-radius: 10px; background: #647d88; }
.hy-sample .hy-sample-canvas { position: absolute; inset: 0; touch-action: none; }
.hy-sample .hy-sample-canvas :deep(canvas) { display: block; width: 100%; height: 100%; }
.hy-sample .hy-sample-state { position: absolute; top: 12px; left: 14px; pointer-events: none; color: #eff7f8; background: #233b4780; padding: 6px 9px; border-radius: 5px; font-size: 12px; line-height: 1.5; }
.hy-sample button, .hy-sample button * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.hy-sample button { font: inherit; cursor: pointer; touch-action: manipulation; border: 1px solid #c8d8cd; border-radius: 6px; background: #fbfcf5; color: #315e59; min-height: 40px; padding: 8px 15px; }
.hy-sample button:hover:not(:disabled) { background: #e5eee3; border-color: #8bb3a2; }
.hy-sample button:focus-visible { outline: 3px solid #40969b; outline-offset: 3px; }
.hy-sample button:disabled { cursor: default; opacity: .42; }
.hy-sample .hy-sample-zoom { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 4px; }
.hy-sample .hy-sample-zoom button { width: 40px; padding: 4px; font-size: 22px; line-height: 1; background: #f3f8f3e8; }
.hy-sample .hy-sample-controls { display: flex; justify-content: center; gap: 9px; margin: 14px 0 18px; }
.hy-sample .hy-sample-controls button { font-size: 14px; }
.hy-sample .hy-sample-controls > button[aria-pressed="true"] { color: #fffdf4; background: #2d7775; border-color: #2d7775; }
.hy-sample .hy-sample-controls > button[aria-pressed="true"]:hover:not(:disabled) { color: #fffdf4; background: #245f5e; border-color: #245f5e; }
.hy-sample .hy-sample-notes { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.hy-sample .hy-sample-notes h4 { font-weight: 600; font-size: 15px; line-height: 1.6; }
.hy-sample .hy-sample-notes p { margin-top: 6px; font-size: 14px; line-height: 1.8; color: #5b766e; }
.hy-sample .hy-sample-answer { padding-left: 18px; border-left: 2px solid #9ab9aa; }
.hy-sample .hy-sample-foot { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-top: 20px; padding-top: 14px; border-top: 1px solid #dce4d9; }
.hy-sample .hy-sample-foot > p { font-size: 12px; color: #7b8c82; line-height: 1.6; }
.hy-sample .hy-sample-record { font-size: 14px; flex-shrink: 0; }
.hy-sample .hy-sample-error { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: #edf1e9; }
@media(max-width: 600px) {
  .hy-sample .hy-sample-heading > h3 { font-size: 19px; }
  .hy-sample .hy-sample-view { height: 300px; }
  .hy-sample .hy-sample-notes { grid-template-columns: 1fr; gap: 15px; }
  .hy-sample .hy-sample-controls { gap: 6px; }
  .hy-sample .hy-sample-controls button { padding: 8px 10px; font-size: 13px; }
  .hy-sample .hy-sample-foot { flex-direction: column; align-items: stretch; gap: 10px; }
}
</style>
