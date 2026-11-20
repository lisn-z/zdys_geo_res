<template>
  <el-dialog v-model="open" class="seismo-achievement-dialog" width="min(520px, calc(100vw - 32px))" align-center append-to-body :close-on-click-modal="false" @closed="stopCelebration">
    <template #header="{ titleId }"><span :id="titleId" class="seismo-achievement-eyebrow">恭喜你，完成制作！</span></template>
    <section class="seismo-achievement-content" aria-labelledby="seismo-achievement-title">
      <div v-if="celebrating" class="seismo-achievement-particles" aria-hidden="true">
        <i v-for="piece in confetti" :key="piece.id" class="seismo-achievement-confetti" :class="{ ribbon: piece.ribbon }" :style="piece.style"></i>
        <span v-for="burst in 3" :key="`burst-${burst}`" class="seismo-achievement-firework" :class="`burst-${burst}`"><i v-for="ray in 8" :key="ray" :style="{ '--ray': `${ray * 45}deg` }"></i></span>
      </div>
      <div class="seismo-achievement-medal" aria-hidden="true">
        <span class="seismo-achievement-spark spark-one">✦</span><span class="seismo-achievement-spark spark-two">✧</span><span class="seismo-achievement-spark spark-three">✦</span>
        <svg viewBox="0 0 200 184" fill="none">
          <defs>
            <linearGradient id="seismo-medal-gold" x1="44" y1="10" x2="154" y2="156" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE9A5"/><stop offset=".5" stop-color="#E7B84B"/><stop offset="1" stop-color="#C78A25"/></linearGradient>
            <linearGradient id="seismo-medal-cup" x1="87" y1="63" x2="115" y2="104" gradientUnits="userSpaceOnUse"><stop stop-color="#FFFDF2"/><stop offset="1" stop-color="#DCE3CE"/></linearGradient>
          </defs>
          <path d="M65 114 51 170 79 161 96 179 108 126" fill="#55826A"/><path d="m105 123 17 56 15-18 28 8-19-57" fill="#315F50"/>
          <circle cx="100" cy="82" r="66" fill="url(#seismo-medal-gold)"/><circle cx="100" cy="82" r="58" fill="#FFF8DE" stroke="#F6D779" stroke-width="2"/>
          <path d="M59 49h82v68H59z" fill="#E4C58B" stroke="#C09D60" stroke-width="2"/>
          <path d="M66 57h68v53H66z" fill="#F3E6C4"/>
          <path d="m58 110 78-1 8 12H52z" fill="#FFFDF4" stroke="#D9DBC7" stroke-width="1.5"/>
          <path d="M62 117h13l4-5 4 9 5-14 5 11 5-2h35" stroke="#315F50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="m89 55-3 22m25-22 3 22" stroke="#9A7550" stroke-width="2" stroke-linecap="round"/>
          <path d="m86 77 5 26h18l5-26" fill="url(#seismo-medal-cup)" stroke="#A4B199" stroke-width="1.5"/>
          <ellipse cx="100" cy="77" rx="14" ry="4" fill="#EEE9D5" stroke="#A4B199" stroke-width="1.5"/>
          <g fill="#B5AC90"><circle cx="93" cy="77" r="1.5"/><circle cx="100" cy="75" r="1.4"/><circle cx="106" cy="78" r="1.5"/><circle cx="99" cy="79" r="1.2"/><circle cx="110" cy="76" r="1.1"/></g>
          <path d="M100 102v8" stroke="#315F50" stroke-width="3"/><path d="m98.5 110 1.5 4 1.5-4" fill="#BD945A"/>
          <path d="M59 49h82v8H59z" fill="#CEA868"/>
          <path d="M59 49v68m82-68v68" stroke="#C09D60" stroke-width="5"/>
          <path d="m119 35 5 5 10-12" stroke="#557E52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 id="seismo-achievement-title">地震仪制作小能手</h2>
      <p class="seismo-achievement-description">你亲手组装并调好了简易地震仪。<br />现在，让它记录你制造的震动吧！</p>
      <ul class="seismo-achievement-skills" aria-label="已达成的制作本领">
        <li><span aria-hidden="true">✓</span>装好悬挂摆锤</li>
        <li><span aria-hidden="true">✓</span>安装记录笔和纸带</li>
        <li><span aria-hidden="true">✓</span>笔尖轻触纸面</li>
      </ul>
      <button class="seismo-achievement-finish" type="button" @click="startExperiment">开始震动实验 <span aria-hidden="true">→</span></button>
      <p class="seismo-achievement-footnote">轻轻摇动底座，看看你的装置会留下什么笔迹。</p>
    </section>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElDialog } from 'element-plus'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/icon/style/css'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; start: [] }>()
const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const celebrating = ref(false)
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
const colors = ['#E8B94D', '#6E9D75', '#92B8AB', '#C58E72', '#B8C997']
const confetti = Array.from({ length: 38 }, (_, id) => ({
  id,
  ribbon: id % 4 === 0,
  style: {
    '--piece-left': `${5 + (id * 29 % 91)}%`,
    '--piece-color': colors[id % colors.length],
    '--piece-delay': `${(id * 73 % 780) / 1000}s`,
    '--piece-duration': `${2.1 + (id % 7) * .13}s`,
    '--piece-drift': `${(id % 2 ? 1 : -1) * (12 + id * 13 % 64)}px`,
    '--piece-spin': `${(id % 2 ? 1 : -1) * (230 + id * 41 % 360)}deg`,
  },
}))
function stopCelebration() {
  if (celebrationTimer) clearTimeout(celebrationTimer)
  celebrationTimer = undefined
  celebrating.value = false
}
function startExperiment() {
  open.value = false
  emit('start')
}
watch(() => props.modelValue, visible => {
  stopCelebration()
  if (!visible || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
  celebrating.value = true
  celebrationTimer = setTimeout(stopCelebration, 4200)
}, { immediate: true })
onBeforeUnmount(stopCelebration)
</script>

<style scoped>
:global(.seismo-achievement-dialog.el-dialog) { padding: 24px 28px 22px; border: 1px solid #d9e1cf; border-radius: 26px; background: radial-gradient(ellipse at 50% 21%, #fff6d9 0, #fffdf3 35%, #fffdf7 70%); box-shadow: 0 28px 90px #304c3540; overflow: hidden; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
:global(.seismo-achievement-dialog.el-dialog.is-align-center) { margin: auto; }
:global(.seismo-achievement-dialog .el-dialog__header) { padding: 0 20px 0 0; text-align: center; }
:global(.seismo-achievement-dialog .el-dialog__headerbtn) { top: 10px; right: 10px; }
:global(.seismo-achievement-dialog .el-dialog__body) { padding: 0; }
.seismo-achievement-eyebrow { display: block; padding-left: 20px; color: #5e7e64; font-size: 13px; letter-spacing: 2px; font-weight: 600; }
.seismo-achievement-content { position: relative; text-align: center; color: #315f50; }
.seismo-achievement-medal { position: relative; width: 180px; height: 165px; margin: 8px auto 12px; }
.seismo-achievement-medal svg { display: block; width: 100%; height: 100%; filter: drop-shadow(0 7px 9px #b99a3b20); }
.seismo-achievement-spark { position: absolute; color: #d8ad42; font-size: 23px; line-height: 1; }
.spark-one { top: 28px; left: -13px; transform: rotate(-10deg); }
.spark-two { top: 12px; right: -10px; font-size: 31px; }
.spark-three { top: 102px; right: -17px; color: #79986a; font-size: 16px; }
.seismo-achievement-content h2 { margin: 0; color: #315f50; font-size: 27px; line-height: 1.4; font-weight: 800; letter-spacing: 1px; }
.seismo-achievement-description { margin: 10px 0 16px; color: #778570; font-size: 13px; line-height: 1.8; }
.seismo-achievement-skills { display: flex; flex-wrap: wrap; gap: 9px 15px; justify-content: center; list-style: none; margin: 0 0 19px; padding: 13px 6px; border-top: 1px solid #e0e7d5; border-bottom: 1px solid #e0e7d5; color: #6b8062; font-size: 11px; }
.seismo-achievement-skills li { display: inline-flex; gap: 5px; align-items: center; }
.seismo-achievement-skills li span { color: #6f985b; font-weight: 700; }
.seismo-achievement-finish { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; max-width: 290px; min-height: 46px; margin: 0 auto; padding: 11px 20px; border: 0; border-radius: 13px; background: #315f50; color: #fffdf7; font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; box-shadow: 0 5px 12px #315f5024; transition: background .15s, box-shadow .15s; }
.seismo-achievement-finish:hover { background: #264f42; box-shadow: 0 6px 16px #315f5030; }
.seismo-achievement-finish:focus-visible { outline: 3px solid #d1ac4f; outline-offset: 4px; }
.seismo-achievement-finish span { font-size: 19px; }
.seismo-achievement-footnote { margin: 11px 0 0; color: #8b9980; font-size: 11px; line-height: 1.6; }
.seismo-achievement-particles { position: absolute; inset: -34px -28px 0; pointer-events: none; overflow: hidden; z-index: 2; }
.seismo-achievement-confetti { position: absolute; top: -18px; left: var(--piece-left); width: 7px; height: 12px; border-radius: 2px; background: var(--piece-color); opacity: 0; animation: seismo-achievement-confetti var(--piece-duration) var(--piece-delay) ease-out both; }
.seismo-achievement-confetti.ribbon { width: 5px; height: 27px; border-radius: 4px 1px 4px 1px; }
.seismo-achievement-firework { position: absolute; width: 1px; height: 1px; color: #d8b44d; }
.burst-1 { top: 57px; left: 19%; --burst-delay: .12s; }
.burst-2 { top: 90px; left: 81%; --burst-delay: .62s; color: #79986a; }
.burst-3 { top: 148px; left: 11%; --burst-delay: 1.13s; color: #92b8ab; }
.seismo-achievement-firework i { position: absolute; width: 3px; height: 12px; border-radius: 3px; background: currentColor; transform-origin: 50% 0; opacity: 0; animation: seismo-achievement-burst 1.2s var(--burst-delay) ease-out both; }
@keyframes seismo-achievement-confetti { 0% { opacity: 0; transform: translate3d(0, -12px, 0) rotate(0deg); } 8% { opacity: .95; } 78% { opacity: .8; } 100% { opacity: 0; transform: translate3d(var(--piece-drift), 500px, 0) rotate(var(--piece-spin)); } }
@keyframes seismo-achievement-burst { 0% { opacity: 0; transform: rotate(var(--ray)) translateY(0) scaleY(.3); } 20% { opacity: .8; } 100% { opacity: 0; transform: rotate(var(--ray)) translateY(-42px) scaleY(.45); } }
@media (max-width: 520px) {
  :global(.seismo-achievement-dialog.el-dialog) { padding: 22px 20px 20px; border-radius: 21px; }
  .seismo-achievement-medal { width: 155px; height: 143px; }
  .seismo-achievement-content h2 { font-size: 24px; letter-spacing: 0; }
  .seismo-achievement-description { font-size: 12px; }
  .seismo-achievement-skills { gap: 8px 13px; padding: 12px 3px; }
  .seismo-achievement-particles { inset-inline: -20px; }
}
@media (prefers-reduced-motion: reduce) { .seismo-achievement-particles { display: none; } .seismo-achievement-finish { transition: none; } }
</style>
