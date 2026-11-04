<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { createDivingSuitScene, type DivingSuitScene, type SuitMarker, type SuitPart } from './diving-suit-scene'

const emit = defineEmits<{ record: [observation: string] }>()
const stage = ref<HTMLElement>()
const section = ref(false)
const pressure = ref(false)
const markers = ref<SuitMarker[]>([])
const failed = ref(false)
const selected = ref<SuitPart>('shell')
const observation = ref('')
const savedObservation = ref('')
const saved = computed(() => Boolean(savedObservation.value) && savedObservation.value === observation.value.trim())
const visibleMarkers = computed(() => markers.value.filter(item => item.visible))
const parts: Record<SuitPart, { title: string; text: string }> = {
  helmet: { title: '头盔与观察窗', text: '坚固头盔和厚观察窗构成耐压边界的一部分。窗口既要让人看见外面，也要与壳体保持可靠连接和密封。' },
  shell: { title: '刚性耐压外壳', text: '外侧海水压力与内舱压力不同，刚性壳体承受压差，保护内部空间。打开“结构观察”，可以看见外壳厚度和内舱；正常工作时外壳完整封闭。' },
  joint: { title: '耐压活动关节', text: '手臂和腿部通过专门设计的耐压关节活动。关节不仅要能动，还必须保持密封；并不是普通衣服上的柔软褶皱。' },
  life: { title: '生命支持系统', text: '供氧、二氧化碳吸收及状态监测帮助维持内部呼吸环境。背部装置和连接软管为简化外形，不表示所有常压潜水服都采用同一配置。' },
}
let controller: DivingSuitScene | undefined
let disposed = false
function initialize() {
  if (!stage.value || disposed) return
  controller?.dispose(); stage.value.replaceChildren(); failed.value = false; markers.value = []
  try {
    controller = createDivingSuitScene(stage.value, {
      onMarkers(value) { if (!disposed) markers.value = value },
      onError() { if (!disposed) failed.value = true },
    })
    controller.setSection(section.value); controller.setPressure(pressure.value)
  } catch (error) { console.error('Diving suit scene failed', error); failed.value = true }
}
function focus(part: SuitPart) { selected.value = part; controller?.focus(part) }
function toggleSection() { section.value = !section.value; selected.value = 'shell'; controller?.setSection(section.value) }
function togglePressure() { pressure.value = !pressure.value; controller?.setPressure(pressure.value) }
function reset() { section.value = false; pressure.value = false; selected.value = 'shell'; controller?.setSection(false); controller?.setPressure(false); controller?.reset() }
function record() {
  const text = observation.value.trim(); if (!text) return
  emit('record', text); savedObservation.value = text
}
onMounted(() => { void nextTick(initialize) })
onBeforeUnmount(() => { disposed = true; controller?.dispose(); controller = undefined })
</script>

<template>
  <section class="hy-suit" aria-label="潜水服耐压原理探究">
    <p class="hs-question"><span>驱动问题 02</span>为什么潜水时必须穿坚固耐压的潜水服？</p>
    <p class="hs-intro">这里用<strong>常压（硬壳）潜水服</strong>帮助理解耐压原理：外面水压增大时，刚性壳体承受压差，内舱维持接近海面的大气压力。</p>
    <div class="hs-toolbar" role="group" aria-label="潜水服观察工具">
      <button type="button" :aria-pressed="section" :disabled="failed" @click="toggleSection">{{ section ? '关闭结构观察' : '结构观察' }}</button>
      <button type="button" :aria-pressed="pressure" :disabled="failed" @click="togglePressure">压力方向</button>
      <button type="button" :disabled="failed" @click="reset">复位</button>
    </div>
    <div class="hs-scene-wrap">
      <div ref="stage" class="hs-canvas" />
      <div v-if="!failed" class="hs-labels" aria-label="潜水服结构标注">
        <button v-for="marker in visibleMarkers" :key="marker.id" type="button" :aria-label="`观察${parts[marker.id].title}`"
          :class="{ active: selected === marker.id }" :style="{ left: `${marker.x}px`, top: `${marker.y}px` }" @click="focus(marker.id)">{{ parts[marker.id].title }}</button>
      </div>
      <span v-if="!failed" class="hs-model-caption">{{ section ? '局部剖视 · 显示壳厚与内舱' : '常压潜水服 · 结构示意' }}</span>
      <p v-if="failed" class="hs-error" role="alert">三维模型暂时未能加载。<button type="button" @click="initialize">重新加载</button></p>
    </div>
    <div class="hs-part-buttons" role="group" aria-label="选择潜水服部件">
      <button v-for="(part, id) in parts" :key="id" type="button" :aria-pressed="selected === id" :disabled="failed" @click="focus(id)">{{ part.title }}</button>
    </div>
    <div class="hs-description" aria-live="polite"><h3>{{ parts[selected].title }}</h3><p>{{ parts[selected].text }}</p></div>
    <p v-if="pressure" class="hs-pressure-note">箭头只表示海水从各方向施压，不表示压力大小，也不演示潜水服发生形变。</p>
    <div class="hs-distinction"><strong>和普通潜水衣有什么不同？</strong><p>普通软式潜水衣主要用于保温、防护，不能把人体与周围高水压隔开。本模型展示的是另一类装备：内部保持接近常压的硬壳潜水服。不同型号的适用深度不同；本模型没有额定深度，课件的水深滑块也不是这套装备的下潜范围。</p></div>
    <div class="hs-record">
      <label for="hydrate-suit-observation">我的观察</label>
      <textarea id="hydrate-suit-observation" v-model="observation" rows="3" maxlength="400" placeholder="外壳、观察窗和关节分别解决了什么问题？写下你的发现。" />
      <div><p role="status">{{ saved ? '已加入学习记录，可用于开采建议书。' : '把“需要什么设备”与“为什么需要”连起来。' }}</p><button type="button" :disabled="!observation.trim() || saved" @click="record">{{ saved ? '已记录' : '记录潜水服观察' }}</button></div>
    </div>
    <p class="hs-sources">补充原理来源：<a href="https://www.whoi.edu/oceanus/feature/exosuit/" target="_blank" rel="noopener noreferrer">伍兹霍尔海洋研究所</a>、<a href="https://nuytco.com/wp-content/uploads/2013/06/Exosuit-Specifications.pdf" target="_blank" rel="noopener noreferrer">Nuytco 常压潜水系统资料</a>。模型并非教材指定装备或某型号的精确复刻。</p>
  </section>
</template>

<style scoped>
.hy-suit { color: #284e54; font: 14px/1.75 "PingFang SC", "Microsoft YaHei", sans-serif; }
.hy-suit *, .hy-suit *::before, .hy-suit *::after { box-sizing: border-box; }
.hy-suit button, .hy-suit button * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.hy-suit button { min-height: 40px; padding: 8px 13px; border: 1px solid #c1d3c9; border-radius: 7px; background: #f4f7ee; color: #315e53; font: inherit; line-height: 1.45; touch-action: manipulation; cursor: pointer; }
.hy-suit button:hover:not(:disabled) { background: #e1ede1; border-color: #7ba691; }
.hy-suit button[aria-pressed="true"] { background: #327462; border-color: #327462; color: #fffef8; }
.hy-suit button[aria-pressed="true"]:hover:not(:disabled) { background: #245d4d; border-color: #245d4d; color: #fffef8; }
.hy-suit button:disabled { opacity: .5; cursor: default; }
.hy-suit button:focus-visible, .hy-suit a:focus-visible, .hy-suit textarea:focus-visible { outline: 3px solid #398e99; outline-offset: 3px; }
.hy-suit .hs-question { margin: 0; color: #254b52; font-size: 18px; font-weight: 500; }
.hy-suit .hs-question > span { display: inline-block; margin-right: 10px; border-radius: 5px; padding: 4px 8px; font-size: 12px; color: #487869; background: #e8f0e2; }
.hy-suit .hs-intro { margin: 12px 0 0; color: #58776c; }
.hy-suit .hs-intro strong { color: #2c6255; font-weight: 600; }
.hy-suit .hs-toolbar { display: flex; flex-wrap: wrap; gap: 7px; margin: 17px 0 10px; }
.hy-suit .hs-scene-wrap { position: relative; height: 460px; overflow: hidden; border: 1px solid #cddad0; border-radius: 12px; background: #edf1ed; }
.hy-suit .hs-canvas, .hy-suit .hs-labels { position: absolute; inset: 0; }
.hy-suit .hs-canvas { touch-action: none; }
.hy-suit .hs-labels { pointer-events: none; overflow: hidden; }
.hy-suit .hs-labels > button { position: absolute; transform: translate(-50%, -115%); min-height: 31px; padding: 5px 9px; white-space: nowrap; font-size: 12px; background: #fffef4ec; border-color: #abc8b7; box-shadow: 0 2px 8px #234f4320; pointer-events: auto; }
.hy-suit .hs-labels > button.active { border-color: #488d75; background: #e7f2e3; }
.hy-suit .hs-labels > button::after { position: absolute; content: ''; top: 100%; left: 50%; height: 9px; width: 1px; background: #6d9783; }
.hy-suit .hs-model-caption { position: absolute; left: 13px; bottom: 10px; color: #668074; font-size: 12px; pointer-events: none; }
.hy-suit .hs-part-buttons { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.hy-suit .hs-part-buttons > button { flex: 1; min-width: 120px; }
.hy-suit .hs-description { padding: 15px 17px; margin-top: 13px; border: 1px solid #d2e0d1; background: #f5f8ed; border-radius: 9px; }
.hy-suit .hs-description > h3 { margin: 0 0 5px; font-size: 16px; font-weight: 500; color: #285b4f; }
.hy-suit .hs-description > p { margin: 0; color: #567769; }
.hy-suit .hs-pressure-note { margin: 12px 0 0; padding-left: 11px; border-left: 2px solid #75a4ac; color: #52777d; }
.hy-suit .hs-distinction { margin-top: 20px; padding: 15px 17px; border-left: 3px solid #b59c6e; background: #f6f1e6; border-radius: 0 8px 8px 0; }
.hy-suit .hs-distinction > strong { font-size: 15px; font-weight: 500; color: #75613e; }
.hy-suit .hs-distinction > p { margin: 6px 0 0; color: #776e59; }
.hy-suit .hs-record { margin-top: 20px; }
.hy-suit .hs-record > label { display: block; font-size: 16px; margin-bottom: 8px; color: #284e54; }
.hy-suit textarea { display: block; width: 100%; min-height: 92px; padding: 11px 13px; border: 1px solid #bfd3c5; border-radius: 8px; resize: vertical; font: inherit; color: #254b52; background: #fffef9; }
.hy-suit textarea::placeholder { color: #82978b; }
.hy-suit .hs-record > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 10px; }
.hy-suit .hs-record > div > p { margin: 0; font-size: 13px; color: #6c8778; }
.hy-suit .hs-record > div > button { flex-shrink: 0; background: #327462; border-color: #327462; color: #fffef5; }
.hy-suit .hs-record > div > button:hover:not(:disabled) { background: #245d4d; border-color: #245d4d; color: #fffef5; }
.hy-suit .hs-sources { margin: 18px 0 0; font-size: 13px; color: #73877b; }
.hy-suit .hs-sources a { color: #447a6a; text-decoration: underline; text-underline-offset: 3px; }
.hy-suit .hs-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 15px; flex-direction: column; background: #f4f3eb; color: #7b5b47; }
@media (max-width: 600px) {
  .hy-suit .hs-scene-wrap { height: 400px; }
  .hy-suit .hs-question { font-size: 17px; }
  .hy-suit .hs-question > span { display: block; width: fit-content; margin-bottom: 6px; }
  .hy-suit .hs-part-buttons { display: grid; grid-template-columns: 1fr 1fr; }
  .hy-suit .hs-part-buttons > button { min-width: 0; }
  .hy-suit .hs-record > div { align-items: stretch; flex-direction: column; }
  .hy-suit .hs-record > div > button { align-self: flex-end; }
}
</style>
