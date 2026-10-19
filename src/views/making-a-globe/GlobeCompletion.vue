<template>
  <el-dialog v-model="open" class="globe-achievement-dialog" width="min(520px, calc(100vw - 32px))" align-center append-to-body :close-on-click-modal="false" @closed="stopCelebration">
    <template #header="{ titleId }"><span :id="titleId" class="achievement-eyebrow">恭喜你，完成制作！</span></template>
    <section class="achievement-content" aria-labelledby="globe-achievement-title">
      <div v-if="celebrating" class="celebration-particles" aria-hidden="true">
        <i v-for="piece in confetti" :key="piece.id" class="confetti-piece" :class="{ ribbon: piece.ribbon }" :style="piece.style"></i>
        <span v-for="burst in 3" :key="`burst-${burst}`" class="firework" :class="`firework-${burst}`"><i v-for="ray in 8" :key="ray" :style="{ '--ray': `${ray * 45}deg` }"></i></span>
      </div>
      <div class="achievement-medal" aria-hidden="true">
        <span class="medal-spark spark-one">✦</span><span class="medal-spark spark-two">✧</span><span class="medal-spark spark-three">✦</span>
        <svg viewBox="0 0 200 184" fill="none">
          <defs><linearGradient id="achievement-medal-gold" x1="44" y1="10" x2="154" y2="156" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE9A5"/><stop offset=".5" stop-color="#E7B84B"/><stop offset="1" stop-color="#C78A25"/></linearGradient><radialGradient id="achievement-globe-sea" cx="0" cy="0" r="1" gradientTransform="translate(82 64) rotate(54) scale(86)" gradientUnits="userSpaceOnUse"><stop stop-color="#75DDD7"/><stop offset="1" stop-color="#157C83"/></radialGradient></defs>
          <path d="M65 114 51 170 79 161 96 179 108 126" fill="#2C9D91"/><path d="m105 123 17 56 15-18 28 8-19-57" fill="#23897F"/>
          <circle cx="100" cy="82" r="66" fill="url(#achievement-medal-gold)"/><circle cx="100" cy="82" r="58" fill="#FFF8DE" stroke="#F6D779" stroke-width="2"/>
          <g transform="rotate(23.4333 100 82)">
            <path d="M100 32a50 50 0 0 1 0 100" stroke="#C59637" stroke-width="5" stroke-linecap="round"/>
            <path d="M100 32v8m0 84v8" stroke="#8B6C31" stroke-width="4" stroke-linecap="round"/>
            <circle cx="100" cy="82" r="43" fill="url(#achievement-globe-sea)"/>
            <path d="m73 55 10-8 12-2 4 9-9 7-4 10-13-1-6-7zm36-11 15 7 10 13 5 14-11 1-8-8-7 4-11-11 4-10zm-12 39 9 2 8 10-4 13-8 12-6-6 1-14-7-8zm27 20 10-4 5 8-6 8-11-1z" fill="#C5DC97"/>
            <ellipse cx="100" cy="82" rx="23" ry="43" stroke="#E3FFED" stroke-opacity=".68" stroke-width="1.2"/>
            <path d="M60 66c20 12 60 12 80 0M59 97c21-10 61-10 82 0" stroke="#E3FFED" stroke-opacity=".68" stroke-width="1.2"/>
            <path d="M57 82c23 12 63 12 86 0" stroke="#FFF2C1" stroke-width="2.8"/>
          </g>
          <path d="M91 131v8m18-8v8M83 141h34" stroke="#C59637" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 id="globe-achievement-title">地球仪制作小能手</h2>
      <p class="achievement-description">从一颗小球到一件作品，<br />每一步动手，都藏着你的发现。</p>
      <ul class="achievement-skills" aria-label="已达成的制作本领">
        <li><span aria-hidden="true">✓</span>亲手描出关键线</li>
        <li><span aria-hidden="true">✓</span>调准倾角 <b>23°26′</b></li>
        <li><span aria-hidden="true">✓</span>完成地球仪组装</li>
      </ul>
      <button class="achievement-finish" type="button" @click="open = false">欣赏我的作品 <span aria-hidden="true">→</span></button>
      <p class="achievement-footnote">转一转你的地球仪，继续探索世界吧！</p>
    </section>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElDialog } from 'element-plus'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const celebrating = ref(false)
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
const colors = ['#E8B94D', '#38B8A9', '#72C7EB', '#E98685', '#B1D7A1']
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
watch(() => props.modelValue, visible => {
  stopCelebration()
  if (!visible || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
  celebrating.value = true
  celebrationTimer = setTimeout(stopCelebration, 4200)
}, { immediate: true })
onBeforeUnmount(stopCelebration)
</script>

<style scoped>
:global(.globe-achievement-dialog.el-dialog) { padding: 26px 28px 24px; border: 1px solid #dceee7; border-radius: 26px; background: radial-gradient(ellipse at 50% 21%, #fffbeb 0, #fffef9 32%, #fff 65%); box-shadow: 0 28px 90px #103f4740; overflow: hidden; }
:global(.globe-achievement-dialog .el-dialog__header) { padding: 0 20px 0 0; text-align: center; }
:global(.globe-achievement-dialog .el-dialog__headerbtn) { top: 10px; right: 10px; }
:global(.globe-achievement-dialog .el-dialog__body) { padding: 0; }
.achievement-eyebrow { display: block; padding-left: 20px; color: #46786c; font-size: 13px; letter-spacing: 2px; font-weight: 600; }
.achievement-content { position: relative; text-align: center; color: #214e48; }
.achievement-medal { position: relative; width: 204px; height: 185px; margin: 10px auto 16px; }
.achievement-medal svg { display: block; width: 100%; height: 100%; filter: drop-shadow(0 7px 9px #b99a3b20); }
.medal-spark { position: absolute; color: #d8ad42; font-size: 23px; line-height: 1; }
.spark-one { top: 32px; left: -13px; transform: rotate(-10deg); }
.spark-two { top: 12px; right: -10px; font-size: 33px; }
.spark-three { top: 112px; right: -17px; color: #48aa9e; font-size: 16px; }
.achievement-content h2 { margin: 0; color: #23675c; font-size: 28px; line-height: 1.4; font-weight: 800; letter-spacing: 1px; }
.achievement-description { margin: 12px 0 19px; color: #69837e; font-size: 14px; line-height: 1.8; }
.achievement-skills { display: flex; flex-wrap: wrap; gap: 10px 16px; justify-content: center; list-style: none; margin: 0 0 23px; padding: 15px 10px; border-top: 1px solid #e5efdf; border-bottom: 1px solid #e5efdf; color: #507568; font-size: 12px; }
.achievement-skills li { display: inline-flex; gap: 5px; align-items: center; }
.achievement-skills li span { color: #3a9b7b; font-weight: 700; }
.achievement-skills b { font-weight: 650; }
.achievement-finish { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; max-width: 290px; min-height: 46px; margin: 0 auto; padding: 11px 20px; border: 0; border-radius: 13px; background: #288d7b; color: #fff; font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; box-shadow: 0 5px 12px #288d7b24; transition: background .15s, box-shadow .15s; }
.achievement-finish:hover { background: #207969; box-shadow: 0 6px 16px #288d7b30; }
.achievement-finish:focus-visible { outline: 3px solid #d1ac4f; outline-offset: 4px; }
.achievement-finish span { font-size: 19px; }
.achievement-footnote { margin: 13px 0 0; color: #8a9b93; font-size: 11px; line-height: 1.6; }
.celebration-particles { position: absolute; inset: -36px -28px 0; pointer-events: none; overflow: hidden; z-index: 2; }
.confetti-piece { position: absolute; top: -18px; left: var(--piece-left); width: 7px; height: 12px; border-radius: 2px; background: var(--piece-color); opacity: 0; animation: achievement-confetti var(--piece-duration) var(--piece-delay) ease-out both; }
.confetti-piece.ribbon { width: 5px; height: 27px; border-radius: 4px 1px 4px 1px; }
.firework { position: absolute; width: 1px; height: 1px; color: #d8b44d; }
.firework-1 { top: 64px; left: 19%; --burst-delay: .12s; }
.firework-2 { top: 101px; left: 81%; --burst-delay: .62s; color: #50b5a6; }
.firework-3 { top: 171px; left: 11%; --burst-delay: 1.13s; color: #81bdd4; }
.firework i { position: absolute; width: 3px; height: 12px; border-radius: 3px; background: currentColor; transform-origin: 50% 0; opacity: 0; animation: achievement-burst 1.2s var(--burst-delay) ease-out both; }
@keyframes achievement-confetti { 0% { opacity: 0; transform: translate3d(0, -12px, 0) rotate(0deg); } 8% { opacity: .95; } 78% { opacity: .8; } 100% { opacity: 0; transform: translate3d(var(--piece-drift), 520px, 0) rotate(var(--piece-spin)); } }
@keyframes achievement-burst { 0% { opacity: 0; transform: rotate(var(--ray)) translateY(0) scaleY(.3); } 20% { opacity: .8; } 100% { opacity: 0; transform: rotate(var(--ray)) translateY(-42px) scaleY(.45); } }
@media (max-width: 520px) {
  :global(.globe-achievement-dialog.el-dialog) { padding: 23px 20px 22px; border-radius: 21px; }
  .achievement-medal { width: 175px; height: 161px; margin-top: 12px; }
  .achievement-content h2 { font-size: 24px; letter-spacing: 0; }
  .achievement-description { font-size: 13px; }
  .achievement-skills { gap: 9px 14px; padding: 13px 4px; }
  .celebration-particles { inset-inline: -20px; }
}
@media (prefers-reduced-motion: reduce) { .celebration-particles { display: none; } .achievement-finish { transition: none; } }
</style>
