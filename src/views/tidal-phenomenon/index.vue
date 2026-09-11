<template>
  <div class="tidal-phenomenon-container geo-template-page geo-page theme-dark">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">潮汐现象</h1>

      <div class="toolbar-actions">
        <button type="button" class="theme-btn toolbar-btn" @click="focusEarth">
          聚焦地球
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" :aria-pressed="panelsVisible"
          @click="panelsVisible = !panelsVisible">
          {{ panelsVisible ? '隐藏面板' : '显示面板' }}
        </button>
      </div>
    </header>

    <main class="workspace">
      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="controlPanelCollapsed"
        class="tidal-floating-card control-floating-card" title="模拟控制" subtitle="地月运动 · 潮汐形变 · 辅助图层" variant="control"
        :initial-top="84" :initial-right="18" :bottom-inset="96" :min-width="320" :min-height="260" draggable resizable>
        <div class="panel-scroll">
          <section class="geo-card control-section">
            <h3 class="section-title">天体运动</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>月球绕地球公转</strong>
                <span>周期约 27.3 天，与地球自转按同一倍率加速</span>
              </div>
              <el-switch v-model="moonOrbitEnabled" aria-label="月球绕地球公转" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地球自转</strong>
                <span>观察同一地点依次经过高潮与低潮</span>
              </div>
              <el-switch v-model="earthRotationEnabled" aria-label="地球自转" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">潮汐显示</h3>

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
            <div class="section-title-row">
              <h3 class="section-title">月球位置</h3>
              <strong class="control-value">{{ Math.round(moonAngleDeg) }}°</strong>
            </div>

            <el-slider v-model="moonAngleDeg" aria-label="月球位置" :min="0" :max="360" :step="1" :show-tooltip="false"
              @input="pauseForManualPosition" />

            <div class="position-scale">
              <span>0°</span>
              <span>90°</span>
              <span>180°</span>
              <span>270°</span>
              <span>360°</span>
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

      <section class="center-stage">
        <div class="stage-content tide-stage-content">

          <div class="celestial-texture-layer" aria-hidden="true">
            <div ref="earthTextureOverlayRef" class="celestial-texture-sphere earth-texture-sphere"
              :style="{ backgroundImage: `url(${EARTH_TEXTURE_IMAGE})` }"></div>

            <div ref="moonTextureOverlayRef" class="celestial-texture-sphere moon-texture-sphere"
              :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"></div>
          </div>

          <div ref="threeContainerRef" class="scene-host three-host tide-three-host"></div>

          <div class="stage-status-badge">
            <span class="status-dot"></span>
            <strong>{{ tideStatus.title }}</strong>
            <span>{{ tideStatus.subtitle }}</span>
          </div>

          <div class="scene-annotations" aria-hidden="true">
            <span ref="nearTideLabelRef" class="scene-label high-label">近月侧 · 高潮</span>
            <span ref="farTideLabelRef" class="scene-label high-label">背月侧 · 高潮</span>
            <span ref="lowTideLabelRef" class="scene-label low-label">低潮</span>
            <span ref="oppositeLowTideLabelRef" class="scene-label low-label">低潮</span>
            <span ref="observerLabelRef" class="scene-label observer-label">A</span>
            <span ref="moonLabelRef" class="scene-label moon-label">月球</span>
          </div>

          <aside class="stage-legend" aria-label="潮汐图例">
            <div class="legend-heading">
              <h3><span aria-hidden="true">≈</span>潮汐图例</h3>
              <span class="legend-model-badge">理想模型</span>
            </div>
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
            </details>
          </aside>

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
              <span>月球位置 · 拖动暂停</span>
              <strong>{{ Math.round(moonAngleDeg) }}° · {{ moonQuadrantLabel }}</strong>
            </div>

            <el-slider v-model="moonAngleDeg" aria-label="时间栏月球位置" :min="0" :max="360" :step="1" :show-tooltip="false"
              @input="pauseForManualPosition" />
          </div>

          <div class="speed-options">
            <button v-for="item in speedOptions" :key="item" type="button" class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }" @click="playbackSpeed = item">
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="observerPanelCollapsed"
        class="tidal-floating-card observer-floating-card" title="潮汐观察" subtitle="观察点 A · 三维小岛与岸滩" variant="track"
        :initial-top="212" :initial-right="18" :bottom-inset="96" :min-width="360" :min-height="480"
        :draggable="!observerPanelCollapsed" resizable>
        <div class="observer-content">
          <CoastalTideScene class="observer-coast" :height="localTide.height" :playing="isPlaying"
            :speed="playbackSpeed" :active="panelsVisible && !observerPanelCollapsed" />
          <div class="observer-details">
            <div class="observer-heading">
              <span><i class="observer-dot"></i>A 点潮位 · 与地球同步</span>
              <strong>{{ localTide.stage === '落潮中' ? '退潮中' : localTide.stage }}</strong>
            </div>
            <div class="coast-stage-options" aria-label="查看潮汐阶段">
              <button v-for="stage in coastStages" :key="stage.key" type="button"
                :class="{ active: coastStageKey === stage.key }" :aria-pressed="coastStageKey === stage.key"
                @click="setCoastStage(stage.phase)">{{ stage.label }}</button>
              <button type="button" class="coast-play" :aria-label="isPlaying ? '暂停潮汐过程' : '播放潮汐过程'"
                @click="togglePlay">{{ isPlaying ? '暂停' : '播放' }}</button>
            </div>
            <svg class="tide-chart" viewBox="0 0 480 106" role="img"
              :aria-label="`观察点 A 的示意潮位：${localTide.stage}。一个相对周期内有两次高潮、两次低潮。`">
              <line x1="14" y1="58" x2="466" y2="58" class="chart-reference" />
              <text x="16" y="52" class="chart-reference-text">参考海面</text>
              <path :d="tideChartPath" class="chart-curve" />
              <line :x1="localTideChartPoint.x" y1="16" :x2="localTideChartPoint.x" y2="88" class="chart-cursor" />
              <circle :cx="localTideChartPoint.x" :cy="localTideChartPoint.y" r="5" class="chart-point" />
              <text x="127" y="14" class="chart-extreme">高潮</text>
              <text x="353" y="14" class="chart-extreme">高潮</text>
              <text x="14" y="100" class="chart-extreme">低潮</text>
              <text x="240" y="100" class="chart-extreme">低潮</text>
              <text x="466" y="100" class="chart-extreme">低潮</text>
            </svg>
            <div class="coast-reference-legend">
              <span><i class="coast-reference high-reference"></i>高潮岸线</span>
              <span><i class="coast-reference low-reference"></i>低潮岸线</span>
              <span><i class="coast-reference current-reference"></i>当前岸线</span>
            </div>
            <p class="coast-process-copy">{{ coastProcessCopy }}</p>
            <div class="observer-footer">
              <span>{{ motionPeriodLabel }}</span>
              <span>{{ isPlaying ? '播放中' : '已暂停' }}</span>
            </div>
            <p class="observer-note">虚线保留高低潮岸线作对照；水位升降为教学放大，细小波纹表示海浪。</p>
          </div>
        </div>
      </FloatingFeatureCard>

      <FloatingFeatureCard v-show="panelsVisible" v-model:collapsed="dataPanelCollapsed"
        class="tidal-floating-card data-floating-card" title="实时数据" subtitle="潮汐位置 · 当前对象 · 判定结果" variant="data"
        :initial-top="148" :initial-right="18" :bottom-inset="96" :min-width="320" :min-height="220" draggable
        resizable>
        <div class="panel-scroll">
          <div class="data-grid tide-data-grid">
            <article v-for="item in dataCards" :key="item.label" class="geo-card data-card" :class="[
              item.className,
              { 'wide-data-card': item.wide },
            ]">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>
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
import CoastalTideScene from './CoastalTideScene.vue'
import { SceneStroke, type StrokeStyle } from './scene-stroke'
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
  LUNAR_DAY_HOURS,
  MEAN_SEA_RADIUS,
  MOON_DEGREES_PER_HOUR,
  normalizeDegrees,
  observerTide,
  seaRadius,
  SIMULATION_HOURS_PER_SECOND,
} from './tide-model'

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

// 图片地址统一使用 IMAGE_BASE_URL + 文件名，不拼接二级目录。
const EARTH_TEXTURE_IMAGE = IMAGE_BASE_URL + 'Material.002_diffuse.jpg'
const MOON_TEXTURE_IMAGE = IMAGE_BASE_URL + 'moon.jpg'

/*
 * 参考“地球运动”页面的同源资源路径。
 * 如果部署环境已经把 /geo-resources-folder 映射到 OSS，
 * 会直接生成真实 WebGL 球体纹理；本地未映射时由 OSS DOM 球面层兜底。
 */
const SAME_ORIGIN_TEXTURE_BASE =
  '/geo-resources-folder/images/'

const EARTH_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'Material.002_diffuse.jpg'

const EARTH_NIGHT_TEXTURE = SAME_ORIGIN_TEXTURE_BASE + 'emissive.jpg'

const MOON_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'moon.jpg'

const threeContainerRef = ref<HTMLElement | null>(null)

const earthTextureOverlayRef =
  ref<HTMLElement | null>(null)

const moonTextureOverlayRef =
  ref<HTMLElement | null>(null)

const earthDomTextureReady = ref(false)
const moonDomTextureReady = ref(false)

const earthWebglTextureReady = ref(false)
const earthNightTextureReady = ref(false)
const moonWebglTextureReady = ref(false)

const moonOrbitEnabled = ref(true)
const earthRotationEnabled = ref(true)
const showTideLayer = ref(true)
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
const observerPanelCollapsed = ref(true)

const nearTideLabelRef = ref<HTMLElement | null>(null)
const farTideLabelRef = ref<HTMLElement | null>(null)
const lowTideLabelRef = ref<HTMLElement | null>(null)
const oppositeLowTideLabelRef = ref<HTMLElement | null>(null)
const observerLabelRef = ref<HTMLElement | null>(null)
const moonLabelRef = ref<HTMLElement | null>(null)

const localTide = computed(() => observerTide(
  earthRotationDeg.value, moonAngleDeg.value, earthRotationEnabled.value, moonOrbitEnabled.value,
))
const coastStages = [
  { key: 'low', label: '低潮', phase: 90 },
  { key: 'rising', label: '涨潮', phase: 135 },
  { key: 'high', label: '高潮', phase: 180 },
  { key: 'falling', label: '退潮', phase: 225 },
]
const coastStageKey = computed(() => localTide.value.height > 0.995 ? 'high'
  : localTide.value.height < -0.495 ? 'low'
    : localTide.value.rate > 0 ? 'rising'
      : localTide.value.rate < 0 ? 'falling' : '')
const coastProcessCopy = computed(() => ({
  low: '低潮：岸滩露出最多，低处石阶露出水面。',
  rising: '涨潮：水面抬升，岸线向岛内推进，低处石阶逐渐被淹没。',
  high: '高潮：岸滩露出最少，低处石阶被海水覆盖。',
  falling: '退潮：水面下降，岸线向海退去，湿润岸滩和石阶逐渐露出。',
  '': '位置固定：对比当前岸线与高、低潮参考岸线。',
}[coastStageKey.value]))

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
  ? '相邻高潮 ≈ 12 小时 25 分钟'
  : '单独运动演示 · 不对应真实周期')
const localTideChartPoint = computed(() => ({
  x: 14 + localTide.value.cycleProgress * 452,
  y: 58 - localTide.value.height * 36,
}))
const tideChartPath = Array.from({ length: 181 }, (_, index) => {
  const phase = index / 180 * Math.PI * 2 - Math.PI / 2
  const x = 14 + index / 180 * 452
  const y = 58 - equilibriumHeight(Math.cos(phase)) * 36
  return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
}).join(' ')

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

const dataCards = computed(() => {
  const objectInfo = selectedObjectInfo.value
  const primaryMetric = objectInfo.metrics[0]!

  return [
    {
      label: '月球位置角',
      value: `${Math.round(normalizedMoonAngle.value)}°`,
      description: moonQuadrantLabel.value,
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '当前选中对象',
      value: `${objectInfo.symbol} ${objectInfo.name}`,
      description: objectInfo.description,
      className: 'blue-card',
      wide: false,
    },
    {
      label: primaryMetric.label,
      value: primaryMetric.value,
      description: `${objectInfo.name}的关键数据`,
      className: 'purple-card',
      wide: false,
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
      className: 'orange-card',
      wide: false,
    },
    {
      label: '模拟地月距离',
      value: '约 38.44 万 km',
      description: '场景距离未按实际比例绘制',
      className: 'blue-card',
      wide: false,
    },
    {
      label: '相邻高潮间隔',
      value: earthRotationEnabled.value && moonOrbitEnabled.value ? '约 12 h 25 min' : '单独运动演示',
      description: `正常联动下一个太阴日约 ${LUNAR_DAY_HOURS.toFixed(2)} 小时；实际海岸潮时因地而异`,
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '观察点 A',
      value: localTide.value.stage,
      description: '高潮、低潮表示水位高低；涨潮、落潮表示水位正在上升、下降。',
      className: 'orange-card tide-status-data-card',
      wide: true,
    },
  ]
})

const selectedObjectInfo = computed(() => {
  if (selectedObject.value === 'moon') {
    return {
      name: '月球',
      symbol: '☾',
      description: '月球引潮力是形成地球海洋潮汐的主要天文因素。',
      metrics: [
        { label: '平均半径', value: '约 1737 km' },
        { label: '平均距离', value: '约 38.44 万 km' },
        { label: '公转周期', value: '约 27.3 天' },
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
      { label: '自转周期', value: '约 23 h 56 min' },
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
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeFrame = 0
let resizeSettleFrame = 0
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
  return registerTexture(texture)
}

const celestialPreloadImages:
  HTMLImageElement[] = []

const celestialImageBitmaps:
  ImageBitmap[] = []

function syncCelestialSurfaceMode() {
  const earthUsesDom =
    earthDomTextureReady.value &&
    !earthWebglTextureReady.value

  const moonUsesDom =
    moonDomTextureReady.value &&
    !moonWebglTextureReady.value

  earthUniforms.uOpacity.value =
    earthUsesDom ? 0.20 : 1

  moonUniforms.uOpacity.value =
    moonUsesDom ? 0.18 : 1

  if (earthTextureOverlayRef.value) {
    earthTextureOverlayRef.value.style.display =
      earthUsesDom ? 'block' : 'none'
  }

  if (moonTextureOverlayRef.value) {
    moonTextureOverlayRef.value.style.display =
      moonUsesDom ? 'block' : 'none'
  }
}

function preloadDomCelestialTexture(
  url: string,
  readyState: typeof earthDomTextureReady,
) {
  const image = new Image()
  image.decoding = 'async'

  image.onload = () => {
    readyState.value = true
    syncCelestialSurfaceMode()
    updateCelestialTextureOverlays()
  }

  image.onerror = () => {
    readyState.value = false
    syncCelestialSurfaceMode()
  }

  /*
   * 不设置 crossOrigin。
   * 图片只作为 DOM/CSS 背景显示，不会被读取进 Canvas 或 WebGL。
   */
  image.src = url
  celestialPreloadImages.push(image)
}

async function loadSameOriginCelestialTexture(
  url: string,
  targetUniform:
    | typeof earthUniforms.uMap
    | typeof moonUniforms.uMap,
  readyState: typeof earthWebglTextureReady,
) {
  try {
    /*
     * 先用 fetch 检查响应类型，避免 TextureLoader 对 404 HTML
     * 产生额外的图片解码报错。
     */
    const response = await fetch(
      url,
      {
        cache: 'force-cache',
        credentials: 'same-origin',
      },
    )

    const contentType =
      response.headers.get(
        'content-type',
      ) || ''

    if (
      !response.ok ||
      !contentType.startsWith('image/')
    ) {
      readyState.value = false
      syncCelestialSurfaceMode()
      return
    }

    const blob = await response.blob()
    /*
     * 昼夜地球贴图和月球贴图均为北极在上的经纬展开图。
     * ImageBitmap 上传 WebGL 时不会自动执行 Texture.flipY，
     * 必须在创建阶段翻转，否则球体会出现南北颠倒。
     */
    const bitmap =
      await createImageBitmap(
        blob,
        {
          imageOrientation: 'flipY',
          premultiplyAlpha: 'none',
        },
      )

    if (!renderer) {
      bitmap.close()
      return
    }
    celestialImageBitmaps.push(bitmap)

    const texture =
      new THREE.Texture(bitmap)

    targetUniform.value =
      configureCelestialTexture(
        texture,
      )

    readyState.value = true
    syncCelestialSurfaceMode()
  } catch {
    /*
     * 同源镜像不可用时保持静默，
     * 直接使用 OSS DOM 球面贴图，不输出 CORS 或纹理解码警告。
     */
    readyState.value = false
    syncCelestialSurfaceMode()
  }
}

function loadCelestialTextures() {
  /*
   * OSS 图片始终按用户指定的 IMAGE_BASE_URL + 文件名加载，
   * 但仅作为浏览器可直接显示的 DOM 图片，不上传到 WebGL。
   */
  preloadDomCelestialTexture(
    EARTH_TEXTURE_IMAGE,
    earthDomTextureReady,
  )

  preloadDomCelestialTexture(
    MOON_TEXTURE_IMAGE,
    moonDomTextureReady,
  )

  /*
   * 部署端具备同源映射时自动升级为真正的 WebGL UV 纹理。
   * 本地开发端没有映射也不会影响 OSS DOM 贴图显示。
   */
  void loadSameOriginCelestialTexture(
    EARTH_SAME_ORIGIN_TEXTURE,
    earthUniforms.uMap,
    earthWebglTextureReady,
  )

  void loadSameOriginCelestialTexture(
    EARTH_NIGHT_TEXTURE,
    earthUniforms.uNightMap,
    earthNightTextureReady,
  )

  void loadSameOriginCelestialTexture(
    MOON_SAME_ORIGIN_TEXTURE,
    moonUniforms.uMap,
    moonWebglTextureReady,
  )
}

const overlayWorldPosition =
  new THREE.Vector3()

const overlayCameraRight =
  new THREE.Vector3()

const overlayCenterNdc =
  new THREE.Vector3()

const overlayEdgeNdc =
  new THREE.Vector3()

const overlayViewDirection =
  new THREE.Vector3()

const overlayLocalDirection =
  new THREE.Vector3()

const overlayWorldQuaternion =
  new THREE.Quaternion()

let earthOverlayLongitude = 0
let earthOverlayLongitudeInitialized = false

let moonOverlayLongitude = 0
let moonOverlayLongitudeInitialized = false

function unwrapLongitude(
  currentWrapped: number,
  currentContinuous: number,
  initialized: boolean,
) {
  if (!initialized) {
    return currentWrapped
  }

  const previousWrapped =
    THREE.MathUtils.euclideanModulo(
      currentContinuous + 180,
      360,
    ) - 180

  let delta =
    currentWrapped -
    previousWrapped

  if (delta > 180) {
    delta -= 360
  } else if (delta < -180) {
    delta += 360
  }

  return currentContinuous + delta
}

function getSphereWorldRadius(
  mesh: THREE.Mesh,
) {
  const geometry =
    mesh.geometry as
    THREE.SphereGeometry

  const baseRadius =
    geometry.parameters.radius

  const scale =
    mesh.getWorldScale(
      new THREE.Vector3(),
    )

  return (
    baseRadius *
    Math.max(
      scale.x,
      scale.y,
      scale.z,
    )
  )
}

function hideCelestialOverlay(
  element: HTMLElement | null,
) {
  if (element) {
    element.style.display = 'none'
  }
}

function positionCelestialTextureOverlay(
  element: HTMLElement | null,
  mesh: THREE.Mesh | null,
  ready: boolean,
  textureKind: 'earth' | 'moon',
) {
  if (
    !element ||
    !mesh ||
    !ready ||
    !mesh.visible ||
    !camera ||
    lastSceneWidth <= 0 ||
    lastSceneHeight <= 0
  ) {
    hideCelestialOverlay(element)
    return
  }

  mesh.updateWorldMatrix(
    true,
    false,
  )

  camera.updateMatrixWorld()

  mesh.getWorldPosition(
    overlayWorldPosition,
  )

  overlayCenterNdc
    .copy(overlayWorldPosition)
    .project(camera)

  overlayCameraRight
    .set(1, 0, 0)
    .applyQuaternion(
      camera.quaternion,
    )
    .multiplyScalar(
      getSphereWorldRadius(mesh),
    )

  overlayEdgeNdc
    .copy(overlayWorldPosition)
    .add(overlayCameraRight)
    .project(camera)

  const radiusPixels =
    Math.abs(
      overlayEdgeNdc.x -
      overlayCenterNdc.x,
    ) *
    lastSceneWidth *
    0.5

  const centerX =
    (
      overlayCenterNdc.x *
      0.5 +
      0.5
    ) *
    lastSceneWidth

  const centerY =
    (
      -overlayCenterNdc.y *
      0.5 +
      0.5
    ) *
    lastSceneHeight

  if (
    !Number.isFinite(radiusPixels) ||
    radiusPixels < 1 ||
    centerX + radiusPixels < 0 ||
    centerX - radiusPixels >
    lastSceneWidth ||
    centerY + radiusPixels < 0 ||
    centerY - radiusPixels >
    lastSceneHeight
  ) {
    hideCelestialOverlay(element)
    return
  }

  mesh.getWorldQuaternion(
    overlayWorldQuaternion,
  )

  overlayViewDirection
    .copy(camera.position)
    .sub(overlayWorldPosition)
    .normalize()

  overlayLocalDirection
    .copy(overlayViewDirection)
    .applyQuaternion(
      overlayWorldQuaternion
        .clone()
        .invert(),
    )
    .normalize()

  const wrappedLongitude =
    THREE.MathUtils.radToDeg(
      Math.atan2(
        -overlayLocalDirection.z,
        overlayLocalDirection.x,
      ),
    )

  let continuousLongitude =
    wrappedLongitude

  if (textureKind === 'earth') {
    continuousLongitude =
      unwrapLongitude(
        wrappedLongitude,
        earthOverlayLongitude,
        earthOverlayLongitudeInitialized,
      )

    earthOverlayLongitude =
      continuousLongitude

    earthOverlayLongitudeInitialized =
      true
  } else {
    continuousLongitude =
      unwrapLongitude(
        wrappedLongitude,
        moonOverlayLongitude,
        moonOverlayLongitudeInitialized,
      )

    moonOverlayLongitude =
      continuousLongitude

    moonOverlayLongitudeInitialized =
      true
  }

  const diameter =
    radiusPixels * 2.015

  const imageWidth =
    diameter * 2

  /*
   * 经度展开图宽高约为 2:1。
   * 将当前视线对应的经度放到圆形球体中央，
   * repeat-x 保证跨越 180° 经线时连续，不发生闪切。
   */
  const sourceU =
    continuousLongitude / 360 +
    0.5

  const backgroundLeft =
    diameter * 0.5 -
    sourceU * imageWidth

  element.style.display = 'block'
  element.style.width =
    `${diameter}px`

  element.style.height =
    `${diameter}px`

  element.style.transform =
    `translate3d(${centerX - diameter / 2}px, ${centerY - diameter / 2}px, 0)`

  element.style.backgroundSize =
    `${imageWidth}px ${diameter}px`

  element.style.backgroundPosition =
    `${backgroundLeft}px 50%`
}

function updateCelestialTextureOverlays() {
  positionCelestialTextureOverlay(
    earthTextureOverlayRef.value,
    earthMesh,
    earthDomTextureReady.value &&
    !earthWebglTextureReady.value,
    'earth',
  )

  positionCelestialTextureOverlay(
    moonTextureOverlayRef.value,
    moonMesh,
    moonDomTextureReady.value &&
    !moonWebglTextureReady.value,
    'moon',
  )
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
  project(nearTideLabelRef.value, direction.clone().multiplyScalar(seaRadius(1, strength) + 0.9), showTideLayer.value && fromAbove)
  project(farTideLabelRef.value, direction.clone().multiplyScalar(-seaRadius(1, strength) - 0.9), showTideLayer.value && fromAbove)
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

  loadCelestialTextures()
  syncCelestialSurfaceMode()

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
  camera.left = -ORTHOGRAPHIC_SIZE * aspect
  camera.right = ORTHOGRAPHIC_SIZE * aspect
  camera.top = ORTHOGRAPHIC_SIZE
  camera.bottom = -ORTHOGRAPHIC_SIZE
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)

  updateCelestialTextureOverlays()

  if (scene) {
    renderer.render(scene, camera)
  }
}

function scheduleSceneResize(delay = 110) {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  cancelAnimationFrame(resizeFrame)
  cancelAnimationFrame(resizeSettleFrame)

  resizeTimer = setTimeout(() => {
    resizeTimer = null
    resizeFrame = requestAnimationFrame(() => {
      resizeSettleFrame = requestAnimationFrame(() => {
        resizeSceneNow()
      })
    })
  }, delay)
}

function animateScene(
  frameTime = performance.now(),
) {
  sceneAnimationFrameId =
    requestAnimationFrame(
      animateScene,
    )

  const delta =
    Math.min(
      Math.max(
        0,
        (
          frameTime -
          previousSceneFrameTime
        ) /
        1000,
      ),
      0.05,
    )

  previousSceneFrameTime =
    frameTime

  if (isPlaying.value) {
    const next = advanceAngles(
      earthRotationDeg.value, moonAngleDeg.value,
      delta * SIMULATION_HOURS_PER_SECOND * playbackSpeed.value,
      earthRotationEnabled.value, moonOrbitEnabled.value,
    )
    earthRotationDeg.value = next.earth
    moonAngleDeg.value = next.moon
  }

  updateScenePositions()
  controls?.update()
  updateCelestialTextureOverlays()
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
    scheduleSceneResize(110)
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

function togglePlay() {
  isPlaying.value = !isPlaying.value
}

function resetControls() {
  moonOrbitEnabled.value = true
  earthRotationEnabled.value = true
  showTideLayer.value = true
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
  scheduleSceneResize(90)
}

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)

  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }
  cancelAnimationFrame(resizeFrame)
  cancelAnimationFrame(resizeSettleFrame)

  resizeObserver?.disconnect()
  resizeObserver = null

  if (renderer) {
    renderer.domElement.removeEventListener('pointerup', handleCanvasPointerUp)
  }

  controls?.dispose()
  controls = null

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

  celestialPreloadImages.forEach(
    (image) => {
      image.onload = null
      image.onerror = null
    },
  )

  celestialPreloadImages.length = 0

  celestialImageBitmaps.forEach(
    (bitmap) => bitmap.close(),
  )

  celestialImageBitmaps.length = 0

  earthDomTextureReady.value = false
  moonDomTextureReady.value = false
  earthWebglTextureReady.value = false
  earthNightTextureReady.value = false
  moonWebglTextureReady.value = false

  hideCelestialOverlay(
    earthTextureOverlayRef.value,
  )

  hideCelestialOverlay(
    moonTextureOverlayRef.value,
  )

  earthOverlayLongitude = 0
  moonOverlayLongitude = 0
  earthOverlayLongitudeInitialized = false
  moonOverlayLongitudeInitialized = false
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

onMounted(async () => {
  await nextTick()
  initScene()
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
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

.tidal-floating-card.control-floating-card {
  height: min(58vh, 620px);
}

.tidal-floating-card.data-floating-card {
  height: min(42vh, 440px);
}

.tidal-floating-card.collapsed {
  height: auto !important;
}

.tidal-floating-card .panel-scroll {
  height: 100%;
  padding: 12px 12px 6px;
}

.celestial-texture-layer {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.celestial-texture-sphere {
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  overflow: hidden;
  pointer-events: none;
  background-repeat: repeat-x;
  background-position-y: 50%;
  border-radius: 50%;
  transform-origin: 0 0;
  will-change:
    width,
    height,
    transform,
    background-position;
}

.celestial-texture-sphere::before,
.celestial-texture-sphere::after {
  position: absolute;
  content: '';
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
}

.celestial-texture-sphere::before {
  z-index: 1;
  background:
    radial-gradient(circle at 29% 24%,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 255, 255, 0.08) 22%,
      rgba(255, 255, 255, 0) 43%,
      rgba(0, 0, 0, 0.12) 61%,
      rgba(0, 0, 0, 0.48) 82%,
      rgba(0, 0, 0, 0.88) 100%);
}

.celestial-texture-sphere::after {
  z-index: 2;
  border:
    1px solid rgba(210, 236, 255, 0.18);
  box-shadow:
    inset -14px -8px 25px rgba(0, 0, 0, 0.28),
    inset 8px 6px 14px rgba(255, 255, 255, 0.05),
    0 0 10px rgba(70, 175, 255, 0.12);
}

.earth-texture-sphere {
  filter:
    saturate(1.08) contrast(1.05);
}

.moon-texture-sphere {
  filter:
    grayscale(0.03) contrast(1.11) brightness(0.96);
}

.moon-texture-sphere::before {
  background:
    radial-gradient(circle at 30% 25%,
      rgba(255, 255, 255, 0.16) 0%,
      rgba(255, 255, 255, 0.05) 28%,
      rgba(255, 255, 255, 0) 46%,
      rgba(0, 0, 0, 0.16) 65%,
      rgba(0, 0, 0, 0.52) 84%,
      rgba(0, 0, 0, 0.9) 100%);
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

.position-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: clamp(9px, 0.68vw, 11px);
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
  position: absolute;
  bottom: clamp(124px, 15vh, 176px);
  left: clamp(16px, 1.6vw, 26px);
  z-index: 6;
  width: min(326px, calc(100vw - 32px));
  padding: 15px;
  color: #dceef5;
  font-size: 11px;
  background: linear-gradient(145deg, rgba(8, 29, 44, 0.97), rgba(4, 17, 30, 0.94));
  border: 1px solid rgba(99, 173, 196, 0.3);
  border-radius: 14px;
  box-shadow: 0 12px 30px #00000032;
  pointer-events: auto;
}

.legend-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.legend-heading h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #e3f7fc;
  font-size: 14px;
  font-weight: 650;
}

.legend-heading h3>span {
  color: #61d8cd;
  font-size: 24px;
  line-height: 1;
  font-weight: 400;
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

.observer-floating-card.collapsed {
  top: 212px !important;
  right: 18px;
  left: auto !important;
}

.observer-floating-card:not(.collapsed) {
  width: min(480px, 42vw);
  height: min(730px, calc(100vh - 182px));
}

.observer-floating-card :deep(.feature-card-content) {
  overflow: auto;
  scrollbar-gutter: stable;
  padding-bottom: 24px;
}

.observer-floating-card.resizing,
.observer-floating-card.resizing .observer-content,
.observer-floating-card.resizing .observer-coast {
  transition: none !important;
}

.observer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 425px;
}

.observer-coast {
  flex: 1 1 auto;
  min-height: 210px;
}

.observer-details {
  flex: 0 0 auto;
  padding: 9px 12px 8px;
  background: rgba(3, 18, 31, 0.97);
}

.coast-stage-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
  margin: 8px 0 2px;
}

.coast-stage-options button {
  padding: 5px 3px;
  border: 1px solid #375267;
  border-radius: 6px;
  background: #122b3c;
  color: #bcd7e3;
  font-size: 11px;
  cursor: pointer;
}

.coast-stage-options button.active {
  border-color: #59cfc4;
  background: #174c52;
  color: #d6fff8;
}

.coast-stage-options .coast-play {
  color: #ffe18a;
  border-color: #746738;
}

.coast-stage-options button:focus-visible {
  outline: 2px solid #ffe18a;
  outline-offset: 2px;
}

.coast-reference-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  color: #c0d3df;
}

.coast-reference {
  display: inline-block;
  width: 15px;
  margin-right: 4px;
  vertical-align: middle;
  border-top: 2px dashed;
}

.high-reference {
  border-color: #ffac7f;
}

.low-reference {
  border-color: #69dfff;
}

.current-reference {
  border-color: #f1fff4;
  border-top-style: solid;
}

.coast-process-copy {
  margin: 6px 0;
  color: #d8e9ef;
  font-size: 11px;
  line-height: 1.5;
  min-height: 17px;
}

.observer-heading,
.observer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.observer-heading strong {
  color: #ffe080;
  white-space: nowrap;
}

.observer-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: #ffdc55;
}

.observer-note {
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: #a6bfce;
}

.observer-footer {
  color: #c9dbe7;
  font-size: 11px;
}

.observer-note {
  color: #90abba;
  font-size: 10px;
}

.tide-chart {
  display: block;
  width: 100%;
  height: 94px;
  margin: 5px 0;
  overflow: visible;
}

.chart-reference {
  stroke: #899bad;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart-reference-text {
  fill: #98afc0;
  font-size: 12px;
}

.chart-curve {
  fill: none;
  stroke: #65d6dc;
  stroke-width: 2.5;
}

.chart-cursor {
  stroke: #e9c75e;
  stroke-opacity: 0.35;
  stroke-dasharray: 3 3;
}

.chart-point {
  fill: #ffdc55;
  stroke: #132433;
  stroke-width: 2;
}

.chart-extreme {
  fill: #b9cbd9;
  font-size: 12px;
  text-anchor: middle;
}

.wide-data-card {
  grid-column: 1 / -1;
}

.tide-data-grid .data-card strong {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.tide-status-data-card strong {
  font-size: clamp(17px, 1.24vw, 23px);
  line-height: 1.25;
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
    height: min(40vh, 360px);
  }

  .stage-status-badge {
    max-width: 44%;
  }

  .stage-status-badge>span:last-child {
    display: none;
  }

  .observer-floating-card:not(.collapsed) {
    width: min(410px, calc(100vw - 36px));
  }
}

@media (max-width: 700px) {
  .stage-legend {
    bottom: 116px;
    width: min(306px, calc(100vw - 32px));
    padding: 12px;
  }

  .observer-floating-card:not(.collapsed) {
    width: calc(100vw - 36px);
  }

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
  .stage-legend {
    bottom: 110px;
  }

  .stage-status-badge {
    top: 72px;
  }
}
</style>
