<template>
  <svg viewBox="0 0 1200 660" role="img" aria-labelledby="diagram-title diagram-desc"
    xmlns="http://www.w3.org/2000/svg">
    <title id="diagram-title">地震波速度与地球内部圈层</title>
    <desc id="diagram-desc">左侧为地下零至六百千米的速度放大图。右侧绿色方框准确圈出主图同一深度和全部速度范围。莫霍面位于地壳与地幔的分界，软流层位于岩石圈下方的上地幔上部。图中圈层宽度为教学示意，并非按比例绘制。</desc>
    <defs>
      <marker id="moho-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#173a53" />
      </marker>
      <clipPath id="earth-clip"><rect x="760" y="120" width="440" height="500" /></clipPath>
    </defs>

    <rect width="1200" height="660" fill="#fffefa" />
    <text x="770" y="53" class="main-title">地震波速度与地球内部圈层</text>
    <text x="770" y="82" class="subtitle">P 波和 S 波的速度变化反映圈层分界</text>

    <!-- 圈层从外到内叠绘，剖面与速度图共用同一深度边界。 -->
    <g clip-path="url(#earth-clip)" stroke="#4c3929" stroke-width="2">
      <path d="M760 620 V150 A470 470 0 0 1 1230 620 Z" fill="#b7754b" />
      <path d="M760 620 V158 A462 462 0 0 1 1222 620 Z" fill="#e8b88a" />
      <path d="M760 620 V185 A435 435 0 0 1 1195 620 Z" fill="#ed873f" />
      <path d="M760 620 V210 A410 410 0 0 1 1170 620 Z" fill="#fae2ad" />
      <path d="M760 620 V224 A396 396 0 0 1 1156 620 Z" fill="#edbb91" />
      <path d="M760 620 V365 A255 255 0 0 1 1015 620 Z" fill="#ffe15b" />
      <path d="M760 620 V528 A92 92 0 0 1 852 620 Z" fill="#fff3ce" />
    </g>

    <g class="earth-labels">
      <path d="M980 130 L902 181" class="leader" marker-end="url(#moho-arrow)" />
      <text x="986" y="132">莫霍面</text>
      <path d="M1110 232 L1070 286" class="leader" marker-end="url(#moho-arrow)" />
      <text x="1085" y="224">岩石圈</text>
      <text x="1074" y="339">软流层</text>
      <text x="1034" y="367" class="note">位于上地幔上部</text>
      <path d="M944 258 L978 286" class="leader" marker-end="url(#moho-arrow)" />
      <text x="855" y="259">上地幔</text>
      <text x="1024" y="508">下地幔</text>
      <text x="906" y="554">外核</text>
      <text x="771" y="605" class="small">内核</text>
      <text x="1095" y="276">地壳</text>
      <path d="M1110 280 L1098 300" class="leader" marker-end="url(#moho-arrow)" />
    </g>

    <g class="main-chart">
      <text x="590" y="112" text-anchor="middle" class="chart-heading">地震波速度 / (km·s⁻¹)</text>
      <rect x="420" y="150" width="340" height="2" fill="#b7754b" />
      <rect x="420" y="152" width="340" height="4" fill="#e8b88a" />
      <rect x="420" y="156" width="340" height="24" fill="#ed873f" />
      <rect x="420" y="180" width="340" height="44" fill="#fae2ad" />
      <rect x="420" y="224" width="340" height="141" fill="#edbb91" />
      <rect x="420" y="365" width="340" height="163" fill="#ffe15b" />
      <rect x="420" y="528" width="340" height="92" fill="#fff3ce" />
      <g class="grid">
        <path d="M420 150 V620 M488 150 V620 M556 150 V620 M624 150 V620 M692 150 V620 M760 150 V620" />
        <path d="M420 150 H760 M420 224 H760 M420 298 H760 M420 365 H760 M420 438 H760 M420 528 H760 M420 620 H760" />
      </g>
      <g class="axis-labels" text-anchor="middle">
        <text x="420" y="141">0</text><text x="488" y="141">3</text><text x="556" y="141">6</text>
        <text x="624" y="141">9</text><text x="692" y="141">12</text><text x="760" y="141">15</text>
      </g>
      <g class="axis-labels" text-anchor="end">
        <text x="408" y="156">0</text><text x="408" y="230">1 000</text>
        <text x="408" y="304">2 000</text><text x="408" y="371">2 900</text>
        <text x="408" y="444">4 000</text><text x="408" y="534">5 150</text>
        <text x="408" y="626">6 371</text>
      </g>
      <text x="375" y="410" transform="rotate(-90 375 410)" class="axis-title">深度 / km</text>
      <path class="p-curve" d="M561 150 L602 158 C608 177 589 181 611 208 C641 248 691 317 728 365 L603 367 C614 412 633 487 655 528 L664 530 C671 554 678 591 680 620" />
      <path class="s-curve" d="M499 150 L521 158 C514 178 519 187 530 210 C550 260 571 323 585 365" />
      <text x="687" y="267" class="curve-label p-label">纵波 P</text>
      <text x="518" y="288" class="curve-label s-label">横波 S</text>
      <text x="605" y="404" class="small">S 波不能通过液态外核</text>
      <text x="786" y="370" class="small">古登堡面</text>
      <rect x="420" y="150" width="340" height="44" class="zoom-border" />
    </g>

    <path d="M348 255 L420 173" class="zoom-connector" />
    <g class="inset">
      <rect x="16" y="116" width="332" height="320" rx="8" fill="#fffefa" class="zoom-border" />
      <text x="182" y="148" text-anchor="middle" class="inset-heading">上地幔上部速度放大图</text>
      <text x="182" y="175" text-anchor="middle" class="inset-subtitle">深度 0—600 km · 速度 0—15 km/s</text>
      <rect x="80" y="200" width="240" height="6" fill="#b7754b" />
      <rect x="80" y="206" width="240" height="22" fill="#e8b88a" />
      <rect x="80" y="228" width="240" height="112" fill="#ed873f" />
      <rect x="80" y="340" width="240" height="70" fill="#fae2ad" />
      <g class="grid"><path d="M80 200 V410 M128 200 V410 M176 200 V410 M224 200 V410 M272 200 V410 M320 200 V410" />
        <path d="M80 200 H320 M80 235 H320 M80 270 H320 M80 340 H320 M80 410 H320" /></g>
      <g class="axis-labels" text-anchor="middle">
        <text x="80" y="193">0</text><text x="128" y="193">3</text><text x="176" y="193">6</text>
        <text x="224" y="193">9</text><text x="272" y="193">12</text><text x="320" y="193">15</text>
      </g>
      <g class="axis-labels" text-anchor="end"><text x="72" y="205">0</text><text x="72" y="241">100</text>
        <text x="72" y="276">200</text><text x="72" y="346">400</text><text x="72" y="416">600</text></g>
      <text x="38" y="349" transform="rotate(-90 38 349)" class="axis-title">深度 / km</text>
      <path class="p-curve" d="M179 200 L207 206 C217 224 205 237 217 260 C225 289 229 312 238 340 L272 410" />
      <path class="s-curve" d="M136 200 L151 206 C143 226 145 237 150 260 C156 290 154 320 163 340 L198 410" />
      <path d="M80 206 H320" class="moho-line" />
      <path d="M279 162 L279 205" class="leader moho-pointer" marker-end="url(#moho-arrow)" />
      <text x="279" y="155" text-anchor="middle" class="moho-label">莫霍面</text>
      <text x="184" y="310" class="layer-label">软流层</text>
      <text x="184" y="332" class="small">岩石圈之下</text>
    </g>
    <text x="393" y="648" class="footnote">圈层厚度作视觉放大，深度与波速以坐标轴为准。</text>
  </svg>
</template>

<style scoped>
svg { display: block; width: 100%; height: 100%; background: #fffefa; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
.main-title { fill: #173a53; font-size: 29px; font-weight: 800; text-anchor: middle; }
.subtitle { fill: #607584; font-size: 17px; text-anchor: middle; }
.chart-heading, .inset-heading { fill: #173a53; font-size: 19px; font-weight: 800; }
.inset-subtitle { fill: #4e6878; font-size: 16px; }
.axis-title, .axis-labels { fill: #344c5d; font-size: 16px; font-weight: 600; }
.grid { fill: none; stroke: #597080; stroke-width: 1; stroke-opacity: .5; }
.p-curve, .s-curve { fill: none; stroke-linejoin: round; stroke-linecap: round; stroke-width: 4; }
.p-curve { stroke: #1d62cf; }
.s-curve { stroke: #c72d52; stroke-dasharray: 9 7; }
.curve-label { font-size: 20px; font-weight: 800; paint-order: stroke fill; stroke: #fff; stroke-width: 4; }
.p-label { fill: #164eae; }.s-label { fill: #a52745; }
.earth-labels { fill: #2e241c; font-size: 22px; font-weight: 800; }
.earth-labels .note { font-size: 17px; }
.small { fill: #3a4c58; font-size: 16px; font-weight: 600; }
.leader { fill: none; stroke: #173a53; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.zoom-border { fill: none; stroke: #16875a; stroke-width: 3; }
.zoom-connector { fill: none; stroke: #16875a; stroke-width: 2.5; }
.moho-line { fill: none; stroke: #173a53; stroke-width: 2; }
.moho-label { fill: #173a53; font-size: 17px; font-weight: 800; }
.moho-pointer { stroke-width: 2.5; }
.layer-label { fill: #6b3012; font-size: 22px; font-weight: 800; }
.footnote { fill: #6c7c87; font-size: 16px; }
</style>
