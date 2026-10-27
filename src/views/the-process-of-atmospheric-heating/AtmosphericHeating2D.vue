<template>
  <div class="atmosphere-scene" :class="{ 'motion-off': !motion, 'is-overview': overview }" aria-label="受热过程示意图，完整画面随窗口等比缩放">
    <!-- One shared coordinate system: no independent cover crop or background transform. -->
    <svg viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="atmosphere-title atmosphere-desc">
      <title id="atmosphere-title">大气受热过程二维写实示意</title>
      <desc id="atmosphere-desc">背景、层界和能量路径共用同一等比缩放坐标。太阳短波被反射、散射和选择性吸收；地表长波被大气吸收，大气向上和向下辐射。感热用空气流动、潜热用水汽输送和凝结表示，二者不是辐射。光色、波线与发光节点均为教学符号，高度不按比例。</desc>
      <defs>
        <linearGradient id="scene-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#01050b" stop-opacity=".86" /><stop offset=".45" stop-color="#041525" stop-opacity=".32" /><stop offset="1" stop-color="#031019" stop-opacity=".16" /></linearGradient>
        <linearGradient id="troposphere-tint" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="360" y2="740"><stop stop-color="#82c6bd" stop-opacity=".11" /><stop offset=".6" stop-color="#82c6bd" stop-opacity=".06" /><stop offset="1" stop-color="#82c6bd" stop-opacity="0" /></linearGradient>
        <linearGradient id="beam-cross" x1="0" x2="1" y1="0" y2="0"><stop stop-color="#e9ae39" stop-opacity="0" /><stop offset=".23" stop-color="#f6cb60" stop-opacity=".06" /><stop offset=".45" stop-color="#fff3b8" stop-opacity=".35" /><stop offset=".5" stop-color="#fff8d2" stop-opacity=".6" /><stop offset=".55" stop-color="#fff3b8" stop-opacity=".35" /><stop offset=".77" stop-color="#f6cb60" stop-opacity=".06" /><stop offset="1" stop-color="#e9ae39" stop-opacity="0" /></linearGradient>
        <linearGradient id="beam-length" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity=".8" /><stop offset=".28" stop-color="white" /><stop offset="1" stop-color="white" stop-opacity=".5" /></linearGradient>
        <mask id="beam-falloff" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#beam-length)" /></mask>
        <radialGradient id="absorption-glow"><stop stop-color="#fff8dd" stop-opacity=".95" /><stop offset=".08" stop-color="#ffe9a0" stop-opacity=".85" /><stop offset=".28" stop-color="#f8c466" stop-opacity=".45" /><stop offset=".65" stop-color="#f0a849" stop-opacity=".12" /><stop offset="1" stop-color="#ec8c3e" stop-opacity="0" /></radialGradient>
        <radialGradient id="heat-glow"><stop stop-color="#ffce8c" stop-opacity=".75" /><stop offset=".25" stop-color="#f99550" stop-opacity=".35" /><stop offset=".65" stop-color="#f17e47" stop-opacity=".12" /><stop offset="1" stop-color="#f17e47" stop-opacity="0" /></radialGradient>
        <linearGradient id="thermal-fade" x1="0" y1="1" x2="0" y2="0"><stop stop-color="white" stop-opacity=".8" /><stop offset=".2" stop-color="white" /><stop offset=".8" stop-color="white" stop-opacity=".75" /><stop offset="1" stop-color="white" stop-opacity=".28" /></linearGradient>
        <mask id="thermal-envelope" maskContentUnits="objectBoundingBox"><rect x="0" y="0" width="1" height="1" fill="url(#thermal-fade)" /></mask>
        <filter id="energy-glow" x="-120%" y="-20%" width="340%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id="scatter-glow" x="-40%" y="-400%" width="180%" height="900%"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="haze-glow" x="-220%" y="-30%" width="540%" height="160%"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="light-core" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.3" /></filter>
        <marker v-for="(color, key) in colors" :id="`tip-${key}`" :key="key" viewBox="0 0 14 10" markerWidth="14" markerHeight="10" refX="12" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L14 5L0 10L4 5Z" :fill="color" /></marker>
      </defs>

      <image class="landscape-plate" :href="landscape" x="0" y="0" width="1440" height="810" preserveAspectRatio="xMidYMid meet" />
      <rect width="1440" height="810" fill="url(#scene-shade)" />

      <!-- Mid-latitude schematic: the two internal curves are the layer boundaries,
           not energy paths. The high atmosphere continues beyond the drawing. -->
      <g class="atmospheric-layers">
        <path :d="layerBand(0, 0, 275, 195)" fill="#8291db" fill-opacity=".09" />
        <path :d="layerBand(275, 195, 400, 320)" fill="#4a9bd4" fill-opacity=".12" />
        <path :d="layerBand(400, 320, 810, 810)" fill="url(#troposphere-tint)" />
        <path class="layer-edge-shadow" :d="layerEdge(275, 195)" />
        <path class="layer-edge stratosphere-edge" :d="layerEdge(275, 195)" />
        <path class="layer-edge-shadow" :d="layerEdge(400, 320)" />
        <path class="layer-edge troposphere-edge" :d="layerEdge(400, 320)" />
      </g>

      <g class="lesson-content">
      <g class="sun"><image :href="sun" x="190" y="-8" width="250" height="250" /><text v-if="showLabels" x="445" y="103" class="sun-caption">太阳<tspan x="445" dy="22">短波能量来源</tspan></text></g>

      <g v-if="hasSunlight" class="solar-column" aria-hidden="true" :transform="`translate(${sunSource[0]} ${sunSource[1]}) rotate(${beamAngle})`">
        <path :d="`M-14 0H14L46 ${beamLength}H-46Z`" fill="url(#beam-cross)" mask="url(#beam-falloff)" />
        <path v-for="(offset,index) in [-6,6]" :key="offset" :d="`M${offset * .5} 0L${offset * 1.8} ${beamLength}`" class="beam-filament" :style="{ animationDelay: `${index * -1.8}s` }" />
      </g>
      <g v-for="point in emittingSurfaces" :key="point[0]" class="surface-emission" :transform="`translate(${point[0]} ${point[1]})`">
        <ellipse class="surface-warmth" rx="100" ry="29" fill="url(#heat-glow)" />
        <ellipse rx="40" ry="5" fill="url(#absorption-glow)" />
      </g>

      <g v-if="has('absorption') || has('airUp') || has('airDown') || has('solarAirAbsorption')" class="molecules" aria-label="水汽和二氧化碳分子示意，非实际比例">
        <g v-for="(point, index) in molecules" :key="index" :transform="`translate(${point[0]} ${point[1]})`">
          <g class="molecule-drift" :style="{ animationDelay: `${index * -.7}s` }">
            <template v-if="index % 3 === 1"><path d="M-13 0H13" /><circle r="4" class="atom carbon" /><circle cx="-13" r="5" class="atom oxygen" /><circle cx="13" r="5" class="atom oxygen" /></template>
            <template v-else><path d="M-10 5L0-3L11 5" /><circle cy="-3" r="5" class="atom oxygen" /><circle cx="-10" cy="5" r="3" class="atom" /><circle cx="11" cy="5" r="3" class="atom" /></template>
          </g>
        </g>
        <text v-if="showLabels && !overview" :x="has('solarAirAbsorption') ? 450 : 980" :y="has('solarAirAbsorption') ? 515 : 490" class="gas-label">水汽 · CO₂（分子放大示意）</text>
      </g>

      <g v-for="flow in radiativeFlows" :key="flow.id" class="energy-flow" :class="{ 'thermal-flow': !!flow.wave, 'focused-flow': isFocused(flow.id) }" :data-flow="flow.id" :style="{ '--energy': colors[flow.color], '--travel-time': `${flow.duration || 4.8}s` }">
        <g v-if="flow.wave && !overview" class="radiation-bundle" mask="url(#thermal-envelope)">
          <g v-for="(strand,index) in flow.strands" :key="index">
            <path :d="strand" class="strand-bloom" />
            <path :d="strand" class="strand-track" />
            <path v-if="motion" :d="strand" class="strand-traveller" pathLength="1000" :style="{ animationDelay: `${index * -2.3}s` }" />
          </g>
        </g>
        <!-- Absorbers share the incoming beam; keep their nodes without painting it repeatedly. -->
        <g v-if="!sharesSolarBeam(flow.id)">
          <path :d="flow.path" class="flow-haze" />
          <path :d="flow.path" class="flow-bloom" />
          <path :d="flow.path" class="flow-track" :marker-end="flow.node ? undefined : `url(#tip-${flow.color})`" />
          <path :d="flow.path" class="flow-core" />
          <path v-if="motion" :d="flow.path" class="flow-traveller" pathLength="1000" />
        </g>
        <g v-if="flow.node" class="absorption-node" :class="{ 'ground-node': flow.node[1] > 650 }" :transform="`translate(${flow.node[0]} ${flow.node[1]})`">
          <ellipse v-if="flow.node[1] > 650" class="ground-aura" rx="88" ry="32" fill="url(#absorption-glow)" />
          <circle v-else class="node-aura" r="58" fill="url(#absorption-glow)" />
          <g :transform="flow.node[1] > 650 ? 'scale(1.65 .38)' : 'scale(1)'">
            <circle class="node-ring" r="20" /><circle class="node-ring second-ring" r="20" />
          </g>
          <circle class="node-core" r="9" /><circle class="node-pin" r="3.4" />
          <ellipse v-if="flow.node[1] > 650" rx="15" ry="2" class="ground-glint" />
          <g v-if="motion" class="absorption-specks">
            <circle v-for="(speck,index) in absorptionSpecks" :key="index" r="1.6" :style="{ '--from-x': `${speck[0]}px`, '--from-y': `${speck[1]}px`, animationDelay: `${index * -.38}s` }" />
          </g>
        </g>
      </g>

      <!-- Material transport has no radiation bundle, glowing wave or light traveller. -->
      <g v-for="flow in transportFlows" :key="flow.id" class="material-transport" :class="flow.id" :data-flow="flow.id" :transform="overview ? `translate(${flow.id === 'latent' ? 140 : -75} 0)` : undefined" :style="{ '--transport': colors[flow.color] }">
        <path :d="flow.path" class="transport-route" :marker-end="`url(#tip-${flow.color})`" />
        <g v-if="flow.id === 'sensible'" aria-label="暖空气上升输送感热">
          <g v-for="index in 4" :key="index" class="air-parcel" :style="{ '--parcel-start': `${(index - 1) * -48}px`, animationDelay: `${index * -1.3}s` }">
            <ellipse cx="865" cy="675" rx="21" ry="10" /><path d="M853 678Q865 664 877 678" />
          </g>
        </g>
        <g v-else aria-label="海水蒸发吸热，水汽上升后凝结放热">
          <g v-for="index in 6" :key="index" class="vapor-parcel" :style="{ '--parcel-start': `${(index - 1) * -34}px`, animationDelay: `${index * -.9}s` }">
            <path :d="`M${480 + (index % 2 ? -15 : 15) - 5} 684L${480 + (index % 2 ? -15 : 15)} 679L${480 + (index % 2 ? -15 : 15) + 5} 684`" /><circle :cx="480 + (index % 2 ? -15 : 15)" cy="679" r="3" /><circle :cx="480 + (index % 2 ? -15 : 15) - 5" cy="684" r="2" /><circle :cx="480 + (index % 2 ? -15 : 15) + 5" cy="684" r="2" />
          </g>
          <g class="condensation" transform="translate(480 457)"><ellipse rx="39" ry="15" /><circle cx="-15" cy="-10" r="17" /><circle cx="8" cy="-15" r="22" /><circle cx="28" cy="-6" r="15" /><path class="condensation-drop" d="M0 15Q-8 27 0 29Q8 27 0 15" /><path class="condensation-heat" d="M-46-10l-11-4M-47 9l-12 4M45-10l11-4M47 9l12 4" /></g>
          <text v-if="showLabels" x="533" y="452" class="transport-note">凝结放热</text><text v-if="showLabels" x="408" y="736" class="transport-note">蒸发吸热</text>
        </g>
      </g>

      <g v-if="has('scatter')" class="scattering" :class="{ 'focused-flow': isFocused('scatter') }" aria-label="散射向多个方向分散">
        <g v-for="(ray, index) in scatteringRays" :key="ray"><path :d="ray" class="scatter-bloom" /><path :d="ray" class="scatter-line" marker-end="url(#tip-cool)" /><path v-if="motion" :d="ray" class="scatter-pulse" pathLength="100" :style="{ animationDelay: `${index * -.3}s` }" /></g>
        <circle :cx="scatterPoint[0]" :cy="scatterPoint[1]" r="25" fill="url(#absorption-glow)" /><circle :cx="scatterPoint[0]" :cy="scatterPoint[1]" r="4" fill="#defaff" />
      </g>

      <g v-if="has('airUp') || has('airDown')" class="air-origin" transform="translate(1090 435)"><ellipse rx="80" ry="38" fill="url(#heat-glow)" /><circle r="35" fill="url(#absorption-glow)" /><circle r="3" fill="#ffe9b8" /></g>

      <!-- All labels are painted last so a moving light cannot erase its explanation. -->
      <g v-if="showLabels" class="flow-labels">
        <g v-for="flow in shownFlows" :key="flow.id" class="flow-label" :class="{ 'focused-label': isFocused(flow.id) }" :data-label="flow.id" :transform="`translate(${flow.label[0]} ${flow.label[1]})`" :style="{ '--energy': colors[flow.color] }">
          <rect v-if="overview || isFocused(flow.id)" class="label-backing" x="4" y="-23" :width="Math.max(flow.title.length * 19, flow.subtitle.length * 12) + 20" height="55" rx="6" />
          <path d="M0-8V30" class="label-rule" /><text class="label-title" x="12">{{ flow.title }}</text><text class="label-subtitle" x="12" y="23">{{ flow.subtitle }}</text>
        </g>
        <g v-for="(flow, index) in shownFlows" :key="`compact-${flow.id}`" class="compact-flow-number" :data-number="flow.id" :transform="`translate(${(flow.compactLabel || flow.label)[0]} ${(flow.compactLabel || flow.label)[1]})`" :style="{ '--energy': colors[flow.color] }" aria-hidden="true"><circle r="24" /><text dy=".35em">{{ index + 1 }}</text></g>
        <g v-if="has('solar')" class="surface-label" transform="translate(465 758)"><text>{{ overview ? '海洋吸收短波' : '地表吸收' }}</text><text class="label-subtitle" y="22">太阳能转化为内能</text></g>
        <g v-if="has('absorption')" class="absorption-label" transform="translate(930 402)"><text>温室气体吸收</text><text class="label-subtitle" y="23">地面长波使大气增温</text></g>
      </g>
      <text x="53" y="757" class="terrain-name">海洋<tspan dx="14">储热 · 蒸发</tspan></text>
      <text x="1230" y="755" class="terrain-name">陆地<tspan dx="14">吸热 · 辐射</tspan></text>
      </g>

      <!-- Keep the altitude key at the viewport edge, outside the central light paths. -->
      <g class="layer-altitudes" transform="translate(32 0)" aria-label="中纬度大气垂直分层，高度不按比例">
        <g class="layer-name high-atmosphere" transform="translate(0 185)"><path class="layer-key" d="M-10-13V29" /><text>高层大气</text><text class="layer-range" y="25">约 50 km 以上</text></g>
        <g class="altitude-boundary" :transform="`translate(0 ${layerBoundaryY(275, 195)})`"><rect x="-10" y="-13" width="178" height="26" rx="5" /><text y="5">约 50 km · 平流层顶</text></g>
        <g class="layer-name stratosphere" transform="translate(0 315)"><path class="layer-key" d="M-10-13V29" /><text>平流层</text><text class="layer-range" y="25">对流层顶至约 50 km</text></g>
        <g class="altitude-boundary" :transform="`translate(0 ${layerBoundaryY(400, 320)})`"><rect x="-10" y="-13" width="208" height="26" rx="5" /><text y="5">约 10–12 km · 对流层顶</text></g>
        <g class="layer-name troposphere" transform="translate(0 490)"><path class="layer-key" d="M-10-13V29" /><text>对流层</text><text class="layer-range" y="25">地面至约 10–12 km</text></g>
        <text class="layer-note" y="562">中纬度示意 · 高度不按比例</text>
        <text class="layer-note secondary" y="583">对流层顶随纬度、季节变化</text>
      </g>
    </svg>
    <div class="compact-readout">
      <div class="compact-layer-key" aria-label="大气分层高度，中纬度示意，非等比例">
        <span><strong>高层大气</strong>约 50 km 以上</span>
        <span><strong>平流层</strong>对流层顶至约 50 km</span>
        <span><strong>对流层</strong>地面至约 10–12 km</span>
      </div>
      <div v-if="showLabels" class="compact-flow-key" aria-label="图中编号对应的能量路径">
        <div v-for="(flow, index) in shownFlows" :key="flow.id" class="compact-flow-item" :style="{ '--energy': colors[flow.color] }">
          <span class="compact-key-number">{{ index + 1 }}</span>
          <div><strong>{{ flow.title }}</strong><p>{{ flow.subtitle }}</p></div>
        </div>
      </div>
      <p class="compact-reading-note"><span class="full-reading-note">高度为中纬度示意，非等比例；对流层顶随纬度、季节变化。可用顶部全屏查看细节。</span><span class="short-reading-note">中纬度示意 · 高度非等比例</span></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { visibleFlows, focusedAttenuationFlow, type FlowId } from './heatingModel'

const imageBase = '/geo-resources-folder/images/the-process-of-atmospheric-heating'
const landscape = `${imageBase}/atmosphere-landscape.png`
const sun = `${imageBase}/solar-corona.png`

const props = withDefaults(defineProps<{ stageIndex: number; progress: number; motion?: boolean; showLabels?: boolean; includeExtensions?: boolean }>(), { motion: true, showLabels: true, includeExtensions: false })
// All scene geometry stays in the photograph's 1440 × 810 coordinate system.
// SVG performs one uniform fit for every layer; resizing cannot move a hit point
// relative to its coastline or turn a tropospheric event into a stratospheric one.
function layerEdge(y: number, controlY: number) {
  return `M0 ${y}Q720 ${controlY} 1440 ${y}`
}
function layerBand(top: number, topControl: number, bottom: number, bottomControl: number) {
  return `${layerEdge(top, topControl)}V${bottom}Q720 ${bottomControl} 0 ${bottom}Z`
}
function layerBoundaryY(y: number, controlY: number) {
  const t = 32 / 1440
  return y + 2 * t * (1 - t) * (controlY - y)
}

const colors = { solar: '#ffe9a8', cool: '#c4edf3', ultraviolet: '#d9c8f0', warm: '#ff9e50', sensible: '#dfc3a0', latent: '#91deca', air: '#ffb27d' } as const
type Point = [number, number]
const sunSource: Point = [330, 200]
const ozonePoint: Point = [365, 305]
const solarAirPoint: Point = [405, 425]
const reflectionPoint: Point = [420, 468]
const scatterPoint: Point = [435, 515]
interface Wave { from: Point; to: Point; cycles: number; amplitude?: number }
interface Flow { id: FlowId; path: string; title: string; subtitle: string; color: keyof typeof colors; label: Point; compactLabel?: Point; node?: Point; duration?: number; wave?: Wave; transport?: boolean }

// Smooth, tapered wave packets: the side filaments share the same source and sink.
// Coordinates are computed once, while light travels along the paths in CSS.
function wavePath(wave: Wave, spread = 0, phase = 0): string {
  const dx = wave.to[0] - wave.from[0]
  const dy = wave.to[1] - wave.from[1]
  const length = Math.hypot(dx, dy)
  const points: Point[] = Array.from({ length: 81 }, (_, i) => {
    const t = i / 80
    const envelope = Math.sin(Math.PI * t)
    const offset = (Math.sin(t * Math.PI * 2 * wave.cycles + phase) * (wave.amplitude || 7) + spread) * envelope
    return [wave.from[0] + dx * t - dy / length * offset, wave.from[1] + dy * t + dx / length * offset]
  })
  const start = points[0]!
  let path = `M${start[0]} ${start[1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i]!
    const next = points[i + 1]!
    path += `Q${point[0].toFixed(2)} ${point[1].toFixed(2)} ${((point[0] + next[0]) / 2).toFixed(2)} ${((point[1] + next[1]) / 2).toFixed(2)}`
  }
  return `${path}L${wave.to[0]} ${wave.to[1]}`
}

const flowDefinitions: Flow[] = [
  { id: 'solar', path: 'M330 200L500 706', title: '太阳辐射', subtitle: '短波进入地球系统', color: 'solar', label: [445, 194], compactLabel: [405, 280], node: [500, 706] },
  { id: 'ozone', path: 'M330 200L365 305', title: '臭氧吸收', subtitle: '吸收部分太阳紫外线', color: 'ultraviolet', label: [190, 290], compactLabel: [325, 305], node: ozonePoint },
  { id: 'solarAirAbsorption', path: 'M330 200L405 425', title: '大气吸收太阳红外线', subtitle: '水汽、CO₂ 选择性吸收', color: 'solar', label: [175, 435], compactLabel: [350, 420], node: solarAirPoint },
  { id: 'reflection', path: 'M420 468L606 160', title: '云层反射', subtitle: '对流层云将部分短波返回太空', color: 'solar', label: [625, 245] },
  { id: 'scatter', path: 'M330 200L435 515', title: '分子与微粒散射', subtitle: '部分光向四周分散', color: 'cool', label: [246, 622], compactLabel: [330, 620] },
  { id: 'ocean', path: 'M330 200L470 710', title: '海洋吸收短波', subtitle: '反射一部分，其余吸收', color: 'solar', label: [510, 666], node: [470, 710] },
  { id: 'land', path: 'M330 200L875 680', title: '陆地吸收短波', subtitle: '反射一部分，其余吸收', color: 'solar', label: [900, 650], node: [875, 680] },
  { id: 'surfaceReflection', path: 'M500 706L700 370', title: '地面反射', subtitle: '短波反射，不是地面长波', color: 'solar', label: [630, 535] },
  { id: 'longwave', path: '', wave: { from: [900, 680], to: [900, 440], cycles: 3.2 }, title: '地面长波辐射', subtitle: '暖地表向上释放红外能量', color: 'warm', label: [660, 580], compactLabel: [850, 580] },
  { id: 'window', path: '', wave: { from: [970, 680], to: [970, 165], cycles: 5.1, amplitude: 5 }, title: '大气窗口', subtitle: '部分长波直接逸向太空', color: 'warm', label: [995, 205] },
  { id: 'absorption', path: '', wave: { from: [900, 680], to: [900, 440], cycles: 3.2 }, title: '地面长波辐射', subtitle: '近地面大气的主要直接热源', color: 'warm', label: [658, 590], compactLabel: [950, 590], node: [900, 440] },
  { id: 'sensible', path: 'M865 681Q848 580 865 465', transport: true, title: '感热输送', subtitle: '暖空气运动 · 非辐射传热', color: 'sensible', label: [930, 562] },
  { id: 'latent', path: 'M480 707Q460 585 480 470', transport: true, title: '潜热输送', subtitle: '水汽携带能量 · 非辐射传热', color: 'latent', label: [530, 574] },
  { id: 'airUp', path: '', wave: { from: [1090, 435], to: [1108, 164], cycles: 3.4 }, title: '大气向外辐射', subtitle: '长波释放至太空', color: 'air', label: [1150, 220], duration: 4.4 },
  { id: 'airDown', path: '', wave: { from: [1090, 435], to: [1188, 704], cycles: 3.4 }, title: '大气向下辐射', subtitle: '逆辐射返回地表', color: 'air', label: [1180, 555], node: [1188, 704], duration: 4.4 },
  { id: 'returnOcean', path: '', wave: { from: [610, 435], to: [495, 710], cycles: 3.5 }, title: '海洋吸收逆辐射', subtitle: '补偿海面损失的部分热量', color: 'air', label: [337, 568], compactLabel: [505, 568], node: [495, 710] },
  { id: 'returnLand', path: '', wave: { from: [1090, 435], to: [1188, 704], cycles: 3.4 }, title: '陆地吸收逆辐射', subtitle: '减缓地表冷却', color: 'air', label: [1180, 555], node: [1188, 704] },
]
const flows = flowDefinitions.map(flow => ({
  ...flow,
  path: flow.wave ? wavePath(flow.wave) : flow.path,
  strands: flow.wave ? [wavePath(flow.wave, -17, .8), wavePath(flow.wave, 17, -.8)] : [],
}))
const activeIds = computed(() => visibleFlows(props.stageIndex, props.progress, props.includeExtensions))
const overview = computed(() => props.stageIndex === 8 || props.progress >= 91)
const overviewLabels: Partial<Record<FlowId, Point>> = {
  scatter: [35, 625], land: [740, 748], surfaceReflection: [665, 510],
  absorption: [925, 620], returnOcean: [40, 675], sensible: [650, 575], latent: [645, 660],
}
const shownFlows = computed(() => flows.filter(flow => activeIds.value.includes(flow.id)).map(source => {
  const flow = overview.value && overviewLabels[source.id]
    ? { ...source, label: overviewLabels[source.id]! }
    : source
  if (overview.value && flow.id === 'solar') {
    return { ...flow, subtitle: '短波输入 · 海洋吸收示例' }
  }
  if (overview.value && flow.id === 'returnOcean') {
    const wave: Wave = { from: [270, 435], to: [300, 710], cycles: 3.5 }
    return { ...flow, wave, path: wavePath(wave), node: wave.to, compactLabel: [260, 655] as Point }
  }
  if (overview.value && flow.transport) {
    return { ...flow, compactLabel: [flow.id === 'latent' ? 620 : 790, 560] as Point }
  }
  if (flow.id !== 'surfaceReflection') return flow
  // The reflection always shares the active shortwave impact point.
  const origin: Point = props.stageIndex === 2 ? (props.progress < 28 ? [470, 710] : [875, 680]) : [500, 706]
  return {
    ...flow,
    path: `M${origin[0]} ${origin[1]}L${origin[0] + 200} 370`,
    label: overview.value ? flow.label : [origin[0] + 135, 535] as Point,
  }
}))
const radiativeFlows = computed(() => shownFlows.value.filter(flow => !flow.transport))
const transportFlows = computed(() => shownFlows.value.filter(flow => flow.transport))
const has = (id: FlowId) => activeIds.value.includes(id)
const isFocused = (id: FlowId) => props.stageIndex === 1 && focusedAttenuationFlow(props.progress) === id
const sharesSolarBeam = (id: FlowId) =>
  ((id === 'ozone' || id === 'solarAirAbsorption') && (has('scatter') || has('solar')))
  || (id === 'scatter' && has('solar'))
const hasSunlight = computed(() => props.stageIndex <= 2 || overview.value)
const solarTarget = computed<Point>(() => {
  // In overview the main beam still passes through both atmospheric absorption nodes.
  if (overview.value) return [500, 706]
  if (has('land')) return [875, 680]
  if (has('ocean')) return [470, 710]
  if (props.stageIndex === 1) {
    if (has('scatter')) return scatterPoint
    if (has('reflection')) return reflectionPoint
    if (has('solarAirAbsorption')) return solarAirPoint
    return ozonePoint
  }
  return [500, 706]
})
const beamLength = computed(() => Math.hypot(solarTarget.value[0] - sunSource[0], solarTarget.value[1] - sunSource[1]))
const beamAngle = computed(() => Math.atan2(solarTarget.value[1] - sunSource[1], solarTarget.value[0] - sunSource[0]) * 180 / Math.PI - 90)
const emittingSurfaces = computed<Point[]>(() => shownFlows.value.filter(flow => flow.wave && flow.wave.from[1] > 650).map(flow => flow.wave!.from))
const scatteringRays = ['M435 515Q392 482 342 470', 'M435 515Q375 510 310 515', 'M435 515Q382 550 327 560', 'M435 515Q410 562 382 600']
const molecules = computed(() => [
  ...(has('solarAirAbsorption') ? [[355, 410], [400, 465], [465, 465], [535, 466]] : []),
  ...(has('absorption') || has('airUp') || has('airDown')
    ? [[690, 439], [780, 460], [875, 439], [950, 416], [1030, 448], [1177, 429]] : []),
])
const absorptionSpecks: Point[] = [[-36, -24], [29, -35], [-22, 31], [42, 15], [3, -45], [-43, 4]]
</script>

<style scoped>
.atmosphere-scene { position: relative; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(180deg, #071425, #143a50); }
svg { width: 100%; height: 100%; display: block; font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif }
.compact-flow-number, .compact-readout, .short-reading-note { display: none }
.material-transport { --transport: #bfe0cf }
.transport-route { fill: none; stroke: var(--transport); stroke-width: 2; stroke-dasharray: 8 6; opacity: .6 }
.air-parcel, .vapor-parcel { transform: translateY(var(--parcel-start)); animation: transport-rise 5.4s linear infinite; }
.air-parcel ellipse { fill: #d8bc93; fill-opacity: .13; stroke: #dfc3a0; stroke-width: 1.5; }
.air-parcel path { fill: none; stroke: #e6cfb0; stroke-width: 1.5; }
.vapor-parcel path { fill: none; stroke: #a6e1cc; stroke-width: 1.5; }
.vapor-parcel circle { fill: #c8eddd; }
.condensation { fill: #e6f0ed; fill-opacity: .65; }
.condensation-drop { fill: #8edbc8; fill-opacity: 1; }
.condensation-heat { fill: none; stroke: #e8bc83; stroke-width: 2; stroke-linecap: round; animation: condensation-release 2.7s ease-in-out infinite; }
.transport-note { fill: #e6f2e4; font-size: 14px; font-weight: 500; paint-order: stroke; stroke: #173b43; stroke-width: 3px; }
.layer-edge, .layer-edge-shadow { fill: none; vector-effect: non-scaling-stroke }
.layer-edge-shadow { stroke: #061729; stroke-width: 5; opacity: .45 }
.layer-edge { stroke-width: 1.8; opacity: .8 }
.stratosphere-edge { stroke: #bdc7f4 }
.troposphere-edge { stroke: #93ddd4 }
.layer-altitudes { pointer-events: none }
.layer-name { fill: #edf5fc; font-size: 19px; font-weight: 600; paint-order: stroke; stroke: #0c253d; stroke-width: 3px; stroke-linejoin: round }
.layer-range { font-size: 14px; font-weight: 500; fill: #d6e8f2; stroke-width: 2.5px }
.layer-key { fill: none; stroke-width: 3; stroke-linecap: round }
.high-atmosphere .layer-key { stroke: #bdc7f4 }.stratosphere .layer-key { stroke: #8ac7ef }.troposphere .layer-key { stroke: #93ddd4 }
.altitude-boundary rect { fill: #071c2e; fill-opacity: .88; stroke: #98b8c8; stroke-opacity: .55 }
.altitude-boundary text { fill: #e3f2fa; font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums }
.layer-note { fill: #e2edf2; font-size: 12px; paint-order: stroke; stroke: #0c253d; stroke-width: 3px; stroke-linejoin: round }
.layer-note.secondary { fill: #bcd1df; font-size: 11px }
.sun-caption { fill: #e9d2a2; font-size: 20px; letter-spacing: 2px; font-weight: 500 }
.sun-caption tspan { fill: #b4afa0; font-size: 11px; letter-spacing: .5px }
.solar-column { animation: beam-breathe 5s ease-in-out infinite alternate; mix-blend-mode: screen }
.beam-filament { fill: none; stroke: #fff2be; stroke-width: 1.4; opacity: .3; filter: url(#light-core); animation: filament-breathe 4.2s ease-in-out infinite alternate }
.flow-haze, .flow-track, .flow-bloom, .flow-core, .flow-traveller, .strand-bloom, .strand-track, .strand-traveller { fill: none; stroke: var(--energy); stroke-linecap: round; stroke-linejoin: round }
.flow-haze { stroke-width: 25; opacity: .075; filter: url(#haze-glow) }
.flow-bloom { stroke-width: 8; opacity: .42; filter: url(#energy-glow) }
.flow-track { stroke-width: 2.7; opacity: .92; filter: drop-shadow(0 0 3px var(--energy)) }
.flow-core { stroke-width: .95; stroke: #fff5cd; opacity: .85 }
.flow-traveller { stroke-width: 2.6; stroke: #fff9df; opacity: .95; stroke-dasharray: 52 948; animation: energy-move var(--travel-time) linear infinite; filter: drop-shadow(0 0 5px var(--energy)) }
.thermal-flow .flow-track { stroke-width: 1.7; opacity: .82 }
.thermal-flow .flow-core { stroke-width: .65; opacity: .64 }
.thermal-flow .flow-traveller { stroke-width: 1.7; stroke-dasharray: 65 935 }
.thermal-flow .flow-haze { stroke-width: 16; opacity: .14 }
.strand-bloom { stroke-width: 6; opacity: .25; filter: url(#energy-glow) }
.strand-track { stroke-width: 1.15; opacity: .66 }
.strand-traveller { stroke: #ffe0ac; stroke-width: 1.45; opacity: .9; stroke-dasharray: 100 900; animation: energy-move calc(var(--travel-time) * 1.3) linear infinite; filter: url(#light-core) }
.energy-flow[data-flow=solar] .flow-track, .energy-flow[data-flow=land] .flow-track, .energy-flow[data-flow=ocean] .flow-track { stroke-width: 4; opacity: .7 }
.energy-flow[data-flow=solar] .flow-core, .energy-flow[data-flow=land] .flow-core, .energy-flow[data-flow=ocean] .flow-core { stroke-width: 1.65; opacity: .9 }
.energy-flow[data-flow=solar] .flow-bloom, .energy-flow[data-flow=land] .flow-bloom, .energy-flow[data-flow=ocean] .flow-bloom { stroke-width: 18; opacity: .33 }
.node-ring { fill: none; stroke: #ffe2a2; stroke-width: .8; transform-origin: 0 0; animation: energy-absorb 2.8s ease-in infinite; opacity: .18 }
.second-ring { animation-delay: -1.4s }
.node-core { fill: #ffe8a9; filter: url(#node-glow) }
.node-pin { fill: #fff7d5; filter: drop-shadow(0 0 4px #ffe6a4) }
.node-aura, .ground-aura { animation: node-breathe 2.6s ease-in-out infinite alternate; transform-origin: 0 0; mix-blend-mode: screen }
.ground-glint { fill: #fff1ba; opacity: .7; filter: url(#light-core) }
.absorption-specks circle { fill: #ffe0a2; filter: drop-shadow(0 0 3px #ffd782); animation: absorption-drift 2.5s ease-in infinite }
.surface-warmth { animation: ground-breathe 4.5s ease-in-out infinite alternate; mix-blend-mode: screen }
.scatter-line, .scatter-bloom, .scatter-pulse { fill: none; stroke: #d5edf0; stroke-linecap: round; stroke-width: 1.5 }
.scatter-bloom { stroke-width: 8; opacity: .45; filter: url(#scatter-glow) }
.scatter-pulse { stroke: #fff5c9; stroke-width: 2.2; stroke-dasharray: 18 82; animation: scatter-travel 2.8s linear infinite; filter: drop-shadow(0 0 3px #fff0b5) }
.molecules { opacity: .75 }
.molecules path { fill: none; stroke: #bce8d2; stroke-width: 1.6; opacity: .7 }
.atom { fill: #e1f2cf }.oxygen { fill: #80d7b3; filter: drop-shadow(0 0 6px #5bdfb5) }.carbon { fill: #a8c6dd }
.molecule-drift { animation: molecular-motion 5s ease-in-out infinite alternate }
.gas-label { fill: #b0d7c5; font-size: 12px; paint-order: stroke; stroke: #153c4a; stroke-width: 2.5px }
.flow-label { pointer-events: none }
.label-backing { fill: #071b2b; fill-opacity: .72 }
.focused-label .label-backing { stroke: var(--energy); stroke-opacity: .55 }
.focused-label .label-rule { stroke-width: 3; opacity: 1 }
.focused-flow .node-ring { stroke-width: 1.8 }
.focused-flow .flow-track, .focused-flow .scatter-line { stroke-width: 3 }
.is-overview .flow-haze { opacity: .045 }
.is-overview .flow-bloom { opacity: .2; stroke-width: 6 }
.is-overview .energy-flow[data-flow=land] .flow-track { stroke-width: 2 }
.is-overview .energy-flow[data-flow=land] .flow-core { stroke-width: .8 }
.label-rule { stroke: var(--energy); stroke-width: 1.4; opacity: .6 }
.label-title, .absorption-label > text, .surface-label > text { fill: #fff2dc; font-size: 19px; font-weight: 600; paint-order: stroke; stroke: #091d2b; stroke-opacity: .75; stroke-width: 2.8px; stroke-linejoin: round }
.label-subtitle, .absorption-label .label-subtitle, .surface-label .label-subtitle { fill: #d5e0e3; font-size: 12px; font-weight: 400; paint-order: stroke; stroke: #091d2b; stroke-width: 2.5px; stroke-opacity: .7 }
.surface-label { text-anchor: middle }.surface-label > text { font-size: 17px }.absorption-label > text { font-size: 18px }
.terrain-name { fill: #e6e9dd; font-size: 14px; font-weight: 500; paint-order: stroke; stroke: #122c31; stroke-width: 2px; stroke-opacity: .8 }.terrain-name tspan { font-size: 10px; font-weight: 400; fill: #c2d4d2 }
.motion-off * { animation: none !important }.motion-off .node-ring { opacity: .18 }.motion-off .second-ring { display: none }
@keyframes energy-move { to { stroke-dashoffset: -1000 } }
@keyframes scatter-travel { to { stroke-dashoffset: -100 } }
@keyframes energy-absorb { from { transform: scale(1.2); opacity: 0 } 35% { opacity: .34 } to { transform: scale(.25); opacity: 0 } }
@keyframes absorption-drift { from { transform: translate(var(--from-x),var(--from-y)); opacity: 0 } 25% { opacity: .8 } to { transform: translate(0,0); opacity: 0 } }
@keyframes node-breathe { to { opacity: .72; transform: scale(1.12) } }
@keyframes ground-breathe { to { opacity: .6 } }
@keyframes beam-breathe { to { opacity: .8 } }
@keyframes filament-breathe { to { opacity: .6 } }
@keyframes molecular-motion { to { transform: translate(2px,-4px) rotate(6deg) } }
@keyframes transport-rise { from { transform: translateY(0); opacity: 0 } 15% { opacity: .9 } 85% { opacity: .9 } to { transform: translateY(-205px); opacity: 0 } }
@keyframes condensation-release { 50% { opacity: .35; } }
@media (max-width: 960px) and (orientation: portrait) {
  .atmosphere-scene { display: grid; grid-template-rows: minmax(0, 1fr) auto; }
  svg { min-width: 0; min-height: 0; }
  .flow-label > .label-rule, .flow-label > text, .label-backing, .surface-label, .absorption-label,
  .gas-label, .transport-note, .sun-caption tspan, .terrain-name tspan,
  .layer-range, .altitude-boundary, .layer-note { display: none; }
  .layer-name { font-size: 26px; }
  .terrain-name { font-size: 22px; }
  .compact-flow-number { display: block; }
  .compact-flow-number circle { fill: #071c2eee; stroke: var(--energy); stroke-width: 2; }
  .compact-flow-number text { fill: #fff5e1; font-size: 32px; font-weight: 600; text-anchor: middle; }
  .compact-readout { display: block; padding: 14px 18px 16px; color: #e8f0ed; background: #0a2234; border-top: 1px solid #b5d8ce26; }
  .compact-layer-key { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding-bottom: 12px; border-bottom: 1px solid #b5d8ce26; color: #bbced6; font-size: 11px; line-height: 1.6; }
  .compact-layer-key strong { display: block; color: #edf4f3; font-size: 12px; font-weight: 500; }
  .compact-layer-key span { padding-left: 8px; border-left: 2px solid #bdc7f4; }
  .compact-layer-key span:nth-child(2) { border-color: #8ac7ef; }
  .compact-layer-key span:nth-child(3) { border-color: #93ddd4; }
  .compact-flow-key { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; margin-top: 14px; }
  .compact-flow-item { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
  .compact-key-number { display: grid; place-items: center; flex: 0 0 22px; height: 22px; border: 1px solid var(--energy); border-radius: 50%; color: var(--energy); font-size: 12px; }
  .compact-flow-item strong { font-size: 13px; font-weight: 500; line-height: 1.5; }
  .compact-flow-item p { margin: 3px 0 0; color: #b2c7ce; font-size: 11px; line-height: 1.5; }
  .compact-reading-note { margin: 12px 0 0; color: #91aeb9; font-size: 10px; line-height: 1.6; }
}
@media (max-width: 600px) and (orientation: portrait) {
  .compact-flow-number circle { r: 29px; }
  .compact-flow-number text { font-size: 42px; }
  .layer-altitudes, .sun-caption { display: none; }
  .compact-readout { padding: 12px; }
  .compact-flow-key { gap: 10px 12px; }
  .compact-flow-item { gap: 6px; }
}
@media (max-width: 960px) and (orientation: portrait) and (max-height: 760px) {
  .compact-flow-item p { display: none; }
  .compact-flow-key { gap: 6px 12px; margin-top: 10px; }
  .compact-flow-item strong { font-size: 12px; }
  .compact-layer-key { padding-bottom: 8px; }
  .compact-reading-note { margin-top: 8px; }
}
@media (max-width: 960px) and (orientation: portrait) and (max-height: 640px) {
  .compact-readout { padding: 8px 12px; }
  .compact-layer-key { font-size: 10px; line-height: 1.3; gap: 6px; }
  .compact-layer-key strong { font-size: 11px; line-height: 1.4; }
  .compact-layer-key span { padding-left: 4px; }
  .compact-flow-key { gap: 4px 10px; margin-top: 8px; }
  .compact-key-number { flex-basis: 18px; height: 18px; font-size: 11px; }
  .compact-flow-item strong { font-size: 11px; line-height: 18px; }
  .full-reading-note { display: none; }
  .short-reading-note { display: inline; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important }.flow-traveller, .strand-traveller, .scatter-pulse, .absorption-specks { display: none }.node-ring { opacity: .18 } }
</style>
