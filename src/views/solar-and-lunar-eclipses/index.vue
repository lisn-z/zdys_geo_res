<template>
  <div
    ref="pageRef"
    class="solar-lunar-eclipse-container geo-template-page geo-page theme-dark"
    :class="'layout-' + layoutMode"
  >
    <header class="top-toolbar">
      <div class="brand-area">
        <img
          class="brand-logo"
          src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo"
        />
      </div>

      <h1 class="page-title">日食和月食</h1>

      <div class="toolbar-actions">
        <button
          type="button"
          class="theme-btn toolbar-btn"
          @click="focusEclipseAlignment"
        >
          对准食相
        </button>

        <button
          type="button"
          class="theme-btn toolbar-btn panel-toolbar-btn"
          @click="toggleAllPanels"
        >
          {{ allPanelsCollapsed ? '展开面板' : '收起面板' }}
        </button>
      </div>
    </header>

    <main
      class="workspace"
      v-bind="workspaceAttrs"
    >
      <aside
        id="left-panel"
        class="side-panel left-panel"
        v-bind="leftPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>模拟控制</h2>
              <p>控制天体运动、轨道参数与辅助图层</p>
            </div>
            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">天体运动</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>月球绕地球公转</strong>
                <span>按加速后的恒星月周期连续运行</span>
              </div>
              <el-switch v-model="moonOrbitEnabled" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>地球自转</strong>
                <span>显示地球自西向东旋转</span>
              </div>
              <el-switch v-model="earthRotationEnabled" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示本影</strong>
                <span>在日食与月食阶段显示对应锥形影区</span>
              </div>
              <el-switch v-model="showUmbra" />
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">辅助图层</h3>

            <div class="switch-row">
              <div class="control-copy">
                <strong>从地球上观察</strong>
                <span>左上角同步显示地面观察到的食相</span>
              </div>
              <el-switch v-model="showEarthView" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示黄道面</strong>
                <span>观察月球轨道与黄道面的夹角</span>
              </div>
              <el-switch v-model="showEclipticPlane" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>显示月球轨道</strong>
                <span>显示倾斜轨道及升降交点</span>
              </div>
              <el-switch v-model="showMoonOrbit" />
            </div>

            <div class="switch-row">
              <div class="control-copy">
                <strong>近似实际比例</strong>
                <span>缩小地月尺寸并拉大日地距离</span>
              </div>
              <el-switch v-model="realScaleMode" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">月球位置</h3>
              <strong class="control-value">{{ Math.round(moonLongitude) }}°</strong>
            </div>

            <el-slider
              v-model="moonLongitude"
              :min="0"
              :max="360"
              :step="1"
              :show-tooltip="false"
              @input="handleManualMoonPosition"
            />

            <div class="phase-scale">
              <span>朔</span>
              <span>上弦</span>
              <span>望</span>
              <span>下弦</span>
              <span>朔</span>
            </div>

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">月球轨道倾角</span>
              <strong class="control-value">{{ moonInclination.toFixed(1) }}°</strong>
            </div>

            <el-slider
              v-model="moonInclination"
              :min="0"
              :max="10"
              :step="0.1"
              :show-tooltip="false"
            />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">沙罗周期进程</span>
              <strong class="control-value">{{ Math.round(sarosProgress) }}°</strong>
            </div>

            <el-slider
              v-model="sarosProgress"
              :min="0"
              :max="360"
              :step="1"
              :show-tooltip="false"
            />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观察视角</h3>

            <div class="option-grid view-option-grid">
              <button
                v-for="item in viewOptions"
                :key="item.value"
                type="button"
                class="theme-btn option-btn"
                :class="{ active: currentView === item.value }"
                @click="setCameraView(item.value)"
              >
                {{ item.label }}
              </button>
            </div>

            <button
              type="button"
              class="theme-btn reset-scene-btn"
              @click="resetControls"
            >
              恢复默认参数
            </button>
          </section>
        </div>

        <div
          class="resize-handle resize-right"
          v-bind="leftResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-left"
          v-bind="leftCollapseAttrs"
        >
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content eclipse-stage-content">
          <!--
            OSS 图片保持 IMAGE_BASE_URL + 文件名。
            当同源映射不可用时，图片作为普通 DOM 球面显示，不上传到 WebGL；
            Three.js 高细分球体、光照、高光、影锥和点击交互仍在其上方运行。
          -->
          <div
            class="celestial-texture-layer"
            aria-hidden="true"
          >
            <div
              ref="sunTextureOverlayRef"
              class="celestial-texture-overlay sun-texture-surface"
              :style="{ backgroundImage: `url(${SUN_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="earthTextureOverlayRef"
              class="celestial-texture-overlay earth-texture-surface"
              :style="{ backgroundImage: `url(${EARTH_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="moonTextureOverlayRef"
              class="celestial-texture-overlay moon-texture-surface"
              :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
            ></div>
          </div>

          <div
            ref="threeContainerRef"
            class="scene-host three-host"
          ></div>

          <div class="scene-title-chip">
            <span class="scene-title-dot"></span>
            <strong>{{ currentPhenomenon }}</strong>
            <small>{{ currentPhaseName }}</small>
          </div>

          <div
            v-show="showEarthView"
            ref="earthViewOverlayRef"
            class="earth-view-overlay"
          >
            <div
              ref="previewSunTextureRef"
              class="preview-texture-surface preview-sun-texture"
              :style="{ backgroundImage: `url(${SUN_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="previewMoonTextureRef"
              class="preview-texture-surface preview-moon-texture"
              :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="previewLunarMoonTextureRef"
              class="preview-texture-surface preview-lunar-moon-texture"
              :style="{ backgroundImage: `url(${MOON_TEXTURE_IMAGE})` }"
            ></div>

            <div
              ref="previewEarthShadowTextureRef"
              class="preview-earth-shadow-texture"
            ></div>

            <div class="earth-view-heading">
              <strong>{{ earthViewTitle }}</strong>
              <span>{{ earthViewSubtitle }}</span>
            </div>
          </div>

          <div class="scene-legend-panel">
            <h3>图例</h3>

            <div class="scene-legend-list">
              <div class="legend-item">
                <span class="legend-swatch umbra-swatch"></span>
                <span>{{ shadowLegendText }}</span>
              </div>

              <div class="legend-item">
                <span class="legend-swatch sunlight-swatch"></span>
                <span>太阳光：红橙至金黄色的入射光区</span>
              </div>

              <div class="legend-item">
                <span class="legend-swatch orbit-swatch"></span>
                <span>月球轨道：与黄道面约成 {{ moonInclination.toFixed(1) }}°</span>
              </div>

              <div class="legend-item">
                <span class="legend-swatch ecliptic-swatch"></span>
                <span>黄道面：地球公转轨道所在平面</span>
              </div>
            </div>

            <small>天体尺寸与距离采用教学比例，半影未单独绘制。</small>
          </div>

          <div class="interaction-hint">
            拖动旋转 · 滚轮缩放 · 点击天体查看数据
          </div>
        </div>

        <div class="timeline-dock">
          <button
            type="button"
            class="timeline-icon-btn"
            :class="{ active: isPlaying }"
            :aria-label="isPlaying ? '暂停' : '播放'"
            :title="isPlaying ? '暂停' : '播放'"
            @click="togglePlayback"
          >
            <el-icon>
              <VideoPause v-if="isPlaying" />
              <VideoPlay v-else />
            </el-icon>
          </button>

          <div class="timeline-main">
            <div class="timeline-copy">
              <span>月球公转进度</span>
              <strong>{{ Math.round(moonLongitude) }}° · {{ currentPhaseName }}</strong>
            </div>

            <el-slider
              v-model="moonLongitude"
              :min="0"
              :max="360"
              :step="1"
              :show-tooltip="false"
              @input="handleManualMoonPosition"
            />
          </div>

          <div class="speed-options">
            <button
              v-for="item in speedOptions"
              :key="item"
              type="button"
              class="theme-btn speed-btn"
              :class="{ active: playbackSpeed === item }"
              @click="playbackSpeed = item"
            >
              {{ item }}×
            </button>
          </div>
        </div>
      </section>

      <aside
        id="right-panel"
        class="side-panel right-panel"
        v-bind="rightPanelAttrs"
      >
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>实时数据</h2>
              <p>统一展示食相、几何关系和选中天体数据</p>
            </div>
            <span class="panel-badge">DATA</span>
          </div>

          <div class="data-grid eclipse-data-grid">
            <article
              v-for="item in dataCards"
              :key="item.label"
              class="geo-card data-card"
              :class="[
                item.className,
                { 'wide-data-card': item.wide },
              ]"
            >
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.description }}</small>
            </article>
          </div>
        </div>

        <div
          class="resize-handle resize-left"
          v-bind="rightResizeAttrs"
        ></div>

        <button
          type="button"
          class="panel-collapse-btn collapse-right"
          v-bind="rightCollapseAttrs"
        >
          ›
        </button>
      </aside>

      <button
        v-if="hasLeftPanel && leftCollapsed"
        type="button"
        class="panel-entry-btn entry-left"
        v-bind="leftEntryAttrs"
      >
        ›
      </button>

      <button
        v-if="hasRightPanel && rightCollapsed"
        type="button"
        class="panel-entry-btn entry-right"
        v-bind="rightEntryAttrs"
      >
        ‹
      </button>
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

import '@/styles/geo-page-template.css'

import {
  useGeoPanelLayout,
} from '@/hooks/useGeoPanelLayout'

import * as THREE from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js'

const IMAGE_BASE_URL =
  'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

type CelestialTextureKey = 'earth' | 'moon' | 'sun'

// 图片地址统一使用 IMAGE_BASE_URL + 文件名，不拼接二级目录。
const EARTH_TEXTURE_IMAGE =
  IMAGE_BASE_URL + 'earth.jpg'
const MOON_TEXTURE_IMAGE =
  IMAGE_BASE_URL + 'moon.jpg'
const SUN_TEXTURE_IMAGE =
  IMAGE_BASE_URL + 'sun.png'

/*
 * 与“地球运动”页面相同，优先尝试站点同源资源映射。
 * 本地未配置映射时不会影响 OSS DOM 球面显示。
 */
const SAME_ORIGIN_TEXTURE_BASE =
  '/geo-resources-folder/images/'

const EARTH_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'earth.jpg'

const MOON_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'moon.jpg'

const SUN_SAME_ORIGIN_TEXTURE =
  SAME_ORIGIN_TEXTURE_BASE + 'sun.png'

const TEXTURE_SOURCE_URLS: Record<CelestialTextureKey, string> = {
  earth: EARTH_TEXTURE_IMAGE,
  moon: MOON_TEXTURE_IMAGE,
  sun: SUN_TEXTURE_IMAGE,
}

const CELESTIAL_FALLBACK_COLORS: Record<CelestialTextureKey, string> = {
  earth: '#1768a8',
  moon: '#c8c9cb',
  sun: '#ffd84d',
}

// 影锥恢复为原网页使用的黑色；灰色背景下保持清晰可见。
const EARTH_UMBRA_COLOR = 0x000000
const MOON_UMBRA_COLOR = 0x000000
const EARTH_UMBRA_OPACITY = 0.72
const MOON_UMBRA_OPACITY = 0.78

// 太阳光采用由红橙向金黄过渡的半透明光束。
const SUNLIGHT_START_COLOR = 0xff4d1f
const SUNLIGHT_END_COLOR = 0xffdc45
const SUNLIGHT_OPACITY = 0.28

const hasLeftPanel = true
const hasRightPanel = true

const threeContainerRef = ref<HTMLElement | null>(null)
const earthViewOverlayRef = ref<HTMLElement | null>(null)

const sunTextureOverlayRef = ref<HTMLElement | null>(null)
const earthTextureOverlayRef = ref<HTMLElement | null>(null)
const moonTextureOverlayRef = ref<HTMLElement | null>(null)

const previewSunTextureRef = ref<HTMLElement | null>(null)
const previewMoonTextureRef = ref<HTMLElement | null>(null)
const previewLunarMoonTextureRef = ref<HTMLElement | null>(null)
const previewEarthShadowTextureRef = ref<HTMLElement | null>(null)

const sunDomTextureReady = ref(false)
const earthDomTextureReady = ref(false)
const moonDomTextureReady = ref(false)

const sunWebglTextureReady = ref(false)
const earthWebglTextureReady = ref(false)
const moonWebglTextureReady = ref(false)

const moonOrbitEnabled = ref(true)
const earthRotationEnabled = ref(false)
const showUmbra = ref(true)
const showEarthView = ref(true)
const showEclipticPlane = ref(false)
const showMoonOrbit = ref(true)
const realScaleMode = ref(false)

const moonLongitude = ref(0)
const moonInclination = ref(5.1)
const sarosProgress = ref(90)
const playbackSpeed = ref(1)
const isPlaying = ref(true)
const currentView = ref('overview')
const selectedObject = ref<'sun' | 'earth' | 'moon'>('earth')

const speedOptions = [
  0.25,
  0.5,
  1,
  2,
]

const viewOptions = [
  { label: '全景', value: 'overview' },
  { label: '俯视', value: 'top' },
  { label: '日地连线', value: 'alignment' },
  { label: '地球中心', value: 'earth' },
]

const objectDatabase = {
  sun: {
    name: '太阳',
    symbol: '☉',
    radius: '约 69.6 万 km',
    period: '自转约 25～35 日',
    role: '食现象的光源',
  },
  earth: {
    name: '地球',
    symbol: '⊕',
    radius: '约 6371 km',
    period: '自转约 23 h 56 min',
    role: '日食的受影天体，月食时形成本影',
  },
  moon: {
    name: '月球',
    symbol: '☾',
    radius: '约 1737 km',
    period: '公转约 27.3 日',
    role: '日食的遮挡天体，月食时进入地影',
  },
} as const

const selectedObjectData = computed(() =>
  objectDatabase[selectedObject.value]
)

const phaseAngle = computed(() =>
  normalizeDegrees(moonLongitude.value)
)

const currentPhaseName = computed(() => {
  const degree = phaseAngle.value

  if (degree < 22.5 || degree >= 337.5) {
    return '朔（月球位于日地之间）'
  }
  if (degree < 67.5) {
    return '娥眉月'
  }
  if (degree < 112.5) {
    return '上弦月'
  }
  if (degree < 157.5) {
    return '盈凸月'
  }
  if (degree < 202.5) {
    return '望（地球位于日月之间）'
  }
  if (degree < 247.5) {
    return '亏凸月'
  }
  if (degree < 292.5) {
    return '下弦月'
  }

  return '残月'
})

const alignmentData = computed(() => {
  const moonPosition = calculateMoonPosition(
    moonLongitude.value,
    moonInclination.value,
    sarosProgress.value,
    1
  )

  const moonDirection = moonPosition.clone().normalize()
  const sunDirection = new THREE.Vector3(-1, 0, 0)
  const antiSunDirection = new THREE.Vector3(1, 0, 0)

  const solarSeparation = THREE.MathUtils.radToDeg(
    moonDirection.angleTo(sunDirection)
  )
  const lunarSeparation = THREE.MathUtils.radToDeg(
    moonDirection.angleTo(antiSunDirection)
  )

  const solarThreshold = realScaleMode.value ? 0.9 : 1.7
  const lunarThreshold = realScaleMode.value ? 0.7 : 1.4

  const solarScore = Math.max(
    0,
    1 - solarSeparation / 8
  )
  const lunarScore = Math.max(
    0,
    1 - lunarSeparation / 8
  )

  return {
    solarSeparation,
    lunarSeparation,
    solarThreshold,
    lunarThreshold,
    solarScore,
    lunarScore,
    moonHeight: moonPosition.y,
  }
})

const currentPhenomenon = computed(() => {
  const data = alignmentData.value

  if (data.solarSeparation <= data.solarThreshold) {
    return '日食条件成立'
  }

  if (data.lunarSeparation <= data.lunarThreshold) {
    return '月食条件成立'
  }

  if (data.solarSeparation < 10) {
    return '接近朔，但未形成日食'
  }

  if (data.lunarSeparation < 10) {
    return '接近望，但未形成月食'
  }

  return '普通月相阶段'
})

const eclipseStatusClass = computed(() => {
  if (currentPhenomenon.value.includes('日食')) {
    return 'solar-status'
  }

  if (currentPhenomenon.value.includes('月食')) {
    return 'lunar-status'
  }

  return 'normal-status'
})

const currentExplanation = computed(() => {
  const data = alignmentData.value

  if (data.solarSeparation <= data.solarThreshold) {
    return '月球位于太阳与地球之间，并且接近月球轨道交点，月球本影可以落到地球表面。'
  }

  if (data.lunarSeparation <= data.lunarThreshold) {
    return '地球位于太阳与月球之间，并且三者接近共线，月球进入地球本影。'
  }

  if (data.solarSeparation < 10) {
    return '虽然处于朔附近，但月球轨道高度偏离日地连线，月球影锥从地球上方或下方掠过。'
  }

  if (data.lunarSeparation < 10) {
    return '虽然处于望附近，但月球没有穿过地球本影，因而不会形成月食。'
  }

  return '当前月球与日地连线夹角较大，主要表现为普通月相变化。'
})

const earthViewTitle = computed(() =>
  phaseAngle.value > 90 && phaseAngle.value < 270
    ? '月食观察'
    : '日食观察'
)

const earthViewSubtitle = computed(() =>
  phaseAngle.value > 90 && phaseAngle.value < 270
    ? '从地球赤道午夜方向观察'
    : '从地球赤道正午方向观察'
)

const shadowLegendText = computed(() =>
  phaseAngle.value > 90 && phaseAngle.value < 270
    ? '地球本影：月食时月球可能进入的影区'
    : '月球本影：日食时可能落到地球表面的影区'
)

const dataCards = computed(() => {
  const data = alignmentData.value
  const isSolarHalf =
    phaseAngle.value < 90 || phaseAngle.value > 270
  const separation = isSolarHalf
    ? data.solarSeparation
    : data.lunarSeparation

  return [
    {
      label: '当前阶段',
      value: currentPhaseName.value.split('（')[0],
      description: '月球当前所处月相阶段',
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '月球位置',
      value: Math.round(moonLongitude.value) + '°',
      description: '相对朔位置的公转角度',
      className: 'blue-card',
      wide: false,
    },
    {
      label: '当前选中天体',
      value: selectedObjectData.value.symbol + ' ' + selectedObjectData.value.name,
      description: selectedObjectData.value.role,
      className: 'cyan-card',
      wide: false,
    },
    {
      label: '平均半径',
      value: selectedObjectData.value.radius,
      description: selectedObjectData.value.name + '的平均半径',
      className: 'blue-card',
      wide: false,
    },
    {
      label: '自转 / 公转周期',
      value: selectedObjectData.value.period,
      description: selectedObjectData.value.name + '的主要运动周期',
      className: 'purple-card period-data-card',
      wide: true,
    },
    {
      label: '共线偏差',
      value: separation.toFixed(2) + '°',
      description: isSolarHalf ? '月—日方向夹角' : '月—反日方向夹角',
      className: 'purple-card',
      wide: false,
    },
    {
      label: '轨道倾角',
      value: moonInclination.value.toFixed(1) + '°',
      description: '月球轨道面与黄道面夹角',
      className: 'orange-card',
      wide: false,
    },
    {
      label: '当前判定',
      value: currentPhenomenon.value,
      description: currentExplanation.value,
      className: eclipseStatusClass.value + '-card',
      wide: true,
    },
  ]
})

const {
  rootRef: pageRef,
  layoutMode,
  leftCollapsed,
  rightCollapsed,
  allPanelsCollapsed,
  draggingSide,
  viewportResizing,
  workspaceAttrs,
  leftPanelAttrs,
  rightPanelAttrs,
  leftResizeAttrs,
  rightResizeAttrs,
  leftCollapseAttrs,
  rightCollapseAttrs,
  leftEntryAttrs,
  rightEntryAttrs,
  setAllCollapsed,
  resetWidths,
  toggleAll: toggleAllPanels,
} = useGeoPanelLayout({
  left: {
    enabled: hasLeftPanel,
  },
  right: {
    enabled: hasRightPanel,
  },
  onLayoutChange(state) {
    if (state.resizing) {
      return
    }
    scheduleSceneResize(90)
  },
  onResize(payload) {
    if (
      payload.phase === 'end' ||
      payload.phase === 'reset'
    ) {
      scheduleSceneResize(0)
    }
  },
})

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: OrbitControls | null = null

let sunMesh: THREE.Mesh<THREE.SphereGeometry, THREE.Material> | null = null
let earthMesh: THREE.Mesh<THREE.SphereGeometry, THREE.Material> | null = null
let moonMesh: THREE.Mesh<THREE.SphereGeometry, THREE.Material> | null = null
let moonOrbitLine: THREE.Line | null = null
let eclipticPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
let earthSunLine: THREE.Line | null = null
let earthUmbra: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null = null
let moonUmbra: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial> | null = null
let earthSunlightBeam: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null = null
let moonSunlightBeam: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null = null
let ambientLight: THREE.AmbientLight | null = null
let sunPointLight: THREE.PointLight | null = null
let starField: THREE.Points | null = null

let previewScene: THREE.Scene | null = null
let previewCamera: THREE.OrthographicCamera | null = null
let previewSun: THREE.Mesh | null = null
let previewMoon: THREE.Mesh | null = null
let previewLunarMoon: THREE.Mesh | null = null
let previewEarthShadow: THREE.Mesh | null = null

let threeResizeObserver: ResizeObserver | null = null
let sceneResizeTimer: ReturnType<typeof setTimeout> | null = null
let sceneResizeFrame = 0
let sceneResizeSettleFrame = 0
let sceneAnimationFrameId = 0
let lastSceneWidth = 0
let lastSceneHeight = 0
let lastFrameTime = 0

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const clickableObjects: THREE.Object3D[] = []
const disposableMaterials: THREE.Material[] = []
const disposableGeometries: THREE.BufferGeometry[] = []
const disposableTextures: THREE.Texture[] = []

/**
 * 统一登记场景资源，便于组件卸载时完整释放。
 * v9 中调用了这两个方法但定义缺失，导致 createCelestialScene 在创建
 * 第一个球体前直接抛出 ReferenceError，后续模型、动画和 OSS 图片投影层
 * 均未执行，因此页面中间为空且网络面板看不到三张图片请求。
 */
function registerMaterial<T extends THREE.Material>(material: T) {
  disposableMaterials.push(material)
  return material
}

function registerGeometry<T extends THREE.BufferGeometry>(geometry: T) {
  disposableGeometries.push(geometry)
  return geometry
}

function registerTexture<T extends THREE.Texture>(texture: T) {
  disposableTextures.push(texture)
  return texture
}

const systemScale = {
  earthRadius: 3.1,
  moonRadius: 1.02,
  moonDistance: 14.5,
  sunRadius: 7.4,
  sunDistance: 35,
  earthUmbraLength: 38,
  moonUmbraLength: 18,
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360
}

function calculateMoonPosition(
  longitude: number,
  inclination: number,
  nodeProgress: number,
  distance: number
) {
  const angle = THREE.MathUtils.degToRad(longitude + 180)
  const basePosition = new THREE.Vector3(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance
  )

  const nodeAngle = THREE.MathUtils.degToRad(nodeProgress)
  const tiltAxis = new THREE.Vector3(
    Math.cos(nodeAngle),
    0,
    Math.sin(nodeAngle)
  ).normalize()

  const tiltQuaternion = new THREE.Quaternion().setFromAxisAngle(
    tiltAxis,
    THREE.MathUtils.degToRad(inclination)
  )

  return basePosition.applyQuaternion(tiltQuaternion)
}

function getCurrentScale() {
  if (!realScaleMode.value) {
    return {
      ...systemScale,
    }
  }

  return {
    earthRadius: 1.55,
    moonRadius: 0.43,
    moonDistance: 15.2,
    sunRadius: 4.9,
    sunDistance: 72,
    earthUmbraLength: 44,
    moonUmbraLength: 18,
  }
}

/**
 * earth.jpg、moon.jpg、sun.png 都是标准经纬展开图。
 *
 * 运行策略：
 * 1. 若 /geo-resources-folder/images/ 存在同源映射，直接生成 WebGL UV 纹理；
 * 2. 若同源映射不可用，OSS 原图作为普通 DOM 球面显示；
 * 3. Three.js 高细分球体始终保留真实明暗、高光、边缘光、遮挡和点击检测；
 * 4. 三类图片都读取失败时，继续显示黄色太阳、蓝色地球和灰白色月球。
 */

type CelestialShaderUniforms = {
  uMap: { value: THREE.Texture }
  uLightDirection: { value: THREE.Vector3 }
  uAmbient: { value: number }
  uDiffuse: { value: number }
  uSpecular: { value: number }
  uShininess: { value: number }
  uRimStrength: { value: number }
  uEmission: { value: number }
  uUnlit: { value: number }
  uOpacity: { value: number }
  uTint: { value: THREE.Color }
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

  for (let index = 0; index < 170; index += 1) {
    context.fillStyle =
      `rgba(255,255,255,${0.035 + Math.random() * 0.12})`

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

const celestialUniforms: Record<
  CelestialTextureKey,
  CelestialShaderUniforms
> = {
  sun: {
    uMap: {
      value: createFallbackTexture(
        '#ff7b00',
        '#ffd84d',
      ),
    },
    uLightDirection: {
      value: new THREE.Vector3(1, 0, 0),
    },
    uAmbient: { value: 1 },
    uDiffuse: { value: 0 },
    uSpecular: { value: 0.08 },
    uShininess: { value: 18 },
    uRimStrength: { value: 0.32 },
    uEmission: { value: 0.48 },
    uUnlit: { value: 1 },
    uOpacity: { value: 1 },
    uTint: {
      value: new THREE.Color('#fff1b0'),
    },
  },

  earth: {
    uMap: {
      value: createFallbackTexture(
        '#1768a8',
        '#2c91bf',
      ),
    },
    uLightDirection: {
      value: new THREE.Vector3(
        -0.8,
        0.28,
        0.46,
      ).normalize(),
    },
    uAmbient: { value: 0.3 },
    uDiffuse: { value: 1.08 },
    uSpecular: { value: 0.18 },
    uShininess: { value: 30 },
    uRimStrength: { value: 0.17 },
    uEmission: { value: 0 },
    uUnlit: { value: 0 },
    uOpacity: { value: 1 },
    uTint: {
      value: new THREE.Color('#ffffff'),
    },
  },

  moon: {
    uMap: {
      value: createFallbackTexture(
        '#96999e',
        '#d1d2d4',
      ),
    },
    uLightDirection: {
      value: new THREE.Vector3(
        -0.8,
        0.28,
        0.46,
      ).normalize(),
    },
    uAmbient: { value: 0.2 },
    uDiffuse: { value: 1.08 },
    uSpecular: { value: 0.05 },
    uShininess: { value: 9 },
    uRimStrength: { value: 0.08 },
    uEmission: { value: 0 },
    uUnlit: { value: 0 },
    uOpacity: { value: 1 },
    uTint: {
      value: new THREE.Color('#eeeeee'),
    },
  },
}

function createBodyMaterial(
  textureKey: CelestialTextureKey,
) {
  const uniforms =
    celestialUniforms[textureKey]

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
        uniform float uEmission;
        uniform float uUnlit;
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
              2.4
            );

          vec3 surfaceColor =
            texture2D(
              uMap,
              vUv
            ).rgb *
            uTint;

          float illuminatedFactor =
            uAmbient +
            diffuseAmount *
            uDiffuse;

          float finalLightFactor =
            mix(
              illuminatedFactor,
              1.0,
              uUnlit
            );

          vec3 shadedColor =
            surfaceColor *
            finalLightFactor;

          shadedColor +=
            vec3(1.0) *
            specularAmount *
            uSpecular;

          shadedColor +=
            surfaceColor *
            rimAmount *
            uRimStrength;

          shadedColor +=
            surfaceColor *
            uEmission;

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

function createPreviewBodyMaterial(
  textureKey: CelestialTextureKey,
) {
  return registerMaterial(
    new THREE.MeshBasicMaterial({
      color:
        CELESTIAL_FALLBACK_COLORS[
          textureKey
        ],
    }),
  )
}

function configureCelestialTexture(
  texture: THREE.Texture,
) {
  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.wrapS =
    THREE.RepeatWrapping

  texture.wrapT =
    THREE.ClampToEdgeWrapping

  texture.minFilter =
    THREE.LinearMipmapLinearFilter

  texture.magFilter =
    THREE.LinearFilter

  texture.generateMipmaps = true

  if (renderer) {
    texture.anisotropy =
      Math.min(
        8,
        renderer.capabilities
          .getMaxAnisotropy(),
      )
  }

  texture.needsUpdate = true

  return registerTexture(texture)
}

const celestialPreloadImages:
  HTMLImageElement[] = []

const celestialImageBitmaps:
  ImageBitmap[] = []

function getDomTextureReadyState(
  textureKey: CelestialTextureKey,
) {
  if (textureKey === 'sun') {
    return sunDomTextureReady
  }

  if (textureKey === 'earth') {
    return earthDomTextureReady
  }

  return moonDomTextureReady
}

function getWebglTextureReadyState(
  textureKey: CelestialTextureKey,
) {
  if (textureKey === 'sun') {
    return sunWebglTextureReady
  }

  if (textureKey === 'earth') {
    return earthWebglTextureReady
  }

  return moonWebglTextureReady
}

function getMainTextureOverlay(
  textureKey: CelestialTextureKey,
) {
  if (textureKey === 'sun') {
    return sunTextureOverlayRef.value
  }

  if (textureKey === 'earth') {
    return earthTextureOverlayRef.value
  }

  return moonTextureOverlayRef.value
}

function syncCelestialSurfaceMode() {
  ;(
    [
      'sun',
      'earth',
      'moon',
    ] as CelestialTextureKey[]
  ).forEach((textureKey) => {
    const domReady =
      getDomTextureReadyState(
        textureKey,
      ).value

    const webglReady =
      getWebglTextureReadyState(
        textureKey,
      ).value

    const usesDom =
      domReady &&
      !webglReady

    celestialUniforms[
      textureKey
    ].uOpacity.value =
      usesDom
        ? textureKey === 'sun'
          ? 0.2
          : textureKey === 'earth'
            ? 0.21
            : 0.18
        : 1

    const overlay =
      getMainTextureOverlay(
        textureKey,
      )

    if (overlay && !usesDom) {
      overlay.style.display = 'none'
    }
  })
}

function preloadDomCelestialTexture(
  textureKey: CelestialTextureKey,
) {
  const image = new Image()
  const readyState =
    getDomTextureReadyState(
      textureKey,
    )

  image.decoding = 'async'

  image.onload = () => {
    readyState.value = true
    syncCelestialSurfaceMode()
    updateMainTextureOverlays()
  }

  image.onerror = () => {
    readyState.value = false
    syncCelestialSurfaceMode()
  }

  /*
   * 不设置 crossOrigin。
   * OSS 图片只作为 DOM/CSS 背景显示，不读取进 Canvas/WebGL。
   */
  image.src =
    TEXTURE_SOURCE_URLS[
      textureKey
    ]

  celestialPreloadImages.push(image)
}

async function loadSameOriginCelestialTexture(
  textureKey: CelestialTextureKey,
  url: string,
) {
  const readyState =
    getWebglTextureReadyState(
      textureKey,
    )

  try {
    const response =
      await fetch(
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
      !contentType.startsWith(
        'image/',
      )
    ) {
      readyState.value = false
      syncCelestialSurfaceMode()
      return
    }

    const blob =
      await response.blob()

    const bitmap =
      await createImageBitmap(
        blob,
      )

    celestialImageBitmaps.push(
      bitmap,
    )

    const texture =
      new THREE.Texture(bitmap)

    celestialUniforms[
      textureKey
    ].uMap.value =
      configureCelestialTexture(
        texture,
      )

    readyState.value = true
    syncCelestialSurfaceMode()
  } catch {
    /*
     * 同源映射不存在时保持静默，
     * 继续使用 OSS DOM 球面。
     */
    readyState.value = false
    syncCelestialSurfaceMode()
  }
}

function loadCelestialTextures() {
  ;(
    [
      'sun',
      'earth',
      'moon',
    ] as CelestialTextureKey[]
  ).forEach(
    preloadDomCelestialTexture,
  )

  void loadSameOriginCelestialTexture(
    'sun',
    SUN_SAME_ORIGIN_TEXTURE,
  )

  void loadSameOriginCelestialTexture(
    'earth',
    EARTH_SAME_ORIGIN_TEXTURE,
  )

  void loadSameOriginCelestialTexture(
    'moon',
    MOON_SAME_ORIGIN_TEXTURE,
  )
}

const celestialLightSunPosition =
  new THREE.Vector3()

const celestialLightBodyPosition =
  new THREE.Vector3()

function updateCelestialLightUniforms() {
  if (!sunMesh) {
    return
  }

  sunMesh.getWorldPosition(
    celestialLightSunPosition,
  )

  if (earthMesh) {
    earthMesh.getWorldPosition(
      celestialLightBodyPosition,
    )

    celestialUniforms
      .earth
      .uLightDirection
      .value
      .copy(
        celestialLightSunPosition,
      )
      .sub(
        celestialLightBodyPosition,
      )
      .normalize()
  }

  if (moonMesh) {
    moonMesh.getWorldPosition(
      celestialLightBodyPosition,
    )

    celestialUniforms
      .moon
      .uLightDirection
      .value
      .copy(
        celestialLightSunPosition,
      )
      .sub(
        celestialLightBodyPosition,
      )
      .normalize()
  }
}

const overlayWorldPosition =
  new THREE.Vector3()

const overlayCameraSpacePosition =
  new THREE.Vector3()

const overlayCenterNdc =
  new THREE.Vector3()

const overlayEdgeNdc =
  new THREE.Vector3()

const overlayCameraRight =
  new THREE.Vector3()

const overlayWorldScale =
  new THREE.Vector3()

const overlayViewDirection =
  new THREE.Vector3()

const overlayLocalDirection =
  new THREE.Vector3()

const overlayWorldQuaternion =
  new THREE.Quaternion()

const overlayInverseQuaternion =
  new THREE.Quaternion()

const overlayLongitudeState:
  Record<
    CelestialTextureKey,
    {
      value: number
      initialized: boolean
    }
  > = {
    sun: {
      value: 0,
      initialized: false,
    },
    earth: {
      value: 0,
      initialized: false,
    },
    moon: {
      value: 0,
      initialized: false,
    },
  }

function getSphereWorldRadius(
  mesh: THREE.Mesh,
) {
  const geometry =
    mesh.geometry as
      THREE.BufferGeometry

  if (!geometry.boundingSphere) {
    geometry.computeBoundingSphere()
  }

  mesh.getWorldScale(
    overlayWorldScale,
  )

  return (
    (
      geometry
        .boundingSphere
        ?.radius || 1
    ) *
    Math.max(
      Math.abs(
        overlayWorldScale.x,
      ),
      Math.abs(
        overlayWorldScale.y,
      ),
      Math.abs(
        overlayWorldScale.z,
      ),
    )
  )
}

function hideTextureOverlay(
  element: HTMLElement | null,
) {
  if (element) {
    element.style.display = 'none'
  }
}

function unwrapOverlayLongitude(
  textureKey: CelestialTextureKey,
  wrappedLongitude: number,
) {
  const state =
    overlayLongitudeState[
      textureKey
    ]

  if (!state.initialized) {
    state.initialized = true
    state.value =
      wrappedLongitude

    return state.value
  }

  const previousWrapped =
    THREE.MathUtils
      .euclideanModulo(
        state.value + 180,
        360,
      ) - 180

  let delta =
    wrappedLongitude -
    previousWrapped

  if (delta > 180) {
    delta -= 360
  } else if (delta < -180) {
    delta += 360
  }

  state.value += delta
  return state.value
}

function positionTextureOverlay(
  element: HTMLElement | null,
  mesh: THREE.Mesh | null,
  textureKey: CelestialTextureKey,
) {
  const usesDom =
    getDomTextureReadyState(
      textureKey,
    ).value &&
    !getWebglTextureReadyState(
      textureKey,
    ).value

  if (
    !element ||
    !mesh ||
    !mesh.visible ||
    !usesDom ||
    !camera ||
    lastSceneWidth <= 0 ||
    lastSceneHeight <= 0
  ) {
    hideTextureOverlay(element)
    return
  }

  camera.updateMatrixWorld()

  mesh.updateWorldMatrix(
    true,
    false,
  )

  mesh.getWorldPosition(
    overlayWorldPosition,
  )

  overlayCameraSpacePosition
    .copy(
      overlayWorldPosition,
    )
    .applyMatrix4(
      camera.matrixWorldInverse,
    )

  if (
    overlayCameraSpacePosition.z >= 0
  ) {
    hideTextureOverlay(element)
    return
  }

  overlayCenterNdc
    .copy(
      overlayWorldPosition,
    )
    .project(camera)

  overlayCameraRight
    .set(1, 0, 0)
    .applyQuaternion(
      camera.quaternion,
    )
    .multiplyScalar(
      getSphereWorldRadius(
        mesh,
      ),
    )

  overlayEdgeNdc
    .copy(
      overlayWorldPosition,
    )
    .add(
      overlayCameraRight,
    )
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
    !Number.isFinite(
      radiusPixels,
    ) ||
    radiusPixels < 1 ||
    centerX + radiusPixels < 0 ||
    centerX - radiusPixels >
      lastSceneWidth ||
    centerY + radiusPixels < 0 ||
    centerY - radiusPixels >
      lastSceneHeight
  ) {
    hideTextureOverlay(element)
    return
  }

  mesh.getWorldQuaternion(
    overlayWorldQuaternion,
  )

  overlayInverseQuaternion
    .copy(
      overlayWorldQuaternion,
    )
    .invert()

  overlayViewDirection
    .copy(camera.position)
    .sub(
      overlayWorldPosition,
    )
    .normalize()

  overlayLocalDirection
    .copy(
      overlayViewDirection,
    )
    .applyQuaternion(
      overlayInverseQuaternion,
    )
    .normalize()

  const wrappedLongitude =
    THREE.MathUtils.radToDeg(
      Math.atan2(
        -overlayLocalDirection.z,
        overlayLocalDirection.x,
      ),
    )

  const continuousLongitude =
    unwrapOverlayLongitude(
      textureKey,
      wrappedLongitude,
    )

  const diameter =
    radiusPixels * 2.025

  const imageWidth =
    diameter * 2

  const sourceU =
    continuousLongitude /
      360 +
    0.5

  const backgroundLeft =
    diameter * 0.5 -
    sourceU * imageWidth

  const distance =
    camera.position
      .distanceTo(
        overlayWorldPosition,
      )

  element.style.display = 'block'

  element.style.width =
    `${diameter}px`

  element.style.height =
    `${diameter}px`

  element.style.transform =
    `translate3d(${centerX - diameter / 2}px, ${centerY - diameter / 2}px, 0)`

  element.style.zIndex =
    String(
      Math.max(
        1,
        Math.round(
          10000 -
          distance * 20,
        ),
      ),
    )

  element.style.backgroundSize =
    `${imageWidth}px ${diameter}px`

  element.style.backgroundPosition =
    `${backgroundLeft}px 50%`

  if (textureKey === 'moon') {
    const lunarDarkening =
      alignmentData
        .value
        .lunarScore

    const brightness =
      THREE.MathUtils.lerp(
        1,
        0.38,
        lunarDarkening,
      )

    element.style.filter =
      `brightness(${brightness.toFixed(3)}) contrast(1.1)`
  } else if (
    textureKey === 'earth'
  ) {
    element.style.filter =
      'saturate(1.08) contrast(1.05)'
  } else {
    element.style.filter =
      'saturate(1.14) contrast(1.04) brightness(1.04)'
  }
}

function updateMainTextureOverlays() {
  positionTextureOverlay(
    sunTextureOverlayRef.value,
    sunMesh,
    'sun',
  )

  positionTextureOverlay(
    earthTextureOverlayRef.value,
    earthMesh,
    'earth',
  )

  positionTextureOverlay(
    moonTextureOverlayRef.value,
    moonMesh,
    'moon',
  )
}

function setPreviewSurfacePosition(
  element: HTMLElement | null,
  object: THREE.Object3D | null,
  radius: number,
  visible: boolean
) {
  if (!element || !object || !visible) {
    hideTextureOverlay(element)
    return
  }

  const left = (object.position.x + 1) * 50
  const top = (1 - object.position.y) * 50
  const diameter = radius * 100

  element.style.display = 'block'
  element.style.left = `${left}%`
  element.style.top = `${top}%`
  element.style.width = `${diameter}%`
  element.style.height = `${diameter}%`
  element.style.transform =
    'translate(-50%, -50%)'
  element.style.borderRadius = '50%'
}

function updatePreviewTextureOverlays() {
  const isSolarHalf =
    phaseAngle.value < 90 || phaseAngle.value > 270

  setPreviewSurfacePosition(
    previewSunTextureRef.value,
    previewSun,
    0.55,
    showEarthView.value && isSolarHalf
  )
  setPreviewSurfacePosition(
    previewMoonTextureRef.value,
    previewMoon,
    0.57,
    showEarthView.value && isSolarHalf
  )
  setPreviewSurfacePosition(
    previewLunarMoonTextureRef.value,
    previewLunarMoon,
    0.55,
    showEarthView.value && !isSolarHalf
  )
  setPreviewSurfacePosition(
    previewEarthShadowTextureRef.value,
    previewEarthShadow,
    0.58,
    showEarthView.value && !isSolarHalf
  )

  if (previewMoonTextureRef.value) {
    const eclipseStrength = alignmentData.value.solarScore
    const brightness = THREE.MathUtils.lerp(0.72, 0.2, eclipseStrength)
    previewMoonTextureRef.value.style.filter =
      `grayscale(0.25) brightness(${brightness.toFixed(3)}) contrast(1.1)`
  }

  if (previewLunarMoonTextureRef.value) {
    const eclipseStrength = alignmentData.value.lunarScore
    const brightness = THREE.MathUtils.lerp(1, 0.46, eclipseStrength)
    const sepia = THREE.MathUtils.lerp(0, 0.78, eclipseStrength)
    previewLunarMoonTextureRef.value.style.filter =
      `brightness(${brightness.toFixed(3)}) sepia(${sepia.toFixed(3)}) saturate(1.35)`
  }
}

function createOrbitLine() {
  const points: THREE.Vector3[] = []
  const scale = getCurrentScale()

  for (let index = 0; index <= 180; index += 1) {
    points.push(
      calculateMoonPosition(
        (index / 180) * 360,
        moonInclination.value,
        sarosProgress.value,
        scale.moonDistance
      )
    )
  }

  const geometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints(points)
  )
  const material = registerMaterial(
    new THREE.LineBasicMaterial({
      color: 0xd9f7ff,
      transparent: true,
      opacity: 0.82,
    })
  )

  moonOrbitLine = new THREE.Line(geometry, material)
  moonOrbitLine.visible = showMoonOrbit.value
  scene?.add(moonOrbitLine)
}

function updateOrbitLineGeometry() {
  if (!moonOrbitLine) {
    return
  }

  const scale = getCurrentScale()
  const points: THREE.Vector3[] = []

  for (let index = 0; index <= 180; index += 1) {
    points.push(
      calculateMoonPosition(
        (index / 180) * 360,
        moonInclination.value,
        sarosProgress.value,
        scale.moonDistance
      )
    )
  }

  const oldGeometry = moonOrbitLine.geometry
  const newGeometry = registerGeometry(
    new THREE.BufferGeometry().setFromPoints(points)
  )

  moonOrbitLine.geometry = newGeometry
  oldGeometry.dispose()
}

function createStarField() {
  const starCount = 1800
  const positions = new Float32Array(starCount * 3)

  let seed = 7789
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  for (let index = 0; index < starCount; index += 1) {
    const radius = 120 + random() * 120
    const theta = random() * Math.PI * 2
    const phi = Math.acos(2 * random() - 1)

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.cos(phi)
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }

  const geometry = registerGeometry(new THREE.BufferGeometry())
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  )

  const material = registerMaterial(
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    })
  )

  starField = new THREE.Points(geometry, material)
  scene?.add(starField)
}

function createReferenceLayers() {
  const planeMaterial = registerMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x2ec4b6,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )

  eclipticPlane = new THREE.Mesh(
    registerGeometry(new THREE.PlaneGeometry(160, 92)),
    planeMaterial
  )
  eclipticPlane.rotation.x = -Math.PI / 2
  eclipticPlane.visible = showEclipticPlane.value
  scene?.add(eclipticPlane)

  const lineMaterial = registerMaterial(
    new THREE.LineBasicMaterial({
      color: 0x53f4ff,
      transparent: true,
      opacity: 0.8,
    })
  )

  earthSunLine = new THREE.Line(
    registerGeometry(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-80, 0, 0),
        new THREE.Vector3(26, 0, 0),
      ])
    ),
    lineMaterial
  )
  earthSunLine.visible = showEclipticPlane.value
  scene?.add(earthSunLine)
}

function createSunlightBeam(
  sunRadius: number,
  targetRadius: number
) {
  const geometry = registerGeometry(
    new THREE.CylinderGeometry(
      targetRadius,
      sunRadius,
      1,
      64,
      1,
      true
    )
  )

  const material = registerMaterial(
    new THREE.ShaderMaterial({
      uniforms: {
        startColor: {
          value: new THREE.Color(SUNLIGHT_START_COLOR),
        },
        endColor: {
          value: new THREE.Color(SUNLIGHT_END_COLOR),
        },
        beamOpacity: {
          value: SUNLIGHT_OPACITY,
        },
      },
      vertexShader: `
        varying float vBeamProgress;

        void main() {
          vBeamProgress = clamp(position.y + 0.5, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 startColor;
        uniform vec3 endColor;
        uniform float beamOpacity;
        varying float vBeamProgress;

        void main() {
          vec3 beamColor = mix(startColor, endColor, vBeamProgress);
          float centerGlow = 0.76 + 0.24 * sin(vBeamProgress * 3.1415926);
          gl_FragColor = vec4(beamColor, beamOpacity * centerGlow);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
  )

  const beam = new THREE.Mesh(geometry, material)
  beam.frustumCulled = false
  beam.renderOrder = 0

  return beam
}

function orientBeamBetween(
  beam: THREE.Mesh,
  startPosition: THREE.Vector3,
  endPosition: THREE.Vector3
) {
  const direction = endPosition.clone().sub(startPosition)
  const distance = Math.max(direction.length(), 0.001)

  beam.position.copy(
    startPosition.clone().add(endPosition).multiplyScalar(0.5)
  )
  beam.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  )
  beam.scale.set(1, distance, 1)
}

function createUmbraMesh(
  radius: number,
  length: number,
  color: number,
  opacity: number
) {
  const geometry = registerGeometry(
    new THREE.ConeGeometry(radius, length, 64, 1, false)
  )
  const material = registerMaterial(
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  )

  return new THREE.Mesh(geometry, material)
}

function orientConeFromBase(
  cone: THREE.Mesh,
  basePosition: THREE.Vector3,
  direction: THREE.Vector3,
  length: number
) {
  const normalizedDirection = direction.clone().normalize()
  cone.position.copy(
    basePosition.clone().addScaledVector(normalizedDirection, length / 2)
  )
  cone.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    normalizedDirection
  )
}

function rebuildUmbraMeshes() {
  if (!scene) {
    return
  }

  if (earthUmbra) {
    scene.remove(earthUmbra)
    earthUmbra.geometry.dispose()
    ;(earthUmbra.material as THREE.Material).dispose()
  }

  if (moonUmbra) {
    scene.remove(moonUmbra)
    moonUmbra.geometry.dispose()
    ;(moonUmbra.material as THREE.Material).dispose()
  }

  if (earthSunlightBeam) {
    scene.remove(earthSunlightBeam)
    earthSunlightBeam.geometry.dispose()
    earthSunlightBeam.material.dispose()
  }

  if (moonSunlightBeam) {
    scene.remove(moonSunlightBeam)
    moonSunlightBeam.geometry.dispose()
    moonSunlightBeam.material.dispose()
  }

  const scale = getCurrentScale()

  earthSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.earthRadius * 1.08
  )
  moonSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.moonRadius * 1.16
  )

  earthUmbra = createUmbraMesh(
    scale.earthRadius * 1.03,
    scale.earthUmbraLength,
    EARTH_UMBRA_COLOR,
    EARTH_UMBRA_OPACITY
  )

  moonUmbra = createUmbraMesh(
    scale.moonRadius * 1.08,
    scale.moonUmbraLength,
    MOON_UMBRA_COLOR,
    MOON_UMBRA_OPACITY
  )

  earthUmbra.renderOrder = 2
  moonUmbra.renderOrder = 2

  scene.add(
    earthSunlightBeam,
    moonSunlightBeam,
    earthUmbra,
    moonUmbra
  )
  updateCelestialGeometry()
}

function updateBodyGeometry(
  mesh: THREE.Mesh | null,
  radius: number,
  widthSegments = 64,
  heightSegments = 40
) {
  if (!mesh) {
    return
  }

  const oldGeometry = mesh.geometry as THREE.BufferGeometry
  const newGeometry = registerGeometry(
    new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  )
  mesh.geometry = newGeometry
  oldGeometry.dispose()
}

function updateCelestialGeometry() {
  const scale = getCurrentScale()

  updateBodyGeometry(
    sunMesh,
    scale.sunRadius,
    128,
    96,
  )

  updateBodyGeometry(
    earthMesh,
    scale.earthRadius,
    128,
    96,
  )

  updateBodyGeometry(
    moonMesh,
    scale.moonRadius,
    96,
    72,
  )

  if (sunMesh) {
    sunMesh.position.set(-scale.sunDistance, 0, 0)
  }

  if (sunPointLight) {
    sunPointLight.position.set(-scale.sunDistance, 0, 0)
  }

  if (earthUmbra) {
    orientConeFromBase(
      earthUmbra,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      scale.earthUmbraLength
    )
  }

  if (earthSunlightBeam && sunMesh) {
    orientBeamBetween(
      earthSunlightBeam,
      sunMesh.position,
      new THREE.Vector3(0, 0, 0)
    )
  }

  updateMoonTransform()
  updateOrbitLineGeometry()
}

function updateMoonTransform() {
  if (!moonMesh) {
    return
  }

  const scale = getCurrentScale()
  const position = calculateMoonPosition(
    moonLongitude.value,
    moonInclination.value,
    sarosProgress.value,
    scale.moonDistance
  )

  moonMesh.position.copy(position)

  if (moonUmbra && sunMesh) {
    const awayFromSun = moonMesh.position
      .clone()
      .sub(sunMesh.position)
      .normalize()

    orientConeFromBase(
      moonUmbra,
      moonMesh.position,
      awayFromSun,
      scale.moonUmbraLength
    )
  }

  if (moonSunlightBeam && sunMesh) {
    orientBeamBetween(
      moonSunlightBeam,
      sunMesh.position,
      moonMesh.position
    )
  }

  const isSolarHalf =
    phaseAngle.value < 90 || phaseAngle.value > 270

  if (moonUmbra) {
    moonUmbra.visible = showUmbra.value && isSolarHalf
  }

  if (earthUmbra) {
    earthUmbra.visible = showUmbra.value && !isSolarHalf
  }

  if (moonSunlightBeam) {
    moonSunlightBeam.visible = isSolarHalf
  }

  if (earthSunlightBeam) {
    earthSunlightBeam.visible = !isSolarHalf
  }

  updateCelestialLightUniforms()
  updatePreviewObjects()
}

function createPreviewScene() {
  previewScene = new THREE.Scene()
  previewScene.background = new THREE.Color(0x000000)

  previewCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20)
  previewCamera.position.set(0, 0, 5)

  const sunMaterial =
    createPreviewBodyMaterial(
      'sun',
    )

  const moonMaterial =
    createPreviewBodyMaterial(
      'moon',
    )

  const lunarMoonMaterial =
    createPreviewBodyMaterial(
      'moon',
    )

  previewSun = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.55, 64, 40)),
    sunMaterial
  )
  previewSun.position.z = 0

  previewMoon = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.57, 64, 40)),
    moonMaterial
  )
  previewMoon.position.z = 1

  previewLunarMoon = new THREE.Mesh(
    registerGeometry(new THREE.SphereGeometry(0.55, 64, 40)),
    lunarMoonMaterial
  )
  previewLunarMoon.position.z = 0

  previewEarthShadow = new THREE.Mesh(
    registerGeometry(new THREE.CircleGeometry(0.58, 64)),
    registerMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x1d0808,
        transparent: true,
        opacity: 0.86,
      })
    )
  )
  previewEarthShadow.position.z = 1

  previewScene.add(
    previewSun,
    previewMoon,
    previewLunarMoon,
    previewEarthShadow
  )

  updatePreviewObjects()
}

function updatePreviewObjects() {
  if (
    !previewSun ||
    !previewMoon ||
    !previewLunarMoon ||
    !previewEarthShadow
  ) {
    return
  }

  const isSolarHalf =
    phaseAngle.value < 90 || phaseAngle.value > 270

  previewSun.visible = isSolarHalf
  previewMoon.visible = isSolarHalf
  previewLunarMoon.visible = !isSolarHalf
  previewEarthShadow.visible = !isSolarHalf

  const solarOffset = alignmentData.value.solarSeparation / 7
  const lunarOffset = alignmentData.value.lunarSeparation / 7
  const verticalOffset = THREE.MathUtils.clamp(
    alignmentData.value.moonHeight * 5,
    -0.7,
    0.7
  )

  previewMoon.position.x = THREE.MathUtils.clamp(
    solarOffset * Math.sign(Math.sin(THREE.MathUtils.degToRad(phaseAngle.value + 0.1))),
    -1.25,
    1.25
  )
  previewMoon.position.y = verticalOffset

  previewEarthShadow.position.x = THREE.MathUtils.clamp(
    lunarOffset * Math.sign(Math.sin(THREE.MathUtils.degToRad(phaseAngle.value + 0.1))),
    -1.25,
    1.25
  )
  previewEarthShadow.position.y = -verticalOffset

  const eclipseSolar =
    alignmentData.value.solarSeparation <=
    alignmentData.value.solarThreshold
  const eclipseLunar =
    alignmentData.value.lunarSeparation <=
    alignmentData.value.lunarThreshold

  ;(previewMoon.material as THREE.MeshBasicMaterial).color.set(
    eclipseSolar ? 0x262626 : 0x666666
  )
  ;(previewEarthShadow.material as THREE.MeshBasicMaterial).color.set(
    eclipseLunar ? 0x3d0a0a : 0x050505
  )
}

function createCelestialScene() {
  if (!scene) {
    return
  }

  const scale = getCurrentScale()

  sunMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        scale.sunRadius,
        128,
        96,
      ),
    ),
    createBodyMaterial(
      'sun',
    ),
  )
  sunMesh.name = 'sun'
  sunMesh.renderOrder = 1
  sunMesh.position.set(-scale.sunDistance, 0, 0)

  earthMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        scale.earthRadius,
        128,
        96,
      ),
    ),
    createBodyMaterial(
      'earth',
    ),
  )
  earthMesh.name = 'earth'
  earthMesh.renderOrder = 1
  earthMesh.rotation.z = THREE.MathUtils.degToRad(23.5)

  moonMesh = new THREE.Mesh(
    registerGeometry(
      new THREE.SphereGeometry(
        scale.moonRadius,
        96,
        72,
      ),
    ),
    createBodyMaterial(
      'moon',
    ),
  )
  moonMesh.name = 'moon'
  moonMesh.renderOrder = 1

  clickableObjects.push(sunMesh, earthMesh, moonMesh)
  scene.add(sunMesh, earthMesh, moonMesh)

  createOrbitLine()
  createReferenceLayers()
  createStarField()

  earthSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.earthRadius * 1.08
  )
  moonSunlightBeam = createSunlightBeam(
    scale.sunRadius * 0.96,
    scale.moonRadius * 1.16
  )

  earthUmbra = createUmbraMesh(
    scale.earthRadius * 1.03,
    scale.earthUmbraLength,
    EARTH_UMBRA_COLOR,
    EARTH_UMBRA_OPACITY
  )
  moonUmbra = createUmbraMesh(
    scale.moonRadius * 1.08,
    scale.moonUmbraLength,
    MOON_UMBRA_COLOR,
    MOON_UMBRA_OPACITY
  )

  earthUmbra.renderOrder = 2
  moonUmbra.renderOrder = 2

  scene.add(
    earthSunlightBeam,
    moonSunlightBeam,
    earthUmbra,
    moonUmbra
  )
  updateCelestialGeometry()
}

function resizeThreeSceneNow() {
  const container = threeContainerRef.value

  if (!container || !camera || !renderer) {
    return
  }

  const rect = container.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  if (width < 16 || height < 16) {
    scheduleSceneResize(120)
    return
  }

  if (
    width === lastSceneWidth &&
    height === lastSceneHeight
  ) {
    renderScene()
    return
  }

  lastSceneWidth = width
  lastSceneHeight = height

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
  renderScene()
}

function scheduleSceneResize(delay = 110) {
  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  sceneResizeTimer = setTimeout(() => {
    sceneResizeTimer = null

    if (
      draggingSide.value ||
      viewportResizing.value
    ) {
      return
    }

    sceneResizeFrame = requestAnimationFrame(() => {
      sceneResizeSettleFrame = requestAnimationFrame(() => {
        resizeThreeSceneNow()
      })
    })
  }, delay)
}

function renderPreviewInset() {
  if (
    !renderer ||
    !previewScene ||
    !previewCamera ||
    !earthViewOverlayRef.value ||
    !showEarthView.value
  ) {
    return
  }

  const canvasRect = renderer.domElement.getBoundingClientRect()
  const overlayRect = earthViewOverlayRef.value.getBoundingClientRect()

  const left = Math.round(overlayRect.left - canvasRect.left)
  const bottom = Math.round(canvasRect.bottom - overlayRect.bottom)
  const width = Math.max(1, Math.round(overlayRect.width))
  const height = Math.max(1, Math.round(overlayRect.height))

  if (
    left < 0 ||
    bottom < 0 ||
    left + width > canvasRect.width + 2 ||
    bottom + height > canvasRect.height + 2
  ) {
    return
  }

  renderer.setScissorTest(true)
  renderer.setViewport(left, bottom, width, height)
  renderer.setScissor(left, bottom, width, height)
  renderer.clearDepth()
  renderer.render(previewScene, previewCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, lastSceneWidth, lastSceneHeight)
}

function renderScene() {
  if (!renderer || !scene || !camera) {
    return
  }

  renderer.setViewport(0, 0, lastSceneWidth, lastSceneHeight)
  renderer.setScissorTest(false)
  renderer.render(scene, camera)
  renderPreviewInset()

  updateMainTextureOverlays()
  updatePreviewTextureOverlays()
}

function animateScene(time: number) {
  sceneAnimationFrameId = requestAnimationFrame(animateScene)

  const delta = lastFrameTime
    ? Math.min((time - lastFrameTime) / 1000, 0.05)
    : 0
  lastFrameTime = time

  if (isPlaying.value && moonOrbitEnabled.value) {
    moonLongitude.value = normalizeDegrees(
      moonLongitude.value + delta * 7.2 * playbackSpeed.value
    )
  }

  if (sunMesh) {
    sunMesh.rotation.y +=
      delta *
      0.09 *
      playbackSpeed.value
  }

  if (
    earthRotationEnabled.value &&
    earthMesh
  ) {
    earthMesh.rotation.y +=
      delta *
      0.72 *
      playbackSpeed.value
  }

  if (
    moonOrbitEnabled.value &&
    moonMesh
  ) {
    moonMesh.rotation.y +=
      delta *
      0.2 *
      playbackSpeed.value
  }

  if (starField) {
    starField.rotation.y += delta * 0.002
  }

  orbitControls?.update()
  updateMoonTransform()
  renderScene()
}

function initScene() {
  const container = threeContainerRef.value

  if (!container) {
    return
  }

  container.replaceChildren()

  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600)
  camera.position.set(18, 28, 70)

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.domElement.className = 'scene-canvas three-canvas'
  container.appendChild(renderer.domElement)

  orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.08
  orbitControls.minDistance = 12
  orbitControls.maxDistance = 150
  orbitControls.target.set(0, 0, 0)
  orbitControls.update()

  ambientLight = new THREE.AmbientLight(0x6f8398, 0.65)
  scene.add(ambientLight)

  sunPointLight = new THREE.PointLight(0xffb23f, 980, 0, 2)
  scene.add(sunPointLight)

  createCelestialScene()
  createPreviewScene()
  loadCelestialTextures()
  syncCelestialSurfaceMode()
  setCameraView(currentView.value)

  renderer.domElement.addEventListener('pointerdown', handleScenePointerDown)

  resizeThreeSceneNow()

  threeResizeObserver = new ResizeObserver(() => {
    if (
      draggingSide.value ||
      viewportResizing.value
    ) {
      return
    }
    scheduleSceneResize(110)
  })
  threeResizeObserver.observe(container)

  lastFrameTime = 0
  sceneAnimationFrameId = requestAnimationFrame(animateScene)
}

function handleScenePointerDown(event: PointerEvent) {
  if (!renderer || !camera) {
    return
  }

  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(pointer, camera)
  const intersects = raycaster.intersectObjects(clickableObjects, false)

  if (!intersects.length) {
    return
  }

  const name = intersects[0].object.name

  if (name === 'sun' || name === 'earth' || name === 'moon') {
    selectedObject.value = name
  }
}

function handleManualMoonPosition() {
  isPlaying.value = false
  updateMoonTransform()
}

function togglePlayback() {
  isPlaying.value = !isPlaying.value
  moonOrbitEnabled.value = true
}

function setCameraView(view: string) {
  currentView.value = view

  if (!camera || !orbitControls) {
    return
  }

  const scale = getCurrentScale()

  if (view === 'top') {
    camera.position.set(
      -scale.sunDistance * 0.2,
      Math.max(58, scale.sunDistance * 0.9),
      0.01
    )
    orbitControls.target.set(-scale.sunDistance * 0.22, 0, 0)
  } else if (view === 'alignment') {
    camera.position.set(
      -scale.sunDistance * 0.18,
      Math.max(8, scale.sunDistance * 0.11),
      Math.max(54, scale.sunDistance * 0.82)
    )
    orbitControls.target.set(-scale.sunDistance * 0.2, 0, 0)
  } else if (view === 'earth') {
    camera.position.set(18, 10, 19)
    orbitControls.target.set(0, 0, 0)
  } else {
    /*
     * 默认全景向后拉远，并把观察中心放在太阳与地球之间，
     * 确保太阳不会被左上角的食相观察窗遮挡或裁切。
     */
    camera.position.set(
      scale.sunDistance * 0.34,
      Math.max(28, scale.sunDistance * 0.68),
      Math.max(68, scale.sunDistance * 1.95)
    )
    orbitControls.target.set(-scale.sunDistance * 0.3, 0, 0)
  }

  orbitControls.update()
  renderScene()
}

function focusEclipseAlignment() {
  const solarDistance = alignmentData.value.solarSeparation
  const lunarDistance = alignmentData.value.lunarSeparation

  moonLongitude.value = solarDistance <= lunarDistance ? 0 : 180
  sarosProgress.value = 0
  isPlaying.value = false
  currentView.value = 'alignment'
  setCameraView('alignment')
  updateMoonTransform()
}

function resetControls() {
  setAllCollapsed(false)
  resetWidths()

  moonOrbitEnabled.value = true
  earthRotationEnabled.value = false
  showUmbra.value = true
  showEarthView.value = true
  showEclipticPlane.value = false
  showMoonOrbit.value = true
  realScaleMode.value = false
  moonLongitude.value = 0
  moonInclination.value = 5.1
  sarosProgress.value = 90
  playbackSpeed.value = 1
  isPlaying.value = true
  selectedObject.value = 'earth'
  currentView.value = 'overview'

  setCameraView('overview')
  updateCelestialGeometry()
  scheduleSceneResize(90)
}

watch(
  moonLongitude,
  () => {
    updateMoonTransform()
  }
)

watch(
  [moonInclination, sarosProgress],
  () => {
    updateOrbitLineGeometry()
    updateMoonTransform()
  }
)

watch(
  showUmbra,
  updateMoonTransform
)

watch(
  showEarthView,
  () => {
    nextTick(() => {
      renderScene()
    })
  }
)

watch(
  showEclipticPlane,
  (value) => {
    if (eclipticPlane) {
      eclipticPlane.visible = value
    }
    if (earthSunLine) {
      earthSunLine.visible = value
    }
  }
)

watch(
  showMoonOrbit,
  (value) => {
    if (moonOrbitLine) {
      moonOrbitLine.visible = value
    }
  }
)

watch(
  realScaleMode,
  () => {
    rebuildUmbraMeshes()
    setCameraView(currentView.value)
  }
)

function disposeScene() {
  cancelAnimationFrame(sceneAnimationFrameId)

  if (sceneResizeTimer) {
    clearTimeout(sceneResizeTimer)
    sceneResizeTimer = null
  }

  cancelAnimationFrame(sceneResizeFrame)
  cancelAnimationFrame(sceneResizeSettleFrame)

  threeResizeObserver?.disconnect()
  threeResizeObserver = null

  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('pointerdown', handleScenePointerDown)
  }

  orbitControls?.dispose()
  orbitControls = null

  disposableMaterials.forEach(
    (material) =>
      material.dispose(),
  )

  disposableGeometries.forEach(
    (geometry) =>
      geometry.dispose(),
  )

  disposableTextures.forEach(
    (texture) =>
      texture.dispose(),
  )

  celestialPreloadImages.forEach(
    (image) => {
      image.onload = null
      image.onerror = null
    },
  )

  celestialPreloadImages.length = 0

  celestialImageBitmaps.forEach(
    (bitmap) =>
      bitmap.close(),
  )

  celestialImageBitmaps.length = 0

  renderer?.dispose()

  if (renderer?.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }

  clickableObjects.length = 0
  disposableMaterials.length = 0
  disposableGeometries.length = 0
  disposableTextures.length = 0

  sunDomTextureReady.value = false
  earthDomTextureReady.value = false
  moonDomTextureReady.value = false

  sunWebglTextureReady.value = false
  earthWebglTextureReady.value = false
  moonWebglTextureReady.value = false

  hideTextureOverlay(
    sunTextureOverlayRef.value,
  )

  hideTextureOverlay(
    earthTextureOverlayRef.value,
  )

  hideTextureOverlay(
    moonTextureOverlayRef.value,
  )

  ;(
    [
      'sun',
      'earth',
      'moon',
    ] as CelestialTextureKey[]
  ).forEach(
    (textureKey) => {
      overlayLongitudeState[
        textureKey
      ].value = 0

      overlayLongitudeState[
        textureKey
      ].initialized = false
    },
  )

  scene = null
  camera = null
  renderer = null
  sunMesh = null
  earthMesh = null
  moonMesh = null
  moonOrbitLine = null
  eclipticPlane = null
  earthSunLine = null
  earthUmbra = null
  moonUmbra = null
  earthSunlightBeam = null
  moonSunlightBeam = null
  ambientLight = null
  sunPointLight = null
  starField = null
  previewScene = null
  previewCamera = null
  previewSun = null
  previewMoon = null
  previewLunarMoon = null
  previewEarthShadow = null
}

onMounted(async () => {
  await nextTick()

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initScene()
      scheduleSceneResize(0)
    })
  })
})

onBeforeUnmount(() => {
  disposeScene()
})
</script>

<style scoped>
.eclipse-stage-content {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  background: #5b5b5b;
}

.eclipse-stage-content .three-host {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: transparent;
}


.celestial-texture-layer {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.celestial-texture-overlay {
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

.celestial-texture-overlay::before,
.celestial-texture-overlay::after {
  position: absolute;
  content: '';
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
}

.celestial-texture-overlay::before {
  z-index: 1;
  background:
    radial-gradient(
      circle at 29% 24%,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 255, 255, 0.07) 23%,
      rgba(255, 255, 255, 0) 43%,
      rgba(0, 0, 0, 0.1) 61%,
      rgba(0, 0, 0, 0.46) 82%,
      rgba(0, 0, 0, 0.88) 100%
    );
}

.celestial-texture-overlay::after {
  z-index: 2;
  border:
    1px solid
    rgba(220, 238, 255, 0.18);
  box-shadow:
    inset -15px -8px 26px
      rgba(0, 0, 0, 0.3),
    inset 8px 5px 15px
      rgba(255, 255, 255, 0.05);
}

.earth-texture-surface {
  filter:
    saturate(1.08)
    contrast(1.05);
}

.earth-texture-surface::after {
  box-shadow:
    inset -18px -8px 28px
      rgba(0, 0, 0, 0.48),
    inset 8px 5px 18px
      rgba(190, 229, 255, 0.1),
    0 0 18px
      rgba(67, 161, 255, 0.12);
}

.moon-texture-surface {
  filter:
    grayscale(0.03)
    contrast(1.1)
    brightness(0.97);
}

.moon-texture-surface::before {
  background:
    radial-gradient(
      circle at 30% 25%,
      rgba(255, 255, 255, 0.17) 0%,
      rgba(255, 255, 255, 0.05) 27%,
      rgba(255, 255, 255, 0) 46%,
      rgba(0, 0, 0, 0.15) 65%,
      rgba(0, 0, 0, 0.52) 84%,
      rgba(0, 0, 0, 0.9) 100%
    );
}

.moon-texture-surface::after {
  box-shadow:
    inset -16px -7px 28px
      rgba(0, 0, 0, 0.48),
    0 0 10px
      rgba(218, 227, 236, 0.12);
}

.sun-texture-surface {
  filter:
    saturate(1.14)
    contrast(1.04)
    brightness(1.04);
}

.sun-texture-surface::before {
  background:
    radial-gradient(
      circle at 36% 31%,
      rgba(255, 255, 255, 0.22) 0%,
      rgba(255, 223, 116, 0.06) 39%,
      rgba(128, 33, 0, 0.16) 76%,
      rgba(83, 18, 0, 0.42) 100%
    );
}

.sun-texture-surface::after {
  border:
    1px solid
    rgba(255, 218, 112, 0.34);
  box-shadow:
    inset -10px -5px 20px
      rgba(108, 24, 0, 0.24),
    0 0 22px
      rgba(255, 174, 43, 0.62),
    0 0 54px
      rgba(255, 132, 22, 0.3);
}


.preview-texture-surface,
.preview-earth-shadow-texture {
  position: absolute;
  display: none;
  pointer-events: none;
  transform:
    translate(-50%, -50%);
  transform-origin:
    center center;
  border-radius: 50%;
}

.preview-texture-surface {
  overflow: hidden;
  background-repeat:
    repeat-x;
  background-position:
    50% 50%;
  background-size:
    200% 100%;
  will-change:
    left,
    top,
    width,
    height,
    filter;
}

.preview-texture-surface::before,
.preview-texture-surface::after {
  position: absolute;
  content: '';
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
}

.preview-texture-surface::before {
  z-index: 1;
  border:
    1px solid
    rgba(255, 255, 255, 0.14);
}

.preview-texture-surface::after {
  z-index: 2;
  background:
    radial-gradient(
      circle at 31% 28%,
      rgba(255, 255, 255, 0.13) 0%,
      rgba(255, 255, 255, 0.02) 35%,
      rgba(0, 0, 0, 0.13) 61%,
      rgba(0, 0, 0, 0.72) 100%
    );
}

.preview-sun-texture {
  z-index: 1;
  box-shadow:
    0 0 22px
      rgba(255, 174, 43, 0.42),
    0 0 42px
      rgba(255, 121, 22, 0.2);
}

.preview-sun-texture::after {
  background:
    radial-gradient(
      circle at 38% 34%,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 207, 76, 0.03) 47%,
      rgba(111, 29, 0, 0.2) 100%
    );
}

.preview-moon-texture,
.preview-lunar-moon-texture {
  z-index: 2;
  box-shadow:
    inset -9px -5px 17px
      rgba(0, 0, 0, 0.32);
}

.preview-moon-texture::after,
.preview-lunar-moon-texture::after {
  background:
    radial-gradient(
      circle at 30% 27%,
      rgba(255, 255, 255, 0.11) 0%,
      rgba(255, 255, 255, 0.02) 35%,
      rgba(0, 0, 0, 0.16) 63%,
      rgba(0, 0, 0, 0.76) 100%
    );
}

.preview-earth-shadow-texture {
  z-index: 3;
  background:
    rgba(25, 3, 4, 0.72);
  box-shadow:
    inset 10px 0 18px
      rgba(134, 28, 18, 0.24);
}

.scene-title-chip {
  position: absolute;
  top: clamp(12px, 1.2vw, 18px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  z-index: 3;
  pointer-events: none;
  transform: translateX(-50%);
  color: var(--text-primary);
  background: rgba(4, 15, 28, 0.72);
  border: 1px solid rgba(143, 255, 244, 0.24);
  border-radius: 999px;
  backdrop-filter: blur(10px);
}

.scene-title-chip strong {
  font-size: clamp(12px, 0.9vw, 15px);
}

.scene-title-chip small {
  color: var(--text-secondary);
  font-size: clamp(9px, 0.72vw, 12px);
}

.scene-title-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #2ec4b6;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(46, 196, 182, 0.9);
}

.earth-view-overlay {
  position: absolute;
  top: clamp(14px, 1.3vw, 20px);
  left: clamp(14px, 1.3vw, 20px);
  z-index: 5;
  width: clamp(200px, 22vw, 330px);
  aspect-ratio: 1 / 1;
  pointer-events: none;
  overflow: hidden;
  isolation: isolate;
  background: #000;
  border: 2px solid rgba(255, 255, 255, 0.38);
  border-radius: 12px;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.34);
}

.earth-view-heading {
  position: absolute;
  top: 9px;
  left: 9px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 9px;
  color: #0b1220;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 7px;
}

.earth-view-heading strong {
  font-size: 14px;
}

.earth-view-heading span {
  font-size: 10px;
  opacity: 0.7;
}

.scene-legend-panel {
  position: absolute;
  z-index: 3;
  top: clamp(14px, 1.3vw, 20px);
  right: clamp(14px, 1.3vw, 20px);
  width: clamp(230px, 19vw, 310px);
  padding: 12px 14px;
  pointer-events: none;
  color: var(--text-secondary);
  background: rgba(4, 13, 24, 0.76);
  border: 1px solid rgba(145, 205, 255, 0.18);
  border-radius: 11px;
  backdrop-filter: blur(10px);
}

.scene-legend-panel h3 {
  margin: 0 0 10px;
  color: var(--text-primary);
  font-size: clamp(12px, 0.86vw, 15px);
}

.scene-legend-list {
  display: grid;
  gap: 8px;
}

.scene-legend-panel .legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: clamp(9px, 0.72vw, 12px);
  line-height: 1.5;
}

.scene-legend-panel small {
  display: block;
  margin-top: 9px;
  color: var(--text-tertiary, var(--text-secondary));
  font-size: clamp(8px, 0.65vw, 10px);
  line-height: 1.5;
}

.legend-swatch {
  width: 25px;
  height: 5px;
  flex: 0 0 auto;
  margin-top: 6px;
  border-radius: 999px;
}

.umbra-swatch {
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.58);
}

.sunlight-swatch {
  background: linear-gradient(90deg, #ff4d1f, #ffdc45);
  border: 1px solid rgba(255, 226, 113, 0.78);
}

.orbit-swatch {
  background: #d9f7ff;
}

.ecliptic-swatch {
  background: #2ec4b6;
}

.interaction-hint {
  position: absolute;
  z-index: 3;
  right: clamp(12px, 1.2vw, 18px);
  bottom: clamp(12px, 1.2vw, 18px);
  padding: 7px 10px;
  pointer-events: none;
  color: var(--text-secondary);
  font-size: clamp(9px, 0.72vw, 12px);
  background: rgba(4, 13, 24, 0.66);
  border: 1px solid rgba(145, 205, 255, 0.15);
  border-radius: 8px;
}

.phase-scale {
  display: flex;
  justify-content: space-between;
  margin: -2px 2px 10px;
  color: var(--text-secondary);
  font-size: 10px;
}

.view-option-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.eclipse-data-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wide-data-card {
  grid-column: 1 / -1;
}

.wide-data-card strong {
  font-size: clamp(16px, 1.12vw, 21px);
}

.wide-data-card small {
  line-height: 1.65;
}

/*
 * 公共 data-card 默认会对较长数值做单行省略。
 * 天体运动周期需要完整显示，因此允许在本业务数据区正常换行。
 */
.eclipse-data-grid .data-card strong {
  max-width: 100%;
  overflow: visible;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
  text-overflow: clip;
}

.period-data-card strong {
  font-size: clamp(15px, 1.04vw, 20px);
}

.solar-status-card {
  border-color: rgba(255, 213, 74, 0.28);
}

.lunar-status-card {
  border-color: rgba(255, 107, 107, 0.28);
}

.normal-status-card {
  border-color: rgba(46, 196, 182, 0.28);
}

.solar-lunar-eclipse-container
.workspace.panel-resizing,
.solar-lunar-eclipse-container
.workspace.layout-resizing,
.solar-lunar-eclipse-container
.workspace.panel-resizing
.side-panel,
.solar-lunar-eclipse-container
.workspace.layout-resizing
.side-panel,
.solar-lunar-eclipse-container
.workspace.panel-resizing
.center-stage,
.solar-lunar-eclipse-container
.workspace.layout-resizing
.center-stage {
  transition: none !important;
}

.solar-lunar-eclipse-container .three-canvas {
  position: absolute;
  z-index: 0;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 1100px) {
  .earth-view-overlay {
    width: clamp(180px, 24vw, 260px);
  }

  .scene-legend-panel {
    width: clamp(210px, 24vw, 270px);
  }
}
</style>
