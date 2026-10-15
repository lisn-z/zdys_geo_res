<template>
  <section class="mission-success" aria-labelledby="mission-success-title">
    <div class="mission-success__content">
      <header class="mission-success__hero">
        <div class="mission-success__emblem" aria-hidden="true">
          <svg viewBox="0 0 400 176" fill="none">
            <ellipse class="mission-success__orbit" cx="200" cy="91" rx="143" ry="49" transform="rotate(-17 200 91)" />
            <ellipse class="mission-success__orbit mission-success__orbit--fine" cx="200" cy="91" rx="112" ry="65" transform="rotate(24 200 91)" />
            <path class="mission-success__cloud" d="M79 146h77m-91-10h43m132 7h69m-33-13h52M105 153c0-9 7-16 16-16 2-12 19-17 27-7 11-3 20 4 20 13m66 4c0-8 7-14 14-14 3-12 19-15 26-4 10-1 16 5 16 12" />
            <path class="mission-success__trail" pathLength="1" d="M106 145C116 123 141 122 161 119S209 112 219 86 228 48 259 29" />
            <circle class="mission-success__node mission-success__node--one" cx="106" cy="145" r="4" />
            <circle class="mission-success__node mission-success__node--two" cx="161" cy="119" r="4" />
            <circle class="mission-success__node mission-success__node--three" cx="259" cy="29" r="4" />
            <circle class="mission-success__halo" cx="259" cy="29" r="10" />
            <circle class="mission-success__star" cx="298" cy="69" r="2" />
            <path class="mission-success__star" d="M118 55v8m-4-4h8m152 40v10m-5-5h10" />
            <g class="mission-success__rocket" transform="translate(209 80) rotate(22)">
              <circle class="mission-success__badge" r="35" />
              <path d="M0-25C-10-16-12-3-9 12H9C12-3 10-16 0-25Z" />
              <circle cx="0" cy="-5" r="4.5" />
              <path d="m-10 2-8 8v12l10-6m18-14 8 8v12L8 16M-6 12v5H6v-5M-3 22l3 7 3-7" />
            </g>
          </svg>
        </div>
        <p class="mission-success__eyebrow"><span />挑战达成 · 穿云飞行</p>
        <h1 id="mission-success-title">云海之上，<br /><span>探索继续。</span></h1>
        <p class="mission-success__intro">从点火到穿云，<span>你完成了一次完整的飞行实验。</span></p>
      </header>

      <ol class="mission-success__milestones" aria-label="已完成的飞行阶段">
        <li v-for="(step, index) in milestones" :key="step.title" :style="{ '--step-delay': `${.45 + index * .16}s` }">
          <span class="mission-success__step-mark" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m5 10 3.2 3.2L15 6.5" /></svg></span>
          <div><strong>{{ step.title }}</strong><span>{{ step.note }}</span></div>
        </li>
      </ol>

      <div class="mission-success__record">
        <dl aria-label="本次飞行记录">
          <div><dt>飞行用时</dt><dd>{{ flightDuration }}<span>秒</span></dd></div>
          <div><dt>示意高度</dt><dd>{{ flightAltitude }}<span>米</span></dd></div>
        </dl>
        <p>飞行实验记录<span> · </span>高度为模拟示意</p>
      </div>

      <div class="mission-success__discovery">
        <p>持续推力，让火箭克服重力、向上加速。</p>
        <span>下一次，试着观察：<br class="mission-success__mobile-break" />松开推进后，火箭会立刻停止上升吗？</span>
      </div>

      <footer class="mission-success__actions">
        <button class="mission-success__button mission-success__primary" type="button" @click="emit('retry')">
          再做一次飞行实验<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" /></svg>
        </button>
        <button class="mission-success__button mission-success__secondary" type="button" @click="emit('return-to-film')">返回探索之旅<span aria-hidden="true">↗</span></button>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ duration: number; altitude: number }>();
const emit = defineEmits<{ retry: []; 'return-to-film': [] }>();
const milestones = [
  { title: '点火', note: '推力建立' },
  { title: '离地', note: '向上加速' },
  { title: '穿云', note: '视野打开' },
];
const flightDuration = computed(() => (Number.isFinite(props.duration) ? Math.max(0, props.duration) : 0).toFixed(1));
const flightAltitude = computed(() => Math.round(Number.isFinite(props.altitude) ? Math.max(0, props.altitude) : 0).toLocaleString('zh-CN'));
</script>

<style>
.mission-success {
  --mission-ink: #183a3b;
  --mission-teal: #317d78;
  --mission-muted: #6e8586;
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  box-sizing: border-box;
  overflow: auto;
  overscroll-behavior: contain;
  padding: max(100px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  container: mission-result / size;
  color: var(--mission-ink);
  background: transparent;
  pointer-events: auto;
  scrollbar-width: thin;
  scrollbar-color: #bed2ce transparent;
  -webkit-overflow-scrolling: touch;
}
.mission-success *, .mission-success *::before, .mission-success *::after { box-sizing: border-box; }
.mission-success .mission-success__content {
  --result-columns: minmax(0, 1fr);
  --result-areas: "hero" "milestones" "record" "discovery" "actions";
  --result-width: 680px;
  --result-gap: 24px;
  --result-emblem-height: 130px;
  --result-title-size: clamp(40px, 4.5vw, 54px);
  --result-action-direction: row;
  display: grid;
  grid-template-columns: var(--result-columns);
  grid-template-areas: var(--result-areas);
  gap: var(--result-gap) clamp(28px, 5vw, 64px);
  align-items: center;
  width: min(100%, var(--result-width));
  min-width: 0;
  margin: auto;
  text-align: center;
}
.mission-success .mission-success__hero { grid-area: hero; min-width: 0; }
.mission-success .mission-success__milestones { grid-area: milestones; }
.mission-success .mission-success__record { grid-area: record; }
.mission-success .mission-success__discovery { grid-area: discovery; }
.mission-success .mission-success__actions { grid-area: actions; }
.mission-success .mission-success__hero { animation: mission-success-appear .8s both; }
.mission-success .mission-success__emblem { width: 340px; max-width: 100%; height: var(--result-emblem-height); margin: 0 auto 14px; }
.mission-success .mission-success__emblem > svg { display: block; width: 100%; height: 100%; overflow: visible; }
.mission-success .mission-success__orbit { stroke: #d0e4df; stroke-width: 1; }
.mission-success .mission-success__orbit--fine { stroke: #e1eeeb; stroke-dasharray: 2 6; }
.mission-success .mission-success__cloud { stroke: #dce9e6; stroke-width: 1.2; stroke-linecap: round; }
.mission-success .mission-success__trail { stroke: #66a69b; stroke-width: 1.5; stroke-dasharray: 1; stroke-dashoffset: 1; animation: mission-success-draw 1.4s .15s ease-out forwards; }
.mission-success .mission-success__node { fill: #edf7f3; stroke: #579a8f; stroke-width: 1.5; animation: mission-success-node .5s both; }
.mission-success .mission-success__node--one { animation-delay: .35s; }
.mission-success .mission-success__node--two { animation-delay: .7s; }
.mission-success .mission-success__node--three { animation-delay: 1.1s; }
.mission-success .mission-success__halo { stroke: #a5cdc2; stroke-width: 1; opacity: .7; animation: mission-success-glimmer 3.5s 1.4s ease-in-out infinite; }
.mission-success .mission-success__star { stroke: #a7c6bf; stroke-width: 1; stroke-linecap: round; }
.mission-success .mission-success__rocket { stroke: #337a73; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.mission-success .mission-success__badge { fill: #fff; stroke: #e7f0ed; }
.mission-success .mission-success__eyebrow { display: flex; align-items: center; justify-content: center; gap: 9px; margin: 0 0 17px; color: var(--mission-teal); font-size: 12px; font-weight: 500; letter-spacing: .18em; }
.mission-success .mission-success__eyebrow > span { width: 5px; height: 5px; border-radius: 50%; background: #79ad9b; box-shadow: 0 0 0 4px #e8f3ee; }
.mission-success h1 { margin: 0; color: var(--mission-ink); font-size: var(--result-title-size); font-weight: 500; line-height: 1.23; letter-spacing: .025em; }
.mission-success h1 > span { color: #38857c; }
.mission-success .mission-success__intro { margin: 22px 0 0; color: var(--mission-muted); font-size: 14px; font-weight: 400; line-height: 1.85; letter-spacing: .03em; }
.mission-success .mission-success__milestones { display: grid; grid-template-columns: repeat(3, 1fr); width: min(100%, 470px); margin: 0 auto; padding: 0; list-style: none; }
.mission-success .mission-success__milestones > li { position: relative; display: flex; align-items: center; justify-content: center; gap: 11px; animation: mission-success-appear .55s var(--step-delay, .45s) both; }
.mission-success .mission-success__milestones > li + li::before { content: ''; position: absolute; top: 50%; left: -8px; width: 16px; height: 1px; background: #d9e8e3; }
.mission-success .mission-success__step-mark { display: grid; place-items: center; flex: 0 0 25px; height: 25px; border: 1px solid #c0d8cf; border-radius: 50%; background: #f7fbf8; }
.mission-success .mission-success__step-mark > svg { width: 15px; height: 15px; stroke: #5b9986; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.mission-success .mission-success__milestones li > div { text-align: left; }
.mission-success .mission-success__milestones strong { display: block; color: #3a5f59; font-size: 14px; font-weight: 500; letter-spacing: .08em; }
.mission-success .mission-success__milestones li div > span { display: block; margin-top: 5px; color: #7e9490; font-size: 11px; letter-spacing: .04em; }
.mission-success .mission-success__record { width: min(100%, 470px); margin: 0 auto; padding-top: 21px; border-top: 1px solid #e3ece8; animation: mission-success-appear .65s .7s both; }
.mission-success .mission-success__record > dl { display: flex; align-items: center; justify-content: center; gap: 27px; margin: 0; }
.mission-success .mission-success__record dl > div { display: flex; align-items: baseline; gap: 11px; }
.mission-success .mission-success__record dl > div + div { padding-left: 27px; border-left: 1px solid #dae6e0; }
.mission-success .mission-success__record dt { color: #7a918c; font-size: 11px; letter-spacing: .04em; }
.mission-success .mission-success__record dd { margin: 0; color: #3d6660; font-size: 23px; font-weight: 400; font-variant-numeric: tabular-nums; letter-spacing: -.025em; }
.mission-success .mission-success__record dd > span { margin-left: 5px; color: #8aa19a; font-size: 11px; }
.mission-success .mission-success__record > p { margin: 10px 0 0; color: #92a49e; font-size: 10px; letter-spacing: .075em; }
.mission-success .mission-success__record > p > span { padding: 0 5px; }
.mission-success .mission-success__discovery { margin: 0; animation: mission-success-appear .65s .9s both; }
.mission-success .mission-success__discovery > p { margin: 0; color: #4b7168; font-size: 14px; line-height: 1.8; letter-spacing: .02em; }
.mission-success .mission-success__discovery > span { display: block; margin-top: 6px; color: #81968f; font-size: 12px; line-height: 1.9; }
.mission-success .mission-success__mobile-break { display: none; }
.mission-success .mission-success__actions { display: flex; align-items: center; justify-content: center; gap: 12px 22px; flex-direction: var(--result-action-direction); flex-wrap: wrap; margin: 0; animation: mission-success-appear .65s 1s both; }
.mission-success button.mission-success__button { display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 45px; margin: 0; padding: 0 22px; border: 1px solid transparent; border-radius: 4px; box-shadow: none; font: inherit; font-size: 13px; font-weight: 500; line-height: 1.4; letter-spacing: .035em; text-decoration: none; cursor: pointer; transition: background .2s, border-color .2s, color .2s, transform .2s; -webkit-tap-highlight-color: transparent; }
.mission-success button.mission-success__primary { color: #fff; background: #377c70; border-color: #377c70; }
.mission-success button.mission-success__primary:hover { color: #fff; background: #28695e; border-color: #28695e; transform: translateY(-1px); }
.mission-success .mission-success__primary > svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.mission-success button.mission-success__secondary { padding-inline: 5px; color: #64877b; background: transparent; border-color: transparent; }
.mission-success button.mission-success__secondary > span { color: #85a196; font-size: 16px; }
.mission-success button.mission-success__secondary:hover { color: #285e52; background: transparent; border-bottom-color: #94b3a7; }
.mission-success button.mission-success__button:focus-visible { outline: 2px solid #599a86; outline-offset: 5px; }
@keyframes mission-success-appear { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mission-success-draw { to { stroke-dashoffset: 0; } }
@keyframes mission-success-node { from { opacity: 0; } to { opacity: 1; } }
@keyframes mission-success-glimmer { 0%, 100% { opacity: .2; } 50% { opacity: .85; } }
/* Compact landscape panels put the celebration beside the flight record.
   Container queries use the actual embedded courseware area, not the device screen. */
@media (min-width: 760px) and (max-height: 880px) and (orientation: landscape) {
  .mission-success .mission-success__content {
    --result-columns: minmax(0, 1fr) minmax(0, 1fr);
    --result-areas: "hero milestones" "hero record" "hero discovery" "hero actions";
    --result-width: 1000px;
    --result-gap: 18px;
    --result-emblem-height: 120px;
    --result-title-size: 44px;
    --result-action-direction: column;
  }
}
@container mission-result (min-width: 700px) and (max-height: 760px) {
  .mission-success .mission-success__content {
    --result-columns: minmax(0, 1fr) minmax(0, 1fr);
    --result-areas: "hero milestones" "hero record" "hero discovery" "hero actions";
    --result-width: 1000px;
    --result-gap: 18px;
    --result-emblem-height: 120px;
    --result-title-size: 44px;
    --result-action-direction: column;
  }
}
@media (max-width: 759px) {
  .mission-success { padding: max(84px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); }
  .mission-success .mission-success__content { --result-gap: 20px; --result-emblem-height: 108px; --result-title-size: clamp(36px, 8vw, 46px); }
  .mission-success .mission-success__emblem { width: 280px; margin-bottom: 12px; }
  .mission-success .mission-success__eyebrow { margin-bottom: 12px; font-size: 12px; }
  .mission-success .mission-success__intro { margin-top: 16px; font-size: 13px; }
  .mission-success .mission-success__intro > span { display: block; }
  .mission-success .mission-success__milestones > li { gap: 7px; }
  .mission-success .mission-success__milestones > li + li::before { left: -3px; width: 6px; }
  .mission-success .mission-success__step-mark { flex-basis: 23px; height: 23px; }
  .mission-success .mission-success__milestones strong { font-size: 13px; }
  .mission-success .mission-success__milestones li div > span { font-size: 11px; }
  .mission-success .mission-success__record { padding-top: 16px; }
  .mission-success .mission-success__record > dl { gap: 15px; }
  .mission-success .mission-success__record dl > div { gap: 6px; }
  .mission-success .mission-success__record dl > div + div { padding-left: 15px; }
  .mission-success .mission-success__record dd { font-size: 22px; }
  .mission-success .mission-success__discovery > p { font-size: 13px; }
  .mission-success .mission-success__discovery > span { font-size: 12px; }
  .mission-success .mission-success__mobile-break { display: inline; }
  .mission-success .mission-success__actions { gap: 8px 14px; }
  .mission-success button.mission-success__button { min-height: 46px; padding-inline: 15px; font-size: 13px; gap: 9px; }
  .mission-success button.mission-success__secondary { padding-inline: 5px; }
}
@media (max-width: 759px) and (max-height: 760px) {
  .mission-success .mission-success__content { --result-gap: 15px; --result-emblem-height: 76px; --result-title-size: 36px; }
  .mission-success .mission-success__emblem { margin-bottom: 8px; }
  .mission-success .mission-success__intro { margin-top: 12px; }
}
@container mission-result (max-width: 699px) and (max-height: 650px) {
  .mission-success .mission-success__content { --result-gap: 15px; --result-emblem-height: 76px; --result-title-size: 36px; }
  .mission-success .mission-success__emblem { margin-bottom: 8px; }
  .mission-success .mission-success__intro { margin-top: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .mission-success .mission-success__hero,
  .mission-success .mission-success__trail,
  .mission-success .mission-success__node,
  .mission-success .mission-success__halo,
  .mission-success .mission-success__milestones > li,
  .mission-success .mission-success__record,
  .mission-success .mission-success__discovery,
  .mission-success .mission-success__actions { animation: none; opacity: 1; transform: none; }
  .mission-success .mission-success__trail { stroke-dashoffset: 0; }
  .mission-success button.mission-success__button { transition: none; }
}
</style>
