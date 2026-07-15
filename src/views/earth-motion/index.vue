<template>
  <section ref="rootRef"
    class="earth-orbit-template earth-orbit-template5 geo-template-page geo-page theme-dark layout-floating"
    :class="'layout-' + layoutMode">
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png"
          alt="logo" />
      </div>

      <h1 class="page-title">地球运动</h1>

      <div class="toolbar-actions">

        <button type="button" class="theme-btn toolbar-btn" :class="{ active: subSceneVisible }"
          @click="subSceneVisible = !subSceneVisible">
          副机位
        </button>

        <button type="button" class="theme-btn toolbar-btn" :class="{ active: timelineDockVisible }"
          @click="timelineDockVisible = !timelineDockVisible">
          时间轴
        </button>

        <button type="button" class="theme-btn toolbar-btn panel-toolbar-btn" @click="toggleAllControlPanels">
          {{ allPanelsCollapsed ? '展开控制' : '收起控制' }}
        </button>
      </div>
    </header>

    <main class="workspace" :class="{
      'has-left': hasLeftPanel,
      'has-right': hasRightPanel,
    }" :style="{
      '--left-panel-width':
        leftCollapsed
          ? '0px'
          : leftPanelWidth + 'px',
      '--right-panel-width':
        rightCollapsed
          ? '0px'
          : rightPanelWidth + 'px',
    }">
      <aside id="left-panel" class="side-panel left-panel" :class="{ collapsed: leftCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>控制面板</h2>
              <p>控制视角、速度、图层与观测点</p>
            </div>

            <span class="panel-badge">CONTROL</span>
          </div>

          <section class="geo-card control-section">
            <h3 class="section-title">视角中心</h3>

            <div class="option-grid two-col-option-grid">
              <button type="button" class="theme-btn option-btn" :class="{ active: focusMode === 'sun' }"
                @click="switchFocus('sun')">
                太阳中心
              </button>

              <button type="button" class="theme-btn option-btn" :class="{ active: focusMode === 'earth' }"
                @click="switchFocus('earth')">
                地球中心
              </button>

              <button type="button" class="theme-btn option-btn" @click="resetCamera">
                重置视角
              </button>

              <button type="button" class="theme-btn option-btn" @click="setCameraPreset('top')">
                俯视
              </button>
            </div>
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">观测点</h3>

            <div class="switch-row first-control-row">
              <div class="control-copy">
                <strong>允许点击替换</strong>
                <span>点击地球表面替换当前观测点</span>
              </div>

              <el-switch v-model="clickAddEnabled" />
            </div>

            <div class="preset-cloud">
              <button v-for="p in presetPlaces" :key="p.name" type="button"
                class="theme-btn option-btn place-btn uniform-place-btn" :class="{ active: isPresetActive(p) }"
                @click="addPreset(p)">
                {{ p.name }}
              </button>
            </div>

            <button type="button" class="theme-btn reset-scene-btn" @click="clearObservationPoints">
              恢复上海
            </button>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">自转速度</h3>
              <strong class="control-value">
                {{ daySpeed.toFixed(2) }}×
              </strong>
            </div>

            <el-slider v-model="daySpeed" :min="0.05" :max="8" :step="0.05" :show-tooltip="false" />

            <div class="switch-row">
              <div class="control-copy">
                <strong>自动演示</strong>
                <span>自动推进公转与自转时间</span>
              </div>

              <el-switch v-model="isPlaying" />
            </div>
          </section>

          <section class="geo-card control-section">
            <div class="section-title-row">
              <h3 class="section-title">定向光强度</h3>
              <strong class="control-value">
                {{ sunLightPower.toFixed(2) }}×
              </strong>
            </div>

            <el-slider v-model="sunLightPower" :min="0.8" :max="3.5" :step="0.05" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">夜间灯光亮度</span>
              <strong class="control-value">
                {{ nightLightPower.toFixed(2) }}×
              </strong>
            </div>

            <el-slider v-model="nightLightPower" :min="0.5" :max="4" :step="0.05" :show-tooltip="false" />

            <div class="section-title-row compact-title-row">
              <span class="mini-control-label">暗面地表亮度</span>
              <strong class="control-value">
                {{ darkSideSurfacePower.toFixed(2) }}×
              </strong>
            </div>

            <el-slider v-model="darkSideSurfacePower" :min="0.05" :max="1.2" :step="0.05" :show-tooltip="false" />
          </section>

          <section class="geo-card control-section">
            <h3 class="section-title">地球图层</h3>

            <div class="layer-switch-list">
              <div v-for="item in displayOptions" :key="item.key" class="switch-row compact-switch-row">
                <div class="control-copy">
                  <strong>{{ item.label }}</strong>
                </div>

                <el-switch v-model="toggles[item.key]" />
              </div>
            </div>
          </section>
        </div>

        <div class="resize-handle resize-right" @pointerdown.stop.prevent="
          startResize('left', $event)
          "></div>

        <button type="button" class="panel-collapse-btn collapse-left" aria-label="收起左侧面板" @click="toggleLeftPanel">
          ‹
        </button>
      </aside>

      <section class="center-stage">
        <div class="stage-content">
          <div ref="viewportRef" class="scene-host orbit-scene-host">
            <canvas ref="canvasRef" class="three-canvas scene-canvas"></canvas>
          </div>

          <div class="orbit-overlay-layer">
            <section v-show="subSceneVisible" ref="subSceneRef" class="sub-scene-window scene-float-card" :style="{
              width: `${subSceneSize.width}px`,
              height: `${subSceneSize.height}px`,
            }">
              <header class="sub-scene-head">
                <div class="sub-title">
                  <span>副机位观察</span>
                  <strong>{{ subViewLabel }}</strong>
                </div>

                <el-select v-model="subViewMode" class="theme-select sub-view-select"
                  popper-class="geo-select-popper geo-select-popper-dark" size="small" :teleported="false">
                  <el-option v-for="view in subViewModes" :key="view.key" :label="view.label" :value="view.key" />
                </el-select>
              </header>

              <canvas ref="subCanvasRef" class="sub-canvas"></canvas>

              <button class="sub-resize-handle" type="button" title="拖动调整副机位大小"
                @pointerdown.stop.prevent="onSubResizeStart"></button>
            </section>

            <section v-show="timelineDockVisible" class="timeline-dock orbit-time-dock">
              <button type="button" class="timeline-icon-btn" :class="{ active: isPlaying }"
                :aria-label="isPlaying ? '暂停' : '播放'" :title="isPlaying ? '暂停' : '播放'" @click="isPlaying = !isPlaying">
                <svg v-if="isPlaying" class="timeline-play-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5h4v14H7z"></path>
                  <path d="M13 5h4v14h-4z"></path>
                </svg>

                <svg v-else class="timeline-play-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              </button>
              <div class="timeline-main orbit-timeline-main">
                <div class="timeline-row">
                  <div class="timeline-label between">
                    <span>公转时间轴</span>
                    <strong class="accent-value">
                      {{ currentSolarTerm.name }}
                    </strong>
                  </div>

                  <el-slider v-model="yearProgress" :min="0" :max="1" :step="0.001" :show-tooltip="false" />
                </div>

                <div class="timeline-scale term-scale-row">
                  <div class="scale-track term-scale">
                    <button v-for="term in solarTerms" :key="term.name" type="button" :style="{
                      left: sliderTrackLeft(term.progress)
                    }" @click="setSolarTerm(term.progress)">
                      <i></i>
                      <span>{{ term.name }}</span>
                    </button>
                  </div>
                </div>

                <div class="timeline-row">
                  <div class="timeline-label between">
                    <span>自转时间轴</span>
                    <strong class="accent-value">
                      {{ observerSolarTime }}
                    </strong>
                  </div>

                  <el-slider v-model="observerLocalHour" :min="0" :max="24" :step="0.05" :show-tooltip="false" />
                </div>

                <div class="hour-scale">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                  <span>18h</span>
                  <span>24h</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <aside id="right-panel" class="side-panel right-panel" :class="{ collapsed: rightCollapsed }">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>实时数据</h2>
              <p>观测点、太阳直射点、昼夜长与季节变化</p>
            </div>

            <span class="panel-badge">DATA</span>
          </div>

          <section class="geo-card data-panel-card observation-data-card" :class="{ empty: !selectedObservation }">
            <header class="obs-head">
              <span class="obs-title-main">观测点</span>
              <div class="obs-place-row">
                <strong>
                  {{ selectedObservation ? selectedObservation.name : '未选择观测点' }}
                </strong>
              </div>
            </header>

            <div v-if="selectedObservation" class="obs-body">
              <div class="obs-summary-cards">
                <article class="obs-summary-card">
                  <span>直射纬度</span>
                  <strong class="accent-value">
                    {{ formatLat(currentDeclinationDeg) }}
                  </strong>
                </article>

                <article class="obs-summary-card date-card">
                  <span>日期 / 日序</span>
                  <strong>
                    <em class="date-text">{{ currentMonthDay }}</em>
                    · 第 {{ currentDayOfYear }} 天
                  </strong>
                </article>
              </div>

              <dl>
                <div>
                  <dt>纬度</dt>
                  <dd>{{ formatLat(selectedObservation.lat) }}</dd>
                </div>
                <div>
                  <dt>经度</dt>
                  <dd>{{ formatLon(selectedObservation.lon) }}</dd>
                </div>
                <div>
                  <dt>太阳时</dt>
                  <dd class="accent-value">{{ selectedObservation.solarTime }}</dd>
                </div>
                <div>
                  <dt>太阳高度角</dt>
                  <dd class="accent-value">{{ formatSignedDeg(selectedObservation.solarAltitude) }}</dd>
                </div>
                <div v-if="selectedObservation.polarStatus" class="wide">
                  <dt>昼夜状态</dt>
                  <dd class="accent-value">{{ selectedObservation.polarStatus }}</dd>
                </div>
                <div v-if="!selectedObservation.polarStatus">
                  <dt>昼长</dt>
                  <dd>{{ selectedObservation.dayLength }}</dd>
                </div>
                <div v-if="!selectedObservation.polarStatus">
                  <dt>夜长</dt>
                  <dd>{{ selectedObservation.nightLength }}</dd>
                </div>
                <div>
                  <dt>日出</dt>
                  <dd class="accent-value">{{ selectedObservation.sunriseTime }}</dd>
                </div>
                <div>
                  <dt>日落</dt>
                  <dd class="accent-value">{{ selectedObservation.sunsetTime }}</dd>
                </div>
              </dl>

              <section class="geo-card direct-track-card">


                <header class="direct-track-head">


                  <div>


                    <h3>太阳直射点移动</h3>


                    <p>南北回归线之间的周年摆动</p>


                  </div>


                  <span>δ</span>


                </header>



                <section class="obs-track-card earth-section-card">
                  <svg class="earth-section-svg" viewBox="0 0 280 112" preserveAspectRatio="xMidYMid meet" role="img">
                    <defs>
                      <linearGradient id="trackGradientObs" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#2ec4b6"></stop>
                        <stop offset="55%" stop-color="#47a3ff"></stop>
                        <stop offset="100%" stop-color="#ffd166"></stop>
                      </linearGradient>
                    </defs>

                    <g class="ellipse-earth-pair">
                      <ellipse cx="82" cy="56" rx="58" ry="47" class="earth-ellipse-outline"></ellipse>

                      <ellipse cx="198" cy="56" rx="58" ry="47" class="earth-ellipse-outline"></ellipse>

                      <path d="M24 43 L82 43 L140 43 L198 43 L256 43" class="section-lat-line tropic"></path>

                      <path d="M24 49.5 L82 49.5 L140 49.5 L198 49.5 L256 49.5" class="section-lat-line grid"></path>

                      <path d="M24 56 L82 56 L140 56 L198 56 L256 56" class="section-lat-line equator"></path>

                      <path d="M24 62.5 L82 62.5 L140 62.5 L198 62.5 L256 62.5" class="section-lat-line grid"></path>

                      <path d="M24 69 L82 69 L140 69 L198 69 L256 69" class="section-lat-line tropic"></path>

                      <path d="M48 16 C39 35 39 77 48 96" class="section-lon-line"></path>
                      <path d="M82 9 C82 31 82 81 82 103" class="section-lon-line main"></path>
                      <path d="M116 16 C125 35 125 77 116 96" class="section-lon-line"></path>

                      <path d="M164 16 C155 35 155 77 164 96" class="section-lon-line"></path>
                      <path d="M198 9 C198 31 198 81 198 103" class="section-lon-line main"></path>
                      <path d="M232 16 C241 35 241 77 232 96" class="section-lon-line"></path>

                      <text x="8" y="46" text-anchor="start" class="latitude-label">
                        北回归线
                      </text>

                      <text x="8" y="59" text-anchor="start" class="latitude-label">
                        赤道
                      </text>

                      <text x="8" y="72" text-anchor="start" class="latitude-label">
                        南回归线
                      </text>

                      <path :d="sunTrackPath" class="earth-track-path"></path>

                      <circle :cx="progressToX(yearProgress)" :cy="latToY(currentDeclinationDeg)" r="4.8"
                        class="track-dot"></circle>

                      <line :x1="progressToX(yearProgress) - 24" :x2="progressToX(yearProgress) + 24"
                        :y1="latToY(currentDeclinationDeg)" :y2="latToY(currentDeclinationDeg)" class="sun-direct-ray">
                      </line>

                      <text :x="progressToX(yearProgress)" :y="Math.max(12, latToY(currentDeclinationDeg) - 9)"
                        text-anchor="middle" class="direct-label">
                        直射点
                      </text>
                    </g>
                  </svg>
                </section>


              </section>
            </div>

            <p v-else class="empty-tip">
              选择城市后显示太阳高度角、昼夜长等信息。
            </p>
          </section>
        </div>

        <div class="resize-handle resize-left" @pointerdown.stop.prevent="
          startResize('right', $event)
          "></div>

        <button type="button" class="panel-collapse-btn collapse-right" aria-label="收起右侧面板"
          @click="rightCollapsed = true">
          ›
        </button>
      </aside>

      <button v-if="hasRightPanel && rightCollapsed" type="button" class="panel-entry-btn entry-right"
        aria-label="展开右侧面板" @click="rightCollapsed = false">
        ‹
      </button>

      <button v-if="hasLeftPanel && leftCollapsed" type="button" class="panel-entry-btn entry-left" aria-label="展开左侧面板"
        @click="toggleLeftPanel">
        ›
      </button>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import '@/styles/geo-page-template.css'
import { ElButton, ElSlider, ElSwitch, ElSelect, ElOption } from 'element-plus'
import 'element-plus/dist/index.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type FocusMode = 'sun' | 'earth'

type SubViewMode =
  | 'dawn'
  | 'dusk'
  | 'southPole'
  | 'northPole'
  | 'night'
  | 'day'

interface ObservationPoint {
  id: number
  name: string
  lat: number
  lon: number
}

interface PresetPlace {
  name: string
  lat: number
  lon: number
}

interface ObservationResult extends ObservationPoint {
  solarTime: string
  solarAltitude: number
  polarStatus: string
  dayLength: string
  nightLength: string
  sunriseTime: string
  sunsetTime: string
}

interface SolarTerm {
  name: string
  progress: number
  day: number
  date: string
}

interface CalendarTick {
  label: string
  progress: number
}

interface SubViewOption {
  key: SubViewMode
  label: string
}

interface SubResizeState {
  startX: number
  startY: number
  width: number
  height: number
}

interface DisplayToggleMap {
  terminator: boolean
  grid: boolean
  tropics: boolean
  tiltLabels: boolean
  tiltAngle: boolean
  rotationArrow: boolean
  axis: boolean
  dayNightArc: boolean
  sunRays: boolean
  coordLabels: boolean
  [key: string]: boolean
}


const DEG = Math.PI / 180
const RAD = 180 / Math.PI
const EARTH_TILT_DEG = 23.44
const EARTH_TILT = EARTH_TILT_DEG * DEG
const EARTH_RADIUS = 1.35
const SUN_RADIUS = 2.45
const ORBIT_RADIUS = 12.6
const YEAR_DAYS = 365
const SPRING_EQUINOX_DAY = 80
const SPIN_VISUAL_OFFSET = 0

const TEXTURE_BASE = '/geo-resources-folder/images'
const RAW_TEXTURES = {
  sun: `${TEXTURE_BASE}/sun.png`,
  earth: `${TEXTURE_BASE}/Material.002_diffuse.jpg`,
  night: `${TEXTURE_BASE}/emissive.jpg`
}

const rootRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const subCanvasRef = ref<HTMLCanvasElement | null>(null)
const subSceneRef = ref<HTMLElement | null>(null)
const panelCollapsed = ref(false)
type LayoutMode =
  | 'large'
  | 'medium'
  | 'small'

const hasLeftPanel = true
const hasRightPanel = true

const layoutMode =
  ref<LayoutMode>('large')


/*
 * 面板宽度说明：
 * 公共模板 CSS 管视觉样式和大屏兜底；
 * 但本组件会在 workspace 上通过 inline style 写入
 * --left-panel-width / --right-panel-width。
 * 所以默认宽度、拖拽最大宽度、拖拽后是否被 ResizeObserver 重置，
 * 都必须在本组件 JS 里同步放开。
 */

const leftPanelWidth = ref(420)
const rightPanelWidth = ref(500)

const leftCollapsed = panelCollapsed
const rightCollapsed = ref(false)

const allPanelsCollapsed = computed(() =>
  leftCollapsed.value &&
  rightCollapsed.value &&
  !subSceneVisible.value &&
  !timelineDockVisible.value
)

function toggleAllControlPanels() {
  const shouldExpand =
    allPanelsCollapsed.value

  leftCollapsed.value =
    !shouldExpand
  rightCollapsed.value =
    !shouldExpand
  subSceneVisible.value =
    shouldExpand
  timelineDockVisible.value =
    shouldExpand

  requestMainResize()
}



let previousLayoutMode:
  | LayoutMode
  | null = null

let leftPanelManuallyResized = false
let rightPanelManuallyResized = false

let pageResizeObserver:
  | ResizeObserver
  | null = null

let panelResizeState:
  | {
    startX: number
    width: number
  }
  | null = null

function getLayoutMode(width: number): LayoutMode {
  if (width < 800) {
    return 'small'
  }

  if (width < 1440) {
    return 'medium'
  }

  return 'large'
}

function clampPanelNumber(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  )
}

function getAdaptivePanelWidth(
  side: 'left' | 'right',
  mode: LayoutMode,
  pageWidth: number
): number {
  if (mode === 'small') {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.76, 260, 360)
      : clampPanelNumber(pageWidth * 0.80, 280, 380)
  }

  if (mode === 'medium') {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.36, 320, 480)
      : clampPanelNumber(pageWidth * 0.40, 360, 540)
  }

  const isTeachingLargeScreen =
    pageWidth >= 2200

  if (isTeachingLargeScreen) {
    return side === 'left'
      ? clampPanelNumber(pageWidth * 0.22, 420, 640)
      : clampPanelNumber(pageWidth * 0.25, 500, 760)
  }

  return side === 'left'
    ? clampPanelNumber(pageWidth * 0.19, 340, 520)
    : clampPanelNumber(pageWidth * 0.21, 380, 580)
}

function getPanelResizeBounds(
  side: 'left' | 'right'
) {
  const pageWidth =
    rootRef.value?.clientWidth ||
    window.innerWidth

  if (layoutMode.value === 'small') {
    return {
      min:
        side === 'left'
          ? 220
          : 240,
      max:
        Math.max(
          side === 'left'
            ? 220
            : 240,
          Math.min(
            side === 'left'
              ? 420
              : 440,
            pageWidth * 0.86
          )
        ),
    }
  }

  if (layoutMode.value === 'medium') {
    return {
      min:
        side === 'left'
          ? 280
          : 300,
      max:
        Math.max(
          side === 'left'
            ? 280
            : 300,
          Math.min(
            side === 'left'
              ? 640
              : 700,
            pageWidth * 0.60
          )
        ),
    }
  }

  /*
   * large 分两档：
   * 1. 普通 large：1440 ~ 2199，包含普通 1920×1080 电脑。
   *    这类屏幕最大拖拽宽度要收敛，避免压迫主场景。
   *
   * 2. 超大屏：2200px 以上，才放开到教室大屏 / 2K / 4K 的拖拽上限。
   */
  const isUltraLargeScreen =
    pageWidth >= 2200

  return {
    min:
      side === 'left'
        ? 300
        : 340,
    max:
      Math.max(
        side === 'left'
          ? 300
          : 340,
        Math.min(
          side === 'left'
            ? (
              isUltraLargeScreen
                ? 820
                : 560
            )
            : (
              isUltraLargeScreen
                ? 900
                : 620
            ),
          pageWidth *
          (
            isUltraLargeScreen
              ? 0.54
              : 0.38
          )
        )
      ),
  }
}

function syncTemplateLayout() {
  const width =
    rootRef.value?.clientWidth ||
    window.innerWidth

  const nextMode =
    getLayoutMode(width)

  const modeChanged =
    previousLayoutMode !== nextMode

  layoutMode.value =
    nextMode

  /*
   * 以前这里会在 large 下强行把左侧夹到 368、右侧夹到 420，
   * 导致默认不宽，拖拽后 ResizeObserver 又把宽度拉回去。
   * 现在改成：
   * 1. 首次进入按屏幕自适应给默认宽度；
   * 2. 用户拖拽后不再自动覆盖；
   * 3. 切换大/中/小布局时重新给一个合理默认值。
   */
  if (
    modeChanged ||
    !leftPanelManuallyResized
  ) {
    leftPanelWidth.value =
      Math.round(
        getAdaptivePanelWidth(
          'left',
          nextMode,
          width
        )
      )
  }

  if (
    modeChanged ||
    !rightPanelManuallyResized
  ) {
    rightPanelWidth.value =
      Math.round(
        getAdaptivePanelWidth(
          'right',
          nextMode,
          width
        )
      )
  }

  previousLayoutMode =
    nextMode
}

let panelResizeTarget:
  | 'left'
  | 'right'
  | null = null

function startResize(
  target: 'left' | 'right',
  event: PointerEvent
) {
  if (
    (target === 'left' && leftCollapsed.value) ||
    (target === 'right' && rightCollapsed.value)
  ) {
    return
  }

  event.stopPropagation()

  panelResizeTarget =
    target

  panelResizeState = {
    startX:
      event.clientX,
    width:
      target === 'left'
        ? leftPanelWidth.value
        : rightPanelWidth.value,
  }

  const handle =
    event.currentTarget as HTMLElement | null

  if (
    handle &&
    typeof handle.setPointerCapture === 'function'
  ) {
    try {
      handle.setPointerCapture(
        event.pointerId
      )
    } catch {
      // 部分触控屏或老浏览器可能不支持 pointer capture，继续使用 document 监听兜底。
    }
  }

  document.body.classList.add(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    'col-resize'

  document.body.style.userSelect =
    'none'

  document.addEventListener(
    'pointermove',
    onPanelResizeMove
  )

  document.addEventListener(
    'pointerup',
    stopPanelResize,
    {
      once: true,
    }
  )

  document.addEventListener(
    'pointercancel',
    stopPanelResize,
    {
      once: true,
    }
  )
}

function onPanelResizeMove(event: PointerEvent) {
  if (
    !panelResizeState ||
    !panelResizeTarget
  ) {
    return
  }

  const bounds =
    getPanelResizeBounds(
      panelResizeTarget
    )

  const delta =
    event.clientX -
    panelResizeState.startX

  if (panelResizeTarget === 'left') {
    leftPanelWidth.value =
      clamp(
        panelResizeState.width + delta,
        bounds.min,
        bounds.max
      )

    leftPanelManuallyResized =
      true
  } else {
    rightPanelWidth.value =
      clamp(
        panelResizeState.width - delta,
        bounds.min,
        bounds.max
      )

    rightPanelManuallyResized =
      true
  }

  requestMainResize()
}

function stopPanelResize() {
  panelResizeState =
    null

  panelResizeTarget =
    null

  document.body.classList.remove(
    'geo-panel-resizing'
  )

  document.body.style.cursor =
    ''

  document.body.style.userSelect =
    ''

  document.removeEventListener(
    'pointermove',
    onPanelResizeMove
  )

  document.removeEventListener(
    'pointerup',
    stopPanelResize
  )

  document.removeEventListener(
    'pointercancel',
    stopPanelResize
  )

  requestMainResize()
}

function toggleLeftPanel() {
  panelCollapsed.value =
    !panelCollapsed.value

  nextTick(requestMainResize)
}

function requestMainResize(immediate = false) {
  if (resizeDebounceTimer !== null) {
    window.clearTimeout(resizeDebounceTimer)
    resizeDebounceTimer = null
  }

  if (resizeFrameId) {
    window.cancelAnimationFrame(resizeFrameId)
    resizeFrameId = 0
  }

  const runResize = () => {
    resizeFrameId =
      window.requestAnimationFrame(() => {
        resizeFrameId = 0
        pendingMainResize = false
        resizeMainRenderer()
      })
  }

  if (immediate) {
    runResize()
    return
  }

  /*
   * 防拖拽闪烁：
   * 窗口持续拖拽时只记录待更新，不反复 setSize；
   * 等尺寸稳定一小段时间后再同步 WebGL 绘制缓冲。
   */
  pendingMainResize = true
  resizeDebounceTimer =
    window.setTimeout(
      runResize,
      140
    )
}

function resizeMainRenderer() {
  if (!viewportRef.value || !renderer || !camera) {
    return
  }

  const rect =
    viewportRef.value.getBoundingClientRect()

  const width =
    Math.max(
      1,
      Math.round(rect.width)
    )

  const height =
    Math.max(
      1,
      Math.round(rect.height)
    )

  if (
    width === lastMainWidth &&
    height === lastMainHeight
  ) {
    resizeSubRenderer()
    return
  }

  lastMainWidth = width
  lastMainHeight = height

  camera.aspect =
    width / height

  camera.updateProjectionMatrix()

  renderer.setSize(
    width,
    height,
    false
  )

  resizeSubRenderer()
}


const isPlaying = ref(true)
const daySpeed = ref(1.4)
const sunLightPower = ref(1.45)
const nightMapPower = ref(1.75)
const nightLightPower = ref(2.15)
const darkSideSurfacePower = ref(0.42)
const ambientLightPower = ref(1.15)
const focusMode = ref<FocusMode>('sun')
const clickAddEnabled = ref(false)
const sunTrackVisible = ref(true)
const observationPanelVisible = ref(true)
const timelineDockVisible = ref(true)
const subSceneVisible = ref(true)
const yearProgress = ref(dayOfYearToCalendarProgress(356))
const subViewMode = ref<SubViewMode>('dawn')
const subSceneSize = reactive({ width: 360, height: 268 })
const referenceSolarHour = ref(3.9)

const toggles = reactive<DisplayToggleMap>({
  terminator: true,
  grid: true,
  tropics: true,
  tiltLabels: true,
  tiltAngle: true,
  rotationArrow: true,
  axis: true,
  dayNightArc: true,
  sunRays: true,
  coordLabels: true
})

const displayOptions = [
  { key: 'terminator', label: '晨昏线' },
  { key: 'grid', label: '经纬网' },
  { key: 'tropics', label: '南北回归线' },
  { key: 'tiltLabels', label: '黄道面/赤道面' },
  { key: 'tiltAngle', label: '黄赤交角标注' },
  { key: 'rotationArrow', label: '自转方向箭头' },
  { key: 'axis', label: '地球自转轴' },
  { key: 'dayNightArc', label: '昼弧/夜弧' },
  { key: 'sunRays', label: '太阳直射光来向' },
  { key: 'coordLabels', label: '经纬度标签' }
]

const solarTerms: SolarTerm[] = [
  { name: '春分', progress: dayOfYearToCalendarProgress(80), day: 80, date: '3月21日' },
  { name: '夏至', progress: dayOfYearToCalendarProgress(172), day: 172, date: '6月21日' },
  { name: '秋分', progress: dayOfYearToCalendarProgress(266), day: 266, date: '9月23日' },
  { name: '冬至', progress: dayOfYearToCalendarProgress(356), day: 356, date: '12月22日' }
]

const calendarTicks: CalendarTick[] = [
  { label: '1月1日', progress: dayOfYearToCalendarProgress(1) },
  { label: '3月', progress: dayOfYearToCalendarProgress(60) },
  { label: '6月', progress: dayOfYearToCalendarProgress(152) },
  { label: '9月', progress: dayOfYearToCalendarProgress(244) },
  { label: '12月31日', progress: dayOfYearToCalendarProgress(365) }
]

const subViewModes: SubViewOption[] = [
  { key: 'dawn', label: '晨线' },
  { key: 'dusk', label: '昏线' },
  { key: 'southPole', label: '南极' },
  { key: 'northPole', label: '北极' },
  { key: 'night', label: '夜半球' },
  { key: 'day', label: '昼半球' }
]
const subViewLabel = computed(() => subViewModes.find((item) => item.key === subViewMode.value)?.label || '副视角')

const presetPlaces: PresetPlace[] = [
  { name: '北京，中国', lat: 39.9042, lon: 116.4074 },
  { name: '上海，中国', lat: 31.2304, lon: 121.4737 },
  { name: '伦敦，英国', lat: 51.5072, lon: -0.1276 },
  { name: '莫斯科，俄罗斯', lat: 55.7558, lon: 37.6173 },
  { name: '奥斯陆，挪威', lat: 59.9139, lon: 10.7522 },
  { name: '赫尔辛基，芬兰', lat: 60.1699, lon: 24.9384 },
  { name: '蓬塔阿雷纳斯，智利', lat: -53.1638, lon: -70.9171 },
  { name: '新加坡', lat: 1.3521, lon: 103.8198 },
  { name: '开罗，埃及', lat: 30.0444, lon: 31.2357 },
  { name: '纽约，美国', lat: 40.7128, lon: -74.006 },
  { name: '悉尼，澳大利亚', lat: -33.8688, lon: 151.2093 }
]

const DEFAULT_OBSERVATION: ObservationPoint = { id: 1, name: '上海，中国', lat: 31.2304, lon: 121.4737 }
const observationPoints = ref<ObservationPoint[]>([{ ...DEFAULT_OBSERVATION }])
const selectedObservationId = ref(DEFAULT_OBSERVATION.id)
let pointCounter = 1

const currentDeclinationDeg = computed(() => getDeclination(yearProgress.value) * RAD)
const currentDayOfYear = computed(() => progressToDayOfYear(yearProgress.value))
const currentMonthDay = computed(() => dayOfYearToMonthDay(currentDayOfYear.value))
const currentSolarTerm = computed(() => {
  const p = normalize01(yearProgress.value)
  const ordered = [...solarTerms].sort((a, b) => a.progress - b.progress)
  let active = ordered[ordered.length - 1]
  for (const term of ordered) {
    if (p >= term.progress) active = term
  }
  return active
})
const selectedObservation = computed(() => {
  const point = observationPoints.value.find((p) => p.id === selectedObservationId.value)
  return point ? computeObservation(point) : null
})

const currentObserverPoint = computed(() => observationPoints.value.find((p) => p.id === selectedObservationId.value) || DEFAULT_OBSERVATION)
const observerLocalHour = computed({
  get() {
    const observer = currentObserverPoint.value
    return normalizeHour(referenceSolarHour.value + observer.lon / 15)
  },
  set(value) {
    const observer = currentObserverPoint.value
    referenceSolarHour.value = normalizeHour(Number(value) - observer.lon / 15)
  }
})
const observerSolarTime = computed(() => selectedObservation.value?.solarTime || formatHour(observerLocalHour.value))

const svgWidth = 252
const svgHeight = 108
const svgPad = 32
const svgRightPad = 8
const svgTopPad = 16
const svgBottomPad = 20
const yTicks = [
  { lat: 23.44, label: '23.44°N' },
  { lat: 0, label: '0°' },
  { lat: -23.44, label: '23.44°S' }
]

const sunTrackPath = computed(() => {
  const total = 96
  const points: string[] = []

  for (let i = 0; i <= total; i += 1) {
    const t =
      i / total

    // 冬至作为左端起点：
    // t=0   -> 南回归线
    // t=0.25-> 赤道
    // t=0.5 -> 北回归线
    // t=0.75-> 赤道
    // t=1   -> 南回归线
    const lat =
      -EARTH_TILT_DEG *
      Math.cos(t * Math.PI * 2)

    const x =
      24 + t * 232

    const y =
      latToY(lat)

    points.push(
      `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    )
  }

  return points.join(' ')
})

type DisposableSceneObject =
  THREE.Object3D & {
    geometry?: THREE.BufferGeometry
    material?: THREE.Material | THREE.Material[]
  }

let scene!: THREE.Scene
let camera!: THREE.PerspectiveCamera
let renderer!: THREE.WebGLRenderer
let subRenderer: THREE.WebGLRenderer | null = null
let subCamera: THREE.PerspectiveCamera | null = null
let controls!: OrbitControls
let resizeObserver: ResizeObserver | null = null
let animationId = 0
let lastFrameTime = 0
let resizeFrameId = 0
let resizeDebounceTimer: number | null = null
let lastMainWidth = 0
let lastMainHeight = 0
let lastSubWidth = 0
let lastSubHeight = 0
let pendingMainResize = false
let raycaster!: THREE.Raycaster
let mouse!: THREE.Vector2
let sunMesh: THREE.Mesh | null = null
let earthOrbitGroup!: THREE.Group
let earthRoot!: THREE.Group
let earthTiltGroup!: THREE.Group
let earthSpinGroup!: THREE.Group
let earthMesh!: THREE.Mesh
let orbitLine: THREE.Line | null = null
let starField: THREE.Points | null = null
let nebulaGroup: THREE.Group | null = null
let terminatorLine: THREE.Line | null = null
let dayArcLine: THREE.Line | null = null
let nightArcLine: THREE.Line | null = null
let gridGroup: THREE.Group | null = null
let tropicsGroup: THREE.Group | null = null
let coordLabelGroup: THREE.Group | null = null
let axisGroup: THREE.Group | null = null
let planesGroup: THREE.Group | null = null
let equatorPlaneGroup: THREE.Group | null = null
let tiltAngleGroup: THREE.Group | null = null
let rotationArrowGroup: THREE.Group | null = null
let sunRaysGroup: THREE.Group | null = null
let subsolarMarker: THREE.Mesh | null = null
let labelGroup!: THREE.Group
let markerGroup!: THREE.Group
let directionalLight!: THREE.DirectionalLight
let ambientLight!: THREE.AmbientLight
let targetFocus = new THREE.Vector3(0, 0, 0)

const earthUniforms = {
  dayMap: { value: createPlaceholderTexture('#1e88e5', '#45d0ff') },
  nightMap: { value: createPlaceholderTexture('#07111f', '#ffda75') },
  sunDirection: { value: new THREE.Vector3(0, 0, 1) },
  axisDirection: { value: new THREE.Vector3(0, 1, 0) },
  showTerminator: { value: 1 },
  showDayNightArc: { value: 1 },
  sunLightPower: { value: 1.45 },
  nightMapPower: { value: 1.75 },
  nightLightPower: { value: 2.15 },
  darkSideSurfacePower: { value: 0.52 }
}

onMounted(() => {
  syncTemplateLayout()

  pageResizeObserver =
    new ResizeObserver(() => {
      syncTemplateLayout()
      requestMainResize()
    })

  if (rootRef.value) {
    pageResizeObserver.observe(rootRef.value)
  }

  nextTick(() => {
    try {
      initScene()
      animate(0)
    } catch (error) {
      console.error('EarthOrbitSimulator 初始化失败：', error)
    }
  })
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  cancelAnimationFrame(yearProgressTweenId)
  cancelAnimationFrame(resizeFrameId)
  resizeObserver?.disconnect()
  pageResizeObserver?.disconnect()
  pageResizeObserver = null
  window.removeEventListener('click', onWindowClick)
  window.removeEventListener('pointermove', onSubResizeMove)
  document.removeEventListener('pointermove', onPanelResizeMove)
  document.removeEventListener('pointerup', stopPanelResize)
  document.removeEventListener('pointercancel', stopPanelResize)
  viewportRef.value?.removeEventListener('pointerdown', onPointerDown)
  renderer?.dispose()
  subRenderer?.dispose()
  scene?.traverse((obj: THREE.Object3D) => {
    const disposable = obj as DisposableSceneObject
    if (disposable.geometry) disposable.geometry.dispose()
    if (disposable.material) {
      if (Array.isArray(disposable.material)) disposable.material.forEach((m) => m.dispose())
      else disposable.material.dispose()
    }
  })
})

watch(toggles, updateVisibility, { deep: true })
watch([yearProgress, referenceSolarHour, selectedObservationId], () => {
  updateCelestialState()
  updateObservationMarkers()
})
watch(focusMode, () => updateFocusTarget())
watch([sunLightPower, nightMapPower, nightLightPower, darkSideSurfacePower], updateLightUniforms)
watch(subViewMode, () => updateSubCamera())

function initScene() {
  if (!canvasRef.value || !viewportRef.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x020713)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)
  camera.position.set(0, 9.2, 22)

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  if (subCanvasRef.value) {
    subRenderer = new THREE.WebGLRenderer({ canvas: subCanvasRef.value, antialias: true, alpha: false })
    subRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    subRenderer.outputColorSpace = THREE.SRGBColorSpace
    subRenderer.toneMapping = THREE.ACESFilmicToneMapping
    subRenderer.toneMappingExposure = 1.05
    subCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
  }

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.minDistance = 5
  controls.maxDistance = 42
  controls.target.set(0, 0, 0)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  ambientLight = new THREE.AmbientLight(0x7fa6c9, 0.75 * ambientLightPower.value)
  scene.add(ambientLight)
  directionalLight = new THREE.DirectionalLight(0xffffff, 3.2 * sunLightPower.value)
  directionalLight.position.set(0, 0, 0)
  scene.add(directionalLight)

  markerGroup = new THREE.Group()
  labelGroup = new THREE.Group()
  earthOrbitGroup = new THREE.Group()
  scene.add(earthOrbitGroup)
  scene.add(markerGroup)
  scene.add(labelGroup)

  createNebulaBackdrop()
  createStars()
  createSun()
  createOrbit()
  createEarth()
  createTermLabels()
  createHelpers()
  loadTexturesAsync()
  setupResize()
  updateVisibility()
  updateCelestialState()
  updateObservationMarkers()

  viewportRef.value.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('click', onWindowClick)
}

function createSun() {
  const geo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64)
  const mat = new THREE.MeshBasicMaterial({ map: createPlaceholderTexture('#ff8a00', '#ffe082') })
  sunMesh = new THREE.Mesh(geo, mat)
  scene.add(sunMesh)

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS * 1.28, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  scene.add(halo)
}

function createEarth() {
  earthRoot = new THREE.Group()
  earthTiltGroup = new THREE.Group()
  earthSpinGroup = new THREE.Group()
  earthTiltGroup.rotation.z = -EARTH_TILT
  earthRoot.add(earthTiltGroup)
  earthTiltGroup.add(earthSpinGroup)
  earthOrbitGroup.add(earthRoot)

  const geo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96)
  const mat = new THREE.ShaderMaterial({
    uniforms: earthUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vLocalNormal = normalize(normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform vec3 axisDirection;
      uniform float showTerminator;
      uniform float showDayNightArc;
      uniform float sunLightPower;
      uniform float nightMapPower;
      uniform float nightLightPower;
      uniform float darkSideSurfacePower;
      varying vec2 vUv;
      varying vec3 vLocalNormal;
      varying vec3 vWorldNormal;

      float latitudeLineMask(float lat) {
        float stepValue = 3.14159265359 / 12.0;
        float shifted = mod(lat + 1.57079632679 + stepValue * 0.5, stepValue) - stepValue * 0.5;
        return 1.0 - smoothstep(0.004, 0.014, abs(shifted));
      }

      void main() {
        vec3 nWorld = normalize(vWorldNormal);
        vec3 sWorld = normalize(sunDirection);
        vec3 dayColor = texture2D(dayMap, vUv).rgb;
        vec3 nightColor = texture2D(nightMap, vUv).rgb * nightMapPower;
        float lightAmount = dot(nWorld, sWorld);
        float dayMask = smoothstep(-0.08, 0.16, lightAmount);
        vec3 litDay = dayColor * (0.40 + sunLightPower * 1.28 * max(lightAmount, 0.0));
        vec3 nightLit = nightColor * ((0.26 + nightLightPower) * (1.0 - dayMask));
        float nightSide = 1.0 - dayMask;
        float rimFill = 0.55 + 0.45 * pow(1.0 - abs(lightAmount), 0.65);
        vec3 darkSurface = dayColor * darkSideSurfacePower * rimFill * nightSide;
        vec3 color = mix(darkSurface + nightLit, litDay, dayMask);

        float lat = asin(clamp(normalize(vLocalNormal).y, -1.0, 1.0));
        float latMask = latitudeLineMask(lat) * showDayNightArc;
        color = mix(color, vec3(1.0, 0.78, 0.28), latMask * dayMask * 0.72);
        color = mix(color, vec3(0.20, 0.50, 1.0), latMask * (1.0 - dayMask) * 0.68);

        float terminatorMask = (1.0 - smoothstep(0.0, 0.035, abs(lightAmount))) * showTerminator;
        float dawnSignal = dot(cross(normalize(axisDirection), nWorld), sWorld);
        vec3 dawnColor = vec3(0.16, 1.0, 0.86);
        vec3 duskColor = vec3(1.0, 0.44, 0.18);
        color = mix(color, dawnSignal >= 0.0 ? dawnColor : duskColor, terminatorMask * 0.94);

        color += vec3(0.08, 0.22, 0.28) * pow(1.0 - abs(lightAmount), 2.0) * 0.25;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
  earthMesh = new THREE.Mesh(geo, mat)
  earthSpinGroup.add(earthMesh)

  gridGroup = createLatLonGrid()
  tropicsGroup = createTropics()
  coordLabelGroup = createCoordinateLabels()
  earthSpinGroup.add(gridGroup)
  earthSpinGroup.add(tropicsGroup)
  earthSpinGroup.add(coordLabelGroup)
}

function createOrbit() {
  const pts = []
  for (let i = 0; i <= 240; i += 1) {
    const t = (i / 240) * Math.PI * 2
    pts.push(new THREE.Vector3(-Math.sin(t) * ORBIT_RADIUS, 0, -Math.cos(t) * ORBIT_RADIUS))
  }
  orbitLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.7 })
  )
  scene.add(orbitLine)
}

function createTermLabels() {
  solarTerms.forEach((term) => {
    const pos = getOrbitPosition(term.progress)
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x2ec4b6 })
    )
    marker.position.copy(pos)
    scene.add(marker)

    const sprite = createTextSprite(term.name, '#dffffb')
    sprite.position.copy(pos).add(new THREE.Vector3(0, 0.65, 0))
    sprite.scale.set(1.25, 0.42, 1)
    labelGroup.add(sprite)
  })
}

function createHelpers() {
  axisGroup = new THREE.Group()
  const axisMat = new THREE.LineBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.94 })
  const axisPts = [new THREE.Vector3(0, -EARTH_RADIUS * 1.72, 0), new THREE.Vector3(0, EARTH_RADIUS * 1.72, 0)]
  axisGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPts), axisMat))
  const axisCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.34, 28),
    new THREE.MeshBasicMaterial({ color: 0x35f2df, transparent: true, opacity: 0.98 })
  )
  axisCone.position.set(0, EARTH_RADIUS * 1.86, 0)
  axisGroup.add(axisCone)
  const nLabel = createTextSprite('N', '#eaffff')
  nLabel.position.set(0, EARTH_RADIUS * 2.08, 0)
  nLabel.scale.set(0.42, 0.24, 1)
  axisGroup.add(nLabel)
  earthTiltGroup.add(axisGroup)

  rotationArrowGroup = new THREE.Group()
  rotationArrowGroup.position.set(0, EARTH_RADIUS * 1.88, 0)
  const rotationRadius = EARTH_RADIUS * 0.58
  const arrowCurve = createCircleArc(rotationRadius, 1.62 * Math.PI, 0.12 * Math.PI, 84, 'xz')
  rotationArrowGroup.add(new THREE.Line(arrowCurve, new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1 })))
  const arrowTipAngle = 0.12 * Math.PI
  const arrowOrigin = new THREE.Vector3(Math.cos(arrowTipAngle) * rotationRadius, 0, Math.sin(arrowTipAngle) * rotationRadius)
  const arrowDir = new THREE.Vector3(Math.sin(arrowTipAngle), 0, -Math.cos(arrowTipAngle)).normalize()
  const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.46, 0xffd166, 0.2, 0.12)
  rotationArrowGroup.add(arrow)
  const rotationLabel = createTextSprite('自西向东', '#ffd166')
  rotationLabel.position.set(0, 0.24, -rotationRadius * 0.95)
  rotationLabel.scale.set(0.88, 0.24, 1)
  rotationArrowGroup.add(rotationLabel)
  earthTiltGroup.add(rotationArrowGroup)

  planesGroup = new THREE.Group()
  const eclipticPlane = createDiscPlane(ORBIT_RADIUS * 1.02, 0x2ec4b6, 0.075)
  eclipticPlane.rotation.x = -Math.PI / 2
  planesGroup.add(eclipticPlane)
  const eclipticRing = createRingLine(ORBIT_RADIUS, 0x2ec4b6, 0.58)
  planesGroup.add(eclipticRing)
  const eclipticLabel = createTextSprite('黄道面', '#bffdf7')
  eclipticLabel.position.set(ORBIT_RADIUS * 0.58, 0.08, ORBIT_RADIUS * 0.3)
  eclipticLabel.scale.set(0.9, 0.26, 1)
  planesGroup.add(eclipticLabel)
  scene.add(planesGroup)

  equatorPlaneGroup = new THREE.Group()
  const equatorPlane = createDiscPlane(EARTH_RADIUS * 1.78, 0x48a7ff, 0.12)
  equatorPlane.rotation.x = -Math.PI / 2
  equatorPlaneGroup.add(equatorPlane)
  const equatorRing = createRingLine(EARTH_RADIUS * 1.78, 0x48a7ff, 0.78)
  equatorPlaneGroup.add(equatorRing)
  const equatorLabel = createTextSprite('赤道面', '#dffcff')
  equatorLabel.position.set(EARTH_RADIUS * 1.9, 0.08, 0)
  equatorLabel.scale.set(0.8, 0.24, 1)
  equatorPlaneGroup.add(equatorLabel)
  earthTiltGroup.add(equatorPlaneGroup)

  tiltAngleGroup = createTiltAngleHelper()
  earthRoot.add(tiltAngleGroup)

  sunRaysGroup = new THREE.Group()
  scene.add(sunRaysGroup)
  for (let i = -2; i <= 2; i += 1) {
    const isCenter = i === 0
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.1, isCenter ? 0xffd166 : 0x69e7ff, isCenter ? 0.36 : 0.24, isCenter ? 0.16 : 0.1)
    arrow.userData.offsetIndex = i
    sunRaysGroup.add(arrow)
  }
  subsolarMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 })
  )
  sunRaysGroup.add(subsolarMarker)
}


function createTiltAngleHelper() {
  const group = new THREE.Group()
  const r = EARTH_RADIUS * 1.95
  const eclipticMat = new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.98 })
  const equatorMat = new THREE.LineBasicMaterial({ color: 0x48a7ff, transparent: true, opacity: 0.98 })
  const arcMat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1 })

  const eclipticLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(r, 0, 0)]),
    eclipticMat
  )
  group.add(eclipticLine)

  const equatorLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(EARTH_TILT) * r, Math.sin(EARTH_TILT) * r, 0)]),
    equatorMat
  )
  group.add(equatorLine)

  const arc = new THREE.Line(createCircleArc(r * 0.58, 0, EARTH_TILT, 64, 'xy'), arcMat)
  group.add(arc)
  const arc2 = new THREE.Line(createCircleArc(r * 0.70, 0, EARTH_TILT, 64, 'xy'), new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.46 }))
  group.add(arc2)

  const arcTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.16, 18),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 1 })
  )
  arcTip.position.set(Math.cos(EARTH_TILT) * r * 0.58, Math.sin(EARTH_TILT) * r * 0.58, 0)
  arcTip.rotation.z = EARTH_TILT - Math.PI / 2
  group.add(arcTip)

  const label = createTextSprite('黄赤交角 23.44°', '#fff4cb')
  label.position.set(Math.cos(EARTH_TILT * 0.52) * r * 0.92, Math.sin(EARTH_TILT * 0.52) * r * 0.92 - 0.18, 0.18)
  label.scale.set(1.06, 0.26, 1)
  group.add(label)

  return group
}

function createNebulaBackdrop() {
  nebulaGroup = new THREE.Group()
  scene.add(nebulaGroup)

  const configs = [
    { x: -22, y: 12, z: -38, s: 28, a: 0.42, c1: 'rgba(46,196,182,0.42)', c2: 'rgba(36,124,255,0.18)' },
    { x: 18, y: -5, z: -42, s: 34, a: 0.34, c1: 'rgba(64,132,255,0.34)', c2: 'rgba(46,196,182,0.15)' },
    { x: 4, y: 18, z: -48, s: 40, a: 0.26, c1: 'rgba(255,209,102,0.22)', c2: 'rgba(46,196,182,0.12)' },
    { x: -32, y: -15, z: -52, s: 36, a: 0.26, c1: 'rgba(84,180,255,0.28)', c2: 'rgba(46,196,182,0.12)' }
  ]

  configs.forEach((cfg) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createNebulaSpriteTexture(cfg.c1, cfg.c2),
        transparent: true,
        opacity: cfg.a,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      })
    )
    sprite.position.set(cfg.x, cfg.y, cfg.z)
    sprite.scale.set(cfg.s, cfg.s * 0.56, 1)
    nebulaGroup.add(sprite)
  })
}

function createNebulaSpriteTexture(coreColor: string, edgeColor: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, coreColor)
  gradient.addColorStop(0.38, edgeColor)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createStars() {
  const count = 2600
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const r = 42 + Math.random() * 34
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.17, transparent: true, opacity: 0.96, depthWrite: false, sizeAttenuation: true })
  starField = new THREE.Points(geo, mat)
  scene.add(starField)
}

function loadTexturesAsync() {
  const loader = new THREE.TextureLoader()
  loadTexture(loader, RAW_TEXTURES.sun, (texture) => {
    if (sunMesh?.material) {
      texture.colorSpace = THREE.SRGBColorSpace
      sunMesh.material.map = texture
      sunMesh.material.needsUpdate = true
    }
  })
  loadTexture(loader, RAW_TEXTURES.earth, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    earthUniforms.dayMap.value = texture
  })
  loadTexture(loader, RAW_TEXTURES.night, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace
    earthUniforms.nightMap.value = texture
  })
}

function loadTexture(loader: THREE.TextureLoader, url: string, onLoad: (texture: THREE.Texture) => void) {
  loader.load(
    url,
    (texture) => onLoad(texture),
    undefined,
    (error) => console.warn(`纹理加载失败，已使用占位纹理：${url}`, error)
  )
}

function resizeSubRenderer() {
  if (subRenderer && subCanvasRef.value && subCamera) {
    const subRect = subCanvasRef.value.getBoundingClientRect()
    const subWidth = Math.max(1, Math.round(subRect.width))
    const subHeight = Math.max(1, Math.round(subRect.height))

    if (
      subWidth === lastSubWidth &&
      subHeight === lastSubHeight
    ) {
      return
    }

    lastSubWidth = subWidth
    lastSubHeight = subHeight
    subCamera.aspect = subWidth / subHeight
    subCamera.updateProjectionMatrix()
    subRenderer.setSize(subWidth, subHeight, false)
  }
}

function setupResize() {
  resizeObserver =
    new ResizeObserver(() => {
      requestMainResize()
    })

  if (viewportRef.value) {
    resizeObserver.observe(viewportRef.value)
  }

  if (subSceneRef.value) {
    resizeObserver.observe(subSceneRef.value)
  }

  requestMainResize(true)
}

function animate(time: number) {
  animationId = requestAnimationFrame(animate)
  const dt = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.08) : 0
  lastFrameTime = time

  if (isPlaying.value) {
    yearProgress.value = normalize01(yearProgress.value + (dt / 36) * 0.45)
    referenceSolarHour.value = normalizeHour(referenceSolarHour.value + dt * daySpeed.value * 0.9)
  }

  if (starField?.material) {
    starField.material.opacity = 0.84 + Math.sin(time * 0.0018) * 0.12
  }
  if (nebulaGroup) {
    nebulaGroup.rotation.z = Math.sin(time * 0.00008) * 0.025
    nebulaGroup.children.forEach((sprite: THREE.Object3D, index: number) => {
      const nebulaSprite = sprite as THREE.Sprite<THREE.SpriteMaterial>
      nebulaSprite.material.opacity = 0.24 + Math.sin(time * 0.0009 + index * 1.7) * 0.08
    })
  }
  if (sunMesh) {
    sunMesh.rotation.y += dt * 0.12
  }

  smoothCameraTarget(dt)
  controls?.update()
  renderer?.render(scene, camera)
  if (subRenderer && subCamera) {
    updateSubCamera()
    subRenderer.render(scene, subCamera)
  }
}


function updateSubCamera() {
  if (!subCamera || !earthRoot || !earthTiltGroup) return
  const earthPos = earthRoot.position.clone()
  const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthPos).normalize()
  const axisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(earthTiltGroup.getWorldQuaternion(new THREE.Quaternion())).normalize()
  const terminatorDir = new THREE.Vector3().crossVectors(axisWorld, sunDir).normalize()
  let viewDir
  switch (subViewMode.value) {
    case 'dusk':
      viewDir = terminatorDir.clone()
      break
    case 'southPole':
      viewDir = axisWorld.clone().multiplyScalar(-1)
      break
    case 'northPole':
      viewDir = axisWorld.clone()
      break
    case 'night':
      viewDir = sunDir.clone().multiplyScalar(-1)
      break
    case 'day':
      viewDir = sunDir.clone()
      break
    case 'dawn':
    default:
      viewDir = terminatorDir.clone().multiplyScalar(-1)
      break
  }
  if (!Number.isFinite(viewDir.lengthSq()) || viewDir.lengthSq() < 0.001) viewDir = new THREE.Vector3(0, 1, 0)
  const distance = EARTH_RADIUS * 3.35
  const up = Math.abs(viewDir.dot(axisWorld)) > 0.94 ? new THREE.Vector3(0, 0, 1) : axisWorld
  subCamera.position.copy(earthPos.clone().add(viewDir.normalize().multiplyScalar(distance)))
  subCamera.up.copy(up)
  subCamera.lookAt(earthPos)
}

function updateLightUniforms() {
  earthUniforms.sunLightPower.value = sunLightPower.value
  earthUniforms.nightMapPower.value = nightMapPower.value
  earthUniforms.nightLightPower.value = nightLightPower.value
  earthUniforms.darkSideSurfacePower.value = darkSideSurfacePower.value
  if (directionalLight) directionalLight.intensity = 3.2 * sunLightPower.value
  if (ambientLight) ambientLight.intensity = 0.75 * ambientLightPower.value
}

function computeSpinAngleForObserver(observer: ObservationPoint, localSolarHour: number, sunDir: THREE.Vector3) {
  if (!earthTiltGroup) return 0
  const desiredSubsolarLon = normalizeLon(observer.lon - (normalizeHour(localSolarHour) - 12) * 15)
  const inverseTilt = earthTiltGroup.getWorldQuaternion(new THREE.Quaternion()).invert()
  const sunInTiltLocal = sunDir.clone().applyQuaternion(inverseTilt).normalize()
  const currentSunLon = vectorToLonDeg(sunInTiltLocal)
  return (currentSunLon - desiredSubsolarLon) * DEG
}

function vectorToLonDeg(v: THREE.Vector3) {
  return normalizeLon(Math.atan2(-v.z, v.x) * RAD)
}

function updateCelestialState() {
  if (!earthRoot) return
  const pos = getOrbitPosition(yearProgress.value)
  earthRoot.position.copy(pos)

  const sunDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), pos).normalize()

  // 自转时间轴表示当前观测点的地方太阳时。这里反解地球自转角，
  // 使“观测点太阳时”和“该点处于昼/夜半球的视觉位置”严格一致。
  const observer = observationPoints.value.find((p) => p.id === selectedObservationId.value) || DEFAULT_OBSERVATION
  earthSpinGroup.rotation.y = SPIN_VISUAL_OFFSET + computeSpinAngleForObserver(observer, observerLocalHour.value, sunDir)

  updateLightUniforms()
  earthUniforms.sunDirection.value.copy(sunDir)
  const axisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(earthTiltGroup.getWorldQuaternion(new THREE.Quaternion())).normalize()
  earthUniforms.axisDirection.value.copy(axisWorld)

  if (directionalLight) {
    directionalLight.position.set(0, 0, 0)
    directionalLight.target = earthRoot
  }

  updateTerminator(sunDir)
  updateSunRays(sunDir)
  updateFocusTarget()
  updateSubCamera()
}

function updateTerminator(sunDir: THREE.Vector3) {
  if (!earthRoot || !terminatorLine) return
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), sunDir.clone().normalize())
  const offset = earthRoot.position
    ;[terminatorLine, dayArcLine, nightArcLine].forEach((line) => {
      if (!line) return
      line.position.copy(offset)
      line.quaternion.copy(q)
    })
}

function updateSunRays(sunDir: THREE.Vector3) {
  if (!earthRoot || !sunRaysGroup) return
  const earthPos = earthRoot.position.clone()
  const lightTravelDir = earthPos.clone().normalize()
  const subsolarPoint = earthPos.clone().add(sunDir.clone().multiplyScalar(EARTH_RADIUS * 1.035))
  const vertical = new THREE.Vector3(0, 1, 0)
  const sunSurface = lightTravelDir.clone().multiplyScalar(SUN_RADIUS * 1.08)

  sunRaysGroup.children.forEach((arrow: THREE.Object3D) => {
    if (!(arrow instanceof THREE.ArrowHelper)) return
    const idx = arrow.userData.offsetIndex || 0
    const offset = vertical.clone().multiplyScalar(idx * 0.52)
    const start = sunSurface.clone().add(offset)
    const end = subsolarPoint.clone().add(offset)
    const direction = new THREE.Vector3().subVectors(end, start)
    arrow.position.copy(start)
    arrow.setDirection(direction.clone().normalize())
    arrow.setLength(direction.length(), idx === 0 ? 0.36 : 0.25, idx === 0 ? 0.16 : 0.1)
  })

  if (subsolarMarker) {
    subsolarMarker.position.copy(subsolarPoint)
    subsolarMarker.visible = toggles.sunRays
  }
}

function updateVisibility() {
  earthUniforms.showTerminator.value = toggles.terminator ? 1 : 0
  earthUniforms.showDayNightArc.value = toggles.dayNightArc ? 1 : 0
  if (terminatorLine) terminatorLine.visible = false
  if (gridGroup) gridGroup.visible = toggles.grid
  if (tropicsGroup) tropicsGroup.visible = toggles.tropics
  if (coordLabelGroup) coordLabelGroup.visible = toggles.coordLabels
  if (planesGroup) planesGroup.visible = toggles.tiltLabels
  if (equatorPlaneGroup) equatorPlaneGroup.visible = toggles.tiltLabels
  if (tiltAngleGroup) tiltAngleGroup.visible = toggles.tiltAngle
  if (axisGroup) axisGroup.visible = toggles.axis
  if (rotationArrowGroup) rotationArrowGroup.visible = toggles.rotationArrow
  if (dayArcLine) dayArcLine.visible = false
  if (nightArcLine) nightArcLine.visible = false
  if (sunRaysGroup) sunRaysGroup.visible = toggles.sunRays
}

function smoothCameraTarget(dt: number) {
  if (!controls) return
  controls.target.lerp(targetFocus, Math.min(1, dt * 2.2))
}

function updateFocusTarget() {
  if (!earthRoot) return
  targetFocus = focusMode.value === 'earth' ? earthRoot.position.clone() : new THREE.Vector3(0, 0, 0)
}

function switchFocus(mode: FocusMode) {
  focusMode.value = mode
  updateFocusTarget()
  if (mode === 'earth' && camera && controls && earthRoot) {
    const direction = camera.position.clone().sub(controls.target).normalize()
    const distance = Math.max(5.4, Math.min(7.2, camera.position.distanceTo(controls.target) * 0.45))
    camera.position.copy(earthRoot.position.clone().add(direction.multiplyScalar(distance)))
  }
}

function resetCamera() {
  if (!camera || !controls) return
  if (focusMode.value === 'earth' && earthRoot) {
    camera.position.copy(earthRoot.position.clone().add(new THREE.Vector3(0, 3.8, 6.4)))
  } else {
    camera.position.set(0, 9.2, 22)
  }
  updateFocusTarget()
}

function setCameraPreset(type: 'top' | 'bottom') {
  if (!camera || !controls) return
  if (type === 'top') {
    focusMode.value = 'sun'
    const center = new THREE.Vector3(0, 0, 0)
    // 避免相机正好落在 OrbitControls 极点：保持上帝视角，同时仍可自由拖回普通视角。
    camera.up.set(0, 1, 0)
    camera.position.copy(center.clone().add(new THREE.Vector3(0, 25.5, 9.2)))
    controls.target.copy(center)
    controls.enableRotate = true
    controls.update()
    return
  }
  updateFocusTarget()
  const center = focusMode.value === 'earth' && earthRoot ? earthRoot.position.clone() : new THREE.Vector3(0, 0, 0)
  const distance = focusMode.value === 'earth' ? 7.2 : 23
  if (type === 'bottom') {
    camera.position.copy(center.clone().add(new THREE.Vector3(0, -distance * 0.72, 0.01)))
    camera.up.set(0, 0, -1)
  } else {
    camera.position.copy(center.clone().add(new THREE.Vector3(0, distance * 0.72, 0.01)))
    camera.up.set(0, 0, 1)
  }
  controls.target.copy(center)
  controls.enableRotate = true
  controls.update()
}

let subResizeState: SubResizeState | null = null
function onSubResizeStart(event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  subResizeState = {
    startX: event.clientX,
    startY: event.clientY,
    width: subSceneSize.width,
    height: subSceneSize.height
  }
  window.addEventListener('pointermove', onSubResizeMove)
  window.addEventListener('pointerup', onSubResizeEnd, { once: true })
}

function onSubResizeMove(event: PointerEvent) {
  if (!subResizeState) return

  const aspect =
    subResizeState.width /
    Math.max(
      1,
      subResizeState.height
    )

  // 左下角拖拽：
  // 向左或向下放大，向右或向上缩小。
  // 不再按小屏视口强行限制最大尺寸，避免某些屏幕下拖不动。
  const deltaFromLeft =
    subResizeState.startX -
    event.clientX

  const deltaFromBottom =
    event.clientY -
    subResizeState.startY

  const delta =
    Math.abs(deltaFromLeft) >
      Math.abs(deltaFromBottom)
      ? deltaFromLeft
      : deltaFromBottom

  const minWidth = 180
  const maxWidth = 900

  let nextWidth =
    clamp(
      subResizeState.width + delta,
      minWidth,
      maxWidth
    )

  let nextHeight =
    nextWidth / aspect

  const minHeight = 120
  const maxHeight = 680

  if (nextHeight < minHeight) {
    nextHeight = minHeight
    nextWidth = nextHeight * aspect
  }

  if (nextHeight > maxHeight) {
    nextHeight = maxHeight
    nextWidth = nextHeight * aspect
  }

  subSceneSize.width = nextWidth
  subSceneSize.height = nextHeight

  nextTick(resizeSubRenderer)
}

function onSubResizeEnd() {
  subResizeState = null
  window.removeEventListener('pointermove', onSubResizeMove)
  nextTick(resizeSubRenderer)
}

let yearProgressTweenId = 0
function setSolarTerm(progress: number) {
  isPlaying.value = false
  animateYearProgress(progress)
}

function animateYearProgress(targetProgress: number) {
  cancelAnimationFrame(yearProgressTweenId)
  const start = yearProgress.value
  const target = normalize01(targetProgress)
  const duration = 850
  const startedAt = performance.now()
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  const step = (now) => {
    const t = Math.min(1, (now - startedAt) / duration)
    yearProgress.value = start + (target - start) * ease(t)
    if (t < 1) yearProgressTweenId = requestAnimationFrame(step)
    else yearProgress.value = target
  }
  yearProgressTweenId = requestAnimationFrame(step)
}


function isPresetActive(preset: PresetPlace) {
  const current =
    currentObserverPoint.value

  return (
    Math.abs(current.lat - preset.lat) < 0.01 &&
    Math.abs(
      normalizeLon(current.lon) -
      normalizeLon(preset.lon)
    ) < 0.01
  )
}

function addPreset(preset: PresetPlace) {
  setSingleObservation({ name: preset.name, lat: preset.lat, lon: preset.lon })
}

function setSingleObservation(point: Omit<ObservationPoint, 'id'>) {
  const nextPoint = { id: pointCounter += 1, name: point.name, lat: point.lat, lon: normalizeLon(point.lon) }
  observationPoints.value = [nextPoint]
  selectedObservationId.value = nextPoint.id
  updateObservationMarkers()
  updateCelestialState()
}

function clearObservationPoints() {
  observationPoints.value = [{ ...DEFAULT_OBSERVATION }]
  selectedObservationId.value = DEFAULT_OBSERVATION.id
  updateObservationMarkers()
  updateCelestialState()
}

function removeSelectedObservation() {
  clearObservationPoints()
}

function onPointerDown(event: PointerEvent) {
  if (!clickAddEnabled.value || !viewportRef.value || !camera || !raycaster || !earthMesh) return
  if (event.target !== canvasRef.value) return
  const rect = viewportRef.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(earthMesh, true)
  if (!hits.length) return
  const local = earthMesh.worldToLocal(hits[0].point.clone()).normalize()
  const lat = Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)) * RAD
  const lon = Math.atan2(-local.z, local.x) * RAD
  setSingleObservation({
    name: '手动观测点',
    lat,
    lon: normalizeLon(lon)
  })
}

function onWindowClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const button = target.closest?.('[data-marker-id]')
  if (!button) return
  selectedObservationId.value = Number(button.getAttribute('data-marker-id'))
}

function updateObservationMarkers() {
  if (!markerGroup || !earthSpinGroup) return
  markerGroup.clear()
  observationPoints.value.forEach((point) => {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshBasicMaterial({ color: point.id === selectedObservationId.value ? 0xffd166 : 0x2ec4b6 })
    )
    const local = latLonToVector(point.lat, point.lon, EARTH_RADIUS * 1.035)
    earthSpinGroup.localToWorld(local)
    marker.position.copy(local)
    markerGroup.add(marker)
  })
}

function computeObservation(point: ObservationPoint): ObservationResult {
  const lat = point.lat * DEG
  const declination = getDeclination(yearProgress.value)
  const solarTimeValue = normalizeHour(referenceSolarHour.value + point.lon / 15)
  const hourAngle = (solarTimeValue - 12) * 15 * DEG
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)
  ) * RAD

  const cosH0 = -Math.tan(lat) * Math.tan(declination)
  let polarStatus = ''
  let dayLength = ''
  let nightLength = ''
  let daylightHours = 0
  if (cosH0 <= -1) {
    polarStatus = '当前为极昼'
  } else if (cosH0 >= 1) {
    polarStatus = '当前为极夜'
  } else {
    const h0 = Math.acos(cosH0)
    const dayHours = 2 * h0 * RAD / 15
    daylightHours = dayHours
    dayLength = formatDuration(dayHours)
    nightLength = formatDuration(24 - dayHours)
  }

  const sunriseTime = polarStatus ? polarStatus : formatHour(12 - daylightHours / 2)
  const sunsetTime = polarStatus ? polarStatus : formatHour(12 + daylightHours / 2)

  return {
    ...point,
    solarTime: formatHour(solarTimeValue),
    solarAltitude: altitude,
    polarStatus,
    dayLength,
    nightLength,
    sunriseTime,
    sunsetTime
  }
}

function getOrbitPosition(progress: number) {
  const theta = calendarProgressToSeasonProgress(progress) * Math.PI * 2
  return new THREE.Vector3(-Math.sin(theta) * ORBIT_RADIUS, 0, -Math.cos(theta) * ORBIT_RADIUS)
}

function getDeclination(progress: number) {
  return Math.asin(Math.sin(EARTH_TILT) * Math.sin(calendarProgressToSeasonProgress(progress) * Math.PI * 2))
}

function createLatLonGrid() {
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xa8fff6, transparent: true, opacity: 0.23 })
  for (let lon = 0; lon < 360; lon += 15) {
    const pts = []
    for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.006))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const pts = []
    for (let lon = -180; lon <= 180; lon += 3) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.007))
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
  }
  return group
}

function createTropics() {
  const group = new THREE.Group()
  const tropicMat = new THREE.LineDashedMaterial({ color: 0xffd166, transparent: true, opacity: 0.95, dashSize: 0.08, gapSize: 0.06 })
  const equatorMat = new THREE.LineBasicMaterial({ color: 0x49a5ff, transparent: true, opacity: 0.75 })
    ;[-EARTH_TILT_DEG, 0, EARTH_TILT_DEG].forEach((lat) => {
      const pts = []
      for (let lon = -180; lon <= 180; lon += 2) pts.push(latLonToVector(lat, lon, EARTH_RADIUS * 1.012))
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lat === 0 ? equatorMat : tropicMat)
      if (lat !== 0) line.computeLineDistances()
      group.add(line)
    })
  return group
}

function createCoordinateLabels() {
  const group = new THREE.Group()
  for (let lat = -60; lat <= 60; lat += 30) {
    if (lat === 0) continue
    const label = createTextSprite(formatGridLat(lat), '#bffdf7')
    label.position.copy(latLonToVector(lat, -165, EARTH_RADIUS * 1.1))
    label.scale.set(0.5, 0.18, 1)
    group.add(label)
  }
  for (let lon = -180; lon < 180; lon += 60) {
    const label = createTextSprite(formatGridLon(lon), '#d9f7ff')
    label.position.copy(latLonToVector(0, lon, EARTH_RADIUS * 1.12))
    label.scale.set(0.5, 0.18, 1)
    group.add(label)
  }
  return group
}

function createDiscPlane(radius: number, color: number, opacity: number) {
  const geo = new THREE.CircleGeometry(radius, 128)
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
  return new THREE.Mesh(geo, mat)
}

function createRingLine(radius: number, color: number, opacity: number) {
  return new THREE.Line(
    createCircleArc(radius, 0, Math.PI * 2, 180, 'xz'),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  )
}

function createCircleArc(radius: number, start: number, end: number, segments: number, plane: 'xy' | 'xz' = 'xy') {
  const pts = []
  for (let i = 0; i <= segments; i += 1) {
    const t = start + (end - start) * (i / segments)
    if (plane === 'xz') pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius))
    else pts.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

function latLonToVector(latDeg: number, lonDeg: number, radius: number) {
  const lat = latDeg * DEG
  const lon = lonDeg * DEG
  const cosLat = Math.cos(lat)
  return new THREE.Vector3(
    Math.cos(lon) * cosLat * radius,
    Math.sin(lat) * radius,
    -Math.sin(lon) * cosLat * radius
  )
}

function createTextSprite(text: string, color = '#ffffff') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '600 30px Microsoft YaHei, Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(4, 16, 26, 0.62)'
  roundRect(ctx, 24, 18, 208, 58, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(46, 196, 182, 0.65)'
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(text, 128, 48)
  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  return new THREE.Sprite(mat)
}

function createPlaceholderTexture(a: string, b: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  grad.addColorStop(0, a)
  grad.addColorStop(1, b)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.22})`
    ctx.beginPath()
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createNebulaTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  bg.addColorStop(0, '#030712')
  bg.addColorStop(0.45, '#071829')
  bg.addColorStop(1, '#050814')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 6; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const r = 180 + Math.random() * 240
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(46,196,182,0.23)')
    g.addColorStop(0.42, 'rgba(49,126,255,0.12)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  return new THREE.CanvasTexture(canvas)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function progressToDayOfYear(progress: number) {
  const term = solarTerms.find((item) => Math.abs(normalize01(progress) - item.progress) < 0.0008)
  if (term) return term.day
  return Math.max(1, Math.min(YEAR_DAYS, Math.round(normalize01(progress) * (YEAR_DAYS - 1)) + 1))
}

function dayOfYearToCalendarProgress(day: number) {
  return (Math.max(1, Math.min(YEAR_DAYS, day)) - 1) / (YEAR_DAYS - 1)
}

function calendarProgressToSeasonProgress(progress: number) {
  const dayFloat = normalize01(progress) * (YEAR_DAYS - 1) + 1
  return normalize01((dayFloat - SPRING_EQUINOX_DAY) / YEAR_DAYS)
}

function dayOfYearToMonthDay(dayOfYear: number) {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let rest = Math.max(1, Math.min(YEAR_DAYS, dayOfYear))
  for (let i = 0; i < monthDays.length; i += 1) {
    if (rest <= monthDays[i]) return `${i + 1}月${rest}日`
    rest -= monthDays[i]
  }
  return '12月31日'
}


function sliderTrackLeft(progress: number) {
  const p = Math.max(0, Math.min(1, progress))
  return `${p * 100}%`
}

function progressToX(progress: number) {
  const winterProgress =
    dayOfYearToCalendarProgress(356)

  const shifted =
    normalize01(
      progress - winterProgress
    )

  return 24 + shifted * 232
}

function latToY(lat: number) {
  const clamped =
    clamp(
      lat,
      -23.44,
      23.44
    )

  // 右侧图表的垂向映射：
  // 让北回归线、赤道、南回归线保持低纬分布，
  // 更接近课本里“双剖面 + 直射点曲线”的视觉感觉。
  return 56 - (clamped / 23.44) * 13
}

function formatGridLat(lat: number) {
  const rounded = Math.round(Math.abs(lat))
  if (Math.abs(lat) < 0.5) return '0°'
  return `${rounded}°${lat > 0 ? 'N' : 'S'}`
}

function formatGridLon(lon: number) {
  const rounded = Math.round(Math.abs(lon))
  if (Math.abs(lon) < 0.5 || Math.abs(Math.abs(lon) - 180) < 0.5) return `${rounded}°`
  return `${rounded}°${lon > 0 ? 'E' : 'W'}`
}

function formatLat(lat: number) {
  const abs = Math.abs(lat).toFixed(2)
  if (Math.abs(lat) < 0.005) return '0.00°'
  return `${abs}°${lat > 0 ? 'N' : 'S'}`
}

function formatLon(lon: number) {
  const abs = Math.abs(lon).toFixed(2)
  if (Math.abs(lon) < 0.005) return '0.00°'
  return `${abs}°${lon > 0 ? 'E' : 'W'}`
}

function formatSignedDeg(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}°`
}

function formatHour(value: number) {
  const h = normalizeHour(value)
  const hour = Math.floor(h)
  const minute = Math.round((h - hour) * 60)
  return `${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

function formatDuration(hours: number) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}小时${m}分`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalize01(value: number) {
  return ((value % 1) + 1) % 1
}

function normalizeHour(value: number) {
  return ((value % 24) + 24) % 24
}

function normalizeLon(value: number) {
  let lon = ((value + 180) % 360 + 360) % 360 - 180
  if (lon === -180) lon = 180
  return lon
}
</script>

<style scoped>
.earth-orbit-template {
  --orbit-overlay-gap:
    clamp(12px,
      1.4vw,
      22px);
  --orbit-header-offset:
    clamp(66px,
      7.5vh,
      82px);
}

.scene-canvas {
  width:
    100%;
  height:
    100%;
  display: block;
  contain:
    strict;
  transform:
    translateZ(0);
  backface-visibility:
    hidden;
}

.orbit-scene-host {
  background:
    radial-gradient(circle at 50% 35%,
      rgba(46, 196, 182, 0.10),
      transparent 38%),
    linear-gradient(145deg,
      #020713,
      #06111f 48%,
      #020713);
}

.orbit-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 12;
  pointer-events: none;
}

.scene-float-card {
  color:
    var(--text-primary);
  background:
    linear-gradient(145deg,
      rgba(8, 20, 34, 0.58),
      rgba(8, 20, 34, 0.34));
  border:
    1px solid rgba(var(--theme-primary-light-rgb), 0.22);
  box-shadow:
    0 16px 38px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter:
    blur(13px) saturate(150%);
  -webkit-backdrop-filter:
    blur(13px) saturate(150%);
}

.observation-panel {
  position: relative;
}

.obs-head {
  display: grid;
  gap: 4px;
  padding-bottom: 9px;
  border-bottom:
    1px solid rgba(var(--theme-primary-light-rgb), 0.15);
}

.obs-title-main {
  color:
    var(--theme-primary-light);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.obs-place-row strong {
  color:
    #ffffff;
  font-size:
    clamp(15px,
      1.05vw,
      18px);
}


.obs-summary-cards {
  display: grid;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap: 8px;
}

.obs-summary-card {
  display: grid;
  align-content:
    center;
  gap: 3px;
  min-width: 0;
  min-height:
    42px;
  padding:
    7px 9px;
  border:
    1px solid rgba(var(--theme-primary-light-rgb), 0.13);
  border-radius: 11px;
  background:
    rgba(8, 20, 34, 0.28);
}

.obs-summary-card span {
  color:
    var(--text-muted);
  font-size: 10px;
}

.obs-summary-card strong {
  color:
    var(--text-primary);
  font-size: 12px;
}

.obs-body {
  display: grid;
  gap: 10px;
  padding-top: 10px;
}

.obs-body dl {
  display: grid;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.obs-body dl>div {
  min-width: 0;
  padding:
    7px 8px;
  border:
    1px solid rgba(var(--theme-primary-light-rgb), 0.12);
  border-radius: 10px;
  background:
    rgba(8, 20, 34, 0.30);
}

.obs-body dl>div.wide {
  grid-column:
    1 / -1;
}

.obs-body dt {
  margin-bottom: 3px;
  color:
    var(--text-muted);
  font-size: 10px;
}

.obs-body dd {
  margin: 0;
  color:
    var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}

.accent-value {
  color:
    var(--theme-primary-light) !important;
}

.data-panel-card {
  display: grid;
  gap: 12px;
  padding:
    12px;
}

.observation-data-card {
  overflow: visible;
}


.direct-track-card {
  display: grid;
  gap: 9px;
  padding:
    10px;
}

.direct-track-head {
  display: flex;
  align-items:
    center;
  justify-content:
    space-between;
  gap: 10px;
}

.direct-track-head h3 {
  margin: 0;
  color:
    var(--text-primary);
  font-size: 13px;
  font-weight: 900;
  letter-spacing:
    0.04em;
}

.direct-track-head p {
  margin:
    3px 0 0;
  color:
    var(--text-muted);
  font-size: 10px;
}

.direct-track-head span {
  display: grid;
  place-items:
    center;
  width: 26px;
  height: 26px;
  border:
    1px solid rgba(var(--theme-primary-light-rgb), 0.28);
  border-radius:
    999px;
  color:
    var(--theme-primary-light);
  font-size: 13px;
  font-weight: 900;
  background:
    rgba(var(--theme-primary-rgb), 0.12);
}

.obs-track-card {
  padding:
    6px 2px 2px;
  border-radius: 12px;
  background:
    rgba(8, 20, 34, 0.22);
}

.earth-section-card {
  overflow: hidden;
}

.earth-section-svg {
  display: block;
  width: 100%;
  height: auto;
}

.earth-ellipse-outline {
  fill:
    none;
  stroke:
    rgba(var(--theme-primary-light-rgb), 0.76);
  stroke-width: 1.35;
  filter:
    drop-shadow(0 0 6px rgba(46, 196, 182, 0.32));
}

.section-lat-line,
.section-lon-line {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.section-lon-line,
.section-lat-line.grid {
  stroke:
    rgba(184, 204, 218, 0.30);
  stroke-width: 0.85;
}

.section-lon-line.main {
  stroke:
    rgba(184, 204, 218, 0.42);
}

.section-lat-line.equator {
  stroke:
    rgba(46, 196, 182, 0.82);
  stroke-width: 1.55;
}

.section-lat-line.tropic {
  stroke:
    rgba(255, 209, 102, 0.82);
  stroke-width: 1.28;
}

.earth-track-path {
  fill: none;
  stroke:
    url(#trackGradientObs);
  stroke-width: 2.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter:
    drop-shadow(0 0 5px rgba(46, 196, 182, 0.48));
}

.track-dot {
  fill:
    #ffd166;
  stroke:
    #ffffff;
  stroke-width: 1.2;
  filter:
    drop-shadow(0 0 5px rgba(255, 209, 102, 0.76));
}

.sun-direct-ray {
  stroke:
    rgba(255, 209, 102, 0.86);
  stroke-width: 1.8;
  stroke-linecap: round;
}

.direct-label,
.latitude-label {
  fill:
    rgba(226, 246, 250, 0.82);
  font-size: 8px;
  font-weight: 800;
}

.latitude-label {
  fill:
    rgba(184, 204, 218, 0.78);
}

.empty-tip {
  margin: 10px 0 0;
  color:
    var(--text-muted);
  font-size: 12px;
}

.sub-scene-window {
  position: absolute;
  top:
    calc(var(--orbit-header-offset) + 8px);
  right:
    calc(var(--right-panel-width, 0px) + var(--orbit-overlay-gap));
  width: auto;
  height: auto;
  display: grid;
  grid-template-rows:
    auto minmax(0, 1fr);
  border-radius: 16px;
  overflow: hidden;
  pointer-events: auto;
}

.sub-scene-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding:
    8px 10px;
  border-bottom:
    1px solid rgba(var(--theme-primary-light-rgb), 0.16);
  background:
    rgba(8, 20, 34, 0.24);
}

.sub-title {
  display: grid;
  gap: 2px;
}

.sub-title span {
  color:
    var(--text-muted);
  font-size: 10px;
}

.sub-title strong {
  color:
    var(--theme-primary-light);
  font-size: 12px;
}

.sub-view-select {
  width: 112px;
}

.sub-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.sub-resize-handle {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 12;
  width: 38px;
  height: 38px;
  cursor: nesw-resize;
  background:
    linear-gradient(45deg,
      rgba(var(--theme-primary-light-rgb), 0.82) 0 48%,
      rgba(var(--theme-primary-light-rgb), 0.36) 49% 56%,
      transparent 57% 100%);
  border: 0;
  border-bottom-left-radius: 16px;
  clip-path:
    polygon(0 0,
      0 100%,
      100% 100%);
  opacity: 0.9;
}


.sub-resize-handle::after {
  content: "";
  position: absolute;
  left: 7px;
  bottom: 7px;
  width: 18px;
  height: 18px;
  border-left:
    2px solid rgba(255, 255, 255, 0.74);
  border-bottom:
    2px solid rgba(255, 255, 255, 0.74);
  border-bottom-left-radius: 8px;
}

.sub-resize-handle:hover {
  opacity: 1;
  filter:
    drop-shadow(0 0 8px rgba(var(--theme-primary-rgb), 0.52));
}

.orbit-time-dock {
  left:
    50% !important;
  right:
    auto !important;
  bottom:
    clamp(12px,
      2vh,
      22px) !important;

  width:
    min(920px,
      calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 36px)) !important;
  max-width:
    none !important;
  margin:
    0;
  transform:
    translateX(-50%);
  grid-template-columns:
    auto minmax(420px,
      1fr);
  align-items:
    center;
  pointer-events: auto;
}

.timeline-info-cards {
  display: grid;
  grid-template-columns:
    1fr;
  grid-template-rows:
    repeat(2,
      minmax(42px, auto));
  gap: 8px;
  align-self:
    stretch;
  width:
    clamp(118px,
      9vw,
      136px);
}

.timeline-info-card {
  display: grid;
  align-content:
    center;
  gap: 3px;
  min-width: 0;
  min-height:
    42px;
  padding:
    7px 9px;
  border:
    1px solid rgba(var(--theme-primary-light-rgb), 0.13);
  border-radius: 11px;
  background:
    rgba(8, 20, 34, 0.28);
}

.timeline-info-card span,
.timeline-label span {
  color:
    var(--text-muted);
  font-size: 10px;
}

.timeline-info-card strong,
.timeline-label strong {
  color:
    var(--text-primary);
  font-size: 12px;
}

.date-text {
  font-style: normal;
}

.orbit-timeline-main {
  min-width: 0;
}

.timeline-row {
  display: grid;
  grid-template-columns:
    92px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.timeline-label.between {
  display: grid;
  gap: 2px;
}

.term-scale-row {
  padding:
    0 3px 8px 102px;
}

.scale-track {
  position: relative;
  height: 22px;
}

.scale-track button {
  position: absolute;
  top: 0;
  transform:
    translateX(-50%);
  display: grid;
  place-items: center;
  gap: 2px;
  min-width: 44px;
  padding: 0;
  color:
    var(--text-muted);
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  word-break: keep-all;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.scale-track button i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background:
    linear-gradient(135deg,
      var(--theme-primary),
      var(--theme-secondary));
}

.hour-scale {
  display: grid;
  grid-template-columns:
    repeat(5,
      1fr);
  padding-left: 102px;
  color:
    var(--text-muted);
  font-size: 9px;
}

.two-col-option-grid {
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
}

.compact-switch-row {
  padding:
    7px 0;
}

.layer-switch-list {
  display: grid;
  gap: 2px;
}

.preset-cloud {
  display: grid;
  grid-template-columns:
    repeat(2,
      minmax(0, 1fr));
  gap: 7px;
  margin:
    10px 0;
}

.place-btn,
.uniform-place-btn {
  width: 100%;
  min-width: 0;
  height: 32px;
  padding:
    0 7px;
  justify-content:
    center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-play-icon {
  width: 18px;
  height: 18px;
  fill:
    currentColor;
  display: block;
}


/* 5号模板右侧数据面板：任何断点下都不能隐藏直射点曲线图 */
.right-panel .earth-section-card {
  display: block !important;
}

.right-panel .earth-section-svg {
  display: block !important;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: auto;
}

.right-panel .obs-track-card {
  min-width: 0;
}

.right-panel .observation-data-card {
  min-width: 0;
}

@media (max-width: 1280px) {
  .observation-panel {
    width:
      clamp(222px,
        24vw,
        286px);
  }

  .sub-scene-window {
    top:
      calc(var(--orbit-header-offset) + 6px);
    right:
      calc(var(--right-panel-width, 0px) + var(--orbit-overlay-gap));
  }

  .orbit-time-dock {
    left:
      50% !important;
    right:
      auto !important;
    width:
      min(760px,
        calc(100% - var(--left-panel-width, 0px) - var(--right-panel-width, 0px) - 28px)) !important;
    grid-template-columns:
      auto minmax(300px, 1fr);
    transform:
      translateX(-50%);
  }

  .timeline-info-cards {
    width:
      112px;
  }

  .timeline-info-card {
    min-height:
      38px;
    padding:
      6px 8px;
  }
}

@media (max-width: 960px) {
  .earth-orbit-template {
    --orbit-overlay-gap: 10px;
    --orbit-header-offset: 62px;
  }

  .observation-panel {
    top:
      calc(var(--orbit-header-offset) + 6px);
    width:
      min(226px,
        calc(100% - var(--left-panel-width, 0px) - 236px - 30px));
    max-height:
      42vh;
  }

  .obs-track-card {
    display: none;
  }

  .sub-scene-window {
    top:
      calc(var(--orbit-header-offset) + 6px);
    right:
      calc(var(--right-panel-width, 0px) + var(--orbit-overlay-gap));
  }

  .sub-view-select {
    width: 92px;
  }

  .orbit-time-dock {
    left:
      50% !important;
    right:
      auto !important;
    width:
      min(680px,
        calc(100% - 24px)) !important;
    grid-template-columns:
      auto minmax(0, 1fr);
    padding:
      8px 10px;
    transform:
      translateX(-50%);
  }

  .timeline-info-cards {
    display:
      none;
  }

  .timeline-row {
    grid-template-columns:
      82px minmax(0, 1fr);
  }

  .term-scale-row,
  .hour-scale {
    padding-left: 92px;
  }
}

@media (max-width: 720px) {

  .obs-summary-cards {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .obs-summary-card {
    min-height: 34px;
    padding:
      5px 7px;
  }

  .observation-panel {
    left:
      calc(var(--left-panel-width, 0px) + 8px);
    width:
      min(196px,
        calc(100% - var(--left-panel-width, 0px) - 190px - 24px));
    padding: 9px;
  }

  .obs-body dl {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .obs-body dl>div {
    padding:
      5px 7px;
  }

  .sub-scene-window {
    top:
      calc(var(--orbit-header-offset) + 6px);
    right:
      calc(var(--right-panel-width, 0px) + var(--orbit-overlay-gap));
  }

  .sub-scene-head {
    padding:
      6px 7px;
  }

  .sub-title span {
    display: none;
  }

  .sub-view-select {
    width: 80px;
  }

  .orbit-time-dock {
    left:
      50% !important;
    right:
      auto !important;
    bottom:
      8px !important;
    width:
      calc(100% - 18px) !important;
    transform:
      translateX(-50%);
  }

  .timeline-label span {
    display: none;
  }

  .timeline-row {
    grid-template-columns:
      62px minmax(0, 1fr);
  }

  .term-scale-row,
  .hour-scale {
    padding-left: 72px;
  }

  .scale-track button span {
    display: block;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    word-break: keep-all;
  }
}

@media (max-width: 520px) {
  .observation-panel {
    display: block;
    width:
      min(168px,
        calc(100% - var(--left-panel-width, 0px) - 168px - 22px));
    max-height:
      34vh;
    padding: 7px;
  }

  .obs-body dl>div {
    padding:
      4px 6px;
  }

  .obs-body dt {
    font-size: 9px;
  }

  .obs-body dd {
    font-size: 10px;
  }

  .sub-scene-window {
    top:
      calc(var(--orbit-header-offset) + 6px);
    right:
      calc(var(--right-panel-width, 0px) + var(--orbit-overlay-gap));
  }

  .sub-scene-head {
    display: none;
  }

  .orbit-time-dock {
    grid-template-columns:
      auto minmax(0, 1fr);
  }

  .timeline-icon-btn {
    width: 34px;
    height: 34px;
  }

  .term-scale-row {
    display: none;
  }

  .timeline-row {
    grid-template-columns:
      50px minmax(0, 1fr);
  }

  .hour-scale {
    padding-left: 60px;
  }
}

@media (max-width: 720px) {
  .right-panel .earth-section-svg {
    width: 100%;
    min-height: 0;
  }

  .right-panel .latitude-label,
  .right-panel .direct-label {
    font-size: 7px;
  }

  .right-panel .obs-track-card {
    padding:
      5px 1px 2px;
  }
}

/* ===================== v9: 修复中屏底部时间轴过窄 =====================
   原因：
   1170px 这类宽度下页面已经进入 layout-medium，
   左右面板是覆盖式悬浮面板，不再参与主场景实际宽度计算。
   旧规则仍然使用：
   width: calc(100% - var(--left-panel-width) - var(--right-panel-width) - gap)
   当左右面板默认变宽后，时间轴会被算成 140px 左右。
   这里中屏不再扣除左右面板宽度，直接按主场景宽度自适应。
*/
.earth-orbit-template.layout-medium .orbit-time-dock {
  left:
    50% !important;
  right:
    auto !important;
  width:
    min(860px, calc(100% - 32px)) !important;
  min-width:
    min(520px, calc(100% - 32px)) !important;
  max-width:
    calc(100% - 32px) !important;
  grid-template-columns:
    auto minmax(0, 1fr) !important;
  transform:
    translateX(-50%) !important;
}

.earth-orbit-template.layout-medium .orbit-timeline-main {
  min-width:
    0;
  width:
    100%;
}

.earth-orbit-template.layout-medium .timeline-row {
  grid-template-columns:
    clamp(86px, 9vw, 112px) minmax(0, 1fr);
}

.earth-orbit-template.layout-medium .term-scale-row,
.earth-orbit-template.layout-medium .hour-scale {
  padding-left:
    clamp(96px, 10vw, 122px);
}

/* 1280 以下原来还有一条媒体规则会再次扣左右面板宽度，这里压住它 */
@media (max-width: 1280px) {
  .earth-orbit-template.layout-medium .orbit-time-dock {
    width:
      min(820px, calc(100% - 28px)) !important;
    min-width:
      min(500px, calc(100% - 28px)) !important;
    max-width:
      calc(100% - 28px) !important;
    grid-template-columns:
      auto minmax(0, 1fr) !important;
  }
}

/* 960 以下仍按小屏处理，避免强行保持 500px 最小宽导致溢出 */
@media (max-width: 960px) {

  .earth-orbit-template.layout-medium .orbit-time-dock,
  .earth-orbit-template.layout-small .orbit-time-dock {
    width:
      min(680px, calc(100% - 24px)) !important;
    min-width:
      0 !important;
    max-width:
      calc(100% - 24px) !important;
    grid-template-columns:
      auto minmax(0, 1fr) !important;
  }
}

/* ===================== v10: 大屏右侧实时数据卡片字号增强 =====================
   说明：
   右侧“实时数据”不是普通 data-card，而是 observation-data-card：
   - 顶部观测点标题：obs-head / obs-place-row
   - 摘要卡片：obs-summary-card
   - 数据表格：obs-body dl / dt / dd
   所以需要在业务组件里单独放大这些细分元素。
*/
@media (min-width: 2200px) and (min-height: 1200px) and (min-aspect-ratio: 16 / 10) {
  .earth-orbit-template.layout-large .right-panel .observation-data-card {
    padding:
      clamp(18px, 0.95vw, 30px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .obs-title-main {
    font-size:
      clamp(18px, 0.74vw, 26px) !important;
    font-weight:
      800;
  }

  .earth-orbit-template.layout-large .right-panel .obs-place-row strong {
    font-size:
      clamp(25px, 1.08vw, 40px) !important;
    line-height:
      1.25;
  }

  .earth-orbit-template.layout-large .right-panel .obs-summary-cards {
    gap:
      clamp(12px, 0.68vw, 22px);
  }

  .earth-orbit-template.layout-large .right-panel .obs-summary-card {
    min-height:
      clamp(88px, 4.2vw, 132px);
    padding:
      clamp(14px, 0.72vw, 24px);
  }

  .earth-orbit-template.layout-large .right-panel .obs-summary-card span {
    font-size:
      clamp(15px, 0.58vw, 22px) !important;
    line-height:
      1.35;
  }

  .earth-orbit-template.layout-large .right-panel .obs-summary-card strong {
    font-size:
      clamp(24px, 1.02vw, 38px) !important;
    line-height:
      1.25;
  }

  .earth-orbit-template.layout-large .right-panel .obs-summary-card .date-text {
    font-size:
      clamp(24px, 1.02vw, 38px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .obs-body dl {
    gap:
      clamp(10px, 0.58vw, 18px);
  }

  .earth-orbit-template.layout-large .right-panel .obs-body dl>div {
    min-height:
      clamp(58px, 2.65vw, 82px);
    padding:
      clamp(11px, 0.58vw, 18px) clamp(12px, 0.64vw, 20px);
  }

  .earth-orbit-template.layout-large .right-panel .obs-body dt {
    font-size:
      clamp(14px, 0.54vw, 20px) !important;
    line-height:
      1.35;
  }

  .earth-orbit-template.layout-large .right-panel .obs-body dd {
    font-size:
      clamp(20px, 0.86vw, 32px) !important;
    line-height:
      1.25;
    font-weight:
      800;
  }

  .earth-orbit-template.layout-large .right-panel .obs-body .wide dd {
    font-size:
      clamp(21px, 0.92vw, 34px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .empty-tip {
    font-size:
      clamp(16px, 0.68vw, 24px) !important;
    line-height:
      1.8;
  }

  .earth-orbit-template.layout-large .right-panel .direct-track-head h3 {
    font-size:
      clamp(19px, 0.78vw, 30px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .direct-track-head p {
    font-size:
      clamp(14px, 0.54vw, 20px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .direct-track-head>span {
    width:
      clamp(38px, 1.7vw, 56px);
    height:
      clamp(38px, 1.7vw, 56px);
    font-size:
      clamp(20px, 0.88vw, 32px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .earth-section-svg .latitude-label {
    font-size:
      10px !important;
  }

  .earth-orbit-template.layout-large .right-panel .earth-section-svg .direct-label {
    font-size:
      11px !important;
    font-weight:
      800;
  }
}

/* 2K 大屏同步增强，但略小一档，避免右侧图表被挤压 */
@media (min-width: 2200px) and (min-height: 1200px) and (max-width: 3200px) {
  .earth-orbit-template.layout-large .right-panel .obs-place-row strong {
    font-size:
      clamp(24px, 0.94vw, 34px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .obs-summary-card strong {
    font-size:
      clamp(23px, 0.90vw, 34px) !important;
  }

  .earth-orbit-template.layout-large .right-panel .obs-body dd {
    font-size:
      clamp(19px, 0.76vw, 28px) !important;
  }
}

/* ===================== v12: 时间轴宽度只跟随中间场景 =====================
   旧规则在 orbit-time-dock 中使用：
   calc(100% - var(--left-panel-width) - var(--right-panel-width) - gap)
   这会导致右侧面板变宽时，底部时间轴也跟着变窄。
   时间轴位于 orbit-overlay-layer 内，本质属于中间主场景浮层，
   所以宽度应该只按照中间场景自身的 100% 计算。
*/
.earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
  left:
    50% !important;
  right:
    auto !important;
  bottom:
    clamp(12px, 2vh, 22px) !important;
  width:
    min(920px, calc(100% - 36px)) !important;
  min-width:
    min(520px, calc(100% - 36px)) !important;
  max-width:
    calc(100% - 36px) !important;
  grid-template-columns:
    auto minmax(0, 1fr) !important;
  transform:
    translateX(-50%) !important;
}

.earth-orbit-template .orbit-overlay-layer .orbit-timeline-main {
  min-width:
    0;
  width:
    100%;
}

@media (max-width: 1280px) {
  .earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
    width:
      min(820px, calc(100% - 28px)) !important;
    min-width:
      min(500px, calc(100% - 28px)) !important;
    max-width:
      calc(100% - 28px) !important;
    grid-template-columns:
      auto minmax(0, 1fr) !important;
  }
}

@media (max-width: 960px) {
  .earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
    width:
      min(680px, calc(100% - 24px)) !important;
    min-width:
      0 !important;
    max-width:
      calc(100% - 24px) !important;
    grid-template-columns:
      auto minmax(0, 1fr) !important;
  }
}

@media (max-width: 720px) {
  .earth-orbit-template .orbit-overlay-layer .orbit-time-dock {
    width:
      calc(100% - 18px) !important;
    min-width:
      0 !important;
    max-width:
      calc(100% - 18px) !important;
  }
}

/* ===================== v12: 普通 1920 不按超大屏处理 =====================
   - 默认宽度阈值从 1880 提升到 2200
   - 最大拖拽宽度：普通 large 左 560 / 右 620；2200 以上左 820 / 右 900
   - 右侧实时数据字号增强只在 2200px 以上触发
*/
</style>
