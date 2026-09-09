<template>
  <div class="heating-2d" :class="{ 'final-overview': progress >= 99.9 }" aria-label="大气受热过程二维示意图">
    <svg viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid meet" role="img"
      aria-labelledby="heating2d-title heating2d-desc">
      <title id="heating2d-title">大气受热过程二维分阶段示意</title>
      <desc id="heating2d-desc">通过太阳、分层大气、海洋、陆地和动态能量箭头演示太阳暖大地、大地暖大气和大气还大地。</desc>
      <defs>
        <linearGradient id="sky2d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#071a35" />
          <stop offset="0.58" stop-color="#164c70" />
          <stop offset="1" stop-color="#d07960" />
        </linearGradient>
        <linearGradient id="ocean2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#075c78" />
          <stop offset="1" stop-color="#1692a1" />
        </linearGradient>
        <linearGradient id="land2d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#496b41" />
          <stop offset="0.6" stop-color="#81934f" />
          <stop offset="1" stop-color="#50623d" />
        </linearGradient>
        <radialGradient id="sun2d">
          <stop offset="0" stop-color="#fff8c3" />
          <stop offset="0.34" stop-color="#ffd85b" />
          <stop offset="1" stop-color="#ff8a25" />
        </radialGradient>
        <filter id="softGlow2d" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="arrowSolar2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#ffd45c" /></marker>
        <marker id="arrowCool2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#72dbff" /></marker>
        <marker id="arrowScatter2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="7" markerHeight="7"
          orient="auto"><path d="M1 1L13 7L1 13Z" fill="#8be7ff" /></marker>
        <marker id="arrowViolet2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#b9a2ff" /></marker>
        <marker id="arrowWarm2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#ff7954" /></marker>
        <marker id="arrowHeat2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#ff665d" /></marker>
        <marker id="arrowLatent2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#5ce7df" /></marker>
        <marker id="arrowAir2d" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10"
          orient="auto-start-reverse"><path d="M1 1L13 7L1 13Z" fill="#ff77ba" /></marker>
      </defs>

      <rect width="1200" height="680" fill="url(#sky2d)" />
      <g class="phase-zones" aria-hidden="true">
        <rect x="8" y="82" width="384" height="516" rx="24" class="phase-zone phase-zone-solar" />
        <rect x="408" y="82" width="384" height="516" rx="24" class="phase-zone phase-zone-ground" />
        <rect x="808" y="82" width="384" height="516" rx="24" class="phase-zone phase-zone-air" />
        <path d="M400 106V586M800 106V586" />
      </g>
      <circle cx="160" cy="125" r="76" fill="#ffc64a" opacity=".08" class="sun-aura" />
      <g class="sun-symbol" transform="translate(160 125)">
        <g class="sun-rays" stroke="#ffd45c" stroke-width="6" stroke-linecap="round">
          <path d="M0-60V-82M0 60V82M-60 0H-82M60 0H82M-43-43L-59-59M43 43L59 59M43-43L59-59M-43 43L-59 59" />
        </g>
        <circle r="49" fill="url(#sun2d)" stroke="#ffdc72" stroke-width="4" />
        <circle cx="-15" cy="-17" r="11" fill="#fff" opacity=".64" />
      </g>

      <g class="atmosphere-bands" fill="none" stroke-linecap="round">
        <path d="M-70 620Q600 85 1270 620" stroke="#55d9f2" stroke-width="72" opacity=".09" />
        <path d="M-72 618Q600 5 1272 618" stroke="#7898ff" stroke-width="58" opacity=".075" />
        <path d="M-74 616Q600-75 1274 616" stroke="#b37cf4" stroke-width="48" opacity=".06" />
        <path d="M-30 615Q600 150 1230 615" stroke="#72e5ef" stroke-width="2" opacity=".3" />
        <path d="M-30 615Q600 70 1230 615" stroke="#91a9ff" stroke-width="2" opacity=".25" />
        <path d="M-30 615Q600-10 1230 615" stroke="#c39cff" stroke-width="2" opacity=".22" />
      </g>

      <g class="layer-key" transform="translate(38 330)">
        <rect width="112" height="92" rx="15" fill="#071a2c" opacity=".74" stroke="#8bddeb" stroke-opacity=".24" />
        <circle cx="17" cy="22" r="4" fill="#55d9f2" /><text x="30" y="27">对流层</text>
        <circle cx="17" cy="47" r="4" fill="#7898ff" /><text x="30" y="52">平流层</text>
        <circle cx="17" cy="72" r="4" fill="#b37cf4" /><text x="30" y="77">高层大气</text>
      </g>

      <g class="cloud" transform="translate(342 278)">
        <ellipse cx="0" cy="18" rx="66" ry="22" fill="#dfeef5" opacity=".9" />
        <circle cx="-34" cy="3" r="28" fill="#edf7fb" /><circle cx="2" cy="-10" r="40" fill="#f4fbff" />
        <circle cx="41" cy="5" r="31" fill="#e7f3f8" />
      </g>
      <g class="cloud cloud-small" transform="translate(714 245)">
        <ellipse cx="0" cy="14" rx="51" ry="18" fill="#dfeef5" opacity=".78" />
        <circle cx="-25" cy="0" r="21" fill="#eef8fb" /><circle cx="5" cy="-8" r="29" fill="#f6fcff" />
        <circle cx="31" cy="3" r="22" fill="#e5f1f6" />
      </g>
      <g class="cloud cloud-third" transform="translate(980 250)">
        <ellipse cx="0" cy="13" rx="47" ry="17" fill="#dfeef5" opacity=".72" />
        <circle cx="-23" cy="0" r="19" fill="#eef8fb" /><circle cx="5" cy="-8" r="27" fill="#f6fcff" />
        <circle cx="29" cy="3" r="20" fill="#e5f1f6" />
      </g>

      <path d="M520 558Q575 540 635 558Q735 500 828 536Q932 564 1200 548V680H492C505 642 518 600 520 558Z" fill="url(#land2d)" />
      <path d="M0 553Q182 530 360 553Q438 565 520 558C518 600 505 642 492 680H0Z" fill="url(#ocean2d)" />
      <path d="M520 558Q575 540 635 558Q735 500 828 536Q932 564 1200 548" fill="none" stroke="#c7d47b" stroke-width="6" />
      <path d="M0 553Q182 530 360 553Q438 565 520 558" fill="none" stroke="#7ce8ef" stroke-width="5" opacity=".75" />
      <g class="terrain-detail" fill="#24432f">
        <path d="M560 553l12-35 12 35zM608 552l15-45 15 45zM756 523l13-40 13 40zM812 532l12-35 12 35zM900 555l14-42 14 42z" />
      </g>
      <g class="surface-labels">
        <text x="145" y="540">海洋</text>
        <text x="1050" y="540">陆地</text>
      </g>

      <g class="flow" :class="flowClass(0)">
        <path class="flow-halo solar" d="M190 166C255 240 312 326 384 478" />
        <path class="flow-line solar" d="M190 166C255 240 312 326 384 478" marker-end="url(#arrowSolar2d)" />
        <g class="svg-label" transform="translate(230 225)"><rect width="142" height="48" rx="12" /><text x="71" y="21">太阳短波</text><text class="callout-sub" x="71" y="38">进入地球系统</text></g>
      </g>

      <g class="flow" :class="flowClass(11)">
        <path class="flow-halo violet" d="M208 170C280 198 405 205 490 228" />
        <path class="flow-line violet" d="M208 170C280 198 405 205 490 228" marker-end="url(#arrowViolet2d)" />
        <g class="svg-label" transform="translate(420 168)"><rect width="128" height="48" rx="12" /><text x="64" y="21">臭氧吸收</text><text class="callout-sub" x="64" y="38">截获部分紫外线</text></g>
      </g>
      <g class="flow" :class="flowClass(14)">
        <path class="flow-halo cool" d="M315 252Q235 205 205 145" />
        <path class="flow-line cool" d="M315 252Q235 205 205 145" marker-end="url(#arrowCool2d)" />
        <g class="svg-label" transform="translate(250 171)"><rect width="128" height="48" rx="12" /><text x="64" y="21">云层反射</text><text class="callout-sub" x="64" y="38">短波返回太空</text></g>
      </g>
      <g class="flow" :class="flowClass(17)">
        <path class="flow-halo solar scatter-incoming-halo" d="M215 174Q258 229 300 300" />
        <path class="flow-line solar scatter-incoming" d="M215 174Q258 229 300 300" />
        <circle class="scatter-ring" cx="300" cy="300" r="15" />
        <circle class="scatter-core" cx="300" cy="300" r="7" />
        <g class="scatter-rays">
          <path class="scatter-halo" d="M300 300Q270 247 242 205" />
          <path class="scatter-halo" d="M300 300Q247 253 202 230" />
          <path class="scatter-halo" d="M300 300Q238 289 178 292" />
          <path class="scatter-halo" d="M300 300Q246 329 198 351" />
          <path class="scatter-halo" d="M300 300Q278 351 254 390" />
          <path class="flow-line cool scatter-ray ray-a" d="M300 300Q270 247 242 205" marker-end="url(#arrowScatter2d)" />
          <path class="flow-line cool scatter-ray ray-b" d="M300 300Q247 253 202 230" marker-end="url(#arrowScatter2d)" />
          <path class="flow-line cool scatter-ray ray-c" d="M300 300Q238 289 178 292" marker-end="url(#arrowScatter2d)" />
          <path class="flow-line cool scatter-ray ray-d" d="M300 300Q246 329 198 351" marker-end="url(#arrowScatter2d)" />
          <path class="flow-line cool scatter-ray ray-e" d="M300 300Q278 351 254 390" marker-end="url(#arrowScatter2d)" />
        </g>
        <g class="svg-label" transform="translate(328 316)"><rect width="136" height="48" rx="12" /><text x="68" y="21">分子散射</text><text class="callout-sub" x="68" y="38">一束光向多方向分散</text></g>
      </g>
      <g class="flow" :class="flowClass(20)">
        <path class="flow-halo solar" d="M224 182L340 310L458 488" />
        <path class="flow-line solar" d="M224 182L340 310L458 488" marker-end="url(#arrowSolar2d)" />
        <g class="svg-label" transform="translate(360 337)"><rect width="128" height="48" rx="12" /><text x="64" y="21">大气折射</text><text class="callout-sub" x="64" y="38">路径发生偏折</text></g>
      </g>

      <g class="flow" :class="flowClass(23)">
        <path class="flow-halo solar" d="M217 177C263 286 298 397 330 525" />
        <path class="flow-line solar" d="M217 177C263 286 298 397 330 525" marker-end="url(#arrowSolar2d)" />
        <g class="svg-label" transform="translate(220 418)"><rect width="144" height="48" rx="12" /><text x="72" y="21">海洋吸收短波</text><text class="callout-sub" x="72" y="38">转化为水体内能</text></g>
      </g>
      <g class="flow" :class="flowClass(28)">
        <path class="flow-halo solar" d="M213 175C320 262 486 376 636 526" />
        <path class="flow-line solar" d="M213 175C320 262 486 376 636 526" marker-end="url(#arrowSolar2d)" />
        <g class="svg-label" transform="translate(495 405)"><rect width="144" height="48" rx="12" /><text x="72" y="21">陆地吸收短波</text><text class="callout-sub" x="72" y="38">地表快速增温</text></g>
      </g>

      <g class="flow" :class="flowClass(34)">
        <path class="flow-halo warm" d="M648 533C630 455 627 374 620 286" />
        <path class="flow-line warm" d="M648 533C630 455 627 374 620 286" marker-end="url(#arrowWarm2d)" />
        <g class="svg-label" transform="translate(640 365)"><rect width="128" height="48" rx="12" /><text x="64" y="21">陆地长波</text><text class="callout-sub" x="64" y="38">暖地表向上放热</text></g>
      </g>
      <g class="flow" :class="flowClass(38)">
        <path class="flow-halo warm" d="M326 530C345 455 365 388 392 318" />
        <path class="flow-line warm" d="M326 530C345 455 365 388 392 318" marker-end="url(#arrowWarm2d)" />
        <g class="svg-label" transform="translate(340 382)"><rect width="128" height="48" rx="12" /><text x="64" y="21">海洋长波</text><text class="callout-sub" x="64" y="38">海面释放红外线</text></g>
      </g>
      <g class="flow" :class="flowClass(42)">
        <path class="flow-halo warm" d="M770 535C820 410 836 250 825 108" />
        <path class="flow-line warm" d="M770 535C820 410 836 250 825 108" marker-end="url(#arrowWarm2d)" />
        <g class="svg-label" transform="translate(770 252)"><rect width="152" height="48" rx="12" /><text x="76" y="21">大气窗口逸出</text><text class="callout-sub" x="76" y="38">部分长波直达太空</text></g>
      </g>

      <g class="flow" :class="flowClass(45)">
        <path class="flow-halo warm" d="M650 530C650 454 646 393 642 340" />
        <path class="flow-line warm" d="M650 530C650 454 646 393 642 340" marker-end="url(#arrowWarm2d)" />
        <g class="svg-label" transform="translate(660 354)"><rect width="158" height="48" rx="12" /><text x="79" y="21">温室气体吸收</text><text class="callout-sub" x="79" y="38">水汽、CO₂ 与云</text></g>
      </g>

      <g class="flow" :class="flowClass(56)">
        <path class="flow-halo heat" d="M664 532C620 487 704 444 659 398C620 358 692 324 658 282" />
        <path class="flow-line heat" d="M664 532C620 487 704 444 659 398C620 358 692 324 658 282" marker-end="url(#arrowHeat2d)" />
        <g class="svg-label" transform="translate(675 382)"><rect width="128" height="48" rx="12" /><text x="64" y="21">感热输送</text><text class="callout-sub" x="64" y="38">空气湍流上升</text></g>
      </g>
      <g class="flow" :class="flowClass(62)">
        <path class="flow-halo latent" d="M310 532C270 480 348 438 307 390C274 350 332 315 304 270" />
        <path class="flow-line latent" d="M310 532C270 480 348 438 307 390C274 350 332 315 304 270" marker-end="url(#arrowLatent2d)" />
        <g class="svg-label" transform="translate(322 366)"><rect width="128" height="48" rx="12" /><text x="64" y="21">潜热输送</text><text class="callout-sub" x="64" y="38">蒸发—凝结</text></g>
      </g>

      <g class="flow" :class="flowClass(68)">
        <path class="flow-halo air" d="M950 330C948 255 948 184 950 105" />
        <path class="flow-line air" d="M950 330C948 255 948 184 950 105" marker-end="url(#arrowAir2d)" />
        <g class="svg-label" transform="translate(970 176)"><rect width="144" height="48" rx="12" /><text x="72" y="21">大气向外辐射</text><text class="callout-sub" x="72" y="38">能量释放至太空</text></g>
      </g>
      <g class="flow" :class="flowClass(73)">
        <path class="flow-halo air" d="M930 325C958 392 976 455 985 525" />
        <path class="flow-line air" d="M930 325C958 392 976 455 985 525" marker-end="url(#arrowAir2d)" />
        <g class="svg-label" transform="translate(975 397)"><rect width="144" height="48" rx="12" /><text x="72" y="21">大气向下辐射</text><text class="callout-sub" x="72" y="38">长波返回地面</text></g>
      </g>

      <g class="flow" :class="flowClass(79)">
        <path class="flow-halo air" d="M900 298C785 358 570 443 350 526" />
        <path class="flow-line air" d="M900 298C785 358 570 443 350 526" marker-end="url(#arrowAir2d)" />
        <g class="svg-label" transform="translate(610 405)"><rect width="144" height="48" rx="12" /><text x="72" y="21">海洋逆辐射</text><text class="callout-sub" x="72" y="38">补偿海面热量</text></g>
      </g>
      <g class="flow" :class="flowClass(85)">
        <path class="flow-halo air" d="M900 300C980 360 1015 438 1030 526" />
        <path class="flow-line air" d="M900 300C980 360 1015 438 1030 526" marker-end="url(#arrowAir2d)" />
        <g class="svg-label" transform="translate(1015 414)"><rect width="144" height="48" rx="12" /><text x="72" y="21">陆地逆辐射</text><text class="callout-sub" x="72" y="38">减缓地表冷却</text></g>
      </g>

      <g v-if="progress >= 99.9" class="final-key" transform="translate(420 67)">
        <rect width="360" height="82" rx="15" />
        <text class="final-key-title" x="14" y="18">颜色图例</text>
        <g transform="translate(14 40)"><path class="solar" d="M0 0H20" /><text x="28" y="4">太阳短波</text></g>
        <g transform="translate(130 40)"><path class="cool" d="M0 0H20" /><text x="28" y="4">反射/散射</text></g>
        <g transform="translate(246 40)"><path class="warm" d="M0 0H20" /><text x="28" y="4">地表长波</text></g>
        <g transform="translate(14 64)"><path class="latent" d="M0 0H20" /><text x="28" y="4">感热/潜热</text></g>
        <g transform="translate(130 64)"><path class="air" d="M0 0H20" /><text x="28" y="4">向外辐射</text></g>
        <g transform="translate(246 64)"><path class="air" d="M0 0H20" /><text x="28" y="4">逆辐射</text></g>
      </g>

      <g class="phase-strip">
        <g :class="{ active: phaseActive(0) }" transform="translate(20 14)"><rect width="360" height="38" rx="12" /><text x="180" y="25">① 太阳暖大地</text></g>
        <g :class="{ active: phaseActive(1) }" transform="translate(420 14)"><rect width="360" height="38" rx="12" /><text x="180" y="25">② 大地暖大气</text></g>
        <g :class="{ active: phaseActive(2) }" transform="translate(820 14)"><rect width="360" height="38" rx="12" /><text x="180" y="25">③ 大气还大地</text></g>
      </g>

      <g class="diagram-signature" transform="translate(38 650)">
        <circle r="4" fill="#67e8f9" /><text x="13" y="5">二维能量路径图 · 当前阶段单线聚焦</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ stageIndex: number; progress: number; balancePhase: number }>()
const stageRanges = [[11, 23], [23, 34], [34, 45], [45, 56], [56, 68], [68, 79], [79, 91]] as const
const stageStarts = [[11, 14, 17, 20], [23, 28], [34, 38, 42], [45], [56, 62], [68, 73], [79, 85]] as const
const balanceFlowSets = [[14, 23, 28], [34, 38], [45], [56, 62], [68, 73], [79, 85]] as const
const coreFlowStarts = new Set([0, 14, 17, 28, 34, 45, 56, 62, 68, 85])
const isFinalOverview = () => props.progress >= 99.9

function isFlowActive(start: number) {
  if (isFinalOverview()) return coreFlowStarts.has(start)
  if (start === 0) return props.stageIndex === 0
  if (props.stageIndex === 8) return balanceFlowSets[props.balancePhase]?.includes(start as never) ?? false
  const rangeIndex = stageRanges.findIndex(([from, to]) => start >= from && start < to)
  if (rangeIndex < 0 || props.stageIndex !== rangeIndex + 1) return false
  const reached = stageStarts[rangeIndex]!.filter(value => props.progress >= value)
  if (props.stageIndex === 5 && props.progress >= 65) return start === 56 || start === 62
  return reached[reached.length - 1] === start
}
function flowClass(start: number) { const active = isFlowActive(start); return { active, hidden: !active } }
function phaseActive(index: number) { return isFinalOverview() || Math.min(Math.floor(props.stageIndex / 3), 2) === index }
</script>

<style scoped>
.heating-2d { position: absolute; inset: 0; overflow: hidden; background: #071a35 }
.heating-2d svg { display: block; width: 100%; height: 100% }
.sun-aura { animation: sun-breathe 3.4s ease-in-out infinite alternate }
.sun-rays { animation: sun-spin 28s linear infinite; transform-box: fill-box; transform-origin: center }
.cloud { opacity: .9; animation: cloud-drift 10s ease-in-out infinite alternate }
.cloud-small { animation-delay: -4s; animation-duration: 13s }
.layer-key text, .surface-labels text, .diagram-signature text { fill: #dcecf3; font-family: "Microsoft YaHei", sans-serif }
.layer-key text { font-size: 13px; font-weight: 700 }
.surface-labels text { fill: #d6e8da; font-size: 15px; font-weight: 700; text-anchor: middle; letter-spacing: .5px }
.diagram-signature text { fill: #b9d7e2; font-size: 12px }
.phase-zones .phase-zone { stroke-width: 1.4; opacity: .055 }
.phase-zone-solar { fill: #ffd45c; stroke: #ffd45c }
.phase-zone-ground { fill: #ff7954; stroke: #ff9a70 }
.phase-zone-air { fill: #ff77ba; stroke: #ff77ba }
.phase-zones path { fill: none; stroke: #b9d7e2; stroke-width: 1.5; stroke-dasharray: 7 10; opacity: .2 }
.flow { pointer-events: none; opacity: 1; transition: opacity .45s ease, filter .45s ease }
.flow.hidden { display: none }
.flow-halo, .flow-line { fill: none; stroke-linecap: round; stroke-linejoin: round }
.flow-halo { stroke-width: 19; opacity: .16; filter: url(#softGlow2d) }
.flow-line { stroke-width: 8; stroke-dasharray: 26 12; animation: energy-travel 1.15s linear infinite }
.scatter-incoming-halo { stroke-width: 13; opacity: .12 }
.scatter-incoming { stroke-width: 5; stroke-dasharray: 15 9 }
.scatter-halo { fill: none; stroke: #72dbff; stroke-width: 10; stroke-linecap: round; opacity: .14; filter: url(#softGlow2d) }
.scatter-ray { stroke-width: 4.5; stroke-dasharray: 10 7; animation-duration: .9s }
.scatter-ray.ray-b { animation-delay: -.12s }.scatter-ray.ray-c { animation-delay: -.24s }
.scatter-ray.ray-d { animation-delay: -.36s }.scatter-ray.ray-e { animation-delay: -.48s }
.scatter-core { fill: #e9fbff; filter: url(#softGlow2d) }
.scatter-ring { fill: none; stroke: #8be7ff; stroke-width: 3; opacity: .7; animation: scatter-pulse 1.35s ease-out infinite }
.solar { stroke: #ffd45c }.cool { stroke: #72dbff }.violet { stroke: #b9a2ff }.warm { stroke: #ff7954 }
.heat { stroke: #ff665d }.latent { stroke: #5ce7df }.air { stroke: #ff77ba }
.svg-label rect { fill: #071522; fill-opacity: .93; stroke: currentColor; stroke-opacity: .72 }
.svg-label text { fill: #fff; font-family: "Microsoft YaHei", sans-serif; text-anchor: middle }
.svg-label text { font-size: 14px; font-weight: 800 }
.svg-label .callout-sub { fill: #bad2dc; font-size: 10px; font-weight: 500 }
.flow.active .svg-label { animation: label-in .45s ease both }
.flow:has(.solar) .svg-label { color: #ffd45c }.flow:has(.cool) .svg-label { color: #72dbff }
.flow:has(.violet) .svg-label { color: #b9a2ff }.flow:has(.warm) .svg-label { color: #ff7954 }
.flow:has(.heat) .svg-label { color: #ff665d }.flow:has(.latent) .svg-label { color: #5ce7df }
.flow:has(.air) .svg-label { color: #ff77ba }
.final-overview .flow .svg-label { display: none }
.final-overview .flow-line { stroke-width: 6 }
.final-overview .flow-halo { stroke-width: 14; opacity: .11 }
.final-overview .scatter-ray { stroke-width: 3.8 }
.final-key > rect { fill: #071522; fill-opacity: .9; stroke: #8bddeb; stroke-opacity: .4; stroke-width: 1.5 }
.final-key path { fill: none; stroke-width: 6; stroke-linecap: round }
.final-key text { fill: #eaf7fb; font-family: "Microsoft YaHei", sans-serif; font-size: 13px; font-weight: 700 }
.final-key .final-key-title { fill: #8be7ff; font-size: 14px; font-weight: 800 }
.phase-strip rect { fill: #06131f; fill-opacity: .9; stroke: #82a7b8; stroke-opacity: .35; stroke-width: 1.5 }
.phase-strip text { fill: #b7ccd5; font-family: "Microsoft YaHei", sans-serif; font-size: 18px; font-weight: 800; text-anchor: middle }
.phase-strip > g { opacity: .72; transition: opacity .35s ease }
.phase-strip > g.active { opacity: 1 }
.phase-strip > g.active rect { stroke: #ffd45c; stroke-opacity: .9; filter: url(#softGlow2d) }
.phase-strip > g.active text { fill: #fff3c6 }
@keyframes energy-travel { to { stroke-dashoffset: -38 } }
@keyframes scatter-pulse { to { r: 27px; opacity: 0 } }
@keyframes label-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes sun-breathe { to { r: 86px; opacity: .13 } }
@keyframes sun-spin { to { transform: rotate(360deg) } }
@keyframes cloud-drift { to { opacity: .72 } }
@media (prefers-reduced-motion: reduce) { .sun-aura, .sun-rays, .cloud, .flow-line, .flow.active .svg-label { animation: none } }
</style>
