<template>
  <div class="tidal-phenomenon-container geo-template-page geo-page theme-dark">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">潮汐现象</h1>

      <div class="toolbar-actions">
        <label class="theme-btn toolbar-btn observation-toggle" :class="{ active: observationVisible }">
          <input v-model="observationVisible" type="checkbox" aria-controls="tidal-observation-pane" />
          <span>潮汐观察</span>
        </label>
        <button type="button" class="theme-btn toolbar-btn" @click="focusEarth">
          聚焦地球
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :aria-pressed="panelsVisible"
          @click="panelsVisible = !panelsVisible">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main ref="splitStageRef" class="workspace tidal-workspace"
      :class="{ 'is-split': observationVisible, 'is-resizing': splitResizing }">
      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlPanelCollapsed"
        class="tidal-floating-card control-floating-card" title="模拟控制" subtitle="地月运动 · 潮汐形变 · 辅助图层" variant="control"
        :initial-top="84" :initial-right="18" :bottom-inset="96" :min-width="320" :min-height="260" draggable resizable>
        <div class="panel-scroll">
          <section class="geo-card control-section">
            <h3 class="section-title">天体运动</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>月球公转与同步自转</strong>
                <span>周期均约 {{ moonPeriodLabel }}；同一面始终朝向地球</span>
              </div>
              <el-switch v-model="moonOrbitEnabled" aria-label="月球公转与同步自转" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地球自转</strong>
                <span>恒星自转周期约 {{ earthPeriodLabel }}；不同于太阳日的 {{ solarDayLabel }}</span>
              </div>
              <el-switch v-model="earthRotationEnabled" aria-label="地球自转" />
            </div>
            <p class="motion-scale-note">{{ motionModeLabel }}：{{ timeScaleLabel }}。所有运动使用同一演示倍率，周期比例见“实时数据”。</p>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">潮汐显示</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>引力演示箭头</strong>
                <span>对比月球引力强弱与相对地心的引潮效果</span>
              </div>
              <el-switch v-model="showForceVisualization" aria-label="引力演示箭头" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示潮汐形变层</strong>
                <span>控制高潮区与低潮区外层圈层的显隐</span>
              </div>
              <el-switch v-model="showTideLayer" aria-label="显示潮汐形变层" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>增强形变显示</strong>
                <span>仅改变视觉幅度，不改变潮汐周期</span>
              </div>
              <el-switch v-model="highlightDeformation" aria-label="增强形变显示" :disabled="!showTideLayer" />
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">示意形变强度</span>
              <strong class="control-value">
                {{ deformationStrength.toFixed(1) }}×
              </strong>
            </div>

            <el-slider v-model="deformationStrength" aria-label="示意形变强度" :min="0.5" :max="2" :step="0.1"
              :show-tooltip="false" :disabled="!showTideLayer || !highlightDeformation" />

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示质心</strong>
                <span>显示地月系统共同质心及其参考轴</span>
              </div>
              <el-switch v-model="showBarycenter" aria-label="显示质心" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示地月线</strong>
                <span>显示潮汐隆起对应的地月连线</span>
              </div>
              <el-switch v-model="showEarthMoonLine" aria-label="显示地月线" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示地轴</strong>
                <span>本模型简化为地轴垂直月球轨道面</span>
              </div>
              <el-switch v-model="showEarthAxis" aria-label="显示地轴" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="option-grid view-option-grid">
              <button v-for="item in viewOptions" :key="item.value" type="button" class="theme-btn option-btn"
                :class="{ active: currentView === item.value }" @click="setView(item.value)">
                {{ item.label }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn" @click="resetControls">
              恢复默认参数
            </button>
          </section>
        </div>
      </FloatingFeatureCard>

      <section id="tidal-orbit-pane" class="center-stage" aria-label="地月潮汐空间视图"
        :style="{ flexBasis: observationVisible ? `${splitPercent}%` : '100%' }">
        <div class="stage-content tide-stage-content" :class="{ 'show-forces': showForceVisualization }">
          <div ref="threeContainerRef" class="scene-host three-host tide-three-host"></div>

          <section v-if="showForceVisualization" class="force-toolbar" aria-label="引力演示模式">
            <div class="force-mode-options">
              <button type="button" :aria-pressed="forceMode === 'gravity'" @click="forceMode = 'gravity'">月球引力</button>
              <button type="button" :aria-pressed="forceMode === 'tidal'" @click="forceMode = 'tidal'">引潮效果</button>
            </div>
            <p :class="`force-copy-${forceMode}`"><i aria-hidden="true"></i>{{ forceMode === 'gravity'
              ? '都朝向月球：近侧强，地心居中，背侧弱'
              : '引潮作用：扣除地心共同加速度后的差值' }}</p>
            <small>同质量比较 · 箭长差异已放大 · 不是水流</small>
          </section>

          <div class="stage-status-badge">
            <span class="status-dot"></span>
            <strong>{{ tideStatus.title }}</strong>
            <span>{{ tideStatus.subtitle }}</span>
          </div>

          <div class="scene-annotations" aria-label="潮汐成因标注">
            <svg class="cause-leaders" aria-hidden="true">
              <line ref="nearCauseLeaderRef" />
              <line ref="farCauseLeaderRef" />
            </svg>
            <span ref="nearTideLabelRef" class="scene-label high-label tide-cause-label">
              <strong>近月侧 · 高潮</strong>
              <small>月球引力比地心处强<br />相对地心，向月球一侧隆起</small>
            </span>
            <span ref="farTideLabelRef" class="scene-label high-label tide-cause-label">
              <strong>背月侧 · 高潮</strong>
              <small>月球引力仍朝月球，但比地心处弱<br />相对地心，向背月一侧隆起</small>
            </span>
            <span ref="lowTideLabelRef" class="scene-label low-label">低潮</span>
            <span ref="oppositeLowTideLabelRef" class="scene-label low-label">低潮</span>
            <span ref="observerLabelRef" class="scene-label observer-label">A</span>
            <span ref="moonLabelRef" class="scene-label moon-label">月球</span>
          </div>

        </div>

        <div class="timeline-dock">
          <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>手动月球位置 · 非时间轴</span>
              <strong>{{ Math.round(moonAngleDeg) }}° · {{ moonQuadrantLabel }}</strong>
            </div>

            <el-slider v-model="moonAngleDeg" aria-label="手动月球位置，拖动暂停" :min="0" :max="360" :step="1" :show-tooltip="false"
              @input="pauseForManualPosition" />
            <p class="timeline-time-scale">{{ timeScaleLabel }}</p>
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" :aria-label="`演示倍率 ${item} 倍`"
              :title="`演示倍率 ${item} 倍，时间加速 ${Math.round(SIMULATION_HOURS_PER_SECOND * 3600 * item)} 倍`"
              @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <section v-show="observationVisible" id="tidal-observation-pane" class="observation-stage"
        aria-label="潮汐观察" :style="{ flexBasis: `${100 - splitPercent}%` }">
        <TideObservationPane v-if="observationMounted" :tide="localTide" :playing="isPlaying"
          :speed="playbackSpeed" :active="observationVisible" :motion-period-label="motionPeriodLabel"
          @select-stage="setCoastStage" @toggle-play="togglePlay" />
      </section>

      <div v-if="observationVisible" class="view-divider" role="separator" tabindex="0"
        aria-label="调整地月场景与潮汐观察宽度" aria-orientation="vertical"
        aria-controls="tidal-orbit-pane tidal-observation-pane" :aria-valuenow="Math.round(splitPercent)"
        :aria-valuemin="splitMin" :aria-valuemax="100 - splitMin"
        :aria-valuetext="`地月场景 ${Math.round(splitPercent)}%，潮汐观察 ${Math.round(100 - splitPercent)}%`"
        :style="{ left: `${splitPercent}%` }" @pointerdown="startSplitResize" @pointermove="resizeSplit"
        @pointerup="stopSplitResize" @pointercancel="stopSplitResize" @lostpointercapture="stopSplitResize"
        @keydown="resizeSplitWithKeyboard" @dblclick="splitPercent = 50">
        <span class="divider-grip" aria-hidden="true"><i></i><i></i></span>
      </div>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="dataPanelCollapsed"
        class="tidal-floating-card data-floating-card" title="实时数据" subtitle="潮汐状态 · 运动周期" variant="data"
        :initial-top="148" :initial-right="18" :bottom-inset="96" :min-width="320" :min-height="220" draggable
        resizable>
        <div class="panel-scroll">
          <TideDataPanel :playing="isPlaying" :tide-stage="localTide.stage"
            :linked-motion="earthRotationEnabled && moonOrbitEnabled" :period-ratio="periodRatio"
            :angular-speed-ratio="angularSpeedRatio" :metrics="liveDataMetrics" :periods="periodDataMetrics" />
        </div>
      </FloatingFeatureCard>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="legendPanelCollapsed"
        class="tidal-floating-card legend-floating-card" title="潮汐图例" subtitle="高潮 · 低潮 · 参考图层" variant="data"
        :initial-top="212" :initial-right="18" :bottom-inset="96" :min-width="320" :min-height="300" draggable resizable>
        <div class="panel-scroll stage-legend" aria-label="潮汐图例说明">
          <div class="legend-heading"><span class="legend-model-badge">理想模型</span></div>
          <div class="legend-tide-pair">
            <div class="legend-tide-item">
              <strong><i class="legend-swatch high-tide-swatch"></i>高潮</strong>
              <span>近月侧、背月侧隆起</span>
            </div>
            <div class="legend-tide-item">
              <strong><i class="legend-swatch low-tide-swatch"></i>低潮</strong>
              <span>垂直地月连线处降低</span>
            </div>
          </div>
          <div class="legend-reference-list">
            <div class="legend-reference-row">
              <i class="legend-line orbit-line-swatch"></i>
              <strong>月球轨道</strong><span>轨道环与方位刻度</span>
            </div>
            <div class="legend-reference-row">
              <i class="legend-line earth-moon-line-swatch"></i>
              <strong>地月连线</strong><span>隆起的主轴方向</span>
            </div>
            <div class="legend-reference-row">
              <i class="legend-line mean-sea-swatch"></i>
              <strong>参考海面</strong><span>未发生形变的海面</span>
            </div>
            <div class="legend-reference-row">
              <i class="legend-observer-swatch">A</i>
              <strong>观察点 A</strong><span>跟随自转的固定地点</span>
            </div>
          </div>
          <details class="legend-model-note">
            <summary>教学模型说明<span>形变与距离均非真实比例</span></summary>
            <p>地球示意假设全球被海洋覆盖、地轴垂直轨道面，未计太阳和海岸地形对潮汐的影响。岸边小岛用于观察水位升降；水层厚度与潮汐形变均已放大，地球和岛体保持固定形状。</p>
            <p>采用地心参考系与平均周期的匀速圆轨道，不展示地球绕太阳公转、轨道偏心和摄动。地球自转、月球公转与同步自转共用同一时间倍率；关闭运动开关后属于分项演示。时间统一为时分秒，超过 {{ solarDayLabel }} 的时长仍累计小时。</p>
            <p>月球也在拉动整个地球。比较同质量物体，近月侧受到的月球引力强于地心处，背月侧弱于地心处；扣除地心的共同加速度后，两侧的差值方向均指向外侧，因此形成两个隆起。背月侧并不是受到月球的排斥。金色箭头表示月球引力，青色箭头表示引潮作用；移动亮点只提示作用方向，不表示海水流向。</p>
          </details>
        </div>
      </FloatingFeatureCard>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'

import FloatingFeatureCard from '@/components/common/FloatingFeatureCard.vue'
import TideObservationPane from './TideObservationPane.vue'
import TideDataPanel from './TideDataPanel.vue'
import { SceneStroke, type StrokeStyle } from './scene-stroke'
import { TidalForceField } from './tidal-forces'
import { createEarthSurfaceMaterial, createEarthAtmosphereMaterial, type EarthUniforms } from './earth-material'

import '@/styles/geo-page-template.css'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

import {
  advanceAngles,
  EARTH_DEGREES_PER_HOUR,
  EARTH_RADIUS,
  equilibriumHeight,
  formatDurationHours,
  LUNAR_DAY_HOURS,
  MEAN_SEA_RADIUS,
  MOON_DEGREES_PER_HOUR,
  normalizeDegrees,
  observerTide,
  seaRadius,
  SIDEREAL_DAY_HOURS,
  SIDEREAL_MONTH_HOURS,
  SIMULATION_HOURS_PER_SECOND,
  simulationHoursForElapsedSeconds,
} from './tide-model'

// 与地球运动页面共用同源贴图路径和 TextureLoader 加载方式。
const SAME_ORIGIN_TEXTURE_BASE =
  '/geo-resources-folder/images/'

const EARTH_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'Material.002_diffuse.jpg'

const EARTH_NIGHT_TEXTURE = SAME_ORIGIN_TEXTURE_BASE + 'emissive.jpg'

const MOON_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'moon.jpg'

const threeContainerRef = ref<HTMLElement | null>(null)


const moonOrbitEnabled = ref(true)
const earthRotationEnabled = ref(true)
const showTideLayer = ref(true)
const showForceVisualization = ref(true)
const forceMode = ref<'gravity' | 'tidal'>('tidal')
const highlightDeformation = ref(true)
const deformationStrength = ref(1.2)
const showBarycenter = ref(false)
const showEarthMoonLine = ref(true)
const showEarthAxis = ref(true)

const moonAngleDeg = ref(90)
const earthRotationDeg = ref(90)
const playbackSpeed = ref(1)
const isPlaying = ref(true)
const currentView = ref('top')
const selectedObject = ref<'earth' | 'moon' | 'tide' | 'barycenter'>('earth')
const panelsVisible = ref(true)
const controlPanelCollapsed = ref(true)
const dataPanelCollapsed = ref(true)
const legendPanelCollapsed = ref(true)
const observationVisible = ref(false)
// Once opened, keep the coastal scene mounted so toggling preserves its camera.
const observationMounted = ref(false)
const splitStageRef = ref<HTMLElement | null>(null)
const splitPercent = ref(50)
const splitResizing = ref(false)
const splitMin = 25
let splitHandle: HTMLElement | null = null
let splitPointerId: number | null = null

const nearTideLabelRef = ref<HTMLElement | null>(null)
const farTideLabelRef = ref<HTMLElement | null>(null)
const nearCauseLeaderRef = ref<SVGLineElement | null>(null)
const farCauseLeaderRef = ref<SVGLineElement | null>(null)
const lowTideLabelRef = ref<HTMLElement | null>(null)
const oppositeLowTideLabelRef = ref<HTMLElement | null>(null)
const observerLabelRef = ref<HTMLElement | null>(null)
const moonLabelRef = ref<HTMLElement | null>(null)

const localTide = computed(() => observerTide(
  earthRotationDeg.value, moonAngleDeg.value, earthRotationEnabled.value, moonOrbitEnabled.value,
))
const earthPeriodLabel = formatDurationHours(SIDEREAL_DAY_HOURS)
const moonPeriodLabel = formatDurationHours(SIDEREAL_MONTH_HOURS)
const solarDayLabel = formatDurationHours(24)
const lunarDayLabel = formatDurationHours(LUNAR_DAY_HOURS)
const highTideIntervalLabel = formatDurationHours(LUNAR_DAY_HOURS / 2)
const rotationsPerLunarOrbit = (SIDEREAL_MONTH_HOURS / SIDEREAL_DAY_HOURS).toFixed(2)
// Same order for both: Earth spin, Moon orbit, Moon spin. Periods and angular
// speeds are reciprocal, not the same ratio.
const periodRatio = `1 : ${rotationsPerLunarOrbit} : ${rotationsPerLunarOrbit}`
const angularSpeedRatio = `${rotationsPerLunarOrbit} : 1 : 1`
const timeScaleLabel = computed(() =>
  `现实 ${formatDurationHours(1 / 3600)} = 模拟 ${formatDurationHours(SIMULATION_HOURS_PER_SECOND * playbackSpeed.value)}`,
)
const motionModeLabel = computed(() => earthRotationEnabled.value && moonOrbitEnabled.value
  ? '按真实周期比例联动' : '分项演示（不对应真实联动）')

function setCoastStage(phase: number) {
  isPlaying.value = false
  earthRotationEnabled.value = true
  moonOrbitEnabled.value = true
  const advance = normalizeDegrees(phase - (earthRotationDeg.value - moonAngleDeg.value))
  const hours = advance / (EARTH_DEGREES_PER_HOUR - MOON_DEGREES_PER_HOUR)
  const next = advanceAngles(earthRotationDeg.value, moonAngleDeg.value, hours, true, true)
  earthRotationDeg.value = next.earth
  moonAngleDeg.value = next.moon
}
const motionPeriodLabel = computed(() => earthRotationEnabled.value && moonOrbitEnabled.value
  ? `模型相邻高潮 ≈ ${highTideIntervalLabel}`
  : '单独运动演示 · 不对应真实周期')
const speedOptions = [0.25, 0.5, 1, 2]

const viewOptions = [
  { label: '全景', value: 'overview' },
  { label: '俯视', value: 'top' },
  { label: '侧视', value: 'side' },
  { label: '地球近景', value: 'earth' },
]

const normalizedMoonAngle = computed(() => {
  const value = moonAngleDeg.value % 360
  return value < 0 ? value + 360 : value
})

const moonQuadrantLabel = computed(() => {
  const angle = normalizedMoonAngle.value
  if (angle < 45 || angle >= 315) return '轨道 0° 方向'
  if (angle < 135) return '轨道 90° 方向'
  if (angle < 225) return '轨道 180° 方向'
  return '轨道 270° 方向'
})

const tideStatus = computed(() => {
  const angle = normalizedMoonAngle.value
  const axisText = `${Math.round(angle)}°—${Math.round((angle + 180) % 360)}°`

  return {
    title: '理想化月球潮汐',
    subtitle: `高潮轴 ${axisText}`,
    description:
      `近月侧与背月侧沿 ${axisText} 方向形成双隆起；垂直于地月连线的环带为低潮区。`,
  }
})

const liveDataMetrics = computed(() => {
  const objectInfo = selectedObjectInfo.value
  const primaryMetric = objectInfo.metrics[0]!

  return [
    {
      label: '月球位置角',
      value: `${Math.round(normalizedMoonAngle.value)}°`,
      description: moonQuadrantLabel.value,
    },
    {
      label: '当前选中对象',
      value: `${objectInfo.symbol} ${objectInfo.name}`,
      description: objectInfo.description,
    },
    {
      label: primaryMetric.label,
      value: primaryMetric.value,
      description: `${objectInfo.name}的关键数据`,
    },
    {
      label: '形变显示倍率',
      value: !showTideLayer.value
        ? '已隐藏'
        : highlightDeformation.value
          ? `${deformationStrength.value.toFixed(1)}×`
          : '基础示意',
      description: showTideLayer.value
        ? '潮汐隆起采用课堂放大示意'
        : '潮汐形变层当前未显示',
    },
    {
      label: '平均地月距离',
      value: '约 38.44 万 km',
      description: '场景距离未按实际比例绘制',
    },
  ]
})

const periodDataMetrics = computed(() => [
  {
    label: '地球恒星自转周期',
    value: `约 ${earthPeriodLabel}`,
    description: `太阳日为 ${solarDayLabel}；本模型采用相对恒星的自转周期`,
  },
  {
    label: '月球公转／同步自转周期',
    value: `约 ${moonPeriodLabel}`,
    description: `公转与自转周期相同；每公转一周，地球约自转 ${rotationsPerLunarOrbit} 周`,
  },
  {
    label: '相邻高潮间隔',
    value: earthRotationEnabled.value && moonOrbitEnabled.value ? `约 ${highTideIntervalLabel}` : '单独运动演示',
    description: `按模型平均周期计算，太阴日约 ${lunarDayLabel}；实际海岸潮时因地而异`,
  },
])

const selectedObjectInfo = computed(() => {
  if (selectedObject.value === 'moon') {
    return {
      name: '月球',
      symbol: '☾',
      description: '月球引潮力是形成地球海洋潮汐的主要天文因素。',
      metrics: [
        { label: '平均半径', value: '约 1737 km' },
        { label: '平均距离', value: '约 38.44 万 km' },
        { label: '公转／同步自转周期', value: `约 ${moonPeriodLabel}` },
      ],
    }
  }

  if (selectedObject.value === 'tide') {
    return {
      name: '潮汐形变层',
      symbol: '≈',
      description: '珊瑚色轮廓表示高潮隆起，青绿色轮廓表示低于参考海面的低潮区。',
      metrics: [
        { label: '高潮方向', value: `${Math.round(normalizedMoonAngle.value)}° / ${Math.round((normalizedMoonAngle.value + 180) % 360)}°` },
        { label: '低潮方向', value: `${Math.round((normalizedMoonAngle.value + 90) % 360)}° / ${Math.round((normalizedMoonAngle.value + 270) % 360)}°` },
        { label: '显示倍率', value: `${deformationStrength.value.toFixed(1)}×` },
      ],
    }
  }

  if (selectedObject.value === 'barycenter') {
    return {
      name: '地月共同质心',
      symbol: '⊙',
      description: '地月共同质心位于地球内部；此处采用地心参考系，地球保持居中。',
      metrics: [
        { label: '距地心', value: '约 4670 km' },
        { label: '相对位置', value: '地球内部' },
        { label: '教学作用', value: '解释背月侧潮汐隆起' },
      ],
    }
  }

  return {
    name: '地球',
    symbol: '⊕',
    description: '地球自转使同一地点周期性通过两个高潮区和两个低潮区。',
    metrics: [
      { label: '平均半径', value: '约 6371 km' },
      { label: '恒星自转周期', value: `约 ${earthPeriodLabel}` },
      { label: '本模型地轴', value: '垂直轨道面' },
    ],
  }
})

const MOON_RADIUS = 0.78
// Compress the displayed distance so a complete orbit fits between the toolbar and timeline.
const MOON_ORBIT_RADIUS = 6.4
const EARTH_BARY_RADIUS = EARTH_RADIUS * 0.73
const EARTH_AXIS_TILT = 0
const ORTHOGRAPHIC_SIZE = 10

let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let sceneResizePending = false
let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0

let earthCenterGroup: THREE.Group | null = null
let earthTiltGroup: THREE.Group | null = null
let earthSpinGroup: THREE.Group | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let moonMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let tideMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null
let orbitLine: SceneStroke | null = null
let earthMoonLine: SceneStroke | null = null
let earthAxisLine: SceneStroke | null = null
let barycenterGroup: THREE.Group | null = null
let barycenterLine: SceneStroke | null = null
let observerMarker: THREE.Mesh | null = null
let observerStem: SceneStroke | null = null
let tideOutline: SceneStroke | null = null
let meanSeaLine: SceneStroke | null = null
let tidalForceField: TidalForceField | null = null
let tideBaseDirections: Float32Array | null = null
let lastTideStrength = -1
let stars: THREE.Points | null = null

let earthMaterial: THREE.ShaderMaterial | null = null
let moonMaterial: THREE.ShaderMaterial | null = null
let tideMaterial: THREE.ShaderMaterial | null = null

const registeredGeometries: THREE.BufferGeometry[] = []
const registeredMaterials: THREE.Material[] = []
const registeredTextures: THREE.Texture[] = []
const sceneStrokes: SceneStroke[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let previousSceneFrameTime =
  performance.now()

const baseZAxis = new THREE.Vector3(0, 0, 1)
const tmpEarthPosition = new THREE.Vector3()
const tmpMoonPosition = new THREE.Vector3()
const tmpDirection = new THREE.Vector3()

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
  registeredGeometries.push(geometry)
  return geometry
}

function registerMaterial<T extends THREE.Material>(material: T): T {
  registeredMaterials.push(material)
  return material
}

function registerTexture<T extends THREE.Texture>(texture: T): T {
  registeredTextures.push(texture)
  return texture
}

function createStroke(positions: number[] | Float32Array, style: StrokeStyle) {
  const stroke = new SceneStroke(positions, style)
  sceneStrokes.push(stroke)
  return stroke
}

function createOrbitLine(radius: number) {
  const points: number[] = []
  const segments = 360
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    points.push(Math.sin(angle) * radius, 0, Math.cos(angle) * radius)
  }
  const orbit = createStroke(points, {
    color: '#8caac9', width: 1.25, opacity: 0.64, glowWidth: 4, glowOpacity: 0.08,
  })
  const ticks: number[] = []
  const colors: number[] = []
  for (let index = 0; index < 48; index++) {
    const angle = index / 48 * Math.PI * 2
    const major = index % 12 === 0
    const start = radius + 0.12
    const end = start + (major ? 0.26 : index % 4 === 0 ? 0.14 : 0.07)
    ticks.push(Math.sin(angle) * start, 0, Math.cos(angle) * start,
      Math.sin(angle) * end, 0, Math.cos(angle) * end)
    const color = new THREE.Color(major ? '#bdd7ee' : '#66809e')
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
  }
  const graduations = createStroke(ticks, { width: 1.4, opacity: 0.8, vertexColors: true, segments: true })
  graduations.setColors(colors)
  orbit.add(graduations)
  return orbit
}

function createDynamicLine(style: StrokeStyle) {
  return createStroke([0, 0, 0, 0, 0, 0.01], style)
}

function updateLinePositions(
  line: SceneStroke | null,
  start: THREE.Vector3,
  end: THREE.Vector3,
) {
  if (!line) return
  line.setPositions([start.x, start.y, start.z, end.x, end.y, end.z])
}

function createStars() {
  const count = 950
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const radius = 34 + Math.random() * 18
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }

  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = registerMaterial(
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  )

  stars = new THREE.Points(geometry, material)
  scene?.add(stars)
}

function createFallbackTexture(
  primaryColor: string,
  secondaryColor: string,
) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建天体备用纹理')
  }

  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height,
  )
  gradient.addColorStop(0, primaryColor)
  gradient.addColorStop(1, secondaryColor)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 150; index += 1) {
    context.fillStyle =
      `rgba(255,255,255,${0.04 + Math.random() * 0.12})`
    context.beginPath()
    context.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      0.5 + Math.random() * 2.2,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  const texture = registerTexture(
    new THREE.CanvasTexture(canvas),
  )
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

const nightFallbackTexture = registerTexture(
  new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1),
)
nightFallbackTexture.colorSpace = THREE.SRGBColorSpace
nightFallbackTexture.needsUpdate = true

const earthUniforms: EarthUniforms = {
  uMap: {
    value: createFallbackTexture(
      '#1a66a2',
      '#2a99c9',
    ) as THREE.Texture,
  },
  uLightDirection: {
    value: new THREE.Vector3(
      -0.72,
      0.46,
      0.52,
    ).normalize(),
  },
  uNightMap: { value: nightFallbackTexture },
  uOpacity: { value: 1 },
  uAtmosphereDayColor: { value: new THREE.Color('#4db2ff') },
  uAtmosphereTwilightColor: { value: new THREE.Color('#bc490b') },
}

const moonUniforms = {
  uMap: {
    value: createFallbackTexture(
      '#8d9299',
      '#c7c9cc',
    ) as THREE.Texture,
  },
  uLightDirection: {
    value: new THREE.Vector3(
      -0.72,
      0.46,
      0.52,
    ).normalize(),
  },
  uAmbient: { value: 0.23 },
  uDiffuse: { value: 1.12 },
  uSpecular: { value: 0.06 },
  uShininess: { value: 10 },
  uRimStrength: { value: 0.08 },
  uOpacity: { value: 1 },
  uTint: {
    value: new THREE.Color('#e8e8e8'),
  },
}

function createCelestialSphereMaterial(
  uniforms: typeof moonUniforms,
) {
  return registerMaterial(
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;

          vec4 worldPosition =
            modelMatrix *
            vec4(position, 1.0);

          vWorldPosition =
            worldPosition.xyz;

          vWorldNormal =
            normalize(
              mat3(modelMatrix) *
              normal
            );

          gl_Position =
            projectionMatrix *
            viewMatrix *
            worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uLightDirection;
        uniform float uAmbient;
        uniform float uDiffuse;
        uniform float uSpecular;
        uniform float uShininess;
        uniform float uRimStrength;
        uniform float uOpacity;
        uniform vec3 uTint;

        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normalDirection =
            normalize(vWorldNormal);

          vec3 lightDirection =
            normalize(uLightDirection);

          vec3 viewDirection =
            normalize(
              cameraPosition -
              vWorldPosition
            );

          float diffuseAmount =
            max(
              dot(
                normalDirection,
                lightDirection
              ),
              0.0
            );

          vec3 halfDirection =
            normalize(
              lightDirection +
              viewDirection
            );

          float specularAmount =
            pow(
              max(
                dot(
                  normalDirection,
                  halfDirection
                ),
                0.0
              ),
              uShininess
            ) *
            step(
              0.001,
              diffuseAmount
            );

          float rimAmount =
            pow(
              1.0 -
              max(
                dot(
                  normalDirection,
                  viewDirection
                ),
                0.0
              ),
              2.3
            );

          vec3 surfaceColor =
            texture2D(
              uMap,
              vUv
            ).rgb *
            uTint;

          vec3 shadedColor =
            surfaceColor *
            (
              uAmbient +
              diffuseAmount *
              uDiffuse
            );

          shadedColor +=
            vec3(1.0) *
            specularAmount *
            uSpecular;

          shadedColor +=
            surfaceColor *
            rimAmount *
            uRimStrength;

          gl_FragColor =
            vec4(
              shadedColor,
              uOpacity
            );
        }
      `,
      transparent: true,
      depthWrite: true,
    }),
  )
}

function configureCelestialTexture(
  texture: THREE.Texture,
) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true

  if (renderer) {
    texture.anisotropy = Math.min(
      8,
      renderer.capabilities.getMaxAnisotropy(),
    )
  }

  texture.needsUpdate = true
  return texture
}

function loadCelestialTextures() {
  const activeRenderer = renderer
  if (!activeRenderer) return

  const textureLoader = new THREE.TextureLoader()

  const loadTexture = (
    url: string,
    targetUniform: THREE.IUniform<THREE.Texture>,
  ) => {
    // TextureLoader 使用普通图片和默认 flipY，与地球运动页面保持一致。
    // 加载中的纹理也纳入清理，迟到的回调不能重新绑定已卸载的场景。
    const texture = textureLoader.load(
      url,
      (loadedTexture) => {
        if (renderer !== activeRenderer) {
          loadedTexture.dispose()
          return
        }

        targetUniform.value = configureCelestialTexture(loadedTexture)
      },
      undefined,
      (error) => {
        if (renderer !== activeRenderer) return

        console.warn('[潮汐现象] 纹理加载失败，保留球面占位材质：', url, error)
      },
    )
    registerTexture(texture)
  }

  loadTexture(EARTH_SAME_ORIGIN_TEXTURE, earthUniforms.uMap)
  loadTexture(EARTH_NIGHT_TEXTURE, earthUniforms.uNightMap)
  loadTexture(MOON_SAME_ORIGIN_TEXTURE, moonUniforms.uMap)
}

const virtualSunPosition =
  new THREE.Vector3(
    -18,
    10,
    15,
  )

const earthWorldPosition =
  new THREE.Vector3()

const moonWorldPosition =
  new THREE.Vector3()

function updateCelestialLightUniforms() {
  if (earthMesh) {
    earthMesh.getWorldPosition(
      earthWorldPosition,
    )

    earthUniforms
      .uLightDirection
      .value
      .copy(virtualSunPosition)
      .sub(earthWorldPosition)
      .normalize()
  }

  if (moonMesh) {
    moonMesh.getWorldPosition(
      moonWorldPosition,
    )

    moonUniforms
      .uLightDirection
      .value
      .copy(virtualSunPosition)
      .sub(moonWorldPosition)
      .normalize()
  }
}

function createTideMaterial() {
  const material = registerMaterial(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      uniforms: {
        uOpacity: { value: 1 },
      },
      vertexShader: `
        varying vec3 vLocalNormal;
        varying vec3 vViewNormal;
        varying vec3 vViewDirection;
        void main() {
          vLocalNormal = normalize(position);
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vViewNormal = normalize(normalMatrix * normal);
          vViewDirection = -viewPosition.xyz;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vLocalNormal;
        varying vec3 vViewNormal;
        varying vec3 vViewDirection;

        void main() {
          float axisValue = abs(normalize(vLocalNormal).z);
          vec3 color = mix(vec3(0.20, 0.82, 0.75), vec3(1.0, 0.46, 0.38), smoothstep(0.45, 0.9, axisValue));
          float rim = pow(1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDirection))), 3.0);
          float alpha = 0.025 + rim * 0.24;
          gl_FragColor = vec4(color, alpha * uOpacity);
        }
      `,
    }),
  )

  material.blending = THREE.NormalBlending
  material.polygonOffset = true
  material.polygonOffsetFactor = -1
  material.polygonOffsetUnits = -1
  return material
}

function createSeaReferences() {
  if (!scene || !tideMesh) return
  const baselinePoints = Array.from({ length: 257 }, (_, index) => {
    const angle = index / 256 * Math.PI * 2
    return [Math.sin(angle) * MEAN_SEA_RADIUS, 0, Math.cos(angle) * MEAN_SEA_RADIUS]
  }).flat()
  meanSeaLine = createStroke(baselinePoints, {
    color: '#c3d3ed', width: 1.1, opacity: 0.64, dashSize: 0.13, gapSize: 0.11,
  })
  scene.add(meanSeaLine)

  const colors = new Float32Array(257 * 3)
  const high = new THREE.Color('#ff8975')
  const low = new THREE.Color('#48dcc8')
  for (let index = 0; index <= 256; index += 1) {
    const height = equilibriumHeight(Math.cos(index / 256 * Math.PI * 2))
    const color = low.clone().lerp(high, THREE.MathUtils.smoothstep(height, -0.15, 0.75))
    color.toArray(colors, index * 3)
  }
  tideOutline = createStroke(baselinePoints, {
    width: 2.4, opacity: 0.98, vertexColors: true, glowWidth: 8, glowOpacity: 0.2,
  })
  tideOutline.setColors(colors)
  scene.add(tideOutline)
  const positions = tideMesh.geometry.getAttribute('position')
  tideBaseDirections = new Float32Array(positions.count * 3)
  const direction = new THREE.Vector3()
  for (let index = 0; index < positions.count; index += 1) {
    direction.fromBufferAttribute(positions, index).normalize().toArray(tideBaseDirections, index * 3)
  }
}

function updateSeaGeometry(strength: number) {
  if (!tideMesh || !tideOutline || !tideBaseDirections || strength === lastTideStrength) return
  lastTideStrength = strength
  const positions = tideMesh.geometry.getAttribute('position') as THREE.BufferAttribute
  const directions = tideBaseDirections
  for (let index = 0; index < positions.count; index += 1) {
    const x = directions[index * 3]!
    const y = directions[index * 3 + 1]!
    const z = directions[index * 3 + 2]!
    const radius = seaRadius(z, strength)
    positions.setXYZ(index, x * radius, y * radius, z * radius)
  }
  positions.needsUpdate = true
  tideMesh.geometry.computeVertexNormals()
  tideMesh.geometry.computeBoundingSphere()
  const outline = new Float32Array(257 * 3)
  for (let index = 0; index <= 256; index += 1) {
    const angle = index / 256 * Math.PI * 2
    const radius = seaRadius(Math.cos(angle), strength)
    outline[index * 3] = Math.sin(angle) * radius
    outline[index * 3 + 2] = Math.cos(angle) * radius
  }
  tideOutline.setPositions(outline)
}

function updateTideCauseLabels(width: number, height: number, radius: number) {
  if (!camera || !nearTideLabelRef.value || !farTideLabelRef.value) return
  const nearLabel = nearTideLabelRef.value
  const farLabel = farTideLabelRef.value
  const visible = showTideLayer.value || showForceVisualization.value
  for (const element of [nearLabel, farLabel, nearCauseLeaderRef.value, farCauseLeaderRef.value]) {
    if (element) element.style.display = visible ? 'block' : 'none'
  }
  if (!visible) return

  const toScreen = (point: THREE.Vector3) => {
    point.project(camera!)
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 }
  }
  const center = toScreen(tmpEarthPosition.clone())
  const near = toScreen(tmpEarthPosition.clone().addScaledVector(tmpDirection, radius))
  const far = toScreen(tmpEarthPosition.clone().addScaledVector(tmpDirection, -radius))
  const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const rim = toScreen(tmpEarthPosition.clone().addScaledVector(cameraRight, radius))
  const screenRadius = Math.hypot(rim.x - center.x, rim.y - center.y)
  const separation = Math.hypot(near.x - far.x, near.y - far.y)
  // Looking along the Earth–Moon line projects both sides to nearly the same
  // point. Separate their callouts instead of hiding either explanation.
  const dx = separation > 20 ? (near.x - far.x) / separation : 1
  const dy = separation > 20 ? (near.y - far.y) / separation : 0
  const nearSize = { width: nearLabel.offsetWidth, height: nearLabel.offsetHeight }
  const farSize = { width: farLabel.offsetWidth, height: farLabel.offsetHeight }
  const top = showForceVisualization.value ? 164 : 94
  const bottom = Math.max(top + Math.max(nearSize.height, farSize.height), height - 126)
  const clampLabel = (point: { x: number; y: number }, size: typeof nearSize) => ({
    x: THREE.MathUtils.clamp(point.x, size.width / 2 + 10, width - size.width / 2 - 10),
    y: THREE.MathUtils.clamp(point.y, top + size.height / 2, bottom - size.height / 2),
  })
  const offset = screenRadius + Math.abs(dx) * Math.max(nearSize.width, farSize.width) / 2
    + Math.abs(dy) * Math.max(nearSize.height, farSize.height) / 2 + 20
  // Move callouts off the Earth–Moon line so neither covers the Moon or arrows.
  const normalSign = dx > 0 ? -1 : 1
  const normalX = -dy * normalSign
  const normalY = dx * normalSign
  const normalOffset = Math.abs(normalX) * Math.max(nearSize.width, farSize.width) / 2
    + Math.abs(normalY) * Math.max(nearSize.height, farSize.height) / 2 + 36
  let nearPosition = clampLabel({ x: center.x + dx * offset + normalX * normalOffset,
    y: center.y + dy * offset + normalY * normalOffset }, nearSize)
  let farPosition = clampLabel({ x: center.x - dx * offset + normalX * normalOffset,
    y: center.y - dy * offset + normalY * normalOffset }, farSize)
  const overlaps = Math.abs(nearPosition.x - farPosition.x) < (nearSize.width + farSize.width) / 2 + 12
    && Math.abs(nearPosition.y - farPosition.y) < (nearSize.height + farSize.height) / 2 + 12
  if (overlaps) {
    // Narrow split panes have insufficient horizontal space: stack callouts.
    nearPosition = clampLabel({ x: width / 2, y: top + nearSize.height / 2 }, nearSize)
    farPosition = clampLabel({ x: width / 2, y: bottom - farSize.height / 2 }, farSize)
  }
  const place = (label: HTMLElement, leader: SVGLineElement | null, position: typeof near, anchor: typeof near) => {
    label.style.left = `${position.x}px`
    label.style.top = `${position.y}px`
    if (!leader) return
    leader.setAttribute('x1', String(anchor.x))
    leader.setAttribute('y1', String(anchor.y))
    leader.setAttribute('x2', String(position.x))
    leader.setAttribute('y2', String(position.y))
  }
  place(nearLabel, nearCauseLeaderRef.value, nearPosition, near)
  place(farLabel, farCauseLeaderRef.value, farPosition, far)
}

function updateSceneAnnotations() {
  if (!camera || !threeContainerRef.value) return
  const width = threeContainerRef.value.clientWidth
  const height = threeContainerRef.value.clientHeight
  const project = (element: HTMLElement | null, point: THREE.Vector3, visible = true) => {
    if (!element) return
    const position = point.project(camera!)
    element.style.display = visible && Math.abs(position.x) < 0.96 && Math.abs(position.y) < 0.9 ? 'block' : 'none'
    element.style.left = `${(position.x + 1) * width / 2}px`
    element.style.top = `${(1 - position.y) * height / 2}px`
  }
  const direction = tmpDirection.clone()
  const strength = highlightDeformation.value ? deformationStrength.value : 0.45
  const fromAbove = Math.abs(camera.getWorldDirection(new THREE.Vector3()).y) > 0.8
  updateTideCauseLabels(width, height, showTideLayer.value ? seaRadius(1, strength) : EARTH_RADIUS)
  project(lowTideLabelRef.value, new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(seaRadius(0, strength) + 0.55), showTideLayer.value && fromAbove)
  project(oppositeLowTideLabelRef.value, new THREE.Vector3(direction.z, 0, -direction.x).multiplyScalar(seaRadius(0, strength) + 0.55), showTideLayer.value && fromAbove)
  if (observerMarker) {
    const point = observerMarker.getWorldPosition(new THREE.Vector3())
    const towardCamera = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize()
    const visible = point.dot(towardCamera) > -0.15
    // Keep A inside the reference globe so it cannot cover the high-water labels.
    project(observerLabelRef.value, point.normalize().multiplyScalar(EARTH_RADIUS * 0.88), visible)
  }
  project(moonLabelRef.value, tmpMoonPosition.clone().add(new THREE.Vector3(0, 0, 1.3)))
}

function createCelestialScene() {
  if (!scene) return

  earthCenterGroup = new THREE.Group()
  earthTiltGroup = new THREE.Group()
  earthTiltGroup.rotation.z = EARTH_AXIS_TILT
  earthSpinGroup = new THREE.Group()

  earthMaterial = registerMaterial(createEarthSurfaceMaterial(earthUniforms))

  earthMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        EARTH_RADIUS,
        128,
        96,
      ),
    ),
    earthMaterial,
  )
  earthMesh.userData.objectType = 'earth'
  earthMesh.renderOrder = 1
  earthSpinGroup.add(earthMesh)

  const atmosphere = new THREE.Mesh(
    // Keep the halo inside even the most exaggerated low-water contour.
    registerGeometry(new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 96, 96)),
    registerMaterial(createEarthAtmosphereMaterial(earthUniforms)),
  )
  atmosphere.renderOrder = 2
  earthSpinGroup.add(atmosphere)

  observerMarker = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.09, 18, 12)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xffdc55,
      }),
    ),
  )
  observerMarker.position.set(0, 0, EARTH_RADIUS + 0.08)
  earthSpinGroup.add(observerMarker)
  observerStem = createDynamicLine({ color: '#ffe080', width: 1.8, opacity: 0.95, glowWidth: 5, glowOpacity: 0.12 })
  earthSpinGroup.add(observerStem)

  earthAxisLine = createStroke([0, -4.1, 0, 0, 4.1, 0], {
    color: '#b5b9e5', width: 1.4, opacity: 0.7, dashSize: 0.22, gapSize: 0.13,
  })

  earthTiltGroup.add(earthSpinGroup)
  earthTiltGroup.add(earthAxisLine)
  earthCenterGroup.add(earthTiltGroup)
  scene.add(earthCenterGroup)

  tideMaterial = createTideMaterial()
  tideMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        EARTH_RADIUS,
        128,
        96,
      ),
    ),
    tideMaterial,
  )
  tideMesh.renderOrder = 4
  tideMesh.userData.objectType = 'tide'
  scene.add(tideMesh)
  createSeaReferences()

  moonMaterial =
    createCelestialSphereMaterial(
      moonUniforms,
    )

  moonMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        MOON_RADIUS,
        96,
        72,
      ),
    ),
    moonMaterial,
  )
  moonMesh.userData.objectType = 'moon'
  moonMesh.renderOrder = 1
  scene.add(moonMesh)

  orbitLine = createOrbitLine(MOON_ORBIT_RADIUS)
  scene.add(orbitLine)

  earthMoonLine = createDynamicLine({ color: '#7ee8d4', width: 1.8, opacity: 0.86, glowWidth: 6, glowOpacity: 0.1 })
  earthMoonLine.renderOrder = 5
  scene.add(earthMoonLine)

  barycenterGroup = new THREE.Group()
  const barycenterCore = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.16, 24, 16)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xff5c5c,
        depthTest: false,
      }),
    ),
  )
  barycenterCore.userData.objectType = 'barycenter'
  barycenterGroup.add(barycenterCore)

  const barycenterRing = new THREE.Mesh(
    registerGeometry(new THREE.TorusGeometry(0.32, 0.035, 10, 42)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xff7c7c,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      }),
    ),
  )
  barycenterRing.rotation.x = Math.PI / 2
  barycenterRing.userData.objectType = 'barycenter'
  barycenterGroup.add(barycenterRing)
  scene.add(barycenterGroup)

  barycenterLine = createDynamicLine({ color: '#f39f9a', width: 1.5, opacity: 0.78, dashSize: 0.08, gapSize: 0.14 })
  updateLinePositions(
    barycenterLine,
    new THREE.Vector3(0, -4.4, 0),
    new THREE.Vector3(0, 4.4, 0),
  )
  scene.add(barycenterLine)

  tidalForceField = new TidalForceField()
  scene.add(tidalForceField)

  loadCelestialTextures()

  updateScenePositions()
  updateLayerVisibility()
}

function getEarthAndMoonPositions() {
  const angle = THREE.MathUtils.degToRad(normalizedMoonAngle.value)
  tmpMoonPosition.set(
    Math.sin(angle) * MOON_ORBIT_RADIUS,
    0,
    Math.cos(angle) * MOON_ORBIT_RADIUS,
  )
  // Geocentric display: the observer's motion is easier to follow with Earth fixed.
  tmpEarthPosition.set(0, 0, 0)
  return {
    earthPosition: tmpEarthPosition,
    moonPosition: tmpMoonPosition,
  }
}

function updateScenePositions() {
  const { earthPosition, moonPosition } = getEarthAndMoonPositions()

  earthCenterGroup?.position.copy(earthPosition)
  moonMesh?.position.copy(moonPosition)
  tideMesh?.position.copy(earthPosition)

  if (earthSpinGroup) {
    earthSpinGroup.rotation.y = THREE.MathUtils.degToRad(earthRotationDeg.value)
  }

  if (moonMesh) {
    moonMesh.rotation.y = THREE.MathUtils.degToRad(normalizedMoonAngle.value + 90)
  }

  tmpDirection.copy(moonPosition).sub(earthPosition).normalize()

  if (tideMesh) {
    tideMesh.quaternion.setFromUnitVectors(
      baseZAxis,
      tmpDirection,
    )

    const strength = highlightDeformation.value ? deformationStrength.value : 0.45
    updateSeaGeometry(strength)
    tideOutline?.quaternion.copy(tideMesh.quaternion)
    const observerRadius = showTideLayer.value
      ? seaRadius(Math.cos(THREE.MathUtils.degToRad(earthRotationDeg.value - moonAngleDeg.value)), strength) + 0.08
      : EARTH_RADIUS + 0.08
    observerMarker?.position.set(0, 0, observerRadius)
    updateLinePositions(observerStem, new THREE.Vector3(0, 0, EARTH_RADIUS), new THREE.Vector3(0, 0, observerRadius))
  }

  const barycenter = tmpDirection.clone().multiplyScalar(EARTH_BARY_RADIUS)
  barycenterGroup?.position.copy(barycenter)
  barycenterLine?.position.copy(barycenter)

  if (earthMoonLine) {
    const start = earthPosition.clone().addScaledVector(tmpDirection, -EARTH_RADIUS * 1.65)
    const end = moonPosition.clone().addScaledVector(tmpDirection, MOON_RADIUS * 0.4)
    updateLinePositions(earthMoonLine, start, end)
  }

  updateCelestialLightUniforms()
}

function updateLayerVisibility() {
  if (tidalForceField) tidalForceField.visible = showForceVisualization.value
  if (tideMesh) {
    tideMesh.visible = showTideLayer.value
  }
  if (tideOutline) tideOutline.visible = showTideLayer.value
  if (meanSeaLine) meanSeaLine.visible = showTideLayer.value
  if (earthMoonLine) {
    earthMoonLine.visible = showEarthMoonLine.value
  }
  if (earthAxisLine) {
    earthAxisLine.visible = showEarthAxis.value
  }
  if (barycenterGroup) {
    barycenterGroup.visible = showBarycenter.value
  }
  if (barycenterLine) {
    barycenterLine.visible = showBarycenter.value
  }
  if (tideMaterial) {
    tideMaterial.uniforms.uOpacity!.value = 1
  }
}

function setView(view: string) {
  currentView.value = view
  if (!camera || !controls) return

  if (view === 'top') {
    camera.position.set(0, 20, 0.01)
    camera.zoom = 1
    controls.target.set(0, 0, 0)
  } else if (view === 'side') {
    camera.position.set(19, 2.2, 0)
    camera.zoom = 0.92
    controls.target.set(0, 0, 0)
  } else if (view === 'earth') {
    const { earthPosition } = getEarthAndMoonPositions()
    camera.position.copy(earthPosition).add(new THREE.Vector3(8.2, 5.4, 8.2))
    camera.zoom = 1.65
    controls.target.copy(earthPosition)
  } else {
    camera.position.set(14.5, 8.7, 16.5)
    camera.zoom = 1
    controls.target.set(0, 0, 0)
  }

  camera.updateProjectionMatrix()
  controls.update()
}

function focusEarth() {
  setView('earth')
}

function handleCanvasPointerUp(event: PointerEvent) {
  if (!renderer || !camera) return
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  const candidates: THREE.Object3D[] = []

  /*
   * 潮汐形变层隐藏时，不再把 tideMesh 加入射线检测列表。
   * Three.js 的射线检测不能依赖材质透明度判断“是否遮挡”，
   * 因此必须从候选对象中明确排除隐藏的形变层，才能直接点选地球。
   */
  if (earthMesh?.visible) candidates.push(earthMesh)
  if (moonMesh?.visible) candidates.push(moonMesh)

  if (
    showTideLayer.value &&
    tideMesh?.visible
  ) {
    candidates.push(tideMesh)
  }

  if (
    showBarycenter.value &&
    barycenterGroup?.visible
  ) {
    candidates.push(barycenterGroup)
  }

  const intersections = raycaster.intersectObjects(candidates, true)
  const hit = intersections.find((item) => item.object.userData.objectType)
  if (hit?.object.userData.objectType) {
    selectedObject.value = hit.object.userData.objectType
  }
}

function clampSplit(value: number) {
  return Math.max(splitMin, Math.min(100 - splitMin, value))
}

function startSplitResize(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  splitHandle = event.currentTarget as HTMLElement
  splitPointerId = event.pointerId
  splitHandle.setPointerCapture(event.pointerId)
  splitHandle.focus({ preventScroll: true })
  splitResizing.value = true
}

function resizeSplit(event: PointerEvent) {
  if (!splitResizing.value || event.pointerId !== splitPointerId || !splitStageRef.value) return
  const bounds = splitStageRef.value.getBoundingClientRect()
  if (bounds.width > 0) {
    splitPercent.value = clampSplit((event.clientX - bounds.left) / bounds.width * 100)
  }
}

function stopSplitResize() {
  const handle = splitHandle
  const pointer = splitPointerId
  splitHandle = null
  splitPointerId = null
  splitResizing.value = false
  if (handle && pointer !== null && handle.hasPointerCapture(pointer)) {
    handle.releasePointerCapture(pointer)
  }
}

function resizeSplitWithKeyboard(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 2
  const values: Record<string, number> = {
    ArrowLeft: splitPercent.value - step,
    ArrowRight: splitPercent.value + step,
    Home: splitMin,
    End: 100 - splitMin,
    Enter: 50,
  }
  const value = values[event.key]
  if (value === undefined) return
  event.preventDefault()
  splitPercent.value = clampSplit(value)
}

function resizeSceneNow() {
  const container = threeContainerRef.value
  if (!container || !renderer || !camera) return

  const width = Math.max(1, Math.round(container.clientWidth))
  const height = Math.max(1, Math.round(container.clientHeight))

  if (width === lastSceneWidth && height === lastSceneHeight) {
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  const aspect = width / height
  // Fit the orbit to the shorter edge, including narrow tablet split panes.
  const halfHeight = ORTHOGRAPHIC_SIZE / Math.min(aspect, 1)
  camera.left = -halfHeight * aspect
  camera.right = halfHeight * aspect
  camera.top = halfHeight
  camera.bottom = -halfHeight
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
}

function scheduleSceneResize() {
  sceneResizePending = true
}

function animateScene(
  frameTime = performance.now(),
) {
  sceneAnimationFrameId =
    requestAnimationFrame(
      animateScene,
    )

  // Elapsed time keeps the stated speed on slow devices, not just the ratio.
  const delta = Math.max(0, (frameTime - previousSceneFrameTime) / 1000)

  previousSceneFrameTime =
    frameTime

  // Resize immediately before drawing, without clearing the canvas between frames.
  if (sceneResizePending) {
    sceneResizePending = false
    resizeSceneNow()
  }

  if (isPlaying.value && !document.hidden) {
    const next = advanceAngles(
      earthRotationDeg.value, moonAngleDeg.value,
      simulationHoursForElapsedSeconds(delta, playbackSpeed.value),
      earthRotationEnabled.value, moonOrbitEnabled.value,
    )
    earthRotationDeg.value = next.earth
    moonAngleDeg.value = next.moon
  }

  updateScenePositions()
  if (tidalForceField) {
    tidalForceField.visible = showForceVisualization.value
    const strength = highlightDeformation.value ? deformationStrength.value : 0.45
    tidalForceField.update(tmpDirection, showTideLayer.value ? seaRadius(1, strength) : EARTH_RADIUS,
      forceMode.value, delta, isPlaying.value && !document.hidden)
  }
  controls?.update()
  updateSceneAnnotations()

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function initScene() {
  const container = threeContainerRef.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.OrthographicCamera(
    -ORTHOGRAPHIC_SIZE,
    ORTHOGRAPHIC_SIZE,
    ORTHOGRAPHIC_SIZE,
    -ORTHOGRAPHIC_SIZE,
    0.1,
    200,
  )
  camera.position.set(14.5, 8.7, 16.5)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2,
    ),
  )
  renderer.setClearColor(
    0x000000,
    0,
  )
  renderer.outputColorSpace =
    THREE.SRGBColorSpace
  renderer.toneMapping =
    THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure =
    1.08
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = true
  controls.minZoom = 0.55
  controls.maxZoom = 3.2
  controls.target.set(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.78))

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
  keyLight.position.set(-12, 8, 10)
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(0x6cb8ff, 0.55)
  rimLight.position.set(10, -4, -12)
  scene.add(rimLight)

  createStars()
  createCelestialScene()
  resizeSceneNow()
  setView('top')

  renderer.domElement.addEventListener('pointerup', handleCanvasPointerUp)

  resizeObserver = new ResizeObserver(() => {
    scheduleSceneResize()
  })
  resizeObserver.observe(container)

  /*
   * v7 已移除弃用的 THREE.Clock，
   * 初始化动画前同步记录当前时间，避免 mounted 阶段引用不存在的 clock。
   */
  previousSceneFrameTime =
    performance.now()

  animateScene(
    previousSceneFrameTime,
  )
}

function pauseForManualPosition() {
  isPlaying.value = false
}

function resetSceneFrameTime() {
  // Hidden tabs suspend the demonstration; returning must not jump forward.
  previousSceneFrameTime = performance.now()
}

function togglePlay() {
  resetSceneFrameTime()
  isPlaying.value = !isPlaying.value
}

function resetControls() {
  moonOrbitEnabled.value = true
  earthRotationEnabled.value = true
  showTideLayer.value = true
  showForceVisualization.value = true
  forceMode.value = 'tidal'
  highlightDeformation.value = true
  deformationStrength.value = 1.2
  showBarycenter.value = false
  showEarthMoonLine.value = true
  showEarthAxis.value = true
  moonAngleDeg.value = 90
  earthRotationDeg.value = 90
  playbackSpeed.value = 1
  isPlaying.value = true
  selectedObject.value = 'earth'
  updateLayerVisibility()
  updateScenePositions()
  setView('top')
  scheduleSceneResize()
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)

  sceneResizePending = false

  resizeObserver?.disconnect()
  resizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener('pointerup', handleCanvasPointerUp)
  }

  controls?.dispose()
  controls = null

  tidalForceField?.dispose()
  tidalForceField = null

  registeredTextures.forEach((texture) => texture.dispose())
  sceneStrokes.forEach((stroke) => stroke.dispose())
  sceneStrokes.length = 0
  registeredMaterials.forEach((material) => material.dispose())
  registeredGeometries.forEach((geometry) => geometry.dispose())
  registeredTextures.length = 0
  registeredMaterials.length = 0
  registeredGeometries.length = 0

  renderer?.dispose()
  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  scene = null
  camera = null
  renderer = null
  earthCenterGroup = null
  earthTiltGroup = null
  earthSpinGroup = null
  earthMesh = null
  moonMesh = null
  tideMesh = null
  orbitLine = null
  earthMoonLine = null
  earthAxisLine = null
  barycenterGroup = null
  barycenterLine = null
  observerMarker = null
  observerStem = null
  meanSeaLine = null
  tideOutline = null
  tideBaseDirections = null
  lastTideStrength = -1
  stars = null
  earthMaterial = null
  moonMaterial = null
  tideMaterial = null

}

watch(
  [moonAngleDeg, earthRotationDeg, deformationStrength, highlightDeformation],
  () => {
    updateScenePositions()
  },
)

watch(
  [showTideLayer, showBarycenter, showEarthMoonLine, showEarthAxis, highlightDeformation],
  () => {
    updateLayerVisibility()

    /*
     * 若当前选中的是潮汐层，关闭潮汐层后自动回到地球数据，
     * 避免右侧继续显示一个已经不可见、也不可点击的对象。
     */
    if (
      !showTideLayer.value &&
      selectedObject.value === 'tide'
    ) {
      selectedObject.value = 'earth'
    }
  },
)

watch(observationVisible, (visible) => {
  if (visible) observationMounted.value = true
  else stopSplitResize()
  nextTick(scheduleSceneResize)
})

onMounted(async () => {
  await nextTick()
  document.addEventListener('visibilitychange', resetSceneFrameTime)
  initScene()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', resetSceneFrameTime)
  stopSplitResize()
  disposeScene()
})
</script>

<style scoped>
.tidal-phenomenon-container .toolbar-actions {
  max-width: none;
}

.motion-scale-note,
.timeline-time-scale {
  margin: 8px 0 0;
  color: #a4c4d4;
  font-size: 11px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.timeline-time-scale {
  margin-top: 0;
  font-variant-numeric: tabular-nums;
}

.timeline-copy {
  flex-wrap: wrap;
  gap: 2px 8px;
}

.observation-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  cursor: pointer;
  white-space: nowrap;
}

.observation-toggle input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #2ec4b6;
}

.observation-toggle:focus-within {
  outline: 2px solid #65d6dc;
  outline-offset: 3px;
}

.tidal-phenomenon-container .tidal-workspace {
  display: flex;
}

.tidal-workspace > .center-stage,
.observation-stage {
  position: relative;
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  container-type: inline-size;
}

.tidal-workspace > .center-stage {
  width: auto;
}

.observation-stage {
  background: #071b2a;
}

.view-divider {
  position: absolute;
  z-index: 40;
  top: 0;
  bottom: 0;
  width: 24px;
  transform: translateX(-50%);
  cursor: col-resize;
  touch-action: none;
}

.view-divider::before {
  position: absolute;
  content: '';
  top: 0;
  bottom: 0;
  left: 11px;
  width: 2px;
  background: rgba(101, 214, 220, 0.4);
}

.divider-grip {
  position: absolute;
  top: 45%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 24px;
  height: 54px;
  transform: translate(-50%, -50%);
  border: 1px solid #427d8a;
  border-radius: 8px;
  background: #102f40;
  box-shadow: 0 3px 16px #0006;
}

.divider-grip i {
  width: 2px;
  height: 20px;
  border-radius: 2px;
  background: #95cbd6;
}

.view-divider:focus-visible {
  outline: none;
}

.view-divider:hover .divider-grip,
.view-divider:focus-visible .divider-grip,
.is-resizing .divider-grip {
  border-color: #65d6dc;
  outline: 2px solid #65d6dc;
  outline-offset: 2px;
}

.tidal-workspace.is-resizing,
.tidal-workspace.is-resizing * {
  cursor: col-resize !important;
  user-select: none;
}

.tide-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #020711;
  background-image:
    linear-gradient(rgba(2, 7, 19, 0.48), rgba(2, 7, 19, 0.48)),
    url('/geo-resources-folder/images/milky-way-6k.jpg');
  background-position: center, center 46%;
  background-repeat: no-repeat;
  background-size: cover, cover;
}

.force-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 26;
  width: min(290px, calc(100% - 32px));
  box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid #2c4b5d;
  border-radius: 10px;
  background: rgba(5, 22, 34, 0.94);
  color: #c3d9e4;
}

.force-mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.force-mode-options button {
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: #0c2737;
  color: #a9c3d1;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.force-mode-options button[aria-pressed='true'] {
  border-color: #68d8ce;
  background: #173e47;
  color: #c5fff7;
}

.force-mode-options button:focus-visible {
  outline: 2px solid #f6d58b;
  outline-offset: 2px;
}

.force-toolbar p {
  margin: 7px 0 3px;
  font-size: 11px;
  line-height: 1.5;
}

.force-toolbar p i {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: currentColor;
}

.force-copy-gravity { color: #f6d58b; }
.force-copy-tidal { color: #6ee7db; }

.force-toolbar small {
  color: #93b0c1;
  font-size: 10px;
  line-height: 1.5;
}

.show-forces .stage-status-badge {
  top: 120px;
}

.tidal-floating-card.control-floating-card {
  height: min(58vh, 620px);
}

.tidal-floating-card.data-floating-card {
  height: min(62vh, 620px);
}

.tidal-floating-card.data-floating-card:not(.collapsed) {
  width: min(380px, calc(100vw - 36px));
}

.tidal-floating-card.legend-floating-card {
  height: min(470px, calc(100vh - 170px));
}

.tidal-floating-card.collapsed {
  height: auto !important;
}

.tidal-floating-card .panel-scroll {
  height: 100%;
  padding: 12px 12px 6px;
}

.tidal-floating-card.data-floating-card .panel-scroll {
  padding: 0 0 20px;
  background: #071924;
}


.tide-three-host {
  position: absolute;
  z-index: 2;
  inset: 0;
  background:
    transparent !important;
}

.tidal-phenomenon-container .three-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background:
    transparent !important;
}

.view-option-grid {
  margin-bottom: 12px;
}

.stage-status-badge {
  position: absolute;
  top: clamp(74px, 9vh, 92px);
  left: 50%;
  z-index: 35;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 52%;
  padding: 8px 14px;
  color: #eafcff;
  font-size: clamp(11px, 0.8vw, 14px);
  background: rgba(3, 20, 34, 0.82);
  border: 1px solid rgba(70, 222, 212, 0.32);
  border-radius: 999px;
  transform: translateX(-50%);
  pointer-events: none;
}

.stage-status-badge strong {
  white-space: nowrap;
}

.stage-status-badge>span:last-child {
  overflow: hidden;
  color: #91b7c5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #2ec4b6;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.8);
}

.stage-legend {
  color: #dceef5;
  font-size: 11px;
}

.legend-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.legend-model-badge {
  color: #87adbd;
  font-size: 10px;
  border: 1px solid #365062;
  border-radius: 5px;
  padding: 3px 6px;
}

.legend-tide-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.legend-tide-item {
  display: grid;
  gap: 7px;
  padding: 10px 9px;
  border: 1px solid #abcddd14;
  border-radius: 8px;
  background: #a3d4e507;
}

.legend-tide-item strong {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #e6edf3;
}

.legend-tide-item>span {
  color: #a5bdca;
  font-size: 10px;
  white-space: nowrap;
}

.legend-reference-list {
  display: grid;
  gap: 11px;
  margin: 15px 0;
}

.legend-reference-row {
  display: grid;
  grid-template-columns: 24px 65px 1fr;
  align-items: center;
  column-gap: 8px;
}

.legend-reference-row strong {
  font-size: 11px;
  font-weight: 500;
  color: #d3e3eb;
}

.legend-reference-row>span {
  color: #88a5b5;
  font-size: 10px;
}

.legend-observer-swatch {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid #b8963d;
  border-radius: 5px;
  color: #ffe080;
  font: 700 10px/1 sans-serif;
}

.legend-model-note {
  border-top: 1px solid #b5dbea1a;
  padding-top: 10px;
  color: #8ba8b8;
  font-size: 10px;
}

.legend-model-note summary {
  cursor: pointer;
}

.legend-model-note summary>span {
  float: right;
  color: #728d9e;
}

.legend-model-note p {
  margin: 10px 0 0;
  line-height: 1.7;
  color: #a1bbc9;
}

.legend-model-note summary:focus-visible {
  outline: 2px solid #61d8cd;
  outline-offset: 4px;
}

.legend-swatch,
.legend-line {
  width: 22px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.legend-swatch {
  height: 5px;
}

.legend-line {
  height: 3px;
}

.high-tide-swatch {
  background: linear-gradient(90deg, #ffb39c, #ff8975);
  box-shadow: 0 0 7px #ff897545;
}

.low-tide-swatch {
  background: linear-gradient(90deg, #48dcc8, #a2f1db);
  box-shadow: 0 0 7px #48dcc845;
}

.earth-moon-line-swatch {
  height: 2px;
  background: #7ee8d4;
  box-shadow: 0 0 6px #7ee8d444;
}

.orbit-line-swatch {
  position: relative;
  height: 1px;
  background: #8caac9;
}

.orbit-line-swatch::after {
  content: '';
  position: absolute;
  width: 1px;
  height: 7px;
  left: 10px;
  top: -3px;
  background: #bdd7ee;
}

.mean-sea-swatch {
  height: 0;
  border-top: 1px dashed #c3d3ed;
}

.scene-annotations {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.cause-leaders {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cause-leaders line {
  stroke: #9fb8c6;
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: 0.6;
}

.scene-label {
  position: absolute;
  display: none;
  padding: 5px 9px;
  border-radius: 6px;
  background: rgba(2, 12, 24, 0.85);
  font-size: 12px;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.high-label {
  color: #ffad9e;
  transform: translate(-50%, -150%);
}

.tide-cause-label {
  max-width: 194px;
  padding: 9px 11px;
  border: 1px solid rgba(255, 173, 158, 0.3);
  border-radius: 9px;
  background: rgba(5, 20, 33, 0.94);
  white-space: normal;
  text-align: center;
  transform: translate(-50%, -50%);
}

.tide-cause-label strong {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
}

.tide-cause-label small {
  display: block;
  color: #c3d7e1;
  font-size: 11px;
  line-height: 1.6;
}

.low-label {
  color: #69e8d7;
}

.observer-label {
  color: #ffe080;
  font-weight: 800;
  border: 1px solid #b8963d;
}

.moon-label {
  color: #d5e2f2;
}

.tidal-phenomenon-container .workspace.panel-resizing,
.tidal-phenomenon-container .workspace.layout-resizing,
.tidal-phenomenon-container .workspace.panel-resizing .side-panel,
.tidal-phenomenon-container .workspace.layout-resizing .side-panel,
.tidal-phenomenon-container .workspace.panel-resizing .center-stage,
.tidal-phenomenon-container .workspace.layout-resizing .center-stage {
  transition: none !important;
}

@media (max-width: 1100px) {
  .tidal-floating-card.control-floating-card {
    height: min(54vh, 500px);
  }

  .tidal-floating-card.data-floating-card {
    height: min(62vh, 560px);
  }

  .stage-status-badge {
    max-width: 44%;
  }

  .stage-status-badge>span:last-child {
    display: none;
  }

}

@media (max-width: 700px) {
  .scene-label {
    font-size: 10px;
    padding: 3px 5px;
  }

  .stage-status-badge {
    left: 16px;
    transform: none;
    max-width: 48%;
  }
}

@media (max-height: 650px) and (min-width: 701px) {
  .stage-status-badge {
    top: 72px;
  }
}

@container (max-width: 600px) {
  .timeline-dock {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
  }

  .speed-options {
    grid-column: 1 / -1;
    justify-content: center;
  }

  .stage-status-badge {
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    max-width: calc(100% - 24px);
  }

  .stage-status-badge > span:last-child {
    display: none;
  }
}

@media (max-width: 900px) {
  .tidal-phenomenon-container .brand-area {
    max-width: 160px;
  }

  .tidal-phenomenon-container .page-title {
    position: static;
    transform: none;
    max-width: none;
    margin-right: auto;
    font-size: 17px;
    flex-shrink: 0;
  }

  .tidal-phenomenon-container .toolbar-btn {
    min-width: 0;
    padding: 0 9px;
    font-size: 12px;
  }
}

@media (max-width: 620px) {
  .tidal-phenomenon-container .brand-area {
    display: none;
  }

  .tidal-phenomenon-container .page-title {
    font-size: 15px;
  }

  .tidal-phenomenon-container .top-toolbar {
    padding: 0 8px;
    gap: 8px;
  }
}
</style>
